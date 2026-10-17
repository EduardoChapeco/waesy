import { z } from "zod";

// ─── Tipos e Catálogos Canônicos do Financeiro da Venda ──────────────────────

export const CANONICAL_TRAVEL_OPERATORS = [
  "Orinter",
  "FRT",
  "Cativa",
  "BFly",
  "Confiança",
  "CVC Corp",
  "Azul Viagens",
  "LATAM Travel",
  "BeFly / RexturAdvance",
  "Sakura",
  "Bedsonline / Hotelbeds",
  "Direto Hotel / Fornecedor",
  "Outra Operadora",
] as const;

export const NON_COMMISSIONABLE_FEE_TYPES = [
  { id: "taxa_embarque", label: "Taxa de embarque" },
  { id: "encargo", label: "Encargo governamental / portuário" },
  { id: "servico_nao_comissionavel", label: "Serviço não comissionável" },
  { id: "seguro_isento", label: "Seguro / taxa isenta" },
  { id: "outra", label: "Outra taxa" },
] as const;

export const OVER_DEDUCTION_TYPES = [
  { id: "imposto", label: "Imposto sobre Over (NF/ISS/Simples)" },
  { id: "retencao", label: "Retenção na fonte (IRRF)" },
  { id: "taxa_operadora", label: "Taxa administrativa da operadora" },
  { id: "taxa_financeira", label: "Taxa financeira / antecipação" },
  { id: "repasse", label: "Repasse comercial" },
  { id: "outra", label: "Outra dedução" },
] as const;

export const INTERNAL_COST_TYPES = [
  { id: "comissao_vendedor", label: "Comissão de vendedor" },
  { id: "comissao_parceiro", label: "Comissão de parceiro / indicador" },
  { id: "brinde_cliente", label: "Brinde / mimo ao passageiro" },
  { id: "desconto_absorvido", label: "Desconto comercial absorvido" },
  { id: "taxa_cartao_gateway", label: "Taxa de cartão / gateway" },
  { id: "transporte_extra", label: "Transporte / transfer cortesia" },
  { id: "hospedagem_extra", label: "Hospedagem / diária extra" },
  { id: "reembolso_ajuste", label: "Reembolso / ajuste operacional" },
  { id: "outro", label: "Outro custo interno" },
] as const;

export const SUPPLIER_ITEM_CATEGORIES = [
  { id: "pacote", label: "Pacote Completo" },
  { id: "aereo", label: "Passagem Aérea" },
  { id: "hotel", label: "Hospedagem / Hotel" },
  { id: "transfer", label: "Transfer / Receptivo" },
  { id: "passeio", label: "Passeios / Ingressos" },
  { id: "seguro", label: "Seguro Viagem" },
  { id: "aluguel_carro", label: "Locação de Veículo" },
  { id: "cruzeiro", label: "Cruzeiro Marítimo" },
  { id: "outro", label: "Outro Serviço" },
] as const;

export const SETTLEMENT_METHODS = [
  { id: "fatura_abatida", label: "Abatimento em fatura (Net)" },
  { id: "deposito_bancario", label: "Depósito bancário" },
  { id: "pix", label: "PIX em conta" },
  { id: "credito_operadora", label: "Crédito na operadora" },
  { id: "cartao_virtual", label: "Cartão virtual / VCN" },
  { id: "misto", label: "Misto (Fatura + Repasse)" },
] as const;

export const RECEIVABLE_STATUSES = [
  { id: "a_receber", label: "A receber" },
  { id: "parcialmente_recebido", label: "Parcialmente recebido" },
  { id: "recebido", label: "Recebido" },
  { id: "divergencia", label: "Em divergência" },
  { id: "cancelado", label: "Cancelado" },
] as const;

export const INVOICE_STATUSES = [
  { id: "nao_necessaria", label: "Não necessária" },
  { id: "pendente", label: "Pendente" },
  { id: "solicitar", label: "Solicitar emissão" },
  { id: "solicitada", label: "Solicitada" },
  { id: "emitida", label: "Emitida" },
  { id: "recebida", label: "Recebida / Conciliada" },
] as const;

// ─── Schemas Zod para Entrada e Cálculo ──────────────────────────────────────

export const NonCommissionableFeeItemSchema = z.object({
  id: z.string().optional(),
  fee_type: z
    .enum(["taxa_embarque", "encargo", "servico_nao_comissionavel", "seguro_isento", "outra"])
    .default("taxa_embarque"),
  description: z.string().min(1),
  amount_cents: z.number().int().nonnegative(),
});

export const OverDeductionItemSchema = z.object({
  id: z.string().optional(),
  deduction_type: z
    .enum(["imposto", "retencao", "taxa_operadora", "taxa_financeira", "repasse", "outra"])
    .default("imposto"),
  calc_mode: z.enum(["amount", "percentage"]).default("percentage"),
  percentage: z.number().nonnegative().default(0),
  amount_cents: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
});

