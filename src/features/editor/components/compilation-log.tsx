import { X, Download } from "@phosphor-icons/react";
import { compilationDiagnostic } from "@/features/editor/lib/compilation-diagnostic";

export default function CompilationLog({
  log,
  status,
  onClose,
}: {
  log: string;
  status: string;
  onClose: () => void;
}) {
  const diagnostic = compilationDiagnostic(log, status);

  function downloadLog() {
    const url = URL.createObjectURL(
      new Blob([log], { type: "text/plain;charset=utf-8" }),
    );

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "compilation.log";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  return (
    <section className="log-panel" aria-label="Compilation diagnostics">
      <div className="log-heading">
        <strong>Compilation log</strong>
        <button
          className="icon-button"
          aria-label="Close compilation log"
          onClick={onClose}
        >
          <X size={15} />
        </button>
      </div>
      <div className="compilation-explanation" role="alert">
        <h3>{diagnostic.title}</h3>
        {diagnostic.line && (
          <p className="compilation-location">
            {diagnostic.file || "Source"}, line {diagnostic.line}
          </p>
        )}
        <p>{diagnostic.explanation}</p>
        <p>{diagnostic.suggestion}</p>
      </div>
      {diagnostic.exact && (
        <details open>
          <summary>Exact LaTeX error and source context</summary>
          <pre>{diagnostic.exact}</pre>
        </details>
      )}
      {log && (
        <>
          <details>
            <summary>Full compiler log</summary>
            <p>
              Unmodified compiler output, including package loading and source
              context. LaTeX does not produce a conventional stack trace.
            </p>
            <pre>{log}</pre>
          </details>
          <button className="download-compiler-log" onClick={downloadLog}>
            <Download size={14} /> Download full log
          </button>
        </>
      )}
    </section>
  );
}
