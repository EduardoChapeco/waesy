import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Printer,
  ShieldCheck,
  Receipt,
  Loader2,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { escapeHtml } from "@/lib/sanitize";
import {
  acknowledgeOffPayrollReceiptFn,
  markOffPayrollReceiptPaidFn,
} from "@/services/travel-commission-payouts.functions";

export interface OffPayrollReceiptRecord {
  id: string;
  receipt_code: string;
  competence_month: string;
  beneficiary_profile_id?: string | null;
  beneficiary_name: string;
  payout_nature: string;
  payout_channel: string;
  include_in_payroll: boolean;
  payment_method?: string | null;
  pix_key?: string | null;
  sales_count: number;
  gross_award_cents: number;
  deductions_cents: number;
  net_paid_cents: number;
  status: string;
  issued_at: string;
  paid_at?: string | null;
  acknowledged_at?: string | null;
  integrity_hash?: string | null;
  notes?: string | null;
  items_snapshot?: Array<{
    sheet_id?: string;
    internal_code?: string;
    client_name?: string;
    destination?: string;
    primary_operator?: string;
    sale_date?: string;
    gross_sale_cents?: number;
    net_sale_cents?: number;
    agent_base_commission_cents?: number;
    agent_over_commission_cents?: number;
    agent_commission_total_cents?: number;
  }>;
}

