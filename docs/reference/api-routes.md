# Application API routes

Routes are implemented under `src/app/api`. Dynamic route params are asynchronous. IDs denoted `:id` are UUIDs except auth user IDs, which are text. Invitation `:token` is 64 lowercase hex characters. Auth endpoints use library conventions; application endpoints use Folio's strict schemas.

Protected application requests need a current verified, enabled session. Every listed mutation except the webhook also needs matching Origin. JSON defaults to no-store. Success is 200 unless the table specifies 201. State-changing DELETE responses are `{success:true}`, not 204.

| Method and path                                           | Input                                   | Success payload                                      | Permission / effects                                 |
| --------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| GET `/api/organizations`                                  | None                                    | Organization[]                                       | Actor; ensures personal workspace                    |
| POST `/api/organizations`                                 | `{name}`                                | Organization, 201                                    | Actor; max ten owned workspaces                      |
| GET `/api/organizations/:id`                              | Tenant UUID                             | Organization details, roster, invites, audits, usage | Owner/admin                                          |
| PATCH `/api/organizations/:id/members/:userId`            | `{role,state}`                          | `{success:true}`                                     | Owner/admin with protected administrator/owner rules |
| POST `/api/organizations/:id/invitations`                 | `{email,role,expiresInDays?}`           | `{id}`, 201                                          | Owner/admin; only owner invites admin                |
| DELETE `/api/organizations/:id/invitations/:invitationId` | IDs                                     | `{success:true}`                                     | Owner/admin with admin-invite protection             |
| GET `/api/invitations/:token`                             | Token                                   | Invitation summary                                   | Matching verified recipient; pending/unexpired       |
| POST `/api/invitations/:token`                            | Token, no required JSON body            | Accepted invitation summary                          | Matching recipient; consumes token, checks capacity  |
| GET `/api/projects?organizationId=<UUID>`                 | Required query                          | Authorized CloudProject[]                            | Active membership; policy-filtered                   |
| POST `/api/projects`                                      | `{organizationId,template}`             | CloudProject, 201                                    | Active non-viewer membership; capacity               |
| POST `/api/projects/import`                               | `{organizationId,project}`              | CloudProject, 201                                    | Same creation policy; new project ID                 |
| GET `/api/projects/:id`                                   | Project UUID                            | CloudProject                                         | Current read permission                              |
| PUT `/api/projects/:id`                                   | `{project,expectedRevision}`            | CloudProject with incremented revision               | Current write permission; compare-and-swap           |
| DELETE `/api/projects/:id`                                | UUID                                    | `{success:true}`                                     | Delete permission; cascades builds/grants            |
| PATCH `/api/projects/:id/settings`                        | `{visibility?,state?}`                  | CloudProject                                         | Manage; at least one setting                         |
| GET `/api/projects/:id/members`                           | UUID                                    | Project grant records                                | Manage                                               |
| PUT `/api/projects/:id/members`                           | `{email,role}`                          | `{success:true}`                                     | Manage; active target member; null removes grant     |
| GET `/api/projects/:id/builds`                            | UUID                                    | Up to ten recent records                             | Read; hasPdf flag rather than binary bytes           |
| POST `/api/compile`                                       | `{projectId,revision}`                  | `{buildId,revision,pdfUrl}`                          | Compile; stored snapshot, quotas, result recheck     |
| GET `/api/builds/:id/pdf`                                 | Build UUID                              | Binary application/pdf                               | Current project read permission; retained artifact   |
| GET `/api/organizations/:id/billing`                      | UUID                                    | Billing summary                                      | Active membership                                    |
| POST `/api/organizations/:id/billing/checkout`            | Exactly `{plan:"team"}`                 | `{url}`                                              | Owner; fixed server-side catalog/customer            |
| POST `/api/organizations/:id/billing/portal`              | Exactly `{}`                            | `{url}`                                              | Owner with customer binding                          |
| POST `/api/organizations/:id/billing/sync`                | Exactly `{}`                            | Billing summary                                      | Owner; provider reconciliation first                 |
| POST `/api/billing/webhook`                               | Exact provider bytes + Stripe-Signature | `{received:true}`                                    | Signature, not session/Origin                        |
| GET/POST `/api/auth/*`                                    | Better Auth endpoint-specific           | Library response                                     | Delegated auth/session/plugin handler                |

