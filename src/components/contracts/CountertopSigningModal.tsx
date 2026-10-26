import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  FileSignature,
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  X,
  PenTool,
} from "lucide-react";
import { SignatureCanvasPad } from "./signature-canvas-pad";
import {
  getOrPrepareCountertopEnvelope,
  signContractEnvelope,
} from "@/services/contracts.functions";

interface CountertopSigningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  contractTitle?: string;
  initialClientName?: string;
  initialClientCpf?: string;
  onSignSuccess?: () => void;
}

export function CountertopSigningModal({
  open,
  onOpenChange,
  contractId,
  contractTitle,
  initialClientName,
  initialClientCpf,
  onSignSuccess,
}: CountertopSigningModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [envelopeToken, setEnvelopeToken] = useState<string>("");
  const [title, setTitle] = useState<string>(contractTitle || "Contrato Presencial");
  const [contentMarkdown, setContentMarkdown] = useState<string>("");

  // Dados do signatário
  const [signerName, setSignerName] = useState<string>(initialClientName || "");
  const [signerCpf, setSignerCpf] = useState<string>(initialClientCpf || "");

  // Assinatura gráfica
  const [signatureBase64, setSignatureBase64] = useState<string>("");

  // Foto presencial via WebRTC
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Termo de consentimento
  const [consentGiven, setConsentGiven] = useState(true);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Prepara envelope de balcão ao abrir o modal
  useEffect(() => {
    if (!open || !contractId) return;

    let isMounted = true;
    setIsLoading(true);

    getOrPrepareCountertopEnvelope({
      data: {
        contractId,
        signerName: initialClientName,
        signerCpf: initialClientCpf,
      },
    })
      .then((res) => {
        if (!isMounted) return;
        setEnvelopeToken(res.signingToken);
        setTitle(res.contractTitle);
        setContentMarkdown(res.contentMarkdown);
        if (res.signerName && !signerName) setSignerName(res.signerName);
        if (res.signerCpf && !signerCpf) setSignerCpf(res.signerCpf);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        toast.error(`Falha ao carregar envelope de balcão: ${err?.message || "Erro desconhecido"}`);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [open, contractId, initialClientName, initialClientCpf, stopCamera]);

  // Ativa câmera do balcão (tablet/webcam)
  const handleStartCamera = async () => {
    try {
      setCapturedPhotoUrl("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast.warning("Câmera não disponível no dispositivo de atendimento.");
    }
  };

  // Captura frame da câmera
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedPhotoUrl(dataUrl);
    stopCamera();
    toast.success("Foto do signatário registrada para evidência jurídica.");
  };

  // Submete a assinatura presencial atômica
  const handleConfirmSignature = async () => {
    if (!envelopeToken) {
      toast.error("Envelope não inicializado. Tente novamente.");
      return;
    }
    if (!signatureBase64) {
      toast.error("Por favor, colete a assinatura manuscrita do cliente no campo gráfico.");
      return;
    }
    if (!signerName.trim()) {
      toast.error("Nome do signatário presencial é obrigatório.");
      return;
    }
    if (!consentGiven) {
      toast.error("O consentimento do signatário presencial é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    try {
      const screenRes =
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}`
          : "tablet-counter";
      const tz =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "America/Sao_Paulo";

      const res = await signContractEnvelope({
        data: {
          signingToken: envelopeToken,
          consent: true,
          signatureImageBase64: signatureBase64,
          userAgent:
            typeof navigator !== "undefined"
              ? `${navigator.userAgent} [Waesy Physical Countertop Desk]`
              : "Waesy Physical Countertop Desk",
          screenResolution: screenRes,
          timezone: tz,
        },
      });

      if (res?.success) {
        toast.success("Contrato assinado presencialmente com sucesso no balcão!");
        stopCamera();
        onSignSuccess?.();
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(`Falha ao registrar assinatura: ${err?.message || "Erro desconhecido"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) stopCamera();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-3xl max-h-screen overflow-y-auto p-4 sm:p-6 gap-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs font-semibold gap-2 border-primary/40 text-primary bg-primary/5"
            >
              <ShieldCheck className="size-4" />
              <span>Assinatura Presencial em Balcão (Tablet / Físico)</span>
            </Badge>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Colete a assinatura manuscrita do cliente presencialmente. A evidência de IP da loja,
            data e hora exata e manifesto criptográfico serão selados imutavelmente.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="size-8 text-primary animate-spin motion-reduce:animate-none" />
            <span className="text-xs font-medium text-muted-foreground">
              Preparando envelope eletrônico de balcão...
            </span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Identificação do Signatário Presencial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border border-border/70">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <UserCheck className="size-4 text-primary" />
                  Nome Completo do Cliente
                </Label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Nome do cliente presente"
                  className="h-11 min-h-11 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  CPF / Documento Oficial
                </Label>
                <Input
                  value={signerCpf}
                  onChange={(e) => setSignerCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-11 min-h-11 text-xs font-mono"
                />
              </div>
            </div>

            {/* 2. Campo de Assinatura Manuscrita Tátil (Otimizado para Dedo/Caneta Stylus) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <PenTool className="size-4 text-primary" />
                  Assinatura Manuscrita do Cliente (Desenhe abaixo)
                </Label>
                {signatureBase64 && (
                  <Badge variant="outline" className="text-2xs text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                    Coletada
                  </Badge>
                )}
              </div>

              <div className="bg-background rounded-lg border border-border">
                <SignatureCanvasPad
                  onSave={setSignatureBase64}
                  className="w-full"
                />
              </div>
            </div>

            {/* 3. Captura Opcional de Foto/Selfie do Balcão */}
            <div className="border border-border/70 rounded-lg p-4 bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Camera className="size-4 text-primary" />
                    Foto Presencial de Validação (Opcional / Câmera do Balcão)
                  </span>
                  <p className="text-2xs text-muted-foreground">
                    Garante biometria facial fotográfica para auditoria contra contestação.
                  </p>
                </div>

                {!cameraActive && !capturedPhotoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleStartCamera}
                    className="h-11 min-h-11 px-4 text-xs gap-2 cursor-pointer focus-visible:ring-2"
                  >
                    <Camera className="size-4" />
                    Ativar Câmera
                  </Button>
                )}
              </div>

              {cameraActive && (
                <div className="space-y-4 flex flex-col items-center">
                  <div className="relative rounded-lg overflow-hidden border border-border bg-muted max-w-sm w-full aspect-video">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="h-11 min-h-11 px-5 text-xs font-bold gap-2 focus-visible:ring-2"
                    >
                      <Camera className="size-4" />
                      Fotografar Cliente
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={stopCamera}
                      className="h-11 min-h-11 px-4 text-xs focus-visible:ring-2"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {capturedPhotoUrl && (
                <div className="flex items-center gap-4">
                  <img
                    src={capturedPhotoUrl}
                    alt="Foto do Signatário"
                    className="size-16 rounded-md object-cover border border-border"
                  />
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-2">
                      <CheckCircle2 className="size-4" /> Foto capturada com sucesso
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleStartCamera}
                      className="h-11 min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground gap-2 focus-visible:ring-2"
                    >
                      <RefreshCw className="size-4" /> Fotografar novamente
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Termo de Consentimento Legal */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/40 border border-border/60">
              <Checkbox
                id="countertop-consent"
                checked={consentGiven}
                onCheckedChange={(c) => setConsentGiven(Boolean(c))}
                className="mt-1"
              />
              <label
                htmlFor="countertop-consent"
                className="text-xs text-muted-foreground leading-snug cursor-pointer select-none"
              >
                O signatário declara ter lido o instrumento contratual, concordando
                integralmente com seus termos e realizando esta assinatura presencialmente com
                plena validade jurídica e probatória nos termos da Lei 14.063/2020.
              </label>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              stopCamera();
              onOpenChange(false);
            }}
            disabled={isSubmitting}
            className="h-11 min-h-11 text-xs focus-visible:ring-2"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirmSignature}
            disabled={isSubmitting || isLoading || !signatureBase64}
            className="h-11 min-h-11 px-5 text-xs font-bold gap-2 focus-visible:ring-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                Selando Assinatura...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Confirmar Assinatura no Balcão
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
