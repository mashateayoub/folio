# Checkout, portal, retries, and return handling

Checkout accepts exactly `{ "plan": "team" }` with no extra keys. The server validates membership/ownership under tenant lock and inserts a stable UUID checkout request seed before remote requests. Customer creation uses an organization-derived idempotency key, records the customer binding in a committed transaction, and includes server-owned tenant metadata.

Before creating checkout, the server retrieves current subscriptions for the customer and reconciles limits. Any ongoing subscription—including unpaid/incomplete—blocks another purchase with 409. Repair payment through the existing portal rather than creating a second subscription.

An existing open checkout with a URL is reused. For a completed checkout, the bound subscription must be terminal before another purchase is allowed. Expired/eligible finished sessions rotate the persisted seed, commit, and retry creation. The new session uses subscription mode, fixed configured price, quantity one, customer binding, tenant metadata, and return URLs derived from `APP_URL`. Lost responses retry through provider idempotency instead of duplicating purchase resources.

The success query parameter only starts polling the summary (every three seconds, up to ten attempts). It never grants Team. Payment access arrives from verified provider reconciliation. Cancellation return does not destroy existing data.

Portal creation requires an existing server-owned customer binding. It uses an optional dedicated portal configuration and a server-owned return URL. Configure invoice history, payment-method updates, and cancellation; disable subscription price/quantity updates for this catalog. The portal is hosted by Stripe and returns a URL to the UI.

Checkout/customer operations span several transactions and remote API calls; they are not a distributed atomic commit. Stable keys, persisted seeds, serialized tenant access, duplicate-purchase checks, and reconciliation collectively handle retries. The owner can Refresh status to request current provider state; members can refresh the locally stored summary.

The browser receives only the redirect URL. API secret keys, arbitrary prices, and provider customer selectors are never supplied by the client flow.

## Implementation references

- [src/server/billing/service.ts](../../src/server/billing/service.ts)
- [src/app/api/organizations/[id]/billing/checkout/route.ts](../../src/app/api/organizations/[id]/billing/checkout/route.ts)
- [src/features/billing/components/billing-settings.tsx](../../src/features/billing/components/billing-settings.tsx)
