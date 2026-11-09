# Compiler pipeline and build lifecycle

1. A verified actor sends a stored project ID and positive revision.
2. `beginBuild()` resolves compile permission under tenant lock, checks matching revision and any running record newer than 60 seconds, marks older running records failed, consumes user/monthly request quotas, and inserts a running build with a source snapshot.
3. The web route sends that snapshot to the private supervisor using a matching Bearer token and a 38-second fetch timeout.
4. The supervisor validates its own body and project contract and invokes a temporary Docker job through `compileProject()`.
5. The worker runs latexmk/pdflatex (including needed bibliography/multiple passes), reads the resulting PDF, and returns binary PDF bytes.
6. The web route validates the PDF header and 16,000,000-byte cap, stores success/failure, rechecks current session/project access, and returns build ID/revision/protected artifact URL.

The supervisor listens on 4100, limits request bodies to 1,000,000 bytes, uses a 40-second request timeout, and accepts one active job. Concurrent requests get 429 plus `Retry-After: 2`; there is no queue. The public handler declares max duration 45 seconds. The Docker client job has a 30-second timeout; cleanup gets a separate five-second allowance.

Source is written to a unique temporary directory with relative paths and writable `output/`. In host mode Docker bind-mounts that path. In Compose the supervisor and job use a named volume plus per-job subpath, avoiding host/container path mismatch. The root filename is passed as a Docker/latexmk argument, not shell-concatenated input.

Compiler output is retained from the beginning, without the former 64,000-character tail truncation. If output exceeds 16 MB, the job is stopped and explicitly reports the log limit; diagnostics captured up to that stop remain available. UTF-8 decoding preserves characters split across stream chunks. Timeout returns a CompileError 408; invalid LaTeX commonly 422; Docker startup/access/image errors 503; invalid JSON/schema 400; supervisor oversize 413. The web records failed diagnostics and keeps the UI's earlier successful PDF.

Cleanup always attempts to remove the named job container, even if the Docker CLI was killed, and removes scratch source. Running build snapshots are cleared on finish/stale failure. Successful compilation logs are returned internally, while the web success record currently stores an empty log; failure diagnostics are preserved.

## Implementation references

- [src/app/api/compile/route.ts](../../src/app/api/compile/route.ts)
- [docs/architecture/source-structure.md](../architecture/source-structure.md)
- [services/compiler/compile.ts](../../services/compiler/compile.ts)
- [services/compiler/server.ts](../../services/compiler/server.ts)


## Reading a compilation failure

The editor shows a plain-language explanation, the reported source file and line when available, and a suggested correction. Recognized errors include missing files/packages, undefined environments or commands, custom table columns, French Babel support, math mode, and unclosed arguments. Suggestions are based on the first fatal diagnostic; layout warnings are not treated as the cause of failure. Unknown diagnostics retain their original message and log.

“Exact LaTeX error and source context” is expanded by default. “Full compiler log” exposes the unmodified captured compiler output and can be downloaded as `compilation.log`. LaTeX supplies source context and engine diagnostics rather than a conventional application stack trace. No internal application stack traces or secrets are added to these logs. Failed-build records preserve the captured log without further truncation; earlier successful previews remain visible.
