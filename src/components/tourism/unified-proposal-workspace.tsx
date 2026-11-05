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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyField } from "@/components/ui/currency-field";
import { formatMoney } from "@/lib/money";
import { createTravelProposal, type TravelProposalDTO, type ProposalCanvasFormat } from "@/services/travel-proposal.functions";
import { createAgencyTravelQuote } from "@/services/tourism.functions";
import { listCustomers, createCustomer } from "@/services/crm.functions";
import { listHotelsBank } from "@/services/travel-catalog.functions";
import { listTravelSuppliers } from "@/services/travel-suppliers.functions";
import { parseUniversalDocumentOCR } from "@/services/multimodal-ocr.functions";
import { processOperatorQuoteOcr } from "@/services/travel-operator-ocr.functions";
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
import { TRAVEL_PACKAGE_TEMPLATES } from "@/lib/tourism/tourism-templates";

export interface UnifiedProposalWorkspaceLead {
  id: string;
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  destination?: string | null;
  estimated_value_cents?: number;
  passenger_count?: number;
  cover_image?: string | null;
  cover_image_url?: string | null;
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

  const [stepTab, setStepTab] = useState<"destino" | "quartos" | "opcoes" | "pagamento">("destino");
  const [quoteSourceMode, setQuoteSourceMode] = useState<"manual_ocr" | "infotravel_api">("manual_ocr");

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
  const [showOcrTextModal, setShowOcrTextModal] = useState(false);
  const [ocrPastedText, setOcrPastedText] = useState("");
  const [originCity, setOriginCity] = useState("Chapecó (XAP)");

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

  const [destinationQuery, setDestinationQuery] = useState(lead?.destination || initialDestination || "Buenos Aires");
  const [departureDate, setDepartureDate] = useState("2027-01-09");
  const [returnDate, setReturnDate] = useState("2027-01-14");

  // Autocomplete do Banco de Hotéis
  const [hotelQuery, setHotelQuery] = useState("");
  const [isHotelDropdownOpen, setIsHotelDropdownOpen] = useState(false);

  const { data: hotelSuggestions = [] } = useQuery({
    queryKey: ["hotels-bank-suggestions", hotelQuery],
    queryFn: () => listHotelsBank({ data: { search: hotelQuery.trim() } }),
    enabled: hotelQuery.trim().length >= 2,
    staleTime: 30_000,
  });

  // Tags Rápidas de Inclusões
  const [selectedInclusions, setSelectedInclusions] = useState<string[]>([
    "Transfer In/Out Aeroporto ↔ Hotel",
    "Seguro Viagem Cobertura Completa",
    "Bagagem Despachada 23kg",
  ]);

