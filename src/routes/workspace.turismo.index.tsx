import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Compass,
  Plus,
  Search,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  MoreVertical,
  Plane,
  Building2,
  Tag,
  DollarSign,
  Phone,
  Mail,
  ExternalLink,
  Kanban,
  FileText,
  Send,
  FileSignature,
  ArrowRight,
  TrendingUp,
  MapPin,
  Check,
  Eye,
  SlidersHorizontal,
  AlertTriangle,
  Luggage,
  ShieldAlert,
  ShieldCheck,
  Receipt,
  UserCheck,
  Upload,
  Calculator,
  MessageSquare,
  Trash2,
  Edit3,
  Copy,
  CreditCard,
  Percent,
  Sparkles,
  RotateCcw,
  History,
  Star,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  CheckSquare,
  Square,
  Share2,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyField } from "@/components/ui/currency-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TravelerVerificationFlow } from "@/components/tourism/checkout/TravelerVerificationFlow";
import { TourismPipeCardDossier } from "@/components/tourism/crm/TourismPipeCardDossier";
import { toast } from "sonner";
import {
  listLeads,
  updateLeadStatus,
  updateLeadDetails,
  promoteLeadToCustomer,
  createLead,
  toggleLeadChecklist,
  deleteLead,
  persistLeadMove,
  getCustomer360Profile,
  issueLeadContract,
  listCustomers,
  addLeadMeeting,
} from "@/services/crm.functions";
import { listStoreTrips, convertProposalToTrip } from "@/services/travel-lifecycle.functions";
import { getStoreSettings } from "@/services/store.functions";
import { listAgencyTravelProposals, bundleTravelProposalsIntoSingleLink } from "@/services/travel-proposal.functions";
import { listDepartureCards, resolveAirlineCheckinUrl } from "@/services/travel-departures.functions";
import { listTravelSaleFinancialSheets } from "@/services/travel-financials.functions";
import { listTeamMembers } from "@/services/admin-team.functions";
import { getStoreOnboardingForms } from "@/services/lead-forms.functions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet, type MetricCardItem } from "@/components/workspace/workspace-dashboard-sheet";
import { UnifiedProposalWorkspace, type UnifiedProposalWorkspaceLead, sanitizeDestinationString } from "@/components/tourism/unified-proposal-workspace";
import { LeadCard } from "@/components/tourism/crm/LeadCard";
import { LeadImportModal } from "@/components/commercial/lead-import-modal";
import { LeadCommissionCalculatorSheet } from "@/components/commercial/lead-commission-calculator-sheet";
import { LeadFlightGridSheet } from "@/components/commercial/lead-flight-grid-sheet";
import { KanbanColumnCustomizerModal } from "@/components/workspace/kanban/kanban-column-customizer-modal";
import { Customer360PrintableDossier } from "@/components/dossier/customer-360-printable-dossier";
import { EmptyState } from "@/components/state/states";
import { listKanbanStages, type KanbanStageDTO } from "@/services/kanban-config.functions";

export const Route = createFileRoute("/workspace/turismo/")({
  head: () => ({
    meta: [{ title: "Turismo & Viagens | Cockpit Operacional Workspace" }],
  }),
  loader: async () => {
    try {
      const store = await getStoreSettings().catch(() => null);
      const [leadsRes, proposalsRes, tripsRes, departuresRes, sheetsRes, customersRes, teamRes, kanbanStages] = await Promise.all([
        listLeads().catch(() => []),
        listAgencyTravelProposals().catch(() => []),
        listStoreTrips({ data: { status: "all" } }).catch(() => []),
        listDepartureCards({ data: {} }).catch(() => []),
        listTravelSaleFinancialSheets({ data: {} }).catch(() => []),
        listCustomers({ data: {} }).catch(() => []),
        listTeamMembers().catch(() => []),
        store?.id ? listKanbanStages({ data: { storeId: store.id, module: "turismo" } }).catch(() => []) : [],
      ]);
      return {
        leads: leadsRes || [],
        proposals: proposalsRes || [],
        trips: tripsRes || [],
        departures: departuresRes || [],
        sheets: sheetsRes || [],
        customers: Array.isArray(customersRes) ? customersRes : (customersRes as any)?.customers || [],
        team: teamRes || [],
        store,
        kanbanStages: (kanbanStages || []) as KanbanStageDTO[],
      };
    } catch (err) {
      console.error("[loader:workspace.turismo.index] Loader fallback:", err);
      return {
        leads: [],
        proposals: [],
        trips: [],
        departures: [],
        sheets: [],
        customers: [],
        team: [],
        store: null,
        kanbanStages: [],
      };
    }
  },
  component: WorkspaceTurismoCockpitPage,
});

type TourismLeadStage = "new" | "qualified" | "proposal" | "negotiation" | "won";

interface TourismStageConfig {
  id: TourismLeadStage;
  title: string;
  dotColor: string;
  description: string;
}

