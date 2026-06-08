"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HEALTH_DOT, type Health } from "@/lib/health";

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
  { key: "green", label: "🟢 On track" },
  { key: "yellow", label: "🟡 Watch" },
  { key: "red", label: "🔴 Action" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MemberCard({ m }: { m: MemberRow }) {
  return (
    <Link
      href={`/members/${m.id}`}
      className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 shadow-sm transition hover:bg-cream-2"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sage-d text-sm font-semibold text-white">
        {initials(m.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-ink">{m.name}</div>
        <div className="truncate text-xs text-ink/55">
          {m.membershipLabel} · stage {m.stage}
          {m.currentWeight ? ` · ${m.currentWeight}kg` : ""} · {m.healthLabel}
        </div>
      </div>
      <span
        aria-label={m.healthLabel}
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${HEALTH_DOT[m.health]}`}
      />
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

  // Filter first
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (filter !== "all" && m.health !== filter) return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [members, query, filter]);

  // Group by coach, logged-in coach first, then alphabetically by coach name
  const groups = useMemo<CoachGroup[]>(() => {
    const map = new Map<string, CoachGroup>();
    for (const m of filtered) {
      if (!map.has(m.coachId)) {
        map.set(m.coachId, {
          coachId: m.coachId,
          coachName: m.coachName,
          isMine: m.coachId === myId,
          members: [],
        });
      }
      map.get(m.coachId)!.members.push(m);
    }

    // Sort members within each group by name
    for (const g of map.values()) {
      g.members.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Sort groups: mine first, then alphabetically by coach name
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

  const totalShown = filtered.length;

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name…"
        className="mb-3 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-ink outline-none focus:border-terra"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = f.key === "all" ? members.length : counts[f.key as Health];
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? "border-terra bg-terra/10 text-terra-d"
                  : "border-line bg-card text-sage-d"
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {totalShown === 0 ? (
        <p className="py-10 text-center text-sm text-ink/50">
          Koi member nahi mila.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.coachId}>
              {/* Coach section header */}
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald text-xs font-bold text-white">
                  {initials(g.coachName)}
                </span>
                <span className="text-sm font-semibold text-emerald">
                  {g.coachName}
                  {g.isMine && (
                    <span className="ml-1.5 rounded-full bg-emerald/15 px-2 py-0.5 text-xs font-semibold text-emerald">
                      You
                    </span>
                  )}
                </span>
                <span className="ml-auto text-xs text-ink/40">
                  {g.members.length} member{g.members.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Members under this coach */}
              <div className="space-y-2">
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
