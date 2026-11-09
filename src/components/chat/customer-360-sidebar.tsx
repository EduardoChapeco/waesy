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
  updateCustomerFunnelStage, updateCustomerProfileFromChat, updateThreadAiHandoffMode, createSupportTicketFromChat, addSupportTicketStep,
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editCity, setEditCity] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [handoffMode, setHandoffMode] = useState<"ai_triage" | "human_queue" | "human_active">("ai_triage");
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDesc, setNewTicketDesc] = useState("");
  const [newTicketPriority, setNewTicketPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [stepInputByTicket, setStepInputByTicket] = useState<Record<string, string>>({});

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
        setEditName(res?.profile?.full_name || guestName || "");
        setEditPhone(res?.profile?.phone || guestPhone || "");
        setEditEmail(res?.profile?.email || "");
        setEditCpf(res?.profile?.document_cpf || "");
        setEditCity(res?.profile?.city || "");
        if ((res?.threadContext as any)?.metadata?.handoff_mode) setHandoffMode((res.threadContext as any).metadata.handoff_mode);
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
  const handleSaveCustomerProfile = async () => {
    if (!editName.trim()) { toast.error("Informe o nome do cliente."); return; }
    setIsSavingProfile(true);
    try {
      const res = await updateCustomerProfileFromChat({ data: { customerId: data?.profile?.id || customerId || null, threadId: threadId || null, fullName: editName.trim(), phone: editPhone.trim() || null, email: editEmail.trim() || null, documentCpf: editCpf.trim() || null, city: editCity.trim() || null } });
      setData((prev: any) => (prev ? { ...prev, profile: { ...(prev.profile || {}), ...res.profile } } : prev));
      setIsEditingProfile(false);
      toast.success("Dados do cliente atualizados!");
    } catch (err: any) { toast.error(err?.message || "Erro ao atualizar cliente."); } finally { setIsSavingProfile(false); }
  };
  const handleChangeHandoff = async (mode: "ai_triage" | "human_queue" | "human_active") => {
    setHandoffMode(mode);
    if (!threadId) return;
    try {
      await updateThreadAiHandoffMode({ data: { threadId, handoffMode: mode, aiAutoReplyEnabled: mode === "ai_triage" } });
      toast.success(mode === "ai_triage" ? "IA ativada na recepção desta conversa." : mode === "human_queue" ? "Conversa na fila humana." : "Atendimento assumido pelo humano (IA pausada).");
    } catch (err: any) { toast.error(err?.message || "Erro ao alternar modo IA/Humano."); }
  };
  const handleCreateDemandTicket = async () => {
    if (!threadId || !newTicketTitle.trim() || !newTicketDesc.trim()) { toast.error("Preencha o título e a descrição da demanda."); return; }
    setIsSavingTicket(true);
    try {
      const created = await createSupportTicketFromChat({ data: { threadId, customerId: data?.profile?.id || customerId || null, title: newTicketTitle.trim(), description: newTicketDesc.trim(), priority: newTicketPriority } });
      setData((prev: any) => (prev ? { ...prev, tickets: [created, ...(prev.tickets || [])] } : prev));
      setNewTicketTitle(""); setNewTicketDesc(""); setIsCreatingTicket(false);
      toast.success("Demanda aberta e link enviado no chat!");
    } catch (err: any) { toast.error(err?.message || "Erro ao criar demanda."); } finally { setIsSavingTicket(false); }
  };
  const handleAddTicketStep = async (ticketId: string, customLabel?: string, nextStatus?: "open" | "under_review" | "action_required" | "resolved") => {
    const label = (customLabel || stepInputByTicket[ticketId] || "").trim();
    if (!label) { toast.error("Informe a descrição da etapa."); return; }
    try {
      const res = await addSupportTicketStep({ data: { ticketId, threadId: threadId || null, stepLabel: label, nextStatus } });
      setStepInputByTicket((prev) => ({ ...prev, [ticketId]: "" }));
      setData((prev: any) => prev ? { ...prev, tickets: (prev.tickets || []).map((t: any) => (t.id === ticketId ? { ...t, ...res.ticket, steps: res.steps } : t)) } : prev);
      toast.success(nextStatus === "resolved" ? "Chamado resolvido e link CSAT enviado ao cliente!" : "Etapa adicionada à linha do tempo do chamado!");
    } catch (err: any) { toast.error(err?.message || "Erro ao adicionar etapa."); }
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
        <Button type="button" size="sm" onClick={() => setIsEditingProfile((prev) => !prev)} className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold bg-muted text-foreground hover:bg-foreground hover:text-background cursor-pointer">
          {isEditingProfile ? "Fechar" : "Editar"}
        </Button>
      </div>
      {isEditingProfile && (
        <div className="p-3 rounded-xl bg-muted/50 space-y-2">
          <p className="text-xs font-bold text-foreground">Editar Cadastro do Cliente</p>
          <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome completo" className="w-full h-11 rounded-lg bg-background px-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
          <div className="grid grid-cols-2 gap-2">
            <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="WhatsApp / Telefone" className="w-full h-11 rounded-lg bg-background px-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
            <input value={editCpf} onChange={(e) => setEditCpf(e.target.value)} placeholder="CPF / CNPJ" className="w-full h-11 rounded-lg bg-background px-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="E-mail" className="w-full h-11 rounded-lg bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
            <input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Cidade / Bairro" className="w-full h-11 rounded-lg bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
          </div>
          <Button type="button" disabled={isSavingProfile} onClick={handleSaveCustomerProfile} className="w-full h-11 min-h-11 rounded-lg text-xs font-bold bg-primary text-primary-foreground cursor-pointer">
            {isSavingProfile ? "Salvando..." : "Salvar Cadastro"}
          </Button>
        </div>
      )}
      {threadId && (
        <div className="p-3 rounded-xl bg-muted/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Estágio IA → Humano</span>
            <Badge variant="secondary" className="text-xs">{handoffMode === "ai_triage" ? "IA Atendendo" : handoffMode === "human_queue" ? "Fila Humana" : "Humano Ativo"}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
            <button type="button" onClick={() => handleChangeHandoff("ai_triage")} className={`h-11 min-h-11 rounded-lg px-2 text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${handoffMode === "ai_triage" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>1. IA 1º</button>
            <button type="button" onClick={() => handleChangeHandoff("human_queue")} className={`h-11 min-h-11 rounded-lg px-2 text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${handoffMode === "human_queue" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>2. Fila</button>
            <button type="button" onClick={() => handleChangeHandoff("human_active")} className={`h-11 min-h-11 rounded-lg px-2 text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${handoffMode === "human_active" ? "bg-foreground text-background" : "bg-card text-foreground"}`}>3. Humano</button>
          </div>
        </div>
      )}

      {/* Tags de CRM e Status no Funil */}
      <div className="space-y-3 border-b border-border/50 pb-4">
        {threadId && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground block">Etiquetas de Atendimento (Tags)</span>
            <ThreadTagsPicker threadId={threadId} tags={data?.thread?.tags || []} onTagsChange={(newTags) => setData((prev: any) => prev ? { ...prev, thread: { ...(prev.thread || {}), tags: newTags } } : prev)} />
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
 {/* Tickets / Chamados Abertos & Gestão de Demandas */}
 {(true || tickets.length > 0) && (
 <div className="space-y-2 border-b border-border/50 pb-4">
 <div className="flex items-center justify-between gap-2">
 <span className="text-xs font-bold text-foreground flex items-center gap-2">
 <ShieldAlert className="size-3.5 text-primary" />
 Demandas & Tickets ({tickets.length})
 </span>
 {threadId && (
   <Button type="button" size="sm" onClick={() => setIsCreatingTicket((prev) => !prev)} className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground cursor-pointer">
     {isCreatingTicket ? "Cancelar" : "+ Demanda"}
   </Button>
 )}
 </div>
 {isCreatingTicket && (
   <div className="p-3 rounded-xl bg-muted/50 space-y-2">
     <input value={newTicketTitle} onChange={(e) => setNewTicketTitle(e.target.value)} placeholder="Título da demanda ou chamado..." className="w-full h-11 rounded-lg bg-background px-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
     <textarea value={newTicketDesc} onChange={(e) => setNewTicketDesc(e.target.value)} placeholder="Descrição pública para acompanhamento do cliente..." rows={2} className="w-full rounded-lg bg-background p-2 text-xs text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
     <div className="flex items-center gap-2">
       <select value={newTicketPriority} onChange={(e) => setNewTicketPriority(e.target.value as any)} className="h-11 rounded-lg bg-background px-3 text-xs font-semibold text-foreground flex-1">
         <option value="normal">Prioridade Normal</option>
         <option value="high">Prioridade Alta</option>
         <option value="urgent">Urgente</option>
       </select>
       <Button type="button" disabled={isSavingTicket} onClick={handleCreateDemandTicket} className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold bg-foreground text-background cursor-pointer">
         {isSavingTicket ? "Criando..." : "Criar Ticket"}
       </Button>
     </div>
   </div>
 )}
 <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar pr-1">
 {tickets.map((t: any) => {
   let parsedSteps: Array<{ id: string; label: string }> = Array.isArray(t.steps) ? t.steps : [];
   if (parsedSteps.length === 0 && t.resolution_notes && String(t.resolution_notes).startsWith("{")) {
     try { const parsed = JSON.parse(String(t.resolution_notes)); if (Array.isArray(parsed.steps)) parsedSteps = parsed.steps; } catch {}
   }
   const origin = typeof window !== "undefined" ? window.location.origin : "https://waesy.app";
   const publicTicketUrl = `${origin}/chamado/${t.id}`;
   return (
     <div key={t.id} className="p-3 rounded-xl bg-muted/40 text-xs space-y-2">
       <div className="flex items-center justify-between gap-2">
         <span className="font-bold text-foreground truncate">{t.title}</span>
         <Badge variant={t.status === "resolved" ? "secondary" : "default"} className="text-xs">{t.status === "resolved" ? "Resolvido" : "Em Aberto"}</Badge>
       </div>
       {parsedSteps.length > 0 && (
         <div className="space-y-1 pl-2 border-l-2 border-primary/40">
           {parsedSteps.map((st) => (
             <p key={st.id} className="text-xs text-muted-foreground truncate">• {st.label}</p>
           ))}
         </div>
       )}
       <div className="flex items-center gap-1">
         <input
           value={stepInputByTicket[t.id] || ""}
           onChange={(e) => setStepInputByTicket((prev) => ({ ...prev, [t.id]: e.target.value }))}
           placeholder="Adicionar etapa na timeline..."
           className="flex-1 h-11 rounded-lg bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
         />
         <Button type="button" size="sm" onClick={() => handleAddTicketStep(t.id)} className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground cursor-pointer">
           + Etapa
         </Button>
       </div>
       <div className="grid grid-cols-2 gap-1 pt-1">
         <button type="button" onClick={() => handleSendOrCopyLink(`Acompanhe a linha do tempo do seu chamado "${t.title}" em tempo real: ${publicTicketUrl}`)} className="h-11 min-h-11 rounded-lg bg-card text-foreground text-xs font-bold px-2 flex items-center justify-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary">
           <Send className="size-3" />
           <span>Enviar Link</span>
         </button>
         <button type="button" onClick={() => handleAddTicketStep(t.id, "Atendimento finalizado e solucionado", "resolved")} className="h-11 min-h-11 rounded-lg bg-foreground text-background text-xs font-bold px-2 flex items-center justify-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary">
           <span>Resolver & CSAT</span>
         </button>
       </div>
     </div>
   );
 })}
 </div>
 </div>
 )}
 {false && tickets.length > 0 && (
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
