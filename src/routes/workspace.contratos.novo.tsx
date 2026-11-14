import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Star,
  Loader2,
  FileCheck,
  Lock,
  Database,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import { ContractMarkdownRenderer } from "@/components/contracts/contract-markdown-renderer";

import { Page, Toolbar, Grid } from "@/components/layout";
import { Field, FieldGroup, FormRow } from "@/components/forms";
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
import { listLeads } from "@/services/crm.functions";
import { listQuotes, getQuoteDetail } from "@/services/quotes.functions";
import { listAgencyTravelProposals } from "@/services/travel-proposal.functions";
import { listCommercialInvoices, getCommercialInvoiceByPublicToken } from "@/services/commercial-invoices.functions";
import { getStoreSettings } from "@/services/store.functions";
import { compileContractDocument } from "@/lib/contracts/contract-compiler";
import { interpolateContractVariables } from "@/lib/contracts/contract-semantic-dictionary";
import { getNicheContractBlueprint, normalizeCustomFieldMap } from "@/lib/niches/unified-field-bridge";
import { ContractVariablePicker } from "@/components/contracts/contract-variable-picker";
import { MultimodalOcrUploader } from "@/components/documents/multimodal-ocr-uploader";
import type { UniversalOcrResult } from "@/services/multimodal-ocr.functions";
import {
  ADVANCED_CONTRACT_TEMPLATES,
  type ContractTemplateDefinition,
} from "@/lib/data/advanced-contract-templates";
import { formatMoney } from "@/lib/money";
import { maskCpfProgressive, formatPhone } from "@/lib/document-validator";
import { cn } from "@/lib/utils";

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
  colorClass: string;
}

const SIGNER_DOT_CLASSES = [
  "bg-primary",
  "bg-info",
  "bg-success",
  "bg-warning",
  "bg-destructive",
];

const NICHE_TEMPLATES: Record<
  string,
  { title: string; category: string; description: string; content: string }
