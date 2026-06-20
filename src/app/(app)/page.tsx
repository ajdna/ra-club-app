import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getConfigValue } from "@/modules/rules-engine";
import { membershipLabel, type MembershipLabels } from "@/lib/membership";
import { ClearAllButton } from "./followup/ClearAllButton";
import { StreakToast } from "@/components/StreakToast";

export const dynamic = "force-dynamic";

const ACTIVITY_LABEL: Record<string, string> = {
  call: "Call",
  home_visit: "Home visit",
  reminder: "Reminder call",
};

const AV_COLORS = ["bg-terra", "bg-sage-d", "bg-emerald-2", "bg-gold"];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function avColor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h + c.charCodeAt(0)) % AV_COLORS.length;
  return AV_COLORS[h];
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function CommandCenter() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (me === "pending") redirect("/pending");
  if (me === "rejected") redirect("/login?error=rejected");

  if (me === "unlinked") {
    return (
      <main className="px-5 py-16">
        <h1 className="font-display text-2xl font-semibold text-emerald">Almost there</h1>
        <p className="mt-3 text-ink/70">
          You&apos;re signed in, but this login isn&apos;t linked to a club account yet.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const today = todayISO();

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

  // ── MEMBER HOME ────────────────────────────────────────────────────────────
  if (me.role === "member") {
    const [memberRes, , attendanceRes, tasksRes] = await Promise.all([
      supabase.from("members").select("membership_type, stage, current_weight, ideal_weight").eq("user_id", me.id).maybeSingle(),
      supabase.from("weight_logs").select("weight, logged_at").eq("member_id", me.id).order("logged_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("attendance").select("date, present").eq("member_id", me.id).order("date", { ascending: false }).limit(90),
      supabase.from("follow_up_tasks").select("activity, due_date, status, cycle, day_number").eq("member_id", me.id).gte("due_date", today).order("due_date", { ascending: true }).limit(3),
    ]);

    const m = memberRes.data;
    // Day-by-day streak: count consecutive days with attendance going back from today
    const streak = (() => {
      const presentDates = new Set(
        (attendanceRes.data ?? []).filter((a) => a.present).map((a) => a.date)
      );
      let s = 0;
      const cursor = new Date();
      for (let i = 0; i < 90; i++) {
        const d = cursor.toISOString().split("T")[0];
        if (presentDates.has(d)) {
          s++;
          cursor.setDate(cursor.getDate() - 1);
        } else if (i === 0) {
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
      return s;
    })();

    return (
      <main className="px-4 pb-6 pt-6">
        <header className="mb-5 px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sage-d">{dateLabel}</p>
          <h1 className="font-display mt-1 text-3xl font-semibold text-emerald">
            Namaste, {me.name.split(" ")[0]} 🙏
          </h1>
          <p className="mt-1 text-sm text-ink/60">Aapka wellness journey track ho raha hai 🌱</p>
        </header>

        <StreakToast streak={streak} />
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-2xl border border-line bg-card p-3 text-center shadow-sm">
            <div className="font-display text-2xl font-bold text-terra-d">{m?.current_weight ?? "—"}</div>
            <div className="text-xs text-ink/55">kg</div>
          </div>
          <div className={`rounded-2xl border p-3 text-center shadow-sm ${streak >= 7 ? "border-terra/40 bg-terra/8" : "border-line bg-card"}`}>
            <div className="font-display text-2xl font-bold text-terra-d">
              {streak > 0 ? "🔥" : "💤"} {streak}
            </div>
            <div className="text-xs text-ink/55">day streak</div>
          </div>
          <div className="rounded-2xl border border-line bg-card p-3 text-center shadow-sm">
            <div className="font-display text-2xl font-bold text-emerald">{m?.stage ?? 1}/6</div>
            <div className="text-xs text-ink/55">stage</div>
          </div>
        </div>

        {m && (
          <div className="rounded-2xl border border-line bg-card p-4 shadow-sm mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-ink">Journey Progress</span>
              <span className="text-xs text-ink/50">Stage {m.stage} / 6</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-line overflow-hidden">
              <div className="h-2.5 rounded-full bg-emerald" style={{ width: `${Math.round((m.stage / 6) * 100)}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-5">
          <Link href="/my-progress" className="flex items-center gap-2 rounded-2xl border border-emerald/30 bg-emerald-soft px-3 py-3">
            <span className="text-xl">📊</span>
            <div><div className="text-sm font-semibold text-emerald">My Progress</div><div className="text-xs text-ink/50">Weight &amp; attendance</div></div>
          </Link>
          <Link href="/messages" className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3 py-3">
            <span className="text-xl">💬</span>
            <div><div className="text-sm font-semibold text-ink">Messages</div><div className="text-xs text-ink/50">Chat with coach</div></div>
          </Link>
        </div>

        {(tasksRes.data?.length ?? 0) > 0 && (
          <>
            <SectionHeader>📋 Upcoming Follow-ups</SectionHeader>
            <div className="rounded-2xl border border-line bg-card p-2 shadow-sm">
              {tasksRes.data!.map((t, i) => (
                <Row key={i} avatar="📅" avatarClass="bg-emerald/20"
                  title={ACTIVITY_LABEL[t.activity] ?? t.activity}
                  sub={`${new Date(t.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · Cycle ${t.cycle}`}
                />
              ))}
            </div>
          </>
        )}
      </main>
    );
  }

  // ── NCO/JCO/OWNER/COACH HOME ───────────────────────────────────────────────
  const [usersRes, membersRes, tasksRes, dmoRes, labelRes, memLabels] = await Promise.all([
    supabase.from("users").select("id, name, role"),
    supabase.from("members").select("user_id, membership_type, stage, current_weight, join_date, coach_id"),
    supabase.from("follow_up_tasks").select("id, member_id, coach_id, activity, due_date, status, day_number, cycle"),
    supabase.from("dmo_entries").select("total").eq("coach_id", me.id).eq("entry_date", today).maybeSingle(),
    supabase.from("rule_config").select("value").eq("key", "ui_labels").maybeSingle(),
    getConfigValue<MembershipLabels>("membership_labels", {}),
  ]);

  const users = usersRes.data ?? [];
  const members = membersRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const dmoTotal = (dmoRes.data?.total as number | undefined) ?? null;
  const nameById = new Map(users.map((u) => [u.id, u.name as string]));

  const dueToday = tasks.filter((t) => t.status === "pending" && t.due_date === today);
  const overdue = tasks.filter((t) => t.status === "pending" && t.due_date < today);
  const homeTitle = (labelRes.data?.value as { home_title?: string } | null)?.home_title ?? "Aaj ka Plan";

  // Team breakdown for NCO/JCO/owner
  const isLeader = ["nco", "jco", "club_owner"].includes(me.role);
  const coaches = users.filter((u) => ["coach", "jco", "nco"].includes(u.role as string));
  const teamCount = coaches.length;

  const coachStats = coaches.map((c) => {
    const coachTasks = tasks.filter((t) => t.coach_id === c.id);
    const coachMembers = members.filter((m) => m.coach_id === c.id);
    const coachOverdue = coachTasks.filter((t) => t.status === "pending" && t.due_date < today).length;
    const coachDueToday = coachTasks.filter((t) => t.status === "pending" && t.due_date === today).length;
    return { ...c, memberCount: coachMembers.length, overdueCount: coachOverdue, dueTodayCount: coachDueToday };
  }).sort((a, b) => b.overdueCount - a.overdueCount);

  const recentMembers = [...members].sort((a, b) => (b.join_date ?? "").localeCompare(a.join_date ?? "")).slice(0, 3);

  const roleLabel =
    me.role === "club_owner" ? "Club Owner"
    : me.role === "nco" ? "NCO — Team Leader"
    : me.role === "jco" ? "JCO — Area Leader"
    : null;

  const stats = [
    { n: members.length, label: "Members", href: "/members", icon: "users", tone: "ink" as const },
    { n: dueToday.length, label: "Due today", href: "/followup", icon: "clock", tone: "emerald" as const },
    { n: teamCount, label: "Team", href: isLeader ? "#team-overview" : undefined, icon: "team", tone: "ink" as const },
    { n: overdue.length, label: "Overdue", href: "/followup", icon: "alert", tone: overdue.length ? "bad" : "good" as const },
  ];

  return (
    <main className="px-4 pb-8 pt-5">
      {/* greeting */}
      <header className="mb-4 px-1">
        <p className="text-[12.5px] font-medium text-ink-2">Namaste,</p>
        <h1 className="font-display text-[28px] font-medium leading-tight tracking-tight text-ink">
          {me.name}
        </h1>
        {roleLabel && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sage-d">{roleLabel}</p>
        )}
      </header>

      {/* hero — today's follow-ups */}
      <Link
        href="/followup"
        className="block overflow-hidden rounded-[20px] bg-emerald p-5 text-white shadow-[0_14px_30px_var(--emerald-soft)]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-white/80">Aaj ke follow-ups</span>
          <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold ${overdue.length ? "bg-white/20 text-white" : "bg-white/15 text-white"}`}>
            {overdue.length ? `${overdue.length} overdue` : "On track"}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-[52px] font-medium leading-none tracking-tight">{dueToday.length}</span>
          <span className="text-sm font-semibold text-white/70">baaki</span>
        </div>
        <svg width="100%" height="42" viewBox="0 0 300 42" fill="none" preserveAspectRatio="none" className="my-3 block" aria-hidden="true">
          <path d="M0 36 50 30 100 33 150 21 200 25 240 13 280 7 296 5 296 42 0 42Z" fill="rgba(255,255,255,.18)" />
          <path d="M0 36 50 30 100 33 150 21 200 25 240 13 280 7 296 5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="293" cy="5" r="4" fill="#fff" />
        </svg>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white/80">{members.length} members · {teamCount} team</span>
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold">
            Shuru karein
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </div>
      </Link>

      {dmoTotal !== null && (
        <p className="mt-3 px-1 text-sm text-ink-2">
          DMO score: <span className="font-semibold text-terra-d">{dmoTotal}</span> · keep it up! 🌱
        </p>
      )}

      {/* stat tiles */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => {
          const tile = (
            <div className="rounded-[16px] border border-line bg-card p-4 transition hover:border-emerald/40">
              <div className="mb-2.5 flex items-center gap-2 text-ink-2">
                <StatIcon name={s.icon} />
                <span className="text-[12.5px] font-semibold">{s.label}</span>
              </div>
              <div className={`font-display text-[30px] font-medium leading-none tracking-tight ${s.tone === "bad" ? "text-bad" : s.tone === "good" ? "text-good" : s.tone === "emerald" ? "text-emerald" : "text-ink"}`}>
                {s.n}
              </div>
            </div>
          );
          return s.href ? <Link key={s.label} href={s.href}>{tile}</Link> : <div key={s.label}>{tile}</div>;
        })}
      </div>

      {/* Up next (due today) */}
      {dueToday.length > 0 && (
        <>
          <div className="mt-6 mb-2.5 flex items-center justify-between px-1">
            <h2 className="text-base font-semibold text-ink">{homeTitle}</h2>
            <Link href="/followup" className="text-[13px] font-semibold text-emerald">Sabhi dekhein</Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {dueToday.slice(0, 5).map((t) => (
              <TaskCard
                key={t.id}
                name={nameById.get(t.member_id) ?? "Member"}
                sub={ACTIVITY_LABEL[t.activity] ?? t.activity}
                href={"/members/" + t.member_id}
                tone="due"
              />
            ))}
            {dueToday.length > 5 && (
              <p className="px-1 text-xs text-ink-3">+{dueToday.length - 5} aur</p>
            )}
          </div>
        </>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <>
          <div className="mt-6 mb-2.5 flex items-center justify-between px-1">
            <h2 className="text-base font-semibold text-bad">Overdue</h2>
            <ClearAllButton count={overdue.length} />
          </div>
          <div className="flex flex-col gap-2.5">
            {overdue.slice(0, 3).map((t) => (
              <TaskCard
                key={t.id}
                name={nameById.get(t.member_id) ?? "Member"}
                sub={`${ACTIVITY_LABEL[t.activity] ?? t.activity} • overdue`}
                href={"/members/" + t.member_id}
                tone="overdue"
              />
            ))}
            {overdue.length > 3 && (
              <p className="px-1 text-xs text-ink-3">+{overdue.length - 3} aur</p>
            )}
          </div>
        </>
      )}

      {/* Team overview */}
      {isLeader && coachStats.length > 0 && (
        <>
          <div id="team-overview" />
          <SectionHeader>Team overview</SectionHeader>
          <div className="space-y-2.5">
            {coachStats.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-[16px] border border-line bg-card px-4 py-3">
                <div>
                  <div className="font-semibold text-ink">{c.name}</div>
                  <div className="text-xs text-ink-2">{c.memberCount} members</div>
                </div>
                <div className="flex gap-2 text-xs font-semibold">
                  {c.overdueCount > 0 && (
                    <span className="rounded-full bg-bad/15 px-2 py-0.5 text-bad">{c.overdueCount} overdue</span>
                  )}
                  {c.dueTodayCount > 0 && (
                    <span className="rounded-full bg-warn/15 px-2 py-0.5 text-warn">{c.dueTodayCount} today</span>
                  )}
                  {c.overdueCount === 0 && c.dueTodayCount === 0 && (
                    <span className="rounded-full bg-good/15 px-2 py-0.5 text-good">✓ All clear</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recently joined */}
      {recentMembers.length > 0 && (
        <>
          <SectionHeader>Recently joined</SectionHeader>
          <div className="flex flex-col gap-2.5">
            {recentMembers.map((m) => (
              <TaskCard
                key={m.user_id}
                name={nameById.get(m.user_id) ?? "Member"}
                sub={membershipLabel(m.membership_type, memLabels) + " · Stage " + m.stage}
                href={"/members/" + m.user_id}
                tone="due"
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function StatIcon({ name }: { name: string }) {
  const common = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "users") return (<svg {...common}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 19a5.5 5.5 0 0 0-2.3-4.5" /></svg>);
  if (name === "clock") return (<svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg>);
  if (name === "team") return (<svg {...common}><circle cx="12" cy="8" r="3.2" /><path d="M6 19a6 6 0 0 1 12 0" /></svg>);
  return (<svg {...common}><path d="M12 4 2.5 20h19L12 4Z" /><path d="M12 10v4" /><circle cx="12" cy="17.5" r="0.6" fill="currentColor" /></svg>);
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2.5 mt-6 text-[12px] font-semibold uppercase tracking-[0.14em] text-sage-d">
      {children}
    </h2>
  );
}

function TaskCard({
  name, sub, href, tone,
}: {
  name: string; sub: string; href: string; tone: "due" | "overdue";
}) {
  const av = tone === "overdue" ? "bg-terra-soft text-terra" : "bg-emerald-soft text-emerald";
  const subColor = tone === "overdue" ? "text-bad" : "text-ink-2";
  return (
    <Link href={href} className="flex items-center gap-3 rounded-[16px] border border-line bg-card p-3.5 transition hover:border-emerald/40">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-[15px] font-semibold ${av}`}>
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-ink">{name}</div>
        <div className={`truncate text-[13px] font-medium ${subColor}`}>{sub}</div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-3" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
    </Link>
  );
}

function Row({
  avatar, avatarClass, title, sub, href,
}: {
  avatar: string; avatarClass: string; title: string; sub: string; href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-cream-2">
      <span className={"grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white " + avatarClass}>
        {avatar}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">{title}</div>
        <div className="text-xs text-ink/50">{sub}</div>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
