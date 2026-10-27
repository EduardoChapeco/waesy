import { describe, it, expect } from "vitest";
import {
  auditHotelCancellationDeadlines,
  type HotelReservationDeadlineInput,
} from "../hotel-deadline-sentinel";

describe("Hotel Cancellation Deadline Sentinel", () => {
  const baseNow = new Date("2026-10-22T12:00:00Z");

  it("classifica corretamente reservas expiradas, críticas, de aviso e seguras", () => {
    const reservations: HotelReservationDeadlineInput[] = [
      {
        reservationId: "res-1",
        hotelName: "Grand Palace Hotel",
        locatorOrBookingRef: "GP-9901",
        guestName: "Carlos Silva",
        checkInDate: "2026-10-30",
        freeCancellationUntil: "2026-10-21T23:59:59Z", // já passou (-12h)
        totalAmountCents: 150000,
      },
      {
        reservationId: "res-2",
        hotelName: "Copacabana Luxury",
        locatorOrBookingRef: "CB-4421",
        guestName: "Mariana Souza",
        checkInDate: "2026-10-25",
        freeCancellationUntil: "2026-10-23T12:00:00Z", // daqui a 24h (crítico)
        totalAmountCents: 240000,
      },
      {
        reservationId: "res-3",
        hotelName: "Resort Termas de Piratuba",
        locatorOrBookingRef: "TP-8877",
        guestName: "Roberto Lima",
        checkInDate: "2026-11-05",
        freeCancellationUntil: "2026-10-26T12:00:00Z", // daqui a 4 dias (warning)
        totalAmountCents: 320000,
      },
      {
        reservationId: "res-4",
        hotelName: "Pousada Morro das Pedras",
        locatorOrBookingRef: "MP-1020",
        guestName: "Ana Dias",
        checkInDate: "2026-12-01",
        freeCancellationUntil: "2026-11-15T12:00:00Z", // daqui a 24 dias (safe)
        totalAmountCents: 98000,
      },
    ];

    const result = auditHotelCancellationDeadlines(reservations, baseNow);

    expect(result.totalReservationsAudited).toBe(4);
    expect(result.expiredCount).toBe(1);
    expect(result.criticalCount).toBe(1);
    expect(result.warningCount).toBe(1);
    expect(result.safeCount).toBe(1);

    // Valor em risco soma os não-seguros (expired + critical + warning)
    expect(result.totalAmountAtRiskCents).toBe(150000 + 240000 + 320000);

    // Primeiro alerta ordenado deve ser o expirado, depois crítico
    expect(result.alerts[0].reservationId).toBe("res-1");
    expect(result.alerts[0].status).toBe("expired");

    expect(result.alerts[1].reservationId).toBe("res-2");
    expect(result.alerts[1].status).toBe("critical");
    expect(result.alerts[1].hoursRemaining).toBe(24);

    expect(result.alerts[2].reservationId).toBe("res-3");
    expect(result.alerts[2].status).toBe("warning");

    expect(result.alerts[3].reservationId).toBe("res-4");
    expect(result.alerts[3].status).toBe("safe");
  });

  it("calcula multa com precisão considerando penaltyOnMissedDeadlineCents customizado", () => {
    const reservations: HotelReservationDeadlineInput[] = [
      {
        reservationId: "res-custom",
        hotelName: "Boutique Hotel",
        locatorOrBookingRef: "BT-1234",
        guestName: "Lucas Mendes",
        checkInDate: "2026-10-28",
        freeCancellationUntil: "2026-10-23T18:00:00Z",
        totalAmountCents: 500000,
        penaltyOnMissedDeadlineCents: 150000, // multa é 1ª diária
      },
    ];

    const result = auditHotelCancellationDeadlines(reservations, baseNow);
    expect(result.criticalCount).toBe(1);
    expect(result.totalAmountAtRiskCents).toBe(150000);
    expect(result.alerts[0].amountAtRiskCents).toBe(150000);
  });
});
