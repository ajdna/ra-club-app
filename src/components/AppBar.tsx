"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Coach = { name: string; role: string; phone: string | null };

const ROLE_LABEL: Record<string, string> = {
  club_owner: "Club Owner",
  nco: "NCO",
  jco: "JCO",
  coach: "Coach",
  supervisor: "Supervisor",
  member: "Member",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

/**
 * Shared top app bar shown on every (app) screen.
 * Left: logo-icon.png brand mark + wordmark. Right: theme toggle + account menu.
 */
export function AppBar({ coaches = [] }: { coaches?: Coach[] }) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    const root = document.documentElement;
    if (next) {
      root.classList.add("dark");
      root.classList.remove("light");
      localStorage.setItem("ra-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      localStorage.setItem("ra-theme", "light");
    }
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const item =
    "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[14px] font-medium transition hover:bg-cream-2";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-cream/85 px-4 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="Ruby Nutrition Center" width={36} height={36} className="h-9 w-9 object-contain" />
          <span className="font-display text-[16px] font-medium tracking-tight text-ink">Ruby Nutrition Center</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Light mode pe switch karo" : "Dark mode pe switch karo"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink-2 transition hover:bg-cream-2"
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            )}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((o) => !o)}
              aria-label="Account menu"
              aria-expanded={menu}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink-2 transition hover:bg-cream-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
            </button>

            {menu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} aria-hidden="true" />
                <div className="absolute right-0 top-11 z-50 w-52 rounded-[14px] border border-line bg-card p-1.5 shadow-[0_14px_30px_var(--emerald-soft)]">
                  <Link href="/profile" onClick={() => setMenu(false)} className={`${item} text-ink`}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
                    Profile
                  </Link>
                  <button type="button" onClick={() => { setMenu(false); setHelp(true); }} className={`${item} text-ink`}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3" /><circle cx="12" cy="16.5" r="0.6" fill="currentColor" /></svg>
                    Help
                  </button>
                  <button type="button" onClick={logout} className={`${item} text-bad`}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {help && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setHelp(false)}>
          <div className="w-full max-w-sm rounded-[18px] border border-line bg-card p-5 shadow-[0_14px_30px_var(--emerald-soft)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-[20px] font-medium text-ink">Help &amp; support</h2>
              <button type="button" onClick={() => setHelp(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition hover:bg-cream-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
              Kisi bhi madad ke liye apne coach se sampark karein:
            </p>

            {coaches.length === 0 ? (
              <p className="rounded-[14px] bg-cream-2 px-4 py-3 text-[13.5px] text-ink-2">
                Abhi koi coach assigned nahi hai. Club office se sampark karein.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {coaches.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-[14px] border border-line bg-cream-2 p-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-soft text-[13px] font-semibold text-emerald">
                      {initials(c.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-ink">{c.name}</div>
                      <div className="text-[12px] font-medium text-ink-2">{ROLE_LABEL[c.role] ?? c.role}</div>
                    </div>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 rounded-full bg-emerald px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-emerald-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9Z" /></svg>
                        Call
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button type="button" onClick={() => setHelp(false)} className="mt-4 w-full rounded-full bg-emerald py-3 text-[15px] font-semibold text-white transition hover:bg-emerald-2">
              Theek hai
            </button>
          </div>
        </div>
      )}
    </>
  );
}
