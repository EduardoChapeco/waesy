import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useTransition, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Car,
  Bike,
  Truck,
  Boxes,
  Users,
  MapPin,
  Clock,
  Loader2,
  Phone,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  Heart,
  Star,
  LifeBuoy,
  RefreshCw,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Package,
  Navigation,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import {
  listCustomerMobilityRequests,
  getMyCourierProfile,
  checkCustomerDebtStatus,
  payCustomerDebt,
  type MobilityRequestDTO,
} from "@/services/mobility.functions";
import { listCustomerCaronasAndBusTickets, cancelCaronaBooking } from "@/services/carona.functions";
import { getMyCourierApplicationStatus } from "@/services/courier-verification.functions";
import {
  MobilityReceiptModal,
  MobilityTipModal,
  MobilityCancelModal,
  MobilityRescheduleModal,
  MobilityIncidentModal,
  MobilityRatingModal,
} from "@/components/mobility";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/conta/mobilidade")({
  head: () => ({
    meta: [{ title: "Waesy Go | Atividades, Viagens e Entregas" }],
  }),
  loader: async () => {
    try {
      const { getUserSession } = await import("@/services/auth.functions");
      const session = await getUserSession().catch(() => null);
      if (!session?.user) {
        throw redirect({ to: "/entrar" });
      }

      const [requests, courierApp, courierProfile, debtStatus, caronasData] =
        await Promise.all([
          listCustomerMobilityRequests().catch(() => []),
          getMyCourierApplicationStatus().catch(() => null),
          getMyCourierProfile().catch(() => null),
          checkCustomerDebtStatus().catch(() => ({ has_debts: false, total_debt_cents: 0, debts: [] })),
          listCustomerCaronasAndBusTickets().catch(() => ({ caronaBookings: [], publishedCaronas: [], busTickets: [] })),
        ]);
      return { requests, courierApp, courierProfile, debtStatus, caronasData };
    } catch (err) {
      const { isRedirect } = await import("@tanstack/react-router");
      if (isRedirect(err)) throw err;
      console.error("[loader:_store.conta.mobilidade] Error:", err);
      return {
        requests: [],
        courierApp: null,
        courierProfile: null,
        debtStatus: null,
        caronasData: { caronaBookings: [], publishedCaronas: [], busTickets: [] },
      };
    }
  },
  component: CustomerMobilityDashboardPage,
});

