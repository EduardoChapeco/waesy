import { randomUUID } from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { encryptConversationMessageForThread } from "@/lib/conversation-crypto.server";
import { sendWithWhatsAppAdapter, OutboundAdapterError, type OutboundInstance } from "./whatsapp-outbound-adapters.server";

const MAX_BACKOFF_SECONDS = 60 * 60;

type ClaimedOutbox = {
  id: string;
  store_id: string;
  thread_id: string | null;
  channel_instance_id: string | null;
  provider: string;
  recipient_phone: string;
  message_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

type CircuitPermit = { allowed: boolean; circuit_state: string; retry_after_seconds: number };

export type WhatsAppWorkerResult = {
  workerId: string;
  claimed: number;
  accepted: number;
  retryableFailures: number;
  permanentFailures: number;
  deadLettered: number;
  skipped: number;
  circuitOpen: number;
};

function backoffSeconds(attempt: number): number {
  const base = Math.min(MAX_BACKOFF_SECONDS, 30 * 2 ** Math.max(0, attempt - 1));
  return base + Math.floor(Math.random() * Math.min(30, Math.max(1, base / 4)));
}

function errorText(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 1000);
  if (value instanceof Error) return value.message.slice(0, 1000);
  try { return JSON.stringify(value).slice(0, 1000); } catch { return "Erro desconhecido"; }
}

async function touchWorkerHeartbeat(
  db: ReturnType<typeof getServerClient>,
  workerId: string,
  patch: { status: "starting" | "running" | "degraded" | "idle" | "failed"; lastRunAt?: string; lastResult?: WhatsAppWorkerResult; lastError?: string | null },
) {
  const { error } = await db.from("whatsapp_worker_heartbeats").upsert({
    worker_id: workerId,
    status: patch.status,
    last_seen_at: new Date().toISOString(),
    last_run_at: patch.lastRunAt,
    last_result: patch.lastResult || {},
    last_error: patch.lastError || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "worker_id" });
  if (error) console.warn("[whatsapp-worker] heartbeat não persistido:", error.message);
}

