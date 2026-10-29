import { createFileRoute } from "@tanstack/react-router";
import { MCP_TOOLS_MANIFEST } from "@/services/mcp-server.functions";
import { buildAgentApiHeaders, WAESY_SUNSET_DATE } from "@/lib/agentic/agentic-readiness-engine";

import type {} from "@tanstack/react-start";
export const Route = createFileRoute("/api/openapi.json")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);

        const openapiSpec = {
          openapi: "3.1.0",
          info: {
            title: "Waesy Universal Commerce, Local Marketplace & AI Protocol API",
            version: "2.2.0",
            description:
              "Especificação OpenAPI 3.1 canônica da plataforma Waesy (https://waesy.com.br). Integra descoberta comercial pública, diretório de empresas verificadas (Cartão CNPJ), portal de notícias regionais, feeds de sindicação (Google/Meta), webhooks transacionais e protocolo WebMCP (Streamable HTTP JSON-RPC 2.0) com 26 ferramentas derivadas, recursos e prompts para agentes autônomos sob isolamento multi-tenant Zero-Trust.",
            contact: {
              name: "Waesy Engineering & Developer Relations",
              url: "https://waesy.com.br/developers",
              email: "contato@waesy.com.br",
            },
            license: {
              name: "Waesy Platform API Terms & Deprecation Policy",
              url: "https://waesy.com.br/developers#deprecation-policy",
            },
            "x-deprecation-policy": {
              versioningStrategy: "URL path versioning (/api/v1/*, /api/mcp/v1/*) and X-API-Version response header.",
              deprecationHeader: "Deprecation",
              sunsetHeader: "Sunset",
              minimumNoticeDays: 180,
              policyUrl: "https://waesy.com.br/developers#deprecation-policy",
              currentSunsetHorizon: WAESY_SUNSET_DATE,
            },
            "x-rate-limit-policy": {
              publicTierLimitPerMinute: 120,
              staffTierLimitPerMinute: 600,
              headers: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "RateLimit-Policy", "Retry-After"],
            },
          },
          externalDocs: {
            description: "Waesy Developer Portal, CLI (@waesy/cli) & WebMCP Quickstart",
            url: "https://waesy.com.br/developers",
          },
          servers: [
            {
              url: "https://waesy.com.br",
              description: "Servidor Canônico de Produção Waesy",
            },
            {
              url: url.origin,
              description: "Servidor Ativo da Plataforma Waesy",
            },
          ],
          tags: [
            { name: "Public Discovery", description: "Endpoints REST públicos e sanitizados para agentes de IA e busca" },
            { name: "WebMCP", description: "Protocolo Model Context (Streamable HTTP) para Agentes de IA e Automação" },
            { name: "Catálogo & Produtos", description: "Busca pública, sindicação e dados cadastrais" },
            { name: "Diretório Comercial", description: "Perfis e reputação de empresas locais verificadas (CNPJ)" },
            { name: "Logística & Entregas", description: "Cotações de frete, cobertura de CEP e expedição" },
            { name: "Webhooks Transacionais", description: "Recepção idempotente de eventos externos (Marketplaces e Pix)" },
            { name: "Telemetria & Segurança", description: "Sentinela de telemetria e prevenção de intrusão" },
          ],
          paths: {
            "/api/v1/public/discovery": {
              get: {
                tags: ["Public Discovery", "Diretório Comercial"],
                summary: "Descoberta Pública do Ecossistema Waesy (REST v1)",
                description:
                  "Endpoint REST público e sanitizado para agentes de IA. Retorna categorias ativas, cidades atendidas, resumo de empresas verificadas, notícias públicas e catálogo de ferramentas WebMCP.",
                operationId: "getPublicEcosystemDiscovery",
                parameters: [
                  {
                    name: "city",
                    in: "query",
                    required: false,
                    description: "Filtrar descoberta por cidade (ex: Chapecó)",
                    schema: { type: "string", example: "Chapecó" },
                  },
                  {
                    name: "q",
                    in: "query",
                    required: false,
                    description: "Termo de busca opcional para filtrar categorias ou ferramentas",
                    schema: { type: "string" },
                  },
                ],
                responses: {
                  "200": {
                    description: "Snapshot público de descoberta retornado com sucesso",
                    content: {
                      "application/json": {
                        schema: {
                          $ref: "#/components/schemas/PublicDiscoveryResponse",
                        },
                      },
                    },
                  },
                  "429": {
                    description: "Limite de requisições excedido (Rate Limit)",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                      },
                    },
                  },
                },
              },
            },
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
                          $ref: "#/components/schemas/WebMcpManifestResponse",
                        },
                      },
                    },
                  },
                },
              },
            },
            "/api/mcp/v1/tools/call": {
              get: {
                tags: ["WebMCP"],
                summary: "Handshake e Descoberta do Servidor MCP (Streamable HTTP / SSE)",
                description: "Retorna metadados de capacidades do servidor MCP ou inicia stream SSE para clientes compatíveis com Model Context Protocol.",
                operationId: "getMcpServerHandshake",
                responses: {
                  "200": {
                    description: "Metadados de handshake MCP retornados com sucesso",
                    content: {
                      "application/json": {
                        schema: {
                          $ref: "#/components/schemas/McpServerHandshakeResponse",
                        },
                      },
                    },
                  },
                },
              },
              post: {
                tags: ["WebMCP"],
                summary: "Executar Ferramenta WebMCP ou JSON-RPC 2.0 (initialize, tools/list, tools/call)",
                description: "Despacha chamadas JSON-RPC 2.0 do protocolo MCP (Streamable HTTP) ou invocação direta de ferramentas com validação estrita Zod e isolamento multi-tenant.",
                operationId: "callWebMcpTool",
                security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }, {}],
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
                    description: "Ferramenta ou método JSON-RPC MCP executado com sucesso",
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
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                      },
                    },
                  },
                  "403": {
                    description: "Acesso negado: Violação de fronteira multi-tenant bloqueada",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                      },
                    },
                  },
                  "500": {
                    description: "Erro interno no servidor ao processar ferramenta",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                      },
                    },
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
                    content: {
                      "application/xml": {
                        schema: {
                          type: "string",
                          description: "Documento XML RSS 2.0 com namespace g: do Google Merchant Center",
                        },
                      },
                    },
                  },
                  "400": {
                    description: "Parâmetro store ausente ou inválido",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                      },
                    },
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
                    content: {
                      "text/csv": {
                        schema: {
                          type: "string",
                          description: "Arquivo CSV delimitado por vírgula com colunas id, title, description, availability, condition, price, link, image_link, brand",
                        },
                      },
                    },
                  },
                  "400": {
                    description: "Parâmetro store ausente ou inválido",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                      },
                    },
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
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        description: "Payload de evento enviado pelo marketplace externo",
                        additionalProperties: true,
                      },
                    },
                  },
                },
                responses: {
                  "200": {
                    description: "Webhook recebido e registrado na Inbox transacional",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/WebhookAckResponse" },
                      },
                    },
                  },
                  "400": {
                    description: "Payload inválido ou assinatura ausente",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                      },
                    },
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
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        description: "Notificação de liquidação PIX do PSP homologado",
                        additionalProperties: true,
                      },
                    },
                  },
                },
                responses: {
                  "200": {
                    description: "Evento PIX processado ou confirmado",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/WebhookAckResponse" },
                      },
                    },
                  },
                  "400": {
                    description: "Evento PIX malformado",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                      },
                    },
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
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        description: "Evento de rastreio logístico",
                        additionalProperties: true,
                      },
                    },
                  },
                },
                responses: {
                  "200": {
                    description: "Rastreamento atualizado com sucesso",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/WebhookAckResponse" },
                      },
                    },
                  },
                  "400": {
                    description: "Payload de rastreamento inválido",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                      },
                    },
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
                  "200": {
                    description: "Confirmação de callback OAuth processado",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/WebhookAckResponse" },
                      },
                    },
                  },
                  "302": {
                    description: "Redirecionamento para o Workspace de Integrações",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/WebhookAckResponse" },
                      },
                    },
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
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          eventType: { type: "string" },
                          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                          pathname: { type: "string" },
                        },
                      },
                    },
                  },
                },
                responses: {
                  "200": {
                    description: "Beacon de telemetria processado com sucesso",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/WebhookAckResponse" },
                      },
                    },
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
              PublicDiscoveryResponse: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["ok"] },
                  platform: { type: "string", example: "Waesy Local Marketplace & AI Ecosystem" },
                  version: { type: "string", example: "2.2.0" },
                  canonicalOrigin: { type: "string", example: "https://waesy.com.br" },
                  capabilities: {
                    type: "object",
                    properties: {
                      markdownNegotiation: { type: "boolean" },
                      mcpStreamableHttp: { type: "boolean" },
                      openApiVersion: { type: "string" },
                      publicToolsCount: { type: "integer" },
                    },
                  },
                  pillars: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        url: { type: "string" },
                        description: { type: "string" },
                      },
                    },
                  },
                  links: {
                    type: "object",
                    properties: {
                      developers: { type: "string" },
                      docs: { type: "string" },
                      openapi: { type: "string" },
                      webmcp: { type: "string" },
                      mcpEndpoint: { type: "string" },
                      llmsTxt: { type: "string" },
                      sitemap: { type: "string" },
                    },
                  },
                },
                required: ["status", "platform", "version", "canonicalOrigin", "pillars", "links"],
              },
              WebMcpManifestResponse: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  version: { type: "string" },
                  protocol: { type: "string" },
                  executionEndpoint: { type: "string" },
                  toolsCount: { type: "integer" },
                  tools: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        module: { type: "string" },
                        description: { type: "string" },
                        tier: { type: "string" },
                        parameters: { type: "object" },
                      },
                    },
                  },
                },
                required: ["name", "version", "protocol", "executionEndpoint", "tools"],
              },
              McpServerHandshakeResponse: {
                type: "object",
                properties: {
                  jsonrpc: { type: "string", example: "2.0" },
                  name: { type: "string", example: "Waesy MCP Server" },
                  version: { type: "string", example: "2.2.0" },
                  protocolVersion: { type: "string", example: "2024-11-05" },
                  transport: { type: "string", example: "streamable-http" },
                  endpoint: { type: "string", example: "/api/mcp/v1/tools/call" },
                  toolsCount: { type: "integer" },
                },
                required: ["name", "version", "protocolVersion", "transport", "endpoint"],
              },
              WebhookAckResponse: {
                type: "object",
                properties: {
                  status: { type: "string", example: "ok" },
                  received: { type: "boolean", example: true },
                  timestamp: { type: "string", format: "date-time" },
                },
                required: ["status", "received"],
              },
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
                  error: {
                    type: "object",
                    properties: {
                      code: { type: "string" },
                      message: { type: "string" },
                      hint: { type: "string" },
                      docs_url: { type: "string" },
                      http_status: { type: "integer" },
                    },
                  },
                  details: { type: "array", items: { type: "object" } },
                },
                required: ["status"],
              },
            },
          },
        };

        return new Response(JSON.stringify(openapiSpec, null, 2), {
          status: 200,
          headers: buildAgentApiHeaders({
            extraHeaders: {
              "Cache-Control": "public, max-age=3600",
            },
          }),
        });
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
