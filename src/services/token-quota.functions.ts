/**
 * token-quota.functions.ts — Motor Canônico de Cotas Diárias e Contabilidade de Tokens de IA (Waesy)
 * 
 * Regras Centrais (Épico 4 / REQ-TOK-01 a REQ-TOK-06):
 * 1. Unidade calibrada em escala real de LLMs (kTokens e MTokens).
 * 2. Cota diária gratuita de 100.000 tokens para cada usuário civil autenticado renovada a cada 24h.
 * 3. Isenção total (0 tokens) para pesquisa comercial local e leitura de notícias.
 * 4. Débito proporcional em mineração de CNPJs (25k), documentos corporativos (75k) e builders de sites (250k).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

// ── 1. CONFIGURAÇÃO DE CUSTO E LIMITES (SSOT) ──

export const DAILY_FREE_CIVIL_TOKENS = 100_000;

export const TOKEN_COST_TABLE = {
  // Isenções Totais (0 Tokens)
  commercial_search: { tokens: 0, label: "Busca de Lojas e Produtos Locais", isFree: true },
  news_reading: { tokens: 0, label: "Leitura de Notícias da Cidade", isFree: true },
  feed_browsing: { tokens: 0, label: "Navegação no Feed Social", isFree: true },

  // Consumo Operacional / IA
  copilot_chat_turn: { tokens: 1_000, label: "Mensagem com Assistente Copilot", isFree: false },
  cnpj_mining_batch: { tokens: 25_000, label: "Mineração e Enriquecimento de Lista CNPJ", isFree: false },
  doc_generation_pdf: { tokens: 75_000, label: "Geração de Dossiê / Relatório em PDF", isFree: false },
  doc_generation_sheet: { tokens: 75_000, label: "Geração de Planilha Estruturada", isFree: false },
  doc_generation_presentation: { tokens: 90_000, label: "Geração de Apresentação de Slides", isFree: false },
  site_generation_full: { tokens: 250_000, label: "Geração de Site Completo no Omni-Builder", isFree: false },
  site_section_ai_refine: { tokens: 30_000, label: "Refinamento de Seção de Site via IA", isFree: false },
} as const;

export type TokenOperationType = keyof typeof TOKEN_COST_TABLE;

// Schemas Zod
export const CheckQuotaSchema = z.object({
  operation: z.string(),
});

export const ConsumeTokensSchema = z.object({
  operation: z.string(),
  customTokenAmount: z.number().int().positive().optional(),
  metadata: z.record(z.any()).optional(),
});

// ── 2. SERVER FUNCTIONS ──

/**
 * Retorna o estado atual da cota diária de tokens do usuário civil autenticado.
 */
export const getCivilDailyQuota = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  if (!identity.id) {
    return {
      isAuthenticated: false,
      dailyLimit: 0,
      usedToday: 0,
      remainingToday: 0,
      extraBalance: 0,
      resetAt: new Date(Date.now() + 86400000).toISOString(),
    };
  }

  const db = getServerClient();
  const todayDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Buscar registro de cota diária de hoje
  const { data: quotaRow } = await db
    .from("user_daily_token_quotas")
    .select("used_tokens, last_reset_date")
    .eq("user_id", identity.id)
    .eq("quota_date", todayDate)
    .maybeSingle();

  // Buscar saldo de tokens extras comprados na carteira
  const { data: walletRow } = await db
    .from("user_token_wallets")
    .select("balance")
    .eq("user_id", identity.id)
    .maybeSingle();

  const usedToday = quotaRow?.used_tokens || 0;
  const remainingToday = Math.max(0, DAILY_FREE_CIVIL_TOKENS - usedToday);
  const extraBalance = walletRow?.balance || 0;

  // Calcular momento do reset (meia-noite UTC)
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);

  return {
    isAuthenticated: true,
    dailyLimit: DAILY_FREE_CIVIL_TOKENS,
    usedToday,
    remainingToday,
    extraBalance,
    totalAvailable: remainingToday + extraBalance,
    resetAt: tomorrow.toISOString(),
  };
});

/**
 * Valida previamente se o usuário possui cota suficiente para a operação pretendida.
 */
