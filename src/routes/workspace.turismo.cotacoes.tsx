import { Tag, Plane, Compass, ExternalLink, Copy } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TravelIntentCard,
} from "@/design-system/travel";
import { AirplaneTilt, MapPin, CalendarDots, Users, WhatsappLogo, CheckCircle, Clock, CurrencyCircleDollar, SuitcaseSimple, ShieldCheck, ChatCircleDots, FileText, Plus, PencilSimple, Trash, ChartLineUp, Funnel, Buildings, Columns, SquaresFour, CaretRight, CaretLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { listAgencyTravelQuotes, createAgencyTravelQuote, updateAgencyTravelQuote, deleteAgencyTravelQuote, type TravelQuoteRequestDTO } from "@/services/tourism.functions";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import {
  createTravelProposal,
  type FlightSegmentDTO,
  type HotelDTO,
  type TourOptionDTO,
  type TransferDTO,
  type TravelProposalOptionDTO,
} from "@/services/travel-proposal.functions";
import { listDestinations } from "@/services/travel-catalog.functions";
import { PassHubLiveQuoterPanel } from "@/components/tourism/quotes/passhub-live-quoter-panel";
import { getStoreSettings } from "@/services/store.functions";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { UnifiedProposalWorkspace } from "@/components/tourism/unified-proposal-workspace";
import { TravelAiImporterBanner } from "@/components/tourism/promotional-flyer/travel-ai-importer-banner";
import { ingestTravelDocument } from "@/services/travel-canonical-pipeline.functions";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet } from "@/components/workspace/workspace-dashboard-sheet";
import { useConfirm } from "@/hooks/use-confirm";

export const Route = createFileRoute("/workspace/turismo/cotacoes")({
 head: () => ({
 meta: [{ title: "Cotações | Workspace Waesy" }],
 }),
 validateSearch: (search: Record<string, unknown>): {
    leadName?: string;
    leadPhone?: string;
    leadEmail?: string;
    clientId?: string;
  } => ({
    leadName: (search.leadName as string) || undefined,
    leadPhone: (search.leadPhone as string) || undefined,
    leadEmail: (search.leadEmail as string) || undefined,
    clientId: (search.clientId as string) || undefined,
  }),
 loader: async () => {
 try {
 const [quotes, destinations, store] = await Promise.all([
 listAgencyTravelQuotes({ data: { status: "all" } }).catch(() => []),
 listDestinations().catch(() => []),
 getStoreSettings().catch(() => null),
 ]);
 return { quotes, destinations, store };
 } catch {
 return { quotes: [], destinations: [], store: null };
 }
 },
 component: AgencyQuotesPage,
});

const STATUS_FILTERS = [
 { id: "all", label: "Todas" },
 { id: "new", label: "Novas" },
 { id: "analyzing", label: "Em Análise" },
 { id: "quoted", label: "Orçamento Enviado" },
 { id: "won", label: "Ganhas" },
 { id: "lost", label: "Perdidas" },
];

const TRIP_TYPE_OPTIONS = [
 { id: "air_package", label: "Pacote Completo (Voo + Hotel)" },
 { id: "air_only", label: "Somente Aéreo (Wooba / GDS)" },
 { id: "hotel_only", label: "Somente Hospedagem / Resort" },
 { id: "car_rental", label: "Locação de Veículos & Transfers" },
 { id: "corporate_b2b", label: "Corporativo B2B (Faturado / Política)" },
 { id: "cruise", label: "Cruzeiro Marítimo" },
 { id: "bus", label: "Excursão Rodoviária / Ônibus" },
 { id: "visa_assistance", label: "Assessoria de Visto / Passaporte" },
];

function parseQuoteReaisToCents(raw: string): number | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "");
  }
  const num = Number.parseFloat(normalized);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

