"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  INTAKE_FIELDS,
  INTAKE_GROUPS,
  type IntakeRecord,
} from "@/modules/members/intake";
import { saveIntake } from "../../actions";

export function IntakeForm({
  memberId,
  initial,
}: {
  memberId: string;
  initial: IntakeRecord;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(null);
      const res = await saveIntake(memberId, formData);
      if (res.ok) {
        router.push(`/members/${memberId}`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-5">
      {INTAKE_GROUPS.map((group) => (
        <section
          key={group}
          className="rounded-2xl border border-line bg-card p-4 shadow-sm"
        >
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.08em] text-sage-d">
            {group}
          </h2>
          <div className="mt-3 space-y-3">
            {INTAKE_FIELDS.filter((f) => f.group === group).map((f) => {
              const val = initial[f.key];
              const defaultValue = val == null ? "" : String(val);
              const base =
                "mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-ink outline-none focus:border-terra";
              return (
                <label key={f.key} className="block text-sm">
                  <span className="text-sage-d">{f.label}</span>
                  {f.type === "textarea" ? (
                    <textarea
                      name={f.key}
                      defaultValue={defaultValue}
                      rows={2}
                      className={base}
                    />
                  ) : (
                    <input
                      name={f.key}
                      type={
                        f.type === "number"
                          ? "number"
                          : f.type === "date"
                            ? "date"
                            : "text"
                      }
                      step={f.type === "number" ? "any" : undefined}
                      defaultValue={defaultValue}
                      className={base}
                    />
                  )}
                  {f.hint && (
                    <span className="mt-0.5 block text-xs text-ink/45">
                      {f.hint}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </section>
      ))}

      {error && (
        <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-terra px-4 py-3 font-semibold text-white transition hover:bg-terra-d disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save intake"}
      </button>
    </form>
  );
}
