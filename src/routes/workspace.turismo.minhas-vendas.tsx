import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  DollarSign,
  Loader2,
  Receipt,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAgencySalesAnalyticsDashboardFn,
  getMySalesAndCommissionsSummaryFn,
} from "@/services/travel-commissions-unified.functions";
import { createOffPayrollAwardReceiptFn } from "@/services/travel-commission-payouts.functions";
import {
  CommissionAwardReceiptModal,
  type OffPayrollReceiptRecord,
} from "@/components/tourism/CommissionAwardReceiptModal";

export const Route = createFileRoute("/workspace/turismo/minhas-vendas")({
  loader: async () => {
    const personal = await getMySalesAndCommissionsSummaryFn({ data: {} });
    let agency = null;
    if (personal.canInspectAnyAgent) {
      agency = await getAgencySalesAnalyticsDashboardFn({
        data: { competenceMonth: personal.competenceMonth },
      }).catch(() => null);
    }
    return { initialPersonal: personal, initialAgency: agency };
  },
  component: MySalesAndAgencyDashboardPage,
  errorComponent: MySalesErrorState,
});

function MySalesErrorState({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <div className="p-6 space-y-4" role="alert">
      <p className="text-sm text-destructive">
        Não foi possível carregar suas vendas e premiações comerciais.
      </p>
      <Button
        type="button"
        variant="outline"
        className="h-11 min-h-11 focus-visible:ring-2"
        onClick={() => {
          void router.invalidate().then(reset).catch(() => toast.error("Falha ao recarregar."));
        }}
      >
        Tentar Novamente
      </Button>
    </div>
  );
}

