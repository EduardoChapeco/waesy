/**
 * geo-search.functions.test.ts — Testes Unitários de Busca Geográfica e Filtros (F15)
 *
 * Valida a busca por raio geodésico (Haversine), filtros de cidade/bairro em classificados
 * e resolução determinística da cidade canônica mais próxima.
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

// Coordenadas de referência:
// Centro de São Miguel do Oeste: -26.7265, -53.5186
// Maravilha (aprox 35km): -26.7622, -53.1769
// Florianópolis (aprox 500km): -27.5954, -48.5480

const mockStores = [
  {
    id: "store-smo-1",
    name: "Padaria Central SMO",
    slug: "padaria-central-smo",
    category: "Alimentação",
    status: "active",
    settings: {
      description: "Pães e doces artesanais",
      latitude: -26.7268,
      longitude: -53.5190,
      is_physical_location: true,
      city: "São Miguel do Oeste",
      state: "SC",
    },
  },
  {
    id: "store-maravilha-1",
    name: "Móveis Maravilha",
    slug: "moveis-maravilha",
    category: "Móveis",
    status: "active",
    settings: {
      description: "Móveis sob medida",
      latitude: -26.7622,
      longitude: -53.1769,
      is_physical_location: true,
      city: "Maravilha",
      state: "SC",
    },
  },
  {
    id: "store-florianopolis-1",
    name: "Tech Litoral",
    slug: "tech-litoral",
    category: "Tecnologia",
    status: "active",
    settings: {
      description: "Equipamentos de TI",
      latitude: -27.5954,
      longitude: -48.5480,
      is_physical_location: true,
      city: "Florianópolis",
      state: "SC",
    },
  },
  {
    id: "store-no-geo",
    name: "Loja Virtual Sem Endereço",
    slug: "loja-virtual",
    category: "Serviços",
    status: "active",
    settings: {
      description: "Apenas online",
    },
  },
];

const mockClassifieds = [
  {
    id: "c-1",
    title: "Bicicleta Aro 29",
    category: "Esportes",
    price_cents: 120000,
    location_text: "Centro, São Miguel do Oeste - SC",
    images: ["https://exemplo.com/bike.jpg"],
    condition: "used_good",
    created_at: "2026-10-01T12:00:00Z",
    status: "active",
  },
  {
    id: "c-2",
    title: "Apartamento 2 Quartos",
    category: "Imóveis",
    price_cents: 25000000,
    location_text: "Bairro Agostini, São Miguel do Oeste",
    images: ["https://exemplo.com/apto.jpg"],
    condition: "new",
    created_at: "2026-10-02T08:00:00Z",
    status: "active",
  },
];

function createFluentBuilder(dataToReturn: any) {
  const builder: any = {
    data: dataToReturn,
    error: null,
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    then: (resolve: any) => resolve({ data: dataToReturn, error: null }),
  };
  return builder;
}

const mockFrom = vi.fn((table: string) => {
  if (table === "stores") return createFluentBuilder(mockStores);
  if (table === "classifieds") return createFluentBuilder(mockClassifieds);
  return createFluentBuilder([]);
});

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: mockFrom,
  }),
}));

import {
  geoSearchPlacesInputSchema,
  geoSearchPlacesFn,
  geoSearchClassifiedsFn,
  resolveLocationCityFn,
} from "./geo-search.functions";

describe("F15: geo-search.functions — Geolocalização e Filtros", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Deve validar schemas Zod de geolocalização com limites esféricos válidos", () => {
    expect(
      geoSearchPlacesInputSchema.safeParse({ lat: -26.7265, lng: -53.5186, radiusKm: 25 }).success,
    ).toBe(true);

    // Latitude fora da faixa [-90, 90]
    expect(
      geoSearchPlacesInputSchema.safeParse({ lat: 100, lng: -53.5186 }).success,
    ).toBe(false);

    // Longitude fora da faixa [-180, 180]
    expect(
      geoSearchPlacesInputSchema.safeParse({ lat: -26.7265, lng: -200 }).success,
    ).toBe(false);
  });

  it("2. geoSearchPlacesFn: deve filtrar estabelecimentos por raio Haversine e ordenar por proximidade", async () => {
    // Busca com raio de 50km a partir de São Miguel do Oeste (-26.7265, -53.5186)
    // Deve incluir Padaria Central (<1km) e Móveis Maravilha (~34km)
    // NÃO deve incluir Tech Litoral (~500km) nem Loja Virtual Sem Endereço
    const res = await geoSearchPlacesFn({
      data: {
        lat: -26.7265,
        lng: -53.5186,
        radiusKm: 50,
      },
    });

    expect(res).toBeDefined();
    expect(res.places).toHaveLength(2);
    expect(res.places[0].slug).toBe("padaria-central-smo");
    expect(res.places[0].distanceKm).toBeLessThan(1);
    expect(res.places[1].slug).toBe("moveis-maravilha");
    expect(res.places[1].distanceKm).toBeGreaterThan(30);
    expect(res.places[1].distanceKm).toBeLessThan(50);
  });

  it("3. geoSearchPlacesFn: deve ignorar lojas fora do raio geodésico", async () => {
    // Raio restrito de 5km em SMO não deve alcançar Maravilha nem Florianópolis
    const res = await geoSearchPlacesFn({
      data: {
        lat: -26.7265,
        lng: -53.5186,
        radiusKm: 5,
      },
    });

    expect(res.places).toHaveLength(1);
    expect(res.places[0].slug).toBe("padaria-central-smo");
  });

  it("4. geoSearchClassifiedsFn: deve retornar anúncios filtrados por localidade", async () => {
    const res = await geoSearchClassifiedsFn({
      data: {
        city: "São Miguel do Oeste",
        neighborhood: "Centro",
      },
    });

    expect(res).toBeDefined();
    expect(res.classifieds).toBeInstanceOf(Array);
    expect(res.count).toBe(2);
    expect(res.filters.city).toBe("São Miguel do Oeste");
  });

  it("5. resolveLocationCityFn: deve resolver a cidade canônica mais próxima", async () => {
    // Coordenadas próximas a Chapecó (-27.1004, -52.6152)
    const res = await resolveLocationCityFn({
      data: {
        lat: -27.1000,
        lng: -52.6150,
      },
    });

    expect(res).toBeDefined();
    expect(res.resolved).toBe(true);
    expect(res.city).toBeDefined();
    expect(res.city?.name).toBe("Chapecó");
    expect(res.city?.distanceKm).toBeLessThan(5);
  });
});
