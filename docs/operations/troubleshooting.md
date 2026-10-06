# Troubleshooting

| Symptom                              | Likely boundary                                       | Action                                                                     |
| ------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| Configuration incomplete             | Missing core environment                              | Run setup; review required key names privately                             |
| Production requires HTTPS            | Public runtime with HTTP URL                          | Use HTTPS; local Compose explicitly opts into HTTP                         |
| DB connection/authentication failure | Host/container URL or changed initialization password | Check 55432 vs `postgres:5432`; align actual DB role credentials           |
| Missing verification mail            | SMTP/APP_URL                                          | Check Mailpit locally, transport logs, and link origin                     |
| Sign-in says too many requests       | Database auth throttle                                | Allow 60-second window to expire; do not weaken limits                     |
| Mutation returns 403 Origin          | URL/header mismatch                                   | Match configured origin and port; provide Origin for application API calls |
| Project appears missing (404)        | Tenant/read policy or deletion                        | Check current membership, verification, expiry, visibility/grants          |
| Save returns 409                     | Revision changed elsewhere                            | Export draft and reload; no automatic merge                                |
| Invalid response after 200           | Client/server contract mismatch                       | Inspect schema/DTO and deployment version; do not bypass validation        |
| Compile 409                          | Unsaved/mismatched revision                           | Flush source; use the acknowledged revision                                |
| Compile 429                          | Quota, running project, or serial worker busy         | Inspect usage/state and Retry-After; avoid request flooding                |
| Compile 503                          | Supervisor/Docker/image/token                         | Check service health, matching token, Docker access, built image           |
| Compile 408                          | Job exceeded time                                     | Inspect last diagnostic output and reduce document workload                |
| Compile 422                          | LaTeX error or oversized PDF                          | Read file-line diagnostics; correct source; earlier preview remains        |
| Preview worker missing               | Postinstall not run/static asset                      | Run dependency install/postinstall and rebuild                             |
| PDF GET 404/403                      | Retention or current access lost                      | Recompile when authorized; URL is not permanent public access              |
| Team checkout unavailable            | Missing config/invalid Price/provider outage          | Run billing:check and check optional config privately                      |
| Checkout 409                         | Existing ongoing subscription/completed checkout      | Use portal; reconcile/resubscribe only after terminal state                |
| Paid checkout still Free             | Webhook/signing/mode/expiry/reconciliation            | Verify actual delivery; refresh/reconcile; redirect alone grants nothing   |
| Scheduled cancellation flag false    | Provider uses explicit cancel_at                      | Inspect cancellation date; app supports both representations               |
| Impeccable absent in Compose         | Production-built local app                            | Use host development for live design mode                                  |

When a test fails, read `test-results/` context and the actual HTTP status before changing product behavior. Repeated full-suite runs can produce throttling; rerun the affected test after the limit window. Do not add retries that hide real authorization/source-contract failures.

Collect redacted service/version/route/status/tenant-state information. Exclude secrets, session cookies, active invite/reset links, and source contents from routine incident logs. Current code does not provide a formal observability export or automatic support bundle.

## Implementation references

- [src/server/http.ts](../../src/server/http.ts)
- [src/server/config.ts](../../src/server/config.ts)
- [services/compiler/compile.ts](../../services/compiler/compile.ts)
- [src/server/billing/service.ts](../../src/server/billing/service.ts)
