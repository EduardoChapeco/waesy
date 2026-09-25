import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Link as LinkIcon,
  Paperclip,
  ChevronRight,
  ShieldCheck,
  Headphones,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileAttachmentUpload } from "@/components/ui/file-attachment-upload";
import { EmptyState } from "@/components/state/states";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { getStoreSettings } from "@/services/store.functions";
import {
  listSupportTickets,
  getSupportTicketDetails,
  createSupportTicket,
  addSupportTicketMessage,
  updateSupportTicketStatus,
  type SupportTicketItem,
  type SupportMessageItem,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/services/support-tickets.functions";

import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet } from "@/components/workspace/workspace-dashboard-sheet";

export const Route = createFileRoute("/workspace/suporte")({
  head: () => ({ meta: [{ title: "Suporte Técnico | Workspace Waesy" }] }),
  loader: async () => {
    try {
    const store = await getStoreSettings().catch(() => null);
    const storeId = store?.id || "";
    const tickets = storeId
      ? await listSupportTickets({ data: { store_id: storeId } }).catch(() => [])
      : [];
    return { store, initialTickets: tickets as SupportTicketItem[] };
    } catch (err) {
      console.error("[loader:workspace.suporte] Unhandled loader error:", err);
      return { store: null, initialTickets: null };
    }
  },
  component: WorkspaceSupportPage,
});

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  finance: "Financeiro & Taxas",
  system_bug: "Erro no Sistema",
  integration: "Integrações & Domínio",
  tourism: "Módulo Turismo / Excursões",
  account: "Conta & Acessos",
  other: "Outras Dúvidas",
};

const STATUS_LABELS: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: "Aberto", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  in_progress: { label: "Em Análise", className: "bg-sky-500/10 text-sky-600 border-sky-500/30" },
  resolved: { label: "Resolvido", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  closed: { label: "Encerrado", className: "bg-muted text-muted-foreground border-border" },
};

