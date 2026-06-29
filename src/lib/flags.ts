import { createServiceClient } from "@/lib/supabase/service";

/**
 * Feature flags — the no-redeploy kill switch from the execution plan.
 *
 * Each new feature ships gated behind a `rule_config` key named `ff_<feature>`
 * (boolean, default OFF). Flip it in the Admin Console to enable/disable for
 * everyone instantly — no deploy, no code change.
 *
 * Reads via the SERVICE client on purpose: flags are also checked in cron /
 * webhook / no-auth contexts, and rule_config's RLS select policy is
 * `auth.uid() IS NOT NULL` — so an anon read returns nothing and the flag would
 * silently fall back to false. Flags aren't sensitive, so a service read is safe.
 *
 * Usage (server component / action / cron):
 *   if (await isFeatureEnabled("notif_prefs")) { ...new path... }
 */
export async function isFeatureEnabled(feature: string, fallback = false): Promise<boolean> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("rule_config")
    .select("value")
    .eq("key", `ff_${feature}`)
    .maybeSingle();
  return (data?.value as boolean) ?? fallback;
}
