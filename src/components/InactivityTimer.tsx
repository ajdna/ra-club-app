"use client";

/**
 * InactivityTimer
 *
 * Watches for user activity (mouse, keyboard, touch, scroll).
 * If the user is idle for `timeoutMinutes`, they are signed out automatically.
 * A warning banner appears `warnMinutes` before the logout.
 *
 * Props come from layout.tsx, which reads them from rule_config at render time.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  timeoutMinutes: number; // auto-logout after this many idle minutes
  warnMinutes: number;    // show warning banner this many minutes before logout
}

export function InactivityTimer({ timeoutMinutes, warnMinutes }: Props) {
  const router = useRouter();
  const lastActivityRef = useRef<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warnMs    = warnMinutes    * 60 * 1000;

  // Reset the activity timestamp whenever the user interacts
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login?reason=inactivity");
  }, [router]);

  // Register activity listeners
  useEffect(() => {
    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;
    EVENTS.forEach((evt) => window.addEventListener(evt, resetActivity, { passive: true }));
    return () => EVENTS.forEach((evt) => window.removeEventListener(evt, resetActivity));
  }, [resetActivity]);

  // Polling tick — checks every 10 seconds
  useEffect(() => {
    if (timeoutMinutes <= 0) return; // disabled

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      const remaining = timeoutMs - idle;

      if (remaining <= 0) {
        clearInterval(interval);
        signOut();
        return;
      }

      if (remaining <= warnMs) {
        setShowWarning(true);
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else {
        setShowWarning(false);
      }
    }, 10_000); // check every 10 s

    return () => clearInterval(interval);
  }, [timeoutMinutes, timeoutMs, warnMs, signOut]);

  // Countdown tick — only runs when warning is visible
  useEffect(() => {
    if (!showWarning) return;
    const tick = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, timeoutMs - idle);
      setSecondsLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) signOut();
    }, 1_000);
    return () => clearInterval(tick);
  }, [showWarning, timeoutMs, signOut]);

  if (!showWarning) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdown = mins > 0
    ? `${mins}:${String(secs).padStart(2, "0")} min`
    : `${secs} sec`;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center gap-3 bg-warn/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <span className="text-lg">⚠️</span>
      <p className="flex-1 text-sm font-medium text-ink">
        Aap inactive hain — session <strong>{countdown}</strong> mein band hoga.
      </p>
      <button
        onClick={resetActivity}
        className="shrink-0 rounded-xl bg-ink px-3 py-1.5 text-xs font-semibold text-cream"
      >
        Active rahein
      </button>
    </div>
  );
}
