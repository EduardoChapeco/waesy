import { describe, it, expect } from "vitest";
import {
  voicePersonaSchema,
  transcribeWhatsAppAudioSchema,
  generateAiVoiceAudioSchema,
  sendAiVoiceNoteToWhatsAppSchema,
} from "@/services/whatsapp-voice-ai.functions";
import { toolGetTourismAviationPolicies } from "@/services/whatsapp-ai-agent-tools.server";

describe("WhatsApp Voice AI Studio & Speech-to-Text E2E", () => {
  describe("voicePersonaSchema", () => {
    it("validates valid persona with all custom attributes", () => {
      const input = {
        gender: "female" as const,
        age: "young" as const,
        accent: "carioca" as const,
        environment: "office" as const,
      };
      const parsed = voicePersonaSchema.parse(input);
      expect(parsed).toEqual(input);
    });

    it("applies canonical defaults when optional attributes are omitted", () => {
      const input = {
        gender: "male" as const,
      };
      const parsed = voicePersonaSchema.parse(input);
      expect(parsed.gender).toBe("male");
      expect(parsed.age).toBe("adult");
      expect(parsed.accent).toBe("neutro");
      expect(parsed.environment).toBe("studio");
    });

    it("rejects invalid gender or environment values", () => {
      expect(() =>
        voicePersonaSchema.parse({
          gender: "alien",
        }),
      ).toThrow();

      expect(() =>
        voicePersonaSchema.parse({
          gender: "female",
          environment: "underwater",
        }),
      ).toThrow();
    });
  });

  describe("transcribeWhatsAppAudioSchema", () => {
    it("validates complete transcription request payload", () => {
      const payload = {
        threadId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        messageId: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22",
        audioUrl: "https://storage.waesy.com/audio/sample.ogg",
      };
      const parsed = transcribeWhatsAppAudioSchema.parse(payload);
      expect(parsed.threadId).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
      expect(parsed.messageId).toBe("b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22");
      expect(parsed.audioUrl).toBe("https://storage.waesy.com/audio/sample.ogg");
    });

    it("allows optional audioUrl if server retrieves from message payload", () => {
      const payload = {
        threadId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        messageId: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22",
      };
      const parsed = transcribeWhatsAppAudioSchema.parse(payload);
      expect(parsed.threadId).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
      expect(parsed.messageId).toBe("b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22");
      expect(parsed.audioUrl).toBeUndefined();
    });

    it("fails when messageId is missing or empty", () => {
      expect(() =>
        transcribeWhatsAppAudioSchema.parse({
          threadId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          messageId: "not-a-uuid",
        }),
      ).toThrow();
    });
  });

  describe("generateAiVoiceAudioSchema", () => {
    it("validates speech synthesis text with custom persona", () => {
      const payload = {
        text: "Ola! Seu pacote para Porto Seguro foi confirmado com sucesso.",
        persona: {
          gender: "female" as const,
          age: "adult" as const,
          accent: "nordestino" as const,
          environment: "studio" as const,
        },
      };
      const parsed = generateAiVoiceAudioSchema.parse(payload);
      expect(parsed.text).toBe(payload.text);
      expect(parsed.persona.accent).toBe("nordestino");
      expect(parsed.persona.environment).toBe("studio");
    });

    it("rejects empty text for synthesis", () => {
      expect(() =>
        generateAiVoiceAudioSchema.parse({
          text: "   ",
        }),
      ).toThrow();
    });
  });

  describe("sendAiVoiceNoteToWhatsAppSchema", () => {
    it("validates voice note dispatch payload with PTT attributes", () => {
      const payload = {
        threadId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        storeId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33",
        text: "Segue o audio com as orientacoes do seu voo.",
        audioDataUri: "data:audio/ogg;base64,T2dnUwACAAAAAAAAAAA=",
        persona: {
          gender: "male" as const,
          age: "senior" as const,
          accent: "mineiro" as const,
          environment: "phone_call" as const,
        },
      };
      const parsed = sendAiVoiceNoteToWhatsAppSchema.parse(payload);
      expect(parsed.threadId).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
      expect(parsed.persona?.accent).toBe("mineiro");
      expect(parsed.persona?.environment).toBe("phone_call");
      expect(parsed.audioDataUri).toContain("data:audio/ogg");
    });
  });

  describe("ANAC Aviation Policies & Normative Grounding", () => {
    it("provides normative rules without emoji characters (DL-23 compliant)", async () => {
      const policies = await toolGetTourismAviationPolicies();
      expect(policies.authority).toContain("ANAC");
      expect(policies.policies[0].rules[0]).toContain("10 kg");

      // Verify DL-23 (no emojis in generated text)
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      expect(emojiRegex.test(policies.regulation)).toBe(false);
      expect(emojiRegex.test(policies.authority)).toBe(false);
      expect(emojiRegex.test(policies.policies[0].rules[0])).toBe(false);
    });
  });
});
