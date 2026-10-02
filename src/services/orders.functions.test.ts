/**
 * orders.functions.test.ts — Testes Unitários de Gestão de Pedidos do Workspace Pro
 *
 * Fase F11 do Plano Mestre de Estabilização dos 4 Pilares.
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

const MOCK_STORE_ID = "550e8400-e29b-41d4-a716-446655440001";
const MOCK_ORDER_ID = "550e8400-e29b-41d4-a716-446655440002";

const mockIdentity = {
  id: "550e8400-e29b-41d4-a716-446655440099",
  store_id: MOCK_STORE_ID,
  role: "owner",
};

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => mockIdentity),
  assertStoreAccess: vi.fn(() => true),
}));

// Mock do Supabase
const mockOrdersRows = [
  {
    id: MOCK_ORDER_ID,
    order_number: 1001,
    public_token: "ord_tok_abc123",
    status: "paid",
    total_cents: 12500,
    subtotal_cents: 10000,
    shipping_cents: 2500,
    discount_cents: 0,
    created_at: "2026-10-01T15:00:00Z",
    shipping_method: "motoboy",
    customer_snapshot: {
      name: "João Silva",
      email: "joao@exemplo.com",
      phone: "49999991111",
    },
    order_items: [
      {
        id: "item-1",
        product_title: "Hambúrguer Artesanal",
        variant_sku: "BURGER-01",
        qty: 2,
        unit_price_cents: 5000,
        total_cents: 10000,
      },
    ],
  },
];

const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn(() => ({
  eq: () => ({ eq: mockUpdateEq }),
}));

const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockOrdersRows[0], error: null });

const mockFrom = vi.fn((table: string) => {
  if (table === "orders") {
    return {
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: vi.fn().mockResolvedValue({ data: mockOrdersRows, error: null }),
          }),
          eq: () => ({
            maybeSingle: mockMaybeSingle,
          }),
        }),
      }),
      update: mockUpdate,
    };
  }
  return {
    select: () => ({ eq: () => Promise.resolve({ data: [] }) }),
  };
});

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: mockFrom,
  }),
}));

import {
  listOrdersFn,
  getOrderDetailFn,
  updateOrderStatusFn,
  listOrdersInputSchema,
  updateOrderStatusInputSchema,
} from "./orders.functions";

describe("F11: orders.functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Deve validar schemas Zod de listagem e atualização de status", () => {
    expect(listOrdersInputSchema.safeParse({ status: "paid" }).success).toBe(true);
    expect(listOrdersInputSchema.safeParse({ status: "all" }).success).toBe(true);
    expect(listOrdersInputSchema.safeParse({ status: "invalid_status" }).success).toBe(false);

    expect(
      updateOrderStatusInputSchema.safeParse({
        orderId: MOCK_ORDER_ID,
        status: "shipped",
      }).success
    ).toBe(true);

    expect(
      updateOrderStatusInputSchema.safeParse({
        orderId: "",
        status: "shipped",
      }).success
    ).toBe(false);
  });

  it("2. Deve listar pedidos da loja com mapeamento tipado de itens e clientes", async () => {
    const orders = await listOrdersFn({
      data: { status: "all", storeId: MOCK_STORE_ID },
    });

    expect(orders).toHaveLength(1);
    const ord = orders[0];
    expect(ord.id).toBe(MOCK_ORDER_ID);
    expect(ord.orderNumber).toBe(1001);
    expect(ord.customerName).toBe("João Silva");
    expect(ord.totalCents).toBe(12500);
    expect(ord.items).toHaveLength(1);
    expect(ord.items[0].productTitle).toBe("Hambúrguer Artesanal");
  });

  it("3. Deve consultar detalhes completos de um pedido específico", async () => {
    const order = await getOrderDetailFn({
      data: { orderId: MOCK_ORDER_ID, storeId: MOCK_STORE_ID },
    });

    expect(order).not.toBeNull();
    expect(order?.id).toBe(MOCK_ORDER_ID);
    expect(order?.customerEmail).toBe("joao@exemplo.com");
    expect(order?.shippingMethod).toBe("motoboy");
  });

  it("4. Deve atualizar status do pedido com sucesso", async () => {
    const result = await updateOrderStatusFn({
      data: {
        orderId: MOCK_ORDER_ID,
        status: "processing",
        storeId: MOCK_STORE_ID,
      },
    });

    expect(result.success).toBe(true);
    expect(result.newStatus).toBe("processing");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "processing",
        prep_started_at: expect.any(String),
      })
    );
  });
});
