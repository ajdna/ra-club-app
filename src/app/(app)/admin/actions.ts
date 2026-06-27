"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { notifyNewDownlineMember } from "@/lib/notify";

type Result = { ok: true } | { ok: false; error: string };

function ownerOnly(me: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!me || me === "unlinked" || me === "pending" || me === "rejected")
    return "Not signed in.";
  if (me.role !== "club_owner") return "Club owner only.";
  return null;
}

/** Approve a pending registration. */
export async function approveUser(userId: string): Promise<Result> {
  const me = await getCurrentUser();
  const err = ownerOnly(me);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_user", { p_user_id: userId });
  if (error) return { ok: false, error: error.message };

  // Best-effort: notify the new member's direct upline that their team grew.
  await notifyNewDownlineMember(userId);

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}

/** Reject a pending registration. */
export async function rejectUser(userId: string): Promise<Result> {
  const me = await getCurrentUser();
  const err = ownerOnly(me);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_user", { p_user_id: userId });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}

/** Change a user's role, upline, membership type, or active/inactive status. */
export async function updateUserRole(formData: FormData): Promise<Result> {
  const me = await getCurrentUser();
  const err = ownerOnly(me);
  if (err) return { ok: false, error: err };

  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  const parentId = String(formData.get("parent_id") ?? "") || null;
  const membershipRaw = String(formData.get("membership") ?? "") || null;
  const status = String(formData.get("status") ?? "") || null;

  if (!userId || !role) return { ok: false, error: "Missing required fields." };

  const VALID_ROLES = ["upline","club_owner","nco","jco","coach","member","privilege","guest"] as const;
  const VALID_MEMBERSHIPS = ["basic","elite","privilege"] as const;
  type VRole = typeof VALID_ROLES[number];
  type VMembership = typeof VALID_MEMBERSHIPS[number];

  if (!VALID_ROLES.includes(role as VRole))
    return { ok: false, error: "Invalid role." };
  const membership = (membershipRaw && VALID_MEMBERSHIPS.includes(membershipRaw as VMembership))
    ? (membershipRaw as VMembership)
    : null;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_user_role", {
    p_user_id: userId,
    p_new_role: role as VRole,
    p_new_parent_id: parentId ?? undefined,
    p_membership: membership ?? undefined,
    p_status: status ?? undefined,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  revalidatePath(`/members/${userId}`);
  return { ok: true };
}

/** Update personal details — self, upline, or club owner. */
export async function updateUserDetails(formData: FormData): Promise<Result> {
  const me = await getCurrentUser();
  if (!me || me === "unlinked" || me === "pending" || me === "rejected")
    return { ok: false, error: "Not signed in." };

  const userId = String(formData.get("user_id") ?? "");
  const name = String(formData.get("name") ?? "") || null;
  const phone = String(formData.get("phone") ?? "") || null;
  const address = String(formData.get("address") ?? "") || null;

  if (!userId) return { ok: false, error: "Missing user ID." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_user_details", {
    p_user_id: userId,
    p_name: name ?? undefined,
    p_phone: phone ?? undefined,
    p_address: address ?? undefined,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  revalidatePath(`/members/${userId}`);
  revalidatePath("/admin/users");
  return { ok: true };
}
