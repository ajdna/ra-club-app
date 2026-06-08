"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NotificationRow } from "@/modules/notifications";
import {
  generateNotifications,
  markAllRead,
  markRead,
} from "@/modules/notifications/actions";

const TYPE_STYLE: Record<string, { dot: string; chip: string }> = {
  milestone: { dot: "bg-good", chip: "bg-good/15 text-good" },
  recharge_due: { dot: "bg-warn", chip: "bg-warn/15 text-warn" },
  drop_off: { dot: "bg-bad", chip: "bg-bad/15 text-bad" },
  info: { dot: "bg-sage", chip: "bg-line text-ink/60" },
};

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

  const unread = items.filter((i) => !i.read_at).length;

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

      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink/50">
          Abhi koi alert nahi 🎉
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.info;
            const isUnread = !n.read_at;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    if (isUnread) {
                      await markRead(n.id);
                      router.refresh();
                    }
                  })
                }
                className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left shadow-sm transition ${
                  isUnread
                    ? "border-terra/30 bg-card"
                    : "border-line bg-card/60"
                }`}
              >
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {n.title}
                    </span>
                    <span className="shrink-0 text-xs text-ink/45">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-sm text-ink/70">{n.body}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
