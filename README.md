# Folio — web LaTeX workspace

Next.js application with verified accounts, multi-tenant workspaces, cloud autosave, project sharing, and an actual Docker-backed LaTeX-to-PDF preview.

## Run the complete app

Requirements: Docker Engine 26+ with Compose v2, and Node.js 22+ / npm for setup. The compiler uses Docker's volume subpath feature.

```sh
npm install
npm run setup
docker compose up -d --build
```

Open **http://localhost:3030**. Create an account, open **http://localhost:8025** to find the verification email, click its link, then sign in. Mailpit captures local verification, invitation, and recovery emails; it does not deliver them externally. On first sign-in, Folio creates a personal workspace and a sample multi-file project. Open its project row to start editing and compiling.

The setup command creates private random credentials in `.env.local` and preserves existing credentials. Never commit this file. Docker starts PostgreSQL, Mailpit, the compiler service, and the web application; database migrations run automatically. Projects and accounts persist in the PostgreSQL Docker volume. `docker compose down` stops the stack while preserving data. Avoid `down -v` unless you intend to erase volumes.

The local stack binds only to loopback. Default ports are 3030 (web), 8025 (mailbox), 1025 (SMTP), and 55432 (PostgreSQL). The compiler has no published port. To change the web port, set matching shell variables `FOLIO_PORT` and `FOLIO_APP_URL` before starting Compose; for example 3031 and `http://localhost:3031`.

## Develop without rebuilding containers

```sh
npm run setup
docker compose up -d postgres mailpit
docker build -t folio-tex:local -f infra/Dockerfile.compiler .
npm run db:migrate
```

Set `APP_URL=http://127.0.0.1:3001` in `.env.local`. In two terminals:

```sh
npm run compiler
```

```sh
npm run dev -- --port 3001
```

Open http://127.0.0.1:3001. Local compiler listens on 4100. If you change credentials after PostgreSQL was initialized, changing `.env.local` alone does not change the database password: update the existing database credentials deliberately.

Impeccable live mode uses a development-only injection slot in the root layout. Its configuration targets that slot inside `NODE_ENV === "development"`; production renders exclude the helper. Live session files and review captures are excluded from the Docker build context.

## What works

- Email/password registration with mandatory verification, password recovery, database sessions, sign-out, password changes, and revocation of other sessions.
- Optional authenticator-based two-factor authentication and one-time recovery codes, configured in Account settings.
- Multiple workspaces, invitations bound to the recipient's verified email, expiring memberships, role changes, and revocation.
- Owner/admin/member/viewer workspace roles and editor/viewer project grants. Authorization runs on every protected server operation, including PDF downloads.
- Private or workspace-visible projects, archive/unarchive, deletion, and metadata-only audit events.
- Multi-file CodeMirror editing, highlighting/search/undo, root selection, path validation, source ZIP export, templates, resizable panels, and mobile source/preview tabs.
- Database autosave with revision checks, retries for transient failures, and a conflict state that stops editing before overwriting another session.
- Real PDF compilation after a typing pause or on demand, persisted results, PDF.js viewing/download, and diagnostics that preserve the last successful preview.
- Opt-in import of projects from the previous browser-storage version into the signed-in workspace.
- Enforced free/team quotas for seats, projects, and monthly compilations, plus authentication/invitation/build throttling. Paid access is derived from verified Stripe subscriptions and expires with its confirmed subscription period.

## Authorization model

The reusable policy is in `src/lib/policy.ts`; server resource resolution and enforcement are in `src/lib/server/saas.ts`. Identity is obtained from the database session, never from a user ID in request JSON. The project determines its workspace, and the server checks current membership and grants.

| Role / grant | Read | Edit / compile | Manage / delete |
| --- | --- | --- | --- |
| Workspace owner/admin | All workspace projects | Active projects | All workspace projects |
| Member who owns project | Own project | Active own project | Own project |
| Member with editor grant | Granted project | Active granted project | No |
| Member with viewer grant | Granted project | No | No |
| Member without grant | Workspace-visible projects | No | No |
| Viewer workspace seat | Visible/granted/owned projects | No, even with editor grant | No |

Attribute checks also require a verified enabled account, matching tenant, active organization, and active unexpired membership. Archived projects are readable but cannot be saved or compiled. Only owners can appoint or remove administrators; owners cannot demote/revoke themselves. Revocation removes project grants and pending invitations created by that member. Only administrators can view the roster and audit feed.

