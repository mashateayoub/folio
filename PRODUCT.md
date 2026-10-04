# Folio

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
People writing LaTeX documents in a browser. The user requested an Overleaf-like editor and SaaS accounts/workspaces; a narrower audience segment has not been specified.

## Product Purpose
Edit multi-file LaTeX projects and inspect a real compiled PDF in the same workspace. Organize private projects and grant team members appropriate access.

## Operating Context
Project library → source editor → acknowledged save → actual compilation → PDF preview/download. Account verification, password recovery, MFA, invitations, and team access are existing workflows.

## Capabilities and Constraints
Next.js and React application with PostgreSQL-backed projects, Better Auth, workspace RBAC/ABAC, source editing, revision conflicts, Docker compilation, PDF.js preview, and ZIP export. Live collaborative editing, billing, assets, and production deployment validation remain roadmap items. Do not imply those features are already available.

## Brand Commitments
Product name: Folio. The user explicitly delegated visual direction and authorized rebuilding all existing interfaces. No colors or visual references were pinned.

## Evidence on Hand
Source and real PDF output from the built-in sample document; actual account, membership, project, and build data. There are no supplied customer logos, testimonials, or commercial performance claims.

## Product Principles
- Give source and PDF space to work.
- State whether edits are saved and which revision the preview represents.
- Keep permissions and recovery actions clear.
- Show real project content rather than invented activity.
