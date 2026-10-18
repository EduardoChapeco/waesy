/**
 * affiliate-ledger.functions.ts
 *
 * BFF Server Functions para o Livro-Razão de Afiliados, Faturas de Lojistas e Hub de Campanhas Globais
 * Padrão Méliuz (Escrow, Maturação e Clawback) + Phia (1-Click Curadoria & Campanhas Externas)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import {
  calculateCommissionSplit,
  computeCommissionMaturityDate,
  applyClawbackOnOrderCancellation,
  generatePhiaCuratedAffiliateLink,
  calculateMonthlyInvoiceTotals,
} from "@/lib/affiliate/affiliate-ledger-engine";

// ---------------------------------------------------------------------------
// 1. RASTREAMENTO E REGISTRO DE COMISSÃO NO CHECKOUT (ORDEM PENDENTE)
// ---------------------------------------------------------------------------

export const trackOrderCommissionInput = z.object({
  orderId: z.string().uuid("ID do pedido inválido"),
  storeId: z.string().uuid("ID da loja inválido"),
  referralHandle: z.string().min(1, "Código ou handle de referência obrigatório"),
  orderGrossCents: z.number().int().nonnegative(),
});

/**
 * Registra a comissão da venda no exato momento da criação do pedido.
 * Nasce em estado 'tracked_pending' e vincula-se à fatura mensal aberta da loja.
 */
export const trackOrderCommissionOnCheckout = createServerFn({ method: "POST" })
  .validator(trackOrderCommissionInput)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const cleanHandle = input.referralHandle.toLowerCase().trim();

    // 1. Localiza o parceiro pelo handle
    const { data: partner } = await supabase
      .from("affiliate_partners")
      .select("id, user_id, commission_rate_percent, status")
      .eq("handle", cleanHandle)
      .maybeSingle();

    if (!partner || partner.status !== "active") {
      return { success: false, reason: "Parceiro inativo ou inexistente" };
    }

    // 2. Busca configuração de comissão da loja (ou parceria bilateral específica)
    let commissionRate = Number(partner.commission_rate_percent) || 5;

    const { data: partnership } = await supabase
      .from("affiliate_store_partnerships")
      .select("custom_commission_pct, status")
      .eq("store_id", input.storeId)
      .eq("affiliate_user_id", partner.user_id)
      .maybeSingle();

    if (partnership && partnership.status === "approved" && partnership.custom_commission_pct) {
      commissionRate = Number(partnership.custom_commission_pct);
    }

    // 3. Calcula o split de comissão
    const split = calculateCommissionSplit({
      orderGrossCents: input.orderGrossCents,
      commissionRatePct: commissionRate,
    });

    if (split.totalCommissionCents <= 0) {
      return { success: true, commissionCents: 0 };
    }

    // 4. Localiza ou cria a fatura mensal aberta da loja (YYYY-MM)
    const now = new Date();
    const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let { data: invoice } = await supabase
      .from("merchant_affiliate_invoices")
      .select("id, total_tracked_sales_cents, total_valid_commission_cents")
      .eq("store_id", input.storeId)
      .eq("reference_month", referenceMonth)
      .maybeSingle();

    if (!invoice) {
      const { data: createdInvoice } = await supabase
        .from("merchant_affiliate_invoices")
        .insert({
          store_id: input.storeId,
          reference_month: referenceMonth,
          total_tracked_sales_cents: input.orderGrossCents,
          total_valid_commission_cents: split.totalCommissionCents,
          status: "open_accumulating",
        })
        .select()
        .single();
      invoice = createdInvoice;
    } else {
      await supabase
        .from("merchant_affiliate_invoices")
        .update({
          total_tracked_sales_cents: (Number(invoice.total_tracked_sales_cents) || 0) + input.orderGrossCents,
          total_valid_commission_cents: (Number(invoice.total_valid_commission_cents) || 0) + split.totalCommissionCents,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);
    }

    // 5. Insere linha no Livro-Razão de Comissões (affiliate_commission_ledger)
    const { data: ledgerEntry, error } = await supabase
      .from("affiliate_commission_ledger")
      .insert({
        order_id: input.orderId,
        store_id: input.storeId,
        affiliate_user_id: partner.user_id,
        invoice_id: invoice?.id || null,
        source_type: "internal_store",
        referral_handle: cleanHandle,
        order_gross_cents: input.orderGrossCents,
        commission_rate_pct: commissionRate,
        total_commission_cents: split.totalCommissionCents,
        affiliate_share_cents: split.affiliateShareCents,
        platform_fee_cents: split.platformFeeCents,
        customer_cashback_cents: split.customerCashbackCents,
        status: "tracked_pending",
      })
      .select()
      .single();

    if (error) {
      console.error("[affiliate-ledger] Erro ao gravar ledger de comissão:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      ledgerId: ledgerEntry.id,
      affiliateShareCents: split.affiliateShareCents,
      customerCashbackCents: split.customerCashbackCents,
    };
  });

