import { describe, it, expect } from "vitest";
import {
  blueprintFromPackage,
  blueprintToTravelProposalDTO,
} from "./travel-blueprint";
import { buildDefaultWebPageConfig } from "./proposal-normalization";
import {
  resolveCruisePortCoordinates,
  CURATED_CRUISE_PORTS,
} from "./flight-route-geometry";

describe("Travel Blueprint & Cruise Parity E2E", () => {
  it("preserves structured cruises from travel package into blueprint and proposal DTO", () => {
    const rawPkg = {
      title: "Cruzeiro Costa Fascinosa 7 Noites",
      destination_city: "Santos (SP)",
      transport_type: "cruzeiro",
      cruises: [
        {
          id: "cr-1",
          ship_name: "Costa Fascinosa",
          company: "Costa Cruzeiros",
          cabin_category: "Externa com Varanda",
          departure_port: "Porto de Santos",
          arrival_port: "Porto de Santos",
          itinerary: [
            { day_number: 1, port: "Santos (SP)", activity_type: "boarding", departure_time: "18:00" },
            { day_number: 2, port: "Búzios (RJ)", activity_type: "dock", arrival_time: "08:00" },
            { day_number: 3, port: "Santos (SP)", activity_type: "disembark", arrival_time: "07:00" },
          ],
        },
      ],
      payment_conditions: {
        installments_max: 12,
        pix_discount_percent: 5,
        custom_terms_text: "Sem juros operadora",
      },
    };

    const bp = blueprintFromPackage(rawPkg);
    expect(bp.cruises).toBeDefined();
    expect(bp.cruises.length).toBe(1);
    expect(bp.cruises[0].ship_name).toBe("Costa Fascinosa");
    expect(bp.paymentConditionsText).toContain("Até 12x");
    expect(bp.paymentConditionsText).toContain("5% desc. no PIX");

    const dto = blueprintToTravelProposalDTO(bp);
    expect(dto.cruises).toBeDefined();
    expect(dto.cruises.length).toBe(1);
    expect(dto.cruises[0].company).toBe("Costa Cruzeiros");
  });

  it("synthesizes a cruise item when flight_details.cruise_line is provided", () => {
    const rawPkg = {
      title: "Mini Cruzeiro MSC Seaview",
      destination_city: "Ilhabela",
      transport_type: "cruzeiro",
      flight_details: {
        cruise_line: "MSC Cruzeiros",
        ship_name: "MSC Seaview",
        embarkation_port: "Porto de Santos",
        cabin_category: "Cabine Varanda",
      },
    };

    const bp = blueprintFromPackage(rawPkg);
    expect(bp.cruises).toBeDefined();
    expect(bp.cruises.length).toBe(1);
    expect(bp.cruises[0].ship_name).toBe("MSC Seaview");
    expect(bp.cruises[0].company).toBe("MSC Cruzeiros");
  });

  it("includes blk-cruises block in buildDefaultWebPageConfig", () => {
    const sampleProposal = {
      id: "prop-cruise-1",
      title: "Roteiro Marítimo Salvador",
      destination_city: "Salvador (BA)",
      cruises: [
        {
          ship_name: "MSC Grandiosa",
          company: "MSC Cruzeiros",
        },
      ],
    };

    const config = buildDefaultWebPageConfig(sampleProposal as any);
    const cruiseBlock = config.blocks.find((b) => b.type === "cruises");
    expect(cruiseBlock).toBeDefined();
    expect(cruiseBlock?.id).toBe("blk-cruises");
    expect(cruiseBlock?.visible).toBe(true);
  });

  it("accurately resolves coordinates for major cruise ports", () => {
    const santos = resolveCruisePortCoordinates("Porto de Santos");
    expect(santos).toBeDefined();
    expect(santos?.code).toBe("SSZ");
    expect(santos?.lat).toBeCloseTo(-23.9618, 2);

    const buzios = resolveCruisePortCoordinates("Armação dos Búzios");
    expect(buzios).toBeDefined();
    expect(buzios?.code).toBe("BZS");

    const salvador = resolveCruisePortCoordinates("Porto de Salvador (BA)");
    expect(salvador).toBeDefined();
    expect(salvador?.code).toBe("SSA");
  });
});
