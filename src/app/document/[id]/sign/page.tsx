"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Document as DocType } from "@/lib/types";
import { PDFDocument } from "pdf-lib";
import SignatureModal from "@/components/SignatureModal";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), { ssr: false });

export default function SignPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setDoc(data);
        if (data.status === "signed" && data.signature_data) {
          setSignatureData(data.signature_data);
        }
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
      setSignatureData(dataUrl);
      setShowModal(false);
    } catch {
      alert("Failed to submit signature");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!doc || !signatureData) return;
    setDownloading(true);
    try {
      const pdfBytes = await fetch(doc.file_url).then((r) => r.arrayBuffer());
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const sigImageBytes = await fetch(signatureData).then((r) => r.arrayBuffer());
      const sigImage = await pdfDoc.embedPng(sigImageBytes);

      for (const zone of doc.signature_zones) {
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

  return (
    <div className="h-screen flex flex-col">
      <div className="h-14 border-b border-border bg-bg-card flex items-center justify-between px-4 flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="font-medium truncate max-w-[200px]">{doc.file_name}</span>
          {signatureData && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">Signed</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-text-secondary text-sm">
            {doc.signature_zones.length} signature{doc.signature_zones.length !== 1 ? "s" : ""} required
          </span>
          {signatureData && (
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

      {signatureData && (
        <div className="bg-success/10 border-b border-success/30 px-4 py-3 text-center text-success text-sm flex-shrink-0">
          Document signed successfully. Below is a preview of how your signatures will appear.
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <PDFViewer
          fileUrl={doc.file_url}
          overlay={(pageIndex) => (
            <div className="absolute inset-0 pointer-events-none">
              {doc.signature_zones
                .filter((z) => z.page === pageIndex)
                .map((zone) => (
                  <div
                    key={zone.id}
                    className="absolute flex items-center justify-center border-2 border-dashed border-zone-border overflow-hidden"
                    style={{
                      left: `${zone.x}%`,
                      top: `${zone.y}%`,
                      width: `${zone.width}%`,
                      height: `${zone.height}%`,
                      background: signatureData ? "transparent" : "var(--color-zone-fill)",
                    }}
                  >
                    {signatureData ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={signatureData}
                        alt="Signature"
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <span className="text-accent text-xs select-none">Sign here</span>
                    )}
                  </div>
                ))}
            </div>
          )}
        />
      </div>

      {!signatureData && (
        <div className="border-t border-border bg-bg-card p-4 flex justify-center flex-shrink-0 z-20">
          <button
            onClick={() => setShowModal(true)}
            className="h-12 px-8 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium text-lg transition-colors"
          >
            Sign Document
          </button>
        </div>
      )}

      <SignatureModal
        open={showModal}
        onClose={() => !submitting && setShowModal(false)}
        onSubmit={handleSign}
      />
    </div>
  );
}
