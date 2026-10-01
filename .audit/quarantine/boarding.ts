/**
 * boarding.ts — Contratos e Tipos Canônicos de Embarques & Vôos (BFF BigTech)
 * Re-exporta Server Functions de travel-departures.functions.ts com zero dependência de client Supabase.
 */

export type ChecklistItem = { label: string; done: boolean; passenger_id?: string };

export type BoardingCard = {
  id: string;
  agency_id?: string;
  pnr: string | null;
  airline: string | null;
  status: string;
  alerts: string[];
  trip_id: string;
  position: number;
  checklist: ChecklistItem[];
  departure_date?: string | null;
  passengers_count?: number | null;
  trip_title?: string;
  trip_destination?: string;
  tags?: string[];
  notes?: string | null;
  notes_internal?: string | null;
  internal_ref?: string | null;
  briefing_date?: string | null;
  briefing_url?: string | null;
  departure_airport?: string | null;
  arrival_airport?: string | null;
  flight_number?: string | null;
  flight_date?: string | null;
  flight_class?: string | null;
  hotel_name?: string | null;
  hotel_address?: string | null;
  hotel_checkin?: string | null;
  hotel_checkout?: string | null;
  hotel_phone?: string | null;
  transfer_provider?: string | null;
  transfer_time?: string | null;
  transfer_vehicle?: string | null;
  guide_name?: string | null;
  guide_phone?: string | null;
  emergency_phone?: string | null;
  destination?: string | null;
  destination_type?: string | null;
  pax_count?: number | null;
};

// Re-export canonical Server Functions
export * from "./travel-departures.functions";
export * from "./group-tour-boarding.functions";
