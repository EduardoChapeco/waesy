import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clipboard,
  Smartphone,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  parseUniversalDocumentOCR,
  type UniversalOcrResult,
} from "@/services/multimodal-ocr.functions";
import {
  DigitalCompanionCard,
  type CompanionCardNiche,
} from "@/components/documents/digital-companion-card";

export interface MultimodalOcrUploaderProps {
  nicheHint?: CompanionCardNiche | "general";
  onExtracted?: (result: UniversalOcrResult) => void;
  onSaveToDatabase?: (result: UniversalOcrResult) => Promise<void>;
  showPreviewModal?: boolean;
  className?: string;
  triggerLabel?: string;
}

interface UploadedFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  base64: string;
  previewUrl?: string;
}

export function MultimodalOcrUploader({
  nicheHint = "general",
  onExtracted,
  onSaveToDatabase,
  showPreviewModal = true,
  className = "",
}: MultimodalOcrUploaderProps) {
  const [selectedNiche, setSelectedNiche] = useState<CompanionCardNiche | "general">(nicheHint);
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [contextHint, setContextHint] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [extractedResult, setExtractedResult] = useState<UniversalOcrResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listener para Ctrl+V (colar imagens diretamente da área de transferência)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleProcessFile(file);
            toast.info("Imagem colada da área de transferência!");
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleProcessFile = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error(`O arquivo ${file.name} excede o limite de 20MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64 = resultStr.includes(",") ? resultStr.split(",")[1] : resultStr;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      setFiles((prev) => [
        ...prev,
        {
          id,
          name: file.name || "Imagem Colada",
          size: file.size,
          type: file.type || "image/png",
          base64,
          previewUrl: file.type.startsWith("image/") ? resultStr : undefined,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    selected.forEach(handleProcessFile);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    dropped.forEach(handleProcessFile);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleStartExtraction = async () => {
    if (files.length === 0) {
      toast.error("Anexe pelo menos 1 documento ou imagem para leitura.");
      return;
    }

    try {
      setIsProcessing(true);
      setStatusMessage("Enviando páginas para inteligência visual...");

      const payload = {
        files: files.map((f) => ({
          base64: f.base64,
          mimeType: f.type,
          name: f.name,
        })),
        nicheHint: selectedNiche,
        contextHint: contextHint.trim() || undefined,
      };

      setStatusMessage("Analisando conexões, regras e contatos...");
      const result = await parseUniversalDocumentOCR({ data: payload });

      toast.success("Documento estruturado com sucesso!");
      setExtractedResult(result);

      if (onExtracted) {
        onExtracted(result);
      }

      if (showPreviewModal) {
        setPreviewOpen(true);
      }
    } catch (err: any) {
      toast.error(err?.message || "Falha ao extrair dados do documento.");
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  const NICHE_PILLS = [
    { id: "general", label: "Automático" },
    { id: "tourism", label: "Turismo & Vouchers" },
    { id: "real_estate", label: "Imóveis & Temporada" },
    { id: "service", label: "Ordem de Serviço" },
    { id: "auto", label: "Veículos & CRLV" },
    { id: "retail", label: "Balcão & Varejo" },
    { id: "health", label: "Saúde & Termos" },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ── SELETOR RÁPIDO DE NICHO ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-muted-foreground shrink-0 mr-1">
          Modo:
        </span>
        {NICHE_PILLS.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setSelectedNiche(n.id as any)}
            className={`h-7 px-2.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              selectedNiche === n.id
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>

      {/* ── DROPZONE COM DRAG & DROP E SUPORTE A CTRL+V ── */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="relative border-2 border-dashed border-border/80 hover:border-primary/50 bg-card hover:bg-muted/20 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-3 group"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFilesSelected}
          className="hidden"
        />

        <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
          <UploadCloud className="size-6" />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-bold text-foreground">
            Clique para selecionar ou arraste seus arquivos aqui
          </p>
          <p className="text-[11px] text-muted-foreground">
            PDFs ou fotos de vouchers, comprovantes, passagens e contratos (até 20MB cada).
          </p>
          <p className="text-[10px] text-primary font-medium flex items-center justify-center gap-1">
            <Clipboard className="size-3" /> Pressione <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono font-bold">Ctrl + V</kbd> para colar print direto
          </p>
        </div>
      </div>

      {/* ── LISTA DE ARQUIVOS ANEXADOS ── */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span>{files.length} documento(s) pronto(s) para análise</span>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
            >
              Limpar todos
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-card shadow-2xs"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {f.previewUrl ? (
                    <img
                      src={f.previewUrl}
                      alt={f.name}
                      className="size-8 rounded-lg object-cover border border-border/50 shrink-0"
                    />
                  ) : (
                    <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="size-4" />
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs font-semibold text-foreground truncate">{f.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(f.size / 1024).toFixed(0)} KB · {f.type.split("/")[1]?.toUpperCase() || "DOC"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(f.id);
                  }}
                  className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PISTA DE CONTEXTO OPCIONAL ── */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Pista de Contexto (Opcional)
        </label>
        <Input
          placeholder="Ex: Voucher da operadora CVC com voos da Latam e hotel em Gramado"
          value={contextHint}
          onChange={(e) => setContextHint(e.target.value)}
          className="h-9 text-xs rounded-xl"
        />
      </div>

      {/* ── BOTÃO DE AÇÃO PRINCIPAL ── */}
      <Button
        type="button"
        onClick={handleStartExtraction}
        disabled={isProcessing || files.length === 0}
        className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer shadow-xs"
      >
        {isProcessing ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span>{statusMessage || "Processando Documentos..."}</span>
          </>
        ) : (
          <>
            <Sparkles className="size-4" />
            <span>Extrair Dados com Inteligência Visual (OCR)</span>
          </>
        )}
      </Button>

      {/* ── MODAL DE PREVIEW INSTANTÂNEO 9:16 (SE ATIVADO) ── */}
      {showPreviewModal && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-background border border-border shadow-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>Documento Digital Reconhecido</DialogTitle>
            </DialogHeader>
            {extractedResult && (
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span className="text-xs font-bold text-foreground">
                      Documento Estruturado com Sucesso
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Confiança: {extractedResult.confidence}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {onSaveToDatabase && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSavingToDb}
                        onClick={async () => {
                          if (!extractedResult) return;
                          try {
                            setIsSavingToDb(true);
                            await onSaveToDatabase(extractedResult);
                            setPreviewOpen(false);
                          } finally {
                            setIsSavingToDb(false);
                          }
                        }}
                        className="h-8 rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                      >
                        {isSavingToDb ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3.5" />
                            <span>Salvar no Sistema</span>
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewOpen(false)}
                      className="h-8 rounded-xl text-xs cursor-pointer"
                    >
                      Fechar Prévia
                    </Button>
                  </div>
                </div>

                <DigitalCompanionCard
                  niche={extractedResult.niche}
                  title={extractedResult.title}
                  subtitle={extractedResult.subtitle}
                  code={extractedResult.code}
                  companyName={extractedResult.companyName}
                  companyLogoUrl={extractedResult.companyLogoUrl}
                  participantsLabel={extractedResult.participantsLabel}
                  participants={extractedResult.participants}
                  sections={extractedResult.sections}
                  rules={extractedResult.rules}
                  emergencyContacts={extractedResult.emergencyContacts}
                  observations={extractedResult.observations}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
