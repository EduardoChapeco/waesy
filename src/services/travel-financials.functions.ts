import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity, requireFinance } from "@/lib/server-access";
import { normalizeWorkspaceRole, isFinanceOrManagerRole, isManagerialRole } from "@/lib/rbac-permissions";
import {
  calculateTravelSaleCommissionBreakdown,
  resolveCommissionReleaseEligibility,
  type TravelAgentCommissionRuleProfile,
  type TravelCommissionReleaseTrigger,
} from "@/lib/travel/commission-engine";
import {
  calculateSaleFinancials,
  NonCommissionableFeeItemSchema,
  OverDeductionItemSchema,
  InternalCostItemSchema,
  SupplierBreakdownItemSchema,
} from "@/lib/travel/sale-financial-calculator";

// ─── 1. Schemas de Entrada BFF ───────────────────────────────────────────────

export const ListTravelFinancialSheetsSchema = z.object({
  storeId: z.string().uuid().optional(),
  operatorFilter: z.string().optional(),
  receivableStatusFilter: z.string().optional(),
  invoiceStatusFilter: z.string().optional(),
  sellerFilter: z.string().optional(),
  competenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  searchQuery: z.string().optional(),
});

export const UpsertTravelSaleFinancialSheetSchema = z.object({
  id: z.string().uuid().optional(),
  store_id: z.string().uuid().optional(),
  proposal_id: z.string().uuid().nullable().optional(),
  listing_id: z.string().uuid().nullable().optional(),
  trip_id: z.string().uuid().nullable().optional(),
  contract_id: z.string().uuid().nullable().optional(),
  operator_supplier_id: z.string().uuid().nullable().optional(),
  seller_profile_id: z.string().uuid().nullable().optional(),
  employee_id: z.string().uuid().nullable().optional(),

  internal_code: z.string().min(1),
  client_name: z.string().min(1),
  client_document: z.string().optional(),
  seller_name: z.string().default("Consultor"),
  agency_unit: z.string().default("Matriz"),
  primary_operator: z.string().min(1),
  locator_code: z.string().min(1),
  destination: z.string().min(1),
  sale_date: z.string().min(1),
  departure_date: z.string().optional(),
  return_date: z.string().optional(),
  booking_status: z
    .enum(["rascunho", "confirmada", "emitida", "em_viagem", "concluida", "cancelada"])
    .default("confirmada"),

  // Bloco 1
  gross_sale_cents: z.number().int().nonnegative(),
  operator_table_price_cents: z.number().int().nonnegative().optional(),
  non_commissionable_cents_direct: z.number().int().nonnegative().default(0),
  non_commissionable_fees: z.array(NonCommissionableFeeItemSchema).default([]),

  // Bloco 2
  commission_mode: z.enum(["amount", "percentage"]).default("percentage"),
  commission_base_type: z.enum(["net_sale", "gross_sale", "custom"]).default("net_sale"),
  commission_custom_base_cents: z.number().int().nonnegative().default(0),
  commission_percentage: z.number().nonnegative().default(10),
  commission_amount_cents: z.number().int().nonnegative().default(0),
  commission_override_cents: z.number().int().nonnegative().nullable().optional(),
  commission_notes: z.string().optional(),

  // Bloco 3 & Over Dinâmico Operadora vs PIX
  over_mode: z.enum(["amount", "percentage"]).default("amount"),
  over_percentage: z.number().nonnegative().default(0),
  over_gross_cents: z.number().int().nonnegative().default(0),
  over_payment_method: z.enum(["pix_direto_agencia", "operadora_financiado"]).default("operadora_financiado"),
  over_retention_fee_pct: z.number().nonnegative().default(0),
  over_deductions: z.array(OverDeductionItemSchema).default([]),
  over_net_override_cents: z.number().int().nonnegative().nullable().optional(),

  // Bloco 5 & Regras do Agente (somente gestor pode aplicar overrides/clawback)
  internal_costs: z.array(InternalCostItemSchema).default([]),
  agent_commission_pct_override: z.number().min(0).max(100).nullable().optional(),
  agent_over_commission_pct_override: z.number().min(0).max(100).nullable().optional(),
  agent_commission_cents_override: z.number().int().nonnegative().nullable().optional(),
  deduct_commission_on_cancel: z.boolean().default(false),
  manager_commission_clawback_cents: z.number().int().nonnegative().nullable().optional(),

  // Bloco 7
  settlement_method: z
    .enum([
      "fatura_abatida",
      "comissao_balcao_a_vista",
      "abatimento_saldo_devedor",
      "deposito_bancario",
      "pix",
      "credito_operadora",
      "cartao_virtual",
      "misto",
    ])
    .default("fatura_abatida"),
  expected_receipt_cents: z.number().int().nonnegative().optional(),
  received_cents: z.number().int().nonnegative().default(0),
  retained_cash_amount_cents: z.number().int().nonnegative().optional(),
  expected_receipt_date: z.string().optional(),
  actual_receipt_date: z.string().optional(),
  receivable_status: z
    .enum(["a_receber", "parcialmente_recebido", "recebido", "divergencia", "cancelado"])
    .default("a_receber"),
  supplier_items: z.array(SupplierBreakdownItemSchema).default([]),

  // Bloco 8
  invoice_status: z
    .enum(["nao_necessaria", "pendente", "solicitar", "solicitada", "emitida", "recebida"])
    .default("pendente"),
  invoice_number: z.string().optional(),
  invoice_amount_cents: z.number().int().nonnegative().nullable().optional(),
  invoice_issue_date: z.string().optional(),
  invoice_issuer: z.string().optional(),
  invoice_recipient: z.string().optional(),
  invoice_attachment_url: z.string().optional(),
  invoice_notes: z.string().optional(),

  general_notes: z.string().optional(),
  audit_reason: z.string().optional(),
});

