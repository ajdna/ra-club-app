"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { generateFollowupTasks } from "@/lib/followup-planner";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx") as typeof import("xlsx");

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
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; name: string; error: string }>;
}

export interface RoleMapping {
  display_name: string;
  system_role: string;
  gets_members_row: boolean;
  gets_followup: boolean;
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

/** Load role mappings from DB (case-insensitive display_name key) */
async function loadRoleMappings(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Map<string, RoleMapping>> {
  const { data } = await supabase
    .from("role_mappings")
    .select("display_name, system_role, gets_members_row, gets_followup")
    .order("sort_order", { ascending: true });

  const map = new Map<string, RoleMapping>();
  for (const row of data ?? []) {
    map.set(row.display_name.toLowerCase().trim(), row as RoleMapping);
  }
  return map;
}

export async function importMembers(formData: FormData): Promise<ImportResult> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string" || me.role !== "club_owner") {
    return { total: 0, inserted: 0, updated: 0, skipped: 0, errors: [{ row: 0, name: "-", error: "Club owner only." }] };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { total: 0, inserted: 0, updated: 0, skipped: 0, errors: [{ row: 0, name: "-", error: "No file uploaded." }] };
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
    return { total: 0, inserted: 0, updated: 0, skipped: 0, errors: [{ row: 1, name: "-", error: "No data rows found in file." }] };
  }

  const supabase = await createClient();
  const result: ImportResult = { total: rows.length, inserted: 0, updated: 0, skipped: 0, errors: [] };

  // Load role mappings from DB
  const roleMappings = await loadRoleMappings(supabase);

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
      const roleRaw = String(row.role ?? "").trim() || "member";
      const mapping = roleMappings.get(roleRaw.toLowerCase());
      if (!mapping) {
        const validRoles = Array.from(roleMappings.keys()).join(", ");
        throw new Error(
          `Unknown role: "${roleRaw}". Valid roles: ${validRoles || "(none configured — run migration first)"}`,
        );
      }

      // Upline
      const uplineName = String(row.upline_name ?? "").trim();
      if (!uplineName) throw new Error("upline_name is required");
      const uplineId = uplineMap.get(uplineName.toLowerCase());
      if (!uplineId) throw new Error(`Upline not found: "${uplineName}"`);

      // Start date
      const startDate = parseDate(row.start_date as string | number);
      if (!startDate) throw new Error(`Invalid start_date: "${row.start_date}"`);

      // Membership
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

      // Upsert via RPC — returns { id, action, date_changed }
      const { data: upsertResult, error: rpcErr } = await supabase.rpc(
        "bulk_upsert_user",
        {
          p_name: name,
          p_upline_id: uplineId,
          p_role: mapping.system_role as "member" | "coach" | "supervisor" | "jco" | "nco",
          p_gets_members_row: mapping.gets_members_row,
          p_phone: String(row.phone ?? "").trim() || null,
          p_email: String(row.email ?? "").trim() || null,
          p_membership: membership,
          p_join_date: startDate.toISOString().split("T")[0],
          p_ideal_weight: idealWeight !== null && !isNaN(idealWeight) ? idealWeight : null,
          p_cur_weight: curWeight !== null && !isNaN(curWeight) ? curWeight : null,
        },
      );

      if (rpcErr) throw new Error(rpcErr.message);

      const { id: userId, action, date_changed } = upsertResult as {
        id: string;
        action: "inserted" | "updated" | "skipped";
        date_changed: boolean;
      };

      // Tally counts
      if (action === "inserted") result.inserted++;
      else if (action === "updated") result.updated++;
      else result.skipped++;

      // Follow-up tasks
      if (mapping.gets_followup) {
        if (action === "inserted") {
          // New user — generate full 12-month schedule
          await generateAndInsertTasks(supabase, userId, uplineId, startDate);

        } else if (action === "updated" && date_changed) {
          // Start date changed — delete pending tasks and regenerate
          await supabase
            .from("follow_up_tasks")
            .delete()
            .eq("member_id", userId)
            .eq("status", "pending");

          await generateAndInsertTasks(supabase, userId, uplineId, startDate);
        }
        // action === "skipped" or updated with no date change → leave tasks alone
      }

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

async function generateAndInsertTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  memberId: string,
  coachId: string,
  startDate: Date,
) {
  const tasks = generateFollowupTasks(startDate, 12);
  const taskRows = tasks.map((t) => ({
    member_id: memberId,
    coach_id: coachId,
    day_number: t.day_number,
    cycle: t.cycle,
    activity: t.activity,
    title: t.title,
    due_date: t.due_date,
    status: "pending" as const,
  }));

  const { error } = await supabase.from("follow_up_tasks").insert(taskRows);
  if (error) throw new Error(`Follow-up tasks failed: ${error.message}`);
}
