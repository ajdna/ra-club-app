"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

type ActionResult = { ok: true } | { ok: false; error: string };

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Member logs their own weight. */
export async function logMyWeight(weight: number): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { ok: false, error: "Not signed in." };
  if (!Number.isFinite(weight) || weight <= 0 || weight > 500)
    return { ok: false, error: "Enter a valid weight (kg)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("weight_logs")
    .insert({ member_id: me.id, weight, logged_by: me.id });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/my-progress");
  return { ok: true };
}

/** Member marks themselves present today. */
export async function markMyAttendance(): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("attendance")
    .upsert(
      { member_id: me.id, date: todayISO(), present: true, marked_by: me.id },
      { onConflict: "member_id,date" },
    );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/my-progress");
  return { ok: true };
}
