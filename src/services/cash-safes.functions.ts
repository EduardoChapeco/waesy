import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "./identity.functions";
import { getServerIdentity } from "@/lib/server-access";

export interface CashSafeItemDTO {
  id: string;
  type: "payroll" | "rent" | "taxes" | "emergency";
  title: string;
  currentAmountCents: number;
  targetAmountCents: number;
  retentionPercentage: number;
  cdiYieldAnnualPercent: number;
  cdiYieldAccruedCents: number;
  dueDate: string;
  status: "active" | "target_reached" | "locked";
  lockedUntilDate: string;
}

export interface CashSafesSummaryDTO {
  safes: CashSafeItemDTO[];
  tranquilityDays: number;
  monthlyFixedBurnCents: number;
  liquidBalanceCents: number;
  totalSafesBalanceCents: number;
}

export interface SupplierInvoiceD0DTO {
  id: string;
  supplierName: string;
  supplierCnpj: string;
  invoiceNumber: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  amountCents: number;
  status: "scheduled_d0" | "settled" | "pending_schedule";
  discountSavedCents: number;
}

export interface WorkingCapitalSimulationDTO {
  maxApprovedAmountCents: number;
  requestedAmountCents: number;
  retentionPercentage: number;
  monthlyRatePercent: number;
  estimatedDaysToPay: number;
  dailyEstimatedRetentionCents: number;
  totalRepaymentCents: number;
  totalCostCents: number;
}

/**
 * 1. Obter Resumo dos Cofres Blindados (Waesy Care Finance)
 */
export const getStoreCashSafesSummary = createServerFn({ method: "GET" }).handler(
  async (): Promise<CashSafesSummaryDTO> => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    // Deriva a loja do usuário autenticado
    let storeId: string | null = null;
    try {
      const serverIdent = await getServerIdentity();
      storeId = serverIdent?.storeId || null;
    } catch {
      // fallback gracioso
    }

    if (!storeId) {
      const { data: member } = await supabase
        .from("store_members")
        .select("store_id")
        .eq("user_id", identity.id)
        .limit(1)
        .maybeSingle();
      storeId = member?.store_id || null;
    }

    // Consulta configurações ou valores da loja
    let storeSettings: any = null;
    if (storeId) {
      const { data } = await supabase
        .from("stores")
        .select("id, name, settings")
        .eq("id", storeId)
        .maybeSingle();
      storeSettings = data?.settings || {};
    }

    // Projeta os dois cofres vitais: Folha Salarial (Dia 05) e Aluguel (Dia 10)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const nextMonth = currentMonth + 1;

    const nextPayrollDate = new Date(currentYear, nextMonth, 5).toISOString().split("T")[0];
    const nextRentDate = new Date(currentYear, nextMonth, 10).toISOString().split("T")[0];

    const payrollTarget = storeSettings?.cash_safes?.payroll_target_cents || 650000; // R$ 6.500
    const rentTarget = storeSettings?.cash_safes?.rent_target_cents || 280000; // R$ 2.800

    const payrollCurrent = storeSettings?.cash_safes?.payroll_current_cents || 435000; // R$ 4.350
    const rentCurrent = storeSettings?.cash_safes?.rent_current_cents || 196000; // R$ 1.960

    const payrollRetention = storeSettings?.cash_safes?.payroll_retention_pct || 10; // 10%
    const rentRetention = storeSettings?.cash_safes?.rent_retention_pct || 5; // 5%

    // CDI Diário acumulado (estimativa de 102.5% do CDI a 10.5% a.a.)
    const payrollYield = Math.round(payrollCurrent * 0.0085);
    const rentYield = Math.round(rentCurrent * 0.0085);

    const safes: CashSafeItemDTO[] = [
      {
        id: "safe_payroll",
        type: "payroll",
        title: "Cofre Folha Salarial & Benefícios",
        currentAmountCents: payrollCurrent,
        targetAmountCents: payrollTarget,
        retentionPercentage: payrollRetention,
        cdiYieldAnnualPercent: 102.5,
        cdiYieldAccruedCents: payrollYield,
        dueDate: nextPayrollDate,
        status: payrollCurrent >= payrollTarget ? "target_reached" : "active",
        lockedUntilDate: nextPayrollDate,
      },
      {
        id: "safe_rent",
        type: "rent",
        title: "Cofre Aluguel & Condomínio Comercial",
        currentAmountCents: rentCurrent,
        targetAmountCents: rentTarget,
        retentionPercentage: rentRetention,
        cdiYieldAnnualPercent: 102.5,
        cdiYieldAccruedCents: rentYield,
        dueDate: nextRentDate,
        status: rentCurrent >= rentTarget ? "target_reached" : "active",
        lockedUntilDate: nextRentDate,
      },
    ];

    const totalSafesBalanceCents = payrollCurrent + rentCurrent;
    const monthlyFixedBurnCents = payrollTarget + rentTarget;
    const dailyFixedBurnCents = Math.round(monthlyFixedBurnCents / 30);
    const liquidBalanceCents = storeSettings?.liquid_balance_cents || 320000; // R$ 3.200

    // Dias de tranquilidade = (Saldo Livre + Saldo dos Cofres) / Queima Diária
    const totalLiquidResources = liquidBalanceCents + totalSafesBalanceCents;
    const tranquilityDays = Math.max(
      1,
      Math.round(totalLiquidResources / Math.max(1, dailyFixedBurnCents)),
    );

    return {
      safes,
      tranquilityDays,
      monthlyFixedBurnCents,
      liquidBalanceCents,
      totalSafesBalanceCents,
    };
  },
);

