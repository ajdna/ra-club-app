import { createClient } from "@/lib/supabase/server";

/**
 * Rules Engine — typed reads over the `rule_config` table. Everything
 * configurable in the app (pricing, labels, scoring, cadences, notification
 * templates) is stored here and read at request time, so Admin Console edits
 * take effect with no deploy. Writes live in ./actions.ts (Club-Owner only).
 */

export async function getConfigValue<T = unknown>(
  key: string,
  fallback: T,
): Promise<T> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rule_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value as T) ?? fallback;
}

/** Fetch several config keys at once → a plain object keyed by config key. */
export async function getConfigMap(
  keys: string[],
): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rule_config")
    .select("key, value")
    .in("key", keys);
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.key as string] = row.value;
  return map;
}
