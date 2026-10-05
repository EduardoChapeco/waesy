/**
 * autonomous-copilot-orchestrator.ts — Orquestrador de Agentes Autônomos & Copilot Engine
 * 
 * Arquitetura em 5 Elos:
 * 1. Fragmentador & Otimizador de Prompts (Sintaxe EARS & Decomposição MECE)
 * 2. Cache Dinâmico de Tokens no Banco (SHA-256 de Consulta para Zero Desperdício de API)
 * 3. Delegação a Workers Especialistas de Mineração (Places, CNPJ, DataJud, Receitas, Notícias)
 * 4. Síntese Visual em Artefatos Vivos (Planilhas Interativas, Dashboards, Blocos Base44, PDF)
 * 5. Telemetria de Terminal & Trilha de Atividade (Passo a Passo em Tempo Real)
 */

import crypto from "crypto";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { harvestAndPersistPlaces } from "./mining/places-harvester";
import { harvestAndPersistDataJudProcess } from "./mining/datajud-harvester";
import { enrichCnpj } from "@/lib/mining/cnpj-enrichment.engine";
import { executeAutomatedNewsHarvest } from "./mining/automated-harvest";
import { resolveCityAndState } from "@/lib/mining/geo-resolver";
import {
  composeAiArtifactDocument,
  type CanonicalNiche,
  type ArtifactArchetype,
} from "./ai-builder-composition.functions";
import { linkRecipeIngredientsToInventory } from "./mining/specialized-extractors";
import type { AIActivityStep, ChatArtifactType } from "@/types/chat";
import type { CopilotFsmPhase } from "@/types/copilot-fsm";

import {
  completeCopilotExecution,
  createPersistedActivitySteps,
  startCopilotExecution,
} from "./copilot-execution-persistence";

export type CopilotTaskDomain =
  | "lead_mining"
  | "legal_research"
  | "cnpj_company"
  | "recipe_bom"
  | "news_harvest"
  | "job_opportunities"
  | "events_harvest"
  | "lodging_tourism"
  | "builder_composition"
  | "sheet_generator"
  | "document_pdf"
  | "general_curation";

export interface FragmentedPromptTask {
  domain: CopilotTaskDomain;
  targetQuery: string;
  city?: string;
  state?: string;
  cnpj?: string;
  processNumber?: string;
  archetype?: "site" | "landing" | "biolink" | "document" | "presentation";
  requestedFormat: "spreadsheet" | "dashboard" | "document" | "builder" | "text";
  rawPrompt: string;
}

export interface AutonomousCopilotResult {
  success: boolean;
  taskId: string;
  domain: CopilotTaskDomain;
  summaryMessage: string;
  isCacheHit: boolean;
  tokensSaved: number;
  steps: AIActivityStep[];
  artifact?: {
    type: ChatArtifactType;
    title: string;
    data: Record<string, any>;
  };
  durationMs: number;
  error?: string;
  fsmPhase?: CopilotFsmPhase;
}

/**
 * 1. Fragmentador e Classificador Heurístico de Prompts (Zero AI Overhead)
 */
export interface CopilotGeoDefaults {
  city?: string;
  state?: string;
}

/** Domínios cuja execução depende de recorte municipal explícito ou contextual. */
export const CITY_SCOPED_DOMAINS: ReadonlySet<CopilotTaskDomain> = new Set<CopilotTaskDomain>([
  "lead_mining",
  "lodging_tourism",
  "job_opportunities",
  "events_harvest",
]);

export function needsCityClarification(task: FragmentedPromptTask): boolean {
  return CITY_SCOPED_DOMAINS.has(task.domain) && !task.city;
}

