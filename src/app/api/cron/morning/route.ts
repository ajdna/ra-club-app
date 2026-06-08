/**
 * GET /api/cron/morning
 * Runs at 7:00 AM IST (01:30 UTC) daily via Vercel Cron.
 *
 * Creates in-app notifications:
 * 1. Members: weight log reminder
 * 2. Coaches: today's follow-up task summary
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
  // Verify Vercel cron secret to prevent abuse
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = serviceClient();
  const today = new Date().toISOString().split("T")[0];
  const created: string[] = [];

  // ── 1. Weight log reminder → all active members ─────────────────────────
  const { data: members } = await supabase
    .from("users")
    .select("id")
    .eq("role", "member")
    .eq("status", "active");

  if (members && members.length > 0) {
    const weightNotifs = members.map((m) => ({
      user_id: m.id,
      type: "weight_reminder" as const,
      title: "Aaj ka weight log karo 🌅",
      body: "Apna weight record karo — progress track karna zaroori hai!",

    }));

    const { error } = await supabase
      .from("notifications")
      .insert(weightNotifs);
    if (!error) created.push(`weight_reminder: ${members.length}`);
  }

  // ── 2. Follow-up brief → coaches with tasks today ───────────────────────
  const { data: todayTasks } = await supabase
    .from("follow_up_tasks")
    .select("coach_id")
    .eq("due_date", today)
    .eq("status", "pending");

  if (todayTasks && todayTasks.length > 0) {
    // Group by coach
    const coachCounts = new Map<string, number>();
    for (const t of todayTasks) {
      coachCounts.set(t.coach_id, (coachCounts.get(t.coach_id) ?? 0) + 1);
    }

    const coachNotifs = Array.from(coachCounts.entries()).map(
      ([coachId, count]) => ({
        user_id: coachId,
        type: "followup_reminder" as const,
        title: `Aaj ke ${count} follow-up tasks ready hain 📋`,
        body: "Follow-up section mein jaake complete karo.",
  
      }),
    );

    const { error } = await supabase
      .from("notifications")
      .insert(coachNotifs);
    if (!error) created.push(`followup_brief: ${coachNotifs.length} coaches`);
  }

  return NextResponse.json({ ok: true, date: today, created });
}
