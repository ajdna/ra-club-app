"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/** Schedule a home visit (set date/time on a follow-up task). */
export async function scheduleHomeVisit(
  taskId: string,
  scheduledAt: string,
  meetingLink?: string,
): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("follow_up_tasks")
    .update({
      scheduled_at: scheduledAt,
      ...(meetingLink !== undefined ? { meeting_link: meetingLink } : {}),
    })
    .eq("id", taskId)
    .eq("coach_id", me.id);

  if (error) return { error: error.message };
  revalidatePath("/followup");
  revalidatePath("/calendar");
  return {};
}

/** Save/update meeting link on a follow-up task. */
export async function setMeetingLink(taskId: string, link: string): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("follow_up_tasks")
    .update({ meeting_link: link })
    .eq("id", taskId)
    .eq("coach_id", me.id);

  if (error) return { error: error.message };
  revalidatePath("/followup");
  revalidatePath("/calendar");
  return {};
}

/** Mark all overdue pending tasks as skipped for the logged-in coach. */
export async function clearOverdueTasks(): Promise<{ cleared: number }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { cleared: 0 };

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("follow_up_tasks")
    .update({ status: "skipped" })
    .eq("coach_id", me.id)
    .eq("status", "pending")
    .lt("due_date", today)
    .select("id");

  revalidatePath("/followup");
  revalidatePath("/");

  return { cleared: data?.length ?? 0 };
}
