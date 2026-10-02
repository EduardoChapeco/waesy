/**
 * niche-semantic-library.ts — Biblioteca Semântica Canônica por Nicho (R35)
 *
 * Fonte Única da Verdade para todos os textos de interface por nicho:
 * - Labels de campos, ações e estados
 * - Mensagens de erro específicas por nicho
 * - Rótulos de unidades de venda
 * - Textos de CTAs e estados vazios
 *
 * Regra R35 (Operação Verdade Única):
 * PROIBIDO hardcode de texto de nicho em componentes.
 * PROIBIDO if (nicho === "turismo") { label = "Pacote" } espalhado pelo código.
 *
 * Uso:
 *   import { getNicheLabel, getNicheEmptyState } from '@/lib/ad-engine/niche-semantic-library';
 *   const label = getNicheLabel('turismo', 'product_singular'); // → "Pacote"
 */

// ── Tipos ────────────────────────────────────────────────────────────────────

export type NicheLabelKey =
  | 'product_singular'
  | 'product_plural'
  | 'product_new'
  | 'product_edit'
  | 'price_label'
  | 'price_per_unit'
  | 'seller_label'
  | 'buyer_label'
  | 'purchase_cta'
  | 'reserve_cta'
  | 'contact_cta'
  | 'schedule_cta'
  | 'capacity_label'
  | 'stock_label'
  | 'date_label'
  | 'location_label'
  | 'duration_label'
  | 'empty_state_title'
  | 'empty_state_description'
  | 'filter_label'
  | 'search_placeholder';

export interface NicheSemanticConfig {
  labels: Record<NicheLabelKey, string>;
  units: Record<string, string>; // selling unit id → label
  errorMessages: {
    stockOut: string;
    reservationFull: string;
    invalidDate: string;
    missingRequired: string;
  };
}

// ── Biblioteca por Nicho ─────────────────────────────────────────────────────

export const NICHE_SEMANTIC_LIBRARY: Record<string, NicheSemanticConfig> = {
  turismo: {
    labels: {
      product_singular: 'Pacote',
      product_plural: 'Pacotes',
      product_new: 'Novo pacote',
      product_edit: 'Editar pacote',
      price_label: 'Valor por pessoa',
      price_per_unit: 'por pessoa',
      seller_label: 'Operadora',
      buyer_label: 'Viajante',
      purchase_cta: 'Reservar pacote',
      reserve_cta: 'Confirmar reserva',
      contact_cta: 'Falar com a operadora',
      schedule_cta: 'Ver datas disponíveis',
      capacity_label: 'Vagas disponíveis',
      stock_label: 'Vagas',
      date_label: 'Data de embarque',
      location_label: 'Destino',
      duration_label: 'Duração da viagem',
      empty_state_title: 'Nenhum pacote disponível',
      empty_state_description: 'No momento não há pacotes disponíveis neste destino.',
      filter_label: 'Filtrar destinos',
      search_placeholder: 'Buscar destinos, pacotes...',
    },
    units: {
      pessoa: 'por pessoa',
      casal: 'por casal',
      grupo: 'por grupo',
      'diária': 'por diária',
    },
    errorMessages: {
      stockOut: 'Vagas esgotadas para esta data.',
      reservationFull: 'Capacidade máxima atingida para este embarque.',
      invalidDate: 'Data de embarque inválida ou indisponível.',
      missingRequired: 'Preencha o destino, data e número de viajantes.',
    },
  },

  varejo: {
    labels: {
      product_singular: 'Produto',
      product_plural: 'Produtos',
      product_new: 'Novo produto',
      product_edit: 'Editar produto',
      price_label: 'Preço',
      price_per_unit: 'por unidade',
      seller_label: 'Loja',
      buyer_label: 'Cliente',
      purchase_cta: 'Adicionar ao carrinho',
      reserve_cta: 'Confirmar pedido',
      contact_cta: 'Falar com a loja',
      schedule_cta: 'Agendar retirada',
      capacity_label: 'Estoque disponível',
      stock_label: 'Unidades',
      date_label: 'Data de entrega',
      location_label: 'Local de entrega',
      duration_label: 'Prazo de entrega',
      empty_state_title: 'Nenhum produto encontrado',
      empty_state_description: 'Tente ajustar os filtros ou buscar outro termo.',
      filter_label: 'Filtrar produtos',
      search_placeholder: 'Buscar produtos...',
    },
    units: {
      un: 'por unidade',
      kg: 'por kg',
      g: 'por grama',
      cx: 'por caixa',
      pct: 'por pacote',
    },
    errorMessages: {
      stockOut: 'Produto fora de estoque.',
      reservationFull: 'Limite de compra por cliente atingido.',
      invalidDate: 'Data de entrega indisponível.',
      missingRequired: 'Selecione a variação desejada.',
    },
  },

  mercado: {
    labels: {
      product_singular: 'Item',
      product_plural: 'Itens',
      product_new: 'Novo item',
      product_edit: 'Editar item',
      price_label: 'Preço',
      price_per_unit: 'por kg',
      seller_label: 'Mercado',
      buyer_label: 'Consumidor',
      purchase_cta: 'Adicionar',
      reserve_cta: 'Confirmar compra',
      contact_cta: 'Falar com o mercado',
      schedule_cta: 'Agendar entrega',
      capacity_label: 'Disponível em estoque',
      stock_label: 'Quantidade',
      date_label: 'Data de validade',
      location_label: 'Endereço de entrega',
      duration_label: 'Prazo de entrega',
      empty_state_title: 'Nenhum item disponível',
      empty_state_description: 'Este produto está temporariamente indisponível.',
      filter_label: 'Filtrar por departamento',
      search_placeholder: 'Buscar no mercado...',
    },
    units: {
      un: 'por unidade',
      kg: 'por kg',
      g: 'por grama',
      cx: 'por caixa',
      fd: 'por fardo',
    },
    errorMessages: {
      stockOut: 'Item indisponível no momento.',
      reservationFull: 'Limite de unidades por pedido atingido.',
      invalidDate: 'Data de entrega fora do raio de atendimento.',
      missingRequired: 'Informe a quantidade desejada.',
    },
  },

  servicos: {
    labels: {
      product_singular: 'Serviço',
      product_plural: 'Serviços',
      product_new: 'Novo serviço',
      product_edit: 'Editar serviço',
      price_label: 'Valor do serviço',
      price_per_unit: 'por hora',
      seller_label: 'Prestador',
      buyer_label: 'Contratante',
      purchase_cta: 'Contratar',
      reserve_cta: 'Confirmar agendamento',
      contact_cta: 'Falar com o prestador',
      schedule_cta: 'Ver horários disponíveis',
      capacity_label: 'Agenda disponível',
      stock_label: 'Slots disponíveis',
      date_label: 'Data do serviço',
      location_label: 'Local de atendimento',
      duration_label: 'Duração estimada',
      empty_state_title: 'Nenhum serviço disponível',
      empty_state_description: 'Este prestador não possui horários disponíveis.',
      filter_label: 'Filtrar serviços',
      search_placeholder: 'Buscar serviços e especialistas...',
    },
    units: {
      hora: 'por hora',
      sessão: 'por sessão',
      visita: 'por visita',
      projeto: 'por projeto',
    },
    errorMessages: {
      stockOut: 'Sem horários disponíveis para esta data.',
      reservationFull: 'Agenda completa para o período selecionado.',
      invalidDate: 'Data ou horário indisponível.',
      missingRequired: 'Selecione a data, horário e tipo de serviço.',
    },
  },

  imoveis: {
    labels: {
      product_singular: 'Imóvel',
      product_plural: 'Imóveis',
      product_new: 'Novo imóvel',
      product_edit: 'Editar imóvel',
      price_label: 'Valor',
      price_per_unit: 'por mês',
      seller_label: 'Imobiliária / Proprietário',
      buyer_label: 'Interessado',
      purchase_cta: 'Manifestar interesse',
      reserve_cta: 'Confirmar proposta',
      contact_cta: 'Agendar visita',
      schedule_cta: 'Ver disponibilidade',
      capacity_label: 'Disponível',
      stock_label: 'Unidades disponíveis',
      date_label: 'Data de disponibilidade',
      location_label: 'Localização',
      duration_label: 'Prazo de locação',
      empty_state_title: 'Nenhum imóvel encontrado',
      empty_state_description: 'Ajuste os filtros de busca para ampliar os resultados.',
      filter_label: 'Filtrar imóveis',
      search_placeholder: 'Buscar imóveis, bairros, cidades...',
    },
    units: {
      mes: 'por mês',
      ano: 'por ano',
      unidade: 'por unidade',
    },
    errorMessages: {
      stockOut: 'Imóvel indisponível no momento.',
      reservationFull: 'Proposta em análise para este imóvel.',
      invalidDate: 'Data de disponibilidade fora do período desejado.',
      missingRequired: 'Informe o tipo, localização e período desejados.',
    },
  },
};

