# Linting, formatting, and anti-slop

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
```

ESLint runs the installed Next core-web-vitals/TypeScript configs. Combined lint then runs Oxlint with the vendored anti-slop plugin. Matching `oxlint` and `@oxlint/plugins` are pinned to 1.86.0. The script loads TypeScript through `tsx`, including on Node 20; setup recommends Node 22 because its tooling uses Node's environment parser. TypeScript is strict/noEmit and permits explicit `.ts` imports for the vendored plugin.

All generic anti-slop rules, including the native accumulating-spread companion, are errors. They cover readability spacing, unsupported accumulator copies/chains, unsafe assertions/dictionaries, broad parameter types, runtime representation checks, hidden conditional omission, mocking, and misleading names. See [rule reference](../reference/anti-slop.md) for every rule and limitation.

```sh
npm run lint:anti-slop -- --fix
npm run format
npm run lint
```

Run lint autofix for supported readability issues, then Prettier, then lint again. Formatter expansion can reveal new multiline spacing requirements; iterate until a second fix/format pass changes no files. Do not turn rules down, ignore owned source, invent SAFETY comments for unverified casts, or convert values to `any` just to pass.

Prettier 3.9.9 formats owned TS/TSX/MJS under src/tests/services/scripts and root TS/MJS. Current scripts do not format Markdown, CSS, YAML, or JSON. Vendored rules and agent tooling are excluded from application lint; the formatter's explicit targets also omit them. Preserve nested vendor licenses/provenance.

The historical install baseline was 752 findings across 80 files; cleanup resolved them with rules intact. Installation diagnostics and backup archives are excluded from the public repository. The plugin source was compared byte-for-byte with the supplied bundle at installation. Its source revision is unknown; `UPSTREAM.md` records the available provenance without local machine paths. Opt-in Effect rules are present but not registered because there is no direct Effect dependency.

## Implementation references

- [eslint.config.mjs](../../eslint.config.mjs)
- [.oxlintrc.json](../../.oxlintrc.json)
- [package.json](../../package.json)
- [tsconfig.json](../../tsconfig.json)
- [tools/oxlint/anti-slop/UPSTREAM.md](../../tools/oxlint/anti-slop/UPSTREAM.md)
