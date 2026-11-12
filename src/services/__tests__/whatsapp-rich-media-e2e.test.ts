import { describe, it, expect } from "vitest";
import {
  unwrapBaileysMessage,
  extractMediaPayload,
  messageType,
  messageText,
} from "@/services/whatsapp-provider-webhook.server";
import {
  sendStaffMessageSchema,
  sendCustomerMessageSchema,
  deleteChatContactPermanentlySchema,
  toggleChatThreadStaffVisibilitySchema,
} from "@/services/chat.functions";
import { toolGetTourismAviationPolicies } from "@/services/whatsapp-ai-agent-tools.server";

describe("WhatsApp Rich Media & Realtime Synchronization E2E", () => {
  describe("unwrapBaileysMessage", () => {
    it("unwraps ephemeralMessage correctly", () => {
      const payload = {
        ephemeralMessage: {
          message: {
            conversation: "Olá suporte",
          },
        },
      };
      const unwrapped = unwrapBaileysMessage(payload);
      expect(unwrapped).toEqual({ conversation: "Olá suporte" });
    });

    it("unwraps viewOnceMessage and viewOnceMessageV2 correctly", () => {
      const payloadV1 = {
        viewOnceMessage: {
          message: {
            imageMessage: { caption: "Foto única" },
          },
        },
      };
      expect(unwrapBaileysMessage(payloadV1)).toEqual({
        imageMessage: { caption: "Foto única" },
      });

      const payloadV2 = {
        viewOnceMessageV2: {
          message: {
            videoMessage: { caption: "Vídeo temporário" },
          },
        },
      };
      expect(unwrapBaileysMessage(payloadV2)).toEqual({
        videoMessage: { caption: "Vídeo temporário" },
      });
    });

    it("unwraps documentWithCaptionMessage and nested wrappers", () => {
      const nested = {
        ephemeralMessage: {
          message: {
            documentWithCaptionMessage: {
              message: {
                documentMessage: { fileName: "contrato.pdf" },
              },
            },
          },
        },
      };
      expect(unwrapBaileysMessage(nested)).toEqual({
        documentMessage: { fileName: "contrato.pdf" },
      });
    });
  });

  describe("messageType detection", () => {
    it("detects sticker from messageType property or stickerMessage object", () => {
      expect(messageType({ messageType: "stickerMessage" })).toBe("sticker");
      expect(messageType({ message: { stickerMessage: {} } })).toBe("sticker");
      expect(
        messageType({
          message: {
            ephemeralMessage: {
              message: { stickerMessage: { url: "https://mmg.whatsapp.net/..." } },
            },
          },
        }),
      ).toBe("sticker");
    });

    it("detects image, video, audio, and document types", () => {
      expect(messageType({ message: { imageMessage: {} } })).toBe("image");
      expect(messageType({ message: { videoMessage: {} } })).toBe("video");
      expect(messageType({ message: { audioMessage: {} } })).toBe("audio");
      expect(messageType({ message: { documentMessage: {} } })).toBe("document");
      expect(messageType({ message: { locationMessage: {} } })).toBe("location");
      expect(messageType({ message: { contactMessage: {} } })).toBe("contact");
    });

    it("falls back to text for standard conversation messages", () => {
      expect(messageType({ message: { conversation: "Tudo bem?" } })).toBe("text");
      expect(
        messageType({ message: { extendedTextMessage: { text: "Link aqui" } } }),
      ).toBe("text");
    });
  });

  describe("messageText preview normalization", () => {
    it("prevents regression where stickers were marked as {mensagem} or [Mensagem]", () => {
      const stickerItem = {
        messageType: "stickerMessage",
        message: {
          stickerMessage: {
            isAnimated: false,
          },
        },
      };
      expect(messageText(stickerItem)).toBe("[Figurinha]");
    });

    it("returns [Imagem] for images without caption, and returns caption if present", () => {
      expect(messageText({ message: { imageMessage: {} } })).toBe("[Imagem]");
      expect(
        messageText({ message: { imageMessage: { caption: "Veja meu produto" } } }),
      ).toBe("Veja meu produto");
    });

    it("returns [Vídeo], [Áudio], [Documento] for media without explicit caption", () => {
      expect(messageText({ message: { videoMessage: {} } })).toBe("[Vídeo]");
      expect(messageText({ message: { audioMessage: {} } })).toBe("[Áudio]");
      expect(messageText({ message: { documentMessage: {} } })).toBe("[Documento]");
    });

    it("extracts conversation text directly", () => {
      expect(messageText({ message: { conversation: "Bom dia!" } })).toBe("Bom dia!");
    });
  });

  describe("extractMediaPayload", () => {
    it("extracts sticker with default image/webp mimetype and base64 data URI", () => {
      const dummyBase64 = "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4H";
      const item = {
        messageType: "stickerMessage",
        base64: dummyBase64,
        message: {
          stickerMessage: {
            mimetype: "image/webp",
            isAnimated: false,
          },
        },
      };
      const media = extractMediaPayload(item);
      expect(media.type).toBe("sticker");
      expect(media.mimetype).toBe("image/webp");
      expect(media.url).toBe(`data:image/webp;base64,${dummyBase64}`);
      expect(media.isAnimated).toBe(false);
    });

    it("extracts document with fileName and custom mimetype", () => {
      const item = {
        message: {
          documentMessage: {
            fileName: "relatorio-financeiro.pdf",
            mimetype: "application/pdf",
            caption: "Segue o relatório",
          },
        },
      };
      const media = extractMediaPayload(item);
      expect(media.type).toBe("document");
      expect(media.fileName).toBe("relatorio-financeiro.pdf");
      expect(media.mimetype).toBe("application/pdf");
      expect(media.caption).toBe("Segue o relatório");
    });

    it("returns null media fields for plain text messages", () => {
      const item = {
        message: {
          conversation: "Mensagem puramente textual",
        },
      };
      const media = extractMediaPayload(item);
      expect(media.type).toBeNull();
      expect(media.url).toBeNull();
    });
  });

  describe("chat.functions Schema Validation", () => {
    it("validates sendStaffMessageSchema with sticker and data URI attachments", () => {
      const payload = {
        threadId: "a0000000-0000-0000-0000-000000000001",
        message: "[Figurinha]",
        message_type: "sticker",
        attachments: ["data:image/webp;base64,AAAA=="],
      };
      const parsed = sendStaffMessageSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it("validates sendCustomerMessageSchema with image and public URL attachments", () => {
      const payload = {
        threadId: "a0000000-0000-0000-0000-000000000002",
        message: "Minha foto",
        message_type: "image",
        attachments: ["https://storage.usewaesy.com/chat/photo.jpg"],
      };
      const parsed = sendCustomerMessageSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid message_type in sendStaffMessageSchema", () => {
      const invalid = {
        threadId: "a0000000-0000-0000-0000-000000000001",
        message: "teste",
        message_type: "unsupported_media_type_xxx",
      };
      const parsed = sendStaffMessageSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe("Admin Contact Purge & Staff Isolation Schemas", () => {
    it("validates deleteChatContactPermanentlySchema", () => {
      const payload = {
        threadId: "a0000000-0000-0000-0000-000000000001",
        storeId: "b0000000-0000-0000-0000-000000000001",
        deleteFromCrm: true,
      };
      const parsed = deleteChatContactPermanentlySchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it("validates toggleChatThreadStaffVisibilitySchema", () => {
      const payload = {
        threadId: "a0000000-0000-0000-0000-000000000001",
        hiddenFromStaff: true,
      };
      const parsed = toggleChatThreadStaffVisibilitySchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });
  });

  describe("Tourism & Aviation Policy AI Tools", () => {
    it("returns ANAC Resolution 400 aviation policies with baggage, 24h cancellation, delay and no-show rules", () => {
      const aviation = toolGetTourismAviationPolicies();
      expect(aviation.authority).toContain("ANAC");
      expect(aviation.policies.length).toBeGreaterThanOrEqual(5);

      const baggagePolicy = aviation.policies.find((p) => p.topic.includes("Bagagem"));
      expect(baggagePolicy).toBeDefined();
      expect(baggagePolicy?.rules[0]).toContain("10 kg");

      const cancellationPolicy = aviation.policies.find((p) => p.topic.includes("Arrependimento"));
      expect(cancellationPolicy).toBeDefined();
      expect(cancellationPolicy?.rules[0]).toContain("24 horas");

      const delayPolicy = aviation.policies.find((p) => p.topic.includes("Atrasos"));
      expect(delayPolicy).toBeDefined();
      expect(delayPolicy?.rules.some((r) => r.includes("hospedagem"))).toBe(true);

      const noShowPolicy = aviation.policies.find((p) => p.topic.includes("No-Show"));
      expect(noShowPolicy).toBeDefined();
      expect(noShowPolicy?.rules[0]).toContain("NÃO PODE cancelar automaticamente o trecho de volta");
    });
  });
});
