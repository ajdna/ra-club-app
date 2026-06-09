/**
 * Server-side Web Push sender.
 * Uses the web-push library + VAPID keys from env.
 */

import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export interface PushResult {
  sent: number;
  failed: number;
  removed: number;   // stale subs deleted
  errors: string[];  // human-readable error per failed sub
}

/**
 * Send a push notification to all devices registered for a user.
 * Returns a PushResult so callers know if it actually worked.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<PushResult> {
  const supabase = createServiceClient();

  const { data: subs, error: dbErr } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (dbErr) {
    console.error("[push] DB error fetching subs:", dbErr.message);
    return { sent: 0, failed: 0, removed: 0, errors: [dbErr.message] };
  }
  if (!subs?.length) {
    return { sent: 0, failed: 0, removed: 0, errors: [] };
  }

  const staleIds: string[] = [];
  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      const res = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 86400 },
      );
      console.log(`[push] sent to ${sub.endpoint.slice(-20)} — status ${res.statusCode}`);
    }),
  );

  let sent = 0;
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      sent++;
    } else {
      const err = r.reason as { statusCode?: number; body?: string; message?: string };
      const status = err.statusCode;
      const msg = `sub[${i}] status=${status} ${err.body ?? err.message ?? "unknown"}`;
      console.error("[push] failed:", msg);
      errors.push(msg);
      if (status === 404 || status === 410) {
        staleIds.push(subs[i].id);
      }
    }
  });

  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
    console.log(`[push] removed ${staleIds.length} stale subscription(s)`);
  }

  return { sent, failed: results.length - sent, removed: staleIds.length, errors };
}

/**
 * Send to multiple users at once (e.g. broadcast).
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  await Promise.allSettled(userIds.map((id) => sendPushToUser(id, payload)));
}
