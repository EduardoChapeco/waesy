import { describe, it, expect } from "vitest";
import { z } from "zod";

// Validadores e regras de negócio canônicas de cancelamento e recompra (DEC-276)
export const cancelOrderInputSchema = z.object({
  orderId: z.string().uuid("ID de pedido inválido."),
  reason: z.string().optional(),
});

export const reorderInputSchema = z.object({
  orderId: z.string().uuid("ID de pedido inválido."),
});

// Máquina de estados canônica do ciclo de vida de pedidos Waesy
export const ELIGIBLE_CANCEL_STATUSES = ["draft", "awaiting_payment", "paid", "processing"];
export const TERMINAL_STATUSES = ["delivered", "completed", "cancelled", "returned"];

export function canCustomerCancelOrder(status: string): boolean {
  return ELIGIBLE_CANCEL_STATUSES.includes(status);
}

export function buildCancelReason(clientReason?: string): string {
  return clientReason?.trim()
    ? `Cancelado pelo cliente: ${clientReason.trim()}`
    : "Cancelado pelo cliente.";
}

export function revalidateVariantForReorder(
  orderItem: { product_title: string; unit_price_cents: number },
  catalogVariant: { price_cents: number; is_active: boolean } | null,
): { valid: boolean; price: number; warning?: string } {
  if (!catalogVariant || catalogVariant.is_active === false) {
    return {
      valid: false,
      price: orderItem.unit_price_cents,
      warning: `O item "${orderItem.product_title}" não está mais disponível no catálogo.`,
    };
  }

  const effectivePrice = catalogVariant.price_cents ?? orderItem.unit_price_cents;
  const priceChanged = effectivePrice !== orderItem.unit_price_cents;

  return {
    valid: true,
    price: effectivePrice,
    warning: priceChanged
      ? `O preço de "${orderItem.product_title}" foi atualizado no catálogo.`
      : undefined,
  };
}

describe("Módulo Pedidos / Histórico de Pedidos — Regras de Negócio e Transações (DEC-276)", () => {
  describe("1. Validação de Schemas e Contratos de Entrada", () => {
    it("deve validar payload correto de cancelamento", () => {
      const parsed = cancelOrderInputSchema.safeParse({
        orderId: "a0000000-0000-0000-0000-000000000001",
        reason: "Comprei o produto duplicado",
      });
      expect(parsed.success).toBe(true);
    });

    it("deve rejeitar UUID inválido no cancelamento", () => {
      const parsed = cancelOrderInputSchema.safeParse({
        orderId: "invalid-uuid",
      });
      expect(parsed.success).toBe(false);
    });

    it("deve validar payload de recompra", () => {
      const parsed = reorderInputSchema.safeParse({
        orderId: "a0000000-0000-0000-0000-000000000001",
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe("2. Elegibilidade e Barreira de Cancelamento do Cliente", () => {
    it("deve permitir cancelamento para pedidos em estados iniciais (draft, awaiting_payment, paid, processing)", () => {
      expect(canCustomerCancelOrder("draft")).toBe(true);
      expect(canCustomerCancelOrder("awaiting_payment")).toBe(true);
      expect(canCustomerCancelOrder("paid")).toBe(true);
      expect(canCustomerCancelOrder("processing")).toBe(true);
    });

    it("deve bloquear cancelamento para pedidos despachados ou entregues (deve usar RMA / Devolução)", () => {
      expect(canCustomerCancelOrder("shipped")).toBe(false);
      expect(canCustomerCancelOrder("ready_for_pickup")).toBe(false);
      expect(canCustomerCancelOrder("delivered")).toBe(false);
      expect(canCustomerCancelOrder("completed")).toBe(false);
      expect(canCustomerCancelOrder("cancelled")).toBe(false);
    });

    it("deve formatar motivo de cancelamento com prefixo canônico auditável", () => {
      expect(buildCancelReason("Endereço incorreto")).toBe("Cancelado pelo cliente: Endereço incorreto");
      expect(buildCancelReason("")).toBe("Cancelado pelo cliente.");
      expect(buildCancelReason(undefined)).toBe("Cancelado pelo cliente.");
    });
  });

  describe("3. Revalidação de Catálogo para Recompra (Pedir Novamente)", () => {
    it("deve rejeitar item inativo ou removido do catálogo emitindo aviso claro", () => {
      const item = { product_title: "Queijo Minas Padrão", unit_price_cents: 3500 };
      const variant = { price_cents: 3500, is_active: false };

      const result = revalidateVariantForReorder(item, variant);
      expect(result.valid).toBe(false);
      expect(result.warning).toContain("não está mais disponível no catálogo");
    });

    it("deve aprovar item ativo e sinalizar atualização de preço se o catálogo foi alterado", () => {
      const item = { product_title: "Queijo Serrano Artesanal", unit_price_cents: 5000 };
      const variant = { price_cents: 5500, is_active: true };

      const result = revalidateVariantForReorder(item, variant);
      expect(result.valid).toBe(true);
      expect(result.price).toBe(5500);
      expect(result.warning).toContain("foi atualizado no catálogo");
    });

    it("deve aprovar item mantendo o preço vigente sem avisos se não houve alteração", () => {
      const item = { product_title: "Vinho Tinto Fino", unit_price_cents: 9000 };
      const variant = { price_cents: 9000, is_active: true };

      const result = revalidateVariantForReorder(item, variant);
      expect(result.valid).toBe(true);
      expect(result.price).toBe(9000);
      expect(result.warning).toBeUndefined();
    });
  });

  describe("4. Resolução da Linha do Tempo e Timestamps Históricos", () => {
    it("deve calcular o índice correto do progresso visual com base no status", () => {
      const getStepIndex = (st: string): number => {
        switch (st) {
          case "draft":
          case "awaiting_payment":
            return 0;
          case "payment_processing":
          case "paid":
            return 1;
          case "processing":
            return 2;
          case "ready_for_pickup":
          case "shipped":
            return 3;
          case "delivered":
          case "completed":
            return 4;
          default:
            return -1;
        }
      };

      expect(getStepIndex("awaiting_payment")).toBe(0);
      expect(getStepIndex("paid")).toBe(1);
      expect(getStepIndex("processing")).toBe(2);
      expect(getStepIndex("shipped")).toBe(3);
      expect(getStepIndex("ready_for_pickup")).toBe(3);
      expect(getStepIndex("delivered")).toBe(4);
    });
  });
});
