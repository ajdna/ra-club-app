/**
 * POST /api/push/notify
 *
 * Called by Supabase Database Webhooks on:
 *   - chat_messages INSERT   → notify recipient(s)
 *   - follow_up_tasks UPDATE (scheduled_at first set) → notify member
 *
 * Authorization: Bearer <PUSH_WEBHOOK_SECRET>
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUser, sendPushToUsers } from "@/lib/push.server";

function truncate(s: string, max = 120) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export async function POST(req: Request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.PUSH_WEBHOOK_SECRET}`;
  if (authHeader !== expected) {
    console.error("[push/notify] Unauthorized — header:", authHeader);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    console.error("[push/notify] Bad JSON body");
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }

  const { type, table, record, old_record } = payload as {
    type: "INSERT" | "UPDATE";
    table: string;
    record: Record<string, unknown>;
    old_record?: Record<string, unknown>;
  };

  console.log(`[push/notify] ${type} on ${table}`);

  const supabase = createServiceClient();

  // ── New chat message ───────────────────────────────────────────────────────
  if (table === "chat_messages" && type === "INSERT") {
    const { thread_id, sender_id, body } = record as {
      thread_id: string;
      sender_id: string;
      body: string;
    };

    const [{ data: thread, error: threadErr }, { data: sender }] = await Promise.all([
      supabase
        .from("chat_threads")
        .select("type, coach_id, member_id")
        .eq("id", thread_id)
        .single(),
      supabase
        .from("users")
        .select("name")
        .eq("id", sender_id)
        .single(),
    ]);

    if (threadErr || !thread) {
      console.error("[push/notify] Thread not found:", threadErr?.message);
      return NextResponse.json({ ok: true });
    }

    const senderName = (sender?.name as string | null) ?? "Someone";
    const deepUrl = `/messages/${thread_id}`;

    if (thread.type === "direct") {
      // Recipient is whichever participant is NOT the sender
      const recipientId =
        thread.coach_id === sender_id ? thread.member_id : thread.coach_id;
      if (recipientId) {
        console.log(`[push/notify] direct → sending to ${recipientId}`);
        await sendPushToUser(recipientId, {
          title: `💬 ${senderName}`,
          body: truncate(body as string),
          url: deepUrl,
          tag: `msg-${thread_id}`,
        });
      }
    } else if (thread.type === "broadcast") {
      // All hierarchy descendants of the broadcaster (not the sender themselves)
      const { data: descendants, error: descErr } = await supabase
        .from("hierarchy_closure")
        .select("descendant_id")
        .eq("ancestor_id", thread.coach_id)
        .gt("depth", 0);

      if (descErr) console.error("[push/notify] hierarchy_closure error:", descErr.message);

      const recipientIds = (descendants ?? [])
        .map((d) => d.descendant_id)
        .filter((id) => id !== sender_id);

      console.log(`[push/notify] broadcast → ${recipientIds.length} recipients`);

      if (recipientIds.length) {
        await sendPushToUsers(recipientIds, {
          title: `📢 ${senderName} — Team`,
          body: truncate(body as string),
          url: deepUrl,
          tag: `broadcast-${thread_id}`,
        });
      }
    }
  }

  // ── Home visit scheduled ───────────────────────────────────────────────────
  if (
    table === "follow_up_tasks" &&
    type === "UPDATE" &&
    record.scheduled_at &&
    !old_record?.scheduled_at
  ) {
    const { member_id, scheduled_at, meeting_link, id } = record as {
      member_id: string;
      scheduled_at: string;
      meeting_link: string | null;
      id: string;
    };

    const dateStr = new Date(scheduled_at).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short",
      hour: "numeric", minute: "2-digit",
    });

    console.log(`[push/notify] home_visit scheduled → member ${member_id}`);
    await sendPushToUser(member_id, {
      title: "🏠 Home Visit Scheduled",
      body: `Coach ne visit schedule kiya: ${dateStr}${meeting_link ? " — meeting link added" : ""}`,
      url: `/followup`,
      tag: `visit-${id}`,
    });
  }

  return NextResponse.json({ ok: true });
}
