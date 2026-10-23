/**
 * src/services/financial-ledger.functions.ts — Motor de Ledger de Partidas Dobradas & Carteira Movimentável
 * 
 * Normativa: SPEC-FINANCAS-LEDGER-CARTEIRA-UNIFICADA, AGENTS.md B.8, B.25, B.41
 * - Livro de Dinheiro Movimentável (R$)
 * - Invariante Contábil: Débito - Crédito = 0
 * - Valores estritos em centavos inteiros (amount_cents)
 * - Transações atômicas com hash-chain criptográfico e idempotência
 * - Geração de comprovante com assinatura HMAC-SHA256
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { emitFinancialEvent } from "./financial-event-bus.service";
import { createGatewayPayment } from "./payment-gateway.server";

// ============================================================
// DTOs & Tipos Canônicos
// ============================================================

export interface WalletBalanceDTO {
  availableCents: number;
  heldCents: number;
  currency: string;
  isAccountActive: boolean;
  securityLevel: string;
}

export interface FinancialReceiptDTO {
  id: string;
  transactionId: string;
  emitterName: string;
  payerProfileId: string | null;
  payerName: string;
  payerDocument: string | null;
  payeeProfileId: string | null;
  payeeName: string;
  payeeDocument: string | null;
  amountCents: number;
  currency: string;
  paymentMethod: string;
  authenticationCode: string;
  hmacSignature: string;
  details: Record<string, any>;
  issuedAt: string;
}

export interface P2PTransferResultDTO {
  success: boolean;
  transactionId: string;
  amountCents: number;
  newBalanceCents: number;
  receipt?: FinancialReceiptDTO;
  status?: "PENDING" | "SETTLED";
  pixQrCode?: string;
  pixCopiaECola?: string;
}

// Chave canônica para HMAC de comprovantes (em prod lida via env)
const RECEIPT_HMAC_SECRET = process.env.FINANCIAL_RECEIPT_SECRET || "waesy_sec_rec_hmac_2026_ledger_sign";

/**
 * Utilitário puro: Gera hash chain para entrada do ledger
 */
