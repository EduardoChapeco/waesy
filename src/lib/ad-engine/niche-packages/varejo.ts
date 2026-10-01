/**
 * varejo.ts — Pacote Canônico de Nicho: Varejo, Moda, Eletrônicos & Comércio Físico (G11–G17)
 */

import { NichePackage } from './types';

export const VAREJO_NICHE_PACKAGE: NichePackage = {
  id: 'varejo',
  name: 'Varejo & Comércio',
  description: 'Produtos físicos duráveis e semi-duráveis com gestão de SKU, variações de grade, frete e garantia.',
  version: '1.0.0',
  defaultArchetype: 'A01', // Produto Simples com Estoque
  allowedArchetypes: {
    A01: 'enabled',    // Produto Simples com Estoque (Canônico)
    A02: 'enabled',    // Produto com Variações (Cor, Tamanho, Voltagem)
    A03: 'enabled',    // Kits / Combos promocionais
    A04: 'optional',   // Produtos com adicionais (ex: embalagem para presente)
    A05: 'prohibited',
    A06: 'optional',   // Clube de assinatura de produtos físicos
    A07: 'prohibited',
    A08: 'prohibited',
    A09: 'prohibited',
    A10: 'prohibited',
    A11: 'prohibited',
    A12: 'prohibited',
    A13: 'prohibited',
    A14: 'prohibited',
    A15: 'prohibited',
  },
  defaultSellingUnit: 'un',
  allowedSellingUnits: ['un', 'par', 'kit', 'cx', 'pct'],
  terminology: {
    entitySingular: 'Produto',
    entityPlural: 'Produtos',
    primaryActionLabel: 'Comprar Agora',
    secondaryActionLabel: 'Adicionar à Sacola',
    pricingLabel: 'Preço à vista',
    unitLabel: 'Unidade',
    documentLabel: 'Danfe / Cupom Fiscal',
    operatorRoleLabel: 'Lojista / Gerente',
    customerRoleLabel: 'Comprador',
  },
  attributes: [
    {
      key: 'sku',
      label: 'Código SKU',
      type: 'string',
      isFilterable: true,
      isSearchable: true,
      isRequired: true,
      appliesToArchetypes: ['A01', 'A02', 'A03'],
    },
    {
      key: 'gtin_ean',
      label: 'Código de Barras (EAN-13)',
      type: 'string',
      isFilterable: false,
      isSearchable: true,
      isRequired: false,
      appliesToArchetypes: ['A01', 'A02'],
    },
    {
      key: 'brand_name',
      label: 'Marca / Fabricante',
      type: 'string',
      isFilterable: true,
      isSearchable: true,
      isRequired: true,
      appliesToArchetypes: ['A01', 'A02', 'A03'],
    },
    {
      key: 'weight_grams',
      label: 'Peso com Embalagem (g)',
      type: 'number',
      unit: 'g',
      isFilterable: false,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A01', 'A02', 'A03'],
    },
    {
      key: 'warranty_days',
      label: 'Garantia do Fabricante (Dias)',
      type: 'number',
      unit: 'dias',
      isFilterable: true,
      isSearchable: false,
      isRequired: false,
      appliesToArchetypes: ['A01', 'A02'],
    },
    {
      key: 'supplier_cost_cents',
      label: 'Custo de Aquisição (CMV)',
      type: 'currency',
      isFilterable: false,
      isSearchable: false,
      isRequired: false,
      isInternalOnly: true, // Campo interno protegido (G24)
      appliesToArchetypes: ['A01', 'A02', 'A03'],
    },
  ],
  detailSections: [
    { id: 'gallery_showcase', label: 'Galeria de Fotos', order: 1, isRequired: true },
    { id: 'commercial_pricing', label: 'Preço & Parcelamento no Cartão', order: 2, isRequired: true },
    { id: 'specifications_sheet', label: 'Ficha Técnica & Dimensões', order: 3, isRequired: true },
    { id: 'warranty_and_returns', label: 'Garantia e Políticas de Troca', order: 4, isRequired: true },
    { id: 'shipping_calculator', label: 'Cálculo de Frete e Prazo', order: 5, isRequired: true },
    { id: 'internal_margin_analysis', label: 'Margem Líquida e Fornecedor', order: 6, isRequired: false, isInternalOnly: true },
  ],
  fiscalAndRegulatory: {
    taxRegimeRecommendation: 'simples',
    requiresNcm: true,
    requiresCnae: true,
    primaryCnaeCode: '4712-1/00',
    regulatoryBody: 'Inmetro / Procon',
    mandatoryLegalDisclaimers: [
      'Garantia legal de 90 dias conforme Artigo 26, II do Código de Defesa do Consumidor.',
      'Direito de arrependimento em até 7 dias corridos após o recebimento para compras online.',
    ],
    minimumAge: 0,
    requiresKycOrNda: false,
  },
  documents: [
    {
      type: 'invoice',
      title: 'Nota Fiscal Eletrônica (NF-e)',
      templateCode: 'NFE_RETAIL_CANONICAL',
      requiresSignature: false,
    },
  ],
  slas: {
    confirmationTimeoutHours: 2,
    dispatchTimeoutHours: 48,
    responseTimeoutMinutes: 30,
    cancellationNoticeHours: 24,
  },
  statusGlossary: {
    active: 'Em Estoque',
    low_stock: 'Estoque Baixo',
    out_of_stock: 'Esgotado',
    discontinued: 'Descontinuado',
  },
  statusTransitions: [
    { fromStatus: 'active', toStatus: 'low_stock', allowedRoles: ['system', 'operator'], actionName: 'Alerta de Mínimo' },
    { fromStatus: 'low_stock', toStatus: 'out_of_stock', allowedRoles: ['system', 'operator'], actionName: 'Zerar Disponível' },
    { fromStatus: 'out_of_stock', toStatus: 'active', allowedRoles: ['operator', 'owner'], actionName: 'Repor Estoque' },
  ],
  uiSemantics: {
    heroPlaceholder: 'Ex: Smartphone Galaxy S24 Ultra 256GB Titânio Cinza...',
    searchPlaceholder: 'O que você está procurando hoje?',
    emptyCatalogMessage: 'Nenhum produto cadastrado nesta categoria.',
    orderSuccessMessage: 'Pedido confirmado! Estamos preparando seu pacote para despacho.',
    leadCapturePrompt: 'Avise-me quando este produto chegar em estoque.',
  },
};
