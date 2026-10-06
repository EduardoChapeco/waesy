import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export const WhatsAppOperationsMetricsSchema = z.object({ storeId: z.string().uuid().optional() });
export type WhatsAppOperationsMetricsDTO = {
  store_id: string;
  queue: { pending: number; processing: number; failed: number; dead_letter: number; accepted_24h: number; oldest_pending_seconds: number; retryable_failures_24h: number; p95_latency_ms_24h: number; throughput_24h: number };
  conversations: { open: number; unassigned: number; first_response_avg_seconds: number; first_response_p95_seconds: number };
  agents: Array<{ profile_id: string; open_threads: number; total_threads: number; avg_first_response_seconds: number | null; responded_threads: number }>;
  providers: Array<{ provider: string; attempts: number; accepted: number; failures: number; avg_duration_ms: number | null; p95_duration_ms: number | null }>;
  health: { worker_status: "starting" | "running" | "degraded" | "idle" | "failed" | "stale" | "unknown"; worker_last_seen_at: string | null; worker_last_run_at: string | null; worker_count: number; generated_at: string };
  generated_at: string;
};

export const getWhatsAppOperationsMetrics = createServerFn({ method: "GET" })
  .validator(WhatsAppOperationsMetricsSchema.optional())
  .handler(async ({ data }): Promise<WhatsAppOperationsMetricsDTO | null> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const storeId = data?.storeId || identity.store_id;
    if (storeId !== identity.store_id && !["owner", "admin", "manager", "master", "platform_admin"].includes(identity.role)) {
      throw new Error("Acesso negado ao tenant solicitado.");
    }
    const { data: metrics, error } = await getServerClient().rpc("get_whatsapp_operations_metrics", { p_store_id: storeId });
    if (error) throw new Error(`Falha ao consultar métricas WhatsApp: ${error.message}`);
    if (!metrics || typeof metrics !== "object") throw new Error("RPC de métricas retornou payload inválido.");
    return metrics as WhatsAppOperationsMetricsDTO;
  });