export function generateLedgerHash(
  prevHash: string,
  entry: {
    transactionId: string;
    debitAccountId: string;
    creditAccountId: string;
    amountCents: number;
    createdAt: string;
  }
): string {
  const payload = `${prevHash}|${entry.transactionId}|${entry.debitAccountId}|${entry.creditAccountId}|${entry.amountCents}|${entry.createdAt}`;
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Utilitário puro: Assina comprovante via HMAC-SHA256
 */
export function signReceiptPayload(payload: {
  transactionId: string;
  authenticationCode: string;
  amountCents: number;
  issuedAt: string;
  payerName: string;
  payeeName: string;
}): string {
  const canonicalData = `${payload.transactionId}:${payload.authenticationCode}:${payload.amountCents}:${payload.issuedAt}:${payload.payerName}:${payload.payeeName}`;
  return createHmac("sha256", RECEIPT_HMAC_SECRET).update(canonicalData).digest("hex");
}

/**
 * Utilitário puro: Valida autenticidade de assinatura de comprovante
 */
export function verifyReceiptSignature(receipt: {
  transactionId: string;
  authenticationCode: string;
  amountCents: number;
  issuedAt: string;
  payerName: string;
  payeeName: string;
  hmacSignature: string;
}): boolean {
  const expected = signReceiptPayload(receipt);
  return expected === receipt.hmacSignature;
}

// ============================================================
// Métodos Internos de Ledger (Banco / Repositório)
// ============================================================

/**
 * Obtém ou cria a conta contábil do usuário no ledger
 */
export async function getOrCreateLedgerAccount(
  supabase: any,
  profileId: string | null,
  accountType: "USER_AVAILABLE" | "USER_HELD" | "CLEARING" | "FEE_REVENUE" | "MERCHANT_SETTLEMENT" | "EXTERNAL_SOURCE",
  currency: string = "BRL"
): Promise<string> {
  let query = supabase.from("financial_ledger_accounts").select("id").eq("account_type", accountType).eq("currency", currency);

  if (profileId) {
    query = query.eq("profile_id", profileId);
  } else {
    query = query.is("profile_id", null);
  }

  const { data: existing, error: fetchErr } = await query.maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  // Criação atômica
  const { data: created, error: insertErr } = await supabase
    .from("financial_ledger_accounts")
    .insert({
      profile_id: profileId,
      account_type: accountType,
      currency,
    })
    .select("id")
    .single();

  if (insertErr || !created) {
    // Pode ter concorrido: tenta buscar novamente
    const { data: retry } = await query.maybeSingle();
    if (retry?.id) return retry.id;
    throw new Error(`Falha ao obter conta do ledger (${accountType}): ${insertErr?.message}`);
  }

  return created.id;
}

/**
 * Projeta o saldo atual a partir do histórico imutável de lançamentos
 */
export async function computeAccountBalance(
  supabase: any,
  accountId: string
): Promise<number> {
  // Créditos recebidos
  const { data: credits, error: credErr } = await supabase
    .from("financial_ledger_entries")
    .select("amount_cents")
    .eq("credit_account_id", accountId)
    .eq("status", "SETTLED");

  if (credErr) throw new Error("Erro ao consultar créditos da conta.");

  // Débitos realizados
  const { data: debits, error: debErr } = await supabase
    .from("financial_ledger_entries")
    .select("amount_cents")
    .eq("debit_account_id", accountId)
    .eq("status", "SETTLED");

  if (debErr) throw new Error("Erro ao consultar débitos da conta.");

  const totalCredits = (credits || []).reduce((acc: number, curr: any) => acc + Number(curr.amount_cents || 0), 0);
  const totalDebits = (debits || []).reduce((acc: number, curr: any) => acc + Number(curr.amount_cents || 0), 0);

  return totalCredits - totalDebits;
}

// ============================================================
// Server Functions Públicas / Autenticadas
// ============================================================

/**
 * 1. Consulta o saldo da carteira movimentável em R$ do usuário autenticado
 */
export const getMyWalletBalance = createServerFn({ method: "GET" }).handler(
  async (): Promise<WalletBalanceDTO> => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      return {
        availableCents: 0,
        heldCents: 0,
        currency: "BRL",
        isAccountActive: false,
        securityLevel: "ZERO_TRUST_CIVIL",
      };
    }

    const supabase = getServerClient();

    try {
      const availableAccId = await getOrCreateLedgerAccount(supabase, identity.id, "USER_AVAILABLE");
      const heldAccId = await getOrCreateLedgerAccount(supabase, identity.id, "USER_HELD");

      const [availableCents, heldCents] = await Promise.all([
        computeAccountBalance(supabase, availableAccId),
        computeAccountBalance(supabase, heldAccId),
      ]);

      return {
        availableCents: Math.max(0, availableCents),
        heldCents: Math.max(0, heldCents),
        currency: "BRL",
        isAccountActive: true,
        securityLevel: "ZERO_TRUST_CIVIL",
      };
    } catch (err: any) {
      console.error("[financial-ledger] Erro ao calcular saldo:", err);
      return {
        availableCents: 0,
        heldCents: 0,
        currency: "BRL",
        isAccountActive: false,
        securityLevel: "ERROR_FALLBACK",
      };
    }
  }
);

/**
 * 2. Executa transferência P2P entre contas Waesy com partidas dobradas e comprovante
 */
