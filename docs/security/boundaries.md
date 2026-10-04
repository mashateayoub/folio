# Input, secret, and execution boundaries

Application mutation routes require a matching Origin: the configured origin or its local hostname alternate. An absent Origin is rejected as well. Server CLI integrations must provide the header if acting through these routes. The Stripe webhook instead authenticates exact request bytes with a provider signature; it does not use session/Origin authorization.

`jsonBody()` first reads a bounded raw body (default 1,000,000 bytes), parses JSON, and validates a Zod schema. Compact compile and billing mutations use 4096-byte limits. Identifiers are validated UUIDs; invitation tokens are exactly 64 lowercase hex characters. Strict input schemas reject unknown fields such as forged tenant, owner, role, or plan attributes in project source payloads.

Project paths reject absolute paths, traversal, unsupported extensions, option-like names, reserved `output/`, duplicate names/IDs, and file/folder collisions. Source size is bounded before persistence and before compiler execution. LaTeX still runs untrusted input, so [compiler isolation](../compiler/isolation.md) is a separate security boundary.

Session cookies are HttpOnly. Private application JSON uses no-store responses; PDFs add private/no-store, PDF content type, inline disposition, and nosniff. Next's powered-by header is disabled. Development request logging excludes auth, invitation, and reset paths that may contain credentials/tokens; this is not a guarantee that every proxy/provider log is redacted.

SQL uses parameter binding. Audit metadata is typed scalar data, not source bodies. Auth/library tables and build logs can contain sensitive data; database backups and support bundles need restricted handling. `.env.local`, generated PDF worker, build output, test screenshots, and live session files are Git-ignored. `.dockerignore` excludes env files and design review/live artifacts.

No general CSP, distributed edge rate limiter, formal penetration-test report, or public untrusted-document host acceptance is provided by this implementation. A compiler Bearer token protects transport access, but supervisor Docker access remains host-privileged. Keep the supervisor private and use a dedicated worker host in production.

Documented protections should be tested through their actual routes; avoid replacing them with frontend-only gating.

## Implementation references

- [src/lib/server/http.ts](../../src/lib/server/http.ts)
- [src/lib/server/schemas.ts](../../src/lib/server/schemas.ts)
- [src/lib/project.ts](../../src/lib/project.ts)
- [next.config.ts](../../next.config.ts)
- [.gitignore](../../.gitignore)
- [.dockerignore](../../.dockerignore)
