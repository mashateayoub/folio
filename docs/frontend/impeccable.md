# Impeccable development tooling

The root layout contains an empty fragment inside `process.env.NODE_ENV === "development"`. `.impeccable/live/config.json` directs live tooling to insert before that fragment's closing `</>` using JSX comment syntax. The injection slot is specifically inside the development guard; placing a helper elsewhere could expose it in a production render.

`NODE_ENV=production` excludes the helper at rendering/build time. Compose builds/runs production Next, so the local complete-app URL is not itself an Impeccable live development server. Use host Next development when using live design tools.

Git ignores `.impeccable/live/*` except its committed configuration and ignores generated review PNGs. Docker excludes the entire live and review directories. Design metadata, surface notes, and written review verdicts are committed reference material. Production application behavior must not depend on the live server or review assets.

The repository does not provide an `impeccable` npm script or guarantee an installed external CLI invocation. Follow the installed tool's session instructions rather than inventing a launch command. This page describes the app's integration and boundaries.

After changes, inspect production-rendered sign-in HTML and browser network requests to ensure no live helper appears, then run build/browser checks. Preserve the development guard when changing layout or injection configuration. Production verification during the current implementation found no live helper in the sign-in response.

## Implementation references

- [src/app/layout.tsx](../../src/app/layout.tsx)
- [.impeccable/live/config.json](../../.impeccable/live/config.json)
- [.gitignore](../../.gitignore)
- [.dockerignore](../../.dockerignore)
