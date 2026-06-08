import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getIntake } from "@/modules/members";
import { IntakeForm } from "./IntakeForm";

export const dynamic = "force-dynamic";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (me === "unlinked") redirect("/");

  const supabase = await createClient();
  const { data: user } = await supabase
    .from("users")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  if (!user) notFound();

  const intake = await getIntake(id);

  return (
    <main className="px-4 pb-8 pt-5">
      <Link href={`/members/${id}`} className="text-sm font-semibold text-sage-d">
        ← {user.name}
      </Link>
      <h1 className="font-display mt-3 text-2xl font-semibold text-emerald">
        1st Home Visit
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        {user.name} ki intake details — yeh progress tracking ka baseline hai.
      </p>

      <IntakeForm memberId={id} initial={intake ?? {}} />
    </main>
  );
}
