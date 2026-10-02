/**
 * niche-semantic-library.ts — Bridge R35 → niche-semantics.ts (dono canônico)
 *
 * O dono canônico é `src/lib/niche-semantics.ts` (1.280 linhas).
 * Este módulo adapta a API por nicheId diretamente sobre NICHE_SEMANTICS_REGISTRY.
 *
 * Kill List R27: após migração completa de todos os importadores,
 * substituir imports por `@/lib/niche-semantics` diretamente.
 */

export type {
  NicheSemantics,
  NicheSemantics as NicheSemanticConfig,
  NicheQuickAction,
  NicheKpiMetric,
} from '../niche-semantics';

export {
  NICHE_SEMANTICS_REGISTRY,
  NICHE_SEMANTICS_REGISTRY as NICHE_SEMANTIC_LIBRARY,
  getNicheSemantics,
  enrichNicheSemantics,
} from '../niche-semantics';

import { NICHE_SEMANTICS_REGISTRY, type NicheSemantics } from '../niche-semantics';

export type NicheLabelKey =
  | 'product_singular'
  | 'product_plural'
  | 'product_new'
  | 'product_edit'
  | 'price_label'
  | 'buyer_label'
  | 'stock_label'
  | 'empty_state_title'
  | 'empty_state_description'
  | 'search_placeholder';

/**
 * Lookup por nicheId direto no registry canônico.
 * Compatível com os IDs do NICHE_TAXONOMY_REGISTRY.
 */
function getByNicheId(nicheId: string): NicheSemantics | null {
  // O registry usa IDs em inglês (gastronomy, retail, etc.)
  // Mapeamento de IDs canônicos do Waesy para chaves do registry
  const ID_MAP: Record<string, string> = {
    turismo: 'tourism',
    varejo: 'retail',
    mercado: 'grocery',
    servicos: 'services',
    imoveis: 'real_estate',
    veiculos: 'automotive',
    digital: 'digital',
    gastronomy: 'gastronomy',
    tourism: 'tourism',
    retail: 'retail',
    grocery: 'grocery',
    services: 'services',
    real_estate: 'real_estate',
    automotive: 'automotive',
  };
  const key = ID_MAP[nicheId] ?? nicheId;
  return NICHE_SEMANTICS_REGISTRY[key] ?? null;
}

const LABEL_RESOLVERS: Record<NicheLabelKey, (s: NicheSemantics | null) => string> = {
  product_singular: (s) => s?.itemSingular ?? 'Produto',
  product_plural: (s) => s?.itemPlural ?? 'Produtos',
  product_new: (s) => s?.newItemAction ?? 'Novo produto',
  product_edit: (s) => s?.editItemAction ?? 'Editar produto',
  price_label: (s) => s?.priceLabel ?? 'Preço',
  buyer_label: (s) => s?.customerLabel ?? 'Cliente',
  stock_label: (s) => s?.stockLabel ?? 'Estoque',
  empty_state_title: (s) => s?.emptyCatalogText?.split('.')[0] ?? 'Nenhum item encontrado',
  empty_state_description: (s) => s?.emptyCatalogText ?? 'Tente ajustar os filtros.',
  search_placeholder: (s) => s?.searchItemPlaceholder ?? 'Buscar...',
};

/**
 * Retorna label semântico por nicheId e chave.
 * Dono único da lógica de resolução de label por nicho (R35).
 */
export function getNicheLabel(nicheId: string, key: NicheLabelKey): string {
  const semantics = getByNicheId(nicheId);
  return LABEL_RESOLVERS[key]?.(semantics) ?? key;
}

/**
 * Retorna empty state title/description para um nicho.
 */
export function getNicheEmptyState(nicheId: string): { title: string; description: string } {
  return {
    title: getNicheLabel(nicheId, 'empty_state_title'),
    description: getNicheLabel(nicheId, 'empty_state_description'),
  };
}

/**
 * Verifica se nicho tem semântica registrada.
 */
export function isNicheRegistered(nicheId: string): boolean {
  return Boolean(getByNicheId(nicheId));
}
