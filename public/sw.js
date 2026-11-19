const CACHE_NAME = "waesy-v6-app-realtime";
const TENANT_RUNTIME_CACHE_PREFIX = "waesy-app-runtime-";
const STATIC_ASSETS = [
  "/offline.html",
  "/favicon.ico",
  "/favicon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/apple-touch-icon.png",
];

function extractTenantNamespace(urlObj, referrerStr) {
  const matchPath = urlObj.pathname.match(/^\/app\/(?:preview\/)?([^/?#]+)/i);
  if (matchPath && matchPath[1]) {
    return matchPath[1].toLowerCase();
  }
  if (referrerStr) {
    try {
      const refUrl = new URL(referrerStr);
      const refMatch = refUrl.pathname.match(/^\/app\/(?:preview\/)?([^/?#]+)/i);
      if (refMatch && refMatch[1]) {
        return refMatch[1].toLowerCase();
      }
    } catch (_e) {}
  }
  const host = (urlObj.hostname || "").toLowerCase();
  if (
    host &&
    host !== "localhost" &&
    host !== "127.0.0.1" &&
    !host.endsWith("waesy.com.br") &&
    !host.endsWith("waesy.app")
  ) {
    return host.replace(/[^a-z0-9.-]/g, "-");
  }
  return "global";
}

function getTenantRuntimeCacheName(urlObj, referrerStr) {
  return `${TENANT_RUNTIME_CACHE_PREFIX}${extractTenantNamespace(urlObj, referrerStr)}`;
}

// ── PWA Native Singularity v6: Zero-Stale Auto-Sync Service Worker ─────────
// Regras invioláveis para atualizar dados e manifestos sem exigir limpar cache:
// 1. NUNCA interceptar rotas de auth (/api/auth/*, /auth/*), /api/* (inclui
//    /api/pwa/manifest.json), /_server, /workspace/* ou /admin*.
// 2. HTML (mode === "navigate"): sempre Network-Only/First sem gravar páginas
//    dinâmicas em cache (fallback /offline.html apenas se offline real).
// 3. Chunks com hash (/assets/*): Cache-First seguro (URL imutável por build).
// 4. Imagens/ícones sem hash: Network-First particionado por tenant
//    (waesy-app-runtime-<slug>) para refletir trocas de logo/capa instantaneamente.
// 5. Ativação incremental sem perda de dados: preserva IndexedDB, localStorage,
//    sessionStorage, cookies e caches ativos de outros tenants.
// ──────────────────────────────────────────────────────────────────────────

// 1. Instalação e pré-cache estritamente de fallback offline e ícones base
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Permite ativação forçada ou purge seletivo por tenant de cache de mídia via postMessage
self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data.type === "PURGE_APP_CACHE") {
    const rawTarget = String(event.data.slug || event.data.host || "").trim().toLowerCase();
    const targetCacheName = rawTarget ? `${TENANT_RUNTIME_CACHE_PREFIX}${rawTarget}` : null;
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter((name) => {
                if (targetCacheName) {
                  return name === targetCacheName;
                }
                return name.startsWith(TENANT_RUNTIME_CACHE_PREFIX);
              })
              .map((name) => caches.delete(name))
          )
        )
        .then(() =>
          self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
              try {
                client.postMessage({
                  type: "WAESY_SW_CACHE_SYNCED",
                  slug: rawTarget || null,
                  version: event.data.version || null,
                });
              } catch (_e) {}
            }
          })
        )
    );
  }
});

// 2. Ativação incremental: limpa apenas caches obsoletos de versões antigas sem apagar dados do usuário
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (name) =>
                name !== CACHE_NAME && !name.startsWith(TENANT_RUNTIME_CACHE_PREFIX)
            )
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Rotas que NUNCA devem ser interceptadas pelo SW ───────────────────────
function isAuthRoute(url) {
  return (
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.includes("supabase") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.in") ||
    url.search.includes("_server") ||
    url.pathname.includes("_server")
  );
}

// ── Rotas de admin/workspace — network-only (dados dinâmicos críticos) ─────
function isAdminRoute(url) {
  return (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/workspace")
  );
}

// ── A resposta tem dados de auth? Nunca cachear ───────────────────────────
function hasAuthHeaders(response) {
  const cc = response.headers.get("cache-control") || "";
  const setCookie = response.headers.get("set-cookie") || "";
  return (
    cc.includes("no-store") ||
    cc.includes("private") ||
    setCookie.length > 0
  );
}

function isHashedAsset(url) {
  return url.pathname.startsWith("/assets/");
}

// 3. Estratégia de Rede e Cache Sem Cache Preso
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Network-Only estrito: auth, /api/* (inclusive manifest.json dinâmico), admin, workspace e não-GET
  if (
    event.request.method !== "GET" ||
    isAuthRoute(url) ||
    url.pathname.startsWith("/api") ||
    isAdminRoute(url)
  ) {
    return;
  }

  // Navigate: Network-First sem persistir HTML dinâmico em cache (evita app travado em versão antiga)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { credentials: "include", cache: "no-store" }).catch(async () => {
        const offlinePage = await caches.match("/offline.html");
        return offlinePage || new Response("Offline", { status: 503, statusText: "Offline" });
      })
    );
    return;
  }

  // Chunks com hash do Vite (/assets/*): Cache-First (URL muda a cada build)
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && !hasAuthHeaders(networkResponse)) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Demais ativos sem hash (logos, capas, banners, ícones): Network-First particionado por tenant
  const tenantCacheName = getTenantRuntimeCacheName(url, event.request.referrer);
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && !hasAuthHeaders(networkResponse)) {
          const responseToCache = networkResponse.clone();
          caches.open(tenantCacheName).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const tenantCache = await caches.open(tenantCacheName);
        const cachedInTenant = await tenantCache.match(event.request);
        if (cachedInTenant) return cachedInTenant;
        const cachedGlobal = await caches.match(event.request);
        if (cachedGlobal) return cachedGlobal;
        return new Response("", { status: 504 });
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
