import React, { useRef, useState, useEffect } from "react";
import { RotateCcw, Check, PenTool, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignatureCanvasPadProps {
 onSave: (base64Png: string) => void;
 className?: string;
}

export function SignatureCanvasPad({ onSave, className }: SignatureCanvasPadProps) {
 const canvasRef = useRef<HTMLCanvasElement | null>(null);
 const [isDrawing, setIsDrawing] = useState(false);
 const [hasDrawn, setHasDrawn] = useState(false);

 useEffect(() => {
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext("2d");
 if (!ctx) return;

 // Ajusta resolução do canvas para Retina/High DPI
 const rect = canvas.getBoundingClientRect();
 const dpr = window.devicePixelRatio || 1;
 canvas.width = rect.width * dpr;
 canvas.height = rect.height * dpr;
 ctx.scale(dpr, dpr);

 ctx.lineCap = "round";
 ctx.lineJoin = "round";
 ctx.lineWidth = 2.5;
 ctx.strokeStyle = "#0f172a"; // cor padrão grafite
 }, []);

 const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
 const canvas = canvasRef.current;
 if (!canvas) return { x: 0, y: 0 };
 const rect = canvas.getBoundingClientRect();

 if ("touches" in e) {
 const touch = e.touches[0];
 return {
 x: touch.clientX - rect.left,
 y: touch.clientY - rect.top,
 };
 } else {
 return {
 x: (e as React.MouseEvent).clientX - rect.left,
 y: (e as React.MouseEvent).clientY - rect.top,
 };
 }
 };

 const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
 e.preventDefault();
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext("2d");
 if (!ctx) return;

 const { x, y } = getCoordinates(e);
 ctx.beginPath();
 ctx.moveTo(x, y);
 setIsDrawing(true);
 setHasDrawn(true);
 };

 const draw = (e: React.MouseEvent | React.TouchEvent) => {
 if (!isDrawing) return;
 e.preventDefault();
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext("2d");
 if (!ctx) return;

 const { x, y } = getCoordinates(e);
 ctx.lineTo(x, y);
 ctx.stroke();
 };

 const stopDrawing = () => {
 if (!isDrawing) return;
 setIsDrawing(false);
 const canvas = canvasRef.current;
 if (canvas) {
 const base64 = canvas.toDataURL("image/png");
 onSave(base64);
 }
 };

 const handleClear = () => {
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext("2d");
 if (!ctx) return;

 ctx.clearRect(0, 0, canvas.width, canvas.height);
 setHasDrawn(false);
 onSave("");
 };

 return (
 <div className={cn("space-y-2 select-none", className)}>
 <div className="flex items-center justify-between px-1">
 <div className="flex items-center gap-2 text-xs font-bold text-foreground">
 <PenTool className="size-3.5 text-primary" />
 <span>Assine no campo abaixo com o dedo ou mouse</span>
 </div>

 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleClear}
 disabled={!hasDrawn}
 className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-rose-600 gap-1 cursor-pointer"
 >
 <Eraser className="size-3" /> Limpar
 </Button>
 </div>

 <div className="relative rounded-lg border-2 border-dashed border-border/80 bg-background overflow-hidden shadow-inner">
 <canvas
 ref={canvasRef}
 onMouseDown={startDrawing}
 onMouseMove={draw}
 onMouseUp={stopDrawing}
 onMouseLeave={stopDrawing}
 onTouchStart={startDrawing}
 onTouchMove={draw}
 onTouchEnd={stopDrawing}
 className="w-full h-40 touch-none cursor-crosshair block"
 />

 {/* Linha guia de assinatura */}
 <div className="absolute left-6 right-6 bottom-7 border-b border-muted-foreground/30 pointer-events-none flex items-center justify-between text-[10px] font-mono text-muted-foreground/50">
 <span>X __________________________________________</span>
 <span>Assinatura Digital</span>
 </div>
 </div>
 </div>
 );
}
