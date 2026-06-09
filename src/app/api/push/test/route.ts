/**
 * GET /api/push/test
 * Diagnostic — checks setup and sends a real test push to the signed-in user.
 * Returns full error detail so we can see exactly what went wrong.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUser } from "@/lib/push.server";

export async function GET() {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const checks: Record<string, string> = {};

  checks.VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "✅ set" : "❌ missing";
  checks.VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY            ? "✅ set" : "❌ missing";
  checks.VAPID_EMAIL       = process.env.VAPID_EMAIL                   ? "✅ set" : "❌ missing";
  checks.SERVICE_ROLE_KEY  =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-service-role-key-here"
      ? "✅ set"
      : "❌ missing or placeholder";
  checks.WEBHOOK_SECRET = process.env.PUSH_WEBHOOK_SECRET ? "✅ set" : "❌ missing";

  // Count subscriptions
  let subCount = 0;
  let subEndpointPreview = "";
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint")
      .eq("user_id", me.id);

    if (error) {
      checks.subscriptions = `❌ DB error: ${error.message}`;
    } else {
      subCount = data?.length ?? 0;
      if (subCount > 0) {
        // Show last 30 chars of endpoint so we can identify the browser
        subEndpointPreview = data![0].endpoint.slice(-30);
        checks.subscriptions = `✅ ${subCount} device(s) registered (endpoint: ...${subEndpointPreview})`;
      } else {
        checks.subscriptions =
          "❌ 0 subscriptions — open the app and click Allow on the green notification banner";
      }
    }
  } catch (e) {
    checks.subscriptions = `❌ exception: ${String(e)}`;
  }

  // Attempt a real push and report the full result
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pushResult: Record<string, any> = { skipped: "no subscriptions" };
  if (subCount > 0) {
    try {
      const result = await sendPushToUser(me.id, {
        title: "🔔 RA Club Test",
        body: "Push notifications working! Tap to open.",
        url: "/",
        tag: "push-test",
      });
      pushResult = result;
    } catch (e) {
      pushResult = { exception: String(e) };
    }
  }

  return NextResponse.json({
    user: { id: me.id, name: me.name, role: me.role },
    checks,
    pushResult,
    hint:
      pushResult.sent === 0 && subCount > 0
        ? "Push sent but failed — check errors[] above. Common cause: VAPID key mismatch. Delete the subscription from DB and re-subscribe."
        : undefined,
  });
}
