import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/routes/_store.copilot.tsx"), "utf8");

describe("Copilot — isolamento de thread no frontend", () => {
  it("captura a thread do request e não aplica resposta em thread diferente", () => {
    expect(source).toContain("const requestThreadId = activeThreadId");
    expect(source).toContain("activeThreadRef.current !== requestThreadId");
    expect(source).toContain("threadId: requestThreadId");
  });

  it("invalida execução ao trocar de thread e expõe streaming ao shell", () => {
    expect(source).toContain("activeRunRef.current += 1");
    expect(source).toContain("onSelectThread={handleSelectThread}");
    expect(source).toContain("isStreaming={isSending}");
  });

  it("não permite retry de falha final", () => {
    expect(source).toContain('failed.fsmPhase !== "FAILED_RETRYABLE"');
    expect(source).toContain("Esta execução não pode ser repetida automaticamente.");
  });
});
