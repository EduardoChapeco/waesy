/**
 * servicos.ts — Pacote Canônico de Nicho: Serviços Locais, Estética, Saúde & Especialistas (G11–G17, G63)
 * 
 * Regras: A08 (Agendamento com profissional/agenda), A09 (Orçamento com formulário), A07 (Pacote de sessões), A15 (Serviço avulso com OS).
 */

import { NichePackage } from './types';

export const SERVICOS_NICHE_PACKAGE: NichePackage = {
  id: 'servicos',
  name: 'Serviços & Profissionais',
  description: 'Atendimentos por hora, procedimentos com agendamento, pacotes de sessões e projetos sob orçamento com ordem de serviço.',
  version: '1.0.0',
  defaultArchetype: 'A08', // Serviço com Agendamento
  allowedArchetypes: {
    A01: 'prohibited',
    A02: 'prohibited',
    A03: 'prohibited',
    A04: 'optional',   // Procedimentos com opcionais adicionais
    A05: 'prohibited',
    A06: 'optional',   // Mensalidade / Plano de manutenção
    A07: 'enabled',    // Pacote / Bundle de sessões (ex: 10 sessões de drenagem)
    A08: 'enabled',    // Serviço com Agendamento de horário (Canônico)
    A09: 'enabled',    // Serviço por Orçamento / Vistoria prévia
    A10: 'prohibited',
    A11: 'prohibited',
    A12: 'prohibited',
    A13: 'prohibited',
    A14: 'prohibited',
    A15: 'enabled',    // Ordem de serviço avulsa / Consultoria técnica
  },
  defaultSellingUnit: 'sessao',
  allowedSellingUnits: ['sessao', 'hora', 'procedimento', 'visita', 'projeto'],
  terminology: {
    entitySingular: 'Serviço',
    entityPlural: 'Serviços & Atendimentos',
    primaryActionLabel: 'Agendar Horário',
    secondaryActionLabel: 'Solicitar Orçamento',
    pricingLabel: 'Valor do atendimento',
    unitLabel: 'Sessão / Procedimento',
    documentLabel: 'Ordem de Serviço (OS)',
    operatorRoleLabel: 'Especialista / Profissional',
    customerRoleLabel: 'Paciente / Cliente',
  },
  attributes: [
    {
      key: 'duration_minutes',
      label: 'Duração Estimada (Minutos)',
      type: 'number',
      unit: 'min',
      isFilterable: true,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A07', 'A08'],
    },
    {
      key: 'service_location_type',
      label: 'Local de Realização',
      type: 'select',
      options: [
        { value: 'establishment', label: 'No estabelecimento / consultório' },
        { value: 'domicile', label: 'Em domicílio / Atendimento móvel' },
        { value: 'remote_video', label: 'Teleatendimento / Online' },
      ],
      isFilterable: true,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A08', 'A09', 'A15'],
    },
    {
      key: 'requires_anamnesis',
      label: 'Exige Ficha de Anamnese / Consentimento',
      type: 'boolean',
      isFilterable: false,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A07', 'A08'],
    },
    {
      key: 'professional_commission_cents',
      label: 'Comissão Líquida do Profissional',
      type: 'currency',
      isFilterable: false,
      isSearchable: false,
      isRequired: false,
      isInternalOnly: true, // Blindado contra vazamento (G24)
      appliesToArchetypes: ['A07', 'A08', 'A09'],
    },
  ],
  detailSections: [
    { id: 'service_overview', label: 'Apresentação do Procedimento', order: 1, isRequired: true },
    { id: 'professional_profile', label: 'Especialista Responsável', order: 2, isRequired: true },
    { id: 'schedule_slot_picker', label: 'Escolha de Data e Horário', order: 3, isRequired: true },
    { id: 'preparation_guidelines', label: 'Recomendações e Preparo', order: 4, isRequired: false },
    { id: 'cancellation_policy', label: 'Política de Reagendamento e No-Show', order: 5, isRequired: true },
    { id: 'internal_commission_notes', label: 'Repasse e Custo Operacional', order: 6, isRequired: false, isInternalOnly: true },
  ],
  fiscalAndRegulatory: {
    taxRegimeRecommendation: 'simples',
    requiresNcm: false,
    requiresCnae: true,
    primaryCnaeCode: '9602-5/02', // Atividades de estética e outros serviços de cuidados de beleza
    regulatoryBody: 'Conselho de Classe Profissional / Vigilância Sanitária',
    mandatoryLegalDisclaimers: [
      'Cancelamentos ou reagendamentos devem ser solicitados com no mínimo 24 horas de antecedência.',
      'A realização do procedimento está sujeita à avaliação prévia e preenchimento da anamnese.',
    ],
    minimumAge: 16,
    requiresKycOrNda: false,
  },
  documents: [
    {
      type: 'service_order',
      title: 'Ordem de Serviço Canônica e Comprovante de Atendimento',
      templateCode: 'SERVICE_ORDER_CANONICAL',
      requiresSignature: true,
      validityDaysDefault: 30,
    },
    {
      type: 'term',
      title: 'Termo de Consentimento Livre e Esclarecido',
      templateCode: 'INFORMED_CONSENT_TERM',
      requiresSignature: true,
    },
  ],
  slas: {
    confirmationTimeoutHours: 2,
    responseTimeoutMinutes: 20,
    cancellationNoticeHours: 24,
  },
  statusGlossary: {
    scheduled: 'Agendado',
    confirmed: 'Confirmado pelo Cliente',
    in_service: 'Em Atendimento',
    completed: 'Atendimento Concluído',
    no_show: 'Não Compareceu (No-Show)',
    cancelled: 'Cancelado',
  },
  statusTransitions: [
    { fromStatus: 'scheduled', toStatus: 'confirmed', allowedRoles: ['customer', 'operator'], actionName: 'Confirmar Presença' },
    { fromStatus: 'confirmed', toStatus: 'in_service', allowedRoles: ['operator', 'specialist'], actionName: 'Iniciar Procedimento' },
    { fromStatus: 'in_service', toStatus: 'completed', allowedRoles: ['operator', 'specialist'], actionName: 'Finalizar e Emitir OS' },
    { fromStatus: 'confirmed', toStatus: 'no_show', allowedRoles: ['operator', 'specialist'], actionName: 'Registrar Falta' },
  ],
  uiSemantics: {
    heroPlaceholder: 'Ex: Consulta Médica Especializada ou Sessão de Fisioterapia...',
    searchPlaceholder: 'Qual serviço ou especialista você procura?',
    emptyCatalogMessage: 'Nenhum serviço disponível para agendamento no momento.',
    orderSuccessMessage: 'Seu agendamento foi confirmado! Enviamos as instruções de preparo.',
    leadCapturePrompt: 'Deseja tirar dúvidas diretamente com o profissional antes de agendar?',
  },
};
