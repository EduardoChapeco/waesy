import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState } from "@/components/state/states";

export type WorkspaceViewMode = "table" | "kanban" | "cards";

export interface UniversalViewManagerProps<T> {
  /** Active view mode to display */
  currentView: WorkspaceViewMode;
  /** Optional callback fired when the view mode is changed */
  onViewChange?: (mode: WorkspaceViewMode) => void;
  /** Primary dataset */
  data: T[];
  /** Render function for dense tabular representation */
  renderTable: (items: T[]) => React.ReactNode;
  /** Render function for column-based pipeline / kanban representation */
  renderKanban: (items: T[]) => React.ReactNode;
  /** Render function for card/grid representation */
  renderCards: (items: T[]) => React.ReactNode;
  /** Optional custom empty state node */
  emptyState?: React.ReactNode;
  /** Empty state title override */
  emptyTitle?: string;
  /** Empty state description override */
  emptyDescription?: string;
  /** Empty state primary action button label */
  emptyActionLabel?: string;
  /** Empty state primary action button callback */
  onEmptyAction?: () => void;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Optional custom skeleton renderer */
  renderSkeleton?: () => React.ReactNode;
  /** Error state indicator */
  isError?: boolean;
  /** Error object or message */
  error?: Error | string | null;
  /** Callback to retry query when in error state */
  onRetry?: () => void;
  /** Custom wrapper class */
  className?: string;
}

export function UniversalViewManager<T>({
  currentView,
  onViewChange,
  data,
  renderTable,
  renderKanban,
  renderCards,
  emptyState,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  isLoading = false,
  renderSkeleton,
  isError = false,
  error,
  onRetry,
  className,
}: UniversalViewManagerProps<T>) {
  // 1. Error State
  if (isError) {
    const errorMessage = typeof error === "string" ? error : error?.message;
    return (
      <div className={cn("w-full flex-1 flex flex-col justify-center items-center py-8", className)}>
        <ErrorState
          title="Erro ao carregar dados"
          description={errorMessage || "Não foi possível carregar os registros. Tente novamente."}
          onRetry={onRetry}
        />
      </div>
    );
  }

  // 2. Loading State (Custom skeleton or built-in auto skeleton per view mode)
  if (isLoading) {
    if (renderSkeleton) {
      return (
        <div className={cn("w-full flex-1 flex flex-col", className)}>
          {renderSkeleton()}
        </div>
      );
    }

    return (
      <div className={cn("w-full flex-1 flex flex-col", className)}>
        {currentView === "table" && <DefaultTableSkeleton />}
        {currentView === "kanban" && <DefaultKanbanSkeleton />}
        {currentView === "cards" && <DefaultCardsSkeleton />}
      </div>
    );
  }

  // 3. Empty State (Honest, clean empty state complying with DL-12)
  if (!data || data.length === 0) {
    if (emptyState) {
      return (
        <div className={cn("w-full flex-1 flex flex-col justify-center items-center py-8", className)}>
          {emptyState}
        </div>
      );
    }

    return (
      <div className={cn("w-full flex-1 flex flex-col justify-center items-center py-8", className)}>
        <EmptyState
          title={emptyTitle || "Nenhum registro encontrado"}
          description={emptyDescription || "Não há itens para exibir neste filtro ou visualização."}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
          minimal
        />
      </div>
    );
  }

  // 4. Content State (Single Sovereign Surface - zero containeritis)
  return (
    <div
      className={cn(
        "w-full flex-1 flex flex-col min-h-0 transition-opacity duration-150 motion-reduce:transition-none",
        className
      )}
    >
      {currentView === "table" && renderTable(data)}
      {currentView === "kanban" && renderKanban(data)}
      {currentView === "cards" && renderCards(data)}
      {currentView !== "table" && currentView !== "kanban" && currentView !== "cards" && renderTable(data)}
    </div>
  );
}

function DefaultTableSkeleton() {
  return (
    <div className="w-full rounded-lg border border-border/50 overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/40 bg-muted/30">
            <TableHead className="w-12 h-10"><Skeleton className="size-4 rounded" /></TableHead>
            <TableHead className="w-1/4 h-10"><Skeleton className="h-4 w-28 rounded" /></TableHead>
            <TableHead className="w-1/4 h-10"><Skeleton className="h-4 w-24 rounded" /></TableHead>
            <TableHead className="w-1/4 h-10"><Skeleton className="h-4 w-20 rounded" /></TableHead>
            <TableHead className="w-1/6 h-10 text-right"><Skeleton className="h-4 w-16 ml-auto rounded" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[0, 1, 2, 3, 4].map((i) => (
            <TableRow key={i} className="min-h-11 sm:h-9 border-b border-border/40">
              <TableCell className="w-12"><Skeleton className="size-4 rounded" /></TableCell>
              <TableCell><Skeleton className="h-4 w-3/4 rounded" /></TableCell>
              <TableCell><Skeleton className="h-4 w-1/2 rounded" /></TableCell>
              <TableCell><Skeleton className="h-4 w-2/3 rounded" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto rounded" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DefaultKanbanSkeleton() {
  return (
    <div className="tab-list flex gap-4 items-stretch flex-1 pb-4 overflow-x-auto no-scrollbar select-none">
      {[0, 1, 2].map((col) => (
        <div key={col} className="w-72 sm:w-80 shrink-0 rounded-3xl border border-border/60 bg-muted/40 p-3 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          {[0, 1, 2].map((card) => (
            <div key={card} className="p-4 rounded-2xl border border-border/60 bg-card space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="size-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DefaultCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 rounded-2xl border border-border/60 bg-card space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded" />
          <div className="flex justify-between items-center pt-1 border-t border-border/40">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
