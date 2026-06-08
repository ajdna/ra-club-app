import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getThread, getMessages } from "../actions";
import { ChatClient } from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (typeof me === "string") redirect("/");

  const [thread, messages] = await Promise.all([
    getThread(id),
    getMessages(id),
  ]);

  if (!thread) notFound();

  return (
    <div className="flex h-dvh flex-col bg-cream">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-line bg-card px-4 py-3 shadow-sm">
        <Link href="/messages" className="text-sage-d">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{thread.title}</p>
          {thread.type === "broadcast" && (
            <p className="text-xs text-ink/50">Team broadcast</p>
          )}
        </div>
      </header>

      {/* Chat */}
      <ChatClient
        threadId={id}
        initialMessages={messages}
        myId={me.id}
        otherName={thread.title}
      />
    </div>
  );
}
