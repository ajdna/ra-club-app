"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { extractUrl } from "@/lib/extract-url";

const LEADER_ROLES = ["club_owner", "nco", "jco", "supervisor"] as const;

type ActionResult = { ok: boolean; error?: string };

export async function upsertClubSession(
  sessionDate: string,
  period: "morning" | "evening",
  details: string,
): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { ok: false, error: "Not signed in." };
  if (!(LEADER_ROLES as readonly string[]).includes(me.role)) {
    return { ok: false, error: "Sirf leaders club sessions post kar sakte hain." };
  }

  const link = extractUrl(details);
  const supabase = await createClient();
  const { error } = await supabase.from("club_sessions").upsert(
    {
      session_date: sessionDate,
      period,
      details,
      link,
      updated_by: me.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_date,period" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
