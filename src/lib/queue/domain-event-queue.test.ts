import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueueDomainEvent,
  getNextPendingBatch,
  markEventDelivered,
  markEventFailed,
  getDeadLetterQueue,
  retryDeadLetterEvent,
  getQueueStats,
  resetEventQueue,
} from "./domain-event-queue";

describe("domain-event-queue", () => {
  beforeEach(() => {
    resetEventQueue();
  });

  it("enfileira eventos e gera identificador único", () => {
    const event = enqueueDomainEvent({
      eventName: "order.created",
      entityType: "order",
      entityId: "ord_1001",
      title: "Novo pedido recebido",
      storeId: "store_abc",
    });

    expect(event.id).toBeDefined();
    expect(event.status).toBe("pending");
    expect(event.attempts).toBe(0);
    expect(event.maxAttempts).toBe(3);

    const stats = getQueueStats();
    expect(stats.total).toBe(1);
    expect(stats.pending).toBe(1);
  });

  it("resgata lote de eventos pendentes e marca como processing", () => {
    enqueueDomainEvent({
      eventName: "financial.paid",
      entityType: "payment",
      entityId: "pay_2002",
      title: "Pagamento confirmado",
    });

    const batch = getNextPendingBatch(10);
    expect(batch.length).toBe(1);
    expect(batch[0].status).toBe("processing");

    const stats = getQueueStats();
    expect(stats.processing).toBe(1);
    expect(stats.pending).toBe(0);
  });

  it("marca evento como entregue com sucesso", () => {
    const event = enqueueDomainEvent({
      eventName: "voucher.generated",
      entityType: "voucher",
      entityId: "vch_3003",
      title: "Voucher de viagem emitido",
    });

    const marked = markEventDelivered(event.id);
    expect(marked).toBe(true);

    const stats = getQueueStats();
    expect(stats.delivered).toBe(1);
  });

  it("aplica backoff exponencial e transiciona para dead-letter ao exceder tentativas", () => {
    const now = 1000000;
    const event = enqueueDomainEvent({
      eventName: "webhook.dispatch",
      entityType: "webhook",
      entityId: "wh_4004",
      title: "Envio de webhook externo",
      maxAttempts: 2,
    });

    // Tentativa 1: falha
    const status1 = markEventFailed(event.id, "HTTP 500 Internal Error", now);
    expect(status1).toBe("pending");

    // Deve reagendar para now + 2000ms (2^1 * 1000)
    expect(getNextPendingBatch(10, now).length).toBe(0); // Ainda em backoff
    expect(getNextPendingBatch(10, now + 2500).length).toBe(1); // Pronto após delay

    // Tentativa 2: falha final -> DLQ
    const status2 = markEventFailed(event.id, "HTTP 504 Gateway Timeout", now + 2500);
    expect(status2).toBe("dead_letter");

    const dlq = getDeadLetterQueue();
    expect(dlq.length).toBe(1);
    expect(dlq[0].id).toBe(event.id);
    expect(dlq[0].lastError).toBe("HTTP 504 Gateway Timeout");

    // Reenfileiramento manual da DLQ
    const retried = retryDeadLetterEvent(event.id, now + 3000);
    expect(retried).toBe(true);
    expect(getQueueStats().pending).toBe(1);
    expect(getQueueStats().deadLetter).toBe(0);
  });
});
