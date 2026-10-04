# RBAC, ABAC, and tenant isolation

RBAC selects abilities from workspace owner/admin/member/viewer roles and optional editor/viewer project grants. ABAC additionally evaluates actor verification/disabled state, resource tenant, membership identity/state/expiry, organization status, ownership, visibility, and project archive state. The implementation is a pure policy function plus server resource resolution, not an external policy engine.

Before any project action, the policy requires an enabled verified actor, active organization, active membership, matching user/tenant IDs, and a future expiry when present. Read visibility then requires administrator status, project ownership, a project grant, or workspace visibility.

| Seat / relationship               | Read visible project | Write / compile active project | Manage / delete visible project |
| --------------------------------- | -------------------- | ------------------------------ | ------------------------------- |
| Owner/admin                       | All tenant projects  | Yes                            | Yes                             |
| Member owns project               | Yes                  | Yes                            | Yes                             |
| Member has editor grant           | Yes                  | Yes                            | No                              |
| Member has viewer grant           | Yes                  | No                             | No                              |
| Member, workspace visibility only | Yes                  | No                             | No                              |
| Viewer seat, any ownership/grant  | If visible           | Never                          | Never                           |

Archive is checked after manage/delete: archived resources remain manageable/deletable by permitted owners/admins, but cannot be saved or compiled. A grant cannot elevate a viewer seat. Workspace visibility grants reading, not editing.

`projectContext()` resolves the project's organization from PostgreSQL, locks that tenant, re-reads current resource state, retrieves the actor's grant, and evaluates policy. Read failures commonly return 404 to avoid exposing other tenants' resource existence; denied actions on readable resources return 403. UI permission flags are convenience data and never replace server evaluation.

Only owner/admin can inspect roster/audit or invite members. Only the owner can manage administrator seats/invitations and billing mutations. The owner cannot be demoted or revoked. Revoking a member deletes their project grants; revocation or loss of administrator status also revokes pending invitations they created. Restoring membership does not silently recreate removed grants.

Membership restoration and invitation acceptance check current seat capacity under tenant lock. Expired seats do not become valid simply by toggling state. PDF access resolves its build's project and repeats read policy. Compile results recheck identity/access after the potentially long compiler request.

There is no database RLS, owner-transfer endpoint, or general policy DSL. Tests cover the decision matrix and server attempts at escalation.

## Implementation references

- [src/lib/policy.ts](../../src/lib/policy.ts)
- [src/lib/server/saas.ts](../../src/lib/server/saas.ts)
- [tests/policy.test.ts](../../tests/policy.test.ts)
- [tests/saas.integration.ts](../../tests/saas.integration.ts)
