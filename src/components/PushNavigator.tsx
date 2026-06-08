"use client";

/**
 * PushNavigator — listens for PUSH_NAV messages from the service worker
 * and uses the Next.js router to navigate to the right page.
 *
 * This runs silently in the background — no UI.
 * When the user taps a push notification while the app is already open,
 * the service worker posts { type: "PUSH_NAV", url: "/messages/abc" }
 * and this component handles it with proper SPA navigation.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PushNavigator() {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "PUSH_NAV" && typeof event.data.url === "string") {
        router.push(event.data.url);
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [router]);

  return null;
}
