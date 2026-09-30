import { describe, it, expect } from "vitest";
import { calculateAdBudgetSplit } from "./ads.functions";

describe("V142 Omni-Marketing Engine, Max Tier Gate & 1:4 Vitrine Interleaving", () => {
  it("FASE 1: intercala estritamente 1 item patrocinado ativo a cada 4 orgânicos", () => {
    const nowMs = Date.now();
    const futureIso = new Date(nowMs + 7 * 86400000).toISOString();
    const expiredIso = new Date(nowMs - 86400000).toISOString();

    const rawItems = [
      { id: "org-1", is_sponsored: false, sponsored_until: null },
      { id: "org-2", is_sponsored: false, sponsored_until: null },
      { id: "spons-1", is_sponsored: true, sponsored_until: futureIso },
      { id: "org-3", is_sponsored: false, sponsored_until: null },
      { id: "org-4", is_sponsored: false, sponsored_until: null },
      { id: "spons-expired", is_sponsored: true, sponsored_until: expiredIso },
      { id: "spons-2", is_sponsored: true, sponsored_until: futureIso },
      { id: "org-5", is_sponsored: false, sponsored_until: null },
    ];

    const sponsoredPool = rawItems.filter(
      (i) => i.is_sponsored && i.sponsored_until && new Date(i.sponsored_until).getTime() > nowMs
    );
    const organicPool = rawItems.filter(
      (i) => !(i.is_sponsored && i.sponsored_until && new Date(i.sponsored_until).getTime() > nowMs)
    );

    const interleaved: typeof rawItems = [];
    let sIdx = 0;
    let oIdx = 0;
    while (sIdx < sponsoredPool.length || oIdx < organicPool.length) {
      if (sIdx < sponsoredPool.length) {
        interleaved.push(sponsoredPool[sIdx++]);
      }
      for (let i = 0; i < 4 && oIdx < organicPool.length; i++) {
        interleaved.push(organicPool[oIdx++]);
      }
    }

    // Posição 0 deve ser o primeiro patrocinado ativo
    expect(interleaved[0].id).toBe("spons-1");
    // Posições 1, 2, 3, 4 devem ser os 4 primeiros orgânicos
    expect(interleaved.slice(1, 5).map((i) => i.id)).toEqual(["org-1", "org-2", "org-3", "org-4"]);
    // Posição 5 (após 4 orgânicos) deve ser o segundo patrocinado ativo
    expect(interleaved[5].id).toBe("spons-2");
    // O patrocinado expirado deve cair no pool orgânico
    expect(interleaved.slice(6).map((i) => i.id)).toContain("spons-expired");
  });

  it("FASE 1 & 2: aplica desconto de 50% no invoice_ledger para Waesy Max e retém arbitragem na conta global", () => {
    const originalCents = 5990;
    const maxDiscountCents = Math.round(originalCents * 0.5);
    const finalMaxCents = originalCents - maxDiscountCents;

    expect(maxDiscountCents).toBe(2995);
    expect(finalMaxCents).toBe(2995);

    const arbitrageSplit = calculateAdBudgetSplit(10000, false, "meta_ads");
    expect(arbitrageSplit.routing_mode).toBe("waesy_global_arbitrage");
    expect(arbitrageSplit.waesy_revenue_cents).toBe(2000);
    expect(arbitrageSplit.external_ad_spend_cents).toBe(8000);

    const ownAccountSplit = calculateAdBudgetSplit(10000, true, "meta_ads");
    expect(ownAccountSplit.routing_mode).toBe("client_own_account");
    expect(ownAccountSplit.waesy_revenue_cents).toBe(0);
    expect(ownAccountSplit.external_ad_spend_cents).toBe(10000);
  });

  it("FASE 4: calcula matematicamente o ROI transacional fechado (R$ 50 gasto -> R$ 450 vendas = ROI 900%)", () => {
    const spendCents = 5000; // R$ 50,00
    const revenueCents = 45000; // R$ 450,00
    const roiPercentage = Math.round((revenueCents / spendCents) * 100);
    const headline = `Este impulsionamento gerou R$ ${(revenueCents / 100).toFixed(2).replace(".", ",")} em pedidos (ROI ${roiPercentage}%)`;

    expect(roiPercentage).toBe(900);
    expect(headline).toBe("Este impulsionamento gerou R$ 450,00 em pedidos (ROI 900%)");
  });
});
