"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { type Health } from "@/lib/health";

export type MemberRow = {
  id: string;
  coachId: string;
  coachName: string;
  name: string;
  membershipType: string;
  membershipLabel: string;
  stage: number;
  currentWeight: number | null;
  idealWeight: number | null;
  health: Health;
  healthLabel: string;
};

type CoachGroup = {
  coachId: string;
  coachName: string;
  isMine: boolean;
  members: MemberRow[];
};

const FILTERS: { key: "all" | Health; label: string }[] = [
  { key: "all", label: "All" },
  { key: "green", label: "On track" },
  { key: "yellow", label: "Watch" },
  { key: "red", label: "Action" },
];

const HEALTH_STYLE: Record<Health, { av: string; chip: string }> = {
  green: { av: "bg-emerald-soft text-emerald", chip: "bg-emerald-soft text-emerald" },
  yellow: { av: "bg-warn/15 text-warn", chip: "bg-warn/15 text-warn" },
  red: { av: "bg-bad/10 text-bad", chip: "bg-bad/10 text-bad" },
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function MemberCard({ m }: { m: MemberRow }) {
  const s = HEALTH_STYLE[m.health];
  const toGoal =
    m.currentWeight != null && m.idealWeight != null
      ? Math.round((m.currentWeight - m.idealWeight) * 10) / 10
      : null;
  return (
    <Link
      href={`/members/${m.id}`}
      className="flex items-center gap-3 rounded-[16px] border border-line bg-card p-3.5 transition hover:border-emerald/40"
    >
      <span className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full text-[16px] font-semibold ${s.av}`}>
        {initials(m.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15.5px] font-semibold text-ink">{m.name}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`inline-flex h-5 items-center rounded-full px-2.5 text-[11px] font-semibold ${s.chip}`}>
            {m.healthLabel}
          </span>
          <span className="truncate text-[12.5px] font-medium text-ink-2">
            {m.membershipLabel} · Stage {m.stage}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-display text-[18px] font-medium text-ink">
          {m.currentWeight ?? "—"}
          {m.currentWeight != null && <span className="text-[11px] font-semibold text-ink-3"> kg</span>}
        </div>
        {toGoal != null && (
          <div className={`text-[12px] font-semibold ${toGoal <= 0 ? "text-good" : "text-ink-2"}`}>
            {toGoal <= 0 ? "Goal hit" : `${toGoal} kg left`}
          </div>
        )}
      </div>
    </Link>
  );
}

export function MembersList({
  members,
  myId,
}: {
  members: MemberRow[];
  myId: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | Health>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (filter !== "all" && m.health !== filter) return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [members, query, filter]);

  const groups = useMemo<CoachGroup[]>(() => {
    const map = new Map<string, CoachGroup>();
    for (const m of filtered) {
      if (!map.has(m.coachId)) {
        map.set(m.coachId, { coachId: m.coachId, coachName: m.coachName, isMine: m.coachId === myId, members: [] });
      }
      map.get(m.coachId)!.members.push(m);
    }
    for (const g of map.values()) g.members.sort((a, b) => a.name.localeCompare(b.name));
    return Array.from(map.values()).sort((a, b) => {
      if (a.isMine && !b.isMine) return -1;
      if (!a.isMine && b.isMine) return 1;
      return a.coachName.localeCompare(b.coachName);
    });
  }, [filtered, myId]);

  const counts = useMemo(
    () => ({
      green: members.filter((m) => m.health === "green").length,
      yellow: members.filter((m) => m.health === "yellow").length,
      red: members.filter((m) => m.health === "red").length,
    }),
    [members],
  );

  return (
    <div>
      {/* search */}
      <div className="relative mb-3">
        <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Naam dhundein"
          className="h-12 w-full rounded-[14px] border border-line bg-card pl-11 pr-4 text-[15px] text-ink outline-none transition focus:border-emerald focus:ring-4 focus:ring-emerald/10 placeholder:text-ink-3"
        />
      </div>

      {/* segmented filter */}
      <div className="mb-4 flex gap-1 rounded-full bg-cream-2 p-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = f.key === "all" ? members.length : counts[f.key as Health];
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`flex-1 rounded-full px-2 py-2 text-[13px] font-semibold transition ${
                active ? "bg-card text-ink shadow-sm" : "text-ink-2"
              }`}
            >
              {f.label}
              <span className={active ? "text-ink-3" : "text-ink-3"}> {count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-2">Koi member nahi mila.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.coachId}>
              <div className="mb-2.5 flex items-center gap-2 px-1">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald text-[11px] font-bold text-white">
                  {initials(g.coachName)}
                </span>
                <span className="text-[13px] font-semibold text-ink">{g.coachName}</span>
                {g.isMine && (
                  <span className="rounded-full bg-emerald-soft px-2 py-0.5 text-[11px] font-semibold text-emerald">You</span>
                )}
                <span className="ml-auto text-[12px] font-medium text-ink-3">
                  {g.members.length} member{g.members.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {g.members.map((m) => (
                  <MemberCard key={m.id} m={m} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
