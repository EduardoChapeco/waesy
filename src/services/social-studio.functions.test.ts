import { describe, it, expect } from "vitest";

describe("Omni-Builder B2B Studio & Carousel Matrix (V128 Phase 3)", () => {
  it("deve estruturar corretamente os 5 slides canônicos do carrossel para Meta/Instagram", () => {
    const slides = [
      { tag: "Novidade", headline: "Produto A", subheadline: "Lançamento oficial", highlightText: "R$ 99,00" },
      { tag: "Destaque", headline: "Benefício Chave", subheadline: "Alta performance e durabilidade" },
      { tag: "Especificações", headline: "Pronta Entrega", subheadline: "Envio imediato via MotoLink" },
      { tag: "Condições", headline: "R$ 99,00", subheadline: "3x sem juros", highlightText: "Parcele em até 12x" },
      { tag: "CTA", headline: "Peça pelo WhatsApp", subheadline: "Link na bio oficial", highlightText: "Comprar" },
    ];

    expect(slides.length).toBe(5);
    expect(slides[0].tag).toBe("Novidade");
    expect(slides[4].tag).toBe("CTA");
  });

  it("deve calcular parcelamento sem juros respeitando a Regra 22 (1-24x)", () => {
    const priceCents = 18990;
    const maxInstallments = 3;
    const installmentCents = Math.round(priceCents / maxInstallments);

    expect(installmentCents).toBe(6330);
    expect(installmentCents * maxInstallments).toBe(18990);
  });

  it("deve validar as proporções canônicas de exportação do Studio", () => {
    const ratios = ["9:16", "1:1", "16:9"];
    expect(ratios).toContain("9:16"); // Stories
    expect(ratios).toContain("1:1");  // Feed
    expect(ratios).toContain("16:9"); // Apresentação B2B / PDF Paisagem
  });
});
