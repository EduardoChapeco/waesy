import * as React from "react";
import { CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* 1. TaskRow                                                                 */
/* -------------------------------------------------------------------------- */

export interface TaskRowProps {
  id: string;
  title: string;
  category?: string;
  dueDate?: string;
  completed?: boolean;
  onToggleComplete?: (completed: boolean) => void;
  priority?: "low" | "medium" | "high";
  className?: string;
}

export function TaskRow({
  id,
  title,
  category,
  dueDate,
  completed = false,
  onToggleComplete,
  priority = "medium",
  className,
}: TaskRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card hover:border-primary/40 transition-colors select-none",
        completed && "opacity-60 bg-muted/20",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => onToggleComplete?.(!completed)}
          aria-label={completed ? "Marcar como pendente" : "Marcar como concluída"}
          className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", 
            "size-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer",
            completed
              ? "bg-primary border-primary text-primary-foreground"
              : "border-border/80 hover:border-primary"
          )}
        >
          {completed && <CheckCircle2 className="size-3.5" />}
        </button>

        <div className="space-y-1 min-w-0">
          <span
            className={cn(
              "text-xs font-medium text-foreground truncate block",
              completed && "line-through text-muted-foreground"
            )}
          >
            {title}
          </span>
          <div className="flex items-center gap-2 text-3xs text-muted-foreground">
            {category && <span>{category}</span>}
            {dueDate && <span>• Vence {dueDate}</span>}
          </div>
        </div>
      </div>

      <div className="shrink-0">
        <span
          className={cn(
            "text-3xs font-semibold px-2 py-1 rounded-full uppercase font-mono",
            priority === "high" && "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20",
            priority === "medium" && "bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20",
            priority === "low" && "bg-muted text-muted-foreground"
          )}
        >
          {priority}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. QuickActions                                                            */
/* -------------------------------------------------------------------------- */

export interface QuickActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

export interface QuickActionsProps {
  actions: QuickActionItem[];
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-2", className)}>
      {actions.map((act) => (
        <button
          key={act.id}
          type="button"
          onClick={act.onClick}
          className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/40 hover:border-primary/50 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center gap-2 min-w-0">
            {act.icon && (
              <span className="size-4 shrink-0 text-primary">{act.icon}</span>
            )}
            <span className="text-xs font-semibold text-foreground truncate">
              {act.label}
            </span>
          </div>
          <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}
