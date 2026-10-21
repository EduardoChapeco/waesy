/**
 * giftcard.functions.ts — Motor Canônico de Vales-Presente (Gift Cards) no Ecossistema $WZ
 *
 * Responsabilidades:
 * 1. O Vale-Presente é um instrumento de emissão, entrega e resgate denominado em $WZ.
 * 2. Distinção estrita: Vale Comprado (PURCHASED, lastreado) vs Cortesia (MERCHANT_FUNDED, zero custo plataforma).
 * 3. Segredos gerados via CSPRNG de alta entropia e persistidos como hash criptográfico SHA-256.
 * 4. Resgate atômico cria ou vincula bucket em $WZ com escopo preservado (Loja X fica na Loja X).
 * 5. Experiência de presente rica: mockups 3D, mídia personalizada (foto/vídeo), abertura emocional e agendamento.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, getSSRClient } from "@/lib/server-access";
import { brlCentsToWz, wzToBrlCentsReference, formatWz } from "@/lib/wz-quote-engine";

// ── 1. UTILITÁRIOS CRIPTOGRÁFICOS SEGUROS (CSPRNG) ──

/**
 * Gera código de resgate seguro de alta entropia (16 caracteres legíveis, sem ambiguidade).
 * Exemplo: "WGC7-K9MQ-2X4V-P8TN"
 */
export function generateSecureGiftCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  let code = "WGC-";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Calcula hash SHA-256 do código de resgate
 */
export function hashGiftCardSecret(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Gera token opaco para links de visualização pública
 */
export function generateOpaqueClaimToken(): string {
  return randomBytes(24).toString("hex");
}

// ── 2. SCHEMAS ZOD ──

export const CreateGiftCardProductSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  headline: z.string().optional(),
  description: z.string().optional(),
  minAmountWz: z.number().int().min(10000).default(50000),
  maxAmountWz: z.number().int().min(10000).default(5000000),
  fixedDenominationsWz: z.array(z.number().int()).default([100000, 250000, 500000, 1000000]),
  allowCustomAmount: z.boolean().default(true),
  allowPersonalization: z.boolean().default(true),
  allowVideo: z.boolean().default(false),
  expiresInDays: z.number().int().optional().nullable(),
  designTemplates: z.array(z.record(z.any())).default([]),
});

export const PurchaseGiftCardOrderSchema = z.object({
  productId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(), // Opcional se for Vale Waesy Global
  amountWz: z.number().int().min(10000),
  recipientName: z.string().min(2),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
  recipientBindingType: z.enum(["BEARER", "WAESY_USER", "VERIFIED_CPF"]).default("BEARER"),
  recipientCpf: z.string().optional(),
  senderName: z.string().min(2),
  personalMessage: z.string().max(500).optional(),
  isAnonymous: z.boolean().default(false),
  cardDesignId: z.string().default("classic_gold"),
  scheduledDeliveryAt: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "ANIMATION"]).optional(),
});

export const ClaimGiftCardSchema = z.object({
  claimToken: z.string().optional(),
  code: z.string().optional(),
});

// ── 3. SERVER FUNCTIONS ──

/**
 * Lista produtos de Vale-Presente disponíveis no catálogo (Marketplace e Site da Loja)
 */
export const listGiftCardProducts = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      scope: z.enum(["GLOBAL", "MERCHANT"]).optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    let query = db
      .from("gift_card_products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (data?.storeId) {
      query = query.eq("store_id", data.storeId);
    }
    if (data?.scope) {
      query = query.eq("scope", data.scope);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.warn("[listGiftCardProducts] Erro ao buscar produtos:", error.message);
      return [];
    }

    return (rows || []).map((p: any) => ({
      id: p.id,
      store_id: p.store_id,
      name: p.name,
      slug: p.slug,
      headline: p.headline,
      description: p.description,
      scope: p.scope,
      min_amount_wz: Number(p.min_amount_wz || 50000),
      max_amount_wz: Number(p.max_amount_wz || 5000000),
      fixed_denominations_wz: p.fixed_denominations_wz || [100000, 250000, 500000, 1000000],
      allow_custom_amount: p.allow_custom_amount,
      allow_personalization: p.allow_personalization,
      allow_video: p.allow_video,
      design_templates: p.design_templates || [],
    }));
  });

/**
 * Cria pedido de compra de Vale-Presente (Passo 1 do Checkout)
 * Permanece em 'pending_payment' até a confirmação do pagamento
 */
