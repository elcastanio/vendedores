import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkOnly } from "workbox-strategies";

self.skipWaiting();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(({ url }) => url.hostname.endsWith("supabase.co"), new NetworkOnly());
registerRoute(({ url }) => url.hostname.endsWith("script.google.com"), new NetworkOnly());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Notificaciones push ---
self.addEventListener("push", (event) => {
  let data = { title: "El Castaño", body: "Tenés novedades en la app." };
  try { if (event.data) data = event.data.json(); } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "El Castaño", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
