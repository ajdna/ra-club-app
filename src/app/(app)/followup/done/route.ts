/**
 * GET /followup/done?id=<taskId>
 * Marks a follow-up task as done and redirects back.
 */
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") redirect("/login");

  const url = new URL(req.url);
  const taskId = url.searchParams.get("id");
  if (!taskId) redirect("/followup");

  const supabase = await createClient();
  await supabase
    .from("follow_up_tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("coach_id", me.id); // safety: only own tasks

  redirect("/followup");
}
