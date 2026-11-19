import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = { data: any; error: any };

const { mockTableHandlers, mockDb } = vi.hoisted(() => {
  const handlers: Record<string, (filters: Array<[string, string, any]>) => QueryResult> = {};

  function makeChain(table: string) {
    const filters: Array<[string, string, any]> = [];
    const exec = (): QueryResult => (handlers[table] ? handlers[table](filters) : { data: null, error: null });
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: any) => {
        filters.push(["eq", col, val]);
        return chain;
      },
      neq: (col: string, val: any) => {
        filters.push(["neq", col, val]);
        return chain;
      },
      in: (col: string, val: any) => {
        filters.push(["in", col, val]);
        return chain;
      },
      or: (val: string) => {
        filters.push(["or", "or", val]);
        return chain;
      },
      ilike: (col: string, val: any) => {
        filters.push(["ilike", col, val]);
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => Promise.resolve(exec()),
      single: () => Promise.resolve(exec()),
      then: (resolve: (val: QueryResult) => any, reject?: (err: any) => any) =>
        Promise.resolve(exec()).then(resolve, reject),
    };
    return chain;
  }

  return {
    mockTableHandlers: handlers,
    mockDb: {
      from: (table: string) => makeChain(table),
    },
  };
});

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({
      handler: (fn: any) => fn,
    }),
    handler: (fn: any) => fn,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => mockDb,
  getAnonServerClient: () => mockDb,
}));

vi.mock("@/lib/server-access", () => ({
  requirePlatformAdmin: vi.fn(),
  getServerIdentity: vi.fn(async () => null),
  assertStoreAccess: vi.fn(),
  STAFF_ROLES: ["owner", "platform_admin", "manager", "admin", "seller"],
}));

vi.mock("@/lib/logger", () => ({
  logSystemError: vi.fn(),
}));

describe("M6 — Bilateralidade CMS, Agendamento de Hotpages & Isolamento Waesy Pro", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockTableHandlers)) {
      delete mockTableHandlers[key];
    }
  });

  it("deve ocultar hotpage expirada, futura, arquivada ou de outra cidade em getHotpageBySlug", async () => {
    const { getHotpageBySlug } = await import("../hotpage.functions");
    const pastIso = new Date(Date.now() - 86_400_000).toISOString();
    const futureIso = new Date(Date.now() + 86_400_000).toISOString();

    mockTableHandlers.hotpages = () => ({
      data: {
        id: "hp-expired",
        slug: "promo-expirada",
        title: "Expirada",
        is_active: true,
        ends_at: pastIso,
      },
      error: null,
    });
    expect(await getHotpageBySlug({ data: { slug: "promo-expirada" } })).toBeNull();

    mockTableHandlers.hotpages = () => ({
      data: {
        id: "hp-future",
        slug: "promo-futura",
        title: "Futura",
        is_active: true,
        starts_at: futureIso,
      },
      error: null,
    });
    expect(await getHotpageBySlug({ data: { slug: "promo-futura" } })).toBeNull();

    mockTableHandlers.hotpages = () => ({
      data: {
        id: "hp-city",
        slug: "promo-chapeco",
        title: "Chapecó",
        is_active: true,
        city_filter: "Chapecó",
      },
      error: null,
    });
    expect(await getHotpageBySlug({ data: { slug: "promo-chapeco", city: "Florianópolis" } })).toBeNull();

    const validResult = await getHotpageBySlug({ data: { slug: "promo-chapeco", city: "Chapecó" } });
    expect(validResult).not.toBeNull();
    expect(validResult?.slug).toBe("promo-chapeco");
  });

  it("deve isolar lojas Waesy Pro (waesy_marketplace_enabled=false) e remover fallback hardcoded de custom_buttons", async () => {
    const { getModularSurfaceFeed } = await import("../surface-cms.functions");

    mockTableHandlers.marketplace_surfaces = () => ({
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        slug: "home",
        title: "Home",
      },
      error: null,
    });

    mockTableHandlers.marketplace_sections = () => ({
      data: [
        {
          id: "sec-buttons-empty",
          surface_id: "11111111-1111-4111-8111-111111111111",
          type: "custom_buttons_rail",
          title: "Atalhos",
          data_source: "custom_buttons",
          ranking_strategy: "curated_fixed",
          layout_variant: "noor_dock",
          item_limit: 8,
          sort_order: 1,
          is_active: true,
          config: {},
        },
        {
          id: "sec-stores",
          surface_id: "11111111-1111-4111-8111-111111111111",
          type: "store_rail",
          title: "Lojas Parceiras",
          data_source: "stores",
          ranking_strategy: "curated_fixed",
          layout_variant: "rail_standard",
          item_limit: 10,
          sort_order: 2,
          is_active: true,
        },
      ],
      error: null,
    });

    mockTableHandlers.stores = () => ({
      data: [
        {
          id: "st-public",
          name: "Loja Marketplace Pública",
          slug: "loja-publica",
          waesy_marketplace_enabled: true,
          publish_to_marketplace: true,
          settings: { segment: "retail" },
          city: "São Miguel do Oeste",
        },
        {
          id: "st-private-saas",
          name: "Agência App Privado Exclusivo",
          slug: "app-privado",
          waesy_marketplace_enabled: false,
          publish_to_marketplace: false,
          settings: { segment: "tourism" },
          city: "São Miguel do Oeste",
        },
      ],
      error: null,
    });

    mockTableHandlers.products = () => ({
      data: [
        {
          id: "prod-public",
          title: "Produto Público",
          slug: "prod-publico",
          store_id: "st-public",
          price_cents: 5000,
          compare_at_cents: 6000,
          status: "published",
          attributes: {},
          media: [],
          store: {
            id: "st-public",
            name: "Loja Marketplace Pública",
            waesy_marketplace_enabled: true,
            publish_to_marketplace: true,
          },
        },
        {
          id: "prod-private-saas",
          title: "Pacote Exclusivo Waesy Pro",
          slug: "prod-privado",
          store_id: "st-private-saas",
          price_cents: 250000,
          compare_at_cents: 250000,
          status: "published",
          attributes: {},
          media: [],
          store: {
            id: "st-private-saas",
            name: "Agência App Privado Exclusivo",
            waesy_marketplace_enabled: false,
            publish_to_marketplace: false,
          },
        },
      ],
      error: null,
    });

    mockTableHandlers.banners = () => ({ data: [], error: null });

    const feed = await getModularSurfaceFeed({ data: { surfaceSlug: "home" } });

    expect(feed.allProducts.map((p) => p.id)).toEqual(["prod-public"]);
    const buttonsSec = feed.sections.find((s) => s.id === "sec-buttons-empty");
    expect(buttonsSec).toBeUndefined();
    const storesSec = feed.sections.find((s) => s.id === "sec-stores");
    expect(storesSec?.items?.map((s: any) => s.id)).toEqual(["st-public"]);
  });
});
