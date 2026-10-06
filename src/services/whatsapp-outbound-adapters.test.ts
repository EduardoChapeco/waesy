import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/crypto-vault.server", () => ({ decryptSecret: (value: string) => value }));

import { sendWithWhatsAppAdapter, type OutboundInstance } from "./whatsapp-outbound-adapters.server";

const baseInstance = (provider: OutboundInstance["provider"], secret: Record<string, unknown>, extra: Partial<OutboundInstance> = {}): OutboundInstance => ({
  id: "00000000-0000-4000-8000-000000000001",
  store_id: "00000000-0000-4000-8000-000000000002",
  provider,
  instance_key: "waesy-instance",
  external_instance_id: null,
  phone_number_id: null,
  public_config: {},
  secret_payload_encrypted: JSON.stringify(secret),
  ...extra,
});

describe("WhatsApp outbound adapters", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("envia texto pela Evolution com apikey, número sem + e key.id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ key: { id: "evo-123" }, status: "PENDING" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendWithWhatsAppAdapter(baseInstance("evolution_api", { api_key: "evo-secret", base_url: "https://evolution.example" }), { recipientPhone: "+5511999999999", messageType: "text", payload: { text: "Olá" } });
    expect(result.externalMessageId).toBe("evo-123");
    expect(fetchMock).toHaveBeenCalledWith("https://evolution.example/message/sendText/waesy-instance", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ apikey: "evo-secret" }), body: JSON.stringify({ number: "5511999999999", text: "Olá" }) }));
  });

  it("envia imagem pela Evolution em sendMedia com media URL e caption", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ key: { id: "evo-image-1" } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendWithWhatsAppAdapter(baseInstance("evolution_api", { api_key: "evo-secret", base_url: "https://evolution.example" }), { recipientPhone: "+5511999999999", messageType: "image", payload: { media_url: "https://cdn.example/photo.jpg", caption: "Veja" } });
    expect(fetchMock).toHaveBeenCalledWith("https://evolution.example/message/sendMedia/waesy-instance", expect.objectContaining({ body: JSON.stringify({ number: "5511999999999", mediatype: "image", media: "https://cdn.example/photo.jpg", caption: "Veja" }) }));
  });

  it("envia PTT pela Evolution no endpoint oficial de WhatsApp audio", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ key: { id: "evo-audio-1" } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendWithWhatsAppAdapter(baseInstance("evolution_api", { api_key: "evo-secret", base_url: "https://evolution.example" }), { recipientPhone: "+5511999999999", messageType: "audio", payload: { media_url: "https://cdn.example/voice.ogg", voice_note: true, encoding: true } });
    expect(fetchMock).toHaveBeenCalledWith("https://evolution.example/message/sendWhatsAppAudio/waesy-instance", expect.objectContaining({ body: JSON.stringify({ number: "5511999999999", audio: "https://cdn.example/voice.ogg", encoding: true }) }));
  });

  it("envia texto pela WaSender com Bearer e data.msgId", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { msgId: 987, status: "in_progress" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendWithWhatsAppAdapter(baseInstance("wasender_api", { api_key: "wasender-secret" }), { recipientPhone: "5511999999999", messageType: "text", payload: { text: "Olá" } });
    expect(result.externalMessageId).toBe("987");
    expect(fetchMock).toHaveBeenCalledWith("https://www.wasenderapi.com/api/send-message", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer wasender-secret" }), body: JSON.stringify({ to: "+5511999999999", text: "Olá" }) }));
  });

  it("envia documento pela WaSender com documentUrl e fileName", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { msgId: 988 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendWithWhatsAppAdapter(baseInstance("wasender_api", { api_key: "wasender-secret" }), { recipientPhone: "+5511999999999", messageType: "document", payload: { media_url: "https://cdn.example/report.pdf", file_name: "report.pdf", caption: "Relatório" } });
    expect(fetchMock).toHaveBeenCalledWith("https://www.wasenderapi.com/api/send-message", expect.objectContaining({ body: JSON.stringify({ to: "+5511999999999", documentUrl: "https://cdn.example/report.pdf", text: "Relatório", fileName: "report.pdf" }) }));
  });

  it("envia vídeo pela WaSender com videoUrl", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { msgId: 989 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendWithWhatsAppAdapter(baseInstance("wasender_api", { api_key: "wasender-secret" }), { recipientPhone: "+5511999999999", messageType: "video", payload: { media_url: "https://cdn.example/demo.mp4" } });
    expect(fetchMock).toHaveBeenCalledWith("https://www.wasenderapi.com/api/send-message", expect.objectContaining({ body: JSON.stringify({ to: "+5511999999999", videoUrl: "https://cdn.example/demo.mp4" }) }));
  });

  it("rejeita mídia sem URL ou data URI antes da chamada externa", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendWithWhatsAppAdapter(baseInstance("wasender_api", { api_key: "wasender-secret" }), { recipientPhone: "+5511999999999", messageType: "image", payload: {} })).rejects.toMatchObject({ code: "MISSING_MEDIA_SOURCE", retryable: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("não inventa adapter para providers sem contrato confirmado", async () => {
    await expect(sendWithWhatsAppAdapter(baseInstance("render_bridge", {}), { recipientPhone: "+5511999999999", messageType: "text", payload: { text: "Olá" } })).rejects.toMatchObject({ code: "UNSUPPORTED_PROVIDER", retryable: false });
  });
});
