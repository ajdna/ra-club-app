import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Keep-alive endpoint — prevents Supabase free-tier auto-pause (7-day limit).
 *
 * Ping this via UptimeRobot (free) every 5 minutes — you get free uptime
 * monitoring AND the DB connection resets the inactivity timer.
 *
 * Setup: https://uptimerobot.com → New Monitor → HTTP(S) → this URL.
 *
 * Also wired to Vercel Cron (vercel.json) as a daily backup in case
 * UptimeRobot is paused.
 *
 * Uses the anon key — gets 0 rows from RLS but establishes a DB connection
 * which is all that's needed to prevent the pause.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, reason: "Supabase env vars not configured" },
      { status: 500 },
    );
  }

  try {
    // Direct REST call — no Supabase client overhead.
    // rule_config is readable by authenticated users only (RLS), so anon
    // gets an empty array — but the TCP connection to the DB is still made.
    const res = await fetch(
      `${url}/rest/v1/rule_config?select=key&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        cache: "no-store",
      },
    );

    return NextResponse.json({
      ok: true,
      db_status: res.status,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
