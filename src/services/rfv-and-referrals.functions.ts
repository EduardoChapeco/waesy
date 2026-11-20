/**
 * rfv-and-referrals.functions.ts — BFF para Máquina de Estados RFV, Carteira de Indicação
 * (Referral Wallet com alertas 30d/7d/1d e abatimento 1-clique) e Gatilhos Pós-Venda (D-30, D-2, D+2).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { evaluateCustomerRfvLifecycle, type RfvEvaluationResult } from "@/lib/crm/rfv-lifecycle-engine";

export const recalculateCustomerRfvLifecycleFn = createServerFn({ method: "POST" })
  .validator(z.object({ customerId: z.string().uuid() }))
  .handler(async ({ data: { customerId } }): Promise<RfvEvaluationResult> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();
    const storeId = identity.store_id;

    const [storeRes, custRes, ordersRes, tripsRes, proposalsRes, leadsRes] = await Promise.all([
      db.from("stores").select("primary_niche_id").eq("id", storeId).maybeSingle(),
      db.from("customers_crm").select("*").eq("id", customerId).eq("store_id", storeId).maybeSingle(),
      db.from("orders").select("id, total_cents, status, created_at").eq("store_id", storeId).eq("customer_id", customerId),
      db.from("tourism_trips").select("id, total_cents, status, created_at").eq("store_id", storeId).eq("customer_id", customerId),
      db.from("travel_proposals").select("id, pricing, status, approved_at, created_at").eq("store_id", storeId).eq("customer_id", customerId).eq("status", "approved"),
      db.from("leads_crm").select("id, status").eq("store_id", storeId).eq("customer_id", customerId),
    ]);

    if (!custRes.data) throw new Error("Cliente não encontrado no CRM.");

    let purchasesCount = 0;
    let totalSpentCents = 0;
    let latestPurchaseMs = 0;

    for (const o of ordersRes.data || []) {
      if (["paid", "processing", "ready_for_pickup", "shipped", "delivered", "completed"].includes(String(o.status))) {
        purchasesCount++;
        totalSpentCents += Number(o.total_cents || 0);
        const t = Date.parse(String(o.created_at || "")) || 0;
        if (t > latestPurchaseMs) latestPurchaseMs = t;
      }
    }
    for (const tr of tripsRes.data || []) {
      if (!["cancelled", "draft"].includes(String(tr.status || ""))) {
        purchasesCount++;
        totalSpentCents += Number((tr as any).total_cents || 0);
        const t = Date.parse(String(tr.created_at || "")) || 0;
        if (t > latestPurchaseMs) latestPurchaseMs = t;
      }
    }
    for (const tp of proposalsRes.data || []) {
      const propTotal = Number((tp as any)?.pricing?.total_cents || (tp as any)?.pricing?.totalCents || 0);
      if (propTotal > 0 && (tripsRes.data || []).length === 0) {
        purchasesCount++;
        totalSpentCents += propTotal;
        const t = Date.parse(String((tp as any).approved_at || tp.created_at || "")) || 0;
        if (t > latestPurchaseMs) latestPurchaseMs = t;
      }
    }

    const daysSinceLastPurchase = latestPurchaseMs > 0
      ? Math.max(0, Math.floor((Date.now() - latestPurchaseMs) / 86_400_000))
      : null;

    const leads = leadsRes.data || [];
    const openOpportunitiesCount = leads.filter((l: any) =>
      ["proposal", "negotiation", "qualified", "in_progress"].includes(String(l.status)),
    ).length;
    const lostOpportunitiesCount = leads.filter((l: any) =>
      ["lost", "archived"].includes(String(l.status)),
    ).length;

    const evaluated = evaluateCustomerRfvLifecycle({
      nicheId: (storeRes.data as any)?.primary_niche_id || "general",
      purchasesCount,
      totalSpentCents,
      daysSinceLastPurchase,
      openOpportunitiesCount,
      lostOpportunitiesCount,
      hasAnyLeadOrContact: true,
      lastNpsScore: (custRes.data as any).last_nps_score ?? null,
      referralsConvertedCount: Number((custRes.data as any).referrals_converted_count || 0),
    });

    await db
      .from("customers_crm")
      .update({
        rfv_stage: evaluated.stage,
        rfv_score: evaluated.score,
        total_orders: purchasesCount,
        total_spent_cents: totalSpentCents,
        ...(latestPurchaseMs > 0 ? { last_order_at: new Date(latestPurchaseMs).toISOString() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .eq("store_id", storeId);

    return evaluated;
  });

export const grantCustomerReferralCreditFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      advocateCustomerId: z.string().uuid(),
      referredCustomerId: z.string().uuid().optional().nullable(),
      referredLeadId: z.string().uuid().optional().nullable(),
      amountCents: z.number().int().positive().max(10_000_000),
      expiresInDays: z.number().int().min(7).max(730).default(180),
      reason: z.string().trim().max(240).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);
    const db = getServerClient();
    const storeId = identity.store_id;

    const { data: advocate } = await db
      .from("customers_crm")
      .select("id, full_name, referral_credit_balance_cents, referrals_converted_count")
      .eq("id", data.advocateCustomerId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (!advocate) throw new Error("Cliente indicador não encontrado.");

    const expiresAt = new Date(Date.now() + data.expiresInDays * 86_400_000).toISOString();
    const { data: credit, error: credErr } = await db
      .from("customer_referral_credits")
      .insert({
        store_id: storeId,
        advocate_customer_id: advocate.id,
        referred_customer_id: data.referredCustomerId || null,
        referred_lead_id: data.referredLeadId || null,
        amount_cents: data.amountCents,
        remaining_cents: data.amountCents,
        status: "active",
        reason: data.reason || "Bônus de indicação convertida (Member Get Member)",
        expires_at: expiresAt,
      })
      .select("id, amount_cents, remaining_cents, expires_at")
      .single();

    if (credErr || !credit) throw new Error(`Falha ao emitir crédito de indicação: ${credErr?.message}`);

    await db.from("referral_credit_ledger").insert({
      store_id: storeId,
      credit_id: credit.id,
      customer_id: advocate.id,
      entry_type: "grant",
      amount_cents: data.amountCents,
      notes: data.reason || "Concessão de crédito de indicação",
      created_by: identity.id,
    });

    const newBalance = Number((advocate as any).referral_credit_balance_cents || 0) + data.amountCents;
    const newRefCount = Number((advocate as any).referrals_converted_count || 0) + 1;

    await db
      .from("customers_crm")
      .update({
        referral_credit_balance_cents: newBalance,
        referrals_converted_count: newRefCount,
        rfv_stage: "promoter",
        updated_at: new Date().toISOString(),
      })
      .eq("id", advocate.id)
      .eq("store_id", storeId);

    return {
      success: true,
      creditId: credit.id,
      newBalanceCents: newBalance,
      expiresAt,
    };
  });

export const redeemReferralCreditOnProposalOrOrderFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      customerId: z.string().uuid(),
      amountToRedeemCents: z.number().int().positive(),
      targetEntityType: z.enum(["travel_proposal", "order"]),
      targetEntityId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);
    const db = getServerClient();
    const storeId = identity.store_id;
    const nowIso = new Date().toISOString();

    const { data: activeCredits } = await db
      .from("customer_referral_credits")
      .select("id, remaining_cents, expires_at")
      .eq("store_id", storeId)
      .eq("advocate_customer_id", data.customerId)
      .eq("status", "active")
      .gt("remaining_cents", 0)
      .gt("expires_at", nowIso)
      .order("expires_at", { ascending: true });

    const totalAvailable = (activeCredits || []).reduce((acc, c: any) => acc + Number(c.remaining_cents || 0), 0);
    if (totalAvailable <= 0) {
      throw new Error("Cliente não possui créditos de indicação ativos disponíveis.");
    }

    const effectiveRedeem = Math.min(totalAvailable, data.amountToRedeemCents);
    let remainingToDeduct = effectiveRedeem;

    for (const c of activeCredits || []) {
      if (remainingToDeduct <= 0) break;
      const avail = Number((c as any).remaining_cents || 0);
      const deduct = Math.min(avail, remainingToDeduct);
      const nextRemaining = avail - deduct;

      await db
        .from("customer_referral_credits")
        .update({
          remaining_cents: nextRemaining,
          status: nextRemaining === 0 ? "redeemed" : "active",
          updated_at: nowIso,
        })
        .eq("id", c.id)
        .eq("store_id", storeId);

      await db.from("referral_credit_ledger").insert({
        store_id: storeId,
        credit_id: c.id,
        customer_id: data.customerId,
        entry_type: "redemption",
        amount_cents: -deduct,
        target_entity_type: data.targetEntityType,
        target_entity_id: data.targetEntityId,
        notes: `Abatimento aplicado em ${data.targetEntityType} (${data.targetEntityId})`,
        created_by: identity.id,
      });

      remainingToDeduct -= deduct;
    }

    const nextBalance = Math.max(0, totalAvailable - effectiveRedeem);
    await db
      .from("customers_crm")
      .update({
        referral_credit_balance_cents: nextBalance,
        updated_at: nowIso,
      })
      .eq("id", data.customerId)
      .eq("store_id", storeId);

    // Se o alvo for uma proposta de viagem, registra o desconto na estrutura pricing
    if (data.targetEntityType === "travel_proposal") {
      const { data: prop } = await db
        .from("travel_proposals")
        .select("id, pricing")
        .eq("id", data.targetEntityId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (prop) {
        const curPricing = (prop.pricing && typeof prop.pricing === "object" ? prop.pricing : {}) as Record<string, any>;
        const prevTotal = Number(curPricing.total_price_cents ?? curPricing.total_cents ?? 0);
        const newTotal = Math.max(0, prevTotal - effectiveRedeem);
        await db
          .from("travel_proposals")
          .update({
            pricing: {
              ...curPricing,
              referral_discount_cents: Number(curPricing.referral_discount_cents || 0) + effectiveRedeem,
              total_price_cents: newTotal,
              total_cents: newTotal,
            },
            updated_at: nowIso,
          })
          .eq("id", prop.id)
          .eq("store_id", storeId);
      }
    }

    return {
      success: true,
      redeemedCents: effectiveRedeem,
      remainingBalanceCents: nextBalance,
    };
  });

/**
 * Runner de Gatilhos Temporais Pós-Venda (D-30, D-2, D+2, Aniversário, Passaporte e Expiração de Cashback 30d/7d/1d).
 */
