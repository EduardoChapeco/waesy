/**
 * carona-graph-engine.ts — Motor de Grafo Multi-Trecho para Caronas Intermunicipais (Estilo BlaBlaCar)
 *
 * Resolve alocação dinâmica de assentos por aresta atômica entre paradas intermediárias
 * (ex: Chapecó [0] -> Concórdia [1] -> Lages [2] -> São José [3] -> Florianópolis [4]),
 * precificação proporcional por sub-trecho e filtragem bilateral "Só Mulheres".
 */

export interface CaronaWaypointNode {
  stopOrder: number;
  cityName: string;
  stateCode?: string;
  meetingPoint?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  estimatedArrivalAt?: string | null;
  cumulativePriceCents?: number | null;
}

export interface CaronaSegmentBookingEdge {
  id?: string;
  fromStopOrder: number;
  toStopOrder: number;
  seatsBooked: number;
  status?: "pending_negotiation" | "confirmed" | "boarded" | "completed" | "cancelled" | string;
  passengerName?: string;
  fromCity?: string;
  toCity?: string;
}

export interface CaronaRideGraphInput {
  id: string;
  driverId: string;
  driverName: string;
  driverAvatarUrl?: string | null;
  driverRating: number;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  departureAt: string;
  totalSeats: number;
  fullRoutePriceCents: number;
  womenOnly: boolean;
  allowPriceNegotiation: boolean;
  vehicleModel: string;
  vehicleColor?: string | null;
  vehiclePlate?: string | null;
  vehiclePhotoUrl?: string | null;
  luggageSize: "small" | "medium" | "large";
  notes?: string | null;
  status: "published" | "in_progress" | "completed" | "cancelled" | string;
  waypoints: CaronaWaypointNode[];
  bookings: CaronaSegmentBookingEdge[];
}

export interface CaronaLegOccupancyStep {
  edgeIndex: number;
  fromStopOrder: number;
  toStopOrder: number;
  fromCity: string;
  toCity: string;
  occupiedSeats: number;
  availableSeats: number;
  isWithinRequestedSegment: boolean;
}

export interface MatchedCaronaCorridorDTO extends CaronaRideGraphInput {
  matchedFromStopOrder: number;
  matchedToStopOrder: number;
  matchedOriginCity: string;
  matchedDestinationCity: string;
  matchedOriginMeetingPoint: string | null;
  matchedDestinationMeetingPoint: string | null;
  availableSeatsForSegment: number;
  segmentPriceCents: number;
  isPartialSubSegment: boolean;
  legOccupancyTimeline: CaronaLegOccupancyStep[];
}

/**
 * Normaliza o nome de uma cidade para comparação insensível a acentos, caixa e sufixo de UF.
 */
export function normalizeCityToken(city: string | null | undefined): string {
  if (!city) return "";
  return city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[-/,]/)[0]
    .trim()
    .toLowerCase();
}

/**
 * Computa a ocupação de assentos em cada aresta atômica k in [0, waypointCount - 2].
 * Uma reserva em [fromStopOrder, toStopOrder) ocupa exclusivamente as arestas k tais que
 * fromStopOrder <= k < toStopOrder, liberando o assento exatamente em toStopOrder.
 */
export function computeSegmentEdgeOccupancy(
  waypointCount: number,
  bookings: CaronaSegmentBookingEdge[],
): number[] {
  const edgeCount = Math.max(1, waypointCount - 1);
  const occupied = new Array<number>(edgeCount).fill(0);

  for (const booking of bookings || []) {
    if (booking.status === "cancelled") continue;
    const seats = Math.max(1, Math.floor(booking.seatsBooked || 1));
    const startEdge = Math.max(0, Math.floor(booking.fromStopOrder));
    const endEdge = Math.min(edgeCount, Math.floor(booking.toStopOrder));

    for (let k = startEdge; k < endEdge; k++) {
      occupied[k] += seats;
    }
  }

  return occupied;
}

