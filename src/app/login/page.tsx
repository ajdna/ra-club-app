"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Method = "otp" | "password";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const rejected = params.get("error") === "rejected";

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
  const [showPw, setShowPw] = useState(false);
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

    // Allow login by email OR user id (username). Resolve username -> email.
    let loginEmail = email.trim();
    if (loginEmail && !loginEmail.includes("@")) {
      const rpc = supabase.rpc.bind(supabase) as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: string | null; error: { message: string } | null }>;
      const { data, error: rpcErr } = await rpc("get_login_email", { p_identifier: loginEmail });
      if (rpcErr) return fail(rpcErr.message);
      if (!data) return fail("Is user id se koi account nahi mila.");
      loginEmail = data;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    if (error) return fail(error.message);
    router.push(next);
    router.refresh();
  }

  const fieldBase =
    "h-[54px] w-full rounded-[14px] border border-line bg-card pr-4 text-[15px] text-ink outline-none transition focus:border-emerald focus:ring-4 focus:ring-emerald/10 placeholder:text-ink-3";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 py-10">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-home.png" alt="Ruby Nutrition Center" width={240} height={216} className="brand-logo brand-logo-light h-auto w-[240px]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-home-dark.png" alt="" aria-hidden="true" width={240} height={216} className="brand-logo brand-logo-dark h-auto w-[240px]" />
          <p className="mt-5 max-w-[240px] text-[15px] font-medium leading-snug text-ink-2">
            Sehat, streak aur saath — sab ek jagah.
          </p>
        </div>

        {/* Method toggle — only when Phone OTP is enabled */}
        {phoneOtpEnabled && (
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-cream-2 p-1">
            {(["password", "otp"] as Method[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMethod(m);
                  setError(null);
                }}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  method === m ? "bg-card text-emerald shadow-sm" : "text-ink-2"
                }`}
              >
                {m === "otp" ? "Phone OTP" : "Email + Password"}
              </button>
            ))}
          </div>
        )}

        {/* Phone OTP */}
        {phoneOtpEnabled && method === "otp" && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-2">Phone number</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={otpSent}
                className={`${fieldBase} px-4 disabled:opacity-60`}
                placeholder="+91 98xxx xxxxx"
              />
            </label>

            {!otpSent ? (
              <button
                type="button"
                onClick={sendOtp}
                disabled={loading || phone.length < 8}
                className="h-[54px] w-full rounded-full bg-emerald text-[16px] font-semibold text-white shadow-[0_8px_22px_var(--emerald-soft)] transition hover:bg-emerald-2 disabled:opacity-50"
              >
                {loading ? "Bhej rahe hain…" : "Send OTP"}
              </button>
            ) : (
              <>
                <p className="text-sm text-ink-2">
                  Humne OTP bheja hai aapke number par. Enter karke verify karo.
                </p>
                <input
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`${fieldBase} px-4 tracking-[0.3em]`}
                  placeholder="6-digit code"
                />
                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={loading || code.length < 4}
                  className="h-[54px] w-full rounded-full bg-emerald text-[16px] font-semibold text-white shadow-[0_8px_22px_var(--emerald-soft)] transition hover:bg-emerald-2 disabled:opacity-50"
                >
                  {loading ? "Verify ho raha hai…" : "Verify & Login"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setCode("");
                  }}
                  className="w-full text-center text-sm font-medium text-emerald underline"
                >
                  Number change karein
                </button>
              </>
            )}
          </div>
        )}

        {/* Email + Password */}
        {method === "password" && (
          <div className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-2">Email ya User ID</span>
              <div className="relative">
                <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="m4 7 8 6 8-6" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${fieldBase} pl-11`}
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-2">Password</span>
              <div className="relative">
                <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <rect x="4" y="10" width="16" height="10" rx="3" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
                </svg>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${fieldBase} pl-11 pr-12`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-3"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
                    <circle cx="12" cy="12" r="2.7" />
                  </svg>
                </button>
              </div>
            </label>

            <div className="-mt-1 flex justify-end">
              <Link href="/auth/reset-password" className="text-[13px] font-semibold text-emerald">
                Password bhool gaye?
              </Link>
            </div>

            <button
              type="button"
              onClick={signInPassword}
              disabled={loading || !email || !password}
              className="mt-1 h-[54px] w-full rounded-full bg-emerald text-[16px] font-semibold text-white shadow-[0_8px_22px_var(--emerald-soft)] transition hover:bg-emerald-2 disabled:opacity-50"
            >
              {loading ? "Login ho raha hai…" : "Log in"}
            </button>

            <div className="my-2 flex items-center gap-3.5">
              <div className="h-px flex-1 bg-line" />
              <span className="text-[12px] font-medium text-ink-3">ya</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <Link
              href="/auth/register"
              className="flex h-[54px] w-full items-center justify-center rounded-full border border-line bg-transparent text-[16px] font-semibold text-ink transition hover:bg-cream-2"
            >
              Naya account banayein
            </Link>
          </div>
        )}

        {rejected && (
          <p role="alert" className="mt-4 rounded-[14px] bg-bad/10 px-3 py-2.5 text-sm text-bad">
            Aapki registration reject ho gayi. Zyada jaankari ke liye apne coach se baat karein.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-[14px] bg-bad/10 px-3 py-2.5 text-sm text-bad">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-[12px] font-medium leading-relaxed text-ink-3">
          🛡 OTP-verified login · data server-side protected
        </p>
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
