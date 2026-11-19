/**
 * Motor Estatístico de Metas Comerciais e Projeção Preditiva (Multi-Nicho / Especialista Turismo).
 * Executa 100% determinístico no servidor: sazonalidade mensal, pesos por dia útil,
 * velocidade recente EWMA, pipeline ponderado por conversão e bandas P10/P50/P90.
 */

export interface HistoricalMonthPoint {
  competenceMonth: string; // YYYY-MM
  grossCents: number;
  agencyRevenueCents: number;
  salesCount: number;
}

export interface DailySaleObservation {
  date: string; // YYYY-MM-DD
  grossCents: number;
  agencyRevenueCents: number;
  netProfitCents: number;
  count: number;
}

export interface OpenPipelineDealInput {
  id: string;
  title: string;
  stage: string;
  valueCents: number;
  estimatedMarginPct?: number;
  ageDays?: number;
  sellerProfileId?: string | null;
  sellerName?: string | null;
  probabilityOverride?: number | null;
}

export interface StatisticalForecastInput {
  targetYear: number;
  targetMonth: number; // 1-12
  nowDate?: Date;
  dailyObservations: DailySaleObservation[];
  historicalMonths: HistoricalMonthPoint[];
  openPipelineDeals: OpenPipelineDealInput[];
  stageConversionRates?: Record<string, number>;
  averageSalesCycleDays?: number;
  monthlyGrossGoalCents: number;
  monthlyAgencyRevenueGoalCents: number;
}

export interface WeightedPipelineSummary {
  totalOpenGrossCents: number;
  weightedExpectedGrossCents: number;
  weightedExpectedAgencyRevenueCents: number;
  inMonthClosureFactor: number;
  topHighImpactDeals: Array<{
    id: string;
    title: string;
    stage: string;
    valueCents: number;
    winProbabilityPct: number;
    weightedContributionCents: number;
    sellerName: string;
  }>;
}

export interface StatisticalForecastResult {
  daysInMonth: number;
  elapsedDays: number;
  remainingDays: number;
  elapsedBusinessWeightRatio: number;
  realizedGrossCents: number;
  realizedAgencyRevenueCents: number;
  realizedNetProfitCents: number;
  realizedSalesCount: number;
  averageTicketCents: number;
  takeRatePct: number;
  seasonalityFactor: number;
  simpleLinearGrossCents: number;
  ewmaDailyVelocityGrossCents: number;
  ewmaDailyVelocityRevenueCents: number;
  p10GrossCents: number; // Conservador (percentil 10%)
  p50GrossCents: number; // Mediana Esperada
  p90GrossCents: number; // Otimista (percentil 90%)
  p10AgencyRevenueCents: number;
  p50AgencyRevenueCents: number;
  p90AgencyRevenueCents: number;
  goalHitProbabilityPct: number;
  revenueGoalHitProbabilityPct: number;
  requiredDailyGrossCents: number;
  requiredBusinessDailyGrossCents: number;
  requiredDailyRevenueCents: number;
  momGrowthGrossPct: number;
  momGrowthRevenuePct: number;
  pipeline: WeightedPipelineSummary;
  confidenceScore: number; // 0..100 baseado em amplitude amostral
  modelMethodLabel: string;
}

// Priors sazonais de agências de viagens no Brasil (alta em Jan/Jul/Dez + retomada pós-carnaval/black friday)
const TOURISM_SEASONAL_PRIORS: Record<number, number> = {
  1: 1.18,
  2: 0.92,
  3: 0.95,
  4: 0.94,
  5: 0.97,
  6: 1.06,
  7: 1.16,
  8: 0.98,
  9: 0.96,
  10: 1.04,
  11: 1.12,
  12: 1.15,
};

const DEFAULT_STAGE_WIN_RATES: Record<string, number> = {
  new: 0.08,
  novo: 0.08,
  contacted: 0.14,
  contato: 0.14,
  qualified: 0.24,
  qualificacao: 0.24,
  briefing: 0.28,
  proposal: 0.38,
  sent: 0.38,
  proposta: 0.38,
  viewed: 0.48,
  negotiation: 0.65,
  negociacao: 0.65,
  closing: 0.78,
  won: 1.0,
  accepted: 1.0,
  lost: 0,
  rejected: 0,
};