Core JSON body cap is 1,000,000 bytes. Organization creation, settings/grants/members/invites, compile, and billing mutations use compact 4096-byte limits where set in their handlers. Import/save source use the default cap. Bodyless invitation acceptance and DELETE handlers do not use jsonBody.

There is no organization DELETE/update/suspend route, account-disable admin route, arbitrary subscription/price selector, public artifact share token, file-upload route, collaborative stream, or queue-cancel route. [Contracts](contracts.md) define request fields; [errors](errors.md) defines failure status semantics.

## Auth endpoints used by this app

The UI calls the Better Auth client for email signup/sign-in, sign-out, verification resend, request/reset password, password change, other-session revocation, two-factor enable/disable, TOTP setup/verification, and backup-code verification. The wildcard handler forwards GET/POST to the installed library. Its complete generated API is version-dependent; consult the installed library before adding endpoints rather than assuming Folio wrote those handlers. The SaaS test shows exercised HTTP calls and response shapes.

## Implementation references

- [src/lib/server/schemas.ts](../../src/lib/server/schemas.ts)
- [src/app/api/auth/[...all]/route.ts](../../src/app/api/auth/[...all]/route.ts)
- [src/lib/auth-client.ts](../../src/lib/auth-client.ts)
- [tests/saas.integration.ts](../../tests/saas.integration.ts)

## Route source inventory

| Pattern                                              | Exported methods | Source                                                                               |
| ---------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------ |
| `/api/auth/[...all]`                                 | GET, POST        | [route.ts](../../src/app/api/auth/[...all]/route.ts)                                 |
| `/api/billing/webhook`                               | POST             | [route.ts](../../src/app/api/billing/webhook/route.ts)                               |
| `/api/builds/[id]/pdf`                               | GET              | [route.ts](../../src/app/api/builds/[id]/pdf/route.ts)                               |
| `/api/compile`                                       | POST             | [route.ts](../../src/app/api/compile/route.ts)                                       |
| `/api/invitations/[token]`                           | GET, POST        | [route.ts](../../src/app/api/invitations/[token]/route.ts)                           |
| `/api/organizations/[id]/billing/checkout`           | POST             | [route.ts](../../src/app/api/organizations/[id]/billing/checkout/route.ts)           |
| `/api/organizations/[id]/billing/portal`             | POST             | [route.ts](../../src/app/api/organizations/[id]/billing/portal/route.ts)             |
| `/api/organizations/[id]/billing`                    | GET              | [route.ts](../../src/app/api/organizations/[id]/billing/route.ts)                    |
| `/api/organizations/[id]/billing/sync`               | POST             | [route.ts](../../src/app/api/organizations/[id]/billing/sync/route.ts)               |
| `/api/organizations/[id]/invitations/[invitationId]` | DELETE           | [route.ts](../../src/app/api/organizations/[id]/invitations/[invitationId]/route.ts) |
| `/api/organizations/[id]/invitations`                | POST             | [route.ts](../../src/app/api/organizations/[id]/invitations/route.ts)                |
| `/api/organizations/[id]/members/[userId]`           | PATCH            | [route.ts](../../src/app/api/organizations/[id]/members/[userId]/route.ts)           |
| `/api/organizations/[id]`                            | GET              | [route.ts](../../src/app/api/organizations/[id]/route.ts)                            |
| `/api/organizations`                                 | GET, POST        | [route.ts](../../src/app/api/organizations/route.ts)                                 |
| `/api/projects/[id]/builds`                          | GET              | [route.ts](../../src/app/api/projects/[id]/builds/route.ts)                          |
| `/api/projects/[id]/members`                         | GET, PUT         | [route.ts](../../src/app/api/projects/[id]/members/route.ts)                         |
| `/api/projects/[id]`                                 | GET, PUT, DELETE | [route.ts](../../src/app/api/projects/[id]/route.ts)                                 |
| `/api/projects/[id]/settings`                        | PATCH            | [route.ts](../../src/app/api/projects/[id]/settings/route.ts)                        |
| `/api/projects/import`                               | POST             | [route.ts](../../src/app/api/projects/import/route.ts)                               |
| `/api/projects`                                      | GET, POST        | [route.ts](../../src/app/api/projects/route.ts)                                      |
