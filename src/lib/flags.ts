import { getConfigValue } from "@/modules/rules-engine";

/**
 * Feature flags — the no-redeploy kill switch from the execution plan.
 *
 * Each new feature ships gated behind a `rule_config` key named `ff_<feature>`
 * (boolean, default OFF). Flip it in the Admin Console to enable/disable for
 * everyone instantly — no deploy, no code change. If a feature misbehaves in
 * the field trial, turn its flag off.
 *
 * Usage (server component / action):
 *   if (await isFeatureEnabled("health_score_v2")) { ...new path... }
 */
export async function isFeatureEnabled(feature: string, fallback = false): Promise<boolean> {
  return await getConfigValue<boolean>(`ff_${feature}`, fallback);
}
