/**
 * invoices.functions.ts — BFF para Gestão de Faturas da Loja com a Plataforma Waesy
 * Padrão BigTech | Zero Mocks | Isolamento Multi-Tenant Rigoroso
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export interface StoreInvoiceDTO {
  id: string;
  store_id: string;
  description: string;
  amount_cents: number;
  due_date: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  paid_at: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Campos calculados em tempo de execução
  is_overdue: boolean;
  days_overdue: number;
  fine_cents: number;
  interest_cents: number;
  total_payable_cents: number;
}

/**
 * 1. Listar faturas da loja atual da sessão
 */
export const getStoreInvoicesList = createServerFn({ method: "GET" }).handler(
  async (): Promise<StoreInvoiceDTO[]> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);
    const storeId = identity.store_id;

    const db = getServerClient();
    const { data, error } = await db
      .from("platform_invoices")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[invoices.functions] Erro ao listar faturas da loja:", error);
      throw new Error("Não foi possível carregar as faturas: " + error.message);
    }

    const now = new Date();

    return (data || []).map((inv: any) => {
      const isPaid = inv.status === "paid";
      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
      let daysOverdue = 0;
      let fineCents = 0;
      let interestCents = 0;
      let totalPayableCents = inv.amount_cents || 0;
      let isOverdue = false;

      if (!isPaid && dueDate && now.getTime() > dueDate.getTime()) {
        const diffMs = now.getTime() - dueDate.getTime();
        daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        isOverdue = true;
        // Multa padrão brasileira de 2%
        fineCents = Math.round((inv.amount_cents || 0) * 0.02);
        // Juros pro-rata de 1% ao mês (0,033% ao dia)
        const dailyRate = 0.01 / 30;
        interestCents = Math.round((inv.amount_cents || 0) * dailyRate * daysOverdue);
        totalPayableCents = (inv.amount_cents || 0) + fineCents + interestCents;
      }

      return {
        id: inv.id,
        store_id: inv.store_id,
        description: inv.description,
        amount_cents: inv.amount_cents,
        due_date: inv.due_date,
        status: inv.status,
        paid_at: inv.paid_at,
        receipt_url: inv.receipt_url,
        notes: inv.notes,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
        is_overdue: isOverdue,
        days_overdue: daysOverdue,
        fine_cents: fineCents,
        interest_cents: interestCents,
        total_payable_cents: totalPayableCents,
      };
    });
  }
);

/**
 * 2. Enviar comprovante de pagamento bancário da fatura pelo lojista
 */
export const submitStoreInvoicePaymentProof = createServerFn({ method: "POST" })
  .validator(
    z.object({
      invoiceId: z.string().uuid(),
      receiptUrl: z.string().url("URL de comprovante inválida"),
      notes: z.string().max(500).optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);
    const storeId = identity.store_id;

    const db = getServerClient();

    // Validação de autoridade: A fatura pertence de fato a esta loja?
    const { data: invoice, error: fetchErr } = await db
      .from("platform_invoices")
      .select("id, status, store_id")
      .eq("id", data.invoiceId)
      .eq("store_id", storeId)
      .single();

    if (fetchErr || !invoice) {
      throw new Error("Fatura não encontrada ou não pertence à sua loja.");
    }

    if (invoice.status === "paid") {
      throw new Error("Esta fatura já foi confirmada como paga pela administração.");
    }

    const now = new Date().toISOString();
    const updatedNotes = data.notes
      ? `[${now.slice(0, 10)}] ${data.notes}`
      : `Comprovante bancário anexado em ${now.slice(0, 16)}`;

    const { error: updateErr } = await db
      .from("platform_invoices")
      .update({
        receipt_url: data.receiptUrl,
        notes: updatedNotes,
      })
      .eq("id", data.invoiceId);

    if (updateErr) {
      console.error("[invoices.functions] Erro ao anexar comprovante:", updateErr);
      throw new Error("Falha ao salvar comprovante: " + updateErr.message);
    }

    // Registra evento para auditoria
    try {
      await db.from("forensic_audit_events").insert({
        actor_id: identity.id,
        actor_role: "merchant",
        target_entity_type: "platform_invoice",
        target_entity_id: data.invoiceId,
        action: "invoice_payment_proof_submitted",
        payload_snapshot: { receipt_url: data.receiptUrl, store_id: storeId },
      });
    } catch {}

    return {
      success: true,
      message: "Comprovante enviado com sucesso! A administração realizará a conferência e baixa.",
    };
  });

/**
 * 3. Detalhes de PIX da Plataforma para liquidação de fatura
 */
export const getStoreInvoicePixDetails = createServerFn({ method: "GET" })
  .validator(z.object({ invoiceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);
    const storeId = identity.store_id;
    const db = getServerClient();

    const { data: inv } = await db
      .from("platform_invoices")
      .select("id, amount_cents, description, status, due_date")
      .eq("id", data.invoiceId)
      .eq("store_id", storeId)
      .single();

    if (!inv) throw new Error("Fatura não encontrada.");

    // Chave PIX oficial da plataforma Waesy
    const pixKey = "financeiro@usewaesy.com";
    const beneficiaryName = "Waesy Tecnologia e Pagamentos Ltda";

    return {
      invoiceId: inv.id,
      amountCents: inv.amount_cents,
      pixKey,
      beneficiaryName,
      pixCopyPaste: `00020126360014BR.GOV.BCB.PIX0114${pixKey}520400005303986540${(inv.amount_cents / 100).toFixed(2)}5802BR5925${beneficiaryName.slice(0, 25)}6009SAO PAULO62070503***6304`,
    };
  });
