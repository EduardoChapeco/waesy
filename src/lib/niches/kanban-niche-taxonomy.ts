/**
 * Taxonomia Canonica Multi-Nicho de Fluxos Kanban, Sinonimos e Terminologia (SSOT)
 *
 * Centraliza:
 * - Estagios de funil adaptados para cada uma das 22 verticais suportadas
 * - Mapeamento bidirecional de sinonimos (status legados, webhooks WhatsApp/Meta, colunas custom)
 * - Terminologia de dominio (entidade, CTA, placeholders, origens, interesses e checklist)
 * - Formatador humano de erros de validacao / persistencia (zero despejo de JSON bruto)
 */

import { tryResolveUnifiedNicheId, type UnifiedNicheId } from "./niche-ssot";

export type KanbanPurpose = "inbox" | "in_progress" | "review" | "won" | "lost" | "archived";

export type CanonicalLeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost"
  | "converted";

export type KanbanCardVariant =
  | "standard"
  | "commercial"
  | "kds"
  | "picking"
  | "service_order"
  | "hr_talent"
  | "hr_onboarding"
  | "purchasing";

export type KanbanNicheTaxonomyId = UnifiedNicheId | "creator";

export interface KanbanNicheStageSpec {
  stage_key: string;
  title: string;
  purpose: KanbanPurpose;
  canonicalBucket: CanonicalLeadStatus;
  color: string;
  sort_order: number;
  is_visible: boolean;
  sla_minutes: number;
  description: string;
  synonyms: string[];
  card_variant?: KanbanCardVariant;
}

export interface NicheKanbanOption {
  value: string;
  label: string;
}

export interface NicheKanbanChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface RawNicheKanbanTerminology {
  entitySingular: string;
  entityPlural: string;
  newLeadCta: string;
  newLeadActionLabel?: string;
  searchPlaceholder: string;
  contextFieldLabel: string;
  interestFieldLabel?: string;
  contextPlaceholder: string;
  emptyColumnHint: string;
  interestOptions: NicheKanbanOption[];
  interestTypes?: NicheKanbanOption[];
  sourceOptions: NicheKanbanOption[];
  leadSources?: NicheKanbanOption[];
  defaultChecklist: Array<string | NicheKanbanChecklistItem>;
}

export interface NicheKanbanTerminology extends RawNicheKanbanTerminology {
  newLeadActionLabel: string;
  interestFieldLabel: string;
  interestTypes: NicheKanbanOption[];
  leadSources: NicheKanbanOption[];
  defaultChecklist: NicheKanbanChecklistItem[];
}

export interface RawNicheKanbanPreset {
  nicheId: KanbanNicheTaxonomyId;
  label: string;
  legacyPresetNiche: "gastronomia" | "oficina" | "imobiliaria" | "supermercado" | "turismo" | "servicos" | "geral";
  cardVariant: KanbanCardVariant;
  stages: KanbanNicheStageSpec[];
  terminology: RawNicheKanbanTerminology;
}

export interface NicheKanbanPreset extends RawNicheKanbanPreset {
  terminology: NicheKanbanTerminology;
}

export type StoreNicheHint =
  | string
  | null
  | undefined
  | {
      store_type?: string | null;
      niche?: string | null;
      category?: string | null;
      settings?: Record<string, any> | null;
    };

export const CANONICAL_LEAD_STATUSES: readonly CanonicalLeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
  "converted",
] as const;

const COMMON_SOURCE_OPTIONS: NicheKanbanOption[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Vitrine / Biolink" },
  { value: "balcao", label: "Balcão / Loja Física" },
  { value: "outros", label: "Outros" },
];

export function normalizeKanbanStageSlug(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "new";
  const cleaned = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  if (cleaned.length < 2 || !/^[a-z0-9_-]{2,64}$/.test(cleaned)) {
    return "new";
  }
  return cleaned;
}

function buildStage(
  stage_key: string,
  title: string,
  purpose: KanbanPurpose,
  canonicalBucket: CanonicalLeadStatus,
  color: string,
  sort_order: number,
  sla_minutes: number,
  description: string,
  synonyms: string[] = [],
  card_variant: KanbanCardVariant = "commercial"
): KanbanNicheStageSpec {
  const titleSlug = normalizeKanbanStageSlug(title);
  const titleNoStopwords = normalizeKanbanStageSlug(
    title.replace(/\b(e|de|da|do|das|dos|em|para|com)\b/gi, " ")
  );
  return {
    stage_key,
    title,
    purpose,
    canonicalBucket,
    color,
    sort_order,
    is_visible: true,
    sla_minutes,
    description,
    synonyms: Array.from(
      new Set([
        stage_key,
        titleSlug,
        titleNoStopwords,
        ...(synonyms || []).map((s) => normalizeKanbanStageSlug(s)),
      ])
    ),
    card_variant,
  };
}

