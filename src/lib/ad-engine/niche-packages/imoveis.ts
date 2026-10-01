/**
 * imoveis.ts — Pacote Canônico de Nicho: Imóveis, Locação & Venda de Alto Valor (G11–G17, G64)
 * 
 * Regras: A10 (Locação Temporada), A11 (Locação Anual / Contrato), A12 (Venda com Escritura e Diligência).
 */

import { NichePackage } from './types';

export const IMOVEIS_NICHE_PACKAGE: NichePackage = {
  id: 'imoveis',
  name: 'Imóveis & Real Estate',
  description: 'Locação residencial e comercial de longo prazo, aluguel de temporada e venda de imóveis com diligência documental e CRECI.',
  version: '1.0.0',
  defaultArchetype: 'A12', // Venda de Alto Valor com Documentação
  allowedArchetypes: {
    A01: 'prohibited',
    A02: 'prohibited',
    A03: 'prohibited',
    A04: 'prohibited',
    A05: 'prohibited',
    A06: 'prohibited',
    A07: 'prohibited',
    A08: 'prohibited',
    A09: 'optional',   // Avaliação imobiliária / Laudo pericial
    A10: 'enabled',    // Locação por temporada (Diárias / Caução)
    A11: 'enabled',    // Locação de Longa Duração (Lei do Inquilinato 8.245/91)
    A12: 'enabled',    // Venda de Alto Valor (Matrícula, Sinal, Escritura) - Canônico
    A13: 'prohibited',
    A14: 'prohibited',
    A15: 'prohibited',
  },
  defaultSellingUnit: 'imovel',
  allowedSellingUnits: ['imovel', 'mes', 'diaria', 'm2'],
  terminology: {
    entitySingular: 'Imóvel',
    entityPlural: 'Imóveis & Empreendimentos',
    primaryActionLabel: 'Enviar Proposta',
    secondaryActionLabel: 'Agendar Visita',
    pricingLabel: 'Valor de Venda / Locação',
    unitLabel: 'Unidade Imobiliária',
    documentLabel: 'Contrato / Matrícula do Imóvel',
    operatorRoleLabel: 'Corretor / Imobiliária',
    customerRoleLabel: 'Comprador / Locatário',
  },
  attributes: [
    {
      key: 'property_type',
      label: 'Tipo de Imóvel',
      type: 'select',
      options: [
        { value: 'apartamento', label: 'Apartamento' },
        { value: 'casa', label: 'Casa Residencial' },
        { value: 'cobertura', label: 'Cobertura' },
        { value: 'terreno', label: 'Terreno / Lote' },
        { value: 'comercial', label: 'Sala / Prédio Comercial' },
        { value: 'rural', label: 'Chácara / Fazenda' },
      ],
      isFilterable: true,
      isSearchable: true,
      isRequired: true,
      appliesToArchetypes: ['A10', 'A11', 'A12'],
    },
    {
      key: 'usable_area_m2',
      label: 'Área Privativa Útil (m²)',
      type: 'number',
      unit: 'm²',
      isFilterable: true,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A10', 'A11', 'A12'],
    },
    {
      key: 'bedrooms_count',
      label: 'Dormitórios',
      type: 'number',
      isFilterable: true,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A10', 'A11', 'A12'],
    },
    {
      key: 'parking_spaces',
      label: 'Vagas de Garagem',
      type: 'number',
      isFilterable: true,
      isSearchable: false,
      isRequired: false,
      appliesToArchetypes: ['A10', 'A11', 'A12'],
    },
    {
      key: 'condo_fee_cents',
      label: 'Taxa de Condomínio Mensal',
      type: 'currency',
      isFilterable: true,
      isSearchable: false,
      isRequired: false,
      appliesToArchetypes: ['A10', 'A11', 'A12'],
    },
    {
      key: 'property_registry_number',
      label: 'Número da Matrícula / Cartório',
      type: 'string',
      isFilterable: false,
      isSearchable: false,
      isRequired: false,
      isInternalOnly: true, // Blindado contra vazamento (G24)
      appliesToArchetypes: ['A12'],
    },
    {
      key: 'broker_commission_percent',
      label: 'Comissão Imobiliária Pactuada (%)',
      type: 'number',
      isFilterable: false,
      isSearchable: false,
      isRequired: false,
      isInternalOnly: true, // Blindado contra vazamento (G24)
      appliesToArchetypes: ['A11', 'A12'],
    },
  ],
  detailSections: [
    { id: 'gallery_virtual_tour', label: 'Galeria & Tour Virtual', order: 1, isRequired: true },
    { id: 'financial_conditions', label: 'Valores, Condomínio & IPTU', order: 2, isRequired: true },
    { id: 'amenities_and_features', label: 'Características e Infraestrutura', order: 3, isRequired: true },
    { id: 'location_map', label: 'Localização e Proximidades', order: 4, isRequired: true },
    { id: 'proposal_dispatch', label: 'Formulário de Proposta Formal', order: 5, isRequired: true },
    { id: 'internal_diligence_records', label: 'Dossiê do Proprietário e Matrícula', order: 6, isRequired: false, isInternalOnly: true },
  ],
  fiscalAndRegulatory: {
    taxRegimeRecommendation: 'presumido',
    requiresNcm: false,
    requiresCnae: true,
    primaryCnaeCode: '6821-8/01', // Corretagem na compra e venda e avaliação de imóveis
    regulatoryBody: 'CRECI / Cofeci',
    mandatoryLegalDisclaimers: [
      'Intermediação imobiliária realizada por profissionais devidamente inscritos no CRECI.',
      'Valores e encargos podem sofrer reajuste conforme índice previsto no contrato (IPCA/IGP-M).',
      'A venda está condicionada à aprovação de crédito e certidões negativas vintenárias.',
    ],
    minimumAge: 18,
    requiresKycOrNda: true,
  },
  documents: [
    {
      type: 'contract',
      title: 'Contrato de Locação Residencial / Comercial',
      templateCode: 'REAL_ESTATE_LEASE_AGREEMENT',
      requiresSignature: true,
      validityDaysDefault: 365,
    },
    {
      type: 'contract',
      title: 'Promessa de Compra e Venda de Imóvel',
      templateCode: 'REAL_ESTATE_PURCHASE_COMMITMENT',
      requiresSignature: true,
    },
    {
      type: 'quote',
      title: 'Proposta Formal de Compra e Sinal',
      templateCode: 'REAL_ESTATE_OFFICIAL_PROPOSAL',
      requiresSignature: true,
      validityDaysDefault: 7,
    },
  ],
  slas: {
    confirmationTimeoutHours: 24,
    responseTimeoutMinutes: 60,
    cancellationNoticeHours: 720, // 30 dias de aviso prévio
  },
  statusGlossary: {
    available: 'Disponível para Visitas',
    visit_scheduled: 'Visita Agendada',
    proposal_under_review: 'Proposta em Análise',
    due_diligence: 'Diligência Documental em Andamento',
    contract_signed: 'Contrato Assinado / Chaves Entregues',
    sold: 'Vendido',
    rented: 'Alugado',
  },
  statusTransitions: [
    { fromStatus: 'available', toStatus: 'proposal_under_review', allowedRoles: ['broker', 'buyer'], actionName: 'Apresentar Proposta' },
    { fromStatus: 'proposal_under_review', toStatus: 'due_diligence', allowedRoles: ['owner', 'broker'], actionName: 'Aceitar Proposta e Checar Docs' },
    { fromStatus: 'due_diligence', toStatus: 'contract_signed', allowedRoles: ['broker', 'owner'], actionName: 'Assinar Escritura / Contrato' },
  ],
  uiSemantics: {
    heroPlaceholder: 'Ex: Apartamento 3 Suítes 128m² Frente Mar com Varanda Gourmet...',
    searchPlaceholder: 'Bairro, cidade ou código do imóvel...',
    emptyCatalogMessage: 'Nenhum imóvel disponível para o filtro selecionado.',
    orderSuccessMessage: 'Sua proposta formal foi enviada com sucesso! O corretor responsável entrará em contato.',
    leadCapturePrompt: 'Deseja agendar uma visita presencial ou receber o vídeo tour pelo WhatsApp?',
  },
};
