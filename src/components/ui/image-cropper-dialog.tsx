import React, { useState, useCallback, Suspense, lazy } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import getCroppedImg, {
  getCroppedCanvasBlob,
  getCanonicalDimensions,
  type TargetPlatform,
  type CanonicalDimensions,
} from "@/lib/crop-image";
import { Crop, ZoomIn, ZoomOut, RotateCw, Check, Maximize, Minimize, Info, Sparkles } from "lucide-react";

const Cropper = lazy(() => import("react-easy-crop"));

export interface ImageCropperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  aspect?: number;
  aspectRatio?: number;
  cropShape?: "rect" | "round";
  lockAspect?: boolean;
  targetPlatform?: TargetPlatform;
  title?: string;
  description?: string;
  onCropCompleteAction?: (croppedBase64: string) => void;
  onCropComplete?: (croppedBlob: Blob) => void | Promise<void>;
}

const ASPECT_PRESETS: Array<{ label: string; value: number | undefined }> = [
  { label: "28:9 (Desktop Fino)", value: 28 / 9 },
  { label: "21:9 (iFood/Banner)", value: 21 / 9 },
  { label: "16:9 (Widescreen)", value: 16 / 9 },
  { label: "3:1 (Capa Loja/Perfil)", value: 3 / 1 },
  { label: "4:5 (Post Threads)", value: 4 / 5 },
  { label: "9:16 (Story/Reels)", value: 9 / 16 },
  { label: "1:1 (Quadrado)", value: 1 },
  { label: "4:3 (Vitrine)", value: 4 / 3 },
  { label: "Livre", value: undefined },
];

