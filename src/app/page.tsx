import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

const ROLE_LABEL: Record<string, string> = {
  upline: "Upline (read-only)",
  club_owner: "Club Owner",
  nco: "NCO — Senior Club Operator",
  jco: "JCO — Junior Club Operator",
  coach: "Coach",
  member: "Member",
  privilege: "Privilege Member",
  guest: "Guest",
};

export default async function Home() {
  const me = await getCurrentUser();

  // Not signed in (the proxy normally redirects first; this is a safety net).
  if (me === null) redirect("/login");

  // Signed in but no matching users row yet — guide the linking step.
  if (me === "unlinked") {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="font-display text-3xl font-semibold text-emerald">
          Almost there
        </h1>
        <p className="mt-3 text-ink/70">
          You&apos;re signed in, but this login isn&apos;t linked to a club
          account yet. In Supabase, set a <code>users.auth_id</code> to your auth
          user id (see the run notes), then refresh.
        </p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </main>
    );
  }

  // `me` is a CurrentUser here (proxy redirects null to /login).
  const supabase = await createClient();

  // RLS makes these queries return only what `me` is allowed to see.
  const [{ data: visibleUsers }, { data: visibleMembers }] = await Promise.all([
    supabase.from("users").select("id, name, role").order("role"),
    supabase
      .from("members")
      .select("user_id, membership_type, stage, current_weight"),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-sage-d">
            GUMS Club Manager
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold text-emerald">
            Namaste, {me!.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            {ROLE_LABEL[me!.role] ?? me!.role}
          </p>
        </div>
        <SignOutButton />
      </header>

      <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.08em] text-sage-d">
          People you can see ({visibleUsers?.length ?? 0})
        </h2>
        <p className="mt-1 text-xs text-ink/50">
          Enforced server-side by Row Level Security + the hierarchy closure
          table. Sideline branches are hidden automatically.
        </p>
        <ul className="mt-3 divide-y divide-line">
          {visibleUsers?.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span className="text-ink">{u.name}</span>
              <span className="text-sage-d">
                {ROLE_LABEL[u.role] ?? u.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.08em] text-sage-d">
          Members in your tree ({visibleMembers?.length ?? 0})
        </h2>
        <ul className="mt-3 divide-y divide-line">
          {visibleMembers?.length ? (
            visibleMembers.map((m) => {
              const u = visibleUsers?.find((x) => x.id === m.user_id);
              return (
                <li
                  key={m.user_id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-ink">{u?.name ?? m.user_id}</span>
                  <span className="text-sage-d capitalize">
                    {m.membership_type} · stage {m.stage}
                    {m.current_weight ? ` · ${m.current_weight}kg` : ""}
                  </span>
                </li>
              );
            })
          ) : (
            <li className="py-2 text-sm text-ink/50">
              No members visible to your role.
            </li>
          )}
        </ul>
      </section>

      <footer className="mt-8 text-sm text-ink/50">
        Next: the Morning Command Center on real data (Build Guide Step 4).
      </footer>
    </main>
  );
}
