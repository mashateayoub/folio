# Migrations and data lifecycle

```sh
npm run db:migrate
# Inside the web container, without a host env file:
docker compose exec web npm run db:migrate:container
```

Compose web startup runs migrations before Next starts serving. Host commands use `.env.local`. The runner acquires advisory lock 746021, creates `schema_migrations`, and applies unapplied `.sql` files in lexical order. Each auth/application SQL file is recorded only after execution in the enclosing application transaction.

| Migration                      | Effect                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `000_auth.sql`                 | Additive explicit Better Auth tables and supporting indexes for the Drizzle adapter                        |
| `001_saas.sql`                 | Tenant, memberships, source, project grants, invitations, builds, counters, audits                         |
| `002_billing.sql`              | Paid expiry, provider bindings, idempotency seed and receipts; resets unverified placeholder plans to Free |
| `003_billing_cancellation.sql` | Explicit `cancel_at` date to support scheduled cancellation represented without a period-end flag          |

Migration 002 preserves projects/members but intentionally resets previous placeholder plans. Its ALTER statements are protected by the migration ledger, not all individually idempotent. Do not delete ledger entries to force reruns. Existing applied SQL files should remain immutable; add the next numbered migration for a change.

There is no rollback command or down migration. Back up and test changes on a restored database before deployment. Auth and application SQL files now execute and commit together in the same Drizzle transaction; the migration ledger is rolled back on failure.

Deletion cascades tenant/project resources as defined by foreign keys. Owner foreign keys may prevent deleting a user until their organizations/projects are deliberately handled. Artifact retention runs when a build finishes, not on a background schedule. Expired usage counters are also cleaned there; expiry alone does not run a job.

For backups, restore drills, migration ordering during rollout, and retention caveats, see [backup and restore](../operations/backup-and-restore.md) and [deployment](../operations/deployment.md).

## Implementation references

- [scripts/migrate.ts](../../scripts/migrate.ts)
- [compose.yaml](../../compose.yaml)
- [docs/architecture/source-structure.md](../architecture/source-structure.md)

Auth bootstrap and ORM ownership are described in [Drizzle ORM](orm.md). Auth tables now have explicit versioned SQL; Better Auth runtime uses its Drizzle adapter.
