import React, { useState } from "react";
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
export type { AIActivityStepType, AIActivityStepStatus, AIActivityStep };

export interface AIActivityTrailProps {
  steps: AIActivityStep[];
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
  isStreaming = false,
  onCancel,
  className,
}: AIActivityTrailProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(isStreaming);

  if (!steps || steps.length === 0) {
    return null;
  }

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const runningStep = steps.find((s) => s.status === "running");
  const failedStep = steps.find((s) => s.status === "failed");
  const hasError = Boolean(failedStep);
  const totalDurationMs = steps.reduce(
    (acc, curr) => acc + (curr.durationMs || 0),
    0
  );
  const totalTokens = steps.reduce(
    (acc, curr) => acc + (curr.tokensUsed || 0),
    0
  );

  const toggleExpanded = () => {
    setIsExpanded((prev) => (prev === false ? true : false));
  };

  return (
    <section
      role="region"
      aria-label="Trilha de execução da inteligência artificial"
      aria-live="polite"
      className={cn(
        "rounded-lg border border-border/60 bg-muted/30 overflow-hidden text-xs transition-colors",
        hasError && "border-destructive/40 bg-destructive/5",
        className
      )}
    >
      {/* ── Cabeçalho do Rastreio / Resumo ── */}
      <div className="flex items-center justify-between p-3 gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={toggleExpanded} /* focus-visible:ring-2 */
          className="flex items-center gap-2 text-left flex-1 min-w-0 font-medium text-foreground hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md cursor-pointer h-auto p-0 justify-start"
          aria-expanded={isExpanded}
        >

          <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {isStreaming || runningStep ? (
              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : hasError ? (
              <AlertCircle className="size-3.5 text-destructive" />
            ) : (
              <CheckCircle2 className="size-3.5 text-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-foreground truncate">
                {runningStep
                  ? runningStep.label
                  : hasError
                  ? "Execução interrompida"
                  : `${completedCount} etapas concluídas`}
              </span>
              <Badge variant="outline" className="text-2xs font-mono h-4 px-2 border-border/40">
                {steps.length} {steps.length === 1 ? "passo" : "passos"}
              </Badge>
            </div>
            {runningStep && runningStep.detail && (
              <p className="text-2xs text-muted-foreground truncate mt-1 font-mono">
                {runningStep.detail}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {totalDurationMs > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-2xs text-muted-foreground font-mono">
                <Clock className="size-3" />
                {totalDurationMs}ms
              </span>
            )}
            {totalTokens > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-2xs text-muted-foreground font-mono">
                <Coins className="size-3" />
                {totalTokens} tok
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
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
          {steps.map((step, idx) => {
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
