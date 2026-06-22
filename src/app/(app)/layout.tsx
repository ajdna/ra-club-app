import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { AppBar } from "@/components/AppBar";
import { PushPermission } from "@/components/PushPermission";
import { PushNavigator } from "@/components/PushNavigator";
import { InactivityTimer } from "@/components/InactivityTimer";
import { getUnreadCount } from "@/modules/notifications";
import { getConfigValue } from "@/modules/rules-engine";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();

  // Not signed in -> login
  if (me === null) redirect("/login");

  // Registered but waiting for approval
  if (me === "pending") redirect("/pending");

  // Registration was rejected
  if (me === "rejected") redirect("/login?error=rejected");

  // Signed in but auth_id not yet linked to a users row
  // (handled gracefully inside each page -- show "almost there" message)

  const supabase = await createClient();
  const [unread, msgResult, timers, usersRes] = await Promise.all([
    getUnreadCount(),
    supabase.rpc("unread_message_count"),
    getConfigValue<{ inactivity_logout_minutes?: number; inactivity_warn_minutes?: number }>(
      "session_timers",
      { inactivity_logout_minutes: 90, inactivity_warn_minutes: 2 },
    ),
    supabase.from("users").select("id, name, role, parent_id, phone"),
  ]);
  const unreadMessages = (msgResult.data as number) ?? 0;
  const timeoutMinutes = timers.inactivity_logout_minutes ?? 90;
  const warnMinutes    = timers.inactivity_warn_minutes    ?? 2;

  // Upline coach chain (me -> ... -> club owner) for the Help menu.
  type UplineUser = { id: string; name: string; role: string; parent_id: string | null; phone: string | null };
  const byId = new Map(((usersRes.data as UplineUser[] | null) ?? []).map((u) => [u.id, u]));
  const upline: { name: string; role: string; phone: string | null }[] = [];
  let cursor = typeof me === "object" && me !== null ? me.parentId : null;
  let guard = 0;
  while (cursor && guard < 12) {
    const u = byId.get(cursor);
    if (!u) break;
    upline.push({ name: u.name, role: u.role, phone: u.phone });
    cursor = u.parent_id;
    guard++;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-cream">
      <InactivityTimer timeoutMinutes={timeoutMinutes} warnMinutes={warnMinutes} />
      <PushPermission />
      <PushNavigator />
      <AppBar coaches={upline} />
      <div className="flex-1 overflow-y-auto">{children}</div>
      <BottomNav
        unreadAlerts={unread}
        unreadMessages={unreadMessages}
      />
    </div>
  );
}
