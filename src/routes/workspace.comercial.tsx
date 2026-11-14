import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Kanban, Bus, MessageSquare, Pencil, Users, Plus, Search, DollarSign, Phone, Mail, UserCheck, CheckCircle2, Clock, MoreVertical, Plane, Edit3, Calendar, MapPin, Tag, CheckSquare, Square, AlertTriangle, ChevronRight, ChevronLeft, X, Trash2, Layers, Upload, Calculator, FileText, ExternalLink, BarChart3, Settings2, Brain, FileSignature, History, Copy, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleTourModal, ModuleTourTrigger, type TourSlide } from "@/components/ui/module-tour-modal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyField } from "@/components/ui/currency-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { listLeads, updateLeadStatus, updateLeadDetails, promoteLeadToCustomer, createLead, toggleLeadChecklist, deleteLead, persistLeadMove, getCustomer360Profile, calculateStoreLtvAndAdSpend, type StoreLtvAndAdSpendDTO, issueLeadContract, addLeadMeeting } from "@/services/crm.functions";
import { listTeamMembers } from "@/services/admin-team.functions";
import { getStoreSettings } from "@/services/store.functions";
import { getStoreOnboardingForms } from "@/services/lead-forms.functions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet } from "@/components/workspace/workspace-dashboard-sheet";
import { KanbanColumnCustomizerModal } from "@/components/workspace/kanban/kanban-column-customizer-modal";
import { LeadImportModal } from "@/components/commercial/lead-import-modal";
import { UnifiedProposalWorkspace } from "@/components/tourism/unified-proposal-workspace";
import { LeadCommissionCalculatorSheet } from "@/components/commercial/lead-commission-calculator-sheet";
import { LeadFlightGridSheet } from "@/components/commercial/lead-flight-grid-sheet";
import { LeadCard } from "@/components/tourism/crm/LeadCard";
import { Customer360PrintableDossier } from "@/components/dossier/customer-360-printable-dossier";
import { exportElementAsPdf } from "@/lib/pdf-export";
import { CommercialBudgetPadSheet } from "@/components/documents/CommercialBudgetPadSheet";
import { TourismPipeCardDossier } from "@/components/tourism/crm/TourismPipeCardDossier";
import { UniversalKanbanCard } from "@/components/workspace/kanban/universal-kanban-card";
import { listAgencyTravelProposals } from "@/services/travel-proposal.functions";
import { listKanbanStages, type KanbanStageDTO } from "@/services/kanban-config.functions";
import {
  getNicheContractBlueprint,
  buildStructuredCustomFieldsSummaryRows,
} from "@/lib/niches/unified-field-bridge";

export const Route = createFileRoute("/workspace/comercial")({
  validateSearch: (search: Record<string, unknown>): { dealId?: string; leadId?: string } => ({
    dealId: typeof search.dealId === "string" && search.dealId.trim() ? search.dealId.trim() : undefined,
    leadId: typeof search.leadId === "string" && search.leadId.trim() ? search.leadId.trim() : undefined,
  }),
  head: () => ({ meta: [{ title: "Pipeline Comercial e Funil de Oportunidades | Workspace" }] }),
  loader: async () => {
    try {
    const store = await getStoreSettings().catch(() => null);
    const [leadsRes, teamRes, proposalsRes, kanbanStages] = await Promise.all([
      listLeads().catch(() => []),
      listTeamMembers().catch(() => []),
      listAgencyTravelProposals().catch(() => []),
      store?.id ? listKanbanStages({ data: { storeId: store.id, module: "commercial_crm" } }).catch(() => []) : [],
    ]);
    return {
      leads: leadsRes || [],
      team: teamRes || [],
      store,
      proposals: proposalsRes || [],
      kanbanStages: (kanbanStages || []) as KanbanStageDTO[],
      loadError: null,
    };
    } catch (err) {
      console.error("[loader:workspace.comercial] Unhandled loader error:", err);
      return {
        leads: [],
        team: [],
        store: null,
        proposals: [],
        kanbanStages: [],
        loadError: err instanceof Error ? err.message : "Não foi possível carregar o módulo comercial.",
      };
    }
  },
  component: WorkspaceComercialPage,
});

type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

interface StageColConfig {
  id: LeadStage;
  title: string;
  dotColor: string;
  badgeClass: string;
  description: string;
}

const STAGES: StageColConfig[] = [
  {
    id: "new",
    title: "Novos Leads",
    dotColor: "bg-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    description: "Contatos recém-chegados aguardando abordagem",
  },
  {
    id: "contacted",
    title: "Primeiro Contato",
    dotColor: "bg-warning",
    badgeClass: "bg-warning/10 text-warning-strong border-warning/20",
    description: "Abordagem iniciada por WhatsApp, e-mail ou telefone",
  },
  {
    id: "qualified",
    title: "Qualificação",
    dotColor: "bg-purple-500",
    badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    description: "Perfil, destino e orçamento validados",
  },
  {
    id: "proposal",
    title: "Proposta Enviada",
    dotColor: "bg-indigo-500",
    badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    description: "Cotação / lâmina visual apresentada ao cliente",
  },
  {
    id: "negotiation",
    title: "Negociação",
    dotColor: "bg-orange-500",
    badgeClass: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    description: "Ajuste de condições de pagamento e quartos",
  },
  {
    id: "won",
    title: "Fechado / Ganho",
    dotColor: "bg-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    description: "Venda confirmada pronta para emissão e voucher",
  },
  {
    id: "lost",
    title: "Perdido",
    dotColor: "bg-rose-500",
    badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    description: "Negociação declinada ou sem retorno",
  },
];

export const INTEREST_TYPES = [
  { value: "package_flight", label: "Pacote Aéreo Completo" },
  { value: "hotel", label: "Somente Hospedagem / Resort" },
  { value: "package_ground", label: "Excursão Rodoviária / Terrestre" },
  { value: "flights", label: "Passagens Aéreas" },
  { value: "cruise", label: "Cruzeiro Marítimo" },
  { value: "visa", label: "Visto e Passaporte" },
  { value: "corporate", label: "Corporativo / Negócios" },
  { value: "other", label: "Outros Serviços" },
] as const;

export const LEAD_SOURCES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "balcao", label: "Balcão / Loja Física" },
  { value: "instagram", label: "Instagram" },
  { value: "google_ads", label: "Google Ads" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site / Biolink" },
  { value: "outros", label: "Outros" },
] as const;

export const POPULAR_TAGS = [
  { name: "Família", tone: "info" },
  { name: "Lua de Mel", tone: "accent" },
  { name: "Alta Renda", tone: "success" },
  { name: "Resort All-Inclusive", tone: "warning" },
  { name: "Internacional", tone: "primary" },
  { name: "Urgente", tone: "danger" },
  { name: "Grupo", tone: "secondary" },
];

const TAG_TONE_CLASSES: Record<string, string> = {
  info: "bg-info text-info-foreground",
  accent: "bg-accent text-accent-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  primary: "bg-primary text-primary-foreground",
  danger: "bg-destructive text-destructive-foreground",
  secondary: "bg-secondary text-secondary-foreground",
};

