"use client";

import { useEffect, useState, useTransition } from "react";
import { savePushSubscription, removePushSubscription } from "./actions";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushSubscribeButton() {
  const [status, setStatus] = useState<"loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed">("loading");
  const [isPending, start] = useTransition();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        setStatus(sub ? "subscribed" : "unsubscribed");
      })
    );
  }, []);

  async function subscribe() {
    if (!VAPID_PUBLIC) {
      alert("Push notifications not configured (missing VAPID key).");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { setStatus("denied"); return; }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });

    const json = sub.toJSON();
    const keys = json.keys as { p256dh: string; auth: string };

    start(async () => {
      await savePushSubscription(json.endpoint!, keys.p256dh, keys.auth, navigator.userAgent);
      setStatus("subscribed");
    });
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) { setStatus("unsubscribed"); return; }
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    start(async () => {
      await removePushSubscription(endpoint);
      setStatus("unsubscribed");
    });
  }

  if (status === "loading") return null;
  if (status === "unsupported") return null;

  if (status === "denied") return (
    <p className="text-xs text-ink/50">
      Notifications blocked — allow in browser settings.
    </p>
  );

  if (status === "subscribed") return (
    <button
      type="button"
      onClick={unsubscribe}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-lg bg-emerald/10 px-3 py-1.5 text-xs font-semibold text-emerald transition hover:bg-emerald/20 disabled:opacity-50"
    >
      🔔 Notifications on
    </button>
  );

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-lg bg-line px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-cream-2 disabled:opacity-50"
    >
      🔕 Enable notifications
    </button>
  );
}
