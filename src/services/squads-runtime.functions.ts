import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import {
  AgentRegistryDTO,
  SquadTemplateDTO,
  StoreSquadDTO,
  StoreSquadRunDTO,
} from "../types/squads-and-onboarding";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";

// ── DEFINIÇÃO CANÔNICA DE AGENTES E SQUADS (SSOT DA PLATAFORMA) ─────────────

export interface CanonicalAgentDefinition {
  id: string;
  name: string;
  category: "marketing" | "finance_tax" | "hr_people" | "strategy" | "general";
  ui_group: string;
  seniority: string;
  career_summary: string;
  curriculum: {
    academic_background: string[];
    certifications: string[];
    years_experience: number | null;
    specialties: string[];
  };
  deliverables: string[];
  default_model: string;
  system_prompt_template: string;
}

export const CANONICAL_AGENTS: CanonicalAgentDefinition[] = [
  {
    id: "ag-mkt-1",
    name: "Agente virtual — Estratégia de Marketing",
    category: "marketing",
    ui_group: "growth",
    seniority: "Agente virtual; senioridade não verificada",
    career_summary: "Agente de IA; não representa uma pessoa real. Qualificações não verificadas.",
    curriculum: { academic_background: [], certifications: [], years_experience: null, specialties: [] },
    deliverables: ["Propostas de estratégia de marketing"],
    default_model: "google/gemini-2.5-flash",
    system_prompt_template: "Você é um agente virtual de estratégia de marketing. Não afirme credenciais, experiência ou fatos não fornecidos.",
  },
  {
    id: "ag-mkt-2",
    name: "Agente virtual — Redação",
    category: "marketing",
    ui_group: "copywriting",
    seniority: "Agente virtual; senioridade não verificada",
    career_summary: "Agente de IA; não representa uma pessoa real. Qualificações não verificadas.",
    curriculum: { academic_background: [], certifications: [], years_experience: null, specialties: [] },
    deliverables: ["Propostas de textos e mensagens"],
    default_model: "google/gemini-2.5-flash",
    system_prompt_template: "Você é um agente virtual de redação. Não afirme credenciais, experiência ou fatos não fornecidos.",
  },
  {
    id: "ag-mkt-3",
    name: "Agente virtual — Design",
    category: "marketing",
    ui_group: "design",
    seniority: "Agente virtual; senioridade não verificada",
    career_summary: "Agente de IA; não representa uma pessoa real. Qualificações não verificadas.",
    curriculum: { academic_background: [], certifications: [], years_experience: null, specialties: [] },
    deliverables: ["Propostas de diretrizes visuais"],
    default_model: "google/gemini-2.5-flash",
    system_prompt_template: "Você é um agente virtual de design. Não afirme credenciais, experiência ou fatos não fornecidos.",
  },
  {
    id: "ag-mkt-4",
    name: "Agente virtual — Mídia",
    category: "marketing",
    ui_group: "media",
    seniority: "Agente virtual; senioridade não verificada",
    career_summary: "Agente de IA; não representa uma pessoa real. Qualificações não verificadas.",
    curriculum: { academic_background: [], certifications: [], years_experience: null, specialties: [] },
    deliverables: ["Propostas de mídia e campanhas"],
    default_model: "google/gemini-2.5-flash",
    system_prompt_template: "Você é um agente virtual de mídia. Não afirme credenciais, experiência ou fatos não fornecidos.",
  },
  {
    id: "ag-mkt-5",
    name: "Agente virtual — Análise de Marketing",
    category: "marketing",
    ui_group: "analytics",
    seniority: "Agente virtual; senioridade não verificada",
    career_summary: "Agente de IA; não representa uma pessoa real. Qualificações não verificadas.",
    curriculum: { academic_background: [], certifications: [], years_experience: null, specialties: [] },
    deliverables: ["Propostas de indicadores para acompanhamento"],
    default_model: "google/gemini-2.5-flash",
    system_prompt_template: "Você é um agente virtual de análise de marketing. Não afirme credenciais, experiência ou fatos não fornecidos.",
  },
  {
    id: "ag-acc-1",
    name: "Agente virtual — Contabilidade e Fiscal",
    category: "finance_tax",
    ui_group: "tax",
    seniority: "Agente virtual; senioridade não verificada",
    career_summary: "Agente de IA; não representa uma pessoa real. Qualificações não verificadas.",
    curriculum: { academic_background: [], certifications: [], years_experience: null, specialties: [] },
    deliverables: ["Propostas para análise fiscal humana"],
    default_model: "google/gemini-2.5-flash",
    system_prompt_template: "Você é um agente virtual de apoio fiscal. Não afirme credenciais, experiência, conformidade ou fatos não fornecidos.",
  },
  {
    id: "ag-hr-1",
    name: "Agente virtual — Pessoas e Cultura",
    category: "hr_people",
    ui_group: "people",
    seniority: "Agente virtual; senioridade não verificada",
    career_summary: "Agente de IA; não representa uma pessoa real. Qualificações não verificadas.",
    curriculum: { academic_background: [], certifications: [], years_experience: null, specialties: [] },
    deliverables: ["Propostas para revisão de processos de pessoas"],
    default_model: "google/gemini-2.5-flash",
    system_prompt_template: "Você é um agente virtual de apoio a pessoas e cultura. Não afirme credenciais, experiência ou fatos não fornecidos.",
  },
  {
    id: "ag-strat-1",
    name: "Agente virtual — Estratégia Executiva",
    category: "strategy",
    ui_group: "strategy",
    seniority: "Agente virtual; senioridade não verificada",
    career_summary: "Agente de IA; não representa uma pessoa real. Qualificações não verificadas.",
    curriculum: { academic_background: [], certifications: [], years_experience: null, specialties: [] },
    deliverables: ["Propostas para avaliação estratégica humana"],
    default_model: "google/gemini-2.5-flash",
    system_prompt_template: "Você é um agente virtual de apoio estratégico. Não afirme credenciais, experiência ou fatos não fornecidos.",
  },
];