/**
 * Calcula quantas vagas estão disponíveis para um passageiro que embarca em `fromStopOrder`
 * e desembarca em `toStopOrder`:
 *
 * Vagas Disponíveis(i_in, i_out) = totalSeats - max_{k in [i_in, i_out - 1]} occupied[k]
 */
export function computeAvailableSeatsForSegment(
  totalSeats: number,
  waypointCount: number,
  bookings: CaronaSegmentBookingEdge[],
  fromStopOrder: number,
  toStopOrder: number,
): number {
  const safeTotal = Math.max(0, Math.floor(totalSeats));
  const safeWaypointCount = Math.max(2, Math.floor(waypointCount));
  const start = Math.floor(fromStopOrder);
  const end = Math.floor(toStopOrder);

  if (start < 0 || end <= start || end >= safeWaypointCount) {
    return 0;
  }

  const occupied = computeSegmentEdgeOccupancy(safeWaypointCount, bookings);
  let maxOccupiedInSegment = 0;

  for (let k = start; k < end; k++) {
    if (occupied[k] > maxOccupiedInSegment) {
      maxOccupiedInSegment = occupied[k];
    }
  }

  return Math.max(0, safeTotal - maxOccupiedInSegment);
}

/**
 * Calcula o preço justo proporcional para o sub-trecho [fromStopOrder, toStopOrder].
 * Prioriza `cumulativePriceCents` definido nos waypoints; caso ausente, aplica razão
 * proporcional de paradas arredondada para múltiplos de R$ 0,10 (10 centavos).
 */
export function computeSegmentProportionalPrice(
  waypoints: CaronaWaypointNode[],
  fromStopOrder: number,
  toStopOrder: number,
  fullRoutePriceCents: number,
): number {
  const safeFullPrice = Math.max(0, Math.round(fullRoutePriceCents));
  if (!waypoints || waypoints.length < 2) {
    return safeFullPrice;
  }

  const sorted = [...waypoints].sort((a, b) => a.stopOrder - b.stopOrder);
  const fromNode = sorted.find((w) => w.stopOrder === fromStopOrder) || sorted[0];
  const toNode =
    sorted.find((w) => w.stopOrder === toStopOrder) || sorted[sorted.length - 1];

  if (
    fromNode.stopOrder === sorted[0].stopOrder &&
    toNode.stopOrder === sorted[sorted.length - 1].stopOrder
  ) {
    return safeFullPrice;
  }

  if (
    typeof toNode.cumulativePriceCents === "number" &&
    typeof fromNode.cumulativePriceCents === "number" &&
    toNode.cumulativePriceCents > fromNode.cumulativePriceCents
  ) {
    return Math.round(toNode.cumulativePriceCents - fromNode.cumulativePriceCents);
  }

  const totalEdges = Math.max(1, sorted.length - 1);
  const segmentEdges = Math.max(1, toNode.stopOrder - fromNode.stopOrder);
  const ratio = Math.min(1, segmentEdges / totalEdges);
  const rawCents = safeFullPrice * ratio;

  return Math.max(100, Math.round(rawCents / 10) * 10);
}

/**
 * Filtra e ranqueia caronas em corredores multi-trecho:
 * - Encontra qualquer carona onde `searchOriginCity` aparece na parada `a` e `searchDestinationCity` na parada `b > a`.
 * - Aplica a regra bilateral "Só Mulheres" (caronas `womenOnly: true` são ocultadas de passageiros homens;
 *   quando `filterWomenOnly: true`, retorna apenas caronas exclusivas para mulheres).
 * - Computa vagas disponíveis no sub-trecho, preço proporcional e timeline de ocupação por perna.
 */
