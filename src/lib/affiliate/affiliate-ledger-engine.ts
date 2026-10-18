/**
 * affiliate-ledger-engine.ts
 *
 * Motor Mecânico e Contábil do Ecossistema de Afiliados Waesy (Padrão Méliuz + Phia)
 * Aritmética inteira estrita de centavos, máquina de estados imutável de comissões,
 * escrow/maturação e clawback automático de estornos em caso de pedidos cancelados.
 */

export type AffiliateCommissionStatus =
  | "tracked_pending"
  | "awaiting_escrow"
  | "available"
  | "paid_out"
  | "cancelled_refunded";

export interface CommissionSplitResult {
  totalCommissionCents: number;
  affiliateShareCents: number;
  platformFeeCents: number;
  customerCashbackCents: number;
}

/**
 * Calcula a divisão precisa de comissão (Afiliado + Plataforma Waesy + Cashback do Comprador)
 * operando estritamente em centavos inteiros (Zero Floating Point Imprecision).
 */
export function calculateCommissionSplit({
  orderGrossCents,
  commissionRatePct,
  affiliateSplitPct = 70,
  cashbackSplitPct = 15,
  platformSplitPct = 15,
}: {
  orderGrossCents: number;
  commissionRatePct: number;
  affiliateSplitPct?: number;
  cashbackSplitPct?: number;
  platformSplitPct?: number;
}): CommissionSplitResult {
  const safeGross = Math.max(0, Math.round(orderGrossCents));
  const safeRate = Math.max(0, Number(commissionRatePct) || 0);

  // Comissão bruta total retida na venda
  const totalCommissionCents = Math.round((safeGross * safeRate) / 100);

  if (totalCommissionCents <= 0) {
    return {
      totalCommissionCents: 0,
      affiliateShareCents: 0,
      platformFeeCents: 0,
      customerCashbackCents: 0,
    };
  }

  // Divisão entre os 3 atores
  const affiliateShareCents = Math.round((totalCommissionCents * affiliateSplitPct) / 100);
  const customerCashbackCents = Math.round((totalCommissionCents * cashbackSplitPct) / 100);
  const platformFeeCents = Math.max(
    0,
    totalCommissionCents - affiliateShareCents - customerCashbackCents
  );

  return {
    totalCommissionCents,
    affiliateShareCents,
    platformFeeCents,
    customerCashbackCents,
  };
}

/**
 * Calcula a data exata de maturação/descongelamento do escrow (Padrão Méliuz)
 * considerando prazo do Código de Defesa do Consumidor (7 dias) ou prazo da campanha (ex: 15 a 30 dias).
 */
export function computeCommissionMaturityDate(
  baseDate: Date | string,
  escrowDays: number = 7
): Date {
  const date = new Date(baseDate);
  const safeDays = Math.max(1, Math.round(escrowDays));
  date.setDate(date.getDate() + safeDays);
  return date;
}

/**
 * Regra Méliuz de Estorno / Clawback:
 * Quando um pedido é cancelado ou devolvido, a comissão pendente é anulada imediatamente
 * e debitada da fatura mensal da empresa, impedindo qualquer pagamento indevido.
 */
export function applyClawbackOnOrderCancellation({
  currentCommissionStatus,
  affiliateShareCents,
  totalCommissionCents,
  cancellationReason,
}: {
  currentCommissionStatus: AffiliateCommissionStatus;
  affiliateShareCents: number;
  totalCommissionCents: number;
  cancellationReason?: string;
}): {
  newStatus: AffiliateCommissionStatus;
  clawbackAmountCents: number;
  isEligibleForClawback: boolean;
  reason: string;
} {
  // Apenas comissões que ainda não foram sacadas pelo afiliado podem ser estornadas
  if (currentCommissionStatus === "paid_out") {
    return {
      newStatus: "paid_out",
      clawbackAmountCents: 0,
      isEligibleForClawback: false,
      reason: "Comissão já sacada e liquidada; exige resolução administrativa.",
    };
  }

  if (currentCommissionStatus === "cancelled_refunded") {
    return {
      newStatus: "cancelled_refunded",
      clawbackAmountCents: 0,
      isEligibleForClawback: false,
      reason: "Comissão já estava cancelada anteriormente.",
    };
  }

  return {
    newStatus: "cancelled_refunded",
    clawbackAmountCents: totalCommissionCents,
    isEligibleForClawback: true,
    reason: cancellationReason || "Pedido cancelado/estornado pelo cliente ou lojista.",
  };
}

/**
 * Gera link de afiliação e curadoria estilo Phia (Phoebe Gates):
 * Constrói a URL final de rastreamento com subid determinístico para atribuição híbrida
 * em redes externas (Booking.com, Natue, Amazon, Lomadee).
 */
export function generatePhiaCuratedAffiliateLink({
  baseUrl,
  paramTemplate,
  affiliateHandle,
  affiliateUserId,
  clickNonce,
}: {
  baseUrl: string;
  paramTemplate: string;
  affiliateHandle: string;
  affiliateUserId?: string;
  clickNonce?: string;
}): string {
  const nonce = clickNonce || Math.random().toString(36).substring(2, 8);
  const subid = `w_${affiliateHandle.toLowerCase()}_${nonce}`;

  const resolvedParams = paramTemplate
    .replace("{subid}", subid)
    .replace("{handle}", affiliateHandle.toLowerCase())
    .replace("{userId}", affiliateUserId || "anon");

  const delimiter = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${delimiter}${resolvedParams}`;
}

/**
 * Consolidação e reconciliação da Fatura Mensal B2B da Loja (Merchant Invoice).
 */
export function calculateMonthlyInvoiceTotals(items: Array<{
  totalCommissionCents: number;
  orderGrossCents: number;
  status: AffiliateCommissionStatus;
}>): {
  totalTrackedSalesCents: number;
  totalValidCommissionCents: number;
  totalCancelledCommissionCents: number;
  netOwedByStoreCents: number;
} {
  let totalTrackedSalesCents = 0;
  let totalValidCommissionCents = 0;
  let totalCancelledCommissionCents = 0;

  for (const item of items) {
    if (item.status === "cancelled_refunded") {
      totalCancelledCommissionCents += item.totalCommissionCents;
    } else {
      totalTrackedSalesCents += item.orderGrossCents;
      totalValidCommissionCents += item.totalCommissionCents;
    }
  }

  return {
    totalTrackedSalesCents,
    totalValidCommissionCents,
    totalCancelledCommissionCents,
    netOwedByStoreCents: Math.max(0, totalValidCommissionCents),
  };
}
