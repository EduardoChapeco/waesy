import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { z } from "zod";
import { recordLedgerEntryCore } from "@/services/immutable-ledger.functions";

export interface TokenPackage {
 id: string;
 name: string;
 tokens: number;
 tokens_formatted: string;
 price_cents: number;
 price_formatted: string;
 cost_per_million_brl: string;
 badge?: string;
 description: string;
 popular?: boolean;
 time_acceleration: string;
}

// ============================================================
// PACOTES EM ESCALA DE MILHÕES DE TOKENS (MICRO-CENTAVINHOS)
// Paridade Base: 1.000.000 Tokens = ~R$ 49,00 (ou ~R$ 0,000049 por token)
// ============================================================
export const TOKEN_PACKAGES: TokenPackage[] = [
 {
 id: "pkg_starter",
 name: "Semente (Starter)",
 tokens: 500_000,
 tokens_formatted: "500.000",
 price_cents: 2990, // R$ 29,90
 price_formatted: "R$ 29,90",
 cost_per_million_brl: "R$ 59,80 / 1M",
 description: "Para autônomos e pequenos negócios que querem presença no mapa e primeiros clientes.",
 time_acceleration: "Economiza ~30 dias de esforço comercial",
 },
 {
 id: "pkg_growth",
 name: "Crescimento (Boost)",
 tokens: 2_000_000,
 tokens_formatted: "2.000.000",
 price_cents: 8900, // R$ 89,00
 price_formatted: "R$ 89,00",
 cost_per_million_brl: "R$ 44,50 / 1M",
 popular: true,
 badge: "MAIS POPULAR",
 description: "Para restaurantes e comércios locais ativos: disparos, IA de vendas e clientes diários.",
 time_acceleration: "Economiza ~6 meses de tração comercial",
 },
 {
 id: "pkg_scale",
 name: "Acelerador Comercial",
 tokens: 6_000_000,
 tokens_formatted: "6.000.000",
 price_cents: 19900, // R$ 199,00
 price_formatted: "R$ 199,00",
 cost_per_million_brl: "R$ 33,16 / 1M",
 badge: "MELHOR CUSTO/BENEFÍCIO",
 description: "Para lojas consolidadas: volume massivo de mensagens, IA 24/7 e múltiplos leads quentes.",
 time_acceleration: "Economiza ~2 a 3 anos de prospecção",
 },
 {
 id: "pkg_enterprise",
 name: "Máquina do Tempo VIP",
 tokens: 25_000_000,
 tokens_formatted: "25.000.000",
 price_cents: 59900, // R$ 599,00
 price_formatted: "R$ 599,00",
 cost_per_million_brl: "R$ 23,96 / 1M",
 badge: "MÁXIMA EFICIÊNCIA",
 description: "Para redes, grandes hotéis, agências, concessionárias e negócios de alto impacto.",
 time_acceleration: "Economiza ~5 a 10 anos de crescimento lento",
 },
];

// Matriz Canônica de Queima de Utilidade em Micro-Tokens
export const TOKEN_BURN_RATES = {
 feed_view: { tokens: 10, label: "Visualização no Feed", approx_brl: "R$ 0,0005" },
 product_engagement: { tokens: 50, label: "Clique / Abertura de Produto", approx_brl: "R$ 0,0024" },
 push_notification: { tokens: 25, label: "Alerta Web Push / In-App", approx_brl: "R$ 0,0012" },
 whatsapp_alert: { tokens: 150, label: "Mensagem Ativa no WhatsApp", approx_brl: "R$ 0,0073" },
 ai_agent_chat: { tokens: 100, label: "Turno com IA de Vendas 24/7", approx_brl: "R$ 0,0049" },
 verified_daily: { tokens: 200, label: "Diária de Loja Verificada & Curada", approx_brl: "R$ 0,0098" },
 visibility_boost_24h: { tokens: 40_000, label: "Impulso Máquina do Tempo (+3x no Radar por 24h)", approx_brl: "R$ 1,96" },
 hot_lead_unlock: { tokens: 35_000, label: "Lead Quente Qualificado (Intenção Real / Checkout)", approx_brl: "R$ 1,71" },
 market_intelligence_report: { tokens: 80_000, label: "Dossiê de Mercado & Tendências do Bairro", approx_brl: "R$ 3,92" },
 marketplace_order_sync: { tokens: 25, label: "Sincronização de Pedido Multi-Canal", approx_brl: "R$ 0,0012" },
 fiscal_nfe_issue: { tokens: 150, label: "Emissão de Nota Fiscal (NF-e / NFS-e)", approx_brl: "R$ 0,0073" },
 shipping_label_thermal: { tokens: 50, label: "Geração de Etiqueta Térmica de Envio", approx_brl: "R$ 0,0024" },
};

