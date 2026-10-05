# Run the documentation website

The Markdown in `docs/` is also a searchable VitePress website, with section navigation, page outlines, syntax highlighting, Mermaid diagrams, dark mode, and responsive layouts. Links to implementation files open readable source snapshots. Markdown stays the source of truth; do not edit generated pages.

## Docker

From the repository root:

```sh
docker compose --profile docs up --build -d docs
```

Open [Folio documentation](http://localhost:4173). This starts only the docs service. It does not need PostgreSQL, the compiler, application credentials, or a running Next.js server. The `docs` profile keeps it optional during normal app startup.

To use another port:

```sh
FOLIO_DOCS_PORT=4180 docker compose --profile docs up --build -d docs
```

Run the startup command again after editing Markdown or source files. Docker serves a static build through Nginx; it does not mount your checkout or hot reload. Direct links to nested pages work; unknown routes return HTTP 404.

```sh
docker compose --profile docs logs docs
docker compose --profile docs stop docs
```

The host binding is loopback by default. Everyone with access to this site can read its documentation and linked implementation snapshots. For external hosting, apply your chosen access control to this developer documentation.

## Local development

```sh
npm ci --prefix docs-site
npm run docs:dev
```

Open `http://localhost:4173`. Markdown edits regenerate pages and refresh the development site. Restart after changing referenced implementation files or sidebar/theme configuration. The watcher requires Node.js 20 or newer; Docker uses Node.js 22.

```sh
npm run docs:test
npm run docs:build
npm run docs:preview
```

The docs package and lockfile are separate from the app. Installing root dependencies does not install docs dependencies. Preview serves the last static build. Build output is `docs-site/.vitepress/dist`, also suitable for static hosting with clean URL support.

## Structure and maintenance

- `docs/`: authored Markdown and section indexes.
- `docs-site/.vitepress/config.mjs`: navigation, search, and Mermaid support.
- `docs-site/.vitepress/theme/`: Folio colors and typography.
- `docs-site/scripts/prepare.mjs`: routes, sidebar titles, and relative link rewriting.
- `docs-site/scripts/dev.mjs`: Markdown watcher and development server.
- `docs-site/content/`: ignored generated chapters and source snapshots.
- `infra/Dockerfile.docs`: Node build stage and static Nginx runtime.
- `infra/Dockerfile.docs.dockerignore`: excludes actual environment files, dependencies, and generated assets while retaining linked review notes.
- `infra/nginx.docs.conf`: direct-link routing and asset caching.

Add Markdown under an existing topic directory with a `# Title`; the sidebar discovers it on regeneration. Update the Markdown indexes for checkout readers. Add new topic folders to the section list in the config. Builds check local links; localhost app/mailbox/docs URLs are treated as external examples.

Source filenames with brackets and punctuation receive literal escaped routes rather than dynamic routes or hidden files. Font/archive references have descriptive pages. `.env.example` is allowed; actual environment files, `.git`, dependency trees, and paths outside the repository are rejected by content preparation.

## Implementation references

- [docs-site/package.json](../../docs-site/package.json)
- [docs-site/scripts/prepare.mjs](../../docs-site/scripts/prepare.mjs)
- [docs-site/scripts/dev.mjs](../../docs-site/scripts/dev.mjs)
- [docs-site/.vitepress/config.mjs](../../docs-site/.vitepress/config.mjs)
- [infra/Dockerfile.docs](../../infra/Dockerfile.docs)
- [infra/nginx.docs.conf](../../infra/nginx.docs.conf)
- [compose.yaml](../../compose.yaml)
