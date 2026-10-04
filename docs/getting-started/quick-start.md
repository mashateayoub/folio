# Run the complete application

Run commands from the repository root. Use Node.js 22 or newer, npm, Docker Engine 26 or newer, and Compose v2. The Docker daemon must support volume subpaths. A browser and access to the loopback ports below are sufficient for the local UI.

```sh
npm ci
npm run setup
docker compose up -d --build
```

`npm ci` reproduces the committed dependency graph. Its postinstall step copies the PDF.js worker into `public/`. `setup` creates missing configuration and random secrets in a private `.env.local`. It preserves existing usable values and does not reset an initialized database password.

Open http://localhost:3030. Sign up with a password of 12–128 characters. Open http://localhost:8025, find the verification email, follow the link, then sign in. Verification does not automatically sign you in. The first authenticated workspace listing creates your personal workspace and sample project. Open the project from the library; compilation creates a real PDF.

| Address           | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `localhost:3030`  | Production-built local Next.js app               |
| `localhost:8025`  | Mailpit email UI                                 |
| `localhost:1025`  | Mailpit SMTP                                     |
| `127.0.0.1:55432` | PostgreSQL for host scripts                      |
| `compiler:4100`   | Compiler reachable inside Compose; not published |

```sh
docker compose ps
docker compose logs --tail=100 web compiler
docker compose down
```

Stopping with `down` preserves named volumes. Removing volumes erases local database data and is a separate, deliberate reset operation. Mailpit captures local mail; it is not an external delivery service.

For a different web port, set both mappings before starting Compose:

```sh
FOLIO_PORT=3031 FOLIO_APP_URL=http://localhost:3031 docker compose up -d
```

The host setup default `APP_URL` is `http://localhost:3000`; Compose overrides it to 3030. Review the URL when using the host development server. See [development](development.md), [configuration](configuration.md), and [troubleshooting](../operations/troubleshooting.md).

## Implementation references

- [compose.yaml](../../compose.yaml)
- [scripts/setup.mjs](../../scripts/setup.mjs)
- [src/app/page.tsx](../../src/app/page.tsx)
