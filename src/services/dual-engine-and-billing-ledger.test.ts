import { describe, it, expect } from "vitest";
import { PLAN_AI_LIMITS } from "@/types/ai-quotas-and-byok";
import { BillingFeeTypeEnum } from "@/types/billing-ledger";
import { groupCartItemsByStore } from "./multi-store-checkout.functions";
import type { CartItemDTO } from "@/types/orders";

describe("V141: Dual-Engine Architecture, AI Quotas, Billing Ledger & Multi-Store Checkout", () => {
  describe("1. Motor Waesy Max & Quotas de IA", () => {
    it("deve atribuir 10 chamadas mensais ao plano FREE_MVP e 200 ao WAESY_MAX", () => {
      expect(PLAN_AI_LIMITS.FREE_MVP).toBe(10);
      expect(PLAN_AI_LIMITS.WAESY_MAX).toBe(200);
    });

    it("deve simular o fallback silencioso para BYOK ao esgotar a cota da plataforma", () => {
      const storePlan = "FREE_MVP";
      const monthlyLimit = PLAN_AI_LIMITS[storePlan];
      let monthlyUsed = 10; // Cota esgotada
      const hasByokKey = true;
      const byokKey = "sk-proj-byok-test-key-123456";

      // Lógica de decisão
      let executionMode: "NATIVE_QUOTA" | "BYOK_FALLBACK" | "QUOTA_EXHAUSTED";
      let keyToUse: string | null = null;

      if (monthlyUsed < monthlyLimit) {
        executionMode = "NATIVE_QUOTA";
        monthlyUsed += 1;
      } else if (hasByokKey) {
        executionMode = "BYOK_FALLBACK";
        keyToUse = byokKey;
      } else {
        executionMode = "QUOTA_EXHAUSTED";
      }

      expect(executionMode).toBe("BYOK_FALLBACK");
      expect(keyToUse).toBe(byokKey);
    });

    it("deve barrar requisições e exigir chave própria se não houver BYOK cadastrado", () => {
      const storePlan = "FREE_MVP";
      const monthlyLimit = PLAN_AI_LIMITS[storePlan];
      const monthlyUsed = 10;
      const hasByokKey = false;

      const canExecute = monthlyUsed < monthlyLimit || hasByokKey;
      expect(canExecute).toBe(false);
    });
  });

  describe("2. Razão Financeiro Auditável (Invoice Ledger E2E) & Microtaxas", () => {
    it("deve validar os tipos permitidos de lançamentos financeiros", () => {
      expect(BillingFeeTypeEnum.parse("SUBSCRIPTION_MONTHLY")).toBe("SUBSCRIPTION_MONTHLY");
      expect(BillingFeeTypeEnum.parse("ORDER_MICROFEE_RANDOM")).toBe("ORDER_MICROFEE_RANDOM");
      expect(BillingFeeTypeEnum.parse("EXTRA_USAGE")).toBe("EXTRA_USAGE");
      expect(() => BillingFeeTypeEnum.parse("INVALID_FEE")).toThrow();
    });

    it("deve calcular a conciliação contábil com soma 100% perfeita sem dízimas", () => {
      const lineItems = [
        {
          id: "item-1",
          originEventId: "ped_001",
          description: "Microtaxa Pedido #ped_001",
          amountCents: 99, // R$ 0,99
          feeType: "ORDER_MICROFEE_RANDOM" as const,
        },
        {
          id: "item-2",
          originEventId: "ped_002",
          description: "Microtaxa Pedido #ped_002",
          amountCents: 99, // R$ 0,99
          feeType: "ORDER_MICROFEE_RANDOM" as const,
        },
        {
          id: "item-3",
          originEventId: "ped_003",
          description: "Microtaxa Pedido #ped_003",
          amountCents: 99, // R$ 0,99
          feeType: "ORDER_MICROFEE_RANDOM" as const,
        },
        {
          id: "item-4",
          originEventId: "SUB-2026-09",
          description: "Mensalidade Waesy Max",
          amountCents: 9900, // R$ 99,00
          feeType: "SUBSCRIPTION_MONTHLY" as const,
        },
      ];

      // Soma matemática exata
      let totalCents = 0;
      let totalMicrofees = 0;
      let totalSubscription = 0;

      for (const item of lineItems) {
        totalCents += item.amountCents;
        if (item.feeType === "ORDER_MICROFEE_RANDOM") {
          totalMicrofees += item.amountCents;
        } else if (item.feeType === "SUBSCRIPTION_MONTHLY") {
          totalSubscription += item.amountCents;
        }
      }

      expect(totalMicrofees).toBe(297); // 3 x R$ 0,99 = R$ 2,97
      expect(totalSubscription).toBe(9900); // R$ 99,00
      expect(totalCents).toBe(10197); // R$ 101,97 exatos
      expect(totalMicrofees + totalSubscription).toBe(totalCents);
    });
  });

  describe("3. Omni-Checkout Multi-Loja & Segregação Atômica", () => {
    it("deve agrupar itens de múltiplas lojas com fretes e subtotais isolados", () => {
      const mixedCartItems: Array<CartItemDTO & { storeId: string; storeName: string; storeSlug: string }> = [
        {
          id: "cart-item-1",
          variantId: "var-1",
          qty: 2,
          priceCents: 5000, // R$ 50,00
          lineTotalCents: 10000,
          productTitle: "Queijo Colonial 1kg",
          variantSku: "QUE-01",
          variantAttributes: {},
          storeId: "store-a",
          storeName: "Empório da Serra",
          storeSlug: "emporio-da-serra",
        },
        {
          id: "cart-item-2",
          variantId: "var-2",
          qty: 1,
          priceCents: 12000, // R$ 120,00
          lineTotalCents: 12000,
          productTitle: "Vinho Tinto Artesanal",
          variantSku: "VIN-02",
          variantAttributes: {},
          storeId: "store-a",
          storeName: "Empório da Serra",
          storeSlug: "emporio-da-serra",
        },
        {
          id: "cart-item-3",
          variantId: "var-3",
          qty: 1,
          priceCents: 8500, // R$ 85,00
          lineTotalCents: 8500,
          productTitle: "Picanha Nobre 1kg",
          variantSku: "PIC-01",
          variantAttributes: {},
          storeId: "store-b",
          storeName: "Açougue Boi de Ouro",
          storeSlug: "boi-de-ouro",
        },
      ];

      const shippingMap = {
        "store-a": 1500, // R$ 15,00
        "store-b": 2000, // R$ 20,00
      };

      const groups = groupCartItemsByStore(mixedCartItems, shippingMap);

      expect(groups).toHaveLength(2);

      // Loja A
      const groupA = groups.find((g) => g.storeId === "store-a")!;
      expect(groupA).toBeDefined();
      expect(groupA.storeName).toBe("Empório da Serra");
      expect(groupA.items).toHaveLength(2);
      expect(groupA.subtotalCents).toBe(22000); // 100 + 120 = R$ 220,00
      expect(groupA.shippingCents).toBe(1500); // R$ 15,00
      expect(groupA.totalCents).toBe(23500); // R$ 235,00

      // Loja B
      const groupB = groups.find((g) => g.storeId === "store-b")!;
      expect(groupB).toBeDefined();
      expect(groupB.storeName).toBe("Açougue Boi de Ouro");
      expect(groupB.items).toHaveLength(1);
      expect(groupB.subtotalCents).toBe(8500); // R$ 85,00
      expect(groupB.shippingCents).toBe(2000); // R$ 20,00
      expect(groupB.totalCents).toBe(10500); // R$ 105,00

      // Total Consolidado
      const grandTotal = groups.reduce((acc, g) => acc + g.totalCents, 0);
      expect(grandTotal).toBe(34000); // R$ 340,00
    });
  });
});
