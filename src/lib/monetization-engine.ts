/**
 * src/lib/monetization-engine.ts — Motor Canônico de Economia, Planos, Tokenomics e Governança de Taxas
 *
 * Normativa: SPEC-20261030-CANONICAL-PRICING-PLANS-AND-MONETIZATION-ENGINE
 * AGENTS.md B.8, B.23, B.24, B.25
 *
 * Invariantes Soberanas:
 * 1. 1 $WZ = R$ 0,01 (exatamente 1 centavo). Logo, R$ 1,00 = 100 $WZ.
 * 2. Tokens de LLM (Inference/Context) != $WZ (Moeda Contábil).
 *    Calibração Econômica: 1.000 tokens técnicos ≈ 1 $WZ ≈ R$ 0,01.
 * 3. Taxa Padrão de Marketplace: 5% da plataforma + taxa do gateway de pagamento (Asaas/Mercado Pago).
 * 4. Microtaxa Administrativa: R$ 0,99 em Mobilidade (Waesy Go), Caronas, Ônibus, Fretes e Microtransações.
 * 5. Gateways de Pagamento:
 *    - Transações no Marketplace: Restritas exclusivamente às APIs integradas pelo Admin Master.
 *    - APIs conectadas da Loja: Permitidas unicamente para PDV/Caixa e links em Faturas Diretas.
 * 6. Autodébito de Inadimplência: Vendas via API Master retêm split para liquidar faturas vencidas antes do repasse.
 */

import { z } from "zod";

// ============================================================================
// 1. CONSTANTES MONETÁRIAS E CONVERSÕES SOBERANAS
// ============================================================================

export const WZ_PER_BRL = 100;
export const BRL_PER_WZ = 0.01;
export const CENTS_PER_WZ = 1; // 1 $WZ = 1 centavo = 1 cent
export const LLM_TOKENS_PER_WZ = 1000; // 1.000 tokens técnicos ≈ 1 $WZ

/**
 * Converte valor em Reais (R$) para $WZ
 */
export function brlToWz(brl: number): number {
  return Math.round(brl * WZ_PER_BRL);
}

/**
 * Converte valor em Centavos inteiros para $WZ
 */
export function centsToWz(cents: number): number {
  return Math.round(cents);
}

/**
 * Converte valor em $WZ para Centavos inteiros
 */
export function wzToCents(wz: number): number {
  return Math.round(wz * CENTS_PER_WZ);
}

/**
 * Converte valor em $WZ para Reais (R$)
 */
export function wzToBrl(wz: number): number {
  return Number((wz * BRL_PER_WZ).toFixed(2));
}

/**
 * Converte consumo técnico de Tokens de LLM para débito nominal em $WZ
 * Regra: 1.000 tokens técnicos = 1 $WZ (com arredondamento para cima do piso mínimo)
 */
export function llmTokensToWz(tokens: number): number {
  if (tokens <= 0) return 0;
  return Math.max(1, Math.ceil(tokens / LLM_TOKENS_PER_WZ));
}

/**
 * Converte $WZ para capacidade técnica correspondente em Tokens de LLM
 */
export function wzToLlmTokens(wz: number): number {
  return wz * LLM_TOKENS_PER_WZ;
}

// ============================================================================
// 2. MATRIZ DE PLANOS E MODULARIZAÇÃO DO ECOSSISTEMA
// ============================================================================

export type CanonicalPlanTier =
  | "CIVIL"
  | "BUSINESS_START"
  | "BUSINESS_PRO"
  | "BUSINESS_MAX"
  | "BUSINESS_BLACK"
  | "BUSINESS_ENTERPRISE"
  | "CORPORATE";

export const CanonicalPlanTierEnum = z.enum([
  "CIVIL",
  "BUSINESS_START",
  "BUSINESS_PRO",
  "BUSINESS_MAX",
  "BUSINESS_BLACK",
  "BUSINESS_ENTERPRISE",
  "CORPORATE",
]);

export interface PlanSpecification {
  tier: CanonicalPlanTier;
  displayName: string;
  monthlyFeeCents: number;
  monthlyWzNominal: number;
  technicalLlmQuotaTokens: number;
  conversationalAiAllowed: boolean;
  canCreateBasicPosts: boolean;
  maxVisitsMonthly: number | null;
  description: string;
  highlightBadge?: string;
}

