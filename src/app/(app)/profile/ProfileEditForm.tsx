"use client";

import { useState, useTransition } from "react";
import { updateUserDetails } from "../admin/actions";

export function ProfileEditForm({
  userId,
  initial,
}: {
  userId: string;
  initial: { name: string; phone: string; address: string; email: string };
}) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("user_id", userId);
      fd.set("name", name);
      fd.set("phone", phone);
      fd.set("address", address);
      const res = await updateUserDetails(fd);
      setMsg({
        ok: res.ok,
        text: res.ok ? "Details save ho gaye ✓" : (res as { ok: false; error: string }).error,
      });
      setTimeout(() => setMsg(null), 3000);
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm space-y-3">
      <label className="block text-sm">
        <span className="text-sage-d">Naam</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
        />
      </label>

      <label className="block text-sm">
        <span className="text-sage-d">Phone</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
          placeholder="+91 98xxx xxxxx"
        />
      </label>

      <label className="block text-sm">
        <span className="text-sage-d">Address</span>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
          placeholder="Ghar ka address"
        />
      </label>

      <div className="text-xs text-ink/40">
        Email change ke liye club owner se baat karein.
        {initial.email && ` (Current: ${initial.email})`}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="w-full rounded-xl bg-terra px-4 py-2.5 font-semibold text-white transition hover:bg-terra-d disabled:opacity-50"
      >
        {pending ? "Save ho raha hai…" : "Save karein"}
      </button>

      {msg && (
        <p
          role="alert"
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
            msg.ok ? "bg-good/15 text-good" : "bg-bad/15 text-bad"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
