import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  assertSafeExternalMcpUrl,
  buildExternalMcpHeaders,
  discoverExternalMcpTools,
  invokeExternalMcpTool,
  isUnsafeIpAddress,
  parseMcpJsonRpcPayload,
} from "./mcp-client";

describe("Outbound MCP Client — SSRF Protection, Auth Headers & JSON-RPC / SSE", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("bloqueia URLs HTTP, localhost, IPs privados, metadados cloud e IPv6 interno (SSRF)", () => {
    expect(() => assertSafeExternalMcpUrl("http://mcp.example.com/rpc")).toThrow(/HTTPS/);
    expect(() => assertSafeExternalMcpUrl("https://localhost:8080/mcp")).toThrow(/SSRF/);
    expect(() => assertSafeExternalMcpUrl("https://127.0.0.1/mcp")).toThrow(/privado/i);
    expect(() => assertSafeExternalMcpUrl("https://169.254.169.254/latest/meta-data")).toThrow(/SSRF|privado/i);
    expect(() => assertSafeExternalMcpUrl("https://10.0.0.5/rpc")).toThrow(/privado/i);
    expect(() => assertSafeExternalMcpUrl("https://172.16.4.12/rpc")).toThrow(/privado/i);
    expect(() => assertSafeExternalMcpUrl("https://192.168.1.50/rpc")).toThrow(/privado/i);
    expect(() => assertSafeExternalMcpUrl("https://user:pass@mcp.example.com/rpc")).toThrow(/credenciais/i);
    expect(isUnsafeIpAddress("::1")).toBe(true);
    expect(isUnsafeIpAddress("fe80::1")).toBe(true);
    expect(isUnsafeIpAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isUnsafeIpAddress("8.8.8.8")).toBe(false);

    const valid = assertSafeExternalMcpUrl("https://api.partner-mcp.example.com/v1/mcp");
    expect(valid.hostname).toBe("api.partner-mcp.example.com");
  });

  it("constrói headers corretos para Bearer, API Key customizada e Basic", () => {
    const bearer = buildExternalMcpHeaders({ authType: "bearer", secret: "tok_123" });
    expect(bearer["Authorization"]).toBe("Bearer tok_123");

    const custom = buildExternalMcpHeaders({
      authType: "api_key_header",
      authHeaderName: "X-Partner-Key",
      secret: "k_abc",
    });
    expect(custom["X-Partner-Key"]).toBe("k_abc");

    const basic = buildExternalMcpHeaders({ authType: "basic", secret: "admin:s3cr3t" });
    expect(basic["Authorization"]).toMatch(/^Basic /);
  });

  it("decodifica corretamente payloads application/json e text/event-stream (SSE)", () => {
    const jsonFrame = parseMcpJsonRpcPayload(
      "application/json",
      JSON.stringify({ jsonrpc: "2.0", id: "req-1", result: { tools: [{ name: "ping" }] } }),
      "req-1"
    );
    expect(jsonFrame.result.tools[0].name).toBe("ping");

    const ssePayload = [
      "event: message",
      'data: {"jsonrpc":"2.0","id":"other","result":{"ignored":true}}',
      "",
      "event: message",
      'data: {"jsonrpc":"2.0","id":"req-2","result":{"content":[{"type":"text","text":"OK-SSE"}]}}',
      "",
    ].join("\n");
    const sseFrame = parseMcpJsonRpcPayload("text/event-stream", ssePayload, "req-2");
    expect(sseFrame.result.content[0].text).toBe("OK-SSE");
  });

  it("executa handshake initialize + tools/list e tools/call contra fetch mockado", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init: any) => {
      const body = JSON.parse(String(init?.body || "{}"));
      if (body.method === "initialize") {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { protocolVersion: "2025-03-26" } }),
          { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "sess-99" } }
        );
      }
      if (body.method === "notifications/initialized") {
        return new Response("", { status: 204 });
      }
      if (body.method === "tools/list") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              tools: [
                {
                  name: "crm_lookup",
                  description: "Consulta ficha do cliente no CRM externo",
                  inputSchema: { type: "object", properties: { email: { type: "string" } } },
                },
              ],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (body.method === "tools/call") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: { content: [{ type: "text", text: "Cliente encontrado: Ana" }], isError: false },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      return new Response("Not Found", { status: 404 });
    });

    const tools = await discoverExternalMcpTools({
      endpointUrl: "https://mcp.trusted-crm.example.com/mcp",
      authType: "bearer",
      secret: "secret_token",
    });

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("crm_lookup");

    const callRes = await invokeExternalMcpTool(
      {
        endpointUrl: "https://mcp.trusted-crm.example.com/mcp",
        authType: "bearer",
        secret: "secret_token",
      },
      "crm_lookup",
      { email: "ana@example.com" }
    );

    expect(callRes.status).toBe("success");
    expect(callRes.textSummary).toBe("Cliente encontrado: Ana");
    expect(fetchMock).toHaveBeenCalled();
  });
});
