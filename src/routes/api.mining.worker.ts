import { createFileRoute } from "@tanstack/react-router";
import { processCrawlQueueBatch, enqueueRssItemsBatch, dispatchScheduledMiningJobFn } from "@/services/mining.functions";
import { executeAutomatedNewsHarvest } from "@/services/mining/automated-harvest";

async function handleWorkerExecution(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const workerSecret = process.env.MINING_WORKER_SECRET || process.env.CRON_SECRET;

    if (!workerSecret) {
      return new Response(JSON.stringify({ error: "Mining worker is not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (authHeader !== `Bearer ${workerSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const startTime = Date.now();
    const executionDeadline = startTime + 25000;
    const hasTimeRemaining = (): boolean => Date.now() < executionDeadline;

    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "all";
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    const results: Record<string, unknown> = {};

    const responseForResults = (payload: Record<string, unknown>, status = 200) => new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });

    const hasFailure = (value: unknown): boolean =>
      Boolean(value && typeof value === "object" && "success" in value && (value as { success?: unknown }).success === false);

    // Despacho agendado via pg_cron (market-data / rss-fetcher / continuous-crawler / cnpj-enrichment)
    if (mode === "cron" && hasTimeRemaining()) {
      const jobType = url.searchParams.get("jobType") as any;
      if (jobType) {
        const cronRes = await dispatchScheduledMiningJobFn({ data: { jobType } });
        results.cron = cronRes;
        return responseForResults({ success: !hasFailure(cronRes), timestamp: new Date().toISOString(), duration_ms: Date.now() - startTime, ...results }, hasFailure(cronRes) ? 502 : 200);
      }
    }

    if ((mode === "rss" || mode === "all") && hasTimeRemaining()) {
      const rssRes = await enqueueRssItemsBatch({ data: { limit: Math.min(limit, 50) } });
      results.rss = rssRes;
    }

    if ((mode === "queue" || mode === "all") && hasTimeRemaining()) {
      const queueRes = await processCrawlQueueBatch({ data: { limit: Math.min(limit, 10) } });
      results.queue = queueRes;
    }

    // Colheita de notícias automatizada com deduplicação SHA-256 e curadoria editorial
    if ((mode === "harvest" || mode === "news" || mode === "all") && hasTimeRemaining()) {
      const harvestRes = await executeAutomatedNewsHarvest({
        maxItems: Math.min(limit, 10),
      });
      results.harvest = harvestRes;
    }

    // Mineração de Estabelecimentos (Overpass / Nominatim)
    if (mode === "places" && hasTimeRemaining()) {
      const placesQuery = url.searchParams.get("query") || "comércio";
      const placesCity = url.searchParams.get("city") || "Chapecó";
      const { harvestAndPersistPlaces } = await import("@/services/mining/places-harvester");
      const placesRes = await harvestAndPersistPlaces({
        query: placesQuery,
        city: placesCity,
        state: "SC",
      }).catch((err) => ({ success: false, error: String(err) }));
      results.places = placesRes;
    }

    // Mineração de Hospedagens e Turismo
    if (mode === "lodging" && hasTimeRemaining()) {
      const lodgingQuery = url.searchParams.get("query") || "hotel pousada resort";
      const lodgingCity = url.searchParams.get("city") || "Chapecó";
      const { harvestAndPersistPlaces } = await import("@/services/mining/places-harvester");
      const lodgingRes = await harvestAndPersistPlaces({
        query: lodgingQuery,
        city: lodgingCity,
        state: "SC",
      }).catch((err) => ({ success: false, error: String(err) }));
      results.lodging = lodgingRes;
    }

    // Mineração de Licitações e Compras Públicas (PNCP)
    if ((mode === "tenders" || mode === "pncp") && hasTimeRemaining()) {
      const { harvestAndPersistPncpTenders } = await import("@/services/mining/pncp-harvester");
      const tendersRes = await harvestAndPersistPncpTenders({
        query: url.searchParams.get("query") || "Chapecó",
        uf: url.searchParams.get("uf") || "SC",
        codigoMunicipioIbge: url.searchParams.get("ibge") || "4204202",
        limit: Math.min(limit, 20),
      }).catch((err) => ({ success: false, insertedCount: 0, totalFound: 0, error: String(err) }));
      results.tenders = tendersRes;
    }

    // Mineração de Indicadores de Mercado (BCB / SGS)
    if (mode === "market-data" && hasTimeRemaining()) {
      const { syncAndPersistEconomicIndicators } = await import("@/services/mining/economic-indicators-persister");
      const marketRes = await syncAndPersistEconomicIndicators().catch((err) => ({
        success: false, totalSynced: 0, indicators: [], durationMs: 0, error: String(err),
      }));
      results.marketData = marketRes;
    }

    // Mineração e Monitoramento Processual DataJud
    if (mode === "datajud" && hasTimeRemaining()) {
      const processNumber = url.searchParams.get("process");
      if (processNumber) {
        const { harvestAndPersistDataJudProcess } = await import("@/services/mining/datajud-harvester");
        const legalRes = await harvestAndPersistDataJudProcess({
          processNumber,
        }).catch((err) => ({ success: false, error: String(err) }));
        results.datajud = legalRes;
      }
    }

    const failedKeys = Object.entries(results).filter(([, value]) => hasFailure(value)).map(([key]) => key);
    return responseForResults({
      success: failedKeys.length === 0,
      failed: failedKeys,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      ...results,
    }, failedKeys.length > 0 ? 502 : 200);
  } catch (e: any) {
    console.error("[mining-worker-api] Erro:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/mining/worker")({
  server: {
    handlers: {
      GET: async ({ request }) => handleWorkerExecution(request),
      POST: async ({ request }) => handleWorkerExecution(request),
    },
  },
});