export const CreateTravelQuoteBundleSchema = z.object({
  storeId: z.string().uuid().optional(),
  title: z.string().min(2),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().optional(),
  introNotes: z.string().optional(),
  passengerComposition: z
    .object({
      adults: z.number().int().min(1).default(2),
      children: z.number().int().min(0).default(0),
      children_max_age: z.number().int().min(1).max(17).default(12),
      infants: z.number().int().min(0).default(0),
      allow_custom_count: z.boolean().default(false),
    })
    .default({
      adults: 2,
      children: 0,
      children_max_age: 12,
      infants: 0,
      allow_custom_count: false,
    }),
  items: z
    .array(
      z.object({
        listingId: z.string().uuid(),
        optionLabel: z.string().min(1),
        badgeText: z.string().optional(),
        customPriceCents: z.number().int().nonnegative().optional(),
        advisorNotes: z.string().optional(),
      })
    )
    .min(1),
});

export const GetTravelQuoteBundleBySlugSchema = z.object({
  slug: z.string().min(1),
});

export const SearchGlobalHotelsSchema = z.object({
  query: z.string().optional(),
  city: z.string().optional(),
  limit: z.number().int().min(1).max(30).default(10),
});

// ─── 2. Server Functions: Financeiro da Venda ────────────────────────────────

