"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/**
 * Shown to users whose registration is pending club-owner approval.
 * Polls auth status — once approved, getCurrentUser() will return an active
 * user and the layout redirects them home.
 */
export default function PendingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function checkStatus() {
    setChecking(true);
    // Trigger a full page reload — the layout's getCurrentUser() will re-run
    // and redirect to / if now approved, or stay here if still pending.
    router.refresh();
    setTimeout(() => setChecking(false), 2000);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 py-10">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-warn/15">
          <span className="text-4xl">⏳</span>
        </div>

        <h1 className="font-display text-2xl font-semibold text-emerald">
          Registration bheja gaya!
        </h1>
        <p className="mt-3 text-ink/70">
          Aapka account approval ke liye club owner ke paas gaya hai. Approve
          hone ke baad aap club app use kar sakte hain.
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-card p-5 shadow-sm text-left space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">📋</span>
            <div>
              <div className="text-sm font-semibold text-ink">Aage kya hoga?</div>
              <div className="mt-0.5 text-sm text-ink/60">
                Club owner aapko approve karenge — usually 24 ghante ke andar.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">📱</span>
            <div>
              <div className="text-sm font-semibold text-ink">Apne coach ko batao</div>
              <div className="mt-0.5 text-sm text-ink/60">
                Apne coach ko inform kar dijiye ki aapne register kar liya hai —
                woh approval mein help kar sakte hain.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">✅</span>
            <div>
              <div className="text-sm font-semibold text-ink">Approved hone ke baad</div>
              <div className="mt-0.5 text-sm text-ink/60">
                Aap seedha login kar ke club app access kar sakte hain.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={checkStatus}
            disabled={checking}
            className="w-full rounded-xl bg-emerald px-4 py-3 font-semibold text-white transition hover:bg-emerald-2 disabled:opacity-60"
          >
            {checking ? "Check ho raha hai…" : "Status check karo"}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-sage-d transition hover:bg-cream-2"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
