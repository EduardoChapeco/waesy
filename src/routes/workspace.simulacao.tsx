import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Layers,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  MessageSquare,
  BrainCircuit,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  fetchSyntheticArchetypes,
  createSimLabExperiment,
  executeSimLabBatchSimulation,
  getSimLabStatus,
  MUNICIPALITY_DEMOGRAPHIC_PRESETS,
} from "@/services/simlab.functions";
import { getStoreSettings } from "@/services/store.functions";
import type {
  SyntheticArchetype,
  SimLabPersonaResponse,
  SimLabStatisticalSynthesis,
} from "@/types/simlab";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import {
  WorkspaceDashboardSheet,
  type MetricCardItem,
} from "@/components/workspace/workspace-dashboard-sheet";
import { ObservedExperimentPanel } from "@/components/simlab/observed-experiment-panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/simulacao")({
  head: () => ({
    meta: [
      {
        title: "SimLabs 4.0 — Enxame Econométrico | Workspace Waesy",
      },
    ],
  }),
  loader: async () => {
    try {
      const store = await getStoreSettings().catch(() => null);
      const [personas, status] = await Promise.all([
        fetchSyntheticArchetypes({ storeId: store?.id }).catch(() => []),
        getSimLabStatus().catch(() => ({
          isEnabled: true,
          isAdmin: false,
          role: "customer",
        })),
      ]);
      return {
        personas: personas as SyntheticArchetype[],
        status,
        store,
      };
    } catch (err) {
      console.error("[loader:workspace.simulacao] Unhandled loader error:", err);
      return { personas: null, status: null, store: null };
    }
  },
  component: SimulacaoPage,
});

const NICHES = [
  { id: "all", label: "Todos" },
  { id: "eventos", label: "Eventos e Festas" },
  { id: "gastronomia", label: "Gastronomia" },
  { id: "moda", label: "Moda e Varejo" },
  { id: "turismo", label: "Turismo e Viagens" },
  { id: "servicos", label: "Serviços Locais" },
  { id: "classificados", label: "Classificados P2P" },
] as const;

const MUNICIPALITY_OPTIONS = Object.keys(MUNICIPALITY_DEMOGRAPHIC_PRESETS);

