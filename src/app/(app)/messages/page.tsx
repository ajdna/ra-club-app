import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getThreads } from "./actions";

export const dynamic = "force-dynamic";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function MessagesPage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (typeof me === "string") redirect("/");

  const threads = await getThreads();

  const broadcasts = threads.filter((t) => t.type === "broadcast");
  const directs = threads.filter((t) => t.type === "direct");

  // Anyone with a downline can broadcast; only members cannot
  const canBroadcast = me.role !== "member" && me.role !== "guest";

  return (
    <main className="px-4 pb-24 pt-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-semibold text-emerald">Messages</h1>
        <div className="flex gap-2">
          {canBroadcast && (
            <Link
              href="/messages/broadcast"
              className="rounded-xl bg-emerald/10 px-3 py-1.5 text-sm font-semibold text-emerald"
            >
              📢 Broadcast
            </Link>
          )}
          <Link
            href="/messages/new"
            className="rounded-xl bg-terra px-3 py-1.5 text-sm font-semibold text-white"
          >
            + New
          </Link>
        </div>
      </div>

      {threads.length === 0 && (
        <div className="mt-16 text-center text-ink/50">
          <div className="text-4xl">💬</div>
          <p className="mt-3 font-semibold">Koi message nahi abhi</p>
          <p className="mt-1 text-sm">New tap karke baat shuru karein</p>
        </div>
      )}

      {/* Broadcasts */}
      {broadcasts.length > 0 && (
        <section className="mb-5">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink/50">
            📢 Team Broadcasts
          </p>
          <div className="space-y-2">
            {broadcasts.map((t) => (
              <ThreadRow key={t.id} thread={t} />
            ))}
          </div>
        </section>
      )}

      {/* Direct */}
      {directs.length > 0 && (
        <section>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink/50">
            💬 Direct Messages
          </p>
          <div className="space-y-2">
            {directs.map((t) => (
              <ThreadRow key={t.id} thread={t} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ThreadRow({ thread }: { thread: Awaited<ReturnType<typeof getThreads>>[number] }) {
  const hasUnread = thread.unread > 0;
  return (
    <Link
      href={`/messages/${thread.id}`}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 shadow-sm transition ${
        hasUnread ? "border-emerald/30 bg-emerald/5" : "border-line bg-card hover:bg-cream-2"
      }`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${
        thread.type === "broadcast" ? "bg-terra" : "bg-sage-d"
      }`}>
        {thread.type === "broadcast" ? "📢" : initials(thread.otherName)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-1">
          <span className={`truncate text-sm font-semibold ${hasUnread ? "text-emerald" : "text-ink"}`}>
            {thread.otherName}
          </span>
          <span className="shrink-0 text-[11px] text-ink/40">{timeAgo(thread.lastAt)}</span>
        </div>
        <p className="truncate text-xs text-ink/60">{thread.lastMessage}</p>
      </div>
      {hasUnread && (
        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-emerald px-1 text-[11px] font-bold text-white">
          {thread.unread > 9 ? "9+" : thread.unread}
        </span>
      )}
    </Link>
  );
}
