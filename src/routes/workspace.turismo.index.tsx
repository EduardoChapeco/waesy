import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Compass,
  Plus,
  Search,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  MoreVertical,
  Plane,
  Building2,
  Tag,
  DollarSign,
  Phone,
  Mail,
  ExternalLink,
  Kanban,
  FileText,
  Send,
  FileSignature,
  ArrowRight,
  TrendingUp,
  MapPin,
  Check,
  Eye,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { listLeads, updateLeadStatus, promoteLeadToCustomer, issueLeadContract } from "@/services/crm.functions";
import { listStoreTrips, convertProposalToTrip } from "@/services/travel-lifecycle.functions";
import { getStoreSettings } from "@/services/store.functions";
import { listAgencyTravelProposals } from "@/services/travel-proposal.functions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet, type MetricCardItem } from "@/components/workspace/workspace-dashboard-sheet";
import { UnifiedProposalWorkspace, type UnifiedProposalWorkspaceLead } from "@/components/tourism/unified-proposal-workspace";
import { EmptyState } from "@/components/state/states";

export const Route = createFileRoute("/workspace/turismo/")({
  head: () => ({
    meta: [{ title: "Turismo & Viagens | Cockpit Operacional Workspace" }],
  }),
  loader: async () => {
    try {
      const [leadsRes, proposalsRes, tripsRes, store] = await Promise.all([
        listLeads().catch(() => []),
        listAgencyTravelProposals().catch(() => []),
        listStoreTrips({ data: { status: "all" } }).catch(() => []),
        getStoreSettings().catch(() => null),
      ]);
      return {
        leads: leadsRes || [],
        proposals: proposalsRes || [],
        trips: tripsRes || [],
        store,
      };
    } catch (err) {
      console.error("[loader:workspace.turismo.index] Loader fallback:", err);
      return {
        leads: [],
        proposals: [],
        trips: [],
        store: null,
      };
    }
  },
  component: WorkspaceTurismoCockpitPage,
});

type TourismLeadStage = "new" | "qualified" | "proposal" | "negotiation" | "won";

interface TourismStageConfig {
  id: TourismLeadStage;
  title: string;
  dotColor: string;
  badgeClass: string;
  description: string;
}

const TOURISM_STAGES: TourismStageConfig[] = [
  {
    id: "new",
    title: "Novos Contatos",
    dotColor: "bg-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    description: "Leads recém-chegados por WhatsApp, indicação ou vitrine",
  },
  {
    id: "qualified",
    title: "Cotação em Andamento",
    dotColor: "bg-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    description: "Destino, passageiros e datas alinhados",
  },
  {
    id: "proposal",
    title: "Proposta Enviada",
    dotColor: "bg-indigo-500",
    badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    description: "Proposta interativa ou PDF apresentada ao passageiro",
  },
  {
    id: "negotiation",
    title: "Em Negociação",
    dotColor: "bg-orange-500",
    badgeClass: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    description: "Ajuste de quartos, condições de pagamento e reservas de voos",
  },
  {
    id: "won",
    title: "Viagem Confirmada",
    dotColor: "bg-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    description: "Venda aprovada, convertida em viagem e pronta para embarque",
  },
];

