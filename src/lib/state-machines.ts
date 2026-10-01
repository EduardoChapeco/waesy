/**
 * state-machines.ts — Máquinas de Estado Canônicas (Waesy Enterprise Core)
 *
 * Elimina status soltos e transições inválidas na UI, no BFF Server Functions, no MCP e na IA.
 * Garante invariantes estritas: transições unidirecionais, terminalidade e regras de negócio.
 *
 * Invariantes: M01, M08, M09, M13 | Checks: C26, C38 | Prompts: P32, P36
 */

export type StateMachineEntity =
  | "lead"
  | "proposal"
  | "trip"
  | "departure"
  | "contract"
  | "order"
  | "financial"
  | "ticket";

export interface StateTransitionRule {
  from: string;
  to: string[];
  description: string;
  allowedRoles?: string[];
  terminal?: boolean;
}

export interface EntityStateMachine {
  entity: StateMachineEntity;
  initialStatus: string;
  terminalStatuses: string[];
  transitions: Record<string, string[]>;
  labels: Record<string, string>;
  colors: Record<string, string>;
}

export const STATE_MACHINES: Record<StateMachineEntity, EntityStateMachine> = {
  // ── 1. LEADS & CRM ──
  lead: {
    entity: "lead",
    initialStatus: "new",
    terminalStatuses: ["won", "lost", "archived"],
    transitions: {
      new: ["qualifying", "contacted", "lost"],
      qualifying: ["proposal_sent", "disqualified", "lost"],
      contacted: ["qualifying", "proposal_sent", "lost"],
      proposal_sent: ["negotiating", "won", "lost"],
      negotiating: ["proposal_sent", "won", "lost"],
      won: ["archived"],
      lost: ["new", "archived"],
      disqualified: ["archived"],
      archived: ["new"],
    },
    labels: {
      new: "Novo Lead",
      qualifying: "Em Qualificação",
      contacted: "Contatado",
      proposal_sent: "Proposta Enviada",
      negotiating: "Em Negociação",
      won: "Ganho / Fechado",
      lost: "Perdido",
      disqualified: "Desqualificado",
      archived: "Arquivado",
    },
    colors: {
      new: "#94a3b8",
      qualifying: "#38bdf8",
      contacted: "#818cf8",
      proposal_sent: "#f59e0b",
      negotiating: "#ec4899",
      won: "#10b981",
      lost: "#ef4444",
      disqualified: "#64748b",
      archived: "#475569",
    },
  },

  // ── 2. PROPOSTAS & COTAÇÕES ──
  proposal: {
    entity: "proposal",
    initialStatus: "draft",
    terminalStatuses: ["accepted", "declined", "expired"],
    transitions: {
      draft: ["sent", "cancelled"],
      sent: ["viewed", "accepted", "declined", "expired", "draft"],
      viewed: ["accepted", "declined", "expired", "draft"],
      accepted: [],
      declined: ["draft"],
      expired: ["draft"],
      cancelled: [],
    },
    labels: {
      draft: "Rascunho",
      sent: "Enviada",
      viewed: "Visualizada pelo Cliente",
      accepted: "Aceita / Aprovada",
      declined: "Recusada",
      expired: "Expirada",
      cancelled: "Cancelada",
    },
    colors: {
      draft: "#94a3b8",
      sent: "#38bdf8",
      viewed: "#818cf8",
      accepted: "#10b981",
      declined: "#ef4444",
      expired: "#64748b",
      cancelled: "#ef4444",
    },
  },

  // ── 3. VIAGENS & RESERVAS ──
  trip: {
    entity: "trip",
    initialStatus: "confirmed",
    terminalStatuses: ["completed", "cancelled"],
    transitions: {
      confirmed: ["in_progress", "cancelled"],
      in_progress: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    },
    labels: {
      confirmed: "Confirmada",
      in_progress: "Em Viagem",
      completed: "Concluída / Retornou",
      cancelled: "Cancelada",
    },
    colors: {
      confirmed: "#38bdf8",
      in_progress: "#818cf8",
      completed: "#10b981",
      cancelled: "#ef4444",
    },
  },

  // ── 4. EMBARQUES & VOOS ──
  departure: {
    entity: "departure",
    initialStatus: "planned",
    terminalStatuses: ["completed", "cancelled"],
    transitions: {
      planned: ["briefing_sent", "checkin_open", "cancelled"],
      briefing_sent: ["checkin_open", "boarding", "cancelled"],
      checkin_open: ["boarding", "cancelled"],
      boarding: ["departed", "cancelled"],
      departed: ["completed"],
      completed: [],
      cancelled: [],
    },
    labels: {
      planned: "Planejado",
      briefing_sent: "Briefing Enviado",
      checkin_open: "Check-in Aberto",
      boarding: "Embarcando",
      departed: "Em Trânsito / Voando",
      completed: "Embarque Finalizado",
      cancelled: "Cancelado",
    },
    colors: {
      planned: "#94a3b8",
      briefing_sent: "#38bdf8",
      checkin_open: "#f59e0b",
      boarding: "#ec4899",
      departed: "#818cf8",
      completed: "#10b981",
      cancelled: "#ef4444",
    },
  },

  // ── 5. CONTRATOS ──
  contract: {
    entity: "contract",
    initialStatus: "draft",
    terminalStatuses: ["signed", "rejected", "cancelled"],
    transitions: {
      draft: ["sent", "cancelled"],
      sent: ["viewed", "signed", "rejected", "expired", "draft"],
      viewed: ["signed", "rejected", "expired", "draft"],
      signed: [],
      rejected: ["draft"],
      expired: ["draft"],
      cancelled: [],
    },
    labels: {
      draft: "Minuta",
      sent: "Enviado para Assinatura",
      viewed: "Em Análise",
      signed: "Assinado e Válido",
      rejected: "Recusado",
      expired: "Prazo Expirado",
      cancelled: "Cancelado",
    },
    colors: {
      draft: "#94a3b8",
      sent: "#38bdf8",
      viewed: "#f59e0b",
      signed: "#10b981",
      rejected: "#ef4444",
      expired: "#64748b",
      cancelled: "#ef4444",
    },
  },

  // ── 6. PEDIDOS & VENDAS ──
  order: {
    entity: "order",
    initialStatus: "pending",
    terminalStatuses: ["delivered", "cancelled", "refunded"],
    transitions: {
      pending: ["confirmed", "cancelled"],
      confirmed: ["in_preparation", "ready", "shipped", "cancelled"],
      in_preparation: ["ready", "cancelled"],
      ready: ["shipped", "delivered", "cancelled"],
      shipped: ["delivered", "cancelled"],
      delivered: ["refunded"],
      cancelled: [],
      refunded: [],
    },
    labels: {
      pending: "Pendente",
      confirmed: "Aprovado",
      in_preparation: "Em Preparação / Separação",
      ready: "Pronto",
      shipped: "Em Trânsito / Rota",
      delivered: "Entregue",
      cancelled: "Cancelado",
      refunded: "Reembolsado",
    },
    colors: {
      pending: "#f59e0b",
      confirmed: "#38bdf8",
      in_preparation: "#818cf8",
      ready: "#06b6d4",
      shipped: "#a855f7",
      delivered: "#10b981",
      cancelled: "#ef4444",
      refunded: "#64748b",
    },
  },

  // ── 7. LANÇAMENTOS FINANCEIROS / CONTAS ──
  financial: {
    entity: "financial",
    initialStatus: "pending",
    terminalStatuses: ["paid", "cancelled"],
    transitions: {
      pending: ["paid", "overdue", "cancelled"],
      overdue: ["paid", "cancelled"],
      paid: ["refunded"],
      cancelled: [],
      refunded: [],
    },
    labels: {
      pending: "A Vencer",
      overdue: "Vencido",
      paid: "Liquidado / Pago",
      cancelled: "Cancelado",
      refunded: "Estornado",
    },
    colors: {
      pending: "#f59e0b",
      overdue: "#ef4444",
      paid: "#10b981",
      cancelled: "#64748b",
      refunded: "#a855f7",
    },
  },

  // ── 8. SUPORTE & TICKETS ──
  ticket: {
    entity: "ticket",
    initialStatus: "open",
    terminalStatuses: ["closed"],
    transitions: {
      open: ["in_progress", "pending_customer", "resolved", "closed"],
      in_progress: ["pending_customer", "resolved", "closed"],
      pending_customer: ["in_progress", "resolved", "closed"],
      resolved: ["closed", "in_progress"],
      closed: ["open"],
    },
    labels: {
      open: "Aberto",
      in_progress: "Em Atendimento",
      pending_customer: "Aguardando Resposta do Cliente",
      resolved: "Resolvido",
      closed: "Encerrado",
    },
    colors: {
      open: "#f59e0b",
      in_progress: "#38bdf8",
      pending_customer: "#818cf8",
      resolved: "#10b981",
      closed: "#64748b",
    },
  },
};

