/**
 * subscription-lifecycle.ts — Motor Canônico de Planos, Clubes e Assinaturas (G50)
 * 
 * Regra: Aplicável ao arquétipo A06 (Assinatura / Plano / Clube).
 * Calcula recorrências, trials, datas de vencimento e rescisão contratual.
 */

import { SubscriptionPlanInput, CalculatedSubscriptionQuote, BillingCycle } from './types';

const MONTHS_PER_CYCLE: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

/**
 * Calcula a cotação transparente de um plano de assinatura ou clube
 */
export function calculateSubscriptionQuote(
  input: SubscriptionPlanInput,
  monthlyReferencePriceCents?: number
): CalculatedSubscriptionQuote {
  const {
    cycle,
    baseCyclePriceCents,
    trialDays = 0,
    setupFeeCents = 0,
  } = input;

  const cycleMonths = MONTHS_PER_CYCLE[cycle];
  const equivalentMonthlyPriceCents = Math.round(baseCyclePriceCents / cycleMonths);

  // Calcula desconto em relação ao plano mensal avulso
  const referenceMonthly = monthlyReferencePriceCents || equivalentMonthlyPriceCents;
  const expectedCycleTotalAtMonthlyRate = referenceMonthly * cycleMonths;
  const effectiveDiscountPercentVsMonthly = expectedCycleTotalAtMonthlyRate > 0
    ? Math.max(0, Math.round(((expectedCycleTotalAtMonthlyRate - baseCyclePriceCents) / expectedCycleTotalAtMonthlyRate) * 10000) / 100)
    : 0;

  // Cálculo da primeira cobrança (se tem trial, a primeira cobrança é apenas o setup fee, ou 0)
  const firstChargeTotalCents = trialDays > 0 ? setupFeeCents : (baseCyclePriceCents + setupFeeCents);

  // Projeta a próxima data de cobrança
  const startDate = new Date();
  if (trialDays > 0) {
    startDate.setDate(startDate.getDate() + trialDays);
  } else {
    startDate.setMonth(startDate.getMonth() + cycleMonths);
  }

  return {
    cycle,
    cyclePriceCents: baseCyclePriceCents,
    setupFeeCents,
    firstChargeTotalCents,
    trialDays,
    nextBillingDate: startDate.toISOString(),
    equivalentMonthlyPriceCents,
    effectiveDiscountPercentVsMonthly,
  };
}

/**
 * Calcula a multa rescisória justa para cancelamento antecipado dentro do período de carência (G50)
 */
export function calculateEarlyCancellationFee(
  cyclePriceCents: number,
  cycle: BillingCycle,
  monthsRemainingInLockIn: number,
  penaltyPercent = 10 // Padrão CDC razoável: 10% do valor restante
): { feeCents: number; remainingContractValueCents: number } {
  if (monthsRemainingInLockIn <= 0) {
    return { feeCents: 0, remainingContractValueCents: 0 };
  }

  const cycleMonths = MONTHS_PER_CYCLE[cycle];
  const monthlyRateCents = cyclePriceCents / cycleMonths;
  const remainingContractValueCents = Math.round(monthlyRateCents * monthsRemainingInLockIn);

  const feeCents = Math.round((remainingContractValueCents * penaltyPercent) / 100);

  return { feeCents, remainingContractValueCents };
}
