# Contributor workflow and Git discipline

Read [AGENTS.md](../../AGENTS.md) before work, and the installed Next guide relevant to API changes. Start with `git status`; preserve unrelated edits. Choose the smallest functional change and trace its server/client/database contracts before editing.

For a protected feature, decide identity, tenant resolution, role/attribute action, strict input schema, origin requirement, locks, quotas, response contract, and failure recovery. Reuse `actorFor`, `orgContext`/project policy, transactions, and existing response schemas rather than introducing client-selected authority. Add migrations instead of editing applied SQL.

Update this documentation alongside public behavior: endpoint/schema changes affect reference pages; limits affect feature/billing docs; operational changes affect runbooks. New files need an entry in the repository inventory. State whether behavior is implemented, proposed, or manually operated.

Run checks appropriate to the changed boundary. Source-only formatter changes need lint/format/type checks; authorization changes need policy/SaaS coverage; compiler changes need real PDF/error coverage; billing changes need fixture checks and provider acceptance when provider behavior changes. Docs-only changes need link/reference/coverage checks, not charge-creating provider tests.

Commit completed reviewable work in focused commits, including documentation/tests needed to understand it. The first repository commit established the complete initial app; future commits should record actual changes rather than fabricated reconstruction of earlier development. Do not accumulate another large uncommitted implementation milestone.

`.env.local`, node_modules, generated workers, build output, test captures, and live session captures stay ignored. Scan staged files before committing. Vendored plugin source, licenses, pristine provenance archive, local fonts, and lockfile are intentional tracked assets. Do not force-push, discard unrelated work, or publish a deployment merely as part of local cleanup.

A useful commit message names the changed behavior and why it matters. Keep a clean working tree after the completed task; report any intentional remaining local changes.

## Implementation references

- [AGENTS.md](../../AGENTS.md)
- [.gitignore](../../.gitignore)
- [.github/workflows/checks.yml](../../.github/workflows/checks.yml)
