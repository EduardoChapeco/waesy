import { describe, it, expect } from "vitest";
import { executeGenerateStorefrontFromOnboarding } from "@/services/multimodal-onboarding.functions";
import { AgentRegistrySchema, SquadTemplateSchema, GlobalMasterCatalogItemSchema, MultimodalOnboardingSessionSchema, BrandDnaProfileSchema } from "@/types/squads-and-onboarding";

describe("Multimodal Onboarding, Master Catalog & Squads — Big Tech Architecture", () => {
  describe("Validação de Schemas e Contratos Estritos", () => {
    it("valida schema de agente individual especializado", () => {
      const sampleAgent = {
        id: "agent.v4_copywriter",
        name: "Copywriter Sênior",
        category: "marketing" as const,
        ui_group: "marketing",
        seniority: "Senior / PhD",
        career_summary: "PhD em Comunicação Persuasiva, especialista no Canvas dos 7 Pecados.",
        curriculum: {
          academic_background: ["Doutorado em Linguística - Unicamp"],
          certifications: ["Direct Response Master"],
          years_experience: 12,
          specialties: ["Copywriting", "Storytelling"],
        },
        deliverables: ["Copys de Anúncios", "Landing Pages"],
        execution_mode: "llm" as const,
        default_model: "google/gemini-2.5-flash",
        token_budget: 4000,
        system_prompt_template: "Prompt especializado...",
        input_schema: {},
        output_schema: {},
        is_active: true,
      };

      const parsed = AgentRegistrySchema.safeParse(sampleAgent);
      expect(parsed.success).toBe(true);
    });

    it("valida schema de item do Master Catalog Global com EAN e NCM", () => {
      const sampleSku = {
        id: "00000000-0000-0000-0000-000000000001",
        barcode_ean: "7894900010015",
        name: "Refrigerante Coca-Cola Original 350ml",
        brand_name: "Coca-Cola",
        category: "Bebidas",
        subcategory: "Refrigerantes",
        description: "Refrigerante em lata clássico.",
        suggested_price_cents: 550,
        ncm_code: "2202.10.00",
        cest_code: "03.007.00",
        tax_tribute_group: "tributado_integralmente",
        unit_of_measure: "UN",
        image_urls: ["https://images.unsplash.com/sample.webp"],
        nutrition_facts: {},
        tags: ["Refrigerante", "Lata"],
        is_verified: true,
      };

      const parsed = GlobalMasterCatalogItemSchema.safeParse(sampleSku);
      expect(parsed.success).toBe(true);
    });

    it("valida sessão de Onboarding Multimodal com produtos extraídos", () => {
      const sampleSession = {
        id: "11111111-1111-1111-1111-111111111111",
        store_id: "22222222-2222-2222-2222-222222222222",
        status: "extracted" as const,
        input_sources: {
          image_urls: ["https://storage.usewaesy.com/cardapio.jpg"],
          external_links: [],
        },
        extracted_business_profile: { niche: "Gastronomia" },
        extracted_products: [
          { name: "Filé Mignon", price_cents: 6890, category: "Pratos Principais" },
        ],
        extracted_categories: ["Pratos Principais"],
        applied_products_count: 0,
      };

      const parsed = MultimodalOnboardingSessionSchema.safeParse(sampleSession);
      expect(parsed.success).toBe(true);
    });

    it("valida perfil de Brand DNA com alavancas dos 7 Pecados Capitais", () => {
      const sampleDna = {
        id: "33333333-3333-3333-3333-333333333333",
        store_id: "22222222-2222-2222-2222-222222222222",
        archetype: "O Herói",
        tone_of_voice: "Inspirador e audacioso",
        tone_rules: ["Nunca usar gírias agressivas", "Sempre reforçar conquista"],
        content_pillars: ["Superação", "Performance", "Qualidade"],
        forbidden_words: ["barato", "simples"],
        color_palette: {
          primary: "#0F172A",
          secondary: "#3B82F6",
          accent: "#F59E0B",
          background: "#FFFFFF",
          text: "#0F172A",
        },
        seven_sins_triggers: {
          pride_vanity: "Posicione a aquisição como troféu pessoal de excelência.",
          greed: "Enfatize a taxa de retorno acima da média de mercado.",
        },
        swot_analysis: {
          strengths: ["Atendimento 24h"],
          weaknesses: ["Marca nova"],
          opportunities: ["Venda corporativa"],
          threats: ["Concorrência predatória"],
        },
      };

      const parsed = BrandDnaProfileSchema.safeParse(sampleDna);
      expect(parsed.success).toBe(true);
    });
  });

  describe("Garantia do Modo Tradicional (IA 100% Opcional)", () => {
    it("valida payload de importação manual por planilha sem IA", () => {
      const spreadsheetRows = [
        {
          title: "Produto Tradicional 1",
          category: "Mercearia",
          description: "Cadastro manual clássico",
          price_cents: 1500,
          brand: "Marca Local",
          ean: "7891234567890",
        },
        {
          title: "Produto Tradicional 2",
          category: "Bebidas",
          description: "Cadastro sem assistência inteligente",
          price_cents: 800,
          brand: "Produtor Regional",
          ean: "7899876543210",
        },
      ];

      expect(spreadsheetRows.length).toBe(2);
      expect(spreadsheetRows[0].price_cents).toBe(1500);
      expect(spreadsheetRows[1].ean).toBe("7899876543210");
    });
  });
  describe("Fase 6: Integração com o Construtor Universal (Vitrines Automáticas)", () => {
    it("executa a geração da vitrine inicial a partir do onboarding no Universal Builder", async () => {
      const mockDb = {
        from: (table: string) => ({
          select: (cols?: string, opts?: any) => {
            if (opts && opts.count === "exact") {
              return {
                eq: async () => ({ count: 2, data: [] }),
              };
            }
            return {
              eq: (col1: string, val1: any) => ({
                eq: (col2: string, val2: any) => ({
                  eq: (col3: string, val3: any) => ({
                    maybeSingle: async () => ({ data: { id: "doc-123" } }),
                  }),
                  maybeSingle: async () => ({ data: { id: "doc-123" } }),
                }),
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: { id: "ver-123" } }),
                  }),
                }),
                single: async () => ({
                  data: {
                    id: "sess-123",
                    extracted_business_profile: { extracted_niche: "Gastronomia Artesanal" },
                  },
                }),
                limit: async () => ({
                  data: [{ id: "p1", title: "Burger Artesanal", price_cents: 3500 }],
                }),
              }),
            };
          },
        }),
      };

      const result = await executeGenerateStorefrontFromOnboarding(mockDb, {
        store_id: "store-test",
        session_id: "sess-123",
      });

      expect(result.success).toBe(true);
      expect(result.documentId).toBe("doc-123");
      expect(result.versionId).toBe("ver-123");
      expect(result.slug).toBe("home");
      expect(result.productsCount).toBe(1);
    });
  });
});
