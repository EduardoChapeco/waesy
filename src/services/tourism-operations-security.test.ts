import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const service = readFileSync(resolve(process.cwd(), "src/services/tourism-operations.functions.ts"), "utf8");
const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20270120000000_trip_seat_reservation_uniqueness.sql"),
  "utf8",
);

describe("tourism operations — reservas de assento", () => {
  it("não expõe nome do passageiro na leitura pública de assentos", () => {
    const listBlock = service.slice(
      service.indexOf("export const listExperienceSeatReservations"),
      service.indexOf("export const reserveExperienceSeat"),
    );
    expect(listBlock).toContain('.select("seat_number, status")');
    expect(listBlock).not.toContain("passenger_name");
  });

  it("exige staff autenticado para criar reserva", () => {
    const reserveBlock = service.slice(service.indexOf("export const reserveExperienceSeat"));
    expect(reserveBlock).toContain("const identity = await getServerIdentity()");
    expect(reserveBlock).toContain("assertStoreAccess(identity)");
    expect(reserveBlock).toContain('error.code === "23505"');
  });

  it("garante unicidade atômica por experiência e assento ativo", () => {
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS");
    expect(migration).toContain("(experience_id, seat_number)");
    expect(migration).toContain("status IN ('reserved', 'confirmed', 'boarded')");
  });
});
