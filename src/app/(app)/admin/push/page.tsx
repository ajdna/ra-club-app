import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminPushClient } from "./AdminPushClient";

export const dynamic = "force-dynamic";

export default async function AdminPushPage() {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") redirect("/login");
  if (me.role !== "club_owner") redirect("/admin");

  return <AdminPushClient />;
}
