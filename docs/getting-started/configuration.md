# Configuration and secrets

All commands below run from the repository root. `.env.example` documents placeholders; `.env.local` contains real local values and is Git-ignored. `npm run setup` fills missing or `replace-` values, generates random secrets, and chmods the file to 0600. Values already present are preserved. Setup is not a secret rotation or database password migration.

| Variable                                                   | Requirement / default                                  | Consumer                                              |
| ---------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| `APP_URL`                                                  | Required URL; HTTPS in public production               | Auth origins, redirects, email links, billing returns |
| `DATABASE_URL`                                             | Required `postgresql://` URL                           | PostgreSQL pool                                       |
| `POSTGRES_PASSWORD`                                        | Setup-generated; initialize DB                         | Compose PostgreSQL                                    |
| `DATABASE_HOST`, `DATABASE_PORT`                           | Optional URL overrides                                 | Web in Compose uses `postgres:5432`                   |
| `BETTER_AUTH_SECRET`                                       | At least 32 characters; no example placeholder         | Session/auth cryptography                             |
| `COMPILER_TOKEN`                                           | At least 24 characters                                 | Web-to-compiler Bearer authentication                 |
| `COMPILER_URL`                                             | Default `http://127.0.0.1:4100`                        | Public compile route                                  |
| `COMPILER_IMAGE`                                           | Default `folio-tex:local`                              | TeX Docker job                                        |
| `COMPILER_HOST`                                            | Default `127.0.0.1`; Compose `0.0.0.0`                 | Supervisor listener                                   |
| `COMPILER_BUILD_ROOT`                                      | Default OS temporary directory; Compose `/builds`      | Scratch files                                         |
| `COMPILER_BUILD_VOLUME`                                    | Optional; Compose `folio-builds`                       | Docker job volume subpath                             |
| `SMTP_HOST`                                                | Required                                               | Email transport                                       |
| `SMTP_SERVICE_HOST`                                        | Optional override; Compose `mailpit`                   | Container SMTP hostname                               |
| `SMTP_PORT`                                                | Positive integer; default 1025                         | Email transport                                       |
| `SMTP_FROM`                                                | Default `Folio <noreply@folio.local>`                  | Email sender                                          |
| `SMTP_SECURE`                                              | TLS enabled only for literal `true`                    | Nodemailer                                            |
| `SMTP_USER`, `SMTP_PASSWORD`                               | Optional authenticated SMTP                            | Nodemailer                                            |
| `ALLOW_INSECURE_LOCAL_DEV`                                 | Literal `true` permits local production HTTP           | Compose only; omit for public production              |
| `STRIPE_SECRET_KEY`                                        | Optional together with price + signing secret          | Stripe SDK; development CLI listener                  |
| `STRIPE_TEAM_PRICE_ID`                                     | Configured monthly Team Price                          | Checkout and entitlement validation                   |
| `STRIPE_WEBHOOK_SECRET`                                    | Exact endpoint/listener signing secret                 | Raw webhook verification                              |
| `STRIPE_PORTAL_CONFIGURATION_ID`                           | Optional dedicated configuration                       | Portal sessions and validation                        |
| `STRIPE_FORWARD_URL`                                       | Loopback URL; default local Compose webhook            | Development listener                                  |
| `FOLIO_PORT`, `FOLIO_APP_URL`                              | Shell/Compose interpolation values                     | Published web port and URL                            |
| `SAAS_TEST_URL`, `PLAYWRIGHT_BASE_URL`, `BILLING_TEST_URL` | Test-only target overrides                             | Integration/browser/hosted billing tests              |
| `MAILPIT_URL`                                              | Test-only mailbox URL; default `http://127.0.0.1:8025` | Email-link acceptance helper                          |
| `PLAYWRIGHT_CHANNEL`                                       | Optional, e.g. `chrome`                                | Browser launch                                        |
| `NODE_ENV`                                                 | Set by Next/runtime; production in web image           | HTTPS enforcement and dev-only tooling                |

No application secret is intentionally prefixed `NEXT_PUBLIC_`. Do not print or commit environment contents. Logs should identify missing configuration keys rather than their values.

The validated config schema covers core auth/database/compiler/mail fields. Optional transport, test, and Stripe settings are read by their owning modules. Billing is configured only when all three principal Stripe values are present. A configured provider may still be unavailable or have an invalid Price.

Changing PostgreSQL's initialization password variable does not alter the password inside an existing volume. Updating auth or compiler secrets requires deliberate coordinated changes. Public production requires a real HTTPS origin; changing only a port without changing its origin can cause 403 errors or incorrect email links.

## Implementation references

- [.env.example](../../.env.example)
- [scripts/setup.mjs](../../scripts/setup.mjs)
- [src/lib/server/config.ts](../../src/lib/server/config.ts)
- [src/lib/server/mail.ts](../../src/lib/server/mail.ts)
- [compose.yaml](../../compose.yaml)

## Documentation site

`FOLIO_DOCS_PORT` selects the loopback Docker docs port (default `4173`). The docs service is static and needs no app or billing secrets. See [docs website](documentation-site.md).
