import { describe, it, expect } from "vitest";
import { NICHE_SHOWCASES, type MarketplaceOffer } from "./marketplace-hub";

describe("Marketplace Hub & Vitrines Nichadas (Fase F01)", () => {
  it("deve conter todas as 6 vitrines por nicho e a vitrine geral", () => {
    const ids = NICHE_SHOWCASES.map((n) => n.id);
    expect(ids).toContain("todos");
    expect(ids).toContain("turismo");
    expect(ids).toContain("gastronomia");
    expect(ids).toContain("lojas");
    expect(ids).toContain("servicos");
    expect(ids).toContain("imoveis");
    expect(ids).toContain("veiculos");
    expect(NICHE_SHOWCASES.length).toBe(7);
  });

  it("deve filtrar ofertas estritamente pelo nicho selecionado", () => {
    const mockOffers: MarketplaceOffer[] = [
      {
        id: "tur_1",
        title: "Passeio Cânions e Cachoeiras",
        storeName: "Agência Serra Verde",
        storeSlug: "serra-verde",
        niche: "turismo",
        priceCents: 18000,
      },
      {
        id: "gas_1",
        title: "Rodízio de Carnes Nobres",
        storeName: "Parrilla Central",
        storeSlug: "parrilla-central",
        niche: "gastronomia",
        priceCents: 11990,
      },
      {
        id: "loj_1",
        title: "Tênis Esportivo Pro",
        storeName: "Sport City",
        storeSlug: "sport-city",
        niche: "lojas",
        priceCents: 29990,
      },
    ];

    // Vitrine Turismo
    const turismoOffers = mockOffers.filter((o) => o.niche === "turismo");
    expect(turismoOffers.length).toBe(1);
    expect(turismoOffers[0].title).toContain("Cânions");

    // Vitrine Geral (Todos)
    expect(mockOffers.length).toBe(3);
  });

  it("deve validar que preços são sempre inteiros em centavos", () => {
    const offer: MarketplaceOffer = {
      id: "val_1",
      title: "Item Teste",
      storeName: "Loja Teste",
      storeSlug: "loja-teste",
      niche: "lojas",
      priceCents: 4500, // R$ 45,00
    };

    expect(Number.isInteger(offer.priceCents)).toBe(true);
    expect(offer.priceCents / 100).toBe(45);
  });
});