function getDayWeight(date: Date): number {
  const dow = date.getUTCDay(); // 0=Dom, 6=Sab
  if (dow === 0) return 0.35;
  if (dow === 6) return 0.65;
  return 1.15;
}

function normalCdfApprox(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob =
    d *
    t *
    (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z >= 0 ? 1 - prob : prob;
}

export function computeStatisticalGoalForecast(
  input: StatisticalForecastInput,
): StatisticalForecastResult {
  const now = input.nowDate || new Date();
  const daysInMonth = new Date(Date.UTC(input.targetYear, input.targetMonth, 0)).getUTCDate();
  const isCurrentMonth =
    now.getUTCFullYear() === input.targetYear && now.getUTCMonth() + 1 === input.targetMonth;
  const isPastMonth =
    now.getUTCFullYear() > input.targetYear ||
    (now.getUTCFullYear() === input.targetYear && now.getUTCMonth() + 1 > input.targetMonth);

  const elapsedDays = isCurrentMonth ? Math.max(1, now.getUTCDate()) : isPastMonth ? daysInMonth : 0;
  const remainingDays = Math.max(0, daysInMonth - elapsedDays);

  // 1. Consolidar série diária real dentro do mês alvo
  const monthPrefix = `${input.targetYear}-${String(input.targetMonth).padStart(2, "0")}`;
  const dailyGrossByDay = new Array<number>(daysInMonth).fill(0);
  const dailyRevByDay = new Array<number>(daysInMonth).fill(0);

  let realizedGrossCents = 0;
  let realizedAgencyRevenueCents = 0;
  let realizedNetProfitCents = 0;
  let realizedSalesCount = 0;

  for (const obs of input.dailyObservations) {
    if (!obs.date || !obs.date.startsWith(monthPrefix)) continue;
    const dayNum = parseInt(obs.date.slice(8, 10), 10);
    const gross = Math.max(0, Math.round(obs.grossCents || 0));
    const rev = Math.max(0, Math.round(obs.agencyRevenueCents || 0));
    const profit = Math.round(obs.netProfitCents || 0);
    const cnt = Math.max(0, Math.round(obs.count || 0));

    realizedGrossCents += gross;
    realizedAgencyRevenueCents += rev;
    realizedNetProfitCents += profit;
    realizedSalesCount += cnt;

    if (dayNum >= 1 && dayNum <= daysInMonth) {
      dailyGrossByDay[dayNum - 1] += gross;
      dailyRevByDay[dayNum - 1] += rev;
    }
  }

  const averageTicketCents =
    realizedSalesCount > 0 ? Math.round(realizedGrossCents / realizedSalesCount) : 0;
  const takeRatePct =
    realizedGrossCents > 0
      ? Number(((realizedAgencyRevenueCents / realizedGrossCents) * 100).toFixed(2))
      : 10.5;

  // 2. Pesos por dia útil/fim de semana ao longo do mês
  let totalMonthWeight = 0;
  let elapsedWeight = 0;
  let remainingBusinessWeight = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(Date.UTC(input.targetYear, input.targetMonth - 1, d));
    const w = getDayWeight(dt);
    totalMonthWeight += w;
    if (d <= elapsedDays) elapsedWeight += w;
    else remainingBusinessWeight += w;
  }
  const elapsedBusinessWeightRatio =
    totalMonthWeight > 0 ? elapsedWeight / totalMonthWeight : 1;

  // 3. Índice sazonal empírico combinado (shrinkage Bayesiano com prior de turismo)
  const priorSeason = TOURISM_SEASONAL_PRIORS[input.targetMonth] || 1;
  let empiricalSeason = priorSeason;
  const nonZeroHist = input.historicalMonths.filter((m) => m.grossCents > 0);
  if (nonZeroHist.length >= 6) {
    const avgHist =
      nonZeroHist.reduce((sum, m) => sum + m.grossCents, 0) / nonZeroHist.length;
    const sameMonthHist = nonZeroHist.filter(
      (m) => parseInt(m.competenceMonth.slice(5, 7), 10) === input.targetMonth,
    );
    if (sameMonthHist.length > 0 && avgHist > 0) {
      const sameMonthAvg =
        sameMonthHist.reduce((sum, m) => sum + m.grossCents, 0) / sameMonthHist.length;
      const ratio = Math.max(0.65, Math.min(1.45, sameMonthAvg / avgHist));
      // Blend 65% empírico + 35% prior quando há >= 1 ano; senão 40%/60%
      const empWeight = nonZeroHist.length >= 12 ? 0.65 : 0.4;
      empiricalSeason = Number((ratio * empWeight + priorSeason * (1 - empWeight)).toFixed(3));
    }
  }

  // 4. EWMA (Exponentially Weighted Moving Average) dos dias decorridos no mês
  const alpha = 0.25;
  let ewmaDailyGross = 0;
  let ewmaDailyRev = 0;
  const sampleDays = Math.max(1, elapsedDays);
  for (let i = 0; i < sampleDays; i++) {
    const dayGross = dailyGrossByDay[i] || 0;
    const dayRev = dailyRevByDay[i] || 0;
    if (i === 0) {
      ewmaDailyGross = dayGross;
      ewmaDailyRev = dayRev;
    } else {
      ewmaDailyGross = alpha * dayGross + (1 - alpha) * ewmaDailyGross;
      ewmaDailyRev = alpha * dayRev + (1 - alpha) * ewmaDailyRev;
    }
  }

  const avgDailyGross = realizedGrossCents / sampleDays;
  const avgDailyRev = realizedAgencyRevenueCents / sampleDays;
  // Velocidade diária blendada (60% média ponderada pelo calendário, 40% EWMA recente)
  const blendedVelocityGross = Math.round(avgDailyGross * 0.6 + ewmaDailyGross * 0.4);
  const blendedVelocityRev = Math.round(avgDailyRev * 0.6 + ewmaDailyRev * 0.4);
  const simpleLinearGrossCents = Math.round((realizedGrossCents / sampleDays) * daysInMonth);

  // 5. Pipeline Ponderado por Estágio e Probabilidade de Fechamento Dentro do Mês
  const avgCycleDays = Math.max(3, input.averageSalesCycleDays || 12);
  const timeClosureProbability =
    remainingDays === 0
      ? 0
      : Math.min(0.95, 1 - Math.exp(-remainingDays / avgCycleDays));

  let totalOpenGrossCents = 0;
  let weightedPipelineGrossCents = 0;
  let weightedPipelineRevCents = 0;
  const scoredDeals: WeightedPipelineSummary["topHighImpactDeals"] = [];

  for (const deal of input.openPipelineDeals) {
    const val = Math.max(0, Math.round(deal.valueCents || 0));
    if (val <= 0) continue;
    const stageKey = String(deal.stage || "new").toLowerCase().trim();
    if (stageKey === "won" || stageKey === "lost" || stageKey === "cancelled") continue;

    const stageRate =
      deal.probabilityOverride != null
        ? Math.max(0, Math.min(1, deal.probabilityOverride))
        : input.stageConversionRates?.[stageKey] ??
          DEFAULT_STAGE_WIN_RATES[stageKey] ??
          0.2;

    totalOpenGrossCents += val;
    const weighted = Math.round(val * stageRate * timeClosureProbability);
    const estMarginPct = deal.estimatedMarginPct ?? takeRatePct;
    const weightedRev = Math.round((weighted * estMarginPct) / 100);

    weightedPipelineGrossCents += weighted;
    weightedPipelineRevCents += weightedRev;

    scoredDeals.push({
      id: deal.id,
      title: deal.title,
      stage: deal.stage,
      valueCents: val,
      winProbabilityPct: Math.round(stageRate * 100),
      weightedContributionCents: weighted,
      sellerName: deal.sellerName || "Equipe",
    });
  }

  scoredDeals.sort((a, b) => b.weightedContributionCents - a.weightedContributionCents);

  // 6. Projeção P50 combinando Run-Rate Ponderado + Ajuste Sazonal + Pipeline Vivo
  let p50GrossCents = realizedGrossCents;
  let p50AgencyRevenueCents = realizedAgencyRevenueCents;
  let p10GrossCents = realizedGrossCents;
  let p90GrossCents = realizedGrossCents;
  let p10AgencyRevenueCents = realizedAgencyRevenueCents;
  let p90AgencyRevenueCents = realizedAgencyRevenueCents;
  let goalHitProbabilityPct = realizedGrossCents >= input.monthlyGrossGoalCents ? 100 : 0;
  let revenueGoalHitProbabilityPct =
    realizedAgencyRevenueCents >= input.monthlyAgencyRevenueGoalCents ? 100 : 0;

  if (remainingDays > 0) {
    const weightAdjustedRunRemainingGross =
      elapsedWeight > 0
        ? Math.round((realizedGrossCents / elapsedWeight) * remainingBusinessWeight * Math.min(1.2, Math.max(0.85, empiricalSeason / priorSeason || 1)))
        : blendedVelocityGross * remainingDays;

    const ewmaRemainingGross = Math.round(blendedVelocityGross * remainingDays);
    const runRemainingGross = Math.round(weightAdjustedRunRemainingGross * 0.55 + ewmaRemainingGross * 0.45);
    // Mistura conservadora (65% run-rate, 35% pipeline ponderado) para não contar em dobro leads já refletidos no ritmo
    const expectedRemainingGross =
      weightedPipelineGrossCents > 0
        ? Math.round(runRemainingGross * 0.65 + weightedPipelineGrossCents * 0.35 + blendedVelocityGross * remainingDays * 0.15)
        : runRemainingGross;

    const expectedRemainingRev = Math.round((expectedRemainingGross * takeRatePct) / 100);

    // Variância diária empírica para bandas P10 / P90 (distribuição normal truncada em 0)
    const sliceGross = dailyGrossByDay.slice(0, sampleDays);
    const variance =
      sliceGross.length > 1
        ? sliceGross.reduce((acc, v) => acc + Math.pow(v - avgDailyGross, 2), 0) /
          (sliceGross.length - 1)
        : Math.pow(Math.max(avgDailyGross * 0.45, 50000), 2);
    const dailyStdDev = Math.sqrt(Math.max(0, variance));
    const horizonStdDev = Math.round(dailyStdDev * Math.sqrt(remainingDays) * 1.15);

    p50GrossCents = realizedGrossCents + expectedRemainingGross;
    p10GrossCents = Math.max(realizedGrossCents, p50GrossCents - Math.round(1.2816 * horizonStdDev));
    p90GrossCents = Math.max(p50GrossCents, p50GrossCents + Math.round(1.2816 * horizonStdDev));

    p50AgencyRevenueCents = realizedAgencyRevenueCents + expectedRemainingRev;
    const revHorizonStd = Math.round((horizonStdDev * takeRatePct) / 100);
    p10AgencyRevenueCents = Math.max(
      realizedAgencyRevenueCents,
      p50AgencyRevenueCents - Math.round(1.2816 * revHorizonStd),
    );
    p90AgencyRevenueCents = Math.max(
      p50AgencyRevenueCents,
      p50AgencyRevenueCents + Math.round(1.2816 * revHorizonStd),
    );

    if (input.monthlyGrossGoalCents > 0) {
      if (realizedGrossCents >= input.monthlyGrossGoalCents) {
        goalHitProbabilityPct = 100;
      } else if (horizonStdDev > 0) {
        const z = (p50GrossCents - input.monthlyGrossGoalCents) / horizonStdDev;
        goalHitProbabilityPct = Math.round(Math.max(1, Math.min(99, normalCdfApprox(z) * 100)));
      } else {
        goalHitProbabilityPct = p50GrossCents >= input.monthlyGrossGoalCents ? 95 : 10;
      }
    }

    if (input.monthlyAgencyRevenueGoalCents > 0) {
      if (realizedAgencyRevenueCents >= input.monthlyAgencyRevenueGoalCents) {
        revenueGoalHitProbabilityPct = 100;
      } else if (revHorizonStd > 0) {
        const zRev = (p50AgencyRevenueCents - input.monthlyAgencyRevenueGoalCents) / revHorizonStd;
        revenueGoalHitProbabilityPct = Math.round(Math.max(1, Math.min(99, normalCdfApprox(zRev) * 100)));
      } else {
        revenueGoalHitProbabilityPct = p50AgencyRevenueCents >= input.monthlyAgencyRevenueGoalCents ? 95 : 10;
      }
    }
  }

  // 7. Crescimento MoM comparando com mês anterior na série histórica
  const prevMonthDate = new Date(Date.UTC(input.targetYear, input.targetMonth - 2, 1));
  const prevMonthKey = `${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const prevMonthStats = input.historicalMonths.find((m) => m.competenceMonth === prevMonthKey);
  const prevGross = prevMonthStats?.grossCents || 0;
  const prevRev = prevMonthStats?.agencyRevenueCents || 0;

  const momGrowthGrossPct =
    prevGross > 0
      ? Number((((realizedGrossCents - prevGross) / prevGross) * 100).toFixed(1))
      : realizedGrossCents > 0
        ? 100
        : 0;
  const momGrowthRevenuePct =
    prevRev > 0
      ? Number((((realizedAgencyRevenueCents - prevRev) / prevRev) * 100).toFixed(1))
      : realizedAgencyRevenueCents > 0
        ? 100
        : 0;

  const remainingGrossGap = Math.max(0, input.monthlyGrossGoalCents - realizedGrossCents);
  const remainingRevGap = Math.max(0, input.monthlyAgencyRevenueGoalCents - realizedAgencyRevenueCents);
  const requiredDailyGrossCents = remainingDays > 0 ? Math.round(remainingGrossGap / remainingDays) : 0;
  const requiredBusinessDailyGrossCents =
    remainingBusinessWeight > 0 ? Math.round(remainingGrossGap / remainingBusinessWeight) : 0;
  const requiredDailyRevenueCents = remainingDays > 0 ? Math.round(remainingRevGap / remainingDays) : 0;

  const confidenceScore = Math.min(
    96,
    Math.round(25 + Math.min(35, nonZeroHist.length * 3) + Math.min(25, sampleDays * 1.1) + (totalOpenGrossCents > 0 ? 11 : 0)),
  );

  return {
    daysInMonth,
    elapsedDays,
    remainingDays,
    elapsedBusinessWeightRatio: Number(elapsedBusinessWeightRatio.toFixed(3)),
    realizedGrossCents,
    realizedAgencyRevenueCents,
    realizedNetProfitCents,
    realizedSalesCount,
    averageTicketCents,
    takeRatePct,
    seasonalityFactor: empiricalSeason,
    simpleLinearGrossCents,
    ewmaDailyVelocityGrossCents: blendedVelocityGross,
    ewmaDailyVelocityRevenueCents: blendedVelocityRev,
    p10GrossCents,
    p50GrossCents,
    p90GrossCents,
    p10AgencyRevenueCents,
    p50AgencyRevenueCents,
    p90AgencyRevenueCents,
    goalHitProbabilityPct,
    revenueGoalHitProbabilityPct,
    requiredDailyGrossCents,
    requiredBusinessDailyGrossCents,
    requiredDailyRevenueCents,
    momGrowthGrossPct,
    momGrowthRevenuePct,
    pipeline: {
      totalOpenGrossCents,
      weightedExpectedGrossCents: weightedPipelineGrossCents,
      weightedExpectedAgencyRevenueCents: weightedPipelineRevCents,
      inMonthClosureFactor: Number(timeClosureProbability.toFixed(3)),
      topHighImpactDeals: scoredDeals.slice(0, 6),
    },
    confidenceScore,
    modelMethodLabel: "EWMA + Sazonalidade Empírica + Pipeline Ponderado (P10/P50/P90)",
  };
}
