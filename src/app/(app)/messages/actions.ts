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
  if (data.type === "broadcast") {
    title = data.subject ?? `${coachName} — Team Broadcast`;
  } else {
    // Direct thread: show the OTHER person's name
    if (data.coach_id === me.id) {
      title = memberName ?? coachName;
    } else {
      title = coachName;
    }
  }

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

// ── Start a direct thread between me and any other user ──────────────────────
// Works regardless of role — club_owner↔member, coach↔jco, etc.
// Uses canonical ordering: least(uuid) always goes into coach_id so the
// unique index fires correctly even if thread is created from either end.
export async function startDirectThread(otherUserId: string): Promise<{ threadId?: string; error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };

  const supabase = await createClient();

  // Canonical pair: smaller UUID in coach_id
  const [aId, bId] =
    me.id < otherUserId ? [me.id, otherUserId] : [otherUserId, me.id];

  // Look for existing thread in either direction
  const { data: existing } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("type", "direct")
    .eq("coach_id", aId)
    .eq("member_id", bId)
    .maybeSingle();

  if (existing) return { threadId: existing.id };

  const { data, error } = await supabase
    .from("chat_threads")
    .insert({ type: "direct", coach_id: aId, member_id: bId })
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
  if (me.role === "member") return { error: "Sirf coaches broadcast bhej sakte hain." };
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

// ── Get contacts I'm allowed to message ──────────────────────────────────────
// Upline  = ancestors in hierarchy_closure (people above me)
// Downline = descendants in hierarchy_closure (people below me)
// Members see only their direct coach (depth 1 upline).
// Everyone else sees their full upline chain + all downline.
export async function getMyContacts(): Promise<{
  id: string;
  name: string;
  role: string;
  group: "upline" | "downline";
}[]> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return [];

  const supabase = await createClient();

  type RawUser = { id: string; name: string; role: string };

  if (me.role === "member") {
    // Members can only message their direct coach
    const { data: upline, error: uplineErr } = await supabase
      .from("hierarchy_closure")
      .select("ancestor:users!ancestor_id(id, name, role)")
      .eq("descendant_id", me.id)
      .eq("depth", 1);

    if (uplineErr) console.error("[getMyContacts] member upline error:", uplineErr);

    type RawUp = { ancestor: RawUser | null };
    return ((upline ?? []) as unknown as RawUp[])
      .filter((r) => r.ancestor)
      .map((r) => ({ ...r.ancestor!, group: "upline" as const }));
  }

  // Everyone else: full upline + full downline (excluding self)
  const [uplineRes, downlineRes] = await Promise.all([
    supabase
      .from("hierarchy_closure")
      .select("ancestor:users!ancestor_id(id, name, role)")
      .eq("descendant_id", me.id)
      .gt("depth", 0),
    supabase
      .from("hierarchy_closure")
      .select("descendant:users!descendant_id(id, name, role)")
      .eq("ancestor_id", me.id)
      .gt("depth", 0),
  ]);

  type RawUp   = { ancestor:   RawUser | null };
  type RawDown = { descendant: RawUser | null };

  const upline = ((uplineRes.data ?? []) as unknown as RawUp[])
    .filter((r) => r.ancestor)
    .map((r) => ({ ...r.ancestor!, group: "upline" as const }));

  const downline = ((downlineRes.data ?? []) as unknown as RawDown[])
    .filter((r) => r.descendant)
    .map((r) => ({ ...r.descendant!, group: "downline" as const }));

  // Dedup (a user might appear via multiple paths in a DAG)
  const seen = new Set<string>();
  return [...upline, ...downline].filter((u) => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });
}

// ── Clear all messages in a thread (coach / owner only) ──────────────────────
// The caller must be a participant in the thread and have a non-member role.
export async function clearThread(threadId: string): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };
  if (me.role === "member") return { error: "Members cannot clear threads" };

  const supabase = await createClient();

  // Verify caller is a participant
  const { data: thread } = await supabase
    .from("chat_threads")
    .select("coach_id, member_id")
    .eq("id", threadId)
    .single();

  if (!thread) return { error: "Thread not found" };
  const isParticipant = thread.coach_id === me.id || thread.member_id === me.id;
  if (!isParticipant && me.role !== "club_owner") return { error: "Not a participant" };

  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("thread_id", threadId);

  if (error) return { error: error.message };
  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");
  return {};
}

// ── Kept for backward compat (broadcast page uses this) ──────────────────────
export async function getMyMembers() {
  const contacts = await getMyContacts();
  return contacts
    .filter((c) => c.group === "downline")
    .map((c) => ({ id: c.id, name: c.name }));
}

