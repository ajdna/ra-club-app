import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeHealth, type Health } from "@/lib/health";
import { getConfigValue } from "@/modules/rules-engine";
import { membershipLabel, type MembershipLabels } from "@/lib/membership";
import { MembersList, type MemberRow } from "./MembersList";

export const dynamic = "force-dynamic";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default async function MembersPage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (me === "unlinked") {
    return (
      <main className="px-5 py-16 text-center text-ink/60">
        Account not linked yet.
      </main>
    );
  }

  const supabase = await createClient();
  const today = todayISO();

  const [usersRes, membersRes, tasksRes, labels, memLabels] =
    await Promise.all([
    supabase.from("users").select("id, name"),
    supabase
      .from("members")
      .select("user_id, coach_id, membership_type, stage, current_weight, ideal_weight"),
    supabase
      .from("follow_up_tasks")
      .select("member_id, due_date, status"),
    getConfigValue<{ members_title?: string }>("ui_labels", {}),
    getConfigValue<MembershipLabels>("membership_labels", {}),
  ]);

  const title = labels.members_title ?? "Members";

  const nameById = new Map((usersRes.data ?? []).map((u) => [u.id, u.name as string]));
  const tasks = tasksRes.data ?? [];

  const rows: MemberRow[] = (membersRes.data ?? []).map((m) => {
    const mine = tasks.filter((t) => t.member_id === m.user_id);
    const overdue = mine.filter(
      (t) => t.status === "pending" && t.due_date < today,
    ).length;
    const dueToday = mine.filter(
      (t) => t.status === "pending" && t.due_date === today,
    ).length;
    const { status, label } = computeHealth({ overdue, dueToday });
    return {
      id: m.user_id,
      coachId: m.coach_id ?? "",
      coachName: nameById.get(m.coach_id ?? "") ?? "Unknown",
      name: nameById.get(m.user_id) ?? "Member",
      membershipType: m.membership_type,
      membershipLabel: membershipLabel(m.membership_type, memLabels),
      stage: m.stage,
      currentWeight: m.current_weight,
      idealWeight: m.ideal_weight,
      health: status as Health,
      healthLabel: label,
    };
  });

  return (
    <main className="px-4 pb-6 pt-6">
      <header className="mb-4 flex items-end justify-between px-1">
        <div>
          <h1 className="font-display text-[26px] font-medium tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-1 text-[13px] font-semibold text-ink-2">{rows.length} total</p>
        </div>
        {typeof me === "object" && me.role !== "member" && (
          <Link
            href="/add"
            aria-label="Add member"
            className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald text-white shadow-[0_8px_18px_var(--emerald-soft)] transition hover:bg-emerald-2"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </Link>
        )}
      </header>
      <MembersList members={rows} myId={typeof me === "object" ? me.id : ""} />
    </main>
  );
}
