import type { TravelOfferPricing } from "@/types/corporate-travel";

export interface NormalizedPricingParams {
  netAmountCents: number;
  taxAmountCents?: number;
  supplierFeeCents?: number;
  agencyMarkupPercent?: number;
  agencyFixedFeeCents?: number;
  currency?: string;
}

/**
 * Normaliza o preço final sem dependência de provider, banco ou runtime server.
 * NET + TAXES + SUPPLIER FEE + AGENCY MARKUP + SERVICE FEE = SELLING TOTAL
 */
export function calculateNormalizedPricing(params: NormalizedPricingParams): TravelOfferPricing {
  const net = Math.max(0, params.netAmountCents);
  const taxes = Math.max(0, params.taxAmountCents ?? 0);
  const supplierFee = Math.max(0, params.supplierFeeCents ?? 0);

  const markupPct = Math.max(0, params.agencyMarkupPercent ?? 10);
  const markupAmount = Math.round((net * markupPct) / 100);
  const serviceFee = Math.max(0, params.agencyFixedFeeCents ?? 0);

  return {
    net_amount_cents: net,
    tax_amount_cents: taxes,
    supplier_fee_cents: supplierFee,
    agency_markup_cents: markupAmount,
    service_fee_cents: serviceFee,
    selling_total_cents: net + taxes + supplierFee + markupAmount + serviceFee,
    currency: params.currency || "BRL",
  };
}