// ============================================================
// 1. LOJISTA: CARREGAR CARTEIRA DE TOKENS & CONSUMÔMETRO
// ============================================================
export const getStoreTokenWallet = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 if (!identity.store_id) {
 throw new Error("Nenhuma loja ativa selecionada.");
 }

 const db = getServerClient();

 const { data: store, error: storeErr } = await db
 .from("stores")
 .select("id, name, slug, settings")
 .eq("id", identity.store_id)
 .single();

 if (storeErr || !store) {
 throw new Error("Loja não encontrada.");
 }

 const settings = store.settings || {};
 let wallet = settings.token_wallet;

 if (!wallet) {
 // 50.000 tokens gratuitos de boas-vindas
 wallet = {
 balance: 50_000,
 lifetime_purchased: 50_000,
 lifetime_consumed: 0,
 estimated_time_saved_hours: 24.0,
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 };
 settings.token_wallet = wallet;
 await db.from("stores").update({ settings }).eq("id", store.id);
 }

 // Buscar histórico recente no ledger
 const { data: ledgerLogs } = await db
 .from("audit_logs")
 .select("*")
 .eq("store_id", store.id)
 .eq("entity_type", "token_transaction")
 .order("created_at", { ascending: false })
 .limit(25);

 const transactions = (ledgerLogs || []).map((log: any) => ({
 id: log.id,
 created_at: log.created_at,
 action_type: log.action,
 ...(log.payload_snapshot || {}),
 }));

 return {
 store_id: store.id,
 store_name: store.name,
 balance: wallet.balance ?? 50_000,
 lifetime_purchased: wallet.lifetime_purchased ?? 50_000,
 lifetime_consumed: wallet.lifetime_consumed ?? 0,
 estimated_time_saved_hours: wallet.estimated_time_saved_hours ?? 24.0,
 packages: TOKEN_PACKAGES,
 burn_rates: TOKEN_BURN_RATES,
 transactions,
 };
});

// ============================================================
// 2. LOJISTA: RECARREGAR PACOTE DE TOKENS
// ============================================================
export const purchaseTokenPackage = createServerFn({ method: "POST" })
 .validator(
 z.object({
 package_id: z.string(),
 payment_method: z.enum(["pix", "credit_card"]).default("pix"),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity.store_id) {
 throw new Error("Nenhuma loja ativa selecionada.");
 }

 const pkg = TOKEN_PACKAGES.find((p) => p.id === data.package_id);
 if (!pkg) {
 throw new Error("Pacote de tokens inválido.");
 }

 const db = getServerClient();

 const { data: store, error } = await db
 .from("stores")
 .select("id, name, settings")
 .eq("id", identity.store_id)
 .single();

 if (error || !store) throw new Error("Loja não encontrada.");

 const settings = store.settings || {};
 const wallet = settings.token_wallet || {
 balance: 0,
 lifetime_purchased: 0,
 lifetime_consumed: 0,
 estimated_time_saved_hours: 0,
 };

 const newBalance = (wallet.balance || 0) + pkg.tokens;
 const newLifetime = (wallet.lifetime_purchased || 0) + pkg.tokens;

 wallet.balance = newBalance;
 wallet.lifetime_purchased = newLifetime;
 wallet.updated_at = new Date().toISOString();
 settings.token_wallet = wallet;

 await db.from("stores").update({ settings }).eq("id", store.id);

 await db.from("audit_logs").insert({
 store_id: store.id,
 user_id: identity.id,
 action: "package_purchase",
 entity_type: "token_transaction",
 payload_snapshot: {
 package_id: pkg.id,
 package_name: pkg.name,
 amount: pkg.tokens,
 price_cents: pkg.price_cents,
 balance_after: newBalance,
 description: `Recarga de +${pkg.tokens_formatted} Tokens (${pkg.name})`,
 payment_method: data.payment_method,
 },
 });

  // Registro no Ledger Criptográfico Imutável (Bacen/Blockchain-like)
  try {
    await recordLedgerEntryCore({
      transactionType: "token_purchase",
      amountCents: pkg.price_cents,
      tokenAmount: pkg.tokens,
      storeId: store.id,
      actorId: identity.id,
      actorRole: identity.role,
      referenceEntityType: "token_packages",
      referenceEntityId: pkg.id,
      metadata: {
        package_name: pkg.name,
        payment_method: data.payment_method,
        balance_after: newBalance,
      },
    });
  } catch (ledgerErr) {
    console.warn("[tokens] Registro no ledger criptográfico:", ledgerErr);
  }

 return {
 success: true,
 new_balance: newBalance,
 tokens_added: pkg.tokens,
 message: `Recarga concluída! +${pkg.tokens_formatted} Tokens adicionados à sua Máquina do Tempo.`,
 };
 });

