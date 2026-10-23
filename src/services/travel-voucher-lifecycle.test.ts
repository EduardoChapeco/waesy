import { describe, it, expect } from "vitest";
import {
  EnrichVoucherWithAgentPnrsSchema,
  ReleaseTripVouchersSchema,
} from "./travel-vouchers.functions";

describe("Travel Voucher Lifecycle & Release Workflows (BFF)", () => {
  it("valida contrato de enriquecimento de voucher pelo agente com PNR e e-ticket", () => {
    const input = {
      voucherId: "11111111-1111-4111-a111-111111111111",
      pnrCode: "LA9841K",
      eTicketNumber: "957-2194819284",
      hotelConfirmationCode: "HT-RESORT-MABU-992",
      flightData: {
        airline: "LATAM Airlines",
        flight_number: "LA3412",
        gate: "04",
      },
      agentNotes: "Voo confirmado com franquia de 1 mala de 23kg inclusa.",
    };

    const parsed = EnrichVoucherWithAgentPnrsSchema.parse(input);
    expect(parsed.voucherId).toBe("11111111-1111-4111-a111-111111111111");
    expect(parsed.pnrCode).toBe("LA9841K");
    expect(parsed.eTicketNumber).toBe("957-2194819284");
    expect(parsed.hotelConfirmationCode).toBe("HT-RESORT-MABU-992");
    expect(parsed.flightData?.gate).toBe("04");
  });

  it("valida contrato de liberação de vouchers para o viajante", () => {
    const input = {
      tripId: "22222222-2222-4222-a222-222222222222",
      releaseNotes: "Todos os e-tickets emitidos e validados pela equipe da agência.",
    };

    const parsed = ReleaseTripVouchersSchema.parse(input);
    expect(parsed.tripId).toBe("22222222-2222-4222-a222-222222222222");
    expect(parsed.releaseNotes).toContain("e-tickets emitidos");
  });

  it("rejeita liberação com tripId que não seja UUID", () => {
    expect(() =>
      ReleaseTripVouchersSchema.parse({
        tripId: "invalid-trip-id",
      })
    ).toThrow();
  });
});
