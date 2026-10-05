import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "./webhook-signature";

const body = JSON.stringify({ event: "paid", id: "evt-1" });
const secret = "test-webhook-secret";

function signedHeaders(timestamp = Math.floor(Date.now() / 1000)) {
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return new Headers({
    "x-waesy-signature": `sha256=${signature}`,
    "x-waesy-timestamp": String(timestamp),
  });
}

describe("verifyWebhookSignature", () => {
  it("falha fechado quando o segredo não está configurado", () => {
    expect(verifyWebhookSignature(body, signedHeaders(), undefined)).toEqual({
      ok: false,
      reason: "Webhook secret is not configured",
    });
  });

  it("aceita uma assinatura HMAC válida dentro da janela", () => {
    expect(verifyWebhookSignature(body, signedHeaders(), secret)).toEqual({ ok: true });
  });

  it("rejeita payload adulterado", () => {
    expect(verifyWebhookSignature(JSON.stringify({ event: "refunded" }), signedHeaders(), secret).ok).toBe(false);
  });

  it("rejeita replay fora da janela", () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 301;
    expect(verifyWebhookSignature(body, signedHeaders(oldTimestamp), secret).ok).toBe(false);
  });
});
