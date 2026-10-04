# Command reference

Run these npm scripts from the repository root. Host env-file scripts need `.env.local`; container variants consume existing process environment. Commands that start servers remain running until stopped. Test/resource prerequisites are in [testing](../development/testing.md).

| Script                                | Exact command                                                                                                     | Purpose                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`                         | `next dev --hostname 127.0.0.1`                                                                                   | Host Next development server; default Next port unless supplied; loopback bind. |
| `npm run build`                       | `next build`                                                                                                      | Turbopack production compilation, type checking, route generation.              |
| `npm run start`                       | `next start --hostname 127.0.0.1`                                                                                 | Host production Next server; build first; loopback bind.                        |
| `npm run lint`                        | `npm run lint:eslint && npm run lint:anti-slop`                                                                   | ESLint followed by anti-slop; fails on enabled errors.                          |
| `npm run typecheck`                   | `tsc --noEmit`                                                                                                    | Strict TypeScript with no emitted JS.                                           |
| `npm run test`                        | `node --import tsx --test tests/*.test.ts`                                                                        | Node unit files matching tests/*.test.ts.                                       |
| `npm run compiler`                    | `node --env-file=.env.local --import tsx services/compiler/server.ts`                                             | Host supervisor on 4100 with private env; Docker required.                      |
| `npm run postinstall`                 | `node scripts/copy-pdf-worker.mjs`                                                                                | Copy matching PDF.js worker into public/.                                       |
| `npm run test:compiler`               | `node --import tsx --test tests/compiler.integration.ts`                                                          | Actual TeX PDF/error/bibliography acceptance.                                   |
| `npm run test:browser`                | `node --env-file=.env.local node_modules/@playwright/test/cli.js test`                                            | Playwright UI workflows; select target/channel as needed.                       |
| `npm run setup`                       | `node scripts/setup.mjs`                                                                                          | Generate/preserve private local config and credentials.                         |
| `npm run db:migrate`                  | `node --env-file=.env.local --import tsx scripts/migrate.ts`                                                      | Auth and numbered application SQL migrations, host env.                         |
| `npm run db:migrate:container`        | `node --import tsx scripts/migrate.ts`                                                                            | Same runner using existing container environment.                               |
| `npm run test:saas`                   | `node --env-file=.env.local --import tsx --test tests/saas.integration.ts`                                        | Full application auth/tenant/role/source/PDF/MFA integration.                   |
| `npm run billing:reconcile`           | `node --env-file=.env.local --import tsx scripts/reconcile-billing.ts`                                            | Synchronize every bound customer; monitor nonzero exit.                         |
| `npm run test:billing`                | `node --env-file=.env.local --import tsx --test tests/billing.integration.ts`                                     | Real DB, typed fixture-provider billing lifecycle/capacity checks.              |
| `npm run billing:reconcile:container` | `node --import tsx scripts/reconcile-billing.ts`                                                                  | Reconciliation using container environment.                                     |
| `npm run billing:listen`              | `node --env-file=.env.local scripts/stripe-listen.mjs`                                                            | Development-only loopback Stripe forwarding; privately save secret.             |
| `npm run billing:check`               | `node --env-file=.env.local --import tsx scripts/check-billing.ts`                                                | Validate configured Price/portal mode and features.                             |
| `npm run test:stripe`                 | `node --env-file=.env.local --import tsx --test tests/billing.stripe.ts tests/billing-clock.stripe.ts`            | Real Sandbox hosted + Test Clock acceptance; never live prices.                 |
| `npm run lint:eslint`                 | `eslint .`                                                                                                        | Next ESLint configs only.                                                       |
| `npm run lint:anti-slop`              | `NODE_OPTIONS='--import tsx' oxlint`                                                                              | Oxlint with TypeScript loader and vendored generic plugin.                      |
| `npm run format`                      | `prettier --write "src/**/*.{ts,tsx}" "tests/**/*.{ts,tsx}" "services/**/*.ts" "scripts/*.{ts,mjs}" "*.{ts,mjs}"` | Prettier write on owned TS/TSX/MJS targets; not all repository file types.      |
| `npm run format:check`                | `prettier --check "src/**/*.{ts,tsx}" "tests/**/*.{ts,tsx}" "services/**/*.ts" "scripts/*.{ts,mjs}" "*.{ts,mjs}"` | Check those same formatter targets without writing.                             |

## Compose lifecycle

`docker compose up -d --build` builds/starts the full local stack; `docker compose ps` lists service state; `docker compose logs --tail=100 web compiler` provides diagnostics; `docker compose down` stops while retaining volumes. `docker compose up -d --no-deps --build web` rebuilds/recreates just web after source changes when its dependencies already run. Migration and reconciliation container variants can run through `docker compose exec web ...`.

Volume deletion, production secret changes, and restore overwrites are separate operator decisions. Never print full expanded config as a quick diagnostic when it contains secrets.

[package.json](../../package.json) · [compose.yaml](../../compose.yaml)
