import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components (browser).
 * Reads the public anon key — safe to expose. Row Level Security on the
 * database is what actually enforces the downline / sideline visibility rules
 * from the architecture doc, so never rely on the client to hide data.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
