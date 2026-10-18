// ============================================================================
// WAESY SIMLABS 4.0 — MOTOR ECONOMÉTRICO MECÂNICO, ESTATÍSTICO & TEMPORAL
// Baseado em McFadden Random Utility (Logit), IBGE/POF, Wilson 95% & Chronos TGN
// ============================================================================

import type {
  EconometricChoiceEvaluation,
  PricePerception,
  SimLabChronosCascadeStep,
  SimLabDemandCurvePoint,
  SocialFeedReaction,
  SyntheticArchetype,
  System1Emotion,
  VerdictStatus,
} from "../../types/simlab";
import { wilsonInterval } from "./experiment-statistics";

export interface CognitivePersonaSignal {
  perceived_value_score: number; // 0 a 10
  trust_score: number;           // 0 a 10
  ux_friction_score: number;     // 0 a 10
  reservation_price_brl: number; // WTP_i (Quanto aceita pagar em R$)
  system_1_emotion?: System1Emotion;
  primary_hook_detected?: string;
  primary_objection: string;
  natural_speech_verbatim: string;
  factors_for?: string[];
  factors_against?: string[];
  social_feed_comment?: string;
  social_feed_reaction?: SocialFeedReaction;
  p2p_initial_offer_brl?: number;
  p2p_walkaway_price_brl?: number;
  bargaining_strategy?: string;
}

export interface OfferParameters {
  unitPriceBrl: number;
  maxInstallments: number;
  isPerPersonLeisure?: boolean;
  category?: string;
}

function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, val));
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

function round4(val: number): number {
  return Math.round(val * 10000) / 10000;
}

/**
 * Deriva uma ficha financeira POF defensiva caso o perfil venha do catálogo customizado sem ficha completa.
 */
export function resolvePersonaFinancials(persona: SyntheticArchetype) {
  if (persona.financial_sheet) {
    return persona.financial_sheet;
  }
  const netIncome = Math.max(1412, Number(persona.median_income_brl || 3200));
  const fixedRatio =
    persona.abep_social_class === "D_E"
      ? 0.88
      : persona.abep_social_class === "C2"
        ? 0.8
        : persona.abep_social_class === "C1"
          ? 0.74
          : persona.abep_social_class === "B2"
            ? 0.66
            : 0.55;
  const essentialFixed = round2(netIncome * fixedRatio);
  const surplus = round2(Math.max(80, netIncome - essentialFixed));
  return {
    gross_monthly_income_brl: round2(netIncome * 1.18),
    net_monthly_income_brl: netIncome,
    essential_fixed_expenses_brl: essentialFixed,
    discretionary_surplus_brl: surplus,
    leisure_budget_monthly_brl: round2(surplus * 0.45),
    liquid_reserves_brl: round2(surplus * 3),
    credit_limit_available_brl: round2(netIncome * 1.5),
    debt_commitment_percent: 25,
    preferred_payment_method: "cartao_parcelado_sem_juros" as const,
  };
}

/**
 * Calcula a Solvência POF, Utilidade Aleatória de McFadden (U_ij) e Probabilidade Logit (P_ij)
 * para uma persona diante de um preço e parcelamento.
 */
