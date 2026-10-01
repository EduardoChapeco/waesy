/**
 * mercado.ts — Pacote Canônico de Nicho: Mercado, Açougue, Hortifrúti & Perecíveis (G11–G17, G65)
 * 
 * Regra A14: Venda por peso/volume, fracionamento, perecibilidade, substituição honesta e controle sanitário.
 */

import { NichePackage } from './types';

export const MERCADO_NICHE_PACKAGE: NichePackage = {
  id: 'mercado',
  name: 'Mercado & Perecíveis',
  description: 'Alimentos frescos, açougue, hortifrúti, padaria e conveniência com precificação fracionada por peso/volume e controle de validade.',
  version: '1.0.0',
  defaultArchetype: 'A14', // Varejo de Consumo / Perecível
  allowedArchetypes: {
    A01: 'enabled',    // Produto industrializado simples com estoque
    A02: 'prohibited',
    A03: 'optional',   // Cestas básicas e kits churrasco
    A04: 'enabled',    // Marmitas / lanches com adicionais e montagem
    A05: 'prohibited',
    A06: 'optional',   // Clube da carne / assinatura de hortifrúti
    A07: 'prohibited',
    A08: 'prohibited',
    A09: 'prohibited',
    A10: 'prohibited',
    A11: 'prohibited',
    A12: 'prohibited',
    A13: 'prohibited',
    A14: 'enabled',    // Varejo de Consumo (Peso/Volume/Validade) - Canônico
    A15: 'prohibited',
  },
  defaultSellingUnit: 'kg',
  allowedSellingUnits: ['kg', 'g', 'l', 'ml', 'un', 'bandeja', 'duzia', 'maco'],
  terminology: {
    entitySingular: 'Item / Alimento',
    entityPlural: 'Itens de Mercearia',
    primaryActionLabel: 'Adicionar à Cesta',
    secondaryActionLabel: 'Comprar Agora',
    pricingLabel: 'Preço por kg / unidade',
    unitLabel: 'Peso / Fração',
    documentLabel: 'Cupom Fiscal NFC-e',
    operatorRoleLabel: 'Operador / Separador',
    customerRoleLabel: 'Cliente',
  },
  attributes: [
    {
      key: 'fraction_step',
      label: 'Passo Mínimo de Fracionamento',
      type: 'number',
      unit: 'kg',
      isFilterable: false,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A14'],
    },
    {
      key: 'shelf_life_days',
      label: 'Validade Média (Dias)',
      type: 'number',
      unit: 'dias',
      isFilterable: true,
      isSearchable: false,
      isRequired: false,
      appliesToArchetypes: ['A14'],
    },
    {
      key: 'temperature_control',
      label: 'Exigência Térmica',
      type: 'select',
      options: [
        { value: 'ambiente', label: 'Temperatura Ambiente' },
        { value: 'refrigerado', label: 'Refrigerado (0°C a 4°C)' },
        { value: 'congelado', label: 'Congelado (-18°C)' },
      ],
      isFilterable: true,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A14'],
    },
    {
      key: 'substitution_policy',
      label: 'Política de Substituição de Falta',
      type: 'select',
      options: [
        { value: 'contact_customer', label: 'Contatar cliente antes de substituir' },
        { value: 'auto_replace_higher', label: 'Substituir por marca superior sem custo extra' },
        { value: 'cancel_item', label: 'Cancelar item e estornar imediatamente' },
      ],
      isFilterable: false,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A14'],
    },
    {
      key: 'wholesale_cost_cents',
      label: 'Custo de Compra Ceasa / Frigorífico',
      type: 'currency',
      isFilterable: false,
      isSearchable: false,
      isRequired: false,
      isInternalOnly: true, // Protegido contra vazamento (G24)
      appliesToArchetypes: ['A01', 'A14'],
    },
  ],
  detailSections: [
    { id: 'freshness_overview', label: 'Apresentação & Origem', order: 1, isRequired: true },
    { id: 'weight_selector', label: 'Seleção de Peso e Quantidade', order: 2, isRequired: true },
    { id: 'nutrition_facts', label: 'Tabela Nutricional & Alérgenos', order: 3, isRequired: false },
    { id: 'handling_instructions', label: 'Conservação & Armazenamento', order: 4, isRequired: true },
    { id: 'delivery_slots', label: 'Janelas de Entrega Expressa', order: 5, isRequired: true },
    { id: 'internal_spoilage_log', label: 'Taxa de Perda / Quebra Interna', order: 6, isRequired: false, isInternalOnly: true },
  ],
  fiscalAndRegulatory: {
    taxRegimeRecommendation: 'simples',
    requiresNcm: true,
    requiresCnae: true,
    primaryCnaeCode: '4721-1/02',
    regulatoryBody: 'Anvisa / Vigilância Sanitária Municipal / MAPA',
    mandatoryLegalDisclaimers: [
      'Itens pesáveis podem sofrer variação residual de até 5% com ajuste no cupom fiscal final.',
      'Em caso de divergência de qualidade no ato do recebimento, o cliente pode recusar a entrega imediatamente.',
    ],
    minimumAge: 0,
    requiresKycOrNda: false,
  },
  documents: [
    {
      type: 'invoice',
      title: 'Nota Fiscal de Consumidor Eletrônica (NFC-e)',
      templateCode: 'NFCE_GROCERY_CANONICAL',
      requiresSignature: false,
    },
  ],
  slas: {
    confirmationTimeoutHours: 1,
    dispatchTimeoutHours: 3,
    responseTimeoutMinutes: 15,
    cancellationNoticeHours: 1,
  },
  statusGlossary: {
    available: 'Disponível na Gôndola',
    picking: 'Em Separação pelo Operador',
    weighed: 'Pesado e Etiquetado',
    dispatched: 'Em Rota de Entrega',
    delivered: 'Entregue ao Cliente',
  },
  statusTransitions: [
    { fromStatus: 'available', toStatus: 'picking', allowedRoles: ['picker', 'operator'], actionName: 'Iniciar Separação' },
    { fromStatus: 'picking', toStatus: 'weighed', allowedRoles: ['picker', 'operator'], actionName: 'Confirmar Pesagem Real' },
    { fromStatus: 'weighed', toStatus: 'dispatched', allowedRoles: ['operator', 'driver'], actionName: 'Despachar para Entrega' },
    { fromStatus: 'dispatched', toStatus: 'delivered', allowedRoles: ['driver', 'customer'], actionName: 'Confirmar Recebimento' },
  ],
  uiSemantics: {
    heroPlaceholder: 'Ex: Tomate Italiano Selecionado (Preço por kg)...',
    searchPlaceholder: 'Buscar frutas, legumes, carnes, bebidas...',
    emptyCatalogMessage: 'Nenhum produto alimentício listado.',
    orderSuccessMessage: 'Pedido recebido! Nossos separadores já estão selecionando os melhores itens frescos.',
    leadCapturePrompt: 'Deseja receber a lista de ofertas do dia no seu WhatsApp?',
  },
};