const TOURISM_STAGES: TourismStageConfig[] = [
  {
    id: "new",
    title: "Novos Contatos",
    dotColor: "bg-blue-500",
    description: "Leads recém-chegados por WhatsApp, indicação ou vitrine",
  },
  {
    id: "qualified",
    title: "Cotação em Andamento",
    dotColor: "bg-warning",
    description: "Destino, passageiros e datas alinhados",
  },
  {
    id: "proposal",
    title: "Proposta Enviada",
    dotColor: "bg-indigo-500",
    description: "Proposta interativa ou PDF apresentada ao passageiro",
  },
  {
    id: "negotiation",
    title: "Em Negociação",
    dotColor: "bg-orange-500",
    description: "Ajuste de quartos, condições de pagamento e reservas de voos",
  },
  {
    id: "won",
    title: "Viagem Confirmada",
    dotColor: "bg-emerald-500",
    description: "Venda aprovada, convertida em viagem e pronta para embarque",
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

export const DEFAULT_CHECKLIST_TEMPLATE = [
  { id: "item-1", text: "Primeiro contato via WhatsApp realizado", done: false },
  { id: "item-2", text: "Orçamento e preferências alinhadas", done: false },
  { id: "item-3", text: "Cotação / Proposta montada e enviada", done: false },
  { id: "item-4", text: "Follow-up de negociação realizado", done: false },
  { id: "item-5", text: "Documentos coletados para emissão do contrato", done: false },
];

const initialNewLeadState = {
  clientId: "",
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
  tags: [] as string[],
  customChecklist: DEFAULT_CHECKLIST_TEMPLATE,
  notes: "",
};

export default function WorkspaceTurismoCockpitPage() {
  const {
    leads: initialLeads,
    proposals: initialProposals,
    trips: initialTrips,
    departures: initialDepartures,
    sheets: initialSheets,
    customers: initialCustomers,
    team: initialTeam = [],
    store,
    kanbanStages = [],
  } = Route.useLoaderData();
  const router = useRouter();
  const queryClient = useQueryClient();
  const storeId = store?.id || "";

  const [stages, setStages] = useState<any[]>(() => {
    if (kanbanStages && kanbanStages.length > 0) {
      return kanbanStages.map((s: any) => ({
        id: s.stage_key,
        title: s.title,
        dotColor: s.color || "bg-primary",
        description: s.description || "",
        is_visible: s.is_visible !== false,
      }));
    }
    return TOURISM_STAGES;
  });

  const visibleStages = useMemo(() => {
    return stages.filter((s: any) => s.is_visible !== false);
  }, [stages]);

  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [temperatureFilter, setTemperatureFilter] = useState("all");
  const [mobileActiveStage, setMobileActiveStage] = useState<TourismLeadStage>("new");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [proposalLead, setProposalLead] = useState<UnifiedProposalWorkspaceLead | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [calculatorLead, setCalculatorLead] = useState<any | null>(null);
  const [flightLead, setFlightLead] = useState<any | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"dashboard" | "kanban" | "viagens" | "propostas">("kanban");
  const [leadDrawerTab, setLeadDrawerTab] = useState<
    "viagem" | "cliente360" | "contratos" | "onboarding" | "checklist" | "anamnese" | "reuniao" | "lgpd" | "pagamento"
  >("viagem");
  const [isBundlingProposals, setIsBundlingProposals] = useState(false);

  // Novo Lead / Oportunidade
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [newLeadTargetStage, setNewLeadTargetStage] = useState<string>("new");
  const [newLeadForm, setNewLeadForm] = useState(initialNewLeadState);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Edição do Lead
  const [isUpdatingLead, setIsUpdatingLead] = useState(false);
  const [editLeadForm, setEditLeadForm] = useState<any>({
    name: "",
    phone: "",
    email: "",
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
    tags: [] as string[],
    checklist: [] as any[],
    pax_list: [] as any[],
    payment_plan: {
      flight_cents: 0,
      hotel_cents: 0,
      insurance_cents: 0,
      boarding_tax_cents: 0,
      other_services_cents: 0,
      commission_cents: 0,
      operatorName: "",
      enableBoleto: false,
      boletoInstallments: 1,
      hasBoletoDownpayment: false,
      downpaymentType: "percentage" as "percentage" | "fixed_cents",
      downpaymentPct: 0,
      downpaymentFixedCents: 0,
      firstBoletoDue: "",
      firstBoletoCondition: "",
      enableCard: false,
      cardInstallments: 1,
      enablePixDiscount: false,
      pixDiscountPct: 0,
      notes: "",
      isTermsCustomized: false,
    },
    lost_reason: "",
    pcd: false,
    reduced_mobility: false,
    autism_spectrum: false,
    health_notes: "",
    lgpd_consent: true,
  });
  const [newChecklistItemText, setNewChecklistItemText] = useState("");
  const [newTagInput, setNewTagInput] = useState("");

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const tagToAdd = newTagInput.trim();
    if (!editLeadForm.tags?.includes(tagToAdd)) {
      setEditLeadForm((prev: any) => ({ ...prev, tags: [...(prev.tags || []), tagToAdd] }));
    }
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditLeadForm((prev: any) => ({
      ...prev,
      tags: (prev.tags || []).filter((t: string) => t !== tagToRemove),
    }));
  };

  const handleTogglePopularTag = (tagName: string) => {
    if (editLeadForm.tags?.includes(tagName)) {
      handleRemoveTag(tagName);
    } else {
      setEditLeadForm((prev: any) => ({ ...prev, tags: [...(prev.tags || []), tagName] }));
    }
  };

  // Reunião
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingObjective, setMeetingObjective] = useState("");
  const [meetingRoomUrl, setMeetingRoomUrl] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingType, setMeetingType] = useState<"call" | "video" | "in_person">("call");
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  // Contrato Digital
  const [contractForm, setContractForm] = useState({
    title: "",
    packageSummary: "",
    totalValueCents: 0,
    paymentConditions: "Entrada + saldo em até 10x sem juros",
  });
  const [isIssuingContract, setIsIssuingContract] = useState(false);

  // Perfil Cliente 360°
  const [customer360Data, setCustomer360Data] = useState<{
    customer: any;
    otherLeads: any[];
    contracts: any[];
    activities: any[];
    meetings?: any[];
    trips?: any[];
    incidents?: any[];
  } | null>(null);
  const [isLoading360, setIsLoading360] = useState(false);

  // Onboarding Forms da Loja
  const { data: onboardingFormsData } = useQuery({
    queryKey: ["store-onboarding-forms", storeId],
    queryFn: () => getStoreOnboardingForms({ data: { storeId: storeId || undefined } }),
    enabled: Boolean(storeId),
  });
  const [selectedOnboardingFormSlug, setSelectedOnboardingFormSlug] = useState<string>("");

  const activeOnboardingForm =
    (onboardingFormsData?.availableForms || []).find((f: any) => f.slug === selectedOnboardingFormSlug) ||
    onboardingFormsData?.defaultForm ||
    null;

  // TanStack Queries
  const { data: leads = initialLeads, refetch: refetchLeads } = useQuery({
    queryKey: ["tourism-cockpit-leads"],
    queryFn: () => listLeads(),
    initialData: initialLeads,
  });

  const { data: team = initialTeam } = useQuery({
    queryKey: ["agency-team-members"],
    queryFn: () => listTeamMembers(),
    initialData: initialTeam,
  });

  const { data: proposals = initialProposals } = useQuery({
    queryKey: ["agency-proposals"],
    queryFn: () => listAgencyTravelProposals(),
    initialData: initialProposals,
  });

  const { data: trips = initialTrips } = useQuery({
    queryKey: ["tourism-trips-list"],
    queryFn: () => listStoreTrips({ data: { status: "all" } }),
    initialData: initialTrips,
  });

  const { data: departures = initialDepartures } = useQuery({
    queryKey: ["tourism-departures-list"],
    queryFn: () => listDepartureCards({ data: {} }),
    initialData: initialDepartures,
  });

  const { data: sheets = initialSheets } = useQuery({
    queryKey: ["tourism-financial-sheets"],
    queryFn: () => listTravelSaleFinancialSheets({ data: {} }),
    initialData: initialSheets,
  });

  const { data: customers = initialCustomers } = useQuery({
    queryKey: ["crm-customers-list"],
    queryFn: () => listCustomers({ data: {} }),
    initialData: initialCustomers,
  });

  // Conversão Direta de Proposta em Viagem Confirmada (Dossiê + Embarque + Financeiro)
  const handleConvertProposalToTrip = async (proposalId: string) => {
    try {
      const res = await convertProposalToTrip({ data: { proposalId } });
      toast.success(`Viagem ${res.tripNumber} gerada com dossiê, embarque e ficha financeira!`);
      queryClient.invalidateQueries({ queryKey: ["tourism-trips-list"] });
      queryClient.invalidateQueries({ queryKey: ["tourism-departures-list"] });
      queryClient.invalidateQueries({ queryKey: ["tourism-financial-sheets"] });
      queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["customer-360-profile"] });
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível converter a proposta em viagem.");
    }
  };

  // Movimentação de Estágio no Funil
  const handleMoveStage = async (leadId: string, nextStatus: string) => {
    const prevLeads = queryClient.getQueryData<any[]>(["tourism-cockpit-leads"]) || leads;
    queryClient.setQueryData<any[]>(["tourism-cockpit-leads"], (old) => {
      if (!Array.isArray(old)) return old;
      return old.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l));
    });
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev: any) => (prev ? { ...prev, status: nextStatus } : null));
    }

    try {
      await updateLeadStatus({ data: { leadId, status: nextStatus as any } });
      const stageName = TOURISM_STAGES.find((s) => s.id === nextStatus)?.title || nextStatus;
      toast.success(`Lead movido para "${stageName}"`);

      if (nextStatus === "won") {
        const linkedProposal = proposals.find(
          (p: any) =>
            p.lead_id === leadId ||
            p.quote_id === leadId ||
            (selectedLead?.full_name && p.customer_name === selectedLead.full_name),
        );
        if (linkedProposal?.id) {
          await convertProposalToTrip({ data: { proposalId: linkedProposal.id } }).catch(() => null);
          queryClient.invalidateQueries({ queryKey: ["tourism-trips-list"] });
          queryClient.invalidateQueries({ queryKey: ["tourism-departures-list"] });
          queryClient.invalidateQueries({ queryKey: ["tourism-financial-sheets"] });
        }
      }

      await refetchLeads();
      queryClient.invalidateQueries({ queryKey: ["tourism-cockpit-leads"] });
    } catch (err: any) {
      queryClient.setQueryData(["tourism-cockpit-leads"], prevLeads);
      toast.error(err?.message || "Erro ao atualizar status do lead.");
    }
  };

  // Exclusão de Lead
  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm("Deseja realmente remover esta oportunidade do funil comercial?")) return;
    try {
      await deleteLead({ data: { leadId } });
      toast.success("Oportunidade removida com sucesso!");
      await refetchLeads();
      queryClient.invalidateQueries({ queryKey: ["tourism-cockpit-leads"] });
      if (selectedLead?.id === leadId) setSelectedLead(null);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir oportunidade.");
    }
  };

  // Conversão de Lead para Carteira de Clientes
  const handlePromoteToCustomer = async (leadId: string) => {
    try {
      const res = await promoteLeadToCustomer({ data: { leadId } });
      toast.success("Lead promovido com sucesso para a Carteira de Clientes 360°!");
      await refetchLeads();
      queryClient.invalidateQueries({ queryKey: ["tourism-cockpit-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-customers-list"] });
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev: any) => (prev ? { ...prev, customer_id: res.customerId } : null));
        try {
          const profile360 = await getCustomer360Profile({ data: { leadId } });
          setCustomer360Data(profile360);
        } catch {
          // fallback silencioso
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao converter lead.");
    }
  };

  // Criação de Nova Oportunidade
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
          status: newLeadTargetStage as any,
          assignedTo: newLeadForm.assignedTo || null,
          tags: newLeadForm.tags,
          checklist: newLeadForm.customChecklist,
          notes: newLeadForm.notes.trim() || null,
        },
      });

      toast.success("Oportunidade adicionada com sucesso ao funil comercial!");
      setIsNewLeadOpen(false);
      setNewLeadForm(initialNewLeadState);
      await refetchLeads();
      queryClient.invalidateQueries({ queryKey: ["tourism-cockpit-leads"] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar oportunidade.");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Abertura do Drawer com Carregamento Completo
  const openLeadDetails = (lead: any) => {
    setSelectedLead(lead);
    const paxAgesStr = Array.isArray(lead.pax_ages) ? lead.pax_ages.join(", ") : "";
    const totalPaxCount = Math.max(1, (lead.pax_adults || 1) + (lead.pax_children || 0) + (lead.pax_infants || 0));
    const existingPaxList = Array.isArray(lead.pax_list) && lead.pax_list.length > 0
      ? lead.pax_list
      : Array.from({ length: totalPaxCount }).map((_, idx) => ({
          id: `pax-${idx + 1}`,
          role: idx === 0 ? "Titular" : `Passageiro ${idx + 1}`,
          full_name: idx === 0 ? (lead.full_name || "") : "",
          document: idx === 0 ? (lead.document || "") : "",
          passport_number: "",
          passport_expiry: "",
          visa_status: "dispensado",
        }));
    const savedPaymentPlan = lead.custom_fields?.payment_plan || {};
    const estTotal = lead.estimated_value_cents || 0;

    const cleanCity = sanitizeDestinationString(lead.destination);
    const rawExtraNotes = lead.destination && lead.destination.includes(" - ")
      ? lead.destination.split(" - ").slice(1).join(" - ").trim()
      : "";
    const combinedNotes = lead.notes || lead.message
      ? `${lead.notes || lead.message}${rawExtraNotes ? `\nObs Destino: ${rawExtraNotes}` : ""}`
      : rawExtraNotes;

    setEditLeadForm({
      name: lead.full_name || "",
      phone: lead.phone || "",
      email: lead.email || "",
      destination: cleanCity,
      interest_type: lead.interest_type || "",
      interest_period: lead.interest_period || "",
      travel_start: lead.travel_start || "",
      travel_end: lead.travel_end || "",
      pax_adults: lead.pax_adults || 1,
      pax_children: lead.pax_children || 0,
      pax_infants: lead.pax_infants || 0,
      pax_ages_str: paxAgesStr,
      estimated_value_cents: estTotal,
      notes: combinedNotes,
      status: lead.status || "new",
      source: lead.source || "whatsapp",
      lead_source_detail: lead.lead_source_detail || "",
      assigned_to: lead.assigned_to || "",
      tags: Array.isArray(lead.tags) ? lead.tags : [],
      checklist: Array.isArray(lead.checklist) ? lead.checklist : DEFAULT_CHECKLIST_TEMPLATE,
      pax_list: existingPaxList,
      payment_plan: {
        flight_cents: savedPaymentPlan.flight_cents ?? 0,
        hotel_cents: savedPaymentPlan.hotel_cents ?? 0,
        insurance_cents: savedPaymentPlan.insurance_cents ?? 0,
        boarding_tax_cents: savedPaymentPlan.boarding_tax_cents ?? 0,
        other_services_cents: savedPaymentPlan.other_services_cents ?? 0,
        commission_cents: savedPaymentPlan.commission_cents ?? 0,
        operatorName: savedPaymentPlan.operatorName ?? "",
        enableBoleto: savedPaymentPlan.enableBoleto ?? true,
        boletoInstallments: savedPaymentPlan.boletoInstallments ?? 12,
        hasBoletoDownpayment: savedPaymentPlan.hasBoletoDownpayment ?? false,
        downpaymentType: savedPaymentPlan.downpaymentType ?? "percentage",
        downpaymentPct: savedPaymentPlan.downpaymentPct ?? 20,
        downpaymentFixedCents: savedPaymentPlan.downpaymentFixedCents ?? 0,
        firstBoletoDue: savedPaymentPlan.firstBoletoDue ?? "Primeiro boleto para 30 dias",
        firstBoletoCondition: savedPaymentPlan.firstBoletoCondition ?? "Sem juros operadora",
        enableCard: savedPaymentPlan.enableCard ?? true,
        cardInstallments: savedPaymentPlan.cardInstallments ?? 10,
        enablePixDiscount: savedPaymentPlan.enablePixDiscount ?? true,
        pixDiscountPct: savedPaymentPlan.pixDiscountPct ?? 5,
        notes: savedPaymentPlan.notes || "",
        isTermsCustomized: savedPaymentPlan.isTermsCustomized ?? Boolean(savedPaymentPlan.notes),
      },
      lost_reason: lead.lost_reason || "",
      pcd: Boolean(lead.custom_fields?.pcd),
      reduced_mobility: Boolean(lead.custom_fields?.reduced_mobility),
      autism_spectrum: Boolean(lead.custom_fields?.autism_spectrum),
      health_notes: lead.custom_fields?.health_notes || "",
      lgpd_consent: lead.custom_fields?.lgpd_consent ?? true,
    });
    setContractForm({
      title: lead.destination
        ? `Contrato de Viagem - ${lead.destination}`
        : `Contrato de Prestação de Serviços - ${lead.full_name || "Cliente"}`,
      packageSummary: lead.destination
        ? `Pacote Turístico completo para ${lead.destination}.`
        : "Prestação de serviços turísticos conforme proposta comercial.",
      totalValueCents: lead.estimated_value_cents || 0,
      paymentConditions: "Entrada + saldo em até 10x sem juros",
    });
    setLeadDrawerTab("viagem");
    setIsLoading360(true);
    getCustomer360Profile({ data: { leadId: lead.id } })
      .then((res) => setCustomer360Data(res))
      .catch((err) => console.warn("Erro ao buscar perfil 360:", err))
      .finally(() => setIsLoading360(false));
  };

  // Salvar Alterações da Ficha 360° do Lead
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
      await refetchLeads();
      queryClient.invalidateQueries({ queryKey: ["tourism-cockpit-leads"] });
      setSelectedLead((prev: any) => (prev ? { ...prev, ...updatedData } : null));
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações da oportunidade.");
      throw err;
    }
  };

  const handleSaveLeadDetails = async () => {
    if (!selectedLead) return;
    setIsUpdatingLead(true);
    try {
      const paxAges = (editLeadForm.pax_ages_str || "")
        .split(",")
        .map((s: string) => parseInt(s.trim()))
        .filter((n: number) => !isNaN(n));

      const mergedCustomFields = {
        ...(selectedLead.custom_fields || {}),
        payment_plan: editLeadForm.payment_plan,
        pcd: editLeadForm.pcd,
        reduced_mobility: editLeadForm.reduced_mobility,
        autism_spectrum: editLeadForm.autism_spectrum,
        health_notes: editLeadForm.health_notes,
        lgpd_consent: editLeadForm.lgpd_consent,
      };

      await updateLeadDetails({
        data: {
          leadId: selectedLead.id,
          fullName: editLeadForm.name.trim() || undefined,
          phone: editLeadForm.phone.trim() || undefined,
          email: editLeadForm.email.trim() || undefined,
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
          pax_list: editLeadForm.pax_list,
          custom_fields: mergedCustomFields,
          lost_reason: editLeadForm.lost_reason || null,
        },
      });
      toast.success("Ficha do passageiro atualizada com sucesso!");
      await refetchLeads();
      queryClient.invalidateQueries({ queryKey: ["tourism-cockpit-leads"] });
      setSelectedLead((prev: any) => (prev ? { ...prev, ...editLeadForm, custom_fields: mergedCustomFields } : null));
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações da oportunidade.");
    } finally {
      setIsUpdatingLead(false);
    }
  };

  // Checklist do Lead
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
        setEditLeadForm((prev: any) => ({ ...prev, checklist: res.checklist }));
        setSelectedLead((prev: any) => (prev ? { ...prev, checklist: res.checklist } : null));
      }
      await refetchLeads();
      queryClient.invalidateQueries({ queryKey: ["tourism-cockpit-leads"] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar checklist.");
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItemText.trim()) return;
    const newItem = {
      id: `custom-${Date.now()}`,
      text: newChecklistItemText.trim(),
      done: false,
    };
    setEditLeadForm((prev: any) => ({
      ...prev,
      checklist: [...(prev.checklist || []), newItem],
    }));
    setNewChecklistItemText("");
  };

  // Emissão de Contrato Digital
  const handleIssueContract = async (contractData?: {
    leadId?: string;
    contractTitle?: string;
    packageSummary?: string;
    totalValueCents?: number;
    paymentConditions?: string;
  }) => {
    if (!selectedLead) return;
    const targetTitle = contractData?.contractTitle || contractForm.title;
    if (!targetTitle.trim()) {
      toast.error("Informe o título do contrato.");
      return;
    }
    const targetSummary = contractData?.packageSummary !== undefined ? contractData.packageSummary : contractForm.packageSummary;
    if (!targetSummary.trim()) {
      toast.error("Informe o resumo dos serviços contratados.");
      return;
    }
    try {
      setIsIssuingContract(true);
      const res = await issueLeadContract({
        data: {
          leadId: contractData?.leadId || selectedLead.id,
          contractTitle: targetTitle.trim(),
          packageSummary: targetSummary.trim(),
          totalValueCents: contractData?.totalValueCents || contractForm.totalValueCents || selectedLead.estimated_value_cents || 0,
          paymentConditions: contractData?.paymentConditions || contractForm.paymentConditions || "A combinar",
        },
      });
      toast.success(`Contrato gerado com sucesso! Token: ${res.publicToken}`);
      const updated360 = await getCustomer360Profile({ data: { leadId: selectedLead.id } });
      setCustomer360Data(updated360);
      return res;
    } catch (err: any) {
      toast.error(err?.message || "Erro ao emitir contrato.");
      throw err;
    } finally {
      setIsIssuingContract(false);
    }
  };

  const handleCopyContractLink = async (publicToken: string) => {
    const url = `${window.location.origin}/contrato/${publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link de assinatura digital copiado!");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível copiar o link.");
    }
  };

  // Onboarding Links & Disparo WhatsApp (Ficha de Passageiros / Anamnese / Acompanhantes)
  const handleCopyOnboardingFormLink = async () => {
    if (!selectedLead) return;
    const token = selectedLead.magic_token || selectedLead.id;
    const url = `${window.location.origin}/m/lead/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link da ficha de anamnese e acompanhantes copiado!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const handleSendOnboardingFormWhatsApp = () => {
    if (!selectedLead) return;
    const cleanPhone = (selectedLead.phone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("O lead não possui telefone cadastrado para envio via WhatsApp.");
      return;
    }
    const token = selectedLead.magic_token || selectedLead.id;
    const url = `${window.location.origin}/m/lead/${token}`;
    const firstName = (selectedLead.full_name || "Olá").split(" ")[0];
    const msg = `Olá, ${firstName}! Para agilizar sua reserva e roteiro${selectedLead.destination ? ` para *${selectedLead.destination}*` : ""}, preencha sua ficha de passageiro, anamnese e acompanhantes pelo link seguro:\n\n${url}`;

    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleCopyMagicLink = async () => {
    if (!selectedLead) return;
    const token = selectedLead.magic_token || selectedLead.id;
    const url = `${window.location.origin}/m/lead/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link do formulário autônomo copiado!");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível copiar o link.");
    }
  };

  // Filtragem de Leads com Responsáveis e Canais
  const filteredLeads = useMemo(() => {
    return leads.filter((l: any) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = l.full_name?.toLowerCase().includes(q);
        const matchEmail = l.email?.toLowerCase().includes(q);
        const matchPhone = l.phone?.includes(q);
        const matchDest = l.destination?.toLowerCase().includes(q);
        const matchPeriod = l.interest_period?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchDest && !matchPeriod) return false;
      }
      if (ownerFilter !== "all" && l.assigned_to !== ownerFilter) return false;
      if (
        sourceFilter !== "all" &&
        l.source !== sourceFilter &&
        l.acquisition_channel !== sourceFilter
      )
        return false;
      if (temperatureFilter !== "all") {
        const rawTemp = String(l.temperature || l.custom_fields?.temperature || "").toLowerCase();
        const lastDate = l.last_contacted_at || l.created_at;
        const daysInactive = lastDate ? Math.floor(Math.abs(Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const isCold = rawTemp === "cold" || rawTemp === "frio" || daysInactive >= 10;
        const isHot = rawTemp === "hot" || rawTemp === "quente" || ((l.estimated_value_cents || 0) >= 1200000 && !isCold);
        const resolvedTemp = isHot ? "hot" : isCold ? "cold" : "warm";
        if (resolvedTemp !== temperatureFilter) return false;
      }
      return true;
    });
  }, [leads, search, ownerFilter, sourceFilter, temperatureFilter]);

  // Agrupamento por Estágio
  const leadsByStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    visibleStages.forEach((s: any) => {
      map[s.id] = [];
    });
    if (!map["new"]) map["new"] = [];
    if (!map["won"]) map["won"] = [];

    filteredLeads.forEach((l: any) => {
      let stageKey = l.status || "new";
      if (l.status === "completed" || l.status === "converted") stageKey = "won";
      else if (l.status === "quoted") stageKey = "proposal";
      else if (l.status === "contacted") stageKey = "qualified";

      if (!map[stageKey]) {
        map[stageKey] = [];
      }
      map[stageKey].push(l);
    });

    return map;
  }, [filteredLeads, visibleStages]);

  // Data Base de Hoje
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Voos no Dia (Hoje)
  const todayDepartures = useMemo(() => {
    return departures.filter((d: any) => {
      if (!d.departure_date) return false;
      const date = new Date(d.departure_date);
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    });
  }, [departures, today]);

  // Viajantes em Viagem (Em trânsito no destino)
  const activeInTransit = useMemo(() => {
    return departures.filter((d: any) => {
      if (d.stage === "in_travel") return true;
      if (!d.departure_date) return false;
      const dep = new Date(d.departure_date);
      const ret = d.return_date ? new Date(d.return_date) : null;
      if (ret) {
        return today >= dep && today <= ret;
      }
      return false;
    });
  }, [departures, today]);

  // Embarques Próximos (Próximos 7 dias)
  const upcomingWeekDepartures = useMemo(() => {
    return departures.filter((d: any) => {
      if (!d.departure_date) return false;
      const diffDays = Math.ceil((new Date(d.departure_date).getTime() - today.getTime()) / 86400000);
      return diffDays >= 0 && diffDays <= 7;
    });
  }, [departures, today]);

  // Alertas de Documentos / Check-in
  const documentationAlerts = useMemo(() => {
    return departures.filter((d: any) => {
      if (!d.departure_date) return false;
      const diffDays = Math.ceil((new Date(d.departure_date).getTime() - today.getTime()) / 86400000);
      const pct = d.checklist_completed_pct ?? 0;
      return (diffDays >= 0 && diffDays <= 3 && pct < 100) || d.has_urgent_alert;
    });
  }, [departures, today]);

  // Recebíveis / Faturas da Semana
  const pendingReceivablesWeek = useMemo(() => {
    return sheets.filter((s: any) => {
      if (s.receivable_status === "a_receber" || s.receivable_status === "parcialmente_recebido") {
        if (!s.expected_receipt_date) return true;
        const diffDays = Math.ceil((new Date(s.expected_receipt_date).getTime() - today.getTime()) / 86400000);
        return diffDays >= -7 && diffDays <= 7;
      }
      return false;
    });
  }, [sheets, today]);

  const totalPendingReceivablesCents = useMemo(() => {
    return pendingReceivablesWeek.reduce((acc: number, s: any) => {
      const exp = s.expected_receipt_cents || s.agency_revenue_cents || 0;
      const rec = s.received_cents || 0;
      return acc + Math.max(0, exp - rec);
    }, 0);
  }, [pendingReceivablesWeek]);

  // Métricas do Cockpit
  const pipelineMetrics = useMemo(() => {
    const totalLeads = leads.length;
    const totalPipelineCents = leads.reduce(
      (acc: number, l: any) => acc + (l.estimated_value_cents || 0),
      0
    );
    const wonCount = leadsByStage.won.length;
    const activeTripsCount = trips.length;

    return {
      totalLeads,
      totalPipelineCents,
      wonCount,
      activeTripsCount,
    };
  }, [leads, leadsByStage, trips]);

  const dashboardMetricCards: MetricCardItem[] = [
    {
      id: "pipeline_val",
      label: "Negociações Ativas",
      value: formatMoney(pipelineMetrics.totalPipelineCents),
      icon: DollarSign,
      description: "Valor total das oportunidades em aberto",
    },
    {
      id: "total_leads",
      label: "Oportunidades Ativas",
      value: pipelineMetrics.totalLeads,
      icon: Users,
      description: "Passageiros e famílias em atendimento",
    },
    {
      id: "won_sales",
      label: "Vendas Concluídas",
      value: pipelineMetrics.wonCount,
      icon: CheckCircle2,
      description: "Pacotes fechados com sucesso",
    },
    {
      id: "active_trips",
      label: "Viagens Confirmadas",
      value: pipelineMetrics.activeTripsCount,
      icon: Compass,
      description: "Roteiros ativos e com passageiros alocados",
    },
  ];

  return (
    <div
      className={cn(
        "w-full flex-1 flex flex-col min-h-0 px-0 animate-in fade-in duration-200",
        activeViewTab === "kanban"
          ? "h-full min-h-0 overflow-hidden space-y-2 pb-0"
          : "space-y-3 pb-16 lg:pb-2"
      )}
    >
      {/* ── BARRA OPERACIONAL CANÔNICA (SILENCIOSA, ULTRAMINIMALISTA E ALTA DENSIDADE) ── */}
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: "kanban", label: "Kanban", icon: Kanban, count: filteredLeads.length },
          { id: "dashboard", label: "Painel & Alertas", icon: Compass },
          { id: "propostas", label: "Propostas", icon: FileText, count: proposals.length },
          { id: "viagens", label: "Viagens", icon: Plane, count: trips.length },
        ]}
        activeTab={activeViewTab}
        onTabChange={(tabId) => setActiveViewTab(tabId as any)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Procurar cards no funil de turismo..."
        filters={[
          {
            id: "temperature",
            label: "Temperatura",
            value: temperatureFilter,
            options: [
              { label: "Todas Temperaturas", value: "all" },
              { label: "Quente", value: "hot" },
              { label: "Morno", value: "warm" },
              { label: "Frio", value: "cold" },
            ],
            onChange: setTemperatureFilter,
          },
          {
            id: "owner",
            label: "Responsável",
            value: ownerFilter,
            options: [
              { label: "Todos os Responsáveis", value: "all" },
              ...team.map((m: any) => ({
                label: m.full_name || m.name || "Membro",
                value: m.profile_id || m.id,
              })),
            ],
            onChange: setOwnerFilter,
          },
          {
            id: "source",
            label: "Origem",
            value: sourceFilter,
            options: [
              { label: "Todas as Origens", value: "all" },
              ...LEAD_SOURCES.map((s) => ({ label: s.label, value: s.value })),
            ],
            onChange: setSourceFilter,
          },
        ]}
        onMetricsClick={() => setIsDashboardOpen(true)}
        metricsBadge={pipelineMetrics.totalPipelineCents > 0 ? formatMoney(pipelineMetrics.totalPipelineCents) : undefined}
        onColumnsClick={() => setIsCustomizerOpen(true)}
        secondaryActions={[
          {
            label: "Planilha de Comissões",
            icon: Receipt,
            onClick: () => router.navigate({ to: "/workspace/turismo/comissoes" }),
            variant: "outline",
          },
          {
            label: "Nova Proposta",
            icon: FileText,
            onClick: () =>
              setProposalLead({
                id: "",
                fullName: "",
                destination: "",
                passenger_count: 2,
              }),
            variant: "outline",
          },
          {
            label: "Importar Leads",
            icon: Upload,
            onClick: () => setIsImportModalOpen(true),
            variant: "outline",
          },
        ]}
        primaryAction={{
          label: "Nova Oportunidade",
          icon: Plus,
          onClick: () => {
            setNewLeadTargetStage("new");
            setIsNewLeadOpen(true);
          },
        }}
      />

      {/* ── CONTEÚDO DA VISÃO ATIVA ── */}

      {/* 0. PAINEL EXECUTIVO DO PROPRIETÁRIO / GERENTE (DASHBOARD GERAL) */}
      {activeViewTab === "dashboard" && (
        <div className="space-y-6">
          {/* Grade Superior de KPIs em Superfícies Squircle */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Voos no Dia</span>
                <Plane className="size-3.5 text-primary" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
                {todayDepartures.length}
              </div>
              <p className="text-xs text-muted-foreground">Partidas programadas hoje</p>
            </div>

            <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Viajantes em Viagem</span>
                <Luggage className="size-3.5 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
                {activeInTransit.length}
              </div>
              <p className="text-xs text-muted-foreground">Passageiros no destino</p>
            </div>

            <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Embarques Próximos</span>
                <Calendar className="size-3.5 text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
                {upcomingWeekDepartures.length}
              </div>
              <p className="text-xs text-muted-foreground">Nos próximos 7 dias</p>
            </div>

            <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Atenção Check-in</span>
                <AlertTriangle className="size-3.5 text-warning-strong" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
                {documentationAlerts.length}
              </div>
              <p className="text-xs text-muted-foreground">Pendências críticas</p>
            </div>

            <div className="p-4 rounded-2xl border border-foreground/15 bg-foreground text-background space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-background/75">
                <span className="text-xs font-semibold">Recebíveis da Semana</span>
                <span className="text-2xs font-mono font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                  Comissões
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-background break-words">
                {formatMoney(totalPendingReceivablesCents)}
              </div>
              <p className="text-xs text-background/70">Aéreo + hotel + pacotes</p>
            </div>
          </div>

          {/* Duas Colunas Operacionais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Coluna 1: Voos do Dia & Próximas 48h */}
            <div className="space-y-4">
              {/* Voos no Dia */}
              <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Plane className="size-4 text-primary" />
                    <h2 className="text-xs font-bold text-foreground">Embarques de Hoje</h2>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {todayDepartures.length}
                  </Badge>
                </div>

                {todayDepartures.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg">
                    Nenhum voo programado para embarque hoje
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayDepartures.map((d: any) => {
                      const checkinUrl = resolveAirlineCheckinUrl(d.airline_code);
                      return (
                        <div
                          key={d.id}
                          className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-foreground block">{d.client_name}</span>
                              <span className="text-muted-foreground">{d.destination}</span>
                            </div>
                            <span className="font-mono font-semibold text-primary">
                              {d.airline_code ? `${d.airline_code} ${d.flight_number || ""}` : "Voo Direto"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border/30">
                            {d.airline_locator ? (
                              <div className="flex items-center gap-1 font-mono text-xs">
                                <span className="text-muted-foreground">PNR:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(d.airline_locator || "");
                                    toast.success(`Localizador ${d.airline_locator} copiado!`);
                                  }}
                                  className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  {d.airline_locator}
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sem localizador</span>
                            )}

                            {checkinUrl && (
                              <a
                                href={checkinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                <ExternalLink className="size-3" />
                                <span>Check-in CIA</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Embarques Próximos & Checklist */}
              <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-indigo-600" />
                    <h2 className="text-xs font-bold text-foreground">Próximos Embarques</h2>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-11 min-h-11 px-3 text-xs text-primary hover:bg-primary/10 gap-1 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Link to="/workspace/turismo/embarques">
                      <span>Ver Todos</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>

                {upcomingWeekDepartures.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg">
                    Nenhum embarque previsto nos próximos 7 dias
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingWeekDepartures.slice(0, 5).map((d: any) => {
                      const diffDays = Math.ceil((new Date(d.departure_date).getTime() - today.getTime()) / 86400000);
                      const pct = d.checklist_completed_pct ?? 0;
                      return (
                        <div
                          key={d.id}
                          className="p-3 rounded-lg border border-border/50 bg-background flex items-center justify-between text-xs gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-foreground block truncate">{d.client_name}</span>
                            <span className="text-muted-foreground truncate block">{d.destination}</span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${
                              diffDays <= 2 ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground"
                            }`}>
                              {diffDays === 0 ? "Hoje" : diffDays === 1 ? "Amanhã" : `em ${diffDays}d`}
                            </span>
                            <span className="block text-xs text-muted-foreground mt-1">
                              Checklist {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 2: Viajantes em Viagem & Faturas da Semana */}
            <div className="space-y-4">
              {/* Viajantes em Viagem */}
              <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Luggage className="size-4 text-emerald-600" />
                    <h2 className="text-xs font-bold text-foreground">Viajantes no Destino</h2>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {activeInTransit.length}
                  </Badge>
                </div>

                {activeInTransit.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg">
                    Nenhum passageiro atualmente em trânsito no destino
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeInTransit.map((d: any) => (
                      <div
                        key={d.id}
                        className="p-3 rounded-lg border border-border/50 bg-background flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-foreground block truncate">{d.client_name}</span>
                          <span className="text-muted-foreground truncate block">
                            {d.destination} {d.hotel_name ? `• ${d.hotel_name}` : ""}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-xs text-emerald-600 border-border/60 font-mono">
                            Em Viagem
                          </Badge>
                          {d.return_date && (
                            <span className="block text-xs text-muted-foreground mt-1">
                              Retorno: {new Date(d.return_date).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recebíveis de Operadoras */}
              <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="size-4 text-primary" />
                    <h2 className="text-xs font-bold text-foreground">Comissões a Receber</h2>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-11 min-h-11 px-3 text-xs text-primary hover:bg-primary/10 gap-1 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Link to="/workspace/turismo/comissoes">
                      <span>Ver Fichas</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>

                {pendingReceivablesWeek.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg">
                    Nenhuma fatura de comissão pendente com vencimento na semana
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingReceivablesWeek.slice(0, 5).map((s: any) => {
                      const amount = (s.expected_receipt_cents || s.agency_revenue_cents || 0) - (s.received_cents || 0);
                      return (
                        <div
                          key={s.id}
                          className="p-3 rounded-lg border border-border/50 bg-background flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-foreground block truncate">
                              {s.primary_operator} • {s.locator_code || s.internal_code}
                            </span>
                            <span className="text-muted-foreground truncate block">
                              Cliente: {s.client_name}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-primary block">
                              {formatMoney(Math.max(0, amount))}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {s.expected_receipt_date ? `Vence: ${s.expected_receipt_date}` : "A receber"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. FUNIL DE VENDAS (FULL-CANVAS KANBAN WIDESCREEN) */}
      {activeViewTab === "kanban" && (
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          {/* Seletor de Fase Mobile Nativo (< 600px) */}
          <div className="tab-list flex sm:hidden items-center gap-2 overflow-x-auto no-scrollbar p-1 rounded-xl bg-muted/60 border border-border/50">
            {visibleStages.map((stage: any) => {
              const count = (leadsByStage[stage.id] || []).length;
              const isSelected = mobileActiveStage === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setMobileActiveStage(stage.id)}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold flex items-center gap-2 shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "bg-card text-foreground font-bold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className={cn("size-2 rounded-full shrink-0", stage.dotColor)} />
                  <span>{stage.title}</span>
                  <span className="font-mono tabular-nums text-2xs px-2 py-1 rounded bg-muted">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Trilho Horizontal Widescreen Desktop + Coluna Ativa Mobile */}
          {/* design-lint-ignore DL-27 reason:"Trilho horizontal canonico com rolagem suave para colunas do funil de atendimento" expiry:"2027-12-31" */}
          {/* design-lint-ignore DL-30 reason:"Trilho horizontal canonico com rolagem suave para colunas do funil de atendimento" expiry:"2027-12-31" */}
          <div className="flex gap-4 overflow-x-auto scroll-area-carousel pb-4 pt-1 items-stretch snap-x snap-mandatory scroll-smooth w-full flex-1 min-h-0 select-none waesy-kanban-strip">
            {visibleStages.map((stage: any, stageIndex: number) => {
              const stageLeads = leadsByStage[stage.id] || [];
              const stageTotalCents = stageLeads.reduce(
                (sum: number, l: any) => sum + (l.estimated_value_cents || 0),
                0
              );
              const prevStage = stageIndex > 0 ? visibleStages[stageIndex - 1] : null;
              const nextStage = stageIndex < visibleStages.length - 1 ? visibleStages[stageIndex + 1] : null;
              const isMobileHidden = mobileActiveStage !== stage.id;

              return (
                <div
                  key={stage.id}
                  className={cn(
                    "flex-none w-full sm:w-80 snap-start rounded-2xl bg-muted/50 dark:bg-muted/30 transition-colors flex flex-col min-h-144 sm:h-full overflow-hidden",
                    isMobileHidden && "hidden sm:flex"
                  )}
                >
                  {/* Cabeçalho da Coluna com Indicador Discreto, Somatório Tabular e Ação Rápida */}
                  <div className="px-4 py-3 bg-transparent flex items-center justify-between shrink-0 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn("size-2 rounded-full shrink-0", stage.dotColor)} />
                      <span className="text-xs font-bold tracking-tight text-foreground truncate" title={stage.title}>
                        {stage.title}
                      </span>
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
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setNewLeadTargetStage(stage.id);
                          setIsNewLeadOpen(true);
                        }}
                        /* design-lint-ignore DL-14 reason:"Gatilho compacto de adicao rapida no header de coluna desktop" expiry:"2027-12-31" */
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                        title={`Novo lead em ${stage.title}`}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Área de Rolagem Isolada dos Cards (Colunas Altas) */}
                  <div className="px-3 pb-3 space-y-3 overflow-y-auto flex-1 min-h-0 [scrollbar-width:thin]">
                    {stageLeads.length === 0 ? (
                      <div className="h-full min-h-48 py-8 px-4 flex flex-col items-center justify-center text-center text-xs text-muted-foreground rounded-2xl bg-card space-y-1 select-none">
                        <p className="font-medium text-2xs">Nenhum contato nesta etapa</p>
                      </div>
                    ) : (
                      stageLeads.map((lead: any) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          currentStageId={stage.id}
                          stages={visibleStages.map((s: any) => ({ id: s.id, title: s.title }))}
                          team={team}
                          onOpenDetails={openLeadDetails}
                          onGenerateProposal={(lead) => {
                            setProposalLead({
                              id: lead.id,
                              fullName: lead.full_name,
                              phone: lead.phone,
                              email: lead.email,
                              destination: lead.destination,
                              estimated_value_cents: lead.estimated_value_cents,
                              passenger_count: (lead.pax_adults || 2) + (lead.pax_children || 0),
                              departureDate: lead.travel_start,
                              returnDate: lead.travel_end,
                              adultsCount: lead.pax_adults || 2,
                              childrenCount: lead.pax_children || 0,
                              notes: lead.notes || "",
                            });
                          }}
                          onOpenFlightGrid={setFlightLead}
                          onStageChange={(leadId, newStage) => handleMoveStage(leadId, newStage)}
                          onPromote={handlePromoteToCustomer}
                          onDelete={handleDeleteLead}
                          prevStageId={prevStage?.id}
                          nextStageId={nextStage?.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. VIAGENS CONFIRMADAS */}
      {activeViewTab === "viagens" && (
        <div className="space-y-3">
          {trips.length === 0 ? (
            <EmptyState
              title="Nenhuma viagem confirmada cadastrada"
              description="Quando uma proposta for aprovada no funil, ela é convertida automaticamente em uma viagem confirmada."
              actionLabel="Cadastrar Viagem Avulsa"
              onAction={() => router.navigate({ to: "/workspace/turismo/viagens" })}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trips.map((trip: any) => (
                <Link
                  key={trip.id}
                  to="/workspace/turismo/viagens/$id"
                  params={{ id: trip.id }}
                  className="p-4 rounded-2xl border border-border/60 bg-card hover:border-foreground/25 transition-colors block text-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-sm truncate">
                      {trip.destination_city || "Destino a Definir"}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs text-emerald-600 border-border/60">
                      Confirmada
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="size-3.5" />
                    <span>Embarque: {trip.start_date || "A confirmar"}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/30 text-muted-foreground">
                    <span>{trip.customer_name || "Passageiro Principal"}</span>
                    <span className="font-mono tabular-nums font-bold text-foreground">
                      {formatMoney(trip.total_amount_cents || 0)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. PROPOSTAS EMITIDAS */}
      {activeViewTab === "propostas" && (
        <div className="space-y-3">
          {proposals.length === 0 ? (
            <EmptyState
              title="Nenhuma proposta emitida até o momento"
              description="Monte e envie propostas completas pelo funil ou pelo botão Nova Proposta."
              actionLabel="Criar Primeira Proposta"
              onAction={() =>
                setProposalLead({
                  id: "",
                  fullName: "",
                  destination: "",
                  passenger_count: 2,
                })
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {proposals.map((prop: any) => (
                <div
                  key={prop.id}
                  className="p-4 rounded-2xl border border-border/60 bg-card space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground truncate block">
                      {prop.title || prop.destination_city}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs capitalize">
                      {prop.status}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground text-xs">
                    Passageiro: <strong className="text-foreground">{prop.customer_name}</strong>
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-border/30 gap-2 flex-wrap">
                    <span className="font-mono tabular-nums font-bold text-foreground">
                      {formatMoney(prop.pricing?.total_price_cents || 0)}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleConvertProposalToTrip(prop.id)}
                        className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold gap-2 text-emerald-600 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Gerar Viagem</span>
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Link to="/workspace/turismo/propostas/$id" params={{ id: prop.id }}>
                          <Eye className="size-3" />
                          <span>Abrir Studio</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FICHA COMPLETA DO LEAD (PIPEFY-STYLE CARD WORKSPACE 2-COLUNAS) ── */}
      {selectedLead && (
        <Sheet open={Boolean(selectedLead)} onOpenChange={() => setSelectedLead(null)}>
          <SheetContent
            side="right"
            size="dossier"
            className="p-0 flex flex-col h-full bg-background border-l border-border/60 overflow-hidden w-full max-sm:inset-0 sm:max-w-4xl md:max-w-5xl lg:sheet-page-70"
          >
            <TourismPipeCardDossier
              lead={selectedLead}
              stages={visibleStages}
              team={team}
              proposals={proposals}
              onClose={() => setSelectedLead(null)}
              onMoveStage={(leadId, newStage) => handleMoveStage(leadId, newStage)}
              onSaveLead={handleSaveLeadFromDossier}
              onPromoteToCustomer={(leadId) => handlePromoteToCustomer(leadId)}
              onGenerateProposal={(leadData) => {
                setSelectedLead(null);
                setProposalLead(leadData);
              }}
              onScheduleMeeting={async (data) => {
                await addLeadMeeting({ data });
                refetchLeads();
              }}
              onToggleChecklist={(itemId) => handleToggleChecklist(itemId)}
              onIssueContract={handleIssueContract}
              customer360Data={customer360Data}
              activeOnboardingForm={activeOnboardingForm}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* ── MODAL LATERAL DE NOVA OPORTUNIDADE ── */}
      <Sheet open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 flex flex-col justify-between overflow-y-auto no-scrollbar">
          <div className="space-y-6">
            <SheetHeader className="p-0 text-left space-y-1 border-b border-border/50 pb-3">
              <SheetTitle className="text-lg font-bold text-foreground">Nova Oportunidade</SheetTitle>
              <div className="text-xs text-muted-foreground">
                Etapa: {TOURISM_STAGES.find((s) => s.id === newLeadTargetStage)?.title}
              </div>
            </SheetHeader>

            <form id="new-lead-form" onSubmit={handleCreateNewLead} className="space-y-5 text-xs">
              {/* Bloco 1: Contato */}
              <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Users className="size-3.5 text-primary" />
                  <span>Contato Principal</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Nome Completo *</Label>
                    <Input
                      value={newLeadForm.name}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Roberto Carlos Silva"
                      className="h-10 text-xs rounded-lg"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Telefone / WhatsApp *</Label>
                    <Input
                      value={newLeadForm.phone}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="(49) 99999-9999"
                      className="h-10 text-xs rounded-lg font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">E-mail</Label>
                    <Input
                      type="email"
                      value={newLeadForm.email}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="roberto@email.com"
                      className="h-10 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Canal / Origem</Label>
                    <Select
                      value={newLeadForm.source}
                      onValueChange={(val) => setNewLeadForm((prev) => ({ ...prev, source: val }))}
                    >
                      <SelectTrigger className="h-10 text-xs rounded-lg">
                        <SelectValue placeholder="Selecione origem..." />
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
                </div>
              </div>

              {/* Bloco 2: Especificações da Viagem */}
              <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <MapPin className="size-3.5 text-primary" />
                  <span>Detalhes da Viagem</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Destino Principal</Label>
                    <Input
                      value={newLeadForm.destination}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, destination: e.target.value }))}
                      placeholder="Ex: Orlando, Maceió, Paris"
                      className="h-10 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Período Flexível</Label>
                    <Input
                      value={newLeadForm.interestPeriod}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, interestPeriod: e.target.value }))}
                      placeholder="Ex: Julho/2026, Réveillon"
                      className="h-10 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Data Ida Estimada</Label>
                    <Input
                      type="date"
                      value={newLeadForm.travelStart}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, travelStart: e.target.value }))}
                      className="h-10 text-xs rounded-lg font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Data Volta Estimada</Label>
                    <Input
                      type="date"
                      value={newLeadForm.travelEnd}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, travelEnd: e.target.value }))}
                      className="h-10 text-xs rounded-lg font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Tipo de Pacote / Interesse</Label>
                    <Select
                      value={newLeadForm.interestType}
                      onValueChange={(val) => setNewLeadForm((prev) => ({ ...prev, interestType: val }))}
                    >
                      <SelectTrigger className="h-10 text-xs rounded-lg">
                        <SelectValue placeholder="Selecione o tipo..." />
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
                    <CurrencyField
                      value={newLeadForm.estimatedValueCents}
                      onChange={(val: any) => setNewLeadForm((prev) => ({ ...prev, estimatedValueCents: val || 0 }))}
                      className="h-10 text-xs rounded-lg font-mono"
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Adultos</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newLeadForm.paxAdults}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, paxAdults: parseInt(e.target.value) || 1 }))}
                      className="h-10 text-xs rounded-lg font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Crianças (2 a 11 anos)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newLeadForm.paxChildren}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, paxChildren: parseInt(e.target.value) || 0 }))}
                      className="h-10 text-xs rounded-lg font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Bebês (até 2 anos)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newLeadForm.paxInfants}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, paxInfants: parseInt(e.target.value) || 0 }))}
                      className="h-10 text-xs rounded-lg font-mono text-center"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-2xs text-muted-foreground font-semibold">Idades das Crianças</Label>
                  <Input
                    value={newLeadForm.paxAgesStr}
                    onChange={(e) => setNewLeadForm((prev) => ({ ...prev, paxAgesStr: e.target.value }))}
                    placeholder="Ex: 5, 9"
                    className="h-10 text-xs rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Bloco 4: Consultor, Tags & Anotações */}
              <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Consultor Responsável</Label>
                    <Select
                      value={newLeadForm.assignedTo}
                      onValueChange={(val) => setNewLeadForm((prev) => ({ ...prev, assignedTo: val }))}
                    >
                      <SelectTrigger className="h-10 text-xs rounded-lg">
                        <SelectValue placeholder="Selecione consultor..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não atribuído</SelectItem>
                        {team.map((m: any) => (
                          <SelectItem key={m.profile_id || m.id} value={m.profile_id || m.id}>
                            {m.full_name || m.name || "Membro"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Etapa Inicial</Label>
                    <Select
                      value={newLeadTargetStage}
                      onValueChange={setNewLeadTargetStage}
                    >
                      <SelectTrigger className="h-10 text-xs rounded-lg">
                        <SelectValue placeholder="Etapa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TOURISM_STAGES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Anotações Iniciais */}
                <div className="space-y-1">
                  <Label className="text-2xs text-muted-foreground font-semibold">Anotações Iniciais</Label>
                  <Textarea
                    rows={2}
                    value={newLeadForm.notes}
                    onChange={(e) => setNewLeadForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Preferências, restrições ou contexto da abordagem inicial..."
                    className="text-xs rounded-lg"
                  />
                </div>
              </div>
            </form>
          </div>

          <SheetFooter className="p-0 border-t border-border/50 pt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewLeadOpen(false)}
              className="h-11 min-h-11 px-4 text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="new-lead-form"
              disabled={isSubmittingNew}
              className="h-11 min-h-11 px-6 text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              {isSubmittingNew ? "Salvando..." : "Salvar Oportunidade"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── MODAIS SATÉLITES: IMPORTAÇÃO, CUSTOMIZADOR, COMISSÃO E VOOS ── */}
      {isImportModalOpen && (
        <LeadImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            refetchLeads();
            queryClient.invalidateQueries({ queryKey: ["tourism-cockpit-leads"] });
          }}
        />
      )}

      {isCustomizerOpen && (
        <KanbanColumnCustomizerModal
          open={isCustomizerOpen}
          onOpenChange={setIsCustomizerOpen}
          storeId={storeId}
          module="turismo"
          stages={stages.map((s: any) => ({
            stage_key: s.id || s.stage_key,
            title: s.title,
            purpose: s.purpose || (s.id === "won" ? "won" : s.id === "lost" ? "lost" : "in_progress"),
            color: s.dotColor || s.color || "var(--primary)",
            sort_order: s.sort_order ?? 0,
            is_visible: s.is_visible !== false,
            sla_minutes: s.sla_minutes,
          }))}
          onStagesUpdated={(newStages) => {
            setStages(newStages.map((s: any) => ({
              id: s.stage_key,
              title: s.title,
              dotColor: s.color || "var(--primary)",
              description: s.description || "",
              is_visible: s.is_visible !== false,
              sla_minutes: s.sla_minutes,
            })));
            refetchLeads();
          }}
        />
      )}

      {calculatorLead && (
        <LeadCommissionCalculatorSheet
          isOpen={Boolean(calculatorLead)}
          onClose={() => setCalculatorLead(null)}
          lead={calculatorLead}
        />
      )}

      {flightLead && (
        <LeadFlightGridSheet
          isOpen={Boolean(flightLead)}
          onClose={() => setFlightLead(null)}
          lead={flightLead}
          storeId={storeId}
        />
      )}

      {/* ── CONSTRUTOR UNIFICADO DE PROPOSTAS (FUSÃO DOS 3 BUILDERS) ── */}
      {proposalLead && (
        <UnifiedProposalWorkspace
          open={Boolean(proposalLead)}
          onOpenChange={(open) => {
            if (!open) setProposalLead(null);
          }}
          lead={proposalLead}
          mode="kanban_lead_quote"
          onCreated={() => {
            refetchLeads();
            queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
          }}
        />
      )}

      {/* ── PAINEL DE MÉTRICAS OPERACIONAIS ── */}
      <WorkspaceDashboardSheet
        open={isDashboardOpen}
        onOpenChange={setIsDashboardOpen}
        title="Painel de Desempenho do Turismo"
        description="Indicadores comerciais de conversão, atendimentos e viagens da agência"
        metrics={dashboardMetricCards}
      />
    </div>
  );
}
