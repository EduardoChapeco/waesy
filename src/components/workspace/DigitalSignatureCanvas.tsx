import { useRef, useState, useEffect } from "react";
import { Eraser, Check, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DigitalSignatureCanvasProps {
  onSave: (signatureDataUrl: string) => void;
  initialSignatureUrl?: string | null;
  placeholderText?: string;
}

export function DigitalSignatureCanvas({
  onSave,
  initialSignatureUrl,
  placeholderText = "Assine aqui com o dedo, caneta ou mouse",
}: DigitalSignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ajusta resolução interna para evitar serrilhado
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "currentColor";

    if (initialSignatureUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasContent(true);
      };
      img.src = initialSignatureUrl;
    }
  }, [initialSignatureUrl]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasContent(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasContent(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl border-2 border-dashed border-border bg-card overflow-hidden text-foreground">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-44 touch-none cursor-crosshair block"
          aria-label={placeholderText}
        />
        {!hasContent && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground gap-2">
            <PenTool className="h-4 w-4" />
            <span>{placeholderText}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={!hasContent}
          className="h-11 px-4 text-xs"
        >
          <Eraser className="mr-1.5 h-4 w-4" />
          Limpar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!hasContent}
          className="h-11 px-5 text-xs font-semibold"
        >
          <Check className="mr-1.5 h-4 w-4" />
          Salvar Assinatura
        </Button>
      </div>
    </div>
  );
}
