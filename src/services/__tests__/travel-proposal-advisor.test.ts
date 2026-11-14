import fs from "fs";
import path from "path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TravelProposalDTO } from "../travel-proposal.functions";
import {
  buildFullProposalAdvisorContext,
  extractHotelLookupTarget,
  isSafePublicHttpUrl,
  normalizeHotelLookupName,
  resolveHotelAndDestinationPublicContext,
} from "../travel-advisor-enrichment.server";

const { mockGetServerClient, mockExecuteUnifiedAiCall } = vi.hoisted(() => ({
  mockGetServerClient: vi.fn(),
  mockExecuteUnifiedAiCall: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({
      handler: (fn: any) => fn,
    }),
    handler: (fn: any) => fn,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => mockGetServerClient(),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => null),
  requireStaff: vi.fn(async () => ({ id: "staff-1", store_id: "store-1" })),
}));

vi.mock("../api-orchestrator.functions", () => ({
  executeUnifiedAiCall: (...args: any[]) => mockExecuteUnifiedAiCall(...args),
}));

vi.mock("../secret-vault.functions", () => ({
  getActiveSecretForProvider: vi.fn(async () => null),
}));

function buildSampleProposal(overrides: Partial<TravelProposalDTO> = {}): TravelProposalDTO {
  return {
    id: "prop-1",
    store_id: "11111111-1111-4111-8111-111111111111",
    agency_name: "Excelência Tour São Miguel do Oeste",
    agency_whatsapp: "5549999990000",
    quote_id: "quote-1",
    public_token: "tok-porto-seguro",
    title: "Proposta Porto Seguro",
    client_name: "Estevan",
    client_whatsapp: "5549988887777",
    adults_count: 3,
    children_count: 0,
    canvas_format: "a4-portrait",
    template_theme: "editorial-flat",
    destination_city: "Porto Seguro",
    travel_start_date: "2027-08-23",
    travel_end_date: "2027-08-28",
    flights: [
      {
        leg: "Ida",
        airline_name: "Latam",
        flight_number: "LA3412",
        origin_iata: "XAP",
        destination_iata: "BPS",
        departure_date: "2027-08-23",
        departure_time: "03:50",
        arrival_time: "09:20",
        baggage_included: "1 mala despachada 23kg + mão 10kg",
      },
    ],
    hotels: [
      {
        hotel_name: "Portal Beach Hotel - Rede Soberano",
        destination: "Porto Seguro",
        board_basis: "Meia Pensão",
        room_type: "Apartamento Standard Triplo",
        stars: 4,
        nights_count: 5,
      },
    ],
    itinerary: [
      {
        day_number: 1,
        title: "Chegada e Orla Norte",
        description: "Recepção no aeroporto de Porto Seguro e traslado até a Praia de Taperapuã.",
        location: "Taperapuã, Porto Seguro",
      },
    ],
    transfers: [{ type: "Aeroporto BPS -> Hotel", vehicle: "Van Privativa" }],
    tours: [{ title: "Passeio Histórico Cidade Alta", included: true }],
    rooms: [],
    includes: ["Aéreo ida e volta", "5 diárias com café e jantar", "Traslado de chegada e saída"],
    excludes: ["Passeios opcionais", "Despesas pessoais"],
    pricing: {
      currency: "BRL",
      base_price_cents: 720000,
      boarding_tax_cents: 79130,
      other_taxes_cents: 0,
      discount_cents: 0,
      total_price_cents: 799130,
      installments_options: [
        { installments_count: 1, installment_value_cents: 759174, method: "PIX" },
        { installments_count: 10, installment_value_cents: 79913, method: "Cartão", has_interest: false },
      ],
      payment_terms: "Entrada via PIX ou em até 10x sem juros no cartão.",
    },
    status: "sent",
    created_at: "2026-11-14T10:00:00Z",
    updated_at: "2026-11-14T10:00:00Z",
    ...overrides,
  };
}

