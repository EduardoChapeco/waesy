/**
 * StoreAnalyticsInjector
 * Injeta dinamicamente Pixel Meta (Facebook) e Google Tag Manager
 * nas páginas públicas de vitrine com base nas configs da loja.
 *
 * Uso: <StoreAnalyticsInjector storeSettings={store.settings} />
 *
 * Regra LGPD: Apenas injeta se o usuário não optou por "privacy_mode".
 * Nenhum dado de autenticação é passado aos scripts externos.
 */

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { collectClientAttribution } from "@/lib/attribution-collector";
import { getPublicStorePixels, recordStorefrontAttributionVisit } from "@/services/pixels.functions";
import { selectMatchedPixelsForContext, type PublicSourcePixelDTO } from "@/lib/pixel-routing";

interface StoreAnalyticsInjectorProps {
  /** ID da loja ativa para persistir touchpoints de atribuição (anúncio -> vitrine -> CRM/WhatsApp) */
  storeId?: string | null;
  /** Objeto store.settings vindo do banco (JSONB) */
  storeSettings?: Record<string, any> | null;
  /** Contexto: qual evento PageView disparar */
  pageContext?: "home" | "product" | "classified" | "checkout" | "purchase";
  /** Dados de produto para evento ViewContent/Purchase */
  productData?: {
    id?: string;
    name?: string;
    category?: string;
    priceCents?: number;
    currency?: string;
  };
}

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
    ttq?: any;
    dataLayer?: any[];
    __WAESY_GOOGLE_ADS_SEND_TO__?: string;
  }
}