export const CANONICAL_PLANS: Record<CanonicalPlanTier, PlanSpecification> = {
  CIVIL: {
    tier: "CIVIL",
    displayName: "Civil",
    monthlyFeeCents: 0,
    monthlyWzNominal: 0,
    technicalLlmQuotaTokens: 0,
    conversationalAiAllowed: false,
    canCreateBasicPosts: true,
    maxVisitsMonthly: null,
    description: "Acesso civil gratuito. Transações comunitárias, compras no marketplace e criação básica.",
  },
  BUSINESS_START: {
    tier: "BUSINESS_START",
    displayName: "Business Start",
    monthlyFeeCents: 4990, // R$ 49,90
    monthlyWzNominal: 4990,
    technicalLlmQuotaTokens: 5_000_000,
    conversationalAiAllowed: true,
    canCreateBasicPosts: true,
    maxVisitsMonthly: 20_000,
    description: "Para micro e pequenas empresas iniciando sua operação digital e catálogo inicial.",
    highlightBadge: "Iniciante",
  },
  BUSINESS_PRO: {
    tier: "BUSINESS_PRO",
    displayName: "Business Pro",
    monthlyFeeCents: 9990, // R$ 99,90
    monthlyWzNominal: 9990,
    technicalLlmQuotaTokens: 10_000_000,
    conversationalAiAllowed: true,
    canCreateBasicPosts: true,
    maxVisitsMonthly: 50_000,
    description: "Empresas em expansão com catálogo avançado, CRM, PDV e operação omnichannel.",
    highlightBadge: "Mais Popular",
  },
  BUSINESS_MAX: {
    tier: "BUSINESS_MAX",
    displayName: "Business Max",
    monthlyFeeCents: 19900, // R$ 199,00
    monthlyWzNominal: 19900,
    technicalLlmQuotaTokens: 20_000_000,
    conversationalAiAllowed: true,
    canCreateBasicPosts: true,
    maxVisitsMonthly: 150_000,
    description: "Alta densidade comercial com múltiplos operadores, automações fiscais e prioridade de busca.",
  },
  BUSINESS_BLACK: {
    tier: "BUSINESS_BLACK",
    displayName: "Business Black",
    monthlyFeeCents: 29900, // R$ 299,00
    monthlyWzNominal: 29900,
    technicalLlmQuotaTokens: 30_000_000,
    conversationalAiAllowed: true,
    canCreateBasicPosts: true,
    maxVisitsMonthly: 500_000,
    description: "Escala corporativa com canal de suporte VIP, taxas reduzidas e prioridade máxima de tráfego.",
    highlightBadge: "Alta Performance",
  },
  BUSINESS_ENTERPRISE: {
    tier: "BUSINESS_ENTERPRISE",
    displayName: "Business Enterprise",
    monthlyFeeCents: 49900, // R$ 499,00
    monthlyWzNominal: 49900,
    technicalLlmQuotaTokens: 50_000_000,
    conversationalAiAllowed: true,
    canCreateBasicPosts: true,
    maxVisitsMonthly: 2_000_000,
    description: "Grandes redes e veículos editoriais com múltiplos squads de IA e integração completa.",
  },
  CORPORATE: {
    tier: "CORPORATE",
    displayName: "Corporate Custom",
    monthlyFeeCents: -1, // Negociado
    monthlyWzNominal: -1,
    technicalLlmQuotaTokens: -1,
    conversationalAiAllowed: true,
    canCreateBasicPosts: true,
    maxVisitsMonthly: null,
    description: "Contratos corporativos sob medida para franquias, concessionárias e governança regional.",
  },
};

// ============================================================================
// 3. MÓDULOS MODULARES ADICIONAIS (ADD-ONS)
// ============================================================================

export type ModularAddonKey = "BUSINESS_IS" | "BUSINESS_SITE" | "BUSINESS_HUB";

export interface ModularAddonSpecification {
  key: ModularAddonKey;
  name: string;
  description: string;
  monthlyFeeCents: number;
  monthlyWz: number;
}

