import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { LifeBuoy, Plus, MessageSquare, Clock, CheckCircle2, Send, Link as LinkIcon, Paperclip, ChevronRight, ShieldCheck, Headphones, Kanban, Table2, ListTodo, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileAttachmentUpload } from "@/components/ui/file-attachment-upload";
import { EmptyState } from "@/components/state/states";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { getStoreSettings } from "@/services/store.functions";
import {
  listSupportTickets,
  getSupportTicketDetails,
  createSupportTicket,
  addSupportTicketMessage,
  updateSupportTicketStatus,
  listCustomerSuccessOnboardingSheet,
  type SupportTicketItem,
  type SupportMessageItem,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type CustomerSuccessSheetRowDTO,
} from "@/services/support-tickets.functions";
import { createLinkedCustomerTask } from "@/services/chat.functions";
import {
  CustomerIdentityTagPill,
  SAC_FUNCTION_ROLES,
  type SacFunctionRoleKey,
} from "@/lib/entity-trace-hash";
import { CustomerSuccessOnboardingSheet } from "@/components/support/CustomerSuccessOnboardingSheet";

import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet } from "@/components/workspace/workspace-dashboard-sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/suporte")({
  head: () => ({ meta: [{ title: "Suporte, SAC & Customer Success | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const store = await getStoreSettings().catch(() => null);
      const storeId = store?.id || "";
      const [tickets, sheetRows] = await Promise.all([
        storeId ? listSupportTickets({ data: { store_id: storeId } }).catch(() => []) : [],
        storeId ? listCustomerSuccessOnboardingSheet({ data: { store_id: storeId } }).catch(() => []) : [],
      ]);
      return {
        store,
        initialTickets: tickets as SupportTicketItem[],
        initialSheetRows: sheetRows as CustomerSuccessSheetRowDTO[],
      };
    } catch (err) {
      console.error("[loader:workspace.suporte] Unhandled loader error:", err);
      return { store: null, initialTickets: null, initialSheetRows: [] };
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
  open: { label: "Aberto", className: "bg-warning/10 text-warning-strong border-warning/30" },
  in_progress: { label: "Em Análise", className: "bg-sky-500/10 text-sky-600 border-sky-500/30" },
  resolved: { label: "Resolvido", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  closed: { label: "Encerrado", className: "bg-muted text-muted-foreground border-border" },
};

function WorkspaceSupportPage() {
  const { store, initialTickets, initialSheetRows } = (Route.useLoaderData as any)();
  const storeId = store?.id || "";

  const [tickets, setTickets] = useState<SupportTicketItem[]>(initialTickets || []);
  const [sheetRows, setSheetRows] = useState<CustomerSuccessSheetRowDTO[]>(initialSheetRows || []);
  const [operationMode, setOperationMode] = useState<"pepinos_list" | "pepinos_kanban" | "cs_sheet">("pepinos_list");
  const [roleFilter, setRoleFilter] = useState<"all" | SacFunctionRoleKey>("all");
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
      const [data, updatedSheet] = await Promise.all([
        listSupportTickets({ data: { store_id: storeId } }),
        listCustomerSuccessOnboardingSheet({ data: { store_id: storeId } }),
      ]);
      setTickets(data);
      setSheetRows(updatedSheet);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar chamados");
    }
  };

  const handleQuickCreateTaskFromTicket = async (t: SupportTicketItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!storeId) return;
    try {
      await createLinkedCustomerTask({
        data: {
          storeId,
          threadId: t.thread_id || null,
          customerId: t.customer_id || null,
          customerName: t.customer_name || "Cliente SAC",
          customerPhone: t.customer_phone || null,
          customerAvatarUrl: t.customer_avatar_url || null,
          title: `Resolver SAC ${t.ticket_code || `#${t.ticket_number}`}: ${t.subject}`,
          priority: t.priority === "urgent" ? "urgent" : t.priority === "high" ? "high" : "medium",
          assignedSector: (t.sac_function_role as SacFunctionRoleKey) || "sac_pepinos",
          entityType: t.tour_id ? "trip" : t.order_id ? "order" : "ticket",
          entityId: t.tour_id || t.order_id || t.id,
          entityCode: t.entity_trace_hash || t.ticket_code || null,
          isMyDay: true,
        },
      });
      toast.success(`Tarefa sincronizada em Tarefas e no Chat (${t.trace_hash || t.ticket_code})!`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar tarefa a partir do chamado.");
    }
  };

  const handleQuickMoveTicketStatus = async (t: SupportTicketItem, nextStatus: TicketStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateSupportTicketStatus({
        data: { ticket_id: t.id, status: nextStatus },
      });
      setTickets((prev) => prev.map((item) => (item.id === t.id ? { ...item, status: nextStatus } : item)));
      toast.success("Etapa do chamado atualizada!");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível mover chamado.");
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
      if (roleFilter !== "all" && t.sac_function_role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = t.subject.toLowerCase().includes(q);
        const matchesCode = t.ticket_code?.toLowerCase().includes(q) || String(t.ticket_number).includes(q);
        const matchesCustomer = t.customer_name?.toLowerCase().includes(q);
        const matchesHash = t.trace_hash?.toLowerCase().includes(q) || t.entity_trace_hash?.toLowerCase().includes(q);
        if (!matchesSubject && !matchesCode && !matchesCustomer && !matchesHash) return false;
      }
      return true;
    });
  }, [tickets, activeTab, categoryFilter, roleFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-4 min-h-96 w-full px-0 sm:px-4 md:px-0 w-full">
      {/* ── 0. Seletor de Modo Operacional (Divisão Pepinos/SAC vs. Customer Success Sheet) ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-border/70 bg-card">
        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Modo de Operação do Suporte e SAC">
          <button
            type="button"
            role="tab"
            aria-selected={operationMode === "pepinos_list"}
            onClick={() => setOperationMode("pepinos_list")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              operationMode === "pepinos_list"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Headphones className="size-3.5" />
            <span>Pepinos & Reclamações (Lista)</span>
            <span className="px-2 py-1 rounded bg-background/20 font-mono text-xs">
              {tickets.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={operationMode === "pepinos_kanban"}
            onClick={() => setOperationMode("pepinos_kanban")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              operationMode === "pepinos_kanban"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Kanban className="size-3.5" />
            <span>Kanban de Resolução SAC</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={operationMode === "cs_sheet"}
            onClick={() => setOperationMode("cs_sheet")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              operationMode === "cs_sheet"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Table2 className="size-3.5" />
            <span>Planilha Viva: Viagens & Onboarding CS</span>
            <span className="px-2 py-1 rounded bg-background/20 font-mono text-xs">
              {sheetRows.length}
            </span>
          </button>
        </div>

        {/* Filtro Rápido por Divisão de Função no SAC */}
        {operationMode !== "cs_sheet" && (
          <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Divisão de Funções SAC">
            <button
              type="button"
              role="tab"
              aria-selected={roleFilter === "all"}
              onClick={() => setRoleFilter("all")}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                roleFilter === "all"
                  ? "bg-foreground text-background"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              )}
            >
              Todas Funções
            </button>
            {SAC_FUNCTION_ROLES.map((role) => (
              <button
                key={role.key}
                type="button"
                role="tab"
                aria-selected={roleFilter === role.key}
                onClick={() => setRoleFilter(role.key)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  roleFilter === role.key
                    ? role.badgeClass
                    : "border-transparent bg-muted/30 text-muted-foreground hover:text-foreground"
                )}
              >
                {role.shortLabel}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 1. Barra Canônica de Operação Silenciosa ── */}
      {operationMode !== "cs_sheet" && (
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
          searchPlaceholder="Buscar por #CLI, #TRP, assunto, protocolo ou cliente..."
          filters={[
            {
              id: "category",
              label: "Categoria",
              value: categoryFilter,
              options: [
                { label: "Todas Categorias", value: "all" },
                { label: "Módulo Turismo", value: "tourism" },
                { label: "Financeiro e Taxas", value: "finance" },
                { label: "Erro no Sistema", value: "system_bug" },
                { label: "Integrações e Domínio", value: "integration" },
                { label: "Conta e Acessos", value: "account" },
                { label: "Outras Dúvidas", value: "other" },
              ],
              onChange: setCategoryFilter,
            },
          ]}
          onMetricsClick={() => setIsDashboardOpen(true)}
          metricsBadge={openCount > 0 ? `${openCount} abertos` : undefined}
          primaryAction={{
            label: "Novo Chamado / Pepino",
            icon: Plus,
            onClick: () => setNewModalOpen(true),
          }}
        />
      )}

      {/* ── 2A. Modo Planilha Viva de Onboarding & Customer Success (Sheet) ── */}
      {operationMode === "cs_sheet" && (
        <CustomerSuccessOnboardingSheet
          storeId={storeId}
          rows={sheetRows}
          onRefresh={reloadTickets}
          onOpenNewTicketForRow={(row) => {
            setCustomerName(row.customer_name);
            setCategory(row.entity_type === "trip" || row.entity_type === "dossier" ? "tourism" : "other");
            setLinkType(row.entity_type === "trip" || row.entity_type === "dossier" ? "tour" : row.entity_type === "order" ? "order" : "customer");
            setLinkRef(row.trip_id || row.entity_id);
            setSubject(`${row.entity_trace_hash} · Ocorrência em ${row.title}`);
            setNewModalOpen(true);
          }}
        />
      )}

      {/* ── 2B. Modo Kanban de Resolução de Pepinos & SAC ── */}
      {operationMode === "pepinos_kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {([
            { key: "open" as TicketStatus, title: "Triagem & Pepinos Abertos", badge: "bg-warning/15 text-warning-strong" },
            { key: "in_progress" as TicketStatus, title: "Em Resolução / Operadora", badge: "bg-sky-500/15 text-sky-600" },
            { key: "resolved" as TicketStatus, title: "Resolvidos & Validados", badge: "bg-emerald-500/15 text-emerald-600" },
          ]).map((col) => {
            const colItems = filteredTickets.filter((t) =>
              col.key === "resolved" ? t.status === "resolved" || t.status === "closed" : t.status === col.key
            );
            return (
              <div key={col.key} className="rounded-xl border border-border/70 bg-muted/20 p-3 flex flex-col gap-2 min-h-80">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-foreground">{col.title}</span>
                  <span className={cn("px-2 py-1 rounded-md font-mono text-xs font-semibold", col.badge)}>
                    {colItems.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1">
                  {colItems.map((t) => {
                    const roleInfo = SAC_FUNCTION_ROLES.find((r) => r.key === t.sac_function_role);
                    return (
                      <div
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleOpenTicketDetails(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") handleOpenTicketDetails(t.id);
                        }}
                        className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-colors cursor-pointer space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {t.ticket_code || `#${t.ticket_number}`}
                          </span>
                          {roleInfo && (
                            <span className={cn("px-2 py-1 rounded-md border text-xs font-medium", roleInfo.badgeClass)}>
                              {roleInfo.shortLabel}
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-foreground line-clamp-2">{t.subject}</p>

                        {(t.customer_name || t.trace_hash) && (
                          <div className="flex flex-wrap items-center gap-1">
                            <CustomerIdentityTagPill
                              name={t.customer_name || "Cliente"}
                              avatarUrl={t.customer_avatar_url || null}
                              traceHash={t.trace_hash || null}
                              subtitle={t.entity_trace_hash || null}
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/50">
                          <button
                            type="button"
                            onClick={(e) => handleQuickCreateTaskFromTicket(t, e)}
                            className="px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-foreground text-xs font-medium inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <ListTodo className="size-3 text-primary" />
                            <span>+ Tarefa</span>
                          </button>

                          <div className="flex items-center gap-1">
                            {t.status === "open" && (
                              <button
                                type="button"
                                onClick={(e) => handleQuickMoveTicketStatus(t, "in_progress", e)}
                                className="px-2 py-1 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                <span>Assumir</span>
                                <ArrowRight className="size-3" />
                              </button>
                            )}
                            {t.status === "in_progress" && (
                              <button
                                type="button"
                                onClick={(e) => handleQuickMoveTicketStatus(t, "resolved", e)}
                                className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                <CheckCircle2 className="size-3" />
                                <span>Resolver</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {colItems.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      Nenhum chamado nesta coluna.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 2C. Lista Ordenada de Chamados & Pepinos ── */}
      {operationMode === "pepinos_list" && (
        <div className="space-y-2">
          {filteredTickets.map((t) => {
            const st = STATUS_LABELS[t.status] || STATUS_LABELS.open;
            const roleInfo = SAC_FUNCTION_ROLES.find((r) => r.key === t.sac_function_role);
            return (
              <div
                key={t.id}
                onClick={() => handleOpenTicketDetails(t.id)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/30 cursor-pointer transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleOpenTicketDetails(t.id);
                }}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MessageSquare className="size-4" />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-primary">
                        {t.ticket_code || `#${t.ticket_number}`}
                      </span>
                      {roleInfo && (
                        <span className={cn("px-2 py-1 rounded-md border text-xs font-medium", roleInfo.badgeClass)}>
                          {roleInfo.shortLabel}
                        </span>
                      )}
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {t.subject}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
                      {(t.customer_name || t.trace_hash) && (
                        <CustomerIdentityTagPill
                          name={t.customer_name || "Cliente"}
                          avatarUrl={t.customer_avatar_url || null}
                          traceHash={t.trace_hash || null}
                          subtitle={t.entity_trace_hash || null}
                        />
                      )}
                      <span>{CATEGORY_LABELS[t.category]}</span>
                      <span>•</span>
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleQuickCreateTaskFromTicket(t, e)}
                    className="px-3 py-1 rounded-lg border border-border/70 bg-background hover:bg-muted text-foreground text-xs font-medium inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title="Criar tarefa vinculada ao cliente e chamado"
                  >
                    <ListTodo className="size-3.5 text-primary" />
                    <span>+ Tarefa</span>
                  </button>

                  <Badge variant="outline" className={`text-xs border font-semibold ${st.className}`}>
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
                  ? "Sua loja ainda não abriu chamados ou pepinos operacionais. Clique em Novo Chamado ou alterne para a Planilha Viva de Onboarding CS."
                  : "Não há chamados com este filtro no momento."
              }
            />
          )}
        </div>
      )}

      {/* ── 3. Painel de Métricas / Dashboard Sob Demanda ── */}
      <WorkspaceDashboardSheet
        open={isDashboardOpen}
        onOpenChange={setIsDashboardOpen}
        title="Suporte"
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
              label: "Financeiro e Taxas",
              value: tickets.filter((t) => t.category === "finance").length,
              total: Math.max(tickets.length, 1),
              color: "bg-emerald-500",
            },
            {
              label: "Erro no Sistema",
              value: tickets.filter((t) => t.category === "system_bug").length,
              total: Math.max(tickets.length, 1),
              color: "bg-warning",
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
          side="right" size="wide" className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl w-full max-sm:h-dvh max-sm:inset-0 max-sm:rounded-none border-l p-0 overflow-y-auto no-scrollbar bg-card flex flex-col h-full"
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
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value="tourism">Módulo Turismo / Excursões</option>
                    <option value="finance">Financeiro e Pagamentos</option>
                    <option value="system_bug">Bug / Erro Visual ou de Operação</option>
                    <option value="integration">Integrações e Domínio Próprio</option>
                    <option value="account">Acesso e Usuários</option>
                    <option value="other">Outras Dúvidas</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Prioridade *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none"
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
                  className="h-10 text-xs rounded-lg"
                  required
                  autoFocus
                />
              </div>

              <div className="p-4 rounded-lg border border-border/70 bg-muted/10 space-y-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <LinkIcon className="size-3.5 text-primary" />
                  Vínculo com Operação / Entidade (Opcional)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Tipo de Vínculo</label>
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
                      <label className="text-xs font-semibold text-muted-foreground">ID / Referência do Vínculo</label>
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
                    <label className="text-xs font-semibold text-muted-foreground">Nome do Passageiro / Cliente</label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">SLA Máximo Desejado</label>
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
                  className="w-full h-32 p-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none resize-none leading-relaxed"
                  required
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewModalOpen(false)}
                className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting || !subject.trim() || !message.trim()}
                className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold cursor-pointer"
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
          side="right" size="wide" className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl w-full max-sm:h-dvh max-sm:inset-0 max-sm:rounded-none border-l p-0 flex flex-col h-full bg-card"
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
                  className={`text-xs ${STATUS_LABELS[activeTicket.status]?.className}`}
                >
                  {STATUS_LABELS[activeTicket.status]?.label}
                </Badge>
              )}
            </SheetTitle>

            {activeTicket && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
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
                      <span className="text-warning-strong  font-semibold">
                        SLA: {new Date(activeTicket.sla_due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </>
                  )}
                </div>

                
                {activeTicket.customer_name && (
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-1 text-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Link to={"/workspace/atendimento/chat" as any} search={{ search: activeTicket.customer_name || undefined, threadId: undefined } as any}>
                      <Headphones className="size-3.5" />
                      <span>Atender no SAC</span>
                    </Link>
                  </Button>
                )}

                {activeTicket.status !== "resolved" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus("resolved")}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
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
                className={`p-4 rounded-lg text-xs space-y-1 max-w-xs sm:max-w-md ${
                  m.is_staff_reply
                    ? "bg-primary/10 text-foreground border border-primary/20 ml-0 mr-auto"
                    : "bg-muted/40 text-foreground border border-border/60 ml-auto mr-0"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
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
                      className="text-xs text-primary underline hover:text-primary/80 flex items-center gap-1"
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
              className="h-11 rounded-lg text-xs flex-1"
            />
            <Button
              type="submit"
              disabled={sendingReply || !replyText.trim()}
              className="size-11 rounded-lg shrink-0 cursor-pointer shadow-xs"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
