import { describe, expect, it } from "vitest";
import {
  buildSvgProjectionForCruise,
  buildSvgProjectionForRoute,
  CURATED_CRUISE_PORTS,
  resolveCruisePortCoordinates,
  resolveFlightRouteModel,
} from "@/lib/tourism/flight-route-geometry";
import {
  createTravelProposalInputSchema,
  type CruiseDTO,
  type TransferDTO,
} from "@/services/travel-proposal.functions";

describe("Cruise & Nautical Route Engine (flight-route-geometry)", () => {
  it("resolves curated Brazilian cruise ports with exact nautical coordinates", () => {
    const santos = resolveCruisePortCoordinates("Santos");
    expect(santos).not.toBeNull();
    expect(santos?.code).toBe("SSZ");
    expect(santos?.lat).toBeCloseTo(-23.9618, 2);
    expect(santos?.lng).toBeCloseTo(-46.3322, 2);

    const buzios = resolveCruisePortCoordinates("Búzios");
    expect(buzios).not.toBeNull();
    expect(buzios?.code).toBe("BZS");
    expect(buzios?.lat).toBeCloseTo(-22.7539, 2);
    expect(buzios?.lng).toBeCloseTo(-41.9056, 2);

    const rio = resolveCruisePortCoordinates("Rio de Janeiro");
    expect(rio).not.toBeNull();
    expect(rio?.code).toBe("RIO");

    const salvador = resolveCruisePortCoordinates("Porto de Salvador");
    expect(salvador).not.toBeNull();
    expect(salvador?.code).toBe("SSA");
  });

  it("handles case-insensitive and unaccented port searches seamlessly", () => {
    const buziosWithoutAccent = resolveCruisePortCoordinates("buzios");
    expect(buziosWithoutAccent).not.toBeNull();
    expect(buziosWithoutAccent?.code).toBe("BZS");

    const ilhabela = resolveCruisePortCoordinates("Ilha Bela");
    expect(ilhabela).not.toBeNull();
    expect(ilhabela?.code).toBe("ILH");
  });

  it("generates a crisp, CORS-free SVG nautical projection for MSC Santos -> Buzios -> Santos", () => {
    const itinerary = [
      { day: 1, port: "Santos", is_sea_day: false, activity_type: "boarding" },
      { day: 2, port: "Em navegação", is_sea_day: true, activity_type: "sea" },
      { day: 3, port: "Búzios", is_sea_day: false, activity_type: "dock" },
      { day: 4, port: "Santos", is_sea_day: false, activity_type: "disembark" },
    ];

    const proj = buildSvgProjectionForCruise(itinerary, 720, 260, 48);

    expect(proj.stops.length).toBe(2); // Unique stops: Santos and Buzios
    expect(proj.stops.map((s) => s.city)).toContain("SANTOS");
    expect(proj.stops.map((s) => s.city)).toContain("BÚZIOS");

    // All stop coordinates should be strictly within SVG viewBox boundaries
    proj.stops.forEach((stop) => {
      expect(stop.x).toBeGreaterThan(0);
      expect(stop.x).toBeLessThan(720);
      expect(stop.y).toBeGreaterThan(0);
      expect(stop.y).toBeLessThan(260);
    });

    // Nautical route path curve
    expect(proj.routePath).toContain("M ");
    expect(proj.routePath).toContain("Q ");

    // Coastline and geographic labels
    expect(proj.landmassPath).toContain("M 0 0");
    expect(proj.landLabel.text).toBe("Brazil");
    expect(proj.oceanLabel.text).toBe("Atlantic Ocean");
    expect(proj.arrows.length).toBeGreaterThan(0);
  });

  it("provides deterministic default route when empty or sea-only itinerary is passed", () => {
    const emptyProj = buildSvgProjectionForCruise([]);
    expect(emptyProj.stops.length).toBe(2);
    expect(emptyProj.stops[0].city).toBe("SANTOS");
    expect(emptyProj.stops[1].city).toBe("BÚZIOS");
    expect(emptyProj.routePath).not.toBe("");
  });
});

