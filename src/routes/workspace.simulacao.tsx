import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Layers, Users, TrendingUp, AlertTriangle, CheckCircle2, DollarSign, Loader2, Play, ArrowRight, MessageSquare, BarChart3, ShieldCheck, Search, SlidersHorizontal, Bot, BrainCircuit, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fetchSyntheticArchetypes, createSimLabExperiment, executeSimLabBatchSimulation, getSimLabStatus } from "@/services/simlab.functions";
import { getStoreSettings } from "@/services/store.functions";
import type {
  SyntheticArchetype,
  SimLabPersonaResponse,
  SimLabStatisticalSynthesis,
} from "@/types/simlab";
import { cn } from "@/lib/utils";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet, type MetricCardItem } from "@/components/workspace/workspace-dashboard-sheet";
import { ObservedExperimentPanel } from "@/components/simlab/observed-experiment-panel";

export const Route = createFileRoute("/workspace/simulacao")({
  head: () => ({
    meta: [
      {
        title: "SimLab — Exploração Qualitativa e Experimentos Observados | Workspace Waesy",
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
  { id: "gastronomia", label: "Gastronomia e Restaurante" },
  { id: "moda", label: "Moda e Vestuário" },
  { id: "turismo", label: "Turismo e Viagens" },
  { id: "musica", label: "Música e Shows" },
  { id: "servicos", label: "Serviços Culturais" },
  { id: "classificados", label: "Classificados e Desapego" },
] as const;

function SimulacaoPage() {
  const { personas, status, store } = Route.useLoaderData() as {
    personas: SyntheticArchetype[];
    status: { isEnabled: boolean; isAdmin: boolean; role: string };
    store: any;
  };

  const storeId = store?.id || "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceReais, setPriceReais] = useState("");
  const [selectedNiche, setSelectedNiche] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [currentExperimentId, setCurrentExperimentId] = useState<string | null>(null);

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

      // 1. Cria experimento persistido na tabela `simlab_market_experiments`
      const expRes = await createSimLabExperiment({
        data: {
          storeId,
          title: title.trim(),
          objective: description.trim(),
          stimulusPayload: {
            title: title.trim(),
            description: description.trim(),
            niche: selectedNiche,
            ...(priceNum == null ? {} : { test_price_brl: priceNum }),
          },
          sampleSize: personas.length || 12,
        },
      });

      const expId = expRes?.experiment?.id;
      if (!expId) throw new Error("Falha ao registrar experimento.");
      setCurrentExperimentId(expId);

      // 2. Gera respostas qualitativas sintéticas via IA; não calcula venda/conversão.
      const simRes = await executeSimLabBatchSimulation({
        experimentId: expId,
        storeId,
      });

      if (simRes?.synthesis) {
        setSynthesis(simRes.synthesis);
        setEvaluations(simRes.responses || []);
        toast.success("Exploração qualitativa concluída. Consulte abaixo como anexar resultados observados.");
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
  const metricsItems: MetricCardItem[] = useMemo(() => [
    {
      label: "Evidência atual",
      value: synthesis ? "Exploração qualitativa" : "Aguardando dados",
      description: synthesis?.methodology || "Personas sintéticas não são respondentes nem amostra representativa.",
    },
    {
      label: "Previsão de vendas",
      value: "Não estimada",
      description: "Exige resultados observados e validação prospectiva em holdout.",
    },
    {
      label: "Calibração",
      value: synthesis?.calibration_status === "validated_on_holdout" ? "Validada" : "Não validada",
      description: "Uma exploração sintética não calibra um modelo de vendas.",
    },
    {
      label: "Perfis consultados",
      value: `${evaluations.length} perfis sintéticos`,
      description: "Catálogo curado; sem alegação de representatividade populacional.",
    },
  ], [synthesis, evaluations.length]);

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] w-full">
      {/* ── 1. BARRA CANÔNICA APPLE HIG (SEM TÍTULOS PROLIXOS) ── */}
      <WorkspaceCanonicalToolbar
          placeholder="Buscar perfis sintéticos por nome, classe ou região..."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterChips={NICHES.map((n) => ({
          id: n.id,
          label: n.label,
          active: selectedNiche === n.id,
        }))}
        onFilterChange={(id) => setSelectedNiche(id)}
        primaryAction={{
          label: isRunning ? "Gerando reações..." : "Executar exploração",
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
        metricsBadge={synthesis ? "Exploratória" : undefined}
      />

      {/* ── 2. PAINEL PRINCIPAL EM DUAS COLUNAS OPERACIONAIS ── */}
      <div className="w-full space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Formulação da Proposta & Amostragem IBGE */}
          <div className="lg:col-span-5 space-y-5">
            <form
              onSubmit={(e) => void handleSimulate(e)}
              className="rounded-lg border border-border/80 bg-card p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  Hipótese da Oferta
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {selectedNiche}
                </span>
              </div>

              <div className="space-y-2">
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
                  className="h-11 min-h-11 text-xs rounded-lg bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
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
                    placeholder="Opcional — preço da oferta"
                    className="h-11 min-h-11 pl-9 text-xs rounded-lg font-mono font-semibold bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="sim-desc"
                  className="text-xs font-semibold text-foreground"
                >
                  Pitch da Oferta e Condições
                </Label>
                <textarea
                  id="sim-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Descreva benefícios, garantias, tiragem e diferenciais..."
                  className="w-full text-xs rounded-lg border border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
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

            {/* Catálogo de perfis sintéticos; não implica representatividade populacional */}
            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Users className="size-3.5 text-primary" />
                  Catálogo de Perfis Sintéticos
                </span>
                <span className="text-xs text-muted-foreground">
                  {filteredPersonas.length} perfis · calibração não validada
                </span>
              </div>
              <p className="mb-3 rounded-md border border-amber-500/25 bg-amber-500/5 p-2 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
                Catálogo atual: personagens fictícios para exploração qualitativa. Idade, renda e classe são atributos ilustrativos, não estimativas IBGE/POF nem amostra representativa.
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-1">
                {filteredPersonas.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background text-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-foreground truncate">
                        {p.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.age} anos • {p.region} • {p.median_income_brl == null ? "renda não informada" : `R$ ${p.median_income_brl.toLocaleString("pt-BR")}/mês`}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs rounded-md font-medium px-2 py-1 shrink-0 bg-muted/40"
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
              <div className="rounded-lg border border-border/80 bg-card p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3 min-h-[440px] shadow-sm">
                <div className="p-4 bg-primary/10 rounded-lg text-primary">
                  <BrainCircuit className="size-8" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  Pronto para explorar uma hipótese
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  Preencha a hipótese à esquerda e acione <strong>"Executar exploração"</strong> para gerar reações qualitativas hipotéticas. Para estimar impacto em vendas, registre um experimento randomizado com resultados observados.
                </p>
              </div>
            )}

            {isRunning && (
              <div className="rounded-lg border border-border/80 bg-card p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[440px] shadow-sm">
                <Loader2 className="size-10 text-primary animate-spin" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Gerando respostas qualitativas para perfis sintéticos...
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md">
                    A IA está elaborando respostas hipotéticas; não haverá NPS, taxa de conversão ou previsão de vendas.
                  </p>
                </div>
              </div>
            )}

            {synthesis && !isRunning && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <BrainCircuit className="mt-1 size-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground">Exploração qualitativa sintética — não é previsão de vendas</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{synthesis.methodology || "Respostas hipotéticas geradas por IA; não são entrevistas nem observações de clientes."}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">Proveniência: {String(synthesis.provenance?.provider || "provedor não informado")} · modelo {String(synthesis.provenance?.model || "não informado")} · perfil não calibrado.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsMetricsOpen(true)} className="h-9 shrink-0 text-xs">
                    Ver evidência e limitações
                  </Button>
                </div>
                {/* Gatilhos e Barreiras */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border/80 bg-card p-4 space-y-2 shadow-sm">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      Pontos favoráveis mencionados nas respostas
                    </h4>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {synthesis.top_3_buying_triggers.map((trigger, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{trigger}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-card p-4 space-y-2 shadow-sm">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <AlertTriangle className="size-3.5 text-amber-500" />
                      Fricções mencionadas nas respostas
                    </h4>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {synthesis.top_3_friction_barriers.map((barrier, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{barrier}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Respostas hipotéticas de perfis sintéticos */}
                <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                      <MessageSquare className="size-3.5 text-primary" />
                      Respostas sintéticas individuais
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {evaluations.length} respostas geradas por IA
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
                    {evaluations.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-border/60 bg-background text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              {ev.archetype?.display_name || "Perfil sintético"}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              Classe {ev.archetype?.abep_social_class || "C"} •{" "}
                              {ev.archetype?.region || "Brasil"}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">LLM sintético · sem score</Badge>
                        </div>

                        <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-lg border border-border/40 leading-relaxed">
                          “{ev.verbatim_reaction || "A resposta da IA está indisponível."}”
                        </p>
                        <p className="text-[10px] text-muted-foreground">Personagem sintético; não é depoimento de consumidor real.</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {ev.primary_hook_detected && <span>Aspecto favorável mencionado: <strong className="text-foreground">{ev.primary_hook_detected}</strong></span>}
                          {ev.primary_barrier_objection && <span className="text-amber-600">Fricção mencionada: <strong>{ev.primary_barrier_objection}</strong></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <ObservedExperimentPanel storeId={storeId} experimentId={currentExperimentId} />
          </div>
        </div>
      </div>

      {/* ── 3. DASHBOARD SHEET DE MÉTRICAS SOB DEMANDA (APPLE HIG) ── */}
      <WorkspaceDashboardSheet
        title="Evidência e limites do SimLab"
        open={isMetricsOpen}
        onOpenChange={setIsMetricsOpen}
        items={metricsItems}
      />
    </div>
  );
}
