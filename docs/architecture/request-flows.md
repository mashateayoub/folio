# End-to-end request flows

## Page load

`GET /` reads asynchronous request headers, resolves the actor, and redirects missing/unverified actors to sign-in. `organizations()` ensures a personal workspace, lists active/unexpired memberships, and computes effective plans. The first active workspace supplies server-authorized projects to the client Workspace component. Settings pages independently authenticate and check their required membership.

## Source save

```mermaid
sequenceDiagram
  participant UI as Browser
  participant API as Project PUT
  participant SQL as PostgreSQL
  UI->>API: project + expectedRevision
  API->>API: Origin, actor, strict schema
  API->>SQL: Resolve tenant and lock organization
  API->>SQL: Authorize write; compare revision
  API->>SQL: UPDATE source WHERE revision matches
  SQL-->>API: New revision + current permissions
  API-->>UI: Validated CloudProject
```

The UI only advances its acknowledged revision after success. A revision conflict does not overwrite server source. Transient errors retain in-tab edits and expose retry.

## Compile

The UI flushes autosave before sending `{projectId, revision}`. The server captures stored source in a running build record after permission, concurrency, and quota checks. The private compiler receives that immutable snapshot. A PDF result is size/header-validated and persisted, then current identity/access is checked again. PDF GET repeats authorization. The UI rejects a completion if source or request generation changed meanwhile.

## Join workspace

An administrator creates a random invitation token, stores its hash and email-bound role/expiry, and sends a link. Acceptance requires the matching verified account, a still-pending unexpired invitation, active workspace, and available seat under lock. Acceptance updates the membership and consumes the invitation atomically.

## Upgrade

The owner requests a server-configured Team checkout. Stable idempotency seeds are committed before remote creation. Checkout redirect does not grant Team. A valid webhook signature identifies an event; its customer maps to a database tenant. Under tenant lock, the server fetches current Stripe state and atomically records receipt, entitlement, and audit. See [checkout](../billing/checkout-and-portal.md) and [webhooks](../billing/webhooks.md).

## Implementation references

- [src/app/page.tsx](../../src/app/page.tsx)
- [src/features/editor/hooks/use-project-persistence.ts](../../src/features/editor/hooks/use-project-persistence.ts)
- [src/app/api/compile/route.ts](../../src/app/api/compile/route.ts)
- [src/server/billing/service.ts](../../src/server/billing/service.ts)
