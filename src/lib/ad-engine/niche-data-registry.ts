/**
 * niche-data-registry.ts — Nichos como Dado, não como Código (R36)
 *
 * Fonte Única da Verdade para a lista de nichos disponíveis na plataforma.
 * Substituição canônica para todo if (nicho === "turismo") espalhado.
 *
 * Regra R36 (Operação Verdade Única):
 * - PROIBIDO adicionar novo nicho sem registrá-lo aqui.
 * - PROIBIDO condicional por nicho fora deste módulo.
 * - Trocar ou adicionar nicho NÃO deve exigir tocar em nenhum componente.
 *
 * Gate R36: trocar de nicho sem tocar em componente.
 *
 * Uso:
 *   import { NICHE_REGISTRY, getNicheById } from '@/lib/ad-engine/niche-data-registry';
 */

import { NICHE_TAXONOMY_REGISTRY, type NicheTaxonomyConfig } from './niche-taxonomy-manifest';
import { NICHE_SEMANTIC_LIBRARY, type NicheSemanticConfig } from './niche-semantic-library';

// ── Tipo Completo de Nicho (Dado + Semântica) ───────────────────────────────

export interface NicheFullDefinition {
  // Identidade
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;

  // Taxonomia (templates, campos, seções)
  taxonomy: NicheTaxonomyConfig;

  // Semântica (textos, labels, erros)
  semantic: NicheSemanticConfig;

  // Metadados operacionais
  iconSlug: string; // Referência a Phosphor/Lucide icon name — renderizado pelo componente
  regulatoryBody: string | null;
  documentType: string; // Tipo de documento fiscal/operacional
  requiresPhysicalAddress: boolean;
  supportsDigitalDelivery: boolean;
  supportsSubscription: boolean;
  supportsScheduling: boolean;
}

// ── Registry de Nichos ────────────────────────────────────────────────────────
// ÚNICA fonte de verdade. Adicionar nicho aqui o propaga automaticamente.

const NICHE_DEFINITIONS: Omit<NicheFullDefinition, 'taxonomy' | 'semantic'>[] = [
  {
    id: 'turismo',
    name: 'Turismo & Viagens',
    slug: 'turismo',
    isActive: true,
    sortOrder: 1,
    iconSlug: 'Airplane',
    regulatoryBody: 'Cadastur / MTur',
    documentType: 'Voucher / Contrato Embratur',
    requiresPhysicalAddress: false,
    supportsDigitalDelivery: false,
    supportsSubscription: false,
    supportsScheduling: true,
  },
  {
    id: 'varejo',
    name: 'Varejo & Comércio',
    slug: 'varejo',
    isActive: true,
    sortOrder: 2,
    iconSlug: 'ShoppingBag',
    regulatoryBody: 'Inmetro / Procon',
    documentType: 'Danfe NF-e',
    requiresPhysicalAddress: true,
    supportsDigitalDelivery: false,
    supportsSubscription: false,
    supportsScheduling: false,
  },
  {
    id: 'mercado',
    name: 'Mercado & Perecíveis',
    slug: 'mercado',
    isActive: true,
    sortOrder: 3,
    iconSlug: 'ShoppingCart',
    regulatoryBody: 'Anvisa / MAPA',
    documentType: 'Cupom NFC-e',
    requiresPhysicalAddress: true,
    supportsDigitalDelivery: false,
    supportsSubscription: false,
    supportsScheduling: false,
  },
  {
    id: 'servicos',
    name: 'Serviços & Especialistas',
    slug: 'servicos',
    isActive: true,
    sortOrder: 4,
    iconSlug: 'Wrench',
    regulatoryBody: 'Conselhos de Classe',
    documentType: 'Ordem de Serviço (OS)',
    requiresPhysicalAddress: false,
    supportsDigitalDelivery: true,
    supportsSubscription: true,
    supportsScheduling: true,
  },
  {
    id: 'imoveis',
    name: 'Imóveis & Real Estate',
    slug: 'imoveis',
    isActive: true,
    sortOrder: 5,
    iconSlug: 'House',
    regulatoryBody: 'CRECI / Cofeci',
    documentType: 'Contrato de Locação / Escritura',
    requiresPhysicalAddress: true,
    supportsDigitalDelivery: false,
    supportsSubscription: false,
    supportsScheduling: true,
  },
  {
    id: 'veiculos',
    name: 'Veículos & Automotivo',
    slug: 'veiculos',
    isActive: true,
    sortOrder: 6,
    iconSlug: 'Car',
    regulatoryBody: 'Detran / Senatran',
    documentType: 'CRLV / Contrato de Locação',
    requiresPhysicalAddress: false,
    supportsDigitalDelivery: false,
    supportsSubscription: false,
    supportsScheduling: true,
  },
  {
    id: 'digital',
    name: 'Produtos Digitais',
    slug: 'digital',
    isActive: true,
    sortOrder: 7,
    iconSlug: 'DownloadSimple',
    regulatoryBody: null,
    documentType: 'Chave Serial / Voucher de Acesso',
    requiresPhysicalAddress: false,
    supportsDigitalDelivery: true,
    supportsSubscription: true,
    supportsScheduling: false,
  },
];

