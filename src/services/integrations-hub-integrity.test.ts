import { describe, it, expect, vi } from "vitest";
import { verifyMarketplaceConnectorConnectivity } from "./marketplace-hub.functions";

describe("Microphase B — Hub de Integrações e Conectores", () => {
  it("rejeita Mercado Livre quando token retorna HTTP 401 sem cair em falso positivo", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "invalid_token" }),
    } as any);

    const res = await verifyMarketplaceConnectorConnectivity({
      platform: "mercadolivre",
      resolved: { isConfigured: true, accessToken: "APP_USR_invalid" },
      fetchImpl: mockFetch,
    });

    expect(res.success).toBe(false);
    expect(res.verifiedRemotely).toBe(true);
    expect(res.message).toMatch(/401/);
  });

  it("valida Mercado Livre quando HTTP 200 retorna dados reais da conta", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 99, nickname: "LOJA_OFICIAL" }),
    } as any);

    const res = await verifyMarketplaceConnectorConnectivity({
      platform: "mercadolivre",
      resolved: { isConfigured: true, accessToken: "APP_USR_valid" },
      fetchImpl: mockFetch,
    });

    expect(res.success).toBe(true);
    expect(res.verifiedRemotely).toBe(true);
    expect(res.message).toContain("LOJA_OFICIAL");
  });

  it("informa honestamente quando conector não possui verificação remota ao vivo", async () => {
    const res = await verifyMarketplaceConnectorConnectivity({
      platform: "shopee",
      resolved: { isConfigured: true, accessToken: "tok_123" },
    });

    expect(res.success).toBe(true);
    expect(res.verifiedRemotely).toBe(false);
    expect(res.message).toMatch(/não suportado diretamente/i);
  });

  it("retorna erro quando não há credencial configurada", async () => {
    const res = await verifyMarketplaceConnectorConnectivity({
      platform: "ifood",
      resolved: { isConfigured: false, accessToken: null },
    });

    expect(res.success).toBe(false);
    expect(res.verifiedRemotely).toBe(false);
  });
});
