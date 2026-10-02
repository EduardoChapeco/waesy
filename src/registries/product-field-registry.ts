/**
 * product-field-registry.ts — Coração da Padronização de Campos por Nicho e Arquétipo (R31)
 *
 * Transforma o registry dinâmico na autoridade única de validação e emissão
 * de campos por nicho, conectado ao NICHE_TAXONOMY_REGISTRY canônico.
 *
 * Regra R10: O nicho é dado, não código espalhado.
 * Regra R31: Campos por nicho vindos estritamente deste registry.
 */

import { z } from 'zod';
import { NICHE_TAXONOMY_REGISTRY } from '@/lib/ad-engine/niche-taxonomy-manifest';

export const FieldTypeSchema = z.enum([
  'text',
  'rich_text',
  'number',
  'money',
  'measurement',
  'boolean',
  'date',
  'select',
  'multi_select',
  'color',
  'size',
  'reference',
  'file',
  'image',
  'video',
]);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const ProductFieldDefinitionSchema = z.object({
  id: z.string(),
  type: FieldTypeSchema,
  label: z.string(),
  description: z.string().optional(),
  isRequired: z.boolean(),
  nicheId: z.string().optional(),
  archetypeId: z.string().optional(),
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});
export type ProductFieldDefinition = z.infer<typeof ProductFieldDefinitionSchema>;

/**
 * Catálogo Canônico de Campos de Produto e Segmento
 */
export const ProductFieldRegistry: Record<string, ProductFieldDefinition> = {
  // ── CAMPOS BÁSICOS & VAREJO ──
  'core.brand': {
    id: 'core.brand',
    type: 'text',
    label: 'Marca / Fabricante',
    isRequired: false,
    nicheId: 'varejo',
  },
  'core.weight': {
    id: 'core.weight',
    type: 'measurement',
    label: 'Peso Bruto (g)',
    isRequired: false,
    nicheId: 'varejo',
  },
  'core.sku': {
    id: 'core.sku',
    type: 'text',
    label: 'SKU / Código Interno',
    isRequired: false,
  },
  'core.barcode_ean': {
    id: 'core.barcode_ean',
    type: 'text',
    label: 'Código de Barras (EAN-13)',
    isRequired: false,
  },
  'variant.color': {
    id: 'variant.color',
    type: 'color',
    label: 'Cor',
    isRequired: false,
  },
  'variant.size': {
    id: 'variant.size',
    type: 'size',
    label: 'Tamanho / Grade',
    isRequired: false,
  },

  // ── TURISMO & VIAGENS ──
  destination_name: {
    id: 'destination_name',
    type: 'text',
    label: 'Destino Principal',
    description: 'Cidade, região ou país de destino da viagem',
    isRequired: true,
    nicheId: 'turismo',
  },
  transport_type: {
    id: 'transport_type',
    type: 'select',
    label: 'Tipo de Transporte',
    options: ['Aéreo', 'Rodoviário', 'Marítimo', 'Próprio / Sem Transporte'],
    isRequired: true,
    nicheId: 'turismo',
  },
  hotel_name: {
    id: 'hotel_name',
    type: 'text',
    label: 'Nome da Hospedagem / Resort',
    isRequired: false,
    nicheId: 'turismo',
  },
  hotel_rating: {
    id: 'hotel_rating',
    type: 'select',
    label: 'Classificação da Hospedagem',
    options: ['3 Estrelas', '4 Estrelas', '5 Estrelas', 'Resort All-Inclusive', 'Pousada Boutique'],
    isRequired: false,
    nicheId: 'turismo',
  },
  meal_plan: {
    id: 'meal_plan',
    type: 'select',
    label: 'Regime de Alimentação',
    options: ['Somente Hospedagem', 'Café da Manhã', 'Meia Pensão', 'Pensão Completa', 'All Inclusive'],
    isRequired: false,
    nicheId: 'turismo',
  },
  itinerary_days: {
    id: 'itinerary_days',
    type: 'number',
    label: 'Quantidade de Dias',
    isRequired: false,
    nicheId: 'turismo',
  },

  // ── MERCADO & PERECÍVEIS ──
  department: {
    id: 'department',
    type: 'select',
    label: 'Departamento da Gôndola',
    options: ['Hortifruti', 'Açougue', 'Padaria', 'Laticínios', 'Bebidas', 'Mercearia', 'Limpeza'],
    isRequired: true,
    nicheId: 'mercado',
  },
  ripeness_stage: {
    id: 'ripeness_stage',
    type: 'select',
    label: 'Ponto de Maturação',
    options: ['Verde (para a semana)', 'No Ponto (consumo em 2 dias)', 'Maduro (consumo imediato)'],
    isRequired: false,
    nicheId: 'mercado',
  },
  is_organic: {
    id: 'is_organic',
    type: 'boolean',
    label: 'Certificado Orgânico',
    isRequired: false,
    nicheId: 'mercado',
  },

  // ── SERVIÇOS & AGENDAMENTO ──
  duration_minutes: {
    id: 'duration_minutes',
    type: 'number',
    label: 'Duração Estimada (minutos)',
    isRequired: true,
    nicheId: 'servicos',
  },
  location_mode: {
    id: 'location_mode',
    type: 'select',
    label: 'Modalidade de Atendimento',
    options: ['No local do cliente', 'No estabelecimento do profissional', 'Online / Remoto'],
    isRequired: true,
    nicheId: 'servicos',
  },

  // ── IMÓVEIS & REAL ESTATE ──
  property_type: {
    id: 'property_type',
    type: 'select',
    label: 'Tipo de Imóvel',
    options: ['Apartamento', 'Casa em Condomínio', 'Casa Residencial', 'Terreno / Lote', 'Comercial'],
    isRequired: true,
    nicheId: 'imoveis',
  },
  area_sqm: {
    id: 'area_sqm',
    type: 'number',
    label: 'Área Privativa (m²)',
    isRequired: true,
    nicheId: 'imoveis',
  },
  bedrooms: {
    id: 'bedrooms',
    type: 'number',
    label: 'Dormitórios',
    isRequired: false,
    nicheId: 'imoveis',
  },

  // ── VEÍCULOS & AUTOMOTIVO ──
  vehicle_year: {
    id: 'vehicle_year',
    type: 'text',
    label: 'Ano Fabricação / Modelo',
    isRequired: true,
    nicheId: 'veiculos',
  },
  mileage_km: {
    id: 'mileage_km',
    type: 'number',
    label: 'Quilometragem (km)',
    isRequired: true,
    nicheId: 'veiculos',
  },
  transmission: {
    id: 'transmission',
    type: 'select',
    label: 'Câmbio',
    options: ['Automático', 'Manual', 'CVT', 'Automatizado'],
    isRequired: false,
    nicheId: 'veiculos',
  },
};

