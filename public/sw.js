// RA Club — Service Worker
// Handles Web Push notifications and notification click deep-links.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// ── Push received ─────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "RA Club", body: event.data.text(), url: "/" };
  }

  const { title = "RA Club", body = "", url = "/", tag, silent = false } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-72.png",
      tag: tag ?? url,
      renotify: true,
      data: { url },
      silent,
      ...(silent ? {} : { vibrate: [150, 60, 150] }),
    }),
  );
});

// ── Notification tapped ───────────────────────────────────────────────────────
// Strategy:
//   1. If the app is already open in a tab/PWA → postMessage so Next.js router
//      handles the navigation (reliable on all platforms including iOS).
//   2. If not open → openWindow with the full URL.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const path = event.notification.data?.url ?? "/";
  const fullUrl = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Find any open window belonging to this origin
        const appClient = clientList.find(
          (c) => new URL(c.url).origin === self.location.origin,
        );

        if (appClient) {
          // App is open — tell it to navigate via the router
          appClient.focus();
          appClient.postMessage({ type: "PUSH_NAV", url: path });
          return;
        }

        // App is closed — open it at the right page
        return self.clients.openWindow(fullUrl);
      }),
  );
});
