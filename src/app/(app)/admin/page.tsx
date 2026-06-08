import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getConfigMap } from "@/modules/rules-engine";
import { SECTIONS } from "@/modules/rules-engine/registry";
import { AdminConsole } from "./AdminConsole";

// Admin config rarely changes — cache for 5 minutes, revalidated on setConfig().
export const revalidate = 300;

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (me === "unlinked") redirect("/");

  if (me.role !== "club_owner") {
    return (
      <main className="px-5 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-emerald">
          Admin Console
        </h1>
        <p className="mt-3 text-ink/60">
          Sirf Club Owner yeh settings change kar sakta hai.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl border border-line bg-card px-4 py-2 text-sm font-semibold text-terra-d"
        >
          ← Home
        </Link>
      </main>
    );
  }

  const values = await getConfigMap(SECTIONS.map((s) => s.key));

  return (
    <main className="px-4 pb-8 pt-5">
      <Link href="/profile" className="text-sm font-semibold text-sage-d">
        ← Profile
      </Link>
      <h1 className="font-display mt-3 text-2xl font-semibold text-emerald">
        Admin Console
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        Rules Engine — change pricing, labels, notifications & workflows. Saves
        apply instantly across the app, no deploy.
      </p>
      <AdminConsole sections={SECTIONS} values={values} />
    </main>
  );
}
