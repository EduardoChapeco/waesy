import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { crc16Ccitt } from "@/lib/pix-payload";
import { buildOutboxDispatchSpecFromStaffMessage } from "@/services/chat.functions";
import { buildStoreAgentPixPayload } from "@/services/whatsapp-ai-agent-tools.server";
import { conditionMatches } from "@/services/whatsapp-automation-runtime.server";
import { verifyUnofficialWebhookAuth } from "@/services/whatsapp-provider-webhook.server";

describe("Microfase C — Hardening WhatsApp, Voz IA, Agente PIX e Automações", () => {
  describe("verifyUnofficialWebhookAuth (fail-closed)", () => {
    it("rejeita webhook sem credencial quando secret ou masterApiKey está configurado", () => {
      const resultWithSecret = verifyUnofficialWebhookAuth({
        provider: "evolution_api",
        rawBody: JSON.stringify({ event: "messages.upsert" }),
        headers: new Headers(),
        secret: "segredo-instancia",
        masterApiKey: null,
        allowUnsigned: true,
      });
      const resultWithMaster = verifyUnofficialWebhookAuth({
        provider: "evolution_api",
        rawBody: JSON.stringify({ event: "messages.upsert" }),
        headers: new Headers(),
        secret: null,
        masterApiKey: "master-evo-key",
        allowUnsigned: true,
      });

      expect(resultWithSecret).toBe(false);
      expect(resultWithMaster).toBe(false);
    });

    it("aceita apikey válida e assinatura HMAC-SHA256 válida, rejeitando HMAC adulterado", () => {
      const rawBody = JSON.stringify({ event: "messages.upsert", data: { id: "m1" } });
      const apiKeyHeaders = new Headers({ apikey: "segredo-instancia" });

      expect(
        verifyUnofficialWebhookAuth({
          provider: "evolution_api",
          rawBody,
          headers: apiKeyHeaders,
          secret: "segredo-instancia",
          masterApiKey: "master-evo-key",
        }),
      ).toBe(true);

      const ts = String(Math.floor(Date.now() / 1000));
      const sig = crypto
        .createHmac("sha256", "segredo-hmac")
        .update(`${ts}.${rawBody}`, "utf8")
        .digest("hex");

      expect(
        verifyUnofficialWebhookAuth({
          provider: "evolution_api",
          rawBody,
          headers: new Headers({
            "x-waesy-timestamp": ts,
            "x-waesy-signature": `sha256=${sig}`,
          }),
          secret: "segredo-hmac",
          masterApiKey: null,
        }),
      ).toBe(true);

      expect(
        verifyUnofficialWebhookAuth({
          provider: "evolution_api",
          rawBody,
          headers: new Headers({
            "x-waesy-timestamp": ts,
            "x-waesy-signature": "sha256=" + "0".repeat(64),
          }),
          secret: "segredo-hmac",
          masterApiKey: null,
        }),
      ).toBe(false);
    });

    it("rejeita webhook WaSender não assinado mesmo sem secret configurado", () => {
      expect(
        verifyUnofficialWebhookAuth({
          provider: "wasender_api",
          rawBody: "{}",
          headers: new Headers(),
          secret: null,
          masterApiKey: null,
          allowUnsigned: true,
        }),
      ).toBe(false);
    });
  });

  describe("buildOutboxDispatchSpecFromStaffMessage (áudio e mídia reais)", () => {
    it("preserva áudio PTT real com voice_note, encoding e media_url", () => {
      const spec = buildOutboxDispatchSpecFromStaffMessage(
        {
          message: "Áudio enviado",
          message_type: "audio",
          attachments: ["https://cdn.waesy.com.br/audio/nota-1.ogg"],
        },
        "msg-audio-1",
      );

      expect(spec.messageType).toBe("audio");
      expect(spec.payload).toMatchObject({
        media_url: "https://cdn.waesy.com.br/audio/nota-1.ogg",
        voice_note: true,
        encoding: true,
        mime_type: "audio/ogg; codecs=opus",
        chat_message_id: "msg-audio-1",
      });
    });

    it("normaliza image_attachment/video/document com media_url e mantém texto puro em message_type=text", () => {
      const imgSpec = buildOutboxDispatchSpecFromStaffMessage(
        {
          message: "Confira o roteiro",
          message_type: "image_attachment",
          attachments: ["https://cdn.waesy.com.br/img/roteiro.webp"],
        },
        "msg-img-1",
      );
      expect(imgSpec.messageType).toBe("image");
      expect(imgSpec.payload).toMatchObject({
        media_url: "https://cdn.waesy.com.br/img/roteiro.webp",
        caption: "Confira o roteiro",
        chat_message_id: "msg-img-1",
      });

      const txtSpec = buildOutboxDispatchSpecFromStaffMessage(
        { message: "Olá!", message_type: "text", attachments: [] },
        "msg-txt-1",
      );
      expect(txtSpec).toEqual({
        messageType: "text",
        payload: { text: "Olá!", chat_message_id: "msg-txt-1" },
      });
    });
  });

  describe("buildStoreAgentPixPayload (BACEN EMV válido)", () => {
    it("gera código BR Code EMV começando em 000201 com CRC-16 CCITT válido", () => {
      const brCode = buildStoreAgentPixPayload({
        pixKey: "contato@waesy.com.br",
        merchantName: "Excelencia Tour SMO",
        merchantCity: "Sao Miguel do Oeste",
        amountCents: 14990,
        chargeId: "chg_abc-123",
        description: "Reserva Passeio Serra",
      });

      expect(brCode.startsWith("000201")).toBe(true);
      expect(brCode).toContain("5406149.90");
      expect(brCode).toMatch(/6304[0-9A-F]{4}$/);

      const payloadWithoutCrc = brCode.slice(0, -4);
      const declaredCrc = brCode.slice(-4);
      expect(crc16Ccitt(payloadWithoutCrc)).toBe(declaredCrc);
    });
  });

  describe("conditionMatches (config.text em fluxos visuais)", () => {
    it("avalia regras separadas por vírgula/pipe e wildcard *", () => {
      const keywordCondition = {
        type: "condition",
        config: { text: "preço, orçamento | cotação" },
      };

      expect(conditionMatches(keywordCondition, { text: "Qual o Orçamento da viagem?" })).toBe(true);
      expect(conditionMatches(keywordCondition, { text: "Bom dia!" })).toBe(false);
      expect(
        conditionMatches({ type: "condition", config: { text: "*" } }, { text: "qualquer frase" }),
      ).toBe(true);
    });
  });

  describe("Contratos de ciclo de vida agendado & Voz IA sem stub sintético", () => {
    it("mantém whatsapp_scheduled_messages em processing até aceitação do outbox", () => {
      const workerSource = fs.readFileSync(
        path.resolve(__dirname, "./whatsapp-outbox.worker.ts"),
        "utf8",
      );
      expect(workerSource).toContain('status: "processing"');
      expect(workerSource).toContain('status: "sent"');
      expect(workerSource).toContain('status: "failed"');
      expect(workerSource).not.toContain('status: "queued"');
    });

    it("garante ausência de stub OggS ou transcrição sintética falsa em whatsapp-voice-ai.functions.ts", () => {
      const voiceSource = fs.readFileSync(
        path.resolve(__dirname, "./whatsapp-voice-ai.functions.ts"),
        "utf8",
      );
      expect(voiceSource).not.toContain("mocked-transcript");
      expect(voiceSource).not.toContain("Olá! Recebemos seu áudio");
      expect(voiceSource).toContain("resolveVoiceProviderKey");
    });
  });
});
