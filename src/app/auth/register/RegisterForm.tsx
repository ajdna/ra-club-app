"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerUser } from "./actions";
import { isEmail, isE164 } from "@/lib/validate";

const ROLE_LABELS: Record<string, string> = {
  member: "Member — club ka participant hoon",
  coach: "Coach — members manage karta/karti hoon",
};

const inputCls =
  "mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra";

export function RegisterForm({
  coaches,
}: {
  coaches: { id: string; name: string; role: string }[];
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+91");
  const [waSame, setWaSame] = useState(true);
  const [whatsapp, setWhatsapp] = useState("+91");
  const [role, setRole] = useState("member");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);

    if (!name.trim()) return setError("Apna naam likhein.");
    if (!isEmail(email)) return setError("Valid email daalein.");
    if (password.length < 8) return setError("Password kam se kam 8 characters ka hona chahiye.");
    if (!isE164(phone)) return setError("Valid phone number daalein — country code ke saath (e.g. +9198xxxxxxxx).");
    const waNumber = waSame ? phone : whatsapp;
    if (!waSame && !isE164(whatsapp)) return setError("Valid WhatsApp number daalein (+country code).");
    if (!parentId) return setError("Apna coach / upline choose karein.");

    setLoading(true);
    const supabase = createClient();

    const { error: signUpErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signUpErr) {
      setLoading(false);
      return setError(signUpErr.message);
    }

    const res = await registerUser(name, username, email, phone, waNumber, role, parentId);
    if (!res.ok) {
      await supabase.auth.signOut();
      setLoading(false);
      return setError(res.error);
    }

    router.push("/pending");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 py-10">
      <div className="w-full max-w-sm">
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

        <div className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
          {/* Name */}
          <label className="block text-sm">
            <span className="text-sage-d">Poora naam *</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Aapka naam" />
          </label>

          {/* Email */}
          <label className="block text-sm">
            <span className="text-sage-d">Email *</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
          </label>

          {/* Username */}
          <label className="block text-sm">
            <span className="text-sage-d">User ID (optional)</span>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} placeholder="e.g. ankur_ra" autoCapitalize="none" />
            <span className="mt-1 block text-xs text-ink/45">Blank chhoda to email hi aapka user id hoga. User ID ya email — dono se login kar sakte hain.</span>
          </label>

          {/* Password */}
          <label className="block text-sm">
            <span className="text-sage-d">Password * (min 8 chars)</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
          </label>

          {/* Phone */}
          <label className="block text-sm">
            <span className="text-sage-d">Phone *</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+9198xxxxxxxx" />
          </label>

          {/* WhatsApp */}
          <div className="text-sm">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={waSame} onChange={(e) => setWaSame(e.target.checked)} className="h-4 w-4 accent-terra" />
              <span className="text-ink">Yeh number WhatsApp pe hai</span>
            </label>
            {!waSame && (
              <label className="mt-3 block">
                <span className="text-sage-d">WhatsApp number *</span>
                <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputCls} placeholder="+9198xxxxxxxx" />
              </label>
            )}
          </div>

          {/* Role */}
          <div className="text-sm">
            <span className="text-sage-d">Aap kaun hain? *</span>
            <div className="mt-2 space-y-2">
              {(["member", "coach"] as const).map((r) => (
                <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${role === r ? "border-terra bg-terra/5" : "border-line bg-cream"}`}>
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="accent-terra" />
                  <span className="text-ink">{ROLE_LABELS[r]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Coach / Upline */}
          <label className="block text-sm">
            <span className="text-sage-d">{role === "coach" ? "Aapka upline (NCO/JCO/Owner) *" : "Aapka coach *"}</span>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputCls}>
              <option value="">— choose karein —</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.role === "club_owner" ? "(Owner)" : c.role === "nco" ? "(NCO)" : c.role === "jco" ? "(JCO)" : "(Coach)"}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>
          )}

          <button type="button" onClick={submit} disabled={loading} className="w-full rounded-xl bg-terra px-4 py-3 font-semibold text-white transition hover:bg-terra-d disabled:opacity-50">
            {loading ? "Register ho raha hai…" : "Register karo"}
          </button>

          <p className="text-center text-sm text-ink/60">
            Pehle se account hai?{" "}
            <Link href="/login" className="font-semibold text-terra-d underline">Login karein</Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-ink/45">
          Registration ke baad club owner approve karenge — tab app use kar sakte hain.
        </p>
      </div>
    </main>
  );
}
