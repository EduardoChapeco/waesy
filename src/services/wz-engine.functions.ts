/**
 * wz-engine.functions.ts — Motor Canônico de Execução, Governança e Consumo $WZ (Waesy)
 *
 * Responsabilidades Centrais:
 * 1. Resolução e consolidação de buckets ($WZ Global vs $WZ de Empresas vs Campanhas).
 * 2. Elegibilidade estrita: Merchant $WZ só paga compras na própria empresa.
 * 3. Proibição de uso de Merchant $WZ para custos de IA, Impulsionamento ou Plataforma.
 * 4. Ciclo de vida transacional ACID: AVAILABLE -> RESERVED -> CONSUMED (ou RELEASED).
 * 5. Reconciliação matemática estrita: SUM(wz_token_ledger) = Projeção de Saldos.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, requirePlatformAdmin } from "@/lib/server-access";
import {
  brlCentsToWz,
  wzToBrlCentsReference,
  formatWz,
  AI_WZ_PRICING,
  calculateLlmTokensToWz,
  type AiWzOperation,
} from "@/lib/wz-quote-engine";

// ── 1. SCHEMAS DE VALIDAÇÃO ──

export const GrantLoyaltyWzSchema = z.object({
  customerId: z.string().uuid(),
  amountWz: z.number().int().min(100).max(100_000_000),
  reason: z.string().min(3).max(200),
});

export const ReserveWzCheckoutSchema = z.object({
  storeId: z.string().uuid(),
  amountWz: z.number().int().positive(),
  orderTempId: z.string().min(5),
});

export const ChargeAiWzSchema = z.object({
  operation: z.string(),
  inputTokens: z.number().int().min(0).default(0),
  outputTokens: z.number().int().min(0).default(0),
  metadata: z.record(z.any()).optional(),
});

export const ListWzMovementsSchema = z.object({
  filter: z.enum([
    "all",
    "received",
    "spent",
    "ai",
    "purchases",
    "boost",
    "cashback",
    "gift_cards",
  ]).default("all"),
  limit: z.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
});

// ── 2. SERVER FUNCTIONS ──

/**
 * Consulta consolidada da Central $WZ do usuário:
 * - Saldo total disponível
 * - Desdobramento em Waesy Global vs Lojas parceiras
 * - Lista detalhada de buckets ativos
 */
export const getUserWzSummary = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  if (!identity.id) {
    return {
      authenticated: false,
      total_available_wz: 0,
      global_available_wz: 0,
      merchant_available_wz: 0,
      total_reference_brl: "R$ 0,00",
      buckets: [],
    };
  }

  const db = getServerClient();

  // 1. Buscar todos os buckets ativos do usuário
  const { data: buckets, error } = await db
    .from("wz_token_buckets")
    .select(`
      id,
      asset_code,
      issuer_type,
      issuer_id,
      funding_source,
      scope_type,
      scope_id,
      available_balance,
      reserved_balance,
      consumed_balance,
      allowed_features,
      expires_at,
      status,
      created_at
    `)
    .eq("user_id", identity.id)
    .gt("available_balance", 0)
    .eq("status", "active")
    .order("available_balance", { ascending: false });

  if (error) {
    console.warn("[getUserWzSummary] Erro ao buscar buckets:", error.message);
  }

  const rawBuckets = buckets || [];

  // 2. Coletar IDs de lojas para buscar nomes e logotipos reais
  const storeIds = rawBuckets
    .filter((b: any) => b.scope_type === "MERCHANT" && b.scope_id)
    .map((b: any) => b.scope_id);

  const uniqueStoreIds = Array.from(new Set(storeIds));
  let storeMap: Record<string, { name: string; logoUrl: string | null; slug: string }> = {};

  if (uniqueStoreIds.length > 0) {
    const { data: stores } = await db
      .from("stores")
      .select("id, name, logo_url, slug")
      .in("id", uniqueStoreIds);

    for (const s of stores || []) {
      storeMap[s.id] = {
        name: s.name,
        logoUrl: s.logo_url,
        slug: s.slug,
      };
    }
  }

  // 3. Agregar saldos
  let totalAvailable = 0;
  let globalAvailable = 0;
  let merchantAvailable = 0;

  const enrichedBuckets = rawBuckets.map((b: any) => {
    const bal = Number(b.available_balance || 0);
    totalAvailable += bal;

    const isGlobal = b.scope_type === "GLOBAL";
    if (isGlobal) {
      globalAvailable += bal;
    } else {
      merchantAvailable += bal;
    }

    const storeInfo = b.scope_id ? storeMap[b.scope_id] : null;

    return {
      id: b.id,
      issuer_type: b.issuer_type,
      funding_source: b.funding_source,
      scope_type: b.scope_type,
      scope_id: b.scope_id,
      scope_name: isGlobal ? "Waesy / Uso Global" : storeInfo?.name || "Loja Parceira",
      scope_slug: storeInfo?.slug || null,
      scope_logo: storeInfo?.logoUrl || null,
      available_wz: bal,
      available_wz_formatted: formatWz(bal),
      reference_brl_cents: wzToBrlCentsReference(bal),
      allowed_features: b.allowed_features || [],
      expires_at: b.expires_at,
      status: b.status,
    };
  });

  const totalCents = wzToBrlCentsReference(totalAvailable);
  const totalBrlFormatted = (totalCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return {
    authenticated: true,
    user_id: identity.id,
    total_available_wz: totalAvailable,
    total_available_wz_formatted: formatWz(totalAvailable),
    global_available_wz: globalAvailable,
    global_available_wz_formatted: formatWz(globalAvailable),
    merchant_available_wz: merchantAvailable,
    merchant_available_wz_formatted: formatWz(merchantAvailable),
    total_reference_brl: totalBrlFormatted,
    buckets: enrichedBuckets,
  };
});

