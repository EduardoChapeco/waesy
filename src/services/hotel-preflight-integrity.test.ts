import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), staticHotel: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { validator: () => builder, handler: (fn: unknown) => fn };
    return builder;
  },
}));
vi.mock("@/lib/supabase", () => ({ getServerClient: () => ({ from: mocks.from }) }));
vi.mock("@/lib/data/hotels-resorts-catalog", () => ({
  normalizeHotelName: (name: string) => name.toLowerCase().trim(),
  getHotelByNameOrSlug: mocks.staticHotel,
  searchHotelsCatalog: vi.fn(),
}));

import { checkHotelPreflightMatch } from "./travel-catalog.functions";

const hotel = { id: "11111111-1111-4111-8111-111111111111", name: "Hotel Central", city: "Recife", state: "PE", country: "Brasil", verified_by_master: true };
function query(data: unknown[], error: { message: string } | null = null) {
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), ilike: vi.fn(() => chain),
    or: vi.fn(() => chain), limit: vi.fn(() => chain),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve),
  };
  return chain;
}

beforeEach(() => { vi.clearAllMocks(); mocks.staticHotel.mockReturnValue(undefined); });

describe("hotel preflight integrity", () => {
  it("returns a real canonical match and filters verification and location before limiting", async () => {
    const db = query([hotel]); mocks.from.mockReturnValue(db);
    const result = await checkHotelPreflightMatch({ data: { name: hotel.name, city: hotel.city, state: hotel.state } });
    expect(result.matchedHotel?.id).toBe(hotel.id);
    expect(db.eq).toHaveBeenCalledWith("verified_by_master", true);
    expect(db.eq).toHaveBeenCalledWith("normalized_name", "hotel central");
    expect(db.ilike).toHaveBeenCalledWith("city", "Recife");
    expect(db.ilike).toHaveBeenCalledWith("state", "PE");
    expect(db.or).not.toHaveBeenCalled();
  });

  it("does not fabricate a link when only a static catalog entry exists", async () => {
    mocks.from.mockReturnValue(query([])); mocks.staticHotel.mockReturnValue(hotel);
    const result = await checkHotelPreflightMatch({ data: { name: hotel.name } });
    expect(result.hasDuplicate).toBe(false);
    expect(result.matchedHotel).toBeUndefined();
  });

  it("propagates a database error instead of claiming no match", async () => {
    mocks.from.mockReturnValue(query([], { message: "database unavailable" }));
    await expect(checkHotelPreflightMatch({ data: { name: hotel.name } })).rejects.toThrow("database unavailable");
  });

  it("filters aliases by the related verified hotel and location", async () => {
    const global = query([]);
    const aliases = query([{ global_hotel_id: hotel.id, alias: "Central", global_hotels: hotel }]);
    mocks.from.mockReturnValueOnce(global).mockReturnValueOnce(aliases);
    const result = await checkHotelPreflightMatch({ data: { name: "Central", city: "Recife", state: "PE" } });
    expect(result.matchType).toBe("alias");
    expect(aliases.select).toHaveBeenCalledWith(expect.stringContaining("global_hotels!inner"));
    expect(aliases.eq).toHaveBeenCalledWith("global_hotels.verified_by_master", true);
    expect(aliases.ilike).toHaveBeenCalledWith("global_hotels.city", "Recife");
  });

  it("propagates alias lookup failures too", async () => {
    mocks.from.mockReturnValueOnce(query([])).mockReturnValueOnce(query([], { message: "alias unavailable" }));
    await expect(checkHotelPreflightMatch({ data: { name: "Central" } })).rejects.toThrow("alias unavailable");
  });
});