export const checkCivilTokenCapability = createServerFn({ method: "POST" })
  .validator(CheckQuotaSchema)
  .handler(async ({ data: { operation } }) => {
    const costConfig = (TOKEN_COST_TABLE as any)[operation] || { tokens: 1_000, isFree: false };
    if (costConfig.isFree || costConfig.tokens === 0) {
      return { allowed: true, requiredTokens: 0, isFree: true };
    }

    const quota = await getCivilDailyQuota();
    if (!quota.isAuthenticated) {
      return { allowed: false, requiredTokens: costConfig.tokens, reason: "unauthenticated" };
    }

    const hasEnough = quota.totalAvailable >= costConfig.tokens;
    return {
      allowed: hasEnough,
      requiredTokens: costConfig.tokens,
      remainingToday: quota.remainingToday,
      extraBalance: quota.extraBalance,
      reason: hasEnough ? undefined : "quota_exceeded",
    };
  });

/**
 * Debita tokens da cota diária (ou do saldo extra) após execução de operação de IA.
 */
export const consumeCivilTokens = createServerFn({ method: "POST" })
  .validator(ConsumeTokensSchema)
  .handler(async ({ data: { operation, customTokenAmount, metadata } }) => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Autenticação necessária para consumir serviços com inteligência artificial.");
    }

    const costConfig = (TOKEN_COST_TABLE as any)[operation];
    const amountToDebit = customTokenAmount ?? (costConfig ? costConfig.tokens : 1_000);

    // Se for operação gratuita (0 tokens), registra apenas telemetria sem débito
    if (amountToDebit === 0) {
      return { success: true, debited: 0, fromQuota: 0, fromExtra: 0 };
    }

    const db = getServerClient();
    const todayDate = new Date().toISOString().slice(0, 10);

    // 1. Obter estado atual da cota diária
    const { data: quotaRow } = await db
      .from("user_daily_token_quotas")
      .select("id, used_tokens")
      .eq("user_id", identity.id)
      .eq("quota_date", todayDate)
      .maybeSingle();

    const usedToday = quotaRow?.used_tokens || 0;
    const quotaAvailable = Math.max(0, DAILY_FREE_CIVIL_TOKENS - usedToday);

    let debitFromQuota = 0;
    let debitFromExtra = 0;

    if (quotaAvailable >= amountToDebit) {
      debitFromQuota = amountToDebit;
    } else {
      debitFromQuota = quotaAvailable;
      debitFromExtra = amountToDebit - quotaAvailable;
    }

    // 2. Se exigir tokens extras, validar saldo da carteira
    if (debitFromExtra > 0) {
      const { data: wallet } = await db
        .from("user_token_wallets")
        .select("balance")
        .eq("user_id", identity.id)
        .maybeSingle();

      const currentExtra = wallet?.balance || 0;
      if (currentExtra < debitFromExtra) {
        throw new Error(
          `Cota diária de tokens esgotada para esta operação. Necessário: ${amountToDebit.toLocaleString()} tokens. Disponível: ${(quotaAvailable + currentExtra).toLocaleString()} tokens. Faça uma recarga ou aguarde a renovação diária.`
        );
      }

      // Debitar carteira extra
      await db
        .from("user_token_wallets")
        .update({ balance: currentExtra - debitFromExtra })
        .eq("user_id", identity.id);
    }

    // 3. Atualizar cota diária de hoje
    if (quotaRow?.id) {
      await db
        .from("user_daily_token_quotas")
        .update({
          used_tokens: usedToday + debitFromQuota,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quotaRow.id);
    } else {
      await db.from("user_daily_token_quotas").insert({
        user_id: identity.id,
        quota_date: todayDate,
        used_tokens: debitFromQuota,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // 4. Registro de auditoria transparente
    await db.from("audit_logs").insert({
      user_id: identity.id,
      entity_type: "user_token_consumption",
      action: `token_debit:${operation}`,
      payload_snapshot: {
        operation,
        amount_total: amountToDebit,
        debited_quota: debitFromQuota,
        debited_extra: debitFromExtra,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      debited: amountToDebit,
      fromQuota: debitFromQuota,
      fromExtra: debitFromExtra,
      remainingDaily: Math.max(0, DAILY_FREE_CIVIL_TOKENS - (usedToday + debitFromQuota)),
    };
  });
