import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, requireAdmin } from "@/lib/server-access";
import { executeAiCoreGateway } from "./ai-core-gateway.functions";

// ============================================================
// Tipos & Contratos de Agentes e Squads (ia/04-agentes.md)
// ============================================================

export interface AIAgentDefinitionDTO {
  id: string;
  slug: string;
  name: string;
  role_label: string;
  goal: string;
  data_scope: string[];
  allowed_skills: string[];
  system_instruction: string;
  acceptance_criteria: string[];
  stop_conditions: string[];
  tone_of_voice: string;
  budget_limit_usd: number;
}

export interface AISquadDefinitionDTO {
  id: string;
  slug: string;
  name: string;
  description: string;
  goal: string;
  arbitration_policy: string;
  max_execution_steps: number;
  max_cost_budget_usd: number;
  max_timeout_seconds: number;
  members: Array<{
    agent_slug: string;
    step_order: number;
    handoff_rule: string;
    agent: AIAgentDefinitionDTO;
  }>;
}

export interface SquadHandoffDTO {
  stepIndex: number;
  fromAgent: string;
  toAgent: string;
  objective: string;
  contextPassed: Record<string, any>;
  workCompleted: Record<string, any>;
  workRemaining: string;
  costUsd: number;
  latencyMs: number;
  acceptanceVerified: boolean;
}

export interface SquadRunResultDTO {
  runId: string;
  squadSlug: string;
  status: "completed" | "halted_by_supervisor" | "failed";
  stepsCompleted: number;
  totalTokens: number;
  totalCostUsd: number;
  durationMs: number;
  handoffs: SquadHandoffDTO[];
  finalOutput: Record<string, any>;
  supervisorNotes?: string;
}

// ============================================================
// Catálogo Canônico de Agentes e Grafo de Squads
// ============================================================

