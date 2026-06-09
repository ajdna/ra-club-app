"use client";

import { useState, useTransition } from "react";
import { clearThread } from "../actions";

export function ClearChatButton({ threadId }: { threadId: string }) {
  const [show, setShow] = useState(false);
  const [pending, start] = useTransition();

  function handleClear() {
    start(async () => {
      const res = await clearThread(threadId);
      if (res.error) { alert(res.error); return; }
      setShow(false);
      // Refresh the page so the empty chat shows
      window.location.reload();
    });
  }

  return (
    <>
      {/* Trash icon in header */}
      <button
        onClick={() => setShow(true)}
        title="Clear chat"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink/50 hover:bg-bad/10 hover:text-bad transition"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </button>

      {/* Confirmation bottom sheet */}
      {show && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-3xl bg-card px-5 py-6 shadow-xl">
            <p className="text-center text-lg font-semibold text-ink">🗑️ Chat clear karein?</p>
            <p className="mt-2 text-center text-sm text-ink/60">
              Is thread ke saare messages hamesha ke liye delete ho jayenge.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShow(false)}
                className="flex-1 rounded-2xl border border-line py-3 text-sm font-semibold text-ink"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                disabled={pending}
                className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Haan, clear karo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
