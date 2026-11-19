/**
 * proposal-payment-calc.ts — Pure Commercial Payment, PIX Discount, Installment Table
 * & Real Deadline Countdown Calculations for Travel Proposals.
 */

import type {
  ProposalWebAvailabilityConfig,
  ProposalWebCountdownConfig,
  ProposalWebPaymentDisplayConfig,
  ProposalWebTrustBadgesConfig,
} from "./proposal-normalization";

export interface InstallmentOptionSummary {
  count: number;
  installmentCents: number;
  totalCents: number;
  hasInterest: boolean;
}

export interface ComputedCountdownState {
  isActive: boolean;
  isExpired: boolean;
  targetIso: string | null;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  label: string;
}

export interface ResolvedCommercialOffer {
  totalCents: number;
  pixEnabled: boolean;
  pixDiscountPercent: number;
  pixFinalCents: number;
  cardEnabled: boolean;
  maxInstallments: number;
  interestFree: boolean;
  boletoEnabled: boolean;
  boletoDueDays: number | null;
  financingEnabled: boolean;
  financingNotes: string | null;
  showSimulator: boolean;
  installmentTable: InstallmentOptionSummary[];
  countdown: ComputedCountdownState;
  spotsRemaining: number | null;
  spotsLabel: string;
  trustBadges: Array<{ id: string; label: string }>;
}

/** Resolves effective future deadline ISO ONLY when explicitly enabled in countdown config. */
export function computeRealCountdownState(
  countdownConfig: ProposalWebCountdownConfig | null | undefined,
  proposalValidUntil?: string | null,
  nowMs: number = Date.now(),
): ComputedCountdownState {
  if (!countdownConfig?.enabled) {
    return {
      isActive: false,
      isExpired: false,
      targetIso: null,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: "",
    };
  }

  const rawTarget =
    countdownConfig.mode === "custom" && countdownConfig.custom_ends_at
      ? countdownConfig.custom_ends_at
      : proposalValidUntil || countdownConfig.custom_ends_at || null;

  const label = (countdownConfig.label || "").trim() || "Condição válida por";
  if (!rawTarget) {
    return {
      isActive: false,
      isExpired: false,
      targetIso: null,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label,
    };
  }

  const parsed = Date.parse(rawTarget);
  if (!Number.isFinite(parsed)) {
    return {
      isActive: false,
      isExpired: false,
      targetIso: null,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label,
    };
  }

  const diffMs = parsed - nowMs;
  if (diffMs <= 0) {
    return {
      isActive: false,
      isExpired: true,
      targetIso: new Date(parsed).toISOString(),
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label,
    };
  }

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return {
    isActive: true,
    isExpired: false,
    targetIso: new Date(parsed).toISOString(),
    days,
    hours,
    minutes,
    seconds,
    label,
  };
}

export function buildInstallmentTable(
  totalCents: number,
  maxInstallments: number,
  interestFree: boolean,
  explicitOptions: Array<{
    installments_count: number;
    installment_value_cents: number;
    method?: string;
    has_interest?: boolean;
  }> = [],
): InstallmentOptionSummary[] {
  const safeTotal = Math.max(0, Math.round(totalCents));
  const safeMax = Math.max(1, Math.min(24, Math.round(maxInstallments || 1)));
  if (safeTotal <= 0) return [];

  const cardExplicitByCount = new Map<number, { valueCents: number; hasInterest: boolean }>();
  for (const opt of explicitOptions) {
    if (opt.method && opt.method !== "credit_card" && opt.method !== "card" && opt.method !== "other") {
      continue;
    }
    if (opt.installments_count >= 1 && opt.installments_count <= 24 && opt.installment_value_cents > 0) {
      cardExplicitByCount.set(opt.installments_count, {
        valueCents: Math.round(opt.installment_value_cents),
        hasInterest: opt.has_interest === true,
      });
    }
  }

  const table: InstallmentOptionSummary[] = [];
  for (let count = 1; count <= safeMax; count++) {
    const matched = cardExplicitByCount.get(count);
    if (matched) {
      table.push({
        count,
        installmentCents: matched.valueCents,
        totalCents: matched.valueCents * count,
        hasInterest: matched.hasInterest,
      });
      continue;
    }

    const installmentCents = Math.round(safeTotal / count);
    table.push({
      count,
      installmentCents,
      totalCents: safeTotal,
      hasInterest: !interestFree && count > 1,
    });
  }
  return table;
}