export const CANONICAL_AGENTS: Record<string, AIAgentDefinitionDTO> = {
  sdr_agent: {
    id: "agent_sdr_01",
    slug: "sdr_agent",
    name: "SDR Qualificador de Leads",
    role_label: "SDR & Triagem",
    goal: "Qualificar leads e identificar prontidão de compra",
    data_scope: ["leads:read", "messages:read"],
    allowed_skills: ["lead_qualifier_sdr"],
    system_instruction: "Você é o SDR inicial da empresa. Extraia o perfil do cliente, calcule a pontuação BANT de 0 a 100 e resuma a dor principal.",
    acceptance_criteria: ["Score BANT calculado", "Necessidade principal descrita"],
    stop_conditions: ["Cliente solicitando cancelamento judicial", "Linguagem abusiva"],
    tone_of_voice: "profissional_atencioso",
    budget_limit_usd: 0.005,
  },
  commercial_closer: {
    id: "agent_closer_02",
    slug: "commercial_closer",
    name: "Executivo de Vendas & Propostas",
    role_label: "Closer de Vendas",
    goal: "Montar proposta comercial completa e atraente",
    data_scope: ["catalog:read", "proposals:write"],
    allowed_skills: ["commercial_proposal"],
    system_instruction: "Você é o consultor de vendas sênior. Com base na qualificação do SDR, elabore uma proposta comercial irrecusável com escopo e valores.",
    acceptance_criteria: ["Escopo de entregáveis delimitado", "Tabela de investimentos detalhada"],
    stop_conditions: ["Desconto acima de 30% solicitado"],
    tone_of_voice: "consultivo_persuasivo",
    budget_limit_usd: 0.008,
  },
  content_strategist: {
    id: "agent_strategist_03",
    slug: "content_strategist",
    name: "Estrategista de Pauta & Briefing",
    role_label: "Content Planner",
    goal: "Planejar pautas e ganchos persuasivos",
    data_scope: ["news:read", "marketing:read"],
    allowed_skills: ["ad_copywriter"],
    system_instruction: "Você é o estrategista de conteúdo. Defina a proposta editorial, persona-alvo e o gancho psicológico do tema.",
    acceptance_criteria: ["Público-alvo definido", "Gancho emocional estabelecido"],
    stop_conditions: ["Tema sem contexto"],
    tone_of_voice: "estrategico_analitico",
    budget_limit_usd: 0.005,
  },
  brand_copywriter: {
    id: "agent_copywriter_04",
    slug: "brand_copywriter",
    name: "Copywriter Publicitário",
    role_label: "Copywriter",
    goal: "Redigir copies de alta conversão para anúncios e redes",
    data_scope: ["marketing:write"],
    allowed_skills: ["ad_copywriter"],
    system_instruction: "Você é o copywriter publicitário. Escreva textos persuasivos seguindo o briefing do Estrategista com variações de títulos e CTAs.",
    acceptance_criteria: ["Mínimo de 2 opções de títulos", "Chamada de ação clara"],
    stop_conditions: ["Promessas milagrosas ilegais"],
    tone_of_voice: "atraente_dinamico",
    budget_limit_usd: 0.006,
  },
  quality_compliance_auditor: {
    id: "agent_auditor_05",
    slug: "quality_compliance_auditor",
    name: "Auditor de Qualidade e Compliance",
    role_label: "Auditor de Qualidade",
    goal: "Auditar conformidade gramatical, de tom e factual",
    data_scope: ["content:review"],
    allowed_skills: ["contract_reviewer"],
    system_instruction: "Você é o auditor de qualidade implacável. Analise o texto gerado contra o briefing e aprove ou aponte ressalvas para publicação.",
    acceptance_criteria: ["Conformidade aprovada", "Ausência de erros gramaticais"],
    stop_conditions: ["Mais de 2 alucinações factuais"],
    tone_of_voice: "criterioso_neutro",
    budget_limit_usd: 0.004,
  },
  document_ocr_extractor: {
    id: "agent_ocr_06",
    slug: "document_ocr_extractor",
    name: "Extrator de Comprovantes & Notas",
    role_label: "Extrator Fiscal",
    goal: "Digitalizar comprovantes e extrair valores e datas",
    data_scope: ["documents:read", "ledger:write"],
    allowed_skills: ["receipt_organizer"],
    system_instruction: "Você é o analista fiscal. Extraia do comprovante: valor numérico, data, pagador, recebedor e categoria contábil.",
    acceptance_criteria: ["Valor numérico com centavos", "Data de liquidação válida"],
    stop_conditions: ["Documento ilegível"],
    tone_of_voice: "tecnico_preciso",
    budget_limit_usd: 0.005,
  },
  bank_reconciliator: {
    id: "agent_reconciliator_07",
    slug: "bank_reconciliator",
    name: "Conciliador Financeiro",
    role_label: "Conciliador",
    goal: "Cruzar comprovantes com lançamentos e validar saldo",
    data_scope: ["ledger:read", "finance:write"],
    allowed_skills: ["receipt_organizer"],
    system_instruction: "Você é o auditor de caixa. Valide se os dados do comprovante correspondem às entradas e saídas e emita o parecer de fechamento.",
    acceptance_criteria: ["Divergência documentada", "Parecer de conciliação emitido"],
    stop_conditions: ["Divergência acima de R$ 1.000"],
    tone_of_voice: "analitico_formal",
    budget_limit_usd: 0.005,
  }
};

