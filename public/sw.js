const CACHE_NAME = "waesy-v3-brand-pwa-sync";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/favicon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bypass cache for API calls (except PWA manifest), Supabase endpoints, Server Functions and non-GET requests
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

  // Network-first strategy for navigation / pages
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((response) => {
          return response || caches.match("/");
        });
      }),
    );
    return;
  }

  // Stale-While-Revalidate for static assets (images, CSS, JS, fonts)
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
    }),
  );
});
