/**
 * Canônico: Tipagem de Governança de Consentimentos, LGPD e Políticas Contratuais
 * Marco Civil da Internet (Lei 12.965/2014) e LGPD (Lei 13.709/2018).
 */

export type LegalPolicyType =
  | "privacy_policy"
  | "terms_of_service"
  | "quotation_policy"
  | "sensitive_data_policy"
  | "cancellation_policy"
  | "custom_store_policy";

export type ConsentStatus = "accepted" | "pending" | "revoked";

export type ConsentSubmissionMethod =
  | "quick_link"
  | "onboarding_form"
  | "physical_document"
  | "crm_operator";

export interface TelemetricAuditProof {
  ip_address: string;
  ip_address_hash: string;
  user_agent: string;
  session_id?: string | null;
  geolocation?: {
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
  sha256_hash: string;
  accepted_at: string;
  method: ConsentSubmissionMethod;
  certificate_code: string;
  operator_id?: string | null;
  operator_name?: string | null;
  physical_proof_url?: string | null;
}

export interface ConsentRecordItem {
  id: string;
  policy_type: LegalPolicyType;
  policy_title: string;
  policy_version: string;
  status: ConsentStatus;
  proof: TelemetricAuditProof | null;
  revoked_at?: string | null;
  revocation_reason?: string | null;
}

export interface LegalPolicyDescriptor {
  key: LegalPolicyType;
  title: string;
  shortDescription: string;
  category: "lgpd" | "commercial" | "sensitive_health" | "contractual";
  legalBasis: string;
  defaultVersion: string;
  isRequiredByDefault: boolean;
  defaultContent: string;
}

export const CANONICAL_LEGAL_POLICIES: Record<LegalPolicyType, LegalPolicyDescriptor> = {
  privacy_policy: {
    key: "privacy_policy",
    title: "Política de Privacidade & LGPD",
    shortDescription: "Tratamento de dados pessoais de acordo com a Lei 13.709/2018.",
    category: "lgpd",
    legalBasis: "Art. 7º, I c/c Art. 8º da Lei Geral de Proteção de Dados (Lei 13.709/2018)",
    defaultVersion: "v1.0",
    isRequiredByDefault: true,
    defaultContent:
      "Autorizo a coleta e o processamento de meus dados pessoais (nome, documentos, contatos e preferências) para fins exclusivos de atendimento, cotações, emissão de bilhetes, reservas e comunicações operacionais vinculadas aos serviços solicitados.",
  },
  quotation_policy: {
    key: "quotation_policy",
    title: "Política Comercial de Cotações",
    shortDescription: "Validade de tarifas aéreas, variação cambial e disponibilidade.",
    category: "commercial",
    legalBasis: "Código Civil Brasileiro e Resolução ANAC nº 400/2016",
    defaultVersion: "v1.0",
    isRequiredByDefault: true,
    defaultContent:
      "Estou ciente de que as tarifas aéreas, bloqueios hoteleiros e serviços cotados sofrem flutuação cambial diária e variação em tempo real pelos fornecedores, não garantindo reserva ou congelamento de preço até a emissão formal e confirmação do pagamento.",
  },
  sensitive_data_policy: {
    key: "sensitive_data_policy",
    title: "Consentimento de Dados Sensíveis",
    shortDescription: "Documentos consulares, PCD, mobilidade, saúde e passaportes.",
    category: "sensitive_health",
    legalBasis: "Art. 11, I e II da Lei 13.709/2018 (Dados Pessoais Sensíveis)",
    defaultVersion: "v1.0",
    isRequiredByDefault: false,
    defaultContent:
      "Consinto expressamente com o tratamento e transmissão estritamente necessária de dados de saúde, restrições alimentares, necessidades de acessibilidade/mobilidade reduzida e biometria/passaportes às companhias aéreas, consulados e operadoras responsáveis pela execução da viagem.",
  },
  cancellation_policy: {
    key: "cancellation_policy",
    title: "Política de Cancelamento & Reembolso",
    shortDescription: "Regras de no-show, prazos de retenção e multas de operadoras.",
    category: "contractual",
    legalBasis: "Código de Defesa do Consumidor (Lei 8.078/1990) e Deliberações EMBRATUR",
    defaultVersion: "v1.0",
    isRequiredByDefault: true,
    defaultContent:
      "Declaro ciência sobre as regras e prazos de cancelamento, multas contratuais aplicadas pelas companhias e operadoras em caso de desistência ou no-show, bem como as diretrizes de estorno e prazos operacionais para reembolso.",
  },
  terms_of_service: {
    key: "terms_of_service",
    title: "Termos Gerais de Intermediação",
    shortDescription: "Regras de intermediação de serviços turísticos e deveres mútuos.",
    category: "contractual",
    legalBasis: "Lei Geral do Turismo (Lei 11.771/2008)",
    defaultVersion: "v1.0",
    isRequiredByDefault: true,
    defaultContent:
      "Aceito as condições gerais de intermediação de serviços, reconhecendo a agência como intermediária autorizada junto a consolidadoras, companhias e redes de hospedagem, responsabilizando-me pela veracidade dos dados fornecidos.",
  },
  custom_store_policy: {
    key: "custom_store_policy",
    title: "Normas Internas da Agência",
    shortDescription: "Cláusulas particulares estabelecidas pela unidade de atendimento.",
    category: "contractual",
    legalBasis: "Liberdade Contratual (Art. 421 do Código Civil Brasileiro)",
    defaultVersion: "v1.0",
    isRequiredByDefault: false,
    defaultContent:
      "Declaro estar ciente e de acordo com as normas operacionais e diretrizes específicas de atendimento estabelecidas por este estabelecimento.",
  },
};
