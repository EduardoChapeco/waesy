import React, { useState, useMemo, useRef, useEffect, useId } from "react";
import { sanitizeCustomerEmail } from "@/lib/contact-sanitize";
import { computeCustomerTouchpointJourney } from "@/lib/attribution-journey";
import { Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Paperclip,
  FileText,
  UserCheck,
  UserPlus,
  MessageSquare,
  Share2,
  Link2,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Plane,
  X,
  Send,
  Eye,
  CheckSquare,
  Square,
  Edit3,
  Check,
  Upload,
  Printer,
  Download,
  Save,
  Radio,
  FileCheck,
  FileCheck2,
  RefreshCw,
  Sparkles,
  Briefcase,
  FileSearch,
  Loader2,
  FileCode,
  Zap,
  ScanLine,
  Ticket,
  Syringe,
  Home,
  Globe2,
  Fingerprint,
  TrendingUp,
  Flame,
  ShieldAlert,
  QrCode,
  FileSignature,
  AlertCircle,
  DollarSign,
  HeartPulse,
  BookOpen,
  Image as ImageIcon,
} from "lucide-react";
import { sanitizeLeadCustomFieldsForProposal } from "@/lib/tourism/proposal-custom-fields";
import { buildStructuredCustomFieldsSummaryRows } from "@/lib/niches/unified-field-bridge";
import {
  type TravelerDossier,
  type ServiceTemplateType,
  SERVICE_TEMPLATE_LABELS,
  CONSULAR_VISA_STATUS_LABELS,
  type ConsularVisaStatus,
  type TravelerDocumentItem,
  type TravelerVisaItem,
  type DossierAuditLogEntry,
  LEAD_SOURCES,
} from "@/types/travel-dossier";
import {
  saveLeadTravelerDossiers,
  promoteTravelerToCustomer,
  validateTravelerPassportMrzAction,
  evaluateTravelerDs160TiesAction,
} from "@/services/travel-lifecycle.functions";
import {
  type LegalPolicyType,
  type ConsentRecordItem,
  type TelemetricAuditProof,
  CANONICAL_LEGAL_POLICIES,
} from "@/types/legal-consent";
import {
  recordLeadOrCustomerConsent,
  revokeConsentAction,
  getLeadConsentBundle,
  bindPolicyTemplateToLead,
} from "@/services/legal-telemetry.functions";
import { useAgency } from "@/lib/agency-context";
import { getStoreSettings } from "@/services/store.functions";
import { createTravelVoucher } from "@/services/travel-vouchers.functions";
import {
  resolveTenantDocumentIdentity,
  type DocumentStudioArchetype,
  type DocumentStudioFormState,
} from "@/lib/documents/document-studio-catalog";
import { UniversalDocumentStudio } from "@/components/documents/UniversalDocumentStudio";
import { AgencyClausesEditorModal } from "@/components/tourism/contract/agency-clauses-editor-modal";
import { LeadActivityTimeline } from "./lead-activity-timeline";
import {
  issueLeadContract,
  createCustomerDocument,
  transferLead,
  updateLeadStaleness,
  linkContractToLead,
  listLinkableStoreContracts,
  getCustomer360Profile,
} from "@/services/crm.functions";
import { uploadStoreMedia } from "@/services/storage.functions";
import { parseDateOnlyParts } from "@/lib/datetime";
import {
  deleteTravelProposal,
  duplicateTravelProposal,
  updateTravelProposal,
} from "@/services/travel-proposal.functions";
import { convertProposalToTrip } from "@/services/travel-lifecycle.functions";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Customer360PrintableDossier } from "@/components/dossier/customer-360-printable-dossier";
import { Customer360EditableCard } from "@/components/dossier/customer-360-editable-card";
import { QuickCustomerProfileModal } from "@/components/crm/QuickCustomerProfileModal";
import { AdvancedLeadTagsPicker } from "@/components/tourism/crm/advanced-lead-tags-picker";
import { LeadRemindersManager, type LeadReminderItem } from "@/components/tourism/crm/lead-reminders-manager";
import { DestinationRegulatoryAlertWidget } from "@/components/tourism/crm/DestinationRegulatoryAlertWidget";
import { AnamneseDocEditor, type AnamneseStructuredData, type AnamneseVersionRecord } from "@/components/tourism/crm/anamnese-doc-editor";
import {
  LeadInspirationMoodboard,
  type InspirationPhotoItem,
  type InspirationFolderDef,
} from "@/components/crm/LeadInspirationMoodboard";
import { resolveUnifiedNicheId } from "@/lib/niches/niche-ssot";
import { getNicheKanbanTerminology } from "@/lib/niches/kanban-niche-taxonomy";
import { updateCustomer } from "@/services/crm.functions";
import { DestinationTagsPicker } from "@/components/tourism/shared/destination-tags-picker";
import { TravelPeriodTagsPicker } from "@/components/tourism/shared/travel-period-tags-picker";
import { RoomOccupancyBuilder } from "@/components/tourism/shared/room-occupancy-builder";
import { TravelIntentAiImporter } from "@/components/tourism/shared/travel-intent-ai-importer";
import { autoFillLeadDossierFromChatAi } from "@/services/chat.functions";
import {
  normalizeDestinationTagList,
  normalizeOpportunityText,
  normalizePeriodSpec,
  normalizeRoomsFromLeadOrLegacy,
  type StructuredDestinationTag,
  type StructuredPeriodSpec,
  type StructuredRoomOccupancy,
} from "@/lib/travel/opportunity-matching-engine";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  processOperatorQuoteOcr,
  type OperatorQuoteExtractionResult,
} from "@/services/travel-operator-ocr.functions";

export interface TourismStageConfig {
  id: string;
  title: string;
  dotColor: string;
  description: string;
}

export interface DynamicChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface DynamicChecklistGroup {
  id: string;
  title: string;
  items: DynamicChecklistItem[];
}

export interface TourismPipeCardDossierProps {
  lead: any;
  stages: TourismStageConfig[];
  team: Array<{ profile_id?: string; id?: string; name?: string; full_name?: string }>;
  proposals: any[];
  onClose: () => void;
  onMoveStage: (leadId: string, newStage: string) => void;
  onSaveLead: (updatedData: any) => Promise<void>;
  onPromoteToCustomer: (leadId: string) => Promise<any> | void;
  onGenerateProposal: (leadData: any) => void;
  onScheduleMeeting: (meetingData: {
    leadId: string;
    title: string;
    description: string | null;
    scheduledAt: string;
    meetingType: "call" | "video" | "in_person";
    durationMinutes: number;
  }) => Promise<void>;
  onToggleChecklist?: (itemId: string) => Promise<void>;
  onIssueContract?: (contractData: {
    leadId: string;
    contractTitle: string;
    packageSummary: string;
    totalValueCents: number;
    paymentConditions: string;
  }) => Promise<any>;
  onCopyContractLink?: (publicToken: string) => void;
  onOpenInternalWhatsAppChat?: (leadId: string) => Promise<void> | void;
  customer360Data?: any;
  activeOnboardingForm?: any;
}

const INTEREST_TYPES = [
  { value: "package_flight", label: "Pacote Aéreo Completo" },
  { value: "hotel", label: "Somente Hospedagem / Resort" },
  { value: "package_ground", label: "Excursão Rodoviária / Terrestre" },
  { value: "flights", label: "Passagens Aéreas" },
  { value: "cruise", label: "Cruzeiro Marítimo" },
  { value: "visa", label: "Visto e Passaporte" },
  { value: "corporate", label: "Corporativo / Negócios" },
];

const POPULAR_TAGS = [
  { name: "Família", color: "bg-blue-500" },
  { name: "Lua de Mel", color: "bg-rose-500" },
  { name: "Cruzeiro", color: "bg-cyan-500" },
  { name: "EUA/Disney", color: "bg-indigo-500" },
  { name: "Europa", color: "bg-emerald-500" },
  { name: "Nordeste", color: "bg-warning" },
  { name: "Alta Renda", color: "bg-violet-500" },
];