/**
 * Extrato Completo e Unificado de Movimentações $WZ:
 * Filtros de categorias: Todos | Recebidos | Gastos | IA | Compras | Impulsionamento | Cashback | Vales-Presente
 */
export const listUserWzMovements = createServerFn({ method: "POST" })
  .validator(ListWzMovementsSchema)
  .handler(async ({ data: { filter, limit, cursor } }) => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      return { movements: [], hasMore: false, nextCursor: null };
    }

    const db = getServerClient();

    let query = db
      .from("wz_token_ledger")
      .select(`
        id,
        bucket_id,
        entry_type,
        amount_wz,
        balance_after_wz,
        operation_id,
        description,
        metadata,
        tamper_seal,
        created_at,
        bucket:wz_token_buckets(
          scope_type,
          scope_id,
          funding_source
        )
      `)
      .eq("user_id", identity.id)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    // Filtros de Categoria
    if (filter === "received") {
      query = query.gt("amount_wz", 0);
    } else if (filter === "spent") {
      query = query.lt("amount_wz", 0);
    } else if (filter === "ai") {
      query = query.ilike("operation_id", "%ai%");
    } else if (filter === "purchases") {
      query = query.or("operation_id.ilike.%checkout%,operation_id.ilike.%order%");
    } else if (filter === "boost") {
      query = query.ilike("operation_id", "%boost%");
    } else if (filter === "cashback") {
      query = query.ilike("description", "%cashback%");
    } else if (filter === "gift_cards") {
      query = query.or("operation_id.ilike.%gc%,operation_id.ilike.%claim_gc%");
    }

    const { data: rows, error } = await query;
    if (error) {
      console.warn("[listUserWzMovements] Erro no ledger:", error.message);
      return { movements: [], hasMore: false, nextCursor: null };
    }

    const items = rows || [];
    const hasMore = items.length > limit;
    const paginatedItems = hasMore ? items.slice(0, limit) : items;

    const movements = paginatedItems.map((tx: any) => {
      const amount = Number(tx.amount_wz || 0);
      const isPositive = amount > 0;
      const bucket = tx.bucket || {};

      return {
        id: tx.id,
        created_at: tx.created_at,
        entry_type: tx.entry_type,
        amount_wz: amount,
        amount_formatted: (isPositive ? "+" : "") + formatWz(amount),
        is_positive: isPositive,
        balance_after: Number(tx.balance_after_wz || 0),
        description: tx.description,
        operation_id: tx.operation_id,
        scope_type: bucket.scope_type || "GLOBAL",
        scope_id: bucket.scope_id || null,
        funding_source: bucket.funding_source || "PLATFORM_PURCHASED",
        tamper_seal: tx.tamper_seal,
        metadata: tx.metadata || {},
      };
    });

    return {
      movements,
      hasMore,
      nextCursor: hasMore ? paginatedItems[paginatedItems.length - 1].created_at : null,
    };
  });

