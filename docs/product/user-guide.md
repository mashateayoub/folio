# User guide

## Accounts

Register, verify through the emailed link, and sign in. Local mail is in Mailpit at port 8025. Password recovery sends a reset link. Account settings supports password changes, revoking other sessions, enabling/disabling authenticator-based MFA, and obtaining recovery codes. Keep recovery codes privately; they are not project data.

## Workspaces and project library

The workspace selector switches tenants after flushing edits. Create a workspace with a name up to 80 characters. The library supports title search, private/shared/archive filters, and alphabetical sorting. Visibility is distinct from edit permission: workspace-visible projects are readable by active members without automatically making them editors.

Choose article, report, or blank to create a project. New projects consume the workspace's project allowance. Archive preserves the project and disables source edits/compilation; it still counts toward project capacity. Deletion removes database project/build/grant records.

## Writing

Open a project, edit its files, and select the `.tex` root. Create, rename, or delete supported source files. When renaming, update LaTeX references yourself. File paths must be relative and use supported characters/extensions. Autosave happens after a short pause; monitor its status. A conflict means another session saved first: export your local sources before reloading if you need to keep them.

Use Compile or Ctrl/Command+Enter for manual compilation. Auto compile waits after typing and compiles the saved source revision. On errors, read the diagnostic panel; the last successful PDF remains visible. Preview controls provide pagination and zoom. Source ZIP export and PDF download save local copies.

On small screens switch between source and preview tabs and toggle the file panel. The desktop separator resizes panels. The interface exposes only permitted actions, while server checks remain authoritative.

## Sharing and billing

Owners/admins invite verified email addresses through Team settings. Optional membership duration is separate from the seven-day invitation expiry. Project Access grants editor/viewer permissions to active workspace members. Viewer seats stay read-only regardless of project grants. The owner manages checkout/cancellation in Plans & billing; other active members can see plan and usage.

Legacy browser projects may be imported through the offered migration control. This is an opt-in import of the earlier `folio.projects.v1` localStorage format, not arbitrary ZIP import.

See [permissions](../security/authorization.md), [source limits](../features/projects.md), and [billing](../billing/plans.md) for precise limits and rules.

## Implementation references

- [src/features/editor/components/workspace.tsx](../../src/features/editor/components/workspace.tsx)
- [src/features/account/components/account-settings.tsx](../../src/features/account/components/account-settings.tsx)
- [src/features/projects/components/project-access.tsx](../../src/features/projects/components/project-access.tsx)
- [src/features/projects/components/project-library.tsx](../../src/features/projects/components/project-library.tsx)
