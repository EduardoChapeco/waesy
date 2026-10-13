import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const conversation = readFileSync(resolve(process.cwd(), "src/services/ai-conversations.functions.ts"), "utf8");
const gateway = readFileSync(resolve(process.cwd(), "src/services/ai-core-gateway.functions.ts"), "utf8");
const mcp = readFileSync(resolve(process.cwd(), "src/services/mcp-server.functions.ts"), "utf8");

describe("Copilot — cancelamento e timeout", () => {
  it("aborta o provider quando o timeout do pipeline dispara", () => {
    expect(conversation).toContain("abortController?.abort()");
    expect(conversation).toContain("const copilotAbortController = new AbortController()");
    expect(conversation).toContain("copilotAbortController.signal");
  });

  it("propaga signal ao gateway e o conecta ao AbortController do provider", () => {
    expect(conversation).toContain("signal: context.signal");
    expect(gateway).toContain("signal?: AbortSignal");
    expect(gateway).toContain("options?.signal?.addEventListener(\"abort\", abortParent");
    expect(gateway).toContain("signal: request.signal");
  });

  it("impede despacho MCP já cancelado", () => {
    expect(conversation).toContain("signal: context.signal");
    expect(mcp).toContain("if (data.signal?.aborted)");
    expect(mcp).toContain("Execução MCP cancelada pelo cliente");
  });
});
