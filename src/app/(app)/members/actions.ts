"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/auth";
import { INTAKE_FIELDS } from "@/modules/members/intake";
import { generateForMember, regenerateForMember } from "@/modules/followup";
import { isFeatureEnabled } from "@/lib/flags";

type ActionResult = { ok: true } | { ok: false; error: string };

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Mark a member present in today's club (idempotent per day). */
export async function markPresent(memberId: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("attendance")
    .upsert(
      { member_id: memberId, date: todayISO(), present: true, marked_by: me.id },
      { onConflict: "member_id,date" },
    );

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
  revalidatePath("/");
  return { ok: true };
}

/** Record a weight reading and update the member's current weight. */
export async function logWeight(
  memberId: string,
  weight: number,
): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { ok: false, error: "Not signed in." };
  if (!Number.isFinite(weight) || weight <= 0 || weight > 500)
    return { ok: false, error: "Enter a valid weight (kg)." };

  const supabase = await createClient();

  // Single insert — the DB trigger `trg_sync_current_weight` automatically
  // keeps members.current_weight in sync, so no second round-trip needed.
  const { error: logErr } = await supabase
    .from("weight_logs")
    .insert({ member_id: memberId, weight, logged_by: me.id });
  if (logErr) return { ok: false, error: logErr.message };

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
  return { ok: true };
}

const VALID_MEMBERSHIP = ["basic", "elite", "privilege"] as const;
type ValidMembership = (typeof VALID_MEMBERSHIP)[number];
function isValidMembership(v: string): v is ValidMembership {
  return (VALID_MEMBERSHIP as readonly string[]).includes(v);
}

/** Add a new member under the current user (as their coach). */
export async function addMember(formData: FormData): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { ok: false, error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const membershipType = String(formData.get("membership_type") ?? "basic");
  const stage = Number(formData.get("stage") ?? 0);

  if (!name) return { ok: false, error: "Name is required." };
  if (!isValidMembership(membershipType))
    return { ok: false, error: "Invalid membership type selected." };

  const supabase = await createClient();

  // Atomic create via SECURITY DEFINER function. This avoids the RLS race where
  // a new user's closure rows (which grant visibility) aren't populated until an
  // after-insert trigger runs — a direct insert+returning would be denied.
  const { error } = await supabase.rpc("create_member", {
    p_name: name,
    p_phone: phone ?? "",
    p_membership: membershipType,
    p_stage: stage,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/members");
  revalidatePath("/");
  return { ok: true };
}

/** Advance a member to the next stage (coaches/owners only). */
export async function completeStage(memberId: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { ok: false, error: "Not signed in." };

  const STAFF = ["club_owner", "nco", "jco", "coach"];
  if (!STAFF.includes(me.role)) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("members")
    .select("stage")
    .eq("user_id", memberId)
    .maybeSingle();

  if (!member) return { ok: false, error: "Member not found." };
  if ((member.stage ?? 0) >= 6) return { ok: false, error: "Already at final stage." };

  const { error } = await supabase
    .from("members")
    .update({ stage: (member.stage ?? 0) + 1 })
    .eq("user_id", memberId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
  revalidatePath("/");
  return { ok: true };
}

const COACHING_ROLES = ["club_owner", "nco", "jco", "supervisor", "coach"] as const;

/** Save (upsert) a member's 1st-Home-Visit intake profile. */
export async function saveIntake(
  memberId: string,
  formData: FormData,
): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return { ok: false, error: "Not signed in." };
  if (!(COACHING_ROLES as readonly string[]).includes(me.role))
    return { ok: false, error: "Only coaches/supervisors may fill the intake form." };

  const supabase = await createClient();

  // Verify can_see (RLS enforces tree visibility) and grab the assigned coach.
  const { data: memberRow } = await supabase
    .from("members")
    .select("user_id, coach_id")
    .eq("user_id", memberId)
    .maybeSingle();
  if (!memberRow) return { ok: false, error: "Member not found or not in your team." };
  const coachId: string = (memberRow as { coach_id?: string | null }).coach_id ?? me.id;

  // Build the row from the shared field registry.
  const row: Record<string, unknown> = {
    member_id: memberId,
    recorded_by: me.id,
    updated_at: new Date().toISOString(),
  };
  for (const f of INTAKE_FIELDS) {
    const raw = formData.get(f.key);
    const str = raw == null ? "" : String(raw).trim();
    if (f.type === "number") {
      row[f.key] = str === "" ? null : Number(str);
    } else {
      row[f.key] = str === "" ? null : str;
    }
  }

  // Capture the previous visit_date BEFORE upserting, so a changed date is detectable.
  const { data: priorIntake } = await supabase
    .from("member_intake")
    .select("visit_date")
    .eq("member_id", memberId)
    .maybeSingle();
  const prevVisitDate = (priorIntake?.visit_date as string | null) ?? null;

  const { error } = await supabase
    .from("member_intake")
    .upsert(row as never, { onConflict: "member_id" });
  if (error) return { ok: false, error: error.message };

  // Keep the member's headline weights in sync with the intake.
  const ideal = row.ideal_weight as number | null;
  const start = row.start_weight as number | null;
  const memberUpdate: { ideal_weight?: number; current_weight?: number } = {};
  if (ideal != null) memberUpdate.ideal_weight = ideal;
  if (start != null) {
    const { data: m } = await supabase
      .from("members")
      .select("current_weight")
      .eq("user_id", memberId)
      .maybeSingle();
    if (m && m.current_weight == null) memberUpdate.current_weight = start;
  }
  if (Object.keys(memberUpdate).length) {
    await supabase.from("members").update(memberUpdate).eq("user_id", memberId);
  }

  // If followup_v2 flag is on and visit_date was provided, generate/regenerate schedule.
  const visitDateStr = row.visit_date as string | null;
  if (visitDateStr && (await isFeatureEnabled("followup_v2"))) {
    const visitDate = new Date(visitDateStr);
    if (!isNaN(visitDate.getTime())) {
      const { count: taskCount } = await createServiceClient()
        .from("follow_up_tasks")
        .select("id", { count: "exact", head: true })
        .eq("member_id", memberId);

      if ((taskCount ?? 0) === 0) {
        await generateForMember(memberId, coachId, visitDate);
      } else if (prevVisitDate !== visitDateStr) {
        await regenerateForMember(memberId, coachId, visitDate);
      }
      // visit_date unchanged and tasks exist → no-op
    }
  }

  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members/${memberId}/intake`);
  revalidatePath("/members");
  return { ok: true };
}
