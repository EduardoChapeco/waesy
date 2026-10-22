import { describe, it, expect } from "vitest";
import {
  signTicketPayload,
  verifyTicketPayload,
  type TicketSignInput,
} from "@/lib/ticket-crypto";

describe("Waesy Cryptographic Ticket Standard (WCTS-1)", () => {
  const sampleInput: TicketSignInput = {
    ticketId: "8f7b2c1a-4d3e-4b2a-9f1e-1a2b3c4d5e6f",
    eventId: "11111111-2222-3333-4444-555555555555",
    lotId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    ownerProfileId: "99999999-8888-7777-6666-555555555555",
    issuedAt: 1774000000,
  };

  it("should generate a signed payload with HMAC signature and human code", () => {
    const signed = signTicketPayload(sampleInput);

    expect(signed.ticketId).toBe(sampleInput.ticketId);
    expect(signed.issuedAt).toBe(1774000000);
    expect(signed.signature).toHaveLength(64); // SHA256 hex string
    expect(signed.qrPayload).toBe(
      `v1:TKT:${sampleInput.ticketId}:1774000000:${signed.signature}`
    );
    const charRange = "[0-9A-Z]";
    expect(signed.humanCode).toMatch(
      new RegExp(`^W-TKT-${charRange}{8}-${charRange}{2}$`)
    );
  });

  it("should verify a valid ticket payload successfully with context", () => {
    const signed = signTicketPayload(sampleInput);

    const result = verifyTicketPayload(signed.qrPayload, {
      eventId: sampleInput.eventId,
      lotId: sampleInput.lotId,
      ownerProfileId: sampleInput.ownerProfileId,
    });

    expect(result.isValid).toBe(true);
    expect(result.ticketId).toBe(sampleInput.ticketId);
    expect(result.issuedAt).toBe(1774000000);
    expect(result.errorCode).toBeUndefined();
  });

  it("should reject a tampered payload when signature does not match", () => {
    const signed = signTicketPayload(sampleInput);
    const tamperedPayload = signed.qrPayload.replace(
      sampleInput.ticketId,
      "99999999-4d3e-4b2a-9f1e-1a2b3c4d5e6f"
    );

    const result = verifyTicketPayload(tamperedPayload, {
      eventId: sampleInput.eventId,
      lotId: sampleInput.lotId,
      ownerProfileId: sampleInput.ownerProfileId,
    });

    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("INVALID_SIGNATURE");
  });

  it("should handle legacy ticket formats gracefully", () => {
    const legacyUuid = "8f7b2c1a-4d3e-4b2a-9f1e-1a2b3c4d5e6f";
    const result = verifyTicketPayload(legacyUuid);

    expect(result.isValid).toBe(true);
    expect(result.isLegacy).toBe(true);
    expect(result.ticketId).toBe(legacyUuid);
  });

  it("should reject malformed input", () => {
    const result = verifyTicketPayload("invalid-format-string");
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("MALFORMED_PAYLOAD");
  });
});
