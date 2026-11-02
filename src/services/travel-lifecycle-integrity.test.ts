import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db: vi.fn(), staff: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { validator: () => builder, handler: (fn: unknown) => fn }; return builder;
} }));
vi.mock("@tanstack/start-server-core", () => ({ setResponseHeader: vi.fn() }));
vi.mock("@/lib/server-access", () => ({ requireStaff: mocks.staff, getServerIdentity: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getServerClient: mocks.db, getAnonServerClient: vi.fn() }));
vi.mock("@/services/api-orchestrator.functions", () => ({ getNextActiveKey: vi.fn(), executeUnifiedAiCall: vi.fn() }));
vi.mock("./domain-events.functions", () => ({ publishDomainEvent: vi.fn() }));
import { getTripAggregate, createManualTrip } from "./travel-lifecycle.functions";
const store = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const tripId = "33333333-3333-4333-8333-333333333333";
function db(failTable?: string, noProposal = false) {
  const calls: Array<{ table: string; filters: Array<[string, unknown]>; payload?: Record<string, unknown> }> = [];
  const from = (table: string) => {
    const call: typeof calls[number] = { table, filters: [] }; calls.push(call);
    const result = () => ({ data: table === "tourism_trips" ? { id: tripId, store_id: store, proposal_id: noProposal ? null : "proposal-id" } : [], error: table === failTable ? { message: "database unavailable" } : null });
    const chain = {
      select: () => chain, eq: (key: string, value: unknown) => { call.filters.push([key, value]); return chain; },
      order: () => chain, limit: () => chain, insert: (payload: Record<string, unknown>) => { call.payload = payload; return chain; },
      single: async () => result(), maybeSingle: async () => result(),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    }; return chain;
  }; return { client: { from }, calls };
}
beforeEach(() => { vi.clearAllMocks(); mocks.staff.mockResolvedValue({ id: "staff", store_id: store }); });
describe("Lifecycle integrity handlers", () => {
  for (const table of ["trip_passengers", "trip_confirmation_items", "tourism_vouchers", "travel_contracts"]) {
    it(`propagates aggregate error from ${table}`, async () => {
      const client = db(table); mocks.db.mockReturnValue(client.client);
      await expect(getTripAggregate({ data: { tripId } })).rejects.toThrow("database unavailable");
    });
  }
  it.each([false, true])("scopes children to trip tenant, noProposal=%s", async noProposal => {
    const client = db(undefined, noProposal); mocks.db.mockReturnValue(client.client);
    await getTripAggregate({ data: { tripId } });
    for (const call of client.calls.slice(1)) expect(call.filters).toContainEqual(["store_id", store]);
    expect(client.calls.find(c => c.table === "travel_contracts")?.filters).toContainEqual(noProposal ? ["trip_id", tripId] : ["proposal_id", "proposal-id"]);
  });
  const input = { title: "Viagem", destinationCity: "Recife", clientName: "Cliente", airlineName: "Azul", hotelName: "Hotel" };
  it("rejects manual creation outside staff tenant before writing", async () => {
    const client = db(); mocks.db.mockReturnValue(client.client);
    await expect(createManualTrip({ data: { ...input, storeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" } })).rejects.toThrow("acesso negado");
    expect(client.calls).toHaveLength(0);
  });
  it("returns success only after all required manual writes", async () => {
    const client = db(); mocks.db.mockReturnValue(client.client);
    const result = await createManualTrip({ data: { ...input, flightLocator: "REAL123" } });
    expect(result.success).toBe(true);
    expect(client.calls.map(c => c.table)).toEqual(["tourism_trips", "trip_passengers", "trip_confirmation_items", "tourism_vouchers"]);
  });
  for (const table of ["trip_passengers", "tourism_vouchers"]) {
    it(`rejects partial manual creation after ${table} failure`, async () => {
      const client = db(table); mocks.db.mockReturnValue(client.client);
      await expect(createManualTrip({ data: input })).rejects.toThrow(tripId);
    });
  }
  it("does not fabricate confirmations without locator", async () => {
    const client = db(); mocks.db.mockReturnValue(client.client);
    await createManualTrip({ data: input });
    expect(client.calls.filter(c => c.table === "trip_confirmation_items")).toHaveLength(0);
  });
  it("keeps supplied locator and rejects confirmation failure", async () => {
    const client = db("trip_confirmation_items"); mocks.db.mockReturnValue(client.client);
    await expect(createManualTrip({ data: { ...input, flightLocator: "REAL123" } })).rejects.toThrow(tripId);
    expect(client.calls.find(c => c.table === "trip_confirmation_items")?.payload?.locator_code).toBe("REAL123");
  });
});
