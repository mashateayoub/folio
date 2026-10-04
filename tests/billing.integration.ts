import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import type {
  BillingProvider,
  BillingSubscription,
  BillingCheckout,
} from "../src/lib/server/billing-provider";
import { db } from "../src/lib/server/db";
import type { Actor } from "../src/lib/server/auth";
import {
  checkout,
  portal,
  processBillingEvent,
  billingSummary,
  syncBilling,
} from "../src/lib/server/billing";
import {
  createOrganization,
  createCloudProject,
  getProject,
  saveProject,
  changeOrgMember,
  beginBuild,
  finishBuild,
  invitation,
} from "../src/lib/server/saas";
import { HttpError } from "../src/lib/server/http";
import { createHash } from "node:crypto";

test(
  "billing lifecycle: owner-only checkout/portal, retries, events and enforced downgrade limits",
  { timeout: 60_000 },
  async () => {
    const actors: Actor[] = [];
    const orgs: string[] = [];
    const previousPrice = process.env.STRIPE_TEAM_PRICE_ID;
    process.env.STRIPE_TEAM_PRICE_ID = "price_local_team";
    let all: BillingSubscription[] = [];
    let customers = 0;
    let sessions = 0;
    let portalCalls = 0;
    let reads = 0;
    let failRead = false;
    let failCheckoutOnce = false;

    const requests = new Map<string, BillingCheckout>();

    const provider: BillingProvider = {
      prices: {
        retrieve: async () => ({
          id: "price_local_team",
          active: true,
          type: "recurring",
          recurring: {
            interval: "month",
            interval_count: 1,
            usage_type: "licensed",
          },
          billing_scheme: "per_unit",
          unit_amount: 2900,
          currency: "usd",
        }),
      },
      customers: { create: async () => ({ id: "cus_local_" + ++customers }) },
      subscriptions: {
        list: () => ({
          autoPagingToArray: async () => {
            reads++;

            if (failRead) throw new Error("Provider outage");

            return structuredClone(all);
          },
        }),
        retrieve: async (id: string) => all.find((value) => value.id === id)!,
      },
      checkout: {
        sessions: {
          create: async (
            input: Stripe.Checkout.SessionCreateParams,
            options: Stripe.RequestOptions,
          ) => {
            assert.equal(input.mode, "subscription");
            assert.equal(input.line_items?.[0].price, "price_local_team");
            assert.equal(input.line_items?.[0].quantity, 1);
            assert.ok(input.success_url?.startsWith(process.env.APP_URL!));
            const key = options.idempotencyKey!;

            if (!requests.has(key))
              requests.set(key, {
                id: "cs_local_" + ++sessions,
                url: "https://checkout.stripe.com/local-" + sessions,
                status: "open",
              });

            if (failCheckoutOnce) {
              failCheckoutOnce = false;
              throw new Error("Response lost");
            }

            return requests.get(key)!;
          },
          retrieve: async (id: string) =>
            [...requests.values()].find((value) => value.id === id)!,
        },
      },
      billingPortal: {
        sessions: {
          create: async (input: Stripe.BillingPortal.SessionCreateParams) => {
            portalCalls++;
            assert.equal(input.customer, "cus_local_1");

            return { url: "https://billing.stripe.com/local" };
          },
        },
      },
    };

    const rejects = (work: Promise<unknown>, status: number) =>
      assert.rejects(
        work,
        (error) => error instanceof HttpError && error.status === status,
      );

    try {
      for (let i = 0; i < 8; i++) {
        const actor: Actor = {
          id: randomUUID(),
          name: "Billing test " + i,
          email: randomUUID() + "@example.test",
          emailVerified: true,
          disabled: false,
          twoFactorEnabled: false,
        };

        await db().query(
          'INSERT INTO "user"(id,name,email,"emailVerified",disabled,"createdAt","updatedAt") VALUES ($1,$2,$3,true,false,now(),now())',
          [actor.id, actor.name, actor.email],
        );
        actors.push(actor);
      }

      const [owner, admin, outsider] = actors;
      const org = await createOrganization(owner, "Billing acceptance");
      orgs.push(org.id);
      await db().query(
        "INSERT INTO organization_members(organization_id,user_id,role) VALUES ($1,$2,'admin')",
        [org.id, admin.id],
      );
      await rejects(checkout(outsider, org.id, provider), 404);
      await rejects(checkout(admin, org.id, provider), 403);
      await rejects(portal(admin, org.id, provider), 403);
      await rejects(syncBilling(admin, org.id, provider), 403);
      assert.equal(customers, 0);
      assert.equal(portalCalls, 0);
      failCheckoutOnce = true;
      await assert.rejects(checkout(owner, org.id, provider), /Response lost/);
      assert.equal(
        (
          await db().query(
            "SELECT customer_id FROM workspace_billing WHERE organization_id=$1",
            [org.id],
          )
        ).rows[0].customer_id,
        "cus_local_1",
      );

      const [first, repeat] = await Promise.all([
        checkout(owner, org.id, provider),
        checkout(owner, org.id, provider),
      ]);

      assert.equal(first.url, repeat.url);
      assert.equal(sessions, 1);
      assert.equal(customers, 1);
      assert.equal(
        (await billingSummary(owner, org.id, provider)).organization.plan,
        "free",
        "redirect/checkout creation must not grant paid access",
      );
      await portal(owner, org.id, provider);
      assert.equal(portalCalls, 1);
      const unknownReads = reads;
      await processBillingEvent(
        {
          id: "evt_foreign",
          type: "invoice.paid",
          data: { object: { customer: "cus_other_workspace" } },
        },
        provider,
      );
      assert.equal(
        reads,
        unknownReads,
        "unbound customers cannot affect a workspace",
      );

      const subscription: BillingSubscription = {
        id: "sub_local",
        created: Math.floor(Date.now() / 1000),
        status: "active",
        customer: "cus_local_1",
        metadata: { organization_id: org.id },
        cancel_at_period_end: false,
        items: {
          data: [
            {
              price: { id: "price_local_team" },
              quantity: 1,
              current_period_end: Math.floor(Date.now() / 1000) + 86400,
            },
          ],
        },
      };

      all = [subscription];

      const event = (id: string, type = "customer.subscription.updated") => ({
        id,
        type,
        data: { object: { customer: "cus_local_1", status: "canceled" } },
      });

      await processBillingEvent(event("evt_active"), provider);
      assert.equal(
        (await billingSummary(owner, org.id, provider)).organization.plan,
        "team",
      );
      const before = reads;
      await Promise.all([
        processBillingEvent(event("evt_active"), provider),
        processBillingEvent(event("evt_active"), provider),
      ]);
      assert.equal(reads, before, "duplicate receipts must not reprocess");
      await rejects(checkout(owner, org.id, provider), 409);
      assert.equal(sessions, 1);
      const project = await createCloudProject(owner, org.id, "blank");

      // Reach Free capacity, then prove that verified Team access permits more.
      for (let i = 1; i < 41; i++)
        await createCloudProject(owner, org.id, "blank");

      for (let i = 41; i < 100; i++)
        await createCloudProject(owner, org.id, "blank");
      await rejects(createCloudProject(owner, org.id, "blank"), 429);

      for (const actor of actors.slice(3, 7))
        await db().query(
          "INSERT INTO organization_members(organization_id,user_id,role) VALUES ($1,$2,'member')",
          [org.id, actor.id],
        );
      await db().query(
        "INSERT INTO organization_members(organization_id,user_id,role,state) VALUES ($1,$2,'member','revoked')",
        [org.id, actors[7].id],
      );
      await changeOrgMember(owner, org.id, actors[7].id, {
        role: "member",
        state: "active",
      });
      await changeOrgMember(owner, org.id, actors[7].id, {
        role: "member",
        state: "revoked",
      });

      for (let i = 8; i < 102; i++) {
        const actor: Actor = {
          id: randomUUID(),
          name: "Billing capacity " + i,
          email: randomUUID() + "@example.test",
          emailVerified: true,
          disabled: false,
          twoFactorEnabled: false,
        };

        await db().query(
          'INSERT INTO "user"(id,name,email,"emailVerified",disabled,"createdAt","updatedAt") VALUES ($1,$2,$3,true,false,now(),now())',
          [actor.id, actor.name, actor.email],
        );
        actors.push(actor);
        await db().query(
          "INSERT INTO organization_members(organization_id,user_id,role) VALUES ($1,$2,'member')",
          [org.id, actor.id],
        );
      }

      await rejects(
        changeOrgMember(owner, org.id, actors[7].id, {
          role: "member",
          state: "active",
        }),
        429,
      );

      const key =
        "org-builds:" + org.id + ":" + new Date().toISOString().slice(0, 7);

      await db().query(
        "INSERT INTO usage_counters(key,count,expires_at) VALUES ($1,1000,now()+interval '35 days')",
        [key],
      );
      const build = await beginBuild(owner, project.id, project.revision);
      await finishBuild(build.id, null, "Acceptance check");
      await db().query("UPDATE usage_counters SET count=20000 WHERE key=$1", [
        key,
      ]);
      await rejects(beginBuild(owner, project.id, project.revision), 429);
      await db().query("UPDATE usage_counters SET count=1001 WHERE key=$1", [
        key,
      ]);
      all[0].cancel_at_period_end = true;
      await processBillingEvent(event("evt_scheduled_cancel"), provider);
      const scheduled = await billingSummary(owner, org.id, provider);
      assert.equal(scheduled.organization.plan, "team");
      assert.equal(scheduled.subscription.cancelAtPeriodEnd, true);
      all[0].status = "canceled";
      await processBillingEvent(
        event("evt_canceled", "customer.subscription.deleted"),
        provider,
      );
      await processBillingEvent(event("evt_delayed_old_active"), provider);
      assert.equal(
        (await billingSummary(owner, org.id, provider)).organization.plan,
        "free",
        "delayed event cannot restore a canceled subscription",
      );
      await rejects(createCloudProject(owner, org.id, "blank"), 429);
      await rejects(
        changeOrgMember(owner, org.id, actors[7].id, {
          role: "member",
          state: "active",
        }),
        429,
      );
      await rejects(beginBuild(owner, project.id, project.revision), 429);

      const saved = await saveProject(
        owner,
        project.id,
        {
          id: project.id,
          title: "Still editable",
          rootFile: project.rootFile,
          files: project.files,
        },
        project.revision,
      );

      assert.equal(saved.title, "Still editable");
      assert.equal(
        (await getProject(owner, project.id)).title,
        "Still editable",
      );
      const token = randomUUID();
      await db().query(
        "INSERT INTO invitations(id,organization_id,email,role,token_hash,expires_at,created_by) VALUES ($1,$2,$3,'member',$4,now()+interval '1 day',$5)",
        [
          randomUUID(),
          org.id,
          actors[7].email,
          createHash("sha256").update(token).digest("hex"),
          owner.id,
        ],
      );
      await rejects(invitation(actors[7], token, true), 429);
      const completed = [...requests.values()][0];
      completed.status = "complete";
      completed.subscription = "sub_local";
      const purchasedAgain = await checkout(owner, org.id, provider);
      assert.ok(purchasedAgain.url);
      assert.equal(sessions, 2);
      assert.equal(customers, 1);
      all[0].status = "active";
      failRead = true;
      await assert.rejects(
        processBillingEvent(event("evt_retry"), provider),
        /Provider outage/,
      );
      assert.equal(
        (
          await db().query(
            "SELECT * FROM billing_events WHERE event_id='evt_retry'",
          )
        ).rowCount,
        0,
      );
      failRead = false;
      await processBillingEvent(event("evt_retry"), provider);
      assert.equal(
        (await billingSummary(owner, org.id, provider)).organization.plan,
        "team",
      );
      all[0].status = "past_due";
      await syncBilling(owner, org.id, provider);
      assert.equal(
        (await billingSummary(owner, org.id, provider)).organization.plan,
        "free",
      );
      all[0].status = "active";
      await syncBilling(owner, org.id, provider);
      await db().query(
        "UPDATE organizations SET plan_valid_until=now()-interval '1 second' WHERE id=$1",
        [org.id],
      );
      await rejects(createCloudProject(owner, org.id, "blank"), 429);
      assert.equal(
        (await billingSummary(owner, org.id, provider)).organization.plan,
        "free",
        "expired entitlements fail closed without a webhook",
      );
      all[0].status = "canceled";
      [...requests.values()][1].status = "expired";
      await checkout(owner, org.id, provider);
      assert.equal(
        sessions,
        3,
        "expired checkout rotates its persisted idempotency seed",
      );
      assert.equal(customers, 1);
    } finally {
      for (const id of orgs) {
        await db().query("DELETE FROM usage_counters WHERE key LIKE $1", [
          "org-builds:" + id + ":%",
        ]);
        await db().query("DELETE FROM organizations WHERE id=$1", [id]);
      }

      for (const actor of actors) {
        await db().query("DELETE FROM usage_counters WHERE key LIKE $1", [
          "user-builds:" + actor.id + ":%",
        ]);
        await db().query('DELETE FROM "user" WHERE id=$1', [actor.id]);
      }

      if (previousPrice === undefined) delete process.env.STRIPE_TEAM_PRICE_ID;
      else process.env.STRIPE_TEAM_PRICE_ID = previousPrice;
      await db().end();
    }
  },
);