export const DEFAULT_CHECKLIST_TEMPLATE = [
  { id: "item-1", text: "Primeiro contato via WhatsApp realizado", done: false },
  { id: "item-2", text: "Orçamento e preferências alinhadas", done: false },
  { id: "item-3", text: "Cotação / Proposta montada e enviada", done: false },
  { id: "item-4", text: "Follow-up de negociação realizado", done: false },
  { id: "item-5", text: "Documentos coletados para emissão do contrato", done: false },
];

function formatPaxBreakdown(lead: any) {
  const adults = lead.pax_adults || 0;
  const children = lead.pax_children || 0;
  const infants = lead.pax_infants || 0;
  if (adults > 0 || children > 0 || infants > 0) {
    const parts = [];
    if (adults > 0) parts.push(`${adults} ADT`);
    if (children > 0) parts.push(`${children} CHD`);
    if (infants > 0) parts.push(`${infants} INF`);
    return parts.join(", ");
  }
  return `${lead.pax_count || 1} Pax`;
}

function getTravelPeriodDisplay(lead: any) {
  if (lead.interest_period) return lead.interest_period;
  if (lead.travel_start) {
    const start = new Date(lead.travel_start).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    if (lead.travel_end) {
      const end = new Date(lead.travel_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      return `${start} a ${end}`;
    }
    return start;
  }
  return null;
}

function getStalenessInfo(lead: any) {
  if (lead.status === "won" || lead.status === "lost" || lead.status === "converted") {
    return { isStale: false, isCold: false, diffDays: 0 };
  }
  const lastContact = lead.last_contacted_at ? new Date(lead.last_contacted_at) : new Date(lead.created_at);
  const diffDays = Math.ceil(Math.abs(Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
  return {
    isStale: diffDays >= 5,
    isCold: diffDays >= 10,
    diffDays,
  };
}


const COMERCIAL_TOUR_SLIDES: TourSlide[] = [
  {
    title: "Pipeline Visual de Oportunidades (Kanban)",
    description: "Acompanhe cada negociação desde o primeiro contato até o fechamento com estágios visuais e somatório financeiro em tempo real.",
    icon: Kanban,
    highlightBadge: "Kanban 360°",
    tip: "Arraste os cards entre as colunas para atualizar o estágio e disparar lembretes automáticos.",
  },
  {
    title: "Atendimento Rápido via WhatsApp",
    description: "Inicie conversas com mensagens pré-formatadas, envie propostas comerciais e acompanhe o histórico do cliente em um só lugar.",
    icon: Phone,
    highlightBadge: "WhatsApp Nativo",
    tip: "Clique no ícone de WhatsApp em qualquer card para abrir o chat diretamente.",
  },
  {
    title: "Propostas Comerciais e Cotações Inteligentes",
    description: "Gere links de propostas com fotos, itinerários e condições de pagamento parceladas prontas para assinatura e aprovação pelo cliente.",
    icon: FileText,
    highlightBadge: "Propostas & PNR",
    tip: "Ao aprovar uma proposta, ela é convertida automaticamente em viagem confirmada no módulo de Turismo.",
  },
];

function WorkspaceComercialPage() {
  const { leads: initialLeads = [], team = [], store = null, proposals: initialProposals = [], kanbanStages = [], loadError = null } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();
  const routeSearch = Route.useSearch();
  const storeId = store?.id || "";
  const nicheBlueprint = useMemo(() => getNicheContractBlueprint(store), [store]);

  const [leads, setLeads] = useState<any[]>(initialLeads);
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);
  const handledDeepLinkRef = useRef<string>("");
  const [budgetPadTargetLead, setBudgetPadTargetLead] = useState<any | null>(null);

  // Modal de Agendamento Direto de Reuniões (lead_meetings)
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingDuration, setMeetingDuration] = useState(30);
  const [meetingType, setMeetingType] = useState<"call" | "video" | "in_person">("call");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [newLeadTargetStage, setNewLeadTargetStage] = useState<LeadStage>("new");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [isUpdatingLead, setIsUpdatingLead] = useState(false);

  // Deep modular states (Transplanted Organs)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [proposalLead, setProposalLead] = useState<any | null>(null);
  const [calculatorLead, setCalculatorLead] = useState<any | null>(null);
  const [flightLead, setFlightLead] = useState<any | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [stages, setStages] = useState<any[]>(() => {
    if (kanbanStages && kanbanStages.length > 0) {
      return kanbanStages.map((s: any) => ({
        id: s.stage_key,
        title: s.title,
        dotColor: s.color || "var(--primary)",
        badgeClass: "bg-muted text-foreground",
        description: s.description || "",
        is_visible: s.is_visible !== false,
      }));
    }
    return STAGES;
  });

  const visibleStages = useMemo(() => {
    return stages.filter((s: any) => s.is_visible !== false);
  }, [stages]);
  const [isExportingLeadDossier, setIsExportingLeadDossier] = useState(false);

  const handleExportLeadDossier = async () => {
    if (!selectedLead) return;
    setIsExportingLeadDossier(true);
    try {
      const cleanName = (selectedLead.full_name || "lead").replace(/\s+/g, "_");
      await exportElementAsPdf("customer-360-lead-dossier", `Dossie_Lead_${cleanName}.pdf`);
      toast.success("Dossiê 360° do Lead exportado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar Dossiê 360° do Lead.");
    } finally {
      setIsExportingLeadDossier(false);
    }
  };

  // Formulário Avançado de Novo Lead (Padrão Enterprise)
  const initialNewLeadState = {
    name: "",
    email: "",
    phone: "",
    destination: "",
    interestType: "package_flight",
    interestPeriod: "",
    travelStart: "",
    travelEnd: "",
    paxAdults: 2,
    paxChildren: 0,
    paxInfants: 0,
    paxAgesStr: "",
    estimatedValueCents: 0,
    source: "whatsapp",
    leadSourceDetail: "",
    assignedTo: "",
    notes: "",
    tags: [] as string[],
    customChecklist: DEFAULT_CHECKLIST_TEMPLATE,
  };

  const [newLeadForm, setNewLeadForm] = useState(initialNewLeadState);

  // Formulário de Edição do Lead Selecionado (Ficha 360°)
  const [editLeadForm, setEditLeadForm] = useState<{
    destination: string;
    interest_type: string;
    interest_period: string;
    travel_start: string;
    travel_end: string;
    pax_adults: number;
    pax_children: number;
    pax_infants: number;
    pax_ages_str: string;
    estimated_value_cents: number;
    notes: string;
    status: string;
    source: string;
    lead_source_detail: string;
    assigned_to: string;
    tags: string[];
    checklist: Array<{ id: string; text: string; done: boolean }>;
    lost_reason: string;
  }>({
    destination: "",
    interest_type: "",
    interest_period: "",
    travel_start: "",
    travel_end: "",
    pax_adults: 1,
    pax_children: 0,
    pax_infants: 0,
    pax_ages_str: "",
    estimated_value_cents: 0,
    notes: "",
    status: "new",
    source: "whatsapp",
    lead_source_detail: "",
    assigned_to: "",
    tags: [],
    checklist: [],
    lost_reason: "",
  });

  const [newChecklistItemText, setNewChecklistItemText] = useState("");
  const [activeTabDetail, setActiveTabDetail] = useState<"viagem" | "cliente360" | "contratos" | "telemetria" | "checklist" | "comercial" | "notas">("viagem");
  const [selectedOnboardingFormSlug, setSelectedOnboardingFormSlug] = useState<string>("");
  const [budgetPadLeadOpen, setBudgetPadLeadOpen] = useState(false);

  const { data: onboardingFormsData } = useQuery({
    queryKey: ["store-onboarding-forms", storeId],
    queryFn: () => getStoreOnboardingForms({ data: { storeId: storeId || undefined } }),
    enabled: Boolean(storeId),
  });

  const activeOnboardingForm =
    (onboardingFormsData?.availableForms || []).find((f: any) => f.slug === selectedOnboardingFormSlug) ||
    onboardingFormsData?.defaultForm ||
    null;

  const handleCopyOnboardingFormLink = async () => {
    if (!activeOnboardingForm || !selectedLead) {
      toast.info("Nenhum formulário de onboarding configurado para este atendimento.");
      return;
    }
    const cleanPhone = (selectedLead.phone || "").replace(/\D/g, "");
    const params = new URLSearchParams();
    params.set("leadId", selectedLead.id);
    if (selectedLead.full_name) params.set("nome", selectedLead.full_name);
    if (cleanPhone) params.set("tel", cleanPhone);
    if (selectedLead.email) params.set("email", selectedLead.email);

    const url = `${window.location.origin}/f/${activeOnboardingForm.slug}?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link do formulário de onboarding copiado com sucesso!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const handleSendOnboardingFormWhatsApp = () => {
    if (!activeOnboardingForm || !selectedLead) {
      toast.info("Nenhum formulário de onboarding configurado para este atendimento.");
      return;
    }
    const cleanPhone = (selectedLead.phone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("O lead não possui telefone cadastrado para envio via WhatsApp.");
      return;
    }
    const params = new URLSearchParams();
    params.set("leadId", selectedLead.id);
    if (selectedLead.full_name) params.set("nome", selectedLead.full_name);
    if (cleanPhone) params.set("tel", cleanPhone);
    if (selectedLead.email) params.set("email", selectedLead.email);

    const url = `${window.location.origin}/f/${activeOnboardingForm.slug}?${params.toString()}`;
    const firstName = (selectedLead.full_name || "Olá").split(" ")[0];
    const msg = `Olá, ${firstName}! Para que possamos montar sua proposta e roteiro com precisão, por favor preencha seus dados na nossa ficha rápida:\n\n${url}`;

    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };
  const [customer360Data, setCustomer360Data] = useState<{
    customer: any;
    otherLeads: any[];
    contracts: any[];
    activities: any[];
  } | null>(null);
  const [isLoading360, setIsLoading360] = useState(false);
  const [isIssuingContract, setIsIssuingContract] = useState(false);
  const [copiedMagicLink, setCopiedMagicLink] = useState(false);
  const [contractForm, setContractForm] = useState({
    title: "",
    packageSummary: "",
    totalValueCents: 0,
    paymentConditions: "À vista ou parcelado em até 10x",
  });

  const openLeadDetails = (lead: any) => {
    setSelectedLead(lead);
    const paxAgesStr = Array.isArray(lead.pax_ages) ? lead.pax_ages.join(", ") : "";
    setEditLeadForm({
      destination: lead.destination || "",
      interest_type: lead.interest_type || "",
      interest_period: lead.interest_period || "",
      travel_start: lead.travel_start || "",
      travel_end: lead.travel_end || "",
      pax_adults: lead.pax_adults || 1,
      pax_children: lead.pax_children || 0,
      pax_infants: lead.pax_infants || 0,
      pax_ages_str: paxAgesStr,
      estimated_value_cents: lead.estimated_value_cents || 0,
      notes: lead.notes || lead.message || "",
      status: lead.status || "new",
      source: lead.source || "whatsapp",
      lead_source_detail: lead.lead_source_detail || "",
      assigned_to: lead.assigned_to || "",
      tags: Array.isArray(lead.tags) ? lead.tags : [],
      checklist: Array.isArray(lead.checklist) ? lead.checklist : DEFAULT_CHECKLIST_TEMPLATE,
      lost_reason: lead.lost_reason || "",
    });
    setContractForm({
      title: lead.destination ? `Contrato de Viagem - ${lead.destination}` : `Contrato de Prestação de Serviços - ${lead.full_name || "Cliente"}`,
      packageSummary: lead.destination ? `Pacote Turístico completo para ${lead.destination}.` : "Prestação de serviços turísticos conforme proposta comercial.",
      totalValueCents: lead.estimated_value_cents || 0,
      paymentConditions: "Entrada + saldo em até 10x sem juros",
    });
    setActiveTabDetail("viagem");
    setIsLoading360(true);
    getCustomer360Profile({ data: { leadId: lead.id } })
      .then((res) => setCustomer360Data(res))
      .catch((err) => console.warn("Erro ao buscar perfil 360:", err))
      .finally(() => setIsLoading360(false));
  };

  const handleLoadCustomer360 = async (leadId: string) => {
    setIsLoading360(true);
    try {
      const res = await getCustomer360Profile({ data: { leadId } });
      setCustomer360Data(res);
    } catch (err) {
      console.warn("Erro ao buscar perfil 360:", err);
    } finally {
      setIsLoading360(false);
    }
  };

  useEffect(() => {
    const targetLeadId = routeSearch.leadId;
    const targetDealId = routeSearch.dealId;
    const deepKey = `${targetLeadId || ""}:${targetDealId || ""}`;
    if (!targetLeadId && !targetDealId) return;
    if (handledDeepLinkRef.current === deepKey || leads.length === 0) return;

    const matched = leads.find((l: any) => {
      if (targetLeadId && l.id === targetLeadId) return true;
      const cf = l.custom_fields && typeof l.custom_fields === "object" ? l.custom_fields : {};
      if (targetDealId && cf.source_deal_id === targetDealId) return true;
      return false;
    });
    if (matched) {
      handledDeepLinkRef.current = deepKey;
      openLeadDetails(matched);
    }
  }, [routeSearch.leadId, routeSearch.dealId, leads]);

  const buildKanbanProposalPayload = (leadObj: any) => {
    const cf = leadObj?.customFields && typeof leadObj.customFields === "object"
      ? leadObj.customFields
      : leadObj?.custom_fields && typeof leadObj.custom_fields === "object"
      ? leadObj.custom_fields
      : {};
    return {
      id: leadObj.id,
      fullName: leadObj.fullName || leadObj.full_name || leadObj.name || "",
      phone: leadObj.phone || "",
      email: leadObj.email || "",
      clientDocument: String(
        leadObj.clientDocument || leadObj.document || leadObj.cpf_cnpj || cf.document || "",
      ),
      destination: leadObj.destination || cf.source_listing_title || "",
      estimated_value_cents: leadObj.estimated_value_cents || 0,
      passenger_count:
        leadObj.passenger_count ||
        ((Number(leadObj.adultsCount ?? leadObj.pax_adults) || 2) +
          (Number(leadObj.childrenCount ?? leadObj.pax_children) || 0)),
      departureDate: leadObj.departureDate || leadObj.travel_start || undefined,
      returnDate: leadObj.returnDate || leadObj.travel_end || undefined,
      adultsCount: leadObj.adultsCount ?? leadObj.pax_adults ?? 2,
      childrenCount: leadObj.childrenCount ?? leadObj.pax_children ?? 0,
      notes: leadObj.notes || leadObj.message || "",
      customFields: cf,
      sourceListingId: leadObj.sourceListingId || leadObj.source_listing_id || cf.source_listing_id || "",
      sourceListingOrigin:
        leadObj.sourceListingOrigin || leadObj.source_listing_origin || cf.source_listing_origin || "",
      paxList: leadObj.paxList || (Array.isArray(leadObj.pax_list) ? leadObj.pax_list : undefined),
      boardingPoint: leadObj.boardingPoint || (cf.boarding_point ? String(cf.boarding_point) : undefined),
      departureOption: leadObj.departureOption || cf.departure_option || undefined,
    };
  };

  const handleOpenProposalOrBudget = (leadObj: any) => {
    const payload = buildKanbanProposalPayload(leadObj);
    if (nicheBlueprint.isTourism) {
      setProposalLead(payload);
      return;
    }
    setBudgetPadTargetLead(payload);
    setBudgetPadLeadOpen(true);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((l: any) => {
      const q = searchTerm.toLowerCase();
      const matchName = l.full_name?.toLowerCase().includes(q);
      const matchEmail = l.email?.toLowerCase().includes(q);
      const matchPhone = l.phone?.toLowerCase().includes(q);
      const matchMsg = l.message?.toLowerCase().includes(q);
      const matchDest = l.destination?.toLowerCase().includes(q);
      const matchPeriod = l.interest_period?.toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone || matchMsg || matchDest || matchPeriod;
    });
  }, [leads, searchTerm]);

  // Total Pipeline Value
  const totalPipelineCents = useMemo(() => {
    return filteredLeads
      .filter((l: any) => l.status !== "lost")
      .reduce((sum: number, l: any) => sum + (l.estimated_value_cents || 0), 0);
  }, [filteredLeads]);

  const handleMoveStage = async (leadId: string, newStage: LeadStage) => {
    const prevLeads = [...leads];
    // Atualização otimista imediata na interface (0ms)
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStage } : l)));
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev: any) => (prev ? { ...prev, status: newStage } : null));
    }

    try {
      await persistLeadMove({
        data: {
          leadId,
          toStatus: newStage,
          reorderedIds: [],
        },
      });
      toast.success("Oportunidade movida no funil com sucesso!");
      router.invalidate();
    } catch (err: any) {
      // Rollback defensivo
      setLeads(prevLeads);
      if (selectedLead?.id === leadId) {
        const original = prevLeads.find((l) => l.id === leadId);
        if (original) setSelectedLead(original);
      }
      toast.error(err.message || "Erro ao mover lead.");
    }
  };

  const handleOpenScheduleMeeting = () => {
    if (!selectedLead) return;
    setMeetingTitle(`Reunião Comercial - ${selectedLead.full_name || selectedLead.title || "Oportunidade"}`);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setMeetingDate(tomorrow.toISOString().slice(0, 16));
    setMeetingDuration(30);
    setMeetingType("call");
    setMeetingNotes("");
    setMeetingModalOpen(true);
  };

  const handleConfirmScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !meetingDate) return;
    setIsSchedulingMeeting(true);
    try {
      await addLeadMeeting({
        data: {
          leadId: selectedLead.id,
          title: meetingTitle.trim() || `Reunião com ${selectedLead.full_name}`,
          description: meetingNotes.trim() || null,
          scheduledAt: new Date(meetingDate).toISOString(),
          durationMinutes: meetingDuration,
          meetingType,
        },
      });
      toast.success("Reunião agendada e registrada nas atividades do lead!");
      setMeetingModalOpen(false);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar reunião.");
    } finally {
      setIsSchedulingMeeting(false);
    }
  };

  const handleCopyMagicLink = async () => {
    if (!selectedLead) return;
    const token = selectedLead.magic_token || selectedLead.id;
    const url = `${window.location.origin}/m/lead/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedMagicLink(true);
      toast.success("Link do formulário autônomo copiado!");
      setTimeout(() => setCopiedMagicLink(false), 2500);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível copiar o link.");
    }
  };

  const handleCopyContractLink = async (publicToken: string) => {
    const url = `${window.location.origin}/viajante/${publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link de assinatura digital copiado!");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível copiar o link.");
    }
  };

  const handleIssueContract = async () => {
    if (!selectedLead) return;
    if (!contractForm.title.trim()) {
      toast.error("Informe o título do contrato.");
      return;
    }
    if (!contractForm.packageSummary.trim()) {
      toast.error("Informe o resumo dos serviços contratados.");
      return;
    }
    try {
      setIsIssuingContract(true);
      const res = await issueLeadContract({
        data: {
          leadId: selectedLead.id,
          contractTitle: contractForm.title,
          packageSummary: contractForm.packageSummary,
          totalValueCents: contractForm.totalValueCents || selectedLead.estimated_value_cents || 0,
          paymentConditions: contractForm.paymentConditions,
        },
      });
      toast.success(`Contrato gerado com sucesso! Token: ${res.publicToken}`);
      getCustomer360Profile({ data: { leadId: selectedLead.id } })
        .then((r) => setCustomer360Data(r))
        .catch(() => null);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao emitir contrato.");
    } finally {
      setIsIssuingContract(false);
    }
  };

  const handlePromoteToCustomer = async (leadId: string) => {
    try {
      const res = await promoteLeadToCustomer({ data: { leadId } });
      toast.success("Lead promovido com sucesso para a Carteira de Clientes 360°!");
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev: any) => (prev ? { ...prev, customer_id: res.customerId } : null));
        try {
          const profile360 = await getCustomer360Profile({ data: { leadId } });
          setCustomer360Data(profile360);
        } catch {
          // fallback silencioso
        }
      }
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao converter lead.");
    }
  };

  const handleCreateNewLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name.trim()) {
      toast.error("Informe o nome do passageiro / titular.");
      return;
    }
    setIsSubmittingNew(true);
    try {
      const paxAges = (newLeadForm.paxAgesStr || "")
        .split(",")
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n));

      await createLead({
        data: {
          fullName: newLeadForm.name.trim(),
          email: newLeadForm.email.trim() || null,
          phone: newLeadForm.phone.trim() || null,
          destination: newLeadForm.destination.trim() || null,
          interestType: newLeadForm.interestType || null,
          interestPeriod: newLeadForm.interestPeriod.trim() || null,
          travelStart: newLeadForm.travelStart || null,
          travelEnd: newLeadForm.travelEnd || null,
          paxAdults: Number(newLeadForm.paxAdults) || 1,
          paxChildren: Number(newLeadForm.paxChildren) || 0,
          paxInfants: Number(newLeadForm.paxInfants) || 0,
          paxAges,
          estimatedValueCents: newLeadForm.estimatedValueCents || 0,
          source: newLeadForm.source,
          leadSourceDetail: newLeadForm.leadSourceDetail.trim() || null,
          status: newLeadTargetStage,
          assignedTo: newLeadForm.assignedTo || null,
          tags: newLeadForm.tags,
          checklist: newLeadForm.customChecklist,
          notes: newLeadForm.notes.trim() || null,
        },
      });

      toast.success("Oportunidade adicionada com sucesso ao funil comercial!");
      setIsNewLeadOpen(false);
      setNewLeadForm(initialNewLeadState);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar oportunidade.");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleSaveLeadDetails = async () => {
    if (!selectedLead) return;
    setIsUpdatingLead(true);
    try {
      const paxAges = (editLeadForm.pax_ages_str || "")
        .split(",")
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n));

      await updateLeadDetails({
        data: {
          leadId: selectedLead.id,
          destination: editLeadForm.destination || null,
          interestType: editLeadForm.interest_type || null,
          interestPeriod: editLeadForm.interest_period || null,
          travelStart: editLeadForm.travel_start || null,
          travelEnd: editLeadForm.travel_end || null,
          paxAdults: Number(editLeadForm.pax_adults) || 1,
          paxChildren: Number(editLeadForm.pax_children) || 0,
          paxInfants: Number(editLeadForm.pax_infants) || 0,
          paxAges,
          estimated_value_cents: editLeadForm.estimated_value_cents,
          notes: editLeadForm.notes,
          status: editLeadForm.status as any,
          source: editLeadForm.source,
          lead_source_detail: editLeadForm.lead_source_detail || null,
          assigned_to: editLeadForm.assigned_to || null,
          tags: editLeadForm.tags,
          checklist: editLeadForm.checklist,
          lost_reason: editLeadForm.lost_reason || null,
        },
      });
      toast.success("Detalhes do lead atualizados com sucesso!");
      setSelectedLead(null);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar alterações.");
    } finally {
      setIsUpdatingLead(false);
    }
  };

  const handleSaveLeadFromDossier = async (updatedData: any) => {
    if (!selectedLead) return;
    try {
      await updateLeadDetails({
        data: {
          leadId: selectedLead.id,
          fullName: updatedData.name?.trim() || undefined,
          phone: updatedData.phone?.trim() || undefined,
          email: updatedData.email?.trim() || undefined,
          destination: updatedData.destination || null,
          interestType: updatedData.interest_type || null,
          travelStart: updatedData.travel_start || null,
          travelEnd: updatedData.travel_end || null,
          paxAdults: Number(updatedData.pax_adults) || 1,
          paxChildren: Number(updatedData.pax_children) || 0,
          paxInfants: Number(updatedData.pax_infants) || 0,
          source: updatedData.source || null,
          lead_source_detail: updatedData.lead_source_detail || null,
          estimated_value_cents: updatedData.estimated_value_cents,
          notes: updatedData.notes,
          status: updatedData.status as any,
          assigned_to: updatedData.assigned_to || null,
          tags: updatedData.tags,
          checklist: updatedData.checklist,
          custom_fields: updatedData.custom_fields,
        },
      });
      toast.success("Oportunidade comercial atualizada com sucesso!");
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedLead.id
            ? { ...l, ...updatedData, full_name: updatedData.name || l.full_name }
            : l
        )
      );
      setSelectedLead((prev: any) => (prev ? { ...prev, ...updatedData, full_name: updatedData.name || prev.full_name } : null));
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações da oportunidade.");
      throw err;
    }
  };

  const handleToggleChecklist = async (itemId: string) => {
    if (!selectedLead) return;
    try {
      const res = await toggleLeadChecklist({
        data: {
          leadId: selectedLead.id,
          itemId,
        },
      });
      if (res.checklist) {
        setEditLeadForm((prev) => ({ ...prev, checklist: res.checklist }));
        setSelectedLead((prev: any) => (prev ? { ...prev, checklist: res.checklist } : null));
      }
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar checklist.");
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItemText.trim()) return;
    const newItem = {
      id: `custom-${Date.now()}`,
      text: newChecklistItemText.trim(),
      done: false,
    };
    setEditLeadForm((prev) => ({
      ...prev,
      checklist: [...prev.checklist, newItem],
    }));
    setNewChecklistItemText("");
  };

  const handleRemoveChecklistItem = (id: string) => {
    setEditLeadForm((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((i) => i.id !== id),
    }));
  };

  const handleToggleTag = (tagStr: string) => {
    setEditLeadForm((prev) => {
      const exists = prev.tags.includes(tagStr);
      return {
        ...prev,
        tags: exists ? prev.tags.filter((t) => t !== tagStr) : [...prev.tags, tagStr],
      };
    });
  };

  const handleToggleNewLeadTag = (tagStr: string) => {
    setNewLeadForm((prev) => {
      const exists = prev.tags.includes(tagStr);
      return {
        ...prev,
        tags: exists ? prev.tags.filter((t) => t !== tagStr) : [...prev.tags, tagStr],
      };
    });
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteLead({ data: { leadId } });
      toast.success("Lead removido com sucesso!");
      setSelectedLead(null);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover lead.");
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col gap-4 min-h-0 pb-6 overflow-x-hidden">
      {loadError && <div role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{loadError}</div>}
      <div className="flex items-center justify-between px-1 shrink-0">
        <p className="text-xs font-medium text-muted-foreground">{nicheBlueprint.kanbanTitle}</p>
        <ModuleTourTrigger onClick={() => setIsTourOpen(true)} label="Guia do Módulo" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>

      {/* ── BARRA OPERACIONAL CANÔNICA (SILENCIOSA & ALTA DENSIDADE) ── */}
      <WorkspaceCanonicalToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar lead por nome, destino, período ou fone..."
        onMetricsClick={() => setIsDashboardOpen(true)}
        metricsBadge={totalPipelineCents > 0 ? formatMoney(totalPipelineCents) : undefined}
        onColumnsClick={() => setIsCustomizerOpen(true)}
        secondaryAction={{
          label: "Importar Leads",
          icon: Upload,
          onClick: () => setIsImportModalOpen(true),
          variant: "outline",
        }}
        primaryAction={{
          label: "Nova Oportunidade",
          icon: Plus,
          onClick: () => {
            setNewLeadTargetStage("new");
            setIsNewLeadOpen(true);
          },
        }}
      />

      {/* ── SELETOR MOBILE RÁPIDO DE ETAPAS (TOUCH ERGONÔMICO) ── */}
      <div className="sm:hidden flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pb-1 snap-x snap-mandatory shrink-0">
        {visibleStages.map((s: any) => {
          const count = filteredLeads.filter((l: any) =>
            s.id === "won"
              ? l.status === "won" || l.status === "converted"
              : l.status === s.id || (!l.status && s.id === "new")
          ).length;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                const el = document.getElementById(`kanban-col-${s.id}`);
                el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 snap-start bg-card text-foreground hover:bg-muted transition-colors duration-200 cursor-pointer min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={cn("size-2 rounded-full", s.dotColor)} />
              <span>{s.title}</span>
              <span className="text-xs font-mono px-2 py-1 rounded-md bg-muted text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── KANBAN BOARD FULL VERTICAL & HORIZONTAL (COLUNAS ALTAS & CARDS SÓLIDOS) ── */}
      <div className="flex-1 min-h-144 flex gap-4 overflow-x-auto scroll-area-carousel no-scrollbar pb-4 pt-1 items-stretch snap-x snap-mandatory [scrollbar-width:thin]">
        {visibleStages.map((stage: any, stageIndex: number) => {
          const stageLeads = filteredLeads.filter((l: any) => {
            if (stage.id === "won") return l.status === "won" || l.status === "converted";
            return l.status === stage.id || (!l.status && stage.id === "new");
          });

          const stageTotalCents = stageLeads.reduce(
            (sum: number, l: any) => sum + (l.estimated_value_cents || 0),
            0
          );

          const prevStage = stageIndex > 0 ? visibleStages[stageIndex - 1] : null;
          const nextStage = stageIndex < visibleStages.length - 1 ? visibleStages[stageIndex + 1] : null;

          return (
            <div
              key={stage.id}
              id={`kanban-col-${stage.id}`}
              className="flex flex-col rounded-2xl bg-muted/50 dark:bg-muted/30 w-full sm:w-80 min-w-full sm:min-w-80 shrink-0 min-h-144 h-full transition-colors duration-200 snap-center overflow-hidden"
            >
              {/* Header da Coluna com Somatório e Ação Rápida */}
              <div className="px-4 py-3 bg-transparent space-y-1 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("size-2 rounded-full shrink-0", stage.dotColor)} />
                    <h3 className="text-xs font-bold text-foreground truncate">{stage.title}</h3>
                    <span className="text-2xs font-mono tabular-nums font-bold px-2 py-1 rounded-full bg-card text-foreground shrink-0">
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {stageTotalCents > 0 && (
                      <span className="text-2xs font-mono tabular-nums font-semibold text-muted-foreground">
                        {formatMoney(stageTotalCents)}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setNewLeadTargetStage(stage.id);
                        setIsNewLeadOpen(true);
                      }}
                      /* design-lint-ignore DL-14 reason:"Gatilho compacto de adicao rapida no header de coluna desktop" expiry:"2027-12-31" */
                      className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card cursor-pointer min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                      title={`Novo lead em ${stage.title}`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Lista de Cards da Coluna (Altura Total sem corte max-h-96) */}
              <div className="px-3 pb-3 space-y-3 flex-1 min-h-0 overflow-y-auto no-scrollbar [scrollbar-width:thin]">
                {stageLeads.length === 0 ? (
                  <div className="h-full min-h-48 rounded-2xl bg-card flex flex-col items-center justify-center p-4 text-center text-muted-foreground gap-2">
                    <span className="text-xs font-medium">Nenhum lead nesta etapa</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewLeadTargetStage(stage.id);
                        setIsNewLeadOpen(true);
                      }}
                      className="min-h-11 px-4 rounded-xl text-xs text-foreground font-bold gap-2 bg-card hover:bg-muted cursor-pointer mt-1"
                    >
                      <Plus className="size-3.5" />
                      <span>Adicionar Lead</span>
                    </Button>
                  </div>
                ) : (
                  stageLeads.map((lead: any) =>
                    nicheBlueprint.isTourism ? (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        currentStageId={stage.id}
                        stages={visibleStages.map((s: any) => ({ id: s.id, title: s.title }))}
                        team={team}
                        onOpenDetails={openLeadDetails}
                        onGenerateProposal={handleOpenProposalOrBudget}
                        onCalculateCommission={setCalculatorLead}
                        onOpenFlightGrid={setFlightLead}
                        onStageChange={(leadId, newStage) => handleMoveStage(leadId, newStage as any)}
                        onPromote={handlePromoteToCustomer}
                        onDelete={handleDeleteLead}
                        prevStageId={prevStage?.id}
                        nextStageId={nextStage?.id}
                      />
                    ) : (
                      <UniversalKanbanCard
                        key={lead.id}
                        id={lead.id}
                        variant="standard"
                        title={lead.full_name || "Cliente sem nome"}
                        subtitle={
                          lead.destination ||
                          lead.custom_fields?.source_listing_title ||
                          lead.source_detail ||
                          lead.phone ||
                          nicheBlueprint.specsSectionTitle
                        }
                        description={lead.notes || lead.message || undefined}
                        valueCents={lead.estimated_value_cents || undefined}
                        assigneeName={
                          team.find((m: any) => (m.profile_id || m.id) === lead.assigned_to)?.full_name ||
                          team.find((m: any) => (m.profile_id || m.id) === lead.assigned_to)?.name
                        }
                        checklistTotal={Array.isArray(lead.checklist) ? lead.checklist.length : 0}
                        checklistDone={
                          Array.isArray(lead.checklist)
                            ? lead.checklist.filter((it: any) => it?.done).length
                            : 0
                        }
                        tags={(() => {
                          const dynamicTags = buildStructuredCustomFieldsSummaryRows(lead.custom_fields)
                            .slice(0, 2)
                            .map((row) => `${row.label}: ${row.value}`);
                          const cf = (lead.custom_fields || {}) as Record<string, any>;
                          const adLabel =
                            cf.utm_campaign ||
                            cf.campaign ||
                            (cf.ctwa_clid ? "Anúncio CTWA" : cf.gclid ? "Google Ads" : cf.meta_ad_id || cf.ad_id ? `Anúncio #${cf.meta_ad_id || cf.ad_id}` : cf.fbclid ? "Meta Ads" : null);
                          const attrTags = adLabel ? [`Origem: ${adLabel}`] : [];
                          const baseTags = Array.isArray(lead.tags) ? lead.tags : [];
                          return [...attrTags, ...baseTags, ...dynamicTags].slice(0, 4);
                        })()}
                        onSelect={() => openLeadDetails(lead)}
                        onAdvance={
                          nextStage
                            ? () => handleMoveStage(lead.id, nextStage.id as any)
                            : undefined
                        }
                        advanceLabel={nextStage ? `Mover: ${nextStage.title}` : undefined}
                      />
                    ),
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MODAL / SHEET LATERAL DE NOVA OPORTUNIDADE (PADRÃO ENTERPRISE) ── */}
      <Sheet open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 flex flex-col justify-between overflow-y-auto no-scrollbar">
          <div className="space-y-6">
            <SheetHeader className="p-0 text-left space-y-1 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md">
                  Cockpit Comercial Enterprise
                </span>
                <span className="text-xs text-muted-foreground">Etapa: {STAGES.find((s) => s.id === newLeadTargetStage)?.title}</span>
              </div>
              <SheetTitle className="text-lg font-bold text-foreground">Nova Oportunidade Comercial</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Cadastre viajantes e viagens com todas as especificações de voo, hotel e passageiros.
              </SheetDescription>
            </SheetHeader>

            <form id="new-lead-form" onSubmit={handleCreateNewLead} className="space-y-5">
              {/* Bloco 1: Contato */}
              <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Users className="size-3.5 text-primary" />
                  <span>Contato Principal</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Nome Completo *</Label>
                    <Input
                      value={newLeadForm.name}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Roberto Carlos Silva"
                      className="h-11 min-h-11 text-xs rounded-lg"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Telefone / WhatsApp *</Label>
                    <Input
                      value={newLeadForm.phone}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="(49) 99999-9999"
                      className="h-11 min-h-11 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">E-mail</Label>
                    <Input
                      type="email"
                      value={newLeadForm.email}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="roberto@email.com"
                      className="h-11 min-h-11 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Canal / Origem</Label>
                    <Select
                      value={newLeadForm.source}
                      onValueChange={(val) => setNewLeadForm((prev) => ({ ...prev, source: val }))}
                    >
                      <SelectTrigger className="h-11 min-h-11 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {LEAD_SOURCES.map((s) => (
                          <SelectItem key={s.value} value={s.value} className="text-xs">
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400">
                  <UserCheck className="size-4 shrink-0" />
                  <span>Contato sincronizado diretamente com a Carteira de Clientes da loja.</span>
                </div>
              </div>

              {/* Bloco 2: Viagem, Destino & Período */}
              <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <MapPin className="size-3.5 text-primary" />
                  <span>Destino e Período</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Destino de Interesse</Label>
                    <Input
                      value={newLeadForm.destination}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, destination: e.target.value }))}
                      placeholder="Ex: Maceió, AL ou Paris, França"
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Tipo de Interesse</Label>
                    <Select
                      value={newLeadForm.interestType}
                      onValueChange={(val) => setNewLeadForm((prev) => ({ ...prev, interestType: val }))}
                    >
                      <SelectTrigger className="h-8 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {INTEREST_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Período Flexível</Label>
                    <Input
                      value={newLeadForm.interestPeriod}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, interestPeriod: e.target.value }))}
                      placeholder="Ex: Julho de 2026, Réveillon"
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Data Prevista de Ida</Label>
                    <Input
                      type="date"
                      value={newLeadForm.travelStart}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, travelStart: e.target.value }))}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Data Prevista de Volta</Label>
                    <Input
                      type="date"
                      value={newLeadForm.travelEnd}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, travelEnd: e.target.value }))}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 3: Passageiros */}
              <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Plane className="size-3.5 text-primary" />
                  <span>Passageiros</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Adultos</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newLeadForm.paxAdults}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, paxAdults: Number(e.target.value) || 1 }))}
                      className="h-8 text-xs rounded-lg font-mono"
                    />
                    <span className="text-xs text-muted-foreground block">A partir de 12 anos</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Crianças</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newLeadForm.paxChildren}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, paxChildren: Number(e.target.value) || 0 }))}
                      className="h-8 text-xs rounded-lg font-mono"
                    />
                    <span className="text-xs text-muted-foreground block">2 a 11 anos</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Bebês</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newLeadForm.paxInfants}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, paxInfants: Number(e.target.value) || 0 }))}
                      className="h-8 text-xs rounded-lg font-mono"
                    />
                    <span className="text-xs text-muted-foreground block">Até 23 meses</span>
                  </div>
                </div>
                {newLeadForm.paxChildren > 0 && (
                  <div className="space-y-1 pt-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Idades das Crianças</Label>
                    <Input
                      value={newLeadForm.paxAgesStr}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, paxAgesStr: e.target.value }))}
                      placeholder="Ex: 4, 8 (separadas por vírgula)"
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Bloco 4: Condições Comerciais */}
              <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <DollarSign className="size-3.5 text-primary" />
                  <span>Condições Comerciais</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Orçamento Estimado (R$)</Label>
                    <CurrencyField
                      value={newLeadForm.estimatedValueCents}
                      onChange={(cents) => setNewLeadForm((prev) => ({ ...prev, estimatedValueCents: cents ?? 0 }))}
                      className="h-8 text-xs rounded-lg font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/75 font-semibold">Vendedor Responsável</Label>
                    <Select
                      value={newLeadForm.assignedTo || "none"}
                      onValueChange={(val) => setNewLeadForm((prev) => ({ ...prev, assignedTo: val === "none" ? "" : val }))}
                    >
                      <SelectTrigger className="h-8 text-xs rounded-lg">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="none" className="text-xs text-muted-foreground">
                          Sem responsável atribuído
                        </SelectItem>
                        {team.map((m: any) => (
                          <SelectItem key={m.id || m.profile_id} value={m.profile_id || m.id} className="text-xs">
                            {m.name || m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Seleção de Tags Populares */}
                <div className="space-y-2 pt-1">
                  <Label className="text-xs text-muted-foreground/75 font-semibold">Tags de Segmentação</Label>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_TAGS.map((t) => {
                      const tagStr = `${t.name}:${t.tone}`;
                      const isSelected = newLeadForm.tags.includes(tagStr);
                      return (
                        <button
                          key={tagStr}
                          type="button"
                          onClick={() => handleToggleNewLeadTag(tagStr)}
                          className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", 
                            "text-xs font-bold uppercase px-2 min-h-11 rounded-md transition-colors duration-200 cursor-pointer",
                            isSelected
                              ? TAG_TONE_CLASSES[t.tone]
                              : "text-muted-foreground bg-background hover:bg-muted"
                          )}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <Label className="text-xs text-muted-foreground/75 font-semibold">Observações / Notas Iniciais</Label>
                  <Textarea
                    value={newLeadForm.notes}
                    onChange={(e) => setNewLeadForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Preferências de resort, restrições alimentares, comemoração especial..."
                    className="text-xs rounded-lg resize-none"
                    rows={2}
                  />
                </div>
              </div>
            </form>
          </div>

          <SheetFooter className="p-0 pt-4 border-t border-border/60 flex items-center justify-between gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewLeadOpen(false)}
              className="rounded-lg text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="new-lead-form"
              size="sm"
              disabled={isSubmittingNew}
              className="rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmittingNew ? "Salvando no Funil..." : "Salvar no Funil"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── FICHA 360° DO LEAD (DOSSIÊ ENTERPRISE UNIFICADO) ── */}
      {selectedLead && (
        <Sheet open={Boolean(selectedLead)} onOpenChange={() => setSelectedLead(null)}>
          <SheetContent
            side="right"
            size="70"
            className="p-0 flex flex-col h-full bg-background border-l border-border/60 overflow-hidden w-full max-sm:inset-0 sm:max-w-4xl md:max-w-5xl lg:sheet-page-70"
          >
            <TourismPipeCardDossier
              lead={selectedLead}
              stages={stages}
              team={team}
              proposals={initialProposals || []}
              onClose={() => setSelectedLead(null)}
              onMoveStage={(leadId, stageId) => handleMoveStage(leadId, stageId as any)}
              onSaveLead={handleSaveLeadFromDossier}
              onPromoteToCustomer={(leadId) => handlePromoteToCustomer(leadId)}
              onGenerateProposal={(leadData) => {
                setSelectedLead(null);
                handleOpenProposalOrBudget(leadData);
              }}
              onScheduleMeeting={async (data) => {
                await addLeadMeeting({ data });
                toast.success("Reunião agendada com sucesso!");
                router.invalidate();
              }}
              onIssueContract={async (data) => {
                const res = await issueLeadContract({ data });
                const updated360 = await getCustomer360Profile({ data: { leadId: data.leadId } });
                setCustomer360Data(updated360);
                return res;
              }}
              onCopyContractLink={(publicToken) => {
                navigator.clipboard.writeText(`${window.location.origin}/contrato/${publicToken}`);
                toast.success("Link de assinatura digital copiado!");
              }}
              onToggleChecklist={(itemId) => handleToggleChecklist(itemId)}
              customer360Data={customer360Data}
              activeOnboardingForm={activeOnboardingForm}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* ── Painel de Métricas do Funil Sob Demanda (Apple HIG) ── */}
      <WorkspaceDashboardSheet
        open={isDashboardOpen}
        onOpenChange={setIsDashboardOpen}
        title="Pipeline Comercial"
        description="Indicadores de volume, taxas de conversão e negociações em andamento."
        metrics={[
          {
            id: "pipeline_val",
            label: "Valor no Pipeline",
            value: formatMoney(totalPipelineCents),
            icon: DollarSign,
            trend: { value: "Ativo", direction: "up" },
            description: "Somatório de estimativas em negociação ativa",
          },
          {
            id: "leads_active",
            label: "Leads em Atendimento",
            value: leads.filter((l: any) => l.status !== "lost" && l.status !== "won" && l.status !== "converted").length,
            icon: Kanban,
            description: "Oportunidades em contato, qualificação ou proposta",
          },
          {
            id: "won_leads",
            label: "Vendas Fechadas (Ganhos)",
            value: leads.filter((l: any) => l.status === "won" || l.status === "converted").length,
            icon: CheckCircle2,
            trend: { value: "Sucesso", direction: "up" },
            description: "Pacotes e viagens confirmadas e emitidas",
          },
          {
            id: "lost_leads",
            label: "Leads Perdidos",
            value: leads.filter((l: any) => l.status === "lost").length,
            icon: Clock,
            trend: { value: "Declinados", direction: "down" },
            description: "Oportunidades sem retorno ou recusadas",
          },
          {
            id: "total_leads",
            label: "Total de Leads Cadastrados",
            value: leads.length,
            icon: Users,
            description: "Volume total de contatos no sistema",
          },
        ]}
        breakdown={{
          title: "Distribuição de Oportunidades por Canal",
          items: LEAD_SOURCES.map((src) => ({
            label: src.label,
            value: leads.filter((l: any) => l.source === src.value).length,
            total: Math.max(leads.length, 1),
            color: src.value === "whatsapp" ? "bg-emerald-500" : src.value === "instagram" ? "bg-pink-500" : "bg-primary",
          })),
        }}
      />

      {/* ── Modal de Customização de Colunas do Funil ── */}
      {storeId && (
        <KanbanColumnCustomizerModal
          open={isCustomizerOpen}
          onOpenChange={setIsCustomizerOpen}
          storeId={storeId}
          module="commercial_crm"
          stages={stages.map((s: any) => ({
            stage_key: s.id || s.stage_key,
            title: s.title,
            purpose: s.purpose || (s.id === "won" ? "won" : s.id === "lost" ? "lost" : "in_progress"),
            color: s.dotColor || s.color || "var(--primary)",
            sort_order: s.sort_order ?? 0,
            is_visible: s.is_visible !== false,
            sla_minutes: s.sla_minutes,
          }))}
          onStagesUpdated={(updated) => {
            setStages(updated.map((s: any) => ({
              id: s.stage_key,
              title: s.title,
              dotColor: s.color || "var(--primary)",
              badgeClass: "bg-muted text-foreground",
              description: s.description || "",
              is_visible: s.is_visible !== false,
              sla_minutes: s.sla_minutes,
            })));
          }}
        />
      )}

      {/* ── Transplante Modular Comercial (Órgãos Deep de Negociação) ── */}
      <LeadImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => router.invalidate()}
      />

      <UnifiedProposalWorkspace
        open={Boolean(proposalLead)}
        onOpenChange={(open) => {
          if (!open) setProposalLead(null);
        }}
        lead={proposalLead}
        mode="kanban_lead_quote"
        onCreated={() => router.invalidate()}
      />

      <CommercialBudgetPadSheet
        open={budgetPadLeadOpen}
        onOpenChange={(isOpen) => {
          setBudgetPadLeadOpen(isOpen);
          if (!isOpen) setBudgetPadTargetLead(null);
        }}
        initialLeadId={budgetPadTargetLead?.id || selectedLead?.id}
        initialClientData={{
          name: budgetPadTargetLead?.fullName || selectedLead?.full_name || selectedLead?.name || "",
          cpfOrCnpj:
            budgetPadTargetLead?.clientDocument ||
            selectedLead?.document ||
            selectedLead?.cpf_cnpj ||
            selectedLead?.custom_fields?.document ||
            "",
          phone: budgetPadTargetLead?.phone || selectedLead?.phone || "",
          email: budgetPadTargetLead?.email || selectedLead?.email || "",
          cityState: budgetPadTargetLead?.destination || selectedLead?.destination || "",
        }}
        initialNotes={(() => {
          const cf = budgetPadTargetLead?.customFields || selectedLead?.custom_fields || {};
          const rows = buildStructuredCustomFieldsSummaryRows(cf);
          const cfLines = rows.map((r) => `• ${r.label}: ${r.value}`).join("\n");
          const baseNotes = String(budgetPadTargetLead?.notes || selectedLead?.notes || "").trim();
          return [baseNotes, cfLines].filter(Boolean).join("\n\n");
        })()}
        initialItems={(() => {
          const target = budgetPadTargetLead || selectedLead;
          if (!target) return undefined;
          const itemTitle =
            target.customFields?.source_listing_title ||
            target.custom_fields?.source_listing_title ||
            target.destination ||
            "";
          const amount = Number(target.estimated_value_cents || 0);
          if (!itemTitle && amount <= 0) return undefined;
          return [
            {
              title: String(itemTitle || "Item / Serviço Solicitado"),
              unit: "un",
              quantity: 1,
              unitPriceCents: amount > 0 ? amount : 0,
            },
          ];
        })()}
      />

      <LeadCommissionCalculatorSheet
        isOpen={!!calculatorLead}
        onClose={() => setCalculatorLead(null)}
        lead={calculatorLead}
        onSuccess={() => router.invalidate()}
      />

      <LeadFlightGridSheet
        isOpen={!!flightLead}
        onClose={() => setFlightLead(null)}
        lead={flightLead}
        storeId={storeId}
        onSuccess={() => router.invalidate()}
      />

      {/* ── ONBOARDING GUIADO DO COMERCIAL ── */}
      <ModuleTourModal
        moduleId="comercial"
        moduleName="Comercial & CRM"
        slides={COMERCIAL_TOUR_SLIDES}
        isOpen={isTourOpen}
        onOpenChange={setIsTourOpen}
      />

      {/* ── Modal Canônico de Agendamento de Reunião com o Lead (lead_meetings) ── */}
      <Dialog open={meetingModalOpen} onOpenChange={setMeetingModalOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-2xl bg-card space-y-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              <DialogTitle className="text-base font-bold text-foreground">
                Agendar Reunião com Lead
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              A reunião será registrada no histórico de atividades e na agenda do vendedor responsável.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmScheduleMeeting} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Título do Compromisso</Label>
              <Input
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Ex: Alinhamento de Proposta de Pacote"
                required
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Data e Hora</Label>
                <Input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  required
                  className="h-11 min-h-11 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Formato</Label>
                <Select value={meetingType} onValueChange={(val: any) => setMeetingType(val)}>
                  <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Ligação Telefônica</SelectItem>
                    <SelectItem value="video">Vídeoconferência (Meet / Zoom)</SelectItem>
                    <SelectItem value="in_person">Presencial na Agência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Duração Estimada</Label>
              <Select value={String(meetingDuration)} onValueChange={(val) => setMeetingDuration(Number(val))}>
                <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos (Alinhamento rápido)</SelectItem>
                  <SelectItem value="30">30 minutos (Padrão)</SelectItem>
                  <SelectItem value="45">45 minutos (Apresentação completa)</SelectItem>
                  <SelectItem value="60">60 minutos (Consultoria / Fechamento)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Pauta / Observações (Opcional)</Label>
              <Textarea
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                placeholder="Ex: Apresentar opções de hotel em Gramado e condições parceladas."
                className="min-h-20 text-xs rounded-lg resize-none"
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMeetingModalOpen(false)}
                className="h-11 min-h-11 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSchedulingMeeting || !meetingDate}
                className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 px-5 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Calendar className="size-4" />
                <span>{isSchedulingMeeting ? "Agendando..." : "Confirmar Agendamento"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