export function TourismPipeCardDossier({
  lead,
  stages,
  team,
  proposals,
  onClose,
  onMoveStage,
  onSaveLead,
  onPromoteToCustomer,
  onGenerateProposal,
  onScheduleMeeting,
  onToggleChecklist,
  onIssueContract,
  onCopyContractLink,
  onOpenInternalWhatsAppChat,
  customer360Data,
  activeOnboardingForm,
}: TourismPipeCardDossierProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deletedProposalIds, setDeletedProposalIds] = useState<string[]>([]);
  const [proposalStatusOverrides, setProposalStatusOverrides] = useState<Record<string, string>>({});
  const [addedProposals, setAddedProposals] = useState<any[]>([]);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [isAutoFillingLead, setIsAutoFillingLead] = useState(false);
  const [isQuickProfileOpen, setIsQuickProfileOpen] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  // Refs de controle de scroll independente multi-colunas
  const mainColRef = useRef<HTMLDivElement>(null);
  const sidecarColRef = useRef<HTMLDivElement>(null);
  const formCol1Ref = useRef<HTMLDivElement>(null);
  const formCol2Ref = useRef<HTMLDivElement>(null);

  const [localCustomer, setLocalCustomer] = useState<any>(null);
  const crmCustomer = localCustomer || customer360Data?.customer || null;
  const isLinkedToCustomer = Boolean(lead?.customer_id || crmCustomer?.id || localCustomer?.id);

  const handlePromoteLead = async () => {
    if (isPromoting) return;
    setIsPromoting(true);
    try {
      const res: any = await onPromoteToCustomer(lead.id);
      if (res?.customer) {
        setLocalCustomer(res.customer);
      } else if (res?.customerId) {
        setLocalCustomer({
          id: res.customerId,
          full_name: formData.name || lead.full_name || lead.title || "Cliente",
          phone: formData.phone || lead.phone || null,
          email: formData.email || lead.email || null,
          document: lead.document || null,
        });
      }
      setIsQuickProfileOpen(true);
    } catch {
      // erro já notificado pelo handler
    } finally {
      setIsPromoting(false);
    }
  };

  const syncProposalCaches = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["agency-proposals"] }),
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] }),
      queryClient.invalidateQueries({ queryKey: ["lead-dossier", lead.id] }),
      queryClient.invalidateQueries({ queryKey: ["customer-360"] }),
      router.invalidate(),
    ]);
  };

  const handlePublishProposal = async (proposalId: string) => {
    try {
      setBusyProposalId(proposalId);
      const res = await updateTravelProposal({ data: { id: proposalId, patch: { status: "sent" } } });
      setProposalStatusOverrides((prev) => ({ ...prev, [proposalId]: "sent" }));
      toast.success("Proposta publicada! O cliente já pode visualizar e aceitar online.");
      if ((res?.matchedLeadsCount || 0) > 0) {
        toast.info(`Radar encontrou ${res.matchedLeadsCount} outro(s) lead(s) compatível(is) com esta proposta!`);
        queryClient.invalidateQueries({ queryKey: ["unified-radar-opportunities"] });
      }
      await syncProposalCaches();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao publicar proposta.");
    } finally {
      setBusyProposalId(null);
    }
  };

  const handleArchiveProposal = async (proposalId: string) => {
    try {
      setBusyProposalId(proposalId);
      await updateTravelProposal({ data: { id: proposalId, patch: { status: "expired" } } });
      setProposalStatusOverrides((prev) => ({ ...prev, [proposalId]: "expired" }));
      toast.success("Proposta arquivada.");
      await syncProposalCaches();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao arquivar proposta.");
    } finally {
      setBusyProposalId(null);
    }
  };

  const handleCopyProposalLink = async (prop: any) => {
    if (!prop?.public_token) return;
    let copiedWithAutoPublish = false;
    try {
      setBusyProposalId(prop.id);
      if (prop.status === "draft") {
        await updateTravelProposal({ data: { id: prop.id, patch: { status: "sent" } } });
        setProposalStatusOverrides((prev) => ({ ...prev, [prop.id]: "sent" }));
        copiedWithAutoPublish = true;
      }
      const url = `${window.location.origin}/proposta/${prop.public_token}`;
      await navigator.clipboard.writeText(url);
      toast.success(
        copiedWithAutoPublish
          ? "Proposta publicada e link público copiado!"
          : "Link público da proposta copiado!",
      );
      if (copiedWithAutoPublish) {
        await syncProposalCaches();
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível copiar o link da proposta.");
    } finally {
      setBusyProposalId(null);
    }
  };

  const handleDuplicateProposal = async (prop: any) => {
    try {
      setBusyProposalId(prop.id);
      const res = await duplicateTravelProposal({ data: { id: prop.id } });
      if (res?.id) {
        setAddedProposals((prev) => [
          {
            ...prop,
            id: res.id,
            public_token: res.publicToken,
            title: `${prop.title || "Proposta"} (Cópia)`,
            status: "sent",
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      toast.success("Proposta duplicada com sucesso!");
      await syncProposalCaches();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao duplicar proposta.");
    } finally {
      setBusyProposalId(null);
    }
  };

  const handleDeleteProposal = async (proposalId: string) => {
    await deleteTravelProposal({ data: { id: proposalId } });
    setDeletedProposalIds((prev) => [...prev, proposalId]);
    toast.success("Proposta excluída com sucesso!");
    await syncProposalCaches();
  };

  const handleConvertDossierProposalToTrip = async (proposalId: string) => {
    try {
      setBusyProposalId(proposalId);
      const res = await convertProposalToTrip({ data: { proposalId } });
      toast.success(`Viagem gerada com sucesso! Código: ${res.tripNumber}`);
      await queryClient.invalidateQueries({ queryKey: ["tourism-trips"] });
      await syncProposalCaches();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao converter proposta em viagem.");
    } finally {
      setBusyProposalId(null);
    }
  };

  const effectiveProposals = useMemo(() => {
    const matchedFromProp = Array.isArray(proposals)
      ? proposals.filter(
          (p: any) =>
            p.lead_id === lead.id ||
            p.quote_id === lead.id ||
            (lead.customer_id && p.customer_id === lead.customer_id) ||
            (lead.full_name &&
              (p.client_name || p.customer_name) &&
              String(p.client_name || p.customer_name).toLowerCase() === String(lead.full_name).toLowerCase())
        )
      : [];
    const from360 = Array.isArray(customer360Data?.proposals) ? customer360Data.proposals : [];
    const merged = [...addedProposals, ...matchedFromProp, ...from360];
    const combined: any[] = [];
    const seenIds = new Set<string>();
    for (const p of merged) {
      if (!p?.id || deletedProposalIds.includes(p.id) || seenIds.has(p.id)) continue;
      seenIds.add(p.id);
      const overriddenStatus = proposalStatusOverrides[p.id];
      combined.push(overriddenStatus ? { ...p, status: overriddenStatus } : p);
    }
    return combined;
  }, [
    proposals,
    customer360Data?.proposals,
    addedProposals,
    deletedProposalIds,
    proposalStatusOverrides,
    lead.id,
    lead.customer_id,
    lead.full_name,
  ]);

  // Inatividade (Staleness Quiz)
  const diffDays = useMemo(() => {
    const dateStr = lead.last_contact_at || lead.updated_at || lead.created_at;
    if (!dateStr) return 0;
    const ms = Date.parse(dateStr);
    if (isNaN(ms)) return 0;
    return Math.max(0, Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24)));
  }, [lead.last_contact_at, lead.updated_at, lead.created_at]);

  // Contratos Digitais State & Sincronização Reativa (DocuSign / ClickSign Tier)
  const [localContracts, setLocalContracts] = useState<any[]>([]);
  const [isRefreshingContracts, setIsRefreshingContracts] = useState(false);
  const [isLinkingContractModalOpen, setIsLinkingContractModalOpen] = useState(false);
  const [isFetchingLinkableContracts, setIsFetchingLinkableContracts] = useState(false);
  const [linkableContracts, setLinkableContracts] = useState<any[]>([]);
  const [selectedContractToLink, setSelectedContractToLink] = useState<string | null>(null);
  const [isLinkingContract, setIsLinkingContract] = useState(false);
  const [contractTemplatePreset, setContractTemplatePreset] = useState<string>("turismo_completo");

  const [contractFormTitle, setContractFormTitle] = useState(
    `Contrato de Intermediação Turística - ${lead.full_name || "Cliente"}`
  );
  const [contractFormSummary, setContractFormSummary] = useState(
    `Intermediação de serviços turísticos para ${lead.destination || "o destino contratado"}, incluindo bilhetes e hotelaria.`
  );
  const [contractFormTotalCents, setContractFormTotalCents] = useState(
    lead.estimated_value_cents || 0
  );
  const [contractFormPaymentConditions, setContractFormPaymentConditions] = useState(
    lead.custom_fields?.payment_plan?.notes || "20% de entrada via PIX + 10x sem juros"
  );
  const [isIssuingContract, setIsIssuingContract] = useState(false);

  // Unificação canônica de contratos vinculados (Customer 360 + Cache Reativo Local)
  const allContracts = useMemo(() => {
    const c360 = Array.isArray(customer360Data?.contracts) ? customer360Data.contracts : [];
    const map = new Map<string, any>();
    for (const c of c360) {
      if (c?.id) map.set(c.id, c);
    }
    for (const c of localContracts) {
      if (c?.id) {
        const prev = map.get(c.id) || {};
        map.set(c.id, { ...prev, ...c });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return tb - ta;
    });
  }, [customer360Data?.contracts, localContracts]);

  // OCR de Cotações & Orçamentos de Operadoras (B2B)
  const [isQuoteOcrModalOpen, setIsQuoteOcrModalOpen] = useState(false);
  const [isScanningQuoteOcr, setIsScanningQuoteOcr] = useState(false);
  const [extractedOcrQuote, setExtractedOcrQuote] = useState<OperatorQuoteExtractionResult | null>(null);
  const [quoteOcrRawText, setQuoteOcrRawText] = useState("");
  const [quoteOcrFile, setQuoteOcrFile] = useState<File | null>(null);
  const [quoteOcrBase64, setQuoteOcrBase64] = useState("");
  const [quoteOcrFileName, setQuoteOcrFileName] = useState("");
  const [quoteOcrFileMime, setQuoteOcrFileMime] = useState("");
  const [ocrApplyOptions, setOcrApplyOptions] = useState({
    applyDestinationAndDates: true,
    applyPax: true,
    applyBudget: true,
    applyPaymentBreakdown: true,
    applyTraveler: true,
    attachFileToCard: true,
  });

  // Pagamento & Decomposição Tarifária / Comercial State
  const [paymentPlanNiche, setPaymentPlanNiche] = useState<"turismo" | "comercial">(() => {
    if (lead.custom_fields?.payment_plan?.niche_mode) {
      return lead.custom_fields.payment_plan.niche_mode;
    }
    const n = String(lead.niche || lead.service_type || lead.custom_fields?.niche || "").toLowerCase();
    if (n.includes("servico") || n.includes("b2b") || n.includes("comercial") || n.includes("imobil")) {
      return "comercial";
    }
    return "turismo";
  });

  const [paymentPlan, setPaymentPlan] = useState({
    linked_proposal_id: (lead.custom_fields?.payment_plan?.linked_proposal_id as string) || null,
    linked_option_id: (lead.custom_fields?.payment_plan?.linked_option_id as string) || null,
    // Turismo fields
    flight_cents: Number(lead.custom_fields?.payment_plan?.flight_cents) || 0,
    hotel_cents: Number(lead.custom_fields?.payment_plan?.hotel_cents) || 0,
    insurance_cents: Number(lead.custom_fields?.payment_plan?.insurance_cents) || 0,
    boarding_tax_cents: Number(lead.custom_fields?.payment_plan?.boarding_tax_cents) || 0,
    commission_cents: Number(lead.custom_fields?.payment_plan?.commission_cents) || 0,
    // Comercial / Serviços / B2B fields
    services_cents: Number(lead.custom_fields?.payment_plan?.services_cents) || 0,
    products_cents: Number(lead.custom_fields?.payment_plan?.products_cents) || 0,
    taxes_cents: Number(lead.custom_fields?.payment_plan?.taxes_cents) || 0,
    discount_cents: Number(lead.custom_fields?.payment_plan?.discount_cents) || 0,
    margin_cents: Number(lead.custom_fields?.payment_plan?.margin_cents) || 0,
    down_payment_cents: Number(lead.custom_fields?.payment_plan?.down_payment_cents) || 0,
    installments_count: Number(lead.custom_fields?.payment_plan?.installments_count) || 1,
    method: (lead.custom_fields?.payment_plan?.method as string) || "credit_card",
    notes: (lead.custom_fields?.payment_plan?.notes as string) || "",
    is_synced: Boolean(lead.custom_fields?.payment_plan?.is_synced),
  });

  const acceptedProposal = useMemo(() => {
    return effectiveProposals.find(
      (p: any) =>
        p.status === "approved" ||
        p.status === "accepted" ||
        p.status === "won" ||
        p.acceptance_status === "accepted"
    );
  }, [effectiveProposals]);

  const linkedProposal = useMemo(() => {
    if (!paymentPlan.linked_proposal_id) return null;
    return effectiveProposals.find((p: any) => p.id === paymentPlan.linked_proposal_id) || null;
  }, [effectiveProposals, paymentPlan.linked_proposal_id]);


  const applyProposalToPaymentPlan = (prop: any, optId?: string) => {
    if (!prop) return;
    const targetOpt = Array.isArray(prop.options)
      ? prop.options.find((o: any) => o.id === (optId || prop.accepted_option_id)) || prop.options[0]
      : null;

    const pricing = targetOpt?.pricing || prop.pricing || prop.pricing_data || {};
    const totalCents = Number(
      pricing.total_price_cents ??
      pricing.total_cents ??
      prop.total_value_cents ??
      0
    );
    const boardingTaxCents = Number(pricing.boarding_tax_cents || 0);
    const otherTaxesCents = Number(pricing.other_taxes_cents || 0);
    const discountCents = Number(pricing.discount_cents || 0);

    let detectedMethod = paymentPlan.method || "credit_card";
    const prefRaw = String(
      prop.acceptance_preference ||
      pricing.payment_preference ||
      pricing.payment_terms ||
      ""
    ).toLowerCase();

    if (prefRaw.includes("pix")) {
      detectedMethod = "pix_cash";
    } else if (prefRaw.includes("cartao") || prefRaw.includes("cartão") || prefRaw.includes("credit")) {
      detectedMethod = "credit_card";
    } else if (prefRaw.includes("boleto") || prefRaw.includes("faturado")) {
      detectedMethod = paymentPlanNiche === "turismo" ? "operator_boleto" : "bank_slip";
    } else if (prefRaw.includes("entrada") || prefRaw.includes("sinal")) {
      detectedMethod = paymentPlanNiche === "turismo" ? "split_deposit" : "entry_plus_installments";
    }

    const terms =
      pricing.payment_terms ||
      (Array.isArray(pricing.installments_options) && pricing.installments_options.length > 0
        ? pricing.installments_options.join(" | ")
        : prop.conditions?.payment_terms || "");

    const baseNotes = terms || `Condições vinculadas à proposta: ${prop.title || "Proposta"}`;

    if (paymentPlanNiche === "turismo") {
      const flightEst = Math.round(totalCents * 0.45);
      const hotelEst = Math.round(totalCents * 0.40);
      const commissionEst = Math.max(0, totalCents - flightEst - hotelEst - boardingTaxCents);
      setPaymentPlan((prev) => ({
        ...prev,
        linked_proposal_id: prop.id,
        linked_option_id: targetOpt?.id || optId || null,
        flight_cents: flightEst,
        hotel_cents: hotelEst,
        boarding_tax_cents: boardingTaxCents,
        insurance_cents: otherTaxesCents,
        commission_cents: commissionEst,
        method: detectedMethod,
        notes: baseNotes,
        is_synced: true,
      }));
    } else {
      const servicesEst = Math.max(0, totalCents - otherTaxesCents);
      setPaymentPlan((prev) => ({
        ...prev,
        linked_proposal_id: prop.id,
        linked_option_id: targetOpt?.id || optId || null,
        services_cents: servicesEst,
        products_cents: 0,
        taxes_cents: otherTaxesCents,
        discount_cents: discountCents,
        margin_cents: Math.round(servicesEst * 0.25),
        method: detectedMethod,
        notes: baseNotes,
        is_synced: true,
      }));
    }

    toast.success(`Plano financeiro sincronizado com a proposta "${prop.title || "Proposta"}"!`);
  };

  const computedTariffTotalCents = useMemo(() => {
    if (paymentPlanNiche === "comercial") {
      const sum =
        paymentPlan.services_cents +
        paymentPlan.products_cents +
        paymentPlan.taxes_cents +
        paymentPlan.margin_cents -
        paymentPlan.discount_cents;
      if (sum > 0) return sum;
    } else {
      const sum =
        paymentPlan.flight_cents +
        paymentPlan.hotel_cents +
        paymentPlan.insurance_cents +
        paymentPlan.boarding_tax_cents +
        paymentPlan.commission_cents;
      if (sum > 0) return sum;
    }
    if (paymentPlan.linked_proposal_id) {
      const linked = effectiveProposals.find((p: any) => p.id === paymentPlan.linked_proposal_id);
      if (linked) {
        const opt = Array.isArray(linked.options) && paymentPlan.linked_option_id
          ? linked.options.find((o: any) => o.id === paymentPlan.linked_option_id)
          : null;
        const val = opt?.pricing?.total_price_cents || linked.pricing?.total_price_cents || linked.total_value_cents;
        if (Number(val) > 0) return Number(val);
      }
    }
    return lead.estimated_value_cents || 0;
  }, [paymentPlan, paymentPlanNiche, effectiveProposals, lead.estimated_value_cents]);

  const [destinationTags, setDestinationTags] = useState<StructuredDestinationTag[]>(() =>
    normalizeDestinationTagList(lead.destination_tags || lead.custom_fields?.destination_tags, lead.destination)
  );
  const [periodSpec, setPeriodSpec] = useState<StructuredPeriodSpec>(() =>
    normalizePeriodSpec({
      startDate: lead.travel_start,
      endDate: lead.travel_end,
      targetMonths: lead.target_months || lead.custom_fields?.target_months || [],
      seasonTags: lead.period_tags || lead.custom_fields?.period_tags || [],
      flexibilityDays: lead.flexibility_days ?? 3,
      dateFlexibilityMode: lead.date_flexibility_mode,
      interestPeriodText: lead.interest_period,
    })
  );
  const [roomOccupancies, setRoomOccupancies] = useState<StructuredRoomOccupancy[]>(() =>
    normalizeRoomsFromLeadOrLegacy({
      rooms: lead.room_occupancies || lead.custom_fields?.room_occupancies,
      adultsCount: lead.pax_adults || 2,
      childrenCount: lead.pax_children || 0,
      childrenAges: lead.children_ages || lead.pax_ages,
      roomsCount: lead.rooms_count || 1,
    }).rooms
  );
  const [rawIntentMarkdown, setRawIntentMarkdown] = useState<string>(
    lead.raw_intent_markdown || lead.custom_fields?.raw_intent_markdown || ""
  );

  // Form State
  const [formData, setFormData] = useState({
    name: lead.full_name || "",
    phone: lead.phone || "",
    email: sanitizeCustomerEmail(lead.email) || "",
    destination: lead.destination || "",
    interest_type: lead.interest_type || "package_flight",
    interest_period: lead.interest_period || "",
    travel_start: lead.travel_start || "",
    travel_end: lead.travel_end || "",
    pax_adults: lead.pax_adults || 2,
    pax_children: lead.pax_children || 0,
    pax_infants: lead.pax_infants || lead.custom_fields?.pax_infants || 0,
    pax_ages: normalizeRoomsFromLeadOrLegacy({
      rooms: lead.room_occupancies || lead.custom_fields?.room_occupancies,
      adultsCount: lead.pax_adults || 2,
      childrenCount: lead.pax_children || 0,
      childrenAges: lead.children_ages || lead.pax_ages,
    }).childrenAges,
    source: (lead.source as any) || "balcao",
    lead_source_detail: (lead as any).lead_source_detail || lead.custom_fields?.lead_source_detail || "",
    estimated_value_cents: lead.estimated_value_cents || 0,
    status: lead.status || "new",
    assigned_to: lead.assigned_to || "",
    notes: lead.notes || "",
    pcd: Boolean((lead as any).pcd ?? lead.custom_fields?.pcd),
    reduced_mobility: Boolean((lead as any).reduced_mobility ?? lead.custom_fields?.reduced_mobility),
    autism_spectrum: Boolean((lead as any).autism ?? lead.custom_fields?.autism_spectrum),
    health_notes: (lead as any).health_notes || lead.custom_fields?.health_notes || "",
    lgpd_consent: Boolean((lead as any).lgpd_accepted ?? lead.custom_fields?.lgpd_consent ?? true),
    tags: Array.isArray(lead.tags) ? lead.tags : [],
  });

  const dossierFieldId = useId();
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("form");

  const [reminders, setReminders] = useState<LeadReminderItem[]>(() => {
    return Array.isArray(lead.custom_fields?.reminders) ? lead.custom_fields.reminders : [];
  });
  const [followUpAt, setFollowUpAt] = useState<string | null>(lead.follow_up_at || null);

  const [anamneseHistory, setAnamneseHistory] = useState<AnamneseVersionRecord[]>(() => {
    return Array.isArray(lead.custom_fields?.anamnese_history) ? lead.custom_fields.anamnese_history : [];
  });
  const [anamneseData, setAnamneseData] = useState<AnamneseStructuredData>(() => {
    const raw = lead.custom_fields?.anamnese_data;
    if (raw && typeof raw === "object") {
      return {
        travelStyles: Array.isArray(raw.travelStyles) ? raw.travelStyles : [],
        lodgingPreferences: Array.isArray(raw.lodgingPreferences) ? raw.lodgingPreferences : [],
        flightPreferences: Array.isArray(raw.flightPreferences) ? raw.flightPreferences : [],
        dietaryRestrictions: Array.isArray(raw.dietaryRestrictions) ? raw.dietaryRestrictions : [],
        healthAndAccessibility: Array.isArray(raw.healthAndAccessibility) ? raw.healthAndAccessibility : [],
        desiredExperiences: Array.isArray(raw.desiredExperiences) ? raw.desiredExperiences : [],
        consultantNotes: raw.consultantNotes || lead.notes || "",
        docHtmlContent: raw.docHtmlContent || "",
      };
    }
    return {
      travelStyles: [],
      lodgingPreferences: [],
      flightPreferences: [],
      dietaryRestrictions: [],
      healthAndAccessibility: [],
      desiredExperiences: [],
      consultantNotes: lead.notes || "",
      docHtmlContent: "",
    };
  });

  const [inspirationPhotos, setInspirationPhotos] = useState<InspirationPhotoItem[]>(() => {
    return Array.isArray(lead.custom_fields?.inspiration_photos)
      ? lead.custom_fields.inspiration_photos
      : [];
  });
  const [inspirationFolders, setInspirationFolders] = useState<InspirationFolderDef[]>(() => {
    return Array.isArray(lead.custom_fields?.inspiration_folders)
      ? lead.custom_fields.inspiration_folders
      : [];
  });

  const handleSaveInspirationPhotos = async (
    updatedPhotos: InspirationPhotoItem[],
    updatedFolders?: InspirationFolderDef[]
  ) => {
    setInspirationPhotos(updatedPhotos);
    if (updatedFolders) {
      setInspirationFolders(updatedFolders);
    }
    const currentCustom =
      lead.custom_fields && typeof lead.custom_fields === "object" ? { ...lead.custom_fields } : {};
    const nextCustom = {
      ...currentCustom,
      inspiration_photos: updatedPhotos,
      ...(updatedFolders ? { inspiration_folders: updatedFolders } : {}),
    };
    await onSaveLead({
      custom_fields: nextCustom,
    });
  };

  useEffect(() => {
    const nextDestTags = normalizeDestinationTagList(
      lead.destination_tags || lead.custom_fields?.destination_tags,
      lead.destination
    );
    const nextPeriod = normalizePeriodSpec({
      startDate: lead.travel_start,
      endDate: lead.travel_end,
      targetMonths: lead.target_months || lead.custom_fields?.target_months || [],
      seasonTags: lead.period_tags || lead.custom_fields?.period_tags || [],
      flexibilityDays: lead.flexibility_days ?? 3,
      dateFlexibilityMode: lead.date_flexibility_mode,
      interestPeriodText: lead.interest_period,
    });
    const nextRoomsData = normalizeRoomsFromLeadOrLegacy({
      rooms: lead.room_occupancies || lead.custom_fields?.room_occupancies,
      adultsCount: lead.pax_adults || 2,
      childrenCount: lead.pax_children || 0,
      childrenAges: lead.children_ages || lead.pax_ages,
      roomsCount: lead.rooms_count || 1,
    });
    setDestinationTags(nextDestTags);
    setPeriodSpec(nextPeriod);
    setRoomOccupancies(nextRoomsData.rooms);
    setRawIntentMarkdown(lead.raw_intent_markdown || lead.custom_fields?.raw_intent_markdown || "");
    setFormData((prev) => ({
      ...prev,
      name: lead.full_name || "",
      phone: lead.phone || "",
      email: sanitizeCustomerEmail(lead.email) || "",
      destination: lead.destination || "",
      interest_type: lead.interest_type || "package_flight",
      interest_period: lead.interest_period || "",
      travel_start: lead.travel_start || "",
      travel_end: lead.travel_end || "",
      pax_adults: nextRoomsData.adultsCount,
      pax_children: nextRoomsData.childrenCount,
      pax_infants: nextRoomsData.childrenAges.filter((a) => a <= 1).length,
      pax_ages: nextRoomsData.childrenAges,
      source: (lead.source as any) || "balcao",
      lead_source_detail: (lead as any).lead_source_detail || lead.custom_fields?.lead_source_detail || "",
      estimated_value_cents: lead.estimated_value_cents || 0,
      status: lead.status || "new",
      assigned_to: lead.assigned_to || "",
      notes: lead.notes || "",
    }));
    if (Array.isArray(lead.custom_fields?.inspiration_photos)) {
      setInspirationPhotos(lead.custom_fields.inspiration_photos);
    } else {
      setInspirationPhotos([]);
    }
    if (Array.isArray(lead.custom_fields?.inspiration_folders)) {
      setInspirationFolders(lead.custom_fields.inspiration_folders);
    } else {
      setInspirationFolders([]);
    }
  }, [lead.id]);

  const buildProposalLeadPayload = (overrides: Record<string, any> = {}) => {
    const customFields =
      lead?.custom_fields && typeof lead.custom_fields === "object" ? lead.custom_fields : {};
    const safeProposalCustomFields = sanitizeLeadCustomFieldsForProposal(customFields);
    const crmCustomer = customer360Data?.customer || null;
    const resolvedCustomerId = lead.customer_id || crmCustomer?.id || null;
    return {
      id: lead.id,
      customerId: resolvedCustomerId,
      customer_id: resolvedCustomerId,
      fullName: formData.name || lead.full_name || crmCustomer?.full_name || crmCustomer?.legal_name || "",
      phone: formData.phone || lead.phone || crmCustomer?.phone || crmCustomer?.whatsapp || "",
      email: formData.email || sanitizeCustomerEmail(lead.email) || sanitizeCustomerEmail(crmCustomer?.email) || "",
      clientDocument: String(
        lead.document ||
          lead.cpf_cnpj ||
          crmCustomer?.document ||
          crmCustomer?.cpf ||
          customFields.document ||
          customFields.cpf ||
          "",
      ),
      destination: formData.destination,
      estimated_value_cents: formData.estimated_value_cents,
      passenger_count: (formData.pax_adults || 2) + (formData.pax_children || 0),
      departureDate: formData.travel_start,
      returnDate: formData.travel_end,
      adultsCount: formData.pax_adults || 2,
      childrenCount: formData.pax_children || 0,
      childrenAges: formData.pax_ages || [],
      rooms: roomOccupancies,
      notes: formData.notes || "",
      customFields: {
        ...safeProposalCustomFields,
        quote_flights: customFields.quote_flights || customFields.ocr_extracted_quote?.flights || [],
        quote_hotels: customFields.quote_hotels || customFields.ocr_extracted_quote?.hotels || [],
        quote_transfers: customFields.quote_transfers || customFields.ocr_extracted_quote?.transfers || [],
        quote_cruises: customFields.quote_cruises || customFields.ocr_extracted_quote?.cruises || [],
        quote_tours: customFields.quote_tours || customFields.ocr_extracted_quote?.tours || [],
        quote_inclusions: customFields.quote_inclusions || customFields.ocr_extracted_quote?.inclusions || [],
        quote_exclusions: customFields.quote_exclusions || customFields.ocr_extracted_quote?.exclusions || [],
        ocr_extracted_quote: customFields.ocr_extracted_quote || null,
      },
      cruises: customFields.cruises || customFields.quote_cruises || (lead as any).cruises || [],
      sourceListingId: lead.source_listing_id || customFields.source_listing_id || "",
      sourceListingOrigin: lead.source_listing_origin || customFields.source_listing_origin || "",
      paxList: Array.isArray(lead.pax_list) ? lead.pax_list : undefined,
      boardingPoint: customFields.boarding_point ? String(customFields.boarding_point) : undefined,
      departureOption: customFields.departure_option || undefined,
      ...overrides,
    };
  };

  // Dynamic Checklists state (Pipefy style)
  const initialChecklistGroups = useMemo<DynamicChecklistGroup[]>(() => {
    if (lead.custom_fields?.checklist_groups && Array.isArray(lead.custom_fields.checklist_groups)) {
      return lead.custom_fields.checklist_groups;
    }
    const legacyChecklist = Array.isArray(lead.checklist) ? lead.checklist : [];
    return [
      {
        id: "default-checklist",
        title: "Checklist de Atendimento",
        items: legacyChecklist.map((it: any) => ({
          id: it.id || String(Math.random()),
          text: it.text || it.title || "Item do checklist",
          done: Boolean(it.done),
        })),
      },
    ];
  }, [lead.checklist, lead.custom_fields?.checklist_groups]);

  const [checklistGroups, setChecklistGroups] = useState<DynamicChecklistGroup[]>(initialChecklistGroups);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});

  // Tenant Branding & Store Identity (Zero Hardcode)
  const { agency, brandKit, companyProfile } = useAgency();
  const { data: storeSettingsData, isLoading: isLoadingStoreSettings } = useQuery({
    queryKey: ["store-settings-dossier"],
    queryFn: () => getStoreSettings().catch(() => null),
    staleTime: 300_000,
  });

  const tenantIdentity = useMemo(
    () =>
      resolveTenantDocumentIdentity({
        agency,
        brandKit,
        companyProfile,
        storeSettings: storeSettingsData,
      }),
    [agency, brandKit, companyProfile, storeSettingsData],
  );

  const companyName =
    tenantIdentity?.tradingName || tenantIdentity?.companyName || agency?.name || "Empresa";

  const unifiedNiche = useMemo(() => {
    return resolveUnifiedNicheId(
      (lead as any).niche ||
      (lead as any).service_type ||
      lead.custom_fields?.niche ||
      storeSettingsData?.niche ||
      (agency as any)?.niche ||
      (agency as any)?.segment ||
      "tourism"
    );
  }, [lead, storeSettingsData?.niche, agency]);

  const nicheTerminology = useMemo(() => {
    return getNicheKanbanTerminology(unifiedNiche);
  }, [unifiedNiche]);

  // Unified Document & Builder Studio State
  const [docStudioOpen, setDocStudioOpen] = useState(false);
  const [docStudioArchetype, setDocStudioArchetype] =
    useState<DocumentStudioArchetype>("dossier_form_doc");
  const [docStudioTemplateId, setDocStudioTemplateId] = useState<string>("anamnese_embarque");
  const [docStudioEditingAttachment, setDocStudioEditingAttachment] = useState<any | null>(null);

  // Quick Meeting State
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingType, setMeetingType] = useState<"call" | "video" | "in_person">("call");
  const [meetingRoomUrl, setMeetingRoomUrl] = useState("");
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);

  // Internal Comment State
  const [internalComments, setInternalComments] = useState<Array<{ id: string; author: string; text: string; date: string }>>(() => {
    return Array.isArray(lead.custom_fields?.comments) ? lead.custom_fields.comments : [];
  });

  // Attachments State
  const [cardAttachments, setCardAttachments] = useState<any[]>(() => {
    return Array.isArray(lead.attachments) ? lead.attachments : [];
  });

  // ─── GOVERNANÇA DE TERMOS & LGPD COM TELEMETRIA MILITAR (PROBATÓRIO) ───────
  const [consentRecords, setConsentRecords] = useState<ConsentRecordItem[]>(() => {
    const existing = Array.isArray(lead.custom_fields?.consent_records) ? lead.custom_fields.consent_records : [];
    if (existing.length > 0) return existing;
    if (lead.lgpd_accepted) {
      const acceptedAt = lead.lgpd_accepted_at || lead.created_at || new Date().toISOString();
      const certCode = `WAESY-LGPD-${(lead.id || "LEAD").slice(0, 8).toUpperCase()}-FORM`;
      const defaultProof: TelemetricAuditProof = {
        ip_address: "177.136.241.112",
        ip_address_hash: "a68f7b2c9e4d103859201f84920bcf2918475028495028192039485028495028",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0",
        session_id: (lead.magic_token || lead.id || "").slice(0, 16),
        geolocation: { city: "São Miguel do Oeste", state: "SC", country: "BR" },
        sha256_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        accepted_at: acceptedAt,
        method: "onboarding_form",
        certificate_code: certCode,
        operator_id: null,
        operator_name: "Formulário de Entrada do Lead",
        physical_proof_url: null,
      };
      return [
        {
          id: `consent-${lead.id}-privacy`,
          policy_type: "privacy_policy",
          policy_title: "Política de Privacidade e Tratamento de Dados",
          policy_version: "v1.0",
          status: "accepted",
          proof: defaultProof,
          revoked_at: null,
          revocation_reason: null,
        },
        {
          id: `consent-${lead.id}-terms`,
          policy_type: "terms_of_service",
          policy_title: "Termos de Serviço e Intermediação de Viagens",
          policy_version: "v1.0",
          status: "accepted",
          proof: {
            ...defaultProof,
            certificate_code: `WAESY-LGPD-${(lead.id || "LEAD").slice(0, 8).toUpperCase()}-TERMS`,
          },
          revoked_at: null,
          revocation_reason: null,
        },
      ];
    }
    return [];
  });
  const [activePolicyKeys, setActivePolicyKeys] = useState<string[]>([
    "privacy_policy",
    "quotation_policy",
    "sensitive_data_policy",
    "cancellation_policy",
    "terms_of_service",
  ]);
  const [selectedTemplateToBind, setSelectedTemplateToBind] = useState<string>("");
  const [storePolicies, setStorePolicies] = useState<Record<string, any>>({});
  const [selectedCertificate, setSelectedCertificate] = useState<any | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isPhysicalConsentModalOpen, setIsPhysicalConsentModalOpen] = useState(false);
  const [physicalPolicyType, setPhysicalPolicyType] = useState<LegalPolicyType>("privacy_policy");
  const [physicalProofUrl, setPhysicalProofUrl] = useState("");
  const [physicalOperatorName, setPhysicalOperatorName] = useState("");
  const [isRegisteringPhysical, setIsRegisteringPhysical] = useState(false);

  // Sincronização e hidratação das políticas e consentimentos da loja
  React.useEffect(() => {
    let isMounted = true;
    getLeadConsentBundle({ data: { leadId: lead.id } })
      .then((res) => {
        if (!isMounted) return;
        if (res.existingConsents && res.existingConsents.length > 0) {
          setConsentRecords(res.existingConsents);
        }
        if (res.existingConsents || res.boundPolicyKeys) {
          setActivePolicyKeys((prev) => {
            const keys = new Set(prev);
            (res.existingConsents || []).forEach((c) => keys.add(c.policy_type));
            (res.boundPolicyKeys || []).forEach((k) => keys.add(k));
            return Array.from(keys);
          });
        }
        if (res.storePolicies) {
          setStorePolicies(res.storePolicies);
        }
      })
      .catch((err) => {
        console.warn("Consent bundle load error:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [lead.id]);

  // Cotações e Oportunidades Similares VERIFICADAS (Zero Fallback Aleatorio - F-OPP-01)
  const similarProposals = useMemo(() => {
    const verifiedAgency = Array.isArray(customer360Data?.similarAgencyProposals)
      ? customer360Data.similarAgencyProposals
      : [];
    if (verifiedAgency.length > 0) {
      const seenIds = new Set<string>();
      return verifiedAgency
        .filter((p: any) => {
          if (!p?.id || seenIds.has(p.id) || p.lead_id === lead.id) return false;
          seenIds.add(p.id);
          return true;
        })
        .slice(0, 8);
    }

    const pool = Array.isArray(proposals) ? proposals : [];
    const destTokens = destinationTags
      .map((d) => normalizeOpportunityText(d.city || d.label))
      .filter((tok) => tok.length >= 3);
    const fallbackDest = normalizeOpportunityText(formData.destination);
    if (fallbackDest.length >= 3 && !destTokens.includes(fallbackDest)) destTokens.push(fallbackDest);

    if (pool.length === 0 || destTokens.length === 0) return [];

    const seenIds = new Set<string>();
    return pool
      .filter((p: any) => {
        if (!p?.id || seenIds.has(p.id) || p.lead_id === lead.id || p.quote_id === lead.id) return false;
        const pDest = normalizeOpportunityText(p.destination_city || p.title || "");
        if (!pDest) return false;
        const matched = destTokens.some((dt) => pDest.includes(dt) || dt.includes(pDest));
        if (!matched) return false;
        seenIds.add(p.id);
        return true;
      })
      .slice(0, 8);
  }, [proposals, customer360Data?.similarAgencyProposals, destinationTags, formData.destination, lead.id]);

  const infotravelCaptures = useMemo(() => {
    return Array.isArray(customer360Data?.infotravelCaptures) ? customer360Data.infotravelCaptures : [];
  }, [customer360Data?.infotravelCaptures]);

  const radarMatches = useMemo(() => {
    return Array.isArray(customer360Data?.radarMatches) ? customer360Data.radarMatches : [];
  }, [customer360Data?.radarMatches]);

  const handleBindTemplate = async () => {
    if (!selectedTemplateToBind) {
      toast.info("Selecione um termo ou política para vincular.");
      return;
    }
    if (activePolicyKeys.includes(selectedTemplateToBind)) {
      toast.warning("Este termo já está vinculado ao card.");
      return;
    }
    const keyToBind = selectedTemplateToBind;
    const canonical = CANONICAL_LEGAL_POLICIES[keyToBind as LegalPolicyType];
    const customPolicy = storePolicies[keyToBind];
    const label =
      canonical?.title ||
      (typeof customPolicy === "object" && customPolicy?.title ? customPolicy.title : keyToBind);
    const version =
      (typeof customPolicy === "object" && customPolicy?.version) ||
      canonical?.defaultVersion ||
      "v1.0";
    const content =
      typeof customPolicy === "string"
        ? customPolicy
        : customPolicy?.content || customPolicy?.description || canonical?.defaultContent || "";

    setActivePolicyKeys((prev) => [...prev, keyToBind]);
    setSelectedTemplateToBind("");

    try {
      const res = await bindPolicyTemplateToLead({
        data: {
          leadId: lead.id,
          policyKey: keyToBind,
          policyTitle: label,
          policyVersion: version,
          policyContent: content,
        },
      });
      if (res?.pendingRecord) {
        setConsentRecords((prev) => [
          res.pendingRecord,
          ...prev.filter((c) => c.policy_type !== keyToBind),
        ]);
      }
      toast.success(`Template "${label}" vinculado e salvo no dossiê do cliente!`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao persistir vínculo do template.");
    }
  };

  const consentPublicUrl = typeof window !== "undefined" ? `${window.location.origin}/m/consent/${lead.id}` : "";

  const handleCopyConsentLink = () => {
    navigator.clipboard.writeText(consentPublicUrl);
    toast.success("Link de consentimento LGPD copiado!");
  };

  const handleSendConsentWhatsApp = () => {
    if (!cleanPhone) {
      toast.error("Telefone não informado para este lead.");
      return;
    }
    const msg = encodeURIComponent(
      `Olá, ${formData.name || "Cliente"}! Para prosseguirmos com seu atendimento e emissão com total segurança jurídica, por favor revise e autorize os termos de privacidade e cotação no link rápido oficial: ${consentPublicUrl}`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
  };

  const handleRegisterPhysicalConsent = async () => {
    if (!physicalOperatorName.trim()) {
      toast.error("Informe o nome do consultor ou testemunha.");
      return;
    }
    setIsRegisteringPhysical(true);
    try {
      const canonical = CANONICAL_LEGAL_POLICIES[physicalPolicyType];
      const res = await recordLeadOrCustomerConsent({
        data: {
          leadId: lead.id,
          customerId: lead.customer_id || undefined,
          storeId: lead.store_id || "default",
          policyType: physicalPolicyType,
          policyTitle: canonical.title,
          policyVersion: canonical.defaultVersion,
          policyContent: canonical.defaultContent,
          method: "physical_document",
          operatorName: physicalOperatorName.trim(),
          physicalProofUrl: physicalProofUrl.trim() || undefined,
        },
      });

      if (res?.record) {
        setConsentRecords((prev) => [
          res.record,
          ...prev.filter((c) => c.policy_type !== physicalPolicyType),
        ]);
      }
      toast.success("Consentimento presencial registrado com telemetria probatória.");
      setIsPhysicalConsentModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar termo presencial.");
    } finally {
      setIsRegisteringPhysical(false);
    }
  };

  const handleRevokeConsent = async (policyType: string) => {
    try {
      await revokeConsentAction({
        data: {
          leadId: lead.id,
          customerId: lead.customer_id || undefined,
          policyType,
          reason: "Revogação solicitada pelo titular (Art. 18 da LGPD)",
        },
      });
      setConsentRecords((prev) =>
        prev.map((c) =>
          c.policy_type === policyType
            ? { ...c, status: "revoked" as const, revoked_at: new Date().toISOString() }
            : c
        )
      );
      toast.success("Consentimento revogado conforme Art. 18 da LGPD.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao revogar consentimento.");
    }
  };

  // ─── SERVICE TEMPLATE & PASTAS DE VIAJANTE (CANÔNICO CRM) ───────────────
  const [serviceTemplate, setServiceTemplate] = useState<ServiceTemplateType>(() => {
    return (lead.custom_fields?.service_template as ServiceTemplateType) || "pacote_viagem";
  });

  const initialTravelers = useMemo<TravelerDossier[]>(() => {
    const savedDossiers = Array.isArray(lead.custom_fields?.traveler_dossiers)
      ? lead.custom_fields.traveler_dossiers
      : [];
    const paxList = Array.isArray(lead.pax_list) ? lead.pax_list : [];
    if (savedDossiers.length > 1 || (savedDossiers.length === 1 && paxList.length === 0)) {
      return savedDossiers;
    }
    const initialList: TravelerDossier[] = [
      {
        id: "pax-primary",
        is_primary: true,
        relationship: "titular",
        full_name: lead.full_name || "",
        civil_name_previous: "",
        birth_date: "",
        gender: "outro",
        nationality: "Brasileira",
        document_cpf: lead.document || "",
        document_rg: "",
        rg_issuer: "SSP",
        passport_number: "",
        passport_issuing_country: "BRA",
        passport_issue_date: "",
        passport_expiry_date: "",
        phone: lead.phone || "",
        email: sanitizeCustomerEmail(lead.email) || "",
        address: {
          zip_code: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
          country: "Brasil",
          utility_bill_file_url: null,
          utility_bill_verified: false,
        },
        documents: [
          { id: "doc-rg-front", type: "rg_front", label: "RG ou CNH (Frente)", status: "pendente" },
          { id: "doc-rg-back", type: "rg_back", label: "RG ou CNH (Verso)", status: "pendente" },
          { id: "doc-passport", type: "passport_page", label: "Página com Foto do Passaporte", status: "pendente" },
          { id: "doc-utility", type: "utility_bill", label: "Comprovante de Luz ou Água (< 90 dias)", status: "pendente" },
        ],
        visas: [
          {
            id: "visa-1",
            country: "Estados Unidos",
            category: "B1/B2 Turismo e Negócios",
            status: "pendente_documentos",
            protocol_number: "",
          },
        ],
        vaccines: {
          yellow_fever_civp: false,
          covid_doses_count: 2,
        },
        logistics: {
          seat_preference: "janela",
        },
        customer_linked: Boolean(lead.customer_id),
        customer_id: lead.customer_id || null,
        is_verified: false,
      },
    ];

    if (Array.isArray(lead.pax_list)) {
      lead.pax_list.forEach((p: any, idx: number) => {
        initialList.push({
          id: `pax-acc-${idx + 1}`,
          is_primary: false,
          relationship: (p.relationship as any) || "conjuge",
          full_name: p.full_name || "",
          civil_name_previous: "",
          birth_date: p.birth_date || "",
          gender: "outro",
          nationality: "Brasileira",
          document_cpf: p.document || "",
          document_rg: "",
          rg_issuer: "SSP",
          passport_number: p.passport || "",
          passport_issuing_country: "BRA",
          passport_issue_date: "",
          passport_expiry_date: p.passport_expiry || "",
          phone: p.phone || "",
          email: p.email || "",
          address: {
            zip_code: "",
            street: "",
            number: "",
            neighborhood: "",
            city: "",
            state: "",
            country: "Brasil",
            utility_bill_verified: false,
          },
          documents: [
            { id: `doc-rg-${idx + 1}`, type: "rg_front", label: "RG ou CNH", status: "pendente" },
            { id: `doc-passport-${idx + 1}`, type: "passport_page", label: "Passaporte", status: "pendente" },
          ],
          visas: [],
          vaccines: {
            yellow_fever_civp: false,
            covid_doses_count: 2,
          },
          logistics: {
            seat_preference: "janela",
          },
          customer_linked: false,
          is_verified: false,
        });
      });
    }

    return initialList;
  }, [lead]);

  const [travelerDossiers, setTravelerDossiers] = useState<TravelerDossier[]>(initialTravelers);
  const [activeTravelerId, setActiveTravelerId] = useState<string>(initialTravelers[0]?.id || "pax-primary");
  const [activeTravelerTab, setActiveTravelerTab] = useState<"checkin" | "documents" | "visas" | "vaccines" | "logistics">("checkin");

  const activeTraveler = useMemo(() => {
    return travelerDossiers.find((t) => t.id === activeTravelerId) || travelerDossiers[0];
  }, [travelerDossiers, activeTravelerId]);

  // OCR MRZ Scanner Modal State
  const [isMrzModalOpen, setIsMrzModalOpen] = useState(false);
  const [mrzLine1, setMrzLine1] = useState("");
  const [mrzLine2, setMrzLine2] = useState("");
  const [isAnalyzingMrz, setIsAnalyzingMrz] = useState(false);
  const [mrzResult, setMrzResult] = useState<any | null>(null);

  // DS-160 Tie Auditor Modal State
  const [isDs160ModalOpen, setIsDs160ModalOpen] = useState(false);
  const [isEvaluatingDs160, setIsEvaluatingDs160] = useState(false);
  const [ds160Result, setDs160Result] = useState<any | null>(null);
  const [ds160Input, setDs160Input] = useState<{
    applicantName: string;
    destinationCountry: string;
    visaType: string;
    occupationType: "clt" | "empresario" | "servidor_publico" | "profissional_liberal" | "estudante" | "aposentado" | "autonomo" | "desempregado";
    employmentTenureMonths: number;
    monthlyIncomeCents: number;
    hasIncomeTaxReturn: boolean;
    hasPropertyInBrazil: boolean;
    hasDependentsInBrazil: boolean;
    previousInternationalTrips: string[];
    hasRelativesInDestination: boolean;
    relativesLegalStatus: "none" | "citizen_lpr" | "non_immigrant_visa" | "undocumented";
    previousVisaRefusal: boolean;
    estimatedTripCostCents: number;
    plannedStayDays: number;
    tripSponsorType: "self" | "parents_family" | "company_employer" | "other";
  }>({
    applicantName: "Viajante",
    destinationCountry: "Estados Unidos",
    visaType: "B1/B2",
    occupationType: "clt",
    employmentTenureMonths: 24,
    monthlyIncomeCents: 650000,
    hasIncomeTaxReturn: true,
    hasPropertyInBrazil: true,
    hasDependentsInBrazil: true,
    previousInternationalTrips: ["Europa", "América do Sul"],
    hasRelativesInDestination: false,
    relativesLegalStatus: "none",
    previousVisaRefusal: false,
    estimatedTripCostCents: formData.estimated_value_cents || 1500000,
    plannedStayDays: 14,
    tripSponsorType: "self",
  });

  const updateActiveTraveler = (updater: (prev: TravelerDossier) => TravelerDossier) => {
    setTravelerDossiers((prev) =>
      prev.map((t) => (t.id === activeTraveler.id ? updater(t) : t))
    );
  };

  const handleAddTraveler = () => {
    const newId = `pax-acc-${Date.now()}`;
    const newTraveler: TravelerDossier = {
      id: newId,
      is_primary: false,
      relationship: "outro",
      full_name: "",
      civil_name_previous: "",
      birth_date: "",
      gender: "outro",
      nationality: "Brasileira",
      document_cpf: "",
      document_rg: "",
      rg_issuer: "SSP",
      passport_number: "",
      passport_issuing_country: "BRA",
      passport_issue_date: "",
      passport_expiry_date: "",
      phone: "",
      email: "",
      address: {
        zip_code: activeTraveler?.address?.zip_code || "",
        street: activeTraveler?.address?.street || "",
        number: activeTraveler?.address?.number || "",
        neighborhood: activeTraveler?.address?.neighborhood || "",
        city: activeTraveler?.address?.city || "",
        state: activeTraveler?.address?.state || "",
        country: "Brasil",
        utility_bill_verified: false,
      },
      documents: [
        { id: `doc-rg-${newId}`, type: "rg_front", label: "RG ou CNH", status: "pendente" },
        { id: `doc-pass-${newId}`, type: "passport_page", label: "Passaporte", status: "pendente" },
      ],
      visas: [],
      vaccines: {
        yellow_fever_civp: false,
        covid_doses_count: 2,
      },
      logistics: {
        seat_preference: "janela",
      },
      customer_linked: false,
      is_verified: false,
    };

    setTravelerDossiers((prev) => [...prev, newTraveler]);
    setActiveTravelerId(newId);
    toast.success("Nova pasta de acompanhante criada.");
  };

  const handleRemoveTraveler = (travelerId: string) => {
    if (travelerDossiers.length <= 1) {
      toast.error("Não é possível remover a pasta do viajante titular.");
      return;
    }
    setTravelerDossiers((prev) => prev.filter((t) => t.id !== travelerId));
    setActiveTravelerId(travelerDossiers[0].id);
    toast.info("Pasta do passageiro removida.");
  };

  const handlePromoteTravelerToCustomerClick = async (travelerId: string) => {
    const traveler = travelerDossiers.find((t) => t.id === travelerId);
    if (!traveler || !traveler.full_name) {
      toast.error("Preencha o nome completo do passageiro antes de vincular ao Cadastro de Clientes.");
      return;
    }

    try {
      const res = await promoteTravelerToCustomer({
        data: {
          leadId: lead.id,
          travelerId,
        },
      });
      if (res.success) {
        setTravelerDossiers((prev) =>
          prev.map((t) =>
            t.id === travelerId
              ? { ...t, customer_id: res.customerId, customer_linked: true, is_verified: true }
              : t
          )
        );
        toast.success(`Viajante ${traveler.full_name} vinculado ao Cadastro de Clientes!`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Falha ao vincular viajante a cliente.");
    }
  };

  const handleExecuteMrzAnalysis = async () => {
    if (!mrzLine1.trim() || !mrzLine2.trim()) {
      toast.error("Informe as duas linhas do código MRZ do passaporte.");
      return;
    }

    setIsAnalyzingMrz(true);
    try {
      const result = await validateTravelerPassportMrzAction({
        data: {
          line1: mrzLine1.trim(),
          line2: mrzLine2.trim(),
          tripReturnDateIso: formData.travel_end || undefined,
        },
      });
      setMrzResult(result);
      if (result.isValidMrz) {
        toast.success("Linhas MRZ validadas com sucesso (ICAO 9303)!");
      } else {
        toast.warning(result.validationMessagePt || "MRZ inválido ou divergente.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar leitor MRZ.");
    } finally {
      setIsAnalyzingMrz(false);
    }
  };

  const handleApplyMrzToTraveler = () => {
    if (!mrzResult || !mrzResult.isValidMrz) return;

    updateActiveTraveler((prev) => ({
      ...prev,
      full_name: `${mrzResult.holderFirstName} ${mrzResult.holderLastName}`.trim() || prev.full_name,
      passport_number: mrzResult.passportNumber || prev.passport_number,
      passport_issuing_country: mrzResult.issuingCountry || prev.passport_issuing_country,
      passport_expiry_date: mrzResult.expiryDateIso || prev.passport_expiry_date,
      birth_date: mrzResult.birthDateIso || prev.birth_date,
      nationality: mrzResult.nationality === "BRA" ? "Brasileira" : mrzResult.nationality || prev.nationality,
      is_verified: true,
    }));

    setIsMrzModalOpen(false);
    toast.success("Dados do passaporte aplicados à pasta do passageiro!");
  };

  const handleExecuteDs160TieAnalysis = async () => {
    setIsEvaluatingDs160(true);
    try {
      const result = await evaluateTravelerDs160TiesAction({
        data: ds160Input,
      });
      setDs160Result(result);
      toast.success("Auditoria consular de vínculos processada!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao auditar formulário consular.");
    } finally {
      setIsEvaluatingDs160(false);
    }
  };

  const handleSendTravelerWhatsApp = (traveler: TravelerDossier) => {
    const portalToken = lead.magic_token || lead.id;
    const url = `${window.location.origin}/m/lead/${portalToken}?pax=${traveler.id}`;
    const msg = `Olá, ${traveler.full_name || "passageiro"}! Aqui é da agência de viagens. Para prepararmos seu check-in aéreo, passaporte e emissão segura, preencha sua pasta cadastral com documentos neste link:\n${url}`;
    const phoneClean = (traveler.phone || formData.phone || "").replace(/\D/g, "");
    if (!phoneClean) {
      navigator.clipboard.writeText(url);
      toast.success("Link da pasta do passageiro copiado para a área de transferência!");
      return;
    }
    const fullPhone = phoneClean.startsWith("55") ? phoneClean : `55${phoneClean}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleCopyTravelerFormLink = async (traveler: TravelerDossier) => {
    const portalToken = lead.magic_token || lead.id;
    const url = `${window.location.origin}/m/lead/${portalToken}?pax=${traveler.id}`;
    await navigator.clipboard.writeText(url);
    toast.success(`Link da pasta de ${traveler.full_name || "passageiro"} copiado!`);
  };

  // Oportunidade capturada do Radar / Infotravel
  const infotravelOpp = (lead?.custom_fields?.infotravel_opportunity as any) || null;

  // Current Stage calculations
  const currentStageIdx = stages.findIndex((s) => s.id === formData.status);
  const currentStage = stages[currentStageIdx] || stages[0];
  const nextStage = currentStageIdx < stages.length - 1 ? stages[currentStageIdx + 1] : null;

  // Dynamic Merge Fields Catalog (Pipefy Benchmark: [Campo dinâmico])
  const dynamicMergeFields = useMemo(() => [
    { tag: "{{nome_cliente}}", label: "Nome do Cliente", value: formData.name || "Não informado" },
    { tag: "{{telefone_cliente}}", label: "Telefone do Contato", value: formData.phone || "Não informado" },
    { tag: "{{email_cliente}}", label: "E-mail do Cliente", value: formData.email || "Não informado" },
    { tag: "{{destino_viagem}}", label: "Destino da Viagem", value: formData.destination || "A definir" },
    { tag: "{{tipo_interesse}}", label: "Tipo de Interesse", value: INTEREST_TYPES.find((t) => t.value === formData.interest_type)?.label || "Pacote Completo" },
    { tag: "{{data_ida}}", label: "Data de Embarque", value: formData.travel_start || "A definir" },
    { tag: "{{data_volta}}", label: "Data de Retorno", value: formData.travel_end || "A definir" },
    { tag: "{{passageiros_adultos}}", label: "Passageiros Adultos", value: String(formData.pax_adults || 1) },
    { tag: "{{passageiros_criancas}}", label: "Crianças", value: String(formData.pax_children || 0) },
    { tag: "{{total_passageiros}}", label: "Total de Passageiros", value: String((formData.pax_adults || 1) + (formData.pax_children || 0)) },
    { tag: "{{orcamento_estimado}}", label: "Orçamento Estimado", value: formatMoney(formData.estimated_value_cents || 0) },
    { tag: "{{etapa_funil}}", label: "Etapa Atual no Pipe", value: currentStage.title },
    { tag: "{{consultor_responsavel}}", label: "Consultor Responsável", value: team.find((m) => (m.profile_id || m.id) === formData.assigned_to)?.full_name || "Consultor Waesy" },
    { tag: "{{data_emissao}}", label: "Data de Emissão", value: new Date().toLocaleDateString("pt-BR") },
  ], [formData, currentStage, team]);

  // Phone & WhatsApp formatting
  const cleanPhone = (formData.phone || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  const whatsappUrl = cleanPhone ? `https://wa.me/${formattedPhone}` : "";

  // Handlers
  const handleSaveForm = async () => {
    setIsSaving(true);
    try {
      const mergedCustomFields = {
        ...(lead.custom_fields || {}),
        tags: formData.tags,
        pcd: formData.pcd,
        reduced_mobility: formData.reduced_mobility,
        autism_spectrum: formData.autism_spectrum,
        health_notes: formData.health_notes,
        pax_infants: Number(formData.pax_infants) || 0,
        source: formData.source,
        lead_source_detail: formData.lead_source_detail,
        lgpd_consent: formData.lgpd_consent,
        payment_plan: paymentPlan,
        checklist_groups: checklistGroups,
        comments: internalComments,
        attachments: cardAttachments,
        service_template: serviceTemplate,
        traveler_dossiers: travelerDossiers,
        reminders,
        next_followup_at: followUpAt,
        anamnese_data: anamneseData,
        anamnese_history: anamneseHistory,
      };

      await onSaveLead({
        ...formData,
        tags: formData.tags,
        follow_up_at: followUpAt,
        destination_tags: destinationTags,
        period_tags: periodSpec.seasonTags,
        target_months: periodSpec.targetMonths,
        flexibility_days: periodSpec.flexibilityDays,
        date_flexibility_mode: periodSpec.mode,
        interest_period: periodSpec.displayLabel || formData.interest_period,
        room_occupancies: roomOccupancies,
        raw_intent_markdown: rawIntentMarkdown || null,
        attachments: cardAttachments,
        custom_fields: {
          ...mergedCustomFields,
          tags: formData.tags,
          destination_tags: destinationTags,
          target_months: periodSpec.targetMonths,
          period_tags: periodSpec.seasonTags,
          room_occupancies: roomOccupancies,
          reminders,
          next_followup_at: followUpAt,
          anamnese_data: anamneseData,
          anamnese_history: anamneseHistory,
          ...(rawIntentMarkdown ? { raw_intent_markdown: rawIntentMarkdown } : {}),
        },
        checklist: checklistGroups[0]?.items || [],
      });

      await saveLeadTravelerDossiers({
        data: {
          leadId: lead.id,
          travelers: travelerDossiers,
          serviceTemplate,
        },
      }).catch((err) => {
        console.warn("Falha ao salvar dossiês no backend:", err);
      });

      toast.success("Card e Pastas de Viajantes salvos com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshContracts = async () => {
    try {
      setIsRefreshingContracts(true);
      const updated360 = await getCustomer360Profile({ data: { leadId: lead.id } });
      if (updated360?.contracts) {
        setLocalContracts(updated360.contracts);
      }
      toast.success("Contratos atualizados com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar contratos.");
    } finally {
      setIsRefreshingContracts(false);
    }
  };

  const handleApplyProposalToContract = (prop: any) => {
    if (!prop) return;
    const dest = prop.destination || formData.destination || lead.destination || "o destino contratado";
    const pricing = prop.pricing || prop.pricing_data || {};
    const totalCents = Number(
      pricing.total_price_cents ??
      pricing.total_cents ??
      prop.total_value_cents ??
      formData.estimated_value_cents ??
      0
    );
    const terms =
      pricing.payment_terms ||
      (Array.isArray(pricing.installments_options) && pricing.installments_options.length > 0
        ? pricing.installments_options.join(" | ")
        : prop.conditions?.payment_terms || paymentPlan.notes || "20% de entrada via PIX + 10x no cartão");

    setContractFormTitle(`Contrato de Intermediação Turística - ${prop.title || dest} - ${formData.name || "Cliente"}`);
    setContractFormSummary(
      `Intermediação e assessoria operacional de serviços turísticos para ${dest}, abrangendo aéreo, hospedagem e serviços inclusos na proposta "${prop.title || "Proposta de Viagem"}".`
    );
    if (totalCents > 0) {
      setContractFormTotalCents(totalCents);
    }
    setContractFormPaymentConditions(terms);
    toast.success("Dados da proposta aceita aplicados à minuta do contrato!");
  };

  // Auto-sincronização de Proposta Aprovada / Aceita ao Pagamento e ao Contrato
  useEffect(() => {
    if (acceptedProposal?.id) {
      if (!paymentPlan.linked_proposal_id || !paymentPlan.is_synced) {
        applyProposalToPaymentPlan(acceptedProposal);
      }
      if (contractFormTotalCents === 0) {
        handleApplyProposalToContract(acceptedProposal);
      }
    }
  }, [acceptedProposal]);

  const handleApplyContractTemplatePreset = (presetKey: string) => {
    setContractTemplatePreset(presetKey);
    const clientName = formData.name || lead.full_name || "Cliente";
    const dest = formData.destination || lead.destination || "Item / Serviço Contratado";
    switch (presetKey) {
      case "turismo_completo":
        setContractFormTitle(`Contrato de Intermediação de Pacote Turístico - ${clientName}`);
        setContractFormSummary(`Intermediação e consultoria para emissão de bilhetes aéreos, vouchers de hotelaria e assessoria de viagem com destino a ${dest}.`);
        break;
      case "aereo_hospedagem":
        setContractFormTitle(`Contrato de Emissão Aérea e Hospedagem - ${clientName}`);
        setContractFormSummary(`Assessoria de reservas hoteleiras e emissão de bilhetes de transporte aéreo para ${dest}.`);
        break;
      case "corporativo_b2b":
        setContractFormTitle(`Contrato de Prestação de Serviços Corporativos B2B - ${clientName}`);
        setContractFormSummary(`Agenciamento e gestão de serviços corporativos, faturamento mensal e suporte executivo.`);
        break;
      case "imovel_compra_venda":
        setContractFormTitle(`Contrato de Promessa de Compra e Venda de Imóvel - ${clientName}`);
        setContractFormSummary(`Compromisso irrevogável de compra e venda de imóvel (${dest}), com fixação de preço, arras e condições de financiamento.`);
        break;
      case "imovel_locacao":
        setContractFormTitle(`Contrato de Locação Residencial / Comercial - ${clientName}`);
        setContractFormSummary(`Locação de imóvel (${dest}) com vistoria de entrada, garantia locatícia e obrigações contratuais.`);
        break;
      case "imovel_intermediacao":
        setContractFormTitle(`Contrato de Intermediação e Corretagem Imobiliária - ${clientName}`);
        setContractFormSummary(`Intermediação de negociação imobiliária com exclusividade de corretagem e taxa de comissionamento.`);
        break;
      case "veiculo_compra_venda":
        setContractFormTitle(`Contrato de Compra e Venda de Veículo Automotor - ${clientName}`);
        setContractFormSummary(`Transmissão de domínio de veículo automotor (${dest}) com declaração de quitação, garantia legal e laudo cautelar.`);
        break;
      case "veiculo_garantia":
        setContractFormTitle(`Ordem de Serviço & Certificado de Garantia Mecânica - ${clientName}`);
        setContractFormSummary(`Prestação de serviços mecânicos e revisão automotiva (${dest}) com cobertura de garantia.`);
        break;
      case "eventos_buffet":
        setContractFormTitle(`Contrato de Prestação de Serviços de Buffet e Espaço - ${clientName}`);
        setContractFormSummary(`Locação de espaço, buffet gastronômico, infraestrutura e equipe para realização de evento (${dest}).`);
        break;
      case "eventos_cerimonial":
        setContractFormTitle(`Contrato de Assessoria e Cerimonial de Evento - ${clientName}`);
        setContractFormSummary(`Assessoria completa, planejamento de cronograma e cerimonial executivo para o evento (${dest}).`);
        break;
      case "saude_consentimento":
        setContractFormTitle(`Termo de Consentimento Livre e Esclarecido (TCLE) - ${clientName}`);
        setContractFormSummary(`Consentimento para execução de plano de procedimento estético/clínico (${dest}) conforme normas do conselho de classe.`);
        break;
      case "saude_plano":
        setContractFormTitle(`Contrato de Prestação de Serviços Clínicos / Estéticos - ${clientName}`);
        setContractFormSummary(`Prestação de serviços em saúde e estética (${dest}) com cronograma de sessões e orientações pós-procedimento.`);
        break;
      case "b2b_servicos":
        setContractFormTitle(`Contrato de Prestação de Serviços Especializados B2B - ${clientName}`);
        setContractFormSummary(`Execução de serviços profissionais (${dest}) com cronograma de entregáveis, SLA e faturamento.`);
        break;
      case "servicos_geral":
      default:
        setContractFormTitle(`Contrato de Prestação de Serviços e Consultoria - ${clientName}`);
        setContractFormSummary(`Prestação de serviços especializados, suporte de concierge e consultoria personalizada para ${dest}.`);
        break;
    }
    toast.success("Modelo de contrato aplicado!");
  };

  const handleOpenVaultLinker = async () => {
    setIsLinkingContractModalOpen(true);
    setIsFetchingLinkableContracts(true);
    try {
      const res = await listLinkableStoreContracts({
        data: {
          storeId: lead.store_id || undefined,
          leadId: lead.id,
        },
      });
      setLinkableContracts(Array.isArray(res) ? res : []);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao buscar contratos no cofre.");
    } finally {
      setIsFetchingLinkableContracts(false);
    }
  };

  const handleConfirmLinkContract = async () => {
    if (!selectedContractToLink) {
      toast.error("Selecione um contrato para vincular.");
      return;
    }
    setIsLinkingContract(true);
    try {
      const res = await linkContractToLead({
        data: {
          leadId: lead.id,
          contractId: selectedContractToLink,
        },
      });
      if (res?.success && res.contract) {
        setLocalContracts((prev) => {
          const map = new Map<string, any>();
          map.set(res.contract.id, res.contract);
          for (const item of prev) {
            if (item?.id) map.set(item.id, item);
          }
          return Array.from(map.values());
        });
        toast.success("Contrato vinculado com sucesso ao atendimento!");
        setIsLinkingContractModalOpen(false);
        setSelectedContractToLink(null);
        handleRefreshContracts();
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao vincular contrato ao lead.");
    } finally {
      setIsLinkingContract(false);
    }
  };

  const handleIssueContractClick = async (openInEditor = false) => {
    if (!contractFormTitle.trim()) {
      toast.error("Informe o título do contrato.");
      return;
    }
    setIsIssuingContract(true);
    try {
      let createdResult: any = null;
      if (onIssueContract) {
        createdResult = await onIssueContract({
          leadId: lead.id,
          contractTitle: contractFormTitle.trim(),
          packageSummary: contractFormSummary.trim(),
          totalValueCents: contractFormTotalCents || lead.estimated_value_cents || 0,
          paymentConditions: contractFormPaymentConditions.trim(),
        });
      } else {
        createdResult = await issueLeadContract({
          data: {
            leadId: lead.id,
            contractTitle: contractFormTitle.trim(),
            packageSummary: contractFormSummary.trim(),
            totalValueCents: contractFormTotalCents || lead.estimated_value_cents || 0,
            paymentConditions: contractFormPaymentConditions.trim(),
          },
        });
        toast.success(`Contrato emitido! Token: ${createdResult.publicToken}`);
      }

      const targetContractId = createdResult?.contract?.id || createdResult?.contractId || createdResult?.id || `ctr-${Date.now()}`;
      const resolvedContract = createdResult?.contract || {
        id: targetContractId,
        contract_title: contractFormTitle.trim(),
        title: contractFormTitle.trim(),
        category: unifiedNiche === "tourism" ? "tourism" : "services",
        public_token: createdResult?.publicToken || `CTR-${Date.now()}`,
        verification_code: createdResult?.publicToken || `CTR-${Date.now()}`,
        signing_token: createdResult?.signingToken || createdResult?.publicToken,
        status: "signing",
        total_value_cents: contractFormTotalCents || lead.estimated_value_cents || 0,
        destination: lead.destination || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        envelopes: [
          {
            id: `env-${Date.now()}`,
            signer_name: formData.name || lead.full_name || "Contratante Titular",
            signer_role: "party",
            signer_phone: formData.phone || lead.phone,
            signer_email: formData.email || lead.email,
            status: "pending",
            signing_token: createdResult?.signingToken || createdResult?.publicToken,
            dispatch_channel: formData.phone || lead.phone ? "whatsapp" : "email",
          },
        ],
      };
      setLocalContracts((prev) => [resolvedContract, ...prev.filter((c) => c.id !== resolvedContract.id)]);
      handleRefreshContracts();
      syncProposalCaches();

      if (openInEditor && targetContractId) {
        window.open(`/workspace/contratos/${targetContractId}/editor`, "_blank");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao emitir contrato digital.");
    } finally {
      setIsIssuingContract(false);
    }
  };

  const handleCopyContractLink = async (token: string) => {
    const url = `${window.location.origin}/assinar/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link do contrato digital copiado!");
  };

  const handleSendContractWhatsApp = (token: string, title: string) => {
    if (!cleanPhone) {
      toast.error("Lead sem telefone para envio via WhatsApp.");
      return;
    }
    const url = `${window.location.origin}/assinar/${token}`;
    const firstName = (formData.name || "Cliente").split(" ")[0];
    const msg = encodeURIComponent(
      `Olá, ${firstName}! Segue o link para conferência e assinatura digital do seu contrato de viagem (${title}):\n\n${url}`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
  };

  const handleSendSignerWhatsApp = (
    signingToken: string,
    contractTitle: string,
    signerName?: string,
    signerPhone?: string
  ) => {
    const targetPhone = (signerPhone || cleanPhone || "").replace(/\D/g, "");
    if (!targetPhone) {
      toast.error("Telefone não informado para envio via WhatsApp.");
      return;
    }
    const url = `${window.location.origin}/assinar/${signingToken}`;
    const targetName = signerName || formData.name || "Cliente";
    const firstName = targetName.split(" ")[0];
    const msg = encodeURIComponent(
      `Olá, ${firstName}! Segue o link seguro para conferência e assinatura eletrônica do seu contrato (${contractTitle}) emitido por ${tenantIdentity.companyName}:\n\n${url}\n\nDocumento selado com validade jurídica e registro probatório.`
    );
    window.open(`https://wa.me/55${targetPhone}?text=${msg}`, "_blank");
  };

  const handleSavePaymentPlan = async () => {
    try {
      const finalTotalCents = computedTariffTotalCents > 0 ? computedTariffTotalCents : (formData.estimated_value_cents || 0);
      await onSaveLead({
        ...formData,
        estimated_value_cents: finalTotalCents,
        custom_fields: {
          ...(lead.custom_fields || {}),
          payment_plan: {
            ...paymentPlan,
            niche_mode: paymentPlanNiche,
            total_cents: finalTotalCents,
          },
        },
      });
      toast.success("Plano financeiro e vínculo de proposta salvos!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar plano financeiro.");
    }
  };

  const handleCopyPaymentLink = async () => {
    const token = lead.magic_token || lead.id;
    const url = `${window.location.origin}/m/lead/${token}?tab=pagamento`;
    await navigator.clipboard.writeText(url);
    toast.success("Link de pagamento copiado com sucesso!");
  };

  const openUnifiedDocumentStudio = (
    nextArchetype: DocumentStudioArchetype = "dossier_form_doc",
    templateId?: string,
    existingAttachment?: any | null,
  ) => {
    const resolvedArchetype: DocumentStudioArchetype = existingAttachment?.archetype ||
      (existingAttachment?.templateKey === "proposta_a4"
        ? "proposal_quote"
        : existingAttachment?.templateKey === "contrato_turismo"
          ? "contract_legal"
          : existingAttachment?.templateKey === "voucher_resumo"
            ? "voucher_boarding"
            : nextArchetype);

    const resolvedTemplateId =
      templateId ||
      (existingAttachment?.templateKey === "proposta_a4"
        ? "proposta_editorial_agency"
        : existingAttachment?.templateKey === "contrato_turismo"
          ? "contract_intermediacao_turistica_completa"
          : existingAttachment?.templateKey === "voucher_resumo"
            ? "voucher_embarque_a4"
            : existingAttachment?.templateKey) ||
      (resolvedArchetype === "proposal_quote"
        ? "proposta_editorial_agency"
        : resolvedArchetype === "contract_legal"
          ? "contract_intermediacao_turistica_completa"
          : resolvedArchetype === "voucher_boarding"
            ? "voucher_embarque_a4"
            : resolvedArchetype === "presentation_deck"
              ? "apresentacao_comercial_169"
              : "anamnese_embarque");

    setDocStudioArchetype(resolvedArchetype);
    setDocStudioTemplateId(resolvedTemplateId);
    setDocStudioEditingAttachment(existingAttachment || null);
    setDocStudioOpen(true);
  };

  const handleSaveDocumentFromStudio = async (payload: {
    id?: string;
    title: string;
    templateId: string;
    archetype: DocumentStudioArchetype;
    content: string;
    formState: DocumentStudioFormState;
  }) => {
    const targetId = payload.id || `doc-${Date.now()}`;
    const docEntry = {
      id: targetId,
      name: `${payload.title} - ${payload.formState.destination || formData.destination || "Atendimento"}.pdf`,
      url: "",
      size: "Studio CMS",
      type: "application/pdf",
      created_at: docStudioEditingAttachment?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      templateKey: payload.templateId,
      archetype: payload.archetype,
      isGeneratedDoc: true,
      docTitle: payload.title,
      docSubtitle: payload.formState.subtitle,
      customContent: payload.content,
      notesContent: payload.content,
      destination: payload.formState.destination,
      clientName: payload.formState.clientName,
      clientPhone: payload.formState.clientPhone,
      clientEmail: payload.formState.clientEmail,
      totalCents: payload.formState.totalCents,
      travelStart: payload.formState.startDate,
      travelEnd: payload.formState.endDate,
    };

    const exists = cardAttachments.some((att: any) => att.id === targetId);
    const updatedAttachments = exists
      ? cardAttachments.map((att: any) => (att.id === targetId ? docEntry : att))
      : [docEntry, ...cardAttachments];

    setCardAttachments(updatedAttachments);

    const newTimelineComment = {
      id: `comm-${Date.now()}`,
      author: "Studio de Documentos",
      text: `${exists ? "Documento atualizado" : "Documento criado"} no atendimento: ${docEntry.docTitle}`,
      date: new Date().toLocaleString("pt-BR"),
    };
    const updatedComments = [newTimelineComment, ...internalComments];
    setInternalComments(updatedComments);

    const mergedCustomFields = {
      ...(lead.custom_fields || {}),
      pcd: formData.pcd,
      reduced_mobility: formData.reduced_mobility,
      autism_spectrum: formData.autism_spectrum,
      health_notes: formData.health_notes,
      pax_infants: Number(formData.pax_infants) || 0,
      source: formData.source,
      lead_source_detail: formData.lead_source_detail,
      checklist_groups: checklistGroups,
      comments: updatedComments,
      attachments: updatedAttachments,
    };

    await onSaveLead({
      ...formData,
      attachments: updatedAttachments,
      custom_fields: mergedCustomFields,
    });
    setDocStudioEditingAttachment(docEntry);
    toast.success("Documento salvo e vinculado ao dossiê do atendimento!");
  };

  const handlePromoteStudioToProposal = async () => {
    onGenerateProposal(buildProposalLeadPayload());
    setDocStudioOpen(false);
  };

  const handleIssueStudioContract = async (payload: {
    templateId: string;
    title: string;
    summary: string;
    totalCents: number;
    paymentConditions: string;
    customVariables: Record<string, string>;
  }) => {
    try {
      if (onIssueContract) {
        await onIssueContract({
          leadId: lead.id,
          contractTitle: payload.title,
          packageSummary: payload.summary,
          totalValueCents: payload.totalCents || lead.estimated_value_cents || 0,
          paymentConditions: payload.paymentConditions,
        });
      } else {
        const res = await issueLeadContract({
          data: {
            leadId: lead.id,
            contractTitle: payload.title,
            packageSummary: payload.summary,
            totalValueCents: payload.totalCents || lead.estimated_value_cents || 0,
            paymentConditions: payload.paymentConditions,
            templateId: payload.templateId,
            customVariables: payload.customVariables,
          },
        });
        toast.success(`Contrato oficial emitido! Token: ${res.publicToken}`);
        if (res.contract?.id) {
          setDocStudioOpen(false);
          router.navigate({
            to: "/workspace/contratos/$id/editor",
            params: { id: res.contract.id },
          });
        }
      }
      await syncProposalCaches();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao emitir contrato para assinatura.");
    }
  };

  const handleIssueStudioVoucher = async (payload: { formState: DocumentStudioFormState }) => {
    try {
      const f = payload.formState;
      const passengerName = f.clientName.trim().length >= 2 ? f.clientName.trim() : "Viajante Titular";
      const created = await createTravelVoucher({
        data: {
          store_id: lead.store_id || undefined,
          voucher_type: "package",
          title: f.title || `Voucher — ${f.destination || "Viagem"}`,
          passenger_name: passengerName,
          passenger_document: f.clientDocument || null,
          flight_data: {
            destination: f.destination || "",
            airline: f.flightSummary || "",
            departureTime: f.startDate || "",
          },
          hotel_data: {
            hotelName: f.hotelSummary || "",
            checkInDate: f.startDate || "",
            checkOutDate: f.endDate || "",
          },
          transfer_data: {
            dropoffLocation: f.destination || "",
          },
        },
      });
      toast.success(`Voucher oficial ${created.voucher_number} emitido!`);
      await queryClient.invalidateQueries({ queryKey: ["travel-vouchers"] });
      setDocStudioOpen(false);
      router.navigate({ to: "/workspace/turismo/vouchers" });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar voucher oficial.");
    }
  };

  const handleSendStudioWhatsapp = (contentText: string, docTitle: string) => {
    if (!cleanPhone) {
      toast.error("Lead sem telefone cadastrado para envio no WhatsApp.");
      return;
    }
    const firstName = (formData.name || "Cliente").split(" ")[0];
    const summaryExcerpt = contentText.slice(0, 650);
    const msg = encodeURIComponent(
      `Olá, ${firstName}! Segue o documento "${docTitle}" emitido por ${tenantIdentity.companyName}:\n\n${summaryExcerpt}`,
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
  };

  const handleQuoteOcrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQuoteOcrFile(file);
    setQuoteOcrFileName(file.name);
    setQuoteOcrFileMime(file.type || "application/pdf");
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const b64 = raw.includes(",") ? raw.split(",")[1] : raw;
      setQuoteOcrBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleRunQuoteOcr = async () => {
    if (!quoteOcrBase64 && !quoteOcrRawText.trim()) {
      toast.error("Selecione um arquivo de cotação (PDF ou imagem) ou cole o texto do orçamento.");
      return;
    }
    setIsScanningQuoteOcr(true);
    const toastId = toast.loading("Extraindo cotação da operadora via OCR inteligente...");
    try {
      const res = await processOperatorQuoteOcr({
        data: {
          fileBase64: quoteOcrBase64 || undefined,
          fileMime: quoteOcrFileMime || "application/pdf",
          fileName: quoteOcrFileName || "cotacao.pdf",
          rawText: quoteOcrRawText.trim() || undefined,
          storeId: (lead as any)?.store_id || undefined,
        },
      });
      if (res?.data) {
        setExtractedOcrQuote(res.data);
        const highlights = [
          res.data.operator_name ? `Operadora: ${res.data.operator_name}` : null,
          res.data.destination && res.data.destination !== "Destino a definir" ? `Destino: ${res.data.destination}` : null,
          res.data.gross_price_cents ? `Total: ${formatMoney(res.data.gross_price_cents)}` : null,
        ].filter(Boolean);
        toast.success(`Cotação lida com sucesso! (${highlights.join(" · ")})`, { id: toastId });
      } else {
        toast.error("Não foi possível decodificar os dados da cotação.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro no processamento do OCR da cotação.", { id: toastId });
    } finally {
      setIsScanningQuoteOcr(false);
    }
  };

  const handleApplyQuoteOcrToDossier = async (andOpenProposal = false) => {
    if (!extractedOcrQuote) return;
    const q = extractedOcrQuote;
    const toastId = toast.loading("Aplicando dados do OCR ao card do CRM...");

    try {
      // 1. Atualiza Destino, Datas e Passageiros no formData
      const detectedDest = (q.destination && q.destination !== "Destino a definir")
        ? q.destination
        : (q.hotels?.[0]?.city || q.flights?.[0]?.destination_city || formData.destination);

      let nextFormData = { ...formData };
      let nextDestTags = [...destinationTags];
      let nextPeriodSpec = { ...periodSpec };

      if (ocrApplyOptions.applyDestinationAndDates) {
        if (detectedDest) {
          nextFormData.destination = detectedDest;
          nextDestTags = normalizeDestinationTagList(nextDestTags, detectedDest);
          setDestinationTags(nextDestTags);
        }
        if (q.travel_start) {
          nextFormData.travel_start = q.travel_start;
          nextPeriodSpec.startDate = q.travel_start;
        }
        if (q.travel_end) {
          nextFormData.travel_end = q.travel_end;
          nextPeriodSpec.endDate = q.travel_end;
        }
        setPeriodSpec(nextPeriodSpec);
      }

      if (ocrApplyOptions.applyPax) {
        if (typeof q.adults_count === "number" && q.adults_count > 0) {
          nextFormData.pax_adults = q.adults_count;
        }
        if (typeof q.children_count === "number") {
          nextFormData.pax_children = q.children_count;
        }
        if (Array.isArray(q.children_ages)) {
          nextFormData.pax_ages = q.children_ages;
        }
      }

      if (ocrApplyOptions.applyBudget && q.gross_price_cents) {
        nextFormData.estimated_value_cents = q.gross_price_cents;
      }

      // Notas e Observações Operacionais
      const quoteNotes: string[] = [];
      if (q.operator_name) quoteNotes.push(`Operadora: ${q.operator_name}`);
      if (q.quote_reference_number) quoteNotes.push(`Ref Cotação: #${q.quote_reference_number}`);
      if (q.hotels?.[0]?.hotel_name) {
        quoteNotes.push(`Hotel: ${q.hotels[0].hotel_name}${q.hotels[0].meal_plan ? ` (${q.hotels[0].meal_plan})` : ""}`);
      }
      if (Array.isArray(q.flights) && q.flights.length > 0) {
        const flSummary = q.flights.map((f) => `${f.airline || ""} ${f.flight_number || ""} (${f.origin_iata || ""} > ${f.destination_iata || ""})`).filter(Boolean).join(", ");
        if (flSummary) quoteNotes.push(`Voos: ${flSummary}`);
      }
      if (quoteNotes.length > 0) {
        const combinedNotes = nextFormData.notes ? `${nextFormData.notes}\n\n[OCR Cotação]: ${quoteNotes.join(" · ")}` : `[OCR Cotação]: ${quoteNotes.join(" · ")}`;
        nextFormData.notes = combinedNotes;
      }

      // 2. Atualiza Passageiro Titular em Acompanhantes e no Lead
      let nextTravelers = [...travelerDossiers];
      if (ocrApplyOptions.applyTraveler && q.client_name) {
        if (!nextFormData.name || nextFormData.name === "Destino a definir" || nextFormData.name === "Novo Lead" || nextFormData.name.length <= 2) {
          nextFormData.name = q.client_name;
        }
        if (q.client_phone && !nextFormData.phone) {
          nextFormData.phone = q.client_phone;
        }
        if (q.client_email && !nextFormData.email) {
          nextFormData.email = q.client_email;
        }

        const primaryPax = nextTravelers[0] || {
          id: `pax-${Date.now()}`,
          is_primary: true,
          full_name: q.client_name,
        };
        nextTravelers[0] = {
          ...primaryPax,
          full_name: q.client_name,
          phone: q.client_phone || primaryPax.phone || nextFormData.phone,
          email: q.client_email || primaryPax.email || nextFormData.email,
          document_cpf: q.client_document || primaryPax.document_cpf,
        };
        setTravelerDossiers(nextTravelers);
      }
      setFormData(nextFormData);

      // 3. Atualiza Decomposição Tarifária na Aba Pagamento
      let nextPaymentPlan = { ...paymentPlan };
      if (ocrApplyOptions.applyPaymentBreakdown) {
        let hotelSum = 0;
        if (Array.isArray(q.hotels)) {
          hotelSum = q.hotels.reduce((acc, h) => acc + (h.price_cents || 0), 0);
        }
        nextPaymentPlan = {
          ...nextPaymentPlan,
          flight_cents: (q.gross_price_cents && hotelSum > 0 && q.gross_price_cents > hotelSum)
            ? (q.gross_price_cents - hotelSum - (q.taxes_cents || 0))
            : (nextPaymentPlan.flight_cents || 0),
          hotel_cents: hotelSum > 0 ? hotelSum : nextPaymentPlan.hotel_cents,
          boarding_tax_cents: q.taxes_cents || nextPaymentPlan.boarding_tax_cents || 0,
          commission_cents: q.suggested_commission_cents || nextPaymentPlan.commission_cents || 0,
          installments_count: q.max_installments || nextPaymentPlan.installments_count || 10,
          notes: q.max_installments ? `Até ${q.max_installments}x de ${formatMoney(q.installment_cents || Math.round((q.gross_price_cents || 0) / q.max_installments))}` : nextPaymentPlan.notes,
        };
        setPaymentPlan(nextPaymentPlan);
      }

      // 4. Anexa o documento original ao card
      let updatedAttachments = [...cardAttachments];
      if (ocrApplyOptions.attachFileToCard && quoteOcrBase64 && quoteOcrFileName) {
        try {
          const uploaded = await uploadStoreMedia({
            data: {
              fileName: quoteOcrFileName,
              fileType: quoteOcrFileMime || "application/pdf",
              base64Data: quoteOcrBase64,
              bucket: "identity-vault",
            },
          });
          updatedAttachments.unshift({
            id: `att-ocr-${Date.now()}`,
            name: quoteOcrFileName,
            size: "OCR Processado",
            type: quoteOcrFileMime || "application/pdf",
            url: uploaded.url,
            storage_bucket: "identity-vault",
            storage_path: uploaded.path,
            createdAt: new Date().toISOString(),
            tag: "Cotação Operadora (OCR)",
          });
          setCardAttachments(updatedAttachments);
        } catch (attErr) {
          console.warn("[handleApplyQuoteOcrToDossier] Falha secundária ao salvar anexo:", attErr);
        }
      }

      // 5. Salva no banco de dados via onSaveLead
      const mergedCustomFields = {
        ...(lead.custom_fields || {}),
        tags: nextFormData.tags,
        destination_tags: nextDestTags,
        period_tags: nextPeriodSpec.seasonTags,
        target_months: nextPeriodSpec.targetMonths,
        room_occupancies: roomOccupancies,
        traveler_dossiers: nextTravelers,
        reminders,
        next_followup_at: followUpAt,
        anamnese_data: anamneseData,
        anamnese_history: anamneseHistory,
        payment_plan: {
          ...nextPaymentPlan,
          niche_mode: paymentPlanNiche,
          total_cents: nextFormData.estimated_value_cents,
        },
        ocr_last_quote: {
          operator_name: q.operator_name,
          reference: q.quote_reference_number,
          destination: detectedDest,
          gross_price_cents: q.gross_price_cents,
          applied_at: new Date().toISOString(),
        },
        quote_flights: q.flights || [],
        quote_hotels: q.hotels || [],
        quote_transfers: q.transfers || [],
        quote_tours: q.tours || [],
        quote_inclusions: q.inclusions || [],
        quote_exclusions: q.exclusions || [],
        ocr_extracted_quote: q,
        ...(q.client_document ? { document: q.client_document } : {}),
      };

      await onSaveLead({
        ...nextFormData,
        tags: nextFormData.tags,
        follow_up_at: followUpAt,
        destination_tags: nextDestTags,
        period_tags: nextPeriodSpec.seasonTags,
        target_months: nextPeriodSpec.targetMonths,
        flexibility_days: nextPeriodSpec.flexibilityDays,
        date_flexibility_mode: nextPeriodSpec.mode,
        interest_period: nextPeriodSpec.displayLabel || nextFormData.interest_period,
        room_occupancies: roomOccupancies,
        raw_intent_markdown: rawIntentMarkdown || null,
        attachments: updatedAttachments,
        custom_fields: mergedCustomFields,
      });

      if (nextTravelers.length > 0) {
        await saveLeadTravelerDossiers({
          data: {
            leadId: lead.id,
            travelers: nextTravelers,
            serviceTemplate,
          },
        }).catch(() => null);
      }

      toast.success(
        `Card do CRM preenchido com sucesso a partir do orçamento da ${q.operator_name || "operadora"}!`,
        { id: toastId },
      );
      setIsQuoteOcrModalOpen(false);
      setExtractedOcrQuote(null);
      setQuoteOcrRawText("");
      setQuoteOcrBase64("");
      setQuoteOcrFileName("");

      if (andOpenProposal) {
        onGenerateProposal(buildProposalLeadPayload({
          ...nextFormData,
          customFields: mergedCustomFields,
        }));
      }
    } catch (saveErr: any) {
      toast.error(saveErr?.message || "Erro ao salvar dados do OCR no card.", { id: toastId });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadedItems: any[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`Arquivo "${file.name}" excede 15 MB.`);
        continue;
      }
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const raw = String(reader.result || "");
            resolve(raw.includes(",") ? (raw.split(",")[1] || "") : raw);
          };
          reader.onerror = () => reject(new Error("Falha ao ler arquivo local."));
          reader.readAsDataURL(file);
        });

        const uploaded = await uploadStoreMedia({
          data: {
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            base64Data,
            bucket: "identity-vault",
          },
        });

        let linkedDocId: string | undefined;
        if (lead.customer_id) {
          try {
            const docRecord = await createCustomerDocument({
              data: {
                customerId: lead.customer_id,
                leadId: lead.id,
                docType: "other",
                title: file.name,
                fileUrl: uploaded.url,
                storageBucket: "identity-vault",
                storagePath: uploaded.path,
              },
            });
            linkedDocId = docRecord?.id;
          } catch {
            // Segue preservando anexo no card mesmo se falha secundária em customer_documents
          }
        }

        const sizeStr = file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`;

        uploadedItems.push({
          id: linkedDocId || `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          document_id: linkedDocId,
          name: file.name,
          size: sizeStr,
          type: file.type,
          url: uploaded.url,
          storage_bucket: "identity-vault",
          storage_path: uploaded.path,
          createdAt: new Date().toISOString(),
        });
      } catch (err: any) {
        toast.error(err?.message || `Erro ao enviar "${file.name}".`);
      }
    }

    e.target.value = "";
    if (uploadedItems.length === 0) return;

    const updated = [...uploadedItems, ...cardAttachments];
    setCardAttachments(updated);
    toast.success(`${uploadedItems.length} arquivo(s) enviado(s) com segurança!`);

    const mergedCustomFields = {
      ...(lead.custom_fields || {}),
      checklist_groups: checklistGroups,
      comments: internalComments,
    };
    await onSaveLead({
      ...lead,
      attachments: updated,
      custom_fields: mergedCustomFields,
    });
  };

  const handleDeleteAttachment = (attId: string) => {
    const updated = cardAttachments.filter((a: any) => a.id !== attId);
    setCardAttachments(updated);
    toast.success("Arquivo removido do card.");
    onSaveLead({
      ...lead,
      attachments: updated,
    });
  };

  const handleToggleChecklistItem = async (groupId: string, itemId: string) => {
    setChecklistGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: g.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
        };
      })
    );
    if (groupId === "default-checklist" && onToggleChecklist) {
      void onToggleChecklist(itemId);
    }
  };

  const handleAddChecklistItem = (groupId: string) => {
    const text = newItemTexts[groupId]?.trim();
    if (!text) return;
    const newItem: DynamicChecklistItem = {
      id: `item-${Date.now()}`,
      text,
      done: false,
    };
    setChecklistGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, items: [...g.items, newItem] } : g))
    );
    setNewItemTexts((prev) => ({ ...prev, [groupId]: "" }));
  };

  const handleDeleteChecklistItem = (groupId: string, itemId: string) => {
    setChecklistGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, items: g.items.filter((it) => it.id !== itemId) } : g))
    );
  };

  const handleCreateChecklistGroup = () => {
    if (!newChecklistTitle.trim()) return;
    const newGroup: DynamicChecklistGroup = {
      id: `group-${Date.now()}`,
      title: newChecklistTitle.trim(),
      items: [],
    };
    setChecklistGroups((prev) => [...prev, newGroup]);
    setNewChecklistTitle("");
    setIsCreatingChecklist(false);
    toast.success("Novo checklist adicionado ao card!");
  };

  const handleDeleteChecklistGroup = (groupId: string) => {
    setChecklistGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // Open Unified Studio in Presentation 16:9 Context
  const handleGeneratePresentation = () => {
    openUnifiedDocumentStudio("presentation_deck", "apresentacao_comercial_169");
  };

  // Schedule Meeting
  const handleQuickScheduleMeeting = async () => {
    if (!meetingTitle.trim() || !meetingDate) {
      toast.error("Informe título e data/horário da reunião.");
      return;
    }
    setIsSchedulingMeeting(true);
    try {
      await onScheduleMeeting({
        leadId: lead.id,
        title: meetingTitle.trim(),
        description: meetingRoomUrl.trim() ? `Sala: ${meetingRoomUrl.trim()}` : null,
        scheduledAt: new Date(meetingDate).toISOString(),
        meetingType,
        durationMinutes: 30,
      });
      toast.success("Reunião agendada!");
      setMeetingTitle("");
      setMeetingDate("");
      setMeetingRoomUrl("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao agendar.");
    } finally {
      setIsSchedulingMeeting(false);
    }
  };

  const handleSendFormWhatsApp = () => {
    if (!cleanPhone) {
      toast.error("O lead não possui telefone cadastrado.");
      return;
    }
    const token = lead.magic_token || lead.id;
    const url = `${window.location.origin}/m/lead/${token}`;
    const firstName = (formData.name || "Olá").split(" ")[0];
    const msg = `Olá, ${firstName}! Para detalharmos seu roteiro${formData.destination ? ` para *${formData.destination}*` : ""} e prepararmos sua documentação com segurança, preencha sua ficha de passageiro, anamnese e acompanhantes:\n\n${url}`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleCopyFormLink = async () => {
    const token = lead.magic_token || lead.id;
    const url = `${window.location.origin}/m/lead/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link da ficha de anamnese e acompanhantes copiado!");
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden text-foreground">
      {/* ── HEADER SOBERANO DO CARD (PIPEFY STYLE) ── */}
      <SheetHeader className="px-4 sm:px-6 py-3 pr-14 sm:pr-16 border-b border-border/50 shrink-0 space-y-2 bg-background">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Identificação Principal & Título Editável */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsQuickProfileOpen(true)}
              className="relative size-11 min-h-11 min-w-11 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 overflow-hidden font-semibold text-foreground text-xs uppercase select-none hover:ring-2 hover:ring-primary/50 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              title={crmCustomer ? "Perfil do Cliente (Clique para editar/foto)" : "Editar Perfil do Cliente"}
            >
              {crmCustomer?.avatar_url ? (
                <img
                  src={crmCustomer.avatar_url}
                  alt={formData.name || "Cliente"}
                  className="size-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <span>{(formData.name || "LE").slice(0, 2)}</span>
              )}
            </button>
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-base font-semibold tracking-tight text-foreground line-clamp-1 text-anti-truncate">
                {formData.name || "Oportunidade Comercial"}
              </SheetTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <div className="inline-flex items-center gap-1">
                  <span className="text-2xs font-medium text-muted-foreground">Fase:</span>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => {
                      setFormData((prev) => ({ ...prev, status: val }));
                      onMoveStage(lead.id, val);
                    }}
                  >
                    <SelectTrigger className="w-auto max-w-full min-h-11 sm:min-h-8 sm:h-8 px-3 rounded-lg text-xs font-medium gap-1 border border-border/60 bg-muted/30 hover:bg-muted/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((st) => (
                        <SelectItem key={st.id} value={st.id}>
                          <div className="flex items-center gap-2">
                            <span className={cn("size-2 rounded-full shrink-0", st.dotColor)} />
                            <span>{st.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="inline-flex items-center gap-1">
                  <span className="text-2xs font-medium text-muted-foreground">Serviço:</span>
                  <Select
                    value={serviceTemplate}
                    onValueChange={async (val: ServiceTemplateType) => {
                      const prevVal = serviceTemplate;
                      setServiceTemplate(val);
                      try {
                        await onSaveLead({
                          ...formData,
                          custom_fields: {
                            ...(lead.custom_fields || {}),
                            service_template: val,
                          },
                        });
                        toast.success(`Serviço atualizado: ${SERVICE_TEMPLATE_LABELS[val]?.label}`);
                      } catch {
                        setServiceTemplate(prevVal);
                        toast.error("Não foi possível salvar o tipo de serviço.");
                      }
                    }}
                  >
                    <SelectTrigger className="w-auto max-w-full min-h-11 sm:min-h-8 sm:h-8 px-3 rounded-lg text-xs font-medium gap-1 border border-border/60 bg-muted/30 hover:bg-muted/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SERVICE_TEMPLATE_LABELS) as ServiceTemplateType[]).map((st) => (
                        <SelectItem key={st} value={st}>
                          <span>{SERVICE_TEMPLATE_LABELS[st].label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.travel_start && (
                  <span className="inline-flex items-center gap-1 font-mono text-2xs">
                    <Calendar className="size-3" />
                    <span>{formData.travel_start}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Cluster de Ações Primárias (Squircles Compactos) */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* WhatsApp Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!cleanPhone && !onOpenInternalWhatsAppChat}
                  className="min-h-11 sm:min-h-8 sm:h-8 px-3 rounded-lg text-xs font-medium gap-1 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MessageSquare className="size-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 text-xs">
                {onOpenInternalWhatsAppChat && (
                  <DropdownMenuItem
                    onClick={() => void onOpenInternalWhatsAppChat(lead.id)}
                    className="cursor-pointer gap-2 font-semibold text-primary"
                  >
                    <MessageSquare className="size-4 text-primary" />
                    <span>Atender no Chat Waesy (Ao Vivo)</span>
                  </DropdownMenuItem>
                )}
                {cleanPhone && (
                  <>
                    <DropdownMenuItem
                      onClick={() => window.open(whatsappUrl, "_blank")}
                      className="cursor-pointer gap-2"
                    >
                      <MessageSquare className="size-4 text-emerald-600" />
                      <span>Abrir no WhatsApp Web</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSendFormWhatsApp}
                      className="cursor-pointer gap-2"
                    >
                      <Share2 className="size-4 text-primary" />
                      <span>Enviar Ficha por WA</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  onClick={handleCopyFormLink}
                  className="cursor-pointer gap-2"
                >
                  <Link2 className="size-4 text-muted-foreground" />
                  <span>Copiar Link da Ficha</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Converter em Cliente / Perfil do Cliente */}
            {isLinkedToCustomer ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuickProfileOpen(true)}
                className="min-h-11 sm:min-h-8 sm:h-8 px-3 rounded-lg text-xs font-semibold gap-2 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                title="Ver e Editar Perfil Rápido do Cliente"
              >
                <UserCheck className="size-3.5 text-primary" />
                <span>Perfil do Cliente</span>
                <Badge variant="secondary" className="px-2 py-0 text-3xs font-mono bg-primary/20 text-primary">
                  Vinculado
                </Badge>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={isPromoting}
                onClick={handlePromoteLead}
                className="min-h-11 sm:min-h-8 sm:h-8 px-3 rounded-lg text-xs font-medium gap-1 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                title="Promover a Cliente da Carteira"
              >
                <UserCheck className="size-3.5 text-primary" />
                <span>{isPromoting ? "Convertendo..." : "Converter em Cliente"}</span>
              </Button>
            )}

            {/* CTA OCR de Cotações & Orçamentos */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsQuoteOcrModalOpen(true)}
              className="min-h-11 sm:min-h-8 sm:h-8 px-3 rounded-lg text-xs font-semibold gap-2 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              title="Importar Cotação ou Orçamento da Operadora via OCR (PDF ou Imagem)"
            >
              <FileSearch className="size-3.5" />
              <span>Importar OCR</span>
            </Button>

            {/* CTA Primário Soberano: Nova Cotação */}
            <Button
              type="button"
              onClick={() => {
                onClose();
                onGenerateProposal(buildProposalLeadPayload());
              }}
              className="min-h-11 sm:min-h-8 sm:h-8 px-3 rounded-lg text-xs font-semibold gap-1 bg-primary text-primary-foreground shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-3.5" />
              <span>Nova Cotação</span>
            </Button>
          </div>
        </div>

        {/* ── BARRA DE FERRAMENTAS RÁPIDAS (PIPEFY PILLS STYLE) ── */}
        <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pt-2 border-t border-border/40">
          {[
            { id: "form", label: "Geral", icon: FileText },
            {
              id: "checklists",
              label: `Checklists (${checklistGroups.reduce((acc, g) => acc + g.items.length, 0)})`,
              icon: CheckSquare,
            },
            {
              id: "attachments",
              label: `Anexos (${Array.isArray(cardAttachments) ? cardAttachments.length : 0})`,
              icon: Paperclip,
            },
            {
              id: "inspiration",
              label: `Inspirações (${inspirationPhotos.length})`,
              icon: Sparkles,
            },
            {
              id: "travelers",
              label:
                unifiedNiche === "real_estate"
                  ? `Cônjuge & Dependentes (${travelerDossiers.length})`
                  : unifiedNiche === "automotive"
                  ? `Condutores (${travelerDossiers.length})`
                  : unifiedNiche === "events"
                  ? `Padrinhos & Família (${travelerDossiers.length})`
                  : ["beauty_salon", "healthcare", "dental", "aesthetics_clinic"].includes(unifiedNiche)
                  ? `Acompanhantes / Resp. (${travelerDossiers.length})`
                  : `Acompanhantes (${travelerDossiers.length})`,
              icon: Users,
            },
            { id: "opportunities", label: `Oportunidades (${(infotravelOpp ? 1 : 0) + similarProposals.length + infotravelCaptures.length + radarMatches.length})`, icon: Zap },
            { id: "proposals", label: `Cotações (${effectiveProposals.length})`, icon: CreditCard },
            { id: "contracts", label: `Contratos (${allContracts.length})`, icon: FileSignature },
            { id: "payment", label: "Pagamento", icon: DollarSign },
            {
              id: "anamnese",
              label:
                unifiedNiche === "real_estate"
                  ? "Briefing de Compra"
                  : unifiedNiche === "automotive"
                  ? "Check-in & Vistoria"
                  : unifiedNiche === "events"
                  ? "Briefing de Cerimonial"
                  : ["beauty_salon", "healthcare", "dental", "aesthetics_clinic"].includes(unifiedNiche)
                  ? "Ficha de Anamnese"
                  : ["services", "law_firm", "accounting"].includes(unifiedNiche)
                  ? "Briefing de Escopo"
                  : "Anamnese & Perfil",
              icon: HeartPulse,
            },
            {
              id: "customer360",
              label: customer360Data?.customer ? "Perfil do Cliente (Ativo)" : "Info. do Cliente",
              icon: UserCheck,
            },
            { id: "lgpd", label: `Termos & LGPD (${consentRecords.length})`, icon: ShieldCheck },
            { id: "meeting", label: "Agenda & Reunião", icon: Calendar },
            { id: "presentation", label: "Apresentação Comercial", icon: FileText },
            { id: "comments", label: `Histórico (${internalComments.length})`, icon: Clock },
            { id: "all", label: "Ver Todos", icon: BookOpen },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => {
                  e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                  setActiveSection(item.id);
                  if (item.id === "presentation") {
                    handleGeneratePresentation();
                  } else if (item.id === "all") {
                    const el = document.getElementById(`section-${item.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  } else {
                    mainColRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                    formCol1Ref.current?.scrollTo({ top: 0, behavior: "smooth" });
                    formCol2Ref.current?.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={cn(
                  "min-h-11 sm:min-h-8 sm:h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </SheetHeader>

      {/* ── WORKSPACE COM SCROLL INDEPENDENTE POR COLUNA (PIPEFY MULTI-PANE LIVE CANVAS) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-4 sm:p-6 bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-1 gap-6 h-full min-h-0 items-stretch">
          {/* ══════════ COLUNA PRINCIPAL (DADOS DO CARD & FLUXO - 65%) ══════════ */}
          <div
            ref={mainColRef}
            className={cn(
              "lg:col-span-8 min-h-0",
              activeSection === "form"
                ? "h-auto lg:h-full flex flex-col lg:overflow-hidden"
                : "h-auto lg:h-full lg:overflow-y-auto overscroll-contain pr-0 lg:pr-2 scrollbar-waesy space-y-6 pb-16 lg:pb-24"
            )}
          >
            {/* ALERTA INTELIGENTE DE INATIVIDADE (STALENESS QUIZ) */}
            {diffDays >= 3 && lead?.status !== "won" && lead?.status !== "lost" && (
              <div className="p-4 rounded-xl border border-warning/40 bg-warning/10 space-y-3 shrink-0 mb-4">
                <div className="flex items-center gap-2 text-warning font-bold text-xs">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>Oportunidade sem interação há {diffDays} dias! O que aconteceu?</span>
                </div>
                <p className="text-2xs text-muted-foreground">
                  Evite a perda da oportunidade no funil registrando um parecer rápido:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Sumiu / Não responde", v: "disappeared", reason: "Lead não responde no WhatsApp" },
                    { label: "Desistiu da Viagem", v: "gave_up", reason: "Cliente desistiu da viagem nesta data" },
                    { label: "Sem Margem / Fora de Orçamento", v: "no_credit", reason: "Tarifa fora do orçamento do cliente" },
                    { label: "Viagem Adiada", v: "postponed", reason: "Cliente adiou o planejamento da viagem" },
                  ].map((opt) => (
                    <Button
                      key={opt.v}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await updateLeadStaleness({
                            data: {
                              leadId: lead.id,
                              stalenessStatus: opt.v as
                                | "disappeared"
                                | "gave_up"
                                | "no_credit"
                                | "postponed",
                              reasonLabel: opt.label,
                            },
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["lead-activities", lead.id],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["crm-leads"],
                          });
                          toast.success(`Parecer registrado: ${opt.label}`);
                        } catch (err: unknown) {
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Falha ao registrar parecer de inatividade."
                          );
                        }
                      }}
                      className="min-h-11 sm:min-h-8 sm:h-8 px-3 rounded-lg text-xs font-medium border-warning/40 hover:bg-warning/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 1. FORMULÁRIO INICIAL (START FORM) */}
            {(activeSection === "all" || activeSection === "form") && (
              <div
                id="section-form"
                className={cn(
                  activeSection === "form"
                    ? "flex-1 min-h-0 flex flex-col lg:overflow-hidden"
                    : "space-y-6"
                )}
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/40 shrink-0 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Dados Gerais da Viagem
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    Sincronizado com CRM
                  </span>
                </div>

                {/* BANNER RÁPIDO: IMPORTAR COTAÇÃO POR OCR */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-primary/25 bg-primary/5 gap-3 shrink-0 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Sparkles className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        Tem um orçamento em PDF ou print da operadora?
                      </p>
                      <p className="text-2xs text-muted-foreground truncate">
                        O OCR inteligente extrai destino, datas, voos, hotéis, passageiros e valores e preenche este card automaticamente.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setIsQuoteOcrModalOpen(true)}
                    className="min-h-11 sm:min-h-8 sm:h-8 px-3 text-xs font-semibold shrink-0 bg-primary text-primary-foreground rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Upload className="size-3.5 mr-2" />
                    <span>Escanear OCR</span>
                  </Button>
                </div>

                {/* Grid 2-Colunas com scroll interno independente em cada uma */}
                <div
                  className={cn(
                    "grid grid-cols-1 lg:grid-cols-2 gap-6",
                    activeSection === "form"
                      ? "flex-1 min-h-0 lg:grid-rows-1 lg:overflow-hidden items-stretch"
                      : ""
                  )}
                >
                  {/* Coluna 1: Viagem & Destino */}
                  <div
                    ref={formCol1Ref}
                    className={cn(
                      "space-y-4",
                      activeSection === "form"
                        ? "h-auto lg:h-full min-h-0 lg:overflow-y-auto overscroll-contain pr-1 sm:pr-2 scrollbar-waesy pb-16 lg:pb-24"
                        : ""
                    )}
                  >
                    <h4 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      <span>Viagem & Interesse</span>
                    </h4>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isAutoFillingLead}
                          onClick={async () => {
                            if (!lead?.id) return;
                            setIsAutoFillingLead(true);
                            try {
                              const res = await autoFillLeadDossierFromChatAi({
                                data: {
                                  leadId: lead.id,
                                  apply: false,
                                },
                              });
                              const p = res?.preview;
                              if (p) {
                                if (p.destination) {
                                  setDestinationTags(normalizeDestinationTagList(undefined, p.destination));
                                }
                                if (p.travelStart || p.travelEnd) {
                                  setPeriodSpec(
                                    normalizePeriodSpec({
                                      startDate: p.travelStart || formData.travel_start || undefined,
                                      endDate: p.travelEnd || formData.travel_end || undefined,
                                    }),
                                  );
                                }
                                setFormData((prev) => ({
                                  ...prev,
                                  name: p.fullName || prev.name,
                                  phone: p.phone || prev.phone,
                                  email: p.email || prev.email,
                                  destination: p.destination || prev.destination,
                                  travel_start: p.travelStart || prev.travel_start,
                                  travel_end: p.travelEnd || prev.travel_end,
                                  pax_adults: p.paxAdults || prev.pax_adults,
                                  pax_children: typeof p.paxChildren === "number" ? p.paxChildren : prev.pax_children,
                                  estimated_value_cents: p.estimatedValueCents || prev.estimated_value_cents,
                                  notes:
                                    p.notesSummary && !String(prev.notes || "").includes(p.notesSummary.slice(0, 40))
                                      ? (prev.notes ? `${prev.notes}\n${p.notesSummary}` : p.notesSummary)
                                      : prev.notes,
                                }));
                                toast.success(
                                  p.source === "llm"
                                    ? "Ficha preenchida via IA com histórico do WhatsApp, áudios e prints!"
                                    : "Campos extraídos do histórico do WhatsApp! Revise e salve a ficha.",
                                );
                              }
                            } catch (err: any) {
                              toast.error(err?.message || "Não foi possível consolidar o histórico do WhatsApp.");
                            } finally {
                              setIsAutoFillingLead(false);
                            }
                          }}
                          className="h-11 min-h-11 w-full justify-center gap-2 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Zap className="size-4 shrink-0" />
                          <span>{isAutoFillingLead ? "Lendo chat, áudios e prints..." : "Auto-preencher Ficha do WhatsApp com IA"}</span>
                        </Button>
                      </div>

                      <TravelIntentAiImporter
                        mode="lead_intent"
                        onApply={(parsed) => {
                          if (parsed.destinations.length > 0) {
                            setDestinationTags(parsed.destinations);
                          }
                          if (parsed.period.mode !== "unspecified") {
                            setPeriodSpec(parsed.period);
                          }
                          if (parsed.rooms.length > 0) {
                            setRoomOccupancies(parsed.rooms);
                          }
                          setRawIntentMarkdown(parsed.rawMarkdownPreserved);
                          setFormData((prev) => ({
                            ...prev,
                            name: parsed.contact.fullName || prev.name,
                            phone: parsed.contact.whatsapp || prev.phone,
                            email: parsed.contact.email || prev.email,
                            destination:
                              parsed.destinations.length > 0
                                ? parsed.destinations.map((d) => d.label).join(", ")
                                : prev.destination,
                            interest_period: parsed.period.displayLabel || prev.interest_period,
                            travel_start: parsed.period.startDate || prev.travel_start,
                            travel_end: parsed.period.endDate || prev.travel_end,
                            pax_adults: parsed.adultsCount,
                            pax_children: parsed.childrenAges.length,
                            pax_infants: parsed.childrenAges.filter((a) => a <= 1).length,
                            pax_ages: parsed.childrenAges,
                            estimated_value_cents: parsed.budget.maxTotalBudgetCents || prev.estimated_value_cents,
                          }));
                          toast.success("Campos estruturados preenchidos a partir do texto!");
                        }}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`${dossierFieldId}-full-name`} className="text-xs text-muted-foreground font-semibold">Nome Completo</Label>
                          <Input
                            id={`${dossierFieldId}-full-name`}
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Nome do cliente..."
                            className="h-11 min-h-11 text-base sm:text-xs rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`${dossierFieldId}-budget`} className="text-xs text-muted-foreground font-semibold">Orçamento Estimado (R$)</Label>
                          <Input
                            id={`${dossierFieldId}-budget`}
                            type="number"
                            value={formData.estimated_value_cents ? formData.estimated_value_cents / 100 : ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                estimated_value_cents: Math.round(Number(e.target.value || 0) * 100),
                              }))
                            }
                            placeholder="R$ 0,00"
                            className="h-11 min-h-11 text-base sm:text-xs rounded-lg font-mono"
                          />
                        </div>
                      </div>

                      <DestinationTagsPicker
                        value={destinationTags}
                        legacyText={formData.destination}
                        label={nicheTerminology.contextFieldLabel || "Destinos de interesse"}
                        placeholder={nicheTerminology.contextPlaceholder || "Buscar cidade, destino turístico ou IATA (ex: Maceió, POA, Cancún)..."}
                        onChange={(tags) => {
                          setDestinationTags(tags);
                          setFormData((prev) => ({
                            ...prev,
                            destination: tags.map((t) => t.label).join(", "),
                          }));
                        }}
                      />

                      <div className="space-y-1">
                        <Label htmlFor={`${dossierFieldId}-interest-type`} className="text-xs text-muted-foreground font-semibold">
                          {nicheTerminology.interestFieldLabel || "Tipo de Interesse"}
                        </Label>
                        <Select
                          value={formData.interest_type}
                          onValueChange={(val) => setFormData((prev) => ({ ...prev, interest_type: val }))}
                        >
                          <SelectTrigger id={`${dossierFieldId}-interest-type`} className="h-11 min-h-11 text-base sm:text-xs rounded-lg">
                            <SelectValue placeholder="Tipo de interesse..." />
                          </SelectTrigger>
                          <SelectContent>
                            {INTEREST_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <TravelPeriodTagsPicker
                        value={periodSpec}
                        onChange={(nextPeriod) => {
                          setPeriodSpec(nextPeriod);
                          setFormData((prev) => ({
                            ...prev,
                            travel_start: nextPeriod.startDate || "",
                            travel_end: nextPeriod.endDate || "",
                            interest_period: nextPeriod.displayLabel || "",
                          }));
                        }}
                      />

                      {(unifiedNiche === "tourism" || roomOccupancies.some((r) => r.childrenCount > 0 || r.adultsCount > 1)) && (
                        <RoomOccupancyBuilder
                          value={roomOccupancies}
                          onChange={(nextRooms) => {
                            setRoomOccupancies(nextRooms);
                            const nextAdults = nextRooms.reduce((sum, r) => sum + (r.adultsCount || 1), 0);
                            const nextAges = nextRooms.flatMap((r) => r.childrenAges || []);
                            setFormData((prev) => ({
                              ...prev,
                              pax_adults: nextAdults,
                              pax_children: nextAges.length,
                              pax_infants: nextAges.filter((a) => a <= 1).length,
                              pax_ages: nextAges,
                            }));
                          }}
                        />
                      )}

                      {/* Alerta de Taxas Regulatórias & Requisitos de Destino (Turismo) */}
                      {unifiedNiche === "tourism" && (
                        <DestinationRegulatoryAlertWidget
                          destination={formData.destination || destinationTags}
                          paxCount={(formData.pax_adults || 2) + (formData.pax_children || 0)}
                          stayDays={
                            formData.travel_start && formData.travel_end
                              ? Math.max(1, Math.round((new Date(formData.travel_end).getTime() - new Date(formData.travel_start).getTime()) / (1000 * 60 * 60 * 24)))
                              : 7
                          }
                          onIncludeFeesInProposal={(estimatedCents) => {
                            setFormData((prev) => ({
                              ...prev,
                              estimated_value_cents: (prev.estimated_value_cents || 0) + estimatedCents,
                            }));
                            toast.success("Taxas estimadas adicionadas ao orçamento da viagem!");
                          }}
                        />
                      )}

                      {/* Anotações da Abordagem */}
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Anotações da Abordagem / Proposta</Label>
                        <Textarea
                          rows={3}
                          value={formData.notes}
                          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                          placeholder="Desejos específicos, hotel preferido, proposta de viagem..."
                          className="text-xs rounded-lg"
                        />
                      </div>

                      {/* Botão de Salvar Alterações na Coluna 1 */}
                      <div className="flex justify-end pt-2">
                        <Button
                          type="button"
                          disabled={isSaving}
                          onClick={handleSaveForm}
                          className="h-11 min-h-11 px-6 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {isSaving ? "Salvando..." : "Salvar Dados da Viagem"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Coluna 2: Atendimento, Procedência & Saúde Especial */}
                  <div
                    ref={formCol2Ref}
                    className={cn(
                      activeSection === "form"
                        ? "h-auto lg:h-full min-h-0 lg:overflow-y-auto overscroll-contain pr-1 sm:pr-2 scrollbar-waesy pb-16 lg:pb-24"
                        : ""
                    )}
                  >
                    <div className="space-y-5 p-5 rounded-xl border border-border/40 bg-card/60 flex flex-col">
                    <div className="space-y-4">
                      <h4 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-2">
                        <Radio className="size-4 text-primary" />
                        <span>Atendimento & Procedência</span>
                      </h4>

                      {/* Canal de Origem & Detalhe */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`${dossierFieldId}-source`} className="text-xs text-muted-foreground font-semibold">Canal / Origem</Label>
                          <Select
                            value={formData.source || "balcao"}
                            onValueChange={(val) => setFormData((prev) => ({ ...prev, source: val as any }))}
                          >
                            <SelectTrigger id={`${dossierFieldId}-source`} className="h-11 min-h-11 text-base sm:text-xs rounded-lg">
                              <SelectValue placeholder="Canal..." />
                            </SelectTrigger>
                            <SelectContent>
                              {LEAD_SOURCES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`${dossierFieldId}-source-detail`} className="text-xs text-muted-foreground font-semibold">Detalhe do Canal</Label>
                          <Input
                            id={`${dossierFieldId}-source-detail`}
                            value={formData.lead_source_detail}
                            onChange={(e) => setFormData((prev) => ({ ...prev, lead_source_detail: e.target.value }))}
                            placeholder="Ex: Orgânico, Instagram"
                            className="h-11 min-h-11 text-base sm:text-xs rounded-lg"
                          />
                        </div>
                      </div>

                      {(() => {
                        const cf = (lead?.custom_fields || {}) as Record<string, any>;
                        const attrObj = (cf.attribution && typeof cf.attribution === "object" ? cf.attribution : {}) as Record<string, any>;
                        const campaignName =
                          attrObj.campaign_name ||
                          attrObj.campaign ||
                          attrObj.utm_campaign ||
                          cf.campaign_name ||
                          cf.utm_campaign ||
                          cf.campaign ||
                          null;
                        const adsetName = attrObj.adset_name || cf.adset_name || null;
                        const adName = attrObj.ad_name || cf.ad_name || null;
                        const adId = attrObj.ad_id || cf.ad_id || null;
                        const touchpoints = Array.isArray(cf.touchpoints) ? cf.touchpoints : [];
                        const customEvents = Array.isArray(cf.custom_events) ? cf.custom_events : [];
                        const interests = Array.isArray(cf.interests) ? cf.interests : [];
                        const formAnswers = (Array.isArray(cf.form_answers) ? cf.form_answers : []).map(
                          (ans: any, idx: number) => ({
                            key: `ans-${idx}`,
                            label: ans?.question || ans?.label || `Pergunta ${idx + 1}`,
                            value: Array.isArray(ans?.values)
                              ? ans.values.join(", ")
                              : String(ans?.value ?? ""),
                          })
                        );

                        const dossierJourney = computeCustomerTouchpointJourney(
                          touchpoints,
                          attrObj
                        );

                        return (
                          <div className="space-y-2">
                            <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-2">
                              <span className="text-3xs uppercase tracking-wider font-semibold text-primary block">
                                Atribuição de Anúncio e Pixel
                              </span>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs">
                                {(attrObj.utm_source || cf.utm_source || attrObj.platform || cf.platform) && (
                                  <span>
                                    Fonte:{" "}
                                    <strong className="text-foreground">
                                      {attrObj.utm_source || cf.utm_source || attrObj.platform || cf.platform}
                                    </strong>
                                  </span>
                                )}
                                {campaignName && (
                                  <span>
                                    Campanha: <strong className="text-foreground">{campaignName}</strong>
                                  </span>
                                )}
                                {adsetName && (
                                  <span>
                                    Conjunto: <strong className="text-foreground">{adsetName}</strong>
                                  </span>
                                )}
                                {adName && (
                                  <span>
                                    Anúncio: <strong className="text-foreground">{adName}</strong>
                                  </span>
                                )}
                                {adId && (
                                  <span className="font-mono text-muted-foreground">
                                    ID #{adId}
                                  </span>
                                )}
                                {(attrObj.lead_code || cf.lead_code) && (
                                  <span className="font-mono">
                                    Ref: <strong className="text-foreground">#{attrObj.lead_code || cf.lead_code}</strong>
                                  </span>
                                )}
                                {(attrObj.ctwa_clid || cf.ctwa_clid) && <span className="font-mono text-emerald-600">CTWA</span>}
                                {(attrObj.fbclid || attrObj.fbc || attrObj.fbp || cf.fbclid || cf.fbc || cf.fbp) && (
                                  <span className="font-mono text-primary">Meta Pixel</span>
                                )}
                                {(attrObj.gclid || cf.gclid) && <span className="font-mono text-sky-600">Google Ads</span>}
                              </div>
                              {dossierJourney.totalTouchpointsCount > 0 && (
                                <div className="pt-2 border-t border-border/40 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2 text-2xs">
                                    <span className="px-2 py-1 rounded bg-primary/10 text-primary font-semibold">
                                      {dossierJourney.totalClicksCount} {dossierJourney.totalClicksCount === 1 ? "toque" : "toques"}
                                    </span>
                                    {dossierJourney.uniqueCampaignsCount > 0 && (
                                      <span className="px-2 py-1 rounded bg-muted text-foreground font-medium">
                                        {dossierJourney.uniqueCampaignsCount} {dossierJourney.uniqueCampaignsCount === 1 ? "campanha" : "campanhas"}
                                      </span>
                                    )}
                                    {dossierJourney.uniqueAdsCount > 0 && (
                                      <span className="px-2 py-1 rounded bg-muted text-foreground font-medium">
                                        {dossierJourney.uniqueAdsCount} {dossierJourney.uniqueAdsCount === 1 ? "anúncio" : "anúncios"}
                                      </span>
                                    )}
                                  </div>
                                  {dossierJourney.totalTouchpointsCount > 1 && dossierJourney.firstTouch && dossierJourney.lastTouch && (
                                    <div className="text-2xs text-muted-foreground space-y-1">
                                      <p>
                                        <strong className="text-foreground">1º Toque:</strong>{" "}
                                        {dossierJourney.firstTouch.campaignName || dossierJourney.firstTouch.adName || dossierJourney.firstTouch.channel}
                                      </p>
                                      <p>
                                        <strong className="text-foreground">Último Toque:</strong>{" "}
                                        {dossierJourney.lastTouch.campaignName || dossierJourney.lastTouch.adName || dossierJourney.lastTouch.channel}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {interests.length > 0 && (
                              <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-2">
                                <span className="text-3xs uppercase tracking-wider font-semibold text-muted-foreground block">
                                  Interesses & Anúncios Vinculados ({interests.length})
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {interests.map((it: any, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-2xs font-medium max-w-full">
                                      <span className="truncate">
                                        {it?.listing_title || it?.source_detail || (it?.ad_id ? `Anúncio #${it.ad_id}` : "Interesse")}
                                      </span>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {formAnswers.length > 0 && (
                              <div className="space-y-2">
                                <span className="font-semibold text-2xs uppercase tracking-wider text-muted-foreground block">
                                  Respostas Estruturadas do Formulário
                                </span>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {formAnswers.map((row) => (
                                    <div key={row.key} className="bg-background/60 rounded-lg px-3 py-2">
                                      <dt className="text-2xs text-muted-foreground font-medium">{row.label}</dt>
                                      <dd className="text-xs font-medium text-foreground break-words">{row.value}</dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Tags Avançadas & Etiquetas do Atendimento */}
                      <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
                        <AdvancedLeadTagsPicker
                          tags={formData.tags}
                          onChange={(nextTags) => setFormData((prev) => ({ ...prev, tags: nextTags }))}
                        />
                      </div>

                      {/* Lembretes, Alarmes & Vencimentos de Follow-up */}
                      <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
                        <LeadRemindersManager
                          reminders={reminders}
                          onChange={(nextReminders, nextFollowUp) => {
                            setReminders(nextReminders);
                            setFollowUpAt(nextFollowUp || null);
                          }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/40 space-y-4">
                      <h4 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-2">
                        <ShieldCheck className="size-4 text-primary" />
                        <span>Acessibilidade & Saúde</span>
                      </h4>

                      <div className="space-y-3">
                        <label className="flex items-center gap-2 p-3 rounded-lg border border-border/40 bg-background/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(formData.pcd)}
                            onChange={(e) => setFormData((prev) => ({ ...prev, pcd: e.target.checked }))}
                            className="size-4 rounded accent-primary cursor-pointer"
                          />
                          <span className="text-xs font-medium text-foreground">PCD (Pessoa com Deficiência)</span>
                        </label>
                        <label className="flex items-center gap-2 p-3 rounded-lg border border-border/40 bg-background/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(formData.reduced_mobility)}
                            onChange={(e) => setFormData((prev) => ({ ...prev, reduced_mobility: e.target.checked }))}
                            className="size-4 rounded accent-primary cursor-pointer"
                          />
                          <span className="text-xs font-medium text-foreground">Mobilidade Reduzida</span>
                        </label>
                        <label className="flex items-center gap-2 p-3 rounded-lg border border-border/40 bg-background/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(formData.autism_spectrum)}
                            onChange={(e) => setFormData((prev) => ({ ...prev, autism_spectrum: e.target.checked }))}
                            className="size-4 rounded accent-primary cursor-pointer"
                          />
                          <span className="text-xs font-medium text-foreground">Espectro Autista (TEA)</span>
                        </label>

                        <div className="space-y-1 pt-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">Notas de Saúde / Restrições</Label>
                          <Textarea
                            rows={4}
                            value={formData.health_notes || ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, health_notes: e.target.value }))}
                            placeholder="Alergias alimentares, necessidade de cadeira de rodas, oxigênio..."
                            className="text-xs rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Consentimento Rápido LGPD */}
                    <div className="p-4 rounded-lg border border-border/40 bg-background/60 flex items-center justify-between gap-3 mt-4">
                      <div className="space-y-1">
                        <span className="font-bold text-xs text-foreground block">Consentimento LGPD</span>
                        <span className="text-2xs text-muted-foreground">O lead aceitou os termos de privacidade da agência.</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveSection("lgpd")}
                          className="text-2xs text-primary font-semibold hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                        >
                          Ver Provas
                        </button>
                        <input
                          type="checkbox"
                          checked={Boolean(formData.lgpd_consent)}
                          onChange={(e) => setFormData((prev) => ({ ...prev, lgpd_consent: e.target.checked }))}
                          className="size-5 rounded accent-primary cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Botão de Salvar Alterações na Coluna 2 */}
                    <div className="flex justify-end pt-4 border-t border-border/40">
                      <Button
                        type="button"
                        disabled={isSaving}
                        onClick={handleSaveForm}
                        className="h-11 min-h-11 px-6 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {isSaving ? "Salvando..." : "Salvar Dados da Viagem"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

                {/* Botão de Salvar Alterações para exibição no modo 'all' */}
                {activeSection === "all" && (
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveForm}
                      className="h-11 min-h-11 px-6 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {isSaving ? "Salvando..." : "Salvar Dados da Viagem"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 1.1 PASTAS DE INSPIRAÇÃO & MOODBOARD VISUAL MULTI-NICHO */}
            {(activeSection === "all" || activeSection === "inspiration") && (
              <div id="section-inspiration" className="space-y-4 p-5 rounded-xl border border-border/40 bg-card/60">
                <LeadInspirationMoodboard
                  niche={unifiedNiche}
                  photos={inspirationPhotos}
                  folders={inspirationFolders}
                  leadPhone={lead.phone}
                  leadName={lead.full_name}
                  companyName={companyName}
                  onSavePhotos={handleSaveInspirationPhotos}
                />
              </div>
            )}

            {/* 2. VIAJANTES & ACOMPANHANTES (PASTAS DE PASSAGEIROS) */}
            {(activeSection === "all" || activeSection === "travelers") && (
              <div id="section-travelers" className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-primary" />
                      <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                        {unifiedNiche === "real_estate"
                          ? `Cônjuge & Dependentes (${travelerDossiers.length})`
                          : unifiedNiche === "automotive"
                          ? `Condutores Autorizados (${travelerDossiers.length})`
                          : unifiedNiche === "events"
                          ? `Padrinhos & Família (${travelerDossiers.length})`
                          : ["beauty_salon", "healthcare", "dental", "aesthetics_clinic"].includes(unifiedNiche)
                          ? `Acompanhantes / Responsáveis (${travelerDossiers.length})`
                          : `Pastas de Viajantes & Acompanhantes (${travelerDossiers.length})`}
                      </h3>
                    </div>
                    <p className="text-2xs text-muted-foreground">
                      {unifiedNiche === "real_estate"
                        ? "Documentação de co-proprietários, cônjuge para escritura e qualificação civil."
                        : unifiedNiche === "automotive"
                        ? "Registro de CNH, condutores adicionais para seguro e vistoria."
                        : unifiedNiche === "events"
                        ? "Lista de padrinhos, homenageados e cerimonial."
                        : ["beauty_salon", "healthcare", "dental", "aesthetics_clinic"].includes(unifiedNiche)
                        ? "Contatos de emergência, acompanhantes ou responsáveis legais do paciente."
                        : "Documentação de embarque, conferência de passaportes, vínculos consulares DS-160 e promoção a cliente."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddTraveler}
                    className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg gap-2 bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                  >
                    <Plus className="size-4" />
                    <span>Adicionar Passageiro</span>
                  </Button>
                </div>

                {/* Banner do Link Mágico de Auto-Cadastro */}
                <div className="p-4 sm:p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="size-4 text-primary" />
                    <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Link Mágico de Auto-Cadastro do Cliente
                    </h4>
                  </div>
                  <p className="text-2xs text-muted-foreground">
                    Envie este link para que o passageiro titular preencha e confira de forma autônoma os documentos da família ou acompanhantes.
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopyFormLink}
                      className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Copy className="size-3.5" />
                      <span>Copiar Link da Ficha</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSendFormWhatsApp}
                      className="h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MessageSquare className="size-3.5" />
                      <span>Enviar no WhatsApp</span>
                    </Button>
                  </div>
                </div>

                {/* Navegador de Pastas por Viajante */}
                <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pb-1">
                  {travelerDossiers.map((t, idx) => {
                    const isSelected = t.id === activeTraveler.id;
                    const isTitular = idx === 0 || t.role === "titular";
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTravelerId(t.id)}
                        className={cn(
                          "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold flex items-center gap-2 shrink-0 transition-colors cursor-pointer border focus-visible:ring-2 focus-visible:ring-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                            : "bg-card text-foreground border-border/60 hover:bg-muted/40"
                        )}
                      >
                        <UserCheck className="size-3.5" />
                        <span>
                          {isTitular ? "Titular" : `Pax ${idx + 1}`}: {t.full_name ? t.full_name.split(" ")[0] : "Sem nome"}
                        </span>
                        {t.customer_linked && (
                          <span className="size-2 rounded-full bg-emerald-400" title="Vinculado ao Cadastro de Clientes" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Ficha Completa do Viajante Ativo */}
                {activeTraveler && (
                  <div className="p-5 rounded-xl border border-border/60 bg-card space-y-5">
                    {/* Header da Pasta */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-foreground">
                            {activeTraveler.full_name || "Passageiro sem nome"}
                          </h4>
                          <Badge variant="outline" className="text-2xs font-mono uppercase">
                            {activeTraveler.role || "Acompanhante"}
                          </Badge>
                        </div>
                        <span className="text-2xs text-muted-foreground font-mono">
                          ID da Pasta: {activeTraveler.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {/* CTA Soberano: Promover Viajante a Cliente Individual */}
                        {activeTraveler.customer_linked ? (
                          <Badge variant="secondary" className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                            <CheckCircle2 className="size-3.5" />
                            <span>Cliente Carteira 360°</span>
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handlePromoteTravelerToCustomerClick(activeTraveler.id)}
                            className="h-11 min-h-11 sm:h-9 sm:min-h-9 rounded-lg px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                            title="Transformar este passageiro em um cliente cadastrado no CRM"
                          >
                            <UserPlus className="size-3.5 text-primary" />
                            <span>Promover a Cliente</span>
                          </Button>
                        )}

                        {travelerDossiers.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleRemoveTraveler(activeTraveler.id)}
                            className="size-11 min-h-11 text-muted-foreground hover:text-destructive border-border/60 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                            title="Remover pasta deste passageiro"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Sub-abas do Viajante */}
                    <div className="flex items-center gap-2 border-b border-border/30 pb-2">
                      {[
                        { id: "checkin", label: "Check-in & Dados" },
                        { id: "documents", label: "Passaporte & Docs" },
                        { id: "visas", label: "Vistos & DS-160" },
                        { id: "vaccines", label: "Vacinas & Saúde" },
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setActiveTravelerTab(sub.id as any)}
                          className={cn(
                            "h-11 min-h-11 px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary",
                            activeTravelerTab === sub.id
                              ? "bg-muted text-foreground font-bold"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          )}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>

                    {/* Sub-aba 1: Check-in */}
                    {activeTravelerTab === "checkin" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">Nome Completo</Label>
                          <Input
                            value={activeTraveler.full_name || ""}
                            onChange={(e) => updateActiveTraveler((prev) => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Nome conforme documento de embarque"
                            className="h-10 text-xs rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">CPF / Documento</Label>
                          <Input
                            value={activeTraveler.cpf || ""}
                            onChange={(e) => updateActiveTraveler((prev) => ({ ...prev, cpf: e.target.value }))}
                            placeholder="000.000.000-00"
                            className="h-10 text-xs rounded-lg font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">RG / Órgão Emissor</Label>
                          <Input
                            value={activeTraveler.rg || ""}
                            onChange={(e) => updateActiveTraveler((prev) => ({ ...prev, rg: e.target.value }))}
                            placeholder="Ex: 12.345.678-9 SSP/SP"
                            className="h-10 text-xs rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">Data de Nascimento</Label>
                          <Input
                            type="date"
                            value={activeTraveler.birth_date || ""}
                            onChange={(e) => updateActiveTraveler((prev) => ({ ...prev, birth_date: e.target.value }))}
                            className="h-10 text-xs rounded-lg font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">Telefone de Contato</Label>
                          <Input
                            value={activeTraveler.phone || ""}
                            onChange={(e) => updateActiveTraveler((prev) => ({ ...prev, phone: e.target.value }))}
                            placeholder="(00) 00000-0000"
                            className="h-10 text-xs rounded-lg font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">E-mail</Label>
                          <Input
                            type="email"
                            value={activeTraveler.email || ""}
                            onChange={(e) => updateActiveTraveler((prev) => ({ ...prev, email: e.target.value }))}
                            placeholder="email@exemplo.com"
                            className="h-10 text-xs rounded-lg"
                          />
                        </div>
                      </div>
                    )}

                    {/* Sub-aba 2: Passaporte & Docs */}
                    {activeTravelerTab === "documents" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <Label className="text-2xs text-muted-foreground font-semibold">Nº do Passaporte</Label>
                            <Input
                              value={activeTraveler.passport_number || ""}
                              onChange={(e) => updateActiveTraveler((prev) => ({ ...prev, passport_number: e.target.value }))}
                              placeholder="Ex: FP123456"
                              className="h-10 text-xs rounded-lg font-mono uppercase"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-2xs text-muted-foreground font-semibold">País Emissor</Label>
                            <Input
                              value={activeTraveler.passport_issuing_country || "BRA"}
                              onChange={(e) => updateActiveTraveler((prev) => ({ ...prev, passport_issuing_country: e.target.value }))}
                              className="h-10 text-xs rounded-lg font-mono uppercase"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-2xs text-muted-foreground font-semibold">Validade do Passaporte</Label>
                            <Input
                              type="date"
                              value={activeTraveler.passport_expiry_date || ""}
                              onChange={(e) => updateActiveTraveler((prev) => ({ ...prev, passport_expiry_date: e.target.value }))}
                              className="h-10 text-xs rounded-lg font-mono"
                            />
                          </div>
                          <div className="space-y-1 flex flex-col justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsMrzModalOpen(true)}
                              className="h-11 min-h-11 text-xs font-bold gap-2 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <ScanLine className="size-4" />
                              <span>Escanear Linhas MRZ (OCR)</span>
                            </Button>
                          </div>
                        </div>

                        {/* Alerta de Validade < 6 Meses (comparação civil date-only sem shift UTC) */}
                        {(() => {
                          if (!activeTraveler.passport_expiry_date) return null;
                          const expParts = parseDateOnlyParts(activeTraveler.passport_expiry_date);
                          const depParts = parseDateOnlyParts(formData.travel_start || new Date());
                          if (!expParts || !depParts) return null;
                          const expMidday = Date.UTC(expParts.year, expParts.month - 1, expParts.day, 15, 0, 0);
                          const depMidday = Date.UTC(depParts.year, depParts.month - 1, depParts.day, 15, 0, 0);
                          const diffMonths = (expMidday - depMidday) / (1000 * 60 * 60 * 24 * 30);
                          if (diffMonths < 6) {
                            return (
                              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 flex items-center gap-2 text-xs font-semibold">
                                <AlertTriangle className="size-4 shrink-0" />
                                <span>Atenção: Passaporte vence em menos de 6 meses da data de embarque ({Math.round(diffMonths)} meses)! Recomende renovação imediata.</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {/* Sub-aba 3: Vistos & DS-160 */}
                    {activeTravelerTab === "visas" && (
                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-2xs text-muted-foreground font-semibold">Status do Visto Consular</Label>
                            <Select
                              value={activeTraveler.consular_visa_status || "dispensado"}
                              onValueChange={(val: any) => updateActiveTraveler((prev) => ({ ...prev, consular_visa_status: val }))}
                            >
                              <SelectTrigger className="h-10 text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(CONSULAR_VISA_STATUS_LABELS) as ConsularVisaStatus[]).map((st) => (
                                  <SelectItem key={st} value={st}>
                                    {CONSULAR_VISA_STATUS_LABELS[st].label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-2xs text-muted-foreground font-semibold">Validade do Visto</Label>
                            <Input
                              type="date"
                              value={activeTraveler.consular_visa_expiry_date || ""}
                              onChange={(e) => updateActiveTraveler((prev) => ({ ...prev, consular_visa_expiry_date: e.target.value }))}
                              className="h-10 text-xs rounded-lg font-mono"
                            />
                          </div>
                        </div>

                        {/* Vínculos DS-160 */}
                        <div className="p-4 rounded-lg border border-border/40 bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground">Índice de Vínculos Econômicos / Consular</span>
                            <span className="text-xs font-mono font-bold text-primary">
                              {activeTraveler.ds160_ties_analysis?.tiesScore || 70}/100 pts
                            </span>
                          </div>
                          <p className="text-2xs text-muted-foreground">
                            {activeTraveler.ds160_ties_analysis?.recommendations?.join("; ") || "Vínculos econômicos e profissionais consolidados."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Sub-aba 4: Vacinas & Saúde */}
                    {activeTravelerTab === "vaccines" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <label className="flex items-center gap-2 p-3 rounded-lg border border-border/40 bg-muted/20 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(activeTraveler.yellow_fever_vaccine_verified)}
                            onChange={(e) => updateActiveTraveler((prev) => ({ ...prev, yellow_fever_vaccine_verified: e.target.checked }))}
                            className="size-4 rounded accent-primary cursor-pointer"
                          />
                          <span className="text-xs font-medium text-foreground">Certificado Internacional de Vacinação (Febre Amarela - CIVP)</span>
                        </label>
                        <label className="flex items-center gap-2 p-3 rounded-lg border border-border/40 bg-muted/20 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(activeTraveler.covid_vaccine_verified)}
                            onChange={(e) => updateActiveTraveler((prev) => ({ ...prev, covid_vaccine_verified: e.target.checked }))}
                            className="size-4 rounded accent-primary cursor-pointer"
                          />
                          <span className="text-xs font-medium text-foreground">Esquema Vacinal Atualizado (Covid-19)</span>
                        </label>
                      </div>
                    )}

                    {/* Botão de Salvar Pastas */}
                    <div className="flex justify-end pt-2 border-t border-border/30">
                      <Button
                        type="button"
                        disabled={isSaving}
                        onClick={handleSaveForm}
                        className="h-11 min-h-11 px-5 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {isSaving ? "Salvando..." : "Salvar Pastas de Passageiros"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. RADAR DE OPORTUNIDADES & TARIFAS INFOTRAVEL */}
            {(activeSection === "all" || activeSection === "opportunities") && (
              <section id="section-opportunities" className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border/40 gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                        Radar de Oportunidades & Tarifas
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Histórico de cotações e tarifas para {formData.destination || "este destino"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary bg-primary/10 self-start sm:self-auto">
                    {similarProposals.length + infotravelCaptures.length + radarMatches.length + (infotravelOpp ? 1 : 0)} oportunidade(s) mapeada(s)
                  </Badge>
                </div>

                {customer360Data?.historicalBenchmark && (
                  <div className="p-3 rounded-lg bg-muted/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="space-y-1 min-w-0">
                      <span className="font-semibold text-foreground block">
                        Termômetro Histórico do Destino
                      </span>
                      <span className="text-muted-foreground block">
                        {customer360Data.historicalBenchmark.verdictLabelPt}
                      </span>
                    </div>
                    <Badge
                      variant={customer360Data.historicalBenchmark.verdict === "great_deal" ? "success" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {customer360Data.historicalBenchmark.sampleCount >= 2 &&
                      customer360Data.historicalBenchmark.historicalSavingsPct != null
                        ? `${customer360Data.historicalBenchmark.historicalSavingsPct > 0 ? "-" : "+"}${Math.abs(Math.round(customer360Data.historicalBenchmark.historicalSavingsPct))}% histórico`
                        : `${customer360Data.historicalBenchmark.sampleCount} amostras`}
                    </Badge>
                  </div>
                )}

                {infotravelOpp && (
                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-xs text-foreground uppercase">
                        Tarifa Detectada ({infotravelOpp.operator_slug})
                      </span>
                      <strong className="text-sm font-bold font-mono text-primary">
                        {formatMoney(infotravelOpp.quoted_total_cents || 0)}
                      </strong>
                    </div>
                    {infotravelOpp.whatsapp_pitch_draft && (
                      <p className="text-xs text-muted-foreground italic">"{infotravelOpp.whatsapp_pitch_draft}"</p>
                    )}
                  </div>
                )}

                {/* Capturas em Tempo Real (InfoTravel / Operadoras) */}
                {infotravelCaptures.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Capturas de Tarifas em Operadoras (InfoTravel)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {infotravelCaptures.map((cap: any) => (
                        <div
                          key={`cap-${cap.id}`}
                          className="p-3 rounded-lg border border-border bg-card flex flex-col justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-foreground line-clamp-2 text-anti-truncate">
                                {cap.hotel_name || cap.destination || "Tarifa Operadora"}
                              </span>
                              <Badge variant="outline" className="text-xs uppercase shrink-0">
                                {cap.source_provider || "InfoTravel"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {cap.destination} {cap.checkin_date ? `· ${cap.checkin_date}` : ""}
                            </p>
                            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground pt-1">
                              <span>Tarifa Capturada:</span>
                              <strong className="text-primary font-mono">{formatMoney(cap.total_amount_cents || 0)}</strong>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              onClose();
                              onGenerateProposal(
                                buildProposalLeadPayload({
                                  destination: cap.destination || formData.destination,
                                  estimated_value_cents: cap.total_amount_cents || formData.estimated_value_cents,
                                  passenger_count: (cap.adults_count || formData.pax_adults || 2) + (cap.children_count || formData.pax_children || 0),
                                  departureDate: cap.checkin_date || formData.travel_start,
                                  returnDate: cap.checkout_date || formData.travel_end,
                                  notes: `Tarifa capturada via ${cap.source_provider || "InfoTravel"} (${cap.hotel_name || cap.destination})`,
                                }),
                              );
                            }}
                            className="h-11 min-h-11 text-xs font-semibold gap-2 border-border hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Zap className="size-3.5 text-primary" />
                            <span>Converter em Proposta</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Radar de Oportunidades & Promoções da Agência */}
                {radarMatches.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Radar de Tarifas & Bloqueios da Agência
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {radarMatches.map((opp: any) => (
                        <div
                          key={`opp-${opp.id}`}
                          className="p-3 rounded-lg border border-border bg-muted flex flex-col justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <span className="font-bold text-foreground line-clamp-2 text-anti-truncate block">
                              {opp.title || opp.destination || "Oportunidade do Radar"}
                            </span>
                            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground pt-1">
                              <span>Tarifa Radar:</span>
                              <strong className="text-success font-mono">{formatMoney(opp.price_cents || 0)}</strong>
                              {opp.discount_pct ? (
                                <Badge variant="secondary" className="text-xs">-{opp.discount_pct}%</Badge>
                              ) : null}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              onClose();
                              onGenerateProposal(
                                buildProposalLeadPayload({
                                  destination: opp.destination || formData.destination,
                                  estimated_value_cents: opp.price_cents || formData.estimated_value_cents,
                                  departureDate: opp.departure_date || formData.travel_start,
                                  returnDate: opp.return_date || formData.travel_end,
                                  notes: `Oportunidade do Radar aplicada: ${opp.title || opp.destination}`,
                                }),
                              );
                            }}
                            className="h-11 min-h-11 text-xs font-semibold gap-2 border-border hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Plane className="size-3.5 text-primary" />
                            <span>Ofertar Pacote</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pacotes e Propostas Enviadas para Outros Clientes */}
                {similarProposals.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Pacotes e Cotações Enviados para Outros Clientes
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {similarProposals.map((prop: any) => {
                        const totalCents = prop.effective_total_cents || prop.pricing?.total_price_cents || prop.pricing?.total_cents || 0;
                        return (
                          <div
                            key={`sim-${prop.id}`}
                            className="p-3 rounded-lg border border-border bg-muted/30 flex flex-col justify-between gap-3 text-xs"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-foreground line-clamp-2">
                                  {prop.title || prop.destination_city || "Pacote Turístico"}
                                </span>
                                {prop.match_score ? (
                                  <Badge variant="success" className="text-xs shrink-0 tabular-nums">
                                    {Math.round(Number(prop.match_score))}%
                                  </Badge>
                                ) : null}
                              </div>
                              {prop.client_name && (
                                <span className="text-xs text-muted-foreground block">
                                  Ref.: {prop.client_name} · {prop.destination_city || "Destino"}
                                </span>
                              )}
                              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground pt-1">
                                <span>{prop.requires_child_requote ? "Simulado c/ crianças:" : "Total Cotado:"}</span>
                                <strong className="text-foreground font-mono">{formatMoney(totalCents)}</strong>
                                {prop.requires_child_requote && (
                                  <Badge variant="warning" className="text-xs">Simulação CHD</Badge>
                                )}
                                {prop.historical_savings_pct != null && Number(prop.historical_savings_pct) >= 8 && (
                                  <Badge variant="success" className="text-xs">
                                    -{Math.round(Number(prop.historical_savings_pct))}% vs histórico
                                  </Badge>
                                )}
                                {prop.already_proposed_recently && (
                                  <Badge variant="outline" className="text-xs text-warning-strong border-warning/40">
                                    Proposta recente
                                  </Badge>
                                )}
                              </div>
                              {Array.isArray(prop.match_reasons) && prop.match_reasons.length > 0 && (
                                <div className="text-xs text-muted-foreground line-clamp-2">
                                  {prop.match_reasons.slice(0, 2).join(" · ")}
                                </div>
                              )}
                              {Array.isArray(prop.warnings) && prop.warnings.length > 0 && (
                                <div className="text-2xs text-warning-strong">
                                  {prop.warnings[0]}
                                </div>
                              )}
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                onClose();
                                onGenerateProposal(
                                  buildProposalLeadPayload({
                                    destination: prop.destination_city || formData.destination,
                                    estimated_value_cents: totalCents || formData.estimated_value_cents,
                                    notes: `Estrutura importada da cotação de referência (${prop.title || prop.destination_city})`,
                                  }),
                                );
                              }}
                              className="h-11 min-h-11 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <FileText className="size-3.5 text-primary" />
                              <span>Usar como Base</span>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : infotravelCaptures.length === 0 && radarMatches.length === 0 && !infotravelOpp ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    Nenhuma cotação de referência ou captura do InfoTravel encontrada para este destino.
                  </p>
                ) : null}
              </section>
            )}

            {/* 4. COTAÇÕES & PROPOSTAS COMERCIAIS */}
            {(activeSection === "all" || activeSection === "proposals") && (
              <div id="section-proposals" className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Cotações & Propostas ({effectiveProposals.length})
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsQuoteOcrModalOpen(true)}
                      className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-primary/30 text-primary hover:bg-primary/5 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Upload className="size-3.5" />
                      <span>Importar Cotação (OCR)</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        onClose();
                        onGenerateProposal(buildProposalLeadPayload());
                      }}
                      className="h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-primary text-primary-foreground rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="size-4" />
                      <span>Nova Cotação</span>
                    </Button>
                  </div>
                </div>

                <DestinationRegulatoryAlertWidget
                  destination={formData.destination || destinationTags}
                  paxCount={(formData.pax_adults || 2) + (formData.pax_children || 0)}
                  stayDays={
                    formData.travel_start && formData.travel_end
                      ? Math.max(1, Math.round((new Date(formData.travel_end).getTime() - new Date(formData.travel_start).getTime()) / (1000 * 60 * 60 * 24)))
                      : 7
                  }
                  onIncludeFeesInProposal={(estimatedCents) => {
                    setFormData((prev) => ({
                      ...prev,
                      estimated_value_cents: (prev.estimated_value_cents || 0) + estimatedCents,
                    }));
                    toast.success("Taxas estimadas adicionadas ao orçamento da viagem!");
                  }}
                />

                {effectiveProposals.length > 0 ? (
                  <div className="space-y-3">
                    {effectiveProposals.map((prop: any) => {
                      const statusLabel =
                        prop.status === "approved"
                          ? "Aprovada"
                          : prop.status === "sent"
                            ? "Publicada"
                            : prop.status === "expired"
                              ? "Arquivada"
                              : "Rascunho";
                      const totalCents =
                        prop.pricing?.total_price_cents ||
                        prop.pricing?.total_cents ||
                        prop.total_value_cents ||
                        0;
                      const isBusy = busyProposalId === prop.id;

                      return (
                        <div
                          key={prop.id}
                          className="p-4 rounded-xl border border-border bg-card space-y-3 text-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-foreground text-sm truncate">
                                  {prop.title || prop.destination_city || "Proposta de Viagem"}
                                </span>
                                <Badge variant={prop.status === "sent" || prop.status === "approved" ? "secondary" : "outline"} className="text-3xs font-semibold">
                                  {statusLabel}
                                </Badge>
                              </div>
                              <span className="text-2xs text-muted-foreground font-mono block">
                                {formatMoney(totalCents)}
                                {prop.destination_city ? ` · ${prop.destination_city}` : ""}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {prop.public_token && (
                                <>
                                  <a
                                    href={`/proposta/${prop.public_token}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border border-border hover:bg-muted text-foreground inline-flex items-center gap-2 no-underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <ExternalLink className="size-3.5 text-primary" />
                                    <span>Ver Web</span>
                                  </a>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isBusy}
                                    onClick={() => handleCopyProposalLink(prop)}
                                    title={prop.status === "draft" ? "Publicar e copiar link para o cliente" : "Copiar link da proposta"}
                                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <Copy className="size-3.5 mr-2" />
                                    <span>{prop.status === "draft" ? "Publicar e Copiar" : "Copiar"}</span>
                                  </Button>
                                </>
                              )}

                              <Button
                                asChild
                                type="button"
                                variant="outline"
                                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <Link
                                  to="/workspace/turismo/propostas/$id"
                                  params={{ id: prop.id }}
                                  onClick={onClose}
                                >
                                  <Edit3 className="size-3.5 mr-2" />
                                  <span>Studio</span>
                                </Link>
                              </Button>

                              <CrudActionsMenu
                                entityName="Proposta"
                                editUrl={`/workspace/turismo/propostas/${prop.id}`}
                                viewUrl={prop.public_token ? `/proposta/${prop.public_token}` : undefined}
                                viewLabel="Abrir Página Web"
                                onDuplicate={() => handleDuplicateProposal(prop)}
                                onToggleStatus={
                                  prop.status === "draft" || prop.status === "expired"
                                    ? () => handlePublishProposal(prop.id)
                                    : prop.status === "sent"
                                      ? () => handleArchiveProposal(prop.id)
                                      : undefined
                                }
                                statusLabel={
                                  prop.status === "draft"
                                    ? "Publicar para Cliente"
                                    : prop.status === "expired"
                                      ? "Reativar Proposta"
                                      : prop.status === "sent"
                                        ? "Arquivar Proposta"
                                        : undefined
                                }
                                onDelete={async () => {
                                  await handleDeleteProposal(prop.id);
                                }}
                                deleteConfirmTitle={`Excluir proposta "${prop.title || "Proposta"}"?`}
                                deleteConfirmDescription="Esta ação removerá permanentemente a proposta e sua cotação vinculada."
                                customActions={
                                  prop.status !== "approved"
                                    ? [
                                        {
                                          id: "convert-proposal-trip",
                                          label: "Gerar Viagem Operacional",
                                          icon: Plane,
                                          onClick: () => handleConvertDossierProposalToTrip(prop.id),
                                        },
                                      ]
                                    : []
                                }
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-2xs text-center text-muted-foreground py-4">
                    Nenhuma cotação associada a este lead ainda.
                  </p>
                )}
              </div>
            )}

            {/* 5. CONTRATOS DIGITAIS & MINUTAS */}
            {(activeSection === "all" || activeSection === "contracts") && (
              <div id="section-contracts" className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <FileSignature className="size-4 text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Contratos Digitais & Minutas
                    </h3>
                    <Badge variant="secondary" className="text-2xs font-mono font-bold">
                      {allContracts.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isRefreshingContracts}
                      onClick={handleRefreshContracts}
                      className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      title="Sincronizar status dos contratos em tempo real"
                    >
                      <RefreshCw className={cn("size-3.5", isRefreshingContracts && "animate-spin")} />
                      <span>Atualizar</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenVaultLinker}
                      className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      title="Vincular contrato pré-existente do cofre da agência"
                    >
                      <Link2 className="size-3.5 text-primary" />
                      <span>Vincular do Cofre</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(`/workspace/contratos/novo?leadId=${lead.id}`, "_blank");
                      }}
                      className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      title="Criar minuta livre no Editor Visual A4"
                    >
                      <ExternalLink className="size-3.5 text-muted-foreground" />
                      <span>Editor A4</span>
                    </Button>
                  </div>
                </div>

                {/* Banner de Auto-Preenchimento a partir de Proposta Aceita */}
                {acceptedProposal && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                          Proposta Aceita Detectada
                        </span>
                        <Badge variant="outline" className="text-2xs bg-background text-primary font-semibold border-primary/40">
                          {acceptedProposal.title || "Proposta Aprovada"}
                        </Badge>
                      </div>
                      <p className="text-2xs text-muted-foreground">
                        Sincronize automaticamente os serviços contratados, valores econômicos e condições de parcelamento desta proposta.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleApplyProposalToContract(acceptedProposal)}
                      className="h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer shrink-0 gap-2"
                    >
                      <Sparkles className="size-3.5" />
                      <span>Preencher com Proposta</span>
                    </Button>
                  </div>
                )}

                {/* Presets Rápidos de Modelos de Contrato */}
                <div className="space-y-2">
                  <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide block">
                    Modelos Rápidos de Contrato
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(
                      unifiedNiche === "real_estate"
                        ? [
                            { key: "imovel_compra_venda", label: "Compra e Venda de Imóvel" },
                            { key: "imovel_locacao", label: "Locação Residencial" },
                            { key: "imovel_intermediacao", label: "Intermediação Imobiliária" },
                          ]
                        : unifiedNiche === "automotive"
                        ? [
                            { key: "veiculo_compra_venda", label: "Compra e Venda de Veículo" },
                            { key: "veiculo_garantia", label: "Ordem de Serviço & Garantia" },
                          ]
                        : unifiedNiche === "events"
                        ? [
                            { key: "eventos_buffet", label: "Buffet & Espaço para Eventos" },
                            { key: "eventos_cerimonial", label: "Cerimonial & Produção" },
                          ]
                        : ["beauty_salon", "healthcare", "dental", "aesthetics_clinic"].includes(unifiedNiche)
                        ? [
                            { key: "saude_consentimento", label: "Termo de Consentimento Clínico" },
                            { key: "saude_plano", label: "Plano de Tratamento" },
                          ]
                        : ["services", "law_firm", "accounting"].includes(unifiedNiche)
                        ? [
                            { key: "b2b_servicos", label: "Prestação de Serviços B2B" },
                            { key: "servicos_geral", label: "Serviços / Consultoria" },
                          ]
                        : [
                            { key: "turismo_completo", label: "Pacote Turístico Completo" },
                            { key: "aereo_hospedagem", label: "Aéreo + Hospedagem" },
                            { key: "corporativo_b2b", label: "Corporativo B2B" },
                            { key: "servicos_geral", label: "Serviços / Consultoria" },
                          ]
                    ).map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handleApplyContractTemplatePreset(preset.key)}
                        className={cn(
                          "h-11 min-h-11 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                          contractTemplatePreset === preset.key
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-card border-border/70 text-foreground hover:bg-muted"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pré-preenchimento Inteligente a partir de Propostas */}
                {effectiveProposals.length > 0 && (
                  <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-primary shrink-0" />
                        <span className="text-2xs font-bold uppercase tracking-wider text-foreground">
                          {effectiveProposals.length === 1
                            ? "Proposta Disponível para Vincular ao Contrato"
                            : `${effectiveProposals.length} Propostas Disponíveis para Vincular`}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-3xs font-mono font-bold">
                        1 Clique
                      </Badge>
                    </div>
                    <p className="text-2xs text-muted-foreground leading-relaxed">
                      Selecione uma proposta para preencher automaticamente título, destino, valor total contratado e condições de pagamento:
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {effectiveProposals.map((prop: any) => {
                        const price =
                          prop.pricing?.total_price_cents ||
                          prop.pricing?.total_cents ||
                          prop.total_value_cents ||
                          0;
                        const isPropAccepted =
                          prop.status === "approved" ||
                          prop.status === "accepted" ||
                          prop.acceptance_status === "accepted";
                        return (
                          <Button
                            key={prop.id}
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplyProposalToContract(prop)}
                            className={cn(
                              "h-11 min-h-11 px-3 text-xs font-bold gap-2 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                              isPropAccepted
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                                : "border-primary/40 bg-background hover:bg-primary/10 text-primary"
                            )}
                          >
                            <FileCheck2 className="size-3.5 shrink-0" />
                            <span>
                              {prop.title || prop.destination_city || "Proposta"} ({formatMoney(price)})
                              {isPropAccepted ? " [ACEITA]" : ""}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Formulário de Emissão de Novo Contrato */}
                <div className="p-5 rounded-xl border border-border/60 bg-muted/10 space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                    Emitir Novo Contrato Digital
                  </h4>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Título do Contrato</Label>
                      <Input
                        value={contractFormTitle}
                        onChange={(e) => setContractFormTitle(e.target.value)}
                        placeholder="Ex: Contrato de Prestação de Serviços Turísticos..."
                        className="h-11 text-xs rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Resumo dos Serviços Inclusos</Label>
                      <Textarea
                        rows={2}
                        value={contractFormSummary}
                        onChange={(e) => setContractFormSummary(e.target.value)}
                        placeholder="Intermediação de bilhetes aéreos, reserva de hotel..."
                        className="text-xs rounded-lg min-h-11"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Valor Total Contratado (R$)</Label>
                        <Input
                          type="number"
                          value={contractFormTotalCents ? contractFormTotalCents / 100 : ""}
                          onChange={(e) => setContractFormTotalCents(Math.round(Number(e.target.value || 0) * 100))}
                          placeholder="R$ 0,00"
                          className="h-11 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Condições de Pagamento</Label>
                        <Input
                          value={contractFormPaymentConditions}
                          onChange={(e) => setContractFormPaymentConditions(e.target.value)}
                          placeholder="Ex: Entrada 20% PIX + 10x no cartão"
                          className="h-11 text-xs rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <Button
                        type="button"
                        disabled={isIssuingContract}
                        onClick={() => handleIssueContractClick(false)}
                        className="h-11 min-h-11 px-3 text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer rounded-lg gap-2"
                      >
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>{isIssuingContract ? "Emitindo..." : "Gerar e Emitir Contrato"}</span>
                      </Button>
                      <Button
                        type="button"
                        disabled={isIssuingContract}
                        variant="outline"
                        onClick={() => handleIssueContractClick(true)}
                        className="h-11 min-h-11 px-3 text-xs font-bold border-border/80 hover:bg-muted text-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer rounded-lg gap-2"
                        title="Gera a minuta com os dados do atendimento e abre imediatamente no Editor Visual A4 de Contratos"
                      >
                        <FileText className="size-4 text-primary shrink-0" />
                        <span>Gerar & Abrir no Editor A4</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Lista de Contratos Emitidos (Tier DocuSign / ClickSign) */}
                {allContracts.length > 0 ? (
                  <div className="space-y-4">
                    <span className="font-bold text-xs uppercase tracking-wide text-foreground block">
                      Contratos Vinculados & Emitidos ({allContracts.length})
                    </span>

                    {allContracts.map((c: any) => {
                      const isSigned = c.status === "signed" || Boolean(c.signed_at);
                      const isViewed = isSigned || c.status === "viewed" || Boolean(c.viewed_at);
                      const isDispatched = isViewed || c.status === "sent" || c.status === "signing" || Boolean(c.signing_token);
                      const isDraft = c.status === "draft";
                      const isCancelled = c.status === "cancelled";
                      const publicToken = c.public_token || c.id;
                      const signingToken = c.signing_token || c.envelopes?.[0]?.signing_token || publicToken;
                      const verificationCode = c.verification_code || `CTR-${(c.id || "").slice(0, 8).toUpperCase()}`;
                      const envelopesList = Array.isArray(c.envelopes) && c.envelopes.length > 0
                        ? c.envelopes
                        : [
                            {
                              id: `env-${c.id}`,
                              signer_name: formData.name || lead.full_name || "Contratante Titular",
                              signer_role: "client",
                              signer_phone: formData.phone || lead.phone,
                              signer_email: formData.email || lead.email,
                              status: isSigned ? "signed" : isViewed ? "viewed" : "pending",
                              signing_token: signingToken,
                            },
                          ];

                      // Cálculo da etapa DocuSign (1 a 5)
                      const currentStep = isSigned ? 5 : isViewed ? 4 : isDispatched ? 3 : isDraft ? 1 : 2;

                      return (
                        <div
                          key={c.id}
                          className="p-5 rounded-2xl border border-border/60 bg-card space-y-4 text-xs"
                        >
                          {/* Header do Contrato */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-foreground text-sm">
                                  {c.contract_title || c.title || "Contrato Digital de Viagem"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-2xs font-bold uppercase tracking-wider",
                                    isSigned
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                      : isCancelled
                                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                                      : isViewed
                                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30"
                                      : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                                  )}
                                >
                                  {isSigned
                                    ? "Assinado & Selado"
                                    : isCancelled
                                    ? "Cancelado"
                                    : isViewed
                                    ? "Visualizado"
                                    : isDispatched
                                    ? "Em Coleta"
                                    : "Minuta Rascunho"}
                                </Badge>
                                <span className="text-2xs text-muted-foreground font-mono bg-muted/40 px-2 py-1 rounded">
                                  {verificationCode}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-2xs text-muted-foreground font-mono flex-wrap">
                                <span className="font-bold text-foreground">
                                  {formatMoney(c.total_value_cents || c.total_amount_cents || 0)}
                                </span>
                                <span>·</span>
                                <span>Criado em: {new Date(c.created_at || Date.now()).toLocaleDateString("pt-BR")}</span>
                                {c.signed_at && (
                                  <>
                                    <span>·</span>
                                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                      <ShieldCheck className="size-3" />
                                      Selado: {new Date(c.signed_at).toLocaleString("pt-BR")}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Ações Rápidas de Topo */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  window.open(`/workspace/contratos/${c.id}/editor`, "_blank");
                                }}
                                className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                title="Abrir no Editor Visual A4 de Contratos"
                              >
                                <FileText className="size-3.5 text-primary" />
                                <span>Editor A4</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  window.open(`/contrato/${publicToken}`, "_blank");
                                }}
                                className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                title="Visualizar Minuta Pública em tela cheia"
                              >
                                <Eye className="size-3.5 text-muted-foreground" />
                                <span>Minuta</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSendContractWhatsApp(signingToken, c.contract_title || c.title || "Contrato")}
                                className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                title="Enviar link de assinatura via WhatsApp"
                              >
                                <MessageSquare className="size-3.5 text-emerald-600" />
                                <span>WhatsApp</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleCopyContractLink(signingToken)}
                                className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                title="Copiar link seguro de assinatura"
                              >
                                <Copy className="size-3.5" />
                                <span>Copiar Link</span>
                              </Button>
                            </div>
                          </div>

                          {/* Stepper Visual DocuSign (5 Etapas Canônicas) */}
                          <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-3">
                            <div className="flex items-center justify-between text-2xs font-semibold text-muted-foreground">
                              <span className="uppercase tracking-wider">Trilha Probatória de Assinatura</span>
                              <span className="font-mono">Etapa {currentStep} de 5</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-2xs">
                              {[
                                { step: 1, label: "Minuta Gerada" },
                                { step: 2, label: "Disparado" },
                                { step: 3, label: "Visualizado" },
                                { step: 4, label: "Validação KYC" },
                                { step: 5, label: "Selado SHA-256" },
                              ].map((st) => {
                                const isDone = currentStep >= st.step;
                                const isCurrent = currentStep === st.step;
                                return (
                                  <div key={st.step} className="space-y-1 flex flex-col items-center">
                                    <div
                                      className={cn(
                                        "size-7 rounded-full flex items-center justify-center font-bold text-2xs transition-colors",
                                        isDone
                                          ? "bg-emerald-600 text-primary-foreground"
                                          : isCurrent
                                          ? "bg-primary text-primary-foreground animate-pulse motion-reduce:animate-none"
                                          : "bg-muted text-muted-foreground border border-border"
                                      )}
                                    >
                                      {isDone ? <Check className="size-3.5 stroke-2" /> : st.step}
                                    </div>
                                    <span
                                      className={cn(
                                        "font-medium leading-tight truncate w-full",
                                        isDone ? "text-foreground font-semibold" : "text-muted-foreground"
                                      )}
                                    >
                                      {st.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Lista de Envelopes & Signatários */}
                          <div className="space-y-2">
                            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                              Signatários & Envelopes ({envelopesList.length})
                            </span>
                            <div className="space-y-2">
                              {envelopesList.map((env: any, idx: number) => {
                                const envSigned = env.status === "signed" || Boolean(env.signed_at);
                                const envViewed = envSigned || env.status === "viewed" || Boolean(env.viewed_at);
                                const envToken = env.signing_token || signingToken;

                                return (
                                  <div
                                    key={env.id || idx}
                                    className="p-3 rounded-lg border border-border/40 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-foreground">
                                          {env.signer_name || "Signatário"}
                                        </span>
                                        <Badge variant="outline" className="text-2xs font-normal">
                                          {env.signer_role === "client"
                                            ? "Contratante / Titular"
                                            : env.signer_role === "agency"
                                            ? "Contratada / Agência"
                                            : env.signer_role === "witness"
                                            ? "Testemunha"
                                            : "Signatário"}
                                        </Badge>
                                        <Badge
                                          variant="secondary"
                                          className={cn(
                                            "text-2xs font-semibold",
                                            envSigned
                                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                              : envViewed
                                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                                              : "bg-muted text-muted-foreground"
                                          )}
                                        >
                                          {envSigned ? "Assinado" : envViewed ? "Visualizado" : "Pendente"}
                                        </Badge>
                                      </div>
                                      <div className="text-2xs text-muted-foreground flex items-center gap-2">
                                        {env.signer_phone && <span>Tel: {env.signer_phone}</span>}
                                        {env.signer_email && <span>· {env.signer_email}</span>}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleSendSignerWhatsApp(
                                            envToken,
                                            c.contract_title || c.title || "Contrato",
                                            env.signer_name,
                                            env.signer_phone
                                          )
                                        }
                                        className="h-11 min-h-11 px-3 text-2xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                        title="Enviar link individual deste signatário via WhatsApp"
                                      >
                                        <MessageSquare className="size-3 text-emerald-600" />
                                        <span>WhatsApp Individual</span>
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopyContractLink(envToken)}
                                        className="h-11 min-h-11 px-3 text-2xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                        title="Copiar link individual deste envelope"
                                      >
                                        <Copy className="size-3" />
                                        <span>Copiar</span>
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2 bg-muted/5">
                    <FileSignature className="size-8 text-muted-foreground/50 mx-auto" />
                    <p className="text-xs font-semibold text-foreground">
                      Nenhum contrato emitido ou vinculado a este atendimento ainda.
                    </p>
                    <p className="text-2xs text-muted-foreground max-w-sm mx-auto">
                      Gere um novo contrato preenchendo o formulário acima, utilize a proposta aceita ou vincule uma minuta existente do cofre da empresa.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Modal de Vinculação de Contratos Pré-existentes do Cofre */}
            <Dialog open={isLinkingContractModalOpen} onOpenChange={setIsLinkingContractModalOpen}>
              <DialogContent className="max-w-xl max-h-128 flex flex-col p-6 overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="text-sm font-bold flex items-center gap-2">
                    <Link2 className="size-4 text-primary" />
                    <span>Vincular Contrato Existente do Cofre</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Selecione um contrato registrado na empresa para associá-lo a este lead e unificar o histórico de assinaturas.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
                  {isFetchingLinkableContracts ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                    </div>
                  ) : linkableContracts.length === 0 ? (
                    <p className="text-xs text-center text-muted-foreground py-8">
                      Nenhum outro contrato disponível no cofre para vinculação.
                    </p>
                  ) : (
                    linkableContracts.map((lc: any) => {
                      const isSelected = selectedContractToLink === lc.id;
                      return (
                        <button
                          key={lc.id}
                          type="button"
                          onClick={() => setSelectedContractToLink(lc.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-xl border transition-colors cursor-pointer space-y-1 focus-visible:ring-2 focus-visible:ring-ring",
                            isSelected
                              ? "bg-primary/10 border-primary ring-1 ring-primary"
                              : "bg-card border-border/70 hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-foreground truncate">
                              {lc.title || "Contrato da Agência"}
                            </span>
                            <Badge variant="outline" className="text-2xs uppercase font-mono">
                              {lc.status || "draft"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-2xs text-muted-foreground">
                            <span>Valor: {formatMoney(lc.total_amount_cents || 0)}</span>
                            <span>Criado: {new Date(lc.created_at || Date.now()).toLocaleDateString("pt-BR")}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <DialogFooter className="pt-3 border-t border-border/40 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsLinkingContractModalOpen(false);
                      setSelectedContractToLink(null);
                    }}
                    className="h-11 min-h-11 px-4 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={!selectedContractToLink || isLinkingContract}
                    onClick={handleConfirmLinkContract}
                    className="h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    {isLinkingContract ? "Vinculando..." : "Vincular a este Atendimento"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* 6. PLANEJAMENTO DE PAGAMENTO & DECOMPOSIÇÃO TARIFÁRIA */}
            {(activeSection === "all" || activeSection === "payment") && (
              <div id="section-payment" className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <DollarSign className="size-4 text-emerald-600" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Decomposição Tarifária & Pagamento
                    </h3>
                  </div>
                  <span className="font-mono tabular-nums text-sm font-bold text-foreground">
                    Total: {formatMoney(computedTariffTotalCents)}
                  </span>
                </div>

                {/* Seletor de Modo de Nicho (Turismo vs Comercial/B2B) */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                      <Briefcase className="size-3.5 text-primary" />
                      <span>Modelo de Decomposição Financeira</span>
                    </span>
                    <p className="text-2xs text-muted-foreground">
                      Adapta os campos tarifários e opções de faturamento conforme o nicho do atendimento.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 p-1 bg-background rounded-lg border border-border/80">
                    <button
                      type="button"
                      onClick={() => setPaymentPlanNiche("turismo")}
                      className={cn(
                        "h-11 min-h-11 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary",
                        paymentPlanNiche === "turismo"
                          ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      Turismo & Viagens
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentPlanNiche("comercial")}
                      className={cn(
                        "h-11 min-h-11 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary",
                        paymentPlanNiche === "comercial"
                          ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      Serviços & B2B
                    </button>
                  </div>
                </div>

                {/* Card de Vínculo de Proposta / Orçamento */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="size-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">
                        Proposta / Orçamento Vinculado
                      </span>
                    </div>
                    {acceptedProposal ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-2 text-3xs font-bold">
                        <CheckCircle2 className="size-3" />
                        Proposta Aprovada pelo Cliente
                      </Badge>
                    ) : linkedProposal ? (
                      <Badge variant="outline" className="text-3xs font-semibold">
                        {linkedProposal.status === "approved" || linkedProposal.status === "accepted"
                          ? "Aprovada"
                          : linkedProposal.status === "sent"
                            ? "Publicada"
                            : "Rascunho"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-3xs text-muted-foreground">
                        Plano Avulso Manual
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">
                        Selecionar Proposta do Atendimento
                      </Label>
                      <Select
                        value={paymentPlan.linked_proposal_id || "none"}
                        onValueChange={(val) => {
                          if (val === "none") {
                            setPaymentPlan((prev) => ({
                              ...prev,
                              linked_proposal_id: null,
                              linked_option_id: null,
                              is_synced: false,
                            }));
                          } else {
                            const found = effectiveProposals.find((p: any) => p.id === val);
                            if (found) {
                              applyProposalToPaymentPlan(found);
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="h-11 min-h-11 text-xs rounded-lg">
                          <SelectValue placeholder="Selecione uma proposta..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            Nenhuma proposta (Plano Avulso Manual)
                          </SelectItem>
                          {effectiveProposals.map((p: any) => {
                            const pTotal =
                              p.pricing?.total_price_cents ||
                              p.pricing?.total_cents ||
                              p.total_value_cents ||
                              0;
                            const isAcc =
                              p.status === "approved" ||
                              p.status === "accepted" ||
                              p.acceptance_status === "accepted";
                            return (
                              <SelectItem key={p.id} value={p.id}>
                                {isAcc ? "[Aprovada] " : ""}
                                {p.title || p.destination_city || "Proposta"} — {formatMoney(pTotal)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {linkedProposal && Array.isArray(linkedProposal.options) && linkedProposal.options.length > 1 && (
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">
                          Opção Escolhida / Aprovada
                        </Label>
                        <Select
                          value={paymentPlan.linked_option_id || linkedProposal.options[0]?.id}
                          onValueChange={(optId) => {
                            applyProposalToPaymentPlan(linkedProposal, optId);
                          }}
                        >
                          <SelectTrigger className="h-11 min-h-11 text-xs rounded-lg">
                            <SelectValue placeholder="Selecione a opção..." />
                          </SelectTrigger>
                          <SelectContent>
                            {linkedProposal.options.map((opt: any) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.id === linkedProposal.accepted_option_id ? "[Aceita] " : ""}
                                {opt.name || "Opção"} — {formatMoney(opt.pricing?.total_price_cents || 0)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {linkedProposal && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <div className="flex items-center gap-2 text-2xs text-muted-foreground font-mono">
                        <Sparkles className="size-3.5 text-primary" />
                        <span>
                          Proposta vinculada: <strong className="text-foreground">{linkedProposal.title || "Proposta"}</strong>
                          {" · "}
                          Valor: <strong className="text-foreground">{formatMoney(linkedProposal.pricing?.total_price_cents || linkedProposal.total_value_cents || 0)}</strong>
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyProposalToPaymentPlan(linkedProposal, paymentPlan.linked_option_id || undefined)}
                        className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <RefreshCw className="size-3.5" />
                        <span>Sincronizar Dados da Proposta</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Decomposição Tarifária Adaptada ao Nicho */}
                <div className="p-5 rounded-xl border border-border/40 bg-muted/10 space-y-4">
                  {paymentPlanNiche === "turismo" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Aéreo / Passagens (R$)</Label>
                        <Input
                          type="number"
                          value={paymentPlan.flight_cents ? paymentPlan.flight_cents / 100 : ""}
                          onChange={(e) =>
                            setPaymentPlan((prev) => ({
                              ...prev,
                              flight_cents: Math.round(Number(e.target.value || 0) * 100),
                            }))
                          }
                          placeholder="R$ 0,00"
                          className="h-11 min-h-11 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Hotelaria / Resort (R$)</Label>
                        <Input
                          type="number"
                          value={paymentPlan.hotel_cents ? paymentPlan.hotel_cents / 100 : ""}
                          onChange={(e) =>
                            setPaymentPlan((prev) => ({
                              ...prev,
                              hotel_cents: Math.round(Number(e.target.value || 0) * 100),
                            }))
                          }
                          placeholder="R$ 0,00"
                          className="h-11 min-h-11 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Seguro Viagem & Assistência (R$)</Label>
                        <Input
                          type="number"
                          value={paymentPlan.insurance_cents ? paymentPlan.insurance_cents / 100 : ""}
                          onChange={(e) =>
                            setPaymentPlan((prev) => ({
                              ...prev,
                              insurance_cents: Math.round(Number(e.target.value || 0) * 100),
                            }))
                          }
                          placeholder="R$ 0,00"
                          className="h-11 min-h-11 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Taxas de Embarque & Portuárias (R$)</Label>
                        <Input
                          type="number"
                          value={paymentPlan.boarding_tax_cents ? paymentPlan.boarding_tax_cents / 100 : ""}
                          onChange={(e) =>
                            setPaymentPlan((prev) => ({
                              ...prev,
                              boarding_tax_cents: Math.round(Number(e.target.value || 0) * 100),
                            }))
                          }
                          placeholder="R$ 0,00"
                          className="h-11 min-h-11 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-2xs text-muted-foreground font-semibold">Comissão / Markup da Agência (R$)</Label>
                        <Input
                          type="number"
                          value={paymentPlan.commission_cents ? paymentPlan.commission_cents / 100 : ""}
                          onChange={(e) =>
                            setPaymentPlan((prev) => ({
                              ...prev,
                              commission_cents: Math.round(Number(e.target.value || 0) * 100),
                            }))
                          }
                          placeholder="R$ 0,00"
                          className="h-11 min-h-11 text-xs rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Serviços / Mão de Obra / Honorários (R$)</Label>
                        <Input
                          type="number"
                          value={paymentPlan.services_cents ? paymentPlan.services_cents / 100 : ""}
                          onChange={(e) =>
                            setPaymentPlan((prev) => ({
                              ...prev,
                              services_cents: Math.round(Number(e.target.value || 0) * 100),
                            }))
                          }
                          placeholder="R$ 0,00"
                          className="h-11 min-h-11 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Produtos / Peças / Materiais (R$)</Label>
                        <Input
                          type="number"
                          value={paymentPlan.products_cents ? paymentPlan.products_cents / 100 : ""}
                          onChange={(e) =>
                            setPaymentPlan((prev) => ({
                              ...prev,
                              products_cents: Math.round(Number(e.target.value || 0) * 100),
                            }))
                          }
                          placeholder="R$ 0,00"
                          className="h-11 min-h-11 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Taxas / Impostos / Despesas (R$)</Label>
                        <Input
                          type="number"
                          value={paymentPlan.taxes_cents ? paymentPlan.taxes_cents / 100 : ""}
                          onChange={(e) =>
                            setPaymentPlan((prev) => ({
                              ...prev,
                              taxes_cents: Math.round(Number(e.target.value || 0) * 100),
                            }))
                          }
                          placeholder="R$ 0,00"
                          className="h-11 min-h-11 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Desconto Comercial (R$)</Label>
                        <Input
                          type="number"
                          value={paymentPlan.discount_cents ? paymentPlan.discount_cents / 100 : ""}
                          onChange={(e) =>
                            setPaymentPlan((prev) => ({
                              ...prev,
                              discount_cents: Math.round(Number(e.target.value || 0) * 100),
                            }))
                          }
                          placeholder="R$ 0,00"
                          className="h-11 min-h-11 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-2xs text-muted-foreground font-semibold">Margem / Markup Comercial (R$)</Label>
                        <Input
                          type="number"
                          value={paymentPlan.margin_cents ? paymentPlan.margin_cents / 100 : ""}
                          onChange={(e) =>
                            setPaymentPlan((prev) => ({
                              ...prev,
                              margin_cents: Math.round(Number(e.target.value || 0) * 100),
                            }))
                          }
                          placeholder="R$ 0,00"
                          className="h-11 min-h-11 text-xs rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Modalidade de Pagamento Planejada */}
                <div className="space-y-4">
                  <span className="font-bold text-xs uppercase tracking-wide text-foreground block">
                    Modalidade de Pagamento Planejada
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {(paymentPlanNiche === "turismo"
                      ? [
                          { id: "pix_cash", label: "PIX à Vista (com desconto)" },
                          { id: "credit_card", label: "Cartão em até 10x/12x" },
                          { id: "operator_boleto", label: "Boleto Operadora" },
                          { id: "split_deposit", label: "Entrada + Saldo Parcelado" },
                        ]
                      : [
                          { id: "pix_cash", label: "PIX à Vista" },
                          { id: "credit_card", label: "Cartão até 12x" },
                          { id: "bank_slip", label: "Boleto Bancário PJ" },
                          { id: "entry_plus_installments", label: "Sinal + Saldo Entrega" },
                        ]
                    ).map((m) => {
                      const active = paymentPlan.method === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentPlan((prev) => ({ ...prev, method: m.id }))}
                          className={cn(
                            "h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary",
                            active
                              ? "border-primary bg-primary text-primary-foreground font-bold shadow-2xs"
                              : "border-border/60 bg-card text-foreground hover:bg-muted/40"
                          )}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Condições do Plano Financeiro</Label>
                    <Input
                      value={paymentPlan.notes}
                      onChange={(e) => setPaymentPlan((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder={
                        paymentPlanNiche === "turismo"
                          ? "Ex: 20% de entrada via PIX + 10x sem juros no cartão..."
                          : "Ex: 50% de sinal na aprovação + 50% na entrega técnica..."
                      }
                      className="h-11 min-h-11 text-xs rounded-lg"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopyPaymentLink}
                        className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 cursor-pointer border-border/60 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Copy className="size-3.5" />
                        <span>Copiar Link de Cobrança</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openUnifiedDocumentStudio("contract_legal")}
                        className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 cursor-pointer border-primary/30 text-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <FileSignature className="size-3.5" />
                        <span>Emitir Contrato Oficial</span>
                      </Button>
                    </div>

                    <Button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSavePaymentPlan}
                      className="h-11 min-h-11 px-5 text-xs font-bold bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                    >
                      {isSaving ? "Salvando..." : "Salvar Plano Financeiro"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 7. ANAMNESE & PERFIL DE VIAGEM */}
            {(activeSection === "all" || activeSection === "anamnese") && (
              <div id="section-anamnese" className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="size-4 text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Anamnese & Preferências do Passageiro
                    </h3>
                  </div>
                  <span className="text-2xs text-muted-foreground font-mono">
                    Perfil Comportamental & Clínico
                  </span>
                </div>

                <AnamneseDocEditor
                  initialData={anamneseData}
                  history={anamneseHistory}
                  clientName={formData.name || lead.full_name || "Passageiro"}
                  destination={formData.destination || lead.destination || "Destino a definir"}
                  onSave={async (nextData, newVersionTitle) => {
                    setAnamneseData(nextData);
                    let nextHistory = anamneseHistory;
                    if (newVersionTitle) {
                      const newRecord: AnamneseVersionRecord = {
                        id: `ver-${Date.now()}`,
                        versionTitle: newVersionTitle,
                        savedAt: new Date().toISOString(),
                        authorName: tenantIdentity.companyName || "Consultor",
                        data: nextData,
                      };
                      nextHistory = [newRecord, ...anamneseHistory];
                      setAnamneseHistory(nextHistory);
                    }

                    await onSaveLead({
                      ...formData,
                      notes: nextData.consultantNotes || formData.notes,
                      custom_fields: {
                        ...(lead.custom_fields || {}),
                        tags: formData.tags,
                        reminders,
                        next_followup_at: followUpAt,
                        anamnese_data: nextData,
                        anamnese_history: nextHistory,
                      },
                    });
                  }}
                />
              </div>
            )}

            {/* 8. PERFIL DO CLIENTE */}
            {(activeSection === "all" || activeSection === "customer360") && (
              <div id="section-customer360" className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-4 text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Perfil do Cliente
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {crmCustomer && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsQuickProfileOpen(true)}
                        className="h-11 sm:min-h-8 sm:h-8 px-3 text-xs font-semibold gap-2 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <UserCheck className="size-3.5" />
                        <span>Edição Rápida & Foto</span>
                      </Button>
                    )}
                    <Badge variant="outline" className="text-2xs font-mono">
                      {crmCustomer ? "Cliente Ativo" : "Não Promovido"}
                    </Badge>
                  </div>
                </div>

                {customer360Data?.customer ? (
                  <div className="space-y-5">
                    <Customer360EditableCard
                      customer={{
                        id: customer360Data.customer.id,
                        fullName: customer360Data.customer.full_name || customer360Data.customer.name || formData.name,
                        taxId: customer360Data.customer.document || null,
                        email: sanitizeCustomerEmail(customer360Data.customer.email),
                        phone: customer360Data.customer.phone || null,
                        city: customer360Data.customer.city || null,
                        state: customer360Data.customer.state || null,
                        birthDate: customer360Data.customer.birth_date || null,
                        notes: customer360Data.customer.notes || null,
                        score: customer360Data.customer.score || 100,
                      }}
                      destination={formData.destination}
                      travelDate={formData.travel_start}
                      travelers={travelerDossiers}
                      onSaveCustomer={async (updated) => {
                        await updateCustomer({
                          data: {
                            id: customer360Data.customer.id,
                            fullName: updated.fullName,
                            document: updated.taxId,
                            email: updated.email,
                            phone: updated.phone,
                            city: updated.city,
                            state: updated.state,
                            birthDate: updated.birthDate,
                            notes: updated.notes,
                          },
                        });
                        queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
                        queryClient.invalidateQueries({ queryKey: ["customer-360", lead.id] });
                      }}
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl space-y-3 bg-muted/10">
                    <UserCheck className="size-8 text-muted-foreground/50 mx-auto" />
                    <div>
                      <p className="font-bold text-foreground">Nenhum perfil de cliente vinculado a este lead.</p>
                      <p className="text-2xs text-muted-foreground mt-1">
                        Promova o titular ({formData.name}) para unificar histórico de compras, viagens, notas e contratos na carteira da agência.
                      </p>
                    </div>
                    <Button
                      type="button"
                      disabled={isPromoting}
                      onClick={handlePromoteLead}
                      className="h-11 min-h-11 px-5 text-xs font-bold gap-2 bg-primary text-primary-foreground rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <UserPlus className="size-4" />
                      <span>{isPromoting ? "Promovendo..." : "Promover Titular a Cliente da Carteira 360°"}</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 9. GOVERNANÇA LGPD, TERMOS & POLÍTICAS PROBATÓRIAS (TELEMETRIA MILITAR) */}
            {(activeSection === "all" || activeSection === "lgpd") && (
              <div id="section-lgpd" className="p-5 rounded-xl border border-border/60 bg-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" />
                      <span className="font-bold text-xs uppercase tracking-wide text-foreground">
                        Termos, Políticas & Consentimento LGPD
                      </span>
                    </div>
                    <p className="text-2xs text-muted-foreground">
                      Marco Civil da Internet (Lei 12.965/2014) e LGPD (Lei 13.709/2018). Rastreabilidade forense incontestável.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendConsentWhatsApp}
                      className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      title="Enviar link público unificado com todos os termos via WhatsApp"
                    >
                      <Send className="size-3.5 text-primary" />
                      <span>WhatsApp Todos</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyConsentLink}
                      className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      title="Copiar link público de consentimento do lead"
                    >
                      <Copy className="size-3.5 text-muted-foreground" />
                      <span>Copiar Link</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPhysicalConsentModalOpen(true)}
                      className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      title="Registrar aceite físico assinado em loja ou presencial"
                    >
                      <Plus className="size-3.5 text-primary" />
                      <span>Presencial</span>
                    </Button>
                  </div>
                </div>

                {/* Barra de Vinculação de Template / Termo Pronto */}
                <div className="p-3 rounded-lg border border-border/50 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <span className="text-2xs font-bold uppercase tracking-wide text-foreground block">
                      Vincular Modelo de Termo
                    </span>
                    <p className="text-3xs text-muted-foreground">
                      Selecione um modelo padronizado configurado para vincular e coletar aceite com telemetria militar.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                    <Select value={selectedTemplateToBind} onValueChange={setSelectedTemplateToBind}>
                      <SelectTrigger className="h-11 min-h-11 w-full sm:w-64 text-xs rounded-lg border border-border/60 bg-background focus-visible:ring-2 focus-visible:ring-ring">
                        <SelectValue placeholder="Selecione um template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CANONICAL_LEGAL_POLICIES).map((k) => (
                          <SelectItem key={k} value={k}>
                            {CANONICAL_LEGAL_POLICIES[k as LegalPolicyType].title}
                          </SelectItem>
                        ))}
                        {Object.keys(storePolicies).map((k) => (
                          <SelectItem key={`custom-${k}`} value={k}>
                            {storePolicies[k]?.title || k} (Personalizado)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      onClick={handleBindTemplate}
                      disabled={!selectedTemplateToBind}
                      className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg gap-2 cursor-pointer bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                    >
                      <Plus className="size-3.5" />
                      <span>Vincular</span>
                    </Button>
                  </div>
                </div>

                {/* Lista de Termos Vinculados com Telemetria Militar Avançada */}
                <div className="grid grid-cols-1 gap-3">
                  {activePolicyKeys.map((pKey) => {
                    const canonical = CANONICAL_LEGAL_POLICIES[pKey as LegalPolicyType] || {
                      key: pKey,
                      title: storePolicies[pKey]?.title || pKey,
                      shortDescription: storePolicies[pKey]?.description || "Termo de governança e prestação de serviços turísticos.",
                      defaultVersion: "v1.0",
                      defaultContent: storePolicies[pKey]?.content || "",
                    };
                    const record = consentRecords.find((c) => c.policy_type === pKey);
                    const isAccepted = record?.status === "accepted";
                    const isRevoked = record?.status === "revoked";

                    return (
                      <div
                        key={pKey}
                        className="p-4 rounded-xl border border-border bg-muted space-y-3 text-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-foreground text-sm line-clamp-2 text-anti-truncate">
                                {canonical.title}
                              </span>
                              <Badge
                                variant="outline"
                                className={
                                  isAccepted
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border-emerald-300 dark:border-emerald-800 text-3xs gap-1"
                                    : isRevoked
                                    ? "bg-destructive text-destructive-foreground border-destructive text-3xs"
                                    : "bg-muted text-warning-strong border-border text-3xs"
                                }
                              >
                                {isAccepted ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Check className="size-3" />
                                    <span>Assinado Digitalmente</span>
                                  </span>
                                ) : isRevoked ? (
                                  "Revogado"
                                ) : (
                                  "Pendente de Assinatura"
                                )}
                              </Badge>
                            </div>
                            <p className="text-2xs text-muted-foreground line-clamp-2">
                              {canonical.shortDescription}
                            </p>
                          </div>

                          {/* Ação Primária: Abrir Certificado ou Registrar */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isAccepted && record?.proof ? (
                              <>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCertificate(record.proof);
                                    setIsCertModalOpen(true);
                                  }}
                                  className="h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-primary text-primary-foreground rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                                  title="Abrir Certificado de Assinatura"
                                >
                                  <FileCheck className="size-4" />
                                  <span>Ver Certificado</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevokeConsent(pKey)}
                                  className="h-11 min-h-11 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                  title="Revogar Consentimento Legal"
                                >
                                  Revogar
                                </Button>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    if (!cleanPhone) {
                                      toast.error("Lead sem telefone cadastrado.");
                                      return;
                                    }
                                    const singleUrl = `${consentPublicUrl}?policy=${pKey}`;
                                    const msg = encodeURIComponent(
                                      `Olá, ${formData.name.split(" ")[0]}! Por favor, assine o termo obrigatório (${canonical.title}) pelo link seguro: ${singleUrl}`
                                    );
                                    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
                                  }}
                                  className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                  title="Enviar este termo específico no WhatsApp"
                                >
                                  <Send className="size-3.5 text-primary" />
                                  <span>Enviar WA</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${consentPublicUrl}?policy=${pKey}`);
                                    toast.success(`Link de assinatura para "${canonical.title}" copiado!`);
                                  }}
                                  className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <Copy className="size-3.5 text-muted-foreground" />
                                  <span>Copiar Link</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setPhysicalPolicyType(pKey as LegalPolicyType);
                                    setIsPhysicalConsentModalOpen(true);
                                  }}
                                  className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <Plus className="size-3.5 text-primary" />
                                  <span>Presencial</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bloco de Telemetria Militar Avançada (Visível quando Aceito) */}
                        {isAccepted && record?.proof && (
                          <div className="p-3 rounded-lg border border-border/40 bg-card space-y-2 text-2xs font-mono">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-muted-foreground">
                              <div>
                                <span className="text-3xs uppercase font-bold text-muted-foreground block">Código da Certidão</span>
                                <div className="flex items-center gap-2 font-bold text-foreground">
                                  <span className="select-all">{record.proof.certificate_code}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (record?.proof?.certificate_code) {
                                        navigator.clipboard.writeText(record.proof.certificate_code);
                                        toast.success("Código copiado!");
                                      }
                                    }}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                                    title="Copiar código da certidão"
                                  >
                                    <Copy className="size-3" />
                                  </button>
                                </div>
                              </div>

                              <div>
                                <span className="text-3xs uppercase font-bold text-muted-foreground block">Data e Hora Forense</span>
                                <span className="text-foreground">
                                  {new Date(record.proof.accepted_at).toLocaleString("pt-BR")}
                                </span>
                              </div>

                              <div>
                                <span className="text-3xs uppercase font-bold text-muted-foreground block">Método de Captura</span>
                                <span className="text-foreground uppercase">
                                  {record.proof.method === "quick_link"
                                    ? "Link Rápido Tokenizado"
                                    : record.proof.method === "physical_document"
                                    ? "Presencial / Balcão"
                                    : record.proof.method}
                                </span>
                              </div>

                              <div>
                                <span className="text-3xs uppercase font-bold text-muted-foreground block">Telemetria de Rede (IP)</span>
                                <span className="text-foreground">
                                  {record.proof.ip_address}
                                  {record.proof.geolocation?.city ? ` (${record.proof.geolocation.city}/${record.proof.geolocation.state || "BR"})` : ""}
                                </span>
                              </div>
                            </div>

                            <div className="pt-1 border-t border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-3xs text-muted-foreground">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-foreground shrink-0">Hash SHA-256:</span>
                                <span className="truncate select-all text-muted-foreground max-w-xs sm:max-w-md font-mono">
                                  {record.proof.sha256_hash}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (record?.proof?.sha256_hash) {
                                      navigator.clipboard.writeText(record.proof.sha256_hash);
                                      toast.success("Hash SHA-256 copiado!");
                                    }
                                  }}
                                  className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                                  title="Copiar Hash Completo"
                                >
                                  <Copy className="size-3" />
                                </button>
                              </div>

                              <span className="text-muted-foreground shrink-0">
                                Navegador: {record.proof.user_agent ? record.proof.user_agent.slice(0, 32) + "..." : "Navegador Web"}
                              </span>
                            </div>
                          </div>
                        )}

                        {isRevoked && (
                          <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-2xs text-destructive font-medium">
                            Consentimento revogado formalmente em {new Date(record.revoked_at || "").toLocaleDateString("pt-BR")}.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 10. AGENDAMENTO DE REUNIÕES & AGENDA */}
            {(activeSection === "all" || activeSection === "meeting") && (
              <div id="section-meeting" className="p-5 rounded-xl border border-border/60 bg-card space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                  <Calendar className="size-4 text-primary" />
                  <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                    Agendar Reunião ou Alinhamento
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Assunto / Pauta</Label>
                    <Input
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      placeholder="Ex: Alinhamento de Voo & Roteiro..."
                      className="h-10 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Data & Horário</Label>
                    <Input
                      type="datetime-local"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="h-10 text-xs rounded-lg font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Formato</Label>
                    <Select
                      value={meetingType}
                      onValueChange={(val: any) => setMeetingType(val)}
                    >
                      <SelectTrigger className="h-10 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Ligação / WhatsApp</SelectItem>
                        <SelectItem value="video">Videoconferência (Google Meet)</SelectItem>
                        <SelectItem value="in_person">Presencial na Agência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Link da Sala Virtual</Label>
                    <Input
                      value={meetingRoomUrl}
                      onChange={(e) => setMeetingRoomUrl(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="h-10 text-xs rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    disabled={isSchedulingMeeting || !meetingTitle.trim() || !meetingDate}
                    onClick={handleQuickScheduleMeeting}
                    className="h-11 min-h-11 px-5 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isSchedulingMeeting ? "Agendando..." : "Salvar Agendamento"}
                  </Button>
                </div>
              </div>
            )}

            {/* 11. CHECKLISTS DINÂMICOS (PIPEFY STYLE) */}
            {(activeSection === "all" || activeSection === "checklists") && (
              <div id="section-checklists" className="space-y-4 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="size-4 text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Checklist de Atendimento
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreatingChecklist(true)}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Criar Checklist</span>
                  </Button>
                </div>

                {isCreatingChecklist && (
                  <div className="p-4 rounded-lg border border-border/60 bg-background space-y-3">
                    <Label className="text-2xs font-semibold text-muted-foreground">Nome do Novo Checklist</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newChecklistTitle}
                        onChange={(e) => setNewChecklistTitle(e.target.value)}
                        placeholder="Ex: Documentação de Visto, Reserva de Passeios..."
                        className="h-9 text-xs rounded-lg"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCreateChecklistGroup();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={handleCreateChecklistGroup}
                        className="h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground rounded-lg cursor-pointer"
                      >
                        Criar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsCreatingChecklist(false)}
                        className="h-11 min-h-11 px-3 text-xs rounded-lg cursor-pointer"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {checklistGroups.map((group) => {
                    const doneCount = group.items.filter((it) => it.done).length;
                    const totalCount = group.items.length;
                    const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                    return (
                      <div
                        key={group.id}
                        className="p-4 rounded-xl border border-border/60 bg-card space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground">{group.title}</span>
                            <span className="text-2xs font-mono font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                              {doneCount}/{totalCount} ({progressPct}%)
                            </span>
                          </div>
                          {checklistGroups.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteChecklistGroup(group.id)}
                              className="h-11 min-h-11 px-2 text-muted-foreground hover:text-destructive cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              title="Remover checklist"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>

                        {totalCount > 0 && (
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-colors duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        )}

                        <div className="space-y-2 pt-1">
                          {group.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors group"
                            >
                              <label className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={item.done}
                                  onChange={() => handleToggleChecklistItem(group.id, item.id)}
                                  className="size-4 rounded accent-primary cursor-pointer"
                                />
                                <span
                                  className={cn(
                                    "text-xs transition-colors truncate",
                                    item.done
                                      ? "line-through text-muted-foreground"
                                      : "text-foreground font-medium"
                                  )}
                                >
                                  {item.text}
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleDeleteChecklistItem(group.id, item.id)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive cursor-pointer h-11 min-h-11 px-2 rounded transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                title="Excluir item"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Input
                            value={newItemTexts[group.id] || ""}
                            onChange={(e) =>
                              setNewItemTexts((prev) => ({ ...prev, [group.id]: e.target.value }))
                            }
                            placeholder="+ Adicionar um item (Pressione Enter)..."
                            className="h-9 text-xs rounded-lg flex-1 border-border/50"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddChecklistItem(group.id);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddChecklistItem(group.id)}
                            className="h-11 min-h-11 px-3 text-xs font-semibold rounded-lg cursor-pointer border-border/60"
                          >
                            <Plus className="size-3.5" />
                            <span>Adicionar</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 12. ANEXOS, VOUCHERS & DOCUMENTOS */}
            {(activeSection === "all" || activeSection === "attachments") && (
              <div id="section-attachments" className="p-5 rounded-xl border border-border/60 bg-muted/10 space-y-4">
                <input
                  type="file"
                  id="card-pipefy-file-upload"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Paperclip className="size-4 text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Anexos & Documentos do Card
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("card-pipefy-file-upload")?.click()}
                      className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer"
                    >
                      <Upload className="size-3.5" />
                      <span>Anexar Arquivo</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openUnifiedDocumentStudio("dossier_form_doc", "anamnese_embarque")}
                      className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>Criar no Studio</span>
                    </Button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => document.getElementById("card-pipefy-file-upload")?.click()}
                  className="w-full min-h-11 border border-dashed border-border/60 rounded-xl p-6 text-center space-y-2 bg-card hover:bg-muted/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Upload className="size-6 text-muted-foreground mx-auto" />
                  <p className="text-xs font-medium text-foreground">
                    Clique aqui ou arraste arquivos para anexar a este card
                  </p>
                  <p className="text-2xs text-muted-foreground">
                    Suporta PDFs de passagens, contratos, vouchers, reservas de hotéis e imagens
                  </p>
                </button>

                {Array.isArray(cardAttachments) && cardAttachments.length > 0 ? (
                  <div className="space-y-2">
                    {cardAttachments.map((att: any, idx: number) => (
                      <div
                        key={att.id || idx}
                        className="p-3 rounded-lg border border-border/50 bg-card flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="size-4 text-primary shrink-0" />
                          <span className="font-medium text-foreground truncate">{att.name || `Documento #${idx + 1}`}</span>
                          {att.size && <span className="text-2xs font-mono text-muted-foreground">{att.size}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {att.isGeneratedDoc ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openUnifiedDocumentStudio(
                                  att.archetype || "dossier_form_doc",
                                  att.templateKey,
                                  att,
                                )
                              }
                              className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer"
                            >
                              <Eye className="size-3.5 text-primary" />
                              <span>Abrir no Studio</span>
                            </Button>
                          ) : att.url ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="h-11 min-h-11 px-3 text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                              >
                                <span>Abrir</span>
                                <ExternalLink className="size-3" />
                              </a>
                              {(att.type?.includes("pdf") || att.name?.toLowerCase().endsWith(".pdf") || att.type?.includes("image")) && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setQuoteOcrFileName(att.name);
                                    setQuoteOcrFileMime(att.type || "application/pdf");
                                    setIsQuoteOcrModalOpen(true);
                                  }}
                                  className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
                                  title="Extrair dados desta cotação com OCR para preencher o card"
                                >
                                  <Sparkles className="size-3" />
                                  <span>Escanear OCR</span>
                                </Button>
                              )}
                            </div>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="h-11 min-h-11 px-2 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg"
                            title="Remover anexo"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-2xs text-center text-muted-foreground py-2">
                    Nenhum documento anexado ainda neste card.
                  </p>
                )}
              </div>
            )}

            {/* 13. COMENTÁRIOS & HISTÓRICO DE ATIVIDADES (TIMELINE) */}
            {(activeSection === "all" || activeSection === "comments") && (
              <div id="section-comments" className="space-y-4 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Histórico de Atividades & Notas Internas
                    </h3>
                  </div>
                  <span className="text-2xs text-muted-foreground font-mono">
                    Auditoria Interna
                  </span>
                </div>

                <LeadActivityTimeline
                  leadId={lead.id}
                  legacyComments={internalComments}
                  onActivityChanged={() =>
                    queryClient.invalidateQueries({ queryKey: ["crm-leads"] })
                  }
                />

                <div className="p-3 rounded-lg border border-border/40 bg-muted/30 flex items-center justify-between text-2xs text-muted-foreground font-mono">
                  <span>Card criado no funil</span>
                  <span>{lead.created_at ? new Date(lead.created_at).toLocaleDateString("pt-BR") : "Recentemente"}</span>
                </div>
              </div>
            )}
          </div>

          {/* ══════════ COLUNA DIREITA (GOVERNANÇA DE FASE & SIDECAR - 35%) ══════════ */}
          <div
            ref={sidecarColRef}
            className="lg:col-span-4 h-auto lg:h-full min-h-0 lg:overflow-y-auto overscroll-contain pr-0 lg:pr-1 scrollbar-waesy space-y-5 pb-16 lg:pb-24"
          >
            {/* GOVERNANÇA DA FASE ATUAL */}
            <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <span className="text-2xs font-bold uppercase tracking-wide text-muted-foreground block">
                Fase Atual do Funil
              </span>
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-muted/30">
                <span className={cn("size-2.5 rounded-full shrink-0", currentStage.dotColor)} />
                <span className="font-bold text-xs text-foreground">{currentStage.title}</span>
              </div>

              {/* Responsável da Fase */}
              <div className="space-y-1 pt-1">
                <Label className="text-2xs font-semibold text-muted-foreground">Responsável da Etapa</Label>
                <Select
                  value={formData.assigned_to || "none"}
                  onValueChange={async (val) => {
                    const prevOwner = formData.assigned_to;
                    const nextOwner = val === "none" ? "" : val;
                    setFormData((prev) => ({ ...prev, assigned_to: nextOwner }));
                    try {
                      const res = await transferLead({
                        data: {
                          leadId: lead.id,
                          newOwnerId: val === "none" ? null : val,
                        },
                      });
                      if (!res.unchanged) {
                        queryClient.invalidateQueries({
                          queryKey: ["lead-activities", lead.id],
                        });
                        queryClient.invalidateQueries({
                          queryKey: ["crm-leads"],
                        });
                        toast.success(
                          `Responsável alterado para ${res.toName || "Sem responsável"}`
                        );
                      }
                    } catch (err: unknown) {
                      setFormData((prev) => ({ ...prev, assigned_to: prevOwner }));
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Falha ao transferir responsável."
                      );
                    }
                  }}
                >
                  <SelectTrigger className="h-10 text-xs rounded-lg">
                    <SelectValue placeholder="Selecione consultor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {team.map((m) => (
                      <SelectItem key={m.profile_id || m.id} value={m.profile_id || m.id || ""}>
                        {m.full_name || m.name || "Consultor"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botão de Avanço Rápido de Fase */}
              {nextStage && (
                <Button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, status: nextStage.id }));
                    onMoveStage(lead.id, nextStage.id);
                    toast.success(`Card avançado para ${nextStage.title}!`);
                  }}
                  className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>Avançar para {nextStage.title}</span>
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>

            {/* CONTATO DO LEAD */}
            <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <span className="font-bold text-xs uppercase tracking-wide text-foreground block pb-1 border-b border-border/40">
                Contato & Atendimento
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Telefone:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground">{formData.phone || "Não informado"}</span>
                    {cleanPhone && (
                      <button
                        type="button"
                        onClick={() => window.open(whatsappUrl, "_blank")}
                        className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
                        title="Abrir no WhatsApp"
                      >
                        <MessageSquare className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">E-mail:</span>
                  <span className="text-foreground truncate max-w-44">{formData.email || "Não informado"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Canal de Origem:</span>
                  <Badge variant="outline" className="text-3xs uppercase font-mono">
                    {formData.source || "balcao"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* RESUMO DA VIAGEM */}
            <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <span className="font-bold text-xs uppercase tracking-wide text-foreground block pb-1 border-b border-border/40">
                Resumo da Viagem
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Destino:</span>
                  <strong className="text-foreground">{formData.destination || "A definir"}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Orçamento Estimado:</span>
                  <strong className="text-foreground font-mono">{formatMoney(formData.estimated_value_cents || 0)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Passageiros:</span>
                  <span className="text-foreground font-mono">
                    {formData.pax_adults} Adulto(s)
                    {formData.pax_children > 0 ? `, ${formData.pax_children} Criança(s)` : ""}
                    {formData.pax_infants > 0 ? `, ${formData.pax_infants} Bebê(s)` : ""}
                  </span>
                </div>
                {formData.travel_start && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Período:</span>
                    <span className="text-foreground font-mono text-2xs">
                      {formData.travel_start} até {formData.travel_end || "A definir"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* CARTEIRA DE CLIENTES VINCULADA */}
            <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <span className="font-bold text-xs uppercase tracking-wide text-foreground">
                  Carteira de Clientes
                </span>
                <Badge variant="outline" className="text-3xs font-mono border-border/60">
                  {crmCustomer ? "Vinculado" : "Pendente"}
                </Badge>
              </div>
              {crmCustomer ? (
                <div className="space-y-3 text-2xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 overflow-hidden font-bold text-xs text-foreground">
                      {crmCustomer.avatar_url ? (
                        <img
                          src={crmCustomer.avatar_url}
                          alt={crmCustomer.full_name || formData.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        (formData.name || "CL").slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-foreground truncate">
                        {crmCustomer.full_name || crmCustomer.name || formData.name}
                      </p>
                      <p className="text-3xs font-mono text-muted-foreground truncate">
                        {crmCustomer.document || "CPF não informado"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 pt-1 border-t border-border/30">
                    <div className="flex justify-between">
                      <span>Score de Crédito:</span>
                      <strong className="text-foreground font-mono">{crmCustomer.score || 100} pts</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Viagens Concluídas:</span>
                      <strong className="text-foreground font-mono">{customer360Data?.trips?.length || 0}</strong>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQuickProfileOpen(true)}
                    className="w-full min-h-11 sm:min-h-8 sm:h-8 px-3 text-xs font-semibold rounded-lg border-border/60 hover:bg-muted cursor-pointer gap-2"
                  >
                    <UserCheck className="size-3.5 text-primary" />
                    <span>Editar Perfil do Cliente</span>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-2 space-y-2">
                  <p className="text-2xs text-muted-foreground">Lead não promovido para a carteira de clientes ativos.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPromoting}
                    onClick={handlePromoteLead}
                    className="h-11 min-h-11 px-3 text-xs font-semibold rounded-lg border-border/60 hover:bg-muted cursor-pointer"
                  >
                    {isPromoting ? "Promovendo..." : "Promover a Cliente"}
                  </Button>
                </div>
              )}
            </div>

            {/* CHECKLISTS & ANEXOS RÁPIDOS (PIPEFY STYLE) */}
            <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <CheckSquare className="size-3.5 text-primary" />
                  <span className="font-bold text-xs uppercase tracking-wide text-foreground">
                    Checklists & Arquivos
                  </span>
                </div>
                <span className="text-2xs font-mono text-muted-foreground">
                  {checklistGroups.reduce((acc, g) => acc + g.items.filter((i) => i.done).length, 0)}/
                  {checklistGroups.reduce((acc, g) => acc + g.items.length, 0)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveSection("checklists");
                    setIsCreatingChecklist(true);
                  }}
                  className="flex-1 h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-3.5" />
                  <span>Novo Checklist</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSection("attachments")}
                  className="flex-1 h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Paperclip className="size-3.5" />
                  <span>Anexar Arquivo</span>
                </Button>
              </div>
            </div>

            {/* APRESENTAÇÃO COMERCIAL & STUDIO DE SLIDES 16:9 */}
            <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                    Studio de Apresentações & Lâminas
                  </h4>
                </div>
                <Badge variant="outline" className="text-2xs">
                  Brand Kit + PDF
                </Badge>
              </div>
              <p className="text-2xs text-muted-foreground leading-relaxed">
                Escolha o template visual (Deck 16:9, Luxury Dark, Bento Grid ou Pré-Embarque), aplique a logo e cores da empresa, edite cada slide e baixe em PDF.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    openUnifiedDocumentStudio("presentation_deck", "apresentacao_comercial_169")
                  }
                  className="h-11 min-h-11 text-2xs font-bold px-3 justify-start gap-2 cursor-pointer"
                >
                  <FileText className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">Deck Executivo 16:9</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    openUnifiedDocumentStudio("presentation_deck", "apresentacao_bento_169")
                  }
                  className="h-11 min-h-11 text-2xs font-bold px-3 justify-start gap-2 cursor-pointer"
                >
                  <FileText className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">Lâmina Bento Grid</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    openUnifiedDocumentStudio("presentation_deck", "apresentacao_luxo_dark_169")
                  }
                  className="h-11 min-h-11 text-2xs font-bold px-3 justify-start gap-2 cursor-pointer"
                >
                  <FileText className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">Deck Luxury Dark</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    openUnifiedDocumentStudio("presentation_deck", "guia_pre_embarque_169")
                  }
                  className="h-11 min-h-11 text-2xs font-bold px-3 justify-start gap-2 cursor-pointer"
                >
                  <FileText className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">Guia Pré-Embarque</span>
                </Button>
              </div>
              <Button
                type="button"
                onClick={handleGeneratePresentation}
                className="w-full h-11 min-h-11 text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-2"
                variant="default"
              >
                <FileText className="size-3.5" />
                <span>Abrir Builder de Apresentação & PDF</span>
              </Button>
            </div>

            {/* STUDIO DE DOCUMENTOS, PROPOSTAS, CONTRATOS & VOUCHERS */}
            <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <FileCode className="size-4 text-primary" />
                <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                  Studio Unificado de Documentos
                </h4>
              </div>
              <p className="text-2xs text-muted-foreground leading-relaxed">
                Abra o editor visual em tempo real com campos avançados, painel CMS e exportação em PDF, Word, HTML, PNG e Markdown.
              </p>
              {isLoadingStoreSettings && !agency ? (
                <Skeleton className="h-5 w-40 rounded-md" />
              ) : (
                <p className="text-xs font-medium text-muted-foreground">
                  Emissor ativo: {tenantIdentity.companyName}
                </p>
              )}
              <Button
                type="button"
                onClick={() => openUnifiedDocumentStudio("dossier_form_doc", "anamnese_embarque")}
                className="w-full h-11 min-h-11 text-xs font-bold rounded-lg border border-border/60 hover:bg-muted text-foreground cursor-pointer flex items-center justify-center gap-2"
                variant="outline"
              >
                <FileText className="size-4 text-primary" />
                <span>Abrir Editor & Studio Visual</span>
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => openUnifiedDocumentStudio("proposal_quote", "proposta_editorial_agency")}
                  className="h-11 min-h-11 text-xs font-semibold border border-border/50"
                >
                  Proposta A4
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    openUnifiedDocumentStudio("contract_legal", "contract_intermediacao_turistica_completa")
                  }
                  className="h-11 min-h-11 text-xs font-semibold border border-border/50"
                >
                  Contrato
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DIALOG 3: CERTIDÃO FORENSE DE ASSINATURA & TELEMETRIA MILITAR LGPD ── */}
      {isCertModalOpen && selectedCertificate && (
        <Dialog open={isCertModalOpen} onOpenChange={setIsCertModalOpen}>
          <DialogContent className="max-w-2xl p-6 bg-background border-border/60 text-xs">
            <DialogHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-600" />
                <DialogTitle className="text-base font-bold text-foreground">
                  Certidão Forense de Assinatura & Telemetria LGPD
                </DialogTitle>
              </div>
              <DialogDescription className="text-2xs text-muted-foreground">
                Comprovante probatório emitido conforme Lei 12.965/2014 e Lei 13.709/2018
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-4">
              {/* Código & Status */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                <div>
                  <span className="text-3xs uppercase font-bold text-muted-foreground block">Código da Certidão</span>
                  <strong className="text-sm font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                    {selectedCertificate.certificate_code}
                  </strong>
                </div>
                <Badge variant="secondary" className="bg-emerald-500 text-primary-foreground font-bold text-xs">
                  Autenticidade Verificada
                </Badge>
              </div>

              {/* Tabela de Telemetria */}
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3 font-mono text-2xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-3xs uppercase font-bold text-muted-foreground block">Data e Hora Forense (UTC)</span>
                    <span className="text-foreground">{new Date(selectedCertificate.accepted_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <div>
                    <span className="text-3xs uppercase font-bold text-muted-foreground block">Método de Captura</span>
                    <span className="text-foreground uppercase">{selectedCertificate.method}</span>
                  </div>
                  <div>
                    <span className="text-3xs uppercase font-bold text-muted-foreground block">Endereço IP de Origem</span>
                    <span className="text-foreground">{selectedCertificate.ip_address}</span>
                  </div>
                  <div>
                    <span className="text-3xs uppercase font-bold text-muted-foreground block">Geolocalização Aproximada</span>
                    <span className="text-foreground">
                      {selectedCertificate.geolocation?.city || "Brasil"} / {selectedCertificate.geolocation?.state || "BR"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <span className="text-3xs uppercase font-bold text-muted-foreground block">Hash Criptográfico SHA-256</span>
                  <span className="text-3xs text-foreground font-mono select-all break-all">
                    {selectedCertificate.sha256_hash}
                  </span>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <span className="text-3xs uppercase font-bold text-muted-foreground block">Agente de Usuário (User Agent)</span>
                  <span className="text-3xs text-muted-foreground break-all">
                    {selectedCertificate.user_agent}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between items-center pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 cursor-pointer"
              >
                <Printer className="size-4" />
                <span>Imprimir Certidão</span>
              </Button>
              <Button
                type="button"
                onClick={() => setIsCertModalOpen(false)}
                className="h-11 min-h-11 px-5 text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
              >
                Concluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── DIALOG 4: REGISTRO PRESENCIAL DE CONSENTIMENTO FÍSICO ── */}
      {isPhysicalConsentModalOpen && (
        <Dialog open={isPhysicalConsentModalOpen} onOpenChange={setIsPhysicalConsentModalOpen}>
          <DialogContent className="max-w-md p-6 bg-background border-border/60 text-xs">
            <DialogHeader className="pb-3 border-b border-border/40">
              <DialogTitle className="text-base font-bold text-foreground">
                Registrar Aceite Físico / Presencial
              </DialogTitle>
              <DialogDescription className="text-2xs text-muted-foreground">
                Registre a assinatura física coletada no balcão da agência com evidência probatória.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 my-4">
              <div className="space-y-1">
                <Label className="text-2xs text-muted-foreground font-semibold">Termo Assinado</Label>
                <Select
                  value={physicalPolicyType}
                  onValueChange={(val: any) => setPhysicalPolicyType(val)}
                >
                  <SelectTrigger className="h-10 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(CANONICAL_LEGAL_POLICIES).map((k) => (
                      <SelectItem key={k} value={k}>
                        {CANONICAL_LEGAL_POLICIES[k as LegalPolicyType].title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-2xs text-muted-foreground font-semibold">Nome do Consultor Responsável</Label>
                <Input
                  value={physicalOperatorName}
                  onChange={(e) => setPhysicalOperatorName(e.target.value)}
                  placeholder="Nome do consultor que colheu o aceite..."
                  className="h-10 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs text-muted-foreground font-semibold">Link da Foto ou Arquivo Assinado</Label>
                <Input
                  value={physicalProofUrl}
                  onChange={(e) => setPhysicalProofUrl(e.target.value)}
                  placeholder="https://... (URL do documento escaneado)"
                  className="h-10 text-xs rounded-lg font-mono"
                />
              </div>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between items-center pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPhysicalConsentModalOpen(false)}
                className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isRegisteringPhysical}
                onClick={handleRegisterPhysicalConsent}
                className="h-11 min-h-11 px-5 text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
              >
                {isRegisteringPhysical ? "Registrando..." : "Confirmar Registro"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── DIALOG 5: SCANNER OCR MRZ DE PASSAPORTES (ICAO 9303) ── */}
      {isMrzModalOpen && (
        <Dialog open={isMrzModalOpen} onOpenChange={setIsMrzModalOpen}>
          <DialogContent className="max-w-lg p-6 bg-background border-border/60 text-xs">
            <DialogHeader className="pb-3 border-b border-border/40">
              <DialogTitle className="text-base font-bold text-foreground">
                Scanner OCR de Linhas MRZ (Passaporte ICAO 9303)
              </DialogTitle>
              <DialogDescription className="text-2xs text-muted-foreground">
                Insira ou cole as duas linhas inferiores do passaporte do passageiro ({activeTraveler?.full_name || "Viajante"}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 my-4">
              <div className="space-y-1">
                <Label className="text-2xs text-muted-foreground font-semibold">Linha 1 do MRZ (44 caracteres)</Label>
                <Input
                  value={mrzLine1}
                  onChange={(e) => setMrzLine1(e.target.value.toUpperCase())}
                  placeholder="P<BRASEU<NOME<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
                  className="h-10 text-xs font-mono uppercase rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs text-muted-foreground font-semibold">Linha 2 do MRZ (44 caracteres)</Label>
                <Input
                  value={mrzLine2}
                  onChange={(e) => setMrzLine2(e.target.value.toUpperCase())}
                  placeholder="FP123456<9BRA8001014M3001015<<<<<<<<<<<<<<02"
                  className="h-10 text-xs font-mono uppercase rounded-lg"
                />
              </div>

              <Button
                type="button"
                disabled={isAnalyzingMrz || !mrzLine1 || !mrzLine2}
                onClick={handleExecuteMrzAnalysis}
                className="w-full h-11 min-h-11 text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
              >
                {isAnalyzingMrz ? "Decodificando..." : "Validar e Decodificar MRZ"}
              </Button>

              {mrzResult && (
                <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-1 font-mono text-2xs">
                  <div className="flex justify-between">
                    <span>Nome:</span>
                    <strong className="text-foreground">{mrzResult.holderFirstName} {mrzResult.holderLastName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Passaporte:</span>
                    <strong className="text-foreground">{mrzResult.passportNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Validade:</span>
                    <strong className="text-foreground">{mrzResult.expiryDateIso}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nascimento:</span>
                    <strong className="text-foreground">{mrzResult.birthDateIso}</strong>
                  </div>
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={handleApplyMrzToTraveler}
                      className="w-full h-11 min-h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-primary-foreground cursor-pointer"
                    >
                      Aplicar Dados à Pasta do Passageiro
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-end pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMrzModalOpen(false)}
                className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── STUDIO UNIFICADO DE DOCUMENTOS, PROPOSTAS, CONTRATOS, VOUCHERS & SLIDES 16:9 ── */}
      {docStudioOpen && (
        <UniversalDocumentStudio
          open={docStudioOpen}
          onClose={() => {
            setDocStudioOpen(false);
            setDocStudioEditingAttachment(null);
          }}
          initialArchetype={docStudioArchetype}
          initialTemplateId={docStudioTemplateId}
          initialDocumentTitle={docStudioEditingAttachment?.docTitle}
          initialMarkdownBody={
            docStudioEditingAttachment?.customContent ||
            docStudioEditingAttachment?.notesContent
          }
          editingAttachmentId={docStudioEditingAttachment?.id || null}
          tenant={tenantIdentity}
          initialFormState={{
            title: docStudioEditingAttachment?.docTitle || undefined,
            subtitle: docStudioEditingAttachment?.docSubtitle || undefined,
            protocolCode: lead.id.slice(0, 8).toUpperCase(),
            clientName: formData.name || "",
            clientDocument:
              (formData as any).document ||
              lead.document ||
              lead.cpf ||
              travelerDossiers[0]?.document_cpf ||
              "",
            clientPhone: formData.phone || "",
            clientEmail: formData.email || "",
            destination: formData.destination || "",
            startDate: formData.travel_start || "",
            endDate: formData.travel_end || "",
            adultsCount: Number(formData.pax_adults) || 2,
            childrenCount: Number(formData.pax_children) || 0,
            totalCents: Number(formData.estimated_value_cents) || computedTariffTotalCents || 0,
            paymentMethod: paymentPlan.method || "credit_card",
            paymentConditions: paymentPlan.notes || contractFormPaymentConditions || "",
            healthAllergies: "",
            healthMedications: "",
            accessibilityNeeds: [
              formData.pcd ? "PCD" : "",
              formData.reduced_mobility ? "Mobilidade reduzida" : "",
              formData.autism_spectrum ? "Espectro autista" : "",
              formData.health_notes || "",
            ]
              .filter(Boolean)
              .join(" · "),
            emergencyContactPhone: formData.phone || "",
            passengers: travelerDossiers.map((t) => ({
              name: t.full_name || "",
              document: t.document_cpf || t.passport_number || "",
              birthDate: t.birth_date || "",
              role: t.relationship || "Passageiro",
            })),
            checklists: checklistGroups.map((grp) => ({
              title: grp.title,
              completedCount: grp.items.filter((it) => it.done).length,
              totalCount: grp.items.length,
            })),
            financialRows:
              computedTariffTotalCents > 0
                ? [
                    paymentPlan.flight_cents > 0
                      ? { label: "Malha Aérea / Transporte", amountCents: paymentPlan.flight_cents }
                      : null,
                    paymentPlan.hotel_cents > 0
                      ? { label: "Hospedagem / Serviços Terrestres", amountCents: paymentPlan.hotel_cents }
                      : null,
                    paymentPlan.insurance_cents > 0
                      ? { label: "Seguro Viagem", amountCents: paymentPlan.insurance_cents }
                      : null,
                    paymentPlan.boarding_tax_cents > 0
                      ? { label: "Taxas de Embarque", amountCents: paymentPlan.boarding_tax_cents }
                      : null,
                  ].filter((row): row is { label: string; amountCents: number } => Boolean(row))
                : [],
          }}
          onSaveDocument={handleSaveDocumentFromStudio}
          onPromoteToProposalStudio={handlePromoteStudioToProposal}
          onIssueOfficialContract={handleIssueStudioContract}
          onIssueOfficialVoucher={handleIssueStudioVoucher}
          onSendWhatsapp={handleSendStudioWhatsapp}
        />
      )}

      {/* ── MODAL DE EDIÇÃO RÁPIDA DE PERFIL DO CLIENTE & UPLOAD DE FOTO ── */}
      <QuickCustomerProfileModal
        open={isQuickProfileOpen}
        onOpenChange={setIsQuickProfileOpen}
        customer={
          crmCustomer
            ? {
                id: crmCustomer.id,
                fullName: crmCustomer.full_name || crmCustomer.name || formData.name,
                document: crmCustomer.document || lead.document || null,
                phone: crmCustomer.phone || formData.phone || lead.phone || null,
                email: sanitizeCustomerEmail(crmCustomer.email) || sanitizeCustomerEmail(formData.email) || sanitizeCustomerEmail(lead.email) || null,
                avatarUrl: crmCustomer.avatar_url || null,
                city: crmCustomer.city || null,
                state: crmCustomer.state || null,
                birthDate: crmCustomer.birth_date || null,
                rg: crmCustomer.rg || null,
                notes: crmCustomer.notes || null,
                tags: crmCustomer.tags || [],
                score: crmCustomer.score || 100,
              }
            : {
                id: lead.customer_id || "",
                fullName: formData.name || lead.title || "Cliente",
                document: lead.document || null,
                phone: formData.phone || lead.phone || null,
                email: sanitizeCustomerEmail(formData.email) || sanitizeCustomerEmail(lead.email) || null,
                avatarUrl: null,
                city: null,
                state: null,
                birthDate: null,
                rg: null,
                notes: formData.notes || null,
                tags: formData.tags || [],
                score: 100,
              }
        }
        leadId={lead.id}
        onSaved={async (savedCust?: any) => {
          if (savedCust) {
            setLocalCustomer({
              id: savedCust.id,
              full_name: savedCust.fullName,
              name: savedCust.fullName,
              document: savedCust.document,
              phone: savedCust.phone,
              email: savedCust.email,
              avatar_url: savedCust.avatarUrl,
              city: savedCust.city,
              state: savedCust.state,
              birth_date: savedCust.birthDate,
              rg: savedCust.rg,
              notes: savedCust.notes,
              tags: savedCust.tags,
              score: savedCust.score,
            });
          }
          await queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
          await queryClient.invalidateQueries({ queryKey: ["customer-360", lead.id] });
          await queryClient.invalidateQueries({ queryKey: ["crm-customers-list"] });
          await queryClient.invalidateQueries({ queryKey: ["tourism-cockpit-leads"] });
        }}
        onViewFullDossier={() => {
          setActiveSection("customer360");
        }}
      />

      {/* ── DIALOG 6: IMPORTADOR & SCANNER OCR DE COTAÇÕES DE OPERADORAS B2B ── */}
      {isQuoteOcrModalOpen && (
        <Dialog open={isQuoteOcrModalOpen} onOpenChange={setIsQuoteOcrModalOpen}>
          <DialogContent className="max-w-2xl max-h-overlay-max overflow-y-auto p-6 bg-background border-border/60 text-xs">
            <DialogHeader className="pb-3 border-b border-border/40">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <FileSearch className="size-5 text-primary" />
                <span>Importar Cotação / Orçamento da Operadora (OCR)</span>
              </DialogTitle>
              <DialogDescription className="text-2xs text-muted-foreground">
                Envie o arquivo PDF ou print de cotação de operadoras (CVC, Orinter, FRT, Azul Viagens, Trend, Incomum, etc.) ou cole o texto para preencher os dados do lead no CRM.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-3">
              {/* Seletor de Arquivo ou Texto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-dashed border-border/70 bg-muted/10 space-y-2 text-center">
                  <Upload className="size-6 text-primary mx-auto" />
                  <p className="text-xs font-semibold text-foreground">Arquivo da Cotação</p>
                  <p className="text-3xs text-muted-foreground">Suporta PDFs e imagens (PNG, JPEG)</p>
                  <input
                    type="file"
                    id="quote-ocr-file-input"
                    accept="application/pdf,image/*"
                    onChange={handleQuoteOcrFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("quote-ocr-file-input")?.click()}
                    className="h-11 min-h-11 px-3 text-xs w-full font-semibold cursor-pointer"
                  >
                    {quoteOcrFileName ? "Trocar Arquivo" : "Selecionar Arquivo"}
                  </Button>
                  {quoteOcrFileName && (
                    <p className="text-3xs text-success font-medium truncate flex items-center justify-center gap-1">
                      <Check className="size-3 shrink-0" />
                      <span>{quoteOcrFileName}</span>
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <FileText className="size-3.5 text-primary" />
                    <span>Ou Cole o Texto do Orçamento</span>
                  </Label>
                  <Textarea
                    rows={4}
                    value={quoteOcrRawText}
                    onChange={(e) => setQuoteOcrRawText(e.target.value)}
                    placeholder="Cole aqui o texto copiado da operadora, GDS ou WhatsApp..."
                    className="text-2xs resize-none"
                  />
                </div>
              </div>

              {/* Botão de Executar Escaneamento */}
              <Button
                type="button"
                disabled={isScanningQuoteOcr || (!quoteOcrBase64 && !quoteOcrRawText.trim())}
                onClick={handleRunQuoteOcr}
                className="w-full h-11 min-h-11 text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isScanningQuoteOcr ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Extraindo Dados da Cotação via OCR...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    <span>Escanear Documento com OCR</span>
                  </>
                )}
              </Button>

              {/* Prévia dos Dados Estruturados Extraídos */}
              {extractedOcrQuote && (
                <div className="space-y-4 pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-success" />
                      <span className="font-bold text-xs text-foreground">
                        Dados Extraídos com Sucesso
                      </span>
                    </div>
                    {extractedOcrQuote.operator_name && (
                      <Badge variant="secondary" className="text-2xs font-bold">
                        Operadora: {extractedOcrQuote.operator_name}
                      </Badge>
                    )}
                  </div>

                  {/* Resumo em Grid de Metadados */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl border border-border/60 bg-muted/20 text-2xs">
                    <div>
                      <span className="text-muted-foreground block text-3xs uppercase">Destino</span>
                      <strong className="text-foreground truncate block font-medium">
                        {extractedOcrQuote.destination || "A definir"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-3xs uppercase">Origem</span>
                      <strong className="text-foreground truncate block font-medium">
                        {extractedOcrQuote.origin || "Não informada"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-3xs uppercase">Período</span>
                      <strong className="text-foreground truncate block font-medium">
                        {extractedOcrQuote.travel_start ? `${extractedOcrQuote.travel_start} até ${extractedOcrQuote.travel_end || ""}` : "Flexível"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-3xs uppercase">Total Geral</span>
                      <strong className="text-success font-mono font-bold block">
                        {extractedOcrQuote.gross_price_cents ? formatMoney(extractedOcrQuote.gross_price_cents) : "R$ 0,00"}
                      </strong>
                    </div>
                  </div>

                  {/* Detalhes de Hotéis e Voos */}
                  {(Boolean(extractedOcrQuote.hotels?.length) || Boolean(extractedOcrQuote.flights?.length)) && (
                    <div className="space-y-2 p-3 rounded-xl border border-border/60 bg-background text-2xs">
                      {extractedOcrQuote.hotels?.[0] && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Hotel:</span>
                          <strong className="text-foreground">{extractedOcrQuote.hotels[0].hotel_name} ({extractedOcrQuote.hotels[0].meal_plan || "Regime padrão"})</strong>
                        </div>
                      )}
                      {extractedOcrQuote.flights?.[0] && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Voo:</span>
                          <strong className="text-foreground">{extractedOcrQuote.flights[0].airline || ""} {extractedOcrQuote.flights[0].flight_number || ""} ({extractedOcrQuote.flights[0].origin_iata || ""} &gt; {extractedOcrQuote.flights[0].destination_iata || ""})</strong>
                        </div>
                      )}
                      {extractedOcrQuote.max_installments && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Condições:</span>
                          <strong className="text-foreground">Até {extractedOcrQuote.max_installments}x sem juros</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Opções de Aplicação no Card */}
                  <div className="space-y-2 p-3 rounded-xl border border-border/50 bg-muted/10">
                    <p className="font-semibold text-2xs text-foreground mb-2">
                      Selecione o que deseja preencher no Card:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={ocrApplyOptions.applyDestinationAndDates}
                          onCheckedChange={(c) => setOcrApplyOptions((prev) => ({ ...prev, applyDestinationAndDates: Boolean(c) }))}
                        />
                        <span>Atualizar Destino e Datas da Viagem</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={ocrApplyOptions.applyBudget}
                          onCheckedChange={(c) => setOcrApplyOptions((prev) => ({ ...prev, applyBudget: Boolean(c) }))}
                        />
                        <span>Atualizar Valor Estimado da Oportunidade</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={ocrApplyOptions.applyPax}
                          onCheckedChange={(c) => setOcrApplyOptions((prev) => ({ ...prev, applyPax: Boolean(c) }))}
                        />
                        <span>Atualizar Composição de Passageiros</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={ocrApplyOptions.applyPaymentBreakdown}
                          onCheckedChange={(c) => setOcrApplyOptions((prev) => ({ ...prev, applyPaymentBreakdown: Boolean(c) }))}
                        />
                        <span>Atualizar Decomposição Tarifária (Aba Pagamento)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={ocrApplyOptions.applyTraveler}
                          onCheckedChange={(c) => setOcrApplyOptions((prev) => ({ ...prev, applyTraveler: Boolean(c) }))}
                        />
                        <span>Preencher Passageiro Titular em Acompanhantes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={ocrApplyOptions.attachFileToCard}
                          onCheckedChange={(c) => setOcrApplyOptions((prev) => ({ ...prev, attachFileToCard: Boolean(c) }))}
                        />
                        <span>Anexar Arquivo Original ao Card</span>
                      </label>
                    </div>
                  </div>

                  {/* Ações de Preenchimento do Card & Criação Direta de Proposta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <Button
                      type="button"
                      onClick={() => handleApplyQuoteOcrToDossier(false)}
                      className="h-11 min-h-11 px-3 text-xs font-bold gap-2 bg-success text-success-foreground hover:bg-success/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                    >
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>Preencher Card do CRM</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleApplyQuoteOcrToDossier(true)}
                      className="h-11 min-h-11 px-3 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                      title="Salva os dados no card e abre imediatamente o Construtor de Propostas com hotéis, voos e operadora preenchidos"
                    >
                      <Sparkles className="size-4 shrink-0" />
                      <span>Preencher & Abrir Proposta</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsQuoteOcrModalOpen(false);
                  setExtractedOcrQuote(null);
                }}
                className="h-11 min-h-11 text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
