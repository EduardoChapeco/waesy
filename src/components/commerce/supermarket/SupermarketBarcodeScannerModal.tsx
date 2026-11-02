import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Barcode, Camera, Keyboard, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface SupermarketBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

export function SupermarketBarcodeScannerModal({
  isOpen,
  onClose,
  onDetected,
}: SupermarketBarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [mode, setMode] = useState<"camera" | "manual">("camera");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const handleBarcodeFound = useCallback(
    (code: string) => {
      const cleanCode = code.trim();
      if (!cleanCode) return;

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(80);
        } catch {
          // Fallback silencioso caso não suportado
        }
      }

      stopCamera();
      onDetected(cleanCode);
      onClose();
    },
    [stopCamera, onDetected, onClose],
  );

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsCameraActive(false);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Câmera não disponível neste dispositivo ou navegador.");
      setMode("manual");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);

        // Inicia detecção contínua se BarcodeDetector nativo estiver disponível
        if ("BarcodeDetector" in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
          });

          const detectFrame = async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) {
              animationFrameRef.current = requestAnimationFrame(detectFrame);
              return;
            }

            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue;
                if (rawValue) {
                  handleBarcodeFound(rawValue);
                  return;
                }
              }
            } catch {
              // Frame sem código identificado
            }

            animationFrameRef.current = requestAnimationFrame(detectFrame);
          };

          animationFrameRef.current = requestAnimationFrame(detectFrame);
        } else {
          // BarcodeDetector nativo não suportado; ativa o modo manual como padrão
          setCameraError("Leitor automático requer navegador compatível. Utilize a entrada manual.");
          setMode("manual");
        }
      }
    } catch (err: any) {
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Permissão da câmera negada. Digite o código de barras abaixo."
          : "Não foi possível acessar a câmera do dispositivo.",
      );
      setMode("manual");
    }
  }, [handleBarcodeFound]);

  useEffect(() => {
    if (isOpen) {
      setManualCode("");
      setCameraError(null);
      setMode("camera");
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim().length >= 3) {
      handleBarcodeFound(manualCode);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in select-none"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-card border border-border overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Barcode size={22} weight="bold" />
            </div>
            <div>
              <h2 id="scanner-modal-title" className="text-base font-extrabold text-foreground leading-tight">
                Leitor de Código de Barras
              </h2>
              <p className="text-xs text-muted-foreground">EAN, SKU ou identificador do produto</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Fechar leitor"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Alternador de Modo: Câmera vs Manual */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-2">
          <button
            type="button"
            onClick={() => {
              setMode("camera");
              startCamera();
            }}
            className={`flex-1 h-11 min-h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              mode === "camera"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera size={18} weight="bold" />
            <span>Câmera</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setMode("manual");
            }}
            className={`flex-1 h-11 min-h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              mode === "manual"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Keyboard size={18} weight="bold" />
            <span>Digitar EAN</span>
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-6 space-y-4">
          {mode === "camera" ? (
            <div className="relative w-full aspect-square rounded-2xl bg-muted overflow-hidden flex items-center justify-center border border-border/60">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {isCameraActive ? (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  {/* Moldura de mira */}
                  <div className="relative size-56 border-2 border-primary/80 rounded-2xl">
                    <div className="absolute top-0 left-0 size-4 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 size-4 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 size-4 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 size-4 border-b-4 border-r-4 border-primary rounded-br-lg" />

                    {/* Linha laser de escaneamento */}
                    <div className="absolute inset-x-2 top-1/2 h-0.5 bg-destructive animate-pulse motion-reduce:animate-none" />
                  </div>
                  <p className="mt-4 px-3 py-1 rounded-full bg-card/90 text-foreground text-xs font-semibold backdrop-blur-sm border border-border/40">
                    Aponte para o código de barras
                  </p>
                </div>
              ) : null}

              {cameraError ? (
                <div className="absolute inset-0 p-6 bg-card/95 flex flex-col items-center justify-center text-center space-y-3">
                  <WarningCircle size={36} className="text-amber-500" weight="duotone" />
                  <p className="text-xs text-muted-foreground max-w-xs">{cameraError}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setMode("manual")}
                    className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold"
                  >
                    Usar Entrada Manual
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="manual-barcode-input" className="text-xs font-bold text-foreground">
                  Código de Barras ou EAN-13
                </label>
                <input
                  id="manual-barcode-input"
                  type="text"
                  inputMode="numeric"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.replace(/[^0-9A-Za-z-]/g, ""))}
                  placeholder="Ex: 7891000100103 ou SKU"
                  autoFocus
                  className="w-full h-11 min-h-11 px-4 rounded-xl bg-muted/60 text-foreground placeholder:text-muted-foreground text-sm border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  className="flex-1 h-11 min-h-11 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={manualCode.trim().length < 3}
                  className="flex-1 h-11 min-h-11 rounded-xl text-xs font-bold"
                >
                  Buscar Produto
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
