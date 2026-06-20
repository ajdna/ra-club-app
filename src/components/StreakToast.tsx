"use client";

import { useEffect, useState } from "react";

const MILESTONES = [3, 7, 14, 30, 60, 90];

export function StreakToast({ streak }: { streak: number }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!MILESTONES.includes(streak)) return;

    // Only show once per milestone (track in localStorage)
    const key = `ra-streak-toast-${streak}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");

    const msgs: Record<number, string> = {
      3:  "3-day streak! 🔥 Acha start hai!",
      7:  "7-day streak! 🔥 Ek hafta! Kamal kar diya!",
      14: "14-day streak! 🔥 Do hafte! Bahut badhiya!",
      30: "30-day streak! 🔥 Pura mahina! Incredible!",
      60: "60-day streak! 🔥 Do mahine! You're unstoppable!",
      90: "90-day streak! 🏆 Teen mahine! Champion!",
    };
    setMessage(msgs[streak] ?? "");
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [streak]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 animate-bounce">
      <div className="rounded-2xl bg-emerald px-5 py-3 shadow-lg">
        <p className="text-center text-sm font-semibold text-white">{message}</p>
      </div>
    </div>
  );
}