export const InternalCostItemSchema = z.object({
  id: z.string().optional(),
  cost_type: z
    .enum([
      "comissao_vendedor",
      "comissao_parceiro",
      "brinde_cliente",
      "desconto_absorvido",
      "taxa_cartao_gateway",
      "transporte_extra",
      "hospedagem_extra",
      "reembolso_ajuste",
      "outro",
    ])
    .default("comissao_vendedor"),
  description: z.string().min(1),
  calc_mode: z.enum(["amount", "percentage"]).default("amount"),
  percentage: z.number().nonnegative().default(0),
  amount_cents: z.number().int().nonnegative().default(0),
  beneficiary_name: z.string().optional(),
  due_date: z.string().optional(),
  payment_status: z.enum(["previsto", "pago", "cancelado"]).default("previsto"),
  notes: z.string().optional(),
});

export const SupplierBreakdownItemSchema = z.object({
  id: z.string().optional(),
  item_category: z
    .enum(["aereo", "hotel", "pacote", "transfer", "passeio", "seguro", "aluguel_carro", "cruzeiro", "outro"])
    .default("pacote"),
  operator_name: z.string().min(1),
  locator_code: z.string().min(1),
  gross_amount_cents: z.number().int().nonnegative().default(0),
  non_commissionable_cents: z.number().int().nonnegative().default(0),
  net_amount_cents: z.number().int().nonnegative().default(0),
  commission_cents: z.number().int().nonnegative().default(0),
  over_net_cents: z.number().int().nonnegative().default(0),
  expected_receipt_cents: z.number().int().nonnegative().default(0),
  received_cents: z.number().int().nonnegative().default(0),
  settlement_method: z.string().default("fatura_abatida"),
  expected_date: z.string().optional(),
  received_date: z.string().optional(),
  status: z
    .enum(["a_receber", "parcialmente_recebido", "recebido", "divergencia", "cancelado"])
    .default("a_receber"),
  invoice_number: z.string().optional(),
});

export type NonCommissionableFeeItem = z.infer<typeof NonCommissionableFeeItemSchema>;
export type OverDeductionItem = z.infer<typeof OverDeductionItemSchema>;
export type InternalCostItem = z.infer<typeof InternalCostItemSchema>;
export type SupplierBreakdownItem = z.infer<typeof SupplierBreakdownItemSchema>;

export interface SaleFinancialCalculationInput {
  gross_sale_cents: number;
  non_commissionable_cents_direct?: number;
  non_commissionable_fees?: NonCommissionableFeeItem[];

  commission_mode: "amount" | "percentage";
  commission_base_type?: "net_sale" | "gross_sale" | "custom";
  commission_custom_base_cents?: number;
  commission_percentage?: number;
  commission_amount_cents?: number;
  commission_override_cents?: number | null;

  over_mode?: "amount" | "percentage";
  over_percentage?: number;
  over_gross_cents?: number;
  over_deductions?: OverDeductionItem[];
  over_net_override_cents?: number | null;

  internal_costs?: InternalCostItem[];
}

export interface SaleFinancialCalculationResult {
  // Bloco 1: Composição da Venda
  gross_sale_cents: number;
  non_commissionable_cents: number;
  net_sale_cents: number;

  // Bloco 2: Comissão
  commission_base_cents: number;
  commission_calculated_cents: number;
  commission_final_cents: number;
  is_commission_overridden: boolean;

  // Bloco 3: Over
  over_gross_cents: number;
  over_deductions_cents: number;
  over_deductions_resolved: Array<OverDeductionItem & { resolved_cents: number }>;
  over_net_calculated_cents: number;
  over_net_final_cents: number;
  is_over_overridden: boolean;

  // Bloco 4: Receita da Agência
  agency_revenue_cents: number;

  // Bloco 5: Custos Internos
  internal_costs_cents: number;
  internal_costs_resolved: Array<InternalCostItem & { resolved_cents: number }>;

  // Bloco 6: Resultado e Margens
  net_result_cents: number;
  margin_on_sale_pct: number;
  margin_on_revenue_pct: number;
}

/**
 * Calcula de forma determinística os 8 blocos financeiros de uma venda de turismo.
 * Respeita estritamente as regras:
 * 1. Venda Líquida = Valor Total da Venda - Taxas Não Comissionáveis
 * 2. Comissão = Valor direto (R$) ou Percentual (%) sobre a base selecionada (com suporte a override)
 * 3. Over Líquido = Over Bruto - Deduções sobre o Over (Imposto, Retenção, Taxa Operadora, etc.)
 * 4. Receita da Agência = Comissão Final + Over Líquido Final
 * 5. Resultado da Venda = Receita da Agência - Custos Internos
 */
