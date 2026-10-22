/**
 * web-agent-runtime.ts — Dependências de servidor do agente web (pool gratuito, sem VPS).
 * observe: scrapeUrl (Firecrawl pool -> fetch nativo -> Steel Cloud pool).
 * decide: executeUnifiedAiCall (Groq/OpenRouter/Gemini da pool) em modo JSON.
 * Troca futura para Steel Browser (CDP) só substitui `observe`.
 */

import { scrapeUrl } from "@/lib/mining/firecrawl-client";
import { executeUnifiedAiCall } from "@/services/api-orchestrator.functions";
import {
  AGENT_SYSTEM_PROMPT,
  buildDecisionPrompt,
  parseAgentAction,
  pickLinks,
  truncateText,
  type AgentAction,
  type AgentDeps,
  type AgentStepRecord,
  type PageObservation,
} from "@/lib/web-agent/agent-core";
import { isPublicHttpUrl } from "@/lib/mining/contact-extractor";

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

export async function observePage(url: string): Promise<PageObservation | null> {
  if (!isPublicHttpUrl(url)) return null;
  const res = await scrapeUrl(url, { formats: ["markdown", "html"], onlyMainContent: false }).catch(() => null);
  if (!res?.success) return null;
  const text = truncateText(res.markdown || (res.html ? htmlToText(res.html) : ""));
  if (!text) return null;
  const links = pickLinks(res.links || []);
  return { url, text, links, provider: res.provider };
}

export async function decideNextAction(input: {
  goal: string;
  observation: PageObservation | null;
  history: AgentStepRecord[];
  stepsLeft: number;
}): Promise<AgentAction> {
  const call = await executeUnifiedAiCall({
    feature: "web_agent",
    taskType: "fast_json",
    systemPrompt: AGENT_SYSTEM_PROMPT,
    userPrompt: buildDecisionPrompt(input),
    responseFormat: "json_object",
    temperature: 0.1,
    maxTokens: 700,
  });
  const action = parseAgentAction(call.content || call.text || "");
  if (!action) {
    // Resposta inválida: encerra com honestidade em vez de inventar ação.
    return { type: "finish", answer: "Não consegui interpretar a decisão do modelo. Tente reformular o objetivo." };
  }
  return action;
}

export const defaultAgentDeps: Pick<AgentDeps, "observe" | "decide"> = {
  observe: observePage,
  decide: decideNextAction,
};