> = {
  tourism_package: {
    title: "Turismo e Viagens — Pacote Turístico",
    category: "tourism_package",
    description: "Pacotes de viagem, hospedagem, aéreo e passeios com cláusulas Cadastur/Embratur.",
    content: `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS TURÍSTICOS

**CONTRATADA (AGÊNCIA):** {{agencia_nome}} ({{empresa_cnpj}})
**CONTRATANTE / VIAJANTE:** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — QUADRO RESUMO DO PACOTE E SERVIÇOS
| Especificação | Detalhe Contratado |
| :--- | :--- |
| Destino & Hospedagem | {{destino_hotel}} |
| Período da Viagem | {{periodo_viagem}} |
| Quantidade de Passageiros | {{quantidade_passageiros}} |
| Regime de Alimentação | {{regime_alimentar}} |

{{tabela_roteiro}}

{{tabela_passageiros}}

{{campos_personalizados_tabela}}

### CLÁUSULA 2ª — DO VALOR TOTAL E PARCELAMENTO
| Condição Financeira | Detalhe |
| :--- | :--- |
| Valor Total do Pacote | **{{valor_total}}** |
| Parcelamento / Forma | {{quantidade_parcelas}} |
| 1º Vencimento | {{data_vencimento}} |

{{tabela_parcelas}}

### CLÁUSULA 3ª — DAS REGRAS DE CANCELAMENTO E REEMBOLSO
{{politica_cancelamento_turismo}}

As solicitações de desistência ou alteração obedecerão às diretrizes normativas da EMBRATUR e Código de Defesa do Consumidor.

### ELEIÇÃO DE FORO
As partes elegem o foro da comarca da sede da CONTRATADA para dirimir qualquer controvérsia decorrente deste contrato.`,
  },
  real_estate_rental: {
    title: "Imóveis e Temporada — Locação Residencial/Comercial",
    category: "real_estate_rental",
    description: "Locação de imóveis e temporada regida pela Lei do Inquilinato (Lei 8.245/91).",
    content: `# CONTRATO DE LOCAÇÃO DE IMÓVEL

**LOCADOR:** {{locador_nome}}
**LOCATÁRIO:** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — ESPECIFICAÇÃO DO IMÓVEL
| Especificação do Imóvel | Informação |
| :--- | :--- |
| Endereço do Imóvel | {{imovel_endereco}} |
| Tipo do Imóvel | {{tipo_imovel}} |
| Finalidade da Locação | {{finalidade_locacao}} |

{{campos_personalizados_tabela}}

### CLÁUSULA 2ª — DO VALOR DO ALUGUEL E GARANTIA
| Condição Financeira | Informação |
| :--- | :--- |
| Aluguel Mensal | **{{valor_total}}** |
| Dia de Vencimento | Todo dia {{dia_vencimento_aluguel}} |
| Garantia / Caução | {{valor_caucao}} |
| Prazo de Locação | {{prazo_locacao_meses}} |

### CLÁUSULA 3ª — DA VISTORIA E CONSERVAÇÃO
O LOCATÁRIO compromete-se a restituir o imóvel em perfeito estado de conservação, conforme laudo de vistoria inicial assinado entre as partes.`,
  },
  vehicle_sale: {
    title: "Veículos e Frota — Compra e Venda Automotiva",
    category: "vehicle_sale",
    description: "Transferência de veículo automotor, quitação e responsabilidade sobre infrações.",
    content: `# CONTRATO DE COMPRA E VENDA DE VEÍCULO AUTOMOTOR

**VENDEDOR:** {{vendedor_nome}}
**COMPRADOR:** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — ESPECIFICAÇÕES TÉCNICAS DO VEÍCULO
| Atributo do Veículo | Detalhe Contratado |
| :--- | :--- |
| Marca & Modelo | {{marca_modelo_veiculo}} |
| Placa do Veículo | {{placa_veiculo}} |
| Ano / Fabricação | {{ano_fabricacao}} |
| Chassi | {{chassi_veiculo}} |
| Renavam | {{renavam}} |
| Quilometragem Registrada | {{quilometragem_atual}} |

{{campos_personalizados_tabela}}

### CLÁUSULA 2ª — DO PREÇO E CONDIÇÕES DE PAGAMENTO
| Condição Financeira | Detalhe |
| :--- | :--- |
| Preço Total | **{{valor_total}}** |
| Parcelamento | {{quantidade_parcelas}} |
| 1º Vencimento | {{data_vencimento}} |

{{tabela_parcelas}}

### CLÁUSULA 3ª — DA TRANSFERÊNCIA E RESPONSABILIDADE CIVIL
O VENDEDOR responde pelas infrações de trânsito até esta data, passando toda a responsabilidade civil, administrativa e penal ao COMPRADOR a partir da entrega do veículo.`,
  },
  fashion_retail: {
    title: "Moda e Varejo — Mala Condicional / Prova em Casa",
    category: "fashion_retail",
    description: "Termo de responsabilidade e custódia temporária de peças para prova domiciliar.",
    content: `# TERMO DE RESPONSABILIDADE & MALA CONDICIONAL

**LOJA CEDENTE:** {{empresa_nome}}
**CLIENTE / CONSIGNATÁRIA:** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DAS PEÇAS ENTREGUES EM CONDICIONAL
| Identificação da Remessa | Detalhe |
| :--- | :--- |
| Código da Mala / Sacola | {{sacola_codigo}} |
| Quantidade Total de Peças | {{quantidade_pecas}} |
| Data Limite para Devolução | {{data_devolucao_condicional}} |

**Relação das Peças Sob Custódia:**
{{tabela_itens}}

{{campos_personalizados_tabela}}

### CLÁUSULA 2ª — DO VALOR TOTAL E CONVERSÃO EM VENDA
O valor global das peças sob responsabilidade é de **{{valor_total}}**. As peças que não forem restituídas à loja até a data de {{data_devolucao_condicional}} serão convertidas em compra faturada e cobradas pelo meio acordado.

### CLÁUSULA 3ª — DA CUSTÓDIA E CONSERVAÇÃO
{{termo_responsabilidade_condicional}}`,
  },
  pos_retail: {
    title: "Balcão PDV — Venda Presencial e Carnê",
    category: "pos_retail",
    description: "Confissão de dívida para vendas balcão com pagamento a prazo / carnê de loja.",
    content: `# CONTRATO DE COMPRA BALCÃO & CARNÊ DE PAGAMENTO

**ESTABELECIMENTO CREDOR:** {{empresa_nome}} ({{empresa_cnpj}})
**CLIENTE DEVEDOR(A):** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DOS PRODUTOS ADQUIRIDOS
O COMPRADOR confessa ter adquirido e recebido em perfeitas condições as seguintes mercadorias:
{{tabela_itens}}

{{campos_personalizados_tabela}}

### CLÁUSULA 2ª — DO VALOR TOTAL E PARCELAMENTO EM CARNÊ
| Resumo do Carnê | Detalhe |
| :--- | :--- |
| Valor Total | **{{valor_total}}** |
| Parcelamento | {{quantidade_parcelas}} |
| Primeiro Vencimento | {{data_vencimento}} |

{{tabela_parcelas}}

Em caso de atraso superior a 5 dias, incidirá multa contratual de 2% e juros moratórios de 1% ao mês.

### CLÁUSULA 3ª — DA FORÇA EXECUTIVA
O presente documento constitui título executivo extrajudicial na forma do Art. 784, inciso III do Código de Processo Civil.`,
  },
  legal_retainer: {
    title: "Jurídico e Advocacia — Honorários Advocatícios",
    category: "legal_retainer",
    description: "Contrato de prestação de serviços jurídicos e honorários contratuais e sucumbenciais.",
    content: `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

**CONTRATADO:** {{contratado_nome}}
**CONTRATANTE:** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DO OBJETO E PATROCÍNIO DA CAUSA
| Dados Processuais | Detalhe |
| :--- | :--- |
| Processo / Procedimento | {{numero_processo}} |
| Vara / Comarca de Tramitação | {{vara_comarca}} |

{{campos_personalizados_tabela}}

### CLÁUSULA 2ª — DOS HONORÁRIOS ADVOCATÍCIOS
| Honorários Pactuados | Valor / Condição |
| :--- | :--- |
| Honorários Iniciais | {{honorarios_iniciais}} |
| Percentual de Êxito | {{percentual_exito}} |
| Vencimento Inicial | {{data_vencimento}} |

### CLÁUSULA 3ª — DA INDEPENDÊNCIA TÉCNICA E PRESTAÇÃO DE CONTAS
A prestação dos serviços é de meio e não de resultado, comprometendo-se o advogado a zelar pelo melhor direito e prestar contas periódicas.`,
  },
  service_agreement: {
    title: "Serviços Gerais — Prestação Técnica e Freelancer",
    category: "service_agreement",
    description: "Prestação de serviços técnicos, escopo, entregáveis e prazos.",
    content: `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS

**CONTRATADO:** {{contratado_nome}} ({{empresa_cnpj}})
**CONTRATANTE:** {{cliente_nome}}, portador(a) do CPF/CNPJ {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DO ESCOPO E ENTREGÁVEIS
| Escopo Técnico | Detalhe |
| :--- | :--- |
| Escopo Detalhado | {{escopo_servico}} |
| Prazo de Conclusão / Entrega | {{prazo_entrega}} |

{{tabela_itens}}

{{campos_personalizados_tabela}}

### CLÁUSULA 2ª — DO PREÇO E FORMA DE PAGAMENTO
Pela execução dos trabalhos, o CONTRATANTE pagará o valor de **{{valor_total}}**, em **{{quantidade_parcelas}}**, com vencimento inicial em {{data_vencimento}}.

{{tabela_parcelas}}

### CLÁUSULA 3ª — DA RESCISÃO E MULTA COMPENSATÓRIA
{{multa_rescisoria}}`,
  },
  medical_aesthetic_consent: {
    title: "Saúde e Estética — Termo de Consentimento Informado",
    category: "medical_aesthetic_consent",
    description: "Termo de consentimento e responsabilidade para clínicas, odontologia e estética.",
    content: `# TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO & PROCEDIMENTOS ESTÉTICOS

**PROFISSIONAL / CLÍNICA:** {{empresa_nome}}
**PACIENTE / CLIENTE:** {{cliente_nome}}, portador(a) do CPF {{cpf}}, telefone {{telefone}}, residente em {{endereco}}.

### CLÁUSULA 1ª — DO PROCEDIMENTO AUTORIZADO
| Ficha Clínica | Informação |
| :--- | :--- |
| Procedimento | {{procedimento_estetico}} |
| Alergias e Restrições | {{restricoes_medicas}} |

{{campos_personalizados_tabela}}

### CLÁUSULA 2ª — DO CONSENTIMENTO INFORMADO
{{termo_consentimento_saude}}

### CLÁUSULA 3ª — DAS RECOMENDAÇÕES PÓS-PROCEDIMENTO
O(A) PACIENTE declara estar plenamente ciente das recomendações e condutas indispensáveis para a recuperação e eficácia do procedimento realizado.`,
  },
  equipment_loan: {
    title: "Comodato de Equipamentos — Empréstimo Gratuito de Bens (WMS)",
    category: "equipment_loan",
    description: "Cessão gratuita de equipamentos comerciais, cervejeiras, freezers, máquinas e bens móveis com base no Art. 579 do Código Civil.",
    content: `# CONTRATO DE COMODATO DE EQUIPAMENTOS & BENS MÓVEIS

**COMODANTE (EMPRESA PROPRIETÁRIA):** {{empresa_nome}} ({{empresa_cnpj}})
**COMODATÁRIO(A):** {{cliente_nome}}, portador(a) do CPF/CNPJ {{cpf}}, telefone {{telefone}}, residente/sediado(a) em {{endereco}}.

### CLÁUSULA 1ª — DO OBJETO DO COMODATO
| Identificação Patrimonial | Detalhe |
| :--- | :--- |
| Equipamento / Bem | {{equipamento_nome}} |
| Marca e Modelo | {{marca_modelo_equipamento}} |
| Número de Série / Chassi | {{numero_serie}} |
| Código de Patrimônio (WMS) | {{patrimonio_codigo}} |
| Local de Instalação | {{local_instalacao}} |

{{campos_personalizados_tabela}}

### CLÁUSULA 2ª — DO VALOR DO BEM E DEVER DE INDENIZAÇÃO
O bem ora cedido possui avaliação estipulada em **{{valor_bem_indenizacao}}**. Em caso de perda, roubo, furto qualificado, danos decorrentes de imperícia ou não restituição ao término do contrato, o COMODATÁRIO indenizará integralmente a COMODANTE pelo valor de avaliação acima registrado.

### CLÁUSULA 3ª — DA VIGÊNCIA, CUSTÓDIA E RESTITUIÇÃO
1. O prazo de vigência deste comodato é de **{{prazo_vigencia_comodato}}**.
2. É expressamente vedado ao COMODATÁRIO emprestar, alugar, ceder a terceiros ou transferir o bem para endereço diverso do estabelecido neste instrumento sem prévia autorização escrita da COMODANTE.
3. Ao término do prazo ou rescisão da relação comercial, o bem deverá ser restituído imediatamente nas mesmas condições de conservação em que foi entregue, ressalvado o desgaste natural pelo uso regular (Art. 582 do Código Civil).

### ELEIÇÃO DE FORO
As partes elegem o foro da sede da COMODANTE para dirimir quaisquer litígios decorrentes do presente instrumento.`,
  },
};

