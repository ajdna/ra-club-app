"use server";

import { createClient } from "@/lib/supabase/server";

type RegisterResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Called AFTER supabase.auth.signUp() succeeds on the client.
 * At this point the user has an active auth session, so auth.uid() is available.
 * This calls the register_user() SECURITY DEFINER RPC which:
 *   - Creates a users row with status = 'pending'
 *   - Sets auth_id = auth.uid() so the row is linked immediately
 *   - Triggers hierarchy_closure so the upline can see the pending user
 */
export async function registerUser(
  name: string,
  email: string,
  phone: string,
  role: string,
  parentId: string,
): Promise<RegisterResult> {
  if (!name.trim()) return { ok: false, error: "Name required." };
  if (!email.trim()) return { ok: false, error: "Email required." };
  if (!["member", "coach"].includes(role))
    return { ok: false, error: "Invalid role." };
  if (!parentId) return { ok: false, error: "Please choose your coach / upline." };

  const supabase = await createClient();

  const { error } = await supabase.rpc("register_user", {
    p_name: name.trim(),
    p_email: email.trim().toLowerCase(),
    p_phone: phone.trim(),
    p_role: role as "member" | "coach",
    p_parent_id: parentId,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
