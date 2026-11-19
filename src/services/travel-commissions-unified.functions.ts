import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";
import { isFinanceOrManagerRole, isManagerialRole, normalizeWorkspaceRole } from "@/lib/rbac-permissions";
import {
  calculateTravelSaleCommissionBreakdown,
  computeGrowthComparison,
  resolveCommissionReleaseEligibility,
  resolveTierForAccumulatedVolume,
  type TravelAgentCommissionRuleProfile,
  type TravelCommissionReleaseTrigger,
} from "@/lib/travel/commission-engine";

export async function loadAgentRuleProfileMap(
  supabase: ReturnType<typeof getServerClient>,
  storeId: string,
): Promise<{
  byProfileId: Map<string, TravelAgentCommissionRuleProfile>;
  byAgentIdentifier: Map<string, TravelAgentCommissionRuleProfile>;
  defaultProfile: TravelAgentCommissionRuleProfile | null;
}> {
  const { data: profilesData } = await supabase
    .from("agency_agent_commission_profiles")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });

  const byProfileId = new Map<string, TravelAgentCommissionRuleProfile>();
  const byAgentIdentifier = new Map<string, TravelAgentCommissionRuleProfile>();
  let defaultProfile: TravelAgentCommissionRuleProfile | null = null;

  for (const row of profilesData || []) {
    const parsed: TravelAgentCommissionRuleProfile = {
      agentId: String(row.agent_identifier || row.id),
      profileId: row.profile_id || row.user_id || null,
      employeeId: row.employee_id || null,
      agentName: String(row.agent_name || "Consultor"),
      goalEvaluationBasis: (row.goal_evaluation_basis as any) || "gross_sale",
      commissionCalculationBasis: (row.commission_calculation_basis as any) || "net_sale_plus_over",
      baseCommissionPct: Number(row.base_commission_pct) || 0,
      defaultOverCommissionPct: Number(row.default_over_commission_pct ?? 30),
      tiers: Array.isArray(row.tiers) ? row.tiers : [],
      tierRetroactiveInMonth: row.tier_retroactive_in_month !== false,
      payoutMode: (row.payout_mode as any) || "off_payroll_award",
      releaseTrigger: (row.release_trigger as TravelCommissionReleaseTrigger) || "no_recebimento_operadora",
      hideAgencyNetFromSeller: row.hide_agency_net_from_seller !== false,
      pixKey: row.pix_key || null,
    };

    if (parsed.profileId) byProfileId.set(parsed.profileId, parsed);
    if (parsed.agentId) byAgentIdentifier.set(parsed.agentId, parsed);
    if (!defaultProfile) defaultProfile = parsed;
  }

  return { byProfileId, byAgentIdentifier, defaultProfile };
}

