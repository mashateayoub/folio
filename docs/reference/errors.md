# Error semantics

`HttpError(status,message)` carries intentional application failures. `api()` awaits the work and catches both synchronous and asynchronous failures. HttpError produces JSON `{error:message}` with its status and no-store. Unexpected errors log a name and return generic 500. There is no mandatory machine-readable error code or structured field-error array.

| Status | Common meaning                                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 400    | Invalid UUID/token/body/JSON/schema, missing or invalid webhook signature                                                           |
| 401    | Missing current session, or wrong compiler Bearer token at the private service                                                      |
| 403    | Unverified account, disallowed Origin, readable resource action denied, suspended workspace, protected role/billing action          |
| 404    | Missing or deliberately hidden tenant/project/build, missing invitation, expired/nonretained PDF                                    |
| 408    | Compiler job timeout                                                                                                                |
| 410    | Invitation is expired, accepted/revoked, or its membership duration expired                                                         |
| 409    | Source revision conflict, duplicate active membership, existing subscription/checkout requiring portal repair                       |
| 413    | Raw JSON body too large                                                                                                             |
| 422    | LaTeX compilation error / relevant compiler failure                                                                                 |
| 429    | Auth throttle, workspace ownership/capacity/usage, running project, or busy serial supervisor                                       |
| 500    | Unhandled server failure                                                                                                            |
| 502    | Failed invitation delivery after record creation, unusable checkout/artifact; malformed client response uses a local CloudError 502 |
| 503    | Incomplete/unavailable paid configuration, unavailable compiler/Docker/provider-dependent feature                                   |

The compile route may return `{error,log,buildId}` on compiler failures; generic API failures do not automatically include diagnostics. The compiler's Bearer rejection returns no JSON body. Auth library endpoints have their own error shape and codes, consumed by the auth client.

404 can protect resource existence; it does not always mean deletion. Autosave treats 401/403/404/409 as a blocked state and requires recovery rather than blind retries. Other failures preserve in-tab text and expose retry. For conflicting text, export before reload. A successful 200 with an invalid contract must not update acknowledged revision.

Busy compiler responses include `Retry-After: 2`; this is not a general retry contract for every 429. Monthly quota is not fixed by waiting two seconds. Request counters count admitted builds even when a later downstream compile fails. Signature failure should not be retried with modified bytes; correct secret/mode/destination instead.

## Implementation references

- [src/lib/server/http.ts](../../src/lib/server/http.ts)
- [src/lib/cloud-client.ts](../../src/lib/cloud-client.ts)
- [src/app/api/compile/route.ts](../../src/app/api/compile/route.ts)
- [services/compiler/server.ts](../../services/compiler/server.ts)