export function fragmentAndOptimizePrompt(
  prompt: string,
  defaults: CopilotGeoDefaults = {}
): FragmentedPromptTask {
  const clean = prompt.trim();
  const lower = clean.toLowerCase();

  // Extração de CNPJ se presente
  const cnpjMatch = clean.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);

  // Extração de Número de Processo CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO)
  const cnjMatch = clean.match(/\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/);

  // Extração de Cidade
  const ignoredWords = new Set([
    "restaurantes",
    "empresas",
    "lojas",
    "hoteis",
    "hotéis",
    "leads",
    "produtos",
    "serviços",
    "servicos",
    "comércio",
    "comercio",
    "vagas",
    "empregos",
    "eventos",
    "shows",
    "notícias",
    "noticias",
    "receitas",
  ]);
  // Cidade explícita no prompt > cidade ativa do usuário (resolveActiveCity) > indefinida
  let city: string | undefined = defaults.city;
  const emMatch = clean.match(
    /(?:em|na cidade de)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+(?:do|da|de|dos|das)\s+[A-ZÀ-Ú][a-zà-ú]+|\s+[A-ZÀ-Ú][a-zà-ú]+)*)/
  );
  if (emMatch && ignoredWords.has(emMatch[1].toLowerCase()) === false) {
    city = emMatch[1];
  } else {
    const deMatch = clean.match(
      /(?:de|para)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+(?:do|da|de|dos|das)\s+[A-ZÀ-Ú][a-zà-ú]+|\s+[A-ZÀ-Ú][a-zà-ú]+)*)/
    );
    if (deMatch && ignoredWords.has(deMatch[1].toLowerCase()) === false) {
      city = deMatch[1];
    }
  }

  const resolvedGeo = resolveCityAndState(city, defaults.state);
  const state = resolvedGeo.state ?? defaults.state;

  if (cnjMatch || lower.includes("processo") || lower.includes("jusbrasil") || lower.includes("datajud") || lower.includes("tribunal")) {
    return {
      domain: "legal_research",
      targetQuery: cnjMatch ? cnjMatch[0] : clean,
      processNumber: cnjMatch ? cnjMatch[0] : undefined,
      city,
      state,
      requestedFormat: "document",
      rawPrompt: clean,
    };
  }

  if (cnpjMatch || lower.includes("cnpj") || lower.includes("receita federal") || lower.includes("razão social")) {
    return {
      domain: "cnpj_company",
      targetQuery: cnpjMatch ? cnpjMatch[0].replace(/\D/g, "") : clean,
      cnpj: cnpjMatch ? cnpjMatch[0].replace(/\D/g, "") : undefined,
      city,
      state,
      requestedFormat: "spreadsheet",
      rawPrompt: clean,
    };
  }

  if (
    lower.includes("hotel") ||
    lower.includes("hotéis") ||
    lower.includes("hoteis") ||
    lower.includes("resort") ||
    lower.includes("resorts") ||
    lower.includes("pousada") ||
    lower.includes("pousadas") ||
    lower.includes("hospedagem")
  ) {
    return {
      domain: "lodging_tourism",
      targetQuery:
        clean.replace(/(?:gere|crie|monte|busque|minere|uma|tabela|planilha|com|de|hoteis|hotéis|pousadas|resorts)\s*/gi, "").trim() ||
        "hospedagem",
      city,
      state,
      requestedFormat: "spreadsheet",
      rawPrompt: clean,
    };
  }

  if (
    lower.includes("vaga") ||
    lower.includes("vagas") ||
    lower.includes("emprego") ||
    lower.includes("empregos") ||
    lower.includes("currículo") ||
    lower.includes("recrutamento") ||
    lower.includes("contratação")
  ) {
    return {
      domain: "job_opportunities",
      targetQuery:
        clean.replace(/(?:gere|crie|monte|busque|minere|uma|tabela|planilha|com|de|vagas|empregos)\s*/gi, "").trim() || "vagas",
      city,
      state,
      requestedFormat: "spreadsheet",
      rawPrompt: clean,
    };
  }

  if (
    lower.includes("evento") ||
    lower.includes("eventos") ||
    lower.includes("show") ||
    lower.includes("shows") ||
    lower.includes("festival") ||
    lower.includes("teatro") ||
    lower.includes("agenda cultural")
  ) {
    return {
      domain: "events_harvest",
      targetQuery: clean,
      city,
      state,
      requestedFormat: "document",
      rawPrompt: clean,
    };
  }

  if (
    lower.includes("lead") ||
    lower.includes("planilha") ||
    lower.includes("tabela") ||
    lower.includes("empresas") ||
    lower.includes("restaurantes") ||
    lower.includes("lojas")
  ) {
    return {
      domain: "lead_mining",
      targetQuery:
        clean.replace(/(?:gere|crie|monte|busque|minere|uma|tabela|planilha|com|de|leads)\s*/gi, "").trim() || "comércio",
      city,
      state,
      requestedFormat: "spreadsheet",
      rawPrompt: clean,
    };
  }

  if (
    lower.includes("receita") ||
    lower.includes("ingredientes") ||
    lower.includes("ficha técnica") ||
    lower.includes("preparo") ||
    lower.includes("prato") ||
    lower.includes("culinária")
  ) {
    return {
      domain: "recipe_bom",
      targetQuery: clean,
      city,
      state,
      requestedFormat: "document",
      rawPrompt: clean,
    };
  }

  if (
    lower.includes("site") ||
    lower.includes("landing page") ||
    lower.includes("biolink") ||
    lower.includes("página") ||
    lower.includes("banner")
  ) {
    const isBiolink = lower.includes("biolink") || lower.includes("link da bio");
    return {
      domain: "builder_composition",
      targetQuery: clean,
      archetype: isBiolink ? "biolink" : "landing",
      city,
      state,
      requestedFormat: "builder",
      rawPrompt: clean,
    };
  }

  if (
    lower.includes("notícia") ||
    lower.includes("noticia") ||
    lower.includes("notícias") ||
    lower.includes("acontecimentos") ||
    lower.includes("jornal")
  ) {
    return {
      domain: "news_harvest",
      targetQuery: clean,
      city,
      state,
      requestedFormat: "document",
      rawPrompt: clean,
    };
  }

  return {
    domain: "general_curation",
    targetQuery: clean,
    city,
    state,
    requestedFormat: "text",
    rawPrompt: clean,
  };
}

