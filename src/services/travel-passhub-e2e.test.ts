import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerClient: vi.fn(),
  getServerIdentity: vi.fn(),
  requireStaff: vi.fn(),
  assertStoreAccess: vi.fn(),
  executeUnifiedAiCall: vi.fn(),
  convertProposalToTrip: vi.fn(),
  decryptSecret: vi.fn((val: string) => val),
  encryptSecret: vi.fn((val: string) => val),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { schema?: unknown } = {};
    const builder: any = {
      validator: (schema: unknown) => {
        state.schema = schema;
        return builder;
      },
      handler: (handler: (args: unknown) => unknown) => {
        const invoke = (args: unknown) => handler(args);
        (invoke as any).schema = state.schema;
        return invoke;
      },
    };
    return builder;
  },
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: mocks.getServerClient,
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: mocks.getServerIdentity,
  requireStaff: mocks.requireStaff,
  assertStoreAccess: mocks.assertStoreAccess,
}));

vi.mock("@/lib/crypto-vault.server", () => ({
  decryptSecret: mocks.decryptSecret,
  encryptSecret: mocks.encryptSecret,
}));

vi.mock("./api-orchestrator.functions", () => ({
  executeUnifiedAiCall: mocks.executeUnifiedAiCall,
}));

vi.mock("@/services/travel-lifecycle.functions", () => ({
  convertProposalToTrip: mocks.convertProposalToTrip,
}));

import { proposalToEditorialClassified } from "@/lib/tourism/proposal-editorial-mapper";
import { TRAVEL_GDS_PROVIDER_CATALOG } from "./travel-gds-workbench.functions";
import {
  createTravelProposal,
  getPublicTravelProposalByToken,
  type TravelProposalDTO,
} from "./travel-proposal.functions";
import { executeMultiProviderSearch } from "./travel-supply-orchestrator.service";
import { searchWoobaBusRoutes, searchWoobaCars } from "./travel-wooba-connector.service";

const STORE_ID = "11111111-1111-4111-8111-111111111111";

