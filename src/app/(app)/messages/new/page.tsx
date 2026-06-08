"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startDirectThread, startThreadWithMyCoach, getMyMembers, getMyCoach } from "../actions";

export default function NewMessagePage() {
  const router = useRouter();
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [myCoach, setMyCoach] = useState<{ id: string; name: string } | null>(null);
  const [query, setQuery] = useState("");
  const [isPending, start] = useTransition();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([getMyMembers(), getMyCoach()]).then(([m, c]) => {
      setMembers(m);
      setMyCoach(c);
      setLoaded(true);
    });
  }, []);

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase()),
  );

  function openMember(memberId: string) {
    start(async () => {
      const res = await startDirectThread(memberId);
      if (res.error) { alert(res.error); return; }
      router.push(`/messages/${res.threadId}`);
    });
  }

  function openCoach() {
    start(async () => {
      const res = await startThreadWithMyCoach();
      if (res.error) { alert(res.error); return; }
      router.push(`/messages/${res.threadId}`);
    });
  }

  return (
    <main className="px-4 pb-10 pt-5">
      <Link href="/messages" className="text-sm font-semibold text-sage-d">← Messages</Link>
      <h1 className="font-display mt-3 text-xl font-semibold text-emerald">New Message</h1>

      {!loaded && (
        <p className="mt-8 text-center text-sm text-ink/40">Loading…</p>
      )}

      {loaded && (
        <>
          {/* Message my Coach */}
          {myCoach && (
            <section className="mt-5">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink/50">
                My Coach
              </p>
              <button
                onClick={openCoach}
                disabled={isPending}
                className="flex w-full items-center gap-3 rounded-2xl border border-emerald/30 bg-emerald/5 px-3 py-3 text-left transition hover:bg-emerald/10 disabled:opacity-50"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald text-sm font-bold text-white">
                  {myCoach.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <div>
                  <span className="font-semibold text-ink">{myCoach.name}</span>
                  <p className="text-xs text-ink/50">Mera coach</p>
                </div>
              </button>
            </section>
          )}

          {/* Message a Member */}
          {members.length > 0 && (
            <section className="mt-5">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink/50">
                My Members
              </p>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Member search karein…"
                className="mb-3 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-emerald"
              />
              <div className="space-y-2">
                {filtered.length === 0 && (
                  <p className="py-6 text-center text-sm text-ink/50">Koi member nahi mila</p>
                )}
                {filtered.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => openMember(m.id)}
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
            </section>
          )}

          {/* No one to chat with */}
          {!myCoach && members.length === 0 && (
            <div className="mt-16 text-center text-ink/50">
              <div className="text-4xl">💬</div>
              <p className="mt-3 font-semibold">Koi contact nahi mila</p>
              <p className="mt-1 text-sm">Aapka coach ya members abhi linked nahi hain</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
