import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plane,
  FileText,
  Plus,
  Calendar,
  Users,
  Compass,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Luggage,
  Building2,
  Banknote,
  Check,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import {
  WorkspaceDashboardSheet,
  type MetricCardItem,
} from "@/components/workspace/workspace-dashboard-sheet";
import { NewTripSheet } from "@/components/tourism/trips/new-trip-sheet";
import { OperatorVoucherImportSheet } from "@/components/tourism/vouchers/operator-voucher-import-sheet";
import {
  listStoreTrips,
  type TourismTripDTO,
} from "@/services/travel-lifecycle.functions";
import { getStoreSettings } from "@/services/store.functions";
import { formatMoney } from "@/lib/money";
import {
  ModuleTourModal,
  ModuleTourTrigger,
  type TourSlide,
} from "@/components/ui/module-tour-modal";

const TURISMO_TOUR_SLIDES: TourSlide[] = [
  {
    title: "Gestão Completa de Viagens & Roteiros",
    description: "Controle roteiros terrestres e aéreos, datas de embarque, lista de passageiros e status de confirmação com integração direta a vouchers.",
    icon: Compass,
    highlightBadge: "Roteiros & PNR",
    tip: "Clique em 'Nova Reserva' para cadastrar um pacote ou 'Importar Operadora' para OCR automático de vouchers da CVC, Azul e ViagensPromo.",
  },
  {
    title: "Mapa Interativo de Assentos do Ônibus",
    description: "Aloque passageiros poltrona por poltrona no mapa visual do veículo (convencional, executivo ou double decker) e veja a ocupação em tempo real.",
    icon: Users,
    highlightBadge: "Frota & Assentos",
    tip: "A poltrona selecionada é sincronizada no ingresso do passageiro com QR Code de embarque.",
  },
  {
    title: "Emissão de Manifesto ANTT & Rooming List",
    description: "Exporte em 1 clique o manifesto formal de passageiros exigido pela ANTT em PDF e a lista de quartos (Rooming List) para a recepção dos hotéis.",
    icon: FileSpreadsheet,
    highlightBadge: "Compliance & PDF",
    tip: "O manifesto já sai com número de documento, órgão expedidor e telefone de emergência.",
  },
];

