import * as React from "react";
import { Search, SlidersHorizontal, Download, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  selectedCount?: number;
  totalCount?: number;
  onBulkDelete?: () => void;
  onBulkExport?: () => void;
  onRefresh?: () => void;
  filterChips?: { id: string; label: string; count?: number; active?: boolean }[];
  onToggleFilter?: (id: string) => void;
  customActions?: React.ReactNode;
  className?: string;
}

export function TableToolbar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Filtrar registros...",
  selectedCount = 0,
  totalCount,
  onBulkDelete,
  onBulkExport,
  onRefresh,
  filterChips,
  onToggleFilter,
  customActions,
  className,
}: TableToolbarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-card select-none",
        className
      )}
    >
      {/* Search & Selection Indicator */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {onSearchChange && !hasSelection && (
          <div className="relative flex items-center w-full md:max-w-xs">
            <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full min-h-10 pl-9 pr-3 rounded-lg border border-border/70 bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}

        {hasSelection && (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold">
              {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
            </span>
            {totalCount !== undefined && (
              <span className="text-xs text-muted-foreground">de {totalCount}</span>
            )}
          </div>
        )}

        {/* Filter Chips */}
        {filterChips && filterChips.length > 0 && !hasSelection && (
          <div className="hidden sm:flex items-center gap-2 overflow-x-auto scrollbar-none">
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onToggleFilter?.(chip.id)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  chip.active
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{chip.label}</span>
                {chip.count !== undefined && (
                  <span className="text-3xs opacity-80">({chip.count})</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions (Bulk or Standard) */}
      <div className="flex items-center gap-2 shrink-0 justify-end">
        {hasSelection ? (
          <>
            {onBulkExport && (
              <button
                type="button"
                onClick={onBulkExport}
                className="inline-flex items-center gap-2 min-h-10 px-3 py-2 rounded-lg border border-border/80 bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <Download className="size-3.5" />
                <span>Exportar</span>
              </button>
            )}
            {onBulkDelete && (
              <button
                type="button"
                onClick={onBulkDelete}
                className="inline-flex items-center gap-2 min-h-10 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Excluir</span>
              </button>
            )}
          </>
        ) : (
          <>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="Atualizar lista"
                aria-label="Atualizar lista"
                className="size-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <RefreshCw className="size-4" />
              </button>
            )}
            {customActions}
          </>
        )}
      </div>
    </div>
  );
}
