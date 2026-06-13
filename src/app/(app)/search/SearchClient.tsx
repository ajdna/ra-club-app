"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { searchAll } from "./actions";

type SearchResult = {
  type: "member" | "task";
  id: string;
  title: string;
  sub: string;
  href: string;
  badge?: string;
  badgeColor?: string;
};

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, start] = useTransition();

  const search = useCallback(
    (q: string) => {
      if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
      start(async () => {
        const res = await searchAll(q.trim());
        setResults(res);
        setSearched(true);
      });
    },
    [],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    search(val);
  }

  return (
    <div>
      {/* Search box */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          autoFocus
          value={query}
          onChange={handleChange}
          placeholder="Search members by name or phone…"
          className="w-full rounded-2xl border border-line bg-card py-3 pl-9 pr-4 text-sm outline-none focus:border-emerald shadow-sm"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40">
            ✕
          </button>
        )}
      </div>

      {/* Results */}
      <div className="mt-4">
        {isPending && (
          <div className="text-center py-8 text-ink/40 text-sm">Searching…</div>
        )}

        {!isPending && searched && results.length === 0 && (
          <div className="text-center py-10">
            <div className="text-3xl">🔍</div>
            <p className="mt-2 text-sm text-ink/50">No results for &quot;{query}&quot;</p>
          </div>
        )}

        {!isPending && results.length > 0 && (
          <div className="space-y-2">
            {/* Group by type */}
            {(["member", "task"] as const).map((type) => {
              const group = results.filter(r => r.type === type);
              if (!group.length) return null;
              return (
                <div key={type}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40 px-1">
                    {type === "member" ? "Members" : "Tasks"}
                  </h3>
                  <div className="rounded-2xl border border-line bg-card p-1 shadow-sm">
                    {group.map((r) => (
                      <Link
                        key={r.id}
                        href={r.href}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-cream-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-ink">{r.title}</div>
                          <div className="truncate text-xs text-ink/50">{r.sub}</div>
                        </div>
                        {r.badge && (
                          <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${r.badgeColor ?? "bg-line text-ink/50"}`}>
                            {r.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!searched && !isPending && (
          <div className="text-center py-10 text-ink/40">
            <div className="text-4xl">🔍</div>
            <p className="mt-3 text-sm">Type a name or phone number to search</p>
          </div>
        )}
      </div>
    </div>
  );
}
