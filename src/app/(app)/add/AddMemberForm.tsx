"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMember } from "../members/actions";

export type MembershipOption = { value: string; label: string };

export function AddMemberForm({ options }: { options: MembershipOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(null);
      const res = await addMember(formData);
      if (res.ok) {
        router.push("/members");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-5 space-y-4 rounded-2xl border border-line bg-card p-5 shadow-sm"
    >
      <Field label="Naam *">
        <input
          name="name"
          required
          className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
          placeholder="Member ka naam"
        />
      </Field>

      <Field label="Phone">
        <input
          name="phone"
          type="tel"
          className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
          placeholder="+91 98xxx xxxxx"
        />
      </Field>

      <Field label="Membership">
        <select
          name="membership_type"
          defaultValue={options[0]?.value ?? "basic"}
          className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Stage (0–6)">
        <input
          name="stage"
          type="number"
          min={0}
          max={6}
          defaultValue={0}
          className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none focus:border-terra"
        />
      </Field>

      {error && (
        <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-terra px-4 py-3 font-semibold text-white transition hover:bg-terra-d disabled:opacity-50"
      >
        {pending ? "Add ho raha hai…" : "Add member"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="text-sage-d">{label}</span>
      {children}
    </label>
  );
}
