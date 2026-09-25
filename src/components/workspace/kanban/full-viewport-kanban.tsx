import React from "react";
import { cn } from "@/lib/utils";

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
  columnWidthClass = "w-[300px] sm:w-[320px]",
}: FullViewportKanbanProps<T>) {
  return (
    <div
      className={cn(
        "flex gap-3.5 sm:gap-4 items-stretch h-[calc(100dvh-8.5rem)] sm:h-[calc(100dvh-8rem)] pb-4 overflow-x-auto no-scrollbar select-none",
        className
      )}
    >
      {columns.map((col) => (
        <div
          key={col.id}
          className={cn(
            "flex flex-col h-full shrink-0 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs shadow-2xs overflow-hidden",
            columnWidthClass
          )}
        >
          {/* ── Header da Coluna (Fixo no topo da coluna) ── */}
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/50 bg-muted/20 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {col.color && (
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: col.color }}
                />
              )}
              <h3 className="text-xs font-bold text-foreground truncate">
                {col.title}
              </h3>
              <span className="text-[10px] font-mono font-bold text-muted-foreground bg-background px-1.5 py-0.5 rounded-md border border-border/50 shrink-0">
                {col.count ?? col.items.length}
              </span>
            </div>

            {col.headerAction && (
              <div className="shrink-0 flex items-center">{col.headerAction}</div>
            )}
          </div>

          {/* ── Área de Cards com Scroll Interno Independente ── */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2.5 space-y-2.5">
            {col.items.map((item, idx) => (
              <React.Fragment key={(item as any)?.id || idx}>
                {col.renderItem(item, idx)}
              </React.Fragment>
            ))}

            {col.items.length === 0 && (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center p-4 text-center rounded-lg border border-dashed border-border/50 text-muted-foreground/60 text-xs gap-1.5">
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