function WorkspaceSupportPage() {
  const { store, initialTickets } = (Route.useLoaderData as any)();
  const storeId = store?.id || "";

  const [tickets, setTickets] = useState<SupportTicketItem[]>(initialTickets || []);
  const [activeTab, setActiveTab] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  // Novo Ticket Sheet
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("other");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [message, setMessage] = useState("");
  const [linkType, setLinkType] = useState<"none" | "tour" | "order" | "customer">("none");
  const [linkRef, setLinkRef] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [slaMinutes, setSlaMinutes] = useState(1440);
  const [submitting, setSubmitting] = useState(false);

  // Detalhe / Thread Drawer
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<SupportTicketItem | null>(null);
  const [threadMessages, setThreadMessages] = useState<SupportMessageItem[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const reloadTickets = async () => {
    if (!storeId) return;
    try {
      const data = await listSupportTickets({
        data: { store_id: storeId },
      });
      setTickets(data);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar chamados");
    }
  };

  const handleOpenTicketDetails = async (ticketId: string) => {
    try {
      setSelectedTicketId(ticketId);
      const data = await getSupportTicketDetails({ data: { ticket_id: ticketId } });
      setActiveTicket(data.ticket);
      setThreadMessages(data.messages);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar detalhes do chamado");
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return toast.error("Informe o assunto do chamado");
    if (!message.trim()) return toast.error("Descreva sua solicitação");

    try {
      setSubmitting(true);
      await createSupportTicket({
        data: {
          store_id: storeId,
          subject: subject.trim(),
          category,
          priority,
          initial_message: message.trim(),
          customer_name: customerName.trim() || undefined,
          order_id: linkType === "order" && linkRef.trim() ? linkRef.trim() : undefined,
          tour_id: linkType === "tour" && linkRef.trim() ? linkRef.trim() : undefined,
          customer_id: linkType === "customer" && linkRef.trim() ? linkRef.trim() : undefined,
          attachment_url: attachmentUrl.trim() || undefined,
          sla_minutes: slaMinutes,
        },
      });

      toast.success("Chamado de suporte aberto!");
      setNewModalOpen(false);
      setSubject("");
      setMessage("");
      setLinkType("none");
      setLinkRef("");
      setCustomerName("");
      setAttachmentUrl("");
      reloadTickets();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao abrir chamado");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicketId) return;

    try {
      setSendingReply(true);
      const newMsg = await addSupportTicketMessage({
        data: {
          ticket_id: selectedTicketId,
          message: replyText.trim(),
        },
      });

      setThreadMessages((prev) => [...prev, newMsg as any]);
      setReplyText("");
      toast.success("Resposta enviada!");
      reloadTickets();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar mensagem");
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!selectedTicketId) return;
    try {
      await updateSupportTicketStatus({
        data: { ticket_id: selectedTicketId, status },
      });
      toast.success("Status atualizado!");
      if (activeTicket) {
        setActiveTicket({ ...activeTicket, status });
      }
      reloadTickets();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar status");
    }
  };

  // Contadores
  const openCount = useMemo(() => tickets.filter((t) => t.status === "open").length, [tickets]);
  const inProgressCount = useMemo(() => tickets.filter((t) => t.status === "in_progress").length, [tickets]);
  const resolvedCount = useMemo(() => tickets.filter((t) => t.status === "resolved").length, [tickets]);

  // Filtro
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (activeTab !== "all" && t.status !== activeTab) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = t.subject.toLowerCase().includes(q);
        const matchesCode = t.ticket_code?.toLowerCase().includes(q) || String(t.ticket_number).includes(q);
        const matchesCustomer = t.customer_name?.toLowerCase().includes(q);
        if (!matchesSubject && !matchesCode && !matchesCustomer) return false;
      }
      return true;
    });
  }, [tickets, activeTab, categoryFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100dvh-8.5rem)] max-w-7xl mx-auto px-0 sm:px-4 md:px-0 w-full">
      {/* ── 1. Barra Canônica de Operação Silenciosa ── */}
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: "all", label: "Todos", icon: Headphones, count: tickets.length },
          { id: "open", label: "Abertos", icon: Clock, count: openCount },
          { id: "in_progress", label: "Em Análise", icon: MessageSquare, count: inProgressCount },
          { id: "resolved", label: "Resolvidos", icon: CheckCircle2, count: resolvedCount },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as any)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar por assunto, protocolo ou cliente..."
        filters={[
          {
            id: "category",
            label: "Categoria",
            value: categoryFilter,
            options: [
              { label: "Todas Categorias", value: "all" },
              { label: "Módulo Turismo", value: "tourism" },
              { label: "Financeiro & Taxas", value: "finance" },
              { label: "Erro no Sistema", value: "system_bug" },
              { label: "Integrações & Domínio", value: "integration" },
              { label: "Conta & Acessos", value: "account" },
              { label: "Outras Dúvidas", value: "other" },
            ],
            onChange: setCategoryFilter,
          },
        ]}
        onMetricsClick={() => setIsDashboardOpen(true)}
        metricsBadge={openCount > 0 ? `${openCount} abertos` : undefined}
        primaryAction={{
          label: "Novo Chamado",
          icon: Plus,
          onClick: () => setNewModalOpen(true),
        }}
      />

      {/* ── 2. Lista de Chamados ── */}
      <div className="space-y-2">
        {filteredTickets.map((t) => {
          const st = STATUS_LABELS[t.status] || STATUS_LABELS.open;
          return (
            <div
              key={t.id}
              onClick={() => handleOpenTicketDetails(t.id)}
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/30 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MessageSquare className="size-4" />
                </div>

                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      {t.ticket_code || `#${t.ticket_number}`}
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {t.subject}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                    <span>{CATEGORY_LABELS[t.category]}</span>
                    <span>•</span>
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    {t.customer_name && (
                      <>
                        <span>•</span>
                        <span>{t.customer_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="outline" className={`text-[10px] border font-semibold ${st.className}`}>
                  {st.label}
                </Badge>
                <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          );
        })}

        {filteredTickets.length === 0 && (
          <EmptyState
            title="Nenhum chamado encontrado"
            description={
              activeTab === "all"
                ? "Sua loja ainda não abriu chamados técnicos. Quando precisar de suporte de engenharia ou fiscal, clique em Novo Chamado."
                : "Não há chamados com este status no momento."
            }
          />
        )}
      </div>

      {/* ── 3. Painel de Métricas / Dashboard Sob Demanda ── */}
      <WorkspaceDashboardSheet
        open={isDashboardOpen}
        onOpenChange={setIsDashboardOpen}
        title="Painel de Suporte & SLAs"
        description="Indicadores de tempo de atendimento, fila de resolução e satisfação."
        metrics={[
          {
            id: "open",
            label: "Aguardando Análise",
            value: openCount,
            icon: Clock,
            trend: openCount > 0 ? { value: "Abertos", direction: "neutral" } : undefined,
            description: "Chamados recém-abertos aguardando triagem",
          },
          {
            id: "in_progress",
            label: "Em Atendimento",
            value: inProgressCount,
            icon: MessageSquare,
            description: "Demandas em análise ativa pela equipe de suporte",
          },
          {
            id: "resolved",
            label: "Resolvidos",
            value: resolvedCount,
            icon: CheckCircle2,
            trend: { value: "Finalizados", direction: "up" },
            description: "Chamados com solução validada",
          },
          {
            id: "total",
            label: "Total de Chamados",
            value: tickets.length,
            icon: LifeBuoy,
            description: "Histórico acumulado de chamados da loja",
          },
          {
            id: "sla",
            label: "SLA Médio de Atendimento",
            value: "24h",
            icon: ShieldCheck,
            description: "Compromisso de nível de serviço garantido",
          },
        ]}
        breakdown={{
          title: "Chamados por Categoria",
          items: [
            {
              label: "Módulo Turismo",
              value: tickets.filter((t) => t.category === "tourism").length,
              total: Math.max(tickets.length, 1),
              color: "bg-sky-500",
            },
            {
              label: "Financeiro & Taxas",
              value: tickets.filter((t) => t.category === "finance").length,
              total: Math.max(tickets.length, 1),
              color: "bg-emerald-500",
            },
            {
              label: "Erro no Sistema",
              value: tickets.filter((t) => t.category === "system_bug").length,
              total: Math.max(tickets.length, 1),
              color: "bg-amber-500",
            },
            {
              label: "Integrações",
              value: tickets.filter((t) => t.category === "integration").length,
              total: Math.max(tickets.length, 1),
              color: "bg-indigo-500",
            },
            {
              label: "Outras Dúvidas",
              value: tickets.filter((t) => t.category === "other" || t.category === "account").length,
              total: Math.max(tickets.length, 1),
              color: "bg-slate-400",
            },
          ],
        }}
      />

      {/* ── 4. Sheet Lateral de Novo Chamado ── */}
      <Sheet open={newModalOpen} onOpenChange={setNewModalOpen}>
        <SheetContent
          side="right" size="wide" className="sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-2xl w-full max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-l p-0 overflow-y-auto no-scrollbar bg-card flex flex-col h-full"
        >
          <SheetHeader className="px-6 py-4 border-b border-border/60 bg-muted/20">
            <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <LifeBuoy className="size-4 text-primary" />
              Novo Chamado de Suporte
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleCreateTicket} className="flex-1 flex flex-col justify-between p-0">
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Categoria *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value="tourism">Módulo Turismo / Excursões</option>
                    <option value="finance">Financeiro & Pagamentos</option>
                    <option value="system_bug">Bug / Erro Visual ou de Operação</option>
                    <option value="integration">Integrações & Domínio Próprio</option>
                    <option value="account">Acesso & Usuários</option>
                    <option value="other">Outras Dúvidas</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Prioridade *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none"
                  >
                    <option value="low">Baixa</option>
                    <option value="normal">Normal (24h)</option>
                    <option value="high">Alta (Bloqueia operação - 4h)</option>
                    <option value="urgent">Urgente / SEV-1 (2h)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Assunto *</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Dúvida sobre emissão de manifesto ANTT ou erro em reserva"
                  className="h-10 text-xs rounded-xl"
                  required
                  autoFocus
                />
              </div>

              <div className="p-4 rounded-xl border border-border/70 bg-muted/10 space-y-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <LinkIcon className="size-3.5 text-primary" />
                  Vínculo com Operação / Entidade (Opcional)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Tipo de Vínculo</label>
                    <select
                      value={linkType}
                      onChange={(e) => setLinkType(e.target.value as any)}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none"
                    >
                      <option value="none">Nenhum (Dúvida Geral)</option>
                      <option value="tour">Pacote de Viagem / Excursão</option>
                      <option value="order">Pedido de Compra</option>
                      <option value="customer">Passageiro / Cliente</option>
                    </select>
                  </div>

                  {linkType !== "none" && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">ID / Referência do Vínculo</label>
                      <Input
                        value={linkRef}
                        onChange={(e) => setLinkRef(e.target.value)}
                        placeholder="UUID ou Código da entidade"
                        className="h-9 text-xs rounded-lg font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Nome do Passageiro / Cliente</label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">SLA Máximo Desejado</label>
                    <select
                      value={slaMinutes}
                      onChange={(e) => setSlaMinutes(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none"
                    >
                      <option value={120}>2 Horas (SEV-1 Emergencial)</option>
                      <option value={240}>4 Horas (Operação Crítica)</option>
                      <option value={1440}>24 Horas (Padrão)</option>
                      <option value={2880}>48 Horas (Baixa Severidade)</option>
                    </select>
                  </div>
                </div>
              </div>

              <FileAttachmentUpload
                value={attachmentUrl}
                onChange={setAttachmentUrl}
                onRemove={() => setAttachmentUrl("")}
                label="Anexo / Evidência do Chamado (Opcional)"
                helperText="Envie um print de tela, foto, PDF ou log de erro (máx. 20MB)"
                bucket="cms-media"
              />

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Mensagem Detalhada *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva o que aconteceu ou o que precisa de suporte de forma clara..."
                  className="w-full h-32 p-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none resize-none leading-relaxed"
                  required
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewModalOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting || !subject.trim() || !message.trim()}
                className="h-10 px-5 rounded-xl text-xs font-bold cursor-pointer"
              >
                {submitting ? "Abrindo chamado..." : "Enviar Solicitação"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── 5. Drawer de Thread de Atendimento ── */}
      <Sheet open={Boolean(selectedTicketId)} onOpenChange={(open) => !open && setSelectedTicketId(null)}>
        <SheetContent
          side="right" size="wide" className="sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-2xl w-full max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-l p-0 flex flex-col h-full bg-card"
        >
          <SheetHeader className="px-6 py-4 border-b border-border/60 bg-muted/20">
            <SheetTitle className="text-base font-bold text-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-primary font-bold">
                  {activeTicket?.ticket_code || `#${activeTicket?.ticket_number}`}
                </span>
                <span className="truncate max-w-xs">{activeTicket?.subject}</span>
              </div>

              {activeTicket && (
                <Badge
                  variant="outline"
                  className={`text-[10px] ${STATUS_LABELS[activeTicket.status]?.className}`}
                >
                  {STATUS_LABELS[activeTicket.status]?.label}
                </Badge>
              )}
            </SheetTitle>

            {activeTicket && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                  <span>{CATEGORY_LABELS[activeTicket.category]}</span>
                  {activeTicket.customer_name && (
                    <>
                      <span>•</span>
                      <span>Cliente: {activeTicket.customer_name}</span>
                    </>
                  )}
                  {activeTicket.sla_due_at && (
                    <>
                      <span>•</span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        SLA: {new Date(activeTicket.sla_due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </>
                  )}
                </div>

                {activeTicket.status !== "resolved" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus("resolved")}
                    className="h-7 px-2.5 text-[11px] font-semibold gap-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    <CheckCircle2 className="size-3" /> Marcar como Resolvido
                  </Button>
                )}
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
            {threadMessages.map((m) => (
              <div
                key={m.id}
                className={`p-3.5 rounded-xl text-xs space-y-1 max-w-[85%] ${
                  m.is_staff_reply
                    ? "bg-primary/10 text-foreground border border-primary/20 ml-0 mr-auto"
                    : "bg-muted/40 text-foreground border border-border/60 ml-auto mr-0"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{m.is_staff_reply ? "Equipe de Suporte Waesy" : "Você (Operador)"}</span>
                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                {m.attachment_url && (
                  <div className="pt-1">
                    <a
                      href={m.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary underline hover:text-primary/80 flex items-center gap-1"
                    >
                      <Paperclip className="size-3" /> Ver Anexo
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendReply} className="p-4 border-t border-border/60 bg-muted/10 flex items-center gap-2">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Digite sua resposta ou atualização..."
              className="h-11 rounded-xl text-xs flex-1"
            />
            <Button
              type="submit"
              disabled={sendingReply || !replyText.trim()}
              className="size-11 rounded-xl shrink-0 cursor-pointer shadow-xs"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
