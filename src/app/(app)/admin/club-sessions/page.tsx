import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClubSessionsEditor } from "./ClubSessionsEditor";

export const dynamic = "force-dynamic";

const LEADER_ROLES = ["club_owner", "nco", "jco", "supervisor"] as const;

function istDate(offsetDays = 0): string {
  const ms = Date.now() + 5.5 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function dateLabel(iso: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function ClubSessionsPage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (typeof me === "string") redirect("/");
  if (!(LEADER_ROLES as readonly string[]).includes(me.role)) redirect("/");

  const dates = [istDate(0), istDate(1), istDate(2)];

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("club_sessions")
    .select("session_date, period, details")
    .in("session_date", dates);

  const byKey = new Map<string, string>();
  for (const r of rows ?? []) {
    byKey.set(`${r.session_date}:${r.period}`, r.details ?? "");
  }

  const initial = dates.map((date, i) => ({
    date,
    label: dateLabel(date, i),
    morning: byKey.get(`${date}:morning`) ?? "",
    evening: byKey.get(`${date}:evening`) ?? "",
  }));

  return (
    <main className="px-4 pb-8 pt-5">
      <h1 className="mb-1 font-display text-[22px] font-semibold text-ink">
        Club Sessions
      </h1>
      <p className="mb-5 text-xs text-ink/55">
        Paste full Zoom invite — link is auto-extracted and shown in the app.
      </p>
      <ClubSessionsEditor initial={initial} />
    </main>
  );
}
