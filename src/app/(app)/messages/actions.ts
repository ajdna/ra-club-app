"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Types ────────────────────────────────────────────────────────────────────
export interface ThreadSummary {
  id: string;
  type: "direct" | "broadcast" | "group";
  coachId: string;
  memberId: string | null;
  subject: string | null;
  otherName: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

// ── Get inbox threads ─────────────────────────────────────────────────────────
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

  const { data: rawThreads } = await supabase
    .from("chat_threads")
    .select("id, type, coach_id, member_id, subject, updated_at, coach:coach_id ( name ), member:member_id ( name )")
    .order("updated_at", { ascending: false });
  const threads = rawThreads as unknown as RawThread[] | null;

  if (!threads?.length) return [];

  const threadIds = threads.map((t) => t.id);

  type RawMsg = { thread_id: string; body: string; created_at: string; sender_id: string };
  type RawRead = { thread_id: string; last_read_at: string };

  const { data: rawMsgs } = await supabase
    .from("chat_messages")
    .select("thread_id, body, created_at, sender_id")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false });
  const lastMsgs = rawMsgs as RawMsg[] | null;

  const { data: rawReads } = await supabase
    .from("chat_reads")
    .select("thread_id, last_read_at")
    .in("thread_id", threadIds);
  const reads = rawReads as RawRead[] | null;

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
      otherName = t.subject ?? (coachName + " - Team");
    } else if (t.type === "group") {
      otherName = t.subject ?? "Group";
    } else if (t.coach_id === me.id) {
      otherName = memberName ?? "Member";
    } else {
      otherName = coachName;
    }

    return {
      id: t.id,
      type: t.type as "direct" | "broadcast" | "group",
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
    .select("id, sender_id, body, created_at, reply_to_message_id, sender:sender_id(name)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  type RawM = { id: string; sender_id: string; body: string; created_at: string; reply_to_message_id: string | null; sender: { name: string } | null };
  const msgs = data as unknown as RawM[] | null;
  if (!msgs?.length) return [];

  const msgIds = msgs.map((m) => m.id);
  const { data: reactionRows } = await supabase
    .from("message_reactions")
    .select("message_id, user_id, emoji")
    .in("message_id", msgIds);

  type RawR = { message_id: string; user_id: string; emoji: string };
  const allReactions = (reactionRows as RawR[] | null) ?? [];
  const reactionsByMsg = new Map<string, RawR[]>();
  for (const r of allReactions) {
    if (!reactionsByMsg.has(r.message_id)) reactionsByMsg.set(r.message_id, []);
    reactionsByMsg.get(r.message_id)!.push(r);
  }

  // Build quick lookup for quoted messages
  const msgById = new Map(msgs.map((m) => [m.id, m]));

  return msgs.map((m) => {
    const rows = reactionsByMsg.get(m.id) ?? [];
    const grouped: Record<string, { emoji: string; count: number; byMe: boolean }> = {};
    for (const r of rows) {
      if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, byMe: false };
      grouped[r.emoji].count++;
      if (r.user_id === me.id) grouped[r.emoji].byMe = true;
    }
    const quoted = m.reply_to_message_id ? msgById.get(m.reply_to_message_id) : null;
    return {
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender?.name ?? "Unknown",
      body: m.body,
      createdAt: m.created_at,
      isMe: m.sender_id === me.id,
      reactions: Object.values(grouped),
      replyToId: m.reply_to_message_id ?? null,
      replyToBody: quoted?.body ?? null,
      replyToName: quoted?.sender?.name ?? null,
    };
  });
}

// ── Get thread detail ─────────────────────────────────────────────────────────
export async function getThread(threadId: string) {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return null;

  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("chat_threads")
    .select("id, type, coach_id, member_id, subject, pinned_message_id, coach:coach_id(name), member:member_id(name)")
    .eq("id", threadId)
    .single();

  if (!raw) return null;
  type RawT = { id: string; type: string; coach_id: string; member_id: string | null; subject: string | null; pinned_message_id: string | null; coach: { name: string } | null; member: { name: string } | null };
  const data = raw as unknown as RawT;

  const coachName = data.coach?.name ?? "Coach";
  const memberName = data.member?.name ?? null;

  let title: string;
  if (data.type === "broadcast") {
    title = data.subject ?? (coachName + " - Team Broadcast");
  } else {
    if (data.coach_id === me.id) {
      title = memberName ?? coachName;
    } else {
      title = coachName;
    }
  }

  // Fetch other participant's read timestamp for double-tick receipts
  const { data: readsData } = await supabase
    .from("chat_reads")
    .select("user_id, last_read_at")
    .eq("thread_id", threadId);
  type RawRead = { user_id: string; last_read_at: string };
  const reads = (readsData as RawRead[] | null) ?? [];
  const otherRead = reads.find((r) => r.user_id !== me.id);
  const otherReadAt = otherRead?.last_read_at ?? null;

  // Fetch pinned message body if present
  let pinnedBody: string | null = null;
  if (data.pinned_message_id) {
    const { data: pm } = await supabase.from("chat_messages").select("body").eq("id", data.pinned_message_id).maybeSingle();
    pinnedBody = (pm as { body: string } | null)?.body ?? null;
  }

  return { id: data.id, type: data.type, title, coachId: data.coach_id, memberId: data.member_id, otherReadAt, pinnedMessageId: data.pinned_message_id, pinnedBody };
}

