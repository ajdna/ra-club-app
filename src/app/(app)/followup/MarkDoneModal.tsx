"use client";

import { useState, useTransition } from "react";
import { markTaskDone } from "./actions";

export function MarkDoneModal({
  taskId,
  status,
}: {
  taskId: string;
  status: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(status === "done");

  if (done) {
    return (
      <span className="rounded-lg bg-good/20 px-3 py-1 text-xs font-semibold text-good">
        ✓ Done
      </span>
    );
  }

  function submit() {
    startTransition(async () => {
      await markTaskDone(taskId, note.trim() || undefined);
      setDone(true);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-good/40 bg-good/10 px-3 py-1 text-xs font-semibold text-good"
      >
        Mark Done
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-emerald">
              Task Complete ✅
            </h3>
            <p className="mt-1 text-sm text-ink/60">
              Optional: add a note about this visit
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Member ka response, kuch notable baat..."
              className="mt-3 w-full rounded-xl border border-line bg-cream-2 px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-emerald focus:outline-none"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-line py-2 text-sm font-semibold text-ink/60"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={isPending}
                className="flex-1 rounded-xl bg-good py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isPending ? "Saving…" : "Confirm Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