export const KANBAN_NICHE_TAXONOMIES: Record<KanbanNicheTaxonomyId, RawNicheKanbanPreset> = {
  tourism: {
    nicheId: "tourism",
    label: "Turismo & Viagens",
    legacyPresetNiche: "turismo",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novos Contatos", "inbox", "new", "var(--primary)", 0, 15, "Leads recem-chegados aguardando abordagem", ["inbox", "novo", "novos_contatos", "lead"]),
      buildStage("contact", "Sondagem e Briefing", "in_progress", "contacted", "var(--warning)", 1, 60, "Levantamento de datas, passageiros e perfil de viagem", ["contacted", "briefing", "sondagem", "sondagem_briefing", "levantamento", "primeiro_contato"]),
      buildStage("qualified", "Cotação em Andamento", "in_progress", "qualified", "var(--accent-foreground)", 2, 180, "Pesquisa de aereo, hospedagem e montagem de opcoes", ["cotacao", "qualificado", "cotacao_montagem", "orcamento"]),
      buildStage("proposal", "Proposta Enviada", "review", "proposal", "var(--primary)", 3, 240, "Proposta ou lamina visual enviada ao viajante", ["proposta", "proposta_enviada", "quote_sent", "laminas"]),
      buildStage("negotiation", "Em Negociação", "review", "negotiation", "var(--warning-strong)", 4, 360, "Ajuste de parcelas, seguro e bloqueio de vagas", ["negociacao", "em_fechamento", "fechamento", "ajustes"]),
      buildStage("won", "Viagem Confirmada", "won", "won", "var(--success)", 5, 1440, "Reserva aprovada pronta para emissao e embarque", ["converted", "ganho", "viagem_confirmada", "confirmada", "fechado", "emitida"]),
      buildStage("lost", "Perdido", "lost", "lost", "var(--destructive)", 6, 1440, "Solicitacao declinada ou expirada", ["perdido", "desistencia", "recusado", "cancelled", "arquivado"]),
    ],
    terminology: {
      entitySingular: "Atendimento de Viagem",
      entityPlural: "Viajantes & Cotações",
      newLeadCta: "Nova Oportunidade",
      searchPlaceholder: "Buscar viajante ou destino...",
      contextFieldLabel: "Destino / Roteiro",
      contextPlaceholder: "Ex: Maceió, Europa, Cruzeiro",
      emptyColumnHint: "Arraste um atendimento ou clique em +",
      interestOptions: [
        { value: "package_flight", label: "Pacote Aéreo Completo" },
        { value: "hotel", label: "Hospedagem / Resort" },
        { value: "package_ground", label: "Excursão Rodoviária" },
        { value: "flights", label: "Passagens Aéreas" },
        { value: "cruise", label: "Cruzeiro Marítimo" },
        { value: "visa", label: "Visto e Passaporte" },
        { value: "corporate", label: "Viagem Corporativa" },
      ],
      sourceOptions: [
        { value: "whatsapp", label: "WhatsApp" },
        { value: "balcao", label: "Balcão / Agência" },
        ...COMMON_SOURCE_OPTIONS.filter((o) => !["whatsapp", "balcao"].includes(o.value)),
      ],
      defaultChecklist: [
        "Validar datas, aeroporto de origem e flexibilidade",
        "Confirmar composição e idade dos passageiros",
        "Montar comparativo de 2 a 3 opções de hospedagem",
        "Enviar proposta interativa e agendar follow-up",
      ],
    },
  },

  real_estate: {
    nicheId: "real_estate",
    label: "Imobiliária & Imóveis",
    legacyPresetNiche: "imobiliaria",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novos Interessados", "inbox", "new", "var(--primary)", 0, 15, "Contatos recebidos dos portais ou anúncios", ["inbox", "lead", "captacao"]),
      buildStage("contact", "Perfil do Imóvel", "in_progress", "contacted", "var(--warning)", 1, 60, "Levantamento de região, quartos, faixa e financiamento", ["contacted", "briefing", "qualificacao_inicial", "sondagem"]),
      buildStage("visit_scheduled", "Visita Agendada", "in_progress", "qualified", "var(--accent-foreground)", 2, 180, "Seleção de imóveis e visita presencial agendada", ["qualified", "visita", "visita_agendada", "agendamento"]),
      buildStage("proposal", "Proposta / Crédito", "review", "proposal", "var(--primary)", 3, 240, "Carta proposta e análise de crédito imobiliário", ["proposta", "proposta_credito", "aprovacao_credito"]),
      buildStage("negotiation", "Contratos & Jurídico", "review", "negotiation", "var(--warning-strong)", 4, 480, "Vistoria, certidões e minuta contratual", ["negociacao", "juridico", "minuta"]),
      buildStage("won", "Contrato Assinado", "won", "won", "var(--success)", 5, 1440, "Venda ou locação concluída com chaves entregues", ["converted", "ganho", "contrato_assinado", "chaves_entregues"]),
      buildStage("lost", "Descartado", "lost", "lost", "var(--destructive)", 6, 1440, "Sem aderência ao estoque ou crédito reprovado", ["perdido", "descartado", "cancelled"]),
    ],
    terminology: {
      entitySingular: "Lead Imobiliário",
      entityPlural: "Interessados em Imóveis",
      newLeadCta: "Novo Interessado",
      searchPlaceholder: "Buscar interessado ou imóvel...",
      contextFieldLabel: "Imóvel / Região",
      contextPlaceholder: "Ex: Apto 3Q Centro, Casa Condomínio",
      emptyColumnHint: "Arraste um interessado ou clique em +",
      interestOptions: [
        { value: "buy_apartment", label: "Compra — Apartamento" },
        { value: "buy_house", label: "Compra — Casa / Terreno" },
        { value: "rent_residential", label: "Locação Residencial" },
        { value: "commercial_property", label: "Imóvel Comercial" },
        { value: "launch_investment", label: "Lançamento / Planta" },
        { value: "rural", label: "Área Rural / Chácara" },
      ],
      sourceOptions: [
        { value: "portal_imobiliario", label: "Portal Imobiliário" },
        { value: "placa_imovel", label: "Placa no Imóvel" },
        ...COMMON_SOURCE_OPTIONS,
      ],
      defaultChecklist: [
        "Validar intenção (compra vs locação) e faixa de valor",
        "Checar possibilidade de financiamento ou FGTS",
        "Enviar opções selecionadas e confirmar visita",
        "Coletar documentação para análise de crédito",
      ],
    },
  },

  automotive: {
    nicheId: "automotive",
    label: "Automotivo & Oficina",
    legacyPresetNiche: "oficina",
    cardVariant: "service_order",
    stages: [
      buildStage("new", "Recepção / Triagem", "inbox", "new", "var(--primary)", 0, 15, "Solicitações de orçamento, veículo ou revisão", ["inbox", "triagem", "recepcao"], "service_order"),
      buildStage("contact", "Diagnóstico Inicial", "in_progress", "contacted", "var(--warning)", 1, 60, "Coleta de placa, sintomas, km ou modelo desejado", ["contacted", "briefing", "diagnostico", "vistoria"], "service_order"),
      buildStage("qualified", "Peças / Avaliação", "in_progress", "qualified", "var(--accent-foreground)", 2, 180, "Cotação de peças ou avaliação de veículo usado", ["qualified", "cotacao_pecas", "avaliacao"], "service_order"),
      buildStage("proposal", "Orçamento Enviado", "review", "proposal", "var(--primary)", 3, 240, "Orçamento ou proposta de financiamento apresentada", ["proposta", "orcamento", "proposta_enviada"], "service_order"),
      buildStage("negotiation", "Na Rampa / Execução", "review", "negotiation", "var(--warning-strong)", 4, 360, "Serviço aprovado em execução ou liberação de crédito", ["in_service", "em_execucao", "negociacao", "aprovado"], "service_order"),
      buildStage("won", "Pronto / Entregue", "won", "won", "var(--success)", 5, 1440, "Veículo entregue ou OS liquidada", ["converted", "entregue", "concluido", "faturado"], "service_order"),
      buildStage("lost", "Não Aprovado", "lost", "lost", "var(--destructive)", 6, 1440, "Orçamento recusado ou desistência", ["perdido", "recusado", "cancelled"], "service_order"),
    ],
    terminology: {
      entitySingular: "Atendimento Automotivo",
      entityPlural: "Veículos & Ordens",
      newLeadCta: "Novo Atendimento",
      searchPlaceholder: "Buscar cliente, placa ou modelo...",
      contextFieldLabel: "Veículo / Serviço",
      contextPlaceholder: "Ex: Civic 2022 - Revisão 40k",
      emptyColumnHint: "Arraste um veículo ou clique em +",
      interestOptions: [
        { value: "mechanical_service", label: "Revisão / Mecânica Geral" },
        { value: "diagnostic_eletric", label: "Diagnóstico & Injeção" },
        { value: "body_paint", label: "Funilaria & Estética" },
        { value: "buy_vehicle", label: "Compra de Veículo" },
        { value: "financing_trade", label: "Financiamento / Troca" },
      ],
      sourceOptions: [
        { value: "balcao", label: "Pátio / Recepção" },
        ...COMMON_SOURCE_OPTIONS.filter((o) => o.value !== "balcao"),
      ],
      defaultChecklist: [
        "Confirmar placa, modelo, ano e quilometragem",
        "Registrar checklist de avarias na entrada",
        "Enviar orçamento detalhado com prazo de entrega",
        "Confirmar aprovação antes da compra de peças",
      ],
    },
  },

  beauty_salon: {
    nicheId: "beauty_salon",
    label: "Salão de Beleza & Cabelo",
    legacyPresetNiche: "servicos",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novas Solicitações", "inbox", "new", "var(--primary)", 0, 15, "Mensagens pedindo horários ou orçamento de procedimentos"),
      buildStage("contact", "Avaliação Capilar", "in_progress", "contacted", "var(--warning)", 1, 60, "Entendimento de histórico químico, fotos e desejo da cliente", ["contacted", "briefing", "avaliacao"]),
      buildStage("qualified", "Horário Sugerido", "in_progress", "qualified", "var(--accent-foreground)", 2, 120, "Indicação de profissional e janelas disponíveis", ["qualified", "horario_sugerido"]),
      buildStage("proposal", "Orçamento / Pacote", "review", "proposal", "var(--primary)", 3, 180, "Valores do procedimento ou combo passados à cliente", ["proposta", "orcamento"]),
      buildStage("negotiation", "Sinal / Confirmação", "review", "negotiation", "var(--warning-strong)", 4, 240, "Reserva de agenda mediante sinal ou confirmação", ["confirmed", "negociacao", "sinal"]),
      buildStage("won", "Agendado / Atendido", "won", "won", "var(--success)", 5, 1440, "Horário garantido na agenda ou serviço concluído", ["converted", "agendado", "concluido"]),
      buildStage("lost", "Cancelado", "lost", "lost", "var(--destructive)", 6, 1440, "Não compareceu ou desistiu do horário", ["perdido", "cancelled", "no_show"]),
    ],
    terminology: {
      entitySingular: "Cliente / Avaliação",
      entityPlural: "Clientes & Agendamentos",
      newLeadCta: "Novo Atendimento",
      searchPlaceholder: "Buscar cliente ou serviço...",
      contextFieldLabel: "Procedimento Desejado",
      contextPlaceholder: "Ex: Mechas, Progressiva, Dia da Noiva",
      emptyColumnHint: "Arraste uma cliente ou clique em +",
      interestOptions: [
        { value: "color_highlights", label: "Coloração / Mechas" },
        { value: "hair_treatment", label: "Tratamento / Terapia Capilar" },
        { value: "bride_day", label: "Dia da Noiva / Produção" },
        { value: "nails_makeup", label: "Manicure & Maquiagem" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Solicitar foto atual do cabelo e histórico químico",
        "Sugerir profissional especialista e duração estimada",
        "Enviar orçamento e link de agendamento / sinal",
      ],
    },
  },

  barbershop: {
    nicheId: "barbershop",
    label: "Barbearia & Grooming",
    legacyPresetNiche: "servicos",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novos Contatos", "inbox", "new", "var(--primary)", 0, 15, "Clientes buscando horário ou plano mensal"),
      buildStage("contact", "Escolha do Serviço", "in_progress", "contacted", "var(--warning)", 1, 30, "Corte, barba, combo ou assinatura VIP", ["contacted", "briefing"]),
      buildStage("qualified", "Horário & Barbeiro", "in_progress", "qualified", "var(--accent-foreground)", 2, 60, "Alinhamento de cadeira e horário disponível", ["qualified"]),
      buildStage("proposal", "Proposta de Plano", "review", "proposal", "var(--primary)", 3, 120, "Apresentação de clube mensal ou combo", ["proposta"]),
      buildStage("negotiation", "Confirmação", "review", "negotiation", "var(--warning-strong)", 4, 180, "Aguardando confirmação ou adesão", ["confirmed", "negociacao"]),
      buildStage("won", "Confirmado / Clube", "won", "won", "var(--success)", 5, 1440, "Horário reservado ou assinatura ativa", ["converted", "completed"]),
      buildStage("lost", "Desistência", "lost", "lost", "var(--destructive)", 6, 1440, "Falta ou sem interesse", ["perdido", "cancelled"]),
    ],
    terminology: {
      entitySingular: "Cliente da Barbearia",
      entityPlural: "Clientes & Clube",
      newLeadCta: "Novo Cliente",
      searchPlaceholder: "Buscar cliente ou plano...",
      contextFieldLabel: "Serviço / Plano",
      contextPlaceholder: "Ex: Corte + Barba, Clube Ilimitado",
      emptyColumnHint: "Arraste um cliente ou clique em +",
      interestOptions: [
        { value: "hair_beard", label: "Corte & Barba" },
        { value: "subscription_club", label: "Clube / Assinatura Mensal" },
        { value: "groom_day", label: "Dia do Noivo" },
        { value: "products", label: "Produtos de Barba" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Confirmar barbeiro de preferência e horário",
        "Ofertar plano de assinatura mensal recorrente",
        "Enviar lembrete de agenda no WhatsApp",
      ],
    },
  },

  aesthetics_clinic: {
    nicheId: "aesthetics_clinic",
    label: "Clínica de Estética",
    legacyPresetNiche: "servicos",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novos Leads", "inbox", "new", "var(--primary)", 0, 15, "Interessados em protocolos estéticos"),
      buildStage("contact", "Pré-Avaliação", "in_progress", "contacted", "var(--warning)", 1, 60, "Anamnese rápida e área de interesse", ["contacted", "briefing", "anamnesis"]),
      buildStage("qualified", "Avaliação Agendada", "in_progress", "qualified", "var(--accent-foreground)", 2, 180, "Consulta presencial com especialista marcada", ["qualified", "avaliacao"]),
      buildStage("proposal", "Protocolo Enviado", "review", "proposal", "var(--primary)", 3, 240, "Plano de sessões e investimento apresentado", ["proposta", "protocolo"]),
      buildStage("negotiation", "Condições & Parcelas", "review", "negotiation", "var(--warning-strong)", 4, 360, "Fechamento de pacote de sessões", ["negociacao"]),
      buildStage("won", "Protocolo Fechado", "won", "won", "var(--success)", 5, 1440, "Paciente matriculada no protocolo", ["converted", "fechado"]),
      buildStage("lost", "Não Fechou", "lost", "lost", "var(--destructive)", 6, 1440, "Contraindicação ou desistência", ["perdido", "cancelled"]),
    ],
    terminology: {
      entitySingular: "Paciente de Estética",
      entityPlural: "Pacientes & Protocolos",
      newLeadCta: "Nova Avaliação",
      searchPlaceholder: "Buscar paciente ou protocolo...",
      contextFieldLabel: "Protocolo de Interesse",
      contextPlaceholder: "Ex: Harmonização, Laser, Drenagem",
      emptyColumnHint: "Arraste um card ou clique em +",
      interestOptions: [
        { value: "facial", label: "Estética Facial" },
        { value: "body", label: "Estética Corporal" },
        { value: "laser", label: "Depilação / Laser" },
        { value: "injectables", label: "Injetáveis & Bioestimuladores" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Verificar restrições ou histórico clínico prévio",
        "Agendar avaliação diagnóstica presencial",
        "Apresentar plano de sessões com antes/depois permitido",
      ],
    },
  },

  healthcare: {
    nicheId: "healthcare",
    label: "Saúde & Clínica Médica",
    legacyPresetNiche: "servicos",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Recepção / Triagem", "inbox", "new", "var(--primary)", 0, 15, "Pacientes entrando em contato"),
      buildStage("contact", "Triagem Clínica", "in_progress", "contacted", "var(--warning)", 1, 45, "Especialidade, convênio ou particular", ["contacted", "briefing", "triagem"]),
      buildStage("qualified", "Consulta Marcada", "in_progress", "qualified", "var(--accent-foreground)", 2, 120, "Horário confirmado na agenda médica", ["qualified", "agendado", "confirmed"]),
      buildStage("proposal", "Plano / Exames", "review", "proposal", "var(--primary)", 3, 240, "Orçamento de procedimento ou exames", ["proposta"]),
      buildStage("negotiation", "Autorização / Convênio", "review", "negotiation", "var(--warning-strong)", 4, 360, "Aprovação de guia ou pagamento particular", ["negociacao"]),
      buildStage("won", "Atendimento Concluído", "won", "won", "var(--success)", 5, 1440, "Consulta ou procedimento realizado", ["converted", "completed"]),
      buildStage("lost", "Ausência / Cancelado", "lost", "lost", "var(--destructive)", 6, 1440, "Não compareceu ou desistiu", ["perdido", "cancelled"]),
    ],
    terminology: {
      entitySingular: "Paciente",
      entityPlural: "Pacientes & Consultas",
      newLeadCta: "Novo Paciente",
      searchPlaceholder: "Buscar paciente ou especialidade...",
      contextFieldLabel: "Especialidade / Queixa",
      contextPlaceholder: "Ex: Cardiologia, Exame Check-up",
      emptyColumnHint: "Arraste um paciente ou clique em +",
      interestOptions: [
        { value: "consultation", label: "Consulta Especializada" },
        { value: "exam", label: "Exames & Diagnóstico" },
        { value: "procedure", label: "Procedimento Ambulatorial" },
        { value: "return_visit", label: "Retorno / Acompanhamento" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Confirmar convênio vs particular e disponibilidade",
        "Coletar dados mínimos para prontuário e LGPD",
        "Enviar orientações de preparo antes da consulta",
      ],
    },
  },

  dental: {
    nicheId: "dental",
    label: "Odontologia",
    legacyPresetNiche: "servicos",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novos Contatos", "inbox", "new", "var(--primary)", 0, 15, "Pacientes buscando avaliação odontológica"),
      buildStage("contact", "Triagem Odontológica", "in_progress", "contacted", "var(--warning)", 1, 60, "Urgência, implante, ortodontia ou estética", ["contacted", "briefing", "triagem"]),
      buildStage("qualified", "Avaliação Marcada", "in_progress", "qualified", "var(--accent-foreground)", 2, 120, "Dia e hora confirmados na cadeira", ["qualified", "avaliacao"]),
      buildStage("proposal", "Plano de Tratamento", "review", "proposal", "var(--primary)", 3, 240, "Orçamento odontológico apresentado", ["proposta", "orcamento"]),
      buildStage("negotiation", "Aprovação Financeira", "review", "negotiation", "var(--warning-strong)", 4, 360, "Parcelamento e assinatura do plano", ["negociacao"]),
      buildStage("won", "Tratamento Iniciado", "won", "won", "var(--success)", 5, 1440, "Orçamento aprovado e em execução", ["converted", "em_tratamento"]),
      buildStage("lost", "Não Aprovado", "lost", "lost", "var(--destructive)", 6, 1440, "Orçamento não aprovado", ["perdido", "cancelled"]),
    ],
    terminology: {
      entitySingular: "Paciente Odonto",
      entityPlural: "Pacientes & Planos",
      newLeadCta: "Novo Paciente",
      searchPlaceholder: "Buscar paciente ou tratamento...",
      contextFieldLabel: "Tratamento Desejado",
      contextPlaceholder: "Ex: Implante, Alinhador, Clareamento",
      emptyColumnHint: "Arraste um paciente ou clique em +",
      interestOptions: [
        { value: "implant", label: "Implantes & Prótese" },
        { value: "orthodontics", label: "Ortodontia / Alinhadores" },
        { value: "aesthetic", label: "Lentes & Clareamento" },
        { value: "urgency", label: "Canal / Dor / Urgência" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Identificar urgência e histórico radiográfico",
        "Confirmar avaliação inicial com dentista",
        "Apresentar plano de tratamento detalhado por etapas",
      ],
    },
  },

  psychology: {
    nicheId: "psychology",
    label: "Psicologia & Terapia",
    legacyPresetNiche: "servicos",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Acolhimento Inicial", "inbox", "new", "var(--primary)", 0, 30, "Contatos iniciais solicitando atendimento"),
      buildStage("contact", "Entrevista de Triagem", "in_progress", "contacted", "var(--warning)", 1, 120, "Modalidade online/presencial e demanda", ["contacted", "briefing", "acolhimento"]),
      buildStage("qualified", "1ª Sessão Agendada", "in_progress", "qualified", "var(--accent-foreground)", 2, 240, "Horário reservado para sessão inicial", ["qualified", "sessao_agendada"]),
      buildStage("proposal", "Contrato Terapêutico", "review", "proposal", "var(--primary)", 3, 360, "Combinação de frequência e honorários", ["proposta", "contrato"]),
      buildStage("negotiation", "Ajuste de Agenda", "review", "negotiation", "var(--warning-strong)", 4, 480, "Definição de dia fixo semanal", ["negociacao"]),
      buildStage("won", "Em Acompanhamento", "won", "won", "var(--success)", 5, 1440, "Paciente em terapia regular", ["converted", "ativo"]),
      buildStage("lost", "Encaminhado / Inativo", "lost", "lost", "var(--destructive)", 6, 1440, "Encaminhamento ou desistência", ["perdido", "encaminhado"]),
    ],
    terminology: {
      entitySingular: "Paciente / Sessão",
      entityPlural: "Acolhimentos & Sessões",
      newLeadCta: "Novo Acolhimento",
      searchPlaceholder: "Buscar paciente...",
      contextFieldLabel: "Modalidade / Demanda",
      contextPlaceholder: "Ex: Terapia Individual Online, Casal",
      emptyColumnHint: "Arraste um acolhimento ou clique em +",
      interestOptions: [
        { value: "individual_online", label: "Terapia Individual Online" },
        { value: "individual_presencial", label: "Terapia Presencial" },
        { value: "couples", label: "Terapia de Casal / Família" },
        { value: "child_teen", label: "Infantil & Adolescente" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Confirmar preferência online ou presencial",
        "Alinhar horários disponíveis e política de faltas",
        "Enviar termo de consentimento sigiloso",
      ],
    },
  },

  vet_petshop: {
    nicheId: "vet_petshop",
    label: "Pet Shop & Veterinária",
    legacyPresetNiche: "servicos",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novos Tutores", "inbox", "new", "var(--primary)", 0, 15, "Mensagens sobre consulta, banho ou hospedagem"),
      buildStage("contact", "Dados do Pet", "in_progress", "contacted", "var(--warning)", 1, 45, "Espécie, porte, idade e carteira de vacinas", ["contacted", "briefing"]),
      buildStage("qualified", "Agenda / Triagem", "in_progress", "qualified", "var(--accent-foreground)", 2, 120, "Horário para banho, tosa ou consulta vet", ["qualified"]),
      buildStage("proposal", "Orçamento / Plano Pet", "review", "proposal", "var(--primary)", 3, 180, "Valores de cirurgia, exame ou pacote mensal", ["proposta"]),
      buildStage("negotiation", "Confirmação", "review", "negotiation", "var(--warning-strong)", 4, 240, "Confirmação de leva-e-traz ou internação", ["negociacao"]),
      buildStage("won", "Confirmado / Fidelizado", "won", "won", "var(--success)", 5, 1440, "Pet atendido ou pacote mensal fechado", ["converted", "completed"]),
      buildStage("lost", "Cancelado", "lost", "lost", "var(--destructive)", 6, 1440, "Cancelado pelo tutor", ["perdido", "cancelled"]),
    ],
    terminology: {
      entitySingular: "Tutor & Pet",
      entityPlural: "Tutores & Pets",
      newLeadCta: "Novo Tutor",
      searchPlaceholder: "Buscar tutor, pet ou serviço...",
      contextFieldLabel: "Pet / Serviço",
      contextPlaceholder: "Ex: Golden Retriever - Vacina + Banho",
      emptyColumnHint: "Arraste um tutor ou clique em +",
      interestOptions: [
        { value: "vet_consult", label: "Consulta Veterinária" },
        { value: "bath_groom", label: "Banho & Tosa / Pacote" },
        { value: "vaccines", label: "Vacinas & Exames" },
        { value: "pet_hotel", label: "Creche / Hotel Pet" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Registrar nome do pet, raça, peso e idade",
        "Confirmar vacinação em dia",
        "Combinar necessidade de táxi dog",
      ],
    },
  },

  gastronomy: {
    nicheId: "gastronomy",
    label: "Gastronomia & Eventos",
    legacyPresetNiche: "gastronomia",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novos Pedidos / Eventos", "inbox", "new", "var(--primary)", 0, 15, "Solicitações de reservas, buffet ou kits festa"),
      buildStage("contact", "Briefing de Cardápio", "in_progress", "contacted", "var(--warning)", 1, 60, "Número de pessoas, restrições e horário", ["contacted", "briefing"]),
      buildStage("qualified", "Orçamento / Degustação", "in_progress", "qualified", "var(--accent-foreground)", 2, 180, "Montagem de menu e disponibilidade de cozinha", ["qualified"]),
      buildStage("proposal", "Orçamento Enviado", "review", "proposal", "var(--primary)", 3, 240, "Cardápio orçado enviado ao cliente", ["proposta"]),
      buildStage("negotiation", "Sinal / Reserva de Data", "review", "negotiation", "var(--warning-strong)", 4, 360, "Confirmação de depósito e endereço", ["negociacao"]),
      buildStage("won", "Pedido Confirmado", "won", "won", "var(--success)", 5, 1440, "Encomenda ou reserva garantida na cozinha", ["converted", "confirmed", "delivered"]),
      buildStage("lost", "Cancelado", "lost", "lost", "var(--destructive)", 6, 1440, "Data indisponível ou cancelado", ["perdido", "cancelled"]),
    ],
    terminology: {
      entitySingular: "Encomenda / Reserva",
      entityPlural: "Encomendas & Reservas",
      newLeadCta: "Nova Encomenda",
      searchPlaceholder: "Buscar cliente ou cardápio...",
      contextFieldLabel: "Evento / Cardápio",
      contextPlaceholder: "Ex: Coquetel 60 pessoas, Mesa VIP",
      emptyColumnHint: "Arraste uma encomenda ou clique em +",
      interestOptions: [
        { value: "buffet_catering", label: "Buffet / Coffee Break" },
        { value: "table_reservation", label: "Reserva de Salão / Grupo" },
        { value: "party_kits", label: "Kits Festa & Encomendas" },
        { value: "corporate_meals", label: "Convênio / Marmitas PJ" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Confirmar número exato de convidados",
        "Checar alergias ou restrições alimentares",
        "Validar sinal de reserva e horário de entrega",
      ],
    },
  },

  market_perishables: {
    nicheId: "market_perishables",
    label: "Supermercado & Hortifrúti",
    legacyPresetNiche: "supermercado",
    cardVariant: "picking",
    stages: [
      buildStage("new", "Novos Orçamentos", "inbox", "new", "var(--primary)", 0, 15, "Cestas, pedidos B2B ou grandes compras", ["inbox", "novo"], "picking"),
      buildStage("contact", "Levantamento de Lista", "in_progress", "contacted", "var(--warning)", 1, 60, "Itens solicitados e frequência de entrega", ["contacted", "briefing"], "picking"),
      buildStage("qualified", "Cotação de Estoque", "in_progress", "qualified", "var(--accent-foreground)", 2, 120, "Conferência de perecíveis e atacado", ["qualified"], "picking"),
      buildStage("proposal", "Tabela Enviada", "review", "proposal", "var(--primary)", 3, 180, "Orçamento por item e frete apresentados", ["proposta"], "picking"),
      buildStage("negotiation", "Separação / Pagamento", "review", "negotiation", "var(--warning-strong)", 4, 240, "Faturamento e agendamento de entrega", ["negociacao", "preparing"], "picking"),
      buildStage("won", "Pedido Entregue", "won", "won", "var(--success)", 5, 1440, "Lista faturada e entregue", ["converted", "delivered"], "picking"),
      buildStage("lost", "Não Fechado", "lost", "lost", "var(--destructive)", 6, 1440, "Sem saldo ou cancelado", ["perdido", "cancelled"], "picking"),
    ],
    terminology: {
      entitySingular: "Pedido / Cota B2B",
      entityPlural: "Pedidos & Cotações",
      newLeadCta: "Novo Pedido",
      searchPlaceholder: "Buscar comprador ou lista...",
      contextFieldLabel: "Lista / Categoria",
      contextPlaceholder: "Ex: Cestas Básicas, Cozinha Industrial",
      emptyColumnHint: "Arraste um pedido ou clique em +",
      interestOptions: [
        { value: "baskets", label: "Cestas Básicas / Kits" },
        { value: "wholesale", label: "Atacado para Restaurantes" },
        { value: "scheduled_delivery", label: "Entrega Programada" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Conferir disponibilidade em câmara fria / estoque",
        "Calcular prazo de entrega e frete por rota",
        "Confirmar prazo de boleto/PIX",
      ],
    },
  },

  pharmacy: {
    nicheId: "pharmacy",
    label: "Farmácia & Manipulação",
    legacyPresetNiche: "servicos",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novas Receitas", "inbox", "new", "var(--primary)", 0, 10, "Receitas médicas ou pedidos via WhatsApp"),
      buildStage("contact", "Triagem Farmacêutica", "in_progress", "contacted", "var(--warning)", 1, 20, "Leitura da fórmula e atenção à receita", ["contacted", "briefing", "triagem"]),
      buildStage("qualified", "Pesagem / Orçamento", "in_progress", "qualified", "var(--accent-foreground)", 2, 60, "Cálculo de ativos e disponibilidade de estoque", ["qualified"]),
      buildStage("proposal", "Orçamento Enviado", "review", "proposal", "var(--primary)", 3, 90, "Preço da fórmula e prazo apresentados", ["proposta"]),
      buildStage("negotiation", "Manipulação / Entrega", "review", "negotiation", "var(--warning-strong)", 4, 180, "Aprovado para manipulação ou motoboy", ["negociacao"]),
      buildStage("won", "Dispensado / Entregue", "won", "won", "var(--success)", 5, 1440, "Fórmula entregue com orientação farmacêutica", ["converted", "delivered"]),
      buildStage("lost", "Cancelado", "lost", "lost", "var(--destructive)", 6, 1440, "Orçamento não aprovado", ["perdido", "cancelled"]),
    ],
    terminology: {
      entitySingular: "Receita / Fórmula",
      entityPlural: "Receitas & Fórmulas",
      newLeadCta: "Nova Receita",
      searchPlaceholder: "Buscar cliente ou receita...",
      contextFieldLabel: "Fórmula / Medicamento",
      contextPlaceholder: "Ex: Fórmula Manipulada, Uso Contínuo",
      emptyColumnHint: "Arraste uma receita ou clique em +",
      interestOptions: [
        { value: "compounding", label: "Fórmula Manipulada" },
        { value: "tele_delivery", label: "Tele-Entrega Express" },
        { value: "continuous_use", label: "Uso Contínuo / Programa" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Conferir assinatura médica e validade da receita",
        "Confirmar endereço e janela da entrega",
        "Anexar orientação posológica na saída",
      ],
    },
  },

  retail: {
    nicheId: "retail",
    label: "Comércio & Varejo",
    legacyPresetNiche: "geral",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novos Interessados", "inbox", "new", "var(--primary)", 0, 15, "Clientes perguntando sobre produtos ou estoque"),
      buildStage("contact", "Atendimento Consultivo", "in_progress", "contacted", "var(--warning)", 1, 60, "Escolha de cor, numeração, voltagem ou kit", ["contacted", "briefing"]),
      buildStage("qualified", "Separação / Reserva", "in_progress", "qualified", "var(--accent-foreground)", 2, 120, "Produto reservado e frete calculado", ["qualified"]),
      buildStage("proposal", "Link de Pagamento", "review", "proposal", "var(--primary)", 3, 180, "Checkout enviado com resumo do pedido", ["proposta"]),
      buildStage("negotiation", "Condições / Cupom", "review", "negotiation", "var(--warning-strong)", 4, 240, "Ajuste de parcelas ou retirada na loja", ["negociacao"]),
      buildStage("won", "Venda Concluída", "won", "won", "var(--success)", 5, 1440, "Pedido pago e despachado", ["converted", "paid"]),
      buildStage("lost", "Carrinho Perdido", "lost", "lost", "var(--destructive)", 6, 1440, "Sem resposta ou sem estoque", ["perdido", "cancelled"]),
    ],
    terminology: {
      entitySingular: "Atendimento de Venda",
      entityPlural: "Vendas & Reservas",
      newLeadCta: "Novo Atendimento",
      searchPlaceholder: "Buscar cliente ou produto...",
      contextFieldLabel: "Produto / Grade",
      contextPlaceholder: "Ex: Tênis Runner 41, Kit Presente",
      emptyColumnHint: "Arraste um atendimento ou clique em +",
      interestOptions: [
        { value: "single_purchase", label: "Compra Varejo" },
        { value: "combo_kit", label: "Kit / Combo" },
        { value: "wholesale", label: "Atacado / Lojista" },
        { value: "exchange", label: "Troca / Encomenda" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Confirmar tamanho/cor em estoque físico",
        "Enviar fotos reais e tabela de medidas",
        "Mandar link de pagamento PIX com desconto",
      ],
    },
  },

  services: {
    nicheId: "services",
    label: "Serviços Especializados",
    legacyPresetNiche: "servicos",
    cardVariant: "service_order",
    stages: [
      buildStage("new", "Novos Chamados", "inbox", "new", "var(--primary)", 0, 15, "Solicitações de atendimento técnico", ["inbox", "chamado"], "service_order"),
      buildStage("contact", "Triagem & Escopo", "in_progress", "contacted", "var(--warning)", 1, 60, "Entendimento do problema, local ou equipamento", ["contacted", "briefing", "triagem"], "service_order"),
      buildStage("qualified", "Visita / Vistoria", "in_progress", "qualified", "var(--accent-foreground)", 2, 180, "Avaliação técnica no local ou bancada", ["qualified", "vistoria"], "service_order"),
      buildStage("proposal", "Orçamento Enviado", "review", "proposal", "var(--primary)", 3, 240, "Proposta técnica e cronograma apresentados", ["proposta", "orcamento"], "service_order"),
      buildStage("negotiation", "Em Execução", "review", "negotiation", "var(--warning-strong)", 4, 360, "Ordem de serviço aprovada e em andamento", ["in_service", "negociacao", "execucao"], "service_order"),
      buildStage("won", "OS Concluída", "won", "won", "var(--success)", 5, 1440, "Serviço entregue e validado pelo cliente", ["converted", "completed", "concluido"], "service_order"),
      buildStage("lost", "Recusado / Cancelado", "lost", "lost", "var(--destructive)", 6, 1440, "Orçamento declinado", ["perdido", "cancelled"], "service_order"),
    ],
    terminology: {
      entitySingular: "Ordem de Serviço",
      entityPlural: "Chamados & OS",
      newLeadCta: "Novo Chamado",
      searchPlaceholder: "Buscar cliente ou serviço...",
      contextFieldLabel: "Serviço / Escopo",
      contextPlaceholder: "Ex: Manutenção Elétrica, Instalação Ar",
      emptyColumnHint: "Arraste um chamado ou clique em +",
      interestOptions: [
        { value: "installation", label: "Instalação / Projeto" },
        { value: "maintenance", label: "Manutenção Preventiva / Corretiva" },
        { value: "consulting", label: "Consultoria Técnica" },
        { value: "contract_monthly", label: "Contrato Mensal (SLA)" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Solicitar fotos ou modelo do equipamento/local",
        "Informar taxa de visita ou diagnóstico",
        "Enviar orçamento detalhado com garantia",
      ],
    },
  },

  law_firm: {
    nicheId: "law_firm",
    label: "Advocacia & Jurídico",
    legacyPresetNiche: "servicos",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novas Consultas", "inbox", "new", "var(--primary)", 0, 30, "Demandas jurídicas recebidas"),
      buildStage("contact", "Triagem de Fatos", "in_progress", "contacted", "var(--warning)", 1, 90, "Relato inicial, competência e prazos fatais", ["contacted", "briefing", "triagem"]),
      buildStage("qualified", "Análise Documental", "in_progress", "qualified", "var(--accent-foreground)", 2, 240, "Estudo de viabilidade e provas disponíveis", ["qualified", "viabilidade"]),
      buildStage("proposal", "Proposta Honorários", "review", "proposal", "var(--primary)", 3, 360, "Contrato de honorários e procuração enviados", ["proposta", "honorarios"]),
      buildStage("negotiation", "Assinatura / Procuração", "review", "negotiation", "var(--warning-strong)", 4, 480, "Assinatura digital e pagamento de entrada", ["negociacao", "contrato"]),
      buildStage("won", "Caso Contratado", "won", "won", "var(--success)", 5, 1440, "Mandato ativo e pasta processual aberta", ["converted", "contratado"]),
      buildStage("lost", "Inviável / Declinado", "lost", "lost", "var(--destructive)", 6, 1440, "Sem viabilidade jurídica ou recusado", ["perdido", "declinado"]),
    ],
    terminology: {
      entitySingular: "Caso Jurídico",
      entityPlural: "Consultas & Casos",
      newLeadCta: "Nova Consulta",
      searchPlaceholder: "Buscar cliente ou matéria...",
      contextFieldLabel: "Área / Matéria",
      contextPlaceholder: "Ex: Trabalhista, Família, Cível, Empresa",
      emptyColumnHint: "Arraste um caso ou clique em +",
      interestOptions: [
        { value: "civil_contracts", label: "Cível & Contratos" },
        { value: "labor", label: "Trabalhista" },
        { value: "family_estate", label: "Família & Sucessões" },
        { value: "corporate_tax", label: "Empresarial & Tributário" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Checar se há prazo judicial ou audiência próxima",
        "Solicitar documentos básicos para parecer inicial",
        "Enviar contrato de honorários e procuração ad judicia",
      ],
    },
  },

  accounting: {
    nicheId: "accounting",
    label: "Contabilidade & Fiscal",
    legacyPresetNiche: "servicos",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novas Empresas", "inbox", "new", "var(--primary)", 0, 30, "Empresários ou autônomos pedindo suporte"),
      buildStage("contact", "Diagnóstico Tributário", "in_progress", "contacted", "var(--warning)", 1, 90, "Regime atual, faturamento, CNPJ e equipe", ["contacted", "briefing", "diagnostico"]),
      buildStage("qualified", "Análise de Enquadramento", "in_progress", "qualified", "var(--accent-foreground)", 2, 240, "Estudo Simples Nacional / Lucro Presumido", ["qualified"]),
      buildStage("proposal", "Proposta Contábil", "review", "proposal", "var(--primary)", 3, 360, "Escopo mensal e honorários apresentados", ["proposta"]),
      buildStage("negotiation", "Migração / Abertura", "review", "negotiation", "var(--warning-strong)", 4, 480, "Distrato anterior ou protocolo Junta Comercial", ["negociacao"]),
      buildStage("won", "Cliente em Carteira", "won", "won", "var(--success)", 5, 1440, "Onboarding fiscal finalizado", ["converted", "onboarding"]),
      buildStage("lost", "Não Fechou", "lost", "lost", "var(--destructive)", 6, 1440, "Sem contratação", ["perdido"]),
    ],
    terminology: {
      entitySingular: "Lead Contábil",
      entityPlural: "Empresas & Propostas",
      newLeadCta: "Novo Diagnóstico",
      searchPlaceholder: "Buscar empresa, CNPJ ou sócio...",
      contextFieldLabel: "Regime / Demanda",
      contextPlaceholder: "Ex: Abertura LTDA, Migração Simples Nacional",
      emptyColumnHint: "Arraste uma empresa ou clique em +",
      interestOptions: [
        { value: "open_company", label: "Abertura de Empresa / CNPJ" },
        { value: "switch_accountant", label: "Troca de Contabilidade" },
        { value: "tax_planning", label: "Planejamento Tributário" },
        { value: "mei_upgrade", label: "Desenquadramento MEI" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Solicitar cartão CNPJ e último faturamento mensal",
        "Simular economia tributária comparativa",
        "Enviar proposta de honorários e checklist de certificado A1",
      ],
    },
  },

  education: {
    nicheId: "education",
    label: "Educação & Cursos",
    legacyPresetNiche: "servicos",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novos Interessados", "inbox", "new", "var(--primary)", 0, 15, "Candidatos interessados em cursos ou turmas"),
      buildStage("contact", "Sondagem Acadêmica", "in_progress", "contacted", "var(--warning)", 1, 60, "Objetivo do aluno, turno e nível prévio", ["contacted", "briefing"]),
      buildStage("qualified", "Aula Experimental", "in_progress", "qualified", "var(--accent-foreground)", 2, 180, "Demonstração, nivelamento ou visita escolar", ["qualified", "aula_experimental"]),
      buildStage("proposal", "Bolsa & Mensalidade", "review", "proposal", "var(--primary)", 3, 240, "Plano de pagamento e grade curricular", ["proposta"]),
      buildStage("negotiation", "Matrícula / Docs", "review", "negotiation", "var(--warning-strong)", 4, 360, "Envio de documentos e pagamento da 1ª parcela", ["negociacao"]),
      buildStage("won", "Matriculado", "won", "won", "var(--success)", 5, 1440, "Aluno confirmado na turma", ["converted", "matriculado"]),
      buildStage("lost", "Não Matriculou", "lost", "lost", "var(--destructive)", 6, 1440, "Desistência de matrícula", ["perdido", "cancelled"]),
    ],
    terminology: {
      entitySingular: "Candidato / Aluno",
      entityPlural: "Candidatos & Matrículas",
      newLeadCta: "Novo Candidato",
      searchPlaceholder: "Buscar aluno ou curso...",
      contextFieldLabel: "Curso / Turma",
      contextPlaceholder: "Ex: Inglês Avançado, Preparatório",
      emptyColumnHint: "Arraste um candidato ou clique em +",
      interestOptions: [
        { value: "in_person", label: "Curso Presencial" },
        { value: "online_live", label: "Turma Ao Vivo / EAD" },
        { value: "mentorship", label: "Mentoria Individual" },
        { value: "corporate_training", label: "Treinamento In-Company" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Identificar objetivo e disponibilidade de turno",
        "Agendar aula experimental ou teste de nível",
        "Liberar link de matrícula e contrato educacional",
      ],
    },
  },

  events: {
    nicheId: "events",
    label: "Eventos & Festas",
    legacyPresetNiche: "servicos",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novas Cotações", "inbox", "new", "var(--primary)", 0, 15, "Solicitações de shows, espaços ou ingressos VIP"),
      buildStage("contact", "Briefing do Evento", "in_progress", "contacted", "var(--warning)", 1, 60, "Data prevista, público estimado e formato", ["contacted", "briefing"]),
      buildStage("qualified", "Reserva de Data / Visita", "in_progress", "qualified", "var(--accent-foreground)", 2, 180, "Bloqueio de agenda e vistoria técnica", ["qualified"]),
      buildStage("proposal", "Proposta / Rider", "review", "proposal", "var(--primary)", 3, 240, "Orçamento completo com estrutura e equipe", ["proposta"]),
      buildStage("negotiation", "Contrato & Sinal", "review", "negotiation", "var(--warning-strong)", 4, 360, "Assinatura de contrato e pagamento de entrada", ["negociacao"]),
      buildStage("won", "Evento Confirmado", "won", "won", "var(--success)", 5, 1440, "Data garantida e produção iniciada", ["converted", "confirmado"]),
      buildStage("lost", "Data Liberada", "lost", "lost", "var(--destructive)", 6, 1440, "Proposta não aprovada", ["perdido", "cancelled"]),
    ],
    terminology: {
      entitySingular: "Evento / Camarote",
      entityPlural: "Eventos & Produções",
      newLeadCta: "Novo Evento",
      searchPlaceholder: "Buscar contratante ou data...",
      contextFieldLabel: "Evento / Data",
      contextPlaceholder: "Ex: Formatura Medicina, Camarote VIP",
      emptyColumnHint: "Arraste um evento ou clique em +",
      interestOptions: [
        { value: "social_wedding", label: "Casamento / Formatura" },
        { value: "corporate_event", label: "Evento Corporativo" },
        { value: "vip_tickets", label: "Camarote / Lotes VIP" },
        { value: "structure_rental", label: "Locação de Estrutura / Palco" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Conferir disponibilidade real da data solicitada",
        "Definir capacidade, sonorização e restrições do local",
        "Formalizar contrato com sinal de reserva",
      ],
    },
  },

  organizations: {
    nicheId: "organizations",
    label: "Associações & Entidades",
    legacyPresetNiche: "geral",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novos Interessados", "inbox", "new", "var(--primary)", 0, 30, "Pessoas ou empresas buscando filiação/parceria"),
      buildStage("contact", "Entrevista / Perfil", "in_progress", "contacted", "var(--warning)", 1, 120, "Compreensão do porte e interesse na entidade", ["contacted", "briefing"]),
      buildStage("qualified", "Análise de Diretoria", "in_progress", "qualified", "var(--accent-foreground)", 2, 240, "Validação cadastral e benefícios aplicáveis", ["qualified"]),
      buildStage("proposal", "Plano Associativo", "review", "proposal", "var(--primary)", 3, 360, "Apresentação de anuidade e contrapartidas", ["proposta"]),
      buildStage("negotiation", "Adesão / Termo", "review", "negotiation", "var(--warning-strong)", 4, 480, "Assinatura de ficha associativa", ["negociacao"]),
      buildStage("won", "Associado Ativo", "won", "won", "var(--success)", 5, 1440, "Membro oficial integrado à base", ["converted", "ativo"]),
      buildStage("lost", "Não Associado", "lost", "lost", "var(--destructive)", 6, 1440, "Processo arquivado", ["perdido"]),
    ],
    terminology: {
      entitySingular: "Proposta Associativa",
      entityPlural: "Filiados & Parceiros",
      newLeadCta: "Nova Filiação",
      searchPlaceholder: "Buscar interessado ou CNPJ...",
      contextFieldLabel: "Modalidade / Interesse",
      contextPlaceholder: "Ex: Mantenedor, Associado Pleno, Patrocínio",
      emptyColumnHint: "Arraste um card ou clique em +",
      interestOptions: [
        { value: "member_pj", label: "Associado Empresa (PJ)" },
        { value: "member_pf", label: "Associado Individual" },
        { value: "sponsorship", label: "Patrocínio / Parceria" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Validar CNPJ/CPF e enquadramento estatutário",
        "Apresentar portfólio de benefícios aos associados",
        "Enviar termo de adesão digital",
      ],
    },
  },

  creator: {
    nicheId: "creator",
    label: "Criador & Infoprodutos",
    legacyPresetNiche: "geral",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novos Contatos / DMs", "inbox", "new", "var(--primary)", 0, 15, "Seguidores interessados em mentoria, publis ou infoprodutos"),
      buildStage("contact", "Sondagem de Objetivo", "in_progress", "contacted", "var(--warning)", 1, 60, "Mapeamento de momento ou escopo da campanha", ["contacted", "briefing"]),
      buildStage("qualified", "Aplicação Qualificada", "in_progress", "qualified", "var(--accent-foreground)", 2, 120, "Fit aprovado para mentoria ou mídia kit", ["qualified"]),
      buildStage("proposal", "Mídia Kit / Proposta", "review", "proposal", "var(--primary)", 3, 240, "Condições enviadas para aprovação", ["proposta"]),
      buildStage("negotiation", "Contrato / Checkout", "review", "negotiation", "var(--warning-strong)", 4, 360, "Aprovação de roteiro ou pagamento de vaga", ["negociacao"]),
      buildStage("won", "Fechado / Aluno", "won", "won", "var(--success)", 5, 1440, "Contrato de marca ou vaga confirmada", ["converted", "fechado"]),
      buildStage("lost", "Sem Fit / Recusado", "lost", "lost", "var(--destructive)", 6, 1440, "Fora de orçamento", ["perdido"]),
    ],
    terminology: {
      entitySingular: "Aplicação / Publi",
      entityPlural: "Marcas & Mentorados",
      newLeadCta: "Nova Aplicação",
      searchPlaceholder: "Buscar marca ou mentorado...",
      contextFieldLabel: "Produto / Campanha",
      contextPlaceholder: "Ex: Mentoria VIP, Combo Reels + Stories",
      emptyColumnHint: "Arraste um contato ou clique em +",
      interestOptions: [
        { value: "brand_deal", label: "Publi / Parceria de Marca" },
        { value: "mentorship", label: "Mentoria High Ticket" },
        { value: "infoproduct", label: "Curso / Comunidade" },
      ],
      sourceOptions: [
        { value: "instagram", label: "DM Instagram" },
        ...COMMON_SOURCE_OPTIONS.filter((o) => o.value !== "instagram"),
      ],
      defaultChecklist: [
        "Qualificar orçamento e prazo de entrega",
        "Enviar mídia kit ou link da página de aplicação",
        "Confirmar contrato e link de checkout",
      ],
    },
  },

  generic: {
    nicheId: "generic",
    label: "Comercial & Vendas (Geral)",
    legacyPresetNiche: "geral",
    cardVariant: "commercial",
    stages: [
      buildStage("new", "Novos Leads", "inbox", "new", "var(--primary)", 0, 15, "Contatos recém-chegados aguardando abordagem", ["inbox", "novo"]),
      buildStage("contact", "Primeiro Contato", "in_progress", "contacted", "var(--warning)", 1, 60, "Abordagem inicial iniciada com o cliente", ["contacted", "briefing", "sondagem", "primeiro_contato"]),
      buildStage("qualified", "Qualificação", "in_progress", "qualified", "var(--accent-foreground)", 2, 180, "Necessidade, prazo e orçamento validados", ["qualificacao", "qualificado"]),
      buildStage("proposal", "Proposta Enviada", "review", "proposal", "var(--primary)", 3, 240, "Proposta ou orçamento apresentado", ["proposta", "proposta_enviada"]),
      buildStage("negotiation", "Em Negociação", "review", "negotiation", "var(--warning-strong)", 4, 360, "Alinhamento final de condições e pagamento", ["negociacao", "ajuste"]),
      buildStage("won", "Ganhos / Convertidos", "won", "won", "var(--success)", 5, 1440, "Venda fechada e convertida em cliente", ["converted", "ganho", "fechado"]),
      buildStage("lost", "Perdidos", "lost", "lost", "var(--destructive)", 6, 1440, "Negociação declinada ou sem retorno", ["perdido", "cancelled"]),
    ],
    terminology: {
      entitySingular: "Oportunidade",
      entityPlural: "Oportunidades & Leads",
      newLeadCta: "Novo Lead",
      searchPlaceholder: "Buscar lead, telefone ou assunto...",
      contextFieldLabel: "Assunto / Produto",
      contextPlaceholder: "Ex: Plano Anual, Consultoria, Produto X",
      emptyColumnHint: "Arraste um lead ou clique em +",
      interestOptions: [
        { value: "product", label: "Produto / Catálogo" },
        { value: "service", label: "Prestação de Serviço" },
        { value: "quote", label: "Orçamento Sob Medida" },
        { value: "corporate", label: "Atendimento B2B" },
      ],
      sourceOptions: COMMON_SOURCE_OPTIONS,
      defaultChecklist: [
        "Realizar contato inicial dentro de 15 minutos",
        "Mapear dor principal e orçamento disponível",
        "Enviar proposta formal com prazo de validade",
      ],
    },
  },
};

