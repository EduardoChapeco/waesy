import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Award,
  Loader2,
  Receipt,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { getEmployeeCommercialPerformanceFn } from "@/services/travel-commissions-unified.functions";
import { createOffPayrollAwardReceiptFn } from "@/services/travel-commission-payouts.functions";
import {
  CommissionAwardReceiptModal,
  type OffPayrollReceiptRecord,
} from "./CommissionAwardReceiptModal";

function formatMoney(cents?: number | null) {
  return ((cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

interface EmployeeCommercialProfilePanelProps {
  employeeId?: string;
  profileId?: string;
  competenceMonth?: string;
  canManagePayouts?: boolean;
}

export function EmployeeCommercialProfilePanel({
  employeeId,
  profileId,
  competenceMonth: initialMonth,
  canManagePayouts = false,
}: EmployeeCommercialProfilePanelProps) {
  const defaultMonth =
    initialMonth ||
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const [competenceMonth, setCompetenceMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getEmployeeCommercialPerformanceFn>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<"pix" | "transfer" | "cash" | "other">("pix");
  const [payoutNature, setPayoutNature] = useState<
    "premiacao_variavel_por_fora" | "bonus_meta" | "repasse_pj_autonomo" | "comissao_sobre_recebimento"
  >("premiacao_variavel_por_fora");
  const [pixKey, setPixKey] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<OffPayrollReceiptRecord | null>(null);

  const loadData = useCallback(async () => {
    if (!employeeId && !profileId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getEmployeeCommercialPerformanceFn({
        data: {
          employeeId,
          profileId,
          competenceMonth,
        },
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar desempenho.");
    } finally {
      setLoading(false);
    }
  }, [employeeId, profileId, competenceMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const eligibleSheets = (data?.sales || []).filter(
    (s: any) =>
      (s.agent_commission_status === "eligible" || s.agent_commission_status === "approved") &&
      !s.agent_payout_receipt_id &&
      Number(s.agent_commission_total_cents || 0) > 0,
  );

  const handleEmitOffPayrollReceipt = async () => {
    if (!data || eligibleSheets.length === 0) return;
    setSubmitting(true);
    try {
      const beneficiaryName = data.employee?.full_name || "Consultor";
      const res = await createOffPayrollAwardReceiptFn({
        data: {
          beneficiaryProfileId: (data as any).profileId || profileId || null,
          beneficiaryEmployeeId: employeeId || data.employee?.id || null,
          beneficiaryName,
          competenceMonth,
          sheetIds: eligibleSheets.map((s: any) => s.id),
          payoutNature,
          payoutChannel: "off_payroll_award",
          paymentMethod: payoutMethod,
          pixKey: pixKey.trim() || undefined,
          markPaidImmediately: true,
          notes: notes.trim() || undefined,
        },
      });
      toast.success(`Recibo ${res.receipt.receipt_code} emitido fora da folha CLT.`);
      setPayoutOpen(false);
      await loadData();
      setActiveReceipt(res.receipt);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar recibo por fora.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 py-2 motion-reduce:transition-none">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
        <div className="h-44 rounded-xl bg-muted animate-pulse motion-reduce:animate-none" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-8 text-center space-y-3">
        <p className="text-sm text-destructive">{error || "Dados indisponíveis."}</p>
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11 focus-visible:ring-2"
          onClick={loadData}
        >
          Recarregar
        </Button>
      </div>
    );
  }

  const tier = data.tier;
  const growthPositive = data.growthPct >= 0;

  return (
    <div className="space-y-5 motion-reduce:transition-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-2">
            <Award className="w-3.5 h-3.5 text-primary" />
            {tier?.tierName || "Faixa Base"}
          </Badge>
          <Badge
            variant="secondary"
            className={
              growthPositive
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-destructive"
            }
          >
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            {growthPositive ? "+" : ""}
            {data.growthPct.toFixed(1)}% vs mês anterior
          </Badge>
          <Badge variant="outline" className="gap-2 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            Pago Por Fora da Folha CLT
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="month"
            aria-label="Competência mensal"
            className="h-11 w-44"
            value={competenceMonth}
            onChange={(e) => setCompetenceMonth(e.target.value)}
          />
          {canManagePayouts && eligibleSheets.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              className="h-11 min-h-11 focus-visible:ring-2"
              onClick={() => setPayoutOpen(true)}
            >
              <Receipt className="w-4 h-4 mr-2" />
              Gerar Recibo Por Fora
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vendas Brutas ({competenceMonth})</CardDescription>
            <CardTitle className="text-lg tabular-nums">{formatMoney(data.totalGrossCents)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {data.salesCount} reserva(s) confirmadas
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Prêmio Variável Total</CardDescription>
            <CardTitle className="text-lg tabular-nums">{formatMoney(data.totalAwardCents)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {tier ? `${tier.basePct}% líq. + ${tier.overPct}% Over` : "Regra ativa"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Liberado p/ Recibo</CardDescription>
            <CardTitle className="text-lg tabular-nums text-blue-700 dark:text-blue-300">
              {formatMoney(data.eligibleAwardCents)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {eligibleSheets.length} venda(s) elegível(is)
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Já Pago Por Fora</CardDescription>
            <CardTitle className="text-lg tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatMoney(data.paidAwardCents)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {data.receipts.length} recibo(s) emitido(s)
          </CardContent>
        </Card>
      </div>

      {tier?.nextTier && (
        <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>
            Faltam <strong className="text-foreground">{formatMoney(tier.remainingToNextTierCents)}</strong>{" "}
            para atingir a faixa <strong className="text-foreground">{tier.nextTier.tierName}</strong>
          </span>
          <span className="font-mono">
            {tier.nextTier.baseCommissionPct}% líq. + {tier.nextTier.overCommissionPct}% Over
          </span>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Vendas da Competência</h4>
        <div className="border border-border rounded-xl overflow-x-auto table">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Data / Código</th>
                <th className="text-left px-3 py-2 font-medium">Cliente / Destino</th>
                <th className="text-left px-3 py-2 font-medium">Operadora</th>
                <th className="text-right px-3 py-2 font-medium">Bruto</th>
                <th className="text-right px-3 py-2 font-medium">Prêmio Agente</th>
                <th className="text-left px-3 py-2 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-xs">
                    Nenhuma venda registrada nesta competência.
                  </td>
                </tr>
              ) : (
                data.sales.map((sale: any) => (
                  <tr key={sale.id}>
                    <td className="px-3 py-2 text-xs">
                      <div>{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString("pt-BR") : "-"}</div>
                      <div className="font-mono text-muted-foreground">{sale.internal_code}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{sale.client_name}</div>
                      <div className="text-xs text-muted-foreground">{sale.destination}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{sale.primary_operator}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(sale.gross_sale_cents)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {formatMoney(sale.agent_commission_total_cents)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={sale.agent_commission_status === "paid" ? "secondary" : "outline"}>
                        {sale.agent_commission_status === "paid"
                          ? "Pago Por Fora"
                          : sale.agent_commission_status === "eligible"
                            ? "Liberado"
                            : "Aguardando"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">
          Recibos de Premiação Variável (Externos ao Holerite CLT)
        </h4>
        {data.receipts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Nenhum recibo emitido para este colaborador.
          </p>
        ) : (
          <div className="space-y-2">
            {data.receipts.map((rec: any) => (
              <div
                key={rec.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {rec.receipt_code} • {rec.competence_month}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rec.sales_count} venda(s) • Emitido em{" "}
                    {new Date(rec.issued_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums">
                    {formatMoney(rec.net_paid_cents)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-11 focus-visible:ring-2"
                    onClick={() => setActiveReceipt(rec)}
                  >
                    Ver / Imprimir Recibo
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent className="pt-safe-modal">
          <DialogHeader>
            <DialogTitle>Emitir Recibo de Premiação Por Fora</DialogTitle>
            <DialogDescription>
              Liquida {eligibleSheets.length} venda(s) elegível(is) totalizando{" "}
              {formatMoney(data.eligibleAwardCents)} sem inclusão na folha CLT.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="award-nature">Enquadramento Contábil</Label>
              <select
                id="award-nature"
                className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                value={payoutNature}
                onChange={(e) => setPayoutNature(e.target.value as any)}
              >
                <option value="premiacao_variavel_por_fora">
                  Premiação Variável Por Fora (Comercial)
                </option>
                <option value="bonus_meta">Bonificação por Alcance de Meta</option>
                <option value="comissao_sobre_recebimento">Comissão sobre Recebimento</option>
                <option value="repasse_pj_autonomo">Repasse Autônomo / PJ</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="award-method">Meio de Pagamento</Label>
                <select
                  id="award-method"
                  className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as any)}
                >
                  <option value="pix">PIX Direto</option>
                  <option value="transfer">Transferência / TED</option>
                  <option value="cash">Espécie</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="award-pix">Chave PIX (opcional)</Label>
                <Input
                  id="award-pix"
                  className="h-11"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="award-notes">Observações no Recibo</Label>
              <Input
                id="award-notes"
                className="h-11"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 focus-visible:ring-2"
              onClick={() => setPayoutOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={submitting}
              className="h-11 min-h-11 focus-visible:ring-2"
              onClick={handleEmitOffPayrollReceipt}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />}
              Emitir e Pagar Por Fora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CommissionAwardReceiptModal
        receipt={activeReceipt}
        open={Boolean(activeReceipt)}
        onOpenChange={(open) => !open && setActiveReceipt(null)}
        canMarkPaid={canManagePayouts}
        canAcknowledge
        onUpdated={loadData}
      />
    </div>
  );
}