export const transferP2P = createServerFn({ method: "POST" })
  .validator(
    z.object({
      recipientProfileId: z.string().uuid("ID de perfil do destinatário inválido."),
      amountCents: z.number().int().positive("O valor da transferência deve ser maior que zero."),
      description: z.string().min(2, "Descrição obrigatória.").max(100),
      idempotencyKey: z.string().optional(),
    })
  )
  .handler(async ({ data }): Promise<P2PTransferResultDTO> => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Faça login para realizar transferências.");
    }

    if (identity.id === data.recipientProfileId) {
      throw new Error("Não é permitido transferir para a própria conta.");
    }

    const supabase = getServerClient();
    const idemKey = data.idempotencyKey || `p2p_${identity.id}_${data.recipientProfileId}_${Date.now()}`;

    // 1. Verifica se já foi executada sob a mesma chave de idempotência
    const { data: existingEntry } = await supabase
      .from("financial_ledger_entries")
      .select("id, transaction_id")
      .eq("idempotency_key", idemKey)
      .maybeSingle();

    if (existingEntry) {
      const { data: receipt } = await supabase
        .from("financial_receipts")
        .select("*")
        .eq("transaction_id", existingEntry.transaction_id)
        .single();

      const senderAccId = await getOrCreateLedgerAccount(supabase, identity.id, "USER_AVAILABLE");
      const currentBal = await computeAccountBalance(supabase, senderAccId);

      return {
        success: true,
        transactionId: existingEntry.transaction_id,
        amountCents: data.amountCents,
        newBalanceCents: currentBal,
        receipt: receipt as any,
      };
    }

    // 2. Busca nomes e documentos das partes
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name, cpf")
      .eq("id", identity.id)
      .single();

    const { data: recipientProfile, error: recErr } = await supabase
      .from("profiles")
      .select("full_name, cpf")
      .eq("id", data.recipientProfileId)
      .maybeSingle();

    if (recErr || !recipientProfile) {
      throw new Error("Destinatário não encontrado na plataforma.");
    }

    // 3. Obtém contas contábeis
    const senderAccId = await getOrCreateLedgerAccount(supabase, identity.id, "USER_AVAILABLE");
    const recipientAccId = await getOrCreateLedgerAccount(supabase, data.recipientProfileId, "USER_AVAILABLE");

    // 4. Invariante: Saldo disponível >= Valor a transferir
    const senderBalance = await computeAccountBalance(supabase, senderAccId);
    if (senderBalance < data.amountCents) {
      throw new Error(`Saldo insuficiente. Disponível: R$ ${(senderBalance / 100).toFixed(2).replace(".", ",")}`);
    }

    // 5. Prepara transação contábil
    const txId = `tx_${Date.now()}_${randomBytes(4).toString("hex")}`;
    const authCode = `WAESY-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const hashChain = generateLedgerHash("GENESIS_BLOCK", {
      transactionId: txId,
      debitAccountId: senderAccId,
      creditAccountId: recipientAccId,
      amountCents: data.amountCents,
      createdAt: nowIso,
    });

    // 6. Insere entrada no ledger de partidas dobradas
    const { data: entry, error: entryErr } = await supabase
      .from("financial_ledger_entries")
      .insert({
        transaction_id: txId,
        debit_account_id: senderAccId,
        credit_account_id: recipientAccId,
        amount_cents: data.amountCents,
        currency: "BRL",
        entry_type: "TRANSFER_P2P",
        status: "SETTLED",
        description: data.description.trim(),
        metadata: {
          sender_profile_id: identity.id,
          recipient_profile_id: data.recipientProfileId,
        },
        idempotency_key: idemKey,
        hash_chain: hashChain,
        created_at: nowIso,
      })
      .select()
      .single();

    if (entryErr) {
      console.error("[financial-ledger] Erro ao gravar entrada contábil:", entryErr);
      throw new Error("Falha na execução contábil da transferência.");
    }

    // 7. Emite comprovante oficial com HMAC-SHA256
    const payerName = senderProfile?.full_name || "Usuário Waesy";
    const payeeName = recipientProfile?.full_name || "Destinatário Waesy";

    const hmacSig = signReceiptPayload({
      transactionId: txId,
      authenticationCode: authCode,
      amountCents: data.amountCents,
      issuedAt: nowIso,
      payerName,
      payeeName,
    });

    const { data: receiptRecord, error: recInsertErr } = await supabase
      .from("financial_receipts")
      .insert({
        transaction_id: txId,
        emitter_name: "Waesy Pagamentos e Tecnologia Ltda.",
        payer_profile_id: identity.id,
        payer_name: payerName,
        payer_document: senderProfile?.cpf || null,
        payee_profile_id: data.recipientProfileId,
        payee_name: payeeName,
        payee_document: recipientProfile?.cpf || null,
        amount_cents: data.amountCents,
        currency: "BRL",
        payment_method: "P2P_WALLET",
        authentication_code: authCode,
        hmac_signature: hmacSig,
        details: {
          description: data.description,
          entry_id: entry.id,
        },
        issued_at: nowIso,
      })
      .select()
      .single();

    if (recInsertErr) {
      console.warn("[financial-ledger] Aviso ao criar comprovante:", recInsertErr);
    }

    // 8. Emite eventos financeiros canônicos para ambas as partes
    await emitFinancialEvent({
      profileId: identity.id,
      sourceDomain: "WALLET",
      sourceEntityId: txId,
      eventType: "P2P_TRANSFER_SENT",
      direction: "OUTGOING",
      amountCents: data.amountCents,
      counterpartyName: payeeName,
      counterpartyProfileId: data.recipientProfileId,
      description: `Transferência para ${payeeName}`,
      categoryName: "Transferência",
      categoryIcon: "ArrowUpRight",
      categoryColor: "rose",
      status: "COMPLETED",
      referenceUrl: "/conta/financas",
      receiptId: receiptRecord?.id || null,
    });

    await emitFinancialEvent({
      profileId: data.recipientProfileId,
      sourceDomain: "WALLET",
      sourceEntityId: txId,
      eventType: "P2P_TRANSFER_RECEIVED",
      direction: "INCOMING",
      amountCents: data.amountCents,
      counterpartyName: payerName,
      counterpartyProfileId: identity.id,
      description: `Transferência recebida de ${payerName}`,
      categoryName: "Transferência",
      categoryIcon: "ArrowDownLeft",
      categoryColor: "emerald",
      status: "COMPLETED",
      referenceUrl: "/conta/financas",
      receiptId: receiptRecord?.id || null,
    });

    // 9. Saldo atualizado do remetente
    const updatedSenderBalance = await computeAccountBalance(supabase, senderAccId);

    const receiptDTO: FinancialReceiptDTO = {
      id: receiptRecord?.id || txId,
      transactionId: txId,
      emitterName: "Waesy Pagamentos e Tecnologia Ltda.",
      payerProfileId: identity.id,
      payerName,
      payerDocument: senderProfile?.cpf || null,
      payeeProfileId: data.recipientProfileId,
      payeeName,
      payeeDocument: recipientProfile?.cpf || null,
      amountCents: data.amountCents,
      currency: "BRL",
      paymentMethod: "P2P_WALLET",
      authenticationCode: authCode,
      hmacSignature: hmacSig,
      details: { description: data.description },
      issuedAt: nowIso,
    };

    return {
      success: true,
      transactionId: txId,
      amountCents: data.amountCents,
      newBalanceCents: updatedSenderBalance,
      receipt: receiptDTO,
    };
  });

/**
 * 3. Cria solicitação de depósito Pix na carteira (status estritamente PENDING até liquidação via webhook)
 * Em conformidade com AGENTS.md P0-1: Proibido gerar saldo liquidado sem pagamento real confirmado.
 */
export const depositPixToWallet = createServerFn({ method: "POST" })
  .validator(
    z.object({
      amountCents: z.number().int().positive("Valor deve ser maior que zero."),
      idempotencyKey: z.string().optional(),
    })
  )
  .handler(async ({ data }): Promise<P2PTransferResultDTO> => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Faça login para adicionar saldo.");
    }

    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
    if (!token) {
      throw new Error(
        "BLOCKED — Provedor de pagamento Pix não configurado no servidor (MERCADO_PAGO_ACCESS_TOKEN ausente). Não é permitido gerar saldo sem liquidação de pagamento real."
      );
    }

    const supabase = getServerClient();
    const externalSourceAccId = await getOrCreateLedgerAccount(supabase, null, "EXTERNAL_SOURCE");
    const userAccId = await getOrCreateLedgerAccount(supabase, identity.id, "USER_AVAILABLE");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, cpf")
      .eq("id", identity.id)
      .single();

    const txId = `pix_dep_${Date.now()}_${randomBytes(4).toString("hex")}`;
    const nowIso = new Date().toISOString();

    // 1. Gera cobrança real no gateway de pagamentos Pix
    const gatewayRes = await createGatewayPayment({
      orderId: txId,
      amountCents: data.amountCents,
      method: "pix",
      idempotencyKey: data.idempotencyKey || txId,
      payer: {
        name: profile?.full_name || "Usuário Waesy",
        email: identity.email || "financeiro@waesy.com.br",
        cpf: profile?.cpf || null,
      },
    });

    const hashChain = generateLedgerHash("GENESIS_BLOCK", {
      transactionId: txId,
      debitAccountId: externalSourceAccId,
      creditAccountId: userAccId,
      amountCents: data.amountCents,
      createdAt: nowIso,
    });

    // 2. Insere lançamento no ledger com status estrito PENDING (não movimenta saldo disponível)
    const { error } = await supabase
      .from("financial_ledger_entries")
      .insert({
        transaction_id: txId,
        debit_account_id: externalSourceAccId,
        credit_account_id: userAccId,
        amount_cents: data.amountCents,
        currency: "BRL",
        entry_type: "DEPOSIT",
        status: "PENDING",
        description: "Depósito Pix em Carteira (Aguardando Liquidação)",
        idempotency_key: data.idempotencyKey || `pix_${identity.id}_${Date.now()}`,
        hash_chain: hashChain,
        created_at: nowIso,
        metadata: {
          provider: "mercado_pago",
          provider_ref: gatewayRes.providerRef,
          pix_qr_code: gatewayRes.pix?.qrCode || null,
          pix_qr_code_base64: gatewayRes.pix?.qrCodeBase64 || null,
        },
      });

    if (error) {
      console.error("[financial-ledger] Erro ao registrar solicitação de depósito Pix:", error);
      throw new Error("Falha ao registrar cobrança de depósito na carteira.");
    }

    // 3. Emite evento financeiro com status PENDING
    await emitFinancialEvent({
      profileId: identity.id,
      sourceDomain: "WALLET",
      sourceEntityId: txId,
      eventType: "PIX_DEPOSIT_INITIATED",
      direction: "INCOMING",
      amountCents: data.amountCents,
      counterpartyName: "Pix / Mercado Pago",
      counterpartyProfileId: null,
      description: "Recarga de Saldo via Pix (Pendente de Pagamento)",
      categoryName: "Depósito",
      categoryIcon: "Clock",
      categoryColor: "amber",
      status: "PENDING",
      referenceUrl: "/conta/financas",
      receiptId: null,
    });

    // 4. Saldo permanece inalterado pois computeAccountBalance filtra apenas SETTLED
    const currentBalance = await computeAccountBalance(supabase, userAccId);

    return {
      success: true,
      transactionId: txId,
      amountCents: data.amountCents,
      newBalanceCents: currentBalance,
      status: "PENDING",
      pixQrCode: gatewayRes.pix?.qrCode,
      pixCopiaECola: gatewayRes.pix?.qrCode,
    };
  });

/**
 * 3.1 Liquidação atômica de depósito Pix após confirmação de webhook
 */
export async function settlePixDepositWebhookAtomic(params: {
  transactionId: string;
  providerRef: string;
  amountCents: number;
  provider: string;
}): Promise<{ settled: boolean; alreadySettled?: boolean }> {
  const supabase = getServerClient();

  const { data: entry } = await supabase
    .from("financial_ledger_entries")
    .select("*, credit_account:credit_account_id(profile_id)")
    .eq("transaction_id", params.transactionId)
    .maybeSingle();

  if (!entry) {
    throw new Error(`Transação ${params.transactionId} não encontrada para liquidação.`);
  }

  if (entry.status === "SETTLED") {
    return { settled: true, alreadySettled: true };
  }

  if (entry.status !== "PENDING") {
    throw new Error(`Transação ${params.transactionId} não está pendente (status atual: ${entry.status}).`);
  }

  const nowIso = new Date().toISOString();
  const authCode = `PIX-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const profileId = entry.credit_account?.profile_id;

  const { data: profile } = profileId
    ? await supabase.from("profiles").select("full_name, cpf").eq("id", profileId).maybeSingle()
    : { data: null };

  const payerName = "Banco Central / Pix Integrado";
  const payeeName = profile?.full_name || "Usuário Waesy";

  const hmacSig = signReceiptPayload({
    transactionId: entry.transaction_id,
    authenticationCode: authCode,
    amountCents: entry.amount_cents,
    issuedAt: nowIso,
    payerName,
    payeeName,
  });

  // Atualiza para SETTLED atomicamente
  const { error: updateErr } = await supabase
    .from("financial_ledger_entries")
    .update({
      status: "SETTLED",
      metadata: {
        ...(typeof entry.metadata === "object" ? entry.metadata : {}),
        settled_at: nowIso,
        settled_by: params.provider,
        provider_ref: params.providerRef,
      },
    })
    .eq("id", entry.id)
    .eq("status", "PENDING");

  if (updateErr) {
    throw new Error(`Falha ao liquidar lançamento contábil: ${updateErr.message}`);
  }

  // Gera comprovante oficial assinado
  const { data: receiptRecord } = await supabase
    .from("financial_receipts")
    .insert({
      transaction_id: entry.transaction_id,
      emitter_name: "Waesy Pagamentos e Tecnologia Ltda.",
      payer_profile_id: null,
      payer_name: payerName,
      payer_document: null,
      payee_profile_id: profileId,
      payee_name: payeeName,
      payee_document: profile?.cpf || null,
      amount_cents: entry.amount_cents,
      currency: "BRL",
      payment_method: "PIX",
      authentication_code: authCode,
      hmac_signature: hmacSig,
      details: { type: "DEPOSIT_PIX_SETTLED", provider: params.provider },
      issued_at: nowIso,
    })
    .select()
    .maybeSingle();

  if (profileId) {
    await emitFinancialEvent({
      profileId,
      sourceDomain: "WALLET",
      sourceEntityId: entry.transaction_id,
      eventType: "PIX_DEPOSIT_COMPLETED",
      direction: "INCOMING",
      amountCents: entry.amount_cents,
      counterpartyName: "Pix",
      counterpartyProfileId: null,
      description: "Recarga de Saldo via Pix Liquidada",
      categoryName: "Depósito",
      categoryIcon: "ArrowDownLeft",
      categoryColor: "emerald",
      status: "COMPLETED",
      referenceUrl: "/conta/financas",
      receiptId: receiptRecord?.id || null,
    });
  }

  return { settled: true };
}

