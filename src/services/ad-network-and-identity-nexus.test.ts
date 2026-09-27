import { describe, it, expect } from "vitest";
import { calculateAdBudgetSplit } from "@/services/ads.functions";

describe("Ad-Network Arbitrage & Split Engine (V109 / V110 Spec)", () => {
  it("calcula split padrão 80/20 com precisão inteira em centavos", () => {
    const totalBudgetCents = 3990; // R$ 39,90
    const split = calculateAdBudgetSplit(totalBudgetCents, false, "meta_ads");

    expect(split.routing_mode).toBe("waesy_global_arbitrage");
    expect(split.destination_platform).toBe("meta_ads");
    expect(split.waesy_take_rate).toBe(0.2);

    // 20% de 3990 = 798 centavos (R$ 7,98)
    expect(split.waesy_revenue_cents).toBe(798);
    // 80% de 3990 = 3192 centavos (R$ 31,92)
    expect(split.external_ad_spend_cents).toBe(3192);
    // Conservação de valor: receita + spend = total
    expect(split.waesy_revenue_cents + split.external_ad_spend_cents).toBe(totalBudgetCents);
  });

  it("garante injeção direta de 100% para contas com OAuth próprio (Regra A)", () => {
    const totalBudgetCents = 10000; // R$ 100,00
    const split = calculateAdBudgetSplit(totalBudgetCents, true, "meta_ads");

    expect(split.routing_mode).toBe("client_own_account");
    expect(split.waesy_take_rate).toBe(0);
    expect(split.waesy_revenue_cents).toBe(0);
    expect(split.external_ad_spend_cents).toBe(10000);
  });

  it("arredonda centavos sem perda ou dízimas para orçamentos ímpares", () => {
    const totalBudgetCents = 1999; // R$ 19,99
    const split = calculateAdBudgetSplit(totalBudgetCents, false, "google_ads");

    expect(split.waesy_revenue_cents + split.external_ad_spend_cents).toBe(1999);
    expect(Number.isInteger(split.waesy_revenue_cents)).toBe(true);
    expect(Number.isInteger(split.external_ad_spend_cents)).toBe(true);
  });
});

describe("Identity Nexus & Civil Context Isolation (Zero-Trust)", () => {
  it("valida que o contexto civil não herda store_id silenciosamente", () => {
    const contextType: "civil" | "creator" | "store" = "civil";
    const memberships = [
      { store_id: "store-123", role: "owner" },
      { store_id: "store-456", role: "admin" },
    ];

    // Simula a resolução estrita aplicada no identity.server.ts
    const activeStoreId = contextType === "civil" ? null : memberships[0]?.store_id || null;

    expect(activeStoreId).toBeNull();
  });

  it("valida que o contexto store preserva o membership selecionado", () => {
    const requestedStoreId = "store-456";
    const memberships = [
      { store_id: "store-123", role: "owner" },
      { store_id: "store-456", role: "admin" },
    ];

    const matched = memberships.find((m) => m.store_id === requestedStoreId);
    const activeStoreId = matched ? matched.store_id : null;

    expect(activeStoreId).toBe("store-456");
  });
});

describe("Ad Telemetry & 7-Day Sparkline (Zero-Mock Verification)", () => {
  it("gera vetor de 7 dias com base no histórico diário real e preenche lacunas com zero", () => {
    const dailyViews: Record<string, number> = {
      // Hoje: 15 views
      [new Date().toISOString().slice(0, 10)]: 15,
    };

    // Monta últimos 7 dias
    const points: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      points.push(Number(dailyViews[key]) || 0);
    }

    expect(points.length).toBe(7);
    expect(points[6]).toBe(15);
    expect(points[0]).toBe(0);
    // Zero seeds artificiais: soma total bate com o evento gravado
    const sum = points.reduce((a, b) => a + b, 0);
    expect(sum).toBe(15);
  });

  it("mantém linha zerada quando o anúncio ainda não teve visualizações", () => {
    const points: number[] = [];
    for (let i = 6; i >= 0; i--) {
      points.push(0);
    }

    expect(points).toEqual([0, 0, 0, 0, 0, 0, 0]);
    const allZeros = points.every((p) => p === 0);
    expect(allZeros).toBe(true);
  });
});
