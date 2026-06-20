import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { ProfileEditForm } from "./ProfileEditForm";

export const dynamic = "force-dynamic";

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

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function ProfilePage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (me === "unlinked") {
    return (
      <main className="px-5 py-16 text-center">
        <h1 className="font-display text-2xl font-medium text-ink">Profile</h1>
        <p className="mt-3 text-ink-2">Account not linked yet.</p>
        <div className="mt-6 flex justify-center"><SignOutButton /></div>
      </main>
    );
  }
  if (me === "pending" || me === "rejected") redirect("/pending");

  const supabase = await createClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("name, phone, address, email")
    .eq("id", me.id)
    .maybeSingle();

  return (
    <main className="px-4 pb-8 pt-5">
      <h1 className="mb-4 px-1 font-display text-[26px] font-medium tracking-tight text-ink">Profile</h1>

      {/* Identity card */}
      <div className="rounded-[18px] border border-line bg-card p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald text-xl font-semibold text-white">
            {initials(me.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate font-display text-[20px] font-medium text-ink">{me.name}</div>
            <span className="mt-1 inline-flex items-center rounded-full bg-emerald-soft px-2.5 py-0.5 text-[12px] font-semibold text-emerald">
              {ROLE_LABEL[me.role] ?? me.role}
            </span>
          </div>
        </div>
      </div>

      {/* Editable personal details */}
      <h2 className="mb-2.5 mt-6 px-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-sage-d">
        Personal details
      </h2>
      <ProfileEditForm
        userId={me.id}
        initial={{
          name: userRow?.name ?? me.name,
          phone: userRow?.phone ?? "",
          address: userRow?.address ?? "",
          email: userRow?.email ?? "",
        }}
      />

      {/* Admin console shortcut */}
      {me.role === "club_owner" && (
        <Link
          href="/admin"
          className="mt-4 flex items-center justify-between rounded-[16px] border border-line bg-card p-4 transition hover:border-emerald/40"
        >
          <span className="font-semibold text-ink">Admin Console</span>
          <span className="flex items-center gap-1 text-[13px] font-semibold text-emerald">
            Rules &amp; Users
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </span>
        </Link>
      )}

      {/* Appearance */}
      <div className="mt-4 rounded-[16px] border border-line bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-ink">Appearance</div>
            <div className="text-[13px] text-ink-2">Light / Dark mode</div>
          </div>
          <DarkModeToggle />
        </div>
      </div>

      {/* Sign out */}
      <div className="mt-6">
        <SignOutButton />
      </div>
    </main>
  );
}
