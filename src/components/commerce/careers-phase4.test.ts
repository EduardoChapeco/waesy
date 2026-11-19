import { describe, it, expect } from "vitest";
import { builderRegistry } from "@/lib/builder/builder-registry";

describe("Fase 4: Portal de Carreiras & Vagas com Integração RH", () => {
 it("builderRegistry deve registrar careers_hero_banner com campos de cultura", () => {
 const manifest = builderRegistry["careers_hero_banner"];
 expect(manifest).toBeDefined();
 expect(manifest.name).toBe("Hero do Portal de Carreiras");
 expect(manifest.category).toBe("content");
 expect(manifest.icon).toBe("Briefcase");
 });

 it("builderRegistry deve registrar careers_job_filters", () => {
 const manifest = builderRegistry["careers_job_filters"];
 expect(manifest).toBeDefined();
 expect(manifest.name).toBe("Filtros de Vagas de Emprego");
 expect(manifest.icon).toBe("Filter");
 });

 it("builderRegistry deve registrar careers_job_grid", () => {
 const manifest = builderRegistry["careers_job_grid"];
 expect(manifest).toBeDefined();
 expect(manifest.name).toBe("Grade de Vagas de Emprego");
 expect(manifest.icon).toBe("Briefcase");
 });

 it("manifests de carreiras devem possuir defaultProps válidas e block_type correto", () => {
 for (const key of ["careers_hero_banner", "careers_job_filters", "careers_job_grid"]) {
 const m = builderRegistry[key];
 expect(m.defaultProps).toBeDefined();
 expect(m.defaultProps.block_type).toBe(key);
 }
 });
});
