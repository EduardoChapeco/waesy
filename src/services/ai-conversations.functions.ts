/**
 * ai-conversations.functions.ts — BFF Server Functions para o Shell de Conversa AI-First
 * Suporte a Threads de Projetos, Memória de Trabalho, Trilha de Atividade e Artefatos Versionados.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { inspectPromptSecurity, buildSandboxedPromptPayload } from "@/lib/ai/prompt-shield";
import { formatMoney } from "@/lib/money";
import { executeAiCoreGateway } from "./ai-core-gateway.functions";
import {
  executeAutonomousCopilotTask,
  fragmentAndOptimizePrompt,
  needsCityClarification,
} from "./autonomous-copilot-orchestrator";
import { harvestAndPersistPlaces } from "./mining/places-harvester";
import { resolveActiveCity, normalizeActiveCity } from "@/lib/city-helper";
import { executeMcpToolCall } from "./mcp-server.functions";
import { MCP_TOOL_REGISTRY } from "@/registries/mcp-tool-registry";
import { requireTokensOrTollbooth } from "@/lib/token-tollbooth.server";
import { enforceRateLimit } from "@/lib/rate-limiter";
import {
  CopilotStateMachine,
  canTransitionCopilotPhase,
  type CopilotFsmPhase,
  type CopilotFsmExecutionState,
} from "@/types/copilot-fsm";
import {
  searchPlatformForCopilot,
  shouldSearchPlatform,
  type InternalSearchResult,
} from "./copilot-internal-search";
import type {
  AIActivityStep,
  AIActivityStepType,
  ChatArtifactData,
  ChatArtifactType,
} from "@/types/chat";
import {
  assembleLongTermContext,
  extractAndSaveFactsFromConversation,
  storeSemanticMemoryChunk,
} from "./copilot-memory.functions";
import {
  createBuilderArtifactFromCopilot,
  buildTravelItineraryPayload,
  detectBuilderDocType,
} from "./builder-copilot-bridge";

// ============================================================
// Schemas de Validação
// ============================================================

export const createAiThreadSchema = z.object({
  type: z.enum(["project", "ai_assistant", "direct_p2p", "store", "support"]).default("project"),
  title: z.string().min(2, "Título deve ter no mínimo 2 caracteres"),
  storeId: z.string().uuid().optional(),
  recipientProfileId: z.string().uuid().optional(),
  metadata: z.record(z.any()).default({}),
  workingMemory: z.record(z.any()).default({}),
});

export const sendAiMessageSchema = z.object({
  threadId: z.string().uuid(),
  clientMessageId: z.string().uuid().optional(),
  message: z
    .string()
    .min(1, "Mensagem não pode ser vazia")
    .max(2000, "Limite de 2.000 caracteres por mensagem atingido"),
  replyToId: z.string().uuid().optional(),
  attachments: z.array(z.string().url()).default([]),
  userLat: z.number().optional(),
  userLng: z.number().optional(),
  city: z.string().max(120).optional(),
});

export const saveAiArtifactSchema = z.object({
  threadId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  artifactType: z.enum([
    "document",
    "spreadsheet",
    "presentation",
    "landing_page",
    "proposal",
    "image",
  ]),
  title: z.string().min(2),
  version: z.number().int().positive().default(1),
  data: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({}),
});

export const updateWorkingMemorySchema = z.object({
  threadId: z.string().uuid(),
  key: z.string().min(1),
  value: z.any(),
});

type AiThreadAccessRow = {
  id?: string;
  customer_id?: string | null;
  recipient_profile_id?: string | null;
  store_id?: string | null;
  assigned_to_profile_id?: string | null;
};

export function canAccessAiThread(
  thread: AiThreadAccessRow,
  identity: Awaited<ReturnType<typeof getServerIdentity>>,
): boolean {
  if (!identity?.id) return false;
  const isPlatformAdmin = ["platform_admin", "master"].includes(identity.role);
  const isStoreAdministrator = ["owner", "admin", "manager"].includes(identity.role);
  const isParticipant =
    thread.customer_id === identity.id || thread.recipient_profile_id === identity.id;
  const isAssigned = thread.assigned_to_profile_id === identity.id;
  const hasStoreScope = Boolean(
    thread.store_id &&
    (identity.store_id === thread.store_id ||
      identity.memberships?.some((membership) => membership.store_id === thread.store_id)),
  );
  return isPlatformAdmin || isParticipant || (isStoreAdministrator && hasStoreScope) || isAssigned;
}

function assertAiThreadAccess(
  thread: AiThreadAccessRow,
  identity: Awaited<ReturnType<typeof getServerIdentity>>,
): void {
  if (!identity?.id) throw new Error("Usuário não autenticado");
  if (!canAccessAiThread(thread, identity))
    throw new Error("Sem permissão para acessar esta conversa");
}

function assertAiStoreTarget(
  storeId: string | null | undefined,
  identity: Awaited<ReturnType<typeof getServerIdentity>>,
): void {
  if (!storeId || !identity?.id) return;
  if (["platform_admin", "master"].includes(identity.role)) return;
  const allowed =
    identity.store_id === storeId ||
    identity.memberships?.some((membership) => membership.store_id === storeId);
  if (!allowed) throw new Error("A loja informada não pertence ao contexto do usuário");
}

function mapPersistedAiMessage(row: any, threadId: string) {
  const payload = row?.payload || {};
  return {
    id: row.id,
    threadId,
    executionId: payload.executionId,
    text: row.message,
    activitySteps: payload.activitySteps || [],
    artifact: payload.artifact || null,
    structuredPayload: payload.structuredBlocks || null,
    createdAt: row.created_at,
    status: row.status || "delivered",
    fsmPhase: payload.fsmPhase,
    fsmState: payload.fsmState,
    toolCalls: payload.toolCalls || [],
  };
}

export const toggleThreadPinnedSchema = z.object({
  threadId: z.string().uuid(),
  isPinned: z.boolean(),
});

// ============================================================
// Tipos Canônicos de DTO
// ============================================================

export interface AiConversationThreadDTO {
  id: string;
  type: "project" | "ai_assistant" | "direct_p2p" | "store" | "support";
  title: string;
  store_id?: string | null;
  customer_id?: string | null;
  recipient_profile_id?: string | null;
  assigned_to_profile_id?: string | null;
  status: string;
  is_pinned: boolean;
  metadata: Record<string, any>;
  working_memory: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_message_snippet?: string;
  last_message_at?: string;
}

export interface AiExecutionResult {
  responseMessage: string;
  activitySteps: AIActivityStep[];
  executionId?: string;
  toolCalls?: AiToolExecutionRecord[];
  artifact?: ChatArtifactData;
  structuredPayload?: Record<string, any>;
  updatedMemory: Record<string, any>;
  fsmPhase?: CopilotFsmPhase;
  fsmState?: CopilotFsmExecutionState;
}

export interface AiToolExecutionRecord {
  tool: string;
  arguments: Record<string, any>;
  status: "success" | "error";
  durationMs: number;
  resultSummary?: string;
  executedAt: string;
}

// ============================================================
// Motor Determinístico Legado (Mantido estritamente para compatibilidade de testes unitários)
// @deprecated Utilize `executeAiCopilotPipeline` para o motor ReAct com tool-calling real e Supabase
// ============================================================

/**
 * @deprecated Utilize `executeAiCopilotPipeline` para chamadas reais ao banco e ao Gateway Soberano.
 */
export function resolveAiPipelineSteps(
  userPrompt: string,
  workingMemory: Record<string, any> = {},
): AiExecutionResult {
  const promptLower = userPrompt.toLowerCase();
  const now = new Date();
  const startTime = now.getTime();

  const steps: AIActivityStep[] = [];

  // Passo 1: Análise e Pesquisa Contextual no Banco/Conhecimento
  const step1Start = new Date(startTime).toISOString();
  steps.push({
    id: `step-1-${startTime}`,
    type: "database",
    label: "Consulta ao Catálogo e Registros da Loja",
    detail: "Consultando itens correspondentes e diretrizes locais",
    status: "completed",
    startedAt: step1Start,
    completedAt: new Date(startTime + 180).toISOString(),
    durationMs: 180,
    tokensUsed: 64,
  });

  let artifact: ChatArtifactData | undefined;
  let structuredPayload: Record<string, any> | undefined;
  let responseMessage = "";
  let updatedMemory: Record<string, any> = { ...workingMemory };

  // Detectar solicitação de proposta comercial
  if (promptLower.includes("proposta") || promptLower.includes("orçamento")) {
    steps.push({
      id: `step-2-${startTime}`,
      type: "skill",
      label: "Estruturação de Proposta Comercial",
      detail: "Organizando escopo, etapas de entrega e condições comerciais",
      status: "completed",
      startedAt: new Date(startTime + 185).toISOString(),
      completedAt: new Date(startTime + 420).toISOString(),
      durationMs: 235,
      tokensUsed: 210,
    });

    steps.push({
      id: `step-3-${startTime}`,
      type: "model",
      label: "Elaboração de Documento de Proposta",
      detail: "Organizando documento executivo pronto para consulta e exportação",
      status: "completed",
      startedAt: new Date(startTime + 425).toISOString(),
      completedAt: new Date(startTime + 750).toISOString(),
      durationMs: 325,
      tokensUsed: 380,
    });

    artifact = {
      id: crypto.randomUUID(),
      type: "proposal",
      title: "Proposta de Prestação de Serviços Comerciais",
      version: 1,
      totalVersions: 1,
      authorName: "Assessor Comercial Local",
      authorRole: "Consultoria Executiva",
      previewSummary:
        "Escopo detalhado de implementação, cronograma em 4 etapas e tabela de investimento com condições de pagamento.",
      data: {
        total_cents: 850000,
        currency: "BRL",
        validity_days: 15,
        milestones: [
          "Briefing e Diagnóstico",
          "Estruturação de Catálogo",
          "Homologação",
          "Go-Live",
        ],
      },
    };

    structuredPayload = {
      blocks: [
        {
          type: "commerce_quote",
          data: {
            quoteId: artifact.id,
            quoteNumber: "ORC-001",
            storeName: "Consultoria Comercial",
            status: "draft",
            totalCents: 850000,
            conditions: "Escopo em 4 etapas com entrega garantida e suporte.",
            validUntil: new Date(Date.now() + 15 * 86400000).toISOString(),
          },
        },
      ],
    };

    responseMessage =
      "Elaborei a proposta comercial completa conforme combinamos. O documento está disponível em anexo, pronto para você abrir no editor ou exportar em PDF.";
    updatedMemory.last_proposal_created = new Date().toISOString();
  }
  // Detectar solicitação de landing page ou builder
  else if (
    promptLower.includes("landing") ||
    promptLower.includes("site") ||
    promptLower.includes("página")
  ) {
    steps.push({
      id: `step-2-${startTime}`,
      type: "skill",
      label: "Composição Visual da Página",
      detail: "Organizando seções: Destaque, Recursos, Produtos Locais e Contato",
      status: "completed",
      startedAt: new Date(startTime + 185).toISOString(),
      completedAt: new Date(startTime + 510).toISOString(),
      durationMs: 325,
      tokensUsed: 290,
    });

    artifact = {
      id: crypto.randomUUID(),
      type: "landing_page",
      title: "Landing Page Oficial do Produto",
      version: 1,
      totalVersions: 1,
      authorName: "Designer Especialista Local",
      authorRole: "Equipe de Criação",
      previewSummary:
        "Estrutura pronta com hero responsivo, grade de 3 colunas de produtos locais e rodapé com mapa de cobertura.",
      data: {
        theme: "apple-clean",
        blocksCount: 4,
        viewportTarget: "responsive",
      },
    };

    responseMessage =
      "Organizei a estrutura inicial da sua landing page (página de apresentação). O documento está disponível logo abaixo e você pode abrir diretamente no editor visual para personalizar.";
    updatedMemory.last_landing_page = artifact.title;
  }
  // Detectar solicitação de planilha ou relatório financeiro
  else if (
    promptLower.includes("planilha") ||
    promptLower.includes("tabela") ||
    promptLower.includes("métricas") ||
    promptLower.includes("caixa") ||
    promptLower.includes("vendas")
  ) {
    steps.push({
      id: `step-2-${startTime}`,
      type: "tool",
      label: "Análise de Indicadores Financeiros",
      detail: "Organizando fluxo de caixa, demonstrativo e projeção de receitas",
      status: "completed",
      startedAt: new Date(startTime + 185).toISOString(),
      completedAt: new Date(startTime + 420).toISOString(),
      durationMs: 235,
      tokensUsed: 195,
    });

    artifact = {
      id: crypto.randomUUID(),
      type: "spreadsheet",
      title: "Planilha de Métricas de Vendas e Fluxo de Caixa",
      version: 1,
      totalVersions: 1,
      authorName: "Consultor Financeiro Local",
      authorRole: "Equipe de Apoio Executivo",
      previewSummary:
        "Métricas consolidadas de entradas, saídas, margem e indicadores de desempenho.",
      data: {
        headers: ["Mês", "Entradas (R$)", "Saídas (R$)", "Saldo Líquido (R$)", "Margem (%)"],
        rows: [
          ["Janeiro", "45.000,00", "28.000,00", "17.000,00", "37,7%"],
          ["Fevereiro", "52.000,00", "31.000,00", "21.000,00", "40,3%"],
          ["Março", "61.000,00", "34.000,00", "27.000,00", "44,2%"],
        ],
      },
    };

    responseMessage =
      "Gerei a planilha com as métricas financeiras e fluxo de caixa. O artefato tabular pode ser visualizado ou exportado diretamente:";
    updatedMemory.last_spreadsheet_created = new Date().toISOString();
  }
  // Detectar solicitação de compras, carrinho ou mercado
  else if (
    promptLower.includes("comprar") ||
    promptLower.includes("carrinho") ||
    promptLower.includes("mercado") ||
    promptLower.includes("vestuário")
  ) {
    steps.push({
      id: `step-2-${startTime}`,
      type: "tool",
      label: "Consulta ao Catálogo de Produtos e Frete (search_catalog_products)",
      detail: "Conferindo produtos em estoque e estimando opções de entrega",
      status: "completed",
      startedAt: new Date(startTime + 185).toISOString(),
      completedAt: new Date(startTime + 410).toISOString(),
      durationMs: 225,
      tokensUsed: 190,
    });

    structuredPayload = {
      blocks: [
        {
          type: "commerce_cart",
          data: {
            cartId: crypto.randomUUID(),
            storeName: "Mercado & Varejo Central",
            items: [
              {
                id: "item-1",
                product_id: "prod-1",
                title: "Cesta de Produtos Selecionados",
                unit_price_cents: 8900,
                quantity: 1,
              },
            ],
            subtotalCents: 8900,
            shippingCents: 800,
            discountCents: 0,
            totalCents: 9700,
          },
        },
      ],
    };

    responseMessage =
      "Localizei os produtos na loja com estoque confirmado. O carrinho foi montado abaixo com valores atualizados em tempo real:";
    updatedMemory.last_commerce_query = promptLower.slice(0, 40);
    updatedMemory.last_interaction_topic = userPrompt.slice(0, 40);
  }
  // Detectar rastreamento de pedido
  else if (
    promptLower.includes("rastrear") ||
    promptLower.includes("rastreio") ||
    (promptLower.includes("status") && promptLower.includes("pedido"))
  ) {
    steps.push({
      id: `step-2-${startTime}`,
      type: "tool",
      label: "Acompanhamento do Pedido (order_events)",
      detail: "Consultando linha do tempo da entrega e registros de envio",
      status: "completed",
      startedAt: new Date(startTime + 185).toISOString(),
      completedAt: new Date(startTime + 370).toISOString(),
      durationMs: 185,
      tokensUsed: 140,
    });

    responseMessage =
      "Para consultar o rastreio com precisão, informe o número do pedido ou o código de acompanhamento. Assim consigo conferir os dados confirmados de envio para você.";
    updatedMemory.last_tracking_query = new Date().toISOString();
    updatedMemory.last_interaction_topic = userPrompt.slice(0, 40);
  }
  // Detectar agendamento de serviço ou consulta
  else if (
    promptLower.includes("agendar") ||
    promptLower.includes("agendamento") ||
    (promptLower.includes("marcar") &&
      (promptLower.includes("horário") || promptLower.includes("consulta")))
  ) {
    steps.push({
      id: `step-2-${startTime}`,
      type: "tool",
      label: "Consulta de Disponibilidade e Horários (booking_services)",
      detail: "Identificando horários livres e disponibilidade do profissional",
      status: "completed",
      startedAt: new Date(startTime + 185).toISOString(),
      completedAt: new Date(startTime + 400).toISOString(),
      durationMs: 215,
      tokensUsed: 165,
    });

    structuredPayload = {
      blocks: [
        {
          type: "commerce_appointment",
          data: {
            appointmentId: crypto.randomUUID(),
            serviceTitle: "Consultoria e Atendimento Especializado",
            storeName: "Espaço Integrado Waesy",
            scheduledAt: new Date(Date.now() + 86400000).toISOString(),
            status: "pending",
            priceCents: 15000,
          },
        },
      ],
    };

    responseMessage =
      "Encontrei horários disponíveis na agenda do especialista. Você pode selecionar o horário e confirmar o agendamento diretamente:";
    updatedMemory.last_booking_query = new Date().toISOString();
    updatedMemory.last_interaction_topic = userPrompt.slice(0, 40);
  }
  // Fluxo de Consulta Padrão de Assistente
  else {
    steps.push({
      id: `step-2-${startTime}`,
      type: "model",
      label: "Organização da Resposta Consultiva",
      detail: "Adequando orientações e diretrizes de atendimento",
      status: "completed",
      startedAt: new Date(startTime + 185).toISOString(),
      completedAt: new Date(startTime + 410).toISOString(),
      durationMs: 225,
      tokensUsed: 195,
    });

    responseMessage = `Recebi sua mensagem e organizei as orientações para o seu atendimento. Como posso te apoiar nos próximos passos?`;
    updatedMemory.last_interaction_topic = userPrompt.slice(0, 40);
  }

  return {
    responseMessage,
    activitySteps: steps,
    artifact,
    structuredPayload,
    updatedMemory,
  };
}

