/**
 * GET /api/template
 * Returns a downloadable Excel (.xlsx) template for bulk user import.
 *
 * Role rows on the Roles sheet are loaded live from the role_mappings table
 * so they stay in sync with whatever the club owner has configured.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx") as typeof import("xlsx");

export const dynamic = "force-dynamic";

// ── Column headers ────────────────────────────────────────────────────────────
const HEADERS = [
  "name",              // required
  "role",              // required — see Roles sheet
  "upline_name",       // required — exact name of their upline/coach in the system
  "phone",             // optional
  "email",             // optional
  "start_date",        // required — DD/MM/YYYY
  "membership_type",   // if gets_members_row: basic | elite | privilege
  "current_weight_kg", // if gets_members_row, optional
  "ideal_weight_kg",   // if gets_members_row, optional
];

// ── Static example rows (uses default roles seeded by migration) ──────────────
const EXAMPLE_ROWS = [
  ["Priya Sharma",  "Member",           "Ankur Jain", "9876543210", "priya@example.com",  "01/06/2025", "basic",  "68", "58"],
  ["Rahul Gupta",   "Member",           "Ankur Jain", "9876500001", "",                   "15/06/2025", "elite",  "82", "72"],
  ["Sonal Verma",   "Coach",            "Ankur Jain", "9876500002", "sonal@example.com",  "01/03/2025", "",       "",   ""],
  ["Vijay Singh",   "Supervisor-Coach", "Ankur Jain", "9876500003", "",                   "01/01/2025", "",       "",   ""],
  ["Meena Sharma",  "JCO",              "Ankur Jain", "9876500004", "meena@example.com",  "01/01/2024", "",       "",   ""],
  ["Rajesh Kumar",  "NCO",              "Ankur Jain", "9876500005", "",                   "01/06/2023", "",       "",   ""],
];

const NOTES = [
  [
    "NOTES →",
    "See Roles sheet — case insensitive",
    "Must match name exactly as in system",
    "10 digits only",
    "optional",
    "DD/MM/YYYY format",
    "if health track: basic|elite|privilege",
    "optional, numbers only",
    "optional, numbers only",
  ],
];

export async function GET() {
  // Load role mappings from DB
  const supabase = await createClient();
  const { data: mappings } = await supabase
    .from("role_mappings")
    .select("display_name, system_role, gets_members_row, gets_followup")
    .order("sort_order", { ascending: true });

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Import data ──────────────────────────────────────────────────
  const data = [HEADERS, ...EXAMPLE_ROWS, [], ...NOTES];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 20) }));

  // Bold the header row
  const headerRange = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell) cell.s = { font: { bold: true } };
  }

  XLSX.utils.book_append_sheet(wb, ws, "Import");

  // ── Sheet 2: Roles reference (live from DB) ───────────────────────────────
  const rolesHeader = ["Display Name (use in Excel)", "System Role", "Health Track (members row)?", "Follow-up Tasks?"];
  const rolesRows = (mappings ?? []).map((m) => [
    m.display_name,
    m.system_role,
    m.gets_members_row ? "Yes" : "No",
    m.gets_followup ? "Yes (12 months)" : "No",
  ]);

  const staticNote = [
    [],
    ["To add a new display name → go to Admin Console → Role Mappings"],
    ["To add a new system role → run: ALTER TYPE user_role ADD VALUE 'new_role'; in Supabase"],
  ];

  const wsRoles = XLSX.utils.aoa_to_sheet([rolesHeader, ...rolesRows, ...staticNote]);
  wsRoles["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 28 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsRoles, "Roles");

  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="ra-club-import-template.xlsx"',
    },
  });
}
