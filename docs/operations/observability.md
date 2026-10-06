# Logs, audits, and monitoring gaps

Application request failures log an error name and return a generic 500. Development request logging suppresses auth, invitation, invite-page, and reset paths. The Stripe listener redacts key-like strings. These protections do not govern reverse-proxy, SMTP, provider, database, or every browser/test log.

Audit events record tenant, optional actor, action, resource ID, metadata, and timestamp. Implemented actions include workspace creation; project creation/save/attribute/access/deletion; membership change; invitation creation/acceptance/revocation; build request; checkout/portal initiation; and subscription sync. Save audits include revision metadata rather than source. Automated billing sync has a null actor; deleted users also leave null actors through FK behavior.

Team settings exposes the latest 100 audit events and roster only to owner/admin. This is application activity history, not a complete tamper-proof compliance log. Auth library events, all reads, every failed authorization attempt, and infrastructure activity are not all captured in this table.

Useful production signals would include request/error latency, database connection pressure and lock waits, compiler busy/timeouts/job cleanup, artifact size/DB growth, email failures, webhook response errors, expired entitlements, and reconciliation exit status. A suggested reconciliation scheduler must alert on nonzero exit; the repository does not install that scheduler.

The supervisor health endpoint proves HTTP process availability only. It does not check image availability, Docker permission, actual TeX output, or queue capacity. Web has no application-specific health route; readiness should use deployment-appropriate probes and an authenticated disposable smoke workflow when needed.

No tracing backend, metrics exporter, alert integration, centralized log retention policy, or formal availability objective is configured. Document those choices separately when public operations are added.

## Implementation references

- [src/server/http.ts](../../src/server/http.ts)
- [docs/architecture/source-structure.md](../architecture/source-structure.md)
- [src/server/billing/service.ts](../../src/server/billing/service.ts)
- [next.config.ts](../../next.config.ts)
- [services/compiler/server.ts](../../services/compiler/server.ts)