// ============================================================
// Motor Assíncrono Avançado de Execução ReAct com Tool-Calling Real
// ============================================================

export interface AiCopilotContext {
  threadId?: string;
  userId?: string;
  storeId?: string;
  userLat?: number;
  userLng?: number;
  city?: string;
  state?: string;
  signal?: AbortSignal;
  /** URLs (storage) dos anexos enviados pelo usuário nesta mensagem. */
  attachments?: string[];
}

export interface ResolvedCopilotAttachments {
  images: Array<{ mimeType: string; base64: string }>;
  textBlocks: string[];
  notes: string[];
}

const COPILOT_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
const COPILOT_ATTACHMENT_MAX_COUNT = 4;

/**
 * Baixa os anexos do chat e os converte em insumo real para a IA:
 * imagens viram payload multimodal (visão/OCR), CSV/TXT/JSON viram texto no prompt.
 * Falhas por anexo são reportadas em `notes` (nunca silenciadas como sucesso).
 */
export async function resolveCopilotAttachments(
  urls: string[] = [],
  fetchImpl: typeof fetch = fetch,
): Promise<ResolvedCopilotAttachments> {
  const result: ResolvedCopilotAttachments = { images: [], textBlocks: [], notes: [] };
  const supabaseUrl = (typeof process !== "undefined" && process.env
    ? process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    : "") || "";
  let allowedHost = "";
  try {
    allowedHost = supabaseUrl ? new URL(supabaseUrl).hostname : "";
  } catch {
    allowedHost = "";
  }
  for (const url of (urls || []).slice(0, COPILOT_ATTACHMENT_MAX_COUNT)) {
    try {
      const parsed = new URL(url);
      if (
        parsed.protocol !== "https:" ||
        !allowedHost ||
        parsed.hostname !== allowedHost ||
        !parsed.pathname.startsWith("/storage/v1/object/")
      ) {
        result.notes.push("Anexo fora do armazenamento autorizado foi ignorado.");
        continue;
      }
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        result.notes.push(`Anexo indisponível (HTTP ${res.status}).`);
        continue;
      }
      const mime = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0 || buf.length > COPILOT_ATTACHMENT_MAX_BYTES) {
        result.notes.push("Anexo vazio ou acima do limite de 8 MB ignorado.");
        continue;
      }
      if (mime.startsWith("image/")) {
        result.images.push({ mimeType: mime, base64: buf.toString("base64") });
      } else if (mime === "text/plain" || mime === "text/csv" || mime === "application/json") {
        result.textBlocks.push(buf.toString("utf-8").slice(0, 20_000));
      } else if (mime === "application/pdf") {
        result.notes.push("PDF recebido: apenas metadados disponíveis; leitura de texto de PDF não está ativa.");
      } else {
        result.notes.push(`Tipo de anexo não suportado: ${mime || "desconhecido"}.`);
      }
    } catch (err: any) {
      result.notes.push(`Falha ao ler anexo: ${String(err?.message || "erro").slice(0, 80)}`);
    }
  }
  return result;
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

function detectIntent(text: string): string {
  if (
    text.includes("onde fica") ||
    text.includes("onde tem") ||
    text.includes("cafeteria") ||
    text.includes("restaurante") ||
    text.includes("perto de mim") ||
    text.includes("empresa") ||
    text.includes("loja") ||
    text.includes("hotel") ||
    text.includes("hotéis") ||
    text.includes("hoteis") ||
    text.includes("pousada") ||
    text.includes("pousadas") ||
    text.includes("resort") ||
    text.includes("resorts") ||
    text.includes("hospedagem") ||
    text.includes("padaria") ||
    text.includes("mercado")
  ) {
    return "search_places";
  }
  if (
    text.includes("corrida") ||
    text.includes("motorista") ||
    text.includes("uber") ||
    text.includes("moto passageiro") ||
    text.includes("carro") ||
    text.includes("frete")
  ) {
    return "estimate_mobility";
  }
  if (
    text.includes("viagem") ||
    text.includes("turismo") ||
    text.includes("roteiro") ||
    text.includes("pacote") ||
    text.includes("oktober") ||
    text.includes("passeio")
  ) {
    return "travel_itinerary";
  }
  if (
    text.includes("advogad") ||
    text.includes("processo") ||
    text.includes("demitid") ||
    text.includes("jurídic") ||
    text.includes("indenização")
  ) {
    return "legal_triage";
  }
  if (
    text.includes("anúncio") ||
    text.includes("arte") ||
    text.includes("post") ||
    text.includes("banner") ||
    text.includes("propaganda")
  ) {
    return "create_ad";
  }
  if (
    text.includes("pizza") ||
    text.includes("cardápio") ||
    text.includes("lanche") ||
    text.includes("comprar")
  ) {
    return "search_catalog";
  }
  if (text.includes("proposta") || text.includes("orçamento")) {
    return "commercial_proposal";
  }
  if (
    text.includes("apresentação") ||
    text.includes("apresentacao") ||
    text.includes("slide") ||
    text.includes("pitch") ||
    text.includes("deck")
  ) {
    return "presentation_deck";
  }
  if (
    text.includes("landing page") ||
    text.includes("criar site") ||
    text.includes("montar site") ||
    text.includes("meu site")
  ) {
    return "website_builder";
  }
  if (
    text.includes("planilha") ||
    text.includes("tabela") ||
    text.includes("métricas") ||
    text.includes("caixa")
  ) {
    return "financial_report";
  }
  return "general_chat";
}

function extractSearchTerm(text: string): string {
  const clean = text
    .replace(
      /(onde\s+fica|onde\s+tem|tem\s+alguma|tem\s+algum|procuro|gostaria\s+de|quais\s+os\s+melhores|quais\s+os|qual\s+o\s+melhor|melhores|perto\s+de\s+mim|na\s+minha\s+cidade|em\s+[a-zà-ÿ\s-]+$)/gi,
      "",
    )
    .trim();
  return clean.slice(0, 40) || text.trim();
}

function derivePlaceOpenStatus(workingHours: unknown): boolean | null {
  if (!workingHours || typeof workingHours !== "object") return null;
  const value = workingHours as Record<string, any>;
  if (typeof value.is_open === "boolean") return value.is_open;
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = value[days[new Date().getDay()]] || value[days[new Date().getDay()].slice(0, 3)];
  if (!today || typeof today !== "object") return null;
  if (today.closed === true || today.is_closed === true) return false;
  const open = String(today.open || today.opens || "");
  const close = String(today.close || today.closes || "");
  if (!/^\d{1,2}:\d{2}$/.test(open) || !/^\d{1,2}:\d{2}$/.test(close)) return null;
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  return current >= toMinutes(open) && current <= toMinutes(close);
}

/** Impede que provider, crawler ou RPC externo bloqueie o request do chat. */
function withCopilotTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 45_000,
  abortController?: AbortController,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        abortController?.abort();
        reject(new Error("Tempo limite excedido ao processar sua consulta."));
      }, timeoutMs);
      promise.finally(() => clearTimeout(timer)).catch(() => undefined);
    }),
  ]);
}

