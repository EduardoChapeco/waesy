/**
 * niche-archetype-matrix.ts — Matriz Canônica Nicho × Arquétipo de Oferta (R33)
 *
 * Mapeia os 15 arquétipos canônicos de transação comercial aos nichos legítimos.
 * Proíbe arquétipos incoerentes (ex: Varejo por peso em Imóveis, Pacote em Varejo Simples).
 *
 * Regra R33 (Operação Verdade Única):
 * Apenas combinações registradas nesta matriz podem ser instanciadas no sistema.
 */

export interface ArchetypeDefinition {
  id: string; // Ex: 'A01'
  key: string; // Ex: 'simple_product'
  name: string;
  description: string;
  sellingUnitDefault: string;
  hasInventory: boolean;
  hasSchedule: boolean;
  hasVariants: boolean;
  hasFiscalDocument: boolean;
}

export const CANONICAL_ARCHETYPES: Record<string, ArchetypeDefinition> = {
  A01: {
    id: 'A01',
    key: 'simple_product',
    name: 'Produto Simples',
    description: 'Item único de varejo com estoque e preço fixo',
    sellingUnitDefault: 'un',
    hasInventory: true,
    hasSchedule: false,
    hasVariants: false,
    hasFiscalDocument: true,
  },
  A02: {
    id: 'A02',
    key: 'variant_matrix',
    name: 'Grade de Variações',
    description: 'Produto com matriz de cores, tamanhos e SKUs filhos',
    sellingUnitDefault: 'un',
    hasInventory: true,
    hasSchedule: false,
    hasVariants: true,
    hasFiscalDocument: true,
  },
  A03: {
    id: 'A03',
    key: 'product_kit',
    name: 'Kit / Combo',
    description: 'Conjunto fechado de itens com baixa coordenada de estoque',
    sellingUnitDefault: 'kit',
    hasInventory: true,
    hasSchedule: false,
    hasVariants: false,
    hasFiscalDocument: true,
  },
  A04: {
    id: 'A04',
    key: 'modifiers_addons',
    name: 'Com Adicionais / Modificadores',
    description: 'Item base com personalização de complementos e opcionais',
    sellingUnitDefault: 'un',
    hasInventory: false,
    hasSchedule: false,
    hasVariants: true,
    hasFiscalDocument: true,
  },
  A05: {
    id: 'A05',
    key: 'digital_access',
    name: 'Produto Digital',
    description: 'Arquivo, curso, chave serial ou download imediato',
    sellingUnitDefault: 'licença',
    hasInventory: false,
    hasSchedule: false,
    hasVariants: false,
    hasFiscalDocument: true,
  },
  A06: {
    id: 'A06',
    key: 'recurring_subscription',
    name: 'Assinatura Recorrente',
    description: 'Cobrança mensal ou periódica com renovação automática',
    sellingUnitDefault: 'mês',
    hasInventory: false,
    hasSchedule: false,
    hasVariants: false,
    hasFiscalDocument: true,
  },
  A07: {
    id: 'A07',
    key: 'travel_package',
    name: 'Pacote de Turismo',
    description: 'Roteiro com datas de embarque, vagas e itens inclusos/exclusos',
    sellingUnitDefault: 'pessoa',
    hasInventory: true, // Vagas
    hasSchedule: true,
    hasVariants: true, // Tipos de quarto/saída
    hasFiscalDocument: true,
  },
  A08: {
    id: 'A08',
    key: 'scheduled_booking',
    name: 'Serviço com Agendamento',
    description: 'Slot de data e horário em agenda com profissional',
    sellingUnitDefault: 'sessão',
    hasInventory: true, // Horários
    hasSchedule: true,
    hasVariants: false,
    hasFiscalDocument: true,
  },
  A09: {
    id: 'A09',
    key: 'quote_order',
    name: 'Orçamento Sob Medida',
    description: 'Preço sob consulta ou calculado após briefing técnico',
    sellingUnitDefault: 'projeto',
    hasInventory: false,
    hasSchedule: false,
    hasVariants: false,
    hasFiscalDocument: true,
  },
  A10: {
    id: 'A10',
    key: 'short_term_rental',
    name: 'Locação Curta / Diária',
    description: 'Aluguel por período com calendário de disponibilidade',
    sellingUnitDefault: 'diária',
    hasInventory: true,
    hasSchedule: true,
    hasVariants: false,
    hasFiscalDocument: true,
  },
  A11: {
    id: 'A11',
    key: 'long_term_rental',
    name: 'Locação Longa / Mensal',
    description: 'Contrato de locação com fiança e prazos formais',
    sellingUnitDefault: 'mês',
    hasInventory: true,
    hasSchedule: false,
    hasVariants: false,
    hasFiscalDocument: true,
  },
  A12: {
    id: 'A12',
    key: 'high_ticket_sale',
    name: 'Venda de Alto Valor',
    description: 'Bens duráveis com proposta, vistoria e documentação formal',
    sellingUnitDefault: 'unidade',
    hasInventory: true,
    hasSchedule: false,
    hasVariants: false,
    hasFiscalDocument: true,
  },
  A13: {
    id: 'A13',
    key: 'event_ticket',
    name: 'Ingresso de Evento',
    description: 'Voucher com QR Code individual para controle de portaria',
    sellingUnitDefault: 'ingresso',
    hasInventory: true,
    hasSchedule: true,
    hasVariants: true, // Lotes
    hasFiscalDocument: true,
  },
  A14: {
    id: 'A14',
    key: 'weight_unit_retail',
    name: 'Varejo por Peso / Granel',
    description: 'Pesagem na balança com preço proporcional ao peso real',
    sellingUnitDefault: 'kg',
    hasInventory: true,
    hasSchedule: false,
    hasVariants: false,
    hasFiscalDocument: true,
  },
  A15: {
    id: 'A15',
    key: 'standalone_service',
    name: 'Serviço Avulso',
    description: 'Mão de obra ou execução direta sem agenda rígida',
    sellingUnitDefault: 'serviço',
    hasInventory: false,
    hasSchedule: false,
    hasVariants: false,
    hasFiscalDocument: true,
  },
};

