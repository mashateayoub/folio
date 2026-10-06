import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { type BillingSubscription } from "@/server/billing/provider";
import {
  subscriptionEntitlement,
  verifyBillingEvent,
} from "@/server/billing/service";
import { effectivePlan } from "@/features/billing/plans";
import { rawBody, HttpError } from "@/server/http";

test("paid entitlement requires a current, matching, single-item subscription", () => {
  const now = Date.now();

  const sub: BillingSubscription = {
    id: "sub_local",
    created: Math.floor(now / 1000),
    status: "active",
    metadata: { organization_id: "org" },
    items: {
      data: [
        {
          price: { id: "price_team" },
          quantity: 1,
          current_period_end: Math.floor(now / 1000) + 3600,
        },
      ],
    },
  };

  assert.equal(
    subscriptionEntitlement(sub, "org", "price_team", now).plan,
    "team",
  );

  const statuses: BillingSubscription["status"][] = [
    "past_due",
    "unpaid",
    "canceled",
    "paused",
    "incomplete",
    "incomplete_expired",
  ];

  for (const status of statuses)
    assert.equal(
      subscriptionEntitlement({ ...sub, status }, "org", "price_team", now)
        .plan,
      "free",
    );
  assert.equal(
    subscriptionEntitlement(sub, "other", "price_team", now).plan,
    "free",
  );
  assert.equal(
    subscriptionEntitlement(sub, "org", "price_other", now).plan,
    "free",
  );
  assert.equal(
    subscriptionEntitlement(sub, "org", "price_team", now + 7_200_000).plan,
    "free",
  );
  const scheduled = { ...sub, cancel_at: Math.floor(now / 1000) + 1800 };
  assert.equal(
    subscriptionEntitlement(
      scheduled,
      "org",
      "price_team",
      now,
    ).validUntil?.getTime(),
    scheduled.cancel_at * 1000,
  );
  assert.equal(
    subscriptionEntitlement(scheduled, "org", "price_team", now + 1_900_000)
      .plan,
    "free",
  );
  const extra = structuredClone(sub);
  extra.items.data.push(extra.items.data[0]);
  assert.equal(
    subscriptionEntitlement(extra, "org", "price_team", now).plan,
    "free",
  );
  assert.equal(effectivePlan("team", new Date(now - 1), now), "free");
  assert.equal(effectivePlan("team", null, now), "free");
});

test("webhook signatures bind exact bytes and expire; bounded raw body preserves bytes", async () => {
  const names = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_TEAM_PRICE_ID",
  ] as const;

  const previous = names.map((name) => process.env[name]);
  process.env.STRIPE_SECRET_KEY = "sk_test_local";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_local";
  process.env.STRIPE_TEAM_PRICE_ID = "price_local";

  try {
    const provider = new Stripe("sk_test_local");

    const payload = JSON.stringify({
      id: "evt_local",
      object: "event",
      type: "invoice.paid",
      livemode: false,
      data: { object: { customer: "cus_local" } },
    });

    const signature = provider.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_local",
    });

    assert.equal(
      verifyBillingEvent(Buffer.from(payload), signature).id,
      "evt_local",
    );
    assert.throws(
      () => verifyBillingEvent(Buffer.from(payload + " "), signature),
      /Invalid webhook signature/,
    );
    assert.throws(
      () => verifyBillingEvent(Buffer.from(payload), null),
      /Missing webhook signature/,
    );

    const stale = provider.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_local",
      timestamp: Math.floor(Date.now() / 1000) - 600,
    });

    assert.throws(
      () => verifyBillingEvent(Buffer.from(payload), stale),
      /Invalid webhook signature/,
    );
    assert.deepEqual(
      await rawBody(
        new Request("http://localhost", { method: "POST", body: payload }),
      ),
      Buffer.from(payload),
    );
    await assert.rejects(
      rawBody(
        new Request("http://localhost", { method: "POST", body: "12345" }),
        4,
      ),
      (error) => error instanceof HttpError && error.status === 413,
    );
  } finally {
    names.forEach((name, i) => {
      if (previous[i] === undefined) delete process.env[name];
      else process.env[name] = previous[i];
    });
  }
});
