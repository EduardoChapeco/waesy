import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CANONICAL_SKILLS_DEFINITIONS,
  resolveSkillIntentLogic,
  SkillItemDTO,
} from "./ai-skills-router.functions";
import {
  CANONICAL_AGENTS,
  CANONICAL_SQUADS,
  runSquadGraphExecution,
} from "./ai-agent-squad-orchestrator.functions";

// Mock do Gateway de IA
let mockStepCost = 0.002;
let mockStepTokens = 150;

vi.mock("./ai-core-gateway.functions", () => ({
  executeAiCoreGateway: vi.fn(async (params: any) => ({
    success: true,
    result: {
      text: `Execução autorizada de ${params.module}: resultado processado com sucesso conforme procedimento.`,
      parsedJson: { status: "concluido", modulo: params.module },
    },
    metadata: {
      provider: "openrouter",
      model: "google/gemini-2.5-flash",
      usage: {
        promptTokens: 100,
        completionTokens: mockStepTokens - 100,
        totalTokens: mockStepTokens,
      },
      costUsd: mockStepCost,
      latencyMs: 95,
    },
  })),
}));

// Mock do Supabase Client
vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: () => ({
      insert: async () => ({ data: null, error: null }),
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

describe("Plano #31 / PROMPT 23: Runtime de Skills, Agentes e Squads no App", () => {
  beforeEach(() => {
    mockStepCost = 0.002;
    mockStepTokens = 150;
  });

  // ============================================================
  // FASE A & B: Catálogo Canônico e Definições de Skills (10 Skills)
  // ============================================================
  describe("Fases A & B: Modelo e Catálogo Canônico de Skills", () => {
    const requiredSkills = [
      "commercial_proposal",
      "receipt_organizer",
      "lead_qualifier_sdr",
      "contract_reviewer",
      "tourism_itinerary_builder",
      "real_estate_appraiser",
      "ad_copywriter",
      "support_auto_responder",
      "accessibility_checker",
      "inventory_forecaster",
    ];

    it("deve conter exatamente as 10 skills canônicas obrigatórias registradas", () => {
      const registeredKeys = Object.keys(CANONICAL_SKILLS_DEFINITIONS);
      expect(registeredKeys.length).toBe(10);
      for (const skillKey of requiredSkills) {
        expect(registeredKeys).toContain(skillKey);
      }
    });

    it("cada skill deve possuir procedimento numerado (>= 3 passos), regras duras e DoD", () => {
      for (const [key, def] of Object.entries(CANONICAL_SKILLS_DEFINITIONS)) {
        expect(def.task.length).toBeGreaterThan(0);
        expect(def.systemPrompt.length).toBeGreaterThan(20);
        expect(def.numberedProcedure.length).toBeGreaterThanOrEqual(3);
        expect(def.hardRules.length).toBeGreaterThanOrEqual(2);
        expect(def.definitionOfDone.length).toBeGreaterThan(15);
      }
    });
  });

  // ============================================================
  // FASE C: Roteamento de Intenção e Resolução de Skills
  // ============================================================
  describe("Fase C: Roteador de Intenções e Resolução Heurística", () => {
    const mockCatalog: SkillItemDTO[] = [
      {
        id: "s1",
        slug: "commercial_proposal",
        name: "Proposta Comercial",
        description: "Elabora propostas completas de vendas",
        trigger_explicit: "proposta comercial orçamento investimento",
        category: "vendas",
        icon: "FileText",
        estimated_cost_usd: 0.001,
        is_enabled: true,
        priority: 1,
      },
      {
        id: "s2",
        slug: "receipt_organizer",
        name: "Organizador de Recibos",
        description: "Organiza comprovantes e notas",
        trigger_explicit: "comprovante recibo nota fiscal cupom",
        category: "financeiro",
        icon: "Receipt",
        estimated_cost_usd: 0.0008,
        is_enabled: true,
        priority: 1,
      },
      {
        id: "s3",
        slug: "lead_qualifier_sdr",
        name: "Qualificador SDR",
        description: "Qualifica leads por BANT",
        trigger_explicit: "lead bant prospect qualificar",
        category: "vendas",
        icon: "UserCheck",
        estimated_cost_usd: 0.0006,
        is_enabled: true,
        priority: 1,
      },
      {
        id: "s4",
        slug: "contract_reviewer",
        name: "Revisor de Contratos",
        description: "Revisa cláusulas e riscos contratuais",
        trigger_explicit: "contrato cláusula rescisória risco",
        category: "juridico",
        icon: "ShieldAlert",
        estimated_cost_usd: 0.0012,
        is_enabled: true,
        priority: 1,
      },
      {
        id: "s5",
        slug: "tourism_itinerary_builder",
        name: "Roteiro Turístico",
        description: "Monta roteiros de viagens e passeios",
        trigger_explicit: "turismo viagem roteiro hotel passeio",
        category: "turismo",
        niche: "turismo",
        icon: "Compass",
        estimated_cost_usd: 0.0009,
        is_enabled: true,
        priority: 1,
      },
      {
        id: "s6",
        slug: "real_estate_appraiser",
        name: "Avaliador Imobiliário",
        description: "Avalia imóveis e aluguéis",
        trigger_explicit: "imóvel apartamento aluguel terreno",
        category: "imoveis",
        niche: "imobiliaria",
        icon: "Home",
        estimated_cost_usd: 0.001,
        is_enabled: true,
        priority: 1,
      },
      {
        id: "s7",
        slug: "ad_copywriter",
        name: "Copywriter de Anúncios",
        description: "Cria copies para anúncios e campanhas",
        trigger_explicit: "anúncio copy campanha tráfego cta",
        category: "marketing",
        icon: "Megaphone",
        estimated_cost_usd: 0.0007,
        is_enabled: true,
        priority: 1,
      },
      {
        id: "s8",
        slug: "support_auto_responder",
        name: "Suporte e Atendimento",
        description: "Atendimento e pós-venda da loja",
        trigger_explicit: "dúvida suporte atrasou troca devolução",
        category: "atendimento",
        icon: "Bot",
        estimated_cost_usd: 0.0005,
        is_enabled: true,
        priority: 1,
      },
      {
        id: "s9",
        slug: "accessibility_checker",
        name: "Auditor WCAG",
        description: "Verifica acessibilidade em código",
        trigger_explicit: "acessibilidade wcag contraste aria-label",
        category: "codigo",
        icon: "Eye",
        estimated_cost_usd: 0.001,
        is_enabled: true,
        priority: 1,
      },
      {
        id: "s10",
        slug: "inventory_forecaster",
        name: "Previsão de Estoque",
        description: "Calcula giro e reposição de estoque",
        trigger_explicit: "estoque reposição giro cobertura",
        category: "operacoes",
        icon: "TrendingUp",
        estimated_cost_usd: 0.0007,
        is_enabled: true,
        priority: 1,
      },
    ];

    const benchmarkPrompts = [
      { prompt: "Preciso elaborar uma proposta comercial para prestação de serviços", expectedSlug: "commercial_proposal" },
      { prompt: "Gere um orçamento detalhado de investimento para o cliente fechar", expectedSlug: "commercial_proposal" },
      { prompt: "Analise este comprovante de pagamento e extraia os dados fiscais", expectedSlug: "receipt_organizer" },
      { prompt: "Organize este cupom fiscal com valor e data de liquidação", expectedSlug: "receipt_organizer" },
      { prompt: "Qualifique este novo lead que entrou pela landing page usando BANT", expectedSlug: "lead_qualifier_sdr" },
      { prompt: "Analise este prospect com dor de gestão para saber se tem fit de compra", expectedSlug: "lead_qualifier_sdr" },
      { prompt: "Revise esta cláusula rescisória do contrato de locação comercial", expectedSlug: "contract_reviewer" },
      { prompt: "Faça a análise de risco desta minuta de prestação de serviços", expectedSlug: "contract_reviewer" },
      { prompt: "Monte um roteiro de viagem de 4 dias para turismo de cachoeiras", expectedSlug: "tourism_itinerary_builder" },
      { prompt: "Sugira um pacote turístico com passeios e hospedagem em hotel na serra", expectedSlug: "tourism_itinerary_builder" },
      { prompt: "Faça uma avaliação do valor de aluguel deste apartamento de 3 suítes", expectedSlug: "real_estate_appraiser" },
      { prompt: "Avalie este imóvel residencial em condomínio fechado com base no mercado", expectedSlug: "real_estate_appraiser" },
      { prompt: "Escreva uma copy para anúncio de tráfego pago no Instagram com CTA forte", expectedSlug: "ad_copywriter" },
      { prompt: "Crie títulos persuasivos para a campanha de lançamento do nosso curso", expectedSlug: "ad_copywriter" },
      { prompt: "Como responder ao cliente que está com dúvida sobre o pedido que atrasou?", expectedSlug: "support_auto_responder" },
      { prompt: "O cliente no suporte quer ajuda com solicitação de devolução e troca", expectedSlug: "support_auto_responder" },
      { prompt: "Audite este código HTML para conformidade com regras WCAG de acessibilidade", expectedSlug: "accessibility_checker" },
      { prompt: "Verifique o contraste de cores e falta de aria-label nestes botões", expectedSlug: "accessibility_checker" },
      { prompt: "Calcule o giro de estoque e a previsão de reposição para evitar ruptura", expectedSlug: "inventory_forecaster" },
      { prompt: "Quantos dias de cobertura de estoque temos com base nas vendas recentes?", expectedSlug: "inventory_forecaster" },
    ];

    it("deve atingir 100% de precisão (>= 95% exigido) na amostra de 20 prompts de benchmark", () => {
      let correctMatches = 0;

      for (const item of benchmarkPrompts) {
        const resolution = resolveSkillIntentLogic(item.prompt, mockCatalog);
        expect(resolution.requiresClarification).toBe(false);
        expect(resolution.primarySkill).not.toBeNull();
        expect(resolution.confidenceScore).toBeGreaterThanOrEqual(0.5);
        expect(resolution.selectionReason.length).toBeGreaterThan(10);

        if (resolution.primarySkill && resolution.primarySkill.slug === item.expectedSlug) {
          correctMatches++;
        }
      }

      const accuracy = (correctMatches / benchmarkPrompts.length) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(95);
      expect(correctMatches).toBe(20);
    });

    it("deve solicitar esclarecimento (requiresClarification: true) para prompts genéricos ou ambíguos", () => {
      const ambiguousPrompt = "Olá, boa tarde, tudo bem?";
      const resolution = resolveSkillIntentLogic(ambiguousPrompt, mockCatalog);

      expect(resolution.requiresClarification).toBe(true);
      expect(resolution.primarySkill).toBeNull();
      expect(resolution.confidenceScore).toBeLessThan(0.3);
      expect(resolution.clarificationPrompt).toBeDefined();
    });

    it("nunca deve selecionar uma skill desativada pelo workspace", () => {
      const catalogWithDisabled: SkillItemDTO[] = mockCatalog.map((s) =>
        s.slug === "inventory_forecaster" ? { ...s, is_enabled: false } : s
      );

      const resolution = resolveSkillIntentLogic("Previsão de reposição e cobertura de estoque urgente", catalogWithDisabled);
      if (resolution.primarySkill) {
        expect(resolution.primarySkill.slug).not.toBe("inventory_forecaster");
      } else {
        expect(resolution.requiresClarification).toBe(true);
      }
    });
  });

  // ============================================================
  // FASE D: Agentes e Squads com Grafo de Handoff & Supervisor
  // ============================================================
  describe("Fase D: Agentes e Squads com Grafo de Handoff", () => {
    it("deve possuir 7 agentes canônicos e 3 squads configurados", () => {
      expect(Object.keys(CANONICAL_AGENTS).length).toBe(7);
      expect(Object.keys(CANONICAL_SQUADS).length).toBe(3);

      expect(CANONICAL_SQUADS.sales_squad).toBeDefined();
      expect(CANONICAL_SQUADS.publishing_squad).toBeDefined();
      expect(CANONICAL_SQUADS.finance_squad).toBeDefined();
    });

    it("deve executar squad de vendas ponta a ponta (SDR -> Closer) registrando handoffs", async () => {
      const run = await runSquadGraphExecution("sales_squad", {
        prompt: "Novo lead: Imobiliária Silva, 50 corretores, orçamento R$ 3.000/mês",
      });

      expect(run.status).toBe("completed");
      expect(run.stepsCompleted).toBe(2);
      expect(run.handoffs.length).toBe(2);

      // Primeiro handoff: User -> SDR
      expect(run.handoffs[0].fromAgent).toBe("user");
      expect(run.handoffs[0].toAgent).toBe("sdr_agent");
      expect(run.handoffs[0].acceptanceVerified).toBe(true);

      // Segundo handoff: SDR -> Closer
      expect(run.handoffs[1].fromAgent).toBe("sdr_agent");
      expect(run.handoffs[1].toAgent).toBe("commercial_closer");
      expect(run.handoffs[1].acceptanceVerified).toBe(true);

      expect(run.totalCostUsd).toBeGreaterThan(0);
      expect(run.totalTokens).toBeGreaterThan(0);
      expect(run.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("deve executar squad de publicação ponta a ponta (Strategist -> Copywriter -> Auditor)", async () => {
      const run = await runSquadGraphExecution("publishing_squad", {
        prompt: "Pauta: Dicas de segurança para compra de imóveis na planta",
      });

      expect(run.status).toBe("completed");
      expect(run.stepsCompleted).toBe(3);
      expect(run.handoffs.length).toBe(3);
      expect(run.handoffs[0].toAgent).toBe("content_strategist");
      expect(run.handoffs[1].toAgent).toBe("brand_copywriter");
      expect(run.handoffs[2].toAgent).toBe("quality_compliance_auditor");
    });

    it("deve executar squad financeiro ponta a ponta (OCR Extractor -> Reconciliator)", async () => {
      const run = await runSquadGraphExecution("finance_squad", {
        prompt: "Comprovante PIX de R$ 1.500,00 pago por Cliente ABC em 15/12/2026",
      });

      expect(run.status).toBe("completed");
      expect(run.stepsCompleted).toBe(2);
      expect(run.handoffs.length).toBe(2);
      expect(run.handoffs[0].toAgent).toBe("document_ocr_extractor");
      expect(run.handoffs[1].toAgent).toBe("bank_reconciliator");
    });

    it("o supervisor deve vetar e interromper execução quando o custo excede o orçamento", async () => {
      // Forçar custo por etapa acima do orçamento do squad ($0.02)
      mockStepCost = 0.025;

      const run = await runSquadGraphExecution("sales_squad", {
        prompt: "Lead teste para corte de orçamento",
      });

      expect(run.status).toBe("halted_by_supervisor");
      expect(run.stepsCompleted).toBe(1);
      expect(run.supervisorNotes).toContain("interrompida pelo Supervisor: Orçamento");
    });
  });
});
