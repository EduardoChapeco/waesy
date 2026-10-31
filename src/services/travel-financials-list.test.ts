import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ identity: vi.fn(), from: vi.fn(), eq: vi.fn(), result: { data: [] as unknown[], error: null as null | { message: string } } }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ validator: () => ({ handler: (handler: (args: unknown) => unknown) => handler }) }),
}));
vi.mock("@/lib/server-access", async () => {
  const actual = await import("@/lib/identity-core");
  return { ...actual, getServerIdentity: mocks.identity };
});
vi.mock("@/lib/supabase", () => ({ getServerClient: () => ({ from: mocks.from }) }));
import { listTravelSaleFinancialSheets } from "./travel-financials.functions";

describe("financial sheets authorized list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.result = { data: [], error: null };
    mocks.identity.mockResolvedValue({ id: "user", role: "owner", store_id: "agency-a", memberships: [{ store_id: "agency-a", role: "owner" }] });
    const query: Record<string, unknown> = {};
    for (const method of ["select", "order", "ilike", "or"]) query[method] = vi.fn(() => query);
    query.eq = mocks.eq.mockImplementation(() => query);
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(mocks.result).then(resolve);
    mocks.from.mockReturnValue(query);
  });
  it("returns honest empty results with required tenant filter", async () => {
    await expect(listTravelSaleFinancialSheets({ data: {} })).resolves.toEqual([]);
    expect(mocks.eq).toHaveBeenCalledWith("store_id", "agency-a");
  });
  it("propagates database failure instead of an empty success", async () => {
    mocks.result.error = { message: "database unavailable" };
    await expect(listTravelSaleFinancialSheets({ data: {} })).rejects.toThrow("database unavailable");
  });
  it("rejects another tenant before querying", async () => {
    await expect(listTravelSaleFinancialSheets({ data: { storeId: "agency-b" } })).rejects.toThrow();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects missing active tenant, including global administrators", async () => {
    mocks.identity.mockResolvedValue({ id: "user", role: "platform_admin", store_id: null, memberships: [] });
    await expect(listTravelSaleFinancialSheets({ data: {} })).rejects.toThrow();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("preserves authorized rows", async () => {
    mocks.result.data = [{ id: "persisted", client_name: "Cliente" }];
    await expect(listTravelSaleFinancialSheets({ data: {} })).resolves.toEqual(mocks.result.data);
  });
  it("rejects anonymous requests before querying", async () => {
    mocks.identity.mockResolvedValue({ id: null, role: "customer", store_id: null, memberships: [] });
    await expect(listTravelSaleFinancialSheets({ data: {} })).rejects.toThrow();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
