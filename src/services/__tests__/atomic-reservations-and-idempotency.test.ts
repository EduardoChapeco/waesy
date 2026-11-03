import { describe, it, expect, vi, beforeEach } from "vitest";

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
  getServerIdentity: vi.fn().mockResolvedValue({ id: "user-123", store_id: "store-456" }),
}));

import {
  reserveResourceAtomic,
  consumeReservationAtomic,
  releaseReservationAtomic,
  getReservationStatus,
  ReserveResourceSchema,
  ConsumeReservationSchema,
  ReleaseReservationSchema,
} from "../atomic-reservations.functions";
import {
  beginIdempotentEvent,
  completeIdempotentEvent,
  failIdempotentEvent,
  executeWithIdempotency,
  BeginIdempotentEventSchema,
  CompleteIdempotentEventSchema,
} from "../idempotency.functions";

describe("SPEC-006: Atomic Reservations Engine (15 Min - Anti-Race Condition)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockReset();
    mockFrom.mockReset();
  });

  describe("1. Validação de Schemas Zod (Rule B.25)", () => {
    it("deve validar payload de reserva atômica de 15 minutos", () => {
      const parsed = ReserveResourceSchema.parse({
        resourceType: "product_variant",
        resourceId: "e5033c5e-bf33-4c60-a29d-ee8efce7d8e2",
        qty: 3,
        sessionId: "session-cart-123",
        minutes: 15,
      });
      expect(parsed.qty).toBe(3);
      expect(parsed.minutes).toBe(15);
      expect(parsed.resourceType).toBe("product_variant");
    });

    it("deve rejeitar quantidade negativa ou nula de reserva", () => {
      expect(() =>
        ReserveResourceSchema.parse({
          resourceType: "deal",
          resourceId: "e5033c5e-bf33-4c60-a29d-ee8efce7d8e2",
          qty: 0,
          sessionId: "session-xyz",
        }),
      ).toThrow();
    });

    it("deve validar schemas de consumo e liberação", () => {
      const parsedConsume = ConsumeReservationSchema.parse({
        reservationId: "c7e0c7a5-48b4-4b58-9418-49f3900cb401",
        orderId: "6a86f9c9-55e1-4c75-9276-880fa1cf7a52",
      });
      expect(parsedConsume.reservationId).toBeDefined();

      const parsedRelease = ReleaseReservationSchema.parse({
        reservationId: "c7e0c7a5-48b4-4b58-9418-49f3900cb401",
      });
      expect(parsedRelease.reservationId).toBeDefined();
    });
  });

  describe("2. Execução das RPCs Atômicas de Reserva", () => {
    it("deve reservar atomicamente um item por 15 minutos com sucesso", async () => {
      const fakeReservation = {
        reservation_id: "c7e0c7a5-48b4-4b58-9418-49f3900cb401",
        resource_type: "product_variant",
        resource_id: "e5033c5e-bf33-4c60-a29d-ee8efce7d8e2",
        qty: 2,
        status: "active",
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        expires_in_seconds: 900,
      };

      mockRpc.mockResolvedValueOnce({ data: fakeReservation, error: null });

      const result = await (reserveResourceAtomic as any)({
        data: {
          resourceType: "product_variant",
          resourceId: "e5033c5e-bf33-4c60-a29d-ee8efce7d8e2",
          qty: 2,
          sessionId: "cart-session-abc",
          minutes: 15,
        },
      });

      expect(result.status).toBe("active");
      expect(result.qty).toBe(2);
      expect(result.expires_in_seconds).toBe(900);
      expect(mockRpc).toHaveBeenCalledWith("reserve_resource_15min_atomic", {
        p_resource_type: "product_variant",
        p_resource_id: "e5033c5e-bf33-4c60-a29d-ee8efce7d8e2",
        p_qty: 2,
        p_session_id: "cart-session-abc",
        p_user_id: "user-123",
        p_minutes: 15,
        p_metadata: {},
      });
    });

    it("deve lançar erro quando o estoque for insuficiente ou já reservado", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "Estoque insuficiente ou reservado por outro cliente (disponível: 0, solicitado: 1)" },
      });

      await expect(
        (reserveResourceAtomic as any)({
          data: {
            resourceType: "product_variant",
            resourceId: "e5033c5e-bf33-4c60-a29d-ee8efce7d8e2",
            qty: 1,
            sessionId: "cart-session-xyz",
            minutes: 15,
          },
        }),
      ).rejects.toThrow("Estoque insuficiente ou reservado por outro cliente");
    });

    it("deve consumir a reserva atomicamente no fechamento de compra", async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          status: "consumed",
          reservation_id: "c7e0c7a5-48b4-4b58-9418-49f3900cb401",
          resource_type: "product_variant",
          resource_id: "e5033c5e-bf33-4c60-a29d-ee8efce7d8e2",
          qty: 2,
        },
        error: null,
      });

      const result = await (consumeReservationAtomic as any)({
        data: {
          reservationId: "c7e0c7a5-48b4-4b58-9418-49f3900cb401",
          orderId: "6a86f9c9-55e1-4c75-9276-880fa1cf7a52",
        },
      });

      expect(result.status).toBe("consumed");
      expect(mockRpc).toHaveBeenCalledWith("consume_reservation_atomic", {
        p_reservation_id: "c7e0c7a5-48b4-4b58-9418-49f3900cb401",
        p_order_id: "6a86f9c9-55e1-4c75-9276-880fa1cf7a52",
      });
    });

    it("deve liberar a reserva antecipadamente se o cliente cancelar ou esvaziar carrinho", async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          status: "released",
          reservation_id: "c7e0c7a5-48b4-4b58-9418-49f3900cb401",
          resource_type: "product_variant",
          resource_id: "e5033c5e-bf33-4c60-a29d-ee8efce7d8e2",
        },
        error: null,
      });

      const result = await (releaseReservationAtomic as any)({
        data: {
          reservationId: "c7e0c7a5-48b4-4b58-9418-49f3900cb401",
        },
      });

      expect(result.status).toBe("released");
      expect(mockRpc).toHaveBeenCalledWith("release_reservation_atomic", {
        p_reservation_id: "c7e0c7a5-48b4-4b58-9418-49f3900cb401",
      });
    });

    it("deve calcular corretamente status e segundos restantes de expiração", async () => {
      const futureDate = new Date(Date.now() + 600 * 1000).toISOString(); // 10 min no futuro
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: {
            id: "c7e0c7a5-48b4-4b58-9418-49f3900cb401",
            resource_type: "deal",
            resource_id: "e5033c5e-bf33-4c60-a29d-ee8efce7d8e2",
            qty: 1,
            status: "active",
            expires_at: futureDate,
            created_at: new Date().toISOString(),
            metadata: {},
          },
          error: null,
        }),
      });

      const status = await (getReservationStatus as any)({
        data: {
          reservationId: "c7e0c7a5-48b4-4b58-9418-49f3900cb401",
        },
      });

      expect(status.isExpired).toBe(false);
      expect(status.remainingSeconds).toBeGreaterThan(500);
      expect(status.status).toBe("active");
    });
  });
});

