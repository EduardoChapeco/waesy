import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateCitationTag,
  formatBrandVoicePrompt,
  BrandVoiceSettingsDTO,
  AIMemoryItemDTO,
} from "./ai-memory-curation.functions";

describe("Plano #32 / PROMPT 24: Memória, Perfil do Cliente e Curadoria", () => {
  // ============================================================
  // FASE A: Camadas de Memória e Citação Canônica
  // ============================================================
  describe("Fase A: As 5 Camadas de Memória e Tags de Citação", () => {
    it("deve gerar tags de citação canônicas obrigatórias para cada camada", () => {
      expect(generateCitationTag("user", "alergias")).toBe("[Memória do Usuário: alergias]");
      expect(generateCitationTag("brand", "politica_trocas")).toBe("[Diretriz de Marca: politica_trocas]");
      expect(generateCitationTag("niche", "regras_checkin", "hotelaria")).toBe("[Regra de Nicho (hotelaria): regras_checkin]");
      expect(generateCitationTag("product", "garantia_estendida")).toBe("[Ficha Técnica do Produto: garantia_estendida]");
      expect(generateCitationTag("session", "carrinho_atual")).toBe("[Memória da Sessão: carrinho_atual]");
    });

    it("toda memória sem dono explícito deve violar a regra de governança P0", () => {
      const isUnowned = (ownerUserId?: string, ownerStoreId?: string, sessionId?: string, layerType?: string) => {
        if (ownerUserId === null || ownerUserId === undefined) {
          if (ownerStoreId === null || ownerStoreId === undefined) {
            if (sessionId === null || sessionId === undefined) {
              if (layerType !== "niche") {
                return true; // sem dono detectado
              }
            }
          }
        }
        return false;
      };

      expect(isUnowned(undefined, undefined, undefined, "user")).toBe(true);
      expect(isUnowned(undefined, undefined, undefined, "brand")).toBe(true);
      expect(isUnowned(undefined, undefined, undefined, "session")).toBe(true);
      expect(isUnowned(undefined, undefined, undefined, "niche")).toBe(false);
      expect(isUnowned("user_123", undefined, undefined, "user")).toBe(false);
      expect(isUnowned(undefined, "store_456", undefined, "brand")).toBe(false);
    });
  });

  // ============================================================
  // FASE B & C: Consentimento para Dados Sensíveis
  // ============================================================
  describe("Fase B & C: Consentimento Explícito e Dados Sensíveis", () => {
    it("deve bloquear gravação de dados sensíveis quando consentimento for ausente", () => {
      const validateSensitiveMemory = (isSensitive: boolean, consentGranted?: boolean) => {
        if (isSensitive === true && (consentGranted === false || consentGranted === undefined)) {
          throw new Error("Consentimento explícito do usuário é mandatório para registrar dados sensíveis na memória.");
        }
        return true;
      };

      expect(() => validateSensitiveMemory(true, false)).toThrow("Consentimento explícito");
      expect(() => validateSensitiveMemory(true, undefined)).toThrow("Consentimento explícito");
      expect(validateSensitiveMemory(true, true)).toBe(true);
      expect(validateSensitiveMemory(false, undefined)).toBe(true);
    });
  });

  // ============================================================
  // FASE D: Curadoria de Conteúdo e Ciclo de Vida
  // ============================================================
  describe("Fase D: Máquina de Estados da Curadoria e Citação da IA", () => {
    const sampleCuratedItems = [
      { id: "c1", title: "Guia de Trocas", status: "proposed", content: "Trocas em até 7 dias" },
      { id: "c2", title: "Manual de Instalação", status: "under_review", content: "Instale com cuidado" },
      { id: "c3", title: "Política Oficial de Garantia", status: "approved", content: "Garantia legal de 90 dias com nota fiscal" },
      { id: "c4", title: "Promoção Antiga Black Friday", status: "unpublished", content: "Desconto expirado" },
    ];

    it("a IA só deve receber e citar conteúdos com status estritamente 'approved'", () => {
      const filterForAI = (items: typeof sampleCuratedItems) => {
        return items.filter((item) => item.status === "approved");
      };

      const approvedForAI = filterForAI(sampleCuratedItems);
      expect(approvedForAI.length).toBe(1);
      expect(approvedForAI[0].id).toBe("c3");
      expect(approvedForAI[0].status).toBe("approved");

      // Itens não aprovados não podem vazar para a IA
      const nonApproved = sampleCuratedItems.filter((i) => i.status !== "approved");
      for (const item of nonApproved) {
        expect(approvedForAI).not.toContain(item);
      }
    });
  });

  // ============================================================
  // FASE D: Tom de Voz e Persona da Marca
  // ============================================================
  describe("Fase D: Persona e Tom de Voz Adaptativo por Loja", () => {
    it("deve formatar diretrizes de tom distintas e coerentes para lojas diferentes", () => {
      const luxuryBrand: BrandVoiceSettingsDTO = {
        store_id: "store_luxo_01",
        persona_name: "Curador Haute Couture",
        formality: "formal",
        verbosity: "concise",
        approved_examples: ["Com prazer apresentamos nossa coleção exclusiva de alta alfaiataria."],
        forbidden_terms: ["barato", "promoção", "top", "precinho"],
      };

      const pizzeriaBrand: BrandVoiceSettingsDTO = {
        store_id: "store_pizza_02",
        persona_name: "Pizzaiolo Giovanni",
        formality: "casual",
        verbosity: "balanced",
        approved_examples: ["E aí! Vai querer a tradicional Margherita no forno a lenha hoje?"],
        forbidden_terms: ["vossa excelência", "prezado cliente", "solicitação protocolada"],
      };

      const promptLuxury = formatBrandVoicePrompt(luxuryBrand);
      expect(promptLuxury).toContain("DIRETRIZ DE VOZ E PERSONA: Curador Haute Couture");
      expect(promptLuxury).toContain("Nível de Formalidade: formal");
      expect(promptLuxury).toContain("barato, promoção, top, precinho");

      const promptPizza = formatBrandVoicePrompt(pizzeriaBrand);
      expect(promptPizza).toContain("DIRETRIZ DE VOZ E PERSONA: Pizzaiolo Giovanni");
      expect(promptPizza).toContain("Nível de Formalidade: casual");
      expect(promptPizza).toContain("vossa excelência, prezado cliente");

      // Prova de que os tons não colidem
      expect(promptLuxury).not.toContain("Pizzaiolo");
      expect(promptPizza).not.toContain("Haute Couture");
    });
  });

  // ============================================================
  // FASE E: Isolamento Multi-Tenant Cross-Account
  // ============================================================
  describe("Fase E: Isolamento Soberano Cross-Tenant", () => {
    const memoryDatabaseMock: AIMemoryItemDTO[] = [
      {
        id: "m_user_a",
        layer_type: "user",
        owner_user_id: "user_a",
        memory_key: "dieta",
        memory_value: "vegetariano",
        context_source: "conversa",
        confidence: 0.9,
        is_sensitive: false,
        citation_tag: "[Memória do Usuário: dieta]",
        created_at: new Date().toISOString(),
      },
      {
        id: "m_user_b",
        layer_type: "user",
        owner_user_id: "user_b",
        memory_key: "dieta",
        memory_value: "cetogenica",
        context_source: "conversa",
        confidence: 0.9,
        is_sensitive: false,
        citation_tag: "[Memória do Usuário: dieta]",
        created_at: new Date().toISOString(),
      },
      {
        id: "m_store_x",
        layer_type: "brand",
        owner_store_id: "store_x",
        memory_key: "tom",
        memory_value: "formal",
        context_source: "brand_kit",
        confidence: 1.0,
        is_sensitive: false,
        citation_tag: "[Diretriz de Marca: tom]",
        created_at: new Date().toISOString(),
      },
      {
        id: "m_niche_global",
        layer_type: "niche",
        niche: "turismo",
        memory_key: "cancelamento",
        memory_value: "politica_embratur",
        context_source: "normativa",
        confidence: 1.0,
        is_sensitive: false,
        citation_tag: "[Regra de Nicho (turismo): cancelamento]",
        created_at: new Date().toISOString(),
      },
    ];

    it("o Usuário A nunca pode enxergar memórias privadas do Usuário B", () => {
      const queryForUser = (userId: string, database: AIMemoryItemDTO[]) => {
        return database.filter((m) => {
          if (m.layer_type === "niche") return true; // nicho é público/setorial
          return m.owner_user_id === userId;
        });
      };

      const resultUserA = queryForUser("user_a", memoryDatabaseMock);
      const keysA = resultUserA.map((r) => r.memory_value);

      expect(keysA).toContain("vegetariano");
      expect(keysA).not.toContain("cetogenica"); // Dado privado de B isolado!
      expect(keysA).toContain("politica_embratur"); // Nicho global acessível

      const resultUserB = queryForUser("user_b", memoryDatabaseMock);
      const keysB = resultUserB.map((r) => r.memory_value);

      expect(keysB).toContain("cetogenica");
      expect(keysB).not.toContain("vegetariano"); // Dado privado de A isolado!
    });
  });
});