export const MODULAR_ADDONS: Record<ModularAddonKey, ModularAddonSpecification> = {
  BUSINESS_IS: {
    key: "BUSINESS_IS",
    name: "Business IS (Super Inteligência)",
    description: "Copilots agênticos autônomos, agentes SDR de vendas, squads de automação e análise preditiva.",
    monthlyFeeCents: 9900, // R$ 99,00
    monthlyWz: 9900,
  },
  BUSINESS_SITE: {
    key: "BUSINESS_SITE",
    name: "Business Site (Omni Builder)",
    description: "Criação ilimitada de sites institucionais, landing pages de alta conversão, biolinks e exportação de código.",
    monthlyFeeCents: 4900, // R$ 49,00
    monthlyWz: 4900,
  },
  BUSINESS_HUB: {
    key: "BUSINESS_HUB",
    name: "Business Hub (Central de Canais & ERP)",
    description: "Hub de integrações de múltiplos canais (iFood, Mercado Livre, Google Meu Negócio), estoque canônico e logística unificada.",
    monthlyFeeCents: 7900, // R$ 79,00
    monthlyWz: 7900,
  },
};

// ============================================================================
// 4. CATÁLOGO DE OPERAÇÕES EM $WZ & CUSTOS DE INFRAESTRUTURA
// ============================================================================

export interface AiOperationRate {
  operationKey: string;
  category: "omni_builder" | "news_editorial" | "copilot" | "infra";
  description: string;
  wzCost: number;
  centsCost: number;
  avgLlmTokens: number;
  estimatedRawCostBrl: number;
  grossMarginPercent: number;
}

export const AI_OPERATION_RATES: Record<string, AiOperationRate> = {
  // 1. Omni Builder
  OMNI_SITE_FULL_GENERATION: {
    operationKey: "OMNI_SITE_FULL_GENERATION",
    category: "omni_builder",
    description: "Geração de Site Completo (Zero ao Ar: wireframe, copy, SEO e seções)",
    wzCost: 50,
    centsCost: 50,
    avgLlmTokens: 60000,
    estimatedRawCostBrl: 0.22,
    grossMarginPercent: 56,
  },
  OMNI_SECTION_EDIT: {
    operationKey: "OMNI_SECTION_EDIT",
    category: "omni_builder",
    description: "Edição ou refinamento de seção específica no Builder",
    wzCost: 3,
    centsCost: 3,
    avgLlmTokens: 4500,
    estimatedRawCostBrl: 0.012,
    grossMarginPercent: 60,
  },
  OMNI_BILINGUAL_TRANSLATION: {
    operationKey: "OMNI_BILINGUAL_TRANSLATION",
    category: "omni_builder",
    description: "Tradução e localização bilíngue integral de rotas e seções",
    wzCost: 15,
    centsCost: 15,
    avgLlmTokens: 25000,
    estimatedRawCostBrl: 0.060,
    grossMarginPercent: 60,
  },
  OMNI_HERO_IMAGE_GENERATION: {
    operationKey: "OMNI_HERO_IMAGE_GENERATION",
    category: "omni_builder",
    description: "Geração de Banner ou Imagem Hero com IA (SDXL/Flux/Imagen)",
    wzCost: 15,
    centsCost: 15,
    avgLlmTokens: 1000,
    estimatedRawCostBrl: 0.075,
    grossMarginPercent: 50,
  },

  // 2. Notícias & Conteúdo Editorial
  NEWS_ARTICLE_GENERATION: {
    operationKey: "NEWS_ARTICLE_GENERATION",
    category: "news_editorial",
    description: "Redação ou expansão autoral de artigo noticioso com IA",
    wzCost: 5,
    centsCost: 5,
    avgLlmTokens: 8000,
    estimatedRawCostBrl: 0.025,
    grossMarginPercent: 50,
  },
  NEWS_URL_MINING: {
    operationKey: "NEWS_URL_MINING",
    category: "news_editorial",
    description: "Mineração e reescrita autoral anti-plágio de notícia por URL externa",
    wzCost: 8,
    centsCost: 8,
    avgLlmTokens: 8000,
    estimatedRawCostBrl: 0.030,
    grossMarginPercent: 62,
  },
  NEWS_SEO_GEO_TAGS: {
    operationKey: "NEWS_SEO_GEO_TAGS",
    category: "news_editorial",
    description: "Otimização SEO factual, geo-coordenadas e schema NewsArticle",
    wzCost: 2,
    centsCost: 2,
    avgLlmTokens: 2500,
    estimatedRawCostBrl: 0.008,
    grossMarginPercent: 60,
  },

  // 3. Copilot Rápido
  COPILOT_QUICK_PROMPT: {
    operationKey: "COPILOT_QUICK_PROMPT",
    category: "copilot",
    description: "Prompt rápido no Copilot (dúvida, resumo ou orientação)",
    wzCost: 1,
    centsCost: 1,
    avgLlmTokens: 1200,
    estimatedRawCostBrl: 0.003,
    grossMarginPercent: 70,
  },
};

