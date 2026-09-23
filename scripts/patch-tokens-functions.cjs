const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'services', 'tokens.functions.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update imports
if (!content.includes('requireTokensOrTollbooth')) {
  content = content.replace(
    `import { recordLedgerEntryCore } from "@/services/immutable-ledger.functions";`,
    `import { recordLedgerEntryCore } from "@/services/immutable-ledger.functions";\nimport { requireTokensOrTollbooth } from "@/lib/token-tollbooth.server";`
  );
}

// 2. Add burn rates for new B2B harvesters & crawler
const newBurnRates = `  fiscal_nfe_issue: { tokens: 150, label: "Emissão de Nota Fiscal (NF-e / NFS-e)", approx_brl: "R$ 0,0073" },
  shipping_label_thermal: { tokens: 50, label: "Geração de Etiqueta Térmica de Envio", approx_brl: "R$ 0,0024" },
  ai_editorial_rewrite: { tokens: 50, label: "Reescrita Editorial OpenSquad & SEO", approx_brl: "R$ 0,0024" },
  public_tender_unlock: { tokens: 100, label: "Desbloqueio de Edital de Licitação Curado", approx_brl: "R$ 0,0049" },
  public_tender_ai_digest: { tokens: 250, label: "Dossiê Executivo de Licitação com IA", approx_brl: "R$ 0,0122" },
  magic_onboarding_crawl: { tokens: 300, label: "Onboarding Mágico via Crawler IA (Firecrawl/Steel)", approx_brl: "R$ 0,0147" },`;

content = content.replace(
  `  fiscal_nfe_issue: { tokens: 150, label: "Emissão de Nota Fiscal (NF-e / NFS-e)", approx_brl: "R$ 0,0073" },\n  shipping_label_thermal: { tokens: 50, label: "Geração de Etiqueta Térmica de Envio", approx_brl: "R$ 0,0024" },`,
  newBurnRates
);

// 3. Replace getStoreTokenWallet
const getWalletRegex = /\/\/ 1\. LOJISTA: CARREGAR CARTEIRA DE TOKENS & CONSUMÔMETRO[\s\S]*?export const purchaseTokenPackage =/;
const newGetWallet = `// 1. LOJISTA: CARREGAR CARTEIRA DE TOKENS & CONSUMÔMETRO
// ============================================================
export const getStoreTokenWallet = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  if (!identity.store_id) {
    throw new Error("Nenhuma loja ativa selecionada.");
  }

  const db = getServerClient();

  // 1. Assegurar inicialização canônica com selo gênesis se necessário
  await db.rpc("ensure_store_token_wallet", { p_store_id: identity.store_id });

  // 2. Buscar carteira real na tabela ACID store_token_wallets
  const { data: walletRow, error: walletErr } = await db
    .from("store_token_wallets")
    .select("*")
    .eq("store_id", identity.store_id)
    .single();

  if (walletErr || !walletRow) {
    throw new Error("Carteira de tokens da loja não encontrada.");
  }

  const { data: store } = await db
    .from("stores")
    .select("id, name, slug")
    .eq("id", identity.store_id)
    .single();

  // 3. Buscar histórico forense no ledger imutável
  const { data: ledgerLogs } = await db
    .from("token_ledger_transactions")
    .select("id, amount, balance_after, action_type, description, metadata, time_saved_minutes, tamper_seal, created_at")
    .eq("store_id", identity.store_id)
    .order("created_at", { ascending: false })
    .limit(25);

  const transactions = (ledgerLogs || []).map((tx: any) => ({
    id: tx.id,
    created_at: tx.created_at,
    action_type: tx.action_type,
    amount: tx.amount,
    balance_after: tx.balance_after,
    description: tx.description,
    time_saved_minutes: tx.time_saved_minutes || 0,
    tamper_seal: tx.tamper_seal,
    metadata: tx.metadata || {},
  }));

  return {
    store_id: identity.store_id,
    store_name: store?.name || "Minha Loja",
    balance: walletRow.balance ?? 50_000,
    promotional_balance: walletRow.promotional_balance ?? 50_000,
    purchased_balance: walletRow.purchased_balance ?? 0,
    lifetime_purchased: walletRow.lifetime_purchased ?? 50_000,
    lifetime_consumed: walletRow.lifetime_consumed ?? 0,
    estimated_time_saved_hours: Number(walletRow.estimated_time_saved_hours ?? 24.0),
    is_locked: walletRow.is_locked ?? false,
    lock_reason: walletRow.lock_reason ?? null,
    packages: TOKEN_PACKAGES,
    burn_rates: TOKEN_BURN_RATES,
    transactions,
  };
});

// ============================================================
// 2. LOJISTA: RECARREGAR PACOTE DE TOKENS (PIX / GATEWAY COM SELO FORENSE)
// ============================================================
export const purchaseTokenPackage =`;

