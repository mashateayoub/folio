import { sql } from "drizzle-orm";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { db, closeDatabase } from "@/server/database/client";
import { createOrganization } from "@/server/workspaces/service";
import { type Actor } from "@/server/auth/service";

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

test(
  "Stripe Test Clock renews paid access, handles payment failure and recovers",
  { timeout: 240_000 },
  async () => {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_TEAM_PRICE_ID)
      throw new Error(
        "Configure Stripe Sandbox and run billing:listen before this test.",
      );
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    assert.equal(
      (await stripe.prices.retrieve(process.env.STRIPE_TEAM_PRICE_ID)).livemode,
      false,
      "Never run this test in live mode.",
    );

    const actor: Actor = {
      id: randomUUID(),
      name: "Billing clock acceptance",
      email: "billing-clock-" + randomUUID() + "@example.test",
      emailVerified: true,
      disabled: false,
      twoFactorEnabled: false,
    };

    let orgId: string | undefined;
    let clockId: string | undefined;

    try {
      await db().execute(
        sql`INSERT INTO "user"(id,name,email,"emailVerified",disabled,"createdAt","updatedAt") VALUES (${actor.id},${actor.name},${actor.email},true,false,now(),now())`,
      );
      const org = await createOrganization(actor, actor.name);
      orgId = org.id;

      const clock = await stripe.testHelpers.testClocks.create({
        frozen_time: Math.floor(Date.now() / 1000),
        name: "Folio lifecycle acceptance",
      });

      clockId = clock.id;

      const customer = await stripe.customers.create({
        name: actor.name,
        email: actor.email,
        test_clock: clock.id,
        metadata: { organization_id: org.id },
      });

      const visa = await stripe.paymentMethods.attach("pm_card_visa", {
        customer: customer.id,
      });

      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: visa.id },
      });
      await db().execute(
        sql`INSERT INTO workspace_billing(organization_id,customer_id,checkout_request) VALUES (${org.id},${customer.id},${randomUUID()})`,
      );

      const sub = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: process.env.STRIPE_TEAM_PRICE_ID, quantity: 1 }],
        metadata: { organization_id: org.id },
        default_payment_method: visa.id,
      });

      const plan = async () =>
        (
          await db().execute<{ plan: string; plan_valid_until: Date }>(
            sql`SELECT plan,plan_valid_until FROM organizations WHERE id=${org.id}`,
          )
        ).rows[0];

      await waitFor(
        async () => (await plan()).plan === "team",
        "initial signed subscription grant",
      );
      const firstEnd = sub.items.data[0].current_period_end;

      async function advance(time: number) {
        await stripe.testHelpers.testClocks.advance(clock.id, {
          frozen_time: time,
        });
        await waitFor(
          async () =>
            (await stripe.testHelpers.testClocks.retrieve(clock.id)).status ===
            "ready",
          "Test Clock ready",
        );
      }

      await advance(firstEnd + 1);
      await advance(firstEnd + 3601);
      await waitFor(
        async () =>
          (
            await stripe.invoices.list({ customer: customer.id, limit: 10 })
          ).data.filter((invoice) => invoice.status === "paid").length >= 2,
        "successful renewal invoice",
      );
      const renewed = await stripe.subscriptions.retrieve(sub.id);
      assert.ok(renewed.items.data[0].current_period_end > firstEnd);
      await waitFor(
        async () =>
          new Date((await plan()).plan_valid_until).getTime() ===
          renewed.items.data[0].current_period_end * 1000,
        "signed renewal to extend paid access",
      );

      const failedMethod = await stripe.paymentMethods.attach(
        "pm_card_chargeCustomerFail",
        { customer: customer.id },
      );

      await stripe.subscriptions.update(sub.id, {
        default_payment_method: failedMethod.id,
      });
      const nextEnd = renewed.items.data[0].current_period_end;
      await advance(nextEnd + 1);
      await advance(nextEnd + 3601);
      await waitFor(
        async () =>
          (await stripe.subscriptions.retrieve(sub.id)).status === "past_due",
        "failed renewal payment",
      );
      await waitFor(
        async () => (await plan()).plan === "free",
        "signed payment failure to restore Free limits",
      );

      const invoice = (
        await stripe.invoices.list({
          customer: customer.id,
          status: "open",
          limit: 10,
        })
      ).data[0];

      assert.ok(invoice);
      await stripe.subscriptions.update(sub.id, {
        default_payment_method: visa.id,
      });
      await stripe.invoices.pay(invoice.id, { payment_method: visa.id });
      await waitFor(
        async () => (await plan()).plan === "team",
        "signed successful recovery payment",
      );

      const events = await db().execute(
        sql`SELECT event_type FROM billing_events WHERE organization_id=${org.id}`,
      );

      assert.ok(
        events.rows.some((row) => row.event_type === "invoice.payment_failed"),
      );
      assert.ok(
        events.rows.filter((row) => row.event_type === "invoice.paid").length >=
          3,
      );
      console.log(
        "Real Test Clock renewal, failed payment downgrade, recovery payment and signed events passed.",
      );
    } finally {
      if (clockId) {
        try {
          await stripe.testHelpers.testClocks.del(clockId);
        } catch {
          /* Only isolated test-clock resources are retained if cleanup fails. */
        }
      }

      if (orgId)
        await db().execute(sql`DELETE FROM organizations WHERE id=${orgId}`);
      await db().execute(sql`DELETE FROM "user" WHERE id=${actor.id}`);
      await closeDatabase();
    }
  },
);
