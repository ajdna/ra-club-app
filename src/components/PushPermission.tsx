"use client";

/**
 * PushPermission — registers the service worker and asks the user to allow
 * push notifications the first time they open the app.
 *
 * Shows a small banner at the top of the screen when permission hasn't been
 * granted yet. Dismissed once granted or denied.
 */

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function subscribe() {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    // Re-save in case it was cleared from DB
    await saveSubscription(existing);
    return existing;
  }
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  await saveSubscription(sub);
  return sub;
}

async function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
}

export function PushPermission() {
  const [state, setState] = useState<"idle" | "banner" | "asking" | "done">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async () => {
        const perm = Notification.permission;
        if (perm === "granted") {
          // Already granted — silently re-subscribe to keep DB fresh
          await subscribe().catch(() => {});
          setState("done");
        } else if (perm === "default") {
          setState("banner");
        } else {
          setState("done"); // denied — don't ask again
        }
      })
      .catch(() => {});
  }, []);

  async function handleAllow() {
    setState("asking");
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        await subscribe();
      }
    } catch {
      // ignore
    }
    setState("done");
  }

  if (state !== "banner") return null;

  return (
    <div className="flex items-center gap-3 border-b border-emerald/20 bg-emerald/10 px-4 py-2.5 text-sm">
      <span className="text-base">🔔</span>
      <p className="flex-1 text-ink/80">
        Notifications enable karein — messages aur tasks ke liye alerts milenge
      </p>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setState("done")}
          className="rounded-lg px-2 py-1 text-xs text-ink/50 hover:text-ink"
        >
          Not now
        </button>
        <button
          onClick={handleAllow}
          className="rounded-lg bg-emerald px-3 py-1 text-xs font-semibold text-white"
        >
          Allow
        </button>
      </div>
    </div>
  );
}
