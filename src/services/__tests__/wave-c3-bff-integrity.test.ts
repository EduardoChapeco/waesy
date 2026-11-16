import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const STORE_A = "550e8400-e29b-41d4-a716-446655440010";
const STORE_B = "550e8400-e29b-41d4-a716-446655440020";
const STUDY_ID = "550e8400-e29b-41d4-a716-446655440030";
const TRIP_ID = "550e8400-e29b-41d4-a716-446655440040";
const PRES_ID = "550e8400-e29b-41d4-a716-446655440050";
const USER_ID = "550e8400-e29b-41d4-a716-446655440099";

const mockState = vi.hoisted(() => ({
  identity: {
    id: "550e8400-e29b-41d4-a716-446655440099" as string | null,
    role: "owner",
    isPlatformAdmin: false,
    store_id: "550e8400-e29b-41d4-a716-446655440010" as string | null,
    tenant_id: "550e8400-e29b-41d4-a716-446655440010" as string | null,
    memberships: [{ store_id: "550e8400-e29b-41d4-a716-446655440010", role: "owner" }],
  } as any,
  responses: {} as Record<string, any>,
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

vi.mock("@/lib/server-access", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server-access")>("@/lib/server-access");
  return {
    ...actual,
    getServerIdentity: async () => mockState.identity,
  };
});

vi.mock("@/lib/logger", () => ({
  logSystemError: vi.fn(),
}));

function makeTableChain(table: string) {
  let op: "select" | "insert" | "update" | "upsert" = "select";
  const chain: any = {
    select: () => chain,
    insert: () => {
      op = "insert";
      return chain;
    },
    update: () => {
      op = "update";
      return chain;
    },
    upsert: () => {
      op = "upsert";
      return chain;
    },
    eq: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => {
      const cfg = mockState.responses[`${table}:${op}`] ?? mockState.responses[table];
      return cfg ?? { data: null, error: null };
    },
    single: async () => {
      const cfg = mockState.responses[`${table}:${op}`] ?? mockState.responses[table];
      return cfg ?? { data: null, error: null };
    },
    then: (resolve: any) => {
      const cfg = mockState.responses[`${table}:${op}`] ?? mockState.responses[table];
      return resolve(cfg ?? { data: op === "insert" ? [] : null, error: null });
    },
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => makeTableChain(table),
  }),
}));

