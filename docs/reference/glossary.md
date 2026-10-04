# Glossary

| Term                  | In this codebase                                                                     |
| --------------------- | ------------------------------------------------------------------------------------ |
| ABAC                  | Attribute-based access control: tenant/user/state/expiry/visibility/ownership checks |
| RBAC                  | Role-based access control: workspace seat and project grant rules                    |
| Actor                 | Current session-derived identity; not arbitrary request user ID                      |
| Artifact              | Persisted PDF from a build                                                           |
| CAS                   | Compare-and-swap source revision guard                                               |
| CloudProject / DTO    | Source plus server metadata and permissions returned to UI                           |
| Entitlement           | Effective Free/Team capacity with paid validity deadline                             |
| Origin                | Browser/request origin checked on application mutations                              |
| Idempotency seed      | Persisted checkout UUID used for safe provider retries                               |
| Receipt               | Uniquely stored provider event ID proving processing committed                       |
| Reconciliation        | Fetch provider's current state and synchronize local entitlement                     |
| Snapshot              | Immutable saved source captured for one build                                        |
| Supervisor            | Private HTTP service controlling Docker TeX jobs                                     |
| Scratch volume        | Temporary worker files; not authoritative PDF storage                                |
| Token hash            | Invitation SHA-256 stored instead of the original acceptance token                   |
| Trialing              | Provider subscription status eligible only with matching future entitlement          |
| UTC monthly bucket    | Compilation key YYYY-MM from ISO UTC time                                            |
| Visibility            | Who can read a project; not an edit grant                                            |
| Viewer ceiling        | Workspace viewer remains read-only despite ownership/editor grant                    |
| RLS                   | Database row-level security, not currently installed by these migrations             |
| Live helper           | Impeccable design tooling, development-only                                          |
| Sandbox               | Provider test environment, distinct from live payments                               |
| Durable offline draft | Planned local recovery journal; not currently implemented                            |
| Collaboration         | Planned simultaneous text/presence protocol, not plain shared project access         |
