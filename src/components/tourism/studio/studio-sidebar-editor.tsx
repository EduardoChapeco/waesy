import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  TravelProposalDTO,
  FlightSegmentDTO,
  HotelOptionDTO,
  ItineraryDayDTO,
  ProposalRoomItem,
  ProposalCanvasFormat,
} from "@/services/travel-proposal.functions";
import { listHotelsBank } from "@/services/travel-catalog.functions";
import { listCustomers } from "@/services/crm.functions";
import { listGroupTours } from "@/services/group-tours.functions";
import { CANONICAL_DESTINATIONS } from "@/lib/destinations-catalog";
import { FAMOUS_HOTEL_PRESETS, type HotelPreset } from "@/lib/hotel-presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ui/image-upload";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Minus, Trash, Plane, Building2, Calendar, DollarSign, Info, CheckCircle, MapPin, Clock, Compass, Zap, BedDouble, Car, Users, LayoutTemplate, Check, X, Bus, Moon, Briefcase, Monitor, FileText, Tag, Palette, Type, Eye, EyeOff, RotateCcw } from "lucide-react";
import { formatDynamicFieldLabel, normalizeCustomFieldMap } from "@/lib/niches/unified-field-bridge";
import {
  CANVAS_BG_PRESETS,
  BRAND_COLOR_PRESETS,
  FONT_PRESET_OPTIONS,
  PROPOSAL_SECTION_CATALOG,
  TEMPLATE_DEFAULT_PALETTES,
  resolveProposalCanvasTheme,
  type ProposalSectionKey,
  type ProposalTemplateCanonicalId,
} from "@/lib/tourism/proposal-theme-palettes";

const STUDIO_RESERVED_FIELD_KEYS = new Set([
  "boarding_requirements",
  "cancellation_policy",
  "canvas_bg_color",
  "canvas_brand_color",
  "canvas_font_preset",
  "hidden_sections",
  "agent_name",
  "agent_whatsapp",
  "agency_name",
]);

function buildColorSwatchStyle(hexColor: string): React.CSSProperties {
  const styleMap: Record<string, string> = {};
  styleMap["backgroundColor"] = hexColor;
  return styleMap as React.CSSProperties;
}

const TEMPLATE_CATALOG = [
  { id: "editorial-flat", label: "Clean Apple", desc: "Design minimalista, foco em tipografia e fotos amplas", icon: LayoutTemplate },
  { id: "dark-premium", label: "Dark Luxo", desc: "Capa cinematográfica escura, acabamento sofisticado", icon: Moon },
  { id: "executivo-b2b", label: "Executivo B2B", desc: "Tabela corporativa limpa, direto ao ponto", icon: Briefcase },
  { id: "landscape-presentation", label: "Paisagem Widescreen", desc: "Formato slide 16:9 para reuniões e TVs", icon: Monitor },
  { id: "vertical-premium", label: "Vertical Premium", desc: "Otimizado para leitura em tela de smartphone", icon: FileText },
  { id: "group-catalog", label: "Catálogo de Grupo", desc: "Excursão rodoviária com tabela de vagas e saídas", icon: Tag },
];

const FORMAT_CATALOG: Array<{ id: ProposalCanvasFormat; label: string; icon: string; desc: string }> = [
  { id: "a4-portrait", label: "A4 Retrato", icon: "A4", desc: "Padrão oficial para impressão e PDF clássico (210×297mm)" },
  { id: "a4-landscape", label: "A4 Paisagem", icon: "A4L", desc: "Visual horizontal panorâmico para relatórios" },
  { id: "story-916", label: "Story 9:16", icon: "9:16", desc: "Vertical para visualização mobile e WhatsApp" },
  { id: "presentation-169", label: "Apresentação 16:9", icon: "16:9", desc: "Widescreen para reuniões e propostas executivas" },
  { id: "letter-portrait", label: "Carta (US)", icon: "US", desc: "Formato internacional Carta" },
];

const COMMON_INCLUDE_PRESETS = [
  "Passagens aéreas de ida e volta com taxas inclusas",
  "Transporte Rodoviário Executivo Ida e Volta",
  "Hospedagem com Café da Manhã",
  "Transfer Aeroporto / Hotel / Aeroporto",
  "Seguro Viagem Completo com Cobertura Médica",
  "Bagagem Despachada 23kg",
  "Guia Credenciado Acompanhante",
  "Passeios e Ingressos descritos no roteiro",
  "Suporte e Conciergerie 24h durante a viagem",
];

const COMMON_EXCLUDE_PRESETS = [
  "Despesas de caráter pessoal e frigobar",
  "Passeios opcionais não descritos como inclusos",
  "Taxas turísticas locais ou de preservação ambiental",
  "Refeições e bebidas não mencionadas no roteiro",
  "Excesso de bagagem além da franquia contratada",
  "Seguro cancelamento de viagem (opcional)",
];

interface StudioSidebarEditorProps {
 proposal: TravelProposalDTO;
 onChange: (patch: Partial<TravelProposalDTO>) => void;
}

