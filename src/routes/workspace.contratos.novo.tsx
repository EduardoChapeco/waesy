import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  FileText,
  Upload,
  Layers,
  Smartphone,
  Monitor,
  UserPlus,
  Trash2,
  ScanLine,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Plus,
  Sparkles,
  Loader2,
  FileCheck,
  Lock,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createContract,
  extractContractDataFromOcr,
  type ContractCategoryEnum,
} from "@/services/contracts.functions";

export const Route = createFileRoute("/workspace/contratos/novo")({
  head: () => ({ meta: [{ title: "Criar Novo Contrato | Workspace Waesy" }] }),
  component: NovoContratoPage,
});

interface SignerDraft {
  name: string;
  contact: string;
  dispatchChannel: "email" | "whatsapp" | "sms" | "direct_link";
  role: "party" | "witness" | "guarantor";
  cpf?: string;
  requireFacialBiometrics: boolean;
  colorCode: string;
}

const SIGNER_COLORS = ["#2563eb", "#9333ea", "#059669", "#ea580c", "#dc2626"];

const NICHE_TEMPLATES: Record<string, { title: string; category: string; description: string; content: string }> = {
  tourism_package: {
    title: "Contrato de Prestação de Serviços Turísticos",
    category: "tourism_package",
    description: "Pacotes de viagem, hospedagem, aéreo e passeios com cláusulas canônicas Embratur.",
    content: `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TURISMO

**CONTRATADA (AGÊNCIA):** Agência de Turismo Credenciada Cadastur.
**CONTRATANTE / VIAJANTE:** {{cliente_nome}}, portador(a) do CPF {{cpf}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DO OBJETO DO CONTRATO
O presente instrumento tem por objeto a intermediação e prestação dos serviços turísticos especificados na proposta de viagem, compreendendo transporte aéreo/rodoviário, hospedagem com regime acordado e assessoria receptiva.

### CLÁUSULA 2ª — DO VALOR E CONDIÇÕES DE PAGAMENTO
Pelo pacote adquirido, o CONTRATANTE pagará à CONTRATADA o valor total ajustado conforme cronograma de parcelamento e confirmação bancária.

### CLÁUSULA 3ª — DAS REGRAS DE CANCELAMENTO E REEMBOLSO
As solicitações de desistência ou alteração obedecerão às diretrizes normativas da EMBRATUR e Código de Defesa do Consumidor, com retenção exclusiva de custos operacionais devidamente comprovados.

### ELEIÇÃO DE FORO
As partes elegem o foro da comarca da sede da CONTRATADA para dirimir qualquer controvérsia decorrente deste contrato.`,
  },
  real_estate_rental: {
    title: "Contrato de Locação Residencial / Comercial",
    category: "real_estate_rental",
    description: "Locação de imóveis com regras da Lei do Inquilinato (Lei 8.245/91).",
    content: `# CONTRATO DE LOCAÇÃO DE IMÓVEL

**LOCADOR:** [Nome do Proprietário], CPF/CNPJ [Número].
**LOCATÁRIO:** {{cliente_nome}}, CPF {{cpf}}.

### CLÁUSULA 1ª — DO IMÓVEL E DESTINAÇÃO
O imóvel objeto deste contrato destina-se estritamente à finalidade ajustada, com entrega das chaves mediante laudo de vistoria inicial.

### CLÁUSULA 2ª — DO VALOR E REAJUSTE
O aluguel mensal inicial é devido no dia 10 de cada mês, reajustado anualmente pelo índice IPCA/IBGE.`,
  },
  vehicle_sale: {
    title: "Contrato de Compra e Venda de Veículo",
    category: "vehicle_sale",
    description: "Transferência de veículo automotor, quitação e responsabilidade sobre infrações.",
    content: `# CONTRATO DE COMPRA E VENDA DE VEÍCULO AUTOMOTOR

**VENDEDOR:** [Nome do Vendedor], CPF/CNPJ [Número].
**COMPRADOR:** {{cliente_nome}}, CPF {{cpf}}.

### CLÁUSULA 1ª — DO VEÍCULO ALIENADO
O Vendedor aliena ao Comprador o veículo em perfeitas condições mecânicas e com documentação livre de ônus ou multas até esta data.`,
  },
  service_agreement: {
    title: "Contrato de Prestação de Serviços Profissionais",
    category: "service_agreement",
    description: "Prestação de serviços técnicos, escopo, entregáveis e prazos.",
    content: `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS

**CONTRATANTE:** {{cliente_nome}}, CPF/CNPJ {{cpf}}.
**CONTRATADO:** [Nome da Empresa Prestadora], CNPJ [Número].

### CLÁUSULA 1ª — DO ESCOPO E ENTREGAS
Constitui objeto deste contrato a execução especializada dos serviços acordados em proposta técnica anexa.`,
  },
};

function NovoContratoPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"upload" | "templates" | "whatsapp">("whatsapp");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configuração do Contrato
  const [title, setTitle] = useState("Contrato Comercial de Serviços");
  const [category, setCategory] = useState<string>("tourism_package");
  const [contentMarkdown, setContentMarkdown] = useState(NICHE_TEMPLATES.tourism_package.content);
  const [signingOrder, setSigningOrder] = useState<"parallel" | "sequential">("parallel");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Signatários
  const [signers, setSigners] = useState<SignerDraft[]>([
    {
      name: "",
      contact: "",
      dispatchChannel: "whatsapp",
      role: "party",
      cpf: "",
      requireFacialBiometrics: false,
      colorCode: SIGNER_COLORS[0],
    },
  ]);

  // Modo de Prévia na aba WhatsApp (Mobile vs Desktop)
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");

  // Estado de OCR
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);

  const addSigner = () => {
    const nextIndex = signers.length;
    setSigners([
      ...signers,
      {
        name: "",
        contact: "",
        dispatchChannel: "whatsapp",
        role: "party",
        cpf: "",
        requireFacialBiometrics: false,
        colorCode: SIGNER_COLORS[nextIndex % SIGNER_COLORS.length],
      },
    ]);
  };

  const removeSigner = (index: number) => {
    if (signers.length <= 1) {
      toast.error("O contrato precisa de pelo menos 1 signatário.");
      return;
    }
    setSigners(signers.filter((_, i) => i !== index));
  };

  const updateSigner = (index: number, field: keyof SignerDraft, value: any) => {
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: value };
    setSigners(updated);
  };

  // OCR de Documentos (Passaporte / RG / CNH)
  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingOcr(true);
    toast.info("Lendo documento via Inteligência Visual...");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        try {
          const extracted = await extractContractDataFromOcr({
            data: {
              base64: base64Data,
              mimeType: file.type || "image/jpeg",
            },
          });

          if (extracted.name || extracted.document) {
            toast.success(`Dados identificados: ${extracted.name || "Titular"}`);

            // Preenche o primeiro signatário ou adiciona um novo
            const updated = [...signers];
            if (updated[0] && !updated[0].name) {
              updated[0].name = extracted.name || "";
              updated[0].cpf = extracted.document || "";
            } else {
              updated.push({
                name: extracted.name || "Signatário Extraído",
                contact: "",
                dispatchChannel: "whatsapp",
                role: "party",
                cpf: extracted.document || "",
                requireFacialBiometrics: false,
                colorCode: SIGNER_COLORS[updated.length % SIGNER_COLORS.length],
              });
            }
            setSigners(updated);

            // Substitui variáveis no texto
            if (extracted.name) {
              setContentMarkdown((prev) =>
                prev.replace(/\{\{cliente_nome\}\}/g, extracted.name || "[Nome]").replace(/\{\{cpf\}\}/g, extracted.document || "[CPF]"),
              );
            }
          } else {
            toast.warning("Não foi possível identificar todos os dados. Preencha manualmente.");
          }
        } catch (err: any) {
          toast.error(err?.message || "Falha no reconhecimento do documento.");
        } finally {
          setIsProcessingOcr(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsProcessingOcr(false);
      toast.error("Erro ao ler arquivo.");
    }
  };

  const handleSelectTemplate = (key: string) => {
    const template = NICHE_TEMPLATES[key];
    if (!template) return;
    setTitle(template.title);
    setCategory(template.category);
    setContentMarkdown(template.content);
    toast.success(`Minuta de ${template.title} carregada!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Informe o título do documento.");
      return;
    }

    if (signers.some((s) => !s.name.trim())) {
      toast.error("Preencha o nome de todos os signatários.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { contract } = await createContract({
        data: {
          title,
          category: category as any,
          contentMarkdown,
          isWhatsappNative: activeTab === "whatsapp",
          dispatchSettings: {
            signing_order: signingOrder,
            send_reminders: true,
            reminder_days: 3,
            auth_mark_position: "footer",
            auth_mark_size: "standard",
            force_signature_appearance: false,
            delivery_channels: Array.from(new Set(signers.map((s) => s.dispatchChannel))),
          },
        },
      });

      toast.success("Documento criado! Posicione as assinaturas no próximo passo.");
      navigate({ to: `/workspace/contratos/${contract.id}/editor` });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar contrato.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Topo do Fluxo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Novo Contrato Digital</h1>
          <p className="text-xs text-muted-foreground">
            Criação de minutas, importação de arquivos e despacho com validade jurídica
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-10 px-4">
            <Link to="/workspace/contratos">Voltar</Link>
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl text-xs h-10 px-6 font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Criando...
              </>
            ) : (
              <>
                Avançar para Posicionamento
                <ArrowRight className="size-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grid Principal: Painel de Signatários à Esquerda & Editor/Arquivo à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Painel Esquerdo: Informe os Signatários (Screenshots 4 & 5) */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-5 space-y-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Informe os signatários</h2>

            {/* Alternador Sem Ordem / Com Ordem */}
            <div className="flex items-center p-1 bg-muted rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setSigningOrder("parallel")}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                  signingOrder === "parallel"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sem ordem
              </button>
              <button
                type="button"
                onClick={() => setSigningOrder("sequential")}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                  signingOrder === "sequential"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Com ordem
              </button>
            </div>
          </div>

          {/* Autopreenchimento por OCR Inteligente */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <ScanLine className="size-4" />
                <span>Preenchimento Inteligente via OCR</span>
              </div>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                Passaporte · RG · CNH
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tire foto ou envie o arquivo do documento do cliente para preencher nome, CPF e cláusulas sem digitação manual.
            </p>
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium text-foreground cursor-pointer hover:bg-muted transition-all">
              {isProcessingOcr ? (
                <>
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  Lendo documento...
                </>
              ) : (
                <>
                  <Upload className="size-3.5 text-primary" />
                  Carregar Foto do Documento
                </>
              )}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={isProcessingOcr}
                onChange={handleOcrUpload}
              />
            </label>
          </div>

          {/* Lista de Signatários */}
          <div className="space-y-3.5">
            {signers.map((signer, index) => (
              <div
                key={index}
                className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3 relative group"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: signer.colorCode }}
                    />
                    <span className="font-semibold text-foreground">Signatário {index + 1}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Select
                      value={signer.dispatchChannel}
                      onValueChange={(v: any) => updateSigner(index, "dispatchChannel", v)}
                    >
                      <SelectTrigger className="h-7 text-[11px] rounded-lg border-border/70">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl text-xs">
                        <SelectItem value="whatsapp">WhatsApp (+55)</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="direct_link">Link Direto</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>

                    <button
                      type="button"
                      onClick={() => removeSigner(index)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Nome completo do signatário"
                    value={signer.name}
                    onChange={(e) => updateSigner(index, "name", e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />

                  <Input
                    placeholder={
                      signer.dispatchChannel === "whatsapp" || signer.dispatchChannel === "sms"
                        ? "DDD + Celular (ex: 49 99999-9999)"
                        : "E-mail do signatário"
                    }
                    value={signer.contact}
                    onChange={(e) => updateSigner(index, "contact", e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Input
                      placeholder="CPF (Opcional)"
                      value={signer.cpf || ""}
                      onChange={(e) => updateSigner(index, "cpf", e.target.value)}
                      className="h-8 text-xs rounded-lg"
                    />

                    <Select
                      value={signer.role}
                      onValueChange={(v: any) => updateSigner(index, "role", v)}
                    >
                      <SelectTrigger className="h-8 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl text-xs">
                        <SelectItem value="party">Assinar</SelectItem>
                        <SelectItem value="witness">Testemunhar</SelectItem>
                        <SelectItem value="guarantor">Fiador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSigner}
              className="w-full h-10 rounded-xl text-xs font-semibold border-dashed"
            >
              <Plus className="size-3.5 mr-1.5" />
              Adicionar Signatário
            </Button>
          </div>
        </div>

        {/* Painel Direito: 3 Modos (Enviar Arquivo / Modelos / Documentos para WhatsApp) */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-5 space-y-5 shadow-2xs">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="grid grid-cols-3 w-full h-11 p-1 rounded-xl bg-muted/60">
              <TabsTrigger value="upload" className="rounded-lg text-xs font-medium">
                Enviar um arquivo
              </TabsTrigger>
              <TabsTrigger value="templates" className="rounded-lg text-xs font-medium">
                Modelos de documento
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="rounded-lg text-xs font-medium">
                Documentos para WhatsApp
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: Enviar Arquivo (Drag & Drop) */}
            <TabsContent value="upload" className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Título do Documento</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Contrato de Viagem - Odiceia"
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="border-2 border-dashed border-border/80 rounded-2xl p-8 text-center space-y-3 hover:border-primary/50 transition-all bg-muted/20">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Upload className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {uploadedFileName || "Arraste o documento aqui ou clique em Selecionar arquivo"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Suporta PDF, DOCX e imagens digitalizadas de contratos
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs h-9 px-4"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".pdf,.docx,image/*";
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadedFileName(file.name);
                        setTitle(file.name.replace(/\.[^/.]+$/, ""));
                        toast.success(`Arquivo ${file.name} carregado com sucesso!`);
                      }
                    };
                    input.click();
                  }}
                >
                  Selecionar arquivo
                </Button>
              </div>
            </TabsContent>

            {/* ABA 2: Modelos Canônicos por Nicho */}
            <TabsContent value="templates" className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(NICHE_TEMPLATES).map(([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectTemplate(key)}
                    className={`p-3.5 rounded-xl border text-left space-y-1.5 transition-all ${
                      category === t.category
                        ? "bg-primary/5 border-primary/50 ring-1 ring-primary/20"
                        : "bg-card border-border/70 hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <p className="text-xs font-bold text-foreground truncate">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  </button>
                ))}
              </div>
            </TabsContent>

            {/* ABA 3: Documentos para WhatsApp (Texto Otimizado Mobile / Desktop) */}
            <TabsContent value="whatsapp" className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Título do Documento</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Contrato de Viagem - Pacote Buenos Aires"
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Texto Principal do Contrato</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Formatação limpa adaptada para telas de smartphones
                  </p>
                </div>

                <Textarea
                  rows={12}
                  value={contentMarkdown}
                  onChange={(e) => setContentMarkdown(e.target.value)}
                  className="font-mono text-xs rounded-xl p-3.5 leading-relaxed resize-y"
                  placeholder="Digite as cláusulas do contrato..."
                />
              </div>

              {/* Barra de Prévia Mobile / Desktop (Screenshot 5) */}
              <div className="border border-border/70 rounded-xl p-3 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Prévia do Signatário:</span>
                  <div className="flex items-center gap-1 bg-card p-1 rounded-lg border border-border/60">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("mobile")}
                      className={`p-1.5 rounded-md transition-all ${
                        previewDevice === "mobile"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Prévia no Celular (390px)"
                    >
                      <Smartphone className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("desktop")}
                      className={`p-1.5 rounded-md transition-all ${
                        previewDevice === "desktop"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Prévia no Computador"
                    >
                      <Monitor className="size-4" />
                    </button>
                  </div>
                </div>

                <Badge variant="outline" className="text-[10px]">
                  {previewDevice === "mobile" ? "Modo Celular (Sem Pinch-Zoom)" : "Modo Desktop"}
                </Badge>
              </div>

              {/* Caixa de Prévia Renderizada */}
              <div
                className={`mx-auto rounded-2xl border border-border/80 bg-card p-4 text-xs space-y-3 shadow-xs transition-all ${
                  previewDevice === "mobile" ? "max-w-[390px]" : "w-full"
                }`}
              >
                <div className="border-b border-border/50 pb-2 text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                  <span>{title || "Sem título"}</span>
                  <span className="text-[10px] text-emerald-600">Leitura Limpa</span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 font-serif leading-relaxed text-xs">
                  <ReactMarkdown>{contentMarkdown}</ReactMarkdown>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
