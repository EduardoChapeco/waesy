import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { getServerClient } from "@/lib/supabase";
import { requireFinance, requireOwner, getServerIdentity } from "@/lib/server-access";

export type ObligationCategory =
  | "supplier"
  | "rent"
  | "utilities"
  | "payroll"
  | "tax"
  | "marketing"
  | "software"
  | "off_payroll_award"
  | "operator_net_payable"
  | "other";

export type ObligationStatus = "pending" | "paid" | "overdue" | "cancelled";
export type ObligationRecurrence = "none" | "monthly" | "weekly" | "yearly";

export interface FinancialObligation {
  id: string;
  title: string;
  category: ObligationCategory;
  supplier_name: string;
  amount_cents: number;
  due_date: string; // YYYY-MM-DD
  status: ObligationStatus;
  barcode?: string;
  paid_at?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  recurrence: ObligationRecurrence;
  source_type?: "manual" | "payroll" | "off_payroll_award" | "operator_net_payable";
  source_id?: string | null;
  off_payroll?: boolean;
  created_at: string;
  updated_at: string;
}

const CreateObligationSchema = z.object({
  title: z.string().min(2, "Título é obrigatório"),
  category: z.enum([
    "supplier",
    "rent",
    "utilities",
    "payroll",
    "tax",
    "marketing",
    "software",
    "off_payroll_award",
    "operator_net_payable",
    "other",
  ]),
  supplier_name: z.string().min(2, "Fornecedor ou favorecido é obrigatório"),
  amount_cents: z.number().int().positive("Valor deve ser maior que zero"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  barcode: z.string().optional(),
  recurrence: z.enum(["none", "monthly", "weekly", "yearly"]).default("none"),
  notes: z.string().optional(),
});

const MarkPaidSchema = z.object({
  obligationId: z.string().min(1),
  paymentMethod: z.string().default("pix"),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
});

const DeleteObligationSchema = z.object({
  obligationId: z.string().min(1),
});

function computeStatus(ob: Pick<FinancialObligation, "status" | "due_date">): ObligationStatus {
  if (ob.status === "paid" || ob.status === "cancelled") {
    return ob.status;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (ob.due_date < today) {
    return "overdue";
  }
  return "pending";
}

/**
 * Lista todas as contas a pagar da loja ativa na tabela SQL `financial_obligations`
 * (com merge retrocompatível de registros antigos em `stores.settings.financial_obligations`).
 */
export const listFinancialObligations = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requireFinance();
    const identity = await getServerIdentity();
    if (!identity.store_id) throw new Error("Contexto de loja inválido");

    const supabase = getServerClient();
    const [{ data: sqlRows, error: sqlErr }, { data: store }] = await Promise.all([
      supabase
        .from("financial_obligations")
        .select("*")
        .eq("store_id", identity.store_id)
        .order("due_date", { ascending: true }),
      supabase.from("stores").select("settings").eq("id", identity.store_id).maybeSingle(),
    ]);

    if (sqlErr) {
      throw new Error(sqlErr.message);
    }

    const legacyJsonRows: FinancialObligation[] =
      (store?.settings as any)?.financial_obligations || [];
    const seenIds = new Set((sqlRows || []).map((r: any) => r.id));

    const merged: FinancialObligation[] = [
      ...(sqlRows || []).map((ob: any) => ({
        ...ob,
        amount_cents: Number(ob.amount_cents || 0),
        status: computeStatus(ob),
      })),
      ...legacyJsonRows
        .filter((ob) => ob?.id && !seenIds.has(ob.id))
        .map((ob) => ({
          ...ob,
          status: computeStatus(ob),
        })),
    ];

    return merged.sort((a, b) => {
      if (a.status === "paid" && b.status !== "paid") return 1;
      if (a.status !== "paid" && b.status === "paid") return -1;
      return a.due_date.localeCompare(b.due_date);
    });
  } catch (err) {
    console.error("[financial-obligations.functions] listFinancialObligations error:", err);
    return [];
  }
});

/**
 * Cria uma nova conta a pagar diretamente na tabela SQL `financial_obligations`.
 */
export const createFinancialObligation = createServerFn({ method: "POST" })
  .validator(CreateObligationSchema)
  .handler(async ({ data }) => {
    await requireFinance();
    const identity = await getServerIdentity();
    if (!identity.store_id) throw new Error("Contexto de loja inválido");

    const supabase = getServerClient();
    const initialStatus = computeStatus({ status: "pending", due_date: data.due_date });
    const isOffPayroll = data.category === "off_payroll_award";

    const { data: inserted, error } = await supabase
      .from("financial_obligations")
      .insert({
        store_id: identity.store_id,
        title: data.title.trim(),
        category: data.category,
        supplier_name: data.supplier_name.trim(),
        amount_cents: data.amount_cents,
        due_date: data.due_date,
        status: initialStatus,
        barcode: data.barcode?.trim() || null,
        recurrence: data.recurrence,
        notes: data.notes?.trim() || null,
        source_type: isOffPayroll ? "off_payroll_award" : "manual",
        off_payroll: isOffPayroll,
        created_by: identity.id,
      })
      .select("*")
      .single();

    if (error || !inserted) {
      throw new Error("Erro ao salvar conta a pagar: " + (error?.message || "Falha de gravação"));
    }

    return inserted as FinancialObligation;
  });

