import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NewGroupForm } from "./NewGroupForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewGroupPage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (typeof me === "string") redirect("/");

  // Fetch members visible to current user
  const supabase = await createClient();
  const { data: rawMembers } = await supabase
    .from("users")
    .select("id, name")
    .neq("id", me.id)
    .order("name");

  type U = { id: string; name: string };
  const members = (rawMembers as U[] | null) ?? [];

  return (
    <div className="flex h-dvh flex-col bg-cream">
      <header className="flex items-center gap-3 border-b border-line bg-card px-4 py-3 shadow-sm">
        <a href="/messages" className="text-sage-d">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </a>
        <p className="font-semibold text-ink">New Group</p>
      </header>
      <NewGroupForm members={members} />
    </div>
  );
}
