/**
 * magic-onboarding.functions.ts — Motor de Onboarding Guiado por IA (Waesy)
 * 
 * Pipeline de Extração Real (Steel / Firecrawl / Groq) + Concílio de IAs em 5 Squads
 * + Persistência Canônica em brand_kits, brand_dna_profiles, briefings, stores e products.
 * Tarifado de forma segura e transparente via Token Tollbooth (20.000 Tokens da Plataforma).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";
import { requireTokensOrTollbooth } from "@/lib/token-tollbooth.server";
import { ONBOARDING_AI_COST, ONBOARDING_AI_TIME_SAVED_MINUTES } from "@/config/platform-billing.config";
import { hasActiveAiProvider } from "./api-orchestrator.functions";
import {
  assertSafeUrl,
  updateJobProgress,
  captureWebEvidence,
  fetchGoogleBusinessEvidence,
  runDesignSquad,
  runCopySquad,
  runPrSquad,
  runBusinessStrategistSquad,
  runMarketAnalystSquad,
  runConsolidationAndJudge,
  persistOnboardingResults,
  FinalConsolidatedBriefing,
  OnboardingEvidenceScreenshot,
  OnboardingLiveLog,
  OnboardingLiveState,
} from "./onboarding-pipeline.server";

export type { OnboardingEvidenceScreenshot, OnboardingLiveLog, OnboardingLiveState };

export interface MagicOnboardingResult {
  job_id: string;
  company_name: string;
  category: string;
  bio: string;
  brand_voice: string;
  tagline: string;
  logo_url?: string | null;
  cover_url?: string | null;
  instagram_url?: string | null;
  live_viewer_url?: string | null;
  screenshots?: OnboardingEvidenceScreenshot[];
  logs?: OnboardingLiveLog[];
  contact: {
    whatsapp?: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    address?: string;
  };
  suggested_products: Array<{
    name: string;
    description: string;
    price_cents: number;
    category?: string;
  }>;
  theme_colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  brand_dna: {
    archetype: string;
    tone_of_voice: string;
    seven_sins_triggers: Record<string, string>;
  };
  briefing: {
    title: string;
    swot_strengths: string[];
    swot_opportunities: string[];
  };
  products_created_count: number;
}

const MagicOnboardingInputSchema = z.object({
  url: z.string().url("URL do site ou Instagram inválida"),
  store_id: z.string().uuid().optional(),
  company_name_hint: z.string().optional(),
  city_hint: z.string().optional(),
  state_hint: z.string().optional(),
  instagram_hint: z.string().optional(),
});

async function assertAiAvailableOrThrow(ownerId: string, storeId?: string | null) {
  const aiCheck = await hasActiveAiProvider({
    ownerId,
    storeId: storeId || undefined,
  });
  if (!aiCheck.available) {
    throw new Error(
      "Nenhum provedor de IA ativo configurado. Cadastre uma chave em Admin Master > Pools de APIs ou Workspace > Cofre de IA (OpenRouter, Groq, Gemini, OpenAI ou Anthropic) antes de iniciar."
    );
  }
  return aiCheck;
}

async function runOnboardingPipelineForJob(params: {
  jobId: string;
  url: string;
  domain: string;
  storeId: string | null;
  companyNameHint?: string;
  cityHint?: string;
  stateHint?: string;
  instagramHint?: string;
}): Promise<MagicOnboardingResult> {
  const { jobId, url, domain, storeId, companyNameHint, cityHint, stateHint, instagramHint } = params;
  const nowTime = () => new Date().toLocaleTimeString("pt-BR", { hour12: false });

  const liveState: OnboardingLiveState = {
    logs: [
      {
        id: `log-init-${Date.now()}`,
        time: nowTime(),
        text: `Provedor de IA verificado. Iniciando extração real para ${domain}...`,
        squad: "crawl",
        status: "info",
      },
    ],
    screenshots: [],
    active_squad: "crawl",
    completed_squads: [],
  };

  const pushLiveState = async (
    progressPercent: number,
    opts?: {
      log?: Omit<OnboardingLiveLog, "id" | "time">;
      activeSquad?: string;
      completedSquad?: string;
      screenshot?: OnboardingEvidenceScreenshot;
      liveViewerUrl?: string | null;
      currentBrowsingUrl?: string | null;
    }
  ) => {
    if (opts?.log) {
      liveState.logs.push({
        id: `log-${Date.now()}-${liveState.logs.length}`,
        time: nowTime(),
        ...opts.log,
      });
    }
    if (opts?.activeSquad) liveState.active_squad = opts.activeSquad;
    if (opts?.completedSquad && !liveState.completed_squads.includes(opts.completedSquad)) {
      liveState.completed_squads.push(opts.completedSquad);
    }
    if (opts?.screenshot) {
      liveState.screenshots.push(opts.screenshot);
    }
    if (opts?.liveViewerUrl !== undefined) {
      liveState.live_viewer_url = opts.liveViewerUrl;
    }
    if (opts?.currentBrowsingUrl !== undefined) {
      liveState.current_browsing_url = opts.currentBrowsingUrl;
    }
    await updateJobProgress(jobId, progressPercent, "processing", undefined, {
      live_state: liveState,
    });
  };

  try {
    await pushLiveState(8);

    // A. Visita e captura multi-fonte (Site + Instagram + Google Meu Negócio + Prints)
    const evidence = await captureWebEvidence(url, storeId || "", jobId, {
      companyNameHint,
      cityHint,
      stateHint,
      instagramHint,
      onProgress: async (evt) => {
        await pushLiveState(evt.progressPercent ?? 25, {
          log: evt.log,
          activeSquad: evt.activeSquad,
          completedSquad: evt.completedSquad,
          screenshot: evt.screenshot,
          liveViewerUrl: evt.liveViewerUrl,
          currentBrowsingUrl: evt.currentBrowsingUrl,
        });
      },
    });

    // B. Verificação Google Meu Negócio / Places (conta conectada se existir)
    const gmbEvidence = await fetchGoogleBusinessEvidence(storeId || "", evidence.domain);
    evidence.googleBusiness = gmbEvidence;

    await pushLiveState(48, {
      activeSquad: "design",
      log: {
        text: "Acionando Concílio de IAs em paralelo (Design, Copy, PR, Estratégia e Mercado)...",
        squad: "design",
        status: "info",
      },
    });

    // C. Concílio de IAs: Execução paralela dos 5 squads especializados com log real por conclusão
    const [designRes, copyRes, prRes, bizRes, marketRes] = await Promise.all([
      runDesignSquad(evidence).then(async (r) => {
        await pushLiveState(56, {
          completedSquad: "design",
          log: {
            text: `Squad Design concluído (${r.visual_style || "identidade extraída"}).`,
            squad: "design",
            status: "success",
          },
        });
        return r;
      }),
      runCopySquad(evidence).then(async (r) => {
        await pushLiveState(64, {
          completedSquad: "copy",
          log: {
            text: `Squad Copywriter concluído (tom: ${r.tone_of_voice || "definido"}).`,
            squad: "copy",
            status: "success",
          },
        });
        return r;
      }),
      runPrSquad(evidence).then(async (r) => {
        await pushLiveState(70, {
          completedSquad: "pr",
          log: {
            text: "Squad PR & Reputação concluído.",
            squad: "pr",
            status: "success",
          },
        });
        return r;
      }),
      runBusinessStrategistSquad(evidence).then(async (r) => {
        await pushLiveState(76, {
          completedSquad: "biz",
          log: {
            text: "Squad Estratégia & SWOT concluído.",
            squad: "biz",
            status: "success",
          },
        });
        return r;
      }),
      runMarketAnalystSquad(evidence).then(async (r) => {
        await pushLiveState(82, {
          log: {
            text: "Analista de Mercado concluído.",
            squad: "biz",
            status: "success",
          },
        });
        return r;
      }),
    ]);

    await pushLiveState(86, {
      activeSquad: "judge",
      log: {
        text: "Juiz Final reconciliando fatos, contatos e catálogo...",
        squad: "judge",
        status: "info",
      },
    });

    // D. Juiz Final e Reconciliação
    const consolidated: FinalConsolidatedBriefing = await runConsolidationAndJudge(
      evidence,
      designRes,
      copyRes,
      prRes,
      bizRes,
      marketRes
    );

    await pushLiveState(94, {
      completedSquad: "judge",
      log: {
        text: `Dados consolidados: ${consolidated.company_name}`,
        squad: "judge",
        status: "success",
      },
    });

    // E. Persistência E2E Atômica (apenas se loja já existir)
    let createdProductsCount = 0;
    if (storeId) {
      const persistRes = await persistOnboardingResults(storeId, consolidated, url, jobId);
      createdProductsCount = persistRes.createdProductsCount;
    }

    // F. Finalização do Job
    await updateJobProgress(jobId, 100, "completed", undefined, {
      company_name: consolidated.company_name,
      category: consolidated.category,
      products_created_count: createdProductsCount,
      archetype: consolidated.brand_dna.archetype,
      consolidated,
      live_state: liveState,
    });

    return {
      job_id: jobId,
      company_name: consolidated.company_name,
      category: consolidated.category,
      bio: consolidated.bio,
      tagline: consolidated.tagline,
      brand_voice: consolidated.brand_dna.tone_of_voice,
      logo_url: evidence.logoUrl || null,
      cover_url: evidence.coverUrl || null,
      instagram_url: evidence.instagramUrl || null,
      live_viewer_url: evidence.liveViewerUrl || null,
      screenshots: liveState.screenshots,
      logs: liveState.logs,
      contact: consolidated.contact,
      suggested_products: consolidated.suggested_products,
      theme_colors: {
        primary: consolidated.brand_kit.primary_color,
        secondary: consolidated.brand_kit.secondary_color,
        accent: consolidated.brand_kit.accent_color,
      },
      brand_dna: {
        archetype: consolidated.brand_dna.archetype,
        tone_of_voice: consolidated.brand_dna.tone_of_voice,
        seven_sins_triggers: consolidated.brand_dna.seven_sins_triggers,
      },
      briefing: {
        title: consolidated.briefing.title,
        swot_strengths: consolidated.briefing.swot_strengths,
        swot_opportunities: consolidated.briefing.swot_opportunities,
      },
      products_created_count: createdProductsCount,
    };
  } catch (pipelineErr: any) {
    liveState.logs.push({
      id: `log-err-${Date.now()}`,
      time: nowTime(),
      text: pipelineErr?.message || "Erro no pipeline de onboarding.",
      squad: "judge",
      status: "error",
    });
    await updateJobProgress(
      jobId,
      0,
      "failed",
      pipelineErr?.message || "Erro no pipeline de onboarding",
      { live_state: liveState }
    );
    throw pipelineErr;
  }
}

/**
 * Etapa 1 (Pré-flight rápido): Valida provedor de IA ativo ANTES de criar job ou mostrar progresso.
 */