const EXTRA_NICHE_ALIASES: Record<string, KanbanNicheTaxonomyId> = {
  creator: "creator",
  criador: "creator",
  infoprodutor: "creator",
  turismo: "tourism",
  travel: "tourism",
  agencia: "tourism",
  imobiliaria: "real_estate",
  imoveis: "real_estate",
  rental: "real_estate",
  locacao: "real_estate",
  oficina: "automotive",
  mecanica: "automotive",
  veiculos: "automotive",
  repair: "automotive",
  assistencia: "automotive",
  gastronomia: "gastronomy",
  restaurante: "gastronomy",
  food: "gastronomy",
  supermercado: "market_perishables",
  mercado: "market_perishables",
  grocery: "market_perishables",
  farmacia: "pharmacy",
  servicos: "services",
  mobility: "services",
  mobilidade: "services",
  advocacia: "law_firm",
  juridico: "law_firm",
  legal: "law_firm",
  contabilidade: "accounting",
  educacao: "education",
  escola: "education",
  eventos: "events",
  salao: "beauty_salon",
  health_beauty: "beauty_salon",
  barbearia: "barbershop",
  estetica: "aesthetics_clinic",
  odonto: "dental",
  odontologia: "dental",
  psicologia: "psychology",
  petshop: "vet_petshop",
  veterinaria: "vet_petshop",
  pets: "vet_petshop",
  varejo: "retail",
  fashion: "retail",
  wholesale: "retail",
  classifieds: "retail",
  home_decor: "retail",
  jobs: "organizations",
  news: "organizations",
  geral: "generic",
  commercial_crm: "generic",
  comercial: "generic",
};

