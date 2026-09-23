import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
 Outlet,
 Link,
 createRootRouteWithContext,
 useRouter,
 HeadContent,
 Scripts,
 isRedirect,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { CookieBanner } from "@/components/commerce/cookie-banner";

import appCss from "../styles.css?url";
import { getThemeSettings, getPublicStoreSettings } from "@/services/cms.functions";
import { themeInitScript } from "@/lib/theme";

function NotFoundComponent() {
 return (
 <div className="flex min-h-screen items-center justify-center bg-background px-4">
 <div className="max-w-md text-center">
 <h1 className="text-7xl font-bold text-foreground">404</h1>
 <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
 <p className="mt-2 text-sm text-muted-foreground">
 A página que você está procurando não existe ou foi movida.
 </p>
 <div className="mt-6">
 <Link
 to="/"
 className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
 >
 Voltar ao início
 </Link>
 </div>
 </div>
 </div>
 );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  if (isRedirect(error)) {
    throw error;
  }

  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Algo deu errado</h1>
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar esta página. Tente novamente ou volte ao início.
        </p>
        {error?.message && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-left overflow-x-auto text-xs font-mono">
            <span className="font-bold block mb-1">Diagnóstico do Erro:</span>
            {error.message}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent cursor-pointer"
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
 head: ({ loaderData }) => {
 const storeRaw = (loaderData as any)?.store;
 const store = storeRaw?.data || storeRaw;
 const brand = (loaderData as any)?.brand;
 const theme = (loaderData as any)?.theme;
 const storeName = brand?.platform_name || store?.name || "Waesy";

 const seoTitle = brand?.seo_title || store?.seo_title || storeName;
 const seoDesc =
 brand?.seo_description ||
 store?.seo_description ||
 store?.description ||
 "Explore mercado, farmácia, gastronomia, empregos, eventos culturais, mobilidade e classificados na sua região.";
 const seoKeywords = store?.seo_keywords || "";

 const metaTags = [
 { charSet: "utf-8" },
 {
 name: "viewport",
 content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, interactive-widget=resizes-content",
 },
 { title: seoTitle },
 {
 name: "description",
 content: seoDesc,
 },
 { name: "author", content: storeName },
 { name: "theme-color", content: theme?.background_color || "#09090b" },
 { name: "mobile-web-app-capable", content: "yes" },
 { name: "apple-mobile-web-app-capable", content: "yes" },
 { name: "apple-mobile-web-app-status-bar-style", content: "default" },
 { property: "og:title", content: seoTitle },
 {
 property: "og:description",
 content: seoDesc,
 },
 { property: "og:type", content: "website" },
 { name: "twitter:card", content: "summary_large_image" },
 ];

 if (seoKeywords) {
 metaTags.push({ name: "keywords", content: seoKeywords });
 }

 const faviconUrl =
 brand?.favicon_url ||
 brand?.faviconUrl ||
 store?.faviconUrl ||
 store?.settings?.faviconUrl ||
 store?.settings?.favicon_url ||
 theme?.favicon_url ||
 theme?.faviconUrl ||
 "/favicon.svg";

 return {
 meta: metaTags,
 links: [
 { rel: "manifest", href: "/manifest.json" },
 { rel: "apple-touch-icon", href: brand?.logo_url || "/icons/icon-192x192.png" },
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
 href: `https://fonts.googleapis.com/css2?family=${(theme?.font_body || "Inter").replace(/ /g, "+")}:wght@400;500;600;700&family=${(theme?.font_heading || "Oswald").replace(/ /g, "+")}:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700;800&display=swap`,
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
 const { theme, pixels } = ((Route.useLoaderData?.() as any) || {});

  const metaPixel = pixels?.find((p: any) => p.provider === "meta_pixel")?.pixelId;
  const gaPixel = pixels?.find((p: any) => p.provider === "google_analytics")?.measurementId;
  const googleAdsId = pixels?.find((p: any) => p.provider === "google_ads")?.conversionId;
  const tiktokPixel = pixels?.find((p: any) => p.provider === "tiktok_pixel")?.pixelId;

  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        {/* Script anti-FOUC: aplica classe .dark/.light antes do primeiro paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />

        {/* Inject Google Analytics if configured */}
        {gaPixel && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaPixel}`}></script>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaPixel}');
                `,
              }}
            />
          </>
        )}

        {/* Inject Google Ads if configured */}
        {googleAdsId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}></script>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAdsId}');
                `,
              }}
            />
          </>
        )}

        {/* Inject Meta Pixel if configured */}
        {metaPixel && (
          <script
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
      </head>
 <body>
 {children}
 <CookieBanner />
 <Scripts />
 </body>
 </html>
 );
}

import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/lib/cart-context";
import { initSecuritySentinel } from "@/lib/security-sentinel";

function RootComponent() {
 const { queryClient } = Route.useRouteContext();

 useEffect(() => {
 if (typeof window !== "undefined" && "serviceWorker" in navigator) {
 window.addEventListener("load", () => {
 navigator.serviceWorker.register("/sw.js").catch((err) => {
 console.error("ServiceWorker registration failed:", err);
 });
 });
 }
 }, []);

 // ── Sentinel de Segurança (passivo, não bloqueia UX) ──
 useEffect(() => {
 const cleanup = initSecuritySentinel();
 return cleanup;
 }, []);

 return (
 <QueryClientProvider client={queryClient}>
 <CartProvider>
 {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
 <Outlet />
 <Toaster />
 </CartProvider>
 </QueryClientProvider>
 );
}
