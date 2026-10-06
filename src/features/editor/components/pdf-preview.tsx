"use client";

import { useEffect, useRef, useState } from "react";
import {
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  Minus,
  Plus,
  FileText,
} from "@phosphor-icons/react";
import { type PDFDocumentProxy } from "pdfjs-dist";

export default function PdfPreview({
  url,
  compiling,
}: {
  url: string | null;
  compiling: boolean;
}) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(500);
  useEffect(() => {
    if (!scroll.current) return;

    const observer = new ResizeObserver(([entry]) =>
      setAvailableWidth(entry.contentRect.width),
    );

    observer.observe(scroll.current);

    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    let task:
      ReturnType<(typeof import("pdfjs-dist"))["getDocument"]> | undefined;

    import("pdfjs-dist")
      .then(async (pdfjs) => {
        if (cancelled) return;
        setError("");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        task = pdfjs.getDocument(url);
        const pdf = await task.promise;

        if (cancelled) return;
        setDocument(pdf);
        setPage((current) => Math.min(current, pdf.numPages));
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [url]);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let cancelled = false;

    let rendering:
      | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
      | undefined;

    document
      .getPage(page)
      .then((pdfPage) => {
        if (cancelled || !canvas.current) return;
        const natural = pdfPage.getViewport({ scale: 1 });
        const fit = Math.min(1, Math.max(120, availableWidth) / natural.width);
        const viewport = pdfPage.getViewport({ scale: zoom * fit });
        const ratio = window.devicePixelRatio || 1;
        const element = canvas.current;
        element.width = Math.floor(viewport.width * ratio);
        element.height = Math.floor(viewport.height * ratio);
        element.style.width = viewport.width + "px";
        element.style.height = viewport.height + "px";
        element.dataset.rendered = "false";
        rendering = pdfPage.render({
          canvas: element,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });

        return rendering.promise.then(() => {
          if (!cancelled) element.dataset.rendered = "true";
        });
      })
      .catch((e: Error) => {
        if (!cancelled && e.name !== "RenderingCancelledException")
          setError(e.message);
      });

    return () => {
      cancelled = true;
      rendering?.cancel();
    };
  }, [document, page, zoom, availableWidth]);

  return (
    <>
      <div className="pdf-controls">
        <div className="control-group">
          <button
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>{document ? page + " / " + document.numPages : "— / —"}</span>
          <button
            aria-label="Next page"
            disabled={!document || page >= document.numPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="control-group">
          <button
            aria-label="Zoom out"
            disabled={zoom <= 0.5}
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
          >
            <Minus size={15} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Zoom in"
            disabled={zoom >= 2}
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
      <div className="pdf-scroll" ref={scroll}>
        {error ? (
          <div className="preview-empty">
            <FileText size={32} />
            <h3>Couldn’t display this PDF</h3>
            <p>{error}</p>
          </div>
        ) : !url ? (
          <div className="preview-empty">
            <div className="paper-icon">
              <FileText size={32} />
            </div>
            <h3>Your document preview</h3>
            <p>
              {compiling
                ? "Typesetting your document…"
                : "Compile your document to see the PDF here."}
            </p>
            <span>The compiled PDF appears here.</span>
          </div>
        ) : (
          <canvas
            ref={canvas}
            className="pdf-page"
            aria-label={"PDF preview, page " + page}
          />
        )}
      </div>
    </>
  );
}
