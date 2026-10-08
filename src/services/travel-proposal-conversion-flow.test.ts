import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { convertProposalToTrip } from "./travel-lifecycle.functions";

const STORE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STORE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const STAFF_A = "11111111-1111-4111-8111-111111111111";
const PROPOSAL_A = "22222222-2222-4222-8222-222222222222";
const TRIP_A = "33333333-3333-4333-8333-333333333333";

function createDb(options: {
  proposal?: Record<string, unknown> | null;
  rpcError?: { message: string } | null;
  rpcData?: Record<string, unknown>;
} = {}) {
  const fromCalls: Array<{ table: string; filters: Array<[string, unknown]>; writes: string[] }> = [];
  const from = vi.fn((table: string) => {
    const record = { table, filters: [] as Array<[string, unknown]>, writes: [] as string[] };
    fromCalls.push(record);
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((column: string, value: unknown) => {
        record.filters.push([column, value]);
        return chain;
      }),
      or: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({ data: options.proposal ?? null, error: null })),
      single: vi.fn(async () => ({ data: options.proposal ?? null, error: null })),
      insert: vi.fn(() => {
        record.writes.push("insert");
        return chain;
      }),
      update: vi.fn(() => {
        record.writes.push("update");
        return chain;
      }),
      upsert: vi.fn(() => {
        record.writes.push("upsert");
        return chain;
      }),
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve, reject),
    };
    return chain;
  });
  const rpc = vi.fn(async () => ({
    data: options.rpcData ?? {
      success: true,
      replayed: false,
      trip_id: TRIP_A,
      trip_number: "VIAGEM-2026-ABC123",
      contract_id: "44444444-4444-4444-8444-444444444444",
      voucher_id: null,
      voucher_token: null,
      trip_status: "pending_review",
      payment_status: "pending",
    },
    error: options.rpcError ?? null,
  }));
  return { client: { from, rpc }, from, fromCalls, rpc };
}

const validProposal = { id: PROPOSAL_A, store_id: STORE_A, public_token: "prop_public_token" };
const staff = { id: STAFF_A, role: "seller", store_id: STORE_A };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireStaff.mockResolvedValue(staff);
  mocks.getServerIdentity.mockResolvedValue(staff);
});

describe("conversão de proposta — superfície exclusivamente staff e tenant-scoped", () => {
  it("exige staff e chama somente o RPC seguro usando ator e loja derivados do servidor", async () => {
    const db = createDb({ proposal: validProposal });
    mocks.getServerClient.mockReturnValue(db.client);

    const result = await (convertProposalToTrip as any)({ data: { proposalId: PROPOSAL_A } });

    expect(mocks.requireStaff).toHaveBeenCalledTimes(1);
    expect(db.from).toHaveBeenCalledWith("travel_proposals");
    expect(db.fromCalls[0].filters).toContainEqual(["id", PROPOSAL_A]);
    expect(db.fromCalls[0].filters).toContainEqual(["store_id", STORE_A]);
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect((db.rpc.mock.calls[0] as any)[0]).toBe("convert_accepted_travel_proposal_staff");
    expect((db.rpc.mock.calls[0] as any)[1]).toMatchObject({
      p_proposal_id: PROPOSAL_A,
      p_store_id: STORE_A,
      p_actor_profile_id: STAFF_A,
    });
    expect(result).toMatchObject({ success: true, tripId: TRIP_A, tripStatus: "pending_review" });
    expect(db.fromCalls.flatMap((call) => call.writes)).toEqual([]);
  });

  it("rejeita storeId de outro tenant antes da consulta ou RPC", async () => {
    const db = createDb({ proposal: validProposal });
    mocks.getServerClient.mockReturnValue(db.client);

    await expect(
      (convertProposalToTrip as any)({ data: { proposalId: PROPOSAL_A, storeId: STORE_B } }),
    ).rejects.toThrow(/loja|tenant|acesso/i);

    expect(mocks.requireStaff).toHaveBeenCalledTimes(1);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("falha fechado quando o RPC seguro falha: sem conversor legado nem writes diretos", async () => {
    const db = createDb({ proposal: validProposal, rpcError: { message: "A proposta precisa ter aceite válido." } });
    mocks.getServerClient.mockReturnValue(db.client);

    await expect((convertProposalToTrip as any)({ data: { proposalId: PROPOSAL_A } })).rejects.toThrow(/aceite/i);

    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect((db.rpc.mock.calls[0] as any)[0]).toBe("convert_accepted_travel_proposal_staff");
    expect(db.fromCalls.flatMap((call) => call.writes)).toEqual([]);
  });

  it("não converte token público nem proposta de outra loja", async () => {
    const db = createDb({ proposal: null });
    mocks.getServerClient.mockReturnValue(db.client);

    await expect(
      (convertProposalToTrip as any)({ data: { proposalId: "public-proposal-token" } }),
    ).rejects.toThrow(/id|uuid|encontrada|proposta/i);

    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.fromCalls.flatMap((call) => call.writes)).toEqual([]);
  });
});