// Squads Editoriais Mensais
export interface EditorialSquadPlan {
  squadKey: string;
  name: string;
  monthlyWz: number;
  monthlyFeeCents: number;
  monthlyArticlesQuota: number;
  estimatedRawCostCents: number;
  profitCents: number;
  netMarginPercent: number;
}

export const EDITORIAL_SQUADS: Record<string, EditorialSquadPlan> = {
  SQUAD_COMPACT: {
    squadKey: "SQUAD_COMPACT",
    name: "Squad Compacto (Jornal Local / Blog)",
    monthlyWz: 2500,
    monthlyFeeCents: 2500, // R$ 25,00
    monthlyArticlesQuota: 150,
    estimatedRawCostCents: 850,
    profitCents: 1650,
    netMarginPercent: 66,
  },
  SQUAD_PRO: {
    squadKey: "SQUAD_PRO",
    name: "Squad Pro (Portal Regional)",
    monthlyWz: 8500,
    monthlyFeeCents: 8500, // R$ 85,00
    monthlyArticlesQuota: 600,
    estimatedRawCostCents: 3100,
    profitCents: 5400,
    netMarginPercent: 63,
  },
  SQUAD_ENTERPRISE: {
    squadKey: "SQUAD_ENTERPRISE",
    name: "Squad Enterprise (Rede Multi-Portal)",
    monthlyWz: 30000,
    monthlyFeeCents: 30000, // R$ 300,00
    monthlyArticlesQuota: 2500,
    estimatedRawCostCents: 11500,
    profitCents: 18500,
    netMarginPercent: 61,
  },
};

// Modalidade BYO-Key (Bring Your Own Key)
export const BYOK_PLATFORM_FEE_WZ = 1; // 1 $WZ (R$ 0,01) taxa de infraestrutura e banco por operação
export const MIN_BALANCE_WZ_SECURITY_THRESHOLD = 10; // Trava de saldo mínimo: 10 $WZ (R$ 0,10)

// ============================================================================
// 5. TAXAS DE TRANSAÇÃO, SPLIT E GOVERNANÇA DE GATEWAYS
// ============================================================================

export const MARKETPLACE_PLATFORM_FEE_RATE = 0.05; // 5% taxa padrão da plataforma Waesy
export const STANDARD_MICROFEE_CENTS = 99; // R$ 0,99 taxa administrativa em mobilidade e microtransações
export const PDV_PLATFORM_FEE_RATE = 0.00; // 0% taxa da plataforma Waesy no PDV (Zero Taxa por transação)

export interface MarketplaceSplitCalculation {
  subtotalCents: number;
  shippingCents: number;
  totalOrderCents: number;
  platformFeeCents: number; // 5% sobre o subtotal
  gatewayFeeCents: number; // Taxa cobrada pelo gateway (ex: 2.99% ou conforme provedor)
  netMerchantCents: number; // Saldo líquido creditado à loja
}

/**
 * Calcula a divisão exata de valores de um pedido no Marketplace
 * Invariante: subtotalCents = platformFeeCents + gatewayFeeCents + netMerchantCents
 */
