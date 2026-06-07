"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Method = "otp" | "password";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  // Phone OTP is hidden until enabled (needs an SMS provider configured in
  // Supabase). Flip NEXT_PUBLIC_ENABLE_PHONE_OTP=true to show it.
  const phoneOtpEnabled = process.env.NEXT_PUBLIC_ENABLE_PHONE_OTP === "true";

  // Email + Password is the default method.
  const [method, setMethod] = useState<Method>("password");
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fail(message: string) {
    setError(message);
    setLoading(false);
  }

  async function sendOtp() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) return fail(error.message);
    setOtpSent(true);
    setLoading(false);
  }

  async function verifyOtp() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    });
    if (error) return fail(error.message);
    router.push(next);
    router.refresh();
  }

  async function signInPassword() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return fail(error.message);
    router.push(next);
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 py-10">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-semibold leading-none text-emerald">
            Ruby Ankur
            <br />
            <span className="text-terra">Wellness</span>
          </h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.15em] text-sage-d">
            GUMS Club Manager
          </p>
          <p className="mt-1 text-xs text-ink/50">
            2A · Club Code RA
          </p>
        </div>

        {/* Auth card */}
        <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
          <p className="font-display text-lg font-semibold text-ink">
            Apne account se login karo
          </p>
          <p className="mt-1 text-sm text-ink/60">
            Aapki role aur visibility account se decide hoti hai — choose nahi ki
            jaati.
          </p>

          {/* Method toggle — only shown when Phone OTP is enabled.
              Email + Password is listed first (the default). */}
          {phoneOtpEnabled && (
            <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-cream-2 p-1">
              {(["password", "otp"] as Method[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMethod(m);
                    setError(null);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    method === m
                      ? "bg-card text-terra-d shadow-sm"
                      : "text-sage-d"
                  }`}
                >
                  {m === "otp" ? "Phone OTP" : "Email + Password"}
                </button>
              ))}
            </div>
          )}

          {/* Phone OTP */}
          {phoneOtpEnabled && method === "otp" && (
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-sage-d">Phone number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={otpSent}
                  className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra disabled:opacity-60"
                  placeholder="+91 98xxx xxxxx"
                />
              </label>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={loading || phone.length < 8}
                  className="w-full rounded-xl bg-terra px-4 py-3 font-semibold text-white transition hover:bg-terra-d disabled:opacity-50"
                >
                  {loading ? "Bhej rahe hain…" : "Send OTP"}
                </button>
              ) : (
                <>
                  <p className="text-sm text-ink/60">
                    Humne OTP bheja hai aapke number par. Enter karke verify
                    karo.
                  </p>
                  <input
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 tracking-[0.3em] text-ink outline-none focus:border-terra"
                    placeholder="6-digit code"
                  />
                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={loading || code.length < 4}
                    className="w-full rounded-xl bg-emerald px-4 py-3 font-semibold text-white transition hover:bg-emerald-2 disabled:opacity-50"
                  >
                    {loading ? "Verify ho raha hai…" : "Verify & Login"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setCode("");
                    }}
                    className="w-full text-center text-sm text-sage-d underline"
                  >
                    Number change karein
                  </button>
                </>
              )}
            </div>
          )}

          {/* Email + Password */}
          {method === "password" && (
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-sage-d">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
                  placeholder="you@example.com"
                />
              </label>
              <label className="block text-sm">
                <span className="text-sage-d">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
                  placeholder="••••••••"
                />
              </label>
              <button
                type="button"
                onClick={signInPassword}
                disabled={loading || !email || !password}
                className="w-full rounded-xl bg-terra px-4 py-3 font-semibold text-white transition hover:bg-terra-d disabled:opacity-50"
              >
                {loading ? "Login ho raha hai…" : "Login"}
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">
              {error}
            </p>
          )}

          <p className="mt-4 text-center text-xs text-ink/50">
            🛡 OTP-verified login · data server-side protected
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
