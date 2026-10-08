import { describe, expect, it } from "vitest";
import { isPaidOrderAttributedToCampaignWithinPeriod, parseAiAdCreative } from "@/services/ads.functions";

const campaign = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  starts_at: "2026-01-01T00:00:00.000Z",
  ends_at: "2026-01-31T23:59:59.999Z",
};

const validCreative = {
  headline: "Produto cadastrado",
  bodyCopy: "Descrição baseada somente nos dados do catálogo.",
  callToActionLabel: "Saiba mais",
  badgeText: "Catálogo",
  targetInterests: ["Produto", "Categoria", "Loja"],
};

describe("proveniência de métricas de anúncios", () => {
  it("associa somente pedido pago com ID de campanha exato no período", () => {
    expect(isPaidOrderAttributedToCampaignWithinPeriod({
      status: "paid",
      attributed_campaign_id: campaign.id,
      created_at: "2026-01-15T12:00:00.000Z",
    }, campaign)).toBe(true);
  });

  it("aceita utm_campaign somente quando seu valor corresponde exatamente ao ID", () => {
    const order = { status: "paid", utm_campaign: campaign.id, created_at: "2026-01-15T12:00:00.000Z" };
    expect(isPaidOrderAttributedToCampaignWithinPeriod(order, campaign)).toBe(true);
    expect(isPaidOrderAttributedToCampaignWithinPeriod({ ...order, utm_campaign: "meta_ads" }, campaign)).toBe(false);
  });

  it("não atribui canais genéricos, pedidos não pagos ou identificadores conflitantes", () => {
    const order = { status: "paid", attributed_campaign_id: "another-id", utm_campaign: campaign.id, created_at: "2026-01-15T12:00:00.000Z" };
    expect(isPaidOrderAttributedToCampaignWithinPeriod({ ...order, status: "processing" }, campaign)).toBe(false);
    expect(isPaidOrderAttributedToCampaignWithinPeriod(order, campaign)).toBe(false);
    expect(isPaidOrderAttributedToCampaignWithinPeriod({
      status: "paid",
      created_at: "2026-01-15T12:00:00.000Z",
      origin_channel: "meta_ads",
    } as any, campaign)).toBe(false);
  });

  it("exclui pedidos criados antes/depois do período da campanha", () => {
    expect(isPaidOrderAttributedToCampaignWithinPeriod({ status: "paid", attributed_campaign_id: campaign.id, created_at: "2025-12-31T23:59:59.999Z" }, campaign)).toBe(false);
    expect(isPaidOrderAttributedToCampaignWithinPeriod({ status: "paid", attributed_campaign_id: campaign.id, created_at: "2026-02-01T00:00:00.000Z" }, campaign)).toBe(false);
  });

  it("aceita copy de IA no schema estrito sem orçamento gerado", () => {
    expect(parseAiAdCreative(JSON.stringify(validCreative))).toEqual(validCreative);
    expect(() => parseAiAdCreative(JSON.stringify({ ...validCreative, suggestedDailyBudgetCents: 2500 }))).toThrow(/formato exigido/);
  });

  it("falha explicitamente para JSON ou estrutura de copy inválidos", () => {
    expect(() => parseAiAdCreative("texto sem JSON")).toThrow(/JSON válido/);
    expect(() => parseAiAdCreative(JSON.stringify({ ...validCreative, headline: "x".repeat(39) }))).toThrow(/formato exigido/);
    expect(() => parseAiAdCreative("{malformed")).toThrow();
  });
});