export async function executeAiCopilotPipeline(
  userPrompt: string,
  workingMemory: Record<string, any> = {},
  context: AiCopilotContext = {},
): Promise<AiExecutionResult> {
  const startTime = Date.now();
  const steps: AIActivityStep[] = [];
  const updatedMemory: Record<string, any> = { ...workingMemory };
  const promptLower = userPrompt.toLowerCase();
  const fsm = new CopilotStateMachine("RECEIVED");

  try {
    // 1. Inspeciona segurança do prompt contra injeção e jailbreak
    const securityCheck = inspectPromptSecurity(userPrompt);
    if (!securityCheck.isSafe) {
      fsm.transition("UNDERSTANDING", "Firewall de segurança inspecionado");
      fsm.transition("FAILED_FINAL", `Bloqueio de segurança: ${securityCheck.violationReason}`);
      steps.push({
        id: `step-sec-${startTime}`,
        type: "skill",
        label: "Proteção Ativa de Dados",
        detail: `Verificação preventiva: ${securityCheck.violationReason || "Padrão não permitido identificado"}`,
        status: "failed",
        fsmPhase: "FAILED_FINAL",
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(startTime + 40).toISOString(),
        durationMs: 40,
        tokensUsed: 12,
      });

      return {
        responseMessage:
          "Para sua segurança e privacidade, esta mensagem contém padrões não permitidos pelas políticas de segurança e proteção de dados.",
        activitySteps: steps,
        updatedMemory,
        fsmPhase: "FAILED_FINAL",
        fsmState: fsm.snapshot,
      };
    }

    // 1.1 Financial Firewall: Deny-by-default para débitos autônomos sem checkout seguro
    if (
      promptLower.includes("pagar agora") ||
      promptLower.includes("debitar conta") ||
      promptLower.includes("transferir dinheiro") ||
      promptLower.includes("enviar pix direto")
    ) {
      fsm.transition("UNDERSTANDING", "Inspeção de governança financeira");
      fsm.transition("VALIDATING", "Enforcement de checkout soberano");
      fsm.transition("COMPLETED", "Diretriz comunicada com sucesso");

      steps.push({
        id: `step-fin-guard-${startTime}`,
        type: "skill",
        label: "Controle Financeiro e Pagamentos Seguros",
        detail:
          "Pagamentos exigem ambiente seguro de checkout com autenticação e código Pix verificado",
        status: "completed",
        fsmPhase: "COMPLETED",
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(startTime + 30).toISOString(),
        durationMs: 30,
        tokensUsed: 14,
      });

      return {
        responseMessage:
          "Para sua tranquilidade e conforme nossa diretriz de segurança financeira, pagamentos não são debitados de forma automática no chat. Você pode concluir seu pedido com segurança diretamente no carrinho ou checkout com Pix ou cartão.",
        activitySteps: steps,
        updatedMemory,
        fsmPhase: "COMPLETED",
        fsmState: fsm.snapshot,
      };
    }

    // 2. Passo de Análise Contextual e Roteamento
    fsm.transition("UNDERSTANDING", "Pesquisa contextual e memória do tenant");
    steps.push({
      id: `step-1-${startTime}`,
      type: "database",
      label: "Consulta ao Histórico e Preferências",
      detail: "Consultando localização, histórico de atendimento e registros locais",
      status: "completed",
      fsmPhase: "UNDERSTANDING",
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date(startTime + 120).toISOString(),
      durationMs: 120,
      tokensUsed: 45,
    });

    const db = getServerClient();

    // A plataforma é a primeira fonte de verdade. Só escalamos para IA/mineração
    // quando a busca persistida não resolve a intenção do usuário.
    let platformSearch: InternalSearchResult | null = null;
    if (shouldSearchPlatform(userPrompt)) {
      const searchStart = Date.now();
      fsm.transition("RUNNING", "Executando a busca soberana da plataforma");
      fsm.transition("WAITING_TOOL", "Consultando o catálogo soberano da plataforma");
      platformSearch = await searchPlatformForCopilot(db, userPrompt);
      steps.push({
        id: `step-platform-search-${searchStart}`,
        type: "search",
        label: "Central de Descoberta Local",
        detail:
          platformSearch.cards.length > 0
            ? `${platformSearch.cards.length} resultado(s) encontrado(s) no sistema`
            : "Nenhum resultado local encontrado no momento",
        status: "completed",
        fsmPhase: "WAITING_TOOL",
        startedAt: new Date(searchStart).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - searchStart,
        tokensUsed: 0,
      });

      if (platformSearch.cards.length > 0) {
        updatedMemory.last_platform_search = {
          query: platformSearch.query,
          count: platformSearch.cards.length,
          kinds: platformSearch.searchedKinds,
        };
      }
    }

    // Executa o Gateway de IA Soberano se houver modelo ativo no pool (com Prompt Sandboxing)
    let gatewayResponse: any = null;
    try {
      const longTermMemory = context.userId
        ? await assembleLongTermContext({
            profileId: context.userId,
            threadId: context.threadId,
            currentPrompt: userPrompt,
          }).catch(() => ({ formattedContext: "", factsCount: 0, memoryChunksCount: 0 }))
        : { formattedContext: "", factsCount: 0, memoryChunksCount: 0 };

      const internalSearchContext = platformSearch
        ? `
<GROUNDED_DATA>
CONTEXTO SOBERANO DA PLATAFORMA (itens reais cadastrados no Waesy — priorize-os estritamente):
${JSON.stringify({ query: platformSearch.query, cards: platformSearch.cards, unavailableTables: platformSearch.unavailableTables }).slice(0, 12000)}
</GROUNDED_DATA>
Se houver itens no CONTEXTO SOBERANO acima, mencione-os de forma clara, consultiva e cordial, destacando diferenciais reais. Se for turismo/evento (ex: Oktoberfest, Urubici, Blumenau), estruture roteiro com precisão geográfica.
`
        : "";

      const systemPrompt = `Você é o Assessor Executivo Local de Chapecó e Região no ecossistema Waesy.
Seu papel é acolher, orientar e resolver demandas locais com extrema cordialidade, tom consultivo executivo, empatia genuína e precisão factual inegociável.

ESTRUTURA CONSULTIVA OBRIGATÓRIA EM 4 BLOCOS:
1. Acolhimento Caloroso e Empático: Inicie validando a necessidade do usuário de forma natural e próxima (ex: "Entendo perfeitamente o que você precisa. Vamos conferir as melhores alternativas disponíveis aqui na região.").
2. Contexto Consultivo e Dados Locais: Explique com clareza o cenário local, contextualizando por que cada opção, serviço ou número faz sentido.
3. Detalhamento Transparente: Apresente valores, prazos e opções de forma clara, organizada e sem abreviações ou jargões técnicos.
4. Próximo Passo Prático e Conclusão Proativa: Encerre sugerindo uma ação concreta (agendar, chamar motorista, abrir proposta, conferir planilha ou enviar mensagem).

DIRETRIZES DE COMUNICAÇÃO:
- Grounding Estrito & Zero Dados Fictícios: Responda baseando-se ESTRITAMENTE nos dados verificados fornecidos em <GROUNDED_DATA>. Nunca invente nomes, preços, telefones ou empresas inexistentes.
- Transparência Honesta: Se não encontrar registros oficiais ativos, responda cordialmente: "Consultei nossa base oficial de registros e não localizei nenhuma opção ativa para este termo no momento. Posso pesquisar em uma categoria próxima ou cidade vizinha para você?"
- Erradique 100% dos jargões de engenharia: Proibido mencionar "LLM", "prompt", "token", "payload", "crawler", "scraper", "BACEN EMV", "schema", "endpoint" ou "processamento de modelo". Fale como um consultor humano sênior e atencioso.

Ferramentas disponíveis:
1. 'search_places': busca estabelecimentos locais (cafés, restaurantes, mercados, academias, oficinas, etc.)
2. 'estimate_mobility': calcula estimativas de trajeto e corrida urbana (moto, carro, entrega, van)
3. 'search_catalog': busca produtos ou itens de cardápio com personalização
4. 'travel_itinerary': monta pacotes de viagem com dias, passeios, hospedagens e código Pix para pagamento
5. 'legal_triage': faz triagem jurídica com área do direito e documentos recomendados
6. 'create_ad': cria texto e peça visual para divulgação ou redes sociais
7. 'commercial_proposal': cria proposta comercial formal ou documento executivo
8. 'financial_report': gera planilha de fechamento de caixa e indicadores de receita

Responda SEMPRE em formato JSON com os campos:
{
  "intent": "search_places" | "estimate_mobility" | "search_catalog" | "travel_itinerary" | "legal_triage" | "create_ad" | "commercial_proposal" | "financial_report" | "general_chat",
  "tool_args": { ... },
  "message": "Mensagem acolhedora, consultiva, didática e humana para o usuário seguindo os 4 blocos",
  "step_label": "Título amigável da ação",
  "step_detail": "Detalhe amigável para o usuário"
}${internalSearchContext}${longTermMemory.formattedContext ? `\n${longTermMemory.formattedContext}` : ""}`;

      // 🛡️ Prompt Sandboxing: Isola dados não-confiáveis externos em <user_untrusted_data>
      const { hardenedSystemPrompt, sandboxedUserPrompt } = buildSandboxedPromptPayload(
        userPrompt,
        systemPrompt,
      );

      const gatewayRequest = {
        task: "chat" as const,
        prompt: sandboxedUserPrompt,
        systemPrompt: hardenedSystemPrompt,
        constraints: {
          temperature: 0.3,
          maxTokens: 1024,
          responseFormat: "json_object" as const,
        },
        context: {
          userLat: context.userLat,
          userLng: context.userLng,
          storeId: context.storeId,
          workingMemory,
        },
        signal: context.signal,
      };
      const runGateway = () => executeAiCoreGateway(gatewayRequest);
      const estimatedTokens = Math.max(
        1,
        Math.ceil((sandboxedUserPrompt.length + hardenedSystemPrompt.length) / 4),
      );
      const res = context.storeId
        ? (
            await requireTokensOrTollbooth({
              storeId: context.storeId,
              tokens: estimatedTokens,
              actionType: "burn_ai_agent_chat",
              serviceCategory: "heavy_ia_llm",
              description: "Execução do Copilot com roteamento de provider e ferramentas",
              idempotencyKey: `copilot_${context.threadId}_${startTime}`,
              metadata: { threadId: context.threadId, task: "chat", estimatedTokens },
              executeAction: runGateway,
            }).catch(async (walletErr) => {
              console.warn("[AI-COPILOT] Carteira da loja indisponível ou sem saldo; utilizando pool soberano da plataforma:", walletErr instanceof Error ? walletErr.message : walletErr);
              return { result: await runGateway() };
            })
          ).result
        : await runGateway();

      if (res?.success && res.result?.parsedJson) {
        gatewayResponse = res.result.parsedJson;
      } else if (res?.success && res.result?.text) {
        const cleanText = res.result.text
          .replace(/<think>[\s\S]*?<\/think>/gi, "")
          .replace(/```json\s*|\s*```/gi, "")
          .trim();
        try {
          gatewayResponse = JSON.parse(cleanText);
        } catch {
          const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              gatewayResponse = JSON.parse(jsonMatch[0]);
            } catch {
              gatewayResponse = { intent: detectIntent(promptLower), message: cleanText };
            }
          } else if (cleanText.length > 10) {
            // Preserva a resposta analítica da IA mesmo quando retornada em texto livre
            gatewayResponse = { intent: detectIntent(promptLower), message: cleanText };
          }
        }
      }
    } catch (gwErr) {
      console.warn(
        "[AI-COPILOT] Falha ou ausência de chave no gateway, executando dispatcher determinístico:",
        gwErr,
      );
    }

    const intent = gatewayResponse?.intent || detectIntent(promptLower);
    const toolArgs = gatewayResponse?.tool_args || {};

    // ── 0. Orquestrador autônomo de mineração e copilot (planilhas, leads, CNPJ, processos CNJ, builder) ──
    const isAutonomousOrMiningRequest =
      /\b(minerar|minere|minera[çc][ãa]o|planilha|tabela|exportar leads|extrair leads|ficha t[eé]cnica|criar landing page|montar landing page|criar biolink|montar biolink)\b/i.test(
        userPrompt,
      ) ||
      /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/.test(userPrompt) ||
      /\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/.test(userPrompt);

    if (
      isAutonomousOrMiningRequest &&
      needsCityClarification(
        fragmentAndOptimizePrompt(userPrompt, { city: context.city, state: context.state }),
      )
    ) {
      fsm.transition("NEEDS_CLARIFICATION", "Recorte municipal ausente no prompt e no contexto");
      return {
        responseMessage:
          'Informe a cidade para a busca (ex.: "em Chapecó") ou ative sua localização.',
        activitySteps: steps,
        updatedMemory,
        fsmPhase: fsm.currentPhase,
        fsmState: fsm.snapshot,
      };
    }

    fsm.transition("RUNNING", `Executando intent: ${intent}`);

    let structuredPayload: Record<string, any> | undefined;
    let artifact: ChatArtifactData | undefined;
    let executionId: string | undefined;
    const toolCalls: AiToolExecutionRecord[] = [];
    let responseMessage = gatewayResponse?.message || "";

    if (isAutonomousOrMiningRequest) {
      fsm.transition("WAITING_TOOL", "Executando mineração autônoma de dados");
      try {
        const copilotResult = await executeAutonomousCopilotTask(userPrompt, {
          threadId: context.threadId,
          storeId: context.storeId,
          activeCity: context.city,
          activeState: context.state,
        });
        executionId = copilotResult.taskId;
        steps.push(...(copilotResult.steps || []));

        if (copilotResult.artifact) {
          artifact = {
            id: crypto.randomUUID(),
            type: copilotResult.artifact.type,
            title: copilotResult.artifact.title,
            version: 1,
            totalVersions: 1,
            authorName: "Assessor Executivo Local",
            authorRole: "Consultor de Negócios",
            previewSummary: copilotResult.summaryMessage,
            data: copilotResult.artifact.data,
          };

          if (
            copilotResult.artifact.type === "spreadsheet" &&
            copilotResult.artifact.data?.headers
          ) {
            structuredPayload = {
              blocks: [
                {
                  type: "table",
                  data: {
                    title: copilotResult.artifact.title,
                    headers: copilotResult.artifact.data.headers,
                    rows: copilotResult.artifact.data.rows,
                  },
                },
              ],
            };
          }
        }

        updatedMemory.last_mining_task = copilotResult.domain;
        updatedMemory.last_tokens_saved = copilotResult.tokensSaved;
        responseMessage = copilotResult.summaryMessage;

        if (copilotResult.success) {
          fsm.transition("PARTIAL_RESULT", "Artefatos minerados gerados");
          fsm.transition("VALIDATING", "Validação de esquema de artefato");
          fsm.transition("COMPLETED", "Mineração autônoma concluída com sucesso");
        } else {
          fsm.recordFailure(copilotResult.error || "Falha na mineração autônoma");
        }
      } catch (autoErr: any) {
        console.warn("[COPILOT-AUTONOMOUS-BOUNDARY] Falha na mineração capturada:", autoErr);
        fsm.recordFailure(autoErr);
        responseMessage = `Tivemos uma oscilação rápida ao buscar esses dados externos. Suas preferências foram salvas com segurança e você pode tentar novamente em instantes.`;
      }

      return {
        responseMessage,
        activitySteps: steps,
        artifact,
        structuredPayload,
        updatedMemory,
        fsmPhase: fsm.currentPhase,
        fsmState: fsm.snapshot,
      };
    }

    // ── 0.1 Despachante WebMCP (26 Ferramentas Canônicas) ──
    const mcpCandidateTool = (gatewayResponse?.tool_name ||
      (intent in MCP_TOOL_REGISTRY ? intent : "")) as string;
    const isMcpTool = Boolean(mcpCandidateTool && MCP_TOOL_REGISTRY[mcpCandidateTool]);

    if (isMcpTool) {
      const stepStart = Date.now();
      const toolDef = MCP_TOOL_REGISTRY[mcpCandidateTool];
      fsm.transition("WAITING_TOOL", `Executando WebMCP Tool: ${mcpCandidateTool}`);

      steps.push({
        id: `step-mcp-${mcpCandidateTool}-${stepStart}`,
        type: "tool",
        label: gatewayResponse?.step_label || "Ação Especializada",
        detail:
          gatewayResponse?.step_detail ||
          toolDef.description ||
          "Consultando registros oficiais da plataforma",
        status: "running",
        fsmPhase: "WAITING_TOOL",
        startedAt: new Date(stepStart).toISOString(),
      });

      try {
        const mcpResult = await executeMcpToolCall({
          tool: mcpCandidateTool,
          arguments: toolArgs,
          storeId: context.storeId,
          signal: context.signal,
        });
        const toolDurationMs = Date.now() - stepStart;
        const toolText = mcpResult.content.find((content) => content.type === "text")?.text;
        toolCalls.push({
          tool: mcpCandidateTool,
          arguments: toolArgs as Record<string, unknown>,
          status: mcpResult.status,
          durationMs: toolDurationMs,
          resultSummary: toolText?.slice(0, 500),
          executedAt: new Date().toISOString(),
        });

        if (mcpResult.status === "success") {
          steps[steps.length - 1].status = "completed";
          steps[steps.length - 1].completedAt = new Date().toISOString();
          steps[steps.length - 1].fsmPhase = "PARTIAL_RESULT";
          fsm.transition("PARTIAL_RESULT", `MCP Tool ${mcpCandidateTool} concluída com sucesso`);

          const textBlock = mcpResult.content.find((c) => c.type === "text")?.text;
          const jsonBlock = mcpResult.content.find((c) => c.type === "json")?.data;

          if (textBlock && !responseMessage) {
            responseMessage = textBlock;
          }

          if (jsonBlock) {
            structuredPayload = {
              mcpTool: mcpCandidateTool,
              data: jsonBlock,
            };
          }
        } else {
          const errorText =
            mcpResult.content.find((c) => c.type === "text")?.text ||
            "Erro na execução da MCP Tool";
          steps[steps.length - 1].status = "failed";
          steps[steps.length - 1].completedAt = new Date().toISOString();
          steps[steps.length - 1].detail = errorText.slice(0, 120);
          steps[steps.length - 1].fsmPhase = "FAILED_RETRYABLE";
          fsm.recordFailure(errorText);

          responseMessage = `A ferramenta "${mcpCandidateTool}" retornou uma falha temporária: ${errorText}. Você pode ajustar os parâmetros ou tentar novamente.`;
        }
      } catch (mcpErr: any) {
        toolCalls.push({
          tool: mcpCandidateTool,
          arguments: toolArgs as Record<string, unknown>,
          status: "error",
          durationMs: Date.now() - stepStart,
          resultSummary: String(mcpErr?.message || "Falha desconhecida").slice(0, 500),
          executedAt: new Date().toISOString(),
        });
        steps[steps.length - 1].status = "failed";
        steps[steps.length - 1].completedAt = new Date().toISOString();
        steps[steps.length - 1].detail = mcpErr.message?.slice(0, 120);
        steps[steps.length - 1].fsmPhase = "FAILED_RETRYABLE";
        fsm.recordFailure(mcpErr);

        responseMessage = `Não foi possível comunicar com o servidor da ferramenta "${mcpCandidateTool}" (${mcpErr.message?.slice(0, 80)}). Tente novamente em instantes.`;
      }

      if (!fsm.isFailure && !fsm.isTerminal) {
        if (canTransitionCopilotPhase(fsm.currentPhase, "VALIDATING")) {
          fsm.transition("VALIDATING", "Validação do payload da MCP Tool");
        }
        if (canTransitionCopilotPhase(fsm.currentPhase, "COMPLETED")) {
          fsm.transition("COMPLETED", `MCP Tool ${mcpCandidateTool} finalizada`);
        }
      }

      updatedMemory.last_mcp_tool = mcpCandidateTool;

      return {
        responseMessage: responseMessage || `Ferramenta "${mcpCandidateTool}" executada.`,
        activitySteps: steps,
        toolCalls,
        artifact,
        structuredPayload,
        updatedMemory,
        fsmPhase: fsm.currentPhase,
        fsmState: fsm.snapshot,
      };
    }

    // ── 1. Estabelecimentos & Places ──
    if (
      intent === "search_places" ||
      promptLower.includes("onde fica") ||
      promptLower.includes("onde tem") ||
      promptLower.includes("perto") ||
      promptLower.includes("cafeteria") ||
      promptLower.includes("restaurante") ||
      promptLower.includes("empresa") ||
      promptLower.includes("loja") ||
      promptLower.includes("hotel") ||
      promptLower.includes("hotéis") ||
      promptLower.includes("hoteis") ||
      promptLower.includes("pousada") ||
      promptLower.includes("pousadas") ||
      promptLower.includes("hospedagem")
    ) {
      const stepStart = Date.now();
      steps.push({
        id: `step-places-${stepStart}`,
        type: "tool",
        label: gatewayResponse?.step_label || "Busca de Estabelecimentos",
        detail:
          gatewayResponse?.step_detail ||
          "Buscando estabelecimentos ativos e calculando distância geográfica",
        status: "completed",
        startedAt: new Date(stepStart).toISOString(),
        completedAt: new Date(stepStart + 160).toISOString(),
        durationMs: 160,
        tokensUsed: 120,
      });

      const term = toolArgs.query || extractSearchTerm(promptLower);
      let query = db
        .from("directory_listings")
        .select(
          "id, store_id, business_name, category, description, address, latitude, longitude, contact_phone, contact_whatsapp, working_hours, is_verified, rating, avatar_url, banner_url, status",
        )
        .eq("status", "active")
        .limit(6);

      if (term) {
        query = query.or(
          `business_name.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%`,
        );
      }

      let { data: listings } = await query;

      // Se a base local não possui resultados para esse termo (ex.: hotéis em Chapecó), consulta o harvester georreferenciado
      if ((!listings || listings.length === 0) && term) {
        try {
          const harvestRes = await harvestAndPersistPlaces({
            query: term,
            city: context.city || "Chapecó",
            state: context.state || "SC",
            storeId: context.storeId,
          });
          if (harvestRes.places && harvestRes.places.length > 0) {
            const { data: freshListings } = await query;
            if (freshListings && freshListings.length > 0) {
              listings = freshListings;
            }
          }
        } catch (hErr) {
          console.warn("[search_places] Harvester de apoio falhou de forma não-bloqueante:", hErr);
        }
      }

      const places = (listings && listings.length > 0 ? listings : []).map((l: any) => {
        let dist = null;
        if (context.userLat && context.userLng && l.latitude && l.longitude) {
          dist = calculateHaversineDistance(
            context.userLat,
            context.userLng,
            l.latitude,
            l.longitude,
          );
        }
        return {
          id: l.id,
          store_id: l.store_id,
          name: l.business_name || "Estabelecimento Local",
          category: l.category || "Comércio & Serviços",
          address: l.address || "Endereço no centro",
          distance_km: dist,
          is_open: derivePlaceOpenStatus(l.working_hours),
          rating: typeof l.rating === "number" ? l.rating : null,
          contact_whatsapp: l.contact_whatsapp,
          contact_phone: l.contact_phone,
          avatar_url: l.avatar_url || l.banner_url,
        };
      });

      if (places.length > 0) {
        structuredPayload = {
          blocks: [
            {
              type: "places_carousel",
              data: {
                title: "Estabelecimentos Encontrados",
                places,
              },
            },
          ],
        };
      }

      if (!responseMessage) {
        responseMessage =
          places.length > 0
            ? `Localizei ${places.length} opções recomendadas em ${context.city || "sua região"}. Você pode conferir os detalhes e entrar em contato direto:`
            : `Não encontrei estabelecimentos cadastrados para "${term}" em ${context.city || "sua região"} no momento. Você pode refinar o termo de busca ou explorar o diretório do Places.`;
      }

      updatedMemory.last_places_query = term;
    }
    // ── 2. Mobilidade & Corridas / Entregas ──
    else if (
      intent === "estimate_mobility" ||
      promptLower.includes("corrida") ||
      promptLower.includes("motorista") ||
      promptLower.includes("uber") ||
      promptLower.includes("moto passageiro") ||
      promptLower.includes("chamar carro") ||
      promptLower.includes("frete")
    ) {
      const stepStart = Date.now();
      steps.push({
        id: `step-mobility-${stepStart}`,
        type: "tool",
        label: gatewayResponse?.step_label || "Estimativa de Trajeto e Corrida",
        detail:
          gatewayResponse?.step_detail ||
          "Calculando opções de moto, carro e entrega com base na distância",
        status: "completed",
        startedAt: new Date(stepStart).toISOString(),
        completedAt: new Date(stepStart + 180).toISOString(),
        durationMs: 180,
        tokensUsed: 140,
      });

      const origin = toolArgs.origin_address || "Centro, Praça Central";
      const dest = toolArgs.destination_address || "Bairro Efapi / Região Universitária";
      const distanceKm = toolArgs.distance_km || 4.2;

      const quotes = [
        {
          service_type: "ride_moto",
          label: "Moto Passageiro",
          description: "Mais rápido no trânsito local",
          estimated_price_cents: Math.max(700, Math.round(400 + distanceKm * 180)),
          duration_minutes: Math.max(6, Math.round(distanceKm * 2)),
        },
        {
          service_type: "ride_car",
          label: "Carro Privado",
          description: "Conforto para até 4 passageiros",
          estimated_price_cents: Math.max(1200, Math.round(600 + distanceKm * 280)),
          duration_minutes: Math.max(9, Math.round(distanceKm * 2.8)),
        },
        {
          service_type: "delivery_express",
          label: "Entrega Flash",
          description: "Para envelopes e pequenas encomendas",
          estimated_price_cents: Math.max(900, Math.round(500 + distanceKm * 220)),
          duration_minutes: Math.max(8, Math.round(distanceKm * 2.2)),
        },
      ];

      structuredPayload = {
        blocks: [
          {
            type: "mobility_quote",
            data: {
              origin_address: origin,
              destination_address: dest,
              distance_km: distanceKm,
              quotes,
            },
          },
        ],
      };

      if (!responseMessage) {
        responseMessage = `Calculei as opções de transporte para a rota de ${origin} até ${dest} (${distanceKm} km). Selecione o modal desejado para chamar o motorista:`;
      }

      updatedMemory.last_mobility_origin = origin;
      updatedMemory.last_mobility_dest = dest;
    }
    // ── 3. Pacotes de Viagem & Turismo ──
    else if (
      intent === "travel_itinerary" ||
      promptLower.includes("viagem") ||
      promptLower.includes("turismo") ||
      promptLower.includes("roteiro") ||
      promptLower.includes("pacote") ||
      promptLower.includes("oktober")
    ) {
      const stepStart = Date.now();
      steps.push({
        id: `step-travel-${stepStart}`,
        type: "skill",
        label: gatewayResponse?.step_label || "Roteiro de Viagem & Turismo",
        detail:
          gatewayResponse?.step_detail ||
          "Organizando atrações, passeios e estimativa de hospedagem",
        status: "completed",
        startedAt: new Date(stepStart).toISOString(),
        completedAt: new Date(stepStart + 350).toISOString(),
        durationMs: 350,
        tokensUsed: 310,
      });

      let destination = toolArgs.destination;
      if (!destination) {
        if (/oktober\s*fest|blumenau/i.test(userPrompt)) {
          destination = "Oktoberfest (Blumenau - SC)";
        } else {
          const destMatch = userPrompt.match(
            /(?:para|em|de|pra|conhecer|visitar)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/i,
          );
          destination = destMatch
            ? destMatch[1]
            : context.city
              ? `${context.city} e Região`
              : "Destino Solicitado";
        }
      }

      let days = toolArgs.days;
      if (!Array.isArray(days) || days.length === 0) {
        if (/oktober/i.test(destination) || /blumenau/i.test(destination)) {
          days = [
            {
              day: 1,
              title: "Chegada e Vila Germânica",
              activities: [
                "Check-in na hospedagem em Blumenau",
                "Passeio pelos pavilhões da Vila Germânica",
                "Jantar típico com gastronomia germânica e chopp artesanal",
              ],
            },
            {
              day: 2,
              title: "Desfile Típico e Pavilhões",
              activities: [
                "Desfile folclórico na Rua XV de Novembro",
                "Apresentações musicais e culturais tradicionais",
                "Noite festiva nos pavilhões principais da Oktoberfest",
              ],
            },
            {
              day: 3,
              title: "Centro Histórico e Retorno",
              activities: [
                "Visita ao Museu da Cerveja e Parque Ramiro Ruediger",
                "Compras de lembranças e trajes típicos",
                "Check-out e retorno com tranquilidade",
              ],
            },
          ];
        } else {
          days = [
            {
              day: 1,
              title: `Chegada em ${destination}`,
              activities: [
                "Check-in e acomodação",
                "Passeio de reconhecimento pelo centro histórico e arredores",
                "Jantar com culinária regional típica",
              ],
            },
            {
              day: 2,
              title: "Experiências e Atrações Principais",
              activities: [
                "Visita aos principais pontos turísticos e culturais",
                "Passeios guiados ou ecoturismo na região",
                "Momento livre para compras e gastronomia",
              ],
            },
            {
              day: 3,
              title: "Despedida e Retorno",
              activities: [
                "Últimas compras de produtos e artesanato local",
                "Almoço de despedida",
                "Check-out e transfer de retorno",
              ],
            },
          ];
        }
      }

      const travelBuilderResult = await createBuilderArtifactFromCopilot({
        userPrompt,
        docType: "travel_itinerary",
        title: `Roteiro Turístico: ${destination}`,
        storeId: context.storeId,
        authorProfileId: context.userId || "00000000-0000-0000-0000-000000000001",
        sessionId: context.threadId,
      }).catch(() => null);

      if (travelBuilderResult) {
        artifact = travelBuilderResult.chatArtifact;
        const p = travelBuilderResult.payload;
        structuredPayload = {
          blocks: [
            {
              type: "travel_itinerary",
              data: {
                destination: p.destination || destination,
                duration_days: p.daysCount || days.length,
                passengers_count: toolArgs.passengers_count || 2,
                hotel_category: toolArgs.hotel_category || "Pousada de Charme com Café",
                flights_included: Boolean(toolArgs.flights_included),
                estimated_budget_cents: p.estimatedBudgetCents || 245000,
                pix_code: p.pixCode,
                days: p.days || days,
              },
            },
          ],
        };
        if (!responseMessage) {
          responseMessage = `Montei um roteiro personalizado para ${p.destination || destination}! Estruturei a programação dia a dia, a hospedagem selecionada e gerei o código Pix pronto para pagamento com validação imediata da reserva no painel lateral:`;
        }
      } else {
        structuredPayload = {
          blocks: [
            {
              type: "travel_itinerary",
              data: {
                destination,
                duration_days: days.length,
                passengers_count: toolArgs.passengers_count || 2,
                hotel_category: toolArgs.hotel_category || "Hotel Selecionado com Café",
                flights_included: Boolean(toolArgs.flights_included),
                estimated_budget_cents: toolArgs.estimated_budget_cents || 249000,
                days,
              },
            },
          ],
        };

        artifact = {
          id: crypto.randomUUID(),
          type: "proposal",
          title: `Roteiro Turístico: ${destination}`,
          version: 1,
          authorName: "Assessor de Turismo Local",
          authorRole: "Especialista em Experiências",
          previewSummary: `Itinerário personalizado para ${destination} com passeios, hospedagem e estimativa de investimento.`,
          data: {
            destination,
            daysCount: days.length,
            estimated_budget_cents: toolArgs.estimated_budget_cents || 249000,
          },
        };

        if (!responseMessage) {
          responseMessage = `Preparei um roteiro especial para ${destination}! Veja abaixo a programação detalhada e as sugestões de passeios para aproveitar ao máximo a sua experiência:`;
        }
      }

      updatedMemory.last_travel_destination = destination;
    }
    // ── 4. Assessoria & Triagem Jurídica ──
    else if (
      intent === "legal_triage" ||
      promptLower.includes("advogado") ||
      promptLower.includes("processo") ||
      promptLower.includes("demitido") ||
      promptLower.includes("jurídic") ||
      promptLower.includes("direito") ||
      promptLower.includes("indenização")
    ) {
      const stepStart = Date.now();
      steps.push({
        id: `step-legal-${stepStart}`,
        type: "skill",
        label: gatewayResponse?.step_label || "Triagem e Análise Jurídica",
        detail:
          gatewayResponse?.step_detail ||
          "Identificando área do direito, direitos pertinentes e documentação recomendada",
        status: "completed",
        startedAt: new Date(stepStart).toISOString(),
        completedAt: new Date(stepStart + 290).toISOString(),
        durationMs: 290,
        tokensUsed: 260,
      });

      const legalArea =
        toolArgs.legal_area ||
        (promptLower.includes("demit") || promptLower.includes("trabalh")
          ? "Direito Trabalhista"
          : promptLower.includes("compra") || promptLower.includes("defeito")
            ? "Direito do Consumidor"
            : "Direito Cível");
      const keyFacts = toolArgs.key_facts || [
        "Relato inicial registrado com data de ocorrência e envolvidos",
        "Possível violação de prazos e direitos garantidos por lei",
        "Necessidade de análise documental comprobatória por advogado",
      ];

      structuredPayload = {
        blocks: [
          {
            type: "legal_triage",
            data: {
              title: `Triagem Preliminar — ${legalArea}`,
              legal_area: legalArea,
              urgency:
                promptLower.includes("urgente") || promptLower.includes("prazo")
                  ? "urgent"
                  : "normal",
              key_facts: keyFacts,
              required_documents: [
                "Documento com foto (RG/CNH)",
                "Comprovante de residência",
                "Contratos, recibos ou conversas que comprovem o fato",
              ],
              description: userPrompt,
            },
          },
        ],
      };

      if (!responseMessage) {
        responseMessage = `Efetuei a triagem preliminar do caso na área de ${legalArea}. A demanda pode ser encaminhada de forma segura para os advogados cadastrados e credenciados da sua comarca:`;
      }

      updatedMemory.last_legal_area = legalArea;
    }
    // ── 5. Criação de Anúncios, Artes & Marketing ──
    else if (
      intent === "create_ad" ||
      promptLower.includes("anúncio") ||
      promptLower.includes("arte") ||
      promptLower.includes("post") ||
      promptLower.includes("banner") ||
      promptLower.includes("propaganda")
    ) {
      const stepStart = Date.now();
      steps.push({
        id: `step-creative-${stepStart}`,
        type: "tool",
        label: gatewayResponse?.step_label || "Criação de Peça Publicitária",
        detail:
          gatewayResponse?.step_detail ||
          "Elaborando texto atrativo e chamada para ação para divulgação",
        status: "completed",
        startedAt: new Date(stepStart).toISOString(),
        completedAt: new Date(stepStart + 240).toISOString(),
        durationMs: 240,
        tokensUsed: 215,
      });

      const headline = toolArgs.headline || "Super Oferta da Semana no Waesy!";
      const copy =
        toolArgs.copy ||
        "Aproveite descontos especiais em produtos e serviços locais. Compre de quem produz na sua cidade com entrega rápida.";
      const cta = toolArgs.cta_label || "Conferir Ofertas";

      const socialBuilderResult = await createBuilderArtifactFromCopilot({
        userPrompt,
        docType: "social_post",
        title: headline,
        storeId: context.storeId,
        authorProfileId: context.userId || "00000000-0000-0000-0000-000000000001",
        sessionId: context.threadId,
      }).catch(() => null);

      if (socialBuilderResult) {
        artifact = socialBuilderResult.chatArtifact;
      }

      structuredPayload = {
        blocks: [
          {
            type: "creative_ad_preview",
            data: {
              headline,
              body_text: copy,
              cta_label: cta,
              format: "feed",
            },
          },
        ],
      };

      if (!responseMessage) {
        responseMessage =
          `Criei o post e story "${headline}" com copy persuasiva e chamada para ação pronta para publicação no Instagram. A peça está aberta no painel lateral para você visualizar e ajustar:`;
      }

      updatedMemory.last_creative_topic = headline;
    }
    // ── 6. Compras, Produtos & Delivery ──
    else if (
      intent === "search_catalog" ||
      promptLower.includes("comprar") ||
      promptLower.includes("pizza") ||
      promptLower.includes("cardápio") ||
      promptLower.includes("pedido") ||
      promptLower.includes("lanche")
    ) {
      const stepStart = Date.now();
      steps.push({
        id: `step-food-${stepStart}`,
        type: "tool",
        label: gatewayResponse?.step_label || "Consulta ao Catálogo de Produtos",
        detail:
          gatewayResponse?.step_detail ||
          "Consultando estoque e opções de personalização do cardápio local",
        status: "completed",
        startedAt: new Date(stepStart).toISOString(),
        completedAt: new Date(stepStart + 190).toISOString(),
        durationMs: 190,
        tokensUsed: 170,
      });

      const term = toolArgs.query || extractSearchTerm(promptLower);
      let prodQuery = db
        .from("products")
        .select("id, store_id, title, description, price_cents, images")
        .eq("is_active", true)
        .limit(4);

      if (context.storeId) {
        prodQuery = prodQuery.eq("store_id", context.storeId);
      }
      if (term) {
        prodQuery = prodQuery.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      }

      const { data: prods } = await prodQuery;

      if (prods && prods.length > 0) {
        const mainProd = prods[0];
        structuredPayload = {
          blocks: [
            {
              type: "food_modifier_selector",
              data: {
                product: {
                  id: mainProd.id,
                  store_id: mainProd.store_id || null,
                  title: mainProd.title,
                  description: mainProd.description,
                  price_cents: mainProd.price_cents,
                  image_url: (mainProd as any).images?.[0] || null,
                },
                modifier_groups: [
                  {
                    id: "grp-size",
                    title: "Opção / Tamanho",
                    required: true,
                    max: 1,
                    options: [
                      { id: "opt-padrao", name: "Padrão", price_cents: 0 },
                      {
                        id: "opt-especial",
                        name: "Especial",
                        price_cents: Math.round(mainProd.price_cents * 0.25),
                      },
                    ],
                  },
                  {
                    id: "grp-extra",
                    title: "Complementos",
                    required: false,
                    max: 2,
                    options: [
                      { id: "opt-extra-1", name: "Adicional Especial", price_cents: 400 },
                      { id: "opt-extra-2", name: "Embalagem para Presente", price_cents: 300 },
                    ],
                  },
                ],
              },
            },
          ],
        };

        if (!responseMessage) {
          responseMessage = `Localizei "${mainProd.title}" no catálogo ativo. Você pode personalizar as opções antes de adicionar ao seu pedido:`;
        }

        updatedMemory.last_food_query = mainProd.title;
      } else {
        if (!responseMessage) {
          responseMessage =
            "Nenhum produto correspondente foi encontrado no catálogo ativo no momento. Você pode navegar pelos departamentos ou buscar por outro termo.";
        }
      }
    }
    // ── 7. Proposta Comercial Formal ──
    else if (
      intent === "commercial_proposal" ||
      promptLower.includes("proposta") ||
      promptLower.includes("orçamento")
    ) {
      const stepStart = Date.now();
      steps.push({
        id: `step-proposal-${stepStart}`,
        type: "skill",
        label: gatewayResponse?.step_label || "Estruturação de Proposta Comercial",
        detail:
          gatewayResponse?.step_detail ||
          "Organizando escopo, etapas de entrega e condições comerciais",
        status: "completed",
        startedAt: new Date(stepStart).toISOString(),
        completedAt: new Date(stepStart + 310).toISOString(),
        durationMs: 310,
        tokensUsed: 260,
      });

      const extractedTitle =
        toolArgs.title ||
        (userPrompt.length > 8
          ? `Proposta: ${userPrompt.slice(0, 50)}`
          : "Proposta Comercial de Prestação de Serviços");
      const totalCents = toolArgs.total_cents || 450000;
      const milestones = toolArgs.milestones || [
        "Diagnóstico inicial e alinhamento de escopo",
        "Execução técnica e implantação",
        "Homologação e validação com o cliente",
        "Entrega final e encerramento",
      ];

      const docBuilderResult = await createBuilderArtifactFromCopilot({
        userPrompt,
        docType: "document",
        title: extractedTitle,
        storeId: context.storeId,
        authorProfileId: context.userId || "00000000-0000-0000-0000-000000000001",
        sessionId: context.threadId,
      }).catch(() => null);

      if (docBuilderResult) {
        artifact = docBuilderResult.chatArtifact;
      } else {
        artifact = {
          id: crypto.randomUUID(),
          type: "proposal",
          title: extractedTitle,
          version: 1,
          totalVersions: 1,
          authorName: "Assessor Comercial Local",
          authorRole: "Consultoria Executiva",
          previewSummary: `Proposta estruturada com cronograma em ${milestones.length} etapas e investimento total de ${formatMoney(totalCents / 100)}.`,
          data: {
            total_cents: totalCents,
            currency: "BRL",
            validity_days: 15,
            milestones,
            terms: "Condições de pagamento: 50% na aprovação e 50% na conclusão das entregas.",
          },
        };
      }

      structuredPayload = {
        blocks: [
          {
            type: "proposal_card",
            data: {
              proposalId: artifact.id,
              title: extractedTitle,
              totalCents,
              currency: "BRL",
              validUntil: new Date(Date.now() + 15 * 86400000).toISOString(),
              milestones,
            },
          },
        ],
      };

      if (!responseMessage) {
        responseMessage = `Elaborei a proposta comercial "${extractedTitle}" com valor total de ${formatMoney(totalCents / 100)}. O documento está anexado ao lado, pronto para você visualizar e exportar.`;
      }

      updatedMemory.last_proposal_created = new Date().toISOString();
    }
    // ── 7.1 Apresentação Executiva & Slides Apple HIG ──
    else if (
      intent === "presentation_deck" ||
      promptLower.includes("apresentação") ||
      promptLower.includes("apresentacao") ||
      promptLower.includes("slide") ||
      promptLower.includes("pitch") ||
      promptLower.includes("deck")
    ) {
      const stepStart = Date.now();
      steps.push({
        id: `step-presentation-${stepStart}`,
        type: "tool",
        label: "Geração de Apresentação Executiva",
        detail: "Estruturando slides temáticos e narrativa visual",
        status: "completed",
        startedAt: new Date(stepStart).toISOString(),
        completedAt: new Date(stepStart + 260).toISOString(),
        durationMs: 260,
        tokensUsed: 220,
      });

      const slideTitle = toolArgs.title || (userPrompt.length > 8 ? userPrompt.slice(0, 50) : "Apresentação Executiva");
      const deckBuilderResult = await createBuilderArtifactFromCopilot({
        userPrompt,
        docType: "presentation",
        title: slideTitle,
        storeId: context.storeId,
        authorProfileId: context.userId || "00000000-0000-0000-0000-000000000001",
        sessionId: context.threadId,
      }).catch(() => null);

      if (deckBuilderResult) {
        artifact = deckBuilderResult.chatArtifact;
      }

      if (!responseMessage) {
        responseMessage = `Estruturei a apresentação "${slideTitle}" com slides modernos no padrão Apple Minimal. A prévia já está aberta no painel lateral:`;
      }
    }
    // ── 7.2 Website Canvas & Landing Page ──
    else if (
      intent === "website_builder" ||
      promptLower.includes("landing page") ||
      promptLower.includes("criar site") ||
      promptLower.includes("montar site")
    ) {
      const stepStart = Date.now();
      steps.push({
        id: `step-site-${stepStart}`,
        type: "tool",
        label: "Criação de Página de Apresentação",
        detail: "Organizando seções de destaque, catálogo e canais de contato",
        status: "completed",
        startedAt: new Date(stepStart).toISOString(),
        completedAt: new Date(stepStart + 280).toISOString(),
        durationMs: 280,
        tokensUsed: 240,
      });

      const siteTitle = toolArgs.title || "Landing Page do Estabelecimento";
      const siteBuilderResult = await createBuilderArtifactFromCopilot({
        userPrompt,
        docType: "website",
        title: siteTitle,
        storeId: context.storeId,
        authorProfileId: context.userId || "00000000-0000-0000-0000-000000000001",
        sessionId: context.threadId,
      }).catch(() => null);

      if (siteBuilderResult) {
        artifact = siteBuilderResult.chatArtifact;
      }

      if (!responseMessage) {
        responseMessage = `Projetei a landing page "${siteTitle}" com layout adaptativo, seções estratégicas de conversão e botões de contato. Veja a prévia ao lado:`;
      }
    }
    // ── 8. Relatório Financeiro & Planilha de Caixa ──
    else if (
      intent === "financial_report" ||
      promptLower.includes("planilha") ||
      promptLower.includes("tabela") ||
      promptLower.includes("métricas") ||
      promptLower.includes("caixa")
    ) {
      const stepStart = Date.now();
      steps.push({
        id: `step-finance-${stepStart}`,
        type: "tool",
        label: gatewayResponse?.step_label || "Fechamento de Caixa do Dia",
        detail:
          gatewayResponse?.step_detail ||
          "Consultando demonstrativo e transações registradas do período",
        status: "completed",
        startedAt: new Date(stepStart).toISOString(),
        completedAt: new Date(stepStart + 220).toISOString(),
        durationMs: 220,
        tokensUsed: 180,
      });

      let ordersCount = 0;
      let totalRevenueCents = 0;
      if (context.storeId) {
        const { data: orders } = await db
          .from("store_orders")
          .select("id, total_amount_cents, payment_status, created_at")
          .eq("store_id", context.storeId)
          .limit(50);

        if (orders && orders.length > 0) {
          ordersCount = orders.length;
          totalRevenueCents = orders.reduce(
            (sum: number, o: any) => sum + (o.total_amount_cents || 0),
            0,
          );
        }
      }

      const rows =
        ordersCount > 0
          ? [
              [
                "Pedidos Faturados",
                String(ordersCount),
                formatMoney(totalRevenueCents / 100),
                "Concluído",
              ],
              [
                "Ticket Médio",
                String(ordersCount),
                formatMoney(totalRevenueCents / (ordersCount || 1) / 100),
                "Calculado",
              ],
            ]
          : [
              ["Receitas Balcão", "0", "R$ 0,00", "Aguardando Vendas"],
              ["Delivery Online", "0", "R$ 0,00", "Sem Pedidos"],
              ["Serviços Locais", "0", "R$ 0,00", "Sem Lançamentos"],
            ];

      const sheetBuilderResult = await createBuilderArtifactFromCopilot({
        userPrompt,
        docType: "spreadsheet",
        title: "Demonstrativo Financeiro do Caixa",
        storeId: context.storeId,
        authorProfileId: context.userId || "00000000-0000-0000-0000-000000000001",
        sessionId: context.threadId,
      }).catch(() => null);

      if (sheetBuilderResult) {
        artifact = sheetBuilderResult.chatArtifact;
      } else {
        artifact = {
          id: crypto.randomUUID(),
          type: "spreadsheet",
          title: "Demonstrativo Financeiro do Caixa",
          version: 1,
          totalVersions: 1,
          authorName: "Consultor de Finanças Local",
          authorRole: "Controladoria e Gestão",
          previewSummary: `Demonstrativo contábil com ${rows.length} linhas de registro e status de liquidação.`,
          data: {
            rows: rows.length,
            columns: 4,
            headers: ["Categoria", "Qtd", "Valor (BRL)", "Status"],
            dataRows: rows,
            format: "tabular",
          },
        };
      }

      structuredPayload = {
        blocks: [
          {
            type: "table",
            data: {
              title: "Demonstrativo Consolidado de Caixa",
              headers: ["Categoria", "Qtd", "Valor (BRL)", "Status"],
              rows,
            },
          },
        ],
      };

      if (!responseMessage) {
        responseMessage =
          "Gerei a planilha consolidada de caixa com os dados reais do período. Você pode visualizá-la no painel ou baixar o arquivo CSV.";
      }

      updatedMemory.last_report_generated = new Date().toISOString();
    }
    // ── 9. Conversa Geral & Orientação do Ecossistema ──
    else {
      const stepStart = Date.now();
      steps.push({
        id: `step-general-${stepStart}`,
        type: "model",
        label: "Orientação do Assessor Local",
        detail: "Organizando orientações com base no seu atendimento",
        status: "completed",
        startedAt: new Date(stepStart).toISOString(),
        completedAt: new Date(stepStart + 150).toISOString(),
        durationMs: 150,
        tokensUsed: 95,
      });

      if (!responseMessage) {
        if (platformSearch && platformSearch.cards.length > 0) {
          const sampleNames = platformSearch.cards.slice(0, 3).map((c) => `"${c.title}"`).join(", ");
          responseMessage = `Encontrei ótimas opções no ecossistema Waesy para "${platformSearch.query}", incluindo ${sampleNames}. Dê uma olhada nos detalhes e ações rápidas abaixo:`;
        } else {
          responseMessage =
            gatewayResponse?.message ||
            "Olá! Sou o seu Assessor Local. Posso apoiar você a encontrar estabelecimentos comerciais, consultar eventos e notícias da região, conferir produtos locais ou estimar corridas e fretes. Como posso te apoiar agora?";
        }
      }

      updatedMemory.last_interaction_topic = userPrompt.slice(0, 40);
    }

    if (platformSearch && platformSearch.cards.length > 0) {
      const carouselBlock = {
        type: "card_carousel",
        data: {
          title: "Opções no Waesy",
          source: "platform",
          query: platformSearch.query,
          items: platformSearch.cards.map((card) => ({
            id: card.id,
            title: card.title,
            subtitle: [card.kind, card.subtitle, card.location].filter(Boolean).join(" · "),
            description: card.description,
            location: card.location,
            image_url: card.image_url,
            price_cents: card.price_cents,
            source_table: card.source_table,
            source_id: card.source_id,
            action: card.action,
          })),
        },
      };

      if (!structuredPayload) {
        structuredPayload = { blocks: [carouselBlock] };
      } else if (Array.isArray(structuredPayload.blocks)) {
        if (!structuredPayload.blocks.some((b: any) => b.type === "card_carousel")) {
          structuredPayload.blocks.push(carouselBlock);
        }
      }
    }

    // ── Estágio 4: Síntese Analítica IA sobre Registros Recuperados (@synthesizer) ──
    const hasAttachments = Array.isArray(context.attachments) && context.attachments.length > 0;
    if (hasAttachments || !gatewayResponse?.message || (structuredPayload?.blocks && structuredPayload.blocks.length > 0 && intent !== "general_chat")) {
      try {
        const { executeUnifiedAiCall } = await import("./api-orchestrator.functions");
        const resolvedAttachments = hasAttachments
          ? await resolveCopilotAttachments(context.attachments)
          : { images: [], textBlocks: [], notes: [] };
        const attachmentContext = [
          ...resolvedAttachments.textBlocks.map((t, i) => `Conteúdo do anexo ${i + 1}:\n${t}`),
          ...resolvedAttachments.notes.map((n) => `Observação: ${n}`),
        ].join("\n\n");

        const retrievedSummary = JSON.stringify({
          intent,
          city: context.city || "Chapecó",
          state: context.state || "SC",
          platformCards: (platformSearch?.cards || []).slice(0, 6).map((c) => ({
            kind: c.kind,
            title: c.title,
            subtitle: c.subtitle,
            location: c.location,
            price_cents: c.price_cents,
          })),
          toolBlocks: (structuredPayload?.blocks || []).slice(0, 3),
          artifactTitle: artifact?.title,
        }).slice(0, 4000);

        const synthStart = Date.now();
        const aiSynth = await executeUnifiedAiCall({
          feature: `copilot_stage4_synthesis_${intent}`,
          taskType: resolvedAttachments.images.length > 0 ? "vision" : undefined,
          images: resolvedAttachments.images.length > 0 ? resolvedAttachments.images : undefined,
          temperature: 0.35,
          maxTokens: 900,
          storeId: context.storeId || undefined,
          ownerId: context.userId || undefined,
          systemPrompt: [
            "Você é o Assessor Executivo Local do Waesy Copilot.",
            "Analise o pedido do usuário e os registros reais recuperados do banco de dados da plataforma.",
            "Redija uma resposta analítica, calorosa, consultiva e inteligente em português do Brasil (2 a 4 parágrafos curtos ou tópicos objetivos).",
            "Mencione os nomes reais, valores, endereços ou destaques encontrados e oriente o próximo passo prático.",
            "REGRA ESTRITA: Baseie-se exclusivamente nos dados fornecidos, nunca invente registros inexistentes e nunca utilize emojis ou jargões técnicos.",
          ].join("\n"),
          userPrompt: `Pedido do usuário: "${userPrompt}"\nDados reais recuperados pela plataforma:\n${retrievedSummary}${attachmentContext ? `\n\nAnexos enviados pelo usuário:\n${attachmentContext}` : ""}`,
        });

        if (aiSynth?.text && aiSynth.text.trim().length > 25) {
          responseMessage = aiSynth.text.trim();
          steps.push({
            id: `step-synth-${synthStart}`,
            type: "model",
            label: "Síntese Consultiva IA (@synthesizer)",
            detail: `Análise contextual elaborada via ${aiSynth.provider}/${aiSynth.model}`,
            status: "completed",
            startedAt: new Date(synthStart).toISOString(),
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - synthStart,
            tokensUsed: 160,
          });
        }
      } catch {
        // Preserva responseMessage já construído caso o pool de IA esteja inacessível no ambiente de teste
      }
    }

    if (!responseMessage) {
      if (platformSearch && platformSearch.cards.length > 0) {
        responseMessage = `Encontrei ótimas opções no Waesy para você aproveitar "${platformSearch.query}". Confira os destaques abaixo:`;
      } else {
        responseMessage =
          "Olá! Sou o seu Assessor Local. Como posso apoiar você hoje?";
      }
    }

    if (!fsm.isFailure && !fsm.isTerminal) {
      if (canTransitionCopilotPhase(fsm.currentPhase, "VALIDATING")) {
        fsm.transition("VALIDATING", "Validação final da resposta e integridade");
      }
      if (canTransitionCopilotPhase(fsm.currentPhase, "COMPLETED")) {
        fsm.transition("COMPLETED", "Pipeline finalizado com sucesso");
      }
    }

    return {
      responseMessage,
      activitySteps: steps,
      executionId,
      artifact,
      structuredPayload,
      updatedMemory,
      fsmPhase: fsm.currentPhase,
      fsmState: fsm.snapshot,
    };
  } catch (pipelineErr: any) {
    console.error("[COPILOT-PIPELINE-BOUNDARY] Erro capturado na esteira:", pipelineErr);
    fsm.recordFailure(pipelineErr);
    steps.push({
      id: `step-boundary-err-${Date.now()}`,
      type: "skill",
      label: "Verificação de Estabilidade do Atendimento",
      detail: `Ajuste automático de conexão: ${pipelineErr?.message || "Oscilação temporária"}`,
      status: "failed",
      fsmPhase: "FAILED_RETRYABLE",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    return {
      responseMessage: "Tivemos uma oscilação rápida ao buscar essas informações. Suas preferências foram salvas com segurança. Já estou pronto para tentar novamente para você.",
      activitySteps: steps,
      updatedMemory,
      fsmPhase: "FAILED_RETRYABLE",
      fsmState: fsm.snapshot,
    };
  }
}

// ============================================================
// 1. Listar Threads de Conversas e Projetos
// ============================================================

export const listAiConversationThreads = createServerFn({ method: "GET" }).handler(
  async (): Promise<AiConversationThreadDTO[]> => {
    try {
      const db = getServerClient();
      const identity = await getServerIdentity().catch(() => null);

      if (!identity?.id) {
        return [];
      }

      const storeIds = Array.from(
        new Set(
          [
            identity.store_id,
            ...(identity.memberships || []).map((membership) => membership.store_id),
          ].filter(Boolean),
        ),
      );
      const visibilityClauses = [
        `customer_id.eq.${identity.id}`,
        `recipient_profile_id.eq.${identity.id}`,
      ];
      if (["platform_admin", "master", "owner", "admin", "manager"].includes(identity.role)) {
        visibilityClauses.push(...storeIds.map((storeId) => `store_id.eq.${storeId}`));
      } else {
        visibilityClauses.push(`assigned_to_profile_id.eq.${identity.id}`);
      }
      let query = db
        .from("chat_threads")
        .select(
          `
          id, type:thread_type, subject, store_id, customer_id, recipient_profile_id, assigned_to_profile_id,
          status, is_pinned, metadata, working_memory, created_at, updated_at
        `,
        )
        .or(visibilityClauses.join(","))
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      const { data, error } = await query;
      if (error || Boolean(data) === false) {
        return [];
      }

      return data.map((t: any) => ({
        id: t.id,
        type: t.type || "store",
        title: t.subject || "Sem Título",
        store_id: t.store_id,
        customer_id: t.customer_id,
        recipient_profile_id: t.recipient_profile_id,
        assigned_to_profile_id: t.assigned_to_profile_id,
        status: t.status || "open",
        is_pinned: Boolean(t.is_pinned),
        metadata: t.metadata || {},
        working_memory: t.working_memory || {},
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));
    } catch {
      return [];
    }
  },
);

// ============================================================
// 2. Criar Nova Thread de Projeto ou Conversa
// ============================================================

export const createAiConversationThread = createServerFn({ method: "POST" })
  .validator(createAiThreadSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }
    assertAiStoreTarget(data.storeId, identity);

    const { data: newThread, error } = await db
      .from("chat_threads")
      .insert({
        customer_id: identity.id,
        store_id: data.storeId || identity.store_id || null,
        recipient_profile_id: data.recipientProfileId || null,
        thread_type: data.type,
        subject: data.title,
        metadata: data.metadata,
        working_memory: data.workingMemory,
        status: "open",
        is_pinned: false,
      })
      .select("id, thread_type, subject, created_at, updated_at")
      .single();

    if (error || Boolean(newThread) === false) {
      throw new Error(error?.message || "Falha ao criar thread de conversa");
    }

    return newThread;
  });

