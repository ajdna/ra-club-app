"use client";

import { useState, useTransition } from "react";
import { upsertClubSession } from "./actions";

type Period = "morning" | "evening";

type SessionState = {
  details: string;
  status: { kind: "ok" } | { kind: "err"; msg: string } | null;
};

type DayData = {
  date: string;
  label: string;
  morning: string;
  evening: string;
};

export function ClubSessionsEditor({ initial }: { initial: DayData[] }) {
  const [rows, setRows] = useState<
    Record<string, Record<Period, SessionState>>
  >(() => {
    const out: Record<string, Record<Period, SessionState>> = {};
    for (const d of initial) {
      out[d.date] = {
        morning: { details: d.morning, status: null },
        evening: { details: d.evening, status: null },
      };
    }
    return out;
  });

  const [pending, startTransition] = useTransition();

  function update(date: string, period: Period, details: string) {
    setRows((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [period]: { ...prev[date][period], details, status: null },
      },
    }));
  }

  function save(date: string, period: Period) {
    const details = rows[date][period].details;
    startTransition(async () => {
      const res = await upsertClubSession(date, period, details);
      setRows((prev) => ({
        ...prev,
        [date]: {
          ...prev[date],
          [period]: {
            ...prev[date][period],
            status: res.ok
              ? { kind: "ok" }
              : { kind: "err", msg: res.error ?? "Save failed" },
          },
        },
      }));
    });
  }

  const base =
    "w-full rounded-xl border border-line bg-cream px-3 py-2 font-mono text-xs text-ink outline-none focus:border-terra";

  return (
    <div className="space-y-5">
      {initial.map((d) => (
        <div
          key={d.date}
          className="rounded-2xl border border-line bg-card p-4 shadow-sm"
        >
          <h3 className="font-display text-sm font-semibold text-ink">
            {d.label}{" "}
            <span className="font-mono text-xs text-ink/50">{d.date}</span>
          </h3>

          {(["morning", "evening"] as const).map((period) => {
            const row = rows[d.date][period];
            const status = row.status;
            return (
              <div key={period} className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sage-d">
                  {period === "morning" ? "Morning" : "Evening"}
                </p>
                <textarea
                  value={row.details}
                  onChange={(e) => update(d.date, period, e.target.value)}
                  placeholder={`Paste the full Zoom invite for ${period} session…`}
                  rows={3}
                  spellCheck={false}
                  className={`mt-1 ${base}`}
                />
                <div className="mt-1.5 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => save(d.date, period)}
                    className="rounded-lg bg-terra px-3 py-1 text-xs font-semibold text-white transition hover:bg-terra-d disabled:opacity-50"
                  >
                    {pending ? "Saving…" : "Save"}
                  </button>
                  {status?.kind === "ok" && (
                    <span className="text-xs font-semibold text-good">
                      Saved ✓
                    </span>
                  )}
                  {status?.kind === "err" && (
                    <span className="text-xs text-bad">{status.msg}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
