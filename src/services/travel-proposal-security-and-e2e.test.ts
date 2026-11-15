import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  computeProposalPinHash,
  extractLegacyPinFromNotes,
  normalizeProposalValidUntilIso,
  resolveProposalVisibilityMode,
  sanitizePublicProposalWhenLocked,
  stripLegacyPinTag,
  verifyProposalPinMatch,
} from "@/lib/tourism/proposal-security";
import {
  buildProposalsCsv,
  sanitizeProposalFilename,
} from "@/lib/tourism/proposal-export";

const STORE_A = "550e8400-e29b-41d4-a716-446655440001";
const STORE_B = "550e8400-e29b-41d4-a716-446655440002";
const PROPOSAL_ID = "660e8400-e29b-41d4-a716-446655440111";
const QUOTE_ID = "770e8400-e29b-41d4-a716-446655440222";
const USER_ID = "880e8400-e29b-41d4-a716-446655440333";

const state = vi.hoisted(() => ({
  identity: {
    id: "880e8400-e29b-41d4-a716-446655440333" as string | null,
    role: "admin",
    isPlatformAdmin: false,
    store_id: "550e8400-e29b-41d4-a716-446655440001" as string | null,
  } as any,
  cookies: {} as Record<string, string>,
  proposalRow: null as Record<string, any> | null,
  proposalRowsList: [] as Record<string, any>[],
  lastProposalUpdate: null as Record<string, any> | null,
  lastInsertedProposal: null as Record<string, any> | null,
  lastQuoteUpdate: null as { patch: any; eqFilters: Array<[string, any]> } | null,
  lastQuoteDeleteEq: [] as Array<[string, any]>,
  lastQuoteOrFilter: null as string | null,
  rpcCalls: [] as Array<{ fn: string; args: any }>,
  quoteRows: [] as Record<string, any>[],
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any = {}) => {
        const parsed =
          typeof schema === "function"
            ? schema(args?.data)
            : typeof schema?.parse === "function"
              ? schema.parse(args?.data)
              : args?.data;
        return fn({ data: parsed });
      },
    }),
    handler: (fn: any) => async (args: any = {}) => fn(args || {}),
  }),
}));

vi.mock("@tanstack/start-server-core", () => ({
  getCookie: (name: string) => state.cookies[name],
  setCookie: (name: string, value: string) => {
    state.cookies[name] = value;
  },
  getRequestHeader: () => undefined,
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: async () => state.identity,
  requireStaff: async () => {
    if (!state.identity?.id || !state.identity?.store_id) {
      throw new Error("Staff authentication required");
    }
    return state.identity;
  },
}));

vi.mock("@/services/travel-quote-session.service", () => ({
  createCanonicalQuoteSession: vi.fn().mockResolvedValue("990e8400-e29b-41d4-a716-446655440999"),
}));

