import { describe, it, expect } from "vitest";
import { builderRegistry } from "@/lib/builder-registry";

describe("Fase 3: Portal do Cliente 360 & Widgets Dinâmicos", () => {
 it("builderRegistry deve registrar portal_contracts com manifest estrito", () => {
 const manifest = builderRegistry["portal_contracts"];
 expect(manifest).toBeDefined();
 expect(manifest.name).toBe("Contratos do Cliente 360");
 expect(manifest.category).toBe("content");
 expect(manifest.icon).toBe("FileText");
 });

 it("builderRegistry deve registrar portal_carnes_bills com manifest estrito", () => {
 const manifest = builderRegistry["portal_carnes_bills"];
 expect(manifest).toBeDefined();
 expect(manifest.name).toBe("Carnê Digital & Parcelas PIX");
 expect(manifest.icon).toBe("QrCode");
 });

 it("builderRegistry deve registrar portal_appointments com manifest estrito", () => {
 const manifest = builderRegistry["portal_appointments"];
 expect(manifest).toBeDefined();
 expect(manifest.name).toBe("Agendamentos & Linha do Tempo");
 expect(manifest.icon).toBe("Calendar");
 });

 it("builderRegistry deve registrar portal_orders_rentals com manifest estrito", () => {
 const manifest = builderRegistry["portal_orders_rentals"];
 expect(manifest).toBeDefined();
 expect(manifest.name).toBe("Compras");
 expect(manifest.icon).toBe("Package");
 });

 it("manifests devem possuir defaultProps válidas e sanitizáveis", () => {
 for (const key of ["portal_contracts", "portal_carnes_bills", "portal_appointments", "portal_orders_rentals"]) {
 const m = builderRegistry[key];
 expect(m.defaultProps).toBeDefined();
 expect(m.defaultProps.block_type).toBe(key);
 expect(m.defaultProps.content).toBeDefined();
 }
 });
});
