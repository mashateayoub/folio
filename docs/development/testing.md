# Test tiers, fixtures, and verification

| Command                 | Scope                                                                                                   | Prerequisites                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npm test`              | Policy, source/path/byte guards, container arguments, signatures/entitlement, validated cloud responses | Dependencies; cloud test opens temporary loopback HTTP listener          |
| `npm run test:compiler` | Actual multi-file PDF, LaTeX error/recovery, bibliography passes                                        | Docker daemon + built TeX image                                          |
| `npm run test:saas`     | Verified auth, tenants, escalation, revisions, memberships, quotas, protected PDF, MFA/reset            | Running web, DB, mailbox, compiler                                       |
| `npm run test:billing`  | PostgreSQL billing/idempotency/event/limit lifecycle using typed provider fixture                       | Real PostgreSQL + migrated schema                                        |
| `npm run test:browser`  | Nine authenticated editor/library/settings/billing desktop/mobile workflows                             | Running services + Playwright browser or Chrome                          |
| `npm run test:stripe`   | Real hosted Sandbox checkout/portal/signatures/cancellation + Test Clock renewal/failure/recovery       | Configured Sandbox, matching live CLI listener, running services, Chrome |

Unit tests do not prove real hosted billing or production compiler isolation. The billing fixture implements the service's narrow provider interface rather than casting incomplete objects into the full SDK. Real Stripe tests refuse live prices and use disposable accounts/provider resources. They must never target a public customer environment.

Integration scripts create `example.test` users and delete their fixture data afterwards. Mail helper queries Mailpit to obtain local verification/reset/invitation links. Browser beforeAll establishes one account/session; beforeEach creates a project and opens it. Cleanup is best-effort on failure, so inspect local fixture resources if a process is killed.

For Compose:

```sh
SAAS_TEST_URL=http://localhost:3030 npm run test:saas
PLAYWRIGHT_BASE_URL=http://localhost:3030 PLAYWRIGHT_CHANNEL=chrome npm run test:browser
```

Browser default is host dev at `127.0.0.1:3001`; SaaS has the same default; hosted billing defaults to `localhost:3030`. The configured origin must match each target. Playwright runs one worker with 60-second test timeout. `npx playwright install chromium` installs a browser; real hosted Stripe defaults to Chrome unless channel is overridden.

Keep authentication rate limits enabled. Signup is five/minute and sign-in eight/minute. Running multiple suites together can throttle the final sign-in even when product behavior is correct. Inspect the failure alert, allow the window to expire, and rerun the affected test rather than relaxing the limit. Screenshots and context are in ignored `test-results/`.

Current implementation verification passed unit, billing/PostgreSQL, SaaS, all nine browser workflows, both real Stripe suites, lint/types/format, and Docker production build. One browser sign-in required a rerun after an overlapping-suite rate-limit window. Treat this as a recorded local result, not an evergreen guarantee for future commits.

## Implementation references

- [package.json](../../package.json)
- [playwright.config.ts](../../playwright.config.ts)
- [tests/browser/workspace.spec.ts](../../tests/browser/workspace.spec.ts)
- [tests/billing.stripe.ts](../../tests/billing.stripe.ts)
- [tests/billing-clock.stripe.ts](../../tests/billing-clock.stripe.ts)

The database tier (`npm run test:db`) checks Drizzle date/JSON round-trips and rollback against PostgreSQL. Run after applying migrations.