export function computePersonaAffordabilityAndMcFaddenUtility(
  persona: SyntheticArchetype,
  offer: OfferParameters,
  signal: CognitivePersonaSignal,
): EconometricChoiceEvaluation {
  const fin = resolvePersonaFinancials(persona);
  const householdMembers = persona.household_profile?.total_members ?? 1;
  const familyMultiplier = offer.isPerPersonLeisure
    ? Math.max(1, Math.min(4, householdMembers))
    : 1;

  const basePrice = Math.max(0, Number(offer.unitPriceBrl || 0));
  const installments = Math.max(1, Math.min(24, Number(offer.maxInstallments || 1)));
  const totalOutlayBrl = round2(basePrice * familyMultiplier);
  const monthlyInstallmentBrl = round2(totalOutlayBrl / installments);

  const surplusBrl = Math.max(1, fin.discretionary_surplus_brl);
  const leisureBrl = Math.max(1, fin.leisure_budget_monthly_brl);

  // Comprometimento percentual da sobra discricionária mensal
  const discretionaryBurdenPercent = round2(
    clamp((monthlyInstallmentBrl / surplusBrl) * 100, 0, 999),
  );
  const leisureBurdenRatio = monthlyInstallmentBrl / leisureBrl;

  // Hard Budget Gate (Trava de Solvência POF/IBGE)
  const exceedsCreditAndReserve =
    totalOutlayBrl > fin.credit_limit_available_brl + fin.liquid_reserves_brl * 0.6;
  const exceedsMonthlySurplus = monthlyInstallmentBrl > surplusBrl * 1.15;
  const isInsolvent = basePrice > 0 && (exceedsCreditAndReserve || exceedsMonthlySurplus);

  // Affordability score (0 a 10)
  let affordabilityScore = 10;
  if (basePrice > 0) {
    if (isInsolvent) {
      affordabilityScore = clamp(round2(2 - discretionaryBurdenPercent / 100), 0, 1.8);
    } else {
      affordabilityScore = clamp(
        round2(10 - (discretionaryBurdenRatioToPenalty(discretionaryBurdenPercent / 100) * 8.5)),
        1.5,
        10,
      );
    }
  }

  const perceivedValue = clamp(Number(signal.perceived_value_score ?? 6.5), 0, 10);
  const trustScore = clamp(Number(signal.trust_score ?? 6.5), 0, 10);
  const uxFriction = clamp(Number(signal.ux_friction_score ?? 3.0), 0, 10);

  // Reserva de preço (WTP_i) ancorada na solvência real caso o LLM omita ou exagere
  const maxFeasibleWtp = round2(
    Math.min(
      surplusBrl * installments * 0.75,
      fin.credit_limit_available_brl * 0.8 + fin.liquid_reserves_brl * 0.3,
    ),
  );
  const rawWtp =
    signal.reservation_price_brl && signal.reservation_price_brl > 0
      ? signal.reservation_price_brl
      : basePrice > 0
        ? basePrice * (0.65 + (perceivedValue / 10) * 0.55)
        : surplusBrl * 0.35;
  const reservationPriceBrl = round2(
    basePrice > 0 ? Math.min(rawWtp, Math.max(basePrice * 0.25, maxFeasibleWtp)) : rawWtp,
  );

  // Sensibilidade a preço e ceticismo normalizados (0 a 1)
  const priceSensitivityNorm = clamp((persona.price_sensitivity || 5) / 10, 0.1, 1);
  const cynicismNorm = clamp((persona.cynicism_index || 5) / 10, 0.1, 1);
  const impulsivityNorm = clamp((persona.impulsivity_index || 5) / 10, 0.1, 1);

  // Gap relativo entre o preço cobrado e o WTP da persona
  const priceGapPenalty =
    basePrice > 0 && reservationPriceBrl > 0
      ? Math.max(0, (totalOutlayBrl - reservationPriceBrl) / reservationPriceBrl)
      : 0;

  // Equação de Utilidade Aleatória de McFadden (U_ij)
  // U_ij = beta_0 + beta_val*(V/10) + beta_trust*(T/10) + beta_imp*Imp - beta_price*S_p*Burden - beta_wtp*Gap - beta_cyn*Cyn*(Friction/10)
  const beta0 = -1.35;
  const systematicUtility =
    beta0 +
    2.45 * (perceivedValue / 10) +
    1.35 * (trustScore / 10) +
    0.45 * impulsivityNorm -
    2.15 * priceSensitivityNorm * Math.min(2.5, (discretionaryBurdenPercent / 100) * 1.4) -
    1.95 * priceSensitivityNorm * Math.min(2.5, priceGapPenalty) -
    1.45 * cynicismNorm * (uxFriction / 10);

  const netUtilityMcFadden = round4(
    isInsolvent ? Math.min(-2.85, systematicUtility - 2.2) : systematicUtility,
  );

  // Probabilidade Logit P_ij = 1 / (1 + exp(-U_ij))
  const rawLogisticProb = 1 / (1 + Math.exp(-netUtilityMcFadden));
  const solvencyDampener = isInsolvent ? 0.18 : leisureBurdenRatio > 1.0 ? 0.72 : 1.0;
  const choiceProbabilityPercent = round2(
    clamp(rawLogisticProb * solvencyDampener * 100, 0.5, 98.5),
  );

  // Percepção de preço determinística coerente com WTP e Solvência
  let pricePerception: PricePerception = signal.system_1_emotion
    ? inferPricePerception(totalOutlayBrl, reservationPriceBrl, isInsolvent, perceivedValue)
    : inferPricePerception(totalOutlayBrl, reservationPriceBrl, isInsolvent, perceivedValue);

  // Emoção Sistema 1 coerente com utilidade e percepção
  const system1Emotion: System1Emotion =
    signal.system_1_emotion ||
    inferSystem1Emotion(choiceProbabilityPercent, trustScore, isInsolvent, perceivedValue);

  // Barganha P2P (Concordia Game Theory)
  const p2pInitialOfferBrl = round2(
    signal.p2p_initial_offer_brl && signal.p2p_initial_offer_brl > 0
      ? Math.min(signal.p2p_initial_offer_brl, reservationPriceBrl)
      : Math.min(totalOutlayBrl * 0.85, reservationPriceBrl * 0.88),
  );
  const p2pWalkawayPriceBrl = round2(
    signal.p2p_walkaway_price_brl && signal.p2p_walkaway_price_brl > 0
      ? Math.min(signal.p2p_walkaway_price_brl, maxFeasibleWtp)
      : reservationPriceBrl,
  );

  const scientificRationale =
    `Renda líquida R$ ${fin.net_monthly_income_brl.toFixed(0)} | Sobra POF R$ ${fin.discretionary_surplus_brl.toFixed(0)} | ` +
    `Comprometimento: ${discretionaryBurdenPercent.toFixed(1)}% da sobra | WTP: R$ ${reservationPriceBrl.toFixed(0)} | ` +
    `McFadden U=${netUtilityMcFadden.toFixed(2)} -> P(Compra)=${choiceProbabilityPercent.toFixed(1)}%`;

  return {
    persona_id: persona.id || persona.code,
    family_tickets_multiplier: familyMultiplier,
    total_outlay_brl: totalOutlayBrl,
    monthly_family_installment_brl: monthlyInstallmentBrl,
    discretionary_burden_percent: discretionaryBurdenPercent,
    affordability_score: affordabilityScore,
    perceived_value_score: perceivedValue,
    trust_score: trustScore,
    ux_friction_score: uxFriction,
    reservation_price_brl: reservationPriceBrl,
    net_utility_mcfadden: netUtilityMcFadden,
    choice_probability_percent: choiceProbabilityPercent,
    system_1_emotion: system1Emotion,
    price_perception: pricePerception,
    primary_objection: signal.primary_objection || "Cautela orçamentária mensal",
    natural_speech_verbatim: signal.natural_speech_verbatim,
    scientific_rationale: scientificRationale,
    social_feed_comment:
      signal.social_feed_comment ||
      buildFallbackSocialComment(persona, choiceProbabilityPercent, pricePerception, signal.primary_objection),
    social_feed_reaction:
      signal.social_feed_reaction ||
      inferSocialFeedReaction(choiceProbabilityPercent, trustScore, cynicismNorm),
    p2p_initial_offer_brl: p2pInitialOfferBrl,
    p2p_walkaway_price_brl: p2pWalkawayPriceBrl,
    bargaining_strategy:
      signal.bargaining_strategy ||
      inferBargainingStrategy(persona, fin.preferred_payment_method, p2pInitialOfferBrl, p2pWalkawayPriceBrl),
  };
}

