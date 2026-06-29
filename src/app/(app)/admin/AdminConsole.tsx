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
      {sections.map((s) => (
        <SectionEditor key={s.key} section={s} initial={values[s.key]} />
      ))}
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
