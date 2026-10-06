# Verified webhook processing

`POST /api/billing/webhook` runs in Node, reads raw bytes with a 1,000,000-byte cap, and verifies `Stripe-Signature` with the configured signing secret using Stripe's SDK and a 300-second tolerance. Missing, tampered, or stale signatures receive 400. Parsing JSON before verification would invalidate the exact-byte boundary.

Supported events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `customer.subscription.created`, `.updated`, `.deleted`, `.paused`, `.resumed`
- `invoice.paid`, `.payment_failed`, `.payment_action_required`

Valid signatures establish provider delivery, not permission to select a tenant from supplied metadata. The processor validates the event object's expandable customer ID, resolves the persisted `workspace_billing.customer_id` binding, and ignores unsupported/unbound events. Under organization row lock it inserts the globally unique event receipt. A duplicate receipt returns without refetching state.

For a new bound event, the server fetches current customer subscriptions (automatic pagination up to 1,000), validates the recognized entitlement, updates billing state and organization limits, and records `billing.subscription.synced` with a null automated actor. These writes and receipt commit together. Provider/DB failure rolls back the receipt, allowing redelivery rather than falsely acknowledging processing.

Event snapshots do not apply subscription state directly. Fetching latest Stripe state prevents delayed/out-of-order deliveries from restoring canceled access. The SDK uses its installed API version (`2026-09-30.endive` in the current Stripe package); changing SDK versions requires reviewing field and event compatibility.

Valid ignored events are acknowledged. Processing failures return through the normal error wrapper so delivery remains retryable. Operators should monitor failures, keep endpoint signing secrets aligned, and run reconciliation for missed renewals. A Checkout redirect is never an alternate webhook.

Real Sandbox tests cover delivered signed events, duplicate replay, tampered/missing signatures, scheduling, cancellation, renewal, failed payment, and recovery. See [test tiers](../development/testing.md).

## Implementation references

- [src/app/api/billing/webhook/route.ts](../../src/app/api/billing/webhook/route.ts)
- [src/server/http.ts](../../src/server/http.ts)
- [src/server/billing/service.ts](../../src/server/billing/service.ts)
- [tests/billing.stripe.ts](../../tests/billing.stripe.ts)