export const listTravelSaleFinancialSheets = createServerFn({ method: "GET" })
  .validator(ListTravelFinancialSheetsSchema)
  .handler(async ({ data }) => {
    const {
      storeId,
      operatorFilter,
      receivableStatusFilter,
      invoiceStatusFilter,
      sellerFilter,
      competenceMonth,
      searchQuery,
    } = data || {};

    const identity = await getServerIdentity();
    assertStoreAccess(identity, undefined, storeId);
    const resolvedStoreId = identity.store_id;
    if (!resolvedStoreId) throw new Error("Selecione uma agência para consultar as comissões.");
    const supabase = getServerClient();

    const canSeeAll = isFinanceOrManagerRole(identity.role);

    let query = supabase
      .from("travel_sale_financial_sheets")
      .select(
        `
        *,
        non_commissionable_fees:travel_sale_non_commissionable_fees(*),
        over_deductions:travel_sale_over_deductions(*),
        internal_costs:travel_sale_internal_costs(*),
        supplier_items:travel_sale_supplier_items(*),
        audit_logs:travel_financial_audit_logs(*)
      `
      )
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false });

    query = query.eq("store_id", resolvedStoreId);
    if (!canSeeAll) {
      query = query.eq("seller_profile_id", identity.id);
    }
    if (competenceMonth) {
      query = query.eq("competence_month", competenceMonth);
    }
    if (operatorFilter && operatorFilter !== "ALL") {
      query = query.eq("primary_operator", operatorFilter);
    }
    if (receivableStatusFilter && receivableStatusFilter !== "ALL") {
      query = query.eq("receivable_status", receivableStatusFilter);
    }
    if (invoiceStatusFilter && invoiceStatusFilter !== "ALL") {
      query = query.eq("invoice_status", invoiceStatusFilter);
    }
    if (sellerFilter && sellerFilter !== "ALL" && canSeeAll) {
      query = query.ilike("seller_name", `%${sellerFilter}%`);
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      query = query.or(
        `client_name.ilike.%${q}%,locator_code.ilike.%${q}%,internal_code.ilike.%${q}%,destination.ilike.%${q}%`
      );
    }

    const { data: rows, error } = await query;
    if (error) {
      throw new Error(`Não foi possível carregar as comissões: ${error.message}`);
    }

    if (!canSeeAll) {
      return (rows || []).map((row: any) => ({
        ...row,
        internal_costs: [],
        internal_costs_cents: 0,
        net_result_cents: 0,
        margin_on_sale_pct: 0,
        margin_on_revenue_pct: 0,
      }));
    }

    return rows || [];
  });

