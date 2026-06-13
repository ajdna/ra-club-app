"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroupThread } from "../../actions";

export function NewGroupForm({ members }: { members: { id: string; name: string }[] }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Group name required"); return; }
    if (selected.size === 0) { setError("Select at least one member"); return; }
    setError(null);
    start(async () => {
      const res = await createGroupThread(name.trim(), [...selected]);
      if (res.error) { setError(res.error); return; }
      router.push("/messages/" + res.threadId);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink/60">Group Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning Batch"
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-emerald dark:bg-neutral-800"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-ink/60">Add Members ({selected.size} selected)</p>
          <div className="space-y-1">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                className={"flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition " +
                  (selected.has(m.id) ? "bg-emerald/10 text-emerald" : "bg-white text-ink hover:bg-cream-2 dark:bg-neutral-800")}
              >
                <span className={"h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs " +
                  (selected.has(m.id) ? "border-emerald bg-emerald text-white" : "border-line")}>
                  {selected.has(m.id) ? "✓" : ""}
                </span>
                <span className="text-sm font-medium">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div className="border-t border-line bg-card px-4 py-3">
        <button
          type="submit"
          disabled={isPending || !name.trim() || selected.size === 0}
          className="w-full rounded-xl bg-emerald py-3 text-sm font-semibold text-white transition disabled:opacity-40"
        >
          {isPending ? "Creating…" : "Create Group (" + (selected.size + 1) + " people)"}
        </button>
      </div>
    </form>
  );
}
