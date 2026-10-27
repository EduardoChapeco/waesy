import { describe, expect, it } from "vitest";
import {
  buildDecisionPrompt,
  isHostAllowed,
  parseAgentAction,
  pickLinks,
  runWebAgentLoop,
  type AgentAction,
  type PageObservation,
} from "./agent-core";

const page = (url: string, links: string[] = []): PageObservation => ({ url, text: `conteudo de ${url}`, links });

describe("isHostAllowed", () => {
  it("aceita host inicial, subdomínios e lista; bloqueia o resto e IPs privados", () => {
    expect(isHostAllowed("https://bella.com.br/contato", "https://www.bella.com.br")).toBe(true);
    expect(isHostAllowed("https://blog.bella.com.br", "https://bella.com.br")).toBe(true);
    expect(isHostAllowed("https://outro.com", "https://bella.com.br")).toBe(false);
    expect(isHostAllowed("https://outro.com", "https://bella.com.br", ["outro.com"])).toBe(true);
    expect(isHostAllowed("http://127.0.0.1", "http://127.0.0.1")).toBe(false);
  });
});

describe("parseAgentAction", () => {
  it("lê JSON com cerca de código e rejeita inválidos", () => {
    expect(parseAgentAction('```json\n{"type":"finish","answer":"ok"}\n```')).toEqual({ type: "finish", answer: "ok" });
    expect(parseAgentAction('{"type":"hack"}')).toBeNull();
    expect(parseAgentAction("sem json")).toBeNull();
  });
});

describe("pickLinks", () => {
  it("deduplica e limita", () => {
    expect(pickLinks(["https://a.com", "https://a.com", "mailto:x@y.com", "https://b.com"], 5)).toEqual(["https://a.com", "https://b.com"]);
  });
});

describe("buildDecisionPrompt", () => {
  it("marca a página como dado não confiável", () => {
    const prompt = buildDecisionPrompt({ goal: "g", observation: page("https://a.com"), history: [], stepsLeft: 3 });
    expect(prompt).toContain("<pagina>");
    expect(prompt).toContain("Passos restantes: 3");
  });
});

describe("runWebAgentLoop", () => {
  const start = "https://bella.com.br";

  it("segue link permitido e finaliza com resposta", async () => {
    const actions: AgentAction[] = [{ type: "follow", linkIndex: 0 }, { type: "finish", answer: "Tel 4933221100" }];
    const visited: string[] = [];
    const result = await runWebAgentLoop(
      { goal: "telefone", startUrl: start },
      {
        observe: async (u) => {
          visited.push(u);
          return page(u, ["https://bella.com.br/contato"]);
        },
        decide: async () => actions.shift() as AgentAction,
      },
    );
    expect(result.status).toBe("finished");
    expect(result.answer).toBe("Tel 4933221100");
    expect(visited).toEqual([start, "https://bella.com.br/contato"]);
  });

  it("bloqueia domínio fora da política e estoura max_steps", async () => {
    const result = await runWebAgentLoop(
      { goal: "x", startUrl: start, maxSteps: 2 },
      { observe: async (u) => page(u), decide: async () => ({ type: "open", url: "https://malicioso.com" }) },
    );
    expect(result.status).toBe("max_steps");
    expect(result.steps.every((s) => s.outcome === "blocked")).toBe(true);
  });

  it("respeita abort e URL inicial privada", async () => {
    const signal = { aborted: true };
    const aborted = await runWebAgentLoop({ goal: "x", startUrl: start }, { observe: async (u) => page(u), decide: async () => ({ type: "finish", answer: "a" }), signal });
    expect(aborted.status).toBe("aborted");
    const bad = await runWebAgentLoop({ goal: "x", startUrl: "http://localhost" }, { observe: async (u) => page(u), decide: async () => ({ type: "finish", answer: "a" }) });
    expect(bad.status).toBe("error");
  });

  it("reporta erro quando a página inicial não carrega ou o LLM falha", async () => {
    const noPage = await runWebAgentLoop({ goal: "x", startUrl: start }, { observe: async () => null, decide: async () => ({ type: "finish", answer: "a" }) });
    expect(noPage.status).toBe("error");
    const llmFail = await runWebAgentLoop({ goal: "x", startUrl: start }, { observe: async (u) => page(u), decide: async () => { throw new Error("sem chave"); } });
    expect(llmFail.error).toBe("sem chave");
  });
});
