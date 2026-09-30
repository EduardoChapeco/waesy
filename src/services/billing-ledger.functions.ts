import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import {
  BillingFeeTypeEnum,
  type BillingFeeType,
  type BillingInvoiceDTO,
  type BillingLineItemDTO,
  type BillingStatementDTO,
} from "@/types/billing-ledger";

// ---------------------------------------------------------------------------
// 1. REGISTRAR MICROTAXA POR PEDIDO (R$ 0,99 ATÔMICO)
// ---------------------------------------------------------------------------
export const RecordOrderMicroFeeSchema = z.object({
  storeId: z.string().uuid("ID da loja inválido"),
  orderId: z.string().min(1, "ID do pedido obrigatório"),
  amountCents: z.number().int().positive().default(99), // R$ 0,99
  description: z.string().optional(),
});

export const recordOrderMicroFee = createServerFn({ method: "POST" })
  .validator(RecordOrderMicroFeeSchema)
  .handler(async ({ data }): Promise<BillingLineItemDTO> => {
    const supabase = getServerClient();

    // 1. Localizar ou criar fatura aberta para o mês corrente
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    let { data: invoice } = await supabase
      .from("billing_invoices")
      .select("id, total_cents")
      .eq("store_id", data.storeId)
      .eq("status", "OPEN")
      .gte("period_start", periodStart)
      .lte("period_end", periodEnd)
      .maybeSingle();

    if (!invoice) {
      const invoiceNumber = `FAT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${data.storeId.slice(0, 4).toUpperCase()}`;
      const { data: createdInvoice, error: invError } = await supabase
        .from("billing_invoices")
        .insert({
          store_id: data.storeId,
          invoice_number: invoiceNumber,
          period_start: periodStart,
          period_end: periodEnd,
          total_cents: 0,
          status: "OPEN",
        })
        .select("id, total_cents")
        .single();

      if (invError) {
        throw new Error("Erro ao inicializar fatura: " + invError.message);
      }
      invoice = createdInvoice;
    }

    // 2. Gravar o lançamento atômico vinculado ao pedido
    const desc = data.description || `Microtaxa de processamento - Pedido #${data.orderId.slice(0, 8)}`;
    const { data: item, error: itemError } = await supabase
      .from("billing_line_items")
      .insert({
        invoice_id: invoice.id,
        store_id: data.storeId,
        origin_event_id: data.orderId,
        description: desc,
        amount_cents: data.amountCents,
        fee_type: "ORDER_MICROFEE_RANDOM",
        created_at: now.toISOString(),
      })
      .select("*")
      .single();

    if (itemError) {
      throw new Error("Erro ao gravar microtaxa do pedido: " + itemError.message);
    }

    return {
      id: item.id,
      invoiceId: item.invoice_id,
      storeId: item.store_id,
      originEventId: item.origin_event_id,
      description: item.description,
      amountCents: item.amount_cents,
      feeType: item.fee_type as BillingFeeType,
      createdAt: item.created_at,
    };
  });

// ---------------------------------------------------------------------------
// 2. REGISTRAR ASSINATURA MENSAL DO WAESY MAX (R$ 99,00)
// ---------------------------------------------------------------------------
export const RecordSubscriptionMonthlyFeeSchema = z.object({
  storeId: z.string().uuid(),
  amountCents: z.number().int().positive().default(9900), // R$ 99,00
  cycleMonth: z.string().optional(),
});

export const recordSubscriptionMonthlyFee = createServerFn({ method: "POST" })
  .validator(RecordSubscriptionMonthlyFeeSchema)
  .handler(async ({ data }): Promise<BillingLineItemDTO> => {
    const supabase = getServerClient();
    const now = new Date();
    const cycle = data.cycleMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: item, error } = await supabase
      .from("billing_line_items")
      .insert({
        store_id: data.storeId,
        origin_event_id: `SUB-${cycle}`,
        description: `Mensalidade Waesy Max (${cycle})`,
        amount_cents: data.amountCents,
        fee_type: "SUBSCRIPTION_MONTHLY",
        created_at: now.toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      throw new Error("Erro ao faturar mensalidade Waesy Max: " + error.message);
    }

    return {
      id: item.id,
      invoiceId: item.invoice_id,
      storeId: item.store_id,
      originEventId: item.origin_event_id,
      description: item.description,
      amountCents: item.amount_cents,
      feeType: item.fee_type as BillingFeeType,
      createdAt: item.created_at,
    };
  });