export const startMagicOnboardingJob = createServerFn({ method: "POST" })
  .validator(MagicOnboardingInputSchema)
  .handler(async ({ data: input }): Promise<{ jobId: string; activeProviders: string[] }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação necessária para iniciar onboarding.");
    const storeId = input.store_id || identity.store_id || null;
    if (storeId) assertStoreAccess(identity, ["owner", "store_owner", "proprietario", "admin", "manager", "gerente"], storeId);

    const safeUrl = assertSafeUrl(input.url);
    const domain = safeUrl.hostname.replace(/^www\./, "");

    // Pré-flight obrigatório: nunca fingir extração sem provedor de IA ativo
    const aiCheck = await assertAiAvailableOrThrow(identity.id, storeId);

    const jobPayload: any = {
      task: "onboarding_ai_extraction",
      user_id: identity.id,
      status: "processing",
      progress_percent: 5,
      payload: {
        url: input.url,
        domain,
        store_id: storeId,
        initiated_by: identity.email || null,
      },
      result: {
        live_state: {
          logs: [
            {
              id: `log-start-${Date.now()}`,
              time: new Date().toLocaleTimeString("pt-BR", { hour12: false }),
              text: `IA ativa (${aiCheck.providers.join(", ")}). Conectando a ${domain}...`,
              squad: "crawl",
              status: "info",
            },
          ],
          screenshots: [],
          active_squad: "crawl",
          completed_squads: [],
        },
      },
    };
    if (storeId) jobPayload.store_id = storeId;

    const { data: jobRow, error: jobErr } = await supabase
      .from("ai_async_jobs")
      .insert(jobPayload)
      .select("id")
      .single();

    if (jobErr || !jobRow?.id) {
      throw new Error(`Falha ao registrar job de onboarding: ${jobErr?.message || "Erro interno"}`);
    }

    return { jobId: jobRow.id, activeProviders: aiCheck.providers };
  });

