"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Update a single rule_config value. Club-Owner only (also enforced by RLS on
 * the rule_config table). After saving, revalidate the screens that read config
 * so changes show up immediately.
 */
export async function setConfig(
  key: string,
  value: unknown,
): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || me === "unlinked")
    return { ok: false, error: "Not signed in." };
  if (me.role !== "club_owner")
    return { ok: false, error: "Only the Club Owner can change settings." };

  const supabase = await createClient();
  const { error } = await supabase.from("rule_config").upsert(
    {
      key,
      value: value as never,
      updated_by: me.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) return { ok: false, error: error.message };

  // Screens that read config — refresh them.
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/members");
  revalidatePath("/alerts");
  return { ok: true };
}
