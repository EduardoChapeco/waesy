import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import getCroppedImg from "@/lib/crop-image";
import { Crop, ZoomIn, ZoomOut, RotateCw, Check, Maximize, Minimize } from "lucide-react";

export interface ImageCropperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  aspect?: number;
  aspectRatio?: number;
  cropShape?: "rect" | "round";
  lockAspect?: boolean;
  title?: string;
  description?: string;
  onCropCompleteAction?: (croppedBase64: string) => void;
  onCropComplete?: (croppedBlob: Blob) => void | Promise<void>;
}

const ASPECT_PRESETS: Array<{ label: string; value: number | undefined }> = [
  { label: "21:9 (Hero)", value: 21 / 9 },
  { label: "3:1 (Capa)", value: 3 / 1 },
  { label: "16:9 (Wide)", value: 16 / 9 },
  { label: "4:3 (Foto)", value: 4 / 3 },
  { label: "1:1 (Quadrado)", value: 1 },
  { label: "9:16 (Story)", value: 9 / 16 },
  { label: "4:1 (Topo)", value: 4 / 1 },
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
  title = "Enquadrar Imagem",
  onCropCompleteAction,
  onCropComplete: onCropCompleteProp,
}: ImageCropperDialogProps) {
  const defaultAspect = cropShape === "round" ? 1 : (initialAspect ?? aspectRatio ?? 4 / 3);
  const [selectedAspect, setSelectedAspect] = useState<number | undefined>(defaultAspect);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [objectFit, setObjectFit] = useState<"contain" | "cover" | "horizontal-cover" | "vertical-cover">("contain");
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setSelectedAspect(cropShape === "round" ? 1 : (initialAspect ?? aspectRatio ?? 4 / 3));
    }
  }, [open, initialAspect, aspectRatio, cropShape]);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        { horizontal: false, vertical: false },
        "image/png",
        cropShape === "round" ? 400 : 0,
      );

      if (onCropCompleteProp) {
        const res = await fetch(croppedImage);
        const blob = await res.blob();
        await onCropCompleteProp(blob);
      }
      if (onCropCompleteAction) {
        onCropCompleteAction(croppedImage);
      }
      onOpenChange(false);
    } catch (e) {
      console.error("Erro ao recortar imagem:", e);
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
    if (Math.abs(val - 3) < 0.05) return "3:1 (Capa de Loja / Perfil)";
    if (Math.abs(val - 21 / 9) < 0.05) return "21:9 (Banner Hero)";
    if (Math.abs(val - 16 / 9) < 0.05) return "16:9 (Panorâmico)";
    if (Math.abs(val - 4 / 3) < 0.05) return "4:3 (Classificados / Vitrine)";
    if (Math.abs(val - 1) < 0.05) return "1:1 (Produtos & Logos)";
    if (Math.abs(val - 9 / 16) < 0.05) return "9:16 (Story / Guia)";
    if (Math.abs(val - 4) < 0.05) return "4:1 (Faixa Panorâmica)";
    return `${val.toFixed(2)}:1`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-card border-border sm:rounded-2xl shadow-2xl select-none max-h-[92vh] flex flex-col">
        <DialogHeader className="p-4 px-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Crop className="size-4 text-foreground" />
            <span>{title}</span>
          </DialogTitle>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRotate}
              className="h-8 px-2.5 rounded-xl text-xs gap-1 cursor-pointer"
              title="Girar 90 graus"
            >
              <RotateCw className="size-3.5" />
              <span className="hidden sm:inline">Girar</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setObjectFit((prev) => (prev === "contain" ? "cover" : "contain"))}
              className="h-8 px-2.5 rounded-xl text-xs gap-1 cursor-pointer"
              title={objectFit === "contain" ? "Preencher enquadramento" : "Ajustar à tela"}
            >
              {objectFit === "contain" ? <Maximize className="size-3.5" /> : <Minimize className="size-3.5" />}
              <span className="hidden sm:inline">{objectFit === "contain" ? "Preencher" : "Ajustar"}</span>
            </Button>
          </div>
        </DialogHeader>

        {imageSrc ? (
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
            {/* Indicador de Máscara Canônica Fiel ao Frame de Renderização */}
            {lockAspect && (
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Máscara Canônica do Frame:
                </span>
                <span className="text-[11px] font-bold text-foreground bg-muted/70 px-2 py-0.5 rounded-md border border-border/50 font-mono">
                  {getAspectLabel(selectedAspect, isRound)}
                </span>
              </div>
            )}

            {/* Seletor de Proporções Rápidas (apenas quando o aspecto for livre) */}
            {!isRound && !lockAspect && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <span className="text-[11px] font-mono uppercase text-muted-foreground mr-1 shrink-0">
                  Proporção:
                </span>
                {ASPECT_PRESETS.map((preset, idx) => {
                  const isActive = selectedAspect === preset.value;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedAspect(preset.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all shrink-0 cursor-pointer ${
                        isActive
                          ? "bg-foreground text-background font-bold shadow-xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Viewport Amplo do Cropper com Máscara e Puxa/Arrasta Livre */}
            <div className="relative w-full h-[320px] sm:h-[400px] overflow-hidden rounded-2xl bg-[#09090b] select-none border border-border/40">
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
            </div>

            {/* Controles de Zoom: Slider com Botões de Passo + e - */}
            <div className="flex items-center gap-2 px-1 pt-1 bg-muted/20 p-2 rounded-xl border border-border/30">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                className="size-8 rounded-lg cursor-pointer shrink-0"
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
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                className="size-8 rounded-lg cursor-pointer shrink-0"
                title="Aumentar Zoom"
              >
                <ZoomIn className="size-4 text-muted-foreground" />
              </Button>

              <span className="text-xs font-mono font-bold w-12 text-right text-muted-foreground shrink-0">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Dica de Ergonomia de Enquadramento */}
            <p className="text-[11px] text-muted-foreground text-center pt-0.5">
              💡 Arraste para posicionar e use o slider ou a roda do mouse para ajustar o zoom.
            </p>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Nenhuma imagem selecionada.
          </div>
        )}

        <DialogFooter className="p-3.5 px-5 flex items-center justify-between gap-2 border-t border-border/40 bg-muted/20 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isProcessing || !imageSrc}
            onClick={handleConfirm}
            className="h-9 px-5 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-1.5 cursor-pointer"
          >
            {isProcessing ? (
              <span className="size-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            <span>{isProcessing ? "Salvando..." : "Salvar Enquadramento"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
