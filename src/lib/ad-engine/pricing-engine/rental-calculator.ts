/**
 * rental-calculator.ts — Motor de Cálculo para Locação por Período e Diárias (G53)
 * 
 * Regra: Aplicável aos arquétipos A10 (Locação de curta duração) em Imóveis, Veículos e Equipamentos.
 */

import { RentalPriceInput, CalculatedRentalQuote } from './types';
import { validateAndApplyCoupon } from './pricing-calculator';

/**
 * Calcula a cotação transparente de locação por período
 */
export function calculateRentalQuote(input: RentalPriceInput): CalculatedRentalQuote {
  const {
    baseDailyRateCents,
    daysCount,
    cleaningFeeCents = 0,
    securityDepositCents = 0,
    insuranceDailyRateCents = 0,
    selectedAddonsCents = 0,
    discountCoupon,
  } = input;

  if (daysCount <= 0) {
    throw new Error('A quantidade de diárias para locação deve ser no mínimo 1.');
  }

  // 1. Subtotal de diárias com desconto de permanência estendida
  let dailyRateCents = baseDailyRateCents;

  // Desconto automático progressivo: 7+ diárias = 5% off, 28+ diárias = 15% off
  if (daysCount >= 28) {
    dailyRateCents = Math.round(baseDailyRateCents * 0.85);
  } else if (daysCount >= 7) {
    dailyRateCents = Math.round(baseDailyRateCents * 0.95);
  }

  const subtotalDailyCents = dailyRateCents * daysCount;
  const insuranceTotalCents = insuranceDailyRateCents * daysCount;

  const grossTotalBeforeDiscount =
    subtotalDailyCents + cleaningFeeCents + insuranceTotalCents + selectedAddonsCents;

  // 2. Aplicação de cupom de desconto se presente
  const couponResult = validateAndApplyCoupon(grossTotalBeforeDiscount, discountCoupon, {
    archetypeId: 'A10',
  });

  const discountCents = couponResult.discountCents;
  const finalPayableCents = Math.max(0, grossTotalBeforeDiscount - discountCents);

  return {
    daysCount,
    dailyRateCents,
    subtotalDailyCents,
    cleaningFeeCents,
    insuranceTotalCents,
    addonsTotalCents: selectedAddonsCents,
    discountCents,
    grossTotalCents: grossTotalBeforeDiscount,
    finalPayableCents,
    securityDepositRefundableCents: securityDepositCents,
  };
}
