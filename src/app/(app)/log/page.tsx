"use client";

import { useState, useTransition } from "react";
import { logMyWeight, markMyAttendance } from "../my-progress/actions";

export default function LogPage() {
  const [weight, setWeight] = useState("");
  const [present, setPresent] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function saveWeight() {
    const w = parseFloat(weight);
    start(async () => {
      const r = await logMyWeight(w);
      setMsg(r.ok ? { ok: true, text: "Weight log ho gaya ✓" } : { ok: false, text: r.error });
      if (r.ok) setWeight("");
    });
  }

  function markPresent() {
    start(async () => {
      const r = await markMyAttendance();
      setMsg(r.ok ? { ok: true, text: "Aaj present mark ho gaya ✓" } : { ok: false, text: r.error });
      if (r.ok) setPresent(true);
    });
  }

  return (
    <main className="px-4 pb-24 pt-5">
      <header className="mb-4 px-1">
        <h1 className="font-display text-[26px] font-medium tracking-tight text-ink">Log</h1>
        <p className="mt-1 text-[13px] font-medium text-ink-2">Aaj ka weight aur attendance daalein</p>
      </header>

      {msg && (
        <p
          role="status"
          className={`mb-4 rounded-[14px] px-4 py-3 text-[13.5px] font-medium ${
            msg.ok ? "bg-emerald-soft text-emerald" : "bg-bad/10 text-bad"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* Weight */}
      <div className="rounded-[18px] border border-line bg-card p-[18px]">
        <label className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-sage-d">
          Aaj ka weight
        </label>
        <div className="mt-3 flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.0"
              className="h-[54px] w-full rounded-[14px] border border-line bg-cream pl-4 pr-12 text-[18px] font-medium text-ink outline-none transition focus:border-emerald focus:ring-4 focus:ring-emerald/10 placeholder:text-ink-3"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-3">kg</span>
          </div>
          <button
            type="button"
            onClick={saveWeight}
            disabled={pending || !weight}
            className="h-[54px] shrink-0 rounded-[14px] bg-emerald px-6 text-[15px] font-semibold text-white shadow-[0_8px_18px_var(--emerald-soft)] transition hover:bg-emerald-2 disabled:opacity-50"
          >
            {pending ? "..." : "Save"}
          </button>
        </div>
      </div>

      {/* Attendance */}
      <div className="mt-4 rounded-[18px] border border-line bg-card p-[18px]">
        <label className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-sage-d">
          Aaj ki attendance
        </label>
        <button
          type="button"
          onClick={markPresent}
          disabled={pending || present}
          className={`mt-3 flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold transition disabled:opacity-60 ${
            present ? "bg-emerald-soft text-emerald" : "bg-emerald text-white hover:bg-emerald-2 shadow-[0_8px_18px_var(--emerald-soft)]"
          }`}
        >
          {present ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7" /></svg>
              Present marked
            </>
          ) : (
            "Mark me present today"
          )}
        </button>
      </div>
    </main>
  );
}
