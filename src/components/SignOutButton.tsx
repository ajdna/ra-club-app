"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-xl border border-line bg-card px-3 py-1.5 text-sm font-semibold text-terra-d transition hover:bg-cream-2"
    >
      Sign out
    </button>
  );
}
