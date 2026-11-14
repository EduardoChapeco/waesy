/**
 * @fileoverview FONTE ÚNICA DA VERDADE (SSOT) DE NICHOS, CAPACIDADES & TAXONOMIA WAESY
 *
 * Unifica os 7 macro-verticais (`CanonicalVerticalId`), os 20+ sistemas de nicho
 * especializados (`UnifiedNicheId`), SKUs comerciais standalone (`VerticalPlanSkuId`),
 * capacidades operacionais, campos dinâmicos (Catálogo, Clientes, Agenda, OS, Equipe),
 * perfis de Copilot/SDR, SEO programático e blueprints de Onboarding.
 *
 * Erradica colisões por substring (.includes("bar") capturando "barbearia", etc.).
 */

import type { CanonicalVerticalId } from "@/lib/architecture/vertical-manifest";

export type UnifiedNicheId =
  | "beauty_salon"
  | "barbershop"
  | "aesthetics_clinic"
  | "healthcare"
  | "dental"
  | "psychology"
  | "vet_petshop"
  | "gastronomy"
  | "market_perishables"
  | "pharmacy"
  | "automotive"
  | "tourism"
  | "retail"
  | "real_estate"
  | "services"
  | "law_firm"
  | "accounting"
  | "education"
  | "events"
  | "organizations"
  | "generic";

export type VerticalPlanSkuId =
  | "waesy_salon_beauty"
  | "waesy_barbershop"
  | "waesy_health_clinic"
  | "waesy_gastro_delivery"
  | "waesy_automotive_workshop"
  | "waesy_tourism_pro"
  | "waesy_real_estate"
  | "waesy_retail_commerce"
  | "waesy_legal_office"
  | "waesy_bundle_pro";

export type NicheShowcaseMode =
  | "standard"
  | "restaurant"
  | "grocery"
  | "travel"
  | "service"
  | "vehicle"
  | "property";

export interface NicheCapabilities {
  hasAgenda: boolean;
  hasClinicalAnamnesis: boolean;
  hasHairFormulas: boolean;
  hasAutoDeductSupplies: boolean;
  hasServiceOrders: boolean;
  hasVehicleFields: boolean;
  hasPropertyFields: boolean;
  hasTravelItinerary: boolean;
  hasKitchenKds: boolean;
  hasWeighableKg: boolean;
  hasLegalDeadlines: boolean;
  hasTicketBatches: boolean;
  showcaseMode: NicheShowcaseMode;
  defaultOrderFlow:
    | "delivery"
    | "pickup"
    | "appointment"
    | "service_order"
    | "quote"
    | "contract";
}

export interface NicheDynamicFieldDef {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea" | "number" | "select";
  options?: string[];
}

export interface NicheDynamicFieldsConfig {
  clientStepLabel: string;
  clientFields: NicheDynamicFieldDef[];
  appointmentFields: {
    notesLabel: string;
    notesPlaceholder: string;
    supportsFormula: boolean;
    supportsChecklist: boolean;
    supportsReturnReminder: boolean;
  };
  serviceOrderFields: {
    assetLabel: string;
    assetPlaceholder: string;
    identifierLabel: string;
    identifierPlaceholder: string;
    showsOdometer: boolean;
    checklistPresets: string[];
  };
  teamFields: {
    showAutoDeductSupplies: boolean;
    commissionLabel: string;
    professionalRoleLabel: string;
  };
}

export interface NicheCopilotProfile {
  systemPersona: string;
  tone: string;
  quickPrompts: Array<{ label: string; prompt: string }>;
  sdrRules: string[];
}

export interface NicheSeoProfile {
  titleSuffix: string;
  schemaType:
    | "LocalBusiness"
    | "BeautySalon"
    | "HealthAndBeautyBusiness"
    | "MedicalClinic"
    | "AutoRepair"
    | "Restaurant"
    | "TravelAgency"
    | "RealEstateAgent"
    | "Store"
    | "LegalService"
    | "AccountingService"
    | "EducationalOrganization"
    | "Event";
  defaultKeywords: string[];
}

export interface NicheOnboardingBlueprint {
  badgeLabel: string;
  title: string;
  subtitle: string;
  multimodalTitle: string;
  multimodalDescription: string;
  stepsSectionTitle: string;
  defaultCategories: string[];
  defaultDepartments: Array<{ name: string; slug: string }>;
  defaultBookingCategories: Array<{ slug: string; label: string }>;
}

export interface UnifiedNicheSpec {
  id: UnifiedNicheId;
  label: string;
  shortLabel: string;
  description: string;
  macroVertical: CanonicalVerticalId;
  defaultVerticalSku: VerticalPlanSkuId;
  themeClass: "theme-default" | "theme-health" | "theme-gastronomy" | "theme-luxury" | "theme-creator";
  aliases: string[];
  capabilities: NicheCapabilities;
  dynamicFields: NicheDynamicFieldsConfig;
  copilotProfile: NicheCopilotProfile;
  seoProfile: NicheSeoProfile;
  onboardingBlueprint: NicheOnboardingBlueprint;
}

const DEFAULT_CHECKLIST_SERVICE = [
  "Conferência inicial com o cliente",
  "Execução conforme especificação",
  "Controle de qualidade / entrega",
];

function makeClinicalDynamicFields(opts: {
  stepLabel: string;
  notesLabel: string;
  notesPlaceholder: string;
  extraClientFields?: NicheDynamicFieldDef[];
}): NicheDynamicFieldsConfig {
  return {
    clientStepLabel: opts.stepLabel,
    clientFields: [
      ...(opts.extraClientFields || []),
      {
        key: "preferred_time",
        label: "Preferência de Horário / Profissional",
        placeholder: "Ex: Manhã, preferência por atendimento silencioso",
        type: "text",
      },
    ],
    appointmentFields: {
      notesLabel: opts.notesLabel,
      notesPlaceholder: opts.notesPlaceholder,
      supportsFormula: true,
      supportsChecklist: true,
      supportsReturnReminder: true,
    },
    serviceOrderFields: {
      assetLabel: "Equipamento / Procedimento",
      assetPlaceholder: "Ex: Protocolo Facial",
      identifierLabel: "Código / Prontuário",
      identifierPlaceholder: "Ex: PRONT-001",
      showsOdometer: false,
      checklistPresets: DEFAULT_CHECKLIST_SERVICE,
    },
    teamFields: {
      showAutoDeductSupplies: true,
      commissionLabel: "Repasse / Comissão do Especialista (%)",
      professionalRoleLabel: "Especialista / Profissional",
    },
  };
}

function makeStandardDynamicFields(opts?: Partial<NicheDynamicFieldsConfig>): NicheDynamicFieldsConfig {
  return {
    clientStepLabel: opts?.clientStepLabel || "Preferências & Perfil",
    clientFields: opts?.clientFields || [
      {
        key: "segment_interest",
        label: "Preferências / Perfil de Compra",
        placeholder: "Ex: Tamanhos habituais, formas de contato preferidas",
        type: "text",
      },
    ],
    appointmentFields: opts?.appointmentFields || {
      notesLabel: "Observações do Atendimento",
      notesPlaceholder: "Instruções ou solicitações específicas...",
      supportsFormula: false,
      supportsChecklist: false,
      supportsReturnReminder: false,
    },
    serviceOrderFields: opts?.serviceOrderFields || {
      assetLabel: "Item / Equipamento",
      assetPlaceholder: "Ex: Notebook Dell / Produto",
      identifierLabel: "Serial / Código",
      identifierPlaceholder: "Ex: SN-2026-001",
      showsOdometer: false,
      checklistPresets: DEFAULT_CHECKLIST_SERVICE,
    },
    teamFields: opts?.teamFields || {
      showAutoDeductSupplies: false,
      commissionLabel: "Comissão (%)",
      professionalRoleLabel: "Colaborador",
    },
  };
}

