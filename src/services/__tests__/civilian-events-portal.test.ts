import { describe, it, expect } from "vitest";
import {
  civilianEventSchema,
  softDeleteCivilianEvent,
  archiveCivilianEvent,
  duplicateCivilianEvent,
  fastLeadRsvpSchema,
} from "../events.functions";
import { signTicketPayload, verifyTicketPayload } from "@/lib/ticket-crypto";

describe("Portal Civil de Eventos & Bilheteria Nominal (AGENTS.md GAP-02 a GAP-05 | Microfases 1.2 a 1.5)", () => {
  it("valida contrato do schema de eventos civis (título e data obrigatórios)", () => {
    const validData = {
      title: "Workshop de Fotografia Urbana",
      event_date: "2026-11-20T19:00:00Z",
      category: "palestras",
      visibility: "link_only" as const,
      is_free: true,
      story_media_url: "https://storage.waesy.com/story-1.jpg",
      story_media_type: "image" as const,
      story_auto_open: true,
    };

    const parsed = civilianEventSchema.parse(validData);
    expect(parsed.title).toBe("Workshop de Fotografia Urbana");
    expect(parsed.visibility).toBe("link_only");
    expect(parsed.story_auto_open).toBe(true);

    // Rejeita dados sem título
    expect(() => civilianEventSchema.parse({ event_date: "2026-11-20T19:00:00Z" })).toThrow();
    // Rejeita dados sem data
    expect(() => civilianEventSchema.parse({ title: "Título sem data" })).toThrow();
  });

  it("valida contrato de payload para softDeleteCivilianEvent (UUID obrigatório)", async () => {
    await expect(
      (softDeleteCivilianEvent as any)({ data: { eventId: "not-a-uuid" } })
    ).rejects.toThrow();
  });

  it("valida contrato de payload para archiveCivilianEvent (UUID obrigatório)", async () => {
    await expect(
      (archiveCivilianEvent as any)({ data: { eventId: "not-a-uuid", archive: true } })
    ).rejects.toThrow();
  });

  it("valida contrato de payload para duplicateCivilianEvent (UUID obrigatório)", async () => {
    await expect(
      (duplicateCivilianEvent as any)({ data: { eventId: "not-a-uuid" } })
    ).rejects.toThrow();
  });

  it("garante contrato de dados do fastLeadRsvpSchema para emissão nominal rápida (GAP-05)", () => {
    const validLead = {
      eventId: "123e4567-e89b-12d3-a456-426614174000",
      attendeeName: "Maria Eduarda Silveira",
      attendeeEmail: "maria.eduarda@email.com",
      attendeePhone: "49999998888",
    };

    const parsed = fastLeadRsvpSchema.parse(validLead);
    expect(parsed.attendeeName).toBe("Maria Eduarda Silveira");
    expect(parsed.attendeeEmail).toBe("maria.eduarda@email.com");

    // Rejeita nome muito curto (< 2 caracteres)
    expect(() =>
      fastLeadRsvpSchema.parse({ ...validLead, attendeeName: "M" })
    ).toThrow();

    // Rejeita e-mail inválido
    expect(() =>
      fastLeadRsvpSchema.parse({ ...validLead, attendeeEmail: "invalido" })
    ).toThrow();
  });

  it("comprova integridade criptográfica WCTS-1 para ingressos emitidos sem senha prévia", () => {
    const ticketId = "99999999-8888-7777-6666-555555555555";
    const eventId = "11111111-2222-3333-4444-555555555555";
    const lotId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const ownerProfileId = `guest_${ticketId}`;

    const signed = signTicketPayload({
      ticketId,
      eventId,
      lotId,
      ownerProfileId,
    });

    expect(signed.humanCode).toBeDefined();
    expect(signed.signature).toBeDefined();
    expect(signed.qrPayload).toContain("v1:TKT:");

    // Validação de assinatura com verifyTicketPayload
    const verification = verifyTicketPayload(signed.qrPayload, {
      eventId,
      lotId,
      ownerProfileId,
    });

    expect(verification.isValid).toBe(true);

    // Validação negativa: adultera eventId
    const tamperedVerification = verifyTicketPayload(signed.qrPayload, {
      eventId: "00000000-0000-0000-0000-000000000000",
      lotId,
      ownerProfileId,
    });

    expect(tamperedVerification.isValid).toBe(false);
  });
});
