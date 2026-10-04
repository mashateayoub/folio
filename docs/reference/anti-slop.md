# Anti-slop rule reference

The configured generic plugin is `tools/oxlint/anti-slop/index.ts`; all rules below are errors. They inspect supported AST/scope cases and are not a full type-aware proof of behavior. Read the vendored implementation before assuming a pattern is covered.

| Rule                                                  | Intent                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `oxc/no-accumulating-spread`                          | Avoid repeatedly spreading an accumulator into fresh arrays/objects                       |
| `anti-slop/no-array-filter-map`                       | Avoid supported redundant eager filter/map array chains                                   |
| `anti-slop/no-reduce-accumulator-copy`                | Catch supported non-spread accumulator copies, e.g. Object.assign/concat/slice/Array.from |
| `anti-slop/no-chained-type-assertions`                | Reject assertion chains that discard type evidence                                        |
| `anti-slop/no-conditional-empty-object-spread`        | Make property omission explicit rather than spreading a conditional empty object          |
| `anti-slop/no-known-value-widening`                   | Preserve known type evidence instead of unnecessary widening                              |
| `anti-slop/no-module-mocking`                         | Discourage supported module mocking patterns                                              |
| `anti-slop/no-object-parameters`                      | Avoid broad object parameters without owner contracts                                     |
| `anti-slop/no-reflect-apply`                          | Avoid reflected invocation that obscures the callable contract                            |
| `anti-slop/no-reflect-get`                            | Avoid reflected property access that obscures the object contract                         |
| `anti-slop/no-runtime-typeof`                         | Parse external representations at boundaries and branch on domain values                  |
| `anti-slop/no-shape-in-symbol-names`                  | Avoid supported names that advertise representation instead of domain meaning             |
| `anti-slop/no-unknown-parameters`                     | Prefer named/parsed parameter contracts over explicit unknown inputs                      |
| `anti-slop/no-unknown-returns`                        | Avoid explicit unknown return contracts                                                   |
| `anti-slop/no-unknown-type-aliases`                   | Avoid aliases that merely hide unknown contracts                                          |
| `anti-slop/no-unsafe-dictionary-type`                 | Use concrete value contracts in dictionaries                                              |
| `anti-slop/no-widen-then-assert`                      | Avoid discarding precision then asserting it back                                         |
| `anti-slop/require-readable-spacing`                  | Apply supported blank-line/statement separation                                           |
| `anti-slop/require-safety-comment-for-type-assertion` | Require checked SAFETY justification for non-const assertions                             |

For filter/map changes, examine callback order/indexes, sparse arrays, thisArg, and receiver types; do not mechanically rewrite. Iterator-helper alternatives need actual runtime support. Accumulator rules do not analyze every indirect callback/helper or nested accumulator structure. Mutable fresh local accumulators are allowed.

Five bundled Effect rules are opt-in and currently inactive: no-manual-effect-error-tag, no-manual-tag-comparison, no-manual-tagged-construction, no-service-constructor-imports, prefer-effect-match. Register them only for a direct Effect dependency or explicit request. The service-constructor rule supports relative project imports, not every alias path.

Readability enforcement includes a self-contained vendored ESLint Stylistic implementation; its nested LICENSE and UPSTREAM.md must remain. The root UPSTREAM records unknown original revision honestly, a SHA-256, and a recoverable pristine archive. The added historical diagnostics describe the installation baseline. No source-rule deviation was needed for current cleanup.

Update the vendor with provenance/local-diff review, matching engine/plugin versions, and validation. Keep legitimate owner contracts and boundary parsing; an invented SAFETY comment is not a fix. [Code quality workflow](../development/code-quality.md) documents stable fix/format passes.

## Implementation references

- [.oxlintrc.json](../../.oxlintrc.json)
- [tools/oxlint/anti-slop/index.ts](../../tools/oxlint/anti-slop/index.ts)
- [tools/oxlint/anti-slop/UPSTREAM.md](../../tools/oxlint/anti-slop/UPSTREAM.md)
- [tools/oxlint/anti-slop/vendor/eslint-stylistic/UPSTREAM.md](../../tools/oxlint/anti-slop/vendor/eslint-stylistic/UPSTREAM.md)
