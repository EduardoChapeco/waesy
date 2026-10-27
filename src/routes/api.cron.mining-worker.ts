import { createFileRoute } from "@tanstack/react-router";
import { dispatchScheduledMiningJobFn } from "@/services/mining.functions";
import { z } from "zod";
import { enrichListingContacts } from "@/services/mining/contact-enrichment";

import type {} from "@tanstack/react-start";
export const cronBodySchema = z.object({
  jobType: z.enum([
    "market-data",
    "rss-fetcher",
    "rss-fetch",
    "cnpj-enrichment",
    "continuous-crawler",
    "crawl-batch",
    "datajud-sync",
    "queue-reaper",
    "ai-curate",
    "publish-approved",
    "events-harvest",
    "jobs-harvest",
    "places-harvest",
    "hospitality-harvest",
    "full-daily-pipeline",
    "contact-enrichment",
  ]),
  triggeredAt: z.string().optional(),
  source: z.string().optional(),
});

export async function handleCronWorker(request: Request): Promise<Response> {
  try {
    const authHeader = (request.headers.get("authorization") || "").trim();
    const envToken = process.env.WAESY_CRON_TOKEN || "waesy_omni_cron_key_v2026";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader;

    if (!token || token !== envToken) {
      console.warn("[cron-mining-worker] Unauthorized access attempt from:", request.headers.get("x-forwarded-for") || "unknown");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse body
    const body = await request.json().catch(() => ({}));
    const parsed = cronBodySchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { jobType, triggeredAt, source } = parsed.data;

    console.info(`[cron-mining-worker] Dispatching job="${jobType}" triggered_at="${triggeredAt}" source="${source}"`);

    const startTime = Date.now();
    const result =
      jobType === "contact-enrichment"
        ? await enrichListingContacts({ limit: 15 }).then((r) => ({ success: true, result: r as unknown }))
        : await dispatchScheduledMiningJobFn({ data: { jobType } });
    const durationMs = Date.now() - startTime;

    console.info(`[cron-mining-worker] Job "${jobType}" completed in ${durationMs}ms. Success=${result.success}`);

    return new Response(
      JSON.stringify({
        success: result.success,
        jobType,
        durationMs,
        timestamp: new Date().toISOString(),
        result: result.result,
      }),
      {
        status: result.success ? 200 : 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[cron-mining-worker] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const Route = createFileRoute("/api/cron/mining-worker")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => handleCronWorker(request),
    },
  },
} as never)
