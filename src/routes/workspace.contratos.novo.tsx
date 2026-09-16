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
import { ContractVariablePicker } from "@/components/contracts/contract-variable-picker";

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
    title: "Turismo & Viagens — Pacote Turístico",
    category: "tourism_package",
    description: "Pacotes de viagem, hospedagem, aéreo e passeios com cláusulas Cadastur/Embratur.",
    content: `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS TURÍSTICOS

**CONTRATADA (AGÊNCIA):** Agência de Viagens Credenciada Cadastur.
**CONTRATANTE / VIAJANTE:** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DO DESTINO E SERVIÇOS INCLUSOS
O presente instrumento tem por objeto a intermediação e prestação dos serviços turísticos descritos na proposta de viagem:
* **Destino & Hospedagem:** {{destino_hotel}}
* **Período da Viagem:** {{periodo_viagem}}
* **Quantidade de Passageiros:** {{quantidade_passageiros}}
* **Regime de Alimentação:** {{regime_alimentar}}

### CLÁUSULA 2ª — DO VALOR TOTAL E PARCELAMENTO
Pelo pacote adquirido, o CONTRATANTE pagará à CONTRATADA o valor total de **{{valor_total}}**, distribuído em **{{quantidade_parcelas}}**.
Vencimento da 1ª parcela: {{data_vencimento}}.

### CLÁUSULA 3ª — DAS REGRAS DE CANCELAMENTO E REEMBOLSO
{{politica_cancelamento_turismo}}

As solicitações de desistência ou alteração obedecerão às diretrizes normativas da EMBRATUR e Código de Defesa do Consumidor.

### ELEIÇÃO DE FORO
As partes elegem o foro da comarca da sede da CONTRATADA para dirimir qualquer controvérsia decorrente deste contrato.`,
  },
  real_estate_rental: {
    title: "Imóveis & Temporada — Locação Residencial/Comercial",
    category: "real_estate_rental",
    description: "Locação de imóveis e temporada regida pela Lei do Inquilinato (Lei 8.245/91).",
    content: `# CONTRATO DE LOCAÇÃO DE IMÓVEL

**LOCADOR:** Proprietário / Administradora Imobiliária Parceira Waesy.
**LOCATÁRIO:** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DO IMÓVEL E DESTINAÇÃO
O imóvel objeto deste contrato situa-se no endereço:
* **Endereço do Imóvel:** {{imovel_endereco}}
* **Tipo do Imóvel:** {{tipo_imovel}}
* **Finalidade da Locação:** {{finalidade_locacao}}

### CLÁUSULA 2ª — DO VALOR DO ALUGUEL E GARANTIA
O aluguel mensal é ajustado no valor de **{{valor_total}}**, com vencimento estipulado para todo dia **{{dia_vencimento_aluguel}}** de cada mês.
* **Garantia / Caução:** {{valor_caucao}}
* **Prazo de Locação:** {{prazo_locacao_meses}}

### CLÁUSULA 3ª — DA VISTORIA E CONSERVAÇÃO
O LOCATÁRIO compromete-se a restituir o imóvel em perfeito estado de conservação, conforme laudo de vistoria inicial assinado entre as partes.`,
  },
  vehicle_sale: {
    title: "Veículos & Frota — Compra e Venda Automotiva",
    category: "vehicle_sale",
    description: "Transferência de veículo automotor, quitação e responsabilidade sobre infrações.",
    content: `# CONTRATO DE COMPRA E VENDA DE VEÍCULO AUTOMOTOR

**VENDEDOR:** Revenda / Proprietário do Veículo.
**COMPRADOR:** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DO VEÍCULO OBJETO DA NEGOCIAÇÃO
O VENDEDOR aliena ao COMPRADOR o veículo automotor com as seguintes especificações:
* **Marca & Modelo:** {{marca_modelo_veiculo}}
* **Placa do Veículo:** {{placa_veiculo}}
* **Ano / Fabricação:** {{ano_fabricacao}}
* **Chassi:** {{chassi_veiculo}}
* **Renavam:** {{renavam}}
* **Quilometragem Registrada:** {{quilometragem_atual}}

### CLÁUSULA 2ª — DO PREÇO E CONDIÇÕES DE PAGAMENTO
O preço total da transação é de **{{valor_total}}**, quitado em **{{quantidade_parcelas}}**, com 1º vencimento em {{data_vencimento}}.

### CLÁUSULA 3ª — DA TRANSFERÊNCIA E RESPONSABILIDADE CIVIL
O VENDEDOR responde pelas infrações de trânsito até esta data, passando toda a responsabilidade civil, administrativa e penal ao COMPRADOR a partir da entrega do veículo.`,
  },
  fashion_retail: {
    title: "Moda & Varejo — Mala Condicional / Prova em Casa",
    category: "fashion_retail",
    description: "Termo de responsabilidade e custódia temporária de peças para prova domiciliar.",
    content: `# TERMO DE RESPONSABILIDADE & MALA CONDICIONAL

**LOJA CEDENTE:** Loja de Moda & Vestuário Parceira Waesy.
**CLIENTE / CONSIGNATÁRIA:** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DAS PEÇAS ENTREGUES EM CONDICIONAL
A LOJA cede em caráter condicional de prova e apreciação os itens sob a guarda temporária da CLIENTE:
* **Código da Mala / Sacola:** {{sacola_codigo}}
* **Quantidade Total de Peças:** {{quantidade_pecas}}
* **Data Limite para Devolução:** {{data_devolucao_condicional}}

**Relação das Peças Sob Custódia:**
{{tabela_itens}}

### CLÁUSULA 2ª — DO VALOR TOTAL E CONVERSÃO EM VENDA
O valor global das peças sob responsabilidade é de **{{valor_total}}**. As peças que não forem restituídas à loja até a data de {{data_devolucao_condicional}} serão convertidas em compra faturada e cobradas pelo meio acordado.

### CLÁUSULA 3ª — DA CUSTÓDIA E CONSERVAÇÃO
{{termo_responsabilidade_condicional}}`,
  },
  pos_retail: {
    title: "Balcão PDV — Venda Presencial & Carnê",
    category: "pos_retail",
    description: "Confissão de dívida para vendas balcão com pagamento a prazo / carnê de loja.",
    content: `# CONTRATO DE COMPRA BALCÃO & CARNÊ DE PAGAMENTO

**ESTABELECIMENTO CREDOR:** Estabelecimento Comercial Parceiro Waesy.
**CLIENTE DEVEDOR(A):** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DOS PRODUTOS ADQUIRIDOS
O COMPRADOR confessa ter adquirido e recebido em perfeitas condições as seguintes mercadorias:
{{tabela_itens}}

### CLÁUSULA 2ª — DO VALOR TOTAL E PARCELAMENTO EM CARNÊ
O valor total da compra é de **{{valor_total}}**, parcelado em **{{quantidade_parcelas}}**.
* **Primeiro Vencimento:** {{data_vencimento}}
* Em caso de atraso superior a 5 dias, incidirá multa contratual de 2% e juros moratórios de 1% ao mês.

### CLÁUSULA 3ª — DA FORÇA EXECUTIVA
O presente documento constitui título executivo extrajudicial na forma do Art. 784, inciso III do Código de Processo Civil.`,
  },
  legal_retainer: {
    title: "Jurídico & Advocacia — Honorários Advocatícios",
    category: "legal_retainer",
    description: "Contrato de prestação de serviços jurídicos e honorários contratuais e sucumbenciais.",
    content: `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

**CONTRATADO:** Sociedade de Advogados / Advogado(a) OAB.
**CONTRATANTE:** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DO OBJETO E PATROCÍNIO DA CAUSA
O CONTRATADO obriga-se a prestar assistência jurídica e defesa dos interesses da CONTRATANTE no âmbito do:
* **Número do Processo / Procedimento:** {{numero_processo}}
* **Vara / Comarca de Tramitação:** {{vara_comarca}}

### CLÁUSULA 2ª — DOS HONORÁRIOS ADVOCATÍCIOS
Pelos serviços pactuados, a CONTRATANTE pagará ao CONTRATADO:
* **Honorários Iniciais:** {{honorarios_iniciais}}
* **Percentual de Êxito:** {{percentual_exito}}
* **Vencimento Inicial:** {{data_vencimento}}

### CLÁUSULA 3ª — DA INDEPENDÊNCIA TÉCNICA E PRESTAÇÃO DE CONTAS
A prestação dos serviços é de meio e não de resultado, comprometendo-se o advogado a zelar pelo melhor direito e prestar contas periódicas.`,
  },
  service_agreement: {
    title: "Serviços Gerais — Prestação Técnica & Freelancer",
    category: "service_agreement",
    description: "Prestação de serviços técnicos, escopo, entregáveis e prazos.",
    content: `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS

**CONTRATADO:** Prestador(a) Especializado(a).
**CONTRATANTE:** {{cliente_nome}}, portador(a) do CPF/CNPJ {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DO ESCOPO E ENTREGÁVEIS
Constitui objeto deste contrato a realização especializada das seguintes atividades:
* **Escopo Detalhado:** {{escopo_servico}}
* **Prazo de Conclusão / Entrega:** {{prazo_entrega}}

### CLÁUSULA 2ª — DO PREÇO E FORMA DE PAGAMENTO
Pela execução dos trabalhos, o CONTRATANTE pagará o valor de **{{valor_total}}**, em **{{quantidade_parcelas}}**, com vencimento inicial em {{data_vencimento}}.

### CLÁUSULA 3ª — DA RESCISÃO E MULTA COMPENSATÓRIA
{{multa_rescisoria}}`,
  },
  medical_aesthetic_consent: {
    title: "Saúde & Estética — Termo de Consentimento Informado",
    category: "medical_aesthetic_consent",
    description: "Termo de consentimento e responsabilidade para clínicas, odontologia e estética.",
    content: `# TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO & PROCEDIMENTOS ESTÉTICOS

**PROFISSIONAL / CLÍNICA:** Clínica Especializada Waesy Saúde & Estética.
**PACIENTE / CLIENTE:** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DO PROCEDIMENTO AUTORIZADO
O(A) PACIENTE declara haver solicitado e expressamente autorizado a realização do procedimento:
* **Procedimento:** {{procedimento_estetico}}

### CLÁUSULA 2ª — DO HISTÓRICO DE SAÚDE E RESTRIÇÕES
* **Declaração de Alergias e Restrições Médicas:** {{restricoes_medicas}}
* **Termo de Consentimento:** {{termo_consentimento_saude}}

### CLÁUSULA 3ª — DAS RECOMENDAÇÕES PÓS-PROCEDIMENTO
O(A) PACIENTE declara estar plenamente ciente das recomendações e condutas indispensáveis para a recuperação e eficácia do procedimento realizado.`,
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

  // Inserção inteligente de variáveis na minuta
  const handleInsertVariable = (token: string) => {
    const textarea = document.getElementById("novo-contrato-textarea") as HTMLTextAreaElement | null;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const current = contentMarkdown;
      const updated = current.substring(0, start) + token + current.substring(end);
      setContentMarkdown(updated);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + token.length, start + token.length);
      }, 50);
    } else {
      setContentMarkdown((prev) => prev + " " + token);
    }
  };

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
            <h2 className="text-sm font-bold text-foreground">Quem vai assinar</h2>

            {/* Alternador Sem Ordem / Em Sequência */}
            <div className="flex items-center p-1 bg-muted/80 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setSigningOrder("parallel")}
                className={`px-3 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                  signingOrder === "parallel"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Ao mesmo tempo
              </button>
              <button
                type="button"
                onClick={() => setSigningOrder("sequential")}
                className={`px-3 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                  signingOrder === "sequential"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Em sequência
              </button>
            </div>
          </div>

          {/* Autopreenchimento com Foto do Documento */}
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-primary">
                <ScanLine className="size-4.5" />
                <span>Preencher com Foto do Documento</span>
              </div>
              <Badge variant="outline" className="text-xs border-primary/30 text-primary font-medium">
                RG · CNH · Passaporte
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tire foto ou envie o arquivo do documento do cliente para preencher nome e CPF na hora, sem digitação.
            </p>
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border/80 text-xs sm:text-sm font-semibold text-foreground cursor-pointer hover:bg-muted transition-all shadow-2xs">
              {isProcessingOcr ? (
                <>
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span>Lendo dados do documento...</span>
                </>
              ) : (
                <>
                  <Upload className="size-4 text-primary" />
                  <span>Carregar Foto do Documento</span>
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
                className="p-4 rounded-2xl border border-border/80 bg-card space-y-3 relative shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full shrink-0"
                      style={{ backgroundColor: signer.colorCode }}
                    />
                    <span className="font-bold text-foreground">Signatário {index + 1}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Select
                      value={signer.dispatchChannel}
                      onValueChange={(v: any) => updateSigner(index, "dispatchChannel", v)}
                    >
                      <SelectTrigger className="h-8 text-xs font-semibold rounded-xl border-border/70">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl text-xs">
                        <SelectItem value="whatsapp">Enviar no WhatsApp</SelectItem>
                        <SelectItem value="email">Enviar por E-mail</SelectItem>
                        <SelectItem value="direct_link">Copiar Link Direto</SelectItem>
                        <SelectItem value="sms">Enviar por SMS</SelectItem>
                      </SelectContent>
                    </Select>

                    <button
                      type="button"
                      onClick={() => removeSigner(index)}
                      className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                      title="Remover signatário"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Input
                    placeholder="Nome completo de quem vai assinar"
                    value={signer.name}
                    onChange={(e) => updateSigner(index, "name", e.target.value)}
                    className="h-10 text-xs sm:text-sm rounded-xl"
                  />

                  <Input
                    placeholder={
                      signer.dispatchChannel === "whatsapp" || signer.dispatchChannel === "sms"
                        ? "Celular com DDD (ex: 49 99999-9999)"
                        : "E-mail de quem vai assinar"
                    }
                    value={signer.contact}
                    onChange={(e) => updateSigner(index, "contact", e.target.value)}
                    className="h-10 text-xs sm:text-sm rounded-xl"
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
                    onClick={() => {
                      handleSelectTemplate(key);
                      setActiveTab("whatsapp");
                    }}
                    className={`p-4 rounded-xl border text-left space-y-2 transition-all cursor-pointer ${
                      category === t.category
                        ? "bg-primary/5 border-primary/60 ring-2 ring-primary/20 shadow-xs"
                        : "bg-card border-border/70 hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-foreground truncate">{t.title}</p>
                      <Badge variant="secondary" className="text-[10px] shrink-0 font-medium">
                        Usar Modelo
                      </Badge>
                    </div>
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

              {/* Seletor de Variáveis Semânticas Dinâmicas por Nicho */}
              <ContractVariablePicker
                onInsertVariable={handleInsertVariable}
                defaultNiche="turismo"
                className="mb-2"
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Texto Principal do Contrato</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Variáveis como <code className="font-mono text-primary text-[10px]">&#123;&#123;cliente_nome&#125;&#125;</code> são preenchidas automaticamente.
                  </p>
                </div>

                <Textarea
                  id="novo-contrato-textarea"
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
