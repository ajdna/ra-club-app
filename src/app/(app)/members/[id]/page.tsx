import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeHealth, HEALTH_DOT, type Health } from "@/lib/health";
import { getConfigValue } from "@/modules/rules-engine";
import { getIntake } from "@/modules/members";
import { membershipLabel, type MembershipLabels } from "@/lib/membership";
import { MarkPresentButton } from "../MarkPresentButton";
import { LogWeightForm } from "../LogWeightForm";
import { WeightChart } from "../WeightChart";
import { StageCompleteButton } from "../StageCompleteButton";

export const dynamic = "force-dynamic";

const ACTIVITY_LABEL: Record<string, string> = {
  call: "Call",
  home_visit: "Home visit",
  reminder: "Reminder call",
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default async function MemberDetail({
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

  const [
    memberRes,
    userRes,
    weightRes,
    attendanceRes,
    tasksRes,
    memLabels,
    intake,
  ] = await Promise.all([
      supabase
        .from("members")
        .select("user_id, membership_type, stage, current_weight, ideal_weight, join_date, recharge_count")
        .eq("user_id", id)
        .maybeSingle(),
      supabase.from("users").select("name, phone").eq("id", id).maybeSingle(),
      supabase
        .from("weight_logs")
        .select("weight, logged_at")
        .eq("member_id", id)
        .order("logged_at", { ascending: false })
        .limit(6),
      supabase
        .from("attendance")
        .select("date, present")
        .eq("member_id", id)
        .gte("date", (() => { const d = new Date(); d.setDate(d.getDate() - 89); return d.toISOString().slice(0, 10); })())
        .order("date", { ascending: true })
        .limit(90),
      supabase
        .from("follow_up_tasks")
        .select("id, activity, due_date, status, day_number, cycle")
        .eq("member_id", id)
        .order("due_date", { ascending: true }),
      getConfigValue<MembershipLabels>("membership_labels", {}),
      getIntake(id),
    ]);

  // RLS returns nothing if this member isn't in the viewer's tree.
  if (!memberRes.data) notFound();

  const member = memberRes.data;
  const name = (userRes.data?.name as string) ?? "Member";
  const phone = userRes.data?.phone as string | null;
  const weights = weightRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const tasks = tasksRes.data ?? [];

  const overdue = tasks.filter(
    (t) => t.status === "pending" && t.due_date < today,
  ).length;
  const dueToday = tasks.filter(
    (t) => t.status === "pending" && t.due_date === today,
  ).length;
  const { status, label } = computeHealth({ overdue, dueToday });

  // Render a focused window of tasks instead of the full 12-cycle plan
  // (full plan can be 360+ rows, which makes the page heavy on mobile).
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter(
    (t) => t.status === "pending" && t.due_date < today,
  );
  const upcomingTasks = tasks.filter(
    (t) => t.status !== "done" && t.due_date >= today,
  );
  const visibleTasks = [
    ...overdueTasks.slice(-5), // 5 most recent overdue
    ...upcomingTasks.slice(0, 10), // next 10 upcoming
  ];
  const hiddenCount = tasks.length - visibleTasks.length;

  const intakeSummary: [string, string][] = intake
    ? (
        [
          ["Age", intake.age != null ? String(intake.age) : ""],
          ["Height", intake.height_cm != null ? `${intake.height_cm} cm` : ""],
          [
            "Start weight",
            intake.start_weight != null ? `${intake.start_weight} kg` : "",
          ],
          ["Purpose", intake.purpose ? String(intake.purpose) : ""],
          ["Health", intake.health_challenge ? String(intake.health_challenge) : ""],
          ["Energy", intake.energy ? String(intake.energy) : ""],
        ] as [string, string][]
      ).filter(([, v]) => v !== "")
    : [];

  const presentToday = attendance.some((a) => a.date === today && a.present);
  const weightGap =
    member.current_weight && member.ideal_weight
      ? Math.round((member.current_weight - member.ideal_weight) * 10) / 10
      : null;

  const startWeight = intake?.start_weight != null ? Number(intake.start_weight) : null;
  const lostKg =
    startWeight != null && member.current_weight != null
      ? Math.round((startWeight - member.current_weight) * 10) / 10
      : null;
  const weightMilestones: { emoji: string; label: string }[] = [];
  if (lostKg !== null && lostKg >= 5) weightMilestones.push({ emoji: "🥉", label: "5 kg lost" });
  if (lostKg !== null && lostKg >= 10) weightMilestones.push({ emoji: "🥈", label: "10 kg lost" });
  if (weightGap !== null && weightGap <= 0) weightMilestones.push({ emoji: "🏆", label: "Goal reached!" });

  return (
    <main className="px-4 pb-8 pt-5">
      <Link href="/members" className="text-sm font-semibold text-sage-d">
        ← Members
      </Link>

      {/* Header */}
      <header className="mt-3 flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-terra text-lg font-semibold text-white">
          {name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="font-display truncate text-2xl font-semibold text-emerald">
            {name}
          </h1>
          <div className="mt-0.5 flex items-center gap-2 text-sm text-ink/60">
            <span className={`h-2.5 w-2.5 rounded-full ${HEALTH_DOT[status as Health]}`} />
            {label}
          </div>
          {phone && <div className="text-xs text-ink/45">{phone}</div>}
        </div>
      </header>

      {/* Quick facts */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Fact
          label="Membership"
          value={membershipLabel(member.membership_type, memLabels)}
        />
        <Fact label="Recharges" value={String(member.recharge_count)} />
      </div>

      {/* Stage visual path */}
      <div className="mt-3">
        <StageProgress current={member.stage ?? 1} />
        {["club_owner", "nco", "jco", "coach"].includes((me as {role: string}).role) && (
          <StageCompleteButton memberId={id} currentStage={member.stage ?? 1} />
        )}
      </div>

      {/* 1st Home Visit intake */}
      <SectionHeader>🏠 1st Home Visit</SectionHeader>
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        {intake ? (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {intakeSummary.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-ink/45">{label}</dt>
                  <dd className="text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <Link
              href={`/members/${id}/intake`}
              className="mt-3 inline-block text-sm font-semibold text-terra-d"
            >
              Edit full intake →
            </Link>
          </>
        ) : (
          <div className="text-center">
            <p className="text-sm text-ink/60">
              Abhi tak intake capture nahi hui.
            </p>
            <Link
              href={`/members/${id}/intake`}
              className="mt-3 inline-block rounded-xl bg-terra px-4 py-2 text-sm font-semibold text-white transition hover:bg-terra-d"
            >
              Capture 1st Home Visit
            </Link>
          </div>
        )}
      </div>

      {/* Weight + Log Weight */}
      <SectionHeader>⚖️ Weight</SectionHeader>
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-display text-3xl font-semibold text-terra-d">
              {member.current_weight ? `${member.current_weight} kg` : "—"}
            </div>
            <div className="text-xs text-ink/55">
              Ideal: {member.ideal_weight ? `${member.ideal_weight} kg` : "—"}
              {weightGap !== null
                ? ` · ${weightGap > 0 ? `${weightGap}kg to go` : "at goal 🎉"}`
                : ""}
            </div>
            {weightMilestones.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {weightMilestones.map((m) => (
                  <span
                    key={m.label}
                    className="flex items-center gap-1 rounded-full bg-good/15 px-2 py-0.5 text-xs font-semibold text-good"
                  >
                    {m.emoji} {m.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3">
          <LogWeightForm memberId={id} />
        </div>
        {weights.length > 0 && (
          <>
            <div className="mt-3 border-t border-line pt-3">
              <WeightChart weights={weights} />
            </div>
            <ul className="mt-2 divide-y divide-line">
              {weights.slice(0, 4).map((w, i) => (
                <li key={i} className="flex justify-between py-1.5 text-sm text-ink/70">
                  <span>{w.weight} kg</span>
                  <span className="text-ink/45">
                    {new Date(w.logged_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Attendance + Mark Present */}
      <SectionHeader>📍 Club attendance</SectionHeader>
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm text-ink/70">
            {presentToday ? "Aaj present ✅" : "Aaj abhi tak mark nahi kiya"}
          </div>
          <MarkPresentButton memberId={id} present={presentToday} />
        </div>
        <div className="mt-3">
          <AttendanceHeatmap attendance={attendance} />
        </div>
      </div>

      {/* Follow-up tasks */}
      <SectionHeader>📋 Follow-up tasks</SectionHeader>
      <div className="rounded-2xl border border-line bg-card p-2 shadow-sm">
        {tasks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-2 pb-1 pt-2 text-xs">
            <span className="rounded-full bg-good/15 px-2 py-0.5 font-semibold text-good">
              {doneCount} done
            </span>
            <span className="rounded-full bg-bad/15 px-2 py-0.5 font-semibold text-bad">
              {overdueTasks.length} overdue
            </span>
            <span className="rounded-full bg-warn/15 px-2 py-0.5 font-semibold text-warn">
              {upcomingTasks.length} upcoming
            </span>
          </div>
        )}
        {tasks.length ? (
          visibleTasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl px-2 py-2.5 text-sm"
            >
              <div>
                <div className="font-semibold text-ink">
                  {ACTIVITY_LABEL[t.activity] ?? t.activity}
                </div>
                <div className="text-xs text-ink/55">
                  Cycle {t.cycle} · Day {t.day_number} · due{" "}
                  {new Date(t.due_date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
              <span
                className={
                  t.status === "done"
                    ? "rounded-full bg-good/15 px-2 py-0.5 text-xs font-semibold text-good"
                    : t.due_date < new Date().toISOString().slice(0, 10)
                    ? "rounded-full bg-bad/15 px-2 py-0.5 text-xs font-semibold text-bad"
                    : "rounded-full bg-warn/15 px-2 py-0.5 text-xs font-semibold text-warn"
                }
              >
                {t.status === "done" ? "Done" : t.due_date < new Date().toISOString().slice(0, 10) ? "Overdue" : "Pending"}
              </span>
            </div>
          ))
        ) : (
          <p className="px-3 py-4 text-sm text-ink/50">No follow-up tasks yet.</p>
        )}
        {hiddenCount > 0 && (
          <p className="px-3 py-2 text-xs text-ink/40">+{hiddenCount} more tasks hidden</p>
        )}
      </div>
      {/* Monthly report card link */}
      <div className="mt-6 text-center">
        <Link
          href={"/members/" + id + "/report"}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          📊 Monthly Report Card
        </Link>
      </div>
    </main>
  );
}

function AttendanceHeatmap({
  attendance,
}: {
  attendance: { date: string; present: boolean }[];
}) {
  const today = new Date();
  const attendanceMap = new Map(attendance.map((a) => [a.date, a.present]));

  const days: { date: string; present: boolean; isToday: boolean }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, present: attendanceMap.get(iso) ?? false, isToday: i === 0 });
  }

  // Pad start to align with the weekday of the first day (0=Sun)
  const firstDayOfWeek = new Date(days[0].date).getDay();
  const totalPresent = days.filter((d) => d.present).length;

  return (
    <div>
      <p className="mb-2 text-xs text-ink/45">
        {totalPresent} / 90 days present (last 90 days)
      </p>
      <div
        className="grid gap-0.5 overflow-x-auto"
        style={{ gridTemplateRows: "repeat(7, 10px)", gridAutoFlow: "column", gridAutoColumns: "10px" }}
      >
        {Array.from({ length: firstDayOfWeek }, (_, i) => (
          <div key={"pad-" + i} style={{ height: 10, width: 10 }} />
        ))}
        {days.map((day) => (
          <div
            key={day.date}
            title={day.date + (day.present ? " ✓" : " absent")}
            className={
              day.present
                ? "rounded-sm bg-good" + (day.isToday ? " ring-1 ring-offset-0 ring-terra" : "")
                : "rounded-sm bg-line" + (day.isToday ? " ring-1 ring-offset-0 ring-terra" : "")
            }
            style={{ height: 10, width: 10 }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-3 text-xs text-ink/40">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-line" />
          Absent
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-good" />
          Present
        </span>
      </div>
    </div>
  );
}

function StageProgress({ current, total = 6 }: { current: number; total?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-ink/45">Stage Progress</span>
        <span className="text-xs font-semibold text-terra">{current} / {total}</span>
      </div>
      <div className="flex items-center">
        {Array.from({ length: total }, (_, i) => {
          const stage = i + 1;
          const done = stage < current;
          const active = stage === current;
          const isLast = stage === total;
          return (
            <div key={stage} className={"flex items-center " + (isLast ? "" : "flex-1")}>
              <div
                className={
                  active
                    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terra text-sm font-bold text-white shadow-lg shadow-terra/30"
                    : done
                    ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terra text-xs font-semibold text-white"
                    : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-line bg-card text-xs font-medium text-ink/30"
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
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-sage-d">
      {children}
    </h2>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3 shadow-sm">
      <div className="text-xs text-ink/45">{label}</div>
      <div className="mt-0.5 font-semibold text-ink">{value}</div>
    </div>
  );
}
