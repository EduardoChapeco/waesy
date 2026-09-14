import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Layers,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Loader2,
  Play,
  ArrowRight,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  Bot,
  BrainCircuit,
  Award,
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
} from "@/services/simlab.functions";
import { getStoreSettings } from "@/services/store.functions";
import type {
  SyntheticArchetype,
  SimLabPersonaResponse,
  SimLabStatisticalSynthesis,
} from "@/types/simlab";
import { cn } from "@/lib/utils";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import {
  WorkspaceDashboardSheet,
  type MetricCardItem,
} from "@/components/workspace/workspace-dashboard-sheet";

export const Route = createFileRoute("/workspace/simulacao")({
  head: () => ({
    meta: [
      {
        title:
          "SimLab — Enxame de Validação Preditiva Censo IBGE | Workspace Waesy",
      },
    ],
  }),
  loader: async () => {
    try {
    const [personas, status, store] = await Promise.all([
      fetchSyntheticArchetypes().catch(() => []),
      getSimLabStatus().catch(() => ({
        isEnabled: true,
        isAdmin: false,
        role: "customer",
      })),
      getStoreSettings().catch(() => null),
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
  { id: "all", label: "Todos os Nichos" },
  { id: "eventos", label: "Eventos & Festas" },
  { id: "gastronomia", label: "Gastronomia & Restaurante" },
  { id: "moda", label: "Moda & Vestuário" },
  { id: "turismo", label: "Turismo & Viagens" },
  { id: "musica", label: "Música & Shows" },
  { id: "servicos", label: "Serviços Culturais" },
  { id: "classificados", label: "Classificados & Desapego" },
] as const;

function SimulacaoPage() {
  const { personas, status, store } = Route.useLoaderData() as {
    personas: SyntheticArchetype[];
    status: { isEnabled: boolean; isAdmin: boolean; role: string };
    store: any;
  };

  const storeId = store?.id || "";

  const [title, setTitle] = useState("Lançamento Coleção Cápsula Outono");
  const [description, setDescription] = useState(
    "Peças exclusivas feitas à mão com algodão sustentável e tiragem limitada de 50 unidades. Acompanha zine editorial impresso e brinde artesanal.",
  );
  const [priceReais, setPriceReais] = useState("129.90");
  const [selectedNiche, setSelectedNiche] = useState<string>("moda");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);

  // Resultados de persistência real
  const [synthesis, setSynthesis] = useState<SimLabStatisticalSynthesis | null>(
    null,
  );
  const [evaluations, setEvaluations] = useState<SimLabPersonaResponse[]>([]);

  // Filtragem rápida de personas na lista
  const filteredPersonas = useMemo(() => {
    if (!searchTerm.trim()) return personas;
    const q = searchTerm.toLowerCase();
    return personas.filter(
      (p) =>
        p.display_name.toLowerCase().includes(q) ||
        p.abep_social_class.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q),
    );
  }, [personas, searchTerm]);

  const handleSimulate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Preencha título e descrição para simular a proposta.");
      return;
    }

    setIsRunning(true);
    try {
      const priceNum = parseFloat(priceReais || "0");

      // 1. Cria experimento persistido na tabela `simlab_market_experiments`
      const expRes = await createSimLabExperiment({
        data: {
          storeId,
          title: title.trim(),
          objective: description.trim(),
          stimulusPayload: {
            title: title.trim(),
            description: description.trim(),
            test_price_brl: priceNum,
            niche: selectedNiche,
          },
          sampleSize: personas.length || 12,
        },
      });

      const expId = expRes?.experiment?.id;
      if (!expId) throw new Error("Falha ao registrar experimento.");

      // 2. Dispara simulação estocástica ou IA Real calibrada
      const simRes = await executeSimLabBatchSimulation({
        experimentId: expId,
        storeId,
      });

      if (simRes?.synthesis) {
        setSynthesis(simRes.synthesis);
        setEvaluations(simRes.responses || []);
        toast.success("Simulação concluída e salva no banco de dados!");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao executar simulação.";
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  };

  // KPIs dinâmicos para a Dashboard Sheet sob demanda
  const metricsItems: MetricCardItem[] = useMemo(() => {
    if (!synthesis) {
      return [
        {
          label: "Amostragem Censo IBGE",
          value: `${personas.length} personas`,
          description: "12 arquétipos estratificados pelo Critério ABEP 2022",
        },
        {
          label: "Previsão de Conversão",
          value: "--",
          description: "Execute a simulação para calcular o intervalo de 95% CI",
        },
        {
          label: "Net Promoter Score",
          value: "--",
          description: "Balanço entre promotores e detratores sintéticos",
        },
        {
          label: "Elasticidade de Preço",
          value: "--",
          description: "Sensibilidade estocástica em relação à renda mediana",
        },
      ];
    }

    const nps = synthesis.synthetic_nps;
    return [
      {
        label: "Net Promoter Score Sintético",
        value: `${nps > 0 ? "+" : ""}${nps}`,
        description: `Balanço ABEP: ${synthesis.overall_approval_rate}% de aprovação da amostra`,
        trend: {
          value: `${synthesis.overall_approval_rate}% aprovados`,
          isPositive: nps >= 20,
        },
      },
      {
        label: "Conversão Estimada (95% CI)",
        value: `${synthesis.estimated_conversion_range[0]}% - ${synthesis.estimated_conversion_range[1]}%`,
        description: "Intervalo estatístico de probabilidade real de compra",
        trend: {
          value: `${synthesis.rejection_rate}% rejeição`,
          isPositive: synthesis.rejection_rate < 30,
        },
      },
      {
        label: "Elasticidade de Preço",
        value: `${synthesis.price_elasticity_score.toFixed(2)}x`,
        description: "Coeficiente de atrito econômico frente à renda diária",
      },
      {
        label: "Amostragem Efetiva",
        value: `${evaluations.length} perfis`,
        description: "100% de representatividade demográfica auditada",
      },
    ];
  }, [synthesis, personas.length, evaluations.length]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] w-full">
      {/* ── 1. BARRA CANÔNICA APPLE HIG (SEM TÍTULOS PROLIXOS) ── */}
      <WorkspaceCanonicalToolbar
        placeholder="Buscar por nome, classe ABEP ou região..."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterChips={NICHES.map((n) => ({
          id: n.id,
          label: n.label,
          active: selectedNiche === n.id,
        }))}
        onFilterChange={(id) => setSelectedNiche(id)}
        primaryAction={{
          label: isRunning ? "Simulando Enxame..." : "Executar Simulação",
          icon: isRunning ? Loader2 : Play,
          onClick: () => void handleSimulate(),
          disabled: isRunning,
        }}
        secondaryAction={{
          label: "Focus Group",
          icon: MessageSquare,
          onClick: () => {},
        }}
        onMetricsClick={() => setIsMetricsOpen(true)}
        metricsBadge={synthesis ? `${synthesis.synthetic_nps} NPS` : undefined}
      />

      {/* ── 2. PAINEL PRINCIPAL EM DUAS COLUNAS OPERACIONAIS ── */}
      <div className="w-full space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Formulação da Proposta & Amostragem IBGE */}
          <div className="lg:col-span-5 space-y-5">
            <form
              onSubmit={(e) => void handleSimulate(e)}
              className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  Hipótese da Oferta
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {selectedNiche}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="sim-title"
                  className="text-xs font-semibold text-foreground"
                >
                  Título da Oferta / Produto
                </Label>
                <Input
                  id="sim-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Show de Lançamento da Banda X"
                  className="h-11 min-h-[44px] text-xs rounded-xl bg-background"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="sim-price"
                  className="text-xs font-semibold text-foreground"
                >
                  Preço Pretendido (R$)
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                    R$
                  </span>
                  <Input
                    id="sim-price"
                    type="number"
                    step="0.01"
                    value={priceReais}
                    onChange={(e) => setPriceReais(e.target.value)}
                    placeholder="0,00"
                    className="h-11 min-h-[44px] pl-9 text-xs rounded-xl font-mono font-semibold bg-background"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="sim-desc"
                  className="text-xs font-semibold text-foreground"
                >
                  Pitch da Oferta & Condições
                </Label>
                <textarea
                  id="sim-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Descreva benefícios, garantias, tiragem e diferenciais..."
                  className="w-full text-xs rounded-xl border border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isRunning}
                className="w-full rounded-xl font-bold gap-2 mt-2 h-11 min-h-[44px] cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Simulando Enxame...
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current" />
                    Executar Validação
                  </>
                )}
              </Button>
            </form>

            {/* Lista Compacta de Personas do Censo IBGE 2022 */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Users className="size-3.5 text-primary" />
                  Bancada Amostral IBGE
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {filteredPersonas.length} calibradas
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-1">
                {filteredPersonas.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background text-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-foreground truncate">
                        {p.display_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {p.age} anos • {p.region} • R${" "}
                        {p.median_income_brl.toLocaleString("pt-BR")}/mês
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] rounded-md font-medium px-2 py-0.5 shrink-0 bg-muted/40"
                    >
                      Classe {p.abep_social_class}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Resultados da Simulação / Veredito Científico */}
          <div className="lg:col-span-7 space-y-5">
            {!synthesis && !isRunning && (
              <div className="rounded-2xl border border-border/80 bg-card p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3 min-h-[440px] shadow-sm">
                <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                  <BrainCircuit className="size-8" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  Pronto para Validar com População Sintética
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  Preencha os detalhes da sua hipótese à esquerda e acione{" "}
                  <strong>"Executar Simulação"</strong> para mensurar intenção de
                  compra, elasticidade de preço e objeções das personas.
                </p>
              </div>
            )}

            {isRunning && (
              <div className="rounded-2xl border border-border/80 bg-card p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[440px] shadow-sm">
                <Loader2 className="size-10 text-primary animate-spin" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Consultando Vetores do Censo IBGE 2022...
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Injetando estímulos nas personas, computando coeficientes de
                    aversão à perda e extraindo reações em linguagem natural.
                  </p>
                </div>
              </div>
            )}

            {synthesis && !isRunning && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Banner de Veredito Científico */}
                <div
                  className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between gap-4",
                    synthesis.scientific_verdict === "aprovado_para_veiculacao"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : synthesis.scientific_verdict === "revisar_com_ajustes"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Award className="size-5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">
                        {synthesis.scientific_verdict ===
                        "aprovado_para_veiculacao"
                          ? "Aprovado para Veiculação Comercial"
                          : synthesis.scientific_verdict ===
                              "revisar_com_ajustes"
                            ? "Revisar com Ajustes Estratégicos"
                            : "Bloqueado por Alto Risco de Mercado"}
                      </p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Aprovação: {synthesis.overall_approval_rate}% • NPS:{" "}
                        {synthesis.synthetic_nps} • Conversão Estimada:{" "}
                        {synthesis.estimated_conversion_range[0]}% a{" "}
                        {synthesis.estimated_conversion_range[1]}%
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMetricsOpen(true)}
                    className="h-9 rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Ver DRE do Enxame
                  </Button>
                </div>

                {/* Gatilhos e Barreiras */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-2 shadow-sm">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      Gatilhos de Compra Principais
                    </h4>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {synthesis.top_3_buying_triggers.map((trigger, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{trigger}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-2 shadow-sm">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5 text-amber-500" />
                      Fricções & Objeções Detectadas
                    </h4>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {synthesis.top_3_friction_barriers.map((barrier, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{barrier}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Reações Verbatim das Personas */}
                <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                      <MessageSquare className="size-3.5 text-primary" />
                      Reações Individuais das Personas
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {evaluations.length} depoimentos
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
                    {evaluations.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-border/60 bg-background text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              {ev.archetype?.display_name || "Consumidor"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Classe {ev.archetype?.abep_social_class || "C"} •{" "}
                              {ev.archetype?.region || "Brasil"}
                            </span>
                          </div>
                          <Badge
                            variant={
                              ev.purchase_intent_percent >= 60
                                ? "default"
                                : "outline"
                            }
                            className="text-[10px] rounded-md font-medium px-2 py-0.5"
                          >
                            {ev.purchase_intent_percent}% Intenção
                          </Badge>
                        </div>

                        <p className="text-[11px] text-muted-foreground italic bg-muted/20 p-2.5 rounded-xl border border-border/40 leading-relaxed">
                          "{ev.verbatim_reaction}"
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                          <span>
                            Emoção:{" "}
                            <strong className="text-foreground capitalize">
                              {ev.system_1_emotion}
                            </strong>
                          </span>
                          <span>
                            Preço:{" "}
                            <strong className="text-foreground capitalize">
                              {ev.price_perception.replace("_", " ")}
                            </strong>
                          </span>
                          {ev.primary_barrier_objection && (
                            <span className="text-amber-500">
                              Objeção:{" "}
                              <strong>{ev.primary_barrier_objection}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. DASHBOARD SHEET DE MÉTRICAS SOB DEMANDA (APPLE HIG) ── */}
      <WorkspaceDashboardSheet
        title="Telemetria & Estatística do SimLab"
        open={isMetricsOpen}
        onOpenChange={setIsMetricsOpen}
        items={metricsItems}
      />
    </div>
  );
}

