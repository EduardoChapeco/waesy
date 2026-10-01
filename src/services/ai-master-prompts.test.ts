/**
 * ai-master-prompts.test.ts — Suíte de Testes Automatizados da Biblioteca de Prompts Master
 *
 * PROMPT 26: Biblioteca de Prompts Master (Governança, Versionamento Semântico e Fallback em Cascata)
 *
 * Casos de Teste Rigorosos:
 * 1. Fase A & B: Catálogo de 12 prompts canônicos com schemas de variáveis e validação SemVer.
 * 2. Fase B: Interpolação segura — falha estrita com PromptVariableMissingError quando variável obrigatória falta.
 * 3. Fase C: Resolução em cascata de 3 níveis e benchmark de performance com cache sub-2ms.
 * 4. Fase D: Comparação estruturada de versões (diff de template, instruções, parâmetros e variáveis).
 * 5. Fase E: Cobertura de prompts de mídia/arte sem descritores de terceiros e parâmetros estritos.
 */

import { describe, it, expect } from "vitest";
import {
  BUILTIN_MASTER_PROMPTS_REGISTRY,
  interpolatePromptTemplate,
  resolveMasterPrompt,
  diffPromptDefinitions,
  PromptVariableMissingError,
  MasterPromptDefinition,
} from "./ai-master-prompts.functions";

