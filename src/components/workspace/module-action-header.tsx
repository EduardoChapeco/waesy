import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Search, SlidersHorizontal, Plus, LayoutGrid, List, Kanban, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { QuickModuleConfigDrawer } from "./quick-module-config-drawer";

import type { WorkspaceViewModeType } from "@/types/domain";
export type ModuleViewModeType = WorkspaceViewModeType;

export interface ViewModeOption {
  id: ModuleViewModeType;
  label: string;
  icon?: any;
}

export interface PrimaryActionConfig {
  label: string;
  icon?: any;
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
}

export interface ModuleActionHeaderProps {
  title: string;
  eyebrow?: string;
  badge?: string | number;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  viewModes?: ViewModeOption[];
  currentViewMode?: ModuleViewModeType;
  onViewModeChange?: (mode: ModuleViewModeType) => void;
  primaryAction?: PrimaryActionConfig;
  configTitle?: string;
  configContent?: ReactNode;
  storeSettings?: any;
  onSettingsUpdated?: () => void;
  secondaryActions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function ModuleActionHeader({
  title,
  eyebrow,
  badge,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  viewModes,
  currentViewMode,
  onViewModeChange,
  primaryAction,
  configTitle,
  configContent,
  storeSettings,
  onSettingsUpdated,
  secondaryActions,
  children,
  className,
}: ModuleActionHeaderProps) {
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);

  const getDefaultIcon = (mode: ModuleViewModeType) => {
    switch (mode) {
      case "grid": return LayoutGrid;
      case "kanban": return Kanban;
      case "calendar": return Calendar;
      default: return List;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Linha Principal de Controle e Ações */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Lado Esquerdo: Identidade do Módulo (Direta & Semântica) */}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
              {eyebrow}
            </p>
          ) : null}
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {badge !== undefined ? (
              <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                {badge}
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Lado Direito: Barra de Ferramentas (Busca, Visão, Configurações Rápidas e Ação) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Busca Rápida Contextual */}
          {onSearchChange !== undefined ? (
            <div className="relative flex-1 sm:w-64 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={searchValue || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9 h-10 sm:h-10 rounded-xl bg-card border-border/80 text-xs focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          ) : null}

          {/* Alternador de Visão (Segmented Controls Apple HIG) */}
          {viewModes && viewModes.length > 1 && onViewModeChange ? (
            <div className="flex items-center p-1 bg-muted/60 border border-border/60 rounded-xl">
              {viewModes.map((v) => {
                const IconComponent = v.icon || getDefaultIcon(v.id);
                const isActive = currentViewMode === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onViewModeChange(v.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={v.label}
                  >
                    <IconComponent className="size-3.5" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Ações Secundárias Específicas */}
          {secondaryActions}

          {/* Botão de Configurações Rápidas do Módulo */}
          {configContent !== undefined || storeSettings !== undefined ? (
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3 rounded-xl border-border/80 text-xs font-semibold hover:bg-muted/50"
              onClick={() => setConfigDrawerOpen(true)}
              title="Ajustes rápidos do módulo"
            >
              <SlidersHorizontal className="size-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Ajustes</span>
            </Button>
          ) : null}

          {/* Ação Primária de Alto Impacto */}
          {primaryAction ? (
            primaryAction.to ? (
              <Button asChild className="h-10 sm:h-10 px-4 rounded-xl text-xs font-semibold shadow-sm">
                <Link to={primaryAction.to}>
                  {primaryAction.icon ? (
                    <primaryAction.icon className="size-4 mr-1.5" />
                  ) : (
                    <Plus className="size-4 mr-1.5" />
                  )}
                  {primaryAction.label}
                </Link>
              </Button>
            ) : (
              <Button
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className="h-10 sm:h-10 px-4 rounded-xl text-xs font-semibold shadow-sm"
              >
                {primaryAction.icon ? (
                  <primaryAction.icon className="size-4 mr-1.5" />
                ) : (
                  <Plus className="size-4 mr-1.5" />
                )}
                {primaryAction.label}
              </Button>
            )
          ) : null}
        </div>
      </div>

      {/* Linha Opcional de Filtros / Tabs Rápidas */}
      {children ? (
        <div className="pt-1">
          {children}
        </div>
      ) : null}

      {/* Drawer de Configurações Rápidas Conectado */}
      {(configContent !== undefined || storeSettings !== undefined) ? (
        <QuickModuleConfigDrawer
          open={configDrawerOpen}
          onOpenChange={setConfigDrawerOpen}
          moduleName={configTitle || title}
          storeSettings={storeSettings}
          onSettingsUpdated={onSettingsUpdated}
        >
          {configContent}
        </QuickModuleConfigDrawer>
      ) : null}
    </div>
  );
}
