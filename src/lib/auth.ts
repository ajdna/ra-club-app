import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export interface CurrentUser {
  id: string;
  name: string;
  role: Role;
  parentId: string | null;
}

/**
 * The signed-in Supabase auth user, or null. Cached per request.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * The application user (role + tree position) linked to the signed-in auth user
 * via `users.auth_id`. Returns null if not signed in, and `"unlinked"` if signed
 * in but no matching `users` row exists yet (needs auth_id linking). Cached per
 * request.
 */
export const getCurrentUser = cache(
  async (): Promise<CurrentUser | "unlinked" | null> => {
    const authUser = await getAuthUser();
    if (!authUser) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("users")
      .select("id, name, role, parent_id")
      .eq("auth_id", authUser.id)
      .maybeSingle();

    if (!data) return "unlinked";
    return {
      id: data.id,
      name: data.name,
      role: data.role as Role,
      parentId: data.parent_id,
    };
  },
);
