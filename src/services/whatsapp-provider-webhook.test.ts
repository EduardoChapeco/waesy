import { describe, expect, it } from "vitest";
import {
  extractRevokedMessageIds,
  normalizeUnofficialDelivery,
  normalizeUnofficialIncomingMessage,
} from "./whatsapp-provider-webhook.server";

describe("WhatsApp unofficial webhook normalizers", () => {
  it("normaliza mensagem Evolution messages.upsert sem tratar envio próprio como inbound", () => {
    const body = { event: "messages.upsert", timestamp: 1709550600 };
    const message = normalizeUnofficialIncomingMessage("evolution_api", body, { key: { remoteJid: "5511999999999@s.whatsapp.net", fromMe: false, id: "evo-in-1" }, message: { conversation: "Olá Waesy" }, messageTimestamp: 1709550600, pushName: "Cliente" });
    expect(message).toMatchObject({ externalMessageId: "evo-in-1", phone: "+5511999999999", text: "Olá Waesy", messageType: "text", fromMe: false });
  });

  it("normaliza mensagem WaSender messages.received com data.messages objeto", () => {
    const body = { event: "messages.received", timestamp: 1709550600 };
    const message = normalizeUnofficialIncomingMessage("wasender_api", body, { key: { remoteJid: "1234567890@s.whatsapp.net", senderPn: "1234567890@s.whatsapp.net", fromMe: false, id: "was-in-1" }, messageBody: "Preciso de ajuda", message: { conversation: "Preciso de ajuda" } });
    expect(message).toMatchObject({ externalMessageId: "was-in-1", externalUserId: "1234567890@s.whatsapp.net", phone: "+1234567890", text: "Preciso de ajuda", fromMe: false });
  });

  it("mapeia Evolution DELIVERY_ACK e READ para estados monotônicos", () => {
    const body = { event: "messages.update", timestamp: 1709550600 };
    expect(normalizeUnofficialDelivery("evolution_api", body, { key: { id: "evo-out-1", remoteJid: "5511999999999@s.whatsapp.net" }, update: { status: "DELIVERY_ACK" } })).toMatchObject({ externalMessageId: "evo-out-1", deliveryStatus: "delivered" });
    expect(normalizeUnofficialDelivery("evolution_api", body, { key: { id: "evo-out-1" }, update: { status: 4 } })).toMatchObject({ externalMessageId: "evo-out-1", deliveryStatus: "read" });
  });

  it("mapeia WaSender status 3/4 para delivered/read", () => {
    const body = { event: "messages.update", timestamp: 1747775431467 };
    expect(normalizeUnofficialDelivery("wasender_api", body, { key: { id: "was-out-1", remoteJid: "5511999999999@s.whatsapp.net" }, update: { status: 3 } })).toMatchObject({ externalMessageId: "was-out-1", deliveryStatus: "delivered" });
    expect(normalizeUnofficialDelivery("wasender_api", body, { key: { id: "was-out-1" }, update: { status: 4 } })).toMatchObject({ externalMessageId: "was-out-1", deliveryStatus: "read" });
  });

  it("extrai identificadores de mensagens revogadas em payload Evolution messages.delete", () => {
    const body = {
      event: "messages.delete",
      data: {
        keys: [
          { id: "del-msg-1", remoteJid: "5511999999999@s.whatsapp.net", fromMe: false },
          { id: "del-msg-2", remoteJid: "5511999999999@s.whatsapp.net", fromMe: false },
        ],
      },
    };
    expect(extractRevokedMessageIds(body)).toEqual(["del-msg-1", "del-msg-2"]);
  });

  it("extrai ID de mensagem revogada de protocolo Baileys em messages.upsert", () => {
    const body = {
      event: "messages.upsert",
      data: {
        messages: [
          {
            key: { id: "protocol-carrier-id", remoteJid: "5511999999999@s.whatsapp.net", fromMe: false },
            message: {
              protocolMessage: {
                key: { id: "client-revoked-msg-99", remoteJid: "5511999999999@s.whatsapp.net" },
                type: 0,
              },
            },
          },
        ],
      },
    };
    expect(extractRevokedMessageIds(body)).toEqual(["client-revoked-msg-99"]);
  });
});
