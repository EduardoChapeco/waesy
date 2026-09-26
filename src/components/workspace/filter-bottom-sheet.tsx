import React, { useState } from "react";
import { SlidersHorizontal, X, RotateCcw, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
  icon?: React.ElementType;
}

export interface FilterGroup {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (val: string) => void;
  defaultValue?: string;
}

export interface FilterBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  filters: FilterGroup[];
  onReset?: () => void;
  children?: React.ReactNode;
}

export function FilterBottomSheet({
  open,
  onOpenChange,
  title = "Filtros & Parâmetros",
  description = "Selecione as opções abaixo para refinar os resultados.",
  filters,
  onReset,
  children,
}: FilterBottomSheetProps) {
  // Estado local temporário para permitir aplicar de uma só vez ou em tempo real
  const activeFiltersCount = filters.filter((f) => {
    const defaultVal = f.defaultValue || "all";
    return f.value !== defaultVal && f.value !== "";
  }).length;

  const handleReset = () => {
    filters.forEach((f) => {
      const defaultVal = f.defaultValue || "all";
      f.onChange(defaultVal);
    });
    if (onReset) onReset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 rounded-t-3xl max-h-[85dvh] bg-background border-t border-border flex flex-col overflow-hidden outline-none"
      >
        {/* Puxador táctil estilo iOS / iFood */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Cabeçalho */}
        <SheetHeader className="px-5 pt-1 pb-3 border-b border-border/40 shrink-0 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <SlidersHorizontal className="size-4" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-foreground">
                  {title}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {description}
                </SheetDescription>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs font-mono px-2 py-0.5">
                {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Corpo com scroll dos grupos de filtros */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
          {filters.map((filter) => {
            const hasCustomValue =
              filter.value !== (filter.defaultValue || "all") && filter.value !== "";

            return (
              <div key={filter.id} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {filter.label}
                  </Label>
                  {hasCustomValue && (
                    <button
                      type="button"
                      onClick={() => filter.onChange(filter.defaultValue || "all")}
                      className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                    >
                      Restaurar
                    </button>
                  )}
                </div>

                {/* Grid de opções como botões de toque tipo pill (mínimo 44px de altura ergonômica) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filter.options.map((opt) => {
                    const isSelected = filter.value === opt.value;
                    const Icon = opt.icon;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => filter.onChange(opt.value)}
                        className={cn(
                          "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border text-left cursor-pointer min-h-[44px]",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                            : "bg-muted/40 text-foreground border-border/60 hover:bg-muted/70 hover:border-border"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {Icon && (
                            <Icon
                              className={cn(
                                "size-3.5 shrink-0",
                                isSelected ? "text-primary-foreground" : "text-muted-foreground"
                              )}
                            />
                          )}
                          <span className="truncate">{opt.label}</span>
                        </div>
                        {isSelected && <Check className="size-3.5 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {children}
        </div>

        {/* Rodapé Fixo */}
        <SheetFooter className="p-4 bg-muted/20 border-t border-border/40 shrink-0 flex flex-row items-center gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleReset}
            disabled={activeFiltersCount === 0}
            className="rounded-xl h-11 px-4 text-xs font-semibold gap-1.5 border-border/70 cursor-pointer shrink-0"
          >
            <RotateCcw className="size-3.5" />
            <span>Limpar</span>
          </Button>

          <Button
            type="button"
            size="lg"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-11 flex-1 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            Aplicar Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export interface FilterTriggerButtonProps {
  onClick: () => void;
  activeCount?: number;
  className?: string;
  label?: string;
}

export function FilterTriggerButton({
  onClick,
  activeCount = 0,
  className,
  label = "Filtros",
}: FilterTriggerButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        "h-10 px-3 sm:px-3.5 rounded-xl text-xs font-semibold border-border/70 gap-2 shrink-0 cursor-pointer relative shadow-none",
        activeCount > 0
          ? "border-primary/50 text-foreground bg-primary/5"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        className
      )}
    >
      <SlidersHorizontal
        className={cn("size-3.5", activeCount > 0 ? "text-primary" : "text-muted-foreground")}
      />
      <span className="hidden xs:inline sm:inline">{label}</span>
      {activeCount > 0 && (
        <span className="size-4.5 rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-bold flex items-center justify-center leading-none">
          {activeCount}
        </span>
      )}
    </Button>
  );
}
