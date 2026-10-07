import { describe, expect, it } from "vitest";
import { computeClassifiedRefinementBaseHash } from "@/types/classified-editor";

describe("classified refinement evidence", () => {
  it("gera o mesmo hash para o mesmo texto normalizado", () => {
    expect(computeClassifiedRefinementBaseHash(" Título ", "Descrição ")).toBe(
      computeClassifiedRefinementBaseHash("Título", "Descrição"),
    );
  });

  it("muda o hash quando o título ou descrição muda", () => {
    const base = computeClassifiedRefinementBaseHash("Título", "Descrição");
    expect(computeClassifiedRefinementBaseHash("Outro título", "Descrição")).not.toBe(base);
    expect(computeClassifiedRefinementBaseHash("Título", "Outra descrição")).not.toBe(base);
  });
});
