import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerClient: vi.fn(),
  getServerIdentity: vi.fn(),
  requireStaff: vi.fn(),
  executeUnifiedAiCall: vi.fn(),
  extractDocumentMechanically: vi.fn(),
  convertProposalToTrip: vi.fn(),
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
}));
vi.mock("./api-orchestrator.functions", () => ({
  executeUnifiedAiCall: mocks.executeUnifiedAiCall,
}));
vi.mock("./mechanical-document-extractor.server", () => ({
  extractDocumentMechanically: mocks.extractDocumentMechanically,
}));
vi.mock("@/services/travel-lifecycle.functions", () => ({
  convertProposalToTrip: mocks.convertProposalToTrip,
}));

import {
  createTravelProposal,
  generateProposalItineraryAI,
  upsertProposalWebPage,
} from "./travel-proposal.functions";
import { processOperatorQuoteOcr } from "./travel-operator-ocr.functions";

const STORE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PROPOSAL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STAFF_ID = "11111111-1111-4111-8111-111111111111";

function createStudioDb(options: {
  proposalRow?: Record<string, unknown> | null;
  webPageSavedRow?: Record<string, unknown> | null;
} = {}) {
  const operations: Array<{ table: string; op: string; payload?: any }> = [];

  const from = vi.fn((table: string) => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      insert: vi.fn((payload: any) => {
        operations.push({ table, op: "insert", payload });
        return chain;
      }),
      upsert: vi.fn((payload: any) => {
        operations.push({ table, op: "upsert", payload });
        return chain;
      }),
      update: vi.fn((payload: any) => {
        operations.push({ table, op: "update", payload });
        return chain;
      }),
      maybeSingle: vi.fn(async () => {
        if (table === "stores") {
          return {
            data: { id: STORE_ID, name: "Excelência Tour", logo_url: null, whatsapp: "49999999999" },
            error: null,
          };
        }
        if (table === "travel_proposals") {
          return { data: options.proposalRow ?? null, error: null };
        }
        return { data: null, error: null };
      }),
      single: vi.fn(async () => {
        if (table === "travel_proposals") {
          return { data: { id: PROPOSAL_ID }, error: null };
        }
        if (table === "proposal_web_pages") {
          return {
            data: options.webPageSavedRow ?? {
              id: "wp-1",
              proposal_id: PROPOSAL_ID,
              store_id: STORE_ID,
              headline: "Roteiro Fortaleza & Jeri",
              is_published: true,
              hero_media: [],
              blocks: [],
            },
            error: null,
          };
        }
        if (table === "quotes") {
          return { data: { id: PROPOSAL_ID }, error: null };
        }
        return { data: null, error: null };
      }),
    };
    return chain;
  });

  return { db: { from }, operations };
}

