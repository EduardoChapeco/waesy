import { describe, it, expect } from "vitest";
import { parseRichBioTokens } from "./RichBioContent";

describe("RichBioContent parser", () => {
  it("deve parsear texto puro sem formatação", () => {
    const tokens = parseRichBioTokens("Olá mundo, este é um perfil comum.");
    expect(tokens).toEqual([
      { type: "text", text: "Olá mundo, este é um perfil comum." },
    ]);
  });

  it("deve parsear destaque com marcador ==destaque==", () => {
    const tokens = parseRichBioTokens("Especialista em ==Design System== e frontend.");
    expect(tokens).toEqual([
      { type: "text", text: "Especialista em " },
      { type: "highlight", text: "Design System" },
      { type: "text", text: " e frontend." },
    ]);
  });

  it("deve parsear **negrito**, *itálico* e [mono]código[/mono]", () => {
    const tokens = parseRichBioTokens("**Líder** de tecnologia *criativa* em [mono]@waesy[/mono].");
    expect(tokens).toEqual([
      { type: "bold", text: "Líder" },
      { type: "text", text: " de tecnologia " },
      { type: "italic", text: "criativa" },
      { type: "text", text: " em " },
      { type: "mono", text: "@waesy" },
      { type: "text", text: "." },
    ]);
  });

  it("não deve permitir tags HTML ou injeções de scripts, mantendo-os como texto cru", () => {
    const tokens = parseRichBioTokens("<script>alert(1)</script> e <b>negrito</b>");
    expect(tokens).toEqual([
      { type: "text", text: "<script>alert(1)</script> e <b>negrito</b>" },
    ]);
  });
});
