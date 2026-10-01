/**
 * veiculos.ts — Pacote Canônico de Nicho: Automóveis, Motos, Frotas & Locação (G11–G17, G64)
 * 
 * Regras: A10 (Locação de Veículo com Caução e Vistoria), A12 (Venda de Veículo com Laudo Cautelar e Financiamento).
 */

import { NichePackage } from './types';

export const VEICULOS_NICHE_PACKAGE: NichePackage = {
  id: 'veiculos',
  name: 'Veículos & Automotivo',
  description: 'Locação diária e mensal de veículos, frotas corporativas e venda de seminovos com laudo cautelar e garantia mecânica.',
  version: '1.0.0',
  defaultArchetype: 'A12', // Venda de Alto Valor com Documentação
  allowedArchetypes: {
    A01: 'prohibited',
    A02: 'prohibited',
    A03: 'prohibited',
    A04: 'optional',   // Acessórios inclusos (ex: cadeirinha de bebê, GPS)
    A05: 'prohibited',
    A06: 'optional',   // Carro por assinatura mensal
    A07: 'prohibited',
    A08: 'prohibited',
    A09: 'optional',   // Cotação de frotas personalizadas
    A10: 'enabled',    // Locação de Veículos (Diárias, Caução, Franquia)
    A11: 'optional',   // Locação de longo prazo / terceirização de frotas
    A12: 'enabled',    // Venda de Alto Valor (Seminovos, Laudo Cautelar) - Canônico
    A13: 'prohibited',
    A14: 'prohibited',
    A15: 'prohibited',
  },
  defaultSellingUnit: 'veiculo',
  allowedSellingUnits: ['veiculo', 'diaria', 'mes', 'km'],
  terminology: {
    entitySingular: 'Veículo',
    entityPlural: 'Veículos & Automóveis',
    primaryActionLabel: 'Simular Financiamento',
    secondaryActionLabel: 'Agendar Test-Drive',
    pricingLabel: 'Preço à vista / Diária',
    unitLabel: 'Unidade Veicular',
    documentLabel: 'CRLV / Contrato de Locação',
    operatorRoleLabel: 'Concessionária / Locadora',
    customerRoleLabel: 'Condutor / Comprador',
  },
  attributes: [
    {
      key: 'vehicle_make',
      label: 'Marca / Fabricante',
      type: 'string',
      isFilterable: true,
      isSearchable: true,
      isRequired: true,
      appliesToArchetypes: ['A10', 'A12'],
    },
    {
      key: 'vehicle_model',
      label: 'Modelo e Versão',
      type: 'string',
      isFilterable: true,
      isSearchable: true,
      isRequired: true,
      appliesToArchetypes: ['A10', 'A12'],
    },
    {
      key: 'manufacturing_year',
      label: 'Ano de Fabricação / Modelo',
      type: 'number',
      isFilterable: true,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A10', 'A12'],
    },
    {
      key: 'odometer_km',
      label: 'Quilometragem Rodada (km)',
      type: 'number',
      unit: 'km',
      isFilterable: true,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A12'],
    },
    {
      key: 'transmission_type',
      label: 'Câmbio',
      type: 'select',
      options: [
        { value: 'manual', label: 'Manual' },
        { value: 'automatico', label: 'Automático' },
        { value: 'cvt', label: 'Automático CVT' },
      ],
      isFilterable: true,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A10', 'A12'],
    },
    {
      key: 'renavam_internal_code',
      label: 'Código Renavam e Chassi',
      type: 'string',
      isFilterable: false,
      isSearchable: false,
      isRequired: false,
      isInternalOnly: true, // Blindado contra vazamento (G24)
      appliesToArchetypes: ['A12'],
    },
    {
      key: 'acquisition_trade_in_cost_cents',
      label: 'Custo de Entrada / Troca',
      type: 'currency',
      isFilterable: false,
      isSearchable: false,
      isRequired: false,
      isInternalOnly: true, // Blindado contra vazamento (G24)
      appliesToArchetypes: ['A12'],
    },
  ],
  detailSections: [
    { id: 'vehicle_gallery', label: 'Fotos do Veículo & 360°', order: 1, isRequired: true },
    { id: 'pricing_and_financing', label: 'Preço & Parcelas Estimadas', order: 2, isRequired: true },
    { id: 'technical_specs', label: 'Ficha Técnica & Opcionais', order: 3, isRequired: true },
    { id: 'inspection_report', label: 'Laudo Cautelar & Procedência', order: 4, isRequired: true },
    { id: 'test_drive_booking', label: 'Agendamento de Test-Drive', order: 5, isRequired: true },
    { id: 'internal_trade_in_notes', label: 'Avaliação de Usado na Troca', order: 6, isRequired: false, isInternalOnly: true },
  ],
  fiscalAndRegulatory: {
    taxRegimeRecommendation: 'presumido',
    requiresNcm: false,
    requiresCnae: true,
    primaryCnaeCode: '4511-1/02', // Comércio a varejo de automóveis usados
    regulatoryBody: 'Detran / Denatran / Senatran',
    mandatoryLegalDisclaimers: [
      'Garantia legal de 90 dias para motor e caixa de câmbio conforme o Código de Defesa do Consumidor.',
      'Valores de financiamento sujeitos a análise cadastral e aprovação de crédito pelas instituições bancárias.',
      'Locações exigem CNH definitiva válida com no mínimo 2 anos e cartão de crédito titular para bloqueio de caução.',
    ],
    minimumAge: 21,
    requiresKycOrNda: true,
  },
  documents: [
    {
      type: 'contract',
      title: 'Contrato de Locação e Termo de Vistoria de Veículo',
      templateCode: 'VEHICLE_RENTAL_CONTRACT',
      requiresSignature: true,
    },
    {
      type: 'contract',
      title: 'Contrato de Compra e Venda de Veículo Automotor',
      templateCode: 'VEHICLE_SALE_CONTRACT',
      requiresSignature: true,
    },
    {
      type: 'term',
      title: 'Termo de Responsabilidade e Termo de Test-Drive',
      templateCode: 'TEST_DRIVE_LIABILITY_TERM',
      requiresSignature: true,
    },
  ],
  slas: {
    confirmationTimeoutHours: 4,
    responseTimeoutMinutes: 30,
    cancellationNoticeHours: 48,
  },
  statusGlossary: {
    available_in_showroom: 'Disponível no Showroom',
    test_drive_scheduled: 'Test-Drive Agendado',
    credit_analysis: 'Financiamento em Análise',
    reserved_deposit: 'Sinal Pago / Reservado',
    delivered: 'Veículo Entregue',
    sold: 'Vendido',
  },
  statusTransitions: [
    { fromStatus: 'available_in_showroom', toStatus: 'credit_analysis', allowedRoles: ['dealer', 'operator'], actionName: 'Submeter Crédito' },
    { fromStatus: 'credit_analysis', toStatus: 'reserved_deposit', allowedRoles: ['dealer', 'operator'], actionName: 'Confirmar Reserva e Sinal' },
    { fromStatus: 'reserved_deposit', toStatus: 'delivered', allowedRoles: ['dealer', 'operator'], actionName: 'Efetuar Entrega das Chaves' },
  ],
  uiSemantics: {
    heroPlaceholder: 'Ex: Toyota Corolla 2.0 XEi Flex Automático 2023...',
    searchPlaceholder: 'Marca, modelo ou ano do veículo...',
    emptyCatalogMessage: 'Nenhum veículo disponível com esses filtros no momento.',
    orderSuccessMessage: 'Proposta registrada com sucesso! Nosso consultor enviará a simulação de parcelas.',
    leadCapturePrompt: 'Deseja dar seu carro atual como entrada? Simule a avaliação.',
  },
};
