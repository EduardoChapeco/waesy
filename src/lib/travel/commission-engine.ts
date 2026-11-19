/**
 * Motor Unificado e Determinístico de Comissões para Agências de Viagens (SSOT).
 * Módulo 100% puro (zero dependências de DOM ou servidor), compartilhado entre BFF e prévia UI.
 */

export type TravelGoalEvaluationBasis = "gross_sale" | "net_sale" | "agency_revenue";
export type TravelCommissionCalculationBasis = "net_sale_plus_over" | "agency_commission_share";
export type TravelOverPaymentMethod = "pix_direto_agencia" | "operadora_financiado";
export type TravelCommissionReleaseTrigger =
  | "na_emissao"
  | "na_liquidacao_cliente"
  | "no_recebimento_operadora"
  | "pos_embarque";

export type TravelCommissionPayoutNature =
  | "premiacao_variavel_por_fora"
  | "bonus_meta"
  | "repasse_pj_autonomo"
  | "comissao_sobre_recebimento";

export interface TravelAgentTierDefinition {
  tierName: string;
  minMonthlyRevenueCents: number;
  maxMonthlyRevenueCents: number | null;
  commissionPct: number;
  overCommissionPct: number;
  baseCommissionPct?: number;
  bonusFixedCents?: number;
}

export interface TravelAgentCommissionRuleProfile {
  agentId: string;
  profileId?: string | null;
  employeeId?: string | null;
  agentName: string;
  goalEvaluationBasis: TravelGoalEvaluationBasis;
  commissionCalculationBasis: TravelCommissionCalculationBasis;
  baseCommissionPct: number;
  defaultOverCommissionPct: number;
  tiers: TravelAgentTierDefinition[];
  tierRetroactiveInMonth?: boolean;
  payoutMode?: "off_payroll_award" | "pj_repasse";
  releaseTrigger?: TravelCommissionReleaseTrigger;
  hideAgencyNetFromSeller?: boolean;
  pixKey?: string | null;
}

export interface TravelCommissionRowCalculationInput {
  grossSaleCents: number;
  operatorTablePriceCents?: number | null;
  taxesAndFeesCents?: number | null;
  baseCommissionPct: number;
  overPaymentMethod?: TravelOverPaymentMethod;
  settlementMethod?: string;
  overRetentionFeePct?: number | null;
  extraOverDeductionsCents?: number | null;
  otherInternalCostsCents?: number | null;
  bookingStatus?: string;
  deductCommissionOnCancel?: boolean;
  managerCommissionClawbackCents?: number | null;
  canApplyOverrides?: boolean;
  agentCommissionPctOverride?: number | null;
  agentOverCommissionPctOverride?: number | null;
  agentCommissionCentsOverride?: number | null;
  cumulativeMonthlyGoalVolumeCents?: number;
  agentProfile?: TravelAgentCommissionRuleProfile | null;
}

export interface TravelCommissionRowCalculationResult {
  grossSaleCents: number;
  operatorTablePriceCents: number;
  taxesAndFeesCents: number;
  netCommissionableBaseCents: number;
  baseCommissionGrossCents: number;
  overGrossCents: number;
  effectiveOverRetentionPct: number;
  overRetentionDeductionCents: number;
  extraOverDeductionsCents: number;
  overNetCents: number;
  agencyRevenueCents: number;
  appliedTierName: string;
  appliedCommissionPct: number;
  appliedOverCommissionPct: number;
  agentBaseCommissionCents: number;
  agentOverCommissionCents: number;
  grossAgentCommissionCents: number;
  appliedClawbackCents: number;
  agentCommissionTotalCents: number;
  otherInternalCostsCents: number;
  agencyNetProfitCents: number;
  retainedCashAmountCents: number;
  operatorBalanceCents: number;
  isCashSettled: boolean;
  requiresOperatorInvoice: boolean;
}

