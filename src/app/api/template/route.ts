/**
 * GET /api/template
 * Returns a downloadable Excel (.xlsx) template for bulk user import.
 *
 * To add more roles in future:
 *  1. Add value to user_role enum in Supabase (ALTER TYPE user_role ADD VALUE 'new_role')
 *  2. Add the new role to VALID_ROLES in src/app/(app)/admin/import/actions.ts
 *  3. Update the ROLES_REF sheet below so staff know what to enter
 */
import { NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx") as typeof import("xlsx");

export const dynamic = "force-dynamic";

// ── Column headers ────────────────────────────────────────────────────────────
const HEADERS = [
  "name",           // required
  "role",           // required — see Roles sheet
  "upline_name",    // required — exact name of their upline/coach in the system
  "phone",          // optional
  "email",          // optional
  "start_date",     // required — DD/MM/YYYY
  "membership_type",// members only: basic | elite | privilege
  "current_weight_kg", // members only, optional
  "ideal_weight_kg",   // members only, optional
];

// ── Example rows ──────────────────────────────────────────────────────────────
const EXAMPLE_ROWS = [
  ["Priya Sharma",  "member",     "Ankur Jain", "9876543210", "priya@example.com",  "01/06/2025", "basic",     "68", "58"],
  ["Rahul Gupta",   "member",     "Ankur Jain", "9876500001", "",                   "15/06/2025", "elite",     "82", "72"],
  ["Sonal Verma",   "coach",      "Ankur Jain", "9876500002", "sonal@example.com",  "01/03/2025", "",          "",   ""],
  ["Vijay Singh",   "supervisor", "Ankur Jain", "9876500003", "",                   "01/01/2025", "",          "",   ""],
  ["Meena Sharma",  "jco",        "Ankur Jain", "9876500004", "meena@example.com",  "01/01/2024", "",          "",   ""],
  ["Rajesh Kumar",  "nco",        "Ankur Jain", "9876500005", "",                   "01/06/2023", "",          "",   ""],
];

// ── Notes row ─────────────────────────────────────────────────────────────────
const NOTES = [
  ["NOTES →",
   "See 'Roles' sheet for valid roles",
   "Must match name exactly as in system",
   "10 digits only",
   "optional",
   "DD/MM/YYYY format",
   "members only: basic|elite|privilege",
   "optional, numbers only",
   "optional, numbers only",
  ],
];

// ── Roles reference sheet ─────────────────────────────────────────────────────
// Add new roles here when the enum is extended.
const ROLES_SHEET = [
  ["Role",        "Description",                                          "Gets follow-up tasks?", "Gets members row?"],
  ["member",      "Regular club member — health track",                   "Yes (12 months)",       "Yes"],
  ["coach",       "Coach — manages members, runs follow-ups",             "No",                    "No"],
  ["supervisor",  "Supervisor — oversees coaches",                        "No",                    "No"],
  ["jco",         "Junior Club Officer",                                  "No",                    "No"],
  ["nco",         "National Club Officer",                                "No",                    "No"],
  [],
  ["To add a new role in future:"],
  ["  1. Run in Supabase SQL: ALTER TYPE user_role ADD VALUE 'new_role';"],
  ["  2. Add the new role to VALID_ROLES in src/app/(app)/admin/import/actions.ts"],
  ["  3. Add a row to this Roles sheet in src/app/api/template/route.ts"],
];

export async function GET() {
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

  // ── Sheet 2: Roles reference ──────────────────────────────────────────────
  const wsRoles = XLSX.utils.aoa_to_sheet(ROLES_SHEET);
  wsRoles["!cols"] = [
    { wch: 16 }, { wch: 48 }, { wch: 26 }, { wch: 20 },
  ];
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
