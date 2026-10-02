/**
 * listing-state-machine.ts — Máquina de Estados e Ciclo de Vida do Anúncio (F08)
 * 
 * Regras:
 * - Transições permitidas rigorosamente mapeadas.
 * - Nenhuma transição inválida permitida.
 * - Expiração automática para Classificados com registro de trilha.
 * - Workspace opera com controle manual do lojista (sem expiração forçada por padrão).
 */

import type {
  ListingOrigin,
  ListingStatus,
  UnifiedListing,
  ListingModerationEvent,
} from "@/types/unified-ad-engine";

export interface ListingStateTransitionRule {
  from: ListingStatus[];
  to: ListingStatus;
  allowedOrigins: ListingOrigin[];
  requiresReason?: boolean;
}

export const VALID_TRANSITIONS: ListingStateTransitionRule[] = [
  // De Rascunho para Revisão ou Publicado
  {
    from: ["draft"],
    to: "review",
    allowedOrigins: ["classified", "workspace"],
  },
  {
    from: ["draft", "review"],
    to: "published",
    allowedOrigins: ["classified", "workspace"],
  },
  // De Publicado para Pausado, Oculto, Vendido, Expirado ou Arquivado
  {
    from: ["published"],
    to: "paused",
    allowedOrigins: ["classified", "workspace"],
  },
  {
    from: ["published"],
    to: "hidden",
    allowedOrigins: ["classified", "workspace"],
  },
  {
    from: ["published", "paused"],
    to: "sold",
    allowedOrigins: ["classified", "workspace"],
  },
  {
    from: ["published"],
    to: "expired",
    allowedOrigins: ["classified"], // Apenas classificados sofrem expiração automática
  },
  {
    from: ["published", "paused", "hidden", "expired", "sold"],
    to: "archived",
    allowedOrigins: ["classified", "workspace"],
  },
  // Reativação
  {
    from: ["paused", "hidden"],
    to: "published",
    allowedOrigins: ["classified", "workspace"],
  },
  {
    from: ["expired"],
    to: "published", // Renovação de anúncio
    allowedOrigins: ["classified"],
  },
  {
    from: ["archived"],
    to: "draft", // Restaurar para rascunho
    allowedOrigins: ["classified", "workspace"],
  },
];

export interface TransitionResult {
  success: boolean;
  error?: string;
  previousStatus?: ListingStatus;
  newStatus?: ListingStatus;
  updatedExpiresAt?: string | null;
  auditEvent?: ListingModerationEvent;
}

/**
 * Valida e calcula a transição de estado da listagem
 */
export function transitionListingState(
  listing: Pick<UnifiedListing, "status" | "origin" | "expires_at">,
  targetStatus: ListingStatus,
  actor: { id: string; role: string },
  reason?: string
): TransitionResult {
  const currentStatus = listing.status;

  if (currentStatus === targetStatus) {
    return {
      success: true,
      previousStatus: currentStatus,
      newStatus: targetStatus,
    };
  }

  const validRule = VALID_TRANSITIONS.find(
    (rule) =>
      rule.to === targetStatus &&
      rule.from.includes(currentStatus) &&
      rule.allowedOrigins.includes(listing.origin)
  );

  if (!validRule) {
    return {
      success: false,
      error: `Transição inválida de '${currentStatus}' para '${targetStatus}' no contexto de origem '${listing.origin}'.`,
    };
  }

  if (validRule.requiresReason && !reason?.trim()) {
    return {
      success: false,
      error: `A transição para '${targetStatus}' exige um motivo documentado.`,
    };
  }

  // Se renovando ou publicando anúncio de classificado, recalcular prazo de expiração (30 dias por padrão)
  let updatedExpiresAt = listing.expires_at;
  if (listing.origin === "classified" && targetStatus === "published") {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);
    updatedExpiresAt = expirationDate.toISOString();
  }

  const auditEvent: ListingModerationEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actor_id: actor.id,
    actor_role: actor.role,
    action: targetStatus === "hidden" ? "hide" : targetStatus === "review" ? "flag" : "approve",
    reason: reason || `Transição de estado para ${targetStatus}`,
  };

  return {
    success: true,
    previousStatus: currentStatus,
    newStatus: targetStatus,
    updatedExpiresAt,
    auditEvent,
  };
}

/**
 * Identifica se um anúncio deve expirar com base na data limite (F08 Job)
 */
export function shouldExpireClassified(listing: {
  origin: ListingOrigin;
  status: ListingStatus;
  expires_at?: string | null;
}): boolean {
  if (listing.origin !== "classified" || listing.status !== "published" || !listing.expires_at) {
    return false;
  }

  const now = new Date().getTime();
  const expiresAt = new Date(listing.expires_at).getTime();
  return now >= expiresAt;
}