export const upsertTravelSaleFinancialSheet = createServerFn({ method: "POST" })
  .validator(UpsertTravelSaleFinancialSheetSchema)
  .handler(async ({ data }) => {
    const {
      id,
      store_id,
      proposal_id,
      listing_id,
      trip_id,
      contract_id,
      operator_supplier_id,
      seller_profile_id,
      employee_id,
      internal_code,
      client_name,
      client_document,
      seller_name,
      agency_unit,
      primary_operator,
      locator_code,
      destination,
      sale_date,
      departure_date,
      return_date,
      booking_status,
      gross_sale_cents,
      operator_table_price_cents,
      non_commissionable_cents_direct,
      non_commissionable_fees,
      commission_mode,
      commission_base_type,
      commission_custom_base_cents,
      commission_percentage,
      commission_amount_cents,
      commission_override_cents,
      commission_notes,
      over_mode,
      over_percentage,
      over_gross_cents,
      over_payment_method,
      over_retention_fee_pct,
      over_deductions,
      over_net_override_cents,
      internal_costs,
      agent_commission_pct_override,
      agent_over_commission_pct_override,
      agent_commission_cents_override,
      deduct_commission_on_cancel,
      manager_commission_clawback_cents,
      settlement_method,
      expected_receipt_cents,
      received_cents,
      retained_cash_amount_cents,
      expected_receipt_date,
      actual_receipt_date,
      receivable_status,
      supplier_items,
      invoice_status,
      invoice_number,
      invoice_amount_cents,
      invoice_issue_date,
      invoice_issuer,
      invoice_recipient,
      invoice_attachment_url,
      invoice_notes,
      general_notes,
      audit_reason,
    } = data;

    const identity = await getServerIdentity();
    assertStoreAccess(
      identity,
      ["owner", "admin", "manager", "finance", "gerente", "diretor", "financeiro"],
      store_id,
    );
    const resolvedStoreId = identity.store_id;
    const supabase = getServerClient();
    const canApplyOverrides = isManagerialRole(identity.role);
    const competenceMonth = sale_date.slice(0, 7);

    // Buscar perfil de regras do agente + acumulado mensal REAL no servidor
    const [agentProfileRes, monthRowsRes] = await Promise.all([
      seller_profile_id
        ? supabase
            .from("agency_agent_commission_profiles")
            .select("*")
            .eq("store_id", resolvedStoreId)
            .eq("profile_id", seller_profile_id)
            .maybeSingle()
        : supabase
            .from("agency_agent_commission_profiles")
            .select("*")
            .eq("store_id", resolvedStoreId)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
      supabase
        .from("travel_sale_financial_sheets")
        .select("id, gross_sale_cents, net_sale_cents, agency_revenue_cents")
        .eq("store_id", resolvedStoreId)
        .eq("competence_month", competenceMonth)
        .neq("booking_status", "cancelada"),
    ]);

    const profileRow = agentProfileRes?.data;
    const resolvedRuleProfile: TravelAgentCommissionRuleProfile | null = profileRow
      ? {
          agentId: profileRow.agent_identifier || profileRow.id,
          profileId: profileRow.profile_id || profileRow.user_id || null,
          employeeId: profileRow.employee_id || null,
          agentName: profileRow.agent_name || seller_name,
          goalEvaluationBasis: (profileRow.goal_evaluation_basis as any) || "gross_sale",
          commissionCalculationBasis:
            (profileRow.commission_calculation_basis as any) || "net_sale_plus_over",
          baseCommissionPct: Number(profileRow.base_commission_pct || 0),
          defaultOverCommissionPct: Number(profileRow.default_over_commission_pct ?? 30),
          tiers: Array.isArray(profileRow.tiers) ? profileRow.tiers : [],
          tierRetroactiveInMonth: profileRow.tier_retroactive_in_month !== false,
          payoutMode: (profileRow.payout_mode as any) || "off_payroll_award",
          releaseTrigger:
            (profileRow.release_trigger as TravelCommissionReleaseTrigger) ||
            "no_recebimento_operadora",
          hideAgencyNetFromSeller: profileRow.hide_agency_net_from_seller !== false,
          pixKey: profileRow.pix_key || null,
        }
      : null;

    // Volume acumulado mensal real excluindo a própria ficha caso seja edição (soma o novo valor)
    const otherValidGross = (monthRowsRes?.data || [])
      .filter((r: any) => !id || r.id !== id)
      .reduce((acc: number, r: any) => acc + Number(r.gross_sale_cents || 0), 0);
    const cumulativeGrossForTier =
      otherValidGross + (booking_status !== "cancelada" ? gross_sale_cents : 0);

    // 1. Cálculo determinístico dos 8 blocos financeiros
    const calc = calculateSaleFinancials({
      gross_sale_cents,
      non_commissionable_cents_direct,
      non_commissionable_fees,
      commission_mode,
      commission_base_type,
      commission_custom_base_cents,
      commission_percentage,
      commission_amount_cents,
      commission_override_cents: canApplyOverrides ? commission_override_cents : null,
      over_mode,
      over_percentage,
      over_gross_cents,
      over_deductions,
      over_net_override_cents: canApplyOverrides ? over_net_override_cents : null,
      internal_costs,
      settlement_method,
      retained_cash_amount_cents,
    });

    // 2. Cálculo server-side da premiação variável do consultor (Por Fora)
    const otherCostsExcludingAutoSeller = calc.internal_costs_resolved
      .filter((c) => c.cost_type !== "comissao_vendedor")
      .reduce((sum, c) => sum + c.resolved_cents, 0);

    const agentCalc = calculateTravelSaleCommissionBreakdown({
      grossSaleCents: calc.gross_sale_cents,
      operatorTablePriceCents:
        operator_table_price_cents && operator_table_price_cents > 0
          ? operator_table_price_cents
          : Math.max(0, calc.gross_sale_cents - calc.over_gross_cents),
      taxesAndFeesCents: calc.non_commissionable_cents,
      baseCommissionPct: commission_percentage,
      overPaymentMethod: over_payment_method,
      settlementMethod: settlement_method,
      overRetentionFeePct: over_retention_fee_pct,
      extraOverDeductionsCents: calc.over_deductions_cents,
      otherInternalCostsCents: otherCostsExcludingAutoSeller,
      bookingStatus: booking_status,
      deductCommissionOnCancel: canApplyOverrides ? deduct_commission_on_cancel : false,
      managerCommissionClawbackCents: canApplyOverrides ? manager_commission_clawback_cents : null,
      canApplyOverrides,
      agentCommissionPctOverride: agent_commission_pct_override,
      agentOverCommissionPctOverride: agent_over_commission_pct_override,
      agentCommissionCentsOverride: agent_commission_cents_override,
      cumulativeMonthlyGoalVolumeCents: cumulativeGrossForTier,
      agentProfile: resolvedRuleProfile,
    });

    const releaseStatus = resolveCommissionReleaseEligibility({
      releaseTrigger: resolvedRuleProfile?.releaseTrigger || "no_recebimento_operadora",
      bookingStatus: booking_status,
      receivableStatus: receivable_status,
      departureDate: departure_date || null,
    });

    const finalExpectedReceiptCents =
      expected_receipt_cents !== undefined && expected_receipt_cents > 0
        ? expected_receipt_cents
        : calc.is_cash_settled
          ? 0
          : calc.operator_balance_cents;

    const sheetPayload = {
      ...(id ? { id } : {}),
      store_id: resolvedStoreId,
      proposal_id: proposal_id || null,
      listing_id: listing_id || null,
      trip_id: trip_id || null,
      contract_id: contract_id || null,
      operator_supplier_id: operator_supplier_id || null,
      seller_profile_id: seller_profile_id || null,
      employee_id: employee_id || resolvedRuleProfile?.employeeId || null,
      competence_month: competenceMonth,
      internal_code: internal_code.trim().toUpperCase(),
      client_name: client_name.trim(),
      client_document: client_document?.trim() || null,
      seller_name: seller_name.trim(),
      agency_unit: agency_unit.trim(),
      primary_operator: primary_operator.trim(),
      locator_code: locator_code.trim().toUpperCase(),
      destination: destination.trim(),
      sale_date,
      departure_date: departure_date || null,
      return_date: return_date || null,
      booking_status,
      gross_sale_cents: calc.gross_sale_cents,
      operator_table_price_cents:
        operator_table_price_cents && operator_table_price_cents > 0
          ? operator_table_price_cents
          : Math.max(0, calc.gross_sale_cents - calc.over_gross_cents),
      non_commissionable_cents: calc.non_commissionable_cents,
      net_sale_cents: calc.net_sale_cents,
      commission_mode,
      commission_base_type,
      commission_custom_base_cents: calc.commission_base_cents,
      commission_percentage,
      commission_calculated_cents: calc.commission_calculated_cents,
      commission_override_cents: canApplyOverrides ? (commission_override_cents ?? null) : null,
      commission_final_cents: calc.commission_final_cents,
      commission_notes: commission_notes || null,
      over_mode,
      over_percentage,
      over_gross_cents: calc.over_gross_cents,
      over_payment_method,
      over_retention_fee_pct: agentCalc.effectiveOverRetentionPct,
      over_deductions_cents: calc.over_deductions_cents,
      over_net_calculated_cents: calc.over_net_calculated_cents,
      over_net_override_cents: canApplyOverrides ? (over_net_override_cents ?? null) : null,
      over_net_final_cents: calc.over_net_final_cents,
      agency_revenue_cents: calc.agency_revenue_cents,
      internal_costs_cents: calc.internal_costs_cents,
      net_result_cents: calc.net_result_cents,
      margin_on_sale_pct: calc.margin_on_sale_pct,
      margin_on_revenue_pct: calc.margin_on_revenue_pct,
      settlement_method,
      expected_receipt_cents: finalExpectedReceiptCents,
      received_cents: calc.is_cash_settled && received_cents === 0 ? calc.agency_revenue_cents : received_cents,
      retained_cash_amount_cents: calc.retained_cash_amount_cents,
      operator_balance_cents: calc.operator_balance_cents,
      is_cash_settled: calc.is_cash_settled,
      requires_operator_invoice: calc.requires_operator_invoice,
      expected_receipt_date: expected_receipt_date || null,
      actual_receipt_date: actual_receipt_date || null,
      receivable_status: calc.is_cash_settled ? "recebido" : receivable_status,
      invoice_status: calc.is_cash_settled ? "nao_necessaria" : invoice_status,
      invoice_number: invoice_number || null,
      invoice_amount_cents: invoice_amount_cents ?? calc.agency_revenue_cents,
      invoice_issue_date: invoice_issue_date || null,
      invoice_issuer: invoice_issuer || null,
      invoice_recipient: invoice_recipient || primary_operator,
      invoice_attachment_url: invoice_attachment_url || null,
      invoice_notes: invoice_notes || null,
      agent_tier_name: agentCalc.appliedTierName,
      agent_base_commission_pct: agentCalc.appliedCommissionPct,
      agent_over_commission_pct: agentCalc.appliedOverCommissionPct,
      agent_base_commission_cents: agentCalc.agentBaseCommissionCents,
      agent_over_commission_cents: agentCalc.agentOverCommissionCents,
      agent_commission_total_cents: agentCalc.agentCommissionTotalCents,
      agent_commission_status: releaseStatus,
      deduct_commission_on_cancel: canApplyOverrides ? Boolean(deduct_commission_on_cancel) : false,
      manager_commission_clawback_cents: agentCalc.appliedClawbackCents,
      general_notes: general_notes || null,
      updated_by: identity.id,
      updated_at: new Date().toISOString(),
    };

    const { data: savedSheet, error: sheetErr } = await supabase
      .from("travel_sale_financial_sheets")
      .upsert(sheetPayload)
      .select("*")
      .single();

    if (sheetErr || !savedSheet) {
      throw new Error(sheetErr?.message || "Falha ao salvar a Ficha Financeira da Venda.");
    }

    const sheetId = savedSheet.id;

    // Sincronizar sub-tabelas (Taxas Não Comissionáveis, Deduções do Over, Custos Internos e Itens por Operadora)
    await Promise.all([
      supabase.from("travel_sale_non_commissionable_fees").delete().eq("sheet_id", sheetId),
      supabase.from("travel_sale_over_deductions").delete().eq("sheet_id", sheetId),
      supabase.from("travel_sale_internal_costs").delete().eq("sheet_id", sheetId),
      supabase.from("travel_sale_supplier_items").delete().eq("sheet_id", sheetId),
    ]);

    if (non_commissionable_fees.length > 0) {
      const { error: feeErr } = await supabase.from("travel_sale_non_commissionable_fees").insert(
        non_commissionable_fees.map((f) => ({
          sheet_id: sheetId,
          fee_type: f.fee_type,
          description: f.description,
          amount_cents: f.amount_cents,
        }))
      );
      if (feeErr) {
        console.error("[upsertTravelSaleFinancialSheet] Erro ao salvar taxas não comissionáveis:", feeErr);
        throw new Error(`Falha ao registrar taxas não comissionáveis: ${feeErr.message}`);
      }
    }

    if (calc.over_deductions_resolved.length > 0) {
      const { error: overErr } = await supabase.from("travel_sale_over_deductions").insert(
        calc.over_deductions_resolved.map((d) => ({
          sheet_id: sheetId,
          deduction_type: d.deduction_type,
          calc_mode: d.calc_mode,
          percentage: d.percentage,
          amount_cents: d.resolved_cents,
          notes: d.notes || null,
        }))
      );
      if (overErr) {
        console.error("[upsertTravelSaleFinancialSheet] Erro ao salvar deduções do over:", overErr);
        throw new Error(`Falha ao registrar deduções do over: ${overErr.message}`);
      }
    }

    if (calc.internal_costs_resolved.length > 0) {
      const { error: costErr } = await supabase.from("travel_sale_internal_costs").insert(
        calc.internal_costs_resolved.map((c) => ({
          sheet_id: sheetId,
          cost_type: c.cost_type,
          description: c.description,
          calc_mode: c.calc_mode,
          percentage: c.percentage,
          amount_cents: c.resolved_cents,
          beneficiary_name: c.beneficiary_name || null,
          due_date: c.due_date || null,
          payment_status: c.payment_status,
          notes: c.notes || null,
        }))
      );
      if (costErr) {
        console.error("[upsertTravelSaleFinancialSheet] Erro ao salvar custos internos:", costErr);
        throw new Error(`Falha ao registrar custos internos: ${costErr.message}`);
      }
    }

    if (supplier_items.length > 0) {
      const { error: supErr } = await supabase.from("travel_sale_supplier_items").insert(
        supplier_items.map((item) => ({
          sheet_id: sheetId,
          item_category: item.item_category,
          operator_name: item.operator_name,
          locator_code: item.locator_code.toUpperCase(),
          gross_amount_cents: item.gross_amount_cents,
          non_commissionable_cents: item.non_commissionable_cents,
          net_amount_cents: Math.max(0, item.gross_amount_cents - item.non_commissionable_cents),
          commission_cents: item.commission_cents,
          over_net_cents: item.over_net_cents,
          expected_receipt_cents:
            item.expected_receipt_cents || item.commission_cents + item.over_net_cents,
          received_cents: item.received_cents,
          settlement_method: item.settlement_method,
          expected_date: item.expected_date || null,
          received_date: item.received_date || null,
          status: item.status,
          invoice_number: item.invoice_number || null,
        }))
      );
      if (supErr) {
        console.error("[upsertTravelSaleFinancialSheet] Erro ao salvar itens de operadora:", supErr);
        throw new Error(`Falha ao registrar itens por fornecedor/operadora: ${supErr.message}`);
      }
    }

    // Registrar Log de Auditoria
    const { error: auditErr } = await supabase.from("travel_financial_audit_logs").insert({
      sheet_id: sheetId,
      actor_profile_id: identity?.userId || null,
      actor_name: seller_name || "Operador Financeiro",
      action_type: id ? "ATUALIZACAO_FINANCEIRA" : "CRIACAO_FICHA_FINANCEIRA",
      field_changed: calc.is_commission_overridden || calc.is_over_overridden ? "ajuste_manual" : "composicao_completa",
      previous_value: null,
      new_value: `Venda: R$ ${(calc.gross_sale_cents / 100).toFixed(2)} | Receita Agência: R$ ${(calc.agency_revenue_cents / 100).toFixed(2)} | Resultado: R$ ${(calc.net_result_cents / 100).toFixed(2)}`,
      reason: audit_reason || (id ? "Atualização da composição financeira da reserva" : "Abertura da ficha financeira da venda"),
    });
    if (auditErr) {
      console.warn("[upsertTravelSaleFinancialSheet] Aviso ao registrar log de auditoria:", auditErr.message);
    }

    return {
      success: true,
      sheet: savedSheet,
      calculation: calc,
    };
  });

