/**
 * POST /api/push/subscribe   — save a new push subscription for the signed-in user
 * DELETE /api/push/subscribe — remove a subscription (user unsubscribed)
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { endpoint, keys } = body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const supabase = await createClient();
  const ua = req.headers.get("user-agent") ?? undefined;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: me.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: ua,
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const me = await getCurrentUser();
  if (!me || typeof me === "string") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint } = await req.json();
  const supabase = await createClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", me.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
