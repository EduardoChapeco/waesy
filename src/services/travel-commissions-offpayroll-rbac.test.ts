import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? schema.parse(args?.data) : args?.data;
        return fn({ data: validated });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

const STORE_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const STORE_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const SELLER_1_ID = "11111111-1111-4111-8111-111111111111";
const SELLER_2_ID = "22222222-2222-4222-8222-222222222222";
const MANAGER_ID = "33333333-3333-4333-8333-333333333333";
const EMP_1_ID = "44444444-4444-4444-8444-444444444444";
const SHEET_1_ID = "55555555-5555-4555-8555-555555555555";
const SHEET_2_ID = "66666666-6666-4666-8666-666666666666";

let currentIdentity: any = {
  id: SELLER_1_ID,
  userId: SELLER_1_ID,
  role: "seller",
  store_id: STORE_A,
  storeId: STORE_A,
  fullName: "Consultora Ana",
  isPlatformAdmin: false,
  isCivilContext: false,
  activeContext: "workspace",
  memberships: [{ store_id: STORE_A, role: "seller", is_active: true }],
};

vi.mock("@/lib/server-access", async () => {
  const actualCore = await vi.importActual<typeof import("@/lib/identity-core")>("@/lib/identity-core");
  return {
    ...actualCore,
    getServerIdentity: vi.fn(async () => currentIdentity),
    assertStoreAccess: actualCore.assertStoreAccess,
    assertManagerAccess: actualCore.assertManagerAccess,
    assertOwnerAccess: actualCore.assertOwnerAccess,
  };
});

vi.mock("@/services/immutable-ledger.functions", () => ({
  recordLedgerEntryCore: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/services/ai-core-gateway.functions", () => ({
  executeAiCoreGateway: vi.fn(async () => ({ success: false, text: "" })),
}));

const dbOps = {
  inserts: [] as Array<{ table: string; payload: any }>,
  updates: [] as Array<{ table: string; payload: any }>,
  receipts: [] as any[],
  sheets: [] as any[],
  obligations: [] as any[],
  payslips: [] as any[],
  transactions: [] as any[],
};

