"use client";

import { useState, useTransition } from "react";
import { markPresent } from "./actions";

export function MarkPresentButton({
  memberId,
  present,
}: {
  memberId: string;
  present: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (present) {
    return (
      <span className="rounded-xl bg-good/15 px-3 py-1.5 text-sm font-semibold text-good">
        Present ✓
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await markPresent(memberId);
            if (!res.ok) setError(res.error);
          })
        }
        className="rounded-xl bg-emerald px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-2 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Mark Present"}
      </button>
      {error && <span role="alert" className="mt-1 text-xs text-bad">{error}</span>}
    </div>
  );
}