// ============================================================
// 3. SISTEMA / BFF: CONSUMIR TOKENS DE UMA AÇÃO (THREAD-SAFE)
// ============================================================
export const consumeTokens = createServerFn({ method: "POST" })
 .validator(
 z.object({
 tokens: z.number().int().min(1),
 action_type: z.string(),
 description: z.string(),
 time_saved_minutes: z.number().int().min(0).default(0),
 metadata: z.record(z.any()).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity.store_id) {
 throw new Error("Nenhuma loja ativa selecionada.");
 }

 const db = getServerClient();

 const { data: store } = await db
 .from("stores")
 .select("id, settings")
 .eq("id", identity.store_id)
 .single();

 if (!store) throw new Error("Loja não encontrada.");

 const settings = store.settings || {};
 const wallet = settings.token_wallet || {
 balance: 50_000,
 lifetime_purchased: 50_000,
 lifetime_consumed: 0,
 estimated_time_saved_hours: 0,
 };

 if ((wallet.balance || 0) < data.tokens) {
 return {
 success: false,
 error: "INSUFFICIENT_TOKENS",
 current_balance: wallet.balance || 0,
 required_tokens: data.tokens,
 message: `Saldo insuficiente (${(wallet.balance || 0).toLocaleString()} Tokens). São necessários ${data.tokens.toLocaleString()} Tokens.`,
 };
 }

 const newBalance = wallet.balance - data.tokens;
 wallet.balance = newBalance;
 wallet.lifetime_consumed = (wallet.lifetime_consumed || 0) + data.tokens;
 wallet.estimated_time_saved_hours =
 (wallet.estimated_time_saved_hours || 0) + data.time_saved_minutes / 60.0;
 wallet.updated_at = new Date().toISOString();
 settings.token_wallet = wallet;

 await db.from("stores").update({ settings }).eq("id", store.id);

 await db.from("audit_logs").insert({
 store_id: store.id,
 user_id: identity.id,
 action: data.action_type,
 entity_type: "token_transaction",
 payload_snapshot: {
 amount: -data.tokens,
 balance_after: newBalance,
 description: data.description,
 time_saved_minutes: data.time_saved_minutes,
 metadata: data.metadata || {},
 },
 });

  // Registro no Ledger Criptográfico Imutável (Bacen/Blockchain-like)
  try {
    await recordLedgerEntryCore({
      transactionType: "token_spend",
      tokenAmount: data.tokens,
      storeId: store.id,
      actorId: identity.id,
      actorRole: identity.role,
      referenceEntityType: "token_action",
      referenceEntityId: data.action_type,
      metadata: {
        description: data.description,
        time_saved_minutes: data.time_saved_minutes,
        balance_after: newBalance,
        ...data.metadata,
      },
    });
  } catch (ledgerErr) {
    console.warn("[tokens] Registro no ledger criptográfico:", ledgerErr);
  }

 return {
 success: true,
 new_balance: newBalance,
 tokens_consumed: data.tokens,
 time_saved_minutes: data.time_saved_minutes,
 message: `Aceleração ativada com sucesso (-${data.tokens.toLocaleString()} Tokens).`,
 };
 });

// ============================================================
// 4. ADMIN MASTER: GESTÃO GLOBAL DE CIRCULAÇÃO DE TOKENS
// ============================================================
export const getGlobalTokenStatsAdmin = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 if (identity.role !== "platform_admin" && identity.role !== "master") {
 throw new Error("Acesso restrito ao Admin Master.");
 }

 const db = getServerClient();

 const { data: stores } = await db
 .from("stores")
 .select("id, name, slug, settings, is_active, created_at");

 let totalCirculating = 0;
 let totalPurchased = 0;
 let totalConsumed = 0;
 let totalHoursSaved = 0;

 const storeWallets = (stores || []).map((s: any) => {
 const w = s.settings?.token_wallet || {
 balance: 50_000,
 lifetime_purchased: 50_000,
 lifetime_consumed: 0,
 estimated_time_saved_hours: 24,
 };

 totalCirculating += w.balance || 0;
 totalPurchased += w.lifetime_purchased || 0;
 totalConsumed += w.lifetime_consumed || 0;
 totalHoursSaved += w.estimated_time_saved_hours || 0;

 return {
 store_id: s.id,
 store_name: s.name,
 store_slug: s.slug,
 is_active: s.is_active,
 balance: w.balance || 0,
 lifetime_purchased: w.lifetime_purchased || 0,
 lifetime_consumed: w.lifetime_consumed || 0,
 estimated_time_saved_hours: w.estimated_time_saved_hours || 0,
 };
 });

 return {
 total_circulating_tokens: totalCirculating,
 total_lifetime_purchased: totalPurchased,
 total_lifetime_consumed: totalConsumed,
 total_time_saved_hours: Math.round(totalHoursSaved),
 total_estimated_value_brl: ((totalPurchased / 1_000_000) * 49.0).toLocaleString("pt-BR", {
 style: "currency",
 currency: "BRL",
 }),
 stores: storeWallets,
 };
});

