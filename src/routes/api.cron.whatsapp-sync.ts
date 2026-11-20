import { createFileRoute } from "@tanstack/react-router";
import { hasValidWorkerToken } from "@/lib/ai/worker-auth";
import { getServerClient } from "@/lib/supabase";
import { resolveEvolutionGatewayAccess } from "@/services/whatsapp-evolution-config.server";
import {
  reapStaleWhatsAppSyncJobs,
  reconcileEvolutionWebhookIfNeeded,
  runEvolutionDeltaSyncForInstance,
} from "@/services/whatsapp-evolution-sync.server";
import { runWhatsAppOutboxWorker } from "@/services/whatsapp-outbox.worker";
import { replayPendingWebhookEvents } from "@/services/whatsapp-provider-webhook.server";

/**
 * Worker unificado de sincronizacao, health-check e outbox WhatsApp (Evolution + Meta + Agendamentos).
 * Executado via pg_cron / Cloudflare Cron mantendo orcamento estrito de subrequests por invocacao.
 */
export async function handleCronWhatsAppSync(request: Request): Promise<Response> {
  if (!hasValidWorkerToken(request)) {
    return Response.json(
      { error: "Token de cron inválido ou ausente." },
      { status: 401 },
    );
  }

  // EARS-RES-01: Bloqueio de consumo ocioso — exige opt-in explícito ou disparo manual autenticado
  const allowAutonomousCron =
    (typeof process !== "undefined" && process.env?.ENABLE_AUTONOMOUS_WHATSAPP_CRON === "true") ||
    request.headers.get("x-waesy-manual-trigger") === "true";
  let manualTriggerFromBody = false;
  if (!allowAutonomousCron && request.method === "POST") {
    const body = (await request.clone().json().catch(() => ({}))) as Record<string, unknown>;
    manualTriggerFromBody = body?.manualTrigger === true || body?.source === "manual";
  }
  if (!allowAutonomousCron && !manualTriggerFromBody) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: "autonomous_whatsapp_cron_disabled_ears_res_01",
      checkedAt: new Date().toISOString(),
    });
  }

  const db = getServerClient();
  const startedAt = new Date().toISOString();

  // 1. Limpar jobs de sync presos em 'running' ha > 3 minutos
  const reapedJobs = await reapStaleWhatsAppSyncJobs(db).catch(() => 0);

  // 2. Despachar fila whatsapp_outbox + whatsapp_scheduled_messages (tambem grava heartbeat)
  const outboxResult = await runWhatsAppOutboxWorker({
    batchSize: 25,
    workerId: "cron-whatsapp-sync",
  }).catch((err: any) => ({
    error: err?.message || "outbox_worker_error",
    processed: 0,
  }));

  // 3. Drenar / reprocessar eventos presos em whatsapp_provider_webhook_events
  const webhookReplay = await replayPendingWebhookEvents({ db, limit: 15 }).catch(
    (err: any) => ({
      error: err?.message || "webhook_replay_error",
      checked: 0,
      replayed: 0,
      resolvedDuplicates: 0,
      expired: 0,
      failed: 0,
    }),
  );

  // 4. Health-check, self-healing de webhook/status e delta sync incremental (max 3 instancias por ciclo)
  const { data: candidateInstances } = await db
    .from("whatsapp_channel_instances")
    .select(
      "id, store_id, instance_key, external_instance_id, provider, status, sync_mode, webhook_url, public_config, secret_payload_encrypted, last_health_check_at",
    )
    .eq("provider", "evolution_api")
    .eq("is_active", true)
    .in("status", ["connected", "pending", "disconnected"])
    .order("last_health_check_at", { ascending: true, nullsFirst: true })
    .limit(3);

  const instanceOutcomes: Array<{
    instanceId: string;
    storeId: string;
    instanceKey: string;
    liveState: string | null;
    webhookReconciled: boolean;
    deltaSync: {
      ran: boolean;
      importedChats: number;
      importedMessages: number;
      skipped?: boolean;
      error?: string;
    };
  }> = [];

  for (const inst of candidateInstances || []) {
    const nowIso = new Date().toISOString();
    const { baseUrl, apiKey, externalName } = resolveEvolutionGatewayAccess(inst as any);
    let liveState: string | null = null;
    let webhookReconciled = false;

    if (baseUrl && apiKey && externalName) {
      try {
        const stRes = await fetch(
          `${baseUrl}/instance/connectionState/${encodeURIComponent(externalName)}`,
          {
            method: "GET",
            headers: { apikey: apiKey },
            signal: AbortSignal.timeout(4500),
          },
        );
        if (stRes.ok) {
          const stJson = (await stRes.json().catch(() => ({}))) as Record<string, any>;
          liveState = String(stJson?.instance?.state || stJson?.state || "").toLowerCase() || null;
        }
      } catch {
        liveState = null;
      }

      if (liveState === "open") {
        if (inst.status !== "connected") {
          const pub = (inst.public_config && typeof inst.public_config === "object"
            ? inst.public_config
            : {}) as Record<string, unknown>;
          await db
            .from("whatsapp_channel_instances")
            .update({
              status: "connected",
              last_error_code: null,
              last_error_message: null,
              public_config: {
                ...pub,
                last_connected_at: nowIso,
                last_synced_state: "open",
                session_revoked: false,
              },
              last_health_check_at: nowIso,
              updated_at: nowIso,
            })
            .eq("id", inst.id);
        } else {
          await db
            .from("whatsapp_channel_instances")
            .update({ last_health_check_at: nowIso })
            .eq("id", inst.id);
        }

        const whRes = await reconcileEvolutionWebhookIfNeeded(db, inst as any, false).catch(() => null);
        webhookReconciled = Boolean(whRes?.reconciled);

        const pubCfg = (inst.public_config && typeof inst.public_config === "object"
          ? inst.public_config
          : {}) as Record<string, unknown>;
        const lastAutoMs =
          typeof pubCfg.last_auto_sync_at === "string" || typeof pubCfg.last_synced_at === "string"
            ? Date.parse(String(pubCfg.last_auto_sync_at || pubCfg.last_synced_at || 0)) || 0
            : 0;

        if (!lastAutoMs || Date.now() - lastAutoMs > 55_000 || inst.status !== "connected") {
          const syncRes = await runEvolutionDeltaSyncForInstance({
            db,
            instance: { ...inst, status: "connected" } as any,
            storeId: String(inst.store_id),
            mode: "delta",
            maxChats: 10,
            messagesPerChat: 8,
            force: inst.status !== "connected",
          }).catch((err: any) => ({
            success: false,
            skipped: false,
            importedChats: 0,
            importedMessages: 0,
            error: err?.message,
          }));

          instanceOutcomes.push({
            instanceId: inst.id,
            storeId: inst.store_id,
            instanceKey: inst.instance_key,
            liveState,
            webhookReconciled,
            deltaSync: {
              ran: !syncRes.skipped,
              importedChats: syncRes.importedChats || 0,
              importedMessages: syncRes.importedMessages || 0,
              skipped: syncRes.skipped,
              ...(syncRes.error ? { error: syncRes.error } : {}),
            },
          });
          continue;
        }
      } else {
        await db
          .from("whatsapp_channel_instances")
          .update({ last_health_check_at: nowIso })
          .eq("id", inst.id);
      }
    }

    instanceOutcomes.push({
      instanceId: inst.id,
      storeId: inst.store_id,
      instanceKey: inst.instance_key,
      liveState,
      webhookReconciled,
      deltaSync: { ran: false, importedChats: 0, importedMessages: 0 },
    });
  }

  return Response.json({
    ok: true,
    startedAt,
    completedAt: new Date().toISOString(),
    reapedJobs,
    outbox: outboxResult,
    webhookReplay,
    instances: instanceOutcomes,
  });
}

export const Route = createFileRoute("/api/cron/whatsapp-sync")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handleCronWhatsAppSync(request),
      POST: async ({ request }: { request: Request }) => handleCronWhatsAppSync(request),
    },
  },
} as never);
