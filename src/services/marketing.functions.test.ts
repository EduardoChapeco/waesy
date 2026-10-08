import { beforeEach, describe, expect, it, vi } from "vitest";

const STORE_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440099";
const CART_ID = "550e8400-e29b-41d4-a716-446655440002";
const ABANDONED_ID = "550e8400-e29b-41d4-a716-446655440003";

const testState = vi.hoisted(() => ({
  identity: {
    id: "550e8400-e29b-41d4-a716-446655440099" as string | null,
    role: "owner",
    store_id: "550e8400-e29b-41d4-a716-446655440001" as string | null,
    memberships: [
      { store_id: "550e8400-e29b-41d4-a716-446655440001", role: "owner" },
    ],
  },
  responseQueues: {} as Record<string, { data: any; error: any }[]>,
  actions: [] as { table: string; method: string; args: any[] }[],
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any = {}) => fn({ data: schema.parse(args?.data) }),
    }),
    handler: (fn: any) => async (args: any = {}) => fn(args || {}),
  }),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: async () => testState.identity,
  assertStoreAccess: (identity: any, allowedRoles: string[], targetStoreId?: string | null) => {
    if (!identity?.id) throw new Error("Unauthorized: User not authenticated.");
    const storeId = targetStoreId || identity.store_id;
    if (!storeId) throw new Error("Unauthorized: No active store context found.");
    const membership = identity.memberships?.find((entry: any) => entry.store_id === storeId);
    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new Error("Unauthorized: Insufficient permissions for store.");
    }
    identity.store_id = storeId;
    identity.role = membership.role;
  },
}));

function createQuery(table: string) {
  const queue = testState.responseQueues[table] || [];
  const response = queue.length > 0 ? queue.shift()! : { data: [], error: null };
  const query: any = {};
  const chainable = ["select", "eq", "lt", "gt", "in", "order", "range"];
  for (const method of chainable) {
    query[method] = (...args: any[]) => {
      testState.actions.push({ table, method, args });
      return query;
    };
  }
  for (const method of ["upsert", "update"]) {
    query[method] = (...args: any[]) => {
      testState.actions.push({ table, method, args });
      return query;
    };
  }
  query.maybeSingle = async () => response;
  query.single = async () => response;
  query.then = (resolve: (value: any) => any, reject?: (reason: any) => any) =>
    Promise.resolve(response).then(resolve, reject);
  return query;
}

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({ from: (table: string) => createQuery(table) }),
}));

import {
  generateMatchTimeOffers,
  getStoreSocialShareSettings,
  listAbandonedCarts,
  markRecoveryAttempt,
  scanAbandonedCarts,
} from "./marketing.functions";

function queue(table: string, ...responses: { data: any; error: any }[]) {
  testState.responseQueues[table] = [...(testState.responseQueues[table] || []), ...responses];
}

function resetIdentity() {
  testState.identity = {
    id: USER_ID,
    role: "owner",
    store_id: STORE_ID,
    memberships: [{ store_id: STORE_ID, role: "owner" }],
  };
}

beforeEach(() => {
  testState.responseQueues = {};
  testState.actions = [];
  resetIdentity();
});

describe("getStoreSocialShareSettings — defaults neutros", () => {
  it("não inventa nome da loja nem promete WhatsApp, rapidez, compra ou reserva", async () => {
    queue("stores", {
      data: { id: STORE_ID, name: null, slug: null, logo_url: null, banner_url: null, headline: null, settings: {} },
      error: null,
    });

    const settings = await getStoreSocialShareSettings();

    expect(settings.store_name).toBe("Nome não informado");
    expect(settings.store_slug).toBe("");
    expect(settings.og_description_template).toBe("Confira {item_title}.");
    expect(settings.whatsapp_share_template).toBe("Confira {item_title} ({item_price}): {item_url}");
    expect(`${settings.og_description_template} ${settings.whatsapp_share_template}`).not.toMatch(/atendimento rápido|compre online|reserve|whatsapp!/i);
  });
});

