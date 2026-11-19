import React, { useEffect, useState } from "react";
import { parseReaisToCents } from "@/lib/money";
import { toDateInputValue } from "@/lib/datetime";
import { useQuery } from "@tanstack/react-query";
import type {
  TravelProposalDTO,
  FlightSegmentDTO,
  HotelDTO,
  HotelOptionDTO,
  ItineraryDayDTO,
  ProposalRoomItem,
  ProposalCanvasFormat,
  TourOptionDTO,
  TransferDTO,
  CruiseDTO,
  CruiseItineraryDayDTO,
  TravelProposalOptionDTO,
} from "@/services/travel-proposal.functions";
import { generateProposalItineraryAI } from "@/services/travel-proposal.functions";
import { listHotelsBank } from "@/services/travel-catalog.functions";
import { listTravelSuppliers } from "@/services/travel-suppliers.functions";
import {
  buildInstallmentOptionsFromPolicy,
  buildPaymentTermsSummaryFromPolicy,
  normalizeSupplierPaymentPolicy,
  resolveMaxInstallmentsFromOptions,
} from "@/lib/tourism/payment-policy";
import { StudioSupplierInstallmentsCard } from "@/components/tourism/studio/StudioSupplierInstallmentsCard";
import { CustomerSearchCombobox } from "@/components/crm/CustomerSearchCombobox";
import { listGroupTours } from "@/services/group-tours.functions";
import { CANONICAL_DESTINATIONS } from "@/lib/tourism/destinations-catalog";
import { PassHubLiveQuoterPanel } from "@/components/tourism/quotes/passhub-live-quoter-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatefulNavIcon } from "@/components/ui/stateful-nav-icon";
import { ImageUpload } from "@/components/ui/image-upload";
import { MediaGalleryField } from "@/components/ui/media-gallery-field";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Minus, Trash, Copy, Plane, Building2, Calendar, DollarSign, Info, CheckCircle, MapPin, Clock, Compass, Zap, BedDouble, Car, Users, LayoutTemplate, LayoutGrid, Check, X, Bus, Moon, Briefcase, Monitor, FileText, Tag, Palette, Type, Eye, EyeOff, RotateCcw, Image as ImageIcon, Layers, Search, Globe, Loader2, Ship, Anchor, Camera } from "lucide-react";
import { searchGlobalAirports } from "@/services/tourism-airports.functions";
import { CruiseRouteSvgMap } from "@/components/tourism/shared/CruiseRouteSvgMap";
import { CURATED_AIRPORT_COORDINATES, normalizeIataCode, resolveCruisePortCoordinates } from "@/lib/tourism/flight-route-geometry";
import { StudioMapWidget } from "./StudioMapWidget";
import {
  computeExtraServicesChargeCents,
  extractImageUrlsFromMedia,
  normalizeCruisesList,
  normalizeEntityMediaList,
  resolveTransferDisplayTitle,
  resolveTransferKindBadge,
  sortTransfersChronologically,
  type ProposalMediaItem,
} from "@/lib/tourism/proposal-normalization";
import { buildDeterministicProposalItinerary } from "@/lib/tourism/quote-ocr-normalizer";
import { formatDynamicFieldLabel } from "@/lib/niches/unified-field-bridge";
import { ProposalWebPageBuilder } from "@/components/tourism/studio/proposal-web-page-builder";
import {
  isEditableCustomFieldInProposalStudio,
  sanitizeProposalCustomFields,
} from "@/lib/tourism/proposal-custom-fields";
import {
  CANVAS_BG_PRESETS,
  BRAND_COLOR_PRESETS,
  FONT_PRESET_OPTIONS,
  PROPOSAL_NICHE_CATALOG,
  PROPOSAL_SECTION_CATALOG,
  TEMPLATE_DEFAULT_PALETTES,
  normalizeProposalNicheId,
  resolveProposalCanvasTheme,
  resolveProposalNicheCopy,
  type ProposalNicheId,
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
  "agency_logo_url",
  "logo_shape",
  "logo_size",
  "logo_position",
  "logo_object_position",
  "logo_scale",
  "cover_object_position",
  "cover_scale",
  "cover_aspect_mode",
  "proposal_niche",
  "show_price_per_person",
  "show_price_per_adult",
  "show_price_per_room",
  "custom_price_per_person_cents",
  "destination_gallery_urls",
  "gateway_logistics",
  ...Object.values(PROPOSAL_NICHE_CATALOG).flatMap((n) => n.specFields.map((s) => s.key)),
]);

function buildColorSwatchStyle(hexColor: string): React.CSSProperties {
  const styleMap: Record<string, string> = {};
  styleMap["backgroundColor"] = hexColor;
  return styleMap as React.CSSProperties;
}

const TEMPLATE_CATALOG = [
  { id: "bento-grid", label: "Bento Grid Visual", desc: "Mosaico modular 100% preenchido, multi-nicho e visual", icon: LayoutGrid },
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
 activeTabOverride?: string;
 onTabChange?: (tab: string) => void;
}

