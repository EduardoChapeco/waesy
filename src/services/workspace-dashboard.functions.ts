/**
 * workspace-dashboard.functions.ts — BFF Server Functions para Métricas e KPIs Reais do Workspace Pro
 *
 * Fase F10 do Plano Mestre de Estabilização dos 4 Pilares.
 *
 * Invariantes:
 * - M01: Zero Mocks / Zero Hardcode — todas as métricas calculadas em tempo real no Supabase.
 * - M02: SSR / Hidratação Limpa com tipagem estrita Zod.
 * - M03: Auditabilidade Transacional com valores inteiros em centavos (Zero-Float Drift).
 * - M10: Isolamento Multi-Tenant estrito via assertStoreAccess.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export const workspaceDashboardKpisInputSchema = z.object({
  period: z.enum(["today", "7d", "30d"]).default("30d"),
  storeId: z.string().uuid().optional(),
});

export type WorkspaceDashboardKpisInput = z.infer<typeof workspaceDashboardKpisInputSchema>;

export interface DashboardSalesKpiDTO {
  totalRevenueCents: number;
  ordersCount: number;
  averageTicketCents: number;
  pendingOrdersCount: number;
}

export interface DashboardProductsKpiDTO {
  totalProductsCount: number;
  activeProductsCount: number;
  outOfStockCount: number;
}

export interface DashboardCustomersKpiDTO {
  totalCustomersCount: number;
  newCustomersCount: number;
}

export interface DashboardFinancialKpiDTO {
  totalIncomeCents: number;
  totalExpenseCents: number;
  netProfitCents: number;
}

export interface DashboardKpisDTO {
  storeId: string;
  period: "today" | "7d" | "30d";
  sales: DashboardSalesKpiDTO;
  products: DashboardProductsKpiDTO;
  customers: DashboardCustomersKpiDTO;
  financial: DashboardFinancialKpiDTO;
  generatedAt: string;
}

export const getWorkspaceDashboardKpisFn = createServerFn({ method: "GET" })
  .validator(workspaceDashboardKpisInputSchema)
  .handler(async ({ data }): Promise<DashboardKpisDTO> => {
    const identity = await getServerIdentity();
    const targetStoreId = data?.storeId || identity.store_id;

    if (targetStoreId === null || targetStoreId === undefined) {
      throw new Error("Loja ativa não identificada na sessão do operador");
    }

    assertStoreAccess(identity, [
      "owner",
      "admin",
      "manager",
      "seller",
      "finance",
      "stock",
      "content",
      "support",
    ]);

    const supabase = getServerClient();
    const period = data?.period || "30d";
    const now = new Date();

    let startDate: Date;
    if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const startDateIso = startDate.toISOString();

    // 1. Consulta transacional de Pedidos (orders)
    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, status, total_cents, created_at")
      .eq("store_id", targetStoreId)
      .gte("created_at", startDateIso);

    const orders = ordersData || [];
    let totalRevenueCents = 0;
    let pendingOrdersCount = 0;
    let paidOrdersCount = 0;

    for (const order of orders) {
      const isPaid =
        order.status === "paid" ||
        order.status === "completed" ||
        order.status === "delivered" ||
        order.status === "shipped";

      if (isPaid) {
        totalRevenueCents += Number(order.total_cents || 0);
        paidOrdersCount++;
      }

      if (
        order.status === "pending" ||
        order.status === "awaiting_payment" ||
        order.status === "processing"
      ) {
        pendingOrdersCount++;
      }
    }

    const averageTicketCents =
      paidOrdersCount > 0 ? Math.round(totalRevenueCents / paidOrdersCount) : 0;

    // 2. Consulta de Produtos do Catálogo (products)
    const { data: productsData } = await supabase
      .from("products")
      .select("id, status, stock_quantity")
      .eq("store_id", targetStoreId);

    const products = productsData || [];
    let activeProductsCount = 0;
    let outOfStockCount = 0;

    for (const prod of products) {
      if (prod.status === "active" || prod.status === "published") {
        activeProductsCount++;
      }
      const qty = Number(prod.stock_quantity ?? 0);
      if (qty <= 0 || prod.status === "out_of_stock") {
        outOfStockCount++;
      }
    }

    // 3. Consulta de Clientes (customers_crm)
    const { count: totalCustomersCount } = await supabase
      .from("customers_crm")
      .select("id", { count: "exact", head: true })
      .eq("store_id", targetStoreId)
      .is("deleted_at", null);

    const { count: newCustomersCount } = await supabase
      .from("customers_crm")
      .select("id", { count: "exact", head: true })
      .eq("store_id", targetStoreId)
      .is("deleted_at", null)
      .gte("created_at", startDateIso);

    // 4. Consulta de Livro-Caixa e Finanças (financial_transactions)
    const { data: transactionsData } = await supabase
      .from("financial_transactions")
      .select("amount_cents, type")
      .eq("store_id", targetStoreId)
      .gte("created_at", startDateIso);

    const transactions = transactionsData || [];
    let totalIncomeCents = 0;
    let totalExpenseCents = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount_cents || 0);
      if (tx.type === "revenue_sale" || tx.type === "revenue_pos_sale") {
        totalIncomeCents += amount;
      } else if (
        tx.type === "expense_shipping" ||
        tx.type === "expense_fee" ||
        tx.type === "expense_other" ||
        tx.type === "refund"
      ) {
        totalExpenseCents += amount;
      }
    }

    // Se financial_transactions estiver vazio para lojas recentes, sincroniza receita com os pedidos pagos
    if (totalIncomeCents === 0 && totalRevenueCents > 0) {
      totalIncomeCents = totalRevenueCents;
    }

    const netProfitCents = totalIncomeCents - totalExpenseCents;

    return {
      storeId: targetStoreId,
      period,
      sales: {
        totalRevenueCents,
        ordersCount: orders.length,
        averageTicketCents,
        pendingOrdersCount,
      },
      products: {
        totalProductsCount: products.length,
        activeProductsCount,
        outOfStockCount,
      },
      customers: {
        totalCustomersCount: totalCustomersCount || 0,
        newCustomersCount: newCustomersCount || 0,
      },
      financial: {
        totalIncomeCents,
        totalExpenseCents,
        netProfitCents,
      },
      generatedAt: now.toISOString(),
    };
  });
