import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export interface CurrentUser {
  id: string;
  name: string;
  role: Role;
  parentId: string | null;
  status: "active" | "inactive";
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
 * The application user linked to the signed-in auth user via `users.auth_id`.
 *
 * Returns:
 *   null        — not signed in
 *   "unlinked"  — signed in but no matching users row (needs manual auth_id link)
 *   "pending"   — registered but awaiting club-owner approval
 *   "rejected"  — registration was rejected by club owner
 *   CurrentUser — fully active, ready to use the app
 *
 * Cached per request so multiple Server Components calling this don't hit the DB twice.
 */
export const getCurrentUser = cache(
  async (): Promise<CurrentUser | "unlinked" | "pending" | "rejected" | null> => {
    const authUser = await getAuthUser();
    if (!authUser) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("users")
      .select("id, name, role, parent_id, status")
      .eq("auth_id", authUser.id)
      .maybeSingle();

    if (!data) return "unlinked";
    if (data.status === "pending") return "pending";
    if (data.status === "rejected") return "rejected";

    return {
      id: data.id,
      name: data.name,
      role: data.role as Role,
      parentId: data.parent_id,
      status: data.status as "active" | "inactive",
    };
  },
);
