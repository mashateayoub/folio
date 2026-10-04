# Stripe configuration and recovery

Use separate Sandbox and public live configurations. The runtime requires `STRIPE_SECRET_KEY`, `STRIPE_TEAM_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` together. Use a positive, active, monthly recurring per-unit licensed Price with interval count one. Optionally specify a dedicated portal configuration. The UI reads the configured currency/amount and accounts for currency formatting, including the explicit ISK/UGX handling in the component.

```sh
npm run billing:check
npm run billing:listen
```

The check command validates Price and portal features and reports configured mode/currency/amount, not secrets. The listener is development-only, accepts only loopback destinations, subscribes to the application's event list, and prefers the application API key over expiring CLI login state. It saves the signing secret to `.env.local` with mode 0600 and redacts keys from output. Keep it running; recreate the web container to load its secret.

For host development:

```sh
STRIPE_FORWARD_URL=http://127.0.0.1:3001/api/billing/webhook npm run billing:listen
```

Public production uses a registered HTTPS webhook endpoint and its own signing secret, not the CLI helper. Configure the event list from [webhooks](webhooks.md). Avoid mixing live Price/portal/keys or using a listener secret for a registered endpoint.

```sh
npm run billing:reconcile
# Container runtime environment:
docker compose exec web npm run billing:reconcile:container
```

The reconciler enumerates bound customers, synchronizes each workspace under lock, continues through individual failures, and returns nonzero when failures occur. Run it periodically from a monitored scheduler (five minutes is a suggested operational interval, not a built-in job). The app ships no scheduler. Owners may also use Refresh status. Expiry falls back to Free even if events stop arriving.

For conflicting subscriptions, inspect the provider account and customer binding, resolve unintended ongoing subscriptions according to business policy, then reconcile. Do not directly set `plan=team` as a payment repair. Do not delete event receipts casually or clear idempotency seeds to bypass checkout protection.

Sandbox acceptance refuses live prices and uses disposable resources. Public pricing, tax, refund, and deployment policy remain operator decisions rather than implied settings of the local Sandbox catalog.

## Implementation references

- [scripts/check-billing.ts](../../scripts/check-billing.ts)
- [scripts/stripe-listen.mjs](../../scripts/stripe-listen.mjs)
- [scripts/reconcile-billing.ts](../../scripts/reconcile-billing.ts)
- [src/lib/server/billing.ts](../../src/lib/server/billing.ts)
