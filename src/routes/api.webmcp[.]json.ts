import { createFileRoute } from "@tanstack/react-router";
import { MCP_TOOLS_MANIFEST } from "@/services/mcp-server.functions";

export const Route = createFileRoute("/api/webmcp.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);

        const manifest = {
          name: "Waesy Universal Commerce MCP Protocol",
          version: "2.1.0",
          description:
            "Especificação WebMCP oficial para descoberta, catálogo, simulação econométrica e automação operacional com AI-Guards e isolamento multi-tenant estrito.",
          protocol: "model-context-protocol/v1",
          executionEndpoint: `${url.origin}/api/mcp/v1/tools/call`,
          securityModel: {
            standard: "Meta Ads & Stripe Restricted Scopes",
            tiers: {
              public: "Leitura pública sanitizada de produtos, empresas e frete sem exposição de margens",
              store_staff: "Operações restritas à loja autorizada com validação de sessão e assertStoreAccess",
              admin_only: "Operações restritas a administradores da plataforma"
            },
            isolationRule: "Tentativas de acesso cruzado entre empresas (cross-tenant) resultam em 403 Forbidden imediato e alerta de sentinela."
          },
          capabilities: {
            tools: true,
            resources: true,
            prompts: false,
          },
          tools: MCP_TOOLS_MANIFEST.map((tool) => ({
            name: tool.name,
            description: tool.description,
            tier: tool.tier,
            requiredScope: tool.requiredScope,
            parameters: tool.inputSchema,
            endpoint: `${url.origin}/api/mcp/v1/tools/call`,
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
});
