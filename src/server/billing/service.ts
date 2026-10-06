import { sql, eq } from "drizzle-orm";
import { workspaceBilling } from "@/server/database/schema/index";
import Stripe from "stripe";
import { z } from "zod";
import {
  type BillingProvider,
  type BillingSubscription,
} from "@/server/billing/provider";
import { randomUUID } from "node:crypto";
import { type DatabaseTransaction } from "@/server/database/client";
import { transaction } from "@/server/database/client";
import { orgContext } from "@/server/access/context";
import { audit } from "@/server/audit/service";
import { type Actor } from "@/server/auth/service";
import { HttpError } from "@/server/http";
import { config } from "@/server/config";
import { billingPlans } from "@/features/billing/plans";

type BillingRow = typeof workspaceBilling.$inferSelect;

const expandableId = z
  .union([
    z.string(),
    z.object({ id: z.string() }).transform((value) => value.id),
  ])
  .nullish();

export function billingConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_TEAM_PRICE_ID,
  );
}

export function stripeProvider() {
  if (!billingConfigured())
    throw new HttpError(
      503,
      "Paid plans are currently unavailable. Please try again later.",
    );

  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    timeout: 10_000,
    maxNetworkRetries: 1,
  });
}

function owner(role: string) {
  if (role !== "owner")
    throw new HttpError(403, "Only the workspace owner can manage billing.");
}

function billingUrl(id: string) {
  return config().APP_URL + "/organizations/" + id + "/billing";
}

export function subscriptionEntitlement(
  sub: BillingSubscription | undefined,
  orgId: string,
  priceId: string,
  now = Date.now(),
) {
  const item = sub?.items.data[0];

  const end = item
    ? Math.min(item.current_period_end, sub?.cancel_at ?? Infinity) * 1000
    : 0;

  const valid = Boolean(
    sub &&
    ["active", "trialing"].includes(sub.status) &&
    sub.metadata.organization_id === orgId &&
    sub.items.data.length === 1 &&
    item?.price.id === priceId &&
    item.quantity === 1 &&
    end > now,
  );

  return {
    plan: valid ? ("team" as const) : ("free" as const),
    validUntil: valid ? new Date(end) : null,
  };
}

async function teamPrice(provider: BillingProvider) {
  const price = await provider.prices.retrieve(
    process.env.STRIPE_TEAM_PRICE_ID!,
  );

  if (
    !price.active ||
    price.type !== "recurring" ||
    price.recurring?.interval !== "month" ||
    price.recurring.interval_count !== 1 ||
    price.recurring.usage_type !== "licensed" ||
    price.billing_scheme !== "per_unit" ||
    price.unit_amount === null ||
    price.unit_amount <= 0
  ) {
    throw new HttpError(
      503,
      "The Team plan is currently unavailable. Please try again later.",
    );
  }

  return price;
}

async function billingRow(client: DatabaseTransaction, id: string) {
  return (
    await client
      .select()
      .from(workspaceBilling)
      .where(eq(workspaceBilling.organization_id, id))
  )[0];
}

async function subscriptions(provider: BillingProvider, customer: string) {
  return provider.subscriptions
    .list({ customer, status: "all", limit: 100 })
    .autoPagingToArray({ limit: 1000 });
}

const terminal = (status: string) =>
  ["canceled", "incomplete_expired"].includes(status);

async function reconcile(
  client: DatabaseTransaction,
  id: string,
  customer: string,
  provider: BillingProvider,
) {
  // Fetch under the same tenant lock used by checkout and quota writes. Delayed
  // webhook snapshots cannot overwrite a newer provider state.
  const all = await subscriptions(provider, customer);
  const ongoing = all.filter((sub) => !terminal(sub.status));

  const selected =
    ongoing.length === 1
      ? ongoing[0]
      : ongoing.length === 0
        ? all.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0]
        : undefined;

  const entitlement = subscriptionEntitlement(
    selected,
    id,
    process.env.STRIPE_TEAM_PRICE_ID!,
  );

  const status = ongoing.length > 1 ? "conflict" : selected?.status || "none";
  await client.execute(
    sql`UPDATE workspace_billing SET subscription_id=${selected?.id || null},price_id=${selected?.items.data[0]?.price.id || null},status=${status},period_end=${
      selected?.items.data[0]
        ? new Date(selected.items.data[0].current_period_end * 1000)
        : null
    },cancel_at_period_end=${selected?.cancel_at_period_end || false},cancel_at=${selected?.cancel_at ? new Date(selected.cancel_at * 1000) : null},updated_at=now() WHERE organization_id=${id}`,
  );
  await client.execute(
    sql`UPDATE organizations SET plan=${entitlement.plan},plan_valid_until=${entitlement.validUntil} WHERE id=${id}`,
  );

  return { all, entitlement };
}

