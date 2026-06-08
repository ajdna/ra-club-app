import { createClient } from "@/lib/supabase/server";

/**
 * Notifications — typed reads for the in-app bell + feed. Rows are addressed to
 * the current user. Generation + mutations live in ./actions.ts.
 */

export type NotificationRow = {
  id: string;
  type: "milestone" | "recharge_due" | "drop_off" | "info";
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export async function getNotifications(limit = 50): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, data, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as NotificationRow[]) ?? [];
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
}
