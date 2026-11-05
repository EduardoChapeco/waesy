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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TravelerVerificationFlow } from "@/components/tourism/checkout/TravelerVerificationFlow";
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

export const Route = createFileRoute("/workspace/turismo/")({
  head: () => ({
    meta: [{ title: "Turismo & Viagens | Cockpit Operacional Workspace" }],
  }),
  loader: async () => {
    try {
      const [leadsRes, proposalsRes, tripsRes, departuresRes, sheetsRes, customersRes, teamRes, store] = await Promise.all([
        listLeads().catch(() => []),
        listAgencyTravelProposals().catch(() => []),
        listStoreTrips({ data: { status: "all" } }).catch(() => []),
        listDepartureCards({ data: {} }).catch(() => []),
        listTravelSaleFinancialSheets({ data: {} }).catch(() => []),
        listCustomers({ data: {} }).catch(() => []),
        listTeamMembers().catch(() => []),
        getStoreSettings().catch(() => null),
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
  badgeClass: string;
  description: string;
}

const TOURISM_STAGES: TourismStageConfig[] = [
  {
    id: "new",
    title: "Novos Contatos",
    dotColor: "bg-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    description: "Leads recém-chegados por WhatsApp, indicação ou vitrine",
  },
  {
    id: "qualified",
    title: "Cotação em Andamento",
    dotColor: "bg-warning",
    badgeClass: "bg-warning/10 text-warning-strong border-warning/20",
    description: "Destino, passageiros e datas alinhados",
  },
  {
    id: "proposal",
    title: "Proposta Enviada",
    dotColor: "bg-indigo-500",
    badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    description: "Proposta interativa ou PDF apresentada ao passageiro",
  },
  {
    id: "negotiation",
    title: "Em Negociação",
    dotColor: "bg-orange-500",
    badgeClass: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    description: "Ajuste de quartos, condições de pagamento e reservas de voos",
  },
  {
    id: "won",
    title: "Viagem Confirmada",
    dotColor: "bg-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
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
  } = Route.useLoaderData();
  const router = useRouter();
  const queryClient = useQueryClient();
  const storeId = store?.id || "";

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
      enableBoleto: true,
      boletoInstallments: 12,
      hasBoletoDownpayment: false,
      downpaymentType: "percentage" as "percentage" | "fixed_cents",
      downpaymentPct: 20,
      downpaymentFixedCents: 0,
      firstBoletoDue: "Primeiro boleto para 30 dias",
      firstBoletoCondition: "Sem juros operadora",
      enableCard: true,
      cardInstallments: 10,
      enablePixDiscount: true,
      pixDiscountPct: 5,
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
      await promoteLeadToCustomer({ data: { leadId } });
      toast.success("Lead promovido com sucesso para a Carteira de Clientes 360°!");
      await refetchLeads();
      queryClient.invalidateQueries({ queryKey: ["tourism-cockpit-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-customers-list"] });
      if (selectedLead?.id === leadId) setSelectedLead(null);
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
    } catch (err: any) {
      toast.error(err?.message || "Erro ao emitir contrato.");
    } finally {
      setIsIssuingContract(false);
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

  // Onboarding Links & Disparo WhatsApp
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
    const map: Record<TourismLeadStage, any[]> = {
      new: [],
      qualified: [],
      proposal: [],
      negotiation: [],
      won: [],
    };

    filteredLeads.forEach((l: any) => {
      let stage: TourismLeadStage = "new";
      if (l.status === "won" || l.status === "completed" || l.status === "converted") stage = "won";
      else if (l.status === "negotiation") stage = "negotiation";
      else if (l.status === "proposal" || l.status === "quoted") stage = "proposal";
      else if (l.status === "qualified" || l.status === "contacted") stage = "qualified";
      map[stage].push(l);
    });

    return map;
  }, [filteredLeads]);

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
            onClick: () => navigate({ to: "/workspace/turismo/comissoes" }),
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
                    <h2 className="text-xs font-bold text-foreground">Voos no Dia (Hoje)</h2>
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
                    <h2 className="text-xs font-bold text-foreground">Próximos Embarques (7 Dias)</h2>
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
                    <h2 className="text-xs font-bold text-foreground">Viajantes em Destino (Ativos)</h2>
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
                          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 font-mono">
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
                    <h2 className="text-xs font-bold text-foreground">Comissões & Faturas a Receber</h2>
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
            {TOURISM_STAGES.map((stage) => {
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
            {TOURISM_STAGES.map((stage, stageIndex) => {
              const stageLeads = leadsByStage[stage.id] || [];
              const stageTotalCents = stageLeads.reduce(
                (sum: number, l: any) => sum + (l.estimated_value_cents || 0),
                0
              );
              const prevStage = stageIndex > 0 ? TOURISM_STAGES[stageIndex - 1] : null;
              const nextStage = stageIndex < TOURISM_STAGES.length - 1 ? TOURISM_STAGES[stageIndex + 1] : null;
              const isMobileHidden = mobileActiveStage !== stage.id;

              return (
                <div
                  key={stage.id}
                  className={cn(
                    "flex-none w-full sm:w-80 snap-start rounded-2xl bg-muted/20 hover:bg-muted/30 border border-transparent hover:border-border/40 transition-colors flex flex-col min-h-96 sm:h-full overflow-hidden",
                    isMobileHidden && "hidden sm:flex"
                  )}
                >
                  {/* Barra Superior Colorida de Fase */}
                  <div className={cn("h-1 w-full shrink-0", stage.dotColor)} />

                  {/* Cabeçalho da Coluna com Somatório Tabular e Ação Rápida */}
                  <div className="p-3 bg-transparent flex items-center justify-between shrink-0 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold tracking-tight text-foreground truncate" title={stage.title}>
                        {stage.title}
                      </span>
                      <span className="text-2xs font-mono tabular-nums font-semibold px-2 py-1 rounded-full bg-muted/60 text-muted-foreground shrink-0">
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
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                        title={`Novo lead em ${stage.title}`}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Área de Rolagem Isolada dos Cards */}
                  <div className="p-3 space-y-2 overflow-y-auto flex-1 min-h-0 [scrollbar-width:thin]">
                    {stageLeads.length === 0 ? (
                      <div className="py-8 px-4 text-center text-xs text-muted-foreground border border-dashed border-border/30 rounded-xl space-y-1 bg-transparent my-auto select-none">
                        <p className="font-medium text-2xs">Nenhum contato nesta etapa</p>
                      </div>
                    ) : (
                      stageLeads.map((lead: any) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          currentStageId={stage.id}
                          stages={TOURISM_STAGES.map((s) => ({ id: s.id, title: s.title }))}
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
                    <Badge variant="outline" className="font-mono text-xs text-emerald-600 border-emerald-500/30">
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

      {/* ── FICHA COMPLETA DO LEAD (DOSSIÊ 70% CANVÁS ÚNICO PADRÃO TRAVEL AGÊNCIAS) ── */}
      {selectedLead && (() => {
        const cleanPhone = (editLeadForm.phone || selectedLead.phone || "").replace(/\D/g, "");
        const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
        const whatsappUrl = cleanPhone ? `https://wa.me/${formattedPhone}` : "";
        const leadProposals = proposals.filter(
          (p: any) =>
            p.lead_id === selectedLead.id ||
            p.quote_id === selectedLead.id ||
            (selectedLead.full_name &&
              p.customer_name &&
              p.customer_name.toLowerCase() === selectedLead.full_name.toLowerCase()),
        );
        const currentStageIdx = TOURISM_STAGES.findIndex((s) => s.id === (editLeadForm.status || selectedLead.status));
        const currentStageItem = TOURISM_STAGES[currentStageIdx] || TOURISM_STAGES[0];

        return (
          <Sheet open={Boolean(selectedLead)} onOpenChange={() => setSelectedLead(null)}>
            <SheetContent
              side="right"
              size="dossier"
              className="p-0 flex flex-col h-full bg-background border-l border-border/60 overflow-hidden w-full max-sm:inset-0 sm:max-w-4xl md:max-w-5xl lg:sheet-page-70"
            >
              {/* Header Soberano (Padrão Travel Agências) */}
              <SheetHeader className="px-6 py-4 border-b border-border/50 shrink-0 space-y-3 bg-background">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Identificação do Lead & Seletor de Estágio */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-11 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center shrink-0 font-bold text-foreground text-sm uppercase">
                      {(editLeadForm.name || selectedLead.full_name || "LE").slice(0, 2)}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <SheetTitle className="text-lg font-bold tracking-tight text-foreground truncate">
                        {editLeadForm.name || selectedLead.full_name || "Oportunidade Comercial"}
                      </SheetTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-2xs text-muted-foreground">Estágio atual:</span>
                        <Select
                          value={editLeadForm.status || selectedLead.status || "new"}
                          onValueChange={(val) => {
                            setEditLeadForm((prev: any) => ({ ...prev, status: val }));
                            handleMoveStage(selectedLead.id, val);
                          }}
                        >
                          <SelectTrigger className="h-6 px-2 rounded-full text-2xs font-semibold gap-1.5 border border-border/50 bg-muted/20">
                            <span className={cn("size-2 rounded-full shrink-0", currentStageItem.dotColor)} />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TOURISM_STAGES.map((st) => (
                              <SelectItem key={st.id} value={st.id}>
                                <span className="flex items-center gap-2">
                                  <span className={cn("size-2 rounded-full shrink-0", st.dotColor)} />
                                  <span>{st.title}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Cluster de Ações Primárias no Cabeçalho */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                    {cleanPhone && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="h-10 px-3.5 rounded-lg text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                        title="Iniciar conversa no WhatsApp"
                      >
                        <MessageSquare className="size-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendOnboardingFormWhatsApp}
                      className="h-10 px-3 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Share2 className="size-3.5" />
                      <span className="hidden sm:inline">Enviar Form WA</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopyOnboardingFormLink}
                      className="h-10 px-3 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Link2 className="size-3.5" />
                      <span className="hidden sm:inline">Link Form</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={() => {
                        const leadData = {
                          id: selectedLead.id,
                          fullName: editLeadForm.name || selectedLead.full_name,
                          phone: editLeadForm.phone || selectedLead.phone,
                          email: editLeadForm.email || selectedLead.email,
                          destination: sanitizeDestinationString(editLeadForm.destination || selectedLead.destination),
                          estimated_value_cents: editLeadForm.estimated_value_cents || selectedLead.estimated_value_cents,
                          passenger_count: (editLeadForm.pax_adults || 2) + (editLeadForm.pax_children || 0),
                          departureDate: editLeadForm.travel_start || selectedLead.travel_start,
                          returnDate: editLeadForm.travel_end || selectedLead.travel_end,
                          adultsCount: editLeadForm.pax_adults || selectedLead.pax_adults || 2,
                          childrenCount: editLeadForm.pax_children || selectedLead.pax_children || 0,
                          notes: editLeadForm.notes || selectedLead.notes || "",
                          payment_plan: editLeadForm.payment_plan,
                        };
                        setSelectedLead(null);
                        setProposalLead(leadData);
                      }}
                      className="h-10 px-4 rounded-lg text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="size-3.5" />
                      <span>Nova Cotação</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePromoteToCustomer(selectedLead.id)}
                      className="h-10 px-3 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      title="Promover a Cliente 360°"
                    >
                      <UserCheck className="size-3.5 text-primary" />
                      <span className="hidden md:inline">Converter em Cliente</span>
                    </Button>
                  </div>
                </div>

                {/* Trilho de Abas em Pílulas Segmentadas (Travel Agências Style) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-border/40">
                  {[
                    { id: "viagem", label: "Geral" },
                    { id: "onboarding", label: "Acompanhantes" },
                    { id: "reuniao", label: "Agenda & Lembretes" },
                    { id: "checklist", label: `Cotações (${leadProposals.length})` },
                    { id: "contratos", label: "Contratos" },
                    { id: "pagamento", label: "Pagamento" },
                    { id: "anamnese", label: "Anamnese" },
                    { id: "cliente360", label: "Cliente 360°" },
                    { id: "lgpd", label: "LGPD" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setLeadDrawerTab(t.id as any)}
                      className={cn(
                        "h-8 px-3.5 rounded-full text-xs font-medium transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        leadDrawerTab === t.id
                          ? "bg-foreground text-background font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </SheetHeader>

              {/* Corpo Único com 100% de Largura (Sem Colunas Concorrentes) */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 [scrollbar-width:thin] bg-background">
                {/* 1. ABA GERAL (VIAGEM, ACESSIBILIDADE, ESTÁGIO, TAGS & RESPONSÁVEL) */}
                {leadDrawerTab === "viagem" && (
                  <div className="space-y-6 text-xs">
                    {/* 2-Colunas: VIAGEM & INTERESSE + ACESSIBILIDADE & SAÚDE */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Coluna 1: VIAGEM & INTERESSE */}
                      <div className="space-y-4 p-5 rounded-xl border border-border/40 bg-muted/10">
                        <h4 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-2">
                          <MapPin className="size-4 text-primary" />
                          <span>Viagem & Interesse</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-2xs text-muted-foreground font-semibold">Destino Principal</Label>
                              <Input
                                value={editLeadForm.destination}
                                onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, destination: e.target.value }))}
                                placeholder="Ex: Orlando, Maceió, Paris"
                                className="h-10 text-xs rounded-lg"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-2xs text-muted-foreground font-semibold">Tipo de Interesse</Label>
                              <Select
                                value={editLeadForm.interest_type || "package_flight"}
                                onValueChange={(val) => setEditLeadForm((prev: any) => ({ ...prev, interest_type: val }))}
                              >
                                <SelectTrigger className="h-10 text-xs rounded-lg">
                                  <SelectValue placeholder="Tipo de interesse..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {INTEREST_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-2xs text-muted-foreground font-semibold">Orçamento Estimado (R$)</Label>
                              <CurrencyField
                                value={editLeadForm.estimated_value_cents}
                                onChange={(val: any) => setEditLeadForm((prev: any) => ({ ...prev, estimated_value_cents: val || 0 }))}
                                className="h-10 text-xs rounded-lg font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-2xs text-muted-foreground font-semibold">Período Flexível</Label>
                              <Input
                                value={editLeadForm.interest_period}
                                onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, interest_period: e.target.value }))}
                                placeholder="Ex: Julho 2026, Réveillon"
                                className="h-10 text-xs rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-2xs text-muted-foreground font-semibold">Data Ida</Label>
                              <Input
                                type="date"
                                value={editLeadForm.travel_start}
                                onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, travel_start: e.target.value }))}
                                className="h-10 text-xs rounded-lg font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-2xs text-muted-foreground font-semibold">Data Volta</Label>
                              <Input
                                type="date"
                                value={editLeadForm.travel_end}
                                onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, travel_end: e.target.value }))}
                                className="h-10 text-xs rounded-lg font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-2xs text-muted-foreground font-semibold">Composição de Passageiros</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <span className="text-2xs text-muted-foreground block text-center">Adultos</span>
                                <Input
                                  type="number"
                                  min={1}
                                  value={editLeadForm.pax_adults}
                                  onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, pax_adults: parseInt(e.target.value) || 1 }))}
                                  className="h-9 text-xs rounded-lg font-mono text-center"
                                />
                              </div>
                              <div>
                                <span className="text-2xs text-muted-foreground block text-center">Crianças</span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={editLeadForm.pax_children}
                                  onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, pax_children: parseInt(e.target.value) || 0 }))}
                                  className="h-9 text-xs rounded-lg font-mono text-center"
                                />
                              </div>
                              <div>
                                <span className="text-2xs text-muted-foreground block text-center">Bebês</span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={editLeadForm.pax_infants}
                                  onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, pax_infants: parseInt(e.target.value) || 0 }))}
                                  className="h-9 text-xs rounded-lg font-mono text-center"
                                />
                              </div>
                            </div>
                            {editLeadForm.pax_ages_str && (
                              <span className="text-2xs text-muted-foreground block font-mono mt-1">
                                Idades das crianças: {editLeadForm.pax_ages_str}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-2xs text-muted-foreground font-semibold">Canal / Origem</Label>
                              <Select
                                value={editLeadForm.source || "whatsapp"}
                                onValueChange={(val) => setEditLeadForm((prev: any) => ({ ...prev, source: val }))}
                              >
                                <SelectTrigger className="h-10 text-xs rounded-lg">
                                  <SelectValue placeholder="Canal..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {LEAD_SOURCES.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-2xs text-muted-foreground font-semibold">Detalhe do Canal</Label>
                              <Input
                                value={editLeadForm.lead_source_detail}
                                onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, lead_source_detail: e.target.value }))}
                                placeholder="Ex: Orgânico, Instagram"
                                className="h-10 text-xs rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-2xs text-muted-foreground font-semibold">Anotações da Abordagem</Label>
                            <Textarea
                              rows={2}
                              value={editLeadForm.notes}
                              onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, notes: e.target.value }))}
                              placeholder="Desejos específicos, hotel preferido, restrições..."
                              className="text-xs rounded-lg"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Coluna 2: ACESSIBILIDADE, SAÚDE & RESTRIÇÕES */}
                      <div className="space-y-4 p-5 rounded-xl border border-border/40 bg-muted/10">
                        <h4 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-2">
                          <ShieldCheck className="size-4 text-primary" />
                          <span>Acessibilidade & Saúde</span>
                        </h4>
                        <div className="space-y-3">
                          <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border/40 bg-background/50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(editLeadForm.pcd)}
                              onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, pcd: e.target.checked }))}
                              className="size-4 rounded accent-primary cursor-pointer"
                            />
                            <span className="text-xs font-medium text-foreground">PCD (Pessoa com Deficiência)</span>
                          </label>
                          <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border/40 bg-background/50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(editLeadForm.reduced_mobility)}
                              onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, reduced_mobility: e.target.checked }))}
                              className="size-4 rounded accent-primary cursor-pointer"
                            />
                            <span className="text-xs font-medium text-foreground">Mobilidade Reduzida</span>
                          </label>
                          <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border/40 bg-background/50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(editLeadForm.autism_spectrum)}
                              onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, autism_spectrum: e.target.checked }))}
                              className="size-4 rounded accent-primary cursor-pointer"
                            />
                            <span className="text-xs font-medium text-foreground">Espectro Autista (TEA)</span>
                          </label>

                          <div className="space-y-1 pt-2">
                            <Label className="text-2xs text-muted-foreground font-semibold">Notas de Saúde / Restrições</Label>
                            <Textarea
                              rows={4}
                              value={editLeadForm.health_notes || ""}
                              onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, health_notes: e.target.value }))}
                              placeholder="Alergias alimentares, necessidade de cadeira de rodas, oxigênio..."
                              className="text-xs rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Consentimento LGPD */}
                    <div className="p-4 rounded-xl border border-border/40 bg-muted/10 flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-foreground block">Consentimento LGPD</span>
                        <span className="text-2xs text-muted-foreground">O lead aceitou os termos de privacidade e coleta de dados da agência.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editLeadForm.lgpd_consent ?? true}
                        onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, lgpd_consent: e.target.checked }))}
                        className="size-5 rounded accent-primary cursor-pointer"
                      />
                    </div>

                    {/* 2 Colunas: ESTÁGIO DO FUNIL + RESPONSÁVEL / DONO */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl border border-border/40 bg-muted/10">
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Estágio do Funil</Label>
                        <Select
                          value={editLeadForm.status || selectedLead.status}
                          onValueChange={(val) => {
                            setEditLeadForm((prev: any) => ({ ...prev, status: val }));
                            handleMoveStage(selectedLead.id, val);
                          }}
                        >
                          <SelectTrigger className="h-10 text-xs rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TOURISM_STAGES.map((st) => (
                              <SelectItem key={st.id} value={st.id}>
                                <span className="flex items-center gap-2">
                                  <span className={cn("size-2 rounded-full shrink-0", st.dotColor)} />
                                  <span>{st.title}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Responsável / Dono</Label>
                        <Select
                          value={editLeadForm.assigned_to || ""}
                          onValueChange={(val) => setEditLeadForm((prev: any) => ({ ...prev, assigned_to: val }))}
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
                    </div>

                    {/* TAGS DO LEAD */}
                    <div className="p-5 rounded-xl border border-border/40 bg-muted/10 space-y-3">
                      <span className="font-bold text-xs uppercase tracking-wide text-foreground block">Tags do Lead</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {POPULAR_TAGS.map((pt) => {
                          const isSelected = (editLeadForm.tags || []).includes(pt.name);
                          return (
                            <button
                              key={pt.name}
                              type="button"
                              onClick={() => handleTogglePopularTag(pt.name)}
                              className={cn(
                                "h-7 px-3 rounded-full text-2xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                                isSelected
                                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                                  : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                              )}
                            >
                              {pt.name}
                            </button>
                          );
                        })}
                        {(editLeadForm.tags || [])
                          .filter((t: string) => !POPULAR_TAGS.some((pt) => pt.name === t))
                          .map((t: string) => (
                            <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-semibold bg-primary/10 text-primary border border-primary/20">
                              <span>{t}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(t)}
                                className="text-primary hover:text-destructive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="Criar nova tag personalizada..."
                          className="h-10 text-xs rounded-lg flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddTag}
                          className="h-10 px-4 text-xs font-semibold shrink-0 cursor-pointer"
                        >
                          <Plus className="size-3.5 mr-1" />
                          <span>Adicionar Tag</span>
                        </Button>
                      </div>
                    </div>

                    {/* Botão de Salvar Alterações */}
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        disabled={isUpdatingLead}
                        onClick={handleSaveLeadDetails}
                        className="h-11 min-h-11 px-6 text-xs font-bold bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {isUpdatingLead ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  </div>
                )}

            {/* 2. ABA CLIENTE 360° */}
            {leadDrawerTab === "cliente360" && (
              <div className="space-y-6 text-xs">
                {isLoading360 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Carregando dossiê 360° do cliente...
                  </div>
                ) : customer360Data?.customer ? (
                  <div className="space-y-5">
                    <div className="space-y-3 pb-5 border-b border-border/40">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-sm">
                          {customer360Data.customer.full_name || customer360Data.customer.legal_name || customer360Data.customer.name}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          Score: {customer360Data.customer.score || 100}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-2xs text-muted-foreground">
                        <div>CPF/CNPJ: {customer360Data.customer.document || customer360Data.customer.cpf_cnpj || "Não cadastrado"}</div>
                        <div>Cidade: {customer360Data.customer.city || "Não informada"}</div>
                        <div>Atendimentos no Funil: {(customer360Data.otherLeads?.length || 0) + 1}</div>
                        <div>Viagens Confirmadas: {customer360Data.trips?.length || 0}</div>
                        <div>Contratos Emitidos: {customer360Data.contracts?.length || 0}</div>
                        <div>Chamados / Suporte: {customer360Data.incidents?.length || 0}</div>
                      </div>
                    </div>

                    {/* Viagens Confirmadas do Cliente */}
                    {Array.isArray(customer360Data.trips) && customer360Data.trips.length > 0 && (
                      <div className="space-y-3 pb-5 border-b border-border/40">
                        <span className="font-bold text-xs uppercase tracking-wide text-foreground block">Viagens Confirmadas & Histórico</span>
                        {customer360Data.trips.map((tr: any) => (
                          <div
                            key={tr.id}
                            className="p-3 rounded-lg border border-border/40 bg-muted/10 flex items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-semibold text-foreground block">{tr.title || tr.destination}</span>
                              <span className="text-2xs text-muted-foreground font-mono">
                                Embarque: {tr.departure_date || "A definir"} · {formatMoney(tr.total_price_cents || 0)}
                              </span>
                            </div>
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-11 min-h-11 px-3 text-xs font-semibold gap-2"
                            >
                              <Link to="/workspace/turismo/viagens/$id" params={{ id: tr.id }}>
                                <ExternalLink className="size-3.5" />
                                <span>Dossiê</span>
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Chamados de Suporte / Incidentes do Cliente */}
                    {Array.isArray(customer360Data.incidents) && customer360Data.incidents.length > 0 && (
                      <div className="space-y-3 pb-5 border-b border-border/40">
                        <span className="font-bold text-xs uppercase tracking-wide text-foreground block">Tickets de Suporte / SOS Viagem</span>
                        {customer360Data.incidents.map((inc: any) => (
                          <div
                            key={inc.id}
                            className="p-3 rounded-lg border border-border/40 bg-muted/10 flex items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-semibold text-foreground block">{inc.title}</span>
                              <span className="text-2xs text-muted-foreground font-mono">
                                Severidade: {inc.severity} · Status: {inc.status}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-2xs font-mono">
                              {inc.category}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dossiê Imprimível */}
                    <Customer360PrintableDossier
                      customer={{
                        id: customer360Data.customer.id,
                        fullName: customer360Data.customer.full_name || customer360Data.customer.name || "Cliente",
                        taxId: customer360Data.customer.document || customer360Data.customer.cpf_cnpj || null,
                        email: customer360Data.customer.email || null,
                        phone: customer360Data.customer.phone || null,
                        city: customer360Data.customer.city || null,
                      }}
                    />
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg space-y-2">
                    <span>Nenhum perfil de cliente vinculado a este lead.</span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePromoteToCustomer(selectedLead.id)}
                      className="h-11 min-h-11 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <UserCheck className="size-3.5" />
                      <span>Promover a Cliente da Carteira 360°</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 3. ABA CONTRATOS DIGITAIS */}
            {leadDrawerTab === "contratos" && (
              <div className="space-y-6 text-xs">
                <div className="space-y-3 pb-5 border-b border-border/40">
                  <div className="flex items-center gap-2 pb-1">
                    <FileSignature className="size-4 text-primary" />
                    <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">Emitir Novo Contrato Digital</h4>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Título do Contrato</Label>
                    <Input
                      value={contractForm.title}
                      onChange={(e) => setContractForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="h-10 text-xs rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Resumo dos Serviços Inclusos</Label>
                    <Textarea
                      rows={2}
                      value={contractForm.packageSummary}
                      onChange={(e) => setContractForm((prev) => ({ ...prev, packageSummary: e.target.value }))}
                      className="text-xs rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Valor Total Contratado (R$)</Label>
                      <CurrencyField
                        value={contractForm.totalValueCents}
                        onChange={(val: any) => setContractForm((prev) => ({ ...prev, totalValueCents: val || 0 }))}
                        className="h-10 text-xs rounded-lg font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Condições de Pagamento</Label>
                      <Input
                        value={contractForm.paymentConditions}
                        onChange={(e) => setContractForm((prev) => ({ ...prev, paymentConditions: e.target.value }))}
                        className="h-10 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    disabled={isIssuingContract}
                    onClick={handleIssueContract}
                    className="w-full h-11 min-h-11 text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    {isIssuingContract ? "Gerando..." : "Gerar Contrato"}
                  </Button>
                </div>

                {/* Lista de Contratos Existentes */}
                {customer360Data?.contracts && customer360Data.contracts.length > 0 && (
                  <div className="space-y-3">
                    <span className="font-bold text-foreground block">Contratos Emitidos</span>
                    {customer360Data.contracts.map((c: any) => {
                      const isSigned = c.status === "signed" || Boolean(c.signed_at);
                      const isViewed = isSigned || c.status === "viewed";
                      const isOpened = isViewed || c.status === "opened" || c.status === "sent";
                      return (
                        <div
                          key={c.id}
                          className="p-3 rounded-lg border border-border/60 bg-card space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-foreground block">
                                {c.contract_title || c.title || "Contrato Digital"}
                              </span>
                              <span className="text-2xs text-muted-foreground font-mono">
                                {formatMoney(c.total_value_cents || c.total_amount_cents || 0)} · {isSigned ? "Assinado" : c.status}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyContractLink(c.public_token || c.id)}
                              className="h-11 min-h-11 px-3 text-2xs font-semibold gap-2"
                            >
                              <Copy className="size-3" />
                              <span>Copiar Link</span>
                            </Button>
                          </div>

                          <div className="flex items-center gap-2 text-2xs text-muted-foreground pt-1">
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
                )}
              </div>
            )}

            {/* 4. ABA ONBOARDING COMERCIAL & PASTAS POR PASSAGEIRO */}
            {leadDrawerTab === "onboarding" && (
              <div className="space-y-6 text-xs">
                {/* Link Mágico de Cadastro do Cliente */}
                <div className="p-5 rounded-xl border border-border/40 bg-muted/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="size-4 text-primary" />
                    <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Link Mágico de Cadastro do Cliente
                    </h4>
                  </div>
                  <p className="text-2xs text-muted-foreground">
                    Envie este link para que o cliente revise as preferências de viagem, preencha documentos e cadastre todos os acompanhantes da família ou grupo de forma autônoma.
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopyOnboardingFormLink}
                      className="h-10 px-4 text-xs font-semibold gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Copy className="size-3.5" />
                      <span>Copiar Link Form</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSendOnboardingFormWhatsApp}
                      className="h-10 px-4 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MessageSquare className="size-3.5" />
                      <span>Enviar Form no WhatsApp</span>
                    </Button>
                  </div>
                </div>

                {/* Conferência Documental Sob Demanda */}
                <details className="border border-border/40 rounded-xl p-4 bg-muted/5 group">
                  <summary className="flex items-center justify-between cursor-pointer text-xs font-bold text-foreground select-none">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" />
                      <span>Validação Documental & Biometria do Passageiro</span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="pt-4">
                    <TravelerVerificationFlow
                      tripId={selectedLead.id}
                      initialFullName={editLeadForm.name || selectedLead.full_name || ""}
                      initialDocumentNumber={editLeadForm.cpf || selectedLead.cpf || ""}
                      className="border border-border/40 bg-background"
                      onVerificationComplete={(res) => {
                        if (res.correctedName) {
                          setEditLeadForm((prev: any) => ({ ...prev, name: res.correctedName! }));
                        }
                        toast.success("Conferência documental e biometria registradas no dossiê!");
                      }}
                    />
                  </div>
                </details>

                {/* Pastas Hierárquicas por Passageiro (Documentação & Passaportes) */}
                <div className="p-5 rounded-xl border border-border/40 bg-muted/10 space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
                    <h4 className="font-bold text-xs uppercase tracking-wide text-foreground block">
                      Viajantes Vinculados / Acompanhantes ({Array.isArray(editLeadForm.pax_list) ? editLeadForm.pax_list.length : 0})
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const cur = Array.isArray(editLeadForm.pax_list) ? editLeadForm.pax_list : [];
                        const nextIdx = cur.length + 1;
                        setEditLeadForm((prev: any) => ({
                          ...prev,
                          pax_list: [
                            ...cur,
                            {
                              id: `pax-${Date.now()}`,
                              role: `Acompanhante ${nextIdx - 1}`,
                              full_name: "",
                              document: "",
                              passport_number: "",
                              passport_expiry: "",
                              visa_status: "dispensado",
                            },
                          ],
                        }));
                      }}
                      className="h-10 px-3 text-xs font-semibold gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="size-3.5" />
                      <span>Adicionar Passageiro</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {(editLeadForm.pax_list || []).map((pax: any, idx: number) => {
                      const departureRef = editLeadForm.travel_start ? new Date(editLeadForm.travel_start) : new Date();
                      const expiryDate = pax.passport_expiry ? new Date(pax.passport_expiry) : null;
                      const diffMonths = expiryDate
                        ? (expiryDate.getTime() - departureRef.getTime()) / (1000 * 60 * 60 * 24 * 30)
                        : null;
                      const isExpiringSoon = diffMonths !== null && diffMonths < 6;

                      return (
                        <div key={pax.id || idx} className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="secondary" className="text-2xs font-mono">
                              Pasta #{idx + 1} · {idx === 0 ? "Titular" : pax.role || `Acompanhante ${idx}`}
                            </Badge>
                            {isExpiringSoon && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 text-rose-600 border border-rose-500/30 text-2xs font-bold">
                                <AlertTriangle className="size-3 shrink-0" />
                                <span>Passaporte vence em menos de 6 meses do embarque</span>
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-2xs text-muted-foreground">Nome Completo do Passageiro</Label>
                              <Input
                                value={pax.full_name || ""}
                                onChange={(e) => {
                                  const updated = [...(editLeadForm.pax_list || [])];
                                  updated[idx] = { ...updated[idx], full_name: e.target.value };
                                  setEditLeadForm((prev: any) => ({ ...prev, pax_list: updated }));
                                }}
                                placeholder="Nome conforme documento de embarque"
                                className="h-10 text-xs rounded-lg"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-2xs text-muted-foreground">RG / CPF</Label>
                              <Input
                                value={pax.document || ""}
                                onChange={(e) => {
                                  const updated = [...(editLeadForm.pax_list || [])];
                                  updated[idx] = { ...updated[idx], document: e.target.value };
                                  setEditLeadForm((prev: any) => ({ ...prev, pax_list: updated }));
                                }}
                                placeholder="000.000.000-00"
                                className="h-10 text-xs rounded-lg font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-2xs text-muted-foreground">Nº do Passaporte</Label>
                              <Input
                                value={pax.passport_number || ""}
                                onChange={(e) => {
                                  const updated = [...(editLeadForm.pax_list || [])];
                                  updated[idx] = { ...updated[idx], passport_number: e.target.value };
                                  setEditLeadForm((prev: any) => ({ ...prev, pax_list: updated }));
                                }}
                                placeholder="Ex: FP123456"
                                className="h-10 text-xs rounded-lg font-mono uppercase"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-2xs text-muted-foreground">Validade do Passaporte</Label>
                              <Input
                                type="date"
                                value={pax.passport_expiry || ""}
                                onChange={(e) => {
                                  const updated = [...(editLeadForm.pax_list || [])];
                                  updated[idx] = { ...updated[idx], passport_expiry: e.target.value };
                                  setEditLeadForm((prev: any) => ({ ...prev, pax_list: updated }));
                                }}
                                className="h-10 text-xs rounded-lg font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      disabled={isUpdatingLead}
                      onClick={handleSaveLeadDetails}
                      className="h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {isUpdatingLead ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. ABA COTAÇÕES & PROPOSTAS COMERCIAIS */}
            {leadDrawerTab === "checklist" && (
              <div className="space-y-6 text-xs">
                {/* Bloco: Propostas Comerciais & Cotações */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                        Cotações & Propostas ({leadProposals.length})
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {leadProposals.length >= 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isBundlingProposals}
                          onClick={async () => {
                            setIsBundlingProposals(true);
                            try {
                              const res = await bundleTravelProposalsIntoSingleLink({
                                data: {
                                  proposalIds: leadProposals.map((p: any) => p.id),
                                  bundleTitle: `Comparativo de Viagem (${leadProposals.length} Opções) — ${editLeadForm.destination || editLeadForm.name}`,
                                },
                              });
                              const unifiedUrl = `${window.location.origin}/p/${res.publicToken}`;
                              await navigator.clipboard.writeText(unifiedUrl);
                              toast.success("Link comparativo copiado!");
                            } catch (err: any) {
                              toast.error(err?.message || "Erro ao unificar propostas.");
                            } finally {
                              setIsBundlingProposals(false);
                            }
                          }}
                          className="h-10 px-3 text-xs font-semibold gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Copy className="size-3.5" />
                          <span>{isBundlingProposals ? "Unificando..." : "Copiar Link Comparativo"}</span>
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const leadData = {
                            id: selectedLead.id,
                            fullName: editLeadForm.name || selectedLead.full_name,
                            phone: editLeadForm.phone || selectedLead.phone,
                            email: editLeadForm.email || selectedLead.email,
                            destination: sanitizeDestinationString(editLeadForm.destination || selectedLead.destination),
                            estimated_value_cents: editLeadForm.estimated_value_cents || selectedLead.estimated_value_cents,
                            passenger_count: (editLeadForm.pax_adults || 2) + (editLeadForm.pax_children || 0),
                            departureDate: editLeadForm.travel_start || selectedLead.travel_start,
                            returnDate: editLeadForm.travel_end || selectedLead.travel_end,
                            adultsCount: editLeadForm.pax_adults || selectedLead.pax_adults || 2,
                            childrenCount: editLeadForm.pax_children || selectedLead.pax_children || 0,
                            notes: editLeadForm.notes || selectedLead.notes || "",
                            payment_plan: editLeadForm.payment_plan,
                          };
                          setSelectedLead(null);
                          setProposalLead(leadData);
                        }}
                        className="h-10 px-4 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Plus className="size-3.5" />
                        <span>Nova Cotação</span>
                      </Button>
                    </div>
                  </div>

                  {leadProposals.length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-border/40 bg-muted/5 space-y-3">
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <FileText className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-xs text-foreground">Nenhuma cotação gerada para este atendimento</p>
                        <p className="text-2xs text-muted-foreground">Crie opções personalizadas de aéreo e hotelaria para enviar ao viajante.</p>
                      </div>
                      <div className="pt-2">
                        <Button
                          type="button"
                          onClick={() => {
                            const leadData = {
                              id: selectedLead.id,
                              fullName: editLeadForm.name || selectedLead.full_name,
                              phone: editLeadForm.phone || selectedLead.phone,
                              email: editLeadForm.email || selectedLead.email,
                              destination: sanitizeDestinationString(editLeadForm.destination || selectedLead.destination),
                              estimated_value_cents: editLeadForm.estimated_value_cents || selectedLead.estimated_value_cents,
                              passenger_count: (editLeadForm.pax_adults || 2) + (editLeadForm.pax_children || 0),
                              departureDate: editLeadForm.travel_start || selectedLead.travel_start,
                              returnDate: editLeadForm.travel_end || selectedLead.travel_end,
                              adultsCount: editLeadForm.pax_adults || selectedLead.pax_adults || 2,
                              childrenCount: editLeadForm.pax_children || selectedLead.pax_children || 0,
                              notes: editLeadForm.notes || selectedLead.notes || "",
                              payment_plan: editLeadForm.payment_plan,
                            };
                            setSelectedLead(null);
                            setProposalLead(leadData);
                          }}
                          className="h-10 px-5 text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer"
                        >
                          <Plus className="size-3.5" />
                          <span>Montar Primeira Cotação</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {leadProposals.map((lp: any, idx: number) => (
                        <div
                          key={lp.id}
                          className="p-3.5 rounded-xl border border-border/40 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-2xs font-mono text-muted-foreground font-semibold">#{idx + 1}</span>
                              <span className="font-bold text-foreground text-xs truncate">
                                {lp.title || lp.destination_city || "Proposta de Viagem"}
                              </span>
                            </div>
                            <div className="text-2xs text-muted-foreground font-mono">
                              {formatMoney(lp.pricing?.total_price_cents || 0)} · Status: {lp.status}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleConvertProposalToTrip(lp.id)}
                              className="h-9 px-3 text-2xs font-semibold gap-1 text-emerald-600 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span>Confirmar Viagem</span>
                            </Button>
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-9 px-3 text-2xs font-semibold gap-1 focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <Link to="/workspace/turismo/propostas/$id" params={{ id: lp.id }}>
                                <Eye className="size-3.5" />
                                <span>Abrir Studio</span>
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bloco: Checklist de Atendimento */}
                <div className="space-y-3 pt-3 border-t border-border/40">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">Checklist de Atendimento</h4>
                    </div>
                    <span className="text-2xs font-mono text-muted-foreground">
                      {(editLeadForm.checklist || []).filter((i: any) => i.done).length} de {(editLeadForm.checklist || []).length} concluídos
                    </span>
                  </div>

                  <div className="divide-y divide-border/40 rounded-xl border border-border/50 overflow-hidden bg-muted/5">
                    {(editLeadForm.checklist || []).map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleChecklist(item.id)}
                        className={cn(
                          "w-full p-2.5 text-left flex items-center justify-between transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                          item.done
                            ? "bg-emerald-500/5 text-muted-foreground hover:bg-emerald-500/10"
                            : "hover:bg-muted/30 text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          {item.done ? (
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Square className="size-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={cn("text-xs", item.done ? "line-through text-muted-foreground" : "font-medium text-foreground")}>
                            {item.text}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Adicionar Item ao Checklist */}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      value={newChecklistItemText}
                      onChange={(e) => setNewChecklistItemText(e.target.value)}
                      placeholder="Adicionar tarefa específica para este cliente..."
                      className="h-10 text-xs rounded-lg flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddChecklistItem();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddChecklistItem}
                      className="h-10 px-3 text-xs font-semibold shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="size-3.5 mr-1" />
                      <span>Adicionar</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 6. ABA ANAMNESE & PREFERÊNCIAS */}
            {leadDrawerTab === "anamnese" && (
              <div className="space-y-6 text-xs">
                <div className="space-y-3 pb-5 border-b border-border/40">
                  <span className="text-xs font-bold uppercase tracking-wide text-foreground block">Estilo de Viagem</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {["Econômica", "Conforto", "Premium / Luxo"].map((style) => {
                      const isSelected = (editLeadForm.notes || "").includes(style);
                      return (
                        <button
                          type="button"
                          key={style}
                          onClick={() => {
                            const updatedNotes = `${editLeadForm.notes || ""}\nEstilo: ${style}`.trim();
                            setEditLeadForm((prev: any) => ({ ...prev, notes: updatedNotes }));
                            toast.success(`Estilo selecionado: ${style}`);
                          }}
                          className={`h-11 min-h-11 p-2 rounded-lg border text-center text-xs font-medium cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border/60 bg-card text-foreground hover:bg-muted/40"
                          }`}
                        >
                          {style}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pb-5 border-b border-border/40">
                  <span className="text-xs font-bold uppercase tracking-wide text-foreground block">Preferência de Hospedagem</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {["Hotel Central", "Resort All-Inclusive", "Pousada Boutique"].map((h) => {
                      const isSelected = (editLeadForm.notes || "").includes(h);
                      return (
                        <button
                          type="button"
                          key={h}
                          onClick={() => {
                            const updatedNotes = `${editLeadForm.notes || ""}\nHospedagem: ${h}`.trim();
                            setEditLeadForm((prev: any) => ({ ...prev, notes: updatedNotes }));
                            toast.success(`Hospedagem selecionada: ${h}`);
                          }}
                          className={`h-11 min-h-11 p-2 rounded-lg border text-center text-xs font-medium cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border/60 bg-card text-foreground hover:bg-muted/40"
                          }`}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-foreground block">Preferência de Voo & Bagagem</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {["Assento Janela", "Assento Corredor", "Bagagem Despachada (23kg)"].map((p) => {
                      const isSelected = (editLeadForm.notes || "").includes(p);
                      return (
                        <button
                          type="button"
                          key={p}
                          onClick={() => {
                            const updatedNotes = `${editLeadForm.notes || ""}\nPreferencia: ${p}`.trim();
                            setEditLeadForm((prev: any) => ({ ...prev, notes: updatedNotes }));
                            toast.success(`Preferência selecionada: ${p}`);
                          }}
                          className={`h-11 min-h-11 p-2 rounded-lg border text-center text-xs font-medium cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border/60 bg-card text-foreground hover:bg-muted/40"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 7. ABA AGENDA & LEMBRETES */}
            {leadDrawerTab === "reuniao" && (
              <div className="space-y-6 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-primary" />
                    <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      Compromissos & Reuniões Agendadas
                    </h4>
                  </div>
                </div>

                {/* Formulário de Novo Compromisso */}
                <div className="p-5 rounded-xl border border-border/40 bg-muted/10 space-y-4">
                  <span className="font-bold text-xs uppercase tracking-wide text-foreground block">
                    Agendar Novo Compromisso / Reunião
                  </span>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold text-muted-foreground block">Assunto da Reunião</Label>
                      <Input
                        value={meetingTitle}
                        onChange={(e) => setMeetingTitle(e.target.value)}
                        placeholder="Ex: Apresentação da Cotação Orlando / Réveillon"
                        className="h-10 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold text-muted-foreground block">Pauta / Objetivo</Label>
                      <Textarea
                        rows={2}
                        value={meetingObjective}
                        onChange={(e) => setMeetingObjective(e.target.value)}
                        placeholder="Ex: Comparar opções de voos e hotéis..."
                        className="rounded-lg text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-2xs font-semibold text-muted-foreground block">Data e Horário</Label>
                        <Input
                          type="datetime-local"
                          value={meetingDate}
                          onChange={(e) => setMeetingDate(e.target.value)}
                          className="h-10 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs font-semibold text-muted-foreground block">Tipo de Encontro</Label>
                        <select
                          value={meetingType}
                          onChange={(e) => setMeetingType(e.target.value as any)}
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="call">Ligação Telefônica / WhatsApp</option>
                          <option value="video">Videoconferência (Meet / Zoom)</option>
                          <option value="in_person">Presencial na Agência</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold text-muted-foreground block">Link da Sala (Opcional)</Label>
                      <Input
                        value={meetingRoomUrl}
                        onChange={(e) => setMeetingRoomUrl(e.target.value)}
                        placeholder="https://meet.google.com/..."
                        className="h-10 rounded-lg text-xs font-mono"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        disabled={isSavingMeeting || !meetingTitle.trim() || !meetingDate}
                        onClick={async () => {
                          setIsSavingMeeting(true);
                          try {
                            const composedDescription = [
                              meetingObjective.trim(),
                              meetingRoomUrl.trim() ? `Sala: ${meetingRoomUrl.trim()}` : "",
                            ]
                              .filter(Boolean)
                              .join(" | ");

                            await addLeadMeeting({
                              data: {
                                leadId: selectedLead.id,
                                title: meetingTitle.trim(),
                                description: composedDescription || null,
                                scheduledAt: new Date(meetingDate).toISOString(),
                                meetingType,
                                durationMinutes: 30,
                              },
                            });
                            toast.success("Reunião agendada!");
                            setMeetingTitle("");
                            setMeetingObjective("");
                            setMeetingRoomUrl("");
                            setMeetingDate("");
                            refetchLeads();
                            getCustomer360Profile({ data: { leadId: selectedLead.id } })
                              .then((r) => setCustomer360Data(r))
                              .catch(() => null);
                          } catch (err: any) {
                            toast.error(err?.message || "Erro ao agendar.");
                          } finally {
                            setIsSavingMeeting(false);
                          }
                        }}
                        className="h-10 px-4 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {isSavingMeeting ? "Agendando..." : "Salvar Agendamento"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Lista de Reuniões */}
                <div className="p-5 rounded-xl border border-border/40 bg-muted/10 space-y-3">
                  <span className="font-bold text-xs uppercase tracking-wide text-foreground block">
                    Compromissos Agendados ({Array.isArray(customer360Data?.meetings) ? customer360Data.meetings.length : 0})
                  </span>
                  {(!Array.isArray(customer360Data?.meetings) || customer360Data.meetings.length === 0) ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      Nenhum compromisso agendado.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customer360Data.meetings.map((m: any) => (
                        <div key={m.id} className="p-3 rounded-lg border border-border/40 bg-background flex items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <span className="font-bold text-foreground block text-xs truncate">{m.title}</span>
                            {m.description && (
                              <span className="text-2xs text-muted-foreground block truncate">{m.description}</span>
                            )}
                            <span className="text-2xs font-mono text-primary block">
                              {new Date(m.scheduled_at).toLocaleString("pt-BR")} · {m.meeting_type}
                            </span>
                          </div>
                          <span className="text-2xs font-mono text-emerald-600 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                            Confirmado
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 8. ABA LGPD */}
            {leadDrawerTab === "lgpd" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-3 pb-5 border-b border-border/40">
                  <div className="flex items-center gap-2 pb-1">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">Governança LGPD</h4>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Termo de Consentimento</span>
                    <span className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="size-3.5" />
                      Ativo
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 9. ABA PLANEJAMENTO DE PAGAMENTO */}
            {leadDrawerTab === "pagamento" && (() => {
              const pp = editLeadForm.payment_plan || {};
              const flightCents = pp.flight_cents || 0;
              const hotelCents = pp.hotel_cents || 0;
              const insuranceCents = pp.insurance_cents || 0;
              const boardingTaxCents = pp.boarding_tax_cents || 0;
              const otherServicesCents = pp.other_services_cents || 0;
              const commissionCents = pp.commission_cents || 0;
              const decompTotal = flightCents + hotelCents + insuranceCents + boardingTaxCents + otherServicesCents + commissionCents;
              const effectiveTotalCents = decompTotal > 0 ? decompTotal : (editLeadForm.estimated_value_cents || 0);

              const enableBoleto = pp.enableBoleto ?? true;
              const boletoInstallments = Math.max(1, pp.boletoInstallments ?? 12);
              const hasBoletoDownpayment = Boolean(pp.hasBoletoDownpayment);
              const downpaymentType = pp.downpaymentType || "percentage";
              const downpaymentPct = pp.downpaymentPct ?? 20;
              const downpaymentFixedCents = pp.downpaymentFixedCents ?? 0;
              const firstBoletoDue = pp.firstBoletoDue || "Primeiro boleto para 30 dias";
              const firstBoletoCondition = pp.firstBoletoCondition || "Sem juros operadora";

              const enableCard = pp.enableCard ?? true;
              const cardInstallments = Math.max(1, pp.cardInstallments ?? 10);

              const enablePixDiscount = pp.enablePixDiscount ?? true;
              const pixDiscountPct = pp.pixDiscountPct ?? 5;
              const pixFinalCents = effectiveTotalCents > 0 && pixDiscountPct > 0
                ? Math.round(effectiveTotalCents * (1 - pixDiscountPct / 100))
                : effectiveTotalCents;

              const operatorName = pp.operatorName || "";

              const generatedTermsText = (() => {
                const parts: string[] = [];
                if (enableBoleto) {
                  if (hasBoletoDownpayment) {
                    const downpaymentStr =
                      downpaymentType === "fixed_cents"
                        ? formatMoney(downpaymentFixedCents)
                        : `${downpaymentPct}% (${formatMoney(Math.round((effectiveTotalCents * downpaymentPct) / 100))})`;
                    const remaining = Math.max(1, boletoInstallments - 1);
                    const remainingVal = effectiveTotalCents > 0
                      ? Math.round(
                          (effectiveTotalCents -
                            (downpaymentType === "fixed_cents"
                              ? downpaymentFixedCents
                              : Math.round((effectiveTotalCents * downpaymentPct) / 100))) /
                            remaining
                        )
                      : 0;
                    parts.push(`Boleto: Entrada de ${downpaymentStr} + ${remaining}x de ${formatMoney(remainingVal)} (${firstBoletoDue})`);
                  } else {
                    const monthlyVal = effectiveTotalCents > 0 ? Math.round(effectiveTotalCents / Math.max(1, boletoInstallments)) : 0;
                    parts.push(`Boleto: Até ${boletoInstallments}x de ${formatMoney(monthlyVal)} sem entrada (${firstBoletoDue})`);
                  }
                }
                if (enableCard) {
                  const cardVal = effectiveTotalCents > 0 ? Math.round(effectiveTotalCents / Math.max(1, cardInstallments)) : 0;
                  parts.push(`Cartão: Até ${cardInstallments}x de ${formatMoney(cardVal)} sem juros`);
                }
                if (enablePixDiscount && pixDiscountPct > 0) {
                  parts.push(`À Vista no PIX: ${formatMoney(pixFinalCents)} (${pixDiscountPct}% OFF)`);
                }
                return parts.join(" | ");
              })();

              const isCustomized = Boolean(pp.isTermsCustomized);
              const displayedTerms = isCustomized ? (pp.notes ?? "") : (pp.notes || generatedTermsText);

              const updatePp = (patch: Record<string, any>) => {
                setEditLeadForm((prev: any) => ({
                  ...prev,
                  payment_plan: {
                    ...(prev.payment_plan || {}),
                    ...patch,
                  },
                }));
              };

              return (
                <div className="space-y-5 text-xs">
                  {/* Bloco 1: Decomposição Tarifária & Custo Real */}
                  <div className="space-y-3 p-4 rounded-xl border border-border/60 bg-card">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <DollarSign className="size-4 text-primary" />
                        <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">Decomposição Tarifária</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xs text-muted-foreground">Total Calculado:</span>
                        <span className="font-mono tabular-nums text-sm font-black text-foreground">
                          {formatMoney(effectiveTotalCents)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Aéreo / Passagens (R$)</Label>
                        <CurrencyField
                          value={flightCents}
                          onChange={(val: any) => updatePp({ flight_cents: val || 0 })}
                          className="h-10 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Hotelaria / Resort (R$)</Label>
                        <CurrencyField
                          value={hotelCents}
                          onChange={(val: any) => updatePp({ hotel_cents: val || 0 })}
                          className="h-10 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Seguro Viagem & Assistência (R$)</Label>
                        <CurrencyField
                          value={insuranceCents}
                          onChange={(val: any) => updatePp({ insurance_cents: val || 0 })}
                          className="h-10 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Taxas de Embarque (R$)</Label>
                        <CurrencyField
                          value={boardingTaxCents}
                          onChange={(val: any) => updatePp({ boarding_tax_cents: val || 0 })}
                          className="h-10 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Passeios & Outros Serviços (R$)</Label>
                        <CurrencyField
                          value={otherServicesCents}
                          onChange={(val: any) => updatePp({ other_services_cents: val || 0 })}
                          className="h-10 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Comissão / Markup da Agência (R$)</Label>
                        <CurrencyField
                          value={commissionCents}
                          onChange={(val: any) => updatePp({ commission_cents: val || 0 })}
                          className="h-10 text-xs rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Operadora Parceira & Fornecedor */}
                  <div className="space-y-3 p-4 rounded-xl border border-border/60 bg-card">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                      <Building2 className="size-4 text-primary" />
                      <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">Operadora & Fornecedor Parceiro</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-2xs text-muted-foreground font-semibold">Operadora de Referência</Label>
                        <Select
                          value={operatorName || "propria"}
                          onValueChange={(val) => updatePp({ operatorName: val })}
                        >
                          <SelectTrigger className="h-10 rounded-lg text-xs bg-background">
                            <SelectValue placeholder="Selecione a operadora" />
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
                            <SelectItem value="Personalizada">Outro Fornecedor / Personalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {operatorName === "Personalizada" && (
                        <div className="space-y-1">
                          <Label className="text-2xs text-muted-foreground font-semibold">Nome do Fornecedor</Label>
                          <Input
                            value={pp.customOperatorName || ""}
                            onChange={(e) => updatePp({ customOperatorName: e.target.value })}
                            placeholder="Ex: Operadora Regional XPTO"
                            className="h-10 text-xs rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloco 3: Modalidades & Condições Comerciais Livres (Espelho do Construtor) */}
                  <div className="space-y-4 p-4 rounded-xl border border-border/60 bg-muted/10">
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <CreditCard className="size-4 text-primary" />
                        <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">Condições Comerciais & Modalidades</h4>
                      </div>
                      <Badge variant="outline" className="text-2xs font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                        Configuração Livre
                      </Badge>
                    </div>

                    {/* 3.1 Boleto Bancário Faturado */}
                    <div className="space-y-3 p-3.5 rounded-lg bg-card border border-border/50">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={enableBoleto}
                            onChange={(e) => updatePp({ enableBoleto: e.target.checked })}
                            className="size-4 rounded border-border text-primary cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <span className="text-xs font-bold text-foreground">Boleto Bancário Faturado</span>
                        </label>
                        {enableBoleto && (
                          <div className="flex items-center gap-2">
                            <span className="text-2xs text-muted-foreground">Exigir Entrada?</span>
                            <button
                              type="button"
                              onClick={() => updatePp({ hasBoletoDownpayment: !hasBoletoDownpayment })}
                              className={`h-7 px-2.5 rounded-full text-2xs font-bold transition-colors cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                hasBoletoDownpayment
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                  : "bg-muted text-muted-foreground border-transparent"
                              }`}
                            >
                              {hasBoletoDownpayment ? "Com Entrada" : "Sem Entrada (Livre)"}
                            </button>
                          </div>
                        )}
                      </div>

                      {enableBoleto && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/30">
                          <div className="space-y-1">
                            <Label className="text-2xs text-muted-foreground font-semibold">Qtd. Parcelas</Label>
                            <select
                              value={boletoInstallments}
                              onChange={(e) => updatePp({ boletoInstallments: Number(e.target.value) })}
                              className="w-full h-10 rounded-lg bg-background border border-border px-2 text-xs font-medium text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
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
                                  onChange={(e) => updatePp({ downpaymentType: e.target.value as any })}
                                  className="h-10 rounded-lg bg-background border border-border px-1.5 text-2xs text-foreground cursor-pointer"
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
                                    onChange={(e) => updatePp({ downpaymentPct: Number(e.target.value) })}
                                    className="h-10 rounded-lg text-xs font-mono"
                                    placeholder="%"
                                  />
                                ) : (
                                  <CurrencyField
                                    value={downpaymentFixedCents}
                                    onChange={(val: any) => updatePp({ downpaymentFixedCents: val || 0 })}
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
                                onChange={(e) => updatePp({ firstBoletoDue: e.target.value })}
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
                              value={hasBoletoDownpayment ? firstBoletoDue : firstBoletoCondition}
                              onChange={(e) => {
                                if (hasBoletoDownpayment) {
                                  updatePp({ firstBoletoDue: e.target.value });
                                } else {
                                  updatePp({ firstBoletoCondition: e.target.value });
                                }
                              }}
                              placeholder={hasBoletoDownpayment ? "Ex: 30 dias após entrada" : "Sem juros operadora"}
                              className="h-10 text-xs rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3.2 Cartão de Crédito */}
                    <div className="space-y-3 p-3.5 rounded-lg bg-card border border-border/50">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={enableCard}
                            onChange={(e) => updatePp({ enableCard: e.target.checked })}
                            className="size-4 rounded border-border text-primary cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <span className="text-xs font-bold text-foreground">Cartão de Crédito</span>
                        </label>
                        {enableCard && (
                          <div className="flex items-center gap-2">
                            <Label className="text-2xs text-muted-foreground">Parcelas sem Juros:</Label>
                            <select
                              value={cardInstallments}
                              onChange={(e) => updatePp({ cardInstallments: Number(e.target.value) })}
                              className="h-9 rounded-lg bg-background border border-border px-2 text-xs font-medium text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24].map((n) => (
                                <option key={n} value={n}>
                                  Até {n}x sem juros
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3.3 À Vista no PIX */}
                    <div className="space-y-3 p-3.5 rounded-lg bg-card border border-border/50">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={enablePixDiscount}
                            onChange={(e) => updatePp({ enablePixDiscount: e.target.checked })}
                            className="size-4 rounded border-border text-primary cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <span className="text-xs font-bold text-foreground">À Vista no PIX / Transferência</span>
                        </label>
                        {enablePixDiscount && (
                          <div className="flex items-center gap-2">
                            <Label className="text-2xs text-muted-foreground">Desconto (%):</Label>
                            <Input
                              type="number"
                              min={0}
                              max={30}
                              value={pixDiscountPct}
                              onChange={(e) => updatePp({ pixDiscountPct: Number(e.target.value) })}
                              className="h-8 w-20 rounded-lg text-xs font-mono text-center"
                            />
                            {effectiveTotalCents > 0 && pixDiscountPct > 0 && (
                              <span className="text-2xs font-mono font-bold text-emerald-600">
                                {formatMoney(pixFinalCents)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3.4 Texto das Condições Comerciais ao Cliente */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">
                          Texto Comercial Apresentado ao Viajante
                        </Label>
                        {isCustomized && (
                          <button
                            type="button"
                            onClick={() => {
                              updatePp({ notes: generatedTermsText, isTermsCustomized: false });
                            }}
                            className="text-2xs text-primary hover:underline cursor-pointer flex items-center gap-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <RotateCcw className="size-3" />
                            <span>Restaurar cálculo automático</span>
                          </button>
                        )}
                      </div>
                      <Textarea
                        rows={2}
                        value={displayedTerms}
                        onChange={(e) => {
                          updatePp({ notes: e.target.value, isTermsCustomized: true });
                        }}
                        placeholder="Ex: Entrada de 20% no PIX + saldo em até 10x sem juros no cartão de crédito..."
                        className="text-xs rounded-lg min-h-16"
                      />
                    </div>
                  </div>

                  {/* Barra de Ações Integradas */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          const token = selectedLead.magic_token || selectedLead.id;
                          const url = `${window.location.origin}/m/lead/${token}?tab=pagamento`;
                          await navigator.clipboard.writeText(url);
                          toast.success("Link copiado!");
                        }}
                        className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Copy className="size-3.5" />
                        <span>Copiar Link</span>
                      </Button>
                      <Button
                        type="button"
                        disabled={isUpdatingLead}
                        onClick={handleSaveLeadDetails}
                        variant="secondary"
                        className="h-11 min-h-11 px-4 text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {isUpdatingLead ? "Salvando..." : "Salvar no Lead"}
                      </Button>
                    </div>

                    <Button
                      type="button"
                      onClick={() => {
                        const leadData = {
                          id: selectedLead.id,
                          fullName: editLeadForm.name || selectedLead.full_name,
                          phone: editLeadForm.phone || selectedLead.phone,
                          email: editLeadForm.email || selectedLead.email,
                          destination: sanitizeDestinationString(editLeadForm.destination || selectedLead.destination),
                          estimated_value_cents: effectiveTotalCents,
                          passenger_count: (editLeadForm.pax_adults || 2) + (editLeadForm.pax_children || 0),
                          departureDate: editLeadForm.travel_start || selectedLead.travel_start,
                          returnDate: editLeadForm.travel_end || selectedLead.travel_end,
                          adultsCount: editLeadForm.pax_adults || selectedLead.pax_adults || 2,
                          childrenCount: editLeadForm.pax_children || selectedLead.pax_children || 0,
                          notes: displayedTerms || editLeadForm.notes || selectedLead.notes || "",
                          payment_plan: {
                            ...editLeadForm.payment_plan,
                            notes: displayedTerms,
                          },
                        };
                        setSelectedLead(null);
                        setProposalLead(leadData);
                      }}
                      className="h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring shadow-sm"
                    >
                      <Sparkles className="size-4" />
                      <span>Abrir no Criador de Roteiro & Proposta</span>
                    </Button>
                  </div>
                </div>
              );
            })()}
              </div>
            </SheetContent>
          </Sheet>
        );
      })()}

      {/* ── MODAL LATERAL DE NOVA OPORTUNIDADE ── */}
      <Sheet open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 flex flex-col justify-between overflow-y-auto no-scrollbar">
          <div className="space-y-6">
            <SheetHeader className="p-0 text-left space-y-1 border-b border-border/50 pb-3">
              <SheetTitle className="text-lg font-bold text-foreground">Nova Oportunidade Comercial</SheetTitle>
              <div className="text-xs text-muted-foreground">
                Etapa: {TOURISM_STAGES.find((s) => s.id === newLeadTargetStage)?.title}
              </div>
            </SheetHeader>

            <form id="new-lead-form" onSubmit={handleCreateNewLead} className="space-y-5 text-xs">
              {/* Bloco 1: Contato & Titular */}
              <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Users className="size-3.5 text-primary" />
                  <span>Titular / Contato Principal</span>
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
                  <span>Detalhes da Viagem & Acomodação</span>
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

              {/* Bloco 3: Passageiros & Faixa Etária */}
              <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Plane className="size-3.5 text-primary" />
                  <span>Passageiros & Faixa Etária</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Adultos (ADT)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newLeadForm.paxAdults}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, paxAdults: parseInt(e.target.value) || 1 }))}
                      className="h-10 text-xs rounded-lg font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Crianças (2-11)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newLeadForm.paxChildren}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, paxChildren: parseInt(e.target.value) || 0 }))}
                      className="h-10 text-xs rounded-lg font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Bebês (0-2)</Label>
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
                  <Label className="text-2xs text-muted-foreground font-semibold">Idades das Crianças (separadas por vírgula)</Label>
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
          onStagesUpdated={() => {
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