export function StudioSidebarEditor({
  proposal,
  onChange,
  activeTabOverride,
  onTabChange,
}: StudioSidebarEditorProps) {
  const { data: hotelsBank = [], isLoading: isLoadingHotelsBank } = useQuery({
    queryKey: ["hotels-bank-studio"],
    queryFn: () => listHotelsBank().catch(() => []),
  });

  // Estado local para input de preço em Reais amigável
  const { data: groupTours = [], isLoading: isLoadingGroupTours } = useQuery({
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
 const [activeTab, setActiveTab] = useState<string>(activeTabOverride || "design");
 const [passHubTabOpen, setPassHubTabOpen] = useState<"voos" | "hotel" | "servicos" | "opcoes" | null>(null);
 const [newOptionName, setNewOptionName] = useState<string>("");
 const [isGeneratingItinerary, setIsGeneratingItinerary] = useState<boolean>(false);
 const [selectedTransferIndex, setSelectedTransferIndex] = useState<number>(0);

 useEffect(() => {
   if (activeTabOverride && activeTabOverride !== activeTab) {
     setActiveTab(activeTabOverride);
   }
 }, [activeTabOverride]);

 useEffect(() => {
   const expectedBase = proposal.pricing?.base_price_cents || proposal.pricing?.total_price_cents || 0;
   const expectedTax = proposal.pricing?.boarding_tax_cents || 0;
   const expectedDiscount = proposal.pricing?.discount_cents || 0;
   const expectedTotal = proposal.pricing?.total_price_cents || 0;

   setBasePriceReais((prev) =>
     parseReaisToCents(prev, true) === expectedBase ? prev : expectedBase > 0 ? (expectedBase / 100).toFixed(2) : "",
   );
   setBoardingTaxReais((prev) =>
     parseReaisToCents(prev, true) === expectedTax ? prev : expectedTax > 0 ? (expectedTax / 100).toFixed(2) : "",
   );
   setDiscountReais((prev) =>
     parseReaisToCents(prev, true) === expectedDiscount ? prev : expectedDiscount > 0 ? (expectedDiscount / 100).toFixed(2) : "",
   );
   setPriceInputReais((prev) =>
     parseReaisToCents(prev, true) === expectedTotal ? prev : expectedTotal > 0 ? (expectedTotal / 100).toFixed(2) : "",
   );
 }, [
   proposal.id,
   proposal.pricing?.base_price_cents,
   proposal.pricing?.boarding_tax_cents,
    proposal.pricing?.discount_cents,
    proposal.pricing?.total_price_cents,
  ]);

  const { data: studioSuppliers = [] } = useQuery({
    queryKey: ["travel-suppliers-active-studio"],
    queryFn: () => listTravelSuppliers({ data: {} }),
  });

  const resolvedInstallments = resolveMaxInstallmentsFromOptions(
    proposal.pricing?.installments_options,
    12,
  );

  const applyPaymentPolicyToProposal = (
    policyInput: ReturnType<typeof normalizeSupplierPaymentPolicy>,
  ) => {
    const total = proposal.pricing?.total_price_cents || 0;
    const options = buildInstallmentOptionsFromPolicy(total, policyInput);
    const terms = buildPaymentTermsSummaryFromPolicy(total, policyInput, formatMoney);
    onChange({
      pricing: {
        ...proposal.pricing,
        installments_options: options,
        payment_terms: terms,
      },
    });
  };

  const studioCustomFields = sanitizeProposalCustomFields(
    {
      ...(proposal.custom_fields && typeof proposal.custom_fields === "object" ? proposal.custom_fields : {}),
      ...((proposal.pricing as any)?.custom_fields && typeof (proposal.pricing as any).custom_fields === "object"
        ? (proposal.pricing as any).custom_fields
        : {}),
    } as Record<string, unknown>,
    { allowDocumentForStaffStorage: true },
  ) as Record<string, string>;

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

  const currentNicheId: ProposalNicheId = normalizeProposalNicheId(studioCustomFields.proposal_niche);
  const nicheCopy = resolveProposalNicheCopy(currentNicheId);

  const destinationGalleryUrls: string[] = (() => {
    const raw = studioCustomFields.destination_gallery_urls;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // CSV or newline fallback
    }
    return String(raw)
      .split(/[\n,|]+/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http") || u.startsWith("/") || u.startsWith("data:"));
  })();

  const handleAddDestinationGalleryPhoto = (url: string) => {
    if (!url.trim()) return;
    const next = Array.from(new Set([...destinationGalleryUrls, url.trim()]));
    updateStudioCustomField("destination_gallery_urls", JSON.stringify(next));
  };

  const handleRemoveDestinationGalleryPhoto = (idx: number) => {
    const next = destinationGalleryUrls.filter((_, i) => i !== idx);
    updateStudioCustomField(
      "destination_gallery_urls",
      next.length > 0 ? JSON.stringify(next) : null,
    );
  };

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
    onChange({ valid_until: targetDate.toISOString().slice(0, 10) });
  };

  const updatePrimaryRodoviarioTransfer = (patch: Record<string, any>) => {
    const existingList = Array.isArray(proposal.transfers) ? proposal.transfers : [];
    const idx = existingList[selectedTransferIndex] ? selectedTransferIndex : 0;
    const current = existingList[idx] || {
      id: `bus-${Date.now()}`,
      name: "Transporte Rodoviário",
      type: "Ônibus Leito DD",
      kind: "bus",
      route: "",
      route_name: "",
      date: proposal.travel_start_date || "",
      included: true,
    };
    const updatedItem = { ...current, ...patch };
    const next =
      existingList.length === 0
        ? [updatedItem]
        : existingList.map((item, i) => (i === idx ? updatedItem : item));
    onChange({ transfers: next });
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

 const handleUpdateRoomPriceReais = (roomId: string, rawReais: string) => {
   const cents = parseReaisToCents(rawReais, true);
   const newRooms = currentRooms.map((r) => {
     if (r.id !== roomId) return r;
     const pax = Math.max(1, (r.adults || 1) + (r.children || 0));
     return {
       ...r,
       price_cents: cents && cents > 0 ? cents : undefined,
       price_per_person_cents: cents && cents > 0 ? Math.round(cents / pax) : undefined,
     };
   });
   onChange({ rooms: newRooms });
 };

 const handleAutoDistributeRoomPrices = () => {
   const totalCents = proposal.pricing?.total_price_cents || 0;
   if (totalCents <= 0) {
     toast.error("Defina primeiro o Valor Total da Proposta para ratear entre os quartos.");
     return;
   }
   const totalWeight = currentRooms.reduce(
     (acc, r) => acc + Math.max(1, r.adults || 1) + Math.max(0, r.children || 0) * 0.5,
     0,
   );
   const newRooms = currentRooms.map((r) => {
     const weight = Math.max(1, r.adults || 1) + Math.max(0, r.children || 0) * 0.5;
     const roomCents = Math.round((totalCents * weight) / Math.max(1, totalWeight));
     const pax = Math.max(1, (r.adults || 1) + (r.children || 0));
     return {
       ...r,
       price_cents: roomCents,
       price_per_person_cents: Math.round(roomCents / pax),
     };
   });
   onChange({ rooms: newRooms });
   toast.success("Valores por quarto calculados proporcionalmente aos hóspedes!");
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
   if (field === "image_url") {
     const existingImgs = Array.isArray(h.images) ? h.images.filter(Boolean) : [];
     next.images = val ? Array.from(new Set([val, ...existingImgs])) : existingImgs;
   }
   return next;
 }),
 });
 };

 const handleAddHotelPhoto = (id: string | undefined, url: string) => {
   if (!id || !url.trim()) return;
   onChange({
     hotels: proposal.hotels.map((h) => {
       if (h.id !== id) return h;
       const existing = Array.isArray(h.images)
         ? h.images.filter(Boolean)
         : h.image_url
           ? [h.image_url]
           : [];
       const nextImages = Array.from(new Set([...existing, url.trim()]));
       return {
         ...h,
         image_url: nextImages[0] || "",
         images: nextImages,
       };
     }),
   });
 };

 const handleRemoveHotelPhoto = (id: string | undefined, imgIdx: number) => {
   if (!id) return;
   onChange({
     hotels: proposal.hotels.map((h) => {
       if (h.id !== id) return h;
       const existing = Array.isArray(h.images)
         ? h.images.filter(Boolean)
         : h.image_url
           ? [h.image_url]
           : [];
       const nextImages = existing.filter((_, idx) => idx !== imgIdx);
       return {
         ...h,
         image_url: nextImages[0] || "",
         images: nextImages,
       };
     }),
   });
 };

 const handleHotelMediaChange = (hotelIdx: number, nextMedia: ProposalMediaItem[]) => {
   const imgUrls = extractImageUrlsFromMedia(nextMedia);
   const firstVid = nextMedia.find((m) => m.type === "video")?.url;
   onChange({
     hotels: proposal.hotels.map((h, idx) =>
       idx !== hotelIdx
         ? h
         : {
             ...h,
             media: nextMedia,
             images: imgUrls,
             image_url: imgUrls[0] || "",
             featured_image_url: imgUrls[0] || "",
             video_url: firstVid || undefined,
           },
     ),
   });
 };

 const handleItineraryMediaChange = (dayIdx: number, nextMedia: ProposalMediaItem[]) => {
   const imgUrls = extractImageUrlsFromMedia(nextMedia);
   const firstVid = nextMedia.find((m) => m.type === "video")?.url;
   onChange({
     itinerary: proposal.itinerary.map((d, idx) =>
       idx !== dayIdx
         ? d
         : {
             ...d,
             media: nextMedia,
             images: imgUrls,
             image_url: imgUrls[0] || "",
             video_url: firstVid || undefined,
           },
     ),
   });
 };

 const handleTourMediaChange = (tourIdx: number, nextMedia: ProposalMediaItem[]) => {
   const imgUrls = extractImageUrlsFromMedia(nextMedia);
   const firstVid = nextMedia.find((m) => m.type === "video")?.url;
   handleUpdateTour(tourIdx, {
     media: nextMedia,
     images: imgUrls,
     image_url: imgUrls[0] || "",
     video_url: firstVid || undefined,
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

 const handleAddItineraryPhoto = (id: string | undefined, url: string) => {
   if (!id || !url.trim()) return;
   onChange({
     itinerary: proposal.itinerary.map((it) => {
       if (it.id !== id) return it;
       const existing = Array.isArray(it.images)
         ? it.images.filter(Boolean)
         : it.image_url
           ? [it.image_url]
           : [];
       const nextImages = Array.from(new Set([...existing, url.trim()]));
       return {
         ...it,
         image_url: nextImages[0] || "",
         images: nextImages,
       };
     }),
   });
 };

 const handleRemoveItineraryPhoto = (id: string | undefined, imgIdx: number) => {
   if (!id) return;
   onChange({
     itinerary: proposal.itinerary.map((it) => {
       if (it.id !== id) return it;
       const existing = Array.isArray(it.images)
         ? it.images.filter(Boolean)
         : it.image_url
           ? [it.image_url]
           : [];
       const nextImages = existing.filter((_, idx) => idx !== imgIdx);
       return {
         ...it,
         image_url: nextImages[0] || "",
         images: nextImages,
       };
     }),
   });
 };

 const handleGenerateItineraryFromDestination = async () => {
 const dest = (proposal.destination_city || proposal.hotels?.[0]?.destination || "").trim();
 if (!dest && currentTours.length === 0 && proposal.hotels.length === 0) {
 toast.info("Informe o destino ou adicione hospedagem para montar o roteiro.");
 return;
 }
 setIsGeneratingItinerary(true);
 try {
 const res = await generateProposalItineraryAI({
 data: {
 proposalId: proposal.id,
 destination: dest || "Destino",
 startDate: proposal.travel_start_date,
 endDate: proposal.travel_end_date,
 flights: proposal.flights,
 hotels: proposal.hotels,
 transfers: currentTransfers,
 tours: currentTours,
 rawItineraryText: proposal.special_notes || undefined,
 useAiEnrichment: true,
 },
 });
 if (Array.isArray(res?.days) && res.days.length > 0) {
 onChange({ itinerary: res.days });
 toast.success(`Roteiro de ${res.days.length} dia(s) gerado com sucesso!`);
 return;
 }
 } catch {
 // Fallback determinístico garante sucesso mesmo offline
 } finally {
 setIsGeneratingItinerary(false);
 }

 const fallback = buildDeterministicProposalItinerary({
 destination: dest || "Destino",
 startDate: proposal.travel_start_date,
 endDate: proposal.travel_end_date,
 flights: proposal.flights,
 hotels: proposal.hotels,
 transfers: currentTransfers,
 tours: currentTours,
 });
 onChange({ itinerary: fallback });
 toast.success(`Roteiro estruturado de ${fallback.length} dia(s) preenchido.`);
 };

 // Helpers de Transfers (Receptivo) e Passeios (Experiências)
 const currentTransfers = Array.isArray(proposal.transfers) ? proposal.transfers : [];
 const currentCruises: CruiseDTO[] = Array.isArray(proposal.cruises) ? proposal.cruises : [];
 const currentTours = Array.isArray(proposal.tours) ? proposal.tours : [];
 const currentIncludes = Array.isArray(proposal.includes) ? proposal.includes : [];
 const currentExcludes = Array.isArray(proposal.excludes) ? proposal.excludes : [];

 const flightWaypoints = React.useMemo(() => {
   const points: { id: string; lat: number; lng: number; label: string }[] = [];
   (proposal.flights || []).forEach((f: any) => {
     const oIata = normalizeIataCode(f.origin_iata || f.origin_code || f.origin);
     const dIata = normalizeIataCode(f.destination_iata || f.destination_code || f.destination);
     if (oIata && CURATED_AIRPORT_COORDINATES[oIata]) {
       const coord = CURATED_AIRPORT_COORDINATES[oIata];
       if (!points.some((p) => p.id === oIata)) {
         points.push({ id: oIata, lat: coord.lat, lng: coord.lng, label: `${coord.city || oIata} (${oIata})` });
       }
     }
     if (dIata && CURATED_AIRPORT_COORDINATES[dIata]) {
       const coord = CURATED_AIRPORT_COORDINATES[dIata];
       if (!points.some((p) => p.id === dIata)) {
         points.push({ id: dIata, lat: coord.lat, lng: coord.lng, label: `${coord.city || dIata} (${dIata})` });
       }
     }
   });

   (currentCruises || []).forEach((c) => {
     if (Array.isArray(c.itinerary)) {
       c.itinerary.forEach((itinDay) => {
         const resolved = resolveCruisePortCoordinates(itinDay.port);
         if (resolved && !points.some((p) => p.id === resolved.code)) {
           points.push({
             id: resolved.code,
             lat: resolved.lat,
             lng: resolved.lng,
             label: `${resolved.city} (${resolved.code})`,
           });
         }
       });
     }
   });

   return points;
 }, [proposal.flights, currentCruises]);

 const syncServicesDeltaToPricing = (deltaCents: number): Partial<TravelProposalDTO> => {
   if (!deltaCents) return {};
   const currentTotal = Number(proposal.pricing?.total_price_cents || 0);
   const nextTotal = Math.max(0, currentTotal + deltaCents);
   setPriceInputReais(nextTotal > 0 ? (nextTotal / 100).toFixed(2) : "");
   return {
     pricing: {
       ...proposal.pricing,
       total_price_cents: nextTotal,
       total_cents: nextTotal,
     },
   };
 };

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
   const prevItem: any = currentTransfers[idx] || {};
   const nextItem: any = { ...prevItem, ...patch };
   const prevContrib = prevItem.add_to_quote ? Number(prevItem.price_cents || 0) : 0;
   const nextContrib = nextItem.add_to_quote ? Number(nextItem.price_cents || 0) : 0;
   const delta = nextContrib - prevContrib;
   const next = currentTransfers.map((t, i) => (i === idx ? nextItem : t));
   onChange({
     transfers: next as any,
     ...syncServicesDeltaToPricing(delta),
   });
 };

 const handleRemoveTransfer = (idx: number) => {
   const prevItem: any = currentTransfers[idx];
   const delta = prevItem?.add_to_quote ? -Number(prevItem.price_cents || 0) : 0;
   onChange({
     transfers: currentTransfers.filter((_, i) => i !== idx),
     ...syncServicesDeltaToPricing(delta),
   });
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
   const prevItem: any = currentTours[idx] || {};
   const merged = { ...prevItem, ...patch };
   if (patch.title !== undefined) merged.description = patch.title;
   const prevContrib = prevItem.add_to_quote ? Number(prevItem.price_cents || 0) : 0;
   const nextContrib = merged.add_to_quote ? Number(merged.price_cents || 0) : 0;
   const delta = nextContrib - prevContrib;
   const next = currentTours.map((t: any, i: number) => (i === idx ? merged : t));
   onChange({
     tours: next,
     ...syncServicesDeltaToPricing(delta),
   });
 };

 const handleAddTourPhoto = (idx: number, url: string) => {
   if (!url.trim()) return;
   const tour = currentTours[idx];
   if (!tour) return;
   const existing = Array.isArray(tour.images)
     ? tour.images.filter(Boolean)
     : tour.image_url
       ? [tour.image_url]
       : [];
   const nextImages = Array.from(new Set([...existing, url.trim()]));
   handleUpdateTour(idx, {
     image_url: nextImages[0] || "",
     images: nextImages,
   });
 };

 const handleRemoveTourPhoto = (idx: number, imgIdx: number) => {
   const tour = currentTours[idx];
   if (!tour) return;
   const existing = Array.isArray(tour.images)
     ? tour.images.filter(Boolean)
     : tour.image_url
       ? [tour.image_url]
       : [];
   const nextImages = existing.filter((_: string, i: number) => i !== imgIdx);
   handleUpdateTour(idx, {
     image_url: nextImages[0] || "",
     images: nextImages,
   });
 };

 const handleDuplicateFlight = (id?: string) => {
   if (!id) return;
   const idx = proposal.flights.findIndex((f) => f.id === id);
   if (idx < 0) return;
   const src = proposal.flights[idx];
   const clone: FlightSegmentDTO = {
     ...src,
     id: "fl_" + Math.random().toString(36).substring(2, 8),
   };
   const next = [...proposal.flights];
   next.splice(idx + 1, 0, clone);
   onChange({ flights: next });
   toast.success("Trecho de voo duplicado.");
 };

 const handleDuplicateHotel = (id?: string) => {
   if (!id) return;
   const idx = proposal.hotels.findIndex((h) => h.id === id);
   if (idx < 0) return;
   const src = proposal.hotels[idx];
   const clone: HotelOptionDTO = {
     ...src,
     id: "ht_" + Math.random().toString(36).substring(2, 8),
     hotel_name: src.hotel_name ? `${src.hotel_name} (Cópia)` : "Nova Opção",
     images: Array.isArray(src.images) ? [...src.images] : undefined,
     amenities: Array.isArray(src.amenities) ? [...src.amenities] : undefined,
   };
   const next = [...proposal.hotels];
   next.splice(idx + 1, 0, clone);
   onChange({ hotels: next });
   toast.success("Hospedagem/bloco duplicado.");
 };

 const handleDuplicateItineraryDay = (id?: string) => {
   if (!id) return;
   const idx = proposal.itinerary.findIndex((d) => d.id === id);
   if (idx < 0) return;
   const src = proposal.itinerary[idx];
   const clone: ItineraryDayDTO = {
     ...src,
     id: "day_" + Math.random().toString(36).substring(2, 8),
     day_number: proposal.itinerary.length + 1,
     title: src.title ? `${src.title} (Cópia)` : `Dia ${proposal.itinerary.length + 1}`,
     images: Array.isArray(src.images) ? [...src.images] : undefined,
     included_meals: Array.isArray(src.included_meals) ? [...src.included_meals] : undefined,
   };
   const next = [...proposal.itinerary];
   next.splice(idx + 1, 0, clone);
   onChange({ itinerary: next });
   toast.success("Etapa do roteiro duplicada.");
 };

 const handleDuplicateTransfer = (idx: number) => {
   const src = currentTransfers[idx];
   if (!src) return;
   const clone = { ...src, id: `tr_${Date.now()}` };
   const next = [...currentTransfers];
   next.splice(idx + 1, 0, clone);
   onChange({ transfers: next as any });
   toast.success("Traslado/item duplicado.");
 };

 const handleRemoveTour = (idx: number) => {
   const prevItem: any = currentTours[idx];
   const delta = prevItem?.add_to_quote ? -Number(prevItem.price_cents || 0) : 0;
   onChange({
     tours: currentTours.filter((_, i) => i !== idx),
     ...syncServicesDeltaToPricing(delta),
   });
 };

 const handleDuplicateTour = (idx: number) => {
   const src: any = currentTours[idx];
   if (!src) return;
   const clone = {
     ...src,
     id: `tour_${Date.now()}`,
     title: src.title ? `${src.title} (Cópia)` : "Passeio (Cópia)",
   };
   const next = [...currentTours];
   next.splice(idx + 1, 0, clone);
   onChange({ tours: next });
   toast.success("Passeio/serviço duplicado.");
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

 const handleAddCruise = (preset?: Partial<CruiseDTO>) => {
   const newCruise: CruiseDTO = {
     id: `cruise_${Date.now()}`,
     ship_name: preset?.ship_name || "MSC Grandiosa",
     company: preset?.company || "MSC Cruzeiros",
     cabin_category: preset?.cabin_category || "Cabine Externa com Varanda",
     departure_port: preset?.departure_port || "Santos (São Paulo), Brasil",
     arrival_port: preset?.arrival_port || "Santos (São Paulo), Brasil",
     departure_date: preset?.departure_date || proposal.travel_start_date || "",
     return_date: preset?.return_date || proposal.travel_end_date || "",
     duration_nights: preset?.duration_nights ?? 4,
     board_basis: preset?.board_basis || "Pensão Completa (All Inclusive disponível)",
     image_url: preset?.image_url || "",
     notes: preset?.notes || "Taxas portuárias e gorjetas inclusas. Experiência Fantastica.",
     itinerary: preset?.itinerary || [
       { day: 1, port: "Santos (São Paulo), Brasil", arrival_time: "-", departure_time: "18:00", activity_type: "boarding" },
       { day: 2, port: "Em navegação", is_sea_day: true, arrival_time: "-", departure_time: "-", activity_type: "sea" },
       { day: 3, port: "Búzios, Brasil", arrival_time: "07:00", departure_time: "16:00", activity_type: "dock" },
       { day: 4, port: "Santos (São Paulo), Brasil", arrival_time: "08:00", departure_time: "-", activity_type: "disembark" },
     ],
   };
   onChange({ cruises: [...currentCruises, newCruise] });
   toast.success("Cruzeiro adicionado à cotação.");
 };

 const handleUpdateCruise = (idx: number, patch: Partial<CruiseDTO>) => {
   const next = currentCruises.map((c, i) => (i === idx ? { ...c, ...patch } : c));
   onChange({ cruises: next });
 };

 const handleRemoveCruise = (idx: number) => {
   onChange({ cruises: currentCruises.filter((_, i) => i !== idx) });
   toast.success("Cruzeiro removido.");
 };

 const handleDuplicateCruise = (idx: number) => {
   const src = currentCruises[idx];
   if (!src) return;
   const clone: CruiseDTO = {
     ...src,
     id: `cruise_${Date.now()}`,
     ship_name: `${src.ship_name} (Cópia)`,
     itinerary: Array.isArray(src.itinerary) ? src.itinerary.map((d) => ({ ...d })) : [],
   };
   const next = [...currentCruises];
   next.splice(idx + 1, 0, clone);
   onChange({ cruises: next });
   toast.success("Cruzeiro duplicado.");
 };

 const handleAddCruiseDay = (cruiseIdx: number) => {
   const cruise = currentCruises[cruiseIdx];
   if (!cruise) return;
   const currentItin = Array.isArray(cruise.itinerary) ? cruise.itinerary : [];
   const nextDayNum = currentItin.length + 1;
   const newDay: CruiseItineraryDayDTO = {
     day: nextDayNum,
     port: "Em navegação",
     is_sea_day: true,
     arrival_time: "-",
     departure_time: "-",
     activity_type: "sea",
   };
   handleUpdateCruise(cruiseIdx, { itinerary: [...currentItin, newDay] });
 };

 const handleUpdateCruiseDay = (cruiseIdx: number, dayIdx: number, patch: Partial<CruiseItineraryDayDTO>) => {
   const cruise = currentCruises[cruiseIdx];
   if (!cruise) return;
   const currentItin = Array.isArray(cruise.itinerary) ? cruise.itinerary : [];
   const nextItin = currentItin.map((d, i) => (i === dayIdx ? { ...d, ...patch } : d));
   handleUpdateCruise(cruiseIdx, { itinerary: nextItin });
 };

 const handleRemoveCruiseDay = (cruiseIdx: number, dayIdx: number) => {
   const cruise = currentCruises[cruiseIdx];
   if (!cruise) return;
   const currentItin = Array.isArray(cruise.itinerary) ? cruise.itinerary : [];
   const filtered = currentItin.filter((_, i) => i !== dayIdx);
   const renumbered = filtered.map((d, i) => ({ ...d, day_number: i + 1 }));
   handleUpdateCruise(cruiseIdx, { itinerary: renumbered });
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

 <TooltipProvider delayDuration={120}>
 <Tabs
   value={activeTab}
   onValueChange={(next) => {
     setActiveTab(next);
     onTabChange?.(next);
   }}
   className="flex-1 flex flex-col sm:flex-row overflow-hidden min-w-0"
 >
   <TabsList
     aria-label="Seções do Editor de Proposta"
     className="waesy-tab-strip flex flex-row sm:flex-col w-full sm:w-14 shrink-0 h-auto justify-start overflow-x-auto sm:overflow-y-auto no-scrollbar gap-1 p-2 sm:py-3 sm:px-1 rounded-none border-b sm:border-b-0 sm:border-r border-sidebar-border bg-rail"
   >
     {[
       { id: "design", label: "Design", icon: LayoutTemplate },
       { id: "web", label: "Página Web", icon: Globe },
       { id: "dados", label: "Geral", icon: FileText },
       ...(nicheCopy.showAviationAndHotelTerms ? [{ id: "voos", label: "Voos", icon: Plane }] : []),
       {
         id: "hotel",
         label:
           nicheCopy.shortLabel === "Turismo"
             ? "Hotel"
             : currentNicheId === "real_estate"
               ? "Imóvel"
               : currentNicheId === "automotive"
                 ? "Veículo"
                 : currentNicheId === "projects"
                   ? "Escopo"
                   : "Itens",
         icon: Building2,
       },
       ...(nicheCopy.showAviationAndHotelTerms ? [{ id: "rodoviario", label: "Rodoviário", icon: Bus }] : []),
       ...(nicheCopy.showAviationAndHotelTerms ? [{ id: "cruzeiro", label: "Cruzeiro", icon: Ship }] : []),
       { id: "roteiro", label: nicheCopy.showAviationAndHotelTerms ? "Roteiro" : "Etapas", icon: Calendar },
       { id: "servicos", label: nicheCopy.showAviationAndHotelTerms ? "Serviços" : "Extras", icon: Compass },
       { id: "inclusoes", label: "Inclusões", icon: CheckCircle },
       { id: "opcoes", label: "Opções", icon: Layers },
       { id: "preco", label: "Preço", icon: DollarSign },
     ].map((item) => {
       const NavIcon = item.icon;
       const isActive = activeTab === item.id;
       return (
         <Tooltip key={item.id}>
           <TooltipTrigger asChild>
             <TabsTrigger
               value={item.id}
               aria-label={item.label}
               className={cn(
                 "h-11 min-h-11 px-3 sm:px-0 sm:size-11 sm:min-w-11 sm:min-h-11 rounded-xl flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-rail-active data-[state=active]:text-foreground data-[state=active]:shadow-none",
                 isActive
                   ? "bg-rail-active text-foreground"
                   : "text-muted-foreground hover:text-foreground hover:bg-rail-hover",
               )}
             >
               <StatefulNavIcon
                 icon={NavIcon}
                 active={isActive}
                 size={20}
                 className="size-4 sm:size-5 shrink-0"
               />
               <span className="text-xs font-semibold sm:sr-only whitespace-nowrap">
                 {item.label}
               </span>
             </TabsTrigger>
           </TooltipTrigger>
           <TooltipContent side="right" sideOffset={8} className="hidden sm:block">
             {item.label}
           </TooltipContent>
         </Tooltip>
       );
     })}
   </TabsList>

   <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        {/* ── ABA 0: MODELOS, NICHO & DESIGN DO CANVAS ── */}
        <TabsContent value="design" className="space-y-4 mt-0">
          {/* ── SELETOR DE NICHO / SEGMENTO COMERCIAL ── */}
          <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <span>Segmento / Nicho da Proposta</span>
              </Label>
              <span className="text-2xs font-mono text-primary font-semibold uppercase">
                {nicheCopy.shortLabel}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(PROPOSAL_NICHE_CATALOG).map((niche) => {
                const isActive = currentNicheId === niche.id;
                return (
                  <button
                    key={niche.id}
                    type="button"
                    onClick={() => {
                      updateStudioCustomField("proposal_niche", niche.id);
                      if (!niche.showAviationAndHotelTerms && (activeTab === "voos" || activeTab === "rodoviario")) {
                        setActiveTab("dados");
                      }
                    }}
                    className={cn(
                      "min-h-11 sm:min-h-9 px-2 py-2 rounded-lg border text-left text-2xs font-semibold transition-colors cursor-pointer flex items-center justify-between gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                        : "border-border/60 bg-card text-foreground hover:bg-muted/40"
                    )}
                  >
                    <span className="truncate">{niche.shortLabel}</span>
                    {isActive && <Check className="size-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

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

          {/* ── IDENTIDADE VISUAL, LOGO DA AGÊNCIA/EMPRESA & RECORTE ── */}
          <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" />
                <span>Logo da Empresa & Recorte Visual</span>
              </Label>
              <span className="text-2xs text-muted-foreground">Recorte, tamanho e posição</span>
            </div>

            <ImageUpload
              value={String(studioCustomFields.agency_logo_url || proposal.agency_logo_url || "")}
              onChange={(url) => {
                updateStudioCustomField("agency_logo_url", url);
                onChange({ agency_logo_url: url });
              }}
              onRemove={() => {
                updateStudioCustomField("agency_logo_url", null);
                onChange({ agency_logo_url: "" });
              }}
              aspectPreset="free"
              bucket="cms-media"
              label="Logo da Agência / Empresa"
              helperText="Use 'Editar / Recortar' para ajustar proporção, fundo e zoom da logo"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-2xs text-muted-foreground">Formato</Label>
                <select
                  value={activeCanvasTheme.logoConfig.shape}
                  onChange={(e) => updateStudioCustomField("logo_shape", e.target.value)}
                  className="w-full h-8 rounded-lg border border-border bg-background px-2 text-2xs font-semibold"
                >
                  <option value="contain">Original</option>
                  <option value="wide">Horizontal</option>
                  <option value="square">Quadrado 1:1</option>
                  <option value="circle">Circular</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-2xs text-muted-foreground">Tamanho</Label>
                <select
                  value={activeCanvasTheme.logoConfig.size}
                  onChange={(e) => updateStudioCustomField("logo_size", e.target.value)}
                  className="w-full h-8 rounded-lg border border-border bg-background px-2 text-2xs font-semibold"
                >
                  <option value="sm">Pequeno (SM)</option>
                  <option value="md">Médio (MD)</option>
                  <option value="lg">Grande (LG)</option>
                  <option value="xl">Destaque (XL)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-2xs text-muted-foreground">Posição</Label>
                <select
                  value={activeCanvasTheme.logoConfig.position}
                  onChange={(e) => updateStudioCustomField("logo_position", e.target.value)}
                  className="w-full h-8 rounded-lg border border-border bg-background px-2 text-2xs font-semibold"
                >
                  <option value="left">Esquerda</option>
                  <option value="center">Centralizada</option>
                  <option value="right">Direita</option>
                  <option value="badge">Medalhão / Selo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-2xs text-muted-foreground">Foco da Logo</Label>
                <select
                  value={activeCanvasTheme.logoConfig.objectPosition}
                  onChange={(e) => updateStudioCustomField("logo_object_position", e.target.value)}
                  className="w-full h-8 rounded-lg border border-border bg-background px-2 text-2xs font-semibold"
                >
                  <option value="center center">Centro</option>
                  <option value="center top">Topo</option>
                  <option value="center bottom">Base</option>
                  <option value="left center">Esquerda</option>
                  <option value="right center">Direita</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-2xs text-muted-foreground">Zoom da Logo</Label>
                <select
                  value={String(activeCanvasTheme.logoConfig.scale)}
                  onChange={(e) => updateStudioCustomField("logo_scale", e.target.value)}
                  className="w-full h-8 rounded-lg border border-border bg-background px-2 text-2xs font-semibold"
                >
                  <option value="0.8">80% (Recuada)</option>
                  <option value="1">100% (Original)</option>
                  <option value="1.15">115% (Amplificada)</option>
                  <option value="1.3">130% (Preencher)</option>
                  <option value="1.5">150% (Close)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── ENQUADRAMENTO DA CAPA POR TEMPLATE & GALERIA VISUAL ── */}
          <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-3">
            <Label className="text-xs font-bold text-foreground flex items-center gap-2">
              <ImageIcon className="size-4 text-primary" />
              <span>Foto de Capa & Enquadramento por Modelo</span>
            </Label>

            <ImageUpload
              value={proposal.cover_image_url || ""}
              onChange={(url) => onChange({ cover_image_url: url })}
              onRemove={() => onChange({ cover_image_url: "" })}
              aspectPreset="free"
              allowAspectSwitch={true}
              bucket="cms-media"
              helperText="Troque ou recorte a imagem de capa com proporção livre"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-2xs text-muted-foreground">Ponto Focal</Label>
                <select
                  value={activeCanvasTheme.coverCrop.objectPosition}
                  onChange={(e) => updateStudioCustomField("cover_object_position", e.target.value)}
                  className="w-full h-8 rounded-lg border border-border bg-background px-2 text-2xs font-semibold"
                >
                  <option value="center center">Centro</option>
                  <option value="center top">Topo</option>
                  <option value="center bottom">Base</option>
                  <option value="left center">Esquerda</option>
                  <option value="right center">Direita</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-2xs text-muted-foreground">Zoom da Capa</Label>
                <select
                  value={String(activeCanvasTheme.coverCrop.scale)}
                  onChange={(e) => updateStudioCustomField("cover_scale", e.target.value)}
                  className="w-full h-8 rounded-lg border border-border bg-background px-2 text-2xs font-semibold"
                >
                  <option value="1">100% (Padrão)</option>
                  <option value="1.08">108% (Suave)</option>
                  <option value="1.15">115% (Médio)</option>
                  <option value="1.25">125% (Close-up)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-2xs text-muted-foreground">Preenchimento</Label>
                <select
                  value={activeCanvasTheme.coverCrop.fit}
                  onChange={(e) => updateStudioCustomField("cover_aspect_mode", e.target.value)}
                  className="w-full h-8 rounded-lg border border-border bg-background px-2 text-2xs font-semibold"
                >
                  <option value="cover">Preencher 100%</option>
                  <option value="contain">Ajustar Inteira</option>
                </select>
              </div>
            </div>

            {/* Galeria Visual do Destino / Imóvel / Projeto */}
            <div className="pt-2 border-t border-border/50 space-y-2">
              <MediaGalleryField
                label={`Galeria de Fotos do ${currentNicheId === "tourism" ? "Destino / Cidade" : nicheCopy.label}`}
                items={normalizeEntityMediaList({ images: destinationGalleryUrls })}
                onChange={(nextMedia) => {
                  const urls = nextMedia.map((m) => m.url).filter(Boolean);
                  updateStudioCustomField(
                    "destination_gallery_urls",
                    urls.length > 0 ? JSON.stringify(urls) : null,
                  );
                }}
                bucket="cms-media"
                allowVideos={true}
                defaultAspectPreset="16:9"
              />
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

        <TabsContent value="dados" className="space-y-3 mt-0">
 <div className="space-y-1">
 <Label className="text-2xs font-bold">Título da Proposta *</Label>
 <Input
 value={proposal.title}
 onChange={(e) => onChange({ title: e.target.value })}
 placeholder="Ex: Férias em Porto de Galinhas / Apresentação Executiva"
 className="h-9 text-xs rounded-lg"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-2xs font-bold">{nicheCopy.destinationLabel} *</Label>
 <Input
 value={proposal.destination_city}
 onChange={(e) => onChange({ destination_city: e.target.value })}
 placeholder={nicheCopy.destinationPlaceholder}
 className="h-9 text-xs rounded-lg"
 />
 {/* Chips Rápidos de Destinos Canônicos */}
 {currentNicheId === "tourism" && (
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
 )}
 </div>

 {/* ── FICHA TÉCNICA MULTI-NICHO DINÂMICA ── */}
 <div className="p-3 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
   <div className="flex items-center justify-between">
     <span className="text-xs font-bold text-foreground flex items-center gap-2">
       <Layers className="size-3.5 text-primary" />
       <span>{nicheCopy.specsSectionTitle}</span>
     </span>
     <span className="text-2xs font-semibold px-2 py-1 rounded-full bg-background border border-border text-primary">
       {nicheCopy.label}
     </span>
   </div>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
     {nicheCopy.specFields.map((spec) => (
       <div key={spec.key} className="space-y-1">
         <Label className="text-2xs font-semibold text-muted-foreground">
           {spec.label} {spec.unit ? `(${spec.unit})` : ""}
         </Label>
         <Input
           value={String(studioCustomFields[spec.key] || "")}
           onChange={(e) => updateStudioCustomField(spec.key, e.target.value)}
           placeholder={spec.placeholder}
           className="h-8 text-xs rounded-lg bg-background"
         />
       </div>
     ))}
   </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <Label className="text-2xs font-bold">{currentNicheId === "tourism" ? "Nome do Passageiro *" : "Nome do Cliente *"}</Label>
 <Input
 value={proposal.client_name}
 onChange={(e) => onChange({ client_name: e.target.value })}
 placeholder={currentNicheId === "tourism" ? "Nome do passageiro" : "Nome ou Razão Social"}
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
 <Label className="text-2xs font-bold">{nicheCopy.startDateLabel}</Label>
 <Input
 type="date"
 value={proposal.travel_start_date || ""}
 onChange={(e) => onChange({ travel_start_date: e.target.value })}
 className="h-9 text-xs rounded-lg"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-2xs font-bold">{nicheCopy.endDateLabel}</Label>
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
 <div className="flex items-center justify-between gap-2 flex-wrap">
 <div className="flex items-center gap-2 text-xs font-bold text-foreground">
 <BedDouble className="size-3.5 text-primary" />
 <span>{nicheCopy.roomsTitle}</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-2xs text-muted-foreground font-medium">
 {currentRooms.length} {currentRooms.length === 1 ? "bloco" : "blocos"} • {totalAdults} adt{totalChildren > 0 ? `, ${totalChildren} chd` : ""}
 </span>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleAutoDistributeRoomPrices}
 className="min-h-11 sm:min-h-0 h-11 sm:h-7 px-3 text-2xs rounded-md font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 title="Ratear o valor total da proposta automaticamente entre os quartos/unidades"
 >
 Rateio automático
 </Button>
 </div>
 </div>

 <div className="space-y-3">
 {currentRooms.map((room) => (
 <div
 key={room.id}
 className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-2"
 >
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2 flex-1 min-w-0">
 <span className="text-2xs font-bold text-foreground shrink-0">
 {nicheCopy.showAviationAndHotelTerms ? `Quarto ${room.roomNumber}` : `Bloco ${room.roomNumber}`}
 </span>
 {nicheCopy.showAviationAndHotelTerms ? (
 <select
 value={room.roomType || "Casal"}
 onChange={(e) => handleUpdateRoomType(room.id, e.target.value)}
 className="min-h-11 sm:min-h-0 h-11 sm:h-7 rounded border border-border/60 bg-background px-2 text-2xs text-muted-foreground"
 >
 <option value="Casal">Casal</option>
 <option value="Duplo Solteiro">2 Solteiro</option>
 <option value="Casal + Solteiro">Casal + Solteiro</option>
 <option value="Triplo Solteiro">3 Solteiro</option>
 <option value="Família (Suíte)">Família</option>
 </select>
 ) : (
 <Input
 value={room.roomType || ""}
 onChange={(e) => handleUpdateRoomType(room.id, e.target.value)}
 placeholder="Ex: Lote / Fase / Item"
 className="min-h-11 sm:min-h-0 h-11 sm:h-7 text-2xs rounded bg-background flex-1"
 />
 )}
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

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center pt-1">
 <div className="space-y-1">
 <Label className="text-3xs font-mono uppercase text-muted-foreground">
 {nicheCopy.showAviationAndHotelTerms ? "Valor deste Quarto (R$)" : "Valor deste Bloco (R$)"}
 </Label>
 <Input
 type="text"
 placeholder="Automático ou valor em R$"
 value={
 typeof room.price_cents === "number" && room.price_cents > 0
 ? (room.price_cents / 100).toFixed(2).replace(".", ",")
 : ""
 }
 onChange={(e) => handleUpdateRoomPriceReais(room.id, e.target.value)}
 className="min-h-11 sm:min-h-0 h-11 sm:h-8 text-xs font-mono rounded-lg bg-background"
 />
 </div>
 {typeof room.price_per_person_cents === "number" && room.price_per_person_cents > 0 && (
 <div className="text-2xs text-muted-foreground font-mono pt-3">
 Por pessoa: <strong className="text-foreground">{formatMoney(room.price_per_person_cents)}</strong>
 </div>
 )}
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
 <Label className="text-2xs font-bold">Foto de Capa da Proposta</Label>
 <ImageUpload
 value={proposal.cover_image_url || ""}
 onChange={(url) => onChange({ cover_image_url: url })}
 onRemove={() => onChange({ cover_image_url: "" })}
 aspectPreset="free"
 allowAspectSwitch={true}
 bucket="cms-media"
 helperText="Clique para escolher foto e proporção livre"
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

 <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2 mb-2">
   <Label className="text-xs font-bold text-primary flex items-center gap-2">
     <Users className="size-3.5" />
     <span>Importar Cliente do CRM da Agência</span>
   </Label>
   <CustomerSearchCombobox
     value={proposal.customer_id || ""}
     selectedLabel={
       proposal.customer_id
         ? proposal.selected_customer_label || proposal.client_name || proposal.customer_name || undefined
         : undefined
     }
     placeholder="Buscar cliente cadastrado no CRM..."
     searchPlaceholder="Digite nome, telefone ou CPF..."
     onSelectCustomer={(cust) => {
       if (cust) {
         onChange({
           customer_id: cust.id,
           selected_customer_label: cust.full_name || cust.legal_name || cust.name || null,
           client_name:
             cust.full_name || cust.legal_name || cust.name || proposal.client_name,
           client_whatsapp:
             cust.phone || cust.mobile || cust.whatsapp || proposal.client_whatsapp,
           client_email: cust.email || proposal.client_email,
           client_document:
             cust.document ||
             cust.document_number ||
             cust.cpf ||
             proposal.client_document,
         });
         toast.success(`Dados de ${cust.full_name || cust.name} vinculados à proposta!`);
         return;
       }
       onChange({ customer_id: null, selected_customer_label: null });
     }}
   />
 </div>

 <div className="space-y-1 mb-2">
   <Label className="text-xs font-bold">E-mail do Passageiro</Label>
   <Input
     type="email"
     value={proposal.client_email || ""}
     onChange={(e) => onChange({ client_email: e.target.value })}
     placeholder="cliente@email.com"
     className="h-11 min-h-11 text-base md:text-xs rounded-lg"
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
         value={String(studioCustomFields.agency_name ?? proposal.agency_name ?? "")}
         onChange={(e) => {
           const val = e.target.value;
           const next = { ...studioCustomFields };
           if (!val.trim()) delete next.agency_name;
           else next.agency_name = val.trim();
           onChange({
             agency_name: val,
             custom_fields: next,
             pricing: { ...proposal.pricing, custom_fields: next } as any,
           });
         }}
         placeholder="Ex: Excelência Tour"
         className="h-11 min-h-11 sm:h-10 text-base md:text-xs rounded-lg bg-background"
       />
     </div>
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
       <div className="space-y-1">
         <Label className="text-2xs font-semibold text-muted-foreground">Consultor Responsável</Label>
         <Input
           value={String(studioCustomFields.agent_name ?? proposal.agent_name ?? "")}
           onChange={(e) => {
             const val = e.target.value;
             const next = { ...studioCustomFields };
             if (!val.trim()) delete next.agent_name;
             else next.agent_name = val.trim();
             onChange({
               agent_name: val,
               custom_fields: next,
               pricing: { ...proposal.pricing, custom_fields: next } as any,
             });
           }}
           placeholder="Ex: Consultor Especialista"
           className="h-11 min-h-11 sm:h-10 text-base md:text-xs rounded-lg bg-background"
         />
       </div>
       <div className="space-y-1">
         <Label className="text-2xs font-semibold text-muted-foreground">WhatsApp da Agência</Label>
         <Input
           value={String(
             studioCustomFields.agent_whatsapp ??
               proposal.agent_whatsapp ??
               proposal.agency_whatsapp ??
               "",
           )}
           onChange={(e) => {
             const val = e.target.value;
             const next = { ...studioCustomFields };
             if (!val.trim()) delete next.agent_whatsapp;
             else next.agent_whatsapp = val.trim();
             onChange({
               agent_whatsapp: val,
               custom_fields: next,
               pricing: { ...proposal.pricing, custom_fields: next } as any,
             });
           }}
           placeholder="(49) 99999-9999"
           className="h-11 min-h-11 sm:h-10 text-base md:text-xs rounded-lg bg-background"
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
           className="min-h-11 sm:min-h-8 px-3 sm:px-2 py-1 rounded bg-muted hover:bg-primary/10 text-2xs font-mono font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
         >
           +{days}d
         </button>
       ))}
     </div>
   </div>
   <Input
     type="date"
     value={toDateInputValue(proposal.valid_until)}
     onChange={(e) => onChange({ valid_until: e.target.value || undefined })}
     className="h-11 min-h-11 sm:h-10 text-base md:text-xs rounded-lg"
   />
 </div>
 </div>
 </TabsContent>

 {/* ── ABA 2: VOOS & MALHA AÉREA ── */}
 <TabsContent value="voos" className="space-y-3">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <span className="text-2xs font-bold text-foreground">Trechos de Voo</span>
 <div className="flex items-center gap-2">
 <Button
 type="button"
 size="sm"
 variant={passHubTabOpen === "voos" ? "default" : "outline"}
 onClick={() => setPassHubTabOpen((prev) => (prev === "voos" ? null : "voos"))}
 className="h-11 sm:h-8 text-xs rounded-lg gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Search className="size-3.5" /> Cotar PassHub
 </Button>
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
 </div>

 {passHubTabOpen === "voos" && (
 <PassHubLiveQuoterPanel
 compact
 defaultCategories={["flights", "packages"]}
 initialOriginIata={proposal.flights[0]?.origin_iata || ""}
 initialDestinationIata={proposal.flights[0]?.destination_iata || ""}
 initialDestinationCity={proposal.destination_city || ""}
 initialDepartureDate={proposal.travel_start_date || ""}
 initialReturnDate={proposal.travel_end_date || ""}
 onAddFlight={(flight) => {
 onChange({ flights: [...proposal.flights, flight] });
 toast.success(`Voo ${flight.airline_name || flight.airline} importado para a proposta!`);
 }}
 onImportPackage={(pkg) => {
 if (pkg.includedItems?.length) {
 onChange({ includes: Array.from(new Set([...(proposal.includes || []), ...pkg.includedItems])) });
 }
 toast.success(`Pacote "${pkg.packageName}" consultado via PassHub!`);
 }}
 />
 )}

 {proposal.flights.map((f, idx) => (
 <div key={f.id} className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2">
 <div className="flex items-center justify-between gap-2 text-xs font-bold">
 <span>Trecho #{idx + 1} ({f.type === "outbound" ? "Ida" : "Volta"})</span>
 <div className="flex items-center gap-1 shrink-0">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 title="Duplicar trecho"
 aria-label="Duplicar trecho"
 onClick={() => handleDuplicateFlight(f.id)}
 className="h-11 w-11 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Copy className="size-3.5" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 title="Remover trecho"
 aria-label="Remover trecho"
 onClick={() => handleRemoveFlight(f.id)}
 className="h-11 w-11 sm:h-8 sm:w-8 p-0 text-destructive focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Trash className="size-3.5" />
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <Input
 placeholder="Cia (Ex: GOL, LATAM)"
 value={f.airline_name || f.airline || ""}
 onChange={(e) => { handleFlightChange(f.id, "airline_name", e.target.value); handleFlightChange(f.id, "airline", e.target.value); }}
 className="h-11 sm:h-8 text-xs rounded-lg"
 />
 <Input
 placeholder="Nº Voo (Ex: LA3241)"
 value={f.flight_number || ""}
 onChange={(e) => handleFlightChange(f.id, "flight_number", e.target.value)}
 className="h-11 sm:h-8 text-xs rounded-lg"
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
 className="h-11 sm:h-8 text-xs rounded-lg uppercase font-mono w-16"
 />
 <Input
 placeholder="08:30"
 value={f.departure_time}
 onChange={(e) => handleFlightChange(f.id, "departure_time", e.target.value)}
 className="h-11 sm:h-8 text-xs rounded-lg flex-1"
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
 className="h-11 sm:h-8 text-xs rounded-lg uppercase font-mono w-16"
 />
 <Input
 placeholder="10:00"
 value={f.arrival_time}
 onChange={(e) => handleFlightChange(f.id, "arrival_time", e.target.value)}
 className="h-11 sm:h-8 text-xs rounded-lg flex-1"
 />
 </div>
 </div>
 </div>

 <FlightConnectionEditorField
   flight={f}
   onUpdateConnections={(nextConns) => {
     onChange({
       flights: proposal.flights.map((seg) =>
         seg.id === f.id
           ? {
               ...seg,
               connection_airports: nextConns,
               stops_count: Math.max(nextConns.length, Number(seg.stops_count ?? seg.stops ?? 0)),
               stops: Math.max(nextConns.length, Number(seg.stops_count ?? seg.stops ?? 0)),
             }
           : seg,
       ),
     });
   }}
 />

 <Input
 placeholder="Bagagem (Ex: 1x 10kg + Mochila)"
 value={typeof f.baggage_included === "boolean" ? (f.baggage_included ? "Inclusa" : "Não inclusa") : (f.baggage_included || "")}
 onChange={(e) => handleFlightChange(f.id, "baggage_included", e.target.value)}
 className="h-11 sm:h-8 text-xs rounded-lg"
 />
 <div className="grid grid-cols-2 gap-2">
   <Input
     type="date"
     value={f.departure_date || (f as any).date || ""}
     onChange={(e) => { handleFlightChange(f.id, "departure_date", e.target.value); handleFlightChange(f.id, "date" as any, e.target.value); }}
     className="h-11 sm:h-8 text-xs rounded-lg"
   />
   <select
     value={f.stops_count ?? f.stops ?? 0}
     onChange={(e) => handleFlightChange(f.id, "stops_count", Number(e.target.value))}
     className="h-11 sm:h-8 text-xs rounded-lg bg-background border border-border px-2"
   >
     <option value={0}>Voo Direto</option>
     <option value={1}>1 Parada / Conexão</option>
     <option value={2}>2+ Paradas</option>
   </select>
 </div>
 </div>
 ))}

          {/* Seção de Captura e Sincronização do Mapa Geodésico */}
          <div className="pt-3 border-t border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="size-3.5 text-primary" />
                <span className="text-2xs font-bold text-foreground">Mapa da Rota & Satélite (PDF/Web)</span>
              </div>
              {(proposal.captured_map_url || proposal.map_image_url) && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange({ captured_map_url: null, map_image_url: null })}
                  className="h-11 min-h-11 px-3 text-xs text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <RotateCcw className="size-3.5 mr-1" />
                  Resetar para Vetorial
                </Button>
              )}
            </div>
            <p className="text-2xs text-muted-foreground leading-relaxed">
              O mapa vetorial geográfico renderiza aeroportos, silhueta costeira e conexões sem risco de CORS no PDF. Para incluir captura cartográfica por satélite, capture uma foto no mapa abaixo:
            </p>
            <StudioMapWidget
              agencyId={proposal.store_id || (proposal as any).agency_id || ""}
              proposalId={proposal.id || "temp"}
              waypoints={flightWaypoints}
              onMapCaptured={(url) => {
                onChange({ captured_map_url: url, map_image_url: url });
                toast.success("Foto do mapa capturada e vinculada à lâmina!");
              }}
            />
          </div>
 </TabsContent>

 {/* ── ABA 3: HOTELARIA / UNIDADE / FICHA ── */}
 <TabsContent value="hotel" className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-2xs font-bold text-foreground">{nicheCopy.hotelsTitle}</span>
 <div className="flex items-center gap-2">
 <Button
 type="button"
 size="sm"
 variant={passHubTabOpen === "hotel" ? "default" : "outline"}
 onClick={() => setPassHubTabOpen((prev) => (prev === "hotel" ? null : "hotel"))}
 className="h-11 sm:h-8 text-xs rounded-lg gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Search className="size-3.5" /> Cotar PassHub
 </Button>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={handleAddHotel}
 className="h-11 sm:h-8 text-xs rounded-lg gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Plus className="size-3.5" /> Adicionar {nicheCopy.showAviationAndHotelTerms ? "Manual" : "Item"}
 </Button>
 </div>
 </div>

 {/* Importar do Banco de Hotéis */}
 {nicheCopy.showAviationAndHotelTerms && isLoadingHotelsBank && (
 <Skeleton className="h-20 w-full rounded-lg" />
 )}
 {nicheCopy.showAviationAndHotelTerms && !isLoadingHotelsBank && hotelsBank && hotelsBank.length > 0 && (
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
 className="w-full h-11 sm:h-8 text-xs rounded-lg bg-background border border-border px-2 text-foreground"
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

 {/* Buscador PassHub para Hotéis & Pacotes Reais */}
 {passHubTabOpen === "hotel" && (
 <PassHubLiveQuoterPanel
 compact
 defaultCategories={["hotels", "packages"]}
 initialDestinationCity={proposal.destination_city || ""}
 initialDepartureDate={proposal.travel_start_date || ""}
 initialReturnDate={proposal.travel_end_date || ""}
 onAddHotel={(hotel: HotelDTO) => {
 const hotelOption: HotelOptionDTO = {
 id: hotel.id || `ht_${Date.now()}`,
 hotel_name: hotel.hotel_name || "Hotel",
 stars: hotel.stars,
 room_type: hotel.room_type,
 board_basis: hotel.board_basis,
 checkin_date: hotel.checkin_date || proposal.travel_start_date || "",
 checkout_date: hotel.checkout_date || proposal.travel_end_date || "",
 nights_count: hotel.nights_count,
 image_url: hotel.image_url,
 amenities: hotel.amenities,
 };
 onChange({
 hotels: [...proposal.hotels, hotelOption],
 cover_image_url: proposal.cover_image_url || hotel.image_url || "",
 });
 toast.success(`Hotel ${hotelOption.hotel_name} importado do PassHub!`);
 }}
 onImportPackage={(pkg) => {
 if (pkg.hotelName) {
 onChange({
 hotels: [
 ...proposal.hotels,
 {
 id: `ht_${Date.now()}`,
 hotel_name: pkg.hotelName,
 checkin_date: pkg.departureDate || proposal.travel_start_date || "",
 checkout_date: pkg.returnDate || proposal.travel_end_date || "",
 nights_count: pkg.nights || 1,
 board_basis: pkg.boardType || undefined,
 image_url: pkg.imageUrl || undefined,
 },
 ],
 includes: Array.from(new Set([...(proposal.includes || []), ...(pkg.includedItems || [])])),
 });
 }
 toast.success(`Pacote "${pkg.packageName}" importado!`);
 }}
 />
 )}

 {proposal.hotels.map((h, hIdx) => {
 const matchedBankHotel = hotelsBank.find((hb: any) =>
 hb.name?.toLowerCase().trim() === h.hotel_name?.toLowerCase().trim() ||
 h.hotel_name?.toLowerCase().includes(hb.name?.toLowerCase())
 );

 return (
 <div key={h.id} className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2">
 <div className="flex items-center justify-between gap-2 text-xs font-bold">
 <span className="truncate">{h.hotel_name || `Novo ${nicheCopy.hotelBadgeLabel}`}</span>
 <div className="flex items-center gap-1 shrink-0">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 title="Duplicar item"
 aria-label="Duplicar item"
 onClick={() => handleDuplicateHotel(h.id)}
 className="h-7 size-7 p-0 text-muted-foreground hover:text-primary min-h-11 sm:min-h-0 min-w-11 sm:min-w-0 focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Copy className="size-3.5" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 title="Remover item"
 aria-label="Remover item"
 onClick={() => handleRemoveHotel(h.id)}
 className="h-7 size-7 p-0 text-destructive min-h-11 sm:min-h-0 min-w-11 sm:min-w-0 focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Trash className="size-3.5" />
 </Button>
 </div>
 </div>

 <Input
 placeholder={nicheCopy.hotelNamePlaceholder}
 value={h.hotel_name}
 onChange={(e) => handleHotelChange(h.id, "hotel_name", e.target.value)}
 className="h-8 text-xs rounded-lg"
 />

 <div className={nicheCopy.showAviationAndHotelTerms ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
 <Input
 placeholder={nicheCopy.showAviationAndHotelTerms ? "Quarto (Ex: Vista Mar)" : "Especificação / Versão / Padrão"}
 value={h.room_type}
 onChange={(e) => handleHotelChange(h.id, "room_type", e.target.value)}
 className="h-11 sm:h-8 text-xs rounded-lg"
 />
 {nicheCopy.showAviationAndHotelTerms && (
 <select
 value={h.board_basis}
 onChange={(e) => handleHotelChange(h.id, "board_basis", e.target.value)}
 className="h-11 sm:h-8 text-xs rounded-lg bg-background border border-border px-2"
 >
 <option value="all_inclusive">All Inclusive</option>
 <option value="full_board">Pensão Completa</option>
 <option value="half_board">Meia Pensão</option>
 <option value="breakfast">Café da Manhã</option>
 <option value="none">Sem Alimentação</option>
 </select>
 )}
 </div>
 {nicheCopy.showAviationAndHotelTerms && (
 <div className="grid grid-cols-2 gap-2">
   <div>
     <label className="text-3xs font-mono uppercase text-muted-foreground">Check-in</label>
     <Input
       type="date"
       value={h.checkin_date || h.check_in || ""}
       onChange={(e) => handleHotelChange(h.id, "checkin_date", e.target.value)}
       className="h-11 sm:h-8 text-xs rounded-lg mt-1"
     />
   </div>
   <div>
     <label className="text-3xs font-mono uppercase text-muted-foreground">Check-out</label>
     <Input
       type="date"
       value={h.checkout_date || h.check_out || ""}
       onChange={(e) => handleHotelChange(h.id, "checkout_date", e.target.value)}
       className="h-11 sm:h-8 text-xs rounded-lg mt-1"
     />
   </div>
 </div>
 )}

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

 {/* Mídias do Hotel / Unidade / Produto */}
 <div className="pt-2 border-t border-border/40">
 <MediaGalleryField
   label="Fotos e Vídeos do Hotel"
   items={normalizeEntityMediaList({
     media: h.media,
     featured_image_url: h.featured_image_url,
     image_url: h.image_url,
     images: h.images,
     video_url: h.video_url,
     object_position: h.object_position,
     image_scale: h.image_scale,
   })}
   onChange={(nextMedia) => handleHotelMediaChange(hIdx, nextMedia)}
   bucket="cms-media"
   allowVideos={true}
   defaultAspectPreset="4:3"
 />
 </div>
 </div>
 );
 })}
 </TabsContent>

 {/* ── ABA 4: ROTEIRO DIA A DIA ── */}
 
        {/* ── ABA 3.5: RODOVIÁRIO & TRANSPORTE TERRESTRE ── */}
        <TabsContent value="rodoviario" className="space-y-4">
          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Bus className="size-4 text-primary" />
                <span>Transporte Terrestre ({currentTransfers.length})</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextIdx = currentTransfers.length;
                  handleAddTransfer();
                  setSelectedTransferIndex(nextIdx);
                }}
                className="h-11 min-h-11 px-3 text-xs font-semibold gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-3.5" />
                <span>Novo Trecho</span>
              </Button>
            </div>

            {currentTransfers.length > 1 && (
              <div className="space-y-1">
                <Label className="text-2xs font-bold">Trecho em Edição</Label>
                <select
                  value={currentTransfers[selectedTransferIndex] ? selectedTransferIndex : 0}
                  onChange={(e) => setSelectedTransferIndex(Number(e.target.value))}
                  className="w-full h-11 rounded-lg bg-background border border-border text-xs px-2"
                >
                  {currentTransfers.map((tr: any, idx: number) => (
                    <option key={tr.id || idx} value={idx}>
                      Trecho #{idx + 1}: {resolveTransferDisplayTitle(tr, idx)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(() => {
              const activeTr: any = currentTransfers[selectedTransferIndex] || currentTransfers[0] || {};
              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <Label className="text-2xs font-bold">Tipo / Frota</Label>
                      <Input
                        placeholder="Ex: Ônibus Leito DD, 4x4, Van Executiva"
                        value={activeTr.vehicle || activeTr.vehicle_type || activeTr.type || ""}
                        onChange={(e) =>
                          updatePrimaryRodoviarioTransfer({
                            vehicle: e.target.value,
                            vehicle_type: e.target.value,
                          })
                        }
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-2xs font-bold">Nome do Trecho / Linha</Label>
                      <Input
                        placeholder="Ex: Traslado Fortaleza ↔ Jericoacoara"
                        value={activeTr.name || activeTr.route_name || activeTr.route || activeTr.description || ""}
                        onChange={(e) =>
                          updatePrimaryRodoviarioTransfer({
                            name: e.target.value,
                            title: e.target.value,
                            route: e.target.value,
                            route_name: e.target.value,
                            description: e.target.value,
                          })
                        }
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <Label className="text-2xs font-bold">Ponto e Horário de Embarque</Label>
                      <Input
                        placeholder="Ex: Chapecó - Posto Bertaso (20:00)"
                        value={activeTr.pickup_time || ""}
                        onChange={(e) => updatePrimaryRodoviarioTransfer({ pickup_time: e.target.value })}
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-2xs font-bold">Previsão de Chegada</Label>
                      <Input
                        placeholder="Ex: Hotel - Receptivo (14:00)"
                        value={activeTr.dropoff_time || ""}
                        onChange={(e) => updatePrimaryRodoviarioTransfer({ dropoff_time: e.target.value })}
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <Label className="text-2xs font-bold">Observações / Cidades Intermediárias</Label>
                    <Textarea
                      placeholder="Ex: Embarques ou orientações deste trecho..."
                      value={activeTr.notes || ""}
                      onChange={(e) => updatePrimaryRodoviarioTransfer({ notes: e.target.value })}
                      className="text-xs rounded-lg min-h-16"
                    />
                  </div>
                </>
              );
            })()}
          </div>
        </TabsContent>

        <TabsContent value="cruzeiro" className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <Ship className="size-3.5 text-primary" />
              <span>Cruzeiros Marítimos ({currentCruises.length})</span>
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleAddCruise()}
              className="h-11 min-h-11 px-3 text-xs rounded-lg gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-3.5" /> Adicionar Cruzeiro
            </Button>
          </div>

          {/* Presets Rápidos com 1 Clique */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <span className="text-2xs font-bold text-primary uppercase tracking-wider block">
              Roteiros Rápidos Pré-configurados (1 Clique)
            </span>
            <div className="grid grid-cols-1 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  handleAddCruise({
                    ship_name: "MSC Grandiosa",
                    company: "MSC Cruzeiros",
                    cabin_category: "Cabine com Varanda Vista Mar",
                    departure_port: "Santos (São Paulo), Brasil",
                    arrival_port: "Santos (São Paulo), Brasil",
                    duration_nights: 3,
                    board_basis: "Pensão Completa",
                    notes: "Taxas portuárias, de serviço e gorjetas inclusas. Experiência Fantastica.",
                    itinerary: [
                      { day: 1, port: "Santos (São Paulo), Brasil", arrival_time: "-", departure_time: "18:00", notes: "Embarque no Concais e saída ao pôr do sol", activity_type: "boarding" },
                      { day: 2, port: "Em navegação", is_sea_day: true, arrival_time: "-", departure_time: "-", notes: "Dia livre curtindo as piscinas e shows a bordo", activity_type: "sea" },
                      { day: 3, port: "Búzios, Brasil", arrival_time: "07:00", departure_time: "16:00", notes: "Desembarque de lancha na Praia dos Ossos / Rua das Pedras", activity_type: "dock" },
                      { day: 4, port: "Santos (São Paulo), Brasil", arrival_time: "08:00", departure_time: "-", notes: "Desembarque final pela manhã", activity_type: "disembark" },
                    ],
                  })
                }
                className="h-11 min-h-11 text-2xs justify-start rounded-lg text-left font-medium hover:bg-primary/10"
              >
                <Anchor className="size-3.5 text-primary mr-2 shrink-0" />
                <span>MSC 4D/3N: Santos -&gt; Búzios -&gt; Santos</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  handleAddCruise({
                    ship_name: "Costa Diadema",
                    company: "Costa Cruzeiros",
                    cabin_category: "Cabine Externa com Janela",
                    departure_port: "Santos (São Paulo), Brasil",
                    arrival_port: "Santos (São Paulo), Brasil",
                    duration_nights: 4,
                    board_basis: "Pensão Completa (All Inclusive disponível)",
                    notes: "Estilo italiano autêntico no mar. Festas temáticas inclusas.",
                    itinerary: [
                      { day: 1, port: "Santos (São Paulo), Brasil", arrival_time: "-", departure_time: "17:00", notes: "Embarque e saída de Santos", activity_type: "boarding" },
                      { day: 2, port: "Ilhabela, Brasil", arrival_time: "08:00", departure_time: "17:00", notes: "Escala em Ilhabela com praias e cachoeiras", activity_type: "dock" },
                      { day: 3, port: "Rio de Janeiro, Brasil", arrival_time: "07:00", departure_time: "18:00", notes: "Parada no Pier Mauá, próximo ao Boulevard Olímpico", activity_type: "dock" },
                      { day: 4, port: "Em navegação", is_sea_day: true, arrival_time: "-", departure_time: "-", notes: "Navegação e relaxamento nos spas e restaurantes", activity_type: "sea" },
                      { day: 5, port: "Santos (São Paulo), Brasil", arrival_time: "08:00", departure_time: "-", notes: "Desembarque matutino", activity_type: "disembark" },
                    ],
                  })
                }
                className="h-11 min-h-11 text-2xs justify-start rounded-lg text-left font-medium hover:bg-primary/10"
              >
                <Anchor className="size-3.5 text-primary mr-2 shrink-0" />
                <span>Costa 5D/4N: Santos -&gt; Ilhabela -&gt; Rio -&gt; Santos</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  handleAddCruise({
                    ship_name: "MSC Seaview",
                    company: "MSC Cruzeiros",
                    cabin_category: "Suíte Aurea com Varanda",
                    departure_port: "Santos (São Paulo), Brasil",
                    arrival_port: "Santos (São Paulo), Brasil",
                    duration_nights: 7,
                    board_basis: "All Inclusive Premium Extra",
                    notes: "Design inovador voltado para o mar. Pacote de bebidas e internet inclusos.",
                    itinerary: [
                      { day: 1, port: "Santos (São Paulo), Brasil", arrival_time: "-", departure_time: "18:00", activity_type: "boarding" },
                      { day: 2, port: "Em navegação", is_sea_day: true, arrival_time: "-", departure_time: "-", activity_type: "sea" },
                      { day: 3, port: "Salvador, Brasil", arrival_time: "09:00", departure_time: "22:00", notes: "Passeio pelo Pelourinho e Mercado Modelo", activity_type: "dock" },
                      { day: 4, port: "Ilhéus, Brasil", arrival_time: "08:00", departure_time: "17:00", notes: "Fazendas de cacau e centro histórico", activity_type: "dock" },
                      { day: 5, port: "Em navegação", is_sea_day: true, arrival_time: "-", departure_time: "-", activity_type: "sea" },
                      { day: 6, port: "Búzios, Brasil", arrival_time: "08:00", departure_time: "17:00", activity_type: "dock" },
                      { day: 7, port: "Em navegação", is_sea_day: true, arrival_time: "-", departure_time: "-", activity_type: "sea" },
                      { day: 8, port: "Santos (São Paulo), Brasil", arrival_time: "08:00", departure_time: "-", activity_type: "disembark" },
                    ],
                  })
                }
                className="h-11 min-h-11 text-2xs justify-start rounded-lg text-left font-medium hover:bg-primary/10"
              >
                <Anchor className="size-3.5 text-primary mr-2 shrink-0" />
                <span>MSC 8D/7N: Santos -&gt; Salvador -&gt; Ilhéus -&gt; Santos</span>
              </Button>
            </div>
          </div>

          {currentCruises.length === 0 ? (
            <div className="p-4 text-center rounded-xl bg-muted/30 border border-dashed border-border/60 text-xs text-muted-foreground space-y-2">
              <Ship className="size-8 mx-auto text-muted-foreground/60" />
              <p>Nenhum cruzeiro marítimo adicionado nesta proposta.</p>
              <p className="text-2xs text-muted-foreground/80">
                Selecione um dos modelos pré-configurados acima ou clique em &quot;Adicionar Cruzeiro&quot; para montar o itinerário na costa.
              </p>
            </div>
          ) : (
            currentCruises.map((cr, idx) => {
              const itin = Array.isArray(cr.itinerary) ? cr.itinerary : [];
              return (
                <div key={cr.id || idx} className="p-3 sm:p-4 rounded-xl bg-muted/40 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-foreground">
                      <Ship className="size-4 text-primary" />
                      <span>{cr.ship_name || `Cruzeiro #${idx + 1}`}</span>
                      {cr.company && (
                        <span className="text-2xs font-normal text-muted-foreground">({cr.company})</span>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateCruise(idx)}
                        title="Duplicar cruzeiro"
                        className="h-11 size-11 p-0 text-muted-foreground hover:text-primary"
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCruise(idx)}
                        title="Remover cruzeiro"
                        className="h-11 size-11 p-0 text-destructive"
                      >
                        <Trash className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Visualização de Rota Costeira ao Vivo */}
                  <div className="space-y-1">
                    <Label className="text-2xs font-bold text-foreground">Mapa Costeiro da Rota (Prévia ao Vivo)</Label>
                    <div className="w-full h-44 rounded-xl overflow-hidden border border-border/60 bg-sky-950/20">
                      <CruiseRouteSvgMap
                        itinerary={itin}
                        className="w-full h-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold">Navio</Label>
                      <Input
                        placeholder="Ex: MSC Grandiosa"
                        value={cr.ship_name || ""}
                        onChange={(e) => handleUpdateCruise(idx, { ship_name: e.target.value })}
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold">Companhia</Label>
                      <Input
                        placeholder="Ex: MSC Cruzeiros ou Costa Cruzeiros"
                        value={cr.company || ""}
                        onChange={(e) => handleUpdateCruise(idx, { company: e.target.value })}
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold">Categoria de Cabine</Label>
                      <Input
                        placeholder="Ex: Cabine com Varanda Vista Mar"
                        value={cr.cabin_category || ""}
                        onChange={(e) => handleUpdateCruise(idx, { cabin_category: e.target.value })}
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold">Regime / Experiência</Label>
                      <Input
                        placeholder="Ex: Pensão Completa / Fantastica"
                        value={cr.board_basis || ""}
                        onChange={(e) => handleUpdateCruise(idx, { board_basis: e.target.value })}
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold">Porto de Embarque</Label>
                      <Input
                        placeholder="Ex: Santos"
                        value={cr.departure_port || ""}
                        onChange={(e) => handleUpdateCruise(idx, { departure_port: e.target.value })}
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold">Porto de Desembarque</Label>
                      <Input
                        placeholder="Ex: Santos"
                        value={cr.arrival_port || ""}
                        onChange={(e) => handleUpdateCruise(idx, { arrival_port: e.target.value })}
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold">Noites</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Noites"
                        value={cr.duration_nights || ""}
                        onChange={(e) => handleUpdateCruise(idx, { duration_nights: Number(e.target.value) || undefined })}
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold">Data de Embarque</Label>
                      <Input
                        type="date"
                        value={toDateInputValue(cr.departure_date)}
                        onChange={(e) => handleUpdateCruise(idx, { departure_date: e.target.value })}
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold">Data de Desembarque</Label>
                      <Input
                        type="date"
                        value={toDateInputValue(cr.return_date)}
                        onChange={(e) => handleUpdateCruise(idx, { return_date: e.target.value })}
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-2xs font-semibold">Foto Ilustrativa do Navio ou Cabine</Label>
                    <ImageUpload
                      value={cr.image_url || ""}
                      onChange={(url) => handleUpdateCruise(idx, { image_url: url })}
                      onRemove={() => handleUpdateCruise(idx, { image_url: "" })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-2xs font-semibold">Observações / Taxas / Incluso</Label>
                    <Textarea
                      placeholder="Ex: Taxas portuárias e gorjetas inclusas. Bebidas servidas às refeições..."
                      value={cr.notes || ""}
                      onChange={(e) => handleUpdateCruise(idx, { notes: e.target.value })}
                      className="text-xs rounded-lg min-h-16"
                    />
                  </div>

                  {/* ITINERÁRIO DIA A DIA DO CRUZEIRO */}
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Calendar className="size-3.5 text-primary" />
                        Itinerário Dia a Dia ({itin.length} dias)
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddCruiseDay(idx)}
                        className="h-11 min-h-11 px-3 text-xs rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Plus className="size-3.5" /> Dia
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {itin.map((d, dayIdx) => (
                        <div key={dayIdx} className="p-3 rounded-lg bg-background/80 border border-border/60 space-y-2">
                          <div className="flex items-center justify-between text-2xs font-bold">
                            <span className="text-primary flex items-center gap-1">
                              <span className="size-2 rounded-full bg-primary inline-block" />
                              DIA {d.day}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCruiseDay(idx, dayIdx)}
                              className="h-11 min-h-11 size-11 p-0 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
                              title="Remover dia"
                            >
                              <Trash className="size-3.5" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="sm:col-span-2 space-y-1">
                              <Input
                                placeholder="Porto / Cidade (Ex: Santos, Búzios, Ilhabela...)"
                                value={d.is_sea_day ? "Em navegação" : d.port || ""}
                                disabled={Boolean(d.is_sea_day)}
                                onChange={(e) => handleUpdateCruiseDay(idx, dayIdx, { port: e.target.value })}
                                className="h-10 text-xs rounded-lg"
                              />
                            </div>
                            <label className="inline-flex items-center gap-2 cursor-pointer h-10 px-2 rounded-lg bg-muted/30 border border-border/50 text-2xs text-foreground">
                              <input
                                type="checkbox"
                                checked={Boolean(d.is_sea_day)}
                                onChange={(e) =>
                                  handleUpdateCruiseDay(idx, dayIdx, {
                                    is_sea_day: e.target.checked,
                                    port: e.target.checked ? "Em navegação" : "",
                                    arrival_time: e.target.checked ? "-" : d.arrival_time,
                                    departure_time: e.target.checked ? "-" : d.departure_time,
                                  })
                                }
                              />
                              <span>Em navegação</span>
                            </label>
                          </div>

                          {!d.is_sea_day && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-3xs text-muted-foreground">Chegada (ARR)</Label>
                                <Input
                                  placeholder="Ex: 08:00 ou -"
                                  value={d.arrival_time || ""}
                                  onChange={(e) => handleUpdateCruiseDay(idx, dayIdx, { arrival_time: e.target.value })}
                                  className="h-9 text-xs rounded-lg"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-3xs text-muted-foreground">Partida (DEP)</Label>
                                <Input
                                  placeholder="Ex: 18:00 ou -"
                                  value={d.departure_time || ""}
                                  onChange={(e) => handleUpdateCruiseDay(idx, dayIdx, { departure_time: e.target.value })}
                                  className="h-9 text-xs rounded-lg"
                                />
                              </div>
                            </div>
                          )}

                          <Input
                            placeholder="Atividade / Detalhes deste dia (Opcional)"
                            value={d.notes || ""}
                            onChange={(e) => handleUpdateCruiseDay(idx, dayIdx, { notes: e.target.value })}
                            className="h-9 text-2xs rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
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
 disabled={isGeneratingItinerary}
 onClick={handleGenerateItineraryFromDestination}
 className="h-11 text-2xs rounded-lg gap-1 text-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 title="Gerar Roteiro"
 >
 {isGeneratingItinerary ? (
   <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
 ) : (
   <Compass className="size-3.5" />
 )}
 <span>{isGeneratingItinerary ? "Gerando..." : "Sugerir Dias"}</span>
 </Button>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={handleAddItineraryDay}
 className="h-11 text-xs rounded-lg gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
 disabled={isGeneratingItinerary}
 onClick={handleGenerateItineraryFromDestination}
 className="h-11 min-h-11 text-xs rounded-lg font-bold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 {isGeneratingItinerary ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Compass className="size-3.5" />}
 <span>{isGeneratingItinerary ? "Gerando Roteiro..." : "Gerar Roteiro"}</span>
 </Button>
 </div>
 ) : (
 proposal.itinerary.map((day, idx) => (
 <div key={day.id} className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2">
 <div className="flex items-center justify-between gap-2 text-xs font-bold">
 <span className="text-primary font-mono text-2xs">
 {nicheCopy.itineraryStepPrefix} {day.day_number || idx + 1}
 </span>
 <div className="flex items-center gap-1 shrink-0">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 title="Duplicar etapa"
 aria-label="Duplicar etapa"
 onClick={() => handleDuplicateItineraryDay(day.id)}
 className="h-7 size-7 p-0 text-muted-foreground hover:text-primary min-h-11 sm:min-h-0 min-w-11 sm:min-w-0 focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Copy className="size-3.5" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 title="Remover etapa"
 aria-label="Remover etapa"
 onClick={() => handleRemoveItineraryDay(day.id)}
 className="h-7 size-7 p-0 text-destructive min-h-11 sm:min-h-0 min-w-11 sm:min-w-0 focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Trash className="size-3.5" />
 </Button>
 </div>
 </div>

 <Input
 placeholder={nicheCopy.itineraryTitlePlaceholder}
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
     placeholder="Refeições / Inclusos (opcional)"
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

 {/* Mídias da Etapa do Roteiro */}
 <div className="pt-2 border-t border-border/40">
   <MediaGalleryField
     label="Fotos e Vídeos do Dia"
     items={normalizeEntityMediaList({
       media: day.media,
       image_url: day.image_url,
       images: day.images,
       video_url: day.video_url,
       object_position: day.object_position,
       image_scale: day.image_scale,
     })}
     onChange={(nextMedia) => handleItineraryMediaChange(idx, nextMedia)}
     bucket="cms-media"
     allowVideos={true}
     defaultAspectPreset="16:9"
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
     <div className="flex items-center justify-between gap-2 flex-wrap">
       <span className="text-xs font-bold text-foreground flex items-center gap-2">
         <Car className="size-3.5 text-primary" />
         <span>{nicheCopy.transfersTitle} ({currentTransfers.length})</span>
       </span>
       <div className="flex items-center gap-2">
         {currentTransfers.length > 1 && (
           <Button
             type="button"
             size="sm"
             variant="ghost"
             onClick={() => {
               onChange({ transfers: sortTransfersChronologically(currentTransfers) as any });
               toast.success("Traslados ordenados cronologicamente.");
             }}
             className="h-11 text-xs rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             Ordenar por Data
           </Button>
         )}
         <Button
           type="button"
           size="sm"
           variant={passHubTabOpen === "servicos" ? "default" : "outline"}
           onClick={() => setPassHubTabOpen((prev) => (prev === "servicos" ? null : "servicos"))}
           className="h-11 text-xs rounded-lg gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
         >
           <Search className="size-3.5" /> Cotar PassHub
         </Button>
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
     </div>

     {passHubTabOpen === "servicos" && (
       <PassHubLiveQuoterPanel
         compact
         defaultCategories={["transfers", "activities", "cars"]}
         initialDestinationCity={proposal.destination_city || ""}
         initialDepartureDate={proposal.travel_start_date || ""}
         initialReturnDate={proposal.travel_end_date || ""}
         onAddTransfer={(transfer: TransferDTO) => {
           onChange({ transfers: [...currentTransfers, transfer] });
           toast.success(`Transfer "${transfer.route_name || transfer.vehicle || "Executivo"}" adicionado!`);
         }}
         onAddTour={(tour: TourOptionDTO) => {
           onChange({
             tours: [...currentTours, tour],
             ...(tour.included && tour.title && !currentIncludes.includes(tour.title)
               ? { includes: [...currentIncludes, tour.title] }
               : {}),
           });
           toast.success(`Passeio "${tour.title}" adicionado ao roteiro de experiências!`);
         }}
         onAddCar={(car) => {
           onChange({
             transfers: [
               ...currentTransfers,
               {
                 id: car.id,
                 type: "Locação de Veículo",
                 vehicle: `${car.vehicleModelExample || car.vehicleCategory} (${car.rentalCompany})`,
                 route: car.pickupLocation,
                 price_cents: car.totalPriceCents,
                 notes: `${car.vehicleCategory} · ${car.transmission}`,
               },
             ],
           });
           toast.success(`Locação "${car.vehicleModelExample || car.vehicleCategory}" adicionada!`);
         }}
       />
     )}

     {currentTransfers.length === 0 ? (
       <div className="p-3 text-center rounded-lg bg-muted/30 border border-dashed border-border/60 text-xs text-muted-foreground">
         Nenhum traslado adicionado.
       </div>
     ) : (
       currentTransfers.map((tr: any, idx: number) => (
         <div key={tr.id || idx} className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2">
           <div className="flex items-center justify-between text-xs font-bold">
             <span>{String(idx + 1).padStart(2, "0")} · {resolveTransferKindBadge(tr.kind || tr.type)}</span>
             <div className="flex items-center gap-1">
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 onClick={() => handleDuplicateTransfer(idx)}
                 title="Duplicar traslado"
                 aria-label="Duplicar traslado"
                 className="h-11 size-11 p-0 text-muted-foreground hover:text-primary"
               >
                 <Copy className="size-3.5" />
               </Button>
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 onClick={() => handleRemoveTransfer(idx)}
                 title="Remover traslado"
                 aria-label="Remover traslado"
                 className="h-11 size-11 p-0 text-destructive"
               >
                 <Trash className="size-3.5" />
               </Button>
             </div>
           </div>
           <Input
             placeholder="Nome do Traslado / Serviço (Ex: Aeroporto ↔ Resort)"
             value={tr.name || tr.title || tr.route_name || tr.route || tr.description || ""}
             onChange={(e) =>
               handleUpdateTransfer(idx, {
                 name: e.target.value,
                 title: e.target.value,
                 route_name: e.target.value,
                 route: e.target.value,
                 description: e.target.value,
               })
             }
             className="h-11 text-xs rounded-lg"
           />
           <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
             <select
               value={tr.is_private === false || tr.type === "shared" ? "shared" : "private"}
               onChange={(e) =>
                 handleUpdateTransfer(idx, {
                   type: e.target.value,
                   is_private: e.target.value === "private",
                 })
               }
               className="h-11 text-xs rounded-lg bg-background border border-border px-2"
             >
               <option value="private">Privativo</option>
               <option value="shared">Regular / Compartilhado</option>
             </select>
             <Input
               placeholder="Veículo (Ex: 4x4, Van)"
               value={tr.vehicle || tr.vehicle_type || ""}
               onChange={(e) =>
                 handleUpdateTransfer(idx, {
                   vehicle: e.target.value,
                   vehicle_type: e.target.value,
                 })
               }
               className="h-11 text-xs rounded-lg"
             />
             <Input
               type="date"
               value={toDateInputValue(tr.date)}
               onChange={(e) => handleUpdateTransfer(idx, { date: e.target.value })}
               className="h-11 text-xs rounded-lg"
             />
             <Input
               type="time"
               aria-label="Horário do traslado"
               value={tr.pickup_time || ""}
               onChange={(e) => handleUpdateTransfer(idx, { pickup_time: e.target.value })}
               className="h-11 text-xs rounded-lg"
             />
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
             <Input
               placeholder="Valor R$ (ex: 243,06)"
               value={tr.price_cents ? (tr.price_cents / 100).toFixed(2) : ""}
               onChange={(e) => {
                 const cents = parseReaisToCents(e.target.value, true);
                 if (cents !== null) handleUpdateTransfer(idx, { price_cents: cents });
               }}
               className="h-11 text-xs rounded-lg font-mono"
             />
             <Input
               placeholder="Observações (Ex: Placa nominal)"
               value={tr.notes || ""}
               onChange={(e) => handleUpdateTransfer(idx, { notes: e.target.value })}
               className="h-11 text-xs rounded-lg"
             />
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
             <Input
               placeholder="Ponto de Encontro (Ex: Desembarque Portão B)"
               value={tr.meeting_point || ""}
               onChange={(e) => handleUpdateTransfer(idx, { meeting_point: e.target.value })}
               className="h-11 text-xs rounded-lg"
             />
             <Input
               placeholder="Bagagem Permitida (Ex: 1 mala 23kg + 1 de mão)"
               value={tr.luggage_notes || ""}
               onChange={(e) => handleUpdateTransfer(idx, { luggage_notes: e.target.value })}
               className="h-11 text-xs rounded-lg"
             />
           </div>
           <div className="space-y-1">
             <Label className="text-2xs font-semibold text-muted-foreground">Foto Ilustrativa do Veículo ou Traslado (Opcional)</Label>
             <ImageUpload
               value={tr.image_url || ""}
               onChange={(url) => handleUpdateTransfer(idx, { image_url: url })}
               onRemove={() => handleUpdateTransfer(idx, { image_url: "" })}
             />
           </div>
           <label className="inline-flex items-center gap-2 cursor-pointer min-h-11 text-xs text-foreground">
             <input
               type="checkbox"
               checked={Boolean(tr.add_to_quote)}
               onChange={(e) => handleUpdateTransfer(idx, { add_to_quote: e.target.checked })}
             />
             <span>Somar valor deste traslado ao Total da Proposta</span>
           </label>
         </div>
       ))
     )}
   </div>

   {/* Bloco 2: Passeios, Experiências & Adicionais */}
   <div className="space-y-2 pt-3 border-t border-border/60">
     <div className="flex items-center justify-between">
       <span className="text-xs font-bold text-foreground flex items-center gap-2">
         <Compass className="size-3.5 text-primary" />
         <span>{nicheCopy.toursTitle} ({currentTours.length})</span>
       </span>
       <Button
         type="button"
         size="sm"
         variant="outline"
         onClick={handleAddTour}
         className="h-11 sm:h-9 text-xs rounded-lg gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
       >
         <Plus className="size-3.5" /> {nicheCopy.showAviationAndHotelTerms ? "Passeio" : "Item"}
       </Button>
     </div>

     {/* Importar de Excursões / Grupos da Agência */}
     {nicheCopy.showAviationAndHotelTerms && isLoadingGroupTours && (
       <Skeleton className="h-20 w-full rounded-lg" />
     )}
     {nicheCopy.showAviationAndHotelTerms && !isLoadingGroupTours && Array.isArray(groupTours) && groupTours.length > 0 && (
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
         Nenhum item ou experiência cadastrada.
       </div>
     ) : (
       currentTours.map((tour: any, idx: number) => {
         const tourPhotos: string[] = Array.isArray(tour.images)
           ? tour.images.filter(Boolean)
           : tour.image_url
             ? [tour.image_url]
             : [];
         return (
         <div key={tour.id || idx} className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-2">
           <div className="flex items-center justify-between text-xs font-bold">
             <span>{nicheCopy.showAviationAndHotelTerms ? "Passeio" : "Item"} #{idx + 1}</span>
             <div className="flex items-center gap-1">
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 onClick={() => handleDuplicateTour(idx)}
                 title="Duplicar item"
                 aria-label="Duplicar item"
                 className="h-11 size-11 p-0 text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <Copy className="size-3.5" />
               </Button>
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 onClick={() => handleRemoveTour(idx)}
                 title="Remover item"
                 aria-label="Remover item"
                 className="h-11 size-11 p-0 text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <Trash className="size-3.5" />
               </Button>
             </div>
           </div>
           <Input
             placeholder={
               nicheCopy.showAviationAndHotelTerms
                 ? "Nome do Passeio (Ex: Catamarã Maragogi + Mergulho)"
                 : "Nome do Item / Entregável / Adicional"
             }
             value={tour.title || tour.description || ""}
             onChange={(e) => handleUpdateTour(idx, { title: e.target.value })}
             className="h-11 text-xs rounded-lg"
           />
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
             <Input
               type="date"
               value={toDateInputValue(tour.date)}
               onChange={(e) => handleUpdateTour(idx, { date: e.target.value })}
               className="h-11 text-xs rounded-lg"
             />
             <Input
               placeholder="Duração (Ex: Dia inteiro)"
               value={tour.duration || ""}
               onChange={(e) => handleUpdateTour(idx, { duration: e.target.value })}
               className="h-11 text-xs rounded-lg"
             />
             <Input
               placeholder="Valor R$"
               value={tour.price_cents ? (tour.price_cents / 100).toFixed(2) : ""}
               onChange={(e) => {
                 const cents = parseReaisToCents(e.target.value, true);
                 if (cents !== null) handleUpdateTour(idx, { price_cents: cents });
               }}
               className="h-11 text-xs rounded-lg font-mono"
             />
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
             <select
               value={tour.included === false ? "optional" : "included"}
               onChange={(e) =>
                 handleUpdateTour(idx, {
                   included: e.target.value === "included",
                   is_included: e.target.value === "included",
                 })
               }
               className="w-full h-11 text-xs rounded-lg bg-background border border-border px-2"
             >
               <option value="included">Incluso na Proposta</option>
               <option value="optional">Opcional Sugerido</option>
             </select>
             <label className="inline-flex items-center gap-2 px-3 rounded-lg border border-border/60 bg-background cursor-pointer min-h-11 text-xs text-foreground">
               <input
                 type="checkbox"
                 checked={Boolean(tour.add_to_quote)}
                 onChange={(e) => handleUpdateTour(idx, { add_to_quote: e.target.checked })}
               />
               <span>Somar ao Total</span>
             </label>
           </div>

           {/* Mídias do Passeio / Experiência / Item */}
           <div className="pt-2 border-t border-border/40">
             <MediaGalleryField
               label="Fotos e Vídeos do Passeio"
               items={normalizeEntityMediaList({
                 media: tour.media,
                 image_url: tour.image_url,
                 images: tour.images,
                 video_url: tour.video_url,
                 object_position: tour.object_position,
                 image_scale: tour.image_scale,
               })}
               onChange={(nextMedia) => handleTourMediaChange(idx, nextMedia)}
               bucket="cms-media"
               allowVideos={true}
               defaultAspectPreset="4:3"
             />
           </div>
         </div>
       )})
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
 {computeExtraServicesChargeCents(currentTransfers, currentTours) > 0 && (
   <div className="px-3 py-1 rounded-lg bg-muted/40 border border-border/50 text-2xs text-muted-foreground flex items-center justify-between">
     <span>Extras somados (Traslados + Passeios):</span>
     <span className="font-mono font-semibold text-foreground">
       {formatMoney(computeExtraServicesChargeCents(currentTransfers, currentTours))}
     </span>
   </div>
 )}
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

 <StudioSupplierInstallmentsCard
   suppliers={studioSuppliers}
   resolvedInstallments={resolvedInstallments}
   installmentsOptions={proposal.pricing?.installments_options}
   onApplyPolicy={applyPaymentPolicyToProposal}
 />

 {/* ── OPÇÕES DE EXIBIÇÃO DO PREÇO NA LÂMINA ── */}
 <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-3">
 <div className="flex items-center justify-between gap-2">
   <span className="text-xs font-bold text-foreground block">Exibição de Valores na Proposta</span>
   <span className="text-2xs font-mono font-bold text-primary">
     {currentRooms.length} {nicheCopy.showAviationAndHotelTerms ? (currentRooms.length === 1 ? "quarto" : "quartos") : "itens"}
   </span>
 </div>

 {/* Preview automático calculado em tempo real */}
 {(() => {
   const totalCents = proposal.pricing?.total_price_cents || 0;
   const paxCount = Math.max(1, totalAdults + totalChildren);
   const adultsCountSafe = Math.max(1, totalAdults);
   const customUnit = activeCanvasTheme.pricingDisplay.customPerPersonCents;
   const computedPerPerson = customUnit && customUnit > 0 ? customUnit : Math.round(totalCents / paxCount);
   const computedPerAdult = customUnit && customUnit > 0 ? customUnit : Math.round(totalCents / adultsCountSafe);
   return (
     <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-background border border-border/60 text-2xs">
       <div>
         <span className="text-muted-foreground block">Por Pessoa ({paxCount} pax)</span>
         <strong className="font-mono text-xs text-foreground">{formatMoney(computedPerPerson)}</strong>
       </div>
       <div>
         <span className="text-muted-foreground block">Por Adulto ({adultsCountSafe} adt)</span>
         <strong className="font-mono text-xs text-primary">{formatMoney(computedPerAdult)}</strong>
       </div>
     </div>
   );
 })()}

 <div className="grid grid-cols-1 gap-2 text-xs">
 <label className="min-h-11 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background border border-border/50 cursor-pointer">
 <span className="font-medium text-foreground">Mostrar valor por pessoa</span>
 <input
 type="checkbox"
 checked={activeCanvasTheme.pricingDisplay.showPerPerson}
 onChange={(e) =>
 updateStudioCustomField("show_price_per_person", e.target.checked ? "true" : "false")
 }
 className="size-4 accent-primary cursor-pointer"
 />
 </label>
 <label className="min-h-11 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background border border-border/50 cursor-pointer">
 <span className="font-medium text-foreground">Mostrar valor por adulto</span>
 <input
 type="checkbox"
 checked={activeCanvasTheme.pricingDisplay.showPerAdult}
 onChange={(e) =>
 updateStudioCustomField("show_price_per_adult", e.target.checked ? "true" : "false")
 }
 className="size-4 accent-primary cursor-pointer"
 />
 </label>
 <label className="min-h-11 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background border border-border/50 cursor-pointer">
 <span className="font-medium text-foreground">Mostrar detalhamento por quarto/bloco</span>
 <input
 type="checkbox"
 checked={activeCanvasTheme.pricingDisplay.showPerRoom}
 onChange={(e) =>
 updateStudioCustomField("show_price_per_room", e.target.checked ? "true" : "false")
 }
 className="size-4 accent-primary cursor-pointer"
 />
 </label>
 </div>
 <div className="space-y-1">
 <Label className="text-2xs text-muted-foreground">
 Valor por {nicheCopy.perPersonLabel} (opcional, R$)
 </Label>
 <Input
 type="text"
 value={
 activeCanvasTheme.pricingDisplay.customPerPersonCents
 ? (activeCanvasTheme.pricingDisplay.customPerPersonCents / 100).toFixed(2).replace(".", ",")
 : ""
 }
 onChange={(e) => {
 const parsed = parseReaisToCents(e.target.value, true);
 updateStudioCustomField(
 "custom_price_per_person_cents",
 parsed && parsed > 0 ? String(parsed) : null,
 );
 }}
 placeholder="Automático (Total / Viajantes)"
 className="min-h-11 sm:min-h-0 h-11 sm:h-9 text-xs font-mono rounded-lg bg-background"
 />
 </div>
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
 ([k, v]) => isEditableCustomFieldInProposalStudio(k, v, STUDIO_RESERVED_FIELD_KEYS),
 ).length > 0 && (
 <div className="space-y-2 pt-2 border-t border-border/40">
 {Object.entries(studioCustomFields)
 .filter(([k, v]) => isEditableCustomFieldInProposalStudio(k, v, STUDIO_RESERVED_FIELD_KEYS))
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

 {/* ── ABA OPÇÕES COMPARATIVAS (MULTI-CENÁRIOS + PASSHUB) ── */}
 <TabsContent value="opcoes" className="space-y-4">
   <div className="flex flex-wrap items-center justify-between gap-2">
     <div>
       <span className="text-xs font-bold text-foreground block">
         Opções Comparativas ({Array.isArray(proposal.options) ? proposal.options.length : 0})
       </span>
       <span className="text-2xs text-muted-foreground">
         O cliente pode alternar entre cenários na página pública e no PDF.
       </span>
     </div>
     <Button
       type="button"
       size="sm"
       variant={passHubTabOpen === "opcoes" ? "default" : "outline"}
       onClick={() => setPassHubTabOpen((prev) => (prev === "opcoes" ? null : "opcoes"))}
       className="h-11 sm:h-8 text-xs rounded-lg gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
     >
       <Search className="size-3.5" /> Buscar Opção PassHub
     </Button>
   </div>

   <div className="flex gap-2">
     <Input
       value={newOptionName}
       onChange={(e) => setNewOptionName(e.target.value)}
       placeholder="Nome da opção (ex: Opção Comfort · Hotel B)"
       className="h-11 sm:h-9 text-xs flex-1 rounded-lg"
     />
     <Button
       type="button"
       size="sm"
       variant="outline"
       onClick={() => {
         const existing = Array.isArray(proposal.options) ? proposal.options : [];
         const nextIdx = existing.length + 1;
         const nextOpt: TravelProposalOptionDTO = {
           id: `opt_${Date.now()}`,
           name: newOptionName.trim() || `Opção ${nextIdx}`,
           airline: proposal.flights[0]?.airline_name || proposal.flights[0]?.airline || undefined,
           hotel_name: proposal.hotels[0]?.hotel_name || undefined,
           hotel_stars: proposal.hotels[0]?.stars,
           room_type: proposal.hotels[0]?.room_type,
           meal_plan: proposal.hotels[0]?.board_basis,
           flights: proposal.flights,
           hotels: proposal.hotels,
           transfers: currentTransfers,
           tours: currentTours,
           includes: currentIncludes,
           excludes: currentExcludes,
           is_recommended: existing.length === 0,
           pricing: {
             currency: proposal.pricing?.currency || "BRL",
             base_price_cents: proposal.pricing?.base_price_cents || proposal.pricing?.total_price_cents || 0,
             boarding_tax_cents: proposal.pricing?.boarding_tax_cents || 0,
             other_taxes_cents: proposal.pricing?.other_taxes_cents || 0,
             discount_cents: proposal.pricing?.discount_cents || 0,
             total_price_cents: proposal.pricing?.total_price_cents || 0,
             installments_options: proposal.pricing?.installments_options || [],
           },
         };
         onChange({ options: [...existing, nextOpt] });
         setNewOptionName("");
         toast.success(`"${nextOpt.name}" adicionada às opções comparativas.`);
       }}
       className="h-11 sm:h-9 text-xs rounded-lg gap-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
     >
       <Plus className="size-3.5" /> Criar Opção
     </Button>
   </div>

   {passHubTabOpen === "opcoes" && (
     <PassHubLiveQuoterPanel
       compact
       defaultCategories={["packages", "hotels", "flights"]}
       initialOriginIata={proposal.flights[0]?.origin_iata || ""}
       initialDestinationIata={proposal.flights[0]?.destination_iata || ""}
       initialDestinationCity={proposal.destination_city || ""}
       initialDepartureDate={proposal.travel_start_date || ""}
       initialReturnDate={proposal.travel_end_date || ""}
       onAddComparativeOption={(opt) => {
         const existing = Array.isArray(proposal.options) ? proposal.options : [];
         const nextOpt: TravelProposalOptionDTO = {
           id: `opt_${Date.now()}`,
           name: opt.optionLabel,
           airline: opt.airlineDesc || undefined,
           hotel_name: opt.hotelName || undefined,
           hotel_stars: opt.hotel?.stars,
           room_type: opt.hotel?.room_type,
           meal_plan: opt.hotel?.board_basis,
           hotels: opt.hotel ? [opt.hotel] : undefined,
           flights: opt.flight ? [opt.flight] : proposal.flights,
           transfers: currentTransfers,
           tours: currentTours,
           includes: currentIncludes,
           is_recommended: existing.length === 0,
           pricing: {
             currency: proposal.pricing?.currency || "BRL",
             base_price_cents: opt.totalPriceCents,
             boarding_tax_cents: 0,
             other_taxes_cents: 0,
             discount_cents: 0,
             total_price_cents: opt.totalPriceCents,
             installments_options: [],
           },
         };
         onChange({ options: [...existing, nextOpt] });
         toast.success(`"${opt.optionLabel}" adicionada via PassHub!`);
       }}
     />
   )}

   {(!proposal.options || proposal.options.length === 0) ? (
     <div className="p-4 text-center rounded-lg bg-muted/30 border border-dashed border-border/60 text-xs text-muted-foreground">
       Nenhuma opção comparativa cadastrada. Crie cenários diferentes (ex: Hotel 4 Estrelas vs Resort All Inclusive) ou importe direto do PassHub acima.
     </div>
   ) : (
     <div className="space-y-3">
       {proposal.options.map((opt, idx) => {
         const currentTotalReais = ((opt.pricing?.total_price_cents || 0) / 100).toFixed(2);
         const updateOpt = (patch: Partial<TravelProposalOptionDTO>) => {
           const next = (proposal.options || []).map((item, i) => (i === idx ? { ...item, ...patch } : item));
           onChange({ options: next });
         };
         return (
           <div key={opt.id || idx} className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-3">
             <div className="flex items-center justify-between gap-2">
               <button
                 type="button"
                 onClick={() => {
                   const next = (proposal.options || []).map((item, i) => ({
                     ...item,
                     is_recommended: i === idx,
                   }));
                   onChange({ options: next });
                 }}
                 className={cn(
                   "h-11 sm:h-7 px-3 rounded-md text-2xs font-bold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                   opt.is_recommended
                     ? "bg-primary text-primary-foreground"
                     : "bg-background border border-border text-muted-foreground hover:text-foreground",
                 )}
               >
                 <CheckCircle className="size-3" />
                 <span>{opt.is_recommended ? "Recomendada" : "Marcar Recomendada"}</span>
               </button>

               <div className="flex items-center gap-1">
                 <Button
                   type="button"
                   variant="ghost"
                   size="sm"
                   title="Sincronizar voos, hotéis e inclusões da aba principal"
                   onClick={() => {
                     updateOpt({
                       flights: proposal.flights,
                       hotels: proposal.hotels,
                       transfers: currentTransfers,
                       tours: currentTours,
                       includes: currentIncludes,
                       excludes: currentExcludes,
                     });
                     toast.success(`Conteúdo base sincronizado em "${opt.name}".`);
                   }}
                   className="h-11 sm:h-7 px-2 text-2xs font-medium text-primary"
                 >
                   Sincronizar Base
                 </Button>
                 <Button
                   type="button"
                   variant="ghost"
                   size="sm"
                   aria-label="Remover opção"
                   onClick={() => {
                     const next = (proposal.options || []).filter((_, i) => i !== idx);
                     onChange({ options: next });
                   }}
                   className="h-11 w-11 sm:h-7 sm:w-7 p-0 text-destructive"
                 >
                   <Trash className="size-3.5" />
                 </Button>
               </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
               <Input
                 value={opt.name}
                 onChange={(e) => updateOpt({ name: e.target.value })}
                 placeholder="Nome da opção"
                 className="h-11 sm:h-8 text-xs font-semibold"
               />
               <Input
                 value={opt.badge || ""}
                 onChange={(e) => updateOpt({ badge: e.target.value })}
                 placeholder="Selo (ex: Mais Vendida)"
                 className="h-11 sm:h-8 text-xs"
               />
               <Input
                 value={opt.hotel_name || ""}
                 onChange={(e) => updateOpt({ hotel_name: e.target.value })}
                 placeholder="Hotel / Resort principal"
                 className="h-11 sm:h-8 text-xs"
               />
               <Input
                 value={opt.airline || ""}
                 onChange={(e) => updateOpt({ airline: e.target.value })}
                 placeholder="Cia aérea / Transporte"
                 className="h-11 sm:h-8 text-xs"
               />
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
               <Input
                 value={opt.meal_plan || ""}
                 onChange={(e) => updateOpt({ meal_plan: e.target.value })}
                 placeholder="Regime (ex: All Inclusive)"
                 className="h-11 sm:h-8 text-xs"
               />
               <Input
                 type="number"
                 step="0.01"
                 min="0"
                 value={currentTotalReais}
                 onChange={(e) => {
                   const parsedCents = parseReaisToCents(e.target.value, true);
                   if (parsedCents !== null) {
                     updateOpt({
                       pricing: {
                         ...(opt.pricing || {
                           currency: proposal.pricing?.currency || "BRL",
                           base_price_cents: parsedCents,
                           boarding_tax_cents: 0,
                           other_taxes_cents: 0,
                           discount_cents: 0,
                           total_price_cents: parsedCents,
                           installments_options: [],
                         }),
                         base_price_cents: parsedCents,
                         total_price_cents: parsedCents,
                       },
                     });
                   }
                 }}
                 placeholder="Valor total R$"
                 className="h-11 sm:h-8 text-xs font-mono"
               />
             </div>
           </div>
         );
       })}
     </div>
   )}
 </TabsContent>

        <TabsContent value="web" className="space-y-4 mt-0">
          <ProposalWebPageBuilder proposal={proposal} onChange={onChange} />
        </TabsContent>
   </div>
 </Tabs>
 </TooltipProvider>
 </div>
 );
}

function FlightConnectionEditorField({
  flight,
  onUpdateConnections,
}: {
  flight: FlightSegmentDTO;
  onUpdateConnections: (nextConnections: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const currentConnections: string[] = Array.isArray(flight.connection_airports)
    ? flight.connection_airports
    : [];

  const { data: airportSuggestionsRes } = useQuery({
    queryKey: ["studio-airport-autocomplete", query],
    queryFn: () => searchGlobalAirports({ data: { query: query.trim(), limit: 6 } }),
    enabled: query.trim().length >= 2,
    staleTime: 60 * 1000,
  });

  const suggestions = airportSuggestionsRes?.airports || [];

  const handleAddCode = (rawCode: string) => {
    const clean = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
    if (clean.length !== 3) {
      toast.info("Informe um código IATA válido com 3 letras (ex: GRU, VCP, BSB).");
      return;
    }
    if (!currentConnections.includes(clean)) {
      onUpdateConnections([...currentConnections, clean]);
    }
    setQuery("");
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-3xs font-mono uppercase text-muted-foreground">
          Conexões / Escalas (IATA)
        </label>
        {currentConnections.length > 0 && (
          <span className="text-3xs font-mono text-primary font-semibold">
            {currentConnections.join(" → ")}
          </span>
        )}
      </div>

      {currentConnections.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {currentConnections.map((code, idx) => (
            <button
              key={`${code}-${idx}`}
              type="button"
              onClick={() => onUpdateConnections(currentConnections.filter((_, i) => i !== idx))}
              aria-label={`Remover conexão ${code}`}
              className="inline-flex items-center gap-1 px-2 py-1 min-h-11 sm:min-h-0 rounded-md border border-border bg-card text-xs font-mono font-bold text-foreground hover:border-destructive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{code}</span>
              <X className="size-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1">
        <Input
          placeholder="Buscar cidade ou IATA da conexão (ex: GRU)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (/^[a-zA-Z]{3}$/.test(query.trim())) {
                handleAddCode(query);
              } else if (suggestions[0]?.iata_code) {
                handleAddCode(suggestions[0].iata_code);
              }
            }
          }}
          className="h-11 sm:h-8 text-xs rounded-lg flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAddCode(suggestions[0]?.iata_code || query)}
          disabled={!query.trim()}
          className="h-11 sm:h-8 px-3 text-xs rounded-lg shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
        >
          + Conexão
        </Button>
      </div>

      {query.trim().length >= 2 && suggestions.length > 0 && (
        <div className="rounded-lg border border-border bg-card divide-y divide-border/50 max-h-36 overflow-y-auto">
          {suggestions.map((ap) => (
            <button
              key={ap.iata_code}
              type="button"
              onClick={() => handleAddCode(ap.iata_code)}
              className="w-full px-3 py-2 min-h-11 sm:min-h-0 text-left text-xs hover:bg-muted/60 flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-medium text-foreground">
                {ap.city} — {ap.name}
              </span>
              <span className="font-mono font-bold text-primary shrink-0">{ap.iata_code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