/**
 * Etapa 2: Executa o pipeline real para um jobId já validado e criado.
 */
export const runMagicOnboardingJob = createServerFn({ method: "POST" })
  .validator(
    MagicOnboardingInputSchema.extend({
      jobId: z.string().uuid("ID de job inválido"),
    })
  )
  .handler(async ({ data: input }): Promise<{ success: boolean; result: MagicOnboardingResult; message: string }> => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação necessária para executar onboarding.");
    const storeId = input.store_id || identity.store_id || null;
    if (storeId) assertStoreAccess(identity, ["owner", "store_owner", "proprietario", "admin", "manager", "gerente"], storeId);

    const safeUrl = assertSafeUrl(input.url);
    const domain = safeUrl.hostname.replace(/^www\./, "");

    await assertAiAvailableOrThrow(identity.id, storeId);

    const executePipeline = () =>
      runOnboardingPipelineForJob({
        jobId: input.jobId,
        url: input.url,
        domain,
        storeId,
        companyNameHint: input.company_name_hint,
        cityHint: input.city_hint,
        stateHint: input.state_hint,
        instagramHint: input.instagram_hint,
      });

    if (storeId) {
      const { result, tollboothReceipt } = await requireTokensOrTollbooth({
        storeId,
        tokens: ONBOARDING_AI_COST,
        actionType: "burn_magic_onboarding",
        serviceCategory: "magic_onboarding",
        description: `Onboarding Guiado por IA: ${domain}`,
        timeSavedMinutes: ONBOARDING_AI_TIME_SAVED_MINUTES,
        metadata: { target_url: input.url, domain, job_id: input.jobId },
        executeAction: executePipeline,
      });

      return {
        success: true,
        result,
        message: `Onboarding concluído com sucesso (${tollboothReceipt.tokensDeducted.toLocaleString("pt-BR")} Tokens debitados).`,
      };
    }

    const result = await executePipeline();
    return {
      success: true,
      result,
      message: "Dados da empresa minerados e estruturados com sucesso pela IA.",
    };
  });

