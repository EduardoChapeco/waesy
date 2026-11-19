import type { Flight } from "@/services/proposals";

/**
 * Converte horário HH:MM em minutos desde 00:00.
 */
export function parseTimeToMinutes(t?: string): number | null {
  if (!t || !t.includes(":")) return null;
  const [h, m] = t.split(":").map((v) => parseInt(v, 10));
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Detecta conexões aéreas apertadas (< 45 min), inconsistentes (< 0) ou muito longas (>= 6h).
 */
export function getConnectionWarning(
  prev?: Flight,
  curr?: Flight,
): { type: "tight" | "negative" | "long"; message: string } | null {
  if (!prev || !curr) return null;
  if (!prev.destination || !curr.origin) return null;

  const destClean = prev.destination.trim().toUpperCase();
  const origClean = curr.origin.trim().toUpperCase();

  if (destClean !== origClean && prev.date !== curr.date) return null;

  const arrMin = parseTimeToMinutes(prev.arrival_time);
  const depMin = parseTimeToMinutes(curr.departure_time);

  if (arrMin === null || depMin === null) return null;

  const diff = depMin - arrMin;

  if (diff < 0) {
    return {
      type: "negative",
      message: `Inconsistência de horários: O voo ${curr.flight_number || "seguinte"} decola às ${curr.departure_time}, antes da chegada do voo anterior (${prev.arrival_time}) em ${prev.destination}.`,
    };
  }

  if (diff < 45) {
    return {
      type: "tight",
      message: `Conexão apertada em ${prev.destination}: apenas ${diff} min de solo. Risco elevado de perda de conexão ou extravio de bagagem despachada.`,
    };
  }

  if (diff >= 360) {
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return {
      type: "long",
      message: `Conexão longa em ${prev.destination}: ${hours}h${mins > 0 ? ` ${mins}min` : ""} de espera no aeroporto.`,
    };
  }

  return null;
}

// ─── Comparação Determinística & Análise de Risco de Reacomodação ────────────

export interface ComparableFlightSegment {
  segment_order?: number | null;
  airline_code?: string | null;
  flight_number?: string | null;
  origin_iata?: string | null;
  destination_iata?: string | null;
  departure_at: string;
  arrival_at: string;
  baggage?: string | null;
  cabin?: string | null;
  record_locator?: string | null;
}

export interface SegmentDiff {
  segment_order: number;
  airline_changed: boolean;
  flight_number_changed: boolean;
  origin_changed: boolean;
  destination_changed: boolean;
  departure_changed: boolean;
  arrival_changed: boolean;
  departure_delta_minutes: number;
  arrival_delta_minutes: number;
  baggage_changed: boolean;
  cabin_changed: boolean;
  record_locator_changed: boolean;
}

export interface ItineraryDiff {
  segmentsDiff: SegmentDiff[];
  segment_count_delta: number;
  has_changes: boolean;
}

export function compareItineraries(
  original: ComparableFlightSegment[],
  comparison: ComparableFlightSegment[],
): ItineraryDiff {
  const sortedOrig = [...original].sort((a, b) => (a.segment_order || 0) - (b.segment_order || 0));
  const sortedComp = [...comparison].sort((a, b) => (a.segment_order || 0) - (b.segment_order || 0));

  const segmentsDiff: SegmentDiff[] = [];
  const maxLen = Math.max(sortedOrig.length, sortedComp.length);
  let hasChanges = false;

  for (let i = 0; i < maxLen; i++) {
    const orig = sortedOrig[i];
    const comp = sortedComp[i];
    if (!orig || !comp) {
      hasChanges = true;
      continue;
    }

    const depOrig = new Date(orig.departure_at).getTime();
    const depComp = new Date(comp.departure_at).getTime();
    const arrOrig = new Date(orig.arrival_at).getTime();
    const arrComp = new Date(comp.arrival_at).getTime();

    const depDelta = Number.isFinite(depOrig) && Number.isFinite(depComp) ? Math.round((depComp - depOrig) / 60000) : 0;
    const arrDelta = Number.isFinite(arrOrig) && Number.isFinite(arrComp) ? Math.round((arrComp - arrOrig) / 60000) : 0;

    const airlineChanged = (orig.airline_code || "") !== (comp.airline_code || "");
    const flightNumChanged = (orig.flight_number || "") !== (comp.flight_number || "");
    const originChanged = (orig.origin_iata || "") !== (comp.origin_iata || "");
    const destChanged = (orig.destination_iata || "") !== (comp.destination_iata || "");
    const depChanged = depDelta !== 0;
    const arrChanged = arrDelta !== 0;
    const bagChanged = (orig.baggage || "") !== (comp.baggage || "");
    const cabinChanged = (orig.cabin || "") !== (comp.cabin || "");
    const locatorChanged = (orig.record_locator || "") !== (comp.record_locator || "");

    if (
      airlineChanged ||
      flightNumChanged ||
      originChanged ||
      destChanged ||
      depChanged ||
      arrChanged ||
      bagChanged ||
      cabinChanged ||
      locatorChanged
    ) {
      hasChanges = true;
    }

    segmentsDiff.push({
      segment_order: comp.segment_order || i + 1,
      airline_changed: airlineChanged,
      flight_number_changed: flightNumChanged,
      origin_changed: originChanged,
      destination_changed: destChanged,
      departure_changed: depChanged,
      arrival_changed: arrChanged,
      departure_delta_minutes: depDelta,
      arrival_delta_minutes: arrDelta,
      baggage_changed: bagChanged,
      cabin_changed: cabinChanged,
      record_locator_changed: locatorChanged,
    });
  }

  return {
    segmentsDiff,
    segment_count_delta: sortedComp.length - sortedOrig.length,
    has_changes: hasChanges || sortedComp.length !== sortedOrig.length,
  };
}

export interface FlightDifferenceAnalysisResult {
  date_changed: boolean;
  time_changed: boolean;
  airport_changed: boolean;
  overnight_connection: boolean;
  total_duration_delta_minutes: number;
  segment_count_delta: number;
  baggage_changed: boolean;
  cabin_changed: boolean;
  risk_score: number;
  warnings: string[];
  deterministic_summary: string;
}

export function analyzeFlightDifferences(
  originalSegments: ComparableFlightSegment[],
  alternativeSegments: ComparableFlightSegment[],
): FlightDifferenceAnalysisResult {
  const origSegments = [...originalSegments].sort((a, b) => (a.segment_order || 0) - (b.segment_order || 0));
  const altSegments = [...alternativeSegments].sort((a, b) => (a.segment_order || 0) - (b.segment_order || 0));

  const segmentCountDelta = altSegments.length - origSegments.length;
  let dateChanged = false;
  let timeChanged = false;
  let airportChanged = false;
  let overnightConnection = false;
  let baggageChanged = false;
  let cabinChanged = false;

  if (origSegments.length > 0 && altSegments.length > 0) {
    const origStart = origSegments[0];
    const origEnd = origSegments[origSegments.length - 1];
    const altStart = altSegments[0];
    const altEnd = altSegments[altSegments.length - 1];

    if (new Date(origStart.departure_at).toDateString() !== new Date(altStart.departure_at).toDateString()) {
      dateChanged = true;
    }
    if (new Date(origStart.departure_at).getTime() !== new Date(altStart.departure_at).getTime()) {
      timeChanged = true;
    }
    if (
      (origStart.origin_iata || "") !== (altStart.origin_iata || "") ||
      (origEnd.destination_iata || "") !== (altEnd.destination_iata || "")
    ) {
      airportChanged = true;
    }
  }

  let origTotalDuration = 0;
  let altTotalDuration = 0;
  if (origSegments.length > 0) {
    origTotalDuration = Math.round(
      (new Date(origSegments[origSegments.length - 1].arrival_at).getTime() -
        new Date(origSegments[0].departure_at).getTime()) /
        60000,
    );
  }
  if (altSegments.length > 0) {
    altTotalDuration = Math.round(
      (new Date(altSegments[altSegments.length - 1].arrival_at).getTime() -
        new Date(altSegments[0].departure_at).getTime()) /
        60000,
    );
  }

  const totalDurationDeltaMinutes =
    Number.isFinite(origTotalDuration) && Number.isFinite(altTotalDuration)
      ? altTotalDuration - origTotalDuration
      : 0;
  const warnings: string[] = [];

  for (let i = 0; i < altSegments.length - 1; i++) {
    const arr = new Date(altSegments[i].arrival_at).getTime();
    const dep = new Date(altSegments[i + 1].departure_at).getTime();
    const layover = Math.round((dep - arr) / 60000);
    if (layover > 480) {
      overnightConnection = true;
      warnings.push(
        `Conexão longa em ${altSegments[i].destination_iata || "escala"}: ${Math.round(layover / 60)}h`,
      );
    }
    if (new Date(altSegments[i].arrival_at).toDateString() !== new Date(altSegments[i + 1].departure_at).toDateString()) {
      overnightConnection = true;
    }
  }

  for (let i = 0; i < Math.min(origSegments.length, altSegments.length); i++) {
    if ((origSegments[i].baggage || "") !== (altSegments[i].baggage || "")) baggageChanged = true;
    if ((origSegments[i].cabin || "") !== (altSegments[i].cabin || "")) cabinChanged = true;
  }

  let riskScore = 0;
  if (airportChanged) {
    riskScore += 40;
    warnings.push("Alteração de aeroporto de origem ou destino final");
  }
  if (dateChanged) {
    riskScore += 30;
    warnings.push("Alteração na data de partida");
  }
  if (overnightConnection) {
    riskScore += 20;
    warnings.push("Conexão com pernoite ou espera prolongada");
  }
  if (segmentCountDelta > 0) {
    riskScore += 15 * segmentCountDelta;
    warnings.push(`Aumento de ${segmentCountDelta} conexão(ões) no trajeto`);
  }
  if (totalDurationDeltaMinutes > 120) {
    riskScore += 15;
    warnings.push(`Aumento do tempo total de viagem em ${Math.round(totalDurationDeltaMinutes / 60)}h`);
  }
  if (baggageChanged) {
    riskScore += 10;
    warnings.push("Alteração na política ou franquia de bagagem");
  }
  if (cabinChanged) {
    riskScore += 10;
    warnings.push("Alteração de classe tarifária/cabine");
  }

  riskScore = Math.min(riskScore, 100);

  const summaryParts: string[] = [];
  if (dateChanged) summaryParts.push("Alteração de data");
  if (timeChanged && !dateChanged) summaryParts.push("Alteração de horário");
  if (airportChanged) summaryParts.push("Mudança de aeroporto");
  if (segmentCountDelta > 0) summaryParts.push("Mais conexões");
  if (overnightConnection) summaryParts.push("Pernoite necessário");
  if (baggageChanged) summaryParts.push("Alteração de bagagem");

  const deterministicSummary =
    summaryParts.length > 0
      ? `Identificado: ${summaryParts.join(", ")} (Risco ${riskScore}/100).`
      : `Alteração menor de horários (Risco ${riskScore}/100).`;

  return {
    date_changed: dateChanged,
    time_changed: timeChanged,
    airport_changed: airportChanged,
    overnight_connection: overnightConnection,
    total_duration_delta_minutes: totalDurationDeltaMinutes,
    segment_count_delta: segmentCountDelta,
    baggage_changed: baggageChanged,
    cabin_changed: cabinChanged,
    risk_score: riskScore,
    warnings,
    deterministic_summary: deterministicSummary,
  };
}