// ── Build do Registry Completo ───────────────────────────────────────────────

export const NICHE_REGISTRY: Record<string, NicheFullDefinition> = Object.fromEntries(
  NICHE_DEFINITIONS.map((def) => {
    const taxonomy = NICHE_TAXONOMY_REGISTRY[def.id];
    const semantic = NICHE_SEMANTIC_LIBRARY[def.id];

    if (Boolean(taxonomy) === false) {
      console.warn(`[NICHE_REGISTRY] Taxonomy nao encontrada para nicho: ${def.id}`);
    }
    if (Boolean(semantic) === false) {
      console.warn(`[NICHE_REGISTRY] Semantica nao encontrada para nicho: ${def.id}`);
    }

    return [
      def.id,
      {
        ...def,
        taxonomy: taxonomy ?? {
          id: def.id,
          name: def.name,
          label: def.name,
          defaultSellingUnit: 'un',
          allowedSellingUnits: ['un'],
          allowedTemplates: [],
          mandatoryListingFields: ['title', 'price_cents'],
          mandatoryAttributes: [],
          optionalAttributes: [],
          sectionsComposition: [],
        },
        semantic: semantic ?? {
          labels: {} as NicheSemanticConfig['labels'],
          units: {},
          errorMessages: {
            stockOut: 'Produto indisponível.',
            reservationFull: 'Capacidade esgotada.',
            invalidDate: 'Data inválida.',
            missingRequired: 'Preencha os campos obrigatórios.',
          },
        },
      },
    ];
  }),
);

// ── Funções Utilitárias ──────────────────────────────────────────────────────

/**
 * Retorna a definição completa de um nicho por ID.
 * Gate R36: única porta de entrada para dados de nicho em componentes.
 */
export function getNicheById(nicheId: string): NicheFullDefinition | null {
  return NICHE_REGISTRY[nicheId] ?? null;
}

/**
 * Retorna a lista de nichos ativos, ordenada por sortOrder.
 */
export function getActiveNiches(): NicheFullDefinition[] {
  return Object.values(NICHE_REGISTRY)
    .filter((n) => n.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Verifica se um nicho suporta agendamento.
 */
export function nicheSupportsScheduling(nicheId: string): boolean {
  const niche = getNicheById(nicheId);
  return niche?.supportsScheduling ?? false;
}

/**
 * Verifica se um nicho suporta assinatura.
 */
export function nicheSupportsSubscription(nicheId: string): boolean {
  const niche = getNicheById(nicheId);
  return niche?.supportsSubscription ?? false;
}

/**
 * Verifica se um nicho suporta entrega digital.
 */
export function nicheSupportsDigitalDelivery(nicheId: string): boolean {
  const niche = getNicheById(nicheId);
  return niche?.supportsDigitalDelivery ?? false;
}

/**
 * Retorna os templates permitidos para um nicho.
 * Garante que o seletor de templates nunca mostre templates de outro nicho (R34).
 */
export function getAllowedTemplates(nicheId: string): string[] {
  const niche = getNicheById(nicheId);
  return niche?.taxonomy.allowedTemplates ?? [];
}

/**
 * Retorna as seções de composição para um nicho, ordenadas.
 * Garante que a UI renderize as seções corretas para cada nicho (R31).
 */
export function getNicheSections(nicheId: string) {
  const niche = getNicheById(nicheId);
  return (niche?.taxonomy.sectionsComposition ?? []).sort((a, b) => a.order - b.order);
}
