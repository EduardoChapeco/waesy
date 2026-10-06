import { describe, expect, it } from "vitest";
import { shouldSearchPlatform } from "./copilot-internal-search";

describe("copilot internal search", () => {
  it("prioriza a plataforma para intenções de catálogo e descoberta", () => {
    expect(shouldSearchPlatform("procuro uma cafeteria perto de mim")).toBe(true);
    expect(shouldSearchPlatform("quero comprar pizza")).toBe(true);
    expect(shouldSearchPlatform("me mostre eventos neste fim de semana")).toBe(true);
    expect(shouldSearchPlatform("procuro um carro usado")).toBe(true);
  });

  it("não força busca de catálogo em conversa geral curta", () => {
    expect(shouldSearchPlatform("obrigado")).toBe(false);
    expect(shouldSearchPlatform("explique isso")).toBe(false);
  });
});
