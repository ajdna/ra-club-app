"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendBroadcast } from "../actions";

export default function BroadcastPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isPending, start] = useTransition();
  const [err, setErr] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    start(async () => {
      const res = await sendBroadcast(subject, body);
      if (res.error) { setErr(res.error); return; }
      router.push("/messages");
    });
  }

  return (
    <main className="px-4 pb-10 pt-5">
      <Link href="/messages" className="text-sm font-semibold text-sage-d">← Messages</Link>
      <h1 className="font-display mt-3 text-xl font-semibold text-emerald">📢 Team Broadcast</h1>
      <p className="mt-1 text-sm text-ink/60">Apne sabhi members ko ek saath message bhejein</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button
          type="submit"
          disabled={!body.trim() || isPending}
          className="w-full rounded-2xl bg-emerald py-3 font-semibold text-white disabled:opacity-40"
        >
          {isPending ? "Bhej raha hai…" : "📢 Sabko Bhejo"}
        </button>
      </form>
    </main>
  );
}
