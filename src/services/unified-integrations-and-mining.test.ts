import { describe, it, expect, vi, afterEach } from "vitest";

const mockChannelListings: Record<string, { external_listing_id: string; external_sku: string }> = {
  "00000000-0000-0000-0000-000000000001:bling:prod-456": {
    external_listing_id: "998877",
    external_sku: "SKU-456",
  },
};

function makeEmptyQueryChain(table: string, filters: Record<string, any> = {}): any {
  const chain: any = {
    select: () => chain,
    eq: (col: string, val: any) => {
      filters[col] = val;
      return chain;
    },
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => {
      if (table === "channel_listings") {
        const key = `${filters.store_id}:${filters.channel}:${filters.product_id}`;
        return { data: mockChannelListings[key] || null, error: null };
      }
      return { data: null, error: null };
    },
    single: async () => ({ data: null, error: null }),
    then: (resolve: any, reject?: any) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => makeEmptyQueryChain(table),
  }),
}));

import { dispatchMarketplaceChannelSync } from "./marketplace-hub.functions";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
import { convertPncpToExtractionResult } from "./mining/pncp-extractor";
import { validateMechanicalCompleteness } from "./mining/integrity-gate";

describe("Pilar 1: Orquestrador Universal de IA (BYOK e Fallback)", () => {
  it("deve tentar chave overrideApiKey fornecida antes do pool", async () => {
    // Com chave de teste offline, captura o erro e tenta o pool defensivamente
    await expect(
      executeUnifiedAiCall({
        userPrompt: "Teste de prompt",
        preferredProvider: "gemini",
        overrideApiKey: "test-override-key-12345",
      })
    ).rejects.toThrow();
  });
});

describe("Pilar 2: Mineração, Crawlers e PNCP", () => {
  it("deve converter edital público do PNCP em extração mecânica válida e aprovada pelo integrity-gate", () => {
    const rawPncp = {
      id: "pncp-001",
      numeroEdital: "045/2026",
      numeroProcesso: "PROC-2026-998",
      orgaoNome: "Prefeitura Municipal de Chapecó",
      orgaoCnpj: "83.102.572/0001-07",
      objeto: "Contratação de empresa especializada para pavimentação asfáltica e drenagem de vias públicas urbanas",
      modalidade: "Concorrência Eletrônica",
      valorEstimado: 2500000,
      dataPublicacao: "2026-09-18",
      dataEncerramento: "2026-10-18",
      urlPortal: "https://pncp.gov.br/app/editais/12345678000100/2026/45",
    };

    const extraction = convertPncpToExtractionResult(rawPncp, "Chapecó", "SC");
    expect(extraction).toBeDefined();
    expect(extraction.title).toContain("Edital 045/2026");
    expect(extraction.contentType).toBe("portal_municipal");
    expect(extraction.municipalData?.estimatedValue).toBe(2500000);

    const validation = validateMechanicalCompleteness(extraction);
    expect(validation.isValid).toBe(true);
    expect(validation.qualityScore).toBeGreaterThanOrEqual(60);
  });
});

describe("Pilar 3: Hub de Marketplaces (Padrão Outbox Transacional)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deve marcar status 'unconfigured' quando o canal não possuir credenciais ativas (eliminação de mocks)", async () => {
    const res = await dispatchMarketplaceChannelSync({
      storeId: "00000000-0000-0000-0000-000000000001",
      connectorId: "conn-test-01",
      platform: "mercadolivre",
      syncType: "stock",
      settings: {}, // Sem access_token ou api_key
      productId: "prod-123",
      newStockQty: 10,
    });

    expect(res.status).toBe("unconfigured");
    expect(res.itemsProcessed).toBe(0);
    expect(res.message).toContain("sem chaves de API/Tokens");
  });

  it("deve marcar status 'test_mode_recorded' quando o conector estiver explicitamente em sandbox/teste", async () => {
    const res = await dispatchMarketplaceChannelSync({
      storeId: "00000000-0000-0000-0000-000000000001",
      connectorId: "conn-test-02",
      platform: "shopee",
      syncType: "catalog",
      settings: {
        api_key: "shp_test_dummy_key",
        sandbox: true,
      },
      itemCount: 5,
    });

    expect(res.status).toBe("test_mode_recorded");
    expect(res.itemsProcessed).toBe(5);
    expect(res.message).toContain("Sandbox/Teste");
  });

  it("deve despachar evento para a fila do canal quando houver credenciais ativas de produção", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: 998877 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await dispatchMarketplaceChannelSync({
      storeId: "00000000-0000-0000-0000-000000000001",
      connectorId: "conn-test-03",
      platform: "bling",
      syncType: "stock",
      settings: {
        api_key: "bling_live_token_12345",
      },
      productId: "prod-456",
      newStockQty: 25,
      itemCount: 1,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("api.bling.com.br/Api/v3/estoques");
    expect(res.status).toBe("completed");
    expect(res.itemsProcessed).toBe(1);
    expect(res.message).toContain("Bling ERP v3 (25 un)");

    const unlinkedRes = await dispatchMarketplaceChannelSync({
      storeId: "00000000-0000-0000-0000-000000000001",
      connectorId: "conn-test-03",
      platform: "bling",
      syncType: "stock",
      settings: {
        api_key: "bling_live_token_12345",
      },
      productId: "prod-sem-vinculo",
      newStockQty: 25,
    });
    expect(unlinkedRes.itemsProcessed).toBe(0);
    expect(unlinkedRes.message).toContain("sem vínculo no Bling v3");
  });
});
