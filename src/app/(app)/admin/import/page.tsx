import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") redirect("/login");
  if (me.role !== "club_owner") redirect("/admin");

  return (
    <main className="px-4 pb-10 pt-5 max-w-lg mx-auto">
      <Link href="/admin" className="text-sm font-semibold text-sage-d">
        ← Admin Console
      </Link>

      <h1 className="font-display mt-3 text-2xl font-semibold text-emerald">
        Import Members
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        Excel se ek saath kai members import karo. Har member ke liye 12
        mahine ke follow-up tasks auto-generate honge.
      </p>

      {/* Download template */}
      <a
        href="/api/template"
        download
        className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald/30 bg-emerald/5 px-4 py-3 transition hover:bg-emerald/10"
      >
        <span className="text-2xl">⬇️</span>
        <div>
          <div className="font-semibold text-emerald">
            Download Excel Template
          </div>
          <div className="text-sm text-ink/60">
            Isko fill karo, phir neeche upload karo
          </div>
        </div>
      </a>

      {/* Instructions */}
      <div className="mt-5 rounded-2xl border border-line bg-card p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
          Template Instructions
        </p>
        <ul className="space-y-1 text-sm text-ink/70 list-disc list-inside">
          <li>
            <strong>name</strong> — member ka poora naam (required)
          </li>
          <li>
            <strong>phone</strong> — 10-digit number, no spaces
          </li>
          <li>
            <strong>start_date</strong> — 1st order ki date, DD/MM/YYYY format
          </li>
          <li>
            <strong>coach_name</strong> — exactly as registered in the system
          </li>
          <li>
            <strong>membership_type</strong> — basic / elite / privilege
          </li>
          <li>
            <strong>current_weight_kg</strong> &amp;{" "}
            <strong>ideal_weight_kg</strong> — optional, numbers only
          </li>
        </ul>
      </div>

      {/* Upload form */}
      <div className="mt-6">
        <ImportForm />
      </div>
    </main>
  );
}