content = content.replace(getWalletRegex, newGetWallet);

// 4. Replace purchaseTokenPackage implementation
const purchaseRegex = /export const purchaseTokenPackage = createServerFn\(\{ method: "POST" \}\)[\s\S]*?export const consumeTokens =/;
const newPurchase = `export const purchaseTokenPackage = createServerFn({ method: "POST" })
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
    const idempotencyKey = \`pkg_buy_\${identity.store_id}_\${pkg.id}_\${Date.now()}\`;
    const gatewayPaymentId = \`pay_\${Date.now()}_\${Math.random().toString(36).substring(2, 8)}\`;

    // Crédito estrito via processamento atômico de recarga
    const { error: rechargeErr } = await db.rpc("process_token_payment_webhook_atomic", {
      p_gateway_name: data.payment_method === "pix" ? "asaas_pix" : "stripe_card",
      p_idempotency_key: idempotencyKey,
      p_store_id: identity.store_id,
      p_package_id: pkg.id,
      p_tokens_to_credit: pkg.tokens,
      p_amount_cents: pkg.price_cents,
      p_gateway_payment_id: gatewayPaymentId,
      p_payload: {
        package_name: pkg.name,
        payment_method: data.payment_method,
        authorized_by: identity.id,
        received_at: new Date().toISOString(),
      },
    });

    if (rechargeErr) {
      console.error("[purchaseTokenPackage] Erro ao processar recarga atômica:", rechargeErr);
      throw new Error(\`Falha ao certificar compra no Ledger: \${rechargeErr.message}\`);
    }

    // Buscar novo saldo da carteira
    const { data: updatedWallet } = await db
      .from("store_token_wallets")
      .select("balance, purchased_balance")
      .eq("store_id", identity.store_id)
      .single();

    const newBalance = updatedWallet?.balance ?? 50_000;

    return {
      success: true,
      new_balance: newBalance,
      tokens_added: pkg.tokens,
      message: \`Recarga certificada com sucesso! +\${pkg.tokens_formatted} Tokens adicionados ao seu Ledger.\`,
    };
  });

// ============================================================
// 3. SISTEMA / BFF: CONSUMIR TOKENS DE UMA AÇÃO (TOLLBOOTH ACID ROW-LOCK)
// ============================================================
export const consumeTokens =`;

content = content.replace(purchaseRegex, newPurchase);

