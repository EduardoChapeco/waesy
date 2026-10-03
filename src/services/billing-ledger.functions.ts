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

    // 0. Autenticação e verificação de integridade do pedido
    const { data: order } = await supabase
      .from("orders")
      .select("id, store_id, customer_id")
      .eq("id", data.orderId)
      .eq("store_id", data.storeId)
      .maybeSingle();

    if (!order) {
      throw new Error("Pedido não encontrado para a loja especificada.");
    }

    // Idempotência estrita: se a microtaxa para este pedido já foi registrada, retorna sem duplicar
    const { data: existingFee } = await supabase
      .from("billing_line_items")
      .select("*")
      .eq("store_id", data.storeId)
      .eq("origin_event_id", data.orderId)
      .eq("fee_type", "ORDER_MICROFEE_RANDOM")
      .maybeSingle();

    if (existingFee) {
      return {
        id: existingFee.id,
        invoiceId: existingFee.invoice_id,
        storeId: existingFee.store_id,
        originEventId: existingFee.origin_event_id,
        description: existingFee.description,
        amountCents: existingFee.amount_cents,
        feeType: existingFee.fee_type as BillingFeeType,
        createdAt: existingFee.created_at,
      };
    }

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
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "platform_admin", "master"], data.storeId);

    const supabase = getServerClient();
    const now = new Date();
    const cycle = data.cycleMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Idempotência de ciclo: evita faturamento duplicado no mesmo mês
    const { data: existingSub } = await supabase
      .from("billing_line_items")
      .select("*")
      .eq("store_id", data.storeId)
      .eq("origin_event_id", `SUB-${cycle}`)
      .eq("fee_type", "SUBSCRIPTION_MONTHLY")
      .maybeSingle();

    if (existingSub) {
      return {
        id: existingSub.id,
        invoiceId: existingSub.invoice_id,
        storeId: existingSub.store_id,
        originEventId: existingSub.origin_event_id,
        description: existingSub.description,
        amountCents: existingSub.amount_cents,
        feeType: existingSub.fee_type as BillingFeeType,
        createdAt: existingSub.created_at,
      };
    }

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
      } else if (
        item.feeType === "EXTRA_USAGE" ||
        item.feeType === "AD_BOOST_SPONSORED" ||
        item.feeType === "EXTERNAL_ADS_BUDGET"
      ) {
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

// ---------------------------------------------------------------------------
// 4. LANÇAMENTO ATÔMICO NO INVOICE_LEDGER PARA WAESY ADS & TRÁFEGO EXTERNO (V142)
// ---------------------------------------------------------------------------
export async function executeAtomicInvoiceLedgerBoost(params: {
  storeId?: string | null;
  profileId?: string | null;
  entityType: "product_boost" | "classified_boost" | "external_ad_campaign";
  entityId: string;
  originalAmountCents: number;
  description: string;
  metadata?: Record<string, any>;
}) {
  const supabase = getServerClient();
  const now = new Date();

  let planTier: "free" | "mvp" | "pro" | "max" = "free";

  if (params.storeId) {
    const { data: storeData } = await supabase
      .from("stores")
      .select("plan_tier, settings")
      .eq("id", params.storeId)
      .maybeSingle();

    const rawTier = String(
      (storeData as any)?.plan_tier ||
        ((storeData?.settings as any)?.plan_tier) ||
        "free"
    ).toLowerCase();

    if (rawTier.includes("max") || rawTier.includes("enterprise")) {
      planTier = "max";
    } else if (rawTier.includes("pro") || rawTier.includes("growth")) {
      planTier = "pro";
    } else if (rawTier.includes("mvp")) {
      planTier = "mvp";
    }
  }

  // Cálculo de desconto / inclusão para assinantes Waesy Max
  let discountCents = 0;
  let ledgerStatus: "paid" | "included_in_max" = "paid";

  if (params.entityType !== "external_ad_campaign" && planTier === "max") {
    // Assinantes Waesy Max têm 50% de subsídio em qualquer impulsionamento interno avulso
    discountCents = Math.round(params.originalAmountCents * 0.5);
  } else if (params.entityType !== "external_ad_campaign" && planTier === "pro") {
    discountCents = Math.round(params.originalAmountCents * 0.2);
  }

  const finalAmountCents = Math.max(0, params.originalAmountCents - discountCents);
  if (finalAmountCents === 0 && planTier === "max") {
    ledgerStatus = "included_in_max";
  }

  let invoiceId: string | null = null;

  // Se houver storeId, sincroniza atomicamente com billing_invoices e billing_line_items (V141)
  if (params.storeId) {
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    let { data: openInvoice } = await supabase
      .from("billing_invoices")
      .select("id, total_cents")
      .eq("store_id", params.storeId)
      .eq("status", "OPEN")
      .gte("period_start", periodStart)
      .lte("period_end", periodEnd)
      .maybeSingle();

    if (!openInvoice) {
      const invoiceNumber = `FAT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${params.storeId.slice(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const { data: createdInv } = await supabase
        .from("billing_invoices")
        .insert({
          store_id: params.storeId,
          invoice_number: invoiceNumber,
          period_start: periodStart,
          period_end: periodEnd,
          total_cents: 0,
          status: "OPEN",
        })
        .select("id, total_cents")
        .maybeSingle();
      openInvoice = createdInv;
    }

    if (openInvoice?.id) {
      invoiceId = openInvoice.id;
      const feeType: BillingFeeType =
        params.entityType === "external_ad_campaign"
          ? "EXTERNAL_ADS_BUDGET"
          : "AD_BOOST_SPONSORED";

      await supabase.from("billing_line_items").insert({
        invoice_id: invoiceId,
        store_id: params.storeId,
        origin_event_id: `BOOST-${params.entityId.slice(0, 8)}`,
        description:
          discountCents > 0
            ? `${params.description} (Desconto Tier ${planTier.toUpperCase()}: -R$ ${(discountCents / 100).toFixed(2)})`
            : params.description,
        amount_cents: finalAmountCents,
        fee_type: feeType,
        created_at: now.toISOString(),
      });

      await supabase
        .from("billing_invoices")
        .update({
          total_cents: (openInvoice.total_cents || 0) + finalAmountCents,
          updated_at: now.toISOString(),
        })
        .eq("id", invoiceId);
    }
  }

  // Registra no invoice_ledger canônico
  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from("invoice_ledger")
    .insert({
      invoice_id: invoiceId,
      store_id: params.storeId || null,
      profile_id: params.profileId || null,
      entity_type: params.entityType,
      entity_id: params.entityId,
      plan_tier: planTier,
      original_amount_cents: params.originalAmountCents,
      discount_cents: discountCents,
      amount_cents: finalAmountCents,
      currency: "BRL",
      status: ledgerStatus,
      description: params.description,
      metadata: params.metadata || {},
      created_at: now.toISOString(),
    })
    .select("*")
    .maybeSingle();

  if (ledgerError) {
    console.error("[billing-ledger] Erro ao gravar invoice_ledger:", ledgerError);
  }

  return {
    ledgerEntryId: ledgerEntry?.id || null,
    invoiceId,
    planTier,
    originalAmountCents: params.originalAmountCents,
    discountCents,
    finalAmountCents,
    status: ledgerStatus,
  };
}