export function calculateMarketplaceOrderSplit(params: {
  subtotalCents: number;
  shippingCents: number;
  gatewayFeePercent?: number; // Ex: 0.0299 (2.99%) ou 0.0099 (0.99% pix)
  fixedGatewayFeeCents?: number; // Ex: 0 ou centavos fixos do gateway
}): MarketplaceSplitCalculation {
  const { subtotalCents, shippingCents, gatewayFeePercent = 0.0299, fixedGatewayFeeCents = 0 } = params;
  const totalOrderCents = subtotalCents + shippingCents;

  // 1. Taxa da plataforma Waesy: 5% sobre o subtotal de produtos/serviços
  const platformFeeCents = Math.round(subtotalCents * MARKETPLACE_PLATFORM_FEE_RATE);

  // 2. Taxa da plataforma de pagamento (Asaas ou Mercado Pago Master) sobre o total transacionado
  const gatewayFeeCents = Math.round(totalOrderCents * gatewayFeePercent) + fixedGatewayFeeCents;

  // 3. Saldo líquido a ser repassado ao lojista (Produtos - 5% - Gateway + Frete integral)
  const netMerchantCents = Math.max(0, totalOrderCents - platformFeeCents - gatewayFeeCents);

  return {
    subtotalCents,
    shippingCents,
    totalOrderCents,
    platformFeeCents,
    gatewayFeeCents,
    netMerchantCents,
  };
}

/**
 * Validador estrito de autorização de Gateways por contexto (Marketplace vs PDV/Fatura)
 *
 * Invariantes:
 * - 'marketplace': É terminantemente vedado usar credenciais cadastradas pela loja.
 *   Usa 100% gateways configurados pelo Admin Master (Asaas / Mercado Pago).
 * - 'pdv' / 'invoice': Pode usar gateway próprio da loja, ou optar por usar a infraestrutura Master.
 */
export type PaymentCheckoutContext = "marketplace" | "pdv" | "invoice";

export function assertGatewayRouting(params: {
  context: PaymentCheckoutContext;
  hasStoreGateway: boolean;
  storeGatewayProvider?: string | null;
  allowMasterFallbackForPdv?: boolean;
}): {
  effectiveProviderSource: "master" | "store";
  isPlatformFeeApplicable: boolean;
} {
  const { context, hasStoreGateway, allowMasterFallbackForPdv = true } = params;

  if (context === "marketplace") {
    // Marketplace público: SOBERANIA MASTER ABSOLUTA
    return {
      effectiveProviderSource: "master",
      isPlatformFeeApplicable: true,
    };
  }

  // PDV / Fatura Direta da Loja:
  if (hasStoreGateway) {
    return {
      effectiveProviderSource: "store",
      isPlatformFeeApplicable: false, // Loja usa credencial própria no PDV, custo direto no gateway dela (0% Waesy)
    };
  }

  if (allowMasterFallbackForPdv) {
    return {
      effectiveProviderSource: "master",
      isPlatformFeeApplicable: false, // No PDV físico a Waesy cobra 0% de taxa por transação (apenas repasse do adquirente)
    };
  }

  throw new Error("Nenhum gateway configurado para o PDV e fallback Master desativado.");
}

// ============================================================================
// 6. MOTOR DE INADIMPLÊNCIA & AUTODÉBITO DE FATURAS VENCIDAS
// ============================================================================

export interface DelinquencyAutoDebitResult {
  merchantNetCents: number;
  overdueInvoicesTotalCents: number;
  withheldCents: number; // Valor retido para quitar faturas pendentes
  releasedPayoutCents: number; // Saldo remanescente transferido à conta da loja
  remainingDebtCents: number; // Saldo devedor restante da loja se a retenção não cobriu tudo
  fullySettled: boolean;
}

/**
 * Executa o cálculo de retenção transacional de inadimplência sobre uma venda do marketplace
 */
export function calculateDelinquencyAutoDebit(params: {
  merchantNetCents: number;
  overdueInvoicesTotalCents: number;
}): DelinquencyAutoDebitResult {
  const { merchantNetCents, overdueInvoicesTotalCents } = params;

  if (overdueInvoicesTotalCents <= 0) {
    return {
      merchantNetCents,
      overdueInvoicesTotalCents: 0,
      withheldCents: 0,
      releasedPayoutCents: merchantNetCents,
      remainingDebtCents: 0,
      fullySettled: true,
    };
  }

  // Retém no máximo o valor líquido a repassar ou a totalidade da dívida pendente
  const withheldCents = Math.min(merchantNetCents, overdueInvoicesTotalCents);
  const releasedPayoutCents = merchantNetCents - withheldCents;
  const remainingDebtCents = overdueInvoicesTotalCents - withheldCents;

  return {
    merchantNetCents,
    overdueInvoicesTotalCents,
    withheldCents,
    releasedPayoutCents,
    remainingDebtCents,
    fullySettled: remainingDebtCents === 0,
  };
}

