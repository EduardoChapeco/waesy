import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Activity,
  BrainCircuit,
  Users,
  Search,
  Rocket,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  History,
  TrendingUp,
  MessageSquare,
  Handshake,
  CalendarClock,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  listResearchSessions,
  createSimLabExperiment,
  executeSimLabBatchSimulation,
  fetchSyntheticArchetypes,
  runSimLabClosedLoopCalibration,
  MUNICIPALITY_DEMOGRAPHIC_PRESETS,
} from "@/services/simlab.functions";

export type ResearchTab = "market" | "brand" | "planning";
export type ArenaResultTab = "swarm" | "econometrics" | "social_feed" | "p2p_chronos";

interface TabItem {
  id: ResearchTab;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  moduleType: string;
  stimulusType: string;
}

const TAB_CONFIG: TabItem[] = [
  {
    id: "market",
    label: "Pesquisa de Mercado",
    icon: Search,
    placeholder:
      "Ex: Pacote Turístico Fim de Semana ou Produto Premium com bônus de lançamento e garantia de 30 dias...",
    moduleType: "market_research",
    stimulusType: "product_hypothesis",
  },
  {
    id: "brand",
    label: "Posicionamento & Copy",
    icon: Activity,
    placeholder:
      "Ex: Nova campanha de tráfego pago focada em famílias e produtores da região com desconto no PIX...",
    moduleType: "brand_audit",
    stimulusType: "brand_tone",
  },
  {
    id: "planning",
    label: "Elasticidade & Go-To-Market",
    icon: Rocket,
    placeholder:
      "Ex: Meta de vender 50 unidades este mês combinando Instagram Reels, WhatsApp e parcelamento em 6x...",
    moduleType: "strategic_planning",
    stimulusType: "campaign_brief",
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  queued: { label: "Na fila", color: "text-primary", icon: Clock },
  running: { label: "Simulando", color: "text-warning", icon: Loader2 },
  completed: {
    label: "Concluído",
    color: "text-success",
    icon: CheckCircle2,
  },
  failed: { label: "Falhou", color: "text-destructive", icon: XCircle },
  cancelled: { label: "Cancelado", color: "text-muted-foreground", icon: XCircle },
};

export interface SimResearchRun {
  id: string;
  title: string;
  objective: string;
  municipality?: string;
  test_price_brl?: number | null;
  module_type?: string;
  stimulus_type?: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  summary_insight?: string;
  evidence_level?: string;
  calibration_status?: string;
  econometrics?: {
    synthetic_nps: number | null;
    overall_approval_rate: number | null;
    rejection_rate: number | null;
    mean_intent_percent: number | null;
    median_intent_percent: number | null;
    mode_intent_percent: number | null;
    std_dev_intent: number | null;
    mode_reservation_price_brl: number | null;
    optimal_price_point_brl: number | null;
    price_elasticity_score: number | null;
    estimated_conversion_range: [number, number] | null;
    demand_curve_points: Array<{
      price_multiplier: number;
      tested_price_brl: number;
      conversion_probability_percent: number;
      expected_buyers_per_100: number;
      expected_revenue_per_100_brl: number;
      is_optimal?: boolean;
    }>;
    chronos_temporal_cascade: Array<{
      day_milestone: number;
      phase_title: string;
      adoption_rate_percent: number;
      cumulative_buyers_per_100: number;
      word_of_mouth_multiplier: number;
      ad_fatigue_index: number;
      dominant_narrative: string;
      expected_cumulative_revenue_brl: number;
    }>;
    social_virality_index: number | null;
    p2p_clearing_price_brl: number | null;
    scientific_verdict: string;
    top_3_buying_triggers: string[];
    top_3_friction_barriers: string[];
    reviewer_reports: Array<{
      reviewer_name: string;
      role: string;
      credibility_score: number;
      critique: string;
      detected_biases: string[];
      status: string;
    }>;
    recommended_actions: Array<{
      title: string;
      description: string;
      priority: string;
    }>;
    calibration_ledger?: Record<string, any> | null;
  };
  execution_results?: Array<{
    persona_name: string;
    social_class?: string;
    municipality?: string;
    net_income_brl?: number | null;
    discretionary_surplus_brl?: number | null;
    purchase_intent?: number | null;
    interest_score?: number | null;
    net_utility_mcfadden?: number | null;
    affordability_score?: number | null;
    discretionary_burden_percent?: number | null;
    reservation_price_brl?: number | null;
    system_1_emotion?: string | null;
    price_perception?: string | null;
    primary_hook_detected?: string | null;
    primary_barrier_objection?: string | null;
    social_feed_comment?: string | null;
    social_feed_reaction?: string | null;
    p2p_initial_offer_brl?: number | null;
    p2p_walkaway_price_brl?: number | null;
    bargaining_strategy?: string | null;
    feedback: string;
    response_origin?: string;
  }>;
  created_at?: string;
}

const MUNICIPALITY_OPTIONS = Object.keys(MUNICIPALITY_DEMOGRAPHIC_PRESETS);

function RunHistoryItem({
  run,
  isSelected,
  onClick,
  className,
}: {
  run: SimResearchRun;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}) {
  const status = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.completed;
  const StatusIcon = status.icon;
  const isActive = run.status === "queued" || run.status === "running";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full min-h-11 text-left p-3 rounded-lg border transition-colors duration-200 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected
          ? "bg-primary/10 border-primary/40"
          : "bg-card border-border/70 hover:bg-muted/50 hover:border-primary/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground break-words flex-1">
          {run.title || run.objective}
        </span>
        <StatusIcon size={14} className={cn(status.color, isActive && "animate-spin motion-reduce:animate-none")} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin size={12} className="text-primary" />
          {run.municipality || "Nacional"}
        </span>
        {run.econometrics?.mean_intent_percent != null && (
          <Badge variant="secondary" className="text-xs font-mono">
            Média: {run.econometrics.mean_intent_percent}%
          </Badge>
        )}
      </div>
    </button>
  );
}

