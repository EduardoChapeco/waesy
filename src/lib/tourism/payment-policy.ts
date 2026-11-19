/**
 * SSOT de Política de Pagamento & Parcelamento de Turismo (Fornecedor -> Cotação -> Proposta -> PDF -> Web -> Checkout/Aceite)
 */

export type CanonicalPaymentMethod =
  | "pix"
  | "credit_card"
  | "boleto"
  | "financiamento_bancario"
  | "faturado_agencia";

export interface InstallmentOptionDTO {
  installments_count: number;
  installment_value_cents: number;
  method: string;
  has_interest?: boolean;
}

export interface SupplierPaymentPolicy {
  maxCardInstallments: number;
  maxBoletoInstallments: number;
  cardInterestFree: boolean;
  boletoRequiresDownpayment: boolean;
  boletoDownpaymentPct: number;
  pixDiscountPct: number;
  allowedPaymentMethods: string[];
  paymentTermsTemplate?: string | null;
}

export const MAX_SUPPORTED_INSTALLMENTS = 36;

export function clampInstallments(value: unknown, fallback = 12): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(MAX_SUPPORTED_INSTALLMENTS, Math.max(1, n));
}

export function normalizeSupplierPaymentPolicy(raw: any): SupplierPaymentPolicy {
  const maxCard = clampInstallments(
    raw?.max_card_installments ?? raw?.maxCardInstallments ?? 12,
    12,
  );
  const maxBoleto = clampInstallments(
    raw?.max_boleto_installments ?? raw?.maxBoletoInstallments ?? 12,
    12,
  );
  const allowedMethods = Array.isArray(raw?.allowed_payment_methods ?? raw?.allowedPaymentMethods)
    ? (raw.allowed_payment_methods ?? raw.allowedPaymentMethods).filter(
        (m: unknown) => typeof m === "string" && m.trim().length > 0,
      )
    : ["pix", "credit_card", "boleto"];

  return {
    maxCardInstallments: maxCard,
    maxBoletoInstallments: maxBoleto,
    cardInterestFree:
      raw?.card_interest_free !== undefined
        ? Boolean(raw.card_interest_free)
        : raw?.cardInterestFree !== undefined
          ? Boolean(raw.cardInterestFree)
          : true,
    boletoRequiresDownpayment: Boolean(
      raw?.boleto_requires_downpayment ?? raw?.boletoRequiresDownpayment ?? false,
    ),
    boletoDownpaymentPct: Math.min(
      100,
      Math.max(0, Number(raw?.boleto_downpayment_pct ?? raw?.boletoDownpaymentPct ?? 0) || 0),
    ),
    pixDiscountPct: Math.min(
      100,
      Math.max(0, Number(raw?.pix_discount_pct ?? raw?.pixDiscountPct ?? 0) || 0),
    ),
    allowedPaymentMethods:
      allowedMethods.length > 0 ? allowedMethods : ["pix", "credit_card", "boleto"],
    paymentTermsTemplate:
      typeof (raw?.payment_terms_template ?? raw?.paymentTermsTemplate) === "string"
        ? String(raw?.payment_terms_template ?? raw?.paymentTermsTemplate).trim() || null
        : null,
  };
}

/**
 * Gera a lista canônica de `installments_options` sincronizada com a política do fornecedor/proposta.
 */
export function buildInstallmentOptionsFromPolicy(
  totalPriceCents: number,
  policy: SupplierPaymentPolicy,
): InstallmentOptionDTO[] {
  const safeTotal = Math.max(0, Math.round(Number(totalPriceCents) || 0));
  const allowed = new Set(policy.allowedPaymentMethods);
  const options: InstallmentOptionDTO[] = [];

  if (allowed.has("pix") || allowed.size === 0) {
    const pixTotal = Math.round(safeTotal * (1 - policy.pixDiscountPct / 100));
    options.push({
      installments_count: 1,
      installment_value_cents: pixTotal,
      method: "pix",
      has_interest: false,
    });
  }

  if (allowed.has("credit_card") || allowed.has("card")) {
    const count = clampInstallments(policy.maxCardInstallments, 12);
    options.push({
      installments_count: count,
      installment_value_cents: count > 0 ? Math.round(safeTotal / count) : safeTotal,
      method: "credit_card",
      has_interest: !policy.cardInterestFree,
    });
  }

  if (allowed.has("boleto")) {
    const count = clampInstallments(policy.maxBoletoInstallments, 12);
    const remainingAfterDownpayment = policy.boletoRequiresDownpayment
      ? safeTotal * (1 - policy.boletoDownpaymentPct / 100)
      : safeTotal;
    const remainingInstallments =
      policy.boletoRequiresDownpayment && count > 1 ? count - 1 : count;
    options.push({
      installments_count: count,
      installment_value_cents:
        remainingInstallments > 0
          ? Math.round(remainingAfterDownpayment / remainingInstallments)
          : safeTotal,
      method: "boleto",
      has_interest: false,
    });
  }

  return options;
}

