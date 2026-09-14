import { createFileRoute } from "@tanstack/react-router";
import { MCP_TOOLS_MANIFEST } from "@/services/mcp-server.functions";

export const Route = createFileRoute("/api/openapi.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);

        const openapiSpec = {
          openapi: "3.1.0",
          info: {
            title: "Waesy Universal Commerce & AI Protocol API",
            version: "2.1.0",
            description:
              "Especificação OpenAPI 3.1 canônica da plataforma Waesy. Integra descoberta comercial, catálogo distribuído, feeds de sindicação (Google/Meta), webhooks transacionais e protocolo WebMCP para agentes autônomos com barreiras de segurança multi-tenant (AI-Guards).",
            contact: {
              name: "Waesy Engineering Board",
              url: "https://usewaesy.pages.dev",
            },
          },
          servers: [
            {
              url: url.origin,
              description: "Servidor Ativo da Plataforma Waesy",
            },
          ],
          tags: [
            { name: "WebMCP", description: "Protocolo Model Context para Agentes de IA e Automação" },
            { name: "Catálogo & Produtos", description: "Busca pública, sindicação e dados cadastrais" },
            { name: "Diretório Comercial", description: "Perfis e reputação de empresas locais" },
            { name: "Logística & Entregas", description: "Cotações de frete, cobertura de CEP e expedição" },
            { name: "Webhooks Transacionais", description: "Recepção idempotente de eventos externos (Marketplaces e Pix)" },
            { name: "Telemetria & Segurança", description: "Sentinela de telemetria e prevenção de intrusão" },
          ],
          paths: {
            "/api/webmcp.json": {
              get: {
                tags: ["WebMCP"],
                summary: "Manifesto do Protocolo WebMCP",
                description: "Retorna a lista completa de ferramentas públicas e privadas do ecossistema Waesy com esquemas de entrada e requisitos de autorização.",
                operationId: "getWebMcpManifest",
                responses: {
                  "200": {
                    description: "Manifesto WebMCP válido",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            version: { type: "string" },
                            protocol: { type: "string" },
                            executionEndpoint: { type: "string" },
                            tools: { type: "array", items: { type: "object" } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "/api/mcp/v1/tools/call": {
              post: {
                tags: ["WebMCP"],
                summary: "Executar Ferramenta WebMCP (com AI-Guards)",
                description: "Despacha uma ferramenta MCP com validação estrita de tipos Zod e barreira inviolável de isolamento multi-tenant.",
                operationId: "callWebMcpTool",
                security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/McpToolCallRequest",
                      },
                    },
                  },
                },
                responses: {
                  "200": {
                    description: "Ferramenta executada com sucesso",
                    content: {
                      "application/json": {
                        schema: {
                          $ref: "#/components/schemas/McpToolCallResult",
                        },
                      },
                    },
                  },
                  "400": {
                    description: "Parâmetros inválidos ou schema incorreto",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                      },
                    },
                  },
                  "401": {
                    description: "Não autenticado para invocar ferramentas de staff de loja",
                  },
                  "403": {
                    description: "Acesso negado: Violação de fronteira multi-tenant bloqueada",
                  },
                  "500": {
                    description: "Erro interno no servidor ao processar ferramenta",
                  },
                },
              },
            },
            "/api/feed/xml": {
              get: {
                tags: ["Catálogo & Produtos"],
                summary: "Feed RSS XML para Google Merchant Center",
                description: "Gera feed dinâmico de produtos com GTIN, disponibilidade e preço em conformidade com as diretrizes do Google Shopping.",
                operationId: "getGoogleShoppingFeed",
                parameters: [
                  {
                    name: "store",
                    in: "query",
                    required: true,
                    description: "UUID da loja",
                    schema: { type: "string", format: "uuid" },
                  },
                ],
                responses: {
                  "200": {
                    description: "Feed RSS 2.0 XML em conformidade com Google Merchant",
                    content: { "application/xml": {} },
                  },
                },
              },
            },
            "/api/feed/meta.csv": {
              get: {
                tags: ["Catálogo & Produtos"],
                summary: "Feed CSV para Meta Commerce Manager (DPA)",
                description: "Gera catálogo CSV formatado para anúncios dinâmicos de produtos (DPA) no Instagram e Facebook.",
                operationId: "getMetaCatalogFeed",
                parameters: [
                  {
                    name: "store",
                    in: "query",
                    required: true,
                    description: "UUID da loja",
                    schema: { type: "string", format: "uuid" },
                  },
                ],
                responses: {
                  "200": {
                    description: "Feed CSV formatado com cabeçalhos Meta",
                    content: { "text/csv": {} },
                  },
                },
              },
            },
            "/api/webhooks/marketplaces": {
              post: {
                tags: ["Webhooks Transacionais"],
                summary: "Webhook Inbox de Marketplaces",
                description: "Endpoint com conciliação transacional idempotente para eventos de Mercado Livre, iFood, Shopee, Amazon e emissão fiscal.",
                operationId: "inboundMarketplaceWebhook",
                parameters: [
                  {
                    name: "platform",
                    in: "query",
                    required: true,
                    description: "Identificador da plataforma externa",
                    schema: { type: "string", example: "mercadolivre" },
                  },
                  {
                    name: "store_id",
                    in: "query",
                    required: false,
                    description: "UUID da loja recebedora",
                    schema: { type: "string", format: "uuid" },
                  },
                ],
                responses: {
                  "200": {
                    description: "Webhook recebido e registrado na Inbox transacional",
                    content: { "application/json": {} },
                  },
                },
              },
            },
            "/api/webhooks/pix": {
              post: {
                tags: ["Webhooks Transacionais"],
                summary: "Webhook Inbox de Liquidação PIX",
                description: "Recepção atômica de confirmações de pagamento via PIX (Pagar.me, Asaas, Mercado Pago) com RPC ACID idempotente.",
                operationId: "inboundPixWebhook",
                responses: {
                  "200": {
                    description: "Evento PIX processado ou confirmado",
                    content: { "application/json": {} },
                  },
                },
              },
            },
            "/api/webhooks/shipment": {
              post: {
                tags: ["Logística & Entregas"],
                summary: "Webhook de Atualização de Rastreio Logístico",
                description: "Atualizações de status de envio enviadas por Melhor Envio, Correios, Jadlog ou Loggi.",
                operationId: "inboundShipmentWebhook",
                responses: {
                  "200": {
                    description: "Rastreamento atualizado com sucesso",
                    content: { "application/json": {} },
                  },
                },
              },
            },
            "/api/auth/marketplace/callback": {
              get: {
                tags: ["Webhooks Transacionais"],
                summary: "OAuth 2.0 Callback de Marketplaces",
                description: "Recebe o código de autorização OAuth do Mercado Livre ou iFood para troca de access_token.",
                operationId: "marketplaceAuthCallback",
                parameters: [
                  {
                    name: "code",
                    in: "query",
                    required: true,
                    description: "Código de autorização OAuth retornado pelo provedor",
                    schema: { type: "string" },
                  },
                  {
                    name: "state",
                    in: "query",
                    required: true,
                    description: "Identificador de estado codificando storeId:platform",
                    schema: { type: "string" },
                  },
                ],
                responses: {
                  "302": {
                    description: "Redirecionamento para o Workspace de Integrações",
                  },
                },
              },
            },
            "/api/security-telemetry": {
              post: {
                tags: ["Telemetria & Segurança"],
                summary: "Telemetria de Sentinela de Segurança",
                description: "Recebe beacons assíncronos do sentinela client-side reportando anomalias ou tentativas de intrusão.",
                operationId: "reportSecurityTelemetry",
                responses: {
                  "200": {
                    description: "Beacon de telemetria processado com sucesso",
                  },
                },
              },
            },
          },
          components: {
            securitySchemes: {
              BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Token JWT de sessão do Supabase Auth.",
              },
              ApiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "X-API-Key",
                description: "Chave de API restrita por escopo concedida no Workspace de Integrações.",
              },
            },
            schemas: {
              McpToolCallRequest: {
                type: "object",
                properties: {
                  tool: {
                    type: "string",
                    description: "Nome exato da ferramenta MCP registrada no manifesto",
                    example: "search_catalog_products",
                  },
                  arguments: {
                    type: "object",
                    description: "Parâmetros validados conforme o schema da ferramenta",
                  },
                  storeId: {
                    type: "string",
                    format: "uuid",
                    description: "UUID da loja (obrigatório para ferramentas de Tier 2)",
                  },
                },
                required: ["tool", "arguments"],
              },
              McpToolCallResult: {
                type: "object",
                properties: {
                  tool: { type: "string" },
                  status: { type: "string", enum: ["success", "error"] },
                  content: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["text", "json"] },
                        text: { type: "string" },
                        data: { type: "object" },
                      },
                    },
                  },
                  executionMetrics: {
                    type: "object",
                    properties: {
                      durationMs: { type: "number" },
                      tier: { type: "string" },
                      tenantValidated: { type: "boolean" },
                    },
                  },
                },
                required: ["tool", "status", "content"],
              },
              ErrorResponse: {
                type: "object",
                properties: {
                  status: { type: "string", example: "error" },
                  message: { type: "string" },
                  details: { type: "array", items: { type: "object" } },
                },
                required: ["status", "message"],
              },
            },
          },
        };

        return new Response(JSON.stringify(openapiSpec, null, 2), {
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