/**
 * Inicia e executa o Onboarding Guiado por IA em chamada única (compatibilidade).
 */
export const executeMagicOnboarding = createServerFn({ method: "POST" })
  .validator(MagicOnboardingInputSchema)
  .handler(async ({ data: input }): Promise<{ success: boolean; result: MagicOnboardingResult; message: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação necessária para iniciar onboarding.");
    const storeId = input.store_id || identity.store_id || null;
    if (storeId) assertStoreAccess(identity, ["owner", "store_owner", "proprietario", "admin", "manager", "gerente"], storeId);

    const safeUrl = assertSafeUrl(input.url);
    const domain = safeUrl.hostname.replace(/^www\./, "");

    // Pré-flight obrigatório antes de criar job
    await assertAiAvailableOrThrow(identity.id, storeId);

    const jobPayload: any = {
      task: "onboarding_ai_extraction",
      user_id: identity.id || null,
      status: "processing",
      progress_percent: 5,
      payload: {
        url: input.url,
        domain,
        store_id: storeId,
        initiated_by: identity.email || null,
      },
    };
    if (storeId) {
      jobPayload.store_id = storeId;
    }

    const { data: jobRow, error: jobErr } = await supabase
      .from("ai_async_jobs")
      .insert(jobPayload)
      .select("id")
      .single();

    if (jobErr || !jobRow?.id) {
      throw new Error(`Falha ao registrar job de onboarding: ${jobErr?.message || "Erro interno"}`);
    }

    const jobId = jobRow.id;
    const processFullOnboardingPipeline = () =>
      runOnboardingPipelineForJob({
        jobId,
        url: input.url,
        domain,
        storeId,
        companyNameHint: input.company_name_hint,
        cityHint: input.city_hint,
        stateHint: input.state_hint,
        instagramHint: input.instagram_hint,
      });

    if (storeId) {
      const { result, tollboothReceipt } = await requireTokensOrTollbooth({
        storeId,
        tokens: ONBOARDING_AI_COST,
        actionType: "burn_magic_onboarding",
        serviceCategory: "magic_onboarding",
        description: `Onboarding Guiado por IA: ${domain}`,
        timeSavedMinutes: ONBOARDING_AI_TIME_SAVED_MINUTES,
        metadata: {
          target_url: input.url,
          domain,
          job_id: jobId,
        },
        executeAction: processFullOnboardingPipeline,
      });

      return {
        success: true,
        result,
        message: `Onboarding concluído com sucesso (${tollboothReceipt.tokensDeducted.toLocaleString("pt-BR")} Tokens debitados).`,
      };
    } else {
      const result = await processFullOnboardingPipeline();
      return {
        success: true,
        result,
        message: "Dados da empresa minerados e estruturados com sucesso pela IA.",
      };
    }
  });

