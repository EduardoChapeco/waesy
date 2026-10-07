import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { verifyWebhookSignature } from "@/lib/webhook-signature";

const root = process.cwd();
const metaHandler = fs.readFileSync(path.join(root, "src/routes/api.webhooks.whatsapp.ts"), "utf8");
const providerHandler = fs.readFileSync(path.join(root, "src/services/whatsapp-provider-webhook.server.ts"), "utf8");

function signed(rawBody: string, secret: string, timestamp: number) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

describe("WhatsApp inbound — W11", () => {
  it("rejeita assinatura ausente e replay fora da janela", () => {
    const body = JSON.stringify({ event: "messages.upsert" });
    const old = Math.floor(Date.now() / 1000) - 301;
    expect(verifyWebhookSignature(body, new Headers(), "secret").ok).toBe(false);
    expect(verifyWebhookSignature(body, new Headers({ "x-waesy-signature": signed(body, "secret", old), "x-waesy-timestamp": String(old) }), "secret").ok).toBe(false);
  });

  it("aceita assinatura HMAC válida dentro da janela", () => {
    const body = JSON.stringify({ event: "messages.upsert" });
    const timestamp = Math.floor(Date.now() / 1000);
    expect(verifyWebhookSignature(body, new Headers({ "x-waesy-signature": signed(body, "secret", timestamp), "x-waesy-timestamp": String(timestamp) }), "secret").ok).toBe(true);
  });

  it("não executa efeitos quando upsert idempotente retorna duplicata concorrente", () => {
    expect(metaHandler).toContain("if (!inboxMessage || inboxMessage.status === \"processed\"");
    expect(providerHandler).toContain("if (!providerEvent || providerEvent.processing_status === \"processed\"");
    expect(providerHandler).toContain("if (!event || event.processing_status === \"processed\"");
    expect(metaHandler).toContain("dispatchWhatsAppInboundFlows");
    expect(providerHandler).toContain("dispatchWhatsAppInboundFlows");
  });

  it("mantém inbox/outbox sem acesso direto de clientes", () => {
    const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261006000002_whatsapp_inbox_delivery_and_outbox.sql"), "utf8");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("whatsapp_webhook_inbox_deny_client");
    expect(migration).toContain("whatsapp_outbox_deny_client");
    expect(migration).toContain("UNIQUE (store_id, idempotency_key)");
  });

  it("não regride status de campanha quando callback chega fora de ordem", () => {
    expect(providerHandler).toContain("campaignDeliveryRank");
    expect(providerHandler).toContain("campaignDeliveryRank(delivery.deliveryStatus) < campaignDeliveryRank(recipient.status)");
    expect(providerHandler).toContain('.eq("id", recipient.id).eq("store_id", storeId)');
  });
});
