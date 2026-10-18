import { describe, expect, it } from "vitest";
import {
  computeAvailableSeatsForSegment,
  computeSegmentProportionalPrice,
  matchCaronaCorridors,
  type CaronaRideGraphInput,
  type CaronaWaypointNode,
} from "../carona-graph-engine";

const SC_CORRIDOR_WAYPOINTS: CaronaWaypointNode[] = [
  { stopOrder: 0, cityName: "Chapecó", stateCode: "SC", cumulativePriceCents: 0 },
  { stopOrder: 1, cityName: "Concórdia", stateCode: "SC", cumulativePriceCents: 3500 },
  { stopOrder: 2, cityName: "Lages", stateCode: "SC", cumulativePriceCents: 11000 },
  { stopOrder: 3, cityName: "São José", stateCode: "SC", cumulativePriceCents: 16500 },
  { stopOrder: 4, cityName: "Florianópolis", stateCode: "SC", cumulativePriceCents: 18000 },
];

describe("carona-graph-engine — Multi-Leg Seat Allocation & Corridor Matching", () => {
  it("releases a seat booked on Chapecó (0) -> Concórdia (1) so it is free on Lages (2) -> São José (3) and São José (3) -> Florianópolis (4)", () => {
    const totalSeats = 1; // Test with 1 seat to prove exact seat reuse across non-overlapping legs
    const waypointCount = SC_CORRIDOR_WAYPOINTS.length;

    // Passenger 1 books Chapecó (0) -> Concórdia (1)
    const bookingsAfterP1 = [
      { fromStopOrder: 0, toStopOrder: 1, seatsBooked: 1, status: "confirmed" as const },
    ];

    // Chapecó (0) -> Concórdia (1) is now full (0 available)
    expect(computeAvailableSeatsForSegment(totalSeats, waypointCount, bookingsAfterP1, 0, 1)).toBe(0);
    // Chapecó (0) -> Florianópolis (4) is also 0 because edge 0->1 is occupied
    expect(computeAvailableSeatsForSegment(totalSeats, waypointCount, bookingsAfterP1, 0, 4)).toBe(0);

    // However, Concórdia (1) -> Lages (2), Lages (2) -> São José (3), and São José (3) -> Florianópolis (4) have 1 seat 100% free!
    expect(computeAvailableSeatsForSegment(totalSeats, waypointCount, bookingsAfterP1, 1, 2)).toBe(1);
    expect(computeAvailableSeatsForSegment(totalSeats, waypointCount, bookingsAfterP1, 2, 3)).toBe(1);
    expect(computeAvailableSeatsForSegment(totalSeats, waypointCount, bookingsAfterP1, 3, 4)).toBe(1);

    // Passenger 2 books Lages (2) -> São José (3) using that exact same physical seat
    const bookingsAfterP2 = [
      ...bookingsAfterP1,
      { fromStopOrder: 2, toStopOrder: 3, seatsBooked: 1, status: "confirmed" as const },
    ];

    // Lages (2) -> São José (3) is now occupied, but São José (3) -> Florianópolis (4) is still free for Passenger 3!
    expect(computeAvailableSeatsForSegment(totalSeats, waypointCount, bookingsAfterP2, 2, 3)).toBe(0);
    expect(computeAvailableSeatsForSegment(totalSeats, waypointCount, bookingsAfterP2, 3, 4)).toBe(1);
    // And Concórdia (1) -> Lages (2) is also still free!
    expect(computeAvailableSeatsForSegment(totalSeats, waypointCount, bookingsAfterP2, 1, 2)).toBe(1);
  });

  it("computes proportional segment prices accurately from cumulative waypoint prices or stop ratios", () => {
    // Full route Chapecó (0) -> Florianópolis (4) = R$ 180,00 (18000 cents)
    expect(computeSegmentProportionalPrice(SC_CORRIDOR_WAYPOINTS, 0, 4, 18000)).toBe(18000);

    // Chapecó (0) -> Concórdia (1) = R$ 35,00 (3500 cents)
    expect(computeSegmentProportionalPrice(SC_CORRIDOR_WAYPOINTS, 0, 1, 18000)).toBe(3500);

    // Lages (2) -> São José (3) = 16500 - 11000 = R$ 55,00 (5500 cents)
    expect(computeSegmentProportionalPrice(SC_CORRIDOR_WAYPOINTS, 2, 3, 18000)).toBe(5500);

    // Concórdia (1) -> Florianópolis (4) = 18000 - 3500 = R$ 145,00 (14500 cents)
    expect(computeSegmentProportionalPrice(SC_CORRIDOR_WAYPOINTS, 1, 4, 18000)).toBe(14500);
  });

  it("matches intermediate sub-corridors and enforces bilateral Women-Only visibility rules", () => {
    const sampleRides: CaronaRideGraphInput[] = [
      {
        id: "ride-mixed",
        driverId: "driver-1",
        driverName: "Carlos Andrade",
        driverRating: 4.9,
        originCity: "Chapecó",
        originState: "SC",
        destinationCity: "Florianópolis",
        destinationState: "SC",
        departureAt: "2026-10-20T07:00:00Z",
        totalSeats: 4,
        fullRoutePriceCents: 18000,
        womenOnly: false,
        allowPriceNegotiation: true,
        vehicleModel: "Toyota Corolla Prata",
        luggageSize: "medium",
        status: "published",
        waypoints: SC_CORRIDOR_WAYPOINTS,
        bookings: [
          { fromStopOrder: 0, toStopOrder: 1, seatsBooked: 3, status: "confirmed" },
        ],
      },
      {
        id: "ride-women-only",
        driverId: "driver-2",
        driverName: "Mariana Costa",
        driverRating: 5.0,
        originCity: "Chapecó",
        originState: "SC",
        destinationCity: "Florianópolis",
        destinationState: "SC",
        departureAt: "2026-10-20T08:30:00Z",
        totalSeats: 3,
        fullRoutePriceCents: 18000,
        womenOnly: true,
        allowPriceNegotiation: true,
        vehicleModel: "Jeep Compass Branco",
        luggageSize: "large",
        status: "published",
        waypoints: SC_CORRIDOR_WAYPOINTS,
        bookings: [],
      },
    ];

    // 1. Male passenger searching Lages -> São José cannot see the womenOnly ride
    const maleMatches = matchCaronaCorridors(sampleRides, "Lages", "São José", false, false);
    expect(maleMatches).toHaveLength(1);
    expect(maleMatches[0].id).toBe("ride-mixed");
    expect(maleMatches[0].matchedFromStopOrder).toBe(2);
    expect(maleMatches[0].matchedToStopOrder).toBe(3);
    // Even though 3 seats were booked on Chapecó -> Concórdia (0->1), all 4 seats are available on Lages -> São José (2->3)!
    expect(maleMatches[0].availableSeatsForSegment).toBe(4);
    expect(maleMatches[0].segmentPriceCents).toBe(5500);

    // 2. Female passenger searching Lages -> São José with filterWomenOnly = true sees only the womenOnly ride
    const femaleOnlyMatches = matchCaronaCorridors(sampleRides, "Lages", "São José", true, true);
    expect(femaleOnlyMatches).toHaveLength(1);
    expect(femaleOnlyMatches[0].id).toBe("ride-women-only");
    expect(femaleOnlyMatches[0].availableSeatsForSegment).toBe(3);
  });
});
