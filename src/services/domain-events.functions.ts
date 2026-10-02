/**
 * domain-events.functions.ts — Barramento Canônico de Eventos de Domínio e Timeline Unificada
 *
 * Unifica eventos de todos os módulos (CRM, Cotações, Propostas, Reservas, Contratos,
 * Embarques, Vouchers, Financeiro, Suporte) em uma timeline auditável e unificada por entidade.
 *
 * Invariantes: M01, M08, M09, M13 | Checks: C26, C38 | Prompts: P32, P36
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, requireAdmin } from "@/lib/server-access";
import { logAuditAction } from "./audit.functions";
import {
  enqueueDomainEvent,
  getQueueStats,
  getDeadLetterQueue,
  retryDeadLetterEvent,
  markEventDelivered,
  markEventFailed,
} from "@/lib/queue/domain-event-queue";

export type DomainEventName =
  | "lead.created"
  | "lead.stage_changed"
  | "lead.won"
  | "lead.lost"
  | "quote.created"
  | "quote.sent"
  | "proposal.created"
  | "proposal.sent"
  | "proposal.accepted"
  | "proposal.declined"
  | "reservation.created"
  | "reservation.confirmed"
  | "reservation.cancelled"
  | "contract.created"
  | "contract.sent"
  | "contract.signed"
  | "flight.updated"
  | "boarding.briefing_sent"
  | "boarding.started"
  | "boarding.completed"
  | "voucher.generated"
  | "voucher.viewed"
  | "order.created"
  | "order.status_changed"
  | "financial.entry_created"
  | "financial.paid"
  | "ticket.opened"
  | "ticket.reply_sent"
  | "ticket.resolved"
  | "ticket.closed";

export interface DomainEventPayload {
  eventName: DomainEventName;
  entityType: string;
  entityId: string;
  storeId?: string;
  customerId?: string | null;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UnifiedTimelineEntry {
  id: string;
  eventName: DomainEventName;
  entityType: string;
  entityId: string;
  title: string;
  description: string;
  actorName: string;
  timestamp: string;
  metadata: Record<string, any>;
}

/**
 * Publica um evento de domínio canônico, persistindo no log de auditoria
 * e disponibilizando para a timeline multi-módulo da entidade e outbox assíncrono.
 */
export async function publishDomainEvent(payload: DomainEventPayload) {
  const supabase = getServerClient();
  const identity = await getServerIdentity().catch(() => null);

  const effectiveStoreId = payload.storeId || identity?.store_id;
  if (!effectiveStoreId) return null;

  // 1. Enfileiramento desacoplado no motor Outbox
  const queued = enqueueDomainEvent({
    eventName: payload.eventName,
    entityType: payload.entityType,
    entityId: payload.entityId,
    storeId: effectiveStoreId,
    customerId: payload.customerId,
    title: payload.title,
    description: payload.description,
    metadata: payload.metadata,
  });

  const eventRecord = {
    store_id: effectiveStoreId,
    user_id: identity?.id || null,
    action: payload.eventName,
    entity_type: payload.entityType,
    entity_id: payload.entityId,
    payload_snapshot: {
      title: payload.title,
      description: payload.description || "",
      customer_id: payload.customerId || null,
      metadata: payload.metadata || {},
      outbox_id: queued.id,
      created_at: new Date().toISOString(),
    },
  };

  const { data, error } = await supabase.from("audit_logs").insert(eventRecord).select().single();
  if (error) {
    markEventFailed(queued.id, error.message);
    console.warn("[domain-events] Aviso ao persistir evento:", error.message);
  } else {
    markEventDelivered(queued.id);
  }

  return data;
}

export const publishDomainEventFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      eventName: z.string(),
      entityType: z.string(),
      entityId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      customerId: z.string().optional().nullable(),
      metadata: z.record(z.any()).optional(),
    })
  )
  .handler(async ({ data }) => {
    return publishDomainEvent({
      eventName: data.eventName as DomainEventName,
      entityType: data.entityType,
      entityId: data.entityId,
      title: data.title,
      description: data.description,
      customerId: data.customerId,
      metadata: data.metadata,
    });
  });

/**
 * Retorna a timeline unificada de eventos de uma entidade (Lead, Cliente, Reserva, Viagem, Ordem).
 * Agrega eventos de múltiplos módulos em ordem cronológica reversa.
 */
export const getEntityUnifiedTimeline = createServerFn({ method: "GET" })
  .validator(
    z.object({
      entityType: z.string(),
      entityId: z.string(),
      customerId: z.string().optional().nullable(),
      limit: z.number().int().min(1).max(100).default(50),
    })
  )
  .handler(async ({ data: { entityType, entityId, customerId, limit } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    // Busca eventos na tabela audit_logs filtrados por loja e entidade
    let query = supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, payload_snapshot, created_at, profiles:user_id(full_name)")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (customerId) {
      // Se houver customerId, busca eventos vinculados à entidade ou ao cliente
      query = query.or(`entity_id.eq.${entityId},payload_snapshot->>customer_id.eq.${customerId}`);
    } else {
      query = query.eq("entity_id", entityId);
    }

    const { data: logs, error } = await query;
    if (error || !logs) {
      return [];
    }

    const timeline: UnifiedTimelineEntry[] = logs.map((log: any) => {
      const snap = log.payload_snapshot || {};
      const actorName = log.profiles?.full_name || "Sistema";

      return {
        id: log.id,
        eventName: log.action as DomainEventName,
        entityType: log.entity_type,
        entityId: log.entity_id,
        title: snap.title || log.action,
        description: snap.description || "",
        actorName,
        timestamp: log.created_at,
        metadata: snap.metadata || {},
      };
    });

    return timeline;
  });

/**
 * Retorna métricas operacionais em tempo real da fila outbox de eventos.
 */
export const getDomainEventQueueStatsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);
    return getQueueStats();
  });

/**
 * Retorna eventos retidos na Dead-Letter Queue para governança e auditoria.
 */
export const getDomainEventDeadLetterQueueFn = createServerFn({ method: "GET" })
  .handler(async () => {
    await requireAdmin();
    return getDeadLetterQueue();
  });

/**
 * Reenfileira manualmente um evento da Dead-Letter Queue.
 */
export const retryDomainEventDeadLetterFn = createServerFn({ method: "POST" })
  .validator(z.object({ eventId: z.string().min(1) }))
  .handler(async ({ data: { eventId } }) => {
    await requireAdmin();
    const success = retryDeadLetterEvent(eventId);
    return { success, eventId };
  });
