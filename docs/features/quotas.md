# Capacity, usage accounting, and throttling

| Limit        | Free  | Team   | Counting rule                                 |
| ------------ | ----- | ------ | --------------------------------------------- |
| Projects     | 40    | 100    | All tenant projects, including archived       |
| Seats        | 5     | 100    | Active, unexpired memberships; owner included |
| Compilations | 1,000 | 20,000 | Admitted requests per UTC calendar month      |

The plan is effective only while paid expiry is in the future. Limits are evaluated at server operations under tenant lock. Downgrading retains source/members and allows existing project edits, but blocks new projects/seats or compilations when allowance is exhausted. Pending invites do not reserve seats; final acceptance checks current capacity. Restoring a valid revoked seat also checks capacity.

Other guards are independent of payment: ten owned workspaces per user; 30 compilation requests per user per minute; 20 invitations per workspace per minute; one recent running build per project; one compiler-supervisor job at a time. Auth endpoint throttles are in [authentication](../security/authentication.md).

Usage keys encode their bucket: `user-builds:<actor>:<minute>`, `org-builds:<tenant>:<YYYY-MM>`, and `invites:<tenant>:<minute>`. Per-minute entries have 120-second expiry; monthly counters use 35 days. Atomic SQL insert/increment refuses to exceed the limit. Finished builds delete expired counters, but there is no scheduled counter janitor.

A compile transaction validates permission/revision/running-state before incrementing both request counters and inserting the build. Later compiler errors, including downstream service busy/unavailable responses, do not refund those committed counters. Failure before commit rolls back them. Monthly reset follows a new UTC month key, not a rolling 30-day window.

Project capacity is released by deletion rather than archive. Seat expiry/revocation releases effective capacity. Raising a paid limit does not erase current usage. Billing summary displays current count and allowance; it is informational, with admission decisions still enforced in domain operations.

## Implementation references

- [src/features/billing/plans.ts](../../src/features/billing/plans.ts)
- [docs/architecture/source-structure.md](../architecture/source-structure.md)
- [src/server/billing/service.ts](../../src/server/billing/service.ts)