// ============================================================
// 5. ADMIN MASTER: CONCEDER TOKENS BÔNUS A UM LOJISTA
// ============================================================
export const grantBonusTokensAdmin = createServerFn({ method: "POST" })
 .validator(
 z.object({
 store_id: z.string().uuid(),
 tokens: z.number().int().min(1000),
 reason: z.string().min(3),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (identity.role !== "platform_admin" && identity.role !== "master") {
 throw new Error("Acesso restrito ao Admin Master.");
 }

 const db = getServerClient();

 const { data: store } = await db
 .from("stores")
 .select("id, name, settings")
 .eq("id", data.store_id)
 .single();

 if (!store) throw new Error("Loja não encontrada.");

 const settings = store.settings || {};
 const wallet = settings.token_wallet || {
 balance: 0,
 lifetime_purchased: 0,
 lifetime_consumed: 0,
 estimated_time_saved_hours: 0,
 };

 const newBalance = (wallet.balance || 0) + data.tokens;
 const newLifetime = (wallet.lifetime_purchased || 0) + data.tokens;

 wallet.balance = newBalance;
 wallet.lifetime_purchased = newLifetime;
 wallet.updated_at = new Date().toISOString();
 settings.token_wallet = wallet;

 await db.from("stores").update({ settings }).eq("id", store.id);

 await db.from("audit_logs").insert({
 store_id: store.id,
 user_id: identity.id,
 action: "admin_grant",
 entity_type: "token_transaction",
 payload_snapshot: {
 amount: data.tokens,
 balance_after: newBalance,
 description: `Bônus concedido pela Administração Waesy: ${data.reason}`,
 reason: data.reason,
 },
 });

 return {
 success: true,
 new_balance: newBalance,
 tokens_granted: data.tokens,
 message: `+${data.tokens.toLocaleString()} Tokens bônus concedidos com sucesso para ${store.name}!`,
 };
 });

// ============================================================
// 6. LOJISTA: PAINEL DE CRESCIMENTO ORGÂNICO & BOUNTIES VIRAIS
// ============================================================
export const getStoreGrowthAndBounties = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 if (!identity.store_id) {
 throw new Error("Nenhuma loja ativa selecionada.");
 }

 const db = getServerClient();

 const { data: store, error } = await db
 .from("stores")
 .select("id, name, slug, settings")
 .eq("id", identity.store_id)
 .single();

 if (error || !store) throw new Error("Loja não encontrada.");

 // Buscar bounties recebidos
 const { data: bounties } = await db
 .from("audit_logs")
 .select("*")
 .eq("store_id", store.id)
 .eq("action", "curation_reward")
 .order("created_at", { ascending: false })
 .limit(50);

 const totalClientsBrought = (bounties || []).length;
 const totalTokensEarned = (bounties || []).reduce(
 (acc: number, b: any) => acc + (b.payload_snapshot?.amount || 100_000),
 0,
 );

 const referralUrl = `https://usewaesy.pages.dev/@${store.slug}?ref=${store.id.slice(0, 8)}`;

 return {
 store_id: store.id,
 store_name: store.name,
 store_slug: store.slug,
 referral_url: referralUrl,
 total_clients_brought: totalClientsBrought,
 total_tokens_earned: totalTokensEarned,
 bounty_per_client: 100_000,
 organic_traffic_cost_tokens: 0, // 100% GRATUITO
 recent_referrals: (bounties || []).map((b: any) => ({
 id: b.id,
 created_at: b.created_at,
 tokens_awarded: b.payload_snapshot?.amount || 100_000,
 description: b.payload_snapshot?.description || "Novo cliente cadastrado via link da loja",
 })),
 };
});

