# Operational runbooks

Run local commands from the repository root. Read environment/secrets privately; do not print them in tickets.

## Service and database readiness

```sh
docker compose ps
docker compose logs --tail=100 web compiler postgres
npm run db:migrate
```

Web startup waits for database/compiler readiness and runs migrations. Compiler health is process liveness, not a PDF smoke test. Check Docker access and the TeX image by compiling a disposable document through the app.

## Configuration change

Update the owning private environment. Coordinate compiler token on both sides and origins across web/email/auth. Recreate affected containers so new values load:

```sh
docker compose up -d --no-deps web
```

If application/image source changed, rebuild as well. An initialized PostgreSQL role password needs an intentional DB change, not just environment recreation. Avoid logging full effective Compose config because it may expand secrets.

## Billing drift

Run `billing:check` for configuration. Confirm webhook destination and signing secret, inspect error status/logs, and run `billing:reconcile`. Resolve provider conflicts there before reconciliation. Never grant paid access by manually editing the plan as a substitute for purchase verification.

## Compiler saturation or stuck build

429 may be a user/monthly quota, recent running project, or supervisor busy response. Identify which path rejected admission. A record older than 60 seconds is failed when another build begins. A job can be cleaned by the supervisor's finally block; if that failed, inspect only application-named job containers. Do not delete arbitrary Docker containers/volumes to clear a busy state.

## Source conflict or failed save

Have the user export local source before reload. For transient failure, restore connectivity and Retry; for 409 or revoked access, acknowledge that editing is blocked and fetch current state after preserving any local draft. Server overwrite is not a recovery strategy.

## Release checks

Use [testing](../development/testing.md), [deployment](deployment.md), and [backup drill](backup-and-restore.md). Keep focused Git commits, verify only intended files are staged, and record actual checks rather than claiming an unperformed public acceptance.

## Implementation references

- [compose.yaml](../../compose.yaml)
- [src/lib/server/saas.ts](../../src/lib/server/saas.ts)
- [scripts/reconcile-billing.ts](../../scripts/reconcile-billing.ts)
- [src/components/use-project-persistence.ts](../../src/components/use-project-persistence.ts)