export function resolveTierForAccumulatedVolume(
  profile: TravelAgentCommissionRuleProfile | null | undefined,
  accumulatedMonthlyVolumeCents: number,
): {
  tierName: string;
  commissionPct: number;
  overCommissionPct: number;
  basePct: number;
  overPct: number;
  bonusFixedCents: number;
  nextTier: (TravelAgentTierDefinition & { baseCommissionPct: number }) | null;
  remainingToNextTierCents: number;
} {
  const volume = Math.max(0, Math.round(accumulatedMonthlyVolumeCents || 0));
  const fallbackCommissionPct = Math.max(0, Number(profile?.baseCommissionPct || 0));
  const fallbackOverPct = Math.max(0, Number(profile?.defaultOverCommissionPct ?? 30));
  const sortedTiers = [...(profile?.tiers || [])].sort(
    (a, b) => a.minMonthlyRevenueCents - b.minMonthlyRevenueCents,
  );

  if (sortedTiers.length === 0) {
    return {
      tierName: "Base Padrão",
      commissionPct: fallbackCommissionPct,
      overCommissionPct: fallbackOverPct,
      basePct: fallbackCommissionPct,
      overPct: fallbackOverPct,
      bonusFixedCents: 0,
      nextTier: null,
      remainingToNextTierCents: 0,
    };
  }

  let matchedIndex = 0;
  for (let i = 0; i < sortedTiers.length; i++) {
    const t = sortedTiers[i];
    const aboveMin = volume >= (t.minMonthlyRevenueCents || 0);
    const belowMax = t.maxMonthlyRevenueCents == null || volume <= t.maxMonthlyRevenueCents;
    if (aboveMin && belowMax) {
      matchedIndex = i;
    } else if (volume > (t.minMonthlyRevenueCents || 0) && t.maxMonthlyRevenueCents == null) {
      matchedIndex = i;
    }
  }

  const active = sortedTiers[matchedIndex];
  const rawNextTier = matchedIndex + 1 < sortedTiers.length ? sortedTiers[matchedIndex + 1] : null;
  const nextTier = rawNextTier
    ? {
        ...rawNextTier,
        baseCommissionPct: rawNextTier.baseCommissionPct ?? rawNextTier.commissionPct,
      }
    : null;
  const remainingToNextTierCents = nextTier
    ? Math.max(0, (nextTier.minMonthlyRevenueCents || 0) - volume)
    : 0;

  const resolvedBasePct = Math.max(0, Number(active.commissionPct ?? fallbackCommissionPct));
  const resolvedOverPct = Math.max(0, Number(active.overCommissionPct ?? fallbackOverPct));

  return {
    tierName: active.tierName,
    commissionPct: resolvedBasePct,
    overCommissionPct: resolvedOverPct,
    basePct: resolvedBasePct,
    overPct: resolvedOverPct,
    bonusFixedCents: Math.max(0, Number(active.bonusFixedCents || 0)),
    nextTier,
    remainingToNextTierCents,
  };
}

export function calculateTravelSaleCommissionBreakdown(
  input: TravelCommissionRowCalculationInput,
): TravelCommissionRowCalculationResult {
  const grossSaleCents = Math.max(0, Math.round(input.grossSaleCents || 0));
  const taxesAndFeesCents = Math.max(0, Math.min(grossSaleCents, Math.round(input.taxesAndFeesCents || 0)));
  const rawTable = Math.round(input.operatorTablePriceCents || 0);
  const operatorTablePriceCents = rawTable > 0 ? Math.min(grossSaleCents, rawTable) : grossSaleCents;

  const overGrossCents = Math.max(0, grossSaleCents - operatorTablePriceCents);
  const netCommissionableBaseCents = Math.max(0, operatorTablePriceCents - taxesAndFeesCents);

  const basePct = Math.max(0, Math.min(100, Number(input.baseCommissionPct || 0)));
  const baseCommissionGrossCents = Math.round((netCommissionableBaseCents * basePct) / 100);

  const isCashSettled = input.settlementMethod === "comissao_balcao_a_vista";
  const isZeroRetentionOver =
    isCashSettled || input.overPaymentMethod === "pix_direto_agencia";

  const effectiveOverRetentionPct = isZeroRetentionOver
    ? 0
    : Math.max(0, Math.min(100, Number(input.overRetentionFeePct || 0)));
  const overRetentionDeductionCents = Math.round((overGrossCents * effectiveOverRetentionPct) / 100);
  const extraOverDeductionsCents = Math.max(0, Math.round(input.extraOverDeductionsCents || 0));
  const overNetCents = Math.max(0, overGrossCents - overRetentionDeductionCents - extraOverDeductionsCents);

  // Receita real da Agência (Take Rate = Base Tributável NFS-e)
  const agencyRevenueCents = baseCommissionGrossCents + overNetCents;

  // Resolução de faixa a partir do volume mensal real apurado pelo servidor
  const resolvedTier = resolveTierForAccumulatedVolume(
    input.agentProfile,
    input.cumulativeMonthlyGoalVolumeCents || 0,
  );

  const allowOverride = Boolean(input.canApplyOverrides);
  const appliedCommissionPct =
    allowOverride && input.agentCommissionPctOverride != null
      ? Math.max(0, Math.min(100, Number(input.agentCommissionPctOverride)))
      : resolvedTier.commissionPct;

  const appliedOverCommissionPct =
    allowOverride && input.agentOverCommissionPctOverride != null
      ? Math.max(0, Math.min(100, Number(input.agentOverCommissionPctOverride)))
      : resolvedTier.overCommissionPct;

  const calcBasis: TravelCommissionCalculationBasis =
    input.agentProfile?.commissionCalculationBasis || "net_sale_plus_over";

  const agentBaseCommissionCents =
    calcBasis === "agency_commission_share"
      ? Math.round((agencyRevenueCents * appliedCommissionPct) / 100)
      : Math.round((netCommissionableBaseCents * appliedCommissionPct) / 100);

  const agentOverCommissionCents =
    calcBasis === "agency_commission_share"
      ? 0
      : Math.round((overNetCents * appliedOverCommissionPct) / 100);

  const grossAgentCommissionCents =
    allowOverride && input.agentCommissionCentsOverride != null
      ? Math.max(0, Math.round(input.agentCommissionCentsOverride))
      : agentBaseCommissionCents + agentOverCommissionCents;

  // Cancelamentos não descontam comissão salvo se gestor aplicar estorno explícito
  const isCancelled = input.bookingStatus === "cancelada" || input.bookingStatus === "cancelado";
  const shouldApplyClawback = Boolean(input.deductCommissionOnCancel) || (isCancelled && Boolean(input.deductCommissionOnCancel));
  const appliedClawbackCents = shouldApplyClawback
    ? input.managerCommissionClawbackCents != null
      ? Math.max(0, Math.min(grossAgentCommissionCents, Math.round(input.managerCommissionClawbackCents)))
      : grossAgentCommissionCents
    : 0;

  const agentCommissionTotalCents = Math.max(0, grossAgentCommissionCents - appliedClawbackCents);
  const otherInternalCostsCents = Math.max(0, Math.round(input.otherInternalCostsCents || 0));
  const agencyNetProfitCents = agencyRevenueCents - agentCommissionTotalCents - otherInternalCostsCents;

  const retainedCashAmountCents = isCashSettled ? agencyRevenueCents : 0;
  const operatorBalanceCents = Math.max(0, agencyRevenueCents - retainedCashAmountCents);
  const requiresOperatorInvoice = !isCashSettled && operatorBalanceCents > 0;

  return {
    grossSaleCents,
    operatorTablePriceCents,
    taxesAndFeesCents,
    netCommissionableBaseCents,
    baseCommissionGrossCents,
    overGrossCents,
    effectiveOverRetentionPct,
    overRetentionDeductionCents,
    extraOverDeductionsCents,
    overNetCents,
    agencyRevenueCents,
    appliedTierName: resolvedTier.tierName,
    appliedCommissionPct,
    appliedOverCommissionPct,
    agentBaseCommissionCents,
    agentOverCommissionCents,
    grossAgentCommissionCents,
    appliedClawbackCents,
    agentCommissionTotalCents,
    otherInternalCostsCents,
    agencyNetProfitCents,
    retainedCashAmountCents,
    operatorBalanceCents,
    isCashSettled,
    requiresOperatorInvoice,
  };
}

