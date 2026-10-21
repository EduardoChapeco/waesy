import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Phone,
  MapPin,
  Calendar,
  Users,
  Copy,
  ExternalLink,
  Plus,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Check,
  SlidersHorizontal,
  DollarSign,
  MessageSquare,
  Archive,
  UserCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  listOpportunityMatchesFn,
  listTravelInterestsFn,
  listCommercialContactsFn,
  upsertCommercialContactFn,
  upsertTravelInterestFn,
  recordCommercialInteractionFn,
  promoteOpportunityToCrmLeadFn,
} from "@/services/travel-commercial-intelligence.functions";
import { getStoreSettings } from "@/services/store.functions";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet, type MetricCardItem } from "@/components/workspace/workspace-dashboard-sheet";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/turismo/oportunidades")({
  head: () => ({
    meta: [{ title: "Radar Comercial & Oportunidades | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const [matches, interests, contacts, store] = await Promise.all([
        listOpportunityMatchesFn({ data: { minScore: 50, limit: 100 } }).catch(() => []),
        listTravelInterestsFn({ data: { limit: 100 } }).catch(() => []),
        listCommercialContactsFn({ data: { limit: 100 } }).catch(() => []),
        getStoreSettings().catch(() => null),
      ]);
      return { matches, interests, contacts, store };
    } catch (err) {
      console.error("[loader:workspace.turismo.oportunidades] Fallback:", err);
      return { matches: [], interests: [], contacts: [], store: null };
    }
  },
  component: WorkspaceTurismoOportunidadesPage,
});

type ActiveTab = "opportunities" | "interests" | "contacts";

