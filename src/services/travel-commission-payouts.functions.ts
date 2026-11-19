import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";
import { isFinanceOrManagerRole } from "@/lib/rbac-permissions";
import { recordLedgerEntryCore } from "@/services/immutable-ledger.functions";

export const ListOffPayrollReceiptsSchema = z.object({
  storeId: z.string().uuid().optional(),
  beneficiaryProfileId: z.string().uuid().optional(),
  competenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

/**
 * Lista recibos de premiação variável / comissão "por fora" da folha CLT.
 * Agentes (seller) só enxergam os próprios recibos; Gestores/Financeiro enxergam toda a agência.
 */
export const listOffPayrollReceiptsFn = createServerFn({ method: "GET" })
  .validator(ListOffPayrollReceiptsSchema.optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, undefined, data?.storeId);
    const storeId = identity.store_id;
    const supabase = getServerClient();

    const canSeeAll = isFinanceOrManagerRole(identity.role) || identity.role === "rh";

    let query = supabase
      .from("travel_commission_payout_receipts")
      .select("*")
      .eq("store_id", storeId)
      .order("issued_at", { ascending: false });

    if (!canSeeAll) {
      query = query.eq("beneficiary_profile_id", identity.id);
    } else if (data?.beneficiaryProfileId) {
      query = query.eq("beneficiary_profile_id", data.beneficiaryProfileId);
    }

    if (data?.competenceMonth) {
      query = query.eq("competence_month", data.competenceMonth);
    }

    const { data: receipts, error } = await query;
    if (error) {
      throw new Error(`Erro ao listar recibos por fora: ${error.message}`);
    }
    return receipts || [];
  });

export const CreateOffPayrollAwardReceiptSchema = z.object({
  storeId: z.string().uuid().optional(),
  beneficiaryProfileId: z.string().uuid().nullable().optional(),
  beneficiaryEmployeeId: z.string().uuid().nullable().optional(),
  beneficiaryName: z.string().min(2),
  competenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  sheetIds: z.array(z.string().uuid()).min(1, "Selecione ao menos uma venda para compor o recibo."),
  payoutNature: z
    .enum([
      "premiacao_variavel_por_fora",
      "bonus_meta",
      "repasse_pj_autonomo",
      "comissao_sobre_recebimento",
    ])
    .default("premiacao_variavel_por_fora"),
  payoutChannel: z.enum(["off_payroll_award", "pj_repasse"]).default("off_payroll_award"),
  paymentMethod: z.enum(["pix", "transfer", "cash", "other"]).default("pix"),
  pixKey: z.string().optional(),
  deductionsCents: z.number().int().min(0).default(0),
  markPaidImmediately: z.boolean().default(true),
  allowUnsettledRelease: z.boolean().default(false),
  notes: z.string().optional(),
});

/**
 * Emite recibo automático de pagamento "POR FORA" (Premiação Variável / Bônus / PJ),
 * sem nunca tocar ou poluir a folha de pagamento CLT (`employee_payslips`),
 * gravando obrigação/transação financeira própria (`premiacao_variavel_comercial`).
 */
