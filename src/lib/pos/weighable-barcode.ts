export interface WeighableEan13Result {
  isWeighable: true;
  productCode: string;
  weightKg: number;
  raw: string;
}

/**
 * Decodifica código de barras EAN-13 padrão balança brasileira (prefixo "2").
 * Formato 2PPPPWWWWWCC: dígitos 2..7 = código do produto, 8..12 = peso em gramas.
 */
export function parseWeighableEan13(code: string): WeighableEan13Result | null {
  const trimmed = code.trim();
  if (!/^2\d{12}$/.test(trimmed)) return null;

  const productCode = trimmed.substring(1, 7);
  const grams = Number.parseInt(trimmed.substring(7, 12), 10);
  if (!Number.isFinite(grams) || grams <= 0) return null;

  return {
    isWeighable: true,
    productCode,
    weightKg: Number((grams / 1000).toFixed(3)),
    raw: trimmed,
  };
}

export function calcWeightedItemPriceCents(input: {
  pricePerKgCents: number;
  weightKg: number;
}): number {
  const unitCents = Math.max(0, Math.round(input.pricePerKgCents || 0));
  const weight = Math.max(0, Number(input.weightKg) || 0);
  if (unitCents === 0 || weight <= 0) return 0;
  return Math.max(1, Math.round(unitCents * weight));
}

export interface WeighableSplitBillResult {
  subtotalCents: number;
  discountCents: number;
  couvertTotalCents: number;
  serviceFeeCents: number;
  grandTotalCents: number;
  perPersonCents: number;
  shares: number[];
}

/**
 * Divide conta de mesa/comanda por pessoa em centavos exatos,
 * alocando os centavos de arredondamento na primeira cota.
 */
export function splitBillCents(input: {
  totalCents: number;
  peopleCount: number;
  tipPercent?: number;
  discountCents?: number;
  couvertPerPersonCents?: number;
}): WeighableSplitBillResult {
  const subtotalCents = Math.max(0, Math.round(input.totalCents || 0));
  const people = Math.max(1, Math.round(input.peopleCount || 1));
  const discountCents = Math.min(
    subtotalCents,
    Math.max(0, Math.round(input.discountCents || 0))
  );
  const netItemsCents = subtotalCents - discountCents;
  const couvertTotalCents =
    Math.max(0, Math.round(input.couvertPerPersonCents || 0)) * people;
  const tipPct = Math.max(0, Number(input.tipPercent) || 0);
  const serviceFeeCents = Math.round((netItemsCents * tipPct) / 100);
  const grandTotalCents = netItemsCents + couvertTotalCents + serviceFeeCents;

  const baseShare = Math.floor(grandTotalCents / people);
  const remainder = grandTotalCents - baseShare * people;
  const shares = Array.from({ length: people }, (_, idx) =>
    idx === 0 ? baseShare + remainder : baseShare
  );

  return {
    subtotalCents,
    discountCents,
    couvertTotalCents,
    serviceFeeCents,
    grandTotalCents,
    perPersonCents: shares[0] ?? 0,
    shares,
  };
}
