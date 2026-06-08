"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
