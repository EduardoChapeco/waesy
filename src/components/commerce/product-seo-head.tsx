import { useEffect } from "react";

export interface ProductSeoProps {
  title?: string;
  productTitle?: string;
  description?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  canonicalUrl?: string;
  priceCents?: number;
  currency?: string;
  sku?: string;
  brandName?: string;
  categoryName?: string;
  category?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  condition?: "NewCondition" | "RefurbishedCondition" | "UsedCondition";
  storeName?: string;
  inStock?: boolean;
  slug?: string;
}

/**
 * ProductSeoHead — Injeta dinamicamente metatags de SEO, OpenGraph,
 * Twitter Cards e Microdados Schema.org JSON-LD para indexação por buscadores
 * (Google, Bing) e agentes autônomos de IA (WebMCP).
 */
export function ProductSeoHead({
  title,
  productTitle,
  description,
  image,
  imageUrl,
  canonicalUrl,
  priceCents,
  currency = "BRL",
  sku,
  brandName,
  categoryName,
  availability = "InStock",
  condition = "NewCondition",
  storeName,
}: ProductSeoProps) {
  const effectiveTitle = title || productTitle || "";
  const effectiveImage = image || imageUrl || null;

  useEffect(() => {
    if (typeof document === "undefined") return;

    // 1. Atualizar Título da Página
    if (effectiveTitle) {
      document.title = storeName ? `${effectiveTitle} | ${storeName}` : `${effectiveTitle} | Waesy Marketplace`;
    }

    // 2. Helper para setar ou criar meta tags
    const setMeta = (attr: "name" | "property", value: string, content: string | undefined | null) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${value}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, value);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const cleanDescription = description?.slice(0, 160) || "Confira os detalhes deste produto no ecossistema Waesy.";
    const cleanUrl = canonicalUrl || (typeof window !== "undefined" ? window.location.href : "");
    const priceFormatted = priceCents ? (priceCents / 100).toFixed(2) : undefined;

    // Standard SEO
    setMeta("name", "description", cleanDescription);

    // OpenGraph (Facebook / WhatsApp / Instagram)
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", cleanDescription);
    setMeta("property", "og:type", "product");
    if (cleanUrl) setMeta("property", "og:url", cleanUrl);
    if (image) setMeta("property", "og:image", image);
    if (priceFormatted) {
      setMeta("property", "product:price:amount", priceFormatted);
      setMeta("property", "product:price:currency", currency);
    }
    setMeta("property", "product:availability", availability.toLowerCase());

    // Twitter Card
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", cleanDescription);
    if (image) setMeta("name", "twitter:image", image);

    // Schema.org JSON-LD
    const jsonLdData: Record<string, any> = {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: title,
      description: cleanDescription,
      image: image ? [image] : undefined,
      sku: sku || undefined,
      brand: brandName ? { "@type": "Brand", name: brandName } : undefined,
      category: categoryName || undefined,
    };

    if (priceFormatted) {
      jsonLdData.offers = {
        "@type": "Offer",
        url: cleanUrl,
        priceCurrency: currency,
        price: priceFormatted,
        availability: `https://schema.org/${availability}`,
        itemCondition: `https://schema.org/${condition}`,
      };
    }

    let script = document.getElementById("product-jsonld") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "product-jsonld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLdData);
  }, [title, description, image, canonicalUrl, priceCents, currency, sku, brandName, categoryName, availability, condition, storeName]);

  return null;
}