export const createOffPayrollAwardReceiptFn = createServerFn({ method: "POST" })
  .validator(CreateOffPayrollAwardReceiptSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(
      identity,
      ["owner", "admin", "manager", "finance", "gerente", "diretor", "financeiro"],
      data.storeId,
    );
    const storeId = identity.store_id;
    const supabase = getServerClient();

    // 1. Carregar do banco as vendas selecionadas e validar elegibilidade e ausência de duplicidade
    const { data: sheets, error: sheetsErr } = await supabase
      .from("travel_sale_financial_sheets")
      .select("*")
      .eq("store_id", storeId)
      .in("id", data.sheetIds);

    if (sheetsErr || !sheets || sheets.length === 0) {
      throw new Error("Nenhuma venda válida encontrada para emitir o recibo.");
    }

    const alreadyPaid = sheets.filter(
      (s: any) => s.agent_commission_status === "paid" || Boolean(s.agent_payout_receipt_id),
    );
    if (alreadyPaid.length > 0) {
      throw new Error(
        `Existem ${alreadyPaid.length} venda(s) já quitadas em outro recibo (${alreadyPaid.map((s: any) => s.internal_code).join(", ")}).`,
      );
    }

    if (!data.allowUnsettledRelease) {
      const notEligible = sheets.filter(
        (s: any) => !["eligible", "approved"].includes(String(s.agent_commission_status || "")),
      );
      if (notEligible.length > 0) {
        throw new Error(
          `Existem ${notEligible.length} venda(s) ainda em 'pending' conforme o gatilho da agência. Ative liberação antecipada explícita se desejar pagar antes.`,
        );
      }
    }

    // 2. Buscar dados cadastrais do beneficiário (CPF mascarado & PIX)
    let resolvedDoc: string | null = null;
    let resolvedPix = data.pixKey?.trim() || null;
    let resolvedEmployeeId = data.beneficiaryEmployeeId || null;

    if (data.beneficiaryProfileId) {
      const { data: empRow } = await supabase
        .from("employees")
        .select("id, cpf_masked, full_name")
        .eq("store_id", storeId)
        .eq("profile_id", data.beneficiaryProfileId)
        .maybeSingle();
      if (empRow) {
        resolvedEmployeeId = resolvedEmployeeId || empRow.id;
        resolvedDoc = empRow.cpf_masked || null;
      }

      if (!resolvedPix) {
        const { data: agProf } = await supabase
          .from("agency_agent_commission_profiles")
          .select("pix_key")
          .eq("store_id", storeId)
          .eq("profile_id", data.beneficiaryProfileId)
          .maybeSingle();
        if (agProf?.pix_key) resolvedPix = agProf.pix_key;
      }
    }

    // 3. Totais calculados exclusivamente server-side a partir das linhas reais do banco
    const grossSalesRef = sheets.reduce((s: number, r: any) => s + Number(r.gross_sale_cents || 0), 0);
    const netBaseRef = sheets.reduce((s: number, r: any) => s + Number(r.net_sale_cents || 0), 0);
    const overNetRef = sheets.reduce((s: number, r: any) => s + Number(r.over_net_final_cents || 0), 0);
    const grossAwardCents = sheets.reduce(
      (s: number, r: any) => s + Number(r.agent_commission_total_cents || 0),
      0,
    );

    const deductionsCents = Math.min(grossAwardCents, Math.max(0, data.deductionsCents));
    const netPaidCents = Math.max(0, grossAwardCents - deductionsCents);
    if (netPaidCents <= 0) {
      throw new Error("Valor líquido da premiação por fora deve ser maior que zero.");
    }

    const firstTierSheet = sheets[0];
    const salesSnapshot = sheets.map((s: any) => ({
      sheet_id: s.id,
      internal_code: s.internal_code,
      locator_code: s.locator_code,
      sale_date: s.sale_date,
      client_name: s.client_name,
      destination: s.destination,
      primary_operator: s.primary_operator,
      gross_sale_cents: Number(s.gross_sale_cents || 0),
      net_sale_cents: Number(s.net_sale_cents || 0),
      over_net_cents: Number(s.over_net_final_cents || 0),
      tier_name: s.agent_tier_name,
      base_pct: Number(s.agent_base_commission_pct || 0),
      over_pct: Number(s.agent_over_commission_pct || 0),
      commission_cents: Number(s.agent_commission_total_cents || 0),
    }));

    const nowIso = new Date().toISOString();
    const compactMonth = data.competenceMonth.replace("-", "");
    const randomCode = Math.random().toString(36).slice(2, 6).toUpperCase();
    const receiptCode = `REC-PREM-${compactMonth}-${randomCode}`;
    const sortedIds = [...data.sheetIds].sort().join(",");
    const nodeCrypto = await import("node:crypto");
    const receiptHash = nodeCrypto
      .createHash("sha256")
      .update(`${storeId}|${receiptCode}|${data.beneficiaryName}|${netPaidCents}|${sortedIds}|${nowIso}`)
      .digest("hex");

    // 4. Criar Recibo Automático ("include_in_payroll = false" sempre!)
    const { data: receipt, error: recErr } = await supabase
      .from("travel_commission_payout_receipts")
      .insert({
        store_id: storeId,
        receipt_code: receiptCode,
        competence_month: data.competenceMonth,
        beneficiary_profile_id: data.beneficiaryProfileId || null,
        beneficiary_employee_id: resolvedEmployeeId,
        beneficiary_name: data.beneficiaryName.trim(),
        beneficiary_document: resolvedDoc,
        payout_nature: data.payoutNature,
        payout_channel: data.payoutChannel,
        include_in_payroll: false,
        payment_method: data.paymentMethod,
        pix_key: resolvedPix,
        gross_sales_reference_cents: grossSalesRef,
        net_base_reference_cents: netBaseRef,
        over_net_reference_cents: overNetRef,
        applied_tier_name: String(firstTierSheet?.agent_tier_name || "Faixa Ativa"),
        applied_commission_pct: Number(firstTierSheet?.agent_base_commission_pct || 0),
        applied_over_pct: Number(firstTierSheet?.agent_over_commission_pct || 0),
        gross_award_cents: grossAwardCents,
        deductions_cents: deductionsCents,
        net_paid_cents: netPaidCents,
        sales_count: sheets.length,
        sales_snapshot: salesSnapshot,
        receipt_hash: receiptHash,
        status: data.markPaidImmediately ? "paid" : "issued",
        issued_at: nowIso,
        paid_at: data.markPaidImmediately ? nowIso : null,
        paid_by_profile_id: data.markPaidImmediately ? identity.id : null,
        notes: data.notes || null,
      })
      .select("*")
      .single();

    if (recErr || !receipt) {
      throw new Error(`Erro ao emitir recibo automático por fora: ${recErr?.message}`);
    }

    // 5. Vincular fichas financeiras ao recibo (travando contra novo pagamento)
    const { error: sheetUpdateErr } = await supabase
      .from("travel_sale_financial_sheets")
      .update({
        agent_commission_status: data.markPaidImmediately ? "paid" : "approved",
        agent_payout_receipt_id: receipt.id,
        updated_by: identity.id,
        updated_at: nowIso,
      })
      .eq("store_id", storeId)
      .in("id", data.sheetIds);

    if (sheetUpdateErr) {
      throw new Error(`Erro ao vincular vendas ao recibo: ${sheetUpdateErr.message}`);
    }

    // 6. Registrar obrigação financeira em `financial_obligations` (marcada off_payroll = true)
    const { data: obligation } = await supabase
      .from("financial_obligations")
      .insert({
        store_id: storeId,
        title: `Premiação Por Fora ${receiptCode} - ${data.beneficiaryName}`,
        category: "off_payroll_award",
        supplier_name: data.beneficiaryName.trim(),
        amount_cents: netPaidCents,
        due_date: nowIso.slice(0, 10),
        status: data.markPaidImmediately ? "paid" : "pending",
        paid_at: data.markPaidImmediately ? nowIso : null,
        payment_method: data.markPaidImmediately ? data.paymentMethod : null,
        notes: `Repasse variável externo (${data.payoutNature}) • ${sheets.length} venda(s) • Fora da folha CLT`,
        source_type: "off_payroll_award",
        source_id: receipt.id,
        off_payroll: true,
        beneficiary_profile_id: data.beneficiaryProfileId || null,
        created_by: identity.id,
      })
      .select("id")
      .maybeSingle();

    // 7. Se pago imediatamente, registrar no DRE Financeiro sob categoria distinta de folha CLT
    let finTxId: string | null = null;
    if (data.markPaidImmediately) {
      const { data: finTx } = await supabase
        .from("financial_transactions")
        .insert({
          store_id: storeId,
          type: "expense_other",
          amount_cents: -netPaidCents,
          category: "premiacao_variavel_comercial",
          description: `Premiação Comercial Por Fora (${receiptCode}) — ${data.beneficiaryName}`,
          reference_date: nowIso.slice(0, 10),
          created_by: identity.id,
        })
        .select("id")
        .maybeSingle();
      finTxId = finTx?.id || null;

      await recordLedgerEntryCore({
        transactionType: "commission_payout",
        amountCents: netPaidCents,
        storeId,
        referenceEntityType: "travel_commission_payout_receipt",
        referenceEntityId: receipt.id,
        receiverId: data.beneficiaryProfileId || undefined,
        actorId: identity.id,
        actorRole: identity.role || "finance",
        metadata: {
          receipt_code: receiptCode,
          payout_nature: data.payoutNature,
          include_in_payroll: false,
          sales_count: sheets.length,
        },
      }).catch(() => {});
    }

    if (obligation?.id || finTxId) {
      await supabase
        .from("travel_commission_payout_receipts")
        .update({
          financial_obligation_id: obligation?.id || null,
          financial_transaction_id: finTxId,
        })
        .eq("id", receipt.id);
    }

    return {
      success: true,
      receipt: {
        ...receipt,
        financial_obligation_id: obligation?.id || null,
        financial_transaction_id: finTxId,
      },
    };
  });

