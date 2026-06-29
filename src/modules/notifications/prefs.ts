import { createServiceClient } from "@/lib/supabase/service";

export type NotifPref = {
  type: string;
  enabled: boolean;
  send_time: string | null;
  last_sent_on: string | null;
};

export async function getPrefs(userId: string): Promise<NotifPref[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("notification_prefs")
    .select("type, enabled, send_time, last_sent_on")
    .eq("user_id", userId);
  return (data as NotifPref[]) ?? [];
}

/**
 * Batch helper: returns the set of userIds that have explicitly disabled `type`.
 * Missing rows are treated as enabled, so they are NOT in the returned set.
 */
export async function disabledUserIds(
  userIds: string[],
  type: string,
): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const sb = createServiceClient();
  const { data } = await sb
    .from("notification_prefs")
    .select("user_id")
    .eq("type", type)
    .eq("enabled", false)
    .in("user_id", userIds);
  return new Set((data ?? []).map((r) => r.user_id));
}

/** Returns true when row is missing (enabled by default). */
export async function isEnabled(userId: string, type: string): Promise<boolean> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("notification_prefs")
    .select("enabled")
    .eq("user_id", userId)
    .eq("type", type)
    .maybeSingle();
  return data?.enabled ?? true;
}