// ─── 3. Server Functions: Agrupador de Multi-Orçamentos ──────────────────────

export const createTravelQuoteBundle = createServerFn({ method: "POST" })
  .validator(CreateTravelQuoteBundleSchema)
  .handler(async ({ data }) => {
    const {
      storeId,
      title,
      clientName,
      clientPhone,
      clientEmail,
      introNotes,
      passengerComposition,
      items,
    } = data;

    const identity = await getServerIdentity().catch(() => null);
    const supabase = getServerClient();
    const resolvedStoreId = storeId || identity?.storeId || null;

    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const cleanSlugBase = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const slug = `${cleanSlugBase || "cotacao"}-${randomSuffix}`;

    const { data: bundle, error: bundleErr } = await supabase
      .from("travel_quote_bundles")
      .insert({
        store_id: resolvedStoreId,
        creator_profile_id: identity?.userId || null,
        slug,
        title: title.trim(),
        client_name: clientName?.trim() || null,
        client_phone: clientPhone?.trim() || null,
        client_email: clientEmail?.trim() || null,
        intro_notes: introNotes?.trim() || null,
        passenger_composition: passengerComposition,
        status: "sent",
      })
      .select("*")
      .single();

    if (bundleErr || !bundle) {
      throw new Error(bundleErr?.message || "Erro ao criar o agrupador de orçamentos.");
    }

    const bundleItemsPayload = items.map((item, idx) => ({
      bundle_id: bundle.id,
      listing_id: item.listingId,
      option_label: item.optionLabel || `Opção ${idx + 1}`,
      badge_text: item.badgeText || (idx === 0 ? "Recomendado" : null),
      custom_price_cents: item.customPriceCents ?? null,
      advisor_notes: item.advisorNotes || null,
      sort_order: idx,
    }));

    const { error: itemsErr } = await supabase
      .from("travel_quote_bundle_items")
      .insert(bundleItemsPayload);

    if (itemsErr) {
      throw new Error(itemsErr.message);
    }

    return {
      success: true,
      bundle,
      shareUrl: `/orcamentos/${bundle.slug}`,
    };
  });

