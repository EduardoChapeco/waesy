import React, { useEffect, useState } from "react";
import {
  Zap,
  Wrench,
  Search,
  Database,
  Users,
  Cpu,
  Brain,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Square,
  Clock,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AIActivityStepType, AIActivityStepStatus, AIActivityStep } from "@/types/chat";
import { subscribeToTableChanges } from "@/services/realtime-channel";
export type { AIActivityStepType, AIActivityStepStatus, AIActivityStep };

export interface AIActivityTrailProps {
  steps: AIActivityStep[];
  executionId?: string;
  isStreaming?: boolean;
  onCancel?: () => void;
  className?: string;
}

const STEP_ICONS: Record<AIActivityStepType, React.ElementType> = {
  skill: Zap,
  tool: Wrench,
  search: Search,
  database: Database,
  squad: Users,
  model: Cpu,
  thought: Brain,
};

const STEP_LABELS: Record<AIActivityStepType, string> = {
  skill: "Skill",
  tool: "Ferramenta",
  search: "Pesquisa",
  database: "Dados",
  squad: "Esquadrão",
  model: "Modelo",
  thought: "Raciocínio",
};

export function AIActivityTrail({
  steps,
  executionId,
  isStreaming = false,
  onCancel,
  className,
}: AIActivityTrailProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [persistedSteps, setPersistedSteps] = useState<AIActivityStep[]>([]);

  useEffect(() => {
    setPersistedSteps([]);
    if (!executionId) return;
    return subscribeToTableChanges<Record<string, any>>({
      channelName: `copilot-execution-steps-${executionId}`,
      table: "copilot_execution_steps",
      event: "*",
      filter: `execution_id=eq.${executionId}`,
      onPayload: ({ new: row, eventType }) => {
        if (eventType === "DELETE") return;
        setPersistedSteps((current) => {
          const next: AIActivityStep = {
            id: String(row.step_id),
            type: (row.step_type || "tool") as AIActivityStepType,
            label: String(row.label || "Etapa do agente"),
            detail: row.detail || undefined,
            status: row.status === "running" ? "running" : row.status === "failed" ? "failed" : row.status === "cancelled" ? "cancelled" : "completed",
            fsmPhase: row.fsm_phase || undefined,
            startedAt: row.started_at,
            completedAt: row.completed_at || undefined,
            durationMs: row.duration_ms || undefined,
            tokensUsed: row.tokens_used || undefined,
            costUsd: row.cost_usd ? Number(row.cost_usd) : undefined,
          };
          return current.some((step) => step.id === next.id) ? current.map((step) => step.id === next.id ? next : step) : [...current, next];
        });
      },
    });
  }, [executionId]);

  const visibleSteps = persistedSteps.length > 0 ? persistedSteps : steps;

  if (!visibleSteps || visibleSteps.length === 0) {
    return null;
  }

  const completedCount = visibleSteps.filter((s) => s.status === "completed").length;
  const runningStep = visibleSteps.find((s) => s.status === "running");
  const failedStep = visibleSteps.find((s) => s.status === "failed");
  const hasError = Boolean(failedStep);
  const isCurrentlyWorking = Boolean(isStreaming || runningStep);

  const totalDuration = visibleSteps.reduce((acc, s) => acc + (s.durationMs || 0), 0);

  return (
    <div
      role="region"
      aria-label="Trilha de execução e fontes"
      className={cn("my-1.5 transition-all text-2xs", className)}
    >
      {/* ── CARD EM EXECUÇÃO ATIVA: Minimalista, moderno com pulse sutil ── */}
      {isCurrentlyWorking ? (
        <div className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-foreground animate-in fade-in duration-200">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="size-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Loader2 className="size-3 text-primary animate-spin motion-reduce:animate-none" />
            </div>
            <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground truncate">
                {runningStep ? runningStep.label : "Processando requisição..."}
              </span>
              {runningStep?.detail && (
                <span className="text-muted-foreground truncate hidden sm:inline text-3xs font-mono">
                  • {runningStep.detail}
                </span>
              )}
            </div>
          </div>

          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-6 px-2 text-3xs font-semibold text-destructive hover:bg-destructive/10 rounded shrink-0 gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
              title="Cancelar execução"
            >
              <Square className="size-2.5 fill-destructive" />
              <span>Parar</span>
            </Button>
          )}
        </div>
      ) : (
        /* ── RESUMO CONCLUÍDO: Linha minimalista e silenciosa (Linear / Perplexity Style) ── */
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="group flex items-center gap-2 text-left py-1 px-2 -ml-2 rounded-md hover:bg-muted/40 transition-colors cursor-pointer text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            aria-expanded={isExpanded}
          >
            <div className="size-3.5 rounded-full bg-muted flex items-center justify-center shrink-0 text-primary">
              {hasError ? (
                <AlertCircle className="size-3 text-destructive" />
              ) : (
                <CheckCircle2 className="size-3 text-primary" />
              )}
            </div>

            <span className="text-2xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {hasError
                ? "Consulta concluída com alertas"
                : completedCount > 1
                ? `${completedCount} etapas e fontes consultadas`
                : "1 etapa concluída"}
              {totalDuration > 0 && (
                <span className="text-muted-foreground/60 font-mono text-3xs ml-1.5">
                  ({totalDuration}ms)
                </span>
              )}
            </span>

            {isExpanded ? (
              <ChevronUp className="size-3 text-muted-foreground/60 group-hover:text-foreground" />
            ) : (
              <ChevronDown className="size-3 text-muted-foreground/60 group-hover:text-foreground" />
            )}
          </button>

          {/* ── TIMELINE VERTICAL MINIMALISTA EXPANDIDA ── */}
          {isExpanded && (
            <div className="relative pl-4 ml-1.5 border-l border-border/40 space-y-2 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
              {visibleSteps.map((step, idx) => {
                const Icon = STEP_ICONS[step.type] || Zap;

                return (
                  <div
                    key={step.id || idx}
                    className="relative flex items-start justify-between gap-3 text-2xs group"
                  >
                    {/* Marcador na linha */}
                    <div className="absolute -left-[1.3125rem] top-1 size-2 rounded-full border border-background bg-border group-hover:bg-primary transition-colors" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Icon className="size-3 text-primary shrink-0" />
                        <span className="font-semibold text-foreground truncate">
                          {step.label}
                        </span>
                        <span className="text-3xs uppercase tracking-wider text-muted-foreground font-mono bg-muted/60 px-1 py-0.2 rounded">
                          {STEP_LABELS[step.type]}
                        </span>
                      </div>

                      {step.detail && (
                        <p className="text-3xs text-muted-foreground font-mono mt-0.5 truncate">
                          {step.detail}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 font-mono text-3xs text-muted-foreground/75 flex items-center gap-1.5">
                      {step.durationMs !== undefined && (
                        <span>{step.durationMs}ms</span>
                      )}
                      {step.status === "completed" && (
                        <CheckCircle2 className="size-3 text-primary" />
                      )}
                      {step.status === "failed" && (
                        <AlertCircle className="size-3 text-destructive" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
