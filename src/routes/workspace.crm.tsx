import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { openOrCreateWhatsAppThreadForLead, listWhatsAppThreadsForLeadPicker } from "@/services/chat-quick-actions.functions";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Headphones, Search, Plus, Phone, Mail, ArrowUpRight, TrendingUp, MessageCircle, ExternalLink, ChevronRight, Filter, DollarSign, Kanban, CheckCircle2, Clock, UserCheck, Building2, Tag, ShieldCheck, MoreHorizontal, SlidersHorizontal, X, ChevronDown, ChevronUp, Globe, Share2, Brain, Calendar, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { FilterBottomSheet, FilterTriggerButton } from "@/components/workspace/filter-bottom-sheet";
import { StorePersonasMatrix } from "@/components/workspace/crm/store-personas-matrix";
import { WhatsAppLeadsInbox } from "@/components/workspace/crm/whatsapp-leads-inbox";
import { RotaryQueueView } from "@/components/workspace/crm/rotary-queue-view";
import { FieldRoutesView } from "@/components/workspace/crm/field-routes-view";
import { listCustomers, listLeads, updateLeadStatus, promoteLeadToCustomer, persistLeadMove, updateLeadDetails } from "@/services/crm.functions";
import { formatKanbanActionError } from "@/lib/niches/kanban-niche-taxonomy";
import { toast } from "sonner";
import { getDashboardData } from "@/services/dashboard.functions";
import { getEntityUnifiedTimeline } from "@/services/domain-events.functions";
import { NicheKanbanBoard, NicheKanbanCardData } from "@/components/workspace/kanban/niche-kanban-board";
import { AdvancedLeadTagsPicker } from "@/components/tourism/crm/advanced-lead-tags-picker";
import { LeadRemindersManager } from "@/components/tourism/crm/lead-reminders-manager";
import { UnifiedEntityTimeline } from "@/components/workspace/timeline/unified-entity-timeline";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useNicheTaxonomy } from "@/hooks/use-niche-taxonomy";
import { NicheId } from "@/lib/niches/niche-manifest";
import { formatMoney } from "@/lib/money";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { EmptyState, ErrorState } from "@/components/state/states";
import { buildEntityTraceHash, CustomerIdentityTagPill } from "@/lib/entity-trace-hash";
import { StatefulNavIcon } from "@/components/ui/stateful-nav-icon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/crm")({
  head: () => ({
    meta: [{ title: "CRM | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const [customers, dashboardMetrics] = await Promise.all([
        listCustomers({ data: { status: "all" } }),
        getDashboardData(),
      ]);
      return {
        initialCustomers: customers || [],
        dashboardMetrics,
        loadError: null as string | null,
      };
    } catch (err: any) {
      console.error("[loader:workspace.crm] Loader error:", err);
      return {
        initialCustomers: [],
        dashboardMetrics: null,
        loadError: err?.message || "Não foi possível carregar os contatos do CRM.",
      };
    }
  },
  component: WorkspaceCrmPage,
});

