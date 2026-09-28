const CACHE_NAME = "waesy-v5-pwa-native";
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

// ── PWA Native Singularity: Auth-Safe Service Worker ───────────────────────
// Regras críticas para não quebrar a sessão Supabase no contexto standalone:
// 1. NUNCA interceptar rotas de auth (/api/auth/*, /auth/*) — deixar passar direto.
// 2. NUNCA cachear respostas com Set-Cookie ou headers de autenticação.
// 3. skipWaiting() diferido — só após um messageEvent 'SKIP_WAITING', evitando
//    que o SW se ative no meio de um request de refresh de token.
// 4. navigate requests usam fetch() com credentials:"include" para que o browser
//    envie os cookies de sessão corretamente mesmo no standalone context.
// ──────────────────────────────────────────────────────────────────────────

// 1. Instalação e pré-cache de ativos essenciais + página offline
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // NÃO chamamos self.skipWaiting() aqui.
  // O SW antigo continua ativo até que a aba seja refrescada,
  // evitando interromper requests de refresh de token em voo.
});

// Permite ativação forçada via postMessage (ex: após login bem-sucedido)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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

// 3. Estratégia de Rede e Cache Resiliente
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Passa direto sem interceptar: auth, API não-manifest, admin, workspace
  const isPwaManifest = url.pathname.startsWith("/api/pwa/manifest");
  if (
    event.request.method !== "GET" ||
    isAuthRoute(url) ||
    (url.pathname.startsWith("/api") && !isPwaManifest) ||
    isAdminRoute(url)
  ) {
    return; // deixa o browser resolver normalmente com cookies intactos
  }

  // Navigate: Network-first com credentials:include para preservar cookies de sessão
  // Fallback para /offline.html apenas em caso de erro de rede real.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { credentials: "include" }).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const offlinePage = await caches.match("/offline.html");
        return offlinePage || caches.match("/");
      })
    );
    return;
  }

  // Stale-While-Revalidate para ativos estáticos (imagens, CSS, JS, fontes)
  // com guarda: nunca cachear respostas com headers de auth.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            !hasAuthHeaders(networkResponse)
          ) {
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
