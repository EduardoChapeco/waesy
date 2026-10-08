import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mapInfotravelV1BookingToNormalized } from "@/types/infotravel";

describe("Onda 9 — wiring dos módulos ao DTO infotravel-v1", () => {
  const service = readFileSync(resolve(process.cwd(), "src/services/infotravel.ts"), "utf8");
  const lifecycle = readFileSync(resolve(process.cwd(), "src/services/travel-lifecycle.functions.ts"), "utf8");
  const proposals = readFileSync(resolve(process.cwd(), "src/services/travel-proposal.functions.ts"), "utf8");

  it("exige o envelope v1 nas buscas, importação e sincronização", () => {
    expect(service).toContain("requireV1Envelope(data, \"search_hotels\")");
    expect(service).toContain("requireV1Envelope(data, \"search_flights\")");
    expect(service).toContain("requireV1Envelope(data, \"search_transfers\")");
    expect(service).toContain("requireV1Envelope(data, \"search_activities\")");
    expect(service).toContain("requireV1Envelope(\n      await invokeConnector<any>(\"import_booking\"");
    expect(service).toContain("requireV1Envelope(\n      await invokeConnector<any>(\"run_periodic_sync\"");
  });

  it("converte o DTO v1 em tipos canônicos consumíveis pela proposta", () => {
    const booking = mapInfotravelV1BookingToNormalized({
      contract_version: "infotravel-v1",
      booking_id: "BK-9",
      locator: "PNR-9",
      client_name: "Ana",
      total_sale: 1250.5,
      status: "confirmed",
      passengers: [],
      hotels: [{ external_id: "HT-1", name: "Hotel Azul", city: "Recife" }],
      flights: [{ external_id: "FL-1", origin: "GRU", destination: "REC", flight_number: "AD123" }],
      transfers: [],
      tours: [],
    });
    expect(booking).toMatchObject({ id: "BK-9", bookingCode: "PNR-9", clientName: "Ana", totalAmountCents: 125050 });
    expect(booking.hotels[0].id).toBe("HT-1");
    expect(booking.flights[0].id).toBe("FL-1");
  });

  it("mantém os módulos de lifecycle e proposta como consumidores da mesma raiz canônica", () => {
    expect(lifecycle).toContain("tourism_trips");
    expect(lifecycle).toContain("trip_confirmation_items");
    expect(lifecycle).toContain("tourism_vouchers");
    expect(proposals).toContain("convertProposalToTrip");
  });
});
