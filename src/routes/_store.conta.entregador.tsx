import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useTransition, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bike,
  Car,
  Truck,
  Navigation,
  Star,
  MapPin,
  Clock,
  Phone,
  CheckCircle,
  RefreshCw,
  Fuel,
  Package,
  Store,
  Filter,
  Camera,
  Check,
  Building2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import {
  getMyCourierProfile,
  updateMyCourierPreferences,
  listAvailableMobilityDemands,
  acceptMobilityDemand,
  recordArrivalAndStartTimer,
  cancelByCustomerNoShow,
  logCourierExpense,
  listCourierExpenses,
  getCourierMonthlyInvoice,
  listCourierReviews,
  listCourierCommercialDeliveries,
  listCourierPartnerStores,
  updateCourierDeliveryStatus,
  type CourierProfileDTO,
  type MobilityRequestDTO,
  type CourierCommercialDeliveryDTO,
} from "@/services/mobility.functions";
import { toast } from "sonner";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";

export const Route = createFileRoute("/_store/conta/entregador")({
  head: () => ({
    meta: [{ title: "Painel do Condutor | Waesy Go" }],
  }),
  loader: async () => {
    try {
      const { getUserSession } = await import("@/services/auth.functions");
      const session = await getUserSession().catch(() => null);
      if (!session?.user) {
        throw redirect({ to: "/entrar" });
      }

      const [courierProfile, availableDemands, monthlyInvoice, expenseData, partnerStores, commercialDeliveries] =
        await Promise.all([
          getMyCourierProfile().catch(() => null),
          listAvailableMobilityDemands().catch(() => []),
          getCourierMonthlyInvoice().catch(() => null),
          listCourierExpenses().catch(() => ({ expenses: [], total_expense_cents: 0 })),
          listCourierPartnerStores().catch(() => []),
          listCourierCommercialDeliveries().catch(() => []),
        ]);

      return {
        courierProfile,
        availableDemands,
        monthlyInvoice,
        expenseData,
        partnerStores,
        commercialDeliveries,
      };
    } catch (err) {
      const { isRedirect } = await import("@tanstack/react-router");
      if (isRedirect(err)) throw err;
      console.error("[loader:_store.conta.entregador] Unhandled error:", err);
      return {
        courierProfile: null,
        availableDemands: [],
        monthlyInvoice: null,
        expenseData: { expenses: [], total_expense_cents: 0 },
        partnerStores: [],
        commercialDeliveries: [],
      };
    }
  },
  component: CourierDriverHubPage,
});

