"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RecentDoc {
  id: string;
  name: string;
  date: string;
}

export default function Home() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("tanba_recent_docs");
    if (saved) {
      try {
        setRecentDocs(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

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

        // We don't save to localStorage here. We save when they configure zones and click Done.
        router.push(`/document/${data.id}/edit`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Upload failed");
        setUploading(false);
      }
    },
    [router]
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 overflow-y-auto">
      <div className="w-full max-w-lg mb-12 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-3">
          <span className="text-accent">Tanba</span>
        </h1>
        <p className="text-text-secondary text-lg">
          Upload a PDF, mark where to sign, share the link
        </p>
      </div>

      <label
        className={`relative w-full max-w-lg aspect-[4/3] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 mb-12 ${
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

      {error && <p className="mt-4 text-danger text-sm">{error}</p>}

      {recentDocs.length > 0 && (
        <div className="w-full max-w-lg mt-8 flex flex-col">
          <h2 className="text-text-secondary font-medium uppercase tracking-wider text-xs mb-4 select-none">
            Recent Documents
          </h2>
          <div className="flex flex-col gap-2">
            {recentDocs.map((d) => (
              <Link
                key={d.id}
                href={`/document/${d.id}/review`}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-bg-card hover:bg-bg-card-hover transition-colors"
              >
                <div className="flex flex-col overflow-hidden">
                  <span className="font-medium text-text-primary truncate">{d.name}</span>
                  <span className="text-xs text-text-secondary mt-1">
                    {new Date(d.date).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                </div>
                <svg className="w-5 h-5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