Invitations contain a random token whose SHA-256 hash is stored in the database; links expire after seven days and cannot be replayed after acceptance. Membership duration is separately enforced. JSON schemas reject attempts to set tenant, owner, plan, or role through source-save endpoints. Mutation routes require a matching Origin. Private API responses and artifacts use `Cache-Control: no-store`.

Compile requests refer to a stored project revision. The server checks compile permission, captures an immutable source snapshot, calls the private compiler, stores the result, and rechecks the session and project access before returning it. Artifact downloads independently check current read permission. Docker builds have no network, a read-only root filesystem, dropped capabilities, a non-root compiler user, disabled shell escape and project RC files, and bounded time, memory, process count, and output. The service retains the latest three successful PDFs and ten recent diagnostic records per project.

## Interface

The rebuilt interface uses self-hosted Satoshi, warm document surfaces, graphite navigation, and a muted vermilion accent. Projects support title search, private/shared/archive filters, and alphabetical sorting. The editor keeps source and PDF within the viewport; on mobile, switch tabs or toggle the file panel. Account, team, invitation, and access screens share the same controls and feedback. Authentication animation respects reduced motion. See [DESIGN.md](./DESIGN.md) for the interface system.

## Workspace billing

Free includes 40 projects, 5 active members, and 1,000 compilation requests per UTC calendar month. Team includes 100 projects, 100 active members, and 20,000 requests. A monthly subscription covers one workspace. The UI displays the actual configured Stripe Price; no public price is hardcoded.

Configure these server-only values in `.env.local`:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_TEAM_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Optional explicit customer portal configuration:
STRIPE_PORTAL_CONFIGURATION_ID=bpc_...
```

Use a Sandbox monthly, fixed, per-unit licensed Price with a positive amount and quantity one. Activate the customer portal in Stripe's Sandbox settings; enable invoice history, payment method updates, and subscription cancellation. For this two-plan catalog, disable price/quantity changes in the portal. Use a dedicated portal configuration if the Stripe account also serves other applications. Configure live mode separately before accepting real payments.

Apply the migration with `npm run db:migrate`. Migration 002 resets the previous unverified placeholder plans to Free; existing projects and memberships are retained. Restart the web app after changing environment values; Compose requires `docker compose up -d --build web` to recreate its environment.

Forward local snapshot events using the [Stripe CLI](https://docs.stripe.com/webhooks#local-listener):

```sh
stripe login
npm run billing:listen
# For the Next.js development server instead of Compose:
STRIPE_FORWARD_URL=http://127.0.0.1:3001/api/billing/webhook npm run billing:listen
```

For Compose, forward to `http://localhost:3030/api/billing/webhook`. The helper uses the configured application API key when present, avoiding dependence on an expiring CLI login. It saves the listener's signing secret privately in `.env.local` without printing it. Restart the web app after the helper reports readiness; keep the listener running while testing. In production, register the HTTPS `/api/billing/webhook` endpoint. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`, and `invoice.payment_action_required`. The installed SDK uses API version `2026-09-30.endive`. Events only supply the customer identifier; entitlement state is fetched from Stripe through this version rather than trusting an event's potentially stale subscription snapshot.

Open **Plans & billing** from the workspace navigation. All active members can see plans and usage; only the owner can open checkout, access the customer portal, or request provider reconciliation. Checkout accepts only the Team plan identifier and uses a server-fixed price, customer, quantity, and return URL. The success redirect never grants paid access. Customer and checkout creation use stable idempotency keys; an existing unpaid subscription must be repaired in the portal rather than purchasing another one.

Webhooks verify the signature against bounded, unmodified request bytes with the SDK's timestamp tolerance. Receipt insertion, subscription state, plan changes, and audit events commit atomically; failed processing remains retryable. Per-workspace locks serialize these writes with quota actions. Duplicate events are ignored; delayed events fetch current state. Active/trialing matching subscriptions with a future period end receive Team limits. Past-due, unpaid, paused, canceled, unknown-price, mismatched, or conflicting subscriptions receive Free limits. Scheduled cancellation retains paid access through the confirmed period. Downgrades retain projects and members, allow existing edits, and restrict additional capacity and compilation requests. Pending invitations do not reserve seats; acceptance and restoration enforce current limits.