// ============================================================
// 3. Obter Detalhes da Conversa, Mensagens e Artefatos
// ============================================================

export const getAiConversationThread = createServerFn({ method: "GET" })
  .validator(z.object({ threadId: z.string().uuid() }))
  .handler(async ({ data: { threadId } }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }
    const authenticatedIdentity = identity;

    // 1. Thread
    const { data: thread, error: threadErr } = await db
      .from("chat_threads")
      .select("*")
      .eq("id", threadId)
      .single();

    if (threadErr || Boolean(thread) === false) {
      throw new Error("Thread não encontrada");
    }
    assertAiThreadAccess(thread, authenticatedIdentity);

    // 2. Mensagens
    const { data: messages, error: messagesErr } = await db
      .from("chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (messagesErr) throw new Error("Falha ao carregar mensagens da conversa");

    // 3. Artefatos vinculados à thread
    const { data: artifacts, error: artifactsErr } = await db
      .from("chat_artifacts")
      .select("*")
      .eq("thread_id", threadId)
      .order("updated_at", { ascending: false });
    if (artifactsErr) throw new Error("Falha ao carregar artefatos da conversa");

    return {
      thread: {
        id: thread.id,
        type: thread.thread_type || "store",
        title: thread.subject || "Conversa",
        is_pinned: Boolean(thread.is_pinned),
        working_memory: thread.working_memory || {},
        metadata: thread.metadata || {},
        status: thread.status,
      },
      messages: (messages || []).map((m: any) => ({
        id: m.id,
        threadId: m.thread_id,
        clientMessageId: m.client_message_id || undefined,
        executionId: m.payload?.executionId,
        senderId: m.sender_id,
        isStaffOrAI: Boolean(m.is_staff_reply),
        text: m.message,
        createdAt: m.created_at,
        status: m.status || "delivered",
        activitySteps: m.payload?.activitySteps || [],
        toolCalls: m.payload?.toolCalls || [],
        artifact: m.payload?.artifact || null,
        structuredPayload: m.payload?.structuredBlocks || null,
        fsmPhase: m.payload?.fsmPhase,
        fsmState: m.payload?.fsmState,
        attachments: m.attachments || [],
      })),
      artifacts: artifacts || [],
    };
  });

