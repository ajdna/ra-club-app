import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit",
  });
}

function fmtDue(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
}

export default async function CalendarPage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (typeof me === "string") redirect("/");

  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const ninetyDays = new Date();
  ninetyDays.setDate(ninetyDays.getDate() + 90);
  const endDate = ninetyDays.toISOString().split("T")[0];

  // All upcoming home visits (scheduled or by due_date)
  const { data: tasks } = await supabase
    .from("follow_up_tasks")
    .select(`
      id, coach_id, due_date, cycle, day_number, title, status, scheduled_at, meeting_link,
      coach:users!coach_id ( name ),
      member:members!member_id ( user_id, user:users!user_id ( name, phone ) )
    `)
    .eq("activity", "home_visit")
    .neq("status", "done")
    .neq("status", "skipped")
    .lte("due_date", endDate)
    .gte("due_date", today)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("due_date", { ascending: true })
    .limit(150);

  type Task = NonNullable<typeof tasks>[number];

  // Group by display date (scheduled_at takes priority over due_date)
  const grouped = new Map<string, Task[]>();
  for (const t of tasks ?? []) {
    const key = t.scheduled_at
      ? t.scheduled_at.slice(0, 10)
      : t.due_date;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(t);
  }

  const sortedDays = Array.from(grouped.keys()).sort();

  return (
    <main className="px-4 pb-24 pt-5">
      <Link href="/" className="text-sm font-semibold text-sage-d">← Home</Link>
      <h1 className="font-display mt-3 text-2xl font-semibold text-emerald">
        🏠 Home Visit Calendar
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        Agle 90 din ke scheduled home visits
      </p>

      {sortedDays.length === 0 && (
        <div className="mt-16 text-center text-ink/50">
          <div className="text-4xl">📅</div>
          <p className="mt-3 font-semibold">Koi upcoming home visit nahi</p>
          <p className="mt-1 text-sm">Follow-up page se schedule karein</p>
          <Link
            href="/followup"
            className="mt-4 inline-block rounded-xl bg-emerald px-4 py-2 text-sm font-semibold text-white"
          >
            Follow-up Tasks →
          </Link>
        </div>
      )}

      <div className="mt-5 space-y-5">
        {sortedDays.map((day) => {
          const dayTasks = grouped.get(day)!;
          const isToday = day === today;
          return (
            <section key={day}>
              {/* Day header */}
              <div className={`mb-2 flex items-center gap-2 rounded-xl px-3 py-1.5 ${
                isToday ? "bg-emerald text-white" : "bg-cream-2 text-ink"
              }`}>
                <span className="text-sm font-bold">
                  {isToday ? "Today — " : ""}{fmtDate(day)}
                </span>
                <span className={`ml-auto text-xs ${isToday ? "text-white/70" : "text-ink/50"}`}>
                  {dayTasks.length} visit{dayTasks.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-2">
                {dayTasks.map((t) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const member = t.member as any;
                  const name = member?.user?.name ?? "Member";
                  const phone = member?.user?.phone ?? null;
                  const hasScheduled = !!t.scheduled_at;
                  const isMine = t.coach_id === me.id;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const coachName = (t as any).coach?.name ?? null;

                  return (
                    <div
                      key={t.id}
                      className={`rounded-2xl border px-4 py-3 ${
                        hasScheduled
                          ? "border-emerald/30 bg-emerald/5"
                          : "border-warn/30 bg-warn/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{name}</p>
                          <p className="mt-0.5 text-sm text-ink/70">
                            {t.title ?? "Home Visit"} · Cycle {t.cycle}
                          </p>
                          {!isMine && coachName && (
                            <p className="mt-0.5 inline-block rounded-md bg-sage/15 px-1.5 py-0.5 text-xs font-semibold text-sage-d">
                              Coach: {coachName}
                            </p>
                          )}
                          {hasScheduled ? (
                            <p className="mt-1 text-xs font-semibold text-emerald">
                              ⏰ {fmtTime(t.scheduled_at!)}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-warn">
                              Due: {fmtDue(t.due_date)} · Time not set
                            </p>
                          )}
                          {t.meeting_link && (
                            <a
                              href={t.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block text-xs font-semibold text-terra-d underline"
                            >
                              🔗 Join Meeting
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {phone && (
                            <a
                              href={`tel:${phone}`}
                              className="rounded-lg bg-emerald px-2.5 py-1 text-xs font-semibold text-white"
                            >
                              📞 Call
                            </a>
                          )}
                          {isMine && (
                            <Link
                              href="/followup"
                              className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-sage-d"
                            >
                              Edit
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
