import { describe, it, expect } from "vitest";
import { generateDefaultBusSeatMap, CreateVehicleLayoutSchema, UpdateVehicleLayoutSchema } from "./vehicle-layouts.functions";

describe("Vehicle Layouts & 2D Seat Engine (Microfase 75C)", () => {
 it("gera layout Single Deck com motorista, porta, corredor e poltronas executivas", () => {
 const map = generateDefaultBusSeatMap(12, 5, false);
 expect(map.length).toBeGreaterThan(0);

 const seats = map.filter((c) => c.type === "seat");
 expect(seats.length).toBeGreaterThanOrEqual(40);
 expect(seats[0].category).toBe("executivo");
 expect(seats[0].deck).toBe(1);

 const driver = map.find((c) => c.type === "driver");
 expect(driver).toBeDefined();

 const wc = map.find((c) => c.type === "wc");
 expect(wc).toBeDefined();
 });

 it("gera layout Double Decker com Piso 1 (Leito Cama) e Piso 2 (Semi-Leito) com escadas", () => {
 const map = generateDefaultBusSeatMap(12, 5, true);

 const deck1Seats = map.filter((c) => c.deck === 1 && c.type === "seat");
 const deck2Seats = map.filter((c) => c.deck === 2 && c.type === "seat");

 expect(deck1Seats.length).toBeGreaterThan(0);
 expect(deck2Seats.length).toBeGreaterThan(0);
 expect(deck1Seats[0].category).toBe("leito_cama");
 expect(deck2Seats[0].category).toBe("semi_leito");

 const stairs = map.filter((c) => c.type === "stairs");
 expect(stairs.length).toBeGreaterThanOrEqual(2); // Escada no piso 1 e no piso 2
 });

 it("valida payload de criação de layout de frota", () => {
 const valid = {
 store_id: "00000000-0000-0000-0000-000000000002",
 name: "Marcopolo Paradiso G8 1800 DD",
 vehicle_type: "bus" as const,
 total_capacity: 60,
 rows: 12,
 cols: 5,
 is_double_decker: true,
 };

 const parsed = CreateVehicleLayoutSchema.safeParse(valid);
 expect(parsed.success).toBe(true);
 });
});
