# Screens and component responsibilities

| Screen / component        | Responsibility                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Root layout / Brand       | Self-hosted typography, metadata, brand mark, development tooling slot                             |
| AuthScreen / AuthSpecimen | Five account modes and reduced-motion-aware writing specimen                                       |
| Workspace                 | Project/library navigation, source editing, compile state, mobile tabs, dialogs, ZIP/PDF downloads |
| ProjectLibrary            | Search/filter/sort, project rows, workspace/billing navigation                                     |
| SourceEditor              | CodeMirror instance, per-file state cache, source limits, readonly state, compile shortcut         |
| PdfPreview                | Dynamic PDF.js load, worker, canvas render, zoom/pagination/resize/cancellation                    |
| useProjectPersistence     | Dirty source, serial acknowledgement, conflict/retry state, flush-before-navigation                |
| SettingsShell             | Shared account/team/billing navigation and page frame                                              |
| AccountSettings           | Password/session/MFA operations                                                                    |
| OrganizationSettings      | Invite form, roster role/state controls, audit and monthly usage                                   |
| ProjectAccess             | Visibility/archive, project grants, deletion confirmation                                          |
| InvitationScreen          | Load and accept the email-bound workspace invitation                                               |
| BillingSettings           | Current plan, usage comparison, owner checkout/portal, refresh and return polling                  |

Server pages at `/`, `/settings`, `/organizations/[id]`, and `/organizations/[id]/billing` authenticate independently before rendering client components. Auth pages share AuthScreen; the invitation page preserves a validated invitation destination across sign-in. [Route reference](../reference/api-routes.md) lists API entry points; [repository inventory](../reference/repository.md) maps every file.

State is mostly React hooks; no global Redux-like store is installed. Source dirty tracking and current compile metadata use refs where callback stability matters. EditorView owns text while mounted; changing files restores cached state, while permission changes can reconstruct readonly state. The intentional editor effect dependency choice is documented in source.

The workspace is currently a large orchestration component. Further extraction should preserve flush semantics, stale-build rejection, per-file undo, keyboard access, and mobile layout. Tests exercise those behaviors, not just component snapshots.

## Implementation references

- [src/features/editor/components/workspace.tsx](../../src/features/editor/components/workspace.tsx)
- [src/features/editor/components/source-editor.tsx](../../src/features/editor/components/source-editor.tsx)
- [src/features/editor/components/pdf-preview.tsx](../../src/features/editor/components/pdf-preview.tsx)
- [src/components/shared/settings-shell.tsx](../../src/components/shared/settings-shell.tsx)