function discretionaryBurdenRatioToPenalty(ratio: number): number {
  if (ratio <= 0.15) return ratio * 0.5;
  if (ratio <= 0.4) return 0.075 + (ratio - 0.15) * 1.1;
  if (ratio <= 0.8) return 0.35 + (ratio - 0.4) * 1.3;
  return Math.min(1, 0.87 + (ratio - 0.8) * 0.5);
}

function inferPricePerception(
  outlay: number,
  wtp: number,
  isInsolvent: boolean,
  perceivedValue: number,
): PricePerception {
  if (outlay <= 0) return "justo";
  if (isInsolvent || outlay > wtp * 1.35) return "inacessivel";
  if (outlay < wtp * 0.55 && perceivedValue < 5.5) return "muito_barato_duvidoso";
  if (outlay > wtp * 1.05) return "caro_mas_vale";
  return "justo";
}

function inferSystem1Emotion(
  probPercent: number,
  trustScore: number,
  isInsolvent: boolean,
  perceivedValue: number,
): System1Emotion {
  if (isInsolvent) return "inseguranca";
  if (trustScore < 4.5) return "desconfianca";
  if (probPercent >= 70) return "entusiasmo";
  if (probPercent >= 45 && perceivedValue >= 6.5) return "desejo";
  if (probPercent < 25) return "tedio";
  return "inseguranca";
}