export function resolveProposalCommercialOffer(params: {
  totalCents: number;
  discountCents?: number;
  pricingInstallments?: Array<{
    installments_count: number;
    installment_value_cents: number;
    method?: string;
    has_interest?: boolean;
  }>;
  validUntil?: string | null;
  countdownConfig?: ProposalWebCountdownConfig | null;
  availabilityConfig?: ProposalWebAvailabilityConfig | null;
  paymentDisplayConfig?: ProposalWebPaymentDisplayConfig | null;
  trustBadgesConfig?: ProposalWebTrustBadgesConfig | null;
  nowMs?: number;
}): ResolvedCommercialOffer {
  const safeTotal = Math.max(0, Math.round(params.totalCents || 0));
  const payCfg = params.paymentDisplayConfig || {};
  const pricingOpts = Array.isArray(params.pricingInstallments) ? params.pricingInstallments : [];

  const pixOpt = pricingOpts.find((o) => o.method === "pix");
  const cardOpts = pricingOpts.filter((o) => o.method === "credit_card" || o.method === "card");
  const boletoOpt = pricingOpts.find((o) => o.method === "boleto");

  const inferredMaxCard = cardOpts.reduce((acc, o) => Math.max(acc, o.installments_count || 1), 10);
  const maxInstallments = Math.max(
    1,
    Math.min(24, Number(payCfg.max_installments || inferredMaxCard || 10)),
  );
  const interestFree =
    typeof payCfg.interest_free === "boolean"
      ? payCfg.interest_free
      : cardOpts.length > 0
        ? cardOpts.every((o) => o.has_interest !== true)
        : true;

  let pixDiscountPercent = Number(payCfg.pix_discount_percent ?? 0);
  if (!Number.isFinite(pixDiscountPercent) || pixDiscountPercent < 0) pixDiscountPercent = 0;
  if (pixDiscountPercent > 50) pixDiscountPercent = 50;
  if (pixDiscountPercent === 0 && pixOpt?.installment_value_cents && safeTotal > 0 && pixOpt.installment_value_cents < safeTotal) {
    pixDiscountPercent = Math.round(((safeTotal - pixOpt.installment_value_cents) / safeTotal) * 100);
  } else if (pixDiscountPercent === 0 && (params.discountCents || 0) > 0 && safeTotal > 0) {
    const gross = safeTotal + (params.discountCents || 0);
    pixDiscountPercent = Math.round(((params.discountCents || 0) / gross) * 100);
  }

  const pixEnabled = payCfg.show_pix !== false;
  const pixFinalCents =
    pixEnabled && pixDiscountPercent > 0 && safeTotal > 0
      ? Math.round(safeTotal * (1 - pixDiscountPercent / 100))
      : safeTotal;

  const cardEnabled = payCfg.show_card !== false;
  const boletoEnabled = typeof payCfg.show_boleto === "boolean" ? payCfg.show_boleto : Boolean(boletoOpt);
  const financingEnabled = Boolean(payCfg.show_financing);
  const showSimulator = payCfg.show_installment_simulator !== false && cardEnabled && safeTotal > 0;

  const spotsEnabled = Boolean(params.availabilityConfig?.enabled);
  const rawSpots = Number(params.availabilityConfig?.spots_remaining);
  const spotsRemaining =
    spotsEnabled && Number.isFinite(rawSpots) && rawSpots > 0 ? Math.round(rawSpots) : null;

  const trustCfg = params.trustBadgesConfig || {};
  const trustBadges: Array<{ id: string; label: string }> = [];
  if (trustCfg.agency_verified) trustBadges.push({ id: "agency_verified", label: "Agência Verificada" });
  if (trustCfg.cadastur_badge) trustBadges.push({ id: "cadastur_badge", label: "Registro Cadastur Ativo" });
  if (trustCfg.free_rebooking) trustBadges.push({ id: "free_rebooking", label: "Assistência em Remarcações" });
  if (trustCfg.support_24h) trustBadges.push({ id: "support_24h", label: "Suporte 24h Durante a Viagem" });
  if (trustCfg.secure_payment) trustBadges.push({ id: "secure_payment", label: "Pagamento Auditado pela Agência" });
  if (Array.isArray(trustCfg.custom_items)) {
    trustCfg.custom_items.forEach((txt, idx) => {
      const clean = String(txt || "").trim();
      if (clean) trustBadges.push({ id: `custom-${idx}`, label: clean });
    });
  }

  return {
    totalCents: safeTotal,
    pixEnabled,
    pixDiscountPercent,
    pixFinalCents,
    cardEnabled,
    maxInstallments,
    interestFree,
    boletoEnabled,
    boletoDueDays:
      typeof payCfg.boleto_due_days === "number" && payCfg.boleto_due_days > 0
        ? Math.round(payCfg.boleto_due_days)
        : null,
    financingEnabled,
    financingNotes: payCfg.financing_notes?.trim() || null,
    showSimulator,
    installmentTable: buildInstallmentTable(safeTotal, maxInstallments, interestFree, pricingOpts),
    countdown: computeRealCountdownState(params.countdownConfig, params.validUntil, params.nowMs),
    spotsRemaining,
    spotsLabel:
      (params.availabilityConfig?.label || "").trim() ||
      (spotsRemaining === 1 ? "Última 1 vaga nesta tarifa" : `Restam ${spotsRemaining} vagas nesta tarifa`),
    trustBadges,
  };
}
