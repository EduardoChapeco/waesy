import { createFileRoute } from "@tanstack/react-router";
import { noStoreJsonResponse as json } from "@/lib/utils";
import { timingSafeCompare } from "@/lib/crypto-vault.server";
import { runGlobalMetaAdsTwiceDailySync, syncStoreMetaAdsHierarchy } from "@/services/meta-ads-sync.server";

/**
 * Rota de Cron / Sync 2x ao Dia para Meta Ads 360:
 * Sincroniza campanhas, adsets, ads, effective_status e marca nos perfis dos leads
 * quando o anúncio de origem foi desativado.
 */
export const Route = createFileRoute("/api/cron/meta-ads-sync")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const expectedSecret = process.env.CRON_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
        const authHeader = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
        const cronHeader = request.headers.get("x-cron-secret")?.trim() || "";
        const token = authHeader || cronHeader;

        if (!expectedSecret || !token || !timingSafeCompare(token, expectedSecret)) {
          return json({ error: "Unauthorized cron trigger" }, 401);
        }

        const url = new URL(request.url);
        const storeId = url.searchParams.get("storeId")?.trim() || null;

        if (storeId) {
          const summary = await syncStoreMetaAdsHierarchy({ storeId });
          return json({ ok: true, mode: "single_store", summary });
        }

        const result = await runGlobalMetaAdsTwiceDailySync();
        return json({ ok: true, mode: "global_twice_daily", ...result });
      },
    },
  },
});
