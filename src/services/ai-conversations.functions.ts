/**
 * ai-conversations.functions.ts — BFF Server Functions para o Shell de Conversa AI-First
 * Suporte a Threads de Projetos, Memória de Trabalho, Trilha de Atividade e Artefatos Versionados.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, STAFF_ROLES, requireStoreVerticalAccess } from "@/lib/server-access";
import { inspectPromptSecurity, buildSandboxedPromptPayload } from "@/lib/ai/prompt-shield";
import { CANONICAL_ARTIFACT_TYPES, normalizeArtifactType } from "@/lib/ai/artifact-contract";
import { executeAiCoreGateway } from "./ai-core-gateway.functions";
import {
  executeAutonomousCopilotTask,
  fragmentAndOptimizePrompt,
  needsCityClarification,
} from "./autonomous-copilot-orchestrator";
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
  ChatSourceItem,
  CopilotQuickToolMode,
} from "@/types/chat";
import {
  assembleLongTermContext,
  extractAndSaveFactsFromConversation,
  storeSemanticMemoryChunk,
} from "./copilot-memory.functions";
import { retrieveRelevantProjectKnowledgeContext } from "./copilot-projects.functions";
import {
  listActiveExternalMcpToolsForUser,
  invokeExternalMcpToolForUser,
} from "./mcp-connectors.functions";
import { getActiveSkillSlugsForUser } from "./ai-skills-router.functions";
import { runSquadGraphExecution } from "./ai-agent-squad-orchestrator.functions";
import { runCopilotReactOrchestrator } from "./copilot-react-orchestrator";
import {
  controlCopilotExecution,
  loadCopilotExecutionForContinue,
} from "./copilot-execution-persistence";
import type {
  AiCopilotContext,
  AiExecutionResult,
  AiToolExecutionRecord,
} from "@/lib/ai/copilot-types";
export type { AiCopilotContext, AiExecutionResult, AiToolExecutionRecord } from "@/lib/ai/copilot-types";

// ============================================================
// Schemas de Validação
// ============================================================

export const createAiThreadSchema = z.object({
  type: z.enum(["project", "ai_assistant", "direct_p2p", "store", "support"]).default("project"),
  title: z.string().min(2, "Título deve ter no mínimo 2 caracteres"),
  storeId: z.string().uuid().optional(),
  recipientProfileId: z.string().uuid().optional(),
  folderId: z.string().uuid().nullish(),
  projectId: z.string().uuid().nullish(),
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
  quickToolMode: z
    .enum(["default", "website_builder", "interactive_map", "document", "creative_post", "hot_offer"])
    .optional(),
  userLat: z.number().optional(),
  userLng: z.number().optional(),
  city: z.string().max(120).optional(),
});

export const saveAiArtifactSchema = z.object({
  threadId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  artifactType: z.enum(CANONICAL_ARTIFACT_TYPES),
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
    sources: payload.sources || [],
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
  folder_id?: string | null;
  project_id?: string | null;
  status: string;
  is_pinned: boolean;
  metadata: Record<string, any>;
  working_memory: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_message_snippet?: string;
  last_message_at?: string;
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
        headers: ["Período", "Entradas (R$)", "Saídas (R$)", "Saldo Líquido (R$)", "Margem (%)"],
        rows: [
          ["Período 1 (Modelo)", "0,00", "0,00", "0,00", "0,0%"],
        ],
      },
    };

    responseMessage =
      "Gerei o modelo estrutural da planilha com as métricas financeiras. O artefato tabular pode ser preenchido ou exportado diretamente:";
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
            storeName: "Catálogo da Loja",
            items: [],
            subtotalCents: 0,
            shippingCents: 0,
            discountCents: 0,
            totalCents: 0,
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

export interface ResolvedCopilotAttachments {
  images: Array<{ mimeType: string; base64: string }>;
  textBlocks: string[];
  notes: string[];
}

const COPILOT_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
const COPILOT_ATTACHMENT_MAX_COUNT = 4;

export async function extractPdfTextBestEffort(buf: Buffer): Promise<string> {
  const chunks: string[] = [];
  const pushLiteralsFromString = (source: string) => {
    const parenRegex = /\(([^()\\]{3,240})\)/g;
    let m: RegExpExecArray | null = parenRegex.exec(source);
    while (m && chunks.length < 3500) {
      const cleaned = m[1].replace(/[^\x20-\x7E\xA0-\xFF]/g, " ").replace(/\s+/g, " ").trim();
      if (cleaned.length >= 3 && /[a-zA-ZÀ-ÿ0-9]/.test(cleaned)) {
        chunks.push(cleaned);
      }
      m = parenRegex.exec(source);
    }
  };

  const rawLatin1 = buf.toString("latin1");
  pushLiteralsFromString(rawLatin1);

  if (chunks.join(" ").length < 80) {
    try {
      const zlib = await import("zlib");
      const streamRegex = /stream\r?\n([\s\S]*?)\r?\n?endstream/g;
      let sm: RegExpExecArray | null = streamRegex.exec(rawLatin1);
      let inspectedStreams = 0;
      while (sm && inspectedStreams < 48 && chunks.length < 3500) {
        inspectedStreams += 1;
        const compressedBytes = Buffer.from(sm[1], "latin1");
        if (compressedBytes.length > 0 && compressedBytes.length <= 2 * 1024 * 1024) {
          try {
            const inflated = zlib.inflateSync(compressedBytes).toString("latin1");
            pushLiteralsFromString(inflated);
          } catch {
            // Stream não comprimido com zlib/FlateDecode ou protegido
          }
        }
        sm = streamRegex.exec(rawLatin1);
      }
    } catch {
      // Ambiente sem zlib disponível
    }
  }

  return chunks.join(" ").replace(/\s+/g, " ").trim().slice(0, 20_000);
}

/**
 * Baixa os anexos do chat e os converte em insumo real para a IA:
 * imagens viram payload multimodal (visão/OCR), CSV/TXT/JSON/PDF viram texto no prompt.
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
        const extractedPdf = await extractPdfTextBestEffort(buf);
        if (extractedPdf.length >= 12) {
          result.textBlocks.push(extractedPdf);
        } else {
          result.notes.push(
            "PDF recebido sem camada de texto selecionável (digitalizado ou protegido); envie capturas das páginas para leitura visual (OCR).",
          );
        }
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

export interface SpecialistPersona {
  tag: "@ads_performance" | "@sdr_hunter" | "@creative_studio" | "@data_analyst" | "@advisor_executive";
  name: string;
  role: string;
  systemDirective: string;
  recommendedIntents: string[];
}

export function resolveSpecialistPersona(
  userPrompt: string,
  context: AiCopilotContext = {},
): SpecialistPersona {
  const p = userPrompt.toLowerCase();
  const city = context.city || "sua região";

  if (
    p.includes("anúncio") ||
    p.includes("anuncio") ||
    p.includes("tráfego") ||
    p.includes("trafego") ||
    p.includes("campanha") ||
    p.includes("meta ads") ||
    p.includes("google ads") ||
    p.includes("roas") ||
    p.includes("cpa") ||
    p.includes("pixel") ||
    p.includes("público-alvo") ||
    p.includes("publico alvo") ||
    p.includes("@ads_performance")
  ) {
    return {
      tag: "@ads_performance",
      name: "Especialista em Performance & Ads",
      role: "Gestor Sênior de Tráfego Pago e ROAS",
      systemDirective: `Você é o Especialista em Performance e Tráfego Pago do Waesy (@ads_performance).
Sua missão é desenhar campanhas de alta conversão para Meta Ads e Google Ads, definir públicos-alvo hiperlocais em ${city}, criar ganchos de copy com alto CTR e estimar métricas de conversão e ROAS realistas.`,
      recommendedIntents: ["create_ad", "creative_post", "general_chat"],
    };
  }

  if (
    p.includes("prospecção") ||
    p.includes("prospeccao") ||
    p.includes("prospectar") ||
    p.includes("leads") ||
    p.includes("lead") ||
    p.includes("cnpj") ||
    p.includes("sdr") ||
    p.includes("bdr") ||
    p.includes("pipeline") ||
    p.includes("cold mail") ||
    p.includes("cold message") ||
    p.includes("lista de empresas") ||
    p.includes("@sdr_hunter")
  ) {
    return {
      tag: "@sdr_hunter",
      name: "SDR Hunter & BDR de Contas",
      role: "Especialista em Prospecção Ativa B2B",
      systemDirective: `Você é o Especialista em Prospecção Ativa e BDR do Waesy (@sdr_hunter).
Sua missão é mapear e qualificar empresas por ICP em ${city}, estruturar dados verificados de CNPJs e decisores, elaborar abordagens consultivas de cold outreach no WhatsApp e organizar pipelines comerciais de alto fechamento.`,
      recommendedIntents: ["search_places", "commercial_proposal", "general_chat"],
    };
  }

  if (
    p.includes("post") ||
    p.includes("carrossel") ||
    p.includes("story") ||
    p.includes("stories") ||
    p.includes("reels") ||
    p.includes("instagram") ||
    p.includes("social media") ||
    p.includes("legenda") ||
    p.includes("criativo") ||
    p.includes("arte") ||
    p.includes("@creative_studio")
  ) {
    return {
      tag: "@creative_studio",
      name: "Diretor de Criação & Social Media",
      role: "Head de Conteúdo e Identidade Visual",
      systemDirective: `Você é o Diretor de Criação do Waesy (@creative_studio).
Sua missão é criar peças visuais de alto impacto, carrosséis educativos, posts de feed (1:1), retratos (4:5) e stories (9:16) com tipografia limpa, hierarquia visual nítida, paletas de cores semânticas e legendas persuasivas com hashtags estratégicas.`,
      recommendedIntents: ["creative_post", "create_ad", "general_chat"],
    };
  }

  if (
    p.includes("dashboard") ||
    p.includes("métrica") ||
    p.includes("metrica") ||
    p.includes("kpi") ||
    p.includes("dre") ||
    p.includes("caixa") ||
    p.includes("financeir") ||
    p.includes("faturamento") ||
    p.includes("receita") ||
    p.includes("planilha") ||
    p.includes("fechamento") ||
    p.includes("@data_analyst")
  ) {
    return {
      tag: "@data_analyst",
      name: "Analista de Inteligência de Negócios",
      role: "Controladoria & Data Analytics",
      systemDirective: `Você é o Analista Executivo de Inteligência de Negócios do Waesy (@data_analyst).
Sua missão é traduzir dados operacionais, pedidos e fluxo financeiro em dashboards executivos com KPIs transparentes, alertas de caixa, ticket médio e metas de crescimento sustentável.`,
      recommendedIntents: ["generate_dashboard", "financial_report", "general_chat"],
    };
  }

  return {
    tag: "@advisor_executive",
    name: "Assessor Executivo Local",
    role: "Concierge & Consultor Regional",
    systemDirective: `Você é o Assessor Executivo Local de ${city} no ecossistema Waesy (@advisor_executive).
Seu papel é acolher, orientar e resolver demandas locais com extrema cordialidade, tom consultivo executivo, empatia genuína e precisão factual inegociável.`,
    recommendedIntents: [
      "search_places",
      "estimate_mobility",
      "search_catalog",
      "travel_itinerary",
      "legal_triage",
      "commercial_proposal",
      "general_chat",
    ],
  };
}

export function isExplicitCreationOrBuilderPrompt(
  text: string,
  workingMemory?: Record<string, any>,
): boolean {
  const lower = text.toLowerCase();
  if (
    /\b(post|carrossel|story|stories|reels|instagram|social\s*media|an[úu]ncio|arte|banner|propaganda|criativo|flyer|cartaz|foramto|formato\s+(?:story|feed|retrato|1:1|9:16|4:5|16:9))\b/i.test(
      lower,
    )
  ) {
    return true;
  }
  if (
    /\b(apresenta[çc][ãa]o|slide|slides|pitch|deck|landing\s*page|criar\s+site|fazer\s+site|montar\s+site|p[áa]gina\s+web|planilha|proposta\s+comercial)\b/i.test(
      lower,
    )
  ) {
    return true;
  }
  return false;
}

export function detectIntent(text: string, _workingMemory?: Record<string, any>): string {
  const lower = text.toLowerCase();
  if (
    lower.includes("dashboard") ||
    lower.includes("métrica") ||
    lower.includes("metrica") ||
    lower.includes("kpi") ||
    lower.includes("indicador")
  ) {
    return "generate_dashboard";
  }
  if (
    lower.includes("post") ||
    lower.includes("carrossel") ||
    lower.includes("story") ||
    lower.includes("stories") ||
    lower.includes("reels") ||
    lower.includes("instagram") ||
    lower.includes("social media") ||
    lower.includes("foramto") ||
    /\bformato\s+(?:story|stories|feed|retrato|quadrado|1:1|9:16|4:5)\b/i.test(lower)
  ) {
    return "creative_post";
  }
  if (
    lower.includes("anúncio") ||
    lower.includes("anuncio") ||
    lower.includes("arte") ||
    lower.includes("banner") ||
    lower.includes("propaganda") ||
    lower.includes("campanha") ||
    lower.includes("tráfego") ||
    lower.includes("trafego")
  ) {
    return "create_ad";
  }
  if (
    lower.includes("apresentação") ||
    lower.includes("apresentacao") ||
    lower.includes("slide") ||
    lower.includes("pitch") ||
    lower.includes("deck")
  ) {
    return "presentation_deck";
  }
  if (
    lower.includes("landing page") ||
    lower.includes("criar site") ||
    lower.includes("fazer site") ||
    lower.includes("montar site") ||
    lower.includes("meu site") ||
    lower.includes("página web") ||
    lower.includes("pagina web") ||
    /\bsite\b/i.test(lower)
  ) {
    return "website_builder";
  }
  if (
    lower.includes("planilha") ||
    lower.includes("tabela") ||
    lower.includes("métricas") ||
    lower.includes("caixa")
  ) {
    return "financial_report";
  }
  if (lower.includes("proposta") || lower.includes("orçamento")) {
    return "commercial_proposal";
  }
  if (
    lower.includes("onde fica") ||
    lower.includes("onde tem") ||
    lower.includes("cafeteria") ||
    lower.includes("restaurante") ||
    lower.includes("perto de mim") ||
    lower.includes("empresa") ||
    lower.includes("loja") ||
    lower.includes("hotel") ||
    lower.includes("hotéis") ||
    lower.includes("hoteis") ||
    lower.includes("pousada") ||
    lower.includes("pousadas") ||
    lower.includes("resort") ||
    lower.includes("resorts") ||
    lower.includes("hospedagem") ||
    lower.includes("padaria") ||
    lower.includes("mercado")
  ) {
    return "search_places";
  }
  if (lower.includes("mapa") || lower.includes("mapas")) {
    return "interactive_map";
  }
  if (
    lower.includes("corrida") ||
    lower.includes("motorista") ||
    lower.includes("uber") ||
    lower.includes("moto passageiro") ||
    lower.includes("carro") ||
    lower.includes("frete")
  ) {
    return "estimate_mobility";
  }
  if (
    lower.includes("viagem") ||
    lower.includes("turismo") ||
    lower.includes("roteiro") ||
    lower.includes("pacote") ||
    lower.includes("oktober") ||
    lower.includes("passeio")
  ) {
    return "travel_itinerary";
  }
  if (
    lower.includes("advogad") ||
    lower.includes("processo") ||
    lower.includes("demitid") ||
    lower.includes("jurídic") ||
    lower.includes("indenização")
  ) {
    return "legal_triage";
  }
  if (
    lower.includes("pizza") ||
    lower.includes("cardápio") ||
    lower.includes("lanche") ||
    lower.includes("comprar")
  ) {
    return "search_catalog";
  }
  return "general_chat";
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
  const persona = resolveSpecialistPersona(userPrompt, context);
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
    // quando a busca persistida não resolve a intenção do usuário ou não for fluxo direto de criação.
    let platformSearch: InternalSearchResult | null = null;
    if (!isExplicitCreationOrBuilderPrompt(userPrompt, workingMemory) && shouldSearchPlatform(userPrompt)) {
      const searchStart = Date.now();
      const searchStepId = `step-platform-search-${searchStart}`;
      const startedAtIso = new Date(searchStart).toISOString();
      fsm.transition("RUNNING", "Executando a busca soberana da plataforma");
      fsm.transition("WAITING_TOOL", "Consultando o catálogo soberano da plataforma");
      const searchRunningStep: AIActivityStep = {
        id: searchStepId,
        type: "search",
        label: "Central de Descoberta Local",
        detail: "Consultando registros verificados na plataforma",
        status: "running",
        fsmPhase: "WAITING_TOOL",
        startedAt: startedAtIso,
      };
      await context.onEvent?.({ type: "step_started", step: searchRunningStep });
      platformSearch = await searchPlatformForCopilot(db, userPrompt);
      const searchDetail =
        platformSearch.cards.length > 0
          ? `${platformSearch.cards.length} resultado(s) encontrado(s) no sistema`
          : "Nenhum resultado local encontrado no momento";
      const searchCompletedStep: AIActivityStep = {
        ...searchRunningStep,
        detail: searchDetail,
        status: "completed",
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - searchStart,
        tokensUsed: 0,
      };
      steps.push(searchCompletedStep);
      await context.onEvent?.({ type: "step_completed", step: searchCompletedStep });

      if (platformSearch.cards.length > 0) {
        updatedMemory.last_platform_search = {
          query: platformSearch.query,
          count: platformSearch.cards.length,
          kinds: platformSearch.searchedKinds,
        };
      }
    }

    const hasAttachments = Array.isArray(context.attachments) && context.attachments.length > 0;
    const resolvedAttachments = hasAttachments
      ? await resolveCopilotAttachments(context.attachments)
      : { images: [], textBlocks: [], notes: [] };

    if (hasAttachments) {
      steps.push({
        id: `step-attachments-${startTime}`,
        type: "tool",
        label: "Leitura de Anexos & Documentos",
        detail: `${resolvedAttachments.images.length} imagem(ns), ${resolvedAttachments.textBlocks.length} bloco(s) de texto extraído(s)`,
        status: "completed",
        fsmPhase: "UNDERSTANDING",
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Math.max(1, Date.now() - startTime),
      });
    }

    const attachmentPromptBlock = [
      ...resolvedAttachments.textBlocks.map((t, i) => `<ANEXO_${i + 1}>\n${t.slice(0, 8000)}\n</ANEXO_${i + 1}>`),
      ...resolvedAttachments.notes.map((n) => `Observação sobre anexo: ${n}`),
    ].join("\n\n");

    const [activeSkillSlugs, externalMcpTools] = context.userId
      ? await Promise.all([
          getActiveSkillSlugsForUser(context.userId, context.storeId).catch(() => [] as string[]),
          listActiveExternalMcpToolsForUser(context.userId).catch(() => []),
        ])
      : [[] as string[], [] as Awaited<ReturnType<typeof listActiveExternalMcpToolsForUser>>];

    // Executa o Gateway de IA Soberano no Estágio 1 apenas no modo síncrono;
    // no modo streamReact o orquestrador ReAct executa planejamento multi-step e streaming real.
    const skipStage1Gateway = Boolean(context.streamReact && context.onEvent);
    let gatewayResponse: any = null;
    if (!skipStage1Gateway) {
      try {
      const [longTermMemory, projectKnowledgeBlock] = await Promise.all([
        context.userId
          ? assembleLongTermContext({
              profileId: context.userId,
              threadId: context.threadId,
              currentPrompt: userPrompt,
            }).catch(() => ({ formattedContext: "", factsCount: 0, memoryChunksCount: 0 }))
          : Promise.resolve({ formattedContext: "", factsCount: 0, memoryChunksCount: 0 }),
        context.projectKnowledgeContext
          ? Promise.resolve(context.projectKnowledgeContext)
          : context.projectId
            ? retrieveRelevantProjectKnowledgeContext({
                projectId: context.projectId,
                query: userPrompt,
                userId: context.userId,
              })
                .then((res) => res.formattedContext)
                .catch(() => "")
            : Promise.resolve(""),
      ]);

      const internalSearchContext = platformSearch
        ? `
<GROUNDED_DATA>
CONTEXTO SOBERANO DA PLATAFORMA (itens reais cadastrados no Waesy — priorize-os estritamente):
${JSON.stringify({ query: platformSearch.query, cards: platformSearch.cards, unavailableTables: platformSearch.unavailableTables }).slice(0, 12000)}
</GROUNDED_DATA>
Se houver itens no CONTEXTO SOBERANO acima, mencione-os de forma clara, consultiva e cordial, destacando diferenciais reais. Se for turismo/evento (ex: Oktoberfest, Urubici, Blumenau), estruture roteiro com precisão geográfica.
`
        : "";

      const projectKnowledgeGuidance = projectKnowledgeBlock
        ? "\n- Base de Conhecimento do Projeto (<PROJECT_KNOWLEDGE_BASE>): Toda vez que o bloco estiver presente, baseie sua resposta prioritariamente nos documentos, diretrizes, tarifas e regras anexadas ao projeto."
        : "";

      const activeSkillsPromptBlock =
        activeSkillSlugs.length > 0
          ? `\n<HABILIDADES_ATIVAS>\nHabilidades habilitadas pelo usuário: ${activeSkillSlugs.join(", ")}\n</HABILIDADES_ATIVAS>`
          : "";

      const externalMcpPromptBlock =
        externalMcpTools.length > 0
          ? `\n<EXTERNAL_MCP_TOOLS>\nFerramentas MCP Externas conectadas (para executar, informe "tool_name" exatamente como abaixo):\n${externalMcpTools
              .slice(0, 20)
              .map(
                (t) =>
                  `- "${t.compositeToolName}" (${t.serverName}): ${t.description || t.toolName}`,
              )
              .join("\n")}\n</EXTERNAL_MCP_TOOLS>`
          : "";

      const systemPrompt = `${persona.systemDirective}
Identidade Operacional: ${persona.name} (${persona.role}) [${persona.tag}].

ESTRUTURA CONSULTIVA OBRIGATÓRIA EM 4 BLOCOS:
1. Acolhimento Caloroso e Empático: Inicie validando a necessidade do usuário de forma natural e próxima (ex: "Entendo perfeitamente o que você precisa. Vamos conferir as melhores alternativas disponíveis aqui na região.").
2. Contexto Consultivo e Dados Locais: Explique com clareza o cenário local, contextualizando por que cada opção, serviço ou número faz sentido para ${context.city || "sua região"}.
3. Detalhamento Transparente: Apresente valores, prazos e opções de forma clara, organizada e sem abreviações ou jargões técnicos.
4. Próximo Passo Prático e Conclusão Proativa: Encerre sugerindo uma ação concreta (abrir artefato no painel lateral, agendar, chamar motorista, abrir proposta, conferir planilha ou enviar mensagem).

DIRETRIZES DE COMUNICAÇÃO:
- Grounding Estrito & Zero Dados Fictícios: Responda baseando-se ESTRITAMENTE nos dados verificados fornecidos em <GROUNDED_DATA>. Nunca invente nomes, preços, telefones ou empresas inexistentes.
- Transparência Honesta: Se não encontrar registros oficiais ativos, responda cordialmente: "Consultei nossa base oficial de registros e não localizei nenhuma opção ativa para este termo no momento. Posso pesquisar em uma categoria próxima ou cidade vizinha para você?"
- Erradique 100% dos jargões de engenharia: Proibido mencionar "LLM", "prompt", "token", "payload", "crawler", "scraper", "BACEN EMV", "schema", "endpoint" ou "processamento de modelo". Fale como um consultor humano sênior e atencioso.${projectKnowledgeGuidance}

Ferramentas disponíveis:
1. 'search_places' / 'interactive_map': busca estabelecimentos locais e exibe mapa interativo com rotas e contatos
2. 'generate_dashboard': gera dashboard executivo com indicadores (KPIs), faturamento, pedidos e alertas operacionais
3. 'creative_post' / 'create_ad': cria post/anúncio para redes sociais em formatos Feed (1:1), Retrato (4:5) ou Story (9:16)
4. 'estimate_mobility': calcula estimativas de trajeto e corrida urbana (moto, carro, entrega, van)
5. 'search_catalog': busca produtos ou itens de cardápio com personalização
6. 'travel_itinerary': monta pacotes de viagem com dias, passeios, hospedagens e código Pix para pagamento
7. 'legal_triage': faz triagem jurídica com área do direito e documentos recomendados
8. 'commercial_proposal': cria proposta comercial formal ou documento executivo
9. 'financial_report': gera planilha de fechamento de caixa e indicadores de receita
10. 'website_builder': projeta e gera página web ou landing page com editor visual

Responda SEMPRE em formato JSON com os campos:
{
  "intent": "search_places" | "interactive_map" | "website_builder" | "generate_dashboard" | "creative_post" | "create_ad" | "estimate_mobility" | "search_catalog" | "travel_itinerary" | "legal_triage" | "commercial_proposal" | "financial_report" | "general_chat",
  "tool_name": "opcional: nome exato de tool WebMCP ou mcp_ext:<servidor>:<tool>",
  "tool_args": { ... },
  "message": "Mensagem acolhedora, consultiva, didática e humana para o usuário seguindo os 4 blocos",
  "step_label": "Título amigável da ação",
  "step_detail": "Detalhe amigável para o usuário"
}${internalSearchContext}${activeSkillsPromptBlock}${externalMcpPromptBlock}${projectKnowledgeBlock ? `\n${projectKnowledgeBlock}` : ""}${longTermMemory.formattedContext ? `\n${longTermMemory.formattedContext}` : ""}`;

      const effectiveStage1Prompt = attachmentPromptBlock
        ? `${userPrompt}\n\n[CONTEÚDO DOS ANEXOS ENVIADOS]\n${attachmentPromptBlock}`
        : userPrompt;

      // 🛡️ Prompt Sandboxing: Isola dados não-confiáveis externos em <user_untrusted_data>
      const { hardenedSystemPrompt, sandboxedUserPrompt } = buildSandboxedPromptPayload(
        effectiveStage1Prompt,
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
        authContext: {
          storeId: context.storeId,
          userId: context.userId || undefined,
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
              gatewayResponse = { intent: detectIntent(promptLower, workingMemory), message: cleanText };
            }
          } else if (cleanText.length > 10) {
            // Preserva a resposta analítica da IA mesmo quando retornada em texto livre
            gatewayResponse = { intent: detectIntent(promptLower, workingMemory), message: cleanText };
          }
        }
      }
      } catch (gwErr) {
        console.warn(
          "[AI-COPILOT] Falha ou ausência de chave no gateway, executando dispatcher determinístico:",
          gwErr,
        );
      }
    }

    const forcedQuickIntent =
      context.quickToolMode === "website_builder"
        ? "website_builder"
        : context.quickToolMode === "interactive_map"
          ? "interactive_map"
          : context.quickToolMode === "creative_post"
            ? "creative_post"
            : undefined;
    const deterministicIntent = detectIntent(promptLower, workingMemory);
    const creationOverride = isExplicitCreationOrBuilderPrompt(userPrompt, workingMemory);
    const gatewayIntent = gatewayResponse?.intent;
    const isGatewayNonCreation =
      gatewayIntent &&
      [
        "search_places",
        "interactive_map",
        "estimate_mobility",
        "travel_itinerary",
        "legal_triage",
        "search_catalog",
        "general_chat",
      ].includes(gatewayIntent);
    const intent =
      forcedQuickIntent ||
      (creationOverride && (!gatewayIntent || isGatewayNonCreation)
        ? deterministicIntent
        : gatewayIntent || deterministicIntent);
    const toolArgs = gatewayResponse?.tool_args || {};

    // Se é retomada de checkpoint durável, delega diretamente ao orquestrador ReAct
    if (context.continueExecutionId) {
      const resumedOutcome = await runCopilotReactOrchestrator({
        userPrompt,
        workingMemory: updatedMemory,
        context,
        resolvedAttachments,
        recentMessages: context.recentMessages,
        precomputedStage1: {
          intent: forcedQuickIntent,
          gatewayResponse: null,
          platformSearch,
          singleCallMode: false,
        },
        onEvent: context.onEvent,
      });
      return {
        ...resumedOutcome,
        sources: resumedOutcome.sources || [],
        updatedMemory: { ...updatedMemory, ...(resumedOutcome.updatedMemory || {}) },
      };
    }

    // ── 0. Orquestrador autônomo de mineração e copilot (leads, CNPJ, processos CNJ, biolink/ficha) ──
    const isAutonomousOrMiningRequest =
      !["creative_post", "create_ad", "ads_campaign", "presentation_deck", "website_builder", "interactive_map", "financial_report", "generate_dashboard"].includes(intent) &&
      context.quickToolMode !== "website_builder" &&
      (/\b(minerar|minere|minera[çc][ãa]o|exportar leads|extrair leads|prospec[çc][ãa]o|prospectar|sdr|bdr|ficha t[eé]cnica|criar biolink|montar biolink)\b/i.test(
        userPrompt,
      ) ||
        /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/.test(userPrompt) ||
        /\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/.test(userPrompt));

    if (
      isAutonomousOrMiningRequest &&
      needsCityClarification(
        fragmentAndOptimizePrompt(userPrompt, { city: context.city, state: context.state }),
      )
    ) {
      fsm.transition("NEEDS_CLARIFICATION", "Recorte municipal ausente no prompt e no contexto");
      return {
        responseMessage:
          'Informe a cidade desejada para a busca (ex.: "em Florianopolis") ou ative sua localizacao.',
        activitySteps: steps,
        sources: [],
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
    const sources: ChatSourceItem[] = [];
    let responseMessage = gatewayResponse?.message || "";

    if (isAutonomousOrMiningRequest) {
      const miningStart = Date.now();
      const miningStepId = `step-mining-${miningStart}`;
      fsm.transition("WAITING_TOOL", "Executando mineração autônoma de dados");
      const miningRunningStep: AIActivityStep = {
        id: miningStepId,
        type: "tool",
        label: "Mineração Autônoma & Inteligência Territorial",
        detail: `Executando extração verificada (${context.city || "região ativa"})`,
        status: "running",
        fsmPhase: "WAITING_TOOL",
        startedAt: new Date(miningStart).toISOString(),
      };
      await context.onEvent?.({ type: "step_started", step: miningRunningStep });
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
            authorName: persona.name,
            authorRole: persona.role,
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
          await context.onEvent?.({
            type: "artifact_ready",
            artifact: artifact as unknown as Record<string, unknown>,
          });
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
        await context.onEvent?.({
          type: "step_completed",
          step: {
            ...miningRunningStep,
            status: copilotResult.success ? "completed" : "failed",
            detail: copilotResult.summaryMessage.slice(0, 140),
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - miningStart,
          },
        });
      } catch (autoErr: any) {
        console.warn("[COPILOT-AUTONOMOUS-BOUNDARY] Falha na mineração capturada:", autoErr);
        fsm.recordFailure(autoErr);
        responseMessage = `Tivemos uma oscilação rápida ao buscar esses dados externos. Suas preferências foram salvas com segurança e você pode tentar novamente em instantes.`;
        await context.onEvent?.({
          type: "step_completed",
          step: {
            ...miningRunningStep,
            status: "failed",
            detail: String(autoErr?.message || "Falha na mineração").slice(0, 140),
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - miningStart,
          },
        });
      }

      if (structuredPayload) {
        await context.onEvent?.({
          type: "structured",
          source: "platform",
          payload: structuredPayload as Record<string, unknown>,
        });
      }
      if (responseMessage) {
        await context.onEvent?.({ type: "delta", text: responseMessage, final: true });
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
    }

    // ── 0.05 Orquestração de Squads (Manus Fragmentation) ──
    const isExplicitSlashSquad = /^\/squad\b/i.test(userPrompt.trim());
    const squadTriggerMatch =
      isExplicitSlashSquad ||
      (!context.streamReact &&
        /\b(executar|acionar|orquestrar)\s+squad\b|\b(sales_squad|publishing_squad|finance_squad)\b|\bhandoff\s+multi-?agente|\bequipe\s+de\s+agentes/i.test(
          userPrompt,
        ));
    const isSquadSkillEnabled =
      activeSkillSlugs.length === 0 || activeSkillSlugs.includes("squad_orchestrator");

    if (squadTriggerMatch && isSquadSkillEnabled) {
      const squadStart = Date.now();
      const squadStepId = `step-squad-${squadStart}`;
      fsm.transition("WAITING_TOOL", "Fragmentando demanda entre agentes especialistas do Squad");
      const chosenSquadSlug = /\bfinance_squad\b|\b(pix|comprovante|concilia|faturamento|caixa)\b/i.test(
        userPrompt,
      )
        ? "finance_squad"
        : /\bpublishing_squad\b|\b(post|carrossel|campanha|copy|publica|social)\b/i.test(
              userPrompt,
            )
          ? "publishing_squad"
          : "sales_squad";

      const squadRunningStep: AIActivityStep = {
        id: squadStepId,
        type: "skill",
        label: `Squad ${chosenSquadSlug}`,
        detail: "Executando handoff supervisionado entre especialistas",
        status: "running",
        fsmPhase: "WAITING_TOOL",
        startedAt: new Date(squadStart).toISOString(),
      };
      await context.onEvent?.({ type: "step_started", step: squadRunningStep });

      try {
        const squadRun = await runSquadGraphExecution(
          chosenSquadSlug,
          {
            prompt: attachmentPromptBlock
              ? `${userPrompt}\n\n[CONTEÚDO DOS ANEXOS]\n${attachmentPromptBlock}`
              : userPrompt,
            context: { city: context.city, storeId: context.storeId },
          },
          { userId: context.userId, storeId: context.storeId },
        );

        for (const h of squadRun.handoffs) {
          const stepObj: AIActivityStep = {
            id: `step-squad-${chosenSquadSlug}-${h.stepIndex}-${Date.now()}`,
            type: "skill",
            label: `${h.toAgent} (Etapa ${h.stepIndex})`,
            detail: h.objective,
            status: h.acceptanceVerified ? "completed" : "failed",
            fsmPhase: "PARTIAL_RESULT",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            durationMs: h.latencyMs,
          };
          steps.push(stepObj);
          await context.onEvent?.({ type: "step_completed", step: stepObj });
        }

        const finalText =
          String(squadRun.finalOutput?.output || "") ||
          squadRun.supervisorNotes ||
          `Execução do squad ${chosenSquadSlug} finalizada.`;

        artifact = {
          id: crypto.randomUUID(),
          type: "document",
          title: `Relatório de Execução do Squad (${chosenSquadSlug})`,
          version: 1,
          totalVersions: 1,
          authorName: persona.name,
          authorRole: "Orquestrador Multi-Agentes",
          previewSummary: `${squadRun.stepsCompleted} etapa(s) concluída(s) via handoff supervisionado.`,
          data: {
            squadSlug: chosenSquadSlug,
            runId: squadRun.runId,
            stepsCompleted: squadRun.stepsCompleted,
            handoffs: squadRun.handoffs,
            content: finalText,
          },
        };
        await context.onEvent?.({
          type: "artifact_ready",
          artifact: artifact as unknown as Record<string, unknown>,
        });
        await context.onEvent?.({
          type: "step_completed",
          step: {
            ...squadRunningStep,
            status: "completed",
            detail: `${squadRun.stepsCompleted} etapa(s) concluída(s)`,
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - squadStart,
          },
        });
        if (finalText) {
          await context.onEvent?.({ type: "delta", text: finalText, final: true });
        }

        if (canTransitionCopilotPhase(fsm.currentPhase, "PARTIAL_RESULT")) {
          fsm.transition("PARTIAL_RESULT", `Squad ${chosenSquadSlug} concluiu ${squadRun.stepsCompleted} etapas`);
        }
        if (canTransitionCopilotPhase(fsm.currentPhase, "VALIDATING")) {
          fsm.transition("VALIDATING", "Validando entrega final do squad");
        }
        if (canTransitionCopilotPhase(fsm.currentPhase, "COMPLETED")) {
          fsm.transition("COMPLETED", `Squad ${chosenSquadSlug} finalizado`);
        }

        updatedMemory.last_squad_slug = chosenSquadSlug;
        updatedMemory.last_squad_run_id = squadRun.runId;

        return {
          responseMessage: finalText,
          executionId: squadRun.runId,
          activitySteps: steps,
          artifact,
          updatedMemory,
          fsmPhase: fsm.currentPhase,
          fsmState: fsm.snapshot,
        };
      } catch (squadErr: any) {
        fsm.recordFailure(squadErr);
        const failText = `Não foi possível concluir a orquestração do squad "${chosenSquadSlug}": ${String(squadErr?.message || "Erro interno").slice(0, 120)}`;
        await context.onEvent?.({
          type: "step_completed",
          step: {
            ...squadRunningStep,
            status: "failed",
            detail: String(squadErr?.message || "Erro interno").slice(0, 120),
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - squadStart,
          },
        });
        await context.onEvent?.({ type: "delta", text: failText, final: true });
        return {
          responseMessage: failText,
          activitySteps: steps,
          updatedMemory,
          fsmPhase: fsm.currentPhase,
          fsmState: fsm.snapshot,
        };
      }
    }

    // ── 0.1 Despachante WebMCP & MCP Externo ──
    const mcpCandidateTool = (gatewayResponse?.tool_name ||
      (intent in MCP_TOOL_REGISTRY ? intent : "")) as string;
    const externalToolDef = externalMcpTools.find(
      (t) => t.compositeToolName === mcpCandidateTool,
    );
    const isExternalMcpTool = Boolean(context.userId && externalToolDef);
    const isBuiltinMcpTool = Boolean(mcpCandidateTool && MCP_TOOL_REGISTRY[mcpCandidateTool]);

    if (isExternalMcpTool || isBuiltinMcpTool) {
      const stepStart = Date.now();
      const toolDef = isBuiltinMcpTool ? MCP_TOOL_REGISTRY[mcpCandidateTool] : undefined;
      fsm.transition(
        "WAITING_TOOL",
        `Executando ${isExternalMcpTool ? "MCP Externo" : "WebMCP Tool"}: ${mcpCandidateTool}`,
      );

      steps.push({
        id: `step-mcp-${mcpCandidateTool}-${stepStart}`,
        type: "tool",
        label:
          gatewayResponse?.step_label ||
          (isExternalMcpTool
            ? `MCP Externo: ${externalToolDef?.serverName || mcpCandidateTool}`
            : "Ação Especializada"),
        detail:
          gatewayResponse?.step_detail ||
          externalToolDef?.description ||
          toolDef?.description ||
          "Consultando registros oficiais da plataforma",
        status: "running",
        fsmPhase: "WAITING_TOOL",
        startedAt: new Date(stepStart).toISOString(),
      });

      try {
        const mcpResult: {
          status: "success" | "error";
          content: Array<{ type: string; text?: string; data?: any }>;
        } = isExternalMcpTool
          ? await invokeExternalMcpToolForUser(
              context.userId!,
              mcpCandidateTool,
              (toolArgs || {}) as Record<string, unknown>,
            )
          : await executeMcpToolCall({
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
        sources,
        updatedMemory,
        fsmPhase: fsm.currentPhase,
        fsmState: fsm.snapshot,
      };
    }

    // ── Orquestrador ReAct Unificado (Tools, Browser, Memória Hierárquica & Ativos) ──
    const reactOutcome = await runCopilotReactOrchestrator({
      userPrompt,
      workingMemory: updatedMemory,
      context,
      resolvedAttachments,
      recentMessages: context.recentMessages,
      precomputedStage1: skipStage1Gateway
        ? {
            intent: forcedQuickIntent,
            gatewayResponse: null,
            platformSearch,
            singleCallMode: false,
          }
        : {
            intent,
            gatewayResponse,
            platformSearch,
            singleCallMode: true,
          },
      onEvent: context.onEvent,
    });

    executionId = reactOutcome.executionId || executionId;
    if (Array.isArray(reactOutcome.activitySteps) && reactOutcome.activitySteps.length > 0) {
      steps.push(...reactOutcome.activitySteps);
    }
    if (Array.isArray(reactOutcome.toolCalls) && reactOutcome.toolCalls.length > 0) {
      toolCalls.push(...reactOutcome.toolCalls);
    }
    if (reactOutcome.artifact) {
      artifact = reactOutcome.artifact;
    }
    if (reactOutcome.structuredPayload) {
      structuredPayload = reactOutcome.structuredPayload;
    }
    if (Array.isArray(reactOutcome.sources) && reactOutcome.sources.length > 0) {
      const seenReactSrcIds = new Set(sources.map((s) => s.id));
      for (const s of reactOutcome.sources) {
        if (!seenReactSrcIds.has(s.id)) {
          seenReactSrcIds.add(s.id);
          sources.push(s);
        }
      }
    }
    if (reactOutcome.responseMessage) {
      responseMessage = reactOutcome.responseMessage;
    }
    Object.assign(updatedMemory, reactOutcome.updatedMemory || {});
    delete updatedMemory.last_intent;

    if (!fsm.isFailure && !fsm.isTerminal) {
      if (canTransitionCopilotPhase(fsm.currentPhase, "VALIDATING")) {
        fsm.transition("VALIDATING", "Validação final da resposta e integridade");
      }
      if (canTransitionCopilotPhase(fsm.currentPhase, "COMPLETED")) {
        fsm.transition("COMPLETED", "Pipeline finalizado com sucesso");
      }
    }

    if (platformSearch?.cards && platformSearch.cards.length > 0) {
      const seenIds = new Set(sources.map((s) => s.id));
      platformSearch.cards.slice(0, 6).forEach((card) => {
        const sourceId = `platform-${card.source_table}-${card.source_id || card.id}`;
        if (seenIds.has(sourceId)) return;
        seenIds.add(sourceId);
        sources.push({
          id: sourceId,
          title: card.title,
          kind: "platform",
          detail: [card.kind, card.subtitle, card.location].filter(Boolean).join(" · "),
          url: typeof card.action?.payload?.href === "string" ? card.action.payload.href : undefined,
        });
      });
    }

    if (context.attachments && context.attachments.length > 0) {
      context.attachments.forEach((attUrl, idx) => {
        sources.push({
          id: `attachment-${idx}-${attUrl.slice(-16)}`,
          title: decodeURIComponent(attUrl.split("/").pop()?.split("?")[0] || `Anexo ${idx + 1}`),
          kind: "attachment",
          detail: "Arquivo enviado na conversa",
          url: attUrl,
        });
      });
    }

    return {
      responseMessage,
      activitySteps: steps,
      executionId,
      toolCalls,
      artifact,
      structuredPayload,
      sources,
      updatedMemory,
      fsmPhase: fsm.currentPhase,
      fsmState: fsm.snapshot,
      plan: reactOutcome.plan,
      vfsFiles: reactOutcome.vfsFiles,
      liveBrowserFrame: reactOutcome.liveBrowserFrame,
      checkpoint: reactOutcome.checkpoint,
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

      // 1. Tentar ler prioritariamente do domínio canônico isolado ai_threads (com fallback caso migration de pastas/projetos ainda não tenha sido aplicada)
      const selectWithHierarchy = `
          id, domain_type, title, workspace_id, user_id,
          folder_id, project_id, archived,
          status, pinned, metadata, working_memory, created_at, updated_at,
          last_message_snippet, last_message_at
        `;
      const selectBase = `
          id, domain_type, title, workspace_id, user_id,
          archived, status, pinned, metadata, working_memory, created_at, updated_at,
          last_message_snippet, last_message_at
        `;

      let aiThreadsRes: { data: any[] | null; error: any } = await db
        .from("ai_threads")
        .select(selectWithHierarchy)
        .eq("user_id", identity.id)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (aiThreadsRes.error && /folder_id|project_id|archived|42703/i.test(aiThreadsRes.error.message || "")) {
        aiThreadsRes = await db
          .from("ai_threads")
          .select(selectBase)
          .eq("user_id", identity.id)
          .order("pinned", { ascending: false })
          .order("updated_at", { ascending: false });
      }

      const aiThreads = aiThreadsRes.data;
      const aiError = aiThreadsRes.error;

      if (!aiError && aiThreads) {
        return aiThreads.map((t: any) => ({
          id: t.id,
          type: (t.domain_type === "workspace" || t.project_id ? "project" : "ai_assistant") as any,
          title: t.title || "Conversa Copilot",
          store_id: t.workspace_id,
          customer_id: t.user_id,
          folder_id: t.folder_id ?? t.metadata?.folder_id ?? null,
          project_id: t.project_id ?? t.metadata?.project_id ?? null,
          status: t.archived || t.status === "archived" ? "archived" : (t.status || "open"),
          archived: Boolean(t.archived || t.status === "archived"),
          is_pinned: Boolean(t.pinned),
          metadata: t.metadata || {},
          working_memory: t.working_memory || {},
          created_at: t.created_at,
          updated_at: t.updated_at,
          last_message_snippet: t.last_message_snippet,
          last_message_at: t.last_message_at,
        }));
      }

      // 2. Fallback de compatibilidade para chat_threads legado
      const visibilityClauses = [
        `customer_id.eq.${identity.id}`,
        `recipient_profile_id.eq.${identity.id}`,
      ];
      let query = db
        .from("chat_threads")
        .select(
          `
          id, type:thread_type, subject, store_id, customer_id, recipient_profile_id, assigned_to_profile_id,
          status, is_pinned, metadata, working_memory, created_at, updated_at
        `,
        )
        .or(visibilityClauses.join(","))
        .in("thread_type", ["ai_assistant", "copilot", "project"])
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      const { data, error } = await query;
      if (error || Boolean(data) === false) {
        return [];
      }

      return data.map((t: any) => ({
        id: t.id,
        type: t.type || "ai_assistant",
        title: t.subject || "Sem Título",
        store_id: t.store_id,
        customer_id: t.customer_id,
        recipient_profile_id: t.recipient_profile_id,
        assigned_to_profile_id: t.assigned_to_profile_id,
        folder_id: t.folder_id ?? t.metadata?.folder_id ?? null,
        project_id: t.project_id ?? t.metadata?.project_id ?? null,
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

    // ISOLAMENTO ZERO-TRUST:
    // Threads de Copilot / IA Pessoal são estritamente civis do usuário.
    // NUNCA herdam store_id da loja do usuário para evitar vazamento para o SAC da loja.
    const isCivilAi = ["ai_assistant", "copilot", "project"].includes(data.type);
    const resolvedStoreId = isCivilAi ? null : (data.storeId || null);

    if (resolvedStoreId) {
      assertAiStoreTarget(resolvedStoreId, identity);
      await requireStoreVerticalAccess("copilot", resolvedStoreId);
    }

    const domainType = resolvedStoreId ? "workspace" : "personal";
    const mergedMetadata = {
      ...(data.metadata || {}),
      ...(data.folderId ? { folder_id: data.folderId } : {}),
      ...(data.projectId ? { project_id: data.projectId } : {}),
    };

    // Cria prioritariamente em ai_threads (com retry seguro sem colunas caso schema ainda esteja na versão anterior)
    let aiInsertRes = await db
      .from("ai_threads")
      .insert({
        user_id: identity.id,
        workspace_id: resolvedStoreId,
        domain_type: domainType,
        title: data.title,
        metadata: mergedMetadata,
        working_memory: data.workingMemory,
        ...(data.folderId ? { folder_id: data.folderId } : {}),
        ...(data.projectId ? { project_id: data.projectId } : {}),
        status: "open",
        pinned: false,
      })
      .select("id, domain_type, title, created_at, updated_at")
      .single();

    if (aiInsertRes.error && /folder_id|project_id|42703/i.test(aiInsertRes.error.message || "")) {
      aiInsertRes = await db
        .from("ai_threads")
        .insert({
          user_id: identity.id,
          workspace_id: resolvedStoreId,
          domain_type: domainType,
          title: data.title,
          metadata: mergedMetadata,
          working_memory: data.workingMemory,
          status: "open",
          pinned: false,
        })
        .select("id, domain_type, title, created_at, updated_at")
        .single();
    }

    const { data: newAiThread, error: aiError } = aiInsertRes;

    if (!aiError && newAiThread) {
      return {
        id: newAiThread.id,
        thread_type: data.type || "ai_assistant",
        subject: newAiThread.title,
        folder_id: data.folderId || null,
        project_id: data.projectId || null,
        metadata: mergedMetadata,
        created_at: newAiThread.created_at,
        updated_at: newAiThread.updated_at,
      };
    }

    // Fallback legado para chat_threads
    const { data: newThread, error } = await db
      .from("chat_threads")
      .insert({
        customer_id: identity.id,
        store_id: resolvedStoreId,
        recipient_profile_id: data.recipientProfileId || null,
        thread_type: data.type || "ai_assistant",
        subject: data.title,
        metadata: mergedMetadata,
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

    // 1. Tentar carregar de ai_threads
    const { data: aiThread } = await db
      .from("ai_threads")
      .select("*")
      .eq("id", threadId)
      .maybeSingle();

    if (aiThread) {
      if (aiThread.user_id !== identity.id && !["platform_admin", "master"].includes(identity.role)) {
        if (aiThread.workspace_id) {
          assertStoreAccess(identity, STAFF_ROLES, aiThread.workspace_id);
        } else {
          throw new Error("Sem permissão para acessar esta conversa");
        }
      }

      const { data: messages, error: messagesErr } = await db
        .from("ai_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (messagesErr) throw new Error("Falha ao carregar mensagens da conversa");

      const { data: artifacts, error: artifactsErr } = await db
        .from("ai_artifacts")
        .select("*")
        .eq("thread_id", threadId)
        .order("updated_at", { ascending: false });
      if (artifactsErr) throw new Error("Falha ao carregar artefatos da conversa");

      return {
        thread: {
          id: aiThread.id,
          type: (aiThread.domain_type === "workspace" ? "project" : "ai_assistant") as any,
          title: aiThread.title || "Conversa",
          folder_id: (aiThread as any).folder_id ?? aiThread.metadata?.folder_id ?? null,
          project_id: (aiThread as any).project_id ?? aiThread.metadata?.project_id ?? null,
          is_pinned: Boolean(aiThread.pinned),
          working_memory: aiThread.working_memory || {},
          metadata: aiThread.metadata || {},
          status: aiThread.status,
        },
        messages: (messages || []).map((m: any) => ({
          id: m.id,
          threadId: m.thread_id,
          clientMessageId: m.client_message_id || undefined,
          executionId: m.run_id || m.structured_payload?.executionId,
          senderId: m.sender_id,
          isStaffOrAI: m.role === "assistant",
          text: m.content,
          createdAt: m.created_at,
          status: m.status || "delivered",
          activitySteps: m.activity_steps || m.structured_payload?.activitySteps || [],
          toolCalls: m.tool_calls || m.structured_payload?.toolCalls || [],
          artifact: m.structured_payload?.artifact || null,
          structuredPayload: m.structured_payload?.structuredBlocks || null,
          sources: m.structured_payload?.sources || [],
          fsmPhase: m.fsm_phase || m.structured_payload?.fsmPhase,
          fsmState: m.fsm_state || m.structured_payload?.fsmState,
          attachments: m.attachments || [],
        })),
        artifacts: artifacts || [],
      };
    }

    // Fallback legado para chat_threads
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
        sources: m.payload?.sources || [],
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

export interface CopilotExchangeExecutionResult {
  userMessageId: string;
  aiMessage: {
    id: string;
    threadId?: string;
    executionId?: string;
    text: string;
    activitySteps: AIActivityStep[];
    artifact: ChatArtifactData | null | undefined;
    structuredPayload: any;
    sources?: ChatSourceItem[];
    createdAt: string;
    status: string;
    fsmPhase?: CopilotFsmPhase;
    fsmState?: CopilotFsmExecutionState;
    toolCalls?: AiToolExecutionRecord[];
  };
  updatedWorkingMemory: Record<string, any>;
}

export type PreparedCopilotExchange =
  | {
      alreadyPersisted: CopilotExchangeExecutionResult;
      db: ReturnType<typeof getServerClient>;
    }
  | {
      alreadyPersisted?: undefined;
      db: ReturnType<typeof getServerClient>;
      isAiThread: boolean;
      resolvedWorkingMemory: Record<string, any>;
      resolvedStoreId: string | null;
      resolvedFolderId: string | null;
      resolvedProjectId: string | null;
      userMsg: { id: string; created_at: string };
      recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
    };

export async function prepareCopilotExchangeContext(
  data: z.infer<typeof sendAiMessageSchema>,
  identity: Awaited<ReturnType<typeof getServerIdentity>>,
): Promise<PreparedCopilotExchange> {
  const db = getServerClient();

  if (!identity?.id) {
    throw new Error("Usuário não autenticado");
  }

  // 1. Obter thread para contexto e memória de trabalho (Canônico ai_threads com fallback)
  let aiThreadRes = await db
    .from("ai_threads")
    .select("id, user_id, workspace_id, folder_id, project_id, metadata, working_memory, title, domain_type")
      .eq("id", data.threadId)
      .maybeSingle();

    if (aiThreadRes.error && /folder_id|project_id|42703/i.test(aiThreadRes.error.message || "")) {
      aiThreadRes = await db
        .from("ai_threads")
        .select("id, user_id, workspace_id, metadata, working_memory, title, domain_type")
        .eq("id", data.threadId)
        .maybeSingle();
    }
    const aiThread = aiThreadRes.data as any;

    const isAiThread = Boolean(aiThread);
    let resolvedWorkingMemory: Record<string, any> = {};
    let resolvedStoreId: string | null = null;
    let resolvedFolderId: string | null = null;
    let resolvedProjectId: string | null = null;
    let userMsg: { id: string; created_at: string } | null = null;

    if (aiThread) {
      if (aiThread.user_id !== identity.id && !["platform_admin", "master"].includes(identity.role)) {
        if (aiThread.workspace_id) {
          assertStoreAccess(identity, STAFF_ROLES, aiThread.workspace_id);
        } else {
          throw new Error("Sem permissão para acessar esta conversa");
        }
      }
      resolvedWorkingMemory = aiThread.working_memory || {};
      resolvedStoreId = aiThread.workspace_id || null;
      resolvedFolderId = aiThread.folder_id ?? aiThread.metadata?.folder_id ?? null;
      resolvedProjectId = aiThread.project_id ?? aiThread.metadata?.project_id ?? null;

      // Idempotência e persistência em ai_messages
      if (data.clientMessageId) {
        const { data: existingUser } = await db
          .from("ai_messages")
          .select("id, created_at, status, content, structured_payload")
          .eq("thread_id", data.threadId)
          .eq("client_message_id", data.clientMessageId)
          .eq("sender_id", identity.id)
          .eq("role", "user")
          .maybeSingle();

        if (existingUser) {
          const { data: existingAi } = await db
            .from("ai_messages")
            .select("id, created_at, content, structured_payload, status, activity_steps, tool_calls, fsm_phase, fsm_state")
            .eq("thread_id", data.threadId)
            .eq("role", "assistant")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (existingAi) {
            return {
              db,
              alreadyPersisted: {
                userMessageId: existingUser.id,
                aiMessage: {
                  id: existingAi.id,
                  threadId: data.threadId,
                  executionId: existingAi.structured_payload?.executionId,
                  text: existingAi.content,
                  activitySteps: existingAi.activity_steps || existingAi.structured_payload?.activitySteps || [],
                  artifact: existingAi.structured_payload?.artifact || null,
                  structuredPayload: existingAi.structured_payload?.structuredBlocks || null,
                  sources: existingAi.structured_payload?.sources || [],
                  createdAt: existingAi.created_at,
                  status: existingAi.status || "delivered",
                  fsmPhase: existingAi.fsm_phase || existingAi.structured_payload?.fsmPhase,
                  fsmState: existingAi.fsm_state || existingAi.structured_payload?.fsmState,
                  toolCalls: existingAi.tool_calls || existingAi.structured_payload?.toolCalls || [],
                },
                updatedWorkingMemory: aiThread.working_memory || {},
              },
            };
          }

          if (existingUser.status === "sending") {
            throw new Error("Mensagem já está em processamento; aguarde a resposta persistida.");
          }

          const { error: resetError } = await db
            .from("ai_messages")
            .update({ status: "sending", failed_at: null, error_message: null })
            .eq("id", existingUser.id);
          if (resetError) throw new Error("Falha ao reabrir mensagem para retry");
          userMsg = { id: existingUser.id, created_at: existingUser.created_at };
        }
      }

      if (!userMsg) {
        const { data: insertedUser, error: userMsgErr } = await db
          .from("ai_messages")
          .insert({
            thread_id: data.threadId,
            client_message_id: data.clientMessageId || null,
            sender_id: identity.id,
            role: "user",
            content: data.message,
            attachments: data.attachments || [],
            status: "sending",
          })
          .select("id, created_at")
          .single();

        if (userMsgErr || !insertedUser) {
          if (data.clientMessageId && userMsgErr?.code === "23505") {
            const { data: winner } = await db
              .from("ai_messages")
              .select("id, created_at, status, structured_payload")
              .eq("thread_id", data.threadId)
              .eq("client_message_id", data.clientMessageId)
              .eq("sender_id", identity.id)
              .eq("role", "user")
              .maybeSingle();
            if (winner) {
              const { data: winnerAi } = await db
                .from("ai_messages")
                .select("id, created_at, content, structured_payload, status, activity_steps, tool_calls, fsm_phase, fsm_state")
                .eq("thread_id", data.threadId)
                .eq("role", "assistant")
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();
              if (winnerAi) {
                return {
                  db,
                  alreadyPersisted: {
                    userMessageId: winner.id,
                    aiMessage: {
                      id: winnerAi.id,
                      threadId: data.threadId,
                      executionId: winnerAi.structured_payload?.executionId,
                      text: winnerAi.content,
                      activitySteps: winnerAi.activity_steps || winnerAi.structured_payload?.activitySteps || [],
                      artifact: winnerAi.structured_payload?.artifact || null,
                      structuredPayload: winnerAi.structured_payload?.structuredBlocks || null,
                      sources: winnerAi.structured_payload?.sources || [],
                      createdAt: winnerAi.created_at,
                      status: winnerAi.status || "delivered",
                      fsmPhase: winnerAi.fsm_phase || winnerAi.structured_payload?.fsmPhase,
                      fsmState: winnerAi.fsm_state || winnerAi.structured_payload?.fsmState,
                      toolCalls: winnerAi.tool_calls || winnerAi.structured_payload?.toolCalls || [],
                    },
                    updatedWorkingMemory: aiThread.working_memory || {},
                  },
                };
              }
              if (winner.status === "sending") {
                throw new Error("Mensagem já está em processamento; aguarde a resposta persistida.");
              }
            }
          }
          throw new Error("Falha ao registrar mensagem do usuário");
        }
        userMsg = insertedUser;
      }
    }

    let thread: any = null;
    if (!aiThread) {
      const { data: legacyThread } = await db
        .from("chat_threads")
        .select(
          "id, thread_type, working_memory, store_id, customer_id, recipient_profile_id, assigned_to_profile_id",
        )
        .eq("id", data.threadId)
        .single();

      if (!legacyThread) {
        throw new Error("Thread inexistente");
      }
      assertAiThreadAccess(legacyThread, identity);
      thread = legacyThread;
      resolvedWorkingMemory = legacyThread.working_memory || {};
      resolvedStoreId = legacyThread.store_id || null;

      // 2. Inserir ou recuperar a mensagem do usuário por chave estável.
      // A constraint (thread_id, client_message_id) é a última barreira contra
      // retries concorrentes; o lookup anterior permite devolver o resultado já
      // persistido sem executar o pipeline/consumir tokens novamente.
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
              db,
              alreadyPersisted: {
                userMessageId: existingUser.id,
                aiMessage: mapPersistedAiMessage(existingAi, data.threadId),
                updatedWorkingMemory: thread.working_memory || {},
              },
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
                  db,
                  alreadyPersisted: {
                    userMessageId: winner.id,
                    aiMessage: mapPersistedAiMessage(winnerAi, data.threadId),
                    updatedWorkingMemory: thread.working_memory || {},
                  },
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
    }

    if (!userMsg) {
      throw new Error("Falha ao registrar ou localizar mensagem do usuário");
    }

    let recentMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
    try {
      if (isAiThread) {
        const { data: histRows } = await db
          .from("ai_messages")
          .select("id, role, content, created_at")
          .eq("thread_id", data.threadId)
          .neq("id", userMsg.id)
          .in("role", ["user", "assistant"])
          .order("created_at", { ascending: false })
          .limit(20);
        if (Array.isArray(histRows) && histRows.length > 0) {
          recentMessages = [...histRows]
            .reverse()
            .filter((r: any) => typeof r?.content === "string" && r.content.trim().length > 0)
            .map((r: any) => ({
              role: (r.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
              content: String(r.content).slice(0, 4000),
            }));
        }
      } else {
        const { data: legRows } = await db
          .from("chat_messages")
          .select("id, is_staff_reply, message, created_at")
          .eq("thread_id", data.threadId)
          .neq("id", userMsg.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (Array.isArray(legRows) && legRows.length > 0) {
          recentMessages = [...legRows]
            .reverse()
            .filter((r: any) => typeof r?.message === "string" && r.message.trim().length > 0)
            .map((r: any) => ({
              role: (r.is_staff_reply ? "assistant" : "user") as "user" | "assistant",
              content: String(r.message).slice(0, 4000),
            }));
        }
      }
    } catch {
      recentMessages = [];
    }

    return {
      db,
      isAiThread,
      resolvedWorkingMemory,
      resolvedStoreId,
      resolvedFolderId,
      resolvedProjectId,
      userMsg,
      recentMessages,
    };
}

export async function finalizeCopilotExchange(params: {
  db: ReturnType<typeof getServerClient>;
  data: z.infer<typeof sendAiMessageSchema>;
  identityId: string;
  isAiThread: boolean;
  resolvedStoreId: string | null;
  userMsg: { id: string; created_at: string };
  execution: AiExecutionResult;
}): Promise<CopilotExchangeExecutionResult> {
  const { db, data, identityId, isAiThread, resolvedStoreId, userMsg, execution } = params;
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
    sources: execution.sources || [],
    plan: execution.plan || [],
    vfsFiles: execution.vfsFiles || [],
    liveBrowserFrame: execution.liveBrowserFrame || null,
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
      p_sender_id: identityId,
      p_user_status: aiStatus,
      p_ai_message: execution.responseMessage,
      p_ai_message_type: messageType,
      p_ai_payload: aiPayload,
      p_ai_status: aiStatus,
      p_updated_memory: execution.updatedMemory,
      p_artifact: execution.artifact || null,
      p_store_id: resolvedStoreId,
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

  if (isAiThread) {
    await db
      .from("ai_threads")
      .update({
        last_message_snippet: execution.responseMessage?.slice(0, 140) || "",
        last_message_at: persistedAiCreatedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        working_memory: execution.updatedMemory,
      })
      .eq("id", data.threadId);
  }

  // 🧠 Motor Autônomo Estilo Manus AI: Aprendizado contínuo & Memória episódica
  extractAndSaveFactsFromConversation({
    profileId: identityId,
    userPrompt: data.message,
    threadId: data.threadId,
  }).catch((err) => console.warn("[COPILOT-LEARNING] Falha ao extrair fatos:", err));

  storeSemanticMemoryChunk({
    sessionId: data.threadId,
    profileId: identityId,
    contentChunk: `Usuário: ${data.message}\nCopilot: ${execution.responseMessage}`,
    importanceScore: execution.artifact ? 0.8 : 0.5,
  }).catch((err) => console.warn("[COPILOT-LEARNING] Falha ao gravar memória semântica:", err));

  return {
    userMessageId: userMsg.id,
    aiMessage: {
      id: persistedAiMessageId || crypto.randomUUID(),
      threadId: data.threadId,
      text: execution.responseMessage,
      activitySteps: execution.activitySteps,
      executionId: execution.executionId,
      artifact: execution.artifact,
      structuredPayload: execution.structuredPayload,
      sources: execution.sources || [],
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
}

export const sendAiConversationMessage = createServerFn({ method: "POST" })
  .validator(sendAiMessageSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    const prepared = await prepareCopilotExchangeContext(data, identity);
    if ("alreadyPersisted" in prepared && prepared.alreadyPersisted) {
      return prepared.alreadyPersisted;
    }

    // 3. Execução do pipeline de IA ReAct com chamada de ferramentas reais (com Error Boundary)
    let execution: AiExecutionResult;
    const copilotAbortController = new AbortController();
    try {
      execution = await withCopilotTimeout(
        executeAiCopilotPipeline(data.message, prepared.resolvedWorkingMemory, {
          threadId: data.threadId,
          userId: identity.id,
          storeId: prepared.resolvedStoreId || undefined,
          folderId: prepared.resolvedFolderId,
          projectId: prepared.resolvedProjectId,
          quickToolMode: data.quickToolMode,
          userLat: data.userLat,
          userLng: data.userLng,
          city: normalizeActiveCity(data.city) ?? resolveActiveCity(),
          signal: copilotAbortController.signal,
          attachments: data.attachments || [],
          recentMessages: prepared.recentMessages,
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
        updatedMemory: prepared.resolvedWorkingMemory,
        fsmPhase: "FAILED_RETRYABLE",
      };
    }

    return finalizeCopilotExchange({
      db: prepared.db,
      data,
      identityId: identity.id,
      isAiThread: prepared.isAiThread,
      resolvedStoreId: prepared.resolvedStoreId,
      userMsg: prepared.userMsg,
      execution,
    });
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

    const { data: aiThread } = await db
      .from("ai_threads")
      .select("id, user_id, workspace_id")
      .eq("id", data.threadId)
      .maybeSingle();

    if (aiThread) {
      if (aiThread.user_id !== identity.id && !["platform_admin", "master"].includes(identity.role)) {
        if (aiThread.workspace_id) {
          assertStoreAccess(identity, STAFF_ROLES, aiThread.workspace_id);
        } else {
          throw new Error("Sem permissão para salvar artefato nesta conversa");
        }
      }

      const { data: artifact, error } = await db
        .from("ai_artifacts")
        .insert({
          user_id: identity.id,
          workspace_id: aiThread.workspace_id || data.storeId || null,
          thread_id: data.threadId,
          message_id: data.messageId || null,
          artifact_type: normalizeArtifactType(data.artifactType),
          title: data.title,
          current_version: data.version || 1,
          data: data.data || {},
          metadata: data.metadata || {},
        })
        .select("*")
        .single();

      if (error || !artifact) {
        throw new Error("Falha ao salvar artefato");
      }

      await db.from("ai_artifact_versions").insert({
        artifact_id: artifact.id,
        version_number: data.version || 1,
        data: data.data || {},
        metadata: data.metadata || {},
        created_by: identity.id,
      });

      return artifact;
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

function assertCanMutateAiThread(
  aiThread: { user_id?: string | null; workspace_id?: string | null },
  identity: { id?: string | null; role: string; store_id?: string | null; memberships?: any[] },
  actionLabel: string,
) {
  if (aiThread.user_id !== identity.id && !["platform_admin", "master"].includes(identity.role)) {
    if (aiThread.workspace_id) {
      assertStoreAccess(identity as any, STAFF_ROLES, aiThread.workspace_id);
    } else {
      throw new Error(`Sem permissão para ${actionLabel} esta conversa`);
    }
  }
}

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

    const { data: aiThread } = await db
      .from("ai_threads")
      .select("id, user_id, workspace_id")
      .eq("id", data.threadId)
      .maybeSingle();

    if (aiThread) {
      assertCanMutateAiThread(aiThread, identity, "alterar");
      const { error: aiErr } = await db
        .from("ai_threads")
        .update({ pinned: data.isPinned, updated_at: new Date().toISOString() })
        .eq("id", data.threadId);
      if (aiErr) throw new Error("Falha ao alterar fixação da thread");
      return { success: true, isPinned: data.isPinned };
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

    const { data: aiThread } = await db
      .from("ai_threads")
      .select("id, user_id, workspace_id")
      .eq("id", data.threadId)
      .maybeSingle();

    if (aiThread) {
      assertCanMutateAiThread(aiThread, identity, "alterar");
      const { error: aiErr } = await db
        .from("ai_threads")
        .update({
          archived: data.isArchived,
          status: data.isArchived ? "archived" : "open",
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.threadId);
      if (aiErr) throw new Error("Falha ao alterar arquivamento da thread");
      return { success: true, isArchived: data.isArchived };
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

    const { data: aiThread } = await db
      .from("ai_threads")
      .select("id, user_id, workspace_id")
      .eq("id", data.threadId)
      .maybeSingle();

    if (aiThread) {
      assertCanMutateAiThread(aiThread, identity, "excluir");
      await db.from("ai_messages").delete().eq("thread_id", data.threadId);
      await db.from("ai_artifacts").delete().eq("thread_id", data.threadId);
      await db.from("ai_tasks").update({ thread_id: null }).eq("thread_id", data.threadId);
      await db.from("copilot_executions").update({ thread_id: null }).eq("thread_id", data.threadId);
      const { data: deletedAiThread, error } = await db
        .from("ai_threads")
        .delete()
        .eq("id", data.threadId)
        .select("id")
        .maybeSingle();
      if (error || !deletedAiThread) throw new Error("Falha ao excluir conversa");
      return { success: true };
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
    const { data: deletedLegacyThread, error } = await db
      .from("chat_threads")
      .delete()
      .eq("id", data.threadId)
      .select("id")
      .maybeSingle();

    if (error || !deletedLegacyThread) {
      throw new Error("Falha ao excluir conversa");
    }

    return { success: true };
  });

// ============================================================
// 7.1 Renomear Thread do Copilot
// ============================================================

export const renameAiThreadSchema = z.object({
  threadId: z.string().uuid(),
  title: z.string().trim().min(2, "Título muito curto").max(120, "Limite de 120 caracteres"),
});

export const renameAiConversationThread = createServerFn({ method: "POST" })
  .validator(renameAiThreadSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    const { data: aiThread } = await db
      .from("ai_threads")
      .select("id, user_id, workspace_id")
      .eq("id", data.threadId)
      .maybeSingle();

    if (aiThread) {
      assertCanMutateAiThread(aiThread, identity, "renomear");
      const { error } = await db
        .from("ai_threads")
        .update({ title: data.title, updated_at: new Date().toISOString() })
        .eq("id", data.threadId);
      if (error) throw new Error("Falha ao renomear conversa");
      return { success: true, title: data.title };
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

    const { error } = await db
      .from("chat_threads")
      .update({ subject: data.title, updated_at: new Date().toISOString() })
      .eq("id", data.threadId);

    if (error) {
      throw new Error("Falha ao renomear conversa");
    }

    return { success: true, title: data.title };
  });

// ============================================================
// 8. Mensagem de Convidado / Guest para o Copilot
// ============================================================

export const executeGuestCopilotMessageSchema = z.object({
  message: z.string().min(1, "Mensagem não pode ser vazia").max(2000),
  quickToolMode: z
    .enum(["default", "website_builder", "interactive_map", "document", "creative_post", "hot_offer"])
    .optional(),
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
          quickToolMode: data.quickToolMode,
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
        throw new Error(
          `Falha no upload do anexo em todos os buckets autorizados: ${uploadError.message} / ${fbErr.message}`,
        );
      }
      const { data: fbUrl } = supabase.storage.from(fallbackBucket).getPublicUrl(storagePath);
      uploadUrl = fbUrl?.publicUrl || "";
    } else {
      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      uploadUrl = pubData?.publicUrl || "";
    }

    if (!uploadUrl) {
      throw new Error("Não foi possível obter a URL pública do anexo enviado.");
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
      const pdfText = await extractPdfTextBestEffort(buffer);
      extractedText =
        pdfText.length >= 12
          ? pdfText.slice(0, 30_000)
          : `[Documento PDF: ${data.fileName}, aprox. ${pagesCount} página(s), tamanho: ${(sizeBytes / 1024).toFixed(1)} KB — sem camada textual selecionável]`;
    } else if (cleanMime.startsWith("image/")) {
      extractedText = `[Imagem anexada: ${data.fileName}, formato ${cleanMime}, tamanho: ${(sizeBytes / 1024).toFixed(1)} KB. Pronta para leitura visual/OCR]`;
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

// ============================================================
// 11. Controle Humano de Execuções Duráveis & Retomada
// ============================================================

export async function finalizeResumedCopilotExchange(params: {
  threadId: string;
  userId: string;
  storeId: string | null;
  clientMessageId?: string;
  userPrompt: string;
  execution: AiExecutionResult;
}) {
  const db = getServerClient();
  const { data: thread } = await db
    .from("ai_threads")
    .select("id")
    .eq("id", params.threadId)
    .maybeSingle();
  const isAiThread = Boolean(thread?.id);

  let userMsg: { id: string; created_at: string } | null = null;
  if (isAiThread) {
    const { data: latestUser } = await db
      .from("ai_messages")
      .select("id, created_at")
      .eq("thread_id", params.threadId)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestUser?.id) userMsg = latestUser;
  } else {
    const { data: latestLegacy } = await db
      .from("chat_messages")
      .select("id, created_at")
      .eq("thread_id", params.threadId)
      .eq("is_staff_reply", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestLegacy?.id) userMsg = latestLegacy;
  }

  if (!userMsg) {
    userMsg = { id: crypto.randomUUID(), created_at: new Date().toISOString() };
  }

  return finalizeCopilotExchange({
    db,
    data: {
      threadId: params.threadId,
      message: params.userPrompt,
      clientMessageId: params.clientMessageId,
      attachments: [],
    },
    identityId: params.userId,
    isAiThread,
    resolvedStoreId: params.storeId,
    userMsg,
    execution: params.execution,
  });
}

const controlCopilotExecutionSchema = z.object({
  executionId: z.string().uuid(),
  action: z.enum(["pause", "resume", "inject_guidance", "cancel"]),
  guidance: z.string().max(2000).optional(),
});

export const controlCopilotExecutionFn = createServerFn({ method: "POST" })
  .validator(controlCopilotExecutionSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Autenticação necessária para controlar execução do Copilot.");
    }
    const res = await controlCopilotExecution({
      executionId: data.executionId,
      userId: identity.id,
      storeId: identity.store_id || undefined,
      action: data.action,
      guidance: data.guidance,
    });
    return {
      success: res.success,
      status: res.status,
      state: res.state as Record<string, any>,
    };
  });

export const getCopilotExecutionStateFn = createServerFn({ method: "GET" })
  .validator(z.object({ executionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Autenticação necessária.");
    }
    const loaded = await loadCopilotExecutionForContinue({
      executionId: data.executionId,
      userId: identity.id,
      storeId: identity.store_id || undefined,
    });
    if (!loaded) {
      throw new Error("Execução não encontrada ou acesso negado.");
    }
    return {
      executionId: loaded.execution.id,
      status: loaded.execution.status,
      currentPhase: loaded.execution.current_phase,
      plan: Array.isArray(loaded.execution.plan) ? loaded.execution.plan : [],
      state: loaded.execution.state || {},
      steps: loaded.steps,
    };
  });

export const listPendingAiChatApprovals = createServerFn({ method: "GET" })
  .validator(z.object({ limit: z.number().int().min(1).max(50).optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) return [];
    const db = getServerClient();
    const { data: rows, error } = await db
      .from("copilot_action_approvals")
      .select("id, action_type, payload, status, requested_at, expires_at, store_id, user_id")
      .eq("status", "pending")
      .eq("user_id", identity.id)
      .order("requested_at", { ascending: false })
      .limit(data?.limit ?? 10);
    if (error) {
      throw new Error(error.message || "Não foi possível carregar aprovações.");
    }
    return rows || [];
  });