export default function WorkspaceCrmPage() {
  const loaderData = (Route.useLoaderData() as any) || {};
  const initialCustomers = loaderData.initialCustomers || [];
  const dashboardMetrics = loaderData.dashboardMetrics || null;
  const loadError = loaderData.loadError || null;
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [threadPickerOpen, setThreadPickerOpen] = useState(false);
  const [threadQuery, setThreadQuery] = useState("");
  const [threadResults, setThreadResults] = useState<any[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isOpeningWhatsApp, setIsOpeningWhatsApp] = useState(false);

  const handleOpenWhatsAppForLead = async (leadId: string, explicitThreadId?: string) => {
    setIsOpeningWhatsApp(true);
    try {
      const res = await openOrCreateWhatsAppThreadForLead({
        data: {
          leadId,
          ...(explicitThreadId ? { threadId: explicitThreadId } : {}),
        },
      });
      toast.success(res.created ? "Conversa WhatsApp iniciada e vinculada ao lead!" : "Conversa WhatsApp vinculada!");
      setSelectedEntity(null);
      setThreadPickerOpen(false);
      await navigate({
        to: "/workspace/atendimento/chat" as any,
        search: { threadId: res.threadId, leadId } as any,
      });
    } catch (err: any) {
      toast.error(err?.message || "Nao foi possivel abrir ou vincular conversa WhatsApp.");
    } finally {
      setIsOpeningWhatsApp(false);
    }
  };

  const loadWhatsAppThreadsForPicker = async (q: string) => {
    setIsLoadingThreads(true);
    try {
      const rows = await listWhatsAppThreadsForLeadPicker({ data: { query: q.trim() || undefined, limit: 20 } });
      setThreadResults(rows || []);
    } catch {
      setThreadResults([]);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [showMetricsMobile, setShowMetricsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"clientes" | "funil" | "personas" | "whatsapp" | "rotary" | "rotas">("clientes");
  const { nicheId } = useNicheTaxonomy();
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; name: string; type: "lead" | "customer" } | null>(null);

  const { data: customers = initialCustomers } = useQuery({
    queryKey: ["workspace-crm-customers", statusFilter, channelFilter],
    queryFn: () => listCustomers({ data: { status: statusFilter, channel: channelFilter } }),
    initialData: initialCustomers,
  });

  const { data: leads = [], refetch: refetchLeads } = useQuery({
    queryKey: ["workspace-crm-leads"],
    queryFn: () => listLeads(),
    enabled: activeTab === "funil",
  });

  const { data: timelineEvents = [], isLoading: isLoadingTimeline } = useQuery({
    queryKey: ["workspace-entity-timeline", selectedEntity?.type, selectedEntity?.id],
    queryFn: () =>
      selectedEntity
        ? getEntityUnifiedTimeline({ data: { entityType: selectedEntity.type, entityId: selectedEntity.id } })
        : Promise.resolve([]),
    enabled: !!selectedEntity,
  });

  const kanbanItems: NicheKanbanCardData[] = useMemo(() => {
    return (leads as any[]).map((l: any) => ({
      id: l.id,
      title: l.title || l.full_name || "Oportunidade",
      status: l.status || "new",
      value: (l.estimated_value_cents || 0) / 100,
      contactName: l.full_name,
      contactPhone: l.phone,
      tags: l.tags || [],
      followUpAt: l.follow_up_at || null,
      source: l.source || l.lead_source_detail || null,
      custom_fields: l.custom_fields || null,
      metadata: {
        ...(l.custom_fields || {}),
        follow_up_at: l.follow_up_at,
        source: l.source || l.lead_source_detail,
      },
    }));
  }, [leads]);

  const selectedLead = useMemo(() => {
    return selectedEntity?.type === "lead" ? (leads as any[]).find((l: any) => l.id === selectedEntity.id) : null;
  }, [selectedEntity, leads]);

  const handleTransitionLead = async (leadId: string, nextStatus: string) => {
    // Atualização otimista imediata no cache do React Query (0ms)
    const prevLeads = queryClient.getQueryData<any[]>(["workspace-crm-leads"]) || [];
    queryClient.setQueryData<any[]>(["workspace-crm-leads"], (old) => {
      if (!Array.isArray(old)) return old;
      return old.map((l) =>
        l.id === leadId
          ? {
              ...l,
              status: nextStatus,
              pipeline_stage: nextStatus,
              custom_fields: {
                ...(l.custom_fields && typeof l.custom_fields === "object" ? l.custom_fields : {}),
                kanban_stage_key: nextStatus,
              },
            }
          : l,
      );
    });

    try {
      await persistLeadMove({
        data: {
          leadId,
          toStatus: nextStatus,
          reorderedIds: [],
        },
      });
    } catch (err: any) {
      queryClient.setQueryData(["workspace-crm-leads"], prevLeads);
      toast.error(formatKanbanActionError(err, "Não foi possível mover o card no funil."));
    } finally {
      queryClient.invalidateQueries({ queryKey: ["workspace-crm-leads"] });
    }
  };

  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (channelFilter !== "all") {
      list = list.filter((c: any) => (c.channel || "").toLowerCase() === channelFilter.toLowerCase());
    }
    if (tagFilter !== "all") {
      list = list.filter((c: any) =>
        Array.isArray(c.tags) && c.tags.some((tg: string) => tg.toLowerCase() === tagFilter.toLowerCase()),
      );
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c: any) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.document?.includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        buildEntityTraceHash("customer", c.id || c.phone).toLowerCase().includes(q) ||
        (Array.isArray(c.tags) && c.tags.some((tg: string) => tg.toLowerCase().includes(q)))
    );
  }, [customers, search, channelFilter, tagFilter]);

  const metrics = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c: any) => c.status === "active").length;
    const totalLtvCents = customers.reduce((acc: number, c: any) => acc + (c.total_spent_cents || 0), 0);
    const avgTicketCents = total > 0 ? Math.round(totalLtvCents / total) : 0;
    return {
      total,
      active,
      totalLtvCents,
      avgTicketCents,
      newCustomers30d: dashboardMetrics?.newCustomers30d ?? 0,
    };
  }, [customers, dashboardMetrics]);

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (channelFilter !== "all" ? 1 : 0) +
    (tagFilter !== "all" ? 1 : 0);

  if (loadError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <ErrorState
          title="Erro ao carregar CRM"
          description={loadError}
          onRetry={() => router.invalidate()}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full flex-1 flex flex-col min-h-0 px-0 animate-in fade-in duration-200",
        activeTab === "funil"
          ? "h-full min-h-0 overflow-hidden space-y-2 pb-0"
          : "w-full space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0"
      )}
    >
      {/* ── 1. TopBar Direta (Linha 1 no Mobile: Título + Badge + Menu Kebab) ── */}
      <div className="flex flex-row items-center justify-between gap-2 border-b border-border/40 pb-3 pt-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Users className="size-4 sm:size-5" />
          </span>
          <h1 className="text-base sm:text-2xl font-bold tracking-tight text-foreground truncate">
            CRM
          </h1>
          <Badge variant="outline" className="text-xs sm:text-xs font-mono py-0 px-2 border-primary/30 text-primary shrink-0">
            {metrics.total} contatos
          </Badge>
        </div>

        {/* Ações no Desktop */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="rounded-lg text-xs font-semibold gap-2 h-11 min-h-11 px-4">
            <Link to="/workspace/comercial">
              <Kanban className="size-3.5 text-primary" />
              <span>Funil Comercial</span>
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="rounded-lg text-xs font-semibold gap-2 h-11 min-h-11 px-4">
            <Link to="/workspace/clientes">
              <Users className="size-3.5" />
              <span>Base Completa</span>
            </Link>
          </Button>
        </div>

        {/* Ações Secundárias no Mobile (Kebab + Toggle de Métricas) */}
        <div className="flex sm:hidden items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowMetricsMobile((prev) => !prev)}
            className="h-11 min-h-11 px-3 text-xs text-muted-foreground font-medium gap-1 rounded-lg"
            title="Alternar resumo de métricas"
          >
            <span>Métricas</span>
            {showMetricsMobile ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="size-11 min-h-11 min-w-11 p-0 rounded-lg border-border/70 text-muted-foreground"
                title="Mais opções"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-lg min-w-44">
              <DropdownMenuItem asChild className="text-xs gap-2 font-medium">
                <Link to="/workspace/comercial">
                  <Kanban className="size-3.5 text-primary" />
                  <span>Funil Comercial</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-xs gap-2 font-medium">
                <Link to="/workspace/clientes">
                  <Users className="size-3.5" />
                  <span>Base Completa</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Sub-Navegação Silenciosa: Clientes vs Funil vs Personas vs WhatsApp ── */}
      <div className="waesy-tab-strip items-center gap-1 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("clientes")}
          aria-pressed={activeTab === "clientes"}
          className={`h-11 min-h-11 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            activeTab === "clientes"
              ? "bg-rail-active text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
          }`}
        >
          <StatefulNavIcon icon={Users} active={activeTab === "clientes"} size={16} className="size-4 shrink-0" />
          <span>Clientes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("funil")}
          aria-pressed={activeTab === "funil"}
          className={`h-11 min-h-11 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            activeTab === "funil"
              ? "bg-rail-active text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
          }`}
        >
          <StatefulNavIcon icon={Kanban} active={activeTab === "funil"} size={16} className="size-4 shrink-0" />
          <span>Funil de Vendas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("personas")}
          aria-pressed={activeTab === "personas"}
          className={`h-11 min-h-11 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            activeTab === "personas"
              ? "bg-rail-active text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
          }`}
        >
          <StatefulNavIcon icon={Brain} active={activeTab === "personas"} size={16} className="size-4 shrink-0" />
          <span>Personas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("whatsapp")}
          aria-pressed={activeTab === "whatsapp"}
          className={`h-11 min-h-11 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            activeTab === "whatsapp"
              ? "bg-rail-active text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
          }`}
        >
          <StatefulNavIcon icon={MessageCircle} active={activeTab === "whatsapp"} size={16} className="size-4 shrink-0" />
          <span>Leads WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rotary")}
          aria-pressed={activeTab === "rotary"}
          className={`h-11 min-h-11 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            activeTab === "rotary"
              ? "bg-rail-active text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
          }`}
        >
          <StatefulNavIcon icon={Calendar} active={activeTab === "rotary"} size={16} className="size-4 shrink-0" />
          <span>Dia a Dia (Carteira)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rotas")}
          aria-pressed={activeTab === "rotas"}
          className={`h-11 min-h-11 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            activeTab === "rotas"
              ? "bg-rail-active text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
          }`}
        >
          <StatefulNavIcon icon={Navigation} active={activeTab === "rotas"} size={16} className="size-4 shrink-0" />
          <span>Rotas GPS</span>
        </button>
      </div>

      {activeTab === "funil" ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-2">
          <NicheKanbanBoard
            nicheId={(nicheId as NicheId) || "generic"}
            entity="lead"
            items={kanbanItems}
            onTransitionStatus={handleTransitionLead}
            onCardClick={(item) =>
              setSelectedEntity({ id: item.id, name: item.title, type: "lead" })
            }
          />
        </div>
      ) : activeTab === "personas" ? (
        <StorePersonasMatrix />
      ) : activeTab === "whatsapp" ? (
        <WhatsAppLeadsInbox />
      ) : activeTab === "rotary" ? (
        <RotaryQueueView />
      ) : activeTab === "rotas" ? (
        <FieldRoutesView />
      ) : (
        <>
          {/* ── 2. Grid de Métricas (Visível sempre no Desktop; Alternável no Mobile) ── */}
          <div className={showMetricsMobile ? "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" : "hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"}>
        <Card className="p-4 rounded-lg bg-card border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Clientes Cadastrados</span>
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-semibold text-foreground font-mono">{metrics.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Base ativa na loja</p>
          </div>
        </Card>

        <Card className="p-4 rounded-lg bg-card border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Clientes Ativos</span>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-semibold text-foreground font-mono">{metrics.active}</p>
            <p className="text-xs text-muted-foreground mt-1">Compras regulares</p>
          </div>
        </Card>

        <Card className="p-4 rounded-lg bg-card border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Novos no Mês</span>
            <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-semibold text-foreground font-mono">{metrics.newCustomers30d}</p>
            <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
          </div>
        </Card>

        <Card className="p-4 rounded-lg bg-card border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Média por Cliente</span>
            <div className="size-8 rounded-lg bg-warning/10 text-warning-strong flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-semibold text-foreground font-mono">{formatMoney(metrics.avgTicketCents)}</p>
            <p className="text-xs text-muted-foreground mt-1">Histórico acumulado</p>
          </div>
        </Card>
      </div>

      {/* ── 3. Barra de Busca + Filtro + CTA Primário (Linha 2 Única Cravada em h-10) ── */}
      <div className="grid flex items-center gap-2 w-full gap-2 items-center w-full">
        {/* Input de Busca Fluido */}
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, telefone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 h-11 min-h-11 rounded-lg text-xs bg-card border-border/60 w-full placeholder:text-muted-foreground/60 shadow-none focus-visible:ring-1 focus-visible:ring-primary/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              title="Limpar busca"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Botão de Filtros (Abre Bottom Sheet - Erradica empilhamento de selects) */}
        <FilterTriggerButton
          onClick={() => setIsFilterSheetOpen(true)}
          activeCount={activeFiltersCount}
          className="h-11 min-h-11 px-3 rounded-lg border-border/60 shrink-0 shadow-none text-xs"
        />

        {/* Botão Primário "+ Novo Cliente" Cravado em h-10 */}
        <Button
          asChild
          className="h-11 min-h-11 px-3 sm:px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0 shadow-none cursor-pointer"
        >
          <Link to="/workspace/clientes" search={{ novo: true } as any}>
            <Plus className="size-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">Novo Cliente</span>
          </Link>
        </Button>
      </div>

      {/* ── BOTTOM SHEET DE FILTROS (Compactação Nativa Mobile & Desktop) ── */}
      <FilterBottomSheet
        open={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        title="Filtros do CRM"
        description="Filtre os contatos por status e canal de aquisição."
        filters={[
          {
            id: "status",
            label: "Status dos Contatos",
            value: statusFilter,
            defaultValue: "all",
            options: [
              { label: "Todos os Status", value: "all", icon: Users },
              { label: "Apenas Ativos", value: "active", icon: CheckCircle2 },
              { label: "Inativos", value: "inactive", icon: Clock },
            ],
            onChange: (val) => setStatusFilter(val as any),
          },
          {
            id: "channel",
            label: "Canal de Aquisição",
            value: channelFilter,
            defaultValue: "all",
            options: [
              { label: "Todos os Canais", value: "all", icon: Globe },
              { label: "WhatsApp", value: "whatsapp", icon: MessageCircle },
              { label: "Balcão / Direto", value: "direct", icon: Building2 },
              { label: "Site / E-commerce", value: "site", icon: ExternalLink },
              { label: "Indicação", value: "indicacao", icon: Share2 },
              { label: "Instagram", value: "instagram", icon: Tag },
            ],
            onChange: (val) => setChannelFilter(val),
          },
        ]}
        onReset={() => {
          setStatusFilter("all");
          setChannelFilter("all");
        }}
      />

      {/* ── 4. Tabela / Listagem de Clientes ── */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search || activeFiltersCount > 0 ? "Nenhum contato encontrado" : "Nenhum cliente cadastrado ainda"}
          description={
            search || activeFiltersCount > 0
              ? "Tente buscar com outro termo ou redefinir os filtros."
              : "Cadastre novos clientes ou importe sua base para gerenciar contatos e histórico."
          }
          actionLabel="Cadastrar Primeiro Cliente"
          onAction={() => router.navigate({ to: "/workspace/clientes", search: { novo: true } as any })}
        />
      ) : (
        <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
          {/* Visualização Mobile: WhatsApp List Edge-to-Edge (< 640px) */}
          <div className="sm:hidden divide-y divide-border/40">
            {filteredCustomers.map((customer: any) => {
              const phoneDigits = customer.phone ? customer.phone.replace(/\D/g, "") : "";
              return (
                <div key={customer.id} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                  <Link
                    to="/workspace/clientes/$id"
                    params={{ id: customer.id }}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {(customer.full_name || "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground truncate">
                          {customer.full_name || "Cliente sem nome"}
                        </p>
                        {customer.status === "active" && (
                          <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="font-mono text-foreground font-semibold">
                          {formatMoney(customer.total_spent_cents || 0)}
                        </span>
                        <span>•</span>
                        <span className="capitalize truncate">{customer.channel || "Direto"}</span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    {phoneDigits && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          trackAndOpenWhatsApp(
                            phoneDigits,
                            `Olá, ${customer.full_name || ""}! Como posso ajudar você hoje?`
                          )
                        }
                        className="size-11 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
                        title="WhatsApp"
                      >
                        <MessageCircle className="size-5" />
                      </Button>
                    )}
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="size-11 p-0 rounded-lg cursor-pointer"
                    >
                      <Link to="/workspace/clientes/$id" params={{ id: customer.id }}>
                        <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visualização Desktop: Tabela de Alta Densidade (>= 640px) */}
          <div className="hidden sm:block overflow-x-auto scroll-area">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/40 text-xs uppercase tracking-wider text-muted-foreground font-mono">
                <tr>
                  <th className="py-3 px-4 font-bold">Cliente</th>
                  <th className="py-3 px-4 font-bold hidden sm:table-cell">Contato</th>
                  <th className="py-3 px-4 font-bold hidden md:table-cell">Status</th>
                  <th className="py-3 px-4 font-bold hidden lg:table-cell">Canal</th>
                  <th className="py-3 px-4 font-bold text-right">Total em Compras</th>
                  <th className="py-3 px-4 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredCustomers.map((customer: any) => {
                  const phoneDigits = customer.phone ? customer.phone.replace(/\D/g, "") : "";
                  return (
                    <tr key={customer.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-4">
                        <Link
                          to="/workspace/clientes/$id"
                          params={{ id: customer.id }}
                          className="flex items-center gap-3 group"
                        >
                          <CustomerIdentityTagPill
                            name={customer.full_name || "Cliente sem nome"}
                            avatarUrl={customer.avatar_url || null}
                            traceHash={buildEntityTraceHash("customer", customer.id || customer.phone)}
                            subtitle={customer.document || undefined}
                          />
                        </Link>
                      </td>

                      <td className="py-4 px-4 hidden sm:table-cell">
                        <div className="space-y-1">
                          {customer.phone && (
                            <p className="text-xs font-mono text-foreground">{customer.phone}</p>
                          )}
                          {customer.email && (
                            <p className="text-xs text-muted-foreground truncate max-w-44">
                              {customer.email}
                            </p>
                          )}
                          {!customer.phone && !customer.email && (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 hidden md:table-cell">
                        <Badge
                          variant={customer.status === "active" ? "default" : "secondary"}
                          className="text-xs font-mono capitalize"
                        >
                          {customer.status === "active" ? "Ativo" : customer.status || "Pendente"}
                        </Badge>
                      </td>

                      <td className="py-4 px-4 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground capitalize">
                          {customer.channel || "Direto"}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className="font-mono font-bold text-foreground text-xs">
                          {formatMoney(customer.total_spent_cents || 0)}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {phoneDigits && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                trackAndOpenWhatsApp(
                                  phoneDigits,
                                  `Olá, ${customer.full_name || ""}! Como posso ajudar você hoje?`
                                )
                              }
                              className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
                              title="Conversar no WhatsApp"
                            >
                              <MessageCircle className="size-4" />
                            </Button>
                          )}

                          
                          {phoneDigits && (
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-primary hover:text-primary hover:bg-primary/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              title="Atender no SAC"
                            >
                              <Link to={"/workspace/atendimento/chat" as any} search={{ search: customer.phone || customer.full_name || undefined, threadId: undefined } as any}>
                                <Headphones className="size-4" />
                              </Link>
                            </Button>
                          )}

                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
                          >
                            <Link to="/workspace/clientes/$id" params={{ id: customer.id }}>
                              <span>Ficha</span>
                              <ChevronRight className="size-3" />
                            </Link>
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
      )}
        </>
      )}

      {/* ── Sheet Lateral de Inspeção e Timeline 360 (P36 / P47) ── */}
      <Sheet open={!!selectedEntity} onOpenChange={(open) => !open && setSelectedEntity(null)}>
        <SheetContent side="right" size="wide" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-border/40">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-bold text-foreground">
                {selectedEntity?.name}
              </SheetTitle>
              <Badge variant="outline" className="text-xs font-semibold">
                {selectedEntity?.type === "lead" ? "Oportunidade" : "Cliente"}
              </Badge>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              {selectedEntity?.type === "lead"
                ? "Ciclo comercial e conversão de oportunidade"
                : "Histórico consolidado do cliente e timeline"}
            </SheetDescription>
          </SheetHeader>

          {/* Quick Actions & Details para Leads */}
          {selectedLead && (
            <div className="p-4 border-b border-border/30 bg-muted/20 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {selectedLead.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-3.5 text-primary" />
                    <span>{selectedLead.phone}</span>
                  </div>
                )}
                {selectedLead.destination && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="size-3.5 text-primary" />
                    <span>{selectedLead.destination}</span>
                  </div>
                )}
                {selectedLead.estimated_value_cents ? (
                  <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                    <DollarSign className="size-3.5 text-primary" />
                    <span>Valor Estimado: {formatMoney((selectedLead.estimated_value_cents || 0) / 100)}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  disabled={isOpeningWhatsApp}
                  onClick={() => void handleOpenWhatsAppForLead(selectedLead.id)}
                  className="flex-1 text-xs h-11 min-h-11 gap-2 cursor-pointer"
                >
                  <MessageCircle className="size-4" />
                  <span>{isOpeningWhatsApp ? "Abrindo..." : "Atender no WhatsApp"}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nextOpen = !threadPickerOpen;
                    setThreadPickerOpen(nextOpen);
                    if (nextOpen) void loadWhatsAppThreadsForPicker(threadQuery);
                  }}
                  className="text-xs h-11 min-h-11 gap-2 cursor-pointer"
                >
                  <Share2 className="size-3.5" />
                  <span>{threadPickerOpen ? "Fechar Vinculo" : "Vincular Chat"}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-11 min-h-11 gap-2"
                  asChild
                >
                  <Link
                    to="/workspace/turismo/propostas/novo"
                    search={{
                      leadId: selectedLead.id,
                      clientName: selectedLead.full_name || selectedLead.title || "",
                      phone: selectedLead.phone || "",
                      destination: selectedLead.destination || "",
                    } as any}
                  >
                    <ArrowUpRight className="size-3.5" />
                    Gerar Proposta
                  </Link>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-11 min-h-11 gap-2"
                  onClick={async () => {
                    try {
                      await promoteLeadToCustomer({ data: { leadId: selectedLead.id } });
                      toast.success("Lead promovido a cliente com sucesso!");
                      refetchLeads();
                      setSelectedEntity(null);
                    } catch (e: any) {
                      toast.error("Erro ao promover lead: " + (e?.message || "falha desconhecida"));
                    }
                  }}
                >
                  <UserCheck className="size-3.5" />
                  Virar Cliente
                </Button>
              </div>

              {threadPickerOpen && (
                <div className="mt-2 p-3 rounded-xl border border-border/70 bg-background space-y-2">
                  <p className="text-xs font-semibold text-foreground">
                    Selecione uma conversa WhatsApp existente (inclusive contatos sem numero visivel)
                  </p>
                  <Input
                    value={threadQuery}
                    onChange={(e) => {
                      setThreadQuery(e.target.value);
                      void loadWhatsAppThreadsForPicker(e.target.value);
                    }}
                    placeholder="Buscar conversa por nome, telefone ou ultima mensagem..."
                    className="h-11 text-xs"
                  />
                  <div className="max-h-44 overflow-y-auto space-y-1">
                    {isLoadingThreads ? (
                      <p className="text-xs text-muted-foreground text-center py-3">Buscando conversas...</p>
                    ) : threadResults.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">Nenhuma conversa encontrada.</p>
                    ) : (
                      threadResults.map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          disabled={isOpeningWhatsApp}
                          onClick={() => void handleOpenWhatsAppForLead(selectedLead.id, th.id)}
                          className="w-full min-h-11 px-3 py-2 rounded-lg border border-border/60 bg-card hover:bg-muted/50 text-left flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {th.group_subject || th.guest_name || th.primary_phone_e164 || "Conversa WhatsApp"}
                            </p>
                            <p className="text-2xs text-muted-foreground truncate">
                              {th.primary_phone_e164 || th.entity_id}{th.last_message_text ? ` · ${th.last_message_text}` : ""}
                            </p>
                          </div>
                          <Badge variant={th.lead_id === selectedLead.id ? "default" : "outline"} className="text-2xs shrink-0">
                            {th.lead_id === selectedLead.id ? "Vinculada" : "Vincular"}
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Gestão Avançada de Tags do Lead */}
              <div className="pt-3 border-t border-border/40 space-y-2">
                <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Tags & Segmentação Comercial
                </span>
                <AdvancedLeadTagsPicker
                  tags={selectedLead.tags || []}
                  onChange={async (nextTags: string[]) => {
                    try {
                      await updateLeadDetails({
                        data: {
                          leadId: selectedLead.id,
                          tags: nextTags,
                        },
                      });
                      toast.success("Tags atualizadas com sucesso!");
                      refetchLeads();
                    } catch (e: any) {
                      toast.error("Erro ao atualizar tags: " + (e?.message || "falha desconhecida"));
                    }
                  }}
                />
              </div>

              {/* Gestão de Lembretes & Alarmes de Follow-up */}
              <div className="pt-3 border-t border-border/40">
                <LeadRemindersManager
                  reminders={selectedLead.custom_fields?.reminders || []}
                  onChange={async (nextReminders: any[], nextDue?: string | null) => {
                    try {
                      await updateLeadDetails({
                        data: {
                          leadId: selectedLead.id,
                          follow_up_at: nextDue ?? null,
                          custom_fields: {
                            ...(selectedLead.custom_fields || {}),
                            reminders: nextReminders,
                          },
                        },
                      });
                      refetchLeads();
                    } catch (e: any) {
                      toast.error("Erro ao atualizar lembretes: " + (e?.message || "falha desconhecida"));
                    }
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Timeline Unificada de Eventos
            </h4>
            <UnifiedEntityTimeline
              entries={timelineEvents}
              isLoading={isLoadingTimeline}
              emptyMessage="Nenhuma atividade ou evento registrado para este registro até o momento."
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
