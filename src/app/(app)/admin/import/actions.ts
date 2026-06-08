"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { generateFollowupTasks } from "@/lib/followup-planner";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx") as typeof import("xlsx");

export interface ImportRow {
  name: string;
  phone?: string;
  email?: string;
  start_date: string; // DD/MM/YYYY
  coach_name: string;
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
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) return new Date(d.y, d.m - 1, d.d);
    return null;
  }
  const s = String(raw).trim();
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  // Try native
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

  // Parse Excel
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: true,
  });

  // Filter out empty rows and NOTE rows
  const rows = rawRows.filter(
    (r) =>
      r["name"] &&
      String(r["name"]).trim() !== "" &&
      String(r["name"]).toUpperCase() !== "NOTES",
  ) as unknown as ImportRow[];

  if (rows.length === 0) {
    return { total: 0, success: 0, errors: [{ row: 1, name: "-", error: "No data rows found in file." }] };
  }

  const supabase = await createClient();
  const result: ImportResult = { total: rows.length, success: 0, errors: [] };

  // Pre-load all coaches for name lookup (case-insensitive)
  const { data: coaches } = await supabase
    .from("users")
    .select("id, name")
    .in("role", ["club_owner", "nco", "jco", "coach"])
    .eq("status", "active");

  const coachMap = new Map<string, string>(); // lowercase name → id
  for (const c of coaches ?? []) {
    coachMap.set(c.name.toLowerCase().trim(), c.id);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed, header is row 1
    const name = String(row.name ?? "").trim();

    try {
      // Validate required fields
      if (!name) throw new Error("Name is required");

      const coachName = String(row.coach_name ?? "").trim();
      if (!coachName) throw new Error("Coach name is required");

      const coachId = coachMap.get(coachName.toLowerCase());
      if (!coachId) throw new Error(`Coach not found: "${coachName}"`);

      const startDate = parseDate(row.start_date as string | number);
      if (!startDate) throw new Error(`Invalid start_date: "${row.start_date}"`);

      // Membership type
      const validMemberships = ["basic", "elite", "privilege"];
      const membership = validMemberships.includes(
        String(row.membership_type ?? "").toLowerCase(),
      )
        ? (String(row.membership_type).toLowerCase() as "basic" | "elite" | "privilege")
        : "basic";

      const curWeight = row.current_weight_kg
        ? parseFloat(String(row.current_weight_kg))
        : null;
      const idealWeight = row.ideal_weight_kg
        ? parseFloat(String(row.ideal_weight_kg))
        : null;

      // Create member via RPC
      const { data: memberId, error: rpcErr } = await supabase.rpc(
        "bulk_import_member",
        {
          p_name: name,
          p_phone: String(row.phone ?? "").trim() || null,
          p_email: String(row.email ?? "").trim() || null,
          p_coach_id: coachId,
          p_membership: membership,
          p_join_date: startDate.toISOString().split("T")[0],
          p_ideal_weight: isNaN(idealWeight!) ? null : idealWeight,
          p_cur_weight: isNaN(curWeight!) ? null : curWeight,
        },
      );

      if (rpcErr) throw new Error(rpcErr.message);

      // Generate follow-up tasks (12 months)
      const tasks = generateFollowupTasks(startDate, 12);
      const taskRows = tasks.map((t) => ({
        member_id: memberId as string,
        coach_id: coachId,
        day_number: t.day_number,
        cycle: t.cycle,
        activity: t.activity,
        title: t.title,
        due_date: t.due_date,
        status: "pending" as const,
      }));

      // Bulk insert tasks in one shot
      const { error: taskErr } = await supabase
        .from("follow_up_tasks")
        .insert(taskRows);

      if (taskErr) throw new Error(`Tasks insert failed: ${taskErr.message}`);

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
