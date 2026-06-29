"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function setNotificationPref(
  type: string,
  enabled: boolean,
  sendTime?: string,
): Promise<{ ok: boolean; error?: string }> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_prefs")
    .upsert(
      {
        user_id: me.id,
        type,
        enabled,
        ...(sendTime !== undefined ? { send_time: sendTime || null } : {}),
      },
      { onConflict: "user_id,type" },
    );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
