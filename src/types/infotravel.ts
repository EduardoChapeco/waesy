import { type Hotel, type Flight } from "@/services/proposals";

export interface ApiHotelAvail {
  id?: string;
  hotelId?: string;
  name?: string;
  hotelName?: string;
  city?: string;
  cityName?: string;
  checkIn?: string;
  checkin?: string;
  checkOut?: string;
  checkout?: string;
  mealPlan?: string;
  boardType?: string;
  rooms?: Array<{ type?: string; name?: string; qty?: number; count?: number }>;
  images?: string[];
  photos?: string[];
  price?: number;
  totalPrice?: number;
  cost?: number;
}

export interface ApiFlightAvail {
  id?: string;
  flightId?: string;
  origin?: string;
  destination?: string;
  date?: string;
  flightDate?: string;
  departureTime?: string;
  departure_time?: string;
  arrivalTime?: string;
  arrival_time?: string;
  airline?: string;
  carrier?: string;
  flightNumber?: string;
  flight_number?: string;
  stops?: number;
  baggageRules?: string;
  baggage_rules?: string;
  price?: number;
  totalPrice?: number;
}

export interface ApiBooking {
  id?: string;
  bookingId?: string;
  code?: string;
  client?: {
    name?: string;
    email?: string;
    phone?: string;
    document?: string;
  };
  bookingHotels?: ApiHotelAvail[];
  bookingFlights?: ApiFlightAvail[];
  totalAmount?: number;
  status?: string;
  createdAt?: string;
}

export interface NormalizedBooking {
  id: string;
  bookingCode: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  hotels: Hotel[];
  flights: Flight[];
  totalAmountCents: number;
  status: string;
  createdAt?: string;
}

function stableExternalId(prefix: string, ...parts: Array<string | number | undefined>): string {
  const source = parts.filter((part) => part !== undefined && part !== "").join("|");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(36)}`;
}

export function mapApiHotelToCanonical(raw: ApiHotelAvail): Hotel {
  return {
    id: raw.id || raw.hotelId || stableExternalId("hotel", raw.name || raw.hotelName, raw.city || raw.cityName, raw.checkin || raw.checkIn, raw.checkout || raw.checkOut),
    name: raw.name || raw.hotelName || "Hotel",
    city: raw.city || raw.cityName || "",
    checkin: raw.checkin || raw.checkIn || "",
    checkout: raw.checkout || raw.checkOut || "",
    meal_plan: raw.mealPlan || raw.boardType || "Sem café da manhã",
    rooms: (raw.rooms || []).map((r) => ({
      type: r.type || r.name || "Quarto Standard",
      qty: r.qty ?? r.count ?? 1,
    })),
    images: raw.images || raw.photos || [],
    price: raw.price ?? raw.totalPrice ?? 0,
  };
}

export function mapApiFlightToCanonical(raw: ApiFlightAvail): Flight {
  return {
    id: raw.id || raw.flightId || stableExternalId("fl", raw.origin, raw.destination, raw.date || raw.flightDate, raw.flightNumber || raw.flight_number),
    origin: raw.origin || "",
    destination: raw.destination || "",
    date: raw.date || raw.flightDate || "",
    departure_time: raw.departure_time || raw.departureTime || "00:00",
    arrival_time: raw.arrival_time || raw.arrivalTime || "00:00",
    airline: raw.airline || raw.carrier || "Cia Aérea",
    flight_number: raw.flight_number || raw.flightNumber || "",
    stops: raw.stops ?? 0,
    baggage_rules: raw.baggage_rules || raw.baggageRules || "Sem bagagem despachada",
    price: raw.price ?? raw.totalPrice ?? 0,
  };
}

export function mapApiBookingToNormalized(raw: ApiBooking): NormalizedBooking {
  return {
    id: raw.id || raw.bookingId || stableExternalId("bk", raw.code, raw.client?.email, raw.client?.phone, raw.createdAt),
    bookingCode: raw.code || raw.bookingId || "BOOKING",
    clientName: raw.client?.name || "Cliente",
    clientEmail: raw.client?.email,
    clientPhone: raw.client?.phone,
    hotels: (raw.bookingHotels || []).map(mapApiHotelToCanonical),
    flights: (raw.bookingFlights || []).map(mapApiFlightToCanonical),
    totalAmountCents: Math.round((raw.totalAmount || 0) * 100),
    status: raw.status || "confirmed",
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}
