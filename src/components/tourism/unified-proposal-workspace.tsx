import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Plane,
  Building2,
  Users,
  MapPin,
  Plus,
  Minus,
  Trash2,
  FileText,
  CreditCard,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Send,
  Upload,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Tag,
  Check,
  Eye,
  Loader2,
  X,
  Bus,
  ShoppingCart,
  ArrowLeftRight,
  Clock,
  Package,
  Zap,
  Layers,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyField } from "@/components/ui/currency-field";
import { formatMoney } from "@/lib/money";
import {
  createTravelProposal,
  listStoreCatalogItemsForProposal,
  type TravelProposalDTO,
  type ProposalCanvasFormat,
  type FlightSegmentDTO,
  type TransferDTO,
} from "@/services/travel-proposal.functions";
import { createAgencyTravelQuote } from "@/services/tourism.functions";
import { listCustomers, createCustomer } from "@/services/crm.functions";
import { listHotelsBank } from "@/services/travel-catalog.functions";
import { listTravelSuppliers } from "@/services/travel-suppliers.functions";
import { getAgencySalesAndCommissionConfigFn } from "@/services/travel-pre-boarding-and-commissions.functions";
import { parseUniversalDocumentOCR } from "@/services/multimodal-ocr.functions";
import { processOperatorQuoteOcr, type OperatorQuoteExtractionResult } from "@/services/travel-operator-ocr.functions";
import { publishExtractedTravelPackageToCatalogAndMatchRadar } from "@/services/travel-ai-extractor.functions";
import { getHotelByNameOrSlug } from "@/lib/data/hotels-resorts-catalog";
import {
  resolveDestinationGatewayEngine,
  calculateMultiRoomQuoteBreakdown,
  type QuoteRoomConfigInput,
  type OperatorPaymentCampaignRule,
} from "@/services/travel-ecosystem-engines.functions";
import {
  getInfotravelIntegrationStatusFn,
  infotravelSearchPackages,
  type InfoTravelOperatorSlug,
} from "@/services/infotravel";
import { ProposalShareWhatsappModal } from "@/components/tourism/studio/proposal-share-whatsapp-modal";
import { TRAVEL_PACKAGE_TEMPLATES, type TravelPackageTemplate } from "@/lib/tourism/tourism-templates";
import type { UnifiedBridgeCatalogContext } from "@/lib/niches/unified-field-bridge";

export interface UnifiedProposalWorkspaceLead {
  id: string;
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  clientDocument?: string | null;
  destination?: string | null;
  estimated_value_cents?: number;
  passenger_count?: number;
  departureDate?: string | null;
  returnDate?: string | null;
  adultsCount?: number;
  childrenCount?: number;
  childrenAges?: number[];
  notes?: string | null;
  cover_image?: string | null;
  cover_image_url?: string | null;
  payment_plan?: any;
  customFields?: Record<string, unknown>;
  sourceListingId?: string | null;
  sourceListingOrigin?: "product" | "classified" | string | null;
  paxList?: any[];
  boardingPoint?: string | null;
  departureOption?: any;
}

export interface UnifiedProposalWorkspaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "standalone_proposal" | "kanban_lead_quote";
  lead?: UnifiedProposalWorkspaceLead | null;
  initialLeadId?: string | null;
  initialClientName?: string;
  initialClientPhone?: string;
  initialClientEmail?: string;
  initialDestination?: string;
  sourcePackageTitle?: string;
  onCreated?: (result: { proposalId?: string; quoteId?: string; proposal?: TravelProposalDTO }) => void;
}

export const SUGGESTED_ROOM_ADDONS = [
  { code: "checked_bag_23", label: "Bagagem Despachada 23kg" },
  { code: "travel_insurance", label: "Seguro Viagem" },
  { code: "vip_transfer", label: "Transfer Privativo" },
  { code: "child_seat", label: "Bebê Conforto / Cadeirinha" },
];

export const COMMON_INCLUSIONS_TAGS = [
  "Transfer In/Out Aeroporto ↔ Hotel",
  "Seguro Viagem Cobertura Completa",
  "City Tour Histórico no Destino",
  "Passeio Náutico / Escuna",
  "Ingressos para Parques Temáticos",
  "Bagagem Despachada 23kg",
];

export function sanitizeDestinationString(raw?: string | null): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Delimita por hífen, traço, travessão, pipe, ponto de bala, dois pontos, barra ou quebra de linha
  const parts = trimmed.split(/[\s\u00A0]*[-–—|•·:\/\n][\s\u00A0]*/);
  let cityCandidate = (parts[0] || trimmed).trim();
  if (cityCandidate.length > 40) {
    cityCandidate = cityCandidate.slice(0, 40).trim();
  }
  // Title Case if shouting in all-caps
  if (cityCandidate === cityCandidate.toUpperCase() && cityCandidate.length > 2) {
    return cityCandidate
      .toLowerCase()
      .split(" ")
      .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(" ");
  }
  return cityCandidate;
}

