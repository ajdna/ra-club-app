"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // redirectTo must be in Supabase Auth → URL Configuration → Redirect URLs
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/update-password`
        : "/auth/update-password";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold leading-none text-emerald">
            Password reset karo
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            Email daalo — hum reset link bhejenge.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl">📬</div>
              <p className="mt-3 font-semibold text-ink">Link bhej diya!</p>
              <p className="mt-1 text-sm text-ink/60">
                Apna email check karo aur reset link par click karo.
                <br />
                Spam folder bhi dekh lena.
              </p>
              <Link
                href="/login"
                className="mt-5 inline-block text-sm font-semibold text-terra-d underline"
              >
                ← Login par wapas jao
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm">
                <span className="text-sage-d">Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
                  placeholder="you@example.com"
                />
              </label>

              {error && (
                <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-xl bg-terra px-4 py-3 font-semibold text-white transition hover:bg-terra-d disabled:opacity-50"
              >
                {loading ? "Bhej rahe hain…" : "Reset link bhejo"}
              </button>

              <p className="text-center text-sm text-sage-d">
                <Link href="/login" className="underline">
                  ← Login par wapas jao
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