export async function billingSummary(
  actor: Actor,
  id: string,
  provider?: BillingProvider,
) {
  const snapshot = await transaction(async (client) => {
    const { org, member } = await orgContext(client, actor, id);
    const row = await billingRow(client, id);

    const usage = await client.execute<{
      projects: number;
      seats: number;
      compiles: number;
    }>(
      sql`SELECT (SELECT count(*)::int FROM projects WHERE organization_id=${id}) AS projects,(SELECT count(*)::int FROM organization_members WHERE organization_id=${id} AND state='active' AND (valid_until IS NULL OR valid_until>now())) AS seats,COALESCE((SELECT count FROM usage_counters WHERE key=${"org-builds:" + id + ":" + new Date().toISOString().slice(0, 7)}),0) AS compiles`,
    );

    return {
      organization: { id, name: org.name, plan: org.plan },
      canManage: member.role === "owner",
      hasCustomer: Boolean(row?.customer_id),
      subscription: {
        status: row?.status || "none",
        periodEnd: row?.period_end?.toISOString() || null,
        cancelAtPeriodEnd: row?.cancel_at_period_end || false,
        cancelAt: row?.cancel_at?.toISOString() || null,
      },
      usage: usage.rows[0],
      limits: billingPlans[org.plan],
    };
  });

  let price: { amount: number; currency: string; interval: string } | null =
    null;

  if (billingConfigured() || provider) {
    try {
      const value = await teamPrice(provider || stripeProvider());
      price = {
        amount: value.unit_amount!,
        currency: value.currency,
        interval: "month",
      };
    } catch {
      /* Keep plan and usage accessible during provider outages. */
    }
  }

  return {
    ...snapshot,
    plans: billingPlans,
    price,
    checkoutAvailable: Boolean(price),
    portalAvailable:
      (billingConfigured() || Boolean(provider)) && snapshot.hasCustomer,
  };
}

export async function checkout(
  actor: Actor,
  id: string,
  provider?: BillingProvider,
): Promise<{ url: string }> {
  // Commit the stable idempotency seed before making any remote requests.
  await transaction(async (client) => {
    const { member } = await orgContext(client, actor, id, true);
    owner(member.role);
    await client.execute(
      sql`INSERT INTO workspace_billing(organization_id,checkout_request) VALUES (${id},${randomUUID()}) ON CONFLICT DO NOTHING`,
    );
  });
  const stripe = provider || stripeProvider();
  await transaction(async (client) => {
    const { org, member } = await orgContext(client, actor, id, true);
    owner(member.role);
    const row = await billingRow(client, id);

    if (!row.customer_id) {
      const customer = await stripe.customers.create(
        {
          name: org.name,
          email: actor.email,
          metadata: { organization_id: id },
        },
        { idempotencyKey: "folio:customer:" + id },
      );

      await client.execute(
        sql`UPDATE workspace_billing SET customer_id=${customer.id} WHERE organization_id=${id}`,
      );
    }
  });
  let expired = false;

  const result = await transaction(async (client) => {
    const { member } = await orgContext(client, actor, id, true);
    owner(member.role);
    const row = await billingRow(client, id);

    if (!row.customer_id)
      throw new HttpError(
        503,
        "Billing setup could not be completed. Please try again.",
      );
    const { all } = await reconcile(client, id, row.customer_id, stripe);

    // Even an unpaid/incomplete existing subscription must be repaired through
    // the portal rather than charging for a second subscription.
    if (all.some((sub) => !terminal(sub.status))) return { existing: true };

    if (row.checkout_session_id) {
      const session = await stripe.checkout.sessions.retrieve(
        row.checkout_session_id,
      );

      if (session.status === "open" && session.url) return { url: session.url };

      if (session.status === "complete") {
        const subId = expandableId.parse(session.subscription);

        if (
          !subId ||
          !terminal((await stripe.subscriptions.retrieve(subId)).status)
        )
          return { existing: true };
      }

      await client.execute(
        sql`UPDATE workspace_billing SET checkout_request=${randomUUID()},checkout_session_id=NULL WHERE organization_id=${id}`,
      );
      expired = true;

      return {};
    }

    const price = await teamPrice(stripe);

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: row.customer_id,
        client_reference_id: id,
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { organization_id: id },
        subscription_data: { metadata: { organization_id: id } },
        success_url: billingUrl(id) + "?checkout=success",
        cancel_url: billingUrl(id) + "?checkout=canceled",
      },
      { idempotencyKey: "folio:checkout:" + row.checkout_request },
    );

    if (!session.url)
      throw new HttpError(
        502,
        "Checkout could not be opened. Please try again.",
      );
    await client.execute(
      sql`UPDATE workspace_billing SET checkout_session_id=${session.id} WHERE organization_id=${id}`,
    );
    await audit(client, actor.id, id, "billing.checkout.started", id);

    return { url: session.url };
  });

  if (expired) return checkout(actor, id, stripe);

  if ("url" in result && result.url) return { url: result.url };
  throw new HttpError(
    409,
    "This workspace already has a subscription or a completed checkout. Manage it in the billing portal.",
  );
}