export function resolveKanbanNicheId(nicheOrStore?: StoreNicheHint): KanbanNicheTaxonomyId {
  const candidates: string[] = [];
  if (typeof nicheOrStore === "string") {
    candidates.push(nicheOrStore);
  } else if (nicheOrStore && typeof nicheOrStore === "object") {
    const settings = (nicheOrStore.settings as Record<string, any>) || {};
    if (settings.niche_id) candidates.push(String(settings.niche_id));
    if (settings.unified_niche_id) candidates.push(String(settings.unified_niche_id));
    if (settings.niche) candidates.push(String(settings.niche));
    if (nicheOrStore.niche) candidates.push(String(nicheOrStore.niche));
    if (nicheOrStore.store_type) candidates.push(String(nicheOrStore.store_type));
    if (nicheOrStore.category) candidates.push(String(nicheOrStore.category));
  }

  for (const raw of candidates) {
    const clean = raw.toLowerCase().trim();
    if (!clean) continue;
    if (EXTRA_NICHE_ALIASES[clean]) return EXTRA_NICHE_ALIASES[clean];
    const resolved = tryResolveUnifiedNicheId(clean);
    if (resolved) return resolved;
  }

  return "generic";
}

function enrichNichePreset(raw: RawNicheKanbanPreset): NicheKanbanPreset {
  const term = raw.terminology;
  const checklist: NicheKanbanChecklistItem[] = (term.defaultChecklist || []).map((item, idx) =>
    typeof item === "string"
      ? { id: `item-${idx + 1}`, text: item, done: false }
      : { id: item.id || `item-${idx + 1}`, text: item.text, done: Boolean(item.done) }
  );
  return {
    ...raw,
    terminology: {
      ...term,
      newLeadActionLabel: term.newLeadActionLabel || term.newLeadCta,
      interestFieldLabel: term.interestFieldLabel || term.contextFieldLabel,
      interestTypes: term.interestTypes || term.interestOptions,
      leadSources: term.leadSources || term.sourceOptions,
      defaultChecklist: checklist,
    },
  };
}

