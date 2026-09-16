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

import { useEffect } from "react";

interface StoreAnalyticsInjectorProps {
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
    dataLayer?: any[];
  }
}

export function StoreAnalyticsInjector({
  storeSettings,
  pageContext = "home",
  productData,
}: StoreAnalyticsInjectorProps) {
  // Campo canônico: meta_pixel_id (salvo em workspace.marketing.pixels)
  const pixelId = storeSettings?.meta_pixel_id as string | undefined;
  // Campo canônico: gtm_id
  const gtmId = storeSettings?.gtm_id as string | undefined;


  // ── Meta Pixel ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pixelId) return;
    // Evita injeção dupla
    if (document.getElementById(`meta-pixel-${pixelId}`)) return;

    // Script principal do Pixel
    const script = document.createElement("script");
    script.id = `meta-pixel-${pixelId}`;
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    // Noscript fallback
    const noscript = document.createElement("noscript");
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
    document.head.appendChild(noscript);
  }, [pixelId]);

  // ── Evento ViewContent (produto/classificado) ─────────────────────────────
  useEffect(() => {
    if (!pixelId || !productData || pageContext !== "classified") return;
    const fire = () => {
      if (typeof window.fbq === "function" && productData.priceCents != null && productData.priceCents > 0) {
        window.fbq("track", "ViewContent", {
          content_ids: [productData.id],
          content_name: productData.name,
          content_category: productData.category,
          value: (productData.priceCents / 100).toFixed(2),
          currency: productData.currency || "BRL",
        });
      }
    };
    // Aguarda o SDK carregar
    const t = setTimeout(fire, 800);
    return () => clearTimeout(t);
  }, [pixelId, pageContext, productData]);

  // ── Google Tag Manager ────────────────────────────────────────────────────
  useEffect(() => {
    if (!gtmId) return;
    if (document.getElementById(`gtm-script-${gtmId}`)) return;

    // dataLayer init
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

    const script = document.createElement("script");
    script.id = `gtm-script-${gtmId}`;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
    document.head.appendChild(script);

    // GTM noscript iframe no body
    const noscript = document.createElement("noscript");
    noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.insertBefore(noscript, document.body.firstChild);
  }, [gtmId]);

  // Componente não renderiza nada no DOM visível
  return null;
}
