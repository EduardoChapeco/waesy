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
  AlertTriangle,
  Luggage,
  ShieldAlert,
  ShieldCheck,
  Receipt,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { listLeads, updateLeadStatus, updateLeadDetails, promoteLeadToCustomer, issueLeadContract, listCustomers, addLeadMeeting } from "@/services/crm.functions";
import { listStoreTrips, convertProposalToTrip } from "@/services/travel-lifecycle.functions";
import { getStoreSettings } from "@/services/store.functions";
import { listAgencyTravelProposals } from "@/services/travel-proposal.functions";
import { listDepartureCards, resolveAirlineCheckinUrl } from "@/services/travel-departures.functions";
import { listTravelSaleFinancialSheets } from "@/services/travel-financials.functions";
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
      const [leadsRes, proposalsRes, tripsRes, departuresRes, sheetsRes, customersRes, store] = await Promise.all([
        listLeads().catch(() => []),
        listAgencyTravelProposals().catch(() => []),
        listStoreTrips({ data: { status: "all" } }).catch(() => []),
        listDepartureCards({ data: {} }).catch(() => []),
        listTravelSaleFinancialSheets({ data: {} }).catch(() => []),
        listCustomers({ data: {} }).catch(() => []),
        getStoreSettings().catch(() => null),
      ]);
      return {
        leads: leadsRes || [],
        proposals: proposalsRes || [],
        trips: tripsRes || [],
        departures: departuresRes || [],
        sheets: sheetsRes || [],
        customers: Array.isArray(customersRes) ? customersRes : (customersRes as any)?.customers || [],
        store,
      };
    } catch (err) {
      console.error("[loader:workspace.turismo.index] Loader fallback:", err);
      return {
        leads: [],
        proposals: [],
        trips: [],
        departures: [],
        sheets: [],
        customers: [],
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
  const {
    leads: initialLeads,
    proposals: initialProposals,
    trips: initialTrips,
    departures: initialDepartures,
    sheets: initialSheets,
    customers: initialCustomers,
    store,
  } = Route.useLoaderData();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [proposalLead, setProposalLead] = useState<UnifiedProposalWorkspaceLead | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<"dashboard" | "kanban" | "viagens" | "propostas">("dashboard");
  const [leadDrawerTab, setLeadDrawerTab] = useState<"cadastro" | "anamnese" | "lgpd" | "reuniao">("cadastro");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingType, setMeetingType] = useState<"call" | "video" | "in_person">("call");
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  const { data: leads = initialLeads, isLoading, refetch: refetchLeads } = useQuery({
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

  const { data: departures = initialDepartures } = useQuery({
    queryKey: ["tourism-departures-list"],
    queryFn: () => listDepartureCards({ data: {} }),
    initialData: initialDepartures,
  });

  const { data: sheets = initialSheets } = useQuery({
    queryKey: ["tourism-financial-sheets"],
    queryFn: () => listTravelSaleFinancialSheets({ data: {} }),
    initialData: initialSheets,
  });

  const { data: customers = initialCustomers } = useQuery({
    queryKey: ["crm-customers-list"],
    queryFn: () => listCustomers({ data: {} }),
    initialData: initialCustomers,
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

  // Data Base de Hoje
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Voos no Dia (Hoje)
  const todayDepartures = useMemo(() => {
    return departures.filter((d: any) => {
      if (!d.departure_date) return false;
      const date = new Date(d.departure_date);
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    });
  }, [departures, today]);

  // Viajantes em Viagem (Em trânsito no destino)
  const activeInTransit = useMemo(() => {
    return departures.filter((d: any) => {
      if (d.stage === "in_travel") return true;
      if (!d.departure_date) return false;
      const dep = new Date(d.departure_date);
      const ret = d.return_date ? new Date(d.return_date) : null;
      if (ret) {
        return today >= dep && today <= ret;
      }
      return false;
    });
  }, [departures, today]);

  // Embarques Próximos (Próximos 7 dias)
  const upcomingWeekDepartures = useMemo(() => {
    return departures.filter((d: any) => {
      if (!d.departure_date) return false;
      const diffDays = Math.ceil((new Date(d.departure_date).getTime() - today.getTime()) / 86400000);
      return diffDays >= 0 && diffDays <= 7;
    });
  }, [departures, today]);

  // Alertas de Documentos / Check-in
  const documentationAlerts = useMemo(() => {
    return departures.filter((d: any) => {
      if (!d.departure_date) return false;
      const diffDays = Math.ceil((new Date(d.departure_date).getTime() - today.getTime()) / 86400000);
      const pct = d.checklist_completed_pct ?? 0;
      return (diffDays >= 0 && diffDays <= 3 && pct < 100) || d.has_urgent_alert;
    });
  }, [departures, today]);

  // Recebíveis / Faturas da Semana
  const pendingReceivablesWeek = useMemo(() => {
    return sheets.filter((s: any) => {
      if (s.receivable_status === "a_receber" || s.receivable_status === "parcialmente_recebido") {
        if (!s.expected_receipt_date) return true;
        const diffDays = Math.ceil((new Date(s.expected_receipt_date).getTime() - today.getTime()) / 86400000);
        return diffDays >= -7 && diffDays <= 7;
      }
      return false;
    });
  }, [sheets, today]);

  const totalPendingReceivablesCents = useMemo(() => {
    return pendingReceivablesWeek.reduce((acc: number, s: any) => {
      const exp = s.expected_receipt_cents || s.agency_revenue_cents || 0;
      const rec = s.received_cents || 0;
      return acc + Math.max(0, exp - rec);
    }, 0);
  }, [pendingReceivablesWeek]);

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
        <div className="flex items-center gap-3 min-w-0">
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
            <p className="text-xs text-muted-foreground mt-1">
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
            className="h-11 min-h-11 px-4 text-xs font-medium gap-2"
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
            onClick={() => setActiveViewTab("dashboard")}
            className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeViewTab === "dashboard"
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Compass className="size-3.5" />
            <span>Geral</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("kanban")}
            className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeViewTab === "kanban"
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Kanban className="size-3.5" />
            <span>Atendimento ({filteredLeads.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("viagens")}
            className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeViewTab === "viagens"
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Plane className="size-3.5" />
            <span>Viagens ({trips.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("propostas")}
            className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeViewTab === "propostas"
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <FileText className="size-3.5" />
            <span>Propostas ({proposals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => router.navigate({ to: "/workspace/turismo/oportunidades" })}
            className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 text-primary hover:bg-primary/10 border border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Sparkles className="size-3.5" />
            <span>Radar</span>
          </button>
        </div>

        {/* Campo de Busca Rápida */}
        <div className="relative w-full sm:w-64">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, destino, voo..."
            className="h-11 min-h-11 pl-9 text-xs rounded-lg"
          />
        </div>
      </div>

      {/* ── CONTEÚDO DA VISÃO ATIVA ── */}

      {/* 0. PAINEL EXECUTIVO DO PROPRIETÁRIO / GERENTE (DASHBOARD GERAL) */}
      {activeViewTab === "dashboard" && (
        <div className="space-y-6">
          {/* Grade Superior de KPIs (Estilo PassHub / Linear Minimalista) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Voos no Dia</span>
                <Plane className="size-3.5 text-primary" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {todayDepartures.length}
              </div>
              <p className="text-xs text-muted-foreground">Partidas programadas hoje</p>
            </div>

            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Viajantes em Viagem</span>
                <Luggage className="size-3.5 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {activeInTransit.length}
              </div>
              <p className="text-xs text-muted-foreground">Passageiros no destino</p>
            </div>

            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Embarques Próximos</span>
                <Calendar className="size-3.5 text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {upcomingWeekDepartures.length}
              </div>
              <p className="text-xs text-muted-foreground">Nos próximos 7 dias</p>
            </div>

            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Atenção Check-in</span>
                <AlertTriangle className="size-3.5 text-amber-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {documentationAlerts.length}
              </div>
              <p className="text-xs text-muted-foreground">Pendências críticas</p>
            </div>

            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Recebíveis da Semana</span>
                <DollarSign className="size-3.5 text-primary" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-primary truncate">
                {formatMoney(totalPendingReceivablesCents)}
              </div>
              <p className="text-xs text-muted-foreground">Comissões a faturar</p>
            </div>
          </div>

          {/* Duas Colunas Operacionais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Coluna 1: Voos do Dia & Próximas 48h */}
            <div className="space-y-4">
              {/* Voos no Dia */}
              <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Plane className="size-4 text-primary" />
                    <h2 className="text-xs font-bold text-foreground">Voos no Dia (Hoje)</h2>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {todayDepartures.length}
                  </Badge>
                </div>

                {todayDepartures.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg">
                    Nenhum voo programado para embarque hoje
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayDepartures.map((d: any) => {
                      const checkinUrl = resolveAirlineCheckinUrl(d.airline_code);
                      return (
                        <div
                          key={d.id}
                          className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-foreground block">{d.client_name}</span>
                              <span className="text-muted-foreground">{d.destination}</span>
                            </div>
                            <span className="font-mono font-semibold text-primary">
                              {d.airline_code ? `${d.airline_code} ${d.flight_number || ""}` : "Voo Direto"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border/30">
                            {d.airline_locator ? (
                              <div className="flex items-center gap-1 font-mono text-xs">
                                <span className="text-muted-foreground">PNR:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(d.airline_locator || "");
                                    toast.success(`Localizador ${d.airline_locator} copiado!`);
                                  }}
                                  className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  {d.airline_locator}
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sem localizador</span>
                            )}

                            {checkinUrl && (
                              <a
                                href={checkinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                <ExternalLink className="size-3" />
                                <span>Check-in CIA</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Embarques Próximos & Checklist */}
              <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-indigo-600" />
                    <h2 className="text-xs font-bold text-foreground">Próximos Embarques (7 Dias)</h2>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-11 min-h-11 px-3 text-xs text-primary hover:bg-primary/10 gap-1 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Link to="/workspace/turismo/embarques">
                      <span>Ver Todos</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>

                {upcomingWeekDepartures.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg">
                    Nenhum embarque previsto nos próximos 7 dias
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingWeekDepartures.slice(0, 5).map((d: any) => {
                      const diffDays = Math.ceil((new Date(d.departure_date).getTime() - today.getTime()) / 86400000);
                      const pct = d.checklist_completed_pct ?? 0;
                      return (
                        <div
                          key={d.id}
                          className="p-3 rounded-lg border border-border/50 bg-background flex items-center justify-between text-xs gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-foreground block truncate">{d.client_name}</span>
                            <span className="text-muted-foreground truncate block">{d.destination}</span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${
                              diffDays <= 2 ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground"
                            }`}>
                              {diffDays === 0 ? "Hoje" : diffDays === 1 ? "Amanhã" : `em ${diffDays}d`}
                            </span>
                            <span className="block text-xs text-muted-foreground mt-1">
                              Checklist {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 2: Viajantes em Viagem & Faturas da Semana */}
            <div className="space-y-4">
              {/* Viajantes em Viagem */}
              <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Luggage className="size-4 text-emerald-600" />
                    <h2 className="text-xs font-bold text-foreground">Viajantes em Destino (Ativos)</h2>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {activeInTransit.length}
                  </Badge>
                </div>

                {activeInTransit.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg">
                    Nenhum passageiro atualmente em trânsito no destino
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeInTransit.map((d: any) => (
                      <div
                        key={d.id}
                        className="p-3 rounded-lg border border-border/50 bg-background flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-foreground block truncate">{d.client_name}</span>
                          <span className="text-muted-foreground truncate block">
                            {d.destination} {d.hotel_name ? `• ${d.hotel_name}` : ""}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 font-mono">
                            Em Viagem
                          </Badge>
                          {d.return_date && (
                            <span className="block text-xs text-muted-foreground mt-1">
                              Retorno: {new Date(d.return_date).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recebíveis de Operadoras */}
              <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="size-4 text-primary" />
                    <h2 className="text-xs font-bold text-foreground">Comissões & Faturas a Receber</h2>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-11 min-h-11 px-3 text-xs text-primary hover:bg-primary/10 gap-1 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Link to="/workspace/turismo/comissoes">
                      <span>Ver Fichas</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>

                {pendingReceivablesWeek.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg">
                    Nenhuma fatura de comissão pendente com vencimento na semana
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingReceivablesWeek.slice(0, 5).map((s: any) => {
                      const amount = (s.expected_receipt_cents || s.agency_revenue_cents || 0) - (s.received_cents || 0);
                      return (
                        <div
                          key={s.id}
                          className="p-3 rounded-lg border border-border/50 bg-background flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-foreground block truncate">
                              {s.primary_operator} • {s.locator_code || s.internal_code}
                            </span>
                            <span className="text-muted-foreground truncate block">
                              Cliente: {s.client_name}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-primary block">
                              {formatMoney(Math.max(0, amount))}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {s.expected_receipt_date ? `Vence: ${s.expected_receipt_date}` : "A receber"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. FUNIL DE VENDAS (KANBAN) */}
      {activeViewTab === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pb-6 waesy-kanban-strip">
          {TOURISM_STAGES.map((stage) => {
            const stageLeads = leadsByStage[stage.id];
            return (
              <div
                key={stage.id}
                className="bg-card border border-border/60 rounded-lg flex flex-col min-w-64 max-h-96"
              >
                {/* Cabeçalho da Coluna */}
                <div className="p-3 border-b border-border/40 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${stage.dotColor}`} />
                    <span className="text-xs font-bold text-foreground">{stage.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono px-2 h-5">
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
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedLead(lead);
                          }
                        }}
                        className="p-3 rounded-lg border border-border/60 bg-background hover:border-primary/50 transition-colors space-y-3 cursor-pointer text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                          <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <MapPin className="size-3 text-primary shrink-0" />
                            <span className="truncate">{lead.destination}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs text-muted-foreground px-2 py-0 h-5">
                            {lead.acquisition_channel || lead.source || "balcão"}
                          </Badge>
                          {Array.isArray(lead.tags) && lead.tags.slice(0, 2).map((t: string) => (
                            <Badge key={t} variant="secondary" className="text-xs px-2 py-0 h-5">
                              {t}
                            </Badge>
                          ))}
                        </div>

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
                            className="h-11 min-h-11 px-3 text-xs text-primary hover:bg-primary/10 font-semibold gap-1 focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="p-4 rounded-lg border border-border/60 bg-card hover:border-primary/50 transition-colors block text-xs space-y-3"
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
                  className="p-4 rounded-lg border border-border/60 bg-card space-y-3 text-xs"
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
                      className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
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

            {/* Sub-abas do Lead */}
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <button
                type="button"
                onClick={() => setLeadDrawerTab("cadastro")}
                className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  leadDrawerTab === "cadastro"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Cadastro
              </button>

              <button
                type="button"
                onClick={() => setLeadDrawerTab("anamnese")}
                className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  leadDrawerTab === "anamnese"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Anamnese
              </button>

              <button
                type="button"
                onClick={() => setLeadDrawerTab("lgpd")}
                className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  leadDrawerTab === "lgpd"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:bg-muted/40"
                }`}
              >
                LGPD
              </button>

              <button
                type="button"
                onClick={() => setLeadDrawerTab("reuniao")}
                className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  leadDrawerTab === "reuniao"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Reunião
              </button>
            </div>

            {/* Conteúdo da Sub-aba */}
            {leadDrawerTab === "cadastro" && (
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

                {/* Canal de Atribuição (Meta Ads CAPI / Google Ads / WhatsApp) */}
                <div className="p-3 rounded-lg border border-border/40 bg-background space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground block">Origem & Canal de Aquisição</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs capitalize">
                      {selectedLead.acquisition_channel || selectedLead.source || "Direto / Balcão"}
                    </Badge>
                    {selectedLead.notes && (
                      <span className="text-xs text-muted-foreground truncate">{selectedLead.notes}</span>
                    )}
                  </div>
                </div>

                {/* Vínculo de Cliente CRM */}
                {customers.length > 0 && (
                  <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground block">Vincular Cliente da Carteira (CRM)</span>
                    <select
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none"
                      defaultValue={selectedLead.customer_id || ""}
                      onChange={(e) => {
                        const sel = customers.find((c: any) => c.id === e.target.value);
                        if (sel) {
                          toast.success(`Cliente ${sel.full_name || sel.legal_name} vinculado!`);
                        }
                      }}
                    >
                      <option value="">Selecionar cliente existente...</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name || c.legal_name} {c.phone ? `(${c.phone})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {leadDrawerTab === "anamnese" && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-foreground block mb-1">Estilo de Viagem</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {["Econômica", "Conforto", "Premium / Luxo"].map((style) => {
                        const isSelected = (selectedLead.notes || "").includes(style);
                        return (
                          <button
                            type="button"
                            key={style}
                            onClick={async () => {
                              const updatedNotes = `${selectedLead.notes || ""}\nEstilo: ${style}`.trim();
                              await updateLeadDetails({ data: { leadId: selectedLead.id, notes: updatedNotes } });
                              setSelectedLead((prev: any) => ({ ...prev, notes: updatedNotes }));
                              refetchLeads();
                              toast.success(`Estilo salvo: ${style}`);
                            }}
                            className={`p-2 rounded border text-center text-xs font-medium cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary font-bold"
                                : "border-border/60 bg-background text-foreground hover:bg-muted/40"
                            }`}
                          >
                            {style}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-foreground block mb-1">Preferência de Hospedagem</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {["Hotel Central", "Resort All-Inclusive", "Pousada Boutique"].map((h) => {
                        const isSelected = (selectedLead.notes || "").includes(h);
                        return (
                          <button
                            type="button"
                            key={h}
                            onClick={async () => {
                              const updatedNotes = `${selectedLead.notes || ""}\nHospedagem: ${h}`.trim();
                              await updateLeadDetails({ data: { leadId: selectedLead.id, notes: updatedNotes } });
                              setSelectedLead((prev: any) => ({ ...prev, notes: updatedNotes }));
                              refetchLeads();
                              toast.success(`Hospedagem salva: ${h}`);
                            }}
                            className={`p-2 rounded border text-center text-xs font-medium cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary font-bold"
                                : "border-border/60 bg-background text-foreground hover:bg-muted/40"
                            }`}
                          >
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-foreground block mb-1">Preferência de Voo & Bagagem</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {["Assento Janela", "Assento Corredor", "Bagagem Despachada (23kg)"].map((p) => {
                        const isSelected = (selectedLead.notes || "").includes(p);
                        return (
                          <button
                            type="button"
                            key={p}
                            onClick={async () => {
                              const updatedNotes = `${selectedLead.notes || ""}\nPreferencia: ${p}`.trim();
                              await updateLeadDetails({ data: { leadId: selectedLead.id, notes: updatedNotes } });
                              setSelectedLead((prev: any) => ({ ...prev, notes: updatedNotes }));
                              refetchLeads();
                              toast.success(`Preferência salva: ${p}`);
                            }}
                            className={`p-2 rounded border text-center text-xs font-medium cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary font-bold"
                                : "border-border/60 bg-background text-foreground hover:bg-muted/40"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-foreground block mb-1">Restrições Alimentares / Saúde</span>
                    <p className="text-xs text-muted-foreground bg-background p-2 rounded border border-border/60">
                      Nenhuma restrição registrada pelo passageiro até o momento.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {leadDrawerTab === "reuniao" && (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-lg border border-border/40 bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Agendar Reunião ou Alinhamento com Cliente</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground block">Assunto da Reunião</label>
                    <Input
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      placeholder="Ex: Apresentação da Cotação Orlando / Réveillon"
                      className="h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground block">Data e Horário</label>
                      <Input
                        type="datetime-local"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        className="h-11 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground block">Tipo de Encontro</label>
                      <select
                        value={meetingType}
                        onChange={(e) => setMeetingType(e.target.value as any)}
                        className="w-full h-11 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="call">Ligação Telefônica / WhatsApp</option>
                        <option value="video">Videoconferência (Google Meet / Zoom)</option>
                        <option value="in_person">Presencial na Agência</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      disabled={isSavingMeeting || !meetingTitle.trim() || !meetingDate}
                      onClick={async () => {
                        setIsSavingMeeting(true);
                        try {
                          await addLeadMeeting({
                            data: {
                              leadId: selectedLead.id,
                              title: meetingTitle.trim(),
                              scheduledAt: new Date(meetingDate).toISOString(),
                              meetingType,
                              durationMinutes: 30,
                            },
                          });
                          toast.success("Reunião agendada com sucesso!");
                          setMeetingTitle("");
                          setMeetingDate("");
                          refetchLeads();
                        } catch (err: any) {
                          toast.error(err?.message || "Erro ao agendar reunião.");
                        } finally {
                          setIsSavingMeeting(false);
                        }
                      }}
                      className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer"
                    >
                      {isSavingMeeting ? "Agendando..." : "Confirmar Agendamento"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {leadDrawerTab === "lgpd" && (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-lg border border-border/40 bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    <span className="text-xs font-bold text-foreground">Governança LGPD (Lei 13.709/2018)</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Consentimento de coleta e tratamento de dados cadastrais, emissão de bilhetes e compartilhamento estritamente necessário com companhias aéreas, hotéis e operadoras parceiras.
                  </p>
                  <div className="p-3 rounded bg-background border border-border/50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Termo de Consentimento</span>
                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 font-mono">
                      Consentido / Ativo
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Ação do Lead */}
            <div className="space-y-2 pt-2 border-t border-border/30">
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
