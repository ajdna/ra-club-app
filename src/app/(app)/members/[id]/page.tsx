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
        .order("date", { ascending: false })
        .limit(7),
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
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Fact
          label="Membership"
          value={membershipLabel(member.membership_type, memLabels)}
        />
        <Fact label="Stage" value={`${member.stage} / 6`} />
        <Fact label="Recharges" value={`${member.recharge_count}`} />
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
          </div>
        </div>
        <div className="mt-3">
          <LogWeightForm memberId={id} />
        </div>
        {weights.length > 0 && (
          <ul className="mt-3 divide-y divide-line border-t border-line pt-2">
            {weights.map((w, i) => (
              <li
                key={i}
                className="flex justify-between py-1.5 text-sm text-ink/70"
              >
                <span>{w.weight} kg</span>
                <span className="text-ink/45">
                  {new Date(w.logged_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
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
        {attendance.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {attendance.map((a, i) => (
              <span
                key={i}
                className={`rounded-md px-2 py-1 text-xs ${
                  a.present
                    ? "bg-good/15 text-good"
                    : "bg-line text-ink/50"
                }`}
              >
                {new Date(a.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            ))}
          </div>
        )}
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
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  t.status === "done"
                    ? "bg-good/15 text-good"
                    : t.due_date < today
                      ? "bg-bad/15 text-bad"
                      : "bg-warn/15 text-warn"
                }`}
              >
                {t.status === "done"
                  ? "Done"
                  : t.due_date < today
                    ? "Overdue"
                    : "Pending"}
              </span>
            </div>
          ))
        ) : (
          <p className="px-2 py-4 text-center text-sm text-ink/50">
            No follow-up tasks yet.
          </p>
        )}
        {hiddenCount > 0 && (
          <p className="px-2 pb-2 pt-1 text-center text-xs text-ink/45">
            + {hiddenCount} aur tasks puri 90-day plan mein (yahan sirf recent
            overdue aur agle tasks dikh rahe hain)
          </p>
        )}
      </div>
    </main>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display mb-2 mt-6 px-1 text-sm font-semibold uppercase tracking-[0.08em] text-sage-d">
      {children}
    </h2>
  );
}

function Fact({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3 shadow-sm">
      <div
        className={`font-display text-lg font-semibold text-ink ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </div>
      <div className="text-xs text-ink/55">{label}</div>
    </div>
  );
}
