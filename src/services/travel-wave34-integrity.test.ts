import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { mapApiBookingToNormalized, mapApiHotelToCanonical } from "@/types/infotravel";

const root = process.cwd();
const infotravel = fs.readFileSync(path.join(root, "src/services/infotravel.ts"), "utf8");
const lifecycle = fs.readFileSync(path.join(root, "src/services/travel-lifecycle.functions.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261008093000_travel_reservation_state.sql"), "utf8");

describe("Master travel — Ondas 3 e 4", () => {
  it("isola o conector InfoTravel pelo tenant autenticado", () => {
    expect(infotravel).toContain("assertStoreAccess(identity)");
    expect(infotravel).toContain("agencyId !== identity.store_id");
    expect(infotravel).toContain('"CONNECTOR_UNAVAILABLE"');
    expect(infotravel).not.toContain('return { error_code: "CREDENTIALS_NOT_CONFIGURED", error: error.message }');
  });

  it("mantém IDs normalizados estáveis em reprocessamentos do mesmo payload", () => {
    const rawHotel = { name: "Hotel Waesy", city: "Maceió", checkIn: "2026-12-01", checkOut: "2026-12-05" };
    expect(mapApiHotelToCanonical(rawHotel).id).toBe(mapApiHotelToCanonical(rawHotel).id);
    const booking = mapApiBookingToNormalized({ client: { email: "cliente@example.com" }, bookingHotels: [rawHotel] });
    expect(booking.id).toBe(mapApiBookingToNormalized({ client: { email: "cliente@example.com" }, bookingHotels: [rawHotel] }).id);
  });

  it("declara e persiste RESERVED_PENDING_ISSUANCE com proteção contra retry duplicado", () => {
    expect(migration).toContain("reserved_pending_issuance");
    expect(migration).toContain("tourism_trips_reservation_state_check");
    expect(lifecycle).toContain('.eq("proposal_id", data.proposalId)');
    expect(lifecycle).toContain('reservation_state: "reserved_pending_issuance"');
    expect(lifecycle).toContain('reservationState: existingTrip.reservation_state || "reserved_pending_issuance"');
  });
});
