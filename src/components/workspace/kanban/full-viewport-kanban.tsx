import React from "react";
import { cn } from "@/lib/utils";

function getColumnColorClass(color?: string): string {
  if (!color) return "bg-primary/40";
  if (color.startsWith("bg-")) return color;
  const normalized = color.toLowerCase();
  if (normalized.includes("blue") || normalized.includes("info")) return "bg-blue-500";
  if (normalized.includes("amber") || normalized.includes("yellow") || normalized.includes("warning")) return "bg-amber-500";
  if (normalized.includes("green") || normalized.includes("emerald") || normalized.includes("success")) return "bg-emerald-500";
  if (normalized.includes("purple") || normalized.includes("indigo")) return "bg-indigo-500";
  if (normalized.includes("orange")) return "bg-orange-500";
  if (normalized.includes("rose") || normalized.includes("red") || normalized.includes("destructive")) return "bg-rose-500";
  if (normalized.includes("teal")) return "bg-teal-500";
  return "bg-primary/40";
}

export interface KanbanColumnDefinition<T = any> {
  id: string;
  title: string;
  color?: string;
  count?: number;
  headerAction?: React.ReactNode;
  footerAction?: React.ReactNode;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
}

export interface FullViewportKanbanProps<T = any> {
  columns: KanbanColumnDefinition<T>[];
  className?: string;
  columnWidthClass?: string;
}

export function FullViewportKanban<T = any>({
  columns,
  className,
  columnWidthClass = "w-72 sm:w-80",
}: FullViewportKanbanProps<T>) {
  return (
    <div
      className={cn(
        "tab-list flex gap-4 sm:gap-4 items-stretch flex-1 pb-4 overflow-x-auto no-scrollbar select-none",
        className
      )}
    >
      {columns.map((col) => (
        <div
          key={col.id}
          className={cn(
            "flex flex-col h-full shrink-0 rounded-3xl border border-border/60 bg-muted/40 overflow-hidden",
            columnWidthClass
          )}
        >
          {/* ── Header da Coluna (Fixo no topo da coluna) ── */}
          <div className={cn("h-1.5 w-full shrink-0", getColumnColorClass(col.color))} />
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/60 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {col.color && (
                <span

                  className={cn("size-2 rounded-full shrink-0", getColumnColorClass(col.color))}
                />
              )}
              <h3 className="text-xs font-bold text-foreground truncate">
                {col.title}
              </h3>
              <span className="text-2xs font-mono tabular-nums font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">
                {col.count ?? col.items.length}
              </span>
            </div>

            {col.headerAction && (
              <div className="shrink-0 flex items-center">{col.headerAction}</div>
            )}
          </div>

          {/* ── Área de Cards com Scroll Interno Independente ── */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-3">
            {col.items.map((item, idx) => (
              <React.Fragment key={(item as any)?.id || idx}>
                {col.renderItem(item, idx)}
              </React.Fragment>
            ))}

            {col.items.length === 0 && (
              <div className="h-full min-h-44 flex flex-col items-center justify-center p-4 text-center rounded-lg border border-dashed border-border/50 text-muted-foreground/60 text-xs gap-2">
                {col.emptyState || <span>Nenhum item nesta etapa</span>}
              </div>
            )}
          </div>

          {/* ── Footer da Coluna (Fixo no rodapé da coluna) ── */}
          {col.footerAction && (
            <div className="p-2 border-t border-border/50 bg-muted/10 shrink-0">
              {col.footerAction}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
