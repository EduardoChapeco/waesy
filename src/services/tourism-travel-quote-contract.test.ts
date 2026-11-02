import { describe, expect, it } from "vitest";
import { createAgencyTravelQuoteSchema } from "./tourism.functions";

describe("travel quote canonical input", () => {
  it("accepts the workspace snake_case contract with multiple rooms", () => {
    const result = createAgencyTravelQuoteSchema.safeParse({
      contact_name: "Ana Souza",
      contact_whatsapp: "49999998888",
      origin_city: "Chapeco",
      destination_city: "Maceio",
      adults_count: 4,
      children_count: 1,
      children_ages: [7],
      room_occupancies: [
        { adults: 3, childrenAges: [7] },
        { adults: 1, childrenAges: [] },
      ],
      source: "workspace_unified_proposal",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.room_occupancies).toHaveLength(2);
      expect(result.data.source).toBe("workspace_unified_proposal");
    }
  });

  it("rejects the obsolete PascalCase payload instead of silently saving nothing", () => {
    const result = createAgencyTravelQuoteSchema.safeParse({
      CustomerName: "Ana Souza",
      CustomerWhatsapp: "49999998888",
      DestinationRaw: "Maceio",
    });

    expect(result.success).toBe(false);
  });
});
