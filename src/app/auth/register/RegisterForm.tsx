"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerUser } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  member: "Member — club ka participant hoon",
  coach: "Coach — members manage karta/karti hoon",
};

export function RegisterForm({
  coaches,
}: {
  coaches: { id: string; name: string; role: string }[];
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+91");
  const [role, setRole] = useState("member");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);

    if (!name.trim()) return setError("Apna naam likhein.");
    if (!email.trim()) return setError("Email likhein.");
    if (password.length < 8) return setError("Password kam se kam 8 characters ka hona chahiye.");
    if (!parentId) return setError("Apna coach / upline choose karein.");

    setLoading(true);
    const supabase = createClient();

    // Step 1 — Create Supabase auth account
    const { error: signUpErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signUpErr) {
      setLoading(false);
      return setError(signUpErr.message);
    }

    // Step 2 — Create the pending users row (now authenticated)
    const res = await registerUser(name, email, phone, role, parentId);
    if (!res.ok) {
      // Sign out the dangling auth account so they can retry cleanly
      await supabase.auth.signOut();
      setLoading(false);
      return setError(res.error);
    }

    // Step 3 — Redirect to pending page
    router.push("/pending");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 py-10">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold leading-tight text-emerald">
            Ruby Nutrition
            <br />
            <span className="text-terra">Center</span>
          </h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.15em] text-sage-d">
            Account banao
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-5 shadow-sm space-y-4">
          {/* Name */}
          <label className="block text-sm">
            <span className="text-sage-d">Poora naam *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
              placeholder="Aapka naam"
            />
          </label>

          {/* Email */}
          <label className="block text-sm">
            <span className="text-sage-d">Email *</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
              placeholder="you@example.com"
            />
          </label>

          {/* Password */}
          <label className="block text-sm">
            <span className="text-sage-d">Password * (min 8 chars)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
              placeholder="••••••••"
            />
          </label>

          {/* Phone */}
          <label className="block text-sm">
            <span className="text-sage-d">Phone (optional)</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
              placeholder="+91 98xxx xxxxx"
            />
          </label>

          {/* Role */}
          <div className="text-sm">
            <span className="text-sage-d">Aap kaun hain? *</span>
            <div className="mt-2 space-y-2">
              {(["member", "coach"] as const).map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    role === r
                      ? "border-terra bg-terra/5"
                      : "border-line bg-cream"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="accent-terra"
                  />
                  <span className="text-ink">{ROLE_LABELS[r]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Coach / Upline */}
          <label className="block text-sm">
            <span className="text-sage-d">
              {role === "coach" ? "Aapka upline (NCO/JCO/Owner) *" : "Aapka coach *"}
            </span>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
            >
              <option value="">— choose karein —</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{" "}
                  {c.role === "club_owner"
                    ? "(Owner)"
                    : c.role === "nco"
                      ? "(NCO)"
                      : c.role === "jco"
                        ? "(JCO)"
                        : "(Coach)"}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="w-full rounded-xl bg-terra px-4 py-3 font-semibold text-white transition hover:bg-terra-d disabled:opacity-50"
          >
            {loading ? "Register ho raha hai…" : "Register karo"}
          </button>

          <p className="text-center text-sm text-ink/60">
            Pehle se account hai?{" "}
            <Link href="/login" className="text-terra-d underline font-semibold">
              Login karein
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-ink/45">
          Registration ke baad club owner approve karenge — tab app use kar sakte hain.
        </p>
      </div>
    </main>
  );
}
