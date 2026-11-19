import { describe, it, expect } from "vitest";
import {
  classifyCommercialAttentionNature,
  calculateNextOrderCycle,
} from "../b2b-portfolio-routes.functions";
import {
  computePromotionDiscount,
  isPromotionEligibleForB2B,
} from "../promotions.functions";

describe("Waesy B2B Commercial Lifecycle & Multi-Catalog Engine E2E", () => {
  describe("1. Auditoria Cruzada de Atenção Comercial (GPS × WhatsApp × Pedidos)", () => {
    it("deve classificar como presencial_gps_validado quando check-in está dentro do geofence de 200m", () => {
      const res = classifyCommercialAttentionNature({
        hasValidGps: true,
        distanceToCustomerMeters: 45,
        messagesCount: 0,
      });
      expect(res.nature).toBe("presencial_gps_validado");
      expect(res.summary).toContain("dentro do geofence (45m)");
    });

    it("deve classificar como presencial_sem_gps_evidencia_chat quando há áudio/mensagem de chegada mas GPS falhou", () => {
      const resChat = classifyCommercialAttentionNature({
        hasValidGps: false,
        distanceToCustomerMeters: null,
        hasChatEvidenceOfVisit: true,
        messagesCount: 3,
      });
      expect(resChat.nature).toBe("presencial_sem_gps_evidencia_chat");
      expect(resChat.summary).toContain("evidência semântica");

      const resVoice = classifyCommercialAttentionNature({
        hasValidGps: false,
        distanceToCustomerMeters: null,
        hasVoiceTranscript: true,
        messagesCount: 0,
      });
      expect(resVoice.nature).toBe("presencial_sem_gps_evidencia_chat");
    });

    it("deve classificar como digital_whatsapp_confirmado quando há troca de mensagens sem visita presencial", () => {
      const res = classifyCommercialAttentionNature({
        hasValidGps: false,
        distanceToCustomerMeters: null,
        messagesCount: 8,
      });
      expect(res.nature).toBe("digital_whatsapp_confirmado");
      expect(res.summary).toContain("8 mensagens");
    });

    it("deve classificar como divergencia_alerta quando check-in está a mais de 500m do cliente sem contato digital", () => {
      const res = classifyCommercialAttentionNature({
        hasValidGps: false,
        distanceToCustomerMeters: 750,
        messagesCount: 0,
      });
      expect(res.nature).toBe("divergencia_alerta");
      expect(res.summary).toContain("Alerta: Check-in a mais de 750m");
    });

    it("deve classificar como marcado_manual_sem_evidencia quando não há telemetria nem mensagens", () => {
      const res = classifyCommercialAttentionNature({
        hasValidGps: false,
        distanceToCustomerMeters: null,
        messagesCount: 0,
      });
      expect(res.nature).toBe("marcado_manual_sem_evidencia");
    });
  });

  describe("2. Sincronização de Ciclo de Recompra Pós-Pedido", () => {
    it("deve calcular a data exata da próxima atenção comercial somando os dias médios de recompra", () => {
      const orderDate = "2026-11-01T10:00:00.000Z";
      const nextDate = calculateNextOrderCycle(orderDate, 14);
      expect(nextDate).toBe("2026-11-15");
    });

    it("deve suportar ciclos de recompra customizados (ex: semanal para hortifruti ou mensal para químicos)", () => {
      const orderDate = "2026-11-01T10:00:00.000Z";
      expect(calculateNextOrderCycle(orderDate, 7)).toBe("2026-11-08");
      expect(calculateNextOrderCycle(orderDate, 30)).toBe("2026-12-01");
    });

    it("deve garantir piso defensivo de no mínimo 1 dia caso o input seja zero ou negativo", () => {
      const orderDate = "2026-11-01T10:00:00.000Z";
      expect(calculateNextOrderCycle(orderDate, 0)).toBe("2026-11-02");
      expect(calculateNextOrderCycle(orderDate, -5)).toBe("2026-11-02");
    });
  });

  describe("3. Segmentação de Promoções B2B (Catálogos, Tabelas e Carteiras)", () => {
    const catalogA = "11111111-1111-4111-8111-111111111111";
    const catalogB = "22222222-2222-4222-8222-222222222222";
    const tableVip = "33333333-3333-4333-8333-333333333333";
    const tableStandard = "44444444-4444-4444-8444-444444444444";
    const sellerJohn = "55555555-5555-4555-8555-555555555555";
    const sellerMary = "66666666-6666-4666-8666-666666666666";

    it("deve rejeitar promoção inativa ou fora do período de vigência", () => {
      const now = new Date("2026-11-17T12:00:00Z").toISOString();

      const inactive = isPromotionEligibleForB2B({
        promotion: { is_active: false },
        nowIso: now,
      });
      expect(inactive).toBe(false);

      const future = isPromotionEligibleForB2B({
        promotion: { is_active: true, starts_at: "2026-11-20T00:00:00Z" },
        nowIso: now,
      });
      expect(future).toBe(false);

      const expired = isPromotionEligibleForB2B({
        promotion: { is_active: true, ends_at: "2026-11-10T00:00:00Z" },
        nowIso: now,
      });
      expect(expired).toBe(false);
    });

    it("deve validar restrição de catálogo comercial B2B", () => {
      const promoWithCatalog = {
        is_active: true,
        target_catalog_ids: [catalogA],
      };

      // Corresponde ao catálogo A
      expect(
        isPromotionEligibleForB2B({
          promotion: promoWithCatalog,
          catalogId: catalogA,
        })
      ).toBe(true);

      // Mismatch: cliente no catálogo B
      expect(
        isPromotionEligibleForB2B({
          promotion: promoWithCatalog,
          catalogId: catalogB,
        })
      ).toBe(false);

      // Sem catálogo informado
      expect(
        isPromotionEligibleForB2B({
          promotion: promoWithCatalog,
          catalogId: null,
        })
      ).toBe(false);
    });

    it("deve validar restrição de tabela de preço e carteira de vendedor", () => {
      const promoB2B = {
        is_active: true,
        target_price_table_ids: [tableVip],
        target_seller_ids: [sellerJohn],
      };

      // Match pleno
      expect(
        isPromotionEligibleForB2B({
          promotion: promoB2B,
          priceTableId: tableVip,
          sellerId: sellerJohn,
        })
      ).toBe(true);

      // Tabela divergente
      expect(
        isPromotionEligibleForB2B({
          promotion: promoB2B,
          priceTableId: tableStandard,
          sellerId: sellerJohn,
        })
      ).toBe(false);

      // Vendedor divergente
      expect(
        isPromotionEligibleForB2B({
          promotion: promoB2B,
          priceTableId: tableVip,
          sellerId: sellerMary,
        })
      ).toBe(false);
    });

    it("deve calcular descontos percentuais, fixos e leve-mais-pague-menos com integridade de centavos", () => {
      // 1. Percentual: 20% sobre R$ 100,00 (10000 centavos) = R$ 80,00
      const pct = computePromotionDiscount({
        basePriceCents: 10000,
        quantity: 1,
        promotion: { type: "percentage_discount", discount_percent: 20 },
      });
      expect(pct.discountCents).toBe(2000);
      expect(pct.discountedPriceCents).toBe(8000);

      // 2. Fixo: R$ 15,00 de desconto sobre R$ 50,00 (5000 centavos)
      const fixed = computePromotionDiscount({
        basePriceCents: 5000,
        quantity: 1,
        promotion: { type: "fixed_discount", discount_cents: 1500 },
      });
      expect(fixed.discountCents).toBe(1500);
      expect(fixed.discountedPriceCents).toBe(3500);

      // 3. Buy X Get Y (Leve 3 Pague 2): base 3000 centavos, qtd 3
      const bxy = computePromotionDiscount({
        basePriceCents: 3000,
        quantity: 3,
        promotion: { type: "buy_x_get_y", buy_qty: 3, get_qty: 1 },
      });
      expect(bxy.discountCents).toBe(1000); // 1 item gratuito de 1000
      expect(bxy.discountedPriceCents).toBe(2000);
    });
  });
});
