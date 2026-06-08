/**
 * GET /api/template
 * Returns a downloadable Excel (.xlsx) template for bulk member import.
 */
import { NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx") as typeof import("xlsx");

export const dynamic = "force-dynamic";

const HEADERS = [
  "name",
  "phone",
  "email",
  "start_date",
  "coach_name",
  "membership_type",
  "current_weight_kg",
  "ideal_weight_kg",
];

const EXAMPLE_ROWS = [
  [
    "Priya Sharma",
    "9876543210",
    "priya@example.com",
    "01/06/2025",
    "Ankur Jain",
    "basic",
    "68",
    "58",
  ],
  [
    "Rahul Gupta",
    "9876500001",
    "",
    "15/06/2025",
    "Ankur Jain",
    "elite",
    "82",
    "72",
  ],
];

const NOTES = [
  [
    "NOTES",
    "phone: digits only, no spaces",
    "email: optional",
    "start_date: DD/MM/YYYY",
    "coach_name: must match exactly as in system",
    "membership_type: basic | elite | privilege",
    "weights: optional, numbers only",
    "",
  ],
];

export async function GET() {
  const wb = XLSX.utils.book_new();

  // Data sheet
  const data = [HEADERS, ...EXAMPLE_ROWS, [], ...NOTES];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws["!cols"] = HEADERS.map((h) => ({
    wch: Math.max(h.length + 4, 18),
  }));

  XLSX.utils.book_append_sheet(wb, ws, "Members");

  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="ra-club-member-import-template.xlsx"',
    },
  });
}
