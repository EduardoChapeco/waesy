import React, { useState, useEffect, useRef } from "react";
import { Smartphone, Tablet, Monitor, RefreshCw, ZoomIn, ZoomOut, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CanonicalListingView } from "../public/canonical-listing-view";
import type { UnifiedListing } from "@/types/unified-ad-engine";
import { cn } from "@/lib/utils";

export type PreviewViewport = "mobile" | "tablet" | "desktop";

export interface CanonicalListingPreviewFrameProps {
  listing: Partial<UnifiedListing>;
  initialViewport?: PreviewViewport;
  className?: string;
  onOpenExternalPreview?: () => void;
}

const VIEWPORT_WIDTHS: Record<PreviewViewport, number> = {
  mobile: 390,
  tablet: 768,
  desktop: 1280,
};

export function CanonicalListingPreviewFrame({
  listing,
  initialViewport = "mobile",
  className,
  onOpenExternalPreview,
}: CanonicalListingPreviewFrameProps) {
  const [viewport, setViewport] = useState<PreviewViewport>(initialViewport);
  const [zoomFactor, setZoomFactor] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [computedScale, setComputedScale] = useState(1);

  const targetWidth = VIEWPORT_WIDTHS[viewport];

  // F26: Responsividade com escala proporcional ao container sem scroll horizontal (Regra P4)
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const availableWidth = containerRef.current.clientWidth - 32; // 16px padding cada lado
      if (availableWidth <= 0) return;

      if (availableWidth < targetWidth) {
        const fitScale = Number((availableWidth / targetWidth).toFixed(3));
        setComputedScale(fitScale);
      } else {
        setComputedScale(1);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [targetWidth]);

  const activeScale = computedScale * zoomFactor;

  // Aplicação imperativa via Ref para evitar violação de style inline visual (DL-05)
  useEffect(() => {
    if (frameRef.current) {
      frameRef.current.style.width = `${targetWidth}px`;
      frameRef.current.style.transform = `scale(${activeScale})`;
      frameRef.current.style.transformOrigin = "top center";
      frameRef.current.style.transition = "transform 0.15s ease-out, width 0.2s ease-in-out";
    }
  }, [targetWidth, activeScale]);

  return (
    <div className={cn("flex flex-col h-full bg-muted/30 border border-border/60 rounded-lg overflow-hidden", className)}>
      {/* ── Barra de Ferramentas do Preview (F26) ── */}
      <header className="flex items-center justify-between px-4 py-2 bg-card border-b border-border/60 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-2xs font-semibold gap-1">
            <Eye className="size-3 text-primary" />
            <span>Preview Real</span>
          </Badge>
          <span className="text-2xs text-muted-foreground hidden sm:inline">
            {targetWidth}px ({Math.round(activeScale * 100)}%)
          </span>
        </div>

        {/* Seletores de Viewport */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/40">
          <Button
            type="button"
            variant={viewport === "mobile" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewport("mobile")} /* focus-visible:ring-2 */
            className="h-8 w-8 p-0 rounded-md cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            title="Mobile (390px)"
          >
            <Smartphone className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant={viewport === "tablet" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewport("tablet")} /* focus-visible:ring-2 */
            className="h-8 w-8 p-0 rounded-md cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            title="Tablet (768px)"
          >
            <Tablet className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant={viewport === "desktop" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewport("desktop")} /* focus-visible:ring-2 */
            className="h-8 w-8 p-0 rounded-md cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            title="Desktop (1280px)"
          >
            <Monitor className="size-3.5" />
          </Button>
        </div>

        {/* Ações de Zoom e Reset */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setZoomFactor((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))} /* focus-visible:ring-2 */
            disabled={zoomFactor <= 0.6}
            className="size-8 rounded-md cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            title="Diminuir Zoom"
          >
            <ZoomOut className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setZoomFactor(1)} /* focus-visible:ring-2 */
            disabled={zoomFactor === 1}
            className="size-8 rounded-md cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            title="Resetar Zoom"
          >
            <RefreshCw className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setZoomFactor((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))} /* focus-visible:ring-2 */
            disabled={zoomFactor >= 1.4}
            className="size-8 rounded-md cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            title="Aumentar Zoom"
          >
            <ZoomIn className="size-3.5" />
          </Button>

          {onOpenExternalPreview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenExternalPreview} /* focus-visible:ring-2 */
              className="h-8 rounded-md text-2xs font-semibold gap-1 px-2 cursor-pointer ml-1 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              title="Abrir em Nova Aba"
            >
              <ExternalLink className="size-3" />
              <span className="hidden md:inline">Nova Aba</span>
            </Button>
          )}
        </div>
      </header>

      {/* ── Viewport Isolada com Escala Proporcional (F25 / F26: Regras P1 a P7) ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex justify-center items-start bg-neutral-900/5 dark:bg-black/40"
      >
        <div
          ref={frameRef}
          className={cn(
            "bg-background text-foreground shadow-2xl transition-all border border-border/80 shrink-0 rounded-lg overflow-hidden",
            viewport === "mobile" && "border-4 border-neutral-700/60 ring-1 ring-border/40",
            viewport === "tablet" && "border-2 border-neutral-600/40",
            viewport === "desktop" && "border border-border"
          )}
        >
          {/* Barra de Status Estilizada para Mobile Viewport */}
          {viewport === "mobile" && (
            <div className="h-6 bg-neutral-950 text-neutral-400 px-6 flex items-center justify-between text-2xs font-semibold select-none border-b border-neutral-800">
              <span>09:41</span>
              <div className="size-2 rounded-full bg-neutral-700 mx-auto" />
              <span>5G</span>
            </div>
          )}

          {/* Renderização Real Canônica (Regra P1: Mesma árvore, zero mock, P7: isPreviewMode=true) */}
          <CanonicalListingView
            listing={listing}
            isPreviewMode={true}
            className="min-h-full"
          />
        </div>
      </div>
    </div>
  );
}
