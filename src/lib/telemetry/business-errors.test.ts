import { describe, it, expect, beforeEach } from "vitest";
import {
  recordBusinessError,
  businessErrorsRegistry,
  BusinessError,
} from "./business-errors";

describe("Business Errors Telemetry (Fase S36)", () => {
  beforeEach(() => {
    businessErrorsRegistry.clear();
  });

  describe("recordBusinessError", () => {
    it("deve registrar falhas de pagamento e higienizar PII", () => {
      const event = recordBusinessError({
        code: "PAYMENT_REJECTED",
        message: "Cartão recusado para token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ae",
        tenantId: "tenant_store_abc",
        userId: "user_789",
        context: {
          gateway: "asaas",
          cardNumber: "4111 1111 1111 1234",
          amountCents: 15990,
        },
      });

      expect(event.code).toBe("PAYMENT_REJECTED");
      expect(event.message).toContain("[REDACTED_JWT]");
      expect(event.context?.cardNumber).toBe("[REDACTED_CARD]");
      expect(event.context?.amountCents).toBe(15990);
      expect(event.tenantId).toBe("tenant_store_abc");
      expect(event.traceId).toContain("biz_");
    });

    it("deve acumular contadores globais e por tenant", () => {
      recordBusinessError({
        code: "STOCK_DEPLETED",
        message: "Vagas esgotadas para excursão",
        tenantId: "tenant_turismo_1",
      });

      recordBusinessError({
        code: "STOCK_DEPLETED",
        message: "Sem estoque para item X",
        tenantId: "tenant_turismo_1",
      });

      recordBusinessError({
        code: "PLAN_QUOTA_EXCEEDED",
        message: "Limite de 50 produtos atingido no plano Free",
        tenantId: "tenant_loja_2",
      });

      const freqGlobal = businessErrorsRegistry.getFrequencyByCode();
      expect(freqGlobal.STOCK_DEPLETED).toBe(2);
      expect(freqGlobal.PLAN_QUOTA_EXCEEDED).toBe(1);
      expect(freqGlobal.PAYMENT_REJECTED).toBe(0);

      expect(businessErrorsRegistry.totalErrorsRecorded).toBe(3);

      const freqTenant1 = businessErrorsRegistry.getFrequencyByTenant("tenant_turismo_1");
      expect(freqTenant1.STOCK_DEPLETED).toBe(2);
      expect(freqTenant1.PLAN_QUOTA_EXCEEDED).toBeUndefined();

      const freqTenant2 = businessErrorsRegistry.getFrequencyByTenant("tenant_loja_2");
      expect(freqTenant2.PLAN_QUOTA_EXCEEDED).toBe(1);
    });
  });

  describe("BusinessError Class", () => {
    it("deve criar instância tipada de erro de negócio", () => {
      const err = new BusinessError("INVALID_STATE_TRANSITION", "Não é permitido cancelar pedido entregue", {
        tenantId: "tenant_restaurante",
        context: { currentStatus: "delivered", requestedStatus: "cancelled" },
      });

      expect(err.name).toBe("BusinessError");
      expect(err.code).toBe("INVALID_STATE_TRANSITION");
      expect(err.tenantId).toBe("tenant_restaurante");
      expect(err.context?.currentStatus).toBe("delivered");
    });
  });
});
