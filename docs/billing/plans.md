# Billing model and paid entitlements

One recurring subscription covers one workspace. Free and Team capacities are fixed in `billingPlans`; the monetary amount comes from the configured Stripe Price. There is no hardcoded public commercial price and no endpoint to select an arbitrary provider price/customer/quantity.

Team requires an active or trialing subscription, matching `metadata.organization_id`, exactly one item, matching configured Price ID, item quantity one, and a future expiry. Expiry is the earlier of that item's `current_period_end` and explicit `cancel_at`, if present. The recognized entitlement becomes `organizations.plan` plus `plan_valid_until`; effective reads fall back to Free when expiry passes.

Past-due, unpaid, paused, incomplete, canceled, unknown-price, metadata-mismatched, expired, or conflicting ongoing subscriptions receive Free. Multiple nonterminal subscriptions produce `conflict`, requiring operator/provider resolution rather than arbitrary selection. If none are ongoing, reconciliation considers the most recently created terminal subscription for status reporting.

Scheduled cancellation retains paid access until its confirmed effective date. Stripe may represent that schedule using `cancel_at` while leaving `cancel_at_period_end` false; both are persisted and the UI uses the explicit date when available. Immediate cancellation removes entitlement after reconciliation.

Active members can read plans/usage. Only the verified active workspace owner can start checkout, open the portal, or trigger member-facing provider sync. Returned summaries do not expose provider customer/subscription IDs. Provider outages leave local plan/usage readable and can disable checkout pricing temporarily.

Paid limits affect project/seat/build admission, not destructive data deletion. Existing source remains editable after downgrade when normal permission applies. [Checkout](checkout-and-portal.md), [webhooks](webhooks.md), and [setup](setup-and-reconciliation.md) document the provider lifecycle.

## Implementation references

- [src/lib/billing-plans.ts](../../src/lib/billing-plans.ts)
- [src/lib/server/billing.ts](../../src/lib/server/billing.ts)
- [src/components/billing-settings.tsx](../../src/components/billing-settings.tsx)
