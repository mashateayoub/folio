# Current design choices and tradeoffs

This page explains decisions evident in the implementation; it does not reconstruct an undocumented historical decision process.

| Choice                                   | Purpose                                               | Tradeoff                                                          |
| ---------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| Next.js App Router + Node route handlers | Server rendering and authenticated APIs in one app    | Read installed version-specific docs before API changes           |
| PostgreSQL sessions and tenant data      | Central current identity, locks, durability           | Requires database availability for protected work                 |
| Pure `allowed()` policy                  | Testable role/attribute evaluation                    | Resource resolution still belongs to server code                  |
| JSONB project source + numeric revisions | Atomic multi-file saves and optimistic concurrency    | No granular source history or collaborative merge                 |
| Schema-validated client responses        | Reject unexpected contracts before state updates      | Schema changes must track server DTO changes                      |
| Private Docker TeX supervisor            | Real PDFs without TeX in web process                  | Privileged host socket, image management, serial capacity         |
| PDF `bytea` storage                      | Protected downloads without a separate storage system | Database size and backup cost increase                            |
| Current Stripe fetch on events           | Resist duplicate/out-of-order state changes           | Provider calls and tenant locks add latency                       |
| Explicit expiry on paid plans            | Fail closed if renewal delivery stops                 | Missing events can temporarily reduce limits until reconciliation |
| Source ZIP export + in-tab conflict stop | Preserve manual escape hatch                          | Users must handle conflicting drafts themselves                   |
| Generic anti-slop errors + formatter     | Enforce code readability/contracts                    | Vendor dependencies and rule upgrades need review                 |
| Development-only Impeccable slot         | Local design iteration                                | Its presence must remain excluded from production rendering       |

Potential replacements—CRDT collaboration, a durable job queue, external object storage, or a policy engine—are roadmap proposals. They require new data-flow and failure-model documentation when implemented.

## Implementation references

- [src/features/access-control/policy.ts](../../src/features/access-control/policy.ts)
- [src/shared/contracts/api-responses.ts](../../src/shared/contracts/api-responses.ts)
- [src/server/billing/service.ts](../../src/server/billing/service.ts)
- [src/app/layout.tsx](../../src/app/layout.tsx)
