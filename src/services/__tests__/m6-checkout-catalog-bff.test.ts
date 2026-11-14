import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, mockIdentity, mockGuestSession, mockEnv } = vi.hoisted(() => ({
  mockDb: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
  mockIdentity: {
    customer_id: "cust-1",
    userId: "user-1",
    id: "user-1",
  },
  mockGuestSession: vi.fn(async () => null),
  mockEnv: {
    clientIp: "127.0.0.1",
  },
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({
      handler: (fn: any) => fn,
    }),
    handler: (fn: any) => fn,
  }),
}));

vi.mock("@tanstack/start-server-core", () => ({
  getRequest: () => ({
    headers: new Headers({ "user-agent": "vitest" }),
  }),
}));

vi.mock("@/lib/supabase", () => {
  class SupabaseUnconfiguredError extends Error {}
  return {
    getServerClient: () => mockDb,
    SupabaseUnconfiguredError,
  };
});

vi.mock("@/lib/server-access", () => ({
  requireAdmin: vi.fn(async () => ({ id: "admin-1", store_id: "store-1" })),
  getServerIdentity: vi.fn(async () => ({ id: "admin-1", store_id: "store-1", role: "owner" })),
  getSSRClient: () => mockDb,
  assertOwnerAccess: vi.fn(),
  getGuestSession: mockGuestSession,
}));

vi.mock("@/lib/cache/edge-cache", () => ({
  purgeEdgeCacheTags: vi.fn(async () => undefined),
  CACHE_TAGS: {
    product: (id: string) => `product:${id}`,
    store: (id: string) => `store:${id}`,
    catalog: (id: string) => `catalog:${id}`,
  },
}));

vi.mock("@/lib/architecture/module-plan-governance", () => ({
  assertStoreEntitlement: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logSystemError: vi.fn(),
}));

vi.mock("@/lib/http-cookies", () => ({
  readCookieFromRequest: () => null,
}));

vi.mock("@/lib/rate-limiter", () => ({
  enforceRateLimit: vi.fn(),
  extractClientIp: () => mockEnv.clientIp,
}));

vi.mock("@/services/cart-helpers", () => ({
  getCurrentIdentity: vi.fn(async () => mockIdentity),
  withDataPayload: (schema: any) => schema,
}));

vi.mock("@/services/security.functions", () => ({
  generateTransactionCertificate: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/services/wz-engine.functions", () => ({
  consumeCheckoutWzAtomic: vi.fn(async () => ({ deductedCents: 0 })),
}));

describe("M6 BFF — listAdminProducts error propagation & processCheckout atomic persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listAdminProducts propaga erro SQL em vez de retornar array vazio silencioso", async () => {
    mockDb.from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({
              data: null,
              error: { message: "db products down" },
            }),
          }),
        }),
      }),
    }));

    const { listAdminProducts } = await import("../admin-catalog.functions");
    await expect(listAdminProducts({ data: {} })).rejects.toThrow(
      "Erro ao listar produtos do catálogo.",
    );
  });

  it("processCheckout não soma valor do order bump se o insert em order_items falhar", async () => {
    const orderUpdates: any[] = [];

    mockDb.rpc.mockImplementation(async (fnName: string) => {
      if (fnName === "process_checkout_transaction_v2") {
        return {
          data: {
            status: "success",
            orderId: "00000000-0000-0000-0000-000000000101",
            orderToken: "tok-101",
            orderNumber: "W-101",
            is_idempotent_replay: false,
          },
          error: null,
        };
      }
      if (fnName === "finalize_order_and_dispatch_motolink_atomic") {
        return { data: { ok: true }, error: null };
      }
      return { data: null, error: null };
    });

    mockDb.from.mockImplementation((table: string) => {
      if (table === "carts") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "00000000-0000-0000-0000-000000000010",
                  customer_id: "cust-1",
                  session_token: null,
                  status: "active",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "customer_debt_ledger") {
        return {
          select: () => ({
            eq: () => ({
              or: async () => ({ data: [], error: null }),
              eq: async () => ({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  total_cents: 5000,
                  shipping_cents: 500,
                  subtotal_cents: 4500,
                },
                error: null,
              }),
            }),
          }),
          update: (payload: any) => {
            orderUpdates.push(payload);
            return {
              eq: async () => ({ error: null }),
            };
          },
        };
      }
      if (table === "order_items") {
        return {
          insert: async () => ({
            error: { message: "violates foreign key order_items_variant_id_fkey" },
          }),
        };
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      };
    });

    const { processCheckout } = await import("../checkout.functions");

    const res = await processCheckout({
      data: {
        cartId: "00000000-0000-0000-0000-000000000010",
        customerName: "Maria Silva",
        customerEmail: "maria@waesy.com.br",
        shippingMethod: "pickup",
        paymentMethod: "pix",
        orderBump: {
          ruleId: "00000000-0000-0000-0000-000000000201",
          productId: "00000000-0000-0000-0000-000000000202",
          variantId: "00000000-0000-0000-0000-000000000203",
          offerPriceCents: 1990,
          title: "Item Bump Extra",
        },
      },
    } as any);

    expect(res.status).toBe("success");
    expect(orderUpdates).toHaveLength(1);
    expect(orderUpdates[0].total_cents).toBeUndefined();
    expect(orderUpdates[0].subtotal_cents).toBeUndefined();
    expect(orderUpdates[0].channel_origin).toBe("vitrine_online");
  });
});
