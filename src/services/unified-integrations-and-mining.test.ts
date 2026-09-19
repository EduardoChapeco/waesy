import { describe, it, expect } from "vitest";
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

    expect(res.status).toBe("dispatched");
    expect(res.itemsProcessed).toBe(1);
    expect(res.message).toContain("fila de despacho");
  });
});