export function StoreAnalyticsInjector({
  storeId,
  storeSettings,
  pageContext = "home",
  productData,
}: StoreAnalyticsInjectorProps) {
  const { data: dbPixels, isLoading: isPixelsLoading, isError: isPixelsError } = useQuery({
    queryKey: ["public-store-pixels", storeId],
    queryFn: () => (storeId ? getPublicStorePixels({ data: { storeId } }) : null),
    enabled: Boolean(storeId),
    staleTime: 1000 * 60 * 5,
  });
  void isPixelsLoading;
  void isPixelsError;

  const multiPixels = useMemo(
    () =>
      (Array.isArray((dbPixels as any)?.source_pixels)
        ? ((dbPixels as any).source_pixels as PublicSourcePixelDTO[])
        : []),
    [dbPixels],
  );
  const currentAttr = useMemo(() => (typeof window !== "undefined" ? collectClientAttribution() : {}), []);
  const routingContext = useMemo(
    () => ({
      campaignId: (currentAttr as any).campaignId || null,
      adId: (currentAttr as any).adId || null,
      formId: (currentAttr as any).formId || null,
      landingPath: typeof window !== "undefined" ? window.location.pathname : null,
    }),
    [currentAttr],
  );

  const metaPixelIds = useMemo(() => {
    const matched = selectMatchedPixelsForContext(multiPixels, routingContext, "PageView", "meta_pixel")
      .map((p) => p.external_pixel_id)
      .filter(Boolean);
    const primary = (dbPixels?.meta_pixel_id || storeSettings?.meta_pixel_id || undefined) as string | undefined;
    return Array.from(new Set([...(primary ? [primary] : []), ...matched]));
  }, [multiPixels, routingContext, dbPixels?.meta_pixel_id, storeSettings?.meta_pixel_id]);

  const ga4Ids = useMemo(() => {
    const matched = selectMatchedPixelsForContext(multiPixels, routingContext, "PageView", "ga4")
      .map((p) => p.external_pixel_id)
      .filter(Boolean);
    const primary = (dbPixels?.google_analytics_id || storeSettings?.ga4_measurement_id || undefined) as string | undefined;
    return Array.from(new Set([...(primary ? [primary] : []), ...matched]));
  }, [multiPixels, routingContext, dbPixels?.google_analytics_id, storeSettings?.ga4_measurement_id]);

  const googleAdsIds = useMemo(() => {
    const matched = selectMatchedPixelsForContext(multiPixels, routingContext, "PageView", "google_ads")
      .map((p) => p.external_pixel_id)
      .filter(Boolean);
    const primary = (dbPixels?.google_ads_id || storeSettings?.google_ads_id || undefined) as string | undefined;
    return Array.from(new Set([...(primary ? [primary] : []), ...matched]));
  }, [multiPixels, routingContext, dbPixels?.google_ads_id, storeSettings?.google_ads_id]);

  const tiktokPixelIds = useMemo(() => {
    const matched = selectMatchedPixelsForContext(multiPixels, routingContext, "PageView", "tiktok_pixel")
      .map((p) => p.external_pixel_id)
      .filter(Boolean);
    const primary = (dbPixels?.tiktok_pixel_id || storeSettings?.tiktok_pixel_id || undefined) as string | undefined;
    return Array.from(new Set([...(primary ? [primary] : []), ...matched]));
  }, [multiPixels, routingContext, dbPixels?.tiktok_pixel_id, storeSettings?.tiktok_pixel_id]);

  const gtmId = (dbPixels?.gtm_id || storeSettings?.gtm_id || undefined) as string | undefined;
  const ga4Id = ga4Ids[0];
  const googleAdsId = googleAdsIds[0];
  const googleAdsLabel = (dbPixels?.google_ads_conversion_label || storeSettings?.google_ads_conversion_label || undefined) as string | undefined;
  const googleSiteVerification = (dbPixels?.google_site_verification || storeSettings?.google_site_verification || undefined) as string | undefined;
  const metaDomainVerification = (dbPixels?.meta_domain_verification || storeSettings?.meta_domain_verification || undefined) as string | undefined;
  const canTrackViewContent = dbPixels?.track_view_content ?? true;

  // ── Metatags de Verificação (Google Search Console & Meta Business Manager) ──
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (googleSiteVerification) {
      const existing = document.querySelector('meta[name="google-site-verification"]');
      if (!existing) {
        const meta = document.createElement("meta");
        meta.id = "waesy-google-site-verification";
        meta.name = "google-site-verification";
        meta.content = googleSiteVerification;
        document.head.appendChild(meta);
      }
    }
    if (metaDomainVerification) {
      const existingMeta = document.querySelector('meta[name="facebook-domain-verification"]');
      if (!existingMeta) {
        const meta = document.createElement("meta");
        meta.id = "waesy-meta-domain-verification";
        meta.name = "facebook-domain-verification";
        meta.content = metaDomainVerification;
        document.head.appendChild(meta);
      }
    }
  }, [googleSiteVerification, metaDomainVerification]);

  // ── Meta Pixel (Multi-Pixel com deduplicacao DOM) ──────────────────────────
  useEffect(() => {
    if (metaPixelIds.length === 0) return;

    if (!document.getElementById("waesy-meta-fbevents-base")) {
      const baseScript = document.createElement("script");
      baseScript.id = "waesy-meta-fbevents-base";
      baseScript.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
      `;
      document.head.appendChild(baseScript);
    }

    for (const pxId of metaPixelIds) {
      if (document.getElementById(`meta-pixel-${pxId}`)) continue;
      const script = document.createElement("script");
      script.id = `meta-pixel-${pxId}`;
      script.innerHTML = `
        fbq('init', '${pxId}');
        fbq('trackSingle', '${pxId}', 'PageView');
      `;
      document.head.appendChild(script);
    }
  }, [metaPixelIds]);

  // ── Google Ads & Google Analytics 4 (gtag.js multi-id unificado) ──────────
  useEffect(() => {
    const allGoogleTags = Array.from(new Set([...ga4Ids, ...googleAdsIds]));
    const primaryTag = allGoogleTags[0];
    if (!primaryTag) return;

    if (googleAdsId && googleAdsLabel) {
      window.__WAESY_GOOGLE_ADS_SEND_TO__ = `${googleAdsId}/${googleAdsLabel}`;
    }

    if (!document.getElementById("waesy-gtag-js")) {
      const gtagLoader = document.createElement("script");
      gtagLoader.id = "waesy-gtag-js";
      gtagLoader.async = true;
      gtagLoader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryTag)}`;
      document.head.appendChild(gtagLoader);
    }

    const configScriptId = `waesy-gtag-config-${allGoogleTags.join("_")}`;
    if (!document.getElementById(configScriptId)) {
      window.dataLayer = window.dataLayer || [];
      if (typeof window.gtag !== "function") {
        window.gtag = function gtag(...args: unknown[]) {
          window.dataLayer!.push(args);
        };
      }
      const configScript = document.createElement("script");
      configScript.id = configScriptId;
      configScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){window.dataLayer.push(arguments);}
        window.gtag = window.gtag || gtag;
        gtag('js', new Date());
        ${allGoogleTags.map((id) => `gtag('config', '${id}');`).join("\n        ")}
      `;
      document.head.appendChild(configScript);
    }
  }, [ga4Ids, googleAdsIds, googleAdsId, googleAdsLabel]);

  // ── Evento ViewContent / view_item (produto/classificado) ─────────────────
  useEffect(() => {
    if (!productData || (pageContext !== "classified" && pageContext !== "product")) return;
    if (!canTrackViewContent) return;
    const fire = () => {
      const valueNum = productData.priceCents != null ? Number((productData.priceCents / 100).toFixed(2)) : 0;
      if (metaPixelIds.length > 0 && typeof window.fbq === "function" && valueNum > 0) {
        for (const pxId of metaPixelIds) {
          window.fbq("trackSingle", pxId, "ViewContent", {
            content_ids: [productData.id],
            content_name: productData.name,
            content_category: productData.category,
            value: valueNum,
            currency: productData.currency || "BRL",
          });
        }
      }
      if ((ga4Id || googleAdsId) && typeof window.gtag === "function") {
        window.gtag("event", "view_item", {
          currency: productData.currency || "BRL",
          value: valueNum,
          items: [{ item_id: productData.id, item_name: productData.name, price: valueNum }],
        });
      }
    };
    const t = setTimeout(fire, 800);
    return () => clearTimeout(t);
  }, [metaPixelIds, ga4Id, googleAdsId, canTrackViewContent, pageContext, productData]);

  // ── TikTok Pixel (Multi-Pixel) ────────────────────────────────────────────
  useEffect(() => {
    if (tiktokPixelIds.length === 0) return;
    for (const tkId of tiktokPixelIds) {
      if (document.getElementById(`tiktok-pixel-${tkId}`)) continue;
      const script = document.createElement("script");
      script.id = `tiktok-pixel-${tkId}`;
      script.innerHTML = `
        !function (w, d, t) {
          w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
          ttq.load('${tkId}');
          ttq.page();
        }(window, document, 'ttq');
      `;
      document.head.appendChild(script);
    }
  }, [tiktokPixelIds]);

  // ── Google Tag Manager ────────────────────────────────────────────────────
  useEffect(() => {
    if (!gtmId) return;
    if (document.getElementById(`gtm-script-${gtmId}`)) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

    const script = document.createElement("script");
    script.id = `gtm-script-${gtmId}`;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
    document.head.appendChild(script);

    const noscript = document.createElement("noscript");
    noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.insertBefore(noscript, document.body.firstChild);
  }, [gtmId]);

  // ── Persistência Automática de Touchpoint (Anúncio -> Vitrine) ─────────────
  useEffect(() => {
    if (!storeId || typeof window === "undefined") return;
    const attr = collectClientAttribution();
    const hasAdSignals = Boolean(
      attr.utmSource ||
        attr.utmCampaign ||
        attr.fbclid ||
        attr.gclid ||
        attr.gbraid ||
        attr.wbraid ||
        attr.ttclid ||
        attr.ctwaClid ||
        attr.adId ||
        attr.campaignId ||
        attr.fbc,
    );
    if (!hasAdSignals) return;

    const dedupeKey = `waesy_visit_tp_${storeId}_${attr.fbclid || attr.gclid || attr.gbraid || attr.wbraid || attr.ttclid || attr.ctwaClid || attr.utmCampaign || attr.utmSource || "direct"}`;
    try {
      if (window.sessionStorage.getItem(dedupeKey)) return;
      window.sessionStorage.setItem(dedupeKey, "1");
    } catch {}

    recordStorefrontAttributionVisit({
      data: {
        storeId,
        landingUrl: attr.landingUrl || window.location.href,
        sourceUrl: window.location.href,
        referrer: attr.referrer || document.referrer || null,
        entityType: pageContext,
        entityId: productData?.id || null,
        entityTitle: productData?.name || null,
        utmSource: attr.utmSource || null,
        utmMedium: attr.utmMedium || null,
        utmCampaign: attr.utmCampaign || null,
        utmContent: attr.utmContent || null,
        utmTerm: attr.utmTerm || null,
        fbclid: attr.fbclid || null,
        fbp: attr.fbp || null,
        fbc: attr.fbc || null,
        gclid: attr.gclid || null,
        gbraid: attr.gbraid || null,
        wbraid: attr.wbraid || null,
        ttclid: attr.ttclid || null,
        ctwaClid: attr.ctwaClid || null,
        adId: attr.adId || null,
        adsetId: attr.adsetId || null,
        campaignId: attr.campaignId || null,
        creativeId: attr.creativeId || null,
        formId: attr.formId || null,
        deviceId: attr.deviceId || null,
        visitorId: attr.deviceId || null,
        clientCity: attr.clientCity || null,
        clientState: attr.clientState || null,
        gpsLatitude: attr.gpsLatitude ?? null,
        gpsLongitude: attr.gpsLongitude ?? null,
        gpsSource: attr.gpsSource || null,
      },
    }).catch(() => {});
  }, [storeId, pageContext, productData?.id, productData?.name]);

  return null;
}