type DashboardTab = "active" | "scheduled" | "history" | "caronas";

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeVariant: "default" | "secondary" | "outline"; colorClass: string }
> = {
  searching: {
    label: "Procurando Parceiro",
    badgeVariant: "secondary",
    colorClass: "bg-amber-500/10 text-amber-950 dark:text-amber-300 border-amber-500/20",
  },
  accepted: {
    label: "Motorista a Caminho",
    badgeVariant: "default",
    colorClass: "bg-emerald-500/10 text-emerald-950 dark:text-emerald-300 border-emerald-500/20",
  },
  in_progress: {
    label: "Em Trajeto",
    badgeVariant: "default",
    colorClass: "bg-blue-500/10 text-blue-950 dark:text-blue-300 border-blue-500/20",
  },
  scheduled: {
    label: "Agendada",
    badgeVariant: "secondary",
    colorClass: "bg-purple-500/10 text-purple-950 dark:text-purple-300 border-purple-500/20",
  },
  delivered: {
    label: "Entregue",
    badgeVariant: "outline",
    colorClass: "bg-muted text-muted-foreground border-border",
  },
  completed: {
    label: "Concluída",
    badgeVariant: "outline",
    colorClass: "bg-muted text-muted-foreground border-border",
  },
  cancelled: {
    label: "Cancelada",
    badgeVariant: "outline",
    colorClass: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

function CustomerMobilityDashboardPage() {
  const navigate = useNavigate();
  const loaderData = ((Route.useLoaderData?.() as any) || {});
  const {
    requests: initialRequests,
    courierApp: initialCourierApp,
    debtStatus: initialDebtStatus,
    caronasData: initialCaronas,
  } = loaderData;

  const [activeTab, setActiveTab] = useState<DashboardTab>("active");

  const [cancellingCaronaId, setCancellingCaronaId] = useState<string | null>(null);

  const handleCancelCarona = async (bookingId: string) => {
    setCancellingCaronaId(bookingId);
    try {
      await cancelCaronaBooking({ data: { bookingId } });
      toast.success("Reserva de carona cancelada com sucesso.");
      navigate({ to: "/conta/mobilidade" });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cancelar carona.");
    } finally {
      setCancellingCaronaId(null);
    }
  };

  const [isPaying, startPaying] = useTransition();

  // Modais de Ação Pós-Serviço & Gestão
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedDriverName, setSelectedDriverName] = useState<string>("Condutor");
  const [selectedServiceType, setSelectedServiceType] = useState<string>("ride_car");
  const [selectedScheduledFor, setSelectedScheduledFor] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("searching");

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentDefaultType, setIncidentDefaultType] = useState<any>("lost_item");
  const [ratingModalOpen, setRatingModalOpen] = useState(false);

  // Queries
  const { data: requests, isLoading, refetch: refetchRequests } = useQuery({
    queryKey: ["customer-mobility-history"],
    queryFn: () => listCustomerMobilityRequests(),
    initialData: initialRequests,
    refetchInterval: 8000,
  });

  const { data: courierApp } = useQuery({
    queryKey: ["my-courier-application-status"],
    queryFn: () => getMyCourierApplicationStatus(),
    initialData: initialCourierApp,
  });

  const { data: debtStatus, refetch: refetchDebts } = useQuery({
    queryKey: ["customer-debt-status"],
    queryFn: () => checkCustomerDebtStatus(),
    initialData: initialDebtStatus,
  });

  const { data: caronasData } = useQuery({
    queryKey: ["customer-caronas-data"],
    queryFn: () => listCustomerCaronasAndBusTickets(),
    initialData: initialCaronas,
  });

  // Filtragem Trifurcada Estrita (MECE - Sem Duplicação Entre Abas)
  const activeRequests = useMemo(() => {
    const now = Date.now();
    return (requests || []).filter(
      (r: any) =>
        r.status !== "scheduled" &&
        (!r.scheduled_for || new Date(r.scheduled_for).getTime() <= now) &&
        (r.status === "searching" || r.status === "accepted" || r.status === "in_progress"),
    );
  }, [requests]);

  const scheduledRequests = useMemo(() => {
    const now = Date.now();
    return (requests || []).filter((r: any) => {
      if (r.status === "cancelled" || r.status === "completed" || r.status === "delivered") {
        return false;
      }
      if (r.status === "scheduled") return true;
      if (r.scheduled_for) {
        return new Date(r.scheduled_for).getTime() > now;
      }
      return false;
    });
  }, [requests]);

  const historyRequests = useMemo(() => {
    return (requests || []).filter(
      (r: any) =>
        r.status === "completed" ||
        r.status === "delivered" ||
        r.status === "cancelled",
    );
  }, [requests]);

  // Se a aba ativa estiver vazia mas outra tiver dados, ajuda a direcionar
  useEffect(() => {
    if (!isLoading && requests && requests.length > 0) {
      if (activeRequests.length === 0 && scheduledRequests.length > 0 && activeTab === "active") {
        setActiveTab("scheduled");
      } else if (activeRequests.length === 0 && scheduledRequests.length === 0 && historyRequests.length > 0 && activeTab === "active") {
        setActiveTab("history");
      }
    }
  }, [requests, activeRequests.length, scheduledRequests.length, historyRequests.length, isLoading]);

  const handlePayDebt = (debtId: string) => {
    startPaying(async () => {
      try {
        await payCustomerDebt({ data: { debtId } });
        toast.success("Débito quitado com sucesso! Seus serviços foram liberados.");
        refetchDebts();
      } catch (err: any) {
        toast.error(err?.message || "Erro ao quitar débito.");
      }
    });
  };

  const openReceipt = (req: MobilityRequestDTO) => {
    setSelectedRequestId(req.id);
    setReceiptModalOpen(true);
  };

  const openTip = (req: MobilityRequestDTO) => {
    setSelectedRequestId(req.id);
    setSelectedDriverName(req.courier_profiles?.full_name || "Motorista");
    setTipModalOpen(true);
  };

  const openRating = (req: MobilityRequestDTO) => {
    setSelectedRequestId(req.id);
    setSelectedDriverName(req.courier_profiles?.full_name || "Motorista");
    setSelectedServiceType(req.service_type);
    setRatingModalOpen(true);
  };

  const openIncident = (req: MobilityRequestDTO, type: "lost_item" | "safety_concern" | "route_dispute" = "lost_item") => {
    setSelectedRequestId(req.id);
    setSelectedDriverName(req.courier_profiles?.full_name || "Condutor");
    setIncidentDefaultType(type);
    setIncidentModalOpen(true);
  };

  const openCancel = (req: MobilityRequestDTO, isSched = false) => {
    setSelectedRequestId(req.id);
    setSelectedStatus(req.status);
    setCancelModalOpen(true);
  };

  const openReschedule = (req: MobilityRequestDTO) => {
    setSelectedRequestId(req.id);
    setSelectedScheduledFor(req.scheduled_for);
    setRescheduleModalOpen(true);
  };

  const repeatTrip = (req: MobilityRequestDTO) => {
    navigate({
      to: "/mobilidade",
      search: {
        origin: req.origin_address,
        dest: req.destination_address,
      } as any,
    });
  };

  const getServiceBadgeLabel = (type: string) => {
    switch (type) {
      case "ride_moto":
        return "Moto";
      case "ride_car":
        return "Corrida";
      case "delivery_express":
        return "Entrega";
      case "freight_van":
        return "Frete";
      case "moving_truck":
        return "Mudança";
      default:
        return "Mobilidade";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 font-sans">
      {/* ── 1. CABEÇALHO GLOBAL DO DASHBOARD WAESY GO ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-foreground">
              Waesy Go
            </h1>
            <Badge variant="outline" className="font-mono text-xs uppercase font-bold tracking-wider px-2 py-1">
              Mobilidade & Logística
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Acompanhe suas corridas em andamento, agendamentos futuros e histórico de entregas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {courierApp?.crosscheck_status === "match_approved" ? (
            <Button
              asChild
              className="rounded-lg h-11 min-h-11 px-4 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-primary-foreground gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer shadow-xs"
            >
              <Link to="/conta/entregador">
                <Bike className="size-4" />
                <span>Painel do Condutor</span>
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              className="rounded-lg h-11 min-h-11 px-4 font-semibold text-xs border-border/80 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
            >
              <Link to="/entregador/cadastro">
                <span>{courierApp ? "Status de Parceiro" : "Seja um Parceiro"}</span>
              </Link>
            </Button>
          )}

          <Button
            asChild
            className="rounded-lg h-11 min-h-11 px-5 font-bold text-xs bg-foreground text-background hover:bg-foreground/90 gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer shadow-xs"
          >
            <Link to="/mobilidade">
              <Plus className="size-4" />
              <span>Pedir agora</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 2. BANNER DE DÉBITO PENDENTE ZERO-TRUST (B.24) ── */}
      {debtStatus?.has_debts && (
        <div className="p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 shrink-0 mt-1" />
              <div>
                <span className="font-bold text-xs block">Pendência Vinculada ao seu CPF no Waesy Go</span>
                <p className="text-xs opacity-90 mt-1 leading-snug">
                  Consta um débito de {formatMoney(debtStatus.total_debt_cents)} por cancelamento fora da tolerância de 3 minutos. O desbloqueio de novas corridas e entregas é imediato após a quitação.
                </p>
              </div>
            </div>
            {debtStatus.debts?.[0] && (
              <Button
                type="button"
                onClick={() => handlePayDebt(debtStatus.debts[0].id)}
                disabled={isPaying}
                className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none shrink-0 cursor-pointer shadow-xs"
              >
                {isPaying ? "Processando..." : "Quitar Débito Agora"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── 3. NAVEGAÇÃO PRINCIPAL TRIFURCADA (Agora | Agendados | Histórico | Caronas) ── */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-4 h-11 min-h-11 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border focus-visible:ring-2 focus-visible:ring-primary ${
            activeTab === "active"
              ? "bg-foreground text-background border-foreground shadow-xs"
              : "bg-muted/30 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Clock className="size-4" />
          <span>Agora</span>
          {activeRequests.length > 0 && (
            <Badge className="size-5 p-0 flex items-center justify-center text-xs bg-emerald-500 text-primary-foreground rounded-full">
              {activeRequests.length}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("scheduled")}
          className={`flex items-center gap-2 px-4 h-11 min-h-11 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
            activeTab === "scheduled"
              ? "bg-foreground text-background border-foreground shadow-xs"
              : "bg-muted/30 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Calendar className="size-4" />
          <span>Agendados</span>
          {scheduledRequests.length > 0 && (
            <Badge className="size-5 p-0 flex items-center justify-center text-xs bg-purple-500 text-primary-foreground rounded-full">
              {scheduledRequests.length}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 h-11 min-h-11 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
            activeTab === "history"
              ? "bg-foreground text-background border-foreground shadow-xs"
              : "bg-muted/30 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <FileText className="size-4" />
          <span>Histórico</span>
          {historyRequests.length > 0 && (
            <Badge variant="outline" className="text-xs px-2 py-0 h-4 font-mono">
              {historyRequests.length}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("caronas")}
          className={`flex items-center gap-2 px-4 h-11 min-h-11 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
            activeTab === "caronas"
              ? "bg-foreground text-background border-foreground shadow-xs"
              : "bg-muted/30 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Users className="size-4" />
          <span>Caronas</span>
          {(caronasData?.caronaBookings?.length || 0) > 0 && (
            <Badge variant="outline" className="text-xs px-2 py-0 h-4 font-mono">
              {caronasData.caronaBookings.length}
            </Badge>
          )}
        </button>
      </div>

      {/* ── 4. CONTEÚDO DAS ABAS ── */}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-foreground" />
          <span className="text-xs">Sincronizando com o centro operacional...</span>
        </div>
      )}

      {/* ── ABA 1: AGORA (Operações Ativas em Tempo Real) ── */}
      {!isLoading && activeTab === "active" && (
        <div className="space-y-4">
          {activeRequests.length === 0 ? (
            /* Empty State Comercial */
            <div className="py-16 text-center space-y-4 bg-muted/20 border border-border/60 rounded-lg p-8">
              <div className="size-12 rounded-lg bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Navigation className="size-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h2 className="text-base font-bold text-foreground">
                  Nenhuma corrida em andamento
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Solicite uma viagem, envie um pacote ou agende um frete com parceiros locais verificados.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button asChild className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg bg-foreground text-background">
                  <Link to="/mobilidade">Pedir Corrida</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg border-border">
                  <Link to="/mobilidade">Enviar Pacote</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg border-border">
                  <Link to="/mobilidade">Frete ou Mudança</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRequests.map((req: any) => {
                const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.searching;
                const isSearching = req.status === "searching";
                const isAccepted = req.status === "accepted";
                const isInProgress = req.status === "in_progress";

                return (
                  <div
                    key={req.id}
                    className="rounded-lg bg-card border border-border p-5 space-y-4 shadow-xs animate-in fade-in"
                  >
                    {/* Topo do Card */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs uppercase font-bold">
                          {getServiceBadgeLabel(req.service_type)}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          #{req.id.slice(0, 8)}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{formatDate(req.created_at)}</span>
                      </div>

                      <Badge className={`text-xs font-bold border ${statusCfg.colorClass}`}>
                        {statusCfg.label}
                      </Badge>
                    </div>

                    {/* PIN de Embarque / Segurança */}
                    {req.delivery_pin && (
                      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                          <ShieldCheck className="size-4 text-primary" />
                          <span>PIN de Segurança (informe ao condutor)</span>
                        </span>
                        <span className="font-mono text-sm font-black tracking-widest text-foreground">
                          {req.delivery_pin}
                        </span>
                      </div>
                    )}

                    {/* Rota (Origem -> Destino) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-2">
                          <MapPin className="size-3.5 text-muted-foreground" />
                          <span>Origem / Coleta</span>
                        </span>
                        <p className="text-foreground pl-5 font-medium">{req.origin_address}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-2">
                          <MapPin className="size-3.5 text-primary" />
                          <span>Destino / Entrega</span>
                        </span>
                        <p className="text-foreground pl-5 font-medium">{req.destination_address}</p>
                      </div>
                    </div>

                    {/* Condutor Parceiro (quando atribuído) */}
                    {req.courier_profiles ? (
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-sm">
                            {req.courier_profiles.full_name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">
                              {req.courier_profiles.full_name}
                            </span>
                            <p className="text-muted-foreground text-xs">
                              {req.courier_profiles.vehicle_model || req.courier_profiles.vehicle_type} • {req.courier_profiles.vehicle_plate || "Placa confirmada"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`https://wa.me/55${req.courier_profiles.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="h-11 min-h-11 px-3 rounded-lg bg-background hover:bg-muted text-foreground font-semibold text-xs flex items-center gap-2 border border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          >
                            <Phone className="size-4" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-3 text-amber-950 dark:text-amber-200">
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-amber-600 shrink-0" />
                        <span>Conectando com motoristas parceiros próximos na região...</span>
                      </div>
                    )}

                    {/* Preço e Botões de Ação */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Valor Estimado:</span>
                        <span className="font-black text-sm text-foreground">
                          {formatMoney(req.final_price_cents || req.estimated_price_cents)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openIncident(req, "safety_concern")}
                          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        >
                          <LifeBuoy className="size-4 mr-2" />
                          <span>Ajuda</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCancel(req, false)}
                          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-destructive/30 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none"
                        >
                          Cancelar
                        </Button>

                        <Button
                          asChild
                          size="sm"
                          className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold bg-foreground text-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        >
                          <Link to="/mobilidade">Ver no Mapa</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABA 2: AGENDADOS (Viagens e Fretes Futuros) ── */}
      {!isLoading && activeTab === "scheduled" && (
        <div className="space-y-4">
          {scheduledRequests.length === 0 ? (
            <div className="py-16 text-center space-y-4 bg-muted/20 border border-border/60 rounded-lg p-8">
              <div className="size-12 rounded-lg bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Calendar className="size-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h2 className="text-base font-bold text-foreground">
                  Nenhum serviço agendado
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Precisa de uma corrida para o aeroporto amanhã cedo ou quer agendar um frete/mudança com antecedência?
                </p>
              </div>

              <div className="pt-2">
                <Button asChild className="h-11 min-h-11 px-5 text-xs font-bold rounded-lg bg-foreground text-background">
                  <Link to="/mobilidade">Agendar Viagem ou Frete</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledRequests.map((req: any) => {
                const scheduledDate = req.scheduled_for ? new Date(req.scheduled_for) : null;
                const dateLabel = scheduledDate
                  ? scheduledDate.toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Data a definir";

                return (
                  <div
                    key={req.id}
                    className="rounded-lg bg-card border border-border p-5 space-y-4 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs uppercase font-bold">
                          {getServiceBadgeLabel(req.service_type)}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          #{req.id.slice(0, 8)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold text-xs bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-lg">
                        <Calendar className="size-3.5" />
                        <span>Agendada: {dateLabel}</span>
                      </div>
                    </div>

                    {/* Rota */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-2">
                          <MapPin className="size-3.5 text-muted-foreground" />
                          <span>Ponto de Partida</span>
                        </span>
                        <p className="text-foreground pl-5 font-medium">{req.origin_address}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-2">
                          <MapPin className="size-3.5 text-primary" />
                          <span>Ponto de Chegada</span>
                        </span>
                        <p className="text-foreground pl-5 font-medium">{req.destination_address}</p>
                      </div>
                    </div>

                    {/* Resumo de Ajudantes / Condições */}
                    {req.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40">
                        {req.notes}
                      </p>
                    )}

                    {/* Preço e Ações */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Valor Previsto:</span>
                        <span className="font-black text-sm text-foreground">
                          {formatMoney(req.estimated_price_cents)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReschedule(req)}
                          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        >
                          <RefreshCw className="size-4 mr-2" />
                          <span>Remarcar</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCancel(req, true)}
                          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-destructive/30 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none"
                        >
                          Cancelar
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => openReceipt(req)}
                          className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABA 3: HISTÓRICO (Concluídas, Entregues e Canceladas) ── */}
      {!isLoading && activeTab === "history" && (
        <div className="space-y-4">
          {historyRequests.length === 0 ? (
            <div className="py-16 text-center space-y-4 bg-muted/20 border border-border/60 rounded-lg p-8">
              <div className="size-12 rounded-lg bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <FileText className="size-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h2 className="text-base font-bold text-foreground">
                  Nenhum histórico anterior
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Suas viagens, entregas e fretes finalizados ficarão salvos aqui com recibos e comprovantes para consulta.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {historyRequests.map((req: any) => {
                const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.completed;
                const isCompleted = req.status === "completed" || req.status === "delivered";

                return (
                  <div
                    key={req.id}
                    className="rounded-lg bg-card border border-border p-5 space-y-4 hover:border-foreground/20 transition-colors shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs uppercase font-bold">
                          {getServiceBadgeLabel(req.service_type)}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          #{req.id.slice(0, 8)}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{formatDate(req.created_at)}</span>
                      </div>

                      <Badge className={`text-xs font-bold border ${statusCfg.colorClass}`}>
                        {statusCfg.label}
                      </Badge>
                    </div>

                    {/* Rota */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-2">
                          <MapPin className="size-3.5 text-muted-foreground" />
                          <span>Origem / Coleta</span>
                        </span>
                        <p className="text-foreground pl-5 font-medium truncate">{req.origin_address}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-2">
                          <MapPin className="size-3.5 text-primary" />
                          <span>Destino / Entrega</span>
                        </span>
                        <p className="text-foreground pl-5 font-medium truncate">{req.destination_address}</p>
                      </div>
                    </div>

                    {/* Condutor Parceiro */}
                    {req.courier_profiles && (
                      <div className="p-3 rounded-lg bg-muted/30 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-foreground text-background flex items-center justify-center font-bold">
                            {req.courier_profiles.full_name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-foreground">
                              {req.courier_profiles.full_name}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {req.courier_profiles.vehicle_model || req.courier_profiles.vehicle_type} • {req.courier_profiles.vehicle_plate || "Placa confirmada"}
                            </p>
                          </div>
                        </div>

                        {req.tip_cents && req.tip_cents > 0 ? (
                          <Badge variant="outline" className="text-emerald-600 font-bold text-xs gap-1">
                            <Heart className="size-3 fill-emerald-500" />
                            <span>Gorjeta: {formatMoney(req.tip_cents)}</span>
                          </Badge>
                        ) : null}
                      </div>
                    )}

                    {/* Ações Pós-Serviço */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-black text-sm text-foreground">
                          {formatMoney(req.final_price_cents || req.estimated_price_cents)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isCompleted && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReceipt(req)}
                              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                            >
                              <FileText className="size-4 mr-2" />
                              <span>Recibo</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRating(req)}
                              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                            >
                              <Star className="size-4 mr-2 text-amber-500" />
                              <span>Avaliar</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openTip(req)}
                              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                            >
                              <Heart className="size-4 mr-2 text-emerald-500" />
                              <span>Gorjeta</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openIncident(req, "lost_item")}
                              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                            >
                              <LifeBuoy className="size-4 mr-2" />
                              <span>Perdi um item</span>
                            </Button>
                          </>
                        )}

                        <Button
                          size="sm"
                          onClick={() => repeatTrip(req)}
                          className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        >
                          <RefreshCw className="size-4 mr-2" />
                          <span>Repetir</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABA 4: CARONAS (Viagens Compartilhadas Intermunicipais) ── */}
      {!isLoading && activeTab === "caronas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-bold text-foreground">
              Caronas Compartilhadas
            </h2>
            <Button asChild size="sm" variant="outline" className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
              <Link to="/mobilidade">Oferecer Carona</Link>
            </Button>
          </div>

          {(!caronasData?.caronaBookings || caronasData.caronaBookings.length === 0) ? (
            <div className="py-16 text-center space-y-4 bg-muted/20 border border-border/60 rounded-lg p-8">
              <div className="size-12 rounded-lg bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="size-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-foreground">
                  Nenhuma reserva de carona
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Encontre viagens intermunicipais compartilhadas dividindo custos de combustível e pedágio com outros membros.
                </p>
              </div>

              <div className="pt-2">
                <Button asChild className="h-11 min-h-11 px-5 text-xs font-bold rounded-lg bg-foreground text-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                  <Link to="/mobilidade">Procurar Carona</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {caronasData.caronaBookings.map((b: any) => {
                const isCancelled = b.status === "cancelled";
                return (
                  <div
                    key={b.id}
                    className="rounded-lg bg-card border border-border p-5 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">
                          {b.from_city} → {b.to_city}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {b.seats_booked} vaga(s)
                        </Badge>
                      </div>

                      <Badge
                        variant={isCancelled ? "outline" : "default"}
                        className={isCancelled ? "text-destructive border-destructive/30 text-xs" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs"}
                      >
                        {isCancelled ? "Cancelada" : `PIN: ${b.boarding_pin || "1000"}`}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Motorista: {b.carona_rides?.driver_name || "Condutor Parceiro"}</span>
                      <span className="font-bold text-foreground text-sm">
                        {formatMoney(b.agreed_price_cents || b.original_price_cents || 0)}
                      </span>
                    </div>

                    {!isCancelled && (
                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                        <span className="text-xs text-muted-foreground">
                          Apresente o PIN ao motorista no embarque
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cancellingCaronaId === b.id}
                          onClick={() => handleCancelCarona(b.id)}
                          className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none"
                        >
                          {cancellingCaronaId === b.id ? "Cancelando..." : "Desistir da Vaga"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 5. MODAIS MODULARES DE PÓS-SERVIÇO & GESTÃO ── */}
      <MobilityReceiptModal
        requestId={selectedRequestId}
        isOpen={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
      />

      <MobilityTipModal
        requestId={selectedRequestId}
        driverName={selectedDriverName}
        isOpen={tipModalOpen}
        onOpenChange={setTipModalOpen}
        onTipSent={() => refetchRequests()}
      />

      <MobilityCancelModal
        requestId={selectedRequestId}
        currentStatus={selectedStatus}
        isScheduled={activeTab === "scheduled"}
        isOpen={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        onCancelled={() => refetchRequests()}
      />

      <MobilityRescheduleModal
        requestId={selectedRequestId}
        currentScheduledFor={selectedScheduledFor}
        isOpen={rescheduleModalOpen}
        onOpenChange={setRescheduleModalOpen}
        onRescheduled={() => refetchRequests()}
      />

      <MobilityIncidentModal
        requestId={selectedRequestId}
        driverName={selectedDriverName}
        defaultType={incidentDefaultType}
        isOpen={incidentModalOpen}
        onOpenChange={setIncidentModalOpen}
      />

      <MobilityRatingModal
        requestId={selectedRequestId}
        driverName={selectedDriverName}
        serviceType={selectedServiceType}
        isOpen={ratingModalOpen}
        onOpenChange={setRatingModalOpen}
        onRated={() => refetchRequests()}
      />
    </div>
  );
}