describe("Wave C.3 — Integridade BFF, Auth Fail-Closed e Anti-Falso-Positivo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.identity = {
      id: USER_ID,
      role: "owner",
      isPlatformAdmin: false,
      store_id: STORE_A,
      tenant_id: STORE_A,
      memberships: [{ store_id: STORE_A, role: "owner" }],
    };
    mockState.responses = {};
  });

  it("company-delivery: bloqueia chamador anônimo e propaga erro de banco em vez de fallback fake success", async () => {
    const { saveCompanyDeliverySettings, createDeliveryDispatch } = await import(
      "../company-delivery.functions"
    );

    mockState.identity = null;
    await expect(
      saveCompanyDeliverySettings({
        data: { storeId: STORE_A, fixedDeliveryFeeCents: 1000 },
      }),
    ).rejects.toThrow(/Autenticação obrigatória/i);

    await expect(
      createDeliveryDispatch({
        data: {
          storeId: STORE_A,
          customerName: "Ana Paula",
          customerPhone: "49999887766",
          deliveryAddress: "Rua A, 123 - Centro",
        },
      }),
    ).rejects.toThrow(/Autenticação obrigatória/i);

    mockState.identity = {
      id: USER_ID,
      role: "owner",
      isPlatformAdmin: false,
      store_id: STORE_A,
      tenant_id: STORE_A,
      memberships: [{ store_id: STORE_A, role: "owner" }],
    };

    await expect(
      createDeliveryDispatch({
        data: {
          storeId: STORE_B,
          customerName: "Ana Paula",
          customerPhone: "49999887766",
          deliveryAddress: "Rua A, 123 - Centro",
        },
      }),
    ).rejects.toThrow(/Unauthorized|Acesso/i);

    mockState.responses["classified_delivery_dispatches:insert"] = {
      data: null,
      error: { message: "db write failed" },
    };
    await expect(
      createDeliveryDispatch({
        data: {
          storeId: STORE_A,
          customerName: "Ana Paula",
          customerPhone: "49999887766",
          deliveryAddress: "Rua A, 123 - Centro",
        },
      }),
    ).rejects.toThrow(/db write failed/i);

    mockState.responses["classified_delivery_dispatches:insert"] = {
      data: { id: "disp-1", token: "disp_ok" },
      error: null,
    };
    const ok = await createDeliveryDispatch({
      data: {
        storeId: STORE_A,
        customerName: "Ana Paula",
        customerPhone: "49999887766",
        deliveryAddress: "Rua A, 123 - Centro",
      },
    });
    expect(ok.success).toBe(true);
    expect((ok as any).fallback).toBeUndefined();
  });

  it("geomarketing-cortex: saveViabilityCanvasAndSwot exige auth/tenant e propaga falha de UPDATE", async () => {
    const { saveViabilityCanvasAndSwot } = await import("../geomarketing-cortex.functions");

    const payload = {
      studyId: STUDY_ID,
      storeId: STORE_A,
      swotAnalysis: { strengths: ["Centro"], weaknesses: [], opportunities: [], threats: [] },
      bmcCanvas: {
        key_partners: [],
        key_activities: [],
        key_resources: [],
        value_propositions: [],
        customer_relationships: [],
        channels: [],
        customer_segments: [],
        cost_structure: [],
        revenue_streams: [],
      },
      executiveSummary: "Resumo",
    };

    mockState.identity = null;
    await expect(saveViabilityCanvasAndSwot({ data: payload })).rejects.toThrow(/Autenticação/i);

    mockState.identity = {
      id: USER_ID,
      role: "owner",
      isPlatformAdmin: false,
      store_id: STORE_A,
      tenant_id: STORE_A,
      memberships: [{ store_id: STORE_A, role: "owner" }],
    };
    mockState.responses["market_viability_studies:select"] = {
      data: { id: STUDY_ID, store_id: STORE_A, user_id: USER_ID },
      error: null,
    };
    mockState.responses["market_viability_studies:update"] = {
      data: null,
      error: { message: "permission denied" },
    };

    await expect(saveViabilityCanvasAndSwot({ data: payload })).rejects.toThrow(/permission denied/i);

    mockState.responses["market_viability_studies:update"] = { data: { id: STUDY_ID }, error: null };
    mockState.responses["store_business_model_canvas:upsert"] = { data: { store_id: STORE_A }, error: null };
    const saved = await saveViabilityCanvasAndSwot({ data: payload });
    expect(saved.success).toBe(true);
  });

  it("travel-pre-boarding-and-commissions: recusa anônimo, falha em erro de DB e persiste quando autorizado", async () => {
    const {
      importUniversalCrmSpreadsheetBatchFn,
      schedulePreBoardingMeetingFn,
      respondToPreBoardingMeetingInviteFn,
    } = await import("../travel-pre-boarding-and-commissions.functions");

    const csv = "Nome Completo\tTelefone\nMaria Clara\t49999991111";

    mockState.identity = null;
    await expect(
      importUniversalCrmSpreadsheetBatchFn({
        data: { rawText: csv, sourceType: "spreadsheet_csv_xlsx" },
      }),
    ).rejects.toThrow(/Autenticação obrigatória/i);

    mockState.identity = {
      id: USER_ID,
      role: "owner",
      isPlatformAdmin: false,
      store_id: STORE_A,
      tenant_id: STORE_A,
      memberships: [{ store_id: STORE_A, role: "owner" }],
    };
    mockState.responses["customers_crm:insert"] = {
      data: null,
      error: { message: "customers_crm write blocked" },
    };
    await expect(
      importUniversalCrmSpreadsheetBatchFn({
        data: { rawText: csv, sourceType: "spreadsheet_csv_xlsx" },
      }),
    ).rejects.toThrow(/customers_crm write blocked/i);

    mockState.responses["customers_crm:insert"] = {
      data: [{ id: "crm-1" }],
      error: null,
    };
    mockState.responses["crm_universal_spreadsheet_import_batches:insert"] = {
      data: { id: "batch-1" },
      error: null,
    };
    const imported = await importUniversalCrmSpreadsheetBatchFn({
      data: { rawText: csv, sourceType: "spreadsheet_csv_xlsx" },
    });
    expect(imported).toMatchObject({ success: true, importedCount: 1 });

    mockState.responses["travel_pre_boarding_presentations:select"] = { data: null, error: null };
    mockState.responses["travel_pre_boarding_presentations:insert"] = {
      data: null,
      error: { message: "insert failed" },
    };
    await expect(
      schedulePreBoardingMeetingFn({
        data: {
          storeId: STORE_A,
          tripId: TRIP_ID,
          clientName: "Maria Clara",
          modality: "online_video",
          proposedSlotsIso: ["2026-11-25T19:00"],
          meetingLinkOrAddress: "https://meet.google.com/abc-defg-hij",
          agentName: "Consultor",
        },
      }),
    ).rejects.toThrow(/insert failed/i);

    mockState.responses["travel_pre_boarding_presentations:insert"] = {
      data: { id: PRES_ID },
      error: null,
    };
    const scheduled = await schedulePreBoardingMeetingFn({
      data: {
        storeId: STORE_A,
        tripId: TRIP_ID,
        clientName: "Maria Clara",
        modality: "online_video",
        proposedSlotsIso: ["2026-11-25T19:00"],
        meetingLinkOrAddress: "https://meet.google.com/abc-defg-hij",
        agentName: "Consultor",
      },
    });
    expect(scheduled.success).toBe(true);
    expect(scheduled.presentationId).toBe(PRES_ID);

    mockState.responses["travel_pre_boarding_presentations:update"] = { data: null, error: null };
    await expect(
      respondToPreBoardingMeetingInviteFn({
        data: {
          tripId: TRIP_ID,
          acceptedSlotIso: "2026-11-25T19:00:00.000Z",
          modality: "online_video",
        },
      }),
    ).rejects.toThrow(/não encontrado/i);

    mockState.responses["travel_pre_boarding_presentations:update"] = {
      data: { id: PRES_ID },
      error: null,
    };
    const accepted = await respondToPreBoardingMeetingInviteFn({
      data: {
        tripId: TRIP_ID,
        acceptedSlotIso: "2026-11-25T19:00:00.000Z",
        modality: "online_video",
      },
    });
    expect(accepted.success).toBe(true);
    expect(accepted.meetingStatus).toBe("accepted_by_client");
  });

  it("directory & ads: mapeia colunas reais de stores sem estrela falsa e propaga erro ao assinar Waesy Max", async () => {
    const { getPublicDirectoryById } = await import("../directory.functions");
    const { upgradeStoreToWaesyMax } = await import("../ads.functions");

    mockState.responses["directory_listings:select"] = { data: null, error: null };
    mockState.responses["stores:select"] = {
      data: {
        id: STORE_A,
        name: "Agência Real",
        description: "Descrição",
        address: "Av Brasil",
        city: "Chapecó",
        state: "SC",
        phone: "49999990000",
        email: "contato@agencia.com",
        claim_status: "verified",
        is_active: true,
        google_rating: 4.9,
        google_review_count: 0,
        settings: { latitude: -27.1, longitude: -52.6 },
      },
      error: null,
    };

    const dir = await getPublicDirectoryById({ data: { listingId: STORE_A } });
    expect(dir?.is_verified).toBe(true);
    expect(dir?.rating).toBe(0);
    expect(dir?.reviews_count).toBe(0);
    expect(dir?.latitude).toBe(-27.1);
    expect(dir?.longitude).toBe(-52.6);
    expect(dir?.status).toBe("active");

    await expect(upgradeStoreToWaesyMax()).rejects.toThrow(/Admin Master Global/i);

    mockState.identity.role = "platform_admin";
    mockState.identity.isPlatformAdmin = true;
    mockState.responses["stores:update"] = {
      data: null,
      error: { message: "plan_tier update failed" },
    };
    await expect(upgradeStoreToWaesyMax()).rejects.toThrow(/plan_tier update failed/i);
  });

  it("UI contracts: remove datas fake hardcoded e toast.success em catch no pré-embarque e importador CRM", () => {
    const studioSrc = fs.readFileSync(
      path.resolve("src/components/tourism/boarding/PreBoardingPresentationStudio.tsx"),
      "utf8",
    );
    expect(studioSrc).not.toContain("25/11/2026 às 19:00");
    expect(studioSrc).not.toContain("26/11/2026 às 14:30");
    expect(studioSrc).not.toMatch(/catch\s*\{[\s\S]{0,120}toast\.success/);

    const crmImporterSrc = fs.readFileSync(
      path.resolve("src/components/crm/UniversalCrmSpreadsheetImporterModal.tsx"),
      "utf8",
    );
    expect(crmImporterSrc).not.toMatch(/catch\s*\{[\s\S]{0,120}toast\.success/);
  });
});
