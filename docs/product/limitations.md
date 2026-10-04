# Implemented scope and remaining work

The editor has autosave and debounced actual PDF refresh. It does not have simultaneous collaborative text editing, WebSocket presence, comments, a shared cursor protocol, or merge-based conflict resolution. Two tabs editing the same revision receive a conflict rather than a merged document.

Unsaved source is held in the open browser tab. There is an unload guard and retry UI, but no durable offline draft journal. Closing a tab after a failed save may lose edits. A project revision is a concurrency guard, not browsable source history.

Only textual `.tex`, `.bib`, `.sty`, and `.cls` files are supported. There is no uploaded image/asset storage, arbitrary ZIP import, remote package fetching, SyncTeX source-to-preview navigation, or choice of TeX engine in the UI. Source ZIP export exists. The compiler image's installed packages determine available LaTeX packages.

The compiler supervisor accepts one job at a time. Busy work receives 429; there is no durable queue, fair scheduling, distributed coordination, user cancellation, or worker recovery service. Running build records older than 60 seconds are marked failed when a later build begins. A crashed job is not automatically retried.

PDFs are PostgreSQL `bytea`, not external object storage. The current stack is a local Docker Compose environment. Production SMTP, HTTPS, deployment infrastructure, backup/restore exercises, secret rotation, load testing, alerting, and hardened compiler host isolation need operator setup. Passing local tests does not prove public-host isolation or production capacity.

Billing supports a fixed two-plan, one-workspace subscription catalog. Portal price/quantity changes should be disabled. There is no billing admin UI for resolving conflicting subscriptions, tax/proration policy editor, usage-based invoice model, or automatic ownership transfer. There is no public API for suspending organizations or administratively disabling accounts; those states are enforced when present in the database.

The root planning documents contain a larger roadmap and unchecked tasks; they are not evidence that those tasks shipped. Do not describe roadmap functions as implemented in user-facing claims.

## Implementation references

- [README.md](../../README.md)
- [TASKS.md](../../TASKS.md)
- [services/compiler/server.ts](../../services/compiler/server.ts)