function createSupabaseMock(config: {
  woobaCred?: Record<string, unknown> | null;
  opIntegrations?: Array<Record<string, unknown>>;
  legacyCredentials?: Array<Record<string, unknown>>;
  publicProposalRow?: Record<string, unknown> | null;
} = {}) {
  const insertedProposals: Array<Record<string, unknown>> = [];

  const from = vi.fn((table: string) => {
    const state: { filters: Record<string, unknown>; limitVal?: number } = { filters: {} };
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((col: string, val: unknown) => {
        state.filters[col] = val;
        return chain;
      }),
      or: vi.fn(() => chain),
      in: vi.fn(() => chain),
      ilike: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn((n: number) => {
        state.limitVal = n;
        return chain;
      }),
      insert: vi.fn((payload: Record<string, unknown>) => {
        if (table === "travel_proposals") insertedProposals.push(payload);
        return chain;
      }),
      update: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => {
        if (table === "travel_operator_integrations") {
          if (config.woobaCred) {
            return {
              data: {
                vault_secret_id: JSON.stringify(config.woobaCred),
                is_active: true,
                default_markup_percent: 10,
              },
              error: null,
            };
          }
          return { data: null, error: null };
        }
        if (table === "travel_proposals") {
          return { data: config.publicProposalRow ?? null, error: null };
        }
        return { data: null, error: null };
      }),
      single: vi.fn(async () => {
        if (table === "travel_proposals") {
          return {
            data: { id: "prop-new-1", public_token: "pub-tok-1" },
            error: null,
          };
        }
        if (table === "travel_quote_sessions") {
          return { data: { id: "sess-1" }, error: null };
        }
        return { data: { id: "row-1" }, error: null };
      }),
      then: (resolve: (val: unknown) => unknown, reject: (err: unknown) => unknown) => {
        let rows: Array<Record<string, unknown>> = [];
        if (table === "travel_operator_integrations") {
          rows = config.opIntegrations ?? [];
        } else if (table === "integration_credentials") {
          rows = config.legacyCredentials ?? [];
        }
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      },
    };
    return chain;
  });

  return { client: { from }, insertedProposals };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServerIdentity.mockResolvedValue({
    id: "user-1",
    store_id: STORE_ID,
    role: "admin",
  });
  mocks.requireStaff.mockResolvedValue({
    id: "user-1",
    store_id: STORE_ID,
    role: "admin",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PassHub End-to-End: Zero Fakes, Conectores Reais & Paridade Web/Studio", () => {
  it("expõe catálogo unificado com os 8 conectores GDS / InfoTravel esperados", () => {
    const codes = TRAVEL_GDS_PROVIDER_CATALOG.map((item) => item.code);
    expect(codes).toEqual([
      "wooba",
      "infotravel_default",
      "orinter",
      "frt",
      "incomum",
      "cativa",
      "befly",
      "confianca",
    ]);
  });

  it("descarta linhas malformadas em searchWoobaBusRoutes sem fabricar companhia/horários/tarifas", async () => {
    const db = createSupabaseMock({
      woobaCred: {
        agency_code: "AG1",
        username: "u",
        password: "p",
        environment: "production",
        default_markup_percent: 10,
      },
    });
    mocks.getServerClient.mockReturnValue(db.client);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          Schedules: [
            // Inválida: falta companhia, horário e tarifa válida
            { Id: "bus-invalid", Origin: "XAP", Destination: "FLN", Price: 0 },
            // Válida com valores reais
            {
              Id: "bus-real-1",
              CompanyName: "Catarinense",
              ServiceClass: "Leito Cama",
              OriginTerminal: "Terminal Chapecó",
              DestinationTerminal: "Terminal Rita Maria",
              DepartureTime: "21:30",
              ArrivalTime: "06:15",
              AvailableSeats: 12,
              DurationMinutes: 525,
              Price: 250,
            },
          ],
        }),
      })) as any,
    );

    const routes = await searchWoobaBusRoutes({
      agencyId: STORE_ID,
      originTerminalCityId: "XAP",
      destinationTerminalCityId: "FLN",
      departureDate: "2026-12-10",
    });

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      tripScheduleId: "bus-real-1",
      companyName: "Catarinense",
      serviceClass: "leito_cama",
      departureTime: "21:30",
      arrivalTime: "06:15",
      netPriceCents: 25000,
    });
  });

  it("descarta locadoras inválidas em searchWoobaCars sem aplicar taxa sintética de 12%", async () => {
    const db = createSupabaseMock({
      woobaCred: {
        agency_code: "AG1",
        username: "u",
        password: "p",
        environment: "production",
        default_markup_percent: 10,
      },
    });
    mocks.getServerClient.mockReturnValue(db.client);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          Cars: [
            // Inválida: sem locadora nem tarifa
            { CategoryName: "SUV", TotalPrice: 0 },
            // Válida com taxa explicitamente zerada
            {
              Id: "car-real-1",
              RentalCompany: "Localiza",
              CategoryName: "Compacto",
              ModelExample: "HB20 ou similar",
              Transmission: "Automatic",
              DailyRate: 140,
              TotalPrice: 420,
              Taxes: 0,
            },
          ],
        }),
      })) as any,
    );

    const cars = await searchWoobaCars({
      agencyId: STORE_ID,
      pickupLocationCode: "FLN",
      pickupDate: "2026-12-10",
      dropoffDate: "2026-12-13",
    });

    expect(cars).toHaveLength(1);
    expect(cars[0].details.rental_company).toBe("Localiza");
    expect(cars[0].pricing.net_amount_cents).toBe(42000);
    expect(cars[0].pricing.tax_amount_cents).toBe(0);
  });

  it("rejeita provedor stub (rexturadvance) e carro sem datas reais no orquestrador", async () => {
    const db = createSupabaseMock({
      opIntegrations: [
        {
          id: "int-1",
          provider_code: "rexturadvance",
          vault_secret_id: JSON.stringify({ key: "x" }),
          is_active: true,
          default_markup_percent: 10,
        },
        {
          id: "int-wooba",
          provider_code: "wooba",
          vault_secret_id: JSON.stringify({
            agency_code: "AG1",
            username: "u",
            password: "p",
          }),
          is_active: true,
          default_markup_percent: 10,
        },
      ],
    });
    mocks.getServerClient.mockReturnValue(db.client);

    const stubResult = await executeMultiProviderSearch({
      agencyId: STORE_ID,
      productType: "flight",
      originIata: "GRU",
      destinationIata: "MCO",
      departureDate: "2026-12-10",
      adultsCount: 2,
      providerCodes: ["rexturadvance"],
    });

    expect(stubResult.offers).toHaveLength(0);
    expect(stubResult.errors.some((e) => e.includes("rexturadvance"))).toBe(true);

    const missingDatesCarResult = await executeMultiProviderSearch({
      agencyId: STORE_ID,
      productType: "car",
      destinationIata: "FLN",
      departureDate: "2026-12-10",
      adultsCount: 1,
      providerCodes: ["wooba"],
    });

    expect(missingDatesCarResult.offers).toHaveLength(0);
    expect(missingDatesCarResult.errors.some((e) => e.includes("wooba"))).toBe(true);
  });

  it("não injeta inclusões nem exclusões artificiais quando createTravelProposal recebe arrays vazios", async () => {
    const db = createSupabaseMock();
    mocks.getServerClient.mockReturnValue(db.client);

    await createTravelProposal({
      data: {
        title: "Cotação Personalizada Orlando",
        clientName: "Mariana Costa",
        destinationCity: "Orlando, EUA",
      },
    });

    expect(db.insertedProposals).toHaveLength(1);
    expect(db.insertedProposals[0].includes).toEqual([]);
    expect(db.insertedProposals[0].excludes).toEqual([]);
  });

  it("preserva options[].rooms, transfers, tours, includes e excludes em getPublicTravelProposalByToken", async () => {
    const db = createSupabaseMock({
      publicProposalRow: {
        id: "prop-pub-1",
        public_token: "pub-token-123",
        store_id: STORE_ID,
        title: "Maceió Resort",
        client_name: "Carlos Silva",
        destination_city: "Maceió",
        status: "sent",
        flights: [],
        hotels: [],
        itinerary: [],
        transfers: [],
        tours: [],
        includes: ["Hospedagem"],
        excludes: [],
        pricing: { currency: "BRL", total_price_cents: 450000, installments_options: [] },
        options: [
          {
            id: "opt-luxury",
            name: "Opção Premium",
            airline: "LATAM",
            hotel_name: "Jatiúca Resort",
            rooms: [{ id: "r1", roomNumber: 1, roomType: "Suíte Mar", adults: 2, children: 0, price_cents: 620000 }],
            transfers: [{ type: "Privativo", vehicle: "SUV" }],
            tours: [{ id: "t1", title: "Praia do Francês", included: true }],
            includes: ["Café da manhã", "Transfer privativo"],
            excludes: ["Despesas pessoais"],
            pricing: { currency: "BRL", total_price_cents: 620000, installments_options: [] },
          },
        ],
      },
    });
    mocks.getServerClient.mockReturnValue(db.client);

    const dto = await getPublicTravelProposalByToken({
      data: { token: "pub-token-123" },
    });

    expect(dto?.options).toHaveLength(1);
    expect(dto?.options?.[0]).toMatchObject({
      id: "opt-luxury",
      name: "Opção Premium",
      airline: "LATAM",
      hotel_name: "Jatiúca Resort",
      includes: ["Café da manhã", "Transfer privativo"],
      excludes: ["Despesas pessoais"],
    });
    expect((dto?.options?.[0] as any).rooms).toHaveLength(1);
    expect(dto?.options?.[0].transfers).toHaveLength(1);
    expect(dto?.options?.[0].tours).toHaveLength(1);
  });

  it("mantém paridade total em proposalToEditorialClassified sem inventar política flexível", () => {
    const proposal: TravelProposalDTO = {
      id: "prop-ed-1",
      quote_id: "q-1",
      public_token: "tok-ed-1",
      agency_name: "Excelência Tour",
      title: "Férias em Cancún",
      subtitle: "All Inclusive frente mar",
      client_name: "Juliana Mendes",
      client_whatsapp: "49999998888",
      adults_count: 2,
      children_count: 1,
      canvas_format: "a4-portrait",
      template_theme: "editorial-flat",
      destination_city: "Cancún, México",
      travel_start_date: "2026-12-10",
      travel_end_date: "2026-12-17",
      cover_image_url: "https://cdn.example.com/cancun.jpg",
      flights: [
        {
          id: "f1",
          type: "outbound",
          airline_name: "Copa Airlines",
          flight_number: "CM204",
          origin_iata: "GRU",
          destination_iata: "CUN",
          departure_date: "2026-12-10",
          departure_time: "01:30",
          arrival_time: "08:40",
        },
      ],
      hotels: [
        {
          id: "h1",
          hotel_name: "Grand Oasis Cancún",
          stars: 5,
          board_basis: "all_inclusive",
          nights_count: 7,
          amenities: ["Piscina", "Spa"],
        },
      ],
      itinerary: [
        {
          day_number: 1,
          title: "Chegada ao Caribe",
          description: "Recepção no aeroporto e check-in no resort.",
        },
      ],
      transfers: [
        {
          id: "tr1",
          type: "Privativo",
          vehicle: "Van Executiva",
          route_name: "Aeroporto CUN ↔ Resort",
        },
      ],
      tours: [
        {
          id: "tu1",
          title: "Passeio Chichén Itzá",
          description: "Dia inteiro com guia local.",
          duration: "10h",
          included: true,
        },
      ],
      rooms: [
        {
          id: "rm1",
          roomNumber: 1,
          roomType: "Suíte Luxo Família",
          adults: 2,
          children: 1,
          price_cents: 1290000,
          price_per_person_cents: 430000,
          board_basis: "All Inclusive",
        },
      ],
      includes: ["Hospedagem All Inclusive", "Transfer Privativo"],
      excludes: ["Seguro Viagem"],
      pricing: {
        currency: "BRL",
        base_price_cents: 1290000,
        boarding_tax_cents: 0,
        other_taxes_cents: 0,
        discount_cents: 0,
        total_price_cents: 1290000,
        installments_options: [
          {
            installments_count: 10,
            installment_value_cents: 129000,
            method: "credit_card",
            has_interest: false,
          },
        ],
      },
      custom_fields: {
        canvas_bg_color: "#ffffff",
        proposal_niche: "tourism",
        boarding_requirements: "Passaporte com validade mínima de 6 meses.",
        gateway_logistics: "Voo com conexão rápida em PTY.",
        franquia_bagagem: "1 mala despachada de 23kg incluída",
      },
      status: "sent",
      views_count: 0,
      created_at: "2026-11-14T12:00:00Z",
    };

    const editorial = proposalToEditorialClassified(proposal);
    const attrs = editorial.attributes as Record<string, any>;

    expect(attrs.cancellation_policy).toBeUndefined();
    expect(attrs.boarding_requirements).toBe("Passaporte com validade mínima de 6 meses.");
    expect(attrs.gateway_logistics).toBe("Voo com conexão rápida em PTY.");
    expect(attrs.rooms).toHaveLength(1);
    expect(attrs.rooms[0]).toMatchObject({
      roomNumber: 1,
      roomType: "Suíte Luxo Família",
      adults: 2,
      children: 1,
      price_cents: 1290000,
      price_per_person_cents: 430000,
    });
    expect(attrs.transfers_and_tours).toHaveLength(2);
    expect(attrs.custom_field_entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "franquia_bagagem",
          value: "1 mala despachada de 23kg incluída",
        }),
      ]),
    );
    expect(
      (attrs.custom_field_entries as Array<{ key: string }>).some(
        (entry) => entry.key === "canvas_bg_color" || entry.key === "proposal_niche",
      ),
    ).toBe(false);
  });
});
