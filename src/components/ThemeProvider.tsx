"use client";

import { useEffect } from "react";

/**
 * Reads the user's saved theme from localStorage on mount and applies
 * the `.dark` class to <html> so CSS variables flip immediately.
 * Must be rendered early in the tree (inside RootLayout body).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("ra-theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return <>{children}</>;
}
