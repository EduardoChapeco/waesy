/**
 * hotel-deadline-sentinel.ts — Sentinela Canônica de Prazos de Hospedagem & Cancelamento Gratuito
 * NORMAS: AGENTS.md (B.1 a B.41), ISO 8601 UTC
 */

export type HotelDeadlineStatus = "expired" | "critical" | "warning" | "safe";

export interface HotelReservationDeadlineInput {
  reservationId: string;
  hotelName: string;
  locatorOrBookingRef: string;
  guestName: string;
  checkInDate: string; // YYYY-MM-DD
  freeCancellationUntil: string; // ISO 8601 or YYYY-MM-DDTHH:mm:ssZ
  totalAmountCents: number;
  penaltyOnMissedDeadlineCents?: number;
  currency?: string;
}

export interface HotelDeadlineAlert {
  reservationId: string;
  hotelName: string;
  locatorOrBookingRef: string;
  guestName: string;
  freeCancellationUntil: string;
  hoursRemaining: number;
  daysRemaining: number;
  status: HotelDeadlineStatus;
  amountAtRiskCents: number;
  recommendation: string;
}

export interface HotelDeadlineAuditSummary {
  nowIso: string;
  totalReservationsAudited: number;
  criticalCount: number;
  warningCount: number;
  safeCount: number;
  expiredCount: number;
  totalAmountAtRiskCents: number;
  alerts: HotelDeadlineAlert[];
}

/**
 * Avalia os prazos de cancelamento gratuito de uma lista de reservas hoteleiras.
 */
export function auditHotelCancellationDeadlines(
  reservations: HotelReservationDeadlineInput[],
  now: Date = new Date(),
): HotelDeadlineAuditSummary {
  const alerts: HotelDeadlineAlert[] = [];
  let criticalCount = 0;
  let warningCount = 0;
  let safeCount = 0;
  let expiredCount = 0;
  let totalAmountAtRiskCents = 0;

  const nowMs = now.getTime();

  for (const res of reservations) {
    const deadlineMs = new Date(res.freeCancellationUntil).getTime();
    const diffMs = deadlineMs - nowMs;
    const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));
    const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let status: HotelDeadlineStatus;
    let recommendation: string;

    const penaltyCents = res.penaltyOnMissedDeadlineCents ?? res.totalAmountCents;

    if (diffMs <= 0) {
      status = "expired";
      recommendation = "Prazo de cancelamento gratuito esgotado. Penalidade integral aplicável.";
      expiredCount++;
      totalAmountAtRiskCents += penaltyCents;
    } else if (hoursRemaining <= 48) {
      status = "critical";
      recommendation = `Prazo crítico: restam ${hoursRemaining}h para cancelamento sem ônus. Confirmar ou liberar imediatamente.`;
      criticalCount++;
      totalAmountAtRiskCents += penaltyCents;
    } else if (daysRemaining <= 5) {
      status = "warning";
      recommendation = `Atenção: restam ${daysRemaining} dias para encerramento da isenção de multa.`;
      warningCount++;
      totalAmountAtRiskCents += penaltyCents;
    } else {
      status = "safe";
      recommendation = `Prazo seguro: ${daysRemaining} dias restantes até a data limite.`;
      safeCount++;
    }

    alerts.push({
      reservationId: res.reservationId,
      hotelName: res.hotelName,
      locatorOrBookingRef: res.locatorOrBookingRef,
      guestName: res.guestName,
      freeCancellationUntil: res.freeCancellationUntil,
      hoursRemaining,
      daysRemaining,
      status,
      amountAtRiskCents: penaltyCents,
      recommendation,
    });
  }

  // Ordena por criticidade: expired -> critical -> warning -> safe
  const priorityMap: Record<HotelDeadlineStatus, number> = {
    expired: 1,
    critical: 2,
    warning: 3,
    safe: 4,
  };

  alerts.sort((a, b) => {
    const pDiff = priorityMap[a.status] - priorityMap[b.status];
    if (pDiff !== 0) return pDiff;
    return a.hoursRemaining - b.hoursRemaining;
  });

  return {
    nowIso: now.toISOString(),
    totalReservationsAudited: reservations.length,
    criticalCount,
    warningCount,
    safeCount,
    expiredCount,
    totalAmountAtRiskCents,
    alerts,
  };
}
