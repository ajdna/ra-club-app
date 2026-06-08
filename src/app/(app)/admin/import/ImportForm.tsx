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

  const processed = result ? result.inserted + result.updated + result.skipped : 0;
  const allOk = result && result.errors.length === 0;

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
        {isPending ? "Importing…" : "Import / Sync Members"}
      </button>

      {/* Results */}
      {result && (
        <div className="rounded-2xl border border-line bg-card p-4 space-y-4">
          {/* Summary header */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">{allOk ? "✅" : "⚠️"}</span>
            <div>
              <div className="font-semibold text-ink">
                {processed} / {result.total} rows processed
              </div>
              <div className="text-sm text-ink/60">
                {allOk
                  ? "Sab successfully import/sync ho gaye 🎉"
                  : `${result.errors.length} row${result.errors.length === 1 ? "" : "s"} mein error — neeche dekho`}
              </div>
            </div>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-emerald/10 py-2">
              <div className="text-lg font-bold text-emerald">{result.inserted}</div>
              <div className="text-xs text-ink/60">New</div>
            </div>
            <div className="rounded-xl bg-blue-50 py-2">
              <div className="text-lg font-bold text-blue-600">{result.updated}</div>
              <div className="text-xs text-ink/60">Updated</div>
            </div>
            <div className="rounded-xl bg-ink/5 py-2">
              <div className="text-lg font-bold text-ink/40">{result.skipped}</div>
              <div className="text-xs text-ink/60">No change</div>
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="rounded-xl bg-red-50 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Errors
              </p>
              {result.errors.map((e, i) => (
                <div key={i} className="text-sm text-ink">
                  <span className="font-semibold">Row {e.row}</span>
                  {e.name ? ` · ${e.name}` : ""} —{" "}
                  <span className="text-red-600">{e.error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
