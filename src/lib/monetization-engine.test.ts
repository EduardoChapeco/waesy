/**
 * src/lib/monetization-engine.test.ts — Testes do Motor Canônico de Economia e Monetização Waesy
 *
 * Normativa: SPEC-20261030-CANONICAL-PRICING-PLANS-AND-MONETIZATION-ENGINE
 * Invariantes M01, M03, M04, M08
 */

import { describe, it, expect } from "vitest";
import {
  WZ_PER_BRL,
  BRL_PER_WZ,
  CENTS_PER_WZ,
  LLM_TOKENS_PER_WZ,
  brlToWz,
  centsToWz,
  wzToCents,
  wzToBrl,
  llmTokensToWz,
  wzToLlmTokens,
  CANONICAL_PLANS,
  AI_OPERATION_RATES,
  EDITORIAL_SQUADS,
  BYOK_PLATFORM_FEE_WZ,
  MIN_BALANCE_WZ_SECURITY_THRESHOLD,
  MARKETPLACE_PLATFORM_FEE_RATE,
  PDV_PLATFORM_FEE_RATE,
  calculateMarketplaceOrderSplit,
  assertGatewayRouting,
  calculateDelinquencyAutoDebit,
  calculateMobilityBilateralSplit,
  resolveEffectivePricing,
} from "./monetization-engine";

describe("Monetization Engine — 1. Padronização Monetária ($WZ vs R$)", () => {
  it("garante a paridade estrita soberana: 1 $WZ = R$ 0,01 e R$ 1,00 = 100 $WZ", () => {
    expect(WZ_PER_BRL).toBe(100);
    expect(BRL_PER_WZ).toBe(0.01);
    expect(CENTS_PER_WZ).toBe(1);

    expect(brlToWz(1.0)).toBe(100);
    expect(brlToWz(49.9)).toBe(4990);
    expect(brlToWz(99.9)).toBe(9990);
    expect(brlToWz(299.0)).toBe(29900);

    expect(centsToWz(100)).toBe(100);
    expect(centsToWz(4990)).toBe(4990);

    expect(wzToCents(100)).toBe(100);
    expect(wzToCents(4990)).toBe(4990);

    expect(wzToBrl(100)).toBe(1.0);
    expect(wzToBrl(4990)).toBe(49.9);
  });

  it("calibra tokens técnicos de inferência: 1.000 tokens ≈ 1 $WZ ≈ R$ 0,01", () => {
    expect(LLM_TOKENS_PER_WZ).toBe(1000);

    // Prompt curto de 800 tokens = 1 $WZ
    expect(llmTokensToWz(800)).toBe(1);
    // 1.500 tokens = 2 $WZ
    expect(llmTokensToWz(1500)).toBe(2);
    // Artigo de 8.000 tokens = 8 $WZ
    expect(llmTokensToWz(8000)).toBe(8);
    // Geração de site de 60.000 tokens = 60 $WZ
    expect(llmTokensToWz(60000)).toBe(60);

    expect(wzToLlmTokens(5000)).toBe(5_000_000);
    expect(wzToLlmTokens(10000)).toBe(10_000_000);
  });
});