export const getTravelQuoteBundleBySlug = createServerFn({ method: "GET" })
  .validator(GetTravelQuoteBundleBySlugSchema)
  .handler(async ({ data }) => {
    const { slug } = data;
    const supabase = getServerClient();

    const { data: bundle, error } = await supabase
      .from("travel_quote_bundles")
      .select(
        `
        *,
        store:stores(id, name, slug, logo_url, whatsapp, phone, city, state),
        items:travel_quote_bundle_items(
          *,
          listing:classified_listings(
            *,
            author:profiles(id, name, avatar_url, phone, city, state, is_verified),
            store:stores(id, name, slug, logo_url, whatsapp, phone)
          )
        )
      `
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error || !bundle) {
      return null;
    }

    const sortedItems = Array.isArray(bundle.items)
      ? [...bundle.items].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      : [];

    return {
      ...bundle,
      items: sortedItems,
    };
  });

// ─── 4. Autocomplete de Hotéis do Banco Central (global_hotels) ──────────────

export const searchGlobalHotelsForPackage = createServerFn({ method: "GET" })
  .validator(SearchGlobalHotelsSchema)
  .handler(async ({ data }) => {
    const { query, city, limit } = data;
    const supabase = getServerClient();

    let dbQuery = supabase
      .from("global_hotels")
      .select(
        "id, name, canonical_slug, city, state, country, address, stars, amenities, hotel_score, reviews_count, hotel_media(url, is_featured, display_order)"
      )
      .order("hotel_score", { ascending: false })
      .limit(limit);

    if (query && query.trim().length > 0) {
      const q = query.trim();
      dbQuery = dbQuery.or(`name.ilike.%${q}%,city.ilike.%${q}%`);
    }
    if (city && city.trim().length > 0) {
      dbQuery = dbQuery.ilike("city", `%${city.trim()}%`);
    }

    const { data: hotels, error } = await dbQuery;
    if (error) {
      return [];
    }
    return (hotels || []).map((h: any) => {
      const media = Array.isArray(h.hotel_media)
        ? [...h.hotel_media].sort((a: any, b: any) => Number(a.display_order || 0) - Number(b.display_order || 0))
        : [];
      const cover = media.find((m: any) => m.is_featured)?.url || media[0]?.url || null;
      return {
        id: h.id,
        name: h.name,
        slug: h.canonical_slug,
        city: h.city,
        state: h.state,
        country: h.country,
        address: h.address,
        star_rating: h.stars,
        cover_image_url: cover,
        gallery_urls: media.map((m: any) => m.url).filter(Boolean),
        amenities: h.amenities,
        description: null,
        hotel_score: h.hotel_score,
        reviews_count: h.reviews_count,
      };
    });
  });

