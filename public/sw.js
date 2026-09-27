const CACHE_NAME = "waesy-v4-pwa-push";
const STATIC_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
  "/favicon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/apple-touch-icon.png",
];

// 1. Instalação e pré-cache de ativos essenciais + página offline
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Ativação e limpeza de caches legados
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 3. Estratégia de Rede e Cache Resiliente
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignora requisições de API (exceto PWA manifest), Supabase, Server Functions e métodos não-GET
  const isPwaManifest = url.pathname.startsWith("/api/pwa/manifest");
  if (
    event.request.method !== "GET" ||
    (url.pathname.startsWith("/api") && !isPwaManifest) ||
    url.hostname.includes("supabase.co") ||
    url.search.includes("_server") ||
    url.pathname.includes("_server") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/workspace")
  ) {
    return;
  }

  // Network-first com fallback para /offline.html para navegação de páginas
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const offlinePage = await caches.match("/offline.html");
        return offlinePage || caches.match("/");
      })
    );
    return;
  }

  // Stale-While-Revalidate para ativos estáticos (imagens, CSS, JS, fontes)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Recebimento de Notificações Web Push (Background / Standby)
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_err) {
      data = { title: "Waesy", body: event.data.text() };
    }
  }

  const title = data.title || "Waesy Notificações";
  const options = {
    body: data.body || "Nova mensagem ou atualização no Waesy.",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/favicon.ico",
    data: {
      url: data.url || "/",
      timestamp: Date.now(),
      ...data.data,
    },
    vibrate: [100, 50, 100],
    tag: data.tag || "waesy-notification",
    renotify: true,
  };

  // Suporte à App Badging API se disponível no dispositivo
  if ("setAppBadge" in navigator) {
    try {
      navigator.setAppBadge().catch(() => {});
    } catch (_e) {}
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Clique em Notificação Push (Abrir ou Focar Janela)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  // Limpa contador de badge ao interagir
  if ("clearAppBadge" in navigator) {
    try {
      navigator.clearAppBadge().catch(() => {});
    } catch (_e) {}
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 6. Fechamento de Notificação Push
self.addEventListener("notificationclose", () => {
  if ("clearAppBadge" in navigator) {
    try {
      navigator.clearAppBadge().catch(() => {});
    } catch (_e) {}
  }
});
