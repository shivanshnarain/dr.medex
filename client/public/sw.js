/**
 * DR.MEDEX Global — Service Worker for Web Push Notifications
 * Compliant with W3C Push API and Notification API standards.
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (err) {
    try {
      payload = { title: "DR.MEDEX Global Alert", message: event.data.text() };
    } catch (e) {
      payload = { title: "DR.MEDEX Global Alert", message: "New update regarding your medical equipment." };
    }
  }

  const title = payload.title || "DR.MEDEX Global Alert";
  const options = {
    body: payload.message || payload.body || "New equipment update received.",
    icon: payload.icon || "/favicon.svg",
    badge: payload.badge || "/favicon.svg",
    image: payload.image || undefined,
    tag: payload.tag || `drmedex-${Date.now()}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || "/",
      timestamp: payload.timestamp || Date.now(),
      category: payload.category || "website"
    },
    actions: [
      { action: "open", title: "View Details" },
      { action: "close", title: "Dismiss" }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If a matching tab is already open, focus it and navigate
      for (let client of windowClients) {
        if ("focus" in client) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        }
      }
      // If no tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});