/**
 * Dá baixa no pagamento de uma conta a pagar com sincronização no DRE e Caixa Ativo.
 */
export const markObligationAsPaid = createServerFn({ method: "POST" })
  .validator(MarkPaidSchema)
  .handler(async ({ data: { obligationId, paymentMethod, paidAt, notes } }) => {
    await requireFinance();
    const identity = await getServerIdentity();
    if (!identity.store_id) throw new Error("Contexto de loja inválido");

    const supabase = getServerClient();
    const now = new Date().toISOString();
    const resolvedPaidAt = paidAt || now;

    // 1. Tentar localizar na tabela SQL `financial_obligations`
    const { data: sqlTarget } = await supabase
      .from("financial_obligations")
      .select("*")
      .eq("id", obligationId)
      .eq("store_id", identity.store_id)
      .maybeSingle();

    let settledTarget: FinancialObligation | null = null;

    if (sqlTarget) {
      const nextNotes = notes
        ? sqlTarget.notes
          ? `${sqlTarget.notes} | ${notes}`
          : notes
        : sqlTarget.notes;
      const { data: updated, error: upErr } = await supabase
        .from("financial_obligations")
        .update({
          status: "paid",
          paid_at: resolvedPaidAt,
          payment_method: paymentMethod,
          notes: nextNotes,
          updated_at: now,
        })
        .eq("id", obligationId)
        .eq("store_id", identity.store_id)
        .select("*")
        .single();
      if (upErr || !updated) throw new Error("Erro ao liquidar conta: " + upErr?.message);
      settledTarget = updated as FinancialObligation;

      // Se vinculada a recibo por fora, sincroniza recibo e fichas
      if (sqlTarget.source_type === "off_payroll_award" && sqlTarget.source_id) {
        await supabase
          .from("travel_commission_payout_receipts")
          .update({
            status: "paid",
            paid_at: resolvedPaidAt,
            payment_method: paymentMethod,
            paid_by_profile_id: identity.id,
          })
          .eq("id", sqlTarget.source_id)
          .eq("store_id", identity.store_id);
        await supabase
          .from("travel_sale_financial_sheets")
          .update({ agent_commission_status: "paid" })
          .eq("agent_payout_receipt_id", sqlTarget.source_id)
          .eq("store_id", identity.store_id);
      }
    } else {
      // Fallback legado JSONB
      const { data: store, error } = await supabase
        .from("stores")
        .select("settings")
        .eq("id", identity.store_id)
        .single();
      if (error || !store) throw new Error("Loja não encontrada.");
      const currentSettings = (store.settings as any) || {};
      const obligations: FinancialObligation[] = currentSettings.financial_obligations || [];
      const targetIndex = obligations.findIndex((o) => o.id === obligationId);
      if (targetIndex === -1) throw new Error("Conta a pagar não encontrada.");
      const target = obligations[targetIndex];
      target.status = "paid";
      target.paid_at = resolvedPaidAt;
      target.payment_method = paymentMethod;
      if (notes) target.notes = target.notes ? `${target.notes} | ${notes}` : notes;
      target.updated_at = now;
      obligations[targetIndex] = target;
      const { error: updateError } = await supabase
        .from("stores")
        .update({ settings: { ...currentSettings, financial_obligations: obligations } })
        .eq("id", identity.store_id);
      if (updateError) throw new Error("Erro ao liquidar conta: " + updateError.message);
      settledTarget = target;
    }

    // ── Sincronização Transacional com DRE (financial_transactions) & Caixa Ativo ──
    try {
      const expenseAmountCents = -Math.abs(settledTarget.amount_cents);
      const dreCategory =
        settledTarget.category === "off_payroll_award"
          ? "premiacao_variavel_comercial"
          : settledTarget.category === "operator_net_payable"
            ? "repasse_net_operadora"
            : settledTarget.category || "other";

      await supabase.from("financial_transactions").insert({
        store_id: identity.store_id,
        type: "expense_other",
        amount_cents: expenseAmountCents,
        description: `Pagamento: ${settledTarget.title}${settledTarget.supplier_name ? ` (${settledTarget.supplier_name})` : ""}`,
        category: dreCategory,
        reference_date: resolvedPaidAt.slice(0, 10),
        created_by: identity.id,
      });

      if (paymentMethod === "cash") {
        const { data: openRegister } = await supabase
          .from("cash_registers")
          .select("id")
          .eq("store_id", identity.store_id)
          .eq("status", "open")
          .order("opened_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (openRegister) {
          await supabase.from("cash_register_entries").insert({
            cash_register_id: openRegister.id,
            order_id: null,
            amount_cents: expenseAmountCents,
            entry_type: "cash",
            payment_method: "cash",
            notes: `Pagamento Conta: ${settledTarget.title}`,
            created_by: identity.id,
            channel_source: "pos_counter",
            marketplace_fee_cents: 0,
            net_payout_cents: expenseAmountCents,
            external_reference_id: settledTarget.id,
          });
        }
      }
    } catch (syncErr) {
      console.warn("[financial-obligations] Falha defensiva na sincronização de despesa com DRE/Caixa:", syncErr);
    }

    return settledTarget;
  });

