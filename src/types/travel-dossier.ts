/**
 * Contrato Canônico de Dossiês de Passageiros & Pastas de Viajante (CRM Turismo & Multimodal)
 * Alinhado com as Diretrizes AGENTS.md, ICAO 9303, Anvisa CIVP e Auditoria Consular INA 214b.
 */

export const LEAD_SOURCES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "balcao", label: "Balcão / Loja Física" },
  { value: "instagram", label: "Instagram" },
  { value: "google_ads", label: "Google Ads" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site / Biolink" },
  { value: "outros", label: "Outros" },
] as const;

export type ServiceTemplateType =
  | "pacote_viagem"
  | "assessoria_visto"
  | "corporativo_aereo"
  | "avulso";

export const SERVICE_TEMPLATE_LABELS: Record<ServiceTemplateType, { label: string; desc: string }> = {
  pacote_viagem: {
    label: "Pacote Turístico Completo",
    desc: "Aéreo, hospedagem, transfers, seguro viagem e passeios terrestres.",
  },
  assessoria_visto: {
    label: "Assessoria de Visto Consular",
    desc: "Formulário DS-160, taxa consular, agendamento CASV e análise de vínculos de até 12 meses.",
  },
  corporativo_aereo: {
    label: "Aéreo & Corporativo",
    desc: "Passagens, localizadores GDS, milhagem corporativa e bilhetes emitidos.",
  },
  avulso: {
    label: "Serviço Avulso / Seguro",
    desc: "Apenas seguro viagem, locação de veículos, transfers ou ingressos avulsos.",
  },
};

export interface TravelerAddress {
  zip_code: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  utility_bill_file_url?: string | null;
  proof_url?: string;
  utility_bill_verified: boolean;
}

export type TravelerDocumentType =
  | "rg_front"
  | "rg_back"
  | "cnh"
  | "passport_page"
  | "utility_bill"
  | "civp_vaccine"
  | "eticket"
  | "ds160_confirmation"
  | "income_tax"
  | "other";

export interface TravelerDocumentItem {
  id: string;
  type: TravelerDocumentType;
  label: string;
  file_url?: string | null;
  status: "pendente" | "enviado" | "validado" | "rejeitado";
  ocr_extracted_data?: Record<string, any> | null;
  uploaded_at?: string;
  verified_at?: string;
}

export type ConsularVisaStatus =
  | "pendente_documentos"
  | "formulario_preenchido"
  | "taxa_paga"
  | "agendamento_marcado"
  | "em_analise_consular"
  | "exigencia_documentos"
  | "aprovado"
  | "negado";

export const CONSULAR_VISA_STATUS_LABELS: Record<ConsularVisaStatus, { label: string; color: string }> = {
  pendente_documentos: { label: "1. Coleta de Documentos", color: "bg-muted text-muted-foreground" },
  formulario_preenchido: { label: "2. DS-160 / Rascunho Preenchido", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  taxa_paga: { label: "3. Taxa Consular Paga (MRV)", color: "bg-warning/10 text-warning-strong" },
  agendamento_marcado: { label: "4. CASV & Entrevista Agendada", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  em_analise_consular: { label: "5. Em Análise Consular", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  exigencia_documentos: { label: "Exigência Documental (221g)", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  aprovado: { label: "Visto Aprovado & Emitido", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  negado: { label: "Visto Negado / Indeferido", color: "bg-destructive/10 text-destructive" },
};

export interface TravelerVisaItem {
  id: string;
  country: string; // Ex: "Estados Unidos", "Canadá", "Espaço Schengen / ETIAS", "Japão"
  category: string; // Ex: "B1/B2 Turismo/Negócios", "F1 Estudante", "ETIAS Autorização"
  protocol_number?: string; // Código CEAC DS-160 ex: AA00XXXXXX
  status: ConsularVisaStatus;
  casv_appointment_date?: string; // Data agendamento biometria CASV
  consulate_appointment_date?: string; // Data entrevista no Consulado
  interview_date?: string;
  issued_expiry_date?: string;
  denial_reason?: string;
  notes?: string;
}

export interface TravelerVaccineItem {
  yellow_fever_civp: boolean;
  yellow_fever_date?: string;
  covid_doses_count: number;
  vaccine_certificate_url?: string | null;
  compliance_notes?: string;
}

export interface TravelerLogisticsItem {
  airline_pnr?: string; // Localizador de reserva aérea (6 letras)
  eticket_number?: string; // Bilhete eletrônico (13 dígitos)
  airline_name?: string;
  frequent_flyer_number?: string;
  seat_preference?: "janela" | "corredor" | "indiferente";
  hotel_voucher_code?: string;
  transfer_voucher_code?: string;
}

export interface TravelerDossier {
  id: string;
  is_primary: boolean;
  relationship: "titular" | "conjuge" | "filho" | "parente" | "amigo" | "colega" | "outro";
  full_name: string;
  civil_name_previous?: string; // Nome civil anterior em caso de casamento / divórcio auditado
  birth_date: string;
  gender: "M" | "F" | "outro";
  nationality: string;
  document_cpf: string;
  document_rg: string;
  rg_issuer: string;
  passport_number: string;
  passport_issuing_country: string;
  passport_issue_date: string;
  passport_expiry_date: string;
  phone: string;
  email: string;
  address: TravelerAddress;
  documents: TravelerDocumentItem[];
  visas: TravelerVisaItem[];
  vaccines: TravelerVaccineItem;
  logistics: TravelerLogisticsItem;
  customer_id?: string | null;
  customer_linked: boolean;
  is_verified: boolean;
  role?: string;
  cpf?: string;
  rg?: string;
  consular_visa_status?: string;
  consular_visa_expiry_date?: string;
  ds160_ties_analysis?: any;
  yellow_fever_vaccine_verified?: boolean;
  covid_vaccine_verified?: boolean;
}

export interface DossierAuditLogEntry {
  id: string;
  timestamp: string;
  author: string;
  event_type:
    | "traveler_added"
    | "traveler_removed"
    | "name_change"
    | "document_verified"
    | "ocr_extracted"
    | "visa_status_updated"
    | "customer_promoted"
    | "field_updated";
  description: string;
  previous_value?: string;
  new_value?: string;
}
