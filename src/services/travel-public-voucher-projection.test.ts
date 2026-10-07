import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  getServerClient: vi.fn(),
  getAnonServerClient: vi.fn(),
  getServerIdentity: vi.fn(),
  requireStaff: vi.fn(),
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

import { getPublicVoucherByToken, getTravelerFormContext } from "./travel-lifecycle.functions";

const TOKEN = "vch_" + "a".repeat(64);
const VOUCHER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TRIP_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function voucherPayload(observations: string | null = null) {
  return {
    voucher: {
      id: VOUCHER_ID,
      trip_id: TRIP_ID,
      public_token: TOKEN,
      voucher_code: "VOUCH-123456",
      voucher_type: "general",
      template: "a4-boarding",
      destination: "Lisboa",
      cover_image_url: null,
      emergency_contacts: [],
      passengers: ["Maria Silva", { name: "João Silva", document: "123.***.***-00", secret: "must-not-exist" }],
      flights: [],
      hotels: [],
      transfers: [],
      tours: [],
      insurance: {},
      observations,
      created_at: "2026-10-07T12:00:00.000Z",
    },
    trip: {
      trip_number: "VIAGEM-2026-ABC123",
      title: "Chapecó–Lisboa",
      travel_start_date: "2026-11-01",
      travel_end_date: "2026-11-15",
    },
    store: { name: "Agência Exemplo", logo_url: null, whatsapp_phone: null },
  };
}

function createDb(payload: unknown) {
  const fromCalls: string[] = [];
  const from = vi.fn((table: string) => {
    fromCalls.push(table);
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      or: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve, reject),
    };
    return chain;
  });
  const rpc = vi.fn(async () => ({ data: payload, error: null }));
  return { client: { from, rpc }, from, fromCalls, rpc };
}

beforeEach(() => vi.clearAllMocks());

describe("projeção pública do voucher", () => {
  it("mantém o acesso público limitado à RPC token-bound", () => {
    const migration = readFileSync(
      new URL("../../supabase/migrations/20270117000000_p0_secure_public_voucher_access.sql", import.meta.url),
      "utf8",
    );
    expect(migration).toMatch(/SECURITY DEFINER/i);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.get_public_tourism_voucher_by_token\(TEXT\)/i);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_public_tourism_voucher_by_token\(TEXT\) TO anon, authenticated/i);
    expect(migration).toMatch(/'observations', NULL/i);
  });

  it("normaliza passageiro legado string, elimina campos nested extras e exige observations nulo", async () => {
    const db = createDb(voucherPayload(null));
    mocks.getAnonServerClient.mockReturnValue(db.client);

    const result = await (getPublicVoucherByToken as any)({ data: { token: TOKEN } });

    expect(db.rpc).toHaveBeenCalledWith("get_public_tourism_voucher_by_token", { p_public_token: TOKEN });
    expect(result.voucher.passengers).toEqual([
      { name: "Maria Silva" },
      { name: "João Silva", document: "123.***.***-00" },
    ]);
    expect(result.voucher.observations).toBeNull();
    expect(JSON.stringify(result)).not.toContain("must-not-exist");
    expect(mocks.setResponseHeader).toHaveBeenCalledWith("Cache-Control", expect.stringContaining("no-store"));
  });

  it("falha fechado diante de observações livres devolvidas por uma migration antiga", async () => {
    const db = createDb(voucherPayload("nota interna confidencial"));
    mocks.getAnonServerClient.mockReturnValue(db.client);

    const result = await (getPublicVoucherByToken as any)({ data: { token: TOKEN } });

    expect(result).toBeNull();
  });

  it("resolve contexto de ficha via RPC segura e não faz SELECT anon em tourism_vouchers", async () => {
    const db = createDb(voucherPayload(null));
    mocks.getAnonServerClient.mockReturnValue(db.client);

    const result = await (getTravelerFormContext as any)({ data: { token: TOKEN } });

    expect(result).toMatchObject({
      success: true,
      tokenType: "voucher",
      tripTitle: "Chapecó–Lisboa",
      destination: "Lisboa",
      departureDate: "2026-11-01",
      returnDate: "2026-11-15",
      agencyName: "Agência Exemplo",
    });
    expect(db.fromCalls).not.toContain("tourism_vouchers");
    expect(db.rpc).toHaveBeenCalledWith("get_public_tourism_voucher_by_token", { p_public_token: TOKEN });
  });
});