function compileAdvancedTemplateMarkdown(t: ContractTemplateDefinition): string {
  let md = `# ${t.title.toUpperCase()}\n\n`;
  md += `> **Fundamentação Legal:** ${t.legal_framework}\n\n`;
  md += `**CONTRATANTE:** {{contratante_nome}}, portador(a) do CPF/CNPJ {{contratante_documento}}, residente/sediado(a) em {{contratante_endereco}}.\n`;
  md += `**CONTRATADO(A):** {{contratado_nome}}, portador(a) do CPF/CNPJ {{contratado_documento}}, residente/sediado(a) em {{contratado_endereco}}.\n\n`;
  md += `As partes acima qualificadas têm, entre si, justo e contratado o presente instrumento mediante as seguintes cláusulas e condições:\n\n`;

  t.clauses.forEach((c) => {
    md += `### ${c.title}\n${c.content}\n\n`;
  });

  return md;
}

const ADVANCED_TEMPLATES_MAP: Record<
  string,
  { title: string; category: string; description: string; content: string }
> = {};

ADVANCED_CONTRACT_TEMPLATES.forEach((item) => {
  ADVANCED_TEMPLATES_MAP[item.id] = {
    title: item.title,
    category: item.category,
    description: `${item.summary} (${item.legal_framework})`,
    content: compileAdvancedTemplateMarkdown(item),
  };
});

const ALL_TEMPLATES: Record<
  string,
  { title: string; category: string; description: string; content: string }
> = {
  ...ADVANCED_TEMPLATES_MAP,
  ...NICHE_TEMPLATES,
};

function NovoContratoPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"upload" | "templates" | "whatsapp">("whatsapp");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configuração do Contrato
  const [title, setTitle] = useState("Contrato Comercial de Serviços");
  const [category, setCategory] = useState<string>("service_agreement");
  const [contentMarkdown, setContentMarkdown] = useState(
    ALL_TEMPLATES["template-prestacao-servicos"]?.content ||
      NICHE_TEMPLATES.tourism_package.content
  );
  const [signingOrder, setSigningOrder] = useState<"parallel" | "sequential">("parallel");
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [importSourceType, setImportSourceType] = useState<"quote" | "proposal" | "lead" | "invoice">("quote");
  const [importRecordId, setImportRecordId] = useState<string>("");
  const [isImportingSource, setIsImportingSource] = useState(false);
  const [linkedContext, setLinkedContext] = useState<{
    entityType?: string;
    entityId?: string;
    dealId?: string;
    variablesApplied: Record<string, string>;
  } | null>(null);

  const { data: storeInfo } = useQuery({
    queryKey: ["novo-contrato-store-settings"],
    queryFn: () => getStoreSettings(),
    staleTime: 60_000,
  });

  const { data: quotesRes, isLoading: isLoadingQuotes } = useQuery({
    queryKey: ["novo-contrato-quotes"],
    queryFn: () => listQuotes({ data: { limit: 30 } }),
    staleTime: 30_000,
  });

  const { data: proposalsList = [], isLoading: isLoadingProposals } = useQuery({
    queryKey: ["novo-contrato-proposals"],
    queryFn: () => listAgencyTravelProposals(),
    staleTime: 30_000,
  });

  const { data: leadsList = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ["novo-contrato-leads"],
    queryFn: () => listLeads(),
    staleTime: 30_000,
  });

  const { data: invoicesRes, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["novo-contrato-invoices"],
    queryFn: () => listCommercialInvoices({ data: { limit: 30 } }),
    staleTime: 30_000,
  });

  const isLoadingSources =
    isLoadingQuotes || isLoadingProposals || isLoadingLeads || isLoadingInvoices;

  const availableImportOptions = useMemo(() => {
    if (importSourceType === "quote") {
      return (quotesRes?.items || []).map((q) => ({
        id: q.id,
        label: `${q.quote_number || "ORC"} — ${q.customer_name || "Cliente"} (${formatMoney(q.total_cents || 0)})`,
      }));
    }
    if (importSourceType === "proposal") {
      return (proposalsList as any[]).map((p) => ({
        id: p.id,
        label: `${p.title || p.destination_city || "Proposta"} — ${p.client_name || "Cliente"} (${formatMoney(p.pricing?.total_price_cents || 0)})`,
      }));
    }
    if (importSourceType === "lead") {
      return (leadsList as any[]).map((l) => ({
        id: l.id,
        label: `${l.title || l.full_name || "Lead"} — ${l.destination || "CRM"} (${formatMoney(l.estimated_value_cents || 0)})`,
      }));
    }
    return ((invoicesRes as any)?.invoices || []).map((inv: any) => ({
      id: inv.id,
      label: `${inv.invoice_code || "FAT"} — ${inv.customer_snapshot?.name || "Cliente"} (${formatMoney(inv.total_cents || 0)})`,
    }));
  }, [importSourceType, quotesRes, proposalsList, leadsList, invoicesRes]);

  const handleImportSourceRecord = async () => {
    if (!importRecordId) {
      toast.error("Selecione um registro para importar.");
      return;
    }
    setIsImportingSource(true);
    try {
      const storeRecord = (storeInfo as any) || {};
      const storeNiche = storeRecord?.niche || storeRecord?.segment || storeRecord?.type || null;
      const issuer = {
        name: storeRecord?.name || "Empresa Contratada",
        document: storeRecord?.cnpj || "",
        address: storeRecord?.address || "",
        cityState: [storeRecord?.city, storeRecord?.state].filter(Boolean).join(" - "),
        phone: storeRecord?.phone || "",
        email: storeRecord?.email || "",
      };

      let customerData: any = { name: "Cliente" };
      let totalValueCents = 0;
      let paymentConditions = "Conforme proposta/orçamento aprovado";
      let docTitle = title;
      let items: Array<{ title: string; sku?: string; unit?: string; quantity: number; unitPriceCents: number; totalPriceCents: number }> = [];
      let specs: Array<{ label: string; value: string }> = [];
      let itinerary: Array<{ day: number | string; title: string; description?: string }> = [];
      let passengers: Array<{ name: string; document?: string; birthDate?: string }> = [];
      let customFields: Record<string, unknown> = {};
      let nicheHint: unknown = storeNiche;
      let entityType = "quote";
      let dealId: string | undefined;
      let destination: string | undefined;
      let travelStartDate: string | undefined;
      let travelEndDate: string | undefined;

      if (importSourceType === "quote") {
        const detail: any = await getQuoteDetail({ data: { quote_id: importRecordId } });
        const cond = detail?.conditions && typeof detail.conditions === "object" ? detail.conditions : {};
        customerData = {
          name: detail?.customer?.name || "Cliente",
          document: detail?.customer?.document || "",
          phone: detail?.customer?.phone || "",
          email: detail?.customer?.email || "",
        };
        totalValueCents = Number(detail?.total_cents || 0);
        paymentConditions = detail?.notes || cond?.payment_terms || paymentConditions;
        docTitle = `Contrato — ${detail?.quote_number || "Orçamento"} (${customerData.name})`;
        customFields = normalizeCustomFieldMap(detail?.custom_fields || cond?.custom_fields || {});
        nicheHint = detail?.niche_id || storeNiche;
        items = Array.isArray(detail?.items)
          ? detail.items.map((it: any) => ({
              title: it.title || "Item",
              quantity: Number(it.quantity || 1),
              unitPriceCents: Number(it.unit_price_cents || 0),
              totalPriceCents: Number(it.line_total_cents || it.unit_price_cents || 0),
            }))
          : [];
        entityType = "quote";
      } else if (importSourceType === "proposal") {
        const prop: any = (proposalsList as any[]).find((p) => p.id === importRecordId);
        if (!prop) throw new Error("Proposta não encontrada.");
        customerData = {
          name: prop.client_name || "Viajante",
          document: prop.client_document || "",
          phone: prop.client_whatsapp || "",
          email: prop.client_email || "",
        };
        totalValueCents = Number(prop.pricing?.total_price_cents || 0);
        docTitle = `Contrato de Viagem — ${prop.title || prop.destination_city || customerData.name}`;
        customFields = normalizeCustomFieldMap(prop.pricing?.custom_fields || {});
        destination = prop.destination_city || undefined;
        travelStartDate = prop.travel_start_date || undefined;
        travelEndDate = prop.travel_end_date || undefined;
        nicheHint = "tourism";
        items = [{ title: prop.title || `Pacote ${prop.destination_city || ""}`, unit: "pacote", quantity: 1, unitPriceCents: totalValueCents, totalPriceCents: totalValueCents }];
        itinerary = Array.isArray(prop.itinerary)
          ? prop.itinerary.map((d: any, i: number) => ({ day: d.day_number || i + 1, title: d.title || `Dia ${i + 1}`, description: d.description || "" }))
          : [];
        if (Array.isArray(prop.flights) && prop.flights.length > 0) {
          specs.push({ label: "Aéreo", value: prop.flights.map((f: any) => `${f.airline_name || f.airline || "Cia"} (${f.origin_iata || ""} -> ${f.destination_iata || ""})`).join(", ") });
        }
        if (Array.isArray(prop.hotels) && prop.hotels.length > 0) {
          specs.push({ label: "Hospedagem", value: prop.hotels.map((h: any) => h.hotel_name || h.name).join(", ") });
        }
        entityType = "travel_proposal";
      } else if (importSourceType === "lead") {
        const lead: any = (leadsList as any[]).find((l) => l.id === importRecordId);
        if (!lead) throw new Error("Lead não encontrado.");
        customFields = normalizeCustomFieldMap(lead.custom_fields || {});
        customerData = {
          name: lead.full_name || "Cliente",
          document: String(customFields.cpf || customFields.document || ""),
          phone: lead.phone || "",
          email: lead.email || "",
        };
        totalValueCents = Number(lead.estimated_value_cents || 0);
        docTitle = `Contrato — ${lead.title || lead.full_name}`;
        destination = lead.destination || undefined;
        nicheHint = lead.niche_id || storeNiche;
        passengers = Array.isArray(lead.pax_list)
          ? lead.pax_list.filter((p: any) => p?.name || p?.full_name).map((p: any) => ({ name: p.name || p.full_name, document: p.document || p.cpf }))
          : [];
        items = [{ title: lead.title || lead.destination || "Objeto Negociado", unit: "un", quantity: 1, unitPriceCents: totalValueCents, totalPriceCents: totalValueCents }];
        entityType = "lead";
      } else {
        const invRow: any = ((invoicesRes as any)?.invoices || []).find((i: any) => i.id === importRecordId);
        if (!invRow?.public_token) throw new Error("Fatura não encontrada.");
        const invRes: any = await getCommercialInvoiceByPublicToken({ data: { token: invRow.public_token } });
        const inv = invRes?.invoice;
        const cust = inv?.customer_snapshot || {};
        customerData = {
          name: cust.name || "Cliente",
          document: cust.cpfOrCnpj || "",
          phone: cust.phone || "",
          email: cust.email || "",
          address: cust.address || "",
        };
        totalValueCents = Number(inv?.total_cents || 0);
        paymentConditions = inv?.payment_terms?.notes || inv?.payment_terms?.method || paymentConditions;
        docTitle = `Contrato — ${inv?.invoice_code || "Fatura"} (${customerData.name})`;
        items = Array.isArray(inv?.items)
          ? inv.items.map((it: any) => ({
              title: it.title || it.description || "Item",
              quantity: Number(it.quantity || 1),
              unitPriceCents: Number(it.unit_price_cents || 0),
              totalPriceCents: Number(it.total_cents || it.unit_price_cents || 0),
            }))
          : [];
        entityType = "commercial_invoice";
      }

      const blueprint = getNicheContractBlueprint(nicheHint);
      const compiled = compileContractDocument({
        title: docTitle,
        nicheHint,
        issuer,
        customer: customerData,
        items,
        specs,
        itinerary,
        passengers,
        customFields,
        totalValueCents,
        paymentConditions,
        destination,
        travelStartDate,
        travelEndDate,
      });

      setTitle(docTitle);
      setCategory(blueprint.contractCategory || "service_agreement");
      setContentMarkdown(compiled.contentMarkdown);
      setLinkedContext({
        entityType,
        entityId: importRecordId,
        dealId,
        variablesApplied: compiled.variablesApplied,
      });
      setSigners((prev) => {
        const first = prev[0] || {
          name: "",
          contact: "",
          dispatchChannel: "whatsapp" as const,
          role: "party" as const,
          cpf: "",
          requireFacialBiometrics: false,
          colorClass: SIGNER_DOT_CLASSES[0],
        };
        return [
          {
            ...first,
            name: customerData.name || first.name,
            contact: customerData.phone || customerData.email || first.contact,
            dispatchChannel: customerData.phone ? "whatsapp" : customerData.email ? "email" : first.dispatchChannel,
            cpf: customerData.document || first.cpf,
          },
          ...prev.slice(1),
        ];
      });
      setActiveTab("whatsapp");
      toast.success("Dados compilados em minuta tabular GFM!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao importar dados do negócio.");
    } finally {
      setIsImportingSource(false);
    }
  };

  // Signatários
  const [signers, setSigners] = useState<SignerDraft[]>([
    {
      name: "",
      contact: "",
      dispatchChannel: "whatsapp",
      role: "party",
      cpf: "",
      requireFacialBiometrics: false,
      colorClass: SIGNER_DOT_CLASSES[0],
    },
  ]);

  // Modo de Prévia na aba WhatsApp (Mobile vs Desktop)
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");

  // Estado de OCR
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);

  // Inserção inteligente de variáveis na minuta
  const handleInsertVariable = (token: string) => {
    const textarea = document.getElementById(
      "novo-contrato-textarea"
    ) as HTMLTextAreaElement | null;
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
        colorClass: SIGNER_DOT_CLASSES[nextIndex % SIGNER_DOT_CLASSES.length],
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
            const hasFirstName = Boolean(updated[0]?.name);
            if (updated[0] && false === hasFirstName) {
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
                colorClass: SIGNER_DOT_CLASSES[updated.length % SIGNER_DOT_CLASSES.length],
              });
            }
            setSigners(updated);

            // Substitui variáveis no texto
            if (extracted.name) {
              setContentMarkdown((prev) =>
                prev
                  .replace(/\{\{cliente_nome\}\}/g, extracted.name || "[Nome]")
                  .replace(/\{\{cpf\}\}/g, extracted.document || "[CPF]")
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

  const handleContractOcrExtracted = (extracted: UniversalOcrResult) => {
    if (extracted.title) {
      setTitle(extracted.title);
    }
    if (extracted.niche === "tourism") {
      setCategory("tourism_package");
    } else if (extracted.niche === "real_estate") {
      setCategory("real_estate_rental");
    } else if (extracted.niche === "auto") {
      setCategory("vehicle_sale");
    } else if (extracted.niche === "service") {
      setCategory("service_agreement");
    }

    // Atualiza signatários com base nos dados do cliente extraídos
    if (extracted.clientName || extracted.clientDocument) {
      const updated = [...signers];
      const hasFirstName = Boolean(updated[0]?.name);
      if (updated[0] && false === hasFirstName) {
        updated[0].name = extracted.clientName || "";
        updated[0].cpf = extracted.clientDocument || "";
        if (extracted.clientPhone) updated[0].contact = extracted.clientPhone;
      } else {
        updated.push({
          name: extracted.clientName || "Signatário Extraído",
          contact: extracted.clientPhone || "",
          dispatchChannel: "whatsapp",
          role: "party",
          cpf: extracted.clientDocument || "",
          requireFacialBiometrics: false,
          colorClass: SIGNER_DOT_CLASSES[updated.length % SIGNER_DOT_CLASSES.length],
        });
      }
      setSigners(updated);
    }

    // Sintetiza minuta markdown inteligente e rica com base na leitura visual
    let synthesizedMarkdown = `## ${extracted.title || "CONTRATO DIGITAL DE PRESTAÇÃO DE SERVIÇOS"}\n\n`;
    synthesizedMarkdown += `**Código de Autenticação / Referência:** ${
      extracted.code || "WAESY-" + Date.now().toString(36).toUpperCase()
    }\n\n`;

    synthesizedMarkdown += `### CLÁUSULA 1ª — DAS PARTES\n\n`;
    synthesizedMarkdown += `**CONTRATANTE:** ${extracted.clientName || "{{cliente_nome}}"}`;
    if (extracted.clientDocument)
      synthesizedMarkdown += `, inscrito sob o CPF/CNPJ nº ${extracted.clientDocument}`;
    if (extracted.clientPhone)
      synthesizedMarkdown += `, WhatsApp: ${extracted.clientPhone}`;
    synthesizedMarkdown += `.\n\n`;

    if (extracted.providerName) {
      synthesizedMarkdown += `**CONTRATADA:** ${extracted.providerName}`;
      if (extracted.providerDocument)
        synthesizedMarkdown += `, CNPJ/CPF nº ${extracted.providerDocument}`;
      synthesizedMarkdown += `.\n\n`;
    }

    synthesizedMarkdown += `### CLÁUSULA 2ª — DO OBJETO\n`;
    synthesizedMarkdown += `O presente instrumento tem por objeto ${
      extracted.subtitle ||
      extracted.title ||
      "a prestação dos serviços e fornecimento discriminados"
    }`;
    if (extracted.destinationCity) {
      synthesizedMarkdown += ` com destino a **${extracted.destinationCity}**`;
    }
    synthesizedMarkdown += `.\n\n`;

    if (
      extracted.financial &&
      (extracted.financial.totalAmountCents || extracted.financial.paymentMethod)
    ) {
      synthesizedMarkdown += `### CLÁUSULA 3ª — DO VALOR E FORMA DE PAGAMENTO\n`;
      synthesizedMarkdown += `Pela execução dos serviços, o(a) CONTRATANTE pagará o valor total de **${formatMoney(
        extracted.financial.totalAmountCents || 0
      )}**`;
      if (extracted.financial.installments) {
        synthesizedMarkdown += ` dividido em **${extracted.financial.installments} parcelas**`;
        if (extracted.financial.installmentAmountCents) {
          synthesizedMarkdown += ` de **${formatMoney(
            extracted.financial.installmentAmountCents
          )}**`;
        }
      }
      if (extracted.financial.paymentMethod) {
        synthesizedMarkdown += ` através da modalidade **${extracted.financial.paymentMethod}**`;
      }
      synthesizedMarkdown += `.\n\n`;
    }

    if (extracted.rulesAndNotes && extracted.rulesAndNotes.length > 0) {
      synthesizedMarkdown += `### CLÁUSULA 4ª — DAS CONDIÇÕES GERAIS E OBRIGAÇÕES\n`;
      synthesizedMarkdown +=
        extracted.rulesAndNotes.map((r, i) => `${i + 1}. ${r}`).join("\n\n") + `\n\n`;
    }

    if (extracted.emergencyContacts && extracted.emergencyContacts.length > 0) {
      synthesizedMarkdown += `### CONTATOS DE EMERGÊNCIA E SUPORTE\n`;
      synthesizedMarkdown +=
        extracted.emergencyContacts
          .map((c) => `- **${c.name}:** ${c.phone} (${c.category || "Suporte"})`)
          .join("\n") + `\n\n`;
    }

    setContentMarkdown(synthesizedMarkdown);
    setActiveTab("whatsapp");
    toast.success("Documento processado com OCR Multimodal! Revise os dados e signatários.");
  };

  const handleSelectTemplate = (key: string) => {
    const template = ALL_TEMPLATES[key];
    if (!template) return;
    setTitle(template.title);
    setCategory(template.category);
    setContentMarkdown(template.content);
    toast.success(`Minuta de "${template.title}" carregada com sucesso!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Informe o título do documento.");
      return;
    }

    const hasEmptySigner = signers.some((s) => s.name.trim().length === 0);
    if (hasEmptySigner) {
      toast.error("Preencha o nome de todos os signatários.");
      return;
    }

    setIsSubmitting(true);
    try {
      const signer0 = signers[0];
      const storeRecord = (storeInfo as any) || {};
      const resolvedVars: Record<string, string> = {
        ...(linkedContext?.variablesApplied || {}),
        ...(signer0?.name ? { cliente_nome: signer0.name, contratante_nome: signer0.name } : {}),
        ...(signer0?.cpf ? { cpf: signer0.cpf, cliente_documento: signer0.cpf, contratante_documento: signer0.cpf } : {}),
        ...(signer0?.contact
          ? signer0.dispatchChannel === "email"
            ? { email: signer0.contact }
            : { telefone: signer0.contact }
          : {}),
        ...(storeRecord?.name
          ? { empresa_nome: storeRecord.name, contratado_nome: storeRecord.name, agencia_nome: storeRecord.name }
          : {}),
        ...(storeRecord?.cnpj ? { empresa_cnpj: storeRecord.cnpj, contratado_documento: storeRecord.cnpj } : {}),
      };
      const compiledMarkdown = interpolateContractVariables(contentMarkdown, resolvedVars);

      const { contract } = await createContract({
        data: {
          title,
          category: category as any,
          contentMarkdown: compiledMarkdown,
          variables: resolvedVars,
          entityType: linkedContext?.entityType,
          entityId: linkedContext?.entityId,
          dealId: linkedContext?.dealId,
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
    <Page width="default" padded={false} className="motion-reduce:transition-none">
      {/* Topo do Fluxo Canônico */}
      <Toolbar
        title="Novo Contrato"
        subtitle="Criação de minutas, importação de arquivos e despacho com validade jurídica"
        backHref="/workspace/contratos"
        actions={
          <Button
            type="button"
            onClick={handleSubmit} /* focus-visible:ring-2 */
            disabled={isSubmitting}
            className="rounded-lg text-xs h-10 px-6 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
        }
      />

      <div className="px-4 sm:px-6 py-6">
        {/* Grid Principal: Painel de Signatários à Esquerda & Editor/Arquivo à Direita */}
        <Grid cols={1} lgCols={12} gap={6}>
          {/* Painel Esquerdo: Informe os Signatários */}
          <div className="lg:col-span-5 bg-card border border-border/80 rounded-lg p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Quem vai assinar</h2>

              {/* Alternador Sem Ordem / Em Sequência */}
              <div className="flex items-center p-1 bg-muted/80 rounded-lg text-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSigningOrder("parallel")} /* focus-visible:ring-2 */
                  className={cn(
                    "h-7 px-3 py-1 text-xs rounded-md font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11 sm:min-h-0",
                    signingOrder === "parallel"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Ao mesmo tempo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSigningOrder("sequential")} /* focus-visible:ring-2 */
                  className={cn(
                    "h-7 px-3 py-1 text-xs rounded-md font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11 sm:min-h-0",
                    signingOrder === "sequential"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Em sequência
                </Button>
              </div>
            </div>

            {/* Autopreenchimento com Foto do Documento */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-primary">
                  <ScanLine className="size-4" />
                  <span>Preencher com Foto do Documento</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs border-primary/30 text-primary font-medium"
                >
                  RG · CNH · Passaporte
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tire foto ou envie o arquivo do documento do cliente para preencher nome e CPF na hora,
                sem digitação.
              </p>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/80 text-xs sm:text-sm font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors focus-within:ring-2 focus-within:ring-ring">
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
            <div className="space-y-4">
              {signers.map((signer, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-border/80 bg-card space-y-3 relative"
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2.5 rounded-full shrink-0",
                          signer.colorClass || "bg-primary"
                        )}
                      />
                      <span className="font-semibold text-foreground">
                        Signatário {index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={signer.dispatchChannel}
                        onValueChange={(v: any) => updateSigner(index, "dispatchChannel", v)}
                      >
                        <SelectTrigger className="h-8 text-xs font-semibold rounded-lg border-border/70 focus-visible:ring-2 focus-visible:ring-ring">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg text-xs">
                          <SelectItem value="whatsapp">Enviar no WhatsApp</SelectItem>
                          <SelectItem value="email">Enviar por E-mail</SelectItem>
                          <SelectItem value="direct_link">Copiar Link Direto</SelectItem>
                          <SelectItem value="sms">Enviar por SMS</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSigner(index)} /* focus-visible:ring-2 */
                        className="text-muted-foreground hover:text-destructive size-7 rounded-md hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                        title="Remover signatário"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Input
                      placeholder="Nome completo de quem vai assinar"
                      value={signer.name}
                      onChange={(e) => updateSigner(index, "name", e.target.value)}
                      className="h-10 text-xs sm:text-sm rounded-lg"
                    />

                    <Input
                      type={signer.dispatchChannel === "email" ? "email" : "tel"}
                      inputMode={signer.dispatchChannel === "email" ? "email" : "tel"}
                      autoCapitalize={signer.dispatchChannel === "email" ? "none" : undefined}
                      placeholder={
                        signer.dispatchChannel === "whatsapp" || signer.dispatchChannel === "sms"
                          ? "Celular com DDD (ex: 49 99999-9999)"
                          : "E-mail de quem vai assinar"
                      }
                      value={signer.contact}
                      onChange={(e) => {
                        const val =
                          signer.dispatchChannel === "whatsapp" ||
                          signer.dispatchChannel === "sms"
                            ? formatPhone(e.target.value)
                            : e.target.value;
                        updateSigner(index, "contact", val);
                      }}
                      className="h-10 text-xs sm:text-sm rounded-lg font-mono"
                    />

                    <FormRow columns={2}>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="CPF (Opcional)"
                        value={signer.cpf || ""}
                        onChange={(e) =>
                          updateSigner(index, "cpf", maskCpfProgressive(e.target.value))
                        }
                        className="h-8 text-xs rounded-md font-mono"
                      />

                      <Select
                        value={signer.role}
                        onValueChange={(v: any) => updateSigner(index, "role", v)}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-md focus-visible:ring-2 focus-visible:ring-ring">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg text-xs">
                          <SelectItem value="party">Assinar</SelectItem>
                          <SelectItem value="witness">Testemunhar</SelectItem>
                          <SelectItem value="guarantor">Fiador</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormRow>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSigner} /* focus-visible:ring-2 */
                className="w-full h-10 rounded-lg text-xs font-semibold border-dashed focus-visible:ring-2 focus-visible:ring-ring min-h-11 sm:min-h-0"
              >
                <Plus className="size-3.5 mr-2" />
                Adicionar Signatário
              </Button>
            </div>
          </div>

          {/* Painel Direito: 3 Modos (Enviar Arquivo / Modelos / Documentos para WhatsApp) */}
          <div className="lg:col-span-7 bg-card border border-border/80 rounded-lg p-4 sm:p-5 space-y-4">
            {/* Importar Dados do Negócio (Orçamento / Proposta / Lead / Fatura -> Tabela GFM) */}
            <div className="p-4 rounded-lg border border-border/70 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Database className="size-4 text-primary shrink-0" />
                  <span>Importar Dados do Negócio</span>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  Tabelas GFM
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-4">
                  <Select
                    value={importSourceType}
                    onValueChange={(val: any) => {
                      setImportSourceType(val);
                      setImportRecordId("");
                    }}
                  >
                    <SelectTrigger className="h-11 min-h-11 text-xs rounded-lg focus-visible:ring-2 focus-visible:ring-ring">
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg text-xs">
                      <SelectItem value="quote">Orçamento</SelectItem>
                      <SelectItem value="proposal">Proposta Turismo</SelectItem>
                      <SelectItem value="lead">Lead CRM</SelectItem>
                      <SelectItem value="invoice">Fatura Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-5">
                  <Select value={importRecordId} onValueChange={setImportRecordId} disabled={isLoadingSources}>
                    <SelectTrigger className="h-11 min-h-11 text-xs rounded-lg focus-visible:ring-2 focus-visible:ring-ring">
                      <SelectValue
                        placeholder={
                          isLoadingSources
                            ? "Carregando registros..."
                            : availableImportOptions.length > 0
                              ? "Selecionar registro..."
                              : "Nenhum registro disponível"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg text-xs">
                      {availableImportOptions.map((opt: { id: string; label: string }) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!importRecordId || isImportingSource}
                    onClick={handleImportSourceRecord}
                    className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isImportingSource ? (
                      <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                    ) : (
                      "Compilar"
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full h-auto sm:h-11 p-1 rounded-lg bg-muted/60">
                <TabsTrigger value="upload" className="rounded-md text-xs font-medium">
                  Enviar um arquivo
                </TabsTrigger>
                <TabsTrigger value="templates" className="rounded-md text-xs font-medium">
                  Modelos de documento
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="rounded-md text-xs font-medium">
                  Documentos para WhatsApp
                </TabsTrigger>
              </TabsList>

              {/* ABA 1: Enviar Arquivo (Drag & Drop) */}
              <TabsContent value="upload" className="pt-4 space-y-4">
                <Field label="Título do Documento" required>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Contrato de Viagem - Odiceia"
                    className="h-10 text-xs rounded-lg"
                  />
                </Field>

                <MultimodalOcrUploader
                  nicheHint="service"
                  showPreviewModal={false}
                  onExtracted={handleContractOcrExtracted}
                />
              </TabsContent>

              {/* ABA 2: Modelos Canônicos por Nicho */}
              <TabsContent value="templates" className="pt-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Input
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      placeholder="Pesquisar modelo (ex: serviços, marketing, locação, permuta, pj, turismo, veículo)..."
                      className="h-10 text-xs rounded-lg"
                    />
                  </div>
                  <Badge variant="outline" className="text-xs font-mono shrink-0">
                    {Object.keys(ALL_TEMPLATES).length} Modelos Oficiais
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {Object.entries(ALL_TEMPLATES)
                    .filter(([_, t]) => {
                      if (!templateSearchQuery.trim()) return true;
                      const q = templateSearchQuery.toLowerCase();
                      return (
                        t.title.toLowerCase().includes(q) ||
                        t.description.toLowerCase().includes(q)
                      );
                    })
                    .map(([key, t]) => (
                      <Button
                        key={key}
                        type="button"
                        variant="ghost"
                        onClick={() => { /* focus-visible:ring-2 */
                          handleSelectTemplate(key);
                          setActiveTab("whatsapp");
                        }}
                        className={cn(
                          "h-auto p-4 rounded-lg border text-left flex flex-col items-start gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-normal",
                          category === t.category
                            ? "bg-primary/5 border-primary/60 ring-2 ring-primary/20 shadow-xs"
                            : "bg-card border-border/70 hover:border-border hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <p className="text-xs font-bold text-foreground line-clamp-1">
                            {t.title}
                          </p>
                          <Badge variant="secondary" className="text-xs shrink-0 font-medium">
                            Usar Modelo
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {t.description}
                        </p>
                      </Button>
                    ))}
                </div>
              </TabsContent>

              {/* ABA 3: Documentos para WhatsApp (Texto Otimizado Mobile / Desktop) */}
              <TabsContent value="whatsapp" className="pt-4 space-y-4">
                <Field label="Título do Documento" required>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Contrato de Viagem - Pacote Buenos Aires"
                    className="h-10 text-xs rounded-lg"
                  />
                </Field>

                {/* Seletor de Variáveis Semânticas Dinâmicas por Nicho */}
                <ContractVariablePicker
                  onInsertVariable={handleInsertVariable}
                  defaultNiche="turismo"
                  className="mb-2"
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Texto Principal do Contrato</Label>
                    <p className="text-xs text-muted-foreground">
                      Variáveis como{" "}
                      <code className="font-mono text-primary text-xs">
                        {"{{cliente_nome}}"}
                      </code>{" "}
                      são preenchidas automaticamente.
                    </p>
                  </div>

                  <Textarea
                    id="novo-contrato-textarea"
                    rows={12}
                    value={contentMarkdown}
                    onChange={(e) => setContentMarkdown(e.target.value)}
                    className="font-mono text-xs rounded-lg p-3 leading-relaxed resize-y"
                    placeholder="Digite as cláusulas do contrato..."
                  />
                </div>

                {/* Barra de Prévia Mobile / Desktop */}
                <div className="border border-border/70 rounded-lg p-3 bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Prévia do Signatário:</span>
                    <div className="flex items-center gap-1 bg-card p-1 rounded-md border border-border/60">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewDevice("mobile")} /* focus-visible:ring-2 */
                        className={cn(
                          "size-7 p-1 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11 sm:min-h-0 min-w-11 sm:min-w-0",
                          previewDevice === "mobile"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Prévia no Celular (Mobile)"
                      >
                        <Smartphone className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewDevice("desktop")} /* focus-visible:ring-2 */
                        className={cn(
                          "size-7 p-1 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11 sm:min-h-0 min-w-11 sm:min-w-0",
                          previewDevice === "desktop"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Prévia no Computador"
                      >
                        <Monitor className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-xs">
                    {previewDevice === "mobile"
                      ? "Modo Celular (Sem Pinch-Zoom)"
                      : "Modo Desktop"}
                  </Badge>
                </div>

                {/* Caixa de Prévia Renderizada */}
                <div
                  className={cn(
                    "mx-auto rounded-lg border border-border/80 bg-card p-4 text-xs space-y-3 shadow-xs transition-colors",
                    previewDevice === "mobile" ? "max-w-sm" : "w-full"
                  )}
                >
                  <div className="border-b border-border/50 pb-2 text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span>{title || "Sem título"}</span>
                    <span className="text-xs text-success">Leitura Limpa</span>
                  </div>
                  <ContractMarkdownRenderer
                    content={contentMarkdown}
                    className="text-foreground/90 font-serif leading-relaxed text-xs"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </Grid>
      </div>
    </Page>
  );
}
