"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

type SearchResult = {
  type: "member" | "task";
  id: string;
  title: string;
  sub: string;
  href: string;
  badge?: string;
  badgeColor?: string;
};

export async function searchAll(query: string): Promise<SearchResult[]> {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") return [];

  const supabase = await createClient();
  const q = query.trim();
  if (!q) return [];

  // Search users by name (ilike) — RLS-scoped to visible users
  const [nameRes, phoneRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, role, phone")
      .ilike("name", `%${q}%`)
      .limit(20),
    supabase
      .from("users")
      .select("id, name, role, phone")
      .ilike("phone", `%${q}%`)
      .limit(10),
  ]);

  const seen = new Set<string>();
  const userResults: SearchResult[] = [];

  for (const u of [...(nameRes.data ?? []), ...(phoneRes.data ?? [])]) {
    if (seen.has(u.id)) continue;
    seen.add(u.id);

    const isOwnAccount = u.id === me.id;
    userResults.push({
      type: "member",
      id: u.id,
      title: u.name as string,
      sub: `${u.role}${u.phone ? ` · ${u.phone}` : ""}`,
      href: u.role === "member" ? `/members/${u.id}` : isOwnAccount ? "/profile" : `/members/${u.id}`,
      badge: u.role as string,
      badgeColor:
        u.role === "member"
          ? "bg-terra/15 text-terra-d"
          : u.role === "coach"
          ? "bg-sage/15 text-sage-d"
          : "bg-emerald/15 text-emerald",
    });
  }

  return userResults.slice(0, 25);
}
