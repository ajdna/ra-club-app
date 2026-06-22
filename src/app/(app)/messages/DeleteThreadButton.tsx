"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteThread } from "./actions";

export function DeleteThreadButton({
  threadId,
  redirectTo,
  className,
}: {
  threadId: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [pending, start] = useTransition();

  function open(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShow(true);
  }
  function close(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShow(false);
  }
  function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    start(async () => {
      const r = await deleteThread(threadId);
      if (r.error) {
        alert(r.error);
        return;
      }
      setShow(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Delete conversation"
        className={
          className ??
          "grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-bad/10 hover:text-bad"
        }
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
        </svg>
      </button>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
          <div className="w-full max-w-sm rounded-[18px] border border-line bg-card p-5 shadow-[0_14px_30px_var(--emerald-soft)]" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-[19px] font-medium text-ink">Poora thread delete karein?</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
              Yeh sabhi recipients ke inbox se hamesha ke liye hat jaayega — wapas nahi aayega.
            </p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={close} className="flex-1 rounded-full border border-line py-3 text-[14px] font-semibold text-ink transition hover:bg-cream-2">
                Cancel
              </button>
              <button type="button" onClick={onDelete} disabled={pending} className="flex-1 rounded-full bg-bad py-3 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
