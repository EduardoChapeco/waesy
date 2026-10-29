import { describe, it, expect } from "vitest";
import {
  upsertCommunitySchema,
  communitySchema,
  communityTypeSchema,
  communityGradientPresetSchema,
  COMMUNITY_GRADIENT_PRESETS,
  COMMUNITY_TYPE_LABELS,
  type CommunityType,
  type CommunityGradientPreset,
} from "@/types/community";

describe("Threads-Style Community System & Post Templates", () => {
  describe("1. Validação de Schemas e Slugs de Comunidades", () => {
    it("deve aprovar comunidades com slugs válidos no formato @slug", () => {
      const validPayload = {
        title: "Design Threads",
        slug: "design-threads",
        description: "Comunidade focada em UI/UX, prototipação e interfaces.",
        community_type: "general" as CommunityType,
        cover_mode: "gradient" as const,
        cover_gradient_preset: "blue-lime" as CommunityGradientPreset,
        privacy: "public" as const,
      };

      const result = upsertCommunitySchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe("design-threads");
        expect(result.data.community_type).toBe("general");
        expect(result.data.cover_gradient_preset).toBe("blue-lime");
      }
    });

    it("deve rejeitar slugs com caracteres inválidos, maiúsculas ou espaços", () => {
      const invalidPayload = {
        title: "Comunidade Inválida",
        slug: "Design Threads Invalido!",
        community_type: "general",
      };

      const result = upsertCommunitySchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("apenas letras minúsculas");
      }
    });

    it("deve rejeitar títulos com menos de 2 caracteres", () => {
      const shortTitlePayload = {
        title: "A",
        slug: "comunidade-a",
        community_type: "general",
      };

      const result = upsertCommunitySchema.safeParse(shortTitlePayload);
      expect(result.success).toBe(false);
    });
  });

  describe("2. Cobertura dos 6 Tipos de Comunidades", () => {
    const supportedTypes: CommunityType[] = [
      "general",
      "sales",
      "news",
      "videos",
      "events",
      "jobs",
    ];

    it.each(supportedTypes)("deve suportar o tipo de comunidade '%s' com rótulo canônico", (type) => {
      expect(communityTypeSchema.safeParse(type).success).toBe(true);
      expect(COMMUNITY_TYPE_LABELS[type]).toBeDefined();
      expect(typeof COMMUNITY_TYPE_LABELS[type]).toBe("string");
    });
  });

  describe("3. Presets de Gradiente da Capa Threads", () => {
    const supportedPresets: CommunityGradientPreset[] = [
      "blue-lime",
      "pink-cyan",
      "sunset",
      "cyberpunk",
      "obsidian",
    ];

    it.each(supportedPresets)("deve validar o preset de gradiente '%s'", (presetId) => {
      expect(communityGradientPresetSchema.safeParse(presetId).success).toBe(true);
      const config = COMMUNITY_GRADIENT_PRESETS[presetId];
      expect(config).toBeDefined();
      expect(config.gradientClass).toContain("from-");
      expect(config.gradientClass).toContain("to-");
    });
  });

  describe("4. Matriz de Atributos por Template de Publicação", () => {
    it("deve estruturar atributos de template de Venda (sales) com preço e WhatsApp", () => {
      const saleAttrs = {
        title: "MacBook Air M2 16GB",
        price_cents: 650000,
        condition: "used",
        contact_whatsapp: "49999998888",
      };

      expect(saleAttrs.price_cents).toBe(650000);
      expect(saleAttrs.condition).toBe("used");
      expect(saleAttrs.contact_whatsapp).toBe("49999998888");
    });

    it("deve estruturar atributos de template de Notícia (news) com manchete e fonte", () => {
      const newsAttrs = {
        title: "Nova ciclovia é inaugurada no centro de São Miguel do Oeste",
        source: "Jornal Comunitário",
        category: "Mobilidade Urbana",
      };

      expect(newsAttrs.title).toContain("ciclovia");
      expect(newsAttrs.source).toBe("Jornal Comunitário");
    });

    it("deve estruturar atributos de template de Evento (event) com data e local", () => {
      const eventAttrs = {
        title: "Meetup Tech & Empreendedorismo",
        event_date: "Sábado, 05 de Novembro às 14:00",
        location: "Auditório Central • Rua Duque de Caxias",
        is_free: true,
      };

      expect(eventAttrs.is_free).toBe(true);
      expect(eventAttrs.location).toContain("Auditório");
    });

    it("deve estruturar atributos de template de Vaga de Emprego (job)", () => {
      const jobAttrs = {
        title: "Desenvolvedor Frontend React",
        company: "Waesy Tech Lab",
        work_model: "Híbrido",
        salary_range: "R$ 4.500 - R$ 6.000",
      };

      expect(jobAttrs.work_model).toBe("Híbrido");
      expect(jobAttrs.company).toBe("Waesy Tech Lab");
    });
  });
});
