/**
 * omni-page-seo.ts — Utilitário de Geração de Metadados Ricos & Schema.org JSON-LD
 * para Páginas Públicas do Omni-Builder (SEO + WebMCP Readiness)
 */

import type { OmniBlockInstance, OmniPageDocument } from "@/types/omni-builder";

export interface OmniPageSeoInput {
  document: any;
  storeData?: any;
  slug: string;
}

export interface GeneratedSeoMeta {
  title: string;
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  scripts: Array<{ type: string; children: string }>;
}

/**
 * Gera a coleção de metatags normativas e schemas JSON-LD conforme os blocos contidos na página.
 */
export function generateOmniPageSeo({
  document,
  storeData,
  slug,
}: OmniPageSeoInput): GeneratedSeoMeta {
  if (!document) {
    return {
      title: "Página não encontrada — Waesy",
      meta: [{ title: "Página não encontrada" }],
      links: [{ rel: "manifest", href: "/manifest.json" }],
      scripts: [],
    };
  }

  const pageTitle = document.title || "Página";
  const storeName = storeData?.name || storeData?.trade_name || "";
  const fullTitle = storeName ? `${pageTitle} • ${storeName}` : `${pageTitle} — Waesy`;

  const omniPage = document.settings?.omni_page as OmniPageDocument | undefined;
  const blocks: OmniBlockInstance[] = Array.isArray(omniPage?.blocks) ? omniPage.blocks : [];

  // 1. Descrição textual refinada derivada do documento ou primeiro bloco de texto
  let pageDescription = document.description || "";
  if (!pageDescription) {
    const heroBlock = blocks.find((b) => b.type.startsWith("hero_") || b.type.includes("hero"));
    if (heroBlock?.config?.subtitle) {
      pageDescription = String(heroBlock.config.subtitle);
    } else if (heroBlock?.config?.title) {
      pageDescription = String(heroBlock.config.title);
    } else {
      pageDescription = `Acesse ${pageTitle} no ecossistema Waesy. Soluções e serviços locais de alta qualidade.`;
    }
  }

  // 2. Imagem de capa (OG / Twitter)
  let coverImage = "";
  const heroWithImg = blocks.find((b) => b.config?.imageUrl || b.config?.image);
  if (heroWithImg) {
    coverImage = heroWithImg.config?.imageUrl || heroWithImg.config?.image || "";
  } else if (storeData?.cover_url || storeData?.logo_url) {
    coverImage = storeData.cover_url || storeData.logo_url;
  }

  const storeId = document.store_id || storeData?.id;
  const storeCity = storeData?.city || storeData?.address?.city || "";
  const storeState = storeData?.state || storeData?.address?.state || "";
  const canonicalPath = `/paginas/${slug}`;

  // 3. Montar Meta Tags
  const meta: Array<Record<string, string>> = [
    { name: "description", content: pageDescription },
    { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "mobile-web-app-capable", content: "yes" },
    // OpenGraph
    { property: "og:type", content: "website" },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: pageDescription },
    { property: "og:site_name", content: storeName || "Waesy" },
    // Twitter Cards
    { name: "twitter:card", content: coverImage ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: pageDescription },
    // WebMCP / AI Discovery Semantic Endpoint
    { name: "webmcp-endpoint", content: `/api/webmcp/pages/${slug}` },
    { name: "ai-content-declaration", content: "waesy-omni-builder-v2" },
  ];

  if (coverImage) {
    meta.push(
      { property: "og:image", content: coverImage },
      { name: "twitter:image", content: coverImage }
    );
  }

  // Geotargeting se houver endereço
  if (storeCity) {
    meta.push({ name: "geo.placename", content: `${storeCity}, ${storeState}`.trim() });
    if (storeData?.latitude && storeData?.longitude) {
      meta.push({ name: "geo.position", content: `${storeData.latitude};${storeData.longitude}` });
      meta.push({ name: "ICBM", content: `${storeData.latitude}, ${storeData.longitude}` });
    }
  }

  // 4. Schema.org JSON-LD Builders
  const jsonLdGraph: any[] = [];

  // Entidade WebSite / WebPage
  const webPageSchema: any = {
    "@type": "WebPage",
    "@id": `https://waesy.com.br${canonicalPath}#webpage`,
    url: `https://waesy.com.br${canonicalPath}`,
    name: fullTitle,
    description: pageDescription,
    isPartOf: {
      "@type": "WebSite",
      "@id": "https://waesy.com.br/#website",
      name: "Waesy",
      url: "https://waesy.com.br",
    },
  };
  if (coverImage) {
    webPageSchema.primaryImageOfPage = {
      "@type": "ImageObject",
      url: coverImage,
    };
  }
  jsonLdGraph.push(webPageSchema);

  // Entidade LocalBusiness se houver loja vinculada (Com Cartão CNPJ, GEO e Grafo de Backlinks)
  if (storeData && storeName) {
    const storeSlugOrId = storeData.slug || storeId || slug;
    const rawCnpj =
      storeData.cnpj ||
      storeData.document_cnpj ||
      storeData.settings?.cnpj ||
      storeData.metadata?.cnpj_fiscal_data?.cnpj ||
      undefined;
    const sameAsBacklinks = [
      `https://waesy.com.br/loja/${storeSlugOrId}`,
      `https://waesy.com.br/diretorio/${storeData.id || storeSlugOrId}`,
      `https://waesy.com.br/places/${storeSlugOrId}`,
      storeData.website || storeData.website_url || storeData.settings?.website,
      storeData.instagram
        ? storeData.instagram.startsWith("http")
          ? storeData.instagram
          : `https://instagram.com/${String(storeData.instagram).replace(/^@/, "")}`
        : undefined,
    ].filter(Boolean);

    const localBusinessSchema: any = {
      "@type": "LocalBusiness",
      "@id": `https://waesy.com.br/loja/${storeSlugOrId}#localbusiness`,
      name: storeName,
      legalName:
        storeData.corporate_name ||
        storeData.legal_name ||
        storeData.settings?.corporate_name ||
        storeData.metadata?.cnpj_fiscal_data?.razao_social ||
        storeName,
      taxID: rawCnpj,
      description: storeData.description || pageDescription,
      url: `https://waesy.com.br${canonicalPath}`,
      telephone: storeData.phone || storeData.whatsapp || storeData.contact_whatsapp || undefined,
      sameAs: sameAsBacklinks,
      isPartOf: {
        "@id": "https://waesy.com.br/#organization",
      },
    };

    if (storeData.logo_url || storeData.avatar_url) {
      localBusinessSchema.logo = storeData.logo_url || storeData.avatar_url;
      localBusinessSchema.image = storeData.logo_url || storeData.avatar_url;
    }

    if (storeCity) {
      localBusinessSchema.address = {
        "@type": "PostalAddress",
        streetAddress: storeData.address || storeData.street || undefined,
        addressLocality: storeCity,
        addressRegion: storeState || "SC",
        postalCode: storeData.postal_code || storeData.cep || undefined,
        addressCountry: "BR",
      };
    }

    if (storeData.latitude && storeData.longitude) {
      localBusinessSchema.geo = {
        "@type": "GeoCoordinates",
        latitude: storeData.latitude,
        longitude: storeData.longitude,
      };
    }

    jsonLdGraph.push(localBusinessSchema);
  }

  // Entidade FAQPage se a página possuir blocos FAQ
  const faqBlocks = blocks.filter((b) => b.type === "faq_clean_accordion" || b.type.includes("faq"));
  for (const faqBlock of faqBlocks) {
    const items = faqBlock.config?.items;
    if (Array.isArray(items) && items.length > 0) {
      const faqSchema = {
        "@type": "FAQPage",
        mainEntity: items.map((item: any) => ({
          "@type": "Question",
          name: String(item.question || ""),
          acceptedAnswer: {
            "@type": "Answer",
            text: String(item.answer || ""),
          },
        })),
      };
      jsonLdGraph.push(faqSchema);
    }
  }

  const scripts: Array<{ type: string; children: string }> = [];
  if (jsonLdGraph.length > 0) {
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": jsonLdGraph,
    };
    scripts.push({
      type: "application/ld+json",
      children: JSON.stringify(structuredData),
    });
  }

  const links: Array<Record<string, string>> = [
    {
      rel: "manifest",
      href: storeId ? `/api/pwa/manifest.json?storeId=${storeId}` : "/manifest.json",
    },
    {
      rel: "canonical",
      href: `https://waesy.com.br${canonicalPath}`,
    },
    {
      rel: "alternate",
      type: "text/markdown",
      href: `https://waesy.com.br${canonicalPath}`,
    },
  ];

  return {
    title: fullTitle,
    meta,
    links,
    scripts,
  };
}
