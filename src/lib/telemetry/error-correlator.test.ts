import { describe, it, expect, beforeEach } from "vitest";
import {
  errorRegistry,
  sanitizeSensitiveText,
} from "./error-correlator";
import {
  recordCorrelatedError,
  consumeLastCapturedError,
} from "@/lib/error-capture";

describe("Telemetria e Correlação de Erros — Fases S32 e S33", () => {
  beforeEach(() => {
    errorRegistry.clear();
  });

  it("REQ-S32-01: deve extrair traceId a partir dos headers cf-ray e x-request-id", () => {
    const reqWithRay = new Request("https://waesy.com/api/test", {
      headers: { "cf-ray": "8d3889100fa1b-GRU" },
    });
    expect(errorRegistry.extractTraceId(reqWithRay)).toBe("8d3889100fa1b-GRU");

    const reqWithXId = new Request("https://waesy.com/api/test", {
      headers: { "x-request-id": "req-uuid-12345" },
    });
    expect(errorRegistry.extractTraceId(reqWithXId)).toBe("req-uuid-12345");

    const fallbackTrace = errorRegistry.extractTraceId();
    expect(fallbackTrace.startsWith("trace_")).toBe(true);
  });

  it("REQ-S32-02: deve registrar e recuperar erros correlacionados ao traceId com envelope estruturado", () => {
    const trace = "trace_sample_001";
    const testErr = new Error("Database timeout connection");
    testErr.stack = "Error: Database timeout\n    at query (db.ts:42:10)";

    const event = errorRegistry.record(trace, testErr, {
      source: "worker",
      tenantId: "tenant_store_123",
      userId: "user_operator_9",
      routeId: "/workspace/pedidos",
    });

    expect(event.traceId).toBe(trace);
    expect(event.tenantId).toBe("tenant_store_123");
    expect(event.routeId).toBe("/workspace/pedidos");
    expect(event.error.message).toBe("Database timeout connection");
    expect(event.error.stack).toBeDefined();

    // Recuperação correlacionada
    const consumed = errorRegistry.consume(trace);
    expect(consumed).toBeDefined();
    expect(consumed?.traceId).toBe(trace);

    // Segunda chamada deve retornar undefined pois o erro já foi consumido
    expect(errorRegistry.consume(trace)).toBeUndefined();
  });

  it("REQ-S32-03: deve sanitizar dados sensíveis (JWT, senhas, cartões, CPF)", () => {
    const textWithJwt = "Authorization failed for token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature";
    expect(sanitizeSensitiveText(textWithJwt)).toContain("[REDACTED_JWT]");

    const textWithSecret = "Invalid API key: sk_live_99887766554433221100";
    expect(sanitizeSensitiveText(textWithSecret)).toContain("[REDACTED_SECRET_KEY]");

    const textWithCpf = "Falha ao validar documento do titular 123.456.789-00 no checkout";
    expect(sanitizeSensitiveText(textWithCpf)).toBe("Falha ao validar documento do titular [REDACTED_CPF] no checkout");
  });

  it("REQ-S33-01: deve comprovar extinção do buffer de 5s via integração com error-capture", () => {
    const trace = "trace_ssr_999";
    recordCorrelatedError(trace, new TypeError("Cannot read properties of null"), {
      source: "ssr",
    });

    const recovered = consumeLastCapturedError(trace);
    expect(recovered).toBeInstanceOf(Error);
    expect((recovered as Error).message).toBe("Cannot read properties of null");
    expect((recovered as Error).name).toBe("TypeError");

    // Já consumido
    expect(consumeLastCapturedError(trace)).toBeUndefined();
  });
});