function inferSocialFeedReaction(
  probPercent: number,
  trustScore: number,
  cynicismNorm: number,
): SocialFeedReaction {
  if (probPercent >= 72 && trustScore >= 7) return "share";
  if (probPercent >= 55) return "save";
  if (probPercent >= 38) return "like";
  if (trustScore < 4.8 || cynicismNorm > 0.72) return "skeptical_comment";
  return "ignore";
}

function buildFallbackSocialComment(
  persona: SyntheticArchetype,
  probPercent: number,
  pricePerception: PricePerception,
  objection: string,
): string {
  if (probPercent >= 68) {
    return `Achei muito interessante para quem mora em ${persona.municipality || persona.region}. Alguém sabe se tem desconto no PIX?`;
  }
  if (pricePerception === "inacessivel") {
    return `A proposta é boa, mas nesse valor fica puxado pro orçamento do mês. ${objection}.`;
  }
  return `Interessante, mas precisaria de mais detalhes sobre garantia e condições reais antes de fechar.`;
}

function inferBargainingStrategy(
  persona: SyntheticArchetype,
  paymentMethod: string,
  initialOffer: number,
  walkaway: number,
): string {
  if (paymentMethod === "pix_a_vista") {
    return `Pechincha agressiva no PIX à vista: abre em R$ ${initialOffer.toFixed(0)} e fecha até R$ ${walkaway.toFixed(0)}.`;
  }
  if (persona.abep_social_class === "A1" || persona.abep_social_class === "A2") {
    return `Exige bônus/upgrade VIP ou frete expresso prioritário mantendo teto de R$ ${walkaway.toFixed(0)}.`;
  }
  return `Solicita parcelamento sem juros no cartão começando em R$ ${initialOffer.toFixed(0)} com limite máximo em R$ ${walkaway.toFixed(0)}.`;
}

/**
 * Calcula a Moda Estatística contínua via agrupamento em bins (Kernel/Histogram Mode).
 */
export function computeHistogramMode(values: number[], binSize: number): number {
  const clean = values.filter((v) => Number.isFinite(v) && v >= 0);
  if (clean.length === 0) return 0;
  if (clean.length === 1) return round2(clean[0]);

  const effectiveBin = Math.max(1, binSize);
  const buckets = new Map<number, { count: number; sum: number }>();

  for (const val of clean) {
    const key = Math.round(val / effectiveBin) * effectiveBin;
    const current = buckets.get(key) || { count: 0, sum: 0 };
    current.count += 1;
    current.sum += val;
    buckets.set(key, current);
  }

  let bestBucket = { count: -1, sum: 0 };
  for (const bucket of buckets.values()) {
    if (bucket.count > bestBucket.count) {
      bestBucket = bucket;
    }
  }

  return round2(bestBucket.sum / Math.max(1, bestBucket.count));
}

export function computeMedian(values: number[]): number {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? round2((sorted[mid - 1] + sorted[mid]) / 2)
    : round2(sorted[mid]);
}

export function computeStdDev(values: number[], meanValue: number): number {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length <= 1) return 0;
  const variance =
    clean.reduce((acc, val) => acc + Math.pow(val - meanValue, 2), 0) / clean.length;
  return round2(Math.sqrt(variance));
}

