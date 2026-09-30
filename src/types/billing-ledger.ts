import { z } from "zod";

/**
 * Tipos de Taxas e Lançamentos no Razão Financeiro do Waesy:
 * - SUBSCRIPTION_MONTHLY: Assinatura mensal do modo Waesy Max (ex: R$ 99,00)
 * - ORDER_MICROFEE_RANDOM: Microtaxa transacional por pedido concluído (R$ 0,99)
 * - EXTRA_USAGE: Consumo adicional de quotas e chamadas de infraestrutura
 */
export type BillingFeeType =
  | "SUBSCRIPTION_MONTHLY"
  | "ORDER_MICROFEE_RANDOM"
  | "EXTRA_USAGE";

export const BillingFeeTypeEnum = z.enum([
  "SUBSCRIPTION_MONTHLY",
  "ORDER_MICROFEE_RANDOM",
  "EXTRA_USAGE",
]);

export interface BillingLineItemDTO {
  id: string;
  invoiceId?: string | null;
  storeId: string;
  originEventId: string; // Ex: ID do pedido ou ID do ciclo
  description: string;
  amountCents: number;
  feeType: BillingFeeType;
  createdAt: string;
}

export interface BillingInvoiceDTO {
  id: string;
  storeId: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  totalCents: number;
  status: "OPEN" | "PAID" | "VOID" | "OVERDUE";
  createdAt: string;
  updatedAt: string;
  lineItems?: BillingLineItemDTO[];
}

export interface BillingStatementDTO {
  storeId: string;
  storeName: string;
  invoice?: (BillingInvoiceDTO & { billing_cycle?: string }) | null;
  lineItems: BillingLineItemDTO[];
  items: (BillingLineItemDTO & { entry_type?: string; reference_id?: string; amount_cents?: number; created_at?: string })[];
  summary: {
    grandTotalCents: number;
    orderMicrofeesTotalCents: number;
    orderMicrofeesCount: number;
    subscriptionsTotalCents: number;
    extraUsageTotalCents: number;
    isAuditBalanced: boolean;
  };
  totalCents: number;
  totalMicrofeesCents: number;
  totalSubscriptionCents: number;
  totalExtraUsageCents: number;
  isAuditSumValid: boolean; // Confirmação matemática se a soma bate centavo por centavo
  reconciled: boolean;
  discrepancyCents: number;
}
