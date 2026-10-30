import { describe, expect, it } from "vitest";
import { normalizeInfoTravelRoomOccupancies } from "./infotravel";

describe("InfoTravel room occupancy contract", () => {
  it("preserves multiple rooms and child ages for package search", () => {
    expect(
      normalizeInfoTravelRoomOccupancies({
        adults: 4,
        roomOccupancies: [
          { adults: 3, childrenAges: [6] },
          { adults: 1, childrenAges: [] },
        ],
      }),
    ).toEqual([
      { adults: 3, childrenAges: [6] },
      { adults: 1, childrenAges: [] },
    ]);
  });

  it("keeps the single-room compatibility path", () => {
    expect(normalizeInfoTravelRoomOccupancies({ adults: 2, childrenAges: [4, 9] })).toEqual([
      { adults: 2, childrenAges: [4, 9] },
    ]);
  });

  it("rejects invalid room compositions instead of sending unsafe input", () => {
    expect(() => normalizeInfoTravelRoomOccupancies({ adults: 0 })).toThrow("composição de quartos");
  });
});