export interface CohortEconometricSummary {
  synthetic_nps: number;
  overall_approval_rate: number;
  rejection_rate: number;
  mean_intent_percent: number;
  median_intent_percent: number;
  mode_intent_percent: number;
  std_dev_intent: number;
  mode_reservation_price_brl: number;
  optimal_price_point_brl: number;
  estimated_conversion_range: [number, number];
  price_elasticity_score: number;
  demand_curve_points: SimLabDemandCurvePoint[];
  chronos_temporal_cascade: SimLabChronosCascadeStep[];
  social_virality_index: number;
  p2p_clearing_price_brl: number;
  scientific_verdict: VerdictStatus;
}

/**
 * Sintetiza todas as métricas mecânicas, estatísticas e temporais da coorte simulada.
 */
export function computeCohortDescriptiveAndEconometricStats(
  personas: SyntheticArchetype[],
  evaluations: EconometricChoiceEvaluation[],
  signals: CognitivePersonaSignal[],
  offer: OfferParameters,
): CohortEconometricSummary {
  const n = Math.max(1, evaluations.length);
  const probs = evaluations.map((e) => e.choice_probability_percent);
  const wtps = evaluations
    .map((e) => Number(e.reservation_price_brl || 0))
    .filter((v) => v > 0);

  // Pesos censitários
  let weightedProbSum = 0;
  let totalWeight = 0;
  evaluations.forEach((ev, idx) => {
    const w = personas[idx]?.census_weight ?? 1.0;
    weightedProbSum += ev.choice_probability_percent * w;
    totalWeight += w;
  });

  const meanIntentPercent = round2(weightedProbSum / Math.max(1e-6, totalWeight));
  const medianIntentPercent = computeMedian(probs);
  const modeIntentPercent = computeHistogramMode(probs, 5);
  const stdDevIntent = computeStdDev(probs, meanIntentPercent);

  const basePrice = Math.max(0, Number(offer.unitPriceBrl || 0));
  const wtpBinSize = basePrice > 0 ? Math.max(5, Math.round(basePrice * 0.08)) : 20;
  const modeReservationPriceBrl =
    wtps.length > 0 ? computeHistogramMode(wtps, wtpBinSize) : round2(basePrice);

  // Aprovação (P >= 50%) e Rejeição (P < 30%)
  const approvedCount = evaluations.filter((e) => e.choice_probability_percent >= 50).length;
  const rejectedCount = evaluations.filter((e) => e.choice_probability_percent < 30).length;
  const overallApprovalRate = round2((approvedCount / n) * 100);
  const rejectionRate = round2((rejectedCount / n) * 100);

  // NPS Sintético (-100 a +100): Promotores (P >= 70%) - Detratores (P < 40%)
  const promoters = evaluations.filter((e) => e.choice_probability_percent >= 70).length;
  const detractors = evaluations.filter((e) => e.choice_probability_percent < 40).length;
  const syntheticNps = Math.round(((promoters - detractors) / n) * 100);

  // Intervalo de Confiança de Wilson (95%) para taxa de conversão efetiva
  const expectedSuccesses = Math.round(
    evaluations.reduce((acc, e) => acc + e.choice_probability_percent / 100, 0),
  );
  const [wilsonLow, wilsonHigh] = wilsonInterval(expectedSuccesses, n, 0.95);
  const estimatedConversionRange: [number, number] = [
    round2(wilsonLow * 100),
    round2(wilsonHigh * 100),
  ];

  // Curva de Demanda em 5 Níveis de Preço (-20%, -10%, Base, +10%, +20%)
  const multipliers = [0.8, 0.9, 1.0, 1.1, 1.2];
  const rawDemandPoints: SimLabDemandCurvePoint[] = multipliers.map((mult) => {
    const testedPrice = round2(basePrice > 0 ? basePrice * mult : 100 * mult);
    const stepEvals = personas.map((persona, idx) =>
      computePersonaAffordabilityAndMcFaddenUtility(
        persona,
        { ...offer, unitPriceBrl: testedPrice },
        signals[idx] || {
          perceived_value_score: evaluations[idx]?.perceived_value_score ?? 6.5,
          trust_score: evaluations[idx]?.trust_score ?? 6.5,
          ux_friction_score: evaluations[idx]?.ux_friction_score ?? 3.0,
          reservation_price_brl: evaluations[idx]?.reservation_price_brl ?? testedPrice,
          primary_objection: evaluations[idx]?.primary_objection ?? "",
          natural_speech_verbatim: evaluations[idx]?.natural_speech_verbatim ?? "",
        },
      ),
    );
    const avgConv =
      stepEvals.reduce((acc, e) => acc + e.choice_probability_percent, 0) /
      Math.max(1, stepEvals.length);
    const buyersPer100 = round2(avgConv);
    const revenuePer100 = round2(buyersPer100 * testedPrice);

    return {
      price_multiplier: mult,
      tested_price_brl: testedPrice,
      conversion_probability_percent: round2(avgConv),
      expected_buyers_per_100: buyersPer100,
      expected_revenue_per_100_brl: revenuePer100,
    };
  });

  // Identifica Ponto Ótimo de Maximização de Receita (P*)
  let maxRevIdx = 0;
  rawDemandPoints.forEach((pt, idx) => {
    if (pt.expected_revenue_per_100_brl > rawDemandPoints[maxRevIdx].expected_revenue_per_100_brl) {
      maxRevIdx = idx;
    }
  });
  const demandCurvePoints = rawDemandPoints.map((pt, idx) => ({
    ...pt,
    is_optimal: idx === maxRevIdx,
  }));
  const optimalPricePointBrl =
    basePrice > 0
      ? demandCurvePoints[maxRevIdx].tested_price_brl
      : modeReservationPriceBrl;

  // Elasticidade-Preço da Demanda (E_d = %Delta Q / %Delta P entre 0.8P e 1.2P)
  const qLowPrice = rawDemandPoints[0].conversion_probability_percent;
  const qHighPrice = rawDemandPoints[4].conversion_probability_percent;
  const avgQ = Math.max(0.1, (qLowPrice + qHighPrice) / 2);
  // Delta P / Avg P entre 0.8 e 1.2 é 0.4 / 1.0 = 0.4
  const priceElasticityScore = round2(Math.abs((qHighPrice - qLowPrice) / avgQ / 0.4));

  // Índice de Viralidade Social (PersonaForge / OASIS)
  const reactionWeights: Record<SocialFeedReaction, number> = {
    share: 10,
    save: 7.5,
    like: 5,
    skeptical_comment: 2.5,
    ignore: 0,
  };
  const viralityRaw =
    evaluations.reduce((acc, ev) => {
      const r = ev.social_feed_reaction || "ignore";
      return acc + (reactionWeights[r] ?? 0);
    }, 0) / n;
  const socialViralityIndex = round2(clamp(viralityRaw, 0, 10));

  // Preço de Fechamento de Barganha P2P (Concordia Clearing Price)
  const p2pClearingCandidates = evaluations
    .map((e) => Number(e.p2p_walkaway_price_brl || e.reservation_price_brl || 0))
    .filter((v) => v > 0);
  const p2pClearingPriceBrl =
    p2pClearingCandidates.length > 0
      ? computeMedian(p2pClearingCandidates)
      : modeReservationPriceBrl;

  // Cascata Temporal Chronos (Dia 1, Dia 7, Dia 15, Dia 30)
  const chronosTemporalCascade = computeChronosTemporalCascade(
    meanIntentPercent,
    socialViralityIndex,
    rejectionRate,
    basePrice > 0 ? basePrice : modeReservationPriceBrl,
  );

  // Veredito Científico Determinístico
  let scientificVerdict: VerdictStatus = "revisar_com_ajustes";
  if (overallApprovalRate >= 62 && syntheticNps >= 15 && rejectionRate <= 30) {
    scientificVerdict = "aprovado_para_veiculacao";
  } else if (overallApprovalRate < 32 || rejectionRate >= 60 || syntheticNps <= -25) {
    scientificVerdict = "bloqueado_por_alto_risco";
  }

  return {
    synthetic_nps: syntheticNps,
    overall_approval_rate: overallApprovalRate,
    rejection_rate: rejectionRate,
    mean_intent_percent: meanIntentPercent,
    median_intent_percent: medianIntentPercent,
    mode_intent_percent: modeIntentPercent,
    std_dev_intent: stdDevIntent,
    mode_reservation_price_brl: modeReservationPriceBrl,
    optimal_price_point_brl: optimalPricePointBrl,
    estimated_conversion_range: estimatedConversionRange,
    price_elasticity_score: priceElasticityScore,
    demand_curve_points: demandCurvePoints,
    chronos_temporal_cascade: chronosTemporalCascade,
    social_virality_index: socialViralityIndex,
    p2p_clearing_price_brl: p2pClearingPriceBrl,
    scientific_verdict: scientificVerdict,
  };
}

