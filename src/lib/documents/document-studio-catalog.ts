/**
 * document-studio-catalog.ts — Catálogo Contextual, Hidratação Multi-Tenant e Compilador do Studio Unificado
 *
 * Centraliza os 5 arquétipos contextuais (Fichas/Documentos, Propostas/Orçamentos, Contratos,
 * Vouchers/Embarque e Apresentações 16:9), hidrata identidade real do locatário sem hardcodes e
 * adapta payloads para cada template nativo do ecossistema.
 */

import { ADVANCED_CONTRACT_TEMPLATES } from "@/lib/data/advanced-contract-templates";
import { compileContractDocument } from "@/lib/contracts/contract-compiler";
import { formatMoney } from "@/lib/money";
import type { CommercialDocumentData } from "@/components/documents/types";
import type {
  ProposalCanvasFormat,
  TravelProposalDTO,
} from "@/services/travel-proposal.functions";
import {
  generateDynamicTravelPresentation,
  type PreBoardingPresentationPage,
} from "@/services/travel-pre-boarding-and-commissions.functions";
import type { ProposalFontPresetId } from "@/lib/tourism/proposal-theme-palettes";

export type PresentationTemplateVariant =
  | "editorial_deck"
  | "dark_luxury_deck"
  | "bento_canvas"
  | "landscape_canvas"
  | "corporate_pitch_deck"
  | "pre_boarding_guide";

export interface EditablePresentationSlide {
  id: string;
  pageNumber: number;
  moduleKey: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  humanNarrative: string;
  highlightMetric?: string;
  cards: Array<{
    label: string;
    value: string;
    practicalExplanation: string;
    badge?: string;
  }>;
  steps?: Array<{
    stepNumber: number;
    title: string;
    explanation: string;
    badge?: string;
  }>;
}

export type DocumentStudioArchetype =
  | "dossier_form_doc"
  | "proposal_quote"
  | "contract_legal"
  | "voucher_boarding"
  | "presentation_deck";

export interface TenantDocumentIdentity {
  companyName: string;
  tradingName: string;
  documentNumber: string;
  registryCode: string;
  address: string;
  cityState: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string | null;
  brandColor: string | null;
  pixKey: string;
  paymentInstructions: string;
  niche: string;
  slug: string;
}

export interface DocumentStudioTemplateMeta {
  id: string;
  archetype: DocumentStudioArchetype;
  title: string;
  shortLabel: string;
  description: string;
  defaultFormat: ProposalCanvasFormat;
  badgeText: string;
  contractTemplateId?: string;
  commercialVariant?: "budget_corporate_clean" | "proposal_editorial_agency";
  voucherVariant?: "a4_official" | "story_mobile";
  presentationVariant?: PresentationTemplateVariant;
  proposalTemplateTheme?: string;
}

export interface DocumentStudioPassengerRow {
  name: string;
  document?: string;
  birthDate?: string;
  role?: string;
}

export interface DocumentStudioFinancialRow {
  label: string;
  dueDate?: string;
  amountCents: number;
  status?: string;
}

export interface DocumentStudioChecklistSummary {
  title: string;
  completedCount: number;
  totalCount: number;
}

export interface DocumentStudioFormState {
  title: string;
  subtitle: string;
  protocolCode: string;
  issueDate: string;
  validUntilDate: string;
  clientName: string;
  clientDocument: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientCompany: string;
  destination: string;
  startDate: string;
  endDate: string;
  adultsCount: number;
  childrenCount: number;
  totalCents: number;
  entryCents: number;
  installmentsCount: number;
  paymentMethod: string;
  paymentConditions: string;
  flightSummary: string;
  hotelSummary: string;
  includedItemsText: string;
  excludedItemsText: string;
  itineraryNotes: string;
  healthAllergies: string;
  healthMedications: string;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  passengers: DocumentStudioPassengerRow[];
  financialRows: DocumentStudioFinancialRow[];
  checklists: DocumentStudioChecklistSummary[];
  extraCustomFields: Array<{ label: string; value: string }>;
  markdownBody: string;
  contractTemplateId: string;
  contractVariables: Record<string, string>;
}

export interface DocumentStudioCmsConfig {
  format: ProposalCanvasFormat;
  visualThemeId: string;
  canvasBg: string;
  brandColor: string;
  fontPreset: ProposalFontPresetId;
  commercialLayoutVariant: "budget_corporate_clean" | "proposal_editorial_agency";
  voucherLayoutVariant: "a4_official" | "story_mobile";
  showHeaderMasthead: boolean;
  showAgencyLogo: boolean;
  showClientCard: boolean;
  showSummaryStrip: boolean;
  showItemsOrFinancialTable: boolean;
  showPassengersOrChecklist: boolean;
  showHealthOrComplianceBlock: boolean;
  showVerificationQr: boolean;
  showSignatureBlock: boolean;
  customFooterNote: string;
}

export const DOCUMENT_STUDIO_ARCHETYPE_META: Array<{
  id: DocumentStudioArchetype;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: "dossier_form_doc",
    label: "Documentos & Fichas",
    shortLabel: "Documentos",
    description: "Anamnese, autorizações, relatórios executivos, recibos e termos oficiais",
  },
  {
    id: "proposal_quote",
    label: "Proposta & Orçamento",
    shortLabel: "Proposta",
    description: "Orçamento editorial, itens, condições comerciais e link de aceite",
  },
  {
    id: "contract_legal",
    label: "Contrato Jurídico",
    shortLabel: "Contrato",
    description: "Minutas multi-nicho, cláusulas modulares, variáveis e assinatura digital",
  },
  {
    id: "voucher_boarding",
    label: "Voucher & Embarque",
    shortLabel: "Voucher",
    description: "Cartão de embarque A4 e Story 9:16 com localizadores e QR Code offline",
  },
  {
    id: "presentation_deck",
    label: "Apresentação 16:9",
    shortLabel: "Slides 16:9",
    description: "Deck comercial panorâmico e guia pré-embarque completo de 41 módulos",
  },
];