export async function portal(
  actor: Actor,
  id: string,
  provider?: BillingProvider,
) {
  return transaction(async (client) => {
    const { member } = await orgContext(client, actor, id, true);
    owner(member.role);
    const row = await billingRow(client, id);

    if (!row?.customer_id)
      throw new HttpError(
        409,
        "Choose a paid plan before opening the billing portal.",
      );

    const params: Stripe.BillingPortal.SessionCreateParams = {
      customer: row.customer_id,
      return_url: billingUrl(id),
    };

    if (process.env.STRIPE_PORTAL_CONFIGURATION_ID)
      params.configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;

    const session = await (
      provider || stripeProvider()
    ).billingPortal.sessions.create(params);

    await audit(client, actor.id, id, "billing.portal.opened", id);

    return { url: session.url };
  });
}

export const billingEventTypes = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
]);

export function verifyBillingEvent(raw: Buffer, signature: string | null) {
  const provider = stripeProvider();

  if (!signature) throw new HttpError(400, "Missing webhook signature.");

  try {
    return provider.webhooks.constructEvent(
      raw,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
      300,
    );
  } catch {
    throw new HttpError(400, "Invalid webhook signature.");
  }
}

export async function processBillingEvent(
  event: { id: string; type: string; data: { object: object } },
  provider?: BillingProvider,
) {
  if (!billingEventTypes.has(event.type)) return;

  const data = z
    .object({ customer: expandableId })
    .safeParse(event.data.object);

  const customer = data.success ? data.data.customer : undefined;

  if (!customer) return;
  await transaction(async (client) => {
    const found = await client.execute<BillingRow>(
      sql`SELECT * FROM workspace_billing WHERE customer_id=${customer}`,
    );

    const row = found.rows[0];

    if (!row) return;
    await client.execute(
      sql`SELECT id FROM organizations WHERE id=${row.organization_id} FOR UPDATE`,
    );

    const receipt = await client.execute(
      sql`INSERT INTO billing_events(event_id,organization_id,event_type) VALUES (${event.id},${row.organization_id},${event.type}) ON CONFLICT DO NOTHING RETURNING event_id`,
    );

    if (!receipt.rowCount) return;
    await reconcile(
      client,
      row.organization_id,
      customer,
      provider || stripeProvider(),
    );
    await audit(
      client,
      null,
      row.organization_id,
      "billing.subscription.synced",
      row.organization_id,
      { eventId: event.id, eventType: event.type },
    );
  });
}

export async function reconcileWorkspaceBilling(
  id: string,
  provider?: BillingProvider,
) {
  return transaction(async (client) => {
    await client.execute(
      sql`SELECT id FROM organizations WHERE id=${id} FOR UPDATE`,
    );
    const row = await billingRow(client, id);

    if (row?.customer_id)
      await reconcile(
        client,
        id,
        row.customer_id,
        provider || stripeProvider(),
      );
  });
}

export async function syncBilling(
  actor: Actor,
  id: string,
  provider?: BillingProvider,
) {
  return transaction(async (client) => {
    const { member } = await orgContext(client, actor, id, true);
    owner(member.role);
    const row = await billingRow(client, id);

    if (row?.customer_id)
      await reconcile(
        client,
        id,
        row.customer_id,
        provider || stripeProvider(),
      );
  });
}
