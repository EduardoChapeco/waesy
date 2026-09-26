import { createFileRoute, Link, useNavigate, isRedirect } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
 Car,
 Bike,
 Zap,
 Truck,
 Boxes,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStoredLocation } from "@/components/location/location-master-pill";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import {
 calculateMobilityQuote,
 createMobilityRequest,
 type MobilityServiceType,
 type MobilityRequestDTO,
 type MobilityQuoteEstimate,
} from "@/services/mobility.functions";
import { MapLibreCanvas, type MapPoint } from "@/components/mobility/maplibre-canvas";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/mobilidade")({
  head: () => ({
    meta: [
      { title: "Solicitar Corrida & Entregas | Waesy" },
      {
        name: "description",
        content:
          "Chame corridas de carro ou moto, entregas expressas ou fretes com tarifas transparentes e motoristas locais em tempo real.",
      },
    ],
  }),
  loader: async () => {
    try {
    const { getUserSession } = await import("@/services/auth.functions");
    const session = await getUserSession().catch(() => null);
    const role = session?.role || session?.user?.user_metadata?.role;
    const allowedRoles = ["store_owner", "operator", "platform_admin", "master"];
    if (!role || !allowedRoles.includes(role)) {
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ to: "/classificados" });
    }
    return {};
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error("[loader:_store.mobilidade] Unhandled loader error:", err);
      return null as any;
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

interface MobilityCategoryTab {
 id: MobilityServiceType;
 label: string;
 title: string;
 icon: typeof Car;
 placeholderOrigin: string;
 placeholderDest: string;
}

const CATEGORY_TABS: MobilityCategoryTab[] = [
 {
 id: "ride_car",
 label: "Corrida",
 title: "Solicitar corrida",
 icon: Car,
 placeholderOrigin: "De onde você vai sair?",
 placeholderDest: "Para onde você vai?",
 },
 {
 id: "delivery_express",
 label: "Entrega",
 title: "Solicitar entrega",
 icon: Zap,
 placeholderOrigin: "Onde retirar o pacote?",
 placeholderDest: "Onde entregar?",
 },
 {
 id: "freight_van",
 label: "Frete",
 title: "Solicitar frete",
 icon: Truck,
 placeholderOrigin: "Local de coleta da carga",
 placeholderDest: "Local de entrega do frete",
 },
 {
 id: "ride_moto",
 label: "Moto",
 title: "Solicitar moto",
 icon: Bike,
 placeholderOrigin: "De onde você vai sair?",
 placeholderDest: "Para onde você vai?",
 },
];

const PRESET_PLACES = [
 { name: "Centro", address: "Av. Getúlio Vargas, Centro", lat: -27.1004, lng: -52.6152 },
 { name: "Aeroporto", address: "Acesso Florenal Ribeiro, Quedas do Palmital", lat: -27.1352, lng: -52.6565 },
 { name: "Rodoviária", address: "Rua Líbano, 111, Passo dos Fortes", lat: -27.0875, lng: -52.6289 },
 { name: "Shopping", address: "Av. Fernando Machado, 4000, Líder", lat: -27.0812, lng: -52.6345 },
 { name: "Hospital Regional", address: "R. Florianópolis, 1448, Santa Maria", lat: -27.0934, lng: -52.6078 },
];