describe("Monetization Engine — 2. Matriz de Planos e Franquias", () => {
  it("valida o plano Civil gratuito e sem conversação desregulada", () => {
    const civil = CANONICAL_PLANS.CIVIL;
    expect(civil.monthlyFeeCents).toBe(0);
    expect(civil.monthlyWzNominal).toBe(0);
    expect(civil.technicalLlmQuotaTokens).toBe(0);
    expect(civil.conversationalAiAllowed).toBe(false);
    expect(civil.canCreateBasicPosts).toBe(true);
  });

  it("valida planos pagos com franquias técnicas de tokens proporcionais", () => {
    const start = CANONICAL_PLANS.BUSINESS_START;
    expect(start.monthlyFeeCents).toBe(4990); // R$ 49,90
    expect(start.monthlyWzNominal).toBe(4990);
    expect(start.technicalLlmQuotaTokens).toBe(5_000_000); // 5 milhões de tokens

    const pro = CANONICAL_PLANS.BUSINESS_PRO;
    expect(pro.monthlyFeeCents).toBe(9990); // R$ 99,90
    expect(pro.monthlyWzNominal).toBe(9990);
    expect(pro.technicalLlmQuotaTokens).toBe(10_000_000); // 10 milhões de tokens

    const max = CANONICAL_PLANS.BUSINESS_MAX;
    expect(max.monthlyFeeCents).toBe(19900); // R$ 199,00
    expect(max.technicalLlmQuotaTokens).toBe(20_000_000); // 20 milhões de tokens

    const black = CANONICAL_PLANS.BUSINESS_BLACK;
    expect(black.monthlyFeeCents).toBe(29900); // R$ 299,00
    expect(black.technicalLlmQuotaTokens).toBe(30_000_000); // 30 milhões de tokens

    const enterprise = CANONICAL_PLANS.BUSINESS_ENTERPRISE;
    expect(enterprise.monthlyFeeCents).toBe(49900); // R$ 499,00
    expect(enterprise.technicalLlmQuotaTokens).toBe(50_000_000); // 50 milhões de tokens
  });
});

describe("Monetization Engine — 3. Catálogo de Operações, Custos e Squads", () => {
  it("valida operações de criação de site no Omni Builder", () => {
    const site = AI_OPERATION_RATES.OMNI_SITE_FULL_GENERATION;
    expect(site.wzCost).toBe(50);
    expect(site.centsCost).toBe(50); // R$ 0,50
    expect(site.grossMarginPercent).toBeGreaterThanOrEqual(50);

    const section = AI_OPERATION_RATES.OMNI_SECTION_EDIT;
    expect(section.wzCost).toBe(3); // R$ 0,03
    expect(section.centsCost).toBe(3);

    const translate = AI_OPERATION_RATES.OMNI_BILINGUAL_TRANSLATION;
    expect(translate.wzCost).toBe(15); // R$ 0,15

    const hero = AI_OPERATION_RATES.OMNI_HERO_IMAGE_GENERATION;
    expect(hero.wzCost).toBe(15); // R$ 0,15
  });

  it("valida operações editoriais de notícias e mineração", () => {
    const news = AI_OPERATION_RATES.NEWS_ARTICLE_GENERATION;
    expect(news.wzCost).toBe(5); // R$ 0,05

    const mining = AI_OPERATION_RATES.NEWS_URL_MINING;
    expect(mining.wzCost).toBe(8); // R$ 0,08

    const seo = AI_OPERATION_RATES.NEWS_SEO_GEO_TAGS;
    expect(seo.wzCost).toBe(2); // R$ 0,02
  });

  it("valida os planos de Squads Editoriais com margens saudáveis de lucro", () => {
    const compact = EDITORIAL_SQUADS.SQUAD_COMPACT;
    expect(compact.monthlyWz).toBe(2500); // R$ 25,00
    expect(compact.profitCents).toBe(1650); // R$ 16,50 de lucro
    expect(compact.netMarginPercent).toBe(66);

    const pro = EDITORIAL_SQUADS.SQUAD_PRO;
    expect(pro.monthlyWz).toBe(8500); // R$ 85,00
    expect(pro.profitCents).toBe(5400); // R$ 54,00 de lucro
    expect(pro.netMarginPercent).toBe(63);

    const enterprise = EDITORIAL_SQUADS.SQUAD_ENTERPRISE;
    expect(enterprise.monthlyWz).toBe(30000); // R$ 300,00
    expect(enterprise.profitCents).toBe(18500); // R$ 185,00 de lucro
    expect(enterprise.netMarginPercent).toBe(61);
  });

  it("valida taxa de infraestrutura BYO-Key e trava de saldo", () => {
    expect(BYOK_PLATFORM_FEE_WZ).toBe(1); // 1 $WZ por operação
    expect(MIN_BALANCE_WZ_SECURITY_THRESHOLD).toBe(10); // 10 $WZ para pausa preventiva
  });
});

