import { describe, it, expect } from "vitest";
import {
  CalculateInterMemberDiscountInputSchema,
  RecordAssociationTransactionInputSchema,
  RequestAssociationMembershipInputSchema,
  UpdateAssociationMembershipStatusInputSchema,
  GetEntityMetricsInputSchema,
} from "../association.functions";

describe("Motor de Descontos Inter-Associados e Métricas B2B (SPEC-005)", () => {
  describe("1. Validação de Schemas Zod (Rule B.25)", () => {
    it("deve validar payload de cálculo de desconto inter-associados", () => {
      const valid = CalculateInterMemberDiscountInputSchema.safeParse({
        sellerStoreId: "a0000000-0000-0000-0000-000000000001",
        buyerStoreId: "b0000000-0000-0000-0000-000000000002",
      });
      expect(valid.success).toBe(true);
    });

    it("deve rejeitar UUID inválido no cálculo de desconto", () => {
      const invalid = CalculateInterMemberDiscountInputSchema.safeParse({
        sellerStoreId: "not-a-uuid",
        buyerStoreId: "b0000000-0000-0000-0000-000000000002",
      });
      expect(invalid.success).toBe(false);
    });

    it("deve validar solicitação de afiliação com percentual de desconto", () => {
      const parsed = RequestAssociationMembershipInputSchema.parse({
        entityStoreId: "c0000000-0000-0000-0000-000000000003",
        memberStoreId: "d0000000-0000-0000-0000-000000000004",
        discountPercent: 12.5,
        customBenefitDescription: "12.5% de desconto para associados da ACIC",
      });
      expect(parsed.discountPercent).toBe(12.5);
      expect(parsed.customBenefitDescription).toContain("ACIC");
    });

    it("deve validar registro de transação direta e offline", () => {
      const directTx = RecordAssociationTransactionInputSchema.parse({
        entityStoreId: "c0000000-0000-0000-0000-000000000003",
        sellerStoreId: "a0000000-0000-0000-0000-000000000001",
        grossAmountCents: 100000, // R$ 1.000,00
        discountPercent: 10,
        transactionType: "direct",
      });
      expect(directTx.grossAmountCents).toBe(100000);
      expect(directTx.transactionType).toBe("direct");

      const offlineTx = RecordAssociationTransactionInputSchema.parse({
        entityStoreId: "c0000000-0000-0000-0000-000000000003",
        sellerStoreId: "a0000000-0000-0000-0000-000000000001",
        buyerName: "Empresa Parceira Ltda",
        buyerDocument: "12.345.678/0001-90",
        grossAmountCents: 500000, // R$ 5.000,00
        discountPercent: 15,
        transactionType: "indirect_offline",
        notes: "Negócio fechado via rodada de negócios ACIC - NF 4589",
      });
      expect(offlineTx.transactionType).toBe("indirect_offline");
      expect(offlineTx.buyerName).toBe("Empresa Parceira Ltda");
    });
  });

  describe("2. Regra do Maior Desconto (MAX Discount Prevalecente)", () => {
    function computeEffectiveDiscount(
      sellerMemberships: Array<{ entityId: string; discountPercent: number }>,
      buyerMemberships: Array<{ entityId: string }>,
    ) {
      const buyerSet = new Set(buyerMemberships.map((b) => b.entityId));
      const shared = sellerMemberships.filter((s) => buyerSet.has(s.entityId));
      if (shared.length === 0) return { hasDiscount: false, maxDiscount: 0, bestEntityId: null };

      let max = 0;
      let bestId: string | null = null;
      for (const item of shared) {
        if (item.discountPercent > max) {
          max = item.discountPercent;
          bestId = item.entityId;
        }
      }
      return { hasDiscount: max > 0, maxDiscount: max, bestEntityId: bestId };
    }

    it("deve retornar 0 quando comprador e vendedor não compartilham associações", () => {
      const seller = [{ entityId: "assoc-1", discountPercent: 10 }];
      const buyer = [{ entityId: "assoc-2" }];
      const res = computeEffectiveDiscount(seller, buyer);
      expect(res.hasDiscount).toBe(false);
      expect(res.maxDiscount).toBe(0);
      expect(res.bestEntityId).toBeNull();
    });

    it("deve retornar o desconto exato quando compartilham uma única associação", () => {
      const seller = [{ entityId: "assoc-1", discountPercent: 8 }];
      const buyer = [{ entityId: "assoc-1" }];
      const res = computeEffectiveDiscount(seller, buyer);
      expect(res.hasDiscount).toBe(true);
      expect(res.maxDiscount).toBe(8);
      expect(res.bestEntityId).toBe("assoc-1");
    });

    it("deve selecionar estritamente o MAIOR desconto quando compartilham múltiplas associações", () => {
      // Vendedor é membro da ACIC (5%), CDL (10%) e Polo Tech (15%)
      const seller = [
        { entityId: "acic", discountPercent: 5 },
        { entityId: "cdl", discountPercent: 10 },
        { entityId: "polo-tech", discountPercent: 15 },
      ];
      // Comprador é membro da ACIC e Polo Tech
      const buyer = [
        { entityId: "acic" },
        { entityId: "polo-tech" },
      ];

      const res = computeEffectiveDiscount(seller, buyer);
      // O maior desconto entre ACIC (5%) e Polo Tech (15%) é 15%
      expect(res.hasDiscount).toBe(true);
      expect(res.maxDiscount).toBe(15);
      expect(res.bestEntityId).toBe("polo-tech");
    });
  });

  describe("3. Cálculo Financeiro de Transação e Métricas", () => {
    function computeAmounts(grossCents: number, discountPercent: number) {
      const discountAmountCents = Math.round((grossCents * discountPercent) / 100);
      const netAmountCents = Math.max(0, grossCents - discountAmountCents);
      return { grossCents, discountAmountCents, netAmountCents };
    }

    it("deve calcular corretamente valor bruto, desconto e líquido para transação B2B", () => {
      // R$ 2.500,00 com 12% de desconto B2B da associação
      const calc = computeAmounts(250000, 12);
      expect(calc.grossCents).toBe(250000);
      expect(calc.discountAmountCents).toBe(30000); // R$ 300,00 de economia
      expect(calc.netAmountCents).toBe(220000); // R$ 2.200,00 valor líquido
    });

    it("deve manter valor líquido igual ao bruto quando desconto for 0%", () => {
      const calc = computeAmounts(150000, 0);
      expect(calc.discountAmountCents).toBe(0);
      expect(calc.netAmountCents).toBe(150000);
    });
  });
});