export const createGiftCardOrder = createServerFn({ method: "POST" })
  .validator(PurchaseGiftCardOrderSchema)
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    const db = getServerClient();

    const rawCode = generateSecureGiftCode();
    const secretHash = hashGiftCardSecret(rawCode);
    const opaqueToken = generateOpaqueClaimToken();
    const codeDisplay = `•••• •••• ${rawCode.slice(-4)}`;

    let recipientBindingHash: string | null = null;
    if (input.recipientBindingType === "VERIFIED_CPF" && input.recipientCpf) {
      const cleanCpf = input.recipientCpf.replace(/\D/g, "");
      recipientBindingHash = createHash("sha256").update(cleanCpf).digest("hex");
    }

    // Inserir registro com status pending_payment
    const { data: giftCard, error } = await db
      .from("gift_cards")
      .insert({
        product_id: input.productId || null,
        store_id: input.storeId || null,
        issuer_type: input.storeId ? "MERCHANT" : "WAESY",
        funding_source: "PURCHASED",
        code: rawCode, // Mantido temporariamente no insert para compatibilidade com schema legado
        wz_initial: input.amountWz,
        wz_remaining: input.amountWz,
        initial_balance_cents: wzToBrlCentsReference(input.amountWz),
        current_balance_cents: wzToBrlCentsReference(input.amountWz),
        balance_cents: wzToBrlCentsReference(input.amountWz),
        purchaser_user_id: identity.id || null,
        recipient_name: input.recipientName,
        recipient_email: input.recipientEmail || null,
        recipient_phone: input.recipientPhone || null,
        recipient_binding_type: input.recipientBindingType,
        recipient_binding_hash: recipientBindingHash,
        redemption_code_hash: secretHash,
        code_display: codeDisplay,
        claim_token: opaqueToken,
        personal_message: input.personalMessage || null,
        sender_name: input.senderName,
        is_anonymous: input.isAnonymous,
        card_design_id: input.cardDesignId,
        scheduled_delivery_at: input.scheduledDeliveryAt ? new Date(input.scheduledDeliveryAt).toISOString() : null,
        status: "pending_payment", // Invariant: Nunca ativo antes do pagamento!
      })
      .select()
      .single();

    if (error || !giftCard) {
      console.error("[createGiftCardOrder] Erro ao gerar instância:", error);
      throw new Error(`Falha ao preparar pedido de vale-presente: ${error?.message || "Erro desconhecido"}`);
    }

    // Se houver mídia personalizada (foto ou vídeo), salva no registro de mídia
    if (input.mediaUrl && input.mediaType) {
      await db.from("gift_card_media").insert({
        gift_card_id: giftCard.id,
        media_type: input.mediaType,
        storage_key: input.mediaUrl,
        public_url: input.mediaUrl,
        mime_type: input.mediaType === "VIDEO" ? "video/mp4" : "image/jpeg",
        status: "ready",
      });
    }

    // Registrar evento CREATED
    await db.from("gift_card_events").insert({
      gift_card_id: giftCard.id,
      event_type: "CREATED",
      actor_id: identity.id || null,
      payload: {
        amount_wz: input.amountWz,
        recipient_name: input.recipientName,
        recipient_binding_type: input.recipientBindingType,
        is_scheduled: Boolean(input.scheduledDeliveryAt),
      },
    });

    const priceCents = wzToBrlCentsReference(input.amountWz);

    return {
      success: true,
      gift_card_id: giftCard.id,
      amount_wz: input.amountWz,
      amount_formatted: formatWz(input.amountWz),
      price_cents: priceCents,
      price_formatted: (priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      claim_token: opaqueToken,
      status: "pending_payment",
    };
  });

/**
 * Confirmação Financeira do Vale-Presente (Após confirmação do Gateway ou Pagamento Real)
 * Ativa o cartão, emite eventos e libera o link/código
 */
export const confirmGiftCardPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      giftCardId: z.string().uuid(),
      paymentId: z.string().min(3),
      orderId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const db = getServerClient();

    const { data: card, error: findErr } = await db
      .from("gift_cards")
      .select("*")
      .eq("id", input.giftCardId)
      .single();

    if (findErr || !card) {
      throw new Error("Vale-presente não localizado.");
    }

    const isScheduled = card.scheduled_delivery_at && new Date(card.scheduled_delivery_at) > new Date();
    const newStatus = isScheduled ? "scheduled" : "active";

    // Atualiza status para active / scheduled
    await db
      .from("gift_cards")
      .update({
        status: newStatus,
        payment_id: input.paymentId,
        order_id: input.orderId || null,
        delivered_at: isScheduled ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", card.id);

    // Registra eventos PAYMENT_CONFIRMED e ISSUED
    await db.from("gift_card_events").insert([
      {
        gift_card_id: card.id,
        event_type: "PAYMENT_CONFIRMED",
        payload: { payment_id: input.paymentId, order_id: input.orderId },
      },
      {
        gift_card_id: card.id,
        event_type: isScheduled ? "SCHEDULED" : "ISSUED",
        payload: { status: newStatus, amount_wz: card.wz_initial },
      },
    ]);

    return {
      success: true,
      gift_card_id: card.id,
      status: newStatus,
      claim_url: `/gift/${card.claim_token}`,
      code: card.code, // Retorna código real ao comprador
      code_display: card.code_display,
    };
  });

