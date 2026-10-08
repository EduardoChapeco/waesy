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
  Coins,
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
  database: "Banco de Dados",
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

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <section
      role="region"
      aria-label="Trilha de execução do Copilot"
      aria-live="polite"
      className={cn(
        "rounded-lg border border-border/40 bg-muted/20 overflow-hidden text-xs transition-colors",
        hasError && "border-destructive/40 bg-destructive/5",
        className
      )}
    >
      {/* ── Cabeçalho do Rastreio / Resumo ── */}
      <div className="flex items-center justify-between p-2 gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={toggleExpanded}
          className="flex items-center gap-2 text-left flex-1 min-w-0 font-normal text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md cursor-pointer h-auto p-0 justify-start"
          aria-expanded={isExpanded}
        >
          <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {isStreaming || runningStep ? (
              <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
            ) : hasError ? (
              <AlertCircle className="size-3 text-destructive" />
            ) : (
              <CheckCircle2 className="size-3 text-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xs text-muted-foreground truncate">
                {runningStep
                  ? runningStep.label
                  : hasError
                  ? "Consulta com alerta"
                  : completedCount > 1
                  ? `${completedCount} fontes e ações consultadas`
                  : "Consulta ao ecossistema"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isExpanded ? (
              <ChevronUp className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            )}
          </div>
        </Button>

        {isStreaming && onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel} /* focus-visible:ring-2 */
            className="h-7 px-2 text-2xs font-semibold text-destructive hover:bg-destructive/10 rounded-md shrink-0 gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
            title="Cancelar processamento em execução"
          >
            <Square className="size-3 fill-destructive" />
            <span>Cancelar</span>
          </Button>
        )}
      </div>

      {/* ── Lista Detalhada de Passos Recarregável ── */}
      {isExpanded && (
        <div className="border-t border-border/40 divide-y divide-border/20 bg-background/50 px-3 py-2 space-y-2">
          {visibleSteps.map((step, idx) => {
            const Icon = STEP_ICONS[step.type] || Zap;

            return (
              <div
                key={step.id || idx}
                className={cn(
                  "flex items-start justify-between gap-3 pt-2 text-xs",
                  step.status === "failed" && "text-destructive"
                )}
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div
                    className={cn(
                      "size-5 rounded-md flex items-center justify-center shrink-0 mt-1 border",
                      step.status === "completed" && "bg-primary/10 border-primary/20 text-primary",
                      step.status === "running" && "bg-muted border-border/60 text-foreground",
                      step.status === "failed" && "bg-destructive/10 border-destructive/30 text-destructive",
                      step.status === "cancelled" && "bg-muted border-border/40 text-muted-foreground"
                    )}
                  >
                    {step.status === "running" ? (
                      <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Icon className="size-3" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {step.label}
                      </span>
                      <span className="text-2xs text-muted-foreground">
                        {STEP_LABELS[step.type]}
                      </span>
                    </div>

                    {step.detail && (
                      <p className="text-2xs text-muted-foreground font-mono mt-1 break-all">
                        {step.detail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono text-2xs text-muted-foreground">
                  {step.durationMs !== undefined && (
                    <span>{step.durationMs}ms</span>
                  )}
                  {step.status === "completed" && (
                    <CheckCircle2 className="size-3.5 text-primary" />
                  )}
                  {step.status === "failed" && (
                    <AlertCircle className="size-3.5 text-destructive" />
                  )}
                  {step.status === "cancelled" && (
                    <span className="text-muted-foreground">Cancelado</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