export interface NicheArchetypeCompatibility {
  nicheId: string;
  allowedArchetypes: string[]; // Lista de IDs: 'A01', 'A07', etc.
  defaultArchetype: string;
  documentType: string;
  regulatoryBody: string | null;
}

/**
 * Matriz Canônica Nicho × Arquétipos Permitidos
 */
export const NICHE_ARCHETYPE_MATRIX: Record<string, NicheArchetypeCompatibility> = {
  turismo: {
    nicheId: 'turismo',
    allowedArchetypes: ['A07', 'A08', 'A10', 'A13', 'A04', 'A15'],
    defaultArchetype: 'A07',
    documentType: 'Voucher / Contrato Embratur',
    regulatoryBody: 'Cadastur / MTur',
  },
  varejo: {
    nicheId: 'varejo',
    allowedArchetypes: ['A01', 'A02', 'A03', 'A04', 'A06'],
    defaultArchetype: 'A01',
    documentType: 'Danfe NF-e',
    regulatoryBody: 'Inmetro / Procon / CDC',
  },
  mercado: {
    nicheId: 'mercado',
    allowedArchetypes: ['A01', 'A04', 'A14', 'A03', 'A06'],
    defaultArchetype: 'A14',
    documentType: 'Cupom NFC-e',
    regulatoryBody: 'Anvisa / MAPA',
  },
  servicos: {
    nicheId: 'servicos',
    allowedArchetypes: ['A07', 'A08', 'A09', 'A15', 'A04', 'A06'],
    defaultArchetype: 'A08',
    documentType: 'Ordem de Serviço (OS)',
    regulatoryBody: 'Conselhos de Classe',
  },
  imoveis: {
    nicheId: 'imoveis',
    allowedArchetypes: ['A10', 'A11', 'A12', 'A09'],
    defaultArchetype: 'A12',
    documentType: 'Contrato de Locação / Escritura',
    regulatoryBody: 'CRECI / Cofeci',
  },
  veiculos: {
    nicheId: 'veiculos',
    allowedArchetypes: ['A10', 'A12', 'A04', 'A06', 'A11'],
    defaultArchetype: 'A12',
    documentType: 'CRLV / Contrato de Locação',
    regulatoryBody: 'Detran / Senatran',
  },
  digital: {
    nicheId: 'digital',
    allowedArchetypes: ['A05', 'A06', 'A03', 'A13'],
    defaultArchetype: 'A05',
    documentType: 'Chave Serial / Voucher de Acesso',
    regulatoryBody: null,
  },
};

/**
 * Retorna os arquétipos permitidos para determinado nicho
 */
export function getArchetypesForNiche(nicheId: string): ArchetypeDefinition[] {
  const compat = NICHE_ARCHETYPE_MATRIX[nicheId];
  if (Boolean(compat) === false) {
    return [CANONICAL_ARCHETYPES.A01];
  }

  return compat.allowedArchetypes
    .map((archId) => CANONICAL_ARCHETYPES[archId])
    .filter((a): a is ArchetypeDefinition => Boolean(a));
}

/**
 * Valida se um arquétipo é permitido para determinado nicho
 */
export function isArchetypeAllowedForNiche(nicheId: string, archetypeId: string): boolean {
  const compat = NICHE_ARCHETYPE_MATRIX[nicheId];
  if (Boolean(compat) === false) return false;
  return compat.allowedArchetypes.includes(archetypeId);
}

/**
 * Retorna o arquétipo default para determinado nicho
 */
export function getDefaultArchetypeForNiche(nicheId: string): ArchetypeDefinition {
  const compat = NICHE_ARCHETYPE_MATRIX[nicheId];
  const defId = compat?.defaultArchetype || 'A01';
  return CANONICAL_ARCHETYPES[defId] || CANONICAL_ARCHETYPES.A01;
}

/**
 * Resolve o arquétipo canônico seguro
 */
export function resolveArchetype(
  nicheId: string,
  requestedArchetypeId?: string | null
): string {
  if (requestedArchetypeId && isArchetypeAllowedForNiche(nicheId, requestedArchetypeId)) {
    return requestedArchetypeId;
  }
  return getDefaultArchetypeForNiche(nicheId).id;
}
