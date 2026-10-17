import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";

export interface MasterPanelProps {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filterTabs?: { id: string; label: string; count?: number }[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  headerAction?: React.ReactNode;
  children?: React.ReactNode;
  footerSlot?: React.ReactNode;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function MasterPanel({
  title,
  subtitle,
  searchPlaceholder = "Buscar itens...",
  searchValue = "",
  onSearchChange,
  filterTabs,
  activeTabId,
  onTabChange,
  headerAction,
  children,
  footerSlot,
  isCollapsible = false,
  isCollapsed = false,
  onToggleCollapse,
  className,
}: MasterPanelProps) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center justify-between w-12 h-full border-r border-border/60 bg-muted/20 py-3 shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expandir painel"
          aria-label="Expandir painel"
          className="size-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label={title}
      className={cn(
        "flex flex-col w-80 h-full border-r border-border/60 bg-card shrink-0 select-none",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-border/40">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground truncate">
              {title}
            </h2>
            {isCollapsible && onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Recolher painel"
                aria-label="Recolher painel"
                className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      {/* Quick Search */}
      {onSearchChange && (
        <div className="p-3 border-b border-border/30">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-border/70 bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Filter Tabs / Badges */}
      {filterTabs && filterTabs.length > 0 && (
        <div className="flex items-center gap-1 p-2 px-3 border-b border-border/30 overflow-x-auto scrollbar-none">
          {filterTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "text-3xs px-2 py-1 rounded-full",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Master Content (Independent Scroll) */}
      <div className="flex-1 overflow-y-auto native-scroll p-2 space-y-1">
        {children}
      </div>

      {/* Footer Slot */}
      {footerSlot && (
        <div className="p-3 border-t border-border/40 bg-muted/10 shrink-0">
          {footerSlot}
        </div>
      )}
    </aside>
  );
}
