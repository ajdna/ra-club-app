import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BroadcastClient } from "./BroadcastClient";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") redirect("/login");
  if (me.role === "member") redirect("/messages");

  return <BroadcastClient />;
}