export function ImageCropperDialog({
  open,
  onOpenChange,
  imageSrc,
  aspect: initialAspect,
  aspectRatio,
  cropShape = "rect",
  lockAspect = false,
  targetPlatform = "universal",
  title = "Enquadrar Imagem",
  onCropCompleteAction,
  onCropComplete: onCropCompleteProp,
}: ImageCropperDialogProps) {
  const defaultAspect = cropShape === "round" ? 1 : (initialAspect ?? aspectRatio ?? 4 / 3);
  const [selectedAspect, setSelectedAspect] = useState<number | undefined>(defaultAspect);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [objectFit, setObjectFit] = useState<"contain" | "cover" | "horizontal-cover" | "vertical-cover">("cover");
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setObjectFit("cover");
      setSelectedAspect(cropShape === "round" ? 1 : (initialAspect ?? aspectRatio ?? 4 / 3));
    }
  }, [open, initialAspect, aspectRatio, cropShape]);

  // Atalhos de teclado Desktop para ajuste fino milimétrico (estilo Figma/Canva)
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 1 : 6;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCrop((prev) => ({ ...prev, y: prev.y - step }));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCrop((prev) => ({ ...prev, y: prev.y + step }));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCrop((prev) => ({ ...prev, x: prev.x - step }));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCrop((prev) => ({ ...prev, x: prev.x + step }));
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((prev) => Math.min(5, Number((prev + 0.1).toFixed(2))));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((prev) => Math.max(0.8, Number((prev - 0.1).toFixed(2))));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const onCropComplete = useCallback((_croppedArea: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const canonicalDims = React.useMemo(() => {
    return getCanonicalDimensions(selectedAspect, targetPlatform);
  }, [selectedAspect, targetPlatform]);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      // 1. Renderiza e grava fisicamente no Canvas com as dimensões canônicas exatas (Zero-Drift)
      const croppedBlob = await getCroppedCanvasBlob(
        imageSrc,
        croppedAreaPixels,
        rotation,
        { horizontal: false, vertical: false },
        "image/png",
        canonicalDims
      );

      // 2. Notifica callbacks: Blob físico e Base64
      if (onCropCompleteProp) {
        await onCropCompleteProp(croppedBlob);
      }
      if (onCropCompleteAction) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(croppedBlob);
        });
        onCropCompleteAction(base64);
      }
      onOpenChange(false);
    } catch (e) {
      console.error("Erro ao recortar imagem no Canvas:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(5, Number((prev + 0.2).toFixed(2))));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.8, Number((prev - 0.2).toFixed(2))));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const isRound = cropShape === "round";

  const getAspectLabel = (val?: number, round?: boolean) => {
    if (round) return "1:1 Circular (Avatar / Perfil)";
    if (!val) return "Proporção Livre";
    if (Math.abs(val - 28 / 9) < 0.05) return "28:9 (Desktop Fino)";
    if (Math.abs(val - 3) < 0.05) return "3:1 (Capa de Loja / Perfil)";
    if (Math.abs(val - 21 / 9) < 0.05) return "21:9 (Banner Hero / iFood)";
    if (Math.abs(val - 16 / 9) < 0.05) return "16:9 (Panorâmico)";
    if (Math.abs(val - 4 / 3) < 0.05) return "4:3 (Classificados / Vitrine)";
    if (Math.abs(val - 4 / 5) < 0.05) return "4:5 (Post Threads / Retrato)";
    if (Math.abs(val - 1) < 0.05) return "1:1 (Produtos & Logos)";
    if (Math.abs(val - 9 / 16) < 0.05) return "9:16 (Story / Reels / Guia)";
    return `${val.toFixed(2)}:1`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-card border-border sm:rounded-2xl shadow-2xl select-none max-h-[92vh] flex flex-col z-50">
        <DialogHeader className="p-4 px-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Crop className="size-4 text-foreground" />
            <span>{title}</span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-8 px-3 rounded-lg text-xs gap-1 cursor-pointer"
              onClick={handleRotate}
              title="Girar 90 graus"
            >
              <RotateCw className="size-3.5" />
              <span className="hidden sm:inline">Girar</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-8 px-3 rounded-lg text-xs gap-1 cursor-pointer"
              onClick={() => setObjectFit((prev) => (prev === "contain" ? "cover" : "contain"))}
              title={objectFit === "contain" ? "Preencher enquadramento" : "Ajustar à tela"}
            >
              {objectFit === "contain" ? <Maximize className="size-3.5" /> : <Minimize className="size-3.5" />}
              <span className="hidden sm:inline">{objectFit === "contain" ? "Preencher" : "Ajustar"}</span>
            </Button>
          </div>
        </DialogHeader>

        {imageSrc ? (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
            {/* Indicador de Máscara Canônica e Resolução Física de Saída (Zero-Drift) */}
            <div className="flex items-center justify-between px-1 flex-wrap gap-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <Sparkles className="size-3.5 text-primary" />
                Máscara Canônica:
                <strong className="text-foreground ml-1 font-mono">
                  {getAspectLabel(selectedAspect, isRound)}
                </strong>
              </span>
              <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 font-mono">
                {canonicalDims.width}×{canonicalDims.height}px ({targetPlatform === "mobile" ? "Mobile" : targetPlatform === "desktop" ? "Desktop" : "HD"})
              </span>
            </div>

            {/* Seletor de Proporções Rápidas (quando o aspecto for livre) */}
            {!isRound && !lockAspect && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <span className="text-xs font-mono uppercase text-muted-foreground mr-1 shrink-0">
                  Proporção:
                </span>
                {ASPECT_PRESETS.map((preset, idx) => {
                  const isActive = selectedAspect === preset.value;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors shrink-0 cursor-pointer ${
                        isActive
                          ? "bg-foreground text-background font-bold shadow-xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
                      }`}
                      onClick={() => setSelectedAspect(preset.value)}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Viewport Amplo do Cropper com Máscara e Puxa/Arrasta Livre */}
            <div className="relative w-full h-[300px] sm:h-[380px] overflow-hidden rounded-xl bg-[#09090b] select-none border border-border/40">
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
                    Carregando editor...
                  </div>
                }
              >
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={isRound ? 1 : selectedAspect}
                  cropShape={cropShape}
                  showGrid={true}
                  objectFit={objectFit}
                  minZoom={0.8}
                  maxZoom={5}
                  zoomWithScroll={true}
                  zoomSpeed={0.1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  style={{
                    containerStyle: { background: "#09090b" },
                    cropAreaStyle: {
                      border: "2px solid #ffffff",
                      borderRadius: isRound ? "50%" : "12px",
                      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.75)",
                    },
                  }}
                />
              </Suspense>
            </div>

            {/* Controles de Zoom */}
            <div className="flex items-center gap-2 px-1 pt-1 bg-muted/20 p-2 rounded-xl border border-border/30">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary size-8 rounded-lg cursor-pointer shrink-0"
                onClick={handleZoomOut}
                title="Diminuir Zoom"
              >
                <ZoomOut className="size-4 text-muted-foreground" />
              </Button>

              <Slider
                value={[zoom]}
                min={0.8}
                max={5}
                step={0.02}
                onValueChange={(vals) => setZoom(vals[0])}
                className="cursor-pointer flex-1"
                aria-label="Ajuste de zoom"
              >
                <div focus-visible:ring-2="" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sr-only" />
              </Slider>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary size-8 rounded-lg cursor-pointer shrink-0"
                onClick={handleZoomIn}
                title="Aumentar Zoom"
              >
                <ZoomIn className="size-4 text-muted-foreground" />
              </Button>

              <span className="text-xs font-mono font-bold w-12 text-right text-muted-foreground shrink-0">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-1 flex items-center justify-center gap-1">
              <Info className="size-3.5 shrink-0" />
              <span>Arraste para posicionar. O corte final será renderizado pixel-a-pixel no Canvas.</span>
            </p>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Nenhuma imagem selecionada.
          </div>
        )}

        <DialogFooter className="p-4 px-5 flex items-center justify-between gap-2 border-t border-border/40 bg-muted/20 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-9 px-4 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isProcessing || !imageSrc}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-9 px-5 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-2 cursor-pointer"
            onClick={handleConfirm}
          >
            {isProcessing ? (
              <span className="size-3.5 border-2 border-background border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
            ) : (
              <Check className="size-3.5" />
            )}
            <span>{isProcessing ? "Renderizando Canvas..." : "Salvar Enquadramento"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
