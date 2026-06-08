import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

// Profile data (name + role) is stable — cache for 5 minutes.
export const revalidate = 300;

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
        <h1 className="font-display text-2xl font-semibold text-emerald">
          Profile
        </h1>
        <p className="mt-3 text-ink/60">Account not linked yet.</p>
        <div className="mt-6 flex justify-center">
          <SignOutButton />
        </div>
      </main>
    );
  }

  return (
    <main className="px-5 py-10">
      <h1 className="font-display text-2xl font-semibold text-emerald">Profile</h1>

      <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-terra text-lg font-semibold text-white">
            {me.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <div>
            <div className="font-display text-lg font-semibold text-ink">
              {me.name}
            </div>
            <div className="text-sm text-sage-d">
              {ROLE_LABEL[me.role] ?? me.role}
            </div>
          </div>
        </div>
      </div>

      {me.role === "club_owner" && (
        <Link
          href="/admin"
          className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-card p-4 shadow-sm transition hover:bg-cream-2"
        >
          <span className="font-semibold text-ink">⚙️ Admin Console</span>
          <span className="text-sage-d">Rules Engine →</span>
        </Link>
      )}

      <div className="mt-6">
        <SignOutButton />
      </div>
    </main>
  );
}
