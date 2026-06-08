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

  const { title = "RA Club", body = "", url = "/", tag } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-72.png",
      tag: tag ?? url,           // collapse duplicate notifications for same thread
      renotify: true,
      data: { url },
      vibrate: [150, 60, 150],
    }),
  );
});

// ── Notification tapped — open / focus the app at the right page ──────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  const fullUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If the app is already open in a tab, focus it and navigate there
        for (const client of clientList) {
          if ("focus" in client && "navigate" in client) {
            client.focus();
            // @ts-ignore
            return client.navigate(fullUrl);
          }
        }
        // Otherwise open a new tab / bring the PWA to front
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullUrl);
        }
      }),
  );
});