function makeTableChain(tableName: string) {
  const filters: Record<string, any> = {};
  const inFilters: Record<string, any[]> = {};
  let pendingUpdate: any = null;

  const resolveRows = () => {
    let rows: any[] = [];
    if (tableName === "travel_sale_financial_sheets") rows = [...dbOps.sheets];
    else if (tableName === "travel_commission_payout_receipts") rows = [...dbOps.receipts];
    else if (tableName === "financial_obligations") rows = [...dbOps.obligations];
    else if (tableName === "employee_payslips") rows = [...dbOps.payslips];
    else if (tableName === "financial_transactions") rows = [...dbOps.transactions];
    else if (tableName === "agency_agent_commission_profiles") {
      rows = [
        {
          id: "rule-1",
          store_id: STORE_A,
          profile_id: SELLER_1_ID,
          agent_identifier: "ana",
          agent_name: "Consultora Ana",
          goal_evaluation_basis: "gross_sale",
          commission_calculation_basis: "net_sale_plus_over",
          base_commission_pct: 1.0,
          default_over_commission_pct: 30,
          tiers: [
            { tierName: "Faixa 1", minMonthlyRevenueCents: 0, maxMonthlyRevenueCents: 9999999, commissionPct: 1, overCommissionPct: 30 },
            { tierName: "Faixa 2", minMonthlyRevenueCents: 10000000, maxMonthlyRevenueCents: null, commissionPct: 1.5, overCommissionPct: 35 },
          ],
          release_trigger: "no_recebimento_operadora",
          hide_agency_net_from_seller: true,
        },
      ];
    } else if (tableName === "employees") {
      rows = [
        { id: EMP_1_ID, store_id: STORE_A, profile_id: SELLER_1_ID, full_name: "Consultora Ana", employment_type: "clt" },
      ];
    } else if (tableName === "stores") {
      rows = [{ id: STORE_A, niche_id: "tourism", settings: { niche_id: "tourism" } }];
    }

    return rows.filter((r) => {
      for (const [k, v] of Object.entries(filters)) {
        if (r[k] !== v) return false;
      }
      for (const [k, arr] of Object.entries(inFilters)) {
        if (!arr.includes(r[k])) return false;
      }
      return true;
    });
  };

  const chain: any = {
    select: () => chain,
    eq: (k: string, v: any) => {
      filters[k] = v;
      return chain;
    },
    neq: (k: string, v: any) => {
      // Keep non-matching rows in mock unless cancelled check applies
      return chain;
    },
    in: (k: string, vals: any[]) => {
      inFilters[k] = vals;
      return chain;
    },
    gte: () => chain,
    lte: () => chain,
    order: () => chain,
    limit: () => chain,
    insert: (payload: any) => {
      const items = Array.isArray(payload) ? payload : [payload];
      const enriched = items.map((item) => ({
        id: item.id || crypto.randomUUID(),
        issued_at: new Date().toISOString(),
        ...item,
      }));
      for (const item of enriched) {
        dbOps.inserts.push({ table: tableName, payload: item });
        if (tableName === "travel_commission_payout_receipts") dbOps.receipts.push(item);
        if (tableName === "financial_obligations") dbOps.obligations.push(item);
        if (tableName === "employee_payslips") dbOps.payslips.push(item);
        if (tableName === "financial_transactions") dbOps.transactions.push(item);
        if (tableName === "travel_sale_financial_sheets") dbOps.sheets.push(item);
      }
      return {
        ...chain,
        select: () => ({
          ...chain,
          single: async () => ({ data: enriched[0], error: null }),
          maybeSingle: async () => ({ data: enriched[0], error: null }),
        }),
        then: (resolve: any) => resolve({ data: enriched, error: null }),
      };
    },
    update: (payload: any) => {
      pendingUpdate = payload;
      dbOps.updates.push({ table: tableName, payload });
      const applyUpdate = () => {
        const matched = resolveRows();
        for (const m of matched) Object.assign(m, pendingUpdate);
        return matched;
      };
      const updateChain: any = {
        eq: (k: string, v: any) => {
          filters[k] = v;
          return updateChain;
        },
        in: (k: string, vals: any[]) => {
          inFilters[k] = vals;
          return updateChain;
        },
        select: () => ({
          single: async () => {
            const matched = applyUpdate();
            return { data: matched[0] || { id: filters.id, ...pendingUpdate }, error: null };
          },
          maybeSingle: async () => {
            const matched = applyUpdate();
            return { data: matched[0] || null, error: null };
          },
        }),
        then: (resolve: any) => {
          const matched = applyUpdate();
          return resolve({ data: matched, error: null });
        },
      };
      return updateChain;
    },
    upsert: (payload: any) => {
      const items = Array.isArray(payload) ? payload : [payload];
      for (const item of items) {
        dbOps.inserts.push({ table: tableName, payload: item });
        if (tableName === "employee_payslips") dbOps.payslips.push(item);
      }
      return {
        select: () => ({
          single: async () => ({ data: items[0], error: null }),
          maybeSingle: async () => ({ data: items[0], error: null }),
        }),
        then: (resolve: any) => resolve({ data: items, error: null }),
      };
    },
    single: async () => ({ data: resolveRows()[0] || null, error: resolveRows()[0] ? null : { message: "not found" } }),
    maybeSingle: async () => ({ data: resolveRows()[0] || null, error: null }),
    then: (resolve: any) => resolve({ data: resolveRows(), error: null }),
  };

  return chain;
}

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => makeTableChain(table),
  }),
}));