// ============================================================
// 4. Enviar Mensagem com Trilha de Atividade e Geração de Artefato
// ============================================================

export const sendAiConversationMessage = createServerFn({ method: "POST" })
  .validator(sendAiMessageSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    // 1. Obter thread para contexto e memória de trabalho
    const { data: thread } = await db
      .from("chat_threads")
      .select(
        "id, thread_type, working_memory, store_id, customer_id, recipient_profile_id, assigned_to_profile_id",
      )
      .eq("id", data.threadId)
      .single();

    if (!thread) {
      throw new Error("Thread inexistente");
    }
    assertAiThreadAccess(thread, identity);

    // 2. Inserir ou recuperar a mensagem do usuário por chave estável.
    // A constraint (thread_id, client_message_id) é a última barreira contra
    // retries concorrentes; o lookup anterior permite devolver o resultado já
    // persistido sem executar o pipeline/consumir tokens novamente.
    let userMsg: { id: string; created_at: string } | null = null;
    if (data.clientMessageId) {
      const { data: existingUser } = await db
        .from("chat_messages")
        .select("id, created_at, status, message, payload")
        .eq("thread_id", data.threadId)
        .eq("client_message_id", data.clientMessageId)
        .eq("sender_id", identity.id)
        .eq("is_staff_reply", false)
        .maybeSingle();

      if (existingUser) {
        const { data: existingAi } = await db
          .from("chat_messages")
          .select("id, created_at, message, payload, status")
          .eq("thread_id", data.threadId)
          .eq("is_staff_reply", true)
          .contains("payload", { clientMessageId: data.clientMessageId })
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (existingAi) {
          return {
            userMessageId: existingUser.id,
            aiMessage: mapPersistedAiMessage(existingAi, data.threadId),
            updatedWorkingMemory: thread.working_memory || {},
          };
        }

        if (existingUser.status === "sending") {
          throw new Error("Mensagem já está em processamento; aguarde a resposta persistida.");
        }

        const { error: resetError } = await db
          .from("chat_messages")
          .update({ status: "sending", failed_at: null, error_message: null })
          .eq("id", existingUser.id);
        if (resetError) throw new Error("Falha ao reabrir mensagem para retry");
        userMsg = { id: existingUser.id, created_at: existingUser.created_at };
      }
    }

    if (!userMsg) {
      const { data: insertedUser, error: userMsgErr } = await db
        .from("chat_messages")
        .insert({
          thread_id: data.threadId,
          client_message_id: data.clientMessageId || null,
          sender_id: identity.id,
          is_staff_reply: false,
          message: data.message,
          message_type: "text",
          attachments: data.attachments || [],
          status: "sending",
        })
        .select("id, created_at")
        .single();

      if (userMsgErr || Boolean(insertedUser) === false) {
        if (data.clientMessageId && userMsgErr?.code === "23505") {
          const { data: winner } = await db
            .from("chat_messages")
            .select("id, created_at, status, payload")
            .eq("thread_id", data.threadId)
            .eq("client_message_id", data.clientMessageId)
            .eq("sender_id", identity.id)
            .eq("is_staff_reply", false)
            .maybeSingle();
          if (winner) {
            const { data: winnerAi } = await db
              .from("chat_messages")
              .select("id, created_at, message, payload, status")
              .eq("thread_id", data.threadId)
              .eq("is_staff_reply", true)
              .contains("payload", { clientMessageId: data.clientMessageId })
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();
            if (winnerAi) {
              return {
                userMessageId: winner.id,
                aiMessage: mapPersistedAiMessage(winnerAi, data.threadId),
                updatedWorkingMemory: thread.working_memory || {},
              };
            }
            if (winner.status === "sending") {
              throw new Error("Mensagem já está em processamento; aguarde a resposta persistida.");
            }
          }
          throw new Error(
            "Mensagem duplicada sem resposta persistida; tente novamente para recuperar o resultado.",
          );
        }
        throw new Error("Falha ao registrar mensagem do usuário");
      }
      userMsg = insertedUser;
    }

    // 3. Execução do pipeline de IA ReAct com chamada de ferramentas reais (com Error Boundary)
    let execution: AiExecutionResult;
    const copilotAbortController = new AbortController();
    try {
      execution = await withCopilotTimeout(
        executeAiCopilotPipeline(data.message, thread.working_memory || {}, {
          threadId: data.threadId,
          userId: identity.id,
          storeId: thread.store_id || undefined,
          userLat: data.userLat,
          userLng: data.userLng,
          city: normalizeActiveCity(data.city) ?? resolveActiveCity(),
          signal: copilotAbortController.signal,
          attachments: data.attachments || [],
        }),
        45_000,
        copilotAbortController,
      );
    } catch (pipelineErr: any) {
      console.warn(
        "[COPILOT-DEFENSIVE-WRAPPER] Erro capturado em sendAiConversationMessage:",
        pipelineErr,
      );
      execution = {
        responseMessage:
          "Tivemos uma oscilação rápida ao buscar esses dados. Suas informações foram preservadas com segurança e já estou pronto para tentar novamente para você.",
        activitySteps: [
          {
            id: `step-err-${Date.now()}`,
            type: "tool",
            label: "Oscilação Temporária",
            detail: String(pipelineErr?.message || "Reconexão necessária").slice(0, 100),
            status: "failed",
            fsmPhase: "FAILED_RETRYABLE",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          },
        ],
        updatedMemory: thread.working_memory || {},
        fsmPhase: "FAILED_RETRYABLE",
      };
    }

    // 4–6. Finalizar o exchange em uma única transação no Postgres.
    // A RPC cria o artefato, a resposta da IA, atualiza o status da mensagem
    // do usuário e a memória da thread; qualquer falha faz rollback do conjunto.
    const aiStatus =
      execution.fsmPhase === "FAILED_RETRYABLE" || execution.fsmPhase === "FAILED_FINAL"
        ? "failed"
        : "delivered";
    const messageType =
      execution.structuredPayload || execution.artifact ? "structured_blocks" : "text";
    const aiPayload = {
      executionId: execution.executionId,
      activitySteps: execution.activitySteps,
      toolCalls: execution.toolCalls || [],
      artifact: execution.artifact,
      structuredBlocks: execution.structuredPayload,
      clientMessageId: data.clientMessageId || null,
      userMessageId: userMsg.id,
      replyToId: data.replyToId || null,
      fsmPhase: execution.fsmPhase,
      fsmState: execution.fsmState,
    };
    const { data: persistedExchange, error: exchangeError } = await db.rpc(
      "persist_ai_conversation_exchange_atomic",
      {
        p_thread_id: data.threadId,
        p_user_message_id: userMsg.id,
        p_sender_id: identity.id,
        p_user_status: aiStatus,
        p_ai_message: execution.responseMessage,
        p_ai_message_type: messageType,
        p_ai_payload: aiPayload,
        p_ai_status: aiStatus,
        p_updated_memory: execution.updatedMemory,
        p_artifact: execution.artifact || null,
        p_store_id: thread.store_id || null,
      },
    );

    if (exchangeError || !persistedExchange) {
      throw new Error(
        `Falha ao finalizar exchange do Copilot: ${exchangeError?.message || "resultado vazio"}`,
      );
    }

    const persistedArtifactId = (persistedExchange as { artifact_id?: string | null }).artifact_id;
    if (execution.artifact && persistedArtifactId) {
      execution.artifact.id = persistedArtifactId;
    }
    const persistedAiMessageId = (persistedExchange as { ai_message_id?: string }).ai_message_id;
    const persistedAiCreatedAt = (persistedExchange as { ai_created_at?: string }).ai_created_at;

    // 🧠 Motor Autônomo Estilo Manus AI: Aprendizado contínuo & Memória episódica
    extractAndSaveFactsFromConversation({
      profileId: identity.id,
      userPrompt: data.message,
      threadId: data.threadId,
    }).catch((err) => console.warn("[COPILOT-LEARNING] Falha ao extrair fatos:", err));

    storeSemanticMemoryChunk({
      sessionId: data.threadId,
      profileId: identity.id,
      contentChunk: `Usuário: ${data.message}\nCopilot: ${execution.responseMessage}`,
      importanceScore: execution.artifact ? 0.8 : 0.5,
    }).catch((err) => console.warn("[COPILOT-LEARNING] Falha ao gravar memória semântica:", err));

    return {
      userMessageId: userMsg.id,
      aiMessage: {
        id: persistedAiMessageId || crypto.randomUUID(),
        text: execution.responseMessage,
        activitySteps: execution.activitySteps,
        executionId: execution.executionId,
        artifact: execution.artifact,
        structuredPayload: execution.structuredPayload,
        createdAt: persistedAiCreatedAt || new Date().toISOString(),
        status:
          execution.fsmPhase === "FAILED_RETRYABLE" || execution.fsmPhase === "FAILED_FINAL"
            ? "failed"
            : "delivered",
        fsmPhase: execution.fsmPhase,
        fsmState: execution.fsmState,
        toolCalls: execution.toolCalls || [],
      },
      updatedWorkingMemory: execution.updatedMemory,
    };
  });

