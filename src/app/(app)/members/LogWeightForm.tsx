"use client";

import { useState, useTransition } from "react";
import { logWeight } from "./actions";

export function LogWeightForm({ memberId }: { memberId: string }) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const weight = parseFloat(value);
    startTransition(async () => {
      setError(null);
      const res = await logWeight(memberId, weight);
      if (res.ok) setValue("");
      else setError(res.error);
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="New weight (kg)"
          className="min-w-0 flex-1 rounded-xl border border-line bg-cream px-3 py-2 text-ink outline-none focus:border-terra"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !value}
          className="rounded-xl bg-terra px-4 py-2 text-sm font-semibold text-white transition hover:bg-terra-d disabled:opacity-50"
        >
          {pending ? "Saving…" : "Log"}
        </button>
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}