describe("Monetization Engine — 4. Taxas de Marketplace & Governança de Gateways", () => {
  it("calcula split exato de 5% de taxa da plataforma + taxa de gateway", () => {
    // Pedido de R$ 100,00 com frete de R$ 15,00 (Total R$ 115,00)
    const split = calculateMarketplaceOrderSplit({
      subtotalCents: 10000,
      shippingCents: 1500,
      gatewayFeePercent: 0.0299, // 2.99%
    });

    expect(split.subtotalCents).toBe(10000);
    expect(split.shippingCents).toBe(1500);
    expect(split.totalOrderCents).toBe(11500);
    // 5% de R$ 100,00 = R$ 5,00 (500 centavos)
    expect(split.platformFeeCents).toBe(500);
    // 2.99% sobre R$ 115,00 = ~R$ 3,44 (344 centavos)
    expect(split.gatewayFeeCents).toBe(344);
    // Saldo líquido lojista: 11500 - 500 - 344 = 10656 centavos (R$ 106,56)
    expect(split.netMerchantCents).toBe(10656);
  });

  it("impõe exclusividade de Gateway Master em transações do Marketplace", () => {
    // Tentativa de loja no marketplace com gateway próprio deve ser forçada para Master
    const mkt = assertGatewayRouting({
      context: "marketplace",
      hasStoreGateway: true,
      storeGatewayProvider: "asaas",
    });

    expect(mkt.effectiveProviderSource).toBe("master");
    expect(mkt.isPlatformFeeApplicable).toBe(true);
  });

  it("permite gateway próprio da loja no PDV ou Fatura Direta (Taxa Waesy 0%)", () => {
    const pdv = assertGatewayRouting({
      context: "pdv",
      hasStoreGateway: true,
      storeGatewayProvider: "asaas",
    });

    expect(pdv.effectiveProviderSource).toBe("store");
    expect(pdv.isPlatformFeeApplicable).toBe(false);
  });

  it("permite fallback para Gateway Master no PDV com TAXA ZERO da plataforma (0%)", () => {
    const pdvFallback = assertGatewayRouting({
      context: "pdv",
      hasStoreGateway: false,
      allowMasterFallbackForPdv: true,
    });

    expect(pdvFallback.effectiveProviderSource).toBe("master");
    expect(pdvFallback.isPlatformFeeApplicable).toBe(false); // 0% taxa de plataforma no PDV
    expect(PDV_PLATFORM_FEE_RATE).toBe(0.00);
  });
});

describe("Monetization Engine — 5. Motor de Inadimplência & Autodébito", () => {
  it("libera repasse integral se o lojista não possui dívidas em aberto", () => {
    const res = calculateDelinquencyAutoDebit({
      merchantNetCents: 15000, // R$ 150,00
      overdueInvoicesTotalCents: 0,
    });

    expect(res.withheldCents).toBe(0);
    expect(res.releasedPayoutCents).toBe(15000);
    expect(res.remainingDebtCents).toBe(0);
    expect(res.fullySettled).toBe(true);
  });

  it("retém a totalidade da dívida se o repasse cobre o saldo devedor", () => {
    // Venda gerou repasse de R$ 200,00 e loja deve R$ 50,00 de faturas vencidas
    const res = calculateDelinquencyAutoDebit({
      merchantNetCents: 20000,
      overdueInvoicesTotalCents: 5000,
    });

    expect(res.withheldCents).toBe(5000); // Retém R$ 50,00
    expect(res.releasedPayoutCents).toBe(15000); // Libera R$ 150,00
    expect(res.remainingDebtCents).toBe(0); // Dívida quitada
    expect(res.fullySettled).toBe(true);
  });

  it("retém todo o repasse se a dívida for maior que a venda, reduzindo o débito", () => {
    // Venda gerou repasse de R$ 100,00 e loja deve R$ 250,00
    const res = calculateDelinquencyAutoDebit({
      merchantNetCents: 10000,
      overdueInvoicesTotalCents: 25000,
    });

    expect(res.withheldCents).toBe(10000); // Retém 100% dos R$ 100,00
    expect(res.releasedPayoutCents).toBe(0); // Repasse zero
    expect(res.remainingDebtCents).toBe(15000); // Resta R$ 150,00 a pagar
    expect(res.fullySettled).toBe(false);
  });
});

