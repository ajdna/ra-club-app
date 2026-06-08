import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConfigValue } from "@/modules/rules-engine";
import { getNotifications } from "@/modules/notifications";
import { AlertsFeed } from "./AlertsFeed";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (me === "unlinked") redirect("/");

  const [labels, items] = await Promise.all([
    getConfigValue<{ alerts_title?: string }>("ui_labels", {}),
    getNotifications(),
  ]);
  const title = labels.alerts_title ?? "Alerts & Updates";

  return (
    <main className="px-4 pb-6 pt-6">
      <h1 className="font-display mb-4 px-1 text-2xl font-semibold text-emerald">
        {title}
      </h1>
      <AlertsFeed items={items} />
    </main>
  );
}
