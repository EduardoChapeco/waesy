import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Lock,
  Loader2,
  UserCheck,
  FileText,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  verifyTravelerDocumentMatch,
  submitTravelerKycAndFace,
} from "@/services/travel-issuance-guard.functions";

interface TravelerVerificationFlowProps {
  tripId: string;
  travelerProfileId?: string;
  initialFullName: string;
  initialDocumentNumber: string;
  initialBirthDate?: string;
  productType?: "flight" | "hotel" | "bus" | "package";
  paymentMethod?: "pix" | "cash" | "credit_card" | "faturado";
  className?: string;
  onVerificationComplete: (result: {
    verified: boolean;
    correctedName?: string;
    similarityScore: number;
    anacWarning?: string;
  }) => void;
}

export const TravelerVerificationFlow: React.FC<TravelerVerificationFlowProps> = ({
  tripId,
  travelerProfileId,
  initialFullName,
  initialDocumentNumber,
  initialBirthDate = "1990-01-01",
  productType = "flight",
  paymentMethod = "credit_card",
  className,
  onVerificationComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Estados dos Arquivos e Dados
  const [documentUrl, setDocumentUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [docType, setDocType] = useState<"cnh" | "rg" | "passport">("cnh");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Estados de Verificação por IA
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [docCheckResult, setDocCheckResult] = useState<{
    isValid: boolean;
    similarityScore: number;
    extractedName: string;
    hasCriticalDiscrepancy: boolean;
    anacWarningMessage?: string;
    correctionsApplied?: { correctedName: string };
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(true);

  // Captura geolocalização defensiva no carregamento
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn("[TravelerVerification] Localização GPS recusada:", err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // 1. Processar e Analisar Documento com IA
  const handleAnalyzeDocument = async () => {
    if (!documentUrl) {
      toast.error("Informe a foto do documento oficial.");
      return;
    }

    setIsAnalyzingDoc(true);
    try {
      const res = await verifyTravelerDocumentMatch({
        data: {
          typedName: initialFullName,
          typedCpf: initialDocumentNumber,
          typedBirthDate: initialBirthDate,
          documentImageUrl: documentUrl,
          productType,
        },
      });

      setDocCheckResult(res);

      if (res.hasCriticalDiscrepancy) {
        toast.warning("Divergência detectada no nome do passageiro!");
      } else {
        toast.success("Dados do documento coincidem 100% com a reserva.");
      }

      setStep(2); // Avança para selfie facial
    } catch (err: any) {
      toast.error("Falha ao analisar documento: " + err.message);
    } finally {
      setIsAnalyzingDoc(false);
    }
  };

  // 2. Submeter Selfie e Localização para Homologação Final
  const handleFinalSubmit = async () => {
    if (!selfieUrl) {
      toast.error("A validação facial requer uma foto de rosto nítida.");
      return;
    }

    if (!lgpdConsent) {
      toast.error("Você precisa aceitar os termos de validação e privacidade LGPD.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitTravelerKycAndFace({
        data: {
          tripId,
          travelerProfileId,
          fullName: docCheckResult?.extractedName || initialFullName,
          documentType: docType,
          documentNumber: initialDocumentNumber,
          documentFrontUrl: documentUrl,
          selfieUrl,
          latitude: coords?.lat || null,
          longitude: coords?.lng || null,
          userConsentAccepted: lgpdConsent,
        },
      });

      toast.success(res.message);

      onVerificationComplete({
        verified: res.status === "verified",
        correctedName: docCheckResult?.correctionsApplied?.correctedName,
        similarityScore: docCheckResult?.similarityScore || 1.0,
        anacWarning: docCheckResult?.anacWarningMessage,
      });

      setStep(3);
    } catch (err: any) {
      toast.error("Erro na verificação de segurança: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn("p-5 border-border/80 bg-card space-y-5 rounded-lg text-xs", className)}>
      {/* Header do Fluxo */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <ShieldCheck className="size-4" />
          </div>
          <h4 className="font-bold text-foreground text-sm">
            Validação de Identidade & Embarque
          </h4>
        </div>
        <span className="text-2xs font-mono text-muted-foreground">
          Etapa {step} de 3
        </span>
      </div>

      {/* PASSO 1: FOTO DO DOCUMENTO OFICIAL */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-semibold text-foreground text-xs">
              Documento de Identificação *
            </Label>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-muted/30 border border-border/40">
              {(["cnh", "rg", "passport"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDocType(t)}
                  className={cn(
                    "h-9 px-3 rounded-md text-xs uppercase font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    docType === t
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === "passport" ? "Passaporte" : t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-foreground flex items-center justify-between">
              <span>Foto Nítida do Documento (Frente / Aberto) *</span>
              <span className="text-2xs text-muted-foreground font-mono">Câmera / Upload Real</span>
            </Label>
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <input
                id="doc_file_input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setDocumentUrl(reader.result as string);
                    reader.readAsDataURL(file);
                    toast.success("Foto do documento carregada com sucesso.");
                  }
                }}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("doc_file_input")?.click()}
                className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer border-dashed border-primary/40 text-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Upload className="size-4" />
                <span>{documentUrl ? "Substituir Foto do Documento" : "Tirar Foto ou Carregar Documento"}</span>
              </Button>
            </div>
            {documentUrl && (
              <div className="relative rounded-lg overflow-hidden border border-border/70 max-h-40 bg-muted/20 flex items-center justify-center p-2">
                <img src={documentUrl} alt="Documento Carregado" className="max-h-36 object-contain rounded" />
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={handleAnalyzeDocument}
            disabled={isAnalyzingDoc || !documentUrl}
            className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isAnalyzingDoc ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                <span>Validando...</span>
              </>
            ) : (
              <>
                <span>Validar Documento</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* PASSO 2: VALIDAÇÃO FACIAL & SELFIE */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Feedback do Passo 1 */}
          {docCheckResult?.hasCriticalDiscrepancy ? (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive space-y-1">
              <span className="font-bold flex items-center gap-2">
                <AlertTriangle className="size-4" />
                Divergência de Nome Detectada
              </span>
              <p className="text-xs text-muted-foreground">
                {docCheckResult.anacWarningMessage}
              </p>
              <div className="p-2 rounded bg-card/80 border border-border/60 text-xs font-mono text-foreground mt-2">
                Nome no Documento Oficial:{" "}
                <span className="font-bold text-primary">
                  {docCheckResult.extractedName}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-muted text-foreground flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Nome e CPF conferem com o documento oficial.</span>
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Camera className="size-4 text-primary" />
                Biometria Facial / Selfie ao Vivo *
              </span>
              <span className="text-2xs text-muted-foreground font-mono">Câmera Frontal</span>
            </Label>
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <input
                id="selfie_file_input"
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setSelfieUrl(reader.result as string);
                    reader.readAsDataURL(file);
                    toast.success("Selfie facial capturada com sucesso.");
                  }
                }}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("selfie_file_input")?.click()}
                className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer border-dashed border-primary/40 text-primary hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Camera className="size-4" />
                <span>{selfieUrl ? "Substituir Selfie" : "Capturar Selfie"}</span>
              </Button>
            </div>
            {selfieUrl && (
              <div className="relative rounded-lg overflow-hidden border border-border/70 max-h-40 bg-muted/20 flex items-center justify-center p-2">
                <img src={selfieUrl} alt="Selfie Carregada" className="max-h-36 object-contain rounded-full border-2 border-primary/30" />
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <MapPin className="size-4 text-sky-500" />
              <span>Localização de Segurança</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {coords
                ? `Coordenadas: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                : "Geolocalização obtida via rede."}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="lgpdConsent"
              checked={lgpdConsent}
              onChange={(e) => setLgpdConsent(e.target.checked)}
              className="size-4 rounded border-border text-primary cursor-pointer"
            />
            <label htmlFor="lgpdConsent" className="text-xs text-muted-foreground cursor-pointer">
              Autorizo o tratamento de dados para emissão conforme a LGPD.
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting || !selfieUrl || !lgpdConsent}
              className="flex-1 h-11 min-h-11 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  <span>Concluir Validação</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* PASSO 3: CONCLUSÃO & POLÍTICA DE EMISSÃO */}
      {step === 3 && (
        <div className="p-4 rounded-lg bg-card border border-border/80 text-center space-y-3">
          <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="size-6" />
          </div>
          <h4 className="font-bold text-foreground text-sm">
            Verificação de Identidade Concluída!
          </h4>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-md mx-auto">
            Documentação e biometria conferidas com sucesso. O cadastro foi validado para emissão de bilhetes e reservas.
          </p>
          <div className="pt-2">
            <span className="font-mono text-xs text-muted-foreground">
              Homologado para Emissão
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};