async function refreshCampaignProgress(db: ReturnType<typeof getServerClient>, outboxId: string) {
  const { data: recipient } = await db.from("whatsapp_campaign_recipients").select("campaign_id").eq("outbox_id", outboxId).maybeSingle();
  if (!recipient?.campaign_id) return;
  const { count: pending } = await db.from("whatsapp_campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", recipient.campaign_id).in("status", ["eligible", "queued"]);
  if ((pending || 0) > 0) return;
  const { count: failed } = await db.from("whatsapp_campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", recipient.campaign_id).eq("status", "failed");
  await db.from("whatsapp_campaigns").update({ status: (failed || 0) > 0 ? "failed" : "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", recipient.campaign_id).in("status", ["running", "paused"]);
}
async function recordAttempt(db: ReturnType<typeof getServerClient>, row: ClaimedOutbox, workerId: string, data: {
  outcome: "accepted" | "retryable_failure" | "permanent_failure" | "dead_letter" | "skipped";
  httpStatus?: number;
  externalMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
}) {
  await db.from("whatsapp_outbox_attempts").insert({
    outbox_id: row.id,
    store_id: row.store_id,
    worker_id: workerId,
    attempt_number: row.attempts,
    provider: row.provider,
    ...data,
  });
}

async function acquireCircuitPermit(db: ReturnType<typeof getServerClient>, instanceId: string, workerId: string): Promise<CircuitPermit> {
  const { data, error } = await db.rpc("acquire_whatsapp_provider_circuit", { p_instance_id: instanceId, p_worker_id: workerId });
  if (error) throw new OutboundAdapterError("CIRCUIT_STATE_UNAVAILABLE", `Circuit breaker indisponível: ${error.message}`, true);
  const permit = (Array.isArray(data) ? data[0] : data) as CircuitPermit | null;
  if (!permit) throw new OutboundAdapterError("CIRCUIT_STATE_UNAVAILABLE", "Circuit breaker não retornou permissão", true);
  return permit;
}

async function recordCircuitResult(db: ReturnType<typeof getServerClient>, instanceId: string, workerId: string, success: boolean, error?: OutboundAdapterError | null) {
  const { error: rpcError } = await db.rpc("record_whatsapp_provider_circuit_result", {
    p_instance_id: instanceId,
    p_worker_id: workerId,
    p_success: success,
    p_error_code: error?.code || null,
    p_error_message: error?.message || null,
  });
  if (rpcError) console.warn("[whatsapp-worker] resultado do circuit breaker não persistido:", rpcError.message);
}

async function deferCircuitOpen(db: ReturnType<typeof getServerClient>, row: ClaimedOutbox, workerId: string, permit: CircuitPermit, durationMs: number) {
  const nextAttemptAt = new Date(Date.now() + Math.max(1, permit.retry_after_seconds) * 1000).toISOString();
  await db.from("whatsapp_outbox").update({ status: "failed", next_attempt_at: nextAttemptAt, locked_by: null, locked_at: null, last_error_code: "CIRCUIT_OPEN", last_error_message: `Provider temporariamente bloqueado (${permit.circuit_state})`, updated_at: new Date().toISOString() }).eq("id", row.id).eq("locked_by", workerId);
  await recordAttempt(db, row, workerId, { outcome: "skipped", errorCode: "CIRCUIT_OPEN", errorMessage: `Provider temporariamente bloqueado (${permit.circuit_state})`, durationMs, metadata: { circuit_state: permit.circuit_state, retry_after_seconds: permit.retry_after_seconds } });
}

async function finalizeFailure(db: ReturnType<typeof getServerClient>, row: ClaimedOutbox, workerId: string, data: {
  retryable: boolean;
  errorCode: string;
  errorMessage: string;
  httpStatus?: number;
  durationMs: number;
}) {
  const deadLetter = !data.retryable || row.attempts >= row.max_attempts;
  const nextAttemptAt = new Date(Date.now() + backoffSeconds(row.attempts) * 1000).toISOString();
  await db.from("whatsapp_outbox").update({
    status: deadLetter ? "dead_letter" : "failed",
    next_attempt_at: nextAttemptAt,
    locked_by: null,
    locked_at: null,
    last_error_code: data.errorCode,
    last_error_message: data.errorMessage,
    updated_at: new Date().toISOString(),
  }).eq("id", row.id).eq("locked_by", workerId);
  await db.from("whatsapp_campaign_recipients").update({
    status: "failed",
    error_code: data.errorCode,
    error_message: data.errorMessage,
    updated_at: new Date().toISOString(),
  }).eq("outbox_id", row.id);
  if (deadLetter) await refreshCampaignProgress(db, row.id);
  await recordAttempt(db, row, workerId, {
    outcome: deadLetter ? "dead_letter" : data.retryable ? "retryable_failure" : "permanent_failure",
    httpStatus: data.httpStatus,
    errorCode: data.errorCode,
    errorMessage: data.errorMessage,
    durationMs: data.durationMs,
  });
  return deadLetter;
}

async function resolveInstance(db: ReturnType<typeof getServerClient>, row: ClaimedOutbox): Promise<OutboundInstance> {
  if (row.channel_instance_id) {
    const { data, error } = await db.from("whatsapp_channel_instances").select("id, store_id, provider, instance_key, external_instance_id, phone_number_id, public_config, secret_payload_encrypted").eq("id", row.channel_instance_id).eq("store_id", row.store_id).eq("provider", row.provider).eq("is_active", true).maybeSingle();
    if (error || !data) throw new OutboundAdapterError("INVALID_CHANNEL_INSTANCE", "Instância outbound ausente, inativa ou incompatível com a loja", false);
    return data as OutboundInstance;
  }
  const { data, error } = await db.from("whatsapp_channel_instances").select("id, store_id, provider, instance_key, external_instance_id, phone_number_id, public_config, secret_payload_encrypted").eq("store_id", row.store_id).eq("provider", row.provider).eq("is_active", true).limit(2);
  if (error || !data || data.length !== 1) throw new OutboundAdapterError("AMBIGUOUS_CHANNEL_INSTANCE", "Item legado sem instância: é necessário exatamente uma instância ativa compatível", false);
  return data[0] as OutboundInstance;
}

async function processClaimedRow(db: ReturnType<typeof getServerClient>, row: ClaimedOutbox, workerId: string): Promise<"accepted" | "retryable_failure" | "permanent_failure" | "dead_letter" | "skipped"> {
  const startedAt = Date.now();
  try {
    const instance = await resolveInstance(db, row);
    const permit = await acquireCircuitPermit(db, instance.id, workerId);
    if (!permit.allowed) {
      await deferCircuitOpen(db, row, workerId, permit, Date.now() - startedAt);
      return "skipped";
    }
    const result = await sendWithWhatsAppAdapter(instance, { recipientPhone: row.recipient_phone, messageType: row.message_type, payload: row.payload });
    await recordCircuitResult(db, instance.id, workerId, true);
    await db.from("whatsapp_outbox").update({ status: "accepted", channel_instance_id: instance.id, external_message_id: result.externalMessageId, locked_by: null, locked_at: null, last_error_code: null, last_error_message: null, updated_at: new Date().toISOString() }).eq("id", row.id).eq("locked_by", workerId);
    await db.from("whatsapp_campaign_recipients").update({ status: "accepted", external_message_id: result.externalMessageId, error_code: null, error_message: null, updated_at: new Date().toISOString() }).eq("outbox_id", row.id);
    await refreshCampaignProgress(db, row.id);
    await db.from("whatsapp_delivery_events").upsert({ store_id: row.store_id, phone_number_id: instance.phone_number_id || instance.instance_key, external_message_id: result.externalMessageId, delivery_status: "accepted", recipient_phone: row.recipient_phone, payload: result.response, occurred_at: new Date().toISOString() }, { onConflict: "store_id,external_message_id,delivery_status" });
    if (row.thread_id) {
      const text = typeof row.payload.text === "string" ? row.payload.text : `[${row.message_type}]`;
      await db.from("chat_messages").insert({ thread_id: row.thread_id, message: await encryptConversationMessageForThread(row.store_id, row.thread_id, text), message_type: row.message_type, is_staff_reply: true, channel: "whatsapp", is_encrypted: true, encryption_version: 2, encrypted_at: new Date().toISOString(), external_message_id: result.externalMessageId, delivery_status: "accepted", sent_at: new Date().toISOString(), payload: { channel: "whatsapp", provider: row.provider, instance_id: instance.id, to: row.recipient_phone, message_id: result.externalMessageId } });
    }
    await recordAttempt(db, row, workerId, { outcome: "accepted", externalMessageId: result.externalMessageId, httpStatus: result.httpStatus, durationMs: Date.now() - startedAt, metadata: { channel_instance_id: instance.id } });
    return "accepted";
  } catch (error) {
    const adapterError = error instanceof OutboundAdapterError ? error : null;
    const message = errorText(error);
    if (adapterError?.retryable && adapterError.code !== "CIRCUIT_STATE_UNAVAILABLE") {
      try {
        const instance = await resolveInstance(db, row);
        await recordCircuitResult(db, instance.id, workerId, false, adapterError);
      } catch (circuitError) {
        console.warn("[whatsapp-worker] falha ao registrar erro no circuit breaker:", errorText(circuitError));
      }
    }
    const deadLetter = await finalizeFailure(db, row, workerId, { retryable: adapterError?.retryable ?? true, errorCode: adapterError?.code || "NETWORK_OR_TIMEOUT", errorMessage: message, httpStatus: adapterError?.httpStatus, durationMs: Date.now() - startedAt });
    return deadLetter ? "dead_letter" : adapterError?.retryable === false ? "permanent_failure" : "retryable_failure";
  }
}

/** Executa um lote. O scheduler/cron deve chamar esta função sem sessão de usuário. */
export async function runWhatsAppOutboxWorker(options?: {
  workerId?: string;
  batchSize?: number;
  leaseSeconds?: number;
}): Promise<WhatsAppWorkerResult> {
  const workerId = options?.workerId || `wa-worker-${randomUUID()}`;
  const db = getServerClient();
  const runStartedAt = new Date().toISOString();
  await touchWorkerHeartbeat(db, workerId, { status: "running", lastRunAt: runStartedAt });
  const { data: claimed, error } = await db.rpc("claim_whatsapp_outbox", {
    p_worker_id: workerId,
    p_batch_size: Math.min(100, Math.max(1, options?.batchSize || 25)),
    p_lease_seconds: Math.min(3600, Math.max(30, options?.leaseSeconds || 300)),
  });
  if (error) {
    await touchWorkerHeartbeat(db, workerId, { status: "failed", lastRunAt: runStartedAt, lastError: error.message });
    throw new Error(`Falha ao reivindicar outbox WhatsApp: ${error.message}`);
  }

  const result: WhatsAppWorkerResult = { workerId, claimed: claimed?.length || 0, accepted: 0, retryableFailures: 0, permanentFailures: 0, deadLettered: 0, skipped: 0, circuitOpen: 0 };
  for (const rawRow of (claimed || []) as ClaimedOutbox[]) {
    await touchWorkerHeartbeat(db, workerId, { status: "running", lastRunAt: runStartedAt });
    const outcome = await processClaimedRow(db, rawRow, workerId);
    if (outcome === "accepted") result.accepted++;
    else if (outcome === "retryable_failure") result.retryableFailures++;
    else if (outcome === "permanent_failure") result.permanentFailures++;
    else if (outcome === "dead_letter") result.deadLettered++;
    else { result.skipped++; result.circuitOpen++; }
  }
  await touchWorkerHeartbeat(db, workerId, {
    status: result.retryableFailures || result.permanentFailures || result.deadLettered ? "degraded" : "idle",
    lastRunAt: runStartedAt,
    lastResult: result,
  });
  return result;
}
