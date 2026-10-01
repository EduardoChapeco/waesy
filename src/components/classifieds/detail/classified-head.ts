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

  const isService = ["service", "job"].includes(classified?.category);
  const priceCents = Number(classified?.price_cents || 0);
  const jsonLd = classified
    ? JSON.stringify(
        isService
          ? {
              "@context": "https://schema.org",
              "@type": "Service",
              name: classified.title,
              description: classified.content?.slice(0, 300),
              image: cover || undefined,
              url: canonicalUrl,
              provider: {
                "@type": "Person",
                name: classified.profiles?.full_name || "Anunciante Waesy",
              },
              areaServed: classified.city || classified.location_name || "Brasil",
            }
          : {
              "@context": "https://schema.org",
              "@type": "Product",
              name: classified.title,
              description: classified.content?.slice(0, 300),
              image: cover ? [cover] : undefined,
              url: canonicalUrl,
              offers: {
                "@type": "Offer",
                priceCurrency: "BRL",
                price: priceCents > 0 ? (priceCents / 100).toFixed(2) : undefined,
                availability:
                  classified.status === "active"
                    ? "https://schema.org/InStock"
                    : "https://schema.org/SoldOut",
                url: canonicalUrl,
              },
              brand: classified.store_name ? { "@type": "Brand", name: classified.store_name } : undefined,
            }
      )
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
      { property: "og:site_name", content: "Waesy" },
      { name: "twitter:card", content: cover ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: classified?.title || "Classificado Waesy" },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: cover },
    ],
    links: canonicalUrl ? [{ rel: "canonical", href: canonicalUrl }] : [],
    scripts: jsonLd ? [{ type: "application/ld+json", children: jsonLd }] : [],
  };
}
