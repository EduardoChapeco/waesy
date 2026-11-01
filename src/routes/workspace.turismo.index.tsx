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
  History,
  Star,
  ChevronRight,
  ChevronLeft,
  X,
  CheckSquare,
  Square,
  Share2,
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
import { UnifiedProposalWorkspace, type UnifiedProposalWorkspaceLead } from "@/components/tourism/unified-proposal-workspace";
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
    dotColor: "bg-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
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
      commission_cents: 0,
      method: "pix_installments",
      installments: 10,
      notes: "",
    },
    lost_reason: "",
  });
  const [newChecklistItemText, setNewChecklistItemText] = useState("");

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

    setEditLeadForm({
      name: lead.full_name || "",
      phone: lead.phone || "",
      email: lead.email || "",
      destination: lead.destination || "",
      interest_type: lead.interest_type || "",
      interest_period: lead.interest_period || "",
      travel_start: lead.travel_start || "",
      travel_end: lead.travel_end || "",
      pax_adults: lead.pax_adults || 1,
      pax_children: lead.pax_children || 0,
      pax_infants: lead.pax_infants || 0,
      pax_ages_str: paxAgesStr,
      estimated_value_cents: estTotal,
      notes: lead.notes || lead.message || "",
      status: lead.status || "new",
      source: lead.source || "whatsapp",
      lead_source_detail: lead.lead_source_detail || "",
      assigned_to: lead.assigned_to || "",
      tags: Array.isArray(lead.tags) ? lead.tags : [],
      checklist: Array.isArray(lead.checklist) ? lead.checklist : DEFAULT_CHECKLIST_TEMPLATE,
      pax_list: existingPaxList,
      payment_plan: {
        flight_cents: savedPaymentPlan.flight_cents ?? Math.round(estTotal * 0.45),
        hotel_cents: savedPaymentPlan.hotel_cents ?? Math.round(estTotal * 0.4),
        insurance_cents: savedPaymentPlan.insurance_cents ?? Math.round(estTotal * 0.05),
        boarding_tax_cents: savedPaymentPlan.boarding_tax_cents ?? Math.round(estTotal * 0.1),
        commission_cents: savedPaymentPlan.commission_cents ?? Math.round(estTotal * 0.12),
        method: savedPaymentPlan.method || "credit_card",
        installments: savedPaymentPlan.installments || 10,
        notes: savedPaymentPlan.notes || "Entrada via PIX + saldo em até 10x sem juros",
      },
      lost_reason: lead.lost_reason || "",
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
      return true;
    });
  }, [leads, search, ownerFilter, sourceFilter]);

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
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── Barra Superior Canônica ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3 min-w-0">
          <span className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Compass className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground truncate">
                Turismo & Viagens
              </h1>
              <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                {pipelineMetrics.totalLeads} oportunidades
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cockpit comercial unificado: Atendimento, montagem de propostas e viagens confirmadas
            </p>
          </div>
        </div>

        {/* Ações Primárias */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="h-11 min-h-11 px-3 text-xs font-medium gap-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Upload className="size-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Importar Leads</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDashboardOpen(true)}
            className="h-11 min-h-11 px-3 text-xs font-medium gap-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <TrendingUp className="size-3.5 text-primary" />
            <span>Métricas</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setProposalLead({
                id: "",
                fullName: "",
                destination: "",
                passenger_count: 2,
              })
            }
            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <FileText className="size-3.5 text-primary" />
            <span>Nova Proposta</span>
          </Button>

          <Button
            type="button"
            onClick={() => {
              setNewLeadTargetStage("new");
              setIsNewLeadOpen(true);
            }}
            className="h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Nova Oportunidade</span>
          </Button>
        </div>
      </div>

      {/* ── Barra Pipefy: Visões do Funil Separadas dos Módulos Secundários ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-b border-border/40 pb-3">
          {/* Visões Principais do Pipe (Kanban | Painel Geral | Propostas | Viagens) */}
          <div className="tab-list flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveViewTab("kanban")}
              className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeViewTab === "kanban"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Kanban className="size-3.5" />
              <span>Kanban ({filteredLeads.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab("dashboard")}
              className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeViewTab === "dashboard"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Compass className="size-3.5" />
              <span>Painel & Alertas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab("propostas")}
              className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeViewTab === "propostas"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <FileText className="size-3.5" />
              <span>Propostas ({proposals.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab("viagens")}
              className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeViewTab === "viagens"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Plane className="size-3.5" />
              <span>Viagens ({trips.length})</span>
            </button>
          </div>

          {/* Módulos Secundários e Especializados Separados do Kanban */}
          <div className="tab-list flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-2xs font-mono uppercase text-muted-foreground px-2 shrink-0">
              Módulos:
            </span>
            <button
              type="button"
              onClick={() => router.navigate({ to: "/workspace/turismo/oportunidades" })}
              className="h-11 min-h-11 px-3 text-xs font-medium rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <TrendingUp className="size-3.5 text-primary" />
              <span>Oportunidades</span>
            </button>

            <button
              type="button"
              onClick={() => router.navigate({ to: "/workspace/turismo/cotacoes" })}
              className="h-11 min-h-11 px-3 text-xs font-medium rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plane className="size-3.5 text-muted-foreground" />
              <span>Cotações</span>
            </button>

            <button
              type="button"
              onClick={() => router.navigate({ to: "/workspace/turismo/embarques" })}
              className="h-11 min-h-11 px-3 text-xs font-medium rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Calendar className="size-3.5 text-muted-foreground" />
              <span>Embarques</span>
            </button>

            <button
              type="button"
              onClick={() => router.navigate({ to: "/workspace/turismo/corporativo" })}
              className="h-11 min-h-11 px-3 text-xs font-medium rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Building2 className="size-3.5 text-muted-foreground" />
              <span>Empresas B2B</span>
            </button>

            <button
              type="button"
              onClick={() => router.navigate({ to: "/workspace/turismo/fornecedores" })}
              className="h-11 min-h-11 px-3 text-xs font-medium rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShieldCheck className="size-3.5 text-muted-foreground" />
              <span>Operadoras</span>
            </button>

            <button
              type="button"
              onClick={() => router.navigate({ to: "/workspace/turismo/comissoes" })}
              className="h-11 min-h-11 px-3 text-xs font-medium rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <DollarSign className="size-3.5 text-muted-foreground" />
              <span>Comissões</span>
            </button>
          </div>
        </div>

        {/* Controles de Filtro & Busca do Pipe */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="h-11 min-h-11 text-xs rounded-lg w-40 focus-visible:ring-2 focus-visible:ring-ring">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Responsáveis</SelectItem>
                {team.map((m: any) => (
                  <SelectItem key={m.profile_id || m.id} value={m.profile_id || m.id}>
                    {m.full_name || m.name || "Membro"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-11 min-h-11 text-xs rounded-lg w-36 focus-visible:ring-2 focus-visible:ring-ring">
                <SelectValue placeholder="Origens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsCustomizerOpen(true)}
              className="h-11 w-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              title="Personalizar Colunas do Funil"
            >
              <SlidersHorizontal className="size-4" />
            </Button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-72">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, destino, voo..."
              className="h-11 min-h-11 pl-9 text-xs rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO DA VISÃO ATIVA ── */}

      {/* 0. PAINEL EXECUTIVO DO PROPRIETÁRIO / GERENTE (DASHBOARD GERAL) */}
      {activeViewTab === "dashboard" && (
        <div className="space-y-6">
          {/* Grade Superior de KPIs (Estilo PassHub / Linear Minimalista) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Voos no Dia</span>
                <Plane className="size-3.5 text-primary" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {todayDepartures.length}
              </div>
              <p className="text-xs text-muted-foreground">Partidas programadas hoje</p>
            </div>

            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Viajantes em Viagem</span>
                <Luggage className="size-3.5 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {activeInTransit.length}
              </div>
              <p className="text-xs text-muted-foreground">Passageiros no destino</p>
            </div>

            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Embarques Próximos</span>
                <Calendar className="size-3.5 text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {upcomingWeekDepartures.length}
              </div>
              <p className="text-xs text-muted-foreground">Nos próximos 7 dias</p>
            </div>

            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Atenção Check-in</span>
                <AlertTriangle className="size-3.5 text-amber-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {documentationAlerts.length}
              </div>
              <p className="text-xs text-muted-foreground">Pendências críticas</p>
            </div>

            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Recebíveis da Semana</span>
                <DollarSign className="size-3.5 text-primary" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-primary truncate">
                {formatMoney(totalPendingReceivablesCents)}
              </div>
              <p className="text-xs text-muted-foreground">Comissões a faturar</p>
            </div>
          </div>

          {/* Duas Colunas Operacionais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Coluna 1: Voos do Dia & Próximas 48h */}
            <div className="space-y-4">
              {/* Voos no Dia */}
              <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
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

      {/* 1. FUNIL DE VENDAS (KANBAN COM LEADCARD CANÔNICO) */}
      {activeViewTab === "kanban" && (
        /* design-lint-ignore DL-27 reason:"Trilho horizontal canonico com rolagem suave para colunas do funil de atendimento" expiry:"2027-12-31" */
        /* design-lint-ignore DL-30 reason:"Trilho horizontal canonico com rolagem suave para colunas do funil de atendimento" expiry:"2027-12-31" */
        <div className="flex gap-4 overflow-x-auto pb-8 pt-1 items-start snap-x snap-mandatory scroll-smooth w-full no-scrollbar select-none waesy-kanban-strip">
          {TOURISM_STAGES.map((stage, stageIndex) => {
            const stageLeads = leadsByStage[stage.id] || [];
            const stageTotalCents = stageLeads.reduce(
              (sum: number, l: any) => sum + (l.estimated_value_cents || 0),
              0
            );
            const prevStage = stageIndex > 0 ? TOURISM_STAGES[stageIndex - 1] : null;
            const nextStage = stageIndex < TOURISM_STAGES.length - 1 ? TOURISM_STAGES[stageIndex + 1] : null;

            return (
              <div
                key={stage.id}
                className="flex-none w-80 snap-start bg-card/90 border border-border/60 rounded-xl flex flex-col shadow-xs min-h-96 h-144 overflow-hidden"
              >
                {/* Cabeçalho da Coluna com Somatório e Ação Rápida */}
                <div className="p-3 border-b border-border/50 bg-muted/30 rounded-t-xl flex items-center justify-between shrink-0 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("size-2 rounded-full shrink-0", stage.dotColor)} />
                    <span className="text-xs font-bold text-foreground truncate" title={stage.title}>{stage.title}</span>
                    <Badge variant="outline" className="text-2xs font-mono px-2 h-5 shrink-0 bg-background/50">
                      {stageLeads.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {stageTotalCents > 0 && (
                      <span className="text-2xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
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
                      className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      title={`Novo lead em ${stage.title}`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Cards da Coluna via LeadCard Canônico */}
                <div className="p-2 space-y-2 overflow-y-auto flex-1 [scrollbar-width:thin] min-h-64">
                  {stageLeads.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/50 rounded-xl space-y-3 bg-muted/10 my-auto">
                      <div className="size-8 rounded-full bg-muted/40 flex items-center justify-center mx-auto text-muted-foreground/60">
                        <Users className="size-4" />
                      </div>
                      <p className="font-medium text-2xs">Nenhum contato nesta etapa</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewLeadTargetStage(stage.id);
                          setIsNewLeadOpen(true);
                        }}
                        /* design-lint-ignore DL-14 reason:"Botao de acao secundaria compacta no interior de card vazio" expiry:"2027-12-31" */
                        className="h-9 px-3 text-2xs font-semibold gap-2 mx-auto cursor-pointer focus-visible:ring-2 focus-visible:ring-ring hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                      >
                        <Plus className="size-3" />
                        <span>Adicionar Lead</span>
                      </Button>
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
                          });
                        }}
                        onCalculateCommission={setCalculatorLead}
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
                  className="p-4 rounded-lg border border-border/60 bg-card hover:border-primary/50 transition-colors block text-xs space-y-3"
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
                    <span className="font-mono font-bold text-foreground">
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
                  className="p-4 rounded-lg border border-border/60 bg-card space-y-3 text-xs"
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
                    <span className="font-mono font-bold text-primary">
                      {formatMoney(prop.pricing?.total_price_cents || 0)}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleConvertProposalToTrip(prop.id)}
                        className="h-11 min-h-11 px-3 text-xs font-semibold gap-1.5 text-emerald-600 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Gerar Viagem</span>
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
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

      {/* ── DRAWER DO LEAD (PADRÃO PIPEFY LEXCORP 3 COLUNAS + 9 ABAS) ── */}
      {selectedLead && (
        <Sheet open={Boolean(selectedLead)} onOpenChange={() => setSelectedLead(null)}>
          <SheetContent side="right" className="w-full sm:max-w-5xl p-4 sm:p-6 overflow-y-auto space-y-4 no-scrollbar">
            <SheetHeader className="border-b border-border/40 pb-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-lg font-bold text-foreground">
                      {editLeadForm.name || selectedLead.full_name || "Oportunidade Comercial"}
                    </SheetTitle>
                    <Badge variant="outline" className="font-mono text-xs">
                      Fase atual: {TOURISM_STAGES.find((s) => s.id === (editLeadForm.status || selectedLead.status))?.title || (editLeadForm.status || selectedLead.status)}
                    </Badge>
                  </div>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Ficha 360° Pipefy: Formulário Inicial fixo à esquerda, Fase & Módulos ao centro e Transição de Fase à direita
                  </SheetDescription>
                </div>

                {/* Metadados Rápidos estilo Pipefy (Responsável, Datas, Valor) */}
                <div className="flex items-center gap-2 flex-wrap text-2xs">
                  <Badge variant="secondary" className="font-mono">
                    {editLeadForm.destination || "Destino a definir"}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-emerald-600 border-emerald-500/30">
                    {formatMoney(editLeadForm.estimated_value_cents || 0)}
                  </Badge>
                </div>
              </div>

              {/* Barra de Pílulas Pipefy (9 Abas Preservadas e Incrementadas) */}
              <div className="tab-list flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar">
                {[
                  { id: "viagem", label: "Visão Geral & Cotações" },
                  { id: "onboarding", label: "Pastas de Viajantes" },
                  { id: "checklist", label: "Checklists" },
                  { id: "contratos", label: "Contratos (5 Etapas)" },
                  { id: "pagamento", label: "Pagamento" },
                  { id: "reuniao", label: "Reuniões" },
                  { id: "anamnese", label: "Anamnese" },
                  { id: "cliente360", label: "Cliente 360°" },
                  { id: "lgpd", label: "LGPD" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setLeadDrawerTab(t.id as any)}
                    className={`h-11 min-h-11 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      leadDrawerTab === t.id
                        ? "bg-primary text-primary-foreground border-primary font-bold"
                        : "bg-card border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </SheetHeader>

            {/* Layout Pipefy LexCorp em 3 Colunas no Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* COLUNA ESQUERDA (FIXA): Formulário Inicial & Histórico de Fases */}
              <div className="lg:col-span-4 p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="font-bold text-foreground">Formulário Inicial</span>
                  <span className="text-2xs font-mono text-muted-foreground">
                    {(editLeadForm.source || selectedLead.source) === "whatsapp" ? "Via WhatsApp" : "Via Formulário Web"}
                  </span>
                </div>

                <div className="space-y-2 text-2xs">
                  <div>
                    <span className="text-muted-foreground block">Contato Principal</span>
                    <span className="font-semibold text-foreground text-xs">{editLeadForm.name || selectedLead.full_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Telefone / WhatsApp</span>
                    <span className="font-mono text-foreground">{editLeadForm.phone || "Não informado"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">E-mail</span>
                    <span className="text-foreground">{editLeadForm.email || "Não informado"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Destino & Período</span>
                    <span className="font-semibold text-foreground">
                      {editLeadForm.destination || "A definir"} · {editLeadForm.interest_period || editLeadForm.travel_start || "Datas flexíveis"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Passageiros</span>
                    <span className="font-mono text-foreground">
                      {editLeadForm.pax_adults || 1} ADT · {editLeadForm.pax_children || 0} CHD · {editLeadForm.pax_infants || 0} INF
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Observações do Lead</span>
                    <p className="text-foreground whitespace-pre-line break-words bg-background p-2 rounded-lg border border-border/40 mt-1">
                      {editLeadForm.notes || "Nenhuma observação inicial registrada."}
                    </p>
                  </div>
                </div>

                {/* Histórico de Fases (Estilo Pipefy LexCorp) */}
                <div className="pt-2 border-t border-border/40 space-y-2">
                  <span className="font-bold text-foreground block">Histórico no Funil</span>
                  <div className="space-y-1">
                    {TOURISM_STAGES.map((st) => {
                      const isCurrent = (editLeadForm.status || selectedLead.status) === st.id;
                      return (
                        <div
                          key={st.id}
                          className={`p-2 rounded-lg border flex items-center justify-between text-2xs ${
                            isCurrent
                              ? "bg-primary/10 border-primary/30 text-primary font-bold"
                              : "bg-background border-border/40 text-muted-foreground"
                          }`}
                        >
                          <span>{st.title}</span>
                          <span className="font-mono">{isCurrent ? "Fase Atual" : "Registrado"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* COLUNA CENTRAL: Conteúdo da Aba Selecionada */}
              <div className="lg:col-span-5 space-y-4">

            {/* 1. ABA VIAGEM & COTAÇÃO COM EDIÇÃO PLENA */}
            {leadDrawerTab === "viagem" && (
              <div className="space-y-4 text-xs">
                {/* Topo Pipefy: Status de Consentimento LGPD + Origem */}
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-foreground block">
                        Consentimento LGPD Ativo
                      </span>
                      <span className="text-2xs text-muted-foreground">
                        Origem verificada: {(editLeadForm.source || selectedLead.source) === "whatsapp" ? "Via WhatsApp" : "Via Formulário Web"}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-2xs font-mono text-emerald-600 border-emerald-500/30">
                    {(editLeadForm.source || selectedLead.source) === "whatsapp" ? "Via WhatsApp" : "Via Formulário Web"}
                  </Badge>
                </div>

                {/* Bloco 1: Contato do Passageiro */}
                <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <Users className="size-3.5 text-primary" />
                    <span>Titular do Atendimento</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Nome Completo</Label>
                      <Input
                        value={editLeadForm.name}
                        onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, name: e.target.value }))}
                        className="h-10 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">WhatsApp / Telefone</Label>
                      <Input
                        value={editLeadForm.phone}
                        onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, phone: e.target.value }))}
                        className="h-10 text-xs rounded-lg font-mono"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-2xs text-muted-foreground font-semibold">E-mail</Label>
                      <Input
                        type="email"
                        value={editLeadForm.email}
                        onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, email: e.target.value }))}
                        className="h-10 text-xs rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloco 2: Especificações da Viagem */}
                <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <MapPin className="size-3.5 text-primary" />
                    <span>Roteiro & Datas</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Destino Principal</Label>
                      <Input
                        value={editLeadForm.destination}
                        onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, destination: e.target.value }))}
                        placeholder="Ex: Paris, Cancún, Maceió"
                        className="h-10 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Período Flexível</Label>
                      <Input
                        value={editLeadForm.interest_period}
                        onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, interest_period: e.target.value }))}
                        placeholder="Ex: Julho/2026, Réveillon"
                        className="h-10 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Data Ida Estimada</Label>
                      <Input
                        type="date"
                        value={editLeadForm.travel_start}
                        onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, travel_start: e.target.value }))}
                        className="h-10 text-xs rounded-lg font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Data Volta Estimada</Label>
                      <Input
                        type="date"
                        value={editLeadForm.travel_end}
                        onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, travel_end: e.target.value }))}
                        className="h-10 text-xs rounded-lg font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Tipo de Pacote / Interesse</Label>
                      <Select
                        value={editLeadForm.interest_type || "package_flight"}
                        onValueChange={(val) => setEditLeadForm((prev: any) => ({ ...prev, interest_type: val }))}
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
                        value={editLeadForm.estimated_value_cents}
                        onChange={(val: any) => setEditLeadForm((prev: any) => ({ ...prev, estimated_value_cents: val || 0 }))}
                        className="h-10 text-xs rounded-lg font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloco 3: Passageiros Estruturados */}
                <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <Plane className="size-3.5 text-primary" />
                    <span>Composição de Passageiros</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Adultos (ADT)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={editLeadForm.pax_adults}
                        onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, pax_adults: parseInt(e.target.value) || 1 }))}
                        className="h-10 text-xs rounded-lg font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Crianças (2-11)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={editLeadForm.pax_children}
                        onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, pax_children: parseInt(e.target.value) || 0 }))}
                        className="h-10 text-xs rounded-lg font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Bebês (0-2)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={editLeadForm.pax_infants}
                        onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, pax_infants: parseInt(e.target.value) || 0 }))}
                        className="h-10 text-xs rounded-lg font-mono text-center"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Idades das Crianças (separadas por vírgula)</Label>
                    <Input
                      value={editLeadForm.pax_ages_str}
                      onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, pax_ages_str: e.target.value }))}
                      placeholder="Ex: 4, 8"
                      className="h-10 text-xs rounded-lg font-mono"
                    />
                  </div>
                </div>

                {/* Bloco 4: Consultor, Origem & Tags */}
                <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Consultor Responsável</Label>
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
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Canal / Origem</Label>
                      <Select
                        value={editLeadForm.source || "whatsapp"}
                        onValueChange={(val) => setEditLeadForm((prev: any) => ({ ...prev, source: val }))}
                      >
                        <SelectTrigger className="h-10 text-xs rounded-lg">
                          <SelectValue placeholder="Origem..." />
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

                  {/* Tags Populares */}
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Tags Rápidas</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {POPULAR_TAGS.map((t) => {
                        const hasTag = (editLeadForm.tags || []).includes(t.name);
                        return (
                          <button
                            key={t.name}
                            type="button"
                            onClick={() => {
                              const cur = editLeadForm.tags || [];
                              const updated = hasTag ? cur.filter((x: string) => x !== t.name) : [...cur, t.name];
                              setEditLeadForm((prev: any) => ({ ...prev, tags: updated }));
                            }}
                            /* design-lint-ignore DL-14 reason:"Chip secundario de tag em formulario denso" expiry:"2027-12-31" */
                            className={`px-3 py-1 rounded-md text-2xs font-semibold border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring ${
                              hasTag
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border/60 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Anotações */}
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Anotações da Abordagem</Label>
                    <Textarea
                      rows={3}
                      value={editLeadForm.notes}
                      onChange={(e) => setEditLeadForm((prev: any) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Desejos específicos, hotel preferido, restrições..."
                      className="text-xs rounded-lg"
                    />
                  </div>
                </div>

                {/* Botão de Salvar Alterações */}
                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    disabled={isUpdatingLead}
                    onClick={handleSaveLeadDetails}
                    className="h-11 min-h-11 px-6 text-xs font-bold bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isUpdatingLead ? "Salvando..." : "Salvar Alterações da Ficha"}
                  </Button>
                </div>

                {/* Bloco 5: Múltiplas Propostas & Cenários vinculados a este Lead */}
                {(() => {
                  const leadProposals = proposals.filter(
                    (p: any) =>
                      p.lead_id === selectedLead.id ||
                      p.quote_id === selectedLead.id ||
                      (selectedLead.full_name &&
                        p.customer_name &&
                        p.customer_name.toLowerCase() === selectedLead.full_name.toLowerCase()),
                  );
                  return (
                    <div className="p-4 rounded-lg bg-card border border-border/60 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-bold text-foreground flex items-center gap-2">
                          <FileText className="size-3.5 text-primary" />
                          <span>Propostas & Cenários Enviados ({leadProposals.length})</span>
                        </h4>
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
                                  toast.success(`Link Único Multi-Opções (${res.optionsCount} abas) copiado!`);
                                } catch (err: any) {
                                  toast.error(err?.message || "Erro ao unificar propostas em link único.");
                                } finally {
                                  setIsBundlingProposals(false);
                                }
                              }}
                              className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 text-primary border-primary/30 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <Copy className="size-3.5" />
                              <span>{isBundlingProposals ? "Unificando..." : "Gerar Link Único Multi-Opções"}</span>
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const leadData = {
                                id: selectedLead.id,
                                fullName: editLeadForm.name || selectedLead.full_name,
                                phone: editLeadForm.phone || selectedLead.phone,
                                email: editLeadForm.email || selectedLead.email,
                                destination: editLeadForm.destination || selectedLead.destination,
                                estimated_value_cents:
                                  editLeadForm.estimated_value_cents || selectedLead.estimated_value_cents,
                                passenger_count:
                                  (editLeadForm.pax_adults || 2) + (editLeadForm.pax_children || 0),
                              };
                              setProposalLead(leadData);
                            }}
                            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Plus className="size-3.5" />
                            <span>Nova Proposta</span>
                          </Button>
                        </div>
                      </div>

                      {leadProposals.length === 0 ? (
                        <p className="text-2xs text-muted-foreground">
                          Nenhuma proposta gerada ainda. Você pode criar e enviar quantos cenários de proposta forem necessários para este atendimento.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {leadProposals.map((lp: any, idx: number) => (
                            <div
                              key={lp.id}
                              className="p-3 rounded-lg border border-border/50 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-2xs font-mono">
                                    Cenário #{idx + 1}
                                  </Badge>
                                  <span className="font-bold text-foreground truncate">
                                    {lp.title || lp.destination_city || "Proposta"}
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
                                  className="h-11 min-h-11 px-3 text-xs font-semibold gap-1 text-emerald-600 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <CheckCircle2 className="size-3.5" />
                                  <span>Confirmar Viagem</span>
                                </Button>
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-11 min-h-11 px-3 text-xs font-semibold gap-1 focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <Link to="/workspace/turismo/propostas/$id" params={{ id: lp.id }}>
                                    <Eye className="size-3.5" />
                                    <span>Studio</span>
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 2. ABA CLIENTE 360° */}
            {leadDrawerTab === "cliente360" && (
              <div className="space-y-4 text-xs">
                {isLoading360 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Carregando dossiê 360° do cliente...
                  </div>
                ) : customer360Data?.customer ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg border border-border/60 bg-card space-y-2">
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
                      <div className="p-4 rounded-lg border border-border/60 bg-card space-y-2">
                        <span className="font-bold text-foreground block">Viagens Confirmadas & Histórico</span>
                        {customer360Data.trips.map((tr: any) => (
                          <div
                            key={tr.id}
                            className="p-3 rounded-lg border border-border/40 bg-muted/20 flex items-center justify-between gap-2"
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
                      <div className="p-4 rounded-lg border border-border/60 bg-card space-y-2">
                        <span className="font-bold text-foreground block">Tickets de Suporte / SOS Viagem</span>
                        {customer360Data.incidents.map((inc: any) => (
                          <div
                            key={inc.id}
                            className="p-3 rounded-lg border border-border/40 bg-muted/20 flex items-center justify-between gap-2"
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
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileSignature className="size-4 text-primary" />
                    <span className="font-bold text-foreground">Emitir Novo Contrato Digital</span>
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
                    className="w-full h-11 min-h-11 text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isIssuingContract ? "Gerando Contrato..." : "Gerar Contrato com Assinatura Digital"}
                  </Button>
                </div>

                {/* Lista de Contratos Existentes + Stepper Visual de 5 Etapas */}
                {customer360Data?.contracts && customer360Data.contracts.length > 0 && (
                  <div className="space-y-3">
                    <span className="font-bold text-foreground block">Contratos Emitidos & Rastreio de Assinatura</span>
                    {customer360Data.contracts.map((c: any) => {
                      const isSigned = c.status === "signed" || Boolean(c.signed_at);
                      const isViewed = isSigned || c.status === "viewed";
                      const isOpened = isViewed || c.status === "opened" || c.status === "sent";
                      const steps = [
                        { step: 1, label: "Minuta Gerada", done: true },
                        { step: 2, label: "Link Enviado", done: true },
                        { step: 3, label: "Link Aberto", done: isOpened },
                        { step: 4, label: "Visualizado", done: isViewed },
                        { step: 5, label: "Assinado", done: isSigned },
                      ];
                      return (
                        <div
                          key={c.id}
                          className="p-3 rounded-lg border border-border/60 bg-card space-y-3 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-foreground block">
                                {c.contract_title || c.title || "Contrato Digital"}
                              </span>
                              <span className="text-2xs text-muted-foreground font-mono">
                                {formatMoney(c.total_value_cents || c.total_amount_cents || 0)} • Status: {isSigned ? "Assinado Digitalmente" : c.status}
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

                          {/* Stepper de 5 Etapas */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                            {steps.map((st) => (
                              <div
                                key={st.step}
                                className={`p-2 rounded-md border text-center space-y-1 ${
                                  st.done
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                                    : "bg-muted/30 border-border/40 text-muted-foreground"
                                }`}
                              >
                                <div className="font-mono text-3xs font-bold">{st.step}.</div>
                                <div className="text-3xs font-semibold leading-tight">{st.label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Metadados Forenses de Assinatura */}
                          <div className="p-2 rounded-md bg-muted/30 border border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-2 text-2xs font-mono text-muted-foreground">
                            <div>IP: {c.signer_ip || "Rastreio ativo"}</div>
                            <div className="truncate">Hash SHA-256: {c.public_token || c.id.slice(0, 12)}</div>
                            <div>
                              Carimbo: {c.signed_at ? new Date(c.signed_at).toLocaleString("pt-BR") : "Aguardando assinatura"}
                            </div>
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
              <div className="space-y-4 text-xs">
                {/* Envio de Ficha Rápida ao Passageiro */}
                <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="size-4 text-emerald-600" />
                    <span className="font-bold text-foreground">Coleta Autônoma de Dados do Passageiro</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Envie o formulário de anamnese para o WhatsApp do viajante. Ele preenche os dados cadastrais, preferências de voo, quartos e documentos de forma 100% autônoma.
                  </p>

                  {/* Seletor de Formulário de Onboarding */}
                  {onboardingFormsData?.availableForms && onboardingFormsData.availableForms.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Modelo de Ficha de Onboarding</Label>
                      <Select
                        value={selectedOnboardingFormSlug || activeOnboardingForm?.slug || ""}
                        onValueChange={setSelectedOnboardingFormSlug}
                      >
                        <SelectTrigger className="h-10 text-xs rounded-lg">
                          <SelectValue placeholder="Selecione o modelo de ficha..." />
                        </SelectTrigger>
                        <SelectContent>
                          {onboardingFormsData.availableForms.map((f: any) => (
                            <SelectItem key={f.slug} value={f.slug}>
                              {f.title || f.slug}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={handleSendOnboardingFormWhatsApp}
                      className="h-11 min-h-11 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MessageSquare className="size-3.5" />
                      <span>Enviar via WhatsApp (1 Clique)</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopyOnboardingFormLink}
                      className="h-11 min-h-11 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Copy className="size-3.5" />
                      <span>Copiar Link da Ficha</span>
                    </Button>
                  </div>
                </div>

                {/* Magic Link Autônomo */}
                <div className="p-4 rounded-lg bg-card border border-border/60 space-y-2">
                  <span className="font-bold text-foreground block">Link Mágico Autônomo do Viajante</span>
                  <p className="text-2xs text-muted-foreground">
                    Link exclusivo que permite ao cliente acompanhar o status da proposta e atualizar documentos dos passageiros sem precisar de login.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyMagicLink}
                    className="h-11 min-h-11 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>Copiar Link Mágico do Lead</span>
                  </Button>
                </div>

                {/* Pastas Hierárquicas por Passageiro (Documentação & Passaportes) */}
                <div className="p-4 rounded-lg bg-card border border-border/60 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-foreground block">Pastas Documentais por Passageiro</span>
                      <span className="text-2xs text-muted-foreground">
                        RG, CPF, Passaporte e controle automático de validade (alerta de 6 meses antes do embarque)
                      </span>
                    </div>
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
                      className="h-11 min-h-11 px-3 text-xs font-semibold gap-1"
                    >
                      <Plus className="size-3.5" />
                      <span>Nova Pasta</span>
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
                        <div key={pax.id || idx} className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-2">
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
                      className="h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground"
                    >
                      {isUpdatingLead ? "Salvando Pastas..." : "Salvar Pastas de Passageiros"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. ABA CHECKLIST OPERACIONAL */}
            {leadDrawerTab === "checklist" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <span className="font-bold text-foreground block">Etapas de Qualificação & Checklist</span>
                  {(editLeadForm.checklist || []).map((item: any) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleChecklist(item.id)}
                      className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring ${
                        item.done
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                          : "bg-card border-border/60 text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {item.done ? (
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="size-4 text-muted-foreground shrink-0" />
                        )}
                        <span className={`text-xs ${item.done ? "line-through opacity-80" : "font-medium"}`}>
                          {item.text}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-2xs font-mono">
                        {item.done ? "Concluído" : "Pendente"}
                      </Badge>
                    </button>
                  ))}
                </div>

                {/* Adicionar Item ao Checklist */}
                <div className="flex items-center gap-2 pt-2">
                  <Input
                    value={newChecklistItemText}
                    onChange={(e) => setNewChecklistItemText(e.target.value)}
                    placeholder="Adicionar tarefa específica para este cliente..."
                    className="h-11 text-xs rounded-lg flex-1"
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
                    className="h-11 min-h-11 px-3 text-xs font-semibold shrink-0"
                  >
                    <Plus className="size-3.5 mr-1" />
                    <span>Adicionar</span>
                  </Button>
                </div>
              </div>
            )}

            {/* 6. ABA ANAMNESE & PREFERÊNCIAS */}
            {leadDrawerTab === "anamnese" && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-foreground block mb-1">Estilo de Viagem</span>
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
                                : "border-border/60 bg-background text-foreground hover:bg-muted/40"
                            }`}
                          >
                            {style}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-foreground block mb-1">Preferência de Hospedagem</span>
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
                                : "border-border/60 bg-background text-foreground hover:bg-muted/40"
                            }`}
                          >
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-foreground block mb-1">Preferência de Voo & Bagagem</span>
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
                                : "border-border/60 bg-background text-foreground hover:bg-muted/40"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. ABA REUNIÃO */}
            {leadDrawerTab === "reuniao" && (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-lg border border-border/40 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">Agendar Reunião ou Alinhamento com Cliente</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyMagicLink}
                      className="h-11 min-h-11 px-3 text-2xs font-semibold gap-1"
                    >
                      <Copy className="size-3" />
                      <span>Link Mágico de Confirmação</span>
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-2xs font-semibold text-muted-foreground block">Assunto da Reunião</label>
                    <Input
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      placeholder="Ex: Apresentação da Cotação Orlando / Réveillon"
                      className="h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-2xs font-semibold text-muted-foreground block">Pauta / Objetivo da Reunião</label>
                    <Textarea
                      rows={2}
                      value={meetingObjective}
                      onChange={(e) => setMeetingObjective(e.target.value)}
                      placeholder="Ex: Comparar opções de resorts, definir configuração de quartos e parcelamento..."
                      className="rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-2xs font-semibold text-muted-foreground block">Data e Horário</label>
                      <Input
                        type="datetime-local"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        className="h-11 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-2xs font-semibold text-muted-foreground block">Tipo de Encontro</label>
                      <select
                        value={meetingType}
                        onChange={(e) => setMeetingType(e.target.value as any)}
                        className="w-full h-11 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="call">Ligação Telefônica / WhatsApp</option>
                        <option value="video">Videoconferência (Google Meet / Zoom)</option>
                        <option value="in_person">Presencial na Agência</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-2xs font-semibold text-muted-foreground block">Link da Sala (Google Meet ou Zoom)</label>
                    <Input
                      value={meetingRoomUrl}
                      onChange={(e) => setMeetingRoomUrl(e.target.value)}
                      placeholder="https://meet.google.com/... ou https://zoom.us/j/..."
                      className="h-11 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      disabled={isSavingMeeting || !meetingTitle.trim() || !meetingDate}
                      onClick={async () => {
                        setIsSavingMeeting(true);
                        try {
                          const composedDescription = [
                            meetingObjective.trim(),
                            meetingRoomUrl.trim() ? `Sala Virtual: ${meetingRoomUrl.trim()}` : "",
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
                          toast.success("Reunião agendada com sucesso!");
                          setMeetingTitle("");
                          setMeetingObjective("");
                          setMeetingRoomUrl("");
                          setMeetingDate("");
                          refetchLeads();
                          getCustomer360Profile({ data: { leadId: selectedLead.id } })
                            .then((r) => setCustomer360Data(r))
                            .catch(() => null);
                        } catch (err: any) {
                          toast.error(err?.message || "Erro ao agendar reunião.");
                        } finally {
                          setIsSavingMeeting(false);
                        }
                      }}
                      className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer"
                    >
                      {isSavingMeeting ? "Agendando..." : "Confirmar Agendamento"}
                    </Button>
                  </div>
                </div>

                {/* Lista de Reuniões Agendadas */}
                {Array.isArray(customer360Data?.meetings) && customer360Data.meetings.length > 0 && (
                  <div className="p-4 rounded-lg border border-border/60 bg-card space-y-2">
                    <span className="font-bold text-foreground block">Reuniões Programadas ({customer360Data.meetings.length})</span>
                    {customer360Data.meetings.map((m: any) => (
                      <div key={m.id} className="p-3 rounded-lg border border-border/40 bg-muted/20 flex items-center justify-between gap-2">
                        <div className="space-y-1">
                          <span className="font-bold text-foreground block">{m.title}</span>
                          {m.description && (
                            <span className="text-2xs text-muted-foreground block">{m.description}</span>
                          )}
                          <span className="text-2xs font-mono text-primary block">
                            {new Date(m.scheduled_at).toLocaleString("pt-BR")} · {m.meeting_type}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-2xs font-mono">
                          Agendada
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 8. ABA LGPD */}
            {leadDrawerTab === "lgpd" && (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-lg border border-border/40 bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    <span className="text-xs font-bold text-foreground">Governança LGPD (Lei 13.709/2018)</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Consentimento de coleta e tratamento de dados cadastrais, emissão de bilhetes e compartilhamento estritamente necessário com companhias aéreas, hotéis e operadoras parceiras.
                  </p>
                  <div className="p-3 rounded bg-background border border-border/50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Termo de Consentimento</span>
                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 font-mono">
                      Consentido / Ativo
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* 9. ABA PLANEJAMENTO DE PAGAMENTO */}
            {leadDrawerTab === "pagamento" && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-lg border border-border/50 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="size-4 text-primary" />
                      <span className="font-bold text-foreground">Decomposição Tarifária & Custos Planejados</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      Total: {formatMoney(editLeadForm.estimated_value_cents || 0)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold"> Aéreo / Passagens (R$)</Label>
                      <CurrencyField
                        value={editLeadForm.payment_plan?.flight_cents || 0}
                        onChange={(val: any) =>
                          setEditLeadForm((prev: any) => ({
                            ...prev,
                            payment_plan: { ...prev.payment_plan, flight_cents: val || 0 },
                          }))
                        }
                        className="h-10 text-xs rounded-lg font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Hotelaria / Resort (R$)</Label>
                      <CurrencyField
                        value={editLeadForm.payment_plan?.hotel_cents || 0}
                        onChange={(val: any) =>
                          setEditLeadForm((prev: any) => ({
                            ...prev,
                            payment_plan: { ...prev.payment_plan, hotel_cents: val || 0 },
                          }))
                        }
                        className="h-10 text-xs rounded-lg font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Seguro Viagem & Assistência (R$)</Label>
                      <CurrencyField
                        value={editLeadForm.payment_plan?.insurance_cents || 0}
                        onChange={(val: any) =>
                          setEditLeadForm((prev: any) => ({
                            ...prev,
                            payment_plan: { ...prev.payment_plan, insurance_cents: val || 0 },
                          }))
                        }
                        className="h-10 text-xs rounded-lg font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs text-muted-foreground font-semibold">Taxas de Embarque (R$)</Label>
                      <CurrencyField
                        value={editLeadForm.payment_plan?.boarding_tax_cents || 0}
                        onChange={(val: any) =>
                          setEditLeadForm((prev: any) => ({
                            ...prev,
                            payment_plan: { ...prev.payment_plan, boarding_tax_cents: val || 0 },
                          }))
                        }
                        className="h-10 text-xs rounded-lg font-mono"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-2xs text-muted-foreground font-semibold">Comissão / Markup da Agência (R$)</Label>
                      <CurrencyField
                        value={editLeadForm.payment_plan?.commission_cents || 0}
                        onChange={(val: any) =>
                          setEditLeadForm((prev: any) => ({
                            ...prev,
                            payment_plan: { ...prev.payment_plan, commission_cents: val || 0 },
                          }))
                        }
                        className="h-10 text-xs rounded-lg font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Modalidade de Pagamento Planejada */}
                <div className="p-4 rounded-lg border border-border/60 bg-card space-y-3">
                  <span className="font-bold text-foreground block">Modalidade de Pagamento Planejada</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: "pix_cash", label: "PIX à Vista (Desconto)" },
                      { id: "credit_card", label: "Cartão em até 10x" },
                      { id: "operator_boleto", label: "Boleto Faturado Operadora" },
                    ].map((m) => {
                      const active = editLeadForm.payment_plan?.method === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            setEditLeadForm((prev: any) => ({
                              ...prev,
                              payment_plan: { ...prev.payment_plan, method: m.id },
                            }))
                          }
                          className={`h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring ${
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/60 bg-muted/20 text-foreground hover:bg-muted/40"
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground font-semibold">Condições e Observações do Plano Financeiro</Label>
                    <Input
                      value={editLeadForm.payment_plan?.notes || ""}
                      onChange={(e) =>
                        setEditLeadForm((prev: any) => ({
                          ...prev,
                          payment_plan: { ...prev.payment_plan, notes: e.target.value },
                        }))
                      }
                      placeholder="Ex: 20% de entrada via PIX + 10x sem juros no cartão..."
                      className="h-10 text-xs rounded-lg"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        const token = selectedLead.magic_token || selectedLead.id;
                        const url = `${window.location.origin}/m/lead/${token}?tab=pagamento`;
                        await navigator.clipboard.writeText(url);
                        toast.success("Link de aprovação do plano de pagamento copiado!");
                      }}
                      className="h-11 min-h-11 px-3 text-xs font-semibold gap-2"
                    >
                      <Copy className="size-3.5" />
                      <span>Copiar Link para Aprovação do Cliente</span>
                    </Button>

                    <Button
                      type="button"
                      disabled={isUpdatingLead}
                      onClick={handleSaveLeadDetails}
                      className="h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground"
                    >
                      {isUpdatingLead ? "Salvando..." : "Salvar Plano de Pagamento"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

              </div>

              {/* COLUNA DIREITA (PADRÃO PIPEFY LEXCORP): Mover para Fase & Ferramentas Rápidas */}
              <div className="lg:col-span-3 p-4 rounded-xl border border-border/60 bg-muted/10 space-y-4 text-xs">
                <div className="space-y-2">
                  <span className="font-bold text-foreground block">Mover para fase</span>
                  <div className="space-y-2">
                    {TOURISM_STAGES.map((st) => {
                      const isCurrent = (editLeadForm.status || selectedLead.status) === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          disabled={isCurrent}
                          onClick={() => handleMoveStage(selectedLead.id, st.id)}
                          className={`w-full h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isCurrent
                              ? "bg-primary/10 border-primary text-primary font-bold cursor-default"
                              : "bg-card border-border/60 text-foreground hover:border-primary/50 hover:bg-muted/40"
                          }`}
                        >
                          <span className="truncate">{st.title}</span>
                          <ArrowRight className="size-3.5 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/40 space-y-2">
                  <span className="font-bold text-foreground block">Ações Operacionais</span>
                  <Button
                    type="button"
                    onClick={() => {
                      const leadData = {
                        id: selectedLead.id,
                        fullName: editLeadForm.name || selectedLead.full_name,
                        phone: editLeadForm.phone || selectedLead.phone,
                        email: editLeadForm.email || selectedLead.email,
                        destination: editLeadForm.destination || selectedLead.destination,
                        estimated_value_cents: editLeadForm.estimated_value_cents || selectedLead.estimated_value_cents,
                        passenger_count: (editLeadForm.pax_adults || 2) + (editLeadForm.pax_children || 0),
                      };
                      setSelectedLead(null);
                      setProposalLead(leadData);
                    }}
                    className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <FileText className="size-4" />
                    <span>Montar Proposta</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFlightLead(selectedLead)}
                    className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                  >
                    <Plane className="size-3.5 text-sky-500" />
                    <span>Malha Aérea & Voos</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCalculatorLead(selectedLead)}
                    className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                  >
                    <Calculator className="size-3.5 text-amber-500" />
                    <span>Simular Markup / Comissão</span>
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* ── MODAL LATERAL DE NOVA OPORTUNIDADE (18 CAMPOS ESTRUTURADOS) ── */}
      <Sheet open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 flex flex-col justify-between overflow-y-auto no-scrollbar">
          <div className="space-y-6">
            <SheetHeader className="p-0 text-left space-y-1 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md">
                  TravelAgências Standard
                </span>
                <span className="text-xs text-muted-foreground">
                  Etapa: {TOURISM_STAGES.find((s) => s.id === newLeadTargetStage)?.title}
                </span>
              </div>
              <SheetTitle className="text-lg font-bold text-foreground">Nova Oportunidade Comercial</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Cadastre viajantes e viagens com todas as especificações de voo, hotel, passageiros e datas.
              </SheetDescription>
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
                <div className="grid grid-cols-3 gap-3">
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
