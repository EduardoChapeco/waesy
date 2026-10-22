import { describe, expect, it } from "vitest";
import { fragmentAndOptimizePrompt } from "./autonomous-copilot-orchestrator";

describe("Copilot: domínio web_research", () => {
  it("classifica prompt com URL pública como web_research e preserva a URL", () => {
    const task = fragmentAndOptimizePrompt("Qual o telefone de contato em https://bella.com.br/contato ?");
    expect(task.domain).toBe("web_research");
    expect(task.startUrl).toBe("https://bella.com.br/contato");
    expect(task.targetQuery).toContain("telefone");
  });

  it("CNPJ com URL continua no fluxo cadastral", () => {
    const task = fragmentAndOptimizePrompt("Consulte o CNPJ 12.345.678/0001-95 e veja https://exemplo.com.br");
    expect(task.domain).toBe("cnpj_company");
  });

  it("prompt sem URL não vira web_research", () => {
    expect(fragmentAndOptimizePrompt("Quero leads de restaurantes em Chapecó").domain).not.toBe("web_research");
  });
});
