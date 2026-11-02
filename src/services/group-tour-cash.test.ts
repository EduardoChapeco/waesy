import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do @tanstack/react-start
vi.mock("@tanstack/react-start", () => ({
  createServerFn: vi.fn(() => {
    const fnBuilder: any = {
      validator: vi.fn((validatorFn: any) => {
        fnBuilder._validator = validatorFn;
        return fnBuilder;
      }),
      handler: vi.fn((handlerFn: any) => {
        const callable = async (args: any) => {
          let data = args?.data;
          if (fnBuilder._validator && data !== undefined) {
            data = typeof fnBuilder._validator === "function"
              ? fnBuilder._validator(data)
              : fnBuilder._validator.parse(data);
          }
          return handlerFn({ data });
        };
        callable.handler = handlerFn;
        return callable;
      }),
    };
    return fnBuilder;
  }),
}));

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockRpc = vi.fn();

const createQueryBuilder = () => {
  const builder: any = {
    from: vi.fn(() => builder),
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    rpc: mockRpc,
  };
  return builder;
};

let mockDb = createQueryBuilder();

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => mockDb,
}));

const validStoreUuid = "550e8400-e29b-41d4-a716-446655440000";

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn().mockResolvedValue({
    id: "profile-uuid-1",
    store_id: "550e8400-e29b-41d4-a716-446655440000",
    storeId: "550e8400-e29b-41d4-a716-446655440000",
    role: "admin",
    isPlatformAdmin: false,
  }),
  assertStoreAccess: vi.fn(),
}));

import {
  createTourCashEntry,
  deleteTourCashEntry,
  getTourCashSummary,
} from "./group-tour-cash.functions";

describe("Gestão Financeira & Conciliação do Caixa da Excursão (Waesy)", () => {
  const validStoreUuid = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createQueryBuilder();
  });

  it("deve criar lançamento de saída no caixa da excursão e sincronizar com caixa central", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        success: true,
        replayed: false,
        entry: {
          id: "entry-1",
          tour_id: "11111111-2222-3333-4444-555555555555",
          store_id: validStoreUuid,
          entry_type: "outflow",
          category: "toll",
          description: "Pedágio Rodovia BR-101",
          amount_cents: 4500,
          payment_method: "cash",
        },
      },
      error: null,
    });

    const res = await createTourCashEntry({
      data: {
        store_id: validStoreUuid,
        tour_id: "11111111-2222-3333-4444-555555555555",
        entry_type: "outflow",
        category: "toll",
        description: "Pedágio Rodovia BR-101",
        amount_cents: 4500,
        payment_method: "cash",
        sync_with_central_cash: true,
        idempotency_key: "550e8400-e29b-41d4-a716-446655440000",
      },
    });

    expect(res.id).toBe("entry-1");
    expect(res.amount_cents).toBe(4500);
    expect(mockDb.rpc).toHaveBeenCalledWith("record_group_tour_cash_entry", expect.objectContaining({
      p_sync_with_central_cash: true,
      p_idempotency_key: "550e8400-e29b-41d4-a716-446655440000",
    }));
  });

  it("deve estornar por compensação e nunca excluir o lançamento original", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true, replayed: false, entry: { id: "reversal-1" } },
      error: null,
    });

    const result = await deleteTourCashEntry({
      data: {
        store_id: validStoreUuid,
        entry_id: "11111111-2222-3333-4444-555555555555",
        reason: "Correção operacional",
        idempotency_key: "660e8400-e29b-41d4-a716-446655440000",
      },
    });

    expect(result.success).toBe(true);
    expect(mockDb.rpc).toHaveBeenCalledWith("reverse_group_tour_cash_entry", expect.objectContaining({
      p_reason: "Correção operacional",
      p_idempotency_key: "660e8400-e29b-41d4-a716-446655440000",
    }));
    expect(mockDb.delete).not.toHaveBeenCalled();
  });

  it("deve falhar sem confirmar quando o RPC financeiro falha", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "ledger indisponível" },
    });

    await expect(createTourCashEntry({
      data: {
        store_id: validStoreUuid,
        tour_id: "11111111-2222-3333-4444-555555555555",
        entry_type: "outflow",
        category: "toll",
        description: "Pedágio Rodovia BR-101",
        amount_cents: 4500,
        payment_method: "cash",
        idempotency_key: "770e8400-e29b-41d4-a716-446655440000",
      },
    })).rejects.toThrow("ledger indisponível");
  });

  it("deve bloquear tenant divergente antes de chamar o RPC", async () => {
    await expect(createTourCashEntry({
      data: {
        store_id: "660e8400-e29b-41d4-a716-446655440000",
        tour_id: "11111111-2222-3333-4444-555555555555",
        entry_type: "outflow",
        category: "toll",
        description: "Pedágio Rodovia BR-101",
        amount_cents: 4500,
        payment_method: "cash",
        idempotency_key: "880e8400-e29b-41d4-a716-446655440000",
      },
    })).rejects.toThrow("Acesso não autorizado");
    expect(mockDb.rpc).not.toHaveBeenCalled();
  });

  it("deve calcular o resumo financeiro e DRE de lucratividade da excursão", async () => {
    // 1. Mock das entradas e saídas
    mockDb.eq.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValueOnce({
        data: [
          { entry_type: "inflow", category: "advance", amount_cents: 100000 },
          { entry_type: "outflow", category: "fuel", amount_cents: 35000 },
          { entry_type: "outflow", category: "toll", amount_cents: 12000 },
        ],
        error: null,
      }),
    });

    // 2. Mock dos dados da excursão para DRE
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        price_cents: 45000,
        seats: [
          { seat_number: 1, status: "reserved" },
          { seat_number: 2, status: "reserved" },
          { seat_number: 3, status: "available" },
        ],
      },
      error: null,
    });

    const summary = await getTourCashSummary({
      data: {
        store_id: validStoreUuid,
        tour_id: "11111111-2222-3333-4444-555555555555",
      },
    });

    expect(summary.totalInflowsCents).toBe(100000);
    expect(summary.totalOutflowsCents).toBe(47000);
    expect(summary.currentBalanceCents).toBe(53000);
    expect(summary.profitability.totalRevenueCents).toBe(90000); // 2 pax x R$ 450,00
    expect(summary.profitability.grossProfitCents).toBe(43000); // R$ 900 - R$ 470
    expect(summary.profitability.marginPercentage).toBe(48);
  });
});
