import { useState, useMemo } from "react";
import {
  Plus,
  Calculator,
  Archive,
  XCircle,
  Award,
  Copy,
  Settings2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import {
  calculateInlineSaleSpreadsheetRow,
  simulateTripCancellationAndCredit,
  DEFAULT_OPERATOR_OVER_RETENTION_CONFIGS,
  type AgentCommissionProfile,
  type InlineSaleSpreadsheetRowInput,
  type OperatorOverRetentionConfig,
} from "@/services/travel-pre-boarding-and-commissions.functions";

const DEFAULT_AGENT_PROFILES: AgentCommissionProfile[] = [
  {
    agentId: "agent-ana",
    agentName: "Ana Paula (Consultora Sênior)",
    goalEvaluationBasis: "gross_sale",
    commissionCalculationBasis: "net_sale_plus_over",
    baseCommissionPct: 1.0,
    defaultOverCommissionPct: 30,
    currentMonthAgencyRevenueCents: 8500000, // R$ 85.000,00 Bruto no mês -> Faixa 1 (Até R$ 99.999,99 = 1% s/ Líquido + 30% s/ Over Líquido)
    tiers: [
      {
        tierName: "Faixa 1 (Até R$ 99.999,99 Bruto)",
        minMonthlyRevenueCents: 0,
        maxMonthlyRevenueCents: 9999999,
        commissionPct: 1.0,
        overCommissionPct: 30,
        bonusFixedCents: 0,
      },
      {
        tierName: "Faixa 2 (R$ 100.000,00+ Bruto)",
        minMonthlyRevenueCents: 10000000,
        maxMonthlyRevenueCents: null,
        commissionPct: 1.5,
        overCommissionPct: 30,
        bonusFixedCents: 0,
      },
    ],
  },
  {
    agentId: "agent-lucas",
    agentName: "Lucas (Consultor Pleno)",
    goalEvaluationBasis: "gross_sale",
    commissionCalculationBasis: "net_sale_plus_over",
    baseCommissionPct: 1.0,
    defaultOverCommissionPct: 30,
    currentMonthAgencyRevenueCents: 11200000, // R$ 112.000,00 Bruto no mês -> Atingiu R$ 100k+ -> Recebe 1,5% s/ Líquido + 30% s/ Over Líquido
    tiers: [
      {
        tierName: "Faixa 1 (Até R$ 99.999,99 Bruto)",
        minMonthlyRevenueCents: 0,
        maxMonthlyRevenueCents: 9999999,
        commissionPct: 1.0,
        overCommissionPct: 30,
        bonusFixedCents: 0,
      },
      {
        tierName: "Faixa 2 (R$ 100.000,00+ Bruto)",
        minMonthlyRevenueCents: 10000000,
        maxMonthlyRevenueCents: null,
        commissionPct: 1.5,
        overCommissionPct: 30,
        bonusFixedCents: 0,
      },
    ],
  },
];

const INITIAL_INLINE_ROWS: InlineSaleSpreadsheetRowInput[] = [
  {
    id: "inline-row-1",
    saleDate: "2026-10-17",
    clientName: "Roberto Carlos Almeida & Esposa",
    passengersCount: 2,
    operatorName: "Orinter",
    operatorPackageCode: "ORT-88412",
    contractSigned: true,
    bookingStatus: "emitida",
    grossSaleCents: 2000000, // R$ 20.000,00 Bruto cobrados do cliente (conta R$ 20k para a Meta Bruta)
    operatorTablePriceCents: 1900000, // R$ 19.000,00 na tabela da operadora -> R$ 1.000,00 de Over Bruto
    taxesAndFeesCents: 100000, // R$ 1.000,00 taxas -> Valor Líquido Comissionável = R$ 18.000,00
    baseCommissionPct: 10,
    overRetentionFeePct: 16, // Retenção da Orinter quando financiado na operadora
    paid100PctViaOperator: true,
    overPaymentMethod: "operadora_financiado",
    agentId: "agent-ana",
    agentName: "Ana Paula (Consultora Sênior)",
    agentCommissionPctOverride: null,
    agentOverCommissionPctOverride: null,
    agentCommissionCentsOverride: null,
    deductCommissionOnCancel: false,
    managerCommissionClawbackCents: null,
  },
  {
    id: "inline-row-2",
    saleDate: "2026-10-16",
    clientName: "Luciana Martins & Família",
    passengersCount: 4,
    operatorName: "FRT Operadora",
    operatorPackageCode: "FRT-91024",
    contractSigned: true,
    bookingStatus: "confirmada",
    grossSaleCents: 3450000, // R$ 34.500,00 Bruto
    operatorTablePriceCents: 3200000, // R$ 32.000,00 Tabela -> R$ 2.500,00 Over Bruto
    taxesAndFeesCents: 200000, // R$ 2.000,00 Taxas -> Valor Líquido = R$ 30.000,00
    baseCommissionPct: 12,
    overRetentionFeePct: 15, // Taxa FRT (mas como foi pago via Pix Direto Agência abaixo, retenção efetiva = 0%)
    paid100PctViaOperator: false,
    overPaymentMethod: "pix_direto_agencia",
    agentId: "agent-lucas",
    agentName: "Lucas (Consultor Pleno)",
    agentCommissionPctOverride: null,
    agentOverCommissionPctOverride: null,
    agentCommissionCentsOverride: null,
    deductCommissionOnCancel: false,
    managerCommissionClawbackCents: null,
  },
];

export function InlineSalesSpreadsheetAndGoalsPanel() {
  const [rows, setRows] = useState<InlineSaleSpreadsheetRowInput[]>(INITIAL_INLINE_ROWS);
  const [agents, setAgents] = useState<AgentCommissionProfile[]>(DEFAULT_AGENT_PROFILES);
  const [operatorConfigs, setOperatorConfigs] = useState<OperatorOverRetentionConfig[]>(
    DEFAULT_OPERATOR_OVER_RETENTION_CONFIGS,
  );
  const [showArchived, setShowArchived] = useState(false);
  const [showOperatorSettings, setShowOperatorSettings] = useState(false);

  // Estado do Simulador de Cancelamento / Multa / Carta de Crédito / Financiamento Ativo
  const [cancelTargetRowId, setCancelTargetRowId] = useState<string | null>(null);
  const [alreadyPaidReais, setAlreadyPaidReais] = useState("4000");
  const [remainingFinancedReais, setRemainingFinancedReais] = useState("16000");
  const [supplierNonRefundableReais, setSupplierNonRefundableReais] = useState("6500");
  const [agencyContractFinePct, setAgencyContractFinePct] = useState("20");
  const [convertBalanceToCredit, setConvertBalanceToCredit] = useState(true);
  const [daysBeforeDeparture, setDaysBeforeDeparture] = useState("12");

  const calculatedRows = useMemo(() => {
    return rows
      .filter((r) => (showArchived ? true : r.bookingStatus !== "arquivada"))
      .map((r) => {
        const agent = agents.find((a) => a.agentId === r.agentId) || agents[0];
        return calculateInlineSaleSpreadsheetRow(r, agent);
      });
  }, [rows, agents, showArchived]);

  const updateRowField = <K extends keyof InlineSaleSpreadsheetRowInput>(
    id: string,
    field: K,
    value: InlineSaleSpreadsheetRowInput[K],
  ) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleOperatorChangeForRow = (rowId: string, newOperatorName: string) => {
    const matchedOp = operatorConfigs.find(
      (op) => op.operatorName.toLowerCase() === newOperatorName.toLowerCase(),
    );
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          operatorName: newOperatorName,
          overRetentionFeePct: matchedOp
            ? matchedOp.defaultRetentionPctWhenFinanced
            : r.overRetentionFeePct,
          baseCommissionPct: matchedOp ? matchedOp.baseAgencyCommissionPct : r.baseCommissionPct,
        };
      }),
    );
  };

  const handleAddInlineRow = () => {
    const defaultOp = operatorConfigs[0] || {
      operatorName: "Orinter",
      defaultRetentionPctWhenFinanced: 16,
      baseAgencyCommissionPct: 10,
    };
    const newRow: InlineSaleSpreadsheetRowInput = {
      id: `inline-row-${Date.now()}`,
      saleDate: new Date().toISOString().slice(0, 10),
      clientName: "Novo Passageiro / Família",
      passengersCount: 2,
      operatorName: defaultOp.operatorName,
      operatorPackageCode: `RES-${Math.floor(10000 + Math.random() * 89999)}`,
      contractSigned: true,
      bookingStatus: "confirmada",
      grossSaleCents: 2000000,
      operatorTablePriceCents: 1900000,
      taxesAndFeesCents: 100000,
      baseCommissionPct: defaultOp.baseAgencyCommissionPct,
      overRetentionFeePct: defaultOp.defaultRetentionPctWhenFinanced,
      paid100PctViaOperator: true,
      overPaymentMethod: "operadora_financiado",
      agentId: agents[0].agentId,
      agentName: agents[0].agentName,
      agentCommissionPctOverride: null,
      agentOverCommissionPctOverride: null,
      agentCommissionCentsOverride: null,
      deductCommissionOnCancel: false,
      managerCommissionClawbackCents: null,
    };
    setRows((prev) => [newRow, ...prev]);
    toast.success("Nova venda adicionada na planilha editável in-page!");
  };

  const activeCancelRow = useMemo(
    () => calculatedRows.find((r) => r.id === cancelTargetRowId) || null,
    [calculatedRows, cancelTargetRowId],
  );

  const cancelSimulation = useMemo(() => {
    if (!activeCancelRow) return null;
    return simulateTripCancellationAndCredit({
      clientName: activeCancelRow.clientName,
      operatorName: activeCancelRow.operatorName,
      locatorCode: activeCancelRow.operatorPackageCode,
      grossSaleCents: activeCancelRow.grossSaleCents,
      alreadyPaidByClientCents: Math.round((parseFloat(alreadyPaidReais) || 0) * 100),
      remainingFinancedBalanceCents: Math.round((parseFloat(remainingFinancedReais) || 0) * 100),
      supplierNonRefundableCents: Math.round((parseFloat(supplierNonRefundableReais) || 0) * 100),
      agencyContractFinePct: parseFloat(agencyContractFinePct) || 20,
      convertBalanceToOperatorCredit: convertBalanceToCredit,
      daysBeforeDeparture: parseInt(daysBeforeDeparture, 10) || 10,
    });
  }, [
    activeCancelRow,
    alreadyPaidReais,
    remainingFinancedReais,
    supplierNonRefundableReais,
    agencyContractFinePct,
    convertBalanceToCredit,
    daysBeforeDeparture,
  ]);

  return (
    <div className="space-y-6">
      {/* ── 1. PLANILHA EDITÁVEL IN-PAGE DE VENDAS, OVER DINÂMICO POR OPERADORA E COMISSÃO DO AGENTE ── */}
      <div className="p-5 rounded-lg border border-primary/30 bg-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs font-bold">
                100% Editável & Multi-Tenant por Agência
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Meta por Faturamento Bruto • Pago sobre o Valor Líquido (1% / 1,5%)
              </Badge>
              <Badge variant="outline" className="text-xs">
                Over com Comissão Própria (Padrão 30% Líq.) • Pix/Dinheiro = 0% Retenção
              </Badge>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Planilha Direta de Vendas, Over por Operadora, Metas Brutas e Comissões Líquidas
            </h2>
            <p className="text-xs text-muted-foreground">
              Todas as taxas e porcentagens são editáveis. As metas mensais somam o Faturamento Bruto Total, mas a comissão do vendedor incide sobre o Valor Líquido (ex.: até R$ 99.999,99 = 1% s/ Líquido; R$ 100.000,00+ = 1,5% s/ Líquido) + % própria sobre o Over Líquido (padrão 30%). Cancelamentos e multas não descontam comissão salvo edição manual do administrador.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowOperatorSettings((v) => !v)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
            >
              <Settings2 className="size-4 text-primary" />
              <span>
                {showOperatorSettings
                  ? "Ocultar Taxas por Operadora"
                  : "Configurar Retenção de Over por Operadora"}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowArchived((v) => !v)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
            >
              {showArchived ? "Ocultar Arquivadas" : "Mostrar Arquivadas"}
            </Button>
            <Button
              type="button"
              onClick={handleAddInlineRow}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Adicionar Linha na Planilha</span>
            </Button>
          </div>
        </div>

        {/* Painel Configurável de Taxas de Retenção de Over por Operadora */}
        {showOperatorSettings && (
          <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Tabela de Retenção de Over e Comissão Padrão por Operadora (Personalizável pela Agência)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure a retenção que cada operadora aplica quando o Over é financiado no boleto/cartão dela. Quando o Over é pago em Pix/Dinheiro direto para a agência, a retenção é automaticamente 0%.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setOperatorConfigs((prev) => [
                    ...prev,
                    {
                      operatorName: `Operadora ${prev.length + 1}`,
                      defaultRetentionPctWhenFinanced: 12,
                      baseAgencyCommissionPct: 10,
                    },
                  ])
                }
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Nova Operadora</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {operatorConfigs.map((op, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <Input
                      value={op.operatorName}
                      onChange={(e) =>
                        setOperatorConfigs((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, operatorName: e.target.value } : item,
                          ),
                        )
                      }
                      className="h-11 text-xs font-bold rounded-md px-2"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-muted-foreground">Retenção Over (%):</span>
                      <Input
                        type="number"
                        step="0.5"
                        value={op.defaultRetentionPctWhenFinanced}
                        onChange={(e) =>
                          setOperatorConfigs((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    defaultRetentionPctWhenFinanced:
                                      parseFloat(e.target.value) || 0,
                                  }
                                : item,
                            ),
                          )
                        }
                        className="h-11 w-20 text-xs font-mono text-right rounded-md px-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto table rounded-lg border border-border">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-bold text-muted-foreground">
                <th className="py-3 px-3">Data / Status</th>
                <th className="py-3 px-3">Cliente & Pax</th>
                <th className="py-3 px-3">Operadora / ID / Contrato</th>
                <th className="py-3 px-3 text-right">Venda Bruta (Meta)</th>
                <th className="py-3 px-3 text-right">Tabela Op. (R$)</th>
                <th className="py-3 px-3 text-right">Taxas → Valor Líquido</th>
                <th className="py-3 px-3 text-right">Comissão Base Ag.</th>
                <th className="py-3 px-3 text-right">Over (Pix 0% vs Op. %)</th>
                <th className="py-3 px-3 text-right">Receita Agência</th>
                <th className="py-3 px-3">Vendedor (% s/ Líq + % s/ Over Líq)</th>
                <th className="py-3 px-3 text-right">Lucro Agência</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {calculatedRows.map((row) => {
                const isDirectPix =
                  row.overPaymentMethod === "pix_direto_agencia" || !row.paid100PctViaOperator;
                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-muted/20 transition-colors ${
                      row.bookingStatus === "cancelada" ? "bg-destructive/5" : ""
                    }`}
                  >
                    {/* Data & Status */}
                    <td className="py-3 px-3 space-y-1">
                      <Input
                        type="date"
                        value={row.saleDate}
                        onChange={(e) => updateRowField(row.id, "saleDate", e.target.value)}
                        className="h-11 w-36 text-xs font-mono rounded-md px-2"
                      />
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={
                            row.bookingStatus === "cancelada"
                              ? "destructive"
                              : row.bookingStatus === "emitida"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs w-fit"
                        >
                          {row.bookingStatus.toUpperCase()}
                        </Badge>
                        {row.bookingStatus === "cancelada" && !row.deductCommissionOnCancel && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            Comissão mantida (Sem estorno)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cliente & Pax */}
                    <td className="py-3 px-3 space-y-1">
                      <Input
                        value={row.clientName}
                        onChange={(e) => updateRowField(row.id, "clientName", e.target.value)}
                        className="h-11 w-48 text-xs font-bold rounded-md px-2"
                      />
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span>Viajantes:</span>
                        <Input
                          type="number"
                          min={1}
                          value={row.passengersCount}
                          onChange={(e) =>
                            updateRowField(
                              row.id,
                              "passengersCount",
                              Math.max(1, parseInt(e.target.value, 10) || 1),
                            )
                          }
                          className="h-11 w-16 text-xs font-mono rounded-md px-2"
                        />
                      </div>
                    </td>

                    {/* Operadora, ID Pacote & Contrato Assinado */}
                    <td className="py-3 px-3 space-y-1">
                      <div className="flex items-center gap-1">
                        <input
                          list={`operators-list-${row.id}`}
                          value={row.operatorName}
                          onChange={(e) => handleOperatorChangeForRow(row.id, e.target.value)}
                          className="h-11 w-28 rounded-md border border-input bg-background px-2 text-xs font-semibold"
                        />
                        <datalist id={`operators-list-${row.id}`}>
                          {operatorConfigs.map((op) => (
                            <option key={op.operatorName} value={op.operatorName} />
                          ))}
                        </datalist>
                        <Input
                          value={row.operatorPackageCode}
                          onChange={(e) =>
                            updateRowField(row.id, "operatorPackageCode", e.target.value)
                          }
                          className="h-11 w-28 text-xs font-mono rounded-md px-2"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={row.contractSigned}
                          onChange={(e) =>
                            updateRowField(row.id, "contractSigned", e.target.checked)
                          }
                          className="size-4 rounded"
                        />
                        <span>Contrato Assinado</span>
                      </label>
                    </td>

                    {/* Venda Bruta Total (Base para Meta Bruta) */}
                    <td className="py-3 px-3 text-right">
                      <Input
                        type="number"
                        step="100"
                        value={(row.grossSaleCents / 100).toFixed(0)}
                        onChange={(e) =>
                          updateRowField(
                            row.id,
                            "grossSaleCents",
                            Math.round((parseFloat(e.target.value) || 0) * 100),
                          )
                        }
                        className="h-11 w-28 text-xs font-mono font-bold text-right rounded-md px-2 ml-auto"
                      />
                      <span className="block text-muted-foreground text-xs mt-1">
                        Soma p/ Meta Bruta
                      </span>
                    </td>

                    {/* Valor Tabela Operadora */}
                    <td className="py-3 px-3 text-right">
                      <Input
                        type="number"
                        step="100"
                        value={(row.operatorTablePriceCents / 100).toFixed(0)}
                        onChange={(e) =>
                          updateRowField(
                            row.id,
                            "operatorTablePriceCents",
                            Math.round((parseFloat(e.target.value) || 0) * 100),
                          )
                        }
                        className="h-11 w-28 text-xs font-mono text-right rounded-md px-2 ml-auto"
                      />
                    </td>

                    {/* Taxas Não Comissionáveis & Valor Líquido (Base de Pagamento da Comissão) */}
                    <td className="py-3 px-3 text-right">
                      <Input
                        type="number"
                        step="50"
                        value={(row.taxesAndFeesCents / 100).toFixed(0)}
                        onChange={(e) =>
                          updateRowField(
                            row.id,
                            "taxesAndFeesCents",
                            Math.round((parseFloat(e.target.value) || 0) * 100),
                          )
                        }
                        className="h-11 w-24 text-xs font-mono text-right rounded-md px-2 ml-auto"
                      />
                      <strong className="block text-primary font-mono mt-1">
                        Valor Líq: {formatMoney(row.netCommissionableBaseCents)}
                      </strong>
                    </td>

                    {/* Comissão Base da Agência junto à Operadora (% e R$) */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          step="0.5"
                          value={row.baseCommissionPct}
                          onChange={(e) =>
                            updateRowField(
                              row.id,
                              "baseCommissionPct",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-11 w-16 text-xs font-mono text-right rounded-md px-2"
                        />
                        <span>%</span>
                      </div>
                      <strong className="block font-mono text-foreground mt-1">
                        {formatMoney(row.baseCommissionGrossCents)}
                      </strong>
                    </td>

                    {/* Over Bruto, Forma de Pagamento (Pix Direto 0% vs Operadora Financiado %) e Over Líquido */}
                    <td className="py-3 px-3 text-right font-mono space-y-1">
                      <div className="text-muted-foreground">
                        Over Bruto:{" "}
                        <strong className="text-foreground">
                          {formatMoney(row.overGrossCents)}
                        </strong>
                      </div>

                      <select
                        value={isDirectPix ? "pix_direto_agencia" : "operadora_financiado"}
                        onChange={(e) => {
                          const mode = e.target.value as
                            | "pix_direto_agencia"
                            | "operadora_financiado";
                          updateRowField(row.id, "overPaymentMethod", mode);
                          updateRowField(
                            row.id,
                            "paid100PctViaOperator",
                            mode === "operadora_financiado",
                          );
                        }}
                        className="h-11 w-48 rounded-md border border-input bg-background px-2 text-xs font-sans font-semibold ml-auto block"
                      >
                        <option value="operadora_financiado">
                          Over na Operadora (Retém %)
                        </option>
                        <option value="pix_direto_agencia">
                          Over Pix / Dinheiro (0% Retenção)
                        </option>
                      </select>

                      {!isDirectPix ? (
                        <div className="flex items-center justify-end gap-1 pt-1">
                          <span className="text-muted-foreground">Ret. Op:</span>
                          <Input
                            type="number"
                            step="0.5"
                            value={row.overRetentionFeePct}
                            onChange={(e) =>
                              updateRowField(
                                row.id,
                                "overRetentionFeePct",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="h-11 w-16 text-xs font-mono text-right rounded-md px-2"
                          />
                          <span>% (-{formatMoney(row.overRetentionDeductionCents)})</span>
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          Isento de retenção (0%)
                        </div>
                      )}

                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        Over Líq: {formatMoney(row.overNetCents)}
                      </div>
                    </td>

                    {/* Receita Total Líquida da Agência */}
                    <td className="py-3 px-3 text-right font-mono">
                      <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-black text-sm inline-block">
                        {formatMoney(row.totalAgencyNetCommissionCents)}
                      </span>
                    </td>

                    {/* Vendedor: % sobre Valor Líquido (ex: 1% ou 1.5%) + % sobre Over Líquido (ex: 30%) + Override R$ */}
                    <td className="py-3 px-3 space-y-2">
                      <select
                        value={row.agentId}
                        onChange={(e) => {
                          const ag = agents.find((a) => a.agentId === e.target.value);
                          if (ag) {
                            updateRowField(row.id, "agentId", ag.agentId);
                            updateRowField(row.id, "agentName", ag.agentName);
                          }
                        }}
                        className="h-11 w-52 rounded-md border border-input bg-background px-2 text-xs font-semibold"
                      >
                        {agents.map((ag) => (
                          <option key={ag.agentId} value={ag.agentId}>
                            {ag.agentName}
                          </option>
                        ))}
                      </select>

                      <Badge variant="outline" className="text-xs block w-fit">
                        {row.appliedAgentTierName}
                      </Badge>

                      {/* Linha 1: % sobre o Valor Líquido (1% ou 1.5%) */}
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground w-20">% s/ Líquido:</span>
                        <Input
                          type="number"
                          step="0.1"
                          value={row.effectiveAgentCommissionPct}
                          onChange={(e) =>
                            updateRowField(
                              row.id,
                              "agentCommissionPctOverride",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-11 w-20 text-xs font-mono text-right rounded-md px-2"
                        />
                        <span className="font-mono">
                          % = {formatMoney(row.agentBaseCommissionCents)}
                        </span>
                      </div>

                      {/* Linha 2: % própria sobre o Over Líquido (Padrão 30%) */}
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground w-20">% s/ Over Líq:</span>
                        <Input
                          type="number"
                          step="1"
                          value={row.effectiveAgentOverCommissionPct}
                          onChange={(e) =>
                            updateRowField(
                              row.id,
                              "agentOverCommissionPctOverride",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-11 w-20 text-xs font-mono text-right rounded-md px-2"
                        />
                        <span className="font-mono">
                          % = {formatMoney(row.agentOverCommissionCents)}
                        </span>
                      </div>

                      <div className="pt-1 border-t border-border/50 flex items-center justify-between font-mono font-bold text-primary">
                        <span>Total Vendedor:</span>
                        <span>{formatMoney(row.agentCommissionTotalCents)}</span>
                      </div>
                    </td>

                    {/* Lucro Líquido da Agência (após Vendedor) */}
                    <td className="py-3 px-3 text-right font-mono">
                      <strong className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                        {formatMoney(row.agencyNetProfitAfterAgentCents)}
                      </strong>
                    </td>

                    {/* Ações Inline (Cancelar/Multa/Carta de Crédito e Arquivar) */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex flex-col gap-1 items-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setCancelTargetRowId(row.id)}
                          className="h-11 min-h-11 px-3 rounded-md text-xs font-semibold gap-1 cursor-pointer"
                        >
                          <Calculator className="size-3.5 text-amber-600" />
                          <span>Multa / Crédito / Cancelar</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            updateRowField(row.id, "bookingStatus", "arquivada");
                            toast.success("Venda arquivada na planilha.");
                          }}
                          className="h-11 min-h-11 px-3 rounded-md text-xs text-muted-foreground cursor-pointer"
                        >
                          <Archive className="size-3.5 mr-1" />
                          <span>Arquivar</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2. SIMULADOR DE CANCELAMENTO, MULTA CONTRATUAL, CARTA DE CRÉDITO & PROTEÇÃO DE COMISSÃO ── */}
      {activeCancelRow && cancelSimulation && (
        <div className="p-5 rounded-lg border border-amber-500/40 bg-amber-500/5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge variant="secondary" className="text-xs font-bold">
                Apuração Contratual de Cancelamento, Carta de Crédito & Financiamento
              </Badge>
              <h3 className="text-base font-bold text-foreground mt-1">
                Reserva #{activeCancelRow.operatorPackageCode} — {activeCancelRow.clientName} ({activeCancelRow.operatorName})
              </h3>
              <p className="text-xs text-muted-foreground">
                Por padrão, multas e cancelamentos não descontam a comissão nem a venda do consultor, a menos que o administrador marque a opção de desconto manual abaixo.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelTargetRowId(null)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Fechar Simulador
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Valor Já Pago à Vista/Entrada (R$)</Label>
              <Input
                type="number"
                value={alreadyPaidReais}
                onChange={(e) => setAlreadyPaidReais(e.target.value)}
                className="h-11 text-xs font-mono rounded-lg bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Saldo Financiado em Boletos (R$)</Label>
              <Input
                type="number"
                value={remainingFinancedReais}
                onChange={(e) => setRemainingFinancedReais(e.target.value)}
                className="h-11 text-xs font-mono rounded-lg bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tarifa Não-Reembolsável Cia/Hotel (R$)</Label>
              <Input
                type="number"
                value={supplierNonRefundableReais}
                onChange={(e) => setSupplierNonRefundableReais(e.target.value)}
                className="h-11 text-xs font-mono rounded-lg bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Multa Contratual Agência (%)</Label>
              <Input
                type="number"
                value={agencyContractFinePct}
                onChange={(e) => setAgencyContractFinePct(e.target.value)}
                className="h-11 text-xs font-mono rounded-lg bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Dias Antes do Embarque</Label>
              <Input
                type="number"
                value={daysBeforeDeparture}
                onChange={(e) => setDaysBeforeDeparture(e.target.value)}
                className="h-11 text-xs font-mono rounded-lg bg-background"
              />
            </div>
          </div>

          {/* Controle Explícito do Administrador: Descontar ou Manter Comissão do Vendedor */}
          <div className="p-4 rounded-lg bg-card border border-border flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(activeCancelRow.deductCommissionOnCancel)}
                onChange={(e) =>
                  updateRowField(
                    activeCancelRow.id,
                    "deductCommissionOnCancel",
                    e.target.checked,
                  )
                }
                className="size-4 rounded"
              />
              <span>
                Descontar / Estornar Comissão do Consultor neste Cancelamento (Exclusivo Administrador)
              </span>
            </label>

            {activeCancelRow.deductCommissionOnCancel ? (
              <div className="flex items-center gap-2 text-xs">
                <span>Valor a descontar da comissão (R$):</span>
                <Input
                  type="number"
                  step="10"
                  placeholder="Total ou parcial"
                  value={
                    activeCancelRow.managerCommissionClawbackCents != null
                      ? (activeCancelRow.managerCommissionClawbackCents / 100).toFixed(2)
                      : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    updateRowField(
                      activeCancelRow.id,
                      "managerCommissionClawbackCents",
                      raw === "" ? null : Math.round((parseFloat(raw) || 0) * 100),
                    );
                  }}
                  className="h-11 w-32 text-xs font-mono rounded-md px-2"
                />
              </div>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Regra Padrão Ativa: Cancelamento/Multa NÃO afeta a comissão do consultor ({formatMoney(activeCancelRow.agentCommissionTotalCents)})
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-card border border-border">
              <span className="text-xs text-muted-foreground block">Total Retenções + Multas</span>
              <strong className="text-base font-black text-destructive font-mono">
                {formatMoney(cancelSimulation.totalPenaltiesAndRetentionsCents)}
              </strong>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <span className="text-xs text-muted-foreground block">Carta de Crédito na Operadora</span>
              <strong className="text-base font-black text-primary font-mono">
                {formatMoney(cancelSimulation.operatorCreditLetterCents)}
              </strong>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <span className="text-xs text-muted-foreground block">Reembolso em Espécie</span>
              <strong className="text-base font-black text-foreground font-mono">
                {formatMoney(cancelSimulation.netCashRefundToClientCents)}
              </strong>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <span className="text-xs text-muted-foreground block">Status do Financiamento</span>
              <strong className="text-xs font-bold text-amber-600 dark:text-amber-400 block mt-1">
                {cancelSimulation.clientMustKeepPayingFinancing
                  ? "OBRIGAÇÃO ATIVA: Cliente continua pagando o financiamento"
                  : "Quitado / Conciliado"}
              </strong>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border space-y-3">
            <pre className="text-xs font-mono whitespace-pre-wrap text-foreground leading-relaxed">
              {cancelSimulation.formalStatementPt}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(cancelSimulation.formalStatementPt);
                  toast.success("Extrato formal de cancelamento/crédito copiado!");
                }}
                className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
              >
                <Copy className="size-4" />
                <span>Copiar Extrato para Enviar ao Cliente</span>
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  updateRowField(activeCancelRow.id, "bookingStatus", "cancelada");
                  toast.success(
                    activeCancelRow.deductCommissionOnCancel
                      ? "Venda marcada como Cancelada com desconto manual aplicado na comissão."
                      : "Venda marcada como Cancelada (comissão do consultor preservada integralmente)!",
                  );
                }}
                className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer"
              >
                <XCircle className="size-4" />
                <span>Confirmar Cancelamento / Emitir Carta de Crédito</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. CONFIGURADOR EDITÁVEL DE FAIXAS DE META POR AGENTE (META NO BRUTO -> PAGA NO LÍQUIDO + % OVER) ── */}
      <div className="p-5 rounded-lg border border-border bg-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Award className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Metas Escalonadas Personalizáveis por Consultor (Meta por Faturamento Bruto → Paga sobre o Valor Líquido + % Over Líquido)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Edite livremente os limites de cada faixa (ex.: até R$ 99.999,99 Bruto = 1% sobre o Líquido; R$ 100.000,00+ Bruto = 1,5% sobre o Líquido) e o percentual do Over Líquido (padrão 30%).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agents.map((ag, agIdx) => (
            <div key={ag.agentId} className="p-4 rounded-lg border border-border bg-muted/15 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{ag.agentName}</h4>
                  <p className="text-xs text-muted-foreground">
                    Faturamento Bruto Acumulado no Mês (Base da Meta):{" "}
                    <strong className="text-primary font-mono">
                      {formatMoney(ag.currentMonthAgencyRevenueCents)}
                    </strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Faturamento Bruto Mês (R$):</Label>
                  <Input
                    type="number"
                    step="5000"
                    value={(ag.currentMonthAgencyRevenueCents / 100).toFixed(0)}
                    onChange={(e) => {
                      const valCents = Math.round((parseFloat(e.target.value) || 0) * 100);
                      setAgents((prev) =>
                        prev.map((item, idx) =>
                          idx === agIdx
                            ? { ...item, currentMonthAgencyRevenueCents: valCents }
                            : item,
                        ),
                      );
                    }}
                    className="h-11 w-32 text-xs font-mono rounded-md px-2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {ag.tiers.map((tier, tIdx) => {
                  const isCurrent =
                    ag.currentMonthAgencyRevenueCents >= tier.minMonthlyRevenueCents &&
                    (tier.maxMonthlyRevenueCents == null ||
                      ag.currentMonthAgencyRevenueCents <= tier.maxMonthlyRevenueCents);
                  return (
                    <div
                      key={tIdx}
                      className={`p-3 rounded-lg border space-y-2 text-xs ${
                        isCurrent
                          ? "border-primary bg-primary/10"
                          : "border-border/60 bg-card"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Input
                          value={tier.tierName}
                          onChange={(e) =>
                            setAgents((prev) =>
                              prev.map((item, idx) =>
                                idx === agIdx
                                  ? {
                                      ...item,
                                      tiers: item.tiers.map((t, i) =>
                                        i === tIdx ? { ...t, tierName: e.target.value } : t,
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                          className="h-11 flex-1 min-w-44 text-xs font-bold rounded-md px-2 bg-background"
                        />
                        {isCurrent && (
                          <Badge variant="secondary" className="text-xs font-bold">
                            Faixa Ativa no Mês
                          </Badge>
                        )}
                        {ag.tiers.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              setAgents((prev) =>
                                prev.map((item, idx) =>
                                  idx === agIdx
                                    ? {
                                        ...item,
                                        tiers: item.tiers.filter((_, i) => i !== tIdx),
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="size-11 min-h-11 min-w-11 p-0 text-destructive cursor-pointer"
                            title="Remover faixa"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">De Bruto (R$)</Label>
                          <Input
                            type="number"
                            step="1000"
                            value={(tier.minMonthlyRevenueCents / 100).toFixed(0)}
                            onChange={(e) => {
                              const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                              setAgents((prev) =>
                                prev.map((item, idx) =>
                                  idx === agIdx
                                    ? {
                                        ...item,
                                        tiers: item.tiers.map((t, i) =>
                                          i === tIdx ? { ...t, minMonthlyRevenueCents: cents } : t,
                                        ),
                                      }
                                    : item,
                                ),
                              );
                            }}
                            className="h-11 text-xs font-mono rounded-md px-2 bg-background"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Até Bruto (R$)</Label>
                          <Input
                            type="number"
                            step="1000"
                            placeholder="Sem teto"
                            value={
                              tier.maxMonthlyRevenueCents != null
                                ? (tier.maxMonthlyRevenueCents / 100).toFixed(2)
                                : ""
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              const cents =
                                raw === "" ? null : Math.round((parseFloat(raw) || 0) * 100);
                              setAgents((prev) =>
                                prev.map((item, idx) =>
                                  idx === agIdx
                                    ? {
                                        ...item,
                                        tiers: item.tiers.map((t, i) =>
                                          i === tIdx ? { ...t, maxMonthlyRevenueCents: cents } : t,
                                        ),
                                      }
                                    : item,
                                ),
                              );
                            }}
                            className="h-11 text-xs font-mono rounded-md px-2 bg-background"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">% s/ Líquido</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={tier.commissionPct}
                            onChange={(e) => {
                              const pct = parseFloat(e.target.value) || 0;
                              setAgents((prev) =>
                                prev.map((item, idx) =>
                                  idx === agIdx
                                    ? {
                                        ...item,
                                        tiers: item.tiers.map((t, i) =>
                                          i === tIdx ? { ...t, commissionPct: pct } : t,
                                        ),
                                      }
                                    : item,
                                ),
                              );
                            }}
                            className="h-11 text-xs font-mono font-bold rounded-md px-2 bg-background"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">% s/ Over Líq.</Label>
                          <Input
                            type="number"
                            step="1"
                            value={tier.overCommissionPct ?? 30}
                            onChange={(e) => {
                              const overPct = parseFloat(e.target.value) || 0;
                              setAgents((prev) =>
                                prev.map((item, idx) =>
                                  idx === agIdx
                                    ? {
                                        ...item,
                                        tiers: item.tiers.map((t, i) =>
                                          i === tIdx ? { ...t, overCommissionPct: overPct } : t,
                                        ),
                                      }
                                    : item,
                                ),
                              );
                            }}
                            className="h-11 text-xs font-mono font-bold rounded-md px-2 bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setAgents((prev) =>
                      prev.map((item, idx) =>
                        idx === agIdx
                          ? {
                              ...item,
                              tiers: [
                                ...item.tiers,
                                {
                                  tierName: `Nova Faixa (${item.tiers.length + 1})`,
                                  minMonthlyRevenueCents: 15000000,
                                  maxMonthlyRevenueCents: null,
                                  commissionPct: 2.0,
                                  overCommissionPct: 35,
                                  bonusFixedCents: 0,
                                },
                              ],
                            }
                          : item,
                      ),
                    )
                  }
                  className="h-11 min-h-11 w-full rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Adicionar Nova Faixa de Meta para {ag.agentName}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
