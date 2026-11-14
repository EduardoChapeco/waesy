import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerClient: vi.fn(),
  getAnonServerClient: vi.fn(),
  getServerIdentity: vi.fn(),
  requireStaff: vi.fn(),
  assertStoreAccess: vi.fn(),
  executeUnifiedAiCall: vi.fn(),
  getRequest: vi.fn(() => ({ headers: new Headers() })),
  getCookie: vi.fn(() => undefined),
  setCookie: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { schema?: any } = {};
    const builder: any = {
      validator: (schema: any) => {
        state.schema = schema;
        return builder;
      },
      handler: (handler: (args: any) => unknown) => {
        const invoke = (args: any) => {
          const parsedData = state.schema ? state.schema.parse(args?.data) : args?.data;
          return handler({ data: parsedData });
        };
        (invoke as any).schema = state.schema;
        return invoke;
      },
    };
    return builder;
  },
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: mocks.getRequest,
  getCookie: mocks.getCookie,
  setCookie: mocks.setCookie,
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: mocks.getServerClient,
  getAnonServerClient: mocks.getAnonServerClient,
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: mocks.getServerIdentity,
  requireStaff: mocks.requireStaff,
  assertStoreAccess: mocks.assertStoreAccess,
}));

vi.mock("../api-orchestrator.functions", () => ({
  executeUnifiedAiCall: mocks.executeUnifiedAiCall,
}));

import {
  TEMPLATE_DEFAULT_PALETTES,
  PROPOSAL_NICHE_CATALOG,
  FONT_PRESET_OPTIONS,
  getContrastRatio,
  resolveProposalCanvasTheme,
  resolveProposalNicheCopy,
  normalizeProposalNicheId,
  normalizeCanonicalTemplateId,
  type ProposalTemplateCanonicalId,
  type ProposalNicheId,
} from "@/lib/tourism/proposal-theme-palettes";
import {
  calculateQuoteTotals,
  extractGatewayLogisticsFromNotes,
  extractLegacyRoomsFromNotes,
  sanitizeLegacyProposalSummaryNotes,
} from "@/lib/tourism/pricing";
import { proposalToEditorialClassified } from "@/lib/tourism/proposal-editorial-mapper";
import { getPublicTravelProposalByToken } from "../travel-proposal.functions";
import {
  UpdateTravelVoucherSchema,
  updateTravelVoucher,
  duplicateTravelVoucher,
} from "../travel-vouchers.functions";
import { updateFlightItinerary, duplicateFlightItinerary } from "../travel-flights.functions";
import { updateTravelContractDraft, duplicateTravelContract } from "../travel-contract.functions";
import { duplicateGroupTour } from "../group-tours.functions";
import { UpdateTravelSupplierSchema, updateTravelSupplier } from "../travel-suppliers.functions";

const STORE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_STORE_ID = "22222222-2222-4222-8222-222222222222";
const PROFILE_ID = "33333333-3333-4333-8333-333333333333";
const RECORD_ID = "44444444-4444-4444-8444-444444444444";

