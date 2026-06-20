"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function UpdatePasswordForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Exchange the token_hash from the email link for a live session.
  useEffect(() => {
    const token_hash = params.get("token_hash");
    const type = params.get("type");

    if (!token_hash || type !== "recovery") {
      setError(
        "Invalid or expired reset link. Please request a new one.",
      );
      setVerifying(false);
      return;
    }

    const supabase = createClient();
    supabase.auth
      .verifyOtp({ token_hash, type: "recovery" })
      .then(({ error }) => {
        if (error) setError(error.message);
        setVerifying(false);
      });
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => router.push("/"), 2000);
    }
  }

  if (verifying) {
    return (
      <p className="text-center text-sm text-ink/60">
        Link verify ho raha hai…
      </p>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="text-4xl">✅</div>
        <p className="mt-3 font-semibold text-ink">Password update ho gaya!</p>
        <p className="mt-1 text-sm text-ink/60">
          Home par redirect ho raha hai…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="text-sage-d">Naya password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
          placeholder="At least 8 characters"
        />
      </label>

      <label className="block text-sm">
        <span className="text-sage-d">Password confirm karo</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
          placeholder="Same password dobara"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !password || !confirm}
        className="w-full rounded-xl bg-terra px-4 py-3 font-semibold text-white transition hover:bg-terra-d disabled:opacity-50"
      >
        {loading ? "Saving…" : "Password set karo"}
      </button>
    </form>
  );
}

export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold leading-none text-emerald">
            Naya password set karo
          </h1>
        </div>
        <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
          <Suspense
            fallback={
              <p className="text-center text-sm text-ink/60">Loading…</p>
            }
          >
            <UpdatePasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
