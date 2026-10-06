# Exported service and library entry points

This is a navigation reference for exported functions/classes, complementing the behavioral chapters. Types/constants remain in source and [contracts](contracts.md). Next route handlers/pages/components are mapped separately in [repository inventory](repository.md).

## services/compiler/compile.ts

[Implementation](../../services/compiler/compile.ts)

- `CompileError` — Compiler failure with message, diagnostic tail, and HTTP-oriented status; distinguishes TeX, timeout, service, and input failures.
- `containerArguments` — Build Docker argv for a named isolated job, its scratch mount/subpath, configured image, and root TeX file. Returns arguments without shell interpolation.
- `compileProject` — Revalidate canonical source, create scratch files, run the bounded Docker job, read/size-check its PDF, and always attempt container/directory cleanup. Returns PDF Buffer and diagnostic log.

## src/features/billing/plans.ts

[Implementation](../../src/features/billing/plans.ts)

- `effectivePlan` — Return Team only when a Team record has a non-null future Date expiry; otherwise Free. Optional clock parameter makes expiry tests deterministic.

## src/shared/http/cloud-client.ts

[Implementation](../../src/shared/http/cloud-client.ts)

- `CloudError` — Client fetch failure with original HTTP status and readable message; malformed successful JSON contracts use status 502.
- `cloud` — Fetch JSON with no-store, validate an error message on failure and the selected schema on success, and return inferred parsed data. Reject malformed data before UI state changes.

## src/features/access-control/policy.ts

[Implementation](../../src/features/access-control/policy.ts)

- `allowed` — Evaluate one read/write/compile/manage/delete action from actor, tenant, membership, project attributes, grant, and optional time. Pure boolean policy with viewer ceiling and archive rules.
- `permissions` — Evaluate all five allowed() actions and return the boolean record consumed by cloud DTOs and UI controls.
- `activeMembership` — Check presence, active state, and future optional expiry at the supplied/default time. Tenant/actor matching is separately checked by allowed()/orgContext().

## src/features/projects/model.ts

[Implementation](../../src/features/projects/model.ts)

- `createProject` — Clone the starter document and assign a random project ID/title for article, report, or blank. Template transformations change source files; tenant metadata is added only by the server.

## src/server/auth/service.ts

[Implementation](../../src/server/auth/service.ts)

- `getAuth` — Lazily create and reuse the configured Better Auth server instance with database session/MFA/mail/rate-limit options.
- `getActor` — Read a session through request Headers; return null for missing/disabled identity, otherwise an Actor with verification/MFA flags. Route actorFor additionally enforces verified status.

## src/server/billing/service.ts

[Implementation](../../src/server/billing/service.ts)

- `billingConfigured` — Return whether key, Price ID, and webhook signing secret are all present. Presence alone does not validate actual provider objects/connectivity.
- `stripeProvider` — Reject unconfigured billing with 503; create the actual Stripe SDK with ten-second timeout and one network retry. It also exposes SDK webhook verification to verifyBillingEvent().
- `subscriptionEntitlement` — Validate status, tenant metadata, single configured-price item, quantity, and future min(period end,cancel_at). Return effective plan and nullable paid validity.
- `billingSummary` — Read membership/local billing/usage under transaction and return plan/capacity/status plus owner controls. Attempt current price fetch outside the snapshot and keep local data readable on outage.
- `checkout` — Owner-only idempotent customer/session creation with durable seed, current-subscription reconciliation, open-session reuse, terminal/expired-session rotation, and server-fixed purchase inputs. Return hosted URL or protected failure.
- `portal` — Owner-only provider portal session for a persisted customer binding and trusted return URL, with optional configuration. Audit initiation and return URL.
- `verifyBillingEvent` — Construct a Stripe event from bounded exact raw bytes, signature, endpoint secret, and timestamp tolerance. Missing/invalid signature produces 400.
- `processBillingEvent` — Ignore unsupported/unbound customer events; lock mapped tenant, insert unique receipt, fetch latest subscription state, and atomically persist entitlement/audit. Failure rolls back receipt for retry.
- `reconcileWorkspaceBilling` — Operator-facing sync for one stored tenant/customer without an actor parameter. Caller is a trusted server script; not an unauthenticated HTTP endpoint.
- `syncBilling` — Member-facing owner-authorized provider sync after current tenant/membership checks. The route returns a fresh summary separately.

## src/server/config.ts

[Implementation](../../src/server/config.ts)

- `config` — Parse core environment, identify incomplete keys, reject public production HTTP and example auth/compiler secrets. Return validated/defaulted configuration without mutating process env.
- `databaseUrl` — Resolve the validated database URL and apply optional container hostname/port overrides. Preserve the URL credentials/database components.

## src/server/database/client.ts

[Implementation](../../src/server/database/client.ts)

- `db` — Return a Drizzle database over the lazy global pg Pool and typed PostgreSQL schema.
- `transaction` — Run work in a Drizzle PostgreSQL transaction with automatic commit/rollback and connection release.

## src/server/http.ts

[Implementation](../../src/server/http.ts)

- `HttpError` — Intentional application HTTP status and message carried through api() rather than exposed as an unhandled stack.
- `actorFor` — Optionally enforce configured Origin for mutations, resolve current session actor, and reject missing/unverified identity. Never use client user ID as authority.
- `rawBody` — Stream request bytes with size accounting and a cap, cancel oversize reads, and return the exact Buffer. Used before JSON and webhook signature parsing.
- `jsonBody` — Read bounded bytes, parse JSON, validate the supplied Zod contract, and return parsed typed data. Input errors become intentional 400/413 responses.
- `api` — Await route work and catch synchronous/asynchronous HttpError or unexpected failures. Return no-store JSON errors and log only a failure name for unexpected cases.
- `json` — Create a typed NextResponse JSON payload with selected status and no-store headers. Serialization is an output helper; external input parsing belongs to jsonBody().