function MobilityPage() {
 const navigate = useNavigate();
 const [selectedService, setSelectedService] = useState<MobilityServiceType>("ride_car");

 // Route Coordinates
 const [origin, setOrigin] = useState<MapPoint>(DEFAULT_ORIGIN);
 const [destination, setDestination] = useState<MapPoint | null>(null);

 // Address Inputs
 const [originText, setOriginText] = useState(origin.label || "");
 const [destinationText, setDestinationText] = useState("");
 const [isLocatingGPS, setIsLocatingGPS] = useState(false);

 // Map Pin Mode
 const [pinMode, setPinMode] = useState<"origin" | "destination" | null>(null);

 // Additional Details (Collapsible)
 const [showDetails, setShowDetails] = useState(false);
 const [buildingNumber, setBuildingNumber] = useState("");
 const [complement, setComplement] = useState("");
 const [referencePoint, setReferencePoint] = useState("");
 const [recipientName, setRecipientName] = useState("");
 const [recipientPhone, setRecipientPhone] = useState("");
 const [helpersCount, setHelpersCount] = useState<number>(0);
 const [propertyType, setPropertyType] = useState<"ground" | "elevator" | "stairs">("ground");
 const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "cash">("pix");

 // Flow State: 'input' -> 'quoted' -> 'searching' -> 'confirmed'
 const [activeRequest, setActiveRequest] = useState<MobilityRequestDTO | null>(null);
 const [requestStatus, setRequestStatus] = useState<"idle" | "searching" | "confirmed">("idle");
 const [showPwaBanner, setShowPwaBanner] = useState(true);

 // Distance Calculation
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

 // Consulta cotação dinâmica de tarifas reais
 const { data: quotes, isLoading: isLoadingQuotes } = useQuery({
 queryKey: ["mobility-quotes", routeStats.distanceKm, helpersCount],
 queryFn: () =>
 calculateMobilityQuote({
 data: {
 origin_address: originText || origin.label || "Origem",
 destination_address: destinationText || destination?.label || "Destino",
 distance_km: routeStats.distanceKm,
 helpers_count: helpersCount,
 },
 }),
 staleTime: 30000,
 });

 const availableModals: MobilityQuoteEstimate[] = quotes || [];
 const selectedQuote = availableModals.find((q) => q.service_type === selectedService) || availableModals[0];

 const computedPriceCents = useMemo(() => {
 if (!selectedQuote) return 0;
 let price = selectedQuote.estimated_price_cents;
 if (selectedService === "moving_truck" && propertyType === "stairs") {
 price += 3500;
 }
 return price;
 }, [selectedQuote, selectedService, propertyType]);

 const activeTabConfig = useMemo(() => {
 return CATEGORY_TABS.find((t) => t.id === selectedService) || CATEGORY_TABS[0];
 }, [selectedService]);

 const createMutation = useMutation({
 mutationFn: (payload: any) => createMobilityRequest({ data: payload }),
 onSuccess: (data) => {
 setActiveRequest(data);
 setRequestStatus("confirmed");
 toast.success("Solicitação enviada! Conectando com motoristas parceiros.");
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao solicitar corrida/entrega.");
 setRequestStatus("idle");
 },
 });

 const handleUseCurrentLocation = () => {
 if (typeof navigator === "undefined" || !navigator.geolocation) {
 toast.info("Geolocalização não disponível.");
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
 { headers: { "User-Agent": "WaesyMobility/1.0" } },
 );
 const data = await res.json();
 if (data && data.display_name) {
 addr = data.display_name.split(",").slice(0, 3).join(",");
 }
 } catch {
 // fallback
 }

 const point: MapPoint = {
 lat: latitude,
 lng: longitude,
 label: addr,
 };
 setOrigin(point);
 setOriginText(addr);
 setIsLocatingGPS(false);
 toast.success("Localização atual identificada!");
 },
 () => {
 setIsLocatingGPS(false);
 toast.error("Não foi possível acessar sua localização.");
 },
 { timeout: 8000, enableHighAccuracy: true },
 );
 };

 const handleSelectPresetDestination = (place: typeof PRESET_PLACES[0]) => {
 const point: MapPoint = {
 lat: place.lat,
 lng: place.lng,
 label: place.address,
 };
 setDestination(point);
 setDestinationText(place.name);
 };

 const handleMapClick = (lat: number, lng: number) => {
 if (!pinMode) return;
 if (pinMode === "origin") {
 setOrigin({ lat, lng, label: `Ponto de Partida (${lat.toFixed(4)}, ${lng.toFixed(4)})` });
 setOriginText(`Ponto de Partida (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
 toast.success("Origem fixada no mapa!");
 } else {
 setDestination({ lat, lng, label: `Destino (${lat.toFixed(4)}, ${lng.toFixed(4)})` });
 setDestinationText(`Ponto de Destino (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
 toast.success("Destino fixado no mapa!");
 }
 setPinMode(null);
 };

 const handleSubmitRequest = () => {
 if (!destinationText.trim() && !destination) {
 toast.error("Por favor, digite ou selecione o endereço de destino.");
 return;
 }

 setRequestStatus("searching");

 const payload = {
 customer_name: recipientName || "Cliente Waesy",
 customer_phone: recipientPhone || "(49) 99999-9999",
 service_type: selectedService,
 origin_address: originText || origin.label || "Origem selecionada",
 origin_lat: origin.lat,
 origin_lng: origin.lng,
 destination_address: destinationText || destination?.label || "Destino selecionado",
 destination_lat: destination?.lat || origin.lat + 0.02,
 destination_lng: destination?.lng || origin.lng + 0.02,
 distance_km: routeStats.distanceKm,
 estimated_price_cents: computedPriceCents || 1500,
 helpers_count: helpersCount,
 payment_method: paymentMethod,
 notes: [
 buildingNumber ? `Nº: ${buildingNumber}` : "",
 complement ? `Compl: ${complement}` : "",
 referencePoint ? `Ref: ${referencePoint}` : "",
 recipientName ? `Contato: ${recipientName}` : "",
 recipientPhone ? `Tel: ${recipientPhone}` : "",
 selectedService === "moving_truck" ? `Ajudantes: ${helpersCount}` : "",
 ]
 .filter(Boolean)
 .join(" | "),
 };

 createMutation.mutate(payload);
 };

 return (
 <div className="relative w-full h-[100dvh] min-h-0 bg-background overflow-hidden font-sans select-none">
 {/* ── 1. MAPA FULL-BLEED MAPLIBRE (100% DA TELA) ── */}
 <div className="absolute inset-0 size-full z-0">
 <MapLibreCanvas
 origin={origin}
 destination={destination}
 pinMode={pinMode}
 onMapClick={handleMapClick}
 className="size-full"
 />

 {/* Floating Route Info Pill (Top Right on Desktop) */}
 {destination && (
 <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-3 px-4 py-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 text-foreground text-xs font-mono font-bold">
 <span className="font-bold text-foreground">{routeStats.distanceKm} km</span>
 <span className="text-muted-foreground">•</span>
 <span className="text-muted-foreground">~{routeStats.durationMin} min</span>
 </div>
 )}

 {/* Pin Picking Mode Floating Banner */}
 {pinMode && (
 <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-2xl bg-foreground text-background text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
 <span>Clique no mapa para marcar {pinMode === "origin" ? "a Origem" : "o Destino"}</span>
 <button
 onClick={() => setPinMode(null)}
 className="ml-2 p-1 hover:bg-background/20 rounded-full transition-colors"
 aria-label="Cancelar seleção no mapa"
 >
 <X className="size-3.5" />
 </button>
 </div>
 )}
 </div>

 {/* ── 2. PAINEL FLUTUANTE DE SOLICITAÇÃO (CARD LATERAL / MOBILE BOTTOM SHEET) ── */}
 <div
 className="
 absolute z-30
 /* Mobile: Bottom Sheet ancorado embaixo */
 bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl border-t
 /* Desktop: Card flutuante lateral esquerdo */
 sm:bottom-4 sm:top-4 sm:left-4 sm:right-auto sm:w-[420px] sm:max-h-none sm:rounded-2xl sm:border
 overflow-y-auto no-scrollbar bg-card/95 backdrop-blur-2xl p-5 text-foreground border-border/80 space-y-4 animate-in slide-in-from-bottom-4 sm:slide-in-from-left-4 duration-300
 "
 >
 {/* Cabeçalho do Card: ← Solicitar corrida + Fechar ✕ */}
 <div className="flex items-center justify-between pb-1">
 <div className="flex items-center gap-2">
 <Link
 to="/"
 className="size-11 rounded-full bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center transition-colors active:scale-95"
 title="Voltar ao Início"
 aria-label="Voltar ao Início"
 >
 <ArrowLeft className="size-5" />
 </Link>
 <h1 className="text-base font-black tracking-tight text-foreground">
 {activeTabConfig.title}
 </h1>
 </div>

 <Link
 to="/"
 className="size-11 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors active:scale-95"
 title="Fechar"
 aria-label="Fechar"
 >
 <X className="size-5" />
 </Link>
 </div>

 {/* ── SELETOR DE CATEGORIAS (Pills Horizontais: Corrida, Entrega, Frete, Moto) ── */}
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 ">
 {CATEGORY_TABS.map((tab) => {
 const Icon = tab.icon;
 const isSelected = selectedService === tab.id;
 return (
 <button
 key={tab.id}
 type="button"
 onClick={() => setSelectedService(tab.id)}
 className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none cursor-pointer border ${
 isSelected
 ? "bg-foreground text-background border-foreground scale-[1.02]"
 : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/80"
 }`}
 >
 <Icon className="size-3.5" />
 <span>{tab.label}</span>
 </button>
 );
 })}
 </div>

 {/* ── FORMULÁRIO DE ORIGEM & DESTINO ── */}
 <div className="space-y-3 pt-1">
 {/* Campo Origem */}
 <div className="space-y-1">
 <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
 Origem
 </Label>
 <div className="relative flex items-center">
 <div className="absolute left-3 text-muted-foreground pointer-events-none">
 <Navigation className="size-4" />
 </div>
 <Input
 value={originText}
 onChange={(e) => setOriginText(e.target.value)}
 placeholder={activeTabConfig.placeholderOrigin}
 className="h-11 pl-9 pr-10 rounded-2xl bg-muted/20 border-border/70 text-xs font-medium focus-visible:ring-1 focus-visible:ring-primary"
 />
 <button
 type="button"
 onClick={handleUseCurrentLocation}
 disabled={isLocatingGPS}
 title="Usar minha localização GPS atual"
 aria-label="Usar minha localização GPS atual"
 className="absolute right-2 size-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
 >
 <RotateCw className={`size-3.5 ${isLocatingGPS ? "animate-spin text-primary" : ""}`} />
 </button>
 </div>
 </div>

 {/* Campo Destino */}
 <div className="space-y-1">
 <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
 Destino
 </Label>
 <div className="relative flex items-center">
 <div className="absolute left-3 text-primary pointer-events-none">
 <MapPin className="size-4" />
 </div>
 <Input
 value={destinationText}
 onChange={(e) => setDestinationText(e.target.value)}
 placeholder={activeTabConfig.placeholderDest}
 className="h-11 pl-9 pr-10 rounded-2xl bg-muted/20 border-border/70 text-xs font-medium focus-visible:ring-1 focus-visible:ring-primary"
 />
 <button
 type="button"
 onClick={() => setPinMode("destination")}
 title="Marcar ponto de destino no mapa"
 aria-label="Marcar ponto de destino no mapa"
 className={`absolute right-2 size-7 rounded-xl flex items-center justify-center transition-colors ${
 pinMode === "destination"
 ? "bg-primary text-primary-foreground"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
 }`}
 >
 <Crosshair className="size-3.5" />
 </button>
 </div>
 </div>

 {/* Atalhos Rápidos de Destinos Frequentes */}
 <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 ">
 {PRESET_PLACES.slice(0, 4).map((p, idx) => (
 <button
 key={idx}
 type="button"
 onClick={() => handleSelectPresetDestination(p)}
 className="px-2.5 py-1 rounded-xl bg-muted/40 hover:bg-muted border border-border/40 text-[11px] font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
 >
 {p.name}
 </button>
 ))}
 </div>
 </div>

 {/* ── SELEÇÃO DE MODAIS & VALORES DISPONÍVEIS ── */}
 <div className="space-y-2 pt-1">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
 Opções Disponíveis
 </span>
 <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground font-semibold">
 <span>{routeStats.distanceKm} km</span>
 <span>•</span>
 <span>~{routeStats.durationMin} min</span>
 </div>
 </div>

 {isLoadingQuotes ? (
 <div className="py-4 flex items-center justify-center text-xs text-muted-foreground gap-2">
 <Loader2 className="size-4 animate-spin text-primary" />
 <span>Calculando melhores rotas e tarifas...</span>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {availableModals.map((mod) => {
 const Icon =
 mod.service_type === "ride_moto"
 ? Bike
 : mod.service_type === "delivery_express"
 ? Zap
 : mod.service_type === "freight_van"
 ? Truck
 : mod.service_type === "moving_truck"
 ? Boxes
 : Car;

 const isSelected = selectedService === mod.service_type;

 return (
 <button
 key={mod.service_type}
 type="button"
 onClick={() => setSelectedService(mod.service_type)}
 className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between select-none cursor-pointer ${
 isSelected
 ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary"
 : "bg-card border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40"
 }`}
 >
 <div className="flex items-center justify-between w-full mb-1.5">
 <div
 className={`size-7 rounded-xl flex items-center justify-center ${
 isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
 }`}
 >
 <Icon className="size-3.5" />
 </div>
 {isSelected && <Check className="size-3.5 text-primary" />}
 </div>

 <div>
 <span className="text-xs font-bold text-foreground block leading-tight">
 {mod.label}
 </span>
 <span className="text-xs font-black text-foreground mt-0.5 block">
 {formatMoney(mod.estimated_price_cents)}
 </span>
 </div>
 </button>
 );
 })}
 </div>
 )}
 </div>

 {/* ── FORMA DE PAGAMENTO & DETALHES ── */}
 <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
 Forma de Pagamento
 </span>
 <div className="flex items-center gap-1 bg-background p-0.5 rounded-xl border border-border/60">
 <button
 type="button"
 onClick={() => setPaymentMethod("pix")}
 className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
 paymentMethod === "pix"
 ? "bg-foreground text-background"
 : "text-muted-foreground hover:text-foreground"
 }`}
 >
 <QrCode className="size-3" />
 <span>Pix</span>
 </button>
 <button
 type="button"
 onClick={() => setPaymentMethod("card")}
 className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
 paymentMethod === "card"
 ? "bg-foreground text-background"
 : "text-muted-foreground hover:text-foreground"
 }`}
 >
 <CreditCard className="size-3" />
 <span>Cartão</span>
 </button>
 <button
 type="button"
 onClick={() => setPaymentMethod("cash")}
 className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
 paymentMethod === "cash"
 ? "bg-foreground text-background"
 : "text-muted-foreground hover:text-foreground"
 }`}
 >
 <Banknote className="size-3" />
 <span>Dinheiro</span>
 </button>
 </div>
 </div>

 {/* Accordion de Informações Adicionais */}
 <div>
 <button
 type="button"
 onClick={() => setShowDetails(!showDetails)}
 className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground pt-1"
 >
 <span className="flex items-center gap-1.5">
 <MapPin className="size-3.5" />
 <span>Número, complemento e contato</span>
 </span>
 {showDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
 </button>

 {showDetails && (
 <div className="space-y-2.5 pt-3 animate-in fade-in duration-200">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 <div>
 <Label className="text-[10px] text-muted-foreground">Número</Label>
 <Input
 value={buildingNumber}
 onChange={(e) => setBuildingNumber(e.target.value)}
 placeholder="Ex: 500"
 className="h-8 rounded-xl bg-background text-xs"
 />
 </div>
 <div>
 <Label className="text-[10px] text-muted-foreground">Complemento</Label>
 <Input
 value={complement}
 onChange={(e) => setComplement(e.target.value)}
 placeholder="Ex: Apto 102"
 className="h-8 rounded-xl bg-background text-xs"
 />
 </div>
 </div>

 <div>
 <Label className="text-[10px] text-muted-foreground">Ponto de Referência</Label>
 <Input
 value={referencePoint}
 onChange={(e) => setReferencePoint(e.target.value)}
 placeholder="Ex: Em frente à praça"
 className="h-8 rounded-xl bg-background text-xs"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 <div>
 <Label className="text-[10px] text-muted-foreground">Nome Passageiro/Contato</Label>
 <Input
 value={recipientName}
 onChange={(e) => setRecipientName(e.target.value)}
 placeholder="Nome"
 className="h-8 rounded-xl bg-background text-xs"
 />
 </div>
 <div>
 <Label className="text-[10px] text-muted-foreground">Telefone / WhatsApp</Label>
 <Input
 value={recipientPhone}
 onChange={(e) => setRecipientPhone(e.target.value)}
 placeholder="(49) 99999-9999"
 className="h-8 rounded-xl bg-background text-xs"
 />
 </div>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* ── BOTÃO PRINCIPAL DE BUSCA / CHAMADO (44px HIG) ── */}
 <Button
 type="button"
 onClick={handleSubmitRequest}
 disabled={createMutation.isPending || requestStatus === "searching"}
 className="w-full h-12 rounded-2xl bg-foreground text-background font-bold text-xs sm:text-sm hover:bg-foreground/90 transition-all active:scale-[0.98] cursor-pointer"
 >
 {createMutation.isPending || requestStatus === "searching" ? (
 <div className="flex items-center gap-2">
 <Loader2 className="size-4 animate-spin" />
 <span>Conectando com motoristas parceiros...</span>
 </div>
 ) : (
 <span>
 Buscar {activeTabConfig.label.toLowerCase()} • {formatMoney(computedPriceCents)}
 </span>
 )}
 </Button>

 {/* ── CONFIRMAÇÃO & RASTREAMENTO EM TEMPO REAL ── */}
 {requestStatus === "confirmed" && activeRequest && (
 <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3 animate-in fade-in">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <CheckCircle2 className="size-4 text-emerald-500" />
 <span className="text-xs font-bold text-foreground">Solicitação Confirmada</span>
 </div>
 <Badge variant="secondary" className="text-[10px] font-mono">
 #{activeRequest.id.slice(0, 8)}
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground leading-relaxed">
 Notificando motoristas parceiros próximos. Você pode acompanhar o trajeto ao vivo.
 </p>
 <div className="flex gap-2">
 <Button asChild size="sm" className="flex-1 rounded-xl text-xs font-bold bg-foreground text-background">
 <Link to="/conta/mobilidade">Acompanhar Trajeto</Link>
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setRequestStatus("idle");
 setActiveRequest(null);
 }}
 className="rounded-xl text-xs font-semibold"
 >
 Nova Corrida
 </Button>
 </div>
 </div>
 )}
 </div>

 {/* ── 3. FLOATING WIDGET PWA (Canto Inferior Direito como no Print de Referência) ── */}
 {showPwaBanner && (
 <div className="hidden lg:flex fixed bottom-4 right-4 z-30 max-w-xs w-full p-4 rounded-2xl bg-card/95 backdrop-blur-2xl border border-border/80 flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-2.5">
 <div className="size-9 rounded-2xl bg-foreground text-background flex items-center justify-center font-bold">
 <Smartphone className="size-4" />
 </div>
 <div>
 <p className="text-xs font-black text-foreground">Instalar Waesy App</p>
 <p className="text-[10px] text-muted-foreground">Rápido, offline, notificações</p>
 </div>
 </div>
 <button
 onClick={() => setShowPwaBanner(false)}
 className="text-muted-foreground hover:text-foreground"
 aria-label="Fechar banner PWA"
 >
 <X className="size-3.5" />
 </button>
 </div>

 <div className="space-y-1 text-[11px] text-muted-foreground">
 <div className="flex items-center gap-1.5">
 <Check className="size-3 text-emerald-500 shrink-0" />
 <span>Acesso instantâneo</span>
 </div>
 <div className="flex items-center gap-1.5">
 <Check className="size-3 text-emerald-500 shrink-0" />
 <span>Funciona offline</span>
 </div>
 <div className="flex items-center gap-1.5">
 <Check className="size-3 text-emerald-500 shrink-0" />
 <span>Notificações de status da corrida</span>
 </div>
 <Button
 size="sm"
 onClick={() => {
 if (typeof window !== "undefined" && (window as any).deferredPrompt) {
 (window as any).deferredPrompt.prompt();
 } else {
 toast.info("Para instalar no celular, toque em 'Compartilhar' ou no menu do navegador e escolha 'Adicionar à Tela de Início'.");
 }
 }}
 className="w-full h-9 rounded-xl font-bold text-xs bg-foreground text-background hover:bg-foreground/90"
 >
 Instalar Agora
 </Button>
 </div>
 </div>
 )}
 </div>
 );
}
