import React, { useState } from "react";
import { CheckCircle2, Circle, Loader2, AlertCircle, Pause, Play, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ExecutionPlanStep } from "@/types/chat";
import { cn } from "@/lib/utils";

export interface ManusExecutionPlanBarProps {
  plan: ExecutionPlanStep[];
  isRunning?: boolean;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: (guidance?: string) => void;
  className?: string;
}

export function ManusExecutionPlanBar({
  plan,
  isRunning = false,
  isPaused = false,
  onPause,
  onResume,
  className,
}: ManusExecutionPlanBarProps) {
  const [guidanceText, setGuidanceText] = useState("");
  const [expanded, setExpanded] = useState(true);

  if (!Array.isArray(plan) || plan.length === 0) return null;

  const completed = plan.filter((s) => s.status === "completed").length;
  const percent = Math.round((completed / Math.max(plan.length, 1)) * 100);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-3 space-y-2",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-h-11 sm:min-h-8 items-center gap-2 text-left text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg px-1"
        >
          <span>Plano de Execução</span>
          <Badge variant="outline" className="text-2xs font-mono">
            {completed}/{plan.length} ({percent}%)
          </Badge>
        </button>

        <div className="flex items-center gap-2">
          {isRunning && onPause && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPause}
              className="h-11 min-h-11 sm:h-8 sm:min-h-8 px-3 text-xs gap-2 rounded-lg"
            >
              <Pause className="size-3.5" />
              <span>Pausar</span>
            </Button>
          )}
          {isPaused && onResume && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => {
                onResume(guidanceText.trim() || undefined);
                setGuidanceText("");
              }}
              className="h-11 min-h-11 sm:h-8 sm:min-h-8 px-3 text-xs gap-2 rounded-lg"
            >
              <Play className="size-3.5" />
              <span>Retomar</span>
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <ul className="space-y-1">
          {plan.map((step) => (
            <li key={step.id} className="flex items-start gap-2 text-xs text-muted-foreground">
              {step.status === "completed" ? (
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
              ) : step.status === "running" ? (
                <Loader2 className="size-3.5 text-primary animate-spin motion-reduce:animate-none shrink-0 mt-1" />
              ) : step.status === "failed" ? (
                <AlertCircle className="size-3.5 text-destructive shrink-0 mt-1" />
              ) : (
                <Circle className="size-3.5 text-muted-foreground/60 shrink-0 mt-1" />
              )}
              <span
                className={cn(
                  "leading-relaxed",
                  step.status === "completed" && "text-foreground",
                  step.status === "running" && "text-foreground font-medium",
                )}
              >
                {step.title}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isPaused && onResume && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onResume(guidanceText.trim() || undefined);
            setGuidanceText("");
          }}
          className="flex items-center gap-2 pt-1"
        >
          <Input
            value={guidanceText}
            onChange={(e) => setGuidanceText(e.target.value)}
            placeholder="Envie orientação opcional antes de retomar..."
            className="h-11 min-h-11 sm:h-9 sm:min-h-9 text-xs"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 text-xs gap-2 shrink-0"
          >
            <Send className="size-3.5" />
            <span>Enviar</span>
          </Button>
        </form>
      )}
    </div>
  );
}