// ── Send a message ────────────────────────────────────────────────────────────
export async function sendMessage(threadId: string, body: string, replyToId?: string | null): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };
  if (!body.trim()) return { error: "Message cannot be empty" };

  const supabase = await createClient();
  const { error } = await supabase.from("chat_messages").insert({
    thread_id: threadId,
    sender_id: me.id,
    body: body.trim(),
    ...(replyToId ? { reply_to_message_id: replyToId } : {}),
  });

  if (error) return { error: error.message };
  revalidatePath("/messages/" + threadId);
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

// ── Start a direct thread ─────────────────────────────────────────────────────
export async function startDirectThread(otherUserId: string): Promise<{ threadId?: string; error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };

  const supabase = await createClient();
  const [aId, bId] = me.id < otherUserId ? [me.id, otherUserId] : [otherUserId, me.id];

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
export async function sendBroadcast(
  subject: string,
  body: string,
  target: "all" | "coaches" | "members" = "all",
): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };
  if (me.role === "member") return { error: "Sirf coaches broadcast bhej sakte hain." };
  if (!body.trim()) return { error: "Message cannot be empty" };

  const supabase = await createClient();

  const threadSubject = subject.trim() ||
    (target === "coaches" ? "Coaches Broadcast" : target === "members" ? "Members Broadcast" : "Team Broadcast");

  const { data: thread, error: tErr } = await supabase
    .from("chat_threads")
    .insert({ type: "broadcast", coach_id: me.id, subject: threadSubject })
    .select("id")
    .single();

  if (tErr) return { error: tErr.message };

  const { error: mErr } = await supabase.from("chat_messages").insert({
    thread_id: thread.id,
    sender_id: me.id,
    body: body.trim(),
  });

  if (mErr) return { error: mErr.message };

  const { data: downline } = await supabase
    .from("hierarchy_closure")
    .select("descendant:users!descendant_id(id, role)")
    .eq("ancestor_id", me.id)
    .gt("depth", 0);

  if (downline?.length) {
    type DRow = { descendant: { id: string; role: string } | null };
    const recipients = (downline as unknown as DRow[])
      .filter((r) => {
        if (!r.descendant) return false;
        if (target === "all") return true;
        if (target === "coaches") return ["coach", "jco", "nco"].includes(r.descendant.role);
        if (target === "members") return r.descendant.role === "member";
        return true;
      })
      .map((r) => ({
        user_id: r.descendant!.id,
        type: "broadcast" as const,
        title: threadSubject,
        body: body.trim().slice(0, 200),
        broadcast_target: target,
      }));

    if (recipients.length) {
      await supabase.from("notifications").insert(recipients);
    }
  }

  revalidatePath("/messages");
  return {};
}

// ── Get contacts ──────────────────────────────────────────────────────────────
export async function getMyContacts(): Promise<{
  id: string; name: string; role: string; group: "upline" | "downline";
}[]> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return [];

  const supabase = await createClient();
  type RawUser = { id: string; name: string; role: string };

  if (me.role === "member") {
    const { data: upline } = await supabase
      .from("hierarchy_closure")
      .select("ancestor:users!ancestor_id(id, name, role)")
      .eq("descendant_id", me.id)
      .eq("depth", 1);
    type RawUp = { ancestor: RawUser | null };
    return ((upline ?? []) as unknown as RawUp[])
      .filter((r) => r.ancestor)
      .map((r) => ({ ...r.ancestor!, group: "upline" as const }));
  }

  const [uplineRes, downlineRes] = await Promise.all([
    supabase.from("hierarchy_closure").select("ancestor:users!ancestor_id(id, name, role)").eq("descendant_id", me.id).gt("depth", 0),
    supabase.from("hierarchy_closure").select("descendant:users!descendant_id(id, name, role)").eq("ancestor_id", me.id).gt("depth", 0),
  ]);

  type RawUp   = { ancestor:   RawUser | null };
  type RawDown = { descendant: RawUser | null };

  const upline = ((uplineRes.data ?? []) as unknown as RawUp[])
    .filter((r) => r.ancestor).map((r) => ({ ...r.ancestor!, group: "upline" as const }));
  const downline = ((downlineRes.data ?? []) as unknown as RawDown[])
    .filter((r) => r.descendant).map((r) => ({ ...r.descendant!, group: "downline" as const }));

  const seen = new Set<string>();
  return [...upline, ...downline].filter((u) => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });
}