function CourierDriverHubPage() {
  const loaderData = (Route.useLoaderData() || {}) as any;
  const initialProfile = loaderData.courierProfile as CourierProfileDTO | null;
  const initialDemands = (loaderData.availableDemands || []) as MobilityRequestDTO[];
  const initialInvoice = loaderData.monthlyInvoice;
  const initialExpenses = loaderData.expenseData || { expenses: [], total_expense_cents: 0 };
  const initialStores = (loaderData.partnerStores || []) as Array<{ id: string; name: string }>;
  const initialDeliveries = (loaderData.commercialDeliveries || []) as CourierCommercialDeliveryDTO[];

  const [activeTab, setActiveTab] = useState("radar");
  const [isPending, startTransition] = useTransition();

  // Queries
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["my-courier-profile"],
    queryFn: () => getMyCourierProfile(),
    initialData: initialProfile,
  });

  const { data: demands, refetch: refetchDemands } = useQuery({
    queryKey: ["available-mobility-demands"],
    queryFn: () => listAvailableMobilityDemands(),
    initialData: initialDemands,
    refetchInterval: 8000,
  });

  const { data: invoice, refetch: refetchInvoice } = useQuery({
    queryKey: ["courier-monthly-invoice"],
    queryFn: () => getCourierMonthlyInvoice(),
    initialData: initialInvoice,
  });

  const { data: expenses, refetch: refetchExpenses } = useQuery({
    queryKey: ["courier-expense-logs"],
    queryFn: () => listCourierExpenses(),
    initialData: initialExpenses,
  });

  const { data: partnerStores } = useQuery({
    queryKey: ["courier-partner-stores"],
    queryFn: () => listCourierPartnerStores(),
    initialData: initialStores,
  });

  const [storeFilter, setStoreFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");

  const { data: commercialDeliveries, refetch: refetchDeliveries } = useQuery({
    queryKey: ["courier-commercial-deliveries", storeFilter, channelFilter],
    queryFn: () =>
      listCourierCommercialDeliveries({
        data: {
          storeId: storeFilter === "all" ? undefined : storeFilter,
          channel: channelFilter === "all" ? undefined : channelFilter,
        },
      }),
    initialData: initialDeliveries,
  });

  const { data: reviews } = useQuery({
    queryKey: ["courier-profile-reviews", profile?.id],
    queryFn: () => (profile?.id ? listCourierReviews({ data: { courierProfileId: profile.id } }) : []),
    enabled: !!profile?.id,
  });

  // Estado das Preferências
  const [isOnline, setIsOnline] = useState(profile?.is_available ?? true);
  const [workMode, setWorkMode] = useState(profile?.work_mode || "mixed");
  const [passengerPref, setPassengerPref] = useState(profile?.passenger_preference || "all");
  const [condoFee, setCondoFee] = useState(
    profile?.condo_entry_fee_cents ? profile.condo_entry_fee_cents / 100 : 3
  );
  const [apartmentFee, setApartmentFee] = useState(
    profile?.apartment_floor_fee_cents ? profile.apartment_floor_fee_cents / 100 : 5
  );
  const [customKmRate, setCustomKmRate] = useState(2.5);
  const [customBaseFee, setCustomBaseFee] = useState(6.0);
  const [vehicleCapacityKg, setVehicleCapacityKg] = useState(profile?.vehicle_capacity_kg || 0);
  const [vehicleCapacityM3, setVehicleCapacityM3] = useState(profile?.vehicle_capacity_m3 || 0);
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState(profile?.vehicle_photo_url || "");

  // Estado de Lançamento de Combustível / Despesa
  const [expenseForm, setExpenseForm] = useState({
    type: "fuel" as "fuel" | "maintenance" | "insurance" | "other",
    amount: "",
    liters: "",
    fuelType: "gasoline" as "gasoline" | "ethanol" | "diesel",
    odometer: "",
    receiptUrl: "",
    notes: "",
  });

  // Estado da Corrida Aceita em Andamento
  const [activeRide, setActiveRide] = useState<MobilityRequestDTO | null>(null);
  const [rideStartedTimerAt, setRideStartedTimerAt] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(180);

  // Efeito do Cronômetro Oficial de 3 Minutos (180 segundos)
  useEffect(() => {
    if (!rideStartedTimerAt) {
      setCountdownSeconds(180);
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(rideStartedTimerAt).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - start) / 1000);
      const remaining = Math.max(0, 180 - elapsedSeconds);
      setCountdownSeconds(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [rideStartedTimerAt]);

  // Se não tiver perfil de condutor aprovado
  if (!profile) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="size-16 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 mx-auto">
          <Bike className="size-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">Torne-se um Condutor Waesy Go</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Trabalhe com autonomia total, sem comissão percentual de 15% ou 20%. Cobramos apenas taxa fixa de R$ 0,99 por corrida realizada.
          </p>
        </div>
        <div className="pt-2">
          <Button
            asChild
            className="h-11 min-h-11 px-6 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-primary-foreground focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Link to="/entregador/cadastro">Cadastrar Minha CNH e Veículo</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Toggle Online/Offline
  const handleToggleOnline = (newStatus: boolean) => {
    setIsOnline(newStatus);
    startTransition(async () => {
      try {
        await updateMyCourierPreferences({ data: { is_available: newStatus } });
        toast.success(newStatus ? "Você está Online para novos chamados." : "Você está Offline.");
        refetchProfile();
      } catch {
        toast.error("Erro ao alterar disponibilidade.");
      }
    });
  };

  // Salvar Preferências e Tarifas
  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateMyCourierPreferences({
          data: {
            work_mode: workMode as any,
            passenger_preference: passengerPref as any,
            condo_entry_fee_cents: Math.round(condoFee * 100),
            apartment_floor_fee_cents: Math.round(apartmentFee * 100),
            vehicle_capacity_kg: Number(vehicleCapacityKg) || 0,
            vehicle_capacity_m3: Number(vehicleCapacityM3) || 0,
            vehicle_photo_url: vehiclePhotoUrl.trim() || null,
            custom_km_rate_cents: Math.round(customKmRate * 100),
            custom_base_fee_cents: Math.round(customBaseFee * 100),
          },
        });
        toast.success("Tarifas e preferências salvas com sucesso!");
        refetchProfile();
      } catch (err: any) {
        toast.error(err?.message || "Erro ao salvar tarifas.");
      }
    });
  };

  // Aceitar Chamado no Radar
  const handleAcceptDemand = (req: MobilityRequestDTO) => {
    startTransition(async () => {
      try {
        const res = await acceptMobilityDemand({ data: { requestId: req.id } });
        setActiveRide(res.request as any);
        toast.success(`Chamado aceito! Código PIN gerado: ${res.pin}`);
        refetchDemands();
      } catch (err: any) {
        toast.error(err?.message || "Erro ao aceitar chamado.");
      }
    });
  };

  // Iniciar Cronômetro de 3 Minutos na Chegada com Telemetria GPS
  const handleRecordArrival = () => {
    if (!activeRide) return;
    startTransition(async () => {
      try {
        let lat: number | undefined;
        let lng: number | undefined;

        if (typeof navigator !== "undefined" && navigator.geolocation) {
          try {
            const pos: GeolocationPosition = await new Promise((res, rej) =>
              navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
            );
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          } catch {
            // Segue mesmo se timeout de GPS
          }
        }

        await recordArrivalAndStartTimer({
          data: { requestId: activeRide.id, latitude: lat, longitude: lng },
        });
        setRideStartedTimerAt(new Date().toISOString());
        setCountdownSeconds(180);
        toast.info("Chegada registrada. Tolerância oficial de 3 minutos iniciada com telemetria GPS.");
      } catch {
        toast.error("Erro ao registrar chegada.");
      }
    });
  };

  // Cancelar por Não Comparecimento (Débito Compulsório no CPF)
  const handleNoShowCancel = () => {
    if (!activeRide) return;
    startTransition(async () => {
      try {
        await cancelByCustomerNoShow({ data: { requestId: activeRide.id } });
        toast.success("Corrida cancelada por não comparecimento. Débito integral registrado no CPF do cliente.");
        setActiveRide(null);
        setRideStartedTimerAt(null);
        refetchDemands();
      } catch (err: any) {
        toast.error(err?.message || "Erro ao registrar não comparecimento.");
      }
    });
  };

  // Lançar Despesa / Combustível
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(expenseForm.amount.replace(",", "."));
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Informe um valor válido de despesa.");
      return;
    }

    startTransition(async () => {
      try {
        await logCourierExpense({
          data: {
            expense_type: expenseForm.type,
            amount_cents: Math.round(amountVal * 100),
            liters: expenseForm.liters ? parseFloat(expenseForm.liters) : undefined,
            fuel_type: expenseForm.type === "fuel" ? expenseForm.fuelType : undefined,
            odometer_km: expenseForm.odometer ? parseInt(expenseForm.odometer, 10) : undefined,
            receipt_url: expenseForm.receiptUrl || undefined,
            notes: expenseForm.notes || undefined,
          },
        });
        toast.success("Despesa registrada com sucesso!");
        setExpenseForm({
          type: "fuel",
          amount: "",
          liters: "",
          fuelType: "gasoline",
          odometer: "",
          receiptUrl: "",
          notes: "",
        });
        refetchExpenses();
      } catch (err: any) {
        toast.error(err?.message || "Erro ao registrar despesa.");
      }
    });
  };

  // Atualizar Status de Entrega Comercial
  const handleUpdateDeliveryStatus = (orderId: string, nextStatus: "in_progress" | "delivered") => {
    startTransition(async () => {
      try {
        await updateCourierDeliveryStatus({
          data: { orderId, status: nextStatus },
        });
        toast.success(nextStatus === "in_progress" ? "Entrega iniciada! A caminho." : "Entrega concluída com sucesso!");
        refetchDeliveries();
      } catch (err: any) {
        toast.error(err?.message || "Erro ao atualizar entrega.");
      }
    });
  };

  // Cálculo de Lucro Líquido Real
  const grossRevenueCents = (invoice?.total_rides || 0) * 1800; // Média estimada de R$ 18,00 por corrida
  const totalExpenseCents = expenses?.total_expense_cents || 0;
  const platformFeeCents = invoice?.total_payable_cents || 0;
  const netProfitCents = Math.max(0, grossRevenueCents - totalExpenseCents - platformFeeCents);
  const netMarginPercent = grossRevenueCents > 0 ? Math.round((netProfitCents / grossRevenueCents) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
      <NativeMobileHeader title="Painel do Condutor" fallbackHref="/conta" />

      {/* ── 1. HEADER OPERACIONAL: STATUS, VEÍCULO & TOGGLE ONLINE ── */}
      <div className="bg-card rounded-lg border border-border/70 p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="size-14 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shrink-0">
            {profile.vehicle_type === "car" ? (
              <Car className="size-7" />
            ) : profile.vehicle_type === "truck" || profile.vehicle_type === "van" ? (
              <Truck className="size-7" />
            ) : (
              <Bike className="size-7" />
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground truncate">{profile.full_name}</h1>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-mono">
                WAESY GO
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {profile.vehicle_model || profile.vehicle_type} • Placa {profile.vehicle_plate || "Verificada"}
            </p>
          </div>
        </div>

        {/* Toggle Online / Offline */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-border/40 pt-3 sm:pt-0">
          <div className="text-right">
            <span className="text-xs uppercase font-bold text-muted-foreground block font-mono">
              Disponibilidade
            </span>
            <span className={`text-xs font-bold ${isOnline ? "text-emerald-600" : "text-muted-foreground"}`}>
              {isOnline ? "Pronto para Corridas" : "Pausado / Offline"}
            </span>
          </div>
          <Button
            type="button"
            onClick={() => handleToggleOnline(!isOnline)}
            disabled={isPending}
            className={`h-11 min-h-11 px-5 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${
              isOnline
                ? "bg-emerald-600 hover:bg-emerald-700 text-primary-foreground"
                : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            {isOnline ? "Ficar Offline" : "Ficar Online"}
          </Button>
        </div>
      </div>

      {/* ── 2. CARDS RESUMO DO DIA E FATURA ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs uppercase font-mono text-muted-foreground">Avaliação Média</span>
          <p className="text-xl font-black text-foreground flex items-center gap-1 font-mono">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            {profile.rating.toFixed(1)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs uppercase font-mono text-muted-foreground">Total de Viagens</span>
          <p className="text-xl font-black text-foreground font-mono">{profile.total_rides}</p>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs uppercase font-mono text-muted-foreground">Fatura Waesy (R$ 0,99)</span>
          <p className="text-xl font-black text-foreground font-mono">
            {formatMoney(invoice?.total_payable_cents || 0)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs uppercase font-mono text-muted-foreground">Despesas Veículo</span>
          <p className="text-xl font-black text-foreground font-mono">
            {formatMoney(expenses?.total_expense_cents || 0)}
          </p>
        </div>
      </div>

      {/* ── 3. CORRIDA ATIVA EM ANDAMENTO COM CRONÔMETRO DE 3 MINUTOS ── */}
      {activeRide && (
        <div className="p-5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="size-5 text-emerald-600 animate-pulse motion-reduce:animate-none" />
              <h2 className="text-sm font-bold text-foreground">Corrida em Andamento</h2>
            </div>
            <Badge className="bg-emerald-600 text-primary-foreground font-mono text-xs">PIN REQUERIDO</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <MapPin className="size-4 text-muted-foreground" /> Origem:
              </span>
              <p className="font-semibold text-foreground">{activeRide.origin_address}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <MapPin className="size-4 text-muted-foreground" /> Destino:
              </span>
              <p className="font-semibold text-foreground">{activeRide.destination_address}</p>
            </div>
          </div>

          {/* Banner do Cronômetro Oficial de 3 Minutos */}
          {rideStartedTimerAt && (
            <div className="p-3 rounded-lg bg-card border border-emerald-500/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-emerald-600 animate-spin motion-reduce:animate-none" />
                <div>
                  <span className="text-xs font-bold text-foreground">
                    Tolerância Oficial de Espera no Ponto
                  </span>
                  <p className="text-xs text-muted-foreground font-mono">
                    {countdownSeconds > 0
                      ? `Tempo restante: ${Math.floor(countdownSeconds / 60)}:${String(countdownSeconds % 60).padStart(2, "0")}`
                      : "Tempo de tolerância expirado (Cliente ausente)"}
                  </p>
                </div>
              </div>
              <Badge
                variant={countdownSeconds === 0 ? "destructive" : "outline"}
                className="font-mono text-xs px-2 py-1"
              >
                {countdownSeconds > 0
                  ? `${Math.floor(countdownSeconds / 60)}:${String(countdownSeconds % 60).padStart(2, "0")}`
                  : "EXPIROU"}
              </Badge>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-500/20">
            <div className="text-xs">
              <span className="text-muted-foreground">Passageiro:</span>{" "}
              <strong className="text-foreground">{activeRide.customer_name}</strong> •{" "}
              <a
                href={`https://wa.me/55${activeRide.customer_phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 underline font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                Abrir WhatsApp
              </a>
            </div>

            <div className="flex items-center gap-2">
              {!rideStartedTimerAt ? (
                <Button
                  onClick={handleRecordArrival}
                  disabled={isPending}
                  className="h-11 min-h-11 px-4 text-xs font-bold bg-foreground text-background focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Cheguei no Ponto (Iniciar 3min GPS)
                </Button>
              ) : (
                <Button
                  onClick={handleNoShowCancel}
                  disabled={isPending}
                  variant="destructive"
                  className="h-11 min-h-11 px-4 text-xs font-bold focus-visible:ring-2 focus-visible:ring-destructive"
                >
                  Não Compareceu (Cobrar no CPF)
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. AS 5 ABAS OPERACIONAIS CANÔNICAS (WAESY GO) ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full h-auto min-h-11 bg-muted/60 p-1 rounded-lg gap-1">
          <TabsTrigger value="radar" className="text-xs font-semibold rounded-md h-11 min-h-11">
            Radar Chamados
          </TabsTrigger>
          <TabsTrigger value="entregas" className="text-xs font-semibold rounded-md h-11 min-h-11">
            Minhas Entregas
          </TabsTrigger>
          <TabsTrigger value="tarifas" className="text-xs font-semibold rounded-md h-11 min-h-11">
            Minhas Tarifas
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="text-xs font-semibold rounded-md h-11 min-h-11">
            Combustível & Lucro
          </TabsTrigger>
          <TabsTrigger value="avaliacoes" className="text-xs font-semibold rounded-md h-11 min-h-11">
            Veículo & Notas
          </TabsTrigger>
        </TabsList>

        {/* ── ABA 1: RADAR DE CHAMADOS DISPONÍVEIS ── */}
        <TabsContent value="radar" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">
              Chamados aguardando condutor em tempo real
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchDemands()}
              className="h-11 min-h-11 px-4 text-xs gap-2 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RefreshCw className="size-4" />
              <span>Atualizar</span>
            </Button>
          </div>

          {demands.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-card rounded-lg border border-border/60 p-6">
              <Navigation className="size-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-semibold text-foreground">Nenhum chamado aberto no momento</p>
              <p className="text-xs text-muted-foreground">
                Mantenha seu status Online. Novos pedidos de transporte e entrega aparecerão aqui instantaneamente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {demands.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-lg bg-card border border-border/70 hover:border-foreground/20 transition-colors space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-xs uppercase">
                      {req.service_type}
                    </Badge>
                    <div className="text-right">
                      <span className="text-base font-bold text-foreground font-mono block">
                        {formatMoney(req.estimated_price_cents)}
                      </span>
                      <span className="text-xs text-emerald-600 font-mono">
                        Líquido: {formatMoney(Math.max(0, req.estimated_price_cents - 99))} (Taxa R$ 0,99)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-xs">Coleta / Origem:</span>
                      <p className="text-foreground truncate">{req.origin_address}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Destino:</span>
                      <p className="text-foreground truncate">{req.destination_address}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <span className="text-muted-foreground">
                      {req.distance_km} km • ~{req.estimated_duration_minutes} min • Taxa Waesy Fixa R$ 0,99
                    </span>
                    <Button
                      onClick={() => handleAcceptDemand(req)}
                      disabled={isPending || !isOnline}
                      className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Aceitar Corrida (Gerar PIN)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ABA 2: MINHAS ENTREGAS & LOJAS PARCEIRAS (FILTRO POR LOJA E CANAL) ── */}
        <TabsContent value="entregas" className="space-y-4">
          <div className="bg-card rounded-lg border border-border/70 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Store className="size-4 text-primary" />
                Filtros de Entregas Comerciais
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchDeliveries()}
                className="h-11 min-h-11 px-4 text-xs gap-2 focus-visible:ring-2 focus-visible:ring-primary"
              >
                <RefreshCw className="size-4" />
                <span>Atualizar</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Loja Parceira</Label>
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="w-full h-11 min-h-11 rounded-lg border border-border/80 bg-background px-3 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="all">Todas as Lojas</option>
                  {partnerStores.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Canal de Origem</Label>
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="w-full h-11 min-h-11 rounded-lg border border-border/80 bg-background px-3 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="all">Todos os Canais</option>
                  <option value="balcao">Balcão / PDV</option>
                  <option value="whatsapp">WhatsApp Comercial</option>
                  <option value="ifood">iFood / Delivery</option>
                  <option value="e_commerce">E-commerce / Loja Virtual</option>
                  <option value="direct">Direto / Avulso</option>
                </select>
              </div>
            </div>
          </div>

          {commercialDeliveries.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-card rounded-lg border border-border/60 p-6">
              <Package className="size-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-semibold text-foreground">Nenhuma entrega comercial encontrada</p>
              <p className="text-xs text-muted-foreground">
                As entregas solicitadas pelas lojas conveniadas para retirada ou entrega aos clientes aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {commercialDeliveries.map((deliv) => (
                <div
                  key={deliv.id}
                  className="p-5 rounded-lg bg-card border border-border/70 hover:border-foreground/20 transition-colors space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">#{deliv.order_number}</span>
                      <Badge variant="outline" className="text-xs font-medium">
                        {deliv.store_name}
                      </Badge>
                      <Badge variant="secondary" className="text-xs uppercase font-mono">
                        {deliv.channel}
                      </Badge>
                    </div>
                    <span className="text-base font-bold text-foreground font-mono">
                      {formatMoney(deliv.delivery_fee_cents)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-xs">Retirada:</span>
                      <p className="text-foreground truncate">{deliv.origin_address}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Entrega:</span>
                      <p className="text-foreground truncate">{deliv.destination_address}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-border/40 text-xs gap-2">
                    <div className="text-muted-foreground">
                      Cliente: <strong className="text-foreground">{deliv.customer_name}</strong>
                      {deliv.customer_phone && (
                        <>
                          {" "}•{" "}
                          <a
                            href={`https://wa.me/55${deliv.customer_phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 underline font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                          >
                            WhatsApp
                          </a>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {deliv.status !== "in_progress" && deliv.status !== "delivered" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateDeliveryStatus(deliv.id, "in_progress")}
                          disabled={isPending}
                          className="h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          Iniciar Rota
                        </Button>
                      )}
                      {deliv.status === "in_progress" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateDeliveryStatus(deliv.id, "delivered")}
                          disabled={isPending}
                          className="h-11 min-h-11 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-primary-foreground focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          Confirmar Entrega
                        </Button>
                      )}
                      {deliv.status === "delivered" && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-mono">
                          Entregue
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ABA 3: MINHAS TARIFAS E PREFERÊNCIAS AUTÔNOMAS ── */}
        <TabsContent value="tarifas" className="space-y-4">
          <form onSubmit={handleSavePreferences} className="bg-card rounded-lg border border-border/70 p-5 space-y-4 shadow-2xs">
            <h2 className="text-sm font-bold text-foreground">Definição Autônoma de Tarifas & Regras</h2>
            <p className="text-xs text-muted-foreground">
              Você decide quanto cobrar por quilômetro e adicionais de condomínio, subida de escada e carga máxima.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Tarifa de Saída (Bandeirada R$)</Label>
                <Input
                  type="number"
                  step="0.50"
                  min="4"
                  value={customBaseFee}
                  onChange={(e) => setCustomBaseFee(parseFloat(e.target.value) || 0)}
                  className="h-11 min-h-11 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Valor por KM Rodado (R$)</Label>
                <Input
                  type="number"
                  step="0.10"
                  min="1.5"
                  value={customKmRate}
                  onChange={(e) => setCustomKmRate(parseFloat(e.target.value) || 0)}
                  className="h-11 min-h-11 text-xs"
                />
                <span className="text-xs text-muted-foreground">Piso sugerido para moto: R$ 2,00/km | Carro: R$ 2,50/km</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Adicional Entrada Condomínio Fechado (R$)</Label>
                <Input
                  type="number"
                  step="0.50"
                  min="0"
                  value={condoFee}
                  onChange={(e) => setCondoFee(parseFloat(e.target.value) || 0)}
                  className="h-11 min-h-11 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Adicional Subir no Apartamento (Porta R$)</Label>
                <Input
                  type="number"
                  step="0.50"
                  min="0"
                  value={apartmentFee}
                  onChange={(e) => setApartmentFee(parseFloat(e.target.value) || 0)}
                  className="h-11 min-h-11 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Capacidade de Carga (kg)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={vehicleCapacityKg}
                  onChange={(e) => setVehicleCapacityKg(parseFloat(e.target.value) || 0)}
                  className="h-11 min-h-11 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Capacidade Volumétrica (m³)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={vehicleCapacityM3}
                  onChange={(e) => setVehicleCapacityM3(parseFloat(e.target.value) || 0)}
                  className="h-11 min-h-11 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Modo de Operação</Label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="w-full h-11 min-h-11 rounded-lg border border-border/80 bg-background px-3 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="mixed">Misto (Passageiros, Encomendas e Lojas)</option>
                  <option value="commercial_only">Apenas Lojas & Comércios (B2B)</option>
                  <option value="rides_only">Apenas Corridas de Passageiros</option>
                  <option value="delivery_only">Apenas Delivery & Encomendas</option>
                  <option value="moving_only">Apenas Mudanças e Cargas</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Preferência de Passageiro</Label>
                <select
                  value={passengerPref}
                  onChange={(e) => setPassengerPref(e.target.value)}
                  className="w-full h-11 min-h-11 rounded-lg border border-border/80 bg-background px-3 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="all">Todos os Passageiros</option>
                  <option value="women_only">Exclusivo Mulheres (Para Motoristas Mulheres)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button
                type="submit"
                disabled={isPending}
                className="h-11 min-h-11 px-6 rounded-lg text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary"
              >
                Salvar Tarifas & Preferências
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ── ABA 4: COMBUSTÍVEL, DESPESAS & LUCRO LÍQUIDO REAL ── */}
        <TabsContent value="financeiro" className="space-y-4">
          {/* Quadro de Comparação & Lucro Líquido Real */}
          <div className="p-5 rounded-lg bg-card border border-border/70 space-y-3 shadow-2xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Fuel className="size-4 text-primary" />
              Gastos com Combustível vs. Entradas (Lucro Líquido Real)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                <span className="text-xs text-muted-foreground uppercase font-mono">Receita Bruta</span>
                <p className="text-lg font-bold text-foreground font-mono">{formatMoney(grossRevenueCents)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                <span className="text-xs text-muted-foreground uppercase font-mono">Combustível/Peças</span>
                <p className="text-lg font-bold text-destructive font-mono">-{formatMoney(totalExpenseCents)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                <span className="text-xs text-muted-foreground uppercase font-mono">Taxa Waesy (R$ 0,99)</span>
                <p className="text-lg font-bold text-muted-foreground font-mono">-{formatMoney(platformFeeCents)}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-xs text-emerald-700 uppercase font-mono font-bold">Lucro Líquido Real</span>
                <p className="text-lg font-bold text-emerald-600 font-mono flex items-center gap-1">
                  {formatMoney(netProfitCents)}
                  {netMarginPercent > 0 && <span className="text-xs">({netMarginPercent}%)</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Formulário de Registro de Abastecimento com Upload de Comprovante */}
            <form onSubmit={handleAddExpense} className="bg-card rounded-lg border border-border/70 p-5 space-y-3 shadow-2xs">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Fuel className="size-4 text-primary" />
                Registrar Gasto de Combustível / Manutenção
              </h2>
              <p className="text-xs text-muted-foreground">
                Mantenha o controle do seu lucro líquido real abatendo custos da gasolina e peças.
              </p>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Tipo de Despesa</Label>
                  <select
                    value={expenseForm.type}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, type: e.target.value as any }))}
                    className="w-full h-11 min-h-11 rounded-lg border border-border/80 bg-background px-3 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="fuel">Abastecimento de Combustível</option>
                    <option value="maintenance">Manutenção Mecânica / Peça</option>
                    <option value="insurance">Seguro / Proteção Veicular</option>
                    <option value="other">Outros Gastos</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Valor Total (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 50.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                      className="h-11 min-h-11 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Litros Abastecidos</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 8.5"
                      value={expenseForm.liters}
                      onChange={(e) => setExpenseForm((prev) => ({ ...prev, liters: e.target.value }))}
                      className="h-11 min-h-11 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Combustível</Label>
                    <select
                      value={expenseForm.fuelType}
                      onChange={(e) => setExpenseForm((prev) => ({ ...prev, fuelType: e.target.value as any }))}
                      className="w-full h-11 min-h-11 rounded-lg border border-border/80 bg-background px-3 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <option value="gasoline">Gasolina</option>
                      <option value="ethanol">Etanol</option>
                      <option value="diesel">Diesel</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Odômetro (KM)</Label>
                    <Input
                      type="number"
                      step="1"
                      placeholder="Ex: 45200"
                      value={expenseForm.odometer}
                      onChange={(e) => setExpenseForm((prev) => ({ ...prev, odometer: e.target.value }))}
                      className="h-11 min-h-11 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">URL do Comprovante de Abastecimento</Label>
                  <Input
                    type="url"
                    placeholder="https://... comprovante fiscal"
                    value={expenseForm.receiptUrl}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, receiptUrl: e.target.value }))}
                    className="h-11 min-h-11 text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 min-h-11 rounded-lg text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Registrar Despesa
                </Button>
              </div>
            </form>

            {/* Extrato de Despesas Recentes */}
            <div className="bg-card rounded-lg border border-border/70 p-5 space-y-3 shadow-2xs">
              <h2 className="text-sm font-bold text-foreground">Histórico de Gastos do Veículo</h2>
              {expenses.expenses.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Nenhum gasto lançado este mês.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {expenses.expenses.map((exp: any) => (
                    <div key={exp.id} className="p-3 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-foreground capitalize">{exp.expense_type}</span>
                        <p className="text-xs text-muted-foreground font-mono">
                          {formatDate(exp.created_at)} {exp.liters ? `• ${exp.liters}L` : ""}
                        </p>
                        {exp.receipt_url && (
                          <a
                            href={exp.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                          >
                            Ver Comprovante
                          </a>
                        )}
                      </div>
                      <span className="font-bold text-destructive font-mono">
                        -{formatMoney(exp.amount_cents)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── ABA 5: AVALIAÇÕES & FOTO DO VEÍCULO ── */}
        <TabsContent value="avaliacoes" className="space-y-4">
          {/* Card do Veículo & Foto */}
          <div className="bg-card rounded-lg border border-border/70 p-5 space-y-4 shadow-2xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Camera className="size-4 text-primary" />
              Veículo e Identificação Oficial
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground block">Foto Oficial do Veículo</span>
                <div className="w-full h-44 rounded-lg overflow-hidden bg-muted/40 border border-border/60 flex items-center justify-center">
                  {vehiclePhotoUrl ? (
                    <img
                      src={vehiclePhotoUrl}
                      alt="Foto do veículo"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="text-center space-y-1 text-muted-foreground p-4">
                      <Camera className="size-8 mx-auto opacity-50" />
                      <p className="text-xs">Nenhuma foto cadastrada</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">URL da Foto do Veículo</Label>
                  <Input
                    type="url"
                    placeholder="https://... foto do carro ou moto"
                    value={vehiclePhotoUrl}
                    onChange={(e) => setVehiclePhotoUrl(e.target.value)}
                    className="h-11 min-h-11 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">
                    Exibida no perfil público e para o passageiro conferir o veículo ao embarcar.
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modelo:</span>
                    <strong className="text-foreground">{profile.vehicle_model || profile.vehicle_type}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Placa:</span>
                    <strong className="text-foreground">{profile.vehicle_plate || "Verificada"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selo:</span>
                    <strong className="text-emerald-600">Condutor Verificado Waesy Go</strong>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={isPending}
                  className="w-full h-11 min-h-11 rounded-lg text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Salvar Foto do Veículo
                </Button>
              </div>
            </div>
          </div>

          {/* Feed de Avaliações e Depoimentos Reais */}
          <div className="bg-card rounded-lg border border-border/70 p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Avaliações de Clientes Verificados</h2>
              <div className="flex items-center gap-1 font-bold text-sm text-foreground">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                <span>{profile.rating.toFixed(1)} / 5.0</span>
              </div>
            </div>

            {!reviews || reviews.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Nenhuma avaliação por escrito ainda. Conclua viagens para receber avaliações com estrelas e depoimentos.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev: any) => (
                  <div key={rev.id} className="p-4 rounded-lg bg-muted/20 border border-border/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-4 ${
                              i < rev.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatDate(rev.created_at)}
                      </span>
                    </div>
                    {rev.comment && <p className="text-foreground leading-relaxed">"{rev.comment}"</p>}
                    {rev.tags && rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {rev.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
