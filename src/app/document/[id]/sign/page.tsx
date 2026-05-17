"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Document as DocType } from "@/lib/types";
import SignatureModal from "@/components/SignatureModal";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), { ssr: false });

export default function SignPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setDoc(data);
        if (data.status === "signed") setSigned(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSign = async (dataUrl: string) => {
    setSubmitting(true);
    try {
      await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_data: dataUrl, status: "signed" }),
      });
      setSigned(true);
      setShowModal(false);
    } catch {
      alert("Failed to submit signature");
    } finally {
      setSubmitting(false);
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

  if (signed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold">Document Signed</h2>
        <p className="text-text-secondary">The document has been signed successfully.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-border bg-bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="font-medium truncate max-w-[200px]">{doc.file_name}</span>
          <span className="text-text-secondary text-sm">
            Page {currentPage + 1} / {totalPages}
          </span>
        </div>
        <span className="text-text-secondary text-sm">
          {doc.signature_zones.length} signature{doc.signature_zones.length !== 1 ? "s" : ""} required
        </span>
      </div>

      {/* PDF with signature zones highlighted */}
      <PDFViewer
        fileUrl={doc.file_url}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onTotalPages={setTotalPages}
        overlay={(pageIndex) => (
          <div className="absolute inset-0 pointer-events-none">
            {doc.signature_zones
              .filter((z) => z.page === pageIndex)
              .map((zone) => (
                <div
                  key={zone.id}
                  className="signature-zone absolute flex items-center justify-center"
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                  }}
                >
                  <span className="text-accent text-xs select-none">Sign here</span>
                </div>
              ))}
          </div>
        )}
      />

      {/* Fixed bottom bar */}
      <div className="border-t border-border bg-bg-card p-4 flex justify-center">
        <button
          onClick={() => setShowModal(true)}
          className="h-12 px-8 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium text-lg transition-colors"
        >
          Sign Document
        </button>
      </div>

      <SignatureModal
        open={showModal}
        onClose={() => !submitting && setShowModal(false)}
        onSubmit={handleSign}
      />
    </div>
  );
}
