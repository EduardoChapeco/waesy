import React, { useState } from "react";
import { Search, BarChart3, Settings2, X, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
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

  /** Seletor de Modo de Visualização Canônico (Tabela / Kanban / Cards) */
  viewSwitcher?: React.ReactNode;

  className?: string;
  title?: string;
  children?: React.ReactNode;
}

/**
 * Mapeamento semântico de cores para ícones das abas da toolbar.
 * Garante identidade visual limpa e elegante sem poluição.
 */
function getSemanticIconColor(id: string, customColor?: string): string {
  if (customColor) return customColor;
  const key = id.toLowerCase();
  if (key.includes("my-day") || key.includes("dia") || key.includes("foco")) return "text-warning-strong";
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
  viewSwitcher,
  className,
  title,
  children,
}: WorkspaceCanonicalToolbarProps) {
  const hasExplicitTabs = Boolean(tabs && tabs.length > 0);
  const hasExplicitViewModes = Boolean(viewModes && viewModes.length > 0);
  const effectiveTabs = hasExplicitTabs ? tabs! : viewModes || [];
  const currentActive = hasExplicitTabs ? activeTab || activeViewMode : activeViewMode || activeTab;
  const handleTabSelect = hasExplicitTabs ? onTabChange || onViewModeChange : onViewModeChange || onTabChange;
  const promotedViewSwitcher =
    !viewSwitcher && hasExplicitTabs && hasExplicitViewModes && onViewModeChange
      ? (
          <div
            role="group"
            aria-label="Modo de visualização"
            className="waesy-tab-strip items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/60 shrink-0"
          >
            {viewModes!.map((vm) => {
              const VmIcon = vm.icon;
              const isVmActive = activeViewMode === vm.id;
              return (
                <button
                  key={vm.id}
                  type="button"
                  onClick={() => onViewModeChange(vm.id)}
                  aria-pressed={isVmActive}
                  className={cn(
                    "flex items-center gap-2 px-3 rounded-md text-xs font-medium whitespace-nowrap shrink-0 h-11 min-h-11 sm:h-8 sm:min-h-8 transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isVmActive
                      ? "bg-background text-foreground font-semibold border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  {VmIcon && <VmIcon className="size-3.5 shrink-0" />}
                  <span>{vm.label}</span>
                </button>
              );
            })}
          </div>
        )
      : null;
  const effectiveViewSwitcher = viewSwitcher || promotedViewSwitcher;
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
  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  const hasTier1 = hasTabs || Boolean(effectiveViewSwitcher) || Boolean(normalizedTitle);
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
    <div className={cn("waesy-toolbar-container flex flex-col gap-3 py-1 select-none w-full min-w-0", className)}>
      {/* ── TIER 1: Abas de Visualização (Linear / Apple HIG minimalista, com scroll interno proporcional) + Utilitários de Visão ── */}
      {hasTier1 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full min-w-0 border-b border-border/50 pb-2">
          {/* LADO ESQUERDO: Abas Segmentadas Limpas */}
          {hasTabs ? (
            <div role="tablist" className="waesy-tab-strip items-center flex-1 min-w-0 gap-1 snap-x snap-mandatory">
              {effectiveTabs.map((item) => {
                const Icon = item.icon;
                const isActive = currentActive === item.id;
                const iconColor = getSemanticIconColor(item.id, item.iconColor);

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleTabSelect?.(item.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors motion-reduce:transition-none cursor-pointer whitespace-nowrap shrink-0 snap-start h-11 min-h-11 sm:h-9 sm:min-h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive
                        ? "bg-muted/80 text-foreground font-semibold"
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
                          "ml-1 text-xs px-2 py-0 h-5 rounded-md font-mono leading-none border-0 shrink-0",
                          isActive ? "bg-background text-foreground" : "bg-muted/60 text-muted-foreground"
                        )}
                      >
                        {item.count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          ) : normalizedTitle ? (
            <span className="text-sm font-semibold text-foreground truncate min-w-0">
              {normalizedTitle}
            </span>
          ) : (
            <div />
          )}

          {/* LADO DIREITO DO TIER 1: View Switcher, Métricas & Customização de Colunas */}
          {(effectiveViewSwitcher || handleDashboard || handleColumns) && (
            <div
              className={cn(
                "waesy-tab-strip items-center gap-2 shrink-0 max-w-full",
                effectiveViewSwitcher ? "flex" : "hidden waesy-expanded-flex"
              )}
            >
              {effectiveViewSwitcher && <div className="shrink-0">{effectiveViewSwitcher}</div>}
              {handleColumns && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleColumns}
                  className="hidden waesy-expanded-flex h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg border border-transparent hover:border-border/70 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 gap-2 shrink-0 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  title="Personalizar Colunas do Kanban"
                >
                  <Settings2 className="size-3.5 text-muted-foreground shrink-0" />
                  <span>Colunas</span>
                </Button>
              )}

              {handleDashboard && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDashboard}
                  className="hidden waesy-expanded-flex h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg text-xs font-medium border-border/70 text-foreground hover:bg-muted/60 gap-2 shrink-0 whitespace-nowrap cursor-pointer shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <BarChart3 className="size-3.5 text-primary shrink-0" />
                  <span>{effectiveDashboardLabel}</span>
                  {metricsBadge ? (
                    <span className="text-xs font-mono font-semibold bg-muted/70 px-2 py-0 h-5 inline-flex items-center rounded-md text-foreground shrink-0">
                      {metricsBadge}
                    </span>
                  ) : hasActiveMetrics ? (
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none shrink-0" />
                  ) : null}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TIER 2: Busca Rápida, Filtros e Ação Primária da Tela ── */}
      {hasControls && (
        <div className="waesy-toolbar-tier2">
          {/* ZONA 1: Campo de Busca Proporcional + Botão de Filtros Mobile */}
          {(onSearchChange || (filters && filters.length > 0)) && (
            <div className="flex items-center gap-2 waesy-toolbar-search">
              {onSearchChange && (
                <div className="relative flex-1 min-w-0">
                  <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    value={effectiveSearch || ""}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-11 min-h-11 sm:h-9 sm:min-h-9 pl-9 pr-8 text-base sm:text-xs rounded-lg bg-card border-border/70 placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/40 w-full shadow-none"
                  />
                  {effectiveSearch && (
                    <button
                      type="button"
                      onClick={() => onSearchChange("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      title="Limpar busca"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* BOTÃO DE FILTROS NO MOBILE (Abre Bottom Sheet - Erradica empilhamento de selects) */}
              {filters && filters.length > 0 && (
                <div className="waesy-compact-medium-only flex shrink-0">
                  <FilterTriggerButton
                    onClick={() => setIsFilterSheetOpen(true)}
                    activeCount={activeFiltersCount}
                  />
                </div>
              )}
            </div>
          )}

          {/* ZONA 2: Trilho Rolável de Filtros Desktop + Slot Contextual (Anti-sobreposição) */}
          {((filters && filters.length > 0) || filterSlot) && (
            <div
              className={cn(
                "waesy-toolbar-filters waesy-tab-strip items-center gap-2 py-1",
                !filterSlot && "hidden waesy-expanded-flex"
              )}
            >
              {filters && filters.length > 0 && (
                <div className="hidden waesy-expanded-flex items-center gap-2 shrink-0">
                  {filters.map((f) => (
                    <Select key={f.id} value={f.value} onValueChange={f.onChange}>
                      <SelectTrigger className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 text-xs rounded-lg bg-card border-border/70 font-medium min-w-40 max-w-56 whitespace-nowrap shrink-0 shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <SelectValue placeholder={f.label} />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
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

              {filterSlot && (
                <div className="flex items-center gap-2 shrink-0">{filterSlot}</div>
              )}
            </div>
          )}

          {/* ZONA 3: Trilho de Ações Secundárias, Métricas (sem abas) e CTA Primário */}
          <div className="waesy-toolbar-actions waesy-tab-strip items-center gap-2 py-1">
            {/* Quando NÃO houver abas no Tier 1, exibimos Métricas e Colunas aqui no Desktop */}
            {hasTabs === false && handleColumns && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleColumns}
                className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg text-xs font-medium border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60 gap-2 shrink-0 whitespace-nowrap cursor-pointer shadow-none hidden waesy-expanded-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                title="Personalizar Colunas do Kanban"
              >
                <Settings2 className="size-3.5 text-muted-foreground shrink-0" />
                <span>Colunas</span>
              </Button>
            )}

            {hasTabs === false && handleDashboard && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDashboard}
                className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg text-xs font-medium border-border/70 text-foreground hover:bg-muted/60 gap-2 shrink-0 whitespace-nowrap cursor-pointer shadow-none relative hidden waesy-expanded-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <BarChart3 className="size-3.5 text-primary shrink-0" />
                <span>{effectiveDashboardLabel}</span>
                {metricsBadge ? (
                  <span className="text-xs font-mono font-semibold bg-muted/70 px-2 py-0 h-5 inline-flex items-center rounded-md text-foreground shrink-0">
                    {metricsBadge}
                  </span>
                ) : hasActiveMetrics ? (
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none shrink-0" />
                ) : null}
              </Button>
            )}

            {/* Ação Secundária Única no Desktop */}
            {secondaryAction && (
              <Button
                type="button"
                variant={secondaryAction.variant || "outline"}
                size="sm"
                disabled={secondaryAction.disabled}
                onClick={secondaryAction.onClick}
                className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg text-xs font-medium border-border/70 text-foreground hover:bg-muted/60 gap-2 shrink-0 whitespace-nowrap cursor-pointer shadow-none hidden waesy-expanded-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {secondaryAction.icon && <secondaryAction.icon className="size-3.5 shrink-0" />}
                <span>{secondaryAction.label}</span>
              </Button>
            )}

            {/* Múltiplas Ações Secundárias no Desktop: 1 direta se única, ou menu "Ferramentas" compacto */}
            {secondaryActions && secondaryActions.length === 1 && (
              <Button
                key={secondaryActions[0].label}
                type="button"
                variant={secondaryActions[0].variant || "outline"}
                size="sm"
                disabled={secondaryActions[0].disabled}
                onClick={secondaryActions[0].onClick}
                className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg text-xs font-medium border-border/70 text-foreground hover:bg-muted/60 gap-2 shrink-0 whitespace-nowrap cursor-pointer shadow-none hidden waesy-expanded-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {secondaryActions[0].icon &&
                  React.createElement(secondaryActions[0].icon, { className: "size-3.5 shrink-0" })}
                <span>{secondaryActions[0].label}</span>
              </Button>
            )}

            {secondaryActions && secondaryActions.length > 1 && (
              <div className="hidden waesy-expanded-flex shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg text-xs font-medium border-border/70 text-foreground hover:bg-muted/60 gap-2 shrink-0 whitespace-nowrap cursor-pointer shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <MoreHorizontal className="size-3.5 shrink-0" />
                      <span>Ações</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-lg min-w-48">
                    {secondaryActions.map((act) => (
                      <DropdownMenuItem
                        key={act.label}
                        onClick={act.onClick}
                        disabled={act.disabled}
                        className="min-h-11 text-xs gap-2 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {act.icon && <act.icon className="size-3.5" />}
                        <span>{act.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Menu Kebab no Mobile para Ações Secundárias */}
            {(secondaryAction || secondaryActions?.length || handleColumns || handleDashboard) && (
              <div className="waesy-compact-medium-only shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 w-11 p-0 rounded-lg border-border/70 text-muted-foreground hover:text-foreground cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      title="Mais opções"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-lg min-w-44">
                    {secondaryAction && (
                      <DropdownMenuItem
                        onClick={secondaryAction.onClick}
                        disabled={secondaryAction.disabled}
                        className="min-h-11 text-xs gap-2 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                        className="min-h-11 text-xs gap-2 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {act.icon && <act.icon className="size-3.5" />}
                        <span>{act.label}</span>
                      </DropdownMenuItem>
                    ))}
                    {handleDashboard && (
                      <DropdownMenuItem
                        onClick={handleDashboard}
                        className="min-h-11 text-xs gap-2 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <BarChart3 className="size-3.5 text-primary" />
                        <span>{effectiveDashboardLabel}</span>
                      </DropdownMenuItem>
                    )}
                    {handleColumns && (
                      <DropdownMenuItem
                        onClick={handleColumns}
                        className="min-h-11 text-xs gap-2 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <Settings2 className="size-3.5 text-muted-foreground" />
                        <span>Personalizar Colunas</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Ação Primária da Tela (Botão Principal Único ou cluster customizado rolável) */}
            {React.isValidElement(primaryAction) ? (
              <div className="flex items-center gap-2 shrink-0">{primaryAction}</div>
            ) : primaryAction && typeof primaryAction === "object" && "label" in primaryAction ? (
              <Button
                type="button"
                size="sm"
                disabled={(primaryAction as WorkspaceCanonicalAction).disabled}
                onClick={(primaryAction as WorkspaceCanonicalAction).onClick}
                className="h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gap-2 cursor-pointer shadow-none shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {(primaryAction as WorkspaceCanonicalAction).icon &&
                  React.createElement((primaryAction as WorkspaceCanonicalAction).icon!, { className: "size-3.5 shrink-0" })}
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
      {children}
    </div>
  );
}
