# Product and domain vocabulary

Folio is an account-based LaTeX writing workspace. It pairs a multi-file source editor with actual LaTeX-to-PDF compilation, stores projects in PostgreSQL, and allows controlled sharing inside multiple workspaces. It is currently a functional SaaS foundation, not full Overleaf feature parity.

| Term                     | Meaning                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| User / actor             | Verified account and its current session-derived identity               |
| Organization / workspace | Tenant boundary and unit of billing                                     |
| Membership / seat        | A user's workspace role, state, and optional expiry                     |
| Project                  | Source files, title, root document, revision, ownership, and visibility |
| Project grant            | Editor/viewer access to one project, constrained by the workspace seat  |
| Build                    | Immutable revision captured for compilation and its result record       |
| Artifact                 | A persisted PDF accessible through a protected build URL                |
| Entitlement              | Paid limits valid through the confirmed subscription expiry             |
| Invitation               | Email-bound, hashed-token request to join a workspace                   |
| Revision                 | Optimistic concurrency number; not a version-history feature            |

A personal workspace is created idempotently for a user; it has one initial sample project. Additional workspaces start empty. A user may own up to ten workspaces, including the personal workspace. Projects are private by default. A subscription belongs to one workspace, not every workspace owned by the purchaser.

The browser owns unsaved editing state. PostgreSQL owns acknowledged source and authoritative membership. Stripe owns payment/subscription state. The compiler owns only temporary build work; finished PDFs are stored in PostgreSQL. The project library displays only resources the server permits the actor to read.

[User guide](user-guide.md) explains the UI. [Limitations](limitations.md) records the gaps. Historical planning remains in [PRODUCT.md](../../PRODUCT.md), [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md), and [TASKS.md](../../TASKS.md); the running source is authoritative for implemented behavior.

## Implementation references

- [src/lib/server/saas.ts](../../src/lib/server/saas.ts)
- [src/lib/saas-types.ts](../../src/lib/saas-types.ts)
- [src/lib/project.ts](../../src/lib/project.ts)