export interface CanonicalSquadTemplateDefinition {
  slug: string;
  name: string;
  description: string;
  department: "marketing" | "accounting" | "human_resources" | "executive_strategy";
  icon_name: string;
  badge_label: string;
  agents: Array<{
    agent_id: string;
    task_order: number;
    role_label: string;
  }>;
}

type SquadRuntimeRunDTO = Omit<StoreSquadRunDTO, "store_squad_id" | "total_tokens_consumed" | "cost_estimate_cents"> & {
  store_squad_id: string | null;
  total_tokens_consumed?: number;
  cost_estimate_cents?: number;
};

export const CANONICAL_SQUAD_TEMPLATES: CanonicalSquadTemplateDefinition[] = [
  {
    slug: "marketing",
    name: "Squad de Marketing & Growth",
    description:
      "Planejamento e execução de campanhas, criativos, copywriting e aquisição contínua de clientes com alta conversão e presença digital.",
    department: "marketing",
    icon_name: "Megaphone",
    badge_label: "Marketing & Growth",
    agents: [
      { agent_id: "ag-mkt-1", task_order: 1, role_label: "Chief Marketing Strategist" },
      { agent_id: "ag-mkt-2", task_order: 2, role_label: "Copywriter de Conversão" },
      { agent_id: "ag-mkt-3", task_order: 3, role_label: "Designer de Criativos" },
      { agent_id: "ag-mkt-4", task_order: 4, role_label: "Gestor de Tráfego & Mídia" },
      { agent_id: "ag-mkt-5", task_order: 5, role_label: "Analista de Métricas & BI" },
    ],
  },
  {
    slug: "accounting",
    name: "Squad Contábil & Fiscal",
    description:
      "Conformidade tributária, conciliação financeira, margem de contribuição, parametrização do split payment e transição IBS/CBS.",
    department: "accounting",
    icon_name: "Tag",
    badge_label: "Fiscal & Compliance",
    agents: [
      { agent_id: "ag-acc-1", task_order: 1, role_label: "Auditor Fiscal Chefe" },
    ],
  },
  {
    slug: "human_resources",
    name: "Squad de Gente & Gestão",
    description:
      "Recrutamento especializado, onboarding de equipe, cultura organizacional e treinamento de excelência em atendimento ao cliente.",
    department: "human_resources",
    icon_name: "Users",
    badge_label: "Pessoas & Cultura",
    agents: [
      { agent_id: "ag-hr-1", task_order: 1, role_label: "Head de Gente & Gestão" },
    ],
  },
  {
    slug: "executive_strategy",
    name: "Squad de Estratégia Executiva & BI",
    description:
      "Análise econométrica, diagnóstico de alocação de capital, benchmarking competitivo e modelagem de negócios para expansão.",
    department: "executive_strategy",
    icon_name: "Briefcase",
    badge_label: "Estratégia & BI",
    agents: [
      { agent_id: "ag-strat-1", task_order: 1, role_label: "Estrategista Chefe & BI" },
    ],
  },
];

