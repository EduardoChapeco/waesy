/**
 * workspace-dashboard.functions.test.ts — Testes do Dashboard de KPIs Reais do Workspace Pro
 *
 * Fase F10 do Plano Mestre de Estabilização dos 4 Pilares.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do createServerFn do @tanstack/react-start
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

const MOCK_STORE_ID = "550e8400-e29b-41d4-a716-446655440001";

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
const mockOrdersGte = vi.fn().mockResolvedValue({
  data: [
    { id: "ord-1", status: "paid", total_cents: 15000, created_at: "2026-10-01T10:00:00Z" },
    { id: "ord-2", status: "completed", total_cents: 25000, created_at: "2026-10-01T11:00:00Z" },
    { id: "ord-3", status: "pending", total_cents: 10000, created_at: "2026-10-01T12:00:00Z" },
  ],
});

const mockProductsEq = vi.fn().mockResolvedValue({
  data: [
    { id: "prod-1", status: "active", stock_quantity: 10 },
    { id: "prod-2", status: "published", stock_quantity: 0 },
    { id: "prod-3", status: "draft", stock_quantity: 5 },
  ],
});

const mockFinancialGte = vi.fn().mockResolvedValue({
  data: [
    { amount_cents: 40000, type: "revenue_sale" },
    { amount_cents: 5000, type: "expense_shipping" },
  ],
});

const mockFrom = vi.fn((table: string) => {
  if (table === "orders") {
    return {
      select: () => ({
        eq: () => ({
          gte: mockOrdersGte,
        }),
      }),
    };
  }
  if (table === "products") {
    return {
      select: () => ({
        eq: mockProductsEq,
      }),
    };
  }
  if (table === "customers_crm") {
    return {
      select: () => ({
        eq: () => ({
          is: () => ({
            count: 42,
            gte: () => Promise.resolve({ count: 8 }),
          }),
        }),
      }),
    };
  }
  if (table === "financial_transactions") {
    return {
      select: () => ({
        eq: () => ({
          gte: mockFinancialGte,
        }),
      }),
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
  getWorkspaceDashboardKpisFn,
  workspaceDashboardKpisInputSchema,
} from "./workspace-dashboard.functions";

describe("F10: workspace-dashboard.functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Deve validar schemas de período (today, 7d, 30d)", () => {
    expect(workspaceDashboardKpisInputSchema.safeParse({ period: "today" }).success).toBe(true);
    expect(workspaceDashboardKpisInputSchema.safeParse({ period: "7d" }).success).toBe(true);
    expect(workspaceDashboardKpisInputSchema.safeParse({ period: "30d" }).success).toBe(true);
    // @ts-expect-error período inválido
    expect(workspaceDashboardKpisInputSchema.safeParse({ period: "1year" }).success).toBe(false);
  });

  it("2. Deve calcular métricas de vendas e receita com precisão inteira em centavos", async () => {
    const kpis = await getWorkspaceDashboardKpisFn({
      data: { period: "30d", storeId: MOCK_STORE_ID },
    });

    // 15000 + 25000 = 40000 centavos
    expect(kpis.sales.totalRevenueCents).toBe(40000);
    expect(kpis.sales.ordersCount).toBe(3);
    // Ticket médio dos 2 pagos: 40000 / 2 = 20000 centavos
    expect(kpis.sales.averageTicketCents).toBe(20000);
    expect(kpis.sales.pendingOrdersCount).toBe(1);
  });

  it("3. Deve calcular métricas de catálogo com ativos e esgotados", async () => {
    const kpis = await getWorkspaceDashboardKpisFn({
      data: { period: "30d", storeId: MOCK_STORE_ID },
    });

    expect(kpis.products.totalProductsCount).toBe(3);
    expect(kpis.products.activeProductsCount).toBe(2); // active e published
    expect(kpis.products.outOfStockCount).toBe(1); // stock_quantity = 0
  });

  it("4. Deve calcular finanças com receita, despesa e lucro líquido", async () => {
    const kpis = await getWorkspaceDashboardKpisFn({
      data: { period: "30d", storeId: MOCK_STORE_ID },
    });

    expect(kpis.financial.totalIncomeCents).toBe(40000);
    expect(kpis.financial.totalExpenseCents).toBe(5000);
    expect(kpis.financial.netProfitCents).toBe(35000); // 40000 - 5000
  });
});