// ── Clear thread ──────────────────────────────────────────────────────────────
export async function clearThread(threadId: string): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };
  if (me.role === "member") return { error: "Members cannot clear threads" };

  const supabase = await createClient();
  const { data: thread } = await supabase.from("chat_threads").select("coach_id, member_id").eq("id", threadId).single();
  if (!thread) return { error: "Thread not found" };
  const isParticipant = thread.coach_id === me.id || thread.member_id === me.id;
  if (!isParticipant && me.role !== "club_owner") return { error: "Not a participant" };

  const { error } = await supabase.from("chat_messages").delete().eq("thread_id", threadId);
  if (error) return { error: error.message };
  revalidatePath("/messages/" + threadId);
  revalidatePath("/messages");
  return {};
}

// ── Kept for backward compat ──────────────────────────────────────────────────
export async function getMyMembers() {
  const contacts = await getMyContacts();
  return contacts.filter((c) => c.group === "downline").map((c) => ({ id: c.id, name: c.name }));
}

// ── Broadcast Groups (saved named lists) ─────────────────────────────────────

export type BroadcastGroup = {
  id: string;
  name: string;
  filterType: "all" | "by_role" | "by_stage" | "low_attendance";
  filterValue: string | null;
};

export async function getBroadcastGroups(): Promise<BroadcastGroup[]> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("broadcast_groups")
    .select("id, name, filter_type, filter_value")
    .eq("created_by", me.id)
    .order("created_at", { ascending: false });

  return (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    filterType: g.filter_type as BroadcastGroup["filterType"],
    filterValue: g.filter_value,
  }));
}

export async function createBroadcastGroup(
  name: string,
  filterType: BroadcastGroup["filterType"],
  filterValue: string | null,
): Promise<{ id?: string; error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };
  if (me.role === "member") return { error: "Members cannot create broadcast lists." };
  if (!name.trim()) return { error: "List name required" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("broadcast_groups")
    .insert({ name: name.trim(), created_by: me.id, filter_type: filterType, filter_value: filterValue })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/messages/broadcast");
  return { id: data.id };
}

export async function deleteBroadcastGroup(groupId: string): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };

  const supabase = await createClient();
  await supabase.from("broadcast_groups").delete().eq("id", groupId).eq("created_by", me.id);
  revalidatePath("/messages/broadcast");
  return {};
}

export async function sendBroadcastToGroup(
  groupId: string,
  subject: string,
  body: string,
): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };
  if (me.role === "member") return { error: "Members cannot broadcast." };
  if (!body.trim()) return { error: "Message cannot be empty" };

  const supabase = await createClient();

  const { data: group } = await supabase
    .from("broadcast_groups")
    .select("name, filter_type, filter_value")
    .eq("id", groupId)
    .eq("created_by", me.id)
    .single();
  if (!group) return { error: "List not found" };

  const { data: downline } = await supabase
    .from("hierarchy_closure")
    .select("descendant:users!descendant_id(id, role, members(stage))")
    .eq("ancestor_id", me.id)
    .gt("depth", 0);

  type DRow = { descendant: { id: string; role: string; members: { stage: number }[] | null } | null };
  const all = (downline as unknown as DRow[] ?? []).filter((r) => r.descendant);

  const recipients = all.filter((r) => {
    const d = r.descendant!;
    if (group.filter_type === "all") return true;
    if (group.filter_type === "by_role") return d.role === group.filter_value;
    if (group.filter_type === "by_stage") {
      const stage = d.members?.[0]?.stage;
      return stage !== undefined && String(stage) === group.filter_value;
    }
    return true;
  });

  if (!recipients.length) return { error: "No members match this list filter." };

  const threadSubject = subject.trim() || group.name;
  const { data: thread, error: tErr } = await supabase
    .from("chat_threads")
    .insert({ type: "broadcast", coach_id: me.id, subject: threadSubject })
    .select("id")
    .single();
  if (tErr) return { error: tErr.message };

  await supabase.from("chat_messages").insert({ thread_id: thread.id, sender_id: me.id, body: body.trim() });

  const notifs = recipients.map((r) => ({
    user_id: r.descendant!.id,
    type: "broadcast" as const,
    title: threadSubject,
    body: body.trim().slice(0, 200),
    broadcast_target: group.name,
  }));
  await supabase.from("notifications").insert(notifs);

  revalidatePath("/messages");
  return {};
}

