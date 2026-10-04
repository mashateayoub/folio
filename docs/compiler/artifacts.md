# Artifact persistence, retention, and access

Build records hold the source revision, transient immutable source snapshot, running/succeeded/failed state, optional PDF `bytea`, log, actor, and timestamps. On finish the snapshot is cleared. On late worker completion, the update succeeds only while state is still running, so an already-failed stale record is not revived.

`finishBuild()` retains the newest three PDF-bearing records per project by clearing older PDF bytes. It then removes old completed records without PDFs unless they are among the latest ten build records. This is a retention rule, not exactly a fixed ten-row history: preserved PDF-bearing rows can coexist with the diagnostic window.

Recent builds GET returns at most ten records with IDs, revisions, status/log/time, and `hasPdf`. It does not inline binary PDFs. A PDF GET resolves the build's project, checks current read permission, and returns 404 if there is no retained PDF. It sets application/pdf, inline `document.pdf`, private/no-store, and nosniff headers.

A source edit does not delete the earlier PDF immediately. The editor labels stale source and preserves preview on errors. Revoking membership or grants makes later artifact requests fail even when the PDF remains in the database. A copied artifact URL is not a public sharing token.

Project deletion cascades builds and their PDFs. Database backups contain PDFs and may be large; restore policy must cover both source and artifacts. There is no external object storage, CDN, artifact signing URL, or independent retention scheduler. Cleanup is triggered by build finishing and stale-record handling.

An interrupted build can leave a running record until a later build marks it stale. Operators should inspect [runbooks](../operations/runbooks.md) before changing build state manually.

## Implementation references

- [src/lib/server/saas.ts](../../src/lib/server/saas.ts)
- [src/app/api/builds/[id]/pdf/route.ts](../../src/app/api/builds/[id]/pdf/route.ts)
- [migrations/001_saas.sql](../../migrations/001_saas.sql)
