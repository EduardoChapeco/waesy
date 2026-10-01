/**
 * turismo.ts — Pacote Canônico de Nicho: Turismo, Viagens & Hospedagem (G11–G17)
 * 
 * Regra: Cada nicho é um pacote de dados, nunca um fork de código.
 */

import { NichePackage } from './types';

export const TURISMO_NICHE_PACKAGE: NichePackage = {
  id: 'turismo',
  name: 'Turismo & Viagens',
  description: 'Pacotes turísticos, hospedagem por temporada, passeios guiados, traslados e experiências.',
  version: '1.0.0',
  defaultArchetype: 'A07', // Pacote / Bundle de Serviços
  allowedArchetypes: {
    A01: 'prohibited', // Não vende produto físico simples
    A02: 'prohibited',
    A03: 'prohibited',
    A04: 'optional',   // Passeios com opcionais (ex: almoço incluso)
    A05: 'prohibited',
    A06: 'optional',   // Clube de viagens / milhas
    A07: 'enabled',    // Pacote / Bundle de Serviços (Canônico)
    A08: 'enabled',    // Passeio com agendamento / Guia
    A09: 'optional',   // Viagem corporativa sob medida
    A10: 'enabled',    // Locação por temporada (Chalé, Apartamento)
    A11: 'prohibited',
    A12: 'prohibited',
    A13: 'enabled',    // Ingresso para parque / show / atração
    A14: 'prohibited',
    A15: 'optional',   // Emissão de visto / taxa consular
  },
  defaultSellingUnit: 'pessoa',
  allowedSellingUnits: ['pessoa', 'casal', 'grupo', 'diaria', 'quarto'],
  terminology: {
    entitySingular: 'Experiência / Pacote',
    entityPlural: 'Pacotes & Viagens',
    primaryActionLabel: 'Reservar Agora',
    secondaryActionLabel: 'Solicitar Cotação',
    pricingLabel: 'Preço por pessoa',
    unitLabel: 'Viajante',
    documentLabel: 'Voucher de Embarque',
    operatorRoleLabel: 'Agência / Operador',
    customerRoleLabel: 'Viajante',
  },
  attributes: [
    {
      key: 'destination_name',
      label: 'Destino Principal',
      type: 'string',
      isFilterable: true,
      isSearchable: true,
      isRequired: true,
      appliesToArchetypes: ['A07', 'A08', 'A10', 'A13'],
    },
    {
      key: 'transport_type',
      label: 'Modal de Transporte',
      type: 'select',
      options: [
        { value: 'aereo', label: 'Aéreo Regular' },
        { value: 'rodoviario_leito', label: 'Rodoviário Leito' },
        { value: 'rodoviario_semileito', label: 'Rodoviário Semi-Leito' },
        { value: 'maritimo', label: 'Marítimo / Cruzeiro' },
        { value: 'proprio', label: 'Transporte Próprio' },
      ],
      isFilterable: true,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A07'],
    },
    {
      key: 'itinerary_days',
      label: 'Duração (Dias)',
      type: 'number',
      unit: 'dias',
      isFilterable: true,
      isSearchable: false,
      isRequired: false,
      appliesToArchetypes: ['A07', 'A08'],
    },
    {
      key: 'hotel_rating',
      label: 'Categoria da Hospedagem',
      type: 'select',
      options: [
        { value: 'pousada', label: 'Pousada Charmosa' },
        { value: 'hotel_3_estrelas', label: 'Hotel 3 Estrelas' },
        { value: 'hotel_4_estrelas', label: 'Hotel 4 Estrelas' },
        { value: 'resort_all_inclusive', label: 'Resort All Inclusive' },
      ],
      isFilterable: true,
      isSearchable: false,
      isRequired: false,
      appliesToArchetypes: ['A07', 'A10'],
    },
    {
      key: 'operator_cost_cents',
      label: 'Custo Líquido da Operadora',
      type: 'currency',
      isFilterable: false,
      isSearchable: false,
      isRequired: false,
      isInternalOnly: true, // Campo interno blindado contra vazamento (G24)
      appliesToArchetypes: ['A07', 'A08', 'A10'],
    },
  ],
  detailSections: [
    { id: 'hero_immersive', label: 'Visão Geral & Destino', order: 1, isRequired: true },
    { id: 'commercial_conditions', label: 'Tarifário & Parcelamento', order: 2, isRequired: true },
    { id: 'departures_schedule', label: 'Datas de Embarque & Saídas', order: 3, isRequired: true },
    { id: 'inclusions_scope', label: 'O que está Incluso & Excluso', order: 4, isRequired: true },
    { id: 'itinerary_timeline', label: 'Roteiro Programado', order: 5, isRequired: false },
    { id: 'policies_and_cancellation', label: 'Condições de Cancelamento Embratur', order: 6, isRequired: true },
    { id: 'internal_operator_notes', label: 'Acordo com Fornecedor e Margem', order: 7, isRequired: false, isInternalOnly: true },
  ],
  fiscalAndRegulatory: {
    taxRegimeRecommendation: 'simples',
    requiresNcm: false,
    requiresCnae: true,
    primaryCnaeCode: '7911-2/00', // Agências de viagens
    regulatoryBody: 'Cadastur / Ministério do Turismo',
    mandatoryLegalDisclaimers: [
      'Operação em conformidade com a Lei Geral do Turismo (Lei nº 11.771/2008).',
      'Valores e disponibilidades sujeitos a alteração sem prévio aviso até a emissão do voucher.',
      'Cancelamento conforme Resolução Normativa nº 161 da Embratur.',
    ],
    minimumAge: 0,
    requiresKycOrNda: false,
  },
  documents: [
    {
      type: 'voucher',
      title: 'Voucher Oficial de Embarque e Hospedagem',
      templateCode: 'TOURISM_VOUCHER_CANONICAL',
      requiresSignature: false,
      validityDaysDefault: 90,
    },
    {
      type: 'contract',
      title: 'Contrato de Intermediação de Serviços Turísticos',
      templateCode: 'TOURISM_CONTRACT_EMBRATUR',
      requiresSignature: true,
    },
  ],
  slas: {
    confirmationTimeoutHours: 24,
    responseTimeoutMinutes: 60,
    cancellationNoticeHours: 168, // 7 dias
  },
  statusGlossary: {
    draft: 'Rascunho de Pacote',
    pending_quote: 'Cotação em Análise',
    reserved: 'Reserva Pré-Bloqueada',
    confirmed: 'Reserva Confirmada',
    voucher_issued: 'Voucher Emitido',
    boarding_ready: 'Pronto para Embarque',
    completed: 'Viagem Concluída',
    cancelled: 'Viagem Cancelada',
  },
  statusTransitions: [
    { fromStatus: 'draft', toStatus: 'confirmed', allowedRoles: ['owner', 'operator'], actionName: 'Publicar e Abrir Vendas' },
    { fromStatus: 'reserved', toStatus: 'voucher_issued', allowedRoles: ['owner', 'operator'], actionName: 'Emitir Voucher' },
    { fromStatus: 'voucher_issued', toStatus: 'boarding_ready', allowedRoles: ['operator', 'guide'], actionName: 'Validar Documentos' },
    { fromStatus: 'boarding_ready', toStatus: 'completed', allowedRoles: ['operator', 'guide'], actionName: 'Confirmar Realização' },
  ],
  uiSemantics: {
    heroPlaceholder: 'Ex: Pacote Serra Gaúcha 5 Dias com Aéreo e Hotel...',
    searchPlaceholder: 'Para onde você quer viajar?',
    emptyCatalogMessage: 'Nenhum pacote ou destino disponível no momento.',
    orderSuccessMessage: 'Sua reserva foi confirmada! O voucher foi emitido com sucesso.',
    leadCapturePrompt: 'Deseja um roteiro personalizado com nossa equipe de especialistas?',
  },
};