function formatMoney(cents?: number | null) {
  return ((cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function MySalesAndAgencyDashboardPage() {
  const { initialPersonal, initialAgency } = Route.useLoaderData();

  const [competenceMonth, setCompetenceMonth] = useState(
    initialPersonal?.competenceMonth ||
      `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`,
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [personal, setPersonal] = useState(initialPersonal);
  const [agency, setAgency] = useState(initialAgency);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(
    initialPersonal?.canInspectAnyAgent ? "agencia" : "consultor",
  );
  const [activeReceipt, setActiveReceipt] = useState<OffPayrollReceiptRecord | null>(null);
  const [issuingForAgent, setIssuingForAgent] = useState<string | null>(null);

  const reloadData = useCallback(
    async (month = competenceMonth, agentId = selectedAgentId) => {
      setLoading(true);
      try {
        const nextPersonal = await getMySalesAndCommissionsSummaryFn({
          data: {
            competenceMonth: month,
            ...(agentId ? { agentProfileId: agentId } : {}),
          },
        });
        setPersonal(nextPersonal);
        if (nextPersonal.canInspectAnyAgent) {
          const nextAgency = await getAgencySalesAnalyticsDashboardFn({
            data: { competenceMonth: month },
          }).catch(() => null);
          setAgency(nextAgency);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar vendas.");
      } finally {
        setLoading(false);
      }
    },
    [competenceMonth, selectedAgentId],
  );

  useEffect(() => {
    setPersonal(initialPersonal);
    setAgency(initialAgency);
  }, [initialPersonal, initialAgency]);

  const handlePayAgentOffPayroll = async (agentRow: any) => {
    if (!agentRow?.unpaidEligibleSheetIds?.length) return;
    setIssuingForAgent(agentRow.profileId || agentRow.agentName);
    try {
      const res = await createOffPayrollAwardReceiptFn({
        data: {
          beneficiaryProfileId: agentRow.profileId || null,
          beneficiaryEmployeeId: agentRow.employeeId || null,
          beneficiaryName: agentRow.agentName,
          competenceMonth,
          sheetIds: agentRow.unpaidEligibleSheetIds,
          payoutNature: "premiacao_variavel_por_fora",
          payoutChannel: "off_payroll_award",
          paymentMethod: "pix",
          markPaidImmediately: true,
        },
      });
      toast.success(`Recibo ${res.receipt.receipt_code} emitido fora da folha CLT.`);
      await reloadData(competenceMonth, selectedAgentId);
      setActiveReceipt(res.receipt);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao emitir recibo por fora.");
    } finally {
      setIssuingForAgent(null);
    }
  };

  const summary = personal?.summary;
  const tier = summary?.tier;
  const grossGrowth = summary?.grossGrowth;

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full motion-reduce:transition-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-2 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              Premiação Por Fora da Folha CLT
            </Badge>
            {personal?.canInspectAnyAgent ? (
              <Badge variant="secondary">Visão Gerencial & Por Agente</Badge>
            ) : (
              <Badge variant="secondary">Minha Produção Individual</Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {personal?.canInspectAnyAgent
              ? "Vendas da Agência & Desempenho por Agente"
              : "Minhas Vendas & Recibos de Premiação"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acompanhe produção mensal, crescimento comparativo, faixa de premiação e recibos automáticos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="month"
            aria-label="Competência mensal"
            className="h-11 w-40"
            value={competenceMonth}
            onChange={(e) => {
              const nextMonth = e.target.value;
              setCompetenceMonth(nextMonth);
              void reloadData(nextMonth, selectedAgentId);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            className="h-11 min-h-11 focus-visible:ring-2"
            onClick={() => reloadData(competenceMonth, selectedAgentId)}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="h-auto p-1 gap-1 justify-start overflow-x-auto carousel w-full">
          {personal?.canInspectAnyAgent && (
            <TabsTrigger value="agencia" className="h-11 px-4 text-xs font-semibold">
              <Users className="w-4 h-4 mr-2" />
              Vendas da Agência (Geral & Agente por Agente)
            </TabsTrigger>
          )}
          <TabsTrigger value="consultor" className="h-11 px-4 text-xs font-semibold">
            <Award className="w-4 h-4 mr-2" />
            {selectedAgentId ? `Consultor: ${personal.agent.name}` : "Minhas Vendas & Faixa"}
          </TabsTrigger>
          <TabsTrigger value="recibos" className="h-11 px-4 text-xs font-semibold">
            <Receipt className="w-4 h-4 mr-2" />
            Recibos Por Fora ({(personal?.receipts || []).length})
          </TabsTrigger>
        </TabsList>

        {personal?.canInspectAnyAgent && agency && (
          <TabsContent value="agencia" className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Vendas da Agência ({competenceMonth})</CardDescription>
                  <CardTitle className="text-xl tabular-nums">
                    {formatMoney(agency.totals.grossSalesCents)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground flex items-center justify-between">
                  <span>{agency.totals.salesCount} reserva(s)</span>
                  <span
                    className={
                      agency.totals.growth.growthPct >= 0
                        ? "text-emerald-700 dark:text-emerald-300 font-semibold"
                        : "text-destructive font-semibold"
                    }
                  >
                    {agency.totals.growth.growthPct >= 0 ? "+" : ""}
                    {agency.totals.growth.growthPct.toFixed(1)}% vs ant.
                  </span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Receita da Agência (Comissão + Over)</CardDescription>
                  <CardTitle className="text-xl tabular-nums text-primary">
                    {formatMoney(agency.totals.agencyRevenueCents)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  Lucro Pós-Variável: {formatMoney(agency.totals.agencyProfitCents)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Premiações Liberadas p/ Pagar</CardDescription>
                  <CardTitle className="text-xl tabular-nums text-blue-700 dark:text-blue-300">
                    {formatMoney(agency.totals.awardsEligibleCents)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  Aguardando baixa op.: {formatMoney(agency.totals.awardsPendingCents)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Já Pago Por Fora no Mês</CardDescription>
                  <CardTitle className="text-xl tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatMoney(agency.totals.awardsPaidCents)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  {agency.receipts.length} recibo(s) emitido(s)
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Desempenho Agente por Agente
                </CardTitle>
                <CardDescription>
                  Clique em "Inspecionar" para detalhar vendas ou em "Pagar Por Fora" para emitir recibo automático.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 overflow-x-auto table">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Agente / Regime</th>
                      <th className="text-left px-3 py-2 font-medium">Faixa Atual</th>
                      <th className="text-right px-3 py-2 font-medium">Vendas Brutas</th>
                      <th className="text-right px-3 py-2 font-medium">Cresc. MoM</th>
                      <th className="text-right px-3 py-2 font-medium">Receita Agência</th>
                      <th className="text-right px-3 py-2 font-medium">Liberado Por Fora</th>
                      <th className="text-right px-3 py-2 font-medium">Pago Por Fora</th>
                      <th className="text-right px-3 py-2 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {agency.agentsBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-xs text-muted-foreground">
                          Nenhum agente ativo ou venda encontrada para esta competência.
                        </td>
                      </tr>
                    ) : (
                      agency.agentsBreakdown.map((ag: any) => (
                        <tr key={ag.profileId || ag.agentName}>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-foreground">{ag.agentName}</div>
                            <div className="text-xs text-muted-foreground">
                              {ag.salesCount} venda(s) • {ag.employmentType.toUpperCase()}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant="outline">{ag.activeTierName}</Badge>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums font-medium">
                            {formatMoney(ag.grossSalesCents)}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-xs">
                            <span
                              className={
                                ag.prevMonthGrowthPct >= 0
                                  ? "text-emerald-700 dark:text-emerald-300 font-semibold"
                                  : "text-destructive font-semibold"
                              }
                            >
                              {ag.prevMonthGrowthPct >= 0 ? "+" : ""}
                              {ag.prevMonthGrowthPct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {formatMoney(ag.agencyRevenueCents)}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums font-semibold text-blue-700 dark:text-blue-300">
                            {formatMoney(ag.awardEligibleCents)}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-300">
                            {formatMoney(ag.awardPaidCents)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {ag.profileId && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-11 min-h-11 focus-visible:ring-2"
                                  onClick={() => {
                                    setSelectedAgentId(ag.profileId);
                                    setActiveTab("consultor");
                                    void reloadData(competenceMonth, ag.profileId);
                                  }}
                                >
                                  Inspecionar
                                </Button>
                              )}
                              {ag.unpaidEligibleSheetIds.length > 0 && (
                                <Button
                                  type="button"
                                  variant="default"
                                  disabled={issuingForAgent === (ag.profileId || ag.agentName)}
                                  className="h-11 min-h-11 focus-visible:ring-2"
                                  onClick={() => handlePayAgentOffPayroll(ag)}
                                >
                                  <Receipt className="w-4 h-4 mr-2" />
                                  Pagar Por Fora
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="consultor" className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Minhas Vendas Brutas</CardDescription>
                <CardTitle className="text-xl tabular-nums flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  {formatMoney(summary?.totalGrossCents)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground flex items-center justify-between">
                <span>{summary?.salesCount || 0} reserva(s)</span>
                {grossGrowth && (
                  <span
                    className={
                      grossGrowth.growthPct >= 0
                        ? "text-emerald-700 dark:text-emerald-300 font-semibold"
                        : "text-destructive font-semibold"
                    }
                  >
                    <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                    {grossGrowth.growthPct >= 0 ? "+" : ""}
                    {grossGrowth.growthPct.toFixed(1)}% MoM
                  </span>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Premiação Total Apurada</CardDescription>
                <CardTitle className="text-xl tabular-nums">
                  {formatMoney(summary?.totalAwardCents)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground">
                Faixa ativa: <strong className="text-foreground">{tier?.tierName || "Base"}</strong>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Liberado para Receber</CardDescription>
                <CardTitle className="text-xl tabular-nums text-blue-700 dark:text-blue-300">
                  {formatMoney(
                    (summary?.eligibleAwardCents || 0) + (summary?.approvedAwardCents || 0),
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground">
                Aguardando operadora: {formatMoney(summary?.pendingAwardCents)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Já Recebido Por Fora</CardDescription>
                <CardTitle className="text-xl tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatMoney(summary?.paidAwardCents)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground">
                {tier
                  ? `${tier.basePct}% Base Líq. + ${tier.overPct}% Over Líq.`
                  : "Regra da agência"}
              </CardContent>
            </Card>
          </div>

          {tier?.nextTier && (
            <Card>
              <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  Meta progressiva: faltam{" "}
                  <strong className="text-primary">
                    {formatMoney(tier.remainingToNextTierCents)}
                  </strong>{" "}
                  em vendas brutas para desbloquear{" "}
                  <strong>{tier.nextTier.tierName}</strong>
                </span>
                <Badge variant="outline">
                  {tier.nextTier.baseCommissionPct}% Base + {tier.nextTier.overCommissionPct}% Over
                </Badge>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Vendas da Competência</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 overflow-x-auto table">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Data / Código</th>
                    <th className="text-left px-3 py-2 font-medium">Cliente / Destino</th>
                    <th className="text-left px-3 py-2 font-medium">Operadora / Loc</th>
                    <th className="text-right px-3 py-2 font-medium">Bruto</th>
                    <th className="text-right px-3 py-2 font-medium">Base Líq.</th>
                    <th className="text-right px-3 py-2 font-medium">Sua Premiação</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(personal?.sales || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-xs text-muted-foreground">
                        Nenhuma venda registrada nesta competência para este consultor.
                      </td>
                    </tr>
                  ) : (
                    personal.sales.map((sale: any) => (
                      <tr key={sale.id}>
                        <td className="px-3 py-2 text-xs">
                          <div>{sale.saleDate ? new Date(sale.saleDate).toLocaleDateString("pt-BR") : "-"}</div>
                          <div className="font-mono text-muted-foreground">{sale.internalCode}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">{sale.clientName}</div>
                          <div className="text-xs text-muted-foreground">{sale.destination}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <div>{sale.primaryOperator}</div>
                          {sale.locatorCode && (
                            <div className="font-mono text-muted-foreground">{sale.locatorCode}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(sale.grossSaleCents)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {formatMoney(sale.netBaseCents)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                          <div>{formatMoney(sale.agentCommissionTotalCents)}</div>
                          <div className="text-2xs text-muted-foreground">
                            {sale.agentBaseCommissionPct}% / {sale.agentOverCommissionPct}%
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={sale.agentCommissionStatus === "paid" ? "secondary" : "outline"}
                          >
                            {sale.agentCommissionStatus === "paid"
                              ? "Pago Por Fora"
                              : sale.agentCommissionStatus === "eligible"
                                ? "Liberado"
                                : "Aguardando"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recibos" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Recibos Automáticos de Premiação Por Fora
              </CardTitle>
              <CardDescription>
                Comprovantes individuais separados do holerite CLT. Consultores podem imprimir ou registrar ciência digital do recebimento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(personal?.receipts || []).length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhum recibo de premiação emitido até o momento.
                </div>
              ) : (
                personal.receipts.map((rec: any) => (
                  <div
                    key={rec.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {rec.receipt_code}
                        </span>
                        <Badge variant="outline">{rec.competence_month}</Badge>
                        {rec.acknowledged_at && (
                          <Badge
                            variant="secondary"
                            className="text-emerald-700 dark:text-emerald-300 gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ciente Assinado
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {rec.sales_count} reserva(s) • Emitido em{" "}
                        {new Date(rec.issued_at).toLocaleDateString("pt-BR")} • Líquido{" "}
                        <strong className="text-foreground">{formatMoney(rec.net_paid_cents)}</strong>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 min-h-11 focus-visible:ring-2"
                      onClick={() => setActiveReceipt(rec)}
                    >
                      Abrir / Imprimir Recibo
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CommissionAwardReceiptModal
        receipt={activeReceipt}
        open={Boolean(activeReceipt)}
        onOpenChange={(open) => !open && setActiveReceipt(null)}
        canMarkPaid={Boolean(personal?.canInspectAnyAgent)}
        canAcknowledge
        onUpdated={() => reloadData(competenceMonth, selectedAgentId)}
      />
    </div>
  );
}
