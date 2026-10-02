import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CreateSupportTicketSchema,
  AddTicketMessageSchema,
  listSupportTicketsFn,
  getSupportTicketDetailsFn,
  createSupportTicketFn,
  addSupportTicketMessageFn,
  updateSupportTicketStatusFn,
} from "./support-tickets.functions";

describe("Support Tickets Module with SLA (F18)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validation Schemas & SLA Configuration", () => {
    it("validates CreateSupportTicketSchema with valid parameters and defaults", () => {
      const validPayload = {
        store_id: "550e8400-e29b-41d4-a716-446655440000",
        subject: "Erro na sincronizacao de pedidos",
        category: "integration",
        priority: "high",
        initial_message: "Os pedidos da API externa estao demorando para refletir.",
        sla_minutes: 480,
      };

      const result = CreateSupportTicketSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe("high");
        expect(result.data.sla_minutes).toBe(480);
      }
    });

    it("enforces minimum subject length of 4 characters", () => {
      const invalidPayload = {
        store_id: "550e8400-e29b-41d4-a716-446655440000",
        subject: "Bug",
        category: "system_bug",
        initial_message: "Descricao detalhada do bug no painel",
      };

      const result = CreateSupportTicketSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("enforces minimum initial_message length of 5 characters", () => {
      const invalidPayload = {
        store_id: "550e8400-e29b-41d4-a716-446655440000",
        subject: "Assunto do chamado",
        category: "finance",
        initial_message: "Erro",
      };

      const result = CreateSupportTicketSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("rejects unknown ticket categories", () => {
      const invalidPayload = {
        store_id: "550e8400-e29b-41d4-a716-446655440000",
        subject: "Assunto do chamado",
        category: "invalid_category",
        initial_message: "Mensagem descritiva valida",
      };

      const result = CreateSupportTicketSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("validates AddTicketMessageSchema and rejects empty replies", () => {
      const validReply = {
        ticket_id: "550e8400-e29b-41d4-a716-446655440000",
        message: "Estamos verificando os logs agora.",
      };
      expect(AddTicketMessageSchema.safeParse(validReply).success).toBe(true);

      const emptyReply = {
        ticket_id: "550e8400-e29b-41d4-a716-446655440000",
        message: "a",
      };
      expect(AddTicketMessageSchema.safeParse(emptyReply).success).toBe(false);
    });
  });

  describe("Canonical Aliases Availability", () => {
    it("exports all canonical aliases for F18 compliance", () => {
      expect(typeof listSupportTicketsFn).toBe("function");
      expect(typeof getSupportTicketDetailsFn).toBe("function");
      expect(typeof createSupportTicketFn).toBe("function");
      expect(typeof addSupportTicketMessageFn).toBe("function");
      expect(typeof updateSupportTicketStatusFn).toBe("function");
    });
  });
});
