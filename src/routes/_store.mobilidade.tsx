import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Car,
  Bike,
  Zap,
  Truck,
  Boxes,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  Loader2,
  Navigation,
  Crosshair,
  ChevronDown,
  ChevronUp,
  X,
  CreditCard,
  QrCode,
  Banknote,
  RotateCw,
  ArrowLeft,
  Smartphone,
  Check,
  Send,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Package,
  ArrowRight,
  Info,
  Phone,
  Plus,
} from "lucide-react";
import { formatDate } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStoredLocation } from "@/components/location/location-master-pill";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import {
  calculateCategorizedMobilityOptions,
  createMobilityRequest,
  checkCustomerDebtStatus,
  payCustomerDebt,
  type MobilityServiceType,
  type MobilityRequestDTO,
  type MobilityProductCategory,
  type CategorizedMobilityOption,
} from "@/services/mobility.functions";
import { getBrowserClient } from "@/lib/supabase";
import { MapLibreCanvas, type MapPoint } from "@/components/mobility/maplibre-canvas";
import { ActionAuthGuardModal } from "@/components/common/action-auth-guard-modal";
import { MobilityCancelModal } from "@/components/mobility/mobility-cancel-modal";
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";
import {
  listMatchingCaronas,
  listIntercityBusSchedules,
  bookIntercityBusTicket,
  type MatchedCaronaCorridorDTO,
} from "@/services/carona.functions";
import { Ticket } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  CaronaPublishModal,
  CaronaBookModal,
} from "@/components/mobility";
import { ModularSurfaceFeed } from "@/components/commerce/modular-surface-feed";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RideBookingBottomSheet, type SheetSnapPoint, type RideOptionItem } from "@/components/mobility/RideBookingBottomSheet";

export const Route = createFileRoute("/_store/mobilidade")({
  head: () => ({
    meta: [
      { title: "Waesy Go | Mobilidade, Entregas, Fretes e Caronas" },
      {
        name: "description",
        content:
          "Plataforma completa de mobilidade urbana, entregas expressas, fretes de carga, mudanças e caronas com tarifas justas e sem intermediários abusivos.",
      },
    ],
  }),
  loader: async () => {
    try {
      const { getUserSession } = await import("@/services/auth.functions");
      const [session, surfaceFeed, debtStatus] = await Promise.all([
        getUserSession().catch(() => null),
        getModularSurfaceFeed({ data: { surfaceSlug: "mobilidade" } }).catch(() => ({ sections: [], allProducts: [] })),
        checkCustomerDebtStatus().catch(() => ({ has_debts: false, total_debt_cents: 0, debts: [] })),
      ]);
      return { session, surfaceFeed, debtStatus };
    } catch (err) {
      console.error("[loader:_store.mobilidade] Loader error:", err);
      return {
        session: null,
        surfaceFeed: { sections: [], allProducts: [] },
        debtStatus: { has_debts: false, total_debt_cents: 0, debts: [] },
      };
    }
  },
  component: MobilityPage,
});

const getDynamicDefaultOrigin = (): MapPoint => {
  const stored = typeof window !== "undefined" ? getStoredLocation() : null;
  return {
    lat: stored?.lat || -27.1004,
    lng: stored?.lng || -52.6152,
    label: stored?.city ? `Centro — ${stored.city}` : "Av. Getúlio Vargas, 500 — Centro",
  };
};

const DEFAULT_ORIGIN: MapPoint = getDynamicDefaultOrigin();

interface ProductTabMeta {
  id: MobilityProductCategory | "carona";
  label: string;
  subtitle: string;
  icon: typeof Car;
  placeholderOrigin: string;
  placeholderDest: string;
}

const PRODUCT_TABS: ProductTabMeta[] = [
  {
    id: "ride",
    label: "Corrida",
    subtitle: "Transportar pessoas",
    icon: Car,
    placeholderOrigin: "De onde você vai sair?",
    placeholderDest: "Para onde você vai?",
  },
  {
    id: "delivery",
    label: "Entrega",
    subtitle: "Enviar ou receber pacotes",
    icon: Zap,
    placeholderOrigin: "Local de coleta do pacote",
    placeholderDest: "Endereço de entrega",
  },
  {
    id: "freight",
    label: "Frete",
    subtitle: "Cargas e volumes",
    icon: Truck,
    placeholderOrigin: "Local de coleta da carga",
    placeholderDest: "Destino da carga",
  },
  {
    id: "moving",
    label: "Mudança",
    subtitle: "Residencial ou comercial",
    icon: Boxes,
    placeholderOrigin: "Endereço atual",
    placeholderDest: "Novo endereço",
  },
  {
    id: "carona",
    label: "Carona",
    subtitle: "Viagens intermunicipais",
    icon: Users,
    placeholderOrigin: "Cidade de origem",
    placeholderDest: "Cidade de destino",
  },
];

const PRESET_PLACES = [
  { name: "Centro", address: "Av. Getúlio Vargas, Centro", lat: -27.1004, lng: -52.6152 },
  { name: "Aeroporto", address: "Acesso Florenal Ribeiro, Quedas do Palmital", lat: -27.1352, lng: -52.6565 },
  { name: "Rodoviária", address: "Rua Líbano, 111, Passo dos Fortes", lat: -27.0875, lng: -52.6289 },
  { name: "Shopping", address: "Av. Fernando Machado, 4000, Líder", lat: -27.0812, lng: -52.6345 },
  { name: "Hospital Regional", address: "R. Florianópolis, 1448, Santa Maria", lat: -27.0934, lng: -52.6078 },
];

const MOVING_ITEMS_CATALOG = [
  "Sofá",
  "Cama",
  "Colchão",
  "Geladeira",
  "Máquina de Lavar",
  "Mesa",
  "Cadeiras",
  "Guarda-roupa",
  "Armário",
  "TV",
  "Caixas (Diversas)",
  "Micro-ondas",
];

