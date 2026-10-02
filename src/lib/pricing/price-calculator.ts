/**
 * price-calculator.ts — Dono Único de Preço, Margem, Desconto PIX e Condições Comerciais (R23)
 *
 * Fonte Única da Verdade para:
 * - Preço base, promocional e comparativo (De / Por)
 * - Custo e cálculo de margem / markup
 * - Desconto à vista via PIX
 * - Sinal (deposit) e saldo a prazo
 * - Formatação monetária segura BRL (Zero-Float Drift)
 *
 * Regra B.2: src/lib/ é utilitário puro.
 * Regra R23: Dono único dos campos de precificação.
 */

export interface CommercialConditionsInput {
  basePriceCents: number;
  promotionalPriceCents?: number | null;
  costCents?: number | null;
  pixDiscountPercent?: number | null;
  depositPercent?: number | null;
}

export interface CommercialConditionsQuote {
  originalPriceCents: number;
  sellingPriceCents: number;
  hasPromotion: boolean;
  savingsCents: number;
  savingsPercent: number;
  pixPriceCents: number;
  pixDiscountCents: number;
  pixDiscountPercent: number;
  depositCents: number;
  depositPercent: number;
  balanceCents: number;
  profitCents: number;
  marginPercent: number;
  markupPercent: number;
}

/**
 * Calcula desconto à vista no PIX com arredondamento preciso em centavos.
 * DONO ÚNICO da lógica de desconto PIX (R23).
 */
export function calcDiscountPix(
  basePriceCents: number,
  pixDiscountPercent = 5
): { pixPriceCents: number; discountCents: number; pixDiscountPercent: number } {
  if (basePriceCents <= 0 || pixDiscountPercent <= 0) {
    return {
      pixPriceCents: Math.max(0, basePriceCents),
      discountCents: 0,
      pixDiscountPercent: 0,
    };
  }

  const effectivePercent = Math.min(Math.max(0, pixDiscountPercent), 100);
  const discountCents = Math.round((basePriceCents * effectivePercent) / 100);
  const pixPriceCents = Math.max(0, basePriceCents - discountCents);

  return {
    pixPriceCents,
    discountCents,
    pixDiscountPercent: effectivePercent,
  };
}

/**
 * Calcula margem de lucro e markup sobre o preço de venda e custo em centavos.
 * DONO ÚNICO da lógica de margem (R23).
 */
export function calcMargin(
  priceCents: number,
  costCents = 0
): { marginPercent: number; markupPercent: number; profitCents: number } {
  if (priceCents <= 0) {
    return { marginPercent: 0, markupPercent: 0, profitCents: 0 };
  }

  const profitCents = priceCents - (costCents || 0);
  const marginPercent = Math.round((profitCents / priceCents) * 10000) / 100;
  const markupPercent = (costCents || 0) > 0
    ? Math.round((profitCents / costCents) * 10000) / 100
    : 100;

  return {
    marginPercent,
    markupPercent,
    profitCents,
  };
}

/**
 * Monta o quote completo das condições comerciais consolidadas.
 * Avalia preço De / Por, sinal, saldo restante, PIX e margem.
 */
export function calcCommercialConditions(
  input: CommercialConditionsInput
): CommercialConditionsQuote {
  const originalPriceCents = Math.max(0, input.basePriceCents || 0);
  const promo = input.promotionalPriceCents;
  
  const hasPromotion = Boolean(promo && promo > 0 && promo < originalPriceCents);
  const sellingPriceCents = hasPromotion && promo ? promo : originalPriceCents;
  
  const savingsCents = hasPromotion ? originalPriceCents - sellingPriceCents : 0;
  const savingsPercent = hasPromotion && originalPriceCents > 0
    ? Math.round((savingsCents / originalPriceCents) * 10000) / 100
    : 0;

  // Cálculo de desconto PIX sobre o preço de venda efetivo
  const pixCalc = calcDiscountPix(sellingPriceCents, input.pixDiscountPercent ?? 5);

  // Cálculo de sinal / entrada
  const depPercent = Math.min(Math.max(0, input.depositPercent ?? 0), 100);
  const depositCents = depPercent > 0 ? Math.round((sellingPriceCents * depPercent) / 100) : 0;
  const balanceCents = Math.max(0, sellingPriceCents - depositCents);

  // Cálculo de margem com base no custo informado
  const marginCalc = calcMargin(sellingPriceCents, input.costCents || 0);

  return {
    originalPriceCents,
    sellingPriceCents,
    hasPromotion,
    savingsCents,
    savingsPercent,
    pixPriceCents: pixCalc.pixPriceCents,
    pixDiscountCents: pixCalc.discountCents,
    pixDiscountPercent: pixCalc.pixDiscountPercent,
    depositCents,
    depositPercent: depPercent,
    balanceCents,
    profitCents: marginCalc.profitCents,
    marginPercent: marginCalc.marginPercent,
    markupPercent: marginCalc.markupPercent,
  };
}

/**
 * Formata valor em centavos para moeda Real brasileira com separadores locais.
 */
export function formatCurrencyBRL(cents: number): string {
  return ((cents || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
