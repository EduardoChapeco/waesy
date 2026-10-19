import React, { useState } from "react";
import {
  Plane,
  Bus,
  Ship,
  Hotel,
  Calendar,
  Plus,
  Trash2,
  Sliders,
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Star,
  X,
  Loader2,
  CreditCard,
  Car,
  CheckCircle2,
  MessageCircle,
  Bot,
  Building2,
  Tag,
  Key,
  Navigation,
  Users,
  FileText,
  DollarSign,
  Percent,
  ExternalLink,
  Route as RouteIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listHotelsBank,
  createHotel,
  listDestinations,
  createDestination,
  type HotelBankDTO,
  type DestinationDTO,
} from "@/services/travel-catalog.functions";
import {
  type TravelPackageData,
  type TravelItineraryDay,
  type TravelNearbyRecommendation,
  type FlightDetails,
  type PaymentConditions,
  type TravelRoomRates,
} from "@/types/travel-package";
import { StoryHighlightUploader, type StoryHighlight } from "@/components/classifieds/story-highlight-uploader";
import { WeatherWidget } from "@/components/classifieds/weather-widget";
import {
  CANONICAL_AIRPORTS,
  airportLabel,
  type DepartureOption,
  type DepartureStatus,
  DEPARTURE_STATUS_CONFIG,
  CANONICAL_AIRLINES as CANONICAL_AIRLINES_CATALOG,
  CANONICAL_BUS_CATEGORIES,
  CANONICAL_TRANSFER_VEHICLES,
  CANONICAL_GUIDE_SERVICES,
  CANONICAL_CRUISE_LINES,
  CANONICAL_TRANSPORT_TYPES,
} from "@/lib/classifieds/canonical-airports";
import { uploadClassifiedMedia } from "@/lib/classifieds/upload-classified-media";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface TravelPackageFormProps {
  value: Partial<TravelPackageData>;
  onChange: (val: Partial<TravelPackageData>) => void;
  priceCents: number;
  activeSection?: "roteiro" | "hospedagem" | "transporte" | "tarifas" | "inclusoes" | "reserva" | "all";
  formValues?: any;
  onTitleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  register?: any;
  setValue?: any;
  categoriesList?: Array<{ id: string; name: string }>;
  onOpenQuickCategory?: () => void;
  onPriceChange?: (cents: number) => void;
  storeName?: string;
  storePhone?: string;
}

const CANONICAL_INCLUSIONS_CLEAN = [
  "Passagens aéreas ida e volta",
  "Hospedagem no hotel ou resort selecionado",
  "Regime All Inclusive (alimentação e bebidas inclusas)",
  "Pensão Completa (café da manhã, almoço e jantar)",
  "Café da manhã incluso diariamente",
  "Transfer aeroporto para hotel e retorno (in/out)",
  "Seguro viagem internacional com cobertura médica",
  "City tour panorâmico pelos principais pontos turísticos",
  "Guia de turismo credenciado CADASTUR acompanhante",
  "Ingressos e taxas das atrações programadas",
  "Bagagem despachada de 23kg inclusa",
  "Kit de viagem personalizado da agência",
];

const CANONICAL_EXCLUSIONS_CLEAN = [
  "Despesas pessoais e consumo de frigobar",
  "Refeições e bebidas não mencionadas no roteiro",
  "Bebidas alcoólicas fora do regime contratado",
  "Passeios e atividades opcionais no destino",
  "Taxas turísticas municipais ou governamentais locais",
  "Gorjetas para carregadores, motoristas e guias",
  "Check-in antecipado ou late check-out no hotel",
  "Emissão de passaportes e taxas consulares de vistos",
];

const CANONICAL_BOARDING_DOCS_CLEAN = [
  "Passaporte brasileiro válido por no mínimo 6 meses",
  "RG original em perfeito estado emitido há menos de 10 anos (Mercosul)",
  "Visto consular ou autorização eletrônica de viagem",
  "Certificado Internacional de Vacinação (Febre Amarela)",
  "Seguro viagem com cobertura mínima para despesas médicas hospitalares",
  "Autorização judicial com firma reconhecida para menores de idade desacompanhados",
];

