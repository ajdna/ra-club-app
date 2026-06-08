"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Types ────────────────────────────────────────────────────────────────────
export interface ThreadSummary {
  id: string;
  type: "direct" | "broadcast";
  coachId: string;
  memberId: string | null;
  subject: string | null;
  otherName: string;    // display name of the other party
  lastMessage: string;
  lastAt: string;
  unread: number;
}

// ── Get inbox threads for the current user ────────────────────────────────────
export async function getThreads(): Promise<ThreadSummary[]> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return [];

  const supabase = await createClient();

  type RawThread = {
    id: string; type: string; coach_id: string; member_id: string | null;
    subject: string | null; updated_at: string;
    coach: { name: string } | null;
    member: { name: string } | null;
  };

  // Fetch threads visible to me (RLS handles filtering)
  const { data: rawThreads } = await supabase
    .from("chat_threads")
    .select(`
      id, type, coach_id, member_id, subject, updated_at,
      coach:coach_id ( name ),
      member:member_id ( name )
    `)
    .order("updated_at", { ascending: false });
  const threads = rawThreads as unknown as RawThread[] | null;

  if (!threads?.length) return [];

  const threadIds = threads.map((t) => t.id);

  type RawMsg = { thread_id: string; body: string; created_at: string; sender_id: string };
  type RawRead = { thread_id: string; last_read_at: string };

  // Fetch last message per thread
  const { data: rawMsgs } = await supabase
    .from("chat_messages")
    .select("thread_id, body, created_at, sender_id")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false });
  const lastMsgs = rawMsgs as RawMsg[] | null;

  // Fetch my read timestamps
  const { data: rawReads } = await supabase
    .from("chat_reads")
    .select("thread_id, last_read_at")
    .in("thread_id", threadIds);
  const reads = rawReads as RawRead[] | null;

  // Fetch unread counts
  const lastMsgByThread = new Map<string, RawMsg>();
  const seenThread = new Set<string>();
  for (const m of lastMsgs ?? []) {
    if (!seenThread.has(m.thread_id)) {
      seenThread.add(m.thread_id);
      lastMsgByThread.set(m.thread_id, m);
    }
  }

  const readAt = new Map<string, string>();
  for (const r of reads ?? []) readAt.set(r.thread_id, r.last_read_at);

  // Count unread per thread (messages after my last_read, not sent by me)
  const unreadByThread = new Map<string, number>();
  for (const m of lastMsgs ?? []) {
    if (m.sender_id === me.id) continue;
    const myRead = readAt.get(m.thread_id);
    if (!myRead || m.created_at > myRead) {
      unreadByThread.set(m.thread_id, (unreadByThread.get(m.thread_id) ?? 0) + 1);
    }
  }

  return threads!.map((t) => {
    const last = lastMsgByThread.get(t.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coachName = (t.coach as any)?.name ?? "Coach";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memberName = (t.member as any)?.name ?? null;

    let otherName: string;
    if (t.type === "broadcast") {
      otherName = t.subject ?? `${coachName} — Team`;
    } else if (t.coach_id === me.id) {
      otherName = memberName ?? "Member";
    } else {
      otherName = coachName;
    }

    return {
      id: t.id,
      type: t.type as "direct" | "broadcast",
      coachId: t.coach_id,
      memberId: t.member_id,
      subject: t.subject,
      otherName,
      lastMessage: last?.body ?? "No messages yet",
      lastAt: last?.created_at ?? t.updated_at,
      unread: unreadByThread.get(t.id) ?? 0,
    };
  });
}

// ── Get messages in a thread ──────────────────────────────────────────────────
export async function getMessages(threadId: string) {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select(`id, sender_id, body, created_at, sender:sender_id(name)`)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  type RawM = { id: string; sender_id: string; body: string; created_at: string; sender: { name: string } | null };
  const msgs = data as unknown as RawM[] | null;

  return (msgs ?? []).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    senderName: m.sender?.name ?? "Unknown",
    body: m.body,
    createdAt: m.created_at,
    isMe: m.sender_id === me.id,
  }));
}

// ── Get thread detail ─────────────────────────────────────────────────────────
export async function getThread(threadId: string) {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return null;

  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("chat_threads")
    .select(`id, type, coach_id, member_id, subject, coach:coach_id(name), member:member_id(name)`)
    .eq("id", threadId)
    .single();

  if (!raw) return null;
  type RawT = { id: string; type: string; coach_id: string; member_id: string | null; subject: string | null; coach: { name: string } | null; member: { name: string } | null };
  const data = raw as unknown as RawT;

  const coachName = data.coach?.name ?? "Coach";
  const memberName = data.member?.name ?? null;

  let title: string;
  if (data.type === "broadcast") title = data.subject ?? `${coachName} — Team Broadcast`;
  else if (data.coach_id === me.id) title = memberName ?? "Member";
  else title = coachName;

  return { id: data.id, type: data.type, title, coachId: data.coach_id, memberId: data.member_id };
}

// ── Send a message ────────────────────────────────────────────────────────────
export async function sendMessage(threadId: string, body: string): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };
  if (!body.trim()) return { error: "Message cannot be empty" };

  const supabase = await createClient();
  const { error } = await supabase.from("chat_messages").insert({
    thread_id: threadId,
    sender_id: me.id,
    body: body.trim(),
  });

  if (error) return { error: error.message };
  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");
  return {};
}

// ── Mark thread as read ───────────────────────────────────────────────────────
export async function markThreadRead(threadId: string) {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return;

  const supabase = await createClient();
  await supabase.from("chat_reads").upsert(
    { thread_id: threadId, user_id: me.id, last_read_at: new Date().toISOString() },
    { onConflict: "thread_id,user_id" },
  );
  revalidatePath("/messages");
}

// ── Start a direct thread (or return existing) ───────────────────────────────
export async function startDirectThread(memberId: string): Promise<{ threadId?: string; error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };

  const supabase = await createClient();

  // Coach starts with member, or member starts with their coach
  const coachId = me.id;

  // Check existing
  const { data: existing } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("type", "direct")
    .eq("coach_id", coachId)
    .eq("member_id", memberId)
    .single();

  if (existing) return { threadId: existing.id };

  const { data, error } = await supabase
    .from("chat_threads")
    .insert({ type: "direct", coach_id: coachId, member_id: memberId })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/messages");
  return { threadId: data.id };
}

// ── Broadcast to all members ──────────────────────────────────────────────────
export async function sendBroadcast(subject: string, body: string): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };
  if (!body.trim()) return { error: "Message cannot be empty" };

  const supabase = await createClient();

  // Create a new broadcast thread every time (they're like announcements)
  const { data: thread, error: tErr } = await supabase
    .from("chat_threads")
    .insert({ type: "broadcast", coach_id: me.id, subject: subject.trim() || "Team Broadcast" })
    .select("id")
    .single();

  if (tErr) return { error: tErr.message };

  const { error: mErr } = await supabase.from("chat_messages").insert({
    thread_id: thread.id,
    sender_id: me.id,
    body: body.trim(),
  });

  if (mErr) return { error: mErr.message };
  revalidatePath("/messages");
  return {};
}

// ── Get my members list (for starting conversations) ─────────────────────────
export async function getMyMembers() {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("user_id, user:user_id(name)")
    .eq("coach_id", me.id);

  return (data ?? []).map((m) => ({
    id: m.user_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: (m.user as any)?.name ?? "Member",
  }));
}

