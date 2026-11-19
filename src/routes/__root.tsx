import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, isRedirect } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { CookieBanner } from "@/components/commerce/cookie-banner";

import appCss from "../styles.css?url";
import { getThemeSettings, getPublicStoreSettings } from "@/services/cms.functions";
import { themeInitScript } from "@/lib/theme";
import { buildBrandThemeCss, resolveThemeStyleAttr } from "@/lib/brand-theme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center space-y-4">
        <h1 className="text-5xl font-bold text-foreground">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O endereço solicitado não existe ou foi movido.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex h-11 min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Voltar ao início
          </Link>
          <a
            href="/developers"
            className="inline-flex h-11 min-h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Portal de Desenvolvedores
          </a>
          <a
            href="/sitemap.xml"
            className="inline-flex h-11 min-h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sitemap XML
          </a>
          <a
            href="/llms.txt"
            className="inline-flex h-11 min-h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Guia LLMs (/llms.txt)
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  if (isRedirect(error)) {
    throw error;
  }

  const normalizedError = error instanceof Error ? error : new Error(String(error));
  console.error(normalizedError);
  const router = useRouter();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Algo deu errado</h1>
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar esta página. Tente novamente ou volte ao início.
        </p>
        {normalizedError.message && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-left overflow-x-auto scroll-area-carousel text-xs font-mono">
            <span className="font-bold block mb-1">Diagnóstico do Erro:</span>
            {normalizedError.message}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent cursor-pointer"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
 loader: async () => {
 try {
 const { getPublicPixels } = await import("@/services/integrations.functions");
 const { getPublicBrandSettings } = await import("@/services/master.functions");
 const [themeRes, storeRes, brandRes, pixelsRes] = await Promise.all([
 getThemeSettings().catch(() => null),
 getPublicStoreSettings().catch(() => null),
 getPublicBrandSettings().catch(() => null),
 getPublicPixels().catch(() => []),
 ]);
 return {
 theme: themeRes || null,
 store: storeRes || null,
 brand: brandRes || null,
 pixels: pixelsRes || [],
 };
 } catch {
 return {
 theme: null,
 store: null,
 brand: null,
 pixels: [],
 };
 }
 },
 head: ({ loaderData, matches }) => {
 const storeRaw = (loaderData as any)?.store;
 const store = storeRaw?.data || storeRaw;
 const brand = (loaderData as any)?.brand;
 const theme = (loaderData as any)?.theme;
 const isWorkspaceOrPainelRoute =
   Array.isArray(matches) &&
   matches.some((m: any) => {
     const rid = String(m?.routeId || "");
     return rid.startsWith("/workspace") || rid.startsWith("/painel");
   });
 const workspaceMatch =
   Array.isArray(matches)
     ? matches.find((m: any) => String(m?.routeId || "") === "/workspace")
     : null;
 const workspaceSession = (workspaceMatch as any)?.loaderData?.session;
 const activeWorkspaceMembership = Array.isArray(workspaceSession?.memberships)
   ? workspaceSession.memberships.find((m: any) => m?.store_id === workspaceSession?.store_id) ||
     workspaceSession.memberships[0]
   : null;
 const workspaceStoreObj =
   activeWorkspaceMembership?.stores || activeWorkspaceMembership?.store || null;
 const workspaceStoreId =
   workspaceSession?.store_id ||
   activeWorkspaceMembership?.store_id ||
   null;
 const workspaceStoreName =
   workspaceStoreObj?.name ||
   activeWorkspaceMembership?.name ||
   activeWorkspaceMembership?.store_name ||
   null;
 const workspaceStoreLogo =
   workspaceStoreObj?.logo_url ||
   activeWorkspaceMembership?.logo_url ||
   activeWorkspaceMembership?.store_logo ||
   null;

 const storeName = isWorkspaceOrPainelRoute
   ? workspaceStoreName || "Workspace"
   : brand?.platform_name || store?.name || "Waesy";
 const hasRouteSpecificManifest = Array.isArray(matches) && matches.some((m: any) =>
   String(m?.routeId || "").includes("/app/$slug") ||
   String(m?.routeId || "").includes("/loja/$slug") ||
   String(m?.routeId || "").includes("/perfil-da-loja")
 );

 const seoTitle = isWorkspaceOrPainelRoute
   ? workspaceStoreName
     ? `${workspaceStoreName} — Workspace`
     : "Workspace Pro — Sistema Operacional Empresarial"
   : brand?.seo_title || store?.seo_title || storeName;
 const seoDesc = isWorkspaceOrPainelRoute
   ? workspaceStoreName
     ? `Sistema operacional empresarial isolado de ${workspaceStoreName}.`
     : "Ambiente operacional empresarial isolado para gestão de vendas, equipe e atendimento."
   : brand?.seo_description ||
     store?.seo_description ||
     store?.description ||
     "Explore mercado, farmácia, gastronomia, empregos, eventos culturais, mobilidade e classificados na sua região.";
 const seoKeywords = isWorkspaceOrPainelRoute ? "" : store?.seo_keywords || "";

 const metaTags = [
 { charSet: "utf-8" },
 {
 name: "viewport",
 content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover, interactive-widget=resizes-content",
 },
 { title: seoTitle },
 {
 name: "description",
 content: seoDesc,
 },
 { name: "author", content: storeName },
  // design-lint-ignore DL-01 reason:"Meta tag theme-color HTML nativa do browser exige valor de cor literal" expiry:"2027-12-31"
  { name: "theme-color", media: "(prefers-color-scheme: light)", content: "#ffffff" },
  // design-lint-ignore DL-01 reason:"Meta tag theme-color HTML nativa do browser exige valor de cor literal" expiry:"2027-12-31"
  { name: "theme-color", media: "(prefers-color-scheme: dark)", content: theme?.background_color || "#09090b" },
 { name: "mobile-web-app-capable", content: "yes" },
 { name: "apple-mobile-web-app-capable", content: "yes" },
 { name: "apple-mobile-web-app-status-bar-style", content: "default" },
 { name: "apple-mobile-web-app-title", content: storeName },
 { name: "application-name", content: storeName },
 { property: "og:title", content: seoTitle },
 {
 property: "og:description",
 content: seoDesc,
 },
 { property: "og:type", content: "website" },
 {
   property: "og:image",
   content: isWorkspaceOrPainelRoute
     ? workspaceStoreLogo || "/icons/icon-512x512.png"
     : brand?.logo_url || store?.logoUrl || "https://waesy.com.br/pwa-512x512.png",
 },
 { name: "twitter:card", content: "summary_large_image" },
 ];

 if (seoKeywords) {
 metaTags.push({ name: "keywords", content: seoKeywords });
 }

 const loaderPixels = Array.isArray((loaderData as any)?.pixels) ? (loaderData as any).pixels : [];
 const googleSiteVerification =
   loaderPixels.find((p: any) => p.provider === "google_site_verification")?.verificationCode ||
   store?.settings?.google_site_verification ||
   null;
 const metaDomainVerification =
   loaderPixels.find((p: any) => p.provider === "meta_domain_verification")?.verificationCode ||
   store?.settings?.meta_domain_verification ||
   null;

 if (!isWorkspaceOrPainelRoute && googleSiteVerification) {
   metaTags.push({ name: "google-site-verification", content: String(googleSiteVerification) });
 }
 if (!isWorkspaceOrPainelRoute && metaDomainVerification) {
   metaTags.push({ name: "facebook-domain-verification", content: String(metaDomainVerification) });
 }

 const faviconUrl = isWorkspaceOrPainelRoute
   ? workspaceStoreLogo || "/favicon.svg"
   : brand?.favicon_url ||
     brand?.faviconUrl ||
     store?.faviconUrl ||
     store?.settings?.faviconUrl ||
     store?.settings?.favicon_url ||
     theme?.favicon_url ||
     theme?.faviconUrl ||
     "/favicon.svg";

 const appleTouchIcon = isWorkspaceOrPainelRoute
   ? workspaceStoreLogo || "/icons/icon-192x192.png"
   : brand?.favicon_url ||
     brand?.logo_url ||
     "/icons/apple-touch-icon.png";

 const manifestHref = isWorkspaceOrPainelRoute
   ? `/api/pwa/manifest.json?mode=workspace${workspaceStoreId ? `&storeId=${encodeURIComponent(workspaceStoreId)}` : ""}`
   : store?.id
     ? `/api/pwa/manifest.json?storeId=${store.id}`
     : "/api/pwa/manifest.json";

 return {
 meta: metaTags,
 links: [
 ...(!hasRouteSpecificManifest
   ? [
       { rel: "manifest", href: manifestHref },
       { rel: "apple-touch-icon", href: appleTouchIcon },
       { rel: "apple-touch-icon", sizes: "180x180", href: appleTouchIcon },
     ]
   : []),
 { rel: "stylesheet", href: appCss },
 { rel: "icon", type: "image/svg+xml", href: faviconUrl },
 { rel: "alternate icon", href: "/favicon.ico" },
 { rel: "preconnect", href: "https://fonts.googleapis.com" },
 {
 rel: "preconnect",
 href: "https://fonts.gstatic.com",
 crossOrigin: "anonymous",
 },
 {
 rel: "stylesheet",
 href: (() => {
  const bodyFont = (theme?.font_body || "Inter").trim().replace(/ /g, "+");
  const headingFont = (theme?.font_heading || "Inter").trim().replace(/ /g, "+");
  const families = [
   `${bodyFont}:wght@400;500;600`,
   ...(headingFont !== bodyFont ? [`${headingFont}:wght@400;500;600`] : []),
   "JetBrains+Mono:wght@400;500;600",
  ];
  return `https://fonts.googleapis.com/css2?family=${families.join("&family=")}&display=swap`;
 })(),
 },
 ],
 };
 },
 shellComponent: RootShell,
 component: RootComponent,
 notFoundComponent: NotFoundComponent,
 errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const { theme, brand, pixels } = ((Route.useLoaderData?.() as any) || {});
  const brandThemeCss = buildBrandThemeCss(brand);
  const themeStyleAttr = resolveThemeStyleAttr(brand?.theme_style);

  const metaPixel = pixels?.find((p: any) => p.provider === "meta_pixel")?.pixelId;
  const gaPixel = pixels?.find((p: any) => p.provider === "google_analytics")?.measurementId;
  const googleAdsEntry = pixels?.find((p: any) => p.provider === "google_ads");
  const googleAdsId = googleAdsEntry?.conversionId;
  const googleAdsLabel = googleAdsEntry?.conversionLabel;
  const primaryGtagId = gaPixel || googleAdsId;
  const gtmId = pixels?.find((p: any) => p.provider === "gtm")?.pixelId;
  const tiktokPixel = pixels?.find((p: any) => p.provider === "tiktok_pixel")?.pixelId;

  return (
    <html lang="pt-BR" data-theme-style={themeStyleAttr}>
      <head>
        <HeadContent />
        {/* Script anti-FOUC: aplica classe .dark/.light antes do primeiro paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />

        {/* Dynamic Master Brand Theme Colors (Zero Hardcoding) */}
        {brandThemeCss && (
          <style
            id="waesy-brand-theme-vars"
            dangerouslySetInnerHTML={{ __html: brandThemeCss }}
          />
        )}

        {/* Speculation Rules: prerender irrestrito desativado (SPEC-20261104) para evitar sobrecarga de SSR em background */}

        {/* Inject Google Tag Manager if configured */}
        {gtmId && (
          <script
            id={`gtm-script-${gtmId}`}
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
        )}

        {/* Inject unified Google Analytics 4 + Google Ads Tag */}
        {primaryGtagId && (
          <>
            <script id="waesy-gtag-js" async src={`https://www.googletagmanager.com/gtag/js?id=${primaryGtagId}`}></script>
            <script
              id="waesy-gtag-config"
              dangerouslySetInnerHTML={{
                __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                window.gtag = window.gtag || gtag;
                gtag('js', new Date());
                ${gaPixel ? `gtag('config', '${gaPixel}');` : ""}
                ${googleAdsId ? `gtag('config', '${googleAdsId}');` : ""}
                ${googleAdsId && googleAdsLabel ? `window.__WAESY_GOOGLE_ADS_SEND_TO__ = '${googleAdsId}/${googleAdsLabel}';` : ""}
                `,
              }}
            />
          </>
        )}

        {/* Inject Meta Pixel if configured */}
        {metaPixel && (
          <script
            id={`meta-pixel-${metaPixel}`}
            dangerouslySetInnerHTML={{
              __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixel}');
              fbq('track', 'PageView');
              `,
            }}
          />
        )}

        {/* Inject TikTok Pixel if configured */}
        {tiktokPixel && (
          <script
            id={`tiktok-pixel-${tiktokPixel}`}
            dangerouslySetInnerHTML={{
              __html: `
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                ttq.load('${tiktokPixel}');
                ttq.page();
              }(window, document, 'ttq');
              `,
            }}
          />
        )}
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prerender: [
                {
                  source: "list",
                  urls: ["/"],
                  eagerness: "moderate",
                },
                {
                  where: {
                    and: [
                      { href_matches: "/*" },
                      { not: { href_matches: "/workspace/*" } },
                      { not: { href_matches: "/painel/*" } },
                    ],
                  },
                  eagerness: "moderate",
                },
              ],
            }),
          }}
        />
      </head>
 <body className="w-full max-w-full min-h-dvh overflow-x-clip antialiased select-none font-sans">
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo principal
        </a>
 {children}
 <CookieBanner />
 <Scripts />
 </body>
 </html>
 );
}

