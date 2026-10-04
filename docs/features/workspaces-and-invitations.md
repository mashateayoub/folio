# Workspaces, invitations, and project sharing

A workspace is the tenant and billing boundary. Personal initialization locks the user and uses a unique personal-owner column; it creates one sample project. A manually created workspace starts empty and assigns the creator as owner. Ownership creation is limited to ten workspaces.

Organization listings include active/unexpired memberships and effective plans. Suspended organizations may be listed but cannot be entered for protected operations. Projects are read-filtered by current policy. Only admins/owners can inspect the full roster, pending invitations, and audit list.

Invitation creation lowercases the recipient email, accepts admin/member/viewer, and optionally sets membership duration 1–365 days from creation. Only the owner can invite administrators. Invitation expiry itself is always seven days. A new invite revokes earlier pending invites for that tenant/email. Sending is capped at 20 per workspace per minute across application replicas.

The token is 32 random bytes encoded as 64 hex characters; the database stores SHA-256, not the token. Creation commits before email delivery. If SMTP fails, the API reports 502 with the fact that the invitation exists; resend after fixing SMTP to create a fresh token and revoke the old pending invite.

Acceptance requires the same verified email, active workspace, pending/unexpired token that has not been revoked by a membership change, and available seat. It creates/reactivates membership, marks the invite accepted, and audits inside a transaction. The membership expiry was established at invitation creation, so an older invite does not grant a fresh full duration on acceptance. Acceptance is not replayable.

Owners/admins change member role/state; owner seats cannot be removed or demoted. Only owners manage administrator seats. Revocation removes grants and relevant outstanding invitations. Restoration checks capacity when it would restore a valid seat. Membership expiry is enforced separately from state.

Project grants accept the email of an active workspace member and editor/viewer/null; null removes the grant. Permissions remain limited by the workspace seat. Project ownership is not an invitation or grant, and cannot override a viewer seat or expired membership.

## Implementation references

- [src/lib/server/saas.ts](../../src/lib/server/saas.ts)
- [src/lib/server/schemas.ts](../../src/lib/server/schemas.ts)
- [src/components/organization-settings.tsx](../../src/components/organization-settings.tsx)
- [src/components/project-access.tsx](../../src/components/project-access.tsx)
