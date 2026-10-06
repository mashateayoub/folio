# Continuous integration

`.github/workflows/checks.yml` runs on push and pull requests. The checks job installs Node 22 with npm cache, runs npm ci, combined lint, formatting check, TypeScript, unit tests, and production build. It does not launch the web/SMTP/compiler/browser stack.

The billing job starts PostgreSQL 16-alpine with isolated CI credentials, configures a local test origin and private test-only auth/compiler strings, creates an empty `.env.local` for Node's env-file invocation, applies migrations, and runs ORM persistence/rollback acceptance and PostgreSQL billing integration with the typed provider fixture. Those test strings are not production credentials.

Real browser, SaaS, TeX, and hosted Stripe acceptance are separate local/operator tiers. They are not automatically part of the current GitHub workflow. Public launch therefore needs explicit reporting of those checks and its infrastructure acceptance rather than assuming green CI implies full hosted correctness.

The application, billing, and documentation jobs are independent. The workflow does not deploy, publish images, merge a PR, provision cloud resources, or rotate keys. No required-check branch rule is configured by this YAML alone. Review repository hosting settings separately when making branch protection decisions.

The documentation job installs the separate locked docs package, tests link rewriting and source-path boundaries, and builds the static site. VitePress checks local page links during the build. It does not check external website availability or deploy the docs container. Root lint includes owned docs scripts/configuration and excludes generated content and dependency trees.

## Implementation references

- [.github/workflows/checks.yml](../../.github/workflows/checks.yml)
- [package.json](../../package.json)
