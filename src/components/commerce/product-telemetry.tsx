import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicStorePixels, dispatchMetaCapiEvent } from "@/services/pixels.functions";
import { ProductSeoHead, type ProductSeoProps } from "./product-seo-head";

export interface ProductTelemetryProps extends ProductSeoProps {
  storeId?: string | null;
  productId: string;
  category?: string;
}

/**
 * ProductTelemetry — Guardião unificado de Telemetria e SEO Comercial.
 * Injeta pixels (Meta, Google, TikTok), dispara eventos ViewContent (browser + CAPI server-side),
 * e renderiza metatags OpenGraph e microdados Schema.org JSON-LD.
 */
export function ProductTelemetry({
  storeId,
  productId,
  title,
  description,
  image,
  canonicalUrl,
  priceCents,
  currency = "BRL",
  sku,
  brandName,
  categoryName,
  availability = "InStock",
  condition = "NewCondition",
  storeName,
}: ProductTelemetryProps) {
  const trackedRef = useRef(false);

  // Busca configurações públicas de pixels da loja
  const { data: pixelConfig } = useQuery({
    queryKey: ["public-store-pixels", storeId],
    queryFn: () => (storeId ? getPublicStorePixels({ data: { storeId } }) : null),
    enabled: Boolean(storeId),
    staleTime: 1000 * 60 * 10, // 10 minutos
  });

  // 1. Injeta script do Meta Pixel dinamicamente se a loja tiver meta_pixel_id configurado
  useEffect(() => {
    if (typeof window === "undefined" || !pixelConfig?.meta_pixel_id) return;

    const pixelId = pixelConfig.meta_pixel_id;
    const scriptId = `meta-pixel-${pixelId}`;

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.text = `
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
    }
  }, [pixelConfig?.meta_pixel_id]);

  // 2. Dispara evento ViewContent (Browser + Server-Side CAPI)
  useEffect(() => {
    if (trackedRef.current || !productId) return;
    trackedRef.current = true;

    const valueNum = priceCents ? priceCents / 100 : 0;
    const url = canonicalUrl || (typeof window !== "undefined" ? window.location.href : "");

    // Disparo Client-Side Meta Pixel
    if (typeof (window as any).fbq === "function" && pixelConfig?.track_view_content) {
      (window as any).fbq("track", "ViewContent", {
        content_name: title,
        content_ids: [productId],
        content_type: "product",
        value: valueNum,
        currency,
      });
    }

    // Disparo Client-Side Google Analytics (GA4 / GTM)
    if (typeof (window as any).gtag === "function") {
      (window as any).gtag("event", "view_item", {
        currency,
        value: valueNum,
        items: [
          {
            item_id: productId,
            item_name: title,
            price: valueNum,
            item_brand: brandName,
            item_category: categoryName,
          },
        ],
      });
    }

    // Disparo Server-Side Meta CAPI (Resiliente a bloqueadores de anúncios e iOS 14.5+)
    if (storeId && pixelConfig?.meta_pixel_id && pixelConfig?.track_view_content) {
      dispatchMetaCapiEvent({
        data: {
          storeId,
          eventName: "ViewContent",
          eventSourceUrl: url,
          customData: {
            content_name: title,
            content_ids: [productId],
            content_type: "product",
            value: valueNum,
            currency,
          },
        },
      }).catch((err) => {
        console.debug("[telemetry] CAPI ViewContent fallback:", err);
      });
    }

    // 3. Incremento Real e Sistêmico de Visualizações no PostgreSQL (Anti-Spam por Sessão)
    if (productId && typeof window !== "undefined") {
      try {
        const sessionKey = `waesy_viewed_item_${productId}`;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, "1");
          // Incrementa telemetria no catálogo de produtos ou classificados reais
          import("@/services/catalog.functions")
            .then(({ trackProductView }) => {
              trackProductView({ data: { productId } }).catch(() => {
                // Fallback para classificados caso o item pertença ao módulo de anúncios
                import("@/services/classifieds.functions")
                  .then(({ trackClassifiedView }) => {
                    trackClassifiedView({ data: { adId: productId } }).catch(() => {});
                  })
                  .catch(() => {});
              });
            })
            .catch(() => {});
        }
      } catch {}
    }
  }, [productId, title, priceCents, currency, brandName, categoryName, canonicalUrl, storeId, pixelConfig]);

  return (
    <ProductSeoHead
      title={title}
      description={description}
      image={image}
      canonicalUrl={canonicalUrl}
      priceCents={priceCents}
      currency={currency}
      sku={sku}
      brandName={brandName}
      categoryName={categoryName}
      availability={availability}
      condition={condition}
      storeName={storeName}
    />
  );
}

/**
 * Disparador de evento AddToCart para botões de compra rápida
 */
export function trackAddToCartEvent({
  storeId,
  productId,
  productTitle,
  priceCents,
  quantity = 1,
  currency = "BRL",
}: {
  storeId?: string | null;
  productId: string;
  productTitle: string;
  priceCents: number;
  quantity?: number;
  currency?: string;
}) {
  const valueNum = (priceCents * quantity) / 100;

  // 1. Browser Meta Pixel
  if (typeof (window as any).fbq === "function") {
    (window as any).fbq("track", "AddToCart", {
      content_name: productTitle,
      content_ids: [productId],
      content_type: "product",
      value: valueNum,
      currency,
    });
  }

  // 2. Browser Google Analytics
  if (typeof (window as any).gtag === "function") {
    (window as any).gtag("event", "add_to_cart", {
      currency,
      value: valueNum,
      items: [
        {
          item_id: productId,
          item_name: productTitle,
          price: priceCents / 100,
          quantity,
        },
      ],
    });
  }

  // 3. Server-Side CAPI
  if (storeId) {
    dispatchMetaCapiEvent({
      data: {
        storeId,
        eventName: "AddToCart",
        eventSourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
        customData: {
          content_name: productTitle,
          content_ids: [productId],
          content_type: "product",
          value: valueNum,
          currency,
          quantity,
        },
      },
    }).catch(() => {});
  }
}

/**
 * Disparador unificado de evento Purchase para telas de confirmação de pedido e gateways de pagamento
 */
export function trackPurchaseEvent({
  storeId,
  orderId,
  orderToken,
  totalCents,
  items = [],
  currency = "BRL",
  customerEmail,
  customerPhone,
}: {
  storeId?: string | null;
  orderId: string;
  orderToken?: string;
  totalCents: number;
  items?: Array<{
    productId?: string;
    productTitle?: string;
    priceCents?: number;
    quantity?: number;
  }>;
  currency?: string;
  customerEmail?: string;
  customerPhone?: string;
}) {
  const valueNum = totalCents ? totalCents / 100 : 0;
  const contentIds = items.map((it) => it.productId).filter(Boolean) as string[];
  const numItems = items.reduce((acc, it) => acc + (it.quantity || 1), 0);

  // 1. Browser Meta Pixel
  if (typeof (window as any).fbq === "function") {
    (window as any).fbq("track", "Purchase", {
      content_ids: contentIds.length > 0 ? contentIds : [orderId],
      content_type: "product",
      value: valueNum,
      currency,
      num_items: numItems,
    });
  }

  // 2. Browser Google Analytics 4 (purchase)
  if (typeof (window as any).gtag === "function") {
    (window as any).gtag("event", "purchase", {
      transaction_id: orderToken || orderId,
      value: valueNum,
      currency,
      items: items.map((it) => ({
        item_id: it.productId || orderId,
        item_name: it.productTitle || "Produto",
        price: it.priceCents ? it.priceCents / 100 : 0,
        quantity: it.quantity || 1,
      })),
    });
  }

  // 3. Browser TikTok Pixel
  if (typeof (window as any).ttq === "object" && typeof (window as any).ttq.track === "function") {
    (window as any).ttq.track("CompletePayment", {
      content_id: orderId,
      value: valueNum,
      currency,
    });
  }

  // 4. Server-Side Meta CAPI
  if (storeId) {
    dispatchMetaCapiEvent({
      data: {
        storeId,
        eventName: "Purchase",
        eventSourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
        customData: {
          order_id: orderId,
          order_token: orderToken,
          value: valueNum,
          currency,
          content_ids: contentIds.length > 0 ? contentIds : [orderId],
          num_items: numItems,
        },
        userData: {
          email: customerEmail,
          phone: customerPhone,
        },
      },
    }).catch((err) => {
      console.debug("[telemetry] CAPI Purchase fallback:", err);
    });
  }
}