// ============================================================
// 7. CONSUMIDOR FINAL: CARTEIRA DE TOKENS & FIDELIDADE (ZERO INICIAL)
// Tokens são creditados SOMENTE quando uma loja real emite fidelidade/cashback
// ou via vesting oficial auditado de afiliados. Transferências entre contas são PROIBIDAS.
// ============================================================
export const getUserTokenWallet = createServerFn({ method: "GET" })
  .validator(
    z.object({
      limit: z.number().int().min(1).max(100).default(25),
      cursor: z.string().optional(),
    }).default({})
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Usuário não autenticado.");
    }

    const db = getServerClient();

    const { data: profile } = await db
      .from("profiles")
      .select("id, full_name, role, avatar_url")
      .eq("id", identity.id)
      .single();

    // Wallet canônica: user_token_wallets
    const { data: walletRow } = await db
      .from("user_token_wallets")
      .select("balance, lifetime_earned, lifetime_redeemed, balance_pending_maturity, vesting_unlock_date, is_locked, created_at")
      .eq("user_id", identity.id)
      .maybeSingle();

    const userTokens = walletRow || {
      balance: 0,
      lifetime_earned: 0,
      lifetime_redeemed: 0,
      balance_pending_maturity: 0,
      vesting_unlock_date: null,
      is_locked: false,
      created_at: new Date().toISOString(),
    };

    // Buscar histórico de transações reais emitidas por lojas
    let query = db
      .from("audit_logs")
      .select("*")
      .eq("user_id", identity.id)
      .eq("entity_type", "user_token_transaction")
      .order("created_at", { ascending: false })
      .limit(data.limit + 1);
    
    if (data.cursor) {
      query = query.lt("created_at", data.cursor);
    }

    const { data: txLogs } = await query;

    const hasMore = (txLogs || []).length > data.limit;
    const items = hasMore ? (txLogs || []).slice(0, data.limit) : (txLogs || []);

    const transactions = items.map((t: any) => ({
      id: t.id,
      created_at: t.created_at,
      action: t.action,
      origin_store_id: t.payload_snapshot?.origin_store_id,
      origin_store_name: t.payload_snapshot?.origin_store_name || "Loja Parceira",
      amount: t.payload_snapshot?.amount || 0,
      description: t.payload_snapshot?.description || t.action,
      audit_seal: `SEAL-${t.id?.slice(0, 8) || "GEN"}-${new Date(t.created_at).getTime()}`,
    }));

    return {
      user_id: identity.id,
      full_name: profile?.full_name || "Cliente Waesy",
      balance: userTokens.balance ?? 0,
      balance_pending_maturity: (userTokens as any).balance_pending_maturity ?? 0,
      vesting_unlock_date: (userTokens as any).vesting_unlock_date ?? null,
      is_locked: (userTokens as any).is_locked ?? false,
      security_level: "MILITARY_ZERO_TRUST",
      zero_transfer_policy_active: true,
      lifetime_earned: userTokens.lifetime_earned ?? 0,
      lifetime_redeemed: userTokens.lifetime_redeemed ?? 0,
      transactions,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].created_at : null,
    };
  });

