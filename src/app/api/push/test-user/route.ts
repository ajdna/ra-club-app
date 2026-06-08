/**
 * GET /api/push/test-user?user_id=<uuid>
 * Sends a test push notification to a specific user.
 * Club owner / NCO only.
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push.server";

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["club_owner", "nco"].includes(me.role)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  try {
    await sendPushToUser(userId, {
      title: "🔔 RA Club Test",
      body: `Test notification from ${me.name}`,
      url: "/",
      tag: "push-test",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
