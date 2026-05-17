"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      if (file.type !== "application/pdf") {
        setError("Only PDF files are allowed");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File too large (max 10MB)");
        return;
      }

      setUploading(true);
      const form = new FormData();
      form.append("file", file);

      try {
        const res = await fetch("/api/documents", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        router.push(`/document/${data.id}/edit`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Upload failed");
        setUploading(false);
      }
    },
    [router]
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-3">
          <span className="text-accent">Tanba</span>
        </h1>
        <p className="text-text-secondary text-lg">
          Upload a PDF, mark where to sign, share the link
        </p>
      </div>

      <label
        className={`relative w-full max-w-lg aspect-[4/3] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${
          dragging
            ? "border-accent bg-zone-fill scale-[1.02]"
            : "border-border hover:border-border-light hover:bg-bg-card"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) upload(file);
        }}
      >
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />

        {uploading ? (
          <>
            <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-text-secondary">Uploading...</span>
          </>
        ) : (
          <>
            <svg
              className="w-12 h-12 text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
              />
            </svg>
            <span className="text-text-secondary text-lg">
              Drop your PDF here or click to select
            </span>
            <span className="text-text-secondary/50 text-sm">Max 10MB</span>
          </>
        )}
      </label>

      {error && (
        <p className="mt-4 text-danger text-sm">{error}</p>
      )}
    </div>
  );
}
