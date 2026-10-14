import * as React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataEmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function DataEmptyState({
  title = "Nenhum dado encontrado",
  description = "Não há registros disponíveis para os filtros selecionados.",
  actionText,
  onAction,
  icon,
  className,
}: DataEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center min-h-64 rounded-lg border border-dashed border-border/80 bg-muted/10",
        className
      )}
    >
      <div className="size-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground mb-3 shrink-0">
        {icon ?? <FolderOpen className="size-6" />}
      </div>

      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4 leading-relaxed">
        {description}
      </p>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="min-h-11 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
