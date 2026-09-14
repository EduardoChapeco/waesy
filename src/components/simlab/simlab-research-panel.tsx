import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Activity,
  FileLineChart,
  BrainCircuit,
  Users,
  Search,
  Rocket,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Loader2,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  listResearchSessions,
  createSimLabExperiment,
  executeSimLabBatchSimulation,
  fetchSyntheticArchetypes,
} from "@/services/simlab.functions";
import type { SyntheticArchetype } from "@/types/simlab";

export type ResearchTab = "market" | "brand" | "planning";

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
      "Ex: Vamos lançar um pacote de viagem ou produto exclusivo por R$ 4.200. Qual a aceitação do público e probabilidade real de compra?",
    moduleType: "market_research",
    stimulusType: "product_hypothesis",
  },
  {
    id: "brand",
    label: "Validação de Marca",
    icon: Activity,
    placeholder:
      "Ex: Queremos mudar o tom da nossa comunicação para mais descontraído e focado na geração Z. Como as diferentes classes socioeconômicas reagem?",
    moduleType: "brand_audit",
    stimulusType: "brand_tone",
  },
  {
    id: "planning",
    label: "Plano Estratégico",
    icon: Rocket,
    placeholder:
      "Ex: Meta: vender 50 pacotes/unidades este mês usando tráfego pago, Instagram ads e WhatsApp com oferta antecipada. Como estruturar?",
    moduleType: "strategic_planning",
    stimulusType: "campaign_brief",
  },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  queued: { label: "Na fila", color: "text-blue-500", icon: Clock },
  running: { label: "Processando", color: "text-amber-500", icon: Loader2 },
  completed: {
    label: "Concluído",
    color: "text-emerald-500",
    icon: CheckCircle2,
  },
  failed: { label: "Falhou", color: "text-red-500", icon: XCircle },
  cancelled: { label: "Cancelado", color: "text-muted-foreground", icon: XCircle },
};

