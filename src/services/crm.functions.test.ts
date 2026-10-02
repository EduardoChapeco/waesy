/**
 * crm.functions.test.ts — Testes Unitários do CRM de Clientes do Workspace Pro
 *
 * Fase F13 do Plano Mestre de Estabilização dos 4 Pilares.
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
const MOCK_CUSTOMER_ID = "550e8400-e29b-41d4-a716-446655440002";

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

const mockCustomersCrmRows = [
  {
    id: MOCK_CUSTOMER_ID,
    store_id: MOCK_STORE_ID,
    full_name: "Mariana Silva Ramos",
    legal_name: null,
    kind: "individual",
    document: "123.456.789-00",
    email: "mariana.ramos@exemplo.com",
    phone: "49999998888",
    city: "São Miguel do Oeste",
    state: "SC",
    address: "Rua Marcílio Dias, 100",
    channel: "whatsapp",
    status: "active",
    tags: ["VIP", "Recorrente"],
    notes: "Prefere contato via WhatsApp",
    total_orders: 2,
    total_spent_cents: 35000,
    last_order_at: "2026-10-01T14:00:00Z",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-10-01T14:00:00Z",
    deleted_at: null,
  },
];

const mockOrdersRows = [
  {
    id: "ord-1",
    customer_id: MOCK_CUSTOMER_ID,
    total_cents: 15000,
    status: "paid",
    created_at: "2026-09-15T10:00:00Z",
    public_token: "tok-ord-1",
  },
  {
    id: "ord-2",
    customer_id: MOCK_CUSTOMER_ID,
    total_cents: 20000,
    status: "delivered",
    created_at: "2026-10-01T14:00:00Z",
    public_token: "tok-ord-2",
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
    lt: vi.fn(() => builder),
    single: vi.fn(async () => ({ data: Array.isArray(dataToReturn) ? dataToReturn[0] : dataToReturn, error: null })),
    maybeSingle: vi.fn(async () => ({ data: Array.isArray(dataToReturn) ? dataToReturn[0] : dataToReturn, error: null })),
    then: (resolve: any) => resolve({ data: dataToReturn, error: null }),
  };
  return builder;
}

const mockFrom = vi.fn((table: string) => {
  if (table === "customers_crm") return createFluentBuilder(mockCustomersCrmRows);
  if (table === "orders") return createFluentBuilder(mockOrdersRows);
  if (table === "customer_documents") return createFluentBuilder([]);
  if (table === "workspace_members") return createFluentBuilder([]);
  return createFluentBuilder([]);
});

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: mockFrom,
  }),
}));

import {
  listCustomersInputSchema,
  listCustomersFn,
  getCustomerDetailFn,
} from "./crm.functions";

describe("F13: crm.functions — CRM de Clientes do Workspace Pro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Deve validar schemas Zod de busca e filtros de clientes", () => {
    expect(listCustomersInputSchema?.safeParse({ status: "active", limit: 20 }).success).toBe(true);
    expect(listCustomersInputSchema?.safeParse({ status: "all", query: "Mariana" }).success).toBe(true);
    expect(listCustomersInputSchema?.safeParse({ kind: "individual" }).success).toBe(true);
    expect(listCustomersInputSchema?.safeParse({ status: "invalid_status" }).success).toBe(false);
  });

  it("2. Deve listar clientes reais com agregação calculada de LTV e histórico de pedidos", async () => {
    const list = await listCustomersFn({
      data: { status: "all", limit: 50 },
    });

    expect(list).toHaveLength(1);
    const customer = list[0];
    expect(customer.id).toBe(MOCK_CUSTOMER_ID);
    expect(customer.fullName).toBe("Mariana Silva Ramos");
    expect(customer.email).toBe("mariana.ramos@exemplo.com");
    expect(customer.phone).toBe("49999998888");
    expect(customer.status).toBe("active");
    expect(customer.channel).toBe("whatsapp");

    // 15000 (pago) + 20000 (entregue) = 35000 centavos LTV
    expect(customer.orderCount).toBe(2);
    expect(customer.ltvCents).toBe(35000);
  });

  it("3. Deve resolver visão 360 do cliente com histórico completo de pedidos", async () => {
    const detail = await getCustomerDetailFn({
      data: { customerId: MOCK_CUSTOMER_ID },
    });

    expect(detail).toBeDefined();
    expect(detail.profile.id).toBe(MOCK_CUSTOMER_ID);
    expect(detail.profile.fullName).toBe("Mariana Silva Ramos");
    expect(detail.orders).toHaveLength(2);
    expect(detail.orders[0].total_cents).toBe(15000);
    expect(detail.orders[1].total_cents).toBe(20000);
    expect(detail.ltvCents).toBe(35000);
  });
});
