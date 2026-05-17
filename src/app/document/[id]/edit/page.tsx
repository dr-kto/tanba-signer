"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { SignatureZone, Document as DocType } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), { ssr: false });

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [zones, setZones] = useState<SignatureZone[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const getRelativePos = useCallback(
    (e: React.MouseEvent | React.TouchEvent, dims: { width: number; height: number }) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      return {
        x: ((clientX - rect.left) / dims.width) * 100,
        y: ((clientY - rect.top) / dims.height) * 100,
      };
    },
    []
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_zones: zones, status: "pending" }),
      });
      const signUrl = `${window.location.origin}/document/${id}/sign`;
      await navigator.clipboard.writeText(signUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert("Failed to save");
    } finally {
      setSaving(false);
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
          <span className="text-text-secondary text-sm">
            Page {currentPage + 1} / {totalPages}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-text-secondary text-sm">{zones.length} zone{zones.length !== 1 ? "s" : ""}</span>
          <button
            onClick={handleSave}
            disabled={zones.length === 0 || saving}
            className="h-9 px-5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : copied ? "Link copied!" : "Done & Copy Link"}
          </button>
        </div>
      </div>

      {/* Hint */}
      <div className="bg-bg-card/50 border-b border-border px-4 py-2 text-center text-text-secondary text-sm">
        Draw rectangles on the PDF to mark where signatures should go. Click a zone to delete it.
      </div>

      {/* PDF with overlay */}
      <PDFViewer
        fileUrl={doc.file_url}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onTotalPages={setTotalPages}
        containerRef={containerRef}
        overlay={(pageIndex, dims) => (
          <div
            className="absolute inset-0 cursor-crosshair"
            onMouseDown={(e) => {
              const pos = getRelativePos(e, dims);
              setDrawing(true);
              setDrawStart(pos);
              setDrawCurrent(pos);
            }}
            onMouseMove={(e) => {
              if (!drawing) return;
              setDrawCurrent(getRelativePos(e, dims));
            }}
            onMouseUp={() => {
              if (drawing && drawStart && drawCurrent) {
                const x = Math.min(drawStart.x, drawCurrent.x);
                const y = Math.min(drawStart.y, drawCurrent.y);
                const width = Math.abs(drawCurrent.x - drawStart.x);
                const height = Math.abs(drawCurrent.y - drawStart.y);
                if (width > 2 && height > 2) {
                  setZones((prev) => [...prev, { id: uuidv4(), page: pageIndex, x, y, width, height }]);
                }
              }
              setDrawing(false);
              setDrawStart(null);
              setDrawCurrent(null);
            }}
            onTouchStart={(e) => {
              const pos = getRelativePos(e, dims);
              setDrawing(true);
              setDrawStart(pos);
              setDrawCurrent(pos);
            }}
            onTouchMove={(e) => {
              if (!drawing) return;
              setDrawCurrent(getRelativePos(e, dims));
            }}
            onTouchEnd={() => {
              if (drawing && drawStart && drawCurrent) {
                const x = Math.min(drawStart.x, drawCurrent.x);
                const y = Math.min(drawStart.y, drawCurrent.y);
                const width = Math.abs(drawCurrent.x - drawStart.x);
                const height = Math.abs(drawCurrent.y - drawStart.y);
                if (width > 2 && height > 2) {
                  setZones((prev) => [...prev, { id: uuidv4(), page: pageIndex, x, y, width, height }]);
                }
              }
              setDrawing(false);
              setDrawStart(null);
              setDrawCurrent(null);
            }}
          >
            {/* Existing zones on this page */}
            {zones
              .filter((z) => z.page === pageIndex)
              .map((zone) => (
                <div
                  key={zone.id}
                  className="signature-zone absolute flex items-center justify-center group"
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setZones((prev) => prev.filter((z) => z.id !== zone.id));
                  }}
                >
                  <span className="text-accent text-xs opacity-0 group-hover:opacity-100 transition-opacity select-none">
                    Click to remove
                  </span>
                </div>
              ))}

            {/* Drawing preview */}
            {drawing && drawStart && drawCurrent && (
              <div
                className="absolute border-2 border-accent bg-zone-fill pointer-events-none"
                style={{
                  left: `${Math.min(drawStart.x, drawCurrent.x)}%`,
                  top: `${Math.min(drawStart.y, drawCurrent.y)}%`,
                  width: `${Math.abs(drawCurrent.x - drawStart.x)}%`,
                  height: `${Math.abs(drawCurrent.y - drawStart.y)}%`,
                }}
              />
            )}
          </div>
        )}
      />
    </div>
  );
}
