import React, { useRef, useState, useEffect } from "react";
import type { ProposalCanvasFormat } from "@/services/travel-proposal.functions";

export const CANVAS_DIMENSIONS: Record<
 ProposalCanvasFormat,
 { width: string; minHeight: string; label: string; iconEmoji: string }
> = {
 "a4-portrait": { width: "794px", minHeight: "1123px", label: "A4 Retrato (PDF)", iconEmoji: "📄" },
 "a4-landscape": { width: "1123px", minHeight: "794px", label: "A4 Paisagem (Lâmina)", iconEmoji: "📑" },
 "story-916": { width: "1080px", minHeight: "1920px", label: "Story 9:16 (WhatsApp/Insta)", iconEmoji: "📱" },
 "presentation-169": { width: "1920px", minHeight: "1080px", label: "Apresentação 16:9 (Slide)", iconEmoji: "🖥️" },
 "letter-portrait": { width: "816px", minHeight: "1056px", label: "Carta (US Letter)", iconEmoji: "✉️" },
};

interface StudioFrameProps {
 format: ProposalCanvasFormat;
 children: React.ReactNode;
 canvasId?: string;
 zoomScale?: number | null; // se fornecido, usa zoom manual (ex: 0.8, 1.0)
 onAutoFitScaleCalculated?: (scale: number) => void;
}

export function StudioFrame({
 format,
 children,
 canvasId = "proposal-canvas",
 zoomScale,
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

 return (
 <div
 ref={containerRef}
 className="flex-1 w-full h-full overflow-y-auto no-scrollbar overflow-x-hidden bg-muted/40 p-4 sm:p-8 flex flex-col items-center justify-start relative select-none [scrollbar-gutter:stable]"
 >
 {/* Container proporcional que reserva exatamente a altura e largura escaladas */}
 <div
 style={{
 width: `calc(${dims.width} * ${effectiveScale})`,
 height: canvasHeight * effectiveScale + 80,
 position: "relative",
 margin: "0 auto",
 transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1), height 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
 }}
 >
 <div
 id={canvasId}
 ref={canvasRef}
 style={{
 width: dims.width,
 minHeight: dims.minHeight,
 transform: `scale(${effectiveScale})`,
 transformOrigin: "top left",
 position: "absolute",
 top: 0,
 left: 0,
 backgroundColor: "#ffffff",
 }}
 className="shadow-2xl rounded-lg overflow-hidden text-foreground border border-border/60 transition-transform duration-200"
 >
 {children}
 </div>
 </div>
 </div>
 );
}
