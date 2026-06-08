/**
 * Server-side Web Push sender.
 * Uses the web-push library + VAPID keys from env.
 * Call sendPushToUser() from API routes or server actions.
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
  url: string;      // deep-link path, e.g. /messages/abc or /followup
  tag?: string;     // collapses duplicate notifications (same tag = replace)
}

/**
 * Send a push notification to all devices registered for a user.
 * Silently removes expired/invalid subscriptions.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return;

  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 86400 },  // message survives up to 24 h if device is offline
        );
      } catch (err: unknown) {
        // 404 or 410 = subscription expired / user unsubscribed
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) staleIds.push(sub.id);
      }
    }),
  );

  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }
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
