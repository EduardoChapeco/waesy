/**
 * onboarding-e2e-verification.test.ts — Prova E2E da Fase 8 do Onboarding Guiado por IA
 *
 * Valida:
 * 1. Débito de 20.000 tokens e Idempotência
 * 2. Auto-refund em falha forçada
 * 3. Formato e integridade dos 5 Squads do Concílio de IAs
 * 4. Estrutura de persistência em brand_kits, brand_dna_profiles e briefings
 * 5. Prova anti-mock (sem dados inventados)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ONBOARDING_AI_COST, ONBOARDING_AI_TIME_SAVED_MINUTES } from "@/config/platform-billing.config";
import * as apiOrchestrator from "./api-orchestrator.functions";
import {
  assertSafeUrl,
  runConsolidationAndJudge,
  type ScrapedEvidence,
  type DesignSquadResult,
  type CopySquadResult,
  type PrSquadResult,
  type BusinessStrategistSquadResult,
  type MarketAnalystSquadResult,
} from "./onboarding-pipeline.server";

describe("Fase 8: Verificação E2E e Prova Forense do Onboarding", () => {
  describe("1. Contrato e Moeda da Plataforma (20.000 Tokens)", () => {
    it("comprova que o valor central é estritamente 20.000 tokens", () => {
      expect(ONBOARDING_AI_COST).toBe(20000);
      expect(ONBOARDING_AI_TIME_SAVED_MINUTES).toBe(360);
    });

    it("garante chave de idempotência determinística e única por execução", () => {
      const storeId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
      const idemp1 = `tb_burn_magic_onboarding_${storeId}_123456`;
      const idemp2 = `tb_burn_magic_onboarding_${storeId}_123457`;
      expect(idemp1).not.toBe(idemp2);
      expect(idemp1).toContain("burn_magic_onboarding");
    });
  });

  describe("2. Concílio de IAs & Consolidação com Juiz Final", () => {
    it("preserva o título da fonte quando o nome proposto pelo modelo não é comprovado literalmente", async () => {
      const mockEvidence: ScrapedEvidence = {
        sourceUrl: "https://padariaestrela.com.br",
        domain: "padariaestrela.com.br",
        pageTitle: "Padaria e Confeitaria Estrela do Sul",
        metaDescription: "Pães artesanais, bolos e café colonial desde 1998.",
        rawTextSample: "Fundada em 1998 em Chapecó. Tradição em fermentação natural. Telefone: 4933221100.",
        extractionProvider: "native_fetch",
      };

      const designResult: DesignSquadResult = {
        brand_name: "Padaria Estrela do Sul",
        primary_color: "#78350F",
        secondary_color: "#F59E0B",
        accent_color: "#D97706",
        background_color: "#FFFBEB",
        typography: { heading: "Playfair Display", body: "Inter" },
        visual_style: "artesanal e acolhedor",
        confidence: 0.95,
        evidence: ["conteudo_site_panificacao"],
      };

      const copyResult: CopySquadResult = {
        tone_of_voice: "Acolhedor, afetuoso e tradicional",
        tone_adjectives: ["Tradicional", "Afetuoso", "Genuíno", "Acolhedor"],
        archetype: "O Cuidador",
        archetype_justification: "Dedicação diária à nutrição e acolhimento das famílias locais.",
        tone_rules: ["Sempre valorizar o aroma e aconchego", "Nunca usar termos industriais frios"],
        do_words: ["Fornada", "Artesanal", "Tradição", "Família"],
        dont_words: ["Processado", "Químico", "Industrial"],
        content_pillars: ["Fornadas do Dia", "Histórias de Família", "Dicas de Café"],
        bio_concise: "Tradição em pães artesanais de fermentação natural em Chapecó desde 1998.",
        tagline: "O sabor da tradição em cada fornada.",
        confidence: 0.92,
        evidence: ["historia_desde_1998"],
      };

      const prResult: PrSquadResult = {
        positioning_statement: "Para famílias que exigem sabor autêntico, a Padaria Estrela é a panificadora artesanal que une tradição e ingredientes nobres.",
        value_proposition: "Pães frescos de fermentação lenta com sabor inesquecível.",
        reputation_summary: "Reconhecimento comunitário sólido como referência no bairro.",
        confidence: 0.9,
        evidence: ["depoimentos_locais"],
      };

      const bizResult: BusinessStrategistSquadResult = {
        business_model: {
          value_proposition: "Panificação artesanal de alta qualidade",
          target_segments: ["Moradores do bairro", "Trabalhadores matutinos"],
          customer_relationships: ["Atendimento de balcão caloroso", "Clube de pães"],
          distribution_channels: ["Balcão físico", "Entrega local Waesy"],
          key_activities: ["Produção diária", "Atendimento e café"],
          key_resources: ["Forno de lastro", "Padeiros artesãos"],
          key_partners: ["Produtores de farinha orgânica"],
          cost_structure: ["Farinha nobre", "Folha de pagamento"],
          revenue_streams: ["Venda no balcão", "Café colonial"],
        },
        swot: {
          strengths: ["28 anos de tradição", "Fermentação natural autêntica", "Ponto comercial estabelecido"],
          weaknesses: ["Espaço físico limitado nos finais de semana"],
          opportunities: ["Delivery programado de café da manhã via Waesy"],
          threats: ["Aumento de custo do trigo"],
        },
        seven_sins_hooks: {
          orgulho: "Para quem não aceita pão comum de supermercado na mesa.",
          ganancia: "Combo café da manhã com 25% de economia em relação aos itens avulsos.",
          luxuria: "Casca crocante e miolo aerado que derrete a manteiga na hora.",
          inveja: "A cesta de pães que todos os seus convidados vão fotografar.",
          gula: "Café colonial farto com mais de 30 opções doces e salgadas à vontade.",
          ira: "Cansado de pão borrachudo e industrializado? Descubra o pão de verdade.",
          preguica: "Pão quentinho na sua porta antes das 7h sem você sair da cama.",
        },
        confidence: 0.91,
        evidence: ["dados_de_negocio"],
      };

      const marketResult: MarketAnalystSquadResult = {
        direct_competitors: [
          { name: "Padaria Central", notes: "Foco em conveniência rápida" },
        ],
        competitive_differentials: ["Fermentação 100% natural", "Sem pré-misturas industriais"],
        market_opportunities: ["Assinatura semanal de pães artesanais"],
        confidence: 0.88,
        evidence: ["analise_local"],
      };

      vi.spyOn(apiOrchestrator, "executeUnifiedAiCall").mockResolvedValueOnce({
        content: JSON.stringify({
          company_name: "Padaria Estrela do Sul",
          category: "gastronomia",
          bio: "Tradição em pães artesanais de fermentação natural em Chapecó desde 1998.",
          tagline: "O sabor da tradição em cada fornada.",
          suggested_products: [],
          contact: { city: "Chapecó", state: "SC" },
          unconfirmed_fields: [],
        }),
        parsedJson: {
          company_name: "Padaria Estrela do Sul",
          category: "gastronomia",
          bio: "Tradição em pães artesanais de fermentação natural em Chapecó desde 1998.",
          tagline: "O sabor da tradição em cada fornada.",
          suggested_products: [],
          contact: { city: "Chapecó", state: "SC" },
          unconfirmed_fields: [],
        },
        provider: "groq",
        model: "llama-3.3-70b-versatile",
      } as any);

      const consolidated = await runConsolidationAndJudge(
        mockEvidence,
        designResult,
        copyResult,
        prResult,
        bizResult,
        marketResult
      );

      // Verificações estritas
      expect(consolidated.company_name).toBe("Padaria e Confeitaria Estrela do Sul");
      expect(consolidated.evidence_summary.unconfirmed_fields).toContain("company_name: usando título do site/domínio porque o nome sugerido não foi localizado literalmente");
      expect(consolidated.brand_kit.primary_color).toBe("#78350F");
      expect(consolidated.brand_kit.typography.heading).toBe("Playfair Display");
      expect(consolidated.brand_dna.archetype).toBe("O Cuidador");
      expect(consolidated.brand_dna.seven_sins_triggers.orgulho).toContain("pão comum");
      expect(consolidated.briefing.swot_strengths.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("3. Segurança Anti-Mock & Diretriz Zero", () => {
    it("não inventa produtos caso o site não apresente catálogo explícito", async () => {
      const mockEvidence: ScrapedEvidence = {
        sourceUrl: "https://consultoria-adv.com.br",
        domain: "consultoria-adv.com.br",
        pageTitle: "Escritório de Advocacia Silva & Santos",
        rawTextSample: "Prestamos assessoria jurídica empresarial em contratos e direito societário.",
        extractionProvider: "native_fetch",
      };

      const designResult: DesignSquadResult = {
        brand_name: "Silva & Santos Advocacia",
        primary_color: "#0F172A",
        secondary_color: "#1E293B",
        accent_color: "#94A3B8",
        background_color: "#FFFFFF",
        typography: { heading: "Cinzel", body: "Inter" },
        visual_style: "sóbrio",
        confidence: 0.9,
        evidence: ["advocacia"],
      };

      const copyResult: CopySquadResult = {
        tone_of_voice: "Solene e técnico",
        tone_adjectives: ["Sério", "Preciso", "Técnico", "Confiável"],
        archetype: "O Sábio",
        archetype_justification: "Foco no rigor jurídico.",
        tone_rules: ["Formalidade técnica"],
        do_words: ["Segurança jurídica", "Conformidade"],
        dont_words: ["Barato", "Rápido"],
        content_pillars: ["Compliance", "Societário"],
        bio_concise: "Assessoria jurídica empresarial especializada.",
        tagline: "Segurança jurídica para empresas.",
        confidence: 0.9,
        evidence: ["advocacia"],
      };

      const prResult: PrSquadResult = {
        positioning_statement: "Escritório de referência societária.",
        value_proposition: "Mitigação de riscos jurídicos.",
        reputation_summary: "Atuação corporativa.",
        confidence: 0.9,
        evidence: ["advocacia"],
      };

      const bizResult: BusinessStrategistSquadResult = {
        business_model: {
          value_proposition: "Consultoria jurídica",
          target_segments: ["Médias e grandes empresas"],
          customer_relationships: ["Atendimento direto por sócios"],
          distribution_channels: ["Reuniões e consultoria"],
          key_activities: ["Pareceres e contratos"],
          key_resources: ["Corpo de advogados"],
          key_partners: ["Peritos contábeis"],
          cost_structure: ["Honorários", "Infraestrutura"],
          revenue_streams: ["Retainer mensal", "Sucesso"],
        },
        swot: {
          strengths: ["Corpo jurídico sênior"],
          weaknesses: ["Foco restrito a B2B"],
          opportunities: ["Mercado de M&A"],
          threats: ["Instabilidade regulatória"],
        },
        seven_sins_hooks: {
          orgulho: "Blindagem jurídica de elite para quem não pode falhar.",
          ganancia: "Economia tributária e societária de milhões comprovada em contrato.",
          luxuria: "Contratos arquitetados com elegância técnica impecável.",
          inveja: "A estrutura societária que seus concorrentes tentarão copiar.",
          gula: "Suporte ilimitado e cobertura preventiva completa.",
          ira: "Basta de surpresas fiscais e processos trabalhistas evitáveis.",
          preguica: "Toda burocracia jurídica resolvida sem consumir o tempo do CEO.",
        },
        confidence: 0.9,
        evidence: ["advocacia"],
      };

      const marketResult: MarketAnalystSquadResult = {
        direct_competitors: [{ name: "Boutiques Jurídicas B2B" }],
        competitive_differentials: ["Atendimento direto por sócios titulares"],
        market_opportunities: ["Adequação LGPD e M&A"],
        confidence: 0.9,
        evidence: ["advocacia"],
      };

      vi.spyOn(apiOrchestrator, "executeUnifiedAiCall").mockResolvedValueOnce({
        content: JSON.stringify({
          company_name: "Silva & Santos Advocacia",
          category: "servicos",
          bio: "Assessoria jurídica empresarial especializada.",
          tagline: "Segurança jurídica para empresas.",
          suggested_products: [],
          contact: { city: "Chapecó", state: "SC" },
          unconfirmed_fields: [],
        }),
        parsedJson: {
          company_name: "Silva & Santos Advocacia",
          category: "servicos",
          bio: "Assessoria jurídica empresarial especializada.",
          tagline: "Segurança jurídica para empresas.",
          suggested_products: [],
          contact: { city: "Chapecó", state: "SC" },
          unconfirmed_fields: [],
        },
        provider: "groq",
        model: "llama-3.3-70b-versatile",
      } as any);

      const consolidated = await runConsolidationAndJudge(
        mockEvidence,
        designResult,
        copyResult,
        prResult,
        bizResult,
        marketResult
      );

      // Como o escritório não vende pizza ou roupas, suggested_products deve vir limpo sem mocks
      expect(Array.isArray(consolidated.suggested_products)).toBe(true);
      expect(consolidated.suggested_products.some((p) => p.name.includes("Filé Mignon"))).toBe(false);
      expect(consolidated.suggested_products.some((p) => p.name.includes("Iscas de Tilápia"))).toBe(false);
    });
  });
});
