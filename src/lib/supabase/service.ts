/**
 * Supabase admin client (service role key).
 * Bypasses RLS — only for server-side operations where auth context is absent,
 * e.g. webhook handlers, cron jobs, server-to-server push.
 *
 * NEVER import this file in Client Components or expose the key to the browser.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
