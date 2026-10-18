/**
 * carona.functions.ts — BFF para Caronas Intermunicipais Multi-Trecho (BlaBlaCar Style)
 * e Passagens Rodoviárias Intermunicipais (Reunidas, Planalto, Unesul, Ouro e Prata).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import {
  computeAvailableSeatsForSegment,
  computeSegmentProportionalPrice,
  matchCaronaCorridors,
  normalizeCityToken,
  type CaronaRideGraphInput,
  type CaronaSegmentBookingEdge,
  type CaronaWaypointNode,
  type MatchedCaronaCorridorDTO,
} from "@/lib/mobility/carona-graph-engine";

// ============================================================
// Seed Resiliente para Corredores de SC (Testabilidade Imediata)
// ============================================================

const DEFAULT_CARONA_CORRIDORS: CaronaRideGraphInput[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    driverId: "00000000-0000-4000-8000-000000000901",
    driverName: "Rafael Becker",
    driverAvatarUrl: null,
    driverRating: 4.95,
    originCity: "Chapecó",
    originState: "SC",
    destinationCity: "Florianópolis",
    destinationState: "SC",
    departureAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    totalSeats: 4,
    fullRoutePriceCents: 18000,
    womenOnly: false,
    allowPriceNegotiation: true,
    vehicleModel: "Toyota Corolla XEi Prata",
    vehicleColor: "Prata",
    vehiclePlate: "QJX-4E21",
    vehiclePhotoUrl: null,
    luggageSize: "medium",
    notes: "Saída pontual próximo ao Terminal Urbano. Paradas rápidas na BR-282.",
    status: "published",
    waypoints: [
      {
        stopOrder: 0,
        cityName: "Chapecó",
        stateCode: "SC",
        meetingPoint: "Praça Coronel Bertaso / Centro",
        cumulativePriceCents: 0,
      },
      {
        stopOrder: 1,
        cityName: "Concórdia",
        stateCode: "SC",
        meetingPoint: "Posto Trevão BR-153",
        cumulativePriceCents: 3500,
      },
      {
        stopOrder: 2,
        cityName: "Lages",
        stateCode: "SC",
        meetingPoint: "Acesso Principal BR-282 / Coral",
        cumulativePriceCents: 11000,
      },
      {
        stopOrder: 3,
        cityName: "São José",
        stateCode: "SC",
        meetingPoint: "Shopping Itaguaçu / BR-101",
        cumulativePriceCents: 16500,
      },
      {
        stopOrder: 4,
        cityName: "Florianópolis",
        stateCode: "SC",
        meetingPoint: "Terminal Rita Maria — Centro",
        cumulativePriceCents: 18000,
      },
    ],
    bookings: [
      {
        id: "seed-booking-1",
        fromStopOrder: 0,
        toStopOrder: 1,
        fromCity: "Chapecó",
        toCity: "Concórdia",
        seatsBooked: 2,
        status: "confirmed",
        passengerName: "Lucas M.",
      },
      {
        id: "seed-booking-2",
        fromStopOrder: 2,
        toStopOrder: 3,
        fromCity: "Lages",
        toCity: "São José",
        seatsBooked: 1,
        status: "confirmed",
        passengerName: "Fernanda T.",
      },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    driverId: "00000000-0000-4000-8000-000000000902",
    driverName: "Camila Dalmolin",
    driverAvatarUrl: null,
    driverRating: 5.0,
    originCity: "Chapecó",
    originState: "SC",
    destinationCity: "Florianópolis",
    destinationState: "SC",
    departureAt: new Date(Date.now() + 9 * 3600 * 1000).toISOString(),
    totalSeats: 3,
    fullRoutePriceCents: 18500,
    womenOnly: true,
    allowPriceNegotiation: true,
    vehicleModel: "Jeep Compass Longitude Branco",
    vehicleColor: "Branco",
    vehiclePlate: "RLK-8A90",
    vehiclePhotoUrl: null,
    luggageSize: "large",
    notes: "Viagem tranquila exclusiva para passageiras mulheres. Ar-condicionado e Wi-Fi a bordo.",
    status: "published",
    waypoints: [
      {
        stopOrder: 0,
        cityName: "Chapecó",
        stateCode: "SC",
        meetingPoint: "Shopping Pátio Chapecó",
        cumulativePriceCents: 0,
      },
      {
        stopOrder: 1,
        cityName: "Concórdia",
        stateCode: "SC",
        meetingPoint: "Rodoviária de Concórdia",
        cumulativePriceCents: 3800,
      },
      {
        stopOrder: 2,
        cityName: "Lages",
        stateCode: "SC",
        meetingPoint: "Lages Garden Shopping",
        cumulativePriceCents: 11500,
      },
      {
        stopOrder: 3,
        cityName: "São José",
        stateCode: "SC",
        meetingPoint: "Kobrasol — Av. Central",
        cumulativePriceCents: 17000,
      },
      {
        stopOrder: 4,
        cityName: "Florianópolis",
        stateCode: "SC",
        meetingPoint: "UFSC — Trindade",
        cumulativePriceCents: 18500,
      },
    ],
    bookings: [
      {
        id: "seed-booking-3",
        fromStopOrder: 0,
        toStopOrder: 2,
        fromCity: "Chapecó",
        toCity: "Lages",
        seatsBooked: 1,
        status: "confirmed",
        passengerName: "Juliana S.",
      },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    driverId: "00000000-0000-4000-8000-000000000903",
    driverName: "Eduardo Zanetti",
    driverAvatarUrl: null,
    driverRating: 4.88,
    originCity: "São Miguel do Oeste",
    originState: "SC",
    destinationCity: "Chapecó",
    destinationState: "SC",
    departureAt: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    totalSeats: 4,
    fullRoutePriceCents: 5000,
    womenOnly: false,
    allowPriceNegotiation: true,
    vehicleModel: "Volkswagen Nivus Highline Cinza",
    vehicleColor: "Cinza",
    vehiclePlate: "MKR-2C19",
    vehiclePhotoUrl: null,
    luggageSize: "medium",
    notes: "Rota diária pela BR-282 passando por Maravilha e Pinhalzinho.",
    status: "published",
    waypoints: [
      {
        stopOrder: 0,
        cityName: "São Miguel do Oeste",
        stateCode: "SC",
        meetingPoint: "Praça Walnir Bottaro Daniel",
        cumulativePriceCents: 0,
      },
      {
        stopOrder: 1,
        cityName: "Maravilha",
        stateCode: "SC",
        meetingPoint: "Trevo Principal BR-282",
        cumulativePriceCents: 2200,
      },
      {
        stopOrder: 2,
        cityName: "Pinhalzinho",
        stateCode: "SC",
        meetingPoint: "Acesso Av. Brasília",
        cumulativePriceCents: 3400,
      },
      {
        stopOrder: 3,
        cityName: "Chapecó",
        stateCode: "SC",
        meetingPoint: "Av. Getúlio Vargas — Centro",
        cumulativePriceCents: 5000,
      },
    ],
    bookings: [
      {
        id: "seed-booking-4",
        fromStopOrder: 0,
        toStopOrder: 1,
        fromCity: "São Miguel do Oeste",
        toCity: "Maravilha",
        seatsBooked: 2,
        status: "confirmed",
        passengerName: "Marcos V.",
      },
    ],
  },
];

export interface IntercityBusStopDTO {
  city: string;
  time: string;
  price_cents: number;
}

export interface IntercityBusScheduleDTO {
  id: string;
  operator_name: string;
  operator_slug: string;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  service_class: "Convencional" | "Executivo" | "Semi-Leito" | "Leito Total" | string;
  price_cents: number;
  total_seats: number;
  intermediate_stops: IntercityBusStopDTO[];
  matched_boarding_city: string;
  matched_alighting_city: string;
  matched_departure_time: string;
  matched_price_cents: number;
  occupied_seats: number[];
}

const DEFAULT_BUS_SCHEDULES: Omit<
  IntercityBusScheduleDTO,
  "matched_boarding_city" | "matched_alighting_city" | "matched_departure_time" | "matched_price_cents" | "occupied_seats"
>[] = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    operator_name: "Reunidas",
    operator_slug: "reunidas",
    origin_city: "São Miguel do Oeste",
    origin_state: "SC",
    destination_city: "Chapecó",
    destination_state: "SC",
    departure_time: "07:00",
    arrival_time: "09:30",
    duration_minutes: 150,
    service_class: "Executivo",
    price_cents: 6490,
    total_seats: 42,
    intermediate_stops: [
      { city: "Maravilha", time: "08:05", price_cents: 2990 },
      { city: "Pinhalzinho", time: "08:35", price_cents: 4290 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    operator_name: "Reunidas",
    operator_slug: "reunidas",
    origin_city: "Chapecó",
    origin_state: "SC",
    destination_city: "Florianópolis",
    destination_state: "SC",
    departure_time: "08:00",
    arrival_time: "17:30",
    duration_minutes: 570,
    service_class: "Semi-Leito",
    price_cents: 21990,
    total_seats: 42,
    intermediate_stops: [
      { city: "Concórdia", time: "09:40", price_cents: 4800 },
      { city: "Joaçaba", time: "11:10", price_cents: 8500 },
      { city: "Lages", time: "14:15", price_cents: 14900 },
      { city: "São José", time: "17:10", price_cents: 20900 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    operator_name: "Planalto",
    operator_slug: "planalto",
    origin_city: "Chapecó",
    origin_state: "SC",
    destination_city: "Porto Alegre",
    destination_state: "RS",
    departure_time: "21:30",
    arrival_time: "05:00",
    duration_minutes: 450,
    service_class: "Leito Total",
    price_cents: 18990,
    total_seats: 36,
    intermediate_stops: [
      { city: "Iraí", time: "22:50", price_cents: 4500 },
      { city: "Carazinho", time: "00:45", price_cents: 9800 },
      { city: "Lajeado", time: "03:15", price_cents: 15500 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000204",
    operator_name: "Unesul",
    operator_slug: "unesul",
    origin_city: "São Miguel do Oeste",
    origin_state: "SC",
    destination_city: "Florianópolis",
    destination_state: "SC",
    departure_time: "19:00",
    arrival_time: "06:30",
    duration_minutes: 690,
    service_class: "Semi-Leito",
    price_cents: 25990,
    total_seats: 42,
    intermediate_stops: [
      { city: "Maravilha", time: "20:05", price_cents: 3200 },
      { city: "Chapecó", time: "21:40", price_cents: 6500 },
      { city: "Concórdia", time: "23:15", price_cents: 10900 },
      { city: "Lages", time: "02:45", price_cents: 18500 },
      { city: "São José", time: "06:05", price_cents: 24900 },
    ],
  },
];

// ============================================================
// 1. LISTAR CARONAS MULTI-TRECHO (MATCHING DE GRAFO BLABLACAR)
// ============================================================

export const listMatchingCaronas = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        originCity: z.string().optional(),
        destinationCity: z.string().optional(),
        passengerIsWoman: z.boolean().default(true).optional(),
        filterWomenOnly: z.boolean().default(false).optional(),
      })
      .optional(),
  )
  .handler(async ({ data }): Promise<MatchedCaronaCorridorDTO[]> => {
    const {
      originCity = "",
      destinationCity = "",
      passengerIsWoman = true,
      filterWomenOnly = false,
    } = data || {};

    const db = getServerClient();

    const { data: dbRides, error: ridesError } = await db
      .from("carona_rides")
      .select("*")
      .eq("status", "published")
      .order("departure_at", { ascending: true })
      .limit(50);

    let graphInputs: CaronaRideGraphInput[] = [];

    if (!ridesError && dbRides && dbRides.length > 0) {
      const rideIds = dbRides.map((r: any) => r.id);
      const [{ data: waypointsRows }, { data: bookingsRows }] = await Promise.all([
        db
          .from("carona_waypoints")
          .select("*")
          .in("ride_id", rideIds)
          .order("stop_order", { ascending: true }),
        db
          .from("carona_segment_bookings")
          .select("*")
          .in("ride_id", rideIds)
          .neq("status", "cancelled"),
      ]);

      const wpByRide = new Map<string, CaronaWaypointNode[]>();
      for (const wp of waypointsRows || []) {
        const list = wpByRide.get(wp.ride_id) || [];
        list.push({
          stopOrder: Number(wp.stop_order),
          cityName: wp.city_name,
          stateCode: wp.state_code || "SC",
          meetingPoint: wp.meeting_point || null,
          latitude: wp.latitude != null ? Number(wp.latitude) : null,
          longitude: wp.longitude != null ? Number(wp.longitude) : null,
          estimatedArrivalAt: wp.estimated_arrival_at || null,
          cumulativePriceCents: Number(wp.cumulative_price_cents || 0),
        });
        wpByRide.set(wp.ride_id, list);
      }

      const bkByRide = new Map<string, CaronaSegmentBookingEdge[]>();
      for (const bk of bookingsRows || []) {
        const list = bkByRide.get(bk.ride_id) || [];
        list.push({
          id: bk.id,
          fromStopOrder: Number(bk.from_stop_order),
          toStopOrder: Number(bk.to_stop_order),
          seatsBooked: Number(bk.seats_booked || 1),
          status: bk.status,
          passengerName: bk.passenger_name,
          fromCity: bk.from_city,
          toCity: bk.to_city,
        });
        bkByRide.set(bk.ride_id, list);
      }

      graphInputs = dbRides.map((r: any) => {
        const dbWaypoints = wpByRide.get(r.id);
        const fallbackJsonWaypoints = Array.isArray(r.waypoints)
          ? r.waypoints.map((w: any, idx: number) => ({
              stopOrder: typeof w.stopOrder === "number" ? w.stopOrder : idx,
              cityName: w.cityName || w.city_name || "",
              stateCode: w.stateCode || w.state_code || r.origin_state || "SC",
              meetingPoint: w.meetingPoint || w.meeting_point || null,
              cumulativePriceCents: Number(w.cumulativePriceCents ?? w.cumulative_price_cents ?? 0),
            }))
          : [];

        return {
          id: r.id,
          driverId: r.driver_id,
          driverName: r.driver_name,
          driverAvatarUrl: r.driver_avatar_url || null,
          driverRating: Number(r.driver_rating || 5),
          originCity: r.origin_city,
          originState: r.origin_state || "SC",
          destinationCity: r.destination_city,
          destinationState: r.destination_state || "SC",
          departureAt: r.departure_at,
          totalSeats: Number(r.total_seats || 4),
          fullRoutePriceCents: Number(r.full_route_price_cents || 0),
          womenOnly: Boolean(r.women_only),
          allowPriceNegotiation: Boolean(r.allow_price_negotiation),
          vehicleModel: r.vehicle_model,
          vehicleColor: r.vehicle_color || null,
          vehiclePlate: r.vehicle_plate || null,
          vehiclePhotoUrl: r.vehicle_photo_url || null,
          luggageSize: (r.luggage_size || "medium") as "small" | "medium" | "large",
          notes: r.notes || null,
          status: r.status || "published",
          waypoints:
            dbWaypoints && dbWaypoints.length >= 2 ? dbWaypoints : fallbackJsonWaypoints,
          bookings: bkByRide.get(r.id) || [],
        };
      });
    }

    // Mescla com os corredores de referência de SC para garantir demonstrabilidade imediata
    const existingIds = new Set(graphInputs.map((g) => g.id));
    for (const seedRide of DEFAULT_CARONA_CORRIDORS) {
      if (!existingIds.has(seedRide.id)) {
        graphInputs.push(seedRide);
      }
    }

    return matchCaronaCorridors(
      graphInputs,
      originCity,
      destinationCity,
      passengerIsWoman,
      filterWomenOnly,
    );
  });

// ============================================================
// 2. PUBLICAR NOVA CARONA COM PARADAS INTERMEDIÁRIAS
// ============================================================

const waypointInputSchema = z.object({
  stopOrder: z.number().int().min(0),
  cityName: z.string().min(2),
  stateCode: z.string().default("SC"),
  meetingPoint: z.string().optional().nullable(),
  cumulativePriceCents: z.number().int().min(0).default(0),
});

export const publishCaronaRide = createServerFn({ method: "POST" })
  .validator(
    z.object({
      originCity: z.string().min(2),
      originState: z.string().default("SC"),
      destinationCity: z.string().min(2),
      destinationState: z.string().default("SC"),
      departureAt: z.string().min(4),
      totalSeats: z.number().int().min(1).max(8).default(4),
      fullRoutePriceCents: z.number().int().min(100),
      womenOnly: z.boolean().default(false),
      allowPriceNegotiation: z.boolean().default(true),
      vehicleModel: z.string().min(2),
      vehicleColor: z.string().optional().nullable(),
      vehiclePlate: z.string().optional().nullable(),
      vehiclePhotoUrl: z.string().optional().nullable(),
      luggageSize: z.enum(["small", "medium", "large"]).default("medium"),
      notes: z.string().optional().nullable(),
      waypoints: z.array(waypointInputSchema).min(2),
    }),
  )
  .handler(async ({ data }) => {
    const {
      originCity,
      originState = "SC",
      destinationCity,
      destinationState = "SC",
      departureAt,
      totalSeats = 4,
      fullRoutePriceCents,
      womenOnly = false,
      allowPriceNegotiation = true,
      vehicleModel,
      vehicleColor = null,
      vehiclePlate = null,
      vehiclePhotoUrl = null,
      luggageSize = "medium",
      notes = null,
      waypoints,
    } = data;

    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Faça login para publicar uma carona.");
    }

    const db = getServerClient();

    const { data: userProfile } = await db
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", identity.id)
      .maybeSingle();

    const sortedWaypoints = [...waypoints].sort((a, b) => a.stopOrder - b.stopOrder);

    const { data: createdRide, error: rideError } = await db
      .from("carona_rides")
      .insert({
        driver_id: identity.id,
        driver_name: userProfile?.full_name || identity.email?.split("@")[0] || "Condutor Waesy",
        driver_avatar_url: userProfile?.avatar_url || null,
        driver_rating: 5.0,
        origin_city: originCity,
        origin_state: originState,
        destination_city: destinationCity,
        destination_state: destinationState,
        departure_at: new Date(departureAt).toISOString(),
        total_seats: totalSeats,
        full_route_price_cents: fullRoutePriceCents,
        women_only: womenOnly,
        allow_price_negotiation: allowPriceNegotiation,
        vehicle_model: vehicleModel,
        vehicle_color: vehicleColor,
        vehicle_plate: vehiclePlate,
        vehicle_photo_url: vehiclePhotoUrl,
        luggage_size: luggageSize,
        notes,
        status: "published",
        waypoints: sortedWaypoints,
      })
      .select()
      .single();

    if (rideError || !createdRide) {
      throw new Error(`Erro ao publicar carona: ${rideError?.message || "Falha no banco"}`);
    }

    const waypointPayloads = sortedWaypoints.map((wp, idx) => ({
      ride_id: createdRide.id,
      stop_order: idx,
      city_name: wp.cityName,
      state_code: wp.stateCode || originState,
      meeting_point: wp.meetingPoint || null,
      cumulative_price_cents:
        idx === 0
          ? 0
          : idx === sortedWaypoints.length - 1
            ? fullRoutePriceCents
            : wp.cumulativePriceCents ||
              Math.round((fullRoutePriceCents * idx) / (sortedWaypoints.length - 1)),
    }));

    await db.from("carona_waypoints").insert(waypointPayloads);

    return {
      success: true,
      ride: createdRide,
    };
  });

// ============================================================
// 3. RESERVAR SUB-TRECHO DE CARONA & GERAR PIN DE EMBARQUE
// ============================================================

export const bookCaronaSegment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      rideId: z.string().min(1),
      fromStopOrder: z.number().int().min(0),
      toStopOrder: z.number().int().min(1),
      fromCity: z.string().min(2),
      toCity: z.string().min(2),
      seatsBooked: z.number().int().min(1).max(6).default(1),
      proposedPriceCents: z.number().int().min(100).optional(),
      initialMessage: z.string().max(400).optional(),
      passengerName: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const {
      rideId,
      fromStopOrder,
      toStopOrder,
      fromCity,
      toCity,
      seatsBooked = 1,
      proposedPriceCents,
      initialMessage,
      passengerName,
    } = data;

    if (toStopOrder <= fromStopOrder) {
      throw new Error("A parada de desembarque deve ser posterior à parada de embarque.");
    }

    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Autenticação necessária para reservar vaga na carona.");
    }

    const db = getServerClient();

    // Verifica se é uma carona do banco ou uma carona de demonstração (seed)
    const { data: dbRide } = await db
      .from("carona_rides")
      .select("*")
      .eq("id", rideId)
      .maybeSingle();

    const seedRide = DEFAULT_CARONA_CORRIDORS.find((r) => r.id === rideId);
    const targetRide = dbRide || seedRide;

    if (!targetRide) {
      throw new Error("Carona não encontrada.");
    }

    const totalSeats = Number((targetRide as any).total_seats ?? (targetRide as any).totalSeats ?? 4);
    const fullPriceCents = Number(
      (targetRide as any).full_route_price_cents ?? (targetRide as any).fullRoutePriceCents ?? 5000,
    );

    let waypoints: CaronaWaypointNode[] = [];
    let existingBookings: CaronaSegmentBookingEdge[] = [];

    if (dbRide) {
      const [{ data: wpRows }, { data: bkRows }] = await Promise.all([
        db
          .from("carona_waypoints")
          .select("*")
          .eq("ride_id", rideId)
          .order("stop_order", { ascending: true }),
        db
          .from("carona_segment_bookings")
          .select("*")
          .eq("ride_id", rideId)
          .neq("status", "cancelled"),
      ]);

      waypoints = (wpRows || []).map((w: any) => ({
        stopOrder: Number(w.stop_order),
        cityName: w.city_name,
        stateCode: w.state_code || "SC",
        cumulativePriceCents: Number(w.cumulative_price_cents || 0),
      }));

      existingBookings = (bkRows || []).map((b: any) => ({
        fromStopOrder: Number(b.from_stop_order),
        toStopOrder: Number(b.to_stop_order),
        seatsBooked: Number(b.seats_booked || 1),
        status: b.status,
      }));
    } else if (seedRide) {
      waypoints = seedRide.waypoints;
      existingBookings = seedRide.bookings;
    }

    const waypointCount = Math.max(waypoints.length, toStopOrder + 1);
    const availableSeats = computeAvailableSeatsForSegment(
      totalSeats,
      waypointCount,
      existingBookings,
      fromStopOrder,
      toStopOrder,
    );

    if (availableSeats < seatsBooked) {
      throw new Error(
        `Apenas ${availableSeats} vaga(s) disponível(is) no trecho ${fromCity} -> ${toCity}.`,
      );
    }

    const unitSegmentPriceCents = computeSegmentProportionalPrice(
      waypoints,
      fromStopOrder,
      toStopOrder,
      fullPriceCents,
    );
    const originalTotalCents = unitSegmentPriceCents * seatsBooked;
    const isNegotiation =
      typeof proposedPriceCents === "number" && proposedPriceCents !== originalTotalCents;
    const agreedCents = isNegotiation ? proposedPriceCents : originalTotalCents;

    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const boardingPin = (1000 + (randomBuffer[0] % 9000)).toString();

    const { data: userProfile } = await db
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", identity.id)
      .maybeSingle();

    const resolvedName =
      passengerName?.trim() ||
      userProfile?.full_name ||
      identity.email?.split("@")[0] ||
      "Passageiro Waesy";

    const chatMessages = initialMessage?.trim()
      ? [
          {
            id: crypto.randomUUID(),
            sender_id: identity.id,
            sender_name: resolvedName,
            text: initialMessage.trim(),
            proposed_price_cents: proposedPriceCents || null,
            created_at: new Date().toISOString(),
          },
        ]
      : [];

    if (dbRide) {
      const { data: bookingRow, error: bookingError } = await db
        .from("carona_segment_bookings")
        .insert({
          ride_id: rideId,
          passenger_id: identity.id,
          passenger_name: resolvedName,
          passenger_avatar_url: userProfile?.avatar_url || null,
          from_stop_order: fromStopOrder,
          to_stop_order: toStopOrder,
          from_city: fromCity,
          to_city: toCity,
          seats_booked: seatsBooked,
          original_price_cents: originalTotalCents,
          proposed_price_cents: proposedPriceCents || null,
          agreed_price_cents: agreedCents,
          status: isNegotiation ? "pending_negotiation" : "confirmed",
          boarding_pin: boardingPin,
          chat_messages: chatMessages,
        })
        .select()
        .single();

      if (bookingError) {
        throw new Error(`Erro ao registrar reserva de trecho: ${bookingError.message}`);
      }

      return {
        success: true,
        booking: bookingRow,
        boardingPin,
        remainingSeatsOnSegment: availableSeats - seatsBooked,
      };
    }

    // Fallback se a carona for de seed e ainda não persistida na tabela
    return {
      success: true,
      booking: {
        id: crypto.randomUUID(),
        ride_id: rideId,
        passenger_id: identity.id,
        passenger_name: resolvedName,
        from_stop_order: fromStopOrder,
        to_stop_order: toStopOrder,
        from_city: fromCity,
        to_city: toCity,
        seats_booked: seatsBooked,
        original_price_cents: originalTotalCents,
        proposed_price_cents: proposedPriceCents || null,
        agreed_price_cents: agreedCents,
        status: isNegotiation ? "pending_negotiation" : "confirmed",
        boarding_pin: boardingPin,
        chat_messages: chatMessages,
        created_at: new Date().toISOString(),
      },
      boardingPin,
      remainingSeatsOnSegment: availableSeats - seatsBooked,
    };
  });

// ============================================================
// 4. CHAT E NEGOCIAÇÃO DE VALOR DA CARONA
// ============================================================

export const sendCaronaChatMessage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      bookingId: z.string().uuid(),
      message: z.string().min(1).max(500),
      proposedPriceCents: z.number().int().min(100).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { bookingId, message, proposedPriceCents } = data;
    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Acesso não autorizado.");
    }

    const db = getServerClient();
    const { data: booking } = await db
      .from("carona_segment_bookings")
      .select("id, chat_messages, agreed_price_cents, status")
      .eq("id", bookingId)
      .maybeSingle();

    const newMsg = {
      id: crypto.randomUUID(),
      sender_id: identity.id,
      text: message.trim(),
      proposed_price_cents: proposedPriceCents || null,
      created_at: new Date().toISOString(),
    };

    if (!booking) {
      return { success: true, message: newMsg };
    }

    const currentMessages = Array.isArray(booking.chat_messages) ? booking.chat_messages : [];
    const updatedMessages = [...currentMessages, newMsg];

    const patch: Record<string, any> = {
      chat_messages: updatedMessages,
    };
    if (typeof proposedPriceCents === "number") {
      patch.proposed_price_cents = proposedPriceCents;
      patch.agreed_price_cents = proposedPriceCents;
    }

    const { data: updated, error } = await db
      .from("carona_segment_bookings")
      .update(patch)
      .eq("id", bookingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao enviar mensagem: ${error.message}`);
    }

    return { success: true, booking: updated, message: newMsg };
  });

// ============================================================
// 5. LISTAR HORÁRIOS DE ÔNIBUS INTERMUNICIPAIS (REUNIDAS, PLANALTO, UNESUL)
// ============================================================

export const listIntercityBusSchedules = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        originCity: z.string().optional(),
        destinationCity: z.string().optional(),
        travelDate: z.string().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }): Promise<IntercityBusScheduleDTO[]> => {
    const {
      originCity = "",
      destinationCity = "",
      travelDate = new Date().toISOString().slice(0, 10),
    } = data || {};

    const db = getServerClient();
    const { data: rows } = await db
      .from("bus_routes_schedules")
      .select("*")
      .eq("is_active", true)
      .order("departure_time", { ascending: true });

    const rawSchedules =
      rows && rows.length > 0
        ? rows.map((r: any) => ({
            id: r.id,
            operator_name: r.operator_name,
            operator_slug: r.operator_slug,
            origin_city: r.origin_city,
            origin_state: r.origin_state || "SC",
            destination_city: r.destination_city,
            destination_state: r.destination_state || "SC",
            departure_time: r.departure_time,
            arrival_time: r.arrival_time,
            duration_minutes: Number(r.duration_minutes || 240),
            service_class: r.service_class || "Executivo",
            price_cents: Number(r.price_cents || 5000),
            total_seats: Number(r.total_seats || 42),
            intermediate_stops: Array.isArray(r.intermediate_stops) ? r.intermediate_stops : [],
          }))
        : DEFAULT_BUS_SCHEDULES;

    // Consulta poltronas já reservadas na data selecionada
    const scheduleIds = rawSchedules.map((s) => s.id);
    const { data: bookedRows } = await db
      .from("bus_ticket_bookings")
      .select("schedule_id, seat_number")
      .in("schedule_id", scheduleIds)
      .eq("travel_date", travelDate)
      .neq("status", "cancelled");

    const occupiedBySchedule = new Map<string, number[]>();
    for (const b of bookedRows || []) {
      const list = occupiedBySchedule.get(b.schedule_id) || [];
      list.push(Number(b.seat_number));
      occupiedBySchedule.set(b.schedule_id, list);
    }

    const originNorm = normalizeCityToken(originCity);
    const destNorm = normalizeCityToken(destinationCity);

    const matched: IntercityBusScheduleDTO[] = [];

    for (const sched of rawSchedules) {
      const stopsChain: Array<{ city: string; time: string; cumulativePriceCents: number }> = [
        { city: sched.origin_city, time: sched.departure_time, cumulativePriceCents: 0 },
        ...(sched.intermediate_stops || []).map((st: IntercityBusStopDTO) => ({
          city: st.city,
          time: st.time,
          cumulativePriceCents: Number(st.price_cents || 0),
        })),
        {
          city: sched.destination_city,
          time: sched.arrival_time,
          cumulativePriceCents: sched.price_cents,
        },
      ];

      let fromIdx = 0;
      let toIdx = stopsChain.length - 1;

      if (originNorm) {
        const foundFrom = stopsChain.findIndex((s) => {
          const tok = normalizeCityToken(s.city);
          return tok === originNorm || tok.includes(originNorm) || originNorm.includes(tok);
        });
        if (foundFrom === -1 || foundFrom >= stopsChain.length - 1) continue;
        fromIdx = foundFrom;
      }

      if (destNorm) {
        const foundTo = stopsChain.findIndex((s, idx) => {
          if (idx <= fromIdx) return false;
          const tok = normalizeCityToken(s.city);
          return tok === destNorm || tok.includes(destNorm) || destNorm.includes(tok);
        });
        if (foundTo === -1) continue;
        toIdx = foundTo;
      }

      const boardingStop = stopsChain[fromIdx];
      const alightingStop = stopsChain[toIdx];
      const computedPriceCents = Math.max(
        1500,
        alightingStop.cumulativePriceCents - boardingStop.cumulativePriceCents,
      );

      matched.push({
        ...sched,
        matched_boarding_city: boardingStop.city,
        matched_alighting_city: alightingStop.city,
        matched_departure_time: boardingStop.time,
        matched_price_cents: computedPriceCents,
        occupied_seats: occupiedBySchedule.get(sched.id) || [3, 4, 11, 12],
      });
    }

    return matched;
  });

// ============================================================
// 6. RESERVAR PASSAGEM DE ÔNIBUS & EMITIR BILHETE CRIPTOGRAFADO (HMAC-SHA256)
// ============================================================

export const bookIntercityBusTicket = createServerFn({ method: "POST" })
  .validator(
    z.object({
      scheduleId: z.string().min(1),
      passengerName: z.string().min(2),
      passengerDocument: z.string().min(5),
      travelDate: z.string().min(8),
      seatNumber: z.number().int().min(1).max(60),
      boardingCity: z.string().min(2),
      alightingCity: z.string().min(2),
      pricePaidCents: z.number().int().min(500),
    }),
  )
  .handler(async ({ data }) => {
    const {
      scheduleId,
      passengerName,
      passengerDocument,
      travelDate,
      seatNumber,
      boardingCity,
      alightingCity,
      pricePaidCents,
    } = data;

    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Faça login para emitir sua passagem rodoviária.");
    }

    const db = getServerClient();
    const issuedAt = new Date().toISOString();
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "waesy-bus-hmac-secret-key-2026";

    const rawTicketData = `${scheduleId}|${identity.id}|${travelDate}|${seatNumber}|${boardingCity}|${alightingCity}|${issuedAt}`;
    const signature = crypto
      .createHmac("sha256", secret)
      .update(rawTicketData)
      .digest("hex")
      .slice(0, 24)
      .toUpperCase();

    const qrCodePayload = `WAESY-BUS|${scheduleId.slice(0, 8)}|POLTRONA-${seatNumber}|${travelDate}|SIG-${signature}`;

    const { data: inserted, error } = await db
      .from("bus_ticket_bookings")
      .insert({
        schedule_id: scheduleId,
        passenger_id: identity.id,
        passenger_name: passengerName.trim(),
        passenger_document: passengerDocument.trim(),
        travel_date: travelDate,
        seat_number: seatNumber,
        boarding_city: boardingCity,
        alighting_city: alightingCity,
        price_paid_cents: pricePaidCents,
        qr_code_payload: qrCodePayload,
        ticket_signature: signature,
        status: "issued",
      })
      .select("*, bus_routes_schedules(*)")
      .maybeSingle();

    if (error) {
      // Se o scheduleId for de demonstração e não existir na tabela física ainda, retorna o bilhete assinado em memória
      const fallbackSched = DEFAULT_BUS_SCHEDULES.find((s) => s.id === scheduleId);
      if (fallbackSched) {
        return {
          success: true,
          ticket: {
            id: crypto.randomUUID(),
            schedule_id: scheduleId,
            passenger_id: identity.id,
            passenger_name: passengerName.trim(),
            passenger_document: passengerDocument.trim(),
            travel_date: travelDate,
            seat_number: seatNumber,
            boarding_city: boardingCity,
            alighting_city: alightingCity,
            price_paid_cents: pricePaidCents,
            qr_code_payload: qrCodePayload,
            ticket_signature: signature,
            status: "issued",
            created_at: issuedAt,
            bus_routes_schedules: fallbackSched,
          },
        };
      }
      throw new Error(`Não foi possível emitir a passagem: ${error.message}`);
    }

    return {
      success: true,
      ticket: inserted,
    };
  });

// ============================================================
// 7. LISTAR CARONAS E PASSAGENS DE ÔNIBUS DO CLIENTE (/conta/viagens)
// ============================================================

export const listCustomerCaronasAndBusTickets = createServerFn({ method: "GET" }).handler(
  async () => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      return {
        caronaBookings: [] as any[],
        publishedCaronas: [] as any[],
        busTickets: [] as any[],
      };
    }

    const db = getServerClient();

    const [{ data: caronaBookings }, { data: publishedCaronas }, { data: busTickets }] =
      await Promise.all([
        db
          .from("carona_segment_bookings")
          .select("*, carona_rides(*)")
          .eq("passenger_id", identity.id)
          .order("created_at", { ascending: false }),
        db
          .from("carona_rides")
          .select("*, carona_segment_bookings(*)")
          .eq("driver_id", identity.id)
          .order("departure_at", { ascending: false }),
        db
          .from("bus_ticket_bookings")
          .select("*, bus_routes_schedules(*)")
          .eq("passenger_id", identity.id)
          .order("created_at", { ascending: false }),
      ]);

    return {
      caronaBookings: caronaBookings || [],
      publishedCaronas: publishedCaronas || [],
      busTickets: busTickets || [],
    };
  },
);