  const toggleInclusionTag = (tag: string) => {
    setSelectedInclusions((prev) =>
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
        if (lead.destination) setDestinationQuery(lead.destination);
      } else {
        if (initialClientName) setClientName(initialClientName);
        if (initialClientPhone) setClientPhone(initialClientPhone);
        if (initialClientEmail) setClientEmail(initialClientEmail);
        if (initialDestination) setDestinationQuery(initialDestination);
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
  const [agencyCommissionPct, setAgencyCommissionPct] = useState<number>(10);
  const [enableBoleto, setEnableBoleto] = useState<boolean>(true);
  const [boletoInstallments, setBoletoInstallments] = useState<number>(12);
  const [hasBoletoDownpayment, setHasBoletoDownpayment] = useState<boolean>(false); // Zero entrada por padrão!
  const [downpaymentType, setDownpaymentType] = useState<"percentage" | "fixed_cents">("percentage");
  const [downpaymentPct, setDownpaymentPct] = useState<number>(20);
  const [downpaymentFixedCents, setDownpaymentFixedCents] = useState<number>(0);
  const [firstBoletoDue, setFirstBoletoDue] = useState<string>("Primeiro boleto para 30 dias");

  const [enableCard, setEnableCard] = useState<boolean>(true);
  const [cardInstallments, setCardInstallments] = useState<number>(10);

  const [enablePixDiscount, setEnablePixDiscount] = useState<boolean>(true);
  const [pixDiscountPct, setPixDiscountPct] = useState<number>(5);

  const [customPaymentTermsText, setCustomPaymentTermsText] = useState<string>("");
  const [isTermsCustomized, setIsTermsCustomized] = useState<boolean>(false);

  const [notes, setNotes] = useState("");
  const [infotravelOperatorFilter, setInfotravelOperatorFilter] = useState<InfoTravelOperatorSlug>("orinter");
  const [isSearchingInfotravel, setIsSearchingInfotravel] = useState(false);

  // Fornecedores & Operadoras Cadastradas na Agência (Sem Mocks Hardcoded)
  const { data: registeredSuppliers = [] } = useQuery({
    queryKey: ["travel-suppliers-active"],
    queryFn: () => listTravelSuppliers({ data: {} }),
    enabled: open,
  });

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
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
      const [day, month, year] = clean.split("/");
      return `${year}-${month}-${day}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
      const [day, month, year] = clean.split("-");
      return `${year}-${month}-${day}`;
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
    operatorName?: string | null;
    hotelName?: string | null;
    adultsCount?: number | null;
    childrenCount?: number | null;
    grossPriceCents?: number | null;
    maxInstallments?: number | null;
    inclusions?: string[] | null;
  }): number => {
    let fieldsUpdated = 0;

    if (extracted.destination?.trim() && extracted.destination !== "Destino a definir") {
      setDestinationQuery(extracted.destination.trim());
      setCustomTitle(`Proposta Exclusiva — ${extracted.destination.trim()}`);
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

    if (grossCents > 0 || extracted.adultsCount) {
      setRooms((prev) => [
        {
          ...prev[0],
          adultsCount: adults,
          childrenCount: children,
          baseAdultPriceCents: perAdultCents > 0 ? perAdultCents : prev[0].baseAdultPriceCents,
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

    if (extracted.maxInstallments && extracted.maxInstallments > 0) {
      setCardInstallments(extracted.maxInstallments);
      setBoletoInstallments(extracted.maxInstallments);
      fieldsUpdated++;
    }

    if (Array.isArray(extracted.inclusions) && extracted.inclusions.length > 0) {
      setSelectedInclusions((prev) => {
        const next = [...prev];
        const joined = extracted.inclusions!.join(" ").toLowerCase();
        if (joined.includes("transfer") || joined.includes("traslado")) {
          if (!next.includes("Transfer In/Out Aeroporto ↔ Hotel")) {
            next.push("Transfer In/Out Aeroporto ↔ Hotel");
          }
        }
        if (joined.includes("seguro") || joined.includes("gta") || joined.includes("assist")) {
          if (!next.includes("Seguro Viagem Cobertura Completa")) {
            next.push("Seguro Viagem Cobertura Completa");
          }
        }
        if (joined.includes("bagagem") || joined.includes("mala") || joined.includes("23kg")) {
          if (!next.includes("Bagagem Despachada 23kg")) {
            next.push("Bagagem Despachada 23kg");
          }
        }
        return next;
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
            const updatedCount = applyExtractedTravelData({
              destination: q.destination !== "Destino a definir" ? q.destination : undefined,
              origin: q.flights?.[0]?.origin_city || (q.flights?.[0]?.origin_iata ? `${q.flights[0].origin_iata}` : undefined),
              departureDate: q.travel_start || q.flights?.[0]?.date || q.hotels?.[0]?.checkin_date,
              returnDate: q.travel_end || q.hotels?.[0]?.checkout_date,
              clientName: q.client_name,
              clientPhone: q.client_phone,
              operatorName: q.operator_name,
              hotelName: q.hotels?.[0]?.hotel_name,
              adultsCount: q.adults_count,
              childrenCount: q.children_count,
              grossPriceCents: q.gross_price_cents,
              maxInstallments: q.max_installments,
              inclusions: q.inclusions,
            });

            if (updatedCount > 0) {
              setStepTab("opcoes");
              const highlights = [
                q.destination && q.destination !== "Destino a definir" ? `Destino: ${q.destination}` : null,
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
            const updatedCount = applyExtractedTravelData({
              destination: universalRes.destinationCity,
              origin: universalRes.flightSegments?.[0]?.origin,
              departureDate: universalRes.dates?.departure,
              returnDate: universalRes.dates?.return,
              clientName: universalRes.clientName,
              clientPhone: universalRes.clientPhone,
              operatorName: universalRes.companyName !== "Não identificado" ? universalRes.companyName : undefined,
              hotelName: universalRes.hotel?.name,
              grossPriceCents: universalRes.financials?.totalCents,
            });

            if (updatedCount > 0) {
              setStepTab("opcoes");
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
        const updated = applyExtractedTravelData({
          destination: q.destination !== "Destino a definir" ? q.destination : undefined,
          origin: q.flights?.[0]?.origin_city || (q.flights?.[0]?.origin_iata ? `${q.flights[0].origin_iata}` : undefined),
          departureDate: q.travel_start || q.flights?.[0]?.date || q.hotels?.[0]?.checkin_date,
          returnDate: q.travel_end || q.hotels?.[0]?.checkout_date,
          clientName: q.client_name,
          clientPhone: q.client_phone,
          operatorName: q.operator_name,
          hotelName: q.hotels?.[0]?.hotel_name,
          adultsCount: q.adults_count,
          childrenCount: q.children_count,
          grossPriceCents: q.gross_price_cents,
          maxInstallments: q.max_installments,
          inclusions: q.inclusions,
        });

        if (updated > 0) {
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
            lead?.cover_image_url ||
            lead?.cover_image ||
            matchedPkgTemplate?.coverImageUrl ||
            undefined,
          initialNotes: fullSummary,
          flights:
            matchedPkgTemplate?.flights && matchedPkgTemplate.flights.length > 0
              ? matchedPkgTemplate.flights.map((f) => ({
                  ...f,
                  departure_date: departureDate,
                }))
              : [],
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
          itinerary: matchedPkgTemplate?.itinerary || [],
          transfers: (matchedPkgTemplate?.transfers as any) || [],
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
          excludes: matchedPkgTemplate?.excludes || [
            "Despesas de caráter pessoal (frigobar, lavanderia e telefonemas)",
            "Taxas turísticas municipais e governamentais cobradas diretamente no check-in",
          ],
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
        flights: matchedPkgTemplate?.flights || [],
        hotels: bundleOptions.filter((opt) => opt.hotelName.trim()).map((opt) => ({
          hotel_name: opt.hotelName,
        })),
        itinerary: matchedPkgTemplate?.itinerary || [],
        transfers: (matchedPkgTemplate?.transfers || []).map((t: any) => ({
          type: t.type,
          vehicle: t.vehicle || t.vehicle_type,
          date: t.date,
          notes: t.notes || t.description,
        })),
        tours: matchedPkgTemplate?.tours || [],
        rooms: calculation.rooms.map((room) => ({
          roomNumber: room.roomNumber,
          roomType: room.roomLabel,
          adults: room.adultsCount,
          children: room.childrenCount,
          childrenAges: room.childrenAges,
        })),
        includes: selectedInclusions,
        excludes: [],
        pricing: {
          currency,
          base_price_cents: calculation.grandBaseCents,
          boarding_tax_cents: calculation.grandAddonsCents,
          other_taxes_cents: 0,
          discount_cents: 0,
          total_price_cents: calculation.grandTotalCents,
          installments_options: [],
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
        <SheetContent side="right" className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full bg-background border-l border-border/60">
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

              {/* Gatilho OCR Rápido */}
              <div className="flex items-center gap-2">
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

            {/* Abas do Fluxo Canônico */}
            <div className="flex items-center gap-1 mt-4 overflow-x-auto scroll-area-carousel no-scrollbar border-b border-border/30 pb-2">
              <button
                type="button"
                onClick={() => setStepTab("destino")}
                className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  stepTab === "destino"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <MapPin className="size-3.5" />
                <span>1. Destino & Datas</span>
              </button>

              <button
                type="button"
                onClick={() => setStepTab("quartos")}
                className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  stepTab === "quartos"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Building2 className="size-3.5" />
                <span>2. Quartos & Ocupação ({rooms.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setStepTab("opcoes")}
                className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  stepTab === "opcoes"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Tag className="size-3.5" />
                <span>3. Inclusões & Hotéis</span>
              </button>

              <button
                type="button"
                onClick={() => setStepTab("pagamento")}
                className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  stepTab === "pagamento"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <CreditCard className="size-3.5" />
                <span>4. Condições & Operadora</span>
              </button>
            </div>
          </SheetHeader>

          {/* Conteúdo com Rolagem */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* ETAPA 1: DESTINO & DATAS */}
            {stepTab === "destino" && (
              <div className="space-y-4">
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
                    placeholder={`Ex: Proposta Exclusiva — ${destinationQuery || "Viagem"}`}
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

            {/* ETAPA 2: QUARTOS & OCUPAÇÃO */}
            {stepTab === "quartos" && (
              <div className="space-y-4">
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

            {/* ETAPA 3: INCLUSÕES & HOTÉIS */}
            {stepTab === "opcoes" && (
              <div className="space-y-4">
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

                {/* Tags de Inclusões em Linha Única com Scroll Horizontal */}
                <div className="space-y-2 pt-2 border-t border-border/20">
                  <Label className="text-xs font-medium text-foreground">Itens Inclusos no Pacote (Clique para ativar):</Label>
                  <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-2 py-1">
                    {COMMON_INCLUSIONS_TAGS.map((tag) => {
                      const isSelected = selectedInclusions.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleInclusionTag(tag)}
                          className={`h-11 min-h-11 px-3 rounded-lg text-xs font-medium transition-colors shrink-0 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center gap-2 ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          {isSelected && <Check className="size-3" />}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 4: CONDIÇÕES & FORNECEDOR (100% PERSONALIZÁVEL) */}
            {stepTab === "pagamento" && (
              <div className="space-y-5">
                {/* 1. Operadora / Fornecedor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">Operadora / Fornecedor</Label>
                    <span className="text-2xs text-muted-foreground">Selecione ou digite livremente</span>
                  </div>
                  <Input
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="Ex: Orinter, Incomum, FRT, CVC, Azul Viagens..."
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
                              if (typeof sup.commission_rate === "number" && sup.commission_rate > 0) {
                                setAgencyCommissionPct(sup.commission_rate);
                              }
                            }}
                            className={`h-7 px-2.5 rounded-full text-2xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
                            className={`h-7 px-2.5 rounded-full text-2xs font-bold transition-colors cursor-pointer ${
                              hasBoletoDownpayment
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30"
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
                            value={hasBoletoDownpayment ? firstBoletoDue : "Sem juros operadora"}
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
                          className="text-2xs text-primary hover:underline cursor-pointer"
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
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground">Comissão da Agência (%)</Label>
                      <span className="text-2xs text-muted-foreground font-mono">
                        Custo Fornecedor: {100 - agencyCommissionPct}%
                      </span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={agencyCommissionPct}
                      onChange={(e) => setAgencyCommissionPct(Math.max(0, Math.min(100, Number(e.target.value))))}
                      className="h-11 min-h-11 rounded-lg text-xs font-mono font-bold"
                    />
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

          {/* Rodapé de Ações com Toque 44px */}
          <SheetFooter className="p-4 sm:p-6 border-t border-border/40 shrink-0 bg-background flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {stepTab !== "destino" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (stepTab === "pagamento") setStepTab("opcoes");
                    else if (stepTab === "opcoes") setStepTab("quartos");
                    else if (stepTab === "quartos") setStepTab("destino");
                  }}
                  className="h-11 min-h-11 px-4 text-xs font-medium"
                >
                  Voltar
                </Button>
              )}

              {stepTab !== "pagamento" && (
                <Button
                  type="button"
                  onClick={() => {
                    if (stepTab === "destino") setStepTab("quartos");
                    else if (stepTab === "quartos") setStepTab("opcoes");
                    else if (stepTab === "opcoes") setStepTab("pagamento");
                  }}
                  className="h-11 min-h-11 px-4 text-xs font-semibold gap-2"
                >
                  <span>Próximo</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
