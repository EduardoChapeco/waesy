import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Onda 7 — aplicação InfoTravel", () => {
  const service = readFileSync(resolve(process.cwd(), "src/services/infotravel.ts"), "utf8");
  const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261008101500_infotravel_atomic_booking_apply.sql"), "utf8");

  it("aplica importação e sync pela mesma RPC transacional", () => {
    expect(service).toContain('supabase.rpc("apply_infotravel_booking"');
    expect(service).toContain("applyInfotravelSnapshot");
    expect(service).toContain('"run_periodic_sync"');
    expect(service).toContain('"import_booking"');
  });

  it("fixa tenant e lock da viagem antes dos writes derivados", () => {
    expect(migration).toContain("WHERE id = p_trip_id AND store_id = p_store_id");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("source_booking_id");
    expect(migration).toContain("source_provider = 'infotravel'");
  });

  it("reconstrói somente projeções InfoTravel e preserva dados manuais", () => {
    expect(migration).toContain("DELETE FROM public.trip_passengers");
    expect(migration).toContain("DELETE FROM public.trip_confirmation_items");
    expect(migration).toContain("source_provider = 'infotravel'");
    expect(migration).toContain("'trip', to_jsonb(v_trip)");
  });

  it("não retorna o providerResult bruto pelos handlers de importação e sync", () => {
    expect(service).not.toContain("return { success: true, trip: updatedTrip, passengersImported: passengers.length, providerResult }");
    expect(service).not.toContain("return { success: true, providerResult }");
  });
});