/**
 * Consulta em tempo real o status e progresso percentual do Job Assíncrono no banco.
 */
export const getOnboardingJobStatus = createServerFn({ method: "GET" })
  .validator(
    z.object({
      jobId: z.string().uuid("ID de job inválido"),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação necessária para consultar jobs de onboarding.");
    const { data: job, error } = await supabase
      .from("ai_async_jobs")
      .select("id, store_id, status, progress_percent, error_message, result, started_at, finished_at")
      .eq("id", input.jobId)
      .eq("user_id", identity.id)
      .maybeSingle();

    if (error || !job) {
      throw new Error("Job de onboarding não encontrado.");
    }
    if (job.store_id) assertStoreAccess(identity, ["owner", "store_owner", "proprietario", "admin", "manager", "gerente", "content"], job.store_id);

    return job;
  });

/**
 * Persiste briefing, BrandKit, BrandDNA e catálogo para uma loja recém-criada
 * com base no job de onboarding executado previamente.
 */
export async function persistOnboardingForJob(storeId: string, jobId: string) {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "store_owner", "proprietario", "admin"], storeId);
  const { data: job, error } = await supabase
    .from("ai_async_jobs")
    .select("id, user_id, store_id, payload, result")
    .eq("id", jobId)
    .eq("user_id", identity.id)
    .maybeSingle();

  if (error) throw new Error(`Falha ao carregar o job de onboarding: ${error.message}`);
  if (!job) throw new Error("Job de onboarding não encontrado ou não pertence ao usuário autenticado.");
  if (job.store_id && job.store_id !== storeId) {
    throw new Error("O job de onboarding está vinculado a outro workspace.");
  }

  const consolidated = (job?.result as any)?.consolidated || (job?.payload as any)?.consolidated;
  const sourceUrl = (job?.payload as any)?.url || "";

  if (consolidated && consolidated.brand_dna) {
    const { persistOnboardingResults } = await import("./onboarding-pipeline.server");
    return await persistOnboardingResults(storeId, consolidated, sourceUrl, jobId);
  }
  throw new Error("O job de onboarding não possui resultado consolidado válido para persistência.");
}