// ---------------------------------------------------------------------------
// 2. SINCRONIZAÇÃO DE STATUS DO PEDIDO & CLAWBACK (MÉLIUZ)
// ---------------------------------------------------------------------------

export const syncCommissionOnOrderStatusChange = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().uuid("ID do pedido inválido"),
      newStatus: z.string(),
      cancellationReason: z.string().optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();

    // 1. Busca comissões associadas a este pedido
    const { data: commissions } = await supabase
      .from("affiliate_commission_ledger")
      .select("*")
      .eq("order_id", input.orderId);

    if (!commissions || commissions.length === 0) {
      return { syncedCount: 0 };
    }

    for (const comm of commissions) {
      // Pedido cancelado ou devolvido -> Clawback Méliuz imediato
      if (["cancelled", "refunded", "returned", "payment_failed"].includes(input.newStatus)) {
        const clawback = applyClawbackOnOrderCancellation({
          currentCommissionStatus: comm.status,
          affiliateShareCents: comm.affiliate_share_cents,
          totalCommissionCents: comm.total_commission_cents,
          cancellationReason: input.cancellationReason || "Cancelamento do pedido no sistema",
        });

        if (clawback.isEligibleForClawback) {
          await supabase
            .from("affiliate_commission_ledger")
            .update({
              status: "cancelled_refunded",
              cancellation_reason: clawback.reason,
              cancelled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", comm.id);

          // Abate da fatura da loja
          if (comm.invoice_id) {
            const { data: invoice } = await supabase
              .from("merchant_affiliate_invoices")
              .select("total_cancelled_commission_cents, total_valid_commission_cents")
              .eq("id", comm.invoice_id)
              .maybeSingle();

            if (invoice) {
              await supabase
                .from("merchant_affiliate_invoices")
                .update({
                  total_cancelled_commission_cents:
                    (Number(invoice.total_cancelled_commission_cents) || 0) + comm.total_commission_cents,
                  total_valid_commission_cents: Math.max(
                    0,
                    (Number(invoice.total_valid_commission_cents) || 0) - comm.total_commission_cents
                  ),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", comm.invoice_id);
            }
          }
        }
      }
      // Pedido entregue -> entra na contagem regressiva de maturação (escrow)
      else if (["delivered", "completed"].includes(input.newStatus)) {
        if (comm.status === "tracked_pending") {
          const maturesAt = computeCommissionMaturityDate(new Date(), 7); // 7 dias legais
          await supabase
            .from("affiliate_commission_ledger")
            .update({
              status: "awaiting_escrow",
              matures_at: maturesAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", comm.id);
        }
      }
    }

    return { syncedCount: commissions.length };
  });

// ---------------------------------------------------------------------------
// 3. EXTRATO DE COMISSÕES PARA O AFILIADO (MÉLIUZ STYLE)
// ---------------------------------------------------------------------------

export const listAffiliateCommissionsForPartner = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();

  if (!identity?.id) {
    return {
      summary: {
        pendingTrackingCents: 0,
        awaitingEscrowCents: 0,
        availableCents: 0,
        totalPaidOutCents: 0,
        cancelledCents: 0,
      },
      items: [],
    };
  }

  const { data: commissions, error } = await supabase
    .from("affiliate_commission_ledger")
    .select(`
      id,
      order_id,
      store_id,
      source_type,
      order_gross_cents,
      commission_rate_pct,
      affiliate_share_cents,
      customer_cashback_cents,
      status,
      matures_at,
      cancellation_reason,
      created_at,
      stores (
        name,
        slug,
        logo_url
      )
    `)
    .eq("affiliate_user_id", identity.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !commissions) {
    return {
      summary: {
        pendingTrackingCents: 0,
        awaitingEscrowCents: 0,
        availableCents: 0,
        totalPaidOutCents: 0,
        cancelledCents: 0,
      },
      items: [],
    };
  }

  let pendingTrackingCents = 0;
  let awaitingEscrowCents = 0;
  let availableCents = 0;
  let totalPaidOutCents = 0;
  let cancelledCents = 0;

  for (const c of commissions) {
    const val = Number(c.affiliate_share_cents) || 0;
    if (c.status === "tracked_pending") pendingTrackingCents += val;
    else if (c.status === "awaiting_escrow") awaitingEscrowCents += val;
    else if (c.status === "available") availableCents += val;
    else if (c.status === "paid_out") totalPaidOutCents += val;
    else if (c.status === "cancelled_refunded") cancelledCents += val;
  }

  return {
    summary: {
      pendingTrackingCents,
      awaitingEscrowCents,
      availableCents,
      totalPaidOutCents,
      cancelledCents,
    },
    items: commissions,
  };
});

// ---------------------------------------------------------------------------
// 4. FATURAS MENSAIS E CONCILIAÇÃO PARA A EMPRESA (WORKSPACE LOJA)
// ---------------------------------------------------------------------------

export const listMerchantAffiliateInvoices = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

  const { data, error } = await supabase
    .from("merchant_affiliate_invoices")
    .select("*")
    .eq("store_id", identity.store_id)
    .order("reference_month", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
});

// ---------------------------------------------------------------------------
// 5. HUB DE CAMPANHAS EXTERNAS (BOOKING, PRODUTOS NATURAIS, ETC. - PHIA STYLE)
// ---------------------------------------------------------------------------

export const listExternalAffiliateCampaigns = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();

  const { data, error } = await supabase
    .from("external_affiliate_campaigns")
    .select("*")
    .eq("is_active", true)
    .order("default_commission_pct", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
});