describe("Studio V2 Server Functions (Web Page, Roteiro IA, OCR Combinado)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireStaff.mockResolvedValue({
      id: STAFF_ID,
      store_id: STORE_ID,
      role: "owner",
    });
    mocks.getServerIdentity.mockResolvedValue({
      id: STAFF_ID,
      store_id: STORE_ID,
      role: "owner",
    });
  });

  describe("upsertProposalWebPage", () => {
    it("persists full web page customization including multi-media hero and custom video/gallery blocks", async () => {
      const { db, operations } = createStudioDb({
        proposalRow: {
          id: PROPOSAL_ID,
          store_id: STORE_ID,
          title: "Fortaleza e Jericoacoara",
          subtitle: "7 dias completos",
          destination_city: "Fortaleza e Jericoacoara",
          hero_image_url: "https://cdn.example.com/capa.jpg",
          options: [],
        },
      });
      mocks.getServerClient.mockReturnValue(db);

      const heroMedia = [
        { id: "m1", url: "https://cdn.example.com/capa.jpg", type: "image", aspectPreset: "16:9" },
        { id: "m2", url: "https://cdn.example.com/tour.mp4", type: "video", aspectPreset: "9:16" },
      ];
      const blocks = [
        { id: "blk-hero", type: "hero", title: "Jericoacoara VIP", visible: true, order: 0 },
        { id: "blk-gal", type: "gallery", title: "Fotos do Hotel", visible: true, order: 1, media: heroMedia },
      ];

      const res = await upsertProposalWebPage({
        data: {
          proposalId: PROPOSAL_ID,
          slug: "fortaleza-jeri-vip",
          headline: "Fortaleza + Jericoacoara VIP",
          subheadline: "Aéreo Azul + 2 Hotéis + Transfer 4x4",
          theme_preset: "modern",
          accent_color: null,
          hero_layout: "gallery",
          hero_media: heroMedia,
          blocks,
          show_option_tabs: false,
          cta_label: "Reservar Agora",
          is_published: true,
          seo_title: "Proposta Fortaleza + Jeri",
          seo_description: "Confira todos os detalhes do pacote.",
        },
      });

      expect(res.success).toBe(true);
      const upsertCall = operations.find((op) => op.table === "proposal_web_pages" && op.op === "upsert");
      expect(upsertCall).toBeTruthy();
      expect(upsertCall?.payload.headline).toBe("Fortaleza + Jericoacoara VIP");
      expect(upsertCall?.payload.hero_layout).toBe("gallery");
      expect(upsertCall?.payload.hero_media).toHaveLength(2);
      expect(upsertCall?.payload.blocks).toHaveLength(2);
    });

    it("handles minimal nullable parameters safely with deterministic defaults (B.25)", async () => {
      const { db, operations } = createStudioDb({
        proposalRow: {
          id: PROPOSAL_ID,
          store_id: STORE_ID,
          title: "Curitiba Express",
          subtitle: null,
          destination_city: "Curitiba",
          hero_image_url: null,
          options: [],
        },
      });
      mocks.getServerClient.mockReturnValue(db);

      const res = await upsertProposalWebPage({
        data: {
          proposalId: PROPOSAL_ID,
          headline: null,
          subheadline: null,
          slug: null,
          accent_color: null,
          cta_label: null,
          seo_title: null,
          seo_description: null,
        },
      });

      expect(res.success).toBe(true);
      const upsertCall = operations.find((op) => op.table === "proposal_web_pages" && op.op === "upsert");
      expect(upsertCall?.payload.proposal_id).toBe(PROPOSAL_ID);
      expect(Array.isArray(upsertCall?.payload.blocks)).toBe(true);
      expect(upsertCall?.payload.blocks.length).toBeGreaterThan(0);
    });

    it("persists gallery_mosaic_3, gallery_bento_4, countdown, seats, payment simulator, trust badges and FAQ/flight blocks", async () => {
      const { db, operations } = createStudioDb({
        proposalRow: {
          id: PROPOSAL_ID,
          store_id: STORE_ID,
          title: "Caribe Completo",
          subtitle: "Cancún & Playa del Carmen",
          destination_city: "Cancún",
          hero_image_url: "https://cdn.example.com/cancun.jpg",
          options: [],
        },
      });
      mocks.getServerClient.mockReturnValue(db);

      const res = await upsertProposalWebPage({
        data: {
          proposalId: PROPOSAL_ID,
          theme_preset: "boutique",
          accent_color: "#7F1D1D",
          hero_layout: "gallery_mosaic_3",
          hero_media: [
            {
              id: "m1",
              url: "https://cdn.example.com/cancun-1.jpg",
              type: "image",
              aspectPreset: "16:9",
              crop_x: 10,
              crop_y: 20,
              crop_width: 1920,
              crop_height: 1080,
              image_scale: 1.15,
              slot_role: "hero_primary",
            },
          ],
          blocks: [
            { id: "blk-hero", type: "hero", title: "Caribe VIP", visible: true, order: 0 },
            { id: "blk-map", type: "flight_route_map", title: "Mapa Aéreo", visible: true, order: 1 },
            {
              id: "blk-faq",
              type: "faq",
              title: "Dúvidas",
              visible: true,
              order: 2,
              faqItems: [{ question: "Precisa de visto?", answer: "Apenas passaporte válido." }],
            },
          ],
          countdown_config: { enabled: true, mode: "proposal_valid_until", label: "Expira em" },
          availability_config: { enabled: true, spots_remaining: 4, label: "Restam 4 lugares" },
          payment_display_config: {
            show_pix: true,
            pix_discount_percent: 5,
            show_card: true,
            max_installments: 12,
            interest_free: true,
            show_boleto: true,
            boleto_due_days: 5,
            show_financing: true,
            financing_notes: "Parcelamento bancário",
            show_installment_simulator: true,
          },
          trust_badges_config: {
            agency_verified: true,
            cadastur_badge: true,
            support_24h: true,
            free_rebooking: false,
            secure_payment: true,
          },
          show_flight_route_map: true,
        },
      });

      expect(res.success).toBe(true);
      const upsertCall = operations.find((op) => op.table === "proposal_web_pages" && op.op === "upsert");
      expect(upsertCall?.payload.hero_layout).toBe("gallery_mosaic_3");
      expect(upsertCall?.payload.accent_color).toBe("#7F1D1D");
      expect(upsertCall?.payload.countdown_config?.enabled).toBe(true);
      expect(upsertCall?.payload.availability_config?.spots_remaining).toBe(4);
      expect(upsertCall?.payload.payment_display_config?.max_installments).toBe(12);
      expect(upsertCall?.payload.trust_badges_config?.cadastur_badge).toBe(true);
      expect(upsertCall?.payload.show_flight_route_map).toBe(true);
    });

    it("rejects unauthorized cross-store or missing proposal", async () => {
      const { db } = createStudioDb({ proposalRow: null });
      mocks.getServerClient.mockReturnValue(db);

      await expect(
        upsertProposalWebPage({
          data: { proposalId: PROPOSAL_ID },
        }),
      ).rejects.toThrow("Proposta não encontrada ou sem permissão nesta loja.");
    });
  });

  describe("createTravelProposal createWebPage toggle", () => {
    it("auto-creates proposal_web_pages when createWebPage is true", async () => {
      const { db, operations } = createStudioDb();
      mocks.getServerClient.mockReturnValue(db);

      const res = await createTravelProposal({
        data: {
          title: "Pacote Fortaleza + Jeri",
          destination: "Fortaleza e Jericoacoara",
          clientName: "Vanusa",
          travelStartDate: "2027-03-17",
          travelEndDate: "2027-03-23",
          hotels: [
            { hotel_name: "Hotel Diogo", checkin_date: "2027-03-17", checkout_date: "2027-03-20" },
            { hotel_name: "Pousada Angélica", checkin_date: "2027-03-20", checkout_date: "2027-03-23" },
          ],
          transfers: [
            { name: "Transfer Regular Aeroporto Fortaleza / Hotel", kind: "round_trip", price_cents: 16216 },
            { name: "Transfer 4x4 Fortaleza / Jericoacoara", kind: "intercity", price_cents: 45000 },
          ],
          tours: [
            { title: "Passeio City Tour em Fortaleza", included: true },
          ],
          createWebPage: true,
        },
      });

      expect(res.success).toBe(true);
      const webPageInsert = operations.find((op) => op.table === "proposal_web_pages" && op.op === "upsert");
      expect(webPageInsert).toBeTruthy();
      expect(webPageInsert?.payload.proposal_id).toBe(PROPOSAL_ID);
      expect(webPageInsert?.payload.is_published).toBe(true);
    });

    it("does not write proposal_web_pages when createWebPage is omitted/false", async () => {
      const { db, operations } = createStudioDb();
      mocks.getServerClient.mockReturnValue(db);

      const res = await createTravelProposal({
        data: {
          title: "Pacote Sem Web Page",
          destination: "Maceió",
          clientName: "João",
          createWebPage: false,
        },
      });

      expect(res.success).toBe(true);
      const webPageInsert = operations.find((op) => op.table === "proposal_web_pages");
      expect(webPageInsert).toBeUndefined();
    });
  });

  describe("generateProposalItineraryAI", () => {
    it("uses rawItineraryText directly when operator OCR already contains day-by-day lines", async () => {
      const res = await generateProposalItineraryAI({
        data: {
          destination: "Fortaleza e Jericoacoara",
          startDate: "2027-03-17",
          endDate: "2027-03-20",
          rawItineraryText:
            "Dia 1: Embarque em Chapecó e chegada em Fortaleza com transfer.\nDia 2: City Tour histórico e Beira Mar.",
          useAiEnrichment: true,
        },
      });

      expect(res.success).toBe(true);
      expect(res.source).toBe("ocr_text");
      expect(res.days).toHaveLength(2);
      expect(mocks.executeUnifiedAiCall).not.toHaveBeenCalled();
    });

    it("enriches structured schedule with AI when available and preserves days count", async () => {
      mocks.executeUnifiedAiCall.mockResolvedValue({
        text: JSON.stringify({
          days: [
            {
              day_number: 1,
              title: "Chegada em Fortaleza + Check-in Hotel Diogo",
              description: "Recepção no aeroporto e traslado ao Hotel Diogo.",
              location: "Fortaleza",
              included_meals: ["Sem refeições"],
            },
            {
              day_number: 2,
              title: "City Tour Fortaleza e Praia do Futuro",
              description: "Passeio panorâmico incluso no pacote.",
              location: "Fortaleza",
              included_meals: ["Café da manhã"],
            },
          ],
        }),
      });

      const res = await generateProposalItineraryAI({
        data: {
          proposalId: PROPOSAL_ID,
          destination: "Fortaleza",
          startDate: "2027-03-17",
          endDate: "2027-03-18",
          hotels: [{ hotel_name: "Hotel Diogo", city: "Fortaleza", board_basis: "Café da manhã" }],
          tours: [{ title: "City Tour em Fortaleza", date: "2027-03-18", included: true }],
          transfers: [{ name: "Transfer Aeroporto / Hotel", date: "2027-03-17" }],
          flights: [{ origin_iata: "XAP", destination_iata: "FOR", departure_date: "2027-03-17" }],
          useAiEnrichment: true,
        },
      });

      expect(res.success).toBe(true);
      expect(res.source).toBe("ai_enriched");
      expect(res.days).toHaveLength(2);
      expect(res.days[1]?.title).toContain("City Tour");
    });

    it("falls back to structured_schedule cleanly if AI throws or optional fields are omitted (B.25)", async () => {
      mocks.executeUnifiedAiCall.mockRejectedValue(new Error("AI Quota exceeded"));

      const res = await generateProposalItineraryAI({
        data: {
          destination: "Porto de Galinhas",
          startDate: null,
          endDate: null,
          tours: [{ title: "Praia dos Carneiros", included: true }],
        },
      });

      expect(res.success).toBe(true);
      expect(res.source).toBe("structured_schedule");
      expect(res.days.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("processOperatorQuoteOcr combined transfer/tour + price parsing", () => {
    it("splits combined transfer+tour items, fixes BRL small decimal values, and handles present/absent storeId", async () => {
      mocks.extractDocumentMechanically.mockResolvedValue({
        text: "Orçamento 642225 - FRT Operadora - Maceió",
      });
      mocks.executeUnifiedAiCall.mockResolvedValue({
        text: JSON.stringify({
          operator_name: "FRT",
          quote_reference_number: "642225",
          destination: "Maceió",
          travel_start: "2027-01-09",
          travel_end: "2027-01-14",
          adults_count: 2,
          children_count: 0,
          hotels: [
            {
              hotel_name: "Acqua Suites Maceió",
              checkin_date: "2027-01-09",
              checkout_date: "2027-01-14",
              price_cents: "2945.00",
            },
          ],
          transfers: [
            {
              name: "Transfer Regular Aeroporto Maceió / Hotel (Ida e Volta) + Passeio City Tour em Maceió",
              vehicle_type: "Transfer Regular",
              price_cents: "243.06",
            },
          ],
          gross_price_cents: "5491.33",
        }),
      });

      const resWithStore = await processOperatorQuoteOcr({
        data: {
          rawText: "Cotação FRT Maceió Total R$ 5.491,33",
          fileName: "frt.png",
          storeId: STORE_ID,
        },
      });

      expect(resWithStore.success).toBe(true);
      expect(resWithStore.data.gross_price_cents).toBe(549133);
      expect(resWithStore.data.transfers).toHaveLength(1);
      expect((resWithStore.data.transfers?.[0] as any)?.price_cents).toBe(24306);
      expect(
        resWithStore.data.tours?.some((t: any) =>
          String(t.title || t).toLowerCase().includes("city tour"),
        ),
      ).toBe(true);

      const resWithoutStore = await processOperatorQuoteOcr({
        data: {
          rawText: "Cotação mínima sem storeId",
        },
      });
      expect(resWithoutStore.success).toBe(true);
      expect(mocks.executeUnifiedAiCall).toHaveBeenLastCalledWith(
        expect.objectContaining({ storeId: undefined }),
      );
    });
  });
});