// ── Toggle emoji reaction ─────────────────────────────────────────────────────
export async function toggleReaction(messageId: string, emoji: string): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };

  const supabase = await createClient();

  // Check if already reacted
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", me.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("message_reactions").delete().eq("id", existing.id);
  } else {
    const { error } = await supabase.from("message_reactions").insert({
      message_id: messageId,
      user_id: me.id,
      emoji,
    });
    if (error) return { error: error.message };
  }

  return {};
}

// ── Delete a message (sender only) ───────────────────────────────────────────
export async function deleteMessage(messageId: string): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };

  const supabase = await createClient();
  const { data: msg } = await supabase
    .from("chat_messages")
    .select("thread_id, sender_id")
    .eq("id", messageId)
    .maybeSingle();

  if (!msg) return { error: "Message not found" };
  if (msg.sender_id !== me.id) return { error: "Not your message" };

  const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);
  if (error) return { error: error.message };
  revalidatePath("/messages/" + msg.thread_id);
  return {};
}

// ── Pin / unpin a message in a thread ────────────────────────────────────────
export async function pinMessage(threadId: string, messageId: string | null): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_threads")
    .update({ pinned_message_id: messageId })
    .eq("id", threadId);

  if (error) return { error: error.message };
  revalidatePath("/messages/" + threadId);
  return {};
}

// ── Forward a message to another thread ──────────────────────────────────────
export async function forwardMessage(
  targetThreadId: string,
  body: string,
  forwardedFromName: string,
): Promise<{ error?: string }> {
  const forwardBody = "↪ Forwarded from " + forwardedFromName + ":\n" + body;
  return sendMessage(targetThreadId, forwardBody);
}

// ── Create a group thread ─────────────────────────────────────────────────────
export async function createGroupThread(
  name: string,
  memberIds: string[],
): Promise<{ threadId?: string; error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };
  if (!name.trim()) return { error: "Group name required" };
  if (memberIds.length < 1) return { error: "Add at least one member" };

  const supabase = await createClient();
  const { data: thread, error: tErr } = await supabase
    .from("chat_threads")
    .insert({ type: "group", coach_id: me.id, subject: name.trim() })
    .select("id")
    .single();

  if (tErr) return { error: tErr.message };

  const allMembers = [...new Set([me.id, ...memberIds])];
  const { error: mErr } = await supabase.from("chat_group_members").insert(
    allMembers.map((uid) => ({ thread_id: thread.id, user_id: uid, added_by: me.id }))
  );

  if (mErr) return { error: mErr.message };
  revalidatePath("/messages");
  return { threadId: thread.id };
}

// ── Get group members ─────────────────────────────────────────────────────────
export async function getGroupMembers(threadId: string): Promise<{ id: string; name: string }[]> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_group_members")
    .select("user:user_id(id, name)")
    .eq("thread_id", threadId);

  type Row = { user: { id: string; name: string } | null };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.user)
    .map((r) => ({ id: r.user!.id, name: r.user!.name }));
}

// ── Update last seen ──────────────────────────────────────────────────────────
export async function updateLastSeen(): Promise<void> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return;

  const supabase = await createClient();
  await supabase.from("users").update({ last_seen_at: new Date().toISOString() }).eq("id", me.id);
}

// ── Get other user's last seen ────────────────────────────────────────────────
export async function getLastSeen(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("last_seen_at")
    .eq("id", userId)
    .maybeSingle();
  return (data as { last_seen_at: string | null } | null)?.last_seen_at ?? null;
}

// ── Save push subscription ────────────────────────────────────────────────────
export async function savePushSubscription(
  endpoint: string,
  p256dh: string,
  auth: string,
  userAgent?: string,
): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: me.id, endpoint, p256dh, auth, user_agent: userAgent ?? "" },
      { onConflict: "user_id,endpoint" }
    );

  return error ? { error: error.message } : {};
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return;

  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete()
    .eq("user_id", me.id).eq("endpoint", endpoint);
}

// ── Send push notification to a user ─────────────────────────────────────────
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url: string,
): Promise<void> {
  const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail   = process.env.VAPID_EMAIL;
  if (!vapidPublic || !vapidPrivate || !vapidEmail) return;

  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return;

  const webpush = await import("web-push").catch(() => null);
  if (!webpush) return;

  webpush.default.setVapidDetails("mailto:" + vapidEmail, vapidPublic, vapidPrivate);
  const payload = JSON.stringify({ title, body, url, tag: url });
  await Promise.allSettled(
    (subs as { endpoint: string; p256dh: string; auth: string }[]).map((s) =>
      webpush.default.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      )
    )
  );
}