export function matchCaronaCorridors(
  rides: CaronaRideGraphInput[],
  searchOriginCity?: string | null,
  searchDestinationCity?: string | null,
  passengerIsWoman: boolean = true,
  filterWomenOnly: boolean = false,
): MatchedCaronaCorridorDTO[] {
  const originToken = normalizeCityToken(searchOriginCity);
  const destToken = normalizeCityToken(searchDestinationCity);

  const results: MatchedCaronaCorridorDTO[] = [];

  for (const ride of rides || []) {
    if (ride.status === "cancelled") continue;

    // Regra bilateral de segurança "Só Mulheres"
    if (ride.womenOnly && !passengerIsWoman) {
      continue;
    }
    if (filterWomenOnly && !ride.womenOnly) {
      continue;
    }

    // Garante pelo menos 2 nós (origem e destino) se waypoints estiver vazio
    const sortedWaypoints: CaronaWaypointNode[] =
      ride.waypoints && ride.waypoints.length >= 2
        ? [...ride.waypoints].sort((a, b) => a.stopOrder - b.stopOrder)
        : [
            {
              stopOrder: 0,
              cityName: ride.originCity,
              stateCode: ride.originState,
              cumulativePriceCents: 0,
            },
            {
              stopOrder: 1,
              cityName: ride.destinationCity,
              stateCode: ride.destinationState,
              cumulativePriceCents: ride.fullRoutePriceCents,
            },
          ];

    let fromIndex = 0;
    let toIndex = sortedWaypoints.length - 1;

    if (originToken) {
      const foundOriginIdx = sortedWaypoints.findIndex((w) => {
        const token = normalizeCityToken(w.cityName);
        return token === originToken || token.includes(originToken) || originToken.includes(token);
      });
      if (foundOriginIdx === -1 || foundOriginIdx >= sortedWaypoints.length - 1) {
        continue;
      }
      fromIndex = foundOriginIdx;
    }

    if (destToken) {
      const foundDestIdx = sortedWaypoints.findIndex((w, idx) => {
        if (idx <= fromIndex) return false;
        const token = normalizeCityToken(w.cityName);
        return token === destToken || token.includes(destToken) || destToken.includes(token);
      });
      if (foundDestIdx === -1) {
        continue;
      }
      toIndex = foundDestIdx;
    }

    const fromNode = sortedWaypoints[fromIndex];
    const toNode = sortedWaypoints[toIndex];
    const waypointCount = sortedWaypoints.length;

    const availableSeatsForSegment = computeAvailableSeatsForSegment(
      ride.totalSeats,
      waypointCount,
      ride.bookings || [],
      fromNode.stopOrder,
      toNode.stopOrder,
    );

    const segmentPriceCents = computeSegmentProportionalPrice(
      sortedWaypoints,
      fromNode.stopOrder,
      toNode.stopOrder,
      ride.fullRoutePriceCents,
    );

    const occupiedEdges = computeSegmentEdgeOccupancy(waypointCount, ride.bookings || []);
    const legOccupancyTimeline: CaronaLegOccupancyStep[] = [];

    for (let k = 0; k < waypointCount - 1; k++) {
      const wFrom = sortedWaypoints[k];
      const wTo = sortedWaypoints[k + 1];
      const occ = occupiedEdges[k] || 0;
      legOccupancyTimeline.push({
        edgeIndex: k,
        fromStopOrder: wFrom.stopOrder,
        toStopOrder: wTo.stopOrder,
        fromCity: wFrom.cityName,
        toCity: wTo.cityName,
        occupiedSeats: occ,
        availableSeats: Math.max(0, ride.totalSeats - occ),
        isWithinRequestedSegment: k >= fromNode.stopOrder && k < toNode.stopOrder,
      });
    }

    results.push({
      ...ride,
      waypoints: sortedWaypoints,
      matchedFromStopOrder: fromNode.stopOrder,
      matchedToStopOrder: toNode.stopOrder,
      matchedOriginCity: fromNode.cityName,
      matchedDestinationCity: toNode.cityName,
      matchedOriginMeetingPoint: fromNode.meetingPoint || null,
      matchedDestinationMeetingPoint: toNode.meetingPoint || null,
      availableSeatsForSegment,
      segmentPriceCents,
      isPartialSubSegment:
        fromNode.stopOrder > 0 || toNode.stopOrder < sortedWaypoints[sortedWaypoints.length - 1].stopOrder,
      legOccupancyTimeline,
    });
  }

  return results;
}
