/**
 * types.ts — Motor Canônico de Preços, Promoções e Recorrência (G47–G54)
 * 
 * Regra G54: Nenhum preço é calculado na interface.
 * Todos os valores trafegam e são calculados em centavos inteiros (Zero-Float Drift).
 */

import { z } from 'zod';
import { CanonicalArchetypeId, NicheId } from '../niche-packages/types';

export type BillingCycle = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export interface BasePriceInput {
  archetypeId: CanonicalArchetypeId;
  nicheId: NicheId;
  listPriceCents: number;
  salePriceCents?: number;
  compareAtPriceCents?: number;
  costCents?: number;
}

export interface CalculatedPriceQuote {
  listPriceCents: number;
  finalPriceCents: number;
  discountCents: number;
  discountPercent: number;
  costCents?: number;
  marginPercent?: number;
  markupPercent?: number;
  isPromotional: boolean;
  savingsCents: number;
}

export interface CouponRule {
  code: string;
  type: 'fixed_cents' | 'percentage';
  value: number; // centavos se fixed, porcentagem (ex: 15 para 15%) se percentage
  minOrderValueCents?: number;
  maxDiscountCents?: number;
  validUntil?: string; // ISO 8601
  maxUsesPerCustomer?: number;
  applicableNiches?: NicheId[];
  applicableArchetypes?: CanonicalArchetypeId[];
}

export interface RentalPriceInput {
  baseDailyRateCents: number;
  daysCount: number;
  cleaningFeeCents?: number;
  securityDepositCents?: number; // Caução retida temporariamente
  insuranceDailyRateCents?: number;
  selectedAddonsCents?: number;
  discountCoupon?: CouponRule;
}

export interface CalculatedRentalQuote {
  daysCount: number;
  dailyRateCents: number;
  subtotalDailyCents: number;
  cleaningFeeCents: number;
  insuranceTotalCents: number;
  addonsTotalCents: number;
  discountCents: number;
  grossTotalCents: number;
  finalPayableCents: number;
  securityDepositRefundableCents: number;
}

export interface SubscriptionPlanInput {
  cycle: BillingCycle;
  baseCyclePriceCents: number;
  trialDays?: number;
  setupFeeCents?: number;
  lockInMonths?: number;
  earlyCancellationPenaltyPercent?: number;
}

export interface CalculatedSubscriptionQuote {
  cycle: BillingCycle;
  cyclePriceCents: number;
  setupFeeCents: number;
  firstChargeTotalCents: number;
  trialDays: number;
  nextBillingDate: string;
  equivalentMonthlyPriceCents: number;
  effectiveDiscountPercentVsMonthly: number;
}

// ── ZOD SCHEMAS PARA O MOTOR DE PREÇO (G47–G54) ──

export const basePriceInputSchema = z.object({
  archetypeId: z.string(),
  nicheId: z.string(),
  listPriceCents: z.number().int().nonnegative(),
  salePriceCents: z.number().int().nonnegative().optional(),
  compareAtPriceCents: z.number().int().nonnegative().optional(),
  costCents: z.number().int().nonnegative().optional(),
});

export const couponRuleSchema = z.object({
  code: z.string().min(2).max(30),
  type: z.enum(['fixed_cents', 'percentage']),
  value: z.number().positive(),
  minOrderValueCents: z.number().int().nonnegative().optional(),
  maxDiscountCents: z.number().int().nonnegative().optional(),
  validUntil: z.string().datetime().optional(),
  maxUsesPerCustomer: z.number().int().positive().optional(),
  applicableNiches: z.array(z.string()).optional(),
  applicableArchetypes: z.array(z.string()).optional(),
});

export const rentalPriceInputSchema = z.object({
  baseDailyRateCents: z.number().int().positive(),
  daysCount: z.number().int().positive(),
  cleaningFeeCents: z.number().int().nonnegative().optional(),
  securityDepositCents: z.number().int().nonnegative().optional(),
  insuranceDailyRateCents: z.number().int().nonnegative().optional(),
  selectedAddonsCents: z.number().int().nonnegative().optional(),
  discountCoupon: couponRuleSchema.optional(),
});

export const subscriptionPlanInputSchema = z.object({
  cycle: z.enum(['monthly', 'quarterly', 'semiannual', 'annual']),
  baseCyclePriceCents: z.number().int().positive(),
  trialDays: z.number().int().nonnegative().optional(),
  setupFeeCents: z.number().int().nonnegative().optional(),
  lockInMonths: z.number().int().nonnegative().optional(),
  earlyCancellationPenaltyPercent: z.number().nonnegative().max(100).optional(),
});
