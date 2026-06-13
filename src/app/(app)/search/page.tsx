import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SearchClient } from "./SearchClient";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (typeof me !== "object") redirect("/");

  return (
    <main className="px-4 pb-8 pt-5">
      <Link href="/" className="text-sm font-semibold text-sage-d">← Home</Link>
      <h1 className="font-display mt-3 mb-5 text-2xl font-semibold text-emerald">
        🔍 Search
      </h1>
      <SearchClient />
    </main>
  );
}