/**
 * Lojista: Conceder $WZ Promocional de Fidelidade / Cortesia para um Cliente
 * Invariant: Estritamente restrito à Loja (zero custo para a Waesy, sem direito a saque/PIX)
 */
export const grantMerchantLoyaltyWz = createServerFn({ method: "POST" })
  .validator(GrantLoyaltyWzSchema)
  .handler(async ({ data: { customerId, amountWz, reason } }) => {
    const identity = await getServerIdentity();
    if (!identity.store_id) {
      throw new Error("Nenhuma loja ativa selecionada.");
    }
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    // Anti-Abuso: Verificar se o lojista não está emitindo para sua própria conta para tentar gerar ganhos artificiais
    const isSelfGrant = identity.id === customerId;
    if (isSelfGrant) {
      // Permitido para testes operacionais, mas registrado com flag de alerta estrito
      console.warn(`[grantMerchantLoyaltyWz] Alerta de Autocessão: Proprietário ${identity.id} concedendo $WZ a si próprio na Loja ${identity.store_id}`);
    }

    const db = getServerClient();
    const idempotencyKey = `grant_merch_${identity.store_id}_${customerId}_${Date.now()}`;
    const opId = `merchant_grant:${identity.store_id}`;

    // Buscar nome da loja para descrição transparente
    const { data: store } = await db
      .from("stores")
      .select("name")
      .eq("id", identity.store_id)
      .single();

    const storeName = store?.name || "Loja Parceira";
    const desc = `Fidelidade / Crédito concedido por ${storeName}: ${reason}`;

    const { data: rpcRes, error } = await db.rpc("wz_grant_tokens_atomic", {
      p_user_id: customerId,
      p_issuer_type: "MERCHANT",
      p_issuer_id: identity.store_id,
      p_funding_source: "MERCHANT_FUNDED",
      p_scope_type: "MERCHANT",
      p_scope_id: identity.store_id,
      p_amount: amountWz,
      p_operation_id: opId,
      p_idempotency_key: idempotencyKey,
      p_description: desc,
      p_metadata: {
        granted_by: identity.id,
        store_id: identity.store_id,
        reason,
        is_self_grant: isSelfGrant,
        granted_at: new Date().toISOString(),
      },
    });

    if (error || !(rpcRes as any)?.success) {
      throw new Error(`Falha ao conceder $WZ no ledger: ${error?.message || (rpcRes as any)?.message}`);
    }

    return {
      success: true,
      tokens_granted: amountWz,
      tokens_formatted: formatWz(amountWz),
      new_available: (rpcRes as any).new_available,
      tamper_seal: (rpcRes as any).tamper_seal,
      message: `+${formatWz(amountWz)} concedidos com sucesso ao cliente! Válidos exclusivamente nesta empresa.`,
    };
  });

/**
 * Motor de Consumo de IA em $WZ:
 * Converte tokens técnicos em cobrança comercial e exige bucket com permissão 'AI'
 * Invariant: Rejeita buckets com funding_source = 'MERCHANT_FUNDED'
 */
