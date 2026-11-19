import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
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
  RefreshCw,
  AlertTriangle,
  Calculator,
  X,
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
import { TravelAiImporterBanner } from "@/components/tourism/promotional-flyer/travel-ai-importer-banner";
import { WhatsAppGroupIngestModal } from "@/components/commercial/whatsapp-group-ingest-modal";
import {
  publishExtractedTravelPackageToCatalogAndMatchRadar,
  type ExtractedTravelAdDTO,
} from "@/services/travel-ai-extractor.functions";
import { Switch } from "@/components/ui/switch";
import { CurrencyField } from "@/components/ui/currency-field";
import {
  listUnifiedRadarOpportunitiesFn,
  reEvaluateUnifiedRadarFn,
  updateUnifiedOpportunityStatusFn,
  analyzeIncomingOfferAgainstPipelineFn,
  type UnifiedRadarOpportunityItem,
  type IncomingOfferPipelineAnalysis,
} from "@/services/opportunity-radar.functions";
import { DestinationTagsPicker } from "@/components/tourism/shared/destination-tags-picker";
import { TravelPeriodTagsPicker } from "@/components/tourism/shared/travel-period-tags-picker";
import { RoomOccupancyBuilder } from "@/components/tourism/shared/room-occupancy-builder";
import { TravelIntentAiImporter } from "@/components/tourism/shared/travel-intent-ai-importer";
import type {
  StructuredDestinationTag,
  StructuredPeriodSpec,
  StructuredRoomOccupancy,
} from "@/lib/travel/opportunity-matching-engine";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

function mapUnifiedItemToUiMatch(item: UnifiedRadarOpportunityItem) {
  return {
    id: item.id,
    originTable: item.originTable,
    sourceType: item.sourceType,
    leadId: item.leadId,
    interestId: item.interestId,
    matchScore: item.matchScore,
    matchTier: item.matchTier,
    status: item.normalizedStatus,
    rawStatus: item.rawStatus,
    requiresChildRequote: item.requiresChildRequote,
    alreadyProposedRecently: item.alreadyProposedRecently,
    childSimulation: item.childSimulation,
    historicalCheck: item.historicalCheck,
    matchReasons: item.matchReasons,
    warnings: item.warnings,
    customerRoomsSummary: item.customerRoomsSummary,
    approachDraft: item.whatsappPitchDraft,
    dimensions: item.matchReasons.map((r, i) => ({
      dimension: i === 0 ? "destination" : "budget",
      weight: 35,
      score: 35,
      details: r,
    })),
    contact: {
      name: item.customerName,
      phone: item.customerPhone,
    },
    offerSnapshot: {
      title: item.offerTitle,
      destinationCity: item.destinationCity,
      datesDisplayText: item.departureDate || item.customerPeriodLabel || "Período definido",
      totalPriceCents: item.quotedTotalCents,
      effectiveTotalCents: item.effectiveTotalCents,
      installmentCount: null as number | null,
      installmentCents: 0,
    },
    createdAt: item.createdAt,
  };
}

