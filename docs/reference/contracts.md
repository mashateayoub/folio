# Input and response contracts

Server inputs use Zod and reject unknown keys where `.strict()` is present. Client-facing cloud responses use `responses` schemas and reject unusable payloads before state updates. A TypeScript DTO alone is not runtime validation.

| Input              | Accepted fields / constraints                                               |
| ------------------ | --------------------------------------------------------------------------- |
| Project creation   | organizationId UUID; template article/blank/report                          |
| Project import     | organizationId UUID; strict canonical source project                        |
| Project save       | strict canonical source project; expectedRevision positive integer          |
| Project attributes | optional visibility private/workspace, state active/archived; at least one  |
| Project grant      | valid lowercased email; role editor/viewer/null                             |
| Workspace creation | name trimmed 1–80 characters                                                |
| Invitation         | lowercased email; role admin/member/viewer; optional duration integer 1–365 |
| Membership change  | role admin/member/viewer and state active/revoked                           |
| Build              | projectId UUID; positive integer revision                                   |
| Checkout           | literal Team plan only                                                      |
| Portal/sync        | empty strict object                                                         |

Canonical source: `{id,title,rootFile,files:[{id,path,content}]}`. Path/byte/root uniqueness rules are in [projects](../features/projects.md). Cloud source adds `{revision,organizationId,ownerId,visibility,state,permissions}`; permissions has exactly the read/write/compile/manage/delete boolean contract consumed by the UI.

Organization response: `{id,name,role,status,plan}`. Team details include organization, member records (userId/name/email/role/state/nullable validUntil), invitation records, activity events (nullable actor), current monthly usage, and compileLimit. Dates in JSON are strings, while PostgreSQL row dates can be Date objects internally.

Billing summary includes organization ID/name/effective plan; canManage; hasCustomer; subscription status, nullable periodEnd/cancelAt, cancelAtPeriodEnd; projects/seats/compiles usage and limits; both named plan capacities; optional actual amount/currency/interval; checkoutAvailable and portalAvailable. Provider customer/subscription IDs are not exposed. Build lists include additional server diagnostic fields; the current browser validates ID/revision/hasPdf used to restore previews.

`cloud(url,schema,options)` fetches same-origin data with JSON Content-Type and no-store. It parses JSON as unknown, extracts a validated error message on non-2xx, otherwise validates the selected response schema. HTTP errors become CloudError with the original status. Malformed successful responses become status 502 with an invalid-response message. No successful unchecked generic cast remains.

Most response object schemas strip unknown fields rather than rejecting them, allowing additional server metadata while preserving the fields the client understands. Strictness at mutation input is a separate defense. `responses.json` is used when only a JSON acknowledgement is needed, not to claim a detailed contract.

BillingProvider describes only consumed operations/fields. Stripe's actual SDK structurally satisfies it; fixture providers do too. Entitlement fixtures must provide their needed subscription fields without pretending to be every SDK field. [Source references](domain-services.md) maps exported domain entry points.

## Implementation references

- [src/server/validation.ts](../../src/server/validation.ts)
- [src/shared/contracts/api-responses.ts](../../src/shared/contracts/api-responses.ts)
- [src/shared/http/cloud-client.ts](../../src/shared/http/cloud-client.ts)
- [src/server/billing/provider.ts](../../src/server/billing/provider.ts)

## Example request bodies

Identifiers below are placeholders in valid UUID form; replace them with resources your current verified session can access. Application mutations also require the configured Origin and session cookie. These are HTTP payload examples, not commands to execute against someone else's tenant.

Create an article:

```json
{
  "organizationId": "11111111-1111-4111-8111-111111111111",
  "template": "article"
}
```

Save revision 1 of a minimal project (server path ID must match source ID):

```json
{
  "expectedRevision": 1,
  "project": {
    "id": "22222222-2222-4222-8222-222222222222",
    "title": "Example paper",
    "rootFile": "main.tex",
    "files": [{ "id": "main", "path": "main.tex", "content": "Hello" }]
  }
}
```

Source validation checks source structure and supported paths, not LaTeX semantic validity; the illustrative `Hello` above saves but needs a real document preamble/environment to compile.

Change archive state: `{"state":"archived"}`. Grant access: `{"email":"writer@example.test","role":"editor"}`; remove it with role null. Invite a 30-day member: `{"email":"writer@example.test","role":"member","expiresInDays":30}`. Compile the saved project: `{"projectId":"22222222-2222-4222-8222-222222222222","revision":2}`. Checkout uses only `{"plan":"team"}`; portal/sync use `{}`.

A successful compile returns a build UUID, the submitted saved revision, and a relative `/api/builds/<UUID>/pdf` URL. A failure may provide diagnostic log/buildId. Do not treat a return query parameter, frontend checkbox, or unsigned request plan as a paid/permission authority.
