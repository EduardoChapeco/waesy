import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  Phone,
  Mail,
  ShoppingBag,
  ShieldAlert,
  DollarSign,
  Calendar,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  Plane,
  UserCheck,
  X,
  Receipt,
  Send,
  ArrowRightLeft,
  Clock,
  Save,
  RefreshCw,
  GitBranch,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { formatDate } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  getCustomer360Context,
  assignChatThread,
  updateCustomerFunnelStage,
} from "@/services/chat.functions";
import { ThreadTagsPicker } from "@/components/chat/ThreadTagsPicker";
import { CommercialBudgetPadSheet } from "@/components/documents/CommercialBudgetPadSheet";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const FUNNEL_STAGES = [
  { value: "new", label: "Novo Lead" },
  { value: "contacted", label: "Em Contato" },
  { value: "qualified", label: "Qualificado" },
  { value: "proposal", label: "Proposta / Orçamento" },
  { value: "negotiation", label: "Em Negociação" },
  { value: "won", label: "Fechado (Ganho)" },
  { value: "lost", label: "Perdido" },
] as const;

interface Customer360SidebarProps {
  customerId?: string;
  storeId: string;
  threadId?: string;
  guestName?: string;
  guestPhone?: string;
  className?: string;
  onQuickSendMessage?: (text: string) => void;
  onOpenTransfer?: () => void;
  onOpenSchedule?: () => void;
}

