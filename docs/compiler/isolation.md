# TeX execution isolation and limits

The private supervisor authenticates `Authorization: Bearer <COMPILER_TOKEN>` with a length check plus timing-safe byte comparison. `/health` is unauthenticated and only indicates the supervisor responds; it does not compile a document or prove the Docker daemon/image is usable.

The TeX image uses Debian Bookworm, installed latexmk and TeX Live packages, non-root UID/GID 65534, `openin_any=p`, and `openout_any=p`. Its entrypoint supplies `-norc`, PDF output, nonstop mode, halt-on-error, file-line errors, no shell escape, and an output directory under `/work/output`.

French Babel support is installed through `texlive-lang-french`, including `french.ldf`. Documents can use `\usepackage[french]{babel}`. After changing installed packages, rebuild with `docker compose build compiler-image`; subsequent jobs use the updated `folio-tex:local` image. Existing build records keep their previous logs until the document is compiled again.

| Docker/job restriction | Actual value                                          |
| ---------------------- | ----------------------------------------------------- |
| Network                | `none`                                                |
| Root filesystem        | Read-only                                             |
| Capabilities           | Drop all                                              |
| Privilege escalation   | `no-new-privileges`                                   |
| Process limit          | 64                                                    |
| Memory and memory-swap | 512 MB each                                           |
| CPU                    | 1                                                     |
| File size ulimit       | 16,777,216 bytes                                      |
| `/tmp`                 | 32 MB tmpfs, noexec/nosuid                            |
| Source mount           | Only the job's bind directory or named-volume subpath |
| Accepted PDF           | At most 16,000,000 bytes                              |
| Job timeout            | 30 seconds                                            |

Source files are validated before writing, including byte/path limits. Jobs receive no web auth, database, SMTP, or Stripe environment credentials. Network/package downloads cannot occur during TeX execution.

These restrictions reduce exposure but do not make Docker socket access harmless. The supervisor can control the host daemon; Compose mounts its socket. A public service should put it on a dedicated worker host with private connectivity and verify container/host isolation under realistic adversarial workloads. The repository does not claim that acceptance has occurred.

The output directory is intentionally writable to the non-root job; sources are local per-job files. Retention stores PDFs in PostgreSQL, not the scratch volume. Failures during cleanup can require operator inspection; no general background orphan collector is shipped.

## Implementation references

- [infra/Dockerfile.compiler](../../infra/Dockerfile.compiler)
- [services/compiler/compile.ts](../../services/compiler/compile.ts)
- [services/compiler/server.ts](../../services/compiler/server.ts)
- [compose.yaml](../../compose.yaml)