import { createOffPayrollAwardReceiptFn, acknowledgeOffPayrollReceiptFn } from "./travel-commission-payouts.functions";
import { closePayrollAndPostToPayables, listEmployeeTimeEntries } from "./hr.functions";
import { createTravelSupplier } from "./travel-suppliers.functions";
import { getMySalesAndCommissionsSummaryFn, getAgencySalesAnalyticsDashboardFn } from "./travel-commissions-unified.functions";
import { listTravelSaleFinancialSheets, upsertTravelSaleFinancialSheet } from "./travel-financials.functions";
import { reconcileOperatorReceivableFn } from "./travel-operator-billing.functions";
import { getRevenueGoalsAndForecast, saveRevenueGoals } from "./revenue-goals.functions";

describe("Tourism Commissions, Off-Payroll Segregation, Operator Billing & Strict RBAC", () => {
  beforeEach(() => {
    dbOps.inserts.length = 0;
    dbOps.updates.length = 0;
    dbOps.receipts.length = 0;
    dbOps.obligations.length = 0;
    dbOps.payslips.length = 0;
    dbOps.transactions.length = 0;
    dbOps.sheets = [
      {
        id: SHEET_1_ID,
        store_id: STORE_A,
        seller_profile_id: SELLER_1_ID,
        seller_name: "Consultora Ana",
        client_name: "João Viajante",
        destination: "Cancún",
        primary_operator: "Orinter",
        locator_code: "LOC-111",
        internal_code: "VND-1001",
        sale_date: "2026-11-10",
        competence_month: "2026-11",
        booking_status: "emitida",
        gross_sale_cents: 2_000_000,
        non_commissionable_cents: 100_000,
        net_sale_cents: 1_900_000,
        agency_revenue_cents: 300_000,
        expected_receipt_cents: 300_000,
        received_cents: 300_000,
        net_result_cents: 220_000,
        over_net_final_cents: 110_000,
        receivable_status: "recebido",
        invoice_status: "emitida",
        agent_commission_total_cents: 52_000,
        agent_base_commission_cents: 19_000,
        agent_over_commission_cents: 33_000,
        agent_commission_status: "eligible",
        agent_payout_receipt_id: null,
      },
      {
        id: SHEET_2_ID,
        store_id: STORE_A,
        seller_profile_id: SELLER_2_ID,
        seller_name: "Outro Consultor",
        client_name: "Maria Passageira",
        destination: "Paris",
        primary_operator: "FRT",
        locator_code: "LOC-222",
        internal_code: "VND-1002",
        sale_date: "2026-11-12",
        competence_month: "2026-11",
        booking_status: "confirmada",
        gross_sale_cents: 3_000_000,
        non_commissionable_cents: 0,
        net_sale_cents: 3_000_000,
        agency_revenue_cents: 450_000,
        expected_receipt_cents: 450_000,
        received_cents: 0,
        net_result_cents: 380_000,
        over_net_final_cents: 150_000,
        receivable_status: "a_receber",
        invoice_status: "solicitar",
        agent_commission_total_cents: 75_000,
        agent_commission_status: "pending",
        agent_payout_receipt_id: null,
      },
    ];
  });

  it("blocks seller from creating off-payroll receipts, viewing agency-wide dashboard, saving global sheets, creating suppliers, saving goals, or inspecting another employee's data", async () => {
    currentIdentity = {
      ...currentIdentity,
      id: SELLER_1_ID,
      role: "seller",
      store_id: STORE_A,
      memberships: [{ store_id: STORE_A, role: "seller", is_active: true }],
    };

    await expect(
      createOffPayrollAwardReceiptFn({
        data: {
          beneficiaryProfileId: SELLER_1_ID,
          beneficiaryName: "Consultora Ana",
          competenceMonth: "2026-11",
          sheetIds: [SHEET_1_ID],
          payoutNature: "premiacao_variavel_por_fora",
          payoutChannel: "off_payroll_award",
          paymentMethod: "pix",
          deductionsCents: 0,
          markPaidImmediately: true,
          allowUnsettledRelease: false,
        },
      }),
    ).rejects.toThrow(/Unauthorized|Insufficient permissions|permissão|Acesso/i);

    await expect(getAgencySalesAnalyticsDashboardFn({ data: { competenceMonth: "2026-11" } })).rejects.toThrow();

    await expect(
      createTravelSupplier({
        data: { name: "Operadora Hacker", kind: "operator", commission_rate: 12 },
      }),
    ).rejects.toThrow();

    await expect(
      saveRevenueGoals({
        data: { monthlyGoalCents: 1000, ordersGoal: 1, averageTicketGoalCents: 1000 },
      }),
    ).rejects.toThrow(/Unauthorized|Insufficient permissions|Acesso|gestores|permissão/i);

    await expect(
      listEmployeeTimeEntries({ data: { employeeId: "99999999-9999-4999-8999-999999999999" } }),
    ).rejects.toThrow(/Acesso negado/i);

    await expect(
      upsertTravelSaleFinancialSheet({
        data: {
          internal_code: "HACK-1",
          client_name: "Cliente",
          seller_name: "Seller",
          primary_operator: "Orinter",
          locator_code: "ABC",
          destination: "CUN",
          sale_date: "2026-11-15",
          booking_status: "confirmada",
          gross_sale_cents: 100000,
          non_commissionable_cents_direct: 0,
          non_commissionable_fees: [],
          commission_mode: "percentage",
          commission_base_type: "net_sale",
          commission_custom_base_cents: 0,
          commission_percentage: 10,
          commission_amount_cents: 0,
          over_mode: "amount",
          over_percentage: 0,
          over_gross_cents: 0,
          over_deductions: [],
          internal_costs: [],
          settlement_method: "fatura_abatida",
          expected_receipt_cents: 10000,
          received_cents: 0,
          receivable_status: "a_receber",
          supplier_items: [],
          invoice_status: "solicitar",
        },
      }),
    ).rejects.toThrow();
  });

  it("scopes seller personal view strictly to own sales, redacts agency net, and forbids inspecting peer agents", async () => {
    currentIdentity = {
      ...currentIdentity,
      id: SELLER_1_ID,
      role: "seller",
      store_id: STORE_A,
      memberships: [{ store_id: STORE_A, role: "seller", is_active: true }],
    };

    const sheets = await listTravelSaleFinancialSheets({ data: {} });
    expect(sheets).toHaveLength(1);
    expect(sheets[0].seller_profile_id).toBe(SELLER_1_ID);

    const summary = await getMySalesAndCommissionsSummaryFn({ data: { competenceMonth: "2026-11" } });
    expect(summary.canInspectAnyAgent).toBe(false);
    expect(summary.sales).toHaveLength(1);
    expect(summary.sales[0].agencyRevenueCents).toBeNull();
    expect(summary.summary.totalAgencyRevenueCents).toBeNull();

    await expect(
      getMySalesAndCommissionsSummaryFn({
        data: { competenceMonth: "2026-11", agentProfileId: SELLER_2_ID },
      }),
    ).rejects.toThrow(/Acesso negado/i);

    const goals = await getRevenueGoalsAndForecast({ data: {} });
    expect(goals.can_edit_goals).toBe(false);
    expect(goals.is_personal_scope).toBe(true);
  });

  it("emits automatic off-payroll award receipt NEVER touching CLT employee_payslips, allows agent acknowledgement, and isolates CLT payroll closure", async () => {
    currentIdentity = {
      ...currentIdentity,
      id: MANAGER_ID,
      role: "manager",
      store_id: STORE_A,
      fullName: "Gestor Carlos",
      memberships: [{ store_id: STORE_A, role: "manager", is_active: true }],
    };

    const payoutRes = await createOffPayrollAwardReceiptFn({
      data: {
        beneficiaryProfileId: SELLER_1_ID,
        beneficiaryEmployeeId: EMP_1_ID,
        beneficiaryName: "Consultora Ana",
        competenceMonth: "2026-11",
        sheetIds: [SHEET_1_ID],
        payoutNature: "premiacao_variavel_por_fora",
        payoutChannel: "off_payroll_award",
        paymentMethod: "pix",
        pixKey: "ana@agencia.com",
        deductionsCents: 0,
        markPaidImmediately: true,
        allowUnsettledRelease: false,
      },
    });

    expect(payoutRes.success).toBe(true);
    expect(payoutRes.receipt.include_in_payroll).toBe(false);
    expect(payoutRes.receipt.receipt_code).toMatch(/^REC-PREM-202611-/);
    expect(payoutRes.receipt.net_paid_cents).toBe(52_000);

    // Garante zero inserção em employee_payslips (folha CLT)
    expect(dbOps.payslips).toHaveLength(0);

    // Garante gravação em financial_obligations marcada off_payroll = true e DRE distinto da folha CLT
    expect(dbOps.obligations).toHaveLength(1);
    expect(dbOps.obligations[0].off_payroll).toBe(true);
    expect(dbOps.obligations[0].category).toBe("off_payroll_award");

    expect(dbOps.transactions).toHaveLength(1);
    expect(dbOps.transactions[0].type).toBe("expense_other");
    expect(dbOps.transactions[0].category).toBe("premiacao_variavel_comercial");

    // Vendedor faz o aceite digital ("Ciente") no recibo
    currentIdentity = {
      ...currentIdentity,
      id: SELLER_1_ID,
      role: "seller",
      memberships: [{ store_id: STORE_A, role: "seller", is_active: true }],
    };
    const ackRes = await acknowledgeOffPayrollReceiptFn({
      data: { receiptId: payoutRes.receipt.id },
    });
    expect(ackRes.receipt.status).toBe("acknowledged");
    expect(ackRes.receipt.acknowledged_at).toBeTruthy();

    // Fechamento de Folha CLT oficial separado para salário fixo (R$ 2.500) não mistura o prêmio R$ 520
    currentIdentity = {
      ...currentIdentity,
      id: MANAGER_ID,
      role: "admin",
      memberships: [{ store_id: STORE_A, role: "admin", is_active: true }],
    };
    await closePayrollAndPostToPayables({
      data: {
        referencePeriod: "2026-11",
        payslips: [
          {
            employeeId: EMP_1_ID,
            grossSalaryCents: 250_000,
            netSalaryCents: 225_000,
            inssDiscountCents: 25_000,
            irrfDiscountCents: 0,
            fgtsProvisionCents: 20_000,
            totalAdvancesDeductedCents: 0,
            overtimeCents: 0,
          },
        ],
      },
    });

    expect(dbOps.payslips).toHaveLength(1);
    expect(dbOps.payslips[0].gross_salary_cents).toBe(250_000);
    // Obrigação da folha CLT marcada estritamente off_payroll = false & category = payroll
    const payrollObligation = dbOps.obligations.find((o) => o.category === "payroll");
    expect(payrollObligation).toBeTruthy();
    expect(payrollObligation.off_payroll).toBe(false);
    expect(payrollObligation.amount_cents).toBe(225_000);
  });

  it("persists real operator receivable reconciliation into DB and DRE while blocking cross-tenant writes", async () => {
    currentIdentity = {
      ...currentIdentity,
      id: MANAGER_ID,
      role: "manager",
      store_id: STORE_A,
      memberships: [{ store_id: STORE_A, role: "manager", is_active: true }],
    };

    const rec = await reconcileOperatorReceivableFn({
      data: {
        sheetId: SHEET_2_ID,
        receivedCents: 450_000,
        invoiceNumber: "NF-2026-99",
      },
    });

    expect(rec.sheet.receivable_status).toBe("recebido");
    expect(rec.sheet.received_cents).toBe(450_000);
    expect(rec.sheet.agent_commission_status).toBe("eligible");
    expect(dbOps.transactions.some((t) => t.category === "comissao_operadora" && t.amount_cents === 450_000)).toBe(true);

    // Tentativa cross-tenant na STORE_B rejeitada pelo assertStoreAccess real
    await expect(
      getMySalesAndCommissionsSummaryFn({
        data: { storeId: STORE_B, competenceMonth: "2026-11" },
      }),
    ).rejects.toThrow();
  });
});