function parseJsonField<T>(value: any, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      let parsed = JSON.parse(value);
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      return (parsed || fallback) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export interface SquadWithDetails {
  id: string;
  store_id: string;
  squad_template_id: string;
  custom_name: string;
  status: "active" | "paused" | "configuring";
  operational_goal: string | null;
  cadence: string;
  approval_mode: "auto" | "human_in_the_loop";
  template: {
    slug: string;
    name: string;
    description: string;
    department: string;
    icon_name: string;
    badge_label: string;
  };
  agents: Array<{
    agent_id: string;
    name: string;
    role_label: string;
    seniority: string;
    career_summary: string;
    task_order: number;
    default_model: string;
    curriculum: {
      academic_background: string[];
      certifications: string[];
      years_experience: number | null;
      specialties: string[];
    };
    deliverables: string[];
  }>;
  latest_run?: {
    id: string;
    status: string;
    trigger_source: string;
    started_at: string;
    completed_at: string | null;
    output_artifacts: Record<string, any>;
  } | null;
}

/**
 * Garante que os templates canônicos e agentes existem no banco de dados Supabase.
 */
async function ensureCanonicalSquadsSeeded(supabase: any): Promise<any[]> {
  // 1. Verificar se templates existem
  const { data: existingTemplates } = await supabase
    .from("squad_templates")
    .select("*")
    .eq("is_active", true)
    .order("name");

  const validExisting = (existingTemplates || []).filter((et: any) => et && et.slug);
  const hasAllSlugs =
    validExisting.length >= 4 &&
    CANONICAL_SQUAD_TEMPLATES.every((ct) =>
      validExisting.some((et: any) => et.slug === ct.slug)
    );

  if (hasAllSlugs) {
    return validExisting;
  }

  // 2. Se não existirem ou estiver incompleto, cadastrar os agentes canônicos
  for (const ag of CANONICAL_AGENTS) {
    try {
      await supabase.from("agent_registry").upsert(
        {
          id: ag.id,
          name: ag.name,
          category: ag.category,
          ui_group: ag.ui_group,
          seniority: ag.seniority,
          career_summary: ag.career_summary,
          curriculum: ag.curriculum,
          deliverables: ag.deliverables,
          default_model: ag.default_model,
          token_budget: 4000,
          system_prompt_template: ag.system_prompt_template,
          is_active: true,
        },
        { onConflict: "id" }
      );
    } catch {
      // no-op em caso de restrição de ambiente
    }
  }

  // 3. Cadastrar os templates canônicos
  const seededTemplates: any[] = [];
  for (const tpl of CANONICAL_SQUAD_TEMPLATES) {
    let createdTpl: any = null;
    try {
      const { data } = await supabase
        .from("squad_templates")
        .upsert(
          {
            slug: tpl.slug,
            name: tpl.name,
            description: tpl.description,
            department: tpl.department,
            icon_name: tpl.icon_name,
            badge_label: tpl.badge_label,
            runtime_status: "ready",
            is_system: true,
            is_active: true,
          },
          { onConflict: "slug" }
        )
        .select()
        .maybeSingle();
      createdTpl = data;
    } catch {
      // no-op
    }

    const finalTpl = {
      id: createdTpl?.id || `tpl-${tpl.slug}`,
      slug: tpl.slug,
      name: tpl.name,
      description: tpl.description,
      department: tpl.department,
      icon_name: tpl.icon_name,
      badge_label: tpl.badge_label,
    };
    seededTemplates.push(finalTpl);

    // Vincular agentes do template se tiver ID persistido
    if (createdTpl?.id) {
      for (const a of tpl.agents) {
        try {
          await supabase.from("squad_template_agents").upsert(
            {
              squad_template_id: createdTpl.id,
              agent_id: a.agent_id,
              task_order: a.task_order,
              role_label: a.role_label,
              is_required: true,
            },
            { onConflict: "squad_template_id,agent_id" }
          );
        } catch {
          // no-op
        }
      }
    }
  }

  return seededTemplates.length >= 4 ? seededTemplates : CANONICAL_SQUAD_TEMPLATES.map((t) => ({
    id: `tpl-${t.slug}`,
    slug: t.slug,
    name: t.name,
    description: t.description,
    department: t.department,
    icon_name: t.icon_name,
    badge_label: t.badge_label,
  }));
}

// ── 1. LISTAR SQUADS DA LOJA (COM AUTO-INSTANCIAÇÃO RESILIENTE VIA POSTGREST) ───

export async function listStoreSquads(storeId: string): Promise<SquadWithDetails[]> {
  const supabase = getServerClient();

  // 1. Obter templates canônicos garantidos no banco
  let templates = await ensureCanonicalSquadsSeeded(supabase);
  if (!templates || templates.length === 0) {
    templates = CANONICAL_SQUAD_TEMPLATES.map((t) => ({
      id: `tpl-${t.slug}`,
      slug: t.slug,
      name: t.name,
      description: t.description,
      department: t.department,
      icon_name: t.icon_name,
      badge_label: t.badge_label,
    }));
  }

  // 2. Verificar se a loja já possui squads criados
  let { data: storeSquads } = await supabase
    .from("store_squads")
    .select("*")
    .eq("store_id", storeId);

  // Se a loja não tem squads criados ainda, instancia automaticamente os 4 squads
  if ((!storeSquads || storeSquads.length === 0) && templates && templates.length > 0) {
    const toInsert = templates.map((t: any) => ({
      store_id: storeId,
      squad_template_id: t.id,
      custom_name: t.name,
      status: "active",
      operational_goal: `Garantir excelência contínua nas rotinas de ${t.name} com supervisão humana.`,
      cadence: "daily",
      approval_mode: "human_in_the_loop",
      onboarding_answers: {},
      runtime_settings: {},
    }));

    const { data: inserted } = await supabase
      .from("store_squads")
      .insert(toInsert)
      .select();

    storeSquads = inserted || [];
  }

  if (!storeSquads || storeSquads.length === 0) {
    storeSquads = templates.map((t: any) => ({
      id: `ss_${storeId.slice(0, 8)}_${t.slug || t.id}`,
      store_id: storeId,
      squad_template_id: t.id || t.slug,
      custom_name: t.name,
      status: "active",
      operational_goal: `Garantir excelência contínua nas rotinas de ${t.name} com supervisão humana.`,
      cadence: "daily",
      approval_mode: "human_in_the_loop",
      onboarding_answers: {},
      runtime_settings: {},
    }));
  }

  // 3. Buscar agentes vinculados aos templates
  const templateIds = templates.map((t: any) => t.id);
  const { data: templateAgents } = await supabase
    .from("squad_template_agents")
    .select(`
      squad_template_id,
      agent_id,
      task_order,
      role_label,
      agent_registry (
        id,
        name,
        seniority,
        career_summary,
        curriculum,
        deliverables,
        default_model
      )
    `)
    .in("squad_template_id", templateIds)
    .order("task_order", { ascending: true });

  // 4. Buscar últimas corridas de cada squad da loja
  const storeSquadIds = storeSquads.map((s: any) => s.id);
  const { data: recentRuns } = await supabase
    .from("store_squad_runs")
    .select("*")
    .in("store_squad_id", storeSquadIds)
    .order("started_at", { ascending: false });

  // 5. Montar estrutura canônica completa com tipagem estrita
  const result: SquadWithDetails[] = [];

  for (const ss of storeSquads) {
    const template = templates.find((t: any) => t.id === ss.squad_template_id || t.slug === ss.squad_template_id) ||
      CANONICAL_SQUAD_TEMPLATES.find((c) => c.slug === ss.squad_template_id || c.name === ss.custom_name);
    if (!template) continue;

    const canonicalDef = CANONICAL_SQUAD_TEMPLATES.find(
      (c) => c.slug === template.slug || c.name === template.name
    ) || CANONICAL_SQUAD_TEMPLATES[0];

    // Agentes deste template
    const relevantAgents = (templateAgents || [])
      .filter((ta: any) => ta.squad_template_id === template.id || ta.squad_template_id === canonicalDef.slug)
      .sort((a: any, b: any) => (a.task_order || 0) - (b.task_order || 0));

    // Se o banco não tiver o join populado (ex: SQLite local ou delay de sync), busca no SSOT canônico
    let agentsList: SquadWithDetails["agents"] = [];
    if (relevantAgents.length > 0) {
      agentsList = relevantAgents.map((item: any) => {
        const reg = item.agent_registry || {};
        const fallbackDef = CANONICAL_AGENTS.find((ca) => ca.id === item.agent_id);

        return {
          agent_id: item.agent_id,
          name: reg.name || fallbackDef?.name || "Especialista Agêntico",
          role_label: item.role_label || fallbackDef?.seniority || "Especialista",
          seniority: reg.seniority || fallbackDef?.seniority || "Senior",
          career_summary: reg.career_summary || fallbackDef?.career_summary || "",
          task_order: item.task_order || 1,
          default_model: reg.default_model || fallbackDef?.default_model || "google/gemini-2.5-flash",
          curriculum: parseJsonField(reg.curriculum || fallbackDef?.curriculum, {
            academic_background: [],
            certifications: [],
            years_experience: null,
            specialties: [],
          }),
          deliverables: parseJsonField(reg.deliverables || fallbackDef?.deliverables, [
            "Parecer Técnico",
            "Diretriz de Ação",
          ]),
        };
      });
    }

    // Se a lista de agentes do banco for menor que o catálogo canônico (ex: marketing precisa de 5), completa da SSOT
    if (canonicalDef && agentsList.length < canonicalDef.agents.length) {
      for (const a of canonicalDef.agents) {
        if (!agentsList.some((ex) => ex.agent_id === a.agent_id)) {
          const ca = CANONICAL_AGENTS.find((c) => c.id === a.agent_id);
          if (ca) {
            agentsList.push({
              agent_id: ca.id,
              name: ca.name,
              role_label: a.role_label,
              seniority: ca.seniority,
              career_summary: ca.career_summary,
              task_order: a.task_order,
              default_model: ca.default_model,
              curriculum: ca.curriculum,
              deliverables: ca.deliverables,
            });
          }
        }
      }
    }

    // Última corrida do squad
    const latestRun = (recentRuns || []).find((r: any) => r.store_squad_id === ss.id);

    result.push({
      id: ss.id,
      store_id: ss.store_id,
      squad_template_id: ss.squad_template_id,
      custom_name: ss.custom_name,
      status: ss.status,
      operational_goal: ss.operational_goal,
      cadence: ss.cadence,
      approval_mode: ss.approval_mode,
      template: {
        slug: canonicalDef?.slug || template.slug || "general",
        name: canonicalDef?.name || template.name || "Squad Especializado",
        description: canonicalDef?.description || template.description || "",
        department: (canonicalDef?.department || template.department || "marketing") as any,
        icon_name: canonicalDef?.icon_name || template.icon_name || "Bot",
        badge_label: canonicalDef?.badge_label || template.badge_label || "Enterprise",
      },
      agents: agentsList.sort((a, b) => (a.task_order || 0) - (b.task_order || 0)),
      latest_run: latestRun
        ? {
            id: latestRun.id,
            status: latestRun.status,
            trigger_source: latestRun.trigger_source,
            started_at: latestRun.started_at,
            completed_at: latestRun.completed_at,
            output_artifacts: parseJsonField(latestRun.output_artifacts, {}),
          }
        : null,
    });
  }

  return result;
}

const SquadAiRecommendationsSchema = z.object({
  recommendations: z.array(z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    assigned_agent_id: z.string().trim().min(1).optional(),
  }).strict()).min(1),
}).strict();