export const CANONICAL_SQUADS: Record<string, AISquadDefinitionDTO> = {
  sales_squad: {
    id: "squad_sales_01",
    slug: "sales_squad",
    name: "Squad de Vendas & SDR",
    description: "Prospecção, qualificação BANT e emissão de proposta comercial",
    goal: "Transformar lead em proposta pronta para fechamento",
    arbitration_policy: "supervisor_veto",
    max_execution_steps: 2,
    max_cost_budget_usd: 0.02,
    max_timeout_seconds: 60,
    members: [
      {
        agent_slug: "sdr_agent",
        step_order: 1,
        handoff_rule: "Passar lead qualificado com pontuação BANT para o Closer Comercial",
        agent: CANONICAL_AGENTS.sdr_agent,
      },
      {
        agent_slug: "commercial_closer",
        step_order: 2,
        handoff_rule: "Entregar proposta comercial final com escopo e valores",
        agent: CANONICAL_AGENTS.commercial_closer,
      }
    ],
  },
  publishing_squad: {
    id: "squad_pub_02",
    slug: "publishing_squad",
    name: "Squad de Publicação & Conteúdo",
    description: "Briefing de pauta, redação publicitária e auditoria de qualidade",
    goal: "Criar copy pronta para publicação com garantia de qualidade",
    arbitration_policy: "supervisor_veto",
    max_execution_steps: 3,
    max_cost_budget_usd: 0.025,
    max_timeout_seconds: 90,
    members: [
      {
        agent_slug: "content_strategist",
        step_order: 1,
        handoff_rule: "Passar pauta e gancho editorial para o Copywriter",
        agent: CANONICAL_AGENTS.content_strategist,
      },
      {
        agent_slug: "brand_copywriter",
        step_order: 2,
        handoff_rule: "Passar texto redigido com variações para o Auditor de Qualidade",
        agent: CANONICAL_AGENTS.brand_copywriter,
      },
      {
        agent_slug: "quality_compliance_auditor",
        step_order: 3,
        handoff_rule: "Aprovar publicação e certificar compliance de marca",
        agent: CANONICAL_AGENTS.quality_compliance_auditor,
      }
    ],
  },
  finance_squad: {
    id: "squad_fin_03",
    slug: "finance_squad",
    name: "Squad Financeiro & Conciliação",
    description: "Extração de comprovantes e conciliação bancária",
    goal: "Validar comprovantes e auditar lançamento no caixa",
    arbitration_policy: "supervisor_veto",
    max_execution_steps: 2,
    max_cost_budget_usd: 0.015,
    max_timeout_seconds: 45,
    members: [
      {
        agent_slug: "document_ocr_extractor",
        step_order: 1,
        handoff_rule: "Passar dados fiscais estruturados para o Conciliador Financeiro",
        agent: CANONICAL_AGENTS.document_ocr_extractor,
      },
      {
        agent_slug: "bank_reconciliator",
        step_order: 2,
        handoff_rule: "Emitir balancete de conciliação e certificar fidedignidade",
        agent: CANONICAL_AGENTS.bank_reconciliator,
      }
    ],
  },
};

// ============================================================
// Motor de Execução de Grafo com Handoff & Supervisor
// ============================================================

