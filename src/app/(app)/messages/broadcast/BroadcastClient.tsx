"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendBroadcast } from "../actions";

type Target = "all" | "coaches" | "members";

const TARGET_OPTIONS: { value: Target; label: string; desc: string; icon: string }[] = [
  { value: "all", label: "Everyone", desc: "All coaches + members", icon: "🌐" },
  { value: "coaches", label: "Coaches Only", desc: "NCO, JCO, Coaches", icon: "👔" },
  { value: "members", label: "Members Only", desc: "Club members", icon: "🏃" },
];

export function BroadcastClient() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<Target>("all");
  const [isPending, start] = useTransition();
  const [err, setErr] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    start(async () => {
      const res = await sendBroadcast(subject, body, target);
      if (res.error) { setErr(res.error); return; }
      router.push("/messages");
    });
  }

  return (
    <main className="px-4 pb-10 pt-5">
      <Link href="/messages" className="text-sm font-semibold text-sage-d">← Messages</Link>
      <h1 className="font-display mt-3 text-xl font-semibold text-emerald">📢 Team Broadcast</h1>
      <p className="mt-1 text-sm text-ink/60">Send an announcement to your team or members</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Target group selector */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">Send To</label>
          <div className="grid grid-cols-3 gap-2">
            {TARGET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTarget(opt.value)}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  target === opt.value
                    ? "border-emerald bg-emerald/10 text-emerald"
                    : "border-line bg-card text-ink/70"
                }`}
              >
                <div className="text-lg">{opt.icon}</div>
                <div className="mt-1 text-xs font-semibold leading-tight">{opt.label}</div>
                <div className="text-[10px] text-ink/50 leading-tight">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">
            Subject <span className="font-normal text-ink/50">(optional)</span>
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Morning shake reminder"
            className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-emerald"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">Message *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Apna message likhein…"
            rows={5}
            required
            className="w-full resize-none rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-emerald"
          />
        </div>

        {err && <p className="text-sm text-bad">{err}</p>}

        <button
          type="submit"
          disabled={!body.trim() || isPending}
          className="w-full rounded-2xl bg-emerald py-3 font-semibold text-white disabled:opacity-40"
        >
          {isPending ? "Bhej raha hai…" : `📢 ${TARGET_OPTIONS.find(t => t.value === target)?.label} ko Bhejo`}
        </button>
      </form>
    </main>
  );
}
