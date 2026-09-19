/**
 * immutable-ledger.functions.ts — Ledger Criptográfico Imutável (Bacen / Blockchain-like)
 * 
 * Centraliza o registro de partidas contábeis e transações de alto valor (Tokens, PIX,
 * Carteira, Carnês, Gift Cards) com encadeamento de hashes SHA-256 e RLS Zero-Trust.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, requirePlatformAdmin } from "@/lib/server-access";
import { getRequest } from "@tanstack/start-server-core";
import { extractClientIp } from "@/lib/rate-limiter";

export const LedgerTransactionTypeSchema = z.enum([
  "token_purchase",
  "token_spend",
  "token_transfer",
  "carne_issued",
  "carne_installment_paid",
  "wallet_deposit",
  "wallet_withdraw",
  "pix_received",
  "pix_sent",
  "giftcard_redeemed",
  "commission_payout",
  "escrow_hold",
  "escrow_release",
  "order_payment",
  "booking_payment",
]);

export type LedgerTransactionType = z.infer<typeof LedgerTransactionTypeSchema>;

function extractCloudflareGeo(req?: Request | null) {
  if (!req) return { country: null, city: null };
  return {
    country: req.headers.get("cf-ipcountry") || null,
    city: req.headers.get("cf-ipcity") || null,
  };
}

export interface RecordLedgerCoreParams {
  transactionType: LedgerTransactionType;
  amountCents?: number;
  tokenAmount?: number;
  senderId?: string | null;
  receiverId?: string | null;
  storeId?: string | null;
  organizationId?: string | null;
  referenceEntityType?: string | null;
  referenceEntityId?: string | null;
  metadata?: Record<string, any>;
  idempotencyKey?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  geoCountry?: string | null;
  geoCity?: string | null;
}

// ─── Função Core para Invocação Direta Server-Side ────────────────────────────

export async function recordLedgerEntryCore(input: RecordLedgerCoreParams) {
  const supabase = getServerClient();
  let ip = input.ipAddress || null;
  let ua = input.userAgent || null;
  let country = input.geoCountry || null;
  let city = input.geoCity || null;

  try {
    const req = getRequest();
    if (req) {
      if (!ip) ip = extractClientIp(req);
      if (!ua) ua = req.headers.get("user-agent") || null;
      const geo = extractCloudflareGeo(req);
      if (!country) country = geo.country;
      if (!city) city = geo.city;
    }
  } catch {
    // Contexto fora de request HTTP direta (cron, background task)
  }

  const actorId = input.actorId || null;
  const actorRole = input.actorRole || "authenticated_user";

  // 1. Invocar RPC segura no Postgres para cálculo de hash e encadeamento
  const { data: entry, error } = await supabase.rpc("record_immutable_ledger_entry", {
    p_transaction_type: input.transactionType,
    p_amount_cents: input.amountCents ?? 0,
    p_token_amount: input.tokenAmount ?? 0,
    p_sender_id: input.senderId || null,
    p_receiver_id: input.receiverId || null,
    p_store_id: input.storeId || null,
    p_organization_id: input.organizationId || null,
    p_reference_entity_type: input.referenceEntityType || null,
    p_reference_entity_id: input.referenceEntityId || null,
    p_metadata: input.metadata || {},
    p_actor_id: actorId,
    p_actor_role: actorRole,
    p_ip_address: ip,
    p_user_agent: ua,
    p_geo_country: country,
    p_geo_city: city,
    p_idempotency_key: input.idempotencyKey || null,
  });

  if (error) {
    console.error("[immutable-ledger] Erro ao gravar entrada no ledger criptográfico:", error);
    throw new Error(`Falha ao certificar transação no ledger imutável: ${error.message}`);
  }

  // 2. Telemetria Forense Universal Sincronizada
  try {
    await supabase.from("forensic_audit_events").insert({
      actor_id: actorId,
      actor_role: actorRole,
      target_entity_type: "financial_immutable_ledger",
      target_entity_id: entry?.id ? String(entry.id) : input.referenceEntityId || null,
      action: `LEDGER_${input.transactionType.toUpperCase()}`,
      ip_address: ip,
      user_agent: ua,
      payload_snapshot: {
        sequence_number: entry?.sequence_number,
        entry_hash: entry?.entry_hash,
        prev_hash: entry?.prev_hash,
        amount_cents: input.amountCents ?? 0,
        token_amount: input.tokenAmount ?? 0,
        idempotency_key: input.idempotencyKey,
      },
      checksum_sha256: entry?.entry_hash || null,
    });
  } catch (telemetryErr) {
    console.warn("[immutable-ledger] Fallback de telemetria forense secundária:", telemetryErr);
  }

  return {
    success: true,
    entry,
    certificate: {
      hash: entry?.entry_hash,
      sequence: entry?.sequence_number,
      timestamp: entry?.created_at,
      standard: "BACEN_PCI_SHA256",
    },
  };
}

// ─── 1. Registrar Transação no Ledger Criptográfico (BFF Server Function) ────────

export const recordLedgerTransaction = createServerFn({ method: "POST" })
  .validator(
    z.object({
      transactionType: LedgerTransactionTypeSchema,
      amountCents: z.number().int().min(0).default(0),
      tokenAmount: z.number().int().min(0).default(0),
      senderId: z.string().uuid().optional().nullable(),
      receiverId: z.string().uuid().optional().nullable(),
      storeId: z.string().uuid().optional().nullable(),
      organizationId: z.string().uuid().optional().nullable(),
      referenceEntityType: z.string().optional().nullable(),
      referenceEntityId: z.string().optional().nullable(),
      metadata: z.record(z.any()).default({}),
      idempotencyKey: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    return recordLedgerEntryCore({
      ...input,
      actorId: identity?.id || null,
      actorRole: identity?.role || "authenticated_user",
    });
  });

// ─── 2. Verificar Integridade Matemática da Cadeia de Hashes (Merkle/Chain) ─────

export const verifyLedgerIntegrity = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getServerClient();
    const identity = await requirePlatformAdmin();

    const { data, error } = await supabase.rpc("verify_ledger_chain_integrity");

    if (error) {
      console.error("[immutable-ledger] Erro na verificação forense da cadeia:", error);
      throw new Error(`Falha ao auditar cadeia criptográfica: ${error.message}`);
    }

    const report = Array.isArray(data) ? data[0] : data;
    return {
      isValid: Boolean(report?.is_valid),
      totalEntries: Number(report?.total_entries || 0),
      brokenAtSequence: report?.broken_at_sequence ? Number(report.broken_at_sequence) : null,
      genesisHash: report?.genesis_hash,
      latestHash: report?.latest_hash,
      details: report?.details,
      auditedAt: new Date().toISOString(),
      auditor: identity.id,
    };
  });

// ─── 3. Listar Entradas do Ledger com Rastreabilidade Estrita ───────────────────

export const listLedgerEntries = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      transactionType: LedgerTransactionTypeSchema.optional(),
      limit: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    const isSuper = identity.role === "admin" || identity.role === "superadmin";

    let query = supabase
      .from("financial_immutable_ledger")
      .select("*")
      .order("sequence_number", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.storeId) {
      query = query.eq("store_id", input.storeId);
    } else if (!isSuper) {
      // Se não for superadmin e não passou store, restringe às próprias operações
      query = query.or(`sender_id.eq.${identity.id},receiver_id.eq.${identity.id},actor_id.eq.${identity.id}`);
    }

    if (input.transactionType) {
      query = query.eq("transaction_type", input.transactionType);
    }

    const { data: entries, error } = await query;

    if (error) {
      console.error("[immutable-ledger] Erro ao listar extrato do ledger:", error);
      throw new Error(`Falha ao buscar extrato do ledger: ${error.message}`);
    }

    return {
      entries: entries || [],
      count: entries?.length || 0,
    };
  });
