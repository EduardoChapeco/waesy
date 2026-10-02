/**
 * -_store.places.$placeSlug.test.ts — Testes da Rota de Detalhe de Estabelecimento (Places)
 *
 * Fase F09 do Plano Mestre de Estabilização dos 4 Pilares.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do BFF getPlaceDetailBySlugFn
vi.mock("@/services/places-detail.functions", () => ({
  getPlaceDetailBySlugFn: vi.fn(),
  placeDetailInputSchema: {
    safeParse: (data: any) => ({
      success: Boolean(data?.slug && data.slug.length > 0),
    }),
  },
}));

import { getPlaceDetailBySlugFn } from "@/services/places-detail.functions";
import { Route } from "./_store.places.$placeSlug";

describe("F09: Rota _store.places.$placeSlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Deve invocar getPlaceDetailBySlugFn com o slug da rota no loader", async () => {
    const mockPlace = {
      id: "place-1",
      name: "Mercado Central",
      slug: "mercado-central",
      category: "Supermercado",
      description: "Tudo para a sua casa",
      address: "Rua Duque de Caxias, 50",
      city: "São Miguel do Oeste",
      state: "SC",
      latitude: -26.72,
      longitude: -53.51,
      phone: "4936220000",
      whatsapp: "49999990000",
      instagram: null,
      website: "https://mercadocentral.com.br",
      avatarUrl: null,
      bannerUrl: null,
      galleryImages: [],
      operatingHours: { seg_sex: "08:00 - 20:00" },
      isVerified: true,
      ratingAverage: 4.7,
      reviewsCount: 15,
      hasMarketplaceShowcase: true,
      reviews: [],
    };

    vi.mocked(getPlaceDetailBySlugFn).mockResolvedValueOnce(mockPlace);

    // @ts-expect-error simulação de chamada de loader
    const result = await Route.options.loader({
      params: { placeSlug: "mercado-central" },
    });

    expect(getPlaceDetailBySlugFn).toHaveBeenCalledWith({
      data: { slug: "mercado-central" },
    });
    expect(result.place).toEqual(mockPlace);
  });

  it("2. Deve retornar place: null graciosamente quando a consulta falhar no loader", async () => {
    vi.mocked(getPlaceDetailBySlugFn).mockRejectedValueOnce(new Error("Database error"));

    // @ts-expect-error simulação de chamada de loader
    const result = await Route.options.loader({
      params: { placeSlug: "slug-com-erro" },
    });

    expect(result.place).toBeNull();
  });

  it("3. Deve gerar tags de SEO canônicas corretas na função head", () => {
    const mockPlace = {
      id: "place-2",
      name: "Farmácia Popular",
      slug: "farmacia-popular",
      category: "Farmácia & Saúde",
      description: "Medicamentos e cuidados",
      address: "Av. Brasil, 300",
      city: "São Miguel do Oeste",
      state: "SC",
      latitude: null,
      longitude: null,
      phone: null,
      whatsapp: null,
      instagram: null,
      website: null,
      avatarUrl: null,
      bannerUrl: null,
      galleryImages: [],
      operatingHours: null,
      isVerified: true,
      ratingAverage: 5.0,
      reviewsCount: 3,
      hasMarketplaceShowcase: false,
      reviews: [],
    };

    const headResult = (Route.options.head as any)({
      loaderData: { place: mockPlace },
    });

    const titleMeta = headResult.meta?.find((m: any) => m.title);
    expect(titleMeta?.title).toContain("Farmácia Popular — Guia de Lugares e Empresas | Waesy Places");

    const descMeta = headResult.meta?.find((m: any) => m.name === "description");
    expect(descMeta?.content).toContain("Farmácia Popular em São Miguel do Oeste - SC");
  });
});
