import React, { useState, useRef, useCallback } from "react";
import { ComparisonSliderBlockData, OmniBlockStyling } from "../types";
import { MoveHorizontal } from "lucide-react";

export interface InteractiveComparisonSliderProps {
  id: string;
  data: ComparisonSliderBlockData;
  styling?: OmniBlockStyling;
  className?: string;
  isEditing?: boolean;
}

export const InteractiveComparisonSlider: React.FC<InteractiveComparisonSliderProps> = ({
  id,
  data,
  styling,
  className = "",
}) => {
  const [split, setSplit] = useState(data.defaultSplitPercentage ?? 50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const hasBefore = Boolean(data.beforeImageUrl && data.beforeImageUrl.trim());
  const hasAfter = Boolean(data.afterImageUrl && data.afterImageUrl.trim());

  const paddingYClasses = {
    none: "py-0",
    sm: "py-8",
    md: "py-16",
    lg: "py-24",
    xl: "py-32",
  }[styling?.paddingY || "md"];

  const radiusClass = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-lg",
    "2xl": "rounded-lg",
    full: "rounded-full",
  }[styling?.borderRadius || "lg"];

  const customStyle: React.CSSProperties = {
    backgroundColor: styling?.backgroundColor || undefined,
    color: styling?.textColor || undefined,
  };

  const updateSplitFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relativeX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
    setSplit(Math.round(percentage));
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateSplitFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    updateSplitFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback if pointer capture was already released
    }
  };

  return (
    <section
      id={id}
      style={customStyle}
      aria-label={data.title || "Comparação Antes e Depois"}
      className={`relative w-full ${paddingYClasses} border-b border-border/40 ${className}`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {(data.title || data.subtitle) && (
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            {data.title && (
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mb-2">
                {data.title}
              </h2>
            )}
            {data.subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {data.subtitle}
              </p>
            )}
          </div>
        )}

        {/* Content or Honest Empty State */}
        {!hasBefore && !hasAfter ? (
          <div className="text-center py-12 px-6 border border-dashed border-border/80 rounded-lg bg-muted/20 text-muted-foreground text-sm font-medium">
            Imagens de comparação não configuradas. Adicione as URLs de Antes e Depois no painel.
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            {/* Interactive Image Frame */}
            <div
              ref={containerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`relative w-full aspect-16/10 sm:aspect-16/9 overflow-hidden select-none cursor-ew-resize border border-border/70 ${radiusClass}`}
            >
              {/* Image After (Base Layer) */}
              {hasAfter ? (
                <img
                  src={data.afterImageUrl}
                  alt={data.afterLabel || "Depois"}
                  className="absolute inset-0 size-full object-cover pointer-events-none"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 size-full bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
                  (Depois não informado)
                </div>
              )}

              {/* Image Before (Clipped Top Layer) */}
              <div
                className="absolute inset-0 size-full overflow-hidden pointer-events-none"
                style={{
                  clipPath: `inset(0 ${100 - split}% 0 0)`,
                }}
              >
                {hasBefore ? (
                  <img
                    src={data.beforeImageUrl}
                    alt={data.beforeLabel || "Antes"}
                    className="absolute inset-0 size-full object-cover pointer-events-none"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 size-full bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                    (Antes não informado)
                  </div>
                )}
              </div>

              {/* Divider Handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/80 z-20 pointer-events-none flex items-center justify-center"
                style={{ left: `${split}%` }}
              >
                <div className="size-11 min-h-11 rounded-full bg-background border-2 border-primary/80 flex items-center justify-center text-foreground cursor-grab active:cursor-grabbing pointer-events-auto touch-manipulation">
                  <MoveHorizontal className="size-4" />
                </div>
              </div>

              {/* Badges */}
              <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <span className="px-3 py-1 rounded-md bg-background/90 backdrop-blur-xs text-foreground border border-border/60 text-xs font-bold uppercase tracking-wider">
                  {data.beforeLabel || "Antes"}
                </span>
              </div>
              <div className="absolute top-4 right-4 z-10 pointer-events-none">
                <span className="px-3 py-1 rounded-md bg-primary/90 backdrop-blur-xs text-primary-foreground text-xs font-bold uppercase tracking-wider">
                  {data.afterLabel || "Depois"}
                </span>
              </div>
            </div>

            {/* Accessible Range Input Control */}
            <div className="w-full max-w-xs mt-4 flex flex-col items-center gap-1">
              <label htmlFor={`${id}-range`} className="sr-only">
                {data.title || "Controle deslizante de comparação antes e depois"}
              </label>
              <input
                id={`${id}-range`}
                type="range"
                min="0"
                max="100"
                value={split}
                onChange={(e) => setSplit(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
              />
              <span className="text-3xs text-muted-foreground uppercase font-semibold tracking-wider">
                Arraste para comparar ({split}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
