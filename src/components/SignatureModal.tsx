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
  const [penColor, setPenColor] = useState<"#0f172a" | "#2563eb">("#0f172a");

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
      penColor: penColor,
    });

    pad.addEventListener("beginStroke", () => setIsEmpty(false));
    padRef.current = pad;

    return () => {
      pad.off();
      padRef.current = null;
    };
  }, [open]);

  // Обновляем цвет кисти, если пользователь переключил радиокнопку
  useEffect(() => {
    if (padRef.current) {
      padRef.current.penColor = penColor;
    }
  }, [penColor]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg-card rounded-2xl border border-border w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-xl font-semibold text-text-primary">Draw your signature</h2>

            <div className="flex items-center gap-3 bg-bg-primary py-1 px-3 rounded-full border border-border">
                <span className="text-xs text-text-secondary">Color:</span>
                <label className="flex items-center justify-center cursor-pointer group">
                  <input
                    type="radio"
                    name="color"
                    value="#0f172a"
                    checked={penColor === "#0f172a"}
                    onChange={(e) => setPenColor(e.target.value as "#0f172a")}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full bg-slate-900 border-2 transition-transform ${penColor === "#0f172a" ? "border-accent scale-110" : "border-transparent group-hover:scale-110"}`}></div>
                </label>

                <label className="flex items-center justify-center cursor-pointer group">
                  <input
                    type="radio"
                    name="color"
                    value="#2563eb"
                    checked={penColor === "#2563eb"}
                    onChange={(e) => setPenColor(e.target.value as "#2563eb")}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full bg-blue-600 border-2 transition-transform ${penColor === "#2563eb" ? "border-accent scale-110" : "border-transparent group-hover:scale-110"}`}></div>
                </label>
            </div>
        </div>

        <div className="rounded-xl border border-border bg-[#e2e8f0] overflow-hidden shadow-inner relative">
           <div className="absolute top-2 left-2 text-[#94a3b8] text-xs pointer-events-none uppercase tracking-widest font-semibold">Sign Here</div>
          <canvas
            ref={canvasRef}
            className="w-full h-48 cursor-crosshair touch-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              padRef.current?.clear();
              setIsEmpty(true);
            }}
            className="flex-1 h-11 rounded-xl border border-border text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors font-medium"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-border text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors font-medium"
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
            className="flex-1 h-11 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
