import React, { useRef, useState, useEffect } from "react";
import type { ProposalCanvasFormat } from "@/services/travel-proposal.functions";

export const CANVAS_DIMENSIONS: Record<
 ProposalCanvasFormat,
 { width: string; minHeight: string; label: string; iconEmoji: string }
> = {
 "a4-portrait": { width: "794px", minHeight: "1123px", label: "A4 Retrato (PDF)", iconEmoji: "A4" },
 "a4-landscape": { width: "1123px", minHeight: "794px", label: "A4 Paisagem (Lâmina)", iconEmoji: "A4L" },
 "story-916": { width: "1080px", minHeight: "1920px", label: "Story 9:16 (WhatsApp/Insta)", iconEmoji: "9:16" },
 "presentation-169": { width: "1920px", minHeight: "1080px", label: "Apresentação 16:9 (Slide)", iconEmoji: "16:9" },
 "letter-portrait": { width: "816px", minHeight: "1056px", label: "Carta (US Letter)", iconEmoji: "US" },
};

interface StudioFrameProps {
  format: ProposalCanvasFormat;
  children: React.ReactNode;
  canvasId?: string;
  zoomScale?: number | null; // se fornecido, usa zoom manual (ex: 0.8, 1.0)
  canvasBgColor?: string;
  onAutoFitScaleCalculated?: (scale: number) => void;
}

export function StudioFrame({
  format,
  children,
  canvasId = "proposal-canvas",
  zoomScale,
  canvasBgColor,
  onAutoFitScaleCalculated,
}: StudioFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState(0.85);
  const [canvasHeight, setCanvasHeight] = useState(1123);
  const dims = CANVAS_DIMENSIONS[format] || CANVAS_DIMENSIONS["a4-portrait"];

  // 1. Cálculo de escala responsiva suave baseado na largura da viewport
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const padX = 64; // Margem de respiro lateral
      const availW = Math.max(320, rect.width - padX);
      const targetW = parseInt(dims.width, 10) || 794;
      const calculatedScale = Math.min(1.0, Math.max(0.3, availW / targetW));
      setAutoScale(calculatedScale);
      onAutoFitScaleCalculated?.(calculatedScale);
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);
    handleResize();
    return () => observer.disconnect();
  }, [dims.width, onAutoFitScaleCalculated]);

  // 2. Cálculo da altura real do conteúdo para dimensionar a área de rolagem
  useEffect(() => {
    if (!canvasRef.current) return;
    const handleHeight = () => {
      if (!canvasRef.current) return;
      const h = canvasRef.current.scrollHeight || canvasRef.current.offsetHeight || 1123;
      setCanvasHeight(h);
    };

    const observer = new ResizeObserver(handleHeight);
    observer.observe(canvasRef.current);
    handleHeight();
    return () => observer.disconnect();
  }, [format, dims.minHeight]);

  const effectiveScale = typeof zoomScale === "number" && zoomScale > 0 ? zoomScale : autoScale;

  const wrapperStyle: React.CSSProperties = {
    width: `calc(${dims.width} * ${effectiveScale})`,
    height: canvasHeight * effectiveScale + 80,
    position: "relative",
    margin: "0 auto",
    transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1), height 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  };

  const artboardStyle: React.CSSProperties = {
    width: dims.width,
    minHeight: dims.minHeight,
    transform: `scale(${effectiveScale})`,
    transformOrigin: "top left",
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: canvasBgColor || "var(--p-bg)",
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full overflow-y-auto no-scrollbar overflow-x-hidden bg-muted/60 p-4 sm:p-8 flex flex-col items-center justify-start relative select-none"
    >
      <div className="mb-3 flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground">
        <span className="font-semibold text-foreground">{dims.label}</span>
        <span>·</span>
        <span className="font-mono">{dims.width} × {dims.minHeight}</span>
        {canvasBgColor && (
          <>
            <span>·</span>
            <span className="font-mono uppercase">{canvasBgColor}</span>
          </>
        )}
      </div>

      {/* Container proporcional que reserva exatamente a altura e largura escaladas */}
      <div style={wrapperStyle}>
        <div
          id={canvasId}
          ref={canvasRef}
          data-proposal-canvas="true"
          data-canvas-bg={canvasBgColor || ""}
          style={artboardStyle}
          className="p-canvas-root rounded-lg overflow-hidden border border-border/80 ring-1 ring-border/40 transition-transform duration-200"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
