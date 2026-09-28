import { describe, it, expect } from "vitest";
import { fetchCanonicalDeviceBrands, fetchCanonicalVehicleBrands, fetchCanonicalJobOccupations, listCanonicalDeviceBrands, listCanonicalVehicleBrands, listCanonicalJobOccupations } from "./canonical-catalog.functions";

describe("Canonical Sources & Market Measurement (Microfase 77B)", () => {
 it("valida que as server functions de catálogo canônico estão exportadas corretamente", () => {
 expect(typeof listCanonicalDeviceBrands).toBe("function");
 expect(typeof listCanonicalVehicleBrands).toBe("function");
 expect(typeof listCanonicalJobOccupations).toBe("function");
 });

 it("lista marcas de dispositivos com seus modelos canônicos para mensuração", async () => {
 const brands = await fetchCanonicalDeviceBrands();
 expect(Array.isArray(brands)).toBe(true);
 expect(brands.length).toBeGreaterThan(0);

 const apple = brands.find((b) => b.slug === "apple");
 expect(apple).toBeDefined();
 expect(apple?.models?.some((m) => m.name.includes("iPhone"))).toBe(true);
 });

 it("lista marcas de veículos com seus modelos canônicos", async () => {
 const vBrands = await fetchCanonicalVehicleBrands();
 expect(Array.isArray(vBrands)).toBe(true);
 expect(vBrands.length).toBeGreaterThan(0);

 const toyota = vBrands.find((b) => b.slug === "toyota");
 expect(toyota).toBeDefined();
 expect(toyota?.models?.some((m) => m.name === "Corolla")).toBe(true);
 });

 it("lista ocupações e cargos canônicos com código CBO", async () => {
 const jobs = await fetchCanonicalJobOccupations();
 expect(Array.isArray(jobs)).toBe(true);
 expect(jobs.length).toBeGreaterThan(0);
 expect(jobs.some((j) => j.title.includes("Vendedor"))).toBe(true);
 });
});