export const Route = createFileRoute("/workspace/turismo/viagens/")({
  head: () => ({
    meta: [{ title: "Viagens & Reservas Confirmadas | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
    const [trips, store] = await Promise.all([
      listStoreTrips({ data: { status: "all" } }).catch(() => []),
      getStoreSettings().catch(() => null),
    ]);
    return { trips: trips || [], store };
    } catch (err) {
      console.error("[loader:workspace.turismo.viagens.index] Unhandled error:", err);
      return { trips: [], store: null };
    }
  },
  component: WorkspaceTripsListPage,
});

type TripStatus = "all" | "confirmed" | "in_progress" | "completed" | "cancelled";

export default function WorkspaceTripsListPage() {
  const { trips: initialTrips, store } = ((Route.useLoaderData?.() as any) || {});
  const storeId = store?.id || "";
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<TripStatus>("all");
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [isImportVoucherOpen, setIsImportVoucherOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const safeInitialTrips = Array.isArray(initialTrips) ? initialTrips : [];

  const {
    data: rawTrips = [],
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["workspace-tourism-trips", storeId, activeStatus, searchQuery],
    queryFn: () =>
      listStoreTrips({
        data: {
          status: activeStatus !== "all" ? activeStatus : undefined,
          query: searchQuery || undefined,
        },
      }),
    initialData: safeInitialTrips,
  });

  const trips = Array.isArray(rawTrips) ? rawTrips : [];

  // Métricas calculadas
  const metrics = useMemo(() => {
    const total = trips.length;
    const confirmed = trips.filter((t: TourismTripDTO) => t.status === "confirmed").length;
    const inProgress = trips.filter((t: TourismTripDTO) => t.status === "in_progress").length;
    const completed = trips.filter((t: TourismTripDTO) => t.status === "completed").length;
    const cancelled = trips.filter((t: TourismTripDTO) => t.status === "cancelled").length;
    const totalRevenueCents = trips
      .filter((t: TourismTripDTO) => t.status !== "cancelled")
      .reduce((acc: number, t: TourismTripDTO) => acc + (t.total_cents || 0), 0);

    return { total, confirmed, inProgress, completed, cancelled, totalRevenueCents };
  }, [trips]);

  const metricsItems: MetricCardItem[] = [
    {
      label: "Total de Viagens",
      value: `${metrics.total} roteiros`,
      description: "Roteiros e reservas cadastrados",
    },
    {
      label: "Confirmadas",
      value: `${metrics.confirmed} viagens`,
      description: "Vouchers & PNRs emitidos",
    },
    {
      label: "Em Andamento",
      value: `${metrics.inProgress} ativas`,
      description: "Em execução / pré-embarque",
    },
    {
      label: "Faturamento Total",
      value: formatMoney(metrics.totalRevenueCents),
      description: "Volume financeiro bruto",
    },
  ];

  const TABS = [
    { id: "all", label: "Todas as Viagens", icon: Compass, count: metrics.total },
    { id: "confirmed", label: "Confirmadas", icon: CheckCircle2, count: metrics.confirmed },
    { id: "in_progress", label: "Em Andamento", icon: Clock, count: metrics.inProgress },
    { id: "completed", label: "Concluídas", icon: Check, count: metrics.completed },
    { id: "cancelled", label: "Canceladas", icon: AlertTriangle, count: metrics.cancelled },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <div className="flex items-center justify-end px-1">
        <ModuleTourTrigger onClick={() => setIsTourOpen(true)} label="Guia do Módulo" />
      </div>

      {/* ── 1. TOOLBAR CANÔNICA PADRÃO Waesy ── */}
      <WorkspaceCanonicalToolbar
        tabs={TABS}
        activeTab={activeStatus}
        onTabChange={(id) => setActiveStatus(id as TripStatus)}
        searchPlaceholder="Buscar por número da viagem, destino ou passageiro..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        dashboardLabel="Métricas"
        metricsBadge={formatMoney(metrics.totalRevenueCents)}
        primaryAction={{
          label: "Importar Operadora (OCR)",
          icon: FileText,
          onClick: () => setIsImportVoucherOpen(true),
        }}
        secondaryAction={{
          label: "Nova Reserva",
          icon: Plus,
          onClick: () => setIsNewTripOpen(true),
        }}
      />

      {/* ── 2. LISTA DE VIAGENS COM CARDS PADRONIZADOS ── */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          Carregando roteiros de viagem...
        </div>
      ) : trips.length === 0 ? (
        <div className="py-16 text-center space-y-4 rounded-2xl border border-dashed border-border/80 bg-muted/10">
          <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
            <Compass className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Nenhuma viagem encontrada</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || activeStatus !== "all"
                ? "Nenhuma viagem corresponde aos filtros aplicados."
                : "Registre uma nova reserva ou aprove uma proposta comercial para iniciar a gestão completa."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => setIsNewTripOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="size-3.5" />
              <span>Registrar Primeira Viagem</span>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
              <Link to="/workspace/turismo/cotacoes">Ver Cotações & Leads</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip: TourismTripDTO) => {
            const paxTotal = (trip.adults_count || 1) + (trip.children_count || 0);

            const statusColors: Record<string, string> = {
              confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
              in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/20",
              completed: "bg-sky-500/10 text-sky-600 border-sky-500/20",
              cancelled: "bg-rose-500/10 text-rose-600 border-rose-500/20",
            };

            const statusLabels: Record<string, string> = {
              confirmed: "Confirmada",
              in_progress: "Em Andamento",
              completed: "Concluída",
              cancelled: "Cancelada",
            };

            return (
              <div
                key={trip.id}
                className="group relative rounded-2xl border border-border/70 bg-card hover:border-foreground/20 hover:shadow-sm transition-all flex flex-col justify-between overflow-hidden shadow-2xs"
              >
                <div className="p-4 space-y-3">
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">
                        {trip.trip_number}
                      </span>
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                        {trip.destination_city || trip.title}
                      </h3>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 py-0.5 ${statusColors[trip.status] || ""}`}
                    >
                      {statusLabels[trip.status] || trip.status}
                    </Badge>
                  </div>

                  {/* Detalhes do Cliente */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Users className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground truncate">{trip.client_name}</span>
                      <span className="text-[11px] text-muted-foreground">({paxTotal} pax)</span>
                    </div>

                    {(trip.travel_start_date || trip.travel_end_date) && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                        <span>
                          {trip.travel_start_date || "—"} até {trip.travel_end_date || "—"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Resumo de Serviços Inclusos */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {trip.flights?.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 text-[10px] text-muted-foreground font-medium border border-border/40">
                        <Plane className="size-3 text-sky-500" />
                        {trip.flights.length} voo(s)
                      </span>
                    )}
                    {trip.hotels?.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 text-[10px] text-muted-foreground font-medium border border-border/40">
                        <Building2 className="size-3 text-amber-500" />
                        {trip.hotels.length} hotel(s)
                      </span>
                    )}
                    {trip.transfers?.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 text-[10px] text-muted-foreground font-medium border border-border/40">
                        <Luggage className="size-3 text-emerald-500" />
                        Transfer
                      </span>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card */}
                <div className="p-4 pt-3 border-t border-border/60 bg-muted/10 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                      Valor Total
                    </span>
                    <span className="text-sm font-bold text-foreground font-mono">
                      {formatMoney(trip.total_cents)}
                    </span>
                  </div>

                  <Button asChild size="sm" className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 px-4 cursor-pointer shadow-2xs">
                    <Link to="/workspace/turismo/viagens/$id" params={{ id: trip.id }}>
                      <span>Gerenciar</span>
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. SHEET CANÔNICO PARA REGISTRAR NOVA VIAGEM ── */}
      <OperatorVoucherImportSheet
        open={isImportVoucherOpen}
        onOpenChange={setIsImportVoucherOpen}
        storeId={storeId}
        onSuccess={() => refetch()}
      />

      <NewTripSheet
        open={isNewTripOpen}
        onOpenChange={setIsNewTripOpen}
        storeId={storeId}
        onSuccess={refetch}
      />

      {/* ── 4. DASHBOARD SHEET DE MÉTRICAS OPERACIONAIS ── */}
      <WorkspaceDashboardSheet
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        title="Painel Executivo de Viagens"
        subtitle="Indicadores de faturamento, reservas ativas e passageiros"
        metrics={metricsItems}
      />

      {/* ── 5. ONBOARDING GUIADO DO MÓDULO DE TURISMO ── */}
      <ModuleTourModal
        moduleId="turismo"
        moduleName="Turismo e Viagens"
        slides={TURISMO_TOUR_SLIDES}
        isOpen={isTourOpen}
        onOpenChange={setIsTourOpen}
      />
    </div>
  );
}