type SquadAiRecommendations = z.infer<typeof SquadAiRecommendationsSchema>;

function hasOperationalEvidence(input: Record<string, any>): boolean {
  return [input.operational_data, input.store_data, input.evidence].some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && typeof value === "object" && Object.keys(value).length > 0;
  });
}

function verifiedUsage(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function notEvaluatedArtifacts(reason: string): Record<string, any> {
  return {
    assessment_status: "not_evaluated",
    acceptanceVerified: false,
    review_status: "not_evaluated",
    executive_summary: reason,
    pending_approval_items: [],
    kpis_monitored: [],
    compliance_status: "not_evaluated",
  };
}

function parseAiRecommendations(aiResult: any): SquadAiRecommendations {
  // executeUnifiedAiCall resolves only when a provider returned a response; it does not
  // expose a `success` property or usage metadata. Reject explicit gateway failures.
  if (!aiResult || aiResult.success === false || aiResult.gatewayRes?.success === false) {
    throw new Error(aiResult?.error?.message || "Gateway de IA não confirmou sucesso.");
  }

  const text = typeof aiResult.text === "string" ? aiResult.text : aiResult.content;
  let candidate = aiResult.parsedJson;
  if (candidate === undefined) {
    if (typeof text !== "string" || !text.trim()) throw new Error("Resposta vazia do gateway de IA.");
    try {
      candidate = JSON.parse(text);
    } catch {
      throw new Error("Resposta do gateway de IA não é JSON válido.");
    }
  }

  const parsed = SquadAiRecommendationsSchema.safeParse(candidate);
  if (!parsed.success) throw new Error("Resposta do gateway de IA não atende ao schema de recomendações.");
  return parsed.data;
}

// ── 2. DISPARAR EXECUÇÃO DO SQUAD COM SUPERVISÃO (HUMAN-IN-THE-LOOP) ────────

export async function triggerSquadRun(
  storeId: string,
  storeSquadId: string,
  options?: { triggerSource?: "manual" | "scheduler" | "onboarding"; inputPayload?: Record<string, any> }
): Promise<SquadRuntimeRunDTO> {
  const supabase = getServerClient();
  const input = options?.inputPayload || {};
  const source = options?.triggerSource || "manual";
  const isVirtualSquad = storeSquadId.startsWith("ss_");

  let squad: any;
  let template: any;
  let canonicalTemplate: CanonicalSquadTemplateDefinition | undefined;

  if (isVirtualSquad) {
    const [, virtualStorePrefix, slug = ""] = storeSquadId.split("_");
    if (virtualStorePrefix !== storeId.slice(0, 8)) {
      throw new Error("Squad virtual não pertence a esta loja.");
    }
    canonicalTemplate = CANONICAL_SQUAD_TEMPLATES.find((item) => item.slug === slug);
    if (!canonicalTemplate) throw new Error("Squad virtual inválido.");
    template = canonicalTemplate;
    squad = {
      id: storeSquadId,
      store_id: storeId,
      squad_template_id: canonicalTemplate.slug,
      custom_name: canonicalTemplate.name,
    };
  } else {
    const { data: dbSquad, error: squadError } = await supabase
      .from("store_squads")
      .select("*, squad_templates(*)")
      .eq("id", storeSquadId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (squadError || !dbSquad) throw new Error("Squad não encontrado para esta loja.");

    squad = dbSquad;
    template = Array.isArray(dbSquad.squad_templates) ? dbSquad.squad_templates[0] : dbSquad.squad_templates;
    canonicalTemplate = CANONICAL_SQUAD_TEMPLATES.find(
      (item) => item.slug === template?.slug || item.slug === dbSquad.squad_template_id
    );
  }

  const templateId = squad.squad_template_id || template?.id;
  let configuredAgents: Array<{ agent_id: string; name: string; role_label: string; category: string }> = [];

  if (isVirtualSquad && canonicalTemplate) {
    configuredAgents = canonicalTemplate.agents.flatMap((member) => {
      const definition = CANONICAL_AGENTS.find((agent) => agent.id === member.agent_id);
      return definition ? [{
        agent_id: definition.id,
        name: definition.name,
        role_label: member.role_label,
        category: definition.category,
      }] : [];
    });
  } else if (templateId) {
    const { data: agentRows, error: agentsError } = await supabase
      .from("squad_template_agents")
      .select("task_order, role_label, agent_id, agent_registry(id, name, category)")
      .eq("squad_template_id", templateId)
      .order("task_order", { ascending: true });

    if (!agentsError) {
      configuredAgents = (agentRows || []).map((row: any) => ({
        agent_id: row.agent_id,
        name: row.agent_registry?.name,
        role_label: row.role_label,
        category: row.agent_registry?.category,
      })).filter((agent: any) => agent.agent_id && agent.name && agent.category);
    }
  }

  const department = template?.department || canonicalTemplate?.department;
  const expectedCategory: Record<string, string> = {
    marketing: "marketing",
    accounting: "finance_tax",
    human_resources: "hr_people",
    executive_strategy: "strategy",
  };
  const eligibleAgents = configuredAgents.filter((agent) => agent.category === expectedCategory[department]);
  const leadAgent = eligibleAgents[0];

  let status: "needs_approval" | "failed" = "failed";
  let errorLog: string | null = null;
  let artifacts = notEvaluatedArtifacts(
    "Execução não avaliada: não foram fornecidos dados operacionais verificáveis. Nenhum relatório de estado da loja foi gerado."
  );

  if (!hasOperationalEvidence(input)) {
    errorLog = "Dados operacionais ausentes; execução não avaliada.";
  } else if (!leadAgent) {
    errorLog = "Nenhum agente configurado e compatível com o departamento deste squad.";
    artifacts = notEvaluatedArtifacts("Execução não avaliada: não há agente compatível configurado para este squad.");
  } else {
    try {
      const evidence = input.operational_data ?? input.store_data ?? input.evidence;
      const systemPrompt = `Você gera somente rascunhos de recomendações para revisão humana. Você NÃO auditou, consultou ou verificou o estado real da loja; use exclusivamente os dados de entrada fornecidos. Não declare fatos, métricas observadas, desempenho, KPIs com valores, compliance, credenciais ou resultados que não estejam explícitos nesses dados. Não invente números. Retorne exclusivamente JSON neste formato: {"recommendations":[{"title":"...","description":"...","assigned_agent_id":"ID de um agente fornecido"}]}. Cada agente deve ser escolhido somente da lista fornecida. Não inclua IDs de entregáveis, scores, confiança, status de aceitação ou metadados de uso.`;
      const userPrompt = JSON.stringify({
        goal: typeof input.goal === "string" ? input.goal : null,
        operational_data: evidence,
        squad: { name: squad.custom_name || template?.name, department },
        agents: eligibleAgents.map(({ agent_id, name, role_label }) => ({ agent_id, name, role_label })),
      });
      const aiResult = await executeUnifiedAiCall({
        systemPrompt,
        userPrompt,
        responseFormat: "json_object",
        temperature: 0.2,
        storeId,
      });
      const recommendations = parseAiRecommendations(aiResult);
      const pendingItems = recommendations.recommendations.map((recommendation) => {
        const assigned = eligibleAgents.find((agent) => agent.agent_id === (recommendation.assigned_agent_id || leadAgent.agent_id));
        if (!assigned) throw new Error("A IA atribuiu uma recomendação a agente não configurado neste departamento.");
        return {
          title: recommendation.title,
          description: recommendation.description,
          assigned_agent: assigned.name,
        };
      });

      artifacts = {
        assessment_status: "not_evaluated",
        acceptanceVerified: false,
        review_status: "needs_human_approval",
        executive_summary: "Rascunho de recomendações baseado exclusivamente nos dados fornecidos. O estado real da loja, os KPIs e a conformidade não foram verificados.",
        pending_approval_items: pendingItems,
        kpis_monitored: [],
        compliance_status: "not_evaluated",
      };
      status = "needs_approval";
    } catch (error) {
      errorLog = error instanceof Error ? error.message : "Falha ao validar a resposta de IA.";
      artifacts = notEvaluatedArtifacts("Execução não avaliada: a resposta de IA falhou ou não passou na validação. Nenhum relatório de estado foi gerado.");
    }
  }

  // Do not synthesize run IDs/timestamps. The run exists only after the database confirms it.
  const { data: runRow, error: runError } = await supabase
    .from("store_squad_runs")
    .insert({
      store_squad_id: isVirtualSquad ? null : storeSquadId,
      store_id: storeId,
      trigger_source: source,
      status,
      current_agent_id: leadAgent?.agent_id || null,
      input_payload: input,
      output_artifacts: artifacts,
      ...(errorLog ? { error_log: errorLog } : {}),
    })
    .select()
    .maybeSingle();

  if (runError || !runRow?.id || runRow.store_id !== storeId || runRow.status !== status) {
    throw new Error(`Falha ao persistir a execução do squad${runError?.message ? `: ${runError.message}` : "."}`);
  }

  const tokens = verifiedUsage(runRow.total_tokens_consumed);
  const cost = verifiedUsage(runRow.cost_estimate_cents);
  return {
    id: runRow.id,
    store_squad_id: runRow.store_squad_id ?? null,
    store_id: runRow.store_id,
    trigger_source: runRow.trigger_source,
    status: runRow.status,
    current_agent_id: runRow.current_agent_id ?? null,
    input_payload: parseJsonField(runRow.input_payload, {}),
    output_artifacts: parseJsonField(runRow.output_artifacts, {}),
    error_log: runRow.error_log ?? errorLog,
    ...(tokens !== undefined ? { total_tokens_consumed: tokens } : {}),
    ...(cost !== undefined ? { cost_estimate_cents: cost } : {}),
    ...(runRow.started_at ? { started_at: runRow.started_at } : {}),
    completed_at: runRow.completed_at ?? null,
  };
}

// ── 3. APROVAR ENTREGA DE SQUAD (HUMAN-IN-THE-LOOP EM 1 CLIQUE) ────────────

export async function approveSquadRun(
  storeId: string,
  runId: string
): Promise<SquadRuntimeRunDTO> {
  const supabase = getServerClient();
  const completedAt = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("store_squad_runs")
    .update({ status: "completed", completed_at: completedAt })
    .eq("id", runId)
    .eq("store_id", storeId)
    .eq("status", "needs_approval")
    .select()
    .maybeSingle();

  if (error || !updated?.id || updated.status !== "completed") {
    throw new Error(error?.message || "A aprovação não foi confirmada para esta loja.");
  }

  const tokens = verifiedUsage(updated.total_tokens_consumed);
  const cost = verifiedUsage(updated.cost_estimate_cents);
  return {
    id: updated.id,
    store_squad_id: updated.store_squad_id ?? null,
    store_id: updated.store_id,
    trigger_source: updated.trigger_source,
    status: updated.status,
    current_agent_id: updated.current_agent_id ?? null,
    input_payload: parseJsonField(updated.input_payload, {}),
    output_artifacts: parseJsonField(updated.output_artifacts, {}),
    error_log: updated.error_log ?? null,
    ...(tokens !== undefined ? { total_tokens_consumed: tokens } : {}),
    ...(cost !== undefined ? { cost_estimate_cents: cost } : {}),
    ...(updated.started_at ? { started_at: updated.started_at } : {}),
    completed_at: updated.completed_at ?? null,
  };
}

// ── ENDPOINTS BFF COM createServerFn (Zero-Bundle no Client) ─────────────────

export const listStoreSquadsFn = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.storeId !== identity.store_id && !(identity.role === "platform_admin")) {
      throw new Error("Acesso não autorizado para esta organização.");
    }
    return listStoreSquads(data.storeId);
  });

