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
  Upload,
  LayoutGrid,
  Columns,
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
  bulkImportInterestsFn,
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
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [boardGrouping, setBoardGrouping] = useState<"stage" | "month" | "destination" | "temperature" | "grid">("stage");
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

  const boardColumns = useMemo(() => {
    if (boardGrouping === "grid") return null;

    if (boardGrouping === "stage") {
      const stages = [
        { id: "new", title: "Novas Detectadas", icon: Sparkles },
        { id: "approached", title: "Abordadas (WhatsApp)", icon: Phone },
        { id: "engaged", title: "Em Conversa", icon: MessageSquare },
        { id: "promoted_to_crm", title: "Promovidas ao CRM", icon: UserCheck },
        { id: "dismissed", title: "Descartadas", icon: Archive },
      ];
      return stages.map((st) => ({
        ...st,
        matches: filteredMatches.filter((m: any) => m.status === st.id),
      }));
    }

    if (boardGrouping === "temperature") {
      const temps = [
        { id: "high", title: "Alta Prioridade (≥ 80%)", icon: TrendingUp },
        { id: "medium", title: "Média Prioridade (60–79%)", icon: SlidersHorizontal },
        { id: "low", title: "Em Monitoramento (50–59%)", icon: Sparkles },
      ];
      return temps.map((t) => ({
        ...t,
        matches: filteredMatches.filter((m: any) => {
          if (t.id === "high") return m.matchScore >= 80;
          if (t.id === "medium") return m.matchScore >= 60 && m.matchScore < 80;
          return m.matchScore < 60;
        }),
      }));
    }

    if (boardGrouping === "destination") {
      const map: Record<string, any[]> = {};
      filteredMatches.forEach((m: any) => {
        const dest = m.offerSnapshot?.destinationCity || m.offerSnapshot?.title || "Outros Destinos";
        if (!map[dest]) map[dest] = [];
        map[dest].push(m);
      });
      return Object.entries(map).map(([dest, list]) => ({
        id: dest,
        title: dest,
        icon: MapPin,
        matches: list,
      }));
    }

    if (boardGrouping === "month") {
      const map: Record<string, any[]> = {};
      filteredMatches.forEach((m: any) => {
        const month = m.offerSnapshot?.datesDisplayText || "Período Flexível";
        if (!map[month]) map[month] = [];
        map[month].push(m);
      });
      return Object.entries(map).map(([month, list]) => ({
        id: month,
        title: month,
        icon: Calendar,
        matches: list,
      }));
    }

    return null;
  }, [filteredMatches, boardGrouping]);

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
        secondaryAction={{
          label: "Importar Lote",
          icon: Upload,
          onClick: () => setIsBulkImportOpen(true),
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

        {/* Filtro de Status e Agrupamento para Oportunidades */}
        {activeTab === "opportunities" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Agrupamento Multi-Board */}
            <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-muted/20">
              <Button
                variant={boardGrouping === "stage" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBoardGrouping("stage")}
                className="h-9 px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Columns className="size-3.5 mr-1" />
                Funil
              </Button>
              <Button
                variant={boardGrouping === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBoardGrouping("month")}
                className="h-9 px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Calendar className="size-3.5 mr-1" />
                Mês
              </Button>
              <Button
                variant={boardGrouping === "destination" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBoardGrouping("destination")}
                className="h-9 px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MapPin className="size-3.5 mr-1" />
                Destino
              </Button>
              <Button
                variant={boardGrouping === "temperature" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBoardGrouping("temperature")}
                className="h-9 px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring"
              >
                <TrendingUp className="size-3.5 mr-1" />
                Score
              </Button>
              <Button
                variant={boardGrouping === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBoardGrouping("grid")}
                className="h-9 px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LayoutGrid className="size-3.5 mr-1" />
                Grade
              </Button>
            </div>

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
                <div className="flex items-center gap-3 mt-6">
                  <Button
                    variant="default"
                    onClick={() => setIsNewInterestOpen(true)}
                    className="h-11 min-h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="size-4 mr-2" />
                    Cadastrar Primeiro Interesse
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsBulkImportOpen(true)}
                    className="h-11 min-h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Upload className="size-4 mr-2" />
                    Importar Lista em Lote
                  </Button>
                </div>
              </Card>
            ) : boardColumns ? (
              <div className="flex items-start gap-4 overflow-x-auto pb-6 no-scrollbar">
                {boardColumns.map((col) => {
                  const Icon = col.icon;
                  return (
                    <div
                      key={col.id}
                      className="flex-1 min-w-72 max-w-sm bg-muted/20 border border-border/60 rounded-xl p-3 flex flex-col gap-3 shrink-0"
                    >
                      {/* Header da Coluna */}
                      <div className="flex items-center justify-between pb-2 border-b border-border/40">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="size-4 text-primary shrink-0" />
                          <span className="font-semibold text-sm text-foreground truncate">{col.title}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs px-2 py-1 shrink-0 font-bold">
                          {col.matches.length}
                        </Badge>
                      </div>

                      {/* Lista de Cards da Coluna */}
                      <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                        {col.matches.length === 0 ? (
                          <div className="p-6 text-center text-xs text-muted-foreground italic border border-dashed border-border/40 rounded-lg">
                            Nenhuma oportunidade nesta coluna
                          </div>
                        ) : (
                          col.matches.map((m: any) => (
                            <OpportunityMatchCard
                              key={m.id}
                              match={m}
                              onOpenWhatsApp={handleOpenWhatsApp}
                              onCopyApproach={handleCopyApproach}
                              onInspect={setSelectedMatch}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMatches.map((m: any) => (
                  <OpportunityMatchCard
                    key={m.id}
                    match={m}
                    onOpenWhatsApp={handleOpenWhatsApp}
                    onCopyApproach={handleCopyApproach}
                    onInspect={setSelectedMatch}
                  />
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

      {/* Sheet de Importação em Lote */}
      <BulkImportSheet
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["travel-interests"] });
          queryClient.invalidateQueries({ queryKey: ["travel-opportunities"] });
          queryClient.invalidateQueries({ queryKey: ["commercial-contacts"] });
          setIsBulkImportOpen(false);
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

// ============================================================================
// COMPONENTE: CARD DA OPORTUNIDADE (RADAR COMERCIAL)
// ============================================================================

interface OpportunityMatchCardProps {
  match: any;
  onOpenWhatsApp: (match: any) => void;
  onCopyApproach: (match: any) => void;
  onInspect: (match: any) => void;
}

function OpportunityMatchCard({
  match,
  onOpenWhatsApp,
  onCopyApproach,
  onInspect,
}: OpportunityMatchCardProps) {
  const isHighPriority = match.matchScore >= 80;

  return (
    <Card
      className={cn(
        "p-4 border transition-colors flex flex-col justify-between rounded-xl",
        isHighPriority
          ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60"
          : "border-border bg-card hover:border-border/80"
      )}
    >
      <div>
        {/* Cabeçalho do Card com Score */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge
            variant={isHighPriority ? "default" : "secondary"}
            className={cn(
              "px-3 py-1 font-semibold text-xs tracking-wide",
              isHighPriority
                ? "bg-emerald-600 text-primary-foreground"
                : "bg-muted text-foreground"
            )}
          >
            {match.matchScore}% Compatibilidade
          </Badge>
          <Badge variant="outline" className="text-xs uppercase font-medium">
            {match.status === "promoted_to_crm"
              ? "Promovido"
              : match.status === "approached"
              ? "Abordado"
              : match.status === "engaged"
              ? "Em Conversa"
              : match.status === "dismissed"
              ? "Descartado"
              : "Novo"}
          </Badge>
        </div>

        {/* Dados do Viajante e Destino */}
        <h4 className="text-base font-semibold text-foreground break-words text-wrap leading-tight">
          {match.contact?.name || "Passageiro Interessado"}
        </h4>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Phone className="size-3" />
          {match.contact?.phone || "Telefone não informado"}
        </p>

        <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-primary shrink-0 mt-1" />
            <div className="text-sm font-medium text-foreground break-words text-wrap leading-tight">
              {match.offerSnapshot?.title || "Pacote de Viagem"}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" />
            <span>{match.offerSnapshot?.datesDisplayText || "Período flexível"}</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <DollarSign className="size-3.5 text-emerald-600 shrink-0" />
            <span>
              {match.offerSnapshot?.installmentCount}x de{" "}
              {formatMoney(match.offerSnapshot?.installmentCents || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Ações Rápidas com Touch Target Piso 44px */}
      <div className="mt-5 pt-3 border-t border-border flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onOpenWhatsApp(match)}
          className="flex-1 h-11 min-h-11 font-medium bg-emerald-600 hover:bg-emerald-700 text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageSquare className="size-4 mr-2" />
          WhatsApp
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopyApproach(match)}
          aria-label="Copiar texto de abordagem"
          className="h-11 min-h-11 px-3 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Copy className="size-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onInspect(match)}
          aria-label="Ver detalhes da compatibilidade"
          className="h-11 min-h-11 px-3 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SlidersHorizontal className="size-4" />
        </Button>
      </div>
    </Card>
  );
}

// ============================================================================
// COMPONENTE: IMPORTAÇÃO EM LOTE DE CONTATOS & INTERESSES (PRÉ-CRM)
// ============================================================================

interface BulkImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function BulkImportSheet({ open, onOpenChange, onSuccess }: BulkImportSheetProps) {
  const [rawText, setRawText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parser em tempo real
  const parsedItems = useMemo(() => {
    if (!rawText.trim()) return [];
    const lines = rawText.split("\n");
    const result: Array<{
      name: string;
      phone: string;
      destinations: string[];
      targetMonth?: string;
      maxInstallmentCents?: number;
      adults: number;
      children: number;
      notes?: string;
    }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;

      const parts = trimmed.includes("\t")
        ? trimmed.split("\t")
        : trimmed.includes(";")
        ? trimmed.split(";")
        : trimmed.split(",");

      if (parts.length < 2) continue;

      const name = parts[0]?.trim();
      const phone = parts[1]?.trim();
      if (!name || !phone) continue;

      const destRaw = parts[2]?.trim() || "Caribe";
      const destinations = destRaw
        .split("/")
        .map((d) => d.trim())
        .filter(Boolean);

      const targetMonth = parts[3]?.trim() || undefined;
      const installmentRaw = parts[4]?.replace(/[^\d.]/g, "") || "";
      const maxInstallmentCents = installmentRaw
        ? Math.round(parseFloat(installmentRaw) * 100)
        : undefined;

      const adults = parseInt(parts[5]?.trim() || "2", 10) || 2;
      const children = parseInt(parts[6]?.trim() || "0", 10) || 0;
      const notes = parts[7]?.trim() || undefined;

      result.push({
        name,
        phone,
        destinations: destinations.length > 0 ? destinations : [destRaw],
        targetMonth,
        maxInstallmentCents,
        adults,
        children,
        notes,
      });
    }

    return result;
  }, [rawText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        toast.success(`Arquivo ${file.name} carregado com sucesso!`);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedItems.length === 0) {
      toast.error("Nenhum contato válido detectado para importação.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await bulkImportInterestsFn({
        data: {
          items: parsedItems,
        },
      });

      toast.success(
        `Importação concluída! ${res.importedContacts} contatos e ${res.importedInterests} interesses registrados. ${res.matchesEvaluated} pacotes avaliados no radar.`
      );
      setRawText("");
      onSuccess();
    } catch (err: any) {
      toast.error(`Falha ao importar lote: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6 space-y-6">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            <Upload className="size-5 text-primary" />
            Importação em Lote de Contatos & Interesses
          </SheetTitle>
          <SheetDescription>
            Importe listas de atendimentos e passageiros anteriores para a memória comercial pré-CRM.
            Zero poluição no CRM principal e auto-matching com as ofertas ativas.
          </SheetDescription>
        </SheetHeader>

        {/* Upload de Arquivo CSV ou Textarea */}
        <div className="space-y-4">
          <div className="p-4 bg-muted/30 border border-dashed border-border rounded-xl space-y-2">
            <Label htmlFor="csv-file-input" className="text-xs font-semibold text-foreground">
              Carregar Arquivo CSV ou Planilha de Contatos
            </Label>
            <Input
              id="csv-file-input"
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="h-11 min-h-11 cursor-pointer bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Formato esperado por linha:{" "}
              <code className="text-foreground">Nome, WhatsApp, Destinos, Mês (YYYY-MM), Parcela Máx, Adultos, Crianças, Notas</code>
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="raw-text-input" className="text-xs font-semibold text-foreground">
                Ou cole linhas de contatos diretamente:
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setRawText(
                    "Mariana Souza, 49999112233, Punta Cana/Caribe, 2026-07, 800, 2, 2, Resort all inclusive\nCarlos Eduardo, 49988223344, Cancún, 2026-09, 750, 2, 0, Lua de mel\nLuciana Prado, 49991556677, Maceió/Nordeste, 2026-10, 500, 2, 1, Férias em família"
                  )
                }
                className="h-8 px-2 text-xs text-primary"
              >
                Inserir Exemplo
              </Button>
            </div>
            <Textarea
              id="raw-text-input"
              placeholder="Exemplo: Mariana Souza, 49999112233, Punta Cana, 2026-07, 800, 2, 2"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="min-h-36 font-mono text-xs"
            />
          </div>

          {/* Prévia dos registros detectados */}
          {parsedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  Registros Válidos Detectados: {parsedItems.length}
                </span>
                <Badge variant="outline" className="text-xs">
                  Pré-CRM Protegido
                </Badge>
              </div>

              <div className="max-h-48 overflow-y-auto border border-border rounded-lg bg-card">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground sticky top-0">
                    <tr>
                      <th className="p-2">Nome</th>
                      <th className="p-2">Telefone</th>
                      <th className="p-2">Destino</th>
                      <th className="p-2">Mês</th>
                      <th className="p-2">Parcela Máx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-2 font-medium text-foreground">{item.name}</td>
                        <td className="p-2 font-mono text-muted-foreground">{item.phone}</td>
                        <td className="p-2">{item.destinations.join(", ")}</td>
                        <td className="p-2 text-muted-foreground">{item.targetMonth || "Qualquer"}</td>
                        <td className="p-2 font-medium">
                          {item.maxInstallmentCents ? formatMoney(item.maxInstallmentCents) : "Livre"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
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
              onClick={handleExecuteImport}
              disabled={isSubmitting || parsedItems.length === 0}
              className="h-11 min-h-11 px-6 font-medium focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isSubmitting ? "Importando..." : `Importar ${parsedItems.length} Registros`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