export const UNIFIED_NICHE_SPECS: Record<UnifiedNicheId, UnifiedNicheSpec> = {
  beauty_salon: {
    id: "beauty_salon",
    label: "Salão de Beleza & Cabelo",
    shortLabel: "Salão de Beleza",
    description: "Agenda de profissionais, comandas de serviços + homecare, fórmulas de coloração e repasse Salão-Parceiro.",
    macroVertical: "services_specialists",
    defaultVerticalSku: "waesy_salon_beauty",
    themeClass: "theme-health",
    aliases: ["salao", "salao_cabelo", "cabeleireiro", "manicure", "unhas_manicure", "studio_beleza", "sobrancelha", "cilios", "nail_designer"],
    capabilities: {
      hasAgenda: true,
      hasClinicalAnamnesis: false,
      hasHairFormulas: true,
      hasAutoDeductSupplies: true,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "service",
      defaultOrderFlow: "appointment",
    },
    dynamicFields: makeClinicalDynamicFields({
      stepLabel: "Ficha Capilar & Alergias",
      notesLabel: "Fórmula Química / Coloração & Observações",
      notesPlaceholder: "Ex: Tinta 7.1 + 60ml Ox 20vol, pausa 35 min, histórico de progressiva...",
      extraClientFields: [
        { key: "hair_type", label: "Tipo de Fio / Química Atual", placeholder: "Ex: Ondulado, com mechas e coloração", type: "text" },
        { key: "hair_formula", label: "Fórmula Padrão do Cliente", placeholder: "Ex: 8.0 + 8.31 partes iguais com OX 20", type: "textarea" },
      ],
    }),
    copilotProfile: {
      systemPersona: "Consultora de beleza e recepção do salão, cordial, precisa com duração de procedimentos e cuidados pós-química.",
      tone: "acolhedor e consultivo",
      quickPrompts: [
        { label: "Confirmar horário e preparo prévio", prompt: "Gere uma mensagem cordial confirmando o agendamento e orientações prévias do procedimento." },
        { label: "Lembrete de retorno / retoque", prompt: "Crie um lembrete amigável sugerindo retorno de manutenção ou hidratação após 25 dias." },
        { label: "Montar combo de serviços", prompt: "Sugira pacotes combinados (ex: escova + hidratação ou manicure + pedicure) com base no catálogo." },
      ],
      sdrRules: [
        "Sempre informe duração estimada e política de tolerância antes de confirmar horário.",
        "Sugira produtos homecare apenas quando complementares ao serviço contratado.",
      ],
    },
    seoProfile: {
      titleSuffix: "Salão de Beleza & Agendamento Online",
      schemaType: "BeautySalon",
      defaultKeywords: ["salão de beleza", "cabelo", "manicure", "agendamento online", "mechas", "coloração"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Salões & Beleza",
      title: "Ativação do Salão & Studio de Beleza",
      subtitle: "Configure seus procedimentos, grade de profissionais, comissões (Lei Salão-Parceiro) e agendamento online 24h.",
      multimodalTitle: "Importar Tabela de Serviços & Comissões",
      multimodalDescription: "Envie foto ou PDF da tabela do salão para estruturar serviços, durações e preços em segundos.",
      stepsSectionTitle: "Etapas de Abertura da Agenda do Salão",
      defaultCategories: ["Cortes & Escovas", "Coloração & Mechas", "Manicure & Pedicure", "Sobrancelhas & Cílios", "Produtos Homecare"],
      defaultDepartments: [
        { name: "Recepção & Agenda", slug: "recepcao" },
        { name: "Atendimento VIP", slug: "vip" },
        { name: "Financeiro & Caixa", slug: "financeiro" },
      ],
      defaultBookingCategories: [
        { slug: "salao_cabelo", label: "Cabelo & Coloração" },
        { slug: "unhas_manicure", label: "Unhas & Manicure" },
        { slug: "estetica_massagem", label: "Sobrancelhas & Estética" },
      ],
    },
  },

  barbershop: {
    id: "barbershop",
    label: "Barbearia & Grooming",
    shortLabel: "Barbearia",
    description: "Agendamento rápido por barbeiro, assinatura recorrente de cortes, estoque de pomadas/cervejas e comissões.",
    macroVertical: "services_specialists",
    defaultVerticalSku: "waesy_barbershop",
    themeClass: "theme-health",
    aliases: ["barbearia", "barbeiro", "barber", "barber_shop", "barbershop"],
    capabilities: {
      hasAgenda: true,
      hasClinicalAnamnesis: false,
      hasHairFormulas: true,
      hasAutoDeductSupplies: true,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "service",
      defaultOrderFlow: "appointment",
    },
    dynamicFields: makeClinicalDynamicFields({
      stepLabel: "Estilo & Preferências de Corte",
      notesLabel: "Preferência de Corte / Pente & Navalha",
      notesPlaceholder: "Ex: Degradê na 0.5 baixa, barba alinhada com toalha quente, sem gel...",
      extraClientFields: [
        { key: "preferred_cut", label: "Corte Padrão", placeholder: "Ex: Mid Fade tesoura em cima + barba lenhador", type: "text" },
        { key: "skin_sensitivity", label: "Sensibilidade na Pele / Barba", placeholder: "Ex: Usar loção pós-barba sem álcool", type: "text" },
      ],
    }),
    copilotProfile: {
      systemPersona: "Atendimento ágil de barbearia moderna: direto, cordial e focado em encaixar horários por barbeiro.",
      tone: "direto e cordial",
      quickPrompts: [
        { label: "Confirmar cadeira e horário", prompt: "Envie confirmação objetiva de horário com o barbeiro e endereço da barbearia." },
        { label: "Oferecer assinatura mensal", prompt: "Apresente os benefícios do plano mensal de corte e barba recorrente." },
      ],
      sdrRules: [
        "Mostre horários vagos reais e pergunte preferência de barbeiro.",
        "Não use termos genéricos de varejo como frete quando for atendimento na cadeira.",
      ],
    },
    seoProfile: {
      titleSuffix: "Barbearia & Agendamento",
      schemaType: "HealthAndBeautyBusiness",
      defaultKeywords: ["barbearia", "corte degradê", "barba", "agendamento barbeiro"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Barbearias",
      title: "Ativação da Barbearia & Clube",
      subtitle: "Ative agendas por barbeiro, comandas rápidas no balcão, planos de assinatura e estoque de produtos masculinos.",
      multimodalTitle: "Importar Tabela de Cortes & Planos",
      multimodalDescription: "Suba sua tabela atual de corte, barba e combos para montar o catálogo em segundos.",
      stepsSectionTitle: "Etapas para Lotar as Cadeiras",
      defaultCategories: ["Corte Masculino", "Barba & Navalha", "Combos & Planos", "Pomadas & Grooming", "Bebidas & Conveniência"],
      defaultDepartments: [
        { name: "Recepção & Horários", slug: "recepcao" },
        { name: "Clube de Assinatura", slug: "clube" },
        { name: "Caixa & Comandas", slug: "caixa" },
      ],
      defaultBookingCategories: [
        { slug: "barbearia", label: "Corte & Barba" },
        { slug: "estetica_massagem", label: "Cuidados Faciais Masculinos" },
      ],
    },
  },

  aesthetics_clinic: {
    id: "aesthetics_clinic",
    label: "Clínica de Estética & Harmonização",
    shortLabel: "Estética",
    description: "Anamnese estética completa, pacotes de sessões, termo de consentimento, fotos antes/depois e insumos por sessão.",
    macroVertical: "services_specialists",
    defaultVerticalSku: "waesy_health_clinic",
    themeClass: "theme-health",
    aliases: ["estetica", "clinica_estetica", "harmonizacao", "biomedicina_estetica", "spa", "estetica_massagem", "micropigmentacao", "depilacao"],
    capabilities: {
      hasAgenda: true,
      hasClinicalAnamnesis: true,
      hasHairFormulas: true,
      hasAutoDeductSupplies: true,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "service",
      defaultOrderFlow: "appointment",
    },
    dynamicFields: makeClinicalDynamicFields({
      stepLabel: "Anamnese Estética & Contraindicações",
      notesLabel: "Protocolo Aplicado / Lote & Dosagem",
      notesPlaceholder: "Ex: Pontos de aplicação, aparelho/potência utilizada, orientações pós-procedimento...",
      extraClientFields: [
        { key: "skin_phototype", label: "Fototipo / Tipo de Pele", placeholder: "Ex: Fototipo III, pele mista", type: "text" },
        { key: "contraindications", label: "Restrições (Gestante / Marcapasso / Ácidos)", placeholder: "Ex: Sem contraindicações declaradas", type: "textarea" },
      ],
    }),
    copilotProfile: {
      systemPersona: "Concierge de clínica estética: técnico, ético, cuidadoso com pré-avaliação presencial.",
      tone: "elegante e seguro",
      quickPrompts: [
        { label: "Orientações pré-procedimento", prompt: "Envie cuidados prévios antes da sessão (ex: evitar sol e suspender ácidos)." },
        { label: "Agendar avaliação estética", prompt: "Convide para avaliação personalizada com especialista antes de fechar protocolo." },
      ],
      sdrRules: [
        "Nunca prometa resultado médico garantido; convide para avaliação técnica.",
        "Valide possíveis contraindicações antes de confirmar aplicação.",
      ],
    },
    seoProfile: {
      titleSuffix: "Estética Avançada & Harmonização",
      schemaType: "HealthAndBeautyBusiness",
      defaultKeywords: ["clínica de estética", "harmonização facial", "limpeza de pele", "depilação a laser"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Estética",
      title: "Ativação da Clínica de Estética",
      subtitle: "Gerencie agendas, anamnese fotográfica, pacotes com controle de sessões e baixa automática de ativos.",
      multimodalTitle: "Importar Tabela de Protocolos",
      multimodalDescription: "Converta sua carta de protocolos e pacotes de sessões em catálogo digital agendável.",
      stepsSectionTitle: "Etapas da Clínica Estética",
      defaultCategories: ["Estética Facial", "Estética Corporal", "Harmonização", "Depilação & Laser", "Pacotes de Sessões"],
      defaultDepartments: [
        { name: "Avaliações & Agenda", slug: "avaliacoes" },
        { name: "Pós-Procedimento", slug: "pos-procedimento" },
        { name: "Financeiro", slug: "financeiro" },
      ],
      defaultBookingCategories: [
        { slug: "estetica_massagem", label: "Protocolos & Sessões" },
      ],
    },
  },

  healthcare: {
    id: "healthcare",
    label: "Clínica Médica & Consultório",
    shortLabel: "Saúde & Clínica",
    description: "Prontuário de evolução clínica, triagem, alergias, convênios/particular e agenda multiprofissional LGPD.",
    macroVertical: "services_specialists",
    defaultVerticalSku: "waesy_health_clinic",
    themeClass: "theme-health",
    aliases: ["clinica", "saude", "consultorio", "medico", "fisioterapia", "nutricao", "saude_fisioterapia", "clinica_medica", "pediatria"],
    capabilities: {
      hasAgenda: true,
      hasClinicalAnamnesis: true,
      hasHairFormulas: false,
      hasAutoDeductSupplies: true,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "service",
      defaultOrderFlow: "appointment",
    },
    dynamicFields: makeClinicalDynamicFields({
      stepLabel: "Triagem Clínica & Alergias",
      notesLabel: "Evolução Clínica / Queixa & Conduta",
      notesPlaceholder: "Registro sigiloso de triagem, sinais vitais, orientações ao paciente...",
      extraClientFields: [
        { key: "insurance_plan", label: "Convênio / Particular", placeholder: "Ex: Particular, Unimed, Bradesco Saúde", type: "text" },
        { key: "continuous_medication", label: "Medicação de Uso Contínuo", placeholder: "Liste medicamentos contínuos se houver", type: "textarea" },
      ],
    }),
    copilotProfile: {
      systemPersona: "Recepção clínica humanizada: clara, acolhedora e aderente às boas práticas de sigilo médico e LGPD.",
      tone: "humanizado e respeitoso",
      quickPrompts: [
        { label: "Confirmar consulta e preparo", prompt: "Confirme horário da consulta, documentos necessários e recomendações de jejum ou exames." },
        { label: "Solicitar exames prévios", prompt: "Peça gentilmente que o paciente traga exames recentes para a consulta." },
      ],
      sdrRules: [
        "Nunca realize diagnóstico clínico ou prescrição automática via IA.",
        "Oriente busca por pronto-socorro em relatos de urgência médica.",
      ],
    },
    seoProfile: {
      titleSuffix: "Clínica & Agendamento de Consultas",
      schemaType: "MedicalClinic",
      defaultKeywords: ["clínica médica", "consultório", "agendamento de consulta", "fisioterapia", "nutrição"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Saúde",
      title: "Ativação da Clínica & Consultório",
      subtitle: "Organize prontuários seguros, agendas por especialista, confirmações via WhatsApp e faturamento de consultas.",
      multimodalTitle: "Importar Grade de Especialidades",
      multimodalDescription: "Estruture especialidades médicas, exames e valores de consulta a partir de documento.",
      stepsSectionTitle: "Etapas de Implantação Clínica",
      defaultCategories: ["Consultas Médicas", "Exames & Avaliações", "Fisioterapia & Reabilitação", "Nutrição & Bem-Estar", "Retornos"],
      defaultDepartments: [
        { name: "Recepção & Triagem", slug: "recepcao" },
        { name: "Convênios & Guias", slug: "convenios" },
        { name: "Pós-Consulta", slug: "pos-consulta" },
      ],
      defaultBookingCategories: [
        { slug: "saude_fisioterapia", label: "Consultas & Terapias" },
      ],
    },
  },

  dental: {
    id: "dental",
    label: "Odontologia & Implantes",
    shortLabel: "Odontologia",
    description: "Agenda odontológica, plano de tratamento por procedimento, anamnese cirúrgica e retorno semestral.",
    macroVertical: "services_specialists",
    defaultVerticalSku: "waesy_health_clinic",
    themeClass: "theme-health",
    aliases: ["odonto", "odontologia", "dentista", "ortodontia", "implantes", "clinica_odontologica"],
    capabilities: {
      hasAgenda: true,
      hasClinicalAnamnesis: true,
      hasHairFormulas: false,
      hasAutoDeductSupplies: true,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "service",
      defaultOrderFlow: "appointment",
    },
    dynamicFields: makeClinicalDynamicFields({
      stepLabel: "Anamnese Odontológica & Riscos",
      notesLabel: "Dentes Tratados / Plano Odontológico",
      notesPlaceholder: "Ex: Elemento 16, profilaxia + restauração resina A2, retorno em 6 meses...",
      extraClientFields: [
        { key: "anesthetic_allergy", label: "Sensibilidade a Anestésicos", placeholder: "Ex: Nenhuma conhecida", type: "text" },
        { key: "dental_plan", label: "Plano Odontológico / Particular", placeholder: "Ex: Particular, Amil Dental", type: "text" },
      ],
    }),
    copilotProfile: {
      systemPersona: "Atendimento de consultório odontológico: tranquilizador, objetivo e claro quanto a avaliações e retornos.",
      tone: "tranquilizador e profissional",
      quickPrompts: [
        { label: "Lembrete de revisão semestral", prompt: "Crie mensagem convidando paciente para profilaxia e revisão semestral." },
        { label: "Orientações pós-extração / implante", prompt: "Envie orientações seguras de repouso, alimentação fria e contato em caso de dor." },
      ],
      sdrRules: [
        "Encaminhe dor aguda ou trauma dentário imediatamente para encaixe com a recepção.",
      ],
    },
    seoProfile: {
      titleSuffix: "Odontologia Especializada",
      schemaType: "MedicalClinic",
      defaultKeywords: ["dentista", "odontologia", "implante dentário", "ortodontia", "clareamento"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Odontologia",
      title: "Ativação do Consultório Odontológico",
      subtitle: "Configure consultórios/cadeiras, planos de tratamento, orçamentos de prótese/orto e lembretes automáticos.",
      multimodalTitle: "Importar Tabela de Procedimentos Odonto",
      multimodalDescription: "Carregue sua tabela particular/convênio para gerar serviços agendáveis.",
      stepsSectionTitle: "Etapas do Consultório Odontológico",
      defaultCategories: ["Avaliação & Profilaxia", "Ortodontia", "Implantes & Próteses", "Endodontia", "Estética Dental"],
      defaultDepartments: [
        { name: "Recepção & Encaixes", slug: "recepcao" },
        { name: "Orçamentos & Tratamentos", slug: "orcamentos" },
      ],
      defaultBookingCategories: [
        { slug: "saude_fisioterapia", label: "Consultas Odontológicas" },
      ],
    },
  },

  psychology: {
    id: "psychology",
    label: "Psicologia & Terapia",
    shortLabel: "Psicologia",
    description: "Agenda recorrente semanal/quinzenal, teleatendimento seguro e registro evolutivo estrito por profissional.",
    macroVertical: "services_specialists",
    defaultVerticalSku: "waesy_health_clinic",
    themeClass: "theme-health",
    aliases: ["psicologia", "psicologo", "terapia", "psicanalise", "fonoaudiologia"],
    capabilities: {
      hasAgenda: true,
      hasClinicalAnamnesis: true,
      hasHairFormulas: false,
      hasAutoDeductSupplies: false,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "service",
      defaultOrderFlow: "appointment",
    },
    dynamicFields: makeClinicalDynamicFields({
      stepLabel: "Contexto de Acolhimento & Contato de Emergência",
      notesLabel: "Anotação Reservada de Sessão",
      notesPlaceholder: "Observação clínica sigilosa exclusiva do terapeuta...",
      extraClientFields: [
        { key: "session_modality", label: "Modalidade Preferida", placeholder: "Presencial ou Online (Telepsicologia)", type: "select", options: ["Presencial", "Online", "Híbrido"] },
      ],
    }),
    copilotProfile: {
      systemPersona: "Acolhimento discreto e empático para consultório de psicologia, mantendo máxima privacidade.",
      tone: "empático e discreto",
      quickPrompts: [
        { label: "Confirmar link da sessão online", prompt: "Envie mensagem discreta confirmando horário e formato da sessão." },
        { label: "Política de remarcação", prompt: "Explique gentilmente o prazo mínimo para remarcação sem cobrança." },
      ],
      sdrRules: [
        "Respeite absoluto sigilo; não exponha detalhes sensíveis em mensagens de notificação.",
      ],
    },
    seoProfile: {
      titleSuffix: "Psicologia & Atendimento Online/Presencial",
      schemaType: "MedicalClinic",
      defaultKeywords: ["psicólogo", "psicoterapia", "atendimento psicológico online", "terapia"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Terapia & Psicologia",
      title: "Ativação do Consultório Terapêutico",
      subtitle: "Agenda com sessões recorrentes, teleconsultas, controle de pacotes mensais e prontuário sigiloso.",
      multimodalTitle: "Configuração de Modalidades & Duração",
      multimodalDescription: "Defina duração padrão (50 min), horários recorrentes e modalidades online/presencial.",
      stepsSectionTitle: "Etapas do Consultório",
      defaultCategories: ["Sessão Individual", "Terapia de Casal", "Avaliação Neuropsicológica", "Pacote Mensal (4 Sessões)"],
      defaultDepartments: [
        { name: "Acolhimento & Horários", slug: "acolhimento" },
        { name: "Financeiro / Recibos", slug: "financeiro" },
      ],
      defaultBookingCategories: [
        { slug: "saude_fisioterapia", label: "Sessões & Terapias" },
      ],
    },
  },

  vet_petshop: {
    id: "vet_petshop",
    label: "Pet Shop & Clínica Veterinária",
    shortLabel: "Pet Shop & Vet",
    description: "Banho e tosa agendado, consultas veterinárias, carteirinha vacinal de pets, rações e medicamentos.",
    macroVertical: "services_specialists",
    defaultVerticalSku: "waesy_health_clinic",
    themeClass: "theme-health",
    aliases: ["pet", "pet_shop", "petshop", "veterinaria", "veterinario", "banho_tosa", "clinica_veterinaria", "agro"],
    capabilities: {
      hasAgenda: true,
      hasClinicalAnamnesis: true,
      hasHairFormulas: false,
      hasAutoDeductSupplies: true,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: true,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "service",
      defaultOrderFlow: "appointment",
    },
    dynamicFields: makeClinicalDynamicFields({
      stepLabel: "Dados do Pet & Saúde Animal",
      notesLabel: "Observações do Pet / Banho & Consulta",
      notesPlaceholder: "Ex: Golden Retriever 28kg, alergia a perfume forte, vacina V10 aplicada...",
      extraClientFields: [
        { key: "pet_name_breed", label: "Nome, Espécie & Raça do Pet", placeholder: "Ex: Thor (Cão • Labrador • 4 anos)", type: "text" },
        { key: "pet_weight_kg", label: "Porte / Peso Aproximado", placeholder: "Ex: Porte Grande (28kg)", type: "text" },
      ],
    }),
    copilotProfile: {
      systemPersona: "Atendimento carinhoso de Pet Shop e Clínica Vet para tutores preocupados com bem-estar animal.",
      tone: "carinhoso e cuidadoso",
      quickPrompts: [
        { label: "Avisar que o pet está pronto no banho & tosa", prompt: "Avise ao tutor que o banho e tosa terminou e o pet está pronto para retirada ou táxi dog." },
        { label: "Lembrete de reforço de vacina / antipulgas", prompt: "Crie lembrete cordial de renovação anual de vacina ou antipulgas." },
      ],
      sdrRules: [
        "Pergunte espécie, porte/peso e temperamento antes de agendar banho ou tosa.",
      ],
    },
    seoProfile: {
      titleSuffix: "Pet Shop, Banho & Tosa e Veterinária",
      schemaType: "LocalBusiness",
      defaultKeywords: ["pet shop", "banho e tosa", "veterinária", "ração", "táxi dog"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Pet & Vet",
      title: "Ativação do Pet Shop & Clínica Veterinária",
      subtitle: "Gerencie agenda de banho & tosa, prontuário veterinário dos pets e vendas de rações e acessórios.",
      multimodalTitle: "Importar Catálogo Pet & Tabela de Banho/Tosa",
      multimodalDescription: "Estruture serviços por porte (P, M, G) e mix de rações rapidamente.",
      stepsSectionTitle: "Etapas da Operação Pet & Vet",
      defaultCategories: ["Banho & Tosa", "Consultas & Vacinas", "Rações & Petiscos", "Farmácia Veterinária", "Acessórios & Brinquedos"],
      defaultDepartments: [
        { name: "Banho, Tosa & Táxi Dog", slug: "banho-tosa" },
        { name: "Clínica Veterinária", slug: "veterinaria" },
        { name: "Loja & Entregas", slug: "loja" },
      ],
      defaultBookingCategories: [
        { slug: "pet_shop", label: "Banho, Tosa & Consultas Vet" },
      ],
    },
  },

  gastronomy: {
    id: "gastronomy",
    label: "Gastronomia, Restaurantes & Delivery",
    shortLabel: "Gastronomia",
    description: "Cardápio digital com adicionais, KDS de cozinha em tempo real, mesas/comandas, ficha técnica de insumos e entregas.",
    macroVertical: "market_perishables",
    defaultVerticalSku: "waesy_gastro_delivery",
    themeClass: "theme-gastronomy",
    aliases: ["restaurant", "restaurante", "pizzaria", "hamburgueria", "marmitaria", "doces_padaria", "padaria", "confeitaria", "cafeteria", "lanchonete", "acai", "delivery"],
    capabilities: {
      hasAgenda: false,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: true,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: true,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "restaurant",
      defaultOrderFlow: "delivery",
    },
    dynamicFields: makeStandardDynamicFields({
      clientStepLabel: "Preferências de Entrega & Restrições Alimentares",
      clientFields: [
        { key: "dietary_notes", label: "Alergias / Restrições Alimentares", placeholder: "Ex: Sem glúten, intolerância à lactose, ponto da carne bem passado", type: "text" },
        { key: "delivery_reference", label: "Ponto de Referência para Motoboy", placeholder: "Ex: Portão azul, deixar na portaria", type: "text" },
      ],
    }),
    copilotProfile: {
      systemPersona: "Garçom digital e atendente de delivery ágil, focado em montar combos, confirmar ponto/adicionais e informar tempo de preparo.",
      tone: "apetitoso e ágil",
      quickPrompts: [
        { label: "Sugerir combo e bebida", prompt: "Monte sugestão de prato principal com adicional pago e bebida para aumentar o ticket." },
        { label: "Confirmar tempo de cozinha e entrega", prompt: "Informe tempo estimado de preparo na cozinha e despacho." },
      ],
      sdrRules: [
        "Confirme sempre adicionais obrigatórios (ponto, borda, acompanhamentos) e endereço de entrega.",
      ],
    },
    seoProfile: {
      titleSuffix: "Cardápio Digital & Delivery",
      schemaType: "Restaurant",
      defaultKeywords: ["cardápio digital", "delivery", "restaurante", "pizzaria", "hamburgueria"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Gastro & Delivery",
      title: "Ativação do Restaurante & Cardápio Digital",
      subtitle: "Configure seu cardápio com opcionais, KDS da cozinha, controle de mesas/comandas e entregas urbanas MotoLink.",
      multimodalTitle: "Digitalizar Cardápio por Foto / PDF",
      multimodalDescription: "Envie foto do cardápio físico para cadastrar pratos, tamanhos e adicionais automaticamente.",
      stepsSectionTitle: "Etapas da Cozinha & Delivery",
      defaultCategories: ["Lanches & Pratos Principais", "Porções & Entradas", "Bebidas & Sucos", "Combos Especiais", "Sobremesas"],
      defaultDepartments: [
        { name: "Pedidos & Balcão", slug: "pedidos" },
        { name: "Cozinha & Preparo", slug: "cozinha" },
        { name: "Entregas & Motoboy", slug: "entregas" },
      ],
      defaultBookingCategories: [],
    },
  },

  market_perishables: {
    id: "market_perishables",
    label: "Supermercado, Açougue & Hortifrúti",
    shortLabel: "Supermercado",
    description: "Itens pesáveis por kg/g, validade e lote, separação por corredores e entrega programada.",
    macroVertical: "market_perishables",
    defaultVerticalSku: "waesy_retail_commerce",
    themeClass: "theme-gastronomy",
    aliases: ["supermarket", "mercado", "hortifruti", "acougue", "mercearia", "grocery", "emporio", "adega", "bebidas"],
    capabilities: {
      hasAgenda: false,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: false,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: true,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "grocery",
      defaultOrderFlow: "delivery",
    },
    dynamicFields: makeStandardDynamicFields({
      clientStepLabel: "Preferências de Substituição & Janela de Entrega",
      clientFields: [
        { key: "substitution_rule", label: "Regra se Faltar Item na Gôndola", placeholder: "Ex: Ligar antes de substituir, ou escolher marca similar", type: "text" },
      ],
    }),
    copilotProfile: {
      systemPersona: "Atendimento de mercado e açougue atento a peso por quilo, corte desejado e janela de entrega.",
      tone: "prático e confiável",
      quickPrompts: [
        { label: "Confirmar corte de carne / pesagem", prompt: "Pergunte espessura do corte, embalagem a vácuo ou preferência de maturação." },
      ],
      sdrRules: [
        "Esclareça preço por kg vs embalagem fechada antes de finalizar pedido.",
      ],
    },
    seoProfile: {
      titleSuffix: "Mercado, Açougue & Hortifrúti Online",
      schemaType: "Store",
      defaultKeywords: ["supermercado online", "açougue", "hortifrúti", "entrega rápida"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Mercado & Perecíveis",
      title: "Ativação do Mercado, Açougue & Hortifrúti",
      subtitle: "Venda por kg ou unidade, organize setores de gôndola, ofertas semanais e entregas na cidade.",
      multimodalTitle: "Importar Encarte / Tabloide de Ofertas",
      multimodalDescription: "Transforme encartes promocionais e planilhas de código de barras em ofertas ativas.",
      stepsSectionTitle: "Etapas da Operação de Mercado",
      defaultCategories: ["Hortifrúti Fresco", "Açougue & Frios", "Padaria", "Bebidas", "Mercearia & Limpeza"],
      defaultDepartments: [
        { name: "Separação & Compras", slug: "separacao" },
        { name: "Entregas Express", slug: "entregas" },
      ],
      defaultBookingCategories: [],
    },
  },

  pharmacy: {
    id: "pharmacy",
    label: "Farmácia, Manipulação & Suplementos",
    shortLabel: "Farmácia",
    description: "Controle de lote/validade, dispensação ética, receitas anexadas e tele-entrega rápida.",
    macroVertical: "market_perishables",
    defaultVerticalSku: "waesy_retail_commerce",
    themeClass: "theme-health",
    aliases: ["farmacia", "drogaria", "manipulacao", "suplementos", "produtos_naturais"],
    capabilities: {
      hasAgenda: false,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: false,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "grocery",
      defaultOrderFlow: "delivery",
    },
    dynamicFields: makeStandardDynamicFields({
      clientStepLabel: "Dados para Dispensação & Alergias",
      clientFields: [
        { key: "drug_allergies", label: "Alergias Medicamentosas", placeholder: "Ex: Dipirona, Sulfa", type: "text" },
      ],
    }),
    copilotProfile: {
      systemPersona: "Balconista farmacêutico cuidadoso que direciona dúvidas clínicas ao farmacêutico responsável.",
      tone: "cauteloso e informativo",
      quickPrompts: [
        { label: "Receber foto de receita para orçamento", prompt: "Convide o cliente a enviar foto nítida da receita para conferência com o farmacêutico." },
      ],
      sdrRules: [
        "Medicamentos sujeitos a retenção exigem receita válida antes do despacho.",
      ],
    },
    seoProfile: {
      titleSuffix: "Farmácia, Saúde & Tele-entrega",
      schemaType: "Store",
      defaultKeywords: ["farmácia", "drogaria", "dermocosméticos", "suplementos"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Farmácia",
      title: "Ativação da Farmácia & Drogaria",
      subtitle: "Gerencie catálogo farmacêutico, pedidos com receita via WhatsApp e entrega rápida.",
      multimodalTitle: "Importar Tabela EAN / Lista de Produtos",
      multimodalDescription: "Suba sua base de produtos para catalogação imediata.",
      stepsSectionTitle: "Etapas da Farmácia",
      defaultCategories: ["Medicamentos OTC", "Dermocosméticos", "Higiene & Cuidados", "Suplementos", "Infantil & Mamãe"],
      defaultDepartments: [
        { name: "Balcão & Orçamento de Receitas", slug: "balcao" },
        { name: "Atenção Farmacêutica", slug: "farmaceutico" },
        { name: "Tele-Entrega", slug: "entregas" },
      ],
      defaultBookingCategories: [],
    },
  },

  automotive: {
    id: "automotive",
    label: "Oficina Mecânica, Estética Auto & Veículos",
    shortLabel: "Oficina & Auto",
    description: "Ordens de Serviço com placa, odômetro e chassi, checklist de vistoria, peças e estoque de veículos.",
    macroVertical: "automotive",
    defaultVerticalSku: "waesy_automotive_workshop",
    themeClass: "theme-luxury",
    aliases: ["vehicles", "oficina", "mecanica", "autocenter", "estetica_automotiva", "concessionaria", "auto_eletrica", "tech_repair", "assistencia_tecnica", "lavacar"],
    capabilities: {
      hasAgenda: true,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: true,
      hasServiceOrders: true,
      hasVehicleFields: true,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "vehicle",
      defaultOrderFlow: "service_order",
    },
    dynamicFields: {
      clientStepLabel: "Frota / Veículo do Cliente",
      clientFields: [
        { key: "vehicle_plate", label: "Placa Principal", placeholder: "Ex: ABC-1D23", type: "text" },
        { key: "vehicle_model", label: "Marca / Modelo / Ano", placeholder: "Ex: Honda Civic 2022 EXL", type: "text" },
        { key: "odometer_km", label: "KM Atual Registrada", placeholder: "Ex: 48500", type: "number" },
      ],
      appointmentFields: {
        notesLabel: "Sintoma / Serviço no Veículo",
        notesPlaceholder: "Ex: Revisão de 50 mil km, ruído na suspensão dianteira esquerda...",
        supportsFormula: false,
        supportsChecklist: true,
        supportsReturnReminder: true,
      },
      serviceOrderFields: {
        assetLabel: "Veículo / Equipamento",
        assetPlaceholder: "Ex: Toyota Corolla XEi 2.0 2021",
        identifierLabel: "Placa / Chassi / Serial",
        identifierPlaceholder: "Ex: RDO-4G19",
        showsOdometer: true,
        checklistPresets: [
          "Nível de óleo e arrefecimento",
          "Pastilhas e discos de freio",
          "Calibragem e estado dos pneus",
          "Sistema elétrico e bateria",
          "Registro de avarias / lataria na entrada",
        ],
      },
      teamFields: {
        showAutoDeductSupplies: true,
        commissionLabel: "Comissão sobre Mão de Obra (%)",
        professionalRoleLabel: "Mecânico / Técnico Responsável",
      },
    },
    copilotProfile: {
      systemPersona: "Consultor técnico de oficina e concessionária: objetivo em diagnóstico preliminar, orçamento de peças + mão de obra e prazo.",
      tone: "técnico e transparente",
      quickPrompts: [
        { label: "Enviar orçamento da OS para aprovação", prompt: "Monte resumo claro das peças, mão de obra, garantia e prazo para o cliente aprovar a OS." },
        { label: "Avisar veículo pronto para retirada", prompt: "Notifique que o veículo passou no checklist final e está pronto para retirada." },
      ],
      sdrRules: [
        "Solicite modelo, ano, motorização ou placa para cotar peças corretamente.",
      ],
    },
    seoProfile: {
      titleSuffix: "Oficina Especializada & Veículos",
      schemaType: "AutoRepair",
      defaultKeywords: ["oficina mecânica", "revisão automotiva", "troca de óleo", "estética automotiva", "veículos"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Oficina & Auto",
      title: "Ativação da Oficina, Estética Auto ou Concessionária",
      subtitle: "Controle Ordens de Serviço (OS) por placa e KM, aprovações via WhatsApp, estoque de peças e agenda de boxes.",
      multimodalTitle: "Importar Tabela de Revisões & Peças",
      multimodalDescription: "Suba sua tabela de serviços recorrentes e peças mais usadas.",
      stepsSectionTitle: "Etapas da Oficina & Auto Center",
      defaultCategories: ["Revisão Preventiva", "Motor & Câmbio", "Freios & Suspensão", "Estética & Polimento", "Peças & Lubrificantes"],
      defaultDepartments: [
        { name: "Recepção & Orçamentos OS", slug: "orcamentos-os" },
        { name: "Balcão de Peças", slug: "pecas" },
        { name: "Vendas & Financiamento", slug: "vendas" },
      ],
      defaultBookingCategories: [
        { slug: "geral", label: "Revisão & Serviços Auto" },
      ],
    },
  },

  tourism: {
    id: "tourism",
    label: "Turismo, Viagens & Hotelaria",
    shortLabel: "Turismo",
    description: "Roteiros dia a dia, propostas interativas, passageiros/passaportes, frota 2D, embarques, vouchers e câmbio.",
    macroVertical: "tourism",
    defaultVerticalSku: "waesy_tourism_pro",
    themeClass: "theme-luxury",
    aliases: ["turismo", "viagens", "hotel", "pousada", "excursao", "agencia_viagens", "turis"],
    capabilities: {
      hasAgenda: false,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: false,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: true,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "travel",
      defaultOrderFlow: "quote",
    },
    dynamicFields: makeStandardDynamicFields({
      clientStepLabel: "Documentação de Embarque & Passaporte",
      clientFields: [
        { key: "passport_number", label: "Passaporte / RG de Embarque", placeholder: "Ex: GG123456 (Válido até 2031)", type: "text" },
        { key: "boarding_point", label: "Ponto de Embarque Preferencial", placeholder: "Ex: Terminal Rodoviário / Aeroporto XAP", type: "text" },
        { key: "room_preference", label: "Preferência de Acomodação / Poltrona", placeholder: "Ex: Quarto Casal, Poltrona Janela", type: "text" },
      ],
      teamFields: {
        showAutoDeductSupplies: false,
        commissionLabel: "Comissão do Consultor / Guia (%)",
        professionalRoleLabel: "Consultor / Guia Embratur",
      },
    }),
    copilotProfile: {
      systemPersona: "Consultor sênior de viagens (Embratur/ANAC): conhecedor de roteiros, regras de bagagem Resolução ANAC 400 e documentação.",
      tone: "inspirador e seguro",
      quickPrompts: [
        { label: "Estruturar proposta com voo + hotel", prompt: "Organize apresentação comparativa de roteiro, inclusões, embarques e parcelamento." },
        { label: "Checklist pré-embarque do viajante", prompt: "Gere checklist completo de documentos, vacinas e horários de apresentação." },
      ],
      sdrRules: [
        "Informe sempre o que está incluído e excluído do pacote (taxas, traslados, refeições).",
      ],
    },
    seoProfile: {
      titleSuffix: "Agência de Viagens, Excursões & Roteiros",
      schemaType: "TravelAgency",
      defaultKeywords: ["pacotes de viagem", "excursões", "turismo", "resorts", "passagens aéreas"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Turismo Pro",
      title: "Ativação da Agência de Viagens & Receptivo",
      subtitle: "Configure roteiros, propostas interativas, assentos de ônibus/frota, contratos Cadastur e emissão de vouchers.",
      multimodalTitle: "Importar Tarifário / PDF de Operadora (OCR IA)",
      multimodalDescription: "Suba tarifários de operadoras para extrair hotéis, aéreos e roteiros automaticamente.",
      stepsSectionTitle: "Etapas da Operação Turística",
      defaultCategories: ["Pacotes Nacionais", "Viagens Internacionais", "Excursões & Bate-Volta", "Cruzeiros Marítimos", "Resorts & Hotelaria", "Assessoria de Vistos"],
      defaultDepartments: [
        { name: "Cotações & Roteiros", slug: "cotacoes" },
        { name: "Embarques & Vouchers", slug: "embarques" },
        { name: "Financeiro & Parcelamento", slug: "financeiro" },
      ],
      defaultBookingCategories: [],
    },
  },

  retail: {
    id: "retail",
    label: "Comércio & Varejo",
    shortLabel: "Varejo",
    description: "Catálogo com variações de cor/tamanho, estoque multi-SKU, PDV de balcão e cálculo de frete/entregas.",
    macroVertical: "retail",
    defaultVerticalSku: "waesy_retail_commerce",
    themeClass: "theme-default",
    aliases: ["varejo", "ecommerce", "moda", "fashion", "calcados", "vestuario", "electronics", "home_decor", "wholesale", "atacado", "comercio"],
    capabilities: {
      hasAgenda: false,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: false,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "standard",
      defaultOrderFlow: "delivery",
    },
    dynamicFields: makeStandardDynamicFields(),
    copilotProfile: {
      systemPersona: "Vendedor consultivo de varejo e e-commerce, atento a tamanhos em estoque, trocas e condições de pagamento.",
      tone: "amigável e objetivo",
      quickPrompts: [
        { label: "Recomendar variação e medidas", prompt: "Ajude o cliente a escolher tamanho/cor disponível no estoque com garantia de troca." },
        { label: "Calcular frete ou retirada em loja", prompt: "Ofereça retirada gratuita em loja física ou cálculo imediato de envio." },
      ],
      sdrRules: [
        "Nunca prometa disponibilidade sem confirmar estoque ativo.",
      ],
    },
    seoProfile: {
      titleSuffix: "Loja Oficial & Catálogo Online",
      schemaType: "Store",
      defaultKeywords: ["loja online", "compre local", "moda", "produtos", "entrega rápida"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Varejo & Lojas",
      title: "Ativação da Loja & Vitrine Digital",
      subtitle: "Cadastre produtos com variações, configure frete e entregas locais, PDV de caixa e recebimento via Pix/Cartão.",
      multimodalTitle: "Importar Produtos por Foto ou Planilha",
      multimodalDescription: "Digitalize catálogo ou importe planilha CSV com SKUs, preços e variações.",
      stepsSectionTitle: "Etapas de Abertura da Loja",
      defaultCategories: ["Novidades", "Mais Vendidos", "Destaques", "Promoções"],
      defaultDepartments: [
        { name: "Vendas Online", slug: "vendas" },
        { name: "Trocas & Garantia", slug: "suporte" },
        { name: "Expedição & Entregas", slug: "logistica" },
      ],
      defaultBookingCategories: [],
    },
  },

  real_estate: {
    id: "real_estate",
    label: "Imobiliária, Corretoras & Locação",
    shortLabel: "Imobiliária",
    description: "Carteira de venda/locação, chaves, vistorias de entrada/saída, manutenções prediais e repasse ao proprietário.",
    macroVertical: "real_estate",
    defaultVerticalSku: "waesy_real_estate",
    themeClass: "theme-luxury",
    aliases: ["imobiliaria", "imoveis", "corretor", "aluguel", "condominio", "temporada"],
    capabilities: {
      hasAgenda: true,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: false,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: true,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "property",
      defaultOrderFlow: "contract",
    },
    dynamicFields: makeStandardDynamicFields({
      clientStepLabel: "Perfil Imobiliário & Renda",
      clientFields: [
        { key: "interest_type", label: "Objetivo (Compra / Locação / Investimento)", placeholder: "Ex: Apartamento 2 dorms para locação anual", type: "text" },
        { key: "creci_owner", label: "Proprietário / Garantidor / CRECI", placeholder: "Ex: Proprietário de carteira ou fiador", type: "text" },
      ],
      appointmentFields: {
        notesLabel: "Dados da Visita / Chaves",
        notesPlaceholder: "Ex: Retirar chave #14 na recepção, cliente visita com cônjuge...",
        supportsFormula: false,
        supportsChecklist: true,
        supportsReturnReminder: true,
      },
      teamFields: {
        showAutoDeductSupplies: false,
        commissionLabel: "Comissão de Corretagem / Captação (%)",
        professionalRoleLabel: "Corretor CRECI",
      },
    }),
    copilotProfile: {
      systemPersona: "Corretor consultor especialista em financiamento, locação e agendamento de visitas presenciais.",
      tone: "elegante e preciso",
      quickPrompts: [
        { label: "Agendar visita presencial ao imóvel", prompt: "Sugira dois horários para visita acompanhada e informe localização aproximada." },
        { label: "Listar documentação para locação", prompt: "Envie lista de documentos necessários para análise de ficha ou garantia locatícia." },
      ],
      sdrRules: [
        "Informe separadamente valor do aluguel/venda, condomínio e IPTU.",
      ],
    },
    seoProfile: {
      titleSuffix: "Imóveis para Venda & Locação",
      schemaType: "RealEstateAgent",
      defaultKeywords: ["imobiliária", "apartamentos", "casas à venda", "aluguel", "imóveis"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Imobiliárias",
      title: "Ativação da Imobiliária & Carteira",
      subtitle: "Gerencie imóveis, agendamentos de visitas, vistorias digitais, chamados de manutenção e contratos.",
      multimodalTitle: "Importar Ficha de Imóvel",
      multimodalDescription: "Cole dados de captação para criar anúncios imobiliários completos com metragem e valores.",
      stepsSectionTitle: "Etapas da Imobiliária",
      defaultCategories: ["Imóveis à Venda", "Locação Residencial", "Salas Comerciais", "Terrenos & Lotes", "Temporada"],
      defaultDepartments: [
        { name: "Vendas & Visitas", slug: "vendas" },
        { name: "Locação & Contratos", slug: "locacao" },
        { name: "Vistorias & Manutenção", slug: "manutencoes" },
      ],
      defaultBookingCategories: [],
    },
  },

  services: {
    id: "services",
    label: "Serviços Especializados & Agenda",
    shortLabel: "Serviços",
    description: "Agendamento de serviços, equipes com comissão, insumos e ordens/comandas de atendimento.",
    macroVertical: "services_specialists",
    defaultVerticalSku: "waesy_salon_beauty",
    themeClass: "theme-health",
    aliases: ["servicos", "service", "fitness", "academia", "personal_fitness", "consultoria", "construction", "reformas"],
    capabilities: {
      hasAgenda: true,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: true,
      hasServiceOrders: true,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "service",
      defaultOrderFlow: "appointment",
    },
    dynamicFields: makeClinicalDynamicFields({
      stepLabel: "Requisitos do Atendimento",
      notesLabel: "Briefing / Escopo do Serviço",
      notesPlaceholder: "Detalhes técnicos, endereço de atendimento ou orientações prévias...",
    }),
    copilotProfile: {
      systemPersona: "Coordenador de serviços ágil para qualificar escopo, orçamento e agendar visita ou atendimento.",
      tone: "profissional e prestativo",
      quickPrompts: [
        { label: "Qualificar escopo e prazo", prompt: "Faça perguntas curtas para levantar escopo, endereço/modalidade e disponibilidade." },
      ],
      sdrRules: [
        "Confirme se o atendimento é presencial no local, em domicílio ou online.",
      ],
    },
    seoProfile: {
      titleSuffix: "Serviços Especializados & Agendamento",
      schemaType: "LocalBusiness",
      defaultKeywords: ["serviços locais", "agendamento", "orçamento online"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Serviços",
      title: "Ativação da Operação de Serviços",
      subtitle: "Configure serviços contratáveis, equipe técnica, horários disponíveis e cobrança direta.",
      multimodalTitle: "Importar Tabela de Serviços",
      multimodalDescription: "Suba sua lista de serviços com durações e preços.",
      stepsSectionTitle: "Etapas da Operação de Serviços",
      defaultCategories: ["Serviços Principais", "Avaliações & Visitas", "Planos Mensais", "Manutenções"],
      defaultDepartments: [
        { name: "Atendimento & Agendamento", slug: "agenda" },
        { name: "Orçamentos", slug: "orcamentos" },
      ],
      defaultBookingCategories: [
        { slug: "geral", label: "Serviços Gerais" },
        { slug: "personal_fitness", label: "Aulas & Treinos" },
      ],
    },
  },

  law_firm: {
    id: "law_firm",
    label: "Advocacia & Escritório Jurídico",
    shortLabel: "Advocacia",
    description: "Monitoramento CNJ, prazos processuais e audiências, contratos de honorários e mural de demandas.",
    macroVertical: "services_specialists",
    defaultVerticalSku: "waesy_legal_office",
    themeClass: "theme-luxury",
    aliases: ["legal", "advocacia", "juridico", "advogado", "direito", "escritorio_juridico"],
    capabilities: {
      hasAgenda: true,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: false,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: true,
      hasTicketBatches: false,
      showcaseMode: "service",
      defaultOrderFlow: "contract",
    },
    dynamicFields: makeStandardDynamicFields({
      clientStepLabel: "Representação & Dados Processuais",
      clientFields: [
        { key: "process_number", label: "Número do Processo (CNJ)", placeholder: "0000000-00.0000.0.00.0000", type: "text" },
        { key: "legal_area", label: "Área Jurídica", placeholder: "Ex: Trabalhista, Cível, Previdenciário, Empresarial", type: "text" },
      ],
      teamFields: {
        showAutoDeductSupplies: false,
        commissionLabel: "Participação / Honorários (%)",
        professionalRoleLabel: "Advogado(a) OAB",
      },
    }),
    copilotProfile: {
      systemPersona: "Assistente jurídico informativo (Provimento OAB 205/2021): formal, sóbrio e focado em triagem e agendamento de consulta.",
      tone: "formal e informativo",
      quickPrompts: [
        { label: "Triagem inicial com sigilo", prompt: "Colete resumo do caso e documentos disponíveis para reunião com advogado, sem prometer ganho de causa." },
      ],
      sdrRules: [
        "Respeite o Estatuto da OAB: proibido captar clientela com promessa de resultado.",
      ],
    },
    seoProfile: {
      titleSuffix: "Escritório de Advocacia",
      schemaType: "LegalService",
      defaultKeywords: ["advocacia", "advogado", "consultoria jurídica", "processos", "direito"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Jus 360°",
      title: "Ativação do Escritório Jurídico",
      subtitle: "Configure prazos processuais, busca CNJ, contratos de honorários e triagem sigilosa.",
      multimodalTitle: "Importar Áreas de Atuação & Modelos",
      multimodalDescription: "Estruture serviços consultivos, contenciosos e minutas padrão.",
      stepsSectionTitle: "Etapas do Escritório Jurídico",
      defaultCategories: ["Consultoria Jurídica", "Direito Civil & Família", "Trabalhista", "Previdenciário", "Contratos Empresariais"],
      defaultDepartments: [
        { name: "Triagem Jurídica", slug: "triagem" },
        { name: "Andamento Processual", slug: "processos" },
        { name: "Honorários", slug: "financeiro" },
      ],
      defaultBookingCategories: [],
    },
  },

  accounting: {
    id: "accounting",
    label: "Contabilidade & Consultoria Fiscal",
    shortLabel: "Contabilidade",
    description: "Obrigações mensais, exportação fiscal NF-e/SPED, abertura de CNPJ e atendimento consultivo B2B.",
    macroVertical: "services_specialists",
    defaultVerticalSku: "waesy_legal_office",
    themeClass: "theme-luxury",
    aliases: ["contabilidade", "contador", "contabil", "assessoria_fiscal", "bpo_financeiro"],
    capabilities: {
      hasAgenda: true,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: false,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: true,
      hasTicketBatches: false,
      showcaseMode: "service",
      defaultOrderFlow: "contract",
    },
    dynamicFields: makeStandardDynamicFields({
      clientStepLabel: "Regime Tributário & CNPJ",
      clientFields: [
        { key: "tax_regime", label: "Regime Tributário", placeholder: "MEI / Simples Nacional / Lucro Presumido / Real", type: "select", options: ["MEI", "Simples Nacional", "Lucro Presumido", "Lucro Real"] },
        { key: "state_registration", label: "Inscrição Estadual / Municipal", placeholder: "Ex: Isento / 258.123.456", type: "text" },
      ],
    }),
    copilotProfile: {
      systemPersona: "Consultor contábil e fiscal B2B claro sobre obrigações, notas fiscais e abertura de empresas.",
      tone: "preciso e consultivo",
      quickPrompts: [
        { label: "Lembrar envio mensal de XMLs/extratos", prompt: "Envie lembrete educado solicitando documentos fiscais e extratos até o dia 5." },
      ],
      sdrRules: [
        "Verifique regime tributário da empresa antes de orientar alíquotas ou emissão fiscal.",
      ],
    },
    seoProfile: {
      titleSuffix: "Contabilidade & Assessoria Empresarial",
      schemaType: "AccountingService",
      defaultKeywords: ["contabilidade", "abertura de empresa", "simples nacional", "bpo financeiro"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Contábil",
      title: "Ativação do Escritório Contábil",
      subtitle: "Organize empresas atendidas, prazos de guias fiscais, links contábeis seguros e contratos recorrentes.",
      multimodalTitle: "Importar Planos de Honorários Mensais",
      multimodalDescription: "Cadastre pacotes para MEI, Simples Nacional e Lucro Presumido.",
      stepsSectionTitle: "Etapas do Escritório Contábil",
      defaultCategories: ["Abertura de CNPJ", "Contabilidade Mensal MEI/Simples", "Folha & eSocial", "Consultoria Tributária"],
      defaultDepartments: [
        { name: "Fiscal & Notas", slug: "fiscal" },
        { name: "Departamento Pessoal", slug: "dp" },
        { name: "Societário", slug: "societario" },
      ],
      defaultBookingCategories: [],
    },
  },

  education: {
    id: "education",
    label: "Cursos, Escolas & Infoprodutos",
    shortLabel: "Educação & Cursos",
    description: "Matrículas, turmas presenciais ou online, acesso digital liberado e emissão de certificados.",
    macroVertical: "digital_products",
    defaultVerticalSku: "waesy_bundle_pro",
    themeClass: "theme-creator",
    aliases: ["educacao", "curso", "cursos", "escola", "creator", "creators", "infoprodutos", "mentoria"],
    capabilities: {
      hasAgenda: true,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: false,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "standard",
      defaultOrderFlow: "pickup",
    },
    dynamicFields: makeStandardDynamicFields({
      clientStepLabel: "Matrícula & Turma do Aluno",
      clientFields: [
        { key: "cohort_level", label: "Turma / Nível de Conhecimento", placeholder: "Ex: Turma Noturna • Intermediário", type: "text" },
      ],
    }),
    copilotProfile: {
      systemPersona: "Consultor acadêmico e de vendas educacionais, claro sobre grade, carga horária, certificado e datas de início.",
      tone: "inspirador e esclarecedor",
      quickPrompts: [
        { label: "Apresentar grade e próxima turma", prompt: "Explique os módulos do curso, carga horária e benefícios de matrícula antecipada." },
      ],
      sdrRules: [
        "Informe claramente se o curso é ao vivo, gravado ou presencial.",
      ],
    },
    seoProfile: {
      titleSuffix: "Cursos, Mentorias & Formação",
      schemaType: "EducationalOrganization",
      defaultKeywords: ["cursos", "workshops", "treinamentos", "mentoria", "certificado"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Educação",
      title: "Ativação da Escola, Cursos ou Infoprodutos",
      subtitle: "Configure turmas, venda cursos digitais ou presenciais e emita acessos automaticamente.",
      multimodalTitle: "Importar Ementa de Curso",
      multimodalDescription: "Transforme o cronograma em vitrine de matrícula.",
      stepsSectionTitle: "Etapas de Educação & Cursos",
      defaultCategories: ["Cursos Presenciais", "Cursos Online", "Workshops & Imersões", "Mentorias"],
      defaultDepartments: [
        { name: "Secretaria & Matrículas", slug: "matriculas" },
        { name: "Suporte ao Aluno", slug: "alunos" },
      ],
      defaultBookingCategories: [
        { slug: "personal_fitness", label: "Aulas & Mentorias" },
      ],
    },
  },

  events: {
    id: "events",
    label: "Eventos, Shows & Locações",
    shortLabel: "Eventos & Locação",
    description: "Bilheteria com lotes e QR Code de check-in, controle de portaria e locação de estruturas para festas.",
    macroVertical: "tourism",
    defaultVerticalSku: "waesy_tourism_pro",
    themeClass: "theme-default",
    aliases: ["evento", "eventos", "event_producer", "rental", "rental_events", "locacao", "shows", "ingressos", "festas"],
    capabilities: {
      hasAgenda: false,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: false,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: true,
      showcaseMode: "standard",
      defaultOrderFlow: "pickup",
    },
    dynamicFields: makeStandardDynamicFields({
      clientStepLabel: "Dados do Ingresso / Evento",
      clientFields: [
        { key: "event_sector", label: "Setor / Área de Interesse", placeholder: "Ex: Pista VIP / Camarote / Locação Palco", type: "text" },
      ],
    }),
    copilotProfile: {
      systemPersona: "Concierge de eventos e bilheteria, ágil em informar horários, lotes abertos, política de meia-entrada e QR Code.",
      tone: "dinâmico e claro",
      quickPrompts: [
        { label: "Informar lotes e acesso com QR Code", prompt: "Explique valores do lote vigente e entrega instantânea do ingresso QR Code." },
      ],
      sdrRules: [
        "Informe sempre classificação etária e política de reembolso do evento.",
      ],
    },
    seoProfile: {
      titleSuffix: "Ingressos, Eventos & Locações",
      schemaType: "Event",
      defaultKeywords: ["ingressos", "eventos", "shows", "locação de equipamentos"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Eventos & Bilheteria",
      title: "Ativação de Eventos, Ingressos & Locações",
      subtitle: "Gerencie lotes de ingressos, check-in por QR Code na portaria e contratos de locação de estruturas.",
      multimodalTitle: "Importar Lotes & Itens de Evento",
      multimodalDescription: "Estruture setores, camarotes ou lista de equipamentos em segundos.",
      stepsSectionTitle: "Etapas de Eventos & Portaria",
      defaultCategories: ["Ingressos & Lotes", "Camarotes & Áreas VIP", "Locação de Estruturas", "Som & Iluminação"],
      defaultDepartments: [
        { name: "Bilheteria & Lotes", slug: "bilheteria" },
        { name: "Produção & Montagem", slug: "producao" },
      ],
      defaultBookingCategories: [],
    },
  },

  organizations: {
    id: "organizations",
    label: "Empregos, Mídia Local & Organizações",
    shortLabel: "Organizações",
    description: "Portais de vagas, associações comerciais/cooperativas, publicidade em jornais e eventos comunitários.",
    macroVertical: "services_specialists",
    defaultVerticalSku: "waesy_bundle_pro",
    themeClass: "theme-default",
    aliases: ["jobs", "empregos", "news", "noticias", "jornalismo", "collective", "associacao_comercial", "cooperativa"],
    capabilities: {
      hasAgenda: false,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: false,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "standard",
      defaultOrderFlow: "pickup",
    },
    dynamicFields: makeStandardDynamicFields(),
    copilotProfile: {
      systemPersona: "Comunicação institucional clara e objetiva para associados, leitores e candidatos.",
      tone: "institucional e acolhedor",
      quickPrompts: [
        { label: "Enviar comunicado aos associados", prompt: "Redija comunicado institucional objetivo sobre agenda ou benefício." },
      ],
      sdrRules: [
        "Mantenha clareza institucional e links oficiais de cadastro.",
      ],
    },
    seoProfile: {
      titleSuffix: "Portal & Organização Local",
      schemaType: "LocalBusiness",
      defaultKeywords: ["associação", "vagas", "notícias locais", "cooperativa"],
    },
    onboardingBlueprint: {
      badgeLabel: "Sistema Waesy Organizações",
      title: "Ativação da Organização / Portal",
      subtitle: "Configure vitrine institucional, vagas ou anúncios patrocinados e atendimento centralizado.",
      multimodalTitle: "Importar Comunicados & Serviços",
      multimodalDescription: "Estruture categorias iniciais para seus associados e comunidade.",
      stepsSectionTitle: "Etapas da Organização",
      defaultCategories: ["Comunicados & Editais", "Vagas & Oportunidades", "Benefícios Associados", "Patrocínios"],
      defaultDepartments: [
        { name: "Atendimento Associado", slug: "atendimento" },
        { name: "Secretaria", slug: "secretaria" },
      ],
      defaultBookingCategories: [],
    },
  },

  generic: {
    id: "generic",
    label: "Comércio & Serviços Locais",
    shortLabel: "Negócio Local",
    description: "Operação comercial e de atendimento completa no ecossistema Waesy.",
    macroVertical: "retail",
    defaultVerticalSku: "waesy_bundle_pro",
    themeClass: "theme-default",
    aliases: ["generic", "geral", "commerce", "multi"],
    capabilities: {
      hasAgenda: false,
      hasClinicalAnamnesis: false,
      hasHairFormulas: false,
      hasAutoDeductSupplies: false,
      hasServiceOrders: false,
      hasVehicleFields: false,
      hasPropertyFields: false,
      hasTravelItinerary: false,
      hasKitchenKds: false,
      hasWeighableKg: false,
      hasLegalDeadlines: false,
      hasTicketBatches: false,
      showcaseMode: "standard",
      defaultOrderFlow: "delivery",
    },
    dynamicFields: makeStandardDynamicFields(),
    copilotProfile: {
      systemPersona: "Atendimento comercial atencioso e direto ao ponto para vendas e suporte local.",
      tone: "profissional e cordial",
      quickPrompts: [
        { label: "Responder dúvidas de orçamento", prompt: "Crie resposta objetiva apresentando condições e opções do catálogo." },
      ],
      sdrRules: [
        "Baseie-se exclusivamente nos itens e preços cadastrados no catálogo da loja.",
      ],
    },
    seoProfile: {
      titleSuffix: "Catálogo & Atendimento Local",
      schemaType: "LocalBusiness",
      defaultKeywords: ["comércio local", "serviços", "atendimento online"],
    },
    onboardingBlueprint: {
      badgeLabel: "Ativação Waesy",
      title: "Ativação do Negócio Local",
      subtitle: "Complete os ajustes essenciais de catálogo, entrega e pagamentos para operar imediatamente.",
      multimodalTitle: "Configuração Assistida",
      multimodalDescription: "Importe catálogo ou configure horários e pagamentos em minutos.",
      stepsSectionTitle: "Etapas de Ativação da Loja",
      defaultCategories: ["Destaques", "Mais Vendidos", "Novidades"],
      defaultDepartments: [
        { name: "Atendimento & Vendas", slug: "vendas" },
        { name: "Financeiro", slug: "financeiro" },
      ],
      defaultBookingCategories: [],
    },
  },
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tokenizeWords(value: string): Set<string> {
  const norm = normalizeText(value);
  return new Set(norm.split(/[^a-z0-9_]+/).filter(Boolean));
}

function hasAnyWord(tokens: Set<string>, normText: string, exactWords: string[], prefixWords: string[] = []): boolean {
  for (const w of exactWords) {
    if (tokens.has(w) || normText === w) return true;
  }
  for (const tok of tokens) {
    for (const pref of prefixWords) {
      if (tok.startsWith(pref)) return true;
    }
  }
  return false;
}

const EXACT_ALIAS_TO_UNIFIED: Record<string, UnifiedNicheId> = {};
for (const spec of Object.values(UNIFIED_NICHE_SPECS)) {
  EXACT_ALIAS_TO_UNIFIED[spec.id] = spec.id;
  for (const alias of spec.aliases) {
    EXACT_ALIAS_TO_UNIFIED[normalizeText(alias)] = spec.id;
  }
}

export function tryResolveUnifiedNicheId(input?: unknown): UnifiedNicheId | null {
  if (!input) return null;

  if (typeof input === "string") {
    return classifySingleString(input);
  }

  if (typeof input === "object") {
    const obj = input as Record<string, any>;
    const storeObj = obj.stores && typeof obj.stores === "object" ? obj.stores : {};
    const settings = (obj.settings && typeof obj.settings === "object" ? obj.settings : {}) as Record<string, any>;
    const storeSettings = (storeObj.settings && typeof storeObj.settings === "object" ? storeObj.settings : {}) as Record<string, any>;

    const explicitCandidates = [
      obj.primary_niche_id,
      storeObj.primary_niche_id,
      obj.segment,
      obj.type,
      obj.category,
      obj.niche,
      storeObj.segment,
      storeObj.type,
      storeObj.category,
      storeObj.niche,
      settings.primary_niche_id,
      settings.segment,
      settings.type,
      settings.niche,
      storeSettings.primary_niche_id,
      storeSettings.segment,
      storeSettings.type,
      storeSettings.niche,
    ];

    for (const candidate of explicitCandidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        const hit = classifySingleString(candidate);
        if (hit && hit !== "generic") {
          return hit;
        }
      }
    }

    const fallbackName = String(obj.name || storeObj.name || "");
    const fallbackDesc = String(obj.description || storeObj.description || "");
    return classifySingleString(`${fallbackName} ${fallbackDesc}`);
  }

  return null;
}

/**
 * Classifica com precisão word-boundary erradicando colisões clássicas:
 * - "barbearia" NUNCA cai em gastronomia (.includes("bar"))
 * - "produtos" / "autocuidado" / "ultrassom" NUNCA caem em events / automotive / rental
 * - explicitSegment válido NUNCA é sobrescrito pelo nome fantasia
 */
export function resolveUnifiedNicheId(input?: unknown): UnifiedNicheId {
  return tryResolveUnifiedNicheId(input) || "retail";
}

function classifySingleString(raw: string): UnifiedNicheId | null {
  const norm = normalizeText(raw);
  if (!norm) return null;

  if (EXACT_ALIAS_TO_UNIFIED[norm]) {
    return EXACT_ALIAS_TO_UNIFIED[norm];
  }

  const tokens = tokenizeWords(norm);

  // 1. Especialidades específicas (verificadas ANTES de termos amplos como "bar", "auto", "produto")
  if (hasAnyWord(tokens, norm, ["barbearia", "barbeiro", "barber", "barbershop"], ["barbear"])) {
    return "barbershop";
  }
  if (hasAnyWord(tokens, norm, ["salao", "cabeleireiro", "manicure", "pedicure", "lash", "nail", "visagismo"], ["cabeleir", "manicur"])) {
    return "beauty_salon";
  }
  if (hasAnyWord(tokens, norm, ["estetica", "harmonizacao", "spa", "biomedicina", "micropigmentacao", "depilacao", "massagem"], ["estetic", "harmoniz", "depilac"])) {
    return "aesthetics_clinic";
  }
  if (hasAnyWord(tokens, norm, ["odonto", "odontologia", "dentista", "ortodontia", "implantes", "endodontia"], ["odont", "dentist"])) {
    return "dental";
  }
  if (hasAnyWord(tokens, norm, ["psicologia", "psicologo", "psicanalise", "terapia", "terapeuta", "fonoaudiologia"], ["psicolog", "psicanal"])) {
    return "psychology";
  }
  if (hasAnyWord(tokens, norm, ["pet", "petshop", "veterinaria", "veterinario", "tosa", "racao", "agro", "agropecuaria"], ["veterin", "petshop"])) {
    return "vet_petshop";
  }
  if (hasAnyWord(tokens, norm, ["clinica", "medico", "medica", "saude", "consultorio", "fisioterapia", "nutricao", "exames"], ["clinic", "fisioterap", "medic"])) {
    return "healthcare";
  }

  // 2. Profissões regulamentadas / B2B
  if (hasAnyWord(tokens, norm, ["advocacia", "juridico", "advogado", "advogada", "direito", "legal", "oab"], ["advoc", "jurid"])) {
    return "law_firm";
  }
  if (hasAnyWord(tokens, norm, ["contabilidade", "contador", "contadora", "contabil", "fiscal", "tributario"], ["contab"])) {
    return "accounting";
  }

  // 3. Turismo
  if (hasAnyWord(tokens, norm, ["tourism", "turismo", "travel", "viagem", "viagens", "hotel", "pousada", "resort", "excursao", "excursoes", "roteiro", "roteiros", "cruzeiro", "antt", "passagem"], ["turis", "viag", "pousad", "excurs"])) {
    return "tourism";
  }

  // 4. Automotivo & Oficinas (antes de services genérico, sem match cego em "autocuidado")
  if (hasAnyWord(tokens, norm, ["automotive", "automotivo", "vehicles", "veiculos", "veiculo", "oficina", "mecanica", "mecanico", "autocenter", "concessionaria", "carros", "motos", "funilaria", "lavacar", "tech_repair"], ["automot", "veicul", "oficin", "mecanic", "concessionar"])) {
    return "automotive";
  }

  // 5. Gastronomia (token "bar" exato, nunca substring!)
  if (hasAnyWord(tokens, norm, ["gastronomy", "gastronomia", "restaurante", "restaurantes", "restaurant", "pizzaria", "hamburgueria", "lanchonete", "marmitaria", "padaria", "confeitaria", "doceria", "cafeteria", "bar", "bares", "acai", "hamburguer", "lanche", "pizza", "food"], ["gastro", "restauran", "pizz", "lanchon", "marmit", "confeit"])) {
    return "gastronomy";
  }

  // 6. Farmácia & Supermercado
  if (hasAnyWord(tokens, norm, ["pharmacy", "farmacia", "drogaria", "manipulacao", "suplementos"], ["farmac", "drogari"])) {
    return "pharmacy";
  }
  if (hasAnyWord(tokens, norm, ["supermarket", "supermercado", "mercado", "hortifruti", "acougue", "mercearia", "grocery", "emporio", "adega", "sacolao"], ["supermerc", "hortifrut", "acougu", "mercear"])) {
    return "market_perishables";
  }

  // 7. Imobiliária
  if (hasAnyWord(tokens, norm, ["real_estate", "imobiliaria", "imoveis", "imovel", "corretor", "corretora", "realtor"], ["imobil", "imove"])) {
    return "real_estate";
  }

  // 8. Eventos & Educação
  if (hasAnyWord(tokens, norm, ["events", "evento", "eventos", "show", "shows", "ingressos", "ingresso", "festa", "festas", "rental", "rental_events", "casamento"], ["event", "ingress"])) {
    return "events";
  }
  if (hasAnyWord(tokens, norm, ["education", "educacao", "curso", "cursos", "escola", "faculdade", "mentoria", "creator", "creators", "infoproduto"], ["educa", "mentor"])) {
    return "education";
  }

  // 9. Organizações / Empregos / Mídia
  if (hasAnyWord(tokens, norm, ["jobs", "empregos", "vagas", "recrutamento", "news", "noticias", "jornalismo", "collective", "cooperativa", "associacao", "associacao_comercial"], ["jornal", "associac", "cooperat"])) {
    return "organizations";
  }

  // 10. Serviços Gerais
  if (hasAnyWord(tokens, norm, ["services", "servicos", "servico", "assistencia", "conserto", "manutencao", "fitness", "academia", "consultoria", "reforma", "construction"], ["servic", "consultor"])) {
    return "services";
  }

  // 11. Varejo (Moda, Eletrônicos, Casa, Atacado)
  if (hasAnyWord(tokens, norm, ["retail", "varejo", "loja", "ecommerce", "moda", "roupas", "calcados", "vestuario", "boutique", "electronics", "eletronicos", "home_decor", "moveis", "wholesale", "atacado"], ["eletron", "vestuar", "calcad"])) {
    return "retail";
  }

  return null;
}

export function getUnifiedNicheSpec(storeOrNiche?: unknown): UnifiedNicheSpec {
  const id = resolveUnifiedNicheId(storeOrNiche);
  return UNIFIED_NICHE_SPECS[id] || UNIFIED_NICHE_SPECS.retail;
}

export function listSellableNicheSystems(): UnifiedNicheSpec[] {
  return Object.values(UNIFIED_NICHE_SPECS).filter((s) => s.id !== "generic");
}

export function getBookingCategoryLabelFromSsot(categorySlug?: string | null): string {
  if (!categorySlug) return "Serviço Agendado";
  const key = normalizeText(categorySlug);
  for (const spec of Object.values(UNIFIED_NICHE_SPECS)) {
    const found = spec.onboardingBlueprint.defaultBookingCategories.find(
      (c) => normalizeText(c.slug) === key,
    );
    if (found) return found.label;
  }
  if (key === "geral") return "Atendimento Geral";
  return categorySlug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