// 5. Replace consumeTokens implementation
const consumeRegex = /export const consumeTokens = createServerFn\(\{ method: "POST" \}\)[\s\S]*?export const getGlobalTokenStatsAdmin =/;
const newConsume = `export const consumeTokens = createServerFn({ method: "POST" })
  .validator(
    z.object({
      tokens: z.number().int().min(1),
      action_type: z.string(),
      description: z.string(),
      time_saved_minutes: z.number().int().min(0).default(0),
      service_category: z.string().default("general"),
      metadata: z.record(z.any()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.store_id) {
      throw new Error("Nenhuma loja ativa selecionada.");
    }

    const db = getServerClient();
    const idempotencyKey = \`consume_\${identity.store_id}_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`;

    // Abate direto via Tollbooth Interceptor no banco (ACID + Anti-Tamper)
    const { data: chargeRes, error: chargeErr } = await db.rpc("charge_token_tollbooth", {
      p_store_id: identity.store_id,
      p_tokens_to_consume: data.tokens,
      p_action_type: data.action_type,
      p_description: data.description,
      p_idempotency_key: idempotencyKey,
      p_service_category: data.service_category,
      p_time_saved_minutes: data.time_saved_minutes,
      p_metadata: {
        actor_id: identity.id,
        actor_role: identity.role,
        ...(data.metadata || {}),
      },
    });

    if (chargeErr) {
      console.error("[consumeTokens] Erro RPC no banco de dados:", chargeErr);
      throw new Error(\`Falha no Ledger de Tokens: \${chargeErr.message}\`);
    }

    const res = chargeRes as any;

    if (!res || !res.success) {
      return {
        success: false,
        error: res?.error || "INSUFFICIENT_TOKENS",
        current_balance: res?.current_balance ?? 0,
        required_tokens: data.tokens,
        message: res?.message || \`Saldo insuficiente para realizar esta aceleração.\`,
      };
    }

    return {
      success: true,
      new_balance: res.new_balance,
      tokens_consumed: res.tokens_consumed,
      time_saved_minutes: res.time_saved_minutes,
      transaction_seal: res.transaction_seal,
      message: \`Aceleração ativada com sucesso (-\${data.tokens.toLocaleString()} Tokens).\`,
    };
  });

// ============================================================
// 4. ADMIN MASTER: GESTÃO GLOBAL DE CIRCULAÇÃO DE TOKENS
// ============================================================
export const getGlobalTokenStatsAdmin =`;

content = content.replace(consumeRegex, newConsume);

// 6. Replace grantBonusTokensAdmin
const grantRegex = /export const grantBonusTokensAdmin = createServerFn\(\{ method: "POST" \}\)[\s\S]*?export const getStoreGrowthAndBounties =/;
const newGrant = `export const grantBonusTokensAdmin = createServerFn({ method: "POST" })
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
    const idempotencyKey = \`admin_grant_\${data.store_id}_\${Date.now()}\`;

    const { data: creditRes, error } = await db.rpc("credit_store_tokens_strict", {
      p_store_id: data.store_id,
      p_tokens_to_credit: data.tokens,
      p_origin_type: "master_admin_grant",
      p_origin_reference_id: identity.id,
      p_description: \`Bônus concedido pela Administração Waesy: \${data.reason}\`,
      p_idempotency_key: idempotencyKey,
      p_is_purchased: false,
      p_metadata: {
        granted_by: identity.id,
        reason: data.reason,
      },
    });

    if (error || !(creditRes as any)?.success) {
      throw new Error(\`Falha ao conceder tokens no ledger: \${error?.message || (creditRes as any)?.message}\`);
    }

    return {
      success: true,
      new_balance: (creditRes as any).new_balance,
      tokens_granted: (creditRes as any).tokens_credited,
      transaction_seal: (creditRes as any).transaction_seal,
      message: \`+\${data.tokens.toLocaleString()} Tokens bônus concedidos com sucesso e selados no Ledger!\`,
    };
  });

// ============================================================
// 6. LOJISTA: PAINEL DE CRESCIMENTO ORGÂNICO & BOUNTIES VIRAIS
// ============================================================
export const getStoreGrowthAndBounties =`;

content = content.replace(grantRegex, newGrant);

// 7. Replace recordStoreOrganicReferral
const referralRegex = /export const recordStoreOrganicReferral = createServerFn\(\{ method: "POST" \}\)[\s\S]*?export const runTokenReconciliationAdmin =/;
const newReferral = `export const recordStoreOrganicReferral = createServerFn({ method: "POST" })
  .validator(
    z.object({
      store_id: z.string().uuid(),
      referred_user_id: z.string().uuid().optional(),
      channel: z.string().default("biolink_qr_code"),
    }),
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    const BOUNTY_TOKENS = 100_000;
    const idempotencyKey = \`referral_bounty_\${data.store_id}_\${data.referred_user_id || Date.now()}\`;

    const { data: creditRes, error } = await db.rpc("credit_store_tokens_strict", {
      p_store_id: data.store_id,
      p_tokens_to_credit: BOUNTY_TOKENS,
      p_origin_type: "kyc_verified_referral_bounty",
      p_origin_reference_id: data.referred_user_id || "ANONYMOUS_SIGNUP",
      p_description: "Bounty Viral: Novo cliente cadastrado através do seu link próprio (+100.000 Tokens)",
      p_idempotency_key: idempotencyKey,
      p_is_purchased: false,
      p_metadata: {
        channel: data.channel,
        referred_user_id: data.referred_user_id,
      },
    });

    if (error || !(creditRes as any)?.success) {
      throw new Error(\`Falha ao creditar bounty viral no ledger: \${error?.message || (creditRes as any)?.message}\`);
    }

    return {
      success: true,
      tokens_awarded: BOUNTY_TOKENS,
      store_new_balance: (creditRes as any).new_balance,
      transaction_seal: (creditRes as any).transaction_seal,
      message: \`+\${BOUNTY_TOKENS.toLocaleString()} Tokens creditados com selo forense!\`,
    };
  });

// ============================================================
// 9. ADMIN MASTER: EXECUTAR CONCILIAÇÃO & AUDITORIA CRIPTOGRÁFICA
// ============================================================
export const runTokenReconciliationAdmin =`;

content = content.replace(referralRegex, newReferral);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched tokens.functions.ts!');