export function TravelPackageForm({
  value,
  onChange,
  priceCents,
  activeSection = "all",
  formValues,
  onTitleChange,
  categoriesList = [],
  onOpenQuickCategory,
  onPriceChange,
  storeName = "Agência Parceira",
  storePhone = "",
}: TravelPackageFormProps) {
  const queryClient = useQueryClient();

  // Estados locais para inputs rápidos
  const [newInclusionText, setNewInclusionText] = useState("");
  const [newExclusionText, setNewExclusionText] = useState("");
  const [newDocText, setNewDocText] = useState("");
  const [newBadgeText, setNewBadgeText] = useState("");
  const [newBioBulletText, setNewBioBulletText] = useState("");
  const [gatewayInput, setGatewayInput] = useState("");

  // Modal / Formulário Rápido de Destino
  const [showNewDestModal, setShowNewDestModal] = useState(false);
  const [quickDestName, setQuickDestName] = useState("");
  const [quickDestRegion, setQuickDestRegion] = useState("");
  const [isSavingDest, setIsSavingDest] = useState(false);

  // Modal / Formulário Rápido de Hotel
  const [showNewHotelModal, setShowNewHotelModal] = useState(false);
  const [quickHotelName, setQuickHotelName] = useState("");
  const [quickHotelCity, setQuickHotelCity] = useState("");
  const [quickHotelRegime, setQuickHotelRegime] = useState("All Inclusive");
  const [isSavingHotel, setIsSavingHotel] = useState(false);

  // Queries para carregar Destinos e Banco de Hotéis
  const { data: destinationsList = [] } = useQuery({
    queryKey: ["travel_destinations_options"],
    queryFn: () => listDestinations().catch(() => []),
  });

  const { data: hotelsBankList = [] } = useQuery({
    queryKey: ["travel_hotels_options"],
    queryFn: () => listHotelsBank().catch(() => []),
  });

  const destination = value.destination || { name: "", region: "", country: "Brasil" };
  const resort = value.resort || {
    name: "",
    meal_plan: "All Inclusive",
    duration_text: "",
    guests_text: "",
    badges: [],
    bio_bullets: [],
  };
  const inclusions = value.inclusions || [];
  const exclusions = value.exclusions || [];
  const itinerary = value.itinerary_days || [];
  const flightDetails = value.flight_details || {
    origin_airport: "",
    destination_iata: "",
    flight_type: "Direto",
    baggage_included: true,
    transfer_included: true,
    flight_duration: "",
    airline_partner: "",
  };
  const recommendations = value.recommendations || [];
  const departureOptions: DepartureOption[] = value.departure_options || [];
  const roomRates: TravelRoomRates = value.room_rates || {};
  const boardingDocs: string[] = value.boarding_requirements || [];

  // Condições Comerciais & Parcelamento (Bilateral)
  const paymentConditions = value.payment_conditions || {};
  const maxInstallments = Math.max(1, Math.min(24, paymentConditions.installments_max ?? 12));
  const feeFreeInstallments = Math.max(
    1,
    Math.min(maxInstallments, paymentConditions.installments_fee_free ?? maxInstallments)
  );
  const pixDiscountPercent = paymentConditions.pix_discount_percent ?? 0;
  const depositPercent = paymentConditions.deposit_percent ?? 0;

  const installmentCents = maxInstallments > 0 && priceCents > 0 ? Math.round(priceCents / maxInstallments) : 0;
  const pixCents =
    pixDiscountPercent > 0 && priceCents > 0 ? Math.round(priceCents * (1 - pixDiscountPercent / 100)) : priceCents;

  const updatePaymentConditions = (field: keyof PaymentConditions, val: any) => {
    onChange({
      ...value,
      payment_conditions: {
        ...value.payment_conditions,
        [field]: val,
      },
    });
  };

  const updateDestination = (field: string, val: any) => {
    onChange({
      ...value,
      destination: { ...destination, [field]: val },
    });
  };

  const updateResort = (field: string, val: any) => {
    onChange({
      ...value,
      resort: { ...resort, [field]: val },
    });
  };

  const updateFlightDetails = (field: string, val: any) => {
    onChange({
      ...value,
      flight_details: { ...flightDetails, [field]: val },
    });
  };

  const updateRoomRate = (field: keyof TravelRoomRates, cents: number) => {
    onChange({
      ...value,
      room_rates: {
        ...roomRates,
        [field]: cents,
      },
    });
  };

  // Story Highlights
  const highlights: StoryHighlight[] = (value.story_highlights || resort.highlights || []).map((h: any) => ({
    id: h.id,
    title: h.title || h.label || "Destaque",
    image: h.image || h.imageUrl || "",
  }));

  const handleHighlightsChange = (newHls: StoryHighlight[]) => {
    onChange({
      ...value,
      story_highlights: newHls.map((h) => ({
        id: h.id,
        label: h.title,
        title: h.title,
        imageUrl: h.image,
        image: h.image,
      })) as any,
    });
  };

  const handleSelectHotelFromBank = (hotelId: string) => {
    if (!hotelId) return;
    const hotel = hotelsBankList.find((h: HotelBankDTO) => h.id === hotelId);
    if (!hotel) return;

    onChange({
      ...value,
      resort: {
        ...resort,
        name: hotel.name,
        meal_plan: hotel.regime_options?.[0] || resort.meal_plan || "",
        cover_image_url: hotel.cover_photo_url || resort.cover_image_url,
        badges: hotel.badges && hotel.badges.length > 0 ? hotel.badges : resort.badges,
        bio_bullets: hotel.bio_bullets && hotel.bio_bullets.length > 0 ? hotel.bio_bullets : resort.bio_bullets,
        photos: hotel.photos && hotel.photos.length > 0 ? hotel.photos : resort.photos,
      },
      destination: {
        ...destination,
        name: hotel.city || destination.name,
        region: hotel.state ? `${hotel.state}, Brasil` : destination.region,
      },
    });
    toast.success(`Hotel "${hotel.name}" vinculado com sucesso!`);
  };

  const handleSelectDestinationFromBank = (destId: string) => {
    if (!destId) return;
    const dest = destinationsList.find((d: DestinationDTO) => d.id === destId);
    if (!dest) return;

    onChange({
      ...value,
      destination: {
        ...destination,
        name: dest.name,
        region: dest.state
          ? `${dest.state}, ${dest.country}`
          : dest.region
            ? `${dest.region}, ${dest.country}`
            : dest.country,
        country: dest.country,
        iata_gateway: dest.iata_gateway || destination.iata_gateway,
        gallery_urls: dest.gallery_urls && dest.gallery_urls.length > 0 ? dest.gallery_urls : destination.gallery_urls,
        description: dest.description || destination.description,
      },
    });
    toast.success(`Destino "${dest.name}" vinculado ao pacote!`);
  };

  const handleQuickAddDest = async () => {
    if (!quickDestName.trim()) {
      toast.error("Informe o nome da cidade ou destino.");
      return;
    }
    setIsSavingDest(true);
    try {
      const created = await createDestination({
        data: {
          name: quickDestName.trim(),
          region: quickDestRegion.trim() || undefined,
          country: "Brasil",
        },
      });

      queryClient.invalidateQueries({ queryKey: ["travel_destinations_options"] });
      updateDestination("name", created.name);
      if (created.region) updateDestination("region", created.region);
      setShowNewDestModal(false);
      setQuickDestName("");
      setQuickDestRegion("");
      toast.success(`Destino "${created.name}" cadastrado no catálogo oficial!`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar destino.");
    } finally {
      setIsSavingDest(false);
    }
  };

  const handleQuickAddHotel = async () => {
    if (!quickHotelName.trim() || !quickHotelCity.trim()) {
      toast.error("Informe o nome do hotel e a cidade.");
      return;
    }
    setIsSavingHotel(true);
    try {
      const created = await createHotel({
        data: {
          name: quickHotelName.trim(),
          city: quickHotelCity.trim(),
          country: "Brasil",
          stars: 4,
          regime_options: [quickHotelRegime],
          bio_bullets: [
            "Excelente localização e infraestrutura completa de lazer",
            `${quickHotelRegime}: comodidade e gastronomia para suas férias`,
          ],
          badges: ["Parceiro Oficial", "Pé na Areia"],
        },
      });

      queryClient.invalidateQueries({ queryKey: ["travel_hotels_options"] });
      updateResort("name", created.name);
      updateResort("meal_plan", quickHotelRegime);
      updateDestination("name", created.city);
      setShowNewHotelModal(false);
      setQuickHotelName("");
      setQuickHotelCity("");
      toast.success(`Hotel "${created.name}" cadastrado e vinculado!`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar hotel no catálogo.");
    } finally {
      setIsSavingHotel(false);
    }
  };

  // Inclusões
  const toggleInclusion = (label: string) => {
    const next = inclusions.includes(label) ? inclusions.filter((i) => i !== label) : [...inclusions, label];
    onChange({ ...value, inclusions: next });
  };

  const addCustomInclusion = () => {
    if (!newInclusionText.trim()) return;
    if (!inclusions.includes(newInclusionText.trim())) {
      onChange({ ...value, inclusions: [...inclusions, newInclusionText.trim()] });
    }
    setNewInclusionText("");
  };

  // Exclusões
  const toggleExclusion = (label: string) => {
    const next = exclusions.includes(label) ? exclusions.filter((i) => i !== label) : [...exclusions, label];
    onChange({ ...value, exclusions: next });
  };

  const addCustomExclusion = () => {
    if (!newExclusionText.trim()) return;
    if (!exclusions.includes(newExclusionText.trim())) {
      onChange({ ...value, exclusions: [...exclusions, newExclusionText.trim()] });
    }
    setNewExclusionText("");
  };

  // Documentação e Requisitos de Embarque
  const toggleBoardingDoc = (label: string) => {
    const next = boardingDocs.includes(label) ? boardingDocs.filter((i) => i !== label) : [...boardingDocs, label];
    onChange({ ...value, boarding_requirements: next });
  };

  const addCustomDoc = () => {
    if (!newDocText.trim()) return;
    if (!boardingDocs.includes(newDocText.trim())) {
      onChange({ ...value, boarding_requirements: [...boardingDocs, newDocText.trim()] });
    }
    setNewDocText("");
  };

  // Badges
  const addBadge = () => {
    if (!newBadgeText.trim()) return;
    const current = resort.badges || [];
    if (!current.includes(newBadgeText.trim())) {
      updateResort("badges", [...current, newBadgeText.trim()]);
    }
    setNewBadgeText("");
  };

  const removeBadge = (idx: number) => {
    const current = resort.badges || [];
    updateResort(
      "badges",
      current.filter((_, i) => i !== idx)
    );
  };

  // Diferenciais do Pacote (Bio Bullets)
  const addBioBullet = () => {
    if (!newBioBulletText.trim()) return;
    const current = resort.bio_bullets || [];
    if (!current.includes(newBioBulletText.trim())) {
      updateResort("bio_bullets", [...current, newBioBulletText.trim()]);
    }
    setNewBioBulletText("");
  };

  const removeBioBullet = (idx: number) => {
    const current = resort.bio_bullets || [];
    updateResort(
      "bio_bullets",
      current.filter((_, i) => i !== idx)
    );
  };

  const moveBioBullet = (idx: number, direction: "up" | "down") => {
    const current = resort.bio_bullets || [];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const next = [...current];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    updateResort("bio_bullets", next);
  };

  // Roteiro Dia a Dia
  const addItineraryDay = () => {
    const newDayNumber = itinerary.length + 1;
    const newDay: TravelItineraryDay = {
      id: `day_${Date.now()}`,
      day: newDayNumber,
      title: `Dia ${newDayNumber} — Chegada e Boas-Vindas`,
      description: "Chegada ao destino, recepção no aeroporto, transfer para o resort e dia livre para relaxar.",
    };
    onChange({ ...value, itinerary_days: [...itinerary, newDay] });
  };

  const updateItineraryDay = (index: number, field: string, val: any) => {
    const next = [...itinerary];
    next[index] = { ...next[index], [field]: val };
    onChange({ ...value, itinerary_days: next });
  };

  const removeItineraryDay = (index: number) => {
    const next = itinerary.filter((_, i) => i !== index);
    const reindexed = next.map((item, i) => ({ ...item, day: i + 1 }));
    onChange({ ...value, itinerary_days: reindexed });
  };

  const moveDay = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= itinerary.length) return;
    const next = [...itinerary];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    const reindexed = next.map((item, i) => ({ ...item, day: i + 1 }));
    onChange({ ...value, itinerary_days: reindexed });
  };

  // Curadoria de Recomendações Locais
  const addRecommendation = () => {
    const newRec: TravelNearbyRecommendation = {
      id: `rec_${Date.now()}`,
      title: "",
      category: "",
      distance: "",
      rating: 0,
    };
    onChange({
      ...value,
      recommendations: [...recommendations, newRec],
    });
  };

  const updateRecommendation = (index: number, field: string, val: any) => {
    const next = [...recommendations];
    next[index] = { ...next[index], [field]: val };
    onChange({ ...value, recommendations: next });
  };

  const removeRecommendation = (index: number) => {
    const next = recommendations.filter((_, i) => i !== index);
    onChange({ ...value, recommendations: next });
  };

  // Saídas Confirmadas (Departure Options)
  const handleAddDeparture = () => {
    const newOpt: DepartureOption = {
      id: `dep_${Date.now()}`,
      label: `Saída ${departureOptions.length + 1}`,
      departure_date: "",
      return_date: "",
      status: "confirmed",
      available_seats: 20,
    };
    onChange({
      ...value,
      departure_options: [...departureOptions, newOpt],
    });
  };

  const handleUpdateDeparture = (id: string, patch: Partial<DepartureOption>) => {
    onChange({
      ...value,
      departure_options: departureOptions.map((opt) => (opt.id === id ? { ...opt, ...patch } : opt)),
    });
  };

  const handleRemoveDeparture = (id: string) => {
    onChange({
      ...value,
      departure_options: departureOptions.filter((opt) => opt.id !== id),
    });
  };

  // Gateways Rodoviários
  const handleAddGateway = () => {
    if (!gatewayInput.trim()) return;
    const current = (flightDetails as any).boarding_gateways || [];
    if (!current.includes(gatewayInput.trim())) {
      updateFlightDetails("boarding_gateways", [...current, gatewayInput.trim()]);
    }
    setGatewayInput("");
  };

  const handleRemoveGateway = (gw: string) => {
    const current = (flightDetails as any).boarding_gateways || [];
    updateFlightDetails(
      "boarding_gateways",
      current.filter((g: string) => g !== gw)
    );
  };

  // Flags de Visibilidade por Seção
  const showRoteiro = activeSection === "roteiro" || activeSection === "all";
  const showHospedagem = activeSection === "hospedagem" || activeSection === "all";
  const showTransporte = activeSection === "transporte" || activeSection === "all";
  const showTarifas = activeSection === "tarifas" || activeSection === "all";
  const showInclusoes = activeSection === "inclusoes" || activeSection === "all";
  const showReserva = activeSection === "reserva" || activeSection === "all";

  // Modal de Transporte Ativo
  const currentTransportType = value.transport_type || "aereo";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─────────────────────────────────────────────────────────────
          1. ABA ROTEIRO & DESTINO
      ───────────────────────────────────────────────────────────── */}
      {showRoteiro && (
        <div className="space-y-6">
          {/* Identificação e Visibilidade do Pacote */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <Tag className="size-4 text-primary" />
                <span>Identificação & Visibilidade do Pacote</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-primary bg-primary/10 border-primary/20">
                Padrão Editorial
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Nome do Pacote / Roteiro</Label>
              <Input
                value={formValues?.title ?? ""}
                onChange={onTitleChange}
                placeholder="Ex: Punta Cana All Inclusive — Resort Frente Mar com Aéreo"
                className="h-11 rounded-lg text-sm bg-background font-medium focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-medium">Modo de Exibição na Vitrine</Label>
                <Select
                  value={value.visibility_mode || "public"}
                  onValueChange={(v: "public" | "unlisted" | "private") => onChange({ ...value, visibility_mode: v })}
                >
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Público na Vitrine & Catálogo</SelectItem>
                    <SelectItem value="unlisted">Não Listado (Apenas Link Direto)</SelectItem>
                    <SelectItem value="private">Rascunho Interno Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground font-medium">Tipo de Oferta Comercial</Label>
                <Select
                  value={value.is_custom_quote ? "custom_quote" : "standard_package"}
                  onValueChange={(v) => onChange({ ...value, is_custom_quote: v === "custom_quote" })}
                >
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard_package">Pacote de Vitrine (CTA: Garantir Reserva)</SelectItem>
                    <SelectItem value="custom_quote">Orçamento Sob Medida (CTA: Aceitar Orçamento)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Composição de Passageiros Base */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-medium">Qtd. Adultos Base</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={value.adults_count ?? 2}
                  onChange={(e) =>
                    onChange({ ...value, adults_count: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-medium">Qtd. Crianças Base</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={value.children_count ?? 0}
                  onChange={(e) =>
                    onChange({ ...value, children_count: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-medium">Idade Máx. Criança (Anos)</Label>
                <Input
                  type="number"
                  min={1}
                  max={17}
                  value={value.children_max_age ?? 11}
                  onChange={(e) =>
                    onChange({ ...value, children_max_age: Math.max(1, Number(e.target.value) || 11) })
                  }
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>
            </div>
          </div>

          {/* Destino Turístico & Banco Canônico */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <MapPin className="size-4 text-primary" />
                <span>Destino Turístico da Viagem</span>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowNewDestModal(!showNewDestModal)}
                className="rounded-lg text-xs font-semibold gap-1 h-9 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-3.5" />
                <span>+ Novo Destino</span>
              </Button>
            </div>

            {/* Seletor de Destino Pré-cadastrado */}
            {destinationsList.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Sliders className="size-3 text-primary" />
                  <span>Vincular do Catálogo de Destinos</span>
                </Label>
                <Select onValueChange={handleSelectDestinationFromBank}>
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                    <SelectValue placeholder="Escolher um destino cadastrado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationsList.map((d: DestinationDTO) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.region || d.country})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Modal Inline de Cadastro Rápido de Destino */}
            {showNewDestModal && (
              <div className="p-4 rounded-lg bg-muted/40 border border-primary/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground">Cadastrar Novo Destino</h4>
                  <button
                    type="button"
                    onClick={() => setShowNewDestModal(false)}
                    className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Cidade / Destino</Label>
                    <Input
                      value={quickDestName}
                      onChange={(e) => setQuickDestName(e.target.value)}
                      placeholder="Ex: Ilhéus, Maceió, Natal, Orlando"
                      className="h-10 rounded-lg text-xs bg-background"
                      disabled={isSavingDest}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Estado / Região</Label>
                    <Input
                      value={quickDestRegion}
                      onChange={(e) => setQuickDestRegion(e.target.value)}
                      placeholder="Ex: Bahia, Flórida, Alagoas"
                      className="h-10 rounded-lg text-xs bg-background"
                      disabled={isSavingDest}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNewDestModal(false)}
                    disabled={isSavingDest}
                    className="rounded-lg text-xs h-9"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleQuickAddDest}
                    disabled={isSavingDest || !quickDestName.trim()}
                    className="rounded-lg text-xs font-semibold bg-primary text-primary-foreground gap-2 h-9"
                  >
                    {isSavingDest ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <span>Salvar Destino</span>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Cidade / Destino</Label>
                <Input
                  value={destination.name}
                  onChange={(e) => updateDestination("name", e.target.value)}
                  placeholder="Ex: Porto Seguro, Gramado, Punta Cana"
                  className="h-11 rounded-lg text-xs bg-background font-medium"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Estado / Região</Label>
                <Input
                  value={destination.region || ""}
                  onChange={(e) => updateDestination("region", e.target.value)}
                  placeholder="Ex: Bahia, Serra Gaúcha, Caribe"
                  className="h-11 rounded-lg text-xs bg-background font-medium"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">País</Label>
                <Input
                  value={destination.country || "Brasil"}
                  onChange={(e) => updateDestination("country", e.target.value)}
                  placeholder="Brasil"
                  className="h-11 rounded-lg text-xs bg-background font-medium"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Aeroporto de Chegada / IATA</Label>
                <Input
                  value={destination.iata_gateway || ""}
                  onChange={(e) => updateDestination("iata_gateway", e.target.value.toUpperCase())}
                  placeholder="Ex: BPS, POA, PUJ"
                  className="h-11 rounded-lg text-xs bg-background font-mono uppercase"
                  maxLength={4}
                />
              </div>
            </div>

            {/* Widget de Clima Real em Tempo Real */}
            {destination.name && (
              <div className="pt-2">
                <WeatherWidget city={destination.name} className="border-border/60" />
              </div>
            )}
          </div>

          {/* Destaques Visuais (Story Highlights) */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <Star className="size-4 text-primary" />
                <span>Destaques Visuais (Story Highlights)</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-primary bg-primary/10 border-primary/30">
                Círculos Táteis
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Círculos interativos inspirados no formato de stories para destacar Resort, Gastronomia, Piscinas e Praias.
            </p>
            <StoryHighlightUploader
              highlights={highlights}
              onChange={handleHighlightsChange}
              onUpload={(file) => uploadClassifiedMedia(file, "travel-highlights")}
              maxHighlights={8}
            />
          </div>

          {/* Diferenciais do Pacote (Bio Bullets) */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Diferenciais do Pacote</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pontos fortes exibidos em formato de bullets destacados no anúncio.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={newBioBulletText}
                onChange={(e) => setNewBioBulletText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBioBullet();
                  }
                }}
                placeholder="Ex: Resort pé na areia com complexo aquático aquecido"
                className="h-11 rounded-lg text-xs bg-background flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBioBullet}
                disabled={!newBioBulletText.trim()}
                className="h-11 px-4 rounded-lg text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {resort.bio_bullets && resort.bio_bullets.length > 0 && (
              <div className="space-y-2 pt-1">
                {resort.bio_bullets.map((bullet, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/20 border border-border/50 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs font-mono text-muted-foreground w-4 text-center shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="text-foreground font-medium truncate">{bullet}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {resort.bio_bullets!.length > 1 && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() => moveBioBullet(idx, "up")}
                            className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                            title="Mover para cima"
                          >
                            <ChevronUp className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === resort.bio_bullets!.length - 1}
                            onClick={() => moveBioBullet(idx, "down")}
                            className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                            title="Mover para baixo"
                          >
                            <ChevronDown className="size-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBioBullet(idx)}
                        className="size-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Roteiro Dia a Dia (Itinerário Enriquecido) */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <Calendar className="size-4 text-primary" />
                <span>Roteiro Dia a Dia (Itinerário)</span>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addItineraryDay}
                className="rounded-lg text-xs font-semibold gap-1 h-9 cursor-pointer border-primary/30 text-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-3.5" />
                <span>+ Adicionar Dia</span>
              </Button>
            </div>

            {itinerary.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border/60 rounded-lg bg-muted/10 space-y-2">
                <Calendar className="size-8 text-muted-foreground/50 mx-auto" />
                <p className="text-xs text-muted-foreground">Nenhum dia cadastrado ainda no roteiro.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addItineraryDay}
                  className="rounded-lg text-xs font-semibold gap-1 h-9 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Cadastrar Primeiro Dia</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {itinerary.map((dayItem, idx) => (
                  <div
                    key={dayItem.id || idx}
                    className="p-4 rounded-lg bg-card border border-border/60 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs font-mono font-bold text-primary bg-primary/10 border-primary/20"
                        >
                          Dia {dayItem.day}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground truncate max-w-xs">
                          {dayItem.title || "Dia sem título"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={idx === 0}
                          onClick={() => moveDay(idx, "up")}
                          className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                          title="Mover dia para cima"
                        >
                          <ChevronUp className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={idx === itinerary.length - 1}
                          onClick={() => moveDay(idx, "down")}
                          className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                          title="Mover dia para baixo"
                        >
                          <ChevronDown className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItineraryDay(idx)}
                          className="size-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                          title="Excluir dia"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Título do Dia</Label>
                      <Input
                        value={dayItem.title}
                        onChange={(e) => updateItineraryDay(idx, "title", e.target.value)}
                        placeholder="Ex: Passeio de Escuna e Almoço Típico"
                        className="h-10 rounded-lg text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Descrição das Atividades</Label>
                      <Textarea
                        value={dayItem.description}
                        onChange={(e) => updateItineraryDay(idx, "description", e.target.value)}
                        placeholder="Descreva o que os passageiros farão neste dia..."
                        className="text-xs bg-background min-h-20 rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Curadoria de Recomendações Locais */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <Navigation className="size-4 text-primary" />
                <span>Curadoria de Dicas & Atrações Locais</span>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addRecommendation}
                className="rounded-lg text-xs font-semibold gap-1 h-9 cursor-pointer border-primary/30 text-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-3.5" />
                <span>+ Adicionar Dica</span>
              </Button>
            </div>

            {recommendations.length === 0 ? (
              <p className="text-xs text-muted-foreground/70 py-4 text-center border border-dashed border-border/50 rounded-lg">
                Nenhuma atração ou dica local cadastrada ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <div key={rec.id || idx} className="p-3 rounded-lg bg-card border border-border/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Atração {idx + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecommendation(idx)}
                        className="size-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Nome da Atração</Label>
                        <Input
                          value={rec.title}
                          onChange={(e) => updateRecommendation(idx, "title", e.target.value)}
                          placeholder="Ex: Praia dos Carneiros"
                          className="h-10 rounded-lg text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Categoria</Label>
                        <Input
                          value={rec.category}
                          onChange={(e) => updateRecommendation(idx, "category", e.target.value)}
                          placeholder="Ex: Praia / Ecoturismo"
                          className="h-10 rounded-lg text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Distância do Hotel</Label>
                        <Input
                          value={rec.distance}
                          onChange={(e) => updateRecommendation(idx, "distance", e.target.value)}
                          placeholder="Ex: 15 min de carro"
                          className="h-10 rounded-lg text-xs bg-background"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. ABA HOSPEDAGEM & HOTÉIS
      ───────────────────────────────────────────────────────────── */}
      {showHospedagem && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <Hotel className="size-4 text-primary" />
                <span>Hospedagem, Resort & Comodidades</span>
              </div>

              <div className="flex items-center gap-2">
                {hotelsBankList.length > 0 && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {hotelsBankList.length} no Catálogo
                  </Badge>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNewHotelModal(!showNewHotelModal)}
                  className="rounded-lg text-xs font-semibold gap-1 h-9 cursor-pointer border-primary/30 text-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-3.5" />
                  <span>+ Novo Hotel</span>
                </Button>
              </div>
            </div>

            {/* Seletor de Hotel Pré-cadastrado */}
            {hotelsBankList.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Sliders className="size-3 text-primary" />
                  <span>Vincular do Catálogo Oficial de Hotéis & Resorts</span>
                </Label>
                <Select onValueChange={handleSelectHotelFromBank}>
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                    <SelectValue placeholder="Escolher um hotel parceiro cadastrado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {hotelsBankList.map((h: HotelBankDTO) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name} — {h.city}, {h.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Modal Inline de Cadastro Rápido de Hotel */}
            {showNewHotelModal && (
              <div className="p-4 rounded-lg bg-muted/40 border border-primary/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground">Cadastrar Novo Hotel no Catálogo</h4>
                  <button
                    type="button"
                    onClick={() => setShowNewHotelModal(false)}
                    className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Nome do Hotel/Resort</Label>
                    <Input
                      value={quickHotelName}
                      onChange={(e) => setQuickHotelName(e.target.value)}
                      placeholder="Ex: Resort Tororomba, Salinas Maragogi"
                      className="h-10 rounded-lg text-xs bg-background"
                      disabled={isSavingHotel}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Cidade / UF</Label>
                    <Input
                      value={quickHotelCity}
                      onChange={(e) => setQuickHotelCity(e.target.value)}
                      placeholder="Ex: Ilhéus, BA"
                      className="h-10 rounded-lg text-xs bg-background"
                      disabled={isSavingHotel}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Regime Alimentar</Label>
                  <Select value={quickHotelRegime} onValueChange={setQuickHotelRegime} disabled={isSavingHotel}>
                    <SelectTrigger className="h-10 rounded-lg text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Inclusive">All Inclusive (Tudo Incluso)</SelectItem>
                      <SelectItem value="Pensão Completa">Pensão Completa (3 Refeições)</SelectItem>
                      <SelectItem value="Meia Pensão">Meia Pensão (Café e Jantar)</SelectItem>
                      <SelectItem value="Café da Manhã">Café da Manhã Incluso</SelectItem>
                      <SelectItem value="Só Hospedagem">Só Hospedagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNewHotelModal(false)}
                    disabled={isSavingHotel}
                    className="rounded-lg text-xs h-9"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleQuickAddHotel}
                    disabled={isSavingHotel || !quickHotelName.trim() || !quickHotelCity.trim()}
                    className="rounded-lg text-xs font-semibold bg-primary text-primary-foreground gap-2 h-9"
                  >
                    {isSavingHotel ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <span>Salvar Hotel</span>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-medium text-foreground">Nome do Hotel / Pousada / Resort</Label>
                <Input
                  value={resort.name}
                  onChange={(e) => updateResort("name", e.target.value)}
                  placeholder="Ex: Carmel Charme Resort, Salinas de Maceió"
                  className="h-11 rounded-lg text-xs bg-background font-medium"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Regime Alimentar</Label>
                <Select
                  value={resort.meal_plan || "All Inclusive"}
                  onValueChange={(val) => updateResort("meal_plan", val)}
                >
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Inclusive">All Inclusive (Tudo Incluso)</SelectItem>
                    <SelectItem value="Pensão Completa">Pensão Completa (3 Refeições)</SelectItem>
                    <SelectItem value="Meia Pensão">Meia Pensão (Café e Jantar)</SelectItem>
                    <SelectItem value="Café da Manhã">Café da Manhã Incluso</SelectItem>
                    <SelectItem value="Só Hospedagem">Só Hospedagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Duração do Pacote (Ex: 5D / 4N)</Label>
                <Input
                  value={resort.duration_text || ""}
                  onChange={(e) => updateResort("duration_text", e.target.value)}
                  placeholder="Ex: 5 Dias / 4 Noites"
                  className="h-11 rounded-lg text-xs bg-background font-medium"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-medium text-foreground">Hóspedes Recomendados</Label>
                <Input
                  value={resort.guests_text || ""}
                  onChange={(e) => updateResort("guests_text", e.target.value)}
                  placeholder="Ex: 2 Adultos + 1 Criança Free"
                  className="h-11 rounded-lg text-xs bg-background font-medium"
                />
              </div>
            </div>

            {/* Badges de Selos do Hotel */}
            <div className="pt-2 border-t border-border/40 space-y-3">
              <Label className="text-xs font-semibold text-foreground">Selos & Destaques de Hospedagem</Label>
              <div className="flex gap-2">
                <Input
                  value={newBadgeText}
                  onChange={(e) => setNewBadgeText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBadge();
                    }
                  }}
                  placeholder="Ex: Pé na Areia, Vista Mar, Spa Completo, All Inclusive"
                  className="h-11 rounded-lg text-xs bg-background flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBadge}
                  disabled={!newBadgeText.trim()}
                  className="h-11 px-4 rounded-lg text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
                >
                  <Plus className="size-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {resort.badges && resort.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {resort.badges.map((badge, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20"
                    >
                      <span>{badge}</span>
                      <button
                        type="button"
                        onClick={() => removeBadge(idx)}
                        className="size-4 rounded-full flex items-center justify-center hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. ABA TRANSPORTE & LOGÍSTICA
      ───────────────────────────────────────────────────────────── */}
      {showTransporte && (
        <div className="space-y-6">
          {/* Seletor de Modal de Transporte */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <RouteIcon className="size-4 text-primary" />
                <span>Modal de Transporte Principal</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-primary bg-primary/10 border-primary/30">
                Logística Integrada
              </Badge>
            </div>

            {/* Chips de seleção do modal sem emojis */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "aereo", label: "Aéreo Comercial", icon: Plane },
                { id: "terrestre", label: "Excursão Rodoviária", icon: Bus },
                { id: "cruzeiro", label: "Cruzeiro Marítimo", icon: Ship },
                { id: "misto", label: "Multimodal (Combo)", icon: RouteIcon },
                { id: "car", label: "Carro Próprio / Local", icon: Car },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = currentTransportType === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChange({ ...value, transport_type: m.id as any })}
                    className={cn(
                      "h-11 px-4 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ── MODAL AÉREO ── */}
            {(currentTransportType === "aereo" || currentTransportType === "misto") && (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4 pt-4 mt-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Plane className="size-4" />
                  <span>Detalhes da Malha Aérea</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Aeroporto de Origem (IATA)</Label>
                    <Select
                      value={flightDetails.origin_airport || flightDetails.departure_iata || ""}
                      onValueChange={(val) => {
                        updateFlightDetails("origin_airport", val);
                        updateFlightDetails("departure_iata", val);
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                        <SelectValue placeholder="Selecione o aeroporto de saída..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {CANONICAL_AIRPORTS.map((a) => (
                          <SelectItem key={a.iata} value={a.iata}>
                            {airportLabel(a)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Aeroporto de Destino (IATA)</Label>
                    <Select
                      value={flightDetails.destination_iata || destination.iata_gateway || ""}
                      onValueChange={(val) => {
                        updateFlightDetails("destination_iata", val);
                        updateDestination("iata_gateway", val);
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                        <SelectValue placeholder="Selecione o aeroporto de chegada..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {CANONICAL_AIRPORTS.map((a) => (
                          <SelectItem key={a.iata} value={a.iata}>
                            {airportLabel(a)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Companhia Aérea</Label>
                    <Select
                      value={flightDetails.airline_partner || flightDetails.airline_name || ""}
                      onValueChange={(val) => {
                        updateFlightDetails("airline_partner", val);
                        updateFlightDetails("airline_name", val);
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                        <SelectValue placeholder="Selecione a Cia Aérea parceira..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CANONICAL_AIRLINES_CATALOG.map((al) => (
                          <SelectItem key={al.id} value={al.label}>
                            {al.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Tipo de Voo</Label>
                    <Select
                      value={flightDetails.flight_type || "Direto"}
                      onValueChange={(val: any) => updateFlightDetails("flight_type", val)}
                    >
                      <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Direto">Voo Direto (Sem Escalas)</SelectItem>
                        <SelectItem value="Com Conexão">Voo com 1 ou mais conexões</SelectItem>
                        <SelectItem value="Fretamento Exclusivo">Fretamento Exclusivo (Charter)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Franquia de Bagagem Inclusa */}
                <div className="pt-3 border-t border-border/40 space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Franquia de Bagagem</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateFlightDetails("baggage_included", !flightDetails.baggage_included)
                      }
                      className={cn(
                        "h-11 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        flightDetails.baggage_included
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "bg-background border-border/50 text-muted-foreground"
                      )}
                    >
                      <span>Bagagem de Bordo (10kg)</span>
                      <span>{flightDetails.baggage_included ? "Inclusa" : "Não Inclusa"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateFlightDetails("transfer_included", !flightDetails.transfer_included)
                      }
                      className={cn(
                        "h-11 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        flightDetails.transfer_included
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "bg-background border-border/50 text-muted-foreground"
                      )}
                    >
                      <span>Transfer In/Out Aeroporto/Hotel</span>
                      <span>{flightDetails.transfer_included ? "Incluso" : "Não Incluso"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── MODAL TERRESTRE / RODOVIÁRIO ── */}
            {currentTransportType === "terrestre" && (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4 pt-4 mt-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Bus className="size-4" />
                  <span>Detalhes da Excursão Rodoviária</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Categoria do Veículo</Label>
                    <Select
                      value={flightDetails.bus_category || "leito_total"}
                      onValueChange={(val) => updateFlightDetails("bus_category", val)}
                    >
                      <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CANONICAL_BUS_CATEGORIES.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Empresa Fretadora / Operadora</Label>
                    <Input
                      value={flightDetails.bus_company || ""}
                      onChange={(e) => updateFlightDetails("bus_company", e.target.value)}
                      placeholder="Ex: Auto Viação Catarinense, Fretur SC"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Ponto de Partida / Embarque Inicial</Label>
                    <Input
                      value={flightDetails.bus_departure_terminal || ""}
                      onChange={(e) => updateFlightDetails("bus_departure_terminal", e.target.value)}
                      placeholder="Ex: Terminal Rodoviário de Chapecó — 22:00h"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Ponto de Desembarque no Destino</Label>
                    <Input
                      value={flightDetails.bus_arrival_terminal || ""}
                      onChange={(e) => updateFlightDetails("bus_arrival_terminal", e.target.value)}
                      placeholder="Ex: Hotel ou Centro Turístico"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>
                </div>

                {/* Pontos de Embarque na Rota (Gateways) */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Navigation className="size-3.5 text-primary" />
                    <span>Pontos de Embarque ao Longo da Rota</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cidades ou paradas autorizadas onde passageiros podem embarcar.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={gatewayInput}
                      onChange={(e) => setGatewayInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddGateway();
                        }
                      }}
                      placeholder="Ex: Xaxim, Xanxerê, Joaçaba..."
                      className="h-11 rounded-lg text-xs bg-background flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddGateway}
                      className="h-11 px-4 rounded-lg text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
                    >
                      <Plus className="size-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {((flightDetails as any).boarding_gateways || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {((flightDetails as any).boarding_gateways || []).map((gw: string) => (
                        <span
                          key={gw}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-xs font-medium text-primary"
                        >
                          <Navigation className="size-3" />
                          {gw}
                          <button
                            type="button"
                            onClick={() => handleRemoveGateway(gw)}
                            className="size-4 hover:bg-destructive/20 rounded flex items-center justify-center ml-1 text-primary hover:text-destructive cursor-pointer"
                          >
                            <X className="size-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── MODAL CRUZEIRO ── */}
            {currentTransportType === "cruzeiro" && (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4 pt-4 mt-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Ship className="size-4" />
                  <span>Detalhes do Cruzeiro Marítimo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Companhia Marítima</Label>
                    <Select
                      value={flightDetails.cruise_line || ""}
                      onValueChange={(val) => updateFlightDetails("cruise_line", val)}
                    >
                      <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                        <SelectValue placeholder="Selecione a armadora..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CANONICAL_CRUISE_LINES.map((c) => (
                          <SelectItem key={c.id} value={c.label}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Nome do Navio</Label>
                    <Input
                      value={flightDetails.ship_name || ""}
                      onChange={(e) => updateFlightDetails("ship_name", e.target.value)}
                      placeholder="Ex: MSC Grandiosa, Costa Diadema"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Porto de Embarque</Label>
                    <Input
                      value={flightDetails.embarkation_port || ""}
                      onChange={(e) => updateFlightDetails("embarkation_port", e.target.value)}
                      placeholder="Ex: Porto de Santos — Terminal Concais"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Categoria da Cabine</Label>
                    <Input
                      value={flightDetails.cabin_category || ""}
                      onChange={(e) => updateFlightDetails("cabin_category", e.target.value)}
                      placeholder="Ex: Cabine com Varanda para o Mar"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── MODAL CARRO PRÓPRIO / HOTEL ONLY ── */}
            {currentTransportType === "car" && (
              <div className="rounded-lg border border-border/50 bg-muted/10 p-4 space-y-2 mt-2">
                <p className="text-xs text-muted-foreground">
                  Pacote voltado para viagem em veículo próprio ou alugado. O cliente organiza o trajeto até o destino.
                </p>
                <div className="space-y-1 pt-2">
                  <Label className="text-xs font-medium text-foreground">Ponto de Encontro / Recepção no Destino</Label>
                  <Input
                    value={flightDetails.origin_airport || ""}
                    onChange={(e) => updateFlightDetails("origin_airport", e.target.value)}
                    placeholder="Ex: Recepção do Resort a partir das 14:00h"
                    className="h-11 rounded-lg text-xs bg-background"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Saídas Confirmadas (Departure Options) */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                  <Calendar className="size-4 text-primary" />
                  <span>Saídas Confirmadas & Múltiplas Datas</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cadastre as datas em que a viagem acontecerá. O cliente poderá escolher a data de sua preferência.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddDeparture}
                className="rounded-lg text-xs font-semibold gap-1 h-9 cursor-pointer border-primary/30 text-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-3.5" />
                <span>+ Adicionar Saída</span>
              </Button>
            </div>

            {departureOptions.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-border/60 rounded-lg bg-muted/10 space-y-2">
                <Calendar className="size-7 text-muted-foreground/50 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  Nenhuma data cadastrada. Se não houver saídas cadastradas, o pacote será exibido sob consulta.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddDeparture}
                  className="rounded-lg text-xs font-semibold gap-1 h-9 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Cadastrar Primeira Saída</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {departureOptions.map((opt, idx) => (
                  <div
                    key={opt.id}
                    className="rounded-lg border border-border/60 bg-card p-4 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {opt.label || `Saída ${idx + 1}`}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDeparture(opt.id)}
                        className="size-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Rótulo / Temporada</Label>
                        <Input
                          value={opt.label || ""}
                          onChange={(e) => handleUpdateDeparture(opt.id, { label: e.target.value })}
                          placeholder="Ex: Feriado de Páscoa"
                          className="h-10 rounded-lg text-xs bg-background"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Data de Saída</Label>
                        <Input
                          type="date"
                          value={opt.departure_date}
                          onChange={(e) => handleUpdateDeparture(opt.id, { departure_date: e.target.value })}
                          className="h-10 rounded-lg text-xs bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Data de Retorno</Label>
                        <Input
                          type="date"
                          value={opt.return_date}
                          onChange={(e) => handleUpdateDeparture(opt.id, { return_date: e.target.value })}
                          className="h-10 rounded-lg text-xs bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Status da Saída</Label>
                        <Select
                          value={opt.status}
                          onValueChange={(val: DepartureStatus) =>
                            handleUpdateDeparture(opt.id, { status: val })
                          }
                        >
                          <SelectTrigger className="h-10 rounded-lg text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="confirmed">Confirmada</SelectItem>
                            <SelectItem value="filling_fast">Quase Esgotando</SelectItem>
                            <SelectItem value="few_seats">Últimas Vagas</SelectItem>
                            <SelectItem value="sold_out">Esgotada</SelectItem>
                            <SelectItem value="on_request">Sob Consulta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. ABA TARIFAS & QUARTOS
      ───────────────────────────────────────────────────────────── */}
      {showTarifas && (
        <div className="space-y-6">
          {/* Preço Base de Vitrine */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <DollarSign className="size-4 text-primary" />
                <span>Preço Base do Pacote (Por Pessoa em Apto Duplo)</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                Moeda: Real (BRL)
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Preço Promocional (De)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xs text-muted-foreground font-mono">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={formValues?.compare_at_cents ? formValues.compare_at_cents / 100 : ""}
                    onChange={(e) => {
                      const cents = Math.round(parseFloat(e.target.value || "0") * 100);
                      if (onPriceChange) onPriceChange(cents);
                    }}
                    placeholder="0,00 (Preço riscado anterior)"
                    className="h-11 pl-9 rounded-lg text-sm bg-background font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Preço à Vista / Principal (Por)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xs text-muted-foreground font-mono">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={priceCents ? priceCents / 100 : ""}
                    onChange={(e) => {
                      const cents = Math.round(parseFloat(e.target.value || "0") * 100);
                      if (onPriceChange) onPriceChange(cents);
                    }}
                    placeholder="4.250,00"
                    className="h-11 pl-9 rounded-lg text-sm bg-background font-mono font-bold text-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tarifário por Tipo de Acomodação */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                  <Users className="size-4 text-primary" />
                  <span>Tarifário por Tipo de Quarto & Acomodação</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Valores calculados por pessoa de acordo com a distribuição do quarto.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1 p-3 rounded-lg bg-muted/20 border border-border/50">
                <Label className="text-xs font-medium text-foreground">Quarto Individual (Single)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-[11px] text-muted-foreground font-mono">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={roomRates.single_cents ? roomRates.single_cents / 100 : ""}
                    onChange={(e) =>
                      updateRoomRate("single_cents", Math.round(parseFloat(e.target.value || "0") * 100))
                    }
                    placeholder="Ex: 5.600,00"
                    className="h-10 pl-8 rounded-lg text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 p-3 rounded-lg bg-muted/20 border border-border/50">
                <Label className="text-xs font-medium text-foreground">Quarto Duplo (Double — Padrão)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-[11px] text-muted-foreground font-mono">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={roomRates.double_cents ? roomRates.double_cents / 100 : (priceCents ? priceCents / 100 : "")}
                    onChange={(e) =>
                      updateRoomRate("double_cents", Math.round(parseFloat(e.target.value || "0") * 100))
                    }
                    placeholder="Ex: 4.250,00"
                    className="h-10 pl-8 rounded-lg text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 p-3 rounded-lg bg-muted/20 border border-border/50">
                <Label className="text-xs font-medium text-foreground">Quarto Triplo (Triple)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-[11px] text-muted-foreground font-mono">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={roomRates.triple_cents ? roomRates.triple_cents / 100 : ""}
                    onChange={(e) =>
                      updateRoomRate("triple_cents", Math.round(parseFloat(e.target.value || "0") * 100))
                    }
                    placeholder="Ex: 3.990,00"
                    className="h-10 pl-8 rounded-lg text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 p-3 rounded-lg bg-muted/20 border border-border/50">
                <Label className="text-xs font-medium text-foreground">Quarto Quádruplo (Quad)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-[11px] text-muted-foreground font-mono">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={roomRates.quad_cents ? roomRates.quad_cents / 100 : ""}
                    onChange={(e) =>
                      updateRoomRate("quad_cents", Math.round(parseFloat(e.target.value || "0") * 100))
                    }
                    placeholder="Ex: 3.750,00"
                    className="h-10 pl-8 rounded-lg text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 p-3 rounded-lg bg-muted/20 border border-border/50">
                <Label className="text-xs font-medium text-foreground">Criança / Cama Extra (Child)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-[11px] text-muted-foreground font-mono">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={roomRates.child_cents ? roomRates.child_cents / 100 : ""}
                    onChange={(e) =>
                      updateRoomRate("child_cents", Math.round(parseFloat(e.target.value || "0") * 100))
                    }
                    placeholder="Ex: 1.890,00"
                    className="h-10 pl-8 rounded-lg text-xs bg-background font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Condições Comerciais e Parcelamento */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <CreditCard className="size-4 text-primary" />
                <span>Condições Comerciais e Parcelamento</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                Parcelamento Flexível
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Slider de Parcelamento Máximo */}
              <div className="space-y-2 sm:col-span-2 p-4 rounded-lg bg-muted/20 border border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Parcelamento Máximo no Cartão</Label>
                  <span className="text-sm font-black font-display text-primary">
                    Até {maxInstallments}x {priceCents > 0 ? `de ${formatMoney(installmentCents)}` : ""}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={24}
                  step={1}
                  value={maxInstallments}
                  onChange={(e) => updatePaymentConditions("installments_max", Number(e.target.value))}
                  className="w-full h-2 rounded-full accent-primary cursor-pointer"
                  aria-label="Máximo de parcelas permitidas"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>1x</span>
                  <span>6x</span>
                  <span>10x</span>
                  <span>12x</span>
                  <span>18x</span>
                  <span>24x</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-foreground font-medium">Parcelas Sem Juros</Label>
                <Input
                  type="number"
                  min={1}
                  max={maxInstallments}
                  value={feeFreeInstallments}
                  onChange={(e) => updatePaymentConditions("installments_fee_free", Number(e.target.value))}
                  placeholder="12"
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
                <p className="text-[11px] text-muted-foreground">Quantas parcelas a agência oferece sem acréscimo.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-foreground font-medium">Desconto à Vista no PIX (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={pixDiscountPercent}
                  onChange={(e) => updatePaymentConditions("pix_discount_percent", Number(e.target.value))}
                  placeholder="5"
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
                {pixDiscountPercent > 0 && priceCents > 0 && (
                  <p className="text-[11px] text-emerald-600 font-semibold font-mono">
                    Valor no PIX: {formatMoney(pixCents)} ({pixDiscountPercent}% OFF)
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs text-foreground font-medium">Sinal Mínimo de Entrada (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={depositPercent}
                  onChange={(e) => updatePaymentConditions("deposit_percent", Number(e.target.value))}
                  placeholder="0 (Sem entrada obrigatória)"
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
                <p className="text-[11px] text-muted-foreground">Percentual exigido no momento da confirmação da reserva.</p>
              </div>
            </div>
          </div>

          {/* Campanhas de Operadoras Parceiras & Disclaimers */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <Building2 className="size-4 text-primary" />
                <span>Operadora Consolidada & Transparência</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Operadora Parceira</Label>
                <Select
                  value={value.operator_campaign || "propria"}
                  onValueChange={(val) => onChange({ ...value, operator_campaign: val })}
                >
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="propria">Operação Própria / Agência Local</SelectItem>
                    <SelectItem value="Orinter">Orinter Tour & Travel</SelectItem>
                    <SelectItem value="FRT">FRT Operadora</SelectItem>
                    <SelectItem value="Incomum">Incomum Viagens</SelectItem>
                    <SelectItem value="CVC">CVC Corp</SelectItem>
                    <SelectItem value="ViagensPromo">ViagensPromo</SelectItem>
                    <SelectItem value="E-HTL">E-HTL Hotéis</SelectItem>
                    <SelectItem value="Europlus">Europlus Operadora</SelectItem>
                    <SelectItem value="Schultz">Schultz Operadora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Aviso Legal de Tarifas (Disclaimer)</Label>
                <Select
                  value={value.disclaimer_type || "padrao"}
                  onValueChange={(val) => onChange({ ...value, disclaimer_type: val })}
                >
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">Tarifas por pessoa em apto duplo, sujeitas a disponibilidade</SelectItem>
                    <SelectItem value="cambio">Valores convertidos pelo câmbio turismo na data do fechamento</SelectItem>
                    <SelectItem value="promocional">Valores promocionais com limite de assentos e quartos</SelectItem>
                    <SelectItem value="custom">Sob medida: tarifas cotadas exclusivamente para o cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. ABA INCLUSÕES, REGRAS & DOCUMENTAÇÃO
      ───────────────────────────────────────────────────────────── */}
      {showInclusoes && (
        <div className="space-y-6">
          {/* Checklist de Inclusões ("O que inclui") */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                <ShieldCheck className="size-4" />
                <span>O Que Está Incluso no Pacote</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                {inclusions.length} inclusos
              </Badge>
            </div>

            {/* Presets clicáveis rápidos sem emojis */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-muted-foreground">Sugestões Rápidas de Inclusões</Label>
              <div className="flex flex-wrap gap-2">
                {CANONICAL_INCLUSIONS_CLEAN.map((item) => {
                  const isChecked = inclusions.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInclusion(item)}
                      className={cn(
                        "h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isChecked
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                          : "bg-background border-border/60 text-muted-foreground hover:border-emerald-500/30"
                      )}
                    >
                      <CheckCircle2 className={cn("size-3.5 shrink-0", isChecked ? "text-emerald-600" : "text-muted-foreground/40")} />
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inclusão Personalizada */}
            <div className="flex gap-2 pt-2 border-t border-border/40">
              <Input
                value={newInclusionText}
                onChange={(e) => setNewInclusionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomInclusion();
                  }
                }}
                placeholder="Adicionar item customizado que está incluso..."
                className="h-11 rounded-lg text-xs bg-background flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomInclusion}
                disabled={!newInclusionText.trim()}
                className="h-11 px-4 rounded-lg text-xs font-semibold border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 cursor-pointer"
              >
                <Plus className="size-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Checklist de Exclusões ("O que NÃO inclui") */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-destructive">
                <ShieldAlert className="size-4" />
                <span>O Que Não Está Incluso no Pacote</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-destructive bg-destructive/10 border-destructive/20">
                {exclusions.length} exclusos
              </Badge>
            </div>

            {/* Presets clicáveis rápidos sem emojis */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-muted-foreground">Sugestões Rápidas de Exclusões</Label>
              <div className="flex flex-wrap gap-2">
                {CANONICAL_EXCLUSIONS_CLEAN.map((item) => {
                  const isChecked = exclusions.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleExclusion(item)}
                      className={cn(
                        "h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isChecked
                          ? "bg-destructive/15 border-destructive/40 text-destructive font-semibold"
                          : "bg-background border-border/60 text-muted-foreground hover:border-destructive/30"
                      )}
                    >
                      <X className={cn("size-3.5 shrink-0", isChecked ? "text-destructive" : "text-muted-foreground/40")} />
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exclusão Personalizada */}
            <div className="flex gap-2 pt-2 border-t border-border/40">
              <Input
                value={newExclusionText}
                onChange={(e) => setNewExclusionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomExclusion();
                  }
                }}
                placeholder="Adicionar item customizado que NÃO está incluso..."
                className="h-11 rounded-lg text-xs bg-background flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomExclusion}
                disabled={!newExclusionText.trim()}
                className="h-11 px-4 rounded-lg text-xs font-semibold border-destructive/30 text-destructive hover:bg-destructive/5 cursor-pointer"
              >
                <Plus className="size-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Requisitos de Embarque & Documentação */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <FileText className="size-4 text-primary" />
                <span>Requisitos de Embarque & Documentação</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {CANONICAL_BOARDING_DOCS_CLEAN.map((item) => {
                  const isChecked = boardingDocs.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleBoardingDoc(item)}
                      className={cn(
                        "h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isChecked
                          ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                          : "bg-background border-border/60 text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      <CheckCircle2 className={cn("size-3.5 shrink-0", isChecked ? "text-primary" : "text-muted-foreground/40")} />
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border/40">
              <Input
                value={newDocText}
                onChange={(e) => setNewDocText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomDoc();
                  }
                }}
                placeholder="Adicionar exigência de embarque..."
                className="h-11 rounded-lg text-xs bg-background flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomDoc}
                disabled={!newDocText.trim()}
                className="h-11 px-4 rounded-lg text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
              >
                <Plus className="size-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Política de Cancelamento e Reembolso */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <Clock className="size-4 text-primary" />
                <span>Política de Cancelamento & Reembolso</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: "flexivel",
                  label: "Flexível (Até 30 dias)",
                  desc: "Reembolso integral cancelando até 30 dias antes do embarque.",
                },
                {
                  id: "moderada",
                  label: "Moderada (Taxa de 20%)",
                  desc: "Cancelamento até 45 dias com taxa administrativa da agência.",
                },
                {
                  id: "rigorosa",
                  label: "Não Reembolsável",
                  desc: "Tarifas promocionais emitidas sem direito a cancelamento voluntário.",
                },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange({ ...value, cancellation_policy: p.desc })}
                  className={cn(
                    "p-3 rounded-lg border text-left space-y-1 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    value.cancellation_policy === p.desc
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-background border-border/60 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  <span className="text-xs font-bold text-foreground block">{p.label}</span>
                  <span className="text-[11px] text-muted-foreground leading-snug block">{p.desc}</span>
                </button>
              ))}
            </div>

            <div className="space-y-1 pt-2">
              <Label className="text-xs font-medium text-foreground">Texto Detalhado da Política</Label>
              <Textarea
                value={value.cancellation_policy || ""}
                onChange={(e) => onChange({ ...value, cancellation_policy: e.target.value })}
                placeholder="Descreva as condições contratuais de cancelamento, prazos e taxas aplicáveis..."
                className="text-xs bg-background min-h-20 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. ABA RESERVA ONLINE & IA SDR
      ───────────────────────────────────────────────────────────── */}
      {showReserva && (
        <div className="space-y-6">
          {/* WhatsApp & Atendimento Humano Direto */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                <MessageCircle className="size-4" />
                <span>Reserva Online & Canal Direto no WhatsApp</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                Atendimento Imediato
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Nome da Agência / Atendente</Label>
                <Input
                  value={storeName}
                  disabled
                  className="h-11 rounded-lg text-xs bg-muted/30 font-medium"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">WhatsApp Cadastrado</Label>
                <Input
                  value={storePhone || "Configurado nas configurações da loja"}
                  disabled
                  className="h-11 rounded-lg text-xs bg-muted/30 font-mono"
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Mensagem Automática Pré-configurada para o Cliente
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">Link Dinâmico</span>
              </div>
              <p className="text-xs font-mono text-foreground/80 bg-background/80 p-2.5 rounded-md border border-border/50">
                Olá {storeName}! Gostaria de mais informações e garantir minha reserva para o pacote &quot;
                {formValues?.title || destination.name || "Viagem"}&quot; com saída para {destination.name || "o destino"}.
              </p>
            </div>
          </div>

          {/* IA Sales Advisor / SDR para Viagens */}
          <div className="bg-card rounded-lg p-5 space-y-4 border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Bot className="size-4" />
                <span>IA Sales Advisor (Consultor Virtual de Viagens)</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-primary bg-primary/10 border-primary/20">
                Atendimento 24/7
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg bg-muted/20 border border-border/50">
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Ativar Consultor Virtual IA para este Pacote
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  A IA responderá dúvidas de passageiros no chat da vitrine com base nas regras deste roteiro.
                </span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(value.ai_sales_advisor_enabled ?? true)}
                onChange={(e) => onChange({ ...value, ai_sales_advisor_enabled: e.target.checked })}
                className="size-5 rounded border-border text-primary accent-primary cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">
                Instruções & Argumentos Comerciais para a IA
              </Label>
              <Textarea
                value={value.ai_sales_advisor_prompt || ""}
                onChange={(e) => onChange({ ...value, ai_sales_advisor_prompt: e.target.value })}
                placeholder="Ex: Enfatizar que as vagas são limitadas para a saída de Páscoa e que o resort possui regime All Inclusive completo sem custos extras no destino..."
                className="text-xs bg-background min-h-24 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