function formatMoney(cents?: number | null) {
  return ((cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function resolveNatureLabel(nature: string): string {
  if (nature === "bonus_meta") return "Bonificação por Alcance de Meta";
  if (nature === "repasse_pj_autonomo") return "Repasse Comercial Autônomo / PJ";
  if (nature === "comissao_sobre_recebimento") return "Premiação sobre Liquidação";
  return "Premiação Variável Por Fora (Não Integrante da Folha CLT)";
}

function resolveStatusLabel(status: string): { label: string; tone: string } {
  if (status === "acknowledged") {
    return {
      label: "Pago e Confirmado",
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    };
  }
  if (status === "paid") {
    return {
      label: "Pago (Aguardando Ciente)",
      tone: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    };
  }
  if (status === "cancelled") {
    return {
      label: "Cancelado",
      tone: "bg-destructive/10 text-destructive border-destructive/20",
    };
  }
  return {
    label: "Emitido (Pendente Liquidar)",
    tone: "bg-warning/10 text-warning-strong border-warning/30",
  };
}

function printReceiptWindow(receipt: OffPayrollReceiptRecord, agencyName?: string) {
  if (typeof window === "undefined") return;
  const popup = window.open("", "_blank", "width=880,height=720");
  if (!popup) {
    toast.error("Permita pop-ups para imprimir o recibo em PDF.");
    return;
  }

  const items = Array.isArray(receipt.items_snapshot) ? receipt.items_snapshot : [];
  const rowsHtml = items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.internal_code || "-")}</td>
        <td>${escapeHtml(item.client_name || "-")}</td>
        <td>${escapeHtml(item.primary_operator || "-")}</td>
        <td style="text-align:right">${escapeHtml(formatMoney(item.gross_sale_cents))}</td>
        <td style="text-align:right">${escapeHtml(formatMoney(item.net_sale_cents))}</td>
        <td style="text-align:right;font-weight:600">${escapeHtml(formatMoney(item.agent_commission_total_cents))}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Recibo ${escapeHtml(receipt.receipt_code)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: black; margin: 32px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid black; padding-bottom: 16px; margin-bottom: 20px; }
    .title { font-size: 18px; font-weight: 700; margin: 0 0 4px 0; }
    .subtitle { color: dimgray; margin: 0; font-size: 12px; }
    .badge { display: inline-block; border: 1px solid silver; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; background: whitesmoke; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; padding: 12px; border: 1px solid gainsboro; border-radius: 8px; }
    .label { color: dimgray; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .val { font-weight: 600; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px; }
    th, td { border-bottom: 1px solid gainsboro; padding: 8px 6px; text-align: left; }
    th { font-size: 11px; text-transform: uppercase; color: dimgray; background: whitesmoke; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals-box { width: 280px; border: 1px solid gainsboro; border-radius: 8px; padding: 12px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .total-final { border-top: 1px solid silver; margin-top: 6px; padding-top: 8px; font-size: 15px; font-weight: 700; }
    .declaration { padding: 12px; background: whitesmoke; border: 1px solid gainsboro; border-radius: 8px; font-size: 12px; line-height: 1.5; margin-bottom: 32px; }
    .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 36px; margin-top: 40px; }
    .sig-line { border-top: 1px solid darkslategray; padding-top: 6px; text-align: center; font-size: 12px; }
    .hash { margin-top: 24px; font-family: monospace; font-size: 10px; color: dimgray; word-break: break-all; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">Recibo de Premiação Variável Comercial</h1>
      <p class="subtitle">${escapeHtml(agencyName || "Agência de Viagens")} • Pagamento Externo à Folha CLT</p>
    </div>
    <div style="text-align:right">
      <div class="badge">${escapeHtml(receipt.receipt_code)}</div>
      <div style="margin-top:6px;font-size:12px;">Competência: <strong>${escapeHtml(receipt.competence_month)}</strong></div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="label">Favorecido / Consultor</div>
      <div class="val">${escapeHtml(receipt.beneficiary_name)}</div>
    </div>
    <div>
      <div class="label">Natureza Contábil</div>
      <div class="val">${escapeHtml(resolveNatureLabel(receipt.payout_nature))}</div>
    </div>
    <div>
      <div class="label">Meio de Liquidação</div>
      <div class="val">${escapeHtml((receipt.payment_method || "pix").toUpperCase())}${receipt.pix_key ? ` — Chave: ${escapeHtml(receipt.pix_key)}` : ""}</div>
    </div>
    <div>
      <div class="label">Emissão / Pagamento</div>
      <div class="val">${escapeHtml(new Date(receipt.paid_at || receipt.issued_at).toLocaleDateString("pt-BR"))}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Reserva</th>
        <th>Cliente</th>
        <th>Operadora</th>
        <th style="text-align:right">Venda Bruta</th>
        <th style="text-align:right">Base Comiss.</th>
        <th style="text-align:right">Premiação</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>Vendas Vinculadas</span><span>${receipt.sales_count}</span></div>
      <div class="total-row"><span>Prêmio Bruto</span><span>${escapeHtml(formatMoney(receipt.gross_award_cents))}</span></div>
      <div class="total-row"><span>Estornos / Descontos</span><span>- ${escapeHtml(formatMoney(receipt.deductions_cents))}</span></div>
      <div class="total-row total-final"><span>Valor Líquido Pago</span><span>${escapeHtml(formatMoney(receipt.net_paid_cents))}</span></div>
    </div>
  </div>

  <div class="declaration">
    Declaro para os devidos fins ter recebido a importância líquida acima discriminada a título de
    <strong>${escapeHtml(resolveNatureLabel(receipt.payout_nature))}</strong>, referente às reservas listadas na competência
    ${escapeHtml(receipt.competence_month)}, liquidada externamente à folha de pagamento CLT conforme regras comerciais da agência.
    ${receipt.notes ? `<br/>Observações: ${escapeHtml(receipt.notes)}` : ""}
  </div>

  <div class="signatures">
    <div class="sig-line">Responsável Financeiro / Agência</div>
    <div class="sig-line">${escapeHtml(receipt.beneficiary_name)}${receipt.acknowledged_at ? ` (Ciente digital em ${new Date(receipt.acknowledged_at).toLocaleString("pt-BR")})` : ""}</div>
  </div>

  ${receipt.integrity_hash ? `<div class="hash">Autenticação SHA-256: ${escapeHtml(receipt.integrity_hash)}</div>` : ""}
</body>
</html>`;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  setTimeout(() => {
    popup.print();
  }, 250);
}

interface CommissionAwardReceiptModalProps {
  receipt: OffPayrollReceiptRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyName?: string;
  canMarkPaid?: boolean;
  canAcknowledge?: boolean;
  onUpdated?: () => void;
}

export function CommissionAwardReceiptModal({
  receipt,
  open,
  onOpenChange,
  agencyName,
  canMarkPaid = false,
  canAcknowledge = false,
  onUpdated,
}: CommissionAwardReceiptModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!receipt) return null;

  const statusMeta = resolveStatusLabel(receipt.status);
  const items = Array.isArray(receipt.items_snapshot) ? receipt.items_snapshot : [];

  const handleMarkPaid = async () => {
    setSubmitting(true);
    try {
      await markOffPayrollReceiptPaidFn({
        data: {
          receiptId: receipt.id,
          paymentMethod: (receipt.payment_method as "pix" | "transfer" | "cash" | "other") || "pix",
        },
      });
      toast.success("Recibo liquidado fora da folha e lançado no DRE financeiro.");
      onUpdated?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao liquidar recibo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async () => {
    setSubmitting(true);
    try {
      await acknowledgeOffPayrollReceiptFn({ data: { receiptId: receipt.id } });
      toast.success("Recebimento confirmado digitalmente.");
      onUpdated?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar recebimento.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-screen overflow-y-auto pt-safe-modal motion-reduce:transition-none">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Receipt className="w-5 h-5 text-primary" />
              Recibo Automático {receipt.receipt_code}
            </DialogTitle>
            <Badge variant="outline" className={statusMeta.tone}>
              {statusMeta.label}
            </Badge>
          </div>
          <DialogDescription>
            {resolveNatureLabel(receipt.payout_nature)} — Competência {receipt.competence_month}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-muted/40 border border-border">
            <div>
              <p className="text-xs text-muted-foreground">Favorecido</p>
              <p className="text-sm font-semibold text-foreground">{receipt.beneficiary_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Liquidação / Chave</p>
              <p className="text-sm font-semibold text-foreground uppercase">
                {receipt.payment_method || "PIX"}
                {receipt.pix_key ? ` • ${receipt.pix_key}` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Isolamento Trabalhista</p>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mt-1">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                Fora do Holerite CLT (Premiação Comercial)
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor Líquido</p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {formatMoney(receipt.net_paid_cents)}
              </p>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-x-auto table">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Reserva</th>
                  <th className="text-left px-3 py-2 font-medium">Cliente</th>
                  <th className="text-left px-3 py-2 font-medium">Operadora</th>
                  <th className="text-right px-3 py-2 font-medium">Bruto</th>
                  <th className="text-right px-3 py-2 font-medium">Base Líq.</th>
                  <th className="text-right px-3 py-2 font-medium">Prêmio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground text-xs">
                      Nenhuma venda detalhada no snapshot deste recibo.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={item.sheet_id || idx}>
                      <td className="px-3 py-2 font-mono text-xs">{item.internal_code || "-"}</td>
                      <td className="px-3 py-2 font-medium text-foreground">{item.client_name || "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.primary_operator || "-"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {formatMoney(item.gross_sale_cents)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {formatMoney(item.net_sale_cents)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">
                        {formatMoney(item.agent_commission_total_cents)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Prêmio Bruto: {formatMoney(receipt.gross_award_cents)}</span>
            {receipt.deductions_cents > 0 && (
              <span>Estornos/Deduções: -{formatMoney(receipt.deductions_cents)}</span>
            )}
            {receipt.integrity_hash && (
              <span className="font-mono">SHA-256: {receipt.integrity_hash.slice(0, 16)}...</span>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 focus-visible:ring-2"
            onClick={() => printReceiptWindow(receipt, agencyName)}
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir / PDF
          </Button>

          {canMarkPaid && receipt.status === "issued" && (
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              className="h-11 min-h-11 focus-visible:ring-2"
              onClick={handleMarkPaid}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Liquidar Pagamento
            </Button>
          )}

          {canAcknowledge && receipt.status === "paid" && (
            <Button
              type="button"
              variant="default"
              disabled={submitting}
              className="h-11 min-h-11 focus-visible:ring-2"
              onClick={handleAcknowledge}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Confirmar Recebimento (Ciente)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
