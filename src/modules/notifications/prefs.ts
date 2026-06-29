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
