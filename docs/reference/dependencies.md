# Dependency and runtime reference

Declared ranges come from package.json; resolved versions below come from the committed lockfile, not a claim about the latest available registry release. Install with npm ci for this exact graph. Do not independently float the two Oxlint packages.

## dependencies

| Package                    | Declared   | Locked    | Role                                                                             |
| -------------------------- | ---------- | --------- | -------------------------------------------------------------------------------- |
| `@codemirror/commands`     | `^6.11.1`  | `6.11.1`  | Editor commands and indentation shortcut                                         |
| `@codemirror/language`     | `^6.12.4`  | `6.12.4`  | Language stream/highlighting support                                             |
| `@codemirror/legacy-modes` | `^6.5.4`   | `6.5.4`   | LaTeX stex stream mode                                                           |
| `@codemirror/search`       | `^6.7.2`   | `6.7.2`   | CodeMirror search dependency                                                     |
| `@codemirror/state`        | `^6.7.6`   | `6.7.6`   | Editor state and transaction machinery                                           |
| `@codemirror/view`         | `^6.43.13` | `6.43.13` | EditorView, keymaps, readonly/render integration                                 |
| `@gsap/react`              | `^2.1.2`   | `2.1.2`   | React animation lifecycle hook                                                   |
| `@phosphor-icons/react`    | `^2.1.10`  | `2.1.10`  | Primary current UI icon set                                                      |
| `@tailwindcss/postcss`     | `^4.3.3`   | `4.3.3`   | Tailwind/PostCSS integration                                                     |
| `better-auth`              | `^1.7.6`   | `1.7.6`   | Database identity, sessions, verification, MFA                                   |
| `codemirror`               | `^6.0.2`   | `6.0.2`   | Basic editor extension setup                                                     |
| `drizzle-orm`              | `^0.45.3`  | `0.45.3`  | Typed PostgreSQL models, query builder, transactions, and auth adapter database. |
| `fflate`                   | `^0.8.3`   | `0.8.3`   | Browser source ZIP creation                                                      |
| `gsap`                     | `^3.15.0`  | `3.15.0`  | Auth specimen motion                                                             |
| `lucide-react`             | `^1.49.0`  | `1.49.0`  | Declared icon dependency; inspect usage before assuming active UI role           |
| `next`                     | `^16.3.7`  | `16.3.7`  | App Router, server pages/routes, dev/build/runtime                               |
| `nodemailer`               | `^10.0.13` | `10.0.13` | SMTP transport                                                                   |
| `pdfjs-dist`               | `5.5.207`  | `5.5.207` | Real PDF loading/rendering and matching worker                                   |
| `pg`                       | `^8.23.1`  | `8.23.1`  | PostgreSQL pool/transactions                                                     |
| `react`                    | `^19.3.0`  | `19.3.0`  | Client/server component UI                                                       |
| `react-dom`                | `^19.3.0`  | `19.3.0`  | React DOM runtime                                                                |
| `stripe`                   | `^23.0.0`  | `23.0.0`  | Server billing/provider SDK                                                      |
| `tailwindcss`              | `^4.3.3`   | `4.3.3`   | CSS utilities/tokens pipeline                                                    |
| `zod`                      | `^4.6.5`   | `4.6.5`   | Input, response, project, config schemas                                         |

## devDependencies

| Package              | Declared   | Locked    | Role                                           |
| -------------------- | ---------- | --------- | ---------------------------------------------- |
| `@oxlint/plugins`    | `1.86.0`   | `1.86.0`  | Vendored lint rule API; exactly matches Oxlint |
| `@playwright/test`   | `^1.63.0`  | `1.63.0`  | Browser and HTTP acceptance tooling            |
| `@types/node`        | `^26.6.3`  | `26.6.3`  | Node type declarations                         |
| `@types/nodemailer`  | `^8.0.2`   | `8.0.2`   | Mail types                                     |
| `@types/pg`          | `^8.23.1`  | `8.23.1`  | PostgreSQL types                               |
| `@types/react`       | `^19.3.0`  | `19.3.0`  | React types                                    |
| `@types/react-dom`   | `^19.3.0`  | `19.3.0`  | React DOM types                                |
| `eslint`             | `^9.39.5`  | `9.39.5`  | Base lint runtime                              |
| `eslint-config-next` | `^16.3.7`  | `16.3.7`  | Next rule configurations                       |
| `oxlint`             | `1.86.0`   | `1.86.0`  | Fast lint engine and generic plugin runner     |
| `prettier`           | `3.9.9`    | `3.9.9`   | Pinned source formatter                        |
| `tsx`                | `^4.23.15` | `4.23.15` | Run TS scripts/tests and load TS lint plugin   |
| `typescript`         | `5.9.3`    | `5.9.3`   | Strict noEmit compiler/type checker            |

## Other runtime assets

Node 22 is the documented setup/container runtime. PostgreSQL 16-alpine stores application and identity data. Mailpit v1.27 captures local email. The compiler image is Debian Bookworm with latexmk and installed TeX Live package collections; supervisor copies Docker CLI from docker:29-cli. Image tags are build inputs, not a universal immutable pin of every transitive OS package.

Satoshi WOFF2 regular/medium/bold are self-hosted Fontshare assets with provenance/license links in [font notes](../../src/app/fonts/README.md). The generated PDF.js worker is copied from the installed package after install and ignored by Git.

The Next docs shipped inside node_modules are version-relevant reference material. Exact source API usage is authoritative. A production dependency audit was clean during the earlier implementation check; that historical result is not a substitute for auditing a future dependency graph.

[package.json](../../package.json) · [package-lock.json](../../package-lock.json) · [image definitions](../../infra/Dockerfile.compiler)
