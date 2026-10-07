import { describe, expect, it, vi } from "vitest";
import { createCorrelationContext, logOperationalEvent, redactOperationalValue } from "./operational-logger";

describe("W15 operational logger", () => {
  it("propaga request/trace e preserva ids operacionais", () => {
    expect(createCorrelationContext({ requestId: "req-1", jobId: "job-1", tenantId: "tenant-1" })).toMatchObject({ requestId: "req-1", traceId: "req-1", jobId: "job-1", tenantId: "tenant-1" });
    expect(createCorrelationContext({ traceId: "trace-1" }).requestId).toBe("trace-1");
  });

  it("redige segredo, conteúdo sensível, JWT, cartão e limita estruturas", () => {
    const safe = redactOperationalValue({ api_key: "sk_live_123456789012345678", prompt: "CPF 123.456.789-00", nested: { authorization: "Bearer secret" }, status: "failed" }) as Record<string, unknown>;
    expect(safe.api_key).toBe("[REDACTED]");
    expect(safe.prompt).toBe("[REDACTED_CONTENT]");
    expect((safe.nested as Record<string, unknown>).authorization).toBe("[REDACTED]");
    expect(safe.status).toBe("failed");
  });

  it("emite envelope estruturado sem serializar payload secreto", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logOperationalEvent("warn", "provider_failure", { requestId: "req-9", provider: "openai" }, { status: 503, api_key: "do-not-log", body: "private prompt" });
    const output = String(spy.mock.calls[0]?.[0]);
    expect(output).toContain('"requestId":"req-9"');
    expect(output).toContain('"status":503');
    expect(output).not.toContain("do-not-log");
    expect(output).not.toContain("private prompt");
    spy.mockRestore();
  });
});
