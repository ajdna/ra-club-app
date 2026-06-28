"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function markTaskDone(
  taskId: string,
  note?: string,
): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("follow_up_tasks")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
      ...(note ? { completion_note: note } : {}),
      // completion_note exists in the DB but is missing from the generated
      // Supabase types — run `npm run gen:types` to drop this cast.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .eq("id", taskId)
    .eq("coach_id", me.id);

  if (error) return { error: error.message };
  revalidatePath("/followup");
  revalidatePath("/");
  return {};
}

export async function clearOverdueTasks(): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { error: "Not signed in" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("follow_up_tasks")
    .update({ status: "skipped" })
    .eq("coach_id", me.id)
    .eq("status", "pending")
    .lt("due_date", new Date().toISOString().split("T")[0]);

  if (error) return { error: error.message };
  revalidatePath("/followup");
  revalidatePath("/");
  return {};
}