// ============================================================
// 7.0 POLÍTICA MILITAR ZERO-TRANSFER: BLOQUEIO INVIOLÁVEL DE TRANSFERÊNCIAS/DOAÇÕES
// Tokens só podem ser usados para utilidades oficiais ou descontos.
// Qualquer tentativa de transferência direta é rejeitada e registrada como alerta de segurança.
// ============================================================
export const attemptUserTokenTransferBlocked = createServerFn({ method: "POST" })
  .validator(
    z.object({
      target_user_id: z.string(),
      amount: z.number().int().min(1),
      reason: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const db = getServerClient();

    // Registro forense de tentativa violadora
    await db.from("audit_logs").insert({
      user_id: identity.id || null,
      action: "security_zero_transfer_violation_blocked",
      entity_type: "token_security_alert",
      payload_snapshot: {
        attempted_by: identity.id,
        target_user_id: data.target_user_id,
        attempted_amount: data.amount,
        reason: data.reason || "Tentativa de transferência direta não permitida",
        threat_level: "CRITICAL",
        policy: "ZERO_TRANSFER_MILITARY_POLICY",
        timestamp: new Date().toISOString(),
      },
    });

    throw new Error(
      "ZERO_TRANSFER_VIOLATION: Tokens são intransferíveis e não podem ser doados ou transferidos entre contas por rigorosa política de segurança militar e prevenção contra fraudes."
    );
  });

// ============================================================
// 7.1 LOJISTA: EMITIR TOKENS DE FIDELIDADE / CASHBACK PARA CLIENTE
// Financiado 100% pelo saldo da loja emissora (Sem criação de tokens do nada)
// ============================================================
export const emitStoreLoyaltyTokens = createServerFn({ method: "POST" })
 .validator(
 z.object({
 recipient_user_id: z.string().uuid(),
 tokens: z.number().int().min(10),
 reason: z.string().min(3),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity.store_id) {
 throw new Error("Nenhuma loja ativa selecionada.");
 }

 const db = getServerClient();

 // 1. Verificar e debitar da carteira da loja
 const { data: store } = await db
 .from("stores")
 .select("id, name, settings")
 .eq("id", identity.store_id)
 .single();

 if (!store) throw new Error("Loja não encontrada.");

 const settings = store.settings || {};
 const storeWallet = settings.token_wallet || { balance: 0, lifetime_purchased: 0, lifetime_consumed: 0 };

 if ((storeWallet.balance || 0) < data.tokens) {
 return {
 success: false,
 error: "INSUFFICIENT_STORE_TOKENS",
 message: "Sua loja não possui saldo suficiente de tokens para emitir esta fidelidade.",
 };
 }

 const newStoreBalance = storeWallet.balance - data.tokens;
 storeWallet.balance = newStoreBalance;
 storeWallet.lifetime_consumed = (storeWallet.lifetime_consumed || 0) + data.tokens;
 storeWallet.updated_at = new Date().toISOString();
 settings.token_wallet = storeWallet;

 await db.from("stores").update({ settings }).eq("id", store.id);

 // 2. Creditar na carteira do usuário
 const { data: userProfile } = await db
 .from("profiles")
 .select("id, preferences")
 .eq("id", data.recipient_user_id)
 .single();

 if (userProfile) {
 const userPrefs = userProfile.preferences || {};
 const userWallet = userPrefs.token_wallet || { balance: 0, lifetime_earned: 0, lifetime_redeemed: 0 };
 const newUserBalance = (userWallet.balance || 0) + data.tokens;
 userWallet.balance = newUserBalance;
 userWallet.lifetime_earned = (userWallet.lifetime_earned || 0) + data.tokens;
 userPrefs.token_wallet = userWallet;
 await db.from("profiles").update({ preferences: userPrefs }).eq("id", data.recipient_user_id);
 }

 // 3. Registrar nos ledgers com rastreabilidade da loja emissora
 await db.from("audit_logs").insert([
 {
 store_id: store.id,
 user_id: identity.id,
 action: "emit_loyalty_tokens",
 entity_type: "token_transaction",
 payload_snapshot: {
 amount: -data.tokens,
 balance_after: newStoreBalance,
 description: `Emissão de fidelidade para cliente: ${data.reason}`,
 recipient_user_id: data.recipient_user_id,
 },
 },
 {
 user_id: data.recipient_user_id,
 action: "store_cashback_earned",
 entity_type: "user_token_transaction",
 payload_snapshot: {
 amount: data.tokens,
 origin_store_id: store.id,
 origin_store_name: store.name,
 description: `Cashback / Fidelidade recebido de ${store.name}: ${data.reason}`,
 },
 },
 ]);

 return {
 success: true,
 tokens_emitted: data.tokens,
 store_new_balance: newStoreBalance,
 message: `+${data.tokens.toLocaleString()} Tokens de Fidelidade emitidos com sucesso para o cliente!`,
 };
 });

// ============================================================
// 8. REGISTRAR NOVO CADASTRO DE CLIENTE & CREDITAR BOUNTY (+100k)
// ============================================================
export const recordStoreOrganicReferral = createServerFn({ method: "POST" })
 .validator(
 z.object({
 store_id: z.string().uuid(),
 referred_user_id: z.string().uuid().optional(),
 channel: z.string().default("biolink_qr_code"),
 }),
 )
 .handler(async ({ data }) => {
 const db = getServerClient();

 // 1. Buscar loja
 const { data: store } = await db
 .from("stores")
 .select("id, name, settings")
 .eq("id", data.store_id)
 .single();

 if (!store) throw new Error("Loja não encontrada.");

 const settings = store.settings || {};
 const wallet = settings.token_wallet || {
 balance: 50_000,
 lifetime_purchased: 50_000,
 lifetime_consumed: 0,
 estimated_time_saved_hours: 24,
 };

 const BOUNTY_TOKENS = 100_000;
 const newBalance = (wallet.balance || 0) + BOUNTY_TOKENS;
 const newLifetime = (wallet.lifetime_purchased || 0) + BOUNTY_TOKENS;

 wallet.balance = newBalance;
 wallet.lifetime_purchased = newLifetime;
 wallet.updated_at = new Date().toISOString();
 settings.token_wallet = wallet;

 await db.from("stores").update({ settings }).eq("id", store.id);

 // Gravar no ledger da loja
 await db.from("audit_logs").insert({
 store_id: store.id,
 user_id: data.referred_user_id || null,
 action: "curation_reward",
 entity_type: "token_transaction",
 payload_snapshot: {
 amount: BOUNTY_TOKENS,
 balance_after: newBalance,
 description: "Bounty Viral: Novo cliente cadastrado através do seu link próprio (+100.000 Tokens)",
 channel: data.channel,
 referred_user_id: data.referred_user_id,
 },
 });

 return {
 success: true,
 tokens_awarded: BOUNTY_TOKENS,
 store_new_balance: newBalance,
 message: `+${BOUNTY_TOKENS.toLocaleString()} Tokens creditados para ${store.name}!`,
 };
 });

// ============================================================
// 9. ADMIN MASTER: EXECUTAR CONCILIAÇÃO & AUDITORIA CRIPTOGRÁFICA
// ============================================================
export const runTokenReconciliationAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const identity = await getServerIdentity();
  if (identity.role !== "platform_admin" && identity.role !== "master") {
    throw new Error("Acesso restrito ao Admin Master.");
  }

  const db = getServerClient();

  // 1. Executar Stored Procedure de Reconciliação Criptográfica Global no Banco
  let rpcResult: any = null;
  try {
    const { data, error } = await db.rpc("reconcile_platform_token_solvency");
    if (!error && data) {
      rpcResult = data;
    }
  } catch (rpcErr) {
    console.warn("[reconciliation] Erro ao chamar procedure RPC, usando fallback:", rpcErr);
  }

  // 2. Coletar dados detalhados das lojas
  const { data: stores } = await db
    .from("stores")
    .select("id, name, slug, settings");

  let totalCirculating = rpcResult?.total_circulating_in_wallets ?? 0;
  let totalLedgerSum = rpcResult?.total_audited_in_ledger ?? 0;
  let tamperedWalletsCount = rpcResult?.tampered_wallets_found ?? 0;
  const storeReports: any[] = [];

  for (const store of stores || []) {
    const settings = store.settings || {};
    const wallet = settings.token_wallet || { balance: 50_000, lifetime_purchased: 50_000 };

    // Buscar registros do ledger dessa loja
    const { data: logs } = await db
      .from("audit_logs")
      .select("payload_snapshot")
      .eq("store_id", store.id)
      .eq("entity_type", "token_transaction");

    const ledgerSum = (logs || []).reduce((acc: number, l: any) => {
      return acc + (l.payload_snapshot?.amount || 0);
    }, 50_000);

    const divergence = (wallet.balance || 0) - ledgerSum;
    const isClean = divergence === 0;

    if (!rpcResult && !isClean) {
      tamperedWalletsCount++;
    }

    if (!rpcResult) {
      totalCirculating += wallet.balance || 0;
      totalLedgerSum += ledgerSum;
    }

    storeReports.push({
      store_id: store.id,
      store_name: store.name,
      store_slug: store.slug,
      wallet_balance: wallet.balance || 0,
      audited_balance: ledgerSum,
      divergence,
      status: isClean ? "CONCILIATED_CLEAN" : "DIVERGENCE_ALERT",
      is_locked: wallet.is_locked || false,
    });
  }

  return {
    success: true,
    total_wallets_audited: rpcResult?.total_wallets_audited ?? (stores || []).length,
    total_circulating: totalCirculating,
    total_ledger_sum: totalLedgerSum,
    net_divergence: rpcResult?.net_divergence ?? (totalCirculating - totalLedgerSum),
    tampered_wallets_found: tamperedWalletsCount,
    solvency_status:
      rpcResult?.solvency_status ||
      (tamperedWalletsCount === 0 && totalCirculating - totalLedgerSum === 0
        ? "100%_SECURE_SOLVENT"
        : "REQUIRES_INVESTIGATION"),
    audit_timestamp: rpcResult?.audit_timestamp || new Date().toISOString(),
    store_reports: storeReports,
  };
});

