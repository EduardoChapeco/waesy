/**
 * seo-engine.ts — Motor Canônico de SEO, Metadados e WebMCP para Anúncios (F14)
 * 
 * Regras:
 * - Todo anúncio publicado possui metadados válidos.
 * - JSON-LD Schema.org estruturado semanticamente por tipo de anúncio.
 * - Suporte nativo a WebMCP (leitura de catálogo para agentes de IA).
 */

import type { UnifiedListing, ListingSeoMetadata } from "@/types/unified-ad-engine";

/**
 * Deriva metadados de SEO canônicos a partir dos dados do anúncio
 */
export function buildListingSeoMetadata(
  listing: Pick<
    UnifiedListing,
    "title" | "description" | "short_description" | "slug" | "niche_id" | "item_type" | "cover_url" | "brand"
  >,
  baseUrl = "https://waesy.com.br"
): ListingSeoMetadata {
  const cleanTitle = `${listing.title} | Waesy`;
  const cleanDesc =
    listing.short_description ||
    (listing.description ? listing.description.slice(0, 155).trim() + "..." : "Confira detalhes, preços e condições no Waesy.");
  const canonicalUrl = `${baseUrl}/anuncios/${listing.slug}`;

  let schemaType: ListingSeoMetadata["schema_type"] = "Product";
  if (listing.niche_id === "turismo" || listing.item_type === "package") {
    schemaType = "TouristTrip";
  } else if (listing.niche_id === "imovel" || listing.item_type === "property") {
    schemaType = "RealEstateListing";
  } else if (listing.niche_id === "veiculo" || listing.item_type === "vehicle") {
    schemaType = "Vehicle";
  } else if (listing.niche_id === "servico" || listing.item_type === "service") {
    schemaType = "Service";
  } else if (listing.niche_id === "hospedagem" || listing.item_type === "stay") {
    schemaType = "LodgingBusiness";
  } else if (listing.item_type === "job") {
    schemaType = "JobPosting";
  }

  return {
    title: cleanTitle,
    description: cleanDesc,
    canonical_url: canonicalUrl,
    keywords: [listing.niche_id, listing.brand || "", "comércio local", "waesy"].filter(Boolean),
    og_image_url: listing.cover_url || undefined,
    schema_type: schemaType,
  };
}

/**
 * Constrói payload estruturado Schema.org (JSON-LD)
 */
export function generateSchemaOrgJsonLd(listing: UnifiedListing, baseUrl = "https://waesy.com.br"): Record<string, any> {
  const seo = listing.seo_metadata;
  const canonicalUrl = seo.canonical_url || `${baseUrl}/anuncios/${listing.slug}`;

  const baseEntity = {
    "@context": "https://schema.org",
    "@type": seo.schema_type,
    name: listing.title,
    description: seo.description,
    url: canonicalUrl,
    image: listing.media_urls.length > 0 ? listing.media_urls : listing.cover_url ? [listing.cover_url] : undefined,
  };

  // Oferta comercial unificada
  const offers = {
    "@type": "Offer",
    price: (listing.price_cents / 100).toFixed(2),
    priceCurrency: "BRL",
    availability:
      listing.stock_quantity && listing.stock_quantity > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/LimitedAvailability",
    url: canonicalUrl,
  };

  if (seo.schema_type === "TouristTrip") {
    return {
      ...baseEntity,
      offers,
      touristType: ["Family", "Couples", "Explorers"],
      itinerary: listing.attributes?.itinerary_days
        ? {
            "@type": "ItemList",
            itemListElement: listing.attributes.itinerary_days.map((d: any, idx: number) => ({
              "@type": "ListItem",
              position: idx + 1,
              name: d.title,
              description: d.description,
            })),
          }
        : undefined,
    };
  }

  if (seo.schema_type === "Product") {
    return {
      ...baseEntity,
      brand: listing.brand ? { "@type": "Brand", name: listing.brand } : undefined,
      offers,
    };
  }

  return {
    ...baseEntity,
    offers,
  };
}

/**
 * Serializador WebMCP para Leitura Semântica por Agentes de IA (F14 / F42)
 */
export function serializeForWebMcp(listing: UnifiedListing): Record<string, any> {
  return {
    id: listing.id,
    origin: listing.origin,
    niche: listing.niche_id,
    type: listing.item_type,
    title: listing.title,
    price_formatted: `R$ ${(listing.price_cents / 100).toFixed(2)}`,
    unit: listing.selling_unit,
    payment_terms: {
      pix_discount: `${listing.payment_config.pix_discount_percent}%`,
      max_installments: `${listing.payment_config.max_installments}x`,
      interest_free: `${listing.payment_config.fee_free_installments}x`,
    },
    inclusions: listing.inclusions,
    exclusions: listing.exclusions,
    location: listing.location ? `${listing.location.city}/${listing.location.state}` : "Digital / Sem local fixo",
    availability: listing.status === "published" ? "disponível" : "indisponível",
    direct_link: `https://waesy.com.br/anuncios/${listing.slug}`,
  };
}
