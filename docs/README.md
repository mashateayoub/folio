# Folio documentation

This reference explains the implemented application from user workflow through code, persistence, permissions, payment state, compiler jobs, tests, and operations. It describes the repository as of 2026-10-04. Commands run from the repository root unless noted. Real local/production secrets are intentionally absent.

## Start here

- To browse these docs as a website: [documentation site](getting-started/documentation-site.md).

- To run the app: [quick start](getting-started/quick-start.md).
- To understand what it does: [product overview](product/overview.md) and [user guide](product/user-guide.md).
- To understand the code: [system architecture](architecture/system.md), [request flows](architecture/request-flows.md), and [every source file](reference/repository.md).
- To integrate/change APIs: [routes](reference/api-routes.md), [contracts](reference/contracts.md), [errors](reference/errors.md).
- To review security: [authentication](security/authentication.md), [RBAC/ABAC](security/authorization.md), [boundaries](security/boundaries.md), and [compiler isolation](compiler/isolation.md).
- To operate billing: [plans](billing/plans.md), [webhooks](billing/webhooks.md), and [setup/reconciliation](billing/setup-and-reconciliation.md).
- To diagnose or deploy: [troubleshooting](operations/troubleshooting.md), [runbooks](operations/runbooks.md), [deployment](operations/deployment.md), and [backup/restore](operations/backup-and-restore.md).

## Complete reading map

### Architecture

Trace system boundaries, requests, locks, and implementation tradeoffs. [Section index](architecture/README.md).

- [Transactions, locking, and failure boundaries](architecture/concurrency.md)
- [Current design choices and tradeoffs](architecture/design-decisions.md)
- [End-to-end request flows](architecture/request-flows.md)
- [System architecture](architecture/system.md)

### Billing

Configure and operate one-workspace subscription entitlement safely. [Section index](billing/README.md).

- [Checkout, portal, retries, and return handling](billing/checkout-and-portal.md)
- [Billing model and paid entitlements](billing/plans.md)
- [Stripe configuration and recovery](billing/setup-and-reconciliation.md)
- [Verified webhook processing](billing/webhooks.md)

### Compiler

Follow real TeX execution, host isolation, and artifact retention. [Section index](compiler/README.md).

- [Artifact persistence, retention, and access](compiler/artifacts.md)
- [TeX execution isolation and limits](compiler/isolation.md)
- [Compiler pipeline and build lifecycle](compiler/pipeline.md)

### Data

Understand authoritative data, generated auth schema, and migration execution. [Section index](data/README.md).

- [Generated authentication schema](data/auth-schema.md)
- [Application migration SQL](data/migration-sql.md)
- [Migrations and data lifecycle](data/migrations.md)
- [Database ownership and relationships](data/schema.md)

### Development

Contribute with stable formatting, focused commits, and appropriate test tiers. [Section index](development/README.md).

- [Continuous integration](development/ci.md)
- [Linting, formatting, and anti-slop](development/code-quality.md)
- [Contributor workflow and Git discipline](development/contributing.md)
- [Test tiers, fixtures, and verification](development/testing.md)

### Features

Inspect project/source/save/share/compile behavior and limits. [Section index](features/README.md).

- [Autosave, revisions, retries, and conflicts](features/autosave.md)
- [Automatic compilation and PDF preview](features/compilation-preview.md)
- [Source projects, templates, import, and export](features/projects.md)
- [Capacity, usage accounting, and throttling](features/quotas.md)
- [Workspaces, invitations, and project sharing](features/workspaces-and-invitations.md)

### Frontend

Navigate screens, design/accessibility behavior, and local design tooling. [Section index](frontend/README.md).

- [Visual system and accessibility behavior](frontend/design-system.md)
- [Impeccable development tooling](frontend/impeccable.md)
- [Screens and component responsibilities](frontend/screens-and-components.md)

### Getting Started

Install, configure, and run the project locally. [Section index](getting-started/README.md).

- [Configuration and secrets](getting-started/configuration.md)
- [Develop with hot reload](getting-started/development.md)
- [Run the documentation website](getting-started/documentation-site.md)
- [Run the complete application](getting-started/quick-start.md)

### Operations

Deploy, recover, monitor, and troubleshoot without assuming local acceptance is public readiness. [Section index](operations/README.md).

- [Backup and restore](operations/backup-and-restore.md)
- [Public deployment requirements](operations/deployment.md)
- [Email delivery and local mailbox](operations/email.md)
- [Logs, audits, and monitoring gaps](operations/observability.md)
- [Operational runbooks](operations/runbooks.md)
- [Troubleshooting](operations/troubleshooting.md)

### Product

Understand the writing workflow, vocabulary, and shipped scope. [Section index](product/README.md).

- [Implemented scope and remaining work](product/limitations.md)
- [Product and domain vocabulary](product/overview.md)
- [User guide](product/user-guide.md)

### Reference

Find every route, contract, command, dependency, rule, and source file. [Section index](reference/README.md).

- [Anti-slop rule reference](reference/anti-slop.md)
- [Application API routes](reference/api-routes.md)
- [Command reference](reference/commands.md)
- [Input and response contracts](reference/contracts.md)
- [Dependency and runtime reference](reference/dependencies.md)
- [Exported service and library entry points](reference/domain-services.md)
- [Error semantics](reference/errors.md)
- [Frequently asked questions](reference/faq.md)
- [Glossary](reference/glossary.md)
- [Repository file inventory](reference/repository.md)

### Security

Follow current identity, authorization, validation, and execution boundaries. [Section index](security/README.md).

- [Authentication and account lifecycle](security/authentication.md)
- [RBAC, ABAC, and tenant isolation](security/authorization.md)
- [Input, secret, and execution boundaries](security/boundaries.md)

## Scope, maintenance, and sources

Implementation references at the end of chapters link to local source. The ORM/source-structure migration is documented as of 2026-10-06. The repository inventory covers every tracked non-doc file; the route inventory covers every application route handler; command/dependency tables come from the committed manifests; application DDL is reproduced exactly; auth schema is a read-only metadata snapshot of the migrated local database. No records or credentials are included.

Implemented behavior, proposed roadmap, operator setup, and previously observed test results are distinguished. There is no assertion of complete Overleaf parity, simultaneous collaboration, durable offline recovery, public production acceptance, or every theoretical exploit/third-party internals being documented. [Limitations](product/limitations.md) states those boundaries concretely.

Update the matching chapters when source changes. New routes/files/scripts/settings need matching reference entries. Generated reference snapshots are documentation, not migration code or a new build dependency. Root [README](../README.md), [DESIGN](../DESIGN.md), [PRODUCT](../PRODUCT.md), [implementation plan](../IMPLEMENTATION_PLAN.md), and [tasks](../TASKS.md) remain useful historical/top-level records; current implementation decides behavior if older plans differ.

- [Source structure](architecture/source-structure.md)
- [Drizzle ORM](data/orm.md)