// ============================================================================
// 7. TAP TO PAY PDV — SESSÃO TRANSAÇÃO SINCRONIZADA
// ============================================================================

export interface PdvTapToPaySessionDTO {
  sessionId: string;
  storeId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  status: "WAITING_TAP" | "PROCESSING" | "APPROVED" | "FAILED" | "EXPIRED";
  cashierTerminalId: string;
  mobileOperatorId?: string | null;
  cardBrand?: string | null;
  authorizationCode?: string | null;
  createdAt: string;
  expiresAt: string;
}

// ============================================================================
// 8. WAESY GO: DIVISÃO BILATERAL & OPACIDADE DE TAXAS (R$ 0,99 CLIENTE + MOTORISTA)
// ============================================================================

export interface MobilityPassengerViewDTO {
  fareCents: number; // Tarifa da corrida / deslocamento (ex: R$ 6,00)
  serviceFeeCents: number; // Taxa de serviço da plataforma (ex: R$ 0,99)
  totalChargedCents: number; // Total cobrado do passageiro (ex: R$ 6,99)
}

export interface MobilityDriverViewDTO {
  grossFareCents: number; // Tarifa bruta gerada na corrida (ex: R$ 6,00)
  platformFeeCents: number; // Taxa fixa administrativa Waesy Go (ex: R$ 0,99)
  gatewayFeeCents: number; // Taxa de adquirente / gateway descontada do repasse
  netEarningsCents: number; // Ganhos líquidos transferidos ao condutor (ex: R$ 4,95)
}

export interface MobilityPlatformRevenueDTO {
  passengerFeeCents: number; // R$ 0,99 recebido do passageiro
  driverFeeCents: number; // R$ 0,99 recebido do condutor
  totalPlatformRevenueCents: number; // Total Waesy: R$ 1,98 por corrida finalizada
  grossTransactedCents: number; // Total que transitou no gateway
}

export interface MobilityBilateralSplitResult {
  passengerView: MobilityPassengerViewDTO;
  driverView: MobilityDriverViewDTO;
  platformAudit: MobilityPlatformRevenueDTO;
}

/**
 * Calcula a divisão bilateral de corrida no Waesy Go com isolamento e opacidade estrita.
 *
 * Invariantes:
 * - O passageiro NÃO vê a taxa administrativa paga pelo motorista nem seus ganhos líquidos.
 * - O motorista NÃO vê a taxa de serviço de R$ 0,99 cobrada do passageiro.
 * - A Waesy retém R$ 0,99 do passageiro e R$ 0,99 do motorista sem cobrar porcentagens abusivas da corrida.
 */
export function calculateMobilityBilateralSplit(params: {
  fareCents: number;
  passengerFeeCents?: number;
  driverFeeCents?: number;
  driverGatewayRatePercent?: number; // Ex: 0.0099 (0.99% adquirente)
  fixedGatewayFeeCents?: number;
}): MobilityBilateralSplitResult {
  const {
    fareCents,
    passengerFeeCents = STANDARD_MICROFEE_CENTS,
    driverFeeCents = STANDARD_MICROFEE_CENTS,
    driverGatewayRatePercent = 0.0099,
    fixedGatewayFeeCents = 0,
  } = params;

  // 1. Visão do Passageiro: Paga a tarifa base + taxa de serviço da plataforma
  const totalChargedCents = fareCents + passengerFeeCents;
  const passengerView: MobilityPassengerViewDTO = {
    fareCents,
    serviceFeeCents: passengerFeeCents,
    totalChargedCents,
  };

  // 2. Visão do Motorista: Recebe a tarifa bruta, deduz taxa fixa Waesy Go e taxa de adquirente
  const gatewayFeeCents = Math.round(fareCents * driverGatewayRatePercent) + fixedGatewayFeeCents;
  const netEarningsCents = Math.max(0, fareCents - driverFeeCents - gatewayFeeCents);
  const driverView: MobilityDriverViewDTO = {
    grossFareCents: fareCents,
    platformFeeCents: driverFeeCents,
    gatewayFeeCents,
    netEarningsCents,
  };

  // 3. Auditoria da Plataforma Waesy (Total Retido Bilateralmente)
  const totalPlatformRevenueCents = passengerFeeCents + driverFeeCents;
  const platformAudit: MobilityPlatformRevenueDTO = {
    passengerFeeCents,
    driverFeeCents,
    totalPlatformRevenueCents,
    grossTransactedCents: totalChargedCents,
  };

  return {
    passengerView,
    driverView,
    platformAudit,
  };
}

