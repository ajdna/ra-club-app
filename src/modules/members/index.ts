import { createClient } from "@/lib/supabase/server";
import type { IntakeRecord } from "./intake";

/**
 * members module — reads. The member lifecycle (6-stage journey, GUMS tiers),
 * plus the 1st-Home-Visit intake profile. Mutations live in the route's
 * actions.ts; intake field definitions in ./intake.ts.
 */

export async function getIntake(memberId: string): Promise<IntakeRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("member_intake")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();
  return (data as IntakeRecord) ?? null;
}
