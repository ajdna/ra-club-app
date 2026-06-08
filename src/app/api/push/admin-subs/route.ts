/**
 * GET /api/push/admin-subs
 * Returns all users with their push subscription counts.
 * Club owner / NCO only.
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["club_owner", "nco"].includes(me.role)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const supabase = createServiceClient();

  const [{ data: users }, { data: subs }] = await Promise.all([
    supabase.from("users").select("id, name, role").eq("status", "active").order("name"),
    supabase.from("push_subscriptions").select("user_id"),
  ]);

  const countByUser = new Map<string, number>();
  for (const s of subs ?? []) {
    countByUser.set(s.user_id, (countByUser.get(s.user_id) ?? 0) + 1);
  }

  const result = (users ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    deviceCount: countByUser.get(u.id) ?? 0,
  }));

  return NextResponse.json({ users: result });
}
