/**
 * module-tour-modal.tsx — Onboarding & Tour Guiado Interativo por Módulo (Waesy Platform)
 * Apresenta a essência operacional de cada módulo com passos ilustrados na primeira visita,
 * com persistência em localStorage e gatilho manual para reabrir quando desejar.
 */

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Check, HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TourSlide {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  highlightBadge?: string;
  tip?: string;
}

interface ModuleTourModalProps {
  moduleId: string;
  moduleName: string;
  slides: TourSlide[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ModuleTourModal({
  moduleId,
  moduleName,
  slides,
  isOpen: controlledIsOpen,
  onOpenChange,
}: ModuleTourModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalOpen;

  useEffect(() => {
    if (!isControlled) {
      const storageKey = `waesy_module_tour_seen_${moduleId}`;
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        setInternalOpen(true);
      }
    }
  }, [moduleId, isControlled]);

  const handleClose = () => {
    const storageKey = `waesy_module_tour_seen_${moduleId}`;
    localStorage.setItem(storageKey, "true");
    if (isControlled && onOpenChange) {
      onOpenChange(false);
    } else {
      setInternalOpen(false);
    }
    setCurrentSlideIndex(0);
  };

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  if (slides.length === 0) return null;

  const currentSlide = slides[currentSlideIndex];
  const Icon = currentSlide.icon;
  const isLast = currentSlideIndex === slides.length - 1;

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : undefined)}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border border-border/60 bg-background shadow-2xl">
        {/* Faixa Superior com Barra de Progresso em Fio */}
        <div className="relative pt-6 px-6 pb-2">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-mono">
                {moduleName}
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-[10px] font-mono font-medium text-muted-foreground">
                Etapa {currentSlideIndex + 1} de {slides.length}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-muted-foreground/60 hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
              title="Fechar tour"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Indicadores de Progresso (Pills) */}
          <div className="flex items-center gap-1.5 pt-3">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  idx === currentSlideIndex
                    ? "w-8 bg-primary"
                    : idx < currentSlideIndex
                    ? "w-3 bg-primary/40"
                    : "w-3 bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {/* Conteúdo do Slide */}
        <div className="p-6 pt-3 space-y-5">
          {/* Ícone e Destaque */}
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
              <Icon className="size-6 stroke-[1.8]" />
            </div>
            <div className="space-y-1 min-w-0">
              {currentSlide.highlightBadge && (
                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground uppercase tracking-wider mb-1">
                  {currentSlide.highlightBadge}
                </span>
              )}
              <h3 className="text-base font-bold text-foreground tracking-tight leading-snug">
                {currentSlide.title}
              </h3>
            </div>
          </div>

          {/* Descrição */}
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {currentSlide.description}
          </p>

          {/* Dica de Ouro Pro */}
          {currentSlide.tip && (
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-foreground/80 flex items-start gap-2">
              <span className="font-bold text-primary shrink-0">Dica:</span>
              <span className="leading-snug">{currentSlide.tip}</span>
            </div>
          )}
        </div>

        {/* Footer / Ações */}
        <div className="p-4 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            className="text-xs text-muted-foreground hover:text-foreground h-9 px-3 rounded-xl cursor-pointer"
          >
            Pular Tour
          </Button>

          <div className="flex items-center gap-2">
            {currentSlideIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                className="h-9 px-3 rounded-xl text-xs font-semibold gap-1 cursor-pointer"
              >
                <ChevronLeft className="size-3.5" />
                <span>Voltar</span>
              </Button>
            )}

            <Button
              type="button"
              onClick={handleNext}
              className={cn(
                "h-9 px-4 rounded-xl text-xs font-bold gap-1.5 shadow-xs transition-all cursor-pointer",
                isLast
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-foreground text-background hover:bg-foreground/90"
              )}
            >
              <span>{isLast ? "Entendido, Começar!" : "Próximo"}</span>
              {isLast ? <Check className="size-3.5 stroke-[2.5]" /> : <ChevronRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Botão discreto de ajuda no cabeçalho do módulo para reabrir o tour quando quiser.
 */
export function ModuleTourTrigger({
  onClick,
  label = "Guia do Módulo",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-8 px-2.5 rounded-xl text-[11px] font-semibold gap-1.5 border-border/60 hover:bg-muted/40 text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
      title={label}
    >
      <HelpCircle className="size-3.5 text-primary" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