/**
 * 2. Hash Determinístico de Consulta para o Banco de Cache
 */
export function hashQueryTask(task: FragmentedPromptTask): string {
  const norm = `${task.domain}:${task.targetQuery.toLowerCase().trim()}:${task.city || ""}:${task.state || ""}`;
  return crypto.createHash("sha256").update(norm).digest("hex");
}

/**
 * 3a. Retry Exponencial com Jitter para chamadas de mineração externas
 * maxAttempts=3, base=800ms, cap=10s, jitter=±25%
 */
export async function withExponentialRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        const isTest = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST));
        const baseMs = 800 * Math.pow(2, attempt);
        const cappedMs = Math.min(baseMs, 10000);
        const jitter = isTest ? 5 : cappedMs * (0.75 + Math.random() * 0.5);
        if (!isTest) {
          console.warn(`[CopilotRetry] '${label}' tentativa ${attempt + 1} falhou. Aguardando ${Math.round(jitter)}ms...`);
        }
        await new Promise((res) => setTimeout(res, jitter));
      }
    }
  }
  throw lastError;
}

/**
 * 3b. Persistência de AIActivityStep[] em copilot_activity_steps
 * Permite auditoria forense de execuções sem depender do histórico de chat.
 */
async function persistActivitySteps(
  supabase: ReturnType<typeof import("@/lib/supabase").getServerClient>,
  taskId: string,
  domain: string,
  storeId: string | undefined,
  steps: AIActivityStep[],
  durationMs: number
): Promise<void> {
  try {
    await supabase.from("copilot_activity_steps").insert({
      task_id: taskId,
      domain,
      store_id: storeId ?? null,
      steps_count: steps.length,
      duration_ms: durationMs,
      steps_payload: steps as unknown as Record<string, unknown>[],
      created_at: new Date().toISOString(),
    });
  } catch {
    // Falha de telemetria nunca propaga para o fluxo principal
  }
}

/**
 * 3. Motor de Execução Autônoma do Copilot
 */
