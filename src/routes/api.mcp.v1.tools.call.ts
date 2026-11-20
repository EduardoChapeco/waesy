import { createFileRoute } from "@tanstack/react-router";
import {
  executeMcpToolCall,
  readMcpResource,
  getMcpPrompt,
  McpToolCallRequestSchema,
  MCP_TOOLS_MANIFEST,
  MCP_RESOURCES_MANIFEST,
  MCP_PROMPTS_MANIFEST,
} from "@/services/mcp-server.functions";
import {
  buildAgentApiHeaders,
  buildStructuredApiErrorResponse,
} from "@/lib/agentic/agentic-readiness-engine";

import type {} from "@tanstack/react-start";

function extractInboundMcpAuthToken(request: Request): string | undefined {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const apiKey = request.headers.get("x-api-key") || request.headers.get("x-mcp-token") || "";
  return apiKey.trim() || undefined;
}
export const Route = createFileRoute("/api/mcp/v1/tools/call")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const accept = (request.headers.get("accept") || "").toLowerCase();
        if (accept.includes("text/event-stream")) {
          const sseBody = [
            `event: endpoint`,
            `data: /api/mcp/v1/tools/call`,
            ``,
            `event: message`,
            `data: ${JSON.stringify({
              jsonrpc: "2.0",
              method: "notifications/serverInfo",
              params: {
                name: "Waesy MCP Server",
                version: "2.3.0",
                protocolVersion: "2025-03-26",
              },
            })}`,
            ``,
          ].join("\n");

          return new Response(sseBody, {
            status: 200,
            headers: buildAgentApiHeaders({
              extraHeaders: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
              },
            }),
          });
        }

        return new Response(
          JSON.stringify(
            {
              jsonrpc: "2.0",
              name: "Waesy MCP Server",
              version: "2.3.0",
              protocolVersion: "2025-03-26",
              supportedProtocolVersions: ["2025-03-26", "2024-11-05"],
              transport: "streamable-http",
              endpoint: "/api/mcp/v1/tools/call",
              manifest: "/api/webmcp.json",
              openapi: "/api/openapi.json",
              capabilities: {
                tools: { listChanged: false },
                resources: { subscribe: false, listChanged: false },
                prompts: { listChanged: false },
              },
              toolsCount: MCP_TOOLS_MANIFEST.length,
            },
            null,
            2,
          ),
          {
            status: 200,
            headers: buildAgentApiHeaders(),
          },
        );
      },
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json();
          const inboundAuthToken = extractInboundMcpAuthToken(request);

          // 1. Suporte Nativo a JSON-RPC 2.0 (MCP Streamable HTTP Handshake: initialize, tools/list, tools/call, etc.)
          if (body && typeof body === "object" && (body.jsonrpc === "2.0" || typeof body.method === "string")) {
            const rpcId = body.id !== undefined ? body.id : 1;
            const method = String(body.method || "");

            if (method === "initialize") {
              const requestedVersion = body.params?.protocolVersion || "2025-03-26";
              return new Response(
                JSON.stringify(
                  {
                    jsonrpc: "2.0",
                    id: rpcId,
                    result: {
                      protocolVersion: requestedVersion,
                      capabilities: {
                        tools: { listChanged: false },
                        resources: { subscribe: false, listChanged: false },
                        prompts: { listChanged: false },
                      },
                      serverInfo: {
                        name: "Waesy MCP Server",
                        version: "2.2.0",
                      },
                      instructions:
                        "Use search_catalog_products, get_store_directory_info, or check_delivery_coverage for public local commerce and verified CNPJ business queries in Brazil.",
                    },
                  },
                  null,
                  2,
                ),
                {
                  status: 200,
                  headers: buildAgentApiHeaders(),
                },
              );
            }

            if (method === "notifications/initialized" || method === "initialized") {
              return new Response(
                JSON.stringify({ jsonrpc: "2.0", id: rpcId, result: {} }),
                {
                  status: 200,
                  headers: buildAgentApiHeaders(),
                },
              );
            }

            if (method === "ping") {
              return new Response(
                JSON.stringify({ jsonrpc: "2.0", id: rpcId, result: {} }),
                {
                  status: 200,
                  headers: buildAgentApiHeaders(),
                },
              );
            }

            if (method === "tools/list") {
              return new Response(
                JSON.stringify(
                  {
                    jsonrpc: "2.0",
                    id: rpcId,
                    result: {
                      tools: MCP_TOOLS_MANIFEST.map((t) => ({
                        name: t.name,
                        description: t.description,
                        inputSchema: t.inputSchema,
                      })),
                    },
                  },
                  null,
                  2,
                ),
                {
                  status: 200,
                  headers: buildAgentApiHeaders(),
                },
              );
            }

            if (method === "resources/list") {
              return new Response(
                JSON.stringify(
                  {
                    jsonrpc: "2.0",
                    id: rpcId,
                    result: {
                      resources: MCP_RESOURCES_MANIFEST,
                    },
                  },
                  null,
                  2,
                ),
                {
                  status: 200,
                  headers: buildAgentApiHeaders(),
                },
              );
            }

            if (method === "resources/read") {
              const uri = typeof body.params?.uri === "string" ? body.params.uri.trim() : "";
              const storeId = typeof body.params?.storeId === "string" ? body.params.storeId.trim() : undefined;
              if (!uri) {
                return new Response(
                  JSON.stringify(
                    {
                      jsonrpc: "2.0",
                      id: rpcId,
                      error: {
                        code: -32602,
                        message: "Missing required param 'uri' for resources/read",
                      },
                    },
                    null,
                    2,
                  ),
                  {
                    status: 400,
                    headers: buildAgentApiHeaders(),
                  },
                );
              }
              try {
                const resource = await readMcpResource(uri, storeId, inboundAuthToken);
                return new Response(
                  JSON.stringify(
                    {
                      jsonrpc: "2.0",
                      id: rpcId,
                      result: {
                        contents: [
                          {
                            uri: resource.uri,
                            mimeType: resource.mimeType,
                            text:
                              typeof resource.content === "string"
                                ? resource.content
                                : JSON.stringify(resource.content),
                          },
                        ],
                      },
                    },
                    null,
                    2,
                  ),
                  {
                    status: 200,
                    headers: buildAgentApiHeaders(),
                  },
                );
              } catch (resErr: any) {
                const msg = resErr?.message || "Falha ao ler recurso MCP.";
                const isUnauthorized = msg.includes("401 Unauthorized") || msg.includes("not authenticated");
                const isForbidden =
                  msg.includes("403 Forbidden") ||
                  msg.includes("Insufficient permissions") ||
                  msg.includes("No active store context");
                const status = isUnauthorized ? 401 : isForbidden ? 403 : 400;
                const code = isUnauthorized ? -32001 : isForbidden ? -32003 : -32602;
                return new Response(
                  JSON.stringify(
                    {
                      jsonrpc: "2.0",
                      id: rpcId,
                      error: { code, message: msg },
                    },
                    null,
                    2,
                  ),
                  {
                    status,
                    headers: buildAgentApiHeaders(),
                  },
                );
              }
            }

            if (method === "prompts/list") {
              return new Response(
                JSON.stringify(
                  {
                    jsonrpc: "2.0",
                    id: rpcId,
                    result: {
                      prompts: MCP_PROMPTS_MANIFEST,
                    },
                  },
                  null,
                  2,
                ),
                {
                  status: 200,
                  headers: buildAgentApiHeaders(),
                },
              );
            }

            if (method === "prompts/get") {
              const promptName = typeof body.params?.name === "string" ? body.params.name.trim() : "";
              const promptArgs =
                body.params?.arguments && typeof body.params.arguments === "object"
                  ? body.params.arguments
                  : {};
              if (!promptName) {
                return new Response(
                  JSON.stringify(
                    {
                      jsonrpc: "2.0",
                      id: rpcId,
                      error: {
                        code: -32602,
                        message: "Missing required param 'name' for prompts/get",
                      },
                    },
                    null,
                    2,
                  ),
                  {
                    status: 400,
                    headers: buildAgentApiHeaders(),
                  },
                );
              }
              try {
                const promptData = await getMcpPrompt(promptName, promptArgs);
                return new Response(
                  JSON.stringify(
                    {
                      jsonrpc: "2.0",
                      id: rpcId,
                      result: {
                        description: promptData.description,
                        messages: [
                          {
                            role: "user",
                            content: {
                              type: "text",
                              text: promptData.prompt,
                            },
                          },
                        ],
                      },
                    },
                    null,
                    2,
                  ),
                  {
                    status: 200,
                    headers: buildAgentApiHeaders(),
                  },
                );
              } catch (promptErr: any) {
                return new Response(
                  JSON.stringify(
                    {
                      jsonrpc: "2.0",
                      id: rpcId,
                      error: {
                        code: -32602,
                        message: promptErr?.message || "Prompt MCP não encontrado.",
                      },
                    },
                    null,
                    2,
                  ),
                  {
                    status: 400,
                    headers: buildAgentApiHeaders(),
                  },
                );
              }
            }

            if (method === "tools/call") {
              const toolName = body.params?.name || body.params?.tool;
              const toolArgs = body.params?.arguments || {};
              const storeId = body.params?.storeId || toolArgs?.storeId;
              const parsedRpc = McpToolCallRequestSchema.safeParse({
                tool: toolName,
                arguments: toolArgs,
                ...(storeId ? { storeId } : {}),
                ...(inboundAuthToken ? { authToken: inboundAuthToken } : {}),
              });

              if (!parsedRpc.success) {
                return new Response(
                  JSON.stringify(
                    {
                      jsonrpc: "2.0",
                      id: rpcId,
                      error: {
                        code: -32602,
                        message: "Invalid MCP tools/call params",
                        data: parsedRpc.error.issues,
                      },
                    },
                    null,
                    2,
                  ),
                  {
                    status: 400,
                    headers: buildAgentApiHeaders(),
                  },
                );
              }

              const rpcResult = await executeMcpToolCall(parsedRpc.data);
              return new Response(
                JSON.stringify(
                  {
                    jsonrpc: "2.0",
                    id: rpcId,
                    result: {
                      content: rpcResult.content,
                      isError: rpcResult.status === "error",
                      structuredContent: rpcResult,
                    },
                  },
                  null,
                  2,
                ),
                {
                  status: 200,
                  headers: buildAgentApiHeaders(),
                },
              );
            }

            return new Response(
              JSON.stringify(
                {
                  jsonrpc: "2.0",
                  id: rpcId,
                  error: {
                    code: -32601,
                    message: `Method '${method}' not found. Supported methods: initialize, ping, tools/list, tools/call, resources/list, resources/read, prompts/list, prompts/get.`,
                  },
                },
                null,
                2,
              ),
              {
                status: 400,
                headers: buildAgentApiHeaders(),
              },
            );
          }

          // 2. Suporte Direto REST ({ tool, arguments, storeId })
          const parsed = McpToolCallRequestSchema.safeParse({
            ...(body && typeof body === "object" ? body : {}),
            ...(inboundAuthToken && !body?.authToken ? { authToken: inboundAuthToken } : {}),
          });

          if (!parsed.success) {
            return new Response(
              JSON.stringify(
                {
                  status: "error",
                  error: "Invalid MCP Tool Call Payload",
                  details: parsed.error.issues,
                  hint: "Provide { tool: string, arguments: object } or a valid JSON-RPC 2.0 MCP message.",
                },
                null,
                2,
              ),
              {
                status: 400,
                headers: buildAgentApiHeaders(),
              },
            );
          }

          const result = await executeMcpToolCall(parsed.data);
          const isError = result.status === "error";

          let httpStatus = 200;
          if (isError) {
            const errorText = result.content?.[0]?.text || "";
            if (errorText.includes("403 Forbidden") || errorText.includes("multi-tenant")) {
              httpStatus = 403;
            } else if (errorText.includes("401 Unauthorized")) {
              httpStatus = 401;
            } else {
              httpStatus = 400;
            }
          }

          return new Response(JSON.stringify(result, null, 2), {
            status: httpStatus,
            headers: buildAgentApiHeaders(),
          });
        } catch (err: any) {
          return buildStructuredApiErrorResponse({
            status: 500,
            code: "MCP_DISPATCH_ERROR",
            message: err?.message || "Erro interno ao despachar ferramenta MCP.",
          });
        }
      },
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: buildAgentApiHeaders(),
        });
      },
    },
  },
} as never)