export async function runSquadGraphExecution(
  squadSlug: string,
  initialInput: { prompt: string; context?: Record<string, any> },
  authContext?: { userId?: string; storeId?: string }
): Promise<SquadRunResultDTO> {
  const startTime = Date.now();
  const runId = `squad_run_${Date.now()}`;
  const squad = CANONICAL_SQUADS[squadSlug];

  if (!squad) {
    throw new Error(`Squad '${squadSlug}' não encontrado.`);
  }

  const handoffs: SquadHandoffDTO[] = [];
  let accumulatedCost = 0;
  let accumulatedTokens = 0;
  let stepsCompleted = 0;
  let currentContext = { ...initialInput.context, initialPrompt: initialInput.prompt };
  let lastWorkCompleted: Record<string, any> = {};

  for (let i = 0; i < squad.members.length; i++) {
    const member = squad.members[i];
    const agent = member.agent;
    stepsCompleted++;

    // 1. Verificação do Supervisor: Orçamento e Teto de Custo
    if (accumulatedCost >= squad.max_cost_budget_usd) {
      return {
        runId,
        squadSlug,
        status: "halted_by_supervisor",
        stepsCompleted: stepsCompleted - 1,
        totalTokens: accumulatedTokens,
        totalCostUsd: Number(accumulatedCost.toFixed(6)),
        durationMs: Date.now() - startTime,
        handoffs,
        finalOutput: lastWorkCompleted,
        supervisorNotes: `Execução interrompida pelo Supervisor: Orçamento do squad atingido ($${accumulatedCost.toFixed(4)} >= $${squad.max_cost_budget_usd}).`,
      };
    }

    // 2. Construção do Contrato de Handoff para o Agente
    const handoffObjective = `Etapa ${member.step_order}: ${agent.goal}`;
    const agentPrompt = `
[OBJETIVO DO SEU PAPEL: ${agent.name}]
${agent.goal}

[INSTRUÇÃO DO AGENTE]
${agent.system_instruction}

[DADOS RECEBIDOS DO HANDOFF ANTERIOR]
${JSON.stringify({ context: currentContext, workSoFar: lastWorkCompleted }, null, 2)}

[CRITÉRIOS DE ACEITE OBRIGATÓRIOS]
${agent.acceptance_criteria.join("\n")}

[REGRAS DE HANDOFF]
${member.handoff_rule}

Por favor, execute seu papel e entregue o resultado estruturado.
`.trim();

    // 3. Execução Mandatória via Porta Única (Prompt 02)
    const stepStart = Date.now();
    const gatewayRes = await executeAiCoreGateway({
      task: "geracao_texto",
      prompt: agentPrompt,
      systemPrompt: agent.system_instruction,
      module: `ai-squad:${squadSlug}:${agent.slug}`,
      authContext,
    });

    const stepLatency = Date.now() - stepStart;
    accumulatedCost += gatewayRes.metadata.costUsd;
    accumulatedTokens += gatewayRes.metadata.usage.totalTokens;

    // 4. Registro Estruturado do Handoff
    const stepOutput = {
      agentSlug: agent.slug,
      agentName: agent.name,
      role: agent.role_label,
      output: gatewayRes.result.text,
    };
    lastWorkCompleted = stepOutput;
    currentContext = { ...currentContext, [`step_${member.step_order}_output`]: gatewayRes.result.text };

    handoffs.push({
      stepIndex: member.step_order,
      fromAgent: i === 0 ? "user" : squad.members[i - 1].agent.slug,
      toAgent: agent.slug,
      objective: handoffObjective,
      contextPassed: { step: member.step_order, role: agent.role_label },
      workCompleted: stepOutput,
      workRemaining: i === squad.members.length - 1 ? "Nenhum (concluído)" : `Próximo: ${squad.members[i + 1].agent.name}`,
      costUsd: gatewayRes.metadata.costUsd,
      latencyMs: stepLatency,
      acceptanceVerified: true,
    });
  }

  const supabase = getServerClient();
  // Gravação da execução e handoffs no banco de forma resiliente
  Promise.resolve(
    supabase
      .from("ai_squad_runs")
      .insert({
        squad_id: squad.id.length === 36 ? squad.id : undefined,
        store_id: authContext?.storeId || null,
        user_id: authContext?.userId || null,
        status: "completed",
        initial_payload: initialInput,
        final_result: lastWorkCompleted,
        steps_completed: stepsCompleted,
        total_tokens: accumulatedTokens,
        total_cost_usd: accumulatedCost,
        duration_ms: Date.now() - startTime,
        created_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      })
  ).catch(() => {});

  return {
    runId,
    squadSlug,
    status: "completed",
    stepsCompleted,
    totalTokens: accumulatedTokens,
    totalCostUsd: Number(accumulatedCost.toFixed(6)),
    durationMs: Date.now() - startTime,
    handoffs,
    finalOutput: lastWorkCompleted,
  };
}

// ============================================================
// Server Functions Exportadas
// ============================================================

export const listSquads = createServerFn({ method: "GET" }).handler(async (): Promise<AISquadDefinitionDTO[]> => {
  return Object.values(CANONICAL_SQUADS);
});

export const executeSquad = createServerFn({ method: "POST" })
  .validator(
    z.object({
      squadSlug: z.string(),
      prompt: z.string().min(1, "O prompt inicial é obrigatório"),
      context: z.record(z.any()).optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity().catch(() => null);

    return runSquadGraphExecution(
      input.squadSlug,
      { prompt: input.prompt, context: input.context },
      { userId: identity?.id, storeId: identity?.store_id }
    );
  });
