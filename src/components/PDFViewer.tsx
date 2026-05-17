"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { pdfjs, Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PageDimensions {
  width: number;
  height: number;
}

interface PDFViewerProps {
  fileUrl: string;
  onTotalPages?: (total: number) => void;
  overlay?: (pageIndex: number, dimensions: PageDimensions) => React.ReactNode;
}

export default function PDFViewer({
  fileUrl,
  onTotalPages,
  overlay,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(600);
  const [pageDims, setPageDims] = useState<Record<number, PageDimensions>>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activePage, setActivePage] = useState(0);

  const updateWidth = useCallback(() => {
    if (wrapperRef.current) {
      setPageWidth(Math.min(wrapperRef.current.clientWidth - 32, 900));
    }
  }, []);

  useEffect(() => {
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [updateWidth]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || numPages === 0) return;

    const handleScroll = () => {
      const scrollTop = wrapper.scrollTop;
      const wrapperCenter = scrollTop + wrapper.clientHeight / 2;
      let closest = 0;
      let closestDist = Infinity;

      pageRefs.current.forEach((el, i) => {
        if (!el) return;
        const top = el.offsetTop;
        const center = top + el.clientHeight / 2;
        const dist = Math.abs(wrapperCenter - center);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });

      setActivePage(closest);
    };

    wrapper.addEventListener("scroll", handleScroll, { passive: true });
    return () => wrapper.removeEventListener("scroll", handleScroll);
  }, [numPages]);

  const scrollToPage = (index: number) => {
    const el = pageRefs.current[index];
    if (el && wrapperRef.current) {
      wrapperRef.current.scrollTo({
        top: el.offsetTop - 16,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="h-full w-full relative flex">
      <div ref={wrapperRef} className="flex-1 overflow-auto p-4">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n);
            pageRefs.current = new Array(n).fill(null);
            onTotalPages?.(n);
          }}
          loading={
            <div className="flex items-center justify-center h-96">
              <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <div className="flex flex-col items-center gap-6">
            {Array.from({ length: numPages }, (_, i) => (
              <div
                key={i}
                ref={(el) => { pageRefs.current[i] = el; }}
                className="relative shadow-lg"
              >
                <Page
                  pageNumber={i + 1}
                  width={pageWidth}
                  renderTextLayer={false}
                  onRenderSuccess={() => {
                    const pages = wrapperRef.current?.querySelectorAll(".react-pdf__Page");
                    const pageEl = pages?.[i];
                    const canvas = pageEl?.querySelector("canvas");
                    if (canvas) {
                      setPageDims((prev) => ({
                        ...prev,
                        [i]: { width: canvas.clientWidth, height: canvas.clientHeight },
                      }));
                    }
                  }}
                />
                {overlay && pageDims[i] && (
                  <div
                    className="absolute top-0 left-0"
                    style={{ width: pageDims[i].width, height: pageDims[i].height }}
                  >
                    {overlay(i, pageDims[i])}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Document>
      </div>

      {numPages > 1 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-bg-card/90 backdrop-blur-sm rounded-xl p-1.5 border border-border z-10 shadow-lg">
          {Array.from({ length: numPages }, (_, i) => (
            <button
              key={i}
              onClick={() => scrollToPage(i)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                activePage === i
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
