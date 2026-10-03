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
import { getServerIdentity } from "@/lib/server-access";
import { requireTokensOrTollbooth } from "@/lib/token-tollbooth.server";
import { ONBOARDING_AI_COST, ONBOARDING_AI_TIME_SAVED_MINUTES } from "@/config/platform-billing.config";
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
} from "./onboarding-pipeline.server";

export interface MagicOnboardingResult {
  job_id: string;
  company_name: string;
  category: string;
  bio: string;
  brand_voice: string;
  tagline: string;
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

/**
 * Inicia ou executa o Onboarding Guiado por IA com tarifação em 20.000 Tokens da Plataforma.
 */
export const executeMagicOnboarding = createServerFn({ method: "POST" })
  .validator(
    z.object({
      url: z.string().url("URL do site ou Instagram inválida"),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data: input }): Promise<{ success: boolean; result: MagicOnboardingResult; message: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const storeId = input.store_id || identity.store_id || null;

    const safeUrl = assertSafeUrl(input.url);
    const domain = safeUrl.hostname.replace(/^www\./, "");

    // 1. Cria o registro de Job Assíncrono para rastreamento no banco
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

    // 2. Função Core Transacional do Pipeline Completo
    const processFullOnboardingPipeline = async (): Promise<MagicOnboardingResult> => {
      try {
        // A. Visita e captura com Firecrawl e Steel.dev (Screenshot + Scraping)
        const evidence = await captureWebEvidence(input.url, storeId || "", jobId);

        // B. Verificação Google Meu Negócio / Places
        const gmbEvidence = await fetchGoogleBusinessEvidence(storeId || "", evidence.domain);
        evidence.googleBusiness = gmbEvidence;

        await updateJobProgress(jobId, 45, "processing");

        // C. Concílio de IAs: Execução paralela dos 5 squads especializados
        const [designRes, copyRes, prRes, bizRes, marketRes] = await Promise.all([
          runDesignSquad(evidence),
          runCopySquad(evidence),
          runPrSquad(evidence),
          runBusinessStrategistSquad(evidence),
          runMarketAnalystSquad(evidence),
        ]);

        await updateJobProgress(jobId, 80, "processing");

        // D. Juiz Final e Reconciliação
        const consolidated: FinalConsolidatedBriefing = await runConsolidationAndJudge(
          evidence,
          designRes,
          copyRes,
          prRes,
          bizRes,
          marketRes
        );

        await updateJobProgress(jobId, 90, "processing");

        // E. Persistência E2E Atômica (apenas se loja já existir)
        let createdProductsCount = 0;
        if (storeId) {
          const persistRes = await persistOnboardingResults(
            storeId,
            consolidated,
            input.url,
            jobId
          );
          createdProductsCount = persistRes.createdProductsCount;
        }

        // F. Finalização do Job
        await updateJobProgress(jobId, 100, "completed", undefined, {
          company_name: consolidated.company_name,
          category: consolidated.category,
          products_created_count: createdProductsCount,
          archetype: consolidated.brand_dna.archetype,
          consolidated,
        });

        return {
          job_id: jobId,
          company_name: consolidated.company_name,
          category: consolidated.category,
          bio: consolidated.bio,
          tagline: consolidated.tagline,
          brand_voice: consolidated.brand_dna.tone_of_voice,
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
        // Marca job como failed e lança erro para acionar o auto-refund do Tollbooth
        await updateJobProgress(jobId, 0, "failed", pipelineErr.message || "Erro no pipeline de onboarding");
        throw pipelineErr;
      }
    };

    if (storeId) {
      // 3. Interceptador de Cobrança com Lock ACID e Auto-Refund (20.000 Tokens da Plataforma)
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
      // Extração em pré-onboarding para preenchimento ágil do cadastro
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
    const { data: job, error } = await supabase
      .from("ai_async_jobs")
      .select("id, status, progress_percent, error_message, result, started_at, finished_at")
      .eq("id", input.jobId)
      .maybeSingle();

    if (error || !job) {
      throw new Error("Job de onboarding não encontrado.");
    }

    return job;
  });

/**
 * Persiste briefing, BrandKit, BrandDNA e catálogo para uma loja recém-criada
 * com base no job de onboarding executado previamente.
 */
export async function persistOnboardingForJob(storeId: string, jobId: string) {
  const supabase = getServerClient();
  const { data: job } = await supabase
    .from("ai_async_jobs")
    .select("id, payload, result")
    .eq("id", jobId)
    .maybeSingle();

  const consolidated = (job?.result as any)?.consolidated || (job?.payload as any)?.consolidated;
  const sourceUrl = (job?.payload as any)?.url || "";

  if (consolidated && consolidated.brand_dna) {
    const { persistOnboardingResults } = await import("./onboarding-pipeline.server");
    return await persistOnboardingResults(storeId, consolidated, sourceUrl, jobId);
  }
  return null;
}
