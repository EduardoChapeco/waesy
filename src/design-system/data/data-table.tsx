import * as React from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import { DataEmptyState } from "./data-empty-state";

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  isSortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onEmptyAction?: () => void;
  emptyActionText?: string;
  isSelectable?: boolean;
  selectedIds?: string[];
  onSelectIdsChange?: (ids: string[]) => void;
  sortColumnId?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (columnId: string, direction: "asc" | "desc") => void;
  page?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (newPage: number) => void;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  errorMessage,
  onRetry,
  emptyTitle,
  emptyDescription,
  onEmptyAction,
  emptyActionText,
  isSelectable = false,
  selectedIds = [],
  onSelectIdsChange,
  sortColumnId,
  sortDirection = "asc",
  onSortChange,
  page = 1,
  pageSize = 10,
  totalItems,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const { isCompact } = useWindowSizeClass();

  // Handle Sort
  const handleSort = (columnId: string) => {
    if (!onSortChange) return;
    if (sortColumnId === columnId) {
      onSortChange(columnId, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSortChange(columnId, "asc");
    }
  };

  // Handle Select All
  const allIds = data.map(keyExtractor);
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const isSomeSelected = allIds.some((id) => selectedIds.includes(id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (!onSelectIdsChange) return;
    if (isAllSelected) {
      onSelectIdsChange([]);
    } else {
      onSelectIdsChange(allIds);
    }
  };

  // Handle Single Select
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectIdsChange) return;
    if (selectedIds.includes(id)) {
      onSelectIdsChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectIdsChange([...selectedIds, id]);
    }
  };

  // Estado: Erro
  if (errorMessage) {
    return (
      <div className="p-6 rounded-lg border border-destructive/40 bg-destructive/5 flex flex-col items-center justify-center text-center gap-3">
        <AlertCircle className="size-6 text-destructive shrink-0" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">Falha ao carregar dados</h4>
          <p className="text-xs text-muted-foreground">{errorMessage}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-lg bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            <span>Tentar Novamente</span>
          </button>
        )}
      </div>
    );
  }

  // Estado: Carregamento (Skeleton)
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
        <div className="h-11 border-b border-border/50 bg-muted/30 flex items-center px-4">
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="h-10 w-full rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Estado: Vazio
  if (data.length === 0) {
    return (
      <DataEmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionText={emptyActionText}
        onAction={onEmptyAction}
      />
    );
  }

  // Visualização Compacta / Mobile
  if (isCompact) {
    return (
      <div className={cn("space-y-2", className)}>
        {data.map((item) => {
          const rowId = keyExtractor(item);
          const isSelected = selectedIds.includes(rowId);

          return (
            <div
              key={rowId}
              onClick={() => onRowClick?.(item)}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn(
                "p-4 rounded-lg border border-border/70 bg-card select-none space-y-2 transition-colors",
                isSelected && "border-primary bg-primary/5",
                onRowClick && "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              )}
            >
              <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isSelectable && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      onClick={(e) => handleToggleSelect(rowId, e)}
                      className="size-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                    />
                  )}
                  <span className="text-xs font-semibold text-foreground truncate">
                    {columns[0]?.cell ? columns[0].cell(item) : String(item[columns[0]?.accessorKey as keyof T] ?? "")}
                  </span>
                </div>
                {columns[1] && (
                  <span className="text-xs text-muted-foreground shrink-0 font-mono tabular-nums">
                    {columns[1]?.cell ? columns[1].cell(item) : String(item[columns[1]?.accessorKey as keyof T] ?? "")}
                  </span>
                )}
              </div>

              {/* Remaining Columns */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                {columns.slice(2).map((col) => (
                  <div key={col.id} className="space-y-1">
                    <span className="text-3xs text-muted-foreground uppercase tracking-wider block">
                      {col.header}
                    </span>
                    <div className="text-foreground font-medium truncate">
                      {col.cell ? col.cell(item) : String(item[col.accessorKey as keyof T] ?? "-")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Visualização Desktop: Tabela de Alta Legibilidade
  return (
    <div className={cn("rounded-lg border border-border/70 bg-card overflow-hidden select-none", className)}>
      <div className="overflow-x-auto native-scroll">
        <table className="w-full text-left text-xs border-collapse">
          {/* Header */}
          <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-semibold">
            <tr>
              {isSelectable && (
                <th className="w-11 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    aria-label="Selecionar todas as linhas"
                    className="size-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  />
                </th>
              )}

              {columns.map((col) => {
                const isSorted = sortColumnId === col.id;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    style={{ width: col.width }}
                    onClick={() => col.isSortable && handleSort(col.id)}
                    className={cn(
                      "px-4 py-3 font-semibold tracking-tight",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.isSortable && "cursor-pointer hover:text-foreground select-none"
                    )}
                  >
                    <div
                      className={cn(
                        "inline-flex items-center gap-2",
                        col.align === "right" && "justify-end",
                        col.align === "center" && "justify-center"
                      )}
                    >
                      <span>{col.header}</span>
                      {col.isSortable && (
                        <span className="text-muted-foreground/60">
                          {isSorted ? (
                            sortDirection === "asc" ? (
                              <ChevronUp className="size-3.5 text-foreground" />
                            ) : (
                              <ChevronDown className="size-3.5 text-foreground" />
                            )
                          ) : (
                            <ChevronDown className="size-3.5 opacity-30" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-border/40 text-foreground">
            {data.map((item) => {
              const rowId = keyExtractor(item);
              const isSelected = selectedIds.includes(rowId);

              return (
                <tr
                  key={rowId}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "transition-colors duration-100",
                    isSelected && "bg-primary/5",
                    onRowClick && "cursor-pointer hover:bg-muted/40"
                  )}
                >
                  {isSelectable && (
                    <td className="w-11 px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        onClick={(e) => handleToggleSelect(rowId, e)}
                        aria-label={`Selecionar item ${rowId}`}
                        className="size-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                      />
                    </td>
                  )}

                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        "px-4 py-3 text-xs leading-normal",
                        col.align === "right" && "text-right font-mono tabular-nums",
                        col.align === "center" && "text-center"
                      )}
                    >
                      {col.cell ? col.cell(item) : String(item[col.accessorKey as keyof T] ?? "-")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalItems !== undefined && onPageChange && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground">
          <span>
            Página {page} de {Math.max(1, Math.ceil(totalItems / pageSize))} ({totalItems} itens)
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Página anterior"
              className="size-8 rounded-lg flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              disabled={page >= Math.ceil(totalItems / pageSize)}
              onClick={() => onPageChange(page + 1)}
              aria-label="Próxima página"
              className="size-8 rounded-lg flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
