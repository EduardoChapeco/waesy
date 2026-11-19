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
  Download,
  PenTool,
  Type,
  Upload,
  Check,
  Trash2,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { ContractMarkdownRenderer } from "@/components/contracts/contract-markdown-renderer";

import { getEnvelopeByToken, signContractEnvelope, getPublicGovBrSigningConfig, getUserSavedSignature, saveUserSignature } from "@/services/contracts.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SignatureCanvasPad } from "@/components/contracts/signature-canvas-pad";
import { ContractAuditManifest } from "@/components/contracts/contract-audit-manifest";
import { downloadSignedContractPackagePdf } from "@/lib/contracts/contract-pdf-download";
import { formatContractStatusLabel } from "@/lib/contracts/contract-vault-rules";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/assinar/$token")({
  validateSearch: (search: Record<string, unknown>): {
    error?: string;
  } => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => ({ meta: [{ title: "Assinatura Eletrônica de Documento | Waesy" }] }),
  loader: async ({ params }) => {
    try {
      const [envelope, govBrConfig, savedSig] = await Promise.all([
        getEnvelopeByToken({ data: params.token }),
        getPublicGovBrSigningConfig({ data: { signingToken: params.token } }).catch(() => ({
          isGovBrEnabled: false,
          authUrl: null,
          environment: null,
        })),
        getUserSavedSignature().catch(() => ({ savedSignature: null })),
      ]);
      if (!envelope) {
        return { envelope: null, govBrConfig: null, savedSig: null, error: "Link de assinatura inválido ou expirado." };
      }
      return { envelope, govBrConfig, savedSig, error: null };
    } catch {
      return { envelope: null, govBrConfig: null, savedSig: null, error: "Link de assinatura inválido ou expirado." };
    }
  },
  component: SignContractPage,
});

function SignContractPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { envelope, govBrConfig, savedSig, error } = ((Route.useLoaderData?.() as any) || {});
  const [consent, setConsent] = useState(false);
  const [signatureImage, setSignatureImage] = useState("");
  const [saveSignatureToProfile, setSaveSignatureToProfile] = useState(false);
  const [isSignedLocal, setIsSignedLocal] = useState(envelope?.status === "signed");

  // Modalidade de Assinatura Multimodal
  type SignatureMethod = "draw" | "type" | "upload" | "saved" | "govbr";
  const [signatureMethod, setSignatureMethod] = useState<SignatureMethod>("draw");
  const [typedName, setTypedName] = useState(envelope?.signer_name || "");
  const [cursiveStyle, setCursiveStyle] = useState(0);

  // OTP 6 Dígitos para Autenticação Avançada
  const [otpCode, setOtpCode] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  const handleResendOtp = useCallback(() => {
    setOtpCooldown(60);
    toast.success(`Código de verificação reenviado para ${envelope?.signer_email || envelope?.signer_phone || "seu canal de contato"}.`);
  }, [envelope]);

  const generateCursiveSignatureImage = useCallback((name: string, styleIdx = 0) => {
    if (typeof document === "undefined") return "";
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fontFamilies = [
      'italic 44px "Brush Script MT", "Segoe Script", "Great Vibes", cursive',
      'italic 40px "Caveat", "Dancing Script", "Lucida Handwriting", cursive',
      'italic 38px "Parisienne", "Allura", "Alex Brush", cursive',
    ];
    ctx.font = fontFamilies[styleIdx % fontFamilies.length] || fontFamilies[0];
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name.trim() || "Assinatura", canvas.width / 2, canvas.height / 2 - 10);

    ctx.beginPath();
    ctx.strokeStyle = "navy";
    ctx.lineWidth = 2;
    ctx.moveTo(canvas.width / 4, canvas.height / 2 + 30);
    ctx.bezierCurveTo(
      canvas.width / 2,
      canvas.height / 2 + 40,
      (canvas.width * 5) / 8,
      canvas.height / 2 + 15,
      (canvas.width * 3) / 4,
      canvas.height / 2 + 28,
    );
    ctx.stroke();

    return canvas.toDataURL("image/png");
  }, []);

  const handleSignatureFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido (PNG, JPG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        setSignatureImage(dataUrl);
        toast.success("Imagem da assinatura carregada com sucesso.");
      }
    };
    reader.readAsDataURL(file);
  }, []);

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
  const [facialBiometricsHash, setFacialBiometricsHash] = useState<string>("");

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
    setFacialBiometricsHash("");
    openCamera();
  }, [openCamera]);

  const uploadSelfie = useCallback(async () => {
    if (!selfieDataUrl) return;
    setIsUploadingSelfie(true);
    try {
      const res = await fetch(selfieDataUrl);
      const buffer = await res.arrayBuffer();
      if (!buffer || buffer.byteLength === 0) {
        throw new Error("A imagem capturada está vazia.");
      }
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setFacialBiometricsHash(hashHex);
      setSelfieUploaded(true);
      toast.success("Biometria facial validada e selada com hash SHA-256.");
    } catch (err: any) {
      setSelfieUploaded(false);
      setFacialBiometricsHash("");
      toast.error(err?.message || "Não foi possível validar a selfie capturada. Tente novamente.");
    } finally {
      setIsUploadingSelfie(false);
    }
  }, [selfieDataUrl]);

  const signMutation = useMutation({
    mutationFn: signContractEnvelope,
    onSuccess: (data) => {
      const completed = "completed" in data && Boolean(data.completed);
      toast.success(completed
        ? "A sua assinatura foi registada; todas as assinaturas exigidas foram concluídas."
        : "A sua assinatura foi registada; o contrato aguarda as restantes assinaturas.");
      setIsSignedLocal(true);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao assinar documento.");
    },
  });

  if (error || !envelope) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full border border-destructive/30 bg-destructive/5 rounded-lg p-6 text-center space-y-4">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Sessão Inválida</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {error || "O token de assinatura informado não foi encontrado ou expirou."}
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-lg mt-2">
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

    if (envelope?.auth_level === "advanced" && otpCode.trim().length < 6) {
      toast.error("Por favor, informe o código de validação OTP de 6 dígitos.");
      return;
    }

    if (!signatureImage && signatureMethod !== "govbr") {
      toast.error("Por favor, registre a sua assinatura (desenhar, digitar ou subir imagem) antes de concluir.");
      return;
    }

    const screenRes = typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : undefined;
    const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

    if (envelope?.require_facial_biometrics && (!selfieUploaded || !facialBiometricsHash)) {
      toast.error("Este documento exige validação biométrica facial antes de assinar.");
      return;
    }

    if (saveSignatureToProfile && signatureImage) {
      saveUserSignature({ data: { signatureImageBase64: signatureImage } }).catch(() => {});
    }

    signMutation.mutate({
      data: {
        signingToken: envelope.signing_token,
        consent: true,
        signatureImageBase64: signatureImage || undefined,
        faceImageUrl: faceImageUrl || undefined,
        facialBiometricsHash: facialBiometricsHash || undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Browser",
        screenResolution: screenRes,
        timezone: tz,
      },
    });
  };

  return (
    <div className="min-h-dvh bg-background text-foreground py-6 px-0 sm:px-4 md:px-0 flex justify-center animate-in fade-in duration-200">
      <div className="max-w-4xl w-full space-y-6">
        {/* Header da Sessão de Assinatura (Apple HIG) */}
        <div className="bg-card border border-border/80 rounded-lg p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
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
              {isSignedLocal ? "Sua Assinatura Registada" : "Aguardando Sua Assinatura"}
            </Badge>
          </div>
        </div>

        {/* Hash Criptográfico do Documento */}
        {version?.hash_sha256 && (
          <div className="rounded-lg p-4 bg-muted/20 border border-border/70 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Hash className="size-4 text-primary shrink-0" />
              <span className="font-mono text-muted-foreground text-2xs truncate">
                Hash SHA-256: {version.hash_sha256}
              </span>
            </div>
            <Badge variant="outline" className="text-2xs font-mono shrink-0">
              Imutável
            </Badge>
          </div>
        )}

        {/* Visualizador do Conteúdo do Contrato (Leitura Fluida Mobile/Desktop) */}
        <div className="bg-card border border-border/80 rounded-lg p-5 sm:p-8 space-y-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Termos e Cláusulas Contratuais
            </h2>
            {version?.sourceFileSignedUrl && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-11 min-h-11 sm:h-8 sm:min-h-0 rounded-lg text-xs gap-2"
              >
                <a
                  href={version.sourceFileSignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  <span>Abrir Original</span>
                </a>
              </Button>
            )}
          </div>

          {version?.sourceFileSignedUrl && (
            <div className="space-y-2">
              {version?.source_file_mime?.startsWith("image/") ? (
                <img
                  src={version.sourceFileSignedUrl}
                  alt={version.source_file_name || contract?.title || "Documento"}
                  className="w-full max-h-128 object-contain rounded-lg border border-border/60 bg-background"
                />
              ) : (
                <iframe
                  title={version.source_file_name || contract?.title || "Documento Original"}
                  src={version.sourceFileSignedUrl}
                  className="w-full h-96 sm:h-128 rounded-lg border border-border/60 bg-background"
                />
              )}
            </div>
          )}

          {(version?.content_markdown?.trim() || !version?.sourceFileSignedUrl) && (
            <ContractMarkdownRenderer
              content={version?.content_markdown || ""}
              className="text-xs sm:text-sm text-foreground/90 leading-relaxed max-h-138 overflow-y-auto rounded-lg p-4 sm:p-6 bg-muted/10 font-serif"
            />
          )}
        </div>

        {/* SE JÁ FOI ASSINADO: EXIBE PROTOCOLO COMPLETO E LINK DE VERIFICAÇÃO */}
        {isSignedLocal ? (
          <div className="space-y-6">
            <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-6 text-center space-y-3">
              <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h2 className="text-base font-bold text-foreground">
                A sua assinatura foi registada
              </h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                A conclusão global depende de todas as assinaturas exigidas. Consulte o certificado público para acompanhar o estado do contrato.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void downloadSignedContractPackagePdf({
                      title: contract?.title || version?.title || "Minuta de Contrato",
                      categoryLabel: contract?.category || "Contrato",
                      statusLabel: formatContractStatusLabel(
                        typeof signMutation.data === "object" && signMutation.data && "completed" in signMutation.data && signMutation.data.completed
                          ? "completed"
                          : "partially_signed",
                      ),
                      contentMarkdown: version?.content_markdown || "",
                      verificationCode: contract?.verification_code || null,
                      hashSha256: version?.hash_sha256 || null,
                      sealedAt: version?.sealed_at || null,
                      sourceFileSignedUrl: version?.sourceFileSignedUrl || null,
                      sourceFileName: version?.source_file_name || null,
                      signers: [
                        {
                          name: envelope.signer_name || "Signatário",
                          email: envelope.signer_email || null,
                          phone: envelope.signer_phone || null,
                          role: envelope.signer_role || "party",
                          status: "signed",
                          viewedAt: envelope.viewed_at || null,
                          signedAt: new Date().toISOString(),
                          signatureImageUrl: signatureImage || undefined,
                        },
                      ],
                    })
                  }
                  className="rounded-lg text-xs font-semibold gap-2 h-11 min-h-11 sm:h-9 sm:min-h-0 px-4"
                >
                  <Download className="size-4" />
                  <span>Baixar Comprovante PDF</span>
                </Button>
                {contract?.verification_code && (
                  <Button asChild size="sm" className="rounded-lg text-xs font-bold gap-2 h-11 min-h-11 sm:h-9 sm:min-h-0 px-5">
                    <Link to="/verify/document/$code" params={{ code: contract.verification_code }}>
                      <span>Ver Certificado Público de Autenticidade</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Folha de Rosto / Protocolo de Auditoria */}
            {contract?.verification_code && (
              <ContractAuditManifest
                documentTitle={contract?.title || version?.title}
                category={contract?.category || "general_deal"}
                verificationCode={contract.verification_code}
                hashSha256={version?.hash_sha256}
                sealedAt={version?.sealed_at}
                signers={[
                  {
                    name: envelope.signer_name,
                    email: envelope.signer_email,
                    phone: envelope.signer_phone,
                    role: envelope.signer_role || "party",
                    status: "signed",
                    signedAt: envelope.signed_at || null,
                    signatureImageUrl: signatureImage || undefined,
                  },
                ]}
              />
            )}
          </div>
        ) : (
          /* ÁREA DE ASSINATURA TÁTIL, BIOMETRIA E CONSENTIMENTO */
          <div className="space-y-6">
            {/* Captura de Biometria Facial Opcional */}
            <div className="border border-border/70 bg-card rounded-lg p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <Camera className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Identificação Facial (Opcional)
                </h3>
                {selfieUploaded && (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" /> Capturada
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Para maior segurança jurídica e conformidade com a Lei 14.063/2020, capture uma selfie como evidência biométrica da assinatura.
              </p>

              {isCameraOpen && (
                <div className="relative rounded-lg overflow-hidden border border-border/60 bg-foreground">
                  <video ref={videoRef} autoPlay muted playsInline className="w-full max-h-60 object-cover" />
                  <div className="absolute inset-0 border-4 border-primary/30 rounded-lg pointer-events-none" />
                  <button
                    type="button"
                    onClick={captureSelfie}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Tirar Foto
                  </button>
                </div>
              )}

              {selfieDataUrl && !isCameraOpen && (
                <div className="relative rounded-lg overflow-hidden border border-border/60">
                  <img src={selfieDataUrl} alt="Selfie biométrica" className="w-full max-h-60 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    {!selfieUploaded && (
                      <button
                        type="button"
                        onClick={uploadSelfie}
                        disabled={isUploadingSelfie}
                        className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11 sm:min-h-0"
                      >
                        {isUploadingSelfie ? "Confirmando..." : "Confirmar"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={retakeSelfie}
                      className="h-8 px-3 rounded-lg text-xs font-semibold bg-muted text-foreground hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11 sm:min-h-0"
                    >
                      <RefreshCcw className="size-4 inline mr-1" />
                      Refazer
                    </button>
                  </div>
                </div>
              )}

              {!isCameraOpen && !selfieDataUrl && (
                <button
                  type="button"
                  onClick={openCamera}
                  className="w-full h-11 rounded-lg border border-dashed border-border/80 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Camera className="size-4" />
                  Abrir câmera e capturar selfie
                </button>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Pad de Assinatura Multimodal & Consentimento Legal */}
            <div className="border border-primary/30 bg-card rounded-lg p-5 sm:p-6 space-y-5">
              {/* Autenticação OTP de 6 Dígitos (Exibida para envelopes com nível avançado) */}
              {envelope.auth_level === "advanced" && (
                <div className="p-4 rounded-lg border border-border/80 bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Autenticação OTP de 6 Dígitos
                      </span>
                    </div>
                    <Badge variant="outline" className="text-2xs font-mono">
                      Obrigatório
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Um código de validação foi despachado para{" "}
                    <strong className="text-foreground">
                      {envelope.signer_phone || envelope.signer_email || "seu canal de contato"}
                    </strong>
                    . Digite o código de 6 dígitos para validar a autenticidade da sua assinatura.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-36 h-11 px-3 text-center text-lg font-mono tracking-widest rounded-lg border border-border bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={otpCooldown > 0}
                      onClick={handleResendOtp}
                      className="h-11 min-h-11 sm:h-9 sm:min-h-0 rounded-lg text-xs"
                    >
                      <RefreshCcw className="size-4 mr-1" />
                      {otpCooldown > 0 ? `Reenviar em ${otpCooldown}s` : "Reenviar Código"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Seletor de Modalidades de Assinatura */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Forma de Assinatura
                  </span>
                  {signatureImage && (
                    <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" /> Assinatura Ativa
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={signatureMethod === "draw" ? "default" : "outline"}
                    onClick={() => setSignatureMethod("draw")}
                    className="h-11 min-h-11 sm:h-9 sm:min-h-0 rounded-lg text-xs font-semibold gap-2"
                  >
                    <PenTool className="size-4" />
                    <span>Desenhar</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant={signatureMethod === "type" ? "default" : "outline"}
                    onClick={() => {
                      setSignatureMethod("type");
                      if (!signatureImage && (typedName || envelope.signer_name)) {
                        const img = generateCursiveSignatureImage(typedName || envelope.signer_name, cursiveStyle);
                        if (img) setSignatureImage(img);
                      }
                    }}
                    className="h-11 min-h-11 sm:h-9 sm:min-h-0 rounded-lg text-xs font-semibold gap-2"
                  >
                    <Type className="size-4" />
                    <span>Digitar Nome</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant={signatureMethod === "upload" ? "default" : "outline"}
                    onClick={() => setSignatureMethod("upload")}
                    className="h-11 min-h-11 sm:h-9 sm:min-h-0 rounded-lg text-xs font-semibold gap-2"
                  >
                    <Upload className="size-4" />
                    <span>Subir Imagem</span>
                  </Button>

                  {savedSig?.savedSignature && (
                    <Button
                      type="button"
                      size="sm"
                      variant={signatureMethod === "saved" ? "default" : "outline"}
                      onClick={() => {
                        setSignatureMethod("saved");
                        setSignatureImage(savedSig.savedSignature);
                      }}
                      className="h-11 min-h-11 sm:h-9 sm:min-h-0 rounded-lg text-xs font-semibold gap-2"
                    >
                      <FileSignature className="size-4" />
                      <span>Assinatura Salva</span>
                    </Button>
                  )}

                  {govBrConfig?.isGovBrEnabled && govBrConfig?.authUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant={signatureMethod === "govbr" ? "default" : "outline"}
                      onClick={() => setSignatureMethod("govbr")}
                      className="h-11 min-h-11 sm:h-9 sm:min-h-0 rounded-lg text-xs font-semibold gap-2"
                    >
                      <ShieldCheck className="size-4" />
                      <span>GOV.BR</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Área Específica da Modalidade Ativa */}
              {signatureMethod === "draw" && (
                <div className="space-y-2">
                  <SignatureCanvasPad onSave={setSignatureImage} />
                </div>
              )}

              {signatureMethod === "type" && (
                <div className="space-y-4 p-4 rounded-lg border border-border/80 bg-muted/10">
                  <div className="space-y-2">
                    <label htmlFor="typed-signer-name" className="text-xs font-semibold text-foreground">
                      Nome para assinatura caligráfica
                    </label>
                    <input
                      id="typed-signer-name"
                      type="text"
                      value={typedName}
                      onChange={(e) => {
                        setTypedName(e.target.value);
                        const img = generateCursiveSignatureImage(e.target.value, cursiveStyle);
                        if (img) setSignatureImage(img);
                      }}
                      placeholder="Digite seu nome completo"
                      className="w-full h-11 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Estilo da letra:</span>
                    {[0, 1, 2].map((idx) => (
                      <Button
                        key={idx}
                        type="button"
                        size="sm"
                        variant={cursiveStyle === idx ? "default" : "outline"}
                        onClick={() => {
                          setCursiveStyle(idx);
                          const img = generateCursiveSignatureImage(typedName || envelope.signer_name, idx);
                          if (img) {
                            setSignatureImage(img);
                            toast.success(`Estilo caligráfico ${idx + 1} selecionado.`);
                          }
                        }}
                        className="h-11 min-h-11 sm:h-8 sm:min-h-0 text-xs rounded-lg"
                      >
                        Estilo {idx + 1}
                      </Button>
                    ))}
                  </div>

                  <div className="p-4 rounded-lg border border-border bg-card flex flex-col items-center justify-center min-h-24">
                    {signatureImage ? (
                      <img src={signatureImage} alt="Assinatura Cursiva Gerada" className="max-h-20 object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground italic font-serif text-base">
                        {typedName || envelope.signer_name || "Prévia da assinatura"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {signatureMethod === "upload" && (
                <div className="space-y-4">
                  <div className="p-6 rounded-lg border-2 border-dashed border-border/80 bg-muted/10 flex flex-col items-center justify-center text-center space-y-3">
                    <Upload className="size-8 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-foreground">
                        Selecione uma imagem da sua assinatura manuscrita
                      </p>
                      <p className="text-2xs text-muted-foreground">
                        Formatos aceitos: PNG, JPG ou JPEG (máximo 2MB)
                      </p>
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-2 h-11 min-h-11 sm:h-9 sm:min-h-0 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors focus-within:ring-2 focus-within:ring-ring">
                      <Upload className="size-4" />
                      <span>Escolher Arquivo</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleSignatureFileUpload}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {signatureImage && (
                    <div className="p-4 rounded-lg border border-border bg-card flex items-center justify-between gap-3">
                      <img src={signatureImage} alt="Assinatura enviada" className="max-h-16 object-contain" />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSignatureImage("");
                          toast.info("Assinatura removida.");
                        }}
                        className="h-11 min-h-11 sm:h-8 sm:min-h-0 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {signatureMethod === "saved" && savedSig?.savedSignature && (
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                      <FileSignature className="size-4 text-primary" />
                      Assinatura Salva no seu Perfil
                    </div>
                    <p className="text-2xs text-muted-foreground">
                      Você possui uma assinatura digital registrada na plataforma.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <img
                      src={savedSig.savedSignature}
                      alt="Assinatura Salva"
                      className="h-9 max-w-32 object-contain bg-background rounded-lg border border-border p-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs font-semibold h-11 min-h-11 sm:h-9 sm:min-h-0 px-4 cursor-pointer"
                      onClick={() => {
                        setSignatureImage(savedSig.savedSignature);
                        toast.success("Assinatura do seu perfil carregada com sucesso!");
                      }}
                    >
                      <Check className="size-4 mr-1" />
                      Usar Esta
                    </Button>
                  </div>
                </div>
              )}

              {signatureMethod === "govbr" && govBrConfig?.isGovBrEnabled && govBrConfig?.authUrl && (
                <div className="p-4 sm:p-5 rounded-lg border border-blue-500/30 bg-blue-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground flex items-center gap-2">
                        <ShieldCheck className="size-4 text-blue-600 dark:text-blue-400" />
                        Assinatura com Conta GOV.BR
                      </span>
                      <Badge variant="outline" className="text-2xs font-semibold border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10">
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
                    className="w-full sm:w-auto rounded-lg text-xs font-bold h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 min-h-11 cursor-pointer shadow-xs gap-2"
                  >
                    <ExternalLink className="size-4" />
                    <span>Assinar com GOV.BR</span>
                  </Button>
                </div>
              )}

              {/* Prévia da Assinatura Pronta */}
              {signatureImage && (
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-medium text-foreground">
                      Assinatura pronta para ser carimbada no documento
                    </span>
                  </div>
                  <img
                    src={signatureImage}
                    alt="Assinatura Selecionada"
                    className="h-8 max-w-28 object-contain bg-background rounded p-1 border border-border shrink-0"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="save-profile-sig"
                  checked={saveSignatureToProfile}
                  onCheckedChange={(c) => setSaveSignatureToProfile(Boolean(c))}
                  className="size-4 rounded-md"
                />
                <label htmlFor="save-profile-sig" className="text-xs text-muted-foreground cursor-pointer">
                  Salvar esta assinatura no meu perfil para usar com 1 toque em futuros contratos
                </label>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="consent-check"
                  checked={consent}
                  onCheckedChange={(c) => setConsent(Boolean(c))}
                  className="mt-1 size-5 rounded-md"
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="size-4 text-primary shrink-0" />
                  <span>Documento Protegido · Validade Jurídica Nacional</span>
                </div>

                <Button
                  onClick={handleSign}
                  disabled={!consent || signMutation.isPending}
                  className="w-full sm:w-auto rounded-lg text-sm font-bold gap-2 h-12 px-8 min-h-12 bg-primary text-primary-foreground"
                >
                  {signMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
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
