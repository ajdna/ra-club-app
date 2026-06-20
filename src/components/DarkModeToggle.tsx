"use client";

/* eslint-disable react-hooks/set-state-in-effect -- intentional: syncs theme from DOM on mount (SSR-safe) */

import { useEffect, useState } from "react";

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  // Sync from DOM on mount (ThemeProvider may have already applied the class)
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("ra-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("ra-theme", "light");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center justify-between rounded-2xl border border-line bg-card p-4 shadow-sm transition hover:bg-cream-2"
      aria-label={isDark ? "Light mode pe switch karo" : "Dark mode pe switch karo"}
    >
      <span className="flex items-center gap-3">
        <span className="text-xl">{isDark ? "🌙" : "☀️"}</span>
        <span className="font-semibold text-ink">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>
      </span>

      {/* Toggle pill */}
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
          isDark ? "bg-emerald" : "bg-line"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            isDark ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
