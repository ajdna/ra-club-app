"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: React.ReactNode; center?: boolean };
type Role = "member" | "coach" | "nco" | "jco" | "club_owner";

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d={d} />
    </svg>
  );
}

const COACH_ITEMS: Item[] = [
  { href: "/", label: "Home", icon: <Icon d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" /> },
  { href: "/members", label: "Members", icon: <Icon d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm11 9v-1a4 4 0 0 0-3-3.8M16 4.2a3.5 3.5 0 0 1 0 6.6" /> },
  { href: "/messages", label: "Chat", center: true, icon: <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
  { href: "/alerts", label: "Alerts", icon: <Icon d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /> },
  { href: "/profile", label: "Profile", icon: <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /> },
];

const MEMBER_ITEMS: Item[] = [
  { href: "/", label: "Home", icon: <Icon d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" /> },
  { href: "/my-progress", label: "Progress", icon: <Icon d="M3 3v18h18M8 17l4-4 4 4 4-4" /> },
  { href: "/messages", label: "Chat", center: true, icon: <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
  { href: "/alerts", label: "Alerts", icon: <Icon d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /> },
  { href: "/profile", label: "Profile", icon: <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /> },
];

export function BottomNav({
  unreadAlerts = 0,
  unreadMessages = 0,
  role,
}: {
  unreadAlerts?: number;
  unreadMessages?: number;
  role?: Role;
}) {
  const pathname = usePathname();
  const ITEMS = role === "member" ? MEMBER_ITEMS : COACH_ITEMS;

  return (
    <nav className="sticky bottom-0 z-30 mx-auto flex w-full max-w-md items-stretch gap-1 border-t border-line bg-card px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 shadow-[0_-4px_20px_rgba(42,31,21,0.06)]">
      {ITEMS.map((it) => {
        const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        if (it.center) {
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.label}
              className="flex flex-1 flex-col items-center justify-center"
            >
              <span className="-mt-5 grid h-12 w-12 place-items-center rounded-full bg-terra text-white shadow-md transition hover:bg-terra-d relative">
                {it.icon}
                {unreadMessages > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </span>
            </Link>
          );
        }
        const badge =
          (it.href === "/alerts" && unreadAlerts > 0);
        const badgeCount = it.href === "/alerts" ? unreadAlerts : 0;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`relative flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${
              active ? "text-terra-d" : "text-sage-d"
            }`}
          >
            <span className="relative">
              {it.icon}
              {badge && (
                <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
