/**
 * pricing-calculator.ts — Calculadora Canônica de Preços e Margens (G47–G49)
 * 
 * Regra: Todo cálculo ocorre estritamente em centavos inteiros (Zero-Float Drift).
 * Nenhum cálculo aritmético de preço pode ser executado no frontend.
 */

import { BasePriceInput, CalculatedPriceQuote, CouponRule } from './types';

/**
 * Calcula margem de lucro e markup com precisão decimal fixa
 */
export function calculateMarginAndMarkup(
  sellingPriceCents: number,
  costCents: number
): { marginPercent: number; markupPercent: number; grossProfitCents: number } {
  if (sellingPriceCents <= 0) {
    return { marginPercent: 0, markupPercent: 0, grossProfitCents: 0 };
  }

  const grossProfitCents = sellingPriceCents - costCents;

  const marginPercent = Math.round((grossProfitCents / sellingPriceCents) * 10000) / 100;
  const markupPercent = costCents > 0
    ? Math.round((grossProfitCents / costCents) * 10000) / 100
    : 100;

  return { marginPercent, markupPercent, grossProfitCents };
}

/**
 * Avalia se um cupom é aplicável a um determinado nicho, arquétipo e valor de pedido
 */
export function validateAndApplyCoupon(
  orderSubtotalCents: number,
  coupon?: CouponRule,
  context?: { nicheId?: string; archetypeId?: string }
): { isValid: boolean; discountCents: number; rejectionReason?: string } {
  if (!coupon) {
    return { isValid: false, discountCents: 0 };
  }

  // 1. Validação de data de expiração
  if (coupon.validUntil && new Date(coupon.validUntil).getTime() < Date.now()) {
    return { isValid: false, discountCents: 0, rejectionReason: 'Cupom expirado.' };
  }

  // 2. Validação de pedido mínimo
  if (coupon.minOrderValueCents && orderSubtotalCents < coupon.minOrderValueCents) {
    return {
      isValid: false,
      discountCents: 0,
      rejectionReason: `Valor mínimo para este cupom é de ${(coupon.minOrderValueCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    };
  }

  // 3. Validação de restrição de nicho
  if (
    coupon.applicableNiches &&
    coupon.applicableNiches.length > 0 &&
    context?.nicheId &&
    !coupon.applicableNiches.includes(context.nicheId as any)
  ) {
    return { isValid: false, discountCents: 0, rejectionReason: 'Cupom não aplicável a este nicho.' };
  }

  // 4. Validação de restrição de arquétipo
  if (
    coupon.applicableArchetypes &&
    coupon.applicableArchetypes.length > 0 &&
    context?.archetypeId &&
    !coupon.applicableArchetypes.includes(context.archetypeId as any)
  ) {
    return { isValid: false, discountCents: 0, rejectionReason: 'Cupom não aplicável a este tipo de oferta.' };
  }

  // 5. Cálculo do desconto em centavos inteiros
  let discountCents = 0;
  if (coupon.type === 'fixed_cents') {
    discountCents = Math.min(orderSubtotalCents, Math.round(coupon.value));
  } else {
    // Porcentagem
    discountCents = Math.round((orderSubtotalCents * coupon.value) / 100);
  }

  // 6. Teto máximo de desconto se configurado
  if (coupon.maxDiscountCents && discountCents > coupon.maxDiscountCents) {
    discountCents = coupon.maxDiscountCents;
  }

  return { isValid: true, discountCents };
}

/**
 * Calcula a cotação consolidada de preço para um produto ou serviço
 */
export function calculateBasePriceQuote(
  input: BasePriceInput,
  coupon?: CouponRule
): CalculatedPriceQuote {
  const listPriceCents = input.listPriceCents;
  let intermediatePriceCents = input.salePriceCents && input.salePriceCents < listPriceCents
    ? input.salePriceCents
    : listPriceCents;

  const isPromotional = intermediatePriceCents < listPriceCents;

  // Aplicação de cupom
  const couponResult = validateAndApplyCoupon(intermediatePriceCents, coupon, {
    nicheId: input.nicheId,
    archetypeId: input.archetypeId,
  });

  const finalPriceCents = Math.max(0, intermediatePriceCents - couponResult.discountCents);
  const totalSavingsCents = Math.max(0, listPriceCents - finalPriceCents);
  const discountPercent = listPriceCents > 0
    ? Math.round((totalSavingsCents / listPriceCents) * 10000) / 100
    : 0;

  // Métricas de rentabilidade se o custo foi fornecido
  let marginPercent: number | undefined;
  let markupPercent: number | undefined;

  if (input.costCents !== undefined) {
    const metrics = calculateMarginAndMarkup(finalPriceCents, input.costCents);
    marginPercent = metrics.marginPercent;
    markupPercent = metrics.markupPercent;
  }

  return {
    listPriceCents,
    finalPriceCents,
    discountCents: totalSavingsCents,
    discountPercent,
    costCents: input.costCents,
    marginPercent,
    markupPercent,
    isPromotional,
    savingsCents: totalSavingsCents,
  };
}
