# Transactions, locking, and failure boundaries

The pool permits ten connections with a five-second connection timeout and 30-second idle timeout. `transaction()` acquires a connection, begins, commits on success, rolls back on failure, and always releases it. SQL parameters are bound through `pg`; source strings are data, not interpolated SQL.

`orgContext()` takes a shared lock for reads and `FOR UPDATE` for mutations. It resolves the organization and current membership, rejects invalid actors/state, and computes the effective plan. Mutating quota operations and Stripe reconciliation serialize on the organization row, preventing conflicting capacity and entitlement writes from independently passing.

Project lookup derives its tenant from the stored resource. The server re-reads the project after obtaining its tenant lock so authorization does not depend on a stale pre-lock snapshot. A source update additionally requires the expected revision both in code and in the SQL UPDATE predicate.

Personal-workspace initialization and new workspace creation lock the user row. A unique personal-owner key prevents duplicate personal workspaces. Workspace creation caps ownership at ten. Usage counters use atomic insert/increment with a limit predicate; failed capacity checks roll back.

Stripe event receipts are globally unique by event ID. Receipt and entitlement writes share a transaction. Provider failure rolls back the receipt so redelivery can succeed. A delayed event fetches latest provider state rather than applying stale event fields. Remote Stripe calls occur while tenant locks are held in relevant operations: this prioritizes correctness but can add latency/lock contention during outages.

Checkout customer creation is persisted separately from checkout-session creation. Stable idempotency keys prevent a lost provider response from producing a second chargeable checkout/customer on retry. This does not create a database/Stripe distributed transaction; reconciliation repairs the external boundary.

Migrations use advisory transaction lock `746021`; application SQL migrations and receipts commit together. Better Auth's migration runner uses its own connections while the advisory lock remains held; this is not one atomic transaction covering both migration systems.

A synchronous compiler request can fail or leave a running record if a process exits. Later build initiation marks records older than 60 seconds failed. There is no independent watchdog or durable retry queue.

## Implementation references

- [src/lib/server/db.ts](../../src/lib/server/db.ts)
- [src/lib/server/saas.ts](../../src/lib/server/saas.ts)
- [src/lib/server/billing.ts](../../src/lib/server/billing.ts)
- [scripts/migrate.ts](../../scripts/migrate.ts)
