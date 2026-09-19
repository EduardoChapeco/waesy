import { describe, it, expect, vi } from "vitest";

const mockStore = {
  id: "store-test-123",
  name: "Loja Teste Agro Oeste",
  settings: {
    cash_safes: {
      payroll_target_cents: 500000,
      payroll_current_cents: 250000,
      payroll_retention_pct: 10,
      rent_target_cents: 200000,
      rent_current_cents: 200000,
      rent_retention_pct: 5,
    },
    liquid_balance_cents: 100000,
    financial_obligations: [
      {
        id: "ob-dup-001",
        title: "Insumos e Embalagens",
        category: "supplier",
        supplier_name: "Distribuidora Oeste",
        supplier_cnpj: "12.345.678/0001-90",
        barcode: "NF-e 00129",
        amount_cents: 150000,
        due_date: "2026-10-15",
        status: "pending",
        notes: "Duplicata de matéria-prima",
      },
      {
        id: "ob-folha-001",
        title: "Salários Outubro",
        category: "payroll",
        supplier_name: "Equipe Interna",
        amount_cents: 500000,
        due_date: "2026-11-05",
        status: "pending",
      },
    ],
  },
};

vi.mock("@/lib/supabase", () => ({
  getServerClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "stores") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockStore, error: null }),
              single: vi.fn().mockResolvedValue({ data: mockStore, error: null }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }
      if (table === "orders") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({
                  data: [{ total_cents: 150000 }, { total_cents: 250000 }],
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })) })),
      };
    }),
  })),
}));

import {
  internalGetStoreCashSafesSummary,
  internalListSupplierInvoicesForD0,
  internalScheduleSupplierInvoiceD0,
  internalSimulateWorkingCapital,
} from "./cash-safes.functions";

describe("Cash Safes & Zero-Mock Obligations Services", () => {
  it("1. Deve calcular o resumo dos cofres blindados baseado em dados reais da loja", async () => {
    const summary = await internalGetStoreCashSafesSummary("store-test-123");

    expect(summary).toBeDefined();
    expect(summary.safes).toHaveLength(2);

    const payrollSafe = summary.safes.find((s) => s.type === "payroll");
    expect(payrollSafe).toBeDefined();
    expect(payrollSafe?.currentAmountCents).toBe(250000);
    expect(payrollSafe?.targetAmountCents).toBe(500000);
    expect(payrollSafe?.status).toBe("active");

    const rentSafe = summary.safes.find((s) => s.type === "rent");
    expect(rentSafe).toBeDefined();
    expect(rentSafe?.currentAmountCents).toBe(200000);
    expect(rentSafe?.targetAmountCents).toBe(200000);
    expect(rentSafe?.status).toBe("target_reached");

    expect(summary.totalSafesBalanceCents).toBe(450000);
    expect(summary.liquidBalanceCents).toBe(100000);
    expect(summary.tranquilityDays).toBeGreaterThan(0);
  });

  it("2. Deve listar duplicatas de fornecedores a partir das obrigações financeiras reais (sem mocks)", async () => {
    const invoices = await internalListSupplierInvoicesForD0("store-test-123");

    expect(invoices).toHaveLength(1);
    expect(invoices[0].supplierName).toBe("Distribuidora Oeste");
    expect(invoices[0].supplierCnpj).toBe("12.345.678/0001-90");
    expect(invoices[0].amountCents).toBe(150000);
    expect(invoices[0].status).toBe("pending_schedule");
    expect(invoices[0].discountSavedCents).toBe(3750); // 2.5% de R$ 1.500 = R$ 37,50
  });

  it("3. Deve agendar liquidação D+0 e persistir status na obrigação real", async () => {
    const result = await internalScheduleSupplierInvoiceD0("store-test-123", "ob-dup-001");

    expect(result.success).toBe(true);
    expect(result.invoiceId).toBe("ob-dup-001");
    expect(result.status).toBe("scheduled_d0");
    expect(result.scheduledAt).toBeDefined();
  });

  it("4. Deve simular capital de giro solidário atrelado às vendas reais de pedidos", async () => {
    const simulation = await internalSimulateWorkingCapital("store-test-123", 200000, 10);

    expect(simulation).toBeDefined();
    expect(simulation.requestedAmountCents).toBe(200000); // R$ 2.000
    expect(simulation.retentionPercentage).toBe(10);
    expect(simulation.dailyEstimatedRetentionCents).toBeGreaterThan(0);
    expect(simulation.totalRepaymentCents).toBeGreaterThan(simulation.requestedAmountCents);
    expect(simulation.totalCostCents).toBeGreaterThan(0);
  });

  it("5. Deve retornar array vazio quando a loja não tiver obrigações de fornecedor (Zero Mocks)", async () => {
    const emptyInvoices = await internalListSupplierInvoicesForD0(null);
    expect(emptyInvoices).toEqual([]);
  });
});
