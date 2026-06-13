import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { membershipLabel } from "@/lib/membership";
import { getConfigValue } from "@/modules/rules-engine";
import type { MembershipLabels } from "@/lib/membership";
import { MyProgressClient } from "./MyProgressClient";

export const dynamic = "force-dynamic";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function MyProgressPage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (typeof me !== "object") redirect("/");
  // Only members use this page — coaches/NCO/owners see member detail pages instead
  if (me.role !== "member") redirect("/members");

  const supabase = await createClient();
  const today = todayISO();

  const [memberRes, weightRes, attendanceRes, tasksRes, memLabels] = await Promise.all([
    supabase
      .from("members")
      .select("membership_type, stage, current_weight, ideal_weight")
      .eq("user_id", me.id)
      .maybeSingle(),
    supabase
      .from("weight_logs")
      .select("weight, logged_at")
      .eq("member_id", me.id)
      .order("logged_at", { ascending: false })
      .limit(12),
    supabase
      .from("attendance")
      .select("date, present")
      .eq("member_id", me.id)
      .order("date", { ascending: false })
      .limit(30),
    supabase
      .from("follow_up_tasks")
      .select("activity, due_date, status, cycle, day_number")
      .eq("member_id", me.id)
      .gte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(10),
    getConfigValue<MembershipLabels>("membership_labels", {}),
  ]);

  const m = memberRes.data;
  const presentToday = (attendanceRes.data ?? []).some(a => a.date === today && a.present);

  return (
    <main className="px-4 pb-8 pt-5">
      <header className="mb-5 px-1">
        <h1 className="font-display text-2xl font-semibold text-emerald">
          My Progress 🌱
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Namaste {me.name.split(" ")[0]}! Aaj ka din kaisa raha?
        </p>
      </header>

      <MyProgressClient
        member={{
          name: me.name,
          currentWeight: m?.current_weight ?? null,
          idealWeight: m?.ideal_weight ?? null,
          stage: m?.stage ?? 1,
          membership: membershipLabel(m?.membership_type ?? null, memLabels),
        }}
        weights={weightRes.data ?? []}
        attendance={attendanceRes.data ?? []}
        tasks={tasksRes.data ?? []}
        presentToday={presentToday}
      />
    </main>
  );
}
