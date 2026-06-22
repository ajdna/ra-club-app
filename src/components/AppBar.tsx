"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Shared top app bar shown on every (app) screen.
 * Left: logo-icon.png brand mark + wordmark. Right: compact theme toggle.
 * logo-home.png is reserved for the login screen only.
 */
export function AppBar() {
  const [isDark, setIsDark] = useState(false);

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

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-cream/85 px-4 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-icon.png"
          alt="Ruby Nutrition Center"
          width={36}
          height={36}
          className="h-9 w-9 object-contain"
        />
        <span className="font-display text-[16px] font-medium tracking-tight text-ink">
          Ruby Nutrition Center
        </span>
      </Link>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Light mode pe switch karo" : "Dark mode pe switch karo"}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink-2 transition hover:bg-cream-2"
      >
        {isDark ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        )}
      </button>
    </header>
  );
}