export function getNicheKanbanPreset(nicheOrStore?: StoreNicheHint): NicheKanbanPreset {
  const id = resolveKanbanNicheId(nicheOrStore);
  return enrichNichePreset(KANBAN_NICHE_TAXONOMIES[id] || KANBAN_NICHE_TAXONOMIES.generic);
}

export function getNicheKanbanStages(nicheOrStore?: StoreNicheHint): KanbanNicheStageSpec[] {
  return getNicheKanbanPreset(nicheOrStore).stages;
}

export function getNicheKanbanTerminology(nicheOrStore?: StoreNicheHint): NicheKanbanTerminology {
  return getNicheKanbanPreset(nicheOrStore).terminology;
}

export function listAllNicheKanbanPresets(): NicheKanbanPreset[] {
  return Object.values(KANBAN_NICHE_TAXONOMIES).map(enrichNichePreset);
}

export interface KanbanStageResolvable {
  stage_key?: string;
  id?: string;
  key?: string;
  title?: string;
  label?: string;
  purpose?: KanbanPurpose | string;
  canonicalBucket?: CanonicalLeadStatus;
  synonyms?: string[];
}

function getStageKeyFromInput(stage: KanbanStageResolvable): string {
  return normalizeKanbanStageSlug(stage.stage_key || stage.id || stage.key || "new");
}

