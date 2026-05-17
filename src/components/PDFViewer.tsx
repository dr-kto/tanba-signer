"use client";

import { useEffect, useRef, useState } from "react";
import { pdfjs, Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  fileUrl: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTotalPages: (total: number) => void;
  overlay?: (pageIndex: number, dimensions: { width: number; height: number }) => React.ReactNode;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function PDFViewer({
  fileUrl,
  currentPage,
  onPageChange,
  onTotalPages,
  overlay,
  containerRef,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(600);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 800 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (wrapperRef.current) {
        setPageWidth(Math.min(wrapperRef.current.clientWidth - 32, 900));
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Thumbnails sidebar */}
      {numPages > 0 && (
        <div className="w-24 bg-bg-card border-r border-border overflow-y-auto flex-shrink-0 p-2 space-y-2 hidden md:block">
          {Array.from({ length: numPages }, (_, i) => (
            <button
              key={i}
              onClick={() => onPageChange(i)}
              className={`w-full rounded-lg overflow-hidden border-2 transition-all ${
                currentPage === i ? "border-accent" : "border-transparent hover:border-border-light"
              }`}
            >
              <Document file={fileUrl}>
                <Page pageNumber={i + 1} width={72} renderTextLayer={false} renderAnnotationLayer={false} />
              </Document>
              <div className="text-[10px] text-text-secondary text-center py-0.5">{i + 1}</div>
            </button>
          ))}
        </div>
      )}

      {/* Main page view */}
      <div ref={wrapperRef} className="flex-1 overflow-auto flex justify-center p-4" >
        <div ref={containerRef} className="relative">
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n);
              onTotalPages(n);
            }}
            loading={
              <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <Page
              pageNumber={currentPage + 1}
              width={pageWidth}
              renderTextLayer={false}
              onRenderSuccess={() => {
                const canvas = wrapperRef.current?.querySelector("canvas");
                if (canvas) {
                  setPageDimensions({ width: canvas.clientWidth, height: canvas.clientHeight });
                }
              }}
            />
          </Document>
          {overlay && (
            <div
              className="absolute top-0 left-0"
              style={{ width: pageDimensions.width, height: pageDimensions.height }}
            >
              {overlay(currentPage, pageDimensions)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
