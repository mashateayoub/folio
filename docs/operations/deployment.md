# Public deployment requirements

The shipped Compose file is a local environment: loopback published ports, Mailpit, production-built Next with explicitly allowed local HTTP, and a supervisor socket mount. It is not a complete public hosting blueprint.

A public deployment needs a real HTTPS `APP_URL`, correctly forwarded origins/cookies, persistent PostgreSQL with tested restoration, externally delivering SMTP, private compiler connectivity, matching compiler credentials, live-mode Stripe configuration when accepting payments, and a registered HTTPS webhook endpoint. Omit `ALLOW_INSECURE_LOCAL_DEV`; config then rejects a production HTTP origin.

Deploy web on a Node-capable environment with enough request duration for synchronous compilation. The route's 45-second declaration is not a guarantee that a hosting provider honors that timeout. A worker host must support Docker CLI/daemon and the expected TeX image; typical edge/static-only hosting cannot run this full system as-is.

Recommended rollout sequence:

1. Back up PostgreSQL and prove the migration against a restored copy.
2. Configure private environment/secrets and SMTP/Stripe endpoint settings.
3. Build immutable web/compiler images and run lint/types/tests/build checks.
4. Apply migrations before routing traffic to the new application.
5. Verify signup/verification, save, actual PDF, access revocation, and billing event delivery.
6. Enable monitored scheduled reconciliation and review failure/latency/capacity metrics.

Better Auth schema migration is invoked by the runner. The migration advisory lock serializes cooperating instances, but deployment orchestration must still handle failed migrations and compatible schema rollout.

Run the privileged compiler supervisor on a dedicated host, protect its transport, and validate isolation/capacity with untrusted documents. One supervisor serves one active compile. Multi-replica web can serialize tenant writes in PostgreSQL but does not add a queue or extra compiler capacity automatically.

No managed hosting configuration, reverse proxy, production scheduler, backup service, alert pipeline, or full load/restore acceptance is shipped. These are explicit operator responsibilities; [runbooks](runbooks.md) explain local diagnostics and [limitations](../product/limitations.md) records remaining architecture work.

## Implementation references

- [compose.yaml](../../compose.yaml)
- [infra/Dockerfile.web](../../infra/Dockerfile.web)
- [src/server/config.ts](../../src/server/config.ts)
- [src/app/api/compile/route.ts](../../src/app/api/compile/route.ts)
