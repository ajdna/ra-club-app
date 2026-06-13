import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getConfigValue } from "@/modules/rules-engine";
import { membershipLabel, type MembershipLabels } from "@/lib/membership";
import { ClearAllButton } from "./followup/ClearAllButton";

export const dynamic = "force-dynamic";

const ACTIVITY_LABEL: Record<string, string> = {
  call: "Call",
  home_visit: "Home visit",
  reminder: "Reminder call",
};

const AV_COLORS = [
  "bg-terra",
  "bg-sage-d",
  "bg-emerald-2",
  "bg-gold",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avColor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h + c.charCodeAt(0)) % AV_COLORS.length;
  return AV_COLORS[h];
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default async function CommandCenter() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (me === "pending") redirect("/pending");
  if (me === "rejected") redirect("/login?error=rejected");

  if (me === "unlinked") {
    return (
      <main className="px-5 py-16">
        <h1 className="font-display text-2xl font-semibold text-emerald">
          Almost there
        </h1>
        <p className="mt-3 text-ink/70">
          You&apos;re signed in, but this login isn&apos;t linked to a club
          account yet. Set a <code>users.auth_id</code> in Supabase, then refresh.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const today = todayISO();

  // All RLS-scoped: each query returns only what `me` is allowed to see.
  const [usersRes, membersRes, tasksRes, dmoRes, labelRes, memLabels] =
    await Promise.all([
      supabase.from("users").select("id, name, role"),
      supabase
        .from("members")
        .select("user_id, membership_type, stage, current_weight, join_date"),
      supabase
        .from("follow_up_tasks")
        .select("id, member_id, coach_id, activity, due_date, status, day_number, cycle"),
      supabase
        .from("dmo_entries")
        .select("total")
        .eq("coach_id", me.id)
        .eq("entry_date", today)
        .maybeSingle(),
      supabase
        .from("rule_config")
        .select("value")
        .eq("key", "ui_labels")
        .maybeSingle(),
      getConfigValue<MembershipLabels>("membership_labels", {}),
    ]);

  const users = usersRes.data ?? [];
  const members = membersRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const dmoTotal = (dmoRes.data?.total as number | undefined) ?? null;
  const nameById = new Map(users.map((u) => [u.id, u.name as string]));

  const dueToday = tasks.filter(
    (t) => t.status === "pending" && t.due_date === today,
  );
  const overdue = tasks.filter(
    (t) => t.status === "pending" && t.due_date < today,
  );
  const teamCount = users.filter((u) =>
    ["coach", "jco", "nco"].includes(u.role as string),
  ).length;

  const recentMembers = [...members]
    .sort((a, b) => (b.join_date ?? "").localeCompare(a.join_date ?? ""))
    .slice(0, 3);

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const homeTitle =
    (labelRes.data?.value as { home_title?: string } | null)?.home_title ??
    "Aaj ka Plan";

  const stats = [
    { n: members.length, label: "Members", tint: "text-terra-d" },
    { n: dueToday.length, label: "Aaj ke tasks", tint: "text-emerald" },
    { n: teamCount, label: "Team", tint: "text-sage-d" },
    {
      n: overdue.length,
      label: "Action needed",
      tint: overdue.length ? "text-bad" : "text-good",
    },
  ];

  return (
    <main className="px-4 pb-6 pt-6">
      {/* Header */}
      <header className="mb-5 px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sage-d">
          {dateLabel}
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold text-emerald">
          Namaste, {me.name.split(" ")[0]} 🙏
        </h1>
        {dmoTotal !== null && (
          <p className="mt-1 text-sm text-ink/60">
            Aaj ka DMO score: <span className="font-semibold text-terra-d">{dmoTotal}</span> · keep it up! 🌱
          </p>
        )}
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-line bg-card p-4 shadow-sm"
          >
            <div className={`font-display text-3xl font-semibold ${s.tint}`}>
              {s.n}
            </div>
            <div className="mt-0.5 text-sm text-ink/60">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          href="/followup"
          className="flex items-center gap-2 rounded-2xl border border-emerald/30 bg-emerald/5 px-3 py-3 transition hover:bg-emerald/10"
        >
          <span className="text-xl">📋</span>
          <div>
            <div className="text-sm font-semibold text-emerald">Follow-up</div>
            <div className="text-xs text-ink/50">Aaj ke tasks</div>
          </div>
        </Link>
        <Link
          href="/members"
          className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3 py-3 transition hover:bg-cream-2"
        >
          <span className="text-xl">👥</span>
          <div>
            <div className="text-sm font-semibold text-ink">Members</div>
            <div className="text-xs text-ink/50">List & details</div>
          </div>
        </Link>
        <Link
          href="/messages"
          className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3 py-3 transition hover:bg-cream-2"
        >
          <span className="text-xl">💬</span>
          <div>
            <div className="text-sm font-semibold text-ink">Messages</div>
            <div className="text-xs text-ink/50">Chat & broadcast</div>
          </div>
        </Link>
        <Link
          href="/calendar"
          className="flex items-center gap-2 rounded-2xl border border-line bg-card px-3 py-3 transition hover:bg-cream-2"
        >
          <span className="text-xl">📅</span>
          <div>
            <div className="text-sm font-semibold text-ink">Calendar</div>
            <div className="text-xs text-ink/50">Home visits</div>
          </div>
        </Link>
      </div>

      {/* Aaj ka plan — today's tasks */}
      <SectionHeader>📅 {homeTitle}</SectionHeader>
      <div className="rounded-2xl border border-line bg-card p-2 shadow-sm">
        {dueToday.length ? (
          dueToday.map((t) => {
            const nm = nameById.get(t.member_id) ?? "Member";
            return (
              <Row
                key={t.id}
                avatar={initials(nm)}
                avatarClass={avColor(nm)}
                title={`${ACTIVITY_LABEL[t.activity] ?? t.activity} — ${nm}`}
                sub={`Cycle ${t.cycle} · Day ${t.day_number}`}
              />
            );
          })
        ) : (
          <Empty>Aaj koi pending task nahi 🎉</Empty>
        )}
      </div>

      {/* Action required — overdue follow-ups */}
      <div className="mb-2 mt-6 flex items-center justify-between px-1">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.08em] text-sage-d">
          ⚠️ Action required
        </h2>
        {overdue.filter((t) => t.coach_id === me.id).length > 0 && (
          <ClearAllButton
            count={overdue.filter((t) => t.coach_id === me.id).length}
          />
        )}
      </div>
      <div className="rounded-2xl border border-line bg-card p-2 shadow-sm">
        {overdue.length ? (
          <>
            {overdue.slice(0, 20).map((t) => {
              const nm = nameById.get(t.member_id) ?? "Member";
              const daysLate = Math.max(
                1,
                Math.round(
                  (new Date(today).getTime() - new Date(t.due_date).getTime()) /
                    86400000,
                ),
              );
              return (
                <Row
                  key={t.id}
                  avatar={initials(nm)}
                  avatarClass={avColor(nm)}
                  title={`${nm} — ${ACTIVITY_LABEL[t.activity] ?? t.activity} pending`}
                  sub={`${daysLate} din se due · ek warm check-in karein?`}
                  dot="bad"
                />
              );
            })}
            {overdue.length > 20 && (
              <Link
                href="/followup"
                className="block px-2 pb-2 pt-1 text-center text-xs font-semibold text-terra-d"
              >
                + {overdue.length - 20} aur — sab Follow-up screen par dekhein →
              </Link>
            )}
          </>
        ) : (
          <Empty>Sab on track 🎉</Empty>
        )}
      </div>

      {/* Club pulse — recent members */}
      <SectionHeader>✨ Club pulse</SectionHeader>
      <div className="rounded-2xl border border-line bg-card p-2 shadow-sm">
        {recentMembers.length ? (
          recentMembers.map((m) => {
            const nm = nameById.get(m.user_id) ?? "Member";
            return (
              <Row
                key={m.user_id}
                avatar={initials(nm)}
                avatarClass={avColor(nm)}
                title={`${nm} · ${membershipLabel(m.membership_type, memLabels)} member`}
                sub={`Stage ${m.stage}${m.current_weight ? ` · ${m.current_weight}kg` : ""} · joined ${m.join_date}`}
                dot="good"
              />
            );
          })
        ) : (
          <Empty>No members visible yet.</Empty>
        )}
      </div>
    </main>
  );
}

/* ── small presentational helpers ────────────────────────────────────────── */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display mb-2 mt-6 px-1 text-sm font-semibold uppercase tracking-[0.08em] text-sage-d">
      {children}
    </h2>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-4 text-center text-sm text-ink/50">{children}</p>;
}

function Row({
  avatar,
  avatarClass,
  title,
  sub,
  dot,
}: {
  avatar: string;
  avatarClass: string;
  title: string;
  sub: string;
  dot?: "good" | "warn" | "bad";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2.5">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white ${avatarClass}`}
      >
        {avatar}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{title}</div>
        <div className="truncate text-xs text-ink/55">{sub}</div>
      </div>
      {dot && (
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            dot === "good" ? "bg-good" : dot === "warn" ? "bg-warn" : "bg-bad"
          }`}
        />
      )}
    </div>
  );
}
