import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  createOperatorBillingBatchFn,
  getOperatorBillingSummaryFn,
  reconcileOperatorReceivableFn,
} from "@/services/travel-operator-billing.functions";

function formatMoney(cents?: number | null) {
  return ((cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

interface OperatorBillingPanelProps {
  competenceMonth: string;
  onReconciled?: () => void;
}

export function OperatorBillingPanel({
  competenceMonth,
  onReconciled,
}: OperatorBillingPanelProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof getOperatorBillingSummaryFn>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const [reconcileTarget, setReconcileTarget] = useState<any | null>(null);
  const [receivedInput, setReceivedInput] = useState("");
  const [invoiceNumberInput, setInvoiceNumberInput] = useState("");
  const [receiptDateInput, setReceiptDateInput] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notesInput, setNotesInput] = useState("");
  const [saving, setSaving] = useState(false);

  const [batchOperator, setBatchOperator] = useState<any | null>(null);
  const [batchNfse, setBatchNfse] = useState("");
  const [batchDueDate, setBatchDueDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [batchDirection, setBatchDirection] = useState<
    "receivable_from_operator" | "payable_net_to_operator"
  >("receivable_from_operator");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOperatorBillingSummaryFn({
        data: { competenceMonth: competenceMonth || undefined },
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar operadoras.");
    } finally {
      setLoading(false);
    }
  }, [competenceMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openReconcileModal = (sheet: any) => {
    const expected = Number(sheet.expected_receipt_cents || sheet.agency_revenue_cents || 0);
    setReconcileTarget(sheet);
    setReceivedInput(((expected || 0) / 100).toFixed(2));
    setInvoiceNumberInput(sheet.invoice_number || "");
    setReceiptDateInput(sheet.actual_receipt_date || new Date().toISOString().slice(0, 10));
    setNotesInput("");
  };

  const handleConfirmReconcile = async () => {
    if (!reconcileTarget) return;
    setSaving(true);
    try {
      const normalizedCents = Math.round(
        Number(receivedInput.replace(",", ".")) * 100 || 0,
      );
      await reconcileOperatorReceivableFn({
        data: {
          sheetId: reconcileTarget.id,
          receivedCents: Math.max(0, normalizedCents),
          actualReceiptDate: receiptDateInput,
          invoiceNumber: invoiceNumberInput.trim() || undefined,
          notes: notesInput.trim() || undefined,
        },
      });
      toast.success("Baixa da operadora persistida no banco e DRE.");
      setReconcileTarget(null);
      await loadData();
      onReconciled?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conciliar operadora.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenBatchModal = (op: any) => {
    setBatchOperator(op);
    setBatchDirection(
      op.netPayableToOperatorCents > op.pendingReceivableCents
        ? "payable_net_to_operator"
        : "receivable_from_operator",
    );
    setBatchNfse("");
  };

  const handleCreateBatch = async () => {
    if (!batchOperator) return;
    const candidateSheets = (batchOperator.sheets || []).filter((s: any) =>
      batchDirection === "payable_net_to_operator"
        ? s.is_cash_settled || s.settlement_method === "comissao_balcao_a_vista"
        : s.receivable_status !== "recebido" && !s.operator_billing_batch_id,
    );
    const sheetIds = (candidateSheets.length > 0 ? candidateSheets : batchOperator.sheets || [])
      .map((s: any) => s.id)
      .slice(0, 100);

    if (sheetIds.length === 0) {
      toast.error("Nenhuma reserva pendente para gerar borderô.");
      return;
    }

    setSaving(true);
    try {
      const res = await createOperatorBillingBatchFn({
        data: {
          operatorName: batchOperator.operatorName,
          competenceMonth,
          direction: batchDirection,
          sheetIds,
          dueDate: batchDueDate,
          nfseNumber: batchNfse.trim() || undefined,
        },
      });
      toast.success(`Borderô ${res.batch.batch_code} gerado com ${sheetIds.length} reserva(s).`);
      setBatchOperator(null);
      await loadData();
      onReconciled?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar borderô.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 motion-reduce:transition-none">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted animate-pulse motion-reduce:animate-none" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 focus-visible:ring-2"
            onClick={loadData}
          >
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const operators = data?.operators || [];
  const batches = data?.batches || [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>A Receber de Operadoras</CardDescription>
            <CardTitle className="text-xl tabular-nums text-foreground">
              {formatMoney(summary?.totalPendingReceivableCents)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Já Conciliado / Recebido</CardDescription>
            <CardTitle className="text-xl tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatMoney(summary?.totalReceivedCents)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net a Pagar (Retido no Balcão)</CardDescription>
            <CardTitle className="text-xl tabular-nums text-warning-strong">
              {formatMoney(summary?.totalNetPayableToOperatorsCents)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>NFS-e Pendentes</CardDescription>
            <CardTitle className="text-xl tabular-nums text-foreground">
              {summary?.pendingInvoiceCount || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Faturamento e Cobrança por Operadora
          </h3>
          <p className="text-xs text-muted-foreground">
            Borderôs, baixa financeira real e NFS-e emitida sobre a Receita da Agência.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11 focus-visible:ring-2"
          onClick={loadData}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {operators.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Building2 className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">
              Nenhuma venda vinculada a operadoras nesta competência.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {operators.map((op) => (
            <Card key={op.operatorName}>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    {op.operatorName}
                    <Badge variant="secondary">{op.salesCount} reserva(s)</Badge>
                  </CardTitle>
                  <CardDescription>
                    {op.operatorDocument ? `CNPJ: ${op.operatorDocument} • ` : ""}
                    Ciclo: {op.billingCycle} •{" "}
                    {op.nfseRequired ? "Exige NFS-e s/ Receita Agência" : "Sem NFS-e"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Saldo Pendente</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {formatMoney(op.pendingReceivableCents)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-11 focus-visible:ring-2"
                    onClick={() => handleOpenBatchModal(op)}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Gerar Borderô
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto table border border-border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Código / Loc</th>
                        <th className="text-left px-3 py-2 font-medium">Cliente</th>
                        <th className="text-right px-3 py-2 font-medium">Bruto</th>
                        <th className="text-right px-3 py-2 font-medium">Receita Agência</th>
                        <th className="text-right px-3 py-2 font-medium">Recebido</th>
                        <th className="text-left px-3 py-2 font-medium">NFS-e / Status</th>
                        <th className="text-right px-3 py-2 font-medium">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {op.sheets.map((sheet: any) => {
                        const isSettled = sheet.receivable_status === "recebido";
                        return (
                          <tr key={sheet.id}>
                            <td className="px-3 py-2 font-mono text-xs">
                              <div>{sheet.internal_code}</div>
                              {sheet.locator_code && (
                                <div className="text-muted-foreground">LOC: {sheet.locator_code}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 font-medium text-foreground">
                              {sheet.client_name}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                              {formatMoney(sheet.gross_sale_cents)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">
                              {formatMoney(sheet.agency_revenue_cents)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-300">
                              {formatMoney(sheet.received_cents)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={isSettled ? "secondary" : "outline"}>
                                  {isSettled ? "Recebido" : sheet.receivable_status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {sheet.invoice_number ? `NF ${sheet.invoice_number}` : sheet.invoice_status}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant={isSettled ? "ghost" : "outline"}
                                className="h-11 min-h-11 focus-visible:ring-2"
                                onClick={() => openReconcileModal(sheet)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                {isSettled ? "Ajustar" : "Dar Baixa"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {batches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Borderôs e Lotes Emitidos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 overflow-x-auto table">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Lote</th>
                  <th className="text-left px-3 py-2 font-medium">Operadora</th>
                  <th className="text-left px-3 py-2 font-medium">Direção</th>
                  <th className="text-right px-3 py-2 font-medium">Valor Lote</th>
                  <th className="text-left px-3 py-2 font-medium">Vencimento</th>
                  <th className="text-left px-3 py-2 font-medium">NFS-e</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batches.map((b: any) => (
                  <tr key={b.id}>
                    <td className="px-3 py-2 font-mono text-xs">{b.batch_code}</td>
                    <td className="px-3 py-2 font-medium">{b.operator_name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {b.direction === "payable_net_to_operator"
                        ? "Repasse Net à Operadora"
                        : "Cobrança Comissão + Over"}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatMoney(b.total_due_cents)}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {b.due_date ? new Date(b.due_date).toLocaleDateString("pt-BR") : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {b.nfse_number ? `NF ${b.nfse_number}` : b.nfse_status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(reconcileTarget)}
        onOpenChange={(open) => !open && setReconcileTarget(null)}
      >
        <DialogContent className="pt-safe-modal">
          <DialogHeader>
            <DialogTitle>Baixa Real de Comissão da Operadora</DialogTitle>
            <DialogDescription>
              {reconcileTarget?.internal_code} • {reconcileTarget?.client_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rec-amount">Valor Recebido (R$)</Label>
              <Input
                id="rec-amount"
                className="h-11"
                value={receivedInput}
                onChange={(e) => setReceivedInput(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rec-date">Data do Recebimento</Label>
                <Input
                  id="rec-date"
                  type="date"
                  className="h-11"
                  value={receiptDateInput}
                  onChange={(e) => setReceiptDateInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rec-nf">Número NFS-e (opcional)</Label>
                <Input
                  id="rec-nf"
                  className="h-11"
                  placeholder="Ex: 20260014"
                  value={invoiceNumberInput}
                  onChange={(e) => setInvoiceNumberInput(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-notes">Observação de Conciliação</Label>
              <Input
                id="rec-notes"
                className="h-11"
                placeholder="Ex: Crédito em conta corrente Sicredi"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 focus-visible:ring-2"
              onClick={() => setReconcileTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={saving}
              className="h-11 min-h-11 focus-visible:ring-2"
              onClick={handleConfirmReconcile}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />}
              Confirmar Baixa no DRE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(batchOperator)}
        onOpenChange={(open) => !open && setBatchOperator(null)}
      >
        <DialogContent className="pt-safe-modal">
          <DialogHeader>
            <DialogTitle>Gerar Borderô — {batchOperator?.operatorName}</DialogTitle>
            <DialogDescription>
              Agrupa reservas pendentes da competência {competenceMonth} para faturamento ou repasse Net.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batch-dir">Natureza do Borderô</Label>
              <select
                id="batch-dir"
                className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                value={batchDirection}
                onChange={(e) => setBatchDirection(e.target.value as any)}
              >
                <option value="receivable_from_operator">
                  Cobrança de Comissão + Over (A Receber da Operadora)
                </option>
                <option value="payable_net_to_operator">
                  Repasse Net à Operadora (Retido no Balcão à Vista)
                </option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="batch-due">Vencimento</Label>
                <Input
                  id="batch-due"
                  type="date"
                  className="h-11"
                  value={batchDueDate}
                  onChange={(e) => setBatchDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch-nf">NFS-e Emitida (opcional)</Label>
                <Input
                  id="batch-nf"
                  className="h-11"
                  placeholder="Nº NFS-e"
                  value={batchNfse}
                  onChange={(e) => setBatchNfse(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 focus-visible:ring-2"
              onClick={() => setBatchOperator(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              className="h-11 min-h-11 focus-visible:ring-2"
              onClick={handleCreateBatch}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />}
              Gerar Borderô Oficial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