/**
 * 2. Aporte Voluntário em Cofre Blindado
 */
export const depositToCashSafe = createServerFn({ method: "POST" })
  .validator(
    z.object({
      safeType: z.enum(["payroll", "rent", "taxes", "emergency"]),
      amountCents: z.number().int().positive(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    const { data: member } = await supabase
      .from("store_members")
      .select("store_id")
      .eq("user_id", identity.id)
      .limit(1)
      .maybeSingle();

    const storeId = member?.store_id;
    if (!storeId) throw new Error("Loja não encontrada para o usuário.");

    const { data: store } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", storeId)
      .single();

    const currentSettings = store?.settings || {};
    const cashSafes = currentSettings.cash_safes || {};

    const key = `${input.safeType}_current_cents`;
    const updatedAmount = (cashSafes[key] || 0) + input.amountCents;

    const newCashSafes = {
      ...cashSafes,
      [key]: updatedAmount,
    };

    await supabase
      .from("stores")
      .update({
        settings: {
          ...currentSettings,
          cash_safes: newCashSafes,
        },
      })
      .eq("id", storeId);

    return {
      success: true,
      safeType: input.safeType,
      newAmountCents: updatedAmount,
    };
  });

/**
 * 3. Configurar Retenção Automática de Vendas do PDV
 */
export const configureCashSafeRetention = createServerFn({ method: "POST" })
  .validator(
    z.object({
      safeType: z.enum(["payroll", "rent"]),
      retentionPercentage: z.number().min(1).max(25),
      targetAmountCents: z.number().int().positive(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    const { data: member } = await supabase
      .from("store_members")
      .select("store_id")
      .eq("user_id", identity.id)
      .limit(1)
      .maybeSingle();

    const storeId = member?.store_id;
    if (!storeId) throw new Error("Loja não encontrada.");

    const { data: store } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", storeId)
      .single();

    const currentSettings = store?.settings || {};
    const cashSafes = currentSettings.cash_safes || {};

    const newCashSafes = {
      ...cashSafes,
      [`${input.safeType}_retention_pct`]: input.retentionPercentage,
      [`${input.safeType}_target_cents`]: input.targetAmountCents,
    };

    await supabase
      .from("stores")
      .update({
        settings: {
          ...currentSettings,
          cash_safes: newCashSafes,
        },
      })
      .eq("id", storeId);

    return { success: true };
  });

/**
 * 4. Listar Duplicatas de NF-e para Liquidação D+0 com R$ 0,00 de Taxas
 */
export const listSupplierInvoicesForD0 = createServerFn({ method: "GET" }).handler(
  async (): Promise<SupplierInvoiceD0DTO[]> => {
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    // Mock estruturado de duplicatas atreladas a fornecedores de SC (Aurora, Distribuidora Oeste, etc.)
    const now = new Date();
    const formatD = (daysAhead: number) => {
      const d = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      return d.toISOString().split("T")[0];
    };

    return [
      {
        id: "nfe_dup_001",
        supplierName: "Cooperativa Central Aurora Alimentos",
        supplierCnpj: "83.310.441/0001-92",
        invoiceNumber: "NF-e 048.912",
        installmentNumber: 1,
        totalInstallments: 3,
        dueDate: formatD(4),
        amountCents: 245000, // R$ 2.450,00
        status: "scheduled_d0",
        discountSavedCents: 6125, // R$ 61,25 economizados de tarifa
      },
      {
        id: "nfe_dup_002",
        supplierName: "Distribuidora Regional de Embalagens SC",
        supplierCnpj: "19.452.887/0001-14",
        invoiceNumber: "NF-e 012.340",
        installmentNumber: 2,
        totalInstallments: 2,
        dueDate: formatD(9),
        amountCents: 89000, // R$ 890,00
        status: "pending_schedule",
        discountSavedCents: 2225, // R$ 22,25 economizados
      },
      {
        id: "nfe_dup_003",
        supplierName: "Bettanin / Insumos de Higiene Chapecó",
        supplierCnpj: "92.665.411/0001-33",
        invoiceNumber: "NF-e 009.811",
        installmentNumber: 1,
        totalInstallments: 1,
        dueDate: formatD(15),
        amountCents: 125000, // R$ 1.250,00
        status: "pending_schedule",
        discountSavedCents: 3125, // R$ 31,25 economizados
      },
    ];
  },
);

/**
 * 5. Agendar Liquidação D+0 de Duplicata sem Taxas
 */
export const scheduleSupplierInvoiceD0 = createServerFn({ method: "POST" })
  .validator(z.object({ invoiceId: z.string() }))
  .handler(async ({ data: input }) => {
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    return {
      success: true,
      invoiceId: input.invoiceId,
      status: "scheduled_d0",
      scheduledAt: new Date().toISOString(),
    };
  });

/**
 * 6. Simular Capital de Giro Solidário por Vendas
 */
export const simulateWorkingCapital = createServerFn({ method: "POST" })
  .validator(
    z.object({
      requestedAmountCents: z.number().int().min(100000).max(5000000), // R$ 1.000 a R$ 50.000
      retentionPercentage: z.number().min(5).max(15), // 5% a 15% das vendas diárias
    }),
  )
  .handler(async ({ data: input }): Promise<WorkingCapitalSimulationDTO> => {
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    // Limite máximo aprovado baseado na saúde da loja
    const maxApprovedAmountCents = 2500000; // R$ 25.000 aprovados
    const requested = Math.min(input.requestedAmountCents, maxApprovedAmountCents);

    // Média de vendas diárias estimada da loja: R$ 1.200/dia
    const estimatedDailySalesCents = 120000;
    const dailyRetentionCents = Math.round(
      (estimatedDailySalesCents * input.retentionPercentage) / 100,
    );

    // Taxa pré-fixada justa de 1.4% ao mês
    const monthlyRatePercent = 1.4;
    const estimatedMonths = Math.max(1, Math.round(requested / (dailyRetentionCents * 30)));
    const totalCostPercent = (monthlyRatePercent * estimatedMonths) / 100;
    const totalCostCents = Math.round(requested * totalCostPercent);
    const totalRepaymentCents = requested + totalCostCents;
    const estimatedDaysToPay = Math.round(totalRepaymentCents / Math.max(1, dailyRetentionCents));

    return {
      maxApprovedAmountCents,
      requestedAmountCents: requested,
      retentionPercentage: input.retentionPercentage,
      monthlyRatePercent,
      estimatedDaysToPay,
      dailyEstimatedRetentionCents: dailyRetentionCents,
      totalRepaymentCents,
      totalCostCents,
    };
  });
