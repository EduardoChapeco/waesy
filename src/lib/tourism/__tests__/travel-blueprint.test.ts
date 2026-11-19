import { describe, expect, it, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  blueprintFromGroupTour,
  blueprintFromPackage,
  blueprintToTravelProposalDTO,
  parseExperienceMetaDescription,
  sanitizePublicBusSeats,
} from "../travel-blueprint";
import { extractNormalizedCatalogContext } from "@/lib/niches/unified-field-bridge";

const mockRequireStaff = vi.fn();
const mockGetServerIdentity = vi.fn();

const mockState = {
  experienceSelectRow: null as any,
  updateCalls: [] as Array<{ table: string; patch: any; filters: Record<string, any> }>,
  listPublicRows: [] as any[],
  getPublicRow: null as any,
};

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { schema?: any } = {};
    const builder: any = {
      validator: (schema: any) => {
        state.schema = schema;
        return builder;
      },
      handler: (handler: (args: any) => unknown) => {
        return (args: any) => {
          const parsedData = state.schema?.parse ? state.schema.parse(args?.data) : args?.data;
          return handler({ data: parsedData });
        };
      },
    };
    return builder;
  },
}));

function createSupabaseStub() {
  const makeQuery = (table: string): any => {
    const ctx: any = {
      filters: {},
      op: "select",
      patch: null,
    };
    const builder: any = {
      select: () => builder,
      update: (patch: any) => {
        ctx.op = "update";
        ctx.patch = patch;
        return builder;
      },
      insert: (payload: any) => ({
        select: () => ({
          single: async () => ({ data: { id: "new-id", ...payload }, error: null }),
        }),
      }),
      eq: (col: string, val: any) => {
        ctx.filters[col] = val;
        return builder;
      },
      neq: () => builder,
      in: () => builder,
      or: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => {
        if (ctx.op === "select" && table === "tourism_experiences") {
          return {
            data: mockState.getPublicRow ?? mockState.experienceSelectRow,
            error: null,
          };
        }
        return { data: null, error: null };
      },
      single: async () => ({ data: mockState.experienceSelectRow, error: null }),
      then: (resolve: any) => {
        if (ctx.op === "update") {
          mockState.updateCalls.push({ table, patch: ctx.patch, filters: ctx.filters });
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (table === "tourism_experiences") {
          return Promise.resolve({ data: mockState.listPublicRows, error: null }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    };
    return builder;
  };
  return {
    from: (table: string) => makeQuery(table),
  };
}

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => createSupabaseStub(),
  getAnonServerClient: () => createSupabaseStub(),
}));

vi.mock("@/lib/server-access", () => ({
  requireStaff: () => mockRequireStaff(),
  getServerIdentity: () => mockGetServerIdentity(),
}));

vi.mock("@/services/cart-helpers", () => ({
  getCurrentIdentity: async () => null,
}));

vi.mock("@/services/travel-quote-session.service", () => ({
  createCanonicalQuoteSession: async () => ({ id: "sess-1" }),
}));

import { updateGroupTourContent } from "@/services/group-tours.functions";
import { getPublicTourismById, listPublicTourism } from "@/services/tourism.functions";

describe("Unified Tourism Pipeline E2E (T0-T6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.experienceSelectRow = null;
    mockState.updateCalls = [];
    mockState.listPublicRows = [];
    mockState.getPublicRow = null;
    mockRequireStaff.mockResolvedValue({
      id: "staff-1",
      store_id: "store-a",
      role: "store_admin",
    });
    mockGetServerIdentity.mockResolvedValue({
      id: "staff-1",
      store_id: "store-a",
      role: "store_admin",
    });
  });

  it("T1: sanitizePublicBusSeats removes all passenger PII while keeping seat availability", () => {
    const sanitized = sanitizePublicBusSeats([
      {
        seat_number: 12,
        row: 3,
        column: "D",
        floor: 2,
        status: "reserved",
        passenger_name: "Maria Silva",
        passenger_document: "12345678900",
        passenger_phone: "49999990000",
        boarding_point: "Praça Central",
      },
      {
        seat_number: 13,
        row: 4,
        column: "A",
        floor: 1,
        status: "free",
      },
    ]);

    expect(sanitized).toEqual([
      { seat_number: 12, row: 3, column: "D", floor: 2, status: "reserved" },
      { seat_number: 13, row: 4, column: "A", floor: 1, status: "free" },
    ]);
    expect(JSON.stringify(sanitized)).not.toContain("Maria Silva");
    expect(JSON.stringify(sanitized)).not.toContain("12345678900");
    expect(JSON.stringify(sanitized)).not.toContain("49999990000");
  });

  it("T1/T2: parseExperienceMetaDescription never leaks raw JSON into human text", () => {
    const raw = JSON.stringify({
      slug: "beto-carrero",
      notes: "Saída garantida em ônibus leito total",
      boarding_points: [{ city: "Chapecó", time: "22:00", location: "Terminal" }],
    });
    const parsed = parseExperienceMetaDescription(raw);
    expect(parsed.humanText).toBe("Saída garantida em ônibus leito total");
    expect(parsed.meta.boarding_points).toHaveLength(1);

    const noNotes = parseExperienceMetaDescription(JSON.stringify({ slug: "sem-notas" }));
    expect(noNotes.humanText).toBe("");
  });

  it("T1/T3/T5: blueprintFromPackage preserves multi-hotels with videos, transfers, tours and web_page_config 1:1", () => {
    const bp = blueprintFromPackage(
      {
        transport_type: "misto",
        destination: { name: "Maceió & Maragogi", region: "AL", country: "Brasil" },
        resort: { name: "Jatiúca Resort", meal_plan: "Meia Pensão" },
        hotels: [
          {
            id: "h1",
            hotel_name: "Jatiúca Hotel",
            destination: "Maceió",
            board_basis: "Café da Manhã",
            images: ["https://cdn.waesy.test/h1.jpg"],
            video_url: "https://www.youtube.com/watch?v=abc123",
          },
          {
            id: "h2",
            hotel_name: "Salinas Maragogi",
            destination: "Maragogi",
            board_basis: "All Inclusive",
            images: ["https://cdn.waesy.test/h2.jpg"],
          },
        ],
        transfers: [
          { id: "tr1", name: "Transfer Aeroporto Zumbi / Hotel", kind: "arrival", vehicle: "Van Privativa" },
        ],
        tours: [
          { id: "tour1", title: "Piscinas Naturais de Maragogi", duration: "Dia inteiro", included: true },
        ],
        boarding_points: [{ city: "São Miguel do Oeste", time: "04:30", location: "Agência Centro" }],
        inclusions: ["Aéreo", "2 Hotéis"],
        itinerary_days: [
          { id: "d1", day: 1, title: "Chegada Maceió", description: "Check-in hotel", images: ["https://cdn.waesy.test/d1.jpg"] },
        ],
        web_page_config: {
          headline: "Alagoas Combo",
          hero_media: [{ id: "m1", url: "https://cdn.waesy.test/hero.jpg", type: "image", order: 0 }],
          blocks: [{ id: "b1", type: "hero", visible: true, order: 0 }],
          is_published: true,
        },
      },
      { id: "prod-1", title: "Combo Maceió + Maragogi", priceCents: 459000 },
    );

    expect(bp.hotels).toHaveLength(2);
    expect(bp.transfers).toHaveLength(1);
    expect(bp.tours).toHaveLength(1);
    expect(bp.boardingPoints).toHaveLength(1);
    expect(bp.webPageConfig?.headline).toBe("Alagoas Combo");

    const dto = blueprintToTravelProposalDTO(bp);
    expect(dto.hotels).toHaveLength(2);
    expect(dto.transfers?.[0]?.name || dto.transfers?.[0]?.title).toContain("Zumbi");
    expect(dto.tours?.[0]?.title).toContain("Maragogi");
    expect(dto.web_page?.headline).toBe("Alagoas Combo");
  });

  it("T4: extractNormalizedCatalogContext hydrates experience rows cleanly for Proposal Workspace", () => {
    const ctx = extractNormalizedCatalogContext(
      {
        origin: "experience",
        row: {
          id: "exc-1",
          title: "Excursão Gramado Natal Luz",
          destination_city: "Gramado",
          departure_city: "Chapecó",
          departure_date: "2026-12-10T06:00:00Z",
          return_date: "2026-12-14T20:00:00Z",
          price_cents: 189000,
          description: JSON.stringify({
            notes: "Ônibus Leito DD",
            boarding_points: [{ city: "Chapecó", time: "06:00", location: "Rodoviária" }],
          }),
          hotels: [{ id: "eh-1", hotel_name: "Laghetto Stilo", board_basis: "Café da Manhã" }],
          transfers: [{ id: "et-1", name: "Bus Leito DD", kind: "bus", vehicle: "DD" }],
          tours: [{ id: "etour-1", title: "Tour Vale dos Vinhedos", included: true }],
          included_items: ["Transporte DD", "Hotel 4 estrelas"],
          excluded_items: ["Ingressos opcionais"],
        },
      },
      "tourism",
    );

    expect(ctx.origin).toBe("experience");
    expect(ctx.destination).toBe("Gramado");
    expect(ctx.hotels).toHaveLength(1);
    expect(ctx.transfers).toHaveLength(1);
    expect(ctx.tours).toHaveLength(1);
    expect(ctx.boardingPoints[0]).toContain("Chapecó");
    expect(ctx.description).toBe("Ônibus Leito DD");
  });

  it("T2: getPublicTourismById strips seat PII and exposes structured excursion fields", async () => {
    mockState.getPublicRow = {
      id: "exc-pub-1",
      store_id: "store-a",
      title: "Beto Carrero World",
      category: "group_tour",
      location: "Penha",
      destination: "Penha",
      price_cents: 95000,
      price_display: "R$ 950,00",
      duration: "2 dias",
      description: JSON.stringify({ slug: "bcw", notes: "Saída noturna" }),
      departure_time: "22:00",
      return_time: "18:00",
      bus_company_name: "Expresso Sul",
      excluded_items: ["Alimentação no parque"],
      boarding_points: [{ city: "SMO", time: "21:30", location: "Matriz" }],
      pricing_tiers: [{ name: "Duplo", price: 950 }],
      extra_options: [{ name: "Passaporte 2 dias", price: 220 }],
      seats: [
        {
          seat_number: 5,
          row: 2,
          column: "A",
          floor: 1,
          status: "reserved",
          passenger_name: "SEGREDO CPF",
          passenger_document: "99988877766",
          passenger_phone: "49988887777",
        },
      ],
      created_at: "2026-11-16T00:00:00Z",
    };

    const res: any = await getPublicTourismById({ data: { experienceId: "exc-pub-1" } });
    expect(res.summary).toBe("Saída noturna");
    expect(res.summary).not.toContain("{");
    expect(res.bus_company_name).toBe("Expresso Sul");
    expect(res.excluded_items).toEqual(["Alimentação no parque"]);
    expect(res.boarding_points).toHaveLength(1);
    expect(res.seats).toEqual([{ seat_number: 5, row: 2, column: "A", floor: 1, status: "reserved" }]);
    expect(JSON.stringify(res)).not.toContain("99988877766");
    expect(JSON.stringify(res)).not.toContain("SEGREDO CPF");
  });

  it("T2/B.25: updateGroupTourContent handles optional/absent fields and blocks cross-tenant IDOR", async () => {
    mockState.experienceSelectRow = {
      id: "11111111-1111-4111-8111-111111111111",
      store_id: "store-other",
      author_profile_id: "staff-other",
    };

    await expect(
      updateGroupTourContent({
        data: {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Invasão",
        },
      }),
    ).rejects.toThrow(/permissão|outra loja/i);

    mockState.experienceSelectRow = {
      id: "11111111-1111-4111-8111-111111111111",
      store_id: "store-a",
      author_profile_id: "staff-1",
    };

    // Sem campos opcionais além de `id`
    const minRes = await updateGroupTourContent({
      data: { id: "11111111-1111-4111-8111-111111111111" },
    });
    expect(minRes.success).toBe(true);

    // Com todos os campos opcionais preenchidos
    const fullRes = await updateGroupTourContent({
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Gramado Completo",
        subtitle: "Com passeios e hotel",
        destination: "Gramado",
        departureCity: "Chapecó",
        priceCents: 215000,
        hotels: [{ id: "h1", hotel_name: "Hotel Laghetto" }],
        transfers: [{ id: "t1", name: "Ônibus Leito DD", kind: "bus" }],
        tours: [{ id: "tr1", title: "City Tour Canela" }],
        webPageConfig: { headline: "Natal em Gramado", blocks: [], hero_media: [], is_published: true },
      },
    });
    expect(fullRes.success).toBe(true);
    const lastUpdate = mockState.updateCalls[mockState.updateCalls.length - 1];
    expect(lastUpdate.patch.price_display).toContain("2.150");
    expect(lastUpdate.patch.hotels).toHaveLength(1);
    expect(lastUpdate.patch.web_page_config.headline).toBe("Natal em Gramado");
  });

  it("T0: migration 20270529000000 adds structured tourism_experiences columns & listPublicTourism avoids JSON summary", async () => {
    const migPath = path.join(
      process.cwd(),
      "supabase/migrations/20270529000000_tourism_unified_experiences_fields.sql",
    );
    const sql = fs.readFileSync(migPath, "utf8");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS hotels JSONB");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS transfers JSONB");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS tours JSONB");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS web_page_config JSONB");

    mockState.listPublicRows = [
      {
        id: "exp-1",
        title: "Florianópolis Fim de Ano",
        category: "group_tour",
        location: "Florianópolis",
        description: JSON.stringify({ slug: "floripa", notes: "Hospedagem pé na areia" }),
        duration: "3 dias",
        price_display: "R$ 1.200",
        status: "active",
        created_at: "2026-11-16T00:00:00Z",
      },
    ];
    const items = await listPublicTourism({ data: {} });
    expect(items[0]?.summary).toBe("Hospedagem pé na areia");
  });
});