export function SimLabResearchPanel({ storeId }: { storeId: string }) {
  const [activeTab, setActiveTab] = useState<ResearchTab>("market");
  const [arenaTab, setArenaTab] = useState<ArenaResultTab>("swarm");
  const [prompt, setPrompt] = useState("");
  const [testPriceInput, setTestPriceInput] = useState("297");
  const [installmentsInput, setInstallmentsInput] = useState("3");
  const [municipalityFilter, setMunicipalityFilter] = useState("São Miguel do Oeste - SC");
  const [cohortSize, setCohortSize] = useState(16);

  const [isDispatching, setIsDispatching] = useState(false);
  const [runs, setRuns] = useState<SimResearchRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [personasCount, setPersonasCount] = useState(17);

  // Calibração em Loop Fechado (Truth-Loop)
  const [obsImpressions, setObsImpressions] = useState("1000");
  const [obsClicks, setObsClicks] = useState("85");
  const [obsOrders, setObsOrders] = useState("18");
  const [obsRevenue, setObsRevenue] = useState("5346");
  const [obsNotes, setObsNotes] = useState("");
  const [isCalibrating, setIsCalibrating] = useState(false);

  const currentTab = TAB_CONFIG.find((t) => t.id === activeTab)!;

  const loadData = useCallback(async () => {
    try {
      setLoadError(null);
      const [sessions, archetypes] = await Promise.all([
        listResearchSessions(),
        fetchSyntheticArchetypes(),
      ]);

      setPersonasCount(archetypes.length);

      const formatted: SimResearchRun[] = sessions.map((s: any) => ({
        id: s.id,
        title: s.title || "Pesquisa sem título",
        objective: s.objective || "",
        municipality: s.municipality || "Nacional",
        test_price_brl: s.test_price_brl ?? null,
        module_type: "market_research",
        status:
          s.status === "failed"
            ? "failed"
            : s.status === "queued"
              ? "queued"
              : s.status === "simulating" || s.status === "synthesizing"
                ? "running"
                : "completed",
        evidence_level: s.evidence_level || "legacy_unknown",
        calibration_status: s.calibration_status || "not_calibrated",
        summary_insight: s.summary_insight || "Síntese econométrica disponível.",
        econometrics: s.econometrics,
        execution_results: Array.isArray(s.execution_results) ? s.execution_results : [],
      }));
      setRuns(formatted);
      if (!selectedRunId || !formatted.some((run) => run.id === selectedRunId)) {
        setSelectedRunId(formatted[0]?.id || null);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Erro desconhecido ao carregar dados do SimLab.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedRunId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedRun = runs.find((r) => r.id === selectedRunId) || null;

  const handleSimulate = async () => {
    if (!storeId) {
      toast.error("Selecione um workspace válido antes de iniciar o enxame.");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Descreva a oferta, produto ou hipótese para simular.");
      return;
    }

    const parsedPrice = Number.parseFloat(testPriceInput);
    const validPrice = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : undefined;
    const parsedInstallments = Math.max(1, Math.min(24, Number.parseInt(installmentsInput, 10) || 1));

    setIsDispatching(true);
    const tempId = `temp-${Date.now()}`;
    const newRun: SimResearchRun = {
      id: tempId,
      title: prompt.slice(0, 56) + (prompt.length > 56 ? "..." : ""),
      objective: prompt.trim(),
      municipality: municipalityFilter,
      test_price_brl: validPrice ?? null,
      module_type: currentTab.moduleType,
      stimulus_type: currentTab.stimulusType,
      status: "running",
    };

    setRuns((prev) => [newRun, ...prev]);
    setSelectedRunId(tempId);

    try {
      const expRes = await createSimLabExperiment({
        data: {
          storeId,
          title: newRun.title,
          objective: prompt.trim(),
          municipalityFilter,
          stimulusPayload: {
            title: newRun.title,
            description: prompt.trim(),
            module_type: currentTab.moduleType,
            stimulus_type: currentTab.stimulusType,
            municipality_filter: municipalityFilter,
            max_installments: parsedInstallments,
            ...(validPrice == null ? {} : { test_price_brl: validPrice }),
          },
          sampleSize: cohortSize,
        },
      });

      const expId = expRes?.experiment?.id;
      if (!expId) throw new Error("O experimento não foi persistido.");

      await executeSimLabBatchSimulation({ experimentId: expId, storeId });
      toast.success("Enxame SimLabs 4.0 concluído com cálculo econométrico McFadden & POF!");
      setPrompt("");
      setSelectedRunId(expId);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro na simulação.";
      toast.error(msg);
      setRuns((prev) => prev.map((r) => (r.id === tempId ? { ...r, status: "failed" } : r)));
    } finally {
      setIsDispatching(false);
    }
  };

  const handleCalibrate = async () => {
    if (!selectedRun || !storeId) return;
    setIsCalibrating(true);
    try {
      const res = await runSimLabClosedLoopCalibration({
        data: {
          storeId,
          experimentId: selectedRun.id,
          observedImpressions: Math.max(0, Number.parseInt(obsImpressions, 10) || 0),
          observedClicks: Math.max(0, Number.parseInt(obsClicks, 10) || 0),
          observedOrders: Math.max(0, Number.parseInt(obsOrders, 10) || 0),
          actualRevenueBrl: Math.max(0, Number.parseFloat(obsRevenue) || 0),
          conversationNotes: obsNotes.trim() || undefined,
        },
      });
      toast.success(
        `Calibração Bayesiana concluída! Precisão aferida: ${res.accuracyScorePercent}%`,
      );
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao calibrar experimento.");
    } finally {
      setIsCalibrating(false);
    }
  };

  const econ = selectedRun?.econometrics;

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Motor SimLabs 4.0 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
            <BrainCircuit size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              SimLabs 4.0 Sovereign Swarm Engine
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Enxame multiagente no Pool IA combinado com Solvência POF/IBGE, Utilidade de McFadden,
            Média, Moda, Elasticidade-Preço, Feed Social e Barganha P2P.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Users size={16} className="text-primary" />
          <span className="font-semibold text-foreground">
            {personasCount} arquétipos base + expansão procedural IBGE
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setIsRefreshing(true);
              void loadData();
            }}
            disabled={isRefreshing}
            className="size-11 min-h-11 min-w-11 rounded-lg"
            aria-label="Atualizar sessões do SimLabs"
          >
            <RefreshCw size={16} className={cn(isRefreshing && "animate-spin motion-reduce:animate-none text-primary")} />
          </Button>
        </div>
      </div>

      {/* Régua Horizontal de Modo de Estímulo */}
      <div className="tab-list flex flex-nowrap overflow-x-auto no-scrollbar gap-2 p-1 bg-muted/40 rounded-lg border border-border/60 w-full sm:w-fit">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 h-11 min-h-11 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors duration-200 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-background text-foreground border border-border/80"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna 1 (4 cols): Formulação & Estratificação Hiperlocal IBGE */}
        <div className="lg:col-span-4 space-y-4 rounded-lg border border-border/80 bg-card p-5">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Zap size={14} className="text-primary" /> Configurar Enxame & Oferta
            </h3>
            <p className="text-xs text-muted-foreground">
              Estratifique por município (IBGE/POF), defina o preço base e dispare o enxame.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="simlab-municipality" className="text-xs font-semibold">
                Município / Estratificação Censitária IBGE
              </Label>
              <select
                id="simlab-municipality"
                value={municipalityFilter}
                onChange={(e) => setMunicipalityFilter(e.target.value)}
                className="w-full h-11 min-h-11 rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {MUNICIPALITY_OPTIONS.map((mun) => (
                  <option key={mun} value={mun}>
                    {mun}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="simlab-price" className="text-xs font-semibold">
                  Preço (R$)
                </Label>
                <Input
                  id="simlab-price"
                  type="number"
                  step="0.01"
                  value={testPriceInput}
                  onChange={(e) => setTestPriceInput(e.target.value)}
                  placeholder="297.00"
                  className="h-11 min-h-11 text-xs font-mono rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="simlab-installments" className="text-xs font-semibold">
                  Parcelas Sem Juros
                </Label>
                <Input
                  id="simlab-installments"
                  type="number"
                  min={1}
                  max={24}
                  value={installmentsInput}
                  onChange={(e) => setInstallmentsInput(e.target.value)}
                  className="h-11 min-h-11 text-xs font-mono rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="simlab-cohort" className="text-xs font-semibold">
                  Tamanho Coorte
                </Label>
                <select
                  id="simlab-cohort"
                  value={cohortSize}
                  onChange={(e) => setCohortSize(Number(e.target.value))}
                  className="w-full h-11 min-h-11 rounded-lg border border-input bg-background px-2 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value={8}>8 personas</option>
                  <option value={12}>12 personas</option>
                  <option value={16}>16 personas</option>
                  <option value={24}>24 personas</option>
                  <option value={36}>36 personas</option>
                  <option value={50}>50 personas</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="simlab-prompt" className="text-xs font-semibold">
                Pitch Completo da Oferta, Produto ou Anúncio
              </Label>
              <textarea
                id="simlab-prompt"
                rows={5}
                className="w-full bg-background border border-input rounded-lg p-3 text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed"
                placeholder={currentTab.placeholder}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <Button
              type="button"
              disabled={isDispatching || !storeId || !prompt.trim()}
              onClick={() => void handleSimulate()}
              className="w-full rounded-lg font-bold gap-2 h-11 min-h-11 cursor-pointer"
            >
              {isDispatching ? (
                <>
                  <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> Simulando Enxame & Econometria...
                </>
              ) : (
                <>
                  <Zap size={16} /> Executar Enxame SimLabs 4.0
                </>
              )}
            </Button>
          </div>

          {/* Histórico de Execuções */}
          <div className="pt-4 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <History size={14} /> Histórico ({runs.length})
              </span>
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-background rounded-lg border border-border/60">
                <Loader2 size={14} className="animate-spin motion-reduce:animate-none text-primary" /> Carregando...
              </div>
            ) : loadError ? (
              <div role="alert" className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-foreground">
                {loadError}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {runs.map((run) => (
                  <RunHistoryItem
    key={run.id}
    run={run}
    isSelected={selectedRun?.id === run.id}
    onClick={() => setSelectedRunId(run.id)}
    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna 2 (8 cols): Painel Econométrico & 4 Arenas Interativas */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedRun ? (
            <div className="rounded-lg border border-border/80 bg-card p-8 text-center flex flex-col items-center justify-center space-y-3">
              <BrainCircuit size={44} className="text-primary" />
              <p className="font-bold text-sm text-foreground">Nenhuma simulação selecionada</p>
              <p className="text-xs text-muted-foreground max-w-md">
                Configure o município, o preço e o pitch da oferta ao lado para calcular a
                solvência POF, utilidade de McFadden, moda de preço e viralidade social.
              </p>
            </div>
          ) : selectedRun.status === "running" || selectedRun.status === "queued" ? (
            <div className="rounded-lg border border-border/80 bg-card p-12 text-center flex flex-col items-center justify-center space-y-4">
              <Loader2 size={44} className="text-primary animate-spin motion-reduce:animate-none" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-foreground">
                  Processando Enxame Multiagente & Equações de McFadden...
                </p>
                <p className="text-xs text-muted-foreground">
                  Calculando restrição orçamentária POF, reserva de preço (WTP), reação no feed e
                  barganha P2P para {selectedRun.municipality || "a coorte"}.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Faixa Superior de Indicadores Estatísticos & Econométricos */}
              {econ && (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                  <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                    <span className="text-xs text-muted-foreground">Média Ponderada</span>
                    <p className="text-lg font-bold font-mono text-foreground">
                      {econ.mean_intent_percent ?? econ.overall_approval_rate ?? 0}%
                    </p>
                    <span className="text-xs text-muted-foreground block">
                      Mediana: {econ.median_intent_percent ?? 0}%
                    </span>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                    <span className="text-xs text-muted-foreground">Moda Intenção / σ</span>
                    <p className="text-lg font-bold font-mono text-foreground">
                      {econ.mode_intent_percent ?? 0}%
                    </p>
                    <span className="text-xs text-muted-foreground block">
                      Desvio σ: ±{econ.std_dev_intent ?? 0}%
                    </span>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                    <span className="text-xs text-muted-foreground">Moda Preço (WTP)</span>
                    <p className="text-lg font-bold font-mono text-primary">
                      R$ {Number(econ.mode_reservation_price_brl || 0).toFixed(0)}
                    </p>
                    <span className="text-xs text-muted-foreground block">
                      Reserva Psicológica
                    </span>
                  </div>
                  <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-1">
                    <span className="text-xs font-semibold text-primary">Preço Ótimo (P*)</span>
                    <p className="text-lg font-bold font-mono text-foreground">
                      R$ {Number(econ.optimal_price_point_brl || 0).toFixed(0)}
                    </p>
                    <span className="text-xs text-muted-foreground block">
                      Elasticidade: {econ.price_elasticity_score ?? 0}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                    <span className="text-xs text-muted-foreground">NPS Sintético</span>
                    <p className="text-lg font-bold font-mono text-foreground">
                      {econ.synthetic_nps ?? 0}
                    </p>
                    <span className="text-xs text-muted-foreground block">
                      Viralidade: {econ.social_virality_index ?? 0}/10
                    </span>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1">
                    <span className="text-xs text-muted-foreground">Fechamento PIX (P2P)</span>
                    <p className="text-lg font-bold font-mono text-foreground">
                      R$ {Number(econ.p2p_clearing_price_brl || 0).toFixed(0)}
                    </p>
                    <span className="text-xs text-muted-foreground block">
                      IC Wilson: {econ.estimated_conversion_range?.[0] ?? 0}%–
                      {econ.estimated_conversion_range?.[1] ?? 0}%
                    </span>
                  </div>
                </div>
              )}

              {/* Régua Horizontal de Arenas do SimLabs 4.0 (B.39) */}
              <div className="tab-list flex flex-nowrap overflow-x-auto no-scrollbar gap-2 p-1 bg-muted/40 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setArenaTab("swarm")}
                  className={cn(
                    "flex items-center gap-2 px-4 h-11 min-h-11 rounded-lg text-xs font-semibold shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    arenaTab === "swarm"
                      ? "bg-background text-foreground border border-border/80"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Users size={14} /> Enxame & Solvência POF ({selectedRun.execution_results?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setArenaTab("econometrics")}
                  className={cn(
                    "flex items-center gap-2 px-4 h-11 min-h-11 rounded-lg text-xs font-semibold shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    arenaTab === "econometrics"
                      ? "bg-background text-foreground border border-border/80"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <TrendingUp size={14} /> Curva de Demanda & Squad Científico
                </button>
                <button
                  type="button"
                  onClick={() => setArenaTab("social_feed")}
                  className={cn(
                    "flex items-center gap-2 px-4 h-11 min-h-11 rounded-lg text-xs font-semibold shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    arenaTab === "social_feed"
                      ? "bg-background text-foreground border border-border/80"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <MessageSquare size={14} /> Simulador de Feed Social
                </button>
                <button
                  type="button"
                  onClick={() => setArenaTab("p2p_chronos")}
                  className={cn(
                    "flex items-center gap-2 px-4 h-11 min-h-11 rounded-lg text-xs font-semibold shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    arenaTab === "p2p_chronos"
                      ? "bg-background text-foreground border border-border/80"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Handshake size={14} /> Barganha P2P, Cascata 30d & Calibração Real
                </button>
              </div>

              {/* ARENA 1: ENXAME & SOLVÊNCIA POF/MCFADDEN */}
              {arenaTab === "swarm" && (
                <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Microdados Individuais do Enxame ({selectedRun.municipality || "Nacional"})
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Cada persona é avaliada sob sua restrição de renda líquida POF e equação
                        Logit de McFadden.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {(selectedRun.execution_results || []).map((res, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg border border-border/70 bg-background space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-foreground block">
                              {res.persona_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Classe {res.social_class || "C"} · {res.municipality || "Brasil"}
                              {res.net_income_brl
                                ? ` · Renda Líquida R$ ${Number(res.net_income_brl).toLocaleString("pt-BR")}`
                                : ""}
                              {res.discretionary_surplus_brl
                                ? ` · Sobra POF R$ ${Number(res.discretionary_surplus_brl).toLocaleString("pt-BR")}`
                                : ""}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {res.purchase_intent != null && (
                              <Badge variant="secondary" className="text-xs font-mono">
                                P(Compra): {res.purchase_intent}%
                              </Badge>
                            )}
                            {res.reservation_price_brl != null && (
                              <Badge variant="outline" className="text-xs font-mono">
                                WTP: R$ {Number(res.reservation_price_brl).toFixed(0)}
                              </Badge>
                            )}
                            {res.price_perception && (
                              <Badge variant="secondary" className="text-xs">
                                {res.price_perception.replace(/_/g, " ")}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-foreground/90 leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50">
                          “{res.feedback}”
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>
                            <strong className="text-foreground">Gatilho Principal:</strong>{" "}
                            {res.primary_hook_detected || "Benefício prático"}
                          </div>
                          <div>
                            <strong className="text-foreground">Barreira / Objeção:</strong>{" "}
                            {res.primary_barrier_objection || "Cautela no orçamento"}
                          </div>
                          <div className="font-mono">
                            <strong className="text-foreground">McFadden U:</strong>{" "}
                            {res.net_utility_mcfadden ?? 0} ·{" "}
                            <strong className="text-foreground">Peso na Sobra:</strong>{" "}
                            {res.discretionary_burden_percent ?? 0}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ARENA 2: CURVA DE DEMANDA & SQUAD CIENTÍFICO */}
              {arenaTab === "econometrics" && econ && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                      <TrendingUp size={15} className="text-primary" /> Curva de Elasticidade-Preço
                      & Maximização de Receita (5 Cenários McFadden)
                    </h4>
                    <div className="table-container overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border/60 text-muted-foreground">
                            <th className="py-2 pr-3">Cenário</th>
                            <th className="py-2 px-3">Preço Testado</th>
                            <th className="py-2 px-3">Probabilidade Média</th>
                            <th className="py-2 px-3">Compradores / 100</th>
                            <th className="py-2 pl-3">Receita Esperada / 100</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(econ.demand_curve_points || []).map((pt, i) => (
                            <tr
                              key={i}
                              className={cn(
                                "border-b border-border/40",
                                pt.is_optimal && "bg-primary/10 font-bold",
                              )}
                            >
                              <td className="py-3 pr-3 font-mono">
                                {Math.round(pt.price_multiplier * 100)}%
                                {pt.is_optimal ? " (Ótimo P*)" : ""}
                              </td>
                              <td className="py-3 px-3 font-mono">
                                R$ {Number(pt.tested_price_brl).toFixed(2)}
                              </td>
                              <td className="py-3 px-3 font-mono">
                                {pt.conversion_probability_percent}%
                              </td>
                              <td className="py-3 px-3 font-mono">
                                {pt.expected_buyers_per_100}
                              </td>
                              <td className="py-3 pl-3 font-mono text-primary">
                                R$ {Number(pt.expected_revenue_per_100_brl).toLocaleString("pt-BR")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Parecer do Squad Científico */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(econ.reviewer_reports || []).map((rev, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-border/80 bg-card p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {rev.reviewer_name}
                          </span>
                          <Badge variant="outline" className="text-xs font-mono">
                            {rev.credibility_score}/100
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">{rev.role}</p>
                        <p className="text-xs text-foreground/90 leading-relaxed">{rev.critique}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ARENA 3: SIMULADOR DE FEED SOCIAL (PERSONAFORGE / OASIS) */}
              {arenaTab === "social_feed" && (
                <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Simulador de Feed Social & Caixa de Comentários (PersonaForge / OASIS)
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Previsão de comentários públicos, compartilhamentos e ceticismo caso a
                        oferta seja impulsionada no Instagram/Feed.
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono">
                      Viralidade: {econ?.social_virality_index ?? 0}/10
                    </Badge>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {(selectedRun.execution_results || []).map((res, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg border border-border/60 bg-background flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-foreground">
                            @{res.persona_name.split(" ")[0].toLowerCase()}_{res.social_class?.toLowerCase() || "br"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Reação: {(res.social_feed_reaction || "like").replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">
                          {res.social_feed_comment || res.feedback}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ARENA 4: BARGANHA P2P (CONCORDIA), CASCATA 30 DIAS (CHRONOS) & LOOP REAL */}
              {arenaTab === "p2p_chronos" && (
                <div className="space-y-4">
                  {/* Cascata Temporal Chronos 30 Dias */}
                  {econ?.chronos_temporal_cascade && econ.chronos_temporal_cascade.length > 0 && (
                    <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <CalendarClock size={15} className="text-primary" /> Projeção Temporal de
                        Cascata de 30 Dias (Chronos TGN Engine)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {econ.chronos_temporal_cascade.map((step) => (
                          <div
                            key={step.day_milestone}
                            className="p-4 rounded-lg border border-border/70 bg-background space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="text-xs font-mono">
                                Dia {step.day_milestone}
                              </Badge>
                              <span className="text-xs font-mono text-muted-foreground">
                                WoM: {step.word_of_mouth_multiplier}x
                              </span>
                            </div>
                            <p className="text-xs font-bold text-foreground">{step.phase_title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {step.dominant_narrative}
                            </p>
                            <div className="pt-2 border-t border-border/50 text-xs font-mono">
                              <div>Acumulado: {step.cumulative_buyers_per_100} vendas/100</div>
                              <div className="text-primary font-bold">
                                R$ {Number(step.expected_cumulative_revenue_brl).toLocaleString("pt-BR")}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mesa de Barganha P2P Concordia */}
                  <div className="rounded-lg border border-border/80 bg-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Handshake size={15} className="text-primary" /> Mesa de Barganha P2P
                        (DeepMind Concordia Game Theory)
                      </h4>
                      <Badge variant="outline" className="text-xs font-mono">
                        Clearing Price PIX: R$ {Number(econ?.p2p_clearing_price_brl || 0).toFixed(2)}
                      </Badge>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {(selectedRun.execution_results || []).map((res, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg border border-border/60 bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-foreground">{res.persona_name}</span>
                            <p className="text-muted-foreground">
                              {res.bargaining_strategy || "Negociação direta à vista no PIX"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 font-mono">
                            <Badge variant="secondary">
                              Oferta Inicial: R$ {Number(res.p2p_initial_offer_brl || 0).toFixed(0)}
                            </Badge>
                            <Badge variant="outline">
                              Teto: R$ {Number(res.p2p_walkaway_price_brl || 0).toFixed(0)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Loop Fechado de Auto-Calibração Real (Truth-Loop Simile) */}
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                          <ShieldCheck size={16} className="text-primary" /> Loop Fechado de
                          Auto-Calibração Real (Truth-Loop & Memória Criptografada SHA-256)
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Confronte a previsão do SimLabs com resultados reais de Meta/Google Ads,
                          Pedidos ou Conversas de WhatsApp para calibrar os pesos bayesianos.
                        </p>
                      </div>
                      {econ?.calibration_ledger && (
                        <Badge variant="secondary" className="text-xs font-mono">
                          Precisão Real: {econ.calibration_ledger.accuracy_score_percent}%
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Impressões Reais</Label>
                        <Input
                          type="number"
                          value={obsImpressions}
                          onChange={(e) => setObsImpressions(e.target.value)}
                          className="h-11 min-h-11 text-xs font-mono bg-background rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cliques / Leads</Label>
                        <Input
                          type="number"
                          value={obsClicks}
                          onChange={(e) => setObsClicks(e.target.value)}
                          className="h-11 min-h-11 text-xs font-mono bg-background rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Vendas / Pedidos</Label>
                        <Input
                          type="number"
                          value={obsOrders}
                          onChange={(e) => setObsOrders(e.target.value)}
                          className="h-11 min-h-11 text-xs font-mono bg-background rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Receita Real (R$)</Label>
                        <Input
                          type="number"
                          value={obsRevenue}
                          onChange={(e) => setObsRevenue(e.target.value)}
                          className="h-11 min-h-11 text-xs font-mono bg-background rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">
                        Resumo de Conversas / Objeções Reais Observadas (Anonimizado com Hash
                        Criptográfico SHA-256)
                      </Label>
                      <Input
                        value={obsNotes}
                        onChange={(e) => setObsNotes(e.target.value)}
                        placeholder="Ex: Clientes pediram parcelamento em 6x sem juros e desconto para retirada na loja..."
                        className="h-11 min-h-11 text-xs bg-background rounded-lg"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleCalibrate()}
                      disabled={isCalibrating}
                      className="h-11 min-h-11 rounded-lg font-bold gap-2 cursor-pointer"
                    >
                      {isCalibrating ? (
                        <>
                          <Loader2 size={15} className="animate-spin motion-reduce:animate-none" /> Calibrando Pesos
                          Bayesianos...
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={15} /> Executar Auto-Calibração Real (Truth-Loop)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
