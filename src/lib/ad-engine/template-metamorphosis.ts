/**
 * template-metamorphosis.ts — Dono Único da Metamorfose e Seleção de Templates por Nicho (R30)
 *
 * Elimina mecanismos concorrentes e define o fluxo canônico de resolução:
 * 1. O nicho do anúncio dita os templates permitidos via NICHE_TAXONOMY_REGISTRY.
 * 2. Se o template solicitado for incompatível (ex: "Mercado" em "Turismo"),
 *    reverte automaticamente para o template canônico padrão do nicho.
 * 3. Proíbe qualquer decisão de template solta em componentes de UI.
 *
 * Regra R06: O template é COMPOSIÇÃO, não tema cosmético.
 * Regra R10: O nicho é dado, não código.
 * Regra R30: Dono único da metamorfose.
 */

import { NICHE_TAXONOMY_REGISTRY } from './niche-taxonomy-manifest';

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  supportedNiches: string[];
  isDefault: boolean;
  sectionsCount: number;
}

export const CANONICAL_TEMPLATES_CATALOG: Record<string, TemplateDefinition> = {
  // Turismo
  tourism_immersive: {
    id: 'tourism_immersive',
    name: 'Turismo Imersivo & Roteiro',
    description: 'Hero cinematográfico, itinerário dia a dia, inclusos/exclusos e seleção de saídas.',
    supportedNiches: ['turismo'],
    isDefault: true,
    sectionsCount: 8,
  },
  tourism_catalog: {
    id: 'tourism_catalog',
    name: 'Turismo Vitrine / Catálogo Rápido',
    description: 'Layout compacto para pacotes com foco em preço, partidas rápidas e conversão direta.',
    supportedNiches: ['turismo'],
    isDefault: false,
    sectionsCount: 5,
  },

  // Mercado & Perecíveis
  grocery_gondola: {
    id: 'grocery_gondola',
    name: 'Gôndola de Mercado & Conveniência',
    description: 'Exibição em grade densa com seletor de peso/unidade e disponibilidade em prateleira.',
    supportedNiches: ['mercado'],
    isDefault: true,
    sectionsCount: 4,
  },

  // Varejo & Produtos
  retail_standard: {
    id: 'retail_standard',
    name: 'Varejo & Vitrine Comercial',
    description: 'Grade de fotos, seletor de variações, cálculo de frete e parcelamento integrado.',
    supportedNiches: ['varejo'],
    isDefault: true,
    sectionsCount: 6,
  },

  // Serviços & Agendamento
  service_schedule: {
    id: 'service_schedule',
    name: 'Serviço & Agenda de Especialista',
    description: 'Portfólio de execuções, tempo de atendimento, slots de agenda e orçamento.',
    supportedNiches: ['servicos'],
    isDefault: true,
    sectionsCount: 5,
  },

  // Imóveis
  real_estate_luxury: {
    id: 'real_estate_luxury',
    name: 'Imóvel & Real Estate Alto Padrão',
    description: 'Tour visual de alta definição, ficha técnica de metragem, agendamento de visita.',
    supportedNiches: ['imoveis'],
    isDefault: true,
    sectionsCount: 7,
  },

  // Veículos
  automotive_deal: {
    id: 'automotive_deal',
    name: 'Veículo & Ficha Automotiva',
    description: 'Quilometragem, ano/modelo, laudo cautelar, simulação de financiamento e troca.',
    supportedNiches: ['veiculos'],
    isDefault: true,
    sectionsCount: 6,
  },

  // Digital
  digital_access: {
    id: 'digital_access',
    name: 'Produto Digital & Entrega Imediata',
    description: 'Acesso imediato, serial de ativação, visualização de módulos e garantia CDC.',
    supportedNiches: ['digital'],
    isDefault: true,
    sectionsCount: 4,
  },
};

/**
 * Verifica se um template é compatível com o nicho solicitado.
 * Bloqueia expressamente distorções semânticas como Mercado em Turismo (Caso O02).
 */
export function isTemplateAllowedForNiche(nicheId: string, templateId: string): boolean {
  const nicheConfig = NICHE_TAXONOMY_REGISTRY[nicheId];
  if (Boolean(nicheConfig) === false || Boolean(nicheConfig.allowedTemplates) === false) {
    return false;
  }
  return nicheConfig.allowedTemplates.includes(templateId);
}

/**
 * Retorna todos os templates permitidos para determinado nicho.
 */
export function listAllowedTemplatesForNiche(nicheId: string): TemplateDefinition[] {
  const nicheConfig = NICHE_TAXONOMY_REGISTRY[nicheId];
  if (Boolean(nicheConfig) === false || Boolean(nicheConfig.allowedTemplates) === false) {
    return [];
  }

  return nicheConfig.allowedTemplates
    .map((tmplId) => CANONICAL_TEMPLATES_CATALOG[tmplId])
    .filter((tmpl): tmpl is TemplateDefinition => Boolean(tmpl));
}

/**
 * Resolve o template efetivo a ser renderizado.
 * Se o template solicitado não for informado ou for incompatível,
 * seleciona com segurança o template padrão legítimo do nicho.
 *
 * DONO ÚNICO da resolução de template (R30).
 */
export function resolveTemplate(
  nicheId: string,
  requestedTemplateId?: string | null
): string {
  const nicheConfig = NICHE_TAXONOMY_REGISTRY[nicheId];
  const allowed = nicheConfig?.allowedTemplates || [];

  if (allowed.length === 0) {
    return 'retail_standard';
  }

  if (requestedTemplateId && allowed.includes(requestedTemplateId)) {
    return requestedTemplateId;
  }

  // Fallback seguro: primeiro template permitido do nicho
  return allowed[0];
}
