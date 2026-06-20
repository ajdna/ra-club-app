import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getIntake } from "@/modules/members";

export const dynamic = "force-dynamic";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (me === "unlinked") redirect("/");

  const supabase = await createClient();
  const today = todayISO();
  const mStart = monthStart();

  const [memberRes, userRes, weightRes, attendanceRes, tasksRes, intake] =
    await Promise.all([
      supabase
        .from("members")
        .select("stage, current_weight, ideal_weight, join_date, recharge_count")
        .eq("user_id", id)
        .maybeSingle(),
      supabase.from("users").select("name").eq("id", id).maybeSingle(),
      supabase
        .from("weight_logs")
        .select("weight, logged_at")
        .eq("member_id", id)
        .order("logged_at", { ascending: false })
        .limit(30),
      supabase
        .from("attendance")
        .select("date, present")
        .eq("member_id", id)
        .gte("date", mStart)
        .lte("date", today),
      supabase
        .from("follow_up_tasks")
        .select("status, due_date")
        .eq("member_id", id)
        .gte("due_date", mStart)
        .lte("due_date", today),
      getIntake(id),
    ]);

  if (!memberRes.data) notFound();

  const member = memberRes.data;
  const name = (userRes.data?.name as string) ?? "Member";
  const weights = weightRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const tasks = tasksRes.data ?? [];

  // This month's attendance
  const presentDays = attendance.filter((a) => a.present).length;
  const totalDays = attendance.length;
  const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  // Weight change (this month)
  const startWeight = intake?.start_weight != null ? Number(intake.start_weight) : null;
  const thisMonthWeights = weights.filter((w) => w.logged_at >= mStart);
  const latestWeight = weights[0]?.weight ?? null;
  const earliestThisMonth = thisMonthWeights.length > 0
    ? thisMonthWeights[thisMonthWeights.length - 1].weight
    : null;
  const monthlyChange = latestWeight && earliestThisMonth
    ? Math.round((earliestThisMonth - latestWeight) * 10) / 10
    : null;
  const totalLost = startWeight && latestWeight
    ? Math.round((startWeight - latestWeight) * 10) / 10
    : null;

  // Tasks this month
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;

  // Month name
  const monthName = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <main className="min-h-dvh bg-cream px-4 pb-8 pt-6">
      <Link href={"/members/" + id} className="text-sm font-semibold text-sage-d">
        ← Back
      </Link>

      <h1 className="font-display mt-3 mb-1 text-xl font-bold text-emerald">
        Monthly Report Card
      </h1>
      <p className="mb-5 text-sm text-ink/50">{monthName} · {name}</p>

      {/* The shareable card */}
      <div
        id="report-card"
        className="overflow-hidden rounded-3xl border border-line bg-card shadow-xl"
      >
        {/* Card header */}
        <div className="bg-emerald px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
            Ruby Nutrition Center
          </p>
          <h2 className="font-display mt-1 text-2xl font-bold">{name}</h2>
          <p className="mt-0.5 text-sm opacity-75">{monthName}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-px bg-line">
          <Stat
            emoji="📍"
            label="Attendance"
            value={attendancePct + "%"}
            sub={presentDays + " / " + totalDays + " days"}
            color={attendancePct >= 80 ? "text-good" : attendancePct >= 50 ? "text-warn" : "text-bad"}
          />
          <Stat
            emoji="⚖️"
            label="Weight this month"
            value={monthlyChange !== null ? (monthlyChange >= 0 ? "-" + monthlyChange + " kg" : "+" + Math.abs(monthlyChange) + " kg") : "—"}
            sub={totalLost !== null && totalLost > 0 ? totalLost + " kg total lost" : ""}
            color={monthlyChange !== null && monthlyChange >= 0 ? "text-good" : "text-bad"}
          />
          <Stat
            emoji="✅"
            label="Tasks done"
            value={doneTasks + " / " + totalTasks}
            sub={totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) + "% completion" : "No tasks"}
            color="text-terra-d"
          />
          <Stat
            emoji="🎗"
            label="Stage"
            value={"Stage " + (member.stage ?? 1) + " / 6"}
            sub={member.current_weight ? member.current_weight + " kg now" : ""}
            color="text-emerald"
          />
        </div>

        {/* Stage progress bar */}
        <div className="px-6 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
            Stage Journey
          </p>
          <div className="flex items-center">
            {Array.from({ length: 6 }, (_, i) => {
              const stage = i + 1;
              const done = stage < (member.stage ?? 1);
              const active = stage === (member.stage ?? 1);
              const isLast = stage === 6;
              return (
                <div key={stage} className={"flex items-center " + (isLast ? "" : "flex-1")}>
                  <div
                    className={
                      active
                        ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terra text-sm font-bold text-white"
                        : done
                        ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terra text-xs font-semibold text-white"
                        : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-line bg-cream text-xs font-medium text-ink/30"
                    }
                  >
                    {done ? "✓" : stage}
                  </div>
                  {!isLast && (
                    <div className={"h-px flex-1 " + (done ? "bg-terra" : "bg-line")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance mini heatmap (last 4 weeks) */}
        <div className="border-t border-line px-6 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
            This Month
          </p>
          <div className="flex flex-wrap gap-1">
            {attendance.map((a) => (
              <div
                key={a.date}
                title={a.date}
                className={
                  a.present
                    ? "h-4 w-4 rounded-sm bg-good"
                    : "h-4 w-4 rounded-sm bg-line"
                }
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-line bg-cream/50 px-6 py-3">
          <p className="text-center text-xs text-ink/35">
            ra-club-app.vercel.app · Generated {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-ink/40">
        Screenshot this card to share on WhatsApp
      </p>
    </main>
  );
}

function Stat({
  emoji,
  label,
  value,
  sub,
  color,
}: {
  emoji: string;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="text-lg">{emoji}</div>
      <div className="mt-1 text-xs text-ink/45">{label}</div>
      <div className={"font-display text-xl font-bold " + color}>{value}</div>
      {sub && <div className="text-xs text-ink/50">{sub}</div>}
    </div>
  );
}
