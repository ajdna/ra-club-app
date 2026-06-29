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

    const timings = (timingsRow?.value as {
      club_morning_time?: string;
      club_evening_time?: string;
      club_reminder_lead_min?: number;
    }) ?? {};
    const morningTime = timings.club_morning_time ?? "06:00";
    const eveningTime = timings.club_evening_time ?? "18:00";
    const leadMin =
      typeof timings.club_reminder_lead_min === "number"
        ? timings.club_reminder_lead_min
        : 15;

    function toMinutes(hhmm: string): number {
      const [h = "0", m = "0"] = hhmm.slice(0, 5).split(":");
      return parseInt(h, 10) * 60 + parseInt(m, 10);
    }

    const nowMins = toMinutes(timeIST);

    // All active users regardless of role
    const { data: activeUsers } = await sb
      .from("users")
      .select("id")
      .eq("status", "active");
    const allUserIds = (activeUsers ?? []).map((u) => u.id);

    if (allUserIds.length > 0) {
      // Batch-fetch user-facing opt-out prefs (morning_club / evening_club)
      const { data: optOutRows } = await sb
        .from("notification_prefs")
        .select("user_id, type, enabled")
        .in("type", ["morning_club", "evening_club"])
        .in("user_id", allUserIds);

      const disabledByPrefType = new Map<string, Set<string>>();
      for (const p of optOutRows ?? []) {
        if (!p.enabled) {
          if (!disabledByPrefType.has(p.type))
            disabledByPrefType.set(p.type, new Set());
          disabledByPrefType.get(p.type)!.add(p.user_id);
        }
      }

      type ClubStage = {
        internalType: string;
        prefType: string;
        title: string;
        body: string;
      };

      const periods: {
        label: "Morning" | "Evening";
        clubMins: number;
        displayTime: string;
        prefType: string;
      }[] = [
        {
          label: "Morning",
          clubMins: toMinutes(morningTime),
          displayTime: morningTime.slice(0, 5),
          prefType: "morning_club",
        },
        {
          label: "Evening",
          clubMins: toMinutes(eveningTime),
          displayTime: eveningTime.slice(0, 5),
          prefType: "evening_club",
        },
      ];

      const activeStages: ClubStage[] = [];
      for (const p of periods) {
        const preStart = p.clubMins - leadMin;
        if (nowMins >= preStart && nowMins < preStart + 15) {
          activeStages.push({
            internalType: `${p.label.toLowerCase()}_pre`,
            prefType: p.prefType,
            title: `${p.label} club reminder`,
            body: `${p.label} club ${p.displayTime} baje shuru hoga — taiyaar ho jao.`,
          });
        }
        if (nowMins >= p.clubMins && nowMins < p.clubMins + 15) {
          activeStages.push({
            internalType: `${p.label.toLowerCase()}_start`,
            prefType: p.prefType,
            title: `${p.label} club shuru ho gaya`,
            body: `${p.label} club shuru ho gaya — jaldi join karo.`,
          });
        }
      }

      for (const stage of activeStages) {
        const disabled = disabledByPrefType.get(stage.prefType) ?? new Set<string>();
        const optInIds = allUserIds.filter((id) => !disabled.has(id));
        if (!optInIds.length) continue;

        // Dedupe via internal type rows (enabled field ignored here)
        const { data: dedupeRows } = await sb
          .from("notification_prefs")
          .select("user_id, last_sent_on")
          .eq("type", stage.internalType)
          .in("user_id", optInIds);

        const sentToday = new Set<string>();
        for (const r of dedupeRows ?? []) {
          if (r.last_sent_on && r.last_sent_on >= todayIST) sentToday.add(r.user_id);
        }

        const toSend = optInIds.filter((id) => !sentToday.has(id));
        if (!toSend.length) continue;

        await Promise.allSettled(
          toSend.map((uid) =>
            sendPushToUser(uid, { title: stage.title, body: stage.body, url: "/" }),
          ),
        );

        await sb
          .from("notification_prefs")
          .upsert(
            toSend.map((uid) => ({
              user_id: uid,
              type: stage.internalType,
              last_sent_on: todayIST,
            })),
            { onConflict: "user_id,type" },
          );

        results.push(`${stage.internalType}: ${toSend.length}`);
      }
    }
  }

  return NextResponse.json({ ok: true, todayIST, timeIST, results });
}
