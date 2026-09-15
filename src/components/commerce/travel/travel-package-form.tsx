import React, { useState } from "react";
import { Plane, Bus, Ship, Anchor, Hotel, Calendar, Check, Plus, Trash2, Sliders, MapPin, Clock, ShieldCheck, ShieldAlert, Sun, Camera, Layers, Utensils, Coffee, ChevronDown, ChevronUp, Star, X, Compass, ArrowUp, ArrowDown, Loader2, CreditCard, Car, Sparkles } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
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
 DEFAULT_TRAVEL_INCLUSIONS_PRESETS,
 DEFAULT_TRAVEL_EXCLUSIONS_PRESETS,
 type TravelPackageData,
 type TravelItineraryDay,
 type TravelNearbyRecommendation,
 CANONICAL_AIRLINES,
 CANONICAL_BUS_CATEGORIES,
 CANONICAL_CRUISE_LINES,
 CANONICAL_CABIN_CATEGORIES,
 type FlightDetails,
 type PaymentConditions,
} from "@/types/travel-package";
import { StoryHighlightUploader, type StoryHighlight } from "@/components/classifieds/story-highlight-uploader";
import { uploadClassifiedMedia } from "@/lib/classifieds/upload-classified-media";
import { formatMoney } from "@/lib/money";

interface TravelPackageFormProps {
 value: Partial<TravelPackageData>;
 onChange: (val: Partial<TravelPackageData>) => void;
 priceCents: number;
}

