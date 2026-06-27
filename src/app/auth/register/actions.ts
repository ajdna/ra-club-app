"use server";

import { createClient } from "@/lib/supabase/server";
import { isEmail, isE164 } from "@/lib/validate";

type RegisterResult = { ok: true } | { ok: false; error: string };

/**
 * Called AFTER supabase.auth.signUp() succeeds on the client.
 * Creates a pending users row via register_user_v2 (username + whatsapp aware).
 * Username defaults to email when blank (handled in the RPC).
 */
export async function registerUser(
  name: string,
  username: string,
  email: string,
  phone: string,
  whatsapp: string,
  role: string,
  parentId: string,
): Promise<RegisterResult> {
  if (!name.trim()) return { ok: false, error: "Apna naam likhein." };
  if (!isEmail(email)) return { ok: false, error: "Valid email daalein." };
  if (!isE164(phone)) return { ok: false, error: "Valid phone number daalein (+country code, e.g. +9198xxxxxxxx)." };
  if (whatsapp.trim() && !isE164(whatsapp)) return { ok: false, error: "Valid WhatsApp number daalein (+country code)." };
  if (!["member", "coach"].includes(role)) return { ok: false, error: "Invalid role." };
  if (!parentId) return { ok: false, error: "Apna coach / upline choose karein." };

  const supabase = await createClient();
  // register_user_v2 is newer than the generated DB types; typed cast until
  // `npm run gen:types` is re-run.
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
  const { error } = await rpc("register_user_v2", {
    p_name: name.trim(),
    p_username: username.trim(),
    p_email: email.trim().toLowerCase(),
    p_phone: phone.trim(),
    p_whatsapp: whatsapp.trim(),
    p_role: role,
    p_parent_id: parentId,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