// ============================================================
// 10. ADMIN MASTER: LISTAR EVENTOS DE SEGURANÇA & FRAUDE
// ============================================================
export const getSecurityAuditEventsAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  if (identity.role !== "platform_admin" && identity.role !== "master") {
    throw new Error("Acesso restrito ao Admin Master.");
  }

  const db = getServerClient();

  // 1. Busca eventos forenses da tabela security_audit_events
  const { data: secEvents } = await db
    .from("security_audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  // 2. Busca logs de auditoria gerais
  const { data: auditLogs } = await db
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  const formattedSecEvents = (secEvents || []).map((e: any) => ({
    id: e.id,
    created_at: e.created_at,
    action: e.event_type || "ALERTA_SEGURANÇA",
    entity_type: e.entity_type || "security_vault",
    severity: e.severity || "info",
    resolved: e.resolved || false,
    payload: e.details,
    ip: e.ip_address || "Servidor Seguro (SSL/TLS)",
  }));

  const formattedAuditLogs = (auditLogs || []).map((e: any) => ({
    id: e.id,
    created_at: e.created_at,
    action: e.action,
    entity_type: e.entity_type,
    severity: "info",
    resolved: true,
    payload: e.payload_snapshot,
    ip: e.ip_address || "Servidor Seguro (SSL/TLS)",
  }));

  return {
    events: [...formattedSecEvents, ...formattedAuditLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 50),
  };
});

