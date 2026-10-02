import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash, Check, PenTool } from "lucide-react";

interface SignaturePadProps {
 onSave: (dataUrl: string) => void;
 onClear?: () => void;
}

export function SignaturePad({ onSave, onClear }: SignaturePadProps) {
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const [isDrawing, setIsDrawing] = useState(false);
 const [hasSignature, setHasSignature] = useState(false);

 useEffect(() => {
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext("2d");
 if (!ctx) return;

 ctx.lineWidth = 2.5;
 ctx.lineCap = "round";
 ctx.lineJoin = "round";
 ctx.strokeStyle = "#0f172a"; // Slate 900
 }, []);

 const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
 const canvas = canvasRef.current;
 if (!canvas) return { x: 0, y: 0 };
 const rect = canvas.getBoundingClientRect();

 if ("touches" in e) {
 const touch = e.touches[0];
 return {
 x: touch.clientX - rect.left,
 y: touch.clientY - rect.top,
 };
 }
 return {
 x: e.clientX - rect.left,
 y: e.clientY - rect.top,
 };
 };

 const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
 e.preventDefault();
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext("2d");
 if (!ctx) return;

 const { x, y } = getCoordinates(e);
 ctx.beginPath();
 ctx.moveTo(x, y);
 setIsDrawing(true);
 setHasSignature(true);
 };

 const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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
 onSave(canvas.toDataURL("image/png"));
 }
 };

 const handleClear = () => {
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext("2d");
 if (!ctx) return;

 ctx.clearRect(0, 0, canvas.width, canvas.height);
 setHasSignature(false);
 onClear?.();
 };

 return (
 <div className="space-y-2">
 <div className="relative w-full aspect-3/1 min-h-[140px] max-h-[200px] rounded-lg border-2 border-dashed border-border/80 bg-slate-50 touch-none overflow-hidden flex items-center justify-center">
 <canvas
 ref={canvasRef}
 width={600}
 height={200}
 onMouseDown={startDrawing}
 onMouseMove={draw}
 onMouseUp={stopDrawing}
 onMouseLeave={stopDrawing}
 onTouchStart={startDrawing}
 onTouchMove={draw}
 onTouchEnd={stopDrawing}
 className="size-full cursor-crosshair"
 />

 {!hasSignature && (
 <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/50 text-xs font-bold gap-2">
 <PenTool className="size-4" />
 <span>Assine ou desenhe sua rubrica aqui</span>
 </div>
 )}
 </div>

 <div className="flex items-center justify-between text-xs">
 <span className="text-[11px] text-muted-foreground">
 Assinatura capturada com data/hora e IP para validação jurídica.
 </span>
 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={handleClear}
 className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
 >
 <Trash className="size-3.5" /> Limpar
 </Button>
 </div>
 </div>
 );
}
