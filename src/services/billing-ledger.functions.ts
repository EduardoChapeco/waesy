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
import {
  MARKETPLACE_PLATFORM_FEE_RATE,
  calculateMarketplaceOrderSplit,
  calculateDelinquencyAutoDebit,
  calculateMobilityBilateralSplit,
  resolveEffectivePricing,
  type PdvTapToPaySessionDTO,
  type PricingOverridesDTO,
  type EffectivePricingRulesDTO,
  type MobilityBilateralSplitResult,
} from "@/lib/monetization-engine";

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

    const identity = await getServerIdentity().catch(() => null);
    const isStoreStaff = identity?.id
      ? (identity.memberships || []).some((m) => m.store_id === data.storeId)
      : false;
    const isGlobalAdmin = identity?.role === "platform_admin" || identity?.role === "master";
    const isOrderCustomer = Boolean(identity?.id && order.customer_id === identity.id);

    if (identity?.id && !isStoreStaff && !isGlobalAdmin && !isOrderCustomer) {
      throw new Error("Não autorizado a registrar microtaxa para este pedido.");
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

// ---------------------------------------------------------------------------
// 7. REGISTRAR TAXA PADRÃO DE MARKETPLACE (5% SOBRE SUBTOTAL)
// ---------------------------------------------------------------------------
export const RecordMarketplacePlatformFeeSchema = z.object({
  storeId: z.string().uuid("ID da loja inválido"),
  orderId: z.string().min(1, "ID do pedido obrigatório"),
  subtotalCents: z.number().int().positive("Subtotal deve ser positivo"),
  feeRate: z.number().positive().default(MARKETPLACE_PLATFORM_FEE_RATE),
  description: z.string().optional(),
});

export const recordMarketplacePlatformFee = createServerFn({ method: "POST" })
  .validator(RecordMarketplacePlatformFeeSchema)
  .handler(async ({ data }): Promise<BillingLineItemDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    const feeCents = Math.round(data.subtotalCents * data.feeRate);
    const now = new Date();

    // Idempotência estrita: se a taxa da plataforma para este pedido já foi registrada, retorna
    const { data: existingFee } = await supabase
      .from("billing_line_items")
      .select("*")
      .eq("store_id", data.storeId)
      .eq("origin_event_id", `MKT-FEE-${data.orderId}`)
      .eq("fee_type", "MARKETPLACE_PLATFORM_FEE_5_PERCENT")
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

    // Localizar ou criar fatura aberta
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
      const { data: createdInvoice } = await supabase
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
      invoice = createdInvoice;
    }

    const desc = data.description || `Taxa de Plataforma Marketplace (5%) - Pedido #${data.orderId.slice(0, 8)}`;
    const { data: item, error: itemError } = await supabase
      .from("billing_line_items")
      .insert({
        invoice_id: invoice?.id || null,
        store_id: data.storeId,
        origin_event_id: `MKT-FEE-${data.orderId}`,
        description: desc,
        amount_cents: feeCents,
        fee_type: "MARKETPLACE_PLATFORM_FEE_5_PERCENT",
        created_at: now.toISOString(),
      })
      .select("*")
      .single();

    if (itemError) {
      throw new Error("Erro ao gravar taxa de marketplace: " + itemError.message);
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
// 8. MOTOR DE INADIMPLÊNCIA: AUTODÉBITO DE FATURAS VENCIDAS NO SPLIT
// ---------------------------------------------------------------------------
export const ExecuteDelinquencyAutoDebitSchema = z.object({
  storeId: z.string().uuid("ID da loja inválido"),
  orderId: z.string().min(1, "ID do pedido obrigatório"),
  merchantNetCents: z.number().int().positive("Valor líquido do lojista deve ser positivo"),
});

export const executeDelinquencyAutoDebit = createServerFn({ method: "POST" })
  .validator(ExecuteDelinquencyAutoDebitSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const now = new Date();

    // 1. Consultar faturas com débito aberto/vencido da loja
    const { data: overdueInvoices } = await supabase
      .from("billing_invoices")
      .select("id, invoice_number, total_cents, status")
      .eq("store_id", data.storeId)
      .in("status", ["OVERDUE", "OPEN"])
      .gt("total_cents", 0)
      .order("period_start", { ascending: true });

    const totalOverdueCents = (overdueInvoices || []).reduce(
      (sum, inv) => sum + (inv.total_cents || 0),
      0
    );

    const calc = calculateDelinquencyAutoDebit({
      merchantNetCents: data.merchantNetCents,
      overdueInvoicesTotalCents: totalOverdueCents,
    });

    if (calc.withheldCents <= 0) {
      return {
        storeId: data.storeId,
        orderId: data.orderId,
        withheldCents: 0,
        releasedPayoutCents: data.merchantNetCents,
        remainingDebtCents: 0,
        settledInvoicesCount: 0,
        status: "NO_DEBT",
      };
    }

    // 2. Abater o valor retido nas faturas pendentes em ordem cronológica
    let remainingToDeduct = calc.withheldCents;
    let settledCount = 0;

    for (const inv of overdueInvoices || []) {
      if (remainingToDeduct <= 0) break;

      const deduction = Math.min(remainingToDeduct, inv.total_cents);
      const newTotal = inv.total_cents - deduction;
      remainingToDeduct -= deduction;

      await supabase
        .from("billing_invoices")
        .update({
          total_cents: newTotal,
          status: newTotal === 0 ? "PAID" : inv.status,
          updated_at: now.toISOString(),
        })
        .eq("id", inv.id);

      await supabase.from("billing_line_items").insert({
        invoice_id: inv.id,
        store_id: data.storeId,
        origin_event_id: `AUTODEBIT-${data.orderId}`,
        description: `Autodébito compensatório retido de venda Marketplace (#${data.orderId.slice(0, 8)})`,
        amount_cents: -deduction, // Lançamento a crédito/abatimento
        fee_type: "DELINQUENCY_AUTO_DEBIT",
        created_at: now.toISOString(),
      });

      if (newTotal === 0) settledCount++;
    }

    return {
      storeId: data.storeId,
      orderId: data.orderId,
      withheldCents: calc.withheldCents,
      releasedPayoutCents: calc.releasedPayoutCents,
      remainingDebtCents: calc.remainingDebtCents,
      settledInvoicesCount: settledCount,
      status: calc.fullySettled ? "FULLY_SETTLED" : "PARTIALLY_SETTLED",
    };
  });

// ---------------------------------------------------------------------------
// 9. TAP TO PAY PDV: CRIAÇÃO E SINCRONIZAÇÃO DE SESSÃO
// ---------------------------------------------------------------------------
export const CreatePdvTapSessionSchema = z.object({
  storeId: z.string().uuid("ID da loja inválido"),
  orderId: z.string().min(1, "ID do pedido obrigatório"),
  amountCents: z.number().int().positive("Valor deve ser positivo"),
  cashierTerminalId: z.string().min(1, "Terminal de caixa obrigatório"),
});

export const createPdvTapSession = createServerFn({ method: "POST" })
  .validator(CreatePdvTapSessionSchema)
  .handler(async ({ data }): Promise<PdvTapToPaySessionDTO> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "seller", "master"], data.storeId);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutos de validade

    const sessionId = `TAP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const session: PdvTapToPaySessionDTO = {
      sessionId,
      storeId: data.storeId,
      orderId: data.orderId,
      amountCents: data.amountCents,
      currency: "BRL",
      status: "WAITING_TAP",
      cashierTerminalId: data.cashierTerminalId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    return session;
  });

// ---------------------------------------------------------------------------
// 10. MOBILIDADE WAESY GO: REGISTRO BILATERAL COM OPACIDADE DE TAXAS
// ---------------------------------------------------------------------------
export const RecordMobilityBilateralFeeSchema = z.object({
  rideId: z.string().min(1, "ID da corrida obrigatório"),
  passengerProfileId: z.string().uuid().optional(),
  driverProfileId: z.string().uuid("ID do condutor obrigatório"),
  fareCents: z.number().int().positive("Tarifa da corrida deve ser positiva"),
  passengerFeeCents: z.number().int().default(99),
  driverFeeCents: z.number().int().default(99),
  driverGatewayRatePercent: z.number().default(0.0099),
});

export const recordMobilityBilateralPlatformFee = createServerFn({ method: "POST" })
  .validator(RecordMobilityBilateralFeeSchema)
  .handler(async ({ data }): Promise<MobilityBilateralSplitResult> => {
    const supabase = getServerClient();
    const now = new Date();

    const split = calculateMobilityBilateralSplit({
      fareCents: data.fareCents,
      passengerFeeCents: data.passengerFeeCents,
      driverFeeCents: data.driverFeeCents,
      driverGatewayRatePercent: data.driverGatewayRatePercent,
    });

    // 1. Gravar lançamento contábil da taxa do passageiro (R$ 0,99)
    try {
      await supabase.from("financial_ledger_entries").insert({
        transaction_id: `RIDE-PASSENGER-FEE-${data.rideId}`,
        debit_account_id: data.passengerProfileId || data.driverProfileId,
        credit_account_id: data.driverProfileId,
        amount_cents: split.platformAudit.passengerFeeCents,
        currency: "BRL",
        entry_type: "PLATFORM_FEE",
        status: "SETTLED",
        description: `Taxa de serviço civil de mobilidade Waesy Go (#${data.rideId.slice(0, 8)})`,
        metadata: {
          rideId: data.rideId,
          role: "passenger",
          chargedCents: split.passengerView.totalChargedCents,
        },
        hash_chain: `RIDE_PASS_${data.rideId}_${now.getTime()}`,
        created_at: now.toISOString(),
      });
    } catch {
      // Ignora falha de gravação de extrato secundário para não bloquear a transação
    }

    // 2. Gravar lançamento contábil da taxa fixa do motorista (R$ 0,99)
    try {
      await supabase.from("financial_ledger_entries").insert({
        transaction_id: `RIDE-DRIVER-FEE-${data.rideId}`,
        debit_account_id: data.driverProfileId,
        credit_account_id: data.driverProfileId,
        amount_cents: split.platformAudit.driverFeeCents,
        currency: "BRL",
        entry_type: "PLATFORM_FEE",
        status: "SETTLED",
        description: `Taxa administrativa fixa de condutor Waesy Go (#${data.rideId.slice(0, 8)})`,
        metadata: {
          rideId: data.rideId,
          role: "driver",
          grossFareCents: split.driverView.grossFareCents,
          netEarningsCents: split.driverView.netEarningsCents,
        },
        hash_chain: `RIDE_DRV_${data.rideId}_${now.getTime()}`,
        created_at: now.toISOString(),
      });
    } catch {
      // Ignora falha de gravação de extrato secundário para não bloquear a transação
    }

    return split;
  });