describe("Consultor IA da Proposta — Enriquecimento Público, Cidade do Hotel, Website e Grounding Web", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normaliza nome do hotel e identifica cidade corretamente mesmo com sufixo de rede", () => {
    const normalized = normalizeHotelLookupName("Portal Beach Hotel - Rede Soberano");
    expect(normalized.rawHotelName).toBe("Portal Beach Hotel - Rede Soberano");
    expect(normalized.coreHotelName).toBe("Portal Beach Hotel");

    const proposal = buildSampleProposal();
    const target = extractHotelLookupTarget(proposal);
    expect(target?.coreHotelName).toBe("Portal Beach Hotel");
    expect(target?.destinationCity).toBe("Porto Seguro");
  });

  it("bloqueia URLs SSRF privadas/localhost e libera URLs públicas https/http válidas", () => {
    expect(isSafePublicHttpUrl("https://portalbeach.com.br")).toBe("https://portalbeach.com.br/");
    expect(isSafePublicHttpUrl("redesoberano.com.br/portal-beach")).toBe("https://redesoberano.com.br/portal-beach");
    expect(isSafePublicHttpUrl("http://127.0.0.1:8080/admin")).toBeNull();
    expect(isSafePublicHttpUrl("http://localhost:3000")).toBeNull();
    expect(isSafePublicHttpUrl("http://169.254.169.254/latest/meta-data")).toBeNull();
    expect(isSafePublicHttpUrl("http://10.0.0.5")).toBeNull();
    expect(isSafePublicHttpUrl("http://192.168.1.1")).toBeNull();
    expect(isSafePublicHttpUrl("file:///etc/passwd")).toBeNull();
  });

  it("pesquisa Nominatim, visita o site oficial do hotel, consulta Wikipedia e busca clima histórico Open-Meteo", async () => {
    const proposal = buildSampleProposal();
    const mockFetch = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("nominatim.openstreetmap.org") && url.includes("Portal")) {
        return new Response(
          JSON.stringify([
            {
              name: "Portal Beach Hotel",
              category: "tourism",
              type: "hotel",
              lat: "-16.4125",
              lon: "-39.0485",
              display_name: "Portal Beach Hotel, Avenida Beira Mar, Mundaí, Porto Seguro, Bahia, Brasil",
              address: {
                road: "Avenida Beira Mar",
                suburb: "Mundaí",
                city: "Porto Seguro",
                state: "Bahia",
              },
              extratags: {
                website: "https://www.portalbeachhotel.com.br",
              },
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("nominatim.openstreetmap.org")) {
        return new Response(
          JSON.stringify([
            {
              name: "Porto Seguro",
              lat: "-16.4497",
              lon: "-39.0647",
              address: { city: "Porto Seguro", state: "Bahia" },
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("portalbeachhotel.com.br")) {
        return new Response(
          `<!doctype html><html><head>
            <title>Portal Beach Hotel - Rede Soberano | Porto Seguro BA</title>
            <meta name="description" content="Hotel em frente à Praia do Mundaí na Orla Norte de Porto Seguro com piscinas, área kids e restaurante.">
            <script type="application/ld+json">{"@type":"Hotel","name":"Portal Beach Hotel","checkinTime":"14:00","checkoutTime":"12:00","amenityFeature":[{"name":"Piscina adulto e infantil"},{"name":"Frente à praia"}]}</script>
          </head><body><h1>Bem-vindo ao Portal Beach Hotel</h1><p>Localizado na Orla Norte de Porto Seguro, a poucos metros da praia e próximo às barracas de Taperapuã.</p></body></html>`,
          { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }

      if (url.includes("pt.wikipedia.org/w/api.php")) {
        return new Response(
          JSON.stringify({ query: { search: [{ title: "Porto Seguro" }] } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("pt.wikipedia.org/api/rest_v1/page/summary")) {
        return new Response(
          JSON.stringify({
            title: "Porto Seguro",
            extract: "Porto Seguro é um município turístico do litoral sul da Bahia, famoso pelas praias da Orla Norte como Taperapuã e Mundaí.",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("geocoding-api.open-meteo.com")) {
        return new Response(
          JSON.stringify({ results: [{ latitude: -16.45, longitude: -39.06 }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("archive-api.open-meteo.com")) {
        return new Response(
          JSON.stringify({
            daily: {
              time: ["2025-08-23", "2025-08-24", "2025-08-25"],
              temperature_2m_max: [27.2, 26.8, 27.5],
              temperature_2m_min: [19.5, 19.0, 20.1],
              precipitation_sum: [0.0, 0.4, 3.2],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response("{}", { status: 404 });
    });

    const dossier = await resolveHotelAndDestinationPublicContext(proposal, {
      fetchImpl: mockFetch,
      firecrawlApiKey: null,
      nowDate: new Date("2026-11-14T12:00:00Z"),
    });

    expect(dossier.hotelLocation?.found).toBe(true);
    expect(dossier.hotelLocation?.identifiedCity).toBe("Porto Seguro");
    expect(dossier.hotelLocation?.neighborhood).toBe("Mundaí");
    expect(dossier.hotelLocation?.distanceToCityCenterKm).toBeGreaterThan(2);
    expect(dossier.visitedWebsite?.url).toContain("portalbeachhotel.com.br");
    expect(dossier.visitedWebsite?.description).toContain("Praia do Mundaí");
    expect(dossier.visitedWebsite?.schemaSummary).toContain("Piscina adulto e infantil");
    expect(dossier.weatherSummary?.mode).toBe("historical_same_period");
    expect(dossier.weatherSummary?.avgMaxTempC).toBe(27);
    expect(dossier.formattedPromptSection).toContain("Portal Beach Hotel");
    expect(dossier.formattedPromptSection).toContain("Open-Meteo");
  });

  it("buildFullProposalAdvisorContext preserva voos, hotel, roteiro, exclusões e valores", () => {
    const context = buildFullProposalAdvisorContext(buildSampleProposal());
    expect(context).toContain("LA3412");
    expect(context).toContain("XAP -> BPS");
    expect(context).toContain("1 mala despachada 23kg");
    expect(context).toContain("Apartamento Standard Triplo");
    expect(context).toContain("Chegada e Orla Norte");
    expect(context).toContain("10x de R$ 799.13");
    expect(context).toContain("Passeios opcionais");
  });

  it("askProposalSalesAdvisorAI recusa proposta bloqueada por PIN e injeta grounding web + contexto sem mordaça", async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: "prop-1",
        store_id: "11111111-1111-4111-8111-111111111111",
        public_token: "tok-porto-seguro",
        status: "sent",
        visibility_mode: "public",
        destination_city: "Porto Seguro",
        title: "Proposta Porto Seguro",
        adults_count: 3,
        children_count: 0,
        travel_start_date: "2027-08-23",
        travel_end_date: "2027-08-28",
        ai_sales_advisor_prompt: "Destaque o excelente café da manhã baiano do hotel.",
        hotels: [{ hotel_name: "Portal Beach Hotel - Rede Soberano", room_type: "Standard Triplo" }],
        flights: [{ leg: "Ida", airline_name: "Latam", origin_iata: "XAP", destination_iata: "BPS" }],
        includes: ["Aéreo ida e volta"],
        excludes: ["Ingressos opcionais"],
        pricing: { total_price_cents: 799130, boarding_tax_cents: 0, other_taxes_cents: 0, discount_cents: 0, base_price_cents: 799130, installments_options: [] },
        stores: { name: "Excelência Tour SMO", settings: { whatsapp_phone: "5549999990000" } },
      },
      error: null,
    });

    mockGetServerClient.mockReturnValue({
      from: (table: string) => {
        if (table === "travel_proposals") {
          return {
            select: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }),
            update: () => ({ eq: () => Promise.resolve({ error: null }) }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
                }),
              }),
            }),
          }),
        };
      },
      rpc: vi.fn(async () => ({ error: null })),
    });

    mockExecuteUnifiedAiCall.mockResolvedValue({
      text: "O Portal Beach Hotel fica na Praia do Mundaí, Orla Norte de Porto Seguro, a cerca de 4 km do centro histórico.",
      content: "O Portal Beach Hotel fica na Praia do Mundaí...",
      provider: "gemini",
      model: "gemini-2.5-flash",
    });

    const mod = await import("../travel-proposal.functions");
    const handler = (mod.askProposalSalesAdvisorAI as any).execute || mod.askProposalSalesAdvisorAI;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response("{}", { status: 404 })) as any;

    try {
      const result = await handler({
        data: {
          token: "tok-porto-seguro",
          question: "Como é a localização do hotel e o clima nessa época?",
          conversationHistory: [],
        },
      });

      expect(result.reply).toContain("Portal Beach Hotel");
      expect(mockExecuteUnifiedAiCall).toHaveBeenCalledTimes(1);
      const callArg = mockExecuteUnifiedAiCall.mock.calls[0][0];
      expect(callArg.enableWebSearch).toBe(true);
      expect(callArg.storeId).toBe("11111111-1111-4111-8111-111111111111");
      expect(callArg.systemPrompt).not.toContain("comparar somente os dados publicados");
      expect(callArg.systemPrompt).toContain("DOSSIÊ PÚBLICO PESQUISADO");
      expect(callArg.systemPrompt).toContain("XAP -> BPS");
      expect(callArg.systemPrompt).toContain("Destaque o excelente café da manhã baiano do hotel.");
    } finally {
      globalThis.fetch = originalFetch;
    }

    maybeSingleMock.mockResolvedValueOnce({
      data: {
        id: "prop-locked",
        public_token: "tok-locked",
        status: "sent",
        visibility_mode: "password",
        access_pin_hash: "salt:hash",
        stores: { name: "Agência", settings: {} },
      },
      error: null,
    });
    await expect(
      handler({
        data: {
          token: "tok-locked",
          question: "Qual o preço?",
          conversationHistory: [],
        },
      }),
    ).rejects.toThrow("Desbloqueie a proposta antes de consultar o consultor.");

    const proposalRouteSrc = fs.readFileSync(
      path.resolve("src/routes/_store.proposta.$token.tsx"),
      "utf8",
    );
    expect(proposalRouteSrc).not.toContain("**${proposal?.agency_name");
    expect(proposalRouteSrc).toContain("<AdvisorFormattedMessage content={m.content} />");
    expect(proposalRouteSrc).toContain("scrollbar-waesy");
  });
});