// ─── 5. Registro Transacional de Pagamento Turístico (RPC Ledger Atômico) ───

export const RecordTravelSalePaymentSchema = z.object({
  saleId: z.string().uuid(),
  amountCents: z.number().int().positive().max(1_000_000_000_000),
  paymentMethod: z.enum(["pix", "card", "boleto", "cash", "transfer", "other"]),
  idempotencyKey: z.string().trim().min(8).max(160),
  externalReference: z.string().trim().max(240).optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

export type TravelSalePaymentResult = {
  success: boolean;
  replayed: boolean;
  payment_id?: string;
  ledger_id?: string;
  sale_id: string;
};

export const recordTravelSalePayment = createServerFn({ method: "POST" })
  .validator(RecordTravelSalePaymentSchema)
  .handler(async ({ data }) => {
    const {
      saleId,
      amountCents,
      paymentMethod,
      idempotencyKey,
      externalReference,
      metadata,
    } = data;
    const identity = await requireFinance();
    const supabase = getServerClient();
    const { data: result, error } = await supabase.rpc(
      "record_travel_sale_payment" as never,
      {
        p_sale_id: saleId,
        p_amount_cents: amountCents,
        p_payment_method: paymentMethod,
        p_idempotency_key: `${identity.store_id}:${idempotencyKey}`,
        p_external_reference: externalReference ?? null,
        p_metadata: {
          ...metadata,
          recorded_by_store_id: identity.store_id,
        },
      } as never,
    );

    if (error) {
      throw new Error(`Não foi possível registrar o pagamento turístico: ${error.message}`);
    }

    return result as TravelSalePaymentResult;
  });
