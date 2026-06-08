import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getRoleMappings } from "./actions";
import { RoleMappingsClient } from "./RoleMappingsClient";

export const dynamic = "force-dynamic";

export default async function RoleMappingsPage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (me === "unlinked" || me === "pending" || me === "rejected") redirect("/");

  if (me.role !== "club_owner") {
    return (
      <main className="px-5 py-16 text-center">
        <p className="text-ink/60">Sirf Club Owner yeh page dekh sakta hai.</p>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold text-terra-d">
          ← Home
        </Link>
      </main>
    );
  }

  const mappings = await getRoleMappings();

  return (
    <main className="px-4 pb-10 pt-5">
      <Link href="/admin" className="text-sm font-semibold text-sage-d">
        ← Admin Console
      </Link>

      <h1 className="font-display mt-3 text-2xl font-semibold text-emerald">
        Role Mappings
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        Define labels for the Excel import and control which roles get health
        tracking &amp; follow-up tasks. Changes apply instantly to the next
        import.
      </p>

      <RoleMappingsClient initial={mappings} />
    </main>
  );
}