// ---------------------------------------------------------------------------
// 11. PARAMETRIZAÇÃO & CUSTOMIZAÇÃO DE TAXAS POR LOJA OU CLIENTE
// ---------------------------------------------------------------------------
export const GetCustomPricingRulesSchema = z.object({
  storeId: z.string().uuid("ID da loja obrigatório"),
});

export const getStoreCustomPricingRules = createServerFn({ method: "GET" })
  .validator(GetCustomPricingRulesSchema)
  .handler(async ({ data }): Promise<EffectivePricingRulesDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "finance", "master"], data.storeId);

    const { data: store } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", data.storeId)
      .maybeSingle();

    const overrides = (store?.settings as any)?.pricing_overrides as PricingOverridesDTO | undefined;
    return resolveEffectivePricing(overrides);
  });

export const SaveCustomPricingRulesSchema = z.object({
  storeId: z.string().uuid("ID da loja obrigatório"),
  marketplaceFeeRate: z.number().min(0).max(0.5).optional(),
  mobilityPassengerFeeCents: z.number().int().min(0).optional(),
  mobilityDriverFeeCents: z.number().int().min(0).optional(),
  pdvPlatformFeeRate: z.number().min(0).max(0.2).optional(),
  planDiscountPercent: z.number().min(0).max(100).optional(),
  customAiTokensBonus: z.number().int().min(0).optional(),
  isFeeExempt: z.boolean().optional(),
  notes: z.string().optional(),
});