describe("SPEC-006: Strict Idempotency Engine ('Carimbou PAGO, Não Paga de Novo')", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockReset();
    mockFrom.mockReset();
  });

  describe("1. Validação de Schemas de Idempotência", () => {
    it("deve validar identificador e escopo de evento", () => {
      const parsed = BeginIdempotentEventSchema.parse({
        eventId: "evt_pix_987654",
        scope: "payment_webhook",
      });
      expect(parsed.eventId).toBe("evt_pix_987654");
      expect(parsed.scope).toBe("payment_webhook");
    });

    it("deve validar payload de conclusão de evento", () => {
      const parsed = CompleteIdempotentEventSchema.parse({
        eventId: "evt_pix_987654",
        result: { status: "paid", amountCents: 15000 },
      });
      expect(parsed.result.status).toBe("paid");
    });
  });

  describe("2. Execução da Máquina de Estados de Idempotência", () => {
    it("deve adquirir a trava de evento quando for a primeira execução", async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          status: "acquired",
          already_processed: false,
          is_retry: false,
        },
        error: null,
      });

      const init = await (beginIdempotentEvent as any)({
        data: {
          eventId: "evt_pix_123456",
          scope: "payment_webhook",
        },
      });

      expect(init.status).toBe("acquired");
      expect(init.already_processed).toBe(false);
    });

    it("deve carimbar a conclusão definitiva de um evento com seu resultado", async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          status: "completed",
          event_id: "evt_pix_123456",
        },
        error: null,
      });

      const res = await (completeIdempotentEvent as any)({
        data: {
          eventId: "evt_pix_123456",
          result: { orderId: "ord-789", amountCents: 5000, paid: true },
        },
      });

      expect(res.status).toBe("completed");
      expect(mockRpc).toHaveBeenCalledWith("idempotent_event_complete", {
        p_event_id: "evt_pix_123456",
        p_result: { orderId: "ord-789", amountCents: 5000, paid: true },
      });
    });

    it("executeWithIdempotency: não deve executar handler se o evento já estiver carimbado como concluído", async () => {
      const cachedResult = { orderId: "ord-999", status: "paid" };

      mockRpc.mockResolvedValueOnce({
        data: {
          status: "completed",
          already_processed: true,
          result: cachedResult,
        },
        error: null,
      });

      const spyHandler = vi.fn().mockResolvedValue({ orderId: "should_not_run" });

      const execution = await executeWithIdempotency("evt_replay_001", "payment", spyHandler);

      expect(execution.isIdempotentReplay).toBe(true);
      expect(execution.data).toEqual(cachedResult);
      expect(spyHandler).not.toHaveBeenCalled();
    });

    it("executeWithIdempotency: deve executar handler e carimbar conclusão na primeira execução", async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: {
            status: "acquired",
            already_processed: false,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { status: "completed" },
          error: null,
        });

      const expectedOutput = { orderToken: "tok-123", success: true };
      const handler = vi.fn().mockResolvedValue(expectedOutput);

      const execution = await executeWithIdempotency("evt_fresh_002", "order_create", handler);

      expect(execution.isIdempotentReplay).toBe(false);
      expect(execution.data).toEqual(expectedOutput);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(mockRpc).toHaveBeenCalledWith("idempotent_event_complete", {
        p_event_id: "evt_fresh_002",
        p_result: expectedOutput,
      });
    });

    it("executeWithIdempotency: deve carimbar falha e propagar erro caso o handler falhe", async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: {
            status: "acquired",
            already_processed: false,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { status: "failed" },
          error: null,
        });

      const failingHandler = vi.fn().mockRejectedValue(new Error("Cartão sem limite"));

      await expect(
        executeWithIdempotency("evt_fail_003", "payment", failingHandler),
      ).rejects.toThrow("Cartão sem limite");

      expect(mockRpc).toHaveBeenCalledWith("idempotent_event_fail", {
        p_event_id: "evt_fail_003",
        p_error: "Cartão sem limite",
      });
    });

    it("executeWithIdempotency: deve rejeitar corrida de requisições simultâneas em processamento", async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          status: "processing",
          already_processing: true,
          message: "Evento já em processamento por outra requisição simultânea",
        },
        error: null,
      });

      const spyHandler = vi.fn();

      await expect(
        executeWithIdempotency("evt_concurrent_004", "payment", spyHandler),
      ).rejects.toThrow("Evento já em processamento por outra requisição simultânea");

      expect(spyHandler).not.toHaveBeenCalled();
    });
  });
});
