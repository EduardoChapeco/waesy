import { describe, it, expect } from "vitest";
import { builderRegistry } from "@/lib/builder-registry";

describe("Fase 5: Portal de Reputação & SAC Auditado (Reclame Aqui)", () => {
 it("builderRegistry deve registrar reputation_score_header com campos de pontuação", () => {
 const manifest = builderRegistry["reputation_score_header"];
 expect(manifest).toBeDefined();
 expect(manifest.name).toBe("Score de Reputação & Confiança");
 expect(manifest.category).toBe("content");
 expect(manifest.icon).toBe("ShieldCheck");
 });

 it("builderRegistry deve registrar reputation_badges_strip sem certificações seed", () => {
	 const manifest = builderRegistry["reputation_badges_strip"];
	 expect(manifest).toBeDefined();
	 expect(manifest.name).toBe("Selos com fonte verificável");
	 expect(manifest.icon).toBe("Award");
	 expect(manifest.defaultProps.content).toEqual({});
 });

 it("builderRegistry deve registrar reputation_timeline_feed", () => {
 const manifest = builderRegistry["reputation_timeline_feed"];
 expect(manifest).toBeDefined();
 expect(manifest.name).toBe("Feed Público de Manifestações");
 expect(manifest.icon).toBe("MessageSquare");
 });

 it("manifests de reputação devem possuir defaultProps válidas", () => {
 for (const key of ["reputation_score_header", "reputation_badges_strip", "reputation_timeline_feed"]) {
 const m = builderRegistry[key];
	 expect(m.defaultProps).toBeDefined();
	 expect(m.defaultProps.block_type).toBe(key);
	 expect(m.defaultProps.content).toEqual({});
	 }
	 });

	 it("não deve preencher score, certificados ou reclamações com exemplos ao criar blocos", () => {
	 expect(builderRegistry.reputation_score_header.defaultProps.content).not.toHaveProperty("reputation_score");
	 expect(builderRegistry.reputation_badges_strip.defaultProps.content).not.toHaveProperty("badges");
	 expect(builderRegistry.reputation_timeline_feed.defaultProps.content).not.toHaveProperty("complaints");
	 });
});
