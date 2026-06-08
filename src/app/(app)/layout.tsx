import { BottomNav } from "@/components/BottomNav";
import { getUnreadCount } from "@/modules/notifications";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const unread = await getUnreadCount();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-cream">
      <div className="flex-1 overflow-y-auto">{children}</div>
      <BottomNav unreadAlerts={unread} />
    </div>
  );
}
