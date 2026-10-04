# Develop with hot reload

Use containers for PostgreSQL and the TeX image, and run Next.js and the compiler supervisor on the host. This avoids rebuilding the web image for each source edit.

```sh
npm ci
npm run setup
docker compose up -d postgres mailpit
docker build -t folio-tex:local -f infra/Dockerfile.compiler .
npm run db:migrate
```

Set `APP_URL=http://127.0.0.1:3001` in `.env.local`. Keep `DATABASE_URL` pointed at the host database port 55432, `SMTP_HOST=127.0.0.1`, and `COMPILER_URL=http://127.0.0.1:4100`. These values differ from container service names.

Terminal one:

```sh
npm run compiler
```

Terminal two:

```sh
npm run dev -- --port 3001
```

Open http://127.0.0.1:3001. The host compiler requires Docker CLI access and creates short-lived isolated TeX containers. Do not run a second host compiler on the same port. Compose's compiler has no published port, so these deployments are separate processes.

Next.js loads `.env.local`; compiler, migration, integration, and billing commands use Node's `--env-file` explicitly. Restart a process after changing its environment. A Compose restart alone does not replace its original environment: recreate the container.

Before changing Next.js integration code, read the relevant installed guide under `node_modules/next/dist/docs/`, as required by `AGENTS.md`. This project uses asynchronous route parameters and asynchronous `headers()`.

For frontend design tooling, see [Impeccable](../frontend/impeccable.md). For test URLs and Chrome configuration, see [testing](../development/testing.md). Do not use `.env.local` from a public deployment as a development fixture.

## Implementation references

- [AGENTS.md](../../AGENTS.md)
- [package.json](../../package.json)
- [src/app/api/projects/[id]/route.ts](../../src/app/api/projects/[id]/route.ts)
