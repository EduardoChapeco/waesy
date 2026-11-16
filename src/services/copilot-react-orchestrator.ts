import { randomUUID } from "node:crypto";
import type {
  AIActivityStep,
  ChatArtifactData,
  ChatArtifactType,
  ChatSourceItem,
  ExecutionPlanStep,
} from "@/types/chat";
import type { AiSseEvent } from "@/lib/ai/sse";
import { normalizeArtifactType } from "@/lib/ai/artifact-contract";
import { INTERNAL_ROUTE_MARKDOWN_REGEX, normalizeInternalRoute, validateInternalRoute } from "@/lib/ai/route-validator";
import { inspectPromptSecurity } from "@/lib/ai/prompt-shield";
import {
  renderExecutionPlanMarkdown,
  vfsWriteFile,
  type WorkspaceVfsMap,
} from "@/lib/ai/workspace-vfs";
import type { BrowserInteractiveStep } from "@/lib/ai/steel-cdp-client";
import { extractCreativePostSpecFromPrompt } from "@/lib/builder/canva-post-templates";
import { getAllMcpTools } from "@/registries/mcp-tool-registry";
import { executeAiCoreGateway, executeAiCoreGatewayStream } from "./ai-core-gateway.functions";
import { runReactLoop } from "./ai-react-loop";
import { executeMcpToolCall } from "./mcp-server.functions";
import { listActiveExternalMcpToolsForUser, invokeExternalMcpToolForUser } from "./mcp-connectors.functions";
import { executeBrowserAutomationTask } from "./browser-automation-runner";
import {
  assembleHierarchicalCopilotContext,
  compactThreadContextIfNeeded,
  saveCopilotArtifactRecord,
} from "./copilot-memory.functions";
import { getEffectiveSkillPolicyForUser } from "./copilot-skill-policy";
import { createOrUpdateBuilderDocument, type BuilderDocType } from "./builder-copilot-bridge";
import {
  completeCopilotExecution,
  loadCopilotExecutionForContinue,
  persistCopilotExecutionStep,
  saveCopilotExecutionCheckpoint,
  startCopilotExecution,
} from "./copilot-execution-persistence";
import type { AiCopilotContext, AiExecutionResult, AiToolExecutionRecord } from "@/lib/ai/copilot-types";

export interface CopilotExternalMcpToolDescriptor {
  compositeToolName: string;
  serverName?: string;
  toolName: string;
  description: string;
  inputSchema?: Record<string, any>;
}

export function buildRankedToolCatalogPrompt(
  builtinTools: Array<{ name: string; module: string; description: string }>,
  externalTools: CopilotExternalMcpToolDescriptor[],
  userPrompt: string,
  activeSlugs: string[],
): string {
  const tokens = userPrompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9_]+/)
    .filter((w) => w.length >= 3);

  const scoreTool = (name: string, moduleName: string, desc: string): number => {
    const hay = `${name} ${moduleName} ${desc}`.toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (hay.includes(tok)) score += 3;
    }
    for (const slug of activeSlugs) {
      if (hay.includes(slug.toLowerCase().replace(/_/g, " "))) score += 1;
    }
    if (/simlab|mining|harvester|connector_|catalog|order|crm|finance/.test(name)) {
      score += 1;
    }
    return score;
  };

  const rankedBuiltin = [...builtinTools].sort(
    (a, b) => scoreTool(b.name, b.module, b.description) - scoreTool(a.name, a.module, a.description),
  );

  const lines: string[] = [];
  for (const ext of externalTools) {
    lines.push(
      `- ${ext.compositeToolName} (mcp_externo:${ext.serverName || "custom"}): ${ext.description.slice(0, 120)}`,
    );
  }

  rankedBuiltin.forEach((t, idx) => {
    const maxDesc = idx < 24 ? 115 : 58;
    lines.push(`- ${t.name} (${t.module}): ${String(t.description || "").slice(0, maxDesc)}`);
  });

  return lines.join("\n");
}

export interface CopilotReactOrchestratorInput {
  userPrompt: string;
  workingMemory?: Record<string, any>;
  context?: AiCopilotContext;
  resolvedAttachments?: {
    images: Array<{ mimeType: string; base64: string }>;
    textBlocks: string[];
    notes: string[];
  };
  recentMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  externalMcpTools?: CopilotExternalMcpToolDescriptor[];
  precomputedStage1?: {
    intent?: string;
    gatewayResponse?: Record<string, any> | null;
    platformSearch?: { query?: string; cards?: Array<Record<string, any>> } | null;
    singleCallMode?: boolean;
  };
  onEvent?: (event: AiSseEvent) => Promise<void> | void;
}

export interface CopilotSubagentDispatchItem {
  id: string;
  role: string;
  goal: string;
  toolName?: string;
  toolArgs?: Record<string, any>;
  url?: string;
}

type CopilotPlannerAction =
  | {
      type: "mcp_tool";
      thought: string;
      toolName: string;
      toolArgs: Record<string, any>;
      label?: string;
      plan?: ExecutionPlanStep[];
    }
  | {
      type: "browser_task";
      thought: string;
      url: string;
      goal: string;
      label?: string;
      interactiveSteps?: BrowserInteractiveStep[];
      keepSessionAlive?: boolean;
      plan?: ExecutionPlanStep[];
    }
  | {
      type: "spawn_subagents";
      thought: string;
      label?: string;
      tasks: CopilotSubagentDispatchItem[];
      plan?: ExecutionPlanStep[];
    }
  | {
      type: "build_asset";
      thought: string;
      artifactType: ChatArtifactType;
      title: string;
      brief: string;
      label?: string;
      plan?: ExecutionPlanStep[];
    }
  | {
      type: "finish";
      thought: string;
      draftAnswer?: string;
      plan?: ExecutionPlanStep[];
    };

interface ReactExecutionState {
  plan: ExecutionPlanStep[];
  vfsFiles: WorkspaceVfsMap;
  observations: string[];
  toolRecords: AiToolExecutionRecord[];
  sources: ChatSourceItem[];
  artifact?: ChatArtifactData;
  structuredWidgets: Array<{ widgetType: string; payload: Record<string, any> }>;
  structuredBlocks: Array<Record<string, any>>;
  executedActions: string[];
  totalTokens: number;
  subrequestsUsed: number;
  resumeCount: number;
  activeBrowserSession?: {
    sessionId: string;
    url: string;
    liveViewerUrl?: string;
  };
  liveBrowserFrame?: AiExecutionResult["liveBrowserFrame"];
  needsCheckpointContinue?: boolean;
  checkpointReason?: string;
  finishedReason?: string;
}

const DEFAULT_HTML_SHELL = (title: string, bodyHtml: string, accentLabel: string) => `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 antialiased min-h-screen font-sans">
  <header class="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
    <span class="font-semibold tracking-tight text-sm">${title.replace(/</g, "&lt;")}</span>
    <span class="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-200">${accentLabel.replace(/</g, "&lt;")}</span>
  </header>
  <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
    ${bodyHtml}
  </main>
</body>
</html>`;

function sanitizeInternalRoutesInText(text: string): string {
  if (!text) return text;
  const rx = new RegExp(INTERNAL_ROUTE_MARKDOWN_REGEX.source, "g");
  return text.replace(rx, (full, prefix, routePath) => {
    const normalized = validateInternalRoute(routePath) || normalizeInternalRoute(routePath);
    if (!normalized) return full;
    return `${prefix}${normalized}`;
  });
}

function inferQuickToolAssetType(quickToolMode?: string): ChatArtifactType | null {
  switch (quickToolMode) {
    case "website_builder":
      return "website";
    case "creative_post":
      return "creative_post";
    case "document":
      return "document";
    case "interactive_map":
      return "map_view";
    default:
      return null;
  }
}

function extractFirstPublicUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"')]+/i);
  return match ? match[0] : null;
}

function deriveHeuristicFallbackAction(
  userPrompt: string,
  context: AiCopilotContext,
  executedActions: string[],
  allowedToolNames: Set<string>,
): CopilotPlannerAction {
  const lower = userPrompt.toLowerCase();
  const quickAsset = inferQuickToolAssetType(context.quickToolMode);

  if (executedActions.length > 0) {
    return { type: "finish", thought: "Ação inicial executada; consolidando resposta." };
  }

  const targetUrl = extractFirstPublicUrl(userPrompt);
  if (
    targetUrl &&
    /\b(acess|abre|abrir|naveg|extrai|rasp|analis|captur|print|site\s+https?)/i.test(lower) &&
    allowedToolNames.has("browser_navigate_url") &&
    !executedActions.includes("browser_task")
  ) {
    return {
      type: "browser_task",
      thought: "Usuário pediu leitura/automação de URL pública.",
      url: targetUrl,
      goal: userPrompt,
      label: "Navegação Autônoma em Tempo Real",
    };
  }

  if (
    quickAsset === "website" ||
    /\b(criar?\s+(?:um\s+|uma\s+)?(?:site|landing\s*page|web\s*app|página\s+web|hote?page|portf[oó]lio)|montar\s+site|gerar\s+site)\b/i.test(
      lower,
    )
  ) {
    return {
      type: "build_asset",
      thought: "Solicitação explícita de criação de site ou aplicação web.",
      artifactType: /\bapp|sistema|dashboard interativo\b/i.test(lower) ? "web_app" : "website",
      title: userPrompt.slice(0, 72),
      brief: userPrompt,
      label: "Compilando Site & Sandbox HTML",
    };
  }

  if (/\b(carrossel|carousel)\b/i.test(lower)) {
    return {
      type: "build_asset",
      thought: "Solicitação explícita de carrossel social.",
      artifactType: "carousel",
      title: userPrompt.slice(0, 72),
      brief: userPrompt,
      label: "Criando Carrossel no Estúdio",
    };
  }

  if (
    quickAsset === "creative_post" ||
    /\b(criar?|gerar|fazer)\s+(?:um\s+|uma\s+)?(post|arte|story|stories|banner|criativo|flyer)\b/i.test(lower)
  ) {
    return {
      type: "build_asset",
      thought: "Solicitação explícita de arte/post social.",
      artifactType: "creative_post",
      title: userPrompt.slice(0, 72),
      brief: userPrompt,
      label: "Gerando Arte no Estúdio Canva",
    };
  }

  if (/\b(gerar|criar|desenhar|ilustrar|renderizar)\s+(?:uma?\s+)?(imagem|foto|ilustra[çc][aã]o|logo|capa)\b/i.test(lower)) {
    return {
      type: "build_asset",
      thought: "Solicitação explícita de geração de imagem por IA.",
      artifactType: "image",
      title: userPrompt.slice(0, 72),
      brief: userPrompt,
      label: "Gerando Imagem IA",
    };
  }

  if (/\b(apresenta[çc][aã]o|slides?|pitch\s*deck|deck)\b/i.test(lower)) {
    return {
      type: "build_asset",
      thought: "Solicitação explícita de apresentação de slides.",
      artifactType: "presentation",
      title: userPrompt.slice(0, 72),
      brief: userPrompt,
      label: "Estruturando Apresentação Executiva",
    };
  }

  if (/\b(c[óo]digo\s+(?:python|js|javascript)|script\s+(?:python|js|javascript)|executar\s+python|rodar\s+python|em\s+python)\b/i.test(lower)) {
    return {
      type: "build_asset",
      thought: "Solicitação explícita de código/script executável em sandbox.",
      artifactType: "code",
      title: userPrompt.slice(0, 72),
      brief: userPrompt,
      label: "Gerando Script & Sandbox",
    };
  }

  if (/\b(planilha|spreadsheet|or[çc]amento\s+em\s+tabela|fluxo\s+de\s+caixa|f[oó]rmula)\b/i.test(lower)) {
    return {
      type: "build_asset",
      thought: "Solicitação explícita de planilha estruturada.",
      artifactType: "spreadsheet",
      title: userPrompt.slice(0, 72),
      brief: userPrompt,
      label: "Montando Planilha com Fórmulas",
    };
  }

  if (
    quickAsset === "document" ||
    /\b(contrato|proposta\s+comercial|plano\s+de\s+neg[oó]cios|relat[oó]rio\s+executivo|dossi[eê]|documento\s+pdf|roteiro\s+de\s+viagem)\b/i.test(
      lower,
    )
  ) {
    const docType: ChatArtifactType = /\bcontrato|proposta\b/i.test(lower)
      ? "proposal"
      : /\bplano\s+de\s+neg[oó]cios\b/i.test(lower)
        ? "business_plan"
        : /\broteiro|viagem\b/i.test(lower)
          ? "travel_itinerary"
          : "document";
    return {
      type: "build_asset",
      thought: "Solicitação explícita de documento estruturado.",
      artifactType: docType,
      title: userPrompt.slice(0, 72),
      brief: userPrompt,
      label: "Redigindo Documento Estruturado",
    };
  }

  if (/\bsimlab|personas?\s+sint[eé]ticas|teste\s+de\s+campanha|simulac[aã]o\b/i.test(lower) && allowedToolNames.has("simlab_run_batch_simulation") && context.storeId) {
    return {
      type: "mcp_tool",
      thought: "Usuário solicitou validação de mercado SimLabs 4.0.",
      toolName: "simlab_run_batch_simulation",
      toolArgs: {
        storeId: context.storeId,
        title: userPrompt.slice(0, 80),
        objective: userPrompt,
        municipalityFilter: context.city || "Nacional",
        sampleSize: 8,
      },
      label: "Executando SimLabs 4.0",
    };
  }

  if (/\b(produto|comprar|pre[çc]o|estoque|cat[aá]logo|loja|lojas|empresa)\b/i.test(lower) && allowedToolNames.has("search_catalog_products")) {
    return {
      type: "mcp_tool",
      thought: "Buscando catálogo real no banco.",
      toolName: "search_catalog_products",
      toolArgs: {
        query: userPrompt.replace(/[^\w\sÀ-ÿ]/g, " ").trim().slice(0, 60) || "destaque",
        limit: 8,
      },
      label: "Consultando Catálogo Waesy",
    };
  }

  return { type: "finish", thought: "Resposta direta sem chamada de ferramenta." };
}

