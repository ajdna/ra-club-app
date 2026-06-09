/**
 * GET /api/cron/chat-clear
 *
 * Runs every hour via Vercel Cron.
 * Deletes chat messages older than `chat_auto_clear_hours` from rule_config.
 * Set chat_auto_clear_hours = 0 in Admin Console to disable.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

function serviceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export async function GET() {
  const supabase = serviceClient();

  // Read config
  const { data: cfg } = await supabase
    .from("rule_config")
    .select("value")
    .eq("key", "session_timers")
    .maybeSingle();

  const timers = (cfg?.value ?? {}) as { chat_auto_clear_hours?: number };
  const hours = timers.chat_auto_clear_hours ?? 3;

  if (hours <= 0) {
    console.log("[chat-clear] auto-clear disabled (hours=0)");
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
  }

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { error, count } = await supabase
    .from("chat_messages")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  if (error) {
    console.error("[chat-clear] delete error:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  console.log(`[chat-clear] deleted ${count ?? 0} messages older than ${hours}h`);
  return NextResponse.json({ ok: true, deleted: count ?? 0, cutoff, hours });
}
