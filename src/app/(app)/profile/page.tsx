import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
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

export default async function ProfilePage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (me === "unlinked") {
    return (
      <main className="px-5 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-emerald">Profile</h1>
        <p className="mt-3 text-ink/60">Account not linked yet.</p>
        <div className="mt-6 flex justify-center"><SignOutButton /></div>
      </main>
    );
  }
  if (me === "pending" || me === "rejected") redirect("/pending");

  // Fetch full user row for editable fields
  const supabase = await createClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("name, phone, address, email")
    .eq("id", me.id)
    .maybeSingle();

  return (
    <main className="px-5 py-10 pb-8">
      <h1 className="font-display text-2xl font-semibold text-emerald">Profile</h1>

      {/* Identity card */}
      <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-terra text-lg font-semibold text-white">
            {me.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </span>
          <div>
            <div className="font-display text-lg font-semibold text-ink">{me.name}</div>
            <div className="text-sm text-sage-d">{ROLE_LABEL[me.role] ?? me.role}</div>
          </div>
        </div>
      </div>

      {/* Editable personal details */}
      <h2 className="font-display mt-7 mb-3 text-base font-semibold text-emerald">
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
          className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-card p-4 shadow-sm transition hover:bg-cream-2"
        >
          <span className="font-semibold text-ink">⚙️ Admin Console</span>
          <span className="text-sage-d">Rules Engine + Users →</span>
        </Link>
      )}

      <div className="mt-6">
        <SignOutButton />
      </div>
    </main>
  );
}