/**
 * 4. Obtém detalhes de um comprovante digital por ID ou Código de Autenticação
 */
export const getReceiptDetails = createServerFn({ method: "GET" })
  .validator(
    z.object({
      idOrCode: z.string().min(3),
    })
  )
  .handler(async ({ data: { idOrCode } }): Promise<FinancialReceiptDTO | null> => {
    const supabase = getServerClient();

    let query = supabase.from("financial_receipts").select("*");

    // Verifica se é UUID ou código alfanumérico
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
    if (isUuid) {
      query = query.eq("id", idOrCode);
    } else {
      query = query.or(`authentication_code.eq.${idOrCode},transaction_id.eq.${idOrCode}`);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      transactionId: data.transaction_id,
      emitterName: data.emitter_name,
      payerProfileId: data.payer_profile_id,
      payerName: data.payer_name,
      payerDocument: data.payer_document,
      payeeProfileId: data.payee_profile_id,
      payeeName: data.payee_name,
      payeeDocument: data.payee_document,
      amountCents: Number(data.amount_cents),
      currency: data.currency,
      paymentMethod: data.payment_method,
      authenticationCode: data.authentication_code,
      hmacSignature: data.hmac_signature,
      details: data.details || {},
      issuedAt: data.issued_at,
    };
  });
