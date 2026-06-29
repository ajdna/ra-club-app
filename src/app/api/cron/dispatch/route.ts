/**
 * POST /api/cron/dispatch
 * Triggered every 15 min via GitHub Actions (.github/workflows/notif-dispatch.yml).
 * Sends digest push notifications at each user's preferred IST time.
 * Gated behind ff_notif_prefs.
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUser } from "@/lib/push.server";
import { isFeatureEnabled } from "@/lib/flags";

export const dynamic = "force-dynamic";

const DIGEST_TYPES = ["daily_followup_summary", "weight_log_reminder", "evening_summary"] as const;

function getISTDateAndTime() {
  const istMs = Date.now() + 5.5 * 60 * 60 * 1000;
  const iso = new Date(istMs).toISOString();
  return {
    todayIST: iso.slice(0, 10),   // YYYY-MM-DD
    timeIST: iso.slice(11, 16),   // HH:MM
  };
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isFeatureEnabled("notif_prefs"))) {
    return NextResponse.json({ ok: true, skipped: "ff_notif_prefs OFF" });
  }

  const sb = createServiceClient();
  const { todayIST, timeIST } = getISTDateAndTime();
  // Compare HH:MM:59 against stored HH:MM:SS so "09:15" covers "09:15:00"–"09:15:59"
  const timeWithSec = `${timeIST}:59`;

  const { data: readyPrefs } = await sb
    .from("notification_prefs")
    .select("user_id, type")
    .eq("enabled", true)
    .in("type", [...DIGEST_TYPES])
    .not("send_time", "is", null)
    .lte("send_time", timeWithSec)
    .or(`last_sent_on.is.null,last_sent_on.lt.${todayIST}`);

  if (!readyPrefs?.length) {
    return NextResponse.json({ ok: true, sent: 0, todayIST, timeIST });
  }

  const byType = new Map<string, string[]>();
  for (const p of readyPrefs) {
    if (!byType.has(p.type)) byType.set(p.type, []);
    byType.get(p.type)!.push(p.user_id);
  }

  const results: string[] = [];
  const sentPairs: { userId: string; type: string }[] = [];

  // ── daily_followup_summary → coaches with tasks due today ───────────────
  const followupUsers = byType.get("daily_followup_summary") ?? [];
  if (followupUsers.length) {
    const { data: tasks } = await sb
      .from("follow_up_tasks")
      .select("coach_id")
      .eq("due_date", todayIST)
      .eq("status", "pending")
      .in("coach_id", followupUsers);

    const tasksByCoach = new Map<string, number>();
    for (const t of tasks ?? []) {
      tasksByCoach.set(t.coach_id, (tasksByCoach.get(t.coach_id) ?? 0) + 1);
    }

    await Promise.allSettled(
      Array.from(tasksByCoach.entries()).map(async ([uid, count]) => {
        await sendPushToUser(uid, {
          title: `Aaj ke ${count} follow-up tasks ready hain 📋`,
          body: "Follow-up section mein jaake complete karo.",
          url: "/followup",
        });
        sentPairs.push({ userId: uid, type: "daily_followup_summary" });
      }),
    );
    results.push(`daily_followup_summary: ${tasksByCoach.size}`);
  }

  // ── weight_log_reminder → active members ────────────────────────────────
  const weightUsers = byType.get("weight_log_reminder") ?? [];
  if (weightUsers.length) {
    const { data: members } = await sb
      .from("users")
      .select("id")
      .in("id", weightUsers)
      .eq("role", "member")
      .eq("status", "active");

    await Promise.allSettled(
      (members ?? []).map(async ({ id: uid }) => {
        await sendPushToUser(uid, {
          title: "Aaj ka weight log karo 🌅",
          body: "Apna weight record karo — progress track karna zaroori hai!",
          url: "/my-progress",
        });
        sentPairs.push({ userId: uid, type: "weight_log_reminder" });
      }),
    );
    results.push(`weight_log_reminder: ${(members ?? []).length}`);
  }

  // ── evening_summary → active members ────────────────────────────────────
  const eveningUsers = byType.get("evening_summary") ?? [];
  if (eveningUsers.length) {
    const { data: members } = await sb
      .from("users")
      .select("id")
      .in("id", eveningUsers)
      .eq("role", "member")
      .eq("status", "active");

    await Promise.allSettled(
      (members ?? []).map(async ({ id: uid }) => {
        await sendPushToUser(uid, {
          title: "Aaj kaisa raha? 💪",
          body: "Club attendance mark karo aur apna feel share karo!",
          url: "/",
        });
        sentPairs.push({ userId: uid, type: "evening_summary" });
      }),
    );
    results.push(`evening_summary: ${(members ?? []).length}`);
  }

  // Mark last_sent_on = today for all sent rows
  if (sentPairs.length) {
    await Promise.allSettled(
      sentPairs.map(({ userId, type }) =>
        sb
          .from("notification_prefs")
          .update({ last_sent_on: todayIST })
          .eq("user_id", userId)
          .eq("type", type),
      ),
    );
  }

  // ── Club reminders (ff_club_reminders) ──────────────────────────────────
  if (await isFeatureEnabled("club_reminders")) {
    const { data: timingsRow } = await sb
      .from("rule_config")
      .select("value")
      .eq("key", "club_timings")
      .maybeSingle();

    const timings = (timingsRow?.value as { club_morning_time?: string; club_evening_time?: string }) ?? {};
    const morningTime = timings.club_morning_time ?? "06:00";
    const eveningTime = timings.club_evening_time ?? "18:00";

    function toMinutes(hhmm: string): number {
      const [h = "0", m = "0"] = hhmm.slice(0, 5).split(":");
      return parseInt(h, 10) * 60 + parseInt(m, 10);
    }

    const nowMins = toMinutes(timeIST);

    const slots: {
      type: "morning_club" | "evening_club";
      startMins: number;
      title: string;
      body: string;
    }[] = [
      {
        type: "morning_club",
        startMins: toMinutes(morningTime),
        title: "Morning club shuru — aa jao 💪",
        body: "Aaj ka morning session shuru ho gaya. Club mein aa jao!",
      },
      {
        type: "evening_club",
        startMins: toMinutes(eveningTime),
        title: "Evening club shuru — aa jao 🌙",
        body: "Aaj ka evening session shuru ho gaya. Club mein aa jao!",
      },
    ];

    for (const slot of slots) {
      // Only fire in the 15-min window after the club time
      if (nowMins < slot.startMins || nowMins >= slot.startMins + 15) continue;

      const { data: allMembers } = await sb
        .from("users")
        .select("id")
        .eq("role", "member")
        .eq("status", "active");

      const memberIds = (allMembers ?? []).map((m) => m.id);
      if (!memberIds.length) continue;

      // Fetch prefs: disabled + already sent today
      const { data: prefs } = await sb
        .from("notification_prefs")
        .select("user_id, enabled, last_sent_on")
        .eq("type", slot.type)
        .in("user_id", memberIds);

      const disabledSet = new Set<string>();
      const sentTodaySet = new Set<string>();
      for (const p of prefs ?? []) {
        if (!p.enabled) disabledSet.add(p.user_id);
        if (p.last_sent_on && p.last_sent_on >= todayIST) sentTodaySet.add(p.user_id);
      }

      const eligible = memberIds.filter(
        (id) => !disabledSet.has(id) && !sentTodaySet.has(id),
      );
      if (!eligible.length) continue;

      await Promise.allSettled(
        eligible.map((uid) =>
          sendPushToUser(uid, { title: slot.title, body: slot.body, url: "/" }),
        ),
      );

      // Stamp last_sent_on (upsert: new rows get enabled=true default)
      await sb
        .from("notification_prefs")
        .upsert(
          eligible.map((uid) => ({
            user_id: uid,
            type: slot.type,
            last_sent_on: todayIST,
          })),
          { onConflict: "user_id,type" },
        );

      results.push(`${slot.type}: ${eligible.length}`);
    }
  }

  return NextResponse.json({ ok: true, todayIST, timeIST, results });
}
