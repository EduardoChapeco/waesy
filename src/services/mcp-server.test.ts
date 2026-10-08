import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MCP_TOOLS_MANIFEST,
  MCP_RESOURCES_MANIFEST,
  MCP_PROMPTS_MANIFEST,
  getMcpToolsManifest,
  getMcpResourcesManifest,
  getMcpPromptsManifest,
  getMcpPrompt,
  executeMcpToolCall,
} from "./mcp-server.functions";
import { MCP_TOOL_REGISTRY, getAllMcpTools, getMcpToolsByModule } from "@/registries/mcp-tool-registry";

vi.mock("@/services/market-radar.functions", () => ({
  captureAndAnalyzeCompetitorLogic: vi.fn(async () => ({
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    competitor_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    store_id: "a1111111-1111-4111-8111-111111111111",
    source_url: "https://public.example.test",
    snapshot_type: "full_page",
    screenshot_url: null,
    extracted_dna: { brand_archetype: "", color_palette: [], typography: "", strengths: [], weaknesses: [], differentiation_gap: "" },
    marketing_hooks: [],
    pricing_signals: { tier: null, average_ticket_estimate: null, promotional_intensity: null },
    analyzed_by_agent_id: null,
    analysis_status: "ai_generated_draft",
    source_evidence: { source_url: "https://public.example.test" },
    ai_provider: "test-provider",
    ai_model: "test-model",
    captured_at: new Date().toISOString(),
  })),
}));

vi.mock("@/services/api-orchestrator.functions", () => ({
  executeUnifiedAiCall: vi.fn(async () => ({
    parsedJson: {
      campaign_name: "Campanha de teste",
      objective: "Explorar uma hipótese de comunicação informada pelo usuário.",
      audience_hypotheses: ["Hipótese a validar; não representa dado de audiência."],
      channel_approach: "Rascunho sujeito à configuração real do canal.",
      creative_angles: ["Ângulo qualitativo para revisão humana."],
      measurement_plan: ["Validar com resultados observados."],
      unknowns: ["Alcance e performance não foram estimados."],
      requires_human_review: true,
    },
    provider: "test-provider",
    model: "test-model",
  })),
}));

