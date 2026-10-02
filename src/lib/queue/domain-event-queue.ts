/**
 * domain-event-queue.ts — Motor de Fila Assíncrona e Outbox de Eventos de Domínio
 *
 * Implementa o padrão Transactional Outbox com resiliência a falhas,
 * controle de estado, retries com backoff exponencial e Dead-Letter Queue (DLQ).
 *
 * Invariantes: M01, M08, M09, M13 | Contrato: SPEC-S21-S22
 */

export type EventQueueStatus = "pending" | "processing" | "delivered" | "failed" | "dead_letter";

export interface QueuedEventPayload {
  eventName: string;
  entityType: string;
  entityId: string;
  storeId?: string | null;
  customerId?: string | null;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  maxAttempts?: number;
}

export interface QueuedEvent extends QueuedEventPayload {
  id: string;
  status: EventQueueStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  scheduledFor: number; // Timestamp em ms
  createdAt: number;
  processedAt?: number;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  delivered: number;
  deadLetter: number;
}

// Fila em memória (Thread-safe no escopo do worker/runtime)
const eventQueue = new Map<string, QueuedEvent>();

/**
 * Gera um ID único e determinístico para o evento enfileirado.
 */
function generateEventId(payload: QueuedEventPayload, timestamp: number): string {
  const seed = `${payload.eventName}_${payload.entityType}_${payload.entityId}_${timestamp}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return `evt_${Math.abs(hash).toString(16).padStart(8, "0")}_${timestamp.toString(36)}`;
}

/**
 * Enfileira um evento de domínio no motor outbox.
 */
export function enqueueDomainEvent(payload: QueuedEventPayload): QueuedEvent {
  const now = Date.now();
  const id = generateEventId(payload, now);
  const queued: QueuedEvent = {
    ...payload,
    id,
    status: "pending",
    attempts: 0,
    maxAttempts: payload.maxAttempts || 3,
    scheduledFor: now,
    createdAt: now,
  };

  eventQueue.set(id, queued);
  return queued;
}

/**
 * Recupera o próximo lote de eventos prontos para execução (`scheduledFor <= now`).
 */
export function getNextPendingBatch(batchSize = 20, now = Date.now()): QueuedEvent[] {
  const batch: QueuedEvent[] = [];

  for (const event of eventQueue.values()) {
    if (batch.length >= batchSize) break;
    if (event.status === "pending" && event.scheduledFor <= now) {
      event.status = "processing";
      batch.push(event);
    }
  }

  return batch;
}

/**
 * Marca um evento como entregue com sucesso.
 */
export function markEventDelivered(id: string, now = Date.now()): boolean {
  const event = eventQueue.get(id);
  if (!event) return false;

  event.status = "delivered";
  event.processedAt = now;
  return true;
}

/**
 * Registra falha de processamento de um evento.
 * Caso exceda `maxAttempts`, transiciona para `dead_letter`.
 * Caso contrário, reagenda com backoff exponencial: `now + (2 ^ attempts) * 1000ms`.
 */
export function markEventFailed(id: string, errorMessage: string, now = Date.now()): EventQueueStatus {
  const event = eventQueue.get(id);
  if (!event) return "failed";

  event.attempts += 1;
  event.lastError = errorMessage;

  if (event.attempts >= event.maxAttempts) {
    event.status = "dead_letter";
    event.processedAt = now;
    return "dead_letter";
  }

  // Backoff exponencial: 1s, 2s, 4s...
  const delayMs = Math.pow(2, event.attempts) * 1000;
  event.scheduledFor = now + delayMs;
  event.status = "pending";
  return "pending";
}

/**
 * Recupera todos os eventos retidos na Dead-Letter Queue (DLQ).
 */
export function getDeadLetterQueue(): QueuedEvent[] {
  const dlq: QueuedEvent[] = [];
  for (const event of eventQueue.values()) {
    if (event.status === "dead_letter") {
      dlq.push({ ...event });
    }
  }
  return dlq;
}

/**
 * Reenfileira manualmente um evento retido na Dead-Letter Queue para reprocessamento.
 */
export function retryDeadLetterEvent(id: string, now = Date.now()): boolean {
  const event = eventQueue.get(id);
  if (!event || event.status !== "dead_letter") return false;

  event.status = "pending";
  event.scheduledFor = now;
  event.attempts = 0;
  delete event.lastError;
  return true;
}

/**
 * Estatísticas operacionais da fila em tempo real.
 */
export function getQueueStats(): QueueStats {
  const stats: QueueStats = {
    total: eventQueue.size,
    pending: 0,
    processing: 0,
    delivered: 0,
    deadLetter: 0,
  };

  for (const event of eventQueue.values()) {
    if (event.status === "pending") stats.pending++;
    else if (event.status === "processing") stats.processing++;
    else if (event.status === "delivered") stats.delivered++;
    else if (event.status === "dead_letter") stats.deadLetter++;
  }

  return stats;
}

/**
 * Limpa todos os eventos da fila (apenas para testes unitários).
 */
export function resetEventQueue(): void {
  eventQueue.clear();
}
