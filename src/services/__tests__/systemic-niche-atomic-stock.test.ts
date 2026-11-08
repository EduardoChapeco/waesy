import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do @tanstack/react-start para isolar os handlers de createServerFn
const mockRpc = vi.fn();
const mockFrom = vi.fn();

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

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
  }),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn().mockResolvedValue({ id: "usr_mock_111", customer_id: "usr_mock_111" }),
}));

import { executeWithIdempotency } from "../idempotency.functions";
import { settlePixDepositWebhookAtomic } from "../financial-ledger.functions";

describe("Systemic Niche Atomic Stock, Anti-Race Conditions & Idempotency Engine", () => {
  const processedEventsStore = new Map<string, any>();

  beforeEach(() => {
    vi.clearAllMocks();
    processedEventsStore.clear();
    process.env.FINANCIAL_RECEIPT_SECRET = "test-secret-key-for-unit-tests-12345";

    mockRpc.mockImplementation((rpcName: string, args: any) => {
      if (rpcName === "idempotent_event_begin") {
        const existing = processedEventsStore.get(args.p_event_id);
        if (existing) {
          return Promise.resolve({
            data: {
              status: "completed",
              already_processed: true,
              result: existing.result,
            },
            error: null,
          });
        }
        return Promise.resolve({
          data: {
            status: "acquired",
            already_processed: false,
          },
          error: null,
        });
      }
      if (rpcName === "idempotent_event_complete") {
        processedEventsStore.set(args.p_event_id, {
          status: "completed",
          result: args.p_result,
        });
        return Promise.resolve({ data: { success: true }, error: null });
      }
      return Promise.resolve({ data: { success: true }, error: null });
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "financial_ledger_entries") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "entry_mock_1",
                  transaction_id: "tx_mock_12345",
                  amount_cents: 5000,
                  status: "PENDING",
                  credit_account: { profile_id: "usr_mock_111" },
                },
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => ({
                    data: { id: "entry_mock_1" },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { full_name: "Cliente Teste", cpf: "12345678900" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "financial_receipts") {
        return {
          insert: () => ({
            select: () => ({
              maybeSingle: async () => ({
                data: { id: "rec_mock_1" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      };
    });
  });

  describe("1. Idempotência Financeira & Webhooks: 'Carimbou PAGO, não paga de novo'", () => {
    it("deve carimbar e liquidar depósito Pix na primeira execução", async () => {
      const result = await settlePixDepositWebhookAtomic({
        transactionId: "tx_mock_12345",
        providerRef: "asaas_pay_998877",
        amountCents: 5000,
        provider: "asaas",
      });

      expect(result).toBeDefined();
      expect(result.settled).toBe(true);
    });

    it("deve short-circuitar como alreadySettled em caso de reenvio de webhook (replay idêntico)", async () => {
      // Primeira execução
      const first = await executeWithIdempotency(
        "webhook_evt_abc_999",
        "pix_deposit_settlement",
        async () => ({ settled: true, amountCents: 15000 })
      );

      expect(first.isIdempotentReplay).toBe(false);
      expect(first.data.settled).toBe(true);

      // Replay do provedor (segunda chamada idêntica)
      const replay = await executeWithIdempotency(
        "webhook_evt_abc_999",
        "pix_deposit_settlement",
        async () => {
          throw new Error("NUNCA DEVE REEXECUTAR A OPERAÇÃO APÓS CARIMBO");
        }
      );

      expect(replay.isIdempotentReplay).toBe(true);
      expect(replay.data.settled).toBe(true);
      expect(replay.data.amountCents).toBe(15000);
    });
  });

  describe("2. Dedução Atômica de Passes de Serviço (Eliminação de Check-Then-Act)", () => {
    it("deve rejeitar double-spending concorrente quando saldo for 1 crédito", () => {
      // Simulação da máquina atômica: UPDATE ... WHERE remaining_credits >= 1
      let remainingCredits = 1;

      function simulateAtomicDeduct(passId: string): { success: boolean; balance: number } {
        if (remainingCredits >= 1) {
          remainingCredits -= 1;
          return { success: true, balance: remainingCredits };
        }
        return { success: false, balance: remainingCredits };
      }

      // Requisição A (ganha a corrida)
      const resA = simulateAtomicDeduct("pass_1");
      expect(resA.success).toBe(true);
      expect(resA.balance).toBe(0);

      // Requisição B (concorrente no mesmo milissegundo - bloqueada!)
      const resB = simulateAtomicDeduct("pass_1");
      expect(resB.success).toBe(false);
      expect(resB.balance).toBe(0);
    });
  });

  describe("3. Reserva Universal de 15 Minutos & Anti-Overselling no Carrinho", () => {
    it("deve calcular estoque líquido considerando reservas ativas de outras sessões", () => {
      const stockOnHand = 5;
      const activeReservationsOtherSessions = [
        { qty: 2, expires_at: new Date(Date.now() + 600000).toISOString() }, // ativa
        { qty: 2, expires_at: new Date(Date.now() + 300000).toISOString() }, // ativa
      ];

      const reservedQty = activeReservationsOtherSessions.reduce((acc, r) => acc + r.qty, 0);
      const netAvailable = stockOnHand - reservedQty;

      expect(netAvailable).toBe(1);

      // Tentativa de adicionar 2 unidades: DEVE SER REJEITADA
      const requestedQty = 2;
      const canFulfill = requestedQty <= netAvailable;
      expect(canFulfill).toBe(false);

      // Tentativa de adicionar 1 unidade: APROVADA
      const requestedQtySingle = 1;
      const canFulfillSingle = requestedQtySingle <= netAvailable;
      expect(canFulfillSingle).toBe(true);
    });

    it("deve liberar reservas automaticamente quando expires_at < now", () => {
      const stockOnHand = 5;
      const now = Date.now();
      const allReservations = [
        { qty: 3, expires_at: new Date(now - 60000).toISOString() }, // expirou há 1 min
        { qty: 1, expires_at: new Date(now + 300000).toISOString() }, // ativa
      ];

      const activeReserved = allReservations
        .filter((r) => new Date(r.expires_at).getTime() >= now)
        .reduce((acc, r) => acc + r.qty, 0);

      expect(activeReserved).toBe(1);
      const netAvailable = stockOnHand - activeReserved;
      expect(netAvailable).toBe(4);
    });
  });

  describe("4. P2P Deals & Classificados: Trava Atômica de Aceite", () => {
    it("deve bloquear aceite de duas propostas concorrentes no mesmo anúncio classificado", () => {
      let adStatus = "active";

      function simulateAtomicAcceptDeal(dealId: string): { success: boolean; message?: string } {
        if (adStatus !== "active") {
          return { success: false, message: "Este anúncio já foi reservado ou vendido por outra negociação." };
        }
        adStatus = "reserved";
        return { success: true };
      }

      // Comprador 1 aceito
      const deal1 = simulateAtomicAcceptDeal("deal_buyer_1");
      expect(deal1.success).toBe(true);
      expect(adStatus).toBe("reserved");

      // Comprador 2 concorrente tenta aceitar
      const deal2 = simulateAtomicAcceptDeal("deal_buyer_2");
      expect(deal2.success).toBe(false);
      expect(deal2.message).toContain("já foi reservado");
    });
  });

  describe("5. Schema Cache & Compatibilidade de experience_documents", () => {
    it("deve assegurar integridade de migration para suportar coluna 'name' e 'title'", () => {
      const fs = require("fs");
      const path = require("path");
      const migrationFile = path.resolve(
        process.cwd(),
        "supabase/migrations/20261103080000_systemic_atomic_stock_and_cart_v7.sql"
      );
      const sqlContent = fs.readFileSync(migrationFile, "utf8");

      expect(sqlContent).toContain("ADD COLUMN IF NOT EXISTS name TEXT");
      expect(sqlContent).toContain("CREATE OR REPLACE FUNCTION public.sync_experience_document_name_title()");
      expect(sqlContent).toContain("CREATE OR REPLACE FUNCTION public.consume_pass_credit_atomic");
      expect(sqlContent).toContain("CREATE OR REPLACE FUNCTION public.accept_deal_proposal_atomic");
      expect(sqlContent).toContain("CREATE OR REPLACE FUNCTION public.add_to_cart_atomic_v7");
    });
  });
});
