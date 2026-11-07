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

// Helper para calcular status dinâmico com base na data de hoje
function computeStatus(ob: FinancialObligation): ObligationStatus {
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
 * Lista todas as contas a pagar da loja ativa com status dinâmico calculado
 */
export const listFinancialObligations = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requireFinance();
    const identity = await getServerIdentity();
    if (!identity.store_id) throw new Error("Contexto de loja inválido");

    const supabase = getServerClient();
    const { data: store, error } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", identity.store_id)
      .single();

    if (error || !store) throw new Error("Loja não encontrada.");

    const rawObligations: FinancialObligation[] =
      (store.settings as any)?.financial_obligations || [];

    // Normalizar status dinâmico e ordenar por data de vencimento
    const obligations = rawObligations
      .map((ob) => ({
        ...ob,
        status: computeStatus(ob),
      }))
      .sort((a, b) => {
        // Primeiro pendentes e vencidos por data crescente, depois pagos
        if (a.status === "paid" && b.status !== "paid") return 1;
        if (a.status !== "paid" && b.status === "paid") return -1;
        return a.due_date.localeCompare(b.due_date);
      });

    return obligations;
  } catch (err) {
    console.error("[financial-obligations.functions] listFinancialObligations error:", err);
    return [];
  }
});

/**
 * Cria uma nova conta a pagar
 */
export const createFinancialObligation = createServerFn({ method: "POST" })
  .validator(CreateObligationSchema)
  .handler(async ({ data }) => {
    await requireFinance();
    const identity = await getServerIdentity();
    if (!identity.store_id) throw new Error("Contexto de loja inválido");

    const supabase = getServerClient();
    const { data: store, error } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", identity.store_id)
      .single();

    if (error || !store) throw new Error("Loja não encontrada.");

    const currentSettings = (store.settings as any) || {};
    const obligations: FinancialObligation[] = currentSettings.financial_obligations || [];

    const now = new Date().toISOString();
    const newObligation: FinancialObligation = {
      id: crypto.randomUUID(),
      title: data.title.trim(),
      category: data.category,
      supplier_name: data.supplier_name.trim(),
      amount_cents: data.amount_cents,
      due_date: data.due_date,
      status: "pending",
      barcode: data.barcode?.trim() || undefined,
      recurrence: data.recurrence,
      notes: data.notes?.trim() || undefined,
      created_at: now,
      updated_at: now,
    };

    newObligation.status = computeStatus(newObligation);
    obligations.push(newObligation);

    const { error: updateError } = await supabase
      .from("stores")
      .update({
        settings: {
          ...currentSettings,
          financial_obligations: obligations,
        },
      })
      .eq("id", identity.store_id);

    if (updateError) throw new Error("Erro ao salvar conta a pagar: " + updateError.message);

    return newObligation;
  });

/**
 * Dá baixa no pagamento de uma conta a pagar
 */
export const markObligationAsPaid = createServerFn({ method: "POST" })
  .validator(MarkPaidSchema)
  .handler(async ({ data: { obligationId, paymentMethod, paidAt, notes } }) => {
    await requireFinance();
    const identity = await getServerIdentity();
    if (!identity.store_id) throw new Error("Contexto de loja inválido");

    const supabase = getServerClient();
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

    const now = new Date().toISOString();
    const target = obligations[targetIndex];

    target.status = "paid";
    target.paid_at = paidAt || now;
    target.payment_method = paymentMethod;
    if (notes) {
      target.notes = target.notes ? `${target.notes} | ${notes}` : notes;
    }
    target.updated_at = now;

    obligations[targetIndex] = target;

    const { error: updateError } = await supabase
      .from("stores")
      .update({
        settings: {
          ...currentSettings,
          financial_obligations: obligations,
        },
      })
      .eq("id", identity.store_id);

    if (updateError) throw new Error("Erro ao liquidar conta: " + updateError.message);

    // ── Sincronização Transacional com DRE (financial_transactions) & Caixa Ativo ──
    try {
      const expenseAmountCents = -Math.abs(target.amount_cents);

      // 1. Registro da Despesa no DRE e Livro Financeiro da Loja
      await supabase.from("financial_transactions").insert({
        store_id: identity.store_id,
        type: "expense_other",
        amount_cents: expenseAmountCents,
        description: `Pagamento: ${target.title}${target.supplier_name ? ` (${target.supplier_name})` : ""}`,
        category: target.category || "other",
        reference_date: (paidAt || now).slice(0, 10),
        created_by: identity.id,
      });

      // 2. Se a baixa foi feita em dinheiro vivo, registra a saída no Caixa Ativo (se houver turno aberto)
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
            notes: `Pagamento Conta: ${target.title}`,
            created_by: identity.id,
            channel_source: "pos_counter",
            marketplace_fee_cents: 0,
            net_payout_cents: expenseAmountCents,
            external_reference_id: target.id,
          });
        }
      }
    } catch (syncErr) {
      console.warn("[financial-obligations] Falha defensiva na sincronização de despesa com DRE/Caixa:", syncErr);
    }

    return target;
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
      .update({
        settings: {
          ...currentSettings,
          financial_obligations: updatedObligations,
        },
      })
      .eq("id", identity.store_id);

    if (updateError) throw new Error("Erro ao remover conta: " + updateError.message);

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
  const { data: store } = await supabase
    .from("stores")
    .select("settings")
    .eq("id", identity.store_id)
    .single();

  const rawObligations: FinancialObligation[] =
    (store?.settings as any)?.financial_obligations || [];

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