const VERDICT_CONFIG: Record<string, { label: string; color: string }> = {
  approved: {
    label: "Aprovado",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  revise: {
    label: "Revisar",
    color: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
  blocked: {
    label: "Bloqueado",
    color: "bg-destructive/15 text-destructive border-destructive/30",
  },
  aprovado_para_veiculacao: {
    label: "Aprovado",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  revisar_com_ajustes: {
    label: "Revisar",
    color: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
  bloqueado_por_alto_risco: {
    label: "Bloqueado",
    color: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

export interface SimResearchRun {
  id: string;
  title: string;
  objective: string;
  module_type?: string;
  stimulus_type?: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  verdict?: string | null;
  summary_insight?: string;
  execution_results?: Array<{
    persona_name: string;
    purchase_intent: number;
    feedback: string;
  }>;
  score?: number | null;
  created_at?: string;
}

function RunHistoryItem({
  run,
  isSelected,
  onClick,
}: {
  run: SimResearchRun;
  isSelected: boolean;
  onClick: () => void;
}) {
  const status = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.completed;
  const StatusIcon = status.icon;
  const isActive = run.status === "queued" || run.status === "running";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-xl border transition-all group cursor-pointer",
        isSelected
          ? "bg-primary/10 border-primary/40 shadow-xs"
          : "bg-card border-border/70 hover:bg-muted/50 hover:border-primary/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground truncate flex-1">
          {run.title || run.objective}
        </span>
        <StatusIcon
          size={12}
          className={cn(status.color, isActive && "animate-spin")}
        />
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
          {(run.module_type || "pesquisa").replace("_", " ")}
        </span>
        {run.verdict && VERDICT_CONFIG[run.verdict] && (
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded border font-semibold",
              VERDICT_CONFIG[run.verdict].color,
            )}
          >
            {VERDICT_CONFIG[run.verdict].label}
          </span>
        )}
      </div>
    </button>
  );
}

function InsightPanel({ run }: { run: SimResearchRun | null }) {
  if (!run) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60 p-6 min-h-[300px]">
        <BrainCircuit size={48} className="text-muted-foreground" />
        <div>
          <p className="font-bold text-sm text-foreground">
            Nenhuma simulação selecionada
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie uma nova pesquisa ou selecione um item do histórico ao lado.
          </p>
        </div>
      </div>
    );
  }

  const isRunning = run.status === "queued" || run.status === "running";

  if (isRunning) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-6 min-h-[300px]">
        <div className="relative">
          <BrainCircuit size={48} className="text-primary animate-pulse" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping" />
        </div>
        <div>
          <p className="font-bold text-sm text-foreground">
            Injetando estímulos nas personas...
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Calculando utilidade discreta McFadden e sensibilidade ABEP.
          </p>
        </div>
        <div className="flex gap-1 justify-center pt-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (run.status === "failed") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-6 min-h-[300px]">
        <XCircle size={48} className="text-destructive" />
        <div>
          <p className="font-bold text-sm text-foreground">Simulação falhou</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ocorreu um erro no processamento do modelo. Tente novamente.
          </p>
        </div>
      </div>
    );
  }

  const avgScore =
    run.score ??
    (run.execution_results && run.execution_results.length > 0
      ? Math.round(
          run.execution_results.reduce((acc, curr) => acc + curr.purchase_intent, 0) /
            run.execution_results.length,
        )
      : null);

  return (
    <div className="space-y-5 animate-in fade-in zoom-in-95">
      {/* Score */}
      {avgScore !== null && (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-3 rounded-xl border",
              avgScore > 65
                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                : "bg-amber-500/15 text-amber-600 border-amber-500/30",
            )}
          >
            <FileLineChart size={24} />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Score de Viabilidade de Mercado
            </p>
            <span className="text-3xl font-extrabold text-foreground">
              {avgScore}%
            </span>
          </div>
        </div>
      )}

      {/* Veredito */}
      {run.verdict && VERDICT_CONFIG[run.verdict] && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">
            Veredito Geral
          </p>
          <span
            className={cn(
              "inline-block text-xs px-3 py-1 rounded-full border font-bold",
              VERDICT_CONFIG[run.verdict].color,
            )}
          >
            {VERDICT_CONFIG[run.verdict].label}
          </span>
        </div>
      )}

      {/* Sumário executivo */}
      {run.summary_insight && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1">
            <BrainCircuit size={12} className="text-primary" /> Análise Executiva
          </p>
          <p className="text-xs text-foreground/90 leading-relaxed bg-muted/40 rounded-xl p-3.5 border border-border/60">
            {run.summary_insight}
          </p>
        </div>
      )}

      {/* Feedbacks de Personas */}
      {run.execution_results && run.execution_results.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-500" /> Reações Preditivas
          </p>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {run.execution_results.map((res, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1 p-2.5 bg-background rounded-xl border border-border/60"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {res.persona_name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-mono",
                      res.purchase_intent > 60
                        ? "text-emerald-600 border-emerald-500/30"
                        : "text-amber-600 border-amber-500/30",
                    )}
                  >
                    {res.purchase_intent}% intenção
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {res.feedback}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SimLabResearchPanel({ storeId }: { storeId: string }) {
  const [activeTab, setActiveTab] = useState<ResearchTab>("market");
  const [prompt, setPrompt] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [runs, setRuns] = useState<SimResearchRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [personasCount, setPersonasCount] = useState(12);

  const currentTab = TAB_CONFIG.find((t) => t.id === activeTab)!;

  const loadData = useCallback(async () => {
    try {
      const [sessions, archetypes] = await Promise.all([
        listResearchSessions().catch(() => []),
        fetchSyntheticArchetypes().catch(() => []),
      ]);

      if (archetypes && archetypes.length > 0) {
        setPersonasCount(archetypes.length);
      }

      if (sessions && sessions.length > 0) {
        const formatted: SimResearchRun[] = sessions.map((s: any) => ({
          id: s.id,
          title: s.title || "Pesquisa Sem Título",
          objective: s.objective || "",
          module_type: "market_research",
          status: "completed",
          verdict: "approved",
          summary_insight: s.summary_insight,
          execution_results: s.execution_results,
        }));
        setRuns(formatted);
        if (!selectedRunId && formatted[0]) {
          setSelectedRunId(formatted[0].id);
        }
      }
    } catch (err) {
      console.warn("Erro ao carregar dados do SimLab Research:", err);
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
    if (!prompt.trim()) {
      toast.error("Descreva a ideia ou pesquisa que deseja validar.");
      return;
    }

    setIsDispatching(true);
    const tempId = `temp-${Date.now()}`;
    const newRun: SimResearchRun = {
      id: tempId,
      title: prompt.slice(0, 50) + (prompt.length > 50 ? "..." : ""),
      objective: prompt.trim(),
      module_type: currentTab.moduleType,
      stimulus_type: currentTab.stimulusType,
      status: "running",
    };

    setRuns((prev) => [newRun, ...prev]);
    setSelectedRunId(tempId);

    try {
      const expRes = await createSimLabExperiment({
        data: {
          storeId: storeId || "default",
          title: newRun.title,
          objective: prompt.trim(),
          stimulusPayload: {
            text: prompt.trim(),
            module_type: currentTab.moduleType,
            stimulus_type: currentTab.stimulusType,
          },
          sampleSize: personasCount,
        },
      });

      const expId = expRes?.experiment?.id || tempId;

      const simRes = await executeSimLabBatchSimulation({
        experimentId: expId,
        storeId: storeId || "default",
      });

      toast.success("Simulação concluída e registrada no banco de dados!");

      const updatedRun: SimResearchRun = {
        ...newRun,
        id: expId,
        status: "completed",
        verdict:
          simRes.synthesis.synthetic_nps > 20
            ? "approved"
            : simRes.synthesis.synthetic_nps >= -10
              ? "revise"
              : "blocked",
        score: Math.round(simRes.synthesis.overall_approval_rate),
        summary_insight: `NPS Sintético: ${simRes.synthesis.synthetic_nps}. Intervalo de Conversão Estimado: ${simRes.synthesis.estimated_conversion_range[0]}% a ${simRes.synthesis.estimated_conversion_range[1]}%.`,
        execution_results: simRes.responses.map((r) => ({
          persona_name: r.persona_id || "Persona",
          purchase_intent: Math.round(r.choice_probability_percent || 0),
          feedback: r.natural_speech_verbatim || r.primary_objection || "Sem observações",
        })),
      };

      setRuns((prev) => prev.map((r) => (r.id === tempId ? updatedRun : r)));
      setSelectedRunId(expId);
      setPrompt("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro na simulação.";
      toast.error(msg);
      setRuns((prev) =>
        prev.map((r) => (r.id === tempId ? { ...r, status: "failed" } : r)),
      );
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Header com Indicadores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full mb-1">
            <BrainCircuit size={12} className="text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
              SimLab Research Engine
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs text-muted-foreground">
            Injete hipóteses, testes A/B ou mudanças de posicionamento para
            validação com as personas calibradas pelo Censo IBGE.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Users size={14} className="text-primary" />
          <span className="font-semibold text-foreground">
            {personasCount} personas ativas
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsRefreshing(true);
              void loadData();
            }}
            disabled={isRefreshing}
            className="h-8 w-8 rounded-lg"
          >
            <RefreshCw
              size={13}
              className={cn(isRefreshing && "animate-spin text-primary")}
            />
          </Button>
        </div>
      </div>

      {/* Tabs de Seleção do Estímulo */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60 w-fit">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer",
                isActive
                  ? "bg-background text-foreground shadow-xs border border-border/80"
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
        {/* Coluna Esquerda: Histórico */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <History size={13} />
              Histórico ({runs.length})
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-4 bg-card rounded-xl border border-border/60">
              <Loader2 size={14} className="animate-spin text-primary" />{" "}
              Carregando histórico...
            </div>
          ) : runs.length === 0 ? (
            <div className="p-5 rounded-xl bg-card border border-border/60 text-center space-y-1">
              <p className="text-xs font-medium text-foreground">
                Nenhuma pesquisa registrada
              </p>
              <p className="text-[11px] text-muted-foreground">
                Envie seu primeiro estímulo no formulário ao lado.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {runs.map((run) => (
                <RunHistoryItem
                  key={run.id}
                  run={run}
                  isSelected={selectedRun?.id === run.id}
                  onClick={() => setSelectedRunId(run.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Coluna Centro: Formulação */}
        <div className="lg:col-span-4 space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              {activeTab === "market" && (
                <>
                  <Search size={14} className="text-primary" /> Hipótese de Produto
                </>
              )}
              {activeTab === "brand" && (
                <>
                  <Activity size={14} className="text-primary" /> Auditoria de Tom e
                  DNA
                </>
              )}
              {activeTab === "planning" && (
                <>
                  <Rocket size={14} className="text-primary" /> Briefing de
                  Estratégia
                </>
              )}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Descreva a proposta em detalhes. As personas sintéticas reagirão
              avaliando viabilidade, objeções e atrito de preço.
            </p>
          </div>

          <textarea
            className="w-full bg-background border border-input rounded-xl p-3 text-xs text-foreground
                       placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/40
                       outline-none min-h-[220px] resize-none transition-colors leading-relaxed"
            placeholder={currentTab.placeholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

          <div className="flex items-center justify-between pt-1">
            <Badge
              variant="outline"
              className="text-[10px] text-muted-foreground font-mono"
            >
              {currentTab.stimulusType.replace("_", " ")}
            </Badge>

            <Button
              type="button"
              disabled={isDispatching || !prompt.trim()}
              onClick={() => void handleSimulate()}
              className="rounded-xl font-bold gap-2 h-11 min-h-[44px] px-5 cursor-pointer"
            >
              {isDispatching ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Rodando...
                </>
              ) : (
                <>
                  <Zap size={14} /> Rodar Pesquisa
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Coluna Direita: Resultado */}
        <div className="lg:col-span-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs min-h-[380px] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Diagnóstico do Modelo
            </span>
            {selectedRun && (
              <span
                className={cn(
                  "text-[10px] font-bold uppercase",
                  STATUS_CONFIG[selectedRun.status]?.color,
                )}
              >
                {STATUS_CONFIG[selectedRun.status]?.label}
              </span>
            )}
          </div>
          <InsightPanel run={selectedRun} />
        </div>
      </div>
    </div>
  );
}