function buildSpreadsheetWithFormulas(title: string, prompt: string): Record<string, any> {
  const lower = prompt.toLowerCase();
  if (/caixa|financeir|receita|despesa|vendas|lucro/.test(lower)) {
    return {
      title,
      columns: ["Item", "Categoria", "Quantidade", "Valor Unit. (R$)", "Subtotal (R$)"],
      rows: [
        ["Linha editável 1", "Operacional", 1, 0, "=C1*D1"],
        ["Linha editável 2", "Receita", 1, 0, "=C2*D2"],
        ["Total Consolidado", "Resumo", "", "", "=SUM(E1:E2)"],
      ],
      summary: { totalFormula: "=SUM(E1:E2)", editable: true },
    };
  }
  return {
    title,
    columns: ["Tópico / Etapa", "Responsável", "Horas / Qtd", "Custo Base (R$)", "Total"],
    rows: [
      ["Planejamento inicial", "Equipe", 1, 0, "=C1*D1"],
      ["Execução principal", "Equipe", 1, 0, "=C2*D2"],
      ["Total", "", "", "", "=SUM(E1:E2)"],
    ],
    summary: { totalFormula: "=SUM(E1:E2)", editable: true },
  };
}

async function generateStructuredAsset(params: {
  artifactType: ChatArtifactType;
  title: string;
  brief: string;
  userPrompt: string;
  hierarchicalMemory: string;
  context: AiCopilotContext;
  workingMemory: Record<string, any>;
  skipLlmRefinement?: boolean;
}): Promise<{
  artifact: ChatArtifactData;
  observation: string;
  tokensUsed: number;
  structuredBlock?: Record<string, any>;
}> {
  const canonicalType = normalizeArtifactType(params.artifactType, "document");
  let tokensUsed = 0;

  if (canonicalType === "image") {
    const imgRes = await executeAiCoreGateway({
      task: "imagem",
      prompt: params.brief || params.userPrompt,
      context: { storeId: params.context.storeId, userId: params.context.userId },
      authContext: {
        userId: params.context.userId,
        storeId: params.context.storeId,
      },
      signal: params.context.signal,
    });
    tokensUsed += imgRes.metadata?.usage?.totalTokens || 0;
    const media = imgRes.result?.media;
    const url =
      media?.url ||
      (media?.base64
        ? `data:${media.mimeType || "image/png"};base64,${media.base64}`
        : undefined);
    if (!imgRes.success || !url) {
      throw new Error(imgRes.error?.message || "Nenhum provedor ativo gerou a imagem solicitada.");
    }
    const payload = {
      imageUrl: url,
      promptUsed: params.brief,
      provider: imgRes.metadata?.provider,
      model: imgRes.metadata?.model,
      mimeType: media?.mimeType || "image/png",
    };
    if (params.context.threadId && params.context.userId) {
      await saveCopilotArtifactRecord({
        sessionId: params.context.threadId,
        artifactType: "image",
        title: params.title,
        payload,
      }).catch(() => null);
    }
    return {
      artifact: {
        id: randomUUID(),
        type: "image",
        title: params.title,
        version: 1,
        totalVersions: 1,
        data: payload,
      },
      observation: `Imagem gerada e persistida com sucesso via ${imgRes.metadata?.provider}/${imgRes.metadata?.model}.`,
      tokensUsed,
    };
  }

  if (canonicalType === "code") {
    const wantsPython = /\b(python|pyodide|\.py|numpy|pandas|estat[ií]stica|regress[aã]o|script)\b/i.test(
      `${params.brief} ${params.userPrompt}`,
    );
    const language = wantsPython ? "python" : "javascript";
    const defaultFilename = language === "python" ? "main.py" : "script.js";
    let scriptCode =
      language === "python"
        ? `# ${params.title}\nimport json, statistics\n\nprint("Ambiente Python Waesy Sandbox pronto.")\n`
        : `// ${params.title}\nconsole.log("Ambiente JavaScript Waesy Sandbox pronto.");\n`;
    let codeTitle = params.title;

    if (!params.skipLlmRefinement) {
      try {
        const scriptAi = await executeAiCoreGateway({
          task: "codigo",
          mode: "sync",
          module: "copilot_code_sandbox_builder",
          systemPrompt: `Você é engenheiro de software sênior. Gere um script ${language === "python" ? "Python 3 padrão (usando apenas stdlib: math, json, csv, statistics, datetime, re)" : "JavaScript ES2022 autônomo"} funcional e completo para rodar direto em sandbox isolado no navegador (imprima resultados com print/console.log). Retorne JSON estrito: {"title":"...","filename":"${defaultFilename}","code":"...","summary":"..."}.`,
          prompt: `Contexto/Memória:\n${params.hierarchicalMemory}\n\nObjetivo:\n${params.brief}`,
          constraints: { maxTokens: 2000, temperature: 0.25, responseFormat: "json_object" },
          authContext: { userId: params.context.userId, storeId: params.context.storeId },
          signal: params.context.signal,
        });
        tokensUsed += scriptAi.metadata?.usage?.totalTokens || 0;
        const parsed = scriptAi.result?.parsedJson;
        if (parsed && typeof parsed.code === "string" && parsed.code.trim().length > 10) {
          scriptCode = parsed.code;
          if (typeof parsed.title === "string" && parsed.title.trim()) {
            codeTitle = parsed.title.trim();
          }
        }
      } catch {
        /* mantém script base honesto */
      }
    }

    const filename = defaultFilename;
    const files: Record<string, string> = { [filename]: scriptCode };
    const payload = {
      title: codeTitle,
      language,
      filename,
      code: scriptCode,
      files,
      runnableInBrowserSandbox: true,
    };
    if (params.context.userId && params.context.threadId) {
      await saveCopilotArtifactRecord({
        sessionId: params.context.threadId,
        artifactType: "code",
        title: codeTitle,
        payload,
      }).catch(() => null);
    }
    return {
      artifact: {
        id: randomUUID(),
        type: "code",
        title: codeTitle,
        version: 1,
        totalVersions: 1,
        data: payload,
      },
      observation: `Código ${language} (${filename}) gerado e pronto para execução no Sandbox interativo.`,
      tokensUsed,
    };
  }

  if (
    canonicalType === "website" ||
    canonicalType === "web_app" ||
    canonicalType === "landing_page" ||
    canonicalType === "omnibuilder"
  ) {
    let htmlCode = "";
    let files: Record<string, string> = {};
    let sections: Array<Record<string, any>> = [];
    let siteTitle = params.title;

    if (!params.skipLlmRefinement) {
      try {
        const codeAi = await executeAiCoreGateway({
          task: "codigo",
          mode: "sync",
          module: "copilot_web_builder",
          systemPrompt:
            "Você é engenheiro front-end sênior Apple/Linear/Stripe. Crie uma landing page ou web app completo e responsivo em HTML5 + Tailwind CDN, sem URLs externas quebradas, sem avaliações falsas e sem preços inventados. Retorne JSON estrito: {\"title\":\"...\",\"html\":\"<!doctype html>...\",\"sections\":[{\"type\":\"hero\",\"headline\":\"...\",\"subheadline\":\"...\",\"ctaLabel\":\"...\"}],\"stylesCss\":\"...\"}.",
          prompt: `Contexto/Memória:\n${params.hierarchicalMemory}\n\nBriefing do usuário:\n${params.brief}`,
          constraints: { maxTokens: 2800, temperature: 0.35, responseFormat: "json_object" },
          authContext: {
            userId: params.context.userId,
            storeId: params.context.storeId,
          },
          signal: params.context.signal,
        });
        tokensUsed += codeAi.metadata?.usage?.totalTokens || 0;
        const parsed = codeAi.result?.parsedJson;
        if (parsed && typeof parsed.html === "string" && parsed.html.includes("<")) {
          htmlCode = parsed.html;
          siteTitle = typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : siteTitle;
          if (Array.isArray(parsed.sections)) sections = parsed.sections;
          files = {
            "index.html": htmlCode,
            ...(typeof parsed.stylesCss === "string" && parsed.stylesCss.trim()
              ? { "styles.css": parsed.stylesCss }
              : {}),
          };
        }
      } catch {
        /* fallback determinístico estruturado sem fake claims */
      }
    }

    if (!htmlCode) {
      sections = [
        {
          id: "hero",
          type: "hero",
          headline: siteTitle,
          subheadline: "Estrutura modular criada a partir do seu briefing, pronta para edição no OmniBuilder.",
          ctaLabel: "Entrar em Contato",
        },
        {
          id: "features",
          type: "features",
          title: "Diferenciais e Escopo",
          items: [
            { title: "Arquitetura Responsiva", description: "Layout mobile-first sem acúmulo de bordas ou containeritis." },
            { title: "Conteúdo Editável", description: "Substitua títulos, serviços e contatos reais no OmniBuilder." },
          ],
        },
      ];
      htmlCode = DEFAULT_HTML_SHELL(
        siteTitle,
        `<section class="space-y-4">
          <h1 class="text-3xl sm:text-5xl font-bold tracking-tight">${siteTitle.replace(/</g, "&lt;")}</h1>
          <p class="text-slate-300 max-w-2xl leading-relaxed">Protótipo interativo compilado pelo Waesy Copilot. Personalize textos e contatos reais no editor.</p>
          <a href="#contato" class="inline-flex items-center px-5 py-3 rounded-xl bg-slate-100 text-slate-950 font-semibold text-sm">Falar com a equipe</a>
        </section>
        <section id="contato" class="grid sm:grid-cols-2 gap-4">
          <div class="rounded-2xl border border-slate-800 p-5 space-y-2"><h2 class="font-semibold">Escopo Principal</h2><p class="text-sm text-slate-400">Edite esta seção no painel lateral ou no OmniBuilder.</p></div>
          <div class="rounded-2xl border border-slate-800 p-5 space-y-2"><h2 class="font-semibold">Atendimento Direto</h2><p class="text-sm text-slate-400">Integre seu canal oficial da loja.</p></div>
        </section>`,
        canonicalType === "web_app" ? "Web App" : "Preview ao Vivo",
      );
      files = { "index.html": htmlCode };
    }

    let documentId: string | undefined;
    if (params.context.userId) {
      const savedDoc = await createOrUpdateBuilderDocument({
        storeId: params.context.storeId || null,
        authorProfileId: params.context.userId,
        docType: "website",
        title: siteTitle,
        contentSchema: { title: siteTitle, sections, htmlCode, files },
        metadata: { generatedByCopilot: true, artifactType: canonicalType },
      }).catch(() => null);
      if (savedDoc?.id) {
        documentId = savedDoc.id;
        if (params.context.threadId) {
          await saveCopilotArtifactRecord({
            sessionId: params.context.threadId,
            artifactType: canonicalType as any,
            title: siteTitle,
            payload: { documentId, title: siteTitle, htmlCode, files, sections },
          }).catch(() => null);
        }
      }
    }

    const payload = {
      documentId,
      title: siteTitle,
      htmlCode,
      files,
      sections,
      editorRoute: documentId ? `/workspace/builder?doc=${encodeURIComponent(documentId)}` : "/workspace/builder",
    };

    return {
      artifact: {
        id: randomUUID(),
        type: canonicalType,
        title: siteTitle,
        version: 1,
        totalVersions: 1,
        data: payload,
      },
      observation: `Site/Web App compilado (${Object.keys(files).join(", ") || "index.html"})${documentId ? ` e salvo no OmniBuilder (/workspace/builder?doc=${documentId})` : ""}.`,
      tokensUsed,
    };
  }

  if (canonicalType === "creative_post" || canonicalType === "social_post" || canonicalType === "carousel") {
    const baseSpec = extractCreativePostSpecFromPrompt(
      params.brief || params.userPrompt,
      {},
      params.workingMemory,
      { city: params.context.city },
    );
    const wantsCarouselSlides =
      canonicalType === "carousel" || /\b(carrossel|carousel|slides?)\b/i.test(params.userPrompt);
    let slides = wantsCarouselSlides
      ? [
          { headline: baseSpec.headline, body: baseSpec.subheadline, badge: baseSpec.badge, cta: baseSpec.ctaText },
          { headline: "Por que isso resolve sua dor", body: "Detalhe o benefício concreto e verificável do serviço ou produto.", badge: "Slide 2" },
          { headline: baseSpec.ctaText || "Chame agora", body: "Encerre com chamada objetiva para ação sem promessas irreais.", badge: "Fechamento", cta: baseSpec.ctaText },
        ]
      : undefined;

    if (!params.skipLlmRefinement) {
      try {
        const copyRes = await executeAiCoreGateway({
          task: "geracao_texto",
          mode: "sync",
          systemPrompt:
            "Crie a copy estruturada de arte social em PT-BR respeitando fatos reais do briefing (sem preços ou avaliações inventadas). Retorne JSON: {\"headline\":\"...\",\"subheadline\":\"...\",\"ctaText\":\"...\",\"badge\":\"...\",\"caption\":\"...\",\"slides\":[{\"headline\":\"...\",\"body\":\"...\"}]}.",
          prompt: `Memória:\n${params.hierarchicalMemory}\n\nTipo: ${canonicalType}\nBriefing:\n${params.brief}`,
          constraints: { maxTokens: 900, temperature: 0.45, responseFormat: "json_object" },
          authContext: { userId: params.context.userId, storeId: params.context.storeId },
          signal: params.context.signal,
        });
        tokensUsed += copyRes.metadata?.usage?.totalTokens || 0;
        const j = copyRes.result?.parsedJson;
        if (j?.headline) baseSpec.headline = String(j.headline);
        if (j?.subheadline) baseSpec.subheadline = String(j.subheadline);
        if (j?.ctaText) baseSpec.ctaText = String(j.ctaText);
        if (j?.badge || j?.badgeText) baseSpec.badge = String(j.badge || j.badgeText);
        if (canonicalType === "carousel" && Array.isArray(j?.slides) && j.slides.length >= 2) {
          slides = j.slides.slice(0, 8);
        }
      } catch {
        /* preserva baseSpec determinística */
      }
    }

    const payload = {
      ...baseSpec,
      ...(slides ? { slides } : {}),
    };

    if (params.context.userId && params.context.threadId) {
      await saveCopilotArtifactRecord({
        sessionId: params.context.threadId,
        artifactType: canonicalType as any,
        title: params.title,
        payload,
      }).catch(() => null);
    }

    return {
      artifact: {
        id: randomUUID(),
        type: canonicalType,
        title: baseSpec.headline || params.title,
        version: 1,
        totalVersions: 1,
        data: payload,
      },
      structuredBlock: {
        type: "creative_ad_preview",
        data: {
          artifact_id: undefined,
          title: baseSpec.headline || params.title,
          headline: payload.headline,
          subheadline: payload.subheadline,
          body_text: payload.subheadline,
          badge: payload.badge,
          offer_badge: payload.offerBadge,
          offer_price: payload.offerPrice,
          installments: payload.installments,
          bullets: payload.bullets,
          cta_label: payload.ctaText,
          store_name: payload.brandName,
          location_label: payload.locationLabel,
          format: payload.format,
          aspect_ratio: payload.aspectRatio,
          archetype: payload.archetype,
          theme_id: payload.themeId,
          slides: payload.slides,
          caption: `${payload.headline}\n\n${payload.subheadline}`,
          hashtags: payload.hashtags,
        },
      },
      observation: `${canonicalType === "carousel" ? `Carrossel com ${slides?.length || 3} slides` : "Arte Canva"} gerado e pronto para exportação PNG/PDF no painel.`,
      tokensUsed,
    };
  }

  if (canonicalType === "presentation") {
    let slides: Array<{ title: string; subtitle?: string; bullets: string[]; speakerNotes?: string }> = [
      { title: params.title, subtitle: "Visão Geral", bullets: ["Contexto e objetivo central", "Fatos e premissas verificáveis"] },
      { title: "Plano de Execução", bullets: ["Etapa 1: Diagnóstico", "Etapa 2: Implementação", "Etapa 3: Validação"] },
      { title: "Próximos Passos", bullets: ["Alinhamento de responsáveis", "Revisão no Universal Document Studio"] },
    ];
    if (!params.skipLlmRefinement) {
      try {
        const presRes = await executeAiCoreGateway({
          task: "geracao_texto",
          mode: "sync",
          systemPrompt:
            "Crie uma apresentação executiva de 5 a 7 slides em PT-BR, objetiva e sem números inventados. JSON: {\"title\":\"...\",\"slides\":[{\"title\":\"...\",\"subtitle\":\"...\",\"bullets\":[\"...\"],\"speakerNotes\":\"...\"}]}.",
          prompt: `Memória:\n${params.hierarchicalMemory}\n\nBriefing:\n${params.brief}`,
          constraints: { maxTokens: 1500, temperature: 0.4, responseFormat: "json_object" },
          authContext: { userId: params.context.userId, storeId: params.context.storeId },
          signal: params.context.signal,
        });
        tokensUsed += presRes.metadata?.usage?.totalTokens || 0;
        const parsed = presRes.result?.parsedJson;
        if (Array.isArray(parsed?.slides) && parsed.slides.length >= 2) {
          slides = parsed.slides.slice(0, 10);
        }
      } catch {
        /* mantém slides base */
      }
    }
    const sections = slides.map((s, idx) => ({
      id: `slide-${idx + 1}`,
      type: "slide",
      heading: s.title,
      subtitle: s.subtitle,
      paragraphs: s.bullets,
    }));
    const payload = { title: params.title, slides, sections, theme: "clean_standard" };
    if (params.context.userId && params.context.threadId) {
      await saveCopilotArtifactRecord({
        sessionId: params.context.threadId,
        artifactType: "presentation",
        title: params.title,
        payload,
      }).catch(() => null);
    }
    return {
      artifact: {
        id: randomUUID(),
        type: "presentation",
        title: params.title,
        version: 1,
        totalVersions: 1,
        data: payload,
      },
      observation: `Apresentação estruturada com ${slides.length} slides pronta para visualização e exportação em PDF.`,
      tokensUsed,
    };
  }

  if (canonicalType === "map_view") {
    let places: Array<Record<string, any>> = [];
    try {
      const { getServerClient } = await import("@/lib/supabase");
      const db = getServerClient();
      const searchClean = params.brief
        .replace(/\b(onde\s+fica|onde\s+tem|perto\s+de\s+mim|buscar|procurar|mapa|lojas?|empresas?)\b/gi, " ")
        .trim()
        .slice(0, 60);
      let q = db
        .from("directory_listings")
        .select("id, store_id, business_name, category, description, address, latitude, longitude, contact_phone, contact_whatsapp, is_verified, avatar_url, banner_url, status")
        .eq("status", "active")
        .limit(8);
      if (searchClean.length >= 2) {
        q = q.or(`business_name.ilike.%${searchClean}%,category.ilike.%${searchClean}%,description.ilike.%${searchClean}%`);
      }
      const { data: rows } = await q;
      if (Array.isArray(rows)) {
        places = rows.map((r: any) => ({
          id: r.id,
          name: r.business_name,
          category: r.category,
          description: r.description,
          address: r.address,
          lat: typeof r.latitude === "number" ? r.latitude : null,
          lng: typeof r.longitude === "number" ? r.longitude : null,
          phone: r.contact_phone || r.contact_whatsapp || null,
          isVerified: Boolean(r.is_verified),
          imageUrl: r.banner_url || r.avatar_url || null,
        }));
      }
    } catch {
      /* mantém lista vazia honesta */
    }
    const payload = {
      title: params.title,
      city: params.context.city || null,
      places,
    };
    return {
      artifact: {
        id: randomUUID(),
        type: "map_view",
        title: params.title,
        version: 1,
        totalVersions: 1,
        data: payload,
      },
      structuredBlock: places.length > 0 ? { type: "places_carousel", data: { title: "Estabelecimentos Encontrados", places } } : undefined,
      observation:
        places.length > 0
          ? `Localizados ${places.length} estabelecimento(s) ativo(s) no guia local.`
          : "Consultei o guia oficial de estabelecimentos, mas não há registros ativos com esse critério no momento.",
      tokensUsed,
    };
  }

  if (canonicalType === "dashboard") {
    let ordersCount = 0;
    let totalRevenueCents = 0;
    let distinctCustomersCount = 0;
    const breakdowns: Array<{ label: string; value: number; percentage: number }> = [];
    const recentActivities: Array<{ id: string; description: string; timestamp: string; status: string; amount: string }> = [];
    try {
      const { getServerClient } = await import("@/lib/supabase");
      const db = getServerClient();
      if (params.context.storeId) {
        const [{ data: storeOrders }, { data: publicOrders }, { data: leads }] = await Promise.all([
          db
            .from("store_orders")
            .select("id, total_amount_cents, payment_status, created_at")
            .eq("store_id", params.context.storeId)
            .order("created_at", { ascending: false })
            .limit(200),
          db
            .from("orders")
            .select("id, customer_id, total_cents, status, created_at")
            .eq("store_id", params.context.storeId)
            .order("created_at", { ascending: false })
            .limit(200),
          db.from("crm_leads").select("id, status, created_at").eq("store_id", params.context.storeId).limit(200),
        ]);
        const combined = [
          ...(Array.isArray(storeOrders) ? storeOrders : []).map((o: any) => ({
            id: String(o.id),
            cents: Number(o.total_amount_cents || 0),
            status: String(o.payment_status || "registrado"),
            customerId: null as string | null,
            createdAt: String(o.created_at || new Date().toISOString()),
          })),
          ...(Array.isArray(publicOrders) ? publicOrders : []).map((o: any) => ({
            id: String(o.id),
            cents: Number(o.total_cents || 0),
            status: String(o.status || "registrado"),
            customerId: o.customer_id ? String(o.customer_id) : null,
            createdAt: String(o.created_at || new Date().toISOString()),
          })),
        ];
        ordersCount = combined.length;
        totalRevenueCents = combined.reduce((acc, o) => acc + o.cents, 0);
        const custSet = new Set(combined.map((o) => o.customerId).filter((v): v is string => Boolean(v)));
        distinctCustomersCount = custSet.size > 0 ? custSet.size : Array.isArray(leads) ? leads.length : 0;

        const byStatus = new Map<string, number>();
        for (const o of combined) {
          byStatus.set(o.status, (byStatus.get(o.status) || 0) + o.cents);
        }
        for (const [k, v] of byStatus.entries()) {
          breakdowns.push({
            label: `Status: ${k}`,
            value: Math.round(v / 100),
            percentage: totalRevenueCents > 0 ? Math.round((v / totalRevenueCents) * 100) : 0,
          });
        }
        const fmtBrl = (c: number) =>
          new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
        combined.slice(0, 5).forEach((ord) => {
          recentActivities.push({
            id: ord.id,
            description: `Pedido ${ord.id.slice(0, 8)}`,
            timestamp: new Date(ord.createdAt).toLocaleString("pt-BR"),
            status: ord.status,
            amount: fmtBrl(ord.cents),
          });
        });
      }
    } catch {
      /* mantém KPIs vazios honestos se loja não vinculada */
    }
    const fmt = (c: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
    const payload = {
      title: params.title,
      storeId: params.context.storeId || null,
      kpis: [
        { id: "kpi-revenue", label: "Receita Confirmada", value: fmt(totalRevenueCents), periodLabel: "dados reais", trend: "neutral", category: "Financeiro" },
        { id: "kpi-orders", label: "Volume de Pedidos", value: ordersCount, periodLabel: "pedidos reais", trend: "neutral", category: "Operacional" },
        { id: "kpi-ticket", label: "Ticket Médio", value: fmt(ordersCount > 0 ? Math.round(totalRevenueCents / ordersCount) : 0), periodLabel: "por transação", trend: "neutral", category: "Comercial" },
        { id: "kpi-clients", label: "Clientes & Leads", value: distinctCustomersCount, periodLabel: "base registrada", trend: "neutral", category: "Clientes" },
      ],
      breakdowns,
      recentActivities,
      alerts: ordersCount === 0 ? ["Nenhum pedido registrado no banco para esta loja até o momento."] : undefined,
      isEmpty: ordersCount === 0,
    };
    return {
      artifact: {
        id: randomUUID(),
        type: "dashboard",
        title: params.title,
        version: 1,
        totalVersions: 1,
        data: payload,
      },
      observation:
        ordersCount > 0
          ? `Dashboard real montado: ${fmt(totalRevenueCents)} em ${ordersCount} pedido(s).`
          : "Painel criado sem indicadores inventados — nenhum pedido encontrado para esta loja ainda.",
      tokensUsed,
    };
  }

  if (canonicalType === "spreadsheet" || canonicalType === "interactive_table") {
    const sheet = buildSpreadsheetWithFormulas(params.title, params.brief);
    if (params.context.userId && params.context.threadId) {
      await saveCopilotArtifactRecord({
        sessionId: params.context.threadId,
        artifactType: canonicalType as any,
        title: params.title,
        payload: sheet,
      }).catch(() => null);
    }
    return {
      artifact: {
        id: randomUUID(),
        type: canonicalType,
        title: params.title,
        version: 1,
        totalVersions: 1,
        data: sheet,
      },
      structuredBlock: { type: "table", title: params.title, columns: sheet.columns, rows: sheet.rows },
      observation: `Planilha criada com ${sheet.columns.length} colunas e fórmulas interativas (${sheet.summary?.totalFormula || "SUM"}).`,
      tokensUsed,
    };
  }

  // document / proposal / business_plan / schedule_plan / travel_itinerary
  let docSections: Array<{ heading: string; content: string; paragraphs?: string[] }> = [
    { heading: "1. Objetivo", content: params.brief },
    { heading: "2. Escopo e Entregáveis", content: "Estrutura pronta para personalização com dados reais no Universal Document Studio." },
  ];
  let docTitle = params.title;
  if (!params.skipLlmRefinement) {
    try {
      const docRes = await executeAiCoreGateway({
        task: "geracao_texto",
        mode: "sync",
        systemPrompt:
          "Redija um documento técnico/comercial estruturado em PT-BR (contrato, proposta, plano de negócios ou relatório), nunca inventando CNPJ, preços não informados ou cláusulas ilegais. JSON: {\"title\":\"...\",\"sections\":[{\"heading\":\"...\",\"paragraphs\":[\"...\"]}]}.",
        prompt: `Memória:\n${params.hierarchicalMemory}\n\nTipo: ${canonicalType}\nBriefing:\n${params.brief}`,
        constraints: { maxTokens: 1800, temperature: 0.35, responseFormat: "json_object" },
        authContext: { userId: params.context.userId, storeId: params.context.storeId },
        signal: params.context.signal,
      });
      tokensUsed += docRes.metadata?.usage?.totalTokens || 0;
      const j = docRes.result?.parsedJson;
      if (j?.title) docTitle = String(j.title);
      if (Array.isArray(j?.sections) && j.sections.length > 0) {
        docSections = j.sections;
      }
    } catch {
      /* mantém esqueleto limpo */
    }
  }

  const builderDocType: BuilderDocType =
    canonicalType === "travel_itinerary" ? "travel_itinerary" : "document";
  let documentId: string | undefined;
  if (params.context.userId) {
    const savedDoc = await createOrUpdateBuilderDocument({
      storeId: params.context.storeId || null,
      authorProfileId: params.context.userId,
      docType: builderDocType,
      title: docTitle,
      contentSchema: { title: docTitle, docType: canonicalType, sections: docSections },
      metadata: { generatedByCopilot: true, artifactType: canonicalType },
    }).catch(() => null);
    if (savedDoc?.id) {
      documentId = savedDoc.id;
      if (params.context.threadId) {
        await saveCopilotArtifactRecord({
          sessionId: params.context.threadId,
          artifactType: canonicalType as any,
          title: docTitle,
          payload: { documentId, title: docTitle, sections: docSections },
        }).catch(() => null);
      }
    }
  }

  return {
    artifact: {
      id: randomUUID(),
      type: canonicalType,
      title: docTitle,
      version: 1,
      totalVersions: 1,
      data: {
        documentId,
        title: docTitle,
        sections: docSections,
        editorRoute: documentId ? `/workspace/builder?doc=${encodeURIComponent(documentId)}` : undefined,
      },
    },
    observation: `Documento "${docTitle}" estruturado com ${docSections.length} seções e pronto para exportação PDF.`,
    tokensUsed,
  };
}

function sanitizePlanSteps(rawPlan: unknown): ExecutionPlanStep[] | null {
  if (!Array.isArray(rawPlan) || rawPlan.length === 0) return null;
  const validStatuses = new Set(["pending", "running", "completed", "failed", "skipped"]);
  const cleaned: ExecutionPlanStep[] = [];
  for (let idx = 0; idx < Math.min(rawPlan.length, 10); idx++) {
    const item = rawPlan[idx] as Record<string, any> | null;
    if (!item || typeof item.title !== "string" || !item.title.trim()) continue;
    const status = validStatuses.has(String(item.status))
      ? (String(item.status) as ExecutionPlanStep["status"])
      : "pending";
    cleaned.push({
      id: typeof item.id === "string" && item.id.trim() ? item.id.trim().slice(0, 40) : `step-${idx + 1}`,
      title: item.title.trim().slice(0, 120),
      status,
      ...(typeof item.notes === "string" && item.notes.trim() ? { notes: item.notes.trim().slice(0, 180) } : {}),
    });
  }
  return cleaned.length > 0 ? cleaned : null;
}

export async function runCopilotReactOrchestrator(
  input: CopilotReactOrchestratorInput,
): Promise<AiExecutionResult> {
  const startTime = Date.now();
  const context = input.context || {};
  const executionId = context.continueExecutionId || randomUUID();
  const workingMemory = input.workingMemory || {};
  const updatedMemory: Record<string, any> = { ...workingMemory };
  const steps: AIActivityStep[] = [];
  let seqNo = 0;

  const emit = async (event: AiSseEvent) => {
    try {
      const handler = input.onEvent || context.onEvent;
      await handler?.(event);
    } catch {
      /* callback de stream não deve derrubar execução */
    }
  };

  let restoredCheckpointState: Record<string, any> | null = null;
  let restoredPlan: ExecutionPlanStep[] | null = null;
  let resumeCount = 0;

  if (context.continueExecutionId) {
    const loaded = await loadCopilotExecutionForContinue({
      executionId: context.continueExecutionId,
      userId: context.userId,
      storeId: context.storeId,
      allowWorkerBypass: Boolean(context.workerBypass),
    }).catch(() => null);
    if (!loaded) {
      throw new Error("Checkpoint de execução não encontrado ou sem autorização para retomada.");
    }
    const execRow = loaded.execution;
    if (Array.isArray(execRow.plan)) {
      restoredPlan = sanitizePlanSteps(execRow.plan);
    }
    if (execRow.state && typeof execRow.state === "object") {
      restoredCheckpointState = execRow.state as Record<string, any>;
    }
    resumeCount = Number(execRow.resume_count || restoredCheckpointState?.resumeCount || 0) + 1;
    seqNo = Array.isArray(loaded.steps) ? loaded.steps.length : 0;
  }

  await emit({
    type: "run_started",
    executionId,
    threadId: context.threadId,
    mode: context.quickToolMode || "default",
    ...(resumeCount > 0 ? { resumedChunk: resumeCount } : {}),
  });

  // 1. Segurança e Firewall antes de qualquer tool
  const security = inspectPromptSecurity(input.userPrompt);
  if (!security.isSafe) {
    const errStep: AIActivityStep = {
      id: `step-sec-${Date.now()}`,
      type: "skill",
      label: "Bloqueio de Segurança",
      detail: security.violationReason || "Padrão bloqueado pelo firewall de prompt.",
      status: "failed",
      fsmPhase: "FAILED_FINAL",
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
    steps.push(errStep);
    await emit({ type: "step_started", step: errStep });
    await emit({ type: "step_completed", step: errStep });
    return {
      responseMessage: "Por segurança e conformidade, esta solicitação foi bloqueada antes da execução.",
      activitySteps: steps,
      executionId,
      updatedMemory,
      fsmPhase: "FAILED_FINAL",
    };
  }

  if (context.userId && context.threadId && !context.continueExecutionId) {
    await startCopilotExecution({
      executionId,
      taskId: executionId,
      threadId: context.threadId,
      storeId: context.storeId || undefined,
      userId: context.userId,
      domain: "copilot_react",
    }).catch(() => undefined);
  } else if (context.continueExecutionId) {
    await saveCopilotExecutionCheckpoint({
      executionId,
      taskId: executionId,
      status: "running",
      currentPhase: "RUNNING",
      currentStepLabel: `Retomando execução (ciclo ${resumeCount + 1})`,
    }).catch(() => undefined);
  }

  const pushAndEmitStep = async (step: AIActivityStep) => {
    steps.push(step);
    await emit({ type: "step_started", step });
    if (context.userId && context.threadId) {
      await persistCopilotExecutionStep({ executionId }, step, seqNo++).catch(() => undefined);
    }
  };

  const finishAndEmitStep = async (step: AIActivityStep, patch: Partial<AIActivityStep>) => {
    Object.assign(step, patch, {
      completedAt: new Date().toISOString(),
      durationMs: Math.max(1, Date.now() - new Date(step.startedAt).getTime()),
    });
    await emit({ type: "step_completed", step });
    if (context.userId && context.threadId) {
      await persistCopilotExecutionStep({ executionId }, step, seqNo++).catch(() => undefined);
    }
  };

  try {
    // 2. Carrega Policy de Skills + Anexos + Memória Hierárquica + Compactação
    await emit({ type: "status", phase: "planning", message: "Carregando contexto, memória hierárquica e skills ativas..." });

    const [skillPolicy, attachmentsResult, hierarchicalMem, loadedExternalTools] = await Promise.all([
      getEffectiveSkillPolicyForUser({
        userId: context.userId || null,
        storeId: context.storeId || null,
      }).catch(() => ({
        activeSlugs: [],
        disabledSlugs: [],
        blockedTools: [],
        explicitAllowedTools: null,
        customInstructions: [],
        modelPreference: null,
        skills: [],
        isToolAllowed: () => true,
      })),
      Promise.resolve(
        input.resolvedAttachments || {
          images: [],
          textBlocks: (context.attachments || []).map((u, i) => `[Anexo ${i + 1}]: ${u}`),
          notes: [],
        },
      ),
      assembleHierarchicalCopilotContext({
        profileId: context.userId || null,
        storeId: context.storeId || null,
        projectContextBlock: context.projectKnowledgeContext || null,
        threadCompactedSummary:
          typeof workingMemory.compacted_summary === "string" ? workingMemory.compacted_summary : null,
        currentPrompt: input.userPrompt,
      }).catch(() => ({ formattedContext: "", companyRulesCount: 0, factsCount: 0, memoryChunksCount: 0 })),
      Array.isArray(input.externalMcpTools)
        ? Promise.resolve(input.externalMcpTools)
        : context.userId
          ? listActiveExternalMcpToolsForUser(context.userId).catch(() => [])
          : Promise.resolve([]),
    ]);

    if (context.threadId && input.recentMessages && input.recentMessages.length >= 14) {
      const newSummary = await compactThreadContextIfNeeded({
        threadId: context.threadId,
        messages: input.recentMessages,
        existingWorkingMemory: workingMemory,
        userId: context.userId || null,
        storeId: context.storeId || null,
      }).catch(() => null);
      if (newSummary) {
        updatedMemory.compacted_summary = newSummary;
      }
    }

    const allTools = getAllMcpTools().filter((t) => {
      if (!skillPolicy.isToolAllowed(t.name)) return false;
      if (!context.userId && t.tier !== "public") return false;
      if (t.tier !== "public" && !context.storeId) return false;
      return true;
    });
    const externalTools = (loadedExternalTools || []).filter((t) =>
      skillPolicy.isToolAllowed(t.compositeToolName),
    );
    const allowedToolSet = new Set<string>([
      ...allTools.map((t) => t.name),
      ...externalTools.map((t) => t.compositeToolName),
    ]);
    if (skillPolicy.isToolAllowed("browser_navigate_url") && (context.userId || extractFirstPublicUrl(input.userPrompt))) {
      allowedToolSet.add("browser_navigate_url");
    }

    const toolCatalogPrompt = buildRankedToolCatalogPrompt(
      allTools,
      externalTools,
      input.userPrompt,
      skillPolicy.activeSlugs,
    );

    const deadlineMs = startTime + 26_000;
    const maxChunkIterations = Math.min(Math.max(context.maxChunkIterations || 8, 1), 10);
    const attachmentNote =
      attachmentsResult.textBlocks.length > 0
        ? `\nConteúdo extraído dos anexos:\n${attachmentsResult.textBlocks.join("\n\n").slice(0, 3500)}`
        : "";

    const preloadedCards = Array.isArray(input.precomputedStage1?.platformSearch?.cards)
      ? input.precomputedStage1.platformSearch.cards
      : [];
    const preloadedSources: ChatSourceItem[] = preloadedCards.slice(0, 6).map((card: any) => ({
      id: `platform-${card.source_table || "item"}-${card.source_id || card.id}`,
      title: String(card.title || "Item Waesy"),
      kind: "platform" as const,
      detail: [card.kind, card.subtitle, card.location].filter(Boolean).join(" · "),
      url: typeof card.action?.payload?.href === "string" ? card.action.payload.href : undefined,
    }));
    const preloadedBlocks: Array<Record<string, any>> =
      preloadedCards.length > 0
        ? [
            {
              type: "card_carousel",
              data: {
                title: "Resultados no Waesy",
                source: "platform",
                query: input.precomputedStage1?.platformSearch?.query || input.userPrompt,
                items: preloadedCards,
              },
            },
          ]
        : [];

    const initialPlanSteps: ExecutionPlanStep[] = restoredPlan || [
      { id: "step-1", title: "Analisar objetivo e contexto ativo", status: "completed" },
      { id: "step-2", title: "Executar ferramentas, buscas ou subagentes", status: "running" },
      { id: "step-3", title: "Consolidar evidências e entrega final", status: "pending" },
    ];

    const initialVfsFiles: WorkspaceVfsMap =
      restoredCheckpointState?.vfsFiles && typeof restoredCheckpointState.vfsFiles === "object"
        ? { ...(restoredCheckpointState.vfsFiles as WorkspaceVfsMap) }
        : {};

    const syncPlanAndFile = async (state: ReactExecutionState, nextPlan?: ExecutionPlanStep[] | null) => {
      if (nextPlan && nextPlan.length > 0) {
        state.plan = nextPlan;
      }
      const planMut = vfsWriteFile(
        state.vfsFiles,
        "plan.md",
        renderExecutionPlanMarkdown(input.userPrompt.slice(0, 72), state.plan),
        "markdown",
      );
      await emit({ type: "plan_updated", executionId, steps: state.plan });
      await emit({
        type: "file_updated",
        executionId,
        file: planMut.file,
        originalContent: planMut.originalContent,
      });
    };

    const initialObservations: string[] = Array.isArray(restoredCheckpointState?.observations)
      ? [...(restoredCheckpointState.observations as string[])]
      : preloadedCards.length > 0
        ? [`[Busca Interna Waesy]: ${preloadedCards.length} resultado(s) reais encontrados (${preloadedCards.slice(0, 4).map((c: any) => c.title).join(", ")}).`]
        : [];

    const guidanceNote = context.userGuidance?.trim() || String(restoredCheckpointState?.userGuidance || "").trim();
    if (guidanceNote) {
      initialObservations.push(`[Orientação do usuário]: ${guidanceNote}`);
    }

    const executedActionsBeforeChunk = Array.isArray(restoredCheckpointState?.executedActions)
      ? restoredCheckpointState.executedActions.length
      : 0;
    const chunkActionLimit = 6;
    const chunkSubrequestLimit = 30;

    const initialState: ReactExecutionState = {
      plan: initialPlanSteps,
      vfsFiles: initialVfsFiles,
      observations: initialObservations,
      toolRecords: Array.isArray(restoredCheckpointState?.toolRecords)
        ? [...(restoredCheckpointState.toolRecords as AiToolExecutionRecord[])]
        : [],
      sources: Array.isArray(restoredCheckpointState?.sources)
        ? [...(restoredCheckpointState.sources as ChatSourceItem[])]
        : preloadedSources,
      artifact: restoredCheckpointState?.artifact as ChatArtifactData | undefined,
      structuredWidgets: Array.isArray(restoredCheckpointState?.structuredWidgets)
        ? [...(restoredCheckpointState.structuredWidgets as Array<{ widgetType: string; payload: Record<string, any> }>)]
        : [],
      structuredBlocks: Array.isArray(restoredCheckpointState?.structuredBlocks)
        ? [...(restoredCheckpointState.structuredBlocks as Array<Record<string, any>>)]
        : preloadedBlocks,
      executedActions: Array.isArray(restoredCheckpointState?.executedActions)
        ? [...(restoredCheckpointState.executedActions as string[])]
        : [],
      totalTokens: Number(restoredCheckpointState?.totalTokens || 0),
      subrequestsUsed: 2,
      resumeCount,
      activeBrowserSession: restoredCheckpointState?.activeBrowserSession,
      liveBrowserFrame: restoredCheckpointState?.liveBrowserFrame,
    };

    if (!input.precomputedStage1?.singleCallMode) {
      await syncPlanAndFile(initialState);
    }

    const loopResult = await runReactLoop<
      { userPrompt: string },
      CopilotPlannerAction,
      string,
      ReactExecutionState
    >({
      initialPlan: { userPrompt: input.userPrompt },
      initialState,
      maxIterations: maxChunkIterations,
      planNext: async ({ state }) => {
        if (context.signal?.aborted) {
          return { decision: "complete" as const, reason: "Cancelado pelo usuário" };
        }
        if (Date.now() > deadlineMs) {
          if (state.plan.some((s) => s.status === "pending" || s.status === "running")) {
            state.needsCheckpointContinue = true;
            state.checkpointReason = "Janela de tempo do chunk atingida; pronto para retomar.";
          }
          return { decision: "complete" as const, reason: "Orçamento de tempo atingido" };
        }
        if (state.subrequestsUsed >= chunkSubrequestLimit) {
          state.needsCheckpointContinue = true;
          state.checkpointReason = "Orçamento de sub-requisições do chunk atingido; pronto para retomar.";
          return { decision: "complete" as const, reason: "Orçamento de sub-requisições atingido" };
        }
        if (state.executedActions.length - executedActionsBeforeChunk >= chunkActionLimit) {
          if (state.plan.some((s) => s.status === "pending" || s.status === "running")) {
            state.needsCheckpointContinue = true;
            state.checkpointReason = "Lote de ações deste ciclo concluído; continuando próximas etapas.";
          }
          return { decision: "complete" as const, reason: "Coleta e construção do chunk concluídas" };
        }

        // Planejamento dinâmico via Gateway
        const plannerSystem = `Você é o planejador executivo ReAct do Waesy Copilot.
Nunca reutilize intenções de turnos anteriores se o assunto atual mudou.
Escolha UMA próxima ação em JSON estrito (opcionalmente inclua "plan":[{"id":"step-1","title":"...","status":"completed|running|pending"}] para atualizar o checklist):
1) {"type":"mcp_tool","thought":"...","toolName":"NOME_DA_TOOL","toolArgs":{...},"label":"...","plan":[...]}
2) {"type":"browser_task","thought":"...","url":"https://...","goal":"...","interactiveSteps":[{"type":"click|type|scroll|wait","selector":"...","text":"...","submit":true}],"label":"...","plan":[...]}
3) {"type":"spawn_subagents","thought":"...","label":"Pesquisa paralela multi-agente","tasks":[{"id":"a1","role":"@pesquisador_mercado","goal":"...","toolName":"opcional","toolArgs":{},"url":"https://opcional"}],"plan":[...]}
4) {"type":"build_asset","thought":"...","artifactType":"website|web_app|code|creative_post|carousel|document|proposal|business_plan|presentation|spreadsheet|image","title":"...","brief":"...","label":"...","plan":[...]}
5) {"type":"finish","thought":"...","draftAnswer":"opcional se já pronto para responder","plan":[...]}

Regras obrigatórias:
- Só use tools listadas abaixo. Se uma skill foi desativada, NUNCA a simule.
- Use "spawn_subagents" (2 a 3 tarefas paralelas) quando precisar investigar múltiplas frentes, concorrentes ou URLs simultaneamente.
- Use "workspace_vfs_write"/"workspace_vfs_read"/"sandbox_compute" para armazenar notas/CSVs intermediários no VFS e fazer contas determinísticas exatas.
- Use "artifactType":"code" quando o usuário pedir script Python ou JavaScript executável em sandbox.
- Modo rápido selecionado no compositor: "${context.quickToolMode || "default"}" (honre quando coerente com o pedido atual).
- Cidade do usuário: "${context.city || "não informada"}". StoreId ativo: "${context.storeId || "nenhum (modo civil/visitante)"}".
${skillPolicy.customInstructions.length > 0 ? `\nInstruções de Skills Ativas:\n${skillPolicy.customInstructions.join("\n")}` : ""}

Ferramentas MCP disponíveis neste turno:
${toolCatalogPrompt || "- (Nenhuma ferramenta restrita disponível; responda consultivamente ou crie ativos client-side)"}
${allowedToolSet.has("browser_navigate_url") ? "- browser_navigate_url: Navega com Steel CDP WebSocket (cliques/formulários/screenshots/liveViewerUrl) em URL pública HTTP/HTTPS.\n" : ""}`;

        const vfsSummary = Object.keys(state.vfsFiles).length > 0
          ? `\nArquivos ativos no VFS: ${Object.keys(state.vfsFiles).join(", ")}`
          : "";
        const plannerUser = `Pedido atual: ${input.userPrompt}${attachmentNote}${vfsSummary}
${hierarchicalMem.formattedContext ? `\nMemória ativa:\n${hierarchicalMem.formattedContext.slice(0, 2200)}` : ""}
Observações já obtidas neste turno:
${state.observations.length > 0 ? state.observations.join("\n---\n").slice(0, 2600) : "(Nenhuma ação executada ainda)"}`;

        if (input.precomputedStage1?.singleCallMode) {
          if (state.executedActions.length > 0) {
            return { decision: "complete" as const, reason: "Ação Stage 1 concluída" };
          }
          const stage1Intent = String(input.precomputedStage1.intent || "").toLowerCase();
          const stage1AssetMap: Record<string, ChatArtifactType> = {
            creative_post: "creative_post",
            create_ad: "creative_post",
            ads_campaign: "creative_post",
            presentation_deck: "presentation",
            website_builder: "website",
            financial_report: "spreadsheet",
            commercial_proposal: "proposal",
            travel_itinerary: "travel_itinerary",
            generate_dashboard: "dashboard",
            search_places: "map_view",
            interactive_map: "map_view",
          };
          if (stage1Intent in stage1AssetMap) {
            return {
              decision: "continue" as const,
              action: {
                type: "build_asset",
                thought: "Execução direta do ativo classificado no Stage 1",
                artifactType: stage1AssetMap[stage1Intent],
                title: input.userPrompt.slice(0, 80),
                brief: input.userPrompt,
                label: input.precomputedStage1.gatewayResponse?.step_label || "Construindo Artefato",
              },
            };
          }
          const fallbackActionSingle = deriveHeuristicFallbackAction(
            input.userPrompt,
            context,
            state.executedActions,
            allowedToolSet,
          );
          if (fallbackActionSingle.type === "finish") {
            return { decision: "complete" as const, reason: "Resposta direta Stage 1" };
          }
          return { decision: "continue" as const, action: fallbackActionSingle };
        }

        try {
          const planRes = await executeAiCoreGateway({
            task: "chat",
            mode: "sync",
            module: "copilot_react_planner",
            systemPrompt: plannerSystem,
            prompt: plannerUser,
            messages: input.recentMessages?.slice(-6),
            images: attachmentsResult.images.length > 0 ? attachmentsResult.images : undefined,
            context: skillPolicy.modelPreference
              ? { modelPreference: skillPolicy.modelPreference }
              : undefined,
            constraints: { maxTokens: 520, temperature: 0.15, responseFormat: "json_object" },
            authContext: { userId: context.userId, storeId: context.storeId },
            signal: context.signal,
          });
          state.subrequestsUsed += 1;
          state.totalTokens += planRes.metadata?.usage?.totalTokens || 0;
          const j = planRes.result?.parsedJson;
          if (j && typeof j.type === "string") {
            const parsedPlan = sanitizePlanSteps(j.plan);
            if (parsedPlan) {
              await syncPlanAndFile(state, parsedPlan);
            }
            if (j.type === "finish") {
              state.needsCheckpointContinue = false;
              state.plan = state.plan.map((s) =>
                s.status === "pending" || s.status === "running"
                  ? { ...s, status: "completed" }
                  : s,
              );
              await syncPlanAndFile(state);
              return { decision: "complete" as const, reason: j.thought || "Pronto para responder" };
            }
            if (j.type === "mcp_tool" && typeof j.toolName === "string") {
              if (!allowedToolSet.has(j.toolName)) {
                state.observations.push(`Tool "${j.toolName}" indisponível ou bloqueada pelas skills/permissões ativas.`);
                return { decision: "complete" as const, reason: "Skill desativada ou sem acesso" };
              }
              return {
                decision: "continue" as const,
                action: {
                  type: "mcp_tool",
                  thought: String(j.thought || "Executando ferramenta"),
                  toolName: j.toolName,
                  toolArgs: typeof j.toolArgs === "object" && j.toolArgs ? j.toolArgs : {},
                  label: typeof j.label === "string" ? j.label : undefined,
                  plan: parsedPlan || undefined,
                },
              };
            }
            if (j.type === "browser_task" && typeof j.url === "string" && allowedToolSet.has("browser_navigate_url")) {
              const rawSteps = Array.isArray(j.interactiveSteps)
                ? (j.interactiveSteps as BrowserInteractiveStep[]).slice(0, 6)
                : undefined;
              return {
                decision: "continue" as const,
                action: {
                  type: "browser_task",
                  thought: String(j.thought || "Navegando URL"),
                  url: j.url,
                  goal: String(j.goal || input.userPrompt),
                  label: typeof j.label === "string" ? j.label : undefined,
                  interactiveSteps: rawSteps,
                  keepSessionAlive: Boolean(j.keepSessionAlive),
                  plan: parsedPlan || undefined,
                },
              };
            }
            if (j.type === "spawn_subagents" && Array.isArray(j.tasks) && j.tasks.length > 0) {
              const subTasks: CopilotSubagentDispatchItem[] = j.tasks
                .slice(0, 3)
                .filter((t: any) => t && typeof t.goal === "string" && t.goal.trim())
                .map((t: any, idx: number) => ({
                  id: typeof t.id === "string" && t.id.trim() ? t.id.trim().slice(0, 40) : `sub-${idx + 1}`,
                  role: typeof t.role === "string" && t.role.trim() ? t.role.trim().slice(0, 48) : `@subagent_${idx + 1}`,
                  goal: t.goal.trim().slice(0, 600),
                  ...(typeof t.toolName === "string" && t.toolName.trim() ? { toolName: t.toolName.trim() } : {}),
                  ...(typeof t.toolArgs === "object" && t.toolArgs ? { toolArgs: t.toolArgs } : {}),
                  ...(typeof t.url === "string" && t.url.trim() ? { url: t.url.trim() } : {}),
                }));
              if (subTasks.length > 0) {
                return {
                  decision: "continue" as const,
                  action: {
                    type: "spawn_subagents",
                    thought: String(j.thought || "Executando subagentes especializados em paralelo"),
                    label: typeof j.label === "string" ? j.label : "Subagentes Paralelos",
                    tasks: subTasks,
                    plan: parsedPlan || undefined,
                  },
                };
              }
            }
            if (j.type === "build_asset" && typeof j.artifactType === "string") {
              return {
                decision: "continue" as const,
                action: {
                  type: "build_asset",
                  thought: String(j.thought || "Gerando artefato"),
                  artifactType: normalizeArtifactType(j.artifactType, "document"),
                  title: String(j.title || input.userPrompt).slice(0, 100),
                  brief: String(j.brief || input.userPrompt),
                  label: typeof j.label === "string" ? j.label : undefined,
                  plan: parsedPlan || undefined,
                },
              };
            }
          }
        } catch {
          /* usa roteador heurístico de segurança apenas para decisão de primeiro passo */
        }

        const fallbackAction = deriveHeuristicFallbackAction(
          input.userPrompt,
          context,
          state.executedActions,
          allowedToolSet,
        );
        if (fallbackAction.type === "finish") {
          return { decision: "complete" as const, reason: fallbackAction.thought };
        }
        return { decision: "continue" as const, action: fallbackAction };
      },
      act: async (action, state) => {
        await emit({
          type: "status",
          phase: "running",
          message: ("label" in action && action.label) || action.thought,
        });

        if (action.type === "mcp_tool") {
          if (!allowedToolSet.has(action.toolName) || !skillPolicy.isToolAllowed(action.toolName)) {
            const blockedMsg = `Ferramenta "${action.toolName}" bloqueada pela política de skills ativas.`;
            return blockedMsg;
          }

          const step: AIActivityStep = {
            id: `step-mcp-${Date.now()}-${state.toolRecords.length}`,
            type: "tool",
            label: action.label || `Ferramenta ${action.toolName}`,
            detail: action.thought,
            status: "running",
            fsmPhase: "RUNNING",
            startedAt: new Date().toISOString(),
          };
          await pushAndEmitStep(step);

          const mcpArgs = {
            ...(context.storeId ? { storeId: context.storeId } : {}),
            ...action.toolArgs,
          };
          let lastVfsChange: { path: string; original: string; content: string } | null = null;
          const t0 = Date.now();
          let mcpResult: {
            status: "success" | "error";
            content: Array<{ type: string; data?: any; text?: string }>;
          };
          if (action.toolName.startsWith("mcp_ext:")) {
            const extRes = await invokeExternalMcpToolForUser(
              context.userId || "",
              action.toolName,
              mcpArgs,
            );
            mcpResult = {
              status: extRes.status,
              content: extRes.content.map((c) => ({
                type: c.type,
                text: c.text,
                ...(extRes.rawResult && typeof extRes.rawResult === "object"
                  ? { data: extRes.rawResult }
                  : {}),
              })),
            };
          } else {
            mcpResult = await executeMcpToolCall({
              tool: action.toolName,
              arguments: mcpArgs,
              storeId: context.storeId,
              signal: context.signal,
              serverUserId: context.userId,
              vfsFiles: state.vfsFiles,
              onVfsMutation: async (file, originalContent) => {
                lastVfsChange = {
                  path: file.path,
                  original: originalContent,
                  content: file.content,
                };
                await emit({
                  type: "file_updated",
                  executionId,
                  file,
                  originalContent,
                });
              },
            });
          }
          state.subrequestsUsed += 2;
          const elapsed = Date.now() - t0;

          const jsonContent = mcpResult.content.find((c) => c.type === "json")?.data;
          const textContent = mcpResult.content.find((c) => c.type === "text")?.text;
          const summaryStr = jsonContent
            ? JSON.stringify(jsonContent).slice(0, 3200)
            : String(textContent || mcpResult.status);

          state.toolRecords.push({
            tool: action.toolName,
            arguments: mcpArgs,
            status: mcpResult.status,
            durationMs: elapsed,
            resultSummary: summaryStr.slice(0, 260),
            executedAt: new Date().toISOString(),
          });

          // Converte dados reais em generative widgets do chat
          if (mcpResult.status === "success" && jsonContent && typeof jsonContent === "object") {
            if (Array.isArray(jsonContent.results) && jsonContent.results.length > 0 && action.toolName === "search_catalog_products") {
              const items = jsonContent.results.slice(0, 6).map((p: any) => ({
                id: String(p.id || ""),
                title: String(p.title || "Produto"),
                priceBrl: Number(p.priceBrl || 0),
                imageUrl: p.thumbnailUrl || null,
                href: p.slug ? validateInternalRoute(`/produto/${p.slug}`) || "/buscar" : "/buscar",
              }));
              state.structuredWidgets.push({
                widgetType: "product-carousel",
                payload: { items },
              });
              state.structuredBlocks.push({
                type: "product_carousel",
                title: "Resultados encontrados no Waesy",
                items,
              });
              await emit({ type: "widget", widgetType: "product-carousel", payload: { items } });
            } else if (action.toolName === "simlab_run_batch_simulation") {
              const verdictPayload = {
                experimentId: jsonContent.experimentId,
                title: jsonContent.title,
                responsesCount: jsonContent.responsesCount,
                synthesis: jsonContent.synthesis,
                sampleReactions: jsonContent.sampleReactions || [],
              };
              state.structuredWidgets.push({ widgetType: "in-chat-simlab-verdict", payload: verdictPayload });
              state.structuredBlocks.push({ type: "in_chat_simlab_verdict", data: verdictPayload });
              await emit({ type: "widget", widgetType: "in-chat-simlab-verdict", payload: verdictPayload });
              state.artifact = {
                id: randomUUID(),
                type: "simlab_report",
                title: String(jsonContent.title || "Relatório SimLab 4.0"),
                version: 1,
                totalVersions: 1,
                data: verdictPayload,
              };
              await emit({ type: "artifact_ready", artifact: state.artifact as any });
            }
          }

          const terminalOut =
            action.toolName === "sandbox_compute" && jsonContent
              ? [jsonContent.stdout, jsonContent.stderr].filter(Boolean).join("\n") || summaryStr
              : undefined;
          const vfsPatchInfo = lastVfsChange as { path: string; original: string; content: string } | null;

          await finishAndEmitStep(step, {
            status: mcpResult.status === "success" ? "completed" : "failed",
            fsmPhase: mcpResult.status === "success" ? "RUNNING" : "FAILED_RETRYABLE",
            detail: `${action.toolName} (${mcpResult.status}) em ${elapsed}ms`,
            ...(terminalOut ? { terminalOutput: terminalOut } : {}),
            ...(vfsPatchInfo
              ? {
                  fileName: vfsPatchInfo.path,
                  fileOriginal: vfsPatchInfo.original,
                  fileDiff: vfsPatchInfo.content,
                }
              : {}),
            toolLogs: [{ summary: summaryStr.slice(0, 500) }],
          });

          state.executedActions.push(`mcp:${action.toolName}`);
          return `[Tool ${action.toolName} | ${mcpResult.status}]: ${summaryStr}`;
        }

        if (action.type === "browser_task") {
          if (!allowedToolSet.has("browser_navigate_url")) {
            return "Skill de navegação autônoma desativada.";
          }
          const step: AIActivityStep = {
            id: `step-browser-${Date.now()}`,
            type: "tool",
            label: action.label || "Navegação Autônoma",
            detail: action.url,
            browserUrl: action.url,
            status: "running",
            fsmPhase: "RUNNING",
            startedAt: new Date().toISOString(),
          };
          await pushAndEmitStep(step);

          state.subrequestsUsed += 2;
          const browserRes = await executeBrowserAutomationTask({
            url: action.url,
            goal: action.goal,
            storeId: context.storeId,
            userId: context.userId,
            signal: context.signal,
            interactiveSteps: action.interactiveSteps,
            existingSessionId: state.activeBrowserSession?.sessionId,
            keepSessionAlive: action.keepSessionAlive,
            captureScreenshot: true,
            onFrame: async (frame) => {
              state.liveBrowserFrame = {
                url: frame.url,
                screenshotUrl: frame.screenshotUrl || undefined,
                liveViewerUrl: frame.liveViewerUrl,
                sessionId: frame.sessionId,
                driver: frame.driver,
                title: frame.title,
              };
              await emit({
                type: "browser_frame",
                stepId: step.id,
                url: frame.url,
                screenshotUrl: frame.screenshotUrl || undefined,
                liveViewerUrl: frame.liveViewerUrl,
                sessionId: frame.sessionId,
                driver: frame.driver,
                title: frame.title,
              });
            },
          });

          if (browserRes.sessionId) {
            state.activeBrowserSession = action.keepSessionAlive
              ? {
                  sessionId: browserRes.sessionId,
                  url: browserRes.finalUrl || action.url,
                  liveViewerUrl: browserRes.liveViewerUrl,
                }
              : undefined;
          }
          if (browserRes.finalUrl) {
            state.liveBrowserFrame = {
              url: browserRes.finalUrl,
              screenshotUrl: browserRes.screenshotUrl || undefined,
              liveViewerUrl: browserRes.liveViewerUrl,
              sessionId: browserRes.sessionId,
              driver: browserRes.driver,
              title: browserRes.title,
            };
            state.sources.push({
              id: `browser-${step.id}`,
              kind: "web",
              title: browserRes.title || browserRes.finalUrl,
              url: browserRes.finalUrl,
              detail: browserRes.textExcerpt.slice(0, 180),
            });
          }

          await finishAndEmitStep(step, {
            status: browserRes.status === "completed" ? "completed" : "failed",
            detail: `${browserRes.driver} • ${browserRes.finalUrl}`,
            browserUrl: browserRes.finalUrl ?? undefined,
            screenshotUrl: browserRes.screenshotUrl ?? undefined,
            liveViewerUrl: browserRes.liveViewerUrl,
            driver: browserRes.driver,
            toolLogs: browserRes.stepsExecuted.map((s) => ({ outcome: s.outcome, detail: s.detail })),
          });

          state.executedActions.push("browser_task");
          if (browserRes.status !== "completed") {
            return `[Browser ${browserRes.driver} FAILED]: ${browserRes.error || "Não foi possível carregar a página."}`;
          }
          const controlsHint = browserRes.interactiveElements?.length
            ? `\nControles visíveis: ${browserRes.interactiveElements.slice(0, 8).map((c) => `${c.tag}(${c.selector}) "${c.label}"`).join(" | ")}`
            : "";
          return `[Browser ${browserRes.driver} | ${browserRes.finalUrl}]: Título "${browserRes.title}". Extrato:\n${browserRes.textExcerpt.slice(0, 3000)}${controlsHint}`;
        }

        if (action.type === "spawn_subagents") {
          const batch = action.tasks.slice(0, 3);
          state.subrequestsUsed += batch.length * 2;
          const batchSettled = await Promise.allSettled(
            batch.map(async (sub, idx) => {
              const subStep: AIActivityStep = {
                id: `step-sub-${Date.now()}-${idx}`,
                type: "subagent",
                role: sub.role,
                parentTaskId: executionId,
                label: `Subagente ${sub.role}`,
                detail: sub.goal,
                status: "running",
                fsmPhase: "RUNNING",
                startedAt: new Date().toISOString(),
              };
              await pushAndEmitStep(subStep);

              let evidenceText = "";
              let subTokens = 0;

              if (sub.toolName && allowedToolSet.has(sub.toolName) && skillPolicy.isToolAllowed(sub.toolName)) {
                const subMcp = await executeMcpToolCall({
                  tool: sub.toolName,
                  arguments: {
                    ...(context.storeId ? { storeId: context.storeId } : {}),
                    ...(sub.toolArgs || {}),
                  },
                  storeId: context.storeId,
                  signal: context.signal,
                  serverUserId: context.userId,
                  vfsFiles: state.vfsFiles,
                }).catch(() => null);
                if (subMcp) {
                  const j = subMcp.content.find((c) => c.type === "json")?.data;
                  const t = subMcp.content.find((c) => c.type === "text")?.text;
                  evidenceText += j ? JSON.stringify(j).slice(0, 2200) : String(t || "");
                }
              }

              if (sub.url && allowedToolSet.has("browser_navigate_url")) {
                const subBr = await executeBrowserAutomationTask({
                  url: sub.url,
                  goal: sub.goal,
                  storeId: context.storeId,
                  userId: context.userId,
                  signal: context.signal,
                  captureScreenshot: false,
                  useInteractiveCdp: false,
                }).catch(() => null);
                if (subBr?.status === "completed") {
                  evidenceText += `\n[Web ${subBr.finalUrl}]: ${subBr.textExcerpt.slice(0, 2200)}`;
                  state.sources.push({
                    id: `sub-web-${sub.id}-${Date.now()}`,
                    kind: "web",
                    title: subBr.title || subBr.finalUrl,
                    url: subBr.finalUrl,
                    detail: subBr.textExcerpt.slice(0, 140),
                  });
                }
              }

              let subAnswer = evidenceText.trim();
              try {
                const subAi = await executeAiCoreGateway({
                  task: "resumo",
                  mode: "sync",
                  module: `copilot_subagent:${sub.role}`,
                  systemPrompt: `Você é o subagente especializado ${sub.role} operando em contexto isolado no Waesy Copilot. Responda objetivamente ao seu sub-objetivo sem inventar fatos nem valores não observados.`,
                  prompt: `Sub-objetivo: ${sub.goal}\nCidade: ${context.city || "não informada"}\nEvidências coletadas:\n${evidenceText || "(Sem dados de ferramenta externos; execute análise com rigor e transparência)"}`,
                  constraints: { maxTokens: 650, temperature: 0.2 },
                  authContext: { userId: context.userId, storeId: context.storeId },
                  signal: context.signal,
                });
                subTokens = subAi.metadata?.usage?.totalTokens || 0;
                if (subAi.result?.text?.trim()) {
                  subAnswer = subAi.result.text.trim();
                }
              } catch {
                if (!subAnswer) {
                  subAnswer = `Subagente ${sub.role} concluído sem retorno textual do provedor de IA.`;
                }
              }

              const safeSlug = sub.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32) || `sub_${idx + 1}`;
              const vfsReport = vfsWriteFile(
                state.vfsFiles,
                `agents/${safeSlug}.md`,
                `# ${sub.role}\n\n**Objetivo:** ${sub.goal}\n\n${subAnswer}`,
                "markdown",
              );
              await emit({
                type: "file_updated",
                executionId,
                file: vfsReport.file,
                originalContent: vfsReport.originalContent,
              });

              await finishAndEmitStep(subStep, {
                status: "completed",
                detail: subAnswer.slice(0, 140),
                tokensUsed: subTokens,
                fileName: vfsReport.file.path,
                fileOriginal: vfsReport.originalContent,
                fileDiff: vfsReport.file.content,
              });

              return { role: sub.role, subTokens, subAnswer };
            }),
          );

          const lines: string[] = [];
          for (let i = 0; i < batchSettled.length; i++) {
            const item = batchSettled[i];
            if (item.status === "fulfilled") {
              state.totalTokens += item.value.subTokens;
              lines.push(`[${item.value.role}]: ${item.value.subAnswer.slice(0, 900)}`);
            } else {
              lines.push(`[${batch[i].role} FAILED]: ${String(item.reason)}`);
            }
          }
          state.executedActions.push(`spawn_subagents:${batch.length}`);
          return lines.join("\n---\n");
        }

        if (action.type === "build_asset") {
          const step: AIActivityStep = {
            id: `step-build-${Date.now()}`,
            type: "skill",
            label: action.label || `Criando ${action.artifactType}`,
            detail: action.title,
            status: "running",
            fsmPhase: "RUNNING",
            startedAt: new Date().toISOString(),
          };
          await pushAndEmitStep(step);
          await emit({
            type: "artifact_draft",
            artifactType: action.artifactType,
            title: action.title,
          });

          try {
            state.subrequestsUsed += 2;
            const built = await generateStructuredAsset({
              artifactType: action.artifactType,
              title: action.title,
              brief: action.brief,
              userPrompt: input.userPrompt,
              hierarchicalMemory: hierarchicalMem.formattedContext,
              context,
              workingMemory,
              skipLlmRefinement: Boolean(input.precomputedStage1?.singleCallMode),
            });
            state.artifact = built.artifact;
            state.totalTokens += built.tokensUsed;
            if (built.structuredBlock) {
              state.structuredBlocks.push(built.structuredBlock);
            }

            let primaryFile: { path: string; original: string; content: string } | null = null;
            const dataObj = (built.artifact.data || {}) as Record<string, any>;
            if (dataObj.files && typeof dataObj.files === "object") {
              for (const [fPath, fContent] of Object.entries(dataObj.files)) {
                if (typeof fContent === "string") {
                  const mut = vfsWriteFile(state.vfsFiles, fPath, fContent);
                  if (!primaryFile) {
                    primaryFile = {
                      path: mut.file.path,
                      original: mut.originalContent,
                      content: mut.file.content,
                    };
                  }
                  await emit({
                    type: "file_updated",
                    executionId,
                    file: mut.file,
                    originalContent: mut.originalContent,
                  });
                }
              }
            }

            await emit({ type: "artifact_ready", artifact: built.artifact as any });
            await finishAndEmitStep(step, {
              status: "completed",
              detail: built.observation.slice(0, 140),
              tokensUsed: built.tokensUsed,
              ...(primaryFile
                ? {
                    fileName: primaryFile.path,
                    fileOriginal: primaryFile.original,
                    fileDiff: primaryFile.content,
                  }
                : {}),
            });
            state.executedActions.push(`build:${action.artifactType}`);
            return built.observation;
          } catch (buildErr: any) {
            await finishAndEmitStep(step, {
              status: "failed",
              fsmPhase: "FAILED_RETRYABLE",
              detail: buildErr?.message || "Falha ao gerar ativo",
            });
            state.executedActions.push(`build_failed:${action.artifactType}`);
            return `[Falha ao construir ${action.artifactType}]: ${buildErr?.message || "Erro interno"}`;
          }
        }

        return "OK";
      },
      observe: async (observation, state) => {
        state.observations.push(observation);
        const hasChainedFollowUpIntent =
          /\b(enviar|mande|envie|publicar|publique|deploy|github|vercel|notion|slack|e-?mail|whatsapp|simlab|simular|validar|cruzar|comparar|planilha|agendar|subagente|paralelo|aprofund)\b/i.test(
            input.userPrompt,
          );
        if (
          state.artifact &&
          (input.precomputedStage1?.singleCallMode ||
            !hasChainedFollowUpIntent ||
            state.executedActions.length - executedActionsBeforeChunk >= chunkActionLimit)
        ) {
          return { valid: true, state, decision: "complete" as const, reason: "Artefato entregue" };
        }
        return { valid: true, state, decision: "continue" as const };
      },
    });

    const finalState = loopResult.state;

    // 2.5. Checkpoint Durável Multi-Chunk (se ainda há etapas pendentes e a thread é persistida)
    const shouldYieldCheckpoint =
      Boolean(finalState.needsCheckpointContinue) &&
      Boolean(context.userId && context.threadId) &&
      finalState.resumeCount < 4 &&
      !context.signal?.aborted &&
      !input.precomputedStage1?.singleCallMode &&
      finalState.executedActions.length > executedActionsBeforeChunk;

    if (shouldYieldCheckpoint) {
      const completedStepsCount = finalState.plan.filter((s) => s.status === "completed").length;
      const totalStepsCount = Math.max(finalState.plan.length, 1);
      const progressPercent = Math.min(95, Math.max(15, Math.round((completedStepsCount / totalStepsCount) * 100)));

      await saveCopilotExecutionCheckpoint({
        executionId,
        taskId: executionId,
        plan: finalState.plan,
        status: "paused",
        currentPhase: "PARTIAL_RESULT",
        progressPercent,
        currentStepLabel:
          finalState.checkpointReason || "Checkpoint salvo; retomando próximas etapas automaticamente.",
        state: {
          autoResume: true,
          pauseRequested: false,
          userPrompt: input.userPrompt,
          resumeCount: finalState.resumeCount,
          observations: finalState.observations.slice(-24),
          toolRecords: finalState.toolRecords.slice(-24),
          sources: finalState.sources.slice(-20),
          artifact: finalState.artifact || null,
          structuredWidgets: finalState.structuredWidgets.slice(-8),
          structuredBlocks: finalState.structuredBlocks.slice(-8),
          executedActions: finalState.executedActions.slice(-32),
          totalTokens: finalState.totalTokens,
          vfsFiles: finalState.vfsFiles,
          activeBrowserSession: finalState.activeBrowserSession || null,
          liveBrowserFrame: finalState.liveBrowserFrame || null,
        },
      }).catch(() => undefined);

      await emit({
        type: "checkpoint",
        executionId,
        threadId: context.threadId,
        completedSteps: completedStepsCount,
        totalSteps: totalStepsCount,
        progressPercent,
        canAutoContinue: true,
        reason: finalState.checkpointReason || "Ciclo intermediário salvo para continuação automática.",
      });

      return {
        responseMessage: "",
        activitySteps: steps,
        executionId,
        toolCalls: finalState.toolRecords,
        artifact: finalState.artifact,
        sources: finalState.sources,
        updatedMemory,
        fsmPhase: "PARTIAL_RESULT",
        plan: finalState.plan,
        vfsFiles: Object.values(finalState.vfsFiles),
        liveBrowserFrame: finalState.liveBrowserFrame,
        checkpoint: {
          hasMore: true,
          progressPercent,
          completedSteps: completedStepsCount,
          totalSteps: totalStepsCount,
          reason: finalState.checkpointReason,
        },
      };
    }

    if (!input.precomputedStage1?.singleCallMode) {
      finalState.plan = finalState.plan.map((s) =>
        s.status === "pending" || s.status === "running"
          ? { ...s, status: "completed" }
          : s,
      );
      await syncPlanAndFile(finalState);
    }

    // 3. Síntese streaming grounded nas observações reais
    await emit({ type: "status", phase: "verifying", message: "Consolidando resposta com base nas evidências obtidas..." });

    const synthesisSystem = `Você é o Waesy Copilot. Responda em português do Brasil claro, direto e executivo.
Regras inegociáveis de veracidade:
1. Baseie-se APENAS no contexto e nas observações de ferramentas abaixo. Nunca invente valores, vendas, CNPJs, avaliações ou disponibilidade não observados.
2. Quando mencionar links internos da plataforma, use EXCLUSIVAMENTE rotas válidas (/evento/:id, /turismo/:id, /produto/:slug, /loja/:slug, /classificados/:id, /workspace/builder?doc=:id). Nunca invente /eventos/..., /viagens/... ou /builder.
3. Se alguma ferramenta ou geração falhou ou foi bloqueada por uma skill desativada, comunique com transparência e objetividade.
${skillPolicy.customInstructions.length > 0 ? `\nDiretrizes de Skills Ativas:\n${skillPolicy.customInstructions.join("\n")}` : ""}`;

    const synthesisUser = `Solicitação: ${input.userPrompt}${attachmentNote}
${hierarchicalMem.formattedContext ? `\nMemória ativa:\n${hierarchicalMem.formattedContext.slice(0, 2200)}` : ""}
${finalState.observations.length > 0 ? `\nEvidências e resultados reais obtidos:\n${finalState.observations.join("\n---\n")}` : ""}`;

    let responseText =
      input.precomputedStage1?.singleCallMode &&
      typeof input.precomputedStage1?.gatewayResponse?.message === "string" &&
      input.precomputedStage1.gatewayResponse.message.trim()
        ? sanitizeInternalRoutesInText(input.precomputedStage1.gatewayResponse.message.trim())
        : "";

    if (!responseText && !input.precomputedStage1?.singleCallMode) {
      try {
        const streamRes = await executeAiCoreGatewayStream(
          {
            task: "chat",
            mode: "stream",
            module: "copilot_react_synthesis",
            systemPrompt: synthesisSystem,
            prompt: synthesisUser,
            messages: input.recentMessages?.slice(-8),
            images: attachmentsResult.images.length > 0 ? attachmentsResult.images : undefined,
            context: skillPolicy.modelPreference
              ? { modelPreference: skillPolicy.modelPreference }
              : undefined,
            constraints: { maxTokens: 1600, temperature: 0.35 },
            authContext: { userId: context.userId, storeId: context.storeId },
            signal: context.signal,
          },
          (chunk) => {
            void emit({ type: "delta", text: sanitizeInternalRoutesInText(chunk), final: false });
          },
        );
        if (streamRes.success && streamRes.text) {
          responseText = sanitizeInternalRoutesInText(streamRes.text);
        }
        finalState.totalTokens += streamRes.metadata?.usage?.totalTokens || 0;
      } catch {
        /* fallback honesto abaixo */
      }
    }

    if (!responseText) {
      responseText =
        finalState.observations.length > 0
          ? sanitizeInternalRoutesInText(finalState.observations.join("\n\n"))
          : "Pronto. No momento nenhum provedor de modelo generativo respondeu com texto; verifique as chaves de IA ativas no Cofre ou reformule sua solicitação.";
      await emit({ type: "delta", text: responseText, final: false });
    }

    await emit({ type: "delta", text: "", final: true });

    const structuredPayload =
      finalState.structuredBlocks.length > 0 || finalState.structuredWidgets.length > 0
        ? {
            blocks: finalState.structuredBlocks,
            widgets: finalState.structuredWidgets,
          }
        : undefined;

    if (structuredPayload) {
      await emit({ type: "structured", payload: structuredPayload, source: "platform" });
    }

    // Não grava last_intent grudento — guarda apenas metadados benignos de telemetria
    updatedMemory.last_execution_id = executionId;
    updatedMemory.last_tool_count = finalState.toolRecords.length;
    updatedMemory.active_skill_slugs = skillPolicy.activeSlugs.slice(0, 20);
    delete updatedMemory.last_intent;

    if (context.userId && context.threadId) {
      await saveCopilotExecutionCheckpoint({
        executionId,
        taskId: executionId,
        plan: finalState.plan,
        progressPercent: 100,
        currentStepLabel: "Execução concluída",
      }).catch(() => undefined);
      await completeCopilotExecution(
        { executionId },
        "completed",
        {
          artifactType: finalState.artifact?.type || null,
          toolCount: finalState.toolRecords.length,
          totalTokens: finalState.totalTokens,
          vfsFiles: finalState.vfsFiles,
          resumeCount: finalState.resumeCount,
        },
      ).catch(() => undefined);
    }

    return {
      responseMessage: responseText,
      activitySteps: steps,
      executionId,
      toolCalls: finalState.toolRecords,
      artifact: finalState.artifact,
      structuredPayload,
      sources: finalState.sources,
      updatedMemory,
      fsmPhase: "COMPLETED",
      plan: finalState.plan,
      vfsFiles: Object.values(finalState.vfsFiles),
      liveBrowserFrame: finalState.liveBrowserFrame,
      checkpoint: {
        hasMore: false,
        progressPercent: 100,
        completedSteps: finalState.plan.length,
        totalSteps: finalState.plan.length,
      },
    };
  } catch (err: any) {
    if (context.userId && context.threadId) {
      await completeCopilotExecution(
        { executionId },
        "failed_retryable",
        {},
        err?.message || "Erro no orquestrador",
      ).catch(() => undefined);
    }
    throw err;
  }
}