Run `npm run billing:reconcile` periodically (for example every five minutes) from a process with the same server environment and database access to recover missed events and renewals. In the web container, use `docker compose exec web npm run billing:reconcile:container`. Owners can also use **Refresh status**. Reconciliation errors produce a nonzero exit code for monitoring. Expired paid entitlements fall back to Free even if webhook delivery stops.

`npm run billing:check` verifies the configured monthly price and portal features. `npm run test:billing` exercises the service against real PostgreSQL with a controlled Stripe substitute; `npm test` verifies signature rejection and entitlement rules. `npm run test:stripe` exercises real Sandbox hosted checkout, signed delivery and replay rejection, the customer portal, scheduled and immediate cancellation, and Test Clock renewal, payment failure, and recovery. Both real Stripe acceptance tests passed against Compose. They require the CLI listener, matching signing secrets, and installed Chrome; they refuse live prices and clean up their disposable resources. Scheduled cancellation records Stripe's explicit `cancel_at` date as well as its period-end flag, and paid access expires at the earlier cancellation or period end. Live-mode deployment remains separate.

## Checks

Anti-slop is installed at `tools/oxlint/anti-slop/` with matching, pinned `oxlint` and `@oxlint/plugins` versions 1.86.0. All 19 generic rules are enabled at error severity in `.oxlintrc.json`. `npm run lint` runs ESLint followed by anti-slop; either can also run independently with `npm run lint:eslint` or `npm run lint:anti-slop`. The latter loads TypeScript with `tsx` for Node 20. TypeScript permits explicit `.ts` imports under the existing `noEmit` configuration. Effect rules are not enabled because this app has no direct Effect dependency.

The installation baseline had **752 findings across 80 source files**. All are now resolved, with every rule still enabled. Cleanup replaced unchecked response casts with Zod response schemas, introduced a typed billing provider contract and `CloudError`, removed chained assertions, typed database results and audit metadata, and made conditional property additions explicit. ESLint, anti-slop, and TypeScript pass. `npm run format` applies the pinned Prettier formatter; `npm run format:check` checks formatting. Repeated fix/format passes are stable. The original diagnostics remain in `tools/oxlint/anti-slop/INSTALL_DIAGNOSTICS.txt` as a historical baseline; source identity and a recoverable pristine snapshot are recorded beside the plugin in `UPSTREAM.md` and `PRISTINE.tar.gz`.

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:compiler
npm run test:saas
npm run test:billing
npm run test:browser
npm run build
```

Integration tests require the development web/DB/mailbox/compiler services above and use disposable `example.test` accounts. They exercise verified signup, tenant isolation, privilege escalation rejection, revision conflicts, invitations, viewer restrictions, archive/suspension/expiry/revocation, real PDF authorization, quotas, MFA, and password-reset session revocation. The nine browser workflows cover durable editing, preview/error recovery, files/export, mobile layout and file toggles, stale builds, conflicting tabs, project search/filtering, account/team navigation, billing plans and usage, and sign-out/sign-in. Screenshots are written to `test-results/`. Rate limits remain enabled during tests; allow a minute between repeated signup-heavy suites if throttled.

Install the Playwright browser once with `npx playwright install chromium`. Alternatively, use installed Chrome: `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`. To test Compose instead of dev, use `SAAS_TEST_URL=http://localhost:3030 npm run test:saas` or `PLAYWRIGHT_BASE_URL=http://localhost:3030 npm run test:browser`.

## Hosting and remaining work

Compose is a local environment. For public hosting, configure a real HTTPS `APP_URL`, persistent PostgreSQL with exercised backups, production SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`), and private compiler connectivity with matching `COMPILER_TOKEN`. Keep `ALLOW_INSECURE_LOCAL_DEV` unset in production. Database migrations must run before traffic. The compiler supervisor's Docker socket grants host-level privileges; run it on a dedicated worker host and validate sandbox isolation before accepting public untrusted documents.

This implementation is a functional SaaS foundation. Simultaneous collaborative editing, WebSocket presence, durable offline drafts, assets, ZIP import, revision history, SyncTeX, queued builds/cancellation, external object storage, and production load/restore acceptance remain on the roadmap. Edits pending during a failed save stay in the open tab, with an unload guard; closing the tab can lose them. Revision conflicts require reloading, so export a source ZIP to preserve conflicting edits first.

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md), [TASKS.md](./TASKS.md), and the [Better Auth documentation](https://www.better-auth.com/docs/introduction) for the underlying identity library.