export default function AgencyQuotesPage() {
 const { quotes: initialQuotes, destinations: initialDestinations, store } = ((Route.useLoaderData?.() as any) || {});
 const searchParams = Route.useSearch();
 const queryClient = useQueryClient();
 const navigate = useNavigate();

 const [selectedStatus, setSelectedStatus] = useState("all");
 const [search, setSearch] = useState("");
 const [tripTypeFilter, setTripTypeFilter] = useState("all");
 const [isDashboardOpen, setIsDashboardOpen] = useState(false);
 const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");
 const [draggingQuoteId, setDraggingQuoteId] = useState<string | null>(null);
 const [dragOverQuoteCol, setDragOverQuoteCol] = useState<string | null>(null);
 const [isOcrLoading, setIsOcrLoading] = useState(false);
 const [ocrProgressText, setOcrProgressText] = useState("Lendo...");

 // Modais
 const [isNewSheetOpen, setIsNewSheetOpen] = useState(Boolean(searchParams?.leadName || searchParams?.clientId));
 const [managingQuote, setManagingQuote] = useState<TravelQuoteRequestDTO | null>(null);
 const { confirm: confirmAction, ConfirmDialog } = useConfirm();

 // Edit State: Gestão de Lead Existente
 const [editStatus, setEditStatus] = useState<"new" | "analyzing" | "quoted" | "won" | "lost">("new");
 const [editAgencyNotes, setEditAgencyNotes] = useState("");
 const [editQuoteAmount, setEditQuoteAmount] = useState("");
 const [isFlightSimulatorOpen, setIsFlightSimulatorOpen] = useState(false);
 const [selectedQuoteSegments, setSelectedQuoteSegments] = useState<{
   flights: FlightSegmentDTO[];
   hotels: HotelDTO[];
   transfers: TransferDTO[];
   tours: TourOptionDTO[];
   includes: string[];
   options: TravelProposalOptionDTO[];
   quoteSessionId: string;
 }>({
   flights: [],
   hotels: [],
   transfers: [],
   tours: [],
   includes: [],
   options: [],
   quoteSessionId: "",
 });

 const { data: quotes } = useQuery({
 queryKey: ["agency-travel-quotes", selectedStatus],
 queryFn: () => listAgencyTravelQuotes({ data: { status: selectedStatus as any, storeId: store?.id } }),
 initialData: initialQuotes,
 });

 const { data: destinations } = useQuery({
 queryKey: ["travel-destinations"],
 queryFn: () => listDestinations(),
 initialData: initialDestinations,
 });

 // Métricas do CRM
 const metrics = useMemo(() => {
 const list: any[] = quotes || [];
 const total = list.length;
 const newCount = list.filter((q: any) => q.status === "new").length;
 const analyzingCount = list.filter((q: any) => q.status === "analyzing").length;
 const quotedCount = list.filter((q: any) => q.status === "quoted").length;
 const wonCount = list.filter((q: any) => q.status === "won").length;
 const conversionRate = total > 0 ? Math.round((wonCount / total) * 100) : 0;
 const totalVolumeCents = list.reduce((acc: number, q: any) => acc + (q.quote_amount_cents || 0), 0);

 return { total, newCount, analyzingCount, quotedCount, wonCount, conversionRate, totalVolumeCents };
 }, [quotes]);

 // Filtro na Lista
 const filteredQuotes = useMemo(() => {
 return (quotes || []).filter((q: any) => {
 if (selectedStatus !== "all" && q.status !== selectedStatus) return false;
 if (tripTypeFilter !== "all" && q.trip_type !== tripTypeFilter) return false;
 if (search.trim()) {
 const s = search.toLowerCase();
 return (
 q.contact_name.toLowerCase().includes(s) ||
 q.destination_city.toLowerCase().includes(s) ||
 q.origin_city.toLowerCase().includes(s) ||
 (q.contact_whatsapp && q.contact_whatsapp.includes(s))
 );
 }
 return true;
 });
 }, [quotes, selectedStatus, tripTypeFilter, search]);

 // Mutações
 const invalidateAllQuoteCaches = () => {
 queryClient.invalidateQueries({ queryKey: ["agency-travel-quotes"] });
 queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
 queryClient.invalidateQueries({ queryKey: ["lead-dossier"] });
 queryClient.invalidateQueries({ queryKey: ["customer-360"] });
 };

 const updateQuoteMutation = useMutation({
 mutationFn: () => {
 if (!managingQuote) throw new Error("Cotação não selecionada.");
 const amountCents = parseQuoteReaisToCents(editQuoteAmount);
 return updateAgencyTravelQuote({
 data: {
 id: managingQuote.id,
 status: editStatus,
 agency_notes: editAgencyNotes,
 quote_amount_cents: amountCents,
 },
 });
 },
 onSuccess: () => {
 toast.success("Lead atualizado com sucesso!");
 invalidateAllQuoteCaches();
 setManagingQuote(null);
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao atualizar lead."),
 });

 const duplicateQuoteMutation = useMutation({
 mutationFn: (q: TravelQuoteRequestDTO) => {
 const rawOccupancies = Array.isArray(q.room_occupancies) ? q.room_occupancies : [];
 const roomOccupancies = rawOccupancies
 .slice(0, 8)
 .map((r: any) => ({
 adults: Math.max(1, Math.min(9, Number(r?.adults ?? 2))),
 childrenAges: Array.isArray(r?.childrenAges)
 ? r.childrenAges.slice(0, 8).map((a: any) => Math.max(0, Math.min(17, Number(a || 0))))
 : Array.isArray(r?.children_ages)
 ? r.children_ages.slice(0, 8).map((a: any) => Math.max(0, Math.min(17, Number(a || 0))))
 : [],
 }));
 return createAgencyTravelQuote({
 data: {
 store_id: store?.id || q.store_id || undefined,
 lead_id: q.lead_id || undefined,
 contact_name: `${(q.contact_name || "Cliente").trim()} (Cópia)`,
 contact_whatsapp: (q.contact_whatsapp || "").trim().length >= 8 ? q.contact_whatsapp.trim() : "000000000",
 contact_email: q.contact_email || null,
 origin_city: q.origin_city || "Chapecó",
 origin_iata: q.origin_iata || null,
 destination_city: (q.destination_city || "").trim().length >= 2 ? q.destination_city.trim() : "A Definir",
 destination_iata: q.destination_iata || null,
 departure_date: q.departure_date || null,
 return_date: q.return_date || null,
 adults_count: Math.max(1, Number(q.adults_count || 2)),
 children_count: Math.max(0, Number(q.children_count || 0)),
 children_ages: Array.isArray(q.children_ages) ? q.children_ages : undefined,
 room_occupancies: roomOccupancies,
 flexible_dates: Boolean(q.flexible_dates),
 rooms_count: Math.max(1, Number(q.rooms_count || 1)),
 trip_type: (q.trip_type || "air_package") as any,
 budget_tier: (q.budget_tier || "standard") as any,
 special_notes: q.special_notes || null,
 agency_notes: q.agency_notes || null,
 source: "workspace",
 quote_amount_cents: typeof q.quote_amount_cents === "number" ? q.quote_amount_cents : null,
 status: "new",
 },
 });
 },
 onSuccess: () => {
 toast.success("Cotação duplicada com sucesso!");
 invalidateAllQuoteCaches();
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao duplicar cotação."),
 });

 const deleteQuoteMutation = useMutation({
 mutationFn: (id: string) => deleteAgencyTravelQuote({ data: { id } }),
 onSuccess: () => {
 toast.success("Cotação removida!");
 invalidateAllQuoteCaches();
 setManagingQuote(null);
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao remover cotação."),
 });

 const createProposalMutation = useMutation({
 mutationFn: (q: TravelQuoteRequestDTO) => {
   const isActiveManaged = managingQuote?.id === q.id;
   const manualCents = isActiveManaged ? parseQuoteReaisToCents(editQuoteAmount) : null;
   const resolvedAmountCents =
     manualCents && manualCents > 0
       ? manualCents
       : q.quote_amount_cents && q.quote_amount_cents > 0
         ? q.quote_amount_cents
         : null;
   const resolvedNotes = [
     q.special_notes,
     isActiveManaged ? editAgencyNotes : q.agency_notes,
   ]
     .filter(Boolean)
     .join("\n");

   return createTravelProposal({
     data: {
       quoteId: q.id,
       leadId: q.lead_id || undefined,
       title: `Proposta: ${q.destination_city} (${q.adults_count} adultos)`,
       clientName: q.contact_name,
       clientWhatsapp: q.contact_whatsapp,
       clientEmail: q.contact_email || undefined,
       destinationCity: q.destination_city,
       travelStartDate: q.departure_date || undefined,
       travelEndDate: q.return_date || undefined,
       adultsCount: q.adults_count,
       childrenCount: q.children_count,
       initialNotes: resolvedNotes || undefined,
       customFields: {
         ...(q.origin_city ? { origin_city: q.origin_city } : {}),
         ...(q.origin_iata ? { origin_iata: q.origin_iata } : {}),
         ...(q.destination_iata ? { destination_iata: q.destination_iata } : {}),
         ...(q.trip_type ? { trip_type: q.trip_type } : {}),
         ...(q.budget_tier ? { budget_tier: q.budget_tier } : {}),
         ...(typeof q.flexible_dates === "boolean" ? { flexible_dates: q.flexible_dates } : {}),
         ...(q.rooms_count ? { rooms_count: q.rooms_count } : {}),
       },
       flights:
         isActiveManaged && selectedQuoteSegments.flights.length > 0
           ? selectedQuoteSegments.flights
           : undefined,
       hotels:
         isActiveManaged && selectedQuoteSegments.hotels.length > 0
           ? selectedQuoteSegments.hotels
           : undefined,
       transfers:
         isActiveManaged && selectedQuoteSegments.transfers.length > 0
           ? selectedQuoteSegments.transfers
           : undefined,
       tours:
         isActiveManaged && selectedQuoteSegments.tours.length > 0
           ? selectedQuoteSegments.tours
           : undefined,
       includes:
         isActiveManaged && selectedQuoteSegments.includes.length > 0
           ? selectedQuoteSegments.includes
           : undefined,
       options:
         isActiveManaged && selectedQuoteSegments.options.length > 0
           ? selectedQuoteSegments.options
           : undefined,
       rooms: Array.isArray(q.room_occupancies) && q.room_occupancies.length > 0
         ? q.room_occupancies.map((r: any, idx: number) => ({
             id: r.id || `room-${idx + 1}`,
             type: r.room_type || r.type || "Duplo",
             adults: Number(r.adults ?? 2),
             children: Number(r.children ?? (Array.isArray(r.childrenAges) ? r.childrenAges.length : 0)),
             child_ages: Array.isArray(r.children_ages)
               ? r.children_ages
               : Array.isArray(r.childrenAges)
                 ? r.childrenAges
                 : [],
           }))
         : undefined,
       pricing: resolvedAmountCents
         ? {
             base_price_cents: resolvedAmountCents,
             total_price_cents: resolvedAmountCents,
             base_price_per_person: Math.round(resolvedAmountCents / 100 / Math.max(1, q.adults_count || 1)),
             total_price: Math.round(resolvedAmountCents / 100),
           }
         : undefined,
     },
   });
 },
 onSuccess: (res) => {
 queryClient.invalidateQueries({ queryKey: ["agency-travel-quotes"] });
 queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
 queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
 queryClient.invalidateQueries({ queryKey: ["lead-dossier"] });
 queryClient.invalidateQueries({ queryKey: ["customer-360"] });
 toast.success("Lâmina criada! Abrindo Studio...");
 navigate({ to: "/workspace/turismo/propostas/$id", params: { id: res.id } });
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao criar proposta."),
 });

  const quickMoveStageMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: TravelQuoteRequestDTO["status"] }) =>
      updateAgencyTravelQuote({
        data: {
          id,
          status: nextStatus,
        },
      }),
    onSuccess: () => {
      toast.success("Estágio do lead atualizado!");
      queryClient.invalidateQueries({ queryKey: ["agency-travel-quotes"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao atualizar estágio."),
  });

 const openManageModal = (q: TravelQuoteRequestDTO) => {
 setManagingQuote(q);
 setEditStatus(q.status as any);
 setEditAgencyNotes(q.agency_notes || "");
 setEditQuoteAmount(q.quote_amount_cents ? (q.quote_amount_cents / 100).toFixed(2) : "");
 setSelectedQuoteSegments({
   flights: [],
   hotels: [],
   transfers: [],
   tours: [],
   includes: [],
   options: [],
   quoteSessionId: "",
 });
 };

 return (
 <NicheOperationalGuard
 targetNiche="tourism"
 toolTitle="Cotações de Viagem"
 toolDescription="Gestão de cotações, orçamentos e captação de viajantes para pacotes aéreos, cruzeiros e hotelaria para agências de turismo."
 store={store}
 >
      <div className="w-full px-0 sm:px-4 flex flex-col gap-4 animate-in fade-in duration-200 min-h-screen pb-20">
        {/* ── 1. Barra Canônica de Operação Silenciosa ── */}
        <WorkspaceCanonicalToolbar
          tabs={[
            { id: "all", label: "Todas Cotações", icon: SuitcaseSimple, count: metrics.total },
            { id: "new", label: "Novas", icon: Clock, count: metrics.newCount },
            { id: "analyzing", label: "Em Análise", icon: ChatCircleDots, count: metrics.analyzingCount },
            { id: "quoted", label: "Orçamentos", icon: CurrencyCircleDollar, count: metrics.quotedCount },
            { id: "won", label: "Fechadas", icon: CheckCircle, count: metrics.wonCount },
          ]}
          activeTab={selectedStatus}
          onTabChange={(id) => setSelectedStatus(id)}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por cliente, destino, origem ou WhatsApp..."
          filters={[
            {
              id: "trip_type",
              label: "Tipo de Viagem",
              value: tripTypeFilter,
              options: [
                { label: "Todos os Tipos", value: "all" },
                { label: "Aéreo + Hotel", value: "air_package" },
                { label: "Somente Hotel", value: "hotel_only" },
                { label: "Cruzeiro", value: "cruise" },
                { label: "Rodoviário", value: "bus" },
                { label: "Assessoria Visto", value: "visa_assistance" },
              ],
              onChange: setTripTypeFilter,
            },
          ]}
          onMetricsClick={() => setIsDashboardOpen(true)}
          metricsBadge={metrics.totalVolumeCents > 0 ? formatMoney(metrics.totalVolumeCents) : undefined}
          secondaryActions={[
            {
              label: "Ver Lâminas / Studio",
              icon: FileText,
              onClick: () => navigate({ to: "/workspace/turismo/propostas" }),
            },
            {
              label: "Radar de Oportunidades",
              icon: Compass,
              onClick: () => navigate({ to: "/workspace/turismo/oportunidades" }),
            },
            {
              label: isOcrLoading ? ocrProgressText : "Importar Operadora (OCR)",
              icon: FileText,
              disabled: isOcrLoading,
              onClick: () => document.getElementById("quote-ocr-file-input")?.click(),
            },
          ]}
          primaryAction={{
            label: "Nova Cotação",
            icon: Plus,
            onClick: () => setIsNewSheetOpen(true),
          }}
          viewSwitcher={
            <div className="flex items-center gap-1 bg-muted/40 border border-border/60 p-1 rounded-lg">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "h-11 min-h-11 sm:h-7 sm:min-h-7 px-3 rounded-lg text-xs font-medium gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                  viewMode === "kanban"
                    ? "bg-background text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Columns size={14} weight="bold" />
                <span className="hidden sm:inline">Kanban</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "h-11 min-h-11 sm:h-7 sm:min-h-7 px-3 rounded-lg text-xs font-medium gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                  viewMode === "grid"
                    ? "bg-background text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <SquaresFour size={14} weight="bold" />
                <span className="hidden sm:inline">Grade</span>
              </Button>
            </div>
          }
        />

        <input
          type="file"
          id="quote-ocr-file-input"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 25 * 1024 * 1024) {
              toast.error("Arquivo muito grande. O limite máximo para OCR é de 25MB.");
              e.target.value = "";
              return;
            }
            const isLarge = file.size > 4 * 1024 * 1024;
            setOcrProgressText(isLarge ? "Lendo PDF grande..." : "Carregando arquivo...");
            setIsOcrLoading(true);
            try {
              const reader = new FileReader();
              const dataUrl = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(reader.error || new Error("Falha ao ler o arquivo."));
                reader.readAsDataURL(file);
              });
              const base64 = dataUrl.split(",")[1];
              setOcrProgressText("Processando IA / OCR...");
              const res = await ingestTravelDocument({
                data: {
                  fileBase64: base64,
                  fileMime: file.type,
                  fileName: file.name,
                  sourceKind: "operator_quote",
                },
              });
              if (res.success && res.data) {
                toast.success(`Cotação da ${res.data.operator_name} para ${res.data.destination} extraída e salva para revisão (documento ${res.ingestionId.slice(0, 8)}).`);
                setIsNewSheetOpen(true);
              }
            } catch (err: any) {
              toast.error(err?.message || "Erro ao processar cotação.");
            } finally {
              setIsOcrLoading(false);
              e.target.value = "";
            }
          }}
        />

        {/* ── 5. Conteúdo: Funil Kanban ou Lista ── */}
        {filteredQuotes.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-card rounded-lg border border-border/60 p-8">
            <AirplaneTilt size={40} className="mx-auto text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">Nenhuma cotação encontrada</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Cadastre leads recebidos no balcão ou WhatsApp pelo botão acima, ou aguarde novos pedidos pelo portal público.
            </p>
            <Button
              type="button"

              onClick={() => setIsNewSheetOpen(true)}
              className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus size={16} weight="bold" />
              <span>Cadastrar Primeira Cotação</span>
            </Button>
          </div>
        ) : viewMode === "kanban" ? (
          /* Visualização de Funil Kanban por Estágios */
          <div className="tab-list flex gap-4 overflow-x-auto pb-4 min-h-144 items-stretch no-scrollbar">
            {[
              { id: "new", title: "Novas Solicitações", icon: Clock, textClass: "text-primary" },
              { id: "analyzing", title: "Em Análise e Cotação", icon: ChatCircleDots, textClass: "text-warning-strong" },
              { id: "quoted", title: "Proposta Enviada", icon: FileText, textClass: "text-purple-500" },
              { id: "won", title: "Fechadas / Ganhas", icon: CheckCircle, textClass: "text-emerald-500" },
              { id: "lost", title: "Perdidas", icon: Trash, textClass: "text-destructive" },
            ].map((col) => {
              const colQuotes = filteredQuotes.filter((q: any) => q.status === col.id);
              const ColIcon = col.icon;
              const isDragOver = dragOverQuoteCol === col.id;
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverQuoteCol !== col.id) setDragOverQuoteCol(col.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverQuoteCol === col.id) setDragOverQuoteCol(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverQuoteCol(null);
                    const droppedId = e.dataTransfer.getData("text/plain") || draggingQuoteId;
                    setDraggingQuoteId(null);
                    if (!droppedId) return;
                    const quoteItem = filteredQuotes.find((q: any) => q.id === droppedId);
                    if (!quoteItem || quoteItem.status === col.id) return;
                    quickMoveStageMutation.mutate({
                      id: droppedId,
                      nextStatus: col.id as TravelQuoteRequestDTO["status"],
                    });
                  }}
                  className={cn(
                    "flex-none w-80 min-h-144 bg-muted/50 dark:bg-muted/30 rounded-2xl flex flex-col overflow-hidden transition-colors",
                    isDragOver && "ring-2 ring-primary/40 bg-primary/5"
                  )}
                >
                  {/* Cabeçalho da Coluna */}
                  <div className="px-4 py-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <ColIcon size={16} className={col.textClass} weight="bold" />
                      <h3 className="text-xs font-bold text-foreground">{col.title}</h3>
                    </div>
                    <Badge variant="outline" className="font-mono text-2xs h-5 px-2 rounded-md border-border/60 bg-card tabular-nums">
                      {colQuotes.length}
                    </Badge>
                  </div>

                  {/* Cards da Coluna */}
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 no-scrollbar">
                    {colQuotes.length === 0 ? (
                      <div className="min-h-28 rounded-xl border border-dashed border-border/50 bg-transparent flex items-center justify-center text-2xs font-medium text-muted-foreground/70 text-center p-4 select-none">
                        Arraste uma cotação para esta etapa
                      </div>
                    ) : (
                      colQuotes.map((q: any) => {
                        const cleanWhatsapp = (q.contact_whatsapp || "").replace(/\D/g, "");
                        const waMessage = encodeURIComponent(
                          `Olá ${q.contact_name}! Sou da agência de viagens no Waesy e preparei opções para ${q.destination_city}.`,
                        );
                        return (
                          <Card
                            key={q.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", q.id);
                              e.dataTransfer.effectAllowed = "move";
                              setDraggingQuoteId(q.id);
                            }}
                            onDragEnd={() => {
                              setDraggingQuoteId(null);
                              setDragOverQuoteCol(null);
                            }}
                            className={cn(
                              "p-4 rounded-2xl bg-card space-y-3 transition-colors duration-150 flex flex-col justify-between select-none cursor-grab active:cursor-grabbing",
                              draggingQuoteId === q.id && "opacity-50 ring-2 ring-primary/40"
                            )}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-mono font-bold px-2 py-1 rounded-md bg-muted text-foreground truncate max-w-44">
                                  {q.destination_city}
                                </span>
                                {q.quote_amount_cents && q.quote_amount_cents > 0 ? (
                                  <span className="text-xs text-muted-foreground/75 font-mono font-black text-foreground">
                                    {formatMoney(q.quote_amount_cents)}
                                  </span>
                                ) : null}
                              </div>

                              <div className="text-xs font-bold text-foreground truncate">
                                {q.contact_name}
                              </div>

                              <div className="text-xs text-muted-foreground/75 text-muted-foreground flex items-center gap-1 font-mono">
                                <MapPin size={11} className="shrink-0" />
                                <span className="truncate">{q.origin_city} → {q.destination_city}</span>
                              </div>

                              <div className="text-xs text-muted-foreground/75 text-muted-foreground flex items-center gap-2 font-mono">
                                <Users size={11} className="shrink-0" />
                                <span>
                                  {q.adults_count} ad
                                  {q.children_count > 0
                                    ? `, ${q.children_count} ch${
                                        Array.isArray(q.children_ages) && q.children_ages.length > 0
                                          ? ` (${q.children_ages.join(", ")}a)`
                                          : ""
                                      }`
                                    : ""}
                                </span>
                                <span>•</span>
                                <span className="capitalize">{q.budget_tier}</span>
                              </div>

                              {(q.linked_proposals_count || 0) > 0 && Array.isArray(q.linked_proposals) && (
                                <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                                  <Link
                                    to="/workspace/turismo/propostas/$id"
                                    params={{ id: q.linked_proposals[0].id }}
                                    className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 min-h-11 -my-2 py-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <FileText size={12} weight="bold" />
                                    <span>
                                      {q.linked_proposals_count === 1
                                        ? "1 lâmina vinculada"
                                        : `${q.linked_proposals_count} lâminas vinculadas`}
                                    </span>
                                  </Link>
                                  <button
                                    type="button"
                                    title="Copiar link da última proposta"
                                    aria-label="Copiar link da última proposta"
                                    onClick={() => {
                                      const token = q.linked_proposals?.[0]?.public_token;
                                      if (!token) return;
                                      const url = `${window.location.origin}/proposta/${token}`;
                                      navigator.clipboard.writeText(url);
                                      toast.success("Link da proposta vinculada copiado!");
                                    }}
                                    className="size-11 min-h-11 min-w-11 -my-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <Copy className="size-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Ações Rápidas no Card */}
                            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1">
                              {/* Mover para trás */}
                              <div className="flex items-center gap-1">
                                {col.id !== "new" && (
                                  <button
                                    type="button"
                                    title="Voltar etapa"
                                    onClick={() => {
                                      const prev: Record<string, TravelQuoteRequestDTO["status"]> = {
                                        analyzing: "new",
                                        quoted: "analyzing",
                                        won: "quoted",
                                        lost: "quoted",
                                      };
                                      quickMoveStageMutation.mutate({ id: q.id, nextStatus: prev[col.id] || "new" });
                                    }}
                                    className="rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer size-11 min-h-11 min-w-11 sm:size-8 sm:min-h-8 sm:min-w-8 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                  >
                                    <CaretLeft size={13} weight="bold" />
                                  </button>
                                )}
                                {col.id !== "won" && col.id !== "lost" && (
                                  <button
                                    type="button"
                                    title="Avançar etapa"
                                    onClick={() => {
                                      const next: Record<string, TravelQuoteRequestDTO["status"]> = {
                                        new: "analyzing",
                                        analyzing: "quoted",
                                        quoted: "won",
                                      };
                                      quickMoveStageMutation.mutate({ id: q.id, nextStatus: next[col.id] || "won" });
                                    }}
                                    className="rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer size-11 min-h-11 min-w-11 sm:size-8 sm:min-h-8 sm:min-w-8 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                  >
                                    <CaretRight size={13} weight="bold" />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                {cleanWhatsapp && (
                                  <a
                                    href={`https://wa.me/55${cleanWhatsapp}?text=${waMessage}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="size-11 min-h-11 min-w-11 sm:size-8 sm:min-h-8 sm:min-w-8 rounded-lg border border-border/60 text-emerald-600 hover:bg-emerald-500/10 inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    title="WhatsApp"
                                    aria-label={`Conversar no WhatsApp com ${q.contact_name}`}
                                  >
                                    <WhatsappLogo size={14} weight="bold" />
                                  </a>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => createProposalMutation.mutate(q)}
                                  className="h-11 min-h-11 sm:h-8 sm:min-h-8 px-3 text-xs rounded-lg font-medium text-primary hover:bg-primary/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                                  title="Criar Proposta no Studio"
                                >
                                  Lâmina
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openManageModal(q)}
                                  className="h-11 min-h-11 sm:h-8 sm:min-h-8 px-3 text-xs rounded-lg border-border/70 font-medium gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                  Gerenciar
                                </Button>
                                <CrudActionsMenu
                                  entityName="Cotação"
                                  onEdit={() => openManageModal(q)}
                                  onDuplicate={() => duplicateQuoteMutation.mutate(q)}
                                  onDelete={() => deleteQuoteMutation.mutate(q.id)}
                                  deleteTitle="Excluir cotação?"
                                  deleteDescription={`Remover permanentemente a cotação de ${q.contact_name} (${q.destination_city})?`}
                                  customActions={[
                                    {
                                      id: "create-proposal",
                                      label: "Criar Lâmina no Studio",
                                      icon: FileText,
                                      onClick: () => createProposalMutation.mutate(q),
                                    },
                                  ]}
                                />
                              </div>
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {filteredQuotes.map((q: any) => {
 const cleanWhatsapp = (q.contact_whatsapp || "").replace(/\D/g, "");
 const tripTypeLabel =
 q.trip_type === "air_package"
 ? "Aéreo + Hotel"
 : q.trip_type === "hotel_only"
 ? "Somente Hotel"
 : q.trip_type === "cruise"
 ? "Cruzeiro"
 : q.trip_type === "bus"
 ? "Rodoviário"
 : "Vistos e Assessoria";

 const waMessage = encodeURIComponent(
 `Olá ${q.contact_name}! Sou da agência de viagens no Waesy e recebi sua solicitação de cotação para ${q.destination_city} (${q.adults_count} adultos${q.children_count > 0 ? `, ${q.children_count} crianças` : ""}). Preparei algumas opções incríveis para você!`
 );

 const statusBadgeVariant =
 q.status === "won"
 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
 : q.status === "quoted"
 ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
 : q.status === "analyzing"
 ? "bg-warning/10 text-warning-strong   border-warning/30 "
 : q.status === "lost"
 ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
 : "bg-muted text-muted-foreground";

 const statusLabel =
 q.status === "new"
 ? "Nova Cotação"
 : q.status === "analyzing"
 ? "Em Análise"
 : q.status === "quoted"
 ? "Orçamento Enviado"
 : q.status === "won"
 ? "Fechada / Ganha"
 : "Perdida";

 return (
 <Card
 key={q.id}
 className="p-5 rounded-lg border border-border/60 bg-card space-y-4 hover:border-primary/40 transition-colors flex flex-col justify-between shadow-none"
 >
 <div className="space-y-3">
 {/* Top Header do Card */}
 <div className="flex items-center justify-between gap-2">
 <span className="text-xs text-muted-foreground/75 font-mono font-bold px-2 py-1 rounded-md bg-primary/10 text-primary">
 {tripTypeLabel}
 </span>
 <div className="flex items-center gap-2">
 {q.quote_amount_cents && q.quote_amount_cents > 0 && (
 <span className="text-xs font-mono font-black text-foreground px-2 py-1 rounded-md bg-muted/60">
 {formatMoney(q.quote_amount_cents)}
 </span>
 )}
 <span className={`text-xs font-mono uppercase font-bold px-2 py-1 rounded-md border ${statusBadgeVariant}`}>
 {statusLabel}
 </span>
 </div>
 </div>

 {/* Rota da Viagem: Origem -> Destino */}
 <div className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-1">
 <div className="flex items-center justify-between text-xs font-bold text-foreground">
 <span className="flex items-center gap-2">
 <MapPin size={14} className="text-muted-foreground" />
 <span>{q.origin_city} {q.origin_iata && `(${q.origin_iata})`}</span>
 </span>
 <span>→</span>
 <span className="text-primary font-black">
 {q.destination_city} {q.destination_iata && `(${q.destination_iata})`}
 </span>
 </div>

 {(q.departure_date || q.return_date) && (
 <div className="flex items-center gap-2 text-xs text-muted-foreground/75 text-muted-foreground pt-1 font-mono">
 <CalendarDots size={12} />
 <span>
 {q.departure_date ? formatDate(q.departure_date) : "Data a definir"} até{" "}
 {q.return_date ? formatDate(q.return_date) : "Data a definir"}
 </span>
 {q.flexible_dates && (
 <Badge variant="secondary" className="text-xs py-0 px-2">
 +/- 3 dias
 </Badge>
 )}
 </div>
 )}
 </div>

 {/* Detalhes de Passageiros */}
 <div className="space-y-2 text-xs text-muted-foreground">
 <div className="flex items-center gap-2">
 <Users size={14} className="text-foreground shrink-0" />
 <span className="font-bold text-foreground">
 {q.adults_count} {q.adults_count === 1 ? "Adulto" : "Adultos"}
 </span>
 <span>•</span>
 <span>
 {q.children_count > 0
 ? `${q.children_count} ${q.children_count === 1 ? "Criança" : "Crianças"}${
 Array.isArray(q.children_ages) && q.children_ages.length > 0
 ? ` (${q.children_ages.join(", ")} anos)`
 : ""
 }`
 : "Sem crianças"}
 </span>
 <span>•</span>
 <span className="capitalize">{q.budget_tier}</span>
 </div>

 {q.special_notes && (
 <p className="text-xs text-muted-foreground/75 italic bg-muted/20 p-3 rounded-lg border border-border/40 text-muted-foreground line-clamp-2">
 "{q.special_notes}"
 </p>
 )}

 {q.agency_notes && (
 <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground/75 text-muted-foreground">
 <span className="font-semibold block text-xs uppercase text-foreground">Nota Interna:</span>
 <span>{q.agency_notes}</span>
 </div>
 )}

 {(q.linked_proposals_count || 0) > 0 && Array.isArray(q.linked_proposals) && (
 <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between gap-2">
   <Link
     to="/workspace/turismo/propostas/$id"
     params={{ id: q.linked_proposals[0].id }}
     className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-2 min-h-11 -my-2 py-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
   >
     <FileText size={14} weight="bold" />
     <span>
       {q.linked_proposals_count === 1
         ? `Proposta: ${q.linked_proposals[0].title}`
         : `${q.linked_proposals_count} propostas criadas (${q.linked_proposals[0].title})`}
     </span>
   </Link>
   <div className="flex items-center gap-1 shrink-0">
     <button
       type="button"
       title="Copiar link da proposta"
       aria-label="Copiar link da proposta"
       onClick={() => {
         const token = q.linked_proposals?.[0]?.public_token;
         if (!token) return;
         navigator.clipboard.writeText(`${window.location.origin}/proposta/${token}`);
         toast.success("Link da proposta copiado!");
       }}
       className="size-11 min-h-11 min-w-11 -my-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
     >
       <Copy className="size-3.5" />
     </button>
     <a
       href={`/proposta/${q.linked_proposals[0].public_token}`}
       target="_blank"
       rel="noopener noreferrer"
       title="Abrir página da proposta"
       aria-label="Abrir página da proposta"
       className="size-11 min-h-11 min-w-11 -my-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
     >
       <ExternalLink className="size-3.5" />
     </a>
   </div>
 </div>
 )}
 </div>
 </div>

 {/* Rodapé & Ações do Lead */}
 <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="min-w-0">
 <span className="text-xs font-bold text-foreground block truncate">
 {q.contact_name}
 </span>
 <span className="text-xs font-mono text-muted-foreground">
 {q.contact_whatsapp}
 </span>
 </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        type="button"
          
                        variant="outline"
                        onClick={() => openManageModal(q)}
                        className="flex-1 sm:flex-none rounded-lg font-bold text-xs h-11 min-h-11 px-4 border-border gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <PencilSimple size={13} weight="bold" />
                        <span>Gerenciar</span>
                      </Button>

                      <Button
                        type="button"
          
                        variant="outline"
                        disabled={createProposalMutation.isPending}
                        onClick={() => createProposalMutation.mutate(q)}
                        className="flex-1 sm:flex-none rounded-lg font-bold text-xs h-11 min-h-11 px-4 border-border gap-1 cursor-pointer text-primary focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <FileText size={13} weight="bold" />
                        <span>Criar Lâmina</span>
                      </Button>
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      className="w-full sm:w-auto rounded-lg font-bold text-xs h-11 min-h-11 px-4 border-border hover:bg-muted text-foreground gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <a
                        href={`https://wa.me/55${cleanWhatsapp}?text=${waMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <WhatsappLogo size={14} weight="bold" />
                        <span>WhatsApp</span>
                      </a>
                    </Button>
                    <CrudActionsMenu
                      entityName="Cotação"
                      onEdit={() => openManageModal(q)}
                      onDuplicate={() => duplicateQuoteMutation.mutate(q)}
                      onDelete={() => deleteQuoteMutation.mutate(q.id)}
                      deleteTitle="Excluir cotação?"
                      deleteDescription={`Remover permanentemente a cotação de ${q.contact_name} (${q.destination_city})?`}
                      customActions={[
                        {
                          id: "create-proposal",
                          label: "Criar Lâmina no Studio",
                          icon: FileText,
                          onClick: () => createProposalMutation.mutate(q),
                        },
                      ]}
                    />
                  </div>
                </div>
              </Card>
 );
 })}
 </div>
 )}

 {/* ── 5. Gerador Canônico Unificado de Cotação & Proposta (Web + HTML2PDF + InfoTravel + Rooming) ── */}
 <UnifiedProposalWorkspace
 open={isNewSheetOpen}
 onOpenChange={setIsNewSheetOpen}
 mode="kanban_lead_quote"
 initialClientName={searchParams?.leadName}
 initialClientPhone={searchParams?.leadPhone}
 initialClientEmail={searchParams?.leadEmail}
 onCreated={() => {
 queryClient.invalidateQueries({ queryKey: ["agency-travel-quotes"] });
 queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
 }}
 />

 {/* ── 6. Sheet: Gestão de Lead Existente (size="wide" -> 70% viewport) ── */}
 <Sheet open={!!managingQuote} onOpenChange={(o) => !o && setManagingQuote(null)}>
   <SheetContent
     size="wide"
     className="w-full sm:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full bg-card overflow-hidden overscroll-contain"
   >
     <SheetHeader className="px-6 py-4 border-b border-border/60 bg-muted/20 shrink-0">
       <div className="flex items-center justify-between">
         <div>
           <SheetTitle className="text-base font-bold text-foreground">
             Gerenciar Cotação / Lead: {managingQuote?.contact_name}
           </SheetTitle>
           <SheetDescription className="text-xs text-muted-foreground">
             Atualize o estágio da cotação, valores do pacote e histórico de atendimento.
           </SheetDescription>
         </div>
         {managingQuote?.contact_whatsapp && (
           <Button
             variant="outline"

             className="h-11 min-h-11 px-4 gap-2 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
             asChild
           >
             <a
               href={`https://wa.me/${managingQuote.contact_whatsapp.replace(/\D/g, "")}`}
               target="_blank"
               rel="noopener noreferrer"
             >
               <WhatsappLogo size={14} weight="bold" />
               <span>Conversar no WhatsApp</span>
             </a>
           </Button>
         )}
       </div>
     </SheetHeader>

     <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
       {/* ── CARD CANÔNICO: INTENÇÃO DE VIAGEM ── */}
       {managingQuote && (
         <TravelIntentCard
           origin={managingQuote.origin_city || "Chapecó"}
           originCode={managingQuote.origin_iata || undefined}
           destination={managingQuote.destination_city || "Destino a definir"}
           destinationCode={managingQuote.destination_iata || undefined}
           dates={
             managingQuote.departure_date
               ? `${formatDate(managingQuote.departure_date)} até ${managingQuote.return_date ? formatDate(managingQuote.return_date) : "A definir"}`
               : "Datas a definir"
           }
           passengers={`${managingQuote.adults_count || 1} adultos${managingQuote.children_count ? `, ${managingQuote.children_count} crianças` : ""}`}
           travelClass={
             managingQuote.budget_tier === "luxury"
               ? "Executiva"
               : managingQuote.budget_tier === "premium"
               ? "Premium"
               : "Econômica"
           }
           baggage={
             managingQuote.special_notes?.toLowerCase().includes("23kg")
               ? "Mala despachada (23kg)"
               : "Mala de bordo (10kg)"
           }
           onEdit={() => setIsFlightSimulatorOpen((prev) => !prev)}
         />
       )}

       {/* ── MOTOR DE COTAÇÃO MULTI-API PASSHUB (WOOBA GDS + INFOTRAVEL + BANCO REAL) ── */}
       {managingQuote && (
         <div className="space-y-3 pt-2 border-t border-border/60">
           <div className="flex flex-wrap items-center justify-between gap-2">
             <div className="flex items-center gap-2">
               <Plane className="size-4 text-primary" />
               <span className="text-xs font-bold text-foreground">
                 Cotação Multi-API PassHub (Voos, Hotéis, Pacotes & Passeios)
               </span>
             </div>
             <Button
               type="button"
               variant="outline"
               onClick={() => setIsFlightSimulatorOpen((prev) => !prev)}
               className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
             >
               {isFlightSimulatorOpen ? "Ocultar Cotador PassHub" : "Cotar Pacote nas APIs"}
             </Button>
           </div>

           {(selectedQuoteSegments.flights.length > 0 ||
             selectedQuoteSegments.hotels.length > 0 ||
             selectedQuoteSegments.transfers.length > 0 ||
             selectedQuoteSegments.tours.length > 0 ||
             selectedQuoteSegments.options.length > 0) && (
             <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs">
               <div className="flex flex-wrap items-center gap-2">
                 <span className="font-semibold text-foreground">Selecionados:</span>
                 {selectedQuoteSegments.flights.length > 0 && (
                   <Badge variant="secondary">{selectedQuoteSegments.flights.length} Voo(s)</Badge>
                 )}
                 {selectedQuoteSegments.hotels.length > 0 && (
                   <Badge variant="secondary">{selectedQuoteSegments.hotels.length} Hotel(is)</Badge>
                 )}
                 {selectedQuoteSegments.transfers.length > 0 && (
                   <Badge variant="secondary">{selectedQuoteSegments.transfers.length} Terrestre(s)</Badge>
                 )}
                 {selectedQuoteSegments.tours.length > 0 && (
                   <Badge variant="secondary">{selectedQuoteSegments.tours.length} Passeio(s)</Badge>
                 )}
                 {selectedQuoteSegments.options.length > 0 && (
                   <Badge variant="secondary">{selectedQuoteSegments.options.length} Opção(ões)</Badge>
                 )}
               </div>
               <Button
                 type="button"
                 size="sm"
                 disabled={createProposalMutation.isPending}
                 onClick={() => createProposalMutation.mutate(managingQuote)}
                 className="h-11 sm:h-9 gap-2 font-semibold"
               >
                 <FileText size={14} weight="bold" />
                 <span>Gerar Lâmina com Seleções</span>
               </Button>
             </div>
           )}

           {isFlightSimulatorOpen && (
             <div className="pt-1">
               <PassHubLiveQuoterPanel
                 key={managingQuote.id}
                 compact
                 initialOriginIata={managingQuote.origin_iata || ""}
                 initialDestinationIata={managingQuote.destination_iata || ""}
                 initialDestinationCity={managingQuote.destination_city || ""}
                 initialDepartureDate={managingQuote.departure_date || ""}
                 initialReturnDate={managingQuote.return_date || ""}
                 initialRooms={
                   Array.isArray(managingQuote.room_occupancies) && managingQuote.room_occupancies.length > 0
                     ? managingQuote.room_occupancies.map((r: any) => ({
                         adults: Math.max(1, Number(r?.adults || 2)),
                         childrenAges: Array.isArray(r?.childrenAges)
                           ? r.childrenAges.map(Number)
                           : Array.isArray(r?.children_ages)
                             ? r.children_ages.map(Number)
                             : [],
                       }))
                     : [{ adults: Math.max(1, managingQuote.adults_count || 2), childrenAges: [] }]
                 }
                 onAddFlight={(flight, meta) => {
                   setSelectedQuoteSegments((prev) => ({
                     ...prev,
                     flights: [...prev.flights, flight],
                     quoteSessionId: meta.quoteSessionId || prev.quoteSessionId,
                   }));
                   if (meta.priceCents > 0) {
                     const currentCents = parseQuoteReaisToCents(editQuoteAmount) || 0;
                     setEditQuoteAmount(((currentCents + meta.priceCents) / 100).toFixed(2));
                   }
                   const note = `Voo (${meta.providerCode}): ${flight.airline_name || flight.airline} ${flight.flight_number || ""} (${flight.origin_iata} ${flight.departure_time || ""} -> ${flight.destination_iata} ${flight.arrival_time || ""})`;
                   setEditAgencyNotes((prev) => (prev ? `${prev}\n${note}` : note));
                   toast.success(`Voo ${flight.airline_name || flight.airline} adicionado ao pacote da cotação!`);
                 }}
                 onAddHotel={(hotel, meta) => {
                   setSelectedQuoteSegments((prev) => ({
                     ...prev,
                     hotels: [...prev.hotels, hotel],
                     quoteSessionId: meta.quoteSessionId || prev.quoteSessionId,
                   }));
                   if (meta.priceCents > 0) {
                     const currentCents = parseQuoteReaisToCents(editQuoteAmount) || 0;
                     setEditQuoteAmount(((currentCents + meta.priceCents) / 100).toFixed(2));
                   }
                   const note = `Hotel (${meta.providerCode}): ${hotel.hotel_name} (${hotel.board_basis || "Regime sob consulta"})`;
                   setEditAgencyNotes((prev) => (prev ? `${prev}\n${note}` : note));
                   toast.success(`Hotel ${hotel.hotel_name} adicionado!`);
                 }}
                 onAddTransfer={(transfer, meta) => {
                   setSelectedQuoteSegments((prev) => ({
                     ...prev,
                     transfers: [...prev.transfers, transfer],
                     quoteSessionId: meta.quoteSessionId || prev.quoteSessionId,
                   }));
                   if (transfer.price_cents && transfer.price_cents > 0) {
                     const currentCents = parseQuoteReaisToCents(editQuoteAmount) || 0;
                     setEditQuoteAmount(((currentCents + transfer.price_cents) / 100).toFixed(2));
                   }
                   toast.success(`Transfer "${transfer.route_name || transfer.vehicle || "Executivo"}" adicionado!`);
                 }}
                 onAddTour={(tour, meta) => {
                   setSelectedQuoteSegments((prev) => ({
                     ...prev,
                     tours: [...prev.tours, tour],
                     includes: tour.included && tour.title && !prev.includes.includes(tour.title)
                       ? [...prev.includes, tour.title]
                       : prev.includes,
                     quoteSessionId: meta.quoteSessionId || prev.quoteSessionId,
                   }));
                   if (tour.price_cents && tour.price_cents > 0) {
                     const currentCents = parseQuoteReaisToCents(editQuoteAmount) || 0;
                     setEditQuoteAmount(((currentCents + tour.price_cents) / 100).toFixed(2));
                   }
                   toast.success(`Passeio "${tour.title}" adicionado!`);
                 }}
                 onAddCar={(car, meta) => {
                   const carAsTransfer: TransferDTO = {
                     id: car.id,
                     type: "Locação de Veículo",
                     vehicle: `${car.vehicleModelExample || car.vehicleCategory} (${car.rentalCompany})`,
                     route: car.pickupLocation,
                     price_cents: car.totalPriceCents,
                     notes: `${car.vehicleCategory} · ${car.transmission}`,
                   };
                   setSelectedQuoteSegments((prev) => ({
                     ...prev,
                     transfers: [...prev.transfers, carAsTransfer],
                     quoteSessionId: meta.quoteSessionId || prev.quoteSessionId,
                   }));
                   if (car.totalPriceCents > 0) {
                     const currentCents = parseQuoteReaisToCents(editQuoteAmount) || 0;
                     setEditQuoteAmount(((currentCents + car.totalPriceCents) / 100).toFixed(2));
                   }
                   toast.success(`Veículo "${car.vehicleModelExample || car.vehicleCategory}" adicionado!`);
                 }}
                 onImportPackage={(pkg, meta) => {
                   const nextHotels: HotelDTO[] = pkg.hotelName
                     ? [
                         {
                           hotel_name: pkg.hotelName,
                           destination: pkg.destination,
                           checkin_date: pkg.departureDate,
                           checkout_date: pkg.returnDate,
                           nights_count: pkg.nights,
                           board_basis: pkg.boardType || undefined,
                           image_url: pkg.imageUrl || undefined,
                           price_cents: pkg.priceTotalCents,
                         },
                       ]
                     : [];
                   setSelectedQuoteSegments((prev) => ({
                     ...prev,
                     hotels: nextHotels.length > 0 ? nextHotels : prev.hotels,
                     includes: Array.from(new Set([...prev.includes, ...(pkg.includedItems || [])])),
                     quoteSessionId: meta.quoteSessionId || prev.quoteSessionId,
                   }));
                   if (pkg.priceTotalCents > 0) {
                     setEditQuoteAmount((pkg.priceTotalCents / 100).toFixed(2));
                   }
                   const note = `Pacote (${pkg.operatorSlug}): ${pkg.packageName}${pkg.hotelName ? ` · ${pkg.hotelName}` : ""}`;
                   setEditAgencyNotes((prev) => (prev ? `${prev}\n${note}` : note));
                   toast.success(`Pacote "${pkg.packageName}" aplicado!`);
                 }}
                 onAddComparativeOption={(opt) => {
                   setSelectedQuoteSegments((prev) => ({
                     ...prev,
                     options: [
                       ...prev.options,
                       {
                         id: `opt-${prev.options.length + 1}`,
                         name: opt.optionLabel,
                         hotel_name: opt.hotelName || undefined,
                         airline: opt.airlineDesc || undefined,
                         hotels: opt.hotel ? [opt.hotel] : undefined,
                         flights: opt.flight ? [opt.flight] : undefined,
                         is_recommended: prev.options.length === 0,
                         pricing: {
                           currency: "BRL",
                           base_price_cents: opt.totalPriceCents,
                           boarding_tax_cents: 0,
                           other_taxes_cents: 0,
                           discount_cents: 0,
                           total_price_cents: opt.totalPriceCents,
                           installments_options: [],
                         },
                       },
                     ],
                     quoteSessionId: opt.quoteSessionId || prev.quoteSessionId,
                   }));
                   toast.success(`"${opt.optionLabel}" salva nas opções comparativas!`);
                 }}
               />
             </div>
           )}
         </div>
       )}
       {/* Card Resumo do Lead */}
       <div className="p-4 rounded-2xl bg-muted/30 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
         <div>
           <span className="text-xs uppercase font-bold text-muted-foreground block">Destino Desejado</span>
           <strong className="text-foreground text-sm font-semibold">{managingQuote?.destination_city || "A Definir"}</strong>
         </div>
         <div>
           <span className="text-xs uppercase font-bold text-muted-foreground block">Passageiros</span>
           <strong className="text-foreground text-sm font-semibold">
             {managingQuote?.adults_count || 1} adultos {managingQuote?.children_count ? `+ ${managingQuote.children_count} crianças` : ""}
             {Array.isArray(managingQuote?.children_ages) && managingQuote.children_ages.length > 0
               ? ` (${managingQuote.children_ages.join(", ")} anos)`
               : ""}
           </strong>
         </div>
         <div>
           <span className="text-xs uppercase font-bold text-muted-foreground block">WhatsApp / Contato</span>
           <div className="flex items-center gap-2 mt-1">
             <strong className="text-foreground text-sm font-mono font-medium">{managingQuote?.contact_whatsapp || "Não informado"}</strong>
             {managingQuote?.contact_whatsapp && (
               <button
                 type="button"
                 onClick={() => {
                   const cleanPhone = (managingQuote.contact_whatsapp || "").replace(/\D/g, "");
                   window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá ${managingQuote.contact_name}! Sou da agência de turismo no Waesy. Recebi sua solicitação para ${managingQuote.destination_city} e preparei opções personalizadas!`)}`, "_blank");
                 }}
                 className="h-11 min-h-11 min-w-11 inline-flex items-center justify-center p-2 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                 title="Abrir WhatsApp do Cliente"
               >
                 <WhatsappLogo size={16} weight="fill" />
               </button>
             )}
           </div>
         </div>
         <div>
           <span className="text-xs uppercase font-bold text-muted-foreground block">Data de Solicitação</span>
           <strong className="text-foreground text-sm font-medium">{managingQuote?.created_at ? formatDate(managingQuote.created_at) : "Recente"}</strong>
         </div>
       </div>

       {managingQuote?.special_notes && (
         <div className="p-4 rounded-lg bg-muted/40 border border-border/50 space-y-2">
           <span className="text-xs uppercase font-bold text-muted-foreground block flex items-center gap-2">
             <FileText size={12} className="text-primary" />
             <span>Dossiê Completo da Cotação</span>
           </span>
           <pre className="text-xs font-sans text-foreground whitespace-pre-wrap leading-relaxed">{managingQuote.special_notes}</pre>
         </div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="space-y-2">
           <Label className="text-xs font-bold">Fase / Status no Funil de Vendas</Label>
           <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
             <SelectTrigger className="h-11 text-xs rounded-lg">
               <SelectValue />
             </SelectTrigger>
             <SelectContent className="rounded-lg">
               <SelectItem value="new">Nova Cotação (Não iniciada)</SelectItem>
               <SelectItem value="analyzing">Em Análise / Montando Roteiro</SelectItem>
               <SelectItem value="quoted">Orçamento Enviado ao Cliente</SelectItem>
               <SelectItem value="won">Fechada / Venda Concretizada (Ganha)</SelectItem>
               <SelectItem value="lost">Perdida / Sem Interesse</SelectItem>
             </SelectContent>
           </Select>
         </div>

         <div className="space-y-2">
           <Label className="text-xs font-bold">Valor do Orçamento Final (R$)</Label>
           <Input
             value={editQuoteAmount}
             onChange={(e) => setEditQuoteAmount(e.target.value)}
             placeholder="Ex: 5890.00"
             className="h-11 rounded-lg text-xs font-mono"
           />
         </div>

         <div className="space-y-2 md:col-span-2">
           <Label className="text-xs font-bold">Notas Internas da Negociação e Preferências</Label>
           <Textarea
             value={editAgencyNotes}
             onChange={(e) => setEditAgencyNotes(e.target.value)}
             placeholder="Ex: Cliente prefere voo direto pela manhã. Hotel com café incluso e seguro viagem internacional."
             className="rounded-lg text-xs resize-none"
             rows={4}
           />
         </div>
       </div>
     </div>

     <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
       <Button
         type="button"
         variant="ghost"
         size="sm"
         disabled={deleteQuoteMutation.isPending}
         onClick={() => {
           if (!managingQuote) return;
           confirmAction({
             title: "Excluir Cotação",
             description: `Excluir cotação de ${((managingQuote as any)?.client_name || (managingQuote as any)?.clientName || "Cliente")}?`,
             variant: "destructive",
             onConfirm: () => {
               deleteQuoteMutation.mutate(managingQuote.id);
             },
           });
         }}
         className="text-destructive text-xs rounded-lg h-11 min-h-11 hover:bg-destructive/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-destructive"
       >
         <Trash size={14} className="mr-1" />
         <span>Excluir Cotação</span>
       </Button>

       <div className="flex items-center gap-2">
         <Button
           type="button"
           variant="outline"
           size="sm"
           onClick={() => setManagingQuote(null)}
           className="rounded-lg text-xs h-11 min-h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
         >
           Cancelar
         </Button>
         <Button
           type="button"
           size="sm"
           disabled={updateQuoteMutation.isPending}
           onClick={() => updateQuoteMutation.mutate()}
           className="rounded-lg text-xs h-11 min-h-11 px-5 font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
         >
           {updateQuoteMutation.isPending ? "Salvando..." : "Salvar Alterações"}
         </Button>
       </div>
     </div>
   </SheetContent>
 </Sheet>

 {/* ── Painel de Métricas de CRM & Cotações ── */}
 <WorkspaceDashboardSheet
 open={isDashboardOpen}
 onOpenChange={setIsDashboardOpen}
 title="Cotações de Turismo"
 description="Indicadores de volume orçado, conversão de passageiros e demanda por tipo de viagem."
 metrics={[
 {
 id: "total_quotes",
 label: "Total de Cotações",
 value: metrics.total,
 icon: SuitcaseSimple,
 description: "Total de solicitações de viagem recebidas",
 },
 {
 id: "new_quotes",
 label: "Novas Cotações",
 value: metrics.newCount,
 icon: Clock,
 trend: metrics.newCount > 0 ? { value: "Aguardando", direction: "neutral" } : undefined,
 description: "Contatos recém-chegados aguardando cotação",
 },
 {
 id: "analyzing_quotes",
 label: "Em Cotação / Análise",
 value: metrics.analyzingCount,
 icon: ChatCircleDots,
 description: "Cotações em formulação de aéreo e hotéis",
 },
 {
 id: "quoted_quotes",
 label: "Orçamentos Enviados",
 value: metrics.quotedCount,
 icon: CurrencyCircleDollar,
 description: "Propostas apresentadas ao viajante",
 },
 {
 id: "won_quotes",
 label: "Fechadas / Ganhas",
 value: metrics.wonCount,
 icon: CheckCircle,
 trend: { value: `${metrics.conversionRate}% conv.`, direction: "up" },
 description: "Pacotes fechados e pagos com sucesso",
 },
 {
 id: "total_volume",
 label: "Volume Orçado Total",
 value: formatMoney(metrics.totalVolumeCents),
 icon: CurrencyCircleDollar,
 description: "Somatório do valor monetário das viagens orçadas",
 },
 ]}
 breakdown={{
 title: "Distribuição por Modalidade de Viagem",
 items: [
 {
 label: "Pacote Completo (Aéreo + Hotel)",
 value: (quotes || []).filter((q: any) => q.trip_type === "air_package").length,
 total: Math.max((quotes || []).length, 1),
 color: "bg-sky-500",
 },
 {
 label: "Somente Hotel / Resort",
 value: (quotes || []).filter((q: any) => q.trip_type === "hotel_only").length,
 total: Math.max((quotes || []).length, 1),
 color: "bg-warning",
 },
 {
 label: "Cruzeiro Marítimo",
 value: (quotes || []).filter((q: any) => q.trip_type === "cruise").length,
 total: Math.max((quotes || []).length, 1),
 color: "bg-indigo-500",
 },
 {
 label: "Excursão Rodoviária",
 value: (quotes || []).filter((q: any) => q.trip_type === "bus").length,
 total: Math.max((quotes || []).length, 1),
 color: "bg-emerald-500",
 },
 {
 label: "Outros / Vistos",
 value: (quotes || []).filter((q: any) => q.trip_type === "visa_assistance" || !q.trip_type).length,
 total: Math.max((quotes || []).length, 1),
 color: "bg-slate-400",
 },
 ],
 }}
 />
        <ConfirmDialog />
      </div>
    </NicheOperationalGuard>
  );
}

