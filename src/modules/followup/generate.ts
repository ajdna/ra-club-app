import { createServiceClient } from "@/lib/supabase/service";
import { generateFollowupTasks } from "@/lib/followup-planner";
import { getConfigValue } from "@/modules/rules-engine";

// Schedule generation is a system write (authorization is enforced by the
// caller, e.g. saveIntake). Use the service client so the delete+insert in
// regeneration is not silently filtered by RLS — a filtered delete would leave
// the old schedule behind and duplicate it.

export async function generateForMember(
  memberId: string,
  coachId: string,
  startDate: Date,
): Promise<void> {
  const supabase = createServiceClient();

  // Idempotent: skip if pending tasks already exist for this member
  const { count } = await supabase
    .from("follow_up_tasks")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId)
    .eq("status", "pending");

  if ((count ?? 0) > 0) return;

  const cadence = await getConfigValue<{ months: number }>(
    "followup_cadence",
    { months: 12 },
  );
  const tasks = generateFollowupTasks(startDate, cadence.months);

  const { error } = await supabase.from("follow_up_tasks").insert(
    tasks.map((t) => ({
      member_id: memberId,
      coach_id: coachId,
      day_number: t.day_number,
      cycle: t.cycle,
      activity: t.activity,
      title: t.title,
      due_date: t.due_date,
      status: "pending" as const,
    })),
  );
  if (error) throw new Error(`Follow-up tasks failed: ${error.message}`);
}

export async function regenerateForMember(
  memberId: string,
  coachId: string,
  startDate: Date,
): Promise<void> {
  const supabase = createServiceClient();

  await supabase
    .from("follow_up_tasks")
    .delete()
    .eq("member_id", memberId)
    .eq("status", "pending");

  const cadence = await getConfigValue<{ months: number }>(
    "followup_cadence",
    { months: 12 },
  );
  const tasks = generateFollowupTasks(startDate, cadence.months);

  const { error } = await supabase.from("follow_up_tasks").insert(
    tasks.map((t) => ({
      member_id: memberId,
      coach_id: coachId,
      day_number: t.day_number,
      cycle: t.cycle,
      activity: t.activity,
      title: t.title,
      due_date: t.due_date,
      status: "pending" as const,
    })),
  );
  if (error) throw new Error(`Follow-up tasks failed: ${error.message}`);
}
