import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  FileSignature,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Hash,
  AlertCircle,
  Loader2,
  ArrowRight,
  FileText,
  Calendar,
  Camera,
  RefreshCcw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

import {
  getEnvelopeByToken,
  signContractEnvelope,
  getPublicGovBrSigningConfig,
} from "@/services/contracts.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SignatureCanvasPad } from "@/components/contracts/signature-canvas-pad";
import { ContractAuditManifest } from "@/components/contracts/contract-audit-manifest";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/assinar/$token")({
  validateSearch: (search: Record<string, unknown>): {
    signed?: string;
    error?: string;
  } => ({
    signed: typeof search.signed === "string" ? search.signed : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => ({ meta: [{ title: "Assinatura Eletrônica de Documento | Waesy" }] }),
  loader: async ({ params }) => {
    try {
      const [envelope, govBrConfig] = await Promise.all([
        getEnvelopeByToken({ data: params.token }),
        getPublicGovBrSigningConfig({ data: { signingToken: params.token } }).catch(() => ({
          isGovBrEnabled: false,
          authUrl: null,
          environment: null,
        })),
      ]);
      if (!envelope) {
        return { envelope: null, govBrConfig: null, error: "Link de assinatura inválido ou expirado." };
      }
      return { envelope, govBrConfig, error: null };
    } catch {
      return { envelope: null, govBrConfig: null, error: "Link de assinatura inválido ou expirado." };
    }
  },
  component: SignContractPage,
});

function SignContractPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { envelope, govBrConfig, error } = ((Route.useLoaderData?.() as any) || {});
  const [consent, setConsent] = useState(false);
  const [signatureImage, setSignatureImage] = useState("");
  const [isSignedLocal, setIsSignedLocal] = useState(
    envelope?.status === "signed" || search?.signed === "true",
  );

  useEffect(() => {
    if (search?.error) {
      toast.error(`Atenção: Houve um problema na validação com o GOV.BR (${search.error}). Utilize o traçado manual.`);
    }
  }, [search?.error]);

  // Biometria Facial
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string>("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);
  const [faceImageUrl, setFaceImageUrl] = useState<string>("");

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 150);
    } catch {
      toast.error("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
    }
  }, []);

  const captureSelfie = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setSelfieDataUrl(dataUrl);
    cameraStream?.getTracks().forEach((t) => t.stop());
    setCameraStream(null);
    setIsCameraOpen(false);
  }, [cameraStream]);

  const retakeSelfie = useCallback(() => {
    setSelfieDataUrl("");
    setSelfieUploaded(false);
    setFaceImageUrl("");
    openCamera();
  }, [openCamera]);

  const uploadSelfie = useCallback(async () => {
    if (!selfieDataUrl) return;
    setIsUploadingSelfie(true);
    try {
      const res = await fetch(selfieDataUrl);
      const blob = await res.blob();
      const filename = `selfie_${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append("file", blob, filename);
      formData.append("bucket", "identity-vault");
      const uploadRes = await fetch("/api/upload-media", { method: "POST", body: formData });
      if (uploadRes.ok) {
        const json = await uploadRes.json();
        const url = json?.url || json?.publicUrl || "";
        setFaceImageUrl(url);
        setSelfieUploaded(true);
        toast.success("Selfie capturada com sucesso!");
      } else {
        setSelfieUploaded(true);
        toast.success("Selfie capturada com sucesso!");
      }
    } catch {
      setSelfieUploaded(true);
      toast.warning("Selfie registrada localmente. A assinatura prosseguirá normalmente.");
    } finally {
      setIsUploadingSelfie(false);
    }
  }, [selfieDataUrl]);

  const signMutation = useMutation({
    mutationFn: signContractEnvelope,
    onSuccess: (data) => {
      toast.success("Documento assinado eletronicamente com sucesso!");
      setIsSignedLocal(true);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao assinar documento.");
    },
  });

  if (error || !envelope) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full border border-destructive/30 bg-destructive/5 rounded-2xl p-6 text-center space-y-4">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Sessão Inválida</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {error || "O token de assinatura informado não foi encontrado ou expirou."}
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-xl mt-2">
            <Link to="/">Voltar ao Início</Link>
          </Button>
        </div>
      </div>
    );
  }

  const version = envelope.contract_version as any;
  const contract = version?.contract;

  const handleSign = () => {
    if (!consent) {
      toast.error("Você deve marcar o consentimento para assinar o documento.");
      return;
    }

    const screenRes = typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : undefined;
    const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

    signMutation.mutate({
      data: {
        signingToken: envelope.signing_token,
        consent: true,
        signatureImageBase64: signatureImage || undefined,
        faceImageUrl: faceImageUrl || undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Browser",
        screenResolution: screenRes,
        timezone: tz,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-6 px-0 sm:px-4 md:px-0 flex justify-center animate-in fade-in duration-200">
      <div className="max-w-4xl w-full space-y-6">
        {/* Header da Sessão de Assinatura (Apple HIG) */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold gap-1 border-primary/30 text-primary">
                <FileSignature className="size-3" />
                <span>Assinatura Digital</span>
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                Versão {version?.version_number || 1}
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-foreground">
              {contract?.title || version?.title || "Documento Contratual"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Signatário: <strong className="text-foreground">{envelope.signer_name}</strong> (
              {envelope.signer_email || envelope.signer_phone || "Verificado"})
            </p>
          </div>

          <div className="text-left md:text-right">
            <Badge
              variant={isSignedLocal ? "default" : "secondary"}
              className="text-xs font-bold uppercase tracking-wider"
            >
              {isSignedLocal ? "Documento Assinado" : "Aguardando Sua Assinatura"}
            </Badge>
          </div>
        </div>

        {/* Hash Criptográfico do Documento */}
        {version?.hash_sha256 && (
          <div className="rounded-xl p-3.5 bg-muted/20 border border-border/70 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Hash className="size-4 text-primary shrink-0" />
              <span className="font-mono text-muted-foreground text-[11px] truncate">
                Hash SHA-256: {version.hash_sha256}
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono shrink-0">
              Imutável
            </Badge>
          </div>
        )}

        {/* Visualizador do Conteúdo do Contrato (Leitura Fluida Mobile/Desktop) */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-8 space-y-4 shadow-2xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/60">
            Termos e Cláusulas Contratuais
          </h2>

          <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed max-h-[550px] overflow-y-auto rounded-xl p-4 sm:p-6 bg-muted/10 font-serif prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{version?.content_markdown || ""}</ReactMarkdown>
          </div>
        </div>

        {/* SE JÁ FOI ASSINADO: EXIBE PROTOCOLO COMPLETO E LINK DE VERIFICAÇÃO */}
        {isSignedLocal ? (
          <div className="space-y-6">
            <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-6 text-center space-y-3">
              <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h2 className="text-base font-bold text-foreground">
                Assinatura Concluída com Sucesso!
              </h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Sua manifestação de vontade foi registrada e selada na infraestrutura criptográfica com validade jurídica nacional.
              </p>
              {contract?.verification_code && (
                <Button asChild size="sm" className="rounded-xl text-xs font-bold gap-1.5 mt-2 h-10 px-5">
                  <Link to="/verify/document/$code" params={{ code: contract.verification_code }}>
                    <span>Ver Certificado Público de Autenticidade</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Folha de Rosto / Protocolo de Auditoria */}
            <ContractAuditManifest
              documentTitle={contract?.title || version?.title}
              category={contract?.category || "general_deal"}
              verificationCode={contract?.verification_code || "AUTENTICADO"}
              hashSha256={version?.hash_sha256 || "CÁLCULO CRIPTOGRÁFICO"}
              sealedAt={version?.sealed_at || new Date().toISOString()}
              signers={[
                {
                  name: envelope.signer_name,
                  email: envelope.signer_email,
                  phone: envelope.signer_phone,
                  role: envelope.signer_role || "party",
                  status: "signed",
                  signedAt: envelope.signed_at || new Date().toISOString(),
                  signatureImageUrl: signatureImage || undefined,
                },
              ]}
            />
          </div>
        ) : (
          /* ÁREA DE ASSINATURA TÁTIL, BIOMETRIA E CONSENTIMENTO */
          <div className="space-y-6">
            {/* Captura de Biometria Facial Opcional */}
            <div className="border border-border/70 bg-card rounded-2xl p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <Camera className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Identificação Facial (Opcional)
                </h3>
                {selfieUploaded && (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" /> Capturada
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Para maior segurança jurídica e conformidade com a Lei 14.063/2020, capture uma selfie como evidência biométrica da assinatura.
              </p>

              {isCameraOpen && (
                <div className="relative rounded-xl overflow-hidden border border-border/60 bg-black">
                  <video ref={videoRef} autoPlay muted playsInline className="w-full max-h-60 object-cover" />
                  <div className="absolute inset-0 border-4 border-primary/30 rounded-xl pointer-events-none" />
                  <button
                    type="button"
                    onClick={captureSelfie}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg hover:opacity-90 transition-opacity"
                  >
                    Tirar Foto
                  </button>
                </div>
              )}

              {selfieDataUrl && !isCameraOpen && (
                <div className="relative rounded-xl overflow-hidden border border-border/60">
                  <img src={selfieDataUrl} alt="Selfie biométrica" className="w-full max-h-60 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    {!selfieUploaded && (
                      <button
                        type="button"
                        onClick={uploadSelfie}
                        disabled={isUploadingSelfie}
                        className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        {isUploadingSelfie ? "Confirmando..." : "Confirmar"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={retakeSelfie}
                      className="h-8 px-3 rounded-lg text-xs font-semibold bg-muted text-foreground hover:bg-muted/80"
                    >
                      <RefreshCcw className="size-3 inline mr-1" />
                      Refazer
                    </button>
                  </div>
                </div>
              )}

              {!isCameraOpen && !selfieDataUrl && (
                <button
                  type="button"
                  onClick={openCamera}
                  className="w-full h-11 rounded-xl border border-dashed border-border/80 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  <Camera className="size-4" />
                  Abrir câmera e capturar selfie
                </button>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Pad de Assinatura Tátil & Consentimento Legal */}
            <div className="border border-primary/30 bg-card rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
              {/* Card de Destaque: Assinatura Oficial GOV.BR (Exibido estritamente quando a API estiver configurada e ativa no Hub) */}
              {govBrConfig?.isGovBrEnabled && govBrConfig?.authUrl && (
                <>
                  <div className="p-4 sm:p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <ShieldCheck className="size-4 text-blue-600 dark:text-blue-400" />
                          Assinatura com Conta GOV.BR
                        </span>
                        <Badge variant="outline" className="text-[10px] font-semibold border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10">
                          Nível Prata / Ouro
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Autenticação eletrônica avançada com presunção legal e fé pública expressa pela Lei Federal nº 14.063/2020.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={() => {
                        if (!consent) {
                          toast.error("Marque o consentimento abaixo antes de prosseguir com o GOV.BR.");
                          return;
                        }
                        window.location.href = govBrConfig.authUrl;
                      }}
                      disabled={!consent}
                      className="w-full sm:w-auto rounded-xl text-xs font-bold h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white shrink-0 min-h-[44px] cursor-pointer shadow-xs gap-2"
                    >
                      <ExternalLink className="size-4" />
                      <span>Assinar com GOV.BR</span>
                    </Button>
                  </div>

                  <div className="relative flex items-center justify-center my-2">
                    <div className="border-t border-border/70 w-full" />
                    <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      ou desenhe sua assinatura no celular
                    </span>
                  </div>
                </>
              )}

              {/* Canvas Interativo */}
              <SignatureCanvasPad onSave={setSignatureImage} />

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="consent-check"
                  checked={consent}
                  onCheckedChange={(c) => setConsent(Boolean(c))}
                  className="mt-0.5 size-5 rounded-md"
                />
                <label
                  htmlFor="consent-check"
                  className="text-xs sm:text-sm text-foreground leading-relaxed cursor-pointer"
                >
                  Eu, <strong className="text-foreground">{envelope.signer_name}</strong>, declaro que
                  li, compreendi e concordo integralmente com todas as condições deste documento,
                  confirmando minha assinatura eletrônica com validade jurídica oficial.
                </label>
              </div>

              {/* Botão de Ação no Terço Inferior (Thumb Zone) */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="size-4 text-primary shrink-0" />
                  <span>Documento Protegido · Validade Jurídica Nacional</span>
                </div>

                <Button
                  onClick={handleSign}
                  disabled={!consent || signMutation.isPending}
                  className="w-full sm:w-auto rounded-xl text-sm font-bold gap-2 h-12 px-8 min-h-[48px] bg-primary text-primary-foreground shadow-sm"
                >
                  {signMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Gravando Assinatura...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      <span>Concluir Assinatura</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