function MobilityPage() {
  const { session, surfaceFeed, debtStatus: initialDebtStatus } = (Route.useLoaderData?.() as any) || {};
  const navigate = useNavigate();

  // 1. Categoria Principal (Necessidade do Usuário)
  const [selectedCategory, setSelectedCategory] = useState<MobilityProductCategory | "carona">("ride");

  // 2. Quando? (Agora vs Agendar)
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    return tomorrow.toISOString().split("T")[0];
  });
  const [scheduleTime, setScheduleTime] = useState<string>("08:30");

  // 3. Coordenadas e Endereços
  const [origin, setOrigin] = useState<MapPoint>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<MapPoint | null>(null);
  const [originText, setOriginText] = useState(origin.label || "");
  const [destinationText, setDestinationText] = useState("");
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [pinMode, setPinMode] = useState<"origin" | "destination" | null>(null);
  const [bottomSheetSnap, setBottomSheetSnap] = useState<SheetSnapPoint>("medium");

  // 4. Subfluxo de Entrega
  const [deliveryAction, setDeliveryAction] = useState<"send" | "receive">("send");
  const [itemType, setItemType] = useState<string>("Pacote Pequeno");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  // 5. Subfluxo de Frete & Mudança
  const [propertyType, setPropertyType] = useState<"ground" | "elevator" | "stairs">("ground");
  const [floorNumber, setFloorNumber] = useState<number>(1);
  const [helpersCount, setHelpersCount] = useState<number>(0);
  const [movingPropertyKind, setMovingPropertyKind] = useState<"house" | "apartment" | "condo" | "commercial">("house");
  const [selectedMovingItems, setSelectedMovingItems] = useState<string[]>(["Sofá", "Cama", "Geladeira"]);
  const [movingWindow, setMovingWindow] = useState<"morning" | "afternoon">("morning");

  // 6. Preferências Especiais
  const [womenOnly, setWomenOnly] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "cash">("pix");
  const [legalDisclaimerAccepted, setLegalDisclaimerAccepted] = useState(true);

  // 7. Opção Selecionada na Lista Vertical
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // 8. Estado da Operação Ativa
  const [activeRequest, setActiveRequest] = useState<MobilityRequestDTO | null>(null);
  const [requestStatus, setRequestStatus] = useState<"idle" | "searching" | "confirmed">("idle");
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [authGuardOpen, setAuthGuardOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [showPwaBanner, setShowPwaBanner] = useState(true);

  // 9. Subfluxo de Carona Intermunicipal
  const [caronaOriginCity, setCaronaOriginCity] = useState("Chapecó");
  const [caronaDestinationCity, setCaronaDestinationCity] = useState("Florianópolis");
  const [caronaWomenOnly, setCaronaWomenOnly] = useState(false);
  const [caronaSubTab, setCaronaSubTab] = useState<"carona" | "bus">("carona");
  const [selectedBusSchedule, setSelectedBusSchedule] = useState<any>(null);
  const [busBookingOpen, setBusBookingOpen] = useState(false);
  const [passengerName, setPassengerName] = useState("");
  const [passengerDoc, setPassengerDoc] = useState("");
  const [selectedSeat, setSelectedSeat] = useState(12);
  const [isBookingBus, setIsBookingBus] = useState(false);
  const [caronaPublishModalOpen, setCaronaPublishModalOpen] = useState(false);
  const [caronaBookModalOpen, setCaronaBookModalOpen] = useState(false);
  const [selectedCorridorForBooking, setSelectedCorridorForBooking] = useState<MatchedCaronaCorridorDTO | null>(null);

  const {
    data: matchedCaronas = [],
    isLoading: isLoadingCaronas,
    refetch: refetchCaronas,
  } = useQuery({
    queryKey: ["caronas", caronaOriginCity, caronaDestinationCity, caronaWomenOnly],
    queryFn: async () => {
      const res = await listMatchingCaronas({
        data: {
          originCity: caronaOriginCity,
          destinationCity: caronaDestinationCity,
          filterWomenOnly: caronaWomenOnly,
        },
      });
      return res || [];
    },
    enabled: selectedCategory === "carona" && caronaSubTab === "carona",
  });

  const { data: busSchedules = [], isLoading: isLoadingBuses, refetch: refetchBuses } = useQuery({
    queryKey: ["intercity-buses", caronaOriginCity, caronaDestinationCity],
    queryFn: async () => {
      try {
        const res = await listIntercityBusSchedules({
          data: {
            originCity: caronaOriginCity,
            destinationCity: caronaDestinationCity,
          },
        });
        return res || [];
      } catch (err) {
        return [];
      }
    },
    enabled: selectedCategory === "carona" && caronaSubTab === "bus",
  });

  const handleBookBusTicket = async () => {
    if (!selectedBusSchedule) return;
    if (!passengerName.trim() || !passengerDoc.trim()) {
      toast.error("Informe nome e documento do passageiro.");
      return;
    }
    setIsBookingBus(true);
    try {
      await bookIntercityBusTicket({
        data: {
          scheduleId: String(selectedBusSchedule.id),
          passengerName: passengerName.trim(),
          passengerDocument: passengerDoc.trim(),
          seatNumber: selectedSeat,
          travelDate: new Date().toISOString().slice(0, 10),
          boardingCity: selectedBusSchedule.origin_city || caronaOriginCity,
          alightingCity: selectedBusSchedule.destination_city || caronaDestinationCity,
          pricePaidCents: Number(selectedBusSchedule.price_cents || 5000),
        },
      });
      toast.success("Passagem de ônibus reservada com sucesso! Consulte em sua conta.");
      setBusBookingOpen(false);
      refetchBuses();
    } catch (err: any) {
      toast.error("Erro ao reservar passagem: " + (err?.message || "Falha desconhecida"));
    } finally {
      setIsBookingBus(false);
    }
  };

  // Barreira de Inadimplência Zero-Trust (B.24)
  const { data: debtStatus, refetch: refetchDebts } = useQuery({
    queryKey: ["customer-debt-status-mobility"],
    queryFn: () => checkCustomerDebtStatus(),
    initialData: initialDebtStatus || { has_debts: false, total_debt_cents: 0, debts: [] },
    enabled: !!(session?.user?.id || session?.id),
  });

  const payDebtMutation = useMutation({
    mutationFn: (debtId: string) => payCustomerDebt({ data: { debtId } }),
    onSuccess: () => {
      toast.success("Débito quitado com sucesso! Seus serviços de mobilidade foram liberados.");
      refetchDebts();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao quitar débito.");
    },
  });

  // Cálculo da Distância e Duração Estimada
  const routeStats = useMemo(() => {
    if (!destination) {
      return { distanceKm: 3.8, durationMin: 10 };
    }
    const dLat = (destination.lat - origin.lat) * 111;
    const dLng = (destination.lng - origin.lng) * 111 * Math.cos((origin.lat * Math.PI) / 180);
    const straightDist = Math.sqrt(dLat * dLat + dLng * dLng);
    const distanceKm = Math.max(1.2, Math.round(straightDist * 1.3 * 10) / 10);
    const durationMin = Math.max(3, Math.round(distanceKm * 2.5) + 2);
    return { distanceKm, durationMin };
  }, [origin, destination]);

  // Cotação Categorizada de Opções (Vertical List)
  const activeCategoryForQuote: MobilityProductCategory =
    selectedCategory === "carona" ? "ride" : selectedCategory;

  const { data: quoteOptions, isLoading: isLoadingQuotes } = useQuery({
    queryKey: [
      "categorized-mobility-quotes",
      activeCategoryForQuote,
      routeStats.distanceKm,
      helpersCount,
      propertyType,
      floorNumber,
    ],
    queryFn: () =>
      calculateCategorizedMobilityOptions({
        data: {
          category: activeCategoryForQuote,
          origin_address: originText || origin.label || "Origem",
          destination_address: destinationText || destination?.label || "Destino",
          distance_km: routeStats.distanceKm,
          helpers_count: helpersCount,
          property_type: propertyType,
          floor_number: floorNumber,
        },
      }),
    staleTime: 30000,
  });

  const availableOptions: CategorizedMobilityOption[] = quoteOptions || [];

  // Mantém selecionada a primeira opção se nenhuma estiver marcada
  useEffect(() => {
    if (availableOptions.length > 0 && !selectedOptionId) {
      setSelectedOptionId(availableOptions[0].id);
    }
  }, [availableOptions, selectedOptionId]);

  const currentSelectedOption =
    availableOptions.find((o) => o.id === selectedOptionId) || availableOptions[0];

  const mappedRideOptions = useMemo<RideOptionItem[]>(() => {
    return availableOptions.map((opt) => ({
      id: opt.id,
      name: opt.name,
      category:
        opt.canonical_service_type === "ride_moto" || opt.icon_name === "bike"
          ? "moto"
          : opt.service_level === "comfort"
          ? "comfort"
          : "car",
      etaMinutes: opt.eta_minutes,
      priceCents: opt.estimated_price_cents,
      description: opt.description,
      seats: parseInt(opt.capacity_label) || (opt.icon_name === "bike" ? 1 : 4),
    }));
  }, [availableOptions]);

  // Inscrição Realtime para Status e Telemetria do Motorista
  useEffect(() => {
    if (!activeRequest?.id || typeof window === "undefined") return;
    let supabase: ReturnType<typeof getBrowserClient> | null = null;
    try {
      supabase = getBrowserClient();
    } catch {
      return;
    }

    const reqChannel = supabase
      .channel(`mobility-request:${activeRequest.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mobility_requests",
          filter: `id=eq.${activeRequest.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setActiveRequest((prev) => (prev ? { ...prev, ...updated } : updated));
          if (updated.status === "accepted") {
            toast.success("Motorista parceiro aceitou seu chamado e está a caminho!");
          } else if (updated.status === "in_progress") {
            toast.info("Trajeto iniciado em tempo real.");
          } else if (updated.status === "completed" || updated.status === "delivered") {
            toast.success("Operação concluída com sucesso!");
          } else if (updated.status === "cancelled") {
            toast.error("A solicitação foi cancelada.");
            setRequestStatus("idle");
            refetchDebts();
          }
        },
      )
      .subscribe();

    const gpsChannel = supabase
      .channel(`mobility-gps:${activeRequest.id}`)
      .on("broadcast", { event: "driver_location" }, ({ payload }) => {
        if (payload && typeof payload.lat === "number" && typeof payload.lng === "number") {
          setDriverLocation({ lat: payload.lat, lng: payload.lng });
        }
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(reqChannel);
      supabase?.removeChannel(gpsChannel);
    };
  }, [activeRequest?.id, refetchDebts]);

  // Criação da Solicitação no Backend
  const createMutation = useMutation({
    mutationFn: (payload: any) => createMobilityRequest({ data: payload }),
    onSuccess: (data) => {
      setActiveRequest(data);
      if (scheduleMode === "schedule") {
        toast.success("Agendamento confirmado com sucesso! Consulte em Agendados.");
        navigate({ to: "/conta/mobilidade" });
      } else {
        setRequestStatus("confirmed");
        toast.success("Solicitação enviada! Conectando com condutores parceiros.");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao solicitar corrida/entrega.");
      setRequestStatus("idle");
    },
  });

  const handleUseCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.info("Geolocalização não disponível neste dispositivo.");
      return;
    }
    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let addr = "Minha Localização (GPS)";
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "User-Agent": "WaesyGo/2.0" } },
          );
          const data = await res.json();
          if (data && data.display_name) {
            addr = data.display_name.split(",").slice(0, 3).join(",");
          }
        } catch {
          // fallback
        }
        setOrigin({ lat: latitude, lng: longitude, label: addr });
        setOriginText(addr);
        setIsLocatingGPS(false);
        toast.success("Localização atual identificada!");
      },
      () => {
        setIsLocatingGPS(false);
        toast.error("Não foi possível acessar seu GPS.");
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  };

  const handleSelectPresetDestination = (place: (typeof PRESET_PLACES)[0]) => {
    setDestination({ lat: place.lat, lng: place.lng, label: place.address });
    setDestinationText(place.name);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!pinMode) return;
    if (pinMode === "origin") {
      setOrigin({ lat, lng, label: `Origem (${lat.toFixed(4)}, ${lng.toFixed(4)})` });
      setOriginText(`Ponto de Partida (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      toast.success("Origem fixada no mapa!");
    } else {
      setDestination({ lat, lng, label: `Destino (${lat.toFixed(4)}, ${lng.toFixed(4)})` });
      setDestinationText(`Ponto de Destino (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      toast.success("Destino fixado no mapa!");
    }
    setPinMode(null);
  };

  const toggleMovingItem = (item: string) => {
    setSelectedMovingItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const handleSubmit = () => {
    if (selectedCategory === "carona") {
      navigate({ to: "/conta/mobilidade" });
      return;
    }

    if (!destinationText.trim() && !destination) {
      toast.error("Por favor, digite ou selecione o endereço de destino.");
      return;
    }

    if (!session?.user?.id && !session?.id) {
      setAuthGuardOpen(true);
      return;
    }

    if (debtStatus?.has_debts) {
      toast.error("Existe um débito pendente vinculado ao seu CPF no Waesy Go.");
      return;
    }

    if ((selectedCategory === "moving" || selectedCategory === "freight") && !legalDisclaimerAccepted) {
      toast.error("É necessário concordar com o Termo de Contratação P2P para fretes e mudanças.");
      return;
    }

    if (!currentSelectedOption) {
      toast.error("Selecione uma opção de transporte disponível.");
      return;
    }

    let scheduledIso: string | null = null;
    if (scheduleMode === "schedule") {
      const scheduledTarget = new Date(`${scheduleDate}T${scheduleTime}:00`);
      if (isNaN(scheduledTarget.getTime()) || scheduledTarget.getTime() <= Date.now()) {
        toast.error("A data/horário de agendamento deve ser no futuro.");
        return;
      }
      scheduledIso = scheduledTarget.toISOString();
    }

    setRequestStatus(scheduleMode === "schedule" ? "idle" : "searching");

    const notesSummary = [
      `[Modal: ${currentSelectedOption.name}]`,
      scheduleMode === "schedule" ? `[Agendado: ${scheduleDate} às ${scheduleTime}]` : "[Imediato]",
      selectedCategory === "delivery"
        ? `[Entrega: ${deliveryAction === "send" ? "Enviar" : "Buscar"}] [Item: ${itemType}] [Destinatário: ${recipientName} (${recipientPhone})]`
        : "",
      selectedCategory === "moving"
        ? `[Mudança: ${movingPropertyKind}] [Acesso: ${propertyType === "stairs" ? `Escada (${floorNumber}º andar)` : propertyType}] [Itens: ${selectedMovingItems.join(", ")}]`
        : "",
      selectedCategory === "freight" ? `[Ajudantes: ${helpersCount}]` : "",
      womenOnly ? "[SÓ MULHERES]" : "",
    ]
      .filter(Boolean)
      .join(" • ");

    const payload = {
      customer_name: recipientName || session?.user?.user_metadata?.full_name || "Cliente Waesy",
      customer_phone: recipientPhone || "(49) 99999-9999",
      service_type: currentSelectedOption.canonical_service_type,
      origin_address: originText || origin.label || "Origem selecionada",
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      destination_address: destinationText || destination?.label || "Destino selecionado",
      destination_lat: destination?.lat || origin.lat + 0.02,
      destination_lng: destination?.lng || origin.lng + 0.02,
      distance_km: routeStats.distanceKm,
      estimated_price_cents: currentSelectedOption.estimated_price_cents,
      helpers_count: helpersCount,
      property_type: propertyType,
      floor_number: floorNumber,
      scheduled_for: scheduledIso,
      women_only: womenOnly,
      legal_disclaimer_accepted: legalDisclaimerAccepted,
      payment_method: paymentMethod,
      notes: notesSummary,
    };

    createMutation.mutate(payload);
  };

  const activeTabConfig =
    PRODUCT_TABS.find((t) => t.id === selectedCategory) || PRODUCT_TABS[0];

  return (
    <div className="relative w-full h-dvh min-h-0 bg-background overflow-hidden font-sans select-none">
      {/* ── 1. MAPA MAPLIBRE FULL-BLEED (100% DA VIEWPORT) ── */}
      <div className="absolute inset-0 size-full z-0">
        <MapLibreCanvas
          origin={origin}
          destination={destination}
          markers={
            driverLocation
              ? [
                  {
                    id: "live-driver",
                    lat: driverLocation.lat,
                    lng: driverLocation.lng,
                    title: "Condutor Parceiro (Ao Vivo)",
                    kind: "driver",
                  },
                ]
              : []
          }
          pinMode={pinMode}
          onMapClick={handleMapClick}
          className="size-full"
        />

        {destination && (
          <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-3 px-4 py-2 rounded-lg bg-card/95 backdrop-blur-xl border border-border/80 text-foreground text-xs font-mono font-bold shadow-xs">
            <span className="font-bold text-foreground">{routeStats.distanceKm} km</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">~{routeStats.durationMin} min</span>
          </div>
        )}

        {pinMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-5 py-3 rounded-lg bg-foreground text-background text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span>Clique no mapa para marcar {pinMode === "origin" ? "a Origem" : "o Destino"}</span>
            <button
              onClick={() => setPinMode(null)}
              className="ml-2 size-11 min-h-11 min-w-11 hover:bg-background/20 rounded-lg flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              aria-label="Cancelar seleção no mapa"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>

            {/* ── 2. PAINEL DE SOLICITAÇÃO (DRAWER MOBILE / CARD LATERAL DESKTOP) ── */}
      <div
        className={cn(
          "absolute z-30 overflow-y-auto no-scrollbar bg-card/95 backdrop-blur-2xl p-5 text-foreground border-border/80 space-y-4 animate-in duration-300",
          selectedCategory === "ride" && scheduleMode === "now" && requestStatus === "idle"
            ? "hidden sm:block sm:bottom-4 sm:top-4 sm:left-4 sm:right-auto sm:w-96 sm:max-w-md sm:max-h-none sm:rounded-lg sm:border sm:slide-in-from-left-4"
            : "bottom-0 left-0 right-0 max-h-screen rounded-t-lg border-t sm:bottom-4 sm:top-4 sm:left-4 sm:right-auto sm:w-96 sm:max-w-md sm:max-h-none sm:rounded-lg sm:border slide-in-from-bottom-4 sm:slide-in-from-left-4"
        )}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-1 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Link
              to="/conta/mobilidade"
              className="size-11 rounded-lg bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              title="Minhas Viagens e Agendamentos"
              aria-label="Minhas Viagens e Agendamentos"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-base font-black tracking-tight text-foreground leading-none">
                Waesy Go
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTabConfig.subtitle}
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="size-11 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            title="Fechar e ir para o Início"
            aria-label="Fechar e ir para o Início"
          >
            <X className="size-5" />
          </Link>
        </div>

        {/* Alerta de Inadimplência Zero-Trust se houver (B.24) */}
        {debtStatus?.has_debts && (
          <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-1" />
              <div className="space-y-1">
                <span className="font-bold text-xs block">Pendência Vinculada ao CPF</span>
                <p className="text-xs opacity-90 leading-snug">
                  Consta um débito de {formatMoney(debtStatus.total_debt_cents)} por não-comparecimento dentro da tolerância de 3 minutos.
                </p>
              </div>
            </div>
            {debtStatus.debts?.[0] && (
              <Button
                type="button"
                onClick={() => payDebtMutation.mutate(debtStatus.debts[0].id)}
                disabled={payDebtMutation.isPending}
                className="w-full h-11 min-h-11 rounded-lg text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none cursor-pointer"
              >
                {payDebtMutation.isPending ? "Processando quitação..." : "Quitar Débito e Liberar Serviços"}
              </Button>
            )}
          </div>
        )}

        {/* ── 1. SELETOR DE PRODUTOS (Corrida, Entrega, Frete, Mudança, Carona) ── */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            O que você precisa?
          </Label>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {PRODUCT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(tab.id);
                    setSelectedOptionId(null);
                  }}
                  className={`flex items-center gap-2 px-4 h-11 min-h-11 rounded-lg text-xs font-bold whitespace-nowrap transition-colors select-none cursor-pointer border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    isSelected
                      ? "bg-foreground text-background border-foreground shadow-xs"
                      : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. QUANDO? (Agora vs Agendar) ── */}
        {selectedCategory !== "carona" && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
              Quando?
            </span>
            <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setScheduleMode("now")}
                className={`px-3 h-11 min-h-11 rounded-md text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  scheduleMode === "now"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Agora
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode("schedule")}
                className={`px-3 h-11 min-h-11 rounded-md text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  scheduleMode === "schedule"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="size-4" />
                <span>Agendar</span>
              </button>
            </div>
          </div>
        )}

        {/* Campos de Data/Hora se Agendado */}
        {scheduleMode === "schedule" && selectedCategory !== "carona" && (
          <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in">
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Dia</Label>
              <Input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="h-11 min-h-11 px-2 rounded-lg text-xs font-bold bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Horário</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="h-11 min-h-11 px-2 rounded-lg text-xs font-bold bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
            </div>
          </div>
        )}

        {/* ── 3. FORMULÁRIO DE ORIGEM & DESTINO ── */}
        <div className="space-y-3">
          {/* Origem */}
          <div className="space-y-1">
            <div className="relative flex items-center">
              <div className="absolute left-3 text-muted-foreground pointer-events-none">
                <Navigation className="size-4" />
              </div>
              <Input
                value={originText}
                onChange={(e) => setOriginText(e.target.value)}
                placeholder={activeTabConfig.placeholderOrigin}
                className="h-11 min-h-11 pl-9 pr-12 rounded-lg bg-muted/20 border-border/70 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocatingGPS}
                title="Minha localização GPS"
                className="absolute right-0 top-0 size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <RotateCw className={`size-4 ${isLocatingGPS ? "animate-spin motion-reduce:animate-none text-primary" : ""}`} />
              </button>
            </div>
          </div>

          {/* Destino */}
          <div className="space-y-1">
            <div className="relative flex items-center">
              <div className="absolute left-3 text-primary pointer-events-none">
                <MapPin className="size-4" />
              </div>
              <Input
                value={destinationText}
                onChange={(e) => setDestinationText(e.target.value)}
                placeholder={activeTabConfig.placeholderDest}
                className="h-11 min-h-11 pl-9 pr-12 rounded-lg bg-muted/20 border-border/70 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={() => setPinMode("destination")}
                title="Marcar no mapa"
                className={`absolute right-0 top-0 size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  pinMode === "destination"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Crosshair className="size-4" />
              </button>
            </div>
          </div>

          {/* Atalhos Rápidos de Destino */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {PRESET_PLACES.slice(0, 4).map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPresetDestination(p)}
                className="px-3 h-11 min-h-11 rounded-lg bg-muted/40 hover:bg-muted border border-border/50 text-xs font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── 4. SUBFLUXOS ESPECÍFICOS DE PRODUTO ── */}

        {/* Subfluxo Entrega: Enviar vs Buscar + Dados do Item */}
        {selectedCategory === "delivery" && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-muted-foreground">Ação</span>
              <div className="flex gap-1 bg-background p-1 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setDeliveryAction("send")}
                  className={`px-3 h-11 min-h-11 text-xs font-bold rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    deliveryAction === "send" ? "bg-foreground text-background" : "text-muted-foreground"
                  }`}
                >
                  Enviar item
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryAction("receive")}
                  className={`px-3 h-11 min-h-11 text-xs font-bold rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    deliveryAction === "receive" ? "bg-foreground text-background" : "text-muted-foreground"
                  }`}
                >
                  Buscar item
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-muted-foreground">O que será enviado?</Label>
              <div className="flex flex-wrap gap-2">
                {["Documento", "Pacote Pequeno", "Caixa Média", "Alimentos", "Chave / Peça"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setItemType(t)}
                    className={`h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                      itemType === t
                        ? "bg-foreground text-background border-foreground font-bold"
                        : "bg-background border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <Label className="text-xs text-muted-foreground">Nome Contato Destino</Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Nome"
                  className="h-11 min-h-11 px-3 rounded-lg text-xs bg-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Telefone / WhatsApp</Label>
                <Input
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="(49) 99999-9999"
                  className="h-11 min-h-11 px-3 rounded-lg text-xs bg-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Subfluxo Frete: Carga e Ajudantes */}
        {selectedCategory === "freight" && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Ajudantes de Carga/Descarga</span>
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setHelpersCount(num)}
                    className={`size-11 min-h-11 min-w-11 rounded-lg text-xs font-bold flex items-center justify-center border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                      helpersCount === num
                        ? "bg-foreground text-background border-foreground shadow-xs"
                        : "bg-background text-muted-foreground border-border/60 hover:text-foreground"
                    }`}
                  >
                    {num === 0 ? "0" : `+${num}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Subfluxo Mudança: Imóvel, Acesso, Inventário Rápido */}
        {selectedCategory === "moving" && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-3 animate-in fade-in">
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Tipo de Imóvel</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: "house", label: "Casa" },
                  { id: "apartment", label: "Apartamento" },
                  { id: "commercial", label: "Comercial" },
                ].map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setMovingPropertyKind(k.id as any)}
                    className={`h-11 min-h-11 rounded-lg text-xs font-semibold border transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                      movingPropertyKind === k.id
                        ? "bg-foreground text-background border-foreground font-bold"
                        : "bg-background border-border/60 text-muted-foreground"
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Acesso / Escadas</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPropertyType("ground")}
                  className={`h-11 min-h-11 rounded-lg text-xs font-semibold border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    propertyType === "ground" ? "bg-foreground text-background font-bold" : "bg-background text-muted-foreground"
                  }`}
                >
                  Térreo
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyType("elevator")}
                  className={`h-11 min-h-11 rounded-lg text-xs font-semibold border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    propertyType === "elevator" ? "bg-foreground text-background font-bold" : "bg-background text-muted-foreground"
                  }`}
                >
                  Elevador
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyType("stairs")}
                  className={`h-11 min-h-11 rounded-lg text-xs font-semibold border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    propertyType === "stairs" ? "bg-foreground text-background font-bold" : "bg-background text-muted-foreground"
                  }`}
                >
                  Escadas (+taxa)
                </button>
              </div>
            </div>

            {/* Inventário Rápido */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Itens a Transportar</Label>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto no-scrollbar">
                {MOVING_ITEMS_CATALOG.map((item) => {
                  const isChecked = selectedMovingItems.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleMovingItem(item)}
                      className={`h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                        isChecked
                          ? "bg-foreground text-background border-foreground font-bold"
                          : "bg-background border-border/60 text-muted-foreground"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ajudantes */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-foreground">Ajudantes de Mudança</span>
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setHelpersCount(num)}
                    className={`size-11 min-h-11 min-w-11 rounded-lg text-xs font-bold border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                      helpersCount === num
                        ? "bg-foreground text-background border-foreground font-bold"
                        : "bg-background text-muted-foreground border-border/60"
                    }`}
                  >
                    {num === 0 ? "0" : `+${num}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 5. LISTA VERTICAL DE OPÇÕES ELEGÍVEIS ── */}
        {selectedCategory !== "carona" ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Opções Disponíveis
              </span>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span>{routeStats.distanceKm} km</span>
                <span>•</span>
                <span>~{routeStats.durationMin} min</span>
              </div>
            </div>

            {isLoadingQuotes ? (
              <div className="py-6 flex items-center justify-center text-xs text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-foreground" />
                <span>Calculando melhores opções e tarifas...</span>
              </div>
            ) : availableOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Nenhuma modalidade configurada para esta região no momento.
              </div>
            ) : (
              <div className="space-y-2">
                {availableOptions.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  const Icon =
                    opt.icon_name === "Bike"
                      ? Bike
                      : opt.icon_name === "Zap"
                      ? Zap
                      : opt.icon_name === "Truck"
                      ? Truck
                      : opt.icon_name === "Boxes"
                      ? Boxes
                      : Car;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`w-full p-4 rounded-lg border text-left transition-colors flex items-center justify-between select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                        isSelected
                          ? "bg-foreground text-background border-foreground shadow-xs"
                          : "bg-card border-border/70 text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-background text-foreground" : "bg-muted text-foreground"
                          }`}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold truncate">{opt.name}</span>
                            {opt.badge && (
                              <Badge
                                variant={isSelected ? "secondary" : "outline"}
                                className={`text-xs px-2 py-0 h-5 ${
                                  isSelected ? "bg-background/20 text-background border-none" : ""
                                }`}
                              >
                                {opt.badge}
                              </Badge>
                            )}
                          </div>
                          <p
                            className={`text-xs truncate mt-1 ${
                              isSelected ? "text-background/80" : "text-muted-foreground"
                            }`}
                          >
                            {opt.capacity_label}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <span className="text-xs font-black block">
                          {formatMoney(opt.estimated_price_cents)}
                        </span>
                        <span
                          className={`text-xs font-mono block ${
                            isSelected ? "text-background/80" : "text-muted-foreground"
                          }`}
                        >
                          ~{opt.eta_minutes} min
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── EXPLORER INTERATIVO DE CARONAS INTERMUNICIPAIS ── */
          <div className="space-y-3 animate-in fade-in">
            <div className="p-4 rounded-lg bg-card border border-border/80 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      Caronas Intermunicipais
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Rotas com divisão de combustível e pedágio
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCaronaPublishModalOpen(true)}
                  className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold border-foreground/30 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <Plus className="size-4 mr-1" />
                  <span>Oferecer</span>
                </Button>
              </div>

              {/* Filtro de Cidades */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Origem</Label>
                  <Input
                    value={caronaOriginCity}
                    onChange={(e) => setCaronaOriginCity(e.target.value)}
                    placeholder="Cidade de Partida"
                    className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Destino</Label>
                  <Input
                    value={caronaDestinationCity}
                    onChange={(e) => setCaronaDestinationCity(e.target.value)}
                    placeholder="Cidade de Chegada"
                    className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 border-border/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  />
                </div>
              </div>

              {/* Toggle Só Mulheres */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={caronaWomenOnly}
                    onChange={(e) => setCaronaWomenOnly(e.target.checked)}
                    className="size-4 rounded border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  />
                  <span>Somente Mulheres</span>
                </label>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => refetchCaronas()}
                  className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  Buscar
                </Button>
              </div>
            </div>

            {/* Sub-Aba: Ônibus Rodoviário Intermunicipal */}
            {caronaSubTab === "bus" && (
              <div className="space-y-3">
                {isLoadingBuses ? (
                  <div className="py-8 text-center space-y-2 bg-card rounded-lg border border-border/60 p-4">
                    <Loader2 className="size-5 animate-spin motion-reduce:animate-none mx-auto text-primary" />
                    <p className="text-xs text-muted-foreground font-mono">Buscando linhas rodoviárias...</p>
                  </div>
                ) : busSchedules.length === 0 ? (
                  <div className="py-8 text-center space-y-2 bg-card rounded-lg border border-border/60 p-5">
                    <Ticket className="size-7 text-muted-foreground/40 mx-auto" />
                    <p className="text-xs font-bold text-foreground">Nenhuma linha de ônibus encontrada neste trecho</p>
                    <p className="text-xs text-muted-foreground">
                      Consulte outros horários ou tente a opção de carona compartilhada.
                    </p>
                  </div>
                ) : (
                  busSchedules.map((bus: any) => (
                    <div
                      key={bus.id}
                      className="p-4 rounded-lg bg-card border border-border/80 hover:border-foreground/30 transition-colors space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-foreground block">
                            {bus.operator_name || "Viação Regional"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Classe {bus.service_class || "Executivo"} • {bus.available_seats || 32} poltronas livres
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-foreground font-mono block">
                            {formatMoney(bus.price_cents)}
                          </span>
                          <span className="text-2xs text-muted-foreground block">tarifa oficial</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-foreground block">{bus.departure_time}</span>
                          <span className="text-muted-foreground">{bus.origin_city}</span>
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground" />
                        <div className="text-right">
                          <span className="font-bold text-foreground block">{bus.arrival_time}</span>
                          <span className="text-muted-foreground">{bus.destination_city}</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={() => {
                          setSelectedBusSchedule(bus);
                          setBusBookingOpen(true);
                        }}
                        className="w-full h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        Comprar Passagem
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Listagem de Caronas Elegíveis */}
            {isLoadingCaronas ? (
              <div className="py-8 text-center space-y-2 bg-card rounded-lg border border-border/60 p-4">
                <Loader2 className="size-5 animate-spin motion-reduce:animate-none mx-auto text-primary" />
                <p className="text-xs text-muted-foreground font-mono">Buscando caronas no corredor...</p>
              </div>
            ) : (!matchedCaronas || matchedCaronas.length === 0) ? (
              <div className="py-8 text-center space-y-2 bg-card rounded-lg border border-border/60 p-5">
                <Users className="size-7 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-bold text-foreground">Nenhuma carona encontrada para este trecho</p>
                <p className="text-xs text-muted-foreground">
                  Seja o primeiro a oferecer assentos nesta rota ou consulte outras datas.
                </p>
                <Button
                  type="button"
                  onClick={() => setCaronaPublishModalOpen(true)}
                  className="mt-2 h-11 min-h-11 px-4 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  Publicar Carona nesta Rota
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {matchedCaronas.map((corridor: any) => (
                  <div
                    key={corridor.corridorRideId}
                    className="p-4 rounded-lg bg-card border border-border/80 hover:border-foreground/30 transition-colors space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-foreground block">
                          {corridor.driverName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {corridor.vehicleModel} •  {corridor.driverRating.toFixed(1)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-foreground font-mono block">
                          {formatMoney(corridor.matchedPriceCents)}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          por assento
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs space-y-1">
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <MapPin className="size-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{corridor.fromCity}</span>
                        <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{corridor.toCity}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          <span>{formatDate(corridor.departureAt)}</span>
                        </span>
                        <Badge variant="outline" className="text-xs px-2 py-0 h-4">
                          {corridor.availableSeats} vaga(s)
                        </Badge>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => {
                        setSelectedCorridorForBooking(corridor);
                        setCaronaBookModalOpen(true);
                      }}
                      className="w-full h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      Reservar Vaga ({formatMoney(corridor.matchedPriceCents)})
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 6. FORMA DE PAGAMENTO & PREFERÊNCIAS ── */}
        {selectedCategory !== "carona" && (
          <div className="p-3 rounded-lg bg-muted/20 border border-border/50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-muted-foreground">Pagamento</span>
            <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setPaymentMethod("pix")}
                className={`px-3 h-11 min-h-11 rounded-md text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  paymentMethod === "pix" ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                <QrCode className="size-3.5" />
                <span>Pix</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`px-3 h-11 min-h-11 rounded-md text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  paymentMethod === "card" ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                <CreditCard className="size-3.5" />
                <span>Cartão</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`px-3 h-11 min-h-11 rounded-md text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  paymentMethod === "cash" ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                <Banknote className="size-3.5" />
                <span>Dinheiro</span>
              </button>
            </div>
          </div>
        )}

        {/* ── 7. BOTÃO PRINCIPAL DE SOLICITAÇÃO (HIG 44px+) ── */}
        {selectedCategory !== "carona" && (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending || requestStatus === "searching" || !currentSelectedOption}
            className="w-full h-12 rounded-lg bg-foreground text-background font-bold text-xs sm:text-sm hover:bg-foreground/90 transition-transform active:scale-98 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {createMutation.isPending || requestStatus === "searching" ? (
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                <span>Conectando com condutores parceiros...</span>
              </div>
            ) : scheduleMode === "schedule" ? (
              <span>
                Agendar {activeTabConfig.label} para {scheduleDate.split("-").reverse().slice(0, 2).join("/")} às {scheduleTime} • {formatMoney(currentSelectedOption?.estimated_price_cents || 0)}
              </span>
            ) : (
              <span>
                Pedir {currentSelectedOption?.name || activeTabConfig.label} • {formatMoney(currentSelectedOption?.estimated_price_cents || 0)}
              </span>
            )}
          </Button>
        )}

        {/* ── 8. CARD DE CORRIDA ATIVA OU BUSCA ── */}
        {requestStatus === "confirmed" && activeRequest && (
          <div className="p-4 rounded-lg bg-muted/40 border border-border/80 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="text-xs font-bold text-foreground">
                  {activeRequest.status === "accepted"
                    ? "Motorista a Caminho"
                    : activeRequest.status === "in_progress"
                    ? "Em Trajeto ao Vivo"
                    : activeRequest.status === "completed" || activeRequest.status === "delivered"
                    ? "Operação Concluída"
                    : "Buscando Condutor Parceiro..."}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs font-mono">
                #{activeRequest.id.slice(0, 8)}
              </Badge>
            </div>

            {/* PIN de Segurança */}
            {activeRequest.delivery_pin && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border/60">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span>PIN de Embarque / Entrega</span>
                </span>
                <span className="text-sm font-mono font-black tracking-widest text-foreground">
                  {activeRequest.delivery_pin}
                </span>
              </div>
            )}

            {/* Condutor Parceiro se Aceito */}
            {activeRequest.courier_profiles && (
              <div className="p-3 rounded-lg bg-card border border-border/70 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-foreground block">
                    {activeRequest.courier_profiles.full_name}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {activeRequest.courier_profiles.vehicle_model || activeRequest.courier_profiles.vehicle_type} • {activeRequest.courier_profiles.vehicle_plate || "Placa confirmada"}
                  </p>
                </div>
                <a
                  href={`https://wa.me/55${activeRequest.courier_profiles.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 min-h-11 px-3 rounded-lg bg-background hover:bg-muted text-foreground font-medium text-xs flex items-center gap-2 border border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <Phone className="size-4" />
                  <span>Contato</span>
                </a>
              </div>
            )}

            <div className="flex gap-2">
              <Button asChild size="sm" className="flex-1 h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                <Link to="/conta/mobilidade">Acompanhar em Minhas Viagens</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelModalOpen(true)}
                className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold border-destructive/40 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Trilhos do CMS Master */}
        {surfaceFeed?.sections && surfaceFeed.sections.length > 0 && (
          <div className="pt-2 border-t border-border/40">
            <ModularSurfaceFeed sections={surfaceFeed.sections} />
          </div>
        )}
      </div>

      {/* ── 3. FLOATING BANNER PWA ── */}
      {showPwaBanner && (
        <div className="hidden lg:flex fixed bottom-4 right-4 z-30 max-w-xs w-full p-4 rounded-lg bg-card/95 backdrop-blur-2xl border border-border/80 flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-foreground text-background flex items-center justify-center font-bold">
                <Smartphone className="size-4" />
              </div>
              <div>
                <p className="text-xs font-black text-foreground">Waesy Go PWA</p>
                <p className="text-xs text-muted-foreground">Instale na tela inicial</p>
              </div>
            </div>
            <button
              onClick={() => setShowPwaBanner(false)}
              className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              aria-label="Fechar banner PWA"
            >
              <X className="size-4" />
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (typeof window !== "undefined" && (window as any).deferredPrompt) {
                (window as any).deferredPrompt.prompt();
              } else {
                toast.info("No celular, toque em Compartilhar e 'Adicionar à Tela de Início'.");
              }
            }}
            className="w-full h-11 min-h-11 rounded-lg font-bold text-xs bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            Instalar App
          </Button>
        </div>
      )}

      {/* ── 2.1 BOTTOM SHEET NATIVO MOBILE BLABLACAR / IFOOD COM 3 SNAP POINTS ── */}
      {selectedCategory === "ride" && scheduleMode === "now" && requestStatus === "idle" && (
        <RideBookingBottomSheet
          snapPoint={bottomSheetSnap}
          onSnapPointChange={setBottomSheetSnap}
          originText={originText || origin.label || "Origem atual"}
          destinationText={destinationText || destination?.label || ""}
          walkingDistanceMeters={180}
          walkingMinutes={2}
          options={mappedRideOptions}
          selectedOptionId={selectedOptionId}
          onSelectOption={(id) => setSelectedOptionId(id)}
          paymentMethod={paymentMethod}
          onSelectPaymentMethod={(m) => setPaymentMethod(m)}
          onConfirmRide={handleSubmit}
          isConfirming={createMutation.isPending}
          className="sm:hidden"
        />
      )}

      {/* Modais de Ação e Segurança */}
      <ActionAuthGuardModal
        isOpen={authGuardOpen}
        onOpenChange={setAuthGuardOpen}
        actionContext="Confirmar Corrida, Entrega ou Frete"
        returnUrl="/mobilidade"
      />

      <CaronaPublishModal
        isOpen={caronaPublishModalOpen}
        onOpenChange={setCaronaPublishModalOpen}
        onPublished={() => refetchCaronas()}
      />

      <CaronaBookModal
        corridor={selectedCorridorForBooking}
        isOpen={caronaBookModalOpen}
        onOpenChange={setCaronaBookModalOpen}
        onBooked={() => {
          refetchCaronas();
          navigate({ to: "/conta/mobilidade" });
        }}
      />

      <MobilityCancelModal
        requestId={activeRequest?.id || null}
        currentStatus={activeRequest?.status || "searching"}
        isScheduled={scheduleMode === "schedule"}
        isOpen={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        onCancelled={() => {
          setActiveRequest(null);
          setRequestStatus("idle");
          setDriverLocation(null);
        }}
      />
      {/* Modal de Compra de Passagem Rodoviária */}
      <Dialog open={busBookingOpen} onOpenChange={setBusBookingOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Passagem de Ônibus Intermunicipal</DialogTitle>
          </DialogHeader>
          {selectedBusSchedule && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 flex justify-between items-center">
                <div>
                  <span className="font-bold text-foreground block">{selectedBusSchedule.operator_name}</span>
                  <span className="text-muted-foreground">{selectedBusSchedule.origin_city} → {selectedBusSchedule.destination_city}</span>
                </div>
                <span className="text-base font-black font-mono text-foreground">{formatMoney(selectedBusSchedule.price_cents)}</span>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Nome do Passageiro *</Label>
                <Input
                  placeholder="Nome civil conforme documento"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  className="h-11 min-h-11 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">CPF / Documento *</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={passengerDoc}
                    onChange={(e) => setPassengerDoc(e.target.value)}
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Poltrona</Label>
                  <Input
                    type="number"
                    min={1}
                    max={44}
                    value={selectedSeat}
                    onChange={(e) => setSelectedSeat(Number(e.target.value))}
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => setBusBookingOpen(false)}
              disabled={isBookingBus}
              className="h-11 min-h-11 px-4 text-xs font-medium cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBookBusTicket}
              disabled={isBookingBus}
              className="h-11 min-h-11 px-5 text-xs font-semibold cursor-pointer"
            >
              {isBookingBus ? "Emitindo..." : "Confirmar e Emitir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
