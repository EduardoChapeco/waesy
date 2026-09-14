import { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Plane,
  Building2,
  Car,
  ShieldCheck,
  Users,
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ChevronRight,
  Ticket,
  Copy,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  Receipt,
  Phone,
  Clock,
  Luggage,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  parseOperatorVoucherAI,
  applyParsedVoucherToTrip,
  type OperatorParsedVoucherDTO,
} from "@/services/travel-lifecycle.functions";
import { extractMediaFromClipboard } from "@/lib/clipboard-media";

interface UploadedDocumentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  base64: string;
}

interface OperatorVoucherImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId?: string;
  storeId?: string;
  onSuccess?: (res: { tripId: string; voucherToken: string; voucherUrl: string }) => void;
}

export function OperatorVoucherImportSheet({
  open,
  onOpenChange,
  tripId,
  storeId,
  onSuccess,
}: OperatorVoucherImportSheetProps) {
  const [activeInputTab, setActiveInputTab] = useState<"files" | "text">("files");
  const [documents, setDocuments] = useState<UploadedDocumentItem[]>([]);
  const [rawText, setRawText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [parsedData, setParsedData] = useState<OperatorParsedVoucherDTO | null>(null);
  const [activeReviewTab, setActiveReviewTab] = useState<
    "resumo" | "passageiros" | "voos" | "hospedagem" | "transfers" | "financeiro"
  >("resumo");
  const [step, setStep] = useState<"input" | "review" | "done">("input");
  const [createdVoucherUrl, setCreatedVoucherUrl] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setDocuments([]);
    setRawText("");
    setParsedData(null);
    setStep("input");
    setActiveReviewTab("resumo");
    setCreatedVoucherUrl("");
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    for (const file of selectedFiles) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`O arquivo ${file.name} excede o limite de 20MB.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setDocuments((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            size: file.size,
            type: file.type || "application/pdf",
            base64,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (activeInputTab === "text") return;

    const items = await extractMediaFromClipboard(e);
    if (items && items.length > 0) {
      e.preventDefault();
      toast.info(`Processando ${items.length} comprovante(s) colado(s)...`);
      for (const item of items) {
        const file = item.file;
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          setDocuments((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(2, 9),
              name: file.name || "voucher_clipboard.png",
              size: file.size,
              type: file.type || "image/png",
              base64,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
      toast.success("Comprovante colado com sucesso para análise OCR!");
    }
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleRunOCR = async () => {
    if (documents.length === 0 && !rawText.trim()) {
      toast.error("Anexe ao menos um comprovante ou cole o texto do voucher.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const payloadFiles: Array<{
        fileBase64?: string;
        fileMime?: string;
        fileName?: string;
        rawText?: string;
      }> = documents.map((doc) => ({
        fileBase64: doc.base64,
        fileMime: doc.type,
        fileName: doc.name,
      }));

      if (rawText.trim()) {
        payloadFiles.push({
          fileBase64: undefined,
          fileMime: undefined,
          fileName: "Texto Digitado",
          rawText: rawText.trim(),
        });
      }

      const res = await parseOperatorVoucherAI({
        data: {
          files: payloadFiles,
        },
      });

      if (res.success && res.parsed) {
        setParsedData(res.parsed);
        setStep("review");
        toast.success(`OCR Multimodal concluiu a leitura de ${payloadFiles.length} documento(s)!`);
      } else {
        toast.error("Não foi possível extrair os dados dos documentos.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Falha na análise inteligente dos documentos.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyToTrip = async () => {
    if (!parsedData) return;

    setIsApplying(true);
    try {
      const res = await applyParsedVoucherToTrip({
        data: {
          tripId: tripId || undefined,
          storeId: storeId || undefined,
          parsedData,
        },
      });

      if (res.success) {
        setCreatedVoucherUrl(res.voucherUrl);
        setStep("done");
        toast.success("Viagem, passageiros com validades e vouchers sincronizados com sucesso!");
        if (onSuccess) {
          onSuccess(res);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao sincronizar dados com a viagem.");
    } finally {
      setIsApplying(false);
    }
  };

  // Helper para verificar expiração de passaporte em relação à data da viagem
  const checkDocumentValidity = (expiryDate?: string | null, travelStart?: string | null) => {
    if (!expiryDate) return { status: "missing", label: "Não informada", tone: "muted" };
    if (!travelStart) return { status: "valid", label: "Informada", tone: "info" };

    const start = new Date(travelStart).getTime();
    const expiry = new Date(expiryDate).getTime();
    const diffDays = Math.ceil((expiry - start) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return { status: "expired", label: "Vencido no embarque!", tone: "danger" };
    }
    if (diffDays < 180) {
      return { status: "warning", label: "Vence em menos de 6 meses no embarque!", tone: "warning" };
    }
    return { status: "ok", label: "Válido para embarque", tone: "success" };
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <SheetContent
        side="right"
        size="wide"
        className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col justify-between bg-background text-foreground overflow-hidden border-l border-border"
      >
        {/* ── HEADER ── */}
        <div className="p-5 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="size-5" />
              </div>
              <div>
                <SheetTitle className="text-sm font-bold text-foreground">
                  Studio de Importação de Vouchers & Documentos (OCR)
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Importe comprovantes de operadoras (CVC, FRT, Orinter), bilhetes, passaportes e faturas com extração automática.
                </SheetDescription>
              </div>
            </div>
            {step === "review" && (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
                Revisão do Agente
              </Badge>
            )}
          </div>
        </div>

        {/* ── CORPO DA SHEET ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6" onPaste={handlePaste}>
          {/* PASSO 1: INPUT MULTI-DOCUMENTOS */}
          {step === "input" && (
            <div className="space-y-5">
              <div className="flex items-center p-1 rounded-xl bg-muted/40 border border-border">
                <button
                  type="button"
                  onClick={() => setActiveInputTab("files")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeInputTab === "files"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Arquivos (PDFs, Imagens, Boletos)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab("text")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeInputTab === "text"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Texto / E-mail Copiado
                </button>
              </div>

              {activeInputTab === "files" ? (
                <div className="space-y-4">
                  {/* Dropzone Multi-Upload */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onPaste={handlePaste}
                    tabIndex={0}
                    className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-all rounded-2xl p-8 text-center cursor-pointer flex flex-col items-center justify-center gap-3 outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleFilesSelected}
                    />
                    <div className="size-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                      <UploadCloud className="size-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Clique, arraste ou cole com Ctrl+V os comprovantes
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        PDFs de reservas, bilhetes aéreos, vouchers, boletos e prints de tela (suporta colar direto da área de transferência)
                      </p>
                    </div>
                    <Button variant="outline" size="sm" type="button" className="text-xs h-8">
                      <Plus className="size-3.5 mr-1" /> Selecionar ou Colar Arquivos
                    </Button>
                  </div>

                  {/* Lista de Documentos Anexados */}
                  {documents.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
                        <span>Documentos selecionados ({documents.length}):</span>
                        <button
                          type="button"
                          onClick={() => setDocuments([])}
                          className="text-xs text-destructive hover:underline cursor-pointer"
                        >
                          Limpar todos
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border text-xs"
                          >
                            <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                              <FileText className="size-4 text-primary shrink-0" />
                              <span className="truncate font-medium text-foreground">{doc.name}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                ({Math.round(doc.size / 1024)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeDocument(doc.id);
                              }}
                              className="size-6 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block">
                    Texto do Comprovante, Roteiro ou Fatura:
                  </label>
                  <Textarea
                    rows={8}
                    placeholder="Cole aqui o texto do voucher da operadora com voos, hotéis, passageiros, valores e regras de cancelamento..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="text-xs rounded-xl font-mono leading-relaxed bg-background"
                  />
                </div>
              )}
            </div>
          )}

          {/* PASSO 2: REVISÃO COMPLETA PELO AGENTE (STUDIO) */}
          {step === "review" && parsedData && (
            <div className="space-y-5">
              {/* Navegação por Abas do Studio */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveReviewTab("resumo")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                    activeReviewTab === "resumo"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Resumo & Operadora
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReviewTab("passageiros")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    activeReviewTab === "passageiros"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Viajantes & Validades
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">
                    {parsedData.passengers?.length || 0}
                  </Badge>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReviewTab("voos")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    activeReviewTab === "voos"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Voos & Bagagens
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">
                    {parsedData.flights?.length || 0}
                  </Badge>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReviewTab("hospedagem")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    activeReviewTab === "hospedagem"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Hospedagem
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">
                    {parsedData.hotels?.length || 0}
                  </Badge>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReviewTab("transfers")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                    activeReviewTab === "transfers"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Transfers & Tours
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReviewTab("financeiro")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                    activeReviewTab === "financeiro"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Financeiro & Regras
                </button>
              </div>

              {/* ABA 1: RESUMO & OPERADORA */}
              {activeReviewTab === "resumo" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                        Operadora Emissora:
                      </label>
                      <Input
                        value={parsedData.operator_name || ""}
                        onChange={(e) => setParsedData({ ...parsedData, operator_name: e.target.value })}
                        placeholder="Ex: CVC, FRT, Orinter, Azul Viagens"
                        className="text-xs h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                        Localizador Geral / Reserva:
                      </label>
                      <Input
                        value={parsedData.general_locator || ""}
                        onChange={(e) => setParsedData({ ...parsedData, general_locator: e.target.value })}
                        placeholder="Ex: ABC123XYZ"
                        className="text-xs h-9 font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                        Cidade de Destino:
                      </label>
                      <Input
                        value={parsedData.destination_city || ""}
                        onChange={(e) => setParsedData({ ...parsedData, destination_city: e.target.value })}
                        placeholder="Ex: Maceió, Cancún, Paris"
                        className="text-xs h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                        Título da Viagem:
                      </label>
                      <Input
                        value={parsedData.trip_title || ""}
                        onChange={(e) => setParsedData({ ...parsedData, trip_title: e.target.value })}
                        placeholder="Ex: Férias em Família no Caribe"
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                        Data de Partida / Início:
                      </label>
                      <Input
                        type="date"
                        value={parsedData.travel_start_date || ""}
                        onChange={(e) => setParsedData({ ...parsedData, travel_start_date: e.target.value })}
                        className="text-xs h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                        Data de Retorno / Fim:
                      </label>
                      <Input
                        type="date"
                        value={parsedData.travel_end_date || ""}
                        onChange={(e) => setParsedData({ ...parsedData, travel_end_date: e.target.value })}
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Contatos B2B da Mesa da Operadora (Apenas Agência) */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">
                        Contatos Internos da Operadora (Mesa de Apoio à Agência)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          Telefone Comercial:
                        </label>
                        <Input
                          value={parsedData.operator_contacts?.commercial_phone || ""}
                          onChange={(e) =>
                            setParsedData({
                              ...parsedData,
                              operator_contacts: {
                                ...parsedData.operator_contacts,
                                commercial_phone: e.target.value,
                              },
                            })
                          }
                          placeholder="+55 11..."
                          className="text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          Plantão 24h Operadora:
                        </label>
                        <Input
                          value={parsedData.operator_contacts?.emergency_phone || ""}
                          onChange={(e) =>
                            setParsedData({
                              ...parsedData,
                              operator_contacts: {
                                ...parsedData.operator_contacts,
                                emergency_phone: e.target.value,
                              },
                            })
                          }
                          placeholder="+55 11 9..."
                          className="text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          Mesa de Reserva / Ramal:
                        </label>
                        <Input
                          value={parsedData.operator_contacts?.reservation_desk || ""}
                          onChange={(e) =>
                            setParsedData({
                              ...parsedData,
                              operator_contacts: {
                                ...parsedData.operator_contacts,
                                reservation_desk: e.target.value,
                              },
                            })
                          }
                          placeholder="Ramal 1042"
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: VIAJANTES & VALIDADES DE DOCUMENTOS */}
              {activeReviewTab === "passageiros" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Passageiros da Viagem ({parsedData.passengers?.length || 0})
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setParsedData({
                          ...parsedData,
                          passengers: [
                            ...(parsedData.passengers || []),
                            {
                              name: "",
                              document_type: "passport",
                              document: "",
                              document_expiry: "",
                              birth_date: "",
                              nationality: "Brasileira",
                              seat: "",
                              is_lead: false,
                            },
                          ],
                        })
                      }
                      className="text-xs h-8"
                    >
                      <Plus className="size-3 mr-1" /> Adicionar Passageiro
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {(parsedData.passengers || []).map((pax, index) => {
                      const validity = checkDocumentValidity(
                        pax.document_expiry,
                        parsedData.travel_start_date
                      );

                      return (
                        <div
                          key={index}
                          className="p-3.5 rounded-xl bg-card border border-border space-y-3 relative group"
                        >
                          <div className="flex items-center justify-between border-b border-border pb-2">
                            <div className="flex items-center gap-2">
                              <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <span className="text-xs font-bold text-foreground">
                                {pax.name || `Passageiro ${index + 1}`}
                              </span>
                              {pax.is_lead && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Titular
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Badge de Alerta de Validade */}
                              {validity.status === "warning" && (
                                <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[10px] gap-1">
                                  <AlertTriangle className="size-3" /> {validity.label}
                                </Badge>
                              )}
                              {validity.status === "expired" && (
                                <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] gap-1">
                                  <AlertCircle className="size-3" /> {validity.label}
                                </Badge>
                              )}
                              {validity.status === "ok" && (
                                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[10px] gap-1">
                                  <Check className="size-3" /> {validity.label}
                                </Badge>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setParsedData({
                                    ...parsedData,
                                    passengers: parsedData.passengers.filter((_, i) => i !== index),
                                  })
                                }
                                className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center cursor-pointer transition-colors"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                                Nome Completo:
                              </label>
                              <Input
                                value={pax.name || ""}
                                onChange={(e) => {
                                  const updated = [...parsedData.passengers];
                                  updated[index].name = e.target.value;
                                  setParsedData({ ...parsedData, passengers: updated });
                                }}
                                className="text-xs h-8"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                                Tipo de Documento:
                              </label>
                              <select
                                value={pax.document_type || "passport"}
                                onChange={(e) => {
                                  const updated = [...parsedData.passengers];
                                  updated[index].document_type = e.target.value;
                                  setParsedData({ ...parsedData, passengers: updated });
                                }}
                                className="w-full text-xs h-8 px-2.5 rounded-md border border-input bg-background"
                              >
                                <option value="passport">Passaporte</option>
                                <option value="rg">RG</option>
                                <option value="cnh">CNH</option>
                                <option value="cpf">CPF</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                                Número do Documento:
                              </label>
                              <Input
                                value={pax.document || ""}
                                onChange={(e) => {
                                  const updated = [...parsedData.passengers];
                                  updated[index].document = e.target.value;
                                  setParsedData({ ...parsedData, passengers: updated });
                                }}
                                className="text-xs h-8 font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                                Validade do Documento:
                              </label>
                              <Input
                                type="date"
                                value={pax.document_expiry || ""}
                                onChange={(e) => {
                                  const updated = [...parsedData.passengers];
                                  updated[index].document_expiry = e.target.value;
                                  setParsedData({ ...parsedData, passengers: updated });
                                }}
                                className="text-xs h-8"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                                Data de Nascimento:
                              </label>
                              <Input
                                type="date"
                                value={pax.birth_date || ""}
                                onChange={(e) => {
                                  const updated = [...parsedData.passengers];
                                  updated[index].birth_date = e.target.value;
                                  setParsedData({ ...parsedData, passengers: updated });
                                }}
                                className="text-xs h-8"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                                Assento Marcado:
                              </label>
                              <Input
                                value={pax.seat || ""}
                                onChange={(e) => {
                                  const updated = [...parsedData.passengers];
                                  updated[index].seat = e.target.value;
                                  setParsedData({ ...parsedData, passengers: updated });
                                }}
                                placeholder="Ex: 14B"
                                className="text-xs h-8 uppercase font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ABA 3: VOOS & BAGAGENS */}
              {activeReviewTab === "voos" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Trechos de Voo Confirmados ({parsedData.flights?.length || 0})
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setParsedData({
                          ...parsedData,
                          flights: [
                            ...(parsedData.flights || []),
                            {
                              airline: "LATAM",
                              flight_number: "",
                              origin: "GRU",
                              destination: "",
                              date: parsedData.travel_start_date || "",
                              departure_time: "",
                              arrival_time: "",
                              locator: "",
                              baggage: "1x 23kg",
                              class: "Econômica",
                            },
                          ],
                        })
                      }
                      className="text-xs h-8"
                    >
                      <Plus className="size-3 mr-1" /> Adicionar Trecho
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {(parsedData.flights || []).map((flight, index) => (
                      <div key={index} className="p-3.5 rounded-xl bg-card border border-border space-y-3">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <div className="flex items-center gap-2">
                            <Plane className="size-4 text-primary" />
                            <span className="text-xs font-bold text-foreground">
                              {flight.airline} {flight.flight_number} ({flight.origin} ➔ {flight.destination})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setParsedData({
                                ...parsedData,
                                flights: parsedData.flights.filter((_, i) => i !== index),
                              })
                            }
                            className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Cia Aérea:
                            </label>
                            <Input
                              value={flight.airline || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.flights];
                                updated[index].airline = e.target.value;
                                setParsedData({ ...parsedData, flights: updated });
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Nº do Voo:
                            </label>
                            <Input
                              value={flight.flight_number || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.flights];
                                updated[index].flight_number = e.target.value;
                                setParsedData({ ...parsedData, flights: updated });
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Origem (IATA):
                            </label>
                            <Input
                              value={flight.origin || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.flights];
                                updated[index].origin = e.target.value.toUpperCase();
                                setParsedData({ ...parsedData, flights: updated });
                              }}
                              className="text-xs h-8 uppercase font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Destino (IATA):
                            </label>
                            <Input
                              value={flight.destination || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.flights];
                                updated[index].destination = e.target.value.toUpperCase();
                                setParsedData({ ...parsedData, flights: updated });
                              }}
                              className="text-xs h-8 uppercase font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Data do Voo:
                            </label>
                            <Input
                              type="date"
                              value={flight.date || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.flights];
                                updated[index].date = e.target.value;
                                setParsedData({ ...parsedData, flights: updated });
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Horário Partida:
                            </label>
                            <Input
                              value={flight.departure_time || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.flights];
                                updated[index].departure_time = e.target.value;
                                setParsedData({ ...parsedData, flights: updated });
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Localizador PNR:
                            </label>
                            <Input
                              value={flight.locator || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.flights];
                                updated[index].locator = e.target.value.toUpperCase();
                                setParsedData({ ...parsedData, flights: updated });
                              }}
                              className="text-xs h-8 uppercase font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Franquia de Bagagem:
                            </label>
                            <Input
                              value={flight.baggage || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.flights];
                                updated[index].baggage = e.target.value;
                                setParsedData({ ...parsedData, flights: updated });
                              }}
                              placeholder="1x 23kg"
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA 4: HOSPEDAGEM */}
              {activeReviewTab === "hospedagem" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Reservas de Hotel ({parsedData.hotels?.length || 0})
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setParsedData({
                          ...parsedData,
                          hotels: [
                            ...(parsedData.hotels || []),
                            {
                              name: "",
                              city: parsedData.destination_city || "",
                              checkin: parsedData.travel_start_date || "",
                              checkout: parsedData.travel_end_date || "",
                              room_type: "Standard",
                              meal_plan: "Café da Manhã",
                              confirmation: "",
                              phone: "",
                            },
                          ],
                        })
                      }
                      className="text-xs h-8"
                    >
                      <Plus className="size-3 mr-1" /> Adicionar Hotel
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {(parsedData.hotels || []).map((hotel, index) => (
                      <div key={index} className="p-3.5 rounded-xl bg-card border border-border space-y-3">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="size-4 text-primary" />
                            <span className="text-xs font-bold text-foreground">{hotel.name || "Novo Hotel"}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setParsedData({
                                ...parsedData,
                                hotels: parsedData.hotels.filter((_, i) => i !== index),
                              })
                            }
                            className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Nome do Hotel:
                            </label>
                            <Input
                              value={hotel.name || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.hotels];
                                updated[index].name = e.target.value;
                                setParsedData({ ...parsedData, hotels: updated });
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Cidade / Região:
                            </label>
                            <Input
                              value={hotel.city || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.hotels];
                                updated[index].city = e.target.value;
                                setParsedData({ ...parsedData, hotels: updated });
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Código de Reserva Hotel:
                            </label>
                            <Input
                              value={hotel.confirmation || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.hotels];
                                updated[index].confirmation = e.target.value;
                                setParsedData({ ...parsedData, hotels: updated });
                              }}
                              className="text-xs h-8 font-mono uppercase"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Check-in:
                            </label>
                            <Input
                              type="date"
                              value={hotel.checkin || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.hotels];
                                updated[index].checkin = e.target.value;
                                setParsedData({ ...parsedData, hotels: updated });
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Check-out:
                            </label>
                            <Input
                              type="date"
                              value={hotel.checkout || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.hotels];
                                updated[index].checkout = e.target.value;
                                setParsedData({ ...parsedData, hotels: updated });
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Tipo de Quarto:
                            </label>
                            <Input
                              value={hotel.room_type || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.hotels];
                                updated[index].room_type = e.target.value;
                                setParsedData({ ...parsedData, hotels: updated });
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Regime de Refeição:
                            </label>
                            <Input
                              value={hotel.meal_plan || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.hotels];
                                updated[index].meal_plan = e.target.value;
                                setParsedData({ ...parsedData, hotels: updated });
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA 5: TRANSFERS & PASSEIOS */}
              {activeReviewTab === "transfers" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-foreground block">
                      Transfers & Receptivos ({parsedData.transfers?.length || 0})
                    </span>
                    {(parsedData.transfers || []).map((trf, index) => (
                      <div key={index} className="p-3 rounded-xl bg-card border border-border space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Receptivo / Fornecedor:
                            </label>
                            <Input
                              value={trf.supplier || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.transfers];
                                updated[index].supplier = e.target.value;
                                setParsedData({ ...parsedData, transfers: updated });
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Trecho:
                            </label>
                            <Input
                              value={`${trf.origin || ""} ➔ ${trf.destination || ""}`}
                              onChange={(e) => {
                                const updated = [...parsedData.transfers];
                                const parts = e.target.value.split("➔");
                                updated[index].origin = parts[0]?.trim();
                                updated[index].destination = parts[1]?.trim();
                                setParsedData({ ...parsedData, transfers: updated });
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                              Plantão Receptivo 24h:
                            </label>
                            <Input
                              value={trf.emergency_phone || ""}
                              onChange={(e) => {
                                const updated = [...parsedData.transfers];
                                updated[index].emergency_phone = e.target.value;
                                setParsedData({ ...parsedData, transfers: updated });
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Seguro Viagem */}
                  <div className="p-3.5 rounded-xl bg-card border border-border space-y-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">Seguro Viagem & Assistência</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          Seguradora:
                        </label>
                        <Input
                          value={parsedData.insurance?.provider || ""}
                          onChange={(e) =>
                            setParsedData({
                              ...parsedData,
                              insurance: { ...parsedData.insurance, provider: e.target.value },
                            })
                          }
                          className="text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          Nº da Apólice:
                        </label>
                        <Input
                          value={parsedData.insurance?.policy_number || ""}
                          onChange={(e) =>
                            setParsedData({
                              ...parsedData,
                              insurance: { ...parsedData.insurance, policy_number: e.target.value },
                            })
                          }
                          className="text-xs h-8 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          Central Médica 24h:
                        </label>
                        <Input
                          value={parsedData.insurance?.emergency_phone || ""}
                          onChange={(e) =>
                            setParsedData({
                              ...parsedData,
                              insurance: { ...parsedData.insurance, emergency_phone: e.target.value },
                            })
                          }
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 6: FINANCEIRO & REGRAS TARIFÁRIAS */}
              {activeReviewTab === "financeiro" && (
                <div className="space-y-4">
                  {/* Dados de Pagamento */}
                  <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="size-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">Forma de Pagamento & Parcelas</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          Valor Total (R$):
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={
                            parsedData.financial_details?.total_amount_cents
                              ? (parsedData.financial_details.total_amount_cents / 100).toFixed(2)
                              : ""
                          }
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setParsedData({
                              ...parsedData,
                              financial_details: {
                                ...parsedData.financial_details,
                                total_amount_cents: Math.round(val * 100),
                              },
                            });
                          }}
                          className="text-xs h-8 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          Forma de Pagamento:
                        </label>
                        <Input
                          value={parsedData.financial_details?.payment_method || ""}
                          onChange={(e) =>
                            setParsedData({
                              ...parsedData,
                              financial_details: {
                                ...parsedData.financial_details,
                                payment_method: e.target.value,
                              },
                            })
                          }
                          placeholder="Ex: Cartão 10x sem juros"
                          className="text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          Quantidade de Parcelas:
                        </label>
                        <Input
                          type="number"
                          value={parsedData.financial_details?.installments_count || 1}
                          onChange={(e) =>
                            setParsedData({
                              ...parsedData,
                              financial_details: {
                                ...parsedData.financial_details,
                                installments_count: parseInt(e.target.value) || 1,
                              },
                            })
                          }
                          className="text-xs h-8 font-mono"
                        />
                      </div>
                    </div>

                    {/* Recibo / Observação de Quitação */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                        Dados do Recibo / Fatura:
                      </label>
                      <Input
                        value={parsedData.financial_details?.receipt_info || ""}
                        onChange={(e) =>
                          setParsedData({
                            ...parsedData,
                            financial_details: {
                              ...parsedData.financial_details,
                              receipt_info: e.target.value,
                            },
                          })
                        }
                        placeholder="Nº do Recibo ou status faturado junto à operadora"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  {/* Regras Tarifárias & Políticas de Cancelamento */}
                  <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="size-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">Regras Tarifárias & Cancelamento</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          Prazo Limite para Cancelamento sem Multa:
                        </label>
                        <Input
                          type="date"
                          value={parsedData.tariff_rules?.cancellation_deadline || ""}
                          onChange={(e) =>
                            setParsedData({
                              ...parsedData,
                              tariff_rules: {
                                ...parsedData.tariff_rules,
                                cancellation_deadline: e.target.value,
                              },
                            })
                          }
                          className="text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                          Regras de Bagagem Inclusa:
                        </label>
                        <Input
                          value={parsedData.tariff_rules?.baggage_rules || ""}
                          onChange={(e) =>
                            setParsedData({
                              ...parsedData,
                              tariff_rules: {
                                ...parsedData.tariff_rules,
                                baggage_rules: e.target.value,
                              },
                            })
                          }
                          placeholder="Ex: 1x 23kg por pessoa"
                          className="text-xs h-8"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">
                        Política de Multas / No-Show:
                      </label>
                      <Textarea
                        rows={2}
                        value={parsedData.tariff_rules?.cancellation_penalty || ""}
                        onChange={(e) =>
                          setParsedData({
                            ...parsedData,
                            tariff_rules: {
                              ...parsedData.tariff_rules,
                              cancellation_penalty: e.target.value,
                            },
                          })
                        }
                        placeholder="Ex: Cancelamento com mais de 30 dias de antecedência sem ônus. Após essa data, retenção de 20%..."
                        className="text-xs rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASSO 3: CONCLUSÃO & VOUCHER GERADO */}
          {step === "done" && (
            <div className="text-center py-8 space-y-4">
              <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Sincronização Concluída com Sucesso!</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  A viagem foi atualizada com o roteiro consolidado, passageiros com validades de documento verificadas e o voucher oficial emitido.
                </p>
              </div>

              {createdVoucherUrl && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border max-w-md mx-auto space-y-3 text-left">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">Link Público do Voucher:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${createdVoucherUrl}`);
                        toast.success("Link copiado para a área de transferência!");
                      }}
                      className="text-primary hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Copy className="size-3" /> Copiar Link
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border border-border text-xs font-mono truncate text-foreground select-all">
                    {`${window.location.origin}${createdVoucherUrl}`}
                  </div>
                  <Button asChild className="w-full h-9 text-xs font-bold">
                    <a href={createdVoucherUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5 mr-1.5" /> Abrir Voucher do Passageiro
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER COM AÇÕES ── */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between">
          {step === "input" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
                Cancelar
              </Button>
              <Button
                onClick={handleRunOCR}
                disabled={isAnalyzing || (documents.length === 0 && !rawText.trim())}
                className="text-xs font-bold gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Processando OCR ({documents.length} arq)...
                  </>
                ) : (
                  <>
                    <FileText className="size-3.5" /> Extrair com IA Multimodal
                  </>
                )}
              </Button>
            </>
          )}

          {step === "review" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep("input")} className="text-xs">
                Voltar aos Arquivos
              </Button>
              <Button
                onClick={handleApplyToTrip}
                disabled={isApplying}
                className="text-xs font-bold bg-primary text-primary-foreground gap-2"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Sincronizando Viagem...
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" /> Confirmar & Sincronizar Viagem
                  </>
                )}
              </Button>
            </>
          )}

          {step === "done" && (
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full text-xs font-bold"
            >
              Concluir e Voltar
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
