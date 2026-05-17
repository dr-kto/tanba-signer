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

  return (
    <div ref={wrapperRef} className="flex-1 overflow-auto p-4">
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages: n }) => {
          setNumPages(n);
          onTotalPages?.(n);
        }}
        loading={
          <div className="flex items-center justify-center h-96">
            <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4">
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i} className="relative">
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
  );
}
