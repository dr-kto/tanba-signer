"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { SignatureZone, Document as DocType } from "@/lib/types";
import { PDFDocument } from "pdf-lib";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), { ssr: false });

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [zones, setZones] = useState<SignatureZone[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [draggingZone, setDraggingZone] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setDoc(data);
        if (data.signature_zones?.length) setZones(data.signature_zones);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent, zoneId: string) => {
      e.stopPropagation();
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone) return;
      const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
      setDraggingZone(zoneId);
      setDragOffset({
        x: ((e.clientX - rect.left) / rect.width) * 100 - zone.x,
        y: ((e.clientY - rect.top) / rect.height) * 100 - zone.y,
      });
    },
    [zones]
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingZone) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.x;
      const y = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.y;
      setZones((prev) =>
        prev.map((z) =>
          z.id === draggingZone
            ? { ...z, x: Math.max(0, Math.min(100 - z.width, x)), y: Math.max(0, Math.min(100 - z.height, y)) }
            : z
        )
      );
    },
    [draggingZone, dragOffset]
  );

  const handleDragEnd = useCallback(async () => {
    if (!draggingZone) return;
    setDraggingZone(null);
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature_zones: zones }),
    });
  }, [draggingZone, id, zones]);

  const handleDownload = async () => {
    if (!doc?.signature_data) return;
    setDownloading(true);

    try {
      const pdfBytes = await fetch(doc.file_url).then((r) => r.arrayBuffer());
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const sigImageBytes = await fetch(doc.signature_data).then((r) => r.arrayBuffer());
      const sigImage = await pdfDoc.embedPng(sigImageBytes);

      for (const zone of zones) {
        const page = pdfDoc.getPage(zone.page);
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const x = (zone.x / 100) * pageWidth;
        const y = pageHeight - ((zone.y / 100) * pageHeight) - ((zone.height / 100) * pageHeight);
        const w = (zone.width / 100) * pageWidth;
        const h = (zone.height / 100) * pageHeight;

        page.drawImage(sigImage, { x, y, width: w, height: h });
      }

      const finalBytes = await pdfDoc.save();
      const blob = new Blob([finalBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signed_${doc.file_name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-secondary">Document not found</p>
      </div>
    );
  }

  const isSigned = doc.status === "signed" && doc.signature_data;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-border bg-bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-text-secondary hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-medium truncate max-w-[200px]">{doc.file_name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isSigned ? "bg-success/20 text-success" : "bg-accent/20 text-accent"}`}>
            {isSigned ? "Signed" : "Pending"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isSigned && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="h-9 px-5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-40"
            >
              {downloading ? "Generating..." : "Download PDF"}
            </button>
          )}
        </div>
      </div>

      {!isSigned && (
        <div className="bg-bg-card/50 border-b border-border px-4 py-2 text-center text-text-secondary text-sm">
          Waiting for signature. Share this link: {typeof window !== "undefined" && `${window.location.origin}/document/${id}/sign`}
        </div>
      )}

      {isSigned && (
        <div className="bg-bg-card/50 border-b border-border px-4 py-2 text-center text-text-secondary text-sm">
          Drag signatures to reposition them, then download.
        </div>
      )}

      {/* PDF with signatures */}
      <PDFViewer
        fileUrl={doc.file_url}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onTotalPages={setTotalPages}
        overlay={(pageIndex, dims) => (
          <div
            className="absolute inset-0"
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            {zones
              .filter((z) => z.page === pageIndex)
              .map((zone) => (
                <div
                  key={zone.id}
                  className={`absolute border-2 border-dashed border-zone-border flex items-center justify-center overflow-hidden ${
                    isSigned ? "cursor-grab active:cursor-grabbing" : ""
                  }`}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                  }}
                  onMouseDown={(e) => isSigned && handleDragStart(e, zone.id)}
                >
                  {isSigned && doc.signature_data ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={doc.signature_data}
                      alt="Signature"
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-accent text-xs select-none">Awaiting signature</span>
                  )}
                </div>
              ))}
          </div>
        )}
      />
    </div>
  );
}