export const DOCUMENT_MERGE_TAGS: Array<{
  key: string;
  label: string;
  token: string;
}> = [
  { key: "nome", label: "Cliente / Titular", token: "{{nome_cliente}}" },
  { key: "cpf", label: "CPF / CNPJ", token: "{{cpf_cliente}}" },
  { key: "telefone", label: "Telefone", token: "{{telefone_cliente}}" },
  { key: "email", label: "E-mail", token: "{{email_cliente}}" },
  { key: "destino", label: "Destino / Objeto", token: "{{destino}}" },
  { key: "periodo", label: "Período", token: "{{periodo_viagem}}" },
  { key: "valor", label: "Valor Total", token: "{{valor_total}}" },
  { key: "empresa", label: "Empresa Emissora", token: "{{empresa_emissora}}" },
  { key: "saude", label: "Saúde & PCD", token: "{{saude_pcd}}" },
  { key: "protocolo", label: "Protocolo", token: "{{protocolo}}" },
];

export function buildDocumentStudioTemplateCatalog(): DocumentStudioTemplateMeta[] {
  const staticTemplates: DocumentStudioTemplateMeta[] = [
    {
      id: "anamnese_embarque",
      archetype: "dossier_form_doc",
      title: "Ficha Confidencial de Anamnese & Embarque",
      shortLabel: "Anamnese & Saúde",
      description: "Restrições alimentares, alergias, medicamentos, acessibilidade PCD e emergência.",
      defaultFormat: "a4-portrait",
      badgeText: "Dossiê Clínico & Embarque",
    },
    {
      id: "autorizacao_menor_viagem",
      archetype: "dossier_form_doc",
      title: "Autorização de Embarque & Termo de Responsabilidade",
      shortLabel: "Autorização / Termo",
      description: "Declaração formal de embarque, ciência documental, vistos e guarda.",
      defaultFormat: "a4-portrait",
      badgeText: "Documento Formal",
    },
    {
      id: "relatorio_executivo_atendimento",
      archetype: "dossier_form_doc",
      title: "Dossiê Executivo Completo do Atendimento",
      shortLabel: "Relatório Completo",
      description: "Consolida titular, acompanhantes, checklists, valores e observações da operação.",
      defaultFormat: "a4-portrait",
      badgeText: "Relatório Operacional",
    },
    {
      id: "recibo_quitacao_pagamento",
      archetype: "dossier_form_doc",
      title: "Recibo Oficial & Demonstrativo Financeiro",
      shortLabel: "Recibo & Parcelas",
      description: "Comprovante timbrado com entrada, parcelas previstas, saldo e chave PIX.",
      defaultFormat: "a4-portrait",
      badgeText: "Demonstrativo Financeiro",
    },
    {
      id: "proposta_editorial_agency",
      archetype: "proposal_quote",
      title: "Proposta Comercial Editorial",
      shortLabel: "Editorial Agency",
      description: "Capa limpa, resumo do escopo, cronograma, condições e bloco de investimento.",
      defaultFormat: "a4-portrait",
      badgeText: "Proposta Comercial",
      commercialVariant: "proposal_editorial_agency",
    },
    {
      id: "budget_corporate_clean",
      archetype: "proposal_quote",
      title: "Orçamento Corporativo Direto",
      shortLabel: "Orçamento Clean",
      description: "Tabela discriminada de itens, impostos/descontos, PIX e aprovação rápida.",
      defaultFormat: "a4-portrait",
      badgeText: "Orçamento B2B/B2C",
      commercialVariant: "budget_corporate_clean",
    },
    {
      id: "proposta_paisagem_executiva",
      archetype: "proposal_quote",
      title: "Proposta Panorâmica A4 Paisagem",
      shortLabel: "Proposta Paisagem",
      description: "Layout horizontal amplo ideal para apresentações impressas e mesas de reunião.",
      defaultFormat: "a4-landscape",
      badgeText: "Orçamento Paisagem",
      commercialVariant: "proposal_editorial_agency",
    },
    {
      id: "voucher_embarque_a4",
      archetype: "voucher_boarding",
      title: "Voucher Oficial de Embarque A4",
      shortLabel: "Voucher A4",
      description: "Aéreo, hotelaria, lista de passageiros, locador e QR Code de validação.",
      defaultFormat: "a4-portrait",
      badgeText: "Voucher A4",
      voucherVariant: "a4_official",
    },
    {
      id: "voucher_story_916",
      archetype: "voucher_boarding",
      title: "Cartão de Embarque Story 9:16",
      shortLabel: "Cartão WhatsApp 9:16",
      description: "Cartão vertical otimizado para abertura instantânea no celular do viajante.",
      defaultFormat: "story-916",
      badgeText: "Mobile Story 9:16",
      voucherVariant: "story_mobile",
    },
    {
      id: "apresentacao_comercial_169",
      archetype: "presentation_deck",
      title: "Deck Comercial Executivo 16:9 (Brand Kit)",
      shortLabel: "Deck Comercial 16:9",
      description: "Apresentação de vendas em slides editáveis com logo, resumo da viagem, logística, diferenciais e investimento.",
      defaultFormat: "presentation-169",
      badgeText: "Deck Editável 16:9",
      presentationVariant: "editorial_deck",
    },
    {
      id: "apresentacao_luxo_dark_169",
      archetype: "presentation_deck",
      title: "Deck Luxury Dark & Alta Curadoria 16:9",
      shortLabel: "Deck Luxury Dark",
      description: "Lâminas widescreen em estética escura editorial com destaque para hospedagem, experiências e proposta de valor.",
      defaultFormat: "presentation-169",
      badgeText: "Luxury Dark 16:9",
      presentationVariant: "dark_luxury_deck",
    },
    {
      id: "apresentacao_bento_169",
      archetype: "presentation_deck",
      title: "Apresentação Visual Bento Grid (Vitrine)",
      shortLabel: "Lâmina Bento Grid",
      description: "Layout moderno em mosaico visual (Bento) integrando capa, voos, hotelaria, roteiro e condições em tela cheia.",
      defaultFormat: "presentation-169",
      badgeText: "Bento Grid Visual",
      presentationVariant: "bento_canvas",
      proposalTemplateTheme: "bento-grid",
    },
    {
      id: "apresentacao_paisagem_guiada",
      archetype: "presentation_deck",
      title: "Lâmina Panorâmica Guiada (Reunião Consultiva)",
      shortLabel: "Lâmina Panorâmica",
      description: "Apresentação horizontal estruturada em lâminas de reunião com aéreo, hospedagem e comparativo financeiro.",
      defaultFormat: "a4-landscape",
      badgeText: "Panorâmica A4/16:9",
      presentationVariant: "landscape_canvas",
      proposalTemplateTheme: "landscape-presentation",
    },
    {
      id: "apresentacao_corporativa_pitch",
      archetype: "presentation_deck",
      title: "Pitch Comercial & Proposta de Escopo B2B/B2C",
      shortLabel: "Pitch Comercial",
      description: "Deck institucional com apresentação da empresa, diagnóstico do atendimento, entregáveis, cronograma e investimento.",
      defaultFormat: "presentation-169",
      badgeText: "Pitch & Escopo",
      presentationVariant: "corporate_pitch_deck",
    },
    {
      id: "guia_pre_embarque_169",
      archetype: "presentation_deck",
      title: "Pasta Digital & Guia Pré-Embarque (41 Módulos)",
      shortLabel: "Guia Pré-Embarque",
      description: "Dossiê interativo pós-venda com códigos IATA, bagagem, imigração, clima, câmbio e checklist de viagem.",
      defaultFormat: "presentation-169",
      badgeText: "Dossiê 41 Módulos",
      presentationVariant: "pre_boarding_guide",
    },
  ];

  const contractTemplates: DocumentStudioTemplateMeta[] = ADVANCED_CONTRACT_TEMPLATES.map(
    (tpl, index) => ({
      id: `contract_${tpl.id}`,
      archetype: "contract_legal" as const,
      title: tpl.title,
      shortLabel: tpl.title.length > 34 ? `${tpl.title.slice(0, 32)}...` : tpl.title,
      description: tpl.summary,
      defaultFormat: "a4-portrait" as const,
      badgeText: tpl.legal_framework ? tpl.legal_framework.split(",")[0] : `Minuta #${index + 1}`,
      contractTemplateId: tpl.id,
    }),
  );

  return [...staticTemplates, ...contractTemplates];
}

