import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function Stat({ n, label, tint = "text-terra-d", sub }: { n: number | string; label: string; tint?: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className={`font-display text-3xl font-semibold ${tint}`}>{n}</div>
      <div className="mt-0.5 text-sm text-ink/60">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-ink/40">{sub}</div>}
    </div>
  );
}

export default async function AnalyticsPage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (typeof me !== "object" || me.role !== "club_owner") redirect("/");

  const supabase = await createClient();
  const today = todayISO();
  const last30 = nDaysAgo(30);
  const last7 = nDaysAgo(7);

  const [
    usersRes,
    membersRes,
    tasksRes,
    weightRes,
    attendanceRes,
    newMembersRes,
  ] = await Promise.all([
    supabase.from("users").select("id, role, status, created_at"),
    supabase.from("members").select("user_id, membership_type, stage, current_weight, ideal_weight, join_date, coach_id"),
    supabase.from("follow_up_tasks").select("id, coach_id, status, due_date, completed_at"),
    supabase.from("weight_logs").select("member_id, weight, logged_at").gte("logged_at", last30),
    supabase.from("attendance").select("member_id, date, present").gte("date", last30),
    supabase.from("members").select("user_id, join_date").gte("join_date", last30),
  ]);

  const users = usersRes.data ?? [];
  const members = membersRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const weights = weightRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const newMembers = newMembersRes.data ?? [];

  // Counts
  const totalMembers = members.length;
  const activeMembers = users.filter(u => u.status === "active" && u.role === "member").length;
  const coaches = users.filter(u => ["coach", "jco", "nco"].includes(u.role as string)).length;
  const pendingUsers = users.filter(u => u.status === "pending").length;

  // Tasks
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const pendingTasks = tasks.filter(t => t.status === "pending").length;
  const overdueTasks = tasks.filter(t => t.status === "pending" && t.due_date < today).length;
  const completionRate = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

  // Last 30 days activity
  const recentAttendance = attendance.filter(a => a.present).length;
  const weightLogs30 = weights.length;
  const newMembers30 = newMembers.length;
  const newMembers7 = newMembers.filter(m => (m.join_date ?? "") >= last7).length;

  // Membership breakdown
  const byMembership: Record<string, number> = {};
  members.forEach(m => {
    const k = m.membership_type ?? "basic";
    byMembership[k] = (byMembership[k] ?? 0) + 1;
  });

  // Stage distribution
  const byStage: Record<number, number> = {};
  members.forEach(m => {
    const s = m.stage ?? 1;
    byStage[s] = (byStage[s] ?? 0) + 1;
  });

  // Weight progress: members who lost weight (have >1 log)
  const memberWeightMap: Record<string, number[]> = {};
  weights.forEach(w => {
    if (!memberWeightMap[w.member_id]) memberWeightMap[w.member_id] = [];
    memberWeightMap[w.member_id].push(Number(w.weight));
  });
  let weightLosers = 0, weightGainers = 0;
  Object.values(memberWeightMap).forEach(logs => {
    if (logs.length < 2) return;
    if (logs[0] < logs[logs.length - 1]) weightLosers++;
    else weightGainers++;
  });

  // Per-coach performance
  const coachList = users.filter(u => ["coach", "jco", "nco"].includes(u.role as string));
  const coachPerf = coachList.map(c => {
    const myTasks = tasks.filter(t => t.coach_id === c.id);
    const myMembers = members.filter(m => m.coach_id === c.id);
    const done = myTasks.filter(t => t.status === "done").length;
    const overdue = myTasks.filter(t => t.status === "pending" && t.due_date < today).length;
    const rate = myTasks.length ? Math.round((done / myTasks.length) * 100) : 0;
    return { name: c.id, memberCount: myMembers.length, done, overdue, rate, total: myTasks.length };
  });

  // Get names
  const nameById = new Map(users.map(u => [u.id, ""]));
  const { data: userNames } = await supabase.from("users").select("id, name");
  (userNames ?? []).forEach(u => nameById.set(u.id, u.name as string));

  return (
    <main className="px-4 pb-10 pt-5">
      <Link href="/admin" className="text-sm font-semibold text-sage-d">← Admin</Link>
      <h1 className="font-display mt-3 text-2xl font-semibold text-emerald">📈 Club Analytics</h1>
      <p className="mt-1 text-sm text-ink/60">Real-time insights for your club</p>

      {/* Members overview */}
      <h2 className="font-display mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-sage-d">👥 Members</h2>
      <div className="grid grid-cols-2 gap-3">
        <Stat n={totalMembers} label="Total members" tint="text-terra-d" />
        <Stat n={newMembers30} label="New (last 30d)" tint="text-emerald" sub={`${newMembers7} this week`} />
        <Stat n={coaches} label="Coaches / leaders" tint="text-sage-d" />
        {pendingUsers > 0 && <Stat n={pendingUsers} label="Pending approval" tint="text-warn" />}
      </div>

      {/* Membership breakdown */}
      <h2 className="font-display mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-sage-d">💎 Membership</h2>
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm space-y-2">
        {Object.entries(byMembership).map(([type, count]) => (
          <div key={type} className="flex items-center justify-between">
            <span className="text-sm capitalize text-ink">{type}</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full bg-line overflow-hidden">
                <div className="h-2 rounded-full bg-terra" style={{ width: `${(count / totalMembers) * 100}%` }} />
              </div>
              <span className="text-xs font-semibold text-ink/60 w-6 text-right">{count}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Stage distribution */}
      <h2 className="font-display mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-sage-d">🎯 Stage Distribution</h2>
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <div className="flex items-end gap-1.5 h-20">
          {[1, 2, 3, 4, 5, 6].map(s => {
            const cnt = byStage[s] ?? 0;
            const maxCnt = Math.max(...Object.values(byStage), 1);
            const pct = (cnt / maxCnt) * 100;
            return (
              <div key={s} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-ink/60">{cnt}</span>
                <div className="w-full rounded-t-md bg-emerald/70" style={{ height: `${Math.max(pct, 4)}%`, minHeight: "4px" }} />
                <span className="text-[10px] text-ink/40">S{s}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task performance */}
      <h2 className="font-display mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-sage-d">📋 Follow-up Tasks</h2>
      <div className="grid grid-cols-2 gap-3">
        <Stat n={`${completionRate}%`} label="Completion rate" tint="text-emerald" />
        <Stat n={overdueTasks} label="Overdue now" tint={overdueTasks > 0 ? "text-bad" : "text-good"} />
        <Stat n={doneTasks} label="Total done" tint="text-sage-d" />
        <Stat n={pendingTasks} label="Pending" tint="text-warn" />
      </div>

      {/* 30-day activity */}
      <h2 className="font-display mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-sage-d">📊 Last 30 Days</h2>
      <div className="grid grid-cols-2 gap-3">
        <Stat n={recentAttendance} label="Attendance check-ins" tint="text-emerald" />
        <Stat n={weightLogs30} label="Weight logs" tint="text-terra-d" />
        <Stat n={weightLosers} label="On track (↓ weight)" tint="text-good" />
        <Stat n={weightGainers} label="Need attention (↑)" tint={weightGainers > 0 ? "text-warn" : "text-good"} />
      </div>

      {/* Coach leaderboard */}
      {coachPerf.length > 0 && (
        <>
          <h2 className="font-display mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-sage-d">🏆 Coach Leaderboard</h2>
          <div className="rounded-2xl border border-line bg-card p-2 shadow-sm">
            {coachPerf.sort((a, b) => b.rate - a.rate).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between rounded-xl px-2 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-6 text-center text-sm font-bold ${i === 0 ? "text-gold" : i === 1 ? "text-sage-d" : "text-ink/40"}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{nameById.get(c.name) || "Coach"}</div>
                    <div className="text-xs text-ink/50">{c.memberCount} members · {c.done}/{c.total} tasks done</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.rate >= 70 ? "bg-good/15 text-good" : c.rate >= 40 ? "bg-warn/15 text-warn" : "bg-bad/15 text-bad"}`}>
                    {c.rate}%
                  </span>
                  {c.overdue > 0 && <span className="text-xs text-bad">{c.overdue} late</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