export default function WorkspaceTurismoOportunidadesPage() {
  const { matches: initialMatches, interests: initialInterests, contacts: initialContacts, store } =
    (Route.useLoaderData?.() as any) || {};

  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>("opportunities");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isNewInterestOpen, setIsNewInterestOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  // Queries TanStack
  const { data: matches = initialMatches || [] } = useQuery({
    queryKey: ["travel-opportunities", statusFilter],
    queryFn: () => listOpportunityMatchesFn({ data: { status: statusFilter, minScore: 50, limit: 100 } }),
    initialData: initialMatches,
  });

  const { data: interests = initialInterests || [] } = useQuery({
    queryKey: ["travel-interests", statusFilter],
    queryFn: () => listTravelInterestsFn({ data: { status: statusFilter, limit: 100 } }),
    initialData: initialInterests,
  });

  const { data: contacts = initialContacts || [] } = useQuery({
    queryKey: ["commercial-contacts"],
    queryFn: () => listCommercialContactsFn({ data: { limit: 100 } }),
    initialData: initialContacts,
  });

  // Mutações
  const recordInteractionMutation = useMutation({
    mutationFn: recordCommercialInteractionFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-opportunities"] });
      toast.success("Interação registrada com sucesso");
    },
    onError: (err: any) => {
      toast.error(`Falha ao registrar: ${err.message}`);
    },
  });

  const promoteToCrmMutation = useMutation({
    mutationFn: promoteOpportunityToCrmLeadFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["travel-interests"] });
      toast.success("Oportunidade promovida ao CRM com sucesso!");
      setSelectedMatch(null);
    },
    onError: (err: any) => {
      toast.error(`Falha ao promover: ${err.message}`);
    },
  });

  // Métricas
  const highPriorityCount = useMemo(
    () => matches.filter((m: any) => m.matchScore >= 80).length,
    [matches]
  );
  const approachedCount = useMemo(
    () => matches.filter((m: any) => m.status === "approached").length,
    [matches]
  );
  const promotedCount = useMemo(
    () => matches.filter((m: any) => m.status === "promoted_to_crm").length,
    [matches]
  );

  const metricCards: MetricCardItem[] = [
    {
      title: "Alta Prioridade",
      value: highPriorityCount.toString(),
      trend: { value: "Compatibilidade ≥ 80%", isPositive: true },
      variant: "success",
    },
    {
      title: "Abordagens Ativas",
      value: approachedCount.toString(),
      trend: { value: "WhatsApp enviado", isPositive: true },
      variant: "default",
    },
    {
      title: "Promovidos ao CRM",
      value: promotedCount.toString(),
      trend: { value: "Negociações abertas", isPositive: true },
      variant: "success",
    },
    {
      title: "Intenções Monitoradas",
      value: interests.length.toString(),
      trend: { value: "Memória comercial anual" },
      variant: "default",
    },
  ];

  // Filtros
  const filteredMatches = useMemo(() => {
    return matches.filter((m: any) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        m.contact?.name?.toLowerCase().includes(q) ||
        m.offerSnapshot?.title?.toLowerCase().includes(q) ||
        m.offerSnapshot?.destinationCity?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "high_priority" && m.matchScore >= 80) ||
        m.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [matches, search, statusFilter]);

  const handleCopyApproach = (match: any) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(match.approachDraft);
      toast.success("Rascunho WhatsApp copiado para a área de transferência!");
      recordInteractionMutation.mutate({
        data: {
          matchId: match.id,
          status: "approached",
          approachNotes: "Copy copiado para envio pelo corretor",
        },
      });
    }
  };

  const handleOpenWhatsApp = (match: any) => {
    const rawPhone = match.contact?.phone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("Telefone do passageiro não cadastrado");
      return;
    }
    const encodedText = encodeURIComponent(match.approachDraft);
    const url = `https://wa.me/55${cleanPhone}?text=${encodedText}`;
    window.open(url, "_blank", "noopener,noreferrer");
    recordInteractionMutation.mutate({
      data: {
        matchId: match.id,
        status: "approached",
        approachNotes: "WhatsApp disparado diretamente pelo navegador",
      },
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-24">
      {/* Barra de Topo Canônica do Workspace */}
      <WorkspaceCanonicalToolbar
        title="Radar Comercial & Oportunidades"
        searchPlaceholder="Buscar por viajante, destino ou pacote..."
        searchValue={search}
        onSearchChange={setSearch}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        primaryAction={{
          label: "Novo Interesse",
          icon: Plus,
          onClick: () => setIsNewInterestOpen(true),
        }}
      />

      {/* Navegação entre Abas */}
      <div className="px-4 py-2 border-b border-border bg-card/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "opportunities" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("opportunities")}
            className="h-11 min-h-11 px-4 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Sparkles className="size-4 mr-2" />
            Oportunidades do Radar ({matches.length})
          </Button>
          <Button
            variant={activeTab === "interests" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("interests")}
            className="h-11 min-h-11 px-4 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Calendar className="size-4 mr-2" />
            Backlog de Interesses ({interests.length})
          </Button>
          <Button
            variant={activeTab === "contacts" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("contacts")}
            className="h-11 min-h-11 px-4 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Users className="size-4 mr-2" />
            Contatos Pré-CRM ({contacts.length})
          </Button>
        </div>

        {/* Filtro de Status para Oportunidades */}
        {activeTab === "opportunities" && (
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 h-11 min-h-11 bg-background text-sm">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Oportunidades</SelectItem>
                <SelectItem value="high_priority">Alta Prioridade (&ge; 80%)</SelectItem>
                <SelectItem value="new">Novas Detectadas</SelectItem>
                <SelectItem value="approached">Abordadas</SelectItem>
                <SelectItem value="promoted_to_crm">Promovidas ao CRM</SelectItem>
                <SelectItem value="dismissed">Descartadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        {activeTab === "opportunities" && (
          <div className="space-y-4">
            {filteredMatches.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-border flex flex-col items-center justify-center">
                <Sparkles className="size-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground">Nenhuma oportunidade encontrada</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                  Quando novas ofertas de pacotes forem publicadas ou importadas, o motor determinístico cruzará os
                  dados com o backlog de interesses e exibirá as combinações aqui.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setIsNewInterestOpen(true)}
                  className="mt-6 h-11 min-h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-4 mr-2" />
                  Cadastrar Primeiro Interesse
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMatches.map((m: any) => (
                  <Card
                    key={m.id}
                    className={cn(
                      "p-4 border transition-colors flex flex-col justify-between",
                      m.matchScore >= 80
                        ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60"
                        : "border-border bg-card hover:border-border/80"
                    )}
                  >
                    <div>
                      {/* Cabeçalho do Card com Score */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge
                          variant={m.matchScore >= 80 ? "default" : "secondary"}
                          className={cn(
                            "px-3 py-1 font-semibold text-xs tracking-wide",
                            m.matchScore >= 80
                              ? "bg-emerald-600 text-primary-foreground"
                              : "bg-muted text-foreground"
                          )}
                        >
                          {m.matchScore}% Compatibilidade
                        </Badge>
                        <Badge variant="outline" className="text-xs uppercase font-medium">
                          {m.status === "promoted_to_crm"
                            ? "Promovido"
                            : m.status === "approached"
                            ? "Abordado"
                            : "Novo"}
                        </Badge>
                      </div>

                      {/* Dados do Viajante e Destino */}
                      <h4 className="text-base font-semibold text-foreground break-words text-wrap leading-tight">
                        {m.contact?.name || "Passageiro Interessado"}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="size-3" />
                        {m.contact?.phone || "Telefone não informado"}
                      </p>

                      <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="size-4 text-primary shrink-0 mt-1" />
                          <div className="text-sm font-medium text-foreground break-words text-wrap leading-tight">
                            {m.offerSnapshot?.title || "Pacote de Viagem"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="size-3.5 shrink-0" />
                          <span>{m.offerSnapshot?.datesDisplayText || "Período flexível"}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                          <DollarSign className="size-3.5 text-emerald-600 shrink-0" />
                          <span>
                            {m.offerSnapshot?.installmentCount}x de{" "}
                            {formatMoney(m.offerSnapshot?.installmentCents || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações Rápidas */}
                    <div className="mt-6 pt-3 border-t border-border flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleOpenWhatsApp(m)}
                        className="flex-1 h-11 min-h-11 font-medium bg-emerald-600 hover:bg-emerald-700 text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <MessageSquare className="size-4 mr-2" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyApproach(m)}
                        aria-label="Copiar texto de abordagem"
                        className="h-11 min-h-11 px-3 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedMatch(m)}
                        aria-label="Ver detalhes da compatibilidade"
                        className="h-11 min-h-11 px-3 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <SlidersHorizontal className="size-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aba 2: Backlog de Interesses */}
        {activeTab === "interests" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {interests.map((it: any) => (
                <Card key={it.id} className="p-4 border border-border bg-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {it.urgency === "immediate"
                          ? "Urgente"
                          : it.urgency === "future_trip"
                          ? "Futura (12m)"
                          : "Explorando"}
                      </Badge>
                      <Badge
                        variant={it.status === "matched" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {it.status === "matched" ? "Match Ativo" : it.status}
                      </Badge>
                    </div>

                    <h4 className="text-base font-semibold text-foreground break-words text-wrap leading-tight">
                      {it.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Viajante: <strong className="text-foreground">{it.contact?.name}</strong> (
                      {it.contact?.phone})
                    </p>

                    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <p>
                        Destinos:{" "}
                        <strong className="text-foreground">{it.destinations?.join(", ")}</strong>
                      </p>
                      <p>
                        Composição:{" "}
                        <strong className="text-foreground">
                          {it.party?.adults || 2} Adultos
                          {it.party?.children ? `, ${it.party.children} Crianças` : ""}
                        </strong>
                      </p>
                      {it.budget?.maxInstallmentCents && (
                        <p>
                          Teto da Parcela:{" "}
                          <strong className="text-foreground">
                            {formatMoney(it.budget.maxInstallmentCents)} /mês
                          </strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
                    <span>Expira em: {new Date(it.expiresAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Aba 3: Contatos Pré-CRM */}
        {activeTab === "contacts" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts.map((c: any) => (
                <Card key={c.id} className="p-4 border border-border bg-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">
                        {c.preferredChannel}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {c.status}
                      </Badge>
                    </div>
                    <h4 className="text-base font-semibold text-foreground break-words text-wrap leading-tight">
                      {c.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Phone className="size-3" />
                      {c.phone}
                    </p>
                    {c.city && <p className="text-xs text-muted-foreground mt-1">{c.city}</p>}
                    {c.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic bg-muted/30 p-2 rounded">
                        "{c.notes}"
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                    {c.linkedCrmLeadId ? (
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Vinculado ao CRM
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Pré-CRM (Intenção Leve)</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sheet de Inspeção da Oportunidade */}
      <Sheet open={Boolean(selectedMatch)} onOpenChange={() => setSelectedMatch(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-6 space-y-6">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Detalhamento de Compatibilidade
            </SheetTitle>
            <SheetDescription>
              Decomposição determinística das 5 dimensões e copy de abordagem consultivo.
            </SheetDescription>
          </SheetHeader>

          {selectedMatch && (
            <div className="space-y-6">
              {/* Resumo do Match */}
              <div className="p-4 bg-muted/40 rounded-lg space-y-2 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Score Final Composto</span>
                  <Badge
                    variant={selectedMatch.matchScore >= 80 ? "default" : "secondary"}
                    className="text-sm font-bold px-3 py-1 bg-emerald-600 text-primary-foreground"
                  >
                    {selectedMatch.matchScore}/100 Pts
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Passageiro: <strong>{selectedMatch.contact?.name}</strong> ({selectedMatch.contact?.phone})
                </p>
                <p className="text-xs text-muted-foreground">
                  Pacote: <strong>{selectedMatch.offerSnapshot?.title}</strong>
                </p>
              </div>

              {/* Decomposição das 5 Dimensões */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Decomposição Algébrica</h4>
                <div className="space-y-2">
                  {(selectedMatch.dimensions || []).map((d: any) => (
                    <div key={d.dimension} className="p-3 bg-card border border-border rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold uppercase text-muted-foreground">
                          {d.dimension === "destination"
                            ? "Destino"
                            : d.dimension === "budget"
                            ? "Orçamento & Parcela"
                            : d.dimension === "dates"
                            ? "Datas & Temporada"
                            : d.dimension === "party"
                            ? "Composição Familiar"
                            : "Inclusões Solicitadas"}
                        </span>
                        <span className="font-bold text-foreground">
                          {d.score} / {d.weight} pts
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{d.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rascunho de Abordagem WhatsApp */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Rascunho Consultivo WhatsApp</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyApproach(selectedMatch)}
                    className="h-11 min-h-11 px-3 text-xs focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Copy className="size-3.5 mr-1" /> Copiar Texto
                  </Button>
                </div>
                <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs font-mono whitespace-pre-wrap text-foreground max-h-48 overflow-y-auto">
                  {selectedMatch.approachDraft}
                </div>
              </div>

              {/* Ações Finais */}
              <div className="pt-4 border-t border-border flex flex-col gap-3">
                <Button
                  onClick={() => handleOpenWhatsApp(selectedMatch)}
                  className="w-full h-11 min-h-11 bg-emerald-600 hover:bg-emerald-700 text-primary-foreground font-medium focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MessageSquare className="size-4 mr-2" />
                  Abrir Conversa no WhatsApp
                </Button>

                <Button
                  variant="outline"
                  onClick={() =>
                    promoteToCrmMutation.mutate({
                      data: {
                        matchId: selectedMatch.id,
                        notes: "Promovido via Radar Comercial pelo corretor.",
                      },
                    })
                  }
                  disabled={promoteToCrmMutation.isPending || selectedMatch.status === "promoted_to_crm"}
                  className="w-full h-11 min-h-11 font-medium focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <UserCheck className="size-4 mr-2" />
                  {selectedMatch.status === "promoted_to_crm"
                    ? "Já Promovido ao CRM"
                    : "Promover Oportunidade ao CRM Formal"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet de Cadastro de Novo Interesse */}
      <NewInterestSheet
        open={isNewInterestOpen}
        onOpenChange={setIsNewInterestOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["travel-interests"] });
          queryClient.invalidateQueries({ queryKey: ["travel-opportunities"] });
          queryClient.invalidateQueries({ queryKey: ["commercial-contacts"] });
          setIsNewInterestOpen(false);
        }}
      />

      {/* Sheet de Métricas Dashboard */}
      <WorkspaceDashboardSheet
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        title="Painel de Métricas do Radar Comercial"
        description="Acompanhamento em tempo real da memória de intenções e conversão de oportunidades."
        metrics={metricCards}
      />
    </div>
  );
}

// ============================================================================
// COMPONENTE: FORMULÁRIO DE NOVO INTERESSE COMERCIAL
// ============================================================================

interface NewInterestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function NewInterestSheet({ open, onOpenChange, onSuccess }: NewInterestSheetProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [destinations, setDestinations] = useState("");
  const [title, setTitle] = useState("");
  const [targetMonth, setTargetMonth] = useState("2026-07");
  const [maxInstallment, setMaxInstallment] = useState("");
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !destinations.trim()) {
      toast.error("Preencha nome, telefone e ao menos um destino");
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Criar ou atualizar contato pré-CRM
      const contact = await upsertCommercialContactFn({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          preferredChannel: "whatsapp",
          status: "active",
          notes: notes.trim() || null,
        },
      });

      const destList = destinations
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      const installmentCents = maxInstallment ? Math.round(parseFloat(maxInstallment) * 100) : null;

      // 2. Criar interesse de viagem
      await upsertTravelInterestFn({
        data: {
          contactId: contact.id,
          title: title.trim() || `${destList[0]} em Família`,
          destinations: destList,
          dates: {
            flexibility: "specific_month",
            targetMonths: [targetMonth],
          },
          party: {
            adults: parseInt(adults, 10) || 2,
            children: parseInt(children, 10) || 0,
            childrenAges: [],
            roomConfiguration: "family",
          },
          budget: {
            maxInstallmentCents: installmentCents,
            preferredInstallments: 12,
            priceBasisPreference: "per_person",
          },
          inclusionsWanted: ["all_inclusive", "aereo_incluso"],
          urgency: "moderate",
          sourceInquiryText: notes.trim() || null,
        },
      });

      toast.success("Interesse registrado com sucesso na memória comercial!");
      setName("");
      setPhone("");
      setDestinations("");
      setTitle("");
      setMaxInstallment("");
      setNotes("");
      onSuccess();
    } catch (err: any) {
      toast.error(`Falha ao registrar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-6 space-y-6">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            Novo Interesse Comercial
          </SheetTitle>
          <SheetDescription>
            Cadastre a intenção de viagem do passageiro para monitoramento e matching automático de ofertas.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passenger-name">Nome do Viajante *</Label>
            <Input
              id="passenger-name"
              placeholder="Ex: Mariana Souza"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 min-h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passenger-phone">Telefone / WhatsApp *</Label>
            <Input
              id="passenger-phone"
              placeholder="Ex: (49) 98877-6655"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 min-h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="travel-title">Título do Projeto de Viagem</Label>
            <Input
              id="travel-title"
              placeholder="Ex: Férias de Julho em Família no Caribe"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 min-h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="travel-destinations">Destinos Aceitos (separados por vírgula) *</Label>
            <Input
              id="travel-destinations"
              placeholder="Ex: Punta Cana, Cancún, Caribe, Maceió"
              value={destinations}
              onChange={(e) => setDestinations(e.target.value)}
              className="h-11 min-h-11"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target-month">Mês Alvo Previsto</Label>
              <Input
                id="target-month"
                type="month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="h-11 min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-installment">Teto Parcela (R$/mês)</Label>
              <Input
                id="max-installment"
                type="number"
                placeholder="Ex: 800"
                value={maxInstallment}
                onChange={(e) => setMaxInstallment(e.target.value)}
                className="h-11 min-h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="party-adults">Adultos</Label>
              <Input
                id="party-adults"
                type="number"
                min="1"
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                className="h-11 min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="party-children">Crianças</Label>
              <Input
                id="party-children"
                type="number"
                min="0"
                value={children}
                onChange={(e) => setChildren(e.target.value)}
                className="h-11 min-h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inquiry-notes">Observações do Atendimento</Label>
            <Textarea
              id="inquiry-notes"
              placeholder="Ex: Preferem resort pé na areia com recreação infantil para 2 crianças de 5 e 8 anos."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-24"
            />
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 min-h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 min-h-11 px-6 font-medium focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isSubmitting ? "Salvando..." : "Salvar no Backlog"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
