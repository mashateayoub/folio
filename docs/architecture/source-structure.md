# Source structure and import boundaries

Folio uses Next.js App Router with feature-oriented UI and domain-oriented server services. URLs and route filenames stay in `src/app`; reusable product code lives outside the route tree.

```text
src/
  app/                 pages, layouts, route handlers, fonts, global CSS
  components/shared/   brand and settings frame shared across features
  features/
    auth/              auth screens and browser auth client
    account/           account settings
    editor/            workspace, CodeMirror, PDF preview, persistence hook
    projects/          project library, sharing UI, source model/templates
    workspaces/        workspace settings
    invitations/       invitation screen
    billing/           billing settings and shared plan definitions
    access-control/    pure role/attribute policy
  shared/
    contracts/         runtime-validated API response contracts
    http/              typed browser fetch client and errors
    types/             shared wire/domain types
  server/
    database/          pooled Drizzle client and typed PostgreSQL schema
    auth/              Better Auth with Drizzle adapter
    access/            current tenant/membership/project authorization
    projects/          project CRUD, optimistic revisions, grants
    workspaces/        workspace creation, roster, membership changes
    invitations/       invitation creation, acceptance, revocation
    builds/            admission, artifacts, completion, retention
    usage/             atomic bounded quota consumption
    audit/             metadata-only audit writes
    billing/           Stripe provider contracts and lifecycle services
    config.ts          environment validation
    http.ts            HTTP adapters and request/session/origin validation
    validation.ts      request schemas
    mail.ts            SMTP transport
```

## Dependency direction

Pages compose feature components and obtain server data. API handlers validate the request and call a domain service. Client features use shared contracts and pure domain models; they do not import server modules. Server services use models, schema, and other server services; they do not import components or hooks. ESLint enforces those two boundaries.

Use explicit imports such as `@/server/projects/service` and `@/features/projects/model`. There is no global services barrel or compatibility `saas.ts` facade. The database schema index is an intentional schema aggregation for Drizzle and its auth adapter.

The editor workspace remains the feature orchestration component. Its persistence hook owns autosave/CAS behavior, CodeMirror owns text editing, and PDF.js owns rendering. Moving code does not introduce extra client providers or change route URLs.

## Server data access

[Drizzle and migrations](../data/orm.md) explains the schema, query builder, parameterized SQL, row locks, transactions, and fresh-install compatibility. Shared authorization helpers reside in `server/access/context.ts`; project, workspace, invitation, build, quota, audit, and billing services own their respective operations.

No low-level pool queries remain in application services. `pg` is the underlying Drizzle connection driver. Direct `pg` usage in some acceptance fixtures is deliberately independent of the production access layer.

## Maintenance

Add UI within its feature folder, pure domain types/models alongside the feature or in shared types, and server operations under their domain service. Keep route handlers small. Auth schema changes require reviewed SQL migrations alongside typed model changes. Update chapter links and repository inventory when files move.

## Implementation references

- [Database client](../../src/server/database/client.ts)
- [Authorization context](../../src/server/access/context.ts)
- [Project service](../../src/server/projects/service.ts)
- [Workspace service](../../src/server/workspaces/service.ts)
- [Invitation service](../../src/server/invitations/service.ts)
- [Build service](../../src/server/builds/service.ts)
- [Import boundary lint rules](../../eslint.config.mjs)
