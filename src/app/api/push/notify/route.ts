/**
 * POST /api/push/notify
 *
 * Called by Supabase Database Webhooks on:
 *   - chat_messages INSERT   → notify recipient(s)
 *   - follow_up_tasks INSERT or UPDATE (scheduled_at set) → notify member
 *
 * The request must include:
 *   Authorization: Bearer <PUSH_WEBHOOK_SECRET>
 *
 * Supabase webhook payload shape:
 *   { type: "INSERT"|"UPDATE", table: string, record: {...}, old_record: {...} }
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const { type, table, record, old_record } = payload as {
    type: "INSERT" | "UPDATE";
    table: string;
    record: Record<string, unknown>;
    old_record?: Record<string, unknown>;
  };

  const supabase = createServiceClient();

  // ── New chat message ───────────────────────────────────────────────────────
  if (table === "chat_messages" && type === "INSERT") {
    const { thread_id, sender_id, body } = record as {
      thread_id: string;
      sender_id: string;
      body: string;
    };

    // Fetch thread + sender name
    const [{ data: thread }, { data: sender }] = await Promise.all([
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

    if (!thread) return NextResponse.json({ ok: true });

    const senderName = (sender?.name as string | null) ?? "Someone";
    const deepUrl = `/messages/${thread_id}`;

    if (thread.type === "direct") {
      // Notify the other party only
      const recipientId =
        thread.coach_id === sender_id ? thread.member_id : thread.coach_id;
      if (recipientId) {
        await sendPushToUser(recipientId, {
          title: `💬 ${senderName}`,
          body: truncate(body as string),
          url: deepUrl,
          tag: `msg-${thread_id}`,
        });
      }
    } else if (thread.type === "broadcast") {
      // Notify all members of the coach (except the sender)
      const { data: members } = await supabase
        .from("members")
        .select("user_id")
        .eq("coach_id", thread.coach_id);

      const recipientIds = (members ?? [])
        .map((m) => m.user_id)
        .filter((id) => id !== sender_id);

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

  // ── Home visit scheduled (follow_up_tasks scheduled_at set) ───────────────
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
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });

    await sendPushToUser(member_id, {
      title: "🏠 Home Visit Scheduled",
      body: `Your coach scheduled a visit: ${dateStr}${meeting_link ? " — meeting link added" : ""}`,
      url: `/followup`,
      tag: `visit-${id}`,
    });
  }

  // ── Follow-up task due today (for overdue alerts) ─────────────────────────
  // (This hook is for INSERT only — the daily reminder cron is separate)
  if (table === "follow_up_tasks" && type === "INSERT") {
    const { coach_id, activity, due_date, member_id, id } = record as {
      coach_id: string;
      activity: string;
      due_date: string;
      member_id: string;
      id: string;
    };

    const today = new Date().toISOString().split("T")[0];
    if (due_date === today) {
      // Get member name
      const { data: user } = await supabase
        .from("users")
        .select("name")
        .eq("id", member_id)
        .single();

      const memberName = (user?.name as string | null) ?? "a member";
      const activityLabel: Record<string, string> = {
        call: "Call",
        home_visit: "Home visit",
        reminder: "Reminder call",
      };

      await sendPushToUser(coach_id, {
        title: "📋 Task due today",
        body: `${activityLabel[activity as string] ?? activity} with ${memberName}`,
        url: `/followup`,
        tag: `task-${id}`,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