export interface MonthlyGrowthComparison {
  currentValueCents: number;
  previousValueCents: number;
  deltaCents: number;
  growthPct: number;
  trend: "up" | "down" | "flat";
}

export function computeGrowthComparison(
  currentValueCents: number,
  previousValueCents: number,
): MonthlyGrowthComparison {
  const cur = Math.round(currentValueCents || 0);
  const prev = Math.round(previousValueCents || 0);
  const deltaCents = cur - prev;
  const growthPct =
    prev > 0
      ? Number((((cur - prev) / prev) * 100).toFixed(1))
      : cur > 0
        ? 100
        : 0;
  const trend: "up" | "down" | "flat" = deltaCents > 0 ? "up" : deltaCents < 0 ? "down" : "flat";
  return {
    currentValueCents: cur,
    previousValueCents: prev,
    deltaCents,
    growthPct,
    trend,
  };
}

/**
 * Resolve o status elegível da premiação do agente com base no gatilho configurado pela agência.
 */
export function resolveCommissionReleaseEligibility(params: {
  releaseTrigger: TravelCommissionReleaseTrigger;
  bookingStatus: string;
  receivableStatus: string;
  departureDate?: string | null;
  referenceDateIso?: string;
}): "pending" | "eligible" {
  const { releaseTrigger, bookingStatus, receivableStatus, departureDate, referenceDateIso } = params;
  if (bookingStatus === "rascunho" || bookingStatus === "cancelada") {
    return "pending";
  }

  switch (releaseTrigger) {
    case "na_emissao":
      return ["confirmada", "emitida", "em_viagem", "concluida"].includes(bookingStatus)
        ? "eligible"
        : "pending";
    case "na_liquidacao_cliente":
      return ["emitida", "em_viagem", "concluida"].includes(bookingStatus) ||
        receivableStatus === "recebido"
        ? "eligible"
        : "pending";
    case "pos_embarque": {
      if (bookingStatus === "em_viagem" || bookingStatus === "concluida") return "eligible";
      if (departureDate) {
        const refDay = (referenceDateIso || new Date().toISOString()).slice(0, 10);
        return departureDate <= refDay ? "eligible" : "pending";
      }
      return "pending";
    }
    case "no_recebimento_operadora":
    default:
      return receivableStatus === "recebido" ? "eligible" : "pending";
  }
}