describe("Geodesic Flight Route Engine with Brazilian Coastline", () => {
  it("resolves multi-leg flights with curved geodesic arcs and landmass silhouettes", () => {
    const segments = [
      {
        direction: "ida",
        origin_iata: "XAP",
        destination_iata: "REC",
        connections: ["GRU"],
      },
    ];

    const model = resolveFlightRouteModel(segments);
    expect(model.stops.length).toBe(3); // XAP, GRU, REC
    expect(model.legs.length).toBe(2); // XAP->GRU, GRU->REC

    const svgProj = buildSvgProjectionForRoute(model, 720, 280, 42);
    expect(svgProj.stops.length).toBe(3);
    expect(svgProj.paths.length).toBe(2);
    expect(svgProj.landmassPath).toContain("M ");
    expect(svgProj.brazilBorderPath).toContain("M ");
    expect(svgProj.oceanLabelPoint.x).toBeGreaterThan(0);
    expect(svgProj.brazilLabelPoint.x).toBeGreaterThan(0);
  });
});

describe("Travel Proposal DTO & Schema Validation for Cruise and Transfers", () => {
  it("validates proposal payload containing structured cruise and full-width transfer specs", () => {
    const sampleCruise: CruiseDTO = {
      id: "cruise-msc-01",
      ship_name: "MSC Seaview",
      cruise_line: "MSC Cruzeiros",
      cabin_category: "Varanda Fantastica Vista Mar",
      embarkation_port: "Santos",
      disembarkation_port: "Santos",
      departure_date: "2026-12-05",
      return_date: "2026-12-09",
      nights_count: 4,
      board_basis: "all_inclusive",
      image_url: "https://example.com/msc-seaview.jpg",
      itinerary: [
        { day: 1, port: "Santos", arrive_time: "", depart_time: "18:00", activity_type: "boarding" },
        { day: 2, port: "Em navegação", is_sea_day: true, activity_type: "sea" },
        { day: 3, port: "Búzios", arrive_time: "08:00", depart_time: "17:00", activity_type: "dock" },
        { day: 4, port: "Santos", arrive_time: "07:00", depart_time: "", activity_type: "disembark" },
      ],
    };

    const sampleTransfer: TransferDTO = {
      id: "transfer-01",
      sequence_number: 1,
      direction: "ida_e_volta",
      vehicle_category: "Van Executiva / Receptivo VIP",
      origin_title: "Aeroporto Internacional de Recife (REC)",
      destination_title: "Pousada Ponta de Mangue (Maragogi)",
      meeting_point: "Balcão da Operadora / Portão desembarque",
      luggage_notes: "1 mala média (23kg) + 1 mochila por passageiro",
      image_url: "https://example.com/van-executiva.jpg",
      provider_name: "Luck Receptivo",
      unit_cost: 380,
      markup_percentage: 15,
      total_amount: 437,
    };

    const proposalInput = {
      store_id: "973e4499-1a3b-4780-bdf1-3ef5a914ff69",
      title: "Roteiro dos Sonhos: Maragogi + Cruzeiro MSC",
      travel_niche: "turismo",
      template_id: "editorial_clean",
      total_amount: 8950,
      currency: "BRL",
      cruises: [sampleCruise],
      transfers: [sampleTransfer],
      map_image_url: "https://example.com/captured-route-map.png",
      captured_map_url: "https://example.com/captured-route-map.png",
    };

    const parseResult = createTravelProposalInputSchema.safeParse(proposalInput);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      expect(parseResult.data.cruises).toHaveLength(1);
      expect(parseResult.data.cruises?.[0].ship_name).toBe("MSC Seaview");
      expect(parseResult.data.cruises?.[0].itinerary).toHaveLength(4);

      expect(parseResult.data.transfers).toHaveLength(1);
      expect(parseResult.data.transfers?.[0].meeting_point).toBe("Balcão da Operadora / Portão desembarque");
      expect(parseResult.data.transfers?.[0].luggage_notes).toBe("1 mala média (23kg) + 1 mochila por passageiro");
      expect(parseResult.data.transfers?.[0].direction).toBe("ida_e_volta");
    }
  });
});