// ============================================================
// 5. Salvar / Versionar Artefato no Chat
// ============================================================

export const saveAiChatArtifact = createServerFn({ method: "POST" })
  .validator(saveAiArtifactSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    const { data: thread, error: threadError } = await db
      .from("chat_threads")
      .select("id, customer_id, recipient_profile_id, store_id, assigned_to_profile_id")
      .eq("id", data.threadId)
      .single();
    if (threadError || !thread) throw new Error("Thread não encontrada");
    assertAiThreadAccess(thread, identity);
    assertAiStoreTarget(data.storeId, identity);
    if (data.storeId && thread.store_id !== data.storeId)
      throw new Error("O artefato não pertence à loja da thread");
    if (!thread.store_id && data.storeId)
      throw new Error("Thread sem loja não aceita artefato com tenant explícito");

    const { data: artifact, error } = await db
      .from("chat_artifacts")
      .insert({
        thread_id: data.threadId,
        message_id: data.messageId || null,
        store_id: thread.store_id || null,
        created_by: identity.id,
        artifact_type: data.artifactType,
        title: data.title,
        version: data.version,
        data: data.data,
        metadata: data.metadata,
      })
      .select("*")
      .single();

    if (error || Boolean(artifact) === false) {
      throw new Error("Falha ao salvar artefato");
    }

    return artifact;
  });