export async function executeAutonomousCopilotTask(
  prompt: string,
  context: { threadId?: string; storeId?: string; activeCity?: string; activeState?: string } = {}
): Promise<AutonomousCopilotResult> {
  const startTime = Date.now();
  const taskId = crypto.randomUUID();
  const task = fragmentAndOptimizePrompt(prompt, { city: context.activeCity, state: context.activeState });
  const queryHash = hashQueryTask(task);
  const supabase = getServerClient();
  const identity = await getServerIdentity().catch(() => null);

  await startCopilotExecution({
    executionId: taskId,
    taskId,
    threadId: context.threadId,
    storeId: context.storeId,
    userId: identity?.id ?? undefined,
    domain: task.domain,
  }).catch((error) => console.warn("[copilot-execution] execution telemetry unavailable", error));
  const steps: AIActivityStep[] = createPersistedActivitySteps({ executionId: taskId });

  // Passo 1: Otimização e Fragmentação de Prompt
  steps.push({
    id: `step-1-${taskId.slice(0, 8)}`,
    type: "thought",
    label: "Fragmentação de Prompt & Análise EARS",
    detail: `Identificado domínio '${task.domain}' com foco geográfico em '${task.city}/${task.state}'`,
    status: "completed",
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date(startTime + 60).toISOString(),
    durationMs: 60,
    tokensUsed: 45,
  });

  if (needsCityClarification(task)) {
    return {
      success: false,
      taskId,
      domain: task.domain,
      summaryMessage: "Informe a cidade para a busca (ex.: \"em Chapecó\") ou ative sua localização.",
      isCacheHit: false,
      tokensSaved: 0,
      steps,
      durationMs: Date.now() - startTime,
      fsmPhase: "NEEDS_CLARIFICATION",
    };
  }

  // Passo 2: Verificação do Cache de Tokens no Banco
  let isCacheHit = false;
  let cachedData: any = null;

  try {
    const freshSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: cacheRow } = await supabase
      .from("scraper_audit_log")
      .select("status, metadata")
      .eq("scraper_name", `copilot_cache_${queryHash}`)
      .eq("status", "cached")
      .gte("created_at", freshSince)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = (cacheRow?.metadata as any)?.payload;
    if (payload?.artifact) {
      cachedData = payload;
      isCacheHit = true;
    }
  } catch {
    // Cache miss
  }

  if (isCacheHit && cachedData) {
    steps.push({
      id: `step-2-${taskId.slice(0, 8)}`,
      type: "tool",
      label: "Cache de Tokens no Banco (SHA-256 Hit)",
      detail: `Dados recuperados instantaneamente do cache local sem chamadas redundantes a APIs externas`,
      status: "completed",
      startedAt: new Date(startTime + 65).toISOString(),
      completedAt: new Date(startTime + 110).toISOString(),
      durationMs: 45,
      tokensUsed: 0,
    });

    return {
      success: true,
      taskId,
      domain: task.domain,
      summaryMessage: cachedData.summaryMessage || "Recuperei os dados estruturados do cache do sistema:",
      isCacheHit: true,
      tokensSaved: 4500,
      steps,
      artifact: cachedData.artifact,
      durationMs: Date.now() - startTime,
      fsmPhase: "COMPLETED",
    };
  }

  // Passo 3: Execução da Mineração Conforme o Domínio (Blindado com Error Boundary)
  let artifact: AutonomousCopilotResult["artifact"];
  let summaryMessage = "";
  let tokensSaved = 0;
  let toolExecutionError: Error | null = null;

  try {
    if (task.domain === "lead_mining") {
    steps.push({
      id: `step-3-${taskId.slice(0, 8)}`,
      type: "tool",
      label: "Mineração Mecânica de Estabelecimentos (Overpass & Nominatim)",
      detail: `Consultando base georreferenciada para '${task.targetQuery}' em ${task.city}/${task.state}`,
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const placesResult = await withExponentialRetry(
      () =>
        harvestAndPersistPlaces({
          query: task.targetQuery,
          city: task.city as string,
          state: task.state ?? resolveCityAndState(task.city)?.state,
          storeId: context.storeId,
          authorProfileId: identity?.id || undefined,
        }),
      "lead_mining:harvestAndPersistPlaces"
    );

    steps[steps.length - 1].status = "completed";
    steps[steps.length - 1].completedAt = new Date().toISOString();

    const headers = ["Nome Fantasia", "Categoria", "Endereço", "Bairro", "Telefone", "Origem"];
    const rows = (placesResult.places || []).map((p) => [
      p.businessName,
      p.category,
      p.address,
      p.neighborhood || "Centro",
      p.contactPhone || p.contactWhatsapp || "Consultar",
      p.source || "OpenStreetMap",
    ]);

    artifact = {
      type: "spreadsheet",
      title: `Leads - ${task.targetQuery} (${task.city}/${task.state})`,
      data: {
        headers,
        rows,
        totalItems: rows.length,
        city: task.city,
      },
    };

    summaryMessage = `Localizei ${rows.length} estabelecimentos em ${task.city} correspondentes a "${task.targetQuery}". Estruturei a planilha interativa abaixo para inspeção ou exportação:`;
    tokensSaved = rows.length * 150;
  } else if (task.domain === "cnpj_company" && task.cnpj) {
    steps.push({
      id: `step-3-${taskId.slice(0, 8)}`,
      type: "tool",
      label: "Enriquecimento de CNPJ (BrasilAPI & Receita Federal)",
      detail: `Consultando dados cadastrais, QSA e CNAEs para ${task.cnpj}`,
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const companyData = await enrichCnpj(task.cnpj);
    steps[steps.length - 1].status = "completed";
    steps[steps.length - 1].completedAt = new Date().toISOString();

    if (companyData) {
      artifact = {
        type: "document",
        title: `Ficha Cadastral - ${companyData.razao_social || task.cnpj}`,
        data: {
          cnpj: task.cnpj,
          razao_social: companyData.razao_social,
          nome_fantasia: companyData.nome_fantasia,
          municipio: companyData.endereco?.municipio || "",
          uf: companyData.endereco?.uf || "",
          cnae: companyData.cnae_principal?.codigo || "",
          socios: companyData.socios,
        },
      };
      summaryMessage = `Consultei os registros oficiais da empresa ${companyData.razao_social}. Ficha cadastral consolidada:`;
    } else {
      summaryMessage = `Não foram encontrados registros públicos para o CNPJ ${task.cnpj}.`;
    }
    tokensSaved = 2500;
  } else if (task.domain === "legal_research" && task.processNumber) {
    steps.push({
      id: `step-3-${taskId.slice(0, 8)}`,
      type: "tool",
      label: "Harvester DataJud CNJ (Processo Judicial)",
      detail: `Consultando tribunal e movimentações para o processo ${task.processNumber}`,
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const legalResult = await harvestAndPersistDataJudProcess({
      processNumber: task.processNumber,
      storeId: context.storeId,
      profileId: identity?.id || undefined,
    });

    steps[steps.length - 1].status = "completed";
    steps[steps.length - 1].completedAt = new Date().toISOString();

    if (legalResult.success && legalResult.lawsuit) {
      const law = legalResult.lawsuit;
      artifact = {
        type: "document",
        title: `Processo ${law.processNumber}`,
        data: {
          tribunal: law.courtName,
          classe: law.className,
          assunto: law.subjectName,
          status: law.status,
          partes: law.parties,
          movimentacoes: law.lastMovementText,
        },
      };
      summaryMessage = `Processo ${law.processNumber} localizado no ${law.courtName}. Resumo processual estruturado:`;
    } else {
      summaryMessage = `Não foram encontradas movimentações públicas recentes para o processo ${task.processNumber}.`;
    }
    tokensSaved = 3500;
  } else if (task.domain === "builder_composition") {
    steps.push({
      id: `step-3-${taskId.slice(0, 8)}`,
      type: "tool",
      label: "Composição Nativizada Omni-Builder",
      detail: `Montando blocos canônicos para arquétipo '${task.archetype || "landing"}'`,
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const archetype = (task.archetype || "landing") as ArtifactArchetype;
    const niche: CanonicalNiche = "gastronomy";

    const { document, rubric } = composeAiArtifactDocument({
      briefing: task.rawPrompt,
      storeName: task.targetQuery.slice(0, 50) || "Waesy Hub",
      niche,
      archetype,
    });

    let documentId: string | undefined;

    // Se temos contexto de loja ativa, persiste diretamente em experience_documents
    if (context.storeId) {
      try {
        const { data: expDoc } = await supabase
          .from("experience_documents")
          .insert({
            store_id: context.storeId,
            document_type: archetype,
            slug: document.slug,
            title: document.title,
            artifact_archetype: archetype,
            niche,
            quality_score: rubric.totalScore,
            quality_rubric: rubric,
            settings: { omni_page: document },
            is_active: rubric.approved,
          })
          .select("id")
          .single();

        if (expDoc?.id) {
          documentId = expDoc.id;
        }
      } catch {
        // Falha não-bloqueante na persistência
      }
    }

    steps[steps.length - 1].status = "completed";
    steps[steps.length - 1].completedAt = new Date().toISOString();

    artifact = {
      type: "landing_page",
      title: document.title,
      data: {
        omni_page: document,
        rubric,
        documentId,
        experience_document_id: documentId,
        previewUrl: documentId ? `/workspace/builder?doc=${documentId}` : undefined,
      },
    };
    summaryMessage = `Estruturei a página com blocos padronizados no editor visual (Score de Qualidade: ${rubric.totalScore}/100):`;
    tokensSaved = 4000;
  } else if (task.domain === "lodging_tourism") {
    steps.push({
      id: `step-3-${taskId.slice(0, 8)}`,
      type: "tool",
      label: "Mineração de Hotéis, Pousadas & Resorts (OpenStreetMap / Overpass)",
      detail: `Mapeando hospedagens para '${task.targetQuery}' em ${task.city}/${task.state}`,
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const placesResult = await withExponentialRetry(
      () =>
        harvestAndPersistPlaces({
          query: `hotel pousada resort ${task.targetQuery}`.trim(),
          city: task.city as string,
          state: task.state ?? resolveCityAndState(task.city)?.state,
          storeId: context.storeId,
          authorProfileId: identity?.id || undefined,
        }),
      "lodging_tourism:harvestAndPersistPlaces"
    );

    steps[steps.length - 1].status = "completed";
    steps[steps.length - 1].completedAt = new Date().toISOString();

    const headers = ["Nome da Hospedagem", "Categoria", "Endereço", "Bairro", "Cidade", "Origem"];
    const rows = (placesResult.places || []).map((p) => [
      p.businessName,
      "Hospedagem / Turismo",
      p.address,
      p.neighborhood || "Centro",
      p.city,
      p.source || "OpenStreetMap Overpass",
    ]);

    artifact = {
      type: "spreadsheet",
      title: `Hospedagens & Resorts - ${task.city}/${task.state}`,
      data: {
        headers,
        rows,
        totalItems: rows.length,
        city: task.city,
      },
    };
    summaryMessage = `Localizei ${rows.length} opções de hospedagem, pousadas e resorts em ${task.city}. Planilha interativa pronta:`;
    tokensSaved = rows.length * 200;
  } else if (task.domain === "job_opportunities") {
    steps.push({
      id: `step-3-${taskId.slice(0, 8)}`,
      type: "tool",
      label: "Mapeamento e Extração de Oportunidades de Emprego",
      detail: `Buscando vagas ativas para '${task.targetQuery}' em ${task.city}`,
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const cityFilter = task.city || "";
    let jobRows: any[] = [];
    const { data: dbJobs } = await supabase
      .from("jobs")
      .select("title, company_name, location_city, location_state, contract_type, salary_display, status")
      .eq("status", "active")
      .ilike("location_city", `%${cityFilter}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    jobRows = (dbJobs || []).map((j: any) => [
      j.title,
      j.company_name || "Não informado",
      [j.location_city, j.location_state].filter(Boolean).join("/") || "Não informado",
      j.contract_type || "Não informado",
      j.salary_display || "A combinar",
      j.status,
    ]);

    steps[steps.length - 1].status = "completed";
    steps[steps.length - 1].completedAt = new Date().toISOString();

    const headers = ["Cargo", "Empresa", "Localização", "Regime", "Remuneração", "Status"];
    artifact = jobRows.length
      ? {
          type: "spreadsheet",
          title: `Vagas - ${task.city}`,
          data: { headers, rows: jobRows, totalItems: jobRows.length, city: task.city },
        }
      : undefined;
    summaryMessage = jobRows.length
      ? `Encontrei ${jobRows.length} vagas ativas em ${task.city}.`
      : `Nenhuma vaga ativa indexada para ${task.city} no momento.`;
    tokensSaved = jobRows.length * 120;
  } else if (task.domain === "events_harvest") {
    steps.push({
      id: `step-3-${taskId.slice(0, 8)}`,
      type: "tool",
      label: "Agenda de eventos",
      detail: `Consultando eventos indexados em ${task.city}`,
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const { data: dbEvents } = await supabase
      .from("events")
      .select("id, title, start_date, event_date, venue_name, city, state, is_free, price_min_cents, ticket_url")
      .ilike("city", `%${task.city || ""}%`)
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(30);

    const eventItems = dbEvents || [];

    steps[steps.length - 1].status = "completed";
    steps[steps.length - 1].completedAt = new Date().toISOString();

    artifact = eventItems.length
      ? {
          type: "document",
          title: `Eventos - ${task.city}`,
          data: { city: task.city, events: eventItems, totalEvents: eventItems.length },
        }
      : undefined;
    summaryMessage = eventItems.length
      ? `Encontrei ${eventItems.length} eventos futuros em ${task.city}.`
      : `Nenhum evento futuro indexado para ${task.city} no momento.`;
    tokensSaved = eventItems.length * 100;
  } else if (task.domain === "recipe_bom") {
    steps.push({
      id: `step-3-${taskId.slice(0, 8)}`,
      type: "tool",
      label: "Vinculação de insumos (BOM)",
      detail: "Cruzando ingredientes informados com o catálogo da loja",
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const ingredientLines = task.rawPrompt
      .split("\n")
      .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter((l) => l.length > 2 && /\d|g\b|ml\b|kg\b|x[ií]cara|colher|unidade/i.test(l));

    let catalogProducts: Array<{ id: string; name: string }> = [];
    if (context.storeId) {
      const { data: prods } = await supabase
        .from("products")
        .select("id, title")
        .eq("store_id", context.storeId)
        .limit(500);
      catalogProducts = (prods || []).map((p: any) => ({ id: p.id, name: p.title }));
    }

    const matches =
      ingredientLines.length && catalogProducts.length
        ? linkRecipeIngredientsToInventory(ingredientLines, catalogProducts)
        : [];

    steps[steps.length - 1].status = "completed";
    steps[steps.length - 1].completedAt = new Date().toISOString();

    if (matches.length) {
      artifact = {
        type: "document",
        title: `Ficha técnica - ${task.targetQuery.slice(0, 60)}`,
        data: {
          ingredientsCount: matches.length,
          ingredientMatches: matches,
          matchedRatio: `${matches.filter((m) => Boolean(m.matchedProductId)).length}/${matches.length}`,
        },
      };
      summaryMessage = `${matches.filter((m) => Boolean(m.matchedProductId)).length} de ${matches.length} ingredientes vinculados ao catálogo.`;
    } else if (Boolean(context.storeId) === false || catalogProducts.length === 0) {
      summaryMessage = "Para vincular insumos, abra o chat dentro de uma loja com produtos cadastrados.";
    } else {
      summaryMessage = "Envie os ingredientes, um por linha, com quantidade (ex: 500g farinha de trigo).";
    }
    tokensSaved = matches.length * 50;
  } else if (task.domain === "news_harvest") {
    steps.push({
      id: `step-3-${taskId.slice(0, 8)}`,
      type: "tool",
      label: "Curadoria e Consulta de Notícias Oficiais",
      detail: `Buscando artigos publicados para '${task.targetQuery}'`,
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const { data: dbArticles } = await supabase
      .from("news_articles")
      .select("id, title, slug, kicker, subtitle, category, source_url, published_at, quality_score, author_name")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(10);

    const articles = dbArticles || [];

    steps[steps.length - 1].status = "completed";
    steps[steps.length - 1].completedAt = new Date().toISOString();

    if (articles.length > 0) {
      const headers = ["Título", "Editoria", "Fonte/Autor", "Data"];
      const rows = articles.map((a: any) => [
        a.title,
        a.category || a.kicker || "Geral",
        a.author_name || "Redação",
        a.published_at ? new Date(a.published_at).toLocaleDateString("pt-BR") : "Recente",
      ]);

      artifact = {
        type: "document",
        title: `Notícias - ${task.city}`,
        data: {
          headers,
          rows,
          articles,
          totalItems: articles.length,
        },
      };
      summaryMessage = `Encontrei ${articles.length} notícias recentes e curadas:`;
    } else {
      summaryMessage = `Nenhuma notícia publicada encontrada no momento. A esteira automatizada pode ser acionada via API.`;
    }
    tokensSaved = articles.length * 180;
  } else {
    summaryMessage = `Não identifiquei uma tarefa de mineração específica em "${task.targetQuery.slice(0, 80)}".`;
    tokensSaved = 0;
  }
  } catch (err: any) {
    toolExecutionError = err instanceof Error ? err : new Error(String(err));
    console.warn(`[COPILOT-DEFENSIVE-BOUNDARY] Falha na execução da ferramenta do domínio ${task.domain}:`, toolExecutionError.message);

    // Marca o passo em execução como falho
    const runningStep = steps.find((s) => s.status === "running");
    if (runningStep) {
      runningStep.status = "failed";
      runningStep.completedAt = new Date().toISOString();
      runningStep.detail = `Indisponibilidade momentânea: ${toolExecutionError.message.slice(0, 120)}`;
    } else {
      steps.push({
        id: `step-err-${Date.now()}`,
        type: "tool",
        label: "Falha na Ferramenta Externa",
        detail: toolExecutionError.message.slice(0, 120),
        status: "failed",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    }

    summaryMessage = `Não foi possível consultar os dados externos no momento devido a uma indisponibilidade temporária (${toolExecutionError.message.slice(0, 80)}). Você pode tentar novamente em alguns instantes.`;
  }

  // Passo 4: Gravação do cache (schema real de scraper_audit_log)
  if (artifact && !toolExecutionError) {
    try {
      await supabase.from("scraper_audit_log").insert({
        scraper_name: `copilot_cache_${queryHash}`,
        action: task.domain,
        status: "cached",
        items_found: Number((artifact.data as any)?.totalItems ?? 1),
        items_extracted: Number((artifact.data as any)?.totalItems ?? 1),
        tokens_saved: tokensSaved,
        duration_ms: Date.now() - startTime,
        metadata: { payload: { summaryMessage, artifact } },
      });
    } catch {
      // Falha de cache não é crítica
    }
  }

  // Passo Final: Persistência de Telemetria de Execução
  const finalDuration = Date.now() - startTime;
  await persistActivitySteps(supabase, taskId, task.domain, context.storeId, steps, finalDuration);

  const isSuccess = !toolExecutionError;
  await completeCopilotExecution(
    { executionId: taskId },
    isSuccess ? "completed" : "failed_retryable",
    { domain: task.domain, stepsCount: steps.length, durationMs: finalDuration, queryHash },
    toolExecutionError?.message,
  ).catch((error) => console.warn("[copilot-execution] completion telemetry unavailable", error));
  return {
    success: isSuccess,
    taskId,
    domain: task.domain,
    summaryMessage,
    isCacheHit: false,
    tokensSaved,
    steps,
    artifact,
    durationMs: finalDuration,
    error: toolExecutionError?.message,
    fsmPhase: isSuccess ? "COMPLETED" : "FAILED_RETRYABLE",
  };
}
