"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getConfigValue } from "@/modules/rules-engine";

type Result = { ok: true; created?: number } | { ok: false; error: string };

const TITLES: Record<string, string> = {
  milestone: "🎉 Milestone",
  recharge_due: "🔔 Recharge due",
  drop_off: "⚠️ Drop-off risk",
};

const DEFAULT_TEMPLATES: Record<string, string> = {
  milestone: "Shabaash {name}! {milestone} 🎉",
  recharge_due: "{name}, recharge {days} din mein due hai — let's keep the momentum!",
  drop_off: "{name} ko {days} din se miss kar rahe hain. Ek warm check-in karein?",
};

function render(tpl: string, vars: Record<string, string | number>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : "",
  );
}

function daysSince(dateStr: string | null | undefined, now: number): number {
  if (!dateStr) return Infinity;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Math.floor((now - t) / 86_400_000);
}

export async function markRead(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/alerts");
  return { ok: true };
}

export async function markAllRead(): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/alerts");
  return { ok: true };
}

/**
 * Scan the current user's visible members for trigger conditions and insert
 * notifications. Thresholds + templates come from rule_config (Admin Console),
 * so behaviour is configurable with no code change. Deduped by type+member so
 * re-running won't spam. (In production this runs as a scheduled background job;
 * here it's invoked on the Alerts screen.)
 */
export async function generateNotifications(): Promise<Result> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { ok: false, error: "Not signed in." };
  const meId = me.id;

  const supabase = await createClient();
  const now = Date.now();

  // ── Cleanup: delete read notifications older than 30 days ─────────────────
  // Best-effort — if it fails we continue anyway.
  const thirtyDaysAgo = new Date(now - 30 * 86_400_000).toISOString();
  await supabase
    .from("notifications")
    .delete()
    .lt("read_at", thirtyDaysAgo);

  const notifCfg = await getConfigValue<{
    drop_off_inactive_days?: number;
    renewal_nudge_days?: number[];
    templates?: Record<string, string>;
  }>("notifications", {});
  const pricing = await getConfigValue<{ max_payments?: number }>("pricing", {});

  const dropOffDays = Number(notifCfg.drop_off_inactive_days ?? 5);
  const nudgeDays =
    Array.isArray(notifCfg.renewal_nudge_days) &&
    notifCfg.renewal_nudge_days.length
      ? notifCfg.renewal_nudge_days
      : [20, 25, 28, 30];
  const firstNudge = Math.min(...nudgeDays);
  const templates = { ...DEFAULT_TEMPLATES, ...(notifCfg.templates ?? {}) };
  const maxPayments = Number(pricing.max_payments ?? 2);

  // Only look at the last 60 days of activity — avoids full-table scans as
  // attendance and weight_logs grow over months.
  const sixtyDaysAgo = new Date(now - 60 * 86_400_000)
    .toISOString()
    .split("T")[0]; // YYYY-MM-DD for date columns

  const [membersRes, usersRes, attRes, wtRes, existingRes] = await Promise.all([
    supabase
      .from("members")
      .select("user_id, join_date, recharge_count, current_weight, ideal_weight"),
    supabase.from("users").select("id, name"),
    supabase
      .from("attendance")
      .select("member_id, date, present")
      .gte("date", sixtyDaysAgo),
    supabase
      .from("weight_logs")
      .select("member_id, logged_at")
      .gte("logged_at", new Date(now - 60 * 86_400_000).toISOString()),
    supabase.from("notifications").select("type, data"),
  ]);

  const nameById = new Map(
    (usersRes.data ?? []).map((u) => [u.id, u.name as string]),
  );

  // last activity per member (latest present attendance or weight log)
  const lastActivity = new Map<string, number>();
  for (const a of attRes.data ?? []) {
    if (!a.present) continue;
    const t = new Date(a.date).getTime();
    lastActivity.set(a.member_id, Math.max(lastActivity.get(a.member_id) ?? 0, t));
  }
  for (const w of wtRes.data ?? []) {
    const t = new Date(w.logged_at).getTime();
    lastActivity.set(w.member_id, Math.max(lastActivity.get(w.member_id) ?? 0, t));
  }

  // dedupe set: `${type}:${member_id}`
  const existing = new Set(
    (existingRes.data ?? []).map(
      (n) => `${n.type}:${(n.data as { member_id?: string })?.member_id ?? ""}`,
    ),
  );

  type NotifType = "milestone" | "recharge_due" | "drop_off" | "info";
  type NewNotif = {
    user_id: string;
    type: NotifType;
    title: string;
    body: string;
    data: { member_id: string };
  };
  const toInsert: NewNotif[] = [];
  const pushed = new Set<string>();

  function add(type: NotifType, memberId: string, body: string) {
    const key = `${type}:${memberId}`;
    if (existing.has(key) || pushed.has(key)) return;
    pushed.add(key);
    toInsert.push({
      user_id: meId,
      type,
      title: TITLES[type] ?? "Update",
      body,
      data: { member_id: memberId },
    });
  }

  for (const m of membersRes.data ?? []) {
    const name = nameById.get(m.user_id) ?? "Member";

    // Milestone — reached ideal weight
    if (
      m.current_weight != null &&
      m.ideal_weight != null &&
      Number(m.current_weight) <= Number(m.ideal_weight)
    ) {
      add(
        "milestone",
        m.user_id,
        render(templates.milestone, { name, milestone: "ideal weight reached" }),
      );
    }

    // Recharge due — within the nudge window of the current cycle
    const daysSinceJoin = daysSince(m.join_date, now);
    const cycleDay = daysSinceJoin - (m.recharge_count ?? 0) * 30;
    if (
      (m.recharge_count ?? 0) < maxPayments &&
      cycleDay >= firstNudge &&
      cycleDay <= 31
    ) {
      add(
        "recharge_due",
        m.user_id,
        render(templates.recharge_due, {
          name,
          days: Math.max(0, 30 - cycleDay),
        }),
      );
    }

    // Drop-off — inactive for >= threshold days
    const last = lastActivity.get(m.user_id);
    const inactive =
      last !== undefined ? Math.floor((now - last) / 86_400_000) : daysSinceJoin;
    if (inactive >= dropOffDays) {
      add(
        "drop_off",
        m.user_id,
        render(templates.drop_off, { name, days: inactive }),
      );
    }
  }

  if (toInsert.length) {
    const { error } = await supabase.from("notifications").insert(toInsert);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/alerts");
  revalidatePath("/");
  return { ok: true, created: toInsert.length };
}
