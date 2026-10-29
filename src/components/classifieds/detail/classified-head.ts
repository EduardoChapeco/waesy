export function buildClassifiedHead({
  loaderData,
}: {
  loaderData?: { classified: any; isOwner: boolean; canManage: boolean; viewerContext: string };
}) {
  const classified = loaderData?.classified;
  const cover = classified?.images?.[0] || "";
  const title = classified?.title ? `${classified.title} | Classificados Waesy` : "Classificado | Waesy";
  const description = classified?.content?.slice(0, 160) || "Anúncio comunitário na plataforma Waesy.";
  const canonicalUrl = classified?.id
    ? `https://waesy.com.br/classificados/${classified.id}`
    : "https://waesy.com.br/classificados";

  const category = (classified?.category || "").toLowerCase();
  const subniche = (classified?.subniche || "").toLowerCase();
  const priceCents = Number(classified?.price_cents || 0);
  const city = classified?.city || classified?.location_name || "São Miguel do Oeste";
  const state = classified?.state || "SC";
  const formattedPrice = priceCents > 0 ? (priceCents / 100).toFixed(2) : undefined;

  let schemaType = "Product";
  let specificFields: Record<string, any> = {};

  if (category === "real_estate" || category === "imoveis" || subniche.includes("imovel") || subniche.includes("apartamento") || subniche.includes("casa")) {
    schemaType = "RealEstateListing";
    specificFields = {
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
        addressRegion: state,
        addressCountry: "BR",
      },
    };
  } else if (category === "vehicles" || category === "veiculos" || subniche.includes("carro") || subniche.includes("moto")) {
    schemaType = "Vehicle";
    specificFields = {
      vehicleModelDate: classified?.vehicle_year || undefined,
      brand: classified?.vehicle_brand ? { "@type": "Brand", name: classified.vehicle_brand } : undefined,
    };
  } else if (category === "service" || category === "servicos" || category === "job") {
    schemaType = "Service";
    specificFields = {
      provider: {
        "@type": "Person",
        name: classified.profiles?.full_name || classified.store_name || "Anunciante Waesy",
      },
      areaServed: city,
    };
  } else if (category === "courses" || category === "cursos") {
    schemaType = "Course";
    specificFields = {
      provider: {
        "@type": "Organization",
        name: classified.store_name || "Waesy Cursos",
      },
    };
  } else {
    schemaType = "Product";
    specificFields = {
      brand: classified?.store_name ? { "@type": "Brand", name: classified.store_name } : undefined,
    };
  }

  const jsonLd = classified
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": schemaType,
        name: classified.title,
        description: classified.content?.slice(0, 300) || description,
        image: cover ? [cover] : undefined,
        url: canonicalUrl,
        offers: {
          "@type": "Offer",
          priceCurrency: "BRL",
          price: formattedPrice,
          availability:
            classified.status === "active"
              ? "https://schema.org/InStock"
              : "https://schema.org/SoldOut",
          url: canonicalUrl,
        },
        ...specificFields,
      })
    : null;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: classified?.title || "Classificado Waesy" },
      { property: "og:description", content: description },
      { property: "og:image", content: cover },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:site_name", content: "Waesy Local Marketplace" },
      { name: "twitter:card", content: cover ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: classified?.title || "Classificado Waesy" },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: cover || "https://waesy.com.br/pwa-512x512.png" },
      // GEO Meta Tags
      { name: "geo.region", content: `BR-${state}` },
      { name: "geo.placename", content: city },
      // WebMCP & Agent Protocols
      { name: "webmcp-endpoint", content: "https://waesy.com.br/api/webmcp.json" },
      { name: "webmcp-type", content: `classified_${category || "item"}` },
    ],
    links: canonicalUrl
      ? [
          { rel: "canonical", href: canonicalUrl },
          { rel: "alternate", type: "text/markdown", href: canonicalUrl },
        ]
      : [],
    scripts: jsonLd ? [{ type: "application/ld+json", children: jsonLd }] : [],
  };
}
