/**
 * web-agent.functions.ts — BFF do agente de navegação (leitura) do Admin Master.
 * - webAgentStepFn: um passo stateless (observar + decidir) para o painel com passos ao vivo e botão parar.
 * - runWebTaskFn: ciclo completo limitado (uso por Copilot/cron).
 * - get/save: lista de domínios permitidos em stores.settings.integrations.web_agent.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requirePlatformAdmin } from "@/lib/server-access";
import {
  AgentActionSchema,
  MAX_AGENT_STEPS,
  isHostAllowed,
  runWebAgentLoop,
  type AgentAction,
  type AgentRunResult,
  type AgentStepRecord,
  type PageObservation,
} from "@/lib/web-agent/agent-core";
import { decideNextAction, defaultAgentDeps, observePage } from "./mining/web-agent-runtime";

async function loadRoot() {
  const { data } = await getServerClient()
    .from("stores")
    .select("id, settings")
    .or("slug.eq.waesy-matriz,is_platform_root.eq.true")
    .limit(1)
    .maybeSingle();
  return data as { id: string; settings: Record<string, any> | null } | null;
}

export async function loadAllowedHosts(): Promise<string[]> {
  const root = await loadRoot();
  const hosts = (root?.settings?.integrations?.web_agent?.allowed_hosts as unknown) ?? [];
  return Array.isArray(hosts) ? hosts.filter((h): h is string => typeof h === "string") : [];
}

/** Execução server-side sem checagem de role: chamadores devem autorizar antes (Copilot/cron). */
export async function runWebTask(goal: string, startUrl: string, maxSteps = 4): Promise<AgentRunResult> {
  const allowedHosts = await loadAllowedHosts();
  return runWebAgentLoop({ goal, startUrl, allowedHosts, maxSteps }, defaultAgentDeps);
}

export const getWebAgentSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requirePlatformAdmin();
  return { allowedHosts: await loadAllowedHosts(), maxSteps: MAX_AGENT_STEPS };
});

export const saveWebAgentSettings = createServerFn({ method: "POST" })
  .validator(z.object({ allowedHosts: z.array(z.string().min(3).max(120)).max(50) }))
  .handler(async ({ data }) => {
    await requirePlatformAdmin();
    const root = await loadRoot();
    if (!root) throw new Error("Store raiz da plataforma não encontrada.");
    const hosts = [
      ...new Set(
        data.allowedHosts
          .map((h) => h.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0])
          .filter((h) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h)),
      ),
    ];
    const settings = root.settings || {};
    const { error } = await getServerClient()
      .from("stores")
      .update({
        settings: {
          ...settings,
          integrations: { ...((settings.integrations as Record<string, any>) || {}), web_agent: { allowed_hosts: hosts, updated_at: new Date().toISOString() } },
        },
      })
      .eq("id", root.id);
    if (error) throw new Error("Erro ao salvar domínios: " + error.message);
    return { allowedHosts: hosts };
  });

const StepInput = z.object({
  goal: z.string().min(3).max(500),
  startUrl: z.string().url(),
  currentUrl: z.string().url().optional(),
  history: z
    .array(
      z.object({
        index: z.number().int(),
        action: AgentActionSchema,
        url: z.string().optional(),
        outcome: z.enum(["ok", "blocked", "error", "finished"]),
        detail: z.string().optional(),
      }),
    )
    .max(MAX_AGENT_STEPS)
    .default([]),
});

export interface WebAgentStepResult {
  step: AgentStepRecord;
  done: boolean;
  answer?: string;
  data?: Record<string, any>;
  currentUrl?: string;
  error?: string;
}

export const webAgentStepFn = createServerFn({ method: "POST" })
  .validator(StepInput)
  .handler(async ({ data }): Promise<WebAgentStepResult> => {
    await requirePlatformAdmin();
    const allowedHosts = await loadAllowedHosts();
    const index = data.history.length;
    const history = data.history as AgentStepRecord[];

    if (index >= MAX_AGENT_STEPS) {
      return { step: { index, action: { type: "finish", answer: "" }, outcome: "error", detail: "Limite de passos." }, done: true, error: "Limite de passos atingido." };
    }
    if (!isHostAllowed(data.startUrl, data.startUrl, allowedHosts)) {
      return { step: { index, action: { type: "finish", answer: "" }, outcome: "error" }, done: true, error: "URL inicial inválida ou não pública." };
    }

    const url = data.currentUrl || data.startUrl;
    const observation: PageObservation | null = await observePage(url);
    if (!observation) {
      return { step: { index, action: { type: "open", url }, url, outcome: "error", detail: "Falha ao ler a página." }, done: true, error: "Não foi possível ler a página." };
    }

    let action: AgentAction;
    try {
      action = await decideNextAction({ goal: data.goal, observation, history, stepsLeft: MAX_AGENT_STEPS - index });
    } catch (err) {
      return { step: { index, action: { type: "finish", answer: "" }, outcome: "error" }, done: true, error: err instanceof Error ? err.message : "Falha ao decidir." };
    }

    if (action.type === "finish") {
      return { step: { index, action, url, outcome: "finished" }, done: true, answer: action.answer, data: action.data, currentUrl: url };
    }

    const target = action.type === "open" ? action.url : observation.links[action.linkIndex];
    if (!target || !isHostAllowed(target, data.startUrl, allowedHosts)) {
      return { step: { index, action, url: target, outcome: "blocked", detail: "Domínio fora da política." }, done: false, currentUrl: url };
    }
    return { step: { index, action, url: target, outcome: "ok" }, done: false, currentUrl: target };
  });

export const runWebTaskFn = createServerFn({ method: "POST" })
  .validator(z.object({ goal: z.string().min(3).max(500), startUrl: z.string().url(), maxSteps: z.number().int().min(1).max(MAX_AGENT_STEPS).default(4) }))
  .handler(async ({ data }) => {
    await requirePlatformAdmin();
    return runWebTask(data.goal, data.startUrl, data.maxSteps);
  });