function inferPurposeAndBucketFromKey(
  slug: string,
  explicitPurpose?: string
): { purpose: KanbanPurpose; canonicalBucket: CanonicalLeadStatus; isKnownSlug: boolean } {
  if (explicitPurpose === "inbox") return { purpose: "inbox", canonicalBucket: "new", isKnownSlug: true };
  if (explicitPurpose === "won") return { purpose: "won", canonicalBucket: "won", isKnownSlug: true };
  if (explicitPurpose === "lost") return { purpose: "lost", canonicalBucket: "lost", isKnownSlug: true };
  if (explicitPurpose === "archived") return { purpose: "archived", canonicalBucket: "lost", isKnownSlug: true };
  if (explicitPurpose === "review") return { purpose: "review", canonicalBucket: "proposal", isKnownSlug: true };
  if (explicitPurpose === "in_progress") {
    if (slug === "contact" || slug === "contacted" || slug === "briefing") {
      return { purpose: "in_progress", canonicalBucket: "contacted", isKnownSlug: true };
    }
    return { purpose: "in_progress", canonicalBucket: "qualified", isKnownSlug: true };
  }

  if (["new", "inbox", "todo", "lead", "pending", "talent_pool", "draft"].includes(slug)) {
    return { purpose: "inbox", canonicalBucket: "new", isKnownSlug: true };
  }
  if (["contact", "contacted", "briefing", "sondagem", "diagnostico", "triagem"].includes(slug)) {
    return { purpose: "in_progress", canonicalBucket: "contacted", isKnownSlug: true };
  }
  if (["qualified", "cotacao", "visit_scheduled", "avaliacao", "in_service", "screening"].includes(slug)) {
    return { purpose: "in_progress", canonicalBucket: "qualified", isKnownSlug: true };
  }
  if (["proposal", "proposta", "proposta_enviada", "orcamento", "sent"].includes(slug)) {
    return { purpose: "review", canonicalBucket: "proposal", isKnownSlug: true };
  }
  if (["negotiation", "negociacao", "negotiating", "fechamento", "contrato"].includes(slug)) {
    return { purpose: "review", canonicalBucket: "negotiation", isKnownSlug: true };
  }
  if (["won", "ganho", "fechado", "hired", "completed", "confirmed", "delivered", "approved"].includes(slug)) {
    return { purpose: "won", canonicalBucket: "won", isKnownSlug: true };
  }
  if (slug === "converted") {
    return { purpose: "won", canonicalBucket: "converted", isKnownSlug: true };
  }
  if (["lost", "perdido", "cancelled", "rejected", "desistencia"].includes(slug)) {
    return { purpose: "lost", canonicalBucket: "lost", isKnownSlug: true };
  }
  if (["archived", "future_pool"].includes(slug)) {
    return { purpose: "archived", canonicalBucket: "lost", isKnownSlug: true };
  }
  return { purpose: "in_progress", canonicalBucket: "qualified", isKnownSlug: false };
}