/**
 * Adiciona uma campanha externa curada (Booking.com, Produtos Naturais, etc.)
 * diretamente na vitrine do criador com 1 clique (Phia Style).
 */
export const addExternalCampaignToCreatorShowcase = createServerFn({ method: "POST" })
  .validator(
    z.object({
      campaignId: z.string().uuid("ID de campanha inválido"),
      customTitle: z.string().max(120).optional(),
      customDescription: z.string().max(300).optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity?.id) {
      throw new Error("Não autenticado.");
    }

    // 1. Busca perfil de criador do usuário
    const { data: creator } = await supabase
      .from("creator_profiles")
      .select("id, handle")
      .eq("user_id", identity.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!creator) {
      throw new Error("Crie primeiro sua vitrine de criador para adicionar campanhas.");
    }

    // 2. Busca campanha externa
    const { data: campaign } = await supabase
      .from("external_affiliate_campaigns")
      .select("*")
      .eq("id", input.campaignId)
      .maybeSingle();

    if (!campaign) {
      throw new Error("Campanha não encontrada.");
    }

    // 3. Gera link de afiliação curado Phia com subid
    const curatedLink = generatePhiaCuratedAffiliateLink({
      baseUrl: campaign.base_url,
      paramTemplate: campaign.affiliate_param_template,
      affiliateHandle: creator.handle,
      affiliateUserId: identity.id,
    });

    // 4. Grava em creator_showcase_products como item curado
    const { data: savedItem, error } = await supabase
      .from("creator_showcase_products")
      .insert({
        creator_profile_id: creator.id,
        custom_title: input.customTitle || campaign.partner_name,
        custom_description: input.customDescription || campaign.headline,
        external_url: curatedLink,
        is_external_campaign: true,
        campaign_id: campaign.id,
        is_pinned: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[affiliate-ledger] Erro ao adicionar campanha à vitrine:", error);
      throw new Error("Falha ao adicionar campanha à vitrine.");
    }

    return {
      success: true,
      curatedLink,
      item: savedItem,
    };
  });

// ---------------------------------------------------------------------------
// 6. AUTORIZAÇÃO BILATERAL LOJA <-> AFILIADO
// ---------------------------------------------------------------------------

export const requestStoreAffiliatePartnership = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid("ID da loja inválido"),
      notes: z.string().max(300).optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity?.id) {
      throw new Error("Não autenticado.");
    }

    const { data, error } = await supabase
      .from("affiliate_store_partnerships")
      .upsert(
        {
          store_id: input.storeId,
          affiliate_user_id: identity.id,
          status: "approved", // Default aberto para conectar na hora
          notes: input.notes || null,
          approved_at: new Date().toISOString(),
        },
        { onConflict: "store_id, affiliate_user_id" }
      )
      .select()
      .single();

    if (error) {
      throw new Error("Falha ao registrar parceria com a loja.");
    }

    return { success: true, partnership: data };
  });
