/**
 * b2b-partners.functions.ts — BFF Server Functions para Painéis B2B Recursivos
 * Gestão de Acesso do Contador Convidado (DRE, XMLs, Faturamento) e Agências de RH Delegadas.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ============================================================
// Schemas
// ============================================================

export const inviteAccountantSchema = z.object({
  store_id: z.string().uuid().optional(),
  accountant_email: z.string().email("E-mail inválido"),
  accountant_crc: z.string().optional(),
  permissions: z
    .object({
      view_dre: z.boolean().default(true),
      view_invoices: z.boolean().default(true),
      view_settlement: z.boolean().default(true),
      download_xml: z.boolean().default(true),
    })
    .default({
      view_dre: true,
      view_invoices: true,
      view_settlement: true,
      download_xml: true,
    }),
});

// ============================================================
// Server Functions
// ============================================================

/**
 * 1. Lista acessos de contadores vinculados à loja
 */
export const listStoreAccountants = createServerFn({ method: "GET" })
  .validator(z.object({ store_id: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const targetStoreId = data?.store_id || identity.store_id;
    const supabase = getServerClient();
    const { data: accountants, error } = await supabase
      .from("store_accountant_access")
      .select("*, accountant_profile:profiles(full_name, email, phone)")
      .eq("store_id", targetStoreId)
      .neq("status", "revoked")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Falha ao listar contadores: ${error.message}`);
    return accountants || [];
  });

/**
 * 2. Loja convida escritório de contabilidade
 */
export const inviteAccountantToStore = createServerFn({ method: "POST" })
  .validator(inviteAccountantSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const targetStoreId = data.store_id || identity.store_id;
    const supabase = getServerClient();

    // Checa se o contador já tem perfil na plataforma pelo e-mail
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", data.accountant_email.toLowerCase().trim())
      .maybeSingle();

    const { data: access, error } = await supabase
      .from("store_accountant_access")
      .insert({
        store_id: targetStoreId,
        accountant_profile_id: profile?.id || null,
        accountant_email: data.accountant_email.toLowerCase().trim(),
        accountant_crc: data.accountant_crc || null,
        permissions: data.permissions,
        status: "active",
      })
      .select()
      .single();

    if (error) throw new Error(`Falha ao convidar contador: ${error.message}`);
    return access;
  });

/**
 * 2.1 Revogar acesso do escritório contábil
 */
export const revokeAccountantAccess = createServerFn({ method: "POST" })
  .validator(z.object({ accessId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const supabase = getServerClient();
    const { error } = await supabase
      .from("store_accountant_access")
      .update({ status: "revoked" })
      .eq("id", data.accessId)
      .eq("store_id", identity.store_id);

    if (error) throw new Error(`Falha ao revogar acesso: ${error.message}`);
    return { success: true };
  });

/**
 * 3. Contador obtém dados contábeis consolidados (DRE, Vendas por Meio de Pagamento)
 */
export const getAccountantFinancialSummary = createServerFn({ method: "GET" })
  .validator(z.object({ store_id: z.string().uuid().optional(), month_year: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    const targetStoreId = data?.store_id || identity.store_id;
    if (!targetStoreId) {
      return {
        store_id: "",
        total_orders_count: 0,
        gross_revenue_cents: 0,
        by_payment_method: { pix: 0, credit_card: 0, debit_card: 0, cash: 0, other: 0 },
        estimated_taxes_cents: 0,
      };
    }

    const supabase = getServerClient();

    // Valida se o usuário tem acesso como contador ou lojista
    const { data: access } = await supabase
      .from("store_accountant_access")
      .select("id, permissions")
      .eq("store_id", targetStoreId)
      .eq("accountant_profile_id", identity.id)
      .eq("status", "active")
      .maybeSingle();

    const isStoreMember = identity.store_id === targetStoreId;
    if (!access && !isStoreMember && identity.role !== "admin" && identity.role !== "master") {
      throw new Error("Sem permissão contábil para esta loja");
    }

    // 1. Busca configuração fiscal e regime tributário da empresa
    const { data: fiscalConfig } = await supabase
      .from("store_nfe_configs")
      .select("*")
      .eq("store_id", targetStoreId)
      .maybeSingle();

    const taxRegime = fiscalConfig?.regime_tributario || "simples_nacional";

    // 2. Busca pedidos faturados / concluídos
    const { data: orders } = await supabase
      .from("orders")
      .select("id, total_cents, channel_origin, created_at, status, payments(method)")
      .eq("store_id", targetStoreId)
      .in("status", ["completed", "delivered", "paid", "processing", "shipped"]);

    const ordersList = orders || [];
    let grossTotalCents = 0;
    let marketplaceRevenueCents = 0;
    const byMethod: Record<string, number> = {
      pix: 0,
      credit_card: 0,
      debit_card: 0,
      cash: 0,
      other: 0,
    };

    ordersList.forEach((o: any) => {
      const amount = Number(o.total_cents) || 0;
      grossTotalCents += amount;
      const firstPay = Array.isArray(o.payments) ? o.payments[0] : o.payments;
      const method = firstPay?.method || "other";
      byMethod[method] = (byMethod[method] || 0) + amount;
      if (o.channel_origin && o.channel_origin !== "pos_counter") {
        marketplaceRevenueCents += amount;
      }
    });

    // 3. Busca notas fiscais emitidas no período
    const { data: invoices } = await supabase
      .from("store_nfe_invoices")
      .select("id, nfe_number, nfe_serie, nfe_key, danfe_pdf_url, xml_url, valor_total_cents, tomador_nome, tomador_documento, issued_at")
      .eq("store_id", targetStoreId)
      .eq("status", "issued")
      .order("created_at", { ascending: false })
      .limit(50);

    const invoiceItems = invoices || [];
    const invoicesTotalCents = invoiceItems.reduce((acc, cur) => acc + (cur.valor_total_cents || 0), 0);

    // 4. Cálculo de tributação conforme o regime tributário real
    let estimatedTaxesCents = 0;
    let taxRegimeLabel = "Simples Nacional (Anexo I/III)";
    let taxRateEffective = 0.06;

    if (taxRegime === "simples_nacional") {
      taxRateEffective = 0.06; // Média 6%
      estimatedTaxesCents = Math.round(grossTotalCents * taxRateEffective);
      taxRegimeLabel = "Simples Nacional (PGDAS-D ~6.0%)";
    } else if (taxRegime === "lucro_presumido") {
      taxRateEffective = 0.1333; // PIS/COFINS (3.65%) + IRPJ/CSLL presumido (~7.68%) + ISS/ICMS
      estimatedTaxesCents = Math.round(grossTotalCents * taxRateEffective);
      taxRegimeLabel = "Lucro Presumido (Federal + Municipal ~13.33%)";
    } else if (taxRegime === "lucro_real") {
      taxRateEffective = 0.1125; // Alíquota efetiva estimada sobre faturamento líquido
      estimatedTaxesCents = Math.round(grossTotalCents * taxRateEffective);
      taxRegimeLabel = "Lucro Real (Apuração Não Cumulativa)";
    } else if (taxRegime === "mei") {
      taxRateEffective = 0;
      estimatedTaxesCents = 7500; // DAS fixo MEI R$ 75,00
      taxRegimeLabel = "Microempreendedor Individual (DAS Fixo)";
    }

    // 5. Matriz de Gastos e Despesas Contábeis
    const estimatedMarketplaceFeesCents = Math.round(marketplaceRevenueCents * 0.14); // ~14% comissão média
    const estimatedCmvCents = Math.round(grossTotalCents * 0.42); // CMV ~42%
    const estimatedOperatingExpensesCents = Math.round(grossTotalCents * 0.12); // Despesas operacionais ~12%
    const estimatedNetProfitCents = Math.max(
      0,
      grossTotalCents - estimatedCmvCents - estimatedMarketplaceFeesCents - estimatedOperatingExpensesCents - estimatedTaxesCents
    );

    return {
      store_id: targetStoreId,
      cnpj: fiscalConfig?.cnpj || "00.000.000/0001-00",
      razao_social: fiscalConfig?.razao_social || "Empresa Integrada",
      tax_regime: taxRegime,
      tax_regime_label: taxRegimeLabel,
      tax_rate_effective: taxRateEffective,
      total_orders_count: ordersList.length,
      gross_revenue_cents: grossTotalCents,
      by_payment_method: byMethod,
      estimated_taxes_cents: estimatedTaxesCents,
      invoices_count: invoiceItems.length,
      invoices_total_cents: invoicesTotalCents,
      invoices: invoiceItems,
      expense_matrix: {
        cmv_cents: estimatedCmvCents,
        marketplace_fees_cents: estimatedMarketplaceFeesCents,
        operating_expenses_cents: estimatedOperatingExpensesCents,
        net_profit_cents: estimatedNetProfitCents,
      },
    };
  });
