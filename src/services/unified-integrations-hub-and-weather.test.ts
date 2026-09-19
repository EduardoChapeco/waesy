import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  executeUnifiedAiCall,
  getNextActiveKey,
  getSimLabKeyStatus,
} from "./api-orchestrator.functions";
import {
  internalGetCityWeather,
  internalConvertCurrency,
  internalLookupCnpj,
} from "./public-apis.functions";
import { internalTestSecretKeyConnection } from "./secret-vault.functions";

describe("Unified Integrations Hub, AI Orchestration & Real-time Weather Tests", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("1. Anthropic Claude Official Integration in executeUnifiedAiCall", () => {
    it("deve executar chamada nativa à Anthropic Messages API com headers corretos e extrair resposta", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        if (url.includes("api.anthropic.com/v1/messages")) {
          expect(opts.headers["x-api-key"]).toBe("sk-ant-test-key-12345");
          expect(opts.headers["anthropic-version"]).toBe("2023-06-01");
          expect(opts.headers["Content-Type"]).toBe("application/json");

          const parsedBody = JSON.parse(opts.body);
          expect(parsedBody.messages[0].content).toContain("Analise esta proposta");

          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: "msg_123",
              type: "message",
              role: "assistant",
              content: [{ type: "text", text: '{"analysis": "Aprovado com 100% de precisão"}' }],
            }),
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });

      const res = await executeUnifiedAiCall({
        preferredProvider: "anthropic",
        overrideApiKey: "sk-ant-test-key-12345",
        userPrompt: "Analise esta proposta de turismo internacional",
        responseFormat: "json_object",
      });

      expect(res.provider).toBe("anthropic");
      expect(res.content).toContain("Aprovado com 100% de precisão");
      expect(res.parsedJson?.analysis).toBe("Aprovado com 100% de precisão");
    });
  });

  describe("2. getNextActiveKey 3-Tier Resolution (BYOK -> Platform Pool -> Env Fallback)", () => {
    it("deve retornar chave do ambiente para Anthropic quando não há chave no banco", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-env-fallback-999";
      const key = await getNextActiveKey("anthropic");
      expect(key).not.toBeNull();
      expect(key?.rawKey).toBe("sk-ant-env-fallback-999");
      expect(key?.id).toBe("env-anthropic");
    });
  });

  describe("3. getCityWeather BFF Function (Regra 1 & 21)", () => {
    it("deve buscar clima via wttr.in e formatar WeatherForecastDTO com 3 dias", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("wttr.in")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              weather: [
                {
                  date: "2026-09-19",
                  maxtempC: "31",
                  mintempC: "23",
                  hourly: [{ weatherCode: "800", weatherDesc: [{ value: "Ensolarado" }] }, {}, {}, {}, { weatherCode: "800", weatherDesc: [{ value: "Céu Limpo" }] }],
                },
                {
                  date: "2026-09-20",
                  maxtempC: "29",
                  mintempC: "22",
                  hourly: [{ weatherCode: "801", weatherDesc: [{ value: "Parcialmente nublado" }] }, {}, {}, {}, { weatherCode: "801", weatherDesc: [{ value: "Parcialmente nublado" }] }],
                },
              ],
            }),
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });

      const res = await internalGetCityWeather("Fortaleza, CE");
      expect(res.city).toBe("Fortaleza, CE");
      expect(res.source).toBe("wttr_in");
      expect(res.days.length).toBeGreaterThanOrEqual(2);
      expect(res.days[0].day).toBe("Hoje");
      expect(res.days[0].maxTempC).toBe(31);
      expect(res.days[0].condition).toBe("sun");
    });

    it("deve realizar failover transparente para Open-Meteo se wttr.in falhar", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("wttr.in")) {
          return { ok: false, status: 503 } as Response;
        }
        if (url.includes("geocoding-api.open-meteo.com")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [{ latitude: -3.7319, longitude: -38.5267 }],
            }),
          } as Response;
        }
        if (url.includes("api.open-meteo.com/v1/forecast")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              daily: {
                time: ["2026-09-19", "2026-09-20"],
                temperature_2m_max: [30.5, 29.8],
                temperature_2m_min: [24.1, 23.9],
                weather_code: [1, 51],
              },
            }),
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });

      const res = await internalGetCityWeather("Gramado, RS");
      expect(res.city).toBe("Gramado, RS");
      expect(res.source).toBe("open_meteo");
      expect(res.days.length).toBe(2);
      expect(res.days[0].maxTempC).toBe(31);
    });
  });

  describe("4. convertCurrency Real-time Foreign Exchange", () => {
    it("deve converter valor de USD para BRL usando cotação da AwesomeAPI", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("economia.awesomeapi.com.br")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              USDBRL: {
                code: "USD",
                codein: "BRL",
                name: "Dólar Americano/Real Brasileiro",
                bid: "5.4500",
                create_date: "2026-09-18 16:00:00",
              },
            }),
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });

      const res = await internalConvertCurrency(1000, "USD", "BRL");

      expect(res.pair).toBe("USD-BRL");
      expect(res.rate).toBe(5.45);
      expect(res.convertedAmount).toBe(5450);
    });
  });

  describe("5. testSecretKeyConnection Live Pings", () => {
    it("deve testar e validar credencial OpenAI", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      } as Response);

      const res = await internalTestSecretKeyConnection("openai", "sk-proj-mocktest123");

      expect(res.success).toBe(true);
      expect(res.message).toContain("OpenAI ChatGPT estabelecida");
    });

    it("deve retornar erro claro se chave for rejeitada pela Anthropic", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Invalid API key" } }),
      } as Response);

      const res = await internalTestSecretKeyConnection("anthropic", "sk-ant-invalid");

      expect(res.success).toBe(false);
      expect(res.message).toContain("401");
    });
  });

  describe("6. Resilient CNPJ Lookup Fallback", () => {
    it("deve consultar CNPJ e executar fallback para ReceitaWS se BrasilAPI der erro", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("brasilapi.com.br")) {
          return { ok: false, status: 504 } as Response; // Gateway Timeout na BrasilAPI
        }
        if (url.includes("receitaws.com.br")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              status: "OK",
              nome: "EMPRESA DE TURISMO EXEMPLO LTDA",
              fantasia: "EXCELENCIA TOUR",
              situacao: "ATIVA",
              abertura: "01/01/2020",
              logradouro: "RUA DUQUE DE CAXIAS",
              numero: "100",
              bairro: "CENTRO",
              municipio: "SAO MIGUEL DO OESTE",
              uf: "SC",
              cep: "89900-000",
              atividade_principal: [{ code: "7911-2/00", text: "Agências de viagens" }],
            }),
          } as Response;
        }
        if (url.includes("nominatim.openstreetmap.org")) {
          return { ok: true, status: 200, json: async () => [] } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });

      // CNPJ válido: 00.000.000/0001-91
      const res = await internalLookupCnpj("00.000.000/0001-91");
      expect(res.cnpj).toBe("00000000000191");
      expect(res.corporateName).toBe("EMPRESA DE TURISMO EXEMPLO LTDA");
      expect(res.tradeName).toBe("EXCELENCIA TOUR");
      expect(res.registrationStatus).toBe("ATIVA");
      expect(res.address.city).toBe("SAO MIGUEL DO OESTE");
      expect(res.address.state).toBe("SC");
    });
  });
});