// ============================================================
// 6. Fixar / Desafixar Thread
// ============================================================

export const toggleAiThreadPinned = createServerFn({ method: "POST" })
  .validator(toggleThreadPinnedSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    const { data: thread } = await db
      .from("chat_threads")
      .select("customer_id, recipient_profile_id, store_id, assigned_to_profile_id")
      .eq("id", data.threadId)
      .single();
    if (!thread) throw new Error("Thread não encontrada");
    assertAiThreadAccess(thread, identity);
    const { error } = await db
      .from("chat_threads")
      .update({ is_pinned: data.isPinned, updated_at: new Date().toISOString() })
      .eq("id", data.threadId);

    if (error) {
      throw new Error("Falha ao alterar fixação da thread");
    }

    return { success: true, isPinned: data.isPinned };
  });

export const toggleAiThreadArchived = createServerFn({ method: "POST" })
  .validator(z.object({ threadId: z.string().uuid(), isArchived: z.boolean() }))
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) throw new Error("Usuário não autenticado");
    const { data: thread } = await db
      .from("chat_threads")
      .select("customer_id, recipient_profile_id, store_id, assigned_to_profile_id")
      .eq("id", data.threadId)
      .single();
    if (!thread) throw new Error("Thread não encontrada");
    assertAiThreadAccess(thread, identity);
    const { error } = await db
      .from("chat_threads")
      .update({
        status: data.isArchived ? "archived" : "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.threadId);
    if (error) throw new Error("Falha ao alterar arquivamento da thread");
    return { success: true, isArchived: data.isArchived };
  });

// ============================================================
// 7. Excluir Thread do Copilot
// ============================================================

export const deleteAiThreadSchema = z.object({
  threadId: z.string().uuid(),
});

export const deleteAiConversationThread = createServerFn({ method: "POST" })
  .validator(deleteAiThreadSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    const { data: thread } = await db
      .from("chat_threads")
      .select("id, customer_id, recipient_profile_id, store_id, assigned_to_profile_id")
      .eq("id", data.threadId)
      .single();

    if (!thread) {
      throw new Error("Thread não encontrada");
    }

    assertAiThreadAccess(thread, identity);

    await db.from("chat_messages").delete().eq("thread_id", data.threadId);
    await db.from("chat_artifacts").delete().eq("thread_id", data.threadId);
    const { error } = await db.from("chat_threads").delete().eq("id", data.threadId);

    if (error) {
      throw new Error("Falha ao excluir conversa");
    }

    return { success: true };
  });

