"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { generateFollowupTasks } from "@/lib/followup-planner";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx") as typeof import("xlsx");

/**
 * Valid roles for bulk import.
 * To add a new role in future:
 *  1. Run: ALTER TYPE user_role ADD VALUE 'new_role'; in Supabase
 *  2. Add the new role to this array
 *  3. Add it to the Roles sheet in src/app/api/template/route.ts
 */
export const VALID_IMPORT_ROLES = [
  "member",
  "coach",
  "supervisor",
  "jco",
  "nco",
] as const;

export type ImportRole = typeof VALID_IMPORT_ROLES[number];

export interface ImportRow {
  name: string;
  role?: string;
  upline_name: string;
  phone?: string;
  email?: string;
  start_date: string;
  membership_type?: string;
  current_weight_kg?: string;
  ideal_weight_kg?: string;
}

export interface ImportResult {
  total: number;
  success: number;
  errors: Array<{ row: number; name: string; error: string }>;
}

function parseDate(raw: string | number | undefined): Date | null {
  if (!raw) return null;
  if (typeof raw === "number") {
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) return new Date(d.y, d.m - 1, d.d);
    return null;
  }
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function importMembers(formData: FormData): Promise<ImportResult> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string" || me.role !== "club_owner") {
    return { total: 0, success: 0, errors: [{ row: 0, name: "-", error: "Club owner only." }] };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { total: 0, success: 0, errors: [{ row: 0, name: "-", error: "No file uploaded." }] };
  }

  // Parse Excel — read first sheet (Import sheet)
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: true,
  });

  // Filter out blank rows and NOTE/header rows
  const rows = rawRows.filter(
    (r) =>
      r["name"] &&
      String(r["name"]).trim() !== "" &&
      String(r["name"]).toUpperCase() !== "NOTES →" &&
      String(r["name"]).toUpperCase() !== "NOTES",
  ) as unknown as ImportRow[];

  if (rows.length === 0) {
    return { total: 0, success: 0, errors: [{ row: 1, name: "-", error: "No data rows found in file." }] };
  }

  const supabase = await createClient();
  const result: ImportResult = { total: rows.length, success: 0, errors: [] };

  // Pre-load ALL active users for upline name lookup (case-insensitive)
  const { data: allUsers } = await supabase
    .from("users")
    .select("id, name")
    .eq("status", "active");

  const uplineMap = new Map<string, string>(); // lowercase name → id
  for (const u of allUsers ?? []) {
    uplineMap.set(u.name.toLowerCase().trim(), u.id);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const name = String(row.name ?? "").trim();

    try {
      if (!name) throw new Error("Name is required");

      // Role — default to 'member' if blank
      const roleRaw = String(row.role ?? "").trim().toLowerCase() || "member";
      if (!VALID_IMPORT_ROLES.includes(roleRaw as ImportRole)) {
        throw new Error(
          `Invalid role: "${roleRaw}". Valid roles: ${VALID_IMPORT_ROLES.join(", ")}`,
        );
      }
      const role = roleRaw as ImportRole;

      // Upline
      const uplineName = String(row.upline_name ?? "").trim();
      if (!uplineName) throw new Error("upline_name is required");
      const uplineId = uplineMap.get(uplineName.toLowerCase());
      if (!uplineId) throw new Error(`Upline not found: "${uplineName}"`);

      // Start date
      const startDate = parseDate(row.start_date as string | number);
      if (!startDate) throw new Error(`Invalid start_date: "${row.start_date}"`);

      // Membership (members only)
      const validMemberships = ["basic", "elite", "privilege"];
      const membershipRaw = String(row.membership_type ?? "").toLowerCase();
      const membership = validMemberships.includes(membershipRaw)
        ? (membershipRaw as "basic" | "elite" | "privilege")
        : "basic";

      const curWeight = row.current_weight_kg
        ? parseFloat(String(row.current_weight_kg))
        : null;
      const idealWeight = row.ideal_weight_kg
        ? parseFloat(String(row.ideal_weight_kg))
        : null;

      // Create user via RPC
      const { data: userId, error: rpcErr } = await supabase.rpc(
        "bulk_import_user",
        {
          p_name: name,
          p_upline_id: uplineId,
          p_role: role,
          p_phone: String(row.phone ?? "").trim() || null,
          p_email: String(row.email ?? "").trim() || null,
          p_membership: membership,
          p_join_date: startDate.toISOString().split("T")[0],
          p_ideal_weight: curWeight !== null && isNaN(curWeight) ? null : (idealWeight !== null && isNaN(idealWeight) ? null : idealWeight),
          p_cur_weight: curWeight !== null && isNaN(curWeight) ? null : curWeight,
        },
      );

      if (rpcErr) throw new Error(rpcErr.message);

      // Generate follow-up tasks only for members
      if (role === "member") {
        const tasks = generateFollowupTasks(startDate, 12);
        const taskRows = tasks.map((t) => ({
          member_id: userId as string,
          coach_id: uplineId,
          day_number: t.day_number,
          cycle: t.cycle,
          activity: t.activity,
          title: t.title,
          due_date: t.due_date,
          status: "pending" as const,
        }));

        const { error: taskErr } = await supabase
          .from("follow_up_tasks")
          .insert(taskRows);

        if (taskErr) throw new Error(`Follow-up tasks failed: ${taskErr.message}`);
      }

      result.success++;
    } catch (err) {
      result.errors.push({
        row: rowNum,
        name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
