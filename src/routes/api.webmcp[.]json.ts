import { createFileRoute } from "@tanstack/react-router";
import {
  MCP_TOOLS_MANIFEST,
  MCP_RESOURCES_MANIFEST,
  MCP_PROMPTS_MANIFEST,
} from "@/services/mcp-server.functions";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/api/webmcp.json")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);

        const manifest = {
          name: "Waesy Universal Commerce MCP Protocol",
          version: "2.2.0",
          description:
            "Especificação WebMCP oficial para descoberta, catálogo, simulação econométrica, propostas, turismo, contratos, logística e automação operacional com AI-Guards e isolamento multi-tenant estrito.",
          protocol: "model-context-protocol/v1",
          executionEndpoint: `${url.origin}/api/mcp/v1/tools/call`,
          securityModel: {
            standard: "Meta Ads & Stripe Restricted Scopes",
            tiers: {
              public: "Leitura pública sanitizada de produtos, empresas e frete sem exposição de margens",
              store_staff: "Operações restritas à loja autorizada com validação de sessão e assertStoreAccess",
              admin_only: "Operações restritas a administradores da plataforma",
            },
            isolationRule:
              "Tentativas de acesso cruzado entre empresas (cross-tenant) resultam em 403 Forbidden imediato e registro em log de auditoria.",
          },
          capabilities: {
            tools: true,
            resources: true,
            prompts: true,
          },
          toolsCount: MCP_TOOLS_MANIFEST.length,
          tools: MCP_TOOLS_MANIFEST.map((tool) => ({
            name: tool.name,
            module: tool.module,
            description: tool.description,
            tier: tool.tier,
            requiredScope: tool.requiredScope,
            idempotent: tool.idempotent ?? true,
            parameters: tool.inputSchema,
            endpoint: `${url.origin}/api/mcp/v1/tools/call`,
          })),
          resources: MCP_RESOURCES_MANIFEST.map((res) => ({
            uri: res.uri,
            name: res.name,
            description: res.description,
            mimeType: res.mimeType,
          })),
          prompts: MCP_PROMPTS_MANIFEST.map((prompt) => ({
            name: prompt.name,
            description: prompt.description,
            arguments: prompt.arguments,
          })),
        };

        return new Response(JSON.stringify(manifest, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
          },
        });
      },
    },
  },
} as never)