export const DOCUMENT_STUDIO_TEMPLATES = buildDocumentStudioTemplateCatalog();

export function resolveTenantDocumentIdentity(input?: {
  agency?: Record<string, any> | null;
  brandKit?: Record<string, any> | null;
  companyProfile?: Record<string, any> | null;
  storeSettings?: Record<string, any> | null;
  overrideCompanyName?: string | null;
  overrideLogoUrl?: string | null;
  overrideBrandColor?: string | null;
}): TenantDocumentIdentity {
  const agency = input?.agency || null;
  const brandKit = input?.brandKit || null;
  const profile = input?.companyProfile || null;
  const store = input?.storeSettings || null;

  const companyName =
    String(
      input?.overrideCompanyName ||
        profile?.company_name ||
        store?.name ||
        agency?.name ||
        profile?.trading_name ||
        "Organização Emissora",
    ).trim() || "Organização Emissora";

  const tradingName = String(
    input?.overrideCompanyName || profile?.trading_name || store?.name || agency?.name || companyName,
  ).trim();

  const documentNumber = String(profile?.cnpj || store?.cnpj || "").trim();
  const registryCode = String(
    profile?.cadastur || store?.cadastur || agency?.cadastur || "",
  ).trim();
  const address = String(profile?.address || store?.address || "").trim();
  const city = String(profile?.city || store?.city || "").trim();
  const state = String(profile?.state || store?.state || "").trim();
  const cityState = [city, state].filter(Boolean).join(" / ");
  const phone = String(profile?.phone || store?.phone || "").trim();
  const email = String(profile?.email || store?.email || "").trim();
  const website = String(profile?.website || store?.website || "").trim();
  const logoUrl =
    input?.overrideLogoUrl ||
    (brandKit?.logo_url as string | undefined) ||
    (agency?.logo_url as string | undefined) ||
    (store?.logo_url as string | undefined) ||
    null;
  const brandColor =
    input?.overrideBrandColor ||
    (brandKit?.primary_color as string | undefined) ||
    (agency?.brand_color as string | undefined) ||
    null;

  return {
    companyName,
    tradingName,
    documentNumber,
    registryCode,
    address,
    cityState,
    phone,
    email,
    website,
    logoUrl,
    brandColor,
    pixKey: String(store?.pix_key || "").trim(),
    paymentInstructions: String(store?.payment_instructions || "").trim(),
    niche: String(store?.niche || store?.segment || "turismo").trim(),
    slug: String(agency?.slug || store?.slug || "").trim(),
  };
}

export function buildFormattedPeriod(start?: string | null, end?: string | null): string {
  const s = String(start || "").trim();
  const e = String(end || "").trim();
  if (s && e) return `${s} a ${e}`;
  return s || e || "Datas a definir";
}