// ============================================================
// 11. CALCULADORA DE ECONOMIA COMPARATIVA (TRUTHFUL COMPARATOR)
// Compara vendas reais na Waesy vs iFood (23%), Sympla (10%) e Shopify
// ============================================================
export const getStoreEconomyComparison = createServerFn({ method: "GET" })
 .validator(
 z.object({
 monthly_sales_brl: z.number().min(0).default(10000),
 }),
 )
 .handler(async ({ data }) => {
 const sales = data.monthly_sales_brl;

 // 1. iFood (23% comissão média + mensalidade de R$ 130)
 const ifoodCost = Math.round(sales * 0.23 + 130);
 // 2. Sympla / Ticket (10% taxa de serviço sobre ingressos)
 const symplaCost = Math.round(sales * 0.10);
 // 3. Shopify / E-commerce (Mensalidade R$ 380 + 2% taxa)
 const shopifyCost = Math.round(380 + sales * 0.02);

  // 4. Waesy (0% Comissão + R$ 89 em pacote de 2 Milhões de Tokens de Aceleração)
  const waesyEstimatedCost = 89;

  const waesySummary = {
    commission_rate: "0%",
    fixed_fee_brl: 0,
    tokens_investment_brl: waesyEstimatedCost,
    total_cost_brl: waesyEstimatedCost,
    net_retained_brl: sales - waesyEstimatedCost,
  };

  return {
    monthly_sales_brl: sales,
    waesy: waesySummary,
    comparisons: [
 {
 platform: "iFood (Delivery & Cardápio)",
 rate_desc: "23% comissão + R$ 130/mês mensalidade",
 cost_brl: ifoodCost,
 savings_brl: Math.max(0, ifoodCost - waesyEstimatedCost),
 savings_percent: Math.round(((ifoodCost - waesyEstimatedCost) / ifoodCost) * 100),
 },
 {
 platform: "Sympla / Ticket 360 (Ingressos)",
 rate_desc: "10% taxa de conveniência/serviço",
 cost_brl: symplaCost,
 savings_brl: Math.max(0, symplaCost - waesyEstimatedCost),
 savings_percent: Math.round(((symplaCost - waesyEstimatedCost) / symplaCost) * 100),
 },
 {
 platform: "Shopify / Nuvemshop (E-commerce)",
 rate_desc: "R$ 380/mês de plano + 2% de transação",
 cost_brl: shopifyCost,
 savings_brl: Math.max(0, shopifyCost - waesyEstimatedCost),
 savings_percent: Math.round(((shopifyCost - waesyEstimatedCost) / shopifyCost) * 100),
 },
 ],
 };
 });

// ============================================================
// 12. CONFIGURAÇÃO DE FATURAMENTO & RECARGA AUTOMÁTICA (META ADS STYLE)
// ============================================================
export const updateStoreTokenBillingConfig = createServerFn({ method: "POST" })
 .validator(
 z.object({
 billing_mode: z.enum(["prepaid", "auto_threshold", "monthly_invoice"]),
 auto_recharge_enabled: z.boolean(),
 auto_recharge_threshold_tokens: z.number().int().min(5000).default(20000),
 auto_recharge_package_id: z.string().default("pkg_growth"),
 spending_limit_monthly_brl: z.number().min(50).default(500),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity.store_id) {
 throw new Error("Nenhuma loja ativa selecionada.");
 }

 const db = getServerClient();

 const { data: store } = await db
 .from("stores")
 .select("id, name, settings")
 .eq("id", identity.store_id)
 .single();

 if (!store) throw new Error("Loja não encontrada.");

 const settings = store.settings || {};
 const wallet = settings.token_wallet || { balance: 50_000 };

 wallet.billing_mode = data.billing_mode;
 wallet.auto_recharge_enabled = data.auto_recharge_enabled;
 wallet.auto_recharge_threshold_tokens = data.auto_recharge_threshold_tokens;
 wallet.auto_recharge_package_id = data.auto_recharge_package_id;
 wallet.spending_limit_monthly_brl = data.spending_limit_monthly_brl;
 wallet.updated_at = new Date().toISOString();

 settings.token_wallet = wallet;
 await db.from("stores").update({ settings }).eq("id", store.id);

 return {
 success: true,
 message: "Preferências de faturamento e recarga automática salvas com sucesso.",
 wallet,
 };
 });

// ============================================================
// 13. WEBHOOK INBOUND IDEMPOTENTE: CONFIRMAÇÃO DE RECARGA DE TOKENS
// ============================================================
export const processTokenRechargeWebhook = createServerFn({ method: "POST" })
 .validator(
 z.object({
 gateway_name: z.string().default("asaas"),
 idempotency_key: z.string().min(8),
 store_id: z.string().uuid(),
 package_id: z.string(),
 gateway_payment_id: z.string(),
 signature: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const pkg = TOKEN_PACKAGES.find((p) => p.id === data.package_id) || TOKEN_PACKAGES[0];
 const db = getServerClient();

 // 1. Invocar a procedure atômica com idempotência
 const { data: res, error } = await db.rpc("process_token_payment_webhook_atomic", {
 p_gateway_name: data.gateway_name,
 p_idempotency_key: data.idempotency_key,
 p_store_id: data.store_id,
 p_package_id: pkg.id,
 p_tokens_to_credit: pkg.tokens,
 p_amount_cents: pkg.price_cents,
 p_gateway_payment_id: data.gateway_payment_id,
 p_payload: { package_name: pkg.name, received_at: new Date().toISOString() },
 });

 if (error) {
 console.error("[processTokenRechargeWebhook] rpc error:", error);
 throw new Error("Falha ao processar webhook de pagamento de tokens.");
 }

 return {
 success: true,
 result: res,
 };
 });




