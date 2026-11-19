import React, { useState, useCallback, Suspense, lazy } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import getCroppedImg, {
  getCroppedCanvasBlob,
  generateProportionalAppIconSet,
  getCanonicalDimensions,
  type TargetPlatform,
  type CanonicalDimensions,
  type ProportionalAppIconSetBlobs,
} from "@/lib/crop-image";
import { TOKEN_HEX } from "@/lib/design-tokens";
import { Crop, ZoomIn, ZoomOut, RotateCw, Check, Maximize, Minimize, Info } from "lucide-react";
import { toast } from "sonner";

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
  appLogoMode?: boolean;
  initialLogoBgColor?: string;
  onCropCompleteAction?: (croppedBase64: string) => void;
  onCropComplete?: (croppedBlob: Blob) => void | Promise<void>;
  onCropWithMetadata?: (payload: {
    blob: Blob;
    cropPixels: { x: number; y: number; width: number; height: number };
    aspect?: number;
    zoom: number;
    rotation: number;
  }) => void | Promise<void>;
  onAppIconSetComplete?: (bundle: ProportionalAppIconSetBlobs) => void | Promise<void>;
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
  appLogoMode = false,
  initialLogoBgColor = TOKEN_HEX.white,
  onCropCompleteAction,
  onCropComplete: onCropCompleteProp,
  onCropWithMetadata,
  onAppIconSetComplete,
}: ImageCropperDialogProps) {
  const defaultAspect = cropShape === "round" || appLogoMode ? 1 : (initialAspect ?? aspectRatio ?? 4 / 3);
  const [selectedAspect, setSelectedAspect] = useState<number | undefined>(defaultAspect);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(appLogoMode ? 0.9 : 1);
  const [rotation, setRotation] = useState(0);
  const [objectFit, setObjectFit] = useState<"contain" | "cover" | "horizontal-cover" | "vertical-cover">(
    appLogoMode ? "contain" : "cover"
  );
  const [logoBgColor, setLogoBgColor] = useState<string>(initialLogoBgColor || TOKEN_HEX.white);
  const [logoPaddingPct, setLogoPaddingPct] = useState<number>(appLogoMode ? 0.08 : 0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(appLogoMode ? 0.9 : 1);
      setRotation(0);
      setObjectFit(appLogoMode ? "contain" : "cover");
      setLogoPaddingPct(appLogoMode ? 0.08 : 0);
      setSelectedAspect(cropShape === "round" || appLogoMode ? 1 : (initialAspect ?? aspectRatio ?? 4 / 3));
    }
  }, [open, initialAspect, aspectRatio, cropShape, appLogoMode]);

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
        const minZ = appLogoMode ? 0.5 : 0.8;
        setZoom((prev) => Math.max(minZ, Number((prev - 0.1).toFixed(2))));
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
      const cropOpts = appLogoMode
        ? { backgroundColor: logoBgColor, paddingPct: logoPaddingPct }
        : undefined;

      // 1. Renderiza e grava fisicamente no Canvas com as dimensões canônicas exatas (Zero-Drift)
      const croppedBlob = await getCroppedCanvasBlob(
        imageSrc,
        croppedAreaPixels,
        rotation,
        { horizontal: false, vertical: false },
        "image/png",
        canonicalDims,
        cropOpts
      );

      // 1.1 Se modo App Logo, gera também o pacote 192/512/maskable proporcionalizado
      if (appLogoMode && onAppIconSetComplete) {
        const iconBundle = await generateProportionalAppIconSet(
          imageSrc,
          croppedAreaPixels,
          rotation,
          { backgroundColor: logoBgColor, logoPaddingPct }
        );
        await onAppIconSetComplete(iconBundle);
      }

      // 2. Notifica callbacks: Blob físico, metadados do recorte e Base64
      if (onCropWithMetadata && croppedAreaPixels) {
        await onCropWithMetadata({
          blob: croppedBlob,
          cropPixels: {
            x: Math.round(croppedAreaPixels.x || 0),
            y: Math.round(croppedAreaPixels.y || 0),
            width: Math.round(croppedAreaPixels.width || 0),
            height: Math.round(croppedAreaPixels.height || 0),
          },
          aspect: selectedAspect,
          zoom,
          rotation,
        });
      }
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
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : "Não foi possível processar o recorte desta imagem. Tente enviar o arquivo novamente.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(5, Number((prev + 0.2).toFixed(2))));
  const handleZoomOut = () => {
    const minZ = appLogoMode ? 0.5 : 0.8;
    setZoom((prev) => Math.max(minZ, Number((prev - 0.2).toFixed(2))));
  };
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
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-card border-border sm:rounded-2xl shadow-overlay select-none max-h-vh-92 flex flex-col z-50">
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
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-8 px-3 rounded-lg text-xs gap-1 cursor-pointer min-h-11 sm:min-h-0"
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
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-8 px-3 rounded-lg text-xs gap-1 cursor-pointer min-h-11 sm:min-h-0"
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
                <Crop className="size-3.5 text-primary" />
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
              <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pb-1">
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
            <div className="relative w-full h-75 sm:h-95 overflow-hidden rounded-xl bg-zinc-950 select-none border border-border/40">
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
                  restrictPosition={!appLogoMode}
                  minZoom={appLogoMode ? 0.5 : 0.8}
                  maxZoom={5}
                  zoomWithScroll={true}
                  zoomSpeed={0.1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  classes={{
                    containerClassName: "waesy-cropper-container",
                    cropAreaClassName: isRound
                      ? "waesy-cropper-area waesy-cropper-area-round"
                      : "waesy-cropper-area",
                  }}
                />
              </Suspense>
            </div>

            {appLogoMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Margem de Segurança (Logo)</span>
                    <span className="font-mono text-muted-foreground">{Math.round(logoPaddingPct * 100)}%</span>
                  </div>
                  <Slider
                    value={[Math.round(logoPaddingPct * 100)]}
                    min={0}
                    max={25}
                    step={1}
                    onValueChange={(vals) => setLogoPaddingPct((vals[0] ?? 8) / 100)}
                    aria-label="Margem de segurança da logo"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-foreground block">Fundo do Ícone PWA</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLogoBgColor(TOKEN_HEX.white)}
                      className={`h-9 min-h-11 sm:min-h-0 px-3 rounded-lg border text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring ${
                        logoBgColor === TOKEN_HEX.white ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      Claro
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoBgColor(TOKEN_HEX.neutral950)}
                      className={`h-9 min-h-11 sm:min-h-0 px-3 rounded-lg border text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring ${
                        logoBgColor === TOKEN_HEX.neutral950 ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      Escuro
                    </button>
                    <input
                      type="color"
                      value={logoBgColor}
                      onChange={(e) => setLogoBgColor(e.target.value)}
                      aria-label="Cor de fundo personalizada do ícone"
                      className="h-9 w-11 rounded-lg border border-border bg-card p-1 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Controles de Zoom */}
            <div className="flex items-center gap-2 px-1 pt-1 bg-muted/20 p-2 rounded-xl border border-border/30">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary size-8 rounded-lg cursor-pointer shrink-0 min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                onClick={handleZoomOut}
                title="Diminuir Zoom"
              >
                <ZoomOut className="size-4 text-muted-foreground" />
              </Button>

              <Slider
                value={[zoom]}
                min={appLogoMode ? 0.5 : 0.8}
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
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary size-8 rounded-lg cursor-pointer shrink-0 min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
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
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-9 px-4 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer min-h-11 sm:min-h-0"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isProcessing || !imageSrc}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-9 px-5 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-2 cursor-pointer min-h-11 sm:min-h-0"
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