export const MarkOffPayrollReceiptPaidSchema = z.object({
  receiptId: z.string().uuid(),
  paymentMethod: z.enum(["pix", "transfer", "cash", "other"]).default("pix"),
});

export const markOffPayrollReceiptPaidFn = createServerFn({ method: "POST" })
  .validator(MarkOffPayrollReceiptPaidSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance", "gerente", "financeiro"]);
    const storeId = identity.store_id;
    const supabase = getServerClient();

    const { data: receipt, error } = await supabase
      .from("travel_commission_payout_receipts")
      .select("*")
      .eq("id", data.receiptId)
      .eq("store_id", storeId)
      .single();

    if (error || !receipt) throw new Error("Recibo não encontrado.");
    if (receipt.status === "paid" || receipt.status === "acknowledged") {
      return { success: true, receipt };
    }
    if (receipt.status === "cancelled") {
      throw new Error("Recibo cancelado não pode ser liquidado.");
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: upErr } = await supabase
      .from("travel_commission_payout_receipts")
      .update({
        status: "paid",
        payment_method: data.paymentMethod,
        paid_at: nowIso,
        paid_by_profile_id: identity.id,
        updated_at: nowIso,
      })
      .eq("id", receipt.id)
      .eq("store_id", storeId)
      .select("*")
      .single();

    if (upErr) throw new Error(`Erro ao liquidar recibo: ${upErr.message}`);

    await supabase
      .from("travel_sale_financial_sheets")
      .update({ agent_commission_status: "paid", updated_at: nowIso })
      .eq("store_id", storeId)
      .eq("agent_payout_receipt_id", receipt.id);

    if (receipt.financial_obligation_id) {
      await supabase
        .from("financial_obligations")
        .update({
          status: "paid",
          paid_at: nowIso,
          payment_method: data.paymentMethod,
          updated_at: nowIso,
        })
        .eq("id", receipt.financial_obligation_id)
        .eq("store_id", storeId);
    }

    await supabase.from("financial_transactions").insert({
      store_id: storeId,
      type: "expense_other",
      amount_cents: -Number(receipt.net_paid_cents || 0),
      category: "premiacao_variavel_comercial",
      description: `Premiação Comercial Por Fora (${receipt.receipt_code}) — ${receipt.beneficiary_name}`,
      reference_date: nowIso.slice(0, 10),
      created_by: identity.id,
    });

    return { success: true, receipt: updated };
  });

