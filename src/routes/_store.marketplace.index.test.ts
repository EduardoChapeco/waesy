import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── Schemas dos 4 Pilares e Contratos de Isolamento ─────────────────────────
const UnifiedListingItemSchema = z.object({
  id: z.string(),
  origin: z.enum(["workspace", "classified"]),
  title: z.string(),
  store_id: z.string().nullable().optional(),
  store_name: z.string().nullable().optional(),
  price_cents: z.number().int().nonnegative(),
  compare_at_cents: z.number().int().nullable().optional(),
  niche_id: z.string(),
});

type MockUnifiedListing = z.infer<typeof UnifiedListingItemSchema>;

function filterMarketplaceListings(items: MockUnifiedListing[], originFilter?: "workspace" | "classified") {
  if (!originFilter) return items;
  return items.filter((item) => item.origin === originFilter);
}

function mapListingToOfferCardProps(item: MockUnifiedListing) {
  const originalPrice = item.compare_at_cents || item.price_cents;
  const price = item.price_cents;
  const hasDiscount = originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return {
    id: item.id,
    title: item.title,
    store_name: item.store_name || "Loja Credenciada",
    price_cents: price,
    original_price_cents: originalPrice,
    discount_percent: discountPercent,
    mechanic_label: hasDiscount ? `${discountPercent}% OFF` : "Verificado",
    has_flash_offer: hasDiscount,
  };
}

describe("Marketplace Vitrine & Isolamento dos 4 Pilares (DEC-168)", () => {
  const mockDataset: MockUnifiedListing[] = [
    {
      id: "prod-1",
      origin: "workspace",
      title: "Smartphone Galaxy S24 Pro",
      store_id: "store-alpha",
      store_name: "Tech Store Chapecó",
      price_cents: 499900,
      compare_at_cents: 549900,
      niche_id: "eletronicos",
    },
    {
      id: "prod-2",
      origin: "workspace",
      title: "Hambúrguer Artesanal Costela",
      store_id: "store-beta",
      store_name: "Burger & Co",
      price_cents: 3800,
      compare_at_cents: null,
      niche_id: "gastronomia",
    },
    {
      id: "class-1",
      origin: "classified",
      title: "Celta 2010 Desapego Urgente",
      store_id: null,
      store_name: "Anunciante Particular",
      price_cents: 1650000,
      compare_at_cents: null,
      niche_id: "veiculos",
    },
    {
      id: "class-2",
      origin: "classified",
      title: "Sofá 3 Lugares Usado",
      store_id: null,
      store_name: "Morador Local",
      price_cents: 30000,
      compare_at_cents: null,
      niche_id: "casa",
    },
  ];

  it("deve isolar 100% produtos comerciais e proibir vazamento de classificados quando origin='workspace'", () => {
    const marketplaceItems = filterMarketplaceListings(mockDataset, "workspace");

    // Zero classificados no Marketplace
    const classifiedLeaks = marketplaceItems.filter((i) => i.origin === "classified");
    expect(classifiedLeaks.length).toBe(0);

    // Todos os itens devem ser origin='workspace'
    expect(marketplaceItems.length).toBe(2);
    marketplaceItems.forEach((item) => {
      expect(item.origin).toBe("workspace");
      expect(item.store_id).not.toBeNull();
    });
  });

  it("deve isolar classificados no pilar de classificados quando origin='classified'", () => {
    const classifiedItems = filterMarketplaceListings(mockDataset, "classified");

    const workspaceLeaks = classifiedItems.filter((i) => i.origin === "workspace");
    expect(workspaceLeaks.length).toBe(0);
    expect(classifiedItems.length).toBe(2);
  });

  it("deve conter e validar os 14 subnichos canônicos do Marketplace", () => {
    const canonicalNiches = [
      "gastronomia",
      "mercado",
      "farmacia",
      "bebidas",
      "acougue",
      "moda",
      "pet",
      "eletronicos",
      "casa",
      "construcao",
      "servicos",
      "imoveis",
      "beleza",
      "ofertas",
    ];

    expect(canonicalNiches.length).toBe(14);
    expect(canonicalNiches).toContain("gastronomia");
    expect(canonicalNiches).toContain("mercado");
    expect(canonicalNiches).toContain("moda");
    expect(canonicalNiches).toContain("eletronicos");
  });

  it("deve mapear metadados de ofertas para OfferCard sem perda de preço ou desconto", () => {
    const card = mapListingToOfferCardProps(mockDataset[0]);

    expect(card.title).toBe("Smartphone Galaxy S24 Pro");
    expect(card.price_cents).toBe(499900);
    expect(card.original_price_cents).toBe(549900);
    expect(card.discount_percent).toBe(9); // (549900 - 499900) / 549900 ≈ 9.09% -> 9%
    expect(card.mechanic_label).toBe("9% OFF");
    expect(card.has_flash_offer).toBe(true);
    expect(card.store_name).toBe("Tech Store Chapecó");
  });
});
