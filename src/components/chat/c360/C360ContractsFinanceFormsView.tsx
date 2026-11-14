import {
  FileSignature,
  Receipt,
  ClipboardList,
  ShieldAlert,
  Copy,
  Send,
  ExternalLink,
  Plus,
  HeartPulse,
  CheckCircle2,
  Clock,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, cn } from "@/lib/utils";
import { formatDate } from "@/lib/datetime";
import { toast } from "sonner";

interface C360ContractsFinanceFormsViewProps {
  mode: "contracts" | "finance" | "forms" | "support";
  data: any;
  onQuickSendMessage?: (text: string) => void;
  onOpenQuickComposerModal?: (modal: "invoice" | "boleto" | "contract" | "quote" | "image_card") => void;
}

export function C360ContractsFinanceFormsView({
  mode,
  data,
  onQuickSendMessage,
  onOpenQuickComposerModal,
}: C360ContractsFinanceFormsViewProps) {
  const contracts: any[] = Array.isArray(data?.contracts) ? data.contracts : [];
  const clinicalRecords: any[] = Array.isArray(data?.clinicalRecords) ? data.clinicalRecords : [];
  const invoices: any[] = Array.isArray(data?.invoices) ? data.invoices : [];
  const installmentPlans: any[] = Array.isArray(data?.installmentPlans) ? data.installmentPlans : [];
  const debts: any[] = Array.isArray(data?.debts) ? data.debts : [];
  const creditBalanceCents = Number(data?.customerCreditBalanceCents || 0);
  const airCredits: any[] = Array.isArray(data?.credits) ? data.credits : [];
  const formSubmissions: any[] = Array.isArray(data?.formSubmissions) ? data.formSubmissions : [];
  const tickets: any[] = Array.isArray(data?.tickets) ? data.tickets : [];

  const origin = typeof window !== "undefined" ? window.location.origin : "https://waesy.com.br";

  const copyLink = async (url: string, label: string) => {
    await navigator.clipboard.writeText(url);
    toast.success(`${label} copiado!`);
  };

  if (mode === "contracts") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground flex items-center gap-2">
            <FileSignature className="size-3.5 text-primary" />
            Contratos ({contracts.length})
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenQuickComposerModal?.("contract")}
            className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs"
          >
            <Plus className="size-3.5 mr-1" />
            Gerar Contrato
          </Button>
        </div>

        {contracts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Nenhum contrato emitido para este cliente.
          </div>
        ) : (
          <div className="space-y-2">
            {contracts.map((c) => {
              const isSigned = ["signed", "active", "completed"].includes(String(c.status));
              const signUrl = c.public_token ? `${origin}/contrato/${c.public_token}` : null;
              return (
                <div key={c.id} className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-semibold text-foreground block truncate">
                        {c.title || "Contrato de PrestaÃ§Ã£o de ServiÃ§os"}
                      </span>
                      <span className="text-muted-foreground">
                        {c.contract_number ? `#${c.contract_number} Â· ` : ""}
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs shrink-0",
                        isSigned
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-warning/40 bg-warning/10 text-warning-strong",
                      )}
                    >
                      {isSigned ? (
                        <CheckCircle2 className="size-3 mr-1" />
                      ) : (
                        <Clock className="size-3 mr-1" />
                      )}
                      {isSigned ? "Assinado" : "Aguardando Assinatura"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {signUrl && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => copyLink(signUrl, "Link do contrato")}
                          className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs flex-1"
                        >
                          <Copy className="size-3.5 mr-1" />
                          Copiar Link
                        </Button>
                        {onQuickSendMessage && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onQuickSendMessage(
                                isSigned
                                  ? `Segue a cÃ³pia do seu contrato (${c.title || "Contrato"}):\n${signUrl}`
                                  : `OlÃ¡! Segue o link para assinatura digital do seu contrato (${c.title || "Contrato"}):\n${signUrl}`,
                              );
                              toast.success(isSigned ? "CÃ³pia enviada no chat!" : "SolicitaÃ§Ã£o de assinatura enviada!");
                            }}
                            className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs"
                          >
                            <Send className="size-3.5 mr-1" />
                            {isSigned ? "Enviar" : "Solicitar Assinatura"}
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      asChild
                      className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs"
                    >
                      <a href={`/workspace/contratos/${c.id}/editor`} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Anamnese & ProntuÃ¡rio / RestriÃ§Ãµes */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <span className="text-xs font-semibold text-foreground flex items-center gap-2">
            <HeartPulse className="size-3.5 text-primary" />
            Anamnese & RestriÃ§Ãµes ({clinicalRecords.length})
          </span>
          {clinicalRecords.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem fichas de anamnese registradas.</p>
          ) : (
            <div className="space-y-2">
              {clinicalRecords.map((rec) => (
                <div key={rec.id} className="rounded-xl border border-border bg-card p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs uppercase">
                      {rec.record_type}
                    </Badge>
                    <span className="text-muted-foreground">{formatDate(rec.created_at)}</span>
                  </div>
                  <p className="text-foreground whitespace-pre-line break-words">
                    {typeof rec.content === "string" ? rec.content : JSON.stringify(rec.content)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === "finance") {
    const pendingDebtCents = Number(data?.metrics?.pending_debt_cents || 0);
    return (
      <div className="space-y-3">
        {/* Resumo Financeiro Real */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-card p-3">
            <span className="text-xs text-muted-foreground block">Em Aberto / DÃ­vida</span>
            <span className={cn("text-sm font-semibold", pendingDebtCents > 0 ? "text-destructive" : "text-foreground")}>
              {formatBRL(pendingDebtCents)}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <span className="text-xs text-muted-foreground block">CrÃ©dito em Loja</span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {formatBRL(creditBalanceCents)}
            </span>
          </div>
        </div>

        {/* AÃ§Ãµes RÃ¡pidas de CobranÃ§a */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenQuickComposerModal?.("invoice")}
            className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs"
          >
            <Receipt className="size-3.5 mr-1" />
            Gerar Fatura
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenQuickComposerModal?.("boleto")}
            className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs"
          >
            <Wallet className="size-3.5 mr-1" />
            Boleto / CarnÃª
          </Button>
        </div>

        {/* CarnÃªs / Parcelamentos */}
        {installmentPlans.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              CarnÃªs & Parcelamentos ({installmentPlans.length})
            </span>
            {installmentPlans.map((plan) => {
              const parcels: any[] = Array.isArray(plan.installments) ? plan.installments : [];
              const paidCount = parcels.filter((p) => p.status === "paid").length;
              return (
                <div key={plan.id} className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      CarnÃª {formatBRL(plan.total_cents || 0)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {paidCount}/{parcels.length} pagas
                    </Badge>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    {parcels.slice(0, 4).map((p, idx) => (
                      <div key={p.id || idx} className="flex items-center justify-between text-muted-foreground">
                        <span>Venc. {formatDate(p.due_date)}</span>
                        <span className={p.status === "paid" ? "text-emerald-600 font-medium" : "text-foreground"}>
                          {formatBRL(p.amount_cents || 0)} Â· {p.status === "paid" ? "Pago" : "Pendente"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Faturas & CobranÃ§as */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Faturas & LanÃ§amentos ({invoices.length})</span>
            <a
              href="/workspace/financeiro/faturas"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              Financeiro
              <ExternalLink className="size-3" />
            </a>
          </div>
          {invoices.length === 0 && debts.length === 0 ? (
            <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border p-3 text-center">
              Nenhuma fatura encontrada para este cliente.
            </p>
          ) : (
            <div className="space-y-2">
              {invoices.slice(0, 8).map((inv) => {
                const invUrl = inv.public_token ? `${origin}/fatura/${inv.public_token}` : null;
                return (
                  <div key={inv.id} className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground block truncate">
                          {inv.description || inv.invoice_code || "Fatura"}
                        </span>
                        <span className="text-muted-foreground">
                          {inv.due_date ? formatDate(inv.due_date) : "â€”"}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-semibold text-foreground block">
                          {formatBRL(inv.amount_cents || 0)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {inv.status || "aberta"}
                        </Badge>
                      </div>
                    </div>
                    {invUrl && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => copyLink(invUrl, "Link da fatura")}
                          className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs flex-1"
                        >
                          <Copy className="size-3 mr-1" />
                          Copiar
                        </Button>
                        {onQuickSendMessage && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onQuickSendMessage(`Segue o link da sua fatura (${formatBRL(inv.amount_cents || 0)}):\n${invUrl}`);
                              toast.success("Fatura enviada no chat!");
                            }}
                            className="min-h-11 sm:min-h-8 h-8 rounded-lg text-xs"
                          >
                            <Send className="size-3 mr-1" />
                            Enviar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CrÃ©ditos de Passagens (se houver) */}
        {airCredits.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/60">
            <span className="text-xs font-semibold text-foreground block">CrÃ©ditos AÃ©reos Ativos</span>
            {airCredits.map((cr) => (
              <div key={cr.id} className="rounded-lg border border-border bg-card p-2 flex items-center justify-between text-xs">
                <span>
                  {cr.airline} Â· PNR {cr.original_pnr}
                </span>
                <span className="font-semibold text-emerald-600">{formatBRL(cr.remaining_amount_cents || 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (mode === "forms") {
    return (
      <div className="space-y-3">
        <span className="text-xs font-semibold text-foreground flex items-center gap-2">
          <ClipboardList className="size-3.5 text-primary" />
          FormulÃ¡rios & Landing Pages ({formSubmissions.length})
        </span>
        {formSubmissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Nenhum preenchimento de formulÃ¡rio ou landing page identificado para este contato.
          </div>
        ) : (
          <div className="space-y-2">
            {formSubmissions.map((sub) => {
              const meta = (sub.metadata && typeof sub.metadata === "object" ? sub.metadata : {}) as Record<string, any>;
              return (
                <div key={sub.id} className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      {sub.form_name || sub.form_type || "FormulÃ¡rio"}
                    </span>
                    <span className="text-muted-foreground shrink-0">{formatDate(sub.created_at)}</span>
                  </div>
                  {sub.route && (
                    <span className="text-xs text-muted-foreground font-mono block truncate">{sub.route}</span>
                  )}
                  <div className="pt-1 border-t border-border/50 space-y-1">
                    {Object.entries(meta).map(([k, v]) =>
                      v ? (
                        <div key={k} className="text-muted-foreground">
                          <span className="font-medium text-foreground">{k}: </span>
                          <span className="break-words">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // mode === "support"
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert className="size-3.5 text-primary" />
          Chamados & Suporte ({tickets.length})
        </span>
        <a
          href="/workspace/atendimento"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          SAC
          <ExternalLink className="size-3" />
        </a>
      </div>
      {tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Nenhum chamado de suporte aberto para este cliente.
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-3 space-y-1 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground truncate">{t.title || t.subject || "Chamado"}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {t.status}
                </Badge>
              </div>
              {t.description && <p className="text-muted-foreground line-clamp-2">{t.description}</p>}
              <span className="text-muted-foreground block">{formatDate(t.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