/**
 * Busca detalhes do Vale-Presente via Token Opaco de Resgate (/gift/:token)
 * Página de Abertura do Destinatário
 */
export const getGiftCardByClaimToken = createServerFn({ method: "GET" })
  .validator(z.object({ claimToken: z.string().min(8) }))
  .handler(async ({ data: { claimToken } }) => {
    const db = getServerClient();

    const { data: card, error } = await db
      .from("gift_cards")
      .select(`
        id,
        store_id,
        issuer_type,
        funding_source,
        wz_initial,
        wz_remaining,
        recipient_name,
        sender_name,
        is_anonymous,
        personal_message,
        card_design_id,
        code_display,
        claim_token,
        status,
        recipient_binding_type,
        expires_at,
        created_at,
        media:gift_card_media(*)
      `)
      .eq("claim_token", claimToken)
      .maybeSingle();

    if (error || !card) {
      throw new Error("Vale-presente não encontrado ou link expirado.");
    }

    // Se o cartão estava em 'active' ou 'delivered' e é a primeira abertura, marca OPENED
    if (card.status === "active" || card.status === "delivered") {
      await db
        .from("gift_cards")
        .update({ opened_at: new Date().toISOString(), status: "opened" })
        .eq("id", card.id);

      await db.from("gift_card_events").insert({
        gift_card_id: card.id,
        event_type: "OPENED",
        payload: { opened_at: new Date().toISOString() },
      });
    }

    // Buscar dados do emissor (Loja ou Waesy Global)
    let issuerName = "Waesy Global";
    let issuerLogo: string | null = null;
    let issuerSlug: string | null = null;

    if (card.store_id) {
      const { data: store } = await db
        .from("stores")
        .select("name, logo_url, slug")
        .eq("id", card.store_id)
        .single();

      if (store) {
        issuerName = store.name;
        issuerLogo = store.logo_url;
        issuerSlug = store.slug;
      }
    }

    const wzAmount = Number(card.wz_remaining || card.wz_initial || 0);
    const refCents = wzToBrlCentsReference(wzAmount);

    return {
      id: card.id,
      issuer_type: card.issuer_type,
      issuer_name: issuerName,
      issuer_logo: issuerLogo,
      issuer_slug: issuerSlug,
      scope_type: card.store_id ? "MERCHANT" : "GLOBAL",
      wz_initial: Number(card.wz_initial || 0),
      wz_remaining: wzAmount,
      wz_formatted: formatWz(wzAmount),
      reference_brl: (refCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      sender_name: card.is_anonymous ? "Um amigo secreto" : card.sender_name || "Alguém especial",
      recipient_name: card.recipient_name,
      personal_message: card.personal_message,
      card_design_id: card.card_design_id || "classic_gold",
      status: card.status,
      media: (card.media || [])[0] || null,
      recipient_binding_type: card.recipient_binding_type,
      created_at: card.created_at,
    };
  });

/**
 * Resgatar e Vincular Vale-Presente à Conta do Usuário Autenticado
 * Suporta resgate via claimToken (link direto) ou digitação manual do código
 */
export const claimGiftCard = createServerFn({ method: "POST" })
  .validator(ClaimGiftCardSchema)
  .handler(async ({ data: { claimToken, code } }) => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Você precisa estar autenticado para resgatar este presente em sua conta $WZ.");
    }

    const db = getServerClient();

    let targetClaimToken = claimToken;

    // Se informou código manual, localiza pelo hash SHA-256
    if (!targetClaimToken && code) {
      const secretHash = hashGiftCardSecret(code);
      const { data: foundCard } = await db
        .from("gift_cards")
        .select("claim_token")
        .eq("redemption_code_hash", secretHash)
        .maybeSingle();

      if (!foundCard) {
        // Fallback defensivo para verificar código limpo legado
        const cleanCode = code.trim().toUpperCase();
        const { data: legacyCard } = await db
          .from("gift_cards")
          .select("claim_token")
          .eq("code", cleanCode)
          .maybeSingle();

        if (!legacyCard) {
          throw new Error("Código de vale-presente inválido ou não localizado.");
        }
        targetClaimToken = legacyCard.claim_token;
      } else {
        targetClaimToken = foundCard.claim_token;
      }
    }

    if (!targetClaimToken) {
      throw new Error("Identificador do vale-presente não fornecido.");
    }

    // Buscar CPF do usuário para verificação de binding (se aplicável)
    const { data: profile } = await db
      .from("profiles")
      .select("cpf")
      .eq("id", identity.id)
      .single();

    let userCpfHash: string | null = null;
    if (profile?.cpf) {
      const cleanCpf = profile.cpf.replace(/\D/g, "");
      userCpfHash = createHash("sha256").update(cleanCpf).digest("hex");
    }

    // Invocar RPC atômica de claim
    const { data: rpcRes, error } = await db.rpc("wz_claim_gift_card_atomic", {
      p_user_id: identity.id,
      p_claim_token: targetClaimToken,
      p_user_cpf_hash: userCpfHash,
    });

    if (error || !(rpcRes as any)?.success) {
      const msg = error?.message || (rpcRes as any)?.message || "Erro ao resgatar cartão.";
      throw new Error(msg);
    }

    return {
      success: true,
      wz_claimed: (rpcRes as any).wz_claimed,
      wz_formatted: formatWz((rpcRes as any).wz_claimed),
      scope_type: (rpcRes as any).scope_type,
      message: (rpcRes as any).message,
    };
  });