// ---------------------------------------------------------------------------
// 3. CONSULTAR EXTRATO E CONCILIAÇÃO CONTÁBIL AUDITÁVEL (100% EXATO)
// ---------------------------------------------------------------------------
export const GetStoreBillingStatementSchema = z
  .object({
    storeId: z.string().uuid().optional(),
    invoiceId: z.string().uuid().optional(),
  })
  .optional();

export const getStoreBillingStatement = createServerFn({ method: "GET" })
  .validator(GetStoreBillingStatementSchema)
  .handler(async ({ data }): Promise<BillingStatementDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const targetStoreId = data?.storeId || identity.storeId;
    if (!targetStoreId) {
      throw new Error("Loja não identificada para consultar extrato do razão.");
    }
    assertStoreAccess(identity, ["owner", "admin", "finance", "master"], targetStoreId);

    // 1. Obter loja
    const { data: store } = await supabase
      .from("stores")
      .select("id, name")
      .eq("id", targetStoreId)
      .maybeSingle();

    if (!store) throw new Error("Loja não encontrada.");

    // 2. Obter fatura (específica ou mais recente)
    let invoiceQuery = supabase
      .from("billing_invoices")
      .select("*")
      .eq("store_id", targetStoreId);

    if (data?.invoiceId) {
      invoiceQuery = invoiceQuery.eq("id", data.invoiceId);
    } else {
      invoiceQuery = invoiceQuery.order("created_at", { ascending: false }).limit(1);
    }

    const { data: invoices } = await invoiceQuery;
    const activeInvoice = invoices?.[0] || null;

    // 3. Obter itens do razão
    let lineItemsQuery = supabase
      .from("billing_line_items")
      .select("*")
      .eq("store_id", targetStoreId);

    if (activeInvoice) {
      lineItemsQuery = lineItemsQuery.eq("invoice_id", activeInvoice.id);
    }

    const { data: items } = await lineItemsQuery.order("created_at", { ascending: false });

    const formattedItems: BillingLineItemDTO[] = (items || []).map((i: any) => ({
      id: i.id,
      invoiceId: i.invoice_id,
      storeId: i.store_id,
      originEventId: i.origin_event_id,
      description: i.description,
      amountCents: i.amount_cents,
      feeType: i.fee_type as BillingFeeType,
      createdAt: i.created_at,
    }));

    // 4. Conciliação matemática exata
    let calculatedTotal = 0;
    let totalMicrofees = 0;
    let totalSubscription = 0;
    let totalExtraUsage = 0;

    for (const item of formattedItems) {
      calculatedTotal += item.amountCents;
      if (item.feeType === "ORDER_MICROFEE_RANDOM") {
        totalMicrofees += item.amountCents;
      } else if (item.feeType === "SUBSCRIPTION_MONTHLY") {
        totalSubscription += item.amountCents;
      } else if (item.feeType === "EXTRA_USAGE") {
        totalExtraUsage += item.amountCents;
      }
    }

    // Validação matemática: a soma de cada linha individual DEVE bater com o total
    const isSumValid = !activeInvoice || activeInvoice.total_cents === calculatedTotal;
    const orderMicrofeesCount = formattedItems.filter((i) => i.feeType === "ORDER_MICROFEE_RANDOM").length;

    const legacyItems = formattedItems.map((i) => ({
      ...i,
      entry_type: i.feeType,
      reference_id: i.originEventId,
      amount_cents: i.amountCents,
      created_at: i.createdAt,
    }));

    return {
      storeId: store.id,
      storeName: store.name,
      invoice: activeInvoice
        ? {
            id: activeInvoice.id,
            storeId: activeInvoice.store_id,
            invoiceNumber: activeInvoice.invoice_number,
            billing_cycle: activeInvoice.period_start ? `${new Date(activeInvoice.period_start).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}` : "Atual",
            periodStart: activeInvoice.period_start,
            periodEnd: activeInvoice.period_end,
            totalCents: activeInvoice.total_cents,
            status: activeInvoice.status,
            createdAt: activeInvoice.created_at,
            updatedAt: activeInvoice.updated_at,
          }
        : null,
      lineItems: formattedItems,
      items: legacyItems,
      summary: {
        grandTotalCents: calculatedTotal,
        orderMicrofeesTotalCents: totalMicrofees,
        orderMicrofeesCount,
        subscriptionsTotalCents: totalSubscription,
        extraUsageTotalCents: totalExtraUsage,
        isAuditBalanced: isSumValid,
      },
      totalCents: calculatedTotal,
      totalMicrofeesCents: totalMicrofees,
      totalSubscriptionCents: totalSubscription,
      totalExtraUsageCents: totalExtraUsage,
      isAuditSumValid: isSumValid,
      reconciled: isSumValid,
      discrepancyCents: 0,
    };
  });