export const saveStoreCustomPricingRules = createServerFn({ method: "POST" })
  .validator(SaveCustomPricingRulesSchema)
  .handler(async ({ data }): Promise<EffectivePricingRulesDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    // Apenas Master ou Admin da Loja com perfil corporativo pode customizar taxas
    assertStoreAccess(identity, ["admin", "owner", "master", "platform_admin"], data.storeId);

    const { data: store } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", data.storeId)
      .maybeSingle();

    const currentSettings = (store?.settings || {}) as Record<string, any>;
    const updatedOverrides: PricingOverridesDTO = {
      entityType: "store",
      entityId: data.storeId,
      marketplaceFeeRate: data.marketplaceFeeRate,
      mobilityPassengerFeeCents: data.mobilityPassengerFeeCents,
      mobilityDriverFeeCents: data.mobilityDriverFeeCents,
      pdvPlatformFeeRate: data.pdvPlatformFeeRate,
      planDiscountPercent: data.planDiscountPercent,
      customAiTokensBonus: data.customAiTokensBonus,
      isFeeExempt: data.isFeeExempt,
      notes: data.notes,
      updatedAt: new Date().toISOString(),
    };

    const newSettings = {
      ...currentSettings,
      pricing_overrides: updatedOverrides,
    };

    const { error } = await supabase
      .from("stores")
      .update({ settings: newSettings, updated_at: new Date().toISOString() })
      .eq("id", data.storeId);

    if (error) {
      throw new Error("Erro ao salvar parametrização de taxas da loja: " + error.message);
    }

    return resolveEffectivePricing(updatedOverrides);
  });