/**
 * Central "Meus Vales": Lista vales Recebidos (com saldo em WZ) e Enviados (com tracking)
 */
export const listUserGiftCards = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  if (!identity.id) {
    return { received: [], sent: [] };
  }

  const db = getServerClient();

  // 1. Vales Recebidos (vinculados ao usuário ou claimed)
  const { data: receivedRows } = await db
    .from("gift_cards")
    .select(`
      id,
      store_id,
      issuer_type,
      wz_initial,
      wz_remaining,
      sender_name,
      personal_message,
      card_design_id,
      code_display,
      status,
      claimed_at,
      store:stores(name, logo_url, slug)
    `)
    .eq("recipient_user_id", identity.id)
    .order("claimed_at", { ascending: false });

  // 2. Vales Enviados (comprados pelo usuário para terceiros)
  const { data: sentRows } = await db
    .from("gift_cards")
    .select(`
      id,
      store_id,
      wz_initial,
      wz_remaining,
      recipient_name,
      recipient_email,
      card_design_id,
      code_display,
      claim_token,
      status,
      delivered_at,
      opened_at,
      claimed_at,
      created_at,
      store:stores(name, logo_url, slug)
    `)
    .eq("purchaser_user_id", identity.id)
    .order("created_at", { ascending: false });

  const formatCard = (c: any) => {
    const store = c.store || {};
    const wzRem = Number(c.wz_remaining || 0);
    return {
      id: c.id,
      issuer_name: store.name || "Waesy Global",
      issuer_logo: store.logo_url || null,
      issuer_slug: store.slug || null,
      wz_initial: Number(c.wz_initial || 0),
      wz_remaining: wzRem,
      wz_remaining_formatted: formatWz(wzRem),
      recipient_name: c.recipient_name,
      sender_name: c.sender_name,
      card_design_id: c.card_design_id || "classic_gold",
      code_display: c.code_display || "•••• ••••",
      claim_token: c.claim_token,
      status: c.status,
      delivered_at: c.delivered_at,
      opened_at: c.opened_at,
      claimed_at: c.claimed_at,
      created_at: c.created_at,
    };
  };

  return {
    received: (receivedRows || []).map(formatCard),
    sent: (sentRows || []).map(formatCard),
  };
});

/**
 * Lojista: Listar Vales-Presente do Workspace
 * Separa Vales Vendidos (PURCHASED) de Cortesias Promocionais (MERCHANT_FUNDED)
 */
