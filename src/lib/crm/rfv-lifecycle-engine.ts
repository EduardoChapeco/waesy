/**
 * rfv-lifecycle-engine.ts — Máquina de Estados RFV Multinicho & 4 Alavancas de Receita
 *
 * 8 Estados Canônicos:
 * 1. `unknown`        — Visitante / contato sem qualificação nem interação comercial
 * 2. `lead`           — Demonstrou interesse inicial, ainda sem orçamento/proposta ativa
 * 3. `opportunity`    — Em negociação ativa ou com proposta/cotação em aberto
 * 4. `non_client`     — Recebeu proposta/orçamento mas não fechou (perdido/arquivado sem compra)
 * 5. `first_purchase` — Realizou exatamente 1 compra ativa dentro da janela do nicho
 * 6. `recurring`      — Realizou 2+ compras e está ativo dentro da janela de recompra do nicho
 * 7. `ex_client`      — Já comprou no passado, mas ultrapassou a janela de inatividade (churn) do nicho
 * 8. `promoter`       — Cliente fiel / promotor (NPS >= 9 ou indicação convertida)
 */

export type RfvLifecycleStage =
  | "unknown"
  | "lead"
  | "opportunity"
  | "non_client"
  | "first_purchase"
  | "recurring"
  | "ex_client"
  | "promoter";

export type RevenueLever =
  | "acquisition"
  | "conversion"
  | "recurrence_upsell"
  | "referral_advocacy";

export interface RfvEvaluationInput {
  nicheId?: string | null;
  purchasesCount: number;
  totalSpentCents: number;
  daysSinceLastPurchase: number | null;
  openOpportunitiesCount: number;
  lostOpportunitiesCount: number;
  hasAnyLeadOrContact: boolean;
  lastNpsScore?: number | null;
  referralsConvertedCount?: number;
}

export interface RfvEvaluationResult {
  stage: RfvLifecycleStage;
  score: number;
  labelPt: string;
  lever: RevenueLever;
  churnThresholdDays: number;
  nextActionHint: string;
}

const NICHE_CHURN_WINDOW_DAYS: Record<string, number> = {
  tourism: 540,      // 18 meses para viagens
  turis: 540,
  real_estate: 1095, // 36 meses para imóveis
  automotive: 365,   // 12 meses para oficinas/veículos
  gastronomy: 45,    // 45 dias para restaurantes/delivery
  wider: 45,
  market: 30,        // 30 dias para supermercado
  mercado: 30,
  retail: 120,       // 120 dias para lojas/varejo
  store: 120,
  events: 180,       // 180 dias para eventos
  eventio: 180,
  legal: 365,        // 12 meses para jurídico
  juris: 365,
  default: 180,
};

const STAGE_LABELS_PT: Record<RfvLifecycleStage, string> = {
  unknown: "Desconhecido",
  lead: "Lead em Triagem",
  opportunity: "Oportunidade Ativa",
  non_client: "Não-Cliente (Recuperação)",
  first_purchase: "Primeira Compra",
  recurring: "Cliente Recorrente",
  ex_client: "Ex-Cliente (Inativo)",
  promoter: "Promotor da Marca",
};

export function getChurnThresholdDaysForNiche(nicheId?: string | null): number {
  const key = String(nicheId || "default").trim().toLowerCase();
  return NICHE_CHURN_WINDOW_DAYS[key] || NICHE_CHURN_WINDOW_DAYS.default;
}

export function evaluateCustomerRfvLifecycle(input: RfvEvaluationInput): RfvEvaluationResult {
  const churnThresholdDays = getChurnThresholdDaysForNiche(input.nicheId);
  const purchases = Math.max(0, Number(input.purchasesCount || 0));
  const spentCents = Math.max(0, Number(input.totalSpentCents || 0));
  const referrals = Math.max(0, Number(input.referralsConvertedCount || 0));
  const nps = typeof input.lastNpsScore === "number" ? input.lastNpsScore : null;
  const daysSince = typeof input.daysSinceLastPurchase === "number" && input.daysSinceLastPurchase >= 0
    ? input.daysSinceLastPurchase
    : null;

  // 1. Clientes que já compraram (purchases >= 1)
  if (purchases >= 1) {
    const isChurned = daysSince !== null && daysSince > churnThresholdDays;

    // Promotor: indicou alguém que converteu OU (NPS >= 9 e não está em churn)
    if (!isChurned && (referrals >= 1 || (nps !== null && nps >= 9))) {
      return {
        stage: "promoter",
        score: Math.min(100, 88 + Math.min(12, referrals * 4 + (purchases > 1 ? 4 : 0))),
        labelPt: STAGE_LABELS_PT.promoter,
        lever: "referral_advocacy",
        churnThresholdDays,
        nextActionHint: "Ativar carteira de indicação (Member Get Member) e ofertas VIP de pré-lançamento.",
      };
    }

    if (isChurned) {
      return {
        stage: "ex_client",
        score: 35,
        labelPt: STAGE_LABELS_PT.ex_client,
        lever: "recurrence_upsell",
        churnThresholdDays,
        nextActionHint: `Sem compras há ${daysSince} dias (limite ${churnThresholdDays}d). Disparar campanha de reativação com condição especial.`,
      };
    }

    if (purchases >= 2) {
      const ticketBonus = spentCents >= 500_000 ? 10 : spentCents >= 100_000 ? 5 : 0;
      return {
        stage: "recurring",
        score: Math.min(95, 75 + Math.min(10, purchases * 2) + ticketBonus),
        labelPt: STAGE_LABELS_PT.recurring,
        lever: "recurrence_upsell",
        churnThresholdDays,
        nextActionHint: "Convidar para avaliação NPS / Review Booster para converter em Promotor.",
      };
    }

    return {
      stage: "first_purchase",
      score: 65,
      labelPt: STAGE_LABELS_PT.first_purchase,
      lever: "recurrence_upsell",
      churnThresholdDays,
      nextActionHint: "Garantir pós-venda impecável e incentivar segunda compra com benefício de retorno.",
    };
  }

  // 2. Nunca comprou (purchases === 0)
  if (input.openOpportunitiesCount > 0) {
    return {
      stage: "opportunity",
      score: 52,
      labelPt: STAGE_LABELS_PT.opportunity,
      lever: "conversion",
      churnThresholdDays,
      nextActionHint: "Em cotação/proposta ativa: executar cadência anti-vácuo e quebra de objeções.",
    };
  }

  if (input.lostOpportunitiesCount > 0) {
    return {
      stage: "non_client",
      score: 28,
      labelPt: STAGE_LABELS_PT.non_client,
      lever: "conversion",
      churnThresholdDays,
      nextActionHint: "Recebeu proposta no passado e não fechou: acionar Matchmaker quando surgir oportunidade compatível.",
    };
  }

  if (input.hasAnyLeadOrContact) {
    return {
      stage: "lead",
      score: 20,
      labelPt: STAGE_LABELS_PT.lead,
      lever: "acquisition",
      churnThresholdDays,
      nextActionHint: "Completar sondagem consultiva (4 As) para gerar primeira proposta.",
    };
  }

  return {
    stage: "unknown",
    score: 5,
    labelPt: STAGE_LABELS_PT.unknown,
    lever: "acquisition",
    churnThresholdDays,
    nextActionHint: "Capturar interesse inicial via formulário, OmniMatch ou triagem WhatsApp.",
  };
}