export default function WorkspaceTurismoCockpitPage() {
  const { leads: initialLeads, proposals: initialProposals, trips: initialTrips, store } = Route.useLoaderData();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [proposalLead, setProposalLead] = useState<UnifiedProposalWorkspaceLead | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<"kanban" | "viagens" | "propostas">("kanban");

  const { data: leads = initialLeads, refetch: refetchLeads } = useQuery({
    queryKey: ["tourism-cockpit-leads"],
    queryFn: () => listLeads(),
    initialData: initialLeads,
  });

  const { data: proposals = initialProposals } = useQuery({
    queryKey: ["agency-proposals"],
    queryFn: () => listAgencyTravelProposals(),
    initialData: initialProposals,
  });

  const { data: trips = initialTrips } = useQuery({
    queryKey: ["tourism-trips-list"],
    queryFn: () => listStoreTrips({ data: { status: "all" } }),
    initialData: initialTrips,
  });

  // Transição de Estágio do Lead no Funil
  const handleTransitionLead = async (leadId: string, nextStatus: TourismLeadStage) => {
    try {
      await updateLeadStatus({ data: { leadId, status: nextStatus as any } });
      toast.success(`Lead movido para "${TOURISM_STAGES.find((s) => s.id === nextStatus)?.title}"`);
      await refetchLeads();
      queryClient.invalidateQueries({ queryKey: ["tourism-cockpit-leads"] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar status do lead.");
    }
  };

  // Filtragem de Leads
  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l: any) =>
        l.full_name?.toLowerCase().includes(q) ||
        l.destination?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.email?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  // Agrupamento por Estágio
  const leadsByStage = useMemo(() => {
    const map: Record<TourismLeadStage, any[]> = {
      new: [],
      qualified: [],
      proposal: [],
      negotiation: [],
      won: [],
    };

    filteredLeads.forEach((l: any) => {
      let stage: TourismLeadStage = "new";
      if (l.status === "won" || l.status === "completed" || l.status === "converted") stage = "won";
      else if (l.status === "negotiation") stage = "negotiation";
      else if (l.status === "proposal" || l.status === "quoted") stage = "proposal";
      else if (l.status === "qualified" || l.status === "contacted") stage = "qualified";
      map[stage].push(l);
    });

    return map;
  }, [filteredLeads]);

  // Métricas do Cockpit
  const pipelineMetrics = useMemo(() => {
    const totalLeads = leads.length;
    const totalPipelineCents = leads.reduce(
      (acc: number, l: any) => acc + (l.estimated_value_cents || 0),
      0
    );
    const wonCount = leadsByStage.won.length;
    const activeTripsCount = trips.length;

    return {
      totalLeads,
      totalPipelineCents,
      wonCount,
      activeTripsCount,
    };
  }, [leads, leadsByStage, trips]);

  const dashboardMetricCards: MetricCardItem[] = [
    {
      id: "pipeline_val",
      label: "Pipeline em Negociação",
      value: formatMoney(pipelineMetrics.totalPipelineCents),
      icon: DollarSign,
      description: "Valor total das oportunidades em aberto",
    },
    {
      id: "total_leads",
      label: "Oportunidades Ativas",
      value: pipelineMetrics.totalLeads,
      icon: Users,
      description: "Passageiros e famílias em atendimento",
    },
    {
      id: "won_sales",
      label: "Vendas Concluídas",
      value: pipelineMetrics.wonCount,
      icon: CheckCircle2,
      description: "Pacotes fechados com sucesso",
    },
    {
      id: "active_trips",
      label: "Viagens Confirmadas",
      value: pipelineMetrics.activeTripsCount,
      icon: Compass,
      description: "Roteiros ativos e com passageiros alocados",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── Barra Superior Canônica ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Compass className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground truncate">
                Turismo & Viagens
              </h1>
              <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                {pipelineMetrics.totalLeads} oportunidades
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cockpit comercial unificado: Atendimento, montagem de propostas e viagens confirmadas
            </p>
          </div>
        </div>

        {/* Ações Primárias */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDashboardOpen(true)}
            className="h-11 min-h-11 px-3.5 text-xs font-medium gap-1.5"
          >
            <TrendingUp className="size-3.5 text-primary" />
            <span>Métricas</span>
          </Button>

          <Button
            type="button"
            onClick={() =>
              setProposalLead({
                id: "",
                fullName: "",
                destination: "",
                passenger_count: 2,
              })
            }
            className="h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" />
            <span>Nova Proposta</span>
          </Button>
        </div>
      </div>

      {/* ── Abas de Visão do Cockpit ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 border-b border-border/30 pb-1">
          <button
            type="button"
            onClick={() => setActiveViewTab("kanban")}
            className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeViewTab === "kanban"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Kanban className="size-3.5" />
            <span>Funil de Vendas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("viagens")}
            className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeViewTab === "viagens"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Plane className="size-3.5" />
            <span>Viagens Confirmadas ({trips.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("propostas")}
            className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeViewTab === "propostas"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <FileText className="size-3.5" />
            <span>Propostas Emitidas ({proposals.length})</span>
          </button>
          <button
            type="button"
            onClick={() => router.navigate({ to: "/workspace/turismo/oportunidades" })}
            className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 text-primary hover:bg-primary/10 border border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Sparkles className="size-3.5" />
            <span>Radar de Oportunidades</span>
          </button>
        </div>

        {/* Campo de Busca Rápida */}
        <div className="relative w-full sm:w-64">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, destino ou fone..."
            className="h-11 min-h-11 pl-9 text-xs rounded-lg"
          />
        </div>
      </div>

      {/* ── CONTEÚDO DA VISÃO ATIVA ── */}

      {/* 1. FUNIL DE VENDAS (KANBAN) */}
      {activeViewTab === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto pb-6">
          {TOURISM_STAGES.map((stage) => {
            const stageLeads = leadsByStage[stage.id];
            return (
              <div
                key={stage.id}
                className="bg-card border border-border/60 rounded-lg flex flex-col min-w-64 max-h-[calc(100vh-280px)]"
              >
                {/* Cabeçalho da Coluna */}
                <div className="p-3 border-b border-border/40 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${stage.dotColor}`} />
                    <span className="text-xs font-bold text-foreground">{stage.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono px-1.5 h-5">
                    {stageLeads.length}
                  </Badge>
                </div>

                {/* Cards da Coluna */}
                <div className="p-2 space-y-2 overflow-y-auto flex-1">
                  {stageLeads.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg">
                      Nenhum contato nesta etapa
                    </div>
                  ) : (
                    stageLeads.map((lead: any) => (
                      <div
                        key={lead.id}
                        className="p-3 rounded-lg border border-border/60 bg-background hover:border-primary/50 transition-colors shadow-sm space-y-2.5 cursor-pointer text-xs"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-foreground truncate block">
                            {lead.full_name || "Contato sem nome"}
                          </span>
                          <span className="font-mono text-xs font-semibold text-primary shrink-0">
                            {formatMoney(lead.estimated_value_cents || 0)}
                          </span>
                        </div>

                        {lead.destination && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <MapPin className="size-3 text-primary shrink-0" />
                            <span className="truncate">{lead.destination}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
                          <span className="text-muted-foreground">
                            {lead.phone || "Sem telefone"}
                          </span>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProposalLead({
                                id: lead.id,
                                fullName: lead.full_name,
                                phone: lead.phone,
                                email: lead.email,
                                destination: lead.destination,
                                estimated_value_cents: lead.estimated_value_cents,
                                passenger_count: lead.pax_adults || 2,
                              });
                            }}
                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10 font-semibold gap-1"
                          >
                            <FileText className="size-3" />
                            <span>Proposta</span>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. VIAGENS CONFIRMADAS */}
      {activeViewTab === "viagens" && (
        <div className="space-y-3">
          {trips.length === 0 ? (
            <EmptyState
              title="Nenhuma viagem confirmada cadastrada"
              description="Quando uma proposta for aprovada no funil, ela é convertida automaticamente em uma viagem confirmada."
              actionLabel="Cadastrar Viagem Avulsa"
              onAction={() => router.navigate({ to: "/workspace/turismo/viagens" })}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trips.map((trip: any) => (
                <Link
                  key={trip.id}
                  to="/workspace/turismo/viagens/$id"
                  params={{ id: trip.id }}
                  className="p-4 rounded-lg border border-border/60 bg-card hover:border-primary/50 transition-colors block text-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-sm truncate">
                      {trip.destination_city || "Destino a Definir"}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs text-emerald-600 border-emerald-500/30">
                      Confirmada
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="size-3.5" />
                    <span>Embarque: {trip.start_date || "A confirmar"}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/30 text-muted-foreground">
                    <span>{trip.customer_name || "Passageiro Principal"}</span>
                    <span className="font-mono font-bold text-foreground">
                      {formatMoney(trip.total_amount_cents || 0)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. PROPOSTAS EMITIDAS */}
      {activeViewTab === "propostas" && (
        <div className="space-y-3">
          {proposals.length === 0 ? (
            <EmptyState
              title="Nenhuma proposta emitida até o momento"
              description="Monte e envie propostas completas pelo funil ou pelo botão Nova Proposta."
              actionLabel="Criar Primeira Proposta"
              onAction={() =>
                setProposalLead({
                  id: "",
                  fullName: "",
                  destination: "",
                  passenger_count: 2,
                })
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {proposals.map((prop: any) => (
                <div
                  key={prop.id}
                  className="p-4 rounded-lg border border-border/60 bg-card space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground truncate block">
                      {prop.title || prop.destination_city}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs capitalize">
                      {prop.status}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground text-xs">
                    Passageiro: <strong className="text-foreground">{prop.customer_name}</strong>
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="font-mono font-bold text-primary">
                      {formatMoney(prop.pricing?.total_price_cents || 0)}
                    </span>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs font-semibold gap-1.5"
                    >
                      <Link to="/workspace/turismo/propostas/$id" params={{ id: prop.id }}>
                        <Eye className="size-3" />
                        <span>Abrir Studio</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DRAWER DO LEAD (VISÃO 360° E DISPARO DE PROPOSTA) ── */}
      {selectedLead && (
        <Sheet open={Boolean(selectedLead)} onOpenChange={() => setSelectedLead(null)}>
          <SheetContent side="right" className="w-full sm:max-w-xl p-4 sm:p-6 overflow-y-auto space-y-4">
            <SheetHeader className="border-b border-border/30 pb-3">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-base font-bold text-foreground">
                  {selectedLead.full_name || "Oportunidade"}
                </SheetTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedLead.status}
                </Badge>
              </div>
              <SheetDescription className="text-xs text-muted-foreground">
                Dados do passageiro, histórico de atendimento e cotação
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                <div>
                  <span className="text-muted-foreground block text-xs">Telefone / WhatsApp</span>
                  <span className="font-semibold text-foreground">{selectedLead.phone || "Não informado"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">E-mail</span>
                  <span className="font-semibold text-foreground">{selectedLead.email || "Não informado"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Destino de Interesse</span>
                  <span className="font-semibold text-foreground">{selectedLead.destination || "A definir"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Orçamento Estimado</span>
                  <span className="font-bold text-primary font-mono">
                    {formatMoney(selectedLead.estimated_value_cents || 0)}
                  </span>
                </div>
              </div>

              {/* Botões de Ação do Lead */}
              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    const leadData = {
                      id: selectedLead.id,
                      fullName: selectedLead.full_name,
                      phone: selectedLead.phone,
                      email: selectedLead.email,
                      destination: selectedLead.destination,
                      estimated_value_cents: selectedLead.estimated_value_cents,
                      passenger_count: selectedLead.pax_adults || 2,
                    };
                    setSelectedLead(null);
                    setProposalLead(leadData);
                  }}
                  className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground"
                >
                  <FileText className="size-4" />
                  <span>Montar Proposta Canônica (Multi-Quartos & Operadoras)</span>
                </Button>

                {/* Avançar Estágio */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleTransitionLead(selectedLead.id, "proposal")}
                    className="h-11 min-h-11 text-xs font-medium"
                  >
                    Marcar: Proposta Enviada
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleTransitionLead(selectedLead.id, "won")}
                    className="h-11 min-h-11 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Aprovar: Viagem Confirmada
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* ── CONSTRUTOR UNIFICADO DE PROPOSTAS (FUSÃO DOS 3 BUILDERS) ── */}
      {proposalLead && (
        <UnifiedProposalWorkspace
          open={Boolean(proposalLead)}
          onOpenChange={(open) => {
            if (!open) setProposalLead(null);
          }}
          lead={proposalLead}
          mode="kanban_lead_quote"
          onCreated={() => {
            refetchLeads();
            queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
          }}
        />
      )}

      {/* ── PAINEL DE MÉTRICAS OPERACIONAIS ── */}
      <WorkspaceDashboardSheet
        open={isDashboardOpen}
        onOpenChange={setIsDashboardOpen}
        title="Painel de Desempenho do Turismo"
        description="Indicadores comerciais de conversão, pipeline e emissões da agência"
        metrics={dashboardMetricCards}
      />
    </div>
  );
}
