import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_LABEL } from "@/lib/followup-planner";
import { ClearAllButton } from "./ClearAllButton";
import { HomeVisitActions } from "./HomeVisitActions";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warn/10 text-warn border-warn/30",
  done: "bg-good/10 text-good border-good/30",
  skipped: "bg-ink/10 text-ink/50 border-ink/20",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function FollowupPage() {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") redirect("/login");

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Fetch today's tasks + next 7 days for the logged-in coach
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const soon = sevenDaysLater.toISOString().split("T")[0];

  const { data: tasks } = await supabase
    .from("follow_up_tasks")
    .select(
      `id, due_date, day_number, cycle, activity, title, status, scheduled_at, meeting_link,
       member:member_id ( user_id, coach_id,
         user:user_id ( name, phone ) )`,
    )
    .eq("coach_id", me.id)
    .lte("due_date", soon)
    .gte("due_date", today)
    .order("due_date", { ascending: true })
    .order("activity", { ascending: true });

  // Also fetch overdue pending tasks
  const { data: overdue } = await supabase
    .from("follow_up_tasks")
    .select(
      `id, due_date, day_number, cycle, activity, title, status, scheduled_at, meeting_link,
       member:member_id ( user_id, coach_id,
         user:user_id ( name, phone ) )`,
    )
    .eq("coach_id", me.id)
    .eq("status", "pending")
    .lt("due_date", today)
    .order("due_date", { ascending: false })
    .limit(20);

  type Task = NonNullable<typeof tasks>[number];

  function TaskCard({ task }: { task: Task }) {
    const memberName =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (task.member as any)?.user?.name ?? "Unknown";
    const memberPhone =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (task.member as any)?.user?.phone ?? null;
    const label =
      ACTIVITY_LABEL[task.activity as keyof typeof ACTIVITY_LABEL] ??
      task.activity;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scheduledAt = (task as any).scheduled_at ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meetingLink = (task as any).meeting_link ?? null;
    const isHomeVisit = task.activity === "home_visit";

    return (
      <div
        className={`rounded-2xl border px-4 py-3 ${STATUS_STYLES[task.status] ?? STATUS_STYLES.pending}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-ink">{memberName}</div>
            <div className="mt-0.5 text-sm">{label}</div>
            {task.title && (
              <div className="mt-0.5 text-xs opacity-70">{task.title}</div>
            )}
            <div className="mt-1 text-xs opacity-60">
              {formatDate(task.due_date)} · Cycle {task.cycle}, Day{" "}
              {task.day_number}
            </div>
            {/* Home visit scheduling actions */}
            {isHomeVisit && task.status !== "done" && (
              <HomeVisitActions
                taskId={task.id}
                scheduledAt={scheduledAt}
                meetingLink={meetingLink}
                memberName={memberName}
              />
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {memberPhone && (
              <a
                href={`tel:${memberPhone}`}
                className="rounded-lg bg-emerald px-3 py-1 text-xs font-semibold text-white"
              >
                📞 Call
              </a>
            )}
            <MarkDoneButton taskId={task.id} status={task.status} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="px-4 pb-10 pt-5 max-w-lg mx-auto">
      <Link href="/" className="text-sm font-semibold text-sage-d">
        ← Home
      </Link>

      <h1 className="font-display mt-3 text-2xl font-semibold text-emerald">
        Follow-up Tasks
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        Aaj aur agle 7 din ke tasks · overdue bhi dikh rahe hain
      </p>

      {/* Overdue */}
      {(overdue?.length ?? 0) > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-bad">
              ⚠️ Overdue ({overdue!.length})
            </h2>
            <ClearAllButton count={overdue!.length} />
          </div>
          <div className="space-y-3">
            {overdue!.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        </section>
      )}

      {/* Today + next 7 days */}
      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/50 mb-2">
          Aaj aur agle 7 din
        </h2>
        {(tasks?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-line bg-card px-4 py-8 text-center text-ink/50">
            Koi task nahi 🎉
          </div>
        ) : (
          <div className="space-y-3">
            {tasks!.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// Inline server-rendered placeholder — actual mark-done is a client action
function MarkDoneButton({
  taskId,
  status,
}: {
  taskId: string;
  status: string;
}) {
  if (status === "done") {
    return (
      <span className="rounded-lg bg-good/20 px-3 py-1 text-xs font-semibold text-good">
        ✓ Done
      </span>
    );
  }
  return (
    <Link
      href={`/followup/done?id=${taskId}`}
      className="rounded-lg border border-good/40 bg-good/10 px-3 py-1 text-xs font-semibold text-good"
    >
      Mark Done
    </Link>
  );
}
