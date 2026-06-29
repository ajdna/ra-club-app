/**
 * GET /api/cron/evening
 * Runs at 6:00 PM IST (12:30 UTC) daily via Vercel Cron.
 *
 * Creates in-app notifications:
 * 1. Members: evening check-in prompt
 * 2. Coaches: DMO score reminder + overdue follow-ups
 *
 * When ff_notif_prefs is ON:
 *   - disabled users are excluded from both in-app and push for evening_summary
 *   - custom-time users are excluded from push (dispatch cron handles them)
 *   - remaining members (default-time group) receive push here
 * When ff_notif_prefs is OFF: all members receive push (and in-app as before).
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

  // ── 1. Evening check-in → all active members ────────────────────────────
  const { data: members } = await supabase
    .from("users")
    .select("id")
    .eq("role", "member")
    .eq("status", "active");

  if (members && members.length > 0) {
    let eveningPrefs: PrefSets = { disabled: new Set(), customTime: new Set() };
    if (dispatchOwns) {
      eveningPrefs = await getPrefSets(supabase, "evening_summary");
    }

    // In-app: exclude disabled members when flag is ON
    const notifMembers = dispatchOwns
      ? members.filter((m) => !eveningPrefs.disabled.has(m.id))
      : members;

    if (notifMembers.length > 0) {
      const checkInNotifs = notifMembers.map((m) => ({
        user_id: m.id,
        type: "checkin_reminder" as const,
        title: "Aaj kaisa raha? 💪",
        body: "Club attendance mark karo aur apna feel share karo!",
      }));
      const { error } = await supabase.from("notifications").insert(checkInNotifs);
      if (!error) created.push(`checkin_reminder: ${notifMembers.length}`);
    }

    // Push: default-time group when flag ON; all members when flag OFF.
    const pushTargets = dispatchOwns
      ? members.filter(
          (m) =>
            !eveningPrefs.disabled.has(m.id) && !eveningPrefs.customTime.has(m.id),
        )
      : members;

    if (pushTargets.length > 0) {
      await Promise.allSettled(
        pushTargets.map((m) =>
          sendPushToUser(m.id, {
            title: "Aaj kaisa raha? 💪",
            body: "Club attendance mark karo aur apna feel share karo!",
            url: "/",
          }),
        ),
      );
    }
  }

  // ── 2. DMO reminder → all active coaches ────────────────────────────────
  // Only notify coaches who haven't logged DMO today
  const { data: coaches } = await supabase
    .from("users")
    .select("id")
    .in("role", ["coach", "jco", "nco", "club_owner"])
    .eq("status", "active");

  if (coaches && coaches.length > 0) {
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
      const { error } = await supabase.from("notifications").insert(dmoNotifs);
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

    const { error } = await supabase.from("notifications").insert(overdueNotifs);
    if (!error) created.push(`overdue_alert: ${overdueNotifs.length} coaches`);
  }

  return NextResponse.json({ ok: true, date: today, created });
}
