/**
 * search.functions.test.ts — Testes Unitários da Busca Universal (F14)
 *
 * Valida a unificação da busca federada através dos 3 pilares públicos
 * (Marketplace/Produtos, Estabelecimentos/Lojas e Classificados).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do createServerFn do @tanstack/react-start
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? schema.parse(args?.data) : args?.data;
        return fn({ data: validated });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

const mockProducts = [
  {
    id: "prod-1",
    title: "Cadeira Ergonômica Pro",
    slug: "cadeira-ergonomica-pro",
    price_cents: 89900,
    cover_url: "https://exemplo.com/cadeira.jpg",
    store_id: "store-1",
    status: "published",
  },
];

const mockStores = [
  {
    id: "store-1",
    name: "Móveis e Decorações Vale",
    slug: "moveis-decoracoes-vale",
    settings: {
      description: "Móveis para escritório e casa",
      logoUrl: "https://exemplo.com/logo.jpg",
      latitude: -26.726,
      longitude: -53.518,
    },
  },
];

const mockClassifieds = [
  {
    id: "class-1",
    title: "Mesa de Escritório Usada",
    content: "Mesa em ótimo estado de conservação",
    category: "Móveis",
    price_cents: 25000,
    location_text: "Centro, São Miguel do Oeste",
    images: ["https://exemplo.com/mesa.jpg"],
    condition: "used_good",
    negotiable: true,
    author_profile_id: "usr-1",
    status: "active",
  },
];

function createFluentBuilder(dataToReturn: any) {
  const builder: any = {
    data: dataToReturn,
    error: null,
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    not: vi.fn(() => builder),
    in: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    textSearch: vi.fn(() => builder),
    single: vi.fn(async () => ({ data: Array.isArray(dataToReturn) ? dataToReturn[0] : dataToReturn, error: null })),
    maybeSingle: vi.fn(async () => ({ data: Array.isArray(dataToReturn) ? dataToReturn[0] : dataToReturn, error: null })),
    then: (resolve: any) => resolve({ data: dataToReturn, error: null }),
  };
  return builder;
}

const mockFrom = vi.fn((table: string) => {
  if (table === "products") return createFluentBuilder(mockProducts);
  if (table === "stores") return createFluentBuilder(mockStores);
  if (table === "classifieds") return createFluentBuilder(mockClassifieds);
  if (table === "events") return createFluentBuilder([]);
  if (table === "mined_raw_extractions") return createFluentBuilder([]);
  if (table === "categories") return createFluentBuilder([]);
  return createFluentBuilder([]);
});

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: mockFrom,
    rpc: vi.fn(async () => ({ data: null, error: null })),
  }),
}));

import {
  federatedSearch,
  universalSearchFn,
} from "./search.functions";

describe("F14: search.functions — Busca Universal Federada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. universalSearchFn deve ser uma referência idêntica a federatedSearch", () => {
    expect(universalSearchFn).toBeDefined();
    expect(universalSearchFn).toBe(federatedSearch);
  });

  it("2. Deve retornar resultados consolidados dos 3 pilares para consulta não vazia", async () => {
    const res = await universalSearchFn({
      data: {
        query: "Mesa",
        types: ["product", "store", "classified"],
        limit: 10,
      },
    });

    expect(res).toBeDefined();
    expect(res.total).toBeGreaterThanOrEqual(1);
    expect(res.products).toHaveLength(1);
    expect(res.stores).toHaveLength(1);
    expect(res.classifieds).toHaveLength(1);
    expect(res.products[0].title).toBe("Cadeira Ergonômica Pro");
    expect(res.stores[0].name).toBe("Móveis e Decorações Vale");
    expect(res.classifieds[0].title).toBe("Mesa de Escritório Usada");
  });

  it("3. Deve retornar listas vazias e total 0 quando a busca for string em branco", async () => {
    const res = await universalSearchFn({
      data: {
        query: "   ",
        limit: 10,
      },
    });

    expect(res).toBeDefined();
    expect(res.total).toBe(0);
    expect(res.products).toEqual([]);
    expect(res.stores).toEqual([]);
    expect(res.classifieds).toEqual([]);
  });
});
