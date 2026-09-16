import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AirplaneTilt, MapPin, CalendarDots, Users, WhatsappLogo, CheckCircle, Clock, CurrencyCircleDollar, SuitcaseSimple, ShieldCheck, ChatCircleDots, FileText, Plus, PencilSimple, Trash, ChartLineUp, Funnel, Buildings, Columns, SquaresFour, CaretRight, CaretLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
 listAgencyTravelQuotes,
 createAgencyTravelQuote,
 updateAgencyTravelQuote,
 deleteAgencyTravelQuote,
 type TravelQuoteRequestDTO,
} from "@/services/tourism.functions";
import { createTravelProposal } from "@/services/travel-proposal.functions";
import { listDestinations } from "@/services/travel-catalog.functions";
import { getStoreSettings } from "@/services/store.functions";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { QuotationBuilderSheet } from "@/components/tourism/quotation-builder-sheet";
import { formatDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";

import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet } from "@/components/workspace/workspace-dashboard-sheet";

export const Route = createFileRoute("/workspace/turismo/cotacoes")({
 head: () => ({
 meta: [{ title: "Cotações & Leads | Workspace Waesy" }],
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
 { id: "all", label: "Todas Cotações" },
 { id: "new", label: "Novas" },
 { id: "analyzing", label: "Em Análise" },
 { id: "quoted", label: "Orçamento Enviado" },
 { id: "won", label: "Fechadas / Ganhas" },
 { id: "lost", label: "Perdidas" },
];

const TRIP_TYPE_OPTIONS = [
 { id: "air_package", label: "✈️ Pacote Completo (Voo + Hotel)" },
 { id: "hotel_only", label: "🏨 Somente Hospedagem / Resort" },
 { id: "cruise", label: "🚢 Cruzeiro Marítimo" },
 { id: "bus", label: "🚌 Excursão Rodoviária" },
 { id: "visa_assistance", label: "🛂 Assessoria de Visto / Passaporte" },
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

 // Modais
 const [isNewSheetOpen, setIsNewSheetOpen] = useState(Boolean(searchParams?.leadName || searchParams?.clientId));
 const [managingQuote, setManagingQuote] = useState<TravelQuoteRequestDTO | null>(null);

 // Edit State: Gestão de Lead Existente
 const [editStatus, setEditStatus] = useState<"new" | "analyzing" | "quoted" | "won" | "lost">("new");
 const [editAgencyNotes, setEditAgencyNotes] = useState("");
 const [editQuoteAmount, setEditQuoteAmount] = useState("");

 const { data: quotes } = useQuery({
 queryKey: ["agency-travel-quotes", selectedStatus],
 queryFn: () => listAgencyTravelQuotes({ data: { status: selectedStatus as any } }),
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
 toolTitle="Central de Cotações & CRM de Viagens"
 toolDescription="O pipeline de cotações, orçamentos e captação de passageiros para pacotes aéreos, cruzeiros e hotéis foi projetado especificamente para agências de viagens e turismo."
 store={store}
 >
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 flex flex-col gap-4 animate-in fade-in duration-200 min-h-[calc(100vh-8.5rem)] pb-20">
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

        {/* ── 4. Alternador de Visualização: Funil Kanban vs Grade ── */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/40">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SquaresFour size={14} weight="bold" />
              <span>Grade de Cards</span>
            </button>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {filteredQuotes.length} cotações encontradas
          </span>
        </div>

        {/* ── 5. Conteúdo: Funil Kanban ou Lista ── */}
        {filteredQuotes.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-card rounded-2xl border border-border/60 p-8">
            <AirplaneTilt size={40} className="mx-auto text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">Nenhuma cotação encontrada</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Cadastre leads recebidos no balcão ou WhatsApp pelo botão acima, ou aguarde novos pedidos pelo portal público.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsNewSheetOpen(true)}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-1.5"
            >
              <Plus size={16} weight="bold" />
              <span>Cadastrar Primeira Cotação</span>
            </Button>
          </div>
        ) : viewMode === "kanban" ? (
          /* Visualização de Funil Kanban por Estágios */
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-16rem)] no-scrollbar">
            {[
              { id: "new", title: "Novas Solicitações", icon: Clock, color: "#3b82f6" },
              { id: "analyzing", title: "Em Análise & Cotação", icon: ChatCircleDots, color: "#f59e0b" },
              { id: "quoted", title: "Proposta Enviada", icon: FileText, color: "#8b5cf6" },
              { id: "won", title: "Fechadas / Ganhas", icon: CheckCircle, color: "#10b981" },
              { id: "lost", title: "Perdidas", icon: Trash, color: "#f43f5e" },
            ].map((col) => {
              const colQuotes = filteredQuotes.filter((q: any) => q.status === col.id);
              const ColIcon = col.icon;
              return (
                <div
                  key={col.id}
                  className="flex-none w-[320px] bg-muted/20 border border-border/70 rounded-2xl flex flex-col shadow-2xs"
                  style={{ borderTop: `3px solid ${col.color}` }}
                >
                  {/* Cabeçalho da Coluna */}
                  <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0 bg-card/60 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <ColIcon size={16} style={{ color: col.color }} weight="bold" />
                      <h3 className="text-xs font-bold text-foreground">{col.title}</h3>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] h-5 px-1.5">
                      {colQuotes.length}
                    </Badge>
                  </div>

                  {/* Cards da Coluna */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                    {colQuotes.length === 0 ? (
                      <div className="h-28 rounded-xl border border-dashed border-border/60 flex items-center justify-center text-[11px] text-muted-foreground text-center p-3">
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
                            className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2.5 hover:border-primary/50 transition-all shadow-none flex flex-col justify-between"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary truncate max-w-[170px]">
                                  {q.destination_city}
                                </span>
                                {q.quote_amount_cents && q.quote_amount_cents > 0 ? (
                                  <span className="text-[11px] font-mono font-black text-foreground">
                                    {formatMoney(q.quote_amount_cents)}
                                  </span>
                                ) : null}
                              </div>

                              <div className="text-xs font-bold text-foreground truncate">
                                {q.contact_name}
                              </div>

                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                                <MapPin size={11} className="shrink-0" />
                                <span className="truncate">{q.origin_city} → {q.destination_city}</span>
                              </div>

                              <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
                                <Users size={11} className="shrink-0" />
                                <span>{q.adults_count} ad{q.children_count > 0 ? `, ${q.children_count} ch` : ""}</span>
                                <span>•</span>
                                <span className="capitalize">{q.budget_tier}</span>
                              </div>
                            </div>

                            {/* Ações Rápidas no Card */}
                            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1">
                              {/* Mover para trás */}
                              <div className="flex items-center gap-0.5">
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
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
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
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
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
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => createProposalMutation.mutate(q)}
                                  className="h-10 sm:h-7 px-3 sm:px-2 text-xs sm:text-[11px] rounded-xl sm:rounded-lg font-bold text-primary hover:bg-primary/10"
                                  title="Criar Proposta no Studio"
                                >
                                  Lâmina
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openManageModal(q)}
                                  className="h-10 sm:h-7 px-3 sm:px-2 text-xs sm:text-[11px] rounded-xl sm:rounded-lg font-bold gap-1 cursor-pointer"
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
 ? "✈️ Voo + Hotel"
 : q.trip_type === "hotel_only"
 ? "🏨 Somente Hotel"
 : q.trip_type === "cruise"
 ? "🚢 Cruzeiro"
 : q.trip_type === "bus"
 ? "🚌 Rodoviário"
 : "🛂 Visto Americano";

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
 className="p-5 rounded-2xl border border-border/60 bg-card space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between shadow-none"
 >
 <div className="space-y-3">
 {/* Top Header do Card */}
 <div className="flex items-center justify-between gap-2">
 <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
 {tripTypeLabel}
 </span>
 <div className="flex items-center gap-1.5">
 {q.quote_amount_cents && q.quote_amount_cents > 0 && (
 <span className="text-xs font-mono font-black text-foreground px-2 py-0.5 rounded-md bg-muted/60">
 {formatMoney(q.quote_amount_cents)}
 </span>
 )}
 <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md border ${statusBadgeVariant}`}>
 {statusLabel}
 </span>
 </div>
 </div>

 {/* Rota da Viagem: Origem -> Destino */}
 <div className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-1">
 <div className="flex items-center justify-between text-xs font-bold text-foreground">
 <span className="flex items-center gap-1.5">
 <MapPin size={14} className="text-muted-foreground" />
 <span>{q.origin_city} {q.origin_iata && `(${q.origin_iata})`}</span>
 </span>
 <span>→</span>
 <span className="text-primary font-black">
 {q.destination_city} {q.destination_iata && `(${q.destination_iata})`}
 </span>
 </div>

 {(q.departure_date || q.return_date) && (
 <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1 font-mono">
 <CalendarDots size={12} />
 <span>
 {q.departure_date ? formatDate(q.departure_date) : "Data a definir"} até{" "}
 {q.return_date ? formatDate(q.return_date) : "Data a definir"}
 </span>
 {q.flexible_dates && (
 <Badge variant="secondary" className="text-[9px] py-0 px-1.5">
 +/- 3 dias
 </Badge>
 )}
 </div>
 )}
 </div>

 {/* Detalhes de Passageiros */}
 <div className="space-y-1.5 text-xs text-muted-foreground">
 <div className="flex items-center gap-2">
 <Users size={14} className="text-foreground shrink-0" />
 <span className="font-bold text-foreground">
 {q.adults_count} {q.adults_count === 1 ? "Adulto" : "Adultos"}
 </span>
 <span>•</span>
 <span>
 {q.children_count > 0
 ? `${q.children_count} ${q.children_count === 1 ? "Criança" : "Crianças"}`
 : "Sem crianças"}
 </span>
 <span>•</span>
 <span className="capitalize">{q.budget_tier}</span>
 </div>

 {q.special_notes && (
 <p className="text-[11px] italic bg-muted/20 p-2.5 rounded-xl border border-border/40 text-muted-foreground line-clamp-2">
 "{q.special_notes}"
 </p>
 )}

 {q.agency_notes && (
 <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
 <span className="font-bold block text-[10px] uppercase">Nota Interna do Consultor:</span>
 <span>{q.agency_notes}</span>
 </div>
 )}
 </div>
 </div>

 {/* Rodapé & Ações do Lead */}
 <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
 <div className="min-w-0">
 <span className="text-xs font-bold text-foreground block truncate">
 {q.contact_name}
 </span>
 <span className="text-[10px] font-mono text-muted-foreground">
 {q.contact_whatsapp}
 </span>
 </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 w-full sm:w-auto pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openManageModal(q)}
                        className="flex-1 sm:flex-none rounded-xl font-bold text-xs h-11 sm:h-8 px-3.5 sm:px-2.5 border-border gap-1 cursor-pointer"
                      >
                        <PencilSimple size={13} weight="bold" />
                        <span>Gerenciar</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={createProposalMutation.isPending}
                        onClick={() => createProposalMutation.mutate(q)}
                        className="flex-1 sm:flex-none rounded-xl font-bold text-xs h-11 sm:h-8 px-3.5 sm:px-2.5 border-border gap-1 cursor-pointer text-primary"
                      >
                        <FileText size={13} weight="bold" />
                        <span>Criar Lâmina</span>
                      </Button>
                    </div>

                    <Button
                      asChild
                      size="sm"
                      className="w-full sm:w-auto rounded-xl font-bold text-xs h-11 sm:h-8 px-4 sm:px-3 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
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

 {/* ── 5. Quotation Builder Studio Avançado (Inspirado em TurisAgências / TravelAgências) ── */}
 <QuotationBuilderSheet
 open={isNewSheetOpen}
 onOpenChange={setIsNewSheetOpen}
 destinations={destinations}
 store={store}
 initialLeadName={searchParams?.leadName}
 initialLeadPhone={searchParams?.leadPhone}
 initialLeadEmail={searchParams?.leadEmail}
 onSuccess={() => {
 queryClient.invalidateQueries({ queryKey: ["agency-travel-quotes"] });
 }}
 />

 {/* ── 6. Sheet: Gestão de Lead Existente (size="wide" -> 70% viewport) ── */}
 <Sheet open={!!managingQuote} onOpenChange={(o) => !o && setManagingQuote(null)}>
   <SheetContent
     size="wide"
     className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl lg:max-w-[70vw] p-0 flex flex-col h-full bg-card overflow-hidden"
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
             size="sm"
             className="h-9 px-3 gap-1.5 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 rounded-xl"
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
       {/* Card Resumo do Lead */}
       <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
         <div>
           <span className="text-[10px] uppercase font-bold text-muted-foreground block">Destino Desejado</span>
           <strong className="text-foreground text-sm font-semibold">{managingQuote?.destination_city || "A Definir"}</strong>
         </div>
         <div>
           <span className="text-[10px] uppercase font-bold text-muted-foreground block">Passageiros</span>
           <strong className="text-foreground text-sm font-semibold">{managingQuote?.adults_count || 1} adultos {managingQuote?.children_count ? `+ ${managingQuote.children_count} crianças` : ""}</strong>
         </div>
         <div>
           <span className="text-[10px] uppercase font-bold text-muted-foreground block">WhatsApp / Contato</span>
           <strong className="text-foreground text-sm font-mono font-medium">{managingQuote?.contact_whatsapp || "Não informado"}</strong>
         </div>
         <div>
           <span className="text-[10px] uppercase font-bold text-muted-foreground block">Data de Solicitação</span>
           <strong className="text-foreground text-sm font-medium">{managingQuote?.created_at ? formatDate(managingQuote.created_at) : "Recente"}</strong>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="space-y-1.5">
           <Label className="text-xs font-bold">Fase / Status no Funil de Vendas</Label>
           <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
             <SelectTrigger className="h-11 text-xs rounded-xl">
               <SelectValue />
             </SelectTrigger>
             <SelectContent className="rounded-xl">
               <SelectItem value="new">Nova Cotação (Não iniciada)</SelectItem>
               <SelectItem value="analyzing">Em Análise / Montando Roteiro</SelectItem>
               <SelectItem value="quoted">Orçamento Enviado ao Cliente</SelectItem>
               <SelectItem value="won">Fechada / Venda Concretizada (Ganha)</SelectItem>
               <SelectItem value="lost">Perdida / Sem Interesse</SelectItem>
             </SelectContent>
           </Select>
         </div>

         <div className="space-y-1.5">
           <Label className="text-xs font-bold">Valor do Orçamento Final (R$)</Label>
           <Input
             value={editQuoteAmount}
             onChange={(e) => setEditQuoteAmount(e.target.value)}
             placeholder="Ex: 5890.00"
             className="h-11 rounded-xl text-xs font-mono"
           />
         </div>

         <div className="space-y-1.5 md:col-span-2">
           <Label className="text-xs font-bold">Notas Internas da Negociação & Preferências</Label>
           <Textarea
             value={editAgencyNotes}
             onChange={(e) => setEditAgencyNotes(e.target.value)}
             placeholder="Ex: Cliente prefere voo direto pela manhã. Hotel com café incluso e seguro viagem internacional."
             className="rounded-xl text-xs resize-none"
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
           if (confirm("Deseja realmente remover esta cotação?")) {
             deleteQuoteMutation.mutate(managingQuote!.id);
           }
         }}
         className="text-destructive text-xs rounded-xl h-10 hover:bg-destructive/10 cursor-pointer"
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
           className="rounded-xl text-xs h-10 px-4 cursor-pointer"
         >
           Cancelar
         </Button>
         <Button
           type="button"
           size="sm"
           disabled={updateQuoteMutation.isPending}
           onClick={() => updateQuoteMutation.mutate()}
           className="rounded-xl text-xs h-10 px-5 font-bold bg-primary text-primary-foreground cursor-pointer"
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
 title="Painel de Cotações & Leads de Turismo"
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
 </div>
 </NicheOperationalGuard>
 );
}
