/**
 * GET /api/cron/evening
 * Runs at 6:00 PM IST (12:30 UTC) daily via Vercel Cron.
 *
 * Creates in-app notifications:
 * 1. Members: evening check-in prompt
 * 2. Coaches: DMO score reminder + overdue follow-ups
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = serviceClient();
  const today = new Date().toISOString().split("T")[0];
  const created: string[] = [];

  // ── 1. Evening check-in → all active members ────────────────────────────
  const { data: members } = await supabase
    .from("users")
    .select("id")
    .eq("role", "member")
    .eq("status", "active");

  if (members && members.length > 0) {
    const checkInNotifs = members.map((m) => ({
      user_id: m.id,
      type: "checkin_reminder" as const,
      title: "Aaj kaisa raha? 💪",
      body: "Club attendance mark karo aur apna feel share karo!",

    }));

    const { error } = await supabase
      .from("notifications")
      .insert(checkInNotifs);
    if (!error) created.push(`checkin_reminder: ${members.length}`);
  }

  // ── 2. DMO reminder → all active coaches ────────────────────────────────
  // Only notify coaches who haven't logged DMO today
  const { data: coaches } = await supabase
    .from("users")
    .select("id")
    .in("role", ["coach", "jco", "nco", "club_owner"])
    .eq("status", "active");

  if (coaches && coaches.length > 0) {
    // Find coaches who already logged DMO today
    const { data: logged } = await supabase
      .from("dmo_entries")
      .select("coach_id")
      .eq("entry_date", today);

    const loggedIds = new Set((logged ?? []).map((d) => d.coach_id));
    const needReminder = coaches.filter((c) => !loggedIds.has(c.id));

    if (needReminder.length > 0) {
      const dmoNotifs = needReminder.map((c) => ({
        user_id: c.id,
        type: "dmo_reminder" as const,
        title: "Aaj ka DMO score bharo 📊",
        body: "Din khatam hone se pehle apna DMO scorecard complete karo.",
  
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(dmoNotifs);
      if (!error) created.push(`dmo_reminder: ${needReminder.length}`);
    }
  }

  // ── 3. Overdue follow-ups alert → coaches ───────────────────────────────
  const { data: overdueGroups } = await supabase
    .from("follow_up_tasks")
    .select("coach_id")
    .eq("status", "pending")
    .lt("due_date", today);

  if (overdueGroups && overdueGroups.length > 0) {
    const counts = new Map<string, number>();
    for (const t of overdueGroups) {
      counts.set(t.coach_id, (counts.get(t.coach_id) ?? 0) + 1);
    }

    const overdueNotifs = Array.from(counts.entries()).map(
      ([coachId, count]) => ({
        user_id: coachId,
        type: "followup_overdue" as const,
        title: `${count} follow-up tasks overdue ⚠️`,
        body: "Kuch tasks miss ho gaye — abhi complete karo.",
  
      }),
    );

    const { error } = await supabase
      .from("notifications")
      .insert(overdueNotifs);
    if (!error) created.push(`overdue_alert: ${overdueNotifs.length} coaches`);
  }

  return NextResponse.json({ ok: true, date: today, created });
}
