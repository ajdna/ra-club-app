import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { getUnreadCount } from "@/modules/notifications";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();

  // Not signed in → login
  if (me === null) redirect("/login");

  // Registered but waiting for approval
  if (me === "pending") redirect("/pending");

  // Registration was rejected
  if (me === "rejected") redirect("/login?error=rejected");

  // Signed in but auth_id not yet linked to a users row
  // (handled gracefully inside each page — show "almost there" message)

  const unread = await getUnreadCount();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-cream">
      <div className="flex-1 overflow-y-auto">{children}</div>
      <BottomNav unreadAlerts={unread} />
    </div>
  );
}
