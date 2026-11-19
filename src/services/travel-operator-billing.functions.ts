import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";

export const GetOperatorBillingSummarySchema = z.object({
  storeId: z.string().uuid().optional(),
  competenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

/**
 * Consolida a cobrança por operadora (Borderôs a Receber, NFS-e sobre Receita da Agência,
 * e Net a Pagar à Operadora quando a agência reteve à vista no balcão).
 */
export const getOperatorBillingSummaryFn = createServerFn({ method: "GET" })
  .validator(GetOperatorBillingSummarySchema.optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(
      identity,
      ["owner", "admin", "manager", "finance", "gerente", "diretor", "financeiro"],
      data?.storeId,
    );
    const storeId = identity.store_id;
    const supabase = getServerClient();

    let sheetsQuery = supabase
      .from("travel_sale_financial_sheets")
      .select("*")
      .eq("store_id", storeId)
      .neq("booking_status", "cancelada")
      .order("sale_date", { ascending: false });

    if (data?.competenceMonth) {
      sheetsQuery = sheetsQuery.eq("competence_month", data.competenceMonth);
    }

    const [{ data: sheets }, { data: suppliers }, { data: batches }] = await Promise.all([
      sheetsQuery,
      supabase
        .from("travel_suppliers")
        .select("id, name, legal_name, document, email, financial_email, billing_cycle, base_agency_commission_pct, over_retention_pct_when_financed, nfse_required")
        .eq("store_id", storeId),
      supabase
        .from("travel_operator_billing_batches")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const supplierByName = new Map<string, any>();
    for (const sup of suppliers || []) {
      supplierByName.set(String(sup.name || "").trim().toLowerCase(), sup);
    }

    const groupedByOperator = new Map<
      string,
      {
        operatorName: string;
        operatorDocument: string | null;
        financialEmail: string | null;
        billingCycle: string;
        nfseRequired: boolean;
        salesCount: number;
        totalGrossCents: number;
        totalNetBaseCents: number;
        totalAgencyRevenueCents: number;
        totalExpectedReceivableCents: number;
        totalReceivedCents: number;
        pendingReceivableCents: number;
        cashRetainedAgencyCents: number;
        netPayableToOperatorCents: number;
        pendingInvoiceCount: number;
        sheets: any[];
      }
    >();

    for (const sheet of sheets || []) {
      const opName = String(sheet.primary_operator || "Outras Operadoras").trim();
      const sup = supplierByName.get(opName.toLowerCase());
      if (!groupedByOperator.has(opName)) {
        groupedByOperator.set(opName, {
          operatorName: opName,
          operatorDocument: sup?.document || null,
          financialEmail: sup?.financial_email || sup?.email || null,
          billingCycle: sup?.billing_cycle || "mensal",
          nfseRequired: sup?.nfse_required !== false,
          salesCount: 0,
          totalGrossCents: 0,
          totalNetBaseCents: 0,
          totalAgencyRevenueCents: 0,
          totalExpectedReceivableCents: 0,
          totalReceivedCents: 0,
          pendingReceivableCents: 0,
          cashRetainedAgencyCents: 0,
          netPayableToOperatorCents: 0,
          pendingInvoiceCount: 0,
          sheets: [],
        });
      }

      const bucket = groupedByOperator.get(opName)!;
      const gross = Number(sheet.gross_sale_cents || 0);
      const netBase = Number(sheet.net_sale_cents || 0);
      const agencyRev = Number(sheet.agency_revenue_cents || 0);
      const received = Number(sheet.received_cents || 0);
      const isCashAtCounter =
        sheet.settlement_method === "comissao_balcao_a_vista" || Boolean(sheet.is_cash_settled);
      const expectedRec = isCashAtCounter ? 0 : Number(sheet.expected_receipt_cents || agencyRev);
      const pendingRec =
        sheet.receivable_status === "recebido" ? 0 : Math.max(0, expectedRec - received);

      bucket.salesCount += 1;
      bucket.totalGrossCents += gross;
      bucket.totalNetBaseCents += netBase;
      bucket.totalAgencyRevenueCents += agencyRev;
      bucket.totalExpectedReceivableCents += expectedRec;
      bucket.totalReceivedCents += received;
      bucket.pendingReceivableCents += pendingRec;

      if (isCashAtCounter) {
        bucket.cashRetainedAgencyCents += agencyRev;
        bucket.netPayableToOperatorCents += Math.max(0, gross - agencyRev);
      }

      if (
        !isCashAtCounter &&
        sheet.requires_operator_invoice !== false &&
        ["pendente", "solicitar", "solicitada"].includes(String(sheet.invoice_status || "pendente"))
      ) {
        bucket.pendingInvoiceCount += 1;
      }

      bucket.sheets.push(sheet);
    }

    const operators = [...groupedByOperator.values()].sort(
      (a, b) => b.pendingReceivableCents - a.pendingReceivableCents,
    );

    return {
      operators,
      batches: batches || [],
      summary: {
        totalPendingReceivableCents: operators.reduce((s, o) => s + o.pendingReceivableCents, 0),
        totalReceivedCents: operators.reduce((s, o) => s + o.totalReceivedCents, 0),
        totalNetPayableToOperatorsCents: operators.reduce((s, o) => s + o.netPayableToOperatorCents, 0),
        pendingInvoiceCount: operators.reduce((s, o) => s + o.pendingInvoiceCount, 0),
      },
    };
  });

export const ReconcileOperatorReceivableSchema = z.object({
  sheetId: z.string().uuid(),
  receivedCents: z.number().int().nonnegative(),
  actualReceiptDate: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceStatus: z
    .enum(["nao_necessaria", "pendente", "solicitar", "solicitada", "emitida", "recebida"])
    .optional(),
  notes: z.string().optional(),
});

/**
 * Baixa REAL e persistente do recebimento da Operadora (substitui o estado local fake),
 * atualizando Tax Shield, Financial Transactions (DRE) e liberando premiações por fora
 * quando o gatilho da agência é `no_recebimento_operadora`.
 */
export const reconcileOperatorReceivableFn = createServerFn({ method: "POST" })
  .validator(ReconcileOperatorReceivableSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance", "gerente", "financeiro"]);
    const storeId = identity.store_id;
    const supabase = getServerClient();

    const { data: sheet, error } = await supabase
      .from("travel_sale_financial_sheets")
      .select("*")
      .eq("id", data.sheetId)
      .eq("store_id", storeId)
      .single();

    if (error || !sheet) throw new Error("Ficha financeira não encontrada.");

    const expected = Number(sheet.expected_receipt_cents || sheet.agency_revenue_cents || 0);
    const nextReceived = Math.max(0, data.receivedCents);
    const deltaReceived = Math.max(0, nextReceived - Number(sheet.received_cents || 0));
    const nextStatus =
      nextReceived >= expected && expected > 0
        ? "recebido"
        : nextReceived > 0
          ? "parcialmente_recebido"
          : "a_receber";

    const nowIso = new Date().toISOString();
    const receiptDate = data.actualReceiptDate || nowIso.slice(0, 10);

    const nextAgentStatus =
      nextStatus === "recebido" && sheet.agent_commission_status === "pending"
        ? "eligible"
        : sheet.agent_commission_status;

    const { data: updated, error: upErr } = await supabase
      .from("travel_sale_financial_sheets")
      .update({
        received_cents: nextReceived,
        receivable_status: nextStatus,
        actual_receipt_date: receiptDate,
        invoice_number: data.invoiceNumber ?? sheet.invoice_number,
        invoice_status:
          data.invoiceStatus ||
          (data.invoiceNumber ? "emitida" : sheet.invoice_status),
        agent_commission_status: nextAgentStatus,
        updated_by: identity.id,
        updated_at: nowIso,
      })
      .eq("id", sheet.id)
      .eq("store_id", storeId)
      .select("*")
      .single();

    if (upErr) throw new Error(`Erro ao conciliar recebimento da operadora: ${upErr.message}`);

    if (deltaReceived > 0) {
      await supabase.from("financial_transactions").insert({
        store_id: storeId,
        type: "revenue_sale",
        amount_cents: deltaReceived,
        category: "comissao_operadora",
        description: `Recebimento Comissão ${sheet.primary_operator} — ${sheet.internal_code} (${sheet.client_name})`,
        reference_date: receiptDate,
        created_by: identity.id,
      });
    }

    await supabase.from("travel_financial_audit_logs").insert({
      sheet_id: sheet.id,
      actor_profile_id: identity.id,
      actor_name: identity.fullName || identity.name || "Financeiro",
      action_type: "CONCILIACAO_OPERADORA",
      field_changed: "receivable_status",
      previous_value: `${sheet.receivable_status} (${sheet.received_cents})`,
      new_value: `${nextStatus} (${nextReceived})`,
      reason: data.notes || "Baixa real de comissão/over da operadora",
    });

    return { success: true, sheet: updated };
  });

export const CreateOperatorBillingBatchSchema = z.object({
  operatorName: z.string().min(2),
  competenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  direction: z.enum(["receivable_from_operator", "payable_net_to_operator"]).default("receivable_from_operator"),
  sheetIds: z.array(z.string().uuid()).min(1),
  dueDate: z.string().optional(),
  nfseNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const createOperatorBillingBatchFn = createServerFn({ method: "POST" })
  .validator(CreateOperatorBillingBatchSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance", "gerente", "financeiro"]);
    const storeId = identity.store_id;
    const supabase = getServerClient();

    const { data: sheets, error } = await supabase
      .from("travel_sale_financial_sheets")
      .select("*")
      .eq("store_id", storeId)
      .in("id", data.sheetIds);

    if (error || !sheets || sheets.length === 0) {
      throw new Error("Nenhuma reserva encontrada para gerar o borderô.");
    }

    const totalGross = sheets.reduce((s: number, r: any) => s + Number(r.gross_sale_cents || 0), 0);
    const totalNetBase = sheets.reduce((s: number, r: any) => s + Number(r.net_sale_cents || 0), 0);
    const totalComm = sheets.reduce((s: number, r: any) => s + Number(r.commission_final_cents || 0), 0);
    const totalOverNet = sheets.reduce((s: number, r: any) => s + Number(r.over_net_final_cents || 0), 0);
    const totalAgencyRevenue = sheets.reduce((s: number, r: any) => s + Number(r.agency_revenue_cents || 0), 0);
    const totalDue =
      data.direction === "payable_net_to_operator"
        ? Math.max(0, totalGross - totalAgencyRevenue)
        : totalAgencyRevenue;

    const batchCode = `OP-${data.competenceMonth.replace("-", "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const dueDate = data.dueDate || new Date().toISOString().slice(0, 10);

    const { data: batch, error: bErr } = await supabase
      .from("travel_operator_billing_batches")
      .insert({
        store_id: storeId,
        batch_code: batchCode,
        operator_name: data.operatorName,
        competence_month: data.competenceMonth,
        direction: data.direction,
        sales_count: sheets.length,
        total_gross_cents: totalGross,
        total_net_base_cents: totalNetBase,
        total_commission_cents: totalComm,
        total_over_net_cents: totalOverNet,
        total_due_cents: totalDue,
        status: "billed",
        nfse_status: data.nfseNumber ? "emitida" : data.direction === "receivable_from_operator" ? "solicitada" : "nao_necessaria",
        nfse_number: data.nfseNumber || null,
        nfse_amount_cents: data.direction === "receivable_from_operator" ? totalAgencyRevenue : 0,
        due_date: dueDate,
        notes: data.notes || null,
        created_by: identity.id,
      })
      .select("*")
      .single();

    if (bErr || !batch) throw new Error(`Erro ao gerar borderô de operadora: ${bErr?.message}`);

    await supabase
      .from("travel_sale_financial_sheets")
      .update({
        operator_billing_batch_id: batch.id,
        invoice_status: data.nfseNumber ? "emitida" : data.direction === "receivable_from_operator" ? "solicitada" : "nao_necessaria",
        invoice_number: data.nfseNumber || null,
      })
      .eq("store_id", storeId)
      .in("id", data.sheetIds);

    // Se for saldo Net devido pela agência à operadora (balcão à vista), cria título em Contas a Pagar
    if (data.direction === "payable_net_to_operator" && totalDue > 0) {
      const { data: ob } = await supabase
        .from("financial_obligations")
        .insert({
          store_id: storeId,
          title: `Repasse Net Operadora ${data.operatorName} (${batchCode})`,
          category: "operator_net_payable",
          supplier_name: data.operatorName,
          amount_cents: totalDue,
          due_date: dueDate,
          status: "pending",
          notes: `${sheets.length} venda(s) retida(s) no balcão à vista`,
          source_type: "operator_net_payable",
          source_id: batch.id,
          off_payroll: false,
          created_by: identity.id,
        })
        .select("id")
        .maybeSingle();

      if (ob?.id) {
        await supabase
          .from("travel_operator_billing_batches")
          .update({ financial_obligation_id: ob.id })
          .eq("id", batch.id);
      }
    }

    return { success: true, batch };
  });