describe("MCP Server & WebMCP Autonomous Surface Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("FASE A & B: Tool Registry & Domain Derivation", () => {
    it("should register all derived domain tools in the SSOT registry", () => {
      const allTools = getAllMcpTools();
      expect(allTools.length).toBeGreaterThanOrEqual(28);
      expect(MCP_TOOLS_MANIFEST.length).toBeGreaterThanOrEqual(28);
    });

    it("should cover all priority business modules without gaps", () => {
      const requiredModules = [
        "catalog",
        "directory",
        "logistics",
        "orders",
        "scheduling",
        "tourism",
        "proposals",
        "contracts",
        "financial",
        "hr",
        "marketing",
        "fiscal",
        "integrations",
        "support",
      ];

      for (const mod of requiredModules) {
        const toolsInModule = getMcpToolsByModule(mod as any);
        expect(toolsInModule.length).toBeGreaterThan(0);
      }
    });

    it("every tool must have name, module, description, tier, and valid JSON Schema", () => {
      for (const tool of getAllMcpTools()) {
        expect(tool.name).toBeDefined();
        expect(tool.module).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(15);
        expect(["public", "store_staff", "admin_only"]).toContain(tool.tier);
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(typeof tool.handler).toBe("function");
      }
    });
  });

  describe("FASE C: Multi-Tenant Isolation & AI-Guards", () => {
    it("should block store_staff tools when storeId is missing", async () => {
      const result = await executeMcpToolCall({
        tool: "orders_get_order_details",
        arguments: {
          orderId: "a1111111-1111-4111-8111-111111111111",
        },
      });

      expect(result.status).toBe("error");
      expect(result.content[0].text).toContain("exige contexto de loja");
      expect(result.executionMetrics?.tenantValidated).toBe(false);
    });

    it("should reject unrecognized tools with canonical guidance message", async () => {
      const result = await executeMcpToolCall({
        tool: "non_existent_unregistered_tool",
        arguments: {},
      });

      expect(result.status).toBe("error");
      expect(result.content[0].text).toContain("Tool não reconhecida no protocolo WebMCP");
    });

    it("should validate input schema with Zod and return clear diagnostic", async () => {
      const result = await executeMcpToolCall({
        tool: "check_delivery_coverage",
        arguments: {
          cep: "123", // CEP inválido (menos de 8 dígitos)
        },
      });

      expect(result.status).toBe("error");
      expect(result.content[0].text).toContain("Parâmetros inválidos");
    });
  });

  describe("FASE D: Protocol Execution & Handlers", () => {
    it("should execute check_delivery_coverage and calculate multi-modal shipping", async () => {
      const result = await executeMcpToolCall({
        tool: "check_delivery_coverage",
        arguments: {
          cep: "89801000",
        },
      });

      expect(result.status).toBe("success");
      expect(result.content[0].type).toBe("json");
      const data = result.content[0].data;
      expect(data.cep).toBe("89801000");
      expect(data.eligible).toBe(true);
      expect(data.options.length).toBe(3);
      expect(data.options[0].modal).toContain("MotoLink");
    });

    it("should execute analyze_competitor_dna with a registered source and return a draft without fabricated scores", async () => {
      const result = await executeMcpToolCall({
        tool: "analyze_competitor_dna",
        storeId: "a1111111-1111-4111-8111-111111111111",
        arguments: {
          storeId: "a1111111-1111-4111-8111-111111111111",
          competitorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        },
      });

      expect(result.status).toBe("success");
      const data = result.content[0].data;
      expect(data.record_kind).toBe("competitor_ai_draft");
      expect(data.analysisStatus).toBe("ai_generated_draft");
      expect(data.positioningScore).toBeUndefined();
      expect(data.pricingSignals.average_ticket_estimate).toBeNull();
      expect(data.provenance.model).toBe("test-model");
    });

    it("should execute generate_ad_campaign_proposal without reporting budget-derived impressions as data", async () => {
      const result = await executeMcpToolCall({
        tool: "generate_ad_campaign_proposal",
        storeId: "a1111111-1111-4111-8111-111111111111",
        arguments: {
          storeId: "a1111111-1111-4111-8111-111111111111",
          naturalLanguagePrompt: "Campanha especial dia das mães",
          dailyBudgetCents: 5000,
        },
      });

      expect(result.status).toBe("success");
      const data = result.content[0].data;
      expect(data.record_kind).toBe("llm_generated_campaign_proposal_draft");
      expect(data.estimatedImpressionsPerDay).toBeUndefined();
      expect(data.performance_estimates).toBeNull();
      expect(data.provenance.model).toBe("test-model");
      expect(data.proposal.requires_human_review).toBe(true);
    });

    it("should execute scheduling_list_available_slots and return calendar slots", async () => {
      const result = await executeMcpToolCall({
        tool: "scheduling_list_available_slots",
        arguments: {
          storeId: "a1111111-1111-4111-8111-111111111111",
          date: "2026-10-15",
        },
      });

      expect(result.status).toBe("success");
      const data = result.content[0].data;
      expect(data.date).toBe("2026-10-15");
      expect(data.availableSlots.length).toBeGreaterThan(5);
    });
  });

  describe("FASE D: MCP Resources & Prompts Protocol", () => {
    it("should expose canonical resources manifest", async () => {
      const resources = getMcpResourcesManifest();
      expect(resources.length).toBe(4);
      expect(resources.some((r) => r.uri.includes("/catalog"))).toBe(true);
      expect(resources.some((r) => r.uri.includes("/financial-summary"))).toBe(true);
      expect(resources.some((r) => r.uri.includes("/tourism-manifest"))).toBe(true);
    });

    it("should expose canonical prompts manifest", async () => {
      const prompts = getMcpPromptsManifest();
      expect(prompts.length).toBe(3);
      expect(prompts.some((p) => p.name === "customer_inquiry_assistant")).toBe(true);
      expect(prompts.some((p) => p.name === "product_recommendation_prompt")).toBe(true);
      expect(prompts.some((p) => p.name === "tourism_trip_briefing")).toBe(true);
    });

    it("should retrieve and render a prompt template with provided arguments", async () => {
      const rendered = await getMcpPrompt("customer_inquiry_assistant", {
        storeName: "Padaria Central",
        customerQuestion: "Vocês aceitam encomenda de torta?",
      });

      expect(rendered.prompt).toContain("Padaria Central");
      expect(rendered.prompt).toContain("Vocês aceitam encomenda de torta?");
    });
  });
});