describe("Monetization Engine — 6. Waesy Go Bilateralidade & Opacidade de Taxas", () => {
  it("calcula divisão bilateral com R$ 0,99 do passageiro e R$ 0,99 do motorista sem revelar valores mútuos", () => {
    // Corrida com tarifa base de R$ 6,00 (600 centavos)
    const result = calculateMobilityBilateralSplit({
      fareCents: 600,
      passengerFeeCents: 99,
      driverFeeCents: 99,
      driverGatewayRatePercent: 0.0099, // 0.99% adquirente
    });

    // 1. Passageiro: vê tarifa de R$ 6,00 + taxa de serviço R$ 0,99 = R$ 6,99
    expect(result.passengerView.fareCents).toBe(600);
    expect(result.passengerView.serviceFeeCents).toBe(99);
    expect(result.passengerView.totalChargedCents).toBe(699);
    // Invariante de Opacidade: não expõe dados do motorista na visão do passageiro
    expect((result.passengerView as any).driverFeeCents).toBeUndefined();
    expect((result.passengerView as any).netEarningsCents).toBeUndefined();

    // 2. Motorista: vê tarifa bruta R$ 6,00 - taxa fixa R$ 0,99 - gateway ~R$ 0,06 = R$ 4,95
    expect(result.driverView.grossFareCents).toBe(600);
    expect(result.driverView.platformFeeCents).toBe(99);
    expect(result.driverView.gatewayFeeCents).toBe(6);
    expect(result.driverView.netEarningsCents).toBe(495);
    // Invariante de Opacidade: não expõe a taxa cobrada do passageiro na visão do condutor
    expect((result.driverView as any).passengerFeeCents).toBeUndefined();
    expect((result.driverView as any).totalChargedCents).toBeUndefined();

    // 3. Auditoria Waesy: R$ 0,99 + R$ 0,99 = R$ 1,98 retido na transação
    expect(result.platformAudit.passengerFeeCents).toBe(99);
    expect(result.platformAudit.driverFeeCents).toBe(99);
    expect(result.platformAudit.totalPlatformRevenueCents).toBe(198);
    expect(result.platformAudit.grossTransactedCents).toBe(699);
  });
});

describe("Monetization Engine — 7. Parametrização & Editabilidade de Taxas", () => {
  it("retorna as taxas padrão quando nenhum override for configurado", () => {
    const rules = resolveEffectivePricing(null);
    expect(rules.marketplaceFeeRate).toBe(0.05); // 5%
    expect(rules.mobilityPassengerFeeCents).toBe(99);
    expect(rules.mobilityDriverFeeCents).toBe(99);
    expect(rules.pdvPlatformFeeRate).toBe(0.00); // 0%
    expect(rules.isFeeExempt).toBe(false);
    expect(rules.activeOverridesCount).toBe(0);
  });

  it("permite customização e edição de taxas por loja ou cliente", () => {
    const custom = resolveEffectivePricing({
      entityType: "store",
      entityId: "123e4567-e89b-12d3-a456-426614174000",
      marketplaceFeeRate: 0.03, // 3% taxa negociada
      mobilityPassengerFeeCents: 149, // R$ 1,49
      mobilityDriverFeeCents: 50, // R$ 0,50
      pdvPlatformFeeRate: 0.00,
    });

    expect(custom.marketplaceFeeRate).toBe(0.03);
    expect(custom.mobilityPassengerFeeCents).toBe(149);
    expect(custom.mobilityDriverFeeCents).toBe(50);
    expect(custom.pdvPlatformFeeRate).toBe(0.00);
    expect(custom.isFeeExempt).toBe(false);
    expect(custom.activeOverridesCount).toBe(4);
  });

  it("aplica isenção total quando isFeeExempt for verdadeiro", () => {
    const exempt = resolveEffectivePricing({
      entityType: "client",
      entityId: "client-vip-123",
      isFeeExempt: true,
    });

    expect(exempt.marketplaceFeeRate).toBe(0);
    expect(exempt.mobilityPassengerFeeCents).toBe(0);
    expect(exempt.mobilityDriverFeeCents).toBe(0);
    expect(exempt.pdvPlatformFeeRate).toBe(0);
    expect(exempt.isFeeExempt).toBe(true);
  });
});
