/**
 * Unified notifier — writes an in-app notification row (bell / alerts feed) AND
 * sends a Web Push to every device the user has registered. Both are
 * best-effort: a failure in one never blocks the caller's main flow.
 *
 * Push delivery covers desktop browsers and installed PWAs (Android + iOS 16.4+).
 * Messages and broadcasts are already pushed by the `push-notify` DB trigger on
 * chat_messages, so they do not go through here (avoids double-notifying).
 */
import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToUser } from "@/lib/push.server";
import { isEnabled } from "@/modules/notifications/prefs";

type NotifyOpts = {
  userId: string;
  type: string;
  title: string;
  body: string;
  url?: string;
};

export async function notify({ userId, type, title, body, url = "/" }: NotifyOpts): Promise<void> {
  const sb = createServiceClient();
  // In-app feed row (cast: enum value is valid at runtime after the migration,
  // even if generated types haven't been regenerated yet).
  try {
    await sb.from("notifications").insert({ user_id: userId, type: type as "info", title, body });
  } catch {
    /* best-effort */
  }
  // Web push to all registered devices (skipped if user disabled this type).
  try {
    if (await isEnabled(userId, type)) {
      await sendPushToUser(userId, { title, body, url });
    }
  } catch {
    /* best-effort */
  }
}

/** Tell the club owner(s) a new registration is waiting for approval. */
export async function notifyApprovalRequest(memberName: string): Promise<void> {
  try {
    const sb = createServiceClient();
    const { data: owners } = await sb
      .from("users")
      .select("id")
      .eq("role", "club_owner")
      .eq("status", "active");
    await Promise.all(
      (owners ?? []).map((o) =>
        notify({
          userId: o.id,
          type: "approval_request",
          title: "Naya registration ⏳",
          body: `${memberName} ne registration kiya hai — approve karein.`,
          url: "/admin/users",
        }),
      ),
    );
  } catch {
    /* best-effort */
  }
}

/** Tell a freshly-approved member's direct upline that someone joined their team. */
export async function notifyNewDownlineMember(memberId: string): Promise<void> {
  try {
    const sb = createServiceClient();
    const { data: m } = await sb
      .from("users")
      .select("name, parent_id")
      .eq("id", memberId)
      .maybeSingle();
    if (!m?.parent_id) return;
    await notify({
      userId: m.parent_id,
      type: "new_downline_member",
      title: "Nayi team member 🎉",
      body: `${m.name} aapki downline mein add ho gaye hain.`,
      url: `/members/${memberId}`,
    });
  } catch {
    /* best-effort */
  }
}
