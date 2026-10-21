/**
 * credits.functions.ts — Camada de Compatibilidade Canônica do Ecossistema $WZ
 *
 * O antigo subsistema de "Créditos" foi formalmente unificado sob a engine $WZ.
 * Todo saldo de loja passa a residir em wz_token_buckets com escopo 'MERCHANT'.
 * É terminantemente proibido qualquer saque, resgate em dinheiro ou transferência via PIX.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSSRClient, getServerIdentity } from "@/lib/server-access";
import { getServerClient } from "@/lib/supabase";
import { wzToBrlCentsReference, brlCentsToWz, formatWz } from "@/lib/wz-quote-engine";

export const getCustomerCredits = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    if (!user) {
      return { balance_cents: 0, balance_wz: 0, customer_credit_transactions: [] };
    }

    const { resolveTenantStoreId } = await import("@/lib/tenant.server");
    const storeId = await resolveTenantStoreId();

    if (!storeId) {
      return { balance_cents: 0, balance_wz: 0, customer_credit_transactions: [] };
    }

    const db = getServerClient();

    // Consulta na engine canônica wz_token_buckets
    const { data: bucket } = await db
      .from("wz_token_buckets")
      .select("id, available_balance")
      .eq("user_id", user.id)
      .eq("scope_type", "MERCHANT")
      .eq("scope_id", storeId)
      .maybeSingle();

    const availableWz = Number(bucket?.available_balance || 0);
    const balanceCents = wzToBrlCentsReference(availableWz);

    // Consulta transações no ledger canônico
    const { data: ledgerEntries } = await db
      .from("wz_token_ledger")
      .select("id, amount_wz, description, created_at")
      .eq("bucket_id", bucket?.id || "00000000-0000-0000-0000-000000000000")
      .order("created_at", { ascending: false })
      .limit(20);

    const transactions = (ledgerEntries || []).map((t: any) => ({
      id: t.id,
      amount_cents: wzToBrlCentsReference(Number(t.amount_wz || 0)),
      amount_wz: Number(t.amount_wz || 0),
      reason: t.description,
      created_at: t.created_at,
    }));

    return {
      balance_cents: balanceCents,
      balance_wz: availableWz,
      balance_wz_formatted: formatWz(availableWz),
      customer_credit_transactions: transactions,
    };
  } catch (e: unknown) {
    console.warn("[credits] getCustomerCredits fallback:", e);
    return { balance_cents: 0, balance_wz: 0, customer_credit_transactions: [] };
  }
});

/**
 * Bloqueio Inviolável de Saque / PIX de Saldos de Loja
 * Invariant B.8 & Prompt Mestre: "Nenhum WZ emitido por empresa pode virar Pix ou saque".
 */
export const requestRedemption = createServerFn({ method: "POST" })
  .validator(
    z.object({
      amount_cents: z.number().int().min(100),
      pix_key: z.string().min(5),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const db = getServerClient();

    // Registrar tentativa violadora de saque de crédito de loja
    await db.from("audit_logs").insert({
      user_id: identity.id || null,
      action: "security_illegal_pix_cashout_blocked",
      entity_type: "token_security_alert",
      payload_snapshot: {
        attempted_by: identity.id,
        amount_cents: data.amount_cents,
        pix_key: data.pix_key,
        policy: "ZERO_CASHOUT_INVARIANT",
        reason: "Créditos e $WZ de empresas são restritos a descontos em compras e não podem gerar saque Pix",
        timestamp: new Date().toISOString(),
      },
    });

    throw new Error(
      "ZERO_CASHOUT_VIOLATION: Saldos promocionais, fidelidade e créditos de lojas em $WZ são instrumentos de desconto restritos a compras naquela empresa e não podem ser convertidos em dinheiro ou transferências via PIX."
    );
  });
