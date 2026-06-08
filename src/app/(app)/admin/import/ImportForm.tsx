"use client";

import { useRef, useState, useTransition } from "react";
import { importMembers, type ImportResult } from "./actions";

export function ImportForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setResult(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const r = await importMembers(fd);
      setResult(r);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-line bg-card px-6 py-10 text-center transition hover:border-emerald hover:bg-cream"
      >
        <div className="text-4xl">📂</div>
        <p className="mt-2 font-semibold text-ink">
          {file ? file.name : "Click to choose Excel file"}
        </p>
        <p className="mt-1 text-sm text-ink/50">
          .xlsx only · filled with member data from the template
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!file || isPending}
        className="w-full rounded-2xl bg-emerald py-3 font-semibold text-white transition disabled:opacity-40"
      >
        {isPending ? "Importing…" : "Import Members"}
      </button>

      {/* Results */}
      {result && (
        <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {result.errors.length === 0 ? "✅" : "⚠️"}
            </span>
            <div>
              <div className="font-semibold text-ink">
                {result.success} / {result.total} members imported
              </div>
              {result.errors.length === 0 ? (
                <div className="text-sm text-good">
                  Sab successfully import ho gaye 🎉
                </div>
              ) : (
                <div className="text-sm text-warn">
                  {result.errors.length} rows mein error hai — neeche dekho
                </div>
              )}
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-xl bg-bad/10 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-bad">
                Errors
              </p>
              {result.errors.map((e, i) => (
                <div key={i} className="text-sm text-ink">
                  <span className="font-semibold">Row {e.row}</span>
                  {e.name ? ` · ${e.name}` : ""} —{" "}
                  <span className="text-bad">{e.error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