import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/lib/cart-context";
import { WindowSizeProvider } from "@/hooks/use-mobile";
import { initSecuritySentinel } from "@/lib/security-sentinel";
import { PwaUpdatePrompt } from "@/components/pwa/pwa-update-prompt";

function RootComponent() {
 const { queryClient } = Route.useRouteContext();

 useEffect(() => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const registerServiceWorker = () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker
     .register("/sw.js", { updateViaCache: "none" })
     .then((registration) => {
      registration.update().catch(() => {});

      setInterval(() => {
       if (typeof document !== "undefined" && document.visibilityState === "visible") {
        registration.update().catch(() => {});
       }
      }, 180_000);

      if (typeof document !== "undefined") {
       document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
         registration.update().catch(() => {});
        }
       });
      }

      window.addEventListener("online", () => {
       registration.update().catch(() => {});
      });

      registration.addEventListener("updatefound", () => {
       const newWorker = registration.installing;
       if (newWorker) {
        newWorker.addEventListener("statechange", () => {
         if (newWorker.state === "activated") {
          queryClient.invalidateQueries().catch(() => {});
         }
        });
       }
      });
     })
     .catch((err) => {
      console.error("ServiceWorker registration failed:", err);
     });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
     if (!hadController) return;
     const now = Date.now();
     const lastReload = Number(sessionStorage.getItem("waesy_sw_reloaded_at") || "0");
     if (!refreshing && now - lastReload > 10_000) {
      refreshing = true;
      sessionStorage.setItem("waesy_sw_reloaded_at", String(now));
      window.location.reload();
     }
    });
  };

  if (document.readyState === "complete") {
    registerServiceWorker();
  } else {
    window.addEventListener("load", registerServiceWorker, { once: true });
  }
 }, [queryClient]);

 // ── Sentinel de Segurança (passivo, não bloqueia UX) & Higienização de Cookies Auth ──
 useEffect(() => {
  import("@/lib/supabase")
   .then(({ sanitizeBrowserAuthCookies }) => sanitizeBrowserAuthCookies())
   .catch(() => {});
  const cleanup = initSecuritySentinel();
  return cleanup;
 }, []);

 // ── Sincronização Contínua de Sessão e Auto-Refresh Zero-Bounce (DEC-445) ──
 useEffect(() => {
  if (typeof window === "undefined") return;
  let authSubscription: { unsubscribe: () => void } | null = null;
  let lastSyncedAccessToken: string | null = null;
  import("@/lib/supabase").then(async ({ getBrowserClient }) => {
   const {
    inspectCanonicalSessionFromCookies,
    parseRawCookieStringPreservingDuplicates,
   } = await import("@/lib/auth-cookie-sanitizer");
   const client = getBrowserClient();
   const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    if (
     (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") &&
     session?.access_token &&
     session?.refresh_token
    ) {
     if (lastSyncedAccessToken === session.access_token) {
      return;
     }
     if (event === "SIGNED_IN" && typeof document !== "undefined") {
      const existingMeta = inspectCanonicalSessionFromCookies(
       parseRawCookieStringPreservingDuplicates(document.cookie || ""),
      );
      if (existingMeta?.accessToken === session.access_token) {
       lastSyncedAccessToken = session.access_token;
       return;
      }
     }
     lastSyncedAccessToken = session.access_token;
     import("@/services/auth.functions").then(({ syncSessionToCookies }) => {
      void syncSessionToCookies({
       data: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
       },
      }).catch(() => {});
     });
    }
   });
   authSubscription = subscription;
  });

  return () => {
   if (authSubscription) authSubscription.unsubscribe();
  };
 }, []);

 return (
  <QueryClientProvider client={queryClient}>
   <WindowSizeProvider>
    <CartProvider>
    {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
    <Outlet />
    <Toaster />
    {/* Seamless Release Protocol (V120): toast de atualização silencioso */}
    <PwaUpdatePrompt />
   </CartProvider>
  </WindowSizeProvider>
  </QueryClientProvider>
 );
}

