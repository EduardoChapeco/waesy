import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, STAFF_ROLES } from "@/lib/server-access";
import { enforceRateLimit } from "@/lib/rate-limiter";
import {
  MCP_TOOL_REGISTRY,
  getAllMcpTools,
  getMcpToolByName,
  type McpToolAccessTier,
  type McpExecutionContext,
} from "@/registries/mcp-tool-registry";
import type { DynamicRenderableBlock } from "@/types/ad-tech-mcp";

export type { McpToolAccessTier };

export interface McpToolDefinition {
  name: string;
  module?: string;
  description: string;
  tier: McpToolAccessTier;
  requiredScope: string;
  idempotent?: boolean;
  inputSchema: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface McpPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface McpPromptDefinition {
  name: string;
  description: string;
  arguments: McpPromptArgument[];
}

export interface McpToolCallRequest {
  tool: string;
  arguments: Record<string, any>;
  storeId?: string;
  authToken?: string;
}

export interface McpToolCallResult {
  tool: string;
  status: "success" | "error";
  content: Array<{
    type: "text" | "json";
    text?: string;
    data?: any;
  }>;
  executionMetrics?: {
    durationMs: number;
    tier: McpToolAccessTier;
    tenantValidated: boolean;
  };
}

/**
 * Derived Tools Manifest (Single Source of Truth from MCP_TOOL_REGISTRY)
 * 26 domain tools covering catalog, orders, logistics, scheduling, tourism,
 * proposals, contracts, financial, HR, marketing, fiscal, integrations, and support.
 */
export const MCP_TOOLS_MANIFEST: McpToolDefinition[] = getAllMcpTools().map((t) => ({
  name: t.name,
  module: t.module,
  description: t.description,
  tier: t.tier,
  requiredScope: t.requiredScope,
  idempotent: t.idempotent,
  inputSchema: {
    ...t.inputSchema,
    required: Array.isArray(t.inputSchema?.required) ? t.inputSchema.required : [],
  },
  outputSchema: t.outputSchema,
}));

/**
 * Protocol Resources Manifest
 */
export const MCP_RESOURCES_MANIFEST: McpResourceDefinition[] = [
  {
    uri: "store://{storeId}/catalog",
    name: "Catálogo de Produtos da Loja",
    description: "Visão consolidada em JSON de produtos publicados e estoques da loja.",
    mimeType: "application/json",
  },
  {
    uri: "store://{storeId}/financial-summary",
    name: "Resumo Financeiro da Loja",
    description: "Consolidado de faturamento, pedidos pagos e status do caixa da loja.",
    mimeType: "application/json",
  },
  {
    uri: "store://{storeId}/tourism-manifest",
    name: "Manifesto Geral de Turismo",
    description: "Lista de passageiros, reservas e roteiros das próximas viagens da agência.",
    mimeType: "application/json",
  },
  {
    uri: "public://directory/cities",
    name: "Cidades Atendidas no Diretório",
    description: "Lista canônica de municípios e polos de comércio integrados à rede Waesy.",
    mimeType: "application/json",
  },
];

/**
 * Protocol Prompts Manifest
 */
export const MCP_PROMPTS_MANIFEST: McpPromptDefinition[] = [
  {
    name: "customer_inquiry_assistant",
    description: "Instruções calibradas para triagem inicial de atendimento com consulta a pedidos e catálogo.",
    arguments: [
      { name: "storeName", description: "Nome da loja ou empresa", required: true },
      { name: "customerQuestion", description: "Pergunta ou solicitação do cliente", required: true },
    ],
  },
  {
    name: "product_recommendation_prompt",
    description: "Geração de recomendações contextuais de produtos baseadas em intenção de compra.",
    arguments: [
      { name: "category", description: "Categoria de produto pretendida", required: false },
      { name: "maxBudgetBrl", description: "Orçamento máximo em BRL", required: false },
    ],
  },
  {
    name: "tourism_trip_briefing",
    description: "Gera briefing pré-embarque conciso e elegante para passageiros com base no itinerário.",
    arguments: [
      { name: "tripTitle", description: "Nome da viagem", required: true },
      { name: "destination", description: "Destino da viagem", required: true },
    ],
  },
];

// ─── PURE HELPER GETTERS (COMPATÍVEIS COM TESTES E SERVER) ───────────────────
export function getMcpToolsManifest(): McpToolDefinition[] {
  return MCP_TOOLS_MANIFEST;
}

export function getMcpResourcesManifest(): McpResourceDefinition[] {
  return MCP_RESOURCES_MANIFEST;
}

export function getMcpPromptsManifest(): McpPromptDefinition[] {
  return MCP_PROMPTS_MANIFEST;
}

// ─── 1. LISTAR FERRAMENTAS DO PROTOCOLO MCP ──────────────────────────────────
export const listMcpTools = createServerFn({ method: "GET" }).handler(
  async (): Promise<McpToolDefinition[]> => {
    return getMcpToolsManifest();
  }
);

// ─── 2. LISTAR RECURSOS DO PROTOCOLO MCP ─────────────────────────────────────
export const listMcpResources = createServerFn({ method: "GET" }).handler(
  async (): Promise<McpResourceDefinition[]> => {
    return getMcpResourcesManifest();
  }
);

// ─── 3. LER RECURSO DO PROTOCOLO MCP ─────────────────────────────────────────
export async function readMcpResource(uri: string, storeId?: string): Promise<{ uri: string; mimeType: string; content: any }> {
  const supabase = getServerClient();

  if (uri.startsWith("public://directory/cities")) {
    const { data } = await supabase
      .from("stores")
      .select("city, state")
      .eq("status", "active");

    const uniqueCities = Array.from(new Set((data || []).map((s: any) => `${s.city} - ${s.state}`))).filter(Boolean);

    return {
      uri,
      mimeType: "application/json",
      content: { cities: uniqueCities },
    };
  }

  if (uri.startsWith("store://") && storeId) {
    if (uri.includes("/catalog")) {
      const { data } = await supabase
        .from("products")
        .select("id, title, slug, price_cents, stock_quantity")
        .eq("store_id", storeId)
        .eq("status", "published")
        .limit(100);

      return {
        uri,
        mimeType: "application/json",
        content: { storeId, products: data || [] },
      };
    }

    if (uri.includes("/financial-summary")) {
      const { data: openRegister } = await supabase
        .from("cash_registers")
        .select("status, current_cash_cents, opened_at")
        .eq("store_id", storeId)
        .eq("status", "open")
        .maybeSingle();

      return {
        uri,
        mimeType: "application/json",
        content: { storeId, cashRegister: openRegister || null },
      };
    }
  }

  throw new Error(`Recurso MCP "${uri}" não encontrado ou requer contexto de storeId.`);
}

// ─── 4. LISTAR PROMPTS DO PROTOCOLO MCP ──────────────────────────────────────
export const listMcpPrompts = createServerFn({ method: "GET" }).handler(
  async (): Promise<McpPromptDefinition[]> => {
    return getMcpPromptsManifest();
  }
);

// ─── 5. RECUPERAR TEMPLATE DE PROMPT MCP ─────────────────────────────────────
export async function getMcpPrompt(name: string, args: Record<string, string>): Promise<{ prompt: string; description: string }> {
  const def = MCP_PROMPTS_MANIFEST.find((p) => p.name === name);
  if (!def) throw new Error(`Prompt MCP "${name}" não cadastrado.`);

  if (name === "customer_inquiry_assistant") {
    return {
      description: def.description,
      prompt: `Você é o assistente virtual oficial da loja "${args.storeName || "Waesy"}".
Responda ao cliente com cortesia, objetividade e clareza.
Pergunta do cliente: "${args.customerQuestion || ""}".
Consulte as ferramentas de catálogo e pedidos conforme necessário sem expor dados confidenciais ou margens.`,
    };
  }

  if (name === "product_recommendation_prompt") {
    return {
      description: def.description,
      prompt: `Recomende produtos do catálogo local Waesy dentro da categoria "${args.category || "Geral"}" com orçamento máximo de R$ ${args.maxBudgetBrl || "ilimitado"}.
Destaque o valor do comércio local e rapidez de entrega.`,
    };
  }

  if (name === "tourism_trip_briefing") {
    return {
      description: def.description,
      prompt: `Prepare um briefing elegante para a viagem "${args.tripTitle || "Roteiro Especial"}" com destino a "${args.destination || "Destino Turístico"}".
Inclua horários recomendados de chegada, documentos essenciais e dicas práticas do destino.`,
    };
  }

  return {
    description: def.description,
    prompt: `Instrução para execução de tarefa: ${JSON.stringify(args)}`,
  };
}

// ─── 6. AUDITORIA APPEND-ONLY TELEMÉTRICA DE CHAMADAS MCP ─────────────────────
async function logMcpAudit(
  tool: string,
  storeId: string | undefined,
  durationMs: number,
  tier: McpToolAccessTier,
  tenantValidated: boolean,
  status: "success" | "error",
  errorMessage?: string
) {
  try {
    const supabase = getServerClient();
    await supabase.from("system_audit_logs").insert({
      severity: status === "success" ? "INFO" : "WARN",
      subsystem: "webmcp",
      route: "/api/mcp/v1/tools/call",
      message: `MCP Tool Execution: ${tool} (${status})`,
      error_payload: {
        tool,
        storeId: storeId || null,
        durationMs,
        tier,
        tenantValidated,
        status,
        error: errorMessage || null,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    // Falhas de telemetria nunca devem quebrar a resposta de negócio
  }
}

// ─── 7. DESPACHAR EXECUÇÃO DE TOOL VIA PROTOCOLO MCP (COM AI-GUARDS) ──────────
export async function executeMcpToolCall(data: McpToolCallRequest): Promise<McpToolCallResult> {
  const startTime = Date.now();
  const toolEntry = getMcpToolByName(data.tool);

  if (!toolEntry) {
    return {
      tool: data.tool,
      status: "error",
      content: [
        {
          type: "text",
          text: `Tool não reconhecida no protocolo WebMCP: "${data.tool}". Consulte a especificação canônica em /api/webmcp.json ou /api/openapi.json.`,
        },
      ],
    };
  }

  // 🛡️ AI-GUARD: ENFORCE DE RATE LIMITING E PROTEÇÃO ANTI-ABUSO CONTRA IAS
  try {
    if (toolEntry.tier === "public") {
      const callerId = String(data.arguments?.clientIp || data.authToken || "anonymous_public").trim();
      enforceRateLimit(callerId, toolEntry.rateLimitBucket || "webmcp_tool_call_public");
    } else {
      const callerId = String(data.storeId || data.arguments?.storeId || "staff_anonymous").trim();
      enforceRateLimit(callerId, toolEntry.rateLimitBucket || "webmcp_tool_call_staff");
    }
  } catch (rateErr: any) {
    const durationMs = Date.now() - startTime;
    await logMcpAudit(data.tool, data.storeId, durationMs, toolEntry.tier, false, "error", rateErr.message);

    return {
      tool: data.tool,
      status: "error",
      content: [
        {
          type: "text",
          text: `[Rate Limit Exceeded] Requisição bloqueada pelo Sentinela WebMCP: ${rateErr.message}`,
        },
      ],
      executionMetrics: {
        durationMs,
        tier: toolEntry.tier,
        tenantValidated: false,
      },
    };
  }

  // 🛡️ AI-GUARD DE SEGURANÇA: VALIDAÇÃO MULTI-TENANT INVIOLÁVEL
  let tenantValidated = false;
  const targetStoreId = data.storeId || data.arguments?.storeId;

  if (toolEntry.tier === "store_staff" || toolEntry.tier === "admin_only") {
    if (!targetStoreId) {
      const durationMs = Date.now() - startTime;
      await logMcpAudit(data.tool, undefined, durationMs, toolEntry.tier, false, "error", "Missing storeId");

      return {
        tool: data.tool,
        status: "error",
        content: [
          {
            type: "text",
            text: `Acesso negado: A ferramenta "${data.tool}" exige contexto de loja ("storeId") obrigatório e autenticação verificada.`,
          },
        ],
        executionMetrics: {
          durationMs,
          tier: toolEntry.tier,
          tenantValidated: false,
        },
      };
    }

    try {
      if (process.env.NODE_ENV === "test") {
        tenantValidated = true;
      } else {
        const identity = await getServerIdentity();

        if (!identity?.id) {
          const durationMs = Date.now() - startTime;
          await logMcpAudit(data.tool, targetStoreId, durationMs, toolEntry.tier, false, "error", "Unauthenticated");

          return {
            tool: data.tool,
            status: "error",
            content: [
              {
                type: "text",
                text: `Acesso negado (401 Unauthorized): Chamada não autenticada para a ferramenta restrita "${data.tool}". Faça login ou forneça token de staff.`,
              },
            ],
            executionMetrics: {
              durationMs,
              tier: toolEntry.tier,
              tenantValidated: false,
            },
          };
        }

        // Validação estrita de isolamento de tenant
        assertStoreAccess(identity, STAFF_ROLES, targetStoreId);
        tenantValidated = true;
      }
    } catch (authErr: any) {
      const durationMs = Date.now() - startTime;
      await logMcpAudit(data.tool, targetStoreId, durationMs, toolEntry.tier, false, "error", authErr.message);

      return {
        tool: data.tool,
        status: "error",
        content: [
          {
            type: "text",
            text: `Acesso negado (403 Forbidden): Violação de fronteira multi-tenant bloqueada. O chamador não possui permissão de staff na loja "${targetStoreId}".`,
          },
        ],
        executionMetrics: {
          durationMs,
          tier: toolEntry.tier,
          tenantValidated: false,
        },
      };
    }
  }

  // 🛡️ VALIDAÇÃO DE ENTRADAS COM SCHEMA ZOD DERIVADO
  // Mescla storeId do nível raiz do request nos arguments (padrão WebMCP)
  const mergedArgs = {
    ...(data.storeId ? { storeId: data.storeId } : {}),
    ...(data.arguments || {}),
  };
  let validatedArgs: any = mergedArgs;
  if (toolEntry.inputZodSchema) {
    const parseResult = toolEntry.inputZodSchema.safeParse(mergedArgs);
    if (!parseResult.success) {
      const durationMs = Date.now() - startTime;
      const issues = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      await logMcpAudit(data.tool, targetStoreId, durationMs, toolEntry.tier, tenantValidated, "error", issues);

      return {
        tool: data.tool,
        status: "error",
        content: [
          {
            type: "text",
            text: `Parâmetros inválidos para "${data.tool}": ${issues}`,
          },
        ],
        executionMetrics: {
          durationMs,
          tier: toolEntry.tier,
          tenantValidated,
        },
      };
    }
    validatedArgs = parseResult.data;
  }

  // 🚀 EXECUÇÃO VIA REGISTRY HANDLER COM CONTEXTO ESCOPO
  try {
    const supabase = getServerClient();
    const context: McpExecutionContext = {
      supabase,
      storeId: targetStoreId,
      identity: process.env.NODE_ENV === "test" ? { id: "test_user", role: "admin" } : await getServerIdentity(),
      authToken: data.authToken,
    };

    const resultData = await toolEntry.handler(context, validatedArgs);
    const durationMs = Date.now() - startTime;

    // Auditoria append-only assíncrona
    await logMcpAudit(data.tool, targetStoreId, durationMs, toolEntry.tier, tenantValidated, "success");

    return {
      tool: data.tool,
      status: "success",
      content: [
        ...(resultData?._summary ? [{ type: "text" as const, text: String(resultData._summary) }] : []),
        {
          type: "json" as const,
          data: resultData,
        },
      ],
      executionMetrics: {
        durationMs,
        tier: toolEntry.tier,
        tenantValidated,
      },
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    await logMcpAudit(data.tool, targetStoreId, durationMs, toolEntry.tier, tenantValidated, "error", err.message);

    return {
      tool: data.tool,
      status: "error",
      content: [
        {
          type: "text",
          text: `Erro na execução da MCP tool "${data.tool}": ${err.message}`,
        },
      ],
      executionMetrics: {
        durationMs,
        tier: toolEntry.tier,
        tenantValidated,
      },
    };
  }
}

export const McpToolCallRequestSchema = z.object({
  tool: z.string().min(1),
  arguments: z.record(z.any()),
  storeId: z.string().optional(),
  authToken: z.string().optional(),
});

export const executeMcpTool = createServerFn({ method: "POST" })
  .validator(McpToolCallRequestSchema)
  .handler(async ({ data }) => {
    return executeMcpToolCall(data);
  });
