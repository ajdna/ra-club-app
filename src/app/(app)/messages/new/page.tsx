"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startDirectThread, getMyContacts } from "../actions";

const ROLE_LABEL: Record<string, string> = {
  club_owner: "Club Owner",
  nco:        "NCO",
  jco:        "JCO",
  supervisor: "Supervisor",
  coach:      "Coach",
  member:     "Member",
  upline:     "Upline",
  privilege:  "Special",
  guest:      "Guest",
};

type Contact = {
  id: string;
  name: string;
  role: string;
  group: "upline" | "downline";
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function NewMessagePage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [isPending, start] = useTransition();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getMyContacts().then((c) => { setContacts(c); setLoaded(true); });
  }, []);

  function open(userId: string) {
    start(async () => {
      const res = await startDirectThread(userId);
      if (res.error) { alert(res.error); return; }
      router.push(`/messages/${res.threadId}`);
    });
  }

  const lq = query.toLowerCase();
  const filtered = contacts.filter(
    (c) => !lq || c.name.toLowerCase().includes(lq) || ROLE_LABEL[c.role]?.toLowerCase().includes(lq),
  );

  const upline   = filtered.filter((c) => c.group === "upline");
  const downline = filtered.filter((c) => c.group === "downline");

  return (
    <main className="px-4 pb-10 pt-5">
      <Link href="/messages" className="text-sm font-semibold text-sage-d">← Messages</Link>
      <h1 className="font-display mt-3 text-xl font-semibold text-emerald">New Message</h1>

      {!loaded && (
        <p className="mt-8 text-center text-sm text-ink/40">Loading…</p>
      )}

      {loaded && contacts.length === 0 && (
        <div className="mt-16 text-center text-ink/50">
          <div className="text-4xl">💬</div>
          <p className="mt-3 font-semibold">Koi contact nahi mila</p>
          <p className="mt-1 text-sm">Aapka coach ya members abhi linked nahi hain</p>
        </div>
      )}

      {loaded && contacts.length > 0 && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or role…"
            className="mt-4 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-emerald"
          />

          {/* Upline */}
          {upline.length > 0 && (
            <Section label="⬆️ Upline">
              {upline.map((c) => (
                <ContactRow key={c.id} c={c} onOpen={open} disabled={isPending} />
              ))}
            </Section>
          )}

          {/* Downline / team */}
          {downline.length > 0 && (
            <Section label="👥 My Team">
              {downline.map((c) => (
                <ContactRow key={c.id} c={c} onOpen={open} disabled={isPending} />
              ))}
            </Section>
          )}

          {filtered.length === 0 && query && (
            <p className="mt-8 text-center text-sm text-ink/50">Koi result nahi mila</p>
          )}
        </>
      )}
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ContactRow({
  c, onOpen, disabled,
}: {
  c: Contact;
  onOpen: (id: string) => void;
  disabled: boolean;
}) {
  const bgColor = c.group === "upline" ? "bg-emerald" : "bg-sage-d";
  return (
    <button
      onClick={() => onOpen(c.id)}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition disabled:opacity-50 ${
        c.group === "upline"
          ? "border-emerald/30 bg-emerald/5 hover:bg-emerald/10"
          : "border-line bg-card hover:bg-cream-2"
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${bgColor}`}>
        {initials(c.name)}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-ink">{c.name}</p>
        <p className="text-xs text-ink/50">{ROLE_LABEL[c.role] ?? c.role}</p>
      </div>
    </button>
  );
}
