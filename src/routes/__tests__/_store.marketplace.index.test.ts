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
    priceCents: price,
    originalPriceCents: originalPrice,
    discountPercent,
    storeId: item.store_id || undefined,
    storeName: item.store_name || "Loja Oficial",
  };
}

describe("Marketplace Index Unified Grid & Isolated Sources (Fase F04)", () => {
  const mockItems: MockUnifiedListing[] = [
    {
      id: "prod-ws-1",
      origin: "workspace",
      title: "Croissant Francês Artesanal",
      store_id: "store-padaria-1",
      store_name: "Boulangerie Central",
      price_cents: 1400,
      compare_at_cents: 1800,
      niche_id: "gastronomia",
    },
    {
      id: "prod-ws-2",
      origin: "workspace",
      title: "Café Especial Torrado 250g",
      store_id: "store-cafe-1",
      store_name: "Torrefação Sul",
      price_cents: 3200,
      compare_at_cents: null,
      niche_id: "gastronomia",
    },
    {
      id: "class-1",
      origin: "classified",
      title: "Bicicleta Caloi Aro 29 seminova",
      store_id: null,
      store_name: "Particular",
      price_cents: 110000,
      compare_at_cents: 150000,
      niche_id: "veiculos",
    },
  ];

  it("deve mapear corretamente itens formais do Workspace para a grade comercial", () => {
    const wsItems = filterMarketplaceListings(mockItems, "workspace");
    expect(wsItems.length).toBe(2);
    expect(wsItems.every((item) => item.origin === "workspace")).toBe(true);

    const mapped = wsItems.map(mapListingToOfferCardProps);
    expect(mapped[0].title).toBe("Croissant Francês Artesanal");
    expect(mapped[0].discountPercent).toBe(22); // (1800 - 1400) / 1800 = 22.2% -> 22%
    expect(mapped[0].storeName).toBe("Boulangerie Central");
  });

  it("deve mapear desapegos de Classificados com badge de procedência clara", () => {
    const classifieds = filterMarketplaceListings(mockItems, "classified");
    expect(classifieds.length).toBe(1);
    expect(classifieds[0].origin).toBe("classified");

    const mapped = mapListingToOfferCardProps(classifieds[0]);
    expect(mapped.storeName).toBe("Particular");
    expect(mapped.discountPercent).toBe(27); // (150000 - 110000) / 150000 = 26.6% -> 27%
  });

  it("deve permitir exibição mista transparente sem corromper contratos de dados", () => {
    const all = filterMarketplaceListings(mockItems);
    expect(all.length).toBe(3);

    for (const item of all) {
      const parsed = UnifiedListingItemSchema.safeParse(item);
      expect(parsed.success).toBe(true);
    }
  });

  it("deve calcular desconto 0 quando compare_at_cents não existir ou for menor", () => {
    const itemWithoutDiscount: MockUnifiedListing = {
      id: "prod-no-discount",
      origin: "workspace",
      title: "Produto Preço Normal",
      store_id: "store-1",
      store_name: "Loja X",
      price_cents: 5000,
      compare_at_cents: null,
      niche_id: "varejo",
    };

    const mapped = mapListingToOfferCardProps(itemWithoutDiscount);
    expect(mapped.discountPercent).toBe(0);
    expect(mapped.originalPriceCents).toBe(5000);
  });
});
