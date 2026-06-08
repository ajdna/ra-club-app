/**
 * POST /api/push/simulate
 *
 * Simulates the Supabase webhook for a given thread_id + sender_id.
 * Used for debugging — bypasses Supabase so we can test the full
 * notification pipeline without needing the webhook to fire.
 *
 * Only accessible to club_owner and nco roles.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUser, sendPushToUsers } from "@/lib/push.server";

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!["club_owner", "nco"].includes(me.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { thread_id } = await req.json() as { thread_id?: string };
  if (!thread_id) return NextResponse.json({ error: "thread_id required" }, { status: 400 });

  const supabase = createServiceClient();

  // Get last message in this thread
  const { data: msg } = await supabase
    .from("chat_messages")
    .select("id, thread_id, sender_id, body")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!msg) return NextResponse.json({ error: "No messages in thread" }, { status: 404 });

  const { data: thread } = await supabase
    .from("chat_threads")
    .select("type, coach_id, member_id")
    .eq("id", thread_id)
    .single();

  const { data: sender } = await supabase
    .from("users")
    .select("name")
    .eq("id", msg.sender_id)
    .single();

  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const senderName = (sender?.name as string | null) ?? "Someone";
  const deepUrl = `/messages/${thread_id}`;
  const log: string[] = [];

  if (thread.type === "direct") {
    const recipientId = thread.coach_id === msg.sender_id ? thread.member_id : thread.coach_id;
    if (!recipientId) return NextResponse.json({ error: "No recipient" }, { status: 400 });

    // Check if recipient has subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", recipientId);

    log.push(`Recipient: ${recipientId} — ${subs?.length ?? 0} subscription(s)`);

    if (!subs?.length) {
      log.push("❌ Recipient has no push subscriptions — they need to click Allow in the app");
    } else {
      await sendPushToUser(recipientId, {
        title: `💬 ${senderName}`,
        body: msg.body,
        url: deepUrl,
        tag: `msg-${thread_id}`,
      });
      log.push(`✅ Push sent to ${subs.length} device(s)`);
    }
  } else if (thread.type === "broadcast") {
    const { data: descendants } = await supabase
      .from("hierarchy_closure")
      .select("descendant_id")
      .eq("ancestor_id", thread.coach_id)
      .gt("depth", 0);

    const recipientIds = (descendants ?? [])
      .map((d) => d.descendant_id)
      .filter((id) => id !== msg.sender_id);

    log.push(`Broadcast recipients: ${recipientIds.length}`);

    // Count how many have subscriptions
    if (recipientIds.length) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("user_id")
        .in("user_id", recipientIds);
      const subUserIds = new Set((subs ?? []).map((s) => s.user_id));
      log.push(`${subUserIds.size} of ${recipientIds.length} recipients have subscriptions`);

      if (subUserIds.size) {
        await sendPushToUsers(recipientIds, {
          title: `📢 ${senderName} — Team`,
          body: msg.body,
          url: deepUrl,
          tag: `broadcast-${thread_id}`,
        });
        log.push("✅ Broadcast push sent");
      }
    }
  }

  return NextResponse.json({ ok: true, thread_id, log });
}
