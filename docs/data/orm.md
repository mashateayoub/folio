# Drizzle ORM and database ownership

Application database access uses Drizzle ORM over the existing `pg` connection pool. Better Auth uses its Drizzle adapter against the same database and explicitly supplied auth schema. This migration preserves PostgreSQL table/column names, UUIDs, user IDs, credentials, sessions, and the established SQL migration ledger.

## Models and queries

- `src/server/database/schema/auth.ts`: user, account, session, verification, database rate limits, and MFA.
- `src/server/database/schema/application.ts`: tenants, memberships, projects, grants, invitations, builds, quotas, audits, and migration receipts.
- `src/server/database/schema/billing.ts`: provider bindings and webhook receipts.
- `src/server/database/client.ts`: a lazy pool capped at ten connections, Drizzle initialization, transaction type, transaction helper, and explicit shutdown for scripts/tests.

Use Drizzle's select/insert/update/delete builders for model access. JSON source and audit metadata have explicit TypeScript types; timestamps are mapped to Dates by typed model reads. Binary PDF values map to PostgreSQL `bytea`.

PostgreSQL-specific operations such as atomic quota upserts, receipt insertion, retention, and multi-table reporting use Drizzle's `sql` template and `execute`. Values are bound parameters, including when repeated in one query. SQL is not built by interpolating user text into a raw program. Only fixed lock clauses and reviewed migration files use `sql.raw`.

Raw `execute` results do not apply column decoders. Use typed model reads when business logic requires Dates, rather than annotating raw timestamp strings as Date. Invitation/member/plan expiry reads use the query builder for this reason.

## Transactions and concurrency

`transaction(work)` delegates to Drizzle's PostgreSQL transaction API. All operations in a service callback use that transaction handle. Existing parent-tenant row locks, lock order, optimistic revision predicates, quota guards, owner ceilings, and idempotency receipts remain in force. Domain/schema inference provides model types without separate handwritten copies.

## Migrations

The existing `migrations/*.sql` and `schema_migrations` ledger remain authoritative. `scripts/migrate.ts` obtains advisory transaction lock 746021, creates the receipt table if needed, and executes each unapplied SQL file in lexical order within the transaction. It does not call Better Auth's Kysely migration runner.

`000_auth.sql` bootstraps the auth tables for fresh databases using `CREATE TABLE IF NOT EXISTS`, preserving existing installations, and creates supporting auth indexes. Existing application migrations `001`–`003` are unchanged. Auth plugin upgrades require reviewing and adding explicit ALTER migrations plus matching Drizzle model updates; `CREATE TABLE IF NOT EXISTS` cannot add columns to an existing table.

There is no second Drizzle Kit migration ledger or automatic schema push. Make intentional, reviewed SQL changes and run the existing migration command:

```sh
npm run db:migrate
npm run test:db
npm run test:billing
```

`test:db` verifies date/JSON round-trips and whole-transaction rollback. Billing and SaaS integration cover tenant locking, entitlement lifecycle, invitations, permissions, auth, and build access. Production startup runs the same migration runner.

## Implementation references

- [Database client](../../src/server/database/client.ts)
- [Auth schema](../../src/server/database/schema/auth.ts)
- [Application schema](../../src/server/database/schema/application.ts)
- [Billing schema](../../src/server/database/schema/billing.ts)
- [Auth bootstrap migration](../../migrations/000_auth.sql)
- [Migration runner](../../scripts/migrate.ts)
- [Database integration test](../../tests/database.integration.ts)
