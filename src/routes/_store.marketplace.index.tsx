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

      function normalizeNiche(raw?: string): MarketplaceOffer["niche"] {
        const n = (raw || "").toLowerCase();
        if (n.includes("turis") || n.includes("viag") || n === "tourism") return "turismo";
        if (n.includes("gastro") || n.includes("restaur") || n.includes("aliment") || n.includes("mercado") || n.includes("food")) return "gastronomia";
        if (n.includes("servic") || n.includes("serviç") || n.includes("profis") || n === "service") return "servicos";
        if (n.includes("imov") || n.includes("imóv") || n.includes("hosped") || n.includes("chale") || n.includes("chalé") || n.includes("aluguel")) return "imoveis";
        if (n.includes("veic") || n.includes("veíc") || n.includes("auto") || n.includes("carro") || n.includes("moto")) return "veiculos";
        return "lojas";
      }

      // Mapeia para o DTO de ofertas do Marketplace com metadados reais
      const offers: MarketplaceOffer[] = (items || []).map((item) => ({
        id: item.id,
        slug: item.slug && item.slug !== item.id ? item.slug : undefined,
        title: item.title,
        storeName: item.store_name || (item.store_id ? "Empresa Credenciada" : "Anunciante Verificado"),
        storeSlug: item.store_slug || item.store_id || "loja",
        niche: normalizeNiche(item.niche_id),
        priceCents: item.price_cents || 0,
        imageUrl: item.cover_url || item.media_urls?.[0] || undefined,
        ratingAverage: 5.0,
        deliveryAvailable: item.shipping_mode !== "pickup",
        origin: item.origin,
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
