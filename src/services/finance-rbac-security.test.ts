import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock da sessão e identidade segura
let mockCurrentIdentity = {
  id: "user-123",
  role: "seller",
  store_id: "store-xyz-456",
  memberships: [{ store_id: "store-xyz-456", role: "seller" }],
};

vi.mock("@/lib/server-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server-access")>();
  return {
    ...actual,
    getServerIdentity: vi.fn(async () => mockCurrentIdentity),
  };
});

vi.mock("@/lib/supabase", () => {
  return {
    getServerClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "tx-1",
                    type: "expense_shipping",
                    amount_cents: -5000,
                    description: "Frete Motoboy",
                    reference_date: "2026-09-29",
                    order_id: null,
                    created_at: "2026-09-29T10:00:00Z",
                  },
                ],
                error: null,
              }),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "tx-manual-1",
                type: "expense_fee",
                amount_cents: -1500,
                description: "Taxa bancária",
                reference_date: "2026-09-29",
                created_by: "user-123",
              },
              error: null,
            }),
          })),
        })),
      })),
    })),
    SupabaseUnconfiguredError: class extends Error {},
  };
});

import { _listFinancialTransactions, _createManualTransaction } from "./finance.functions";

describe("Finance RBAC & Data Protection Security Audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Deve BLOQUEAR vendedor/operador de caixa comum sem privilégio financeiro de listar o DRE/transações", async () => {
    mockCurrentIdentity = {
      id: "user-seller-1",
      role: "seller",
      store_id: "store-xyz-456",
      memberships: [{ store_id: "store-xyz-456", role: "seller" }],
    };

    await expect(_listFinancialTransactions({})).rejects.toThrow(
      /Unauthorized|Insufficient permissions/i
    );
  });

  it("2. Deve PERMITIR que gestor financeiro (finance) liste as transações da loja", async () => {
    mockCurrentIdentity = {
      id: "user-fin-1",
      role: "finance",
      store_id: "store-xyz-456",
      memberships: [{ store_id: "store-xyz-456", role: "finance" }],
    };

    const res = await _listFinancialTransactions({});
    expect(res).toBeDefined();
    expect(Array.isArray(res)).toBe(true);
    expect(res[0].id).toBe("tx-1");
  });

  it("3. Deve PERMITIR que proprietário(a) (owner) liste as transações da loja", async () => {
    mockCurrentIdentity = {
      id: "user-owner-1",
      role: "owner",
      store_id: "store-xyz-456",
      memberships: [{ store_id: "store-xyz-456", role: "owner" }],
    };

    const res = await _listFinancialTransactions({});
    expect(res).toBeDefined();
    expect(res.length).toBeGreaterThan(0);
  });

  it("4. Deve BLOQUEAR lançamentos manuais de receitas (receitas devem provir estritamente de vendas reais)", async () => {
    mockCurrentIdentity = {
      id: "user-owner-1",
      role: "owner",
      store_id: "store-xyz-456",
      memberships: [{ store_id: "store-xyz-456", role: "owner" }],
    };

    await expect(
      _createManualTransaction({
        type: "revenue_sale" as any,
        amount_cents: 10000,
        description: "Tentativa de injeção manual de receita",
      })
    ).rejects.toThrow(/não pode ser lançado manualmente/i);
  });

  it("5. Deve PERMITIR lançamento manual de despesas por perfis autorizados (gravando com valor negativo)", async () => {
    mockCurrentIdentity = {
      id: "user-manager-1",
      role: "manager",
      store_id: "store-xyz-456",
      memberships: [{ store_id: "store-xyz-456", role: "manager" }],
    };

    const created = await _createManualTransaction({
      type: "expense_fee",
      amount_cents: 1500,
      description: "Taxa bancária",
    });

    expect(created).toBeDefined();
    expect(created.amount_cents).toBe(-1500);
  });
});