/**
 * Simula a Cascata Temporal TGN (Chronos Engine) em 4 marcos de 30 dias.
 */
export function computeChronosTemporalCascade(
  meanIntentPercent: number,
  socialViralityIndex: number,
  rejectionRate: number,
  effectivePriceBrl: number,
): SimLabChronosCascadeStep[] {
  const unitPrice = Math.max(1, effectivePriceBrl);
  const womFactor = round2(0.85 + (socialViralityIndex / 10) * 0.65);

  const day1Buyers = round2(meanIntentPercent * 0.28);
  const day7Buyers = round2(day1Buyers + meanIntentPercent * 0.38 * womFactor);
  const day15Fatigue = round2(clamp(0.18 + (rejectionRate / 100) * 0.45, 0.1, 0.85));
  const day15Buyers = round2(
    day7Buyers + meanIntentPercent * 0.25 * womFactor * (1 - day15Fatigue * 0.5),
  );
  const day30Fatigue = round2(clamp(day15Fatigue + 0.24, 0.25, 0.95));
  const day30Buyers = round2(
    day15Buyers + meanIntentPercent * 0.16 * womFactor * (1 - day30Fatigue * 0.6),
  );

  return [
    {
      day_milestone: 1,
      phase_title: "Choque de Exposição & Early Adopters",
      adoption_rate_percent: day1Buyers,
      cumulative_buyers_per_100: day1Buyers,
      word_of_mouth_multiplier: 1.0,
      ad_fatigue_index: 0.05,
      dominant_narrative:
        day1Buyers >= 15
          ? "Tração imediata nos perfis de maior aderência e solvência à vista."
          : "Início cauteloso; público analisa preço e credibilidade antes de clicar.",
      expected_cumulative_revenue_brl: round2(day1Buyers * unitPrice),
    },
    {
      day_milestone: 7,
      phase_title: "Cascata Social & Prova Comunitária",
      adoption_rate_percent: round2(day7Buyers - day1Buyers),
      cumulative_buyers_per_100: day7Buyers,
      word_of_mouth_multiplier: womFactor,
      ad_fatigue_index: 0.15,
      dominant_narrative:
        womFactor >= 1.15
          ? "Efeito rede positivo: compartilhamentos e marcações no feed ampliam alcance orgânico."
          : "Crescimento linear dependente de mídia paga; objeções de preço freiam viralização.",
      expected_cumulative_revenue_brl: round2(day7Buyers * unitPrice),
    },
    {
      day_milestone: 15,
      phase_title: "Negociação P2P & Maturação de Funil",
      adoption_rate_percent: round2(day15Buyers - day7Buyers),
      cumulative_buyers_per_100: day15Buyers,
      word_of_mouth_multiplier: round2(womFactor * 0.92),
      ad_fatigue_index: day15Fatigue,
      dominant_narrative:
        "Compradores pragmáticos entram em fase de barganha (desconto no PIX ou parcelamento estendido).",
      expected_cumulative_revenue_brl: round2(day15Buyers * unitPrice),
    },
    {
      day_milestone: 30,
      phase_title: "Saturação de Coorte & Consolidação de ROI",
      adoption_rate_percent: round2(day30Buyers - day15Buyers),
      cumulative_buyers_per_100: day30Buyers,
      word_of_mouth_multiplier: round2(womFactor * 0.8),
      ad_fatigue_index: day30Fatigue,
      dominant_narrative:
        day30Fatigue >= 0.65
          ? "Alta fadiga de criativo detectada; recomenda-se renovação de ângulo visual e oferta."
          : "Demanda residual estável sustentada por recompra e indicações locais.",
      expected_cumulative_revenue_brl: round2(day30Buyers * unitPrice),
    },
  ];
}
