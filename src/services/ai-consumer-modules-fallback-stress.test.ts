import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? schema.parse(args?.data) : args?.data;
        return fn({ data: validated });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

// Mock server access & tanstack start before imports
vi.mock("@/lib/server-access", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-001", store_id: "store-test-001" }),
  getServerIdentity: vi.fn().mockResolvedValue({ id: "admin-001", store_id: "store-test-001" }),
}));

const mockInsertedDocs: any[] = [];
const mockInsertedArtifacts: any[] = [];

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => {
      if (table === "experience_documents") {
        return {
          insert: (data: any) => {
            mockInsertedDocs.push(data);
            return {
              select: () => ({
                single: async () => ({
                  data: {
                    id: "doc-uuid-12345",
                    slug: data.slug,
                    title: data.title,
                    quality_score: data.quality_score,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            };
          },
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        };
      }
      if (table === "chat_artifacts") {
        return {
          insert: (data: any) => {
            mockInsertedArtifacts.push(data);
            return {
              select: () => ({
                single: async () => ({
                  data: {
                    id: "artifact-uuid-67890",
                    title: data.title,
                    version: 1,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      return {
        insert: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }),
      };
    },
  }),
}));

import { triageDataJudLawsuit, MinedLawsuitData } from "./mining/datajud-harvester";
import { generateAiBuilderArtifact } from "./ai-builder-composition.functions";
import { OmniPageDocumentSchema } from "@/types/omni-builder";

describe("Adversarial Stress Test: Fallback Resilience of Consumer Modules (R3)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockInsertedDocs.length = 0;
    mockInsertedArtifacts.length = 0;
  });

  // =========================================================================
  // 1. triageDataJudLawsuit Fallback Resilience
  // =========================================================================

  const mockLawsuitBase: MinedLawsuitData = {
    processNumber: "5009876-12.2024.8.24.0023",
    processNumberClean: "50098761220248240023",
    courtCode: "TJSC",
    courtName: "Tribunal de Justiça de Santa Catarina",
    className: "Execução Fiscal",
    subjectName: "Dívida Ativa Tributária",
    status: "Em Tramitação",
    priority: "Normal",
    parties: [{ name: "Município de Chapecó", role: "Exequente" }],
    lawyers: [{ name: "Dr. Procurador", oab: "12345", uf: "SC" }],
    movements: [{ movementDate: "2024-05-10", description: "Penhora de ativos via SISBAJUD determinada" }],
    source: "datajud",
    sourceUrl: "https://datajud.cnj.jus.br",
  };

  it("1.1 triageDataJudLawsuit: Quando AI sofre Network Error (fetch reject), executa fallback determinístico e seguro sem lançar exceção", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network timeout: connection refused to LLM provider"));

    const result = await triageDataJudLawsuit(mockLawsuitBase);

    expect(result).toBeDefined();
    expect(result.summary).toContain("5009876-12.2024.8.24.0023");
    expect(["baixo", "medio", "alto"]).toContain(result.riskLevel);
    // Execução fiscal com penhora no texto -> riskLevel medio ou alto
    expect(result.riskLevel).toBe("medio");
    // Compliance flags devem ser booleanas e seguras
    expect(typeof result.complianceFlags.has_arrest_warrants).toBe("boolean");
    expect(typeof result.complianceFlags.has_criminal_executions).toBe("boolean");
    expect(typeof result.complianceFlags.has_sanctions_restrictions).toBe("boolean");
    expect(result.complianceFlags.has_arrest_warrants).toBe(false);
    expect(result.recommendedAction).toBeDefined();
  });

  it("1.2 triageDataJudLawsuit: Quando AI retorna HTTP 500, ativa fallback e detecta mandado/prisão com risco alto", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Internal Server Error in model pipeline" } }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );

    const criminalLawsuit: MinedLawsuitData = {
      ...mockLawsuitBase,
      className: "Ação Penal - Procedimento Ordinário",
      subjectName: "Crimes contra o Patrimônio",
      lastMovementText: "Expedição de Mandado de Prisão preventiva contra o réu",
    };

    const result = await triageDataJudLawsuit(criminalLawsuit);

    expect(result).toBeDefined();
    expect(result.riskLevel).toBe("alto");
    expect(result.complianceFlags.has_arrest_warrants).toBe(true);
    expect(result.complianceFlags.has_criminal_executions).toBe(true);
    expect(result.recommendedAction).toBe("Acompanhar prazo processual prioritário.");
  });

  it("1.3 triageDataJudLawsuit: Quando AI retorna JSON truncado/inválido, o parse falha mas o fallback preserva flags seguras", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "{ invalid_json_syntax: true, summary: " } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const civilLawsuit: MinedLawsuitData = {
      ...mockLawsuitBase,
      className: "Procedimento Comum Cível",
      subjectName: "Indenização por Dano Moral",
      lastMovementText: "Juntada de Petição de contestação",
    };

    const result = await triageDataJudLawsuit(civilLawsuit);

    expect(result).toBeDefined();
    expect(result.riskLevel).toBe("baixo");
    expect(result.complianceFlags.has_arrest_warrants).toBe(false);
    expect(result.complianceFlags.has_criminal_executions).toBe(false);
    expect(result.complianceFlags.has_sanctions_restrictions).toBe(false);
    expect(result.recommendedAction).toBe("Monitoramento padrão.");
  });

  // =========================================================================
  // 2. generateAiBuilderArtifact Fallback Resilience
  // =========================================================================

  it("2.1 generateAiBuilderArtifact: Quando AI sofre Network Error (ECONNRESET), compõe fallback determinístico e persiste OmniPageDocument 100% válido", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET: socket hang up during generation"));

    const input = {
      briefing: "Escritório de advocacia empresarial de alto padrão com consultoria tributária e M&A.",
      storeName: "Vanguarda Jurídica",
      niche: "legal" as const,
      archetype: "site" as const,
      targetAudience: "Diretores jurídicos e CFOs de médias e grandes empresas",
    };

    const res = await (generateAiBuilderArtifact as any)({ data: input });

    expect(res).toBeDefined();
    expect(res.status).toBe("ok");
    expect(res.documentId).toBe("doc-uuid-12345");
    expect(res.qualityScore).toBeGreaterThanOrEqual(80);
    expect(res.canPublish).toBe(true);

    // Inspeciona o documento persistido no banco
    expect(mockInsertedDocs.length).toBe(1);
    const persisted = mockInsertedDocs[0];
    expect(persisted.document_type).toBe("site");
    expect(persisted.niche).toBe("legal");

    const omniDoc = persisted.settings.omni_page;
    expect(omniDoc).toBeDefined();

    // Validação empírica rigorosa com OmniPageDocumentSchema
    const parseResult = OmniPageDocumentSchema.safeParse(omniDoc);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.blocks.length).toBeGreaterThanOrEqual(4);
      expect(parseResult.data.theme.primaryColor).toBeDefined();
      expect(parseResult.data.slug).toContain("legal-site");
    }
  });

  it("2.2 generateAiBuilderArtifact: Quando AI retorna HTTP 503 com sobrecarga, o fallback gera artefato válido para todos os nichos", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 503, message: "Model is currently overloaded" } }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
    );

    const niches = ["gastronomy", "tourism", "real_estate", "health"] as const;

    for (const niche of niches) {
      mockInsertedDocs.length = 0;
      const res = await (generateAiBuilderArtifact as any)({
        data: {
          briefing: `Operação de excelência no nicho ${niche} com serviços completos e atendimento ágil.`,
          storeName: `Prime ${niche}`,
          niche,
          archetype: "landing",
        },
      });

      expect(res.status).toBe("ok");
      expect(mockInsertedDocs.length).toBe(1);
      const omniDoc = mockInsertedDocs[0].settings.omni_page;
      const parseResult = OmniPageDocumentSchema.safeParse(omniDoc);
      expect(parseResult.success).toBe(true);
      expect(omniDoc.blocks.length).toBeGreaterThan(0);
    }
  });

  it("2.3 generateAiBuilderArtifact: Quando AI retorna objeto JSON sem blocos ({ blocks: [] }), força fallback determinístico", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Página Vazia",
                  description: "Sem blocos válidos gerados",
                  blocks: [], // Array vazio inválido
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const res = await (generateAiBuilderArtifact as any)({
      data: {
        briefing: "Apresentação executiva para captação de clientes.",
        storeName: "Apex Consultoria",
        niche: "legal",
        archetype: "presentation",
      },
    });

    expect(res.status).toBe("ok");
    const omniDoc = mockInsertedDocs[0].settings.omni_page;
    // O fallback blueprint foi ativado e gerou blocos reais
    expect(omniDoc.blocks.length).toBeGreaterThanOrEqual(3);
    const parseResult = OmniPageDocumentSchema.safeParse(omniDoc);
    expect(parseResult.success).toBe(true);
  });
});