describe("Proposal Studio Multi-Niche, Bento Grid & Workspace CRUD E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerIdentity.mockResolvedValue({
      id: PROFILE_ID,
      store_id: STORE_ID,
      role: "admin",
    });
    mocks.requireStaff.mockResolvedValue({
      id: PROFILE_ID,
      store_id: STORE_ID,
      role: "admin",
    });
  });

  describe("1. 7 Paletas de Templates & Acessibilidade WCAG 2.2 AA", () => {
    it("garante fundo sólido não-transparente, fonte correta para Bento Grid e contraste >= 4.5:1 nos 7 modelos", () => {
      const ids: ProposalTemplateCanonicalId[] = [
        "editorial-flat",
        "dark-premium",
        "executivo-b2b",
        "landscape-presentation",
        "vertical-premium",
        "group-catalog",
        "bento-grid",
      ];

      expect(Object.keys(TEMPLATE_DEFAULT_PALETTES)).toHaveLength(7);
      expect(normalizeCanonicalTemplateId("bento")).toBe("bento-grid");

      for (const id of ids) {
        const theme = resolveProposalCanvasTheme({ templateId: id });
        expect(theme.templateId).toBe(id);
        expect(theme.canvasBg).toMatch(/^#[0-9A-F]{6}$/);
        expect(theme.cardBg).toMatch(/^#[0-9A-F]{6}$/);
        expect(getContrastRatio(theme.ink, theme.canvasBg)).toBeGreaterThanOrEqual(4.5);
        expect(getContrastRatio(theme.ink, theme.cardBg)).toBeGreaterThanOrEqual(4.5);
        expect(getContrastRatio(theme.brandFg, theme.brandColor)).toBeGreaterThanOrEqual(4.5);
      }

      const bentoTheme = resolveProposalCanvasTheme({ templateId: "bento-grid" });
      expect(bentoTheme.fontPreset).toBe("geometric");
    });

    it("resolve ProposalCoverCropConfig.fit, LogoConfig e ProposalPricingDisplayConfig completos", () => {
      const resolved = resolveProposalCanvasTheme({
        template_theme: "bento-grid",
        custom_fields: {
          cover_aspect_mode: "contain",
          cover_object_position: "center top",
          cover_scale: "1.4",
          logo_shape: "circle",
          logo_size: "lg",
          logo_position: "center",
          logo_object_position: "50% 25%",
          logo_scale: "1.5",
          show_price_per_person: "true",
          show_price_per_adult: "false",
          show_price_per_room: "true",
          custom_price_per_person_cents: "249000",
        },
      });

      expect(resolved.coverCrop.fit).toBe("contain");
      expect(resolved.coverCrop.aspectMode).toBe("contain");
      expect(resolved.coverCrop.objectPosition).toBe("center top");
      expect(resolved.coverCrop.scale).toBe(1.4);

      expect(resolved.logoConfig.shape).toBe("circle");
      expect(resolved.logoConfig.size).toBe("lg");
      expect(resolved.logoConfig.position).toBe("center");
      expect(resolved.logoConfig.objectPosition).toBe("50% 25%");
      expect(resolved.logoConfig.scale).toBe(1.5);

      expect(resolved.pricingDisplay.showPerPerson).toBe(true);
      expect(resolved.pricingDisplay.showPerAdult).toBe(false);
      expect(resolved.pricingDisplay.showPerRoom).toBe(true);
      expect(resolved.pricingDisplay.customPricePerPersonCents).toBe(249000);
      expect(resolved.pricingDisplay.customPerPersonCents).toBe(249000);
    });

    it("entrega heroKicker, specsSectionTitle e nicheSpecEntries preenchidos em todos os 7 nichos", () => {
      const niches: ProposalNicheId[] = [
        "tourism",
        "real_estate",
        "automotive",
        "projects",
        "services",
        "events",
        "retail",
      ];

      expect(normalizeProposalNicheId("imoveis")).toBe("real_estate");
      expect(normalizeProposalNicheId("veiculos")).toBe("automotive");
      expect(normalizeProposalNicheId("engenharia")).toBe("projects");

      for (const niche of niches) {
        const copy = resolveProposalNicheCopy(niche);
        expect(copy.id).toBe(niche);
        expect(copy.heroKicker.trim().length).toBeGreaterThan(5);
        expect(copy.specsSectionTitle.trim().length).toBeGreaterThan(5);
        expect(PROPOSAL_NICHE_CATALOG[niche].specFields.length).toBeGreaterThan(0);

        const firstField = copy.specFields[0];
        const theme = resolveProposalCanvasTheme({
          templateId: "bento-grid",
          custom_fields: {
            proposal_niche: niche,
            [firstField.key]: "Valor Especificado Teste",
          },
        });
        expect(theme.nicheId).toBe(niche);
        expect(theme.nicheSpecEntries).toEqual([
          {
            key: firstField.key,
            label: firstField.label,
            unit: firstField.unit,
            value: "Valor Especificado Teste",
          },
        ]);
      }
    });
  });

  describe("2. Precificação de Orçamentos, Quartos & Rateio (calculateQuoteTotals)", () => {
    it("calcula paxTotal, label por quarto, preço explícito por quarto e override custom_price_per_person_cents", () => {
      const totals = calculateQuoteTotals({
        pricing: {
          total_price_cents: 900000,
          base_price_cents: 900000,
          boarding_tax_cents: 0,
          discount_cents: 0,
        },
        pax_adults: 4,
        pax_children: 1,
        rooms: [
          {
            id: "r1",
            roomNumber: 1,
            roomType: "Suíte Luxo Frente Mar",
            adults: 2,
            children: 0,
            childrenAges: [],
            price_cents: 500000,
          },
          {
            id: "r2",
            roomNumber: 2,
            roomType: "Apartamento Standard",
            adults: 2,
            children: 1,
            childrenAges: [6],
          },
        ],
        custom_fields: {
          custom_price_per_person_cents: "199000",
        },
      } as any);

      expect(totals.paxTotal).toBe(5);
      expect(totals.passageirosTotal).toBe(5);
      expect(totals.total).toBe(9000);
      expect(totals.valorPorPessoa).toBe(1990);
      expect(totals.roomsBreakdown).toHaveLength(2);
      expect(totals.roomsBreakdown[0].label).toBe("Quarto 1 — Suíte Luxo Frente Mar");
      expect(totals.roomsBreakdown[0].totalReais).toBe(5000);
      expect(totals.roomsBreakdown[0].perPersonReais).toBe(2500);
      expect(totals.roomsBreakdown[1].label).toBe("Quarto 2 — Apartamento Standard");
    });
  });

  describe("3. Projeção Pública de Proposta Preserva Galeria & Higieniza Segredos", () => {
    it("mantém destination_gallery_urls e specs públicos enquanto remove chaves internas sensíveis", async () => {
      const galleryJson = JSON.stringify([
        "https://cdn.waesy.test/foto1.jpg",
        "https://cdn.waesy.test/foto2.jpg",
      ]);
      const fakeDb = {
        from: vi.fn((table: string) => {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            maybeSingle: vi.fn(async () => {
              if (table === "travel_proposals") {
                return {
                  data: {
                    id: RECORD_ID,
                    store_id: STORE_ID,
                    public_token: "prop_test_public_token_123456",
                    title: "Residencial Atlântico Premium",
                    status: "sent",
                    visibility_mode: "public",
                    is_hidden: false,
                    client_name: "Marciana",
                    destination_city: "Florianópolis",
                    pricing_data: {
                      total_price_cents: 1200000,
                      custom_fields: {
                        proposal_niche: "real_estate",
                        area_privativa_m2: "145 m²",
                        destination_gallery_urls: galleryJson,
                        supplier_net_cents: "900000",
                        internal_cost: "sigiloso",
                      },
                    },
                    stores: { name: "Agência Demo", logo_url: null, settings: {} },
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            }),
          };
          return chain;
        }),
      };
      mocks.getServerClient.mockReturnValue(fakeDb);
      mocks.getServerIdentity.mockResolvedValue(null);

      const dto = await getPublicTravelProposalByToken({
        data: { token: "prop_test_public_token_123456" },
      });

      expect(dto).not.toBeNull();
      expect(dto?.custom_fields?.destination_gallery_urls).toBe(galleryJson);
      expect(dto?.custom_fields?.proposal_niche).toBe("real_estate");
      expect(dto?.custom_fields?.area_privativa_m2).toBe("145 m²");
      expect(dto?.custom_fields?.supplier_net_cents).toBeUndefined();
      expect(dto?.custom_fields?.internal_cost).toBeUndefined();
    });
  });

  describe("4. Contratos CRUD Completos dos Módulos de Turismo", () => {
    it("updateTravelVoucher e duplicateTravelVoucher validam schema e clonam com novo hash QR", async () => {
      const parsed = UpdateTravelVoucherSchema.parse({
        id: RECORD_ID,
        title: "Voucher Hotel Editado",
        passenger_name: "Marciana Silva",
      });
      expect(parsed.title).toBe("Voucher Hotel Editado");

      let insertedPayload: any = null;
      const fakeDb = {
        from: vi.fn(() => {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            update: vi.fn((payload: any) => {
              chain._upd = payload;
              return chain;
            }),
            insert: vi.fn((payload: any) => {
              insertedPayload = payload;
              return chain;
            }),
            single: vi.fn(async () => ({
              data: insertedPayload
                ? { id: "new-voucher-id", ...insertedPayload }
                : {
                    id: RECORD_ID,
                    store_id: STORE_ID,
                    voucher_number: "VCH-001",
                    voucher_type: "hotel",
                    title: "Voucher Resort",
                    passenger_name: "Marciana",
                    qr_code_hash: "old-hash",
                    flight_data: {},
                    hotel_data: { hotelName: "Summerville" },
                    transfer_data: {},
                    status: "issued",
                  },
              error: null,
            })),
          };
          return chain;
        }),
      };
      mocks.getServerClient.mockReturnValue(fakeDb);

      const updated = await updateTravelVoucher({
        data: { id: RECORD_ID, title: "Voucher Editado" },
      });
      expect(updated.id).toBe(RECORD_ID);

      const cloned = await duplicateTravelVoucher({ data: { id: RECORD_ID } });
      expect(cloned.title).toBe("Voucher Resort (Cópia)");
      expect(cloned.voucher_number).toMatch(/^VCH-/);
      expect(cloned.qr_code_hash).not.toBe("old-hash");
      expect(cloned.status).toBe("issued");
    });

    it("updateTravelSupplier exige UUID e atualiza dentro do store_id do tenant", async () => {
      expect(() =>
        UpdateTravelSupplierSchema.parse({ id: "not-uuid", patch: { name: "X" } }),
      ).toThrow();

      let eqCalls: Array<[string, any]> = [];
      const fakeDb = {
        from: vi.fn(() => {
          const chain: any = {
            update: vi.fn(() => chain),
            eq: vi.fn((col: string, val: any) => {
              eqCalls.push([col, val]);
              return chain;
            }),
            select: vi.fn(() => chain),
            single: vi.fn(async () => ({
              data: { id: RECORD_ID, store_id: STORE_ID, name: "Operadora Atualizada" },
              error: null,
            })),
          };
          return chain;
        }),
      };
      mocks.getServerClient.mockReturnValue(fakeDb);

      const res = await updateTravelSupplier({
        data: { id: RECORD_ID, patch: { name: "Operadora Atualizada" } },
      });
      expect(res.name).toBe("Operadora Atualizada");
      expect(eqCalls).toContainEqual(["id", RECORD_ID]);
      expect(eqCalls).toContainEqual(["store_id", STORE_ID]);
    });

    it("updateFlightItinerary substitui segmentos e duplicateFlightItinerary cria versão draft clonada", async () => {
      let deletedSegments = false;
      let insertedSegments: any[] = [];
      let insertedItinerary: any = null;

      const fakeDb = {
        from: vi.fn((table: string) => {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            order: vi.fn(() => chain),
            limit: vi.fn(() => chain),
            update: vi.fn(() => chain),
            delete: vi.fn(() => {
              if (table === "travel_flight_segments") deletedSegments = true;
              return chain;
            }),
            insert: vi.fn((payload: any) => {
              if (table === "travel_flight_itineraries") insertedItinerary = payload;
              if (table === "travel_flight_segments") {
                insertedSegments = Array.isArray(payload) ? payload : [payload];
              }
              return chain;
            }),
            single: vi.fn(async () => {
              if (table === "travel_flight_itineraries") {
                return {
                  data: insertedItinerary
                    ? { id: "new-itin-id", ...insertedItinerary, segments: insertedSegments }
                    : {
                        id: RECORD_ID,
                        store_id: STORE_ID,
                        title: "Bilhete XAP-GRU",
                        itinerary_type: "confirmed",
                        version: 2,
                        notes: "{}",
                        segments: [
                          {
                            airline_code: "AD",
                            flight_number: "4020",
                            origin_iata: "XAP",
                            destination_iata: "VCP",
                            departure_at: "2027-02-01T08:00:00",
                            arrival_at: "2027-02-01T09:30:00",
                            cabin: "economy",
                            baggage: "1x 23kg",
                          },
                        ],
                      },
                  error: null,
                };
              }
              return { data: null, error: null };
            }),
            then: (resolve: any) => resolve({ data: [{ version: 2 }], error: null }),
          };
          return chain;
        }),
      };
      mocks.getServerClient.mockReturnValue(fakeDb);

      await updateFlightItinerary({
        data: {
          id: RECORD_ID,
          title: "Bilhete Editado",
          itinerary_type: "confirmed",
          segments: [
            {
              airline_code: "ad",
              flight_number: "4020",
              origin_iata: "xap",
              destination_iata: "rec",
              departure_at: "2027-02-01T08:00",
              arrival_at: "2027-02-01T14:00",
              cabin: "economy",
              baggage: "1x 23kg",
            },
          ],
        },
      });
      expect(deletedSegments).toBe(true);
      expect(insertedSegments[0]?.destination_iata).toBe("REC");

      const cloned = await duplicateFlightItinerary({ data: { id: RECORD_ID } });
      expect(cloned.status).toBe("draft");
      expect(cloned.title).toContain("(Cópia)");
      expect((cloned as any).version).toBe(3);
    });

    it("updateTravelContractDraft bloqueia contratos assinados e duplicateTravelContract clona minuta", async () => {
      const signedDb = {
        from: vi.fn(() => {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            single: vi.fn(async () => ({
              data: {
                id: RECORD_ID,
                status: "signed",
                title: "Contrato Assinado",
                metadata: { store_id: STORE_ID },
                current_version: 1,
                store_id: STORE_ID,
              },
              error: null,
            })),
          };
          return chain;
        }),
      };
      mocks.getServerClient.mockReturnValue(signedDb);

      await expect(
        updateTravelContractDraft({
          data: { id: RECORD_ID, contractTitle: "Tentativa Indevida" },
        }),
      ).rejects.toThrow(/assinados/i);

      const cloneRpc = vi.fn(async () => ({
        data: {
          success: true,
          contract_id: "cloned-contract-id",
          public_token: "tok_cloned_123",
        },
        error: null,
      }));
      const draftDb = {
        rpc: cloneRpc,
        from: vi.fn((table: string) => {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            maybeSingle: vi.fn(async () => ({
              data: table === "contract_versions" ? { title: "Minuta Base", clauses: [] } : null,
              error: null,
            })),
            single: vi.fn(async () => ({
              data: {
                id: RECORD_ID,
                status: "pending",
                title: "Contrato Original",
                current_version: 1,
                store_id: STORE_ID,
                metadata: { store_id: STORE_ID, client_name: "Marciana", destination: "Recife" },
              },
              error: null,
            })),
          };
          return chain;
        }),
      };
      mocks.getServerClient.mockReturnValue(draftDb);

      const dup = await duplicateTravelContract({ data: { id: RECORD_ID } });
      expect(dup.success).toBe(true);
      expect(dup.id).toBe("cloned-contract-id");
      expect(cloneRpc).toHaveBeenCalledTimes(1);
    });

    it("duplicateGroupTour limpa PII das poltronas mantendo bloqueios e restaura vagas em rascunho", async () => {
      let insertedGroup: any = null;
      const groupDb = {
        from: vi.fn(() => {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            insert: vi.fn((payload: any) => {
              insertedGroup = payload;
              return chain;
            }),
            single: vi.fn(async () => ({
              data: insertedGroup
                ? { id: "new-group-id" }
                : {
                    id: RECORD_ID,
                    store_id: STORE_ID,
                    title: "Excursão Aparecida",
                    destination: "Aparecida, SP",
                    price_cents: 65000,
                    total_seats: 46,
                    available_seats: 10,
                    seats: [
                      {
                        seat_number: 1,
                        row: 1,
                        column: "A",
                        floor: 1,
                        status: "reserved",
                        passenger_name: "Cliente Antigo",
                        passenger_document: "12345678900",
                        passenger_phone: "49999999999",
                      },
                      {
                        seat_number: 2,
                        row: 1,
                        column: "B",
                        floor: 1,
                        status: "blocked",
                        passenger_name: null,
                      },
                    ],
                  },
              error: null,
            })),
          };
          return chain;
        }),
      };
      mocks.getServerClient.mockReturnValue(groupDb);

      const res = await duplicateGroupTour({ data: { id: RECORD_ID } });
      expect(res.success).toBe(true);
      expect(res.id).toBe("new-group-id");
      expect(insertedGroup.status).toBe("draft");
      expect(insertedGroup.title).toBe("Excursão Aparecida (Cópia)");
      expect(insertedGroup.available_seats).toBe(46);
      expect(insertedGroup.seats[0].status).toBe("free");
      expect(insertedGroup.seats[0].passenger_name).toBeNull();
      expect(insertedGroup.seats[0].passenger_document).toBeNull();
      expect(insertedGroup.seats[1].status).toBe("blocked");
    });

    it("rejeita tentativa cross-tenant ao tentar duplicar excursão de outra loja", async () => {
      const otherStoreDb = {
        from: vi.fn(() => {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            single: vi.fn(async () => ({
              data: { id: RECORD_ID, store_id: OTHER_STORE_ID, title: "Excursão Externa" },
              error: null,
            })),
          };
          return chain;
        }),
      };
      mocks.getServerClient.mockReturnValue(otherStoreDb);

      await expect(duplicateGroupTour({ data: { id: RECORD_ID } })).rejects.toThrow(/autorizado/i);
    });
  });

  describe("5. Higienização de Notas Legadas, Fontes Reais & Mapper Editorial Completo", () => {
    it("extrai quartos/gateway e remove resumo concatenado legado da capa sem perder observações humanas", () => {
      const legacyNotes = [
        "Proposta de Viagem (Porto de Galinhas).",
        "Divisão por Quartos: • Quarto 1 — Casal (2 Adultos + 1 Crianças): R$ 14.660,62",
        "Itens Inclusos: Passagem aérea ida e volta",
        "Logística Regional de Aeroporto Gateway: Desembarque em REC + transfer regular.",
        "Observação especial: Quarto próximo à piscina térrea.",
      ].join("\n");

      const rooms = extractLegacyRoomsFromNotes(legacyNotes);
      const gateway = extractGatewayLogisticsFromNotes(legacyNotes);
      const cleaned = sanitizeLegacyProposalSummaryNotes(legacyNotes);

      expect(rooms).toHaveLength(1);
      expect(rooms[0].adults).toBe(2);
      expect(rooms[0].children).toBe(1);
      expect(rooms[0].totalReais).toBeCloseTo(14660.62, 2);
      expect(gateway).toContain("Desembarque em REC");
      expect(cleaned).not.toContain("Divisão por Quartos:");
      expect(cleaned).toContain("Quarto próximo à piscina térrea.");
    });

    it("oferece pares tipográficos distintos em FONT_PRESET_OPTIONS e mapeia imagens/preços para o Editorial", () => {
      const headingFamilies = new Set(FONT_PRESET_OPTIONS.map((f) => f.headingFont));
      expect(FONT_PRESET_OPTIONS.length).toBe(5);
      expect(headingFamilies.size).toBe(5);

      const classified = proposalToEditorialClassified({
        id: RECORD_ID,
        store_id: STORE_ID,
        agency_name: "Casa & Obra Incorporadora",
        agency_logo_url: "https://cdn.waesy.test/logo.png",
        agency_whatsapp: "49999998888",
        quote_id: RECORD_ID,
        public_token: "tok-imovel",
        title: "Cobertura Duplex Vista Mar",
        subtitle: "3 suítes e terraço gourmet",
        cover_image_url: "https://cdn.waesy.test/capa-imovel.jpg",
        client_name: "Marciana",
        client_whatsapp: "49988887777",
        adults_count: 2,
        children_count: 1,
        destination_city: "Florianópolis, SC",
        flights: [],
        hotels: [
          {
            hotel_name: "Bloco A - Torre Atlântica",
            room_type: "Unidade 1401",
            images: ["https://cdn.waesy.test/apto-living.jpg"],
          },
        ],
        itinerary: [
          {
            day_number: 1,
            title: "Visita Técnica & Memorial Descritivo",
            description: "Tour completo pela área comum e planta.",
            images: ["https://cdn.waesy.test/planta.jpg"],
          },
        ],
        transfers: [],
        tours: [
          {
            id: "t-1",
            title: "Vistoria de Acabamentos",
            image_url: "https://cdn.waesy.test/acabamentos.jpg",
            included: true,
          },
        ],
        rooms: [
          {
            id: "rm-1",
            roomNumber: 1,
            roomType: "Unidade Principal",
            adults: 2,
            children: 0,
            childrenAges: [],
            price_cents: 185000000,
            price_per_person_cents: 92500000,
          },
        ],
        includes: ["Documentação e escritura assistida"],
        excludes: [],
        pricing: {
          currency: "BRL",
          base_price_cents: 185000000,
          boarding_tax_cents: 0,
          other_taxes_cents: 0,
          discount_cents: 0,
          total_price_cents: 185000000,
          installments_options: [],
          custom_fields: {
            proposal_niche: "real_estate",
            area_privativa_m2: "210 m²",
          },
        },
        custom_fields: {
          proposal_niche: "real_estate",
          area_privativa_m2: "210 m²",
        },
        status: "sent",
        valid_until: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      expect(classified.images).toContain("https://cdn.waesy.test/capa-imovel.jpg");
      expect(classified.images).toContain("https://cdn.waesy.test/apto-living.jpg");
      expect(classified.images).toContain("https://cdn.waesy.test/planta.jpg");
      expect(classified.images).toContain("https://cdn.waesy.test/acabamentos.jpg");
      expect(classified.attributes.price_per_adult_cents).toBeGreaterThan(0);
      expect(classified.attributes.itinerary_days[0].images).toEqual(["https://cdn.waesy.test/planta.jpg"]);
    });
  });
});