export function resolveKanbanStageSynonym(
  rawStage: string | null | undefined,
  activeStages?: KanbanStageResolvable[],
  nicheOrStore?: StoreNicheHint
): {
  matchedStageKey: string;
  canonicalBucket: CanonicalLeadStatus;
  purpose: KanbanPurpose;
  isTerminal: boolean;
  title: string;
} {
  const normalizedRaw = normalizeKanbanStageSlug(rawStage);
  const nicheStages = getNicheKanbanStages(nicheOrStore);
  const candidates = activeStages && activeStages.length > 0 ? activeStages : nicheStages;

  // 1. Exact stage_key match inside activeStages
  const exactActive = candidates.find((s) => getStageKeyFromInput(s) === normalizedRaw);
  if (exactActive) {
    const key = getStageKeyFromInput(exactActive);
    const nicheDef = nicheStages.find((n) => n.stage_key === key);
    const inferred = inferPurposeAndBucketFromKey(key, exactActive.purpose || nicheDef?.purpose);
    const canonicalBucket = exactActive.canonicalBucket || nicheDef?.canonicalBucket || inferred.canonicalBucket;
    return {
      matchedStageKey: key,
      canonicalBucket,
      purpose: (exactActive.purpose as KanbanPurpose) || nicheDef?.purpose || inferred.purpose,
      isTerminal: inferred.purpose === "won" || inferred.purpose === "lost" || inferred.purpose === "archived",
      title: exactActive.title || exactActive.label || nicheDef?.title || key,
    };
  }

  // 2. Explicit synonyms or title match inside activeStages OR matching niche stage synonyms whose target key exists in activeStages
  for (const s of candidates) {
    const key = getStageKeyFromInput(s);
    const nicheDef = nicheStages.find((n) => n.stage_key === key);
    const titleRaw = s.title || s.label || nicheDef?.title || "";
    const allSyns = new Set<string>([
      key,
      ...(titleRaw ? [normalizeKanbanStageSlug(titleRaw)] : []),
      ...(s.synonyms || []).map((x) => normalizeKanbanStageSlug(x)),
      ...(nicheDef?.synonyms || []),
    ]);
    // Global cross-niche synonyms for common buckets
    if (key === "contact") {
      ["contacted", "briefing", "sondagem", "primeiro_contato"].forEach((x) => allSyns.add(x));
    } else if (key === "contacted") {
      ["contact", "briefing", "sondagem", "primeiro_contato"].forEach((x) => allSyns.add(x));
    } else if (key === "won") {
      ["converted", "ganho", "viagem_confirmada", "fechado"].forEach((x) => allSyns.add(x));
    } else if (key === "lost") {
      ["perdido", "desistencia", "cancelled"].forEach((x) => allSyns.add(x));
    }

    if (allSyns.has(normalizedRaw)) {
      const inferred = inferPurposeAndBucketFromKey(key, s.purpose || nicheDef?.purpose);
      const canonicalBucket = s.canonicalBucket || nicheDef?.canonicalBucket || inferred.canonicalBucket;
      return {
        matchedStageKey: key,
        canonicalBucket,
        purpose: (s.purpose as KanbanPurpose) || nicheDef?.purpose || inferred.purpose,
        isTerminal: inferred.purpose === "won" || inferred.purpose === "lost" || inferred.purpose === "archived",
        title: s.title || s.label || nicheDef?.title || key,
      };
    }
  }

  // 3. Fallback by canonical bucket / purpose match against activeStages (e.g. legacy "contacted" -> active stage whose bucket is "contacted" or first in_progress)
  const rawInferred = inferPurposeAndBucketFromKey(normalizedRaw);
  if (rawInferred.isKnownSlug && !normalizedRaw.startsWith("col_")) {
    const bucketMatch = candidates.find((s) => {
      const key = getStageKeyFromInput(s);
      const nicheDef = nicheStages.find((n) => n.stage_key === key);
      const sBucket = s.canonicalBucket || nicheDef?.canonicalBucket || inferPurposeAndBucketFromKey(key, s.purpose).canonicalBucket;
      return sBucket === rawInferred.canonicalBucket;
    });
    if (bucketMatch) {
      const key = getStageKeyFromInput(bucketMatch);
      const nicheDef = nicheStages.find((n) => n.stage_key === key);
      return {
        matchedStageKey: key,
        canonicalBucket: rawInferred.canonicalBucket,
        purpose: (bucketMatch.purpose as KanbanPurpose) || nicheDef?.purpose || rawInferred.purpose,
        isTerminal: rawInferred.purpose === "won" || rawInferred.purpose === "lost" || rawInferred.purpose === "archived",
        title: bucketMatch.title || bucketMatch.label || nicheDef?.title || key,
      };
    }
  }

  // 4. Preserve custom slug cleanly even if not yet listed in niche presets
  return {
    matchedStageKey: normalizedRaw,
    canonicalBucket: rawInferred.canonicalBucket,
    purpose: rawInferred.purpose,
    isTerminal: rawInferred.purpose === "won" || rawInferred.purpose === "lost" || rawInferred.purpose === "archived",
    title: rawStage?.trim() || normalizedRaw,
  };
}

