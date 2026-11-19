import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const mocks = vi.hoisted(() => ({
  getServerIdentity: vi.fn(),
  requireStaff: vi.fn(),
  getServerClient: vi.fn(),
  getAnonServerClient: vi.fn(),
  executeUnifiedAiCall: vi.fn(),
  getNextActiveKey: vi.fn(),
  publishDomainEvent: vi.fn(),
  setResponseHeader: vi.fn(),
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
vi.mock("@tanstack/start-server-core", () => ({ setResponseHeader: mocks.setResponseHeader }));
vi.mock("@/lib/server-access", () => ({
  getServerIdentity: mocks.getServerIdentity,
  requireStaff: mocks.requireStaff,
  assertStoreAccess: (identity: any) => {
    if (!identity?.id || !identity?.store_id) {
      throw new Error("Acesso negado.");
    }
  },
}));
vi.mock("@/lib/supabase", () => ({
  getServerClient: mocks.getServerClient,
  getAnonServerClient: mocks.getAnonServerClient,
}));
vi.mock("@/services/api-orchestrator.functions", () => ({
  executeUnifiedAiCall: mocks.executeUnifiedAiCall,
  getNextActiveKey: mocks.getNextActiveKey,
}));
vi.mock("./domain-events.functions", () => ({ publishDomainEvent: mocks.publishDomainEvent }));

import * as lifecycleFns from "./travel-lifecycle.functions";
import * as compilerFns from "./contract-compiler.functions";
import * as norm from "@/lib/tourism/proposal-normalization";

const STORE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STORE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const STAFF_A = "11111111-1111-4111-8111-111111111111";
const PROPOSAL_A = "22222222-2222-4222-8222-222222222222";
const TRIP_A = "33333333-3333-4333-8333-333333333333";
const CONTRACT_A = "44444444-4444-4444-8444-444444444444";

function makeTripAggregateMockDb(options?: {
  tripStoreId?: string;
  canonicalContract?: Record<string, unknown> | null;
}) {
  const tripStoreId = options?.tripStoreId ?? STORE_A;
  const canonicalContract =
    options && "canonicalContract" in options
      ? options.canonicalContract
      : {
          id: CONTRACT_A,
          store_id: tripStoreId,
          status: "signing",
          verification_code: "ct_canonical_token_123",
          title: "Contrato Canônico Fortaleza + Jeri",
          created_at: "2026-11-16T10:00:00Z",
          metadata: {
            proposal_id: PROPOSAL_A,
            public_token: "ct_canonical_token_123",
          },
        };

  const from = vi.fn((table: string) => {
    const filters: Record<string, unknown> = {};
    const chain: any = {
      select: vi.fn(() => chain),
      update: vi.fn((patch: unknown) => {
        chain.__updatePatch = patch;
        return chain;
      }),
      insert: vi.fn(() => chain),
      eq: vi.fn((col: string, val: unknown) => {
        filters[col] = val;
        return chain;
      }),
      or: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: vi.fn(async () => chain.maybeSingle()),
      maybeSingle: vi.fn(async () => {
        if (table === "tourism_trips") {
          return {
            data: {
              id: TRIP_A,
              store_id: tripStoreId,
              proposal_id: null,
              source_proposal_id: PROPOSAL_A,
              trip_number: "VIAGEM-2027-001",
              title: "Fortaleza e Jericoacoara",
              destination_city: "Fortaleza e Jericoacoara",
              adults_count: 2,
              children_count: 0,
              currency: "BRL",
              total_cents: 620304,
              status: "confirmed",
              client_name: "Vanusa",
              client_whatsapp: "49991768361",
              flights: [],
              hotels: [{ hotel_name: "Hotel Diogo" }, { hotel_name: "Pousada Angélica" }],
              transfers: [{ name: "Traslado Aeroporto / Hotel", kind: "arrival" }],
              tours: [{ title: "City Tour em Fortaleza", included: true }],
              itinerary: [],
              rooms: [],
              includes: [],
              excludes: [],
              portal_content: null,
            },
            error: null,
          };
        }
        if (table === "stores") {
          return {
            data: {
              id: tripStoreId,
              name: "Excelência Tour",
              logo_url: null,
              phone: "49991768361",
              email: "contato@excelenciatour.com",
            },
            error: null,
          };
        }
        if (table === "contracts") {
          return { data: canonicalContract, error: null };
        }
        if (table === "travel_contracts") {
          return { data: null, error: null };
        }
        return { data: null, error: null };
      }),
      then: (resolve: (val: unknown) => unknown) => {
        if (table === "tourism_trips" && chain.__updatePatch) {
          return Promise.resolve(
            resolve({
              data: [{ id: TRIP_A }],
              error: null,
            }),
          );
        }
        return Promise.resolve(resolve({ data: [], error: null }));
      },
    };
    return chain;
  });

  return { from };
}

describe("Forensic E2E Remediation — Tourism Chain & Studio V2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("L7: getTripAggregate resolves contract from canonical contracts table via source_proposal_id", async () => {
    mocks.requireStaff.mockResolvedValue({ id: STAFF_A, store_id: STORE_A, role: "owner" });
    mocks.getServerClient.mockReturnValue(makeTripAggregateMockDb());

    const agg = await lifecycleFns.getTripAggregate({ data: { tripId: TRIP_A } });
    expect(agg).not.toBeNull();
    expect(agg?.contract).not.toBeNull();
    expect(agg?.contract?.id).toBe(CONTRACT_A);
    expect(agg?.contract?.public_token).toBe("ct_canonical_token_123");
  });

  it("L7: getTripAggregate rejects cross-tenant access from Store B staff", async () => {
    mocks.requireStaff.mockResolvedValue({ id: STAFF_A, store_id: STORE_B, role: "owner" });
    mocks.getServerClient.mockReturnValue(makeTripAggregateMockDb({ tripStoreId: STORE_A }));

    await expect(lifecycleFns.getTripAggregate({ data: { tripId: TRIP_A } })).rejects.toThrow(/Acesso negado/i);
  });

  it("L7: updateTripPortalCustomization persists portal media & tips with Rule B.25 optional handling and denies cross-tenant", async () => {
    mocks.requireStaff.mockResolvedValue({ id: STAFF_A, store_id: STORE_A, role: "owner" });
    mocks.getServerClient.mockReturnValue(makeTripAggregateMockDb({ tripStoreId: STORE_A }));

    const fn = (lifecycleFns as any).updateTripPortalCustomization;
    expect(typeof fn).toBe("function");

    const minimalRes = await fn({
      data: {
        tripId: TRIP_A,
      },
    });
    expect(minimalRes.success).toBe(true);

    const fullRes = await fn({
      data: {
        tripId: TRIP_A,
        coverImageUrl: "https://cdn.example.com/jeri.jpg",
        welcomeNote: "Bem-vindos ao Ceará",
        portalMedia: [{ id: "m1", url: "https://cdn.example.com/video.mp4", type: "video", aspectPreset: "16:9" }],
        portalTips: [{ id: "t1", category: "clima", title: "Protetor solar", description: "Levar protetor FPS 50+" }],
      },
    });
    expect(fullRes.success).toBe(true);

    mocks.requireStaff.mockResolvedValue({ id: STAFF_A, store_id: STORE_B, role: "owner" });
    await expect(
      fn({ data: { tripId: TRIP_A, welcomeNote: "Invasão" } }),
    ).rejects.toThrow(/Acesso negado|não encontrada/i);
  });

  it("L7: issueCustomizedContractFromProposal includes multi-hotel without duplicating total_value_cents and appends transfers & tours", async () => {
    mocks.getServerIdentity.mockResolvedValue({ id: STAFF_A, store_id: STORE_A, role: "owner" });
    mocks.requireStaff.mockResolvedValue({ id: STAFF_A, store_id: STORE_A, role: "owner" });
    let insertedContent = "";
    const db = {
      rpc: vi.fn(async () => ({
        data: { success: true, contract_id: CONTRACT_A, public_token: "ct_test_token" },
        error: null,
      })),
      from: vi.fn((table: string) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          insert: vi.fn((payload: any) => {
            if (table === "contract_versions" && payload?.content_markdown) {
              insertedContent = String(payload.content_markdown);
            }
            return chain;
          }),
          update: vi.fn((payload: any) => {
            if (table === "contract_versions" && payload?.content_markdown) {
              insertedContent = String(payload.content_markdown);
            }
            return chain;
          }),
          maybeSingle: vi.fn(async () => {
            if (table === "contract_versions") {
              return {
                data: {
                  id: "cv-1",
                  contract_id: CONTRACT_A,
                  version_number: 1,
                  title: "Contrato Fortaleza + Jeri",
                  is_sealed: false,
                },
                error: null,
              };
            }
            if (table === "contracts") {
              return {
                data: {
                  id: CONTRACT_A,
                  store_id: STORE_A,
                  title: "Contrato Fortaleza + Jeri",
                  current_version: 1,
                  verification_code: "ct_test_token",
                  metadata: {
                    proposal_id: PROPOSAL_A,
                    client_name: "Vanusa",
                    client_phone: "49991768361",
                    destination: "Fortaleza e Jericoacoara",
                    total_value_cents: 620304,
                    passengers: [{ name: "Vanusa" }, { name: "Acompanhante" }],
                  },
                },
                error: null,
              };
            }
            if (table === "travel_proposals") {
              return {
                data: {
                  id: PROPOSAL_A,
                  store_id: STORE_A,
                  title: "Pacote Fortaleza + Jericoacoara",
                  hotels: [
                    { hotel_name: "Hotel Diogo", nights_count: 3 },
                    { hotel_name: "Pousada Angélica", nights_count: 3 },
                  ],
                  flights: [{ airline_name: "Azul", origin_iata: "XAP", destination_iata: "FOR" }],
                  transfers: [{ name: "Traslado Aeroporto / Hotel Diogo", vehicle: "Regular" }],
                  tours: [{ title: "City Tour em Fortaleza", included: true }],
                  itinerary: [],
                  includes: ["Café da manhã"],
                  excludes: [],
                  pricing: { total_price_cents: 620304 },
                },
                error: null,
              };
            }
            if (table === "stores") {
              return { data: { id: STORE_A, name: "Excelência Tour", settings: {} }, error: null };
            }
            return { data: null, error: null };
          }),
        };
        return chain;
      }),
    };
    mocks.getServerClient.mockReturnValue(db);

    const res = await compilerFns.issueCustomizedContractFromProposal({
      data: {
        proposalId: PROPOSAL_A,
        templateId: "template-turismo-pacote-viagem",
      },
    });

    expect(res.success).toBe(true);
    expect(insertedContent).toContain("Hotel Diogo");
    expect(insertedContent).toContain("Pousada Angélica");
    expect(insertedContent).toContain("Traslado Aeroporto / Hotel Diogo");
    expect(insertedContent).toContain("City Tour em Fortaleza");
    // Ensures R$ 6.203,04 is not duplicated inside individual hotel rows in multi-hotel packages
    expect(insertedContent).not.toMatch(/Hotel Diogo[^\n]*6\.203,04/);
    expect(insertedContent).not.toMatch(/Pousada Angélica[^\n]*6\.203,04/);
  });

  it("L6/L4: mapQuoteBundleToTravelProposal maps quote bundles to canonical TravelProposalDTO with options", () => {
    const mapper = (norm as any).mapQuoteBundleToTravelProposal;
    expect(typeof mapper).toBe("function");

    const dto = mapper({
      id: "bundle-1",
      slug: "fortaleza-comparativo",
      title: "Comparativo Fortaleza & Jeri",
      client_name: "Vanusa",
      passenger_composition: { adults: 2, children: 1, children_ages: [7] },
      store: { id: STORE_A, name: "Excelência Tour", logo_url: null, whatsapp: "49991768361" },
      items: [
        {
          id: "item-1",
          option_label: "Opção 1 — Hotel Diogo",
          custom_price_cents: 620304,
          advisor_notes: "Mais procurada",
          listing: {
            id: "list-1",
            title: "Pacote Hotel Diogo",
            price_cents: 620304,
            attributes: {
              destination_city: "Fortaleza",
              lodgings: [{ name: "Hotel Diogo", board_basis: "Café da manhã" }],
              transfers: [{ name: "Traslado Aeroporto Fortaleza / Hotel", kind: "round_trip" }],
              tours: [{ title: "City Tour Fortaleza", included: true }],
            },
          },
        },
        {
          id: "item-2",
          option_label: "Opção 2 — Villa Mayor",
          custom_price_cents: 689000,
          listing: {
            id: "list-2",
            title: "Pacote Villa Mayor",
            price_cents: 689000,
            attributes: { destination_city: "Fortaleza", lodgings: [{ name: "Villa Mayor" }] },
          },
        },
      ],
    });

    expect(dto.title).toBe("Comparativo Fortaleza & Jeri");
    expect(dto.options).toHaveLength(2);
    expect(dto.options[0].name).toContain("Hotel Diogo");
    expect(dto.options[1].pricing.total_price_cents).toBe(689000);
    expect(dto.children_count).toBe(1);
  });

  it("L4: computeExtraServicesChargeCents accurately sums add_to_quote transfers and tours", () => {
    const helper = (norm as any).computeExtraServicesChargeCents;
    expect(typeof helper).toBe("function");
    expect(
      helper(
        [
          { price_cents: 24306, add_to_quote: true },
          { price_cents: 15000, add_to_quote: false },
        ],
        [
          { price_cents: 35000, add_to_quote: true },
          { price_cents: 12000 },
        ],
      ),
    ).toBe(59306);
  });

  it("L1–L7 structural hygiene: canonical conversions, full media templates, safe portal routing & zero parallel dead studio", () => {
    const root = process.cwd();
    const migrationPath = path.join(
      root,
      "supabase/migrations/20270528000000_fix_proposal_conversion_and_contract_options.sql",
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.convert_accepted_travel_proposal_staff");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.create_staff_travel_contract_from_proposal");
    expect(sql).toContain("v_selected_option");
    expect(sql).toContain("portal_content");

    const tplVertical = fs.readFileSync(
      path.join(root, "src/components/tourism/proposals/templates/TemplateVerticalPremium.tsx"),
      "utf8",
    );
    expect(tplVertical).toContain("ProposalItineraryMediaGrid");
    expect(tplVertical).not.toContain("dayImages.slice(0, 2)");

    const bundleRoute = fs.readFileSync(
      path.join(root, "src/routes/_store.orcamentos.$bundleSlug.tsx"),
      "utf8",
    );
    expect(bundleRoute).not.toContain("EditorialShowcaseView");
    expect(bundleRoute).not.toContain('to="/classificados"');
    expect(bundleRoute).toContain("ProposalWebShowcase");

    const travelerRoute = fs.readFileSync(path.join(root, "src/routes/viajante.viagem.$id.tsx"), "utf8");
    expect(travelerRoute).not.toContain("5549999991372");
    expect(travelerRoute).not.toContain("hotelName: hotel.name");
    expect(travelerRoute).toContain("portal_media");

    const tripWsRoute = fs.readFileSync(
      path.join(root, "src/routes/workspace.turismo.viagens.$id.tsx"),
      "utf8",
    );
    expect(tripWsRoute).not.toContain("/viajante/carteira");
    expect(tripWsRoute).toContain("/viajante/viagem/");
    expect(tripWsRoute).toContain("updateTripPortalCustomization");

    const accountTripsRoute = fs.readFileSync(
      path.join(root, "src/routes/_store.conta.viagens.tsx"),
      "utf8",
    );
    expect(accountTripsRoute).toContain("agencyTrip.cover_image_url");

    const creatorWs = fs.readFileSync(
      path.join(root, "src/components/tourism/unified-proposal-workspace.tsx"),
      "utf8",
    );
    expect(creatorWs).toContain("confidence_by_field");
    expect(creatorWs).toContain("Revisar");
    expect(creatorWs).toContain("tourItem.add_to_quote");

    const sidebarEditor = fs.readFileSync(
      path.join(root, "src/components/tourism/studio/studio-sidebar-editor.tsx"),
      "utf8",
    );
    expect(sidebarEditor).toContain("add_to_quote");

    // Dead parallel ProposalStudio must be retired cleanly
    expect(fs.existsSync(path.join(root, "src/components/tourism/proposals/ProposalStudio.tsx"))).toBe(false);
    expect(fs.existsSync(path.join(root, "src/components/proposals/ProposalStudio.tsx"))).toBe(false);
  });
});
