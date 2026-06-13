"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NotificationRow } from "@/modules/notifications";
import {
  generateNotifications,
  markAllRead,
  markRead,
} from "@/modules/notifications/actions";

const TYPE_STYLE: Record<string, { dot: string; chip: string; label: string }> = {
  milestone:    { dot: "bg-good", chip: "bg-good/15 text-good",  label: "🎉 Milestones" },
  recharge_due: { dot: "bg-warn", chip: "bg-warn/15 text-warn",  label: "🔔 Recharge Due" },
  drop_off:     { dot: "bg-bad",  chip: "bg-bad/15 text-bad",    label: "⚠️ Drop-off Risk" },
  info:         { dot: "bg-sage", chip: "bg-line text-ink/60",   label: "ℹ️ Info" },
};

const GROUP_ORDER = ["drop_off", "recharge_due", "milestone", "info"];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AlertsFeed({ items }: { items: NotificationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scanned, setScanned] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ranRef = useRef(false);

  // Auto-scan for new alerts once when the screen opens.
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    (async () => {
      await generateNotifications();
      setScanned(true);
      router.refresh();
    })();
  }, [router]);

  const visible = items.filter((i) => !dismissed.has(i.id));
  const unread = visible.filter((i) => !i.read_at).length;

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
    startTransition(async () => {
      await markRead(id);
    });
  }

  function handleMarkRead(id: string, isUnread: boolean) {
    if (!isUnread) return;
    startTransition(async () => {
      await markRead(id);
      router.refresh();
    });
  }

  // Group by type in priority order
  const grouped: [string, NotificationRow[]][] = [];
  const seen = new Set<string>();
  for (const type of GROUP_ORDER) {
    const group = visible.filter((n) => n.type === type);
    if (group.length > 0) { grouped.push([type, group]); seen.add(type); }
  }
  // Any types not in GROUP_ORDER
  for (const n of visible) {
    if (!seen.has(n.type)) {
      seen.add(n.type);
      grouped.push([n.type, visible.filter((x) => x.type === n.type)]);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-ink/55">
          {scanned ? "" : "Scanning… "}
          {unread > 0 ? `${unread} unread` : "All caught up"}
        </span>
        {unread > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await markAllRead();
                router.refresh();
              })
            }
            className="rounded-xl border border-line bg-card px-3 py-1.5 text-sm font-semibold text-terra-d disabled:opacity-50"
          >
            Mark all read
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink/50">
          Abhi koi alert nahi 🎉
        </p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([type, group]) => {
            const style = TYPE_STYLE[type] ?? TYPE_STYLE.info;
            return (
              <section key={type}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
                  {style.label}
                </h2>
                <div className="space-y-2">
                  {group.map((n) => {
                    const isUnread = !n.read_at;
                    return (
                      <div
                        key={n.id}
                        className={
                          "flex w-full items-start gap-3 rounded-2xl border p-3 shadow-sm " +
                          (isUnread ? "border-terra/30 bg-card" : "border-line bg-card/60")
                        }
                      >
                        <span
                          className={"mt-1 h-2.5 w-2.5 shrink-0 rounded-full " + style.dot}
                        />
                        {/* Tappable body — marks read */}
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => handleMarkRead(n.id, isUnread)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-ink">{n.title}</span>
                            <span className="shrink-0 text-xs text-ink/45">
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                          {n.body && (
                            <p className="mt-0.5 text-sm text-ink/70">{n.body}</p>
                          )}
                          {isUnread && (
                            <span className="mt-1.5 inline-block text-xs font-semibold text-terra-d">
                              Tap to mark read
                            </span>
                          )}
                        </button>
                        {/* Dismiss (×) — optimistically hides + marks read */}
                        <button
                          type="button"
                          title="Dismiss"
                          onClick={() => handleDismiss(n.id)}
                          className="mt-0.5 shrink-0 rounded-full p-1 text-ink/30 transition hover:bg-line hover:text-ink/60"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            className="h-3.5 w-3.5"
                          >
                            <path d="M3 3l10 10M13 3L3 13" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
