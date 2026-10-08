import { describe, it, expect } from "vitest";
import { RunSimLabPersonaTestSchema, SEVEN_SINS_DEFINITIONS } from "./seven-sins-simlab.functions";
import { CANONICAL_BRAZIL_ARCHETYPES } from "./simlab.functions";

describe("Canvas de gatilhos e contratos qualitativos do SimLab", () => {
  it("mantém os sete gatilhos criativos sem alegar eficácia preditiva", () => {
    expect(Object.keys(SEVEN_SINS_DEFINITIONS).sort()).toEqual([
      "ganancia", "gula", "inveja", "ira", "luxuria", "orgulho", "preguica",
    ]);
    for (const definition of Object.values(SEVEN_SINS_DEFINITIONS)) {
      expect(definition.label.length).toBeGreaterThan(0);
      expect(definition.subconscious.length).toBeGreaterThan(0);
    }
  });

  it("aceita entrada textual válida para uma exploração de campanha", () => {
    const result = RunSimLabPersonaTestSchema.safeParse({
      storeId: "c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7",
      sin: "orgulho",
      copyHeadline: "Conheça a nova coleção",
      copyBody: "Veja os detalhes do produto e confira se ele atende ao que você procura.",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita entrada incompleta/fora do contrato", () => {
    expect(RunSimLabPersonaTestSchema.safeParse({
      sin: "orgulho",
      copyHeadline: "",
      copyBody: "texto",
    }).success).toBe(false);
    expect(RunSimLabPersonaTestSchema.safeParse({
      sin: "decimo_gatilho",
      copyHeadline: "Headline",
      copyBody: "Corpo",
    }).success).toBe(false);
  });

  it("identifica todo perfil de seed como sintético e não calibrado", () => {
    expect(CANONICAL_BRAZIL_ARCHETYPES.length).toBeGreaterThan(0);
    for (const persona of CANONICAL_BRAZIL_ARCHETYPES) {
      expect(persona.profile_origin).toBe("seed_catalog_profile");
      expect(persona.calibration_status).toBe("not_calibrated");
    }
  });
});