/**
 * Extrai o maior número de parcelas permitido pela proposta (até 36x, sem teto artificial em 12x).
 */
export function resolveMaxInstallmentsFromOptions(
  installmentOptions: unknown,
  fallback = 12,
): { maxInstallments: number; maxCardInstallments: number; maxBoletoInstallments: number; cardInterestFree: boolean } {
  const list: InstallmentOptionDTO[] = Array.isArray(installmentOptions)
    ? installmentOptions.filter((o: any) => o && typeof o === "object")
    : [];

  let maxCard = 0;
  let maxBoleto = 0;
  let cardInterestFree = true;

  for (const opt of list) {
    const count = clampInstallments(opt.installments_count, 1);
    const method = String(opt.method || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (
      method === "credit_card" ||
      method === "card" ||
      method.includes("cartao") ||
      method.includes("credito") ||
      method.includes("credit")
    ) {
      if (count >= maxCard) {
        maxCard = count;
        cardInterestFree = !opt.has_interest;
      }
    } else if (
      method === "boleto" ||
      method === "financiamento_bancario" ||
      method.includes("boleto") ||
      method.includes("carne") ||
      method.includes("financiamento")
    ) {
      if (count > maxBoleto) {
        maxBoleto = count;
      }
    }
  }

  const overallMax = Math.max(maxCard, maxBoleto, 0);
  return {
    maxInstallments: overallMax > 0 ? overallMax : clampInstallments(fallback, 12),
    maxCardInstallments: maxCard > 0 ? maxCard : clampInstallments(fallback, 12),
    maxBoletoInstallments: maxBoleto > 0 ? maxBoleto : 1,
    cardInterestFree,
  };
}

export function buildPaymentTermsSummaryFromPolicy(
  totalPriceCents: number,
  policy: SupplierPaymentPolicy,
  formatMoneyFn: (cents: number) => string,
): string {
  if (policy.paymentTermsTemplate) {
    return policy.paymentTermsTemplate;
  }
  const parts: string[] = [];
  const allowed = new Set(policy.allowedPaymentMethods);
  if (allowed.has("pix")) {
    const pixTotal = Math.round(totalPriceCents * (1 - policy.pixDiscountPct / 100));
    parts.push(
      policy.pixDiscountPct > 0
        ? `Pix à vista (${policy.pixDiscountPct}% OFF): ${formatMoneyFn(pixTotal)}`
        : `Pix à vista: ${formatMoneyFn(pixTotal)}`,
    );
  }
  if (allowed.has("credit_card") || allowed.has("card")) {
    const count = clampInstallments(policy.maxCardInstallments, 12);
    const perInstallment = Math.round(totalPriceCents / count);
    parts.push(
      `Cartão em até ${count}x de ${formatMoneyFn(perInstallment)} ${policy.cardInterestFree ? "sem juros" : "com encargos"}`,
    );
  }
  if (allowed.has("boleto")) {
    const count = clampInstallments(policy.maxBoletoInstallments, 12);
    if (policy.boletoRequiresDownpayment && policy.boletoDownpaymentPct > 0) {
      const downCents = Math.round(totalPriceCents * (policy.boletoDownpaymentPct / 100));
      const remCount = Math.max(1, count - 1);
      const remCents = Math.round((totalPriceCents - downCents) / remCount);
      parts.push(
        `Boleto: entrada ${policy.boletoDownpaymentPct}% (${formatMoneyFn(downCents)}) + ${remCount}x de ${formatMoneyFn(remCents)}`,
      );
    } else {
      parts.push(`Boleto em até ${count}x de ${formatMoneyFn(Math.round(totalPriceCents / count))}`);
    }
  }
  return parts.join(" • ");
}
