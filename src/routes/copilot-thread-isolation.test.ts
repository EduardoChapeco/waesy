import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routeSource = readFileSync(resolve(process.cwd(), "src/routes/_store.copilot.tsx"), "utf8");
const hookSource = readFileSync(resolve(process.cwd(), "src/hooks/use-copilot-session.ts"), "utf8");

describe("Copilot — isolamento de thread no frontend", () => {
  it("captura a thread do request e não aplica resposta em thread diferente", () => {
    expect(routeSource).toContain("useCopilotSession");
    expect(hookSource).toContain("const requestThreadId = targetThreadId || fallbackId");
    expect(hookSource).toContain("activeThreadRef.current !== requestThreadId");
    expect(hookSource).toContain("threadId: requestThreadId");
  });

  it("invalida execução ao trocar de thread e expõe streaming ao shell", () => {
    expect(hookSource).toContain("activeRunRef.current += 1");
    expect(routeSource).toContain("onSelectThread={copilot.handleSelectThread}");
    expect(routeSource).toContain("isStreaming={copilot.isSending}");
  });

  it("não permite retry de falha final", () => {
    expect(hookSource).toContain('failed.fsmPhase !== "FAILED_RETRYABLE"');
    expect(hookSource).toContain("Esta execução não pode ser repetida automaticamente.");
  });
});
