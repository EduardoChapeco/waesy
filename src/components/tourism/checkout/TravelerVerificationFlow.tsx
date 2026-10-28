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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
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
    <Card className="p-5 border-border/80 bg-card space-y-5 rounded-lg text-xs">
      {/* Header do Fluxo */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-sm">
              Validação Obrigatória de Segurança & ANAC
            </h4>
            <p className="text-muted-foreground text-xs">
              Conferência preventiva de documentos antes da emissão definitiva do bilhete.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 font-mono text-xs">
          <Badge variant={step === 3 ? "default" : "outline"} className="px-2 py-1">
            Passo {step}/3
          </Badge>
        </div>
      </div>

      {/* Alerta Preventivo de Multas ANAC */}
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-start gap-2">
        <AlertTriangle className="size-4 shrink-0 mt-1 text-amber-600" />
        <div className="space-y-1">
          <span className="font-bold block">
            Atenção: Grafia do Nome para Embarque IATA / ANAC
          </span>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Companhias aéreas e viações rodoviárias recusam o embarque caso haja qualquer
            divergência de sobrenome ou letra no bilhete emitido. Erros de digitação geram
            multas severas e podem exigir a recompra da passagem.
          </p>
        </div>
      </div>

      {/* PASSO 1: FOTO DO DOCUMENTO OFICIAL */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold text-foreground">
              Tipo de Documento Oficial com Foto *
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["cnh", "rg", "passport"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={docType === t ? "default" : "outline"}
                  onClick={() => setDocType(t)}
                  className="h-11 min-h-11 text-xs uppercase font-bold rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-foreground">
              Foto Nítida do Documento (Frente / Aberto) *
            </Label>
            <Input
              type="url"
              placeholder="https://exemplo.com/documento.jpg"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              className="h-11 min-h-11 text-xs font-mono"
            />
            <p className="text-muted-foreground text-xs">
              Insira a URL pública da imagem ou faça o upload no cofre da agência.
            </p>
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
                <span>Analisando com IA Multimodal...</span>
              </>
            ) : (
              <>
                <span>Validar Documento com IA</span>
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
                Divergência de Nome Detectada pela IA
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
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4" />
              <span>Nome e CPF conferem 100% com o documento oficial!</span>
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-semibold text-foreground flex items-center gap-2">
              <Camera className="size-4 text-primary" />
              Biometria Facial / Selfie ao Vivo *
            </Label>
            <Input
              type="url"
              placeholder="https://exemplo.com/selfie.jpg"
              value={selfieUrl}
              onChange={(e) => setSelfieUrl(e.target.value)}
              className="h-11 min-h-11 text-xs font-mono"
            />
            <p className="text-muted-foreground text-xs">
              Foto de rosto nítida, sem óculos escuros ou chapéu, comparada com o documento.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <MapPin className="size-4 text-sky-500" />
              <span>Geolocalização de Compra Segura</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {coords
                ? `Localização registrada: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (Proteção contra clonagem e estelionato)`
                : "Geolocalização aproximada do dispositivo obtida via rede."}
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
              Autorizo o tratamento de biometria e documentos para emissão conforme a LGPD e regras da ANAC.
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
                  <span>Validando Tríade de Segurança...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  <span>Concluir Validação & Liberar Emissão</span>
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
            {paymentMethod === "pix" || paymentMethod === "cash"
              ? "Pagamento à vista confirmado! Sua emissão está programada com janela de segurança de 1 hora para conferência preventiva de malha aérea."
              : "Tríade de Confiança validada com sucesso! Seu bilhete foi aprovado para emissão imediata sem retenções."}
          </p>
          <div className="pt-2">
            <Badge variant="outline" className="font-mono text-xs px-3 py-1">
              Status: Homologado para Emissão
            </Badge>
          </div>
        </div>
      )}
    </Card>
  );
};
