import { createFileRoute } from "@tanstack/react-router";
import { dispatchScheduledMiningJobFn } from "@/services/mining.functions";
import { z } from "zod";

const CRON_TOKEN = "waesy_omni_cron_key_v2026";

const cronBodySchema = z.object({
  jobType: z.enum(["market-data", "rss-fetcher", "cnpj-enrichment", "continuous-crawler"]),
  triggeredAt: z.string().optional(),
  source: z.string().optional(),
});

async function handleCronWorker(request: Request): Promise<Response> {
  try {
    // Token validation
    const authHeader = request.headers.get("authorization") || "";
    const envToken = process.env.WAESY_CRON_TOKEN || CRON_TOKEN;

    if (authHeader !== `Bearer ${envToken}`) {
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
    const result = await dispatchScheduledMiningJobFn({ data: { jobType } });
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
        status: 200,
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
      POST: async ({ request }) => handleCronWorker(request),
    },
  },
});
