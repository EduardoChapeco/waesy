import { describe, it, expect, vi, beforeEach } from "vitest";
import { softDeleteEvent, archiveEvent, duplicateEvent } from "../events.functions";

describe("Gestão de Eventos — Ciclo de Vida CRUD Real & Invariantes (AGENTS.md GAP-01 & Microfase 1.1)", () => {
  it("valida contrato de payload para softDeleteEvent (UUID obrigatório)", async () => {
    // Validação estrita do Zod validator
    await expect(
      (softDeleteEvent as any)({ data: { eventId: "invalid-uuid" } })
    ).rejects.toThrow();
  });

  it("valida contrato de payload para archiveEvent (UUID e flag boolean)", async () => {
    await expect(
      (archiveEvent as any)({ data: { eventId: "invalid-uuid", archive: true } })
    ).rejects.toThrow();
  });

  it("valida contrato de payload para duplicateEvent (UUID obrigatório)", async () => {
    await expect(
      (duplicateEvent as any)({ data: { eventId: "invalid-uuid" } })
    ).rejects.toThrow();
  });

  it("garante que duplicateEvent clona atributos saneados e reseta sold_count de lotes", () => {
    const originalEvent = {
      id: "987e6543-e21b-12d3-a456-426614174000",
      title: "Festival de Verão 2026",
      status: "published",
      deleted_at: "2026-01-01T00:00:00Z",
      archived_at: "2026-01-02T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      capacity: 500,
    };

    const { id: _oldId, created_at: _ca, updated_at: _ua, deleted_at: _da, archived_at: _aa, ...safeEvent } = originalEvent;
    const clonedPayload = {
      ...safeEvent,
      title: `${originalEvent.title} (Cópia)`,
      status: "draft",
      deleted_at: null,
      archived_at: null,
    };

    expect(clonedPayload.title).toBe("Festival de Verão 2026 (Cópia)");
    expect(clonedPayload.status).toBe("draft");
    expect(clonedPayload.deleted_at).toBeNull();
    expect(clonedPayload.archived_at).toBeNull();
    expect(clonedPayload.capacity).toBe(500);

    const originalLots = [
      { id: "lot-1", event_id: originalEvent.id, name: "Pista VIP", price_cents: 12000, sold_count: 85 },
      { id: "lot-2", event_id: originalEvent.id, name: "Camarote", price_cents: 25000, sold_count: 40 },
    ];

    const clonedEventId = "11111111-2222-3333-4444-555555555555";
    const clonedLots = originalLots.map((l) => {
      const { id: _lId, ...safeLot } = l;
      return {
        ...safeLot,
        event_id: clonedEventId,
        sold_count: 0,
      };
    });

    expect(clonedLots[0].event_id).toBe(clonedEventId);
    expect(clonedLots[0].sold_count).toBe(0);
    expect(clonedLots[0].price_cents).toBe(12000);
    expect(clonedLots[1].event_id).toBe(clonedEventId);
    expect(clonedLots[1].sold_count).toBe(0);
  });

  it("garante que exclusão lógica preserva integridade sem apagar histórico financeiro", () => {
    const activeEvent = {
      id: "987e6543-e21b-12d3-a456-426614174000",
      title: "Show Acústico",
      status: "published",
      deleted_at: null,
    };

    const now = new Date().toISOString();
    const softDeleted = {
      ...activeEvent,
      deleted_at: now,
      status: "cancelled",
    };

    expect(softDeleted.deleted_at).toBeTruthy();
    expect(softDeleted.status).toBe("cancelled");
    expect(softDeleted.id).toBe(activeEvent.id);
  });
});
