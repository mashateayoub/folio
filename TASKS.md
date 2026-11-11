# Implementation task list

Follow milestone order; acceptance checks define completion. Architecture details are in [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

## Current progress — SaaS foundation

The application now includes verified email/password authentication, recovery, optional TOTP MFA, session revocation, PostgreSQL migrations, multi-tenant workspaces, owner/admin/member/viewer RBAC, project grants, and ABAC checks for tenant identity, account state, organization state, membership state/expiry, visibility, and archived projects. Team screens manage invitations and members; account screens manage credentials and sessions.

Sources are saved in PostgreSQL with revision checks. Builds capture stored snapshots and persist authorized PDF results; quota counters and metadata-only audit events are database-backed. Compose provides a complete local startup, including PostgreSQL, Mailpit, compiler supervision, and the web application. The previous local editor features remain available.

Completed interface rebuild:

- [x] Unified library, source/PDF editor, authentication, invitation, account/team settings, and access dialogs.
- [x] Self-hosted typography, Tailwind design tokens, consistent Phosphor icons, and reduced-motion animation.
- [x] Project search, visibility/archive filters, sorting, and contextual empty states.
- [x] Viewport-bounded editor and mobile source/PDF/file navigation.
- [x] Real loading states, visible focus, permission-aware controls, and navigation that flushes pending saves.
- [x] Desktop/mobile screenshots and browser regression coverage.

Completed SaaS tasks:

- [x] Verified registration, sign-in, recovery, protected pages, and sessions.
- [x] Authenticator MFA, one-time recovery codes, and session revocation.
- [x] Workspace isolation, RBAC roles, project grants, and reusable ABAC policy.
- [x] Invitations bound to verified email, token hashing, expiry, acceptance, and revocation.
- [x] Database migrations, durable projects, acknowledged autosave, and revision conflicts.
- [x] Permission-checked compile snapshots and persisted private artifacts.
- [x] Team/account/access screens, archive/delete, quotas, and audit feed.
- [x] Local Docker startup and private generated configuration.
- [x] API integration coverage for identity, tenant boundaries, roles, attributes, PDFs, quotas, MFA, and recovery.
- [x] Implement billing checkout, customer portal, signed webhooks, subscription persistence, and server-enforced plan limits.
- [x] Verify real Stripe Sandbox checkout, portal, signed delivery, renewals, payment failure/recovery, and cancellations with provider configuration.
- [ ] Validate public deployment, monitoring, load, backups/restore, and stronger worker isolation.

Validation passed: ESLint, TypeScript, production Docker builds, policy/source unit checks, the SaaS API integration suite against both development and Compose, nine authenticated browser workflows, billing integration checks, and real Stripe Sandbox hosted and Test Clock acceptance. The 752 anti-slop baseline findings across 80 files are now resolved. Combined lint and formatting checks pass with all generic rules enabled. Installation diagnostics are private local artifacts.

The original milestone checkboxes below remain unchecked wherever their broader acceptance criteria (assets, queueing, object storage, collaboration, history, and public deployment) are unfinished. The runnable architecture currently uses PostgreSQL JSONB sources and bytea artifacts, and synchronous private compiler requests; Redis and object storage remain future scaling work.

## M0 — Validate foundations

- [ ] **T01 — Prove compilation feasibility.** Build a pinned TeX Live/latexmk image; compile sample projects with included files, an image, and bibliography. Confirm shell escape and project RC files are disabled. Record compile times and package footprint.
- [ ] **T02 — Prove browser integration.** Build a disposable CodeMirror LaTeX highlighting and PDF.js spike. Confirm client-only loading, PDF worker configuration, Unicode text, and large-document usability.
- [ ] **T03 — Record implementation decisions.** Select supported package versions, authentication provider, hosting topology, initial quotas, and sandbox runtime. Document expected limitations.
- [ ] **T04 — Initialize the repository.** Create the Next.js TypeScript app and workspace packages; configure linting, formatting, type checking, environment validation, and CI.
- [ ] **T05 — Provision local services.** Add Compose configuration for PostgreSQL, Redis, private object storage, and worker development. Document a reproducible startup procedure.

**Exit:** a reproducible sample compiles and renders; the chosen deployment can support isolation and long-running workers.

## M1 — Private projects and durable editing

Depends on M0.

- [ ] **T06 — Add database foundations.** Define users, projects, files, file revisions, and builds. Add migrations, stable IDs, path uniqueness, revision transactions, and indexes.
- [x] **T07 — Implement sign-in and authorization.** Add sessions, protected routes, and reusable project access checks. Verify one user cannot read or modify another user's resources.
- [ ] **T08 — Build the project dashboard.** Implement list, create, rename, duplicate, and delete. Ensure duplicate projects reference safe immutable content and deletion cleans up asynchronously without affecting other projects.
- [ ] **T09 — Build file management.** Add folders, text files, assets, rename, move, delete, and root selection. Validate paths and handle deleted or invalid roots explicitly.
- [ ] **T10 — Build the workspace shell.** Add resizable file/editor/preview panels, accessible controls, keyboard navigation, and small-screen tabs.
- [ ] **T11 — Integrate the editor.** Add LaTeX highlighting, indentation, bracket matching, search, shortcuts, and per-file selection/undo state.
- [ ] **T12 — Implement acknowledged autosave.** Add debounced revision-checked saves, local pending-draft recovery, save-state feedback, safe file switching, and multi-tab conflict handling.
- [ ] **T13 — Add bounded asset upload.** Validate types, sizes, and project access; store assets privately and preserve consistent revision manifests.

**Exit:** a user can edit and reload a multi-file private project; conflicts and failed saves never masquerade as successful saves.

## M2 — Compilation and PDF preview

Depends on M1 and the compilation spike.

- [ ] **T14 — Capture immutable builds.** Implement manifests, build request/status APIs, content hashes, compiler-version keys, and authorized artifact access.
- [ ] **T15 — Add queue coordination.** Configure BullMQ, enforce one running/latest pending job per project, deduplicate inputs, cap retries, and recover stalled jobs.
- [ ] **T16 — Implement the sandbox supervisor.** Stage validated files, execute fixed latexmk commands, enforce all runtime limits, kill process trees on timeout, and clean temporary state.
- [ ] **T17 — Store build results.** Upload PDFs/logs, persist terminal status, bound diagnostics, and add retention cleanup and failure recovery.
- [ ] **T18 — Implement live build controls.** Flush saves before compile, debounce auto-compile, add manual compile and cancellation, and prevent stale completions from replacing current previews.
- [ ] **T19 — Implement PDF viewing.** Add PDF.js rendering, zoom, page navigation, text search, authorized download, loading states, and position preservation.
- [ ] **T20 — Implement compiler diagnostics.** Parse common errors/warnings, link to source when possible, show raw logs, and preserve the last successful preview on failure.
- [ ] **T21 — Verify the vertical workflow.** Test edit → save → build → PDF, bibliography multipass builds, stale completion order, syntax failures, worker crashes, and resource-limit cleanup. Benchmark a representative warm build.

**Exit:** typing triggers an actual compiled PDF after a pause; errors are recoverable and builds operate within isolated, enforced limits.

## M3 — Release 1 beta

Depends on M2.

- [ ] **T22 — Add project ZIP import/export.** Preserve source folders and assets; reject traversal, symlinks, excessive expansion, and invalid roots. Verify an exported project imports and recompiles.
- [ ] **T23 — Add built-in templates.** Provide a small, licensed template set, such as article, report, and résumé. Compile every template against the pinned image.
- [ ] **T24 — Add meaningful automated checks.** Cover permission boundaries, revision conflicts, queue ordering, import validation, and the complete browser workflow.
- [ ] **T25 — Finish accessibility and responsiveness.** Verify keyboard access, resize controls, focus handling, labels, contrast, and mobile source/preview switching.
- [ ] **T26 — Deploy the beta.** Configure HTTPS, private storage, web/worker deployment, migrations, secrets, rate limits, quotas, monitoring, backups, and an exercised restore procedure.
- [ ] **T27 — Run release acceptance.** Complete every release 1 gate in the plan and measure simultaneous-project builds. Publish setup instructions and known limitations.

**Exit:** a deployed beta supports reliable private editing, compilation, and project transfer.

## M4 — Shared editing

Depends on release 1.

- [x] **T28 — Add memberships and invitations.** Implement owner/editor/viewer permissions, expiring invitations, revoke access, and role checks on all shared endpoints.
- [ ] **T29 — Deploy the realtime service.** Add authenticated WebSocket rooms, origin checks, short-lived credentials, message validation, viewer write rejection, and revocation handling.
- [ ] **T30 — Bind Yjs to CodeMirror.** Use stable file IDs; add remote cursors, presence, connection states, and collaboration-aware undo.
- [ ] **T31 — Persist shared edits durably.** Store updates before durable acknowledgement, compact snapshots, restore on restart, and remove competing HTTP text writers for shared files.
- [ ] **T32 — Build consistent shared revisions.** Materialize accepted text and file operations into atomic manifests for compilation. Define behavior for rename, delete, and root changes during editing.
- [ ] **T33 — Verify convergence and recovery.** Exercise simultaneous edits, disconnect/reconnect, duplicated updates, server restart, viewer attacks, revoked access, and competing file operations in two browsers.

**Exit:** collaborators converge on persisted text and compile consistent snapshots; permissions hold over reconnects and revocation.

## M5 — History, navigation, and public-launch readiness

Depends on M4; SyncTeX investigation can start after M2.

- [ ] **T34 — Add named snapshots and history.** Store immutable manifests, show revision metadata/diffs, and implement restore as a new revision with coordinated client rebind.
- [ ] **T35 — Add SyncTeX navigation.** Generate mappings, translate build paths to file IDs, and implement source/PDF jumps against the matching build revision.
- [ ] **T36 — Expand compatibility deliberately.** Validate XeLaTeX/LuaLaTeX and additional packages against the sandbox before enabling them; clearly expose engine selection and unsupported features.
- [ ] **T37 — Validate operational capacity.** Load-test editor rooms and build queues; tune concurrency, autoscaling, storage retention, and project quotas from measurements.
- [ ] **T38 — Complete public-launch gates.** Verify sandbox isolation, dependency updates, backup recovery, permission boundaries, history restore under active editing, and incident runbooks.

**Exit:** release 2 passes collaboration, history, and recovery acceptance checks with measured hosting capacity.

## Critical path

Compiler feasibility → repository/infrastructure → authenticated projects → durable editing → immutable build snapshots → isolated worker → PDF preview → release 1 acceptance → shared-edit persistence → consistent collaborative builds → history and release 2 acceptance.

Start with T01 and T02: they resolve the highest-risk integrations before building the full UI.
