/**
 * workspace-catalog.functions.test.ts — Testes Unitários do Catálogo de Produtos do Workspace Pro
 *
 * Fase F12 do Plano Mestre de Estabilização dos 4 Pilares.
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

vi.mock("@/lib/cache/edge-cache", () => ({
  purgeEdgeCacheTags: vi.fn(),
  CACHE_TAGS: {
    catalog: (id: string) => `catalog:${id}`,
  },
}));

const MOCK_STORE_ID = "550e8400-e29b-41d4-a716-446655440001";
const MOCK_PRODUCT_ID = "550e8400-e29b-41d4-a716-446655440002";

const mockIdentity = {
  id: "550e8400-e29b-41d4-a716-446655440099",
  store_id: MOCK_STORE_ID,
  role: "owner",
};

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => mockIdentity),
  assertStoreAccess: vi.fn(() => true),
  STAFF_ROLES: ["owner", "admin", "manager", "seller", "support"],
}));

const mockProductsRows = [
  {
    id: MOCK_PRODUCT_ID,
    title: "Camiseta Algodão Egípcio",
    slug: "camiseta-algodao-egipcio",
    price_cents: 8900,
    compare_at_cents: 12000,
    cost_cents: 3500,
    status: "published",
    created_at: "2026-10-01T12:00:00Z",
    category_id: null,
    product_media: [
      { url: "https://cdn.waesy.com/products/cam-01.jpg", alt: "Frente", sort_order: 0 },
    ],
    product_variants: [
      {
        id: "var-1",
        sku: "CAM-EGI-M",
        price_override_cents: null,
        stock_on_hand: 15,
        allow_backorder: false,
      },
      {
        id: "var-2",
        sku: "CAM-EGI-G",
        price_override_cents: 9900,
        stock_on_hand: 5,
        allow_backorder: true,
      },
    ],
  },
];

const mockInsert = vi.fn(() => ({
  select: () => ({
    single: vi.fn().mockResolvedValue({
      data: {
        id: MOCK_PRODUCT_ID,
        slug: "produto-teste",
        title: "Produto Teste",
        status: "draft",
        price_cents: 5000,
        created_at: "2026-10-02T10:00:00Z",
      },
      error: null,
    }),
  }),
}));

const mockFrom = vi.fn((table: string) => {
  if (table === "products") {
    return {
      select: () => ({
        eq: () => ({
          neq: () => ({
            order: () => ({
              limit: vi.fn().mockResolvedValue({ data: mockProductsRows, error: null }),
            }),
          }),
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { ...mockProductsRows[0], store_id: MOCK_STORE_ID },
              error: null,
            }),
          }),
        }),
      }),
      insert: mockInsert,
      update: vi.fn(() => ({
        eq: () => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })),
    };
  }

  if (table === "product_media" || table === "product_variants") {
    return {
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    };
  }

  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
});

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: mockFrom,
  }),
}));

import {
  createWorkspaceProductInputSchema,
  updateWorkspaceProductInputSchema,
  listWorkspaceProductsInputSchema,
  listWorkspaceProductsFn,
  createWorkspaceProductFn,
  updateWorkspaceProductFn,
  archiveWorkspaceProductFn,
  getWorkspaceProductDetailFn,
} from "./workspace-catalog.functions";

describe("F12: workspace-catalog.functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Deve validar schemas Zod de criação, atualização e listagem", () => {
    expect(
      createWorkspaceProductInputSchema.safeParse({
        title: "Café Especial Torrado 250g",
        slug: "cafe-especial-torrado",
        priceCents: 4500,
      }).success
    ).toBe(true);

    expect(
      createWorkspaceProductInputSchema.safeParse({
        title: "A", // Título muito curto
        slug: "cafe",
        priceCents: 100,
      }).success
    ).toBe(false);

    expect(
      createWorkspaceProductInputSchema.safeParse({
        title: "Café Especial",
        slug: "Cafe Com Espaço", // Slug inválido
        priceCents: 100,
      }).success
    ).toBe(false);

    expect(
      createWorkspaceProductInputSchema.safeParse({
        title: "Café Especial",
        slug: "cafe-especial",
        priceCents: -500, // Preço negativo
      }).success
    ).toBe(false);

    expect(
      updateWorkspaceProductInputSchema.safeParse({
        productId: MOCK_PRODUCT_ID,
        priceCents: 4800,
      }).success
    ).toBe(true);

    expect(
      listWorkspaceProductsInputSchema.safeParse({
        status: "published",
        limit: 50,
      }).success
    ).toBe(true);
  });

  it("2. Deve listar produtos com cálculo correto de estoque total e coverUrl", async () => {
    const res = await listWorkspaceProductsFn({
      data: {
        storeId: MOCK_STORE_ID,
        status: "all",
        limit: 20,
      },
    });

    expect(res.products).toHaveLength(1);
    const prod = res.products[0];
    expect(prod.id).toBe(MOCK_PRODUCT_ID);
    expect(prod.title).toBe("Camiseta Algodão Egípcio");
    expect(prod.priceCents).toBe(8900);
    expect(prod.compareAtCents).toBe(12000);
    expect(prod.costCents).toBe(3500);
    expect(prod.coverUrl).toBe("https://cdn.waesy.com/products/cam-01.jpg");
    // 15 + 5 = 20 total stock
    expect(prod.totalStock).toBe(20);
    expect(prod.isOutOfStock).toBe(false);
  });

  it("3. Deve criar produto com variantes, mídias e purga de cache edge", async () => {
    const res = await createWorkspaceProductFn({
      data: {
        storeId: MOCK_STORE_ID,
        title: "Novo Moletom Streetwear",
        slug: "novo-moletom-streetwear",
        priceCents: 19900,
        mediaUrls: ["https://cdn.waesy.com/products/moletom-01.jpg"],
        variants: [
          { sku: "MOL-BLK-M", stockOnHand: 10, attributes: { cor: "Preto", tamanho: "M" } },
        ],
      },
    });

    expect(res.success).toBe(true);
    expect(res.productId).toBe(MOCK_PRODUCT_ID);
  });

  it("4. Deve atualizar produto e validar isolamento de loja", async () => {
    const res = await updateWorkspaceProductFn({
      data: {
        productId: MOCK_PRODUCT_ID,
        storeId: MOCK_STORE_ID,
        title: "Camiseta Algodão Premium",
        priceCents: 9500,
      },
    });

    expect(res.success).toBe(true);
    expect(res.productId).toBe(MOCK_PRODUCT_ID);
  });

  it("5. Deve arquivar produto com transição soft delete e obter detalhe", async () => {
    const archiveRes = await archiveWorkspaceProductFn({
      data: {
        productId: MOCK_PRODUCT_ID,
        storeId: MOCK_STORE_ID,
      },
    });

    expect(archiveRes.success).toBe(true);
    expect(archiveRes.archived).toBe(true);

    const detail = await getWorkspaceProductDetailFn({
      data: {
        productId: MOCK_PRODUCT_ID,
        storeId: MOCK_STORE_ID,
      },
    });

    expect(detail).not.toBeNull();
    expect(detail?.title).toBe("Camiseta Algodão Egípcio");
    expect(detail?.variants).toHaveLength(2);
  });
});