export const listMerchantGiftCards = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  if (!identity.store_id) {
    throw new Error("Nenhuma loja ativa selecionada.");
  }
  assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

  const db = getServerClient();

  const { data: cards, error } = await db
    .from("gift_cards")
    .select(`
      id,
      funding_source,
      wz_initial,
      wz_remaining,
      status,
      recipient_name,
      recipient_email,
      sender_name,
      code_display,
      created_at,
      claimed_at,
      purchaser_profile:profiles!gift_cards_purchaser_id_fkey(full_name)
    `)
    .eq("store_id", identity.store_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[listMerchantGiftCards] Erro:", error.message);
    return { cards: [], stats: { totalSoldWz: 0, totalRedeemedWz: 0, activeCount: 0 } };
  }

  let totalSoldWz = 0;
  let totalRedeemedWz = 0;
  let activeCount = 0;

  const formattedCards = (cards || []).map((c: any) => {
    const initWz = Number(c.wz_initial || 0);
    const remWz = Number(c.wz_remaining || 0);
    const redeemedWz = initWz - remWz;

    if (c.funding_source === "PURCHASED") {
      totalSoldWz += initWz;
      totalRedeemedWz += redeemedWz;
    }

    if (c.status === "active" || c.status === "opened" || c.status === "delivered") {
      activeCount++;
    }

    return {
      id: c.id,
      funding_source: c.funding_source,
      wz_initial: initWz,
      wz_remaining: remWz,
      wz_formatted: formatWz(remWz),
      status: c.status,
      recipient_name: c.recipient_name || "Não informado",
      recipient_email: c.recipient_email || null,
      code_display: c.code_display || "•••• ••••",
      created_at: c.created_at,
      claimed_at: c.claimed_at,
      purchaser_name: c.purchaser_profile?.full_name || c.sender_name || "Cliente",
    };
  });

  return {
    cards: formattedCards,
    stats: {
      totalSoldWz,
      totalSoldWz_formatted: formatWz(totalSoldWz),
      totalRedeemedWz,
      totalRedeemedWz_formatted: formatWz(totalRedeemedWz),
      activeCount,
    },
  };
});

/**
 * Lojista: Criar Produto de Vale-Presente no Catálogo da Loja
 */
export const createMerchantGiftCardProduct = createServerFn({ method: "POST" })
  .validator(CreateGiftCardProductSchema)
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    if (!identity.store_id) {
      throw new Error("Nenhuma loja ativa selecionada.");
    }
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const db = getServerClient();

    const { data: product, error } = await db
      .from("gift_card_products")
      .insert({
        store_id: identity.store_id,
        issuer_type: "MERCHANT",
        name: input.name,
        slug: input.slug,
        headline: input.headline || null,
        description: input.description || null,
        scope: "MERCHANT",
        min_amount_wz: input.minAmountWz,
        max_amount_wz: input.maxAmountWz,
        fixed_denominations_wz: input.fixedDenominationsWz,
        allow_custom_amount: input.allowCustomAmount,
        allow_personalization: input.allowPersonalization,
        allow_video: input.allowVideo,
        expires_in_days: input.expiresInDays || null,
        design_templates: input.designTemplates,
        is_active: true,
      })
      .select()
      .single();

    if (error || !product) {
      throw new Error(`Erro ao cadastrar produto de vale-presente: ${error?.message || "Erro desconhecido"}`);
    }

    return {
      success: true,
      product,
      message: "Produto de Vale-Presente criado com sucesso no catálogo da loja!",
    };
  });

/**
 * Cancelar Vale-Presente (Ação Administrativa)
 */
export const cancelGiftCard = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const db = getServerClient();

    const { error } = await db
      .from("gift_cards")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("store_id", identity.store_id);

    if (error) {
      throw new Error("Erro ao cancelar vale-presente.");
    }

    await db.from("gift_card_events").insert({
      gift_card_id: id,
      event_type: "CANCELLED",
      actor_id: identity.id || null,
      payload: { cancelled_at: new Date().toISOString() },
    });

    return { success: true, message: "Vale-presente cancelado com sucesso." };
  });

/**
 * Consulta de Saldo de Cartão-Presente (Isomórfica para Checkout)
 */
export const checkGiftCardBalance = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().min(4) }))
  .handler(async ({ data: { code } }) => {
    const db = getServerClient();
    const secretHash = hashGiftCardSecret(code);

    const { data: card } = await db
      .from("gift_cards")
      .select("id, store_id, wz_remaining, balance_cents, current_balance_cents, status, expires_at")
      .or(`redemption_code_hash.eq.${secretHash},code.eq.${code.trim().toUpperCase()}`)
      .limit(1)
      .maybeSingle();

    if (!card) throw new Error("Vale-presente não encontrado.");
    if (card.status !== "active" && card.status !== "opened" && card.status !== "delivered") {
      throw new Error("Este vale-presente já foi utilizado ou está inativo.");
    }

    const wzBal = Number(card.wz_remaining || 0);
    const balanceCents = card.balance_cents || card.current_balance_cents || wzToBrlCentsReference(wzBal);

    return {
      id: card.id,
      store_id: card.store_id,
      balanceWz: wzBal,
      balanceCents: balanceCents,
      status: card.status,
    };
  });
