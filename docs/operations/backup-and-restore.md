# Backup and restore

PostgreSQL holds accounts/sessions, source, membership/grants/invitations, build PDFs/logs, billing state/receipts, counters, audits, and migration history. A source ZIP alone does not recover the SaaS. Auth secrets and external provider/SMTP configuration also require separate protected recovery records.

A local snapshot example, stored outside the repository:

```sh
docker compose exec -T postgres pg_dump -U folio -d folio -Fc > /tmp/folio-backup.dump
docker compose exec -T postgres pg_restore --list < /tmp/folio-backup.dump
```

`/tmp` is an example local path, not durable production backup storage. Store real backups encrypted, access-restricted, off-host, with retention and restore monitoring. Check the command exit code and archive listing; a file existing alone does not prove a successful dump.

Restore into a separate database for a local drill:

```sh
docker compose exec -T postgres psql -U folio -d postgres -c 'CREATE DATABASE folio_restore;'
docker compose exec -T postgres pg_restore -U folio -d folio_restore --no-owner --no-acl < /tmp/folio-backup.dump
```

Use an isolated application configuration pointing to the restored database to verify source, login/session behavior, memberships, PDFs, and migration ledger. Isolate external side effects: restored billing customer IDs refer to real provider resources in their original mode, and restored email addresses are not test recipients. Do not run provider acceptance or reconciliation against an unintended live restore.

There is no shipped automated restore validation. A public launch should include a documented successful drill and recovery-time/data-loss objectives chosen by the operator. Do not run destructive restore/clean commands over the active database as a routine check.

`docker compose down` preserves data; volume deletion deliberately removes it. Changing `POSTGRES_PASSWORD` in environment does not rotate an initialized database role. Running migrations on an empty replacement database creates schema but does not recover previous projects or provider bindings.

The scratch `folio-builds` volume is temporary compiler work, not authoritative finished artifact storage. Mailpit is a local mailbox, not the recovery system for user data. Secrets should not be committed as part of backups.

## Implementation references

- [compose.yaml](../../compose.yaml)
- [migrations/001_saas.sql](../../migrations/001_saas.sql)
- [scripts/migrate.ts](../../scripts/migrate.ts)