export function calculateSaleFinancials(
  input: SaleFinancialCalculationInput
): SaleFinancialCalculationResult {
  const grossSaleCents = Math.max(0, Math.round(input.gross_sale_cents || 0));

  // 1. Taxas Não Comissionáveis e Venda Líquida
  const itemizedFeesCents =
    input.non_commissionable_fees && input.non_commissionable_fees.length > 0
      ? input.non_commissionable_fees.reduce(
          (acc, f) => acc + Math.max(0, Math.round(f.amount_cents || 0)),
          0
        )
      : Math.max(0, Math.round(input.non_commissionable_cents_direct || 0));

  const nonCommissionableCents = Math.min(grossSaleCents, itemizedFeesCents);
  const netSaleCents = Math.max(0, grossSaleCents - nonCommissionableCents);

  // 2. Comissão
  const baseType = input.commission_base_type || "net_sale";
  const commissionBaseCents =
    baseType === "gross_sale"
      ? grossSaleCents
      : baseType === "custom"
        ? Math.max(0, Math.round(input.commission_custom_base_cents || 0))
        : netSaleCents;

  let commissionCalculatedCents = 0;
  if (input.commission_mode === "percentage") {
    const pct = Math.max(0, Number(input.commission_percentage || 0));
    commissionCalculatedCents = Math.round((commissionBaseCents * pct) / 100);
  } else {
    commissionCalculatedCents = Math.max(0, Math.round(input.commission_amount_cents || 0));
  }

  const isCommissionOverridden =
    input.commission_override_cents !== undefined &&
    input.commission_override_cents !== null &&
    input.commission_override_cents >= 0;

  const commissionFinalCents = isCommissionOverridden
    ? Math.round(input.commission_override_cents!)
    : commissionCalculatedCents;

  // 3. Over Bruto, Deduções e Over Líquido
  let overGrossCents = Math.max(0, Math.round(input.over_gross_cents || 0));
  if (input.over_mode === "percentage" && (input.over_percentage || 0) > 0) {
    overGrossCents = Math.round((commissionBaseCents * Number(input.over_percentage)) / 100);
  }

  const overDeductionsResolved = (input.over_deductions || []).map((ded) => {
    const resolvedCents =
      ded.calc_mode === "percentage"
        ? Math.round((overGrossCents * Math.max(0, Number(ded.percentage || 0))) / 100)
        : Math.max(0, Math.round(ded.amount_cents || 0));
    return {
      ...ded,
      amount_cents: resolvedCents,
      resolved_cents: resolvedCents,
    };
  });

  const overDeductionsCents = overDeductionsResolved.reduce(
    (acc, d) => acc + d.resolved_cents,
    0
  );

  const overNetCalculatedCents = Math.max(0, overGrossCents - overDeductionsCents);
  const isOverOverridden =
    input.over_net_override_cents !== undefined &&
    input.over_net_override_cents !== null &&
    input.over_net_override_cents >= 0;

  const overNetFinalCents = isOverOverridden
    ? Math.round(input.over_net_override_cents!)
    : overNetCalculatedCents;

  // 4. Receita da Agência (Comissão Final + Over Líquido Final)
  const agencyRevenueCents = commissionFinalCents + overNetFinalCents;

  // 5. Custos Internos da Venda (apenas os não cancelados contam no resultado)
  const internalCostsResolved = (input.internal_costs || []).map((cost) => {
    if (cost.payment_status === "cancelado") {
      return { ...cost, resolved_cents: 0 };
    }
    const resolvedCents =
      cost.calc_mode === "percentage"
        ? Math.round((agencyRevenueCents * Math.max(0, Number(cost.percentage || 0))) / 100)
        : Math.max(0, Math.round(cost.amount_cents || 0));
    return {
      ...cost,
      amount_cents: resolvedCents,
      resolved_cents: resolvedCents,
    };
  });

  const internalCostsCents = internalCostsResolved.reduce(
    (acc, c) => acc + c.resolved_cents,
    0
  );

  // 6. Resultado da Venda e Margens
  const netResultCents = agencyRevenueCents - internalCostsCents;

  const marginOnSalePct =
    grossSaleCents > 0
      ? Number(((netResultCents / grossSaleCents) * 100).toFixed(2))
      : 0;

  const marginOnRevenuePct =
    agencyRevenueCents > 0
      ? Number(((netResultCents / agencyRevenueCents) * 100).toFixed(2))
      : 0;

  return {
    gross_sale_cents: grossSaleCents,
    non_commissionable_cents: nonCommissionableCents,
    net_sale_cents: netSaleCents,
    commission_base_cents: commissionBaseCents,
    commission_calculated_cents: commissionCalculatedCents,
    commission_final_cents: commissionFinalCents,
    is_commission_overridden: isCommissionOverridden,
    over_gross_cents: overGrossCents,
    over_deductions_cents: overDeductionsCents,
    over_deductions_resolved: overDeductionsResolved,
    over_net_calculated_cents: overNetCalculatedCents,
    over_net_final_cents: overNetFinalCents,
    is_over_overridden: isOverOverridden,
    agency_revenue_cents: agencyRevenueCents,
    internal_costs_cents: internalCostsCents,
    internal_costs_resolved: internalCostsResolved,
    net_result_cents: netResultCents,
    margin_on_sale_pct: marginOnSalePct,
    margin_on_revenue_pct: marginOnRevenuePct,
  };
}