export const AcknowledgeOffPayrollReceiptSchema = z.object({
  receiptId: z.string().uuid(),
});

/**
 * Permite que o próprio consultor dê "Ciente / Confirmar Recebimento" no seu Recibo Automático.
 */
export const acknowledgeOffPayrollReceiptFn = createServerFn({ method: "POST" })
  .validator(AcknowledgeOffPayrollReceiptSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const storeId = identity.store_id;
    const supabase = getServerClient();

    const { data: receipt, error } = await supabase
      .from("travel_commission_payout_receipts")
      .select("*")
      .eq("id", data.receiptId)
      .eq("store_id", storeId)
      .single();

    if (error || !receipt) throw new Error("Recibo não encontrado.");
    if (receipt.beneficiary_profile_id !== identity.id && !isFinanceOrManagerRole(identity.role)) {
      throw new Error("Apenas o agente beneficiário pode assinar o aceite deste recibo.");
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: upErr } = await supabase
      .from("travel_commission_payout_receipts")
      .update({
        status: "acknowledged",
        acknowledged_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", receipt.id)
      .eq("store_id", storeId)
      .select("*")
      .single();

    if (upErr) throw new Error(`Erro ao registrar ciente no recibo: ${upErr.message}`);
    return { success: true, receipt: updated };
  });
