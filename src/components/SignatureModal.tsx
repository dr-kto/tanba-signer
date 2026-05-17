"use client";

import { useRef, useEffect, useState } from "react";
import SignaturePadLib from "signature_pad";

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dataUrl: string) => void;
}

export default function SignatureModal({ open, onClose, onSubmit }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (!open || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: "rgba(0,0,0,0)",
      penColor: "#fafafa",
    });

    pad.addEventListener("beginStroke", () => setIsEmpty(false));
    padRef.current = pad;

    return () => {
      pad.off();
      padRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg-card rounded-2xl border border-border w-full max-w-md p-6 space-y-4">
        <h2 className="text-xl font-semibold">Draw your signature</h2>

        <div className="rounded-xl border border-border bg-bg-primary overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-48 cursor-crosshair touch-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              padRef.current?.clear();
              setIsEmpty(true);
            }}
            className="flex-1 h-11 rounded-xl border border-border text-text-secondary hover:bg-bg-card-hover transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-border text-text-secondary hover:bg-bg-card-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (padRef.current && !padRef.current.isEmpty()) {
                onSubmit(padRef.current.toDataURL("image/png"));
              }
            }}
            disabled={isEmpty}
            className="flex-1 h-11 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