export const Customer360Sidebar: React.FC<Customer360SidebarProps> = ({
  customerId,
  storeId,
  threadId,
  guestName,
  guestPhone,
  onQuickSendMessage,
  onOpenTransfer,
  onOpenSchedule,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isBudgetPadOpen, setIsBudgetPadOpen] = useState(false);
  const [leadTitle, setLeadTitle] = useState("");
  const [leadBudget, setLeadBudget] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [funnelStage, setFunnelStage] = useState<string>("new");
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);

  const loadContext = useCallback(() => {
    if (!storeId || (!customerId && !threadId && !guestPhone && !guestName)) return;
    setLoading(true);
    setError(null);
    getCustomer360Context({
      data: {
        customerId: customerId || null,
        storeId,
        threadId: threadId || null,
        guestPhone: guestPhone || null,
        guestName: guestName || null,
      },
    })
      .then((res) => {
        setData(res);
        setInternalNotes(res?.threadContext?.internal_notes || "");
        setFunnelStage(res?.linkedLead?.status || "new");
      })
      .catch((err) => {
        console.error("Erro ao carregar Customer 360:", err);
        setError(err instanceof Error ? err.message : "Não foi possível carregar o perfil do cliente.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [customerId, storeId, threadId, guestPhone, guestName]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const handleSaveInternalNotes = async () => {
    if (!threadId) return;
    setIsSavingNotes(true);
    try {
      await assignChatThread({
        data: {
          threadId,
          internal_notes: internalNotes,
        },
      });
      toast.success("Notas internas atualizadas em tempo real.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar nota interna.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleFunnelStageChange = async (nextStage: string) => {
    setFunnelStage(nextStage);
    setIsUpdatingStage(true);
    try {
      const updatedLead = await updateCustomerFunnelStage({
        data: {
          storeId,
          leadId: data?.linkedLead?.id || null,
          threadId: threadId || null,
          customerId: data?.profile?.id || customerId || null,
          customerName: data?.profile?.full_name || guestName || "Cliente",
          customerPhone: data?.profile?.phone || guestPhone || "",
          stage: nextStage as any,
        },
      });
      setData((prev: any) => (prev ? { ...prev, linkedLead: updatedLead } : prev));
      toast.success("Etapa do funil atualizada!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar etapa do funil.");
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleSendOrCopyLink = (messageText: string) => {
    if (onQuickSendMessage) {
      onQuickSendMessage(messageText);
      toast.success("Comprovante/link inserido no chat!");
    } else {
      navigator.clipboard.writeText(messageText);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  if (!customerId && !threadId && !guestPhone && !guestName) {
    return (
      <div className="p-6 text-center text-muted-foreground text-xs">
        Nenhum contato selecionado.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
        <Loader2 className="size-5 animate-spin motion-reduce:animate-none text-primary" />
        <span className="text-xs">Carregando Customer 360...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center space-y-3">
        <AlertTriangle className="size-6 text-destructive mx-auto" />
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button
          type="button"
          variant="outline"
          onClick={loadContext}
          className="h-11 min-h-11 text-xs gap-2"
        >
          <RefreshCw className="size-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const {
    profile,
    metrics,
    orders = [],
    tickets = [],
    trips = [],
    credits = [],
    quotes = [],
    contracts = [],
  } = data;
  const resolvedCustomerId = profile?.id || customerId;

  return (
    <div className="space-y-5 p-4 text-xs font-sans">
      {/* 1. Dados Cadastrais Rápidos */}
      <div className="flex items-start gap-3 border-b border-border/50 pb-4">
        <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-extrabold text-sm shrink-0 border border-primary/20">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="size-full rounded-lg object-cover" />
          ) : (
            (profile?.full_name || guestName || "C")[0].toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="font-bold text-foreground truncate text-sm">
            {profile?.full_name || guestName || "Cliente Waesy"}
          </h4>
          {(profile?.phone || guestPhone) && (
            <p className="text-muted-foreground text-xs truncate flex items-center gap-1 font-mono">
              <Phone className="size-3 shrink-0" />
              {profile?.phone || guestPhone}
            </p>
          )}
          <p className="text-muted-foreground text-xs truncate flex items-center gap-1">
            <Mail className="size-3 shrink-0" />
            {profile?.email || "Sem e-mail cadastrado"}
          </p>
        </div>
      </div>

      {/* Tags de CRM e Status no Funil */}
      <div className="space-y-3 border-b border-border/50 pb-4">
        {threadId && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground block">Etiquetas de Atendimento (Tags)</span>
            <ThreadTagsPicker threadId={threadId} />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-2">
            <GitBranch className="size-3.5 text-primary" />
            Status no Funil Comercial
          </label>
          <select
            value={funnelStage}
            disabled={isUpdatingStage}
            onChange={(e) => handleFunnelStageChange(e.target.value)}
            className="h-11 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {FUNNEL_STAGES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {threadId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">Notas Internas do Atendimento</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSavingNotes}
                onClick={handleSaveInternalNotes}
                className="h-11 min-h-11 px-3 text-xs font-semibold gap-1 text-primary"
              >
                <Save className="size-3.5" />
                {isSavingNotes ? "Salvando..." : "Salvar Nota"}
              </Button>
            </div>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
              placeholder="Anotações visíveis apenas para a equipe..."
              className="w-full rounded-lg border border-border bg-background p-3 text-xs resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}
      </div>

      {/* 2. Resumo Financeiro (LTV, Última Compra, Inadimplência) */}
      <div className="space-y-2 border-b border-border/50 pb-4">
        <span className="text-xs font-bold text-foreground block">Resumo Financeiro (LTV & Carteira)</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/70 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <DollarSign className="size-3 text-emerald-600" />
              Total Gasto (LTV)
            </span>
            <p className="text-sm font-extrabold text-foreground">
              {formatBRL((metrics?.ltv_cents || 0) / 100)}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/70 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <Calendar className="size-3 text-primary" />
              Última Compra
            </span>
            <p className="text-xs font-bold text-foreground truncate">
              {metrics?.last_purchase_at ? formatDate(metrics.last_purchase_at) : "Nenhuma compra"}
            </p>
          </div>
        </div>

        <div
          className={`p-3 rounded-lg border flex items-center justify-between ${
            (metrics?.pending_debt_cents || 0) > 0
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          <span className="font-semibold text-xs">Pendências / Inadimplência</span>
          <span className="font-extrabold text-xs">
            {(metrics?.pending_debt_cents || 0) > 0
              ? formatBRL((metrics.pending_debt_cents || 0) / 100)
              : "Adimplente (R$ 0,00)"}
          </span>
        </div>
      </div>

  {/* Viagens & Reservas Ativas (Padrão Blis.ai / Voll) */}
  {(trips.length > 0 || credits.length > 0) && (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground flex items-center gap-2">
          <Plane className="size-3.5 text-sky-500" />
          Viagens & Reservas ({trips.length})
        </span>
        {credits.length > 0 && (
          <Badge variant="outline" className="text-xs font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
            {credits.length} crédito(s)
          </Badge>
        )}
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
        {trips.map((tr: any) => (
          <div key={tr.id} className="p-2 rounded-lg bg-card border border-border/80 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground truncate max-w-40">
                {tr.title || tr.destination_city || `Viagem #${tr.trip_number || (typeof tr.id === "string" ? tr.id.slice(0, 6) : "")}`}
              </span>
              <Badge variant="outline" className="text-xs px-2 py-0 h-4 uppercase">
                {tr.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>{tr.destination_city || "Destino"}</span>
              <span className="font-semibold text-foreground">
                {formatBRL((tr.total_cents || 0) / 100)}
              </span>
            </div>
          </div>
        ))}

        {credits.map((cr: any) => (
          <div key={cr.id} className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 block">
                Crédito {cr.airline} · PNR {cr.original_pnr}
              </span>
              <span className="text-xs text-muted-foreground">
                Expira: {cr.expires_at}
              </span>
            </div>
            <span className="font-extrabold text-emerald-600 text-xs">
              {formatBRL((cr.remaining_amount_cents || 0) / 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )}

 {/* Tickets / Chamados Abertos */}
 {tickets.length > 0 && (
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-2">
 <ShieldAlert className="size-3.5 text-destructive" />
 Ocorrências & SAC ({tickets.length})
 </span>
 </div>

 <div className="space-y-2 max-h-36 overflow-y-auto no-scrollbar pr-1">
 {tickets.map((t: any) => (
 <div key={t.id} className="p-2 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
 <div className="flex items-center justify-between">
 <span className="font-bold text-foreground truncate max-w-36">{t.title}</span>
 <Badge variant={t.status === "resolved" ? "secondary" : "destructive"} className="text-xs px-2 py-0 h-4">
 {t.status}
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
 </div>
 ))}
 </div>
 </div>
 )}

      {/* Orçamentos e Contratos */}
      {(quotes.length > 0 || contracts.length > 0) && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-foreground flex items-center gap-2">
            <FileText className="size-3.5 text-primary" />
            Orçamentos & Contratos ({quotes.length + contracts.length})
          </span>
          <div className="space-y-2 max-h-44 overflow-y-auto no-scrollbar pr-1">
            {quotes.map((q: any) => (
              <div key={q.id} className="p-3 rounded-lg bg-muted/20 border border-border/70 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-foreground truncate">
                    {q.title || q.destination || `Orçamento #${q.quote_number || String(q.id).slice(0, 6)}`}
                  </span>
                  <Badge variant="outline" className="text-xs uppercase">{q.status}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-foreground">
                    {formatBRL((q.total_cents || 0) / 100)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleSendOrCopyLink(
                        `Olá ${profile?.full_name || "Cliente"}! Segue o link da sua proposta/orçamento (${formatBRL((q.total_cents || 0) / 100)}): https://waesy.app/orcamento/${q.id}`,
                      )
                    }
                    className="h-11 min-h-11 px-3 text-xs gap-1"
                  >
                    <Send className="size-3.5" />
                    Reenviar Link
                  </Button>
                </div>
              </div>
            ))}
            {contracts.map((c: any) => (
              <div key={c.id} className="p-3 rounded-lg bg-muted/20 border border-border/70 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-foreground truncate">
                    {c.title || `Contrato #${c.contract_number || String(c.id).slice(0, 6)}`}
                  </span>
                  <Badge variant="outline" className="text-xs uppercase">{c.status}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-foreground">
                    {formatBRL((c.total_amount_cents || 0) / 100)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleSendOrCopyLink(
                        `Olá ${profile?.full_name || "Cliente"}! Acesse seu contrato digital para assinatura/consulta: https://waesy.app/contrato/${c.public_token || c.id}`,
                      )
                    }
                    className="h-11 min-h-11 px-3 text-xs gap-1"
                  >
                    <Send className="size-3.5" />
                    Reenviar Contrato
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico Recente de Compras */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="size-3.5 text-primary" />
            Histórico de Pedidos ({orders.length})
          </span>
        </div>

        {orders.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhum pedido anterior registrado nesta loja.</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
            {orders.map((o: any) => {
              const shortOrder = typeof o.id === "string" ? o.id.slice(0, 8) : "";
              return (
                <div key={o.id} className="p-3 rounded-lg bg-muted/20 border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground text-xs block font-mono">
                        #{shortOrder}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(o.created_at)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-xs text-foreground block">
                        {formatBRL((o.total_amount_cents || 0) / 100)}
                      </span>
                      <Badge variant="outline" className="text-xs px-2 py-0 uppercase">
                        {o.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleSendOrCopyLink(
                          `Olá ${profile?.full_name || "Cliente"}! Segue o comprovante/link do seu pedido #${shortOrder} (${formatBRL((o.total_amount_cents || 0) / 100)}): https://waesy.app/pedido/${o.id}`,
                        )
                      }
                      className="h-11 min-h-11 px-3 text-xs gap-1"
                    >
                      <Send className="size-3.5" />
                      Reenviar Link
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-11 min-h-11 px-3 text-xs gap-1"
                    >
                      <Link to="/workspace/pedidos">
                        <span>Detalhes</span>
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Ações Rápidas no Painel Lateral (1 Clique) */}
      <div className="pt-2 border-t border-border/50 space-y-2">
        <span className="text-xs font-bold text-foreground block">Ações Rápidas do Atendimento</span>

        <div className="grid grid-cols-1 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsBudgetPadOpen(true)}
            className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-primary/40 text-primary hover:bg-primary/10"
          >
            <Receipt className="size-4" />
            <span>Criar Pedido / Orçamento</span>
          </Button>

          {onOpenTransfer && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenTransfer}
              className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowRightLeft className="size-4" />
              <span>Transferir Atendimento</span>
            </Button>
          )}

          {onOpenSchedule && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenSchedule}
              className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Clock className="size-4" />
              <span>Agendar Retorno</span>
            </Button>
          )}

          {threadId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLeadTitle(`Oportunidade - ${profile?.full_name || guestName || "Cliente"}`);
                setIsCreatingLead(true);
              }}
              className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UserCheck className="size-4" />
              <span>Gerar Card de Lead no CRM</span>
            </Button>
          )}

          {resolvedCustomerId ? (
            <Button
              asChild
              variant="outline"
              className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link to="/workspace/clientes/$id" params={{ id: resolvedCustomerId }}>
                <User className="size-4 text-primary" />
                <span>Abrir Dossiê Completo</span>
                <ArrowUpRight className="size-3.5 ml-auto text-muted-foreground" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

  {/* Modal de Conversão Rápida em Lead */}
  {isCreatingLead && threadId && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-bold text-foreground text-sm">Criar Lead no Funil Comercial</h3>
          <button
            type="button"
            onClick={() => setIsCreatingLead(false)}
            className="text-muted-foreground hover:text-foreground h-11 min-h-11 w-11 flex items-center justify-center rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Título da Oportunidade</label>
            <input
              type="text"
              value={leadTitle}
              onChange={(e) => setLeadTitle(e.target.value)}
              className="w-full h-11 min-h-11 px-3 rounded-lg border border-border bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ex: Cotação Pacote Família"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Orçamento Estimado (R$)</label>
            <input
              type="number"
              value={leadBudget}
              onChange={(e) => setLeadBudget(e.target.value)}
              className="w-full h-11 min-h-11 px-3 rounded-lg border border-border bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ex: 5000"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Notas Rápidas / Demanda</label>
            <textarea
              value={leadNotes}
              onChange={(e) => setLeadNotes(e.target.value)}
              rows={3}
              className="w-full p-2 rounded-lg border border-border bg-background text-xs resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="O que o cliente está buscando..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => setIsCreatingLead(false)} className="h-11 min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
            Cancelar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={async () => {
              if (!leadTitle.trim()) return;
              try {
                const { convertChatThreadToCrmLead } = await import("@/services/chat.functions");
                await convertChatThreadToCrmLead({
                  data: {
                    threadId,
                    leadTitle: leadTitle.trim(),
                    estimatedBudget: leadBudget ? Number(leadBudget) : undefined,
                    notes: leadNotes.trim() || undefined,
                  },
                });
                setIsCreatingLead(false);
                toast.success("Lead criado com sucesso no CRM!");
              } catch (err: any) {
                toast.error(err.message || "Erro ao criar lead.");
              }
            }}
            className="h-11 min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            Confirmar e Criar
          </Button>
        </div>
      </div>
    </div>
  )}

  {/* Drawer de 70% com Rolagem Interna: Bloco Comercial / Orçamento / Fatura Pix */}
  <CommercialBudgetPadSheet
    open={isBudgetPadOpen}
    onOpenChange={setIsBudgetPadOpen}
    initialCustomerId={customerId}
    initialClientData={{
      name: profile?.full_name || guestName || "",
      phone: profile?.phone || guestPhone || "",
      email: profile?.email || "",
    }}
  />
</div>

);
};
