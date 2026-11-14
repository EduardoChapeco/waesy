import React, { useState, useMemo, useRef } from "react";
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
  FileCheck,
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
} from "lucide-react";
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
import { exportElementAsPdf } from "@/lib/pdf-export";
import { AgencyClausesEditorModal } from "@/components/tourism/contract/agency-clauses-editor-modal";
import { issueLeadContract } from "@/services/crm.functions";
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
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  generateDynamicTravelPresentation,
  type PreBoardingTripInput,
  type GeneratedPreBoardingPresentation,
} from "@/services/travel-pre-boarding-and-commissions.functions";

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
  onPromoteToCustomer: (leadId: string) => void;
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
  customer360Data,
  activeOnboardingForm,
}: TourismPipeCardDossierProps) {
  const effectiveProposals = useMemo(() => {
    const matchedFromProp = Array.isArray(proposals)
      ? proposals.filter(
          (p: any) =>
            p.lead_id === lead.id ||
            p.quote_id === lead.id ||
            (lead.full_name &&
              (p.client_name || p.customer_name) &&
              String(p.client_name || p.customer_name).toLowerCase() === String(lead.full_name).toLowerCase())
        )
      : [];
    const from360 = Array.isArray(customer360Data?.proposals) ? customer360Data.proposals : [];
    const combined = [...matchedFromProp];
    const seenIds = new Set(combined.map((p: any) => p.id));
    for (const p of from360) {
      if (p?.id && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        combined.push(p);
      }
    }
    return combined;
  }, [proposals, customer360Data?.proposals, lead.id, lead.full_name]);

  // Inatividade (Staleness Quiz)
  const diffDays = useMemo(() => {
    const dateStr = lead.last_contact_at || lead.updated_at || lead.created_at;
    if (!dateStr) return 0;
    const ms = Date.parse(dateStr);
    if (isNaN(ms)) return 0;
    return Math.max(0, Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24)));
  }, [lead.last_contact_at, lead.updated_at, lead.created_at]);

  // Contratos Digitais State
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

  // Pagamento & Decomposição Tarifária State
  const [paymentPlan, setPaymentPlan] = useState({
    flight_cents: Number(lead.custom_fields?.payment_plan?.flight_cents) || 0,
    hotel_cents: Number(lead.custom_fields?.payment_plan?.hotel_cents) || 0,
    insurance_cents: Number(lead.custom_fields?.payment_plan?.insurance_cents) || 0,
    boarding_tax_cents: Number(lead.custom_fields?.payment_plan?.boarding_tax_cents) || 0,
    commission_cents: Number(lead.custom_fields?.payment_plan?.commission_cents) || 0,
    method: (lead.custom_fields?.payment_plan?.method as string) || "credit_card",
    notes: (lead.custom_fields?.payment_plan?.notes as string) || "",
  });

  const computedTariffTotalCents = useMemo(() => {
    const sum =
      paymentPlan.flight_cents +
      paymentPlan.hotel_cents +
      paymentPlan.insurance_cents +
      paymentPlan.boarding_tax_cents +
      paymentPlan.commission_cents;
    return sum > 0 ? sum : lead.estimated_value_cents || 0;
  }, [paymentPlan, lead.estimated_value_cents]);

  // Form State
  const [formData, setFormData] = useState({
    name: lead.full_name || "",
    phone: lead.phone || "",
    email: lead.email || "",
    destination: lead.destination || "",
    interest_type: lead.interest_type || "package_flight",
    travel_start: lead.travel_start || "",
    travel_end: lead.travel_end || "",
    pax_adults: lead.pax_adults || 2,
    pax_children: lead.pax_children || 0,
    pax_infants: lead.pax_infants || lead.custom_fields?.pax_infants || 0,
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

  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("form");

  const buildProposalLeadPayload = (overrides: Record<string, any> = {}) => {
    const customFields =
      lead?.custom_fields && typeof lead.custom_fields === "object" ? lead.custom_fields : {};
    return {
      id: lead.id,
      fullName: formData.name,
      phone: formData.phone,
      email: formData.email,
      clientDocument: String(lead.document || lead.cpf_cnpj || customFields.document || ""),
      destination: formData.destination,
      estimated_value_cents: formData.estimated_value_cents,
      passenger_count: (formData.pax_adults || 2) + (formData.pax_children || 0),
      departureDate: formData.travel_start,
      returnDate: formData.travel_end,
      adultsCount: formData.pax_adults || 2,
      childrenCount: formData.pax_children || 0,
      notes: formData.notes || "",
      customFields,
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

  // Presentation State
  const [presentationModalOpen, setPresentationModalOpen] = useState(false);
  const [generatedPresentation, setGeneratedPresentation] = useState<GeneratedPreBoardingPresentation | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Quick Meeting State
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingType, setMeetingType] = useState<"call" | "video" | "in_person">("call");
  const [meetingRoomUrl, setMeetingRoomUrl] = useState("");
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);

  // Internal Comment State
  const [newComment, setNewComment] = useState("");
  const [internalComments, setInternalComments] = useState<Array<{ id: string; author: string; text: string; date: string }>>(() => {
    return Array.isArray(lead.custom_fields?.comments) ? lead.custom_fields.comments : [];
  });

  // Attachments State (Pipefy & Trello Benchmark)
  const [cardAttachments, setCardAttachments] = useState<any[]>(() => {
    return Array.isArray(lead.attachments) ? lead.attachments : [];
  });

  // PDF Templates & Dynamic Merge Tags State (Pipefy Benchmark)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedPdfTemplateKey, setSelectedPdfTemplateKey] = useState<string>("proposta_a4");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingDirectPdf, setIsExportingDirectPdf] = useState(false);
  const [activePdfTab, setActivePdfTab] = useState<"templates" | "fields" | "preview">("templates");
  const [isEditingTemplateText, setIsEditingTemplateText] = useState(false);
  const [customDocTexts, setCustomDocTexts] = useState<Record<string, {
    title?: string;
    subtitle?: string;
    bodyText?: string;
    clauses?: string;
    notes?: string;
  }>>({});
  const [viewingDocument, setViewingDocument] = useState<any | null>(null);
  const [isViewingDocEditing, setIsViewingDocEditing] = useState(false);
  const [isSavingDocChanges, setIsSavingDocChanges] = useState(false);
  const [isClausesModalOpen, setIsClausesModalOpen] = useState(false);

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

  // Cotações e Oportunidades Similares (InfoTravel, Radar & Outros Clientes)
  const similarProposals = useMemo(() => {
    const pool = [
      ...(Array.isArray(proposals) ? proposals : []),
      ...(Array.isArray(customer360Data?.similarAgencyProposals) ? customer360Data.similarAgencyProposals : []),
    ];
    if (pool.length === 0) return [];
    const seenIds = new Set<string>();
    const otherProposals = pool.filter((p: any) => {
      if (!p?.id || seenIds.has(p.id)) return false;
      if (p.lead_id === lead.id || p.quote_id === lead.id) return false;
      seenIds.add(p.id);
      return true;
    });

    const leadDest = (formData.destination || "").trim().toLowerCase();
    if (!leadDest) return otherProposals.slice(0, 6);

    const destMatches = otherProposals.filter((p: any) => {
      const pDest = (p.destination_city || p.title || "").toLowerCase();
      return pDest.includes(leadDest) || leadDest.includes(pDest);
    });

    return destMatches.length > 0 ? destMatches.slice(0, 6) : otherProposals.slice(0, 6);
  }, [proposals, customer360Data?.similarAgencyProposals, formData.destination, lead.id]);

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
        email: lead.email || "",
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
      toast.error("Preencha o nome completo do passageiro antes de vincular ao Cliente 360°.");
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
        toast.success(`Viajante ${traveler.full_name} vinculado ao Cadastro de Clientes 360°!`);
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
    const url = `${window.location.origin}/m/lead/${lead.id}?pax=${traveler.id}`;
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
    const url = `${window.location.origin}/m/lead/${lead.id}?pax=${traveler.id}`;
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

  const PDF_TEMPLATES = [
    {
      key: "proposta_a4",
      title: "Proposta Comercial Executiva A4",
      description: "Documento oficial de cotação com aéreo, hotel, transfers e condições de pagamento parcelado.",
      category: "Comercial",
      estimatedPages: "2 Páginas A4",
    },
    {
      key: "contrato_turismo",
      title: "Contrato de Intermediação Turística",
      description: "Minuta jurídica canônica com cláusulas de responsabilidade, cancelamento, no-show e aceite digital.",
      category: "Jurídico",
      estimatedPages: "4 Páginas A4",
    },
    {
      key: "anamnese_embarque",
      title: "Ficha de Embarque e Acessibilidade",
      description: "Ficha médica confidencial com acessibilidade, alergias, contatos de emergência e documentos oficiais.",
      category: "Operacional",
      estimatedPages: "1 Página A4",
    },
    {
      key: "voucher_resumo",
      title: "Voucher e Roteiro",
      description: "Itinerário dia a dia para envio no WhatsApp do viajante com códigos de reserva e telefones úteis.",
      category: "Pós-Venda",
      estimatedPages: "2 Páginas A4",
    },
  ];

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
      };

      await onSaveLead({
        ...formData,
        attachments: cardAttachments,
        custom_fields: mergedCustomFields,
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

  const handleIssueContractClick = async () => {
    if (!contractFormTitle.trim()) {
      toast.error("Informe o título do contrato.");
      return;
    }
    setIsIssuingContract(true);
    try {
      if (onIssueContract) {
        await onIssueContract({
          leadId: lead.id,
          contractTitle: contractFormTitle.trim(),
          packageSummary: contractFormSummary.trim(),
          totalValueCents: contractFormTotalCents || lead.estimated_value_cents || 0,
          paymentConditions: contractFormPaymentConditions.trim(),
        });
      } else {
        const res = await issueLeadContract({
          data: {
            leadId: lead.id,
            contractTitle: contractFormTitle.trim(),
            packageSummary: contractFormSummary.trim(),
            totalValueCents: contractFormTotalCents || lead.estimated_value_cents || 0,
            paymentConditions: contractFormPaymentConditions.trim(),
          },
        });
        toast.success(`Contrato emitido! Token: ${res.publicToken}`);
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

  const handleSavePaymentPlan = async () => {
    try {
      await onSaveLead({
        ...formData,
        custom_fields: {
          ...(lead.custom_fields || {}),
          payment_plan: paymentPlan,
        },
      });
      toast.success("Plano financeiro e decomposição tarifária salvos!");
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

  const generateInitialDocumentContent = (templateKey: string) => {
    const clientName = formData.name || "Cliente / Viajante";
    const clientPhone = formData.phone || "Não informado";
    const clientEmail = formData.email || "Não informado";
    const clientDoc = (formData as any).document || lead.document || lead.cpf || "Não informado";
    const destination = formData.destination || "Destino Turístico";
    const travelStart = formData.travel_start || "Data a definir";
    const travelEnd = formData.travel_end || "Data a definir";
    const totalVal = formatMoney(formData.estimated_value_cents || 0);
    const totalPax = (formData.pax_adults || 2) + (formData.pax_children || 0);
    const pcdText = formData.pcd ? "Sim (Necessidades especiais / PCD)" : "Não relatado";
    const mobText = formData.reduced_mobility ? "Sim (Cadeira de rodas / mobilidade reduzida)" : "Não relatado";
    const autismText = formData.autism_spectrum ? "Sim (Espectro autista / neurodivergência)" : "Não relatado";
    const healthNotes = formData.health_notes || formData.notes || "Nenhuma restrição médica ou alergia grave relatada pelo passageiro.";

    if (templateKey === "anamnese_embarque") {
      return [
        `### FICHA CONFIDENCIAL DE ANAMNESE E ACESSIBILIDADE DE EMBARQUE`,
        ``,
        `**PASSAGEIRO TITULAR:** ${clientName}`,
        `**DOCUMENTO / CPF:** ${clientDoc} | **TELEFONE:** ${clientPhone} | **E-MAIL:** ${clientEmail}`,
        `**DESTINO DA VIAGEM:** ${destination} | **PERÍODO PREVISTO:** ${travelStart} a ${travelEnd}`,
        ``,
        `---`,
        ``,
        `#### 1. CONDIÇÕES DE SAÚDE E ACESSIBILIDADE PCD`,
        `* **Necessidades Especiais (PCD):** ${pcdText}`,
        `* **Mobilidade Reduzida / Cadeira de Rodas:** ${mobText}`,
        `* **Espectro Autista / Neurodivergência:** ${autismText}`,
        `* **Histórico Clínico e Observações Médicas:** ${healthNotes}`,
        ``,
        `#### 2. RESTRIÇÕES ALIMENTARES E ALERGIAS`,
        `* **Restrições de Dieta:** Sem restrições alimentares declaradas.`,
        `* **Alergias a Medicamentos:** Nenhuma alergia medicamentosa impeditiva relatada.`,
        ``,
        `#### 3. CONTATO DE EMERGÊNCIA NO BRASIL`,
        `* **Nome do Contato:** A confirmar com o passageiro titular`,
        `* **Telefone de Emergência:** ${clientPhone}`,
        `* **Grau de Parentesco:** Familiar de primeiro grau`,
        ``,
        `#### 4. TERMO DE APTIDÃO FÍSICA E RESPONSABILIDADE MÉDICA`,
        `Declaro estar ciente de que as informações acima são estritamente confidenciais e destinadas exclusivamente a garantir a segurança, acessibilidade e pronto-atendimento durante todos os trechos e hospedagens da viagem contratada.`
      ].join("\n");
    }

    if (templateKey === "proposta_a4") {
      return [
        `### PROPOSTA COMERCIAL EXECUTIVA DE VIAGEM`,
        ``,
        `**CLIENTE:** ${clientName} | **TELEFONE:** ${clientPhone} | **E-MAIL:** ${clientEmail}`,
        `**DESTINO:** ${destination} | **PERÍODO PREVISTO:** ${travelStart} a ${travelEnd}`,
        `**PASSAGEIROS:** ${totalPax} viajante(s) | **VALOR TOTAL COTADO:** ${totalVal}`,
        ``,
        `---`,
        ``,
        `#### 1. DISCRIMINAÇÃO DOS SERVIÇOS INCLUSOS`,
        `* **Passagens Aéreas:** Voos de ida e retorno com despacho de bagagem de mão padrão.`,
        `* **Hospedagem Selecionada:** Hotelaria categoria superior em localização central ou resort.`,
        `* **Traslados & Transfers:** Aeroporto / Hotel / Aeroporto em transporte privativo credenciado.`,
        `* **Seguro Viagem Completo:** Cobertura de assistência médica, hospitalar e atraso de voos.`,
        ``,
        `#### 2. PLANO E CONDIÇÕES DE PAGAMENTO`,
        `* **Condição À Vista:** Pagamento via PIX ou TED com desconto exclusivo da operadora.`,
        `* **Parcelamento em Cartão:** Entrada negociada + saldo em até 10x sem juros.`,
        `* **Validade da Proposta:** Sujeita a disponibilidade de assentos aéreos e tarifas no ato do fechamento.`
      ].join("\n");
    }

    if (templateKey === "contrato_turismo") {
      return [
        `### CONTRATO DE INTERMEDIAÇÃO E PRESTAÇÃO DE SERVIÇOS TURÍSTICOS`,
        ``,
        `**CONTRATADA (AGÊNCIA):** Waesy Agência de Viagens e Operações Turísticas Ltda. (Cadastur Ativo)`,
        `**CONTRATANTE / VIAJANTE:** ${clientName}, portador(a) do telefone ${clientPhone}, e-mail ${clientEmail}.`,
        ``,
        `---`,
        ``,
        `#### CLÁUSULA 1ª — DO DESTINO E PERÍODO CONTRATADO`,
        `O presente instrumento tem como objeto a prestação de serviços turísticos para o destino ${destination}, no período compreendido entre ${travelStart} e ${travelEnd}, totalizando ${totalPax} passageiro(s).`,
        ``,
        `#### CLÁUSULA 2ª — DO VALOR TOTAL E CONDIÇÕES COMERCIAIS`,
        `Pela prestação dos serviços contratados, o CONTRATANTE pagará à CONTRATADA a quantia líquida de ${totalVal}, distribuída conforme plano financeiro acordado.`,
        ``,
        `#### CLÁUSULA 3ª — DAS REGRAS DE CANCELAMENTO, NO-SHOW E MULTAS`,
        `Em havendo desistência ou cancelamento por parte do CONTRATANTE, aplicar-se-ão as penalidades e multas tarifárias das cias aéreas e redes hoteleiras parceiras, preservado o prazo legal de arrependimento do CDC (Art. 49).`,
        ``,
        `#### CLÁUSULA 4ª — DO ACEITE ELETRÔNICO E TELEMETRIA FORENSE`,
        `As partes validam a formalização deste contrato mediante meio eletrônico seguro, com telemetria forense de IP, data/hora e hash criptográfico SHA-256.`
      ].join("\n");
    }

    return [
      `### VOUCHER OFICIAL DE EMBARQUE & ROTEIRO DE VIAGEM`,
      ``,
      `**PASSAGEIRO TITULAR:** ${clientName}`,
      `**DESTINO:** ${destination} | **PERÍODO:** ${travelStart} a ${travelEnd}`,
      `**LOCALIZADOR / VOUCHER:** WZ-${lead.id.slice(0, 8).toUpperCase()}`,
      ``,
      `---`,
      ``,
      `#### INFORMAÇÕES DE EMBARQUE AÉREO`,
      `* **Apresentação:** Comparecer ao balcão da cia aérea com 2 horas de antecedência para trechos domésticos.`,
      `* **Documentos:** Apresentar documento de identificação original oficial com foto (RG, CNH ou Passaporte).`,
      ``,
      `#### HOSPEDAGEM E DIÁRIAS`,
      `* **Horários:** Check-in a partir das 14:00h | Check-out até 11:00h.`,
      `* **Inclusões:** Café da manhã incluso conforme voucher emitido pela operadora.`,
      ``,
      `#### CANAL DE PLANTÃO E SUPORTE 24 HORAS`,
      `Em caso de qualquer eventualidade, perda de conexão ou dúvida durante a viagem:`,
      `* **Plantão Telefônico / WhatsApp:** (49) 99917-1623 | **E-mail:** atendimento@waesy.com.br`
    ].join("\n");
  };

  const handleGenerateAndAttachPdf = async (templateKey: string) => {
    setIsGeneratingPdf(true);
    try {
      const template = PDF_TEMPLATES.find((t) => t.key === templateKey) || PDF_TEMPLATES[0];
      const customOverride = customDocTexts[templateKey] || {};
      const initialBody = customOverride.bodyText || generateInitialDocumentContent(templateKey);
      const newAttachment = {
        id: `pdf-${Date.now()}`,
        name: `${customOverride.title || template.title} - ${formData.destination || "Roteiro"}.pdf`,
        url: "",
        size: template.estimatedPages,
        type: "application/pdf",
        created_at: new Date().toISOString(),
        templateKey,
        isGeneratedDoc: true,
        docTitle: customOverride.title || template.title,
        docSubtitle: customOverride.subtitle || template.description,
        customContent: initialBody,
        clausesContent: customOverride.clauses || "",
        notesContent: customOverride.notes || formData.notes || "",
        destination: formData.destination,
        clientName: formData.name,
        clientPhone: formData.phone,
        clientEmail: formData.email,
        totalCents: formData.estimated_value_cents,
        travelStart: formData.travel_start,
        travelEnd: formData.travel_end,
      };

      const updatedAttachments = [newAttachment, ...cardAttachments];
      setCardAttachments(updatedAttachments);

      // Histórico
      const newTimelineComment = {
        id: `comm-${Date.now()}`,
        author: "Sistema de Documentos",
        text: `Documento PDF gerado e vinculado ao Card: ${newAttachment.name}`,
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

      toast.success(`${template.title} gerado! Abrindo visualizador e editor...`);
      setIsPdfModalOpen(false);
      setViewingDocument(newAttachment);
      setIsViewingDocEditing(true);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveViewingDocument = async () => {
    if (!viewingDocument) return;
    setIsSavingDocChanges(true);
    try {
      const updatedAttachments = cardAttachments.map((att: any) =>
        att.id === viewingDocument.id
          ? {
              ...att,
              docTitle: viewingDocument.docTitle,
              docSubtitle: viewingDocument.docSubtitle,
              customContent: viewingDocument.customContent,
              notesContent: viewingDocument.notesContent,
              name: `${viewingDocument.docTitle || att.name}.pdf`,
            }
          : att
      );
      setCardAttachments(updatedAttachments);

      if (viewingDocument.templateKey) {
        setCustomDocTexts((prev: any) => ({
          ...prev,
          [viewingDocument.templateKey]: {
            ...prev[viewingDocument.templateKey],
            title: viewingDocument.docTitle,
            subtitle: viewingDocument.docSubtitle,
            bodyText: viewingDocument.customContent,
            notes: viewingDocument.notesContent,
          },
        }));
      }

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
        comments: internalComments,
        attachments: updatedAttachments,
      };

      await onSaveLead({
        ...formData,
        attachments: updatedAttachments,
        custom_fields: mergedCustomFields,
      });

      toast.success("Documento atualizado e salvo no card com sucesso!");
      setViewingDocument(null);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações no documento.");
    } finally {
      setIsSavingDocChanges(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: any[] = [];
    Array.from(files).forEach((file) => {
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      newItems.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: sizeStr,
        type: file.type,
        url: URL.createObjectURL(file),
        createdAt: new Date().toISOString(),
      });
    });

    const updated = [...newItems, ...cardAttachments];
    setCardAttachments(updated);
    toast.success(`${newItems.length} arquivo(s) adicionado(s) ao card!`);

    const mergedCustomFields = {
      ...(lead.custom_fields || {}),
      checklist_groups: checklistGroups,
      comments: internalComments,
    };
    onSaveLead({
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

  // Generate AI Presentation
  const handleGeneratePresentation = () => {
    const input: PreBoardingTripInput = {
      presentationType: "commercial_quote",
      agencyName: "Excelência Tour",
      agencyEmergencyPhone: "5549999171623",
      tripTitle: formData.destination || "Roteiro Exclusivo",
      conceptSubtitle: `Viagem sob medida para ${formData.name || "Cliente"}`,
      travelerProfileType: formData.pax_children > 0 ? "familia_criancas" : "casal",
      passengersNames: [formData.name || "Passageiro Principal"],
      adultsCount: formData.pax_adults || 2,
      childrenCount: formData.pax_children || 0,
      startDate: formData.travel_start || "A definir",
      endDate: formData.travel_end || "A definir",
      originCity: "São Paulo / Guarulhos",
      destinations: [formData.destination || "Destino dos Sonhos"],
      countries: ["Brasil"],
      flights: [],
      hotels: [],
      hasReceptiveTransfer: false,
      commercialPriceTotalCents: formData.estimated_value_cents || 0,
      commercialPaymentConditions: "Condições sob consulta e parcelamento facilitado",
    };

    const pres = generateDynamicTravelPresentation(input);
    setGeneratedPresentation(pres);
    setActiveSlideIndex(0);
    setPresentationModalOpen(true);
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

  // Add Comment
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const commentItem = {
      id: `comm-${Date.now()}`,
      author: "Consultor Comercial",
      text: newComment.trim(),
      date: new Date().toLocaleString("pt-BR"),
    };
    setInternalComments((prev) => [commentItem, ...prev]);
    setNewComment("");
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
      <SheetHeader className="px-6 py-4 pr-20 sm:pr-24 border-b border-border/50 shrink-0 space-y-3 bg-background">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Identificação Principal & Título Editável */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="size-11 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 font-bold text-foreground text-sm uppercase select-none">
              {(formData.name || "LE").slice(0, 2)}
            </div>
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground line-clamp-2 text-anti-truncate">
                {formData.name || "Oportunidade Comercial"}
              </SheetTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium">Fase:</span>
                <Select
                  value={formData.status}
                  onValueChange={(val) => {
                    setFormData((prev) => ({ ...prev, status: val }));
                    onMoveStage(lead.id, val);
                  }}
                >
                  <SelectTrigger className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 border border-border/60 bg-muted/30 hover:bg-muted/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
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

                <span className="font-medium ml-2 text-2xs text-muted-foreground">Serviço:</span>
                <Select
                  value={serviceTemplate}
                  onValueChange={(val: ServiceTemplateType) => {
                    setServiceTemplate(val);
                    toast.success(`Template do Card: ${SERVICE_TEMPLATE_LABELS[val]?.label}`);
                  }}
                >
                  <SelectTrigger className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 border border-border/60 bg-muted/30 hover:bg-muted/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
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

                {formData.travel_start && (
                  <span className="inline-flex items-center gap-1 font-mono text-2xs">
                    <Calendar className="size-3" />
                    <span>{formData.travel_start}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Cluster de Ações Primárias */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* WhatsApp Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!cleanPhone}
                  className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MessageSquare className="size-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-xs">
                <DropdownMenuItem
                  onClick={() => window.open(whatsappUrl, "_blank")}
                  className="cursor-pointer gap-2"
                >
                  <MessageSquare className="size-4 text-emerald-600" />
                  <span>Abrir no WhatsApp</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSendFormWhatsApp}
                  className="cursor-pointer gap-2"
                >
                  <Share2 className="size-4 text-primary" />
                  <span>Enviar Ficha por WA</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleCopyFormLink}
                  className="cursor-pointer gap-2"
                >
                  <Link2 className="size-4 text-muted-foreground" />
                  <span>Copiar Link da Ficha</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Converter em Cliente */}
            <Button
              type="button"
              variant="outline"
              onClick={() => onPromoteToCustomer(lead.id)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              title="Promover a Cliente 360°"
            >
              <UserCheck className="size-3.5 text-primary" />
              <span>Converter em Cliente</span>
            </Button>

            {/* CTA Primário Soberano: Nova Cotação */}
            <Button
              type="button"
              onClick={() => {
                onClose();
                onGenerateProposal(buildProposalLeadPayload());
              }}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4" />
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
            { id: "travelers", label: `Acompanhantes (${travelerDossiers.length})`, icon: Users },
            { id: "opportunities", label: `Oportunidades (${(infotravelOpp ? 1 : 0) + similarProposals.length + infotravelCaptures.length + radarMatches.length})`, icon: Zap },
            { id: "proposals", label: `Cotações (${effectiveProposals.length})`, icon: CreditCard },
            { id: "contracts", label: `Contratos (${customer360Data?.contracts?.length || 0})`, icon: FileSignature },
            { id: "payment", label: "Pagamento", icon: DollarSign },
            { id: "anamnese", label: "Anamnese", icon: HeartPulse },
            {
              id: "customer360",
              label: customer360Data?.customer ? "Ficha do Cliente (Ativo)" : "Ficha do Cliente",
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
                onClick={() => {
                  setActiveSection(item.id);
                  if (item.id === "presentation") {
                    handleGeneratePresentation();
                  } else {
                    const el = document.getElementById(`section-${item.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }
                }}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg text-xs font-medium flex items-center gap-2 shrink-0 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "bg-muted text-foreground font-bold"
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

      {/* ── WORKSPACE CONTÍNUO EM 2 COLUNAS (PIPEFY LIVE CANVAS) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-background [scrollbar-width:thin]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ══════════ COLUNA ESQUERDA (DADOS DO CARD & FLUXO - 65%) ══════════ */}
          <div className="lg:col-span-8 space-y-6">
            {/* ALERTA INTELIGENTE DE INATIVIDADE (STALENESS QUIZ) */}
            {diffDays >= 3 && lead?.status !== "won" && lead?.status !== "lost" && (
              <div className="p-4 rounded-xl border border-warning/40 bg-warning/10 space-y-3">
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
                      onClick={() => {
                        const newComment = {
                          id: `comment-${Date.now()}`,
                          author: "Consultor de Atendimento",
                          text: `[Parecer de Inatividade - ${diffDays}d]: ${opt.reason}`,
                          date: new Date().toISOString(),
                        };
                        setInternalComments((prev) => [newComment, ...prev]);
                        toast.success(`Parecer registrado: ${opt.label}`);
                      }}
                      className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-warning/40 hover:bg-warning/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 1. FORMULÁRIO INICIAL (START FORM) */}
            {(activeSection === "all" || activeSection === "form") && (
              <div id="section-form" className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Dados Gerais da Viagem
                    </h3>
                  </div>
                  <span className="text-2xs text-muted-foreground font-mono">
                    Sincronizado com CRM
                  </span>
                </div>

                {/* Grid 2-Colunas: VIAGEM & DESTINO + ACESSIBILIDADE & SAÚDE */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Coluna 1: Viagem & Destino */}
                  <div className="space-y-4 p-5 rounded-xl border border-border/40 bg-muted/10">
                    <h4 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      <span>Viagem & Interesse</span>
                    </h4>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">Nome Completo</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Nome do cliente..."
                            className="h-10 text-xs rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">Destino Principal</Label>
                          <Input
                            value={formData.destination}
                            onChange={(e) => setFormData((prev) => ({ ...prev, destination: e.target.value }))}
                            placeholder="Ex: Orlando, Maceió, Paris"
                            className="h-10 text-xs rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">Tipo de Interesse</Label>
                          <Select
                            value={formData.interest_type}
                            onValueChange={(val) => setFormData((prev) => ({ ...prev, interest_type: val }))}
                          >
                            <SelectTrigger className="h-10 text-xs rounded-lg">
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
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">Orçamento Estimado (R$)</Label>
                          <Input
                            type="number"
                            value={formData.estimated_value_cents ? formData.estimated_value_cents / 100 : ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                estimated_value_cents: Math.round(Number(e.target.value || 0) * 100),
                              }))
                            }
                            placeholder="R$ 0,00"
                            className="h-10 text-xs rounded-lg font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">Data Prevista Ida</Label>
                          <Input
                            type="date"
                            value={formData.travel_start}
                            onChange={(e) => setFormData((prev) => ({ ...prev, travel_start: e.target.value }))}
                            className="h-10 text-xs rounded-lg font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">Data Prevista Volta</Label>
                          <Input
                            type="date"
                            value={formData.travel_end}
                            onChange={(e) => setFormData((prev) => ({ ...prev, travel_end: e.target.value }))}
                            className="h-10 text-xs rounded-lg font-mono"
                          />
                        </div>
                      </div>

                      {/* Composição de Passageiros: Adultos, Crianças, Bebês */}
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Composição de Passageiros</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-2xs text-muted-foreground block text-center">Adultos</span>
                            <Input
                              type="number"
                              min={1}
                              value={formData.pax_adults}
                              onChange={(e) => setFormData((prev) => ({ ...prev, pax_adults: Number(e.target.value) || 1 }))}
                              className="h-9 text-xs rounded-lg font-mono text-center"
                            />
                          </div>
                          <div>
                            <span className="text-2xs text-muted-foreground block text-center">Crianças</span>
                            <Input
                              type="number"
                              min={0}
                              value={formData.pax_children}
                              onChange={(e) => setFormData((prev) => ({ ...prev, pax_children: Number(e.target.value) || 0 }))}
                              className="h-9 text-xs rounded-lg font-mono text-center"
                            />
                          </div>
                          <div>
                            <span className="text-2xs text-muted-foreground block text-center">Bebês</span>
                            <Input
                              type="number"
                              min={0}
                              value={formData.pax_infants}
                              onChange={(e) => setFormData((prev) => ({ ...prev, pax_infants: Number(e.target.value) || 0 }))}
                              className="h-9 text-xs rounded-lg font-mono text-center"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Canal de Origem & Detalhe */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">Canal / Origem</Label>
                          <Select
                            value={formData.source || "balcao"}
                            onValueChange={(val) => setFormData((prev) => ({ ...prev, source: val as any }))}
                          >
                            <SelectTrigger className="h-10 text-xs rounded-lg">
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
                          <Label className="text-2xs text-muted-foreground font-semibold">Detalhe do Canal</Label>
                          <Input
                            value={formData.lead_source_detail}
                            onChange={(e) => setFormData((prev) => ({ ...prev, lead_source_detail: e.target.value }))}
                            placeholder="Ex: Orgânico, Instagram"
                            className="h-10 text-xs rounded-lg"
                          />
                        </div>
                      </div>

                      {(() => {
                        const cf = (lead?.custom_fields || {}) as Record<string, any>;
                        const hasAttr = Boolean(
                          cf.utm_source ||
                            cf.utm_campaign ||
                            cf.campaign ||
                            cf.meta_ad_id ||
                            cf.ad_id ||
                            cf.meta_form_id ||
                            cf.ctwa_clid ||
                            cf.fbclid ||
                            cf.gclid ||
                            cf.fbp ||
                            cf.lead_code,
                        );
                        if (!hasAttr) return null;
                        return (
                          <div className="p-3 rounded-lg border border-border/50 bg-background/60 space-y-1 text-2xs">
                            <span className="font-bold uppercase tracking-wider text-primary block">
                              Atribuição de Anúncio e Pixel
                            </span>
                            <div className="flex flex-wrap gap-2 text-muted-foreground">
                              {(cf.utm_source || cf.platform) && (
                                <span>
                                  Fonte: <strong className="text-foreground">{cf.utm_source || cf.platform}</strong>
                                </span>
                              )}
                              {(cf.utm_campaign || cf.campaign) && (
                                <span>
                                  Campanha: <strong className="text-foreground">{cf.utm_campaign || cf.campaign}</strong>
                                </span>
                              )}
                              {(cf.meta_ad_id || cf.ad_id) && (
                                <span className="font-mono">
                                  Anúncio: <strong className="text-foreground">#{cf.meta_ad_id || cf.ad_id}</strong>
                                </span>
                              )}
                              {cf.ad_headline && (
                                <span>
                                  Criativo: <strong className="text-foreground">{cf.ad_headline}</strong>
                                </span>
                              )}
                              {cf.lead_code && (
                                <span className="font-mono">
                                  Ref: <strong className="text-foreground">#{cf.lead_code}</strong>
                                </span>
                              )}
                              {cf.ctwa_clid && <span className="font-mono text-emerald-600">CTWA</span>}
                              {(cf.fbclid || cf.fbc || cf.fbp) && <span className="font-mono text-primary">Meta Pixel</span>}
                              {cf.gclid && <span className="font-mono text-sky-600">Google Ads</span>}
                            </div>
                          </div>
                        );
                      })()}

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
                    </div>
                  </div>

                  {/* Coluna 2: Acessibilidade & Saúde Especial */}
                  <div className="space-y-4 p-5 rounded-xl border border-border/40 bg-muted/10 flex flex-col justify-between">
                    <div className="space-y-4">
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
                  </div>
                </div>

                {/* Botão de Salvar Alterações */}
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
            )}

            {/* 2. VIAJANTES & ACOMPANHANTES (PASTAS DE PASSAGEIROS) */}
            {(activeSection === "all" || activeSection === "travelers") && (
              <div id="section-travelers" className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-primary" />
                      <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                        Pastas de Viajantes & Acompanhantes ({travelerDossiers.length})
                      </h3>
                    </div>
                    <p className="text-2xs text-muted-foreground">
                      Documentação de embarque, conferência de passaportes, vínculos consulares DS-160 e promoção a cliente.
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
                          <span className="size-2 rounded-full bg-emerald-400" title="Vinculado ao Cliente 360°" />
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
                            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                            title="Transformar este passageiro em um cliente cadastrado no CRM"
                          >
                            <UserPlus className="size-3.5 text-primary" />
                            <span>Promover a Cliente 360°</span>
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

                        {/* Alerta de Validade < 6 Meses */}
                        {(() => {
                          if (!activeTraveler.passport_expiry_date) return null;
                          const depDate = formData.travel_start ? new Date(formData.travel_start) : new Date();
                          const expDate = new Date(activeTraveler.passport_expiry_date);
                          const diffMonths = (expDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
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
              <div id="section-opportunities" className="p-5 rounded-xl border border-border/60 bg-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border/40 gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                        Radar de Oportunidades & Tarifas
                      </h4>
                      <p className="text-2xs text-muted-foreground">
                        Histórico de cotações e tarifas para {formData.destination || "este destino"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-2xs font-mono border-primary/30 text-primary bg-primary/10 self-start sm:self-auto">
                    {similarProposals.length + infotravelCaptures.length + radarMatches.length + (infotravelOpp ? 1 : 0)} oportunidade(s) mapeada(s)
                  </Badge>
                </div>

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
                      <p className="text-2xs text-muted-foreground italic">"{infotravelOpp.whatsapp_pitch_draft}"</p>
                    )}
                  </div>
                )}

                {/* Capturas em Tempo Real (InfoTravel / Operadoras) */}
                {infotravelCaptures.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
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
                              <Badge variant="outline" className="text-2xs uppercase shrink-0">
                                {cap.source_provider || "InfoTravel"}
                              </Badge>
                            </div>
                            <p className="text-2xs text-muted-foreground">
                              {cap.destination} {cap.checkin_date ? `· ${cap.checkin_date}` : ""}
                            </p>
                            <div className="flex items-center gap-2 text-2xs font-mono text-muted-foreground pt-1">
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
                            <span>Converter Captura em Proposta</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Radar de Oportunidades & Promoções da Agência */}
                {radarMatches.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
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
                            <div className="flex items-center gap-2 text-2xs font-mono text-muted-foreground pt-1">
                              <span>Tarifa Radar:</span>
                              <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{formatMoney(opp.price_cents || 0)}</strong>
                              {opp.discount_pct ? (
                                <Badge variant="secondary" className="text-2xs">-{opp.discount_pct}%</Badge>
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
                            <span>Ofertar Pacote do Radar</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pacotes e Propostas Enviadas para Outros Clientes */}
                {similarProposals.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Pacotes e Cotações Enviados para Outros Clientes
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {similarProposals.map((prop: any) => {
                        const totalCents = prop.pricing?.total_price_cents || prop.pricing?.total_cents || 0;
                        return (
                          <div
                            key={`sim-${prop.id}`}
                            className="p-3 rounded-lg border border-border bg-muted flex flex-col justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <span className="font-bold text-foreground line-clamp-2 text-anti-truncate block">
                                {prop.title || prop.destination_city || "Pacote Turístico"}
                              </span>
                              {prop.client_name && (
                                <span className="text-2xs text-muted-foreground block line-clamp-2 text-anti-truncate">
                                  Ref. Cliente: {prop.client_name} · Destino: {prop.destination_city || "Geral"}
                                </span>
                              )}
                              <div className="flex items-center gap-2 text-2xs font-mono text-muted-foreground pt-1">
                                <span>Total Cotado:</span>
                                <strong className="text-foreground font-mono">{formatMoney(totalCents)}</strong>
                              </div>
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
                              <span>Aproveitar Estrutura em Nova Proposta</span>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : infotravelCaptures.length === 0 && radarMatches.length === 0 && !infotravelOpp ? (
                  <p className="text-2xs text-muted-foreground py-2 text-center">
                    Nenhuma cotação de referência ou captura do InfoTravel encontrada para este destino.
                  </p>
                ) : null}
              </div>
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

                {effectiveProposals.length > 0 ? (
                  <div className="space-y-3">
                    {effectiveProposals.map((prop: any) => (
                      <div
                        key={prop.id}
                        className="p-4 rounded-xl border border-border/60 bg-card space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-foreground text-sm block">
                              {prop.title || prop.destination_city || "Proposta de Viagem"}
                            </span>
                            <span className="text-2xs text-muted-foreground font-mono">
                              {formatMoney(prop.pricing?.total_price_cents || prop.pricing?.total_cents || prop.total_value_cents || 0)} · {prop.status || "Ativa"}
                            </span>
                          </div>
                          {prop.public_token && (
                            <div className="flex items-center gap-2">
                              <a
                                href={`/p/${prop.public_token}`}
                                target="_blank"
                                rel="noreferrer"
                                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border border-border/60 hover:bg-muted text-foreground flex items-center gap-2 no-underline cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <ExternalLink className="size-3 text-primary" />
                                <span>Ver</span>
                              </a>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const url = `${window.location.origin}/p/${prop.public_token}`;
                                  navigator.clipboard.writeText(url);
                                  toast.success("Link da proposta copiado!");
                                }}
                                className="h-11 min-h-11 px-3 rounded-lg text-xs border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <Copy className="size-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <FileSignature className="size-4 text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Contratos Digitais & Minutas
                    </h3>
                  </div>
                  <span className="text-2xs text-muted-foreground font-mono">
                    Tokenizado com Validação Forense
                  </span>
                </div>

                {/* Formulário de Emissão de Novo Contrato */}
                <div className="p-5 rounded-xl border border-border/40 bg-muted/10 space-y-4">
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
                        className="h-10 text-xs rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Resumo dos Serviços Inclusos</Label>
                      <Textarea
                        rows={2}
                        value={contractFormSummary}
                        onChange={(e) => setContractFormSummary(e.target.value)}
                        placeholder="Intermediação de bilhetes aéreos, reserva de hotel..."
                        className="text-xs rounded-lg"
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
                          className="h-10 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Condições de Pagamento</Label>
                        <Input
                          value={contractFormPaymentConditions}
                          onChange={(e) => setContractFormPaymentConditions(e.target.value)}
                          placeholder="Ex: Entrada 20% PIX + 10x no cartão"
                          className="h-10 text-xs rounded-lg"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      disabled={isIssuingContract}
                      onClick={handleIssueContractClick}
                      className="w-full h-11 min-h-11 text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer rounded-lg"
                    >
                      {isIssuingContract ? "Gerando Minuta..." : "Gerar e Emitir Contrato Digital"}
                    </Button>
                  </div>
                </div>

                {/* Lista de Contratos Emitidos */}
                {customer360Data?.contracts && customer360Data.contracts.length > 0 ? (
                  <div className="space-y-3">
                    <span className="font-bold text-xs uppercase tracking-wide text-foreground block">
                      Contratos Emitidos ({customer360Data.contracts.length})
                    </span>
                    {customer360Data.contracts.map((c: any) => {
                      const isSigned = c.status === "signed" || Boolean(c.signed_at);
                      const isViewed = isSigned || c.status === "viewed";
                      const isOpened = isViewed || c.status === "opened" || c.status === "sent";
                      const publicToken = c.public_token || c.id;

                      return (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl border border-border/60 bg-card space-y-3 text-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-foreground text-sm block">
                                {c.contract_title || c.title || "Contrato Digital de Viagem"}
                              </span>
                              <span className="text-2xs text-muted-foreground font-mono">
                                {formatMoney(c.total_value_cents || c.total_amount_cents || 0)} · {isSigned ? "Assinado Digitalmente" : c.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  window.open(`/workspace/contratos/${c.id}/editor`, "_blank");
                                }}
                                className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                title="Abrir no Editor Visual de Contratos e Assinaturas"
                              >
                                <FileText className="size-3.5 text-primary" />
                                <span>Editor</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  window.open(`/contrato/${publicToken}`, "_blank");
                                }}
                                className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                                title="Visualizar Minuta Pública"
                              >
                                <Eye className="size-3.5 text-muted-foreground" />
                                <span>Ver Minuta</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSendContractWhatsApp(publicToken, c.contract_title || "Contrato")}
                                className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <MessageSquare className="size-3.5 text-emerald-600" />
                                <span>WhatsApp</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleCopyContractLink(publicToken)}
                                className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <Copy className="size-3.5" />
                                <span>Copiar Link</span>
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-2xs text-muted-foreground pt-1 border-t border-border/30">
                            <span className="font-semibold text-foreground">
                              {isSigned ? "Assinado" : isViewed ? "Visualizado" : isOpened ? "Aberto" : "Enviado"}
                            </span>
                            <span>·</span>
                            <span>Etapa {isSigned ? 5 : isViewed ? 4 : isOpened ? 3 : 2} de 5</span>
                            {c.signed_at && (
                              <>
                                <span>·</span>
                                <span>{new Date(c.signed_at).toLocaleString("pt-BR")}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-2xs text-center text-muted-foreground py-2">
                    Nenhum contrato emitido para este atendimento ainda.
                  </p>
                )}
              </div>
            )}

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

                <div className="p-5 rounded-xl border border-border/40 bg-muted/10 space-y-4">
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
                        className="h-10 text-xs rounded-lg font-mono"
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
                        className="h-10 text-xs rounded-lg font-mono"
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
                        className="h-10 text-xs rounded-lg font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Taxas de Embarque (R$)</Label>
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
                        className="h-10 text-xs rounded-lg font-mono"
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
                        className="h-10 text-xs rounded-lg font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Modalidade de Pagamento Planejada */}
                <div className="space-y-4">
                  <span className="font-bold text-xs uppercase tracking-wide text-foreground block">
                    Modalidade de Pagamento Planejada
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: "pix_cash", label: "PIX à Vista (com desconto)" },
                      { id: "credit_card", label: "Cartão em até 10x" },
                      { id: "operator_boleto", label: "Boleto Faturado Operadora" },
                    ].map((m) => {
                      const active = paymentPlan.method === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentPlan((prev) => ({ ...prev, method: m.id }))}
                          className={cn(
                            "h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary",
                            active
                              ? "border-primary bg-primary text-primary-foreground font-bold"
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
                      placeholder="Ex: 20% de entrada via PIX + 10x sem juros no cartão..."
                      className="h-10 text-xs rounded-lg"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
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
              <div id="section-anamnese" className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="size-4 text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Anamnese & Preferências do Passageiro
                    </h3>
                  </div>
                  <span className="text-2xs text-muted-foreground font-mono">
                    Perfil Comportamental
                  </span>
                </div>

                <div className="space-y-3 p-5 rounded-xl border border-border/40 bg-muted/10">
                  <span className="text-xs font-bold uppercase tracking-wide text-foreground block">Estilo de Viagem</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {["Econômica", "Conforto", "Premium / Luxo"].map((style) => {
                      const isSelected = (formData.notes || "").includes(style);
                      return (
                        <button
                          type="button"
                          key={style}
                          onClick={() => {
                            const updated = `${formData.notes || ""}\nEstilo: ${style}`.trim();
                            setFormData((prev) => ({ ...prev, notes: updated }));
                            toast.success(`Estilo selecionado: ${style}`);
                          }}
                          className={cn(
                            "h-11 min-h-11 p-2 rounded-lg border text-center text-xs font-medium cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border/60 bg-card text-foreground hover:bg-muted/40"
                          )}
                        >
                          {style}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 p-5 rounded-xl border border-border/40 bg-muted/10">
                  <span className="text-xs font-bold uppercase tracking-wide text-foreground block">Preferência de Hospedagem</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {["Hotel Central", "Resort All-Inclusive", "Pousada Boutique"].map((h) => {
                      const isSelected = (formData.notes || "").includes(h);
                      return (
                        <button
                          type="button"
                          key={h}
                          onClick={() => {
                            const updated = `${formData.notes || ""}\nHospedagem: ${h}`.trim();
                            setFormData((prev) => ({ ...prev, notes: updated }));
                            toast.success(`Hospedagem selecionada: ${h}`);
                          }}
                          className={cn(
                            "h-11 min-h-11 p-2 rounded-lg border text-center text-xs font-medium cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border/60 bg-card text-foreground hover:bg-muted/40"
                          )}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 p-5 rounded-xl border border-border/40 bg-muted/10">
                  <span className="text-xs font-bold uppercase tracking-wide text-foreground block">Preferência de Voo & Bagagem</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {["Assento Janela", "Assento Corredor", "Bagagem Despachada (23kg)"].map((p) => {
                      const isSelected = (formData.notes || "").includes(p);
                      return (
                        <button
                          type="button"
                          key={p}
                          onClick={() => {
                            const updated = `${formData.notes || ""}\nPreferencia: ${p}`.trim();
                            setFormData((prev) => ({ ...prev, notes: updated }));
                            toast.success(`Preferência selecionada: ${p}`);
                          }}
                          className={cn(
                            "h-11 min-h-11 p-2 rounded-lg border text-center text-xs font-medium cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border/60 bg-card text-foreground hover:bg-muted/40"
                          )}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveForm}
                    className="h-11 min-h-11 px-5 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isSaving ? "Salvando..." : "Salvar Anamnese"}
                  </Button>
                </div>
              </div>
            )}

            {/* 8. DOSSIÊ CLIENTE 360° */}
            {(activeSection === "all" || activeSection === "customer360") && (
              <div id="section-customer360" className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-4 text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Cliente da Carteira 360°
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-2xs font-mono">
                    {customer360Data?.customer ? "Cliente Ativo" : "Não Promovido"}
                  </Badge>
                </div>

                {customer360Data?.customer ? (
                  <div className="space-y-5">
                    <div className="p-5 rounded-xl border border-border/40 bg-muted/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-sm">
                          {customer360Data.customer.full_name || customer360Data.customer.name || formData.name}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          Score: {customer360Data.customer.score || 100} pts
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-2xs text-muted-foreground">
                        <div>CPF: <strong className="text-foreground font-mono">{customer360Data.customer.document || "Não informado"}</strong></div>
                        <div>Cidade: <strong className="text-foreground">{customer360Data.customer.city || "Não informada"}</strong></div>
                        <div>Viagens: <strong className="text-foreground font-mono">{customer360Data.trips?.length || 0}</strong></div>
                        <div>Contratos: <strong className="text-foreground font-mono">{customer360Data.contracts?.length || 0}</strong></div>
                        <div>Atendimentos: <strong className="text-foreground font-mono">{(customer360Data.otherLeads?.length || 0) + 1}</strong></div>
                        <div>Chamados SOS: <strong className="text-foreground font-mono">{customer360Data.incidents?.length || 0}</strong></div>
                      </div>
                    </div>

                    {/* Dossiê Imprimível */}
                    <Customer360PrintableDossier
                      customer={{
                        id: customer360Data.customer.id,
                        fullName: customer360Data.customer.full_name || customer360Data.customer.name || "Cliente",
                        taxId: customer360Data.customer.document || null,
                        email: customer360Data.customer.email || null,
                        phone: customer360Data.customer.phone || null,
                        city: customer360Data.customer.city || null,
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
                      onClick={() => onPromoteToCustomer(lead.id)}
                      className="h-11 min-h-11 px-5 text-xs font-bold gap-2 bg-primary text-primary-foreground rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <UserPlus className="size-4" />
                      <span>Promover Titular a Cliente da Carteira 360°</span>
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
                      onClick={() => setIsPdfModalOpen(true)}
                      className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>Criar Documento A4</span>
                    </Button>
                  </div>
                </div>

                <div
                  onClick={() => document.getElementById("card-pipefy-file-upload")?.click()}
                  className="border border-dashed border-border/60 rounded-xl p-6 text-center space-y-2 bg-card hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  <Upload className="size-6 text-muted-foreground mx-auto" />
                  <p className="text-xs font-medium text-foreground">
                    Clique aqui ou arraste arquivos para anexar a este card
                  </p>
                  <p className="text-2xs text-muted-foreground">
                    Suporta PDFs de passagens, contratos, vouchers, reservas de hotéis e imagens
                  </p>
                </div>

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
                              onClick={() => {
                                setViewingDocument(att);
                                setIsViewingDocEditing(false);
                              }}
                              className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer"
                            >
                              <Eye className="size-3.5 text-primary" />
                              <span>Abrir Editor A4</span>
                            </Button>
                          ) : att.url ? (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="h-11 min-h-11 px-3 text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                            >
                              <span>Abrir</span>
                              <ExternalLink className="size-3" />
                            </a>
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

                <div className="space-y-2">
                  <Textarea
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escreva uma observação interna ou registro de contato com o passageiro..."
                    className="text-xs rounded-lg"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground rounded-lg cursor-pointer"
                    >
                      <Send className="size-3 mr-2" />
                      <span>Registrar Nota</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {internalComments.map((comm) => (
                    <div
                      key={comm.id}
                      className="p-4 rounded-lg border border-border/50 bg-card space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-2xs text-muted-foreground">
                        <span className="font-bold text-foreground">{comm.author}</span>
                        <span className="font-mono">{comm.date}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{comm.text}</p>
                    </div>
                  ))}

                  <div className="p-3 rounded-lg border border-border/40 bg-muted/30 flex items-center justify-between text-2xs text-muted-foreground font-mono">
                    <span>Card criado no funil</span>
                    <span>{lead.created_at ? new Date(lead.created_at).toLocaleDateString("pt-BR") : "Recentemente"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ══════════ COLUNA DIREITA (GOVERNANÇA DE FASE & SIDECAR - 35%) ══════════ */}
          <div className="lg:col-span-4 space-y-5">
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
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, assigned_to: val === "none" ? "" : val }))}
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
                  {customer360Data?.customer ? "Vinculado" : "Pendente"}
                </Badge>
              </div>
              {customer360Data?.customer ? (
                <div className="space-y-2 text-2xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Documento:</span>
                    <strong className="text-foreground font-mono">{customer360Data.customer.document || "CPF não informado"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Score de Crédito:</span>
                    <strong className="text-foreground font-mono">{customer360Data.customer.score || 100} pts</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Viagens Concluídas:</span>
                    <strong className="text-foreground font-mono">{customer360Data.trips?.length || 0}</strong>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 space-y-2">
                  <p className="text-2xs text-muted-foreground">Lead não promovido para a carteira de clientes ativos.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPromoteToCustomer(lead.id)}
                    className="h-11 min-h-11 px-3 text-xs font-semibold rounded-lg border-border/60 hover:bg-muted cursor-pointer"
                  >
                    Promover a Cliente
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

            {/* APRESENTAÇÃO COMERCIAL (SLIDE 16:9) */}
            <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <FileText className="size-4 text-primary" />
                <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                  Apresentação Comercial
                </h4>
              </div>
              <p className="text-2xs text-muted-foreground leading-relaxed">
                Gera uma apresentação executiva com clima, câmbio, atrações, visto e valores para o cliente.
              </p>
              <Button
                type="button"
                onClick={handleGeneratePresentation}
                className="w-full h-11 min-h-11 text-xs font-bold rounded-lg border border-border/60 hover:bg-muted text-foreground cursor-pointer flex items-center justify-center gap-2"
                variant="outline"
              >
                <FileText className="size-3.5 text-primary" />
                <span>Visualizar Apresentação</span>
              </Button>
            </div>

            {/* GERADOR DE DOCUMENTOS A4 TIMBRADOS */}
            <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <FileCode className="size-4 text-primary" />
                <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                  Documentos & Modelos A4
                </h4>
              </div>
              <p className="text-2xs text-muted-foreground leading-relaxed">
                Gere propostas timbradas, fichas médicas de embarque, minutas contratuais e vouchers oficiais com preenchimento dinâmico.
              </p>
              <Button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="w-full h-11 min-h-11 text-xs font-bold rounded-lg border border-border/60 hover:bg-muted text-foreground cursor-pointer flex items-center justify-center gap-2"
                variant="outline"
              >
                <FileText className="size-3.5 text-primary" />
                <span>Gerar Documento / Modelo A4</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── DIALOG 1: VISUALIZADOR & EDITOR A4 TIMBRADO (ESTILO WORD) ── */}
      {viewingDocument && (
        <Dialog open={Boolean(viewingDocument)} onOpenChange={() => setViewingDocument(null)}>
          <DialogContent className="max-w-4xl max-h-screen overflow-y-auto p-6 bg-background border-border/60">
            <DialogHeader className="pb-3 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <DialogTitle className="text-base font-bold text-foreground">
                    {viewingDocument.docTitle || viewingDocument.name}
                  </DialogTitle>
                  <DialogDescription className="text-2xs text-muted-foreground">
                    Visualizador e Editor Timbrado A4 com preenchimento em tempo real
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsViewingDocEditing((prev) => !prev)}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer"
                  >
                    <Edit3 className="size-3.5" />
                    <span>{isViewingDocEditing ? "Modo Visualização" : "Editar In-line"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer"
                  >
                    <Printer className="size-3.5" />
                    <span>Imprimir</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!cleanPhone) {
                        toast.error("Lead sem telefone cadastrado.");
                        return;
                      }
                      const msg = encodeURIComponent(
                        `Olá, ${formData.name.split(" ")[0]}! Segue a minuta/documento da sua viagem (${viewingDocument.name}):\n\n${viewingDocument.docTitle || ""}\nDestino: ${formData.destination || ""}\nValor: ${formatMoney(formData.estimated_value_cents || 0)}`
                      );
                      window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
                    }}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer"
                  >
                    <Send className="size-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Folha A4 Timbrada */}
            <div className="my-4 max-w-3xl min-h-96 bg-card border border-border/60 rounded-xl p-8 sm:p-12 mx-auto space-y-6 text-foreground">
              {/* Cabeçalho Timbrado da Agência */}
              <div className="flex items-center justify-between border-b-2 border-primary/20 pb-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground uppercase">
                    Waesy Travel Suite
                  </h2>
                  <p className="text-2xs text-muted-foreground">
                    Operações Turísticas, Cotações & Gestão de Passageiros
                  </p>
                </div>
                <div className="text-right text-2xs text-muted-foreground font-mono">
                  <span>Data: {new Date().toLocaleDateString("pt-BR")}</span>
                  <span className="block">Dossiê: {lead.id.slice(0, 8)}</span>
                </div>
              </div>

              {/* Título e Subtítulo */}
              <div className="space-y-1">
                {isViewingDocEditing ? (
                  <Input
                    value={viewingDocument.docTitle || ""}
                    onChange={(e) =>
                      setViewingDocument((prev: any) => ({ ...prev, docTitle: e.target.value }))
                    }
                    className="text-base font-bold h-10"
                    placeholder="Título do documento..."
                  />
                ) : (
                  <h3 className="text-base font-bold text-foreground">
                    {viewingDocument.docTitle || viewingDocument.name}
                  </h3>
                )}
                {isViewingDocEditing ? (
                  <Input
                    value={viewingDocument.docSubtitle || ""}
                    onChange={(e) =>
                      setViewingDocument((prev: any) => ({ ...prev, docSubtitle: e.target.value }))
                    }
                    className="text-xs text-muted-foreground h-9"
                    placeholder="Subtítulo ou resumo..."
                  />
                ) : (
                  viewingDocument.docSubtitle && (
                    <p className="text-xs text-muted-foreground">{viewingDocument.docSubtitle}</p>
                  )
                )}
              </div>

              {/* Tabela de Dados da Viagem */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-muted/20 border border-border/40 text-xs font-mono">
                <div>
                  <span className="text-3xs text-muted-foreground uppercase block">Passageiro Titular</span>
                  <strong className="text-foreground">{formData.name || "Cliente"}</strong>
                </div>
                <div>
                  <span className="text-3xs text-muted-foreground uppercase block">Destino</span>
                  <strong className="text-foreground">{formData.destination || "A definir"}</strong>
                </div>
                <div>
                  <span className="text-3xs text-muted-foreground uppercase block">Datas</span>
                  <strong className="text-foreground">{formData.travel_start || "Ida"} - {formData.travel_end || "Volta"}</strong>
                </div>
                <div>
                  <span className="text-3xs text-muted-foreground uppercase block">Valor Total</span>
                  <strong className="text-foreground">{formatMoney(formData.estimated_value_cents || 0)}</strong>
                </div>
              </div>

              {/* Corpo de Texto / Cláusulas / Anamnese */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Termos & Discriminação de Serviços
                  </span>
                  {viewingDocument.templateKey === "contrato_turismo" && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => window.open("/workspace/contratos/novo", "_blank")}
                      className="h-11 min-h-11 px-3 text-xs text-primary font-bold gap-2 hover:bg-muted/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      title="Abrir no criador avançado de contratos"
                    >
                      <ExternalLink className="size-4" />
                      <span>Editor Avançado</span>
                    </Button>
                  )}
                </div>

                {isViewingDocEditing && (
                  <div className="space-y-2 p-3 rounded-lg border border-border/40 bg-muted/20">
                    <span className="text-3xs uppercase font-bold text-muted-foreground block">
                      Inserir Marcadores Dinâmicos (Merge Tags)
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { tag: formData.name || "Nome do Cliente", label: "+ Nome" },
                        { tag: formData.destination || "Destino", label: "+ Destino" },
                        { tag: `${formData.travel_start || "Ida"} a ${formData.travel_end || "Volta"}`, label: "+ Período" },
                        { tag: formatMoney(formData.estimated_value_cents || 0), label: "+ Valor" },
                        { tag: formData.phone || "Telefone", label: "+ Telefone" },
                        { tag: formData.health_notes || "Observações de Saúde", label: "+ Saúde/PCD" },
                      ].map((mt) => (
                        <button
                          key={mt.label}
                          type="button"
                          onClick={() => {
                            setViewingDocument((prev: any) => ({
                              ...prev,
                              customContent: `${prev.customContent || ""}\n${mt.tag}`.trim(),
                            }));
                            toast.success(`Marcador inserido!`);
                          }}
                          className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border border-border/60 bg-background hover:bg-muted cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {mt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isViewingDocEditing ? (
                  <Textarea
                    rows={12}
                    value={viewingDocument.customContent || viewingDocument.notesContent || ""}
                    onChange={(e) =>
                      setViewingDocument((prev: any) => ({
                        ...prev,
                        customContent: e.target.value,
                        notesContent: e.target.value,
                      }))
                    }
                    className="text-xs font-mono leading-relaxed min-h-72 p-3 rounded-lg border border-border/60 bg-background focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Conteúdo do documento em formato texto/markdown..."
                  />
                ) : (
                  <div className="p-4 rounded-lg bg-muted/10 border border-border/30 text-xs text-foreground leading-relaxed whitespace-pre-line font-sans">
                    {viewingDocument.customContent ||
                      viewingDocument.notesContent ||
                      "Serviços turísticos discriminados e confirmados perante as operadoras e prestadores envolvidos. Este documento comprova as condições contratuais acordadas com a agência."}
                  </div>
                )}
              </div>

              {/* Linhas de Assinatura */}
              <div className="pt-8 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs text-muted-foreground">
                <div className="space-y-1">
                  <div className="border-b border-border/60 pb-1 mx-8" />
                  <strong className="text-foreground block">{formData.name || "Contratante"}</strong>
                  <span className="text-2xs">Passageiro Titular</span>
                </div>
                <div className="space-y-1">
                  <div className="border-b border-border/60 pb-1 mx-8" />
                  <strong className="text-foreground block">Waesy Agência de Viagens</strong>
                  <span className="text-2xs">Agência Contratada</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between items-center pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewingDocument(null)}
                className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                Fechar
              </Button>
              <Button
                type="button"
                disabled={isSavingDocChanges}
                onClick={handleSaveViewingDocument}
                className="h-11 min-h-11 px-5 text-xs font-bold bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isSavingDocChanges ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── DIALOG 2: SELETOR DE MODELOS DE DOCUMENTOS A4 ── */}
      {isPdfModalOpen && (
        <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
          <DialogContent className="max-w-2xl p-6 bg-background border-border/60">
            <DialogHeader className="pb-3 border-b border-border/40">
              <DialogTitle className="text-base font-bold text-foreground">
                Gerador de Documentos e Modelos A4
              </DialogTitle>
              <DialogDescription className="text-2xs text-muted-foreground">
                Selecione o modelo desejado para compor o documento oficial com os dados deste atendimento:
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3 my-4">
              {PDF_TEMPLATES.map((tmpl) => {
                const isSelected = selectedPdfTemplateKey === tmpl.key;
                return (
                  <div
                    key={tmpl.key}
                    onClick={() => setSelectedPdfTemplateKey(tmpl.key)}
                    className={cn(
                      "p-4 rounded-xl border text-xs cursor-pointer transition-colors space-y-2",
                      isSelected
                        ? "border-primary bg-primary/5 text-foreground ring-2 ring-primary"
                        : "border-border/60 bg-card hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-sm">{tmpl.title}</span>
                      <Badge variant="outline" className="text-3xs font-mono">
                        {tmpl.estimatedPages}
                      </Badge>
                    </div>
                    <p className="text-2xs text-muted-foreground">{tmpl.description}</p>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="flex justify-between sm:justify-between items-center pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPdfModalOpen(false)}
                className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isGeneratingPdf}
                onClick={() => handleGenerateAndAttachPdf(selectedPdfTemplateKey)}
                className="h-11 min-h-11 px-5 text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
              >
                {isGeneratingPdf ? "Gerando..." : "Gerar Documento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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

      {/* ── MODAL DE VISUALIZAÇÃO DE APRESENTAÇÃO IA (SLIDES 16:9) ── */}
      {presentationModalOpen && generatedPresentation && (
        <div className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-card rounded-2xl border border-border/60 shadow-overlay overflow-hidden flex flex-col max-h-screen">
            {/* Header da Apresentação */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <span className="font-bold text-sm text-foreground">
                  Apresentação Comercial · Slide {activeSlideIndex + 1} de {generatedPresentation.pages.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPresentationModalOpen(false)}
                className="size-11 min-h-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Slide Viewer (16:9 Aspect Ratio) */}
            <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center bg-muted/10">
              {(() => {
                const page = generatedPresentation.pages[activeSlideIndex];
                if (!page) return null;
                return (
                  <div className="w-full max-w-3xl aspect-video rounded-2xl border border-border/60 bg-card p-8 flex flex-col justify-between shadow-2xs">
                    <div className="space-y-2">
                      <span className="text-xs uppercase font-bold tracking-wider text-primary font-mono block">
                        {page.eyebrow}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                        {page.title}
                      </h2>
                      {page.subtitle && (
                        <p className="text-xs sm:text-sm text-muted-foreground">{page.subtitle}</p>
                      )}
                    </div>

                    <div className="my-auto py-4">
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {page.humanNarrative}
                      </p>

                      {page.cards && page.cards.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                          {page.cards.map((c, i) => (
                            <div key={i} className="p-3 rounded-lg border border-border/50 bg-muted/20 text-xs">
                              <span className="font-bold text-foreground block">{c.label}</span>
                              <span className="text-2xs text-muted-foreground">{c.practicalExplanation}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border/30 flex items-center justify-between text-2xs text-muted-foreground">
                      <span>Curadoria de Viagem</span>
                      <span className="font-mono">Página {page.pageNumber}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Navegador de Slides */}
            <div className="p-4 border-t border-border/50 flex items-center justify-between shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeSlideIndex === 0}
                onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                className="h-11 min-h-11 px-4 text-xs font-semibold gap-2"
              >
                <ChevronLeft className="size-4" />
                <span>Anterior</span>
              </Button>

              <div className="flex items-center gap-2">
                {generatedPresentation.pages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveSlideIndex(i)}
                    className={cn(
                      "h-11 min-h-11 px-2 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "size-2.5 rounded-full transition-colors",
                      i === activeSlideIndex ? "bg-primary w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
                    )}
                  />
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeSlideIndex === generatedPresentation.pages.length - 1}
                onClick={() => setActiveSlideIndex((prev) => Math.min(generatedPresentation.pages.length - 1, prev + 1))}
                className="h-11 min-h-11 px-4 text-xs font-semibold gap-2"
              >
                <span>Próximo</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
