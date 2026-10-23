import { Tag, Plane, Sparkles } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TravelIntentCard,
  FlightSearchWidget,
  TravelSearchResults,
  type FlightOfferCardProps,
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
import { createTravelProposal } from "@/services/travel-proposal.functions";
import { listDestinations } from "@/services/travel-catalog.functions";
import { searchAgencyGdsFlightsFn } from "@/services/infotravel";
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
 { id: "hotel_only", label: "Somente Hospedagem / Resort" },
 { id: "cruise", label: "Cruzeiro Marítimo" },
 { id: "bus", label: "Excursão Rodoviária" },
 { id: "visa_assistance", label: "Assessoria de Visto / Passaporte" },
];

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
 const [flightOffers, setFlightOffers] = useState<FlightOfferCardProps[]>([]);
 const [flightSearchFeedback, setFlightSearchFeedback] = useState<{
   searched: boolean;
   isConfigured: boolean;
   message?: string;
 }>({ searched: false, isConfigured: true });
 const [isSearchingFlights, setIsSearchingFlights] = useState(false);

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
 const updateQuoteMutation = useMutation({
 mutationFn: () => {
 if (!managingQuote) throw new Error("Cotação não selecionada.");
 const amountCents = editQuoteAmount ? Math.round(parseFloat(editQuoteAmount.replace(/\D/g, ""))) : null;
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
 queryClient.invalidateQueries({ queryKey: ["agency-travel-quotes"] });
 setManagingQuote(null);
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao atualizar lead."),
 });

 const deleteQuoteMutation = useMutation({
 mutationFn: (id: string) => deleteAgencyTravelQuote({ data: { id } }),
 onSuccess: () => {
 toast.success("Cotação removida!");
 queryClient.invalidateQueries({ queryKey: ["agency-travel-quotes"] });
 setManagingQuote(null);
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao remover cotação."),
 });

 const createProposalMutation = useMutation({
 mutationFn: (q: TravelQuoteRequestDTO) =>
 createTravelProposal({
 data: {
 quoteId: q.id,
 title: `Proposta: ${q.destination_city} (${q.adults_count} adultos)`,
 clientName: q.contact_name,
 clientWhatsapp: q.contact_whatsapp,
 destinationCity: q.destination_city,
 travelStartDate: q.departure_date || undefined,
 travelEndDate: q.return_date || undefined,
 adultsCount: q.adults_count,
 childrenCount: q.children_count,
 },
 }),
 onSuccess: (res) => {
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
 };

 return (
 <NicheOperationalGuard
 targetNiche="tourism"
 toolTitle="Cotações de Viagem"
 toolDescription="O pipeline de cotações, orçamentos e captação de passageiros para pacotes aéreos, cruzeiros e hotéis foi projetado especificamente para agências de viagens e turismo."
 store={store}
 >
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 flex flex-col gap-4 animate-in fade-in duration-200 min-h-screen pb-20">
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
          secondaryAction={{
            label: "Ver Lâminas / Studio",
            icon: FileText,
            onClick: () => navigate({ to: "/workspace/turismo/propostas" }),
          }}
          primaryAction={{
            label: "Nova Cotação",
            icon: Plus,
            onClick: () => setIsNewSheetOpen(true),
          }}
        />

        {/* ── 4. Alternador de Visualização: Funil Kanban vs Grade + Importar OCR ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border/40">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-2 px-3 py-2 h-11 min-h-11 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                viewMode === "kanban"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Columns size={14} weight="bold" />
              <span>Funil Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-3 py-2 h-11 min-h-11 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SquaresFour size={14} weight="bold" />
              <span>Grade de Cards</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate({ to: "/workspace/turismo/oportunidades" })} className="h-11 min-h-11 px-4 gap-2 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"><Sparkles className="size-4 text-primary" /><span>Radar Comercial & Oportunidades</span></Button>
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

            <Button
              type="button"
              variant="outline"

              disabled={isOcrLoading}
              onClick={() => document.getElementById("quote-ocr-file-input")?.click()}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <FileText size={14} />
              <span>{isOcrLoading ? ocrProgressText : "Importar Operadora (OCR)"}</span>
            </Button>

            <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
              {filteredQuotes.length} cotações encontradas
            </span>
          </div>
        </div>

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
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-96 no-scrollbar">
            {[
              { id: "new", title: "Novas Solicitações", icon: Clock, borderClass: "border-t-primary", textClass: "text-primary" },
              { id: "analyzing", title: "Em Análise e Cotação", icon: ChatCircleDots, borderClass: "border-t-amber-500", textClass: "text-amber-500" },
              { id: "quoted", title: "Proposta Enviada", icon: FileText, borderClass: "border-t-purple-500", textClass: "text-purple-500" },
              { id: "won", title: "Fechadas / Ganhas", icon: CheckCircle, borderClass: "border-t-emerald-500", textClass: "text-emerald-500" },
              { id: "lost", title: "Perdidas", icon: Trash, borderClass: "border-t-destructive", textClass: "text-destructive" },
            ].map((col) => {
              const colQuotes = filteredQuotes.filter((q: any) => q.status === col.id);
              const ColIcon = col.icon;
              return (
                <div
                  key={col.id}
                  className={cn("flex-none w-80 bg-muted/20 border border-border/70 border-t-4 rounded-lg flex flex-col shadow-2xs", col.borderClass)}
                >
                  {/* Cabeçalho da Coluna */}
                  <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0 bg-card/60 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <ColIcon size={16} className={col.textClass} weight="bold" />
                      <h3 className="text-xs font-bold text-foreground">{col.title}</h3>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs h-5 px-2">
                      {colQuotes.length}
                    </Badge>
                  </div>

                  {/* Cards da Coluna */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                    {colQuotes.length === 0 ? (
                      <div className="h-28 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground/75 text-muted-foreground text-center p-3">
                        Nenhum lead nesta etapa
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
                            className="p-4 rounded-lg border border-border/70 bg-card space-y-3 hover:border-primary/50 transition-colors shadow-none flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-primary/10 text-primary truncate max-w-44">
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
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer size-11 min-h-11 min-w-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer size-11 min-h-11 min-w-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                                    className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                                    title="WhatsApp"
                                  >
                                    <WhatsappLogo size={14} weight="bold" />
                                  </a>
                                )}
                                <Button
                                  type="button"
                    
                                  variant="ghost"
                                  onClick={() => createProposalMutation.mutate(q)}
                                  className="h-11 min-h-11 px-3 text-xs rounded-lg font-bold text-primary hover:bg-primary/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                                  title="Criar Proposta no Studio"
                                >
                                  Lâmina
                                </Button>
                                <Button
                                  type="button"
                    
                                  variant="outline"
                                  onClick={() => openManageModal(q)}
                                  className="h-11 min-h-11 px-3 text-xs rounded-lg font-bold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                  Gerenciar
                                </Button>
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
 ? "️ Voo + Hotel"
 : q.trip_type === "hotel_only"
 ? " Somente Hotel"
 : q.trip_type === "cruise"
 ? " Cruzeiro"
 : q.trip_type === "bus"
 ? " Rodoviário"
 : " Visto Americano";

 const waMessage = encodeURIComponent(
 `Olá ${q.contact_name}! Sou da agência de viagens no Waesy e recebi sua solicitação de cotação para ${q.destination_city} (${q.adults_count} adultos${q.children_count > 0 ? `, ${q.children_count} crianças` : ""}). Preparei algumas opções incríveis para você!`
 );

 const statusBadgeVariant =
 q.status === "won"
 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
 : q.status === "quoted"
 ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
 : q.status === "analyzing"
 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
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
        
                      className="w-full sm:w-auto rounded-lg font-bold text-xs h-11 min-h-11 px-4 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
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
     className="w-full sm:max-w-3xl lg:max-w-2xl p-0 flex flex-col h-full bg-card overflow-hidden overscroll-contain"
   >
     <SheetHeader className="px-6 py-4 border-b border-border/60 bg-muted/20 shrink-0">
       <div className="flex items-center justify-between">
         <div>
           <SheetTitle className="text-base font-bold text-foreground">
             Gerenciar Cotação / Lead: {managingQuote?.contact_name}
           </SheetTitle>
           <SheetDescription className="text-xs text-muted-foreground">
             Atualize a fase do pipeline comercial, proposta financeira e histórico de atendimento.
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

       {/* ── SIMULADOR DE VOOS CANÔNICO (GDS & CONSOLIDADORA) ── */}
       {managingQuote && (
         <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Plane className="size-4 text-primary" />
               <span className="text-xs font-bold text-foreground">
                 Simulação de Voos e Tarifas Aéreas (GDS)
               </span>
             </div>
             <Button
               type="button"
 
               variant="outline"
               onClick={() => setIsFlightSimulatorOpen((prev) => !prev)}
               className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
             >
               {isFlightSimulatorOpen ? "Ocultar Simulador" : "Buscar Voos GDS"}
             </Button>
           </div>

           {isFlightSimulatorOpen && (
             <div className="space-y-4 pt-1 animate-in fade-in duration-200">
               <FlightSearchWidget
                 initialParams={{
                   origin: `${managingQuote.origin_city || "Chapecó"}${managingQuote.origin_iata ? ` (${managingQuote.origin_iata})` : ""}`,
                   destination: `${managingQuote.destination_city || "Recife"}${managingQuote.destination_iata ? ` (${managingQuote.destination_iata})` : ""}`,
                   departureDate: managingQuote.departure_date || "2026-11-15",
                   returnDate: managingQuote.return_date || "2026-11-22",
                   passengers: managingQuote.adults_count || 2,
                   isRoundTrip: Boolean(managingQuote.return_date),
                   travelClass: (managingQuote.budget_tier === "luxury" ? "business" : managingQuote.budget_tier === "premium" ? "premium" : "economy") as any,
                 }}
                 isLoading={isSearchingFlights}
                 onSearch={async (params) => {
                   setIsSearchingFlights(true);
                   try {
                     const res = await searchAgencyGdsFlightsFn({
                       data: {
                         origin: params.origin,
                         destination: params.destination,
                         departureDate: params.departureDate,
                         returnDate: params.returnDate,
                         passengers: params.passengers,
                       },
                     });
                     const mapped: FlightOfferCardProps[] = (res.offers || []).map((o) => ({
                       airline: o.airline,
                       flightNumber: o.flightNumber,
                       departureTime: o.departureTime,
                       departureAirport: o.departureAirport,
                       arrivalTime: o.arrivalTime,
                       arrivalAirport: o.arrivalAirport,
                       duration: o.duration,
                       stops: o.stops,
                       stopsDescription: o.stopsDescription,
                       baggageIncluded: o.baggageIncluded,
                       price: o.priceCents > 0 ? formatMoney(o.priceCents) : "Sob consulta",
                       pricePerPerson:
                         o.pricePerPersonCents > 0
                           ? `${formatMoney(o.pricePerPersonCents)} por pessoa`
                           : "Bloqueio Agência",
                       conditions: o.conditions,
                       isBestOption: o.isBestOption,
                       isCheapest: o.isCheapest,
                     }));
                     setFlightOffers(mapped);
                     setFlightSearchFeedback({
                       searched: true,
                       isConfigured: res.isInfotravelConfigured,
                       message: res.statusMessage,
                     });
                     if (mapped.length > 0) {
                       toast.success(`${mapped.length} opções aéreas reais encontradas para ${params.destination}.`);
                     } else {
                       toast.info("Nenhum voo retornado nesta consulta.");
                     }
                   } catch (err: any) {
                     toast.error(err?.message || "Erro ao consultar malha aérea GDS.");
                   } finally {
                     setIsSearchingFlights(false);
                   }
                 }}
               />

               {flightSearchFeedback.searched && flightOffers.length === 0 && (
                 <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                   <div className="space-y-1">
                     <p className="text-xs font-bold text-foreground">
                       {flightSearchFeedback.isConfigured
                         ? "Nenhum voo encontrado para os filtros informados"
                         : "Conector GDS InfoTravel não configurado nesta agência"}
                     </p>
                     <p className="text-xs text-muted-foreground">
                       {flightSearchFeedback.message ||
                         (flightSearchFeedback.isConfigured
                           ? "Tente alterar a data de embarque ou utilize o Studio Universal para importar tarifa via OCR."
                           : "Ative suas credenciais InfoTravel no Hub de Integrações para consultar disponibilidade aérea em tempo real.")}
                     </p>
                   </div>
                   {!flightSearchFeedback.isConfigured && (
                     <Button
                       asChild
                       variant="outline"
         
                       className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold shrink-0"
                     >
                       <Link to="/workspace/configuracoes/integracoes">Configurar InfoTravel</Link>
                     </Button>
                   )}
                 </div>
               )}

               {flightOffers.length > 0 && (
                 <TravelSearchResults
                   destination={managingQuote.destination_city}
                   offers={flightOffers}
                   onSelectOffer={(offer) => {
                     const numPrice = offer.price.replace(/[^\d]/g, "");
                     if (numPrice) {
                       setEditQuoteAmount((parseFloat(numPrice) / 100).toFixed(2));
                     }
                     const flightNote = `Voo Selecionado: ${offer.airline} (${offer.departureAirport} ${offer.departureTime} → ${offer.arrivalAirport} ${offer.arrivalTime}), ${offer.price}. ${offer.baggageIncluded ? "Bagagem despachada inclusa" : "Sem bagagem despachada"}.`;
                     setEditAgencyNotes((prev) => (prev ? `${prev}\n${flightNote}` : flightNote));
                     toast.success(`Voo da ${offer.airline} selecionado e valor aplicado ao orçamento!`);
                   }}
                   onGenerateQuote={() => {
                     createProposalMutation.mutate(managingQuote);
                   }}
                 />
               )}
             </div>
           )}
         </div>
       )}
       {/* Card Resumo do Lead */}
       <div className="p-4 rounded-lg bg-muted/40 border border-border/40 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
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
 color: "bg-amber-500",
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