// ============================================================================
// 9. PARAMETRIZAÇÃO & CUSTOMIZAÇÃO DE TAXAS POR CLIENTE / LOJA / USUÁRIO
// ============================================================================

export interface PricingOverridesDTO {
  entityType: "store" | "profile" | "client";
  entityId: string;
  marketplaceFeeRate?: number; // Override da taxa de 5% (ex: 0.03 para 3%)
  mobilityPassengerFeeCents?: number; // Override da taxa do passageiro (ex: 0 em promoção)
  mobilityDriverFeeCents?: number; // Override da taxa do condutor (ex: 0 para parceiro VIP)
  pdvPlatformFeeRate?: number; // Padrão 0.00 (mantém zero no PDV)
  planDiscountPercent?: number; // Desconto percentual na mensalidade
  customAiTokensBonus?: number; // Bônus de tokens técnicos mensais
  isFeeExempt?: boolean; // Isenção total de taxas de plataforma
  notes?: string;
  updatedAt?: string;
}

export interface EffectivePricingRulesDTO {
  marketplaceFeeRate: number;
  mobilityPassengerFeeCents: number;
  mobilityDriverFeeCents: number;
  pdvPlatformFeeRate: number;
  isFeeExempt: boolean;
  activeOverridesCount: number;
}

/**
 * Resolve as regras e taxas efetivas aplicando os overrides configurados para a entidade
 */
export function resolveEffectivePricing(overrides?: Partial<PricingOverridesDTO> | null): EffectivePricingRulesDTO {
  if (!overrides) {
    return {
      marketplaceFeeRate: MARKETPLACE_PLATFORM_FEE_RATE,
      mobilityPassengerFeeCents: STANDARD_MICROFEE_CENTS,
      mobilityDriverFeeCents: STANDARD_MICROFEE_CENTS,
      pdvPlatformFeeRate: PDV_PLATFORM_FEE_RATE,
      isFeeExempt: false,
      activeOverridesCount: 0,
    };
  }

  if (overrides.isFeeExempt) {
    return {
      marketplaceFeeRate: 0,
      mobilityPassengerFeeCents: 0,
      mobilityDriverFeeCents: 0,
      pdvPlatformFeeRate: 0,
      isFeeExempt: true,
      activeOverridesCount: 1,
    };
  }

  let count = 0;
  if (typeof overrides.marketplaceFeeRate === "number") count++;
  if (typeof overrides.mobilityPassengerFeeCents === "number") count++;
  if (typeof overrides.mobilityDriverFeeCents === "number") count++;
  if (typeof overrides.pdvPlatformFeeRate === "number") count++;

  return {
    marketplaceFeeRate: typeof overrides.marketplaceFeeRate === "number"
      ? overrides.marketplaceFeeRate
      : MARKETPLACE_PLATFORM_FEE_RATE,
    mobilityPassengerFeeCents: typeof overrides.mobilityPassengerFeeCents === "number"
      ? overrides.mobilityPassengerFeeCents
      : STANDARD_MICROFEE_CENTS,
    mobilityDriverFeeCents: typeof overrides.mobilityDriverFeeCents === "number"
      ? overrides.mobilityDriverFeeCents
      : STANDARD_MICROFEE_CENTS,
    pdvPlatformFeeRate: typeof overrides.pdvPlatformFeeRate === "number"
      ? overrides.pdvPlatformFeeRate
      : PDV_PLATFORM_FEE_RATE,
    isFeeExempt: false,
    activeOverridesCount: count,
  };
}
