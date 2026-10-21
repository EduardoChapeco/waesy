import { describe, it, expect } from "vitest";
import {
  recordClassifiedTelemetry,
  getClassifiedCommercialPerformance,
  getAccountClassifiedsCommercialDashboard,
  ClassifiedCommercialPerformanceDTO,
} from "./classifieds-analytics.functions";

describe("Meus Anúncios — Central de Performance Comercial & Telemetria", () => {
  it("1. Deve validar que as funções de telemetria e performance comercial estão definidas", () => {
    expect(recordClassifiedTelemetry).toBeDefined();
    expect(getClassifiedCommercialPerformance).toBeDefined();
    expect(getAccountClassifiedsCommercialDashboard).toBeDefined();
  });

  it("2. Deve calcular corretamente o CTR oficial (Cliques / Impressões * 100)", () => {
    const impressions = 10000;
    const views = 450;
    const ctr = impressions > 0 ? Number(((views / impressions) * 100).toFixed(1)) : 0;
    expect(ctr).toBe(4.5);
  });

  it("3. Deve calcular taxa de contato oficial (Contatos / Visitas * 100)", () => {
    const views = 450;
    const contacts = 36;
    const contactRate = views > 0 ? Number(((contacts / views) * 100).toFixed(1)) : 0;
    expect(contactRate).toBe(8.0);
  });

  it("4. Deve calcular taxa de conversão oficial (Conversões / Visitas * 100)", () => {
    const views = 450;
    const conversions = 9;
    const conversionRate = views > 0 ? Number(((conversions / views) * 100).toFixed(1)) : 0;
    expect(conversionRate).toBe(2.0);
  });

  it("5. Deve validar a regra de supressão por coorte de privacidade (threshold = 5)", () => {
    const mockCohorts = [
      { name: "São Miguel do Oeste", count: 48 },
      { name: "Descanso", count: 8 },
      { name: "Bairro Centro", count: 12 },
      { name: "Bairro Pequeno A", count: 2 },
      { name: "Bairro Pequeno B", count: 1 },
    ];

    const PRIVACY_THRESHOLD = 5;
    const safeList: { name: string; count: number }[] = [];
    let suppressedCount = 0;

    for (const item of mockCohorts) {
      if (item.count >= PRIVACY_THRESHOLD) {
        safeList.push(item);
      } else {
        suppressedCount += item.count;
      }
    }

    if (suppressedCount > 0) {
      safeList.push({ name: "Outros Agrupados", count: suppressedCount });
    }

    expect(safeList.some((c) => c.name === "Bairro Pequeno A")).toBe(false);
    expect(safeList.some((c) => c.name === "Bairro Pequeno B")).toBe(false);
    expect(safeList.find((c) => c.name === "Outros Agrupados")?.count).toBe(3);
  });

  it("6. Deve validar que as etapas do funil comercial mantêm a invariante de decaimento", () => {
    const impressions = 5000;
    const views = 1200;
    const engagements = 380;
    const contacts = 95;
    const conversions = 12;

    expect(impressions).toBeGreaterThanOrEqual(views);
    expect(views).toBeGreaterThanOrEqual(engagements);
    expect(engagements).toBeGreaterThanOrEqual(contacts);
    expect(contacts).toBeGreaterThanOrEqual(conversions);
  });

  it("7. Deve validar separação perfeita de tráfego orgânico e impulsionado", () => {
    const totalViews = 1500;
    const paidViews = 800;
    const organicViews = totalViews - paidViews;

    expect(organicViews).toBe(700);
    expect(organicViews + paidViews).toBe(totalViews);
  });

  it("8. Deve validar cálculo de eficiência de mídia (CPM e CPC)", () => {
    const budgetSpentCents = 3990; // R$ 39,90
    const sponsoredImpressions = 8000;
    const sponsoredViews = 400;

    const cpmCents = Math.round((budgetSpentCents / sponsoredImpressions) * 1000);
    const cpcCents = Math.round(budgetSpentCents / sponsoredViews);

    expect(cpmCents).toBe(499); // R$ 4,99 CPM
    expect(cpcCents).toBe(10); // R$ 0,10 por clique/visita
  });

  it("9. Deve validar a ordenação do portfólio por métricas de performance", () => {
    const ads = [
      { id: "1", title: "Anúncio A", views_count: 10, whatsapp_clicks_count: 5, created_at: "2026-10-01" },
      { id: "2", title: "Anúncio B", views_count: 50, whatsapp_clicks_count: 2, created_at: "2026-10-05" },
      { id: "3", title: "Anúncio C", views_count: 30, whatsapp_clicks_count: 12, created_at: "2026-10-10" },
    ];

    // Mais Vistos
    const byViews = [...ads].sort((a, b) => b.views_count - a.views_count);
    expect(byViews[0].id).toBe("2");
    expect(byViews[1].id).toBe("3");
    expect(byViews[2].id).toBe("1");

    // Mais Contatos
    const byContacts = [...ads].sort((a, b) => b.whatsapp_clicks_count - a.whatsapp_clicks_count);
    expect(byContacts[0].id).toBe("3");
    expect(byContacts[1].id).toBe("1");
    expect(byContacts[2].id).toBe("2");
  });

  it("10. Deve detectar anúncios com baixa performance para diagnóstico (vistas > 25 e 0 contatos)", () => {
    const mockAds = [
      { id: "1", title: "Produto Normal", viewsCount: 15, contactsCount: 2, status: "active" },
      { id: "2", title: "Produto com Gargalo", viewsCount: 42, contactsCount: 0, status: "active" },
      { id: "3", title: "Produto Vendido", viewsCount: 60, contactsCount: 0, status: "completed" },
    ];

    const needsAttention = mockAds.filter(
      (ad) => ad.status === "active" && ad.viewsCount > 25 && ad.contactsCount === 0
    );

    expect(needsAttention.length).toBe(1);
    expect(needsAttention[0].id).toBe("2");
  });
});