export function UnifiedProposalWorkspace({
  open,
  onOpenChange,
  mode = "standalone_proposal",
  lead,
  initialLeadId,
  initialClientName = "",
  initialClientPhone = "",
  initialClientEmail = "",
  initialDestination = "",
  sourcePackageTitle = "",
  onCreated,
}: UnifiedProposalWorkspaceProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ocrFileInputRef = useRef<HTMLInputElement | null>(null);

  const [stepTab, setStepTab] = useState<"destino" | "aereo" | "quartos" | "opcoes" | "rodoviario" | "pagamento">("destino");
  const [quoteSourceMode, setQuoteSourceMode] = useState<"manual_ocr" | "infotravel_api">("manual_ocr");
  const [builderViewMode, setBuilderViewMode] = useState<"quick_canvas" | "wizard">("quick_canvas");
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");

  // Dados do Lead / Cliente
  const effectiveLeadId = lead?.id || initialLeadId || "";
  const [clientName, setClientName] = useState(lead?.fullName || initialClientName);
  const [clientPhone, setClientPhone] = useState(lead?.phone || initialClientPhone);
  const [clientEmail, setClientEmail] = useState(lead?.email || initialClientEmail);
  const [clientDocument, setClientDocument] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCreatingInlineCustomer, setIsCreatingInlineCustomer] = useState(false);
  const [customTitle, setCustomTitle] = useState(sourcePackageTitle || "");
  const [canvasFormat, setCanvasFormat] = useState<ProposalCanvasFormat>("a4-portrait");
  const [templateTheme, setTemplateTheme] = useState<string>("editorial-flat");
  const [currency, setCurrency] = useState<string>("BRL");
  const [validUntilDays, setValidUntilDays] = useState<number>(7);
  const [selectedPackageTemplateId, setSelectedPackageTemplateId] = useState<string | null>(null);
  const [selectedSourceCatalogItem, setSelectedSourceCatalogItem] = useState<UnifiedBridgeCatalogContext | null>(null);
  const autoAppliedListingRef = useRef<string>("");
  const [showOcrTextModal, setShowOcrTextModal] = useState(false);
  const [ocrPastedText, setOcrPastedText] = useState("");
  const [originCity, setOriginCity] = useState("");

  const { data: storeCatalogItems = [], isLoading: isLoadingCatalogItems } = useQuery({
    queryKey: ["proposal-store-catalog-items"],
    queryFn: () => listStoreCatalogItemsForProposal().catch(() => []),
    enabled: open,
  });

  const { data: crmCustomersRes, refetch: refetchCustomers } = useQuery({
    queryKey: ["crm-customers-proposal-workspace"],
    queryFn: () => listCustomers({ data: {} }).catch(() => ({ customers: [] })),
    enabled: open,
  });
  const crmCustomers: any[] = Array.isArray((crmCustomersRes as any)?.customers)
    ? (crmCustomersRes as any).customers
    : Array.isArray(crmCustomersRes)
      ? (crmCustomersRes as any)
      : [];

  const handleQuickCreateCustomer = async () => {
    if (!clientName.trim()) {
      toast.error("Informe o nome do passageiro antes de salvar no CRM.");
      return;
    }
    setIsCreatingInlineCustomer(true);
    try {
      const created = await createCustomer({
        data: {
          full_name: clientName.trim(),
          phone: clientPhone.trim() || undefined,
          email: clientEmail.trim() || undefined,
          document_number: clientDocument.trim() || undefined,
        } as any,
      });
      if ((created as any)?.id) {
        setSelectedCustomerId((created as any).id);
      }
      await refetchCustomers();
      toast.success(`Cliente "${clientName.trim()}" cadastrado e vinculado no CRM!`);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível cadastrar o cliente no CRM.");
    } finally {
      setIsCreatingInlineCustomer(false);
    }
  };

  const [destinationQuery, setDestinationQuery] = useState(
    sanitizeDestinationString(lead?.destination || initialDestination)
  );
  const [lastOcrExtraction, setLastOcrExtraction] = useState<OperatorQuoteExtractionResult | null>(null);
  const [newInclusionInput, setNewInclusionInput] = useState("");
  const [departureDate, setDepartureDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 37);
    return d.toISOString().split("T")[0];
  });

  // Malha Aérea Dinâmica (Voos - PassHub / Infotravel)
  const [proposalFlights, setProposalFlights] = useState<FlightSegmentDTO[]>([]);

  const handleAddFlight = () => {
    const isSecond = proposalFlights.length === 1;
    const newFlight: FlightSegmentDTO = {
      id: `fl-${Date.now()}`,
      leg: isSecond ? "volta" : "ida",
      airline: "",
      flight_number: "",
      origin_iata: isSecond ? (proposalFlights[0]?.destination_iata || "") : (originCity || ""),
      origin_city: isSecond ? (proposalFlights[0]?.destination_city || "") : (originCity || ""),
      destination_iata: isSecond ? (proposalFlights[0]?.origin_iata || "") : (destinationQuery || ""),
      destination_city: isSecond ? (proposalFlights[0]?.origin_city || "") : (destinationQuery || ""),
      departure_date: isSecond ? (returnDate || departureDate) : departureDate,
      departure_time: "",
      arrival_time: "",
      baggage_included: "Mochila + Mala 10kg",
      stops_count: 0,
    };
    setProposalFlights((prev) => [...prev, newFlight]);
  };

  const handleRemoveFlight = (idx: number) => {
    setProposalFlights((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateFlight = (idx: number, patch: Partial<FlightSegmentDTO>) => {
    setProposalFlights((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    );
  };

  // Transporte Rodoviário & Terrestre (Ônibus Leito DD / Frota / Transfers)
  const [proposalTransfers, setProposalTransfers] = useState<TransferDTO[]>([]);

  // Autocomplete do Banco de Hotéis
  const [hotelQuery, setHotelQuery] = useState("");
  const [isHotelDropdownOpen, setIsHotelDropdownOpen] = useState(false);

  const { data: hotelSuggestions = [] } = useQuery({
    queryKey: ["hotels-bank-suggestions", hotelQuery],
    queryFn: () => listHotelsBank({ data: { search: hotelQuery.trim() } }),
    enabled: hotelQuery.trim().length >= 2,
    staleTime: 30_000,
  });

  // Tags Rápidas de Inclusões e Exclusões (Livre e configurável, sem itens fake)
  const [selectedInclusions, setSelectedInclusions] = useState<string[]>([]);
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>([]);
  const [newExclusionInput, setNewExclusionInput] = useState("");
  const [proposalItinerary, setProposalItinerary] = useState<
    Array<{ day: number; title: string; description: string; meals?: string }>
  >([]);

  const toggleInclusionTag = (tag: string) => {
    setSelectedInclusions((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleExclusionTag = (tag: string) => {
    setSelectedExclusions((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // OCR Multimodal
  const [isScanningOcr, setIsScanningOcr] = useState(false);

  // Auto-binding quando o lead muda
  useEffect(() => {
    if (open) {
      if (lead) {
        if (lead.fullName) setClientName(lead.fullName);
        if (lead.phone) setClientPhone(lead.phone);
        if (lead.email) setClientEmail(lead.email);
        if (lead.clientDocument) setClientDocument(lead.clientDocument);
        if (lead.destination) setDestinationQuery(sanitizeDestinationString(lead.destination));
        if (lead.departureDate) {
          const iso = normalizeDateToIso(lead.departureDate);
          if (iso) setDepartureDate(iso);
        }
        if (lead.returnDate) {
          const iso = normalizeDateToIso(lead.returnDate);
          if (iso) setReturnDate(iso);
        }
        const adults = Math.max(1, lead.adultsCount || (lead.passenger_count ? Math.max(1, lead.passenger_count) : 2));
        const children = Math.max(0, lead.childrenCount || 0);
        setRooms((prev) => [
          {
            ...prev[0],
            adultsCount: adults,
            childrenCount: children,
            baseAdultPriceCents: lead.estimated_value_cents ? Math.round(lead.estimated_value_cents / adults) : prev[0].baseAdultPriceCents,
            payerName: lead.fullName || prev[0].payerName,
          },
          ...prev.slice(1),
        ]);
        const extraLeadNotes: string[] = [];
        if (lead.notes) extraLeadNotes.push(lead.notes);
        if (lead.boardingPoint) extraLeadNotes.push(`Ponto de Embarque: ${lead.boardingPoint}`);
        if (extraLeadNotes.length > 0) {
          setNotes((curr) => (curr ? curr : extraLeadNotes.join("\n")));
        }
        if (lead.payment_plan) {
          const pp = lead.payment_plan;
          if (pp.operatorName) setOperatorName(pp.operatorName);
          if (typeof pp.agencyCommissionPct === "number") setAgencyCommissionPct(pp.agencyCommissionPct);
          if (pp.enableBoleto !== undefined) setEnableBoleto(Boolean(pp.enableBoleto));
          if (pp.boletoInstallments !== undefined) setBoletoInstallments(Number(pp.boletoInstallments));
          if (pp.hasBoletoDownpayment !== undefined) setHasBoletoDownpayment(Boolean(pp.hasBoletoDownpayment));
          if (pp.downpaymentType) setDownpaymentType(pp.downpaymentType);
          if (typeof pp.downpaymentPct === "number") setDownpaymentPct(pp.downpaymentPct);
          if (typeof pp.downpaymentFixedCents === "number") setDownpaymentFixedCents(pp.downpaymentFixedCents);
          if (pp.firstBoletoDue) setFirstBoletoDue(pp.firstBoletoDue);
          if (pp.enableCard !== undefined) setEnableCard(Boolean(pp.enableCard));
          if (pp.cardInstallments !== undefined) setCardInstallments(Number(pp.cardInstallments));
          if (pp.enablePixDiscount !== undefined) setEnablePixDiscount(Boolean(pp.enablePixDiscount));
          if (typeof pp.pixDiscountPct === "number") setPixDiscountPct(pp.pixDiscountPct);
          if (pp.notes) {
            setCustomPaymentTermsText(pp.notes);
            setIsTermsCustomized(Boolean(pp.isTermsCustomized));
          }
        }
      } else {
        if (initialClientName) setClientName(initialClientName);
        if (initialClientPhone) setClientPhone(initialClientPhone);
        if (initialClientEmail) setClientEmail(initialClientEmail);
        if (initialDestination) setDestinationQuery(sanitizeDestinationString(initialDestination));
      }
    }
  }, [open, lead, initialClientName, initialClientPhone, initialClientEmail, initialDestination]);

  // Gateway Regional
  const gatewayResolution = useMemo(
    () => resolveDestinationGatewayEngine(destinationQuery),
    [destinationQuery]
  );

  // Divisão Real por Quartos
  const [rooms, setRooms] = useState<QuoteRoomConfigInput[]>([
    {
      roomNumber: 1,
      roomLabel: "Quarto 1 — Casal",
      roomCategory: "Standard Double",
      mealPlan: "Café da Manhã",
      adultsCount: lead?.passenger_count ? Math.max(1, lead.passenger_count) : 2,
      childrenCount: 0,
      childrenAges: [],
       baseAdultPriceCents: lead?.estimated_value_cents ? Math.round(lead.estimated_value_cents / 2) : 0,
       baseChildPriceCents: 0,
      addons: [],
      payerName: lead?.fullName || initialClientName || "",
    },
  ]);

  // Opções Comparativas do Bundle
  const [bundleOptions, setBundleOptions] = useState<
    Array<{
      optionLabel: string;
      hotelName: string;
      airlineDesc: string;
      operatorSlug: string;
      adultPriceCents: number;
      isRecommended: boolean;
       quoteSessionId?: string;
       offerSnapshotId?: string;
    }>
  >([
    {
      optionLabel: "Opção 1 — Seleção Principal",
       hotelName: "",
       airlineDesc: "",
       operatorSlug: "",
       adultPriceCents: lead?.estimated_value_cents ? Math.round(lead.estimated_value_cents / 2) : 0,
      isRecommended: true,
    },
  ]);

  // Operadora & Condições de Pagamento Flexíveis (100% Livres & Configuráveis pela Agência)
  const [operatorName, setOperatorName] = useState<string>("");
  const [agencyCommissionPct, setAgencyCommissionPct] = useState<number>(0);
  const [enableBoleto, setEnableBoleto] = useState<boolean>(false);
  const [boletoInstallments, setBoletoInstallments] = useState<number>(1);
  const [hasBoletoDownpayment, setHasBoletoDownpayment] = useState<boolean>(false); // Zero entrada por padrão!
  const [downpaymentType, setDownpaymentType] = useState<"percentage" | "fixed_cents">("percentage");
  const [downpaymentPct, setDownpaymentPct] = useState<number>(0);
  const [downpaymentFixedCents, setDownpaymentFixedCents] = useState<number>(0);
  const [firstBoletoDue, setFirstBoletoDue] = useState<string>("");

  const [enableCard, setEnableCard] = useState<boolean>(false);
  const [cardInstallments, setCardInstallments] = useState<number>(1);

  const [enablePixDiscount, setEnablePixDiscount] = useState<boolean>(false);
  const [pixDiscountPct, setPixDiscountPct] = useState<number>(0);

  const [customPaymentTermsText, setCustomPaymentTermsText] = useState<string>("");
  const [isTermsCustomized, setIsTermsCustomized] = useState<boolean>(false);

  const [notes, setNotes] = useState("");
  const [infotravelOperatorFilter, setInfotravelOperatorFilter] = useState<InfoTravelOperatorSlug>("infotravel_default");
  const [isSearchingInfotravel, setIsSearchingInfotravel] = useState(false);

  const filteredStoreCatalogItems = useMemo(() => {
    const q = catalogSearchQuery.trim().toLowerCase();
    const list = Array.isArray(storeCatalogItems) ? storeCatalogItems : [];
    if (!q) return list;
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.destination.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.includes.some((inc) => inc.toLowerCase().includes(q)),
    );
  }, [catalogSearchQuery, storeCatalogItems]);

  const filteredCatalogPackages = useMemo(() => {
    const q = catalogSearchQuery.trim().toLowerCase();
    if (!q) return TRAVEL_PACKAGE_TEMPLATES;
    return TRAVEL_PACKAGE_TEMPLATES.filter(
      (pkg) =>
        pkg.title.toLowerCase().includes(q) ||
        pkg.destinationCity.toLowerCase().includes(q) ||
        pkg.subtitle?.toLowerCase().includes(q) ||
        pkg.includes?.some((inc) => inc.toLowerCase().includes(q))
    );
  }, [catalogSearchQuery]);

  const handleApplyStoreCatalogItem = (item: UnifiedBridgeCatalogContext, silent = false) => {
    const cleanCity = sanitizeDestinationString(item.destination || item.title);
    if (cleanCity) setDestinationQuery(cleanCity);
    if (item.title) setCustomTitle(item.title);
    setSelectedSourceCatalogItem(item);

    if (Array.isArray(item.flights) && item.flights.length > 0) {
      setProposalFlights(
        item.flights.map((f: any, idx: number) => ({
          id: f.id || `fl-cms-${Date.now()}-${idx}`,
          leg: f.type === "return" || f.leg === "volta" ? "volta" : "ida",
          airline: f.airline_name || f.airline || "",
          flight_number: f.flight_number || "",
          origin_iata: f.origin_iata || originCity || "",
          origin_city: f.origin_city || originCity || "",
          destination_iata: f.destination_iata || "",
          destination_city: f.destination_city || cleanCity,
          departure_date: departureDate,
          departure_time: f.departure_time || "",
          arrival_time: f.arrival_time || "",
          baggage_included: f.baggage_included ? String(f.baggage_included) : "Conforme companhia",
          stops_count: f.stops_count || f.stops || 0,
        })),
      );
    }

    if (Array.isArray(item.hotels) && item.hotels.length > 0) {
      const mainH: any = item.hotels[0];
      const hotelLabel = mainH.hotel_name || mainH.name || item.title;
      setBundleOptions([
        {
          optionLabel: "Opcao do Pacote CMS",
          hotelName: hotelLabel,
          airlineDesc: item.flights?.[0]?.airline || "Transporte Incluso",
          operatorSlug: "",
          adultPriceCents: item.priceCents > 0 ? item.priceCents : 0,
          isRecommended: true,
        },
      ]);
      setHotelQuery(hotelLabel);
    }

    if (item.priceCents > 0) {
      setRooms((prev) => [
        {
          ...prev[0],
          baseAdultPriceCents: item.priceCents,
        },
        ...prev.slice(1),
      ]);
    }

    if (Array.isArray(item.itinerary) && item.itinerary.length > 0) {
      setProposalItinerary(
        item.itinerary.map((d: any, idx: number) => ({
          day: d.day || d.day_number || idx + 1,
          title: d.title || `Dia ${idx + 1}`,
          description: d.description || "",
          meals: Array.isArray(d.meals) ? d.meals.join(", ") : d.meals || "Conforme roteiro",
        })),
      );
    }

    if (Array.isArray(item.includes) && item.includes.length > 0) {
      setSelectedInclusions(item.includes);
    }
    if (Array.isArray(item.excludes) && item.excludes.length > 0) {
      setSelectedExclusions(item.excludes);
    }

    if (!silent) {
      setShowCatalogModal(false);
      toast.success(`Item CMS "${item.title}" conectado a proposta!`);
    }
  };

  useEffect(() => {
    if (!open || !lead?.sourceListingId || !Array.isArray(storeCatalogItems) || storeCatalogItems.length === 0) {
      return;
    }
    const syncKey = `${lead.id}:${lead.sourceListingId}`;
    if (autoAppliedListingRef.current === syncKey) return;
    const matched = storeCatalogItems.find((it) => it.id === lead.sourceListingId);
    if (matched) {
      autoAppliedListingRef.current = syncKey;
      handleApplyStoreCatalogItem(matched, true);
    }
  }, [open, lead?.id, lead?.sourceListingId, storeCatalogItems]);

  const handleApplyCatalogPackage = (pkg: TravelPackageTemplate) => {
    const cleanCity = sanitizeDestinationString(pkg.destinationCity);
    setDestinationQuery(cleanCity);
    setCustomTitle(pkg.title);
    if (pkg.templateTheme) setTemplateTheme(pkg.templateTheme);
    if (pkg.canvasFormat) setCanvasFormat(pkg.canvasFormat);

    if (Array.isArray(pkg.flights) && pkg.flights.length > 0) {
      setProposalFlights(
        pkg.flights.map((f: any, idx: number) => ({
          id: f.id || `fl-pkg-${Date.now()}-${idx}`,
          leg: f.type === "return" ? "volta" : "ida",
          airline: f.airline_name || f.airline || "",
          flight_number: f.flight_number || "",
          origin_iata: f.origin_iata || originCity || "",
          origin_city: f.origin_city || originCity || "",
          destination_iata: f.destination_iata || "",
          destination_city: f.destination_city || cleanCity,
          departure_date: departureDate,
          departure_time: f.departure_time || "08:00",
          arrival_time: f.arrival_time || "11:30",
          baggage_included: f.baggage_included || "Mochila + Mala 10kg",
          stops_count: f.stops_count || 0,
        }))
      );
    }

    if (Array.isArray(pkg.hotels) && pkg.hotels.length > 0) {
      const mainH = pkg.hotels[0];
      setBundleOptions([
        {
          optionLabel: "Opção Padrão do Pacote",
          hotelName: (mainH as any).hotel_name || (mainH as any).name || pkg.title,
          airlineDesc: pkg.flights?.[0]?.airline_name || "Aéreo Incluso",
          operatorSlug: "",
          adultPriceCents: Math.round(pkg.suggestedPriceCents / Math.max(1, pkg.defaultAdults)),
          isRecommended: true,
        },
      ]);
      setHotelQuery((mainH as any).hotel_name || (mainH as any).name || "");
    }

    if (pkg.suggestedPriceCents > 0) {
      const rate = Math.round(pkg.suggestedPriceCents / Math.max(1, pkg.defaultAdults));
      setRooms([
        {
          roomNumber: 1,
          roomLabel: "Quarto 1 - Casal",
          roomCategory: "Standard Double",
          mealPlan: "Café da Manhã",
          adultsCount: pkg.defaultAdults || 2,
          childrenCount: pkg.defaultChildren || 0,
          childrenAges: [],
          baseAdultPriceCents: rate,
          baseChildPriceCents: 0,
          addons: [],
          payerName: clientName || "",
        },
      ]);
    }

    if (Array.isArray(pkg.itinerary) && pkg.itinerary.length > 0) {
      setProposalItinerary(
        pkg.itinerary.map((d: any, idx: number) => ({
          day: d.day || idx + 1,
          title: d.title || `Dia ${idx + 1}`,
          description: d.description || "",
          meals: d.meals || "Café da Manhã",
        }))
      );
    }

    if (Array.isArray(pkg.includes) && pkg.includes.length > 0) {
      setSelectedInclusions(pkg.includes);
    }
    if (Array.isArray(pkg.excludes) && pkg.excludes.length > 0) {
      setSelectedExclusions(pkg.excludes);
    }

    if (Array.isArray(pkg.transfers) && pkg.transfers.length > 0) {
      setProposalTransfers(
        pkg.transfers.map((t: any) => ({
          type: t.type || "Transfer In/Out",
          vehicle: t.vehicle || (t as any).vehicle_type || "Transporte Executivo",
          date: departureDate,
          notes: t.notes || (t as any).description || "",
        }))
      );
    }

    setSelectedPackageTemplateId(pkg.id);
    setShowCatalogModal(false);
    toast.success(`Pacote "${pkg.title}" aplicado na proposta!`);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Fornecedores & Operadoras Cadastradas na Agência (Sem Mocks Hardcoded)
  const { data: rawRegisteredSuppliers = [] } = useQuery({
    queryKey: ["travel-suppliers-active"],
    queryFn: () => listTravelSuppliers({ data: {} }),
    enabled: open,
  });

  const { data: erpCommissionConfig } = useQuery({
    queryKey: ["agency-erp-commission-config-proposal"],
    queryFn: () => getAgencySalesAndCommissionConfigFn({ data: {} }),
    enabled: open,
  });

  const isManagerOrOwner = Boolean(erpCommissionConfig?.isManagerOrOwner);
  const activeAgentProfile = erpCommissionConfig?.agents?.[0] || null;

  const registeredSuppliers = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        commission_rate: number;
        maxBoletoInstallments?: number;
        boletoRequiresDownpayment?: boolean;
        boletoDownpaymentPct?: number;
        maxCardInstallments?: number;
        pixDiscountPct?: number;
      }
    >();
    for (const sup of rawRegisteredSuppliers as any[]) {
      if (sup?.name) {
        map.set(sup.name.toLowerCase(), {
          id: sup.id || `sup-${sup.name}`,
          name: sup.name,
          commission_rate: Number(sup.commission_rate) || 0,
        });
      }
    }
    for (const op of erpCommissionConfig?.operatorConfigs || []) {
      if (op?.operatorName) {
        const existing = map.get(op.operatorName.toLowerCase());
        map.set(op.operatorName.toLowerCase(), {
          id: existing?.id || `erp-op-${op.operatorName}`,
          name: op.operatorName,
          commission_rate: Number(op.baseAgencyCommissionPct) || existing?.commission_rate || 0,
          maxBoletoInstallments: op.maxBoletoInstallments,
          boletoRequiresDownpayment: op.boletoRequiresDownpayment,
          boletoDownpaymentPct: op.boletoDownpaymentPct,
          maxCardInstallments: op.maxCardInstallments,
          pixDiscountPct: op.pixDiscountPct,
        });
      }
    }
    return Array.from(map.values());
  }, [rawRegisteredSuppliers, erpCommissionConfig]);

  // Pós-salvamento: Modal de WhatsApp
  const [createdProposalForWhatsapp, setCreatedProposalForWhatsapp] = useState<TravelProposalDTO | null>(null);

  const {
    data: infotravelStatus,
    isLoading: isLoadingInfotravelStatus,
    refetch: refetchInfotravelStatus,
  } = useQuery({
    queryKey: ["infotravel-integration-status"],
    queryFn: () => getInfotravelIntegrationStatusFn(),
    enabled: open,
  });

  const isInfotravelConfigured = !isLoadingInfotravelStatus && Boolean(infotravelStatus?.isConfigured);

  const activeCampaign: OperatorPaymentCampaignRule = useMemo(() => {
    return {
      operatorSlug: operatorName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "custom",
      operatorDisplayName: operatorName.trim() || "Fornecedor",
      maxBoletoInstallments: enableBoleto ? Math.max(1, boletoInstallments) : 1,
      boletoMinDownpaymentPct: hasBoletoDownpayment ? (downpaymentType === "percentage" ? downpaymentPct : 0) : 0,
      hasDownpayment: hasBoletoDownpayment,
      downpaymentType,
      downpaymentFixedCents: hasBoletoDownpayment && downpaymentType === "fixed_cents" ? downpaymentFixedCents : 0,
      maxCardInstallments: enableCard ? Math.max(1, cardInstallments) : 1,
      pixCashDiscountPct: enablePixDiscount ? pixDiscountPct : 0,
      firstBoletoDueDescription: firstBoletoDue,
    };
  }, [
    operatorName,
    enableBoleto,
    boletoInstallments,
    hasBoletoDownpayment,
    downpaymentType,
    downpaymentPct,
    downpaymentFixedCents,
    enableCard,
    cardInstallments,
    enablePixDiscount,
    pixDiscountPct,
    firstBoletoDue,
  ]);

  const calculation = useMemo(
    () => calculateMultiRoomQuoteBreakdown(rooms, activeCampaign),
    [rooms, activeCampaign]
  );

  const generatedTermsText = useMemo(() => {
    const parts: string[] = [];
    if (enableBoleto) {
      if (hasBoletoDownpayment) {
        const downpaymentStr =
          downpaymentType === "fixed_cents"
            ? formatMoney(downpaymentFixedCents)
            : `${downpaymentPct}% (${formatMoney(Math.round((calculation.grandTotalCents * downpaymentPct) / 100))})`;
        const remaining = Math.max(1, boletoInstallments - 1);
        const remainingVal = Math.round(
          (calculation.grandTotalCents -
            (downpaymentType === "fixed_cents"
              ? downpaymentFixedCents
              : Math.round((calculation.grandTotalCents * downpaymentPct) / 100))) /
            remaining
        );
        parts.push(
          `Boleto: Entrada de ${downpaymentStr} + ${remaining}x de ${formatMoney(remainingVal)}`
        );
      } else {
        const monthlyVal = Math.round(
          calculation.grandTotalCents / Math.max(1, boletoInstallments)
        );
        parts.push(
          `Boleto: Até ${boletoInstallments}x de ${formatMoney(monthlyVal)} sem entrada (${firstBoletoDue})`
        );
      }
    }
    if (enableCard) {
      const cardVal = Math.round(
        calculation.grandTotalCents / Math.max(1, cardInstallments)
      );
      parts.push(`Cartão: Até ${cardInstallments}x de ${formatMoney(cardVal)} sem juros`);
    }
    if (enablePixDiscount && pixDiscountPct > 0) {
      const pixVal = Math.round(calculation.grandTotalCents * (1 - pixDiscountPct / 100));
      parts.push(`À Vista no Pix: ${formatMoney(pixVal)} (${pixDiscountPct}% de desconto)`);
    }
    return parts.join(" | ");
  }, [
    enableBoleto,
    hasBoletoDownpayment,
    downpaymentType,
    downpaymentFixedCents,
    downpaymentPct,
    boletoInstallments,
    firstBoletoDue,
    enableCard,
    cardInstallments,
    enablePixDiscount,
    pixDiscountPct,
    calculation.grandTotalCents,
  ]);

  // Manipulação de Quartos
  const handleAddRoom = () => {
    const nextRoomNumber = rooms.length + 1;
    setRooms((prev) => [
      ...prev,
      {
        roomNumber: nextRoomNumber,
        roomLabel: `Quarto ${nextRoomNumber} — Duplo`,
        roomCategory: "Standard Double",
        mealPlan: "Café da Manhã",
        adultsCount: 2,
        childrenCount: 0,
        childrenAges: [],
        baseAdultPriceCents: rooms[0]?.baseAdultPriceCents || 0,
        baseChildPriceCents: rooms[0]?.baseChildPriceCents || 0,
        addons: [],
        payerName: "",
      },
    ]);
  };

  const handleRemoveRoom = (roomNumber: number) => {
    if (rooms.length <= 1) {
      toast.info("A proposta deve conter no mínimo 1 quarto.");
      return;
    }
    setRooms((prev) => prev.filter((r) => r.roomNumber !== roomNumber));
  };

  const handleUpdateRoom = (roomNumber: number, patch: Partial<QuoteRoomConfigInput>) => {
    setRooms((prev) =>
      prev.map((r) => (r.roomNumber === roomNumber ? { ...r, ...patch } : r))
    );
  };

  const handleToggleRoomAddon = (
    roomNumber: number,
    addon: { code: string; label: string; priceCents: number }
  ) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.roomNumber !== roomNumber) return r;
        const exists = r.addons.some((a) => a.code === addon.code);
        const newAddons = exists
          ? r.addons.filter((a) => a.code !== addon.code)
          : [...r.addons, addon];
        return { ...r, addons: newAddons };
      })
    );
  };

  // OCR de Documentos / Orçamentos
  const [isPublishingOcrToRadar, setIsPublishingOcrToRadar] = useState(false);

  const handlePublishProposalToCatalogAndRadar = async () => {
    if (!destinationQuery.trim()) {
      toast.error("Informe o destino antes de publicar no Catálogo e Radar.");
      return;
    }
    setIsPublishingOcrToRadar(true);
    try {
      const primaryHotel = bundleOptions[0]?.hotelName || hotelQuery || "";
      const res = await publishExtractedTravelPackageToCatalogAndMatchRadar({
        data: {
          title: customTitle.trim() || `Pacote ${destinationQuery.trim()}`,
          destination_city: destinationQuery.trim(),
          destination_country: "Brasil",
          departure_city: originCity || "Chapecó",
          departure_date: departureDate || null,
          return_date: returnDate || null,
          hotel_name: primaryHotel || null,
          meal_plan: rooms[0]?.mealPlan || "Café da Manhã",
          transport_type: "airplane",
          inclusions: selectedInclusions,
          highlights: [],
          price_cents: calculation.grandTotalCents || rooms[0]?.baseAdultPriceCents || 0,
          max_installments: activeCampaign.maxCardInstallments || 12,
          pricing_mode: "per_person",
          visibility: "public",
          confidence_score: 0.95,
        },
      });
      toast.success(
        `Publicado no catálogo! ${res.radarMatchesFound} match(es) no Radar e ${res.matchedCrmLeadsCount} lead(s) compatíveis.`,
      );
      queryClient.invalidateQueries({ queryKey: ["opportunity-matches"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-crm-leads"] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao publicar oferta no Catálogo & Radar.");
    } finally {
      setIsPublishingOcrToRadar(false);
    }
  };

  const normalizeDateToIso = (d?: string | null): string | null => {
    if (!d) return null;
    const clean = d.trim();
    if (!clean) return null;
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    // YYYY-MM-DDTHH:mm:ss
    if (/^\d{4}-\d{2}-\d{2}T/.test(clean)) return clean.split("T")[0];
    // DD/MM/YYYY ou DD/MM/YYYY HH:mm
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(clean)) {
      const datePart = clean.split(" ")[0];
      const [day, month, year] = datePart.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    // DD-MM-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}/.test(clean)) {
      const datePart = clean.split(" ")[0];
      const [day, month, year] = datePart.split("-");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    // DD/MM/YY (ano de 2 dígitos)
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(clean)) {
      const [day, month, yy] = clean.split("/");
      const year = Number(yy) < 50 ? `20${yy}` : `19${yy}`;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    // Formato por extenso em português: "9 de janeiro de 2027" ou "09 de jan de 2027"
    const monthsPt: Record<string, string> = {
      jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
      jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
      janeiro: "01", fevereiro: "02", marco: "03", "março": "03", abril: "04",
      maio: "05", junho: "06", julho: "07", agosto: "08", setembro: "09",
      outubro: "10", novembro: "11", dezembro: "12",
    };
    const ptMatch = clean.toLowerCase().match(/(\d{1,2})\s*(?:de|\/|-|\s)\s*([a-zç]+)\s*(?:de|\/|-|\s)\s*(\d{2,4})/);
    if (ptMatch) {
      const day = ptMatch[1].padStart(2, "0");
      const monthStr = ptMatch[2];
      const yy = ptMatch[3];
      const year = yy.length === 2 ? (Number(yy) < 50 ? `20${yy}` : `19${yy}`) : yy;
      const month = monthsPt[monthStr] || monthsPt[monthStr.slice(0, 3)];
      if (month) return `${year}-${month}-${day}`;
    }
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return null;
  };

  const applyExtractedTravelData = (extracted: {
    destination?: string | null;
    origin?: string | null;
    departureDate?: string | null;
    returnDate?: string | null;
    clientName?: string | null;
    clientPhone?: string | null;
    clientEmail?: string | null;
    clientDocument?: string | null;
    operatorName?: string | null;
    hotelName?: string | null;
    mealPlan?: string | null;
    roomCategory?: string | null;
    adultsCount?: number | null;
    childrenCount?: number | null;
    childrenAges?: number[] | null;
    grossPriceCents?: number | null;
    operatorNetCents?: number | null;
    suggestedCommissionCents?: number | null;
    maxInstallments?: number | null;
    hasDownpayment?: boolean | null;
    downpaymentPct?: number | null;
    downpaymentFixedCents?: number | null;
    firstBoletoDue?: string | null;
    pixDiscountPct?: number | null;
    cardInstallments?: number | null;
    boletoInstallments?: number | null;
    inclusions?: string[] | null;
    hotelsList?: Array<{ hotel_name?: string; meal_plan?: string; room_category?: string; price_cents?: number } | any>;
  }): number => {
    let fieldsUpdated = 0;

    const cleanDest = sanitizeDestinationString(extracted.destination);
    if (cleanDest && cleanDest !== "Destino a definir") {
      setDestinationQuery(cleanDest);
      setCustomTitle(`Proposta ${cleanDest}`);
      fieldsUpdated++;
    }

    if (extracted.origin?.trim()) {
      setOriginCity(extracted.origin.trim());
      fieldsUpdated++;
    }

    const isoDep = normalizeDateToIso(extracted.departureDate);
    if (isoDep) {
      setDepartureDate(isoDep);
      fieldsUpdated++;
    }

    const isoRet = normalizeDateToIso(extracted.returnDate);
    if (isoRet) {
      setReturnDate(isoRet);
      fieldsUpdated++;
    }

    if (extracted.clientName?.trim()) {
      setClientName(extracted.clientName.trim());
      fieldsUpdated++;
    }

    if (extracted.clientPhone?.trim()) {
      setClientPhone(extracted.clientPhone.trim());
      fieldsUpdated++;
    }

    if (extracted.clientEmail?.trim()) {
      setClientEmail(extracted.clientEmail.trim());
      fieldsUpdated++;
    }

    if (extracted.clientDocument?.trim()) {
      setClientDocument(extracted.clientDocument.trim());
      fieldsUpdated++;
    }

    if (extracted.operatorName?.trim()) {
      setOperatorName(extracted.operatorName.trim());
      fieldsUpdated++;
    }

    const detectedHotel = extracted.hotelName?.trim();
    if (detectedHotel) {
      const matchedInBank = (hotelSuggestions as any[]).find(
        (h) => h.name && h.name.toLowerCase().includes(detectedHotel.toLowerCase()),
      );
      const canonicalHotel = matchedInBank?.name || detectedHotel;
      setHotelQuery(canonicalHotel);
      setBundleOptions((prev) =>
        prev.map((opt, i) => (i === 0 ? { ...opt, hotelName: canonicalHotel } : opt)),
      );
      fieldsUpdated++;
    }

    const adults = Math.max(1, extracted.adultsCount || 2);
    const children = Math.max(0, extracted.childrenCount || 0);
    const grossCents = extracted.grossPriceCents || 0;
    const perAdultCents = grossCents > 0 ? Math.round(grossCents / adults) : 0;

    if (grossCents > 0 || extracted.adultsCount || extracted.mealPlan || extracted.roomCategory || extracted.childrenAges) {
      setRooms((prev) => [
        {
          ...prev[0],
          adultsCount: adults,
          childrenCount: children,
          childrenAges: (Array.isArray(extracted.childrenAges) && extracted.childrenAges.length > 0)
            ? extracted.childrenAges
            : prev[0].childrenAges,
          baseAdultPriceCents: perAdultCents > 0 ? perAdultCents : prev[0].baseAdultPriceCents,
          mealPlan: extracted.mealPlan?.trim() || prev[0].mealPlan,
          roomCategory: extracted.roomCategory?.trim() || prev[0].roomCategory,
        },
        ...prev.slice(1),
      ]);

      if (perAdultCents > 0) {
        setBundleOptions((prev) =>
          prev.map((opt, i) =>
            i === 0
              ? {
                  ...opt,
                  adultPriceCents: perAdultCents,
                  hotelName: detectedHotel || opt.hotelName,
                }
              : opt,
          ),
        );
      }
      fieldsUpdated++;
    }

    if (Array.isArray(extracted.hotelsList) && extracted.hotelsList.length > 1) {
      setBundleOptions(
        extracted.hotelsList.map((h: any, idx: number) => ({
          optionLabel: `Opção ${idx + 1} — ${h.hotel_name || "Hospedagem"}`,
          hotelName: h.hotel_name || "",
          airlineDesc: "",
          operatorSlug: extracted.operatorName || "",
          adultPriceCents: h.price_cents ? Math.round(h.price_cents / adults) : perAdultCents,
          isRecommended: idx === 0,
        }))
      );
      fieldsUpdated++;
    }

    if (extracted.operatorNetCents && extracted.grossPriceCents && extracted.grossPriceCents > extracted.operatorNetCents) {
      const commCents = extracted.suggestedCommissionCents || (extracted.grossPriceCents - extracted.operatorNetCents);
      const commPct = Math.round((commCents / extracted.grossPriceCents) * 100);
      if (commPct > 0 && commPct <= 50) {
        setAgencyCommissionPct(commPct);
        fieldsUpdated++;
      }
    }

    if (extracted.hasDownpayment !== undefined && extracted.hasDownpayment !== null) {
      setHasBoletoDownpayment(Boolean(extracted.hasDownpayment));
      fieldsUpdated++;
    }

    if (extracted.downpaymentPct !== undefined && extracted.downpaymentPct !== null && extracted.downpaymentPct > 0) {
      setDownpaymentType("percentage");
      setDownpaymentPct(extracted.downpaymentPct);
      setHasBoletoDownpayment(true);
      fieldsUpdated++;
    } else if (extracted.downpaymentFixedCents !== undefined && extracted.downpaymentFixedCents !== null && extracted.downpaymentFixedCents > 0) {
      setDownpaymentType("fixed_cents");
      setDownpaymentFixedCents(extracted.downpaymentFixedCents);
      setHasBoletoDownpayment(true);
      fieldsUpdated++;
    }

    if (extracted.firstBoletoDue?.trim()) {
      setFirstBoletoDue(extracted.firstBoletoDue.trim());
      fieldsUpdated++;
    }

    if (extracted.pixDiscountPct !== undefined && extracted.pixDiscountPct !== null) {
      setEnablePixDiscount(true);
      setPixDiscountPct(extracted.pixDiscountPct);
      fieldsUpdated++;
    }

    if (extracted.cardInstallments && extracted.cardInstallments > 0) {
      setEnableCard(true);
      setCardInstallments(extracted.cardInstallments);
      fieldsUpdated++;
    }

    if (extracted.boletoInstallments && extracted.boletoInstallments > 0) {
      setEnableBoleto(true);
      setBoletoInstallments(extracted.boletoInstallments);
      fieldsUpdated++;
    } else if (extracted.maxInstallments && extracted.maxInstallments > 0) {
      setCardInstallments(extracted.maxInstallments);
      setBoletoInstallments(extracted.maxInstallments);
      fieldsUpdated++;
    }

    if (Array.isArray(extracted.inclusions) && extracted.inclusions.length > 0) {
      setSelectedInclusions((prev) => {
        const set = new Set(prev);
        for (const inc of extracted.inclusions!) {
          if (inc && typeof inc === "string" && inc.trim()) {
            set.add(inc.trim());
          }
        }
        return Array.from(set);
      });
      fieldsUpdated++;
    }

    return fieldsUpdated;
  };

  const handleOcrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningOcr(true);
    const toastId = toast.loading(`Lendo documento ${file.name} via OCR inteligente...`);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];

          // 1. Tenta primeiramente o motor especializado de operadoras B2B de turismo
          const quoteRes = await processOperatorQuoteOcr({
            data: {
              fileBase64: base64Data,
              fileMime: file.type || "application/pdf",
              fileName: file.name,
            },
          }).catch((err) => {
            console.warn("[proposal-ocr] Falha no processOperatorQuoteOcr, tentando fallback universal:", err);
            return null;
          });

          if (quoteRes?.data) {
            const q = quoteRes.data;
            if (Array.isArray(q.flights) && q.flights.length > 0) {
              setProposalFlights(q.flights.map((f: any, i: number) => ({
                id: f.id || `fl-ocr-${i + 1}`,
                type: i === 0 ? "outbound" : "return",
                leg: i === 0 ? "ida" : "volta",
                airline: f.airline_name || f.airline || "Companhia Aérea",
                airline_name: f.airline_name || f.airline || "Companhia Aérea",
                flight_number: f.flight_number || "",
                origin: f.origin_iata || f.origin || "",
                origin_iata: f.origin_iata || f.origin || "",
                origin_city: f.origin_city || "",
                destination: f.destination_iata || f.destination || "",
                destination_iata: f.destination_iata || f.destination || "",
                destination_city: f.destination_city || "",
                date: f.date || f.departure_date || (i === 0 ? (q.travel_start || "") : (q.travel_end || "")),
                departure_date: f.departure_date || f.date || (i === 0 ? (q.travel_start || "") : (q.travel_end || "")),
                departure_time: f.departure_time || "",
                arrival_time: f.arrival_time || "",
                baggage: f.baggage_included || f.baggage || "",
                baggage_included: f.baggage_included || f.baggage || "",
                stops: f.stops_count ?? f.connections_count ?? 0,
                stops_count: f.stops_count ?? f.connections_count ?? 0,
              })));
            }
            if (Array.isArray(q.transfers) && q.transfers.length > 0) {
              setProposalTransfers(q.transfers.map((t: any, i: number) => ({
                id: `tr-ocr-${i + 1}`,
                type: "in_out",
                vehicle: t.vehicle_type || t.vehicle || "Transfer Regular",
                route_name: typeof t === "string" ? t : (t.route_name || "Transfer Aeroporto ↔ Hotel"),
                vehicle_type: t.vehicle_type || "Transfer Regular",
                is_private: Boolean(t.is_private),
                price_cents: 0,
              })));
            }
            const detectedDest = (q.destination && q.destination !== "Destino a definir")
              ? q.destination
              : (q.hotels?.[0]?.city || q.flights?.[0]?.destination_city || q.flights?.[0]?.destination_iata);

            const updatedCount = applyExtractedTravelData({
              destination: detectedDest,
              origin: q.origin || q.flights?.[0]?.origin_city || (q.flights?.[0]?.origin_iata ? `${q.flights[0].origin_iata}` : undefined),
              departureDate: q.travel_start || q.flights?.[0]?.date || q.hotels?.[0]?.checkin_date,
              returnDate: q.travel_end || q.hotels?.[0]?.checkout_date,
              clientName: q.client_name,
              clientPhone: q.client_phone,
              clientEmail: q.client_email,
              clientDocument: q.client_document,
              operatorName: q.operator_name,
              hotelName: q.hotels?.[0]?.hotel_name,
              mealPlan: q.hotels?.[0]?.meal_plan,
              roomCategory: q.hotels?.[0]?.room_category,
              adultsCount: q.adults_count,
              childrenCount: q.children_count,
              childrenAges: q.children_ages,
              grossPriceCents: q.gross_price_cents,
              operatorNetCents: q.operator_net_cents,
              suggestedCommissionCents: q.suggested_commission_cents,
              maxInstallments: q.max_installments,
              hasDownpayment: q.has_downpayment,
              downpaymentPct: q.downpayment_pct,
              downpaymentFixedCents: q.downpayment_cents,
              firstBoletoDue: q.first_installment_due,
              pixDiscountPct: q.pix_discount_pct,
              cardInstallments: q.card_installments,
              boletoInstallments: q.boleto_installments,
              inclusions: q.inclusions,
              hotelsList: q.hotels ?? undefined,
            });

            setLastOcrExtraction(q);

            if (updatedCount > 0 || (Array.isArray(q.flights) && q.flights.length > 0)) {
              if (Array.isArray(q.flights) && q.flights.length > 0) {
                setStepTab("aereo");
              } else if (q.hotels?.[0]?.hotel_name) {
                setStepTab("opcoes");
              } else {
                setStepTab("destino");
              }
              const highlights = [
                detectedDest ? `Destino: ${detectedDest}` : null,
                Array.isArray(q.flights) && q.flights.length > 0 ? `${q.flights.length} voo(s)` : null,
                q.hotels?.[0]?.hotel_name ? `Hotel: ${q.hotels[0].hotel_name}` : null,
                q.gross_price_cents ? `Total: ${formatMoney(q.gross_price_cents)}` : null,
              ].filter(Boolean);
              toast.success(`Cotação da operadora extraída com sucesso! (${highlights.join(" · ")})`, { id: toastId });
              return;
            }
          }

          // 2. Fallback para o motor universal se o específico não tiver retornado campos
          const universalRes = await parseUniversalDocumentOCR({
            data: {
              files: [
                {
                  base64: base64Data,
                  name: file.name,
                  mimeType: (file.type as any) || "application/pdf",
                },
              ],
              nicheHint: "tourism",
            },
          }).catch(() => null);

          if (universalRes && universalRes.confidence !== "low") {
            if (Array.isArray(universalRes.flightSegments) && universalRes.flightSegments.length > 0) {
              setProposalFlights(universalRes.flightSegments.map((f: any, i: number) => ({
                id: f.id || `fl-ocr-u-${i + 1}`,
                type: i === 0 ? "outbound" : "return",
                leg: i === 0 ? "ida" : "volta",
                airline: f.airline || "Companhia Aérea",
                airline_name: f.airline || "Companhia Aérea",
                flight_number: f.flightNumber || "",
                origin: f.origin || "",
                origin_iata: f.origin || "",
                origin_city: f.originCity || "",
                destination: f.destination || "",
                destination_iata: f.destination || "",
                destination_city: f.destinationCity || "",
                date: (i === 0 ? universalRes.dates?.departure : universalRes.dates?.return) || "",
                departure_date: (i === 0 ? universalRes.dates?.departure : universalRes.dates?.return) || "",
                departure_time: f.departureTime || "",
                arrival_time: f.arrivalTime || "",
                baggage: f.baggageIncluded || "",
                baggage_included: f.baggageIncluded || "",
                stops: 0,
                stops_count: 0,
              })));
            }

            const updatedCount = applyExtractedTravelData({
              destination: universalRes.destinationCity,
              origin: universalRes.flightSegments?.[0]?.origin,
              departureDate: universalRes.dates?.departure,
              returnDate: universalRes.dates?.return,
              clientName: universalRes.clientName,
              clientPhone: universalRes.clientPhone,
              clientEmail: (universalRes as any).clientEmail,
              clientDocument: universalRes.clientDocument,
              operatorName: universalRes.companyName !== "Não identificado" ? universalRes.companyName : undefined,
              hotelName: universalRes.hotel?.name,
              grossPriceCents: universalRes.financials?.totalCents || universalRes.financial?.totalAmountCents,
            });

            setLastOcrExtraction({
              operator_name: universalRes.companyName !== "Não identificado" ? universalRes.companyName : undefined,
              destination: universalRes.destinationCity,
              gross_price_cents: universalRes.financials?.totalCents || universalRes.financial?.totalAmountCents,
              hotels: universalRes.hotel?.name ? [{ hotel_name: universalRes.hotel.name }] : [],
              flights: (universalRes.flightSegments || []).map((f: any) => ({
                airline: f.airline,
                flight_number: f.flightNumber,
                origin_iata: f.origin,
                destination_iata: f.destination,
              })),
            } as any);

            if (updatedCount > 0 || (Array.isArray(universalRes.flightSegments) && universalRes.flightSegments.length > 0)) {
              if (Array.isArray(universalRes.flightSegments) && universalRes.flightSegments.length > 0) {
                setStepTab("aereo");
              } else {
                setStepTab("opcoes");
              }
              toast.success("Dados do documento extraídos e preenchidos com sucesso!", { id: toastId });
              return;
            }
          }

          toast.error(
            "Não foi possível extrair dados estruturados deste arquivo. Use o botão 'Colar Texto' ou preencha manualmente.",
            { id: toastId },
          );
        } catch (innerErr: any) {
          toast.error(innerErr?.message || "Erro no processamento do OCR da operadora.", { id: toastId });
        } finally {
          setIsScanningOcr(false);
          e.target.value = "";
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsScanningOcr(false);
      toast.error("Falha ao ler o arquivo localmente.", { id: toastId });
    }
  };

  const handleParsePastedOcrText = async () => {
    const raw = ocrPastedText.trim();
    if (!raw) {
      toast.error("Cole o texto do orçamento, GDS ou WhatsApp para extrair os dados.");
      return;
    }

    const toastId = toast.loading("Analisando texto da cotação...");
    try {
      const res = await processOperatorQuoteOcr({
        data: { rawText: raw },
      }).catch(() => null);

      if (res?.data) {
        const q = res.data;
        if (Array.isArray(q.flights) && q.flights.length > 0) {
          setProposalFlights(
            q.flights.map((f: any, i: number) => ({
              id: f.id || `fl-ocr-txt-${i + 1}`,
              type: i === 0 ? "outbound" : "return",
              leg: i === 0 ? "ida" : "volta",
              airline: f.airline_name || f.airline || "Companhia Aérea",
              airline_name: f.airline_name || f.airline || "Companhia Aérea",
              flight_number: f.flight_number || "",
              origin: f.origin_iata || f.origin || "",
              origin_iata: f.origin_iata || f.origin || "",
              origin_city: f.origin_city || "",
              destination: f.destination_iata || f.destination || "",
              destination_iata: f.destination_iata || f.destination || "",
              destination_city: f.destination_city || "",
              date: f.date || f.departure_date || (i === 0 ? (q.travel_start || "") : (q.travel_end || "")),
              departure_date: f.departure_date || f.date || (i === 0 ? (q.travel_start || "") : (q.travel_end || "")),
              departure_time: f.departure_time || "",
              arrival_time: f.arrival_time || "",
              baggage: f.baggage_included || f.baggage || "",
              baggage_included: f.baggage_included || f.baggage || "",
              stops: f.stops_count ?? f.connections_count ?? 0,
              stops_count: f.stops_count ?? f.connections_count ?? 0,
            })),
          );
        }
        if (Array.isArray(q.transfers) && q.transfers.length > 0) {
          setProposalTransfers(
            q.transfers.map((t: any, i: number) => ({
              id: `tr-ocr-txt-${i + 1}`,
              type: "in_out",
              vehicle: t.vehicle_type || t.vehicle || "Veículo Executivo",
              route_name: typeof t === "string" ? t : (t.route_name || "Transfer Aeroporto ↔ Hotel"),
              vehicle_type: t.vehicle_type || "Veículo Executivo",
              is_private: Boolean(t.is_private),
              price_cents: 0,
            })),
          );
        }
        const detectedDest = (q.destination && q.destination !== "Destino a definir")
          ? q.destination
          : (q.hotels?.[0]?.city || q.flights?.[0]?.destination_city || q.flights?.[0]?.destination_iata);

        const updated = applyExtractedTravelData({
          destination: detectedDest,
          origin: q.origin || q.flights?.[0]?.origin_city || (q.flights?.[0]?.origin_iata ? `${q.flights[0].origin_iata}` : undefined),
          departureDate: q.travel_start || q.flights?.[0]?.date || q.hotels?.[0]?.checkin_date,
          returnDate: q.travel_end || q.hotels?.[0]?.checkout_date,
          clientName: q.client_name,
          clientPhone: q.client_phone,
          clientEmail: q.client_email,
          clientDocument: q.client_document,
          operatorName: q.operator_name,
          hotelName: q.hotels?.[0]?.hotel_name,
          mealPlan: q.hotels?.[0]?.meal_plan,
          roomCategory: q.hotels?.[0]?.room_category,
          adultsCount: q.adults_count,
          childrenCount: q.children_count,
          childrenAges: q.children_ages,
          grossPriceCents: q.gross_price_cents,
          operatorNetCents: q.operator_net_cents,
          suggestedCommissionCents: q.suggested_commission_cents,
          maxInstallments: q.max_installments,
          hasDownpayment: q.has_downpayment,
          downpaymentPct: q.downpayment_pct,
          downpaymentFixedCents: q.downpayment_cents,
          firstBoletoDue: q.first_installment_due,
          pixDiscountPct: q.pix_discount_pct,
          cardInstallments: q.card_installments,
          boletoInstallments: q.boleto_installments,
          inclusions: q.inclusions,
          hotelsList: q.hotels ?? undefined,
        });

        setLastOcrExtraction(q);

        if (updated > 0 || (Array.isArray(q.flights) && q.flights.length > 0)) {
          if (Array.isArray(q.flights) && q.flights.length > 0) {
            setStepTab("aereo");
          } else if (q.hotels?.[0]?.hotel_name) {
            setStepTab("opcoes");
          }
          setNotes((prev) => (prev ? `${prev}\n${raw.slice(0, 400)}` : raw.slice(0, 400)));
          setShowOcrTextModal(false);
          setOcrPastedText("");
          toast.success("Texto analisado e dados da proposta preenchidos com sucesso!", { id: toastId });
          return;
        }
      }

      // Fallback regex local se offline ou IA não retornar campos
      const priceMatch = raw.match(/R\$\s*([\d.]+(?:,\d{2})?)/i);
      if (priceMatch?.[1]) {
        const parsedVal = parseFloat(priceMatch[1].replace(/\./g, "").replace(",", "."));
        if (!isNaN(parsedVal) && parsedVal > 0) {
          const perAdultCents = Math.round((parsedVal * 100) / 2);
          setRooms((prev) =>
            prev.map((r, i) => (i === 0 ? { ...r, baseAdultPriceCents: perAdultCents } : r)),
          );
          setBundleOptions((prev) =>
            prev.map((o, i) => (i === 0 ? { ...o, adultPriceCents: perAdultCents } : o)),
          );
        }
      }
      const dateMatches = raw.match(/\b(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/g);
      if (dateMatches && dateMatches.length >= 1) {
        const toIso = (d: string) =>
          d.includes("/") ? d.split("/").reverse().join("-") : d;
        setDepartureDate(toIso(dateMatches[0]));
        if (dateMatches[1]) setReturnDate(toIso(dateMatches[1]));
      }
      const matchedTpl = TRAVEL_PACKAGE_TEMPLATES.find((t) =>
        raw.toLowerCase().includes(t.destinationCity.split(",")[0].toLowerCase()),
      );
      if (matchedTpl) {
        setDestinationQuery(matchedTpl.destinationCity);
      }
      setNotes((prev) => (prev ? `${prev}\n${raw.slice(0, 400)}` : raw.slice(0, 400)));
      setShowOcrTextModal(false);
      setOcrPastedText("");
      toast.success("Texto analisado e tarifas/datas aplicadas à proposta!", { id: toastId });
    } catch {
      setShowOcrTextModal(false);
      toast.error("Erro ao processar texto colado. Preencha os campos manualmente.", { id: toastId });
    }
  };

  // Busca InfoTravel Ao Vivo
  const handleSearchInfotravelLive = async () => {
    if (!isInfotravelConfigured) {
      toast.error(
        "Chave da API InfoTravel não configurada. Acesse as Integrações para ativar."
      );
      return;
    }
    setIsSearchingInfotravel(true);
    try {
      const packages = await infotravelSearchPackages({
        data: {
          destination: destinationQuery,
          departureDate,
          returnDate,
          adults: rooms.reduce((acc, r) => acc + r.adultsCount, 0),
          childrenAges: rooms.flatMap((r) => r.childrenAges),
          roomOccupancies: rooms.map((r) => ({
            adults: r.adultsCount,
            childrenAges: r.childrenAges,
          })),
          operatorSlug: infotravelOperatorFilter,
        },
      });
      if (!packages || packages.length === 0) {
        toast.info("Nenhuma tarifa ativa retornada pela API InfoTravel.");
        await refetchInfotravelStatus();
        return;
      }
      setBundleOptions(
        packages.slice(0, 4).map((pkg, idx) => ({
          optionLabel: `Opção ${idx + 1} — ${pkg.operatorSlug.toUpperCase()}`,
          hotelName: pkg.hotelName || pkg.packageName,
          airlineDesc: `${pkg.includesFlight ? "Aéreo Incluso" : "Terrestre"} · ${pkg.boardType || "Café da Manhã"}`,
          operatorSlug: pkg.operatorSlug,
          adultPriceCents: Math.round((pkg.priceTotalBrl / 2) * 100),
          isRecommended: idx === 0,
          quoteSessionId: pkg.quoteSessionId,
          offerSnapshotId: pkg.offerSnapshotId,
        }))
      );
      toast.success(`${packages.length} pacotes carregados diretamente da API InfoTravel!`);
    } catch (err: any) {
      toast.error(err?.message || "Erro na comunicação com a API InfoTravel.");
      await refetchInfotravelStatus();
    } finally {
      setIsSearchingInfotravel(false);
    }
  };

  // Mutação para Salvar a Proposta Canônica
  const saveProposalMutation = useMutation({
    mutationFn: async ({ openStudioAfterSave }: { openStudioAfterSave: boolean }) => {
      const mainHotel = bundleOptions[0]?.hotelName || "";
      const roomSummaryLines = calculation.rooms.map(
        (r) =>
          `• ${r.roomLabel} (${r.adultsCount} Adultos${r.childrenCount > 0 ? ` + ${r.childrenCount} Crianças` : ""}): ${formatMoney(r.roomTotalCents)}${
            r.addons.length > 0 ? ` [Inclui: ${r.addons.map((a) => a.label).join(", ")}]` : ""
          }`
      );

      const gatewayText = gatewayResolution
        ? `\nLogística Regional de Aeroporto Gateway: Desembarque em ${gatewayResolution.primaryAirportIata} (${gatewayResolution.primaryAirportName}) + ${gatewayResolution.recommendedTransferType.replace("_", " ")} (${gatewayResolution.primaryDistanceKm} km / ${gatewayResolution.primaryTransferDurationMins} min).`
        : "";

      const optionsComparisonText =
        bundleOptions.length > 1
          ? `\nOpções Comparativas:\n` +
            bundleOptions
              .map(
                (opt) =>
                  `- ${opt.optionLabel}: ${opt.hotelName} (${opt.airlineDesc}) — ${formatMoney(opt.adultPriceCents)}/adulto`
              )
              .join("\n")
          : "";

      const inclusionsText = `\nItens Inclusos:\n${selectedInclusions.map((inc) => ` ${inc}`).join("\n")}`;

      const fullSummary =
        `Proposta de Viagem (${activeCampaign.operatorDisplayName}).\n` +
        `Divisão por Quartos:\n${roomSummaryLines.join("\n")}` +
        inclusionsText +
        gatewayText +
        optionsComparisonText +
        (notes ? `\nObservações: ${notes}` : "");

      // Cria cotação no CRM se houver telefone
      let createdQuoteId: string | undefined;
      if (clientPhone.trim()) {
        try {
          const qRes = await createAgencyTravelQuote({
            data: {
              contact_name: clientName || "Cliente em Atendimento",
              contact_whatsapp: clientPhone,
              contact_email: clientEmail || null,
              destination_city: destinationQuery,
              origin_city: originCity,
              departure_date: departureDate || null,
              return_date: returnDate || null,
              adults_count: calculation.totalAdults,
              children_count: calculation.totalChildren,
              children_ages: calculation.rooms.flatMap((r) => r.childrenAges),
              room_occupancies: calculation.rooms.map((r) => ({
                adults: r.adultsCount,
                childrenAges: r.childrenAges,
              })),
              trip_type: "air_package",
              quote_session_id: bundleOptions[0]?.quoteSessionId || null,
              quote_amount_cents: calculation.grandTotalCents || null,
              agency_notes: [mainHotel, fullSummary].filter(Boolean).join("\n"),
              source: "workspace_unified_proposal",
            },
          });
          createdQuoteId = qRes.id;
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Não foi possível salvar a cotação no CRM.");
          throw error;
        }
      }

      // Salva a proposta canônica (incluindo roteiro, transfers, passeios e tema do template selecionado)
      const matchedPkgTemplate = TRAVEL_PACKAGE_TEMPLATES.find(
        (t) =>
          t.id === selectedPackageTemplateId ||
          t.destinationCity.toLowerCase() === destinationQuery.toLowerCase(),
      );
      const effectiveTitle =
        customTitle.trim() ||
        (sourcePackageTitle
          ? `${sourcePackageTitle} — ${destinationQuery}`
          : matchedPkgTemplate?.title ||
            `Proposta ${destinationQuery} (${calculation.rooms.length} Quarto${calculation.rooms.length > 1 ? "s" : ""})`);

      const propRes = await createTravelProposal({
        data: {
          quoteId: createdQuoteId,
          title: effectiveTitle,
          destinationCity: destinationQuery,
          travelStartDate: departureDate || undefined,
          travelEndDate: returnDate || undefined,
          adultsCount: calculation.totalAdults,
          childrenCount: calculation.totalChildren,
          clientName: clientName || "Cliente Convidado",
          clientWhatsapp: clientPhone || undefined,
          clientEmail: clientEmail || undefined,
          clientDocument: clientDocument || undefined,
          customerId: selectedCustomerId || undefined,
          leadId: effectiveLeadId && effectiveLeadId.length === 36 ? effectiveLeadId : undefined,
          currency,
          validUntilDays,
          canvasFormat,
          templateTheme,
          templateId: matchedPkgTemplate?.id,
          coverPhotoUrl:
            selectedSourceCatalogItem?.heroImageUrl ||
            lead?.cover_image_url ||
            lead?.cover_image ||
            matchedPkgTemplate?.coverImageUrl ||
            undefined,
          customFields: lead?.customFields || undefined,
          sourceListingId: selectedSourceCatalogItem?.id || lead?.sourceListingId || undefined,
          sourceListingOrigin:
            selectedSourceCatalogItem?.origin ||
            (lead?.sourceListingOrigin === "product" || lead?.sourceListingOrigin === "classified"
              ? lead.sourceListingOrigin
              : undefined),
          initialNotes: fullSummary,
          flights: proposalFlights.length > 0 ? proposalFlights : (matchedPkgTemplate?.flights || []),
          hotels: bundleOptions.filter((opt) => opt.hotelName.trim()).map((opt, idx) => ({
            id: opt.offerSnapshotId || `hotel-${idx + 1}`,
            hotel_name: opt.hotelName,
            name: opt.hotelName,
            stars: matchedPkgTemplate?.hotels?.[0]?.stars,
            destination: destinationQuery,
            checkin_date: departureDate,
            checkout_date: returnDate,
            check_in: departureDate,
            check_out: returnDate,
            nights_count: departureDate && returnDate
              ? Math.max(1, Math.ceil((new Date(returnDate).getTime() - new Date(departureDate).getTime()) / 86400000))
              : undefined,
            room_type: calculation.rooms.map((r) => r.roomLabel).join(" | "),
            board_basis: calculation.rooms[0]?.mealPlan || "",
            image_url: matchedPkgTemplate?.hotels?.[0]?.image_url || matchedPkgTemplate?.coverImageUrl,
            amenities: matchedPkgTemplate?.hotels?.[0]?.amenities || [],
          })),
          itinerary:
            proposalItinerary.length > 0
              ? proposalItinerary
              : (matchedPkgTemplate?.itinerary || []),
          transfers: proposalTransfers.length > 0 ? proposalTransfers : ((matchedPkgTemplate?.transfers as any) || []),
          tours: matchedPkgTemplate?.tours || [],
          rooms: calculation.rooms.map((r) => ({
            id: `room-${r.roomNumber}`,
            roomNumber: r.roomNumber,
            roomType: r.roomLabel,
            adults: r.adultsCount,
            children: r.childrenCount,
            childrenAges: r.childrenAges,
          })),
          pricing: {
            currency,
            base_price_cents: calculation.grandBaseCents,
            boarding_tax_cents: calculation.grandAddonsCents,
            other_taxes_cents: 0,
            discount_cents: 0,
            total_price_cents: calculation.grandTotalCents,
            total_cents: calculation.grandTotalCents,
            installments_options: [
              {
                installments_count: 1,
                installment_value_cents: Math.round(
                  calculation.grandTotalCents * (1 - activeCampaign.pixCashDiscountPct / 100),
                ),
                method: "pix",
                has_interest: false,
              },
              {
                installments_count: activeCampaign.maxCardInstallments,
                installment_value_cents: calculation.campaignSummary.cardMonthlyInstallmentCents,
                method: "credit_card",
                has_interest: false,
              },
              {
                installments_count: activeCampaign.maxBoletoInstallments,
                installment_value_cents: calculation.campaignSummary.boletoMonthlyInstallmentCents,
                method: "boleto",
                has_interest: false,
              },
            ],
            payment_terms:
              isTermsCustomized && customPaymentTermsText.trim()
                ? customPaymentTermsText.trim()
                : generatedTermsText,
          },
          includes: selectedInclusions,
          excludes:
            selectedExclusions.length > 0
              ? selectedExclusions
              : (matchedPkgTemplate?.excludes || []),
        },
      });

      const hydratedProposal: TravelProposalDTO = {
        id: propRes.id,
        quote_id: createdQuoteId || propRes.id,
        public_token: propRes.publicToken,
        agency_name: "Agência de Viagens",
        title: effectiveTitle,
        client_name: clientName || "Cliente Convidado",
        client_whatsapp: clientPhone || "",
        client_email: clientEmail || null,
        adults_count: calculation.totalAdults,
        children_count: calculation.totalChildren,
        canvas_format: canvasFormat,
        template_theme: templateTheme,
        destination_city: destinationQuery,
        travel_start_date: departureDate || null,
        travel_end_date: returnDate || null,
        flights: proposalFlights.length > 0 ? proposalFlights : (matchedPkgTemplate?.flights || []),
        hotels: bundleOptions.filter((opt) => opt.hotelName.trim()).map((opt) => ({
          hotel_name: opt.hotelName,
        })),
        itinerary: (proposalItinerary.length > 0 ? proposalItinerary : (matchedPkgTemplate?.itinerary || [])).map(
          (d: any, idx: number) => ({
            id: d.id || `day-${idx + 1}`,
            day_number: d.day_number ?? d.day ?? idx + 1,
            day: d.day ?? d.day_number ?? idx + 1,
            title: d.title || `Dia ${idx + 1}`,
            description: d.description || "",
            meals: d.meals || "",
          })
        ),
        transfers: proposalTransfers.length > 0 ? proposalTransfers : ((matchedPkgTemplate?.transfers || []).map((t: any) => ({
          type: t.type,
          vehicle: t.vehicle || t.vehicle_type,
          date: t.date,
          notes: t.notes || t.description,
        }))),
        tours: matchedPkgTemplate?.tours || [],
        rooms: calculation.rooms.map((room) => ({
          roomNumber: room.roomNumber,
          roomType: room.roomLabel,
          adults: room.adultsCount,
          children: room.childrenCount,
          childrenAges: room.childrenAges,
        })),
        includes: selectedInclusions,
        excludes: selectedExclusions.length > 0 ? selectedExclusions : (matchedPkgTemplate?.excludes || []),
        pricing: {
          currency,
          base_price_cents: calculation.grandBaseCents,
          boarding_tax_cents: calculation.grandAddonsCents,
          other_taxes_cents: 0,
          discount_cents: 0,
          total_price_cents: calculation.grandTotalCents,
          installments_options: [
            ...(enableCard ? [{
              installments_count: cardInstallments,
              installment_value_cents: calculation.campaignSummary.cardMonthlyInstallmentCents,
              method: "credit_card",
              has_interest: false,
            }] : []),
            ...(enableBoleto ? [{
              installments_count: boletoInstallments,
              installment_value_cents: calculation.campaignSummary.boletoMonthlyInstallmentCents,
              method: "boleto",
              has_interest: false,
            }] : []),
            ...(enablePixDiscount ? [{
              installments_count: 1,
              installment_value_cents: Math.round(calculation.grandTotalCents * (1 - pixDiscountPct / 100)),
              method: "pix",
              has_interest: false,
            }] : []),
          ],
        },
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        proposal: hydratedProposal,
        quoteId: createdQuoteId,
        openStudioAfterSave,
      };
    },
    onSuccess: (res) => {
      toast.success("Proposta criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["agency-quotes"] });

      if (onCreated) {
        onCreated({
          proposalId: res.proposal?.id,
          quoteId: res.quoteId,
          proposal: res.proposal as any,
        });
      }

      if (res.openStudioAfterSave && res.proposal?.id) {
        navigate({
          to: "/workspace/turismo/propostas/$id",
          params: { id: res.proposal.id },
        });
      } else {
        // Abre o modal de compartilhamento WhatsApp
        setCreatedProposalForWhatsapp(res.proposal as any);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar proposta.");
    },
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl p-0 flex flex-col h-full bg-background border-l border-border/60">
          {/* Cabeçalho */}
          <SheetHeader className="p-4 sm:p-6 border-b border-border/40 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <div>
                  <SheetTitle className="text-base sm:text-lg font-bold text-foreground">
                    Nova Proposta
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Elaboração e envio de proposta comercial
                  </SheetDescription>
                </div>
              </div>

              {/* Gatilho OCR & Catálogo Rápido */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCatalogModal(true)}
                  className="h-11 min-h-11 px-3 text-xs gap-2 font-medium"
                  title="Puxar pacote ou roteiro pré-configurado do catálogo"
                >
                  <Package className="size-3.5 text-primary" />
                  <span className="hidden sm:inline">Puxar do Catálogo</span>
                </Button>
                <input
                  type="file"
                  ref={ocrFileInputRef}
                  onChange={handleOcrFileUpload}
                  accept="application/pdf,image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => ocrFileInputRef.current?.click()}
                  disabled={isScanningOcr}
                  className="h-11 min-h-11 px-3 text-xs gap-2 font-medium"
                  title="Importar proposta ou voucher de operadora via OCR"
                >
                  {isScanningOcr ? (
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                  ) : (
                    <Upload className="size-3.5 text-primary" />
                  )}
                  <span className="hidden sm:inline">Importar OCR</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOcrTextModal((prev) => !prev)}
                  className="h-11 min-h-11 px-3 text-xs gap-2 font-medium"
                  title="Colar texto bruto de orçamento WhatsApp, GDS ou Operadora"
                >
                  <FileText className="size-3.5 text-primary" />
                  <span className="hidden sm:inline">Colar Texto</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePublishProposalToCatalogAndRadar}
                  disabled={isPublishingOcrToRadar || !destinationQuery.trim()}
                  className="h-11 min-h-11 px-3 text-xs gap-2 font-medium"
                  title="Autopublicar no Catálogo de Viagens e cruzar com Radar de Oportunidades"
                >
                  {isPublishingOcrToRadar ? (
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                  ) : (
                    <CheckCircle2 className="size-3.5 text-primary" />
                  )}
                  <span className="hidden sm:inline">Publicar no Radar</span>
                </Button>
              </div>
            </div>

            {showOcrTextModal && (
              <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2">
                <Label className="text-xs font-bold text-foreground">
                  Colar Texto de Orçamento (WhatsApp, GDS Amadeus/Sabre ou Operadora)
                </Label>
                <Textarea
                  value={ocrPastedText}
                  onChange={(e) => setOcrPastedText(e.target.value)}
                  placeholder="Cole aqui o texto copiado do WhatsApp ou portal da operadora (ex: destino, datas, valores em R$, voos)..."
                  className="h-20 text-xs rounded-lg resize-none bg-background"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowOcrTextModal(false)}
                    className="h-11 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleParsePastedOcrText}
                    className="h-11 text-xs font-bold"
                  >
                    Extrair Dados do Texto
                  </Button>
                </div>
              </div>
            )}

            {/* Seletor de Modo: Modo Rápido (Tudo em 1 Tela) vs Passo a Passo */}
            <div className="flex items-center justify-between gap-2 mt-4 pt-2 border-t border-border/30">
              <div className="inline-flex items-center p-1 rounded-lg bg-muted/60 border border-border/40">
                <button
                  type="button"
                  onClick={() => setBuilderViewMode("quick_canvas")}
                  className={`h-11 min-h-11 px-3 rounded-md text-xs font-semibold transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    builderViewMode === "quick_canvas"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Zap className="size-3 text-primary" />
                  <span>Modo Rápido (Tudo em 1 Tela)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBuilderViewMode("wizard")}
                  className={`h-11 min-h-11 px-3 rounded-md text-xs font-semibold transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    builderViewMode === "wizard"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="size-3 text-primary" />
                  <span>Passo a Passo (6 Etapas)</span>
                </button>
              </div>

              <span className="text-2xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary hidden sm:inline-flex items-center gap-1">
                <Zap className="size-3 text-primary" />
                <span>Padrão PassHub / Infotravel</span>
              </span>
            </div>

            {/* Navegação Rápida (Pills de Salto no Modo Rápido ou Abas no Modo Wizard) */}
            {builderViewMode === "quick_canvas" ? (
              <div className="flex items-center gap-2 mt-2 overflow-x-auto scroll-area-carousel no-scrollbar border-b border-border/30 pb-2">
                <button
                  type="button"
                  onClick={() => scrollToSection("sec-destino")}
                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-medium bg-muted/40 hover:bg-muted text-foreground border border-border/40 hover:border-border transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MapPin className="size-3 text-primary" />
                  <span>1. Destino & Pax</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("sec-aereo")}
                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-medium bg-muted/40 hover:bg-muted text-foreground border border-border/40 hover:border-border transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plane className="size-3 text-primary" />
                  <span>2. Voos ({proposalFlights.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("sec-quartos")}
                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-medium bg-muted/40 hover:bg-muted text-foreground border border-border/40 hover:border-border transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Building2 className="size-3 text-primary" />
                  <span>3. Quartos ({rooms.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("sec-opcoes")}
                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-medium bg-muted/40 hover:bg-muted text-foreground border border-border/40 hover:border-border transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Tag className="size-3 text-primary" />
                  <span>4. Hotéis & Inclusões</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("sec-rodoviario")}
                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-medium bg-muted/40 hover:bg-muted text-foreground border border-border/40 hover:border-border transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Bus className="size-3 text-primary" />
                  <span>5. Rodoviário & Roteiro ({proposalItinerary.length}d)</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("sec-pagamento")}
                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-medium bg-muted/40 hover:bg-muted text-foreground border border-border/40 hover:border-border transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CreditCard className="size-3 text-primary" />
                  <span>6. Condições & Template</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-2 overflow-x-auto scroll-area-carousel no-scrollbar border-b border-border/30 pb-2">
                <button
                  type="button"
                  onClick={() => setStepTab("destino")}
                  className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    stepTab === "destino"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <MapPin className="size-3.5" />
                  <span>1. Destino & Pacote</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStepTab("aereo")}
                  className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    stepTab === "aereo"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Plane className="size-3.5" />
                  <span>2. Voos & Aéreo ({proposalFlights.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStepTab("quartos")}
                  className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    stepTab === "quartos"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Building2 className="size-3.5" />
                  <span>3. Quartos ({rooms.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStepTab("opcoes")}
                  className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    stepTab === "opcoes"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Tag className="size-3.5" />
                  <span>4. Hotéis & Inclusões</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStepTab("rodoviario")}
                  className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    stepTab === "rodoviario"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Bus className="size-3.5" />
                  <span>5. Rodoviário & Ônibus</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStepTab("pagamento")}
                  className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    stepTab === "pagamento"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <CreditCard className="size-3.5" />
                  <span>6. Condições & Operadora</span>
                </button>
              </div>
            )}
          </SheetHeader>

          {/* Conteúdo com Rolagem */}
          {/* Corpo com Grid Adaptativo (Formulário + Dock PassHub em telas grandes) */}
          <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 xl:grid-cols-12">
            {/* Coluna Principal: Formulário de Cotação */}
            <div className="xl:col-span-8 overflow-y-auto p-4 sm:p-6 space-y-6 [scrollbar-width:thin]">
            {/* Banner Informativo de OCR Recém-Processado */}
            {lastOcrExtraction && (
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0 mt-0.5 sm:mt-0">
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground">
                        Documento OCR Processado {lastOcrExtraction.operator_name ? `(${lastOcrExtraction.operator_name})` : ""}
                      </span>
                      <Badge variant="outline" className="text-2xs bg-background/80 font-medium">
                        Campos Vinculados
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground mt-1">
                      {lastOcrExtraction.destination && <span>Destino: <strong className="text-foreground">{lastOcrExtraction.destination}</strong></span>}
                      {proposalFlights.length > 0 && <span>Malha: <strong className="text-foreground">{proposalFlights.length} voo(s)</strong></span>}
                      {lastOcrExtraction.hotels?.[0]?.hotel_name && <span>Hotel: <strong className="text-foreground">{lastOcrExtraction.hotels[0].hotel_name}</strong></span>}
                      {lastOcrExtraction.gross_price_cents ? <span>Total: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{formatMoney(lastOcrExtraction.gross_price_cents)}</strong></span> : null}
                      {lastOcrExtraction.max_installments ? <span>Parcelamento: <strong className="text-foreground">Até {lastOcrExtraction.max_installments}x</strong></span> : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  {proposalFlights.length > 0 && (
                    <Button size="sm" variant="outline" className="h-8 text-2xs font-semibold" onClick={() => setStepTab("aereo")}>
                      <Plane className="size-3 mr-1" />
                      Revisar Voos
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-8 text-2xs font-semibold" onClick={() => setStepTab("quartos")}>
                    <Building2 className="size-3 mr-1" />
                    Quartos
                  </Button>
                  <Button size="sm" variant="ghost" className="size-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => setLastOcrExtraction(null)}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ETAPA 1: DESTINO & DATAS */}
            {(builderViewMode === "quick_canvas" || stepTab === "destino") && (
              <div id="sec-destino" className="space-y-4">
                {builderViewMode === "quick_canvas" && (
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      <span>1. Destino, Passageiro & Datas</span>
                    </h3>
                    <Badge variant="outline" className="text-2xs font-mono">
                      Etapa 1
                    </Badge>
                  </div>
                )}
                {/* Vínculo Inteligente com CRM + Criação Inline de Cliente */}
                <div className="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Users className="size-3.5 text-primary" />
                      <span>Passageiro / Cliente CRM</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleQuickCreateCustomer}
                      disabled={isCreatingInlineCustomer}
                      className="h-11 px-3 text-xs font-semibold gap-1"
                    >
                      {isCreatingInlineCustomer ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Plus className="size-3" />
                      )}
                      <span>Salvar Cliente no CRM</span>
                    </Button>
                  </div>

                  {crmCustomers.length > 0 && (
                    <select
                      value={selectedCustomerId || ""}
                      onChange={(e) => {
                        const cid = e.target.value;
                        setSelectedCustomerId(cid || null);
                        const found = crmCustomers.find((c: any) => c.id === cid);
                        if (found) {
                          setClientName(found.full_name || found.name || "");
                          setClientPhone(found.phone || found.whatsapp || "");
                          setClientEmail(found.email || "");
                          setClientDocument(found.document_number || found.cpf || "");
                        }
                      }}
                      className="w-full h-11 rounded-lg bg-background border border-border px-3 text-xs text-foreground"
                    >
                      <option value="">Selecionar cliente existente do CRM ou preencher abaixo...</option>
                      {crmCustomers.slice(0, 60).map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name || c.name} {c.phone ? `· ${c.phone}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground">Nome do Passageiro Principal / Lead</Label>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground">WhatsApp com DDD</Label>
                    <Input
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ex: 49999998888"
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground">E-mail do Cliente</Label>
                    <Input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground">CPF / Documento (Opcional)</Label>
                    <Input
                      value={clientDocument}
                      onChange={(e) => setClientDocument(e.target.value)}
                      placeholder="000.000.000-00"
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">Título Personalizado da Proposta</Label>
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={`Ex: Proposta ${destinationQuery ? destinationQuery : "Personalizada"}`}
                    className="h-11 min-h-11 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground">Origem do Voo</Label>
                    <Input
                      value={originCity}
                      onChange={(e) => setOriginCity(e.target.value)}
                      placeholder="Ex: Chapecó (XAP) ou Florianópolis (FLN)"
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground">Cidade / Destino</Label>
                    <Input
                      value={destinationQuery}
                      onChange={(e) => setDestinationQuery(e.target.value)}
                      placeholder="Ex: Buenos Aires, Maceió, Paris, Cancún..."
                      className="h-11 min-h-11 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground">Data de Embarque (Ida)</Label>
                    <Input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground">Data de Retorno (Volta)</Label>
                    <Input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {gatewayResolution && (
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Plane className="size-3.5 text-primary" />
                      <span>Aeroporto de Desembarque Recomendado:</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {gatewayResolution.primaryAirportIata} — {gatewayResolution.primaryAirportName}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Conexão terrestre recomendada: {gatewayResolution.recommendedTransferType.replace("_", " ")} ({gatewayResolution.primaryDistanceKm} km / ~{gatewayResolution.primaryTransferDurationMins} min).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 2: MALHA AÉREA & VOOS (PASSHUB / INFOTRAVEL) */}
            {(builderViewMode === "quick_canvas" || stepTab === "aereo") && (
              <div id="sec-aereo" className={`space-y-4 ${builderViewMode === "quick_canvas" ? "pt-6 border-t border-border/40" : ""}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                      <Plane className="size-4 text-primary" />
                      <span>Malha Aérea & Trechos de Voo ({proposalFlights.length})</span>
                    </h3>
                    <p className="text-2xs text-muted-foreground">
                      Configure os voos de ida, volta e conexões com horários e franquia de bagagem
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddFlight}
                    className="h-11 min-h-11 px-3 text-xs gap-1.5 font-semibold"
                  >
                    <Plus className="size-3.5" />
                    <span>Adicionar Trecho</span>
                  </Button>
                </div>

                {proposalFlights.length === 0 ? (
                  <div className="p-6 text-center rounded-lg border border-dashed border-border/60 bg-muted/20 space-y-2">
                    <Plane className="size-6 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-xs text-muted-foreground">Nenhum voo adicionado à cotação.</p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddFlight}
                      className="h-11 px-4 text-xs font-bold"
                    >
                      Configurar Voo de Ida e Volta
                    </Button>
                  </div>
                ) : (
                  proposalFlights.map((flight, fIdx) => (
                    <div
                      key={flight.id || fIdx}
                      className="p-4 rounded-lg border border-border/60 bg-card space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-border/30 pb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-2xs font-bold uppercase">
                            {flight.leg === "volta" ? "Trecho Volta" : `Trecho #${fIdx + 1} (Ida)`}
                          </Badge>
                          <Input
                            placeholder="Companhia (Ex: LATAM, GOL, AZUL)"
                            value={flight.airline || ""}
                            onChange={(e) => handleUpdateFlight(fIdx, { airline: e.target.value })}
                            className="h-9 text-xs font-semibold max-w-44"
                          />
                          <Input
                            placeholder="Nº Voo (Ex: LA 3241)"
                            value={flight.flight_number || ""}
                            onChange={(e) => handleUpdateFlight(fIdx, { flight_number: e.target.value })}
                            className="h-9 text-xs font-mono max-w-28"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFlight(fIdx)}
                          className="size-9 p-0 text-muted-foreground hover:text-destructive min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                          title="Remover trecho"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <Label className="text-2xs text-muted-foreground">Origem (IATA / Cidade)</Label>
                          <Input
                            placeholder="Ex: XAP (Chapecó)"
                            value={flight.origin_iata ? `${flight.origin_iata} - ${flight.origin_city || ""}` : (flight.origin || "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              const parts = val.split("-");
                              handleUpdateFlight(fIdx, {
                                origin_iata: parts[0]?.trim() || val,
                                origin_city: parts[1]?.trim() || "",
                                origin: val,
                              });
                            }}
                            className="h-9 mt-1 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <Label className="text-2xs text-muted-foreground">Destino (IATA / Cidade)</Label>
                          <Input
                            placeholder="Ex: GRU (São Paulo)"
                            value={flight.destination_iata ? `${flight.destination_iata} - ${flight.destination_city || ""}` : (flight.destination || "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              const parts = val.split("-");
                              handleUpdateFlight(fIdx, {
                                destination_iata: parts[0]?.trim() || val,
                                destination_city: parts[1]?.trim() || "",
                                destination: val,
                              });
                            }}
                            className="h-9 mt-1 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <Label className="text-2xs text-muted-foreground">Horário Saída ↔ Chegada</Label>
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            <Input
                              type="time"
                              value={flight.departure_time || "08:30"}
                              onChange={(e) => handleUpdateFlight(fIdx, { departure_time: e.target.value })}
                              className="h-9 text-xs font-mono px-1"
                            />
                            <Input
                              type="time"
                              value={flight.arrival_time || "10:00"}
                              onChange={(e) => handleUpdateFlight(fIdx, { arrival_time: e.target.value })}
                              className="h-9 text-xs font-mono px-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-2xs text-muted-foreground">Franquia de Bagagem</Label>
                          <select
                            value={typeof flight.baggage_included === "string" && flight.baggage_included ? flight.baggage_included : "Mochila + Mala 10kg"}
                            onChange={(e) => handleUpdateFlight(fIdx, { baggage_included: e.target.value })}
                            className="w-full h-9 mt-1 rounded-lg bg-background border border-border text-xs px-2"
                          >
                            <option value="Apenas Mochila (Item Pessoal)">Apenas Mochila (Item Pessoal)</option>
                            <option value="Mochila + Mala 10kg">Mochila + Mala 10kg</option>
                            <option value="Bagagem Despachada 23kg">Bagagem Despachada 23kg</option>
                            <option value="2x Bagagens Despachadas 23kg">2x Bagagens Despachadas 23kg</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ETAPA 3: QUARTOS & OCUPAÇÃO */}
            {(builderViewMode === "quick_canvas" || stepTab === "quartos") && (
              <div id="sec-quartos" className={`space-y-4 ${builderViewMode === "quick_canvas" ? "pt-6 border-t border-border/40" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    Configuração de Quartos ({rooms.length})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRoom}
                    className="h-11 min-h-11 px-3 text-xs gap-2 font-medium"
                  >
                    <Plus className="size-3.5" />
                    <span>Adicionar Quarto</span>
                  </Button>
                </div>

                {rooms.map((room) => (
                  <div
                    key={room.roomNumber}
                    className="p-4 rounded-lg border border-border/60 bg-card space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-border/30 pb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-primary" />
                        <Input
                          value={room.roomLabel}
                          onChange={(e) =>
                            handleUpdateRoom(room.roomNumber, { roomLabel: e.target.value })
                          }
                          className="h-9 text-xs font-semibold max-w-50"
                        />
                      </div>

                      {rooms.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRoom(room.roomNumber)}
                          className="size-9 p-0 text-muted-foreground hover:text-destructive min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                          title="Remover quarto"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <Label className="text-xs text-muted-foreground">Adultos</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUpdateRoom(room.roomNumber, {
                                adultsCount: Math.max(1, room.adultsCount - 1),
                              })
                            }
                            className="size-9 p-0 min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="font-bold text-foreground w-6 text-center">
                            {room.adultsCount}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUpdateRoom(room.roomNumber, {
                                adultsCount: room.adultsCount + 1,
                              })
                            }
                            className="size-9 p-0 min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Crianças (0-11a)</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newCount = Math.max(0, room.childrenCount - 1);
                              handleUpdateRoom(room.roomNumber, {
                                childrenCount: newCount,
                                childrenAges: room.childrenAges.slice(0, newCount),
                              });
                            }}
                            className="size-9 p-0 min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="font-bold text-foreground w-6 text-center">
                            {room.childrenCount}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newCount = room.childrenCount + 1;
                              handleUpdateRoom(room.roomNumber, {
                                childrenCount: newCount,
                                childrenAges: [...room.childrenAges, 5],
                              });
                            }}
                            className="size-9 p-0 min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Tarifa Adulto (R$)</Label>
                        <Input
                          type="number"
                          value={Math.round(room.baseAdultPriceCents / 100)}
                          onChange={(e) =>
                            handleUpdateRoom(room.roomNumber, {
                              baseAdultPriceCents: Math.round(Number(e.target.value) * 100),
                            })
                          }
                          className="h-9 mt-1 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Tarifa Criança (R$)</Label>
                        <Input
                          type="number"
                          value={Math.round(room.baseChildPriceCents / 100)}
                          onChange={(e) =>
                            handleUpdateRoom(room.roomNumber, {
                              baseChildPriceCents: Math.round(Number(e.target.value) * 100),
                            })
                          }
                          className="h-9 mt-1 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Adicionais deste Quarto (100% livres e editáveis pelo agente) */}
                    <div className="pt-3 border-t border-border/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">
                          Adicionais deste Quarto
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newAddon = {
                              code: `addon-${Date.now()}`,
                              label: "",
                              priceCents: 0,
                            };
                            handleUpdateRoom(room.roomNumber, {
                              addons: [...room.addons, newAddon],
                            });
                          }}
                          className="h-8 px-2 text-2xs text-primary font-bold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Plus className="size-3" />
                          <span>Adicionar Item</span>
                        </Button>
                      </div>

                      {/* Lista de Adicionais Adicionados */}
                      {room.addons.length > 0 && (
                        <div className="space-y-2">
                          {room.addons.map((ad, adIdx) => (
                            <div
                              key={ad.code || adIdx}
                              className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/40"
                            >
                              <Input
                                value={ad.label}
                                onChange={(e) => {
                                  const updated = [...room.addons];
                                  updated[adIdx] = { ...updated[adIdx], label: e.target.value };
                                  handleUpdateRoom(room.roomNumber, { addons: updated });
                                }}
                                placeholder="Descrição do adicional (ex: Bagagem 23kg, Seguro Viagem...)"
                                className="h-9 text-xs flex-1 rounded-md"
                              />
                              <div className="w-32 shrink-0">
                                <CurrencyField
                                  value={ad.priceCents || 0}
                                  onChange={(val: any) => {
                                    const updated = [...room.addons];
                                    updated[adIdx] = { ...updated[adIdx], priceCents: val || 0 };
                                    handleUpdateRoom(room.roomNumber, { addons: updated });
                                  }}
                                  className="h-9 text-xs font-mono rounded-md"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const updated = room.addons.filter((_, i) => i !== adIdx);
                                  handleUpdateRoom(room.roomNumber, { addons: updated });
                                }}
                                className="size-8 rounded-md text-muted-foreground hover:text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                title="Remover adicional"
                              >
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Sugestões Rápidas (Zero Valores Hardcoded - Linha Única com Scroll Horizontal) */}
                      <div className="flex flex-nowrap overflow-x-auto no-scrollbar items-center gap-1.5 py-1">
                        <span className="text-2xs text-muted-foreground mr-1 shrink-0">Sugestões rápidas:</span>
                        {SUGGESTED_ROOM_ADDONS.map((sug) => {
                          const alreadyAdded = room.addons.some(
                            (a) => a.label.toLowerCase() === sug.label.toLowerCase()
                          );
                          return (
                            <button
                              key={sug.code}
                              type="button"
                              disabled={alreadyAdded}
                              onClick={() => {
                                const newAddon = {
                                  code: `addon-${Date.now()}-${sug.code}`,
                                  label: sug.label,
                                  priceCents: 0,
                                };
                                handleUpdateRoom(room.roomNumber, {
                                  addons: [...room.addons, newAddon],
                                });
                              }}
                              className={`h-7 px-2.5 rounded-full text-2xs font-medium transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                alreadyAdded
                                  ? "bg-muted text-muted-foreground/60 cursor-default"
                                  : "bg-muted/40 hover:bg-muted text-foreground border border-border/30 hover:border-border/60"
                              }`}
                            >
                              + {sug.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ETAPA 4: INCLUSÕES & HOTÉIS */}
            {(builderViewMode === "quick_canvas" || stepTab === "opcoes") && (
              <div id="sec-opcoes" className={`space-y-4 ${builderViewMode === "quick_canvas" ? "pt-6 border-t border-border/40" : ""}`}>
                {builderViewMode === "quick_canvas" && (
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                      <Tag className="size-4 text-primary" />
                      <span>4. Hospedagem, Opções de Hotel & Inclusões</span>
                    </h3>
                    <Badge variant="outline" className="text-2xs font-mono">
                      {selectedInclusions.length} Inclusões
                    </Badge>
                  </div>
                )}
                {/* Autocomplete de Hotéis */}
                <div className="space-y-2 relative">
                  <Label className="text-xs font-medium text-foreground">Buscar no Banco de Hotéis Parceiros</Label>
                  <Input
                    value={hotelQuery}
                    onChange={(e) => {
                      setHotelQuery(e.target.value);
                      setIsHotelDropdownOpen(true);
                    }}
                    onFocus={() => setIsHotelDropdownOpen(true)}
                    placeholder="Digite o nome do hotel para autocompletar..."
                    className="h-11 min-h-11 rounded-lg text-xs"
                  />

                  {isHotelDropdownOpen && hotelSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-overlay z-50 max-h-48 overflow-y-auto">
                      {hotelSuggestions.map((h: any) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            setBundleOptions((prev) =>
                              prev.map((opt, i) =>
                                i === 0 ? { ...opt, hotelName: h.name } : opt
                              )
                            );
                            setHotelQuery(h.name);
                            setIsHotelDropdownOpen(false);
                            toast.success(`Hotel "${h.name}" selecionado!`);
                          }}
                          className="w-full h-11 min-h-11 px-3 text-xs text-left hover:bg-muted/60 flex items-center justify-between border-b border-border/20 last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="font-semibold text-foreground truncate">{h.name}</span>
                          <span className="text-2xs text-muted-foreground">{h.city} · {h.stars}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Opções Comparativas do Pacote */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-foreground">Hotel / Opções do Pacote:</Label>
                  {bundleOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border/60 bg-card space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <Input
                          value={opt.optionLabel}
                          onChange={(e) =>
                            setBundleOptions((prev) =>
                              prev.map((o, i) => (i === idx ? { ...o, optionLabel: e.target.value } : o))
                            )
                          }
                          className="h-9 font-semibold text-xs max-w-56"
                        />
                        <Badge variant="outline" className="text-xs font-mono">
                          {formatMoney(opt.adultPriceCents)}/adulto
                        </Badge>
                      </div>

                      <Input
                        value={opt.hotelName}
                        onChange={(e) =>
                          setBundleOptions((prev) =>
                            prev.map((o, i) => (i === idx ? { ...o, hotelName: e.target.value } : o))
                          )
                        }
                        placeholder="Nome do Hotel / Pousada"
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                  ))}
                </div>

                {/* Itens Inclusos no Pacote */}
                <div className="space-y-3 pt-3 border-t border-border/20">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Itens Inclusos no Pacote</Label>
                    <p className="text-2xs text-muted-foreground">
                      Digite para adicionar itens personalizados ou clique nas sugestões rápidas abaixo.
                    </p>
                  </div>

                  {/* Campo de Busca / Adição Personalizada */}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newInclusionInput}
                      onChange={(e) => setNewInclusionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newInclusionInput.trim()) {
                          e.preventDefault();
                          if (!selectedInclusions.includes(newInclusionInput.trim())) {
                            setSelectedInclusions((prev) => [...prev, newInclusionInput.trim()]);
                          }
                          setNewInclusionInput("");
                        }
                      }}
                      placeholder="Adicionar ou filtrar inclusão (ex: Almoço Típico, Passeio de Barco)..."
                      className="h-11 min-h-11 text-xs flex-1 rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!newInclusionInput.trim()}
                      onClick={() => {
                        if (newInclusionInput.trim() && !selectedInclusions.includes(newInclusionInput.trim())) {
                          setSelectedInclusions((prev) => [...prev, newInclusionInput.trim()]);
                        }
                        setNewInclusionInput("");
                      }}
                      className="h-11 min-h-11 px-3.5 text-xs font-bold gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>Adicionar</span>
                    </Button>
                  </div>

                  {/* Sugestões Rápidas em Linha Única com Scroll Horizontal */}
                  <div className="tab-list flex flex-nowrap overflow-x-auto no-scrollbar items-center gap-2 py-1">
                    <span className="text-2xs text-muted-foreground mr-1 shrink-0">Sugestões rápidas:</span>
                    {COMMON_INCLUSIONS_TAGS.filter((tag) =>
                      !newInclusionInput.trim() || tag.toLowerCase().includes(newInclusionInput.toLowerCase())
                    ).map((tag) => {
                      const isSelected = selectedInclusions.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleInclusionTag(tag)}
                          className={`h-11 min-h-11 px-3 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center gap-1 ${
                            isSelected
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "bg-muted/40 hover:bg-muted text-foreground border border-border/40 hover:border-border"
                          }`}
                        >
                          {isSelected ? <Check className="size-3" /> : <Plus className="size-3" />}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Lista de Itens Inclusos Ativos */}
                  {selectedInclusions.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/20">
                      <span className="text-2xs font-bold text-muted-foreground block">
                        Inclusões Ativas na Proposta ({selectedInclusions.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedInclusions.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleInclusionTag(tag)}
                            className="h-11 min-h-11 inline-flex items-center gap-2 px-3 rounded-lg text-xs bg-primary/10 text-primary border border-primary/20 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            title="Remover inclusão"
                          >
                            <span>{tag}</span>
                            <X className="size-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Itens Não Inclusos (Exclusões) — 1 Linha Scroll Horizontal + Filtro */}
                <div className="space-y-3 pt-3 border-t border-border/20">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">O Que Não Inclui (Exclusões)</Label>
                    <p className="text-2xs text-muted-foreground">
                      Digite para filtrar ou adicionar exclusões em 1 linha com rolagem horizontal.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      value={newExclusionInput}
                      onChange={(e) => setNewExclusionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newExclusionInput.trim()) {
                          e.preventDefault();
                          if (!selectedExclusions.includes(newExclusionInput.trim())) {
                            setSelectedExclusions((prev) => [...prev, newExclusionInput.trim()]);
                          }
                          setNewExclusionInput("");
                        }
                      }}
                      placeholder="Adicionar ou filtrar exclusão (ex: Despesas pessoais, Taxas municipais)..."
                      className="h-11 min-h-11 text-xs flex-1 rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!newExclusionInput.trim()}
                      onClick={() => {
                        if (newExclusionInput.trim() && !selectedExclusions.includes(newExclusionInput.trim())) {
                          setSelectedExclusions((prev) => [...prev, newExclusionInput.trim()]);
                        }
                        setNewExclusionInput("");
                      }}
                      className="h-11 min-h-11 px-4 text-xs font-bold gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>Adicionar</span>
                    </Button>
                  </div>

                  <div className="tab-list flex flex-nowrap overflow-x-auto no-scrollbar items-center gap-2 py-1">
                    <span className="text-2xs text-muted-foreground mr-1 shrink-0">Sugestões rápidas:</span>
                    {[
                      "Despesas de caráter pessoal",
                      "Refeições e bebidas não mencionadas",
                      "Taxas turísticas municipais no check-in",
                      "Ingressos em atrações opcionais",
                      "Bagagem despachada extra",
                    ]
                      .filter(
                        (tag) =>
                          !newExclusionInput.trim() ||
                          tag.toLowerCase().includes(newExclusionInput.trim().toLowerCase()),
                      )
                      .map((tag) => {
                        const isSelected = selectedExclusions.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleExclusionTag(tag)}
                            className={`h-11 min-h-11 px-3 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center gap-1 ${
                              isSelected
                                ? "bg-destructive/15 text-destructive border border-destructive/30 font-bold"
                                : "bg-muted/40 hover:bg-muted text-foreground border border-border/40 hover:border-border"
                            }`}
                          >
                            {isSelected ? <Check className="size-3" /> : <Plus className="size-3" />}
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                  </div>

                  {selectedExclusions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedExclusions.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleExclusionTag(tag)}
                          className="h-11 min-h-11 inline-flex items-center gap-2 px-3 rounded-lg text-xs bg-destructive/10 text-destructive border border-destructive/20 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title="Remover exclusão"
                        >
                          <span>{tag}</span>
                          <X className="size-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ETAPA 5: RODOVIÁRIO & TRANSPORTE TERRESTRE (INFOTRAVEL / GRUPOS) */}
            {(builderViewMode === "quick_canvas" || stepTab === "rodoviario") && (
              <div id="sec-rodoviario" className={`space-y-4 ${builderViewMode === "quick_canvas" ? "pt-6 border-t border-border/40" : ""}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                      <Bus className="size-4 text-primary" />
                      <span>Transporte Rodoviário & Ônibus de Grupo</span>
                    </h3>
                    <p className="text-2xs text-muted-foreground">
                      Paridade completa com o criador de pacotes e excursões rodoviárias
                    </p>
                  </div>
                  <span className="text-2xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    Multimodal
                  </span>
                </div>

                {proposalTransfers.length === 0 ? (
                  <div className="p-6 rounded-lg border border-dashed border-border/80 bg-muted/10 text-center space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Nenhum transporte rodoviário ou transfer vinculado a esta proposta (ideal para pacotes aéreos exclusivos).
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setProposalTransfers([
                          {
                            type: "Ônibus Leito DD",
                            vehicle: "",
                            date: departureDate,
                            notes: "",
                          },
                        ])
                      }
                      className="h-10 px-4 text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="size-3.5" />
                      <span>Incluir Ônibus / Transfer Rodoviário</span>
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-border/60 bg-card space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border/30">
                      <span className="text-xs font-bold text-foreground">Configuração de Transporte Terrestre</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setProposalTransfers([])}
                        className="h-8 px-2 text-2xs text-destructive hover:text-destructive cursor-pointer"
                      >
                        Remover Transporte
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <Label className="text-2xs font-bold">Tipo de Frota / Categoria de Poltrona</Label>
                        <select
                          value={proposalTransfers[0]?.type || "Ônibus Leito DD"}
                          onChange={(e) => {
                            const current = proposalTransfers[0] || { type: "Ônibus Leito DD", vehicle: "", date: departureDate, notes: "" };
                            setProposalTransfers([{ ...current, type: e.target.value }]);
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
                        <Label className="text-2xs font-bold">Empresa de Transporte / Linha Parceira</Label>
                        <Input
                          placeholder="Ex: Expresso São Miguel / Frota Própria"
                          value={proposalTransfers[0]?.vehicle || ""}
                          onChange={(e) => {
                            const current = proposalTransfers[0] || { type: "Ônibus Leito DD", vehicle: "", date: departureDate, notes: "" };
                            setProposalTransfers([{ ...current, vehicle: e.target.value }]);
                          }}
                          className="h-9 text-xs rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <Label className="text-2xs font-bold">Pontos de Embarque no Roteiro (Cidades Intermediárias)</Label>
                      <Textarea
                        placeholder="Ex: São Miguel do Oeste (18:30) • Maravilha (19:15) • Chapecó (20:00) • Xanxerê (21:00)"
                        value={proposalTransfers[0]?.notes || ""}
                        onChange={(e) => {
                          const current = proposalTransfers[0] || { type: "Ônibus Leito DD", vehicle: "", date: departureDate, notes: "" };
                          setProposalTransfers([{ ...current, notes: e.target.value }]);
                        }}
                        className="text-xs rounded-lg min-h-16"
                      />
                    </div>
                  </div>
                )}

                {/* Roteiro Dia a Dia Completo (Paridade 100% com Criador de Pacotes e Studio) */}
                <div className="space-y-3 pt-4 border-t border-border/40">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
                        Roteiro Dia a Dia ({proposalItinerary.length} Dias)
                      </h4>
                      <p className="text-2xs text-muted-foreground">
                        Sincronizado diretamente com o Estúdio Visual, PDF e Portal Minha Viagem
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setProposalItinerary((prev) => [
                          ...prev,
                          {
                            day: prev.length + 1,
                            title: `Dia ${prev.length + 1} — ${destinationQuery || "Roteiro"}`,
                            description: "",
                            meals: "Café da Manhã",
                          },
                        ])
                      }
                      className="h-11 min-h-11 px-3 text-xs font-bold gap-2"
                    >
                      <Plus className="size-3.5" />
                      <span>Adicionar Dia</span>
                    </Button>
                  </div>

                  {proposalItinerary.length === 0 ? (
                    <div className="p-4 rounded-lg border border-dashed border-border/60 bg-muted/10 text-center text-xs text-muted-foreground">
                      Nenhum dia de roteiro adicionado manualmente (você pode adicionar dias acima ou importar de um pacote).
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {proposalItinerary.map((dayItem, dIdx) => (
                        <div
                          key={dIdx}
                          className="p-3 rounded-lg border border-border/60 bg-card space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-primary font-mono">
                              Dia {dayItem.day}
                            </span>
                            <Input
                              value={dayItem.title}
                              onChange={(e) =>
                                setProposalItinerary((prev) =>
                                  prev.map((item, i) =>
                                    i === dIdx ? { ...item, title: e.target.value } : item,
                                  ),
                                )
                              }
                              placeholder="Título do dia (ex: Chegada, Recepção e Check-in)"
                              className="h-9 text-xs font-semibold flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setProposalItinerary((prev) =>
                                  prev
                                    .filter((_, i) => i !== dIdx)
                                    .map((item, i) => ({ ...item, day: i + 1 })),
                                )
                              }
                              className="h-11 w-11 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                          <Textarea
                            value={dayItem.description}
                            onChange={(e) =>
                              setProposalItinerary((prev) =>
                                prev.map((item, i) =>
                                  i === dIdx ? { ...item, description: e.target.value } : item,
                                ),
                              )
                            }
                            placeholder="Descrição detalhada das atividades do dia, horários e dicas..."
                            className="text-xs min-h-16"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ETAPA 6: CONDIÇÕES & FORNECEDOR (100% PERSONALIZÁVEL) */}
            {(builderViewMode === "quick_canvas" || stepTab === "pagamento") && (
              <div id="sec-pagamento" className={`space-y-5 ${builderViewMode === "quick_canvas" ? "pt-6 border-t border-border/40" : ""}`}>
                {builderViewMode === "quick_canvas" && (
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                      <CreditCard className="size-4 text-primary" />
                      <span>6. Condições Comerciais, Fornecedor & Template</span>
                    </h3>
                    <Badge variant="outline" className="text-2xs font-mono">
                      Fechamento
                    </Badge>
                  </div>
                )}
                {/* 1. Operadora / Fornecedor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">Operadora / Fornecedor</Label>
                    <span className="text-2xs text-muted-foreground">Selecione ou digite livremente</span>
                  </div>
                  <Input
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="Operadora ou fornecedor"
                    className="h-11 min-h-11 rounded-lg text-xs font-medium"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {registeredSuppliers.length > 0 ? (
                      <>
                        <span className="text-2xs text-muted-foreground mr-1">Fornecedores da Agência:</span>
                        {registeredSuppliers.map((sup: any) => (
                          <button
                            key={sup.id}
                            type="button"
                            onClick={() => {
                              setOperatorName(sup.name);
                              if (typeof sup.commission_rate === "number") {
                                setAgencyCommissionPct(sup.commission_rate);
                              }
                              if (sup.maxBoletoInstallments && sup.maxBoletoInstallments > 1) {
                                setEnableBoleto(true);
                                setBoletoInstallments(sup.maxBoletoInstallments);
                              }
                              if (sup.boletoRequiresDownpayment !== undefined) {
                                setHasBoletoDownpayment(Boolean(sup.boletoRequiresDownpayment));
                              }
                              if (sup.boletoDownpaymentPct && sup.boletoDownpaymentPct > 0) {
                                setDownpaymentType("percentage");
                                setDownpaymentPct(sup.boletoDownpaymentPct);
                              }
                              if (sup.maxCardInstallments && sup.maxCardInstallments > 1) {
                                setEnableCard(true);
                                setCardInstallments(sup.maxCardInstallments);
                              }
                              if (sup.pixDiscountPct && sup.pixDiscountPct > 0) {
                                setEnablePixDiscount(true);
                                setPixDiscountPct(sup.pixDiscountPct);
                              }
                            }}
                            className={`h-11 min-h-11 px-3 rounded-full text-2xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              operatorName.toLowerCase() === sup.name.toLowerCase()
                                ? "bg-primary text-primary-foreground font-bold"
                                : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/30"
                            }`}
                          >
                            {sup.name}
                            {sup.commission_rate > 0 && ` (${sup.commission_rate}%)`}
                          </button>
                        ))}
                      </>
                    ) : (
                      <span className="text-2xs text-muted-foreground">
                        Nenhum fornecedor pré-configurado na agência. Digite o nome acima livremente.
                      </span>
                    )}
                    <a
                      href="/workspace/turismo/fornecedores"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-2xs text-primary hover:underline ml-auto font-medium"
                    >
                      <ExternalLink className="size-3" />
                      <span>Gerenciar Fornecedores & Comissões</span>
                    </a>
                  </div>
                </div>

                {/* 2. Formas de Pagamento & Parcelamento (Totalmente Livres) */}
                <div className="space-y-4 p-4 rounded-xl border border-border/50 bg-muted/10">
                  <span className="text-xs font-bold text-foreground block pb-1 border-b border-border/30">
                    Condições Comerciais & Parcelamento
                  </span>

                  {/* Boleto Bancário */}
                  <div className="space-y-3 p-3 rounded-lg bg-background border border-border/40">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={enableBoleto}
                          onChange={(e) => setEnableBoleto(e.target.checked)}
                          className="size-4 rounded border-border text-primary cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">Boleto Bancário Faturado</span>
                      </label>
                      {enableBoleto && (
                        <div className="flex items-center gap-2">
                          <span className="text-2xs text-muted-foreground">Exigir Entrada?</span>
                          <button
                            type="button"
                            onClick={() => setHasBoletoDownpayment(!hasBoletoDownpayment)}
                            className={`h-11 min-h-11 px-3 rounded-full text-2xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              hasBoletoDownpayment
                                ? "bg-warning text-warning-foreground border border-warning"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {hasBoletoDownpayment ? "Com Entrada" : "Sem Entrada (Livre)"}
                          </button>
                        </div>
                      )}
                    </div>

                    {enableBoleto && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/20">
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">Qtd. Parcelas</Label>
                          <select
                            value={boletoInstallments}
                            onChange={(e) => setBoletoInstallments(Number(e.target.value))}
                            className="w-full h-10 rounded-lg bg-background border border-border px-2 text-xs font-medium text-foreground"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 18, 24].map((n) => (
                              <option key={n} value={n}>
                                Até {n}x {hasBoletoDownpayment ? `(Entrada + ${n - 1}x)` : "no Boleto"}
                              </option>
                            ))}
                          </select>
                        </div>

                        {hasBoletoDownpayment ? (
                          <div className="space-y-1">
                            <Label className="text-2xs text-muted-foreground font-semibold">Valor da Entrada</Label>
                            <div className="flex items-center gap-1">
                              <select
                                value={downpaymentType}
                                onChange={(e) => setDownpaymentType(e.target.value as any)}
                                className="h-10 rounded-lg bg-background border border-border px-1.5 text-2xs text-foreground"
                              >
                                <option value="percentage">%</option>
                                <option value="fixed_cents">R$</option>
                              </select>
                              {downpaymentType === "percentage" ? (
                                <Input
                                  type="number"
                                  min={1}
                                  max={90}
                                  value={downpaymentPct}
                                  onChange={(e) => setDownpaymentPct(Number(e.target.value))}
                                  className="h-10 rounded-lg text-xs font-mono"
                                  placeholder="%"
                                />
                              ) : (
                                <CurrencyField
                                  value={downpaymentFixedCents}
                                  onChange={(val: any) => setDownpaymentFixedCents(val || 0)}
                                  className="h-10 rounded-lg text-xs font-mono"
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Label className="text-2xs text-muted-foreground font-semibold">Vencimento do 1º Boleto</Label>
                            <Input
                              value={firstBoletoDue}
                              onChange={(e) => setFirstBoletoDue(e.target.value)}
                              placeholder="Ex: 30 dias da emissão"
                              className="h-10 rounded-lg text-xs"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">
                            {hasBoletoDownpayment ? "Vencimento 1º Boleto" : "Condição / Carência"}
                          </Label>
                          <Input
                            value={firstBoletoDue}
                            onChange={(e) => setFirstBoletoDue(e.target.value)}
                            placeholder="Ex: 30 dias após entrada"
                            className="h-10 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cartão de Crédito */}
                  <div className="space-y-3 p-3 rounded-lg bg-background border border-border/40">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={enableCard}
                          onChange={(e) => setEnableCard(e.target.checked)}
                          className="size-4 rounded border-border text-primary cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">Cartão de Crédito</span>
                      </label>
                      {enableCard && (
                        <div className="flex items-center gap-2">
                          <Label className="text-2xs text-muted-foreground">Parcelas sem Juros:</Label>
                          <select
                            value={cardInstallments}
                            onChange={(e) => setCardInstallments(Number(e.target.value))}
                            className="h-9 rounded-lg bg-background border border-border px-2 text-xs font-medium text-foreground"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18].map((n) => (
                              <option key={n} value={n}>
                                Até {n}x sem juros
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* À Vista no Pix */}
                  <div className="space-y-3 p-3 rounded-lg bg-background border border-border/40">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={enablePixDiscount}
                          onChange={(e) => setEnablePixDiscount(e.target.checked)}
                          className="size-4 rounded border-border text-primary cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">À Vista no Pix / Transferência</span>
                      </label>
                      {enablePixDiscount && (
                        <div className="flex items-center gap-2">
                          <Label className="text-2xs text-muted-foreground">Desconto (%):</Label>
                          <Input
                            type="number"
                            min={0}
                            max={30}
                            value={pixDiscountPct}
                            onChange={(e) => setPixDiscountPct(Number(e.target.value))}
                            className="h-8 w-20 rounded-lg text-xs font-mono text-center"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Texto Final das Condições Comerciais (100% Livre e Editável) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">
                        Texto de Apresentação das Condições ao Cliente
                      </Label>
                      {isTermsCustomized && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsTermsCustomized(false);
                            setCustomPaymentTermsText("");
                          }}
                          className="text-2xs text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Restaurar cálculo automático
                        </button>
                      )}
                    </div>
                    <Textarea
                      rows={2}
                      value={isTermsCustomized ? customPaymentTermsText : generatedTermsText}
                      onChange={(e) => {
                        setIsTermsCustomized(true);
                        setCustomPaymentTermsText(e.target.value);
                      }}
                      placeholder="Texto comercial que sairá na proposta do passageiro..."
                      className="text-xs rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs font-medium text-foreground">Comissão da Agência (%)</Label>
                      <Badge variant="outline" className="text-2xs font-mono">
                        {isManagerOrOwner ? "Editável (Gestor)" : "Somente Leitura (Agente)"}
                      </Badge>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      disabled={!isManagerOrOwner}
                      readOnly={!isManagerOrOwner}
                      value={agencyCommissionPct}
                      onChange={(e) => {
                        if (!isManagerOrOwner) return;
                        setAgencyCommissionPct(Math.max(0, Math.min(100, Number(e.target.value))));
                      }}
                      title={
                        isManagerOrOwner
                          ? "Altere o percentual de comissão da agência para esta proposta"
                          : "Apenas gestores/proprietários podem alterar a taxa de comissão da agência"
                      }
                      className="h-11 min-h-11 rounded-lg text-xs font-mono font-bold disabled:opacity-80 disabled:cursor-not-allowed"
                    />
                    <div className="flex items-center justify-between text-2xs text-muted-foreground font-mono">
                      <span>Repasse Fornecedor: {Math.max(0, 100 - agencyCommissionPct)}%</span>
                      {activeAgentProfile && (
                        <span>
                          Sua Comissão ({activeAgentProfile.baseCommissionPct || 0}% líq.):{" "}
                          {formatMoney(
                            Math.round((calculation.grandTotalCents * (activeAgentProfile.baseCommissionPct || 0)) / 100)
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground">Observações / Condições Especiais</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Cotação sujeita a disponibilidade tarifária"
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Personalização de Design, Moeda e Validade */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/30 border border-border/60">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Template Visual</Label>
                    <select
                      value={templateTheme}
                      onChange={(e) => setTemplateTheme(e.target.value)}
                      className="w-full h-11 rounded-lg bg-background border border-border px-2 text-xs text-foreground"
                    >
                      <option value="editorial-flat">Clean Apple</option>
                      <option value="dark-premium">Dark Luxo</option>
                      <option value="executivo-b2b">Executivo B2B</option>
                      <option value="landscape-presentation">Paisagem</option>
                      <option value="vertical-premium">Vertical Premium</option>
                      <option value="group-catalog">Catálogo Grupo</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Formato Canvas</Label>
                    <select
                      value={canvasFormat}
                      onChange={(e) => setCanvasFormat(e.target.value as ProposalCanvasFormat)}
                      className="w-full h-11 rounded-lg bg-background border border-border px-2 text-xs text-foreground"
                    >
                      <option value="a4-portrait">A4 Retrato</option>
                      <option value="a4-landscape">A4 Paisagem</option>
                      <option value="story-916">Story 9:16</option>
                      <option value="presentation-169">Slide 16:9</option>
                      <option value="letter-portrait">Carta (Letter)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Moeda</Label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full h-11 rounded-lg bg-background border border-border px-2 text-xs text-foreground"
                    >
                      <option value="BRL">BRL (R$)</option>
                      <option value="USD">USD (US$)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Validade (Dias)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={validUntilDays}
                      onChange={(e) => setValidUntilDays(Math.max(1, Number(e.target.value) || 7))}
                      className="h-11 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Resumo Financeiro Consolidado */}
                <div className="p-4 rounded-lg bg-card border border-border/60 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-xs font-bold text-foreground">Resumo Consolidado da Proposta</span>
                    <Badge variant="outline" className="text-xs font-mono text-primary border-primary/30">
                      {calculation.totalPassengers} passageiros ({calculation.totalAdults} ADT + {calculation.totalChildren} CHD)
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-2xs">Tarifa Base</span>
                      <span className="font-bold text-foreground">{formatMoney(calculation.grandBaseCents)}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-2xs">Adicionais</span>
                      <span className="font-bold text-foreground">{formatMoney(calculation.grandAddonsCents)}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-2xs">Total da Venda</span>
                      <span className="text-sm font-extrabold text-primary">{formatMoney(calculation.grandTotalCents)}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded bg-muted/40 border border-border/40 text-2xs text-muted-foreground space-y-1.5">
                    {enableBoleto && (
                      <div>
                        <strong className="text-foreground">Opção Boleto:</strong>{" "}
                        {hasBoletoDownpayment
                          ? `Entrada de ${formatMoney(calculation.campaignSummary.boletoDownpaymentCents)} + ${Math.max(1, boletoInstallments - 1)}x de ${formatMoney(calculation.campaignSummary.boletoMonthlyInstallmentCents)}`
                          : `Até ${boletoInstallments}x de ${formatMoney(calculation.campaignSummary.boletoMonthlyInstallmentCents)} sem entrada (${firstBoletoDue})`}
                      </div>
                    )}
                    {enableCard && (
                      <div>
                        <strong className="text-foreground">Opção Cartão:</strong> Até {cardInstallments}x de{" "}
                        {formatMoney(calculation.campaignSummary.cardMonthlyInstallmentCents)} sem juros
                      </div>
                    )}
                    {enablePixDiscount && pixDiscountPct > 0 && (
                      <div>
                        <strong className="text-foreground">À Vista no Pix:</strong>{" "}
                        {formatMoney(Math.round(calculation.grandTotalCents * (1 - pixDiscountPct / 100)))}{" "}
                        ({pixDiscountPct}% off)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── DOCK PASSHUB: SEU RESUMO EM TEMPO REAL ── */}
            <div className="hidden xl:flex xl:col-span-4 flex-col border-l border-border/50 bg-muted/20 p-5 overflow-y-auto [scrollbar-width:thin] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="size-4 text-primary" />
                  <span className="font-bold text-xs uppercase tracking-wide text-foreground">Seu Resumo</span>
                </div>
                <Badge variant="outline" className="text-2xs font-mono">
                  {currency}
                </Badge>
              </div>

              {/* Card Voo Ida/Volta */}
              {proposalFlights.length > 0 ? (
                <div className="p-3 rounded-lg bg-card border border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-2xs font-bold text-primary">
                    <span className="flex items-center gap-1.5"><Plane className="size-3" /> Malha Aérea ({proposalFlights.length} trechos)</span>
                    <span className="text-muted-foreground font-normal">{proposalFlights[0].airline}</span>
                  </div>
                  {proposalFlights.map((fl, fIdx) => (
                    <div key={fl.id || fIdx} className="text-xs pt-1 border-t border-border/30 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold">{fl.origin_iata || fl.origin || "Origem"}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className="font-mono font-bold">{fl.destination_iata || fl.destination || "Destino"}</span>
                        <span className="text-2xs text-muted-foreground block">{fl.departure_time || "08:30"} - {fl.arrival_time || "10:00"}</span>
                      </div>
                      <Badge variant="secondary" className="text-2xs">{fl.baggage_included || "10kg"}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded-lg border border-dashed border-border/60 text-2xs text-muted-foreground flex items-center gap-2">
                  <Plane className="size-3.5 text-muted-foreground/60" />
                  <span>Nenhum voo configurado.</span>
                </div>
              )}

              {/* Card Hotel */}
              {bundleOptions[0]?.hotelName ? (
                <div className="p-3 rounded-lg bg-card border border-border/60 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-2xs font-bold text-primary">
                    <span className="flex items-center gap-1.5"><Building2 className="size-3" /> Hospedagem</span>
                    <span className="text-emerald-600 font-bold">Confirmada</span>
                  </div>
                  <p className="font-bold text-foreground truncate">{bundleOptions[0].hotelName}</p>
                  <p className="text-2xs text-muted-foreground">{rooms[0]?.roomLabel || "Quarto Casal"} • {departureDate ? `${departureDate} a ${returnDate}` : "Datas flexíveis"}</p>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg border border-dashed border-border/60 text-2xs text-muted-foreground flex items-center gap-2">
                  <Building2 className="size-3.5 text-muted-foreground/60" />
                  <span>Nenhum hotel selecionado.</span>
                </div>
              )}

              {/* Card Rodoviário */}
              {proposalTransfers[0]?.notes || proposalTransfers[0]?.vehicle ? (
                <div className="p-3 rounded-lg bg-card border border-border space-y-1 text-xs">
                  <div className="flex items-center justify-between text-2xs font-bold text-primary">
                    <span className="flex items-center gap-2"><Bus className="size-3" /> Rodoviário</span>
                    <span className="text-muted-foreground font-normal">{proposalTransfers[0].type}</span>
                  </div>
                  <p className="font-bold text-foreground line-clamp-2 text-anti-truncate">{proposalTransfers[0].vehicle || "Transporte Executivo"}</p>
                  {proposalTransfers[0].notes && <p className="text-2xs text-muted-foreground line-clamp-2">{proposalTransfers[0].notes}</p>}
                </div>
              ) : null}

              {/* Card Inclusões */}
              {selectedInclusions.length > 0 && (
                <div className="p-3 rounded-lg bg-card border border-border space-y-2">
                  <span className="text-2xs font-bold text-muted-foreground block">Inclusões ({selectedInclusions.length}):</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedInclusions.map((inc) => (
                      <span key={inc} className="text-2xs px-2 py-1 rounded-md bg-muted text-foreground border border-border">
                        {inc.split(" ")[0]} {inc.split(" ")[1] || ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Totalização Consolidada */}
              <div className="mt-auto pt-4 border-t border-border space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Total da Proposta</span>
                  <span className="text-xl font-black font-mono text-foreground">{formatMoney(calculation.grandTotalCents)}</span>
                </div>
                <div className="flex items-baseline justify-between text-2xs text-muted-foreground">
                  <span>Por passageiro adulto ({calculation.totalAdults}x)</span>
                  <span className="font-mono font-semibold">{formatMoney(Math.round(calculation.grandTotalCents / Math.max(1, calculation.totalAdults)))}</span>
                </div>

                {/* Condições de Pagamento */}
                <div className="p-3 rounded-lg bg-muted border border-border space-y-1 text-2xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Cartão de Crédito</span>
                    <span className="font-bold text-foreground">Até {cardInstallments}x</span>
                  </div>
                  {enableBoleto && (
                    <div className="flex justify-between">
                      <span>Boleto Bancário</span>
                      <span className="font-bold text-foreground">Até {boletoInstallments}x</span>
                    </div>
                  )}
                  {enablePixDiscount && (
                    <div className="flex justify-between font-bold text-foreground">
                      <span>À vista no PIX ({pixDiscountPct}% off)</span>
                      <span>{formatMoney(Math.round(calculation.grandTotalCents * (1 - pixDiscountPct / 100)))}</span>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="space-y-2 pt-2">
                  <Button
                    type="button"
                    onClick={() => saveProposalMutation.mutate({ openStudioAfterSave: true })}
                    disabled={saveProposalMutation.isPending}
                    className="w-full h-11 text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-sm cursor-pointer"
                  >
                    {saveProposalMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Layers className="size-4" />}
                    <span>Salvar & Abrir Studio</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => saveProposalMutation.mutate({ openStudioAfterSave: false })}
                    disabled={saveProposalMutation.isPending}
                    className="w-full h-11 text-xs font-semibold gap-2 border-border text-foreground hover:bg-muted cursor-pointer"
                  >
                    <Send className="size-4 text-primary" />
                    <span>Salvar & WhatsApp</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé de Ações com Toque 44px */}
          <SheetFooter className="p-4 sm:p-6 border-t border-border/40 shrink-0 bg-background flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {builderViewMode === "wizard" && stepTab !== "destino" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (stepTab === "pagamento") setStepTab("rodoviario");
                    else if (stepTab === "rodoviario") setStepTab("opcoes");
                    else if (stepTab === "opcoes") setStepTab("quartos");
                    else if (stepTab === "quartos") setStepTab("aereo");
                    else if (stepTab === "aereo") setStepTab("destino");
                  }}
                  className="h-11 min-h-11 px-4 text-xs font-medium"
                >
                  Voltar
                </Button>
              )}

              {builderViewMode === "wizard" && stepTab !== "pagamento" && (
                <Button
                  type="button"
                  onClick={() => {
                    if (stepTab === "destino") setStepTab("aereo");
                    else if (stepTab === "aereo") setStepTab("quartos");
                    else if (stepTab === "quartos") setStepTab("opcoes");
                    else if (stepTab === "opcoes") setStepTab("rodoviario");
                    else if (stepTab === "rodoviario") setStepTab("pagamento");
                  }}
                  className="h-11 min-h-11 px-4 text-xs font-semibold gap-2"
                >
                  <span>Próximo</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              )}

              {builderViewMode === "quick_canvas" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-2xs font-mono">
                    {calculation.totalPassengers} passageiros ({calculation.totalAdults} ADT{calculation.totalChildren > 0 ? ` + ${calculation.totalChildren} CHD` : ""})
                  </Badge>
                  <span className="hidden sm:inline font-mono">
                    Total: <strong className="text-foreground">{formatMoney(calculation.grandTotalCents)}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Ações primárias no rodapé visíveis apenas no mobile/tablet (< lg), evitando duplicação com o dock no desktop */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end lg:hidden">
              <Button
                type="button"
                variant="outline"
                onClick={() => saveProposalMutation.mutate({ openStudioAfterSave: false })}
                disabled={saveProposalMutation.isPending}
                className="h-11 min-h-11 px-4 text-xs font-medium gap-2"
              >
                {saveProposalMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5 text-primary" />
                )}
                <span>Salvar & WhatsApp</span>
              </Button>

              <Button
                type="button"
                onClick={() => saveProposalMutation.mutate({ openStudioAfterSave: true })}
                disabled={saveProposalMutation.isPending}
                className="h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-primary text-primary-foreground"
              >
                {saveProposalMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Eye className="size-3.5" />
                )}
                <span>Salvar & Abrir Studio</span>
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Modal de Importação Rápida de Pacote / Roteiro do Catálogo */}
      <Dialog open={showCatalogModal} onOpenChange={setShowCatalogModal}>
        <DialogContent className="sm:max-w-3xl max-h-screen flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                <Package className="size-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Catálogo de Pacotes & Roteiros Prontos
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Selecione um roteiro ou pacote para preencher automaticamente voos, hotéis, inclusões, itinerário e preços na proposta.
                </DialogDescription>
              </div>
            </div>
            <div className="mt-3 relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={catalogSearchQuery}
                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                placeholder="Buscar por destino, roteiro, atração (ex: Gramado, Maceió, Paris, Disney)..."
                className="pl-9 h-11 text-xs rounded-lg"
              />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {isLoadingCatalogItems ? (
              <div className="p-4 rounded-lg border border-border/50 bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>Carregando pacotes e produtos do seu catálogo CMS...</span>
              </div>
            ) : filteredStoreCatalogItems.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Meu Catálogo CMS & Vitrine ({filteredStoreCatalogItems.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredStoreCatalogItems.map((item) => (
                    <div
                      key={`${item.origin}-${item.id}`}
                      className="p-4 rounded-xl border border-primary/30 bg-card hover:border-primary transition-colors flex flex-col justify-between space-y-2"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-2xs font-bold text-primary border-primary/30">
                            {item.origin === "product" ? "Produto CMS" : "Anúncio Vitrine"}
                          </Badge>
                          {item.durationLabel && (
                            <span className="text-2xs font-mono text-muted-foreground">
                              {item.durationLabel}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-foreground line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-2xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3 text-primary shrink-0" />
                          <span className="truncate">{item.destination || item.subtitle || "Item do catálogo"}</span>
                        </p>
                        {item.specsRows.length > 0 && (
                          <p className="text-3xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.specsRows.slice(0, 3).map((s) => `${s.label}: ${s.value}`).join(" · ")}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/30 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-3xs text-muted-foreground block">Valor Base</span>
                          <span className="text-xs font-bold font-mono text-foreground">
                            {formatMoney(item.priceCents || 0)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleApplyStoreCatalogItem(item)}
                          className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Plus className="size-3" />
                          <span>Aplicar na Proposta</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {filteredStoreCatalogItems.length > 0 && (
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Roteiros Modelos Prontos ({filteredCatalogPackages.length})
                </span>
              )}
              {filteredCatalogPackages.length === 0 && filteredStoreCatalogItems.length === 0 ? (
                <div className="p-8 text-center rounded-lg border border-dashed border-border/60 text-muted-foreground text-xs space-y-1">
                  <Package className="size-8 mx-auto opacity-40 mb-2" />
                  <p className="font-semibold text-foreground">Nenhum pacote encontrado para a busca.</p>
                  <p>Tente outro termo ou limpe a busca para ver todos os modelos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredCatalogPackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="p-4 rounded-xl border border-border/60 bg-card hover:border-primary/50 transition-colors flex flex-col justify-between space-y-2"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-2xs font-bold text-primary border-primary/30">
                            {pkg.badge || "Pacote Completo"}
                          </Badge>
                          <span className="text-2xs font-mono text-muted-foreground">
                            {pkg.durationDays}D / {pkg.durationNights || pkg.durationDays - 1}N
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-foreground line-clamp-1">
                          {pkg.title}
                        </h4>
                        <p className="text-2xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3 text-primary shrink-0" />
                          <span>{pkg.destinationCity}</span>
                        </p>
                        {pkg.includes && pkg.includes.length > 0 && (
                          <p className="text-3xs text-muted-foreground line-clamp-2 leading-relaxed">
                            Inclui: {pkg.includes.slice(0, 3).join(", ")}{pkg.includes.length > 3 ? "..." : ""}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/30 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-3xs text-muted-foreground block">A partir de</span>
                          <span className="text-xs font-bold font-mono text-foreground">
                            {formatMoney(pkg.suggestedPriceCents || 0)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleApplyCatalogPackage(pkg)}
                          className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Plus className="size-3" />
                          <span>Aplicar na Proposta</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Disparo WhatsApp Integrado */}
      {createdProposalForWhatsapp && (
        <ProposalShareWhatsappModal
          isOpen={Boolean(createdProposalForWhatsapp)}
          onClose={() => {
            setCreatedProposalForWhatsapp(null);
            onOpenChange(false);
          }}
          proposal={createdProposalForWhatsapp}
        />
      )}
    </>
  );
}