## src/server/mail.ts

[Implementation](../../src/server/mail.ts)

- `sendMail` — Build SMTP transport from validated/override env, optionally authenticate/use TLS, and send plain-text mail. Reject delivery failures to the calling workflow.

## Domain services

[Implementation](../architecture/source-structure.md)

- `audit` — Insert tenant activity with optional actor/resource and scalar metadata. Call within the caller transaction so mutation/activity commit together. [Source](../../src/server/audit/service.ts)
- `orgContext` — Lock tenant in shared/write mode, fetch current actor membership, enforce verified/enabled/active/unexpired access, and compute effective paid plan. Return organization and member rows. [Source](../../src/server/access/context.ts)
- `ensurePersonalWorkspace` — Lock user, reuse unique personal workspace when present, or create owner membership/sample source/audit atomically. Return personal workspace UUID. [Source](../../src/server/workspaces/service.ts)
- `organizations` — Ensure personal initialization, then list memberships that are active/unexpired and compute paid effective plan in SQL. Return Organization DTOs ordered by creation. [Source](../../src/server/workspaces/service.ts)
- `createOrganization` — Lock owner user, cap owned workspaces at ten, create tenant and owner seat, audit, and return the new Free workspace DTO. [Source](../../src/server/workspaces/service.ts)
- `listProjects` — Read tenant projects/grants, evaluate current read policy per project, and return authorized CloudProject DTOs with computed permissions. [Source](../../src/server/projects/service.ts)
- `createCloudProject` — Require active non-viewer seat and current project capacity, generate template or clone imported source with fresh ID, persist owner/tenant, audit, and return authorized DTO. [Source](../../src/server/projects/service.ts)
- `getProject` — Resolve stored resource tenant through private projectContext(), require read, and return source/cloud metadata/current permissions. [Source](../../src/server/projects/service.ts)
- `saveProject` — Require path/payload ID agreement and write policy, compare expected revision, atomically update JSONB source/revision, audit revision-only metadata, and return updated DTO. [Source](../../src/server/projects/service.ts)
- `setProjectAttributes` — Require manage permission and change only validated visibility/archive settings, audit, and return updated cloud project. This is separate from source save. [Source](../../src/server/projects/service.ts)
- `deleteProject` — Require delete permission, remove the project (cascading dependent builds/grants), and record metadata-only deletion audit. [Source](../../src/server/projects/service.ts)
- `projectGrants` — Require manage permission and list granted users/emails/project roles; reading a source alone does not permit inspecting this roster. [Source](../../src/server/projects/service.ts)
- `setProjectGrant` — Require manage and active target workspace membership; insert/update editor/viewer grant or delete for null, then audit access metadata. [Source](../../src/server/projects/service.ts)
- `organizationDetails` — Require tenant admin/owner and return full membership, pending invitation, latest 100 audit events, monthly usage, and effective compile allowance. [Source](../../src/server/workspaces/service.ts)
- `changeOrgMember` — Protect owner/admin roles, enforce capacity for reactivation, update role/state, remove grants and revoke relevant invites when privileges are lost, then audit. [Source](../../src/server/workspaces/service.ts)
- `inviteMember` — Authorize role grant, prevent duplicate active membership, consume tenant send throttle, rotate prior pending invitation, store new token hash/duration, then send outside the transaction. Report created-but-undelivered mail failure. [Source](../../src/server/invitations/service.ts)
- `invitation` — Resolve token hash, lock/re-read tenant and invite, enforce state/expiry/recipient/status. For acceptance, check seats and atomically reactivate/create membership, consume invite, and audit. Return summary. [Source](../../src/server/invitations/service.ts)
- `revokeInvitation` — Require active admin/owner and enforce owner-only administrator-invite revocation. Mark pending token revoked and audit. [Source](../../src/server/invitations/service.ts)
- `beginBuild` — Require compile/matching stored revision; serialize recent running-state and quota checks; mark stale records failed; persist immutable snapshot/running build/audit. Return build ID/source/revision. [Source](../../src/server/builds/service.ts)
- `finishBuild` — Update only a running build with succeeded/failed PDF/log state, clear source snapshot, retain newest PDF/diagnostic records, and remove expired usage counters. Late nonrunning completion is ignored. [Source](../../src/server/builds/service.ts)
- `latestBuild` — Require current project read permission and return at most ten recent metadata/diagnostic records, with hasPdf flag and no binary bytes. [Source](../../src/server/builds/service.ts)
- `artifact` — Resolve build-to-project, require current project read, and return retained PDF Buffer; missing/nonretained artifact is 404. [Source](../../src/server/builds/service.ts)

## src/server/validation.ts

[Implementation](../../src/server/validation.ts)

- `identifier` — Require a UUID using Zod or throw 400; returns validated identifier string. Auth user IDs and invitation token rules have separate contracts.

## Reading guide

Use security chapters for actor/policy/Origin semantics; architecture chapters for locks/transactions; feature chapters for projects/invitations/builds; billing chapters for provider state; compiler chapters for process/isolation. `consume`, `projectContext`, `reconcile`, and other private helpers are internal implementation details explained in those flows, not public APIs.

The database module also exports `pool()` for driver ownership and `closeDatabase()` for clean script/test shutdown. Production services access tables through `db()`/`transaction()`, not the pool.