describe("marketing.functions — falhas e dados ausentes", () => {
  it("retorna zero somente quando a consulta de carrinhos conclui sem resultados", async () => {
    queue("carts", { data: [], error: null });

    await expect(scanAbandonedCarts()).resolves.toMatchObject({
      scanned: 0,
      newAbandons: 0,
      inactivityHeuristicHours: 2,
    });
    expect(testState.actions).toContainEqual({ table: "carts", method: "eq", args: ["status", "active"] });
  });

  it("propaga erro ao consultar carrinhos em vez de apresentá-lo como zero", async () => {
    queue("carts", { data: null, error: { message: "database unavailable" } });

    await expect(scanAbandonedCarts()).rejects.toThrow("database unavailable");
  });

  it("não conta uma inserção de snapshot quando o upsert falha", async () => {
    queue("carts", { data: [{ id: CART_ID, customer_id: USER_ID, updated_at: "2026-10-01T12:00:00Z" }], error: null });
    queue("cart_items", {
      data: [{
        variant_id: "550e8400-e29b-41d4-a716-446655440004",
        qty: 2,
        price_snapshot_cents: 1250,
        product_variants: { canonical_name: "Azul", products: { title: "Produto" } },
      }],
      error: null,
    });
    queue("abandoned_carts", { data: null, error: { message: "insert failed" } });

    await expect(scanAbandonedCarts()).rejects.toThrow("insert failed");
    expect(testState.actions.some((action) => action.table === "abandoned_carts" && action.method === "upsert")).toBe(true);
  });

  it("não cria classificação para carrinho sem itens e propaga falha ao ler seus itens", async () => {
    queue("carts", { data: [{ id: CART_ID, customer_id: USER_ID, updated_at: "2026-10-01T12:00:00Z" }], error: null });
    queue("cart_items", { data: [], error: null });
    await expect(scanAbandonedCarts()).resolves.toMatchObject({ scanned: 0, newAbandons: 0 });

    queue("carts", { data: [{ id: CART_ID, customer_id: USER_ID, updated_at: "2026-10-01T12:00:00Z" }], error: null });
    queue("cart_items", { data: null, error: { message: "items unavailable" } });
    await expect(scanAbandonedCarts()).rejects.toThrow("items unavailable");
  });

  it("distingue uma lista realmente vazia de uma falha ao listar", async () => {
    queue("abandoned_carts", { data: [], error: null });
    await expect(listAbandonedCarts()).resolves.toEqual([]);

    queue("abandoned_carts", { data: null, error: { message: "list unavailable" } });
    await expect(listAbandonedCarts()).rejects.toThrow("list unavailable");
  });

  it("não informa sucesso se o registro da tentativa não existe ou se o update falha", async () => {
    queue("abandoned_carts", { data: null, error: null });
    await expect(markRecoveryAttempt({ data: { id: ABANDONED_ID } })).rejects.toThrow("não encontrado");

    queue("abandoned_carts", { data: { recovery_attempts: 1 }, error: null });
    queue("abandoned_carts", { data: null, error: { message: "update failed" } });
    await expect(markRecoveryAttempt({ data: { id: ABANDONED_ID } })).rejects.toThrow("update failed");
  });

  it("só confirma a tentativa após o update retornar a linha alterada", async () => {
    queue("abandoned_carts", { data: { recovery_attempts: 1 }, error: null });
    queue("abandoned_carts", { data: { id: ABANDONED_ID }, error: null });

    await expect(markRecoveryAttempt({ data: { id: ABANDONED_ID } })).resolves.toEqual({ success: true });
    expect(testState.actions).toContainEqual({ table: "abandoned_carts", method: "eq", args: ["recovery_attempts", 1] });

    queue("abandoned_carts", { data: { recovery_attempts: 1 }, error: null });
    queue("abandoned_carts", { data: null, error: null });
    await expect(markRecoveryAttempt({ data: { id: ABANDONED_ID } })).rejects.toThrow("mudou durante a atualização");
  });
});

describe("generateMatchTimeOffers — escopo e preço confirmado", () => {
  it("exige autenticação e membership antes de consultar uma loja", async () => {
    testState.identity.id = null;

    await expect(generateMatchTimeOffers()).rejects.toThrow("not authenticated");
    expect(testState.actions).toHaveLength(0);

    testState.identity.id = USER_ID;
    testState.identity.memberships = [];
    await expect(generateMatchTimeOffers()).rejects.toThrow("Insufficient permissions");
    expect(testState.actions).toHaveLength(0);
  });

  it("retorna preços originais, valida store_id e pagina além de 20 itens", async () => {
    queue("stores", { data: { id: STORE_ID }, error: null });
    const firstPage = Array.from({ length: 1000 }, (_, index) => ({
      id: `variant-${index}`,
      price_cents: 2500 + index,
      canonical_name: `Variação ${index}`,
      products: { id: `product-${index}`, title: `Produto ${index}`, store_id: STORE_ID, is_active: true },
      product_media: [],
    }));
    const secondPage = Array.from({ length: 25 }, (_, index) => ({
      id: `variant-${1000 + index}`,
      price_cents: 4000 + index,
      canonical_name: `Variação ${1000 + index}`,
      products: { id: `product-${1000 + index}`, title: `Produto ${1000 + index}`, store_id: STORE_ID, is_active: true },
      product_media: [],
    }));
    queue("product_variants", { data: firstPage, error: null }, { data: secondPage, error: null });
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    try {
      const items = await generateMatchTimeOffers();
      expect(items).toHaveLength(5);
      expect(items.every((item) => typeof item.originalPrice === "number")).toBe(true);
      expect(items.every((item) => !("discountPercentage" in item) && !("matchPrice" in item))).toBe(true);
      expect(testState.actions).toContainEqual({ table: "product_variants", method: "eq", args: ["products.store_id", STORE_ID] });
      expect(testState.actions).toContainEqual({ table: "product_variants", method: "range", args: [0, 999] });
      expect(testState.actions).toContainEqual({ table: "product_variants", method: "range", args: [1000, 1999] });
      expect(testState.actions.some((action) => action.table === "eventos_campanhas")).toBe(false);
      expect(randomSpy).toHaveBeenCalledTimes(1024);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("lança falha da consulta de produtos em vez de converter erro em lista vazia", async () => {
    queue("stores", { data: { id: STORE_ID }, error: null });
    queue("product_variants", { data: null, error: { message: "catalog unavailable" } });

    await expect(generateMatchTimeOffers()).rejects.toThrow("catalog unavailable");
  });

  it("retorna lista vazia apenas se a consulta da loja tiver êxito sem produtos", async () => {
    queue("stores", { data: { id: STORE_ID }, error: null });
    queue("product_variants", { data: [], error: null });

    await expect(generateMatchTimeOffers()).resolves.toEqual([]);
  });
});
