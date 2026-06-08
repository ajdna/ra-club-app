import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getConfigMap } from "@/modules/rules-engine";
import { SECTIONS } from "@/modules/rules-engine/registry";
import { AdminConsole } from "./AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (me === "unlinked" || me === "pending" || me === "rejected") redirect("/");

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

  // Pending registration count (shown as urgent alert)
  const supabase = await createClient();
  const { count: pendingCount } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const values = await getConfigMap(SECTIONS.map((s) => s.key));

  return (
    <main className="px-4 pb-8 pt-5">
      <Link href="/profile" className="text-sm font-semibold text-sage-d">
        ← Profile
      </Link>
      <h1 className="font-display mt-3 text-2xl font-semibold text-emerald">
        Admin Console
      </h1>

      {/* Pending approvals alert */}
      {(pendingCount ?? 0) > 0 && (
        <Link
          href="/admin/users"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 shadow-sm transition hover:bg-warn/15"
        >
          <span className="text-2xl">⏳</span>
          <div className="flex-1">
            <div className="font-semibold text-ink">
              {pendingCount} pending registration{pendingCount === 1 ? "" : "s"}
            </div>
            <div className="text-sm text-ink/60">
              Approve karne ke liye User Management kholo →
            </div>
          </div>
        </Link>
      )}

      {/* User management link */}
      <Link
        href="/admin/users"
        className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-sm transition hover:bg-cream-2"
      >
        <span className="text-2xl">👥</span>
        <div className="flex-1">
          <div className="font-semibold text-ink">User Management</div>
          <div className="text-sm text-ink/60">
            Roles, membership, upline, soft-delete →
          </div>
        </div>
      </Link>

      {/* Import members */}
      <Link
        href="/admin/import"
        className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-sm transition hover:bg-cream-2"
      >
        <span className="text-2xl">📥</span>
        <div className="flex-1">
          <div className="font-semibold text-ink">Import Members (Excel)</div>
          <div className="text-sm text-ink/60">
            Excel se bulk upload · follow-up tasks auto-generate →
          </div>
        </div>
      </Link>

      {/* Role Mappings */}
      <Link
        href="/admin/roles"
        className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-sm transition hover:bg-cream-2"
      >
        <span className="text-2xl">🏷️</span>
        <div className="flex-1">
          <div className="font-semibold text-ink">Role Mappings</div>
          <div className="text-sm text-ink/60">
            Custom role labels · system role · follow-up tasks toggle →
          </div>
        </div>
      </Link>

      {/* Rules engine */}
      <h2 className="font-display mt-8 text-lg font-semibold text-emerald">
        Rules Engine
      </h2>
      <p className="mt-1 text-sm text-ink/60">
        Change pricing, labels, notifications & workflows. Saves apply
        instantly, no deploy.
      </p>
      <AdminConsole sections={SECTIONS} values={values} />
    </main>
  );
}
