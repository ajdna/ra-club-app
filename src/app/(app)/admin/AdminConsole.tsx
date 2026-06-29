"use client";

import { useState, useTransition } from "react";
import { setConfig } from "@/modules/rules-engine/actions";
import type { Field, Section } from "@/modules/rules-engine/registry";

/* dot-path helpers */
function getPath(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined),
      obj,
    );
}
function setPath(obj: unknown, path: string, val: unknown): Record<string, unknown> {
  const keys = path.split(".");
  const root: Record<string, unknown> =
    obj && typeof obj === "object" ? structuredClone(obj as Record<string, unknown>) : {};
  let cur = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = val;
  return root;
}

export function AdminConsole({
  sections,
  values,
}: {
  sections: Section[];
  values: Record<string, unknown>;
}) {
  return (
    <div className="mt-5 space-y-4">
      {sections.map((s) =>
        s.component === "club_schedule" ? (
          <ClubScheduleEditor key={s.key} section={s} initial={values[s.key]} />
        ) : (
          <SectionEditor key={s.key} section={s} initial={values[s.key]} />
        ),
      )}
    </div>
  );
}

function SectionEditor({
  section,
  initial,
}: {
  section: Section;
  initial: unknown;
}) {
  const [value, setValue] = useState<unknown>(initial ?? {});
  const [raw, setRaw] = useState(() =>
    JSON.stringify(initial ?? {}, null, 2),
  );
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "ok" } | { kind: "err"; msg: string } | null
  >(null);

  function save() {
    let toSave: unknown = value;
    if (section.raw) {
      try {
        toSave = JSON.parse(raw);
      } catch {
        setStatus({ kind: "err", msg: "Invalid JSON — check the syntax." });
        return;
      }
    }
    startTransition(async () => {
      setStatus(null);
      const res = await setConfig(section.key, toSave);
      setStatus(res.ok ? { kind: "ok" } : { kind: "err", msg: res.error });
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <h2 className="font-display text-base font-semibold text-ink">
        {section.title}
      </h2>
      <p className="mt-0.5 text-xs text-ink/55">{section.description}</p>

      <div className="mt-3 space-y-3">
        {section.raw ? (
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
            rows={Math.min(14, raw.split("\n").length + 1)}
            className="w-full rounded-xl border border-line bg-cream px-3 py-2 font-mono text-xs text-ink outline-none focus:border-terra"
          />
        ) : (
          section.fields?.map((f) => (
            <FieldInput
              key={f.path}
              field={f}
              value={getPath(value, f.path)}
              onChange={(v) =>
                setValue((prev: unknown) => setPath(prev, f.path, v))
              }
            />
          ))
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-xl bg-terra px-4 py-2 text-sm font-semibold text-white transition hover:bg-terra-d disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {status?.kind === "ok" && (
          <span className="text-sm font-semibold text-good">Saved ✓</span>
        )}
        {status?.kind === "err" && (
          <span className="text-sm text-bad">{status.msg}</span>
        )}
      </div>
    </section>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const base =
    "mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-ink outline-none focus:border-terra";

  let control: React.ReactNode;
  if (field.type === "textarea") {
    control = (
      <textarea
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className={base}
      />
    );
  } else if (field.type === "number") {
    control = (
      <input
        type="number"
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        className={base}
      />
    );
  } else if (field.type === "csvnum") {
    const display = Array.isArray(value) ? value.join(", ") : "";
    control = (
      <input
        type="text"
        value={display}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => Number(s.trim()))
              .filter((n) => Number.isFinite(n)),
          )
        }
        className={base}
      />
    );
  } else if (field.type === "time") {
    control = (
      <input
        type="time"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className={base}
      />
    );
  } else {
    control = (
      <input
        type="text"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className={base}
      />
    );
  }

  return (
    <label className="block text-sm">
      <span className="text-sage-d">{field.label}</span>
      {control}
      {field.hint && <span className="mt-0.5 block text-xs text-ink/45">{field.hint}</span>}
    </label>
  );
}

/* ── Club weekly schedule editor ────────────────────────────────────────── */

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type DaySession = { on: boolean; time: string };
type DayConfig = { morning: DaySession; evening: DaySession };
type ClubSchedule = {
  lead_min: number;
  morning_link: string;
  evening_link: string;
  days: Record<string, DayConfig>;
  skip_dates: string[];
};

function defaultSchedule(): ClubSchedule {
  const days: Record<string, DayConfig> = {};
  for (let d = 0; d < 7; d++) {
    days[String(d)] = {
      morning: { on: true, time: "06:00" },
      evening: { on: true, time: "18:00" },
    };
  }
  return { lead_min: 15, morning_link: "", evening_link: "", days, skip_dates: [] };
}

function parseSchedule(raw: unknown): ClubSchedule {
  if (!raw || typeof raw !== "object") return defaultSchedule();
  const r = raw as Record<string, unknown>;
  const def = defaultSchedule();
  const days: Record<string, DayConfig> = {};
  for (let d = 0; d < 7; d++) {
    const key = String(d);
    const dayRaw = r.days && typeof r.days === "object"
      ? (r.days as Record<string, unknown>)[key]
      : undefined;
    const parseSession = (s: unknown, fallbackTime: string): DaySession => {
      if (!s || typeof s !== "object") return { on: true, time: fallbackTime };
      const o = s as Record<string, unknown>;
      return { on: o.on !== false, time: typeof o.time === "string" ? o.time : fallbackTime };
    };
    if (dayRaw && typeof dayRaw === "object") {
      const dr = dayRaw as Record<string, unknown>;
      days[key] = {
        morning: parseSession(dr.morning, "06:00"),
        evening: parseSession(dr.evening, "18:00"),
      };
    } else {
      days[key] = def.days[key];
    }
  }
  return {
    lead_min: typeof r.lead_min === "number" ? r.lead_min : 15,
    morning_link: typeof r.morning_link === "string" ? r.morning_link : "",
    evening_link: typeof r.evening_link === "string" ? r.evening_link : "",
    days,
    skip_dates: Array.isArray(r.skip_dates)
      ? (r.skip_dates as unknown[]).filter((s): s is string => typeof s === "string")
      : [],
  };
}

function ClubScheduleEditor({
  section,
  initial,
}: {
  section: Section;
  initial: unknown;
}) {
  const [schedule, setSchedule] = useState<ClubSchedule>(() => parseSchedule(initial));
  const [newSkipDate, setNewSkipDate] = useState("");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "ok" } | { kind: "err"; msg: string } | null
  >(null);

  function save() {
    startTransition(async () => {
      setStatus(null);
      const res = await setConfig(section.key, schedule);
      setStatus(res.ok ? { kind: "ok" } : { kind: "err", msg: res.error });
    });
  }

  function toggleSession(d: number, session: "morning" | "evening") {
    setSchedule((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [String(d)]: {
          ...prev.days[String(d)],
          [session]: {
            ...prev.days[String(d)][session],
            on: !prev.days[String(d)][session].on,
          },
        },
      },
    }));
  }

  function setSessionTime(d: number, session: "morning" | "evening", time: string) {
    setSchedule((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [String(d)]: {
          ...prev.days[String(d)],
          [session]: { ...prev.days[String(d)][session], time },
        },
      },
    }));
  }

  function addSkipDate() {
    if (!newSkipDate || schedule.skip_dates.includes(newSkipDate)) return;
    setSchedule((prev) => ({
      ...prev,
      skip_dates: [...prev.skip_dates, newSkipDate].sort(),
    }));
    setNewSkipDate("");
  }

  function removeSkipDate(date: string) {
    setSchedule((prev) => ({
      ...prev,
      skip_dates: prev.skip_dates.filter((d) => d !== date),
    }));
  }

  const inputBase =
    "rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terra";

  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <h2 className="font-display text-base font-semibold text-ink">{section.title}</h2>
      <p className="mt-0.5 text-xs text-ink/55">{section.description}</p>

      {/* Zoom links + lead time */}
      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="text-sage-d">Morning Zoom link</span>
          <input
            type="url"
            value={schedule.morning_link}
            onChange={(e) => setSchedule((s) => ({ ...s, morning_link: e.target.value }))}
            placeholder="https://zoom.us/j/…"
            className={`mt-1 w-full ${inputBase}`}
          />
        </label>
        <label className="block text-sm">
          <span className="text-sage-d">Evening Zoom link</span>
          <input
            type="url"
            value={schedule.evening_link}
            onChange={(e) => setSchedule((s) => ({ ...s, evening_link: e.target.value }))}
            placeholder="https://zoom.us/j/…"
            className={`mt-1 w-full ${inputBase}`}
          />
        </label>
        <label className="block text-sm">
          <span className="text-sage-d">Pre-reminder lead time (min)</span>
          <input
            type="number"
            value={schedule.lead_min}
            onChange={(e) =>
              setSchedule((s) => ({ ...s, lead_min: Number(e.target.value) || 15 }))
            }
            className={`mt-1 w-28 ${inputBase}`}
          />
        </label>
      </div>

      {/* Weekly grid */}
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sage-d">
        Weekly schedule
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink/50">
              <th className="pb-2 pr-3 font-medium">Day</th>
              <th className="pb-2 pr-6 font-medium">Morning</th>
              <th className="pb-2 font-medium">Evening</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {DAY_LABELS.map((label, d) => (
              <tr key={d}>
                <td className="py-2 pr-3 font-medium text-ink">{label}</td>
                {(["morning", "evening"] as const).map((session) => {
                  const cfg = schedule.days[String(d)]?.[session] ?? {
                    on: false,
                    time: session === "morning" ? "06:00" : "18:00",
                  };
                  return (
                    <td key={session} className="py-2 pr-6">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSession(d, session)}
                          aria-label={`${label} ${session} ${cfg.on ? "on" : "off"}`}
                          className={`relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full transition-colors ${
                            cfg.on ? "bg-terra" : "bg-line"
                          }`}
                        >
                          <span
                            className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
                              cfg.on ? "translate-x-[20px]" : "translate-x-[2px]"
                            }`}
                          />
                        </button>
                        <input
                          type="time"
                          value={cfg.time}
                          disabled={!cfg.on}
                          onChange={(e) => setSessionTime(d, session, e.target.value)}
                          className="rounded-lg border border-line bg-cream px-2 py-1 text-xs text-ink outline-none focus:border-terra disabled:opacity-40"
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Skip dates */}
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sage-d">
        Skip dates (festivals / holidays)
      </p>
      <div className="mt-2 space-y-1.5">
        {schedule.skip_dates.map((date) => (
          <div key={date} className="flex items-center gap-3">
            <span className="font-mono text-sm text-ink">{date}</span>
            <button
              type="button"
              onClick={() => removeSkipDate(date)}
              className="text-xs text-bad hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={newSkipDate}
            onChange={(e) => setNewSkipDate(e.target.value)}
            className="rounded-lg border border-line bg-cream px-2 py-1 text-sm text-ink outline-none focus:border-terra"
          />
          <button
            type="button"
            onClick={addSkipDate}
            className="rounded-lg border border-line bg-cream px-3 py-1 text-sm font-semibold text-sage-d hover:bg-sage/10"
          >
            Add
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-xl bg-terra px-4 py-2 text-sm font-semibold text-white transition hover:bg-terra-d disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {status?.kind === "ok" && (
          <span className="text-sm font-semibold text-good">Saved ✓</span>
        )}
        {status?.kind === "err" && (
          <span className="text-sm text-bad">{status.msg}</span>
        )}
      </div>
    </section>
  );
}
