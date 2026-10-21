import { type Proposal } from "@/services/proposals";

export type QuoteTotals = {
  subtotal: number;
  total: number;
  descontoPixPercentual: number;
  totalPix: number;
  parcelasCartao: number;
  valorParcelaCartao: number;
  parcelasBoleto: number;
  valorParcelaBoleto: number;
  passageirosTotal: number;
  valorPorPessoa: number;
  breakdown: {
    voos: number;
    hoteis: number;
    transfers: number;
    passeios: number;
    seguro: number;
    extrasObrigatorios: number;
    extrasOpcionais: number;
  };
};

export function calculateQuoteTotals(state: Partial<Proposal>): QuoteTotals {
  // Safe extraction of arrays
  const flights = state.flights || [];
  const hotels = state.hotels || [];
  const transfers = state.transfers || [];
  const tours = state.tours || [];

  // Custom payments logic (extras) - handling later if added, for now let's sum known arrays
  const customPayments = state.custom_payments || [];

  // Calculate Breakdowns
  const voos = flights.reduce((acc, f) => acc + (Number(f.price) || 0), 0);
  const hoteis = hotels.reduce((acc, h) => acc + (Number(h.price) || 0), 0);
  const transfersTotal = transfers.reduce((acc, t) => acc + (Number(t.price) || 0), 0);
  const passeios = tours.reduce((acc, t) => acc + (Number(t.price) || 0), 0);

  // Custom Payments (extras)
  // Assuming extra items have a 'price' and 'is_optional' flag.
  // If no optional flag exists yet, we assume all are mandatory.
  let extrasObrigatorios = 0;
  let extrasOpcionais = 0;

  for (const cp of customPayments) {
    const val = Number(cp.price) || 0;
    if (cp.is_optional) {
      extrasOpcionais += val;
    } else {
      extrasObrigatorios += val;
    }
  }

  // Seguro Viagem (typed, no more `as any` cast)
  const insurance = state.insurance;
  const insurancePrice = Number(insurance?.price) || 0;

  // The base Subtotal only includes mandatory items
  const lineItemsSubtotal = voos + hoteis + transfersTotal + passeios + extrasObrigatorios + insurancePrice;

  // Support canonical TravelProposalDTO.pricing (in cents) when line-item prices are not individually populated
  const dtoPricing = (state as any).pricing;
  const dtoTotalCents = Number(dtoPricing?.total_price_cents ?? dtoPricing?.total_cents ?? 0);
  const dtoBaseCents = Number(dtoPricing?.base_price_cents ?? 0);
  const dtoTaxesCents =
    Number(dtoPricing?.boarding_tax_cents ?? 0) + Number(dtoPricing?.other_taxes_cents ?? 0);
  const dtoDiscountCents = Number(dtoPricing?.discount_cents ?? 0);

  const hasDtoPricing = dtoTotalCents > 0 || dtoBaseCents > 0;
  const dtoSubtotalReais =
    dtoBaseCents + dtoTaxesCents > 0
      ? (dtoBaseCents + dtoTaxesCents) / 100
      : (dtoTotalCents + dtoDiscountCents) / 100;
  const dtoTotalReais =
    dtoTotalCents > 0
      ? dtoTotalCents / 100
      : Math.max(0, dtoSubtotalReais - dtoDiscountCents / 100);

  const subtotal = lineItemsSubtotal > 0 ? lineItemsSubtotal : hasDtoPricing ? dtoSubtotalReais : 0;

  // Final Total
  const flatDiscount =
    lineItemsSubtotal > 0
      ? Number(state.discount) || 0
      : dtoDiscountCents > 0
        ? dtoDiscountCents / 100
        : Number(state.discount) || 0;
  const total =
    lineItemsSubtotal > 0
      ? Math.max(0, subtotal - flatDiscount)
      : hasDtoPricing
        ? dtoTotalReais
        : 0;

  const installmentOptions: Array<{
    installments_count: number;
    installment_value_cents: number;
    method: string;
  }> = Array.isArray(dtoPricing?.installments_options) ? dtoPricing.installments_options : [];

  const cardOptions = installmentOptions.filter(
    (opt) => opt.method === "credit_card" || opt.method === "card",
  );
  const bestCardOption =
    cardOptions.length > 0
      ? cardOptions.reduce((prev, curr) =>
          curr.installments_count > prev.installments_count ? curr : prev,
        )
      : null;

  const boletoOptions = installmentOptions.filter((opt) => opt.method === "boleto");
  const bestBoletoOption =
    boletoOptions.length > 0
      ? boletoOptions.reduce((prev, curr) =>
          curr.installments_count > prev.installments_count ? curr : prev,
        )
      : null;

  const pixOption = installmentOptions.find((opt) => opt.method === "pix");

  // Pix Discount
  let descontoPixPercentual = Number(state.pix_discount_percent) || 0;
  if (descontoPixPercentual === 0 && subtotal > 0 && dtoDiscountCents > 0) {
    descontoPixPercentual = Math.round(((dtoDiscountCents / 100) / subtotal) * 100);
  } else if (
    descontoPixPercentual === 0 &&
    total > 0 &&
    pixOption &&
    pixOption.installment_value_cents > 0 &&
    pixOption.installment_value_cents / 100 < total
  ) {
    descontoPixPercentual = Math.round(
      ((total - pixOption.installment_value_cents / 100) / total) * 100,
    );
  }

  const pixDiscountAmount = (total * descontoPixPercentual) / 100;
  const totalPix =
    pixOption && pixOption.installment_value_cents > 0 && pixOption.installment_value_cents / 100 < total
      ? pixOption.installment_value_cents / 100
      : Math.max(0, total - pixDiscountAmount);

  // Installments
  const parcelasCartao = bestCardOption
    ? Math.max(1, bestCardOption.installments_count)
    : Math.max(1, Number(state.installments_card) || 10);
  const valorParcelaCartao =
    bestCardOption && bestCardOption.installment_value_cents > 0
      ? bestCardOption.installment_value_cents / 100
      : total / parcelasCartao;

  const parcelasBoleto = bestBoletoOption
    ? Math.max(1, bestBoletoOption.installments_count)
    : Math.max(1, Number(state.installments_boleto) || 1);
  const valorParcelaBoleto =
    bestBoletoOption && bestBoletoOption.installment_value_cents > 0
      ? bestBoletoOption.installment_value_cents / 100
      : total / parcelasBoleto;

  // Passengers
  const paxAdults = Number(state.pax_adults ?? (state as any).adults_count) || 0;
  const paxSeniors = Number(state.pax_seniors) || 0;
  const paxChildren = Number(state.pax_children ?? (state as any).children_count) || 0;
  const paxInfants = Number(state.pax_infants) || 0;
  const passageirosTotal = paxAdults + paxSeniors + paxChildren + paxInfants;

  // Value per person (paying). Usually infants don't pay full, but for general average:
  const payingPax = paxAdults + paxSeniors + paxChildren;
  const valorPorPessoa = payingPax > 0 ? total / payingPax : total;

  return {
    subtotal,
    total,
    descontoPixPercentual,
    totalPix,
    parcelasCartao,
    valorParcelaCartao,
    parcelasBoleto,
    valorParcelaBoleto,
    passageirosTotal,
    valorPorPessoa,
    breakdown: {
      voos,
      hoteis,
      transfers: transfersTotal,
      passeios,
      seguro: insurancePrice,
      extrasObrigatorios,
      extrasOpcionais,
    },
  };
}

export function getAgencyMarkup(agencySettings?: any, channel?: string): number {
  if (channel === "infotravel" && agencySettings?.infotravel_markup_percent !== undefined) {
    return Number(agencySettings.infotravel_markup_percent) || 0;
  }
  return Number(agencySettings?.default_markup_percent) || 0;
}

export function calculateMarkup(baseCost: number, markupPercent: number): number {
  return Math.round(baseCost * (1 + (markupPercent / 100)));
}
