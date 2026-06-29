/**
 * GET /api/cron/morning
 * Runs at 7:00 AM IST (01:30 UTC) daily via Vercel Cron.
 *
 * Creates in-app notifications:
 * 1. Members: weight log reminder
 * 2. Coaches: today's follow-up task summary
 *
 * When ff_notif_prefs is ON:
 *   - disabled users are excluded from both in-app and push
 *   - custom-time users are excluded from push (dispatch cron handles them)
 *   - remaining users (default-time group) receive push here as normal
 * When ff_notif_prefs is OFF: all users receive push (legacy behavior).
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { sendPushToUser } from "@/lib/push.server";
import { isFeatureEnabled } from "@/lib/flags";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

type PrefSets = { disabled: Set<string>; customTime: Set<string> };

async function getPrefSets(
  supabase: ReturnType<typeof serviceClient>,
  prefType: string,
): Promise<PrefSets> {
  const { data } = await supabase
    .from("notification_prefs")
    .select("user_id, enabled, send_time")
    .eq("type", prefType);
  const disabled = new Set<string>();
  const customTime = new Set<string>();
  for (const row of data ?? []) {
    if (!row.enabled) disabled.add(row.user_id);
    else if (row.send_time) customTime.add(row.user_id);
  }
  return { disabled, customTime };
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = serviceClient();
  const today = new Date().toISOString().split("T")[0];
  const created: string[] = [];
  const dispatchOwns = await isFeatureEnabled("notif_prefs");

  // ── 1. Weight log reminder → all active members ─────────────────────────
  const { data: members } = await supabase
    .from("users")
    .select("id")
    .eq("role", "member")
    .eq("status", "active");

  if (members && members.length > 0) {
    let weightPrefs: PrefSets = { disabled: new Set(), customTime: new Set() };
    if (dispatchOwns) {
      weightPrefs = await getPrefSets(supabase, "weight_log_reminder");
    }

    // In-app: exclude disabled users when flag is ON
    const notifMembers = dispatchOwns
      ? members.filter((m) => !weightPrefs.disabled.has(m.id))
      : members;

    if (notifMembers.length > 0) {
      const weightNotifs = notifMembers.map((m) => ({
        user_id: m.id,
        type: "weight_reminder" as const,
        title: "Aaj ka weight log karo 🌅",
        body: "Apna weight record karo — progress track karna zaroori hai!",
      }));
      const { error } = await supabase.from("notifications").insert(weightNotifs);
      if (!error) created.push(`weight_reminder: ${notifMembers.length}`);
    }

    // Push: default-time group (not disabled, not custom-time) when flag ON;
    //       all members when flag OFF.
    const pushTargets = dispatchOwns
      ? members.filter(
          (m) =>
            !weightPrefs.disabled.has(m.id) && !weightPrefs.customTime.has(m.id),
        )
      : members;

    if (pushTargets.length > 0) {
      await Promise.allSettled(
        pushTargets.map((m) =>
          sendPushToUser(m.id, {
            title: "Aaj ka weight log karo 🌅",
            body: "Apna weight record karo — progress track karna zaroori hai!",
            url: "/my-progress",
          }),
        ),
      );
    }
  }

  // ── 2. Follow-up brief → coaches with tasks today ───────────────────────
  const { data: todayTasks } = await supabase
    .from("follow_up_tasks")
    .select("coach_id")
    .eq("due_date", today)
    .eq("status", "pending");

  if (todayTasks && todayTasks.length > 0) {
    const coachCounts = new Map<string, number>();
    for (const t of todayTasks) {
      coachCounts.set(t.coach_id, (coachCounts.get(t.coach_id) ?? 0) + 1);
    }

    let followupPrefs: PrefSets = { disabled: new Set(), customTime: new Set() };
    if (dispatchOwns) {
      followupPrefs = await getPrefSets(supabase, "daily_followup_summary");
    }

    // In-app: exclude disabled coaches when flag is ON
    const notifEntries = Array.from(coachCounts.entries()).filter(
      ([coachId]) => !dispatchOwns || !followupPrefs.disabled.has(coachId),
    );

    if (notifEntries.length > 0) {
      const coachNotifs = notifEntries.map(([coachId, count]) => ({
        user_id: coachId,
        type: "followup_reminder" as const,
        title: `Aaj ke ${count} follow-up tasks ready hain 📋`,
        body: "Follow-up section mein jaake complete karo.",
      }));
      const { error } = await supabase.from("notifications").insert(coachNotifs);
      if (!error) created.push(`followup_brief: ${notifEntries.length} coaches`);
    }

    // Push: default-time group when flag ON; all coaches when flag OFF.
    const pushEntries = Array.from(coachCounts.entries()).filter(
      ([coachId]) =>
        !dispatchOwns ||
        (!followupPrefs.disabled.has(coachId) &&
          !followupPrefs.customTime.has(coachId)),
    );

    if (pushEntries.length > 0) {
      await Promise.allSettled(
        pushEntries.map(([coachId, count]) =>
          sendPushToUser(coachId, {
            title: `Aaj ke ${count} follow-up tasks ready hain 📋`,
            body: "Follow-up section mein jaake complete karo.",
            url: "/followup",
          }),
        ),
      );
    }
  }

  return NextResponse.json({ ok: true, date: today, created });
}