/**
 * Valida se uma transição de estado é permitida para uma determinada entidade.
 */
export function canTransition(entity: StateMachineEntity, currentStatus: string, nextStatus: string): boolean {
  if (currentStatus === nextStatus) return true;
  const sm = STATE_MACHINES[entity];
  if (!sm) return false;

  const allowed = sm.transitions[currentStatus];
  return Array.isArray(allowed) && allowed.includes(nextStatus);
}

/**
 * Lança erro assertivo de negócio caso uma transição seja inválida.
 * Utilizado por Server Functions, Handlers e Ferramentas MCP.
 */
export function assertValidTransition(
  entity: StateMachineEntity,
  currentStatus: string,
  nextStatus: string,
  entityId?: string
): void {
  if (!canTransition(entity, currentStatus, nextStatus)) {
    const sm = STATE_MACHINES[entity];
    const fromLabel = sm?.labels[currentStatus] || currentStatus;
    const toLabel = sm?.labels[nextStatus] || nextStatus;
    const idHint = entityId ? ` (ID: ${entityId})` : "";

    throw new Error(
      `Transição de estado inválida para ${entity}${idHint}: impossível alterar de "${fromLabel}" para "${toLabel}".`
    );
  }
}

/**
 * Retorna lista de status para os quais a entidade pode transicionar a partir do estado atual.
 */
export function getAllowedTransitions(entity: StateMachineEntity, currentStatus: string): string[] {
  const sm = STATE_MACHINES[entity];
  return sm?.transitions[currentStatus] || [];
}

/**
 * Retorna os metadados visuais de status (label e cor) para UI e relatórios.
 */
export function getStatusMeta(entity: StateMachineEntity, status: string): { label: string; color: string } {
  const sm = STATE_MACHINES[entity];
  return {
    label: sm?.labels[status] || status,
    color: sm?.colors[status] || "#94a3b8",
  };
}