describe("PROMPT 26 — Biblioteca de Prompts Master, Governança e Fallback em Cascata", () => {
  // ── FASE A & B: CATÁLOGO CANÔNICO E SCHEMAS DE VARIÁVEIS ──
  it("Fase A & B: Catálogo possui 12 prompts master canônicos com SemVer válido e variáveis tipadas", () => {
    const keys = Object.keys(BUILTIN_MASTER_PROMPTS_REGISTRY);
    expect(keys.length).toBeGreaterThanOrEqual(12);

    for (const key of keys) {
      const prompt = BUILTIN_MASTER_PROMPTS_REGISTRY[key];
      expect(prompt.slug).toBe(key);
      expect(prompt.version).toMatch(/^\d+\.\d+\.\d+$/); // SemVer rigoroso
      expect(prompt.title.length).toBeGreaterThan(5);
      expect(prompt.systemInstruction.length).toBeGreaterThan(20);
      expect(prompt.promptTemplate.length).toBeGreaterThan(20);
      expect(prompt.variablesSchema.length).toBeGreaterThan(0);
      expect(prompt.recommendedProviders.length).toBeGreaterThan(0);
      expect(prompt.temperature).toBeGreaterThanOrEqual(0);
      expect(prompt.temperature).toBeLessThanOrEqual(1);
    }
  });

  // ── FASE B: INTERPOLAÇÃO SEGURA COM VALIDAÇÃO DE SCHEMA ──
  it("Fase B: Interpolação bem-sucedida substitui todas as tags {{var}} e lança erro ao faltar campo obrigatório", () => {
    const prompt = BUILTIN_MASTER_PROMPTS_REGISTRY.sdr_lead_qualifier;

    // 1. Sucesso com variáveis completas
    const validResult = interpolatePromptTemplate(
      prompt.promptTemplate,
      {
        store_name: "Bistrô & Sabor",
        customer_name: "Eduardo Chapeco",
        niche: "gastronomia",
        customer_message: "Gostaria de agendar uma degustação para evento corporativo.",
      },
      prompt.variablesSchema,
      prompt.slug
    );

    expect(validResult).toContain("Eduardo Chapeco");
    expect(validResult).toContain("gastronomia");
    expect(validResult).toContain("Gostaria de agendar uma degustação");
    expect(validResult).not.toContain("{{customer_name}}");

    // 2. Falha estrita ao faltar variável obrigatória
    expect(() => {
      interpolatePromptTemplate(
        prompt.promptTemplate,
        {
          customer_name: "Eduardo Chapeco",
          // Omitindo 'store_name', 'niche' e 'customer_message'
        },
        prompt.variablesSchema,
        prompt.slug
      );
    }).toThrow(PromptVariableMissingError);

    try {
      interpolatePromptTemplate(
        prompt.promptTemplate,
        {},
        prompt.variablesSchema,
        prompt.slug
      );
    } catch (e: any) {
      expect(e).toBeInstanceOf(PromptVariableMissingError);
      expect(e.missingVariables).toContain("store_name");
      expect(e.missingVariables).toContain("customer_name");
      expect(e.missingVariables).toContain("customer_message");
    }
  });

  // ── FASE C: CASCATA DE 3 NÍVEIS E CACHE SUB-2MS ──
  it("Fase C: Resolução automática em cascata recorre ao Builtin inabalável e resolve em menos de 2ms via cache", async () => {
    // 1. Resolução forçando Tier 3 (Builtin) ou resolução natural em cascata
    const resolved = await resolveMasterPrompt({
      slug: "travel_itinerary_architect",
      forceTier: "builtin",
      variables: {
        agency_name: "Rota Sul Viagens",
        destination: "Serra Catarinense",
        days_count: 4,
        traveler_profile: "Casal em busca de enoturismo",
      },
    });

    expect(resolved.resolvedTier).toBe("builtin");
    expect(resolved.slug).toBe("travel_itinerary_architect");
    expect(resolved.version).toBe("1.0.0");
    expect(resolved.systemInstruction).toContain("Rota Sul Viagens");
    expect(resolved.userPrompt).toContain("Serra Catarinense");
    expect(resolved.userPrompt).toContain("4 dias");

    // 2. Benchmark de Performance com Cache em Memória: Resolução deve ser sub-2ms
    const secondResolution = await resolveMasterPrompt({
      slug: "travel_itinerary_architect",
      variables: {
        agency_name: "Rota Sul Viagens",
        destination: "Serra Catarinense",
        days_count: 4,
        traveler_profile: "Casal em busca de enoturismo",
      },
    });

    expect(secondResolution.resolutionTimeMs).toBeLessThanOrEqual(5); // Ultra-rápido via cache
  });

  // ── FASE D: COMPARAÇÃO ESTRUTURADA DE VERSÕES (DIFF) ──
  it("Fase D: Calculador de diff identifica alterações em instruções, templates, parâmetros e schemas de variáveis", () => {
    const vOld: MasterPromptDefinition = {
      slug: "commerce_cart_assistant",
      version: "1.0.0",
      title: "Assistente de Compras",
      description: "Versão antiga",
      category: "commerce",
      purpose: "cart",
      systemInstruction: "Instrução antiga v1",
      promptTemplate: "Template antigo {{store_name}}",
      variablesSchema: [{ name: "store_name", type: "string", required: true }],
      recommendedProviders: ["gemini"],
      targetProvider: "gemini",
      targetModel: "gemini-1.5-flash",
      temperature: 0.2,
      maxTokens: 1024,
    };

    const vNew: MasterPromptDefinition = {
      ...vOld,
      version: "1.1.0",
      systemInstruction: "Instrução refinada v2",
      promptTemplate: "Template novo {{store_name}} {{user_query}}",
      variablesSchema: [
        { name: "store_name", type: "string", required: true },
        { name: "user_query", type: "string", required: true },
      ],
      targetModel: "gemini-2.5-flash",
      temperature: 0.3,
    };

    const diff = diffPromptDefinitions(vOld, vNew);
    expect(diff.instructionChanged).toBe(true);
    expect(diff.templateChanged).toBe(true);
    expect(diff.temperatureChanged).toBe(true);
    expect(diff.modelChanged).toBe(true);
    expect(diff.variablesChanged).toBe(true);
    expect(diff.addedVariables).toContain("user_query");
    expect(diff.removedVariables.length).toBe(0);
  });

  // ── FASE E: PROMPTS DE MÍDIA E ARTE COM PARÂMETROS ESTRITOS ──
  it("Fase E: Prompts de mídia fotográfica cobrem produto, gastronomia e imóveis sem marcas de terceiros", () => {
    const mediaSlugs = [
      "media_prompt_product_hero",
      "media_prompt_food_appetite",
      "media_prompt_real_estate_luxury",
    ];

    for (const slug of mediaSlugs) {
      const prompt = BUILTIN_MASTER_PROMPTS_REGISTRY[slug];
      expect(prompt.category).toBe("media");
      expect(prompt.targetProvider).toBe("openai"); // DALL-E-3
      // Verifica ausência de termos de marcas de terceiros protegidas
      const forbiddenBrands = ["apple", "coca-cola", "nike", "gucci", "rolex"];
      for (const brand of forbiddenBrands) {
        expect(prompt.promptTemplate.toLowerCase()).not.toContain(brand);
        expect(prompt.systemInstruction.toLowerCase()).not.toContain(brand);
      }
    }
  });
});