export function interpolateDocumentMergeTags(
  rawText: string,
  form: DocumentStudioFormState,
  tenant: TenantDocumentIdentity,
): string {
  const healthSummary = [
    form.healthAllergies ? `Alergias: ${form.healthAllergies}` : "",
    form.healthMedications ? `Medicamentos: ${form.healthMedications}` : "",
    form.dietaryRestrictions ? `Restrição alimentar: ${form.dietaryRestrictions}` : "",
    form.accessibilityNeeds ? `Acessibilidade/PCD: ${form.accessibilityNeeds}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const replacements: Record<string, string> = {
    "{{nome_cliente}}": form.clientName || "Cliente a definir",
    "{{cpf_cliente}}": form.clientDocument || "Não informado",
    "{{telefone_cliente}}": form.clientPhone || "Não informado",
    "{{email_cliente}}": form.clientEmail || "Não informado",
    "{{destino}}": form.destination || "Destino a definir",
    "{{periodo_viagem}}": buildFormattedPeriod(form.startDate, form.endDate),
    "{{valor_total}}": formatMoney(form.totalCents || 0),
    "{{empresa_emissora}}": tenant.companyName,
    "{{cnpj_emissora}}": tenant.documentNumber || "Não informado",
    "{{saude_pcd}}": healthSummary || "Sem restrições clínicas declaradas",
    "{{protocolo}}": form.protocolCode || "ATENDIMENTO",
    "{{data_hoje}}": form.issueDate || new Date().toLocaleDateString("pt-BR"),
  };

  let output = String(rawText ?? "");
  for (const [token, value] of Object.entries(replacements)) {
    output = output.split(token).join(value);
  }
  return output;
}

export function compileStudioDocumentMarkdown(
  templateId: string,
  form: DocumentStudioFormState,
  tenant: TenantDocumentIdentity,
): string {
  const period = buildFormattedPeriod(form.startDate, form.endDate);
  const totalFormatted = formatMoney(form.totalCents || 0);
  const entryFormatted = formatMoney(form.entryCents || 0);
  const totalPax = Math.max(1, (form.adultsCount || 0) + (form.childrenCount || 0));

  const passengersRows =
    form.passengers.length > 0
      ? form.passengers
          .map(
            (pax, idx) =>
              `| ${idx + 1} | ${pax.name || "Sem nome"} | ${pax.document || "Pendente"} | ${pax.birthDate || "—"} | ${pax.role || "Passageiro"} |`,
          )
          .join("\n")
      : "| 1 | " + (form.clientName || "Titular") + " | " + (form.clientDocument || "Pendente") + " | — | Titular |";

  const financialRows =
    form.financialRows.length > 0
      ? form.financialRows
          .map(
            (row, idx) =>
              `| ${row.label || `Parcela ${idx + 1}`} | ${row.dueDate || "A combinar"} | ${formatMoney(row.amountCents || 0)} | ${row.status || "Previsto"} |`,
          )
          .join("\n")
      : `| Entrada / Sinal | Imediato | ${entryFormatted} | Previsto |\n| Investimento Total (${form.installmentsCount || 1}x ${form.paymentMethod || "A combinar"}) | ${period} | ${totalFormatted} | Base |`;

  if (templateId.startsWith("contract_")) {
    const rawContractId = templateId.replace(/^contract_/, "");
    const tpl =
      ADVANCED_CONTRACT_TEMPLATES.find((item) => item.id === rawContractId) ||
      ADVANCED_CONTRACT_TEMPLATES[0];
    if (tpl) {
      const compiled = compileContractDocument({
        templateId: tpl.id,
        title: form.title || tpl.title,
        nicheHint: tenant.niche || "turismo",
        totalValueCents: form.totalCents,
        paymentMethod: form.paymentMethod,
        paymentConditions:
          form.paymentConditions ||
          `${form.installmentsCount || 1}x via ${form.paymentMethod || "A combinar"}`,
        destination: form.destination,
        hotelName: form.hotelSummary,
        travelStartDate: form.startDate,
        travelEndDate: form.endDate,
        validUntil: form.validUntilDate,
        issuer: {
          name: tenant.companyName,
          document: tenant.documentNumber,
          address: tenant.address,
          cityState: tenant.cityState,
          email: tenant.email,
          phone: tenant.phone,
        },
        customer: {
          name: form.clientName || "Cliente a definir",
          document: form.clientDocument,
          email: form.clientEmail,
          phone: form.clientPhone,
          address: form.clientAddress,
        },
        passengers: form.passengers.map((p) => ({
          name: p.name,
          document: p.document,
          birthDate: p.birthDate,
          role: p.role,
        })),
        installments: form.financialRows.map((r, idx) => ({
          installmentNumber: idx + 1,
          dueDate: r.dueDate || form.validUntilDate || "A combinar",
          amountCents: r.amountCents,
          method: form.paymentMethod,
          status: r.status,
        })),
        customVariables: form.contractVariables,
      });
      return compiled.contentMarkdown;
    }
  }

  if (templateId === "anamnese_embarque") {
    return `## 1. DADOS DE SAÚDE, ACESSIBILIDADE E EMERGÊNCIA

| Campo Clínico / Embarque | Declaração Registrada |
| :--- | :--- |
| **Alergias & Intolerâncias** | ${form.healthAllergies || "Nenhuma declarada"} |
| **Medicamentos de Uso Contínuo** | ${form.healthMedications || "Nenhum declarado"} |
| **Restrições Alimentares (Catering)** | ${form.dietaryRestrictions || "Sem restrições"} |
| **Necessidades de Acessibilidade / PCD** | ${form.accessibilityNeeds || "Não requer suporte especial"} |
| **Contato de Emergência** | ${form.emergencyContactName || "Não informado"} (${form.emergencyContactPhone || "Sem telefone"}) |

---

## 2. PASSAGEIROS VINCULADOS (${totalPax} PESSOAS)

| # | Nome Completo | Documento / CPF | Nascimento | Perfil |
| :---: | :--- | :--- | :--- | :--- |
${passengersRows}

---

## 3. DECLARAÇÃO DE VERACIDADE

Declaro sob minha responsabilidade que as informações médicas, documentais e de mobilidade acima descritas são fidedignas e autorizo a equipe de **${tenant.companyName}** a utilizá-las exclusivamente para assistência operacional, seguro viagem, serviços aéreos e hospedagem durante o período de **${period}**.`;
  }

  if (templateId === "autorizacao_menor_viagem") {
    return `## 1. OBJETO DA AUTORIZAÇÃO E RESPONSABILIDADE

Pelo presente instrumento, o(a) responsável legal **${form.clientName || "{{nome_cliente}}"}**, inscrito(a) no CPF/RG sob nº **${form.clientDocument || "Não informado"}**, declara estar ciente das regras de embarque nacional/internacional referentes ao destino **${form.destination || "{{destino}}"}** no período de **${period}**.

---

## 2. RELAÇÃO DE VIAJANTES E DOCUMENTAÇÃO

| # | Nome Completo | Documento / Passaporte | Nascimento | Vínculo |
| :---: | :--- | :--- | :--- | :--- |
${passengersRows}

---

## 3. CIÊNCIA OPERACIONAL

- Documentos originais com foto (RG com menos de 10 anos, CNH válida ou Passaporte com validade mínima de 6 meses para viagens internacionais) são obrigatórios no momento do embarque.
- Menores de 16 anos em viagem desacompanhados de ambos os genitores necessitam de autorização judicial ou escritura pública com firma reconhecida conforme normas do CNJ/Polícia Federal.`;
  }

  if (templateId === "recibo_quitacao_pagamento") {
    return `## 1. COMPROVANTE DE CONDIÇÕES & PARCELAMENTO

Recebemos/pactuamos com **${form.clientName || "{{nome_cliente}}"}** (CPF/CNPJ: **${form.clientDocument || "Não informado"}**) os valores abaixo descritos referentes à operação **${form.destination || "Serviços Contratados"}** (${period}).

| Parcela / Rubrica | Vencimento | Valor | Situação |
| :--- | :--- | ---: | :--- |
${financialRows}

**Valor Total Pactuado:** ${totalFormatted}  
**Modalidade Preferencial:** ${form.paymentMethod || "A definir"} (${form.installmentsCount || 1}x)  
${tenant.pixKey ? `**Chave PIX Institucional:** \`${tenant.pixKey}\`` : ""}

---

## 2. OBSERVAÇÕES DE QUITAÇÃO

${form.paymentConditions || "Documento válido como demonstrativo de condições acordadas junto à operação emissor(a). Quitação plena condicionada à compensação bancária."}`;
  }

  if (templateId === "relatorio_executivo_atendimento") {
    const checklistLines =
      form.checklists.length > 0
        ? form.checklists
            .map((c) => `- **${c.title}:** ${c.completedCount}/${c.totalCount} concluídos`)
            .join("\n")
        : "- Nenhum checklist operacional cadastrado até o momento.";

    const customFieldLines =
      form.extraCustomFields.length > 0
        ? form.extraCustomFields
            .map((f) => `| ${f.label} | ${f.value} |`)
            .join("\n")
        : "";

    return `## 1. SUMÁRIO EXECUTIVO DO ATENDIMENTO

- **Protocolo:** ${form.protocolCode}
- **Destino / Escopo:** ${form.destination || "Não informado"}
- **Período:** ${period} (${form.adultsCount} adulto(s), ${form.childrenCount} criança(s))
- **Investimento Estimado:** ${totalFormatted}

---

## 2. MALHA AÉREA, HOSPEDAGEM & ESCOPO

${form.flightSummary ? `**Logística Aérea / Transporte:**\n${form.flightSummary}\n` : ""}
${form.hotelSummary ? `**Hospedagem / Infraestrutura:**\n${form.hotelSummary}\n` : ""}
${form.itineraryNotes ? `**Notas de Roteiro:**\n${form.itineraryNotes}\n` : ""}

---

## 3. PASSAGEIROS & CHECKLISTS OPERACIONAIS

| # | Nome Completo | Documento / CPF | Nascimento | Perfil |
| :---: | :--- | :--- | :--- | :--- |
${passengersRows}

### Andamento dos Checklists
${checklistLines}

${
  customFieldLines
    ? `---\n\n## 4. CAMPOS AVANÇADOS PERSONALIZADOS\n\n| Campo | Valor |\n| :--- | :--- |\n${customFieldLines}`
    : ""
}`;
  }

  // Fallback / Proposta / Voucher Markdown compilado
  return `## 1. ESCOPO & SERVIÇOS INCLUSOS

${form.includedItemsText || "- Consultoria personalizada e acompanhamento completo durante toda a operação."}

${
  form.excludedItemsText
    ? `### Itens Não Inclusos\n${form.excludedItemsText}\n`
    : ""
}

---

## 2. CRONOGRAMA & LOGÍSTICA

${form.flightSummary ? `- **Transporte / Aéreo:** ${form.flightSummary}` : ""}
${form.hotelSummary ? `- **Hospedagem / Objeto:** ${form.hotelSummary}` : ""}
${form.itineraryNotes ? `\n${form.itineraryNotes}` : ""}

---

## 3. INVESTIMENTO E CONDIÇÕES

| Rubrica | Vencimento / Referência | Valor | Status |
| :--- | :--- | ---: | :--- |
${financialRows}

**Total da Proposta:** ${totalFormatted}  
**Condições Comerciais:** ${form.paymentConditions || "Sujeito à disponibilidade tarifária no ato da emissão."}`;
}

/**
 * Adapta os campos do Studio Unificado para os templates comerciais canônicos
 * (`BudgetCorporateClean` e `ProposalEditorialAgency`).
 */
export function buildCommercialDocumentDataAdapter(
  form: DocumentStudioFormState,
  tenant: TenantDocumentIdentity,
): CommercialDocumentData {
  const items =
    form.financialRows.length > 0
      ? form.financialRows.map((row, idx) => ({
          id: `studio-item-${idx + 1}`,
          title: row.label || `Item ${idx + 1} — ${form.destination || form.title}`,
          description: row.dueDate ? `Referência / Vencimento: ${row.dueDate}` : form.hotelSummary || undefined,
          quantity: 1,
          unitPriceCents: row.amountCents || 0,
          totalPriceCents: row.amountCents || 0,
        }))
      : [
          {
            id: "studio-item-main",
            title: form.destination || form.title || "Pacote / Serviço Principal",
            description:
              [
                `Período: ${buildFormattedPeriod(form.startDate, form.endDate)}`,
                form.hotelSummary,
                form.flightSummary,
              ]
                .filter(Boolean)
                .join(" | ") || undefined,
            quantity: Math.max(1, form.adultsCount + form.childrenCount),
            unitPriceCents: Math.round(
              (form.totalCents || 0) / Math.max(1, form.adultsCount + form.childrenCount),
            ),
            totalPriceCents: form.totalCents || 0,
          },
        ];

  const sumCents = items.reduce((acc, item) => acc + (item.totalPriceCents || 0), 0);
  const effectiveTotal = form.totalCents > 0 ? form.totalCents : sumCents;

  const includedList = form.includedItemsText
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
  const excludedList = form.excludedItemsText
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  return {
    id: form.protocolCode || "studio-doc",
    code: form.protocolCode || "PROP-001",
    title: form.title || `Proposta Comercial — ${form.destination || "Atendimento"}`,
    category: "proposal",
    status: "draft",
    issueDate: form.issueDate || new Date().toLocaleDateString("pt-BR"),
    validUntilDate: form.validUntilDate || "7 dias úteis",
    issuer: {
      companyName: tenant.companyName,
      tradingName: tenant.tradingName,
      cnpjOrCpf: tenant.documentNumber || "Emissor Verificado",
      address: tenant.address,
      cityState: tenant.cityState,
      phoneOrWhatsapp: tenant.phone,
      email: tenant.email,
      logoUrl: tenant.logoUrl || undefined,
      pixKey: tenant.pixKey || undefined,
    },
    client: {
      name: form.clientName || "Cliente a definir",
      companyName: form.clientCompany || undefined,
      cnpjOrCpf: form.clientDocument || "Não informado",
      address: form.clientAddress || undefined,
      email: form.clientEmail || undefined,
      phone: form.clientPhone || undefined,
    },
    items,
    stages: form.itineraryNotes
      ? [
          {
            step: 1,
            title: form.destination || "Escopo Principal",
            description: form.itineraryNotes,
            duration: buildFormattedPeriod(form.startDate, form.endDate),
            deliverables: includedList.slice(0, 6),
          },
        ]
      : undefined,
    subtotalCents: effectiveTotal,
    discountCents: 0,
    totalCents: effectiveTotal,
    paymentTerms: {
      method: form.paymentMethod || "PIX / Cartão / Boleto",
      installmentsCount: form.installmentsCount || 1,
      installmentValueCents: Math.round(effectiveTotal / Math.max(1, form.installmentsCount || 1)),
      notes:
        form.paymentConditions ||
        `${form.installmentsCount || 1}x via ${form.paymentMethod || "A combinar"}`,
      pixKey: tenant.pixKey || undefined,
      paymentInstructions: tenant.paymentInstructions || undefined,
    },
    legalNotes: form.markdownBody || undefined,
  };
}

function mapPresentationPageToEditableSlide(
  page: PreBoardingPresentationPage,
  index: number,
): EditablePresentationSlide {
  return {
    id: `slide-${index + 1}-${page.moduleKey}`,
    pageNumber: index + 1,
    moduleKey: page.moduleKey,
    eyebrow: page.eyebrow,
    title: page.title,
    subtitle: page.subtitle,
    humanNarrative: page.humanNarrative,
    cards: (page.cards || []).map((c) => ({
      label: c.label,
      value: c.value,
      practicalExplanation: c.practicalExplanation,
      badge: c.badge,
    })),
    steps: page.steps
      ? page.steps.map((s) => ({
          stepNumber: s.stepNumber,
          title: s.title,
          explanation: s.explanation,
          badge: s.badge,
        }))
      : undefined,
  };
}

export function buildInitialEditableSlides(
  templateId: string,
  form: DocumentStudioFormState,
  tenant: TenantDocumentIdentity,
): EditablePresentationSlide[] {
  const totalGuests = Math.max(1, (form.adultsCount || 1) + (form.childrenCount || 0));
  const perPersonCents = Math.round((form.totalCents || 0) / totalGuests);
  const includedList = (form.includedItemsText || "")
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  if (templateId === "apresentacao_corporativa_pitch") {
    const pitchSlides: EditablePresentationSlide[] = [
      {
        id: "slide-1-cover",
        pageNumber: 1,
        moduleKey: "cover",
        eyebrow: `Apresentação Comercial • ${tenant.companyName}`,
        title: form.title || `Proposta Executiva para ${form.clientName || "Cliente"}`,
        subtitle:
          form.subtitle ||
          `Curadoria, planejamento estratégico e atendimento dedicado por ${tenant.companyName}`,
        humanNarrative: `Preparamos esta apresentação comercial sob medida para ${form.clientName || "você"}, consolidando o escopo completo, cronograma, garantias operacionais e condições exclusivas de contratação.`,
        highlightMetric: form.totalCents > 0 ? formatMoney(form.totalCents) : "Sob Medida",
        cards: [
          {
            label: "Proponente / Emissor",
            value: tenant.companyName,
            practicalExplanation: [tenant.documentNumber, tenant.registryCode, tenant.cityState]
              .filter(Boolean)
              .join(" • ") || "Atendimento corporativo e consultivo verificado.",
            badge: "Brand Kit Ativo",
          },
          {
            label: "Cliente / Destinatário",
            value: form.clientName || "Cliente Titular",
            practicalExplanation: [form.clientCompany, form.clientPhone, form.clientEmail]
              .filter(Boolean)
              .join(" • ") || "Proposta personalizada com validade garantida.",
            badge: `Protocolo ${form.protocolCode || "PROP-001"}`,
          },
          {
            label: "Escopo / Destino",
            value: form.destination || "Projeto & Operação",
            practicalExplanation: `Período planejado: ${buildFormattedPeriod(form.startDate, form.endDate)}`,
            badge: `${totalGuests} participante(s)`,
          },
        ],
      },
      {
        id: "slide-2-scope",
        pageNumber: 2,
        moduleKey: "trip_overview",
        eyebrow: "Escopo & Entregáveis",
        title: "Arquitetura da Solução e Diferenciais Inclusos",
        subtitle: "Cada etapa foi desenhada para eliminar imprevistos e maximizar a experiência",
        humanNarrative:
          form.itineraryNotes ||
          "Nossa operação combina acompanhamento ativo antes, durante e após a execução, garantindo transparência total em cada entregável contratado.",
        cards: (includedList.length > 0
          ? includedList.slice(0, 4).map((item, idx) => ({
              label: `Entregável 0${idx + 1}`,
              value: item,
              practicalExplanation: `Item contemplado integralmente no escopo de ${tenant.companyName}.`,
              badge: "Incluso",
            }))
          : [
              {
                label: "Logística & Transporte",
                value: form.flightSummary || "Planejamento logístico otimizado",
                practicalExplanation: "Coordenação completa de horários, conexões e deslocamentos.",
                badge: "Logística",
              },
              {
                label: "Hospedagem & Estrutura",
                value: form.hotelSummary || "Seleção curada com padrão superior",
                practicalExplanation: "Conforto, localização estratégica e suporte 24/7.",
                badge: "Estrutura",
              },
              {
                label: "Suporte Dedicado",
                value: tenant.phone || tenant.email || "Canal Direto VIP",
                practicalExplanation: "Equipe de plantão para ajustes, remarcações e assistência.",
                badge: "Concierge",
              },
            ]),
      },
      {
        id: "slide-3-timeline",
        pageNumber: 3,
        moduleKey: "boarding_flow",
        eyebrow: "Jornada & Cronograma",
        title: "Etapas de Execução e Governança",
        subtitle: "Fluxo claro do aceite comercial até a entrega final",
        humanNarrative:
          "Trabalhamos com marcos operacionais bem definidos para que você acompanhe cada confirmação com segurança.",
        cards: [
          {
            label: "Período de Execução",
            value: buildFormattedPeriod(form.startDate, form.endDate),
            practicalExplanation: "Datas bloqueadas conforme disponibilidade atual da cotação.",
          },
          {
            label: "Validade da Proposta",
            value: form.validUntilDate || "7 dias úteis",
            practicalExplanation: "Tarifas e disponibilidade sujeitas a confirmação no ato da emissão.",
          },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Aprovação da Proposta & Escolha da Condição",
            explanation: "Validação do escopo e confirmação da forma de pagamento escolhida.",
            badge: "Etapa 1",
          },
          {
            stepNumber: 2,
            title: "Emissão Oficial de Reservas & Contratos",
            explanation: "Envio imediato de localizadores, bilhetes, vouchers e instrumento contratual.",
            badge: "Etapa 2",
          },
          {
            stepNumber: 3,
            title: "Alinhamento Pré-Operação & Suporte 24h",
            explanation: "Entrega do guia completo e acompanhamento ativo até a conclusão.",
            badge: "Etapa 3",
          },
        ],
      },
      {
        id: "slide-4-investment",
        pageNumber: 4,
        moduleKey: "commercial_investment",
        eyebrow: "Quadro Financeiro & Condições",
        title: "Investimento e Formas de Pagamento",
        subtitle: `Condições exclusivas emitidas por ${tenant.companyName}`,
        humanNarrative:
          form.paymentConditions ||
          "Oferecemos flexibilidade de parcelamento e faturamento transparente para viabilizar sua decisão com total previsibilidade.",
        highlightMetric: formatMoney(form.totalCents || 0),
        cards: [
          {
            label: "Investimento Total",
            value: formatMoney(form.totalCents || 0),
            practicalExplanation: `Valor global para ${totalGuests} participante(s) (${formatMoney(perPersonCents)} por pessoa).`,
            badge: "Total Geral",
          },
          {
            label: "Entrada / Sinal",
            value: form.entryCents > 0 ? formatMoney(form.entryCents) : "A combinar",
            practicalExplanation: `Saldo em até ${form.installmentsCount || 1}x via ${form.paymentMethod || "PIX ou Cartão"}.`,
            badge: `${form.installmentsCount || 1}x`,
          },
          {
            label: "Chave PIX / Faturamento",
            value: tenant.pixKey || tenant.documentNumber || tenant.phone || "Consulte o emissor",
            practicalExplanation:
              tenant.paymentInstructions ||
              `Confirmação imediata mediante envio do comprovante para ${tenant.companyName}.`,
            badge: "Pagamento Seguro",
          },
        ],
      },
    ];
    return pitchSlides;
  }

  const isInternational = Boolean(
    form.destination &&
      /(europa|paris|londres|orlando|miami|nova york|lisboa|madrid|roma|dubai|cancun|santiago|buenos aires|bariloche|punta cana|exterior|internacional)/i.test(
        form.destination,
      ),
  );

  const generated = generateDynamicTravelPresentation({
    presentationType: templateId === "guia_pre_embarque_169" ? "pre_boarding_guide" : "commercial_quote",
    locale: "pt-BR",
    tripTitle:
      form.title ||
      (form.destination ? `Apresentação — ${form.destination}` : "Apresentação Executiva"),
    conceptSubtitle:
      form.subtitle ||
      `Preparado por ${tenant.companyName} especialmente para ${form.clientName || "você"}`,
    travelerProfileType: "casal",
    passengersNames:
      form.passengers.length > 0
        ? form.passengers.map((p) => p.name).filter(Boolean)
        : [form.clientName || "Passageiro Titular"],
    adultsCount: form.adultsCount || 1,
    childrenCount: form.childrenCount || 0,
    startDate: form.startDate || new Date().toISOString().slice(0, 10),
    endDate: form.endDate || form.startDate || new Date().toISOString().slice(0, 10),
    originCity: "Origem a definir",
    destinations: [form.destination || "Destino Selecionado"],
    countries: [isInternational ? "Internacional" : "Brasil"],
    agencyName: tenant.companyName,
    agencyEmergencyPhone: tenant.phone || tenant.email || "",
    flights: form.flightSummary
      ? [
          {
            direction: "ida",
            date: form.startDate || "2026-11-20",
            airline: "Companhia Aérea",
            flightNumber: "VOO-101",
            originIata: "ORIG",
            destinationIata: (form.destination || "DEST").slice(0, 3).toUpperCase(),
            departureTime: "08:00",
            arrivalTime: "11:30",
            durationText: "03h30",
            sameTicket: true,
            carryOnBagRule: form.flightSummary,
          },
        ]
      : [],
    hotels: form.hotelSummary
      ? [
          {
            name: form.hotelSummary,
            city: form.destination || "Destino Principal",
            address: form.destination || "Localização Principal",
            checkInTime: "14:00",
            checkOutTime: "12:00",
            mealPlan: "Conforme proposta",
          },
        ]
      : [],
    hasReceptiveTransfer: false,
    commercialPriceTotalCents: form.totalCents || undefined,
    commercialPaymentConditions: form.paymentConditions || undefined,
  });

  const baseSlides = generated.pages.map((page, index) =>
    mapPresentationPageToEditableSlide(page, index),
  );

  // Para os decks comerciais (editorial_deck / dark_luxury_deck), garante slide de Investimento & Condições Comerciais no fechamento
  if (templateId !== "guia_pre_embarque_169") {
    const commercialSlide: EditablePresentationSlide = {
      id: `slide-${baseSlides.length + 1}-commercial_investment`,
      pageNumber: baseSlides.length + 1,
      moduleKey: "commercial_investment",
      eyebrow: `Proposta Comercial • ${tenant.companyName}`,
      title: `Investimento & Condições — ${form.destination || "Viagem"}`,
      subtitle: `Cotação preparada para ${form.clientName || "você"} com validade até ${form.validUntilDate || "7 dias úteis"}`,
      humanNarrative:
        form.paymentConditions ||
        `Planejamento completo por ${tenant.companyName} incluindo acompanhamento especializado e suporte em todas as etapas da viagem.`,
      highlightMetric: formatMoney(form.totalCents || 0),
      cards: [
        {
          label: "Investimento Total do Pacote",
          value: formatMoney(form.totalCents || 0),
          practicalExplanation: `Valor para ${totalGuests} passageiro(s) (${formatMoney(perPersonCents)} por passageiro).`,
          badge: "Valor Oficial",
        },
        {
          label: "Parcelamento & Sinal",
          value:
            form.entryCents > 0
              ? `Entrada de ${formatMoney(form.entryCents)} + ${form.installmentsCount || 1}x`
              : `Em até ${form.installmentsCount || 1}x via ${form.paymentMethod || "PIX / Cartão"}`,
          practicalExplanation:
            form.paymentConditions || "Condições sujeitas a disponibilidade no ato da confirmação.",
          badge: form.paymentMethod || "Flexível",
        },
        {
          label: "Itens Inclusos na Curadoria",
          value:
            includedList.length > 0
              ? includedList.slice(0, 3).join(" • ")
              : [form.flightSummary, form.hotelSummary].filter(Boolean).join(" • ") ||
                "Roteiro personalizado e suporte da agência",
          practicalExplanation: `Emitido por ${tenant.companyName} (${tenant.phone || tenant.email || "Atendimento Verificado"}).`,
          badge: "Garantia Waesy",
        },
      ],
    };

    // No modo comercial enxuto, prioriza os slides mais decisivos para fechamento (até 7 slides iniciais + comercial)
    const prioritized = baseSlides.slice(0, 7);
    return [...prioritized, { ...commercialSlide, pageNumber: prioritized.length + 1 }];
  }

  return baseSlides;
}

export function buildTravelProposalDtoFromStudio(
  form: DocumentStudioFormState,
  tenant: TenantDocumentIdentity,
  cmsConfig: DocumentStudioCmsConfig,
  templateMeta?: DocumentStudioTemplateMeta,
): TravelProposalDTO {
  const totalGuests = Math.max(1, (form.adultsCount || 1) + (form.childrenCount || 0));
  const totalPriceReais = Number(((form.totalCents || 0) / 100).toFixed(2));
  const pricePerPersonReais = Number((totalPriceReais / totalGuests).toFixed(2));
  const entryReais = Number(((form.entryCents || 0) / 100).toFixed(2));

  const includedList = (form.includedItemsText || "")
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
  const excludedList = (form.excludedItemsText || "")
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  const resolvedTheme =
    templateMeta?.proposalTemplateTheme ||
    (templateMeta?.presentationVariant === "bento_canvas"
      ? "bento-grid"
      : templateMeta?.presentationVariant === "landscape_canvas"
        ? "landscape-presentation"
        : templateMeta?.presentationVariant === "dark_luxury_deck"
          ? "dark-premium"
          : "landscape-presentation");

  const nowIso = new Date().toISOString();
  const totalCents = form.totalCents || 0;
  const perPersonCents = Math.round(totalCents / totalGuests);
  const installmentCount = Math.max(1, form.installmentsCount || 1);
  const installmentValueCents = Math.round(Math.max(0, totalCents - (form.entryCents || 0)) / installmentCount);

  return {
    id: form.protocolCode || "studio-presentation",
    quote_id: form.protocolCode || "studio-quote",
    public_token: (form.protocolCode || "apresentacao").toLowerCase(),
    title: form.title || `Apresentação Comercial — ${form.destination || "Experiência"}`,
    subtitle:
      form.subtitle ||
      `Preparado por ${tenant.companyName} especialmente para ${form.clientName || "você"}`,
    client_name: form.clientName || "Viajante",
    client_whatsapp: form.clientPhone || "",
    client_email: form.clientEmail || null,
    client_document: form.clientDocument || null,
    adults_count: form.adultsCount || totalGuests,
    children_count: form.childrenCount || 0,
    destination_city: form.destination || "Destino Selecionado",
    travel_start_date: form.startDate || null,
    travel_end_date: form.endDate || null,
    cover_image_url: null,
    agency_name: tenant.companyName,
    agency_logo_url: tenant.logoUrl,
    agency_whatsapp: tenant.phone || null,
    agency_phone: tenant.phone || null,
    agency_email: tenant.email || null,
    template_theme: resolvedTheme,
    canvas_format: cmsConfig.format || templateMeta?.defaultFormat || "presentation-169",
    custom_fields: {
      canvas_bg_color: cmsConfig.canvasBg || undefined,
      canvas_brand_color: cmsConfig.brandColor || tenant.brandColor || undefined,
      canvas_font_preset: cmsConfig.fontPreset,
      custom_per_person_cents: perPersonCents,
    },
    status: "sent",
    valid_until: form.validUntilDate || null,
    special_notes:
      form.itineraryNotes ||
      `Atendimento consultivo ${tenant.companyName} • ${[tenant.phone, tenant.email, tenant.registryCode].filter(Boolean).join(" • ")}`,
    flights: form.flightSummary
      ? [
          {
            id: "flt-1",
            type: "outbound",
            airline: "Malha Aérea Selecionada",
            flight_number: form.protocolCode || "VOO-1",
            origin: "ORIG",
            origin_iata: "ORIG",
            destination: (form.destination || "DEST").slice(0, 3).toUpperCase(),
            destination_iata: (form.destination || "DEST").slice(0, 3).toUpperCase(),
            departure_date: form.startDate || "2026-11-20",
            departure_time: "08:00",
            arrival_time: "11:15",
            baggage: form.flightSummary,
            cabin_class: "Econômica / Executiva",
          },
        ]
      : [],
    hotels: form.hotelSummary
      ? [
          {
            id: "htl-1",
            hotel_name: form.hotelSummary,
            stars: 5,
            destination: form.destination || "Localização Privilegiada",
            checkin_date: form.startDate || "Check-in flexível",
            checkout_date: form.endDate || "Check-out garantido",
            nights_count: 5,
            room_type: "Suíte Selecionada",
            board_basis: "Café da Manhã / All-Inclusive",
            images: [],
          },
        ]
      : [],
    itinerary: [
      {
        day_number: 1,
        title: `Chegada e Recepção em ${form.destination || "Destino"}`,
        description:
          form.itineraryNotes ||
          "Embarque assistido, recepção no destino e acomodação com suporte integral da nossa equipe.",
        included_meals: ["Café da manhã"],
      },
      {
        day_number: 2,
        title: "Experiências Principais & Curadoria Local",
        description:
          includedList.slice(0, 3).join(" • ") ||
          "Programação personalizada conforme perfil dos viajantes, com flexibilidade e assistência.",
        included_meals: ["Café da manhã"],
      },
    ],
    transfers: [],
    tours: [],
    rooms: [],
    includes:
      includedList.length > 0
        ? includedList
        : [
            form.flightSummary || "Logística de transporte planejada",
            form.hotelSummary || "Hospedagem selecionada pela curadoria",
            `Suporte e concierge dedicado ${tenant.companyName}`,
          ],
    excludes:
      excludedList.length > 0
        ? excludedList
        : ["Despesas de caráter estritamente pessoal", "Itens não mencionados como inclusos"],
    pricing: {
      currency: "BRL",
      base_price_cents: totalCents,
      boarding_tax_cents: 0,
      other_taxes_cents: 0,
      discount_cents: 0,
      total_price_cents: totalCents,
      total_cents: totalCents,
      installments_options: [
        {
          installments_count: installmentCount,
          installment_value_cents: installmentValueCents,
          method: form.paymentMethod || "Cartão / Boleto",
          has_interest: false,
        },
      ],
      payment_terms:
        form.paymentConditions ||
        `Entrada + saldo em até ${form.installmentsCount || 10}x via ${form.paymentMethod || "PIX, Boleto ou Cartão"}.`,
      custom_fields: {
        custom_per_person_cents: perPersonCents,
        price_per_person_reais: pricePerPersonReais,
        total_price_reais: totalPriceReais,
        entry_reais: entryReais,
      },
    },
    created_at: nowIso,
    updated_at: nowIso,
  };
}