vi.mock("@/lib/supabase", () => {
  const buildChain = (table: string) => {
    const eqFilters: Array<[string, any]> = [];
    let pendingAction: "select" | "insert" | "update" | "delete" = "select";
    let pendingPayload: any = null;

    const api: any = {
      select: () => {
        if (pendingAction === "select") pendingAction = "select";
        return api;
      },
      insert: (payload: any) => {
        pendingAction = "insert";
        pendingPayload = payload;
        if (table === "travel_proposals") state.lastInsertedProposal = payload;
        return api;
      },
      update: (payload: any) => {
        pendingAction = "update";
        pendingPayload = payload;
        if (table === "travel_proposals") state.lastProposalUpdate = payload;
        if (table === "travel_quotes") {
          state.lastQuoteUpdate = { patch: payload, eqFilters };
        }
        return api;
      },
      delete: () => {
        pendingAction = "delete";
        if (table === "travel_quotes") state.lastQuoteDeleteEq = eqFilters;
        return api;
      },
      eq: (col: string, val: any) => {
        eqFilters.push([col, val]);
        return api;
      },
      neq: () => api,
      in: () => api,
      not: () => api,
      or: (expr: string) => {
        if (table === "travel_quotes") state.lastQuoteOrFilter = expr;
        return api;
      },
      order: () => api,
      limit: () => api,
      single: async () => {
        if (table === "travel_proposals" && pendingAction === "insert") {
          return { data: { id: "new-prop-id-123" }, error: null };
        }
        return { data: { id: state.proposalRow?.id || "row-1", protocol_number: "COT-2026-99999" }, error: null };
      },
      maybeSingle: async () => {
        if (table === "travel_quotes" && pendingAction === "select") {
          return { data: state.quoteRows[0] || null, error: null };
        }
        if (table === "travel_quote_sessions") {
          return { data: { id: "990e8400-e29b-41d4-a716-446655440999" }, error: null };
        }
        if (table === "travel_proposals") {
          if (pendingAction === "update") {
            return { data: state.proposalRow ? { id: state.proposalRow.id } : null, error: null };
          }
          if (!state.proposalRow) return { data: null, error: null };
          const tokenFilter = eqFilters.find(([c]) => c === "public_token")?.[1];
          const storeFilter = eqFilters.find(([c]) => c === "store_id")?.[1];
          if (tokenFilter && state.proposalRow.public_token !== tokenFilter) {
            return { data: null, error: null };
          }
          if (storeFilter && state.proposalRow.store_id !== storeFilter) {
            return { data: null, error: null };
          }
          return { data: state.proposalRow, error: null };
        }
        if (table === "travel_proposal_acceptances") {
          return { data: null, error: null };
        }
        return { data: null, error: null };
      },
      then: (resolve: (val: any) => any) => {
        if (table === "travel_quotes") {
          if (pendingAction === "update") {
            return Promise.resolve({ data: [{ id: QUOTE_ID }], error: null }).then(resolve);
          }
          if (pendingAction === "delete") {
            return Promise.resolve({ data: [{ id: QUOTE_ID }], error: null }).then(resolve);
          }
          return Promise.resolve({ data: state.quoteRows, error: null }).then(resolve);
        }
        if (table === "travel_quote_requests") {
          return Promise.resolve({ data: [], error: null }).then(resolve);
        }
        if (table === "travel_proposals") {
          return Promise.resolve({ data: state.proposalRowsList, error: null }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    };
    return api;
  };

  const client = {
    from: (table: string) => buildChain(table),
    rpc: async (fn: string, args: any) => {
      state.rpcCalls.push({ fn, args });
      return { data: 1, error: null };
    },
  };

  return {
    getServerClient: () => client,
    getAnonServerClient: () => client,
  };
});

import {
  approveTravelProposal,
  bundleTravelProposalsIntoSingleLink,
  createTravelProposal,
  duplicateTravelProposal,
  getPublicTravelProposalByToken,
  updateTravelProposal,
  verifyTravelProposalAccessPin,
} from "./travel-proposal.functions";
import {
  createAgencyTravelQuote,
  deleteAgencyTravelQuote,
  listAgencyTravelQuotes,
  requestTravelQuote,
  updateAgencyTravelQuote,
} from "./tourism.functions";

function makeSampleRow(overrides: Record<string, any> = {}) {
  return {
    id: PROPOSAL_ID,
    store_id: STORE_A,
    quote_id: QUOTE_ID,
    lead_id: null,
    customer_id: null,
    public_token: "prop_tok_abc123",
    snapshot_hash: "snap_hash_valid_001",
    title: "Roteiro Cancun All Inclusive",
    subtitle: "7 noites frente mar",
    destination_city: "Cancun, MX",
    client_name: "Marciana Silva",
    client_whatsapp: "49999998888",
    client_email: "marciana@example.com",
    adults_count: 2,
    children_count: 1,
    canvas_format: "a4-portrait",
    template_theme: "editorial-flat",
    flights: [{ airline: "LATAM", origin_iata: "GRU", destination_iata: "CUN" }],
    hotels: [{ hotel_name: "Grand Oasis Cancun", nights_count: 7 }],
    itinerary: [{ day_number: 1, title: "Chegada", description: "Transfer in" }],
    transfers: [],
    tours: [],
    rooms: [],
    includes: ["Aéreo ida e volta"],
    excludes: [],
    pricing: { total_price_cents: 1450000, currency: "BRL" },
    options: [],
    special_notes: "Observação VIP",
    visibility_mode: "public",
    is_hidden: false,
    access_pin_hash: null,
    views_count: 3,
    status: "sent",
    valid_until: new Date(Date.now() + 7 * 86400_000).toISOString(),
    stores: { name: "Excelência Tour", logo_url: null, settings: {} },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Proposal Security & Redaction Helpers", () => {
  it("strips legacy [SENHA:...] tags while preserving commercial notes", () => {
    expect(stripLegacyPinTag("[SENHA:4820] Inclui mala despachada.")).toBe(
      "Inclui mala despachada.",
    );
    expect(extractLegacyPinFromNotes("[SENHA:4820] Inclui mala")).toBe("4820");
    expect(stripLegacyPinTag("[SENHA:9999]")).toBeNull();
  });

  it("computes salted SHA-256 PIN hashes isolated by proposalId and verifies legacy fallback", async () => {
    const hashA = await computeProposalPinHash(PROPOSAL_ID, "4820");
    const hashOtherId = await computeProposalPinHash("other-id", "4820");
    expect(hashA).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(hashA).not.toBe(hashOtherId);

    expect(
      await verifyProposalPinMatch({
        proposalId: PROPOSAL_ID,
        candidatePin: "4820",
        accessPinHash: hashA,
      }),
    ).toBe(true);

    expect(
      await verifyProposalPinMatch({
        proposalId: PROPOSAL_ID,
        candidatePin: "0000",
        accessPinHash: hashA,
      }),
    ).toBe(false);

    expect(
      await verifyProposalPinMatch({
        proposalId: PROPOSAL_ID,
        candidatePin: "VIP26",
        accessPinHash: null,
        legacySpecialNotes: "[SENHA:VIP26] Notas",
      }),
    ).toBe(true);
  });

  it("resolves visibility modes cleanly and redacts all commercial fields when locked", () => {
    expect(
      resolveProposalVisibilityMode({
        visibility_mode: "link_only",
        access_pin_hash: "sha256:abc",
      }),
    ).toBe("password");

    const locked = sanitizePublicProposalWhenLocked(
      makeSampleRow() as any,
      "pin_required",
    );
    expect(locked.access_locked).toBe(true);
    expect(locked.lock_reason).toBe("pin_required");
    expect(locked.flights).toEqual([]);
    expect(locked.hotels).toEqual([]);
    expect(locked.pricing.total_price_cents).toBe(0);
    expect(locked.snapshot_hash).toBeNull();
    expect(locked.client_whatsapp).toBe("");
    expect(locked.access_pin).toBeNull();
  });
});

describe("Proposal Export Helpers", () => {
  it("sanitizes filenames and builds BOM UTF-8 CSV spreadsheets safely", () => {
    expect(sanitizeProposalFilename("Proposta: Cancun & Maragogi!", "pdf")).toBe(
      "Proposta_Cancun_Maragogi.pdf",
    );
    const csv = buildProposalsCsv([makeSampleRow() as any], "https://waesy.com.br");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Roteiro Cancun All Inclusive");
    expect(csv).toContain("https://waesy.com.br/proposta/prop_tok_abc123");
  });
});

describe("Travel Proposal BFF Security & E2E Workflows", () => {
  beforeEach(() => {
    state.identity = null; // Simulate unauthenticated public visitor by default
    state.cookies = {};
    state.lastProposalUpdate = null;
    state.lastInsertedProposal = null;
    state.lastQuoteUpdate = null;
    state.lastQuoteDeleteEq = [];
    state.lastQuoteOrFilter = null;
    state.rpcCalls = [];
    state.proposalRow = makeSampleRow();
    state.proposalRowsList = [];
    state.quoteRows = [];
  });

  it("redacts PIN-protected proposal for external visitors and unlocks via verifyTravelProposalAccessPin", async () => {
    const pinHash = await computeProposalPinHash(PROPOSAL_ID, "4321");
    state.proposalRow = makeSampleRow({
      visibility_mode: "password",
      access_pin_hash: pinHash,
      has_access_pin: true,
    });

    // 1. Visitor before unlock gets redacted shell only
    const lockedRes = await getPublicTravelProposalByToken({
      data: { token: "prop_tok_abc123" },
    });
    expect(lockedRes).not.toBeNull();
    expect(lockedRes?.access_locked).toBe(true);
    expect(lockedRes?.lock_reason).toBe("pin_required");
    expect(lockedRes?.pricing.total_price_cents).toBe(0);
    expect(lockedRes?.flights).toEqual([]);
    expect((lockedRes as any)?.access_pin).toBeNull();

    // 2. Wrong PIN must fail without setting unlock cookie
    const badAttempt = await verifyTravelProposalAccessPin({
      data: { token: "prop_tok_abc123", pin: "9999" },
    });
    expect(badAttempt.unlocked).toBe(false);
    expect(badAttempt.proposal).toBeNull();

    // 3. Direct acceptance bypass while locked must fail
    await expect(
      approveTravelProposal({
        data: {
          token: "prop_tok_abc123",
          snapshotHash: "snap_hash_valid_001",
          passengers: [{ name: "Marciana Silva", document: "12345678900" }],
          paymentPreference: "pix",
        },
      }),
    ).rejects.toThrow(/senha/i);

    // 4. Correct PIN unlocks, sets HMAC cookie, records view, and reveals flights/prices without PIN leak
    const goodAttempt = await verifyTravelProposalAccessPin({
      data: { token: "prop_tok_abc123", pin: "4321" },
    });
    expect(goodAttempt.unlocked).toBe(true);
    expect(goodAttempt.proposal?.access_locked).toBe(false);
    expect(goodAttempt.proposal?.pricing.total_price_cents).toBe(1450000);
    expect(goodAttempt.proposal?.access_pin).toBeNull();
    expect(state.rpcCalls.some((c) => c.fn === "increment_travel_proposal_view")).toBe(true);

    // 5. Subsequent reload sees cookie and returns unlocked public DTO
    const reloaded = await getPublicTravelProposalByToken({
      data: { token: "prop_tok_abc123" },
    });
    expect(reloaded?.access_locked).toBe(false);
    expect(reloaded?.flights.length).toBe(1);
  });

  it("blocks external read & acceptance when proposal is private or hidden", async () => {
    state.proposalRow = makeSampleRow({ visibility_mode: "private" });
    const privateRes = await getPublicTravelProposalByToken({
      data: { token: "prop_tok_abc123" },
    });
    expect(privateRes?.access_locked).toBe(true);
    expect(privateRes?.lock_reason).toBe("private");
    expect(privateRes?.flights).toEqual([]);

    await expect(
      approveTravelProposal({
        data: {
          token: "prop_tok_abc123",
          snapshotHash: "snap_hash_valid_001",
          passengers: [{ name: "Marciana Silva", document: "12345678900" }],
          paymentPreference: "pix",
        },
      }),
    ).rejects.toThrow(/privada|arquivada/i);

    state.proposalRow = makeSampleRow({ is_hidden: true, visibility_mode: "public" });
    const hiddenRes = await getPublicTravelProposalByToken({
      data: { token: "prop_tok_abc123" },
    });
    expect(hiddenRes?.access_locked).toBe(true);
    expect(hiddenRes?.lock_reason).toBe("hidden");
  });

  it("hashes new access_pin, ensures valid_until when publishing, and syncs quote status", async () => {
    state.identity = { id: USER_ID, role: "admin", store_id: STORE_A };
    state.proposalRow = makeSampleRow({
      status: "draft",
      valid_until: null,
      quote_id: QUOTE_ID,
    });

    await updateTravelProposal({
      data: {
        id: PROPOSAL_ID,
        patch: {
          title: "Cancun Editado Inline",
          access_pin: "7788",
          status: "sent",
        },
      },
    });

    expect(state.lastProposalUpdate?.title).toBe("Cancun Editado Inline");
    expect(state.lastProposalUpdate?.visibility_mode).toBe("password");
    expect(state.lastProposalUpdate?.access_pin_hash).toBe(
      await computeProposalPinHash(PROPOSAL_ID, "7788"),
    );
    expect(Date.parse(state.lastProposalUpdate?.valid_until)).toBeGreaterThan(Date.now());
    expect(state.lastQuoteUpdate?.patch.status).toBe("quoted");
  });

  it("duplicates proposals safely as draft without auto-publishing", async () => {
    state.identity = { id: USER_ID, role: "admin", store_id: STORE_A };
    state.proposalRow = makeSampleRow({ status: "approved", visibility_mode: "public" });

    await duplicateTravelProposal({ data: { id: PROPOSAL_ID } });
    expect(state.lastInsertedProposal?.status).toBe("draft");
    expect(state.lastInsertedProposal?.title).toContain("(Cópia)");
  });

  it("enforces store tenant isolation on Cotações and attaches linked proposals count", async () => {
    state.identity = { id: USER_ID, role: "admin", store_id: STORE_A };
    state.quoteRows = [
      {
        id: QUOTE_ID,
        store_id: STORE_A,
        origin_city: "Chapecó",
        destination_city: "Cancun",
        rooms_count: 1,
        adults_count: 2,
        children_count: 0,
        children_ages: [],
        trip_type: "air_package",
        contact_name: "Marciana",
        contact_whatsapp: "49999998888",
        status: "quoted",
        created_at: new Date().toISOString(),
      },
    ];
    state.proposalRowsList = [
      {
        id: PROPOSAL_ID,
        quote_id: QUOTE_ID,
        title: "Lâmina Cancun Vip",
        status: "sent",
        public_token: "prop_tok_abc123",
        pricing: { total_price_cents: 1450000 },
        visibility_mode: "public",
      },
    ];

    const quotes = await listAgencyTravelQuotes({ data: { status: "all" } });
    expect(quotes).toHaveLength(1);
    expect(quotes[0].linked_proposals_count).toBe(1);
    expect(quotes[0].linked_proposals?.[0]?.title).toBe("Lâmina Cancun Vip");

    await expect(
      listAgencyTravelQuotes({ data: { storeId: STORE_B, status: "all" } }),
    ).rejects.toThrow(/Acesso negado/i);

    await updateAgencyTravelQuote({
      data: { id: QUOTE_ID, status: "won" },
    });
    expect(state.lastQuoteUpdate?.patch.store_id).toBe(STORE_A);

    await deleteAgencyTravelQuote({ data: { id: QUOTE_ID } });
    expect(state.lastQuoteDeleteEq).toContainEqual(["store_id", STORE_A]);

    state.identity = null;
    await expect(
      deleteAgencyTravelQuote({ data: { id: QUOTE_ID } }),
    ).rejects.toThrow(/Acesso negado/i);
  });

  it("guarantees valid future valid_until when bundling proposals into a comparison link", async () => {
    state.identity = { id: USER_ID, role: "admin", store_id: STORE_A };
    const expiredIso = new Date(Date.now() - 86400_000).toISOString();
    state.proposalRow = makeSampleRow({ valid_until: expiredIso, visibility_mode: "private" });

    // Bundle with 2 identical mocked rows checks valid_until normalization + visibility upgrade
    await bundleTravelProposalsIntoSingleLink({
      data: { proposalIds: [PROPOSAL_ID, PROPOSAL_ID] },
    });
    expect(state.lastProposalUpdate?.status).toBe("sent");
    expect(state.lastProposalUpdate?.visibility_mode).toBe("public");
    expect(Date.parse(state.lastProposalUpdate?.valid_until)).toBeGreaterThan(Date.now());
  });
});

describe("Proposals Workspace & Public Route UI Contract Integrity", () => {
  it("verifies Sheet/Grid modes, inline edit, quick preview, privacy modal, and PIN gate wiring", () => {
    const indexSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/workspace.turismo.propostas.index.tsx"),
      "utf8",
    );
    const managerSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/tourism/proposals/TourismProposalsManager.tsx"),
      "utf8",
    );
    expect(indexSrc).toContain("TourismProposalsManager");
    expect(managerSrc).toContain("ProposalsSheetTable");
    expect(managerSrc).toContain("ProposalGridCard");
    expect(managerSrc).toContain("ProposalQuickPreviewSheet");
    expect(managerSrc).toContain("ProposalPasswordDialog");
    expect(managerSrc).toContain("list-offscreen-export-canvas");
    expect(managerSrc).toContain("useWindowSizeClass");

    const publicSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/_store.proposta.$token.tsx"),
      "utf8",
    );
    expect(publicSrc).toContain("verifyTravelProposalAccessPin");
    expect(publicSrc).toContain("access_locked");
    expect(publicSrc).toContain("pin_required");
  });

  it("normalizes PT-BR/ISO/relative valid_until inputs without PG 22007 crashes and blocks invalid strings", () => {
    expect(normalizeProposalValidUntilIso("15/10/2026")).toBe("2026-10-15T23:59:59.000Z");
    expect(normalizeProposalValidUntilIso("2026-11-21")).toBe("2026-11-21T23:59:59.000Z");
    expect(normalizeProposalValidUntilIso("")).toBeNull();
    expect(normalizeProposalValidUntilIso("31/02/2026")).toBeNull();
    expect(normalizeProposalValidUntilIso("texto inválido")).toBeNull();

    const rel24h = normalizeProposalValidUntilIso("Até 24h");
    expect(rel24h).not.toBeNull();
    expect(Date.parse(rel24h!)).toBeGreaterThan(Date.now() + 20 * 3600_000);
  });

  it("persists normalized valid_until and custom_fields on updateTravelProposal even without pricing, and backfills lead_id on createTravelProposal", async () => {
    state.identity = { id: USER_ID, role: "admin", store_id: STORE_A };
    state.proposalRow = makeSampleRow({ quote_id: QUOTE_ID });
    state.quoteRows = [
      {
        id: QUOTE_ID,
        store_id: STORE_A,
        lead_id: "550e8400-e29b-41d4-a716-446655440900",
        customer_id: "550e8400-e29b-41d4-a716-446655440901",
      },
    ];

    await updateTravelProposal({
      data: {
        id: PROPOSAL_ID,
        patch: {
          valid_until: "25/12/2026",
          custom_fields: { embarque_vip: "Aeroporto Chapecó" },
        },
      },
    });
    expect(state.lastProposalUpdate?.valid_until).toBe("2026-12-25T23:59:59.000Z");
    expect(state.lastProposalUpdate?.custom_fields).toEqual({ embarque_vip: "Aeroporto Chapecó" });

    await createTravelProposal({
      data: {
        title: "Pacote Teste Backfill",
        clientName: "Marciana",
        clientWhatsapp: "49999998888",
        destinationCity: "Porto de Galinhas",
        quoteId: QUOTE_ID,
        customFields: { canal_origem: "WhatsApp" },
        sourceListingId: "pkg-porto-1",
        sourceListingOrigin: "classified",
        status: "sent",
      },
    });
    expect(state.lastInsertedProposal?.lead_id).toBe("550e8400-e29b-41d4-a716-446655440900");
    expect(state.lastInsertedProposal?.customer_id).toBe("550e8400-e29b-41d4-a716-446655440901");
    expect(state.lastInsertedProposal?.custom_fields).toEqual({ canal_origem: "WhatsApp" });
    expect(state.lastInsertedProposal?.source_listing_id).toBe("pkg-porto-1");
    expect(state.lastInsertedProposal?.source_listing_origin).toBe("classified");
  });

  it("prevents store_id.is.null cross-tenant leak and accepts all 8 trip_type options", async () => {
    state.identity = { id: USER_ID, role: "admin", store_id: STORE_A };
    await listAgencyTravelQuotes({ data: { status: "all" } });
    expect(state.lastQuoteOrFilter || "").not.toContain("store_id.is.null");

    const allTripTypes = [
      "air_package",
      "air_only",
      "hotel_only",
      "car_rental",
      "corporate_b2b",
      "cruise",
      "bus",
      "visa_assistance",
    ] as const;

    const hardeningSql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/20270416000000_travel_quotes_proposals_e2e_hardening.sql"),
      "utf8",
    );

    for (const tt of allTripTypes) {
      expect(hardeningSql).toContain(`'${tt}'`);
      await expect(
        createAgencyTravelQuote({
          data: {
            contact_name: "Empresa Teste",
            contact_whatsapp: "49999998888",
            destination_city: "São Paulo",
            trip_type: tt,
          },
        }),
      ).resolves.toMatchObject({ id: expect.any(String), protocol: expect.any(String) });

      await expect(
        requestTravelQuote({
          data: {
            origin_city: "Chapecó",
            destination_city: "Curitiba",
            contact_name: "Visitante",
            contact_whatsapp: "49999998888",
            trip_type: tt,
          },
        }),
      ).resolves.toMatchObject({ success: true });
    }
  });

  it("enforces SSOT template palettes, date input, rodoviario slice preservation, proportional PDF export, and safe 360 links", () => {
    const templateIndexSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/tourism/proposals/templates/index.ts"),
      "utf8",
    );
    expect(templateIndexSrc).toContain("TEMPLATE_DEFAULT_PALETTES");
    expect(templateIndexSrc).not.toContain("#F4F9FE");

    const sidebarSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/tourism/studio/studio-sidebar-editor.tsx"),
      "utf8",
    );
    expect(sidebarSrc).toContain("updatePrimaryRodoviarioTransfer");
    expect(sidebarSrc).toContain("existingList.slice(1)");
    expect(sidebarSrc).toContain('type="date"');

    const pdfSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/pdf-export.ts"),
      "utf8",
    );
    expect(pdfSrc).toContain("matchesA4Aspect");
    expect(pdfSrc).toContain("[rawW, rawH]");

    const sidebar360Src = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/chat/customer-360-sidebar.tsx"),
      "utf8",
    );
    expect(sidebar360Src).not.toContain("/proposta/${q.id}");
    expect(sidebar360Src).toContain("/proposta/${safeToken}");
  });
});
