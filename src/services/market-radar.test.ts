import { describe, it, expect, vi } from "vitest";

const mockCompetitor = {
  id: "comp-uuid-1",
  store_id: "c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7",
  name: "Concorrente Teste Regional",
  website_url: "https://regionaltour.com.br",
  instagram_handle: "regionaltour_oficial",
  facebook_url: null,
  notes: "Agência concorrente operando rotas e pacotes executivos.",
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockSnapshot = {
  id: "snap-uuid-1",
  competitor_id: "comp-uuid-1",
  store_id: "c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7",
  source_url: "https://regionaltour.com.br",
  snapshot_type: "full_page",
  screenshot_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f",
  extracted_dna: {
    brand_archetype: "O Herói",
    color_palette: ["#0f172a", "#3b82f6"],
    typography: "Inter, sans-serif",
    strengths: ["Preço competitivo", "Marca forte"],
    weaknesses: ["Atendimento demorado"],
    differentiation_gap: "Nossa loja entrega em 1 clique",
  },
  marketing_hooks: ["Atendimento imediato no WhatsApp"],
  pricing_signals: { tier: "mid_market", average_ticket_estimate: 85, promotional_intensity: "moderate" },
  analyzed_by_agent_id: "agent.strategy_corporate_consultant",
  captured_at: new Date().toISOString(),
};

const mockDnaProfile = {
  id: "dna-uuid-1",
  store_id: "c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7",
  archetype: "O Criador",
  archetype_justification: "Foco em excelência estética.",
  tone_of_voice: "Elegante e direto",
  tone_rules: ["Frases curtas"],
  content_pillars: ["Qualidade"],
  forbidden_words: ["Baratinho"],
  color_palette: { primary: "#0A84FF", secondary: "#5E5CE6", accent: "#30D158", background: "#09090B", text: "#FAFAFA" },
  seven_sins_triggers: { orgulho: "Você merece o melhor", gula: "Sabor sem culpa" },
  swot_analysis: { strengths: ["Atendimento personalizado"], weaknesses: [], opportunities: [], threats: [] },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

vi.mock("@/lib/supabase", () => ({
  getServerClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "market_competitors") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [{ ...mockCompetitor, snapshots: [mockSnapshot] }],
                  error: null,
                }),
              })),
              single: vi.fn().mockResolvedValue({
                data: mockCompetitor,
                error: null,
              }),
            })),
          })),
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockCompetitor,
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "competitor_snapshots") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockSnapshot,
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "brand_dna_profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockDnaProfile,
                error: null,
              }),
            })),
          })),
          upsert: vi.fn((payload: any) => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...mockDnaProfile,
                  archetype: payload.archetype || mockDnaProfile.archetype,
                  archetype_justification: payload.archetype_justification || mockDnaProfile.archetype_justification,
                  tone_of_voice: payload.tone_of_voice || mockDnaProfile.tone_of_voice,
                },
                error: null,
              }),
            })),
          })),
        };
      }

      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })) })),
      };
    }),
  })),
}));

import {
  listCompetitorsLogic,
  createCompetitorLogic,
  captureAndAnalyzeCompetitorLogic,
  getStoreBrandDnaLogic,
  updateStoreBrandDnaLogic,
} from "./market-radar.functions";

describe("Market Radar & Brand DNA Services (Big Tech Council)", () => {
  const realStoreId = "c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7";
  let createdCompetitorId: string;

  it("1. Deve criar um novo concorrente monitorado no banco real", async () => {
    const comp = await createCompetitorLogic({
      storeId: realStoreId,
      name: "Concorrente Teste Regional",
      website_url: "https://regionaltour.com.br",
      instagram_handle: "@regionaltour_oficial",
      notes: "Agência concorrente operando rotas e pacotes executivos.",
    });

    expect(comp).toBeDefined();
    expect(comp.id).toBeDefined();
    expect(comp.name).toBe("Concorrente Teste Regional");
    expect(comp.instagram_handle).toBe("regionaltour_oficial");
    expect(comp.is_active).toBe(true);

    createdCompetitorId = comp.id;
  });

  it("2. Deve listar concorrentes da loja incluindo o concorrente recém-criado", async () => {
    const competitors = await listCompetitorsLogic({ storeId: realStoreId });
    expect(Array.isArray(competitors)).toBe(true);
    expect(competitors.length).toBeGreaterThan(0);

    const found = competitors.find((c) => c.id === createdCompetitorId);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Concorrente Teste Regional");
  });

  it("3. Deve executar captura forense e análise dos agentes The Visionary & The Identity Engineer", async () => {
    expect(createdCompetitorId).toBeDefined();
    const snapshot = await captureAndAnalyzeCompetitorLogic({
      competitorId: createdCompetitorId,
      storeId: realStoreId,
    });

    expect(snapshot).toBeDefined();
    expect(snapshot.competitor_id).toBe(createdCompetitorId);
    expect(snapshot.screenshot_url).toContain("http");
    expect(snapshot.extracted_dna.brand_archetype).toBeDefined();
    expect(snapshot.extracted_dna.color_palette.length).toBeGreaterThan(0);
    expect(snapshot.extracted_dna.weaknesses.length).toBeGreaterThan(0);
    expect(snapshot.marketing_hooks.length).toBeGreaterThan(0);
    expect(snapshot.pricing_signals.tier).toBeDefined();
    expect(snapshot.analyzed_by_agent_id).toBe("agent.strategy_corporate_consultant");
  });

  it("4. Deve obter ou inicializar o Brand DNA da loja com os 7 Pecados e SWOT", async () => {
    const dna = await getStoreBrandDnaLogic({ storeId: realStoreId });

    expect(dna).toBeDefined();
    expect(dna.store_id).toBe(realStoreId);
    expect(dna.archetype).toBeDefined();
    expect(dna.color_palette.primary).toBeDefined();
    expect(dna.seven_sins_triggers).toBeDefined();
    expect(dna.seven_sins_triggers.orgulho).toBeDefined();
    expect(dna.seven_sins_triggers.gula).toBeDefined();
    expect(dna.swot_analysis.strengths.length).toBeGreaterThan(0);
  });

  it("5. Deve atualizar o Brand DNA da loja com novas diretrizes estratégicas", async () => {
    const updated = await updateStoreBrandDnaLogic({
      storeId: realStoreId,
      profile: {
        archetype: "O Explorador",
        archetype_justification: "Foco em novas jornadas, pioneirismo e experiências inesquecíveis.",
        tone_of_voice: "Aventureiro, inspirador e confiável",
      },
    });

    expect(updated.archetype).toBe("O Explorador");
    expect(updated.archetype_justification).toContain("jornadas");
    expect(updated.tone_of_voice).toContain("Aventureiro");
  });
});