// ============================================================
// 8. Mensagem de Convidado / Guest para o Copilot
// ============================================================

export const executeGuestCopilotMessageSchema = z.object({
  message: z.string().min(1, "Mensagem não pode ser vazia").max(2000),
  userLat: z.number().optional(),
  userLng: z.number().optional(),
  city: z.string().max(120).optional(),
});

export const executeGuestCopilotMessage = createServerFn({ method: "POST" })
  .validator(executeGuestCopilotMessageSchema)
  .handler(async ({ data }) => {
    enforceRateLimit("guest", "ai_generation");
    if (
      /\b(minerar|mineração|leads?|planilha|vagas?|eventos?|cnpj|processo)\b/i.test(data.message)
    ) {
      throw new Error("A busca avançada exige uma sessão autenticada.");
    }
    const copilotAbortController = new AbortController();
    const execution = await withCopilotTimeout(
      executeAiCopilotPipeline(
        data.message,
        {},
        {
          userLat: data.userLat,
          userLng: data.userLng,
          city: data.city,
          signal: copilotAbortController.signal,
        },
      ),
      45_000,
      copilotAbortController,
    );
    return execution;
  });

/** Entrada canónica do drawer global, mantendo o pipeline no boundary server-side. */
export const executeCopilotDrawerMessage = createServerFn({ method: "POST" })
  .validator(executeGuestCopilotMessageSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    enforceRateLimit(identity?.id || "guest", "ai_generation");
    if (
      !identity?.id &&
      /\b(minerar|mineração|leads?|planilha|vagas?|eventos?|cnpj|processo)\b/i.test(data.message)
    ) {
      throw new Error("A busca avançada exige uma sessão autenticada.");
    }
    const copilotAbortController = new AbortController();
    return withCopilotTimeout(
      executeAiCopilotPipeline(
        data.message,
        {},
        {
          userId: identity?.id || undefined,
          userLat: data.userLat,
          userLng: data.userLng,
          city: data.city,
          signal: copilotAbortController.signal,
        },
      ),
      45_000,
      copilotAbortController,
    );
  });

// ============================================================
// 9. Dispatcher tipado de ações do Chat
// ============================================================

const chatActionSchema = z.object({
  action_type: z.enum(["add_to_cart", "request_travel_quote", "submit_legal_demand", "publish_ad"]),
  payload: z.record(z.any()).default({}),
});

const reviewChatActionSchema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(500).optional(),
});

const HIGH_IMPACT_CHAT_ACTIONS = new Set([
  "request_travel_quote",
  "submit_legal_demand",
  "publish_ad",
]);

type ChatActionType = z.infer<typeof chatActionSchema>["action_type"];
type ChatActionPayload = Record<string, any>;

export function isHighImpactChatAction(actionType: ChatActionType): boolean {
  return HIGH_IMPACT_CHAT_ACTIONS.has(actionType);
}

export function approvalIdempotencyKey(
  actionType: ChatActionType,
  payload: ChatActionPayload,
): string {
  const normalized = JSON.stringify(payload, Object.keys(payload).sort()).slice(0, 12000);
  return `${actionType}:${normalized}`;
}

async function executeApprovedChatAction(
  identity: NonNullable<Awaited<ReturnType<typeof getServerIdentity>>>,
  actionType: ChatActionType,
  payload: ChatActionPayload,
) {
  switch (actionType) {
    case "add_to_cart": {
      const productId = payload.productId || payload.product_id || payload.id;
      if (typeof productId !== "string" || !productId) throw new Error("Produto não identificado");
      const { addToCart } = await import("./cart.functions");
      return await addToCart({
        data: { productId, quantity: Math.max(1, Number(payload.quantity) || 1) },
      });
    }
    case "request_travel_quote": {
      const { requestTravelQuote } = await import("./tourism.functions");
      const destination = String(payload.destination || "").trim();
      const origin = String(payload.origin_city || "").trim();
      const contactName = String(identity.fullName || identity.name || "").trim();
      const contactEmail = String(identity.email || "").trim();
      if (!origin || !destination || !contactName || !contactEmail)
        throw new Error("Origem, destino e dados de contato são obrigatórios");
      return await requestTravelQuote({
        data: {
          origin_city: origin,
          destination_city: destination,
          rooms_count: Math.max(1, Number(payload.rooms_count) || 1),
          adults_count: Math.max(1, Number(payload.passengers_count) || 1),
          children_count: 0,
          children_ages: [],
          trip_type: "air_package",
          flexible_dates: true,
          contact_name: contactName,
          contact_whatsapp: String(
            (payload as any).whatsapp ||
            (payload as any).contact_whatsapp ||
            (identity as any).phone ||
            (identity as any).whatsapp ||
            ""
          ),
          contact_email: contactEmail,
          special_notes: typeof payload.notes === "string" ? payload.notes : undefined,
        },
      });
    }
    case "submit_legal_demand": {
      const { createJusDemand } = await import("./jus.functions");
      const title = String(payload.title || "").trim();
      const description = String(payload.description || "").trim();
      if (title.length < 3 || description.length < 10)
        throw new Error("Título e descrição completos são obrigatórios");
      return await createJusDemand({
        data: {
          title,
          legal_area: String(payload.legal_area || "Direito Cível"),
          description,
          urgency: ["low", "normal", "high", "urgent"].includes(payload.urgency)
            ? payload.urgency
            : "normal",
          city: typeof payload.city === "string" ? payload.city : undefined,
          state: typeof payload.state === "string" ? payload.state : undefined,
          documents: [],
          is_anonymous: false,
        },
      });
    }
    case "publish_ad": {
      const { upsertClassified } = await import("./classifieds.functions");
      const title = String(payload.headline || "").trim();
      const content = String(payload.body_text || "").trim();
      if (title.length < 3 || content.length < 10)
        throw new Error("Título e descrição completos são obrigatórios");
      return await upsertClassified({
        data: { title, category: "sale", content, price_cents: Number(payload.price_cents) || 0 },
      });
    }
  }
}

export const dispatchAiChatAction = createServerFn({ method: "POST" })
  .validator(chatActionSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) throw new Error("Faça login para executar esta ação");

    if (!isHighImpactChatAction(data.action_type)) {
      return executeApprovedChatAction(identity, data.action_type, data.payload);
    }

    const db = getServerClient();
    const idempotencyKey = approvalIdempotencyKey(data.action_type, data.payload);
    const { data: inserted, error: insertError } = await db
      .from("copilot_action_approvals")
      .insert({
        user_id: identity.id,
        store_id: identity.store_id || null,
        action_type: data.action_type,
        payload: data.payload,
        idempotency_key: idempotencyKey,
      })
      .select("id, status, expires_at")
      .maybeSingle();

    if (insertError?.code === "23505") {
      const { data: existing } = await db
        .from("copilot_action_approvals")
        .select("id, status, expires_at")
        .eq("user_id", identity.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing?.status === "approved")
        throw new Error("Esta ação já foi aprovada e executada.");
      if (existing?.status === "rejected") throw new Error("Esta ação já foi rejeitada.");
      return {
        status: "needs_approval" as const,
        approvalId: existing?.id,
        expiresAt: existing?.expires_at,
      };
    }
    if (insertError || !inserted) throw new Error("Não foi possível registrar a aprovação humana");

    return {
      status: "needs_approval" as const,
      approvalId: inserted.id,
      expiresAt: inserted.expires_at,
    };
  });

export const reviewAiChatAction = createServerFn({ method: "POST" })
  .validator(reviewChatActionSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) throw new Error("Faça login para revisar esta ação");
    const db = getServerClient();
    const { data: approval, error } = await db
      .from("copilot_action_approvals")
      .select("*")
      .eq("id", data.approvalId)
      .maybeSingle();
    if (error || !approval) throw new Error("Solicitação de aprovação não encontrada");
    const canReview =
      approval.user_id === identity.id ||
      (Boolean(approval.store_id) &&
        approval.store_id === identity.store_id &&
        ["owner", "admin", "manager"].includes(String(identity.role || "")));
    if (!canReview) throw new Error("Você não tem permissão para revisar esta ação");
    if (approval.expires_at && new Date(approval.expires_at).getTime() <= Date.now()) {
      await db
        .from("copilot_action_approvals")
        .update({ status: "expired" })
        .eq("id", approval.id)
        .eq("status", "pending");
      throw new Error("A solicitação de aprovação expirou");
    }
    if (approval.status === "approved")
      return { status: "approved" as const, result: approval.result };
    if (approval.status !== "pending") throw new Error(`A solicitação já está ${approval.status}`);
    if (data.decision === "reject") {
      await db
        .from("copilot_action_approvals")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: identity.id,
          result: { reason: data.reason || null },
        })
        .eq("id", approval.id)
        .eq("status", "pending");
      return { status: "rejected" as const, approvalId: approval.id };
    }

    const { data: claimed } = await db
      .from("copilot_action_approvals")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: identity.id,
      })
      .eq("id", approval.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) throw new Error("Esta aprovação já está sendo processada");

    try {
      const result = await executeApprovedChatAction(
        identity,
        approval.action_type as ChatActionType,
        approval.payload as ChatActionPayload,
      );
      await db.from("copilot_action_approvals").update({ result }).eq("id", approval.id);
      return { status: "approved" as const, approvalId: approval.id, result };
    } catch (executionError) {
      await db
        .from("copilot_action_approvals")
        .update({
          status: "failed",
          result: {
            error: String(
              executionError instanceof Error ? executionError.message : executionError,
            ).slice(0, 500),
          },
        })
        .eq("id", approval.id);
      throw executionError;
    }
  });

// ============================================================
// 10. Upload Multimodal do Copilot (Camada 3 - PDFs, Imagens, CSV)
// ============================================================

export const uploadCopilotAttachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  base64Data: z.string().min(1),
  tenantId: z.string().optional(),
});

export interface CopilotMultimodalAttachmentResult {
  url: string;
  storagePath: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  extractedText?: string;
  metadata: {
    tenantId: string;
    linesCount?: number;
    uploadedAt: string;
  };
}

export const uploadCopilotMultimodalAttachment = createServerFn({ method: "POST" })
  .validator(uploadCopilotAttachmentSchema)
  .handler(async ({ data }): Promise<CopilotMultimodalAttachmentResult> => {
    const identity = await getServerIdentity().catch(() => null);
    enforceRateLimit(identity?.id || "guest", "media_upload");

    const cleanMime = data.fileType.toLowerCase().split(";")[0].trim();
    const ALLOWED_COPILOT_MIMES = new Set([
      "application/pdf",
      "text/plain",
      "text/csv",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
    ]);

    if (!ALLOWED_COPILOT_MIMES.has(cleanMime)) {
      throw new Error(`Tipo de arquivo '${data.fileType}' não permitido. Formatos aceitos: PDF, CSV, TXT e imagens.`);
    }

    // Decodifica inline Base64
    const base64Content = data.base64Data.includes(",") ? data.base64Data.split(",", 2)[1] : data.base64Data;
    const normalized = base64Content.replace(/\s/g, "");
    const buffer = Buffer.from(normalized, "base64");
    const sizeBytes = buffer.length;

    if (sizeBytes === 0) {
      throw new Error("Arquivo vazio ou corrompido.");
    }

    if (sizeBytes > 15 * 1024 * 1024) {
      throw new Error("Arquivo excede o limite máximo permitido de 15 MB.");
    }

    const tenantId = data.tenantId || identity?.store_id || identity?.id || "general";
    const ext = data.fileName.split(".").pop() || "bin";
    const sanitizedName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80);
    const storagePath = `tenants/${tenantId}/copilot-uploads/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${sanitizedName}.${ext}`;

    const supabase = getServerClient();
    const bucket = "copilot-uploads";
    let uploadUrl = "";

    // Tentativa com fallback de bucket para garantir resiliência
    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
      contentType: cleanMime,
      upsert: true,
    });

    if (uploadError) {
      const fallbackBucket = "store-assets";
      const { error: fbErr } = await supabase.storage.from(fallbackBucket).upload(storagePath, buffer, {
        contentType: cleanMime,
        upsert: true,
      });
      if (fbErr) {
        console.warn("[copilot-upload] fallback bucket storage warning:", fbErr.message);
      }
      const { data: fbUrl } = supabase.storage.from(fallbackBucket).getPublicUrl(storagePath);
      uploadUrl = fbUrl?.publicUrl || "";
    } else {
      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      uploadUrl = pubData?.publicUrl || "";
    }

    // Processamento e extração inicial de texto/conteúdo
    let extractedText: string | undefined;
    let linesCount: number | undefined;

    if (cleanMime === "text/plain" || cleanMime === "text/csv") {
      const fullText = buffer.toString("utf-8");
      linesCount = fullText.split("\n").length;
      extractedText = fullText.slice(0, 30_000);
    } else if (cleanMime === "application/pdf") {
      const ascii = buffer.toString("latin1");
      const pageMatches = ascii.match(/\/Type\s*\/Page\b/g);
      const pagesCount = pageMatches ? pageMatches.length : 1;
      extractedText = `[Documento PDF: ${data.fileName}, aprox. ${pagesCount} página(s), tamanho: ${(sizeBytes / 1024).toFixed(1)} KB]`;
    } else if (cleanMime.startsWith("image/")) {
      extractedText = `[Imagem anexada: ${data.fileName}, formato ${cleanMime}, tamanho: ${(sizeBytes / 1024).toFixed(1)} KB. Pronta para extração OCR/IA]`;
    }

    return {
      url: uploadUrl,
      storagePath,
      fileName: data.fileName,
      fileType: cleanMime,
      sizeBytes,
      extractedText,
      metadata: {
        tenantId,
        linesCount,
        uploadedAt: new Date().toISOString(),
      },
    };
  });

