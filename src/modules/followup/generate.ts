import { createClient } from "@/lib/supabase/server";
import { generateFollowupTasks } from "@/lib/followup-planner";
import { getConfigValue } from "@/modules/rules-engine";

export async function generateForMember(
  memberId: string,
  coachId: string,
  startDate: Date,
): Promise<void> {
  const supabase = await createClient();

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
  const supabase = await createClient();

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