function SimulacaoPage() {
  const navigate = useNavigate();
  const { personas: rawPersonas, store } = Route.useLoaderData() as {
    personas: SyntheticArchetype[] | null;
    status: { isEnabled: boolean; isAdmin: boolean; role: string } | null;
    store: any;
  };
  const personas = rawPersonas || [];
  const storeId = store?.id || "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceReais, setPriceReais] = useState("297");
  const [maxInstallments, setMaxInstallments] = useState("3");
  const [municipalityFilter, setMunicipalityFilter] = useState("São Miguel do Oeste - SC");
  const [sampleSize, setSampleSize] = useState(16);
  const [selectedNiche, setSelectedNiche] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [currentExperimentId, setCurrentExperimentId] = useState<string | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<
    "swarm" | "demand" | "social" | "p2p_chronos"
  >("swarm");

  const [synthesis, setSynthesis] = useState<SimLabStatisticalSynthesis | null>(null);
  const [evaluations, setEvaluations] = useState<SimLabPersonaResponse[]>([]);

  const filteredPersonas = useMemo(() => {
    if (!searchTerm.trim()) return personas;
    const q = searchTerm.toLowerCase();
    return personas.filter(
      (p) =>
        p.display_name.toLowerCase().includes(q) ||
        p.abep_social_class.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q) ||
        (p.municipality || "").toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q),
    );
  }, [personas, searchTerm]);

  const handleSimulate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Preencha título e descrição para simular a proposta.");
      return;
    }
    if (!storeId) {
      toast.error("Não foi possível identificar o workspace ativo.");
      return;
    }

    setIsRunning(true);
    try {
      const priceNum = priceReais.trim() ? Number.parseFloat(priceReais) : null;
      if (priceNum != null && (!Number.isFinite(priceNum) || priceNum <= 0)) {
        throw new Error("Informe um preço positivo ou deixe o campo em branco.");
      }
      const installmentsNum = Math.max(
        1,
        Math.min(24, Number.parseInt(maxInstallments, 10) || 1),
      );

      const expRes = await createSimLabExperiment({
        data: {
          storeId,
          title: title.trim(),
          objective: description.trim(),
          municipalityFilter,
          stimulusPayload: {
            title: title.trim(),
            description: description.trim(),
            niche: selectedNiche,
            municipality_filter: municipalityFilter,
            max_installments: installmentsNum,
            ...(priceNum == null ? {} : { test_price_brl: priceNum }),
          },
          sampleSize,
        },
      });

      const expId = expRes?.experiment?.id;
      if (!expId) throw new Error("Falha ao registrar experimento.");
      setCurrentExperimentId(expId);

      const simRes = await executeSimLabBatchSimulation({
        experimentId: expId,
        storeId,
      });

      if (simRes?.synthesis) {
        setSynthesis(simRes.synthesis);
        setEvaluations(simRes.responses || []);
        toast.success(
          `Enxame SimLabs 4.0 concluído (${municipalityFilter}) · Aprovação: ${simRes.synthesis.overall_approval_rate ?? 0}%`,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao executar simulação.";
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  };

  const metricsItems: MetricCardItem[] = useMemo(
    () => [
      {
        label: "Média Ponderada / Moda",
        value: synthesis
          ? `${synthesis.mean_intent_percent ?? synthesis.overall_approval_rate ?? 0}% (Moda: ${synthesis.mode_intent_percent ?? 0}%)`
          : "Aguardando",
        description: synthesis?.methodology || "Equação Logit de McFadden + Solvência POF/IBGE.",
      },
      {
        label: "Preço Ótimo (P*) & WTP",
        value: synthesis?.optimal_price_point_brl
          ? `R$ ${Number(synthesis.optimal_price_point_brl).toFixed(2)}`
          : "Aguardando",
        description: synthesis?.mode_reservation_price_brl
          ? `Moda de Reserva (WTP): R$ ${Number(synthesis.mode_reservation_price_brl).toFixed(2)} · Elasticidade: ${synthesis.price_elasticity_score ?? 0}`
          : "Curva de demanda calculada em 5 níveis de preço.",
      },
      {
        label: "NPS & Viralidade Social",
        value: synthesis ? `NPS ${synthesis.synthetic_nps ?? 0}` : "Aguardando",
        description: synthesis
          ? `Índice de Viralidade no Feed: ${synthesis.social_virality_index ?? 0}/10 · Fechamento PIX P2P: R$ ${Number(synthesis.p2p_clearing_price_brl || 0).toFixed(2)}`
          : "Simulação de comentários e barganha P2P.",
      },
      {
        label: "Coorte Estratificada",
        value: `${evaluations.length || sampleSize} personas`,
        description: `Estratificação ativa: ${municipalityFilter} · IC Wilson 95%: ${synthesis?.estimated_conversion_range?.[0] ?? 0}% a ${synthesis?.estimated_conversion_range?.[1] ?? 0}%`,
      },
    ],
    [synthesis, evaluations.length, sampleSize, municipalityFilter],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      <WorkspaceCanonicalToolbar
        placeholder="Buscar perfis sintéticos por nome, classe, município ou região..."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterChips={NICHES.map((n) => ({
          id: n.id,
          label: n.label,
          active: selectedNiche === n.id,
        }))}
        onFilterChange={(id) => setSelectedNiche(id)}
        primaryAction={{
          label: isRunning ? "Simulando enxame..." : "Executar SimLabs 4.0",
          icon: isRunning ? Loader2 : Play,
          onClick: () => void handleSimulate(),
          disabled: isRunning,
        }}
        secondaryAction={{
          label: "Focus Group",
          icon: MessageSquare,
          onClick: () => void navigate({ to: "/workspace/simlab/focus-group" }),
        }}
        onMetricsClick={() => setIsMetricsOpen(true)}
        metricsBadge={
          synthesis ? `${synthesis.overall_approval_rate ?? 0}% Aprovação` : undefined
        }
      />

      <div className="w-full space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Formulação da Proposta & Estratificação Municipal IBGE */}
          <div className="lg:col-span-5 space-y-5">
            <form
              onSubmit={(e) => void handleSimulate(e)}
              className="rounded-lg border border-border/80 bg-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  Configuração da Oferta & Coorte IBGE
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  {selectedNiche}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sim-municipality" className="text-xs font-semibold text-foreground">
                  Município / Estratificação Demográfica (IBGE/POF)
                </Label>
                <select
                  id="sim-municipality"
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

              <div className="space-y-2">
                <Label htmlFor="sim-title" className="text-xs font-semibold text-foreground">
                  Título da Oferta / Produto / Campanha
                </Label>
                <Input
                  id="sim-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Pacote Fim de Semana Termas ou Combo Família Especial"
                  className="h-11 min-h-11 text-xs rounded-lg bg-background"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="sim-price" className="text-xs font-semibold text-foreground">
                    Preço (R$)
                  </Label>
                  <Input
                    id="sim-price"
                    type="number"
                    step="0.01"
                    value={priceReais}
                    onChange={(e) => setPriceReais(e.target.value)}
                    placeholder="297.00"
                    className="h-11 min-h-11 text-xs rounded-lg font-mono font-semibold bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sim-installments" className="text-xs font-semibold text-foreground">
                    Parcelas
                  </Label>
                  <Input
                    id="sim-installments"
                    type="number"
                    min={1}
                    max={24}
                    value={maxInstallments}
                    onChange={(e) => setMaxInstallments(e.target.value)}
                    className="h-11 min-h-11 text-xs rounded-lg font-mono font-semibold bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sim-sample" className="text-xs font-semibold text-foreground">
                    Coorte (N)
                  </Label>
                  <select
                    id="sim-sample"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(Number(e.target.value))}
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

              <div className="space-y-2">
                <Label htmlFor="sim-desc" className="text-xs font-semibold text-foreground">
                  Pitch Completo, Condições, Garantias e Entregáveis
                </Label>
                <textarea
                  id="sim-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Descreva benefícios, itens inclusos, desconto no PIX, prazo de entrega e diferenciais..."
                  className="w-full text-xs rounded-lg border border-input bg-background p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-200"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isRunning}
                className="w-full rounded-lg font-bold gap-2 mt-2 h-11 min-h-11 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    Calculando Enxame & Econometria McFadden...
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current" />
                    Executar Enxame SimLabs 4.0
                  </>
                )}
              </Button>
            </form>

            {/* Catálogo de Arquétipos Base + Expansão Procedural */}
            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  Catálogo Base de Arquétipos POF/IBGE
                </span>
                <span className="text-xs text-muted-foreground">
                  {filteredPersonas.length} matrizes + expansão procedural
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-1">
                {filteredPersonas.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background text-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="min-w-0 pr-2 space-y-0.5">
                      <p className="font-semibold text-foreground break-words">
                        {p.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.age} anos • {p.municipality || p.region} •{" "}
                        {p.median_income_brl == null
                          ? "renda sob consulta"
                          : `R$ ${p.median_income_brl.toLocaleString("pt-BR")}/mês`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs rounded-lg font-medium px-2 py-1 shrink-0">
                      Classe {p.abep_social_class}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Resultados Econométricos, Arenas e Calibração */}
          <div className="lg:col-span-7 space-y-5">
            {!synthesis && !isRunning && (
              <div className="rounded-lg border border-border/80 bg-card p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="p-4 bg-primary/10 rounded-lg text-primary">
                  <BrainCircuit className="size-8" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  SimLabs 4.0 Pronto para Simulação de Enxame
                </h3>
                <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                  Selecione o município (ex: São Miguel do Oeste - SC, Chapecó - SC ou Nacional),
                  informe o preço pretendido e dispare o enxame para obter Média Ponderada, Moda de
                  Reserva (WTP), Curva de Elasticidade-Preço, Feed Social e Barganha P2P.
                </p>
              </div>
            )}

            {isRunning && (
              <div className="rounded-lg border border-border/80 bg-card p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4">
                <Loader2 className="size-10 text-primary animate-spin motion-reduce:animate-none" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Simulando Coorte Estratificada ({municipalityFilter})...
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Combinando cognição multiagente no Pool IA com Solvência POF, Utilidade de
                    McFadden, Curva de Demanda em 5 níveis e Cascata Temporal Chronos.
                  </p>
                </div>
              </div>
            )}

            {synthesis && !isRunning && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Grade de Indicadores Econométricos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border/80 bg-card p-4 space-y-1">
                    <span className="text-xs text-muted-foreground">Média Ponderada / Mediana</span>
                    <p className="text-lg font-bold font-mono text-foreground">
                      {synthesis.mean_intent_percent ?? synthesis.overall_approval_rate ?? 0}%
                    </p>
                    <span className="text-xs text-muted-foreground block">
                      Mediana: {synthesis.median_intent_percent ?? 0}% · Moda:{" "}
                      {synthesis.mode_intent_percent ?? 0}%
                    </span>
                  </div>
                  <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-1">
                    <span className="text-xs font-semibold text-primary">
                      Preço Ótimo (P*) & Moda WTP
                    </span>
                    <p className="text-lg font-bold font-mono text-foreground">
                      R$ {Number(synthesis.optimal_price_point_brl || 0).toFixed(2)}
                    </p>
                    <span className="text-xs text-muted-foreground block">
                      Moda WTP: R$ {Number(synthesis.mode_reservation_price_brl || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-card p-4 space-y-1">
                    <span className="text-xs text-muted-foreground">
                      NPS Sintético & Fechamento PIX
                    </span>
                    <p className="text-lg font-bold font-mono text-foreground">
                      NPS {synthesis.synthetic_nps ?? 0}
                    </p>
                    <span className="text-xs text-muted-foreground block">
                      Clearing PIX: R$ {Number(synthesis.p2p_clearing_price_brl || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Régua Horizontal de Arenas (B.39) */}
                <div className="tab-list flex flex-nowrap overflow-x-auto no-scrollbar gap-2 p-1 bg-muted/40 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setActiveResultTab("swarm")}
                    className={cn(
                      "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      activeResultTab === "swarm"
                        ? "bg-background text-foreground border border-border/80"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Enxame & POF ({evaluations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveResultTab("demand")}
                    className={cn(
                      "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      activeResultTab === "demand"
                        ? "bg-background text-foreground border border-border/80"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Curva de Demanda & Squad
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveResultTab("social")}
                    className={cn(
                      "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      activeResultTab === "social"
                        ? "bg-background text-foreground border border-border/80"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Feed Social ({synthesis.social_virality_index ?? 0}/10)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveResultTab("p2p_chronos")}
                    className={cn(
                      "px-4 h-11 min-h-11 rounded-lg text-xs font-semibold shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      activeResultTab === "p2p_chronos"
                        ? "bg-background text-foreground border border-border/80"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Barganha P2P & Cascata 30d
                  </button>
                </div>

                {activeResultTab === "swarm" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-border/80 bg-card p-4 space-y-2">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-primary" />
                          Principais Gatilhos de Compra
                        </h4>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                          {synthesis.top_3_buying_triggers.map((trigger, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary font-bold">•</span>
                              <span>{trigger}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg border border-border/80 bg-card p-4 space-y-2">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                          <AlertTriangle className="size-4 text-destructive" />
                          Principais Barreiras de Fricção
                        </h4>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                          {synthesis.top_3_friction_barriers.map((barrier, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-destructive font-bold">•</span>
                              <span>{barrier}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <span className="text-xs font-bold text-foreground flex items-center gap-2">
                          <MessageSquare className="size-4 text-primary" />
                          Microdados Individuais do Enxame
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {evaluations.length} avaliações completas
                        </span>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto no-scrollbar pr-1">
                        {evaluations.map((ev, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-lg border border-border/60 bg-background text-xs space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-foreground">
                                  {ev.archetype?.display_name || "Perfil sintético"}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  Classe {ev.archetype?.abep_social_class || "C"} •{" "}
                                  {ev.archetype?.municipality || ev.archetype?.region || "Brasil"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs font-mono">
                                  P(Compra): {ev.choice_probability_percent ?? ev.purchase_intent_percent ?? 0}%
                                </Badge>
                                {ev.reservation_price_brl != null && (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    WTP: R$ {Number(ev.reservation_price_brl).toFixed(0)}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-foreground/90 bg-muted/20 p-3 rounded-lg border border-border/40 leading-relaxed">
                              “{ev.verbatim_reaction || "Sem relato textual."}”
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {ev.primary_hook_detected && (
                                <span>
                                  Gatilho:{" "}
                                  <strong className="text-foreground">
                                    {ev.primary_hook_detected}
                                  </strong>
                                </span>
                              )}
                              {ev.primary_barrier_objection && (
                                <span>
                                  Objeção:{" "}
                                  <strong className="text-foreground">
                                    {ev.primary_barrier_objection}
                                  </strong>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeResultTab === "demand" && (
                  <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" /> Curva de Demanda McFadden (5
                      Níveis de Preço)
                    </h4>
                    <div className="table-container overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border/60 text-muted-foreground">
                            <th className="py-2 pr-3">Variação</th>
                            <th className="py-2 px-3">Preço Testado</th>
                            <th className="py-2 px-3">Conversão Média</th>
                            <th className="py-2 pl-3">Receita / 100 Impactos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(synthesis.demand_curve_points || []).map((pt, idx) => (
                            <tr
                              key={idx}
                              className={cn(
                                "border-b border-border/40",
                                pt.is_optimal && "bg-primary/10 font-bold",
                              )}
                            >
                              <td className="py-2 pr-3 font-mono">
                                {Math.round(pt.price_multiplier * 100)}%
                                {pt.is_optimal ? " (Ótimo P*)" : ""}
                              </td>
                              <td className="py-2 px-3 font-mono">
                                R$ {Number(pt.tested_price_brl).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 font-mono">
                                {pt.conversion_probability_percent}%
                              </td>
                              <td className="py-2 pl-3 font-mono text-primary">
                                R$ {Number(pt.expected_revenue_per_100_brl).toLocaleString("pt-BR")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeResultTab === "social" && (
                  <div className="rounded-lg border border-border/80 bg-card p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Simulação de Comentários no Feed (PersonaForge / OASIS)
                    </h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {evaluations.map((ev, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border border-border/60 bg-background space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">
                              {ev.archetype?.display_name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {(ev.social_feed_reaction || "like").replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            {ev.social_feed_comment || ev.verbatim_reaction}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeResultTab === "p2p_chronos" && (
                  <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                      <CalendarClock className="size-4 text-primary" /> Cascata Temporal 30 Dias
                      (Chronos) & Barganha P2P (Concordia)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(synthesis.chronos_temporal_cascade || []).map((step) => (
                        <div
                          key={step.day_milestone}
                          className="p-3 rounded-lg border border-border/60 bg-background space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="font-mono text-xs">
                              Dia {step.day_milestone}
                            </Badge>
                            <span className="font-mono text-primary font-bold">
                              R$ {Number(step.expected_cumulative_revenue_brl).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <p className="font-bold text-foreground">{step.phase_title}</p>
                          <p className="text-muted-foreground">{step.dominant_narrative}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <ObservedExperimentPanel storeId={storeId} experimentId={currentExperimentId} />
          </div>
        </div>
      </div>

      <WorkspaceDashboardSheet
        title="Indicadores Econométricos SimLabs 4.0"
        open={isMetricsOpen}
        onOpenChange={setIsMetricsOpen}
        items={metricsItems}
      />
    </div>
  );
}
