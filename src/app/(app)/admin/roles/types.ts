// Shared types + constants for role mappings — no "use server" here

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