// ── Funções Utilitárias ──────────────────────────────────────────────────────

const DEFAULT_NICHE = 'varejo';

/**
 * Retorna o label para um nicho e chave semântica específicos.
 * DONO ÚNICO desta lógica (R35) — proibido duplicar em componentes.
 */
export function getNicheLabel(nicheId: string, key: NicheLabelKey): string {
  const config = NICHE_SEMANTIC_LIBRARY[nicheId] ?? NICHE_SEMANTIC_LIBRARY[DEFAULT_NICHE];
  return config.labels[key] ?? key;
}

/**
 * Retorna o label de unidade de venda para um nicho.
 */
export function getSellingUnitLabel(nicheId: string, unitId: string): string {
  const config = NICHE_SEMANTIC_LIBRARY[nicheId] ?? NICHE_SEMANTIC_LIBRARY[DEFAULT_NICHE];
  return config.units[unitId] ?? unitId;
}

/**
 * Retorna a mensagem de erro semântica para um nicho e tipo de erro.
 */
export function getNicheErrorMessage(
  nicheId: string,
  errorType: keyof NicheSemanticConfig['errorMessages'],
): string {
  const config = NICHE_SEMANTIC_LIBRARY[nicheId] ?? NICHE_SEMANTIC_LIBRARY[DEFAULT_NICHE];
  return config.errorMessages[errorType];
}

/**
 * Retorna a configuração completa de empty state para um nicho.
 */
export function getNicheEmptyState(nicheId: string): { title: string; description: string } {
  return {
    title: getNicheLabel(nicheId, 'empty_state_title'),
    description: getNicheLabel(nicheId, 'empty_state_description'),
  };
}

/**
 * Verifica se um nicho tem configuração semântica registrada.
 */
export function isNicheRegistered(nicheId: string): boolean {
  return Boolean(NICHE_SEMANTIC_LIBRARY[nicheId]);
}
