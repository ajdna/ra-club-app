import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserCard } from "./UserCard";

export const dynamic = "force-dynamic";

const ROLE_ORDER = [
  "club_owner", "nco", "jco", "coach", "member", "privilege", "guest",
];

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me || me === "unlinked" || me === "pending" || me === "rejected")
    redirect("/login");
  if (me.role !== "club_owner") redirect("/");

  const supabase = await createClient();

  // Load all users + their members row (for membership/stage)
  const [usersRes, membersRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, phone, role, status, parent_id, created_at, address")
      .order("created_at", { ascending: false }),
    supabase
      .from("members")
      .select("user_id, membership_type, stage"),
  ]);

  const users = usersRes.data ?? [];
  const memberMap = new Map(
    (membersRes.data ?? []).map((m) => [m.user_id, m]),
  );
  const nameById = new Map(users.map((u) => [u.id, u.name as string]));

  // Group by status
  const pending = users.filter((u) => u.status === "pending");
  const active = users
    .filter((u) => u.status === "active")
    .sort(
      (a, b) =>
        ROLE_ORDER.indexOf(a.role as string) -
        ROLE_ORDER.indexOf(b.role as string),
    );
  const inactive = users.filter(
    (u) => u.status === "inactive" || u.status === "rejected",
  );

  return (
    <main className="px-4 pb-8 pt-5">
      <Link href="/admin" className="text-sm font-semibold text-sage-d">
        ← Admin Console
      </Link>

      <h1 className="font-display mt-3 text-2xl font-semibold text-emerald">
        User Management
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        Approve registrations · change roles · edit details
      </p>

      {/* ── Pending ── */}
      {pending.length > 0 && (
        <>
          <SectionHeader>
            ⏳ Pending approval ({pending.length})
          </SectionHeader>
          <div className="space-y-3">
            {pending.map((u) => (
              <UserCard
                key={u.id}
                user={u as Parameters<typeof UserCard>[0]["user"]}
                member={memberMap.get(u.id)}
                nameById={nameById}
                allUsers={users as Parameters<typeof UserCard>[0]["allUsers"]}
                isPending
              />
            ))}
          </div>
        </>
      )}

      {/* ── Active ── */}
      <SectionHeader>✅ Active members & team ({active.length})</SectionHeader>
      <div className="space-y-3">
        {active.map((u) => (
          <UserCard
            key={u.id}
            user={u as Parameters<typeof UserCard>[0]["user"]}
            member={memberMap.get(u.id)}
            nameById={nameById}
            allUsers={users as Parameters<typeof UserCard>[0]["allUsers"]}
          />
        ))}
      </div>

      {/* ── Inactive / Rejected ── */}
      {inactive.length > 0 && (
        <>
          <SectionHeader>
            🚫 Inactive / Rejected ({inactive.length})
          </SectionHeader>
          <div className="space-y-3">
            {inactive.map((u) => (
              <UserCard
                key={u.id}
                user={u as Parameters<typeof UserCard>[0]["user"]}
                member={memberMap.get(u.id)}
                nameById={nameById}
                allUsers={users as Parameters<typeof UserCard>[0]["allUsers"]}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display mb-3 mt-7 px-1 text-sm font-semibold uppercase tracking-[0.08em] text-sage-d">
      {children}
    </h2>
  );
}