export function StudioSidebarEditor({ proposal, onChange }: StudioSidebarEditorProps) {
 const { data: hotelsBank = [] } = useQuery({
 queryKey: ["hotels-bank-studio"],
 queryFn: () => listHotelsBank().catch(() => []),
 });

 // Estado local para input de preço em Reais amigável
 const { data: customersRes, isLoading: isLoadingCrm } = useQuery({
   queryKey: ["crm-customers-studio"],
   queryFn: () => listCustomers({ data: {} }).catch(() => ({ customers: [] })),
 });
 const crmCustomers: any[] = Array.isArray((customersRes as any)?.customers)
   ? (customersRes as any).customers
   : Array.isArray(customersRes)
     ? (customersRes as any)
     : [];

 const { data: groupTours = [] } = useQuery({
   queryKey: ["group-tours-studio"],
   queryFn: () => listGroupTours({ data: {} }).catch(() => []),
 });

 const [newIncludeText, setNewIncludeText] = useState("");
 const [newExcludeText, setNewExcludeText] = useState("");
 const [basePriceReais, setBasePriceReais] = useState<string>(() => {
   const cents = proposal.pricing?.base_price_cents || proposal.pricing?.total_price_cents || 0;
   return cents > 0 ? (cents / 100).toFixed(2) : "";
 });
 const [boardingTaxReais, setBoardingTaxReais] = useState<string>(() => {
   const cents = proposal.pricing?.boarding_tax_cents || 0;
   return cents > 0 ? (cents / 100).toFixed(2) : "";
 });
 const [discountReais, setDiscountReais] = useState<string>(() => {
   const cents = proposal.pricing?.discount_cents || 0;
   return cents > 0 ? (cents / 100).toFixed(2) : "";
 });
 const [priceInputReais, setPriceInputReais] = useState<string>(() => {
 const cents = proposal.pricing?.total_price_cents || 0;
 return cents > 0 ? (cents / 100).toFixed(2) : "";
 });
 const [newCustomFieldKey, setNewCustomFieldKey] = useState<string>("");
 const [newCustomFieldVal, setNewCustomFieldVal] = useState<string>("");

  const studioCustomFields = normalizeCustomFieldMap({
    ...(proposal.custom_fields && typeof proposal.custom_fields === "object" ? proposal.custom_fields : {}),
    ...((proposal.pricing as any)?.custom_fields && typeof (proposal.pricing as any).custom_fields === "object"
      ? (proposal.pricing as any).custom_fields
      : {}),
  } as Record<string, unknown>) as Record<string, string>;

  const updateStudioCustomField = (key: string, value: string | null) => {
    const cleanKey = key.trim();
    if (!cleanKey) return;
    const next = { ...studioCustomFields };
    if (!value || !value.trim()) {
      delete next[cleanKey];
    } else {
      next[cleanKey] = value.trim();
    }
    onChange({
      custom_fields: next,
      pricing: {
        ...proposal.pricing,
        custom_fields: next,
      } as any,
    });
  };

  const activeCanvasTheme = resolveProposalCanvasTheme({
    templateId: proposal.template_theme || (proposal as any).template || "editorial-flat",
    customFields: studioCustomFields,
    brandColorProp: (proposal as any).brand_color,
  });

  const defaultTemplatePalette =
    TEMPLATE_DEFAULT_PALETTES[(proposal.template_theme || "editorial-flat") as ProposalTemplateCanonicalId] ||
    TEMPLATE_DEFAULT_PALETTES["editorial-flat"];

  const toggleProposalSection = (secKey: ProposalSectionKey) => {
    const nextSet = new Set(activeCanvasTheme.hiddenSections);
    if (nextSet.has(secKey)) {
      nextSet.delete(secKey);
    } else {
      nextSet.add(secKey);
    }
    const serialized = Array.from(nextSet).join(",");
    updateStudioCustomField("hidden_sections", serialized || null);
  };

  const applyValidityDaysOffset = (days: number) => {
    const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    onChange({ valid_until: targetDate.toLocaleDateString("pt-BR") });
  };

 const handlePriceChange = (valStr: string) => {
 setPriceInputReais(valStr);
 const cleaned = valStr.replace(/[^\d.,]/g, "").replace(",", ".");
 const valFloat = parseFloat(cleaned);
 if (!isNaN(valFloat) && valFloat >= 0) {
 const cents = Math.round(valFloat * 100);
 onChange({
 pricing: {
 ...proposal.pricing,
 total_price_cents: cents,
 },
 });
 }
 };

 // Derivação e Handlers de Quartos (Rooming List)
 const currentRooms: ProposalRoomItem[] =
 proposal.rooms && proposal.rooms.length > 0
 ? proposal.rooms
 : [
 {
 id: "room-1",
 roomNumber: 1,
 roomType: "Casal",
 adults: proposal.adults_count || 2,
 children: proposal.children_count || 0,
 childrenAges: [],
 },
 ];

 const totalAdults = currentRooms.reduce((acc, r) => acc + r.adults, 0);
 const totalChildren = currentRooms.reduce((acc, r) => acc + r.children, 0);

 const handleAddRoom = () => {
 const nextNum = currentRooms.length + 1;
 const newRooms = [
 ...currentRooms,
 {
 id: `room-${Date.now()}-${nextNum}`,
 roomNumber: nextNum,
 roomType: "Casal",
 adults: 2,
 children: 0,
 childrenAges: [],
 },
 ];
 const newTotalAdults = newRooms.reduce((acc, r) => acc + r.adults, 0);
 const newTotalChildren = newRooms.reduce((acc, r) => acc + r.children, 0);
 onChange({ rooms: newRooms, adults_count: newTotalAdults, children_count: newTotalChildren });
 };

 const handleRemoveRoom = (roomId: string) => {
 if (currentRooms.length <= 1) return;
 const newRooms = currentRooms
 .filter((r) => r.id !== roomId)
 .map((r, idx) => ({ ...r, roomNumber: idx + 1 }));
 const newTotalAdults = newRooms.reduce((acc, r) => acc + r.adults, 0);
 const newTotalChildren = newRooms.reduce((acc, r) => acc + r.children, 0);
 onChange({ rooms: newRooms, adults_count: newTotalAdults, children_count: newTotalChildren });
 };

 const handleUpdateRoomAdults = (roomId: string, delta: number) => {
 const newRooms = currentRooms.map((r) => {
 if (r.id !== roomId) return r;
 const newAdults = Math.max(1, Math.min(6, r.adults + delta));
 return { ...r, adults: newAdults };
 });
 const newTotalAdults = newRooms.reduce((acc, r) => acc + r.adults, 0);
 onChange({ rooms: newRooms, adults_count: newTotalAdults });
 };

 const handleUpdateRoomChildren = (roomId: string, delta: number) => {
 const newRooms = currentRooms.map((r) => {
 if (r.id !== roomId) return r;
 const newChildren = Math.max(0, Math.min(4, r.children + delta));
 let newAges = [...(r.childrenAges || [])];
 if (newChildren > newAges.length) {
 while (newAges.length < newChildren) newAges.push(5);
 } else if (newChildren < newAges.length) {
 newAges = newAges.slice(0, newChildren);
 }
 return { ...r, children: newChildren, childrenAges: newAges };
 });
 const newTotalChildren = newRooms.reduce((acc, r) => acc + r.children, 0);
 onChange({ rooms: newRooms, children_count: newTotalChildren });
 };

 const handleUpdateChildAge = (roomId: string, childIdx: number, age: number) => {
 const newRooms = currentRooms.map((r) => {
 if (r.id !== roomId) return r;
 const newAges = [...(r.childrenAges || [])];
 newAges[childIdx] = age;
 return { ...r, childrenAges: newAges };
 });
 onChange({ rooms: newRooms });
 };

 const handleUpdateRoomType = (roomId: string, roomType: string) => {
 const newRooms = currentRooms.map((r) =>
 r.id === roomId ? { ...r, roomType } : r
 );
 onChange({ rooms: newRooms });
 };

 const handleImportHotelFromBank = (hotelId: string) => {
 const hotel = (hotelsBank || []).find((h: any) => h.id === hotelId);
 if (!hotel) return;

 const firstRoom = hotel.room_categories?.[0];
 const newHotel: HotelOptionDTO = {
 id: "ht_" + Math.random().toString(36).substring(2, 7),
 hotel_name: hotel.name,
 stars: hotel.stars || 4,
 room_type: firstRoom?.name || "Apartamento Superior",
 board_basis: (hotel.regime_options?.[0] as any) || "all_inclusive",
 checkin_date: proposal.travel_start_date || "",
 checkout_date: proposal.travel_end_date || "",
 nights_count: 5,
 amenities: (hotel.badges && hotel.badges.length > 0) ? hotel.badges : ["Piscina", "Wi-Fi", "Ar Condicionado"],
 };

 const patch: Partial<TravelProposalDTO> = {
 hotels: [...proposal.hotels, newHotel],
 cover_image_url: proposal.cover_image_url || hotel.cover_photo_url || (hotel.photos && hotel.photos[0]) || "",
 };
 if (!proposal.destination_city && hotel.city) {
 patch.destination_city = hotel.city + (hotel.state ? ', ' + hotel.state : '');
 }
 onChange(patch);
 toast.success(`Hotel ${hotel.name} importado com sucesso do Banco de Hotéis!`);
 };

 const handleImportPresetHotel = (preset: HotelPreset) => {
 const newHotel: HotelOptionDTO = {
 id: "ht_" + Math.random().toString(36).substring(2, 7),
 hotel_name: preset.name,
 stars: preset.stars || 5,
 room_type: "Apartamento Luxo / Bangalô",
 board_basis: (preset.regime_options?.[0] as any) || "all_inclusive",
 checkin_date: proposal.travel_start_date || "",
 checkout_date: proposal.travel_end_date || "",
 nights_count: 5,
 amenities: preset.badges || ["Piscina", "Wi-Fi", "Pé na Areia"],
 };

 onChange({
 hotels: [...proposal.hotels, newHotel],
 cover_image_url: proposal.cover_image_url || preset.cover_photo_url || "",
 });
 };

 // Helpers de Voos
 const handleAddFlight = () => {
   const isReturn = proposal.flights.length > 0;
   const firstFlight = proposal.flights[0];
   const newFlight: FlightSegmentDTO = {
     id: "fl_" + Math.random().toString(36).substring(2, 7),
     type: isReturn ? "return" : "outbound",
     leg: isReturn ? "volta" : "ida",
     airline: "",
     airline_name: "",
     origin: isReturn ? (firstFlight?.destination || "") : "",
     origin_iata: isReturn ? (firstFlight?.destination_iata || "") : "",
     origin_city: isReturn ? (firstFlight?.destination_city || "") : "",
     destination: isReturn ? (firstFlight?.origin || "") : (proposal.destination || ""),
     destination_iata: isReturn ? (firstFlight?.origin_iata || "") : "",
     destination_city: isReturn ? (firstFlight?.origin_city || "") : (proposal.destination || ""),
     departure_time: "",
     arrival_time: "",
     baggage_included: "",
     stops_count: 0,
   };
   onChange({ flights: [...proposal.flights, newFlight] });
 };

 const handleRemoveFlight = (id?: string) => {
 if (!id) return;
 onChange({ flights: proposal.flights.filter((f) => f.id !== id) });
 };

 const handleFlightChange = (id: string | undefined, field: keyof FlightSegmentDTO, val: any) => {
 if (!id) return;
 onChange({
 flights: proposal.flights.map((f) => {
   if (f.id !== id) return f;
   const next: FlightSegmentDTO = { ...f, [field]: val };
   if (field === "airline_name") next.airline = val;
   if (field === "origin_iata") next.origin = val;
   if (field === "destination_iata") next.destination = val;
   if (field === "stops_count") next.stops = Number(val) || 0;
   return next;
 }),
 });
 };

 // Helpers de Hotéis
 const handleAddHotel = () => {
   const newHotel: HotelOptionDTO = {
     id: "ht_" + Math.random().toString(36).substring(2, 7),
     hotel_name: "",
     stars: 3,
     room_type: "",
     board_basis: "Café da Manhã",
     checkin_date: proposal.travel_start_date || "",
     checkout_date: proposal.travel_end_date || "",
     nights_count: 1,
     amenities: [],
   };
   onChange({ hotels: [...proposal.hotels, newHotel] });
 };

 const handleRemoveHotel = (id?: string) => {
 if (!id) return;
 onChange({ hotels: proposal.hotels.filter((h) => h.id !== id) });
 };

 const handleHotelChange = (id: string | undefined, field: keyof HotelOptionDTO, val: any) => {
 if (!id) return;
 onChange({
 hotels: proposal.hotels.map((h) => {
   if (h.id !== id) return h;
   const next: any = { ...h, [field]: val };
   if (field === "hotel_name") next.name = val;
   if (field === "checkin_date") next.checkin = val;
   if (field === "checkout_date") next.checkout = val;
   if (field === "image_url") next.images = val ? [val] : [];
   return next;
 }),
 });
 };

 // Helpers de Roteiro
 const handleAddItineraryDay = () => {
   const nextDay = proposal.itinerary.length + 1;
   const newDay: ItineraryDayDTO = {
     id: "day_" + Math.random().toString(36).substring(2, 7),
     day_number: nextDay,
     title: `Dia ${nextDay}`,
     description: "",
   };
   onChange({ itinerary: [...proposal.itinerary, newDay] });
 };

 const handleRemoveItineraryDay = (id?: string) => {
 if (!id) return;
 onChange({ itinerary: proposal.itinerary.filter((it) => it.id !== id) });
 };

 const handleItineraryChange = (id: string | undefined, field: keyof ItineraryDayDTO, val: any) => {
 if (!id) return;
 onChange({
 itinerary: proposal.itinerary.map((it) => (it.id === id ? { ...it, [field]: val } : it)),
 });
 };

 const handleGenerateItineraryFromDestination = () => {
 const matched = CANONICAL_DESTINATIONS.find((d) =>
 proposal.destination_city.toLowerCase().includes(d.city.toLowerCase()) ||
 d.name.toLowerCase().includes(proposal.destination_city.toLowerCase())
 );

 if (matched && matched.highlights.length > 0) {
 const generated: ItineraryDayDTO[] = matched.highlights.map((h, idx) => ({
 id: "day_" + Math.random().toString(36).substring(2, 7),
 day_number: idx + 1,
 title: `Dia ${idx + 1} • ${h}`,
 description: `Passeio imperdível em ${matched.name}. Roteiro planejado para aproveitar as melhores atrações de ${h} com tranquilidade e conforto.`,
 }));
 onChange({ itinerary: generated });
 } else {
 // Fallback inteligente
 const defaultDays: ItineraryDayDTO[] = [
 { id: "day_1", day_number: 1, title: "Dia 1 • Chegada e Check-in", description: "Recepção no aeroporto, transfer privativo para a hospedagem e descanso para aproveitar o resort." },
 { id: "day_2", day_number: 2, title: "Dia 2 • Tour de Reconhecimento e Praias", description: "Passeio pelas principais praias da região com parada para almoço em restaurante típico." },
 { id: "day_3", day_number: 3, title: "Dia 3 • Dia Livre e Experiências", description: "Aproveite a estrutura de lazer, piscinas e gastronomia ou faça passeios opcionais de barco/buggy." },
 { id: "day_4", day_number: 4, title: "Dia 4 • Check-out e Retorno", description: "Manhã livre para últimas fotos e compras locais, seguido de transfer de retorno ao aeroporto." },
 ];
 onChange({ itinerary: defaultDays });
 }
 };

 // Helpers de Transfers (Receptivo) e Passeios (Experiências)
 const currentTransfers = Array.isArray(proposal.transfers) ? proposal.transfers : [];
 const currentTours = Array.isArray(proposal.tours) ? proposal.tours : [];
 const currentIncludes = Array.isArray(proposal.includes) ? proposal.includes : [];
 const currentExcludes = Array.isArray(proposal.excludes) ? proposal.excludes : [];

 const handleAddTransfer = () => {
   const nextTransfer = {
     type: "private",
     description: `Transfer Aeroporto ↔ Hotel (${proposal.destination_city || "Destino"})`,
     vehicle: "Van Executiva",
     date: proposal.travel_start_date || "",
     notes: "Receptivo privativo com placa nominal",
   };
   onChange({ transfers: [...currentTransfers, nextTransfer as any] });
 };

 const handleUpdateTransfer = (idx: number, patch: Record<string, any>) => {
   const next = currentTransfers.map((t, i) => (i === idx ? { ...t, ...patch } : t));
   onChange({ transfers: next as any });
 };

 const handleRemoveTransfer = (idx: number) => {
   onChange({ transfers: currentTransfers.filter((_, i) => i !== idx) });
 };

 const handleAddTour = () => {
   const nextTour = {
     id: `tour_${Date.now()}`,
     title: `City Tour & Principais Atrações (${proposal.destination_city || "Destino"})`,
     description: `City Tour & Principais Atrações (${proposal.destination_city || "Destino"})`,
     duration: "Dia inteiro (8h)",
     price_cents: 0,
     included: true,
     is_included: true,
   };
   onChange({ tours: [...currentTours, nextTour] });
 };

 const handleUpdateTour = (idx: number, patch: Record<string, any>) => {
   const next = currentTours.map((t: any, i: number) => {
     if (i !== idx) return t;
     const merged = { ...t, ...patch };
     if (patch.title !== undefined) merged.description = patch.title;
     return merged;
   });
   onChange({ tours: next });
 };

 const handleRemoveTour = (idx: number) => {
   onChange({ tours: currentTours.filter((_, i) => i !== idx) });
 };

 const handleImportGroupTour = (groupId: string) => {
   const gt = (groupTours as any[]).find((g) => g.id === groupId);
   if (!gt) return;
   const importedTour = {
     id: `gt_${gt.id}`,
     title: `${gt.title} (${gt.destination})`,
     description: `${gt.title} (${gt.destination})`,
     duration: gt.departure_date || "Excursão em Grupo",
     price_cents: Number(gt.price_cents || 0),
     included: true,
     is_included: true,
   };
   onChange({ tours: [...currentTours, importedTour] });
   toast.success(`Excursão "${gt.title}" importada para os serviços da proposta!`);
 };

 const handleSuggestIncludesExcludes = () => {
   const suggestedInc = new Set<string>(currentIncludes);
   if (proposal.flights.length > 0) {
     suggestedInc.add("Passagens aéreas de ida e volta com taxas inclusas");
   }
   if (proposal.hotels.length > 0) {
     const h0 = proposal.hotels[0];
     const regimeLabel =
       h0.board_basis === "all_inclusive"
         ? "sistema All Inclusive"
         : h0.board_basis === "full_board"
           ? "pensão completa"
           : h0.board_basis === "half_board"
             ? "meia pensão"
             : "café da manhã incluso";
     suggestedInc.add(`Hospedagem em ${h0.hotel_name || "hotel selecionado"} com ${regimeLabel}`);
   }
   if (currentTransfers.length > 0) {
     suggestedInc.add("Traslados de chegada e saída (Aeroporto / Hotel / Aeroporto)");
   }
   if (currentTours.length > 0) {
     suggestedInc.add("Passeios e experiências descritos no roteiro");
   }
   suggestedInc.add("Seguro viagem completo com cobertura médica e bagagem");
   suggestedInc.add("Suporte e acompanhamento especializado da agência antes e durante a viagem");

   const suggestedExc = new Set<string>(currentExcludes);
   suggestedExc.add("Despesas de caráter pessoal, bebidas e refeições não mencionadas");
   suggestedExc.add("Passeios opcionais não descritos como inclusos");
   suggestedExc.add("Taxas turísticas locais ou de preservação ambiental cobradas no destino");

   onChange({
     includes: Array.from(suggestedInc),
     excludes: Array.from(suggestedExc),
   });
   toast.success("Inclusões e exclusões inteligentes sincronizadas com o pacote!");
 };

 const recomputePricingFromBreakdown = (
   nextBaseStr: string,
   nextTaxStr: string,
   nextDiscStr: string,
 ) => {
   const parseCents = (s: string) => {
     const n = parseFloat(s.replace(/[^\d.,]/g, "").replace(",", "."));
     return !isNaN(n) && n >= 0 ? Math.round(n * 100) : 0;
   };
   const baseCents = parseCents(nextBaseStr);
   const taxCents = parseCents(nextTaxStr);
   const discCents = parseCents(nextDiscStr);
   const totalCents = Math.max(0, baseCents + taxCents - discCents);
   setPriceInputReais(totalCents > 0 ? (totalCents / 100).toFixed(2) : "");
   onChange({
     pricing: {
       ...proposal.pricing,
       base_price_cents: baseCents,
       boarding_tax_cents: taxCents,
       discount_cents: discCents,
       total_price_cents: totalCents,
       total_cents: totalCents,
     },
   });
 
 };

 return (
 <div className="w-full h-full flex flex-col overflow-hidden bg-card">
 <div className="p-4 px-4 border-b border-border/80 shrink-0 bg-muted/20 flex items-center justify-between">
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
 <Compass className="size-3.5 text-primary" />
 <span>Editor de Roteiro</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Alterações sincronizadas com o canvas em tempo real
 </p>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
 <Tabs defaultValue="design" className="space-y-4">
 <TabsList className="grid grid-cols-2 sm:grid-cols-3 gap-1 w-full h-auto p-1 rounded-lg bg-muted/50 text-xs">
          <TabsTrigger value="design" className="h-9 text-xs px-2 rounded-md font-bold">Modelos</TabsTrigger>
          <TabsTrigger value="dados" className="h-9 text-xs px-2 rounded-md font-bold">Geral</TabsTrigger>
          <TabsTrigger value="voos" className="h-9 text-xs px-2 rounded-md font-bold">Voos</TabsTrigger>
          <TabsTrigger value="hotel" className="h-9 text-xs px-2 rounded-md font-bold">Hotel</TabsTrigger>
          <TabsTrigger value="rodoviario" className="h-9 text-xs px-2 rounded-md font-bold">Rodoviário</TabsTrigger>
          <TabsTrigger value="roteiro" className="h-9 text-xs px-2 rounded-md font-bold">Roteiro</TabsTrigger>
          <TabsTrigger value="servicos" className="h-9 text-xs px-2 rounded-md font-bold">Serviços</TabsTrigger>
          <TabsTrigger value="inclusoes" className="h-9 text-xs px-2 rounded-md font-bold">Inclusões</TabsTrigger>
          <TabsTrigger value="preco" className="h-9 text-xs px-2 rounded-md font-bold">Preço</TabsTrigger>
        </TabsList>

        {/* ── ABA 0: MODELOS & DESIGN DO CANVAS ── */}
        <TabsContent value="design" className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <LayoutTemplate className="size-4 text-primary" />
                <span>Modelo Visual da Proposta</span>
              </Label>
              <span className="text-2xs font-mono text-muted-foreground uppercase">{proposal.template_theme || "editorial-flat"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATE_CATALOG.map((tpl) => {
                const TplIcon = tpl.icon;
                const isSelected = (proposal.template_theme || "editorial-flat") === tpl.id;
                const tplPalette = TEMPLATE_DEFAULT_PALETTES[tpl.id as ProposalTemplateCanonicalId] || TEMPLATE_DEFAULT_PALETTES["editorial-flat"];
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onChange({ template_theme: tpl.id })}
                    className={cn(
                      "p-3 rounded-lg text-left transition-colors cursor-pointer border flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                        : "border-border/60 bg-card hover:bg-muted/40 hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                        <TplIcon className={cn("size-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span>{tpl.label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className="size-3.5 rounded-full border border-border/80 inline-block"
                          style={buildColorSwatchStyle(tplPalette.canvasBg)}
                          title={`Fundo padrão: ${tplPalette.canvasBg}`}
                        />
                        <span
                          className="size-3.5 rounded-full border border-border/80 inline-block"
                          style={buildColorSwatchStyle(tplPalette.brandColor)}
                          title={`Destaque padrão: ${tplPalette.brandColor}`}
                        />
                        {isSelected && <Check className="size-3.5 text-primary" />}
                      </div>
                    </div>
                    <p className="text-2xs text-muted-foreground leading-snug">{tpl.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── COR DE FUNDO DO CANVAS (QUADRO SÓLIDO EDITÁVEL) ── */}
          <div className="space-y-3 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Palette className="size-4 text-primary" />
                <span>Cor de Fundo do Canvas</span>
              </Label>
              {studioCustomFields.canvas_bg_color ? (
                <button
                  type="button"
                  onClick={() => updateStudioCustomField("canvas_bg_color", null)}
                  className="text-2xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                >
                  <RotateCcw className="size-3" />
                  <span>Padrão ({defaultTemplatePalette.canvasBg})</span>
                </button>
              ) : (
                <span className="text-2xs font-mono text-muted-foreground uppercase">
                  Padrão {activeCanvasTheme.canvasBg}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="relative flex items-center justify-center size-9 rounded-lg border border-border cursor-pointer shrink-0 overflow-hidden">
                <input
                  type="color"
                  aria-label="Selecionar cor de fundo do canvas"
                  value={activeCanvasTheme.canvasBg}
                  onChange={(e) => updateStudioCustomField("canvas_bg_color", e.target.value)}
                  className="sr-only"
                />
                <span
                  className="w-full h-full block"
                  style={buildColorSwatchStyle(activeCanvasTheme.canvasBg)}
                />
              </label>
              <Input
                value={studioCustomFields.canvas_bg_color || activeCanvasTheme.canvasBg}
                onChange={(e) => updateStudioCustomField("canvas_bg_color", e.target.value)}
                placeholder={defaultTemplatePalette.canvasBg}
                className="h-9 text-xs font-mono uppercase rounded-lg flex-1"
              />
              <span className="px-2 py-1 rounded bg-muted text-2xs font-semibold text-muted-foreground shrink-0">
                {activeCanvasTheme.tone === "dark" ? "Modo Escuro" : "Modo Claro"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CANVAS_BG_PRESETS.map((preset) => {
                const isSelected = activeCanvasTheme.canvasBg.toUpperCase() === preset.color.toUpperCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateStudioCustomField("canvas_bg_color", preset.color)}
                    className={cn(
                      "p-2 rounded-lg border text-left transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border/60 bg-card hover:bg-muted/40"
                    )}
                  >
                    <span
                      className="size-4 rounded-full border border-border/80 shrink-0"
                      style={buildColorSwatchStyle(preset.color)}
                    />
                    <span className="text-2xs font-medium text-foreground truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── COR PRINCIPAL DA MARCA / DESTAQUES ── */}
          <div className="space-y-3 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                <span>Cor de Destaque da Marca</span>
              </Label>
              {studioCustomFields.canvas_brand_color ? (
                <button
                  type="button"
                  onClick={() => updateStudioCustomField("canvas_brand_color", null)}
                  className="text-2xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                >
                  <RotateCcw className="size-3" />
                  <span>Padrão ({defaultTemplatePalette.brandColor})</span>
                </button>
              ) : (
                <span className="text-2xs font-mono text-muted-foreground uppercase">
                  Padrão {activeCanvasTheme.brandColor}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="relative flex items-center justify-center size-9 rounded-lg border border-border cursor-pointer shrink-0 overflow-hidden">
                <input
                  type="color"
                  aria-label="Selecionar cor principal da marca"
                  value={activeCanvasTheme.brandColor}
                  onChange={(e) => updateStudioCustomField("canvas_brand_color", e.target.value)}
                  className="sr-only"
                />
                <span
                  className="w-full h-full block"
                  style={buildColorSwatchStyle(activeCanvasTheme.brandColor)}
                />
              </label>
              <Input
                value={studioCustomFields.canvas_brand_color || activeCanvasTheme.brandColor}
                onChange={(e) => updateStudioCustomField("canvas_brand_color", e.target.value)}
                placeholder={defaultTemplatePalette.brandColor}
                className="h-9 text-xs font-mono uppercase rounded-lg flex-1"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BRAND_COLOR_PRESETS.map((preset) => {
                const isSelected = activeCanvasTheme.brandColor.toUpperCase() === preset.color.toUpperCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateStudioCustomField("canvas_brand_color", preset.color)}
                    className={cn(
                      "p-2 rounded-lg border text-left transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border/60 bg-card hover:bg-muted/40"
                    )}
                  >
                    <span
                      className="size-4 rounded-full border border-border/80 shrink-0"
                      style={buildColorSwatchStyle(preset.color)}
                    />
                    <span className="text-2xs font-medium text-foreground truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── TIPOGRAFIA DO DOCUMENTO ── */}
          <div className="space-y-2 pt-3 border-t border-border/40">
            <Label className="text-xs font-bold text-foreground flex items-center gap-2">
              <Type className="size-4 text-primary" />
              <span>Tipografia Editorial</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {FONT_PRESET_OPTIONS.map((fontOpt) => {
                const isSelected = activeCanvasTheme.fontPreset === fontOpt.id;
                return (
                  <button
                    key={fontOpt.id}
                    type="button"
                    onClick={() => updateStudioCustomField("canvas_font_preset", fontOpt.id)}
                    className={cn(
                      "p-2 rounded-lg border text-left transition-colors cursor-pointer flex flex-col gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border/60 bg-card hover:bg-muted/40"
                    )}
                  >
                    <span className="text-xs font-bold text-foreground">{fontOpt.label}</span>
                    <span className="text-2xs text-muted-foreground leading-tight">{fontOpt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── FORMATO DO CANVAS & EXPORTAÇÃO ── */}
          <div className="space-y-2 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Monitor className="size-4 text-primary" />
                <span>Formato do Canvas & Exportação</span>
              </Label>
              <span className="text-2xs font-mono text-muted-foreground uppercase">{proposal.canvas_format || "a4-portrait"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FORMAT_CATALOG.map((fmt) => {
                const isSelected = (proposal.canvas_format || "a4-portrait") === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => onChange({ canvas_format: fmt.id })}
                    className={cn(
                      "p-3 rounded-lg text-left transition-colors cursor-pointer border flex flex-col gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                        : "border-border/60 bg-card hover:bg-muted/40 hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                        <span className="px-1 py-1 rounded bg-muted text-2xs font-mono font-bold text-primary">{fmt.icon}</span>
                        <span>{fmt.label}</span>
                      </div>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </div>
                    <p className="text-2xs text-muted-foreground leading-snug">{fmt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── SEÇÕES VISÍVEIS NO DOCUMENTO ── */}
          <div className="space-y-2 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Eye className="size-4 text-primary" />
                <span>Seções Visíveis no Canvas</span>
              </Label>
              <span className="text-2xs text-muted-foreground">
                {PROPOSAL_SECTION_CATALOG.length - activeCanvasTheme.hiddenSections.size}/{PROPOSAL_SECTION_CATALOG.length} ativas
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PROPOSAL_SECTION_CATALOG.map((sec) => {
                const isHidden = activeCanvasTheme.hiddenSections.has(sec.key);
                return (
                  <button
                    key={sec.key}
                    type="button"
                    onClick={() => toggleProposalSection(sec.key)}
                    className={cn(
                      "h-9 min-h-11 sm:min-h-0 px-3 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      !isHidden
                        ? "border-primary/40 bg-primary/5 text-foreground font-semibold"
                        : "border-border/50 bg-muted/30 text-muted-foreground line-through"
                    )}
                  >
                    <span className="truncate">{sec.label}</span>
                    {isHidden ? <EyeOff className="size-3.5 shrink-0 text-muted-foreground" /> : <Eye className="size-3.5 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dados" className="space-y-3">
 <div className="space-y-1">
 <Label className="text-2xs font-bold">Título da Proposta *</Label>
 <Input
 value={proposal.title}
 onChange={(e) => onChange({ title: e.target.value })}
 placeholder="Ex: Férias em Porto de Galinhas"
 className="h-9 text-xs rounded-lg"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-2xs font-bold">Destino Principal *</Label>
 <Input
 value={proposal.destination_city}
 onChange={(e) => onChange({ destination_city: e.target.value })}
 placeholder="Ex: Porto de Galinhas, PE"
 className="h-9 text-xs rounded-lg"
 />
 {/* Chips Rápidos de Destinos Canônicos */}
 <div className="flex flex-wrap gap-1 pt-1">
 {CANONICAL_DESTINATIONS.slice(0, 5).map((d) => (
 <button
 key={d.id}
 type="button"
 onClick={() => onChange({ destination_city: `${d.city}, ${d.state}` })}
 className="px-2 py-1 rounded-md bg-muted/60 hover:bg-primary/10 text-2xs font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 {d.city}
 </button>
 ))}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <Label className="text-2xs font-bold">Nome do Passageiro *</Label>
 <Input
 value={proposal.client_name}
 onChange={(e) => onChange({ client_name: e.target.value })}
 placeholder="Nome do passageiro"
 className="h-9 text-xs rounded-lg"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-2xs font-bold">WhatsApp *</Label>
 <Input
 value={proposal.client_whatsapp}
 onChange={(e) => onChange({ client_whatsapp: e.target.value })}
 placeholder="(49) 99999-9999"
 className="h-9 text-xs rounded-lg"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <Label className="text-2xs font-bold">Data de Ida</Label>
 <Input
 type="date"
 value={proposal.travel_start_date || ""}
 onChange={(e) => onChange({ travel_start_date: e.target.value })}
 className="h-9 text-xs rounded-lg"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-2xs font-bold">Data de Retorno</Label>
 <Input
 type="date"
 value={proposal.travel_end_date || ""}
 onChange={(e) => onChange({ travel_end_date: e.target.value })}
 className="h-9 text-xs rounded-lg"
 />
 </div>
 </div>

 {/* ── Distribuição de Quartos & Passageiros (Rooming List) ── */}
 <div className="p-4 rounded-lg border border-border/70 bg-card space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold text-foreground">
 <BedDouble className="size-3.5 text-primary" />
 <span>Quartos e Hóspedes</span>
 </div>
 <span className="text-2xs text-muted-foreground font-medium">
 {currentRooms.length} {currentRooms.length === 1 ? "quarto" : "quartos"} • {totalAdults} adt{totalChildren > 0 ? `, ${totalChildren} chd` : ""}
 </span>
 </div>

 <div className="space-y-3">
 {currentRooms.map((room) => (
 <div
 key={room.id}
 className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-2"
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-2xs font-bold text-foreground">Quarto {room.roomNumber}</span>
 <select
 value={room.roomType || "Casal"}
 onChange={(e) => handleUpdateRoomType(room.id, e.target.value)}
 className="h-6 rounded border border-border/60 bg-background px-2 text-2xs text-muted-foreground"
 >
 <option value="Casal">Casal</option>
 <option value="Duplo Solteiro">2 Solteiro</option>
 <option value="Casal + Solteiro">Casal + Solteiro</option>
 <option value="Triplo Solteiro">3 Solteiro</option>
 <option value="Família (Suíte)">Família</option>
 </select>
 </div>

 {currentRooms.length > 1 && (
 <button
 type="button"
 onClick={() => handleRemoveRoom(room.id)}
 className="text-2xs text-muted-foreground hover:text-destructive flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Trash className="size-2.5" />
 <span>Remover</span>
 </button>
 )}
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="flex items-center justify-between p-2 rounded bg-background border border-border/40">
 <span className="text-2xs text-muted-foreground font-semibold">Adultos</span>
 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateRoomAdults(room.id, -1)}
 disabled={room.adults <= 1}
 className="size-5 rounded min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
 >
 <Minus className="size-2.5" />
 </Button>
 <span className="text-xs font-bold min-w-3 text-center">{room.adults}</span>
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateRoomAdults(room.id, 1)}
 disabled={room.adults >= 6}
 className="size-5 rounded min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
 >
 <Plus className="size-2.5" />
 </Button>
 </div>
 </div>

 <div className="flex items-center justify-between p-2 rounded bg-background border border-border/40">
 <span className="text-2xs text-muted-foreground font-semibold">Crianças</span>
 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateRoomChildren(room.id, -1)}
 disabled={room.children <= 0}
 className="size-5 rounded min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
 >
 <Minus className="size-2.5" />
 </Button>
 <span className="text-xs font-bold min-w-3 text-center">{room.children}</span>
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateRoomChildren(room.id, 1)}
 disabled={room.children >= 4}
 className="size-5 rounded min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
 >
 <Plus className="size-2.5" />
 </Button>
 </div>
 </div>
 </div>

 {room.children > 0 && (
 <div className="pt-2 border-t border-border/30 space-y-1">
 <span className="text-3xs font-semibold text-muted-foreground">Idade das crianças:</span>
 <div className="flex flex-wrap gap-2">
 {Array.from({ length: room.children }).map((_, cIdx) => (
 <div key={cIdx} className="flex items-center gap-1">
 <span className="text-3xs text-muted-foreground">C{cIdx + 1}:</span>
 <select
 value={room.childrenAges?.[cIdx] ?? 5}
 onChange={(e) =>
 handleUpdateChildAge(room.id, cIdx, Number(e.target.value))
 }
 className="h-6 rounded border border-border/60 bg-background px-1 text-2xs"
 >
 {Array.from({ length: 12 }).map((_, age) => (
 <option key={age} value={age}>
 {age === 0 ? "Bebê" : `${age}a`}
 </option>
 ))}
 </select>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 ))}

 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleAddRoom}
 className="w-full h-7 rounded-lg text-2xs font-medium border-dashed border-border/70 hover:bg-muted/40 gap-1 text-muted-foreground hover:text-foreground cursor-pointer min-h-11 sm:min-h-0"
 >
 <Plus className="size-3" />
 <span>Adicionar Quarto</span>
 </Button>
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-2xs font-bold">Foto de Capa da Proposta (16:9)</Label>
 <ImageUpload
 value={proposal.cover_image_url || ""}
 onChange={(url) => onChange({ cover_image_url: url })}
 onRemove={() => onChange({ cover_image_url: "" })}
 aspectPreset="widescreen"
 bucket="cms-media"
 helperText="Capa panorâmica 16:9 para a proposta do cliente"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">Subtítulo / Chamada Comercial</Label>
 <Input
   value={proposal.subtitle || ""}
   onChange={(e) => onChange({ subtitle: e.target.value })}
   placeholder="Ex: Roteiro Exclusivo 7 Dias • All Inclusive"
   className="h-11 text-xs rounded-lg mb-2"
 />

 {(isLoadingCrm || crmCustomers.length > 0) && (
   <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2 mb-2">
     <Label className="text-xs font-bold text-primary flex items-center gap-2">
       <Users className="size-3.5" />
       <span>Importar Cliente do CRM da Agência</span>
     </Label>
     {isLoadingCrm ? (
       <div className="h-9 rounded-lg bg-muted/40 animate-pulse motion-reduce:transition-none" />
     ) : (
       <select
         defaultValue=""
         onChange={(e) => {
           const cust = crmCustomers.find((c: any) => c.id === e.target.value);
           if (cust) {
             onChange({
               client_name: cust.full_name || cust.name || proposal.client_name,
               client_whatsapp: cust.phone || cust.whatsapp || proposal.client_whatsapp,
               client_email: cust.email || proposal.client_email,
             });
             toast.success(`Dados de ${cust.full_name || cust.name} vinculados à proposta!`);
           }
           e.target.value = "";
         }}
         className="w-full h-11 text-xs rounded-lg bg-background border border-border px-2 text-foreground"
       >
         <option value="" disabled>Buscar cliente cadastrado no CRM...</option>
         {crmCustomers.slice(0, 50).map((c: any) => (
           <option key={c.id} value={c.id}>
             {c.full_name || c.name} {c.phone ? `(${c.phone})` : ""}
           </option>
         ))}
       </select>
     )}
   </div>
 )}

 <div className="space-y-1 mb-2">
   <Label className="text-xs font-bold">E-mail do Passageiro</Label>
   <Input
     type="email"
     value={proposal.client_email || ""}
     onChange={(e) => onChange({ client_email: e.target.value })}
     placeholder="cliente@email.com"
     className="h-11 text-xs rounded-lg"
   />
 </div>

 <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-3 mb-2">
   <div className="flex items-center gap-2 text-xs font-bold text-foreground">
     <Briefcase className="size-3.5 text-primary" />
     <span>Assinatura do Consultor & Agência</span>
   </div>
   <div className="space-y-2">
     <div className="space-y-1">
       <Label className="text-2xs font-semibold text-muted-foreground">Nome da Agência</Label>
       <Input
         value={String(studioCustomFields.agency_name || proposal.agency_name || "")}
         onChange={(e) => {
           updateStudioCustomField("agency_name", e.target.value);
           onChange({ agency_name: e.target.value });
         }}
         placeholder="Ex: Excelência Tour"
         className="h-9 text-xs rounded-lg bg-background"
       />
     </div>
     <div className="grid grid-cols-2 gap-2">
       <div className="space-y-1">
         <Label className="text-2xs font-semibold text-muted-foreground">Consultor Responsável</Label>
         <Input
           value={String(studioCustomFields.agent_name || (proposal as any).agent_name || "")}
           onChange={(e) => updateStudioCustomField("agent_name", e.target.value)}
           placeholder="Ex: Consultor Especialista"
           className="h-9 text-xs rounded-lg bg-background"
         />
       </div>
       <div className="space-y-1">
         <Label className="text-2xs font-semibold text-muted-foreground">WhatsApp da Agência</Label>
         <Input
           value={String(studioCustomFields.agent_whatsapp || (proposal as any).agent_whatsapp || "")}
           onChange={(e) => updateStudioCustomField("agent_whatsapp", e.target.value)}
           placeholder="(49) 99999-9999"
           className="h-9 text-xs rounded-lg bg-background"
         />
       </div>
     </div>
   </div>
 </div>

 <div className="space-y-2">
   <div className="flex items-center justify-between gap-2">
     <Label className="text-xs font-bold">Validade da Proposta</Label>
     <div className="flex items-center gap-1">
       {[7, 15, 30].map((days) => (
         <button
           key={days}
           type="button"
           onClick={() => applyValidityDaysOffset(days)}
           className="px-2 py-1 rounded bg-muted hover:bg-primary/10 text-2xs font-mono font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
         >
           +{days}d
         </button>
       ))}
     </div>
   </div>
   <Input
     value={proposal.valid_until || ""}
     onChange={(e) => onChange({ valid_until: e.target.value })}
     placeholder="Ex: Até 24h ou 15/10/2026"
     className="h-9 text-xs rounded-lg"
   />
 </div>
 </div>
 </TabsContent>

 {/* ── ABA 2: VOOS & MALHA AÉREA ── */}
 <TabsContent value="voos" className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-2xs font-bold text-foreground">Trechos de Voo</span>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={handleAddFlight}
 className="h-8 text-xs rounded-lg gap-1 min-h-11 sm:min-h-0"
 >
 <Plus className="size-3.5" /> Adicionar Trecho
 </Button>
 </div>

 {proposal.flights.map((f, idx) => (
 <div key={f.id} className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2">
 <div className="flex items-center justify-between text-xs font-bold">
 <span>Trecho #{idx + 1} ({f.type === "outbound" ? "Ida" : "Volta"})</span>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleRemoveFlight(f.id)}
 className="h-7 size-7 p-0 text-destructive min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
 >
 <Trash className="size-3.5" />
 </Button>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <Input
 placeholder="Cia (Ex: GOL, LATAM)"
 value={f.airline_name || f.airline || ""}
 onChange={(e) => { handleFlightChange(f.id, "airline_name", e.target.value); handleFlightChange(f.id, "airline", e.target.value); }}
 className="h-8 text-xs rounded-lg"
 />
 <Input
 placeholder="Nº Voo (Ex: LA3241)"
 value={f.flight_number || ""}
 onChange={(e) => handleFlightChange(f.id, "flight_number", e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="text-3xs font-mono uppercase text-muted-foreground">Origem (IATA / Hora)</label>
 <div className="flex gap-1 mt-1">
 <Input
 placeholder="XAP"
 value={f.origin_iata || f.origin || ""}
 onChange={(e) => { handleFlightChange(f.id, "origin_iata", e.target.value.toUpperCase()); handleFlightChange(f.id, "origin", e.target.value.toUpperCase()); }}
 className="h-8 text-xs rounded-lg uppercase font-mono w-16"
 />
 <Input
 placeholder="08:30"
 value={f.departure_time}
 onChange={(e) => handleFlightChange(f.id, "departure_time", e.target.value)}
 className="h-8 text-xs rounded-lg flex-1"
 />
 </div>
 </div>

 <div>
 <label className="text-3xs font-mono uppercase text-muted-foreground">Destino (IATA / Hora)</label>
 <div className="flex gap-1 mt-1">
 <Input
 placeholder="GRU"
 value={f.destination_iata || f.destination || ""}
 onChange={(e) => { handleFlightChange(f.id, "destination_iata", e.target.value.toUpperCase()); handleFlightChange(f.id, "destination", e.target.value.toUpperCase()); }}
 className="h-8 text-xs rounded-lg uppercase font-mono w-16"
 />
 <Input
 placeholder="10:00"
 value={f.arrival_time}
 onChange={(e) => handleFlightChange(f.id, "arrival_time", e.target.value)}
 className="h-8 text-xs rounded-lg flex-1"
 />
 </div>
 </div>
 </div>

 <Input
 placeholder="Bagagem (Ex: 1x 10kg + Mochila)"
 value={typeof f.baggage_included === "boolean" ? (f.baggage_included ? "Inclusa" : "Não inclusa") : (f.baggage_included || "")}
 onChange={(e) => handleFlightChange(f.id, "baggage_included", e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 <div className="grid grid-cols-2 gap-2">
   <Input
     type="date"
     value={f.departure_date || (f as any).date || ""}
     onChange={(e) => { handleFlightChange(f.id, "departure_date", e.target.value); handleFlightChange(f.id, "date" as any, e.target.value); }}
     className="h-8 text-xs rounded-lg"
   />
   <select
     value={f.stops_count ?? f.stops ?? 0}
     onChange={(e) => handleFlightChange(f.id, "stops_count", Number(e.target.value))}
     className="h-8 text-xs rounded-lg bg-background border border-border px-2"
   >
     <option value={0}>Voo Direto</option>
     <option value={1}>1 Parada / Conexão</option>
     <option value={2}>2+ Paradas</option>
   </select>
 </div>
 </div>
 ))}
 </TabsContent>

 {/* ── ABA 3: HOTELARIA & HOSPEDAGENS ── */}
 <TabsContent value="hotel" className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-2xs font-bold text-foreground">Hotéis e Pousadas</span>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={handleAddHotel}
 className="h-8 text-xs rounded-lg gap-1 min-h-11 sm:min-h-0"
 >
 <Plus className="size-3.5" /> Adicionar Manual
 </Button>
 </div>

 {/* Importar do Banco de Hotéis */}
 {hotelsBank && hotelsBank.length > 0 && (
 <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
 <div className="flex items-center gap-2 text-primary text-2xs font-bold">
 <Building2 className="size-3.5" />
 <span>Importar do Banco de Hotéis</span>
 </div>
 <select
 onChange={(e) => {
 if (e.target.value) {
 handleImportHotelFromBank(e.target.value);
 e.target.value = "";
 }
 }}
 defaultValue=""
 className="w-full h-8 text-xs rounded-lg bg-background border border-border px-2 text-foreground"
 >
 <option value="" disabled>Escolha um hotel/resort cadastrado...</option>
 {hotelsBank.map((hb: any) => (
 <option key={hb.id} value={hb.id}>
 {hb.name} ({hb.stars} - {hb.regime_options?.[0] || "Padrão"})
 </option>
 ))}
 </select>
 </div>
 )}

 {/* Presets de Resorts Famosos (1-Toque) */}
 <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-2">
 <span className="text-2xs font-bold text-foreground flex items-center gap-1">
 <Zap className="size-3 text-warning-strong" />
 <span>Presets de Resorts Famosos:</span>
 </span>
 <div className="flex flex-wrap gap-1">
 {FAMOUS_HOTEL_PRESETS.slice(0, 4).map((p) => (
 <button
 key={p.id}
 type="button"
 onClick={() => handleImportPresetHotel(p)}
 className="px-2 py-1 rounded-md bg-background border border-border/60 hover:border-primary/50 text-2xs font-semibold text-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 {p.name.split(" ")[0]}
 </button>
 ))}
 </div>
 </div>

 {proposal.hotels.map((h) => {
 const matchedBankHotel = hotelsBank.find((hb: any) =>
 hb.name?.toLowerCase().trim() === h.hotel_name?.toLowerCase().trim() ||
 h.hotel_name?.toLowerCase().includes(hb.name?.toLowerCase())
 );

 return (
 <div key={h.id} className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2">
 <div className="flex items-center justify-between text-xs font-bold">
 <span>{h.hotel_name || "Novo Hotel"}</span>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleRemoveHotel(h.id)}
 className="h-7 size-7 p-0 text-destructive min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
 >
 <Trash className="size-3.5" />
 </Button>
 </div>

 <Input
 placeholder="Nome do Hotel / Resort"
 value={h.hotel_name}
 onChange={(e) => handleHotelChange(h.id, "hotel_name", e.target.value)}
 className="h-8 text-xs rounded-lg"
 />

 <div className="grid grid-cols-2 gap-2">
 <Input
 placeholder="Quarto (Ex: Vista Mar)"
 value={h.room_type}
 onChange={(e) => handleHotelChange(h.id, "room_type", e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 <select
 value={h.board_basis}
 onChange={(e) => handleHotelChange(h.id, "board_basis", e.target.value)}
 className="h-8 text-xs rounded-lg bg-background border border-border px-2"
 >
 <option value="all_inclusive">All Inclusive</option>
 <option value="full_board">Pensão Completa</option>
 <option value="half_board">Meia Pensão</option>
 <option value="breakfast">Café da Manhã</option>
 <option value="none">Sem Alimentação</option>
 </select>
 </div>
 <div className="grid grid-cols-2 gap-2">
   <div>
     <label className="text-3xs font-mono uppercase text-muted-foreground">Check-in</label>
     <Input
       type="date"
       value={h.checkin_date || h.check_in || ""}
       onChange={(e) => handleHotelChange(h.id, "checkin_date", e.target.value)}
       className="h-8 text-xs rounded-lg mt-1"
     />
   </div>
   <div>
     <label className="text-3xs font-mono uppercase text-muted-foreground">Check-out</label>
     <Input
       type="date"
       value={h.checkout_date || h.check_out || ""}
       onChange={(e) => handleHotelChange(h.id, "checkout_date", e.target.value)}
       className="h-8 text-xs rounded-lg mt-1"
     />
   </div>
 </div>

 {/* Seleção de Quartos Cadastrados no Banco */}
 {matchedBankHotel && matchedBankHotel.room_categories && matchedBankHotel.room_categories.length > 0 && (
 <div className="p-2 rounded-lg bg-background/80 border border-border/60 space-y-1">
 <span className="text-2xs font-bold text-foreground flex items-center gap-1">
 <BedDouble className="size-3 text-primary" />
 <span>Quartos do Resort:</span>
 </span>
 <div className="flex flex-wrap gap-1">
 {matchedBankHotel.room_categories.map((rc: any) => (
 <button
 key={rc.id}
 type="button"
 onClick={() => handleHotelChange(h.id, "room_type", rc.name)}
 className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", 
 "px-2 py-1 rounded text-2xs border transition-colors cursor-pointer",
 h.room_type === rc.name
 ? "bg-primary/10 text-primary border-primary font-bold"
 : "bg-muted/50 text-muted-foreground border-border/50 hover:text-foreground"
 )}
 >
 {rc.name}
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 );
 })}
 </TabsContent>

 {/* ── ABA 4: ROTEIRO DIA A DIA ── */}
 
        {/* ── ABA 3.5: RODOVIÁRIO & TRANSPORTE TERRESTRE ── */}
        <TabsContent value="rodoviario" className="space-y-4">
          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Bus className="size-4 text-primary" />
                <span>Transporte Rodoviário e Ônibus</span>
              </span>
              <span className="text-2xs font-semibold px-2 py-1 rounded-full bg-muted border border-border text-primary">
                Multimodal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <Label className="text-2xs font-bold">Tipo de Frota / Veículo</Label>
                <select
                  value={proposal.transfers?.[0]?.type || "Ônibus Leito DD"}
                  onChange={(e) => {
                    const current = proposal.transfers?.[0] || { id: "bus-main", route: "", date: "", included: true };
                    const next = [{ ...current, type: e.target.value }];
                    onChange({ transfers: next });
                  }}
                  className="w-full h-9 rounded-lg bg-background border border-border text-xs px-2"
                >
                  <option value="Ônibus Leito DD">Ônibus Leito DD (Double Decker)</option>
                  <option value="Ônibus Semi-Leito Executivo">Ônibus Semi-Leito Executivo</option>
                  <option value="Micro-ônibus Executivo">Micro-ônibus Executivo</option>
                  <option value="Van Executiva Luxo">Van Executiva Luxo</option>
                  <option value="Transfer Privativo In/Out">Transfer Privativo In/Out</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-2xs font-bold">Empresa de Transporte / Linha</Label>
                <Input
                  placeholder="Ex: Expresso São Miguel / Frota Própria"
                  value={proposal.transfers?.[0]?.route || ""}
                  onChange={(e) => {
                    const current = proposal.transfers?.[0] || { id: "bus-main", type: "Ônibus Leito DD", date: "", included: true };
                    const next = [{ ...current, route: e.target.value }];
                    onChange({ transfers: next });
                  }}
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <Label className="text-2xs font-bold">Ponto & Cidade de Embarque</Label>
                <Input
                  placeholder="Ex: Chapecó - Posto Bertaso (20:00)"
                  value={proposal.transfers?.[0]?.pickup_time || ""}
                  onChange={(e) => {
                    const current = proposal.transfers?.[0] || { id: "bus-main", type: "Ônibus Leito DD", route: "", date: "", included: true };
                    const next = [{ ...current, pickup_time: e.target.value }];
                    onChange({ transfers: next });
                  }}
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs font-bold">Previsão de Desembarque / Chegada</Label>
                <Input
                  placeholder="Ex: Curitiba - Hotel Bourbon (06:00)"
                  value={proposal.transfers?.[0]?.dropoff_time || ""}
                  onChange={(e) => {
                    const current = proposal.transfers?.[0] || { id: "bus-main", type: "Ônibus Leito DD", route: "", date: "", included: true };
                    const next = [{ ...current, dropoff_time: e.target.value }];
                    onChange({ transfers: next });
                  }}
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <Label className="text-2xs font-bold">Pontos de Embarque no Roteiro (Cidades Intermediárias)</Label>
              <Textarea
                placeholder="Ex: São Miguel do Oeste (18:30) • Maravilha (19:15) • Chapecó (20:00) • Xanxerê (21:00)"
                value={proposal.transfers?.[0]?.notes || ""}
                onChange={(e) => {
                  const current = proposal.transfers?.[0] || { id: "bus-main", type: "Ônibus Leito DD", route: "", date: "", included: true };
                  const next = [{ ...current, notes: e.target.value }];
                  onChange({ transfers: next });
                }}
                className="text-xs rounded-lg min-h-16"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roteiro" className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-2xs font-bold text-foreground">
 Dias de Viagem ({proposal.itinerary.length})
 </span>
 <div className="flex items-center gap-2">
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={handleGenerateItineraryFromDestination}
 className="h-8 text-2xs rounded-lg gap-1 text-primary hover:text-primary min-h-11 sm:min-h-0"
 title="Sugerir Roteiro"
 >
 <Calendar className="size-3.5" /> Sugerir Dias
 </Button>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={handleAddItineraryDay}
 className="h-8 text-xs rounded-lg gap-1 min-h-11 sm:min-h-0"
 >
 <Plus className="size-3.5" /> Dia
 </Button>
 </div>
 </div>

 {proposal.itinerary.length === 0 ? (
 <div className="p-4 text-center rounded-lg bg-muted/30 border border-dashed border-border/60 space-y-2">
 <Calendar className="size-6 text-muted-foreground mx-auto" />
 <p className="text-xs text-muted-foreground">Nenhum dia cadastrado no roteiro.</p>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={handleGenerateItineraryFromDestination}
 className="text-xs rounded-lg font-bold"
 >
 Gerar Roteiro Sugerido pelo Destino
 </Button>
 </div>
 ) : (
 proposal.itinerary.map((day, idx) => (
 <div key={day.id} className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2">
 <div className="flex items-center justify-between text-xs font-bold">
 <span className="text-primary font-mono text-2xs">
 Dia {day.day_number || idx + 1}
 </span>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleRemoveItineraryDay(day.id)}
 className="h-7 size-7 p-0 text-destructive min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
 >
 <Trash className="size-3.5" />
 </Button>
 </div>

 <Input
 placeholder="Título da Atividade (Ex: Tour Piscinas Naturais)"
 value={day.title}
 onChange={(e) => handleItineraryChange(day.id, "title", e.target.value)}
 className="h-8 text-xs rounded-lg font-semibold"
 />

 <Textarea
 placeholder="Descrição da atividade, locais de parada, dicas de fotos..."
 value={day.description}
 onChange={(e) => handleItineraryChange(day.id, "description", e.target.value)}
 className="h-16 text-xs rounded-lg resize-none"
 />
 <div className="grid grid-cols-2 gap-2">
   <Input
     placeholder="Local / Cidade (Ex: Maragogi)"
     value={day.location || (day as any).city || ""}
     onChange={(e) => handleItineraryChange(day.id, "location", e.target.value)}
     className="h-8 text-xs rounded-lg"
   />
   <Input
     placeholder="Refeições (Ex: Café, Almoço)"
     value={(day.included_meals || (day as any).meals || []).join(", ")}
     onChange={(e) =>
       handleItineraryChange(
         day.id,
         "included_meals",
         e.target.value
           .split(",")
           .map((m) => m.trim())
           .filter(Boolean),
       )
     }
     className="h-8 text-xs rounded-lg"
   />
 </div>
 </div>
 ))
 )}
 </TabsContent>

 {/* ── ABA 5: SERVIÇOS TERRESTRES (TRANSFERS & PASSEIOS) ── */}
 <TabsContent value="servicos" className="space-y-4">
   {/* Bloco 1: Traslados / Receptivo */}
   <div className="space-y-2">
     <div className="flex items-center justify-between">
       <span className="text-xs font-bold text-foreground flex items-center gap-2">
         <Car className="size-3.5 text-primary" />
         <span>Traslados / Receptivo ({currentTransfers.length})</span>
       </span>
       <Button
         type="button"
         size="sm"
         variant="outline"
         onClick={handleAddTransfer}
         className="h-11 text-xs rounded-lg gap-1"
       >
         <Plus className="size-3.5" /> Traslado
       </Button>
     </div>

     {currentTransfers.length === 0 ? (
       <div className="p-3 text-center rounded-lg bg-muted/30 border border-dashed border-border/60 text-xs text-muted-foreground">
         Nenhum traslado adicionado.
       </div>
     ) : (
       currentTransfers.map((tr: any, idx: number) => (
         <div key={idx} className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2">
           <div className="flex items-center justify-between text-xs font-bold">
             <span>Traslado #{idx + 1}</span>
             <Button
               type="button"
               variant="ghost"
               size="sm"
               onClick={() => handleRemoveTransfer(idx)}
               className="h-11 size-11 p-0 text-destructive"
             >
               <Trash className="size-3.5" />
             </Button>
           </div>
           <Input
             placeholder="Descrição (Ex: Aeroporto ↔ Resort Privativo)"
             value={tr.description || tr.type || ""}
             onChange={(e) => handleUpdateTransfer(idx, { description: e.target.value })}
             className="h-11 text-xs rounded-lg"
           />
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
             <select
               value={tr.type === "shared" ? "shared" : "private"}
               onChange={(e) => handleUpdateTransfer(idx, { type: e.target.value })}
               className="h-11 text-xs rounded-lg bg-background border border-border px-2"
             >
               <option value="private">Privativo</option>
               <option value="shared">Regular / Compartilhado</option>
             </select>
             <select
               value={tr.vehicle || "Van Executiva"}
               onChange={(e) => handleUpdateTransfer(idx, { vehicle: e.target.value })}
               className="h-11 text-xs rounded-lg bg-background border border-border px-2"
             >
               <option value="Van Executiva">Van Executiva</option>
               <option value="Sedan Executivo">Sedan Executivo</option>
               <option value="SUV Blindado / Luxo">SUV Luxo</option>
               <option value="Micro-ônibus">Micro-ônibus</option>
               <option value="Ônibus Turismo">Ônibus</option>
               <option value="Lancha / Catamarã">Lancha / Barco</option>
             </select>
             <Input
               type="date"
               value={tr.date || ""}
               onChange={(e) => handleUpdateTransfer(idx, { date: e.target.value })}
               className="h-11 text-xs rounded-lg"
             />
           </div>
           <Input
             placeholder="Observações (Ex: Placa nominal no desembarque)"
             value={tr.notes || ""}
             onChange={(e) => handleUpdateTransfer(idx, { notes: e.target.value })}
             className="h-11 text-xs rounded-lg"
           />
         </div>
       ))
     )}
   </div>

   {/* Bloco 2: Passeios & Experiências */}
   <div className="space-y-2 pt-3 border-t border-border/60">
     <div className="flex items-center justify-between">
       <span className="text-xs font-bold text-foreground flex items-center gap-2">
         <Compass className="size-3.5 text-primary" />
         <span>Passeios & Experiências ({currentTours.length})</span>
       </span>
       <Button
         type="button"
         size="sm"
         variant="outline"
         onClick={handleAddTour}
         className="h-11 text-xs rounded-lg gap-1"
       >
         <Plus className="size-3.5" /> Passeio
       </Button>
     </div>

     {/* Importar de Excursões / Grupos da Agência */}
     {Array.isArray(groupTours) && groupTours.length > 0 && (
       <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
         <span className="text-xs font-bold text-primary block">
           Importar Excursão / Promoção da Agência
         </span>
         <select
           defaultValue=""
           onChange={(e) => {
             if (e.target.value) {
               handleImportGroupTour(e.target.value);
               e.target.value = "";
             }
           }}
           className="w-full h-11 text-xs rounded-lg bg-background border border-border px-2 text-foreground"
         >
           <option value="" disabled>Selecionar excursão ou pacote de grupo...</option>
           {groupTours.map((gt: any) => (
             <option key={gt.id} value={gt.id}>
               {gt.title} ({gt.destination} — {formatMoney(gt.price_cents || 0)})
             </option>
           ))}
         </select>
       </div>
     )}

     {currentTours.length === 0 ? (
       <div className="p-3 text-center rounded-lg bg-muted/30 border border-dashed border-border/60 text-xs text-muted-foreground">
         Nenhum passeio ou ingresso cadastrado.
       </div>
     ) : (
       currentTours.map((tour: any, idx: number) => (
         <div key={tour.id || idx} className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2">
           <div className="flex items-center justify-between text-xs font-bold">
             <span>Passeio #{idx + 1}</span>
             <Button
               type="button"
               variant="ghost"
               size="sm"
               onClick={() => handleRemoveTour(idx)}
               className="h-11 size-11 p-0 text-destructive"
             >
               <Trash className="size-3.5" />
             </Button>
           </div>
           <Input
             placeholder="Nome do Passeio (Ex: Catamarã Maragogi + Mergulho)"
             value={tour.title || tour.description || ""}
             onChange={(e) => handleUpdateTour(idx, { title: e.target.value })}
             className="h-11 text-xs rounded-lg"
           />
           <div className="grid grid-cols-2 gap-2">
             <Input
               placeholder="Duração / Data (Ex: Dia inteiro)"
               value={tour.duration || tour.date || ""}
               onChange={(e) => handleUpdateTour(idx, { duration: e.target.value })}
               className="h-11 text-xs rounded-lg"
             />
             <select
               value={tour.included === false ? "optional" : "included"}
               onChange={(e) =>
                 handleUpdateTour(idx, {
                   included: e.target.value === "included",
                   is_included: e.target.value === "included",
                 })
               }
               className="h-11 text-xs rounded-lg bg-background border border-border px-2"
             >
               <option value="included">Incluso no Pacote</option>
               <option value="optional">Opcional Sugerido</option>
             </select>
           </div>
         </div>
       ))
     )}
   </div>
 </TabsContent>

 {/* ── ABA 6: INCLUSÕES, EXCLUSÕES & OBSERVAÇÕES ── */}
 <TabsContent value="inclusoes" className="space-y-4">
   <Button
     type="button"
     variant="outline"
     onClick={handleSuggestIncludesExcludes}
     className="w-full h-11 rounded-lg text-xs font-bold gap-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer"
   >
     <Zap className="size-3.5" />
     <span>Sincronizar Inclusões e Exclusões com o Pacote</span>
   </Button>

   {/* O que inclui */}
   <div className="space-y-2 p-3 rounded-lg bg-card border border-border/70">
     <Label className="text-xs font-bold text-foreground flex items-center gap-2">
       <Check className="size-3.5 text-emerald-600" />
       <span>O que inclui ({currentIncludes.length})</span>
     </Label>
     <div className="flex gap-2">
       <Input
         value={newIncludeText}
         onChange={(e) => setNewIncludeText(e.target.value)}
         onKeyDown={(e) => {
           if (e.key === "Enter" && newIncludeText.trim()) {
             e.preventDefault();
             onChange({ includes: [...currentIncludes, newIncludeText.trim()] });
             setNewIncludeText("");
           }
         }}
         placeholder="Adicionar item incluso..."
         className="h-11 text-xs rounded-lg flex-1"
       />
       <Button
         type="button"
         size="sm"
         onClick={() => {
           if (!newIncludeText.trim()) return;
           onChange({ includes: [...currentIncludes, newIncludeText.trim()] });
           setNewIncludeText("");
         }}
         className="h-11 px-3 text-xs rounded-lg font-bold"
       >
         Adicionar
       </Button>
     </div>
     <div className="tab-list flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar py-1">
       {[
         "Passagens aéreas ida e volta",
         "Hospedagem com café da manhã",
         "Transfer Aeroporto / Hotel",
         "Seguro viagem completo",
         "Bagagem despachada 23kg",
         "Bagagem de mão 10kg",
         "Guia acompanhante credenciado",
         "Ônibus Leito DD Executivo",
         "Conciergerie 24h",
       ]
         .filter(
           (chip) =>
             !newIncludeText.trim() ||
             chip.toLowerCase().includes(newIncludeText.trim().toLowerCase()),
         )
         .map((chip) => {
           const isSelected = currentIncludes.includes(chip);
           return (
             <button
               key={chip}
               type="button"
               onClick={() => {
                 if (isSelected) {
                   onChange({ includes: currentIncludes.filter((i) => i !== chip) });
                 } else {
                   onChange({ includes: [...currentIncludes, chip] });
                 }
               }}
               className={cn(
                 "h-11 min-h-11 px-3 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 isSelected
                   ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 font-bold"
                   : "bg-muted/60 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-700 border border-border/50",
               )}
             >
               {isSelected ? chip : `+ ${chip}`}
             </button>
           );
         })}
     </div>
     <div className="space-y-2 pt-2">
       {currentIncludes.map((item, idx) => (
         <div
           key={idx}
           className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40 text-xs"
         >
           <span className="text-foreground flex-1 break-words">{item}</span>
           <button
             type="button"
             onClick={() =>
               onChange({ includes: currentIncludes.filter((_, i) => i !== idx) })
             }
             className="min-h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-destructive p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
           >
             <X className="size-3.5" />
           </button>
         </div>
       ))}
     </div>
   </div>

   {/* O que não inclui */}
   <div className="space-y-2 p-3 rounded-lg bg-card border border-border/70">
     <Label className="text-xs font-bold text-foreground flex items-center gap-2">
       <X className="size-3.5 text-destructive" />
       <span>O que não inclui ({currentExcludes.length})</span>
     </Label>
     <div className="flex gap-2">
       <Input
         value={newExcludeText}
         onChange={(e) => setNewExcludeText(e.target.value)}
         onKeyDown={(e) => {
           if (e.key === "Enter" && newExcludeText.trim()) {
             e.preventDefault();
             onChange({ excludes: [...currentExcludes, newExcludeText.trim()] });
             setNewExcludeText("");
           }
         }}
         placeholder="Adicionar item não incluso..."
         className="h-11 text-xs rounded-lg flex-1"
       />
       <Button
         type="button"
         size="sm"
         variant="outline"
         onClick={() => {
           if (!newExcludeText.trim()) return;
           onChange({ excludes: [...currentExcludes, newExcludeText.trim()] });
           setNewExcludeText("");
         }}
         className="h-11 px-3 text-xs rounded-lg font-bold"
       >
         Adicionar
       </Button>
     </div>
     <div className="tab-list flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar py-1">
       {[
         "Despesas de caráter pessoal",
         "Refeições e bebidas não mencionadas",
         "Ingressos em atrações opcionais",
         "Taxas turísticas municipais no check-in",
         "Bagagem despachada extra",
         "Passeios opcionais no destino",
       ]
         .filter(
           (chip) =>
             !newExcludeText.trim() ||
             chip.toLowerCase().includes(newExcludeText.trim().toLowerCase()),
         )
         .map((chip) => {
           const isSelected = currentExcludes.includes(chip);
           return (
             <button
               key={chip}
               type="button"
               onClick={() => {
                 if (isSelected) {
                   onChange({ excludes: currentExcludes.filter((i) => i !== chip) });
                 } else {
                   onChange({ excludes: [...currentExcludes, chip] });
                 }
               }}
               className={cn(
                 "h-11 min-h-11 px-3 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 isSelected
                   ? "bg-destructive/15 text-destructive border border-destructive/30 font-bold"
                   : "bg-muted/60 hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border/50",
               )}
             >
               {isSelected ? chip : `+ ${chip}`}
             </button>
           );
         })}
     </div>
     <div className="space-y-2 pt-2">
       {currentExcludes.map((item, idx) => (
         <div
           key={idx}
           className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40 text-xs"
         >
           <span className="text-muted-foreground flex-1 break-words">{item}</span>
           <button
             type="button"
             onClick={() =>
               onChange({ excludes: currentExcludes.filter((_, i) => i !== idx) })
             }
             className="min-h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-destructive p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
           >
             <X className="size-3.5" />
           </button>
         </div>
       ))}
     </div>
   </div>

   {/* Observações & Termos */}
   <div className="space-y-2">
     <Label className="text-xs font-bold">Observações & Condições Gerais</Label>
     <Textarea
       value={proposal.special_notes || ""}
       onChange={(e) => onChange({ special_notes: e.target.value })}
       placeholder="Tarifas sujeitas a disponibilidade e alteração sem aviso prévio até a emissão..."
       className="h-20 text-xs rounded-lg resize-none"
     />
   </div>
 </TabsContent>

 {/* ── ABA 7: PREÇOS & PARCELAMENTO ── */}
 <TabsContent value="preco" className="space-y-3">
 <div className="space-y-2 p-3 rounded-lg bg-card border border-border/70 shadow-2xs">
 <Label className="text-2xs font-bold text-foreground flex items-center justify-between">
 <span>Valor Total da Proposta (R$) *</span>
 <span className="text-primary font-mono font-bold text-xs">
 {formatMoney(proposal.pricing?.total_price_cents || 0)}
 </span>
 </Label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
 R$
 </span>
 <Input
 type="text"
 value={priceInputReais}
 onChange={(e) => handlePriceChange(e.target.value)}
 placeholder="Ex: 4890,00"
 className="h-10 pl-9 text-sm font-bold font-mono rounded-lg bg-background"
 />
 </div>
 <p className="text-2xs text-muted-foreground">
 Digite o valor real em Reais (ex: 4500 ou 4500,00). O sistema converte automaticamente para centavos seguros.
 </p>
 <div className="pt-2 border-t border-border/50 space-y-2">
   <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
     Decomposição Financeira & Moeda
   </span>
   <div className="grid grid-cols-2 gap-2">
     <div className="space-y-1">
       <Label className="text-xs text-muted-foreground">Moeda</Label>
       <select
         value={proposal.pricing?.currency || "BRL"}
         onChange={(e) =>
           onChange({
             pricing: { ...proposal.pricing, currency: e.target.value },
           })
         }
         className="w-full h-11 text-xs rounded-lg bg-background border border-border px-2"
       >
         <option value="BRL">BRL (R$)</option>
         <option value="USD">USD (US$)</option>
         <option value="EUR">EUR (€)</option>
       </select>
     </div>
     <div className="space-y-1">
       <Label className="text-xs text-muted-foreground">Tarifa Base (R$)</Label>
       <Input
         type="text"
         value={basePriceReais}
         onChange={(e) => {
           setBasePriceReais(e.target.value);
           recomputePricingFromBreakdown(e.target.value, boardingTaxReais, discountReais);
         }}
         placeholder="0,00"
         className="h-11 text-xs font-mono rounded-lg"
       />
     </div>
     <div className="space-y-1">
       <Label className="text-xs text-muted-foreground">Taxas de Embarque (R$)</Label>
       <Input
         type="text"
         value={boardingTaxReais}
         onChange={(e) => {
           setBoardingTaxReais(e.target.value);
           recomputePricingFromBreakdown(basePriceReais, e.target.value, discountReais);
         }}
         placeholder="0,00"
         className="h-11 text-xs font-mono rounded-lg"
       />
     </div>
     <div className="space-y-1">
       <Label className="text-xs text-emerald-600 font-semibold">Desconto / PIX (R$)</Label>
       <Input
         type="text"
         value={discountReais}
         onChange={(e) => {
           setDiscountReais(e.target.value);
           recomputePricingFromBreakdown(basePriceReais, boardingTaxReais, e.target.value);
         }}
         placeholder="0,00"
         className="h-11 text-xs font-mono rounded-lg"
       />
     </div>
   </div>
 </div>
 </div>

 <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-3">
 <span className="text-xs font-bold text-foreground block">Atalhos de Parcelamento Comercial</span>
 <div className="grid grid-cols-2 gap-2">
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => {
 const total = proposal.pricing?.total_price_cents || 0;
 onChange({
 pricing: {
 ...proposal.pricing,
 installments_options: [
 { installments_count: 1, installment_value_cents: total, method: "pix", has_interest: false },
 { installments_count: 10, installment_value_cents: Math.round(total / 10), method: "credit_card", has_interest: false },
 { installments_count: 12, installment_value_cents: Math.round(total / 12), method: "credit_card", has_interest: false },
 ],
 },
 });
 }}
 className="h-8 text-2xs rounded-lg font-semibold min-h-11 sm:min-h-0"
 >
 10x e 12x Sem Juros
 </Button>

 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => {
 const total = proposal.pricing?.total_price_cents || 0;
 onChange({
 pricing: {
 ...proposal.pricing,
 installments_options: [
 { installments_count: 1, installment_value_cents: total, method: "pix", has_interest: false },
 { installments_count: 12, installment_value_cents: Math.round(total / 12), method: "boleto", has_interest: false },
 ],
 },
 });
 }}
 className="h-8 text-2xs rounded-lg font-semibold min-h-11 sm:min-h-0"
 >
 Boleto 12x Sem Entrada
 </Button>
 </div>

 {/* Visualização das parcelas configuradas */}
 {proposal.pricing?.installments_options && proposal.pricing.installments_options.length > 0 && (
 <div className="space-y-1 pt-1 border-t border-border/40 text-2xs">
 {proposal.pricing.installments_options.map((opt, i) => (
 <div key={i} className="flex justify-between items-center text-muted-foreground">
 <span>
 {opt.installments_count}x {opt.method === "pix" ? "à vista no Pix" : "no Cartão"}
 </span>
 <span className="font-mono font-bold text-foreground">
 {formatMoney(opt.installment_value_cents)}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-3">
 <div className="flex items-center justify-between gap-2">
 <span className="text-xs font-bold text-foreground flex items-center gap-2">
 <Info className="size-3.5 text-primary" />
 <span>Campos Extras & Regras CMS</span>
 </span>
 </div>

 <div className="space-y-2">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">Regras de Embarque / Documentos</Label>
 <Textarea
 rows={2}
 value={String(studioCustomFields.boarding_requirements || "")}
 onChange={(e) => updateStudioCustomField("boarding_requirements", e.target.value)}
 placeholder="Ex: Check-in 2h antes com RG ou CNH original."
 className="text-xs rounded-lg resize-none"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">Política de Cancelamento / Remarcação</Label>
 <Textarea
 rows={2}
 value={String(studioCustomFields.cancellation_policy || "")}
 onChange={(e) => updateStudioCustomField("cancellation_policy", e.target.value)}
 placeholder="Ex: Reembolso integral até 7 dias antes do embarque."
 className="text-xs rounded-lg resize-none"
 />
 </div>
 </div>

 {Object.entries(studioCustomFields).filter(
 ([k]) => !STUDIO_RESERVED_FIELD_KEYS.has(k),
 ).length > 0 && (
 <div className="space-y-2 pt-2 border-t border-border/40">
 {Object.entries(studioCustomFields)
 .filter(([k]) => !STUDIO_RESERVED_FIELD_KEYS.has(k))
 .map(([fieldKey, fieldValue]) => (
 <div key={fieldKey} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
 <span
 className="col-span-5 text-2xs font-medium text-muted-foreground truncate"
 title={fieldKey}
 >
 {formatDynamicFieldLabel(fieldKey)}
 </span>
 <Input
 value={String(fieldValue ?? "")}
 onChange={(e) => updateStudioCustomField(fieldKey, e.target.value)}
 className="col-span-5 h-11 sm:h-9 text-xs rounded-lg"
 />
 <Button
 type="button"
 variant="ghost"
 size="icon"
 aria-label={`Remover campo ${formatDynamicFieldLabel(fieldKey)}`}
 onClick={() => updateStudioCustomField(fieldKey, null)}
 className="col-span-2 h-11 w-11 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <X className="size-3.5" />
 </Button>
 </div>
 ))}
 </div>
 )}

 <div className="space-y-2 pt-2 border-t border-border/40">
 <Label className="text-xs text-muted-foreground">Adicionar Campo Personalizado</Label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 <Input
 value={newCustomFieldKey}
 onChange={(e) => setNewCustomFieldKey(e.target.value)}
 placeholder="Chave (ex: ponto_embarque)"
 className="h-11 sm:h-9 text-xs rounded-lg"
 />
 <Input
 value={newCustomFieldVal}
 onChange={(e) => setNewCustomFieldVal(e.target.value)}
 placeholder="Valor preenchido"
 className="h-11 sm:h-9 text-xs rounded-lg"
 />
 </div>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => {
 if (!newCustomFieldKey.trim() || !newCustomFieldVal.trim()) {
 toast.error("Informe chave e valor para adicionar o campo.");
 return;
 }
 updateStudioCustomField(newCustomFieldKey.trim(), newCustomFieldVal.trim());
 setNewCustomFieldKey("");
 setNewCustomFieldVal("");
 }}
 className="w-full h-11 sm:h-9 text-xs font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Plus className="size-3.5 mr-2" />
 Adicionar Campo
 </Button>
 </div>
 </div>
 </TabsContent>
 </Tabs>
 </div>
 </div>
 );
}
