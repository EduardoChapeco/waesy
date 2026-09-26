import React, { useState } from "react";
import { Search, BarChart3, Settings2, X, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { FilterBottomSheet, FilterTriggerButton } from "./filter-bottom-sheet";
import { cn } from "@/lib/utils";

export interface WorkspaceCanonicalAction {
  label: string;
  icon?: React.ElementType;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
}

export interface WorkspaceToolbarTab {
  id: string;
  label: string;
  icon?: React.ElementType;
  iconColor?: string;
  count?: number;
}

export interface WorkspaceToolbarFilter {
  id: string;
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (val: string) => void;
}

export interface WorkspaceCanonicalToolbarProps {
  /** Modos de visualização / Abas canônicas (suporta tabs ou viewModes) */
  tabs?: WorkspaceToolbarTab[];
  viewModes?: Array<{
    id: string;
    label: string;
    icon?: React.ElementType;
    iconColor?: string;
    count?: number;
  }>;
  activeTab?: string;
  activeViewMode?: string;
  onTabChange?: (tabId: string) => void;
  onViewModeChange?: (mode: string) => void;

  /** Busca rápida (suporta searchValue ou searchQuery ou searchTerm) */
  searchPlaceholder?: string;
  placeholder?: string;
  searchValue?: string;
  searchQuery?: string;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;

  /** Filtros rápidos estruturados (dropdowns padronizados) */
  filters?: WorkspaceToolbarFilter[];
  filterChips?: any[];
  onFilterChange?: (id: any) => void;
  /** Slot livre para filtros contextuais adicionais */
  filterSlot?: React.ReactNode;

  /** Gatilho para abrir Dashboard de Métricas sob demanda */
  onOpenDashboard?: () => void;
  onMetricsClick?: () => void;
  dashboardLabel?: string;
  dashboardButtonLabel?: string;
  metricsBadge?: string;
  hasActiveMetrics?: boolean;

  /** Gatilho para customizar colunas do Kanban */
  onConfigureColumns?: () => void;
  onColumnsClick?: () => void;

  /** Ações secundária e primária */
  secondaryAction?: WorkspaceCanonicalAction;
  secondaryActions?: WorkspaceCanonicalAction[];
  primaryAction?: React.ReactNode | WorkspaceCanonicalAction;

  className?: string;
}

/**
 * Mapeamento semântico de cores para ícones das abas da toolbar.
 * Garante identidade visual limpa e elegante sem poluição.
 */
function getSemanticIconColor(id: string, customColor?: string): string {
  if (customColor) return customColor;
  const key = id.toLowerCase();
  if (key.includes("my-day") || key.includes("dia") || key.includes("foco")) return "text-amber-500";
  if (key.includes("list") || key.includes("lista")) return "text-blue-500";
  if (key.includes("kanban") || key.includes("board") || key.includes("quadro")) return "text-emerald-500";
  if (key.includes("cal") || key.includes("agenda")) return "text-purple-500";
  if (key.includes("urg") || key.includes("crit") || key.includes("atras")) return "text-rose-500";
  if (key.includes("pend") || key.includes("abert")) return "text-sky-500";
  if (key.includes("concl") || key.includes("final") || key.includes("won")) return "text-emerald-500";
  return "text-muted-foreground";
}

export function WorkspaceCanonicalToolbar({
  tabs,
  viewModes,
  activeTab,
  activeViewMode,
  onTabChange,
  onViewModeChange,
  searchPlaceholder: customPlaceholder,
  placeholder,
  searchValue,
  searchQuery,
  searchTerm,
  onSearchChange,
  filters,
  filterChips,
  onFilterChange,
  filterSlot,
  onOpenDashboard,
  onMetricsClick,
  dashboardLabel,
  dashboardButtonLabel,
  metricsBadge,
  hasActiveMetrics = true,
  onConfigureColumns,
  onColumnsClick,
  secondaryAction,
  secondaryActions,
  primaryAction,
  className,
}: WorkspaceCanonicalToolbarProps) {
  const effectiveTabs = tabs || viewModes || [];
  const currentActive = activeTab || activeViewMode;
  const handleTabSelect = onTabChange || onViewModeChange;
  const searchPlaceholder = placeholder || customPlaceholder || "Buscar...";
  const effectiveSearch = searchValue ?? searchQuery ?? searchTerm;
  const effectiveDashboardLabel = dashboardLabel || dashboardButtonLabel || "Métricas";

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const activeFiltersCount = (filters || []).filter(
    (f) => f.value !== "all" && f.value !== ""
  ).length;

  const handleDashboard = onOpenDashboard || onMetricsClick;
  const handleColumns = onConfigureColumns || onColumnsClick;

  const hasTabs = effectiveTabs.length > 0;
  const hasControls = Boolean(
    onSearchChange ||
      (filters && filters.length > 0) ||
      filterSlot ||
      handleColumns ||
      handleDashboard ||
      secondaryAction ||
      secondaryActions?.length ||
      primaryAction
  );

  return (
    <div className={cn("flex flex-col gap-3 py-1 select-none w-full", className)}>
      {/* ── TIER 1: Abas de Visualização (Segmented Control Apple HIG) + Utilitários de Visão ── */}
      {hasTabs && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          {/* LADO ESQUERDO: Abas Segmentadas */}
          <div className="flex items-center p-1 rounded-2xl bg-muted/40 border border-border/60 shrink-0 gap-0.5 overflow-x-auto no-scrollbar max-w-full snap-x snap-mandatory">
            {effectiveTabs.map((item) => {
              const Icon = item.icon;
              const isActive = currentActive === item.id;
              const iconColor = getSemanticIconColor(item.id, item.iconColor);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabSelect?.(item.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start min-h-[34px]",
                    isActive
                      ? "bg-background text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0 transition-colors",
                        isActive ? iconColor : "text-muted-foreground"
                      )}
                    />
                  )}
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "ml-1 text-[10px] px-1.5 py-0 h-4 font-mono leading-none border-border/40",
                        isActive ? "bg-muted text-foreground" : "bg-muted/60 text-muted-foreground"
                      )}
                    >
                      {item.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* LADO DIREITO DO TIER 1: Métricas & Customização de Colunas */}
          {(handleDashboard || handleColumns) && (
            <div className="flex items-center gap-2 shrink-0 justify-end">
              {handleColumns && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleColumns}
                  className="h-9 px-3 rounded-xl text-xs font-semibold border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60 gap-1.5 cursor-pointer shadow-none"
                  title="Personalizar Colunas do Kanban"
                >
                  <Settings2 className="size-3.5 text-muted-foreground" />
                  <span className="hidden md:inline">Colunas</span>
                </Button>
              )}

              {handleDashboard && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDashboard}
                  className="h-9 px-3.5 rounded-xl text-xs font-semibold border-border/70 text-foreground hover:bg-muted/60 gap-2 cursor-pointer shadow-none relative"
                >
                  <BarChart3 className="size-3.5 text-primary" />
                  <span>{effectiveDashboardLabel}</span>
                  {metricsBadge ? (
                    <span className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded-md border border-border/50 text-foreground">
                      {metricsBadge}
                    </span>
                  ) : hasActiveMetrics ? (
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  ) : null}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TIER 2: Busca Rápida, Filtros e Ação Primária da Tela ── */}
      {hasControls && (
        <div className="flex flex-row items-center justify-between gap-2 w-full">
          {/* LADO ESQUERDO: Campo de Busca com Lupa e Filtros */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Campo de Busca */}
            {onSearchChange && (
              <div className="relative flex-1 min-w-0">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={effectiveSearch || ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-10 pl-9 pr-8 text-xs rounded-xl bg-card border-border/60 placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/40 w-full shadow-none"
                />
                {effectiveSearch && (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                    title="Limpar busca"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* BOTÃO DE FILTROS NO MOBILE (Abre Bottom Sheet - Erradica empilhamento de selects) */}
            {filters && filters.length > 0 && (
              <div className="flex sm:hidden">
                <FilterTriggerButton
                  onClick={() => setIsFilterSheetOpen(true)}
                  activeCount={activeFiltersCount}
                />
              </div>
            )}

            {/* FILTROS DROPDOWN NO DESKTOP */}
            {filters && filters.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                {filters.map((f) => (
                  <Select key={f.id} value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger className="h-10 px-3 text-xs rounded-xl bg-card border-border/60 font-medium min-w-[130px] shadow-none">
                      <SelectValue placeholder={f.label} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {f.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs rounded-lg">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>
            )}

            {/* Slot Contextual no Desktop */}
            {filterSlot && <div className="hidden sm:flex items-center gap-1.5 shrink-0">{filterSlot}</div>}
          </div>

          {/* LADO DIREITO: Ações Secundárias, Métricas e CTA Primário */}
          <div className="flex items-center gap-2 shrink-0 justify-end">
            {/* Se NÃO houver abas, exibimos Métricas e Colunas aqui no Desktop */}
            {!hasTabs && handleColumns && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleColumns}
                className="h-10 px-3 rounded-xl text-xs font-semibold border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60 gap-1.5 cursor-pointer shadow-none hidden sm:inline-flex"
                title="Personalizar Colunas do Kanban"
              >
                <Settings2 className="size-3.5 text-muted-foreground" />
                <span className="hidden md:inline">Colunas</span>
              </Button>
            )}

            {!hasTabs && handleDashboard && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDashboard}
                className="h-10 px-3.5 rounded-xl text-xs font-semibold border-border/70 text-foreground hover:bg-muted/60 gap-2 cursor-pointer shadow-none relative hidden sm:inline-flex"
              >
                <BarChart3 className="size-3.5 text-primary" />
                <span>{effectiveDashboardLabel}</span>
                {metricsBadge ? (
                  <span className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded-md border border-border/50 text-foreground">
                    {metricsBadge}
                  </span>
                ) : hasActiveMetrics ? (
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                ) : null}
              </Button>
            )}

            {/* Ações Secundárias no Desktop */}
            {secondaryAction && (
              <Button
                type="button"
                variant={secondaryAction.variant || "outline"}
                size="sm"
                disabled={secondaryAction.disabled}
                onClick={secondaryAction.onClick}
                className="h-10 px-3.5 rounded-xl text-xs font-semibold border-border/70 text-foreground hover:bg-muted/60 gap-1.5 cursor-pointer shadow-none hidden sm:inline-flex"
              >
                {secondaryAction.icon && <secondaryAction.icon className="size-3.5" />}
                <span>{secondaryAction.label}</span>
              </Button>
            )}

            {secondaryActions &&
              secondaryActions.map((act) => (
                <Button
                  key={act.label}
                  type="button"
                  variant={act.variant || "outline"}
                  size="sm"
                  disabled={act.disabled}
                  onClick={act.onClick}
                  className="h-10 px-3.5 rounded-xl text-xs font-semibold border-border/70 text-foreground hover:bg-muted/60 gap-1.5 cursor-pointer shadow-none hidden sm:inline-flex"
                >
                  {act.icon && <act.icon className="size-3.5" />}
                  <span>{act.label}</span>
                </Button>
              ))}

            {/* Menu Kebab no Mobile para Ações Secundárias (Evita quebra em múltiplas linhas) */}
            {(secondaryAction || secondaryActions?.length || (!hasTabs && (handleColumns || handleDashboard))) && (
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0 rounded-xl border-border/70 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                      title="Mais opções"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl min-w-[170px]">
                    {secondaryAction && (
                      <DropdownMenuItem
                        onClick={secondaryAction.onClick}
                        disabled={secondaryAction.disabled}
                        className="text-xs gap-2 cursor-pointer font-medium"
                      >
                        {secondaryAction.icon && <secondaryAction.icon className="size-3.5" />}
                        <span>{secondaryAction.label}</span>
                      </DropdownMenuItem>
                    )}
                    {secondaryActions?.map((act) => (
                      <DropdownMenuItem
                        key={act.label}
                        onClick={act.onClick}
                        disabled={act.disabled}
                        className="text-xs gap-2 cursor-pointer font-medium"
                      >
                        {act.icon && <act.icon className="size-3.5" />}
                        <span>{act.label}</span>
                      </DropdownMenuItem>
                    ))}
                    {!hasTabs && handleDashboard && (
                      <DropdownMenuItem
                        onClick={handleDashboard}
                        className="text-xs gap-2 cursor-pointer font-medium"
                      >
                        <BarChart3 className="size-3.5 text-primary" />
                        <span>{effectiveDashboardLabel}</span>
                      </DropdownMenuItem>
                    )}
                    {!hasTabs && handleColumns && (
                      <DropdownMenuItem
                        onClick={handleColumns}
                        className="text-xs gap-2 cursor-pointer font-medium"
                      >
                        <Settings2 className="size-3.5 text-muted-foreground" />
                        <span>Personalizar Colunas</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Ação Primária da Tela (Botão Principal) */}
            {React.isValidElement(primaryAction) ? (
              primaryAction
            ) : primaryAction && typeof primaryAction === "object" && "label" in primaryAction ? (
              <Button
                type="button"
                size="sm"
                disabled={(primaryAction as WorkspaceCanonicalAction).disabled}
                onClick={(primaryAction as WorkspaceCanonicalAction).onClick}
                className="h-10 px-3 sm:px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 cursor-pointer shadow-none shrink-0"
              >
                {(primaryAction as WorkspaceCanonicalAction).icon &&
                  React.createElement((primaryAction as WorkspaceCanonicalAction).icon!, { className: "size-3.5" })}
                <span className="hidden xs:inline sm:inline">{(primaryAction as WorkspaceCanonicalAction).label}</span>
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* ── BOTTOM SHEET DE FILTROS PARA MOBILE ── */}
      {filters && filters.length > 0 && (
        <FilterBottomSheet
          open={isFilterSheetOpen}
          onOpenChange={setIsFilterSheetOpen}
          filters={filters}
        />
      )}
    </div>
  );
}
