import { describe, it, expect } from "vitest";
import {
  calculateMatrixPricingAndStock,
  resolveStoreChannelsStatus,
  extractVariantImages,
} from "@/lib/catalog-channel-integrations";
import type { RawVariant } from "@/types/catalog";

describe("calculateMatrixPricingAndStock", () => {
  it("deve retornar valores base quando não houver variantes", () => {
    const res = calculateMatrixPricingAndStock(3800, 10, []);
    expect(res.hasVariants).toBe(false);
    expect(res.minPriceCents).toBe(3800);
    expect(res.maxPriceCents).toBe(3800);
    expect(res.hasPriceRange).toBe(false);
    expect(res.totalStock).toBe(10);
  });

  it("deve calcular o menor preço, maior preço e soma exata de estoque com variantes", () => {
    const variants: RawVariant[] = [
      {
        attributes: { Tamanho: "38" },
        stock: 1,
        price_override_cents: 3600,
      },
      {
        attributes: { Tamanho: "39" },
        stock: 5,
        price_override_cents: 3800,
      },
      {
        attributes: { Tamanho: "40" },
        stock: 3,
        price_override_cents: 5000,
      },
    ];

    const res = calculateMatrixPricingAndStock(3800, 10, variants);
    expect(res.hasVariants).toBe(true);
    expect(res.minPriceCents).toBe(3600);
    expect(res.maxPriceCents).toBe(5000);
    expect(res.hasPriceRange).toBe(true);
    expect(res.totalStock).toBe(9); // 1 + 5 + 3 = 9 unidades
  });

  it("deve herdar o preço base quando uma variante tiver price_override_cents nulo", () => {
    const variants: RawVariant[] = [
      {
        attributes: { Tamanho: "P" },
        stock: 2,
        price_override_cents: null,
      },
      {
        attributes: { Tamanho: "M" },
        stock: 4,
        price_override_cents: 4500,
      },
    ];

    const res = calculateMatrixPricingAndStock(4000, 5, variants);
    expect(res.hasVariants).toBe(true);
    expect(res.minPriceCents).toBe(4000);
    expect(res.maxPriceCents).toBe(4500);
    expect(res.hasPriceRange).toBe(true);
    expect(res.totalStock).toBe(6);
  });
});

describe("resolveStoreChannelsStatus", () => {
  it("deve detectar canais desconectados por padrão quando vazios", () => {
    const channels = resolveStoreChannelsStatus([], []);
    expect(channels.google_merchant.isConnected).toBe(false);
    expect(channels.meta_instagram.isConnected).toBe(false);
    expect(channels.mercadolivre.isConnected).toBe(false);
    expect(channels.ifood.isConnected).toBe(false);
  });

  it("deve marcar como conectado apenas provedores ativos e status correspondente", () => {
    const credentials = [
      { provider: "google_merchant_center", is_active: true },
      { provider: "meta_pixel", is_active: true },
    ];
    const connectors = [
      { platform: "mercadolivre", status: "connected" },
      { platform: "ifood", status: "disconnected" },
    ];

    const channels = resolveStoreChannelsStatus(credentials, connectors);
    expect(channels.google_merchant.isConnected).toBe(true);
    expect(channels.meta_instagram.isConnected).toBe(true);
    expect(channels.mercadolivre.isConnected).toBe(true);
    expect(channels.ifood.isConnected).toBe(false);
  });
});

describe("extractVariantImages", () => {
  it("deve retornar vazio se não houver variantes ou fotos", () => {
    const res = extractVariantImages([]);
    expect(res.hasVariantImages).toBe(false);
    expect(res.totalImages).toBe(0);
    expect(res.newImagesCount).toBe(0);
    expect(res.items).toHaveLength(0);
  });

  it("deve extrair imagens únicas e formatar rótulos amigáveis", () => {
    const variants: RawVariant[] = [
      {
        attributes: { Cor: "Preto", Tamanho: "38" },
        stock: 2,
        image_url: "https://cdn.waesy.com/preto.jpg",
      },
      {
        attributes: { Cor: "Preto", Tamanho: "39" },
        stock: 3,
        image_url: "https://cdn.waesy.com/preto.jpg", // Imagem repetida da mesma cor
      },
      {
        attributes: { Cor: "Branco", Tamanho: "38" },
        stock: 4,
        image_url: "https://cdn.waesy.com/branco.jpg",
      },
    ];

    const res = extractVariantImages(variants, []);
    expect(res.hasVariantImages).toBe(true);
    expect(res.totalImages).toBe(2); // preto.jpg e branco.jpg
    expect(res.newImagesCount).toBe(2);
    expect(res.items[0].label).toBe("Cor: Preto • Tamanho: 38");
    expect(res.items[0].isAlreadyInGallery).toBe(false);
    expect(res.items[1].label).toBe("Cor: Branco • Tamanho: 38");
    expect(res.items[1].isAlreadyInGallery).toBe(false);
  });

  it("deve identificar imagens que já constam na galeria", () => {
    const variants: RawVariant[] = [
      {
        attributes: { Cor: "Azul" },
        stock: 1,
        image_url: "https://cdn.waesy.com/azul.jpg",
      },
      {
        attributes: { Cor: "Verde" },
        stock: 1,
        image_url: "https://cdn.waesy.com/verde.jpg",
      },
    ];

    const currentGallery = ["https://cdn.waesy.com/azul.jpg"];
    const res = extractVariantImages(variants, currentGallery);

    expect(res.totalImages).toBe(2);
    expect(res.newImagesCount).toBe(1); // Somente verde.jpg é nova
    expect(res.items[0].isAlreadyInGallery).toBe(true);
    expect(res.items[1].isAlreadyInGallery).toBe(false);
  });
});
