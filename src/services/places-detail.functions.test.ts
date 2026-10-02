/**
 * places-detail.functions.test.ts — Testes Unitários de Detalhe de Estabelecimento (Places)
 *
 * Fase F09 do Plano Mestre de Estabilização dos 4 Pilares.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do createServerFn do @tanstack/react-start para execução direta em testes
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? schema.parse(args.data) : args.data;
        return fn({ data: validated });
      },
    }),
  }),
}));

// Mock do supabase client
const mockMaybeSingle = vi.fn();
const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockOr = vi.fn(() => ({ limit: mockLimit, maybeSingle: mockMaybeSingle }));
const mockOrder = vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [] }) }));
const mockEq = vi.fn(() => ({
  or: mockOr,
  limit: mockLimit,
  maybeSingle: mockMaybeSingle,
  order: mockOrder,
  in: vi.fn().mockResolvedValue({ count: 2 }),
}));
const mockSelect = vi.fn(() => ({
  eq: mockEq,
  or: mockOr,
  limit: mockLimit,
  maybeSingle: mockMaybeSingle,
  in: vi.fn().mockResolvedValue({ count: 2 }),
  order: mockOrder,
}));

const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

vi.mock("@/lib/supabase", () => ({
  getAnonServerClient: () => ({
    from: mockFrom,
  }),
}));

import { getPlaceDetailBySlugFn, placeDetailInputSchema } from "./places-detail.functions";

describe("F09: places-detail.functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Deve validar e rejeitar slug vazio na validação Zod", () => {
    const invalidEmpty = placeDetailInputSchema.safeParse({ slug: "" });
    expect(invalidEmpty.success).toBe(false);

    const valid = placeDetailInputSchema.safeParse({ slug: "padaria-central" });
    expect(valid.success).toBe(true);
  });

  it("2. Deve retornar null quando o estabelecimento não existir", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null }); // directory_listings
    mockMaybeSingle.mockResolvedValueOnce({ data: null }); // stores

    const result = await getPlaceDetailBySlugFn({
      data: { slug: "estabelecimento-inexistente" },
    });

    expect(result).toBeNull();
  });

  it("3. Deve mapear com sucesso um directory_listing com reputação e horários", async () => {
    const mockListing = {
      id: "place-123",
      store_id: "store-456",
      business_name: "Padaria Central",
      category: "Padaria & Confeitaria",
      description: "Pães quentinhos e doces artesanais",
      address: "Rua Marcílio Dias, 100",
      latitude: -26.72,
      longitude: -53.51,
      contact_phone: "(49) 3622-0000",
      contact_whatsapp: "49999990000",
      website_url: "https://padariacentral.com.br",
      working_hours: { seg_sex: "07:00 - 19:00", sab: "07:00 - 12:00" },
      is_verified: true,
      rating: 4.8,
      reviews_count: 24,
      avatar_url: "https://images.waesy.com/padaria.jpg",
      banner_url: "https://images.waesy.com/padaria-banner.jpg",
      status: "active",
      stores: {
        id: "store-456",
        name: "Padaria Central",
        slug: "padaria-central",
        is_physical_location: true,
      },
    };

    mockMaybeSingle.mockResolvedValueOnce({ data: mockListing });

    const result = await getPlaceDetailBySlugFn({
      data: { slug: "padaria-central" },
    });

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Padaria Central");
    expect(result?.slug).toBe("padaria-central");
    expect(result?.category).toBe("Padaria & Confeitaria");
    expect(result?.address).toBe("Rua Marcílio Dias, 100");
    expect(result?.isVerified).toBe(true);
    expect(result?.ratingAverage).toBe(4.8);
    expect(result?.whatsapp).toBe("49999990000");
  });

  it("4. Deve mapear estabelecimento a partir da tabela stores com settings", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null }); // directory_listings: null
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "store-789",
        name: "Oficina Mecânica São Miguel",
        slug: "oficina-sao-miguel",
        is_physical_location: true,
        settings: {
          category: "Automotivo",
          description: "Mecânica geral e alinhamento",
          address: "Av. Salgado Filho, 500",
          phone: "(49) 3622-1111",
          whatsapp: "49988881111",
          latitude: -26.73,
          longitude: -53.52,
          is_verified: true,
          rating: 4.9,
          reviews_count: 12,
        },
      },
    });

    const result = await getPlaceDetailBySlugFn({
      data: { slug: "oficina-sao-miguel" },
    });

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Oficina Mecânica São Miguel");
    expect(result?.category).toBe("Automotivo");
    expect(result?.address).toBe("Av. Salgado Filho, 500");
    expect(result?.phone).toBe("(49) 3622-1111");
  });
});