export const Route = createFileRoute("/workspace/turismo/oportunidades")({
  head: () => ({
    meta: [{ title: "Radar Comercial & Oportunidades | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const [unifiedRes, interests, contacts, store] = await Promise.all([
        listUnifiedRadarOpportunitiesFn({
          data: { statusFilter: "all", sourceTypeFilter: "all", limit: 150 },
        }).catch(() => ({ items: [], totalCount: 0 })),
        listTravelInterestsFn({ data: { limit: 100 } }).catch(() => []),
        listCommercialContactsFn({ data: { limit: 100 } }).catch(() => []),
        getStoreSettings().catch(() => null),
      ]);
      const matches = (unifiedRes.items || []).map(mapUnifiedItemToUiMatch);
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
  const [sourceTypeFilter, setSourceTypeFilter] = useState("all");
  const [isReevaluating, setIsReevaluating] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isNewInterestOpen, setIsNewInterestOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isOcrScannerOpen, setIsOcrScannerOpen] = useState(false);
  const [isOfferAnalyzerOpen, setIsOfferAnalyzerOpen] = useState(false);
  const [isWhatsAppExtensionOpen, setIsWhatsAppExtensionOpen] = useState(false);
  const [boardGrouping, setBoardGrouping] = useState<"stage" | "month" | "destination" | "temperature" | "grid">("stage");
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  const handleOcrOfferExtractedAndMatch = async (extracted: ExtractedTravelAdDTO) => {
    try {
      const res = await publishExtractedTravelPackageToCatalogAndMatchRadar({
        data: extracted,
      });
      toast.success(
        `Oferta "${res.offer.title}" publicada! ${res.radarMatchesFound} match(es) gerados no Radar e ${res.matchedCrmLeadsCount} lead(s) compatíveis.`,
      );
      queryClient.invalidateQueries({ queryKey: ["travel-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["unified-radar-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["travel-interests"] });
      setIsOcrScannerOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Falha ao cruzar oferta extraída com o Radar.");
    }
  };

  // Queries TanStack (Unificando Leads/Propostas/Capturas + Pacotes)
  const {
    data: matches = initialMatches || [],
    isLoading: isLoadingRadar,
    isError: isErrorRadar,
    refetch: refetchRadar,
  } = useQuery({
    queryKey: ["unified-radar-opportunities", statusFilter, sourceTypeFilter],
    queryFn: async () => {
      const res = await listUnifiedRadarOpportunitiesFn({
        data: {
          statusFilter:
            statusFilter === "high_priority" ? "all" : (statusFilter as any),
          sourceTypeFilter: sourceTypeFilter as any,
          limit: 150,
        },
      });
      return (res.items || []).map(mapUnifiedItemToUiMatch);
    },
    initialData: initialMatches,
  });

  const handleReevaluateRadar = async () => {
    setIsReevaluating(true);
    try {
      const res = await reEvaluateUnifiedRadarFn({ data: { maxSuppliesToScan: 30 } });
      await queryClient.invalidateQueries({ queryKey: ["unified-radar-opportunities"] });
      toast.success(
        `Radar reavaliado: ${res.scannedSupplies} oferta(s)/proposta(s) cruzadas, ${res.totalMatchesFound} oportunidade(s) verificadas.`
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao reavaliar radar.");
    } finally {
      setIsReevaluating(false);
    }
  };

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
    mutationFn: async (vars: {
      data: {
        matchId: string;
        originTable?: "travel_opportunities" | "travel_opportunity_matches";
        status: "reviewed" | "approached" | "dismissed" | "restore";
        approachNotes?: string;
      };
    }) => {
      if (vars.data.originTable === "travel_opportunities") {
        return updateUnifiedOpportunityStatusFn({
          data: {
            opportunityId: vars.data.matchId,
            originTable: "travel_opportunities",
            action: vars.data.status,
          },
        });
      }
      return recordCommercialInteractionFn({
        data: {
          matchId: vars.data.matchId,
          status: vars.data.status === "restore" ? "reviewed" : vars.data.status,
          approachNotes: vars.data.approachNotes,
        },
      });
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["unified-radar-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["travel-opportunities"] });
      if (vars.data.status === "dismissed") {
        toast.success("Oportunidade descartada.", {
          duration: 7000,
          action: {
            label: "Desfazer",
            onClick: () =>
              recordInteractionMutation.mutate({
                data: {
                  matchId: vars.data.matchId,
                  originTable: vars.data.originTable,
                  status: "restore",
                  approachNotes: "Restaurado pelo operador",
                },
              }),
          },
        });
      } else {
        toast.success(
          vars.data.status === "restore" ? "Oportunidade restaurada!" : "Interação registrada com sucesso"
        );
      }
    },
    onError: (err: any) => {
      toast.error(`Falha ao registrar: ${err.message}`);
    },
  });

  const handleDismissMatch = (match: any) => {
    recordInteractionMutation.mutate({
      data: {
        matchId: match.id,
        originTable: match.originTable,
        status: "dismissed",
        approachNotes: "Descartado pelo corretor no Radar",
      },
    });
    if (selectedMatch?.id === match.id) {
      setSelectedMatch(null);
    }
  };

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
        { id: "new", title: "Novas Detectadas", icon: TrendingUp },
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
        { id: "low", title: "Em Monitoramento (50–59%)", icon: CheckCircle2 },
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
          originTable: match.originTable,
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
        originTable: match.originTable,
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
      <div className="px-4 py-2 border-b border-border bg-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={activeTab === "opportunities" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("opportunities")}
            className="h-11 min-h-11 px-4 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <TrendingUp className="size-4 mr-2" />
            Radar ({matches.length})
          </Button>
          <Button
            variant={activeTab === "interests" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("interests")}
            className="h-11 min-h-11 px-4 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Calendar className="size-4 mr-2" />
            Interesses ({interests.length})
          </Button>
          <Button
            variant={activeTab === "contacts" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("contacts")}
            className="h-11 min-h-11 px-4 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Users className="size-4 mr-2" />
            Pré-CRM ({contacts.length})
          </Button>
          <Button
            variant={isOcrScannerOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setIsOcrScannerOpen((prev) => !prev)}
            className="h-11 min-h-11 px-4 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Upload className="size-4 mr-2" />
            Escanear OCR
          </Button>
          <Button
            variant={isOfferAnalyzerOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setIsOfferAnalyzerOpen(true)}
            className="h-11 min-h-11 px-4 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Calculator className="size-4 mr-2" />
            Analisar Orçamento
          </Button>
          <Button
            variant={isWhatsAppExtensionOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setIsWhatsAppExtensionOpen(true)}
            className="h-11 min-h-11 px-4 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Phone className="size-4 mr-2 text-success" />
            WhatsApp
          </Button>
        </div>

        {/* Filtro de Status e Agrupamento para Oportunidades */}
        {activeTab === "opportunities" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Agrupamento Multi-Board */}
            <div className="flex flex-wrap items-center gap-1 border border-border rounded-lg p-1 bg-muted/20">
              <Button
                variant={boardGrouping === "stage" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBoardGrouping("stage")}
                className="h-11 min-h-11 px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Columns className="size-3.5 mr-1" />
                Funil
              </Button>
              <Button
                variant={boardGrouping === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBoardGrouping("month")}
                className="h-11 min-h-11 px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Calendar className="size-3.5 mr-1" />
                Mês
              </Button>
              <Button
                variant={boardGrouping === "destination" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBoardGrouping("destination")}
                className="h-11 min-h-11 px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MapPin className="size-3.5 mr-1" />
                Destino
              </Button>
              <Button
                variant={boardGrouping === "temperature" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBoardGrouping("temperature")}
                className="h-11 min-h-11 px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring"
              >
                <TrendingUp className="size-3.5 mr-1" />
                Score
              </Button>
              <Button
                variant={boardGrouping === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBoardGrouping("grid")}
                className="h-11 min-h-11 px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LayoutGrid className="size-3.5 mr-1" />
                Grade
              </Button>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filtrar por status" className="w-full sm:w-48 h-11 min-h-11 bg-background text-sm">
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

            <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
              <SelectTrigger aria-label="Filtrar por origem" className="w-full sm:w-48 h-11 min-h-11 bg-background text-sm">
                <SelectValue placeholder="Origem da Oferta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                <SelectItem value="proposal">Propostas Enviadas</SelectItem>
                <SelectItem value="quote_capture">Capturas InfoTravel</SelectItem>
                <SelectItem value="catalog_package">Pacotes / Ofertas</SelectItem>
                <SelectItem value="agency_quote">Cotações Salvas</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              disabled={isReevaluating}
              onClick={handleReevaluateRadar}
              className="h-11 min-h-11 px-4 text-xs font-medium gap-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className={cn("size-4 motion-reduce:animate-none", isReevaluating && "animate-spin motion-reduce:animate-none")} />
              <span>{isReevaluating ? "Reavaliando..." : "Reavaliar Radar"}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 w-full space-y-4">
        {isOcrScannerOpen && (
          <TravelAiImporterBanner onExtracted={handleOcrOfferExtractedAndMatch} />
        )}

        {activeTab === "opportunities" && (
          <div className="space-y-4">
            {isLoadingRadar && matches.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((k) => (
                  <Card key={k} className="p-4 h-48 animate-pulse motion-reduce:animate-none bg-muted/30" />
                ))}
              </div>
            ) : isErrorRadar && matches.length === 0 ? (
              <Card className="p-8 text-center border-destructive/40 flex flex-col items-center gap-3">
                <AlertTriangle className="size-8 text-destructive" />
                <p className="text-sm font-medium text-foreground">Falha ao carregar o Radar.</p>
                <Button variant="outline" onClick={() => refetchRadar()} className="h-11 min-h-11 px-4">
                  Tentar Novamente
                </Button>
              </Card>
            ) : filteredMatches.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-border flex flex-col items-center justify-center">
                <TrendingUp className="size-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground">Nenhuma oportunidade encontrada</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                  Quando novas ofertas de pacotes forem publicadas ou importadas, o motor determinístico cruzará os
                  dados com o backlog de interesses e exibirá as combinações aqui.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                  <Button
                    variant="default"
                    onClick={() => setIsNewInterestOpen(true)}
                    className="h-11 min-h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="size-4 mr-2" />
                    Novo Interesse
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsBulkImportOpen(true)}
                    className="h-11 min-h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Upload className="size-4 mr-2" />
                    Importar Lote
                  </Button>
                </div>
              </Card>
            ) : boardColumns ? (
              <div className="tab-list flex items-start gap-4 overflow-x-auto pb-6 no-scrollbar">
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
                      <div className="flex flex-col gap-3 overflow-y-auto max-h-screen pr-1">
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
                              onDismiss={handleDismissMatch}
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
                    onDismiss={handleDismissMatch}
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
                      <span className="text-success font-medium flex items-center gap-1">
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
              <TrendingUp className="size-5 text-primary" />
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
                    variant={selectedMatch.matchScore >= 80 ? "success" : "secondary"}
                    className="text-sm font-bold px-3 py-1"
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

              {/* Decomposição das 5 Dimensões + Simulação Infantil & Histórico */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Critérios & Verificação do Match</h4>

                {selectedMatch.childSimulation?.applied && (
                  <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">Simulação de Crianças (0–17a)</span>
                      <Badge variant="warning" className="text-xs">
                        {formatMoney(selectedMatch.childSimulation.simulatedTotalCents || 0)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedMatch.childSimulation.reasonPt}</p>
                    {Array.isArray(selectedMatch.childSimulation.perChildBreakdown) &&
                      selectedMatch.childSimulation.perChildBreakdown.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-border/50">
                          {selectedMatch.childSimulation.perChildBreakdown.map((ch: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                Criança {idx + 1}: {ch.bandLabel}
                              </span>
                              <span className="font-mono font-semibold text-foreground">
                                {formatMoney(ch.estimatedCostCents || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                )}

                {selectedMatch.historicalCheck && selectedMatch.historicalCheck.sampleCount >= 2 && (
                  <div className="p-3 bg-muted/30 border border-border rounded-lg space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">Comparativo Histórico</span>
                      <Badge
                        variant={selectedMatch.historicalCheck.verdict === "great_deal" ? "success" : "secondary"}
                        className="text-xs"
                      >
                        {selectedMatch.historicalCheck.historicalSavingsPct != null
                          ? `${selectedMatch.historicalCheck.historicalSavingsPct > 0 ? "-" : "+"}${Math.abs(Math.round(selectedMatch.historicalCheck.historicalSavingsPct))}% vs mediana`
                          : "Alinhado"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedMatch.historicalCheck.verdictLabelPt}</p>
                  </div>
                )}

                {selectedMatch.alreadyProposedRecently && (
                  <div className="p-3 bg-warning/15 border border-warning/30 rounded-lg flex items-start gap-2 text-xs text-warning-strong">
                    <AlertTriangle className="size-3.5 shrink-0 mt-1" />
                    <span>Este cliente já recebeu uma proposta ou abordagem recente para o mesmo destino.</span>
                  </div>
                )}

                {Array.isArray(selectedMatch.warnings) && selectedMatch.warnings.length > 0 && (
                  <div className="p-3 bg-warning/15 border border-warning/30 rounded-lg space-y-1">
                    {selectedMatch.warnings.map((w: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-warning-strong">
                        <AlertTriangle className="size-3.5 shrink-0 mt-1" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  {(selectedMatch.dimensions || []).map((d: any, idx: number) => (
                    <div key={`${d.dimension}-${idx}`} className="p-3 bg-card border border-border rounded-lg space-y-1">
                      <p className="text-xs text-foreground">{d.details}</p>
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
                  className="w-full h-11 min-h-11 bg-primary text-primary-foreground font-medium focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MessageSquare className="size-4 mr-2" />
                  Abrir Conversa no WhatsApp
                </Button>

                {selectedMatch.leadId ? (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-11 min-h-11 font-medium focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Link to="/workspace/turismo" search={{ leadId: selectedMatch.leadId } as any}>
                      <ExternalLink className="size-4 mr-2" />
                      Abrir no Funil
                    </Link>
                  </Button>
                ) : (
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
                      ? "Já no CRM"
                      : "Promover ao CRM"}
                  </Button>
                )}

                {selectedMatch.status !== "dismissed" && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleDismissMatch(selectedMatch)}
                    disabled={recordInteractionMutation.isPending}
                    className="w-full h-11 min-h-11 text-destructive hover:text-destructive hover:bg-destructive/10 font-medium focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-4 mr-2" />
                    Descartar
                  </Button>
                )}
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

      {/* Modal de Análise de Orçamento x Pipeline */}
      <OfferAnalyzerSheet
        open={isOfferAnalyzerOpen}
        onOpenChange={setIsOfferAnalyzerOpen}
        onPersisted={() => {
          queryClient.invalidateQueries({ queryKey: ["unified-radar-opportunities"] });
          queryClient.invalidateQueries({ queryKey: ["travel-opportunities"] });
        }}
      />

      {/* Modal de Gestão de Integração da Extensão WhatsApp */}
      <WhatsAppGroupIngestModal
        isOpen={isWhatsAppExtensionOpen}
        onClose={() => setIsWhatsAppExtensionOpen(false)}
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
  const [destinationTags, setDestinationTags] = useState<StructuredDestinationTag[]>([]);
  const [title, setTitle] = useState("");
  const [periodSpec, setPeriodSpec] = useState<StructuredPeriodSpec>({
    mode: "month_list",
    targetMonths: ["2026-07"],
    seasonTags: [],
    flexibilityDays: 3,
    flexibleAnytime: false,
  });
  const [roomOccupancies, setRoomOccupancies] = useState<StructuredRoomOccupancy[]>([
    { roomNumber: 1, roomLabel: "Quarto 1", adultsCount: 2, childrenCount: 0, childrenAges: [] },
  ]);
  const [maxTotalBudget, setMaxTotalBudget] = useState("");
  const [maxInstallment, setMaxInstallment] = useState("");
  const [notes, setNotes] = useState("");
  const [rawMarkdown, setRawMarkdown] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || destinationTags.length === 0) {
      toast.error("Preencha nome, telefone e selecione ao menos um destino da lista");
      return;
    }

    try {
      setIsSubmitting(true);

      const contact = await upsertCommercialContactFn({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          preferredChannel: "whatsapp",
          status: "active",
          notes: notes.trim() || null,
        },
      });

      const destList = destinationTags.map((d) => d.label);
      const installmentCents = maxInstallment ? Math.round(parseFloat(maxInstallment) * 100) : null;
      const totalCents = maxTotalBudget ? Math.round(parseFloat(maxTotalBudget) * 100) : null;
      const totalAdults = roomOccupancies.reduce((sum, r) => sum + (r.adultsCount || 1), 0);
      const allChildrenAges = roomOccupancies.flatMap((r) => r.childrenAges || []);

      const mappedFlex =
        periodSpec.mode === "flexible_anytime" || periodSpec.flexibleAnytime
          ? "flexible_anytime"
          : periodSpec.startDate
            ? "exact_dates"
            : periodSpec.seasonTags.length > 0 && periodSpec.targetMonths.length === 0
              ? "specific_season"
              : "specific_month";

      await upsertTravelInterestFn({
        data: {
          contactId: contact.id,
          title: title.trim() || `${destList[0]} em Família`,
          destinations: destList,
          destinationTags,
          periodTags: periodSpec.seasonTags,
          flexibilityDays: periodSpec.flexibilityDays,
          roomOccupancies,
          rawIntentMarkdown: rawMarkdown.trim() || null,
          dates: {
            flexibility: mappedFlex,
            targetMonths: periodSpec.targetMonths,
            exactDepartureDate: periodSpec.startDate || null,
            exactReturnDate: periodSpec.endDate || null,
          },
          party: {
            adults: totalAdults || 2,
            children: allChildrenAges.length,
            childrenAges: allChildrenAges,
            roomConfiguration: roomOccupancies.length > 1 ? "custom" : "family",
          },
          budget: {
            maxTotalBudgetCents: totalCents,
            maxInstallmentCents: installmentCents,
            preferredInstallments: 12,
            priceBasisPreference: "total_package",
          },
          inclusionsWanted: ["all_inclusive", "aereo_incluso"],
          urgency: "moderate",
          sourceInquiryText: notes.trim() || rawMarkdown.trim() || null,
        },
      });

      toast.success("Interesse estruturado salvo e cruzado com ofertas ativas!");
      setName("");
      setPhone("");
      setDestinationTags([]);
      setTitle("");
      setMaxTotalBudget("");
      setMaxInstallment("");
      setNotes("");
      setRawMarkdown("");
      setPeriodSpec({
        mode: "month_list",
        targetMonths: ["2026-07"],
        seasonTags: [],
        flexibilityDays: 3,
        flexibleAnytime: false,
      });
      setRoomOccupancies([
        { roomNumber: 1, roomLabel: "Quarto 1", adultsCount: 2, childrenCount: 0, childrenAges: [] },
      ]);
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
            Cadastre destinos, período, quartos e idades (0–17 anos) para matching real sem falsos positivos.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <TravelIntentAiImporter
            mode="lead_intent"
            onApply={(parsed) => {
              if (parsed.contact.fullName) setName(parsed.contact.fullName);
              if (parsed.contact.whatsapp) setPhone(parsed.contact.whatsapp);
              if (parsed.destinations.length > 0) setDestinationTags(parsed.destinations);
              if (parsed.period.mode !== "unspecified") setPeriodSpec(parsed.period);
              if (parsed.rooms.length > 0) setRoomOccupancies(parsed.rooms);
              if (parsed.preferences.summaryTitle) setTitle(parsed.preferences.summaryTitle);
              if (parsed.budget.maxTotalBudgetCents) {
                setMaxTotalBudget(String(Math.round(parsed.budget.maxTotalBudgetCents / 100)));
              }
              if (parsed.budget.maxInstallmentCents) {
                setMaxInstallment(String(Math.round(parsed.budget.maxInstallmentCents / 100)));
              }
              setRawMarkdown(parsed.rawMarkdownPreserved);
              if (!notes) setNotes(parsed.rawMarkdownPreserved);
              toast.success("Campos preenchidos a partir do texto!");
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="travel-title">Título do Projeto de Viagem</Label>
            <Input
              id="travel-title"
              placeholder="Ex: Férias de Julho em Família no Nordeste"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 min-h-11"
            />
          </div>

          <DestinationTagsPicker
            value={destinationTags}
            onChange={setDestinationTags}
          />

          <TravelPeriodTagsPicker
            value={periodSpec}
            onChange={setPeriodSpec}
          />

          <RoomOccupancyBuilder
            value={roomOccupancies}
            onChange={setRoomOccupancies}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-total-budget">Orçamento Total (R$)</Label>
              <Input
                id="max-total-budget"
                type="number"
                placeholder="Ex: 12000"
                value={maxTotalBudget}
                onChange={(e) => setMaxTotalBudget(e.target.value)}
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

          <div className="space-y-2">
            <Label htmlFor="inquiry-notes">Observações do Atendimento</Label>
            <Textarea
              id="inquiry-notes"
              placeholder="Preferências de hotel, embarque, observações do cliente..."
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
  onDismiss: (match: any) => void;
}

function OpportunityMatchCard({
  match,
  onOpenWhatsApp,
  onCopyApproach,
  onInspect,
  onDismiss,
}: OpportunityMatchCardProps) {
  const isHighPriority = match.matchScore >= 80;

  return (
    <Card
      className={cn(
        "p-4 border transition-colors flex flex-col justify-between rounded-xl",
        isHighPriority
          ? "border-success/40 bg-success/5 hover:border-success/60"
          : "border-border bg-card hover:border-border/80"
      )}
    >
      <div>
        {/* Cabeçalho do Card com Score & Origem */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <Badge variant={isHighPriority ? "success" : "secondary"} className="px-3 py-1 font-semibold text-xs">
            {Math.round(Number(match.matchScore || 0))}% Match
          </Badge>
          <div className="flex items-center gap-2">
            {match.sourceType && (
              <Badge variant="outline" className="text-xs font-medium">
                {match.sourceType === "proposal"
                  ? "Proposta"
                  : match.sourceType === "quote_capture"
                    ? "Captura"
                    : match.sourceType === "agency_quote"
                      ? "Cotação"
                      : "Pacote"}
              </Badge>
            )}
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
        </div>

        {/* Dados do Viajante e Destino */}
        <h4 className="text-base font-semibold text-foreground break-words leading-tight">
          {match.contact?.name || "Passageiro Interessado"}
        </h4>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Phone className="size-3" />
          {match.contact?.phone || "Telefone não informado"}
        </p>

        <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-primary shrink-0 mt-1" />
            <div className="text-sm font-medium text-foreground break-words leading-tight">
              {match.offerSnapshot?.title || "Pacote de Viagem"}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" />
            <span>{match.offerSnapshot?.datesDisplayText || "Período flexível"}</span>
          </div>

          {match.customerRoomsSummary && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="size-3.5 shrink-0" />
              <span>{match.customerRoomsSummary}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground">
            <DollarSign className="size-3.5 text-primary shrink-0" />
            {match.offerSnapshot?.installmentCount && match.offerSnapshot?.installmentCents ? (
              <span>
                {match.offerSnapshot.installmentCount}x de{" "}
                {formatMoney(match.offerSnapshot.installmentCents)}
              </span>
            ) : (
              <span>
                {match.requiresChildRequote ? "Simulado " : ""}
                {formatMoney(match.offerSnapshot?.effectiveTotalCents || match.offerSnapshot?.totalPriceCents || 0)}
              </span>
            )}
            {match.requiresChildRequote && (
              <Badge variant="warning" className="text-xs">Simulação CHD</Badge>
            )}
            {match.historicalCheck?.historicalSavingsPct != null &&
              Number(match.historicalCheck.historicalSavingsPct) >= 8 && (
                <Badge variant="success" className="text-xs">
                  -{Math.round(Number(match.historicalCheck.historicalSavingsPct))}% histórico
                </Badge>
              )}
            {match.alreadyProposedRecently && (
              <Badge variant="outline" className="text-xs text-warning-strong border-warning/40">
                Proposta recente
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Ações Rápidas com Touch Target Piso 44px */}
      <div className="mt-5 pt-3 border-t border-border flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onOpenWhatsApp(match)}
          className="flex-1 h-11 min-h-11 font-medium bg-success hover:bg-success/90 text-success-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
        {match.status !== "dismissed" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(match)}
            aria-label="Descartar oportunidade"
            className="h-11 min-h-11 px-3 text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </Button>
        )}
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
      childrenAges: number[];
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
      const col7 = parts[7]?.trim() || "";
      const col8 = parts[8]?.trim() || "";
      const looksLikeAges = /^\d+(?:[;|/\s]+\d+)*$/.test(col7);
      const agesToken = col8 ? col7 : looksLikeAges ? col7 : "";
      const childrenAges = agesToken
        ? agesToken
            .split(/[;|/\s]+/)
            .map((n) => parseInt(n.trim(), 10))
            .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 17)
        : [];
      const notes = col8 || (!looksLikeAges && col7 ? col7 : undefined);

      result.push({
        name,
        phone,
        destinations: destinations.length > 0 ? destinations : [destRaw],
        targetMonth,
        maxInstallmentCents,
        adults,
        children: Math.max(children, childrenAges.length),
        childrenAges,
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
              <code className="text-foreground">Nome, WhatsApp, Destinos, Mês (YYYY-MM), Parcela Máx, Adultos, Crianças, Idades (ex: 5;11), Notas</code>
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
                    "Mariana Souza, 49999112233, Punta Cana/Caribe, 2026-07, 800, 2, 2, 5;11, Resort all inclusive\nCarlos Eduardo, 49988223344, Cancún, 2026-09, 750, 2, 0, , Lua de mel\nLuciana Prado, 49991556677, Maceió/Nordeste, 2026-10, 500, 2, 1, 8, Férias em família"
                  )
                }
                className="h-11 min-h-11 px-3 text-xs text-primary"
              >
                Inserir Exemplo
              </Button>
            </div>
            <Textarea
              id="raw-text-input"
              placeholder="Exemplo: Mariana Souza, 49999112233, Punta Cana, 2026-07, 800, 2, 2, 5;11"
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
                      <th className="p-2">Grupo / Idades</th>
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
                        <td className="p-2 text-muted-foreground">
                          {item.adults} ADT{item.children > 0 ? ` + ${item.children} CHD` : ""}
                          {item.childrenAges.length > 0 ? ` (${item.childrenAges.join(", ")}a)` : ""}
                        </td>
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

// ============================================================================
// COMPONENTE: ANALISADOR DE ORÇAMENTO RECEBIDO X PIPELINE + HISTÓRICO + CHD
// ============================================================================

interface OfferAnalyzerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersisted: () => void;
}

function OfferAnalyzerSheet({ open, onOpenChange, onPersisted }: OfferAnalyzerSheetProps) {
  const analyzerId = useId();
  const [title, setTitle] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [quotedAdultsCount, setQuotedAdultsCount] = useState(2);
  const [quotedChildAgesRaw, setQuotedChildAgesRaw] = useState("");
  const [totalPriceCents, setTotalPriceCents] = useState<number>(0);
  const [airfarePerAdultCents, setAirfarePerAdultCents] = useState<number>(0);
  const [transferPerAdultCents, setTransferPerAdultCents] = useState<number>(0);
  const [persistMatches, setPersistMatches] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<IncomingOfferPipelineAnalysis | null>(null);

  const parsedQuotedChildAges = useMemo(() => {
    return quotedChildAgesRaw
      .split(/[,;\s/|]+/)
      .map((t) => parseInt(t.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 17)
      .slice(0, 12);
  }, [quotedChildAgesRaw]);

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationCity.trim() || destinationCity.trim().length < 2) {
      toast.error("Informe o destino da cotação recebida.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await analyzeIncomingOfferAgainstPipelineFn({
        data: {
          title: title.trim() || undefined,
          destinationCity: destinationCity.trim(),
          originCity: originCity.trim() || undefined,
          departureDate: departureDate.trim() || undefined,
          returnDate: returnDate.trim() || undefined,
          quotedAdultsCount: Math.max(1, Number(quotedAdultsCount) || 2),
          quotedChildrenAges: parsedQuotedChildAges,
          totalPriceCents: Math.max(0, Number(totalPriceCents) || 0),
          airfarePerAdultCents: airfarePerAdultCents > 0 ? airfarePerAdultCents : undefined,
          transferPerAdultCents: transferPerAdultCents > 0 ? transferPerAdultCents : undefined,
          persistMatches,
          minScore: 55,
        },
      });
      setAnalysis(res);
      if (persistMatches && res.persistedCount > 0) {
        toast.success(`${res.persistedCount} oportunidade(s) gravadas no Radar!`);
        onPersisted();
      } else {
        toast.success(`${res.matchedCount} lead(s) compatíveis encontrados no funil.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Falha ao analisar orçamento contra o Radar.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6 space-y-6">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            <Calculator className="size-5 text-primary" />
            <span>Analisar Orçamento Recebido</span>
          </SheetTitle>
          <SheetDescription>
            Compare com o histórico de preços da agência e simule tarifas CHD (2–11a) contra todo o funil de leads.
          </SheetDescription>
        </SheetHeader>

        <TravelIntentAiImporter
          mode="offer_quote"
          onApply={(parsed) => {
            if (parsed.destinations[0]) {
              setDestinationCity(parsed.destinations[0].city || parsed.destinations[0].label);
            }
            if (parsed.period.startDate) setDepartureDate(parsed.period.startDate);
            if (parsed.period.endDate) setReturnDate(parsed.period.endDate);
            if (parsed.preferences.summaryTitle) setTitle(parsed.preferences.summaryTitle);
            if (parsed.rooms.length > 0) {
              const adts = parsed.rooms.reduce((s, r) => s + r.adultsCount, 0);
              const chds = parsed.rooms.flatMap((r) => r.childrenAges || []);
              if (adts > 0) setQuotedAdultsCount(adts);
              if (chds.length > 0) setQuotedChildAgesRaw(chds.join(", "));
            }
            if (parsed.budget.maxTotalBudgetCents) {
              setTotalPriceCents(parsed.budget.maxTotalBudgetCents);
            }
            toast.success("Dados extraídos para análise!");
          }}
        />

        <form onSubmit={handleRunAnalysis} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`${analyzerId}-dest`}>Destino *</Label>
              <Input
                id={`${analyzerId}-dest`}
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
                placeholder="Ex: Maceió ou Punta Cana"
                className="h-11 min-h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${analyzerId}-origin`}>Origem (Opcional)</Label>
              <Input
                id={`${analyzerId}-origin`}
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                placeholder="Ex: XAP / FLN / GRU"
                className="h-11 min-h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`${analyzerId}-start`}>Data Ida</Label>
              <Input
                id={`${analyzerId}-start`}
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="h-11 min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${analyzerId}-end`}>Data Volta</Label>
              <Input
                id={`${analyzerId}-end`}
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="h-11 min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${analyzerId}-title`}>Título da Oferta</Label>
              <Input
                id={`${analyzerId}-title`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Promo Aéreo + Resort"
                className="h-11 min-h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`${analyzerId}-adults`}>Adultos na Cotação</Label>
              <Input
                id={`${analyzerId}-adults`}
                type="number"
                min={1}
                max={20}
                value={quotedAdultsCount}
                onChange={(e) => setQuotedAdultsCount(Math.max(1, Number(e.target.value) || 2))}
                className="h-11 min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${analyzerId}-chd`}>Idades Crianças Cotadas (Opcional)</Label>
              <Input
                id={`${analyzerId}-chd`}
                value={quotedChildAgesRaw}
                onChange={(e) => setQuotedChildAgesRaw(e.target.value)}
                placeholder="Ex: 5, 11"
                className="h-11 min-h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`${analyzerId}-total`}>Valor Total Cotado (R$)</Label>
              <CurrencyField
                id={`${analyzerId}-total`}
                value={totalPriceCents || undefined}
                onChange={(v) => setTotalPriceCents(v ?? 0)}
                placeholder="0,00"
                className="h-11 min-h-11 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${analyzerId}-airfare`}>Aéreo p/ Adulto (Sim. CHD)</Label>
              <CurrencyField
                id={`${analyzerId}-airfare`}
                value={airfarePerAdultCents || undefined}
                onChange={(v) => setAirfarePerAdultCents(v ?? 0)}
                placeholder="0,00"
                className="h-11 min-h-11 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${analyzerId}-transfer`}>Transfer p/ Adulto</Label>
              <CurrencyField
                id={`${analyzerId}-transfer`}
                value={transferPerAdultCents || undefined}
                onChange={(v) => setTransferPerAdultCents(v ?? 0)}
                placeholder="0,00"
                className="h-11 min-h-11 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3">
            <Label htmlFor={`${analyzerId}-persist`} className="text-xs font-medium text-foreground cursor-pointer">
              Salvar matches detectados no painel Radar
            </Label>
            <Switch
              id={`${analyzerId}-persist`}
              checked={persistMatches}
              onCheckedChange={setPersistMatches}
            />
          </div>

          <Button
            type="submit"
            disabled={isAnalyzing}
            className="w-full h-11 min-h-11 font-semibold focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isAnalyzing ? "Analisando..." : "Simular Radar"}
          </Button>
        </form>

        {analysis && (
          <div className="space-y-4 pt-4 border-t border-border">
            {analysis.historicalCheck && (
              <div className="p-4 rounded-xl bg-muted/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">Termômetro Histórico do Destino</span>
                  <Badge
                    variant={analysis.historicalCheck.verdict === "great_deal" ? "success" : "secondary"}
                    className="text-xs"
                  >
                    {analysis.historicalCheck.sampleCount >= 2 && analysis.historicalCheck.historicalSavingsPct != null
                      ? `${analysis.historicalCheck.historicalSavingsPct > 0 ? "-" : "+"}${Math.abs(Math.round(analysis.historicalCheck.historicalSavingsPct))}% vs mediana`
                      : `${analysis.historicalCheck.sampleCount} amostras`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{analysis.historicalCheck.verdictLabelPt}</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">
                  Leads Compatíveis ({analysis.matchedCount} de {analysis.evaluatedDemandsCount} avaliados)
                </span>
                <span className="font-mono text-muted-foreground">
                  Base adulto: {formatMoney(analysis.perAdultCents)}
                </span>
              </div>

              {analysis.matchedLeads.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground rounded-lg bg-muted/20">
                  Nenhum lead atingiu score mínimo com os critérios de destino, datas e ocupação informados.
                </div>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                  {analysis.matchedLeads.map((lead, idx) => {
                    const cleanPhone = (lead.whatsapp || "").replace(/\D/g, "");
                    return (
                      <div key={`${lead.leadId || lead.interestId || lead.fullName}-${idx}`} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{lead.fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {lead.roomsSummary || lead.destinationRequested}
                            </p>
                          </div>
                          <Badge variant={lead.matchScore >= 80 ? "success" : "secondary"} className="text-xs shrink-0">
                            {Math.round(lead.matchScore)}% Match
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-foreground">
                            {lead.requiresChildRequote ? "Simulado CHD: " : "Total: "}
                            {formatMoney(lead.effectiveTotalCents)}
                          </span>
                          {lead.clientBudgetCents != null && lead.clientBudgetCents > 0 && (
                            <Badge variant="outline" className="text-2xs">
                              Verba: {formatMoney(lead.clientBudgetCents)}
                            </Badge>
                          )}
                          {lead.requiresChildRequote && (
                            <Badge variant="warning" className="text-2xs">Recotar CHD</Badge>
                          )}
                          {lead.alreadyProposedRecently && (
                            <Badge variant="outline" className="text-2xs text-warning-strong border-warning/40">
                              Proposta recente
                            </Badge>
                          )}
                        </div>

                        {lead.childSimulation?.applied && (
                          <p className="text-xs text-muted-foreground">{lead.childSimulation.reasonPt}</p>
                        )}

                        {lead.reasons.length > 0 && (
                          <p className="text-2xs text-muted-foreground">{lead.reasons.slice(0, 3).join(" · ")}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {cleanPhone && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                window.open(
                                  `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(lead.suggestedPitchPt)}`,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }}
                              className="h-11 min-h-11 px-3 bg-success hover:bg-success/90 text-success-foreground text-xs"
                            >
                              <MessageSquare className="size-3.5 mr-2" />
                              WhatsApp
                            </Button>
                          )}
                          {lead.leadId && (
                            <Button
                              asChild
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-11 min-h-11 px-3 text-xs"
                            >
                              <Link to="/workspace/turismo" search={{ leadId: lead.leadId } as any}>
                                <ExternalLink className="size-3.5 mr-2" />
                                Abrir Lead
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