/**
 * Busca definição de campo pelo ID
 */
export function getProductFieldById(id: string): ProductFieldDefinition | undefined {
  return ProductFieldRegistry[id];
}

/**
 * Retorna os campos obrigatórios e opcionais vinculados a determinado nicho.
 * PROVA R31: campos por nicho vindos estritamente do registry.
 */
export function getFieldsForNiche(nicheId: string): {
  mandatory: ProductFieldDefinition[];
  optional: ProductFieldDefinition[];
} {
  const nicheConfig = NICHE_TAXONOMY_REGISTRY[nicheId];
  if (Boolean(nicheConfig) === false) {
    return { mandatory: [], optional: [] };
  }

  const mandatory: ProductFieldDefinition[] = [];
  const optional: ProductFieldDefinition[] = [];

  nicheConfig.mandatoryAttributes.forEach((attrId) => {
    const field = ProductFieldRegistry[attrId];
    if (field) {
      mandatory.push(field);
    } else {
      // Cria definição padrão segura caso não esteja pré-cadastrada
      mandatory.push({
        id: attrId,
        type: 'text',
        label: attrId,
        isRequired: true,
        nicheId,
      });
    }
  });

  nicheConfig.optionalAttributes.forEach((attrId) => {
    const field = ProductFieldRegistry[attrId];
    if (field) {
      optional.push(field);
    } else {
      optional.push({
        id: attrId,
        type: 'text',
        label: attrId,
        isRequired: false,
        nicheId,
      });
    }
  });

  return { mandatory, optional };
}

/**
 * Valida atributos de anúncio contra os campos mandatórios do nicho.
 */
export function validateNicheAttributes(
  nicheId: string,
  attributes: Record<string, unknown> = {}
): { isValid: boolean; errors: Record<string, string> } {
  const { mandatory } = getFieldsForNiche(nicheId);
  const errors: Record<string, string> = {};

  mandatory.forEach((field) => {
    const val = attributes[field.id];
    if (val === undefined || val === null || val === '') {
      errors[field.id] = `O campo '${field.label}' é obrigatório para este segmento.`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
