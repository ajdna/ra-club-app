"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startDirectThread, getMyMembers } from "../actions";

export default function NewMessagePage() {
  const router = useRouter();
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [query, setQuery] = useState("");
  const [isPending, start] = useTransition();

  useEffect(() => {
    getMyMembers().then(setMembers);
  }, []);

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase()),
  );

  function open(memberId: string) {
    start(async () => {
      const res = await startDirectThread(memberId);
      if (res.error) { alert(res.error); return; }
      router.push(`/messages/${res.threadId}`);
    });
  }

  return (
    <main className="px-4 pb-10 pt-5">
      <Link href="/messages" className="text-sm font-semibold text-sage-d">← Messages</Link>
      <h1 className="font-display mt-3 text-xl font-semibold text-emerald">New Message</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Member search karein…"
        className="mt-4 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-emerald"
      />

      <div className="mt-3 space-y-2">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-ink/50">Koi member nahi mila</p>
        )}
        {filtered.map((m) => (
          <button
            key={m.id}
            onClick={() => open(m.id)}
            disabled={isPending}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-3 py-3 text-left transition hover:bg-cream-2 disabled:opacity-50"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-d text-sm font-bold text-white">
              {m.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <span className="font-semibold text-ink">{m.name}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
