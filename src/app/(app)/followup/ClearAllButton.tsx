"use client";

import { useTransition } from "react";
import { clearOverdueTasks } from "./actions";

export function ClearAllButton({ count }: { count: number }) {
  const [pending, start] = useTransition();

  function handleClick() {
    if (!confirm(`${count} overdue task${count !== 1 ? "s" : ""} ko skipped mark karein?`))
      return;
    start(async () => {
      await clearOverdueTasks();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-1 text-xs font-semibold text-bad transition hover:bg-bad/20 disabled:opacity-40"
    >
      {pending ? "Clearing…" : "Clear All"}
    </button>
  );
}
