# Source projects, templates, import, and export

The canonical `Project` is inferred from `projectSchema`. It contains `id`, trimmed title (1–100 characters), relative `rootFile`, and 1–30 files. Each file has a nonempty ID, path up to 160 characters, and content up to 200,000 characters. Aggregate source is limited to 600,000 UTF-8 bytes. The browser additionally limits edits against remaining byte allowance before producing invalid state.

Only `.tex`, `.bib`, `.sty`, and `.cls` are accepted. Each path segment starts with an alphanumeric character and continues with alphanumerics, underscore, dot, or hyphen. `output/` is reserved. Root must be an existing `.tex` file. Paths and IDs are unique; a source file cannot also be the parent of another path.

`CloudProject` adds numeric revision, organization ID, owner ID, visibility (`private`/`workspace`), state (`active`/`archived`), and the five action permissions. Server source saves accept only source fields plus an expected revision; attributes are changed through a separate manage endpoint. The server selects ownership from identity and tenant from the stored resource.

Templates clone the sample project. Article includes an introduction and bibliography file. Report changes the document class/chapter start. Blank supplies a minimal document. New project IDs are random; imported legacy project IDs are replaced server-side while source file identities are retained.

The opt-in migration reads `folio.projects.v1` from localStorage, requires an array with at most 40 entries, validates each project, imports sequentially, and removes each successful entry from the local list. Interrupted migration retains unimported entries. It is not a globally atomic batch; partial import is possible and intentional. Imported projects still obey current tenant/project limits.

Source export creates a ZIP in the browser with relative filenames and current in-tab text, including unsaved conflict drafts. This is useful before reloading. PDF download retrieves the protected last successful artifact. No binary asset upload, arbitrary ZIP import, rename-reference rewriting, or source history UI exists.

Archived projects count toward project capacity. Existing over-capacity data is preserved on downgrade; only additional capacity is denied. See [autosave](autosave.md) and [quotas](quotas.md).

## Implementation references

- [src/features/projects/model.ts](../../src/features/projects/model.ts)
- [src/shared/types/saas.ts](../../src/shared/types/saas.ts)
- [src/features/editor/components/workspace.tsx](../../src/features/editor/components/workspace.tsx)
- [src/app/api/projects/import/route.ts](../../src/app/api/projects/import/route.ts)
