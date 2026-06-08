"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type SystemRole =
  | "upline" | "club_owner" | "nco" | "jco" | "coach"
  | "supervisor" | "member" | "privilege" | "guest";

export const SYSTEM_ROLES: SystemRole[] = [
  "member", "coach", "supervisor", "jco", "nco", "upline", "privilege", "guest",
];

export interface RoleMappingRow {
  id: string;
  display_name: string;
  system_role: SystemRole;
  gets_members_row: boolean;
  gets_followup: boolean;
  sort_order: number;
}

async function assertOwner() {
  const me = await getCurrentUser();
  if (!me || typeof me === "string" || me.role !== "club_owner") {
    throw new Error("Club owner only.");
  }
}

export async function getRoleMappings(): Promise<RoleMappingRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_mappings")
    .select("id, display_name, system_role, gets_members_row, gets_followup, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as RoleMappingRow[];
}

export async function addRoleMapping(formData: FormData): Promise<{ error?: string }> {
  try {
    await assertOwner();
    const supabase = await createClient();

    const display_name = String(formData.get("display_name") ?? "").trim();
    const system_role = String(formData.get("system_role") ?? "").trim() as SystemRole;
    const gets_members_row = formData.get("gets_members_row") === "true";
    const gets_followup = formData.get("gets_followup") === "true";
    const sort_order = parseInt(String(formData.get("sort_order") ?? "99"), 10);

    if (!display_name) return { error: "Display name is required." };
    if (!SYSTEM_ROLES.includes(system_role)) return { error: `Invalid system role: ${system_role}` };

    const { error } = await supabase.from("role_mappings").insert({
      display_name,
      system_role,
      gets_members_row,
      gets_followup,
      sort_order: isNaN(sort_order) ? 99 : sort_order,
    });

    if (error) return { error: error.message };

    revalidatePath("/admin/roles");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateRoleMapping(
  id: string,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await assertOwner();
    const supabase = await createClient();

    const display_name = String(formData.get("display_name") ?? "").trim();
    const system_role = String(formData.get("system_role") ?? "").trim() as SystemRole;
    const gets_members_row = formData.get("gets_members_row") === "true";
    const gets_followup = formData.get("gets_followup") === "true";
    const sort_order = parseInt(String(formData.get("sort_order") ?? "99"), 10);

    if (!display_name) return { error: "Display name is required." };
    if (!SYSTEM_ROLES.includes(system_role)) return { error: `Invalid system role: ${system_role}` };

    const { error } = await supabase
      .from("role_mappings")
      .update({
        display_name,
        system_role,
        gets_members_row,
        gets_followup,
        sort_order: isNaN(sort_order) ? 99 : sort_order,
      })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/admin/roles");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteRoleMapping(id: string): Promise<{ error?: string }> {
  try {
    await assertOwner();
    const supabase = await createClient();

    const { error } = await supabase.from("role_mappings").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin/roles");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
