import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/flags";
import { getPrefs } from "@/modules/notifications/prefs";
import { SignOutButton } from "@/components/SignOutButton";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { ProfileEditForm } from "./ProfileEditForm";
import { NotificationsCard } from "./NotificationsCard";

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
  const [{ data: userRow }, notifPrefsEnabled, clubRemindersEnabled] = await Promise.all([
    supabase.from("users").select("name, phone, address, email").eq("id", me.id).maybeSingle(),
    isFeatureEnabled("notif_prefs"),
    isFeatureEnabled("club_reminders"),
  ]);
  const initialPrefs = notifPrefsEnabled ? await getPrefs(me.id) : [];

  return (
    <main className="px-4 pb-8 pt-5">
      <h1 className="mb-4 px-1 font-display text-[26px] font-medium tracking-tight text-ink">Profile</h1>

      {/* Identity */}
      <div className="flex items-center gap-[15px] px-1">
        <span className="grid h-[66px] w-[66px] shrink-0 place-items-center rounded-[22px] bg-terra-soft text-[24px] font-semibold text-terra">
          {initials(me.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[25px] font-medium leading-[1.05] tracking-tight text-ink">{me.name}</div>
          <div className="mt-1.5 flex items-center gap-[7px]">
            <span className="inline-flex h-[21px] items-center rounded-full bg-emerald-soft px-2.5 text-[11.5px] font-semibold text-emerald">
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

      {/* Notifications */}
      {notifPrefsEnabled && (
        <>
          <h2 className="mb-2.5 mt-6 px-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-sage-d">
            Notifications
          </h2>
          <NotificationsCard initialPrefs={initialPrefs} showClubReminders={clubRemindersEnabled} />
        </>
      )}

      {/* Appearance */}
      <div className="mt-4 rounded-[18px] border border-line bg-card p-[18px]">
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
