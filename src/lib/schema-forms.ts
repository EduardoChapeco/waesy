/**
 * schema-forms.ts — Motor Canônico de Formulários Schema-Driven por Nicho (P33)
 *
 * Fornece geração declarativa, versionamento imutável de respostas e conformidade com LGPD
 * para formulários de captura, briefings, fichas de cadastro e triagens de nicho.
 *
 * Invariantes: M01, M08, M10 | Checks: C20, C25 | Prompt: P33
 */

import { NicheId } from "@/lib/niche-manifest";

export type FormFieldType =
  | "text"
  | "number"
  | "decimal"
  | "date"
  | "tel"
  | "document"
  | "select"
  | "checkbox"
  | "textarea"
  | "consent_lgpd";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldCondition {
  fieldId: string;
  operator: "equals" | "not_equals" | "contains";
  value: any;
}

export interface FormFieldDef {
  id: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  options?: FormFieldOption[];
  condition?: FormFieldCondition;
  min?: number;
  max?: number;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
}

export interface FormSchemaDef {
  id: string;
  version: number;
  niche: NicheId;
  title: string;
  description?: string;
  fields: FormFieldDef[];
  lgpdConsent?: {
    required: boolean;
    termsText: string;
    policyUrl?: string;
  };
}

export interface FormSubmissionPayload {
  schemaId: string;
  schemaVersion: number;
  storeId: string;
  entityId?: string;
  respondentId?: string;
  answers: Record<string, any>;
  lgpdAcceptedAt?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const NICHE_FORM_TEMPLATES: Record<string, FormSchemaDef> = {
  // Turismo: Ficha de Preferências do Viajante e Documentos
  "tourism-traveler-intake": {
    id: "tourism-traveler-intake",
    version: 1,
    niche: "tourism",
    title: "Ficha de Cadastro do Viajante",
    description: "Coleta segura de dados para emissão de passagens, seguros e reservas.",
    fields: [
      { id: "full_name", label: "Nome Completo (Conforme Documento)", type: "text", required: true },
      { id: "document_number", label: "CPF ou Passaporte", type: "document", required: true },
      { id: "birth_date", label: "Data de Nascimento", type: "date", required: true },
      { id: "phone", label: "WhatsApp de Contato", type: "tel", required: true, inputMode: "tel" },
      {
        id: "room_preference",
        label: "Preferência de Acomodação",
        type: "select",
        required: true,
        options: [
          { label: "Quarto Duplo (Cama de Casal)", value: "double" },
          { label: "Quarto Duplo (Duas Camas de Solteiro)", value: "twin" },
          { label: "Quarto Individual", value: "single" },
          { label: "Quarto Triplo", value: "triple" },
        ],
      },
      { id: "dietary_restrictions", label: "Restrições Alimentares ou Alergias", type: "text", placeholder: "Ex: Celíaco, Vegano, Sem lactose" },
      { id: "medical_notes", label: "Observações Médicas ou de Mobilidade", type: "textarea" },
    ],
    lgpdConsent: {
      required: true,
      termsText: "Autorizo o processamento dos meus dados para fins de emissão de bilhetes aéreos, vouchers e seguros de viagem conforme a LGPD.",
      policyUrl: "/termos/privacidade",
    },
  },

  // Gastronomia: Reserva Especial & Evento Fechado
  "gastronomy-event-booking": {
    id: "gastronomy-event-booking",
    version: 1,
    niche: "gastronomy",
    title: "Reserva para Grupos e Eventos",
    description: "Planejamento personalizado para aniversários, confraternizações e jantares corporativos.",
    fields: [
      { id: "contact_name", label: "Nome do Responsável", type: "text", required: true },
      { id: "contact_phone", label: "Telefone de Contato", type: "tel", required: true, inputMode: "tel" },
      { id: "event_date", label: "Data Pretendida", type: "date", required: true },
      { id: "guest_count", label: "Quantidade de Convidados", type: "number", required: true, min: 1, inputMode: "numeric" },
      {
        id: "menu_preference",
        label: "Modalidade de Cardápio",
        type: "select",
        required: true,
        options: [
          { label: "À La Carte no Salão", value: "a_la_carte" },
          { label: "Menu Degustação em Etapas", value: "tasting_menu" },
          { label: "Buffet Exclusivo", value: "buffet" },
          { label: "Rodízio / Open Bar", value: "open_bar" },
        ],
      },
      { id: "special_requests", label: "Pedidos Especiais / Decoração", type: "textarea" },
    ],
    lgpdConsent: {
      required: true,
      termsText: "Concordo em receber confirmações de reserva e contatos da equipe de atendimento por telefone e WhatsApp.",
    },
  },

  // Imobiliária: Ficha de Qualificação do Comprador / Locatário
  "real-estate-buyer-qualification": {
    id: "real-estate-buyer-qualification",
    version: 1,
    niche: "real_estate",
    title: "Perfil de Busca do Imóvel",
    description: "Mapeamento das preferências e capacidade para envio de imóveis aderentes.",
    fields: [
      { id: "client_name", label: "Nome do Cliente", type: "text", required: true },
      { id: "client_phone", label: "WhatsApp", type: "tel", required: true, inputMode: "tel" },
      {
        id: "deal_type",
        label: "Objetivo",
        type: "select",
        required: true,
        options: [
          { label: "Comprar Imóvel", value: "buy" },
          { label: "Alugar Imóvel", value: "rent" },
          { label: "Investimento / Renda", value: "invest" },
        ],
      },
      {
        id: "property_type",
        label: "Tipo de Imóvel",
        type: "select",
        required: true,
        options: [
          { label: "Apartamento", value: "apartment" },
          { label: "Casa em Condomínio", value: "gated_house" },
          { label: "Casa Urbana", value: "house" },
          { label: "Sala Comercial / Galpão", value: "commercial" },
          { label: "Terreno / Lote", value: "land" },
        ],
      },
      { id: "target_neighborhood", label: "Bairros de Preferência", type: "text", required: true },
      { id: "budget_max", label: "Orçamento Máximo Estimado (R$)", type: "decimal", required: true, inputMode: "decimal" },
    ],
    lgpdConsent: {
      required: true,
      termsText: "Autorizo o contato de corretores credenciados para apresentação de ofertas compatíveis com meu perfil.",
    },
  },

  // Saúde / Estética: Ficha de Anamnese Inicial
  "healthcare-initial-intake": {
    id: "healthcare-initial-intake",
    version: 1,
    niche: "healthcare",
    title: "Triagem e Anamnese Preliminar",
    description: "Informações essenciais para segurança do atendimento clínico ou estético.",
    fields: [
      { id: "patient_name", label: "Nome do Paciente", type: "text", required: true },
      { id: "patient_document", label: "CPF", type: "document", required: true },
      { id: "patient_phone", label: "Telefone de Emergência", type: "tel", required: true, inputMode: "tel" },
      { id: "has_allergies", label: "Possui Alergias Conhecidas?", type: "checkbox" },
      { id: "allergy_details", label: "Quais alergias?", type: "text", condition: { fieldId: "has_allergies", operator: "equals", value: true } },
      { id: "continuous_medication", label: "Medicamentos de Uso Contínuo", type: "textarea" },
    ],
    lgpdConsent: {
      required: true,
      termsText: "Declaro que as informações médicas prestadas são verdadeiras e autorizo o armazenamento seguro sob sigilo profissional.",
    },
  },

  // Serviços em Geral: Briefing de Projeto
  "services-project-briefing": {
    id: "services-project-briefing",
    version: 1,
    niche: "services",
    title: "Briefing do Projeto / Serviço",
    description: "Levantamento de escopo, prazo e entregáveis solicitados.",
    fields: [
      { id: "requester_name", label: "Nome do Solicitante / Empresa", type: "text", required: true },
      { id: "contact_email", label: "E-mail de Contato", type: "text", required: true, inputMode: "email" },
      { id: "service_title", label: "Título do Projeto", type: "text", required: true },
      { id: "expected_deadline", label: "Prazo Desejado de Conclusão", type: "date" },
      { id: "project_description", label: "Descrição Detalhada do Desafio", type: "textarea", required: true },
    ],
    lgpdConsent: {
      required: true,
      termsText: "Concordo com os termos de confidencialidade e tratamento de dados para elaboração da proposta técnica.",
    },
  },
};

/**
 * Validador puro de submissão contra schema
 */
export function validateFormSubmission(
  schema: FormSchemaDef,
  answers: Record<string, any>
): { isValid: boolean; errors: Record<string, string>; sanitizedData: Record<string, any> } {
  const errors: Record<string, string> = {};
  const sanitizedData: Record<string, any> = {};

  for (const field of schema.fields) {
    // Avalia visibilidade condicional
    if (field.condition) {
      const parentVal = answers[field.condition.fieldId];
      let matches = false;
      if (field.condition.operator === "equals") {
        matches = parentVal === field.condition.value;
      } else if (field.condition.operator === "not_equals") {
        matches = parentVal !== field.condition.value;
      } else if (field.condition.operator === "contains" && Array.isArray(parentVal)) {
        matches = parentVal.includes(field.condition.value);
      }
      if (!matches) {
        // Campo não visível, não valida
        continue;
      }
    }

    const val = answers[field.id];

    // Validação de obrigatoriedade
    if (field.required) {
      if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
        errors[field.id] = `O campo "${field.label}" é obrigatório.`;
        continue;
      }
    }

    // Validações por tipo
    if (val !== undefined && val !== null && val !== "") {
      if (field.type === "number") {
        const num = Number(val);
        if (isNaN(num)) {
          errors[field.id] = "Insira um número válido.";
        } else if (field.min !== undefined && num < field.min) {
          errors[field.id] = `O valor mínimo é ${field.min}.`;
        } else if (field.max !== undefined && num > field.max) {
          errors[field.id] = `O valor máximo é ${field.max}.`;
        } else {
          sanitizedData[field.id] = num;
        }
      } else if (field.type === "decimal") {
        const num = typeof val === "string" ? parseFloat(val.replace(/\./g, "").replace(",", ".")) : Number(val);
        if (isNaN(num)) {
          errors[field.id] = "Insira um valor numérico válido.";
        } else {
          sanitizedData[field.id] = num;
        }
      } else {
        sanitizedData[field.id] = typeof val === "string" ? val.trim() : val;
      }
    }
  }

  // Validação de consentimento LGPD
  if (schema.lgpdConsent?.required && !answers.__lgpdConsent) {
    errors.__lgpdConsent = "É necessário aceitar os termos de consentimento para continuar.";
  } else if (answers.__lgpdConsent) {
    sanitizedData.__lgpdConsent = true;
    sanitizedData.__lgpdConsentAcceptedAt = new Date().toISOString();
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData,
  };
}
