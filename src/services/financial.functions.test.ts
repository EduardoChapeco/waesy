import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listFinancialEntriesSchema,
  createFinancialEntrySchema,
  getCashFlowSummarySchema,
  _createManualTransaction,
  _getFinancialSummary,
  _listFinancialTransactions,
} from "./financial.functions";

let mockIdentity = {
  id: "user-test-uuid",
  role: "admin",
  store_id: "store-test-uuid",
  memberships: [{ store_id: "store-test-uuid", role: "admin" }],
};

vi.mock("@/lib/server-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server-access")>();
  return {
    ...actual,
    getServerIdentity: vi.fn(async () => mockIdentity),
    assertStoreAccess: vi.fn(() => true),
  };
});

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
  SupabaseUnconfiguredError: class SupabaseUnconfiguredError extends Error {},
}));

describe("Financial Management Server Functions (F17)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Zod Validation Schemas", () => {
    it("validates listFinancialEntriesSchema with valid parameters", () => {
      const valid = {
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        type: "expense_shipping",
        category: "logistica",
        limit: 20,
        offset: 0,
      };
      const res = listFinancialEntriesSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("validates createFinancialEntrySchema and enforces positive amount and min description", () => {
      const valid = {
        type: "expense_other",
        amount_cents: 1500,
        description: "Embalagens plasticas",
      };
      const res = createFinancialEntrySchema.safeParse(valid);
      expect(res.success).toBe(true);

      const invalidAmount = createFinancialEntrySchema.safeParse({
        type: "expense_other",
        amount_cents: 0,
        description: "Embalagens",
      });
      expect(invalidAmount.success).toBe(false);

      const invalidDesc = createFinancialEntrySchema.safeParse({
        type: "expense_other",
        amount_cents: 1500,
        description: "Oi",
      });
      expect(invalidDesc.success).toBe(false);
    });

    it("validates getCashFlowSummarySchema strictly requiring start and end dates", () => {
      const valid = {
        startDate: "2026-10-01",
        endDate: "2026-10-15",
      };
      expect(getCashFlowSummarySchema.safeParse(valid).success).toBe(true);

      const missingEnd = getCashFlowSummarySchema.safeParse({
        startDate: "2026-10-01",
      });
      expect(missingEnd.success).toBe(false);
    });
  });

  describe("Business Invariants", () => {
    it("prohibits manual creation of revenue entries via _createManualTransaction", async () => {
      await expect(
        _createManualTransaction({
          type: "revenue_sale",
          amount_cents: 10000,
          description: "Tentativa de injecao de receita",
        }),
      ).rejects.toThrow(/não pode ser lançado manualmente/i);
    });

    it("correctly computes cash flow summary aggregating revenue, expenses and refunds", async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({
              data: [
                { type: "revenue_sale", amount_cents: 25000 },
                { type: "revenue_pos_sale", amount_cents: 5000 },
                { type: "expense_shipping", amount_cents: 3000 },
                { type: "refund", amount_cents: 2000 },
              ],
              error: null,
            }),
          }),
        }),
      });

      const summary = await _getFinancialSummary({
        startDate: "2026-10-01",
        endDate: "2026-10-31",
      });

      expect(summary.total_revenue_cents).toBe(30000);
      expect(summary.total_expense_cents).toBe(3000);
      expect(summary.total_refund_cents).toBe(2000);
      expect(summary.net_cents).toBe(25000);
      expect(summary.transaction_count).toBe(4);
    });
  });
});
