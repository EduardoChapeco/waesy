import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/crypto-vault.server", () => ({ decryptSecret: (value: string) => value, encryptSecret: (value: string) => value }));

import { redactWhatsAppWebhookPayload } from "@/lib/conversation-crypto.server";
import { sendWithWhatsAppAdapter, type OutboundInstance } from "./whatsapp-outbound-adapters.server";

const instance: OutboundInstance = {
  id: "00000000-0000-4000-8000-000000000001",
  store_id: "00000000-0000-4000-8000-000000000002",
  provider: "evolution_api",
  instance_key: "wave8-test",
  external_instance_id: null,
  phone_number_id: null,
  public_config: {},
  secret_payload_encrypted: JSON.stringify({ api_key: "test-key", base_url: "https://provider.invalid" }),
};

describe("WhatsApp Wave 8 security and failure injection", () => {
  it("remove conteúdo de mensagem e segredos mesmo em objetos aninhados", () => {
    const sanitized = redactWhatsAppWebhookPayload({
      key: { id: "msg-1", remoteJid: "5511999999999@s.whatsapp.net" },
      message: { conversation: "conteúdo privado", imageMessage: { url: "https://media.invalid/private" } },
      credentials: { access_token: "token-real", apiKey: "api-real" },
    });
    expect(JSON.stringify(sanitized)).not.toContain("conteúdo privado");
    expect(JSON.stringify(sanitized)).not.toContain("https://media.invalid/private");
    expect(JSON.stringify(sanitized)).not.toContain("token-real");
    expect(JSON.stringify(sanitized)).not.toContain("api-real");
    expect(sanitized.key).toEqual({ id: "msg-1", remoteJid: "5511999999999@s.whatsapp.net" });
  });

  it.each([408, 409, 425, 429, 500, 502, 503])("classifica HTTP %s como retryable", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "provider unavailable" } }), { status })));
    await expect(sendWithWhatsAppAdapter(instance, { recipientPhone: "+5511999999999", messageType: "text", payload: { text: "teste" } })).rejects.toMatchObject({ retryable: true, httpStatus: status });
  });

  it.each([400, 401, 403, 404, 422])("classifica HTTP %s como permanente", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "invalid request" } }), { status })));
    await expect(sendWithWhatsAppAdapter(instance, { recipientPhone: "+5511999999999", messageType: "text", payload: { text: "teste" } })).rejects.toMatchObject({ retryable: false, httpStatus: status });
  });
});
