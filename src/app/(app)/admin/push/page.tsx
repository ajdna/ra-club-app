"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

type UserSub = {
  id: string;
  name: string;
  role: string;
  deviceCount: number;
};

type TestResult = { ok?: boolean; log?: string[]; error?: string };

export default function AdminPushPage() {
  const [users, setUsers] = useState<UserSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isPending, start] = useTransition();

  useEffect(() => {
    fetch("/api/push/admin-subs")
      .then((r) => r.json())
      .then((d) => { setUsers(d.users ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function sendTest(userId: string) {
    start(async () => {
      const res = await fetch(`/api/push/test-user?user_id=${userId}`);
      const data = await res.json();
      setResults((prev) => ({ ...prev, [userId]: data }));
    });
  }

  const subscribed = users.filter((u) => u.deviceCount > 0);
  const notSubscribed = users.filter((u) => u.deviceCount === 0);

  return (
    <main className="px-4 pb-10 pt-5">
      <Link href="/admin" className="text-sm font-semibold text-sage-d">← Admin</Link>
      <h1 className="font-display mt-3 text-2xl font-semibold text-emerald">
        🔔 Push Notifications
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        Check who has notifications enabled and send test pushes.
      </p>

      {loading && <p className="mt-8 text-center text-sm text-ink/40">Loading…</p>}

      {/* Supabase webhook reminder */}
      <div className="mt-5 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm">
        <p className="font-semibold text-ink">📡 Supabase Webhook must be set up</p>
        <p className="mt-1 text-ink/70">
          Go to <strong>Supabase → Database → Webhooks</strong> and verify{" "}
          <code className="rounded bg-ink/10 px-1">push-notify</code> exists, points to your
          Vercel URL (<code>/api/push/notify</code>), and has{" "}
          <code>Authorization: Bearer ra-push-webhook-2026</code> header.
        </p>
        <p className="mt-2 text-xs text-ink/50">
          Check <strong>Recent Deliveries</strong> — if they return 401, the secret is wrong.
          If there are no deliveries at all, the webhook is not wired up.
        </p>
      </div>

      {!loading && (
        <>
          {/* Subscribed users */}
          <section className="mt-5">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-good">
              ✅ Notifications enabled ({subscribed.length})
            </p>
            <div className="space-y-2">
              {subscribed.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-card px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink text-sm">{u.name}</p>
                    <p className="text-xs text-ink/50">{u.role} · {u.deviceCount} device{u.deviceCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => sendTest(u.id)}
                      disabled={isPending}
                      className="rounded-lg bg-emerald px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Send test
                    </button>
                    {results[u.id] && (
                      <p className={`text-[10px] ${results[u.id].error ? "text-bad" : "text-good"}`}>
                        {results[u.id].error ?? "✅ sent"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {subscribed.length === 0 && (
                <p className="py-4 text-center text-sm text-ink/40">No subscriptions yet</p>
              )}
            </div>
          </section>

          {/* Not subscribed */}
          {notSubscribed.length > 0 && (
            <section className="mt-5">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-bad">
                ❌ No notifications ({notSubscribed.length})
              </p>
              <div className="rounded-2xl border border-line bg-card divide-y divide-line">
                {notSubscribed.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink text-sm">{u.name}</p>
                      <p className="text-xs text-ink/50">{u.role}</p>
                    </div>
                    <p className="text-xs text-ink/40">Not subscribed</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 px-1 text-xs text-ink/50">
                These users need to open the app and click <strong>Allow</strong> on the
                notification banner. On iPhone they must use the PWA (Add to Home Screen first).
              </p>
            </section>
          )}
        </>
      )}
    </main>
  );
}