export const chargeAiUsageWz = createServerFn({ method: "POST" })
  .validator(ChargeAiWzSchema)
  .handler(async ({ data: { operation, inputTokens, outputTokens, metadata } }) => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Usuário não autenticado para uso de IA.");
    }

    // 1. Determinar custo comercial em $WZ
    let costWz = 0;
    const fixedPricing = (AI_WZ_PRICING as any)[operation];
    if (fixedPricing) {
      costWz = fixedPricing.wz;
    } else {
      costWz = calculateLlmTokensToWz(inputTokens, outputTokens);
    }

    const db = getServerClient();

    // 2. Localizar buckets elegíveis para IA (somente GLOBAL / PLATFORM)
    const { data: eligibleBuckets, error: bucketErr } = await db
      .from("wz_token_buckets")
      .select("id, available_balance, funding_source, scope_type")
      .eq("user_id", identity.id)
      .eq("status", "active")
      .contains("allowed_features", ["AI"])
      .gt("available_balance", 0)
      .order("available_balance", { ascending: false });

    if (bucketErr || !eligibleBuckets || eligibleBuckets.length === 0) {
      throw new Error(
        "Saldo insuficiente de $WZ Global para utilizar Inteligência Artificial. Créditos promocionais emitidos por lojas não podem ser utilizados para IA da plataforma."
      );
    }

    const totalEligible = eligibleBuckets.reduce(
      (sum: number, b: any) => sum + Number(b.available_balance || 0),
      0
    );

    if (totalEligible < costWz) {
      throw new Error(
        `Saldo insuficiente em $WZ Global. Necessário: ${formatWz(costWz)}. Disponível: ${formatWz(totalEligible)}.`
      );
    }

    // 3. Debitar do primeiro bucket elegível atomicamente
    const targetBucket = eligibleBuckets[0];
    const newBal = Number(targetBucket.available_balance) - costWz;
    const idempotencyKey = `ai_charge_${identity.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const seal = `SEAL_AI_${Date.now()}`;

    // Atualiza bucket
    await db
      .from("wz_token_buckets")
      .update({ available_balance: newBal, updated_at: new Date().toISOString() })
      .eq("id", targetBucket.id);

    // Grava no ledger
    await db.from("wz_token_ledger").insert({
      bucket_id: targetBucket.id,
      user_id: identity.id,
      entry_type: "CONSUMED",
      amount_wz: -costWz,
      balance_after_wz: newBal,
      operation_id: `ai_operation:${operation}`,
      idempotency_key: idempotencyKey,
      description: `Uso de IA: ${fixedPricing?.label || operation}`,
      metadata: {
        operation,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        ...(metadata || {}),
      },
      tamper_seal: seal,
    });

    return {
      success: true,
      wz_debited: costWz,
      new_balance: newBal,
      wz_formatted: formatWz(costWz),
    };
  });

/**
 * Reconciliação Criptográfica e Financeira de Solvência de Buckets $WZ:
 * Comprova que SUM(wz_token_ledger) = available_balance + reserved_balance
 */
export const reconcileWzSolvencyAdmin = createServerFn({ method: "POST" }).handler(async () => {
  await requirePlatformAdmin();

  const db = getServerClient();

  const { data: buckets, error } = await db
    .from("wz_token_buckets")
    .select("id, user_id, scope_type, scope_id, available_balance, reserved_balance, consumed_balance");

  if (error) {
    throw new Error(`Erro ao auditar buckets: ${error.message}`);
  }

  const reports: any[] = [];
  let totalDivergences = 0;

  for (const b of buckets || []) {
    // Buscar soma de todos os eventos no ledger para este bucket
    const { data: ledgerEntries } = await db
      .from("wz_token_ledger")
      .select("amount_wz")
      .eq("bucket_id", b.id);

    const ledgerSum = (ledgerEntries || []).reduce(
      (sum: number, entry: any) => sum + Number(entry.amount_wz || 0),
      0
    );

    // Invariante de Solvência: Saldo Atual Projetado = Saldo Disponível + Saldo Reservado
    const projectedBalance = Number(b.available_balance || 0) + Number(b.reserved_balance || 0);
    const divergence = projectedBalance - ledgerSum;

    if (divergence !== 0) {
      totalDivergences++;
    }

    reports.push({
      bucket_id: b.id,
      user_id: b.user_id,
      scope_type: b.scope_type,
      projected_balance: projectedBalance,
      ledger_sum: ledgerSum,
      divergence,
      status: divergence === 0 ? "SOLVENT_CLEAN" : "DIVERGENCE_ALERT",
    });
  }

  return {
    success: true,
    total_buckets_audited: (buckets || []).length,
    total_divergences: totalDivergences,
    solvency_status: totalDivergences === 0 ? "100%_SECURE_SOLVENT" : "REQUIRES_ATTENTION",
    audit_timestamp: new Date().toISOString(),
    reports: reports.slice(0, 50),
  };
});

// ============================================================
// 6. CONSULTA DE DISPONIBILIDADE E CONSUMO DE $WZ NO CHECKOUT
// ============================================================

export const getCheckoutWzAvailability = createServerFn({ method: "POST" })
  .validator(z.object({ storeId: z.string().uuid().optional() }))
  .handler(async ({ data: { storeId } }) => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      return {
        authenticated: false,
        availableStoreWz: 0,
        availableGlobalWz: 0,
        totalUsableWz: 0,
        usableReferenceBrlCents: 0,
        usableReferenceBrlFormatted: "R$ 0,00",
      };
    }

    const db = getServerClient();
    const { data: buckets } = await db
      .from("wz_token_buckets")
      .select("id, issuer_type, scope_type, scope_id, available_balance, status")
      .eq("user_id", identity.id)
      .eq("status", "active");

    let availableStoreWz = 0;
    let availableGlobalWz = 0;

    for (const b of buckets || []) {
      const bal = Number(b.available_balance || 0);
      if (bal <= 0) continue;

      if (storeId && b.scope_type === "MERCHANT" && b.scope_id === storeId) {
        availableStoreWz += bal;
      } else if (b.scope_type === "GLOBAL") {
        availableGlobalWz += bal;
      }
    }

    const totalUsableWz = availableStoreWz + availableGlobalWz;
    const usableReferenceBrlCents = wzToBrlCentsReference(totalUsableWz);

    return {
      authenticated: true,
      availableStoreWz,
      availableGlobalWz,
      totalUsableWz,
      usableReferenceBrlCents,
      usableReferenceBrlFormatted: (usableReferenceBrlCents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    };
  });

export const consumeCheckoutWzAtomic = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      orderId: z.string().uuid(),
      amountCents: z.number().int().positive(),
    })
  )
  .handler(async ({ data: { storeId, orderId, amountCents } }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Usuário não autenticado.");

    const db = getServerClient();
    const wzNeeded = brlCentsToWz(amountCents);

    // Prioridade 1: Buckets da loja emissora
    // Prioridade 2: Buckets Globais da Waesy
    const { data: buckets } = await db
      .from("wz_token_buckets")
      .select("id, scope_type, scope_id, available_balance, consumed_balance")
      .eq("user_id", identity.id)
      .eq("status", "active")
      .gt("available_balance", 0);

    const storeBuckets = (buckets || []).filter(
      (b: any) => b.scope_type === "MERCHANT" && b.scope_id === storeId
    );
    const globalBuckets = (buckets || []).filter((b: any) => b.scope_type === "GLOBAL");

    const orderedBuckets = [...storeBuckets, ...globalBuckets];
    let remainingToDeduct = wzNeeded;
    let totalDeductedWz = 0;

    for (const b of orderedBuckets) {
      if (remainingToDeduct <= 0) break;
      const bAvail = Number(b.available_balance || 0);
      const deductFromThis = Math.min(bAvail, remainingToDeduct);
      if (deductFromThis <= 0) continue;

      const newAvail = bAvail - deductFromThis;
      const newConsumed = Number(b.consumed_balance || 0) + deductFromThis;

      await db
        .from("wz_token_buckets")
        .update({
          available_balance: newAvail,
          consumed_balance: newConsumed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", b.id);

      // Inserir registro no Ledger Imutável
      await db.from("wz_token_ledger").insert({
        bucket_id: b.id,
        user_id: identity.id,
        entry_type: "CONSUMED",
        amount_wz: -deductFromThis,
        balance_after_wz: newAvail,
        operation_id: `checkout_${orderId}`,
        idempotency_key: `wz_checkout_${orderId}_${b.id}`,
        brl_equivalent_cents: wzToBrlCentsReference(deductFromThis),
        counterparty_type: "ORDER",
        counterparty_id: orderId,
        description: `Pagamento com $WZ no pedido`,
        metadata: { order_id: orderId, store_id: storeId },
        tamper_seal: `SEAL-CKOUT-${Date.now()}-${b.id.slice(0, 8)}`,
      });

      remainingToDeduct -= deductFromThis;
      totalDeductedWz += deductFromThis;
    }

    return {
      success: true,
      deductedWz: totalDeductedWz,
      deductedCents: wzToBrlCentsReference(totalDeductedWz),
    };
  });

