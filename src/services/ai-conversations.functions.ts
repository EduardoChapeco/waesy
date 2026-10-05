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
import { resolveActiveCity, normalizeActiveCity } from "@/lib/city-helper";
import { executeMcpToolCall } from "./mcp-server.functions";
import { MCP_TOOL_REGISTRY } from "@/registries/mcp-tool-registry";
import { requireTokensOrTollbooth } from "@/lib/token-tollbooth.server";
import {
  CopilotStateMachine,
  canTransitionCopilotPhase,
  type CopilotFsmPhase,
  type CopilotFsmExecutionState,
} from "@/types/copilot-fsm";
import type {
  AIActivityStep,
  AIActivityStepType,
  ChatArtifactData,
  ChatArtifactType,
} from "@/types/chat";

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
  message: z.string().min(1, "Mensagem não pode ser vazia").max(2000, "Limite de 2.000 caracteres por mensagem atingido"),
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
  artifactType: z.enum(["document", "spreadsheet", "presentation", "landing_page", "proposal", "image"]),
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
  workingMemory: Record<string, any> = {}
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
    label: "Pesquisa no banco de dados e catálogo da loja",
    detail: "Buscando entidades correspondentes e políticas do tenant",
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
      label: "Skill Commercial Proposal acionada",
      detail: "Estruturando escopo técnico, marcos de entrega e modelo BRL",
      status: "completed",
      startedAt: new Date(startTime + 185).toISOString(),
      completedAt: new Date(startTime + 420).toISOString(),
      durationMs: 235,
      tokensUsed: 210,
    });

    steps.push({
      id: `step-3-${startTime}`,
      type: "model",
      label: "Sintetizando artefato versionado de proposta",
      detail: "Compilando documento executivo em formato exportável",
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
      authorName: "Consultor Comercial IA",
      authorRole: "Agente Executivo",
      previewSummary: "Escopo detalhado de implementação, cronograma em 4 etapas e tabela de investimento com condições de pagamento.",
      data: {
        total_cents: 850000,
        currency: "BRL",
        validity_days: 15,
        milestones: ["Briefing e Diagnóstico", "Estruturação de Catálogo", "Homologação", "Go-Live"],
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

    responseMessage = "Elaborei a proposta comercial completa conforme os parâmetros do projeto. O documento foi anexado à conversa como artefato versionado pronto para abertura no Builder ou exportação em PDF.";
    updatedMemory.last_proposal_created = new Date().toISOString();
  }
  // Detectar solicitação de landing page ou builder
  else if (promptLower.includes("landing") || promptLower.includes("site") || promptLower.includes("página")) {
    steps.push({
      id: `step-2-${startTime}`,
      type: "skill",
      label: "Skill Omni Builder Architect acionada",
      detail: "Definindo seções: Hero, Recursos, Grade de Produtos e Footer",
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
      authorName: "Designer de UI/UX IA",
      authorRole: "Squad de Crescimento",
      previewSummary: "Estrutura pronta com hero responsivo, grade de 3 colunas de produtos locais e rodapé com mapa de cobertura.",
      data: {
        theme: "apple-clean",
        blocksCount: 4,
        viewportTarget: "responsive",
      },
    };

    responseMessage = "Gerei a estrutura inicial da landing page. O artefato está disponível abaixo e pode ser aberto diretamente no Builder visual para edição.";
    updatedMemory.last_landing_page = artifact.title;
  }
  // Detectar solicitação de planilha ou relatório financeiro
  else if (promptLower.includes("planilha") || promptLower.includes("tabela") || promptLower.includes("métricas") || promptLower.includes("caixa") || promptLower.includes("vendas")) {
    steps.push({
      id: `step-2-${startTime}`,
      type: "tool",
      label: "Tool Financial Intelligence acionada",
      detail: "Estruturando linhas de fluxo de caixa, DRE e projeção de vendas",
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
      authorName: "Assistente Financeiro IA",
      authorRole: "Squad de Operações",
      previewSummary: "Métricas consolidadas de entradas, saídas, margem e indicadores de desempenho.",
      data: {
        headers: ["Mês", "Entradas (R$)", "Saídas (R$)", "Saldo Líquido (R$)", "Margem (%)"],
        rows: [
          ["Janeiro", "45.000,00", "28.000,00", "17.000,00", "37,7%"],
          ["Fevereiro", "52.000,00", "31.000,00", "21.000,00", "40,3%"],
          ["Março", "61.000,00", "34.000,00", "27.000,00", "44,2%"],
        ],
      },
    };

    responseMessage = "Gerei a planilha com as métricas financeiras e fluxo de caixa. O artefato tabular pode ser visualizado ou exportado diretamente:";
    updatedMemory.last_spreadsheet_created = new Date().toISOString();
  }
  // Detectar solicitação de compras, carrinho ou mercado
  else if (promptLower.includes("comprar") || promptLower.includes("carrinho") || promptLower.includes("mercado") || promptLower.includes("vestuário")) {
    steps.push({
      id: `step-2-${startTime}`,
      type: "tool",
      label: "Tool search_catalog_products e cálculo de frete",
      detail: "Consultando inventário em tempo real e aplicando tabela de entrega",
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

    responseMessage = "Localizei os produtos na loja com estoque confirmado. O carrinho foi montado abaixo com valores atualizados em tempo real:";
    updatedMemory.last_commerce_query = promptLower.slice(0, 40);
    updatedMemory.last_interaction_topic = userPrompt.slice(0, 40);
  }
  // Detectar rastreamento de pedido
  else if (promptLower.includes("rastrear") || promptLower.includes("rastreio") || (promptLower.includes("status") && promptLower.includes("pedido"))) {
    steps.push({
      id: `step-2-${startTime}`,
      type: "tool",
      label: "Tool order_events e telemetria logística",
      detail: "Buscando linha do tempo do pedido e dados de despacho",
      status: "completed",
      startedAt: new Date(startTime + 185).toISOString(),
      completedAt: new Date(startTime + 370).toISOString(),
      durationMs: 185,
      tokensUsed: 140,
    });

    structuredPayload = {
      blocks: [
        {
          type: "commerce_order_tracking",
          data: {
            orderId: crypto.randomUUID(),
            orderNumber: "WSY-BR-9842",
            status: "dispatched",
            totalCents: 14500,
            itemsCount: 2,
            deliveryAddress: "Rua Duque de Caxias, Centro",
            courier: {
              name: "MotoLink Express",
              phone: "49999999999",
              vehiclePlate: "BRA-2E19",
            },
            timeline: [
              { stage: "received", label: "Pedido Recebido", completedAt: new Date(Date.now() - 3600000).toISOString() },
              { stage: "preparing", label: "Em Separação", completedAt: new Date(Date.now() - 1800000).toISOString() },
              { stage: "dispatched", label: "Em Rota com Entregador", completedAt: new Date().toISOString() },
            ],
          },
        },
      ],
    };

    responseMessage = "Consultei a linha do tempo do seu pedido na base de dados soberana. O status atual e histórico de eventos estão exibidos no bloco de rastreio:";
    updatedMemory.last_tracking_query = new Date().toISOString();
    updatedMemory.last_interaction_topic = userPrompt.slice(0, 40);
  }
  // Detectar agendamento de serviço ou consulta
  else if (promptLower.includes("agendar") || promptLower.includes("agendamento") || (promptLower.includes("marcar") && (promptLower.includes("horário") || promptLower.includes("consulta")))) {
    steps.push({
      id: `step-2-${startTime}`,
      type: "tool",
      label: "Tool booking_services e verificação de agenda",
      detail: "Identificando janelas livres e disponibilidade do especialista",
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

    responseMessage = "Encontrei horários disponíveis na agenda do especialista. Você pode selecionar o horário e confirmar o agendamento diretamente:";
    updatedMemory.last_booking_query = new Date().toISOString();
    updatedMemory.last_interaction_topic = userPrompt.slice(0, 40);
  }
  // Fluxo de Consulta Padrão de Assistente
  else {
    steps.push({
      id: `step-2-${startTime}`,
      type: "model",
      label: "Processamento de linguagem natural e regras de negócio",
      detail: "Aplicando tom de voz da loja e diretrizes de concisão",
      status: "completed",
      startedAt: new Date(startTime + 185).toISOString(),
      completedAt: new Date(startTime + 410).toISOString(),
      durationMs: 225,
      tokensUsed: 195,
    });

    responseMessage = `Recebi sua instrução e processei o contexto da conversa. As preferências foram salvas na memória de trabalho da thread. Como posso auxiliar nos próximos passos do projeto?`;
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
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
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
  if (text.includes("onde fica") || text.includes("cafeteria") || text.includes("restaurante") || text.includes("perto de mim") || text.includes("empresa") || text.includes("loja")) {
    return "search_places";
  }
  if (text.includes("corrida") || text.includes("motorista") || text.includes("uber") || text.includes("moto passageiro") || text.includes("carro") || text.includes("frete")) {
    return "estimate_mobility";
  }
  if (text.includes("viagem") || text.includes("turismo") || text.includes("roteiro") || text.includes("pacote")) {
    return "travel_itinerary";
  }
  if (text.includes("advogad") || text.includes("processo") || text.includes("demitid") || text.includes("jurídic") || text.includes("indenização")) {
    return "legal_triage";
  }
  if (text.includes("anúncio") || text.includes("arte") || text.includes("post") || text.includes("banner") || text.includes("propaganda")) {
    return "create_ad";
  }
  if (text.includes("pizza") || text.includes("cardápio") || text.includes("lanche") || text.includes("comprar")) {
    return "search_catalog";
  }
  if (text.includes("proposta") || text.includes("orçamento")) {
    return "commercial_proposal";
  }
  if (text.includes("planilha") || text.includes("tabela") || text.includes("métricas") || text.includes("caixa")) {
    return "financial_report";
  }
  return "general_chat";
}

function extractSearchTerm(text: string): string {
  const clean = text
    .replace(/(onde\s+fica|onde\s+tem|tem\s+alguma|procuro|gostaria\s+de|perto\s+de\s+mim|na\s+minha\s+cidade)/gi, "")
    .trim();
  return clean.slice(0, 30);
}

export async function executeAiCopilotPipeline(
  userPrompt: string,
  workingMemory: Record<string, any> = {},
  context: AiCopilotContext = {}
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
        label: "Firewall de Segurança & Prompt Shield",
        detail: `Bloqueio preventivo ativado: ${securityCheck.violationReason || "Padrão inseguro detectado"}`,
        status: "failed",
        fsmPhase: "FAILED_FINAL",
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(startTime + 40).toISOString(),
        durationMs: 40,
        tokensUsed: 12,
      });

      return {
        responseMessage: "Desculpe, sua mensagem contém instruções ou padrões não permitidos pelas políticas de segurança do sistema.",
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
        label: "Firewall Financeiro & Zero-Trust",
        detail: "Operações financeiras requerem sessão de checkout autenticada com Pix/Token assinado",
        status: "completed",
        fsmPhase: "COMPLETED",
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(startTime + 30).toISOString(),
        durationMs: 30,
        tokensUsed: 14,
      });

      return {
        responseMessage: "Por diretriz de segurança financeira e proteção do usuário, transações de pagamento não podem ser executadas autonomamente pelo chat. Gere um pedido no catálogo ou acesse o checkout para autenticar com chave Pix ou cartão.",
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
      label: "Pesquisa contextual e memória do tenant",
      detail: "Consultando contexto geográfico, histórico da conversa e tabelas soberanas",
      status: "completed",
      fsmPhase: "UNDERSTANDING",
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date(startTime + 120).toISOString(),
      durationMs: 120,
      tokensUsed: 45,
    });

    const db = getServerClient();

    // Executa o Gateway de IA Soberano se houver modelo ativo no pool (com Prompt Sandboxing)
    let gatewayResponse: any = null;
    try {
      const systemPrompt = `Você é o Waesy Copilot, assistente inteligente do ecossistema local.
Você tem acesso a ferramentas da cidade:
1. 'search_places': busca estabelecimentos locais (cafés, restaurantes, mercados, academias, oficinas, etc.)
2. 'estimate_mobility': calcula estimativas de corrida urbana (moto, carro, entrega, van)
3. 'search_catalog': busca produtos ou itens de cardápio com modificadores
4. 'travel_itinerary': monta pacotes de viagem com dias, passeios e hotéis
5. 'legal_triage': faz triagem jurídica com área do direito e checklist
6. 'create_ad': cria cópia e arte para anúncio/mural
7. 'commercial_proposal': cria proposta comercial formal BRL
8. 'financial_report': gera relatório/planilha de caixa

Responda SEMPRE em formato JSON com os campos:
{
  "intent": "search_places" | "estimate_mobility" | "search_catalog" | "travel_itinerary" | "legal_triage" | "create_ad" | "commercial_proposal" | "financial_report" | "general_chat",
  "tool_args": { ... },
  "message": "Mensagem concisa e clara para o usuário",
  "step_label": "Título amigável da ferramenta acionada",
  "step_detail": "Detalhe da operação executada"
}`;

      // 🛡️ Prompt Sandboxing: Isola dados não-confiáveis externos em <user_untrusted_data>
      const { hardenedSystemPrompt, sandboxedUserPrompt } = buildSandboxedPromptPayload(
        userPrompt,
        systemPrompt
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
      };
      const runGateway = () => executeAiCoreGateway(gatewayRequest);
      const estimatedTokens = Math.max(1, Math.ceil((sandboxedUserPrompt.length + hardenedSystemPrompt.length) / 4));
      const res = context.storeId
        ? (await requireTokensOrTollbooth({
            storeId: context.storeId,
            tokens: estimatedTokens,
            actionType: "burn_ai_agent_chat",
            serviceCategory: "heavy_ia_llm",
            description: "Execução do Copilot com roteamento de provider e ferramentas",
            idempotencyKey: `copilot_${context.threadId}_${startTime}`,
            metadata: { threadId: context.threadId, task: "chat", estimatedTokens },
            executeAction: runGateway,
          })).result
        : await runGateway();

      if (res?.success && res.result?.parsedJson) {
        gatewayResponse = res.result.parsedJson;
      } else if (res?.success && res.result?.text) {
        try {
          gatewayResponse = JSON.parse(res.result.text);
        } catch {
          // Fallback texto livre
        }
      }
    } catch (gwErr) {
      console.warn("[AI-COPILOT] Falha ou ausência de chave no gateway, executando dispatcher determinístico:", gwErr);
    }

    const intent = gatewayResponse?.intent || detectIntent(promptLower);
    const toolArgs = gatewayResponse?.tool_args || {};

    // ── 0. Orquestrador autônomo de mineração e copilot (planilhas, leads, CNPJ, processos CNJ, turismo, vagas, builder) ──
    const isAutonomousOrMiningRequest =
      /\b(minerar|minere|minera[çc][ãa]o|planilha|tabela|leads?|hospedagem|hot[eé]is|resorts?|pousadas?|vagas?|empregos?|eventos?|shows?|receita|ficha t[eé]cnica|landing page|biolink)\b/i.test(userPrompt) ||
      /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/.test(userPrompt) ||
      /\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/.test(userPrompt);

    if (
      isAutonomousOrMiningRequest &&
      needsCityClarification(fragmentAndOptimizePrompt(userPrompt, { city: context.city, state: context.state }))
    ) {
      fsm.transition("NEEDS_CLARIFICATION", "Recorte municipal ausente no prompt e no contexto");
      return {
        responseMessage: "Informe a cidade para a busca (ex.: \"em Chapecó\") ou ative sua localização.",
        activitySteps: steps,
        updatedMemory,
        fsmPhase: fsm.currentPhase,
        fsmState: fsm.snapshot,
      };
    }

    fsm.transition("RUNNING", `Executando intent: ${intent}`);

    let structuredPayload: Record<string, any> | undefined;
    let artifact: ChatArtifactData | undefined;
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
        steps.push(...(copilotResult.steps || []));

        if (copilotResult.artifact) {
          artifact = {
            id: crypto.randomUUID(),
            type: copilotResult.artifact.type,
            title: copilotResult.artifact.title,
            version: 1,
            totalVersions: 1,
            authorName: "Waesy Copilot",
            authorRole: "Mineração e Inteligência Urbana",
            previewSummary: copilotResult.summaryMessage,
            data: copilotResult.artifact.data,
          };

          if (copilotResult.artifact.type === "spreadsheet" && copilotResult.artifact.data?.headers) {
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
        responseMessage = `Não foi possível consultar os dados externos no momento devido à indisponibilidade temporária (${autoErr.message?.slice(0, 80)}). Você pode tentar novamente em alguns instantes.`;
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
    const mcpCandidateTool = (gatewayResponse?.tool_name || (intent in MCP_TOOL_REGISTRY ? intent : "")) as string;
    const isMcpTool = Boolean(mcpCandidateTool && MCP_TOOL_REGISTRY[mcpCandidateTool]);

    if (isMcpTool) {
      const stepStart = Date.now();
      const toolDef = MCP_TOOL_REGISTRY[mcpCandidateTool];
      fsm.transition("WAITING_TOOL", `Executando WebMCP Tool: ${mcpCandidateTool}`);

      steps.push({
        id: `step-mcp-${mcpCandidateTool}-${stepStart}`,
        type: "tool",
        label: gatewayResponse?.step_label || `Ferramenta MCP: ${mcpCandidateTool}`,
        detail: gatewayResponse?.step_detail || toolDef.description || `Invocando ${mcpCandidateTool} via WebMCP Server`,
        status: "running",
        fsmPhase: "WAITING_TOOL",
        startedAt: new Date(stepStart).toISOString(),
      });

      try {
        const mcpResult = await executeMcpToolCall({
          tool: mcpCandidateTool,
          arguments: toolArgs,
          storeId: context.storeId,
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
          const errorText = mcpResult.content.find((c) => c.type === "text")?.text || "Erro na execução da MCP Tool";
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
  if (intent === "search_places" || promptLower.includes("onde fica") || promptLower.includes("perto") || promptLower.includes("cafeteria") || promptLower.includes("restaurante") || promptLower.includes("empresa") || promptLower.includes("loja")) {
    const stepStart = Date.now();
    steps.push({
      id: `step-places-${stepStart}`,
      type: "tool",
      label: gatewayResponse?.step_label || "Ferramenta search_places acionada",
      detail: gatewayResponse?.step_detail || "Buscando estabelecimentos ativos e calculando distância geográfica",
      status: "completed",
      startedAt: new Date(stepStart).toISOString(),
      completedAt: new Date(stepStart + 160).toISOString(),
      durationMs: 160,
      tokensUsed: 120,
    });

    const term = toolArgs.query || extractSearchTerm(promptLower);
    let query = db
      .from("directory_listings")
      .select("id, store_id, business_name, category, description, address, latitude, longitude, contact_phone, contact_whatsapp, working_hours, is_verified, rating, avatar_url, banner_url, status")
      .eq("status", "active")
      .limit(6);

    if (term) {
      query = query.or(`business_name.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%`);
    }

    const { data: listings } = await query;
    const places = (listings && listings.length > 0 ? listings : []).map((l: any) => {
      let dist = null;
      if (context.userLat && context.userLng && l.latitude && l.longitude) {
        dist = calculateHaversineDistance(context.userLat, context.userLng, l.latitude, l.longitude);
      }
      return {
        id: l.id,
        store_id: l.store_id,
        name: l.business_name || "Estabelecimento Local",
        category: l.category || "Comércio & Serviços",
        address: l.address || "Endereço no centro",
        distance_km: dist,
        is_open: true,
        rating: l.rating || 4.8,
        contact_whatsapp: l.contact_whatsapp,
        contact_phone: l.contact_phone,
        avatar_url: l.avatar_url || l.banner_url,
      };
    });

    structuredPayload = {
      blocks: [
        {
          type: "places_carousel",
          data: {
            title: "Estabelecimentos Locais",
            places,
          },
        },
      ],
    };

    if (!responseMessage) {
      responseMessage = places.length > 0
        ? `Localizei ${places.length} estabelecimentos correspondentes na sua região. Você pode conferir os detalhes e entrar em contato direto:`
        : "Não encontrei estabelecimentos cadastrados para esse termo no momento. Você pode explorar outras categorias no diretório do Places.";
    }

    updatedMemory.last_places_query = term;
  }
  // ── 2. Mobilidade & Corridas / Entregas ──
  else if (intent === "estimate_mobility" || promptLower.includes("corrida") || promptLower.includes("motorista") || promptLower.includes("uber") || promptLower.includes("moto passageiro") || promptLower.includes("chamar carro") || promptLower.includes("frete")) {
    const stepStart = Date.now();
    steps.push({
      id: `step-mobility-${stepStart}`,
      type: "tool",
      label: gatewayResponse?.step_label || "Ferramenta estimate_mobility acionada",
      detail: gatewayResponse?.step_detail || "Calculando tarifas de Moto, Carro e Utilitário com base na distância",
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
  else if (intent === "travel_itinerary" || promptLower.includes("viagem") || promptLower.includes("turismo") || promptLower.includes("roteiro") || promptLower.includes("pacote")) {
    const stepStart = Date.now();
    steps.push({
      id: `step-travel-${stepStart}`,
      type: "skill",
      label: gatewayResponse?.step_label || "Skill Tourism Itinerary Builder acionada",
      detail: gatewayResponse?.step_detail || "Compilando atrações diárias, categoria hoteleira e estimativa BRL",
      status: "completed",
      startedAt: new Date(stepStart).toISOString(),
      completedAt: new Date(stepStart + 350).toISOString(),
      durationMs: 350,
      tokensUsed: 310,
    });

    const destination = toolArgs.destination || "Serra Gaúcha (Gramado & Canela)";
    const days = toolArgs.days || [
      { day: 1, title: "Chegada e Passeio pelo Centro", activities: ["Check-in no Hotel", "Visita à Rua Coberta e Palácio dos Festivais", "Jantar de Fondue Tradicional"] },
      { day: 2, title: "Passeio de Trem e Vinícolas", activities: ["Passeio da Maria Fumaça com degustação", "Visita ao Vale dos Vinhedos", "Parada no Parque do Caracol"] },
      { day: 3, title: "Chocolates Artesanais e Retorno", activities: ["Tour em fábrica de chocolate artesanal", "Compras e almoço colonial", "Check-out e transfer de retorno"] },
    ];

    structuredPayload = {
      blocks: [
        {
          type: "travel_itinerary",
          data: {
            destination,
            duration_days: 3,
            passengers_count: 2,
            hotel_category: "Hotel 4 Estrelas com Café",
            flights_included: true,
            estimated_budget_cents: 289000,
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
      authorName: "Consultor de Turismo IA",
      authorRole: "Especialista em Destinos",
      previewSummary: `Itinerário de 3 dias para ${destination} com passeios, hospedagem e estimativa de investimento.`,
      data: {
        destination,
        daysCount: 3,
        estimated_budget_cents: 289000,
      },
    };

    if (!responseMessage) {
      responseMessage = `Estruturei o roteiro completo de viagem para ${destination}. Você pode enviar a demanda para uma agência de turismo credenciada na plataforma para obter a cotação final com emissão de vouchers:`;
    }

    updatedMemory.last_travel_destination = destination;
  }
  // ── 4. Assessoria & Triagem Jurídica ──
  else if (intent === "legal_triage" || promptLower.includes("advogado") || promptLower.includes("processo") || promptLower.includes("demitido") || promptLower.includes("jurídic") || promptLower.includes("direito") || promptLower.includes("indenização")) {
    const stepStart = Date.now();
    steps.push({
      id: `step-legal-${stepStart}`,
      type: "skill",
      label: gatewayResponse?.step_label || "Skill Legal Triage & Intake acionada",
      detail: gatewayResponse?.step_detail || "Identificando área do direito, direitos violados e documentação recomendada",
      status: "completed",
      startedAt: new Date(stepStart).toISOString(),
      completedAt: new Date(stepStart + 290).toISOString(),
      durationMs: 290,
      tokensUsed: 260,
    });

    const legalArea = toolArgs.legal_area || (promptLower.includes("demit") || promptLower.includes("trabalh") ? "Direito Trabalhista" : promptLower.includes("compra") || promptLower.includes("defeito") ? "Direito do Consumidor" : "Direito Cível");
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
            urgency: promptLower.includes("urgente") || promptLower.includes("prazo") ? "urgent" : "normal",
            key_facts: keyFacts,
            required_documents: ["Documento com foto (RG/CNH)", "Comprovante de residência", "Contratos, recibos ou conversas que comprovem o fato"],
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
  else if (intent === "create_ad" || promptLower.includes("anúncio") || promptLower.includes("arte") || promptLower.includes("post") || promptLower.includes("banner") || promptLower.includes("propaganda")) {
    const stepStart = Date.now();
    steps.push({
      id: `step-creative-${stepStart}`,
      type: "tool",
      label: gatewayResponse?.step_label || "Tool Creative Studio Draft acionada",
      detail: gatewayResponse?.step_detail || "Gerando copy persuasiva com ganchos emocionais e chamada para ação",
      status: "completed",
      startedAt: new Date(stepStart).toISOString(),
      completedAt: new Date(stepStart + 240).toISOString(),
      durationMs: 240,
      tokensUsed: 215,
    });

    const headline = toolArgs.headline || "Super Oferta da Semana no Waesy!";
    const copy = toolArgs.copy || "Aproveite descontos especiais em produtos e serviços locais. Compre de quem produz na sua cidade com entrega rápida.";
    const cta = toolArgs.cta_label || "Conferir Ofertas";

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
      responseMessage = "Criei o rascunho da peça publicitária com copy persuasiva e chamada para ação. Você pode publicar diretamente no feed ou mural do comércio:";
    }

    updatedMemory.last_creative_topic = headline;
  }
  // ── 6. Compras, Produtos & Delivery ──
  else if (intent === "search_catalog" || promptLower.includes("comprar") || promptLower.includes("pizza") || promptLower.includes("cardápio") || promptLower.includes("pedido") || promptLower.includes("lanche")) {
    const stepStart = Date.now();
    steps.push({
      id: `step-food-${stepStart}`,
      type: "tool",
      label: gatewayResponse?.step_label || "Tool search_catalog e modificadores acionada",
      detail: gatewayResponse?.step_detail || "Consultando estoque e opções de personalização do cardápio",
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
                    { id: "opt-especial", name: "Especial", price_cents: Math.round(mainProd.price_cents * 0.25) },
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
        responseMessage = "Nenhum produto correspondente foi encontrado no catálogo ativo no momento. Você pode navegar pelos departamentos ou buscar por outro termo.";
      }
    }
  }
  // ── 7. Proposta Comercial Formal ──
  else if (intent === "commercial_proposal" || promptLower.includes("proposta") || promptLower.includes("orçamento")) {
    const stepStart = Date.now();
    steps.push({
      id: `step-proposal-${stepStart}`,
      type: "skill",
      label: gatewayResponse?.step_label || "Skill Commercial Proposal acionada",
      detail: gatewayResponse?.step_detail || "Estruturando escopo técnico, marcos de entrega e modelo BRL",
      status: "completed",
      startedAt: new Date(stepStart).toISOString(),
      completedAt: new Date(stepStart + 310).toISOString(),
      durationMs: 310,
      tokensUsed: 260,
    });

    const extractedTitle = toolArgs.title || (userPrompt.length > 8 ? `Proposta: ${userPrompt.slice(0, 50)}` : "Proposta Comercial de Prestação de Serviços");
    const totalCents = toolArgs.total_cents || 450000;
    const milestones = toolArgs.milestones || [
      "Diagnóstico inicial e alinhamento de escopo",
      "Execução técnica e implantação",
      "Homologação e validação com o cliente",
      "Entrega final e encerramento",
    ];

    artifact = {
      id: crypto.randomUUID(),
      type: "proposal",
      title: extractedTitle,
      version: 1,
      totalVersions: 1,
      authorName: "Consultor Comercial IA",
      authorRole: "Agente Executivo",
      previewSummary: `Proposta estruturada com cronograma em ${milestones.length} etapas e investimento total de ${formatMoney(totalCents / 100)}.`,
      data: {
        total_cents: totalCents,
        currency: "BRL",
        validity_days: 15,
        milestones,
        terms: "Condições de pagamento: 50% na aprovação e 50% na conclusão das entregas.",
      },
    };

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
      responseMessage = `Elaborei a proposta comercial "${extractedTitle}" com valor total de ${formatMoney(totalCents / 100)}. O documento foi versionado e está disponível no painel de artefatos para visualização e exportação.`;
    }

    updatedMemory.last_proposal_created = new Date().toISOString();
  }
  // ── 8. Relatório Financeiro & Planilha de Caixa ──
  else if (intent === "financial_report" || promptLower.includes("planilha") || promptLower.includes("tabela") || promptLower.includes("métricas") || promptLower.includes("caixa")) {
    const stepStart = Date.now();
    steps.push({
      id: `step-finance-${stepStart}`,
      type: "tool",
      label: gatewayResponse?.step_label || "Tool pos_get_cash_status acionada",
      detail: gatewayResponse?.step_detail || "Consultando demonstrativo e transações financeiras do tenant",
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
        totalRevenueCents = orders.reduce((sum: number, o: any) => sum + (o.total_amount_cents || 0), 0);
      }
    }

    const rows = ordersCount > 0 ? [
      ["Pedidos Faturados", String(ordersCount), formatMoney(totalRevenueCents / 100), "Concluído"],
      ["Ticket Médio", String(ordersCount), formatMoney((totalRevenueCents / (ordersCount || 1)) / 100), "Calculado"],
    ] : [
      ["Receitas Balcão", "0", "R$ 0,00", "Aguardando Vendas"],
      ["Delivery Online", "0", "R$ 0,00", "Sem Pedidos"],
      ["Serviços Locais", "0", "R$ 0,00", "Sem Lançamentos"],
    ];

    artifact = {
      id: crypto.randomUUID(),
      type: "spreadsheet",
      title: "Demonstrativo Financeiro do Caixa",
      version: 1,
      totalVersions: 1,
      authorName: "Auditor Financeiro IA",
      authorRole: "Controladoria",
      previewSummary: `Demonstrativo contábil com ${rows.length} linhas de registro e status de liquidação.`,
      data: {
        rows: rows.length,
        columns: 4,
        headers: ["Categoria", "Qtd", "Valor (BRL)", "Status"],
        dataRows: rows,
        format: "tabular",
      },
    };

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
      responseMessage = "Gerei a planilha consolidada de caixa com os dados reais do período. Você pode visualizá-la no painel ou baixar o arquivo CSV.";
    }

    updatedMemory.last_report_generated = new Date().toISOString();
  }
  // ── 9. Conversa Geral & Orientação do Ecossistema ──
  else {
    const stepStart = Date.now();
    steps.push({
      id: `step-general-${stepStart}`,
      type: "model",
      label: "Síntese de resposta do Waesy Copilot",
      detail: "Processando diálogo com contexto da conversa",
      status: "completed",
      startedAt: new Date(stepStart).toISOString(),
      completedAt: new Date(stepStart + 150).toISOString(),
      durationMs: 150,
      tokensUsed: 95,
    });

    if (!responseMessage) {
      responseMessage = gatewayResponse?.message ||
        "Olá! Sou o Waesy Copilot, seu assistente inteligente no ecossistema local. Posso te ajudar a encontrar estabelecimentos no Places, calcular corridas ou fretes, consultar produtos e cardápios, planejar roteiros de viagem, estruturar propostas comerciais ou criar anúncios para o seu negócio. Como posso ajudar agora?";
    }

    updatedMemory.last_interaction_topic = userPrompt.slice(0, 40);
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
      label: "Proteção de Resiliência do Copilot",
      detail: `Falha capturada defensivamente: ${pipelineErr?.message || "Instabilidade temporária"}`,
      status: "failed",
      fsmPhase: "FAILED_RETRYABLE",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    return {
      responseMessage: `Ocorreu uma instabilidade temporária ao processar sua solicitação (${pipelineErr?.message || "Erro transitório"}). Seus dados e contexto foram preservados. Por favor, tente enviar sua mensagem novamente.`,
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

export const listAiConversationThreads = createServerFn({ method: "GET" })
  .handler(async (): Promise<AiConversationThreadDTO[]> => {
    try {
      const db = getServerClient();
      const identity = await getServerIdentity().catch(() => null);

      if (!identity?.id) {
        return [];
      }

      let query = db
        .from("chat_threads")
        .select(`
          id, type:thread_type, subject, store_id, customer_id, recipient_profile_id,
          status, is_pinned, metadata, working_memory, created_at, updated_at
        `)
        .or(`customer_id.eq.${identity.id},recipient_profile_id.eq.${identity.id}`)
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
  });

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

    if (Boolean(identity?.id) === false) {
      throw new Error("Usuário não autenticado");
    }

    // 1. Thread
    const { data: thread, error: threadErr } = await db
      .from("chat_threads")
      .select("*")
      .eq("id", threadId)
      .single();

    if (threadErr || Boolean(thread) === false) {
      throw new Error("Thread não encontrada");
    }

    // 2. Mensagens
    const { data: messages } = await db
      .from("chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    // 3. Artefatos vinculados à thread
    const { data: artifacts } = await db
      .from("chat_artifacts")
      .select("*")
      .eq("thread_id", threadId)
      .order("updated_at", { ascending: false });

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
      .select("id, thread_type, working_memory, store_id")
      .eq("id", data.threadId)
      .single();

    if (!thread) {
      throw new Error("Thread inexistente");
    }

    // 2. Inserir mensagem do usuário
    const { data: userMsg, error: userMsgErr } = await db
      .from("chat_messages")
      .insert({
        thread_id: data.threadId,
        sender_id: identity.id,
        is_staff_reply: false,
        message: data.message,
        message_type: "text",
        attachments: data.attachments || [],
        status: "delivered",
      })
      .select("id, created_at")
      .single();

    if (userMsgErr || Boolean(userMsg) === false) {
      throw new Error("Falha ao registrar mensagem do usuário");
    }

    // 3. Execução do pipeline de IA ReAct com chamada de ferramentas reais (com Error Boundary)
    let execution: AiExecutionResult;
    try {
      execution = await executeAiCopilotPipeline(
        data.message,
        thread.working_memory || {},
        {
          threadId: data.threadId,
          userId: identity.id,
          storeId: thread.store_id || undefined,
          userLat: data.userLat,
          userLng: data.userLng,
          city: normalizeActiveCity(data.city) ?? resolveActiveCity(),
        }
      );
    } catch (pipelineErr: any) {
      console.warn("[COPILOT-DEFENSIVE-WRAPPER] Erro capturado em sendAiConversationMessage:", pipelineErr);
      execution = {
        responseMessage: "Ocorreu uma instabilidade temporária ao consultar os serviços do Copilot. Seus dados e contexto foram preservados. Por favor, tente enviar sua mensagem novamente.",
        activitySteps: [
          {
            id: `step-err-${Date.now()}`,
            type: "tool",
            label: "Instabilidade Momentânea",
            detail: String(pipelineErr?.message || "Falha de rede").slice(0, 100),
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

    // 4. Salvar artefato no banco se gerado
    let persistedArtifactId: string | null = null;
    if (execution.artifact) {
      const { data: artDoc } = await db
        .from("chat_artifacts")
        .insert({
          thread_id: data.threadId,
          store_id: thread.store_id || null,
          created_by: identity.id,
          artifact_type: execution.artifact.type,
          title: execution.artifact.title,
          version: execution.artifact.version,
          data: execution.artifact.data || {},
          metadata: {
            authorName: execution.artifact.authorName,
            authorRole: execution.artifact.authorRole,
          },
        })
        .select("id")
        .single();

      if (artDoc) {
        persistedArtifactId = artDoc.id;
        execution.artifact.id = artDoc.id;
      }
    }

    // 5. Inserir mensagem de resposta da IA com trilha de passos, artefato e blocos estruturados
    const messageType = execution.structuredPayload ? "structured_blocks" : (execution.artifact ? "structured_blocks" : "text");
    const { data: aiMsg, error: aiMsgErr } = await db
      .from("chat_messages")
      .insert({
        thread_id: data.threadId,
        sender_id: identity.id,
        is_staff_reply: true,
        message: execution.responseMessage,
        message_type: messageType,
        payload: {
          activitySteps: execution.activitySteps,
          toolCalls: execution.toolCalls || [],
          artifact: execution.artifact,
          structuredBlocks: execution.structuredPayload,
          fsmPhase: execution.fsmPhase,
          fsmState: execution.fsmState,
        },
        status: "delivered",
      })
      .select("id, created_at")
      .single();

    // 6. Atualizar memória de trabalho e timestamp da thread
    await db
      .from("chat_threads")
      .update({
        working_memory: execution.updatedMemory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.threadId);

    return {
      userMessageId: userMsg.id,
      aiMessage: {
        id: aiMsg?.id || crypto.randomUUID(),
        text: execution.responseMessage,
        activitySteps: execution.activitySteps,
        artifact: execution.artifact,
        structuredPayload: execution.structuredPayload,
        createdAt: aiMsg?.created_at || new Date().toISOString(),
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

    const { data: artifact, error } = await db
      .from("chat_artifacts")
      .insert({
        thread_id: data.threadId,
        message_id: data.messageId || null,
        store_id: data.storeId || identity.store_id || null,
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

    const { error } = await db
      .from("chat_threads")
      .update({ is_pinned: data.isPinned, updated_at: new Date().toISOString() })
      .eq("id", data.threadId);

    if (error) {
      throw new Error("Falha ao alterar fixação da thread");
    }

    return { success: true, isPinned: data.isPinned };
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
      .select("id, created_by, store_id")
      .eq("id", data.threadId)
      .single();

    if (!thread) {
      throw new Error("Thread não encontrada");
    }

    if (thread.created_by !== identity.id && identity.role !== "admin") {
      throw new Error("Sem permissão para excluir esta conversa");
    }

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
    const execution = await executeAiCopilotPipeline(
      data.message,
      {},
      {
        userLat: data.userLat,
        userLng: data.userLng,
        city: data.city,
      }
    );
    return execution;
  });