export const triggerSquadRunFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      squadId: z.union([z.string().uuid(), z.string().regex(/^ss_[A-Za-z0-9_-]+$/)]),
      options: z.record(z.any()).optional(),
    })
  )
  .handler(async ({ data }): Promise<any> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.storeId !== identity.store_id && !(identity.role === "platform_admin")) {
      throw new Error("Acesso não autorizado para esta organização.");
    }
    return triggerSquadRun(data.storeId, data.squadId, data.options);
  });

export const approveSquadRunFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      runId: z.string().uuid(),
    })
  )
  .handler(async ({ data }): Promise<any> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.storeId !== identity.store_id && !(identity.role === "platform_admin")) {
      throw new Error("Acesso não autorizado para esta organização.");
    }
    return approveSquadRun(data.storeId, data.runId);
  });

export const createCustomSquadFromArchitectFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      squadName: z.string().min(2),
      description: z.string(),
      pipeline: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          role_label: z.string(),
        })
      ),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.storeId !== identity.store_id && !(identity.role === "platform_admin")) {
      throw new Error("Acesso não autorizado para esta organização.");
    }

    const supabase = getServerClient();
    const slug = data.squadName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const { data: tpl, error: tplErr } = await supabase
      .from("squad_templates")
      .upsert(
        {
          slug,
          name: data.squadName,
          description: data.description,
          department: "executive_strategy",
          icon_name: "Bot",
          badge_label: "ARCHITECT",
          runtime_status: "ready",
          is_system: false,
          is_active: true,
        },
        { onConflict: "slug" }
      )
      .select()
      .single();

    if (tplErr || !tpl) {
      throw new Error(`Falha ao criar template de squad: ${tplErr?.message || "Erro desconhecido"}`);
    }

    const { data: squad, error: squadErr } = await supabase
      .from("store_squads")
      .insert({
        store_id: data.storeId,
        squad_template_id: tpl.id,
        custom_name: data.squadName,
        operational_goal: data.description,
        status: "active",
        cadence: "on_demand",
        approval_mode: "human_in_the_loop",
      })
      .select()
      .single();

    if (squadErr || !squad) {
      throw new Error(`Falha ao instanciar squad na loja: ${squadErr?.message || "Erro desconhecido"}`);
    }

    return { success: true, squad };
  });