export const runPostSaleAndReferralDateTriggersFn = createServerFn({ method: "POST" })
  .handler(async () => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    const db = getServerClient();
    const storeId = identity.store_id;
    const now = new Date();
    const nowIso = now.toISOString();

    const { data: waInstance } = await db
      .from("whatsapp_channel_instances")
      .select("id, provider")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let creditAlertsQueued = 0;
    let tripTriggersQueued = 0;

    // 1. Alertas de Expiração de Crédito de Indicação (30d, 7d, 1d)
    const { data: credits } = await db
      .from("customer_referral_credits")
      .select("id, advocate_customer_id, remaining_cents, expires_at, alert_30d_sent_at, alert_7d_sent_at, alert_1d_sent_at, customer:advocate_customer_id(full_name, phone, whatsapp_opt_out)")
      .eq("store_id", storeId)
      .eq("status", "active")
      .gt("remaining_cents", 0)
      .gt("expires_at", nowIso)
      .limit(100);

    for (const c of credits || []) {
      const cust = (c as any).customer;
      if (!cust || cust.whatsapp_opt_out === true) continue;
      const phone = String(cust.phone || "").replace(/\D/g, "");
      if (phone.length < 10 || !waInstance?.id) continue;

      const daysLeft = Math.ceil((new Date(String(c.expires_at)).getTime() - now.getTime()) / 86_400_000);
      let bucket: "1d" | "7d" | "30d" | null = null;
      if (daysLeft <= 1 && !c.alert_1d_sent_at) bucket = "1d";
      else if (daysLeft <= 7 && !c.alert_7d_sent_at) bucket = "7d";
      else if (daysLeft <= 30 && !c.alert_30d_sent_at) bucket = "30d";
      if (!bucket) continue;

      const valDisplay = (Number(c.remaining_cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const firstName = String(cust.full_name || "Cliente").split(/\s+/)[0];
      const msg = `Olá ${firstName}! Você possui *${valDisplay}* em créditos de indicação disponíveis na sua carteira, que vencem em *${daysLeft} dia(s)*. Quer aproveitar para abater na sua próxima reserva?`;

      await db.from("whatsapp_outbox").upsert(
        {
          store_id: storeId,
          channel_instance_id: waInstance.id,
          provider: waInstance.provider || "evolution_api",
          idempotency_key: `referral_exp_${bucket}:${c.id}`,
          recipient_phone: phone,
          message_type: "text",
          payload: { text: msg, origin: "lifecycle_automation" },
          status: "pending",
        },
        { onConflict: "store_id,idempotency_key", ignoreDuplicates: true },
      );

      const patchCol = bucket === "1d" ? { alert_1d_sent_at: nowIso } : bucket === "7d" ? { alert_7d_sent_at: nowIso } : { alert_30d_sent_at: nowIso };
      await db.from("customer_referral_credits").update(patchCol).eq("id", c.id);
      creditAlertsQueued++;
    }

    // 2. Gatilhos de Viagem (D-30, D-2 de Embarque e D+2 de Retorno)
    const { data: trips } = await db
      .from("tourism_trips")
      .select("id, title, destination_city, travel_start_date, travel_end_date, customer_id, client_name, client_whatsapp")
      .eq("store_id", storeId)
      .not("status", "in", '("cancelled","draft")')
      .limit(100);

    for (const tr of trips || []) {
      const phone = String((tr as any).client_whatsapp || "").replace(/\D/g, "");
      if (phone.length < 10 || !waInstance?.id) continue;
      const firstName = String((tr as any).client_name || "Viajante").split(/\s+/)[0];
      const dest = (tr as any).destination_city || tr.title || "sua viagem";

      if (tr.travel_start_date) {
        const daysToStart = Math.round((new Date(String(tr.travel_start_date)).getTime() - now.getTime()) / 86_400_000);
        if (daysToStart === 30 || daysToStart === 2) {
          const tag = daysToStart === 30 ? "D-30" : "D-2";
          const text =
            daysToStart === 30
              ? `Oi ${firstName}! Faltam 30 dias para sua viagem para *${dest}*. Já conferiu a validade dos seus documentos/passaporte e seguro viagem? Qualquer dúvida, estamos por aqui!`
              : `Oi ${firstName}! Faltam só 2 dias para o embarque para *${dest}*! Seus vouchers e cartões de embarque já estão disponíveis no portal: https://waesy.com.br/conta/viagens — excelente viagem!`;

          await db.from("whatsapp_outbox").upsert(
            {
              store_id: storeId,
              channel_instance_id: waInstance.id,
              provider: waInstance.provider || "evolution_api",
              idempotency_key: `trip_${tag}:${tr.id}`,
              recipient_phone: phone,
              message_type: "text",
              payload: { text, origin: "lifecycle_automation", agent_slug: "turis_pos_venda_anti_ansiedade" },
              status: "pending",
            },
            { onConflict: "store_id,idempotency_key", ignoreDuplicates: true },
          );
          tripTriggersQueued++;
        }
      }

      if (tr.travel_end_date) {
        const daysSinceReturn = Math.round((now.getTime() - new Date(String(tr.travel_end_date)).getTime()) / 86_400_000);
        if (daysSinceReturn === 2) {
          const reviewToken = `trip-${tr.id}`;
          await db.from("review_booster_submissions").upsert(
            {
              store_id: storeId,
              token: reviewToken,
              customer_id: tr.customer_id || null,
              trip_id: tr.id,
              customer_name: String((tr as any).client_name || "Viajante"),
              customer_phone: phone,
              destination_or_item: dest,
              status: "pending",
            },
            { onConflict: "token", ignoreDuplicates: true },
          );

          const text = `Bem-vindo(a) de volta, ${firstName}! Como foi sua experiência em *${dest}*? Preparamos um link rapidinho (30 segundos) para você avaliar como foi tudo: https://waesy.com.br/avaliar/${reviewToken}`;
          await db.from("whatsapp_outbox").upsert(
            {
              store_id: storeId,
              channel_instance_id: waInstance.id,
              provider: waInstance.provider || "evolution_api",
              idempotency_key: `trip_D+2:${tr.id}`,
              recipient_phone: phone,
              message_type: "text",
              payload: { text, origin: "lifecycle_automation", agent_slug: "turis_pos_venda_anti_ansiedade" },
              status: "pending",
            },
            { onConflict: "store_id,idempotency_key", ignoreDuplicates: true },
          );
          tripTriggersQueued++;
        }
      }
    }

    return {
      success: true,
      creditAlertsQueued,
      tripTriggersQueued,
      executedAt: nowIso,
    };
  });