/**
 * Remove / cancela uma conta a pagar
 */
export const deleteFinancialObligation = createServerFn({ method: "POST" })
  .validator(DeleteObligationSchema)
  .handler(async ({ data: { obligationId } }) => {
    await requireOwner();
    const identity = await getServerIdentity();
    if (!identity.store_id) throw new Error("Contexto de loja inválido");

    const supabase = getServerClient();
    const { data: deletedSql } = await supabase
      .from("financial_obligations")
      .delete()
      .eq("id", obligationId)
      .eq("store_id", identity.store_id)
      .select("id");

    if (!deletedSql || deletedSql.length === 0) {
      const { data: store, error } = await supabase
        .from("stores")
        .select("settings")
        .eq("id", identity.store_id)
        .single();
      if (error || !store) throw new Error("Loja não encontrada.");
      const currentSettings = (store.settings as any) || {};
      const obligations: FinancialObligation[] = currentSettings.financial_obligations || [];
      const updatedObligations = obligations.filter((o) => o.id !== obligationId);
      const { error: updateError } = await supabase
        .from("stores")
        .update({ settings: { ...currentSettings, financial_obligations: updatedObligations } })
        .eq("id", identity.store_id);
      if (updateError) throw new Error("Erro ao remover conta: " + updateError.message);
    }

    return { success: true };
  });

/**
 * Exporta contas a pagar em CSV no formato contábil brasileiro
 */
export const exportObligationsCsv = createServerFn({ method: "GET" }).handler(async () => {
  await requireFinance();
  const identity = await getServerIdentity();
  if (!identity.store_id) throw new Error("Contexto de loja inválido");

  const supabase = getServerClient();
  const [{ data: sqlRows }, { data: store }] = await Promise.all([
    supabase
      .from("financial_obligations")
      .select("*")
      .eq("store_id", identity.store_id)
      .order("due_date", { ascending: true }),
    supabase.from("stores").select("settings").eq("id", identity.store_id).maybeSingle(),
  ]);

  const legacyRows: FinancialObligation[] = (store?.settings as any)?.financial_obligations || [];
  const seenIds = new Set((sqlRows || []).map((r: any) => r.id));
  const rawObligations: FinancialObligation[] = [
    ...((sqlRows || []) as FinancialObligation[]),
    ...legacyRows.filter((o) => !seenIds.has(o.id)),
  ];

  const headers = [
    "Título",
    "Categoria",
    "Fornecedor/Favorecido",
    "Vencimento",
    "Valor (R$)",
    "Status",
    "Data de Pagamento",
    "Meio de Pagamento",
    "Código de Barras / Linha Digitável",
    "Observações",
  ];

  const categoryLabels: Record<string, string> = {
    supplier: "Fornecedor de Insumos",
    rent: "Aluguel & Imóvel",
    utilities: "Água, Luz e Internet",
    payroll: "Folha / Colaboradores",
    tax: "Tributos & Impostos",
    marketing: "Publicidade & Mídia",
    software: "Software & Assinaturas",
    off_payroll_award: "Premiação Comercial (Por Fora)",
    operator_net_payable: "Repasse Net a Operadora",
    other: "Outras Despesas",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    paid: "Liquidado",
    overdue: "Vencido / Em Atraso",
    cancelled: "Cancelado",
  };

  const rows = rawObligations.map((ob) => {
    const status = computeStatus(ob);
    return [
      `"${ob.title.replace(/"/g, '""')}"`,
      categoryLabels[ob.category] || ob.category,
      `"${ob.supplier_name.replace(/"/g, '""')}"`,
      ob.due_date,
      (ob.amount_cents / 100).toFixed(2),
      statusLabels[status] || status,
      ob.paid_at ? ob.paid_at.slice(0, 10) : "",
      ob.payment_method || "",
      ob.barcode ? `"${ob.barcode}"` : "",
      ob.notes ? `"${ob.notes.replace(/"/g, '""')}"` : "",
    ].join(";");
  });

  const csv = [headers.join(";"), ...rows].join("\r\n");
  const filename = `contas_a_pagar_${new Date().toISOString().slice(0, 10)}.csv`;

  return { csv, filename };
});
