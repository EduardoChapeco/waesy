/**
 * token-tollbooth.server.ts — Universal Token Billing Engine & Bank-Grade Interceptor
 * 
 * Middleware central para monetização server-side strict (The Tollbooth).
 * Intercepta chamadas de IA pesada, Scrapers (Firecrawl/Steel), Licitações e Crawlers.
 * Abate o saldo de forma transacional (ACID no Postgres) ANTES de disparar serviços externos.
 * Oferece compensação automática (auto-refund) caso a API externa falhe.
 */

import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { randomUUID } from "node:crypto";

export interface TollboothRequestOptions<T> {
  storeId?: string | null;
  tokens: number;
  actionType:
    | "burn_ai_curate"
    | "burn_ai_rewrite"
    | "burn_ai_summarize"
    | "burn_scrape_url"
    | "burn_content_import_url"
    | "burn_batch_crawl"
    | "burn_tender_unlock"
    | "burn_tender_digest"
    | "burn_magic_onboarding"
    | "burn_lead_enrich"
    | "burn_ai_agent_chat"
    | "burn_market_insight"
    | "system_burn_service";
  description: string;
  idempotencyKey?: string | null;
  serviceCategory?:
    | "heavy_ia_llm"
    | "firecrawl_scraper"
    | "steel_browser"
    | "tender_ai_digest"
    | "magic_onboarding"
    | "internal_media"
    | "general";
  timeSavedMinutes?: number;
  metadata?: Record<string, any>;
  executeAction: () => Promise<T>;
}

export interface TollboothReceipt {
  tokensDeducted: number;
  newBalance: number;
  transactionId: string;
  transactionSeal: string;
  idempotencyKey: string;
  alreadyProcessed?: boolean;
}

export class TollboothError extends Error {
  public code: string;
  public details?: any;
  public status: number;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = "TollboothError";
    this.code = code;
    this.details = details;
    this.status = code === "INSUFFICIENT_TOKENS" || code === "INSUFFICIENT_PURCHASED_TOKENS" ? 402 : 403;
  }
}

/**
 * Universal Tollbooth Interceptor (The Tollbooth)
 * 
 * 1. Autentica e extrai a loja ativa
 * 2. Valida conciliação e abate tokens atomicamente no Postgres
 * 3. Se saldo insuficiente ou carteira travada, ABORTA antes de chamar a infra
 * 4. Executa a ação do provedor
 * 5. Em caso de falha de infra externa (timeout 500), estorna os tokens automaticamente
 */
export async function requireTokensOrTollbooth<T>(
  options: TollboothRequestOptions<T>
): Promise<{ result: T; tollboothReceipt: TollboothReceipt }> {
  const db = getServerClient();
  const identity = await getServerIdentity();

  // 1. Identificar loja segura
  const storeId = options.storeId || identity?.store_id;
  if (!storeId) {
    throw new TollboothError(
      "STORE_REQUIRED",
      "Nenhuma loja ativa selecionada para tarifação de Tokens."
    );
  }

  // 2. Chave de Idempotência
  const idempotencyKey =
    options.idempotencyKey ||
    `tb_${options.actionType}_${storeId}_${Date.now()}_${randomUUID().slice(0, 8)}`;

  // 3. Executar cobrança pré-voo no Postgres com Lock ACID
  const { data: chargeRes, error: chargeErr } = await db.rpc("charge_token_tollbooth", {
    p_store_id: storeId,
    p_tokens_to_consume: options.tokens,
    p_action_type: options.actionType,
    p_description: options.description,
    p_idempotency_key: idempotencyKey,
    p_service_category: options.serviceCategory || "general",
    p_time_saved_minutes: options.timeSavedMinutes || 0,
    p_metadata: {
      actor_id: identity?.id || null,
      actor_role: identity?.role || "user",
      ...(options.metadata || {}),
    },
  });

  if (chargeErr) {
    console.error("[Tollbooth] Erro de RPC no banco de dados:", chargeErr);
    throw new TollboothError(
      "TOLLBOOTH_DB_FAILURE",
      `Falha na comunicação com o Ledger de Tokens: ${chargeErr.message}`
    );
  }

  const res = chargeRes as any;

  if (!res || !res.success) {
    const errorCode = res?.error || "CHARGE_REJECTED";
    const errorMessage = res?.message || "Operação rejeitada pelo sistema de tokens.";
    console.warn(`[Tollbooth] Cobrança bloqueada (${errorCode}): ${errorMessage}`, res);
    throw new TollboothError(errorCode, errorMessage, res);
  }

  const receipt: TollboothReceipt = {
    tokensDeducted: res.already_processed ? 0 : (res.tokens_consumed ?? options.tokens),
    newBalance: res.new_balance ?? res.balance_after,
    transactionId: res.transaction_id,
    transactionSeal: res.transaction_seal,
    idempotencyKey,
    alreadyProcessed: Boolean(res.already_processed),
  };

  // 4. Executar o serviço de IA / Crawler com segurança
  try {
    const result = await options.executeAction();
    return { result, tollboothReceipt: receipt };
  } catch (upstreamError: any) {
    // 5. Compensação Automática (Auto-Refund) caso o serviço de IA/Scraper falhe
    console.error("[Tollbooth] Falha na execução da infraestrutura externa. Disparando estorno criptográfico...", upstreamError);

    try {
      const refundIdemp = `refund_${receipt.transactionId || idempotencyKey}`;
      await db.rpc("credit_store_tokens_strict", {
        p_store_id: storeId,
        p_tokens_to_credit: options.tokens,
        p_origin_type: "reversal_refund",
        p_origin_reference_id: receipt.transactionId || idempotencyKey,
        p_description: `Estorno Automático Tollbooth: falha upstream em ${options.actionType} (${upstreamError.message || "Erro de rede"})`,
        p_idempotency_key: refundIdemp,
        p_is_purchased: options.serviceCategory === "heavy_ia_llm" || options.serviceCategory === "firecrawl_scraper",
        p_metadata: {
          original_action: options.actionType,
          original_transaction_id: receipt.transactionId,
          error: upstreamError.message || String(upstreamError),
        },
      });
      console.log(`[Tollbooth] Estorno de ${options.tokens} Tokens concedido com sucesso para loja ${storeId}`);
    } catch (refundErr) {
      console.error("[Tollbooth] ALERTA CRÍTICO: Falha ao conceder estorno automático de tokens:", refundErr);
    }

    throw upstreamError;
  }
}
