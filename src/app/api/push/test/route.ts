/**
 * GET /api/push/test
 *
 * Diagnostic endpoint — checks the push setup and sends a test notification
 * to the currently signed-in user's registered devices.
 * Only accessible when signed in.
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

  // Check env vars
  checks.VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "✅ set" : "❌ missing";
  checks.VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY             ? "✅ set" : "❌ missing";
  checks.VAPID_EMAIL       = process.env.VAPID_EMAIL                    ? "✅ set" : "❌ missing";
  checks.SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-service-role-key-here"
    ? "✅ set"
    : "❌ missing or placeholder";
  checks.WEBHOOK_SECRET    = process.env.PUSH_WEBHOOK_SECRET ? "✅ set" : "❌ missing";

  // Count subscriptions for this user
  let subCount = 0;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", me.id);

    if (error) {
      checks.subscriptions = `❌ DB error: ${error.message}`;
    } else {
      subCount = data?.length ?? 0;
      checks.subscriptions = subCount > 0
        ? `✅ ${subCount} device(s) registered`
        : "❌ 0 subscriptions — open the app and click Allow on the notification banner";
    }
  } catch (e) {
    checks.subscriptions = `❌ exception: ${String(e)}`;
  }

  // Send a test push if everything looks OK
  let testResult = "skipped";
  const allGood = Object.values(checks).every((v) => v.startsWith("✅"));
  if (allGood && subCount > 0) {
    try {
      await sendPushToUser(me.id, {
        title: "🔔 RA Club Test",
        body: "Push notifications are working! Tap to open the app.",
        url: "/",
        tag: "push-test",
      });
      testResult = "✅ test push sent";
    } catch (e) {
      testResult = `❌ send failed: ${String(e)}`;
    }
  }

  return NextResponse.json({
    user: { id: me.id, name: me.name, role: me.role },
    checks,
    testPush: testResult,
    instructions: subCount === 0
      ? "Open the app in your browser → you should see a green 'Enable notifications' banner → click Allow"
      : undefined,
  });
}
