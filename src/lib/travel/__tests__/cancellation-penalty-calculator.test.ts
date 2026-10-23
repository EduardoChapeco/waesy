import { describe, it, expect } from "vitest";
import { calculateTripCancellationPenalties } from "../cancellation-penalty-calculator";

describe("Motor de Cálculo de Multas Pós-Emissão (cancellation-penalty-calculator)", () => {
  it("Cenário 1: Retenção mandatória dos 30% da agência mesmo em caso de desistência imediata", () => {
    const res = calculateTripCancellationPenalties({
      totalPackageCents: 1000000, // R$ 10.000,00
      issuedAt: "2026-10-20T10:00:00Z",
      requestedAt: "2026-10-20T14:00:00Z", // 4 horas após emissão
      departureDate: "2026-11-20", // 31 dias de antecedência
      flights: {
        baseFareCents: 400000,
        boardingTaxesCents: 15000,
        isRefundableFare: false,
        airlineCancellationPenaltyCents: 0,
      },
      hotel: {
        totalHotelCents: 500000,
        freeCancellationUntil: "2026-11-13T23:59:59Z", // 7 dias antes do check-in
        penaltyIfAfterDeadlineCents: 500000,
      },
      transfers: {
        totalTransferCents: 85000,
      },
      agencyServiceFeePct: 30, // 30%
      operatorRefundFeePct: 15, // 15%
    });

    // 1. Honorários da agência retidos (30% de 10.000 = 3.000)
    expect(res.agencyRetainedServiceCents).toBe(300000);
    expect(res.agencyRetainedReason).toContain("Honorários de assessoria");

    // 2. Isenção ANAC 24h aplicada ao aéreo (solicitado 4h pós-emissão com 31 dias de antecedência)
    expect(res.isAnac24hFlightExemptionApplied).toBe(true);
    expect(res.flightPenaltyCents).toBe(0);
    expect(res.flightBoardingTaxesRefundedCents).toBe(15000);

    // 3. Hotel antes do prazo de cancelamento gratuito
    expect(res.isHotelFreeCancellationActive).toBe(true);
    expect(res.hotelPenaltyCents).toBe(0);

    // 4. Saldo reembolsável ao cliente positivo
    expect(res.refundableToCustomerCents).toBeGreaterThan(0);
  });

  it("Cenário 2: Fora das 24h da ANAC — Perda da tarifa promocional não reembolsável mas recuperação de taxas", () => {
    const res = calculateTripCancellationPenalties({
      totalPackageCents: 600000, // R$ 6.000,00
      issuedAt: "2026-10-01T10:00:00Z",
      requestedAt: "2026-10-15T10:00:00Z", // 14 dias após a emissão
      departureDate: "2026-11-20",
      flights: {
        baseFareCents: 250000,
        boardingTaxesCents: 18000,
        isRefundableFare: false, // Tarifa não reembolsável
      },
      agencyServiceFeePct: 30,
      operatorRefundFeePct: 15,
    });

    expect(res.isAnac24hFlightExemptionApplied).toBe(false);
    expect(res.flightPenaltyCents).toBe(250000); // Perde a base da tarifa
    expect(res.flightBoardingTaxesRefundedCents).toBe(18000); // Taxas de embarque estornadas
    expect(res.agencyRetainedServiceCents).toBe(180000); // 30% de 6.000 = 1.800
  });

  it("Cenário 3: Hotel cancelado APÓS o prazo limite — Aplicação da penalidade de hospedagem", () => {
    const res = calculateTripCancellationPenalties({
      totalPackageCents: 800000, // R$ 8.000,00
      issuedAt: "2026-10-01T10:00:00Z",
      requestedAt: "2026-11-18T10:00:00Z", // 2 dias antes do check-in
      departureDate: "2026-11-20",
      hotel: {
        totalHotelCents: 400000,
        freeCancellationUntil: "2026-11-13T23:59:59Z", // Prazo venceu dia 13
        penaltyIfAfterDeadlineCents: 400000,
      },
      agencyServiceFeePct: 30,
      operatorRefundFeePct: 15,
    });

    expect(res.isHotelFreeCancellationActive).toBe(false);
    expect(res.hotelPenaltyCents).toBe(400000); // Perdeu o hotel porque prazo passou
  });

  it("Cenário 4: Transfer cancelado com menos de 48h do embarque — Retenção de 100% do transfer", () => {
    const res = calculateTripCancellationPenalties({
      totalPackageCents: 500000,
      issuedAt: "2026-10-01T10:00:00Z",
      requestedAt: "2026-11-19T10:00:00Z", // 24h antes do embarque
      departureDate: "2026-11-20",
      transfers: {
        totalTransferCents: 60000,
      },
      agencyServiceFeePct: 30,
      operatorRefundFeePct: 15,
    });

    expect(res.transferPenaltyCents).toBe(60000); // Retenção integral de transfer
  });
});
