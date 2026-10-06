import { describe, expect, it } from "vitest";
import { whatsappCampaignInputSchema, whatsappFlowInputSchema } from "./whatsapp-automation.functions";

describe("WhatsApp automation contracts", () => {
  it("accepts a versionable inbound flow with trigger, action and edge", () => {
    const result = whatsappFlowInputSchema.safeParse({
      title: "Triagem comercial",
      nodes: [
        { id: "trigger", type: "trigger", title: "Mensagem recebida", config: { event: "whatsapp_inbound" } },
        { id: "action", type: "action", title: "Enviar texto", config: { action: "send_text", text: "Olá" } },
      ],
      edges: [{ id: "e1", source: "trigger", target: "action" }],
      entryConditions: { consent_status: "opted_in" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a flow without executable nodes", () => {
    const result = whatsappFlowInputSchema.safeParse({ title: "Inválido", nodes: [], edges: [] });
    expect(result.success).toBe(false);
  });

  it("requires a valid instance and preserves the consent audience filter", () => {
    const result = whatsappCampaignInputSchema.safeParse({
      name: "Campanha oficial",
      channelInstanceId: "00000000-0000-0000-0000-000000000001",
      messageType: "template",
      templateName: "promocao_ferias",
      templateLanguage: "pt_BR",
      audienceFilter: { consent_status: "opted_in" },
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.audienceFilter).toEqual({ consent_status: "opted_in" });
  });

  it("rejects malformed campaign instance identifiers", () => {
    const result = whatsappCampaignInputSchema.safeParse({ name: "Campanha", channelInstanceId: "not-a-uuid", messageType: "template", templateName: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects an official template campaign without an approved template name", () => {
    const result = whatsappCampaignInputSchema.safeParse({ name: "Campanha", channelInstanceId: "00000000-0000-0000-0000-000000000001", messageType: "template" });
    expect(result.success).toBe(false);
  });
});
