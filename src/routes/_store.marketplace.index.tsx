import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceHub, type MarketplaceOffer } from "@/components/marketplace/marketplace-hub";
import { listUnifiedListings } from "@/services/unified-listing.functions";

export const Route = createFileRoute("/_store/marketplace/")({
  validateSearch: (search: Record<string, unknown>): {
    niche?: string;
    city?: string;
  } => ({
    niche: typeof search.niche === "string" ? search.niche : undefined,
    city: typeof search.city === "string" ? search.city : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Marketplace da Cidade | Empresas e Vitrines Verificadas | Waesy" },
      {
        name: "description",
        content:
          "Compre produtos, reserve turismo e contrate serviços de empresas verificadas com garantia e checkout seguro na sua região.",
      },
    ],
  }),
  loader: async () => {
    try {
      // Busca listagens unificadas de produtos e serviços
      const items = await listUnifiedListings({
        data: {
          limit: 30,
        },
      }).catch(() => []);

      // Mapeia para o DTO de ofertas do Marketplace
      const offers: MarketplaceOffer[] = (items || []).map((item) => ({
        id: item.id,
        title: item.title,
        storeName: item.store_id ? "Loja Credenciada" : "Empresa Verificada",
        storeSlug: item.store_id || "loja",
        niche: (item.niche_id as MarketplaceOffer["niche"]) || "lojas",
        priceCents: item.price_cents || 0,
        imageUrl: item.cover_url || item.media_urls?.[0] || undefined,
        ratingAverage: 5.0,
        deliveryAvailable: true,
      }));

      return { offers };
    } catch (err) {
      console.warn("[marketplace] Loader degradado com segurança:", err);
      return { offers: [] };
    }
  },
  component: MarketplacePage,
});

function MarketplacePage() {
  const { offers } = Route.useLoaderData();
  const search = Route.useSearch();

  return <MarketplaceHub initialNiche={search.niche || "todos"} offers={offers} />;
}
