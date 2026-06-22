import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getThreads } from "./actions";
import { PushSubscribeButton } from "./PushSubscribeButton";

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
  const groups = threads.filter((t) => t.type === "group");
  const directs = threads.filter((t) => t.type === "direct");

  const canBroadcast = me.role !== "member" && me.role !== "guest";

  return (
    <main className="px-4 pb-24 pt-5">
      <header className="mb-5 flex items-end justify-between px-1">
        <h1 className="font-display text-[28px] font-medium tracking-tight text-ink">Messages</h1>
        <Link
          href="/messages/new"
          aria-label="New message"
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald text-white shadow-[0_8px_18px_var(--emerald-soft)] transition hover:bg-emerald-2"
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </Link>
      </header>

      {canBroadcast && (
        <div className="mb-4 flex flex-col gap-1">
          <Link href="/messages/broadcast" className="flex items-center gap-3 rounded-[16px] bg-emerald-soft p-3 transition hover:bg-emerald-soft/70">
            <span className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-[16px] bg-emerald text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11v2a1 1 0 0 0 1 1h3l4 4V6L7 10H4a1 1 0 0 0-1 1ZM16 8a5 5 0 0 1 0 8" /></svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-emerald">New broadcast</span>
              <span className="block text-[13px] font-medium text-ink-2">Message everyone at once</span>
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-emerald" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </Link>
          <Link href="/messages/group/new" className="flex items-center gap-3 rounded-[16px] p-3 transition hover:bg-cream-2">
            <span className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full bg-sage/15 text-sage-d">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.2a3 3 0 0 1 0 5.6M18 19a5.5 5.5 0 0 0-2-4.3" /></svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">New group</span>
              <span className="block text-[13px] font-medium text-ink-2">Start a group conversation</span>
            </span>
          </Link>
        </div>
      )}

      <div className="mb-4">
        <PushSubscribeButton />
      </div>

      {threads.length === 0 && (
        <div className="mt-16 text-center text-ink-2">
          <div className="text-4xl">💬</div>
          <p className="mt-3 font-semibold text-ink">Koi message nahi abhi</p>
          <p className="mt-1 text-sm">+ tap karke baat shuru karein</p>
        </div>
      )}

      {broadcasts.length > 0 && (
        <Section title="Broadcasts">
          {broadcasts.map((t) => <ThreadRow key={t.id} thread={t} />)}
        </Section>
      )}
      {groups.length > 0 && (
        <Section title="Groups">
          {groups.map((t) => <ThreadRow key={t.id} thread={t} />)}
        </Section>
      )}
      {directs.length > 0 && (
        <Section title="Direct">
          {directs.map((t) => <ThreadRow key={t.id} thread={t} />)}
        </Section>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <p className="mb-2 px-1 text-[12.5px] font-semibold text-ink-2">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

function ThreadRow({ thread }: { thread: Awaited<ReturnType<typeof getThreads>>[number] }) {
  const hasUnread = thread.unread > 0;
  const av =
    thread.type === "broadcast" ? "bg-terra-soft text-terra"
    : thread.type === "group" ? "bg-emerald-soft text-emerald"
    : "bg-sage/15 text-sage-d";
  return (
    <Link
      href={`/messages/${thread.id}`}
      className={`flex items-center gap-3 rounded-[16px] p-3 transition ${
        hasUnread ? "bg-emerald-soft" : "hover:bg-cream-2"
      }`}
    >
      <span className={`grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full text-[16px] font-semibold ${av}`}>
        {thread.type === "broadcast" ? "📢" : thread.type === "group" ? "👥" : initials(thread.otherName)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-[15px] font-semibold ${hasUnread ? "text-emerald" : "text-ink"}`}>
            {thread.otherName}
          </span>
          <span className="shrink-0 text-[11.5px] font-medium text-ink-3">{timeAgo(thread.lastAt)}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-[13.5px] text-ink-2">{thread.lastMessage}</p>
          {hasUnread && (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-emerald px-1 text-[11px] font-bold text-white">
              {thread.unread > 9 ? "9+" : thread.unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