function getPreviousMonthKey(competenceMonth: string): string {
  const [y, m] = competenceMonth.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y || new Date().getUTCFullYear(), (m || 1) - 2, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Sincroniza uma venda de proposta, contrato ou viagem para a Ficha Financeira Soberana (SSOT)
 * calculando integralmente no servidor os valores de comissão, Over e faixa mensal do agente.
 */
export async function syncTourismSaleToFinancialSheetServer(params: {
  supabase: ReturnType<typeof getServerClient>;
  storeId: string;
  actorProfileId: string | null;
  proposalId?: string | null;
  tripId?: string | null;
  contractId?: string | null;
  sellerProfileId?: string | null;
  sellerName?: string | null;
  clientName: string;
  clientDocument?: string | null;
  destination: string;
  primaryOperator?: string | null;
  locatorCode?: string | null;
  internalCode?: string | null;
  saleDate?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
  grossSaleCents: number;
  operatorTablePriceCents?: number | null;
  taxesAndFeesCents?: number | null;
  baseCommissionPct?: number | null;
  overPaymentMethod?: "pix_direto_agencia" | "operadora_financiado";
  settlementMethod?: string;
  bookingStatus?: "rascunho" | "confirmada" | "emitida" | "em_viagem" | "concluida" | "cancelada";
}) {
  const { supabase, storeId } = params;
  const saleDate = (params.saleDate || new Date().toISOString()).slice(0, 10);
  const competenceMonth = saleDate.slice(0, 7);
  const operatorName = String(params.primaryOperator || "Operadora").trim() || "Operadora";

  // 1. Buscar regra unificada da operadora (travel_suppliers -> fallback agency_operator_rules)
  const [{ data: supRule }, { data: legacyOpRule }, profileMaps] = await Promise.all([
    supabase
      .from("travel_suppliers")
      .select("id, name, commission_rate, base_agency_commission_pct, over_retention_pct_when_financed, default_settlement_method")
      .eq("store_id", storeId)
      .ilike("name", operatorName)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agency_operator_rules")
      .select("operator_name, base_agency_commission_pct, over_retention_pct_when_financed")
      .eq("store_id", storeId)
      .ilike("operator_name", operatorName)
      .limit(1)
      .maybeSingle(),
    loadAgentRuleProfileMap(supabase, storeId),
  ]);

  const baseAgencyPct =
    params.baseCommissionPct ??
    (Number(supRule?.base_agency_commission_pct || supRule?.commission_rate || legacyOpRule?.base_agency_commission_pct) || 10);
  const overRetentionPct = Number(
    supRule?.over_retention_pct_when_financed ?? legacyOpRule?.over_retention_pct_when_financed ?? 0,
  );
  const resolvedProfile =
    (params.sellerProfileId ? profileMaps.byProfileId.get(params.sellerProfileId) : null) ||
    profileMaps.defaultProfile;

  // 2. Somar volume acumulado mensal real do consultor no banco
  let monthlyQuery = supabase
    .from("travel_sale_financial_sheets")
    .select("id, gross_sale_cents, net_sale_cents, agency_revenue_cents")
    .eq("store_id", storeId)
    .eq("competence_month", competenceMonth)
    .neq("booking_status", "cancelada");

  if (params.sellerProfileId) {
    monthlyQuery = monthlyQuery.eq("seller_profile_id", params.sellerProfileId);
  }
  const { data: existingMonthRows } = await monthlyQuery;
  const existingGrossSum = (existingMonthRows || []).reduce(
    (sum: number, r: any) => sum + Number(r.gross_sale_cents || 0),
    0,
  );
  const cumulativeVolume = existingGrossSum + Math.max(0, Math.round(params.grossSaleCents || 0));

  const calc = calculateTravelSaleCommissionBreakdown({
    grossSaleCents: params.grossSaleCents,
    operatorTablePriceCents: params.operatorTablePriceCents,
    taxesAndFeesCents: params.taxesAndFeesCents || 0,
    baseCommissionPct: baseAgencyPct,
    overPaymentMethod: params.overPaymentMethod || "operadora_financiado",
    settlementMethod: params.settlementMethod || supRule?.default_settlement_method || "fatura_abatida",
    overRetentionFeePct: overRetentionPct,
    bookingStatus: params.bookingStatus || "confirmada",
    cumulativeMonthlyGoalVolumeCents: cumulativeVolume,
    agentProfile: resolvedProfile,
  });

  // Verificar se já existe ficha vinculada a esta trip/proposal/contract para upsert idempotente
  let existingSheetId: string | null = null;
  if (params.tripId) {
    const { data: byTrip } = await supabase
      .from("travel_sale_financial_sheets")
      .select("id")
      .eq("store_id", storeId)
      .eq("trip_id", params.tripId)
      .maybeSingle();
    if (byTrip?.id) existingSheetId = byTrip.id;
  }
  if (!existingSheetId && params.proposalId) {
    const { data: byProp } = await supabase
      .from("travel_sale_financial_sheets")
      .select("id")
      .eq("store_id", storeId)
      .eq("proposal_id", params.proposalId)
      .maybeSingle();
    if (byProp?.id) existingSheetId = byProp.id;
  }
  if (!existingSheetId && params.contractId) {
    const { data: byContract } = await supabase
      .from("travel_sale_financial_sheets")
      .select("id")
      .eq("store_id", storeId)
      .eq("contract_id", params.contractId)
      .maybeSingle();
    if (byContract?.id) existingSheetId = byContract.id;
  }

  const releaseStatus = resolveCommissionReleaseEligibility({
    releaseTrigger: resolvedProfile?.releaseTrigger || "no_recebimento_operadora",
    bookingStatus: params.bookingStatus || "confirmada",
    receivableStatus: calc.isCashSettled ? "recebido" : "a_receber",
    departureDate: params.departureDate || null,
  });

  const payload: Record<string, any> = {
    ...(existingSheetId ? { id: existingSheetId } : {}),
    store_id: storeId,
    proposal_id: params.proposalId || null,
    trip_id: params.tripId || null,
    contract_id: params.contractId || null,
    operator_supplier_id: supRule?.id || null,
    seller_profile_id: params.sellerProfileId || null,
    employee_id: resolvedProfile?.employeeId || null,
    competence_month: competenceMonth,
    internal_code: (params.internalCode || `OP-${Date.now().toString().slice(-6)}`).toUpperCase(),
    client_name: params.clientName.trim(),
    client_document: params.clientDocument || null,
    seller_name: (params.sellerName || resolvedProfile?.agentName || "Consultor").trim(),
    primary_operator: operatorName,
    locator_code: (params.locatorCode || `LOC-${Date.now().toString().slice(-5)}`).toUpperCase(),
    destination: params.destination || "Pacote Turístico",
    sale_date: saleDate,
    departure_date: params.departureDate || null,
    return_date: params.returnDate || null,
    booking_status: params.bookingStatus || "confirmada",
    gross_sale_cents: calc.grossSaleCents,
    operator_table_price_cents: calc.operatorTablePriceCents,
    non_commissionable_cents: calc.taxesAndFeesCents,
    net_sale_cents: calc.netCommissionableBaseCents,
    commission_mode: "percentage",
    commission_base_type: "net_sale",
    commission_custom_base_cents: calc.netCommissionableBaseCents,
    commission_percentage: baseAgencyPct,
    commission_calculated_cents: calc.baseCommissionGrossCents,
    commission_final_cents: calc.baseCommissionGrossCents,
    over_mode: "amount",
    over_percentage: 0,
    over_gross_cents: calc.overGrossCents,
    over_payment_method: params.overPaymentMethod || "operadora_financiado",
    over_retention_fee_pct: calc.effectiveOverRetentionPct,
    over_deductions_cents: calc.overRetentionDeductionCents + calc.extraOverDeductionsCents,
    over_net_calculated_cents: calc.overNetCents,
    over_net_final_cents: calc.overNetCents,
    agency_revenue_cents: calc.agencyRevenueCents,
    internal_costs_cents: calc.agentCommissionTotalCents + calc.otherInternalCostsCents,
    net_result_cents: calc.agencyNetProfitCents,
    margin_on_sale_pct:
      calc.grossSaleCents > 0 ? Number(((calc.agencyNetProfitCents / calc.grossSaleCents) * 100).toFixed(2)) : 0,
    margin_on_revenue_pct:
      calc.agencyRevenueCents > 0 ? Number(((calc.agencyNetProfitCents / calc.agencyRevenueCents) * 100).toFixed(2)) : 0,
    settlement_method: params.settlementMethod || supRule?.default_settlement_method || "fatura_abatida",
    expected_receipt_cents: calc.operatorBalanceCents,
    received_cents: calc.isCashSettled ? calc.agencyRevenueCents : 0,
    receivable_status: calc.isCashSettled ? "recebido" : "a_receber",
    retained_cash_amount_cents: calc.retainedCashAmountCents,
    operator_balance_cents: calc.operatorBalanceCents,
    is_cash_settled: calc.isCashSettled,
    requires_operator_invoice: calc.requiresOperatorInvoice,
    invoice_status: calc.requiresOperatorInvoice ? "pendente" : "nao_necessaria",
    invoice_amount_cents: calc.agencyRevenueCents,
    invoice_recipient: operatorName,
    agent_tier_name: calc.appliedTierName,
    agent_base_commission_pct: calc.appliedCommissionPct,
    agent_over_commission_pct: calc.appliedOverCommissionPct,
    agent_base_commission_cents: calc.agentBaseCommissionCents,
    agent_over_commission_cents: calc.agentOverCommissionCents,
    agent_commission_total_cents: calc.agentCommissionTotalCents,
    agent_commission_status: releaseStatus,
    updated_by: params.actorProfileId,
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error } = await supabase
    .from("travel_sale_financial_sheets")
    .upsert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Erro ao sincronizar Ficha Financeira da Venda: ${error.message}`);
  }
  return saved;
}

// ─── Minhas Vendas & Painel do Agente (Com Escopo Estrito por Cargo) ─────────

export const GetMySalesAndCommissionsSchema = z.object({
  competenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  agentProfileId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
});

export const getMySalesAndCommissionsSummaryFn = createServerFn({ method: "GET" })
  .validator(GetMySalesAndCommissionsSchema.optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, undefined, data?.storeId);
    const storeId = identity.store_id;
    const supabase = getServerClient();

    const canInspectAnyAgent = isFinanceOrManagerRole(identity.role);
    if (!canInspectAnyAgent && data?.agentProfileId && data.agentProfileId !== identity.id) {
      throw new Error("Acesso negado: consultores só podem consultar suas próprias vendas.");
    }
    const targetAgentProfileId =
      canInspectAnyAgent && data?.agentProfileId ? data.agentProfileId : identity.id;

    const now = new Date();
    const competenceMonth =
      data?.competenceMonth ||
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const prevMonth = getPreviousMonthKey(competenceMonth);

    const [profileMaps, { data: monthSheets }, { data: prevSheets }, { data: receipts }, { data: agentProfileRow }, { data: teamGoalRow }] =
      await Promise.all([
        loadAgentRuleProfileMap(supabase, storeId),
        supabase
          .from("travel_sale_financial_sheets")
          .select("*")
          .eq("store_id", storeId)
          .eq("competence_month", competenceMonth)
          .eq("seller_profile_id", targetAgentProfileId)
          .order("sale_date", { ascending: false }),
        supabase
          .from("travel_sale_financial_sheets")
          .select("gross_sale_cents, net_sale_cents, agent_commission_total_cents, booking_status")
          .eq("store_id", storeId)
          .eq("competence_month", prevMonth)
          .eq("seller_profile_id", targetAgentProfileId)
          .neq("booking_status", "cancelada"),
        supabase
          .from("travel_commission_payout_receipts")
          .select("*")
          .eq("store_id", storeId)
          .eq("beneficiary_profile_id", targetAgentProfileId)
          .order("issued_at", { ascending: false })
          .limit(36),
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email, phone")
          .eq("id", targetAgentProfileId)
          .maybeSingle(),
        supabase
          .from("agency_goal_targets")
          .select("*")
          .eq("store_id", storeId)
          .eq("competence_month", competenceMonth)
          .eq("target_scope", "agent")
          .eq("agent_profile_id", targetAgentProfileId)
          .maybeSingle(),
      ]);

    const ruleProfile =
      profileMaps.byProfileId.get(targetAgentProfileId) || profileMaps.defaultProfile;
    const hideAgencyNet = !canInspectAnyAgent && (ruleProfile?.hideAgencyNetFromSeller ?? true);

    const validRows = (monthSheets || []).filter((r: any) => r.booking_status !== "cancelada");
    const totalGrossCents = validRows.reduce((s: number, r: any) => s + Number(r.gross_sale_cents || 0), 0);
    const totalNetBaseCents = validRows.reduce((s: number, r: any) => s + Number(r.net_sale_cents || 0), 0);
    const totalOverNetCents = validRows.reduce((s: number, r: any) => s + Number(r.over_net_final_cents || 0), 0);
    const totalAgencyRevenueCents = validRows.reduce(
      (s: number, r: any) => s + Number(r.agency_revenue_cents || 0),
      0,
    );

    const prevGrossCents = (prevSheets || []).reduce(
      (s: number, r: any) => s + Number(r.gross_sale_cents || 0),
      0,
    );
    const prevAwardCents = (prevSheets || []).reduce(
      (s: number, r: any) => s + Number(r.agent_commission_total_cents || 0),
      0,
    );

    let pendingAwardCents = 0;
    let eligibleAwardCents = 0;
    let approvedAwardCents = 0;
    let paidAwardCents = 0;

    for (const r of monthSheets || []) {
      const amt = Number(r.agent_commission_total_cents || 0);
      if (r.agent_commission_status === "paid") paidAwardCents += amt;
      else if (r.agent_commission_status === "approved") approvedAwardCents += amt;
      else if (r.agent_commission_status === "eligible") eligibleAwardCents += amt;
      else if (r.agent_commission_status !== "cancelled") pendingAwardCents += amt;
    }

    const totalAwardCents = pendingAwardCents + eligibleAwardCents + approvedAwardCents + paidAwardCents;
    const tierInfo = resolveTierForAccumulatedVolume(ruleProfile, totalGrossCents);
    const grossGrowth = computeGrowthComparison(totalGrossCents, prevGrossCents);
    const awardGrowth = computeGrowthComparison(totalAwardCents, prevAwardCents);

    const sanitizedSales = (monthSheets || []).map((r: any) => ({
      id: r.id,
      internalCode: r.internal_code,
      saleDate: r.sale_date,
      departureDate: r.departure_date,
      clientName: r.client_name,
      destination: r.destination,
      primaryOperator: r.primary_operator,
      locatorCode: r.locator_code,
      bookingStatus: r.booking_status,
      grossSaleCents: Number(r.gross_sale_cents || 0),
      netBaseCents: Number(r.net_sale_cents || 0),
      overNetCents: Number(r.over_net_final_cents || 0),
      agencyRevenueCents: hideAgencyNet ? null : Number(r.agency_revenue_cents || 0),
      agencyNetResultCents: hideAgencyNet ? null : Number(r.net_result_cents || 0),
      agentTierName: r.agent_tier_name || tierInfo.tierName,
      agentBaseCommissionPct: Number(r.agent_base_commission_pct || 0),
      agentOverCommissionPct: Number(r.agent_over_commission_pct || 0),
      agentCommissionTotalCents: Number(r.agent_commission_total_cents || 0),
      agentCommissionStatus: r.agent_commission_status || "pending",
      agentPayoutReceiptId: r.agent_payout_receipt_id || null,
      receivableStatus: r.receivable_status,
    }));

    return {
      competenceMonth,
      prevMonth,
      canInspectAnyAgent,
      canEditRules: isManagerialRole(identity.role),
      hideAgencyNet,
      agent: {
        profileId: targetAgentProfileId,
        name: agentProfileRow?.full_name || ruleProfile?.agentName || "Consultor",
        avatarUrl: agentProfileRow?.avatar_url || null,
        email: agentProfileRow?.email || null,
        pixKey: ruleProfile?.pixKey || null,
        payoutMode: ruleProfile?.payoutMode || "off_payroll_award",
        releaseTrigger: ruleProfile?.releaseTrigger || "no_recebimento_operadora",
      },
      summary: {
        salesCount: validRows.length,
        totalGrossCents,
        totalNetBaseCents,
        totalOverNetCents,
        totalAgencyRevenueCents: hideAgencyNet ? null : totalAgencyRevenueCents,
        totalAwardCents,
        pendingAwardCents,
        eligibleAwardCents,
        approvedAwardCents,
        paidAwardCents,
        monthlyGoalGrossCents: Number(teamGoalRow?.gross_goal_cents || 0),
        grossGrowth,
        awardGrowth,
        tier: tierInfo,
      },
      sales: sanitizedSales,
      receipts: receipts || [],
    };
  });

// ─── Painel Geral da Agência (Admin / Gerente / Financeiro: Agente a Agente) ─

export const GetAgencySalesDashboardSchema = z.object({
  competenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  storeId: z.string().uuid().optional(),
});

export const getAgencySalesAnalyticsDashboardFn = createServerFn({ method: "GET" })
  .validator(GetAgencySalesDashboardSchema.optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance", "gerente", "diretor", "financeiro"], data?.storeId);
    const storeId = identity.store_id;
    const supabase = getServerClient();

    const now = new Date();
    const competenceMonth =
      data?.competenceMonth ||
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const prevMonth = getPreviousMonthKey(competenceMonth);

    const [profileMaps, { data: members }, { data: employees }, { data: currentSheets }, { data: prevSheets }, { data: receipts }] =
      await Promise.all([
        loadAgentRuleProfileMap(supabase, storeId),
        supabase
          .from("workspace_members")
          .select("profile_id, role, profiles(id, full_name, avatar_url, email)")
          .eq("store_id", storeId)
          .eq("is_active", true),
        supabase
          .from("employees")
          .select("id, profile_id, full_name, job_title, employment_type, cpf_masked, metadata")
          .eq("store_id", storeId),
        supabase
          .from("travel_sale_financial_sheets")
          .select("*")
          .eq("store_id", storeId)
          .eq("competence_month", competenceMonth)
          .order("sale_date", { ascending: false }),
        supabase
          .from("travel_sale_financial_sheets")
          .select("seller_profile_id, seller_name, gross_sale_cents, agency_revenue_cents, agent_commission_total_cents, booking_status")
          .eq("store_id", storeId)
          .eq("competence_month", prevMonth)
          .neq("booking_status", "cancelada"),
        supabase
          .from("travel_commission_payout_receipts")
          .select("*")
          .eq("store_id", storeId)
          .eq("competence_month", competenceMonth)
          .order("issued_at", { ascending: false }),
      ]);

    const employeeByProfileId = new Map<string, any>();
    for (const emp of employees || []) {
      if (emp.profile_id) employeeByProfileId.set(emp.profile_id, emp);
    }

    const agentMap = new Map<
      string,
      {
        profileId: string | null;
        employeeId: string | null;
        agentName: string;
        avatarUrl: string | null;
        role: string;
        employmentType: string;
        salesCount: number;
        grossSalesCents: number;
        netBaseCents: number;
        overNetCents: number;
        agencyRevenueCents: number;
        agencyNetProfitCents: number;
        awardPendingCents: number;
        awardEligibleCents: number;
        awardPaidCents: number;
        awardTotalCents: number;
        prevMonthGrossCents: number;
        prevMonthGrowthPct: number;
        activeTierName: string;
        nextTierName: string | null;
        remainingToNextTierCents: number;
        unpaidEligibleSheetIds: string[];
      }
    >();

    // Seed com equipe cadastrada
    for (const m of members || []) {
      const pid = m.profile_id;
      const prof = (m.profiles as any) || {};
      const emp = employeeByProfileId.get(pid);
      agentMap.set(pid, {
        profileId: pid,
        employeeId: emp?.id || null,
        agentName: emp?.full_name || prof.full_name || "Consultor",
        avatarUrl: prof.avatar_url || null,
        role: normalizeWorkspaceRole(m.role),
        employmentType: emp?.employment_type || "clt",
        salesCount: 0,
        grossSalesCents: 0,
        netBaseCents: 0,
        overNetCents: 0,
        agencyRevenueCents: 0,
        agencyNetProfitCents: 0,
        awardPendingCents: 0,
        awardEligibleCents: 0,
        awardPaidCents: 0,
        awardTotalCents: 0,
        prevMonthGrossCents: 0,
        prevMonthGrowthPct: 0,
        activeTierName: "Base Padrão",
        nextTierName: null,
        remainingToNextTierCents: 0,
        unpaidEligibleSheetIds: [],
      });
    }

    // Somar mês atual
    for (const sheet of currentSheets || []) {
      if (sheet.booking_status === "cancelada") continue;
      const key = sheet.seller_profile_id || `name:${sheet.seller_name || "Sem Consultor"}`;
      if (!agentMap.has(key)) {
        agentMap.set(key, {
          profileId: sheet.seller_profile_id || null,
          employeeId: sheet.employee_id || null,
          agentName: sheet.seller_name || "Sem Consultor",
          avatarUrl: null,
          role: "seller",
          employmentType: "clt",
          salesCount: 0,
          grossSalesCents: 0,
          netBaseCents: 0,
          overNetCents: 0,
          agencyRevenueCents: 0,
          agencyNetProfitCents: 0,
          awardPendingCents: 0,
          awardEligibleCents: 0,
          awardPaidCents: 0,
          awardTotalCents: 0,
          prevMonthGrossCents: 0,
          prevMonthGrowthPct: 0,
          activeTierName: sheet.agent_tier_name || "Base Padrão",
          nextTierName: null,
          remainingToNextTierCents: 0,
          unpaidEligibleSheetIds: [],
        });
      }
      const entry = agentMap.get(key)!;
      entry.salesCount += 1;
      entry.grossSalesCents += Number(sheet.gross_sale_cents || 0);
      entry.netBaseCents += Number(sheet.net_sale_cents || 0);
      entry.overNetCents += Number(sheet.over_net_final_cents || 0);
      entry.agencyRevenueCents += Number(sheet.agency_revenue_cents || 0);
      entry.agencyNetProfitCents += Number(sheet.net_result_cents || 0);

      const award = Number(sheet.agent_commission_total_cents || 0);
      entry.awardTotalCents += award;
      if (sheet.agent_commission_status === "paid") {
        entry.awardPaidCents += award;
      } else if (sheet.agent_commission_status === "eligible" || sheet.agent_commission_status === "approved") {
        entry.awardEligibleCents += award;
        entry.unpaidEligibleSheetIds.push(sheet.id);
      } else {
        entry.awardPendingCents += award;
      }
    }

    // Somar mês anterior para Crescimento MoM agente por agente
    for (const prev of prevSheets || []) {
      const key = prev.seller_profile_id || `name:${prev.seller_name || "Sem Consultor"}`;
      const entry = agentMap.get(key);
      if (entry) {
        entry.prevMonthGrossCents += Number(prev.gross_sale_cents || 0);
      }
    }

    const agentsBreakdown = [...agentMap.values()]
      .map((ag) => {
        const ruleProfile =
          (ag.profileId ? profileMaps.byProfileId.get(ag.profileId) : null) ||
          profileMaps.defaultProfile;
        const tier = resolveTierForAccumulatedVolume(ruleProfile, ag.grossSalesCents);
        const growth = computeGrowthComparison(ag.grossSalesCents, ag.prevMonthGrossCents);
        return {
          ...ag,
          prevMonthGrowthPct: growth.growthPct,
          activeTierName: tier.tierName,
          nextTierName: tier.nextTier?.tierName || null,
          remainingToNextTierCents: tier.remainingToNextTierCents,
        };
      })
      .sort((a, b) => b.grossSalesCents - a.grossSalesCents);

    const totalAgencyGrossCents = agentsBreakdown.reduce((s, a) => s + a.grossSalesCents, 0);
    const totalAgencyRevenueCents = agentsBreakdown.reduce((s, a) => s + a.agencyRevenueCents, 0);
    const totalAgencyProfitCents = agentsBreakdown.reduce((s, a) => s + a.agencyNetProfitCents, 0);
    const totalAgencyAwardsCents = agentsBreakdown.reduce((s, a) => s + a.awardTotalCents, 0);
    const totalPrevMonthAgencyGrossCents = (prevSheets || []).reduce(
      (s: number, r: any) => s + Number(r.gross_sale_cents || 0),
      0,
    );

    return {
      competenceMonth,
      prevMonth,
      totals: {
        salesCount: agentsBreakdown.reduce((s, a) => s + a.salesCount, 0),
        grossSalesCents: totalAgencyGrossCents,
        agencyRevenueCents: totalAgencyRevenueCents,
        agencyProfitCents: totalAgencyProfitCents,
        totalAwardsCents: totalAgencyAwardsCents,
        awardsPendingCents: agentsBreakdown.reduce((s, a) => s + a.awardPendingCents, 0),
        awardsEligibleCents: agentsBreakdown.reduce((s, a) => s + a.awardEligibleCents, 0),
        awardsPaidCents: agentsBreakdown.reduce((s, a) => s + a.awardPaidCents, 0),
        growth: computeGrowthComparison(totalAgencyGrossCents, totalPrevMonthAgencyGrossCents),
      },
      agentsBreakdown,
      receipts: receipts || [],
    };
  });

// ─── Perfil Comercial Conectado ao Prontuário / Perfil do Funcionário ─────────

export const GetEmployeeCommercialProfileSchema = z.object({
  employeeId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
  competenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const getEmployeeCommercialPerformanceFn = createServerFn({ method: "GET" })
  .validator(GetEmployeeCommercialProfileSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const storeId = identity.store_id;
    const supabase = getServerClient();

    let resolvedProfileId = data.profileId || null;
    let employeeRecord: any = null;

    if (data.employeeId) {
      const { data: emp } = await supabase
        .from("employees")
        .select("id, profile_id, full_name, job_title, employment_type, cpf_masked, store_id")
        .eq("id", data.employeeId)
        .eq("store_id", storeId)
        .maybeSingle();
      employeeRecord = emp;
      if (emp?.profile_id && !resolvedProfileId) {
        resolvedProfileId = emp.profile_id;
      }
    }

    const canViewOther = isFinanceOrManagerRole(identity.role);
    if (!canViewOther && resolvedProfileId && resolvedProfileId !== identity.id) {
      throw new Error("Acesso negado ao desempenho comercial de outro colaborador.");
    }

    const now = new Date();
    const competenceMonth =
      data.competenceMonth ||
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const prevMonth = getPreviousMonthKey(competenceMonth);

    const profileMaps = await loadAgentRuleProfileMap(supabase, storeId);
    const ruleProfile =
      (resolvedProfileId ? profileMaps.byProfileId.get(resolvedProfileId) : null) ||
      profileMaps.defaultProfile;

    let sheetsQuery = supabase
      .from("travel_sale_financial_sheets")
      .select("id, internal_code, client_name, destination, sale_date, primary_operator, booking_status, gross_sale_cents, net_sale_cents, over_net_final_cents, agency_revenue_cents, agent_commission_total_cents, agent_commission_status, agent_payout_receipt_id, receivable_status")
      .eq("store_id", storeId)
      .eq("competence_month", competenceMonth)
      .order("sale_date", { ascending: false });

    let prevQuery = supabase
      .from("travel_sale_financial_sheets")
      .select("gross_sale_cents, agent_commission_total_cents")
      .eq("store_id", storeId)
      .eq("competence_month", prevMonth)
      .neq("booking_status", "cancelada");

    let receiptsQuery = supabase
      .from("travel_commission_payout_receipts")
      .select("*")
      .eq("store_id", storeId)
      .order("issued_at", { ascending: false })
      .limit(20);

    if (resolvedProfileId) {
      sheetsQuery = sheetsQuery.eq("seller_profile_id", resolvedProfileId);
      prevQuery = prevQuery.eq("seller_profile_id", resolvedProfileId);
      receiptsQuery = receiptsQuery.eq("beneficiary_profile_id", resolvedProfileId);
    } else if (data.employeeId) {
      sheetsQuery = sheetsQuery.eq("employee_id", data.employeeId);
      prevQuery = prevQuery.eq("employee_id", data.employeeId);
      receiptsQuery = receiptsQuery.eq("beneficiary_employee_id", data.employeeId);
    } else {
      return {
        employee: employeeRecord,
        competenceMonth,
        salesCount: 0,
        totalGrossCents: 0,
        totalAwardCents: 0,
        eligibleAwardCents: 0,
        paidAwardCents: 0,
        growthPct: 0,
        tier: resolveTierForAccumulatedVolume(ruleProfile, 0),
        sales: [],
        receipts: [],
      };
    }

    const [{ data: monthSales }, { data: prevSales }, { data: receipts }] = await Promise.all([
      sheetsQuery,
      prevQuery,
      receiptsQuery,
    ]);

    const validSales = (monthSales || []).filter((s: any) => s.booking_status !== "cancelada");
    const totalGrossCents = validSales.reduce((acc: number, s: any) => acc + Number(s.gross_sale_cents || 0), 0);
    const totalAwardCents = validSales.reduce(
      (acc: number, s: any) => acc + Number(s.agent_commission_total_cents || 0),
      0,
    );
    const eligibleAwardCents = validSales
      .filter((s: any) => s.agent_commission_status === "eligible" || s.agent_commission_status === "approved")
      .reduce((acc: number, s: any) => acc + Number(s.agent_commission_total_cents || 0), 0);
    const paidAwardCents = validSales
      .filter((s: any) => s.agent_commission_status === "paid")
      .reduce((acc: number, s: any) => acc + Number(s.agent_commission_total_cents || 0), 0);

    const prevGross = (prevSales || []).reduce(
      (acc: number, s: any) => acc + Number(s.gross_sale_cents || 0),
      0,
    );
    const growth = computeGrowthComparison(totalGrossCents, prevGross);
    const tier = resolveTierForAccumulatedVolume(ruleProfile, totalGrossCents);

    return {
      employee: employeeRecord,
      profileId: resolvedProfileId,
      competenceMonth,
      salesCount: validSales.length,
      totalGrossCents,
      totalAwardCents,
      eligibleAwardCents,
      paidAwardCents,
      growthPct: growth.growthPct,
      tier,
      sales: monthSales || [],
      receipts: receipts || [],
    };
  });

// ─── Recálculo em Lote no Servidor (Faixa Mensal + Regras Atuais) ─────────────

export const RecalculateMonthCommissionsSchema = z.object({
  competenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  storeId: z.string().uuid().optional(),
});

export const recalculateMonthCommissionsFn = createServerFn({ method: "POST" })
  .validator(RecalculateMonthCommissionsSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance", "gerente", "diretor"], data.storeId);
    const storeId = identity.store_id;
    const supabase = getServerClient();

    const [profileMaps, { data: sheets, error }] = await Promise.all([
      loadAgentRuleProfileMap(supabase, storeId),
      supabase
        .from("travel_sale_financial_sheets")
        .select("*")
        .eq("store_id", storeId)
        .eq("competence_month", data.competenceMonth),
    ]);

    if (error) {
      throw new Error(`Erro ao carregar vendas da competência: ${error.message}`);
    }

    // 1. Somar volume acumulado real por consultor (somente vendas válidas não canceladas)
    const volumeByAgent = new Map<string, number>();
    for (const s of sheets || []) {
      if (s.booking_status === "cancelada") continue;
      const key = s.seller_profile_id || `name:${s.seller_name || ""}`;
      volumeByAgent.set(key, (volumeByAgent.get(key) || 0) + Number(s.gross_sale_cents || 0));
    }

    let updatedCount = 0;
    for (const sheet of sheets || []) {
      // Não alterar fichas já liquidadas em recibo fechado
      if (sheet.agent_commission_status === "paid" || sheet.agent_payout_receipt_id) continue;

      const key = sheet.seller_profile_id || `name:${sheet.seller_name || ""}`;
      const ruleProfile =
        (sheet.seller_profile_id ? profileMaps.byProfileId.get(sheet.seller_profile_id) : null) ||
        profileMaps.defaultProfile;
      const accumulatedVolume = volumeByAgent.get(key) || 0;

      const calc = calculateTravelSaleCommissionBreakdown({
        grossSaleCents: Number(sheet.gross_sale_cents || 0),
        operatorTablePriceCents: Number(sheet.operator_table_price_cents || 0) || undefined,
        taxesAndFeesCents: Number(sheet.non_commissionable_cents || 0),
        baseCommissionPct: Number(sheet.commission_percentage || 0),
        overPaymentMethod: (sheet.over_payment_method as any) || "operadora_financiado",
        settlementMethod: sheet.settlement_method || "fatura_abatida",
        overRetentionFeePct: Number(sheet.over_retention_fee_pct || 0),
        bookingStatus: sheet.booking_status,
        deductCommissionOnCancel: Boolean(sheet.deduct_commission_on_cancel),
        managerCommissionClawbackCents: sheet.manager_commission_clawback_cents,
        cumulativeMonthlyGoalVolumeCents: accumulatedVolume,
        agentProfile: ruleProfile,
      });

      const releaseStatus = resolveCommissionReleaseEligibility({
        releaseTrigger: ruleProfile?.releaseTrigger || "no_recebimento_operadora",
        bookingStatus: sheet.booking_status,
        receivableStatus: sheet.receivable_status,
        departureDate: sheet.departure_date,
      });

      await supabase
        .from("travel_sale_financial_sheets")
        .update({
          agent_tier_name: calc.appliedTierName,
          agent_base_commission_pct: calc.appliedCommissionPct,
          agent_over_commission_pct: calc.appliedOverCommissionPct,
          agent_base_commission_cents: calc.agentBaseCommissionCents,
          agent_over_commission_cents: calc.agentOverCommissionCents,
          agent_commission_total_cents: calc.agentCommissionTotalCents,
          agent_commission_status: releaseStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sheet.id)
        .eq("store_id", storeId);

      updatedCount += 1;
    }

    return {
      success: true,
      competenceMonth: data.competenceMonth,
      recalculatedCount: updatedCount,
    };
  });
