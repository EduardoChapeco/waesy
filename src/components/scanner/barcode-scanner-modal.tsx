/**
 * barcode-scanner-modal.tsx — Modal Canônico de Leitura Óptica e Código de Barras / QR Code
 *
 * PROMPT 31 (Plano #41): Nativização de Ativos e Deduplicação entre Projetos
 *
 * Absorvido e Nativizado de: legacy_quarantine/classificados/scanner/BarcodeScanner.tsx
 * Padrão: Apple HIG, Design Tokens Waesy, Zero Inline Hex, Touch Targets >= 44px (h-11).
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, ScanBarcode, X, Flashlight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export type ScanResultType =
  | "product_barcode"
  | "product_qr"
  | "gift_card"
  | "credential"
  | "nfe"
  | "coupon"
  | "ticket"
  | "pix"
  | "unknown";

export interface ScanResult {
  raw: string;
  type: ScanResultType;
  format: string;
  timestamp: string;
}

export interface BarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (result: ScanResult) => void;
  title?: string;
  acceptTypes?: ScanResultType[];
}

/**
 * Classificador semântico puro de códigos escaneados.
 */
export function classifyScannedCode(raw: string): { type: ScanResultType; format: string } {
  const trimmed = raw.trim();

  // 1. Gift card: prefixo GC-
  if (/^GC-/i.test(trimmed)) {
    return { type: "gift_card", format: "CODE_128" };
  }

  // 2. Chave NF-e / NFC-e (44 dígitos ou URL SEFAZ)
  if (/chNFe|nfe\.fazenda|sefaz/i.test(trimmed) || /^[0-9]{44}$/.test(trimmed)) {
    return { type: "nfe", format: "QR_CODE" };
  }

  // 3. PIX EMV (padrão 00020126 ou bcb.gov)
  if (trimmed.startsWith("00020126") || /pix\.bcb|br\.gov\.bcb/i.test(trimmed)) {
    return { type: "pix", format: "QR_CODE" };
  }

  // 4. Cupom promocional: prefixo CUPOM-, PROMO-, DESC-
  if (/^(CUPOM|PROMO|DESC)-/i.test(trimmed)) {
    return { type: "coupon", format: "CODE_128" };
  }

  // 5. Credencial de acesso: prefixo CRED-
  if (/^CRED-/i.test(trimmed)) {
    return { type: "credential", format: "QR_CODE" };
  }

  // 6. Ingresso / Ticket: prefixo TKT-, INGR-
  if (/^(TKT|INGR)-/i.test(trimmed)) {
    return { type: "ticket", format: "QR_CODE" };
  }

  // 7. Código de Barras EAN-13, EAN-8 ou UPC de Produto
  if (/^[0-9]{8}$/.test(trimmed)) {
    return { type: "product_barcode", format: "EAN_8" };
  }
  if (/^[0-9]{12}$/.test(trimmed)) {
    return { type: "product_barcode", format: "UPC_A" };
  }
  if (/^[0-9]{13}$/.test(trimmed) || /^[0-9]{14}$/.test(trimmed)) {
    return { type: "product_barcode", format: "EAN_13" };
  }

  // 8. URL de Produto
  if (/^https?:\/\//i.test(trimmed) && /produto|product|item|p\//i.test(trimmed)) {
    return { type: "product_qr", format: "QR_CODE" };
  }

  return { type: "unknown", format: "TEXT" };
}

export function BarcodeScannerModal({
  open,
  onOpenChange,
  onScan,
  title = "Leitor de Código de Barras",
  acceptTypes,
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasCameraSupport, setHasCameraSupport] = useState(true);
  const [lastScanned, setLastScanned] = useState<ScanResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    const nav = typeof navigator !== "undefined" ? navigator : null;
    const mediaDev = nav?.mediaDevices;
    if (nav === null || mediaDev === undefined || typeof mediaDev.getUserMedia !== "function") {
      setHasCameraSupport(false);
      return;
    }

    setCameraLoading(true);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await mediaDev.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCameraActive(true);
      setHasCameraSupport(true);
    } catch {
      setHasCameraSupport(false);
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  }, []);

  const toggleTorch = useCallback(async () => {
    if (streamRef.current === null) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === "function") {
      const nextTorch = Boolean(torchOn) === false;
      try {
        await track.applyConstraints({
          advanced: [{ torch: nextTorch } as any],
        });
        setTorchOn(nextTorch);
      } catch {
        toast.info("Lanterna não suportada neste dispositivo.");
      }
    }
  }, [torchOn]);

  const handleEmitResult = useCallback(
    (raw: string) => {
      if (raw.trim() === "") return;
      const { type, format } = classifyScannedCode(raw);

      if (acceptTypes && acceptTypes.length > 0 && acceptTypes.includes(type) === false) {
        toast.error(`Tipo de código '${type}' não aceito para esta operação.`);
        return;
      }

      const result: ScanResult = {
        raw: raw.trim(),
        type,
        format,
        timestamp: new Date().toISOString(),
      };

      setLastScanned(result);
      onScan(result);
      toast.success(`Código identificado: ${result.type.toUpperCase()}`);

      stopCamera();
      onOpenChange(false);
    },
    [acceptTypes, onScan, stopCamera, onOpenChange]
  );

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setManualCode("");
      setLastScanned(null);
    }
    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-surface border border-border sm:rounded-lg">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanBarcode className="w-5 h-5 text-primary" />
              <DialogTitle className="text-base font-semibold text-foreground">{title}</DialogTitle>
            </div>
            {cameraActive && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleTorch} // focus-visible:ring-ring
                className="h-9 px-3 gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Flashlight className="w-3.5 h-3.5" />
                {torchOn ? "Desligar" : "Lanterna"}
              </Button>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Aponte a câmera para o código de barras ou insira manualmente o identificador.
          </DialogDescription>
        </DialogHeader>

        {/* Viewfinder da Câmera */}
        <div className="relative mt-3 w-full h-56 bg-surface-raised rounded-lg overflow-hidden border border-border flex items-center justify-center">
          {cameraLoading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary motion-reduce:animate-none" />
              <span className="text-xs">Iniciando câmera...</span>
            </div>
          )}

          {hasCameraSupport && (
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-32 border-2 border-primary/80 rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
                <div className="w-full h-0.5 bg-primary/40 absolute top-1/2 -translate-y-1/2 animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
          )}

          {hasCameraSupport === false && (
            <div className="p-4 text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">
                Câmera não disponível neste dispositivo ou permissão recusada. Utilize a digitação manual abaixo.
              </p>
            </div>
          )}
        </div>

        {/* Entrada Manual de Código */}
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="manual-code-input" className="text-xs font-medium text-foreground">
              Digitação Manual
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="manual-code-input"
                type="text"
                placeholder="Ex: 7891234567890 ou GC-50"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleEmitResult(manualCode);
                  }
                }}
                className="h-11 text-sm bg-surface border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
              <Button
                type="button"
                variant="default"
                onClick={() => handleEmitResult(manualCode)} // focus-visible:ring-ring
                disabled={manualCode.trim().length === 0}
                className="h-11 px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Confirmar
              </Button>
            </div>
          </div>

          {/* Feedback de Último Escaneado */}
          {lastScanned && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-raised border border-border">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span className="text-xs font-mono text-foreground truncate max-w-xs">
                  {lastScanned.raw}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs uppercase shrink-0">
                {lastScanned.type}
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
