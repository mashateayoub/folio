# Automatic compilation and PDF preview

Autosave and compilation are separate operations. Auto compile waits 1,200 ms after source changes, runs only inside the editor when enabled and permitted, and skips a source key already attempted. Manual compilation uses the button or Ctrl/Command+Enter. Both wait for autosave before submitting the stored revision.

The browser captures a source snapshot/key and increments a request generation. It requests `/api/compile`, fetches the protected PDF URL on success, creates a Blob URL, and revokes superseded Blob URLs. A result is displayed only if generation and source still match. A completion for older source is marked stale instead of replacing the current preview.

A LaTeX error shows diagnostics while retaining the last successful PDF. Network interruptions and quota/busy failures are visible. The server does not consume arbitrary unsaved source from this route: it authorizes a saved project/revision and captures it itself. Failed admitted compilation requests may consume quota; monthly allowance counts requests, not pages or successful PDFs.

On reopening, the browser queries recent builds, chooses a PDF-bearing record, and marks whether its revision matches current source. The saved artifact URL is independently authorized. Retained artifacts can disappear through retention or revocation; they are not permanent share links.

PDF.js loads dynamically and uses the local copied worker `/pdf.worker.min.mjs`. The canvas supports one displayed page, zoom from 50% to 200%, width-fit scaling, and device-pixel-ratio rendering. ResizeObserver updates available width. Loading/render tasks are destroyed or canceled on changes. Test code uses `data-rendered` to wait for a real canvas render.

A responsive source/preview switch and file-panel toggle provide mobile access. This is PDF refresh after a typing pause, not character-by-character HTML rendering or simultaneous collaboration. See [compiler pipeline](../compiler/pipeline.md) for server limits.

## Implementation references

- [src/components/workspace.tsx](../../src/components/workspace.tsx)
- [src/components/pdf-preview.tsx](../../src/components/pdf-preview.tsx)
- [scripts/copy-pdf-worker.mjs](../../scripts/copy-pdf-worker.mjs)
- [src/app/api/compile/route.ts](../../src/app/api/compile/route.ts)