export function TravelPackageForm({ value, onChange, priceCents }: TravelPackageFormProps) {
 const queryClient = useQueryClient();

 // Estados locais
 const [newInclusionText, setNewInclusionText] = useState("");
 const [newExclusionText, setNewExclusionText] = useState("");
 const [newBadgeText, setNewBadgeText] = useState("");

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

 // Seções colapsáveis avançadas
 const [isAdvancedFlightsOpen, setIsAdvancedFlightsOpen] = useState(false);
 const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(false);

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
 };
 const inclusions = value.inclusions || [];
 const exclusions = value.exclusions || [];
 // 4. Roteiro — inicia vazio, gestor adiciona
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

  // Condições Comerciais & Parcelamento (Bilateral - Regra 22)
  const paymentConditions = value.payment_conditions || {};
  const maxInstallments = Math.max(1, Math.min(24, paymentConditions.installments_max ?? 12));
  const feeFreeInstallments = Math.max(1, Math.min(maxInstallments, paymentConditions.installments_fee_free ?? maxInstallments));
  const pixDiscountPercent = paymentConditions.pix_discount_percent ?? 0;
  const depositPercent = paymentConditions.deposit_percent ?? 0;

  const installmentCents = maxInstallments > 0 && priceCents > 0 ? Math.round(priceCents / maxInstallments) : 0;
  const pixCents = pixDiscountPercent > 0 && priceCents > 0 ? Math.round(priceCents * (1 - pixDiscountPercent / 100)) : priceCents;

  const updatePaymentConditions = (field: keyof PaymentConditions, val: any) => {
    onChange({
      ...value,
      payment_conditions: {
        ...value.payment_conditions,
        [field]: val,
      },
    });
  };

  // Destaques Visuais (Story Highlights)
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

 const handleSelectHotelFromBank = (hotelId: string) => {
 if (!hotelId) return;
 const hotel = hotelsBankList.find((h: HotelBankDTO) => h.id === hotelId);
 if (!hotel) return;

 onChange({
 ...value,
 resort: {
 ...resort,
 name: hotel.name,
 meal_plan: hotel.regime_options?.[0] || resort.meal_plan || "All Inclusive",
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
 toast.success(`Hotel "${hotel.name}" vinculado! Dados pré-preenchidos.`);
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
 region: dest.state ? `${dest.state}, ${dest.country}` : (dest.region ? `${dest.region}, ${dest.country}` : dest.country),
 country: dest.country,
 iata_gateway: dest.iata_gateway || destination.iata_gateway,
 gallery_urls: dest.gallery_urls && dest.gallery_urls.length > 0 ? dest.gallery_urls : destination.gallery_urls,
 description: dest.description || destination.description,
 },
 });
 toast.success(`Destino "${dest.name}" vinculado ao pacote com sucesso!`);
 };

 // Cadastro rápido de destino no banco real
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

 // Cadastro rápido de hotel no banco real
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
 "🌴 Excelente localização e infraestrutura de lazer",
 `🍹 ${quickHotelRegime}: comodidade e sabor para suas férias`,
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
 toast.success(`Hotel "${created.name}" salvo no banco e vinculado!`);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao salvar hotel no banco.");
 } finally {
 setIsSavingHotel(false);
 }
 };

 // Inclusões
 const toggleInclusion = (label: string) => {
 const next = inclusions.includes(label)
 ? inclusions.filter((i) => i !== label)
 : [...inclusions, label];
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
 const next = exclusions.includes(label)
 ? exclusions.filter((i) => i !== label)
 : [...exclusions, label];
 onChange({ ...value, exclusions: next });
 };

 const addCustomExclusion = () => {
 if (!newExclusionText.trim()) return;
 if (!exclusions.includes(newExclusionText.trim())) {
 onChange({ ...value, exclusions: [...exclusions, newExclusionText.trim()] });
 }
 setNewExclusionText("");
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

 // Itinerário
 const addItineraryDay = () => {
 const nextDayNum = itinerary.length + 1;
 const newDay: TravelItineraryDay = {
 id: `day_${Date.now()}`,
 day: nextDayNum,
 period: "Manhã & Tarde",
 title: `Dia ${nextDayNum} — Atividades e Passeios`,
 description: "Descreva a programação das manhãs, tardes e noites deste dia...",
 };
 onChange({
 ...value,
 itinerary_days: [...itinerary, newDay],
 });
 };

 const updateItineraryDay = (index: number, field: string, val: any) => {
 const next = [...itinerary];
 next[index] = { ...next[index], [field]: val };
 onChange({ ...value, itinerary_days: next });
 };

 const removeItineraryDay = (index: number) => {
 const next = itinerary
 .filter((_, i) => i !== index)
 .map((item, i) => ({ ...item, day: i + 1 }));
 onChange({ ...value, itinerary_days: next });
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

 // Recomendações locais
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

 return (
 <div className="space-y-6 animate-in fade-in duration-200">
 {/* ── 1. DESTINO TURÍSTICO & BANCO CANÔNICO ── */}
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/70 shadow-2xs">
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
 className="rounded-xl text-xs font-semibold gap-1 h-8 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>+ Novo Destino Rápido</span>
 </Button>
 </div>

 {/* Seletor de Destino Pré-cadastrado */}
 {destinationsList.length > 0 && (
 <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-1.5">
 <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
 <Sliders className="size-3 text-primary" />
 <span>Vincular do Banco de Destinos Cadastrados</span>
 </Label>
 <Select onValueChange={handleSelectDestinationFromBank}>
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue placeholder="Escolher um destino do banco..." />
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
 <div className="p-4 rounded-xl bg-muted/40 border border-primary/30 space-y-3">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold text-foreground">Cadastrar Novo Destino no Banco</h4>
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
 placeholder="Ex: Ilhéus, Maceió, Natal"
 className="h-9 rounded-xl text-xs bg-background"
 disabled={isSavingDest}
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-semibold text-muted-foreground">Estado / Região</Label>
 <Input
 value={quickDestRegion}
 onChange={(e) => setQuickDestRegion(e.target.value)}
 placeholder="Ex: Bahia, Alagoas, Rio Grande do Norte"
 className="h-9 rounded-xl text-xs bg-background"
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
 className="rounded-xl text-xs"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 size="sm"
 onClick={handleQuickAddDest}
 disabled={isSavingDest || !quickDestName.trim()}
 className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground gap-1.5"
 >
 {isSavingDest ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 <span>Salvando...</span>
 </>
 ) : (
 <>
 <Check className="size-3.5" />
 <span>Salvar Destino</span>
 </>
 )}
 </Button>
 </div>
 </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1 sm:col-span-2">
 <Label className="text-[11px] font-semibold text-muted-foreground">Nome da Cidade / Destino</Label>
 <Input
 value={destination.name || ""}
 onChange={(e) => updateDestination("name", e.target.value)}
 placeholder="Ex: Ilhéus, Gramado, Maceió"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-semibold text-muted-foreground">Estado / País</Label>
 <Input
 value={destination.region || ""}
 onChange={(e) => updateDestination("region", e.target.value)}
 placeholder="Ex: Bahia, Brasil"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 <div className="space-y-1 sm:col-span-3">
 <Label className="text-[11px] font-semibold text-muted-foreground">Resumo de Logística / Como Chegar</Label>
 <Input
 value={destination.flight_summary || ""}
 onChange={(e) => updateDestination("flight_summary", e.target.value)}
 placeholder="Ex: Voo fretado direto + transfer in/out garantido com saída regional..."
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 </div>
 </div>

 {/* ── 1b. TIPO DE TRANSPORTE ── */}
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/70 shadow-2xs">
 <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-xs font-bold uppercase tracking-wider text-foreground">
 <Plane className="size-4 text-primary" />
 <span>Tipo de Transporte do Pacote</span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
 {(["aereo", "terrestre", "cruzeiro", "misto"] as const).map((type) => {
 const labelMap = {
 aereo: "✈️ Aéreo",
 terrestre: "🚌 Terrestre",
 cruzeiro: "🛳️ Cruzeiro",
 misto: "🔀 Misto",
 };
 const isSelected = (value.transport_type || "aereo") === type;
 return (
 <button
 key={type}
 type="button"
 onClick={() => onChange({ ...value, transport_type: type })}
 className={[
 "rounded-xl border py-2 px-3 text-xs font-semibold transition-all cursor-pointer text-center",
 isSelected
 ? "border-primary bg-primary/10 text-primary"
 : "border-border/60 bg-background text-muted-foreground hover:border-primary/50",
 ].join(" ")}
 >
 {labelMap[type]}
 </button>
 );
 })}
 </div>

 {/* Campos condicionais por tipo */}
 {(value.transport_type === "aereo" || !value.transport_type) && (
 <p className="text-[11px] text-muted-foreground">
 Configure os detalhes do voo na seção <strong>Voo & Logística Aérea</strong> abaixo.
 </p>
 )}
 {value.transport_type === "terrestre" && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-1">
 <label className="text-[11px] font-semibold text-muted-foreground">Ponto de Embarque</label>
 <input
 value={value.flight_details?.origin_airport || ""}
 onChange={(e) => updateFlightDetails("origin_airport", e.target.value)}
 placeholder="Ex: Terminal Rodoviário de Chapecó"
 className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
 />
 </div>
 <div className="space-y-1">
 <label className="text-[11px] font-semibold text-muted-foreground">Ponto de Desembarque</label>
 <input
 value={value.flight_details?.destination_iata || ""}
 onChange={(e) => updateFlightDetails("destination_iata", e.target.value)}
 placeholder="Ex: Terminal Turístico de Ilhéus"
 className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
 />
 </div>
 </div>
 )}
 {value.transport_type === "cruzeiro" && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-1">
 <label className="text-[11px] font-semibold text-muted-foreground">Porto de Embarque</label>
 <input
 value={value.flight_details?.origin_airport || ""}
 onChange={(e) => updateFlightDetails("origin_airport", e.target.value)}
 placeholder="Ex: Porto de Santos, Terminal Marítimo"
 className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
 />
 </div>
 <div className="space-y-1">
 <label className="text-[11px] font-semibold text-muted-foreground">Navio / Armador</label>
 <input
 value={value.flight_details?.airline_partner || ""}
 onChange={(e) => updateFlightDetails("airline_partner", e.target.value)}
 placeholder="Ex: MSC Seashore, Costa Diadema"
 className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
 />
 </div>
 </div>
 )}
 {value.transport_type === "misto" && (
 <p className="text-[11px] text-muted-foreground">
 Este pacote combina múltiplos modais. Configure os detalhes de cada trecho na seção de Voo & Logística abaixo e use o campo de Observações para detalhar os trechos terrestres ou marítimos.
 </p>
 )}
 </div>

 {/* ── 2. HOSPEDAGEM & BANCO DE HOTÉIS ── */}
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/70 shadow-2xs">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Hotel className="size-4 text-primary" />
 <span>Hospedagem, Resort & Comodidades</span>
 </div>

 <div className="flex items-center gap-2">
 {hotelsBankList.length > 0 && (
 <Badge variant="outline" className="text-[10px] font-mono">
 {hotelsBankList.length} no Banco
 </Badge>
 )}
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => setShowNewHotelModal(!showNewHotelModal)}
 className="rounded-xl text-xs font-semibold gap-1 h-8 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>+ Novo Hotel Rápido</span>
 </Button>
 </div>
 </div>

 {/* Modal Inline de Cadastro Rápido de Hotel */}
 {showNewHotelModal && (
 <div className="p-4 rounded-xl bg-muted/40 border border-primary/30 space-y-3">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold text-foreground">Cadastrar Novo Hotel no Banco</h4>
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
 placeholder="Ex: Resort Tororomba, Carmel Charme Resort"
 className="h-9 rounded-xl text-xs bg-background"
 disabled={isSavingHotel}
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-semibold text-muted-foreground">Cidade / UF</Label>
 <Input
 value={quickHotelCity}
 onChange={(e) => setQuickHotelCity(e.target.value)}
 placeholder="Ex: Ilhéus, BA"
 className="h-9 rounded-xl text-xs bg-background"
 disabled={isSavingHotel}
 />
 </div>
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-semibold text-muted-foreground">Regime Alimentar</Label>
 <Select value={quickHotelRegime} onValueChange={setQuickHotelRegime} disabled={isSavingHotel}>
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="All Inclusive">🍹 All Inclusive (Tudo Incluso)</SelectItem>
 <SelectItem value="Pensão Completa">🍽️ Pensão Completa (3 Refeições)</SelectItem>
 <SelectItem value="Café da Manhã">🥐 Café da Manhã</SelectItem>
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
 className="rounded-xl text-xs"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 size="sm"
 onClick={handleQuickAddHotel}
 disabled={isSavingHotel || !quickHotelName.trim() || !quickHotelCity.trim()}
 className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground gap-1.5"
 >
 {isSavingHotel ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 <span>Salvando...</span>
 </>
 ) : (
 <>
 <Check className="size-3.5" />
 <span>Salvar Hotel</span>
 </>
 )}
 </Button>
 </div>
 </div>
 )}

 {/* Seletor de Hotel do Banco para Auto-preenchimento */}
 {hotelsBankList.length > 0 && (
 <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
 <Label className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
 <Sliders className="size-3.5 text-primary" />
 <span>Auto-preencher pelo Banco de Hotéis / Resorts</span>
 </Label>
 <Select onValueChange={handleSelectHotelFromBank}>
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue placeholder="Selecione um hotel parceiro para carregar fotos e dados..." />
 </SelectTrigger>
 <SelectContent>
 {hotelsBankList.map((h: HotelBankDTO) => (
 <SelectItem key={h.id} value={h.id}>
 {h.name} — {h.city}/{h.state || h.country} ({h.regime_options[0] || "Hospedagem"})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label className="text-[11px] font-semibold text-muted-foreground">Nome do Hotel / Resort</Label>
 <Input
 value={resort.name || ""}
 onChange={(e) => updateResort("name", e.target.value)}
 placeholder="Ex: Resort Tororomba, Hotel Fasano"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-[11px] font-semibold text-muted-foreground">Regime de Alimentação</Label>
 <Select
 value={resort.meal_plan || "All Inclusive"}
 onValueChange={(val) => updateResort("meal_plan", val)}
 >
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="All Inclusive">🍹 All Inclusive (Tudo Incluso)</SelectItem>
 <SelectItem value="Pensão Completa">🍽️ Pensão Completa (Café, Almoço e Jantar)</SelectItem>
 <SelectItem value="Meia Pensão">☕ Meia Pensão (Café e Jantar)</SelectItem>
 <SelectItem value="Café da Manhã">🥐 Café da Manhã Incluso</SelectItem>
 <SelectItem value="Sem Refeições">🏨 Apenas Hospedagem</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label className="text-[11px] font-semibold text-muted-foreground">Duração da Estadia</Label>
 <Input
 value={resort.duration_text || ""}
 onChange={(e) => updateResort("duration_text", e.target.value)}
 placeholder="Ex: 5 Dias / 4 Noites, 7 Dias"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-[11px] font-semibold text-muted-foreground">Hóspedes / Acomodação</Label>
 <Input
 value={resort.guests_text || ""}
 onChange={(e) => updateResort("guests_text", e.target.value)}
 placeholder="Ex: 2 Adultos, 2 Adultos + 1 Criança Free"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 </div>

 {/* Badges do Resort (ex: Eco-friendly, Pé na Areia) */}
 <div className="space-y-2 pt-2 border-t border-border/30">
 <Label className="text-[11px] font-semibold text-muted-foreground">Badges do Hotel</Label>
 <div className="flex flex-wrap items-center gap-2">
 {(resort.badges || []).map((badge, idx) => (
 <span
 key={idx}
 className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs bg-muted text-foreground border border-border/60"
 >
 <span>{badge}</span>
 <button
 type="button"
 onClick={() => removeBadge(idx)}
 className="size-3.5 hover:text-destructive text-muted-foreground cursor-pointer"
 >
 ×
 </button>
 </span>
 ))}
 <div className="flex items-center gap-1.5">
 <Input
 value={newBadgeText}
 onChange={(e) => setNewBadgeText(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBadge())}
 placeholder="Ex: Pé na Areia..."
 className="h-8 w-36 rounded-xl text-xs bg-background"
 />
 <Button type="button" size="sm" variant="ghost" onClick={addBadge} className="h-8 px-2 text-xs">
 +
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* ── 3. CHECKLIST INTERATIVO DE INCLUSÕES ("O QUE INCLUI") ── */}
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/70 shadow-2xs">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <ShieldCheck className="size-4 text-emerald-500" />
 <span>Checklist de Inclusões ("O que inclui")</span>
 </div>
 <Badge variant="outline" className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
 {inclusions.length} Inclusos
 </Badge>
 </div>

 <div className="space-y-2">
 <p className="text-xs text-muted-foreground">
 Selecione os itens garantidos no pacote para gerar a lista na página:
 </p>
 <div className="flex flex-wrap gap-2">
 {DEFAULT_TRAVEL_INCLUSIONS_PRESETS.map((preset) => {
 const active = inclusions.includes(preset.label);
 return (
 <button
 key={preset.id}
 type="button"
 onClick={() => toggleInclusion(preset.label)}
 className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
 active
 ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-2xs"
 : "bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground"
 }`}
 >
 <span>{preset.emoji}</span>
 <span>{preset.label}</span>
 {active && <Check className="size-3 text-emerald-500 stroke-[3]" />}
 </button>
 );
 })}
 </div>
 </div>

 <div className="flex items-center gap-2 pt-2 border-t border-border/30">
 <Input
 value={newInclusionText}
 onChange={(e) => setNewInclusionText(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomInclusion())}
 placeholder="Adicionar item personalizado (ex: Passeio de Escuna, Aluguel de Carro)..."
 className="h-9 rounded-xl text-xs bg-background flex-1"
 />
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={addCustomInclusion}
 className="rounded-xl text-xs font-semibold gap-1 h-9 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Adicionar</span>
 </Button>
 </div>
 </div>

 {/* ── 4. CHECKLIST DE EXCLUSÕES ("O QUE NÃO INCLUI") ── */}
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/70 shadow-2xs">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <ShieldAlert className="size-4 text-amber-500" />
 <span>Checklist de Exclusões ("O que NÃO inclui")</span>
 </div>
 <Badge variant="outline" className="text-xs font-mono text-amber-600 dark:text-amber-400">
 {exclusions.length} Excluídos
 </Badge>
 </div>

 <div className="space-y-2">
 <p className="text-xs text-muted-foreground">
 Deixe explícito o que fica por conta do cliente para evitar dúvidas contratuais:
 </p>
 <div className="flex flex-wrap gap-2">
 {DEFAULT_TRAVEL_EXCLUSIONS_PRESETS.map((preset) => {
 const active = exclusions.includes(preset.label);
 return (
 <button
 key={preset.id}
 type="button"
 onClick={() => toggleExclusion(preset.label)}
 className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
 active
 ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-2xs"
 : "bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground"
 }`}
 >
 <span>{preset.emoji}</span>
 <span>{preset.label}</span>
 {active && <Check className="size-3 text-amber-500 stroke-[3]" />}
 </button>
 );
 })}
 </div>
 </div>

 <div className="flex items-center gap-2 pt-2 border-t border-border/30">
 <Input
 value={newExclusionText}
 onChange={(e) => setNewExclusionText(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomExclusion())}
 placeholder="Adicionar exclusão personalizada (ex: Bebidas destiladas fora do buffet)..."
 className="h-9 rounded-xl text-xs bg-background flex-1"
 />
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={addCustomExclusion}
 className="rounded-xl text-xs font-semibold gap-1 h-9 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Adicionar</span>
 </Button>
 </div>
 </div>

 {/* ── 4B. CONDIÇÕES COMERCIAIS & PARCELAMENTO REAL (Bilateral) ── */}
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/70 shadow-2xs">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <CreditCard className="size-4 text-primary" />
 <span>Condições de Pagamento & Parcelamento</span>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Máximo de Parcelas (Cartão)</Label>
 <Select
 value={String(value.payment_conditions?.installments_max || 12)}
 onValueChange={(v) =>
 onChange({
 ...value,
 payment_conditions: {
 ...value.payment_conditions,
 installments_max: parseInt(v) || 12,
 },
 })
 }
 >
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="1">1x (À vista)</SelectItem>
 <SelectItem value="3">Até 3x</SelectItem>
 <SelectItem value="6">Até 6x</SelectItem>
 <SelectItem value="10">Até 10x</SelectItem>
 <SelectItem value="12">Até 12x</SelectItem>
 <SelectItem value="18">Até 18x</SelectItem>
 <SelectItem value="24">Até 24x</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Parcelas Sem Juros</Label>
 <Select
 value={String(value.payment_conditions?.installments_fee_free || 6)}
 onValueChange={(v) =>
 onChange({
 ...value,
 payment_conditions: {
 ...value.payment_conditions,
 installments_fee_free: parseInt(v) || 6,
 },
 })
 }
 >
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="1">1x (Apenas à vista)</SelectItem>
 <SelectItem value="3">3x sem juros</SelectItem>
 <SelectItem value="6">6x sem juros</SelectItem>
 <SelectItem value="10">10x sem juros</SelectItem>
 <SelectItem value="12">12x sem juros</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Desconto no PIX (%)</Label>
 <Input
 type="number"
 min="0"
 max="50"
 value={value.payment_conditions?.pix_discount_percent ?? 5}
 onChange={(e) =>
 onChange({
 ...value,
 payment_conditions: {
 ...value.payment_conditions,
 accepts_pix: true,
 pix_discount_percent: parseFloat(e.target.value) || 0,
 },
 })
 }
 placeholder="Ex: 5"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Sinal / Entrada para Reserva (%)</Label>
 <Input
 type="number"
 min="0"
 max="100"
 value={value.payment_conditions?.deposit_percent ?? 30}
 onChange={(e) =>
 onChange({
 ...value,
 payment_conditions: {
 ...value.payment_conditions,
 deposit_percent: parseFloat(e.target.value) || 0,
 },
 })
 }
 placeholder="Ex: 30 (% do total)"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Prazo do Saldo Restante (Dias antes do embarque)</Label>
 <Input
 type="number"
 min="1"
 max="90"
 value={value.payment_conditions?.balance_deadline_days ?? 15}
 onChange={(e) =>
 onChange({
 ...value,
 payment_conditions: {
 ...value.payment_conditions,
 balance_deadline_days: parseInt(e.target.value) || 15,
 },
 })
 }
 placeholder="Ex: 15 dias"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>
 </div>

 {/* ── 5. ROTEIRO DIA A DIA (ITINERÁRIO ENRIQUECIDO) ── */}
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/70 shadow-2xs">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Calendar className="size-4 text-primary" />
 <span>Roteiro Dia a Dia (Programação Detalhada)</span>
 </div>

 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={addItineraryDay}
 className="rounded-xl text-xs font-semibold gap-1.5 h-8 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>+ Adicionar Dia</span>
 </Button>
 </div>

 <div className="space-y-4">
 {itinerary.map((day, idx) => (
 <div
 key={day.id || idx}
 className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-3 relative group"
 >
 <div className="flex items-center justify-between pb-1 border-b border-border/30">
 <div className="flex items-center gap-2">
 <span className="size-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
 {day.day}
 </span>
 <span className="text-xs font-bold text-foreground">Dia {day.day}</span>
 </div>

 <div className="flex items-center gap-1">
 <Button
 type="button"
 size="icon"
 variant="ghost"
 disabled={idx === 0}
 onClick={() => moveDay(idx, "up")}
 className="size-7 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
 title="Mover para cima"
 >
 <ArrowUp className="size-3" />
 </Button>
 <Button
 type="button"
 size="icon"
 variant="ghost"
 disabled={idx === itinerary.length - 1}
 onClick={() => moveDay(idx, "down")}
 className="size-7 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
 title="Mover para baixo"
 >
 <ArrowDown className="size-3" />
 </Button>
 <Button
 type="button"
 size="icon"
 variant="ghost"
 onClick={() => removeItineraryDay(idx)}
 className="size-7 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
 title="Remover dia"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
 <div className="space-y-1 sm:col-span-2">
 <Label className="text-[11px] font-semibold text-muted-foreground">Título do Dia</Label>
 <Input
 value={day.title}
 onChange={(e) => updateItineraryDay(idx, "title", e.target.value)}
 placeholder="Ex: Chegada e Check-in, City Tour Histórico"
 className="h-9 rounded-xl text-xs bg-background font-semibold"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-semibold text-muted-foreground">Turno / Horário</Label>
 <Input
 value={day.period || ""}
 onChange={(e) => updateItineraryDay(idx, "period", e.target.value)}
 placeholder="Ex: Manhã, Tarde, Dia Todo"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-semibold text-muted-foreground">Data (Opcional)</Label>
 <Input
 value={day.date || ""}
 onChange={(e) => updateItineraryDay(idx, "date", e.target.value)}
 placeholder="Ex: 23 Out"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-semibold text-muted-foreground">Descrição da Programação</Label>
 <Textarea
 value={day.description}
 onChange={(e) => updateItineraryDay(idx, "description", e.target.value)}
 rows={2}
 placeholder="Detalhes das atividades, paradas para fotos, almoço e dicas do guia..."
 className="rounded-xl text-xs bg-background"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-semibold text-muted-foreground">Foto do Dia</Label>
 <ImageUpload
 value={day.imageUrl || ""}
 onChange={(url) => updateItineraryDay(idx, "imageUrl", url)}
 onRemove={() => updateItineraryDay(idx, "imageUrl", "")}
 bucket="destination-media"
 aspectPreset="widescreen"
 helperText="Upload da foto das atividades do dia"
 />
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* ── 6. SEÇÃO EXPANSÍVEL: LOGÍSTICA MULTIMODAL & HORÁRIOS REAIS ── */}
 <div className="bg-card rounded-2xl border border-border/70 shadow-2xs overflow-hidden">
 <button
 type="button"
 onClick={() => setIsAdvancedFlightsOpen(!isAdvancedFlightsOpen)}
 className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/20 transition-colors cursor-pointer"
 >
 <div className="flex items-center gap-2">
 {value.transport_type === "terrestre" ? (
 <Bus className="size-4 text-primary" />
 ) : value.transport_type === "cruzeiro" ? (
 <Ship className="size-4 text-primary" />
 ) : value.transport_type === "misto" ? (
 <Layers className="size-4 text-primary" />
 ) : (
 <Plane className="size-4 text-primary" />
 )}
 <div>
 <h4 className="text-xs font-bold text-foreground">
 {value.transport_type === "terrestre"
 ? "Logística Rodoviária & Transporte Terrestre (Ônibus/Van)"
 : value.transport_type === "cruzeiro"
 ? "Logística Marítima & Cruzeiro (Navio, Cabine & Portos)"
 : value.transport_type === "misto"
 ? "Logística Multimodal Combinada (Aéreo, Terrestre & Cruzeiro)"
 : "Logística Aérea & Voos Garantidos (Trecho Ida, Volta & Transfer)"}
 </h4>
 <p className="text-[11px] text-muted-foreground">
 {value.transport_type === "terrestre"
 ? "Configurar empresa de ônibus, categoria de poltrona, terminais e horários de embarque"
 : value.transport_type === "cruzeiro"
 ? "Configurar companhia marítima, navio, categoria de cabine, portos e horários de check-in"
 : value.transport_type === "misto"
 ? "Configurar múltiplos trechos integrados (voo, ônibus e navio) no mesmo pacote"
 : "Configurar companhia aérea canônica, número dos voos, horários e transfer aeroporto/hotel"}
 </p>
 </div>
 </div>
 {isAdvancedFlightsOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
 </button>

 {isAdvancedFlightsOpen && (
 <div className="p-5 pt-0 space-y-4 border-t border-border/40 animate-in fade-in duration-150">
 
 {/* ─── MODAL AÉREO ─── */}
 {(value.transport_type === "aereo" || !value.transport_type || value.transport_type === "misto") && (
 <div className="space-y-4 pt-3">
 {value.transport_type === "misto" && (
 <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
 <Plane className="size-3.5" /> 1. Trecho Aéreo do Pacote
 </span>
 )}
 
 {/* Companhia Aérea e Duração */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-medium text-muted-foreground">Companhia Aérea Canônica</Label>
 <Select
 value={flightDetails.airline_name || flightDetails.airline_partner || ""}
 onValueChange={(val) => {
 updateFlightDetails("airline_name", val);
 updateFlightDetails("airline_partner", val);
 }}
 >
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue placeholder="Selecione a Cia Aérea..." />
 </SelectTrigger>
 <SelectContent>
 {CANONICAL_AIRLINES.map((airline) => (
 <SelectItem key={airline} value={airline}>
 {airline}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-medium text-muted-foreground">Duração Estimada do Voo</Label>
 <Input
 value={flightDetails.flight_duration || ""}
 onChange={(e) => updateFlightDetails("flight_duration", e.target.value)}
 placeholder="Ex: 2h15 direto"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 </div>

 {/* Voo de Ida */}
 <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
 <Plane className="size-3.5 text-primary" /> Voo de Ida (Embarque)
 </span>
 <span className="text-[10px] text-muted-foreground font-mono">Trecho 1</span>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Nº do Voo</Label>
 <Input
 value={flightDetails.flight_number_out || ""}
 onChange={(e) => updateFlightDetails("flight_number_out", e.target.value)}
 placeholder="Ex: LA3001"
 className="h-9 rounded-xl text-xs bg-background font-mono font-semibold"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário de Saída</Label>
 <Input
 value={flightDetails.departure_time_out || ""}
 onChange={(e) => updateFlightDetails("departure_time_out", e.target.value)}
 placeholder="Ex: 08:30"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário de Chegada</Label>
 <Input
 value={flightDetails.arrival_time_out || ""}
 onChange={(e) => updateFlightDetails("arrival_time_out", e.target.value)}
 placeholder="Ex: 10:45"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Aeroporto de Origem</Label>
 <Input
 value={flightDetails.departure_airport || flightDetails.origin_airport || ""}
 onChange={(e) => {
 updateFlightDetails("departure_airport", e.target.value);
 updateFlightDetails("origin_airport", e.target.value);
 }}
 placeholder="Ex: GRU - São Paulo / Guarulhos ou XAP - Chapecó"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Aeroporto de Destino (IATA)</Label>
 <Input
 value={flightDetails.destination_airport || flightDetails.destination_iata || ""}
 onChange={(e) => {
 updateFlightDetails("destination_airport", e.target.value);
 updateFlightDetails("destination_iata", e.target.value);
 }}
 placeholder="Ex: IOS - Ilhéus / Bahia"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 </div>
 </div>

 {/* Voo de Volta */}
 <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
 <Plane className="size-3.5 text-primary rotate-180" /> Voo de Retorno (Volta)
 </span>
 <span className="text-[10px] text-muted-foreground font-mono">Trecho 2</span>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Nº do Voo</Label>
 <Input
 value={flightDetails.flight_number_return || ""}
 onChange={(e) => updateFlightDetails("flight_number_return", e.target.value)}
 placeholder="Ex: LA3002"
 className="h-9 rounded-xl text-xs bg-background font-mono font-semibold"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário de Saída (Volta)</Label>
 <Input
 value={flightDetails.departure_time_return || ""}
 onChange={(e) => updateFlightDetails("departure_time_return", e.target.value)}
 placeholder="Ex: 16:30"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário de Chegada (Volta)</Label>
 <Input
 value={flightDetails.arrival_time_return || ""}
 onChange={(e) => updateFlightDetails("arrival_time_return", e.target.value)}
 placeholder="Ex: 18:45"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ─── MODAL TERRESTRE (ÔNIBUS / VAN) ─── */}
 {(value.transport_type === "terrestre" || value.transport_type === "misto") && (
 <div className="space-y-4 pt-3">
 {value.transport_type === "misto" && (
 <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
 <Bus className="size-3.5" /> 2. Trecho Rodoviário do Pacote
 </span>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-medium text-muted-foreground">Empresa de Transporte / Ônibus</Label>
 <Input
 value={flightDetails.bus_company || ""}
 onChange={(e) => updateFlightDetails("bus_company", e.target.value)}
 placeholder="Ex: Auto Viação Catarinense, Fretamento Especial"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-medium text-muted-foreground">Categoria do Ônibus / Assento</Label>
 <Select
 value={flightDetails.bus_category || ""}
 onValueChange={(val) => updateFlightDetails("bus_category", val)}
 >
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue placeholder="Selecione a categoria..." />
 </SelectTrigger>
 <SelectContent>
 {CANONICAL_BUS_CATEGORIES.map((cat) => (
 <SelectItem key={cat} value={cat}>
 {cat}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Embarque e Desembarque Rodoviário */}
 <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-3">
 <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
 <Bus className="size-3.5 text-primary" /> Trecho Rodoviário de Ida & Volta
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Terminal / Ponto de Embarque (Ida)</Label>
 <Input
 value={flightDetails.bus_departure_terminal || flightDetails.origin_airport || ""}
 onChange={(e) => {
 updateFlightDetails("bus_departure_terminal", e.target.value);
 updateFlightDetails("origin_airport", e.target.value);
 }}
 placeholder="Ex: Terminal Rodoviário de Chapecó (Plataforma 04)"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário de Saída (Ida)</Label>
 <Input
 value={flightDetails.bus_departure_time_out || flightDetails.departure_time_out || ""}
 onChange={(e) => {
 updateFlightDetails("bus_departure_time_out", e.target.value);
 updateFlightDetails("departure_time_out", e.target.value);
 }}
 placeholder="Ex: 21:00"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Terminal de Chegada / Ponto Final</Label>
 <Input
 value={flightDetails.bus_arrival_terminal || flightDetails.destination_iata || ""}
 onChange={(e) => {
 updateFlightDetails("bus_arrival_terminal", e.target.value);
 updateFlightDetails("destination_iata", e.target.value);
 }}
 placeholder="Ex: Rodoviária de Gramado / Centro Turístico"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário Estimado de Chegada (Ida)</Label>
 <Input
 value={flightDetails.bus_arrival_time_out || flightDetails.arrival_time_out || ""}
 onChange={(e) => {
 updateFlightDetails("bus_arrival_time_out", e.target.value);
 updateFlightDetails("arrival_time_out", e.target.value);
 }}
 placeholder="Ex: 07:30"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário de Saída (Retorno)</Label>
 <Input
 value={flightDetails.bus_departure_time_return || flightDetails.departure_time_return || ""}
 onChange={(e) => {
 updateFlightDetails("bus_departure_time_return", e.target.value);
 updateFlightDetails("departure_time_return", e.target.value);
 }}
 placeholder="Ex: 18:00 (Check-out e Embarque)"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário Estimado de Chegada (Retorno)</Label>
 <Input
 value={flightDetails.bus_arrival_time_return || flightDetails.arrival_time_return || ""}
 onChange={(e) => {
 updateFlightDetails("bus_arrival_time_return", e.target.value);
 updateFlightDetails("arrival_time_return", e.target.value);
 }}
 placeholder="Ex: 06:00 (Dia seguinte)"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ─── MODAL CRUZEIRO (MARÍTIMO / FLUVIAL) ─── */}
 {(value.transport_type === "cruzeiro" || value.transport_type === "misto") && (
 <div className="space-y-4 pt-3">
 {value.transport_type === "misto" && (
 <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
 <Ship className="size-3.5" /> 3. Trecho de Cruzeiro Marítimo
 </span>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-medium text-muted-foreground">Companhia Marítima</Label>
 <Select
 value={flightDetails.cruise_line || ""}
 onValueChange={(val) => updateFlightDetails("cruise_line", val)}
 >
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue placeholder="Selecione a Armadora..." />
 </SelectTrigger>
 <SelectContent>
 {CANONICAL_CRUISE_LINES.map((line) => (
 <SelectItem key={line} value={line}>
 {line}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-medium text-muted-foreground">Nome do Navio</Label>
 <Input
 value={flightDetails.ship_name || ""}
 onChange={(e) => updateFlightDetails("ship_name", e.target.value)}
 placeholder="Ex: MSC Seaview, Costa Diadema"
 className="h-9 rounded-xl text-xs bg-background font-semibold"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-medium text-muted-foreground">Categoria da Cabine</Label>
 <Select
 value={flightDetails.cabin_category || ""}
 onValueChange={(val) => updateFlightDetails("cabin_category", val)}
 >
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue placeholder="Tipo de cabine..." />
 </SelectTrigger>
 <SelectContent>
 {CANONICAL_CABIN_CATEGORIES.map((cab) => (
 <SelectItem key={cab} value={cab}>
 {cab}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Portos e Horários de Embarque / Desatracação */}
 <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-3">
 <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
 <Anchor className="size-3.5 text-primary" /> Portos & Horários Portuários
 </span>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Porto de Embarque</Label>
 <Input
 value={flightDetails.embarkation_port || ""}
 onChange={(e) => updateFlightDetails("embarkation_port", e.target.value)}
 placeholder="Ex: Porto de Santos / Concais"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário de Check-in / Bagagens</Label>
 <Input
 value={flightDetails.boarding_checkin_time || ""}
 onChange={(e) => updateFlightDetails("boarding_checkin_time", e.target.value)}
 placeholder="Ex: 11:00 às 14:00"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Partida do Navio (Desatracação)</Label>
 <Input
 value={flightDetails.ship_departure_time || ""}
 onChange={(e) => updateFlightDetails("ship_departure_time", e.target.value)}
 placeholder="Ex: 18:00"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/40">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Porto de Desembarque Final</Label>
 <Input
 value={flightDetails.disembarkation_port || ""}
 onChange={(e) => updateFlightDetails("disembarkation_port", e.target.value)}
 placeholder="Ex: Porto de Santos ou Salvador"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário de Retorno / Desembarque</Label>
 <Input
 value={flightDetails.ship_arrival_time || ""}
 onChange={(e) => updateFlightDetails("ship_arrival_time", e.target.value)}
 placeholder="Ex: 08:00 (Atracação)"
 className="h-9 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ─── RESUMO MISTO ─── */}
 {value.transport_type === "misto" && (
 <div className="space-y-1.5 pt-2">
 <Label className="text-xs font-medium text-muted-foreground">Resumo das Conexões Multimodais</Label>
 <Textarea
 value={flightDetails.mixed_transport_summary || ""}
 onChange={(e) => updateFlightDetails("mixed_transport_summary", e.target.value)}
 placeholder="Ex: Voo SP -> Salvador + Transfer privativo em van executiva até o terminal náutico + Lancha rápida até Morro de São Paulo..."
 rows={2}
 className="rounded-xl text-xs bg-background"
 />
 </div>
 )}

 {/* ─── TRANSFER BILATERAL (COMUM A TODOS OS MODAIS) ─── */}
 <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-3">
 <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
 <Car className="size-3.5 text-primary" /> Transfer Bilateral (In / Out)
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário do Transfer Ida (Aeroporto/Porto/Rodoviária → Hotel)</Label>
 <Input
 value={flightDetails.transfer_pickup_time || ""}
 onChange={(e) => updateFlightDetails("transfer_pickup_time", e.target.value)}
 placeholder="Ex: 11:15 (Recepção com placa nominal)"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário do Transfer Retorno (Hotel → Ponto de Partida)</Label>
 <Input
 value={flightDetails.transfer_return_time || ""}
 onChange={(e) => updateFlightDetails("transfer_return_time", e.target.value)}
 placeholder="Ex: 13:30 (Saída pontual do lobby)"
 className="h-9 rounded-xl text-xs bg-background"
 />
 </div>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* ── 7. SEÇÃO EXPANSÍVEL: CURADORIA DE RECOMENDAÇÕES LOCAIS ── */}
 <div className="bg-card rounded-2xl border border-border/70 shadow-2xs overflow-hidden">
 <button
 type="button"
 onClick={() => setIsRecommendationsOpen(!isRecommendationsOpen)}
 className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/20 transition-colors cursor-pointer"
 >
 <div className="flex items-center gap-2">
 <Compass className="size-4 text-primary" />
 <div>
 <h4 className="text-xs font-bold text-foreground">Curadoria Local (Restaurantes, Praias & Dicas)</h4>
 <p className="text-[11px] text-muted-foreground">Pontos de interesse próximos exibidos na aba de roteiro e explore</p>
 </div>
 </div>
 {isRecommendationsOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
 </button>

 {isRecommendationsOpen && (
 <div className="p-5 pt-0 space-y-4 border-t border-border/40 animate-in fade-in duration-150">
 <div className="flex justify-end pt-3">
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={addRecommendation}
 className="rounded-xl text-xs font-semibold gap-1.5 h-8 cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>+ Adicionar Recomendação</span>
 </Button>
 </div>

 <div className="space-y-3">
 {recommendations.map((rec, i) => (
 <div key={rec.id || i} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2.5">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground">Recomendação #{i + 1}</span>
 <button
 type="button"
 onClick={() => removeRecommendation(i)}
 className="text-destructive hover:bg-destructive/10 p-1 rounded-md"
 >
 <Trash2 className="size-3.5" />
 </button>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1">
 <Label className="text-[10px] font-semibold text-muted-foreground">Nome do Local</Label>
 <Input
 value={rec.title}
 onChange={(e) => updateRecommendation(i, "title", e.target.value)}
 placeholder="Ex: Restaurante Mar Aberto"
 className="h-8 text-xs rounded-lg"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[10px] font-semibold text-muted-foreground">Categoria / Especialidade</Label>
 <Input
 value={rec.category}
 onChange={(e) => updateRecommendation(i, "category", e.target.value)}
 placeholder="Ex: Frutos do Mar & Moquecas"
 className="h-8 text-xs rounded-lg"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[10px] font-semibold text-muted-foreground">Distância</Label>
 <Input
 value={rec.distance}
 onChange={(e) => updateRecommendation(i, "distance", e.target.value)}
 placeholder="Ex: 2.5 km do resort"
 className="h-8 text-xs rounded-lg"
 />
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* ── 8. CONDIÇÕES COMERCIAIS & PARCELAMENTO BILATERAL (REGRA 22) ── */}
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/70 shadow-2xs">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <CreditCard className="size-4 text-primary" />
 <span>Condições Comerciais & Parcelamento</span>
 </div>
 <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
 Regra 22: 1-24x
 </Badge>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Slider de Parcelamento Máximo */}
 <div className="space-y-2 sm:col-span-2 p-3.5 rounded-xl bg-muted/20 border border-border/50">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-semibold text-foreground">
 Parcelamento Máximo no Cartão
 </Label>
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
 <span>12x</span>
 <span>18x</span>
 <span>24x</span>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Parcelas Sem Juros</Label>
 <Input
 type="number"
 min={1}
 max={maxInstallments}
 value={feeFreeInstallments}
 onChange={(e) => updatePaymentConditions("installments_fee_free", Number(e.target.value))}
 placeholder="12"
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 <p className="text-[10px] text-muted-foreground">Quantas parcelas o lojista assume a taxa do cartão.</p>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Desconto à Vista no PIX (%)</Label>
 <Input
 type="number"
 min={0}
 max={50}
 value={pixDiscountPercent}
 onChange={(e) => updatePaymentConditions("pix_discount_percent", Number(e.target.value))}
 placeholder="5"
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 {pixDiscountPercent > 0 && priceCents > 0 && (
 <p className="text-[10px] text-emerald-600 font-semibold font-mono">
 Valor no PIX: {formatMoney(pixCents)} ({pixDiscountPercent}% OFF)
 </p>
 )}
 </div>

 <div className="space-y-1.5 sm:col-span-2">
 <Label className="text-xs text-foreground font-medium">Sinal Mínimo de Entrada (%)</Label>
 <Input
 type="number"
 min={0}
 max={100}
 value={depositPercent}
 onChange={(e) => updatePaymentConditions("deposit_percent", Number(e.target.value))}
 placeholder="0 (Sem entrada obrigatória)"
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 <p className="text-[10px] text-muted-foreground">Porcentagem exigida no ato da confirmação da reserva.</p>
 </div>
 </div>
 </div>

 {/* ── 9. DESTAQUES VISUAIS EM CÍRCULOS (STORY HIGHLIGHTS — REGRAS 19 & 20) ── */}
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/70 shadow-2xs">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Sparkles className="size-4 text-primary" />
 <span>Destaques Visuais (Story Highlights)</span>
 </div>
 <Badge variant="outline" className="text-[10px] font-mono text-primary bg-primary/10 border-primary/30">
 Regra 20: Upload Contextual
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground">
 Círculos táteis inspirados no Instagram exibidos no topo da vitrine para destacar Resort, Piscinas, Gastronomia e Praias.
 </p>
 <StoryHighlightUploader
 highlights={highlights}
 onChange={handleHighlightsChange}
 onUpload={(file) => uploadClassifiedMedia(file, "travel-highlights")}
 maxHighlights={8}
 />
 </div>
 </div>
 );
}
