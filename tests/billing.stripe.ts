import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  chromium,
  request,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import Stripe from "stripe";
import { Pool } from "pg";
import { emailLink } from "./mail-helper";

const baseURL = process.env.BILLING_TEST_URL || "http://localhost:3030";

async function waitFor(
  check: () => Promise<boolean>,
  label: string,
  timeout = 60_000,
) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timed out waiting for " + label);
}

async function input(page: Page, selector: string, value: string) {
  for (const frame of page.frames()) {
    const field = frame.locator(selector).first();

    if (await field.isVisible().catch(() => false)) {
      await field.fill(value);

      return;
    }
  }

  throw new Error("Checkout field not found: " + selector);
}

test(
  "Stripe Sandbox hosted checkout, signed delivery, customer portal and cancellation",
  { timeout: 240_000 },
  async () => {
    if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
      throw new Error("Hosted acceptance requires a local test app.");

    if (
      !process.env.STRIPE_SECRET_KEY ||
      !process.env.STRIPE_TEAM_PRICE_ID ||
      !process.env.STRIPE_WEBHOOK_SECRET
    )
      throw new Error(
        "Configure Stripe Sandbox and run npm run billing:listen first.",
      );
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const price = await stripe.prices.retrieve(
      process.env.STRIPE_TEAM_PRICE_ID,
    );

    assert.equal(
      price.livemode,
      false,
      "This test must never use live billing.",
    );
    const db = new Pool({ connectionString: process.env.DATABASE_URL });

    const browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
      headless: true,
    });

    let client: APIRequestContext | undefined;
    let userId: string | undefined;
    let orgId: string | undefined;
    let customerId: string | undefined;
    let subscriptionId: string | undefined;
    let page: Page | undefined;

    try {
      client = await request.newContext({
        baseURL,
        extraHTTPHeaders: { Origin: baseURL },
      });
      const email = "stripe-acceptance-" + randomUUID() + "@example.test";
      const password = "Stripe-acceptance-password-2026!";

      const response = await client.post("/api/auth/sign-up/email", {
        data: {
          name: "Billing acceptance",
          email,
          password,
          callbackURL: "/sign-in",
        },
      });

      assert.equal(response.status(), 200);
      userId = (await response.json()).user.id;
      await client.get(await emailLink(email, "Verify"));
      assert.equal(
        (
          await client.post("/api/auth/sign-in/email", {
            data: { email, password },
          })
        ).status(),
        200,
      );
      orgId = (await (await client.get("/api/organizations")).json())[0].id;
      const endpoint = "/api/organizations/" + orgId + "/billing";

      const checkoutResponse = await client.post(endpoint + "/checkout", {
        data: { plan: "team" },
      });

      assert.equal(
        checkoutResponse.status(),
        200,
        "Checkout must open through the authenticated app.",
      );
      const checkoutUrl = (await checkoutResponse.json()).url;

      const row = (
        await db.query(
          "SELECT customer_id,checkout_session_id FROM workspace_billing WHERE organization_id=$1",
          [orgId],
        )
      ).rows[0];

      customerId = row.customer_id;

      const context = await browser.newContext({
        storageState: await client.storageState(),
      });

      page = await context.newPage();
      await page.goto(checkoutUrl);
      await page
        .locator('input[name="cardNumber"]')
        .waitFor({ timeout: 30_000 })
        .catch(() => {});
      await input(
        page,
        'input[name="cardNumber"], input[autocomplete="cc-number"]',
        "4242424242424242",
      );
      await input(
        page,
        'input[name="cardExpiry"], input[autocomplete="cc-exp"]',
        "1230",
      );
      await input(
        page,
        'input[name="cardCvc"], input[autocomplete="cc-csc"]',
        "123",
      );
      await input(
        page,
        'input[name="billingName"], input[autocomplete="cc-name"]',
        "Billing acceptance",
      );

      const postal = page
        .locator(
          'input[name="billingPostalCode"], input[autocomplete="postal-code"]',
        )
        .first();

      if (await postal.isVisible()) await postal.fill("10001");
      await page.screenshot({
        path: "test-results/stripe-checkout.png",
        fullPage: true,
      });
      await page
        .getByRole("button", { name: /Subscribe|Pay|Start subscription/i })
        .click();
      await page.waitForURL(
        (url) =>
          url.origin === new URL(baseURL).origin &&
          url.pathname.endsWith("/billing"),
        { timeout: 60_000 },
      );
      await waitFor(
        async () =>
          (await (await client!.get(endpoint)).json()).organization.plan ===
          "team",
        "signed webhook to grant Team",
      );

      const subscription = (
        await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 10,
        })
      ).data;

      assert.equal(
        subscription.length,
        1,
        "One checkout must create exactly one subscription.",
      );
      subscriptionId = subscription[0].id;
      assert.equal(subscription[0].status, "active");

      const receipts = await db.query(
        "SELECT event_id,event_type FROM billing_events WHERE organization_id=$1",
        [orgId],
      );

      assert.ok(
        receipts.rows.some(
          (value) => value.event_type === "checkout.session.completed",
        ),
        "A real signed checkout event must reach the app.",
      );

      const received = receipts.rows.find(
        (value) => value.event_type === "checkout.session.completed",
      )!;

      const event = await stripe.events.retrieve(received.event_id);
      const raw = JSON.stringify(event);

      const signature = stripe.webhooks.generateTestHeaderString({
        payload: raw,
        secret: process.env.STRIPE_WEBHOOK_SECRET!,
      });

      const webhookHeaders = {
        "Content-Type": "application/json",
        "Stripe-Signature": signature,
      };

      assert.equal(
        (
          await client.post("/api/billing/webhook", {
            data: raw,
            headers: webhookHeaders,
          })
        ).status(),
        200,
      );
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int AS count FROM billing_events WHERE event_id=$1",
            [event.id],
          )
        ).rows[0].count,
        1,
      );
      assert.equal(
        (
          await client.post("/api/billing/webhook", {
            data: raw + " ",
            headers: webhookHeaders,
          })
        ).status(),
        400,
        "Changed bytes invalidate the signature.",
      );
      assert.equal(
        (
          await client.post("/api/billing/webhook", {
            data: raw,
            headers: { "Content-Type": "application/json" },
          })
        ).status(),
        400,
      );
      assert.equal(
        (
          await client.post(endpoint + "/checkout", { data: { plan: "team" } })
        ).status(),
        409,
      );
      await page.reload();
      await page.getByRole("button", { name: "Manage billing" }).click();
      await page.waitForURL((url) => url.hostname === "billing.stripe.com", {
        timeout: 30_000,
      });
      await page
        .getByText(/Cancel subscription/i)
        .first()
        .click();
      await page.screenshot({
        path: "test-results/stripe-portal-confirmation.png",
        fullPage: true,
      });

      const confirmation = page
        .getByRole("button", { name: /Cancel subscription|Cancel plan/i })
        .last();

      await confirmation.waitFor({ state: "visible", timeout: 15_000 });
      await confirmation.click();
      await waitFor(
        async () =>
          Boolean(
            (await stripe.subscriptions.retrieve(subscriptionId!)).cancel_at,
          ),
        "portal period-end cancellation",
      );
      await waitFor(
        async () =>
          (await (await client!.get(endpoint)).json()).subscription.cancelAt,
        "signed cancellation update",
      );
      assert.equal(
        (await (await client.get(endpoint)).json()).organization.plan,
        "team",
        "Scheduled cancellation retains paid access.",
      );
      await page.screenshot({
        path: "test-results/stripe-portal.png",
        fullPage: true,
      });
      await stripe.subscriptions.cancel(subscriptionId);
      await waitFor(
        async () =>
          (await (await client!.get(endpoint)).json()).organization.plan ===
          "free",
        "signed cancellation to restore Free",
      );
      console.log(
        "Real hosted checkout, one active subscription, signed webhook delivery, customer portal and cancellation passed.",
      );
    } catch (error) {
      await page
        ?.screenshot({
          path: "test-results/stripe-failure.png",
          fullPage: true,
        })
        .catch(() => {});
      throw error;
    } finally {
      if (subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);

          if (sub.status !== "canceled")
            await stripe.subscriptions.cancel(subscriptionId);
        } catch {
          /* Continue isolated cleanup. */
        }
      }

      if (customerId) {
        try {
          await stripe.customers.del(customerId);
        } catch {
          /* Sandbox records can be cleaned manually if provider is unavailable. */
        }
      }

      if (orgId)
        await db.query("DELETE FROM organizations WHERE id=$1", [orgId]);

      if (userId) await db.query('DELETE FROM "user" WHERE id=$1', [userId]);
      await client?.dispose();
      await browser.close();
      await db.end();
    }
  },
);