export function doesLeadBelongToStage(
  lead: {
    status?: string | null;
    pipeline_stage?: string | null;
    custom_fields?: Record<string, any> | null;
  },
  targetStageKey: string,
  allStages?: KanbanStageResolvable[],
  nicheOrStore?: StoreNicheHint
): boolean {
  const normalizedTarget = normalizeKanbanStageSlug(targetStageKey);
  const stagesList = allStages && allStages.length > 0 ? allStages : getNicheKanbanStages(nicheOrStore);
  const cfStage = lead.custom_fields?.kanban_stage_key
    ? normalizeKanbanStageSlug(String(lead.custom_fields.kanban_stage_key))
    : null;
  const effectiveRaw = cfStage || lead.pipeline_stage || lead.status || "new";

  const resolved = resolveKanbanStageSynonym(effectiveRaw, stagesList, nicheOrStore);
  if (resolved.matchedStageKey === normalizedTarget) {
    return true;
  }

  // Ensure orphaned unknown statuses land safely in the first inbox stage rather than disappearing
  const anyExactMatch = stagesList.some((s) => getStageKeyFromInput(s) === resolved.matchedStageKey);
  if (!anyExactMatch && stagesList.length > 0) {
    const firstInbox =
      stagesList.find((s) => s.purpose === "inbox") || stagesList[0];
    return getStageKeyFromInput(firstInbox) === normalizedTarget;
  }

  return false;
}

export function formatKanbanActionError(error: unknown, fallback = "Não foi possível atualizar o card no funil."): string {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as any).message)
      : typeof error === "string"
      ? error
      : "";

  const trimmed = rawMessage.trim();
  if (!trimmed) return fallback;

  // Detecta array JSON despejado por Zod (ex: [{ "code": "invalid_enum_value", ... }])
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const firstIssue = Array.isArray(parsed) ? parsed[0] : parsed;
      if (firstIssue && typeof firstIssue === "object") {
        if (firstIssue.code === "invalid_enum_value" || firstIssue.code === "invalid_value") {
          return "Esta etapa do funil exige sincronização de fluxo. Tente novamente após atualizar o quadro.";
        }
        if (typeof firstIssue.message === "string" && firstIssue.message.trim()) {
          return firstIssue.message.trim();
        }
      }
    } catch {
      // Segue para sanitização abaixo
    }
  }

  if (/leads_crm_status_check|23514/i.test(trimmed)) {
    return "Estágio ainda não reconhecido pelo banco de dados. Aplique as atualizações recentes do workspace.";
  }
  if (/row-level security|permission denied|não autorizado|nao autorizado/i.test(trimmed)) {
    return "Você não possui permissão para mover este atendimento nesta loja.";
  }
  if (/network|fetch|timeout|econnrefused/i.test(trimmed)) {
    return "Conexão instável ao mover o card. Verifique sua internet e tente novamente.";
  }

  // Evita exibir payloads técnicos muito longos com chaves/chaves JSON no toast
  if (trimmed.length > 180 && (trimmed.includes('":') || trimmed.includes("ZodError"))) {
    return fallback;
  }

  return trimmed;
}
