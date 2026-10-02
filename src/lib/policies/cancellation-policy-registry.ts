/**
 * cancellation-policy-registry.ts — Dono Único de Políticas de Cancelamento, Reembolso e FAQ (R26)
 *
 * Este arquivo é a Fonte Única da Verdade para:
 * - Tipos de política de cancelamento por nicho
 * - Regras de reembolso por janela temporal
 * - Estrutura canônica de FAQ por arquétipo
 *
 * Regra R26 (Operação Verdade Única): NENHUM outro arquivo deve declarar
 * CANCELLATION_POLICY_REGISTRY, REFUND_RULES ou buildFaqItems.
 *
 * Imports proibidos de UI — este módulo é utilitário puro.
 */

// ── Tipos Canônicos ──────────────────────────────────────────────────────────

export type CancellationWindowHours = 0 | 6 | 12 | 24 | 48 | 72 | 168;

export interface CancellationTier {
  windowHours: CancellationWindowHours;
  refundPercent: number; // 0-100
  label: string;
  description: string;
}

export interface CancellationPolicy {
  id: string;
  name: string;
  nicheId: string;
  archetypeIds: string[];
  tiers: CancellationTier[];
  isNonRefundable: boolean;
  noticeText: string;
}

export interface RefundRule {
  nicheId: string;
  archetypeId: string | null; // null = aplica a todos os arquétipos do nicho
  windowDays: number;
  refundPercent: number;
  conditions: string[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'payment' | 'cancellation' | 'delivery' | 'product' | 'general';
  nicheId: string | null; // null = FAQ genérico
}

// ── Políticas Canônicas por Nicho ────────────────────────────────────────────

export const CANCELLATION_POLICY_REGISTRY: Record<string, CancellationPolicy> = {
  // Turismo: Regras rigorosas de antecedência (padrão do setor)
  turismo_standard: {
    id: 'turismo_standard',
    name: 'Política Padrão de Turismo',
    nicheId: 'turismo',
    archetypeIds: ['A07', 'A08', 'A10'],
    isNonRefundable: false,
    noticeText:
      'Cancelamentos devem ser solicitados por escrito via canal oficial. Reembolsos processados em até 10 dias úteis.',
    tiers: [
      { windowHours: 168, refundPercent: 100, label: 'Cancelamento grátis', description: 'Até 7 dias antes' },
      { windowHours: 72, refundPercent: 75, label: 'Cancelamento parcial', description: '3 a 7 dias antes' },
      { windowHours: 24, refundPercent: 50, label: 'Cancelamento tardio', description: '1 a 3 dias antes' },
      { windowHours: 0, refundPercent: 0, label: 'Sem reembolso', description: 'Menos de 24h ou no-show' },
    ],
  },

  turismo_flex: {
    id: 'turismo_flex',
    name: 'Política Flexível de Turismo',
    nicheId: 'turismo',
    archetypeIds: ['A07', 'A08'],
    isNonRefundable: false,
    noticeText: 'Permite remarcação gratuita uma vez. Reembolso total até 48h antes.',
    tiers: [
      { windowHours: 48, refundPercent: 100, label: 'Reembolso total', description: 'Até 48h antes' },
      { windowHours: 24, refundPercent: 50, label: 'Crédito na conta', description: '24 a 48h antes' },
      { windowHours: 0, refundPercent: 0, label: 'Sem reembolso', description: 'Menos de 24h' },
    ],
  },

  // Varejo: Segue CDC Art. 49 (arrependimento em 7 dias)
  varejo_cdc: {
    id: 'varejo_cdc',
    name: 'Política CDC - Direito de Arrependimento',
    nicheId: 'varejo',
    archetypeIds: ['A01', 'A02', 'A03', 'A04'],
    isNonRefundable: false,
    noticeText:
      'Conforme CDC Art. 49, o consumidor tem 7 dias para arrependimento. Produto deve ser devolvido em condições originais.',
    tiers: [
      { windowHours: 168, refundPercent: 100, label: 'Arrependimento CDC', description: 'Até 7 dias após recebimento' },
      { windowHours: 0, refundPercent: 0, label: 'Fora do prazo', description: 'Após 7 dias (somente defeito)' },
    ],
  },

  // Serviços: Reembolso proporcional ao trabalho executado
  servicos_proporcional: {
    id: 'servicos_proporcional',
    name: 'Política Proporcional de Serviços',
    nicheId: 'servicos',
    archetypeIds: ['A08', 'A09', 'A15'],
    isNonRefundable: false,
    noticeText: 'Reembolso proporcional ao percentual de serviço não executado.',
    tiers: [
      { windowHours: 24, refundPercent: 100, label: 'Antes do início', description: 'Cancelamento com 24h de antecedência' },
      { windowHours: 0, refundPercent: 50, label: 'Proporcional', description: 'Após início — valor do trabalho executado' },
    ],
  },

  // Imóveis: Conforme contrato e CRECI
  imoveis_contrato: {
    id: 'imoveis_contrato',
    name: 'Política Contratual de Imóveis',
    nicheId: 'imoveis',
    archetypeIds: ['A10', 'A11', 'A12'],
    isNonRefundable: false,
    noticeText: 'Conforme contrato firmado. Multas e retenções seguem cláusulas contratuais e legislação vigente.',
    tiers: [
      { windowHours: 720, refundPercent: 100, label: 'Desistência antecipada', description: 'Até 30 dias' },
      { windowHours: 168, refundPercent: 50, label: 'Multa parcial', description: '7 a 30 dias' },
      { windowHours: 0, refundPercent: 0, label: 'Multa total', description: 'Menos de 7 dias' },
    ],
  },
};

// ── Regras de Reembolso por Nicho ───────────────────────────────────────────

export const REFUND_RULES: RefundRule[] = [
  {
    nicheId: 'turismo',
    archetypeId: null,
    windowDays: 7,
    refundPercent: 100,
    conditions: ['Pagamento confirmado', 'Cancelamento por escrito', 'Dentro da janela de reembolso'],
  },
  {
    nicheId: 'varejo',
    archetypeId: 'A01',
    windowDays: 7,
    refundPercent: 100,
    conditions: ['CDC Art. 49', 'Produto sem uso', 'Embalagem original'],
  },
  {
    nicheId: 'servicos',
    archetypeId: 'A09',
    windowDays: 1,
    refundPercent: 100,
    conditions: ['Serviço não iniciado', 'Cancelamento com 24h de antecedência'],
  },
];

// ── FAQ Canônico por Nicho ──────────────────────────────────────────────────

export const FAQ_REGISTRY: FaqItem[] = [
  // FAQ Geral
  {
    id: 'faq-gen-01',
    question: 'Como solicitar reembolso?',
    answer:
      'Acesse Minha Conta > Pedidos, localize o pedido e selecione "Solicitar reembolso". Você receberá uma confirmação em até 2 horas úteis.',
    category: 'payment',
    nicheId: null,
  },
  {
    id: 'faq-gen-02',
    question: 'Em quanto tempo o reembolso é processado?',
    answer: 'Reembolsos no cartão levam de 5 a 10 dias úteis. No Pix, até 3 horas úteis após aprovação.',
    category: 'payment',
    nicheId: null,
  },
  // FAQ Turismo
  {
    id: 'faq-tur-01',
    question: 'Posso remarcar minha viagem?',
    answer: 'Sim, remarcações gratuitas são permitidas até 48h antes da data de embarque, sujeitas a disponibilidade.',
    category: 'cancellation',
    nicheId: 'turismo',
  },
  {
    id: 'faq-tur-02',
    question: 'O que está incluso no pacote?',
    answer:
      'Os itens inclusos e exclusos estão listados na seção "O que está incluso" da página do pacote. Leia com atenção antes de reservar.',
    category: 'product',
    nicheId: 'turismo',
  },
  // FAQ Varejo
  {
    id: 'faq-var-01',
    question: 'Posso devolver um produto?',
    answer:
      'Sim. Pelo CDC Art. 49, você tem 7 dias após o recebimento para desistir da compra. O produto deve estar sem uso e na embalagem original.',
    category: 'cancellation',
    nicheId: 'varejo',
  },
  // FAQ Serviços
  {
    id: 'faq-ser-01',
    question: 'Como cancelar um serviço agendado?',
    answer:
      'Cancele pelo app com pelo menos 24h de antecedência para reembolso integral. Cancelamentos tardios seguem a política proporcional.',
    category: 'cancellation',
    nicheId: 'servicos',
  },
];

// ── Funções Utilitárias ──────────────────────────────────────────────────────

/**
 * Retorna a política de cancelamento para um nicho e arquétipo.
 * DONO ÚNICO desta lógica (R26).
 */
export function getCancellationPolicy(nicheId: string, archetypeId: string): CancellationPolicy | null {
  const entry = Object.values(CANCELLATION_POLICY_REGISTRY).find(
    (p) => p.nicheId === nicheId && (p.archetypeIds.includes(archetypeId) || p.archetypeIds.length === 0),
  );
  return entry ?? null;
}

/**
 * Retorna o percentual de reembolso dado o nicho, arquétipo e janela em horas.
 * DONO ÚNICO desta lógica (R26).
 */
export function calcRefundPercent(nicheId: string, archetypeId: string, hoursUntilEvent: number): number {
  const policy = getCancellationPolicy(nicheId, archetypeId);
  if (Boolean(policy) === false || Boolean(policy?.tiers) === false) return 0;
  const tier = policy!.tiers.find((t) => hoursUntilEvent >= t.windowHours);
  return tier?.refundPercent ?? 0;
}

/**
 * Retorna os itens de FAQ filtrados por nicho.
 * DONO ÚNICO desta lógica (R26) — buildFaqItems é declarado apenas aqui.
 */
export function buildFaqItems(nicheId: string | null): FaqItem[] {
  return FAQ_REGISTRY.filter((item) => item.nicheId === null || item.nicheId === nicheId);
}

/**
 * Kill List R27 — Campos duplicados que devem ser migrados para este arquivo.
 * Mapa: { arquivo de origem → campo que deve ser movido para este módulo }
 */
export const KILL_LIST_R27 = [
  {
    sourceFile: 'src/routes/_store.conta.classificados.novo.tsx',
    duplicatedPattern: 'cancellation_policy|refund_policy',
    action: 'MIGRATE_TO_getCancellationPolicy',
    status: 'PENDING',
    deadline: '2026-11-01',
  },
  {
    sourceFile: 'src/routes/workspace.turismo.hoteis.tsx',
    duplicatedPattern: 'cancellation_policy',
    action: 'MIGRATE_TO_getCancellationPolicy',
    status: 'PENDING',
    deadline: '2026-11-01',
  },
  {
    sourceFile: 'src/routes/workspace.configuracoes.index.tsx',
    duplicatedPattern: 'refund_policy',
    action: 'MIGRATE_TO_calcRefundPercent',
    status: 'PENDING',
    deadline: '2026-11-01',
  },
] as const;
