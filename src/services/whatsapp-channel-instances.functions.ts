import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { encryptSecret, decryptSecret } from "@/lib/crypto-vault.server";
import { assertStoreWhatsAppInstanceAvailable } from "@/lib/architecture/module-plan-governance";

const ProviderSchema = z.enum(["meta_cloud_api", "evolution_api", "wasender_api", "render_bridge", "custom_webhook"]);
const ModeSchema = z.enum(["official", "unofficial"]);

export type WhatsAppChannelInstanceDTO = {
  id: string;
  store_id: string;
  display_name: string;
  provider: z.infer<typeof ProviderSchema>;
  connection_mode: z.infer<typeof ModeSchema>;
  instance_key: string;
  status: string;
  is_active: boolean;
  is_default: boolean;
  phone_number_id: string | null;
  business_account_id: string | null;
  display_phone_number: string | null;
  external_instance_id: string | null;
  webhook_url: string | null;
  public_config: Record<string, any>;
  capabilities: Record<string, any>;
  health_status: Record<string, any>;
  last_health_check_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
};

const PublicFields = "id, store_id, display_name, provider, connection_mode, instance_key, status, is_active, is_default, phone_number_id, business_account_id, display_phone_number, external_instance_id, webhook_url, public_config, capabilities, health_status, last_health_check_at, last_error_code, last_error_message, created_at, updated_at";

async function requireMaster() {
  const identity = await getServerIdentity();
  if (identity.role !== "platform_admin") throw new Error("Acesso restrito ao Admin Master.");
  return identity;
}

async function audit(instanceId: string | null, storeId: string, actorId: string, action: string, severity: "info" | "warning" | "error" = "info", metadata: Record<string, unknown> = {}) {
  await getServerClient().from("whatsapp_channel_audit_events").insert({ instance_id: instanceId, store_id: storeId, actor_id: actorId, action, severity, metadata });
}

export const listWorkspaceWhatsAppInstances = createServerFn({ method: "GET" })
  .validator((input?: { store_id?: string; storeId?: string }) => input)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const targetStoreId = data?.store_id || data?.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
    if (!targetStoreId) return [] as WhatsAppChannelInstanceDTO[];
    assertStoreAccess(identity, ["owner", "admin", "manager"], targetStoreId);
    const { data: list, error } = await getServerClient().from("whatsapp_channel_instances").select(PublicFields).eq("store_id", targetStoreId).order("created_at", { ascending: false });
    if (error) throw new Error(`Falha ao listar instâncias WhatsApp: ${error.message}`);
    return (list || []) as WhatsAppChannelInstanceDTO[];
  });

export const listMasterWhatsAppInstances = createServerFn({ method: "GET" }).handler(async () => {
  await requireMaster();
  const { data, error } = await getServerClient().from("whatsapp_channel_instances").select(PublicFields).order("store_id").order("created_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar instâncias globais: ${error.message}`);
  return (data || []) as WhatsAppChannelInstanceDTO[];
});

const SaveSchema = z.object({
  storeId: z.string().uuid().optional(),
  id: z.string().uuid().optional(),
  displayName: z.string().trim().min(2).max(100),
  provider: ProviderSchema,
  connectionMode: ModeSchema,
  instanceKey: z.string().trim().min(2).max(100).regex(/^[a-z0-9][a-z0-9_-]*$/),
  isActive: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  phoneNumberId: z.string().trim().max(100).optional(),
  businessAccountId: z.string().trim().max(100).optional(),
  displayPhoneNumber: z.string().trim().max(40).optional(),
  externalInstanceId: z.string().trim().max(150).optional(),
  webhookUrl: z.string().url().optional().or(z.literal("")),
  publicConfig: z.record(z.string(), z.unknown()).default({}),
  capabilities: z.record(z.string(), z.unknown()).default({}),
  secretPayload: z.record(z.string(), z.string()).default({}),
});

async function saveInstance(input: z.infer<typeof SaveSchema>, mode: "workspace" | "master") {
  const identity = mode === "master" ? await requireMaster() : await getServerIdentity();
  if (!identity.id) throw new Error("Identidade autenticada obrigatória para alterar instâncias.");
  const storeId = input.storeId || identity.store_id;
  if (!storeId) throw new Error("Loja obrigatória para a instância.");
  if (mode === "workspace") assertStoreAccess(identity, ["owner", "admin", "manager"]);
  if (input.connectionMode === "official" && input.provider !== "meta_cloud_api") throw new Error("Integração oficial deve usar Meta Cloud API.");
  if (input.connectionMode === "unofficial" && input.provider === "meta_cloud_api") throw new Error("Meta Cloud API não pode ser marcada como não oficial.");

  const db = getServerClient();
  if (mode === "workspace") {
    const [{ data: storeRow }, { data: existingInstances }] = await Promise.all([
      db.from("stores").select("id, name, slug, is_platform_root, plan_tier, settings").eq("id", storeId).single(),
      db.from("whatsapp_channel_instances").select("id, instance_key").eq("store_id", storeId),
    ]);
    const existingList = existingInstances || [];
    const isUpdatingExistingInstance = Boolean(
      (input.id && existingList.some((row: any) => row.id === input.id)) ||
        existingList.some((row: any) => row.instance_key === input.instanceKey)
    );
    assertStoreWhatsAppInstanceAvailable(storeRow, existingList.length, { isUpdatingExistingInstance });
  }
  const secretPayloadEncrypted = Object.keys(input.secretPayload).length > 0 ? encryptSecret(JSON.stringify(input.secretPayload)) : undefined;

  const targetIsDefault = Boolean(input.isDefault && input.isActive);
  if (targetIsDefault) {
    let demoteQuery = db
      .from("whatsapp_channel_instances")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .eq("is_default", true);
    if (input.id) {
      demoteQuery = demoteQuery.neq("id", input.id);
    }
    await demoteQuery;
  }

  const row = {
    ...(input.id ? { id: input.id } : {}),
    store_id: storeId,
    display_name: input.displayName,
    provider: input.provider,
    connection_mode: input.connectionMode,
    instance_key: input.instanceKey,
    status: input.isActive ? "pending" : "disabled",
    is_active: input.isActive,
    is_default: targetIsDefault,
    phone_number_id: input.phoneNumberId || null,
    business_account_id: input.businessAccountId || null,
    display_phone_number: input.displayPhoneNumber || null,
    external_instance_id: input.externalInstanceId || null,
    webhook_url: input.webhookUrl || null,
    public_config: input.publicConfig,
    capabilities: input.capabilities,
    ...(secretPayloadEncrypted ? { secret_payload_encrypted: secretPayloadEncrypted } : {}),
    updated_at: new Date().toISOString(),
    created_by: identity.id,
  };
  const { data, error } = await db.from("whatsapp_channel_instances").upsert(row, { onConflict: "store_id,instance_key" }).select(PublicFields).single();
  if (error) throw new Error(`Falha ao salvar instância WhatsApp: ${error.message}`);
  if (!data?.id) throw new Error("Instância salva sem identificador; operação abortada.");
  await audit(String(data.id), storeId, identity.id, input.id ? "instance.updated" : "instance.created", "info", { provider: input.provider, connection_mode: input.connectionMode, is_active: input.isActive });
  return data as WhatsAppChannelInstanceDTO;
}

export const saveWorkspaceWhatsAppInstance = createServerFn({ method: "POST" }).validator(SaveSchema.omit({ storeId: true })).handler(async ({ data }) => saveInstance(data, "workspace"));
export const saveMasterWhatsAppInstance = createServerFn({ method: "POST" }).validator(SaveSchema).handler(async ({ data }) => saveInstance(data, "master"));

const ToggleSchema = z.object({ id: z.string().uuid(), storeId: z.string().uuid().optional(), active: z.boolean() });
async function toggleInstance(input: z.infer<typeof ToggleSchema>, mode: "workspace" | "master") {
  const identity = mode === "master" ? await requireMaster() : await getServerIdentity();
  if (!identity.id) throw new Error("Identidade autenticada obrigatória para alterar instâncias.");
  const actorId = identity.id;
  const storeId = input.storeId || identity.store_id;
  if (!storeId) throw new Error("Loja autenticada obrigatória para alterar instâncias.");
  if (mode === "workspace") assertStoreAccess(identity, ["owner", "admin", "manager"]);
  const db = getServerClient();
  const updatePayload: Record<string, unknown> = {
    is_active: input.active,
    status: input.active ? "pending" : "disabled",
    updated_at: new Date().toISOString(),
  };
  if (!input.active) {
    updatePayload.is_default = false;
  }
  const { data, error } = await db
    .from("whatsapp_channel_instances")
    .update(updatePayload)
    .eq("id", input.id)
    .eq("store_id", storeId)
    .select(PublicFields)
    .single();
  if (error) throw new Error(`Falha ao alterar status da instância: ${error.message}`);
  await audit(String(input.id), storeId, actorId, input.active ? "instance.enabled" : "instance.disabled", input.active ? "info" : "warning");
  return data as WhatsAppChannelInstanceDTO;
}
export const toggleWorkspaceWhatsAppInstance = createServerFn({ method: "POST" }).validator(ToggleSchema.omit({ storeId: true })).handler(async ({ data }) => toggleInstance(data, "workspace"));
export const toggleMasterWhatsAppInstance = createServerFn({ method: "POST" }).validator(ToggleSchema).handler(async ({ data }) => toggleInstance(data, "master"));

export const listWhatsAppChannelAudit = createServerFn({ method: "GET" }).validator(z.object({ instanceId: z.string().uuid().optional(), storeId: z.string().uuid().optional() }).optional()).handler(async ({ data }) => {
  const identity = await getServerIdentity();
  const db = getServerClient();
  let query = db.from("whatsapp_channel_audit_events").select("id, instance_id, store_id, actor_id, action, severity, request_id, metadata, created_at").order("created_at", { ascending: false }).limit(100);
  if (identity.role === "platform_admin") {
    if (data?.storeId) query = query.eq("store_id", data.storeId);
  } else {
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    query = query.eq("store_id", identity.store_id);
  }
  if (data?.instanceId) query = query.eq("instance_id", data.instanceId);
  const { data: rows, error } = await query;
  if (error) throw new Error(`Falha ao consultar auditoria de canais: ${error.message}`);
  return rows || [];
});


// ─── Integração Direta Evolution API server-side e QR Code ao vivo ───

const DEFAULT_WEBHOOK_ORIGIN = process.env.VITE_APP_URL || process.env.VITE_SITE_URL || "https://waesy.com.br";

async function resolveEvolutionGatewayConfig(
  db: ReturnType<typeof getServerClient>,
  storeId: string,
  instance?: { id?: string; public_config?: Record<string, unknown> | null; secret_payload_encrypted?: string | null } | null,
): Promise<{ baseUrl: string; apiKey: string }> {
  let baseUrl = "";
  let apiKey = process.env.EVOLUTION_API_KEY?.trim() || "";

  const cfgUrl = typeof instance?.public_config?.base_url === "string" ? instance.public_config.base_url.trim() : "";
  if (cfgUrl && !cfgUrl.includes("147.15.61.45")) {
    baseUrl = cfgUrl.replace(/\/$/, "");
  }
  const envUrl = process.env.EVOLUTION_API_URL?.trim() || "";
  if (!baseUrl && envUrl && !envUrl.includes("147.15.61.45")) {
    baseUrl = envUrl.replace(/\/$/, "");
  }

  if (instance?.secret_payload_encrypted) {
    try {
      const parsed = JSON.parse(decryptSecret(instance.secret_payload_encrypted)) as Record<string, unknown>;
      if (!apiKey && typeof parsed.api_key === "string" && parsed.api_key.trim()) apiKey = parsed.api_key.trim();
      if (!baseUrl && typeof parsed.base_url === "string" && !parsed.base_url.includes("147.15.61.45")) {
        baseUrl = parsed.base_url.trim().replace(/\/$/, "");
      }
    } catch {
      // ignore
    }
  }

  if (!baseUrl || !apiKey) {
    const { data: rows } = await db
      .from("whatsapp_channel_instances")
      .select("id, store_id, public_config, secret_payload_encrypted")
      .eq("provider", "evolution_api")
      .not("secret_payload_encrypted", "is", null)
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(5);

    for (const row of rows || []) {
      const rCfg = (row.public_config && typeof row.public_config === "object" ? row.public_config : {}) as Record<string, unknown>;
      if (!baseUrl && typeof rCfg.base_url === "string" && rCfg.base_url.trim() && !rCfg.base_url.includes("147.15.61.45")) {
        baseUrl = rCfg.base_url.trim().replace(/\/$/, "");
      }
      if (row.secret_payload_encrypted) {
        try {
          const parsed = JSON.parse(decryptSecret(row.secret_payload_encrypted)) as Record<string, unknown>;
          if (!apiKey && typeof parsed.api_key === "string" && parsed.api_key.trim()) apiKey = parsed.api_key.trim();
          if (!baseUrl && typeof parsed.base_url === "string" && !parsed.base_url.includes("147.15.61.45")) {
            baseUrl = parsed.base_url.trim().replace(/\/$/, "");
          }
        } catch {
          // ignore
        }
      }
      if (baseUrl && apiKey) break;
    }
  }

  if (!baseUrl) {
    throw new Error("EVOLUTION_API_URL não configurada ou aponta para IP legado sem túnel HTTPS.");
  }
  if (!apiKey) {
    throw new Error("EVOLUTION_API_KEY não configurada no ambiente do servidor.");
  }
  return { baseUrl, apiKey };
}

export type WhatsAppDiagnosticSessionState =
  | "connected"
  | "connecting"
  | "disconnected"
  | "session_revoked"
  | "gateway_unreachable"
  | "tunnel_unavailable"
  | "unknown"
  | "temporary_send_failure";

export type WhatsAppSessionHealthEvaluation = {
  diagnosticState: WhatsAppDiagnosticSessionState;
  dbStatus: "connected" | "pending" | "disconnected" | "revoked" | "degraded";
  isHealthy: boolean;
  reason: string;
};

export function classifyWhatsAppSessionHealth(input: {
  connectionStateStatus?: string | null;
  connectionStateHttpStatus?: number | null;
  fetchInstancesRecord?: Record<string, unknown> | null;
  lastWebhookState?: string | null;
  lastWebhookAt?: string | null;
  lastConnectedAt?: string | null;
  lastSendFailureCode?: string | null;
  lastSendFailureAt?: string | null;
  hasQrCode?: boolean;
  networkError?: string | null;
}): WhatsAppSessionHealthEvaluation {
  const httpStatus = input.connectionStateHttpStatus ?? null;
  const netErr = String(input.networkError || "").toLowerCase();

  if (
    httpStatus === 502 ||
    httpStatus === 503 ||
    httpStatus === 504 ||
    httpStatus === 530 ||
    netErr.includes("cloudflare") ||
    netErr.includes("1033") ||
    netErr.includes("tunnel")
  ) {
    return {
      diagnosticState: "tunnel_unavailable",
      dbStatus: "degraded",
      isHealthy: false,
      reason: `Túnel com a VPS indisponível (${httpStatus ? `HTTP ${httpStatus}` : input.networkError}).`,
    };
  }

  if (httpStatus === null && netErr) {
    return {
      diagnosticState: "gateway_unreachable",
      dbStatus: "degraded",
      isHealthy: false,
      reason: `Gateway Evolution inacessível: ${input.networkError}`,
    };
  }

  const liveState = String(input.connectionStateStatus || "").toLowerCase();
  const fetchRec = input.fetchInstancesRecord || null;
  const fetchStatus = String(fetchRec?.connectionStatus || fetchRec?.state || "").toLowerCase();
  const disconnectCode = Number(fetchRec?.disconnectionReasonCode ?? 0);
  const disconnectAtMs = fetchRec?.disconnectionAt ? new Date(String(fetchRec.disconnectionAt)).getTime() : 0;
  const updatedAtMs = fetchRec?.updatedAt ? new Date(String(fetchRec.updatedAt)).getTime() : 0;
  const lastConnectedMs = input.lastConnectedAt ? new Date(input.lastConnectedAt).getTime() : 0;
  const lastWebhookMs = input.lastWebhookAt ? new Date(input.lastWebhookAt).getTime() : 0;

  // Avalia se disconnectionReasonCode = 401 é revogação atual ou histórico já superado por reconexão posterior
  const reconnectedAfterDisconnect =
    disconnectAtMs > 0 &&
    ((lastConnectedMs > disconnectAtMs) ||
      (input.lastWebhookState === "open" && lastWebhookMs > disconnectAtMs) ||
      (updatedAtMs > disconnectAtMs + 5000 && (liveState === "open" || fetchStatus === "open")));

  if (disconnectCode === 401 && !reconnectedAfterDisconnect && (fetchStatus === "close" || liveState === "close")) {
    return {
      diagnosticState: "session_revoked",
      dbStatus: "revoked",
      isHealthy: false,
      reason: "Sessão desconectada ou revogada pelo aparelho celular (código 401). Reconecte via QR Code.",
    };
  }

  // Divergência entre /instance/connectionState ("open") e /instance/fetchInstances ("close"): evita falso "connected" (estado zombie)
  if (liveState === "open" && fetchStatus === "close" && !reconnectedAfterDisconnect) {
    if (disconnectCode === 401) {
      return {
        diagnosticState: "session_revoked",
        dbStatus: "revoked",
        isHealthy: false,
        reason: "Estado divergente: connectionState reportou open, mas fetchInstances indica sessão revogada (401).",
      };
    }
    return {
      diagnosticState: "disconnected",
      dbStatus: "disconnected",
      isHealthy: false,
      reason: "Estado divergente: connectionState reportou open, mas a instância encontra-se fechada no catálogo do gateway.",
    };
  }

  if (liveState === "open") {
    const failureMs = input.lastSendFailureAt ? new Date(input.lastSendFailureAt).getTime() : 0;
    const isRecentSendFailure =
      input.lastSendFailureCode === "TEMPORARY_SEND_FAILURE" &&
      failureMs > 0 &&
      Date.now() - failureMs < 2 * 60 * 1000 &&
      failureMs > lastWebhookMs;
    if (isRecentSendFailure) {
      return {
        diagnosticState: "temporary_send_failure",
        dbStatus: "degraded",
        isHealthy: false,
        reason: "Sessão reportada como aberta, mas houve falha transitória recente de envio.",
      };
    }
    return {
      diagnosticState: "connected",
      dbStatus: "connected",
      isHealthy: true,
      reason: "Sessão conectada e validada em múltiplos sinais.",
    };
  }

  if (liveState === "connecting" || input.hasQrCode) {
    return {
      diagnosticState: "connecting",
      dbStatus: "pending",
      isHealthy: false,
      reason: "Aguardando leitura do QR Code ou negociação da sessão.",
    };
  }

  if (liveState === "close" || fetchStatus === "close") {
    return {
      diagnosticState: "disconnected",
      dbStatus: "disconnected",
      isHealthy: false,
      reason: "Sessão desconectada.",
    };
  }

  return {
    diagnosticState: "unknown",
    dbStatus: "degraded",
    isHealthy: false,
    reason: "Estado da sessão não pôde ser determinado com segurança.",
  };
}

export function normalizeWhatsAppQrDataUri(rawQr: unknown): string | null {
  if (typeof rawQr !== "string") return null;
  const trimmed = rawQr.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("<svg")) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
  }
  return `data:image/png;base64,${trimmed}`;
}

export function extractEvolutionQrPayload(payload: Record<string, any> | null | undefined): {
  qrCodeBase64: string | null;
  pairingCode: string | null;
} {
  if (!payload || typeof payload !== "object") {
    return { qrCodeBase64: null, pairingCode: null };
  }
  const rawQr =
    payload?.base64 ||
    payload?.qrcode?.base64 ||
    payload?.data?.base64 ||
    payload?.data?.qrcode?.base64 ||
    payload?.qr ||
    null;
  const rawPairing =
    payload?.pairingCode ||
    payload?.qrcode?.pairingCode ||
    payload?.data?.pairingCode ||
    payload?.data?.qrcode?.pairingCode ||
    null;
  return {
    qrCodeBase64: normalizeWhatsAppQrDataUri(rawQr),
    pairingCode: typeof rawPairing === "string" && rawPairing.trim() ? rawPairing.trim() : null,
  };
}

export function normalizePhoneE164FromJid(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/@.*$/, "").replace(/\D/g, "");
  return digits.length >= 8 ? `+${digits}` : null;
}

export const ConnectQrSchema = z.object({
  id: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  mode: z.enum(["create", "reconnect"]).optional(),
  displayName: z.string().trim().min(2).max(100).default("WhatsApp Principal"),
  instanceKey: z.string().trim().min(2).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/).optional(),
  department: z.string().trim().max(60).optional(),
  isGlobalMaster: z.boolean().default(false),
  autoImportHistory: z.boolean().default(false),
});

export async function _connectWhatsAppQrCodeInstance(data: z.infer<typeof ConnectQrSchema>) {
  const {
    id: instanceId,
    storeId: inputStoreId,
    mode: inputMode,
    displayName,
    instanceKey,
    department,
    isGlobalMaster,
    autoImportHistory,
  } = data;

  const identity = await getServerIdentity();
  if (!identity.id) throw new Error("Autenticação obrigatória para conectar WhatsApp.");

  const isMaster = identity.role === "platform_admin";
  if (isGlobalMaster && !isMaster) {
    throw new Error("Apenas o Admin Master pode configurar o Número Global da plataforma.");
  }
  if (!isMaster) {
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
  }

  const storeId = inputStoreId || identity.store_id;
  if (!storeId) throw new Error("Contexto de loja obrigatório para criar instância WhatsApp.");

  const db = getServerClient();
  const mode: "create" | "reconnect" = inputMode || (instanceId ? "reconnect" : "create");

  let existing: WhatsAppChannelInstanceDTO | null = null;
  if (mode === "reconnect" && instanceId) {
    const { data: found } = await db
      .from("whatsapp_channel_instances")
      .select(PublicFields)
      .eq("id", instanceId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!found) {
      throw new Error("Instância WhatsApp não encontrada nesta loja.");
    }
    existing = found as WhatsAppChannelInstanceDTO;
  }

  const shortStore = storeId.replace(/-/g, "").slice(0, 8);
  const cleanKey = (instanceKey || existing?.instance_key || `wa_${shortStore}`)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");

  if (mode === "create") {
    const [{ data: storeRow }, { data: existingInstances }] = await Promise.all([
      db.from("stores").select("id, name, slug, is_platform_root, plan_tier, settings").eq("id", storeId).maybeSingle(),
      db.from("whatsapp_channel_instances").select("id, instance_key, display_name").eq("store_id", storeId),
    ]);
    const existingList = existingInstances || [];
    const keyCollision = existingList.find((row: any) => String(row.instance_key).toLowerCase() === cleanKey);
    if (keyCollision) {
      throw new Error(
        `Já existe um canal WhatsApp com a chave "${cleanKey}" nesta loja (${keyCollision.display_name || cleanKey}). Escolha outro identificador para adicionar um novo número.`,
      );
    }
    if (!isMaster && storeRow) {
      assertStoreWhatsAppInstanceAvailable(storeRow, existingList.length, { isUpdatingExistingInstance: false });
    }
  }

  let externalName = existing?.external_instance_id || `waesy_${shortStore}_${cleanKey}`.slice(0, 48);
  const webhookUrl = `${DEFAULT_WEBHOOK_ORIGIN.replace(/\/$/, "")}/api/webhooks/whatsapp/evolution/${encodeURIComponent(externalName)}`;

  let qrBase64: string | null = null;
  let pairingCode: string | null = null;
  let connectionState: "connected" | "connecting" | "error" = "connecting";
  let gatewayErrorCode: string | null = null;
  let gatewayErrorMessage: string | null = null;
  let detectedPhone: string | null = existing?.display_phone_number || null;
  const { baseUrl, apiKey } = await resolveEvolutionGatewayConfig(db, storeId, existing as any);

  const fetchInstanceConnectQr = async (): Promise<{ qrCodeBase64: string | null; pairingCode: string | null }> => {
    const connectRes = await fetch(`${baseUrl}/instance/connect/${encodeURIComponent(externalName)}`, {
      method: "GET",
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(10000),
    });
    if (!connectRes.ok) return { qrCodeBase64: null, pairingCode: null };
    const connectJson = (await connectRes.json().catch(() => ({}))) as Record<string, any>;
    return extractEvolutionQrPayload(connectJson);
  };

  // 1. Verificar se a instância já existe na Evolution API
  try {
    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(externalName)}`, {
      method: "GET",
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(8000),
    });

    if (stateRes.ok) {
      const stateJson = (await stateRes.json().catch(() => ({}))) as Record<string, any>;
      let rawState = String(stateJson?.instance?.state || stateJson?.state || "").toLowerCase();

      // Verificação temporal anti-zombie alinhada com classifyWhatsAppSessionHealth
      if (rawState === "open") {
        const infoRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(externalName)}`, {
          method: "GET",
          headers: { apikey: apiKey },
          signal: AbortSignal.timeout(6000),
        }).catch(() => null);
        const infoList = infoRes && infoRes.ok ? await infoRes.json().catch(() => []) : [];
        const first = (Array.isArray(infoList) ? infoList[0] : infoList) as Record<string, any> | undefined;
        const fetchStatus = String(first?.connectionStatus || first?.state || "").toLowerCase();
        const ownerPhone = normalizePhoneE164FromJid(first?.ownerJid || first?.instance?.owner);
        if (ownerPhone) detectedPhone = ownerPhone;

        const disconnectAtMs = first?.disconnectionAt ? new Date(String(first.disconnectionAt)).getTime() : 0;
        const lastConnectedMs = existing?.public_config?.last_connected_at
          ? new Date(String(existing.public_config.last_connected_at)).getTime()
          : 0;
        const updatedAtMs = first?.updatedAt ? new Date(String(first.updatedAt)).getTime() : 0;
        const reconnectedAfterDisconnect =
          disconnectAtMs > 0 &&
          (lastConnectedMs > disconnectAtMs ||
            (updatedAtMs > disconnectAtMs + 5000 && (rawState === "open" || fetchStatus === "open")));

        const isZombieSession =
          (fetchStatus === "close" && !reconnectedAfterDisconnect) ||
          (!ownerPhone && Boolean(first?.disconnectionReasonCode || disconnectAtMs > 0) && !reconnectedAfterDisconnect);

        if (isZombieSession) {
          rawState = "close";
          // Cria identificador limpo para escapar do socket travado na VPS
          externalName = `waesy_${shortStore}_${cleanKey}_${Date.now().toString(36)}`.slice(0, 48);
        } else {
          connectionState = "connected";
        }
      }

      if (rawState !== "open") {
        const firstConnect = await fetchInstanceConnectQr();
        qrBase64 = firstConnect.qrCodeBase64;
        pairingCode = firstConnect.pairingCode;

        if (!qrBase64) {
          const freshCreateRes = await fetch(`${baseUrl}/instance/create`, {
            method: "POST",
            headers: { apikey: apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              instanceName: externalName,
              qrcode: true,
              integration: "WHATSAPP-BAILEYS",
              webhook: {
                url: webhookUrl,
                byEvents: false,
                base64: true,
                events: [
                  "QRCODE_UPDATED",
                  "CONNECTION_UPDATE",
                  "MESSAGES_UPSERT",
                  "MESSAGES_UPDATE",
                  "SEND_MESSAGE",
                ],
              },
            }),
            signal: AbortSignal.timeout(12000),
          }).catch(() => null);

          if (freshCreateRes && freshCreateRes.ok) {
            const freshJson = (await freshCreateRes.json().catch(() => ({}))) as Record<string, any>;
            const freshExtracted = extractEvolutionQrPayload(freshJson);
            qrBase64 = freshExtracted.qrCodeBase64;
            pairingCode = freshExtracted.pairingCode;
          }

          if (!qrBase64) {
            await fetch(`${baseUrl}/instance/restart/${encodeURIComponent(externalName)}`, {
              method: "PUT",
              headers: { apikey: apiKey },
              signal: AbortSignal.timeout(6000),
            }).catch(() => null);
            const retryConnect = await fetchInstanceConnectQr();
            qrBase64 = retryConnect.qrCodeBase64;
            pairingCode = retryConnect.pairingCode || pairingCode;
          }
        }
      }
    } else {
      const createRes = await fetch(`${baseUrl}/instance/create`, {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instanceName: externalName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          webhook: {
            url: webhookUrl,
            byEvents: false,
            base64: true,
            events: [
              "QRCODE_UPDATED",
              "CONNECTION_UPDATE",
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "SEND_MESSAGE",
            ],
          },
        }),
        signal: AbortSignal.timeout(12000),
      });

      const createJson = (await createRes.json().catch(() => ({}))) as Record<string, any>;
      if (createRes.ok) {
        const extracted = extractEvolutionQrPayload(createJson);
        qrBase64 = extracted.qrCodeBase64;
        pairingCode = extracted.pairingCode;
      } else if (createRes.status === 403 || createRes.status === 400 || createRes.status === 409) {
        const fallbackConnect = await fetchInstanceConnectQr();
        qrBase64 = fallbackConnect.qrCodeBase64;
        pairingCode = fallbackConnect.pairingCode;
        if (!qrBase64) {
          externalName = `waesy_${shortStore}_${cleanKey}_${Date.now().toString(36)}`.slice(0, 48);
          const freshCreateRes = await fetch(`${baseUrl}/instance/create`, {
            method: "POST",
            headers: { apikey: apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              instanceName: externalName,
              qrcode: true,
              integration: "WHATSAPP-BAILEYS",
              webhook: { url: webhookUrl, byEvents: false, base64: true, events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"] },
            }),
            signal: AbortSignal.timeout(12000),
          });
          const freshCreateJson = (await freshCreateRes.json().catch(() => ({}))) as Record<string, any>;
          const freshExtracted = extractEvolutionQrPayload(freshCreateJson);
          qrBase64 = freshExtracted.qrCodeBase64;
          pairingCode = freshExtracted.pairingCode;
          if (!qrBase64) {
            const followUp = await fetchInstanceConnectQr();
            qrBase64 = followUp.qrCodeBase64;
            pairingCode = followUp.pairingCode;
          }
        }
      } else {
        throw new Error(createJson?.response?.message?.[0] || createJson?.message || `Evolution API HTTP ${createRes.status}`);
      }

      if (!qrBase64) {
        const followUpConnect = await fetchInstanceConnectQr();
        qrBase64 = followUpConnect.qrCodeBase64;
        pairingCode = followUpConnect.pairingCode || pairingCode;
      }
    }
  } catch (err) {
    connectionState = "error";
    gatewayErrorCode = "GATEWAY_QR_ERROR";
    gatewayErrorMessage = `Falha ao comunicar com servidor WhatsApp (${baseUrl}): ${err instanceof Error ? err.message : "Erro de rede"}`;
  }

  // Proteção contra duplicidade caso a sessão recém-pareada já esteja ativa em outro card da loja
  if (connectionState === "connected" && detectedPhone) {
    let dupQuery = db
      .from("whatsapp_channel_instances")
      .select("id, display_name")
      .eq("store_id", storeId)
      .eq("display_phone_number", detectedPhone)
      .eq("status", "connected");
    if (existing?.id) dupQuery = dupQuery.neq("id", existing.id);
    const { data: duplicate } = await dupQuery.maybeSingle();
    if (duplicate) {
      await fetch(`${baseUrl}/instance/logout/${encodeURIComponent(externalName)}`, {
        method: "DELETE",
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      connectionState = "error";
      qrBase64 = null;
      pairingCode = null;
      detectedPhone = null;
      gatewayErrorCode = "DUPLICATE_PHONE_CONFLICT";
      gatewayErrorMessage = `Número já conectado em outra instância desta loja (${duplicate.display_name}). Desconecte a outra antes ou escaneie um chip diferente.`;
    }
  }

  const nowIso = new Date().toISOString();
  const updatedPublicConfig = {
    ...(existing?.public_config || {}),
    base_url: baseUrl,
    qr_code_url: qrBase64,
    pairing_code: pairingCode,
    department: department || existing?.public_config?.department || "Geral",
    is_global_master: isGlobalMaster || Boolean(existing?.public_config?.is_global_master),
    auto_import_history: autoImportHistory ?? (existing?.public_config as any)?.auto_import_history ?? false,
    last_qr_generated_at: nowIso,
    ...(connectionState === "connected" ? { last_connected_at: nowIso, session_revoked: false } : {}),
    last_error_message: gatewayErrorMessage,
  };

  const secretEncrypted = encryptSecret(
    JSON.stringify({
      api_key: apiKey,
      base_url: baseUrl,
    }),
  );

  const isConnected = connectionState === "connected";
  const mappedDbStatus = isConnected ? "connected" : connectionState === "error" ? "error" : "pending";

  const { data: existingDefault } = await db
    .from("whatsapp_channel_instances")
    .select("id")
    .eq("store_id", storeId)
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();

  const isThisAlreadyDefault = Boolean(existing?.id && existing.is_default && existingDefault?.id === existing.id);
  const hasOtherActiveDefault = Boolean(existingDefault && existingDefault.id !== existing?.id);
  const shouldBeDefault = (isThisAlreadyDefault || !hasOtherActiveDefault) && mappedDbStatus !== "error";

  if (shouldBeDefault) {
    let demoteDefaultQuery = db
      .from("whatsapp_channel_instances")
      .update({ is_default: false, updated_at: nowIso })
      .eq("store_id", storeId)
      .eq("is_default", true);
    if (existing?.id) {
      demoteDefaultQuery = demoteDefaultQuery.neq("id", existing.id);
    }
    await demoteDefaultQuery;
  }

  const persistPayload = {
    store_id: storeId,
    display_name: displayName || existing?.display_name || "WhatsApp Principal",
    provider: "evolution_api" as const,
    connection_mode: "unofficial" as const,
    instance_key: existing?.instance_key || cleanKey,
    external_instance_id: externalName,
    webhook_url: webhookUrl,
    status: mappedDbStatus,
    is_active: mappedDbStatus !== "error",
    is_default: shouldBeDefault,
    display_phone_number: detectedPhone,
    public_config: updatedPublicConfig,
    secret_payload_encrypted: secretEncrypted,
    last_error_code: gatewayErrorCode,
    last_error_message: gatewayErrorMessage,
    last_health_check_at: nowIso,
    updated_at: nowIso,
    created_by: identity.id,
  };

  const executePersist = async (payloadToSave: typeof persistPayload) => {
    if (existing?.id) {
      return db
        .from("whatsapp_channel_instances")
        .update(payloadToSave)
        .eq("id", existing.id)
        .eq("store_id", storeId)
        .select(PublicFields)
        .single();
    }
    return db
      .from("whatsapp_channel_instances")
      .insert(payloadToSave)
      .select(PublicFields)
      .single();
  };

  let saved: WhatsAppChannelInstanceDTO | null = null;
  const { data: initialSaved, error: initialError } = await executePersist(persistPayload);

  if (initialError) {
    if (
      initialError.message.includes("uq_whatsapp_default_instance_per_store") ||
      ((initialError as any).code === "23505" && initialError.message.includes("default"))
    ) {
      const { data: retrySaved, error: retryError } = await executePersist({ ...persistPayload, is_default: false });
      if (retryError) {
        throw new Error(`Erro ao persistir instância QR Code: ${retryError.message}`);
      }
      saved = retrySaved as WhatsAppChannelInstanceDTO;
    } else if (
      initialError.message.includes("uq_whatsapp_active_phone_per_store") ||
      ((initialError as any).code === "23505" && initialError.message.includes("phone"))
    ) {
      throw new Error("Este número de WhatsApp já está conectado em outro canal ativo desta loja.");
    } else {
      throw new Error(`Erro ao persistir instância QR Code: ${initialError.message}`);
    }
  } else {
    saved = initialSaved as WhatsAppChannelInstanceDTO;
  }

  if (!saved) {
    throw new Error("Erro desconhecido ao registrar instância WhatsApp.");
  }

  await audit(
    String(saved.id),
    storeId,
    identity.id,
    connectionState === "error" ? "instance.qr_error" : "instance.qr_requested",
    connectionState === "error" ? "error" : "info",
    {
      mode,
      external_instance_id: externalName,
      connection_state: connectionState,
      is_global_master: isGlobalMaster,
      error_message: gatewayErrorMessage,
    },
  );

  return {
    instance: saved as WhatsAppChannelInstanceDTO,
    qrCodeBase64: qrBase64,
    pairingCode,
    connectionState,
    errorMessage: gatewayErrorMessage,
  };
}

export const connectWhatsAppQrCodeInstance = createServerFn({ method: "POST" })
  .validator(ConnectQrSchema)
  .handler(async ({ data }) => _connectWhatsAppQrCodeInstance(data));

export const SyncWhatsAppStatusSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid().optional(),
});

export async function _syncWhatsAppInstanceStatus(data: z.infer<typeof SyncWhatsAppStatusSchema>) {
  const { id: instanceId, storeId: inputStoreId } = data;
  const identity = await getServerIdentity();
  if (!identity.id) throw new Error("Autenticação obrigatória.");
  const storeId = inputStoreId || identity.store_id;
  if (!storeId) throw new Error("Loja obrigatória.");
  if (identity.role !== "platform_admin") {
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"], storeId);
  }

  const db = getServerClient();
  const { data: instance, error } = await db
    .from("whatsapp_channel_instances")
    .select(PublicFields)
    .eq("id", instanceId)
    .eq("store_id", storeId)
    .single();

  if (error || !instance) throw new Error("Instância WhatsApp não encontrada.");
  if (instance.provider !== "evolution_api") {
    return {
      instance: instance as WhatsAppChannelInstanceDTO,
      state: instance.status,
      qrCodeBase64: normalizeWhatsAppQrDataUri((instance.public_config as any)?.qr_code_url),
      pairingCode: ((instance.public_config as any)?.pairing_code as string) || null,
      errorMessage: instance.last_error_message || null,
    };
  }

  const externalName = instance.external_instance_id || instance.instance_key;
  const { baseUrl, apiKey } = await resolveEvolutionGatewayConfig(db, storeId, instance as any);

  let liveState: string | null = null;
  let stateHttpStatus: number | null = null;
  let fetchRecord: Record<string, unknown> | null = null;
  let connectedPhone: string | null = instance.display_phone_number;
  let qrCodeBase64: string | null = normalizeWhatsAppQrDataUri((instance.public_config as any)?.qr_code_url);
  let pairingCode: string | null = ((instance.public_config as any)?.pairing_code as string) || null;
  let syncErrorMessage: string | null = null;

  try {
    const [stateRes, infoRes] = await Promise.all([
      fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(externalName)}`, {
        method: "GET",
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(6000),
      }),
      fetch(`${baseUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(externalName)}`, {
        method: "GET",
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(6000),
      }).catch(() => null),
    ]);

    stateHttpStatus = stateRes.status;
    if (stateRes.ok) {
      const json = (await stateRes.json().catch(() => ({}))) as Record<string, any>;
      liveState = String(json?.instance?.state || json?.state || "close").toLowerCase();
    } else {
      syncErrorMessage = `Gateway HTTP ${stateRes.status}`;
    }

    if (infoRes && infoRes.ok) {
      const infoList = await infoRes.json().catch(() => []);
      const first = (Array.isArray(infoList) ? infoList[0] : infoList) as Record<string, any> | undefined;
      if (first && typeof first === "object") {
        fetchRecord = first;
        const parsedPhone = normalizePhoneE164FromJid(first?.ownerJid || first?.instance?.owner);
        if (parsedPhone) connectedPhone = parsedPhone;
      }
    }

    if (liveState === "open") {
      qrCodeBase64 = null;
      pairingCode = null;
    } else if (stateRes.ok) {
      // Busca QR Code atualizado enquanto aguarda leitura
      const connectRes = await fetch(`${baseUrl}/instance/connect/${encodeURIComponent(externalName)}`, {
        method: "GET",
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(8000),
      });
      if (connectRes.ok) {
        const connectJson = (await connectRes.json().catch(() => ({}))) as Record<string, any>;
        const extracted = extractEvolutionQrPayload(connectJson);
        if (extracted.qrCodeBase64) qrCodeBase64 = extracted.qrCodeBase64;
        if (extracted.pairingCode) pairingCode = extracted.pairingCode;
      }
    }
  } catch (err) {
    syncErrorMessage = err instanceof Error ? err.message : "Oscilação de rede ao consultar gateway WhatsApp";
  }

  const currentPub = ((instance.public_config as Record<string, unknown>) || {});
  const health = classifyWhatsAppSessionHealth({
    connectionStateStatus: liveState,
    connectionStateHttpStatus: stateHttpStatus,
    fetchInstancesRecord: fetchRecord,
    lastWebhookState: typeof currentPub.last_webhook_state === "string" ? currentPub.last_webhook_state : null,
    lastWebhookAt: typeof currentPub.last_webhook_at === "string" ? currentPub.last_webhook_at : null,
    lastConnectedAt: typeof currentPub.last_connected_at === "string" ? currentPub.last_connected_at : null,
    lastSendFailureCode: instance.last_error_code,
    lastSendFailureAt: typeof currentPub.last_send_failure_at === "string" ? currentPub.last_send_failure_at : null,
    hasQrCode: Boolean(qrCodeBase64),
    networkError: syncErrorMessage,
  });

  const mappedStatus = health.dbStatus;
  const nowIso = new Date().toISOString();

  // Proteção contra número duplicado ativo no pareamento da mesma loja
  if (connectedPhone && (mappedStatus === "connected" || mappedStatus === "pending")) {
    const { data: duplicate } = await db
      .from("whatsapp_channel_instances")
      .select("id, display_name")
      .eq("store_id", storeId)
      .eq("display_phone_number", connectedPhone)
      .eq("status", "connected")
      .neq("id", instance.id)
      .maybeSingle();

    if (duplicate) {
      await fetch(`${baseUrl}/instance/logout/${encodeURIComponent(externalName)}`, {
        method: "DELETE",
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      const conflictMessage = `Número já conectado em outra instância desta loja (${duplicate.display_name}). Desconecte a outra antes ou escaneie um chip diferente.`;
      const { data: conflicted } = await db
        .from("whatsapp_channel_instances")
        .update({
          status: "error",
          is_active: false,
          is_default: false,
          display_phone_number: null,
          public_config: {
            ...currentPub,
            qr_code_url: null,
            pairing_code: null,
            last_error_message: conflictMessage,
            duplicate_conflict_instance_id: duplicate.id,
          },
          last_error_code: "DUPLICATE_PHONE_CONFLICT",
          last_error_message: conflictMessage,
          last_health_check_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", instance.id)
        .select(PublicFields)
        .single();

      await audit(String(instance.id), storeId, identity.id, "instance.duplicate_phone_blocked", "warning", {
        duplicate_instance_id: duplicate.id,
        duplicate_display_name: duplicate.display_name,
        phone: connectedPhone,
      });

      return {
        instance: (conflicted || instance) as WhatsAppChannelInstanceDTO,
        state: "error",
        diagnosticState: "disconnected" as const,
        qrCodeBase64: null,
        pairingCode: null,
        errorMessage: conflictMessage,
      };
    }
  }

  const nextPublicConfig = {
    ...currentPub,
    qr_code_url: mappedStatus === "connected" ? null : qrCodeBase64,
    pairing_code: mappedStatus === "connected" ? null : pairingCode,
    last_synced_state: liveState || "unknown",
    diagnostic_state: health.diagnosticState,
    diagnostic_reason: health.reason,
    ...(mappedStatus === "connected" ? { last_connected_at: nowIso, session_revoked: false } : {}),
    ...(health.diagnosticState === "session_revoked" ? { session_revoked: true } : {}),
    ...(mappedStatus !== "connected" && qrCodeBase64 ? { last_qr_generated_at: nowIso } : {}),
  };

  const { data: updated } = await db
    .from("whatsapp_channel_instances")
    .update({
      status: mappedStatus,
      is_active: mappedStatus === "connected" || instance.is_active,
      display_phone_number: connectedPhone,
      public_config: nextPublicConfig,
      last_error_code: mappedStatus === "connected" ? null : health.diagnosticState.toUpperCase(),
      last_error_message: mappedStatus === "connected" ? null : syncErrorMessage || health.reason,
      last_health_check_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", instance.id)
    .select(PublicFields)
    .single();

  return {
    instance: (updated || instance) as WhatsAppChannelInstanceDTO,
    state: mappedStatus,
    diagnosticState: health.diagnosticState,
    qrCodeBase64: mappedStatus === "connected" ? null : qrCodeBase64,
    pairingCode: mappedStatus === "connected" ? null : pairingCode,
    errorMessage: mappedStatus === "connected" ? null : syncErrorMessage || health.reason || null,
  };
}

export const syncWhatsAppInstanceStatus = createServerFn({ method: "POST" })
  .validator(SyncWhatsAppStatusSchema)
  .handler(async ({ data }) => _syncWhatsAppInstanceStatus(data));

export const disconnectWhatsAppInstanceSchema = z.object({
  id: z.string().uuid().optional(),
  instanceId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  store_id: z.string().uuid().optional(),
  deepDisconnect: z.boolean().optional(),
});

export const disconnectWhatsAppInstance = createServerFn({ method: "POST" })
  .validator(disconnectWhatsAppInstanceSchema)
  .handler(async ({ data }) => {
    const instanceId = data.id || data.instanceId;
    if (!instanceId) throw new Error("ID da instância obrigatório.");
    const inputStoreId = data.storeId || data.store_id;
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação obrigatória.");
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    if (identity.role !== "platform_admin") {
      assertStoreAccess(identity, ["owner", "admin", "manager"], storeId);
    }

    const db = getServerClient();
    const { data: instance } = await db
      .from("whatsapp_channel_instances")
      .select(PublicFields)
      .eq("id", instanceId)
      .eq("store_id", storeId)
      .single();

    if (!instance) throw new Error("Instância não localizada.");

    if (instance.provider === "evolution_api") {
      const externalName = instance.external_instance_id || instance.instance_key;
      const { baseUrl, apiKey } = await resolveEvolutionGatewayConfig(db, storeId, instance as any);
      // 1. Desconecta a sessão atual no WhatsApp Web
      await fetch(`${baseUrl}/instance/logout/${encodeURIComponent(externalName)}`, {
        method: "DELETE",
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(6000),
      }).catch(() => null);

      // 2. Se solicitada desconexão profunda, remove a instância na Evolution API
      if (data.deepDisconnect) {
        await fetch(`${baseUrl}/instance/delete/${encodeURIComponent(externalName)}`, {
          method: "DELETE",
          headers: { apikey: apiKey },
          signal: AbortSignal.timeout(6000),
        }).catch(() => null);
      }
    }

    const currentConfig = (instance.public_config && typeof instance.public_config === "object" ? instance.public_config : {}) as Record<string, unknown>;
    const { data: updated, error } = await db
      .from("whatsapp_channel_instances")
      .update({
        status: "disconnected",
        is_active: false,
        is_default: false,
        display_phone_number: data.deepDisconnect ? null : instance.display_phone_number,
        public_config: {
          ...currentConfig,
          qr_code_url: null,
          pairing_code: null,
          last_webhook_state: "close",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", instance.id)
      .select(PublicFields)
      .single();

    if (error) throw new Error(`Falha ao desconectar instância: ${error.message}`);

    // Se a instância desconectada era a padrão da loja, promove outra instância conectada e ativa (se houver)
    if (instance.is_default) {
      const { data: nextActive } = await db
        .from("whatsapp_channel_instances")
        .select("id")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .eq("status", "connected")
        .neq("id", instance.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextActive?.id) {
        await db
          .from("whatsapp_channel_instances")
          .update({ is_default: true, updated_at: new Date().toISOString() })
          .eq("id", nextActive.id);
      }
    }

    await audit(String(instance.id), storeId, identity.id, "instance.disconnected", "warning");
    return updated as WhatsAppChannelInstanceDTO;
  });

export const DeleteWhatsAppInstanceSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  forcePurge: z.boolean().optional(),
});

export async function _deleteWhatsAppInstance(
  input: z.infer<typeof DeleteWhatsAppInstanceSchema>,
  scope: "workspace" | "master",
) {
  const identity = scope === "master" ? await requireMaster() : await getServerIdentity();
  if (!identity.id) throw new Error("Autenticação obrigatória para excluir canal WhatsApp.");

  const db = getServerClient();
  let targetStoreId = scope === "master" ? input.storeId : input.storeId || identity.store_id;

  if (scope === "master" && !targetStoreId) {
    const { data: lookup } = await db
      .from("whatsapp_channel_instances")
      .select("store_id")
      .eq("id", input.id)
      .maybeSingle();
    targetStoreId = lookup?.store_id || identity.store_id || undefined;
  }

  if (!targetStoreId) throw new Error("Contexto de loja obrigatório para excluir instância WhatsApp.");

  if (scope === "workspace") {
    assertStoreAccess(identity, ["owner", "admin", "manager"], targetStoreId);
  }

  const { data: instance, error: findErr } = await db
    .from("whatsapp_channel_instances")
    .select(PublicFields)
    .eq("id", input.id)
    .eq("store_id", targetStoreId)
    .maybeSingle();

  if (findErr || !instance) {
    throw new Error("Instância WhatsApp não encontrada ou não pertence a esta loja.");
  }

  let gatewayCleanupOk = true;
  let gatewayCleanupError: string | null = null;
  if (instance.provider === "evolution_api") {
    try {
      const externalName = instance.external_instance_id || instance.instance_key;
      const { baseUrl, apiKey } = await resolveEvolutionGatewayConfig(db, targetStoreId, instance as any);
      await fetch(`${baseUrl}/instance/logout/${encodeURIComponent(externalName)}`, {
        method: "DELETE",
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      const delRes = await fetch(`${baseUrl}/instance/delete/${encodeURIComponent(externalName)}`, {
        method: "DELETE",
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(6000),
      });
      if (!delRes.ok && delRes.status !== 404) {
        gatewayCleanupOk = false;
        gatewayCleanupError = `Gateway HTTP ${delRes.status}`;
      }
    } catch (err) {
      gatewayCleanupOk = false;
      gatewayCleanupError = err instanceof Error ? err.message : "Gateway inacessível no momento da exclusão.";
    }
  }

  // Desvincula referências antes de remover definitivamente a instância, preservando histórico de threads e outbox
  await Promise.all([
    db
      .from("workspace_members")
      .update({ whatsapp_instance_id: null })
      .eq("store_id", targetStoreId)
      .eq("whatsapp_instance_id", instance.id),
    db
      .from("chat_threads")
      .update({ channel_instance_id: null })
      .eq("store_id", targetStoreId)
      .eq("channel_instance_id", instance.id),
    db
      .from("whatsapp_outbox")
      .update({ channel_instance_id: null })
      .eq("store_id", targetStoreId)
      .eq("channel_instance_id", instance.id),
    db
      .from("chat_departments")
      .update({ whatsapp_instance_id: null })
      .eq("store_id", targetStoreId)
      .eq("whatsapp_instance_id", instance.id),
  ]);

  await audit(
    String(instance.id),
    targetStoreId,
    identity.id,
    "instance.deleted",
    gatewayCleanupOk ? "info" : "warning",
    {
      deleted_instance_id: instance.id,
      display_name: instance.display_name,
      instance_key: instance.instance_key,
      display_phone_number: instance.display_phone_number,
      provider: instance.provider,
      force_purge: Boolean(input.forcePurge),
      gateway_cleanup_ok: gatewayCleanupOk,
      gateway_cleanup_error: gatewayCleanupError,
    },
  );

  const { error: deleteErr } = await db
    .from("whatsapp_channel_instances")
    .delete()
    .eq("id", instance.id)
    .eq("store_id", targetStoreId);

  if (deleteErr) {
    throw new Error(`Falha ao excluir instância WhatsApp do banco: ${deleteErr.message}`);
  }

  let promotedDefaultInstanceId: string | null = null;
  if (instance.is_default) {
    const { data: nextActive } = await db
      .from("whatsapp_channel_instances")
      .select("id")
      .eq("store_id", targetStoreId)
      .eq("is_active", true)
      .eq("status", "connected")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextActive?.id) {
      await db
        .from("whatsapp_channel_instances")
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq("id", nextActive.id)
        .eq("store_id", targetStoreId);
      promotedDefaultInstanceId = String(nextActive.id);
    }
  }

  return {
    deletedId: instance.id,
    storeId: targetStoreId,
    promotedDefaultInstanceId,
    gatewayCleanupOk,
    gatewayCleanupError,
  };
}

export const deleteWorkspaceWhatsAppInstance = createServerFn({ method: "POST" })
  .validator(DeleteWhatsAppInstanceSchema)
  .handler(async ({ data }) => _deleteWhatsAppInstance(data, "workspace"));

export const deleteMasterWhatsAppInstance = createServerFn({ method: "POST" })
  .validator(DeleteWhatsAppInstanceSchema)
  .handler(async ({ data }) => _deleteWhatsAppInstance(data, "master"));

export const UpdateWhatsAppInstanceMetadataSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  displayName: z.string().trim().min(2).max(100).optional(),
  department: z.string().trim().max(60).optional(),
  autoImportHistory: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export async function _updateWorkspaceWhatsAppInstanceMetadata(
  input: z.infer<typeof UpdateWhatsAppInstanceMetadataSchema>,
) {
  const identity = await getServerIdentity();
  if (!identity.id) throw new Error("Autenticação obrigatória.");
  const storeId = input.storeId || identity.store_id;
  if (!storeId) throw new Error("Loja obrigatória.");
  if (identity.role !== "platform_admin") {
    assertStoreAccess(identity, ["owner", "admin", "manager"], storeId);
  }

  const db = getServerClient();
  const { data: current, error: fetchErr } = await db
    .from("whatsapp_channel_instances")
    .select(PublicFields)
    .eq("id", input.id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (fetchErr || !current) throw new Error("Instância WhatsApp não encontrada.");

  const nowIso = new Date().toISOString();
  const nextPublicConfig = {
    ...(current.public_config || {}),
    ...(input.department !== undefined ? { department: input.department } : {}),
    ...(input.autoImportHistory !== undefined ? { auto_import_history: input.autoImportHistory } : {}),
  };

  let nextIsDefault = Boolean(current.is_default);
  if (input.isDefault === true) {
    if (!current.is_active && current.status !== "connected") {
      throw new Error("Conecte e ative este número antes de defini-lo como canal padrão da loja.");
    }
    await db
      .from("whatsapp_channel_instances")
      .update({ is_default: false, updated_at: nowIso })
      .eq("store_id", storeId)
      .eq("is_default", true)
      .neq("id", current.id);
    nextIsDefault = true;
  } else if (input.isDefault === false) {
    nextIsDefault = false;
  }

  const { data: updated, error } = await db
    .from("whatsapp_channel_instances")
    .update({
      ...(input.displayName ? { display_name: input.displayName } : {}),
      is_default: nextIsDefault,
      public_config: nextPublicConfig,
      updated_at: nowIso,
    })
    .eq("id", current.id)
    .eq("store_id", storeId)
    .select(PublicFields)
    .single();

  if (error || !updated) {
    throw new Error(`Falha ao atualizar metadados do canal WhatsApp: ${error?.message || "Erro desconhecido"}`);
  }

  await audit(String(current.id), storeId, identity.id, "instance.metadata_updated", "info", {
    display_name: updated.display_name,
    is_default: updated.is_default,
    department: nextPublicConfig.department,
  });

  return updated as WhatsAppChannelInstanceDTO;
}

export const updateWorkspaceWhatsAppInstanceMetadata = createServerFn({ method: "POST" })
  .validator(UpdateWhatsAppInstanceMetadataSchema)
  .handler(async ({ data }) => _updateWorkspaceWhatsAppInstanceMetadata(data));

// ─── Gestão de Setores (Filas), Atendentes e Permissões RBAC ─────────────────

export const WhatsAppDepartmentSchema = z.object({
  id: z.string().min(1),
  slug: z.string().trim().max(80).optional(),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(240).optional(),
  color: z.enum(["emerald", "blue", "amber", "purple", "rose", "slate"]).default("emerald"),
  routingMode: z.enum(["ai_sdr_first", "round_robin", "least_busy", "manual_queue"]).default("ai_sdr_first"),
  instanceIds: z.array(z.string()).default([]),
  assignedAgentIds: z.array(z.string()).default([]),
  roundRobinEnabled: z.boolean().default(true),
  aiSdrEnabled: z.boolean().default(true),
  aiSdrSkillPrompt: z.string().trim().max(1500).optional(),
  autoGreetingMessage: z.string().trim().max(1000).optional(),
  slaMinutes: z.number().min(1).max(1440).default(15),
  scheduleStart: z.string().default("08:00"),
  scheduleEnd: z.string().default("18:00"),
  scheduleDays: z.string().default("Seg a Sex"),
  awayMessage: z.string().optional(),
  whatsappInstanceId: z.string().optional(),
  isActive: z.boolean().default(true),
  aiTriageStages: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        instruction: z.string(),
        handoffToHuman: z.boolean().default(false),
      }),
    )
    .optional(),
});

export type WhatsAppDepartmentDTO = z.infer<typeof WhatsAppDepartmentSchema>;

export const ChatDepartmentRecordSchema = z.object({
  id: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  slug: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().nullable(),
  color: z.string().trim().max(32).default("emerald"),
  routingMode: z.enum(["ai_sdr_first", "round_robin", "least_busy", "manual_queue"]).default("ai_sdr_first"),
  slaMinutes: z.number().int().min(1).max(1440).default(15),
  whatsappInstanceId: z.string().uuid().optional().nullable(),
  scheduleStart: z.string().default("08:00"),
  scheduleEnd: z.string().default("18:00"),
  scheduleDays: z.string().default("Seg a Sex"),
  awayMessage: z.string().optional().nullable(),
  autoGreetingMessage: z.string().optional().nullable(),
  aiSdrEnabled: z.boolean().default(true),
  aiSdrSkillPrompt: z.string().optional().nullable(),
  roundRobinEnabled: z.boolean().default(true),
  assignedAgentIds: z.array(z.string().uuid()).default([]),
  aiTriageStages: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        instruction: z.string(),
        handoffToHuman: z.boolean().default(false),
      }),
    )
    .default([]),
  isActive: z.boolean().default(true),
});

export type ChatDepartmentDTO = {
  id: string;
  store_id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  routing_mode: "ai_sdr_first" | "round_robin" | "least_busy" | "manual_queue";
  sla_minutes: number;
  whatsapp_instance_id: string | null;
  schedule_start: string;
  schedule_end: string;
  schedule_days: string;
  away_message: string | null;
  auto_greeting_message: string | null;
  ai_sdr_enabled: boolean;
  ai_sdr_skill_prompt: string | null;
  round_robin_enabled: boolean;
  assigned_agent_ids: string[];
  ai_triage_stages: Array<{ id: string; title: string; instruction: string; handoffToHuman: boolean }>;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

function slugifyDepartment(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "geral"
  );
}

async function mirrorDepartmentsToGovernanceSettings(
  db: ReturnType<typeof getServerClient>,
  storeId: string,
  deptRows: any[],
) {
  const { data: storeRow } = await db.from("stores").select("settings").eq("id", storeId).maybeSingle();
  const currentSettings = ((storeRow?.settings as any) || {}) as Record<string, any>;
  const existingGov = (currentSettings.whatsapp_governance || {}) as Record<string, any>;

  const mappedDepts = deptRows.map((d: any) => ({
    id: d.id,
    slug: d.slug,
    name: d.name,
    description: d.description || undefined,
    color: (["emerald", "blue", "amber", "purple", "rose", "slate"].includes(String(d.color)) ? d.color : "emerald"),
    routingMode: d.routing_mode || "ai_sdr_first",
    slaMinutes: Number(d.sla_minutes || 15),
    whatsappInstanceId: d.whatsapp_instance_id || undefined,
    instanceIds: d.whatsapp_instance_id ? [d.whatsapp_instance_id] : [],
    assignedAgentIds: Array.isArray(d.assigned_agent_ids) ? d.assigned_agent_ids : [],
    roundRobinEnabled: Boolean(d.round_robin_enabled ?? true),
    aiSdrEnabled: Boolean(d.ai_sdr_enabled ?? true),
    aiSdrSkillPrompt: d.ai_sdr_skill_prompt || undefined,
    autoGreetingMessage: d.auto_greeting_message || undefined,
    scheduleStart: d.schedule_start || "08:00",
    scheduleEnd: d.schedule_end || "18:00",
    scheduleDays: d.schedule_days || "Seg a Sex",
    awayMessage: d.away_message || undefined,
    aiTriageStages: Array.isArray(d.ai_triage_stages) ? d.ai_triage_stages : [],
  }));

  await db
    .from("stores")
    .update({
      settings: {
        ...currentSettings,
        whatsapp_governance: {
          ...existingGov,
          departments: mappedDepts,
          updated_at: new Date().toISOString(),
        },
      },
    })
    .eq("id", storeId);
}

export async function _listChatDepartments(storeIdInput?: string): Promise<ChatDepartmentDTO[]> {
  const identity = await getServerIdentity();
  if (!identity.id) throw new Error("Autenticação obrigatória.");
  const storeId = storeIdInput || identity.store_id || identity.memberships?.[0]?.store_id;
  if (!storeId) return [];
  if (identity.role !== "platform_admin") {
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support", "cashier", "finance", "content", "stock"], storeId);
  }

  const db = getServerClient();
  const { data: rows, error } = await db
    .from("chat_departments")
    .select("*")
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  if (error) throw new Error(`Falha ao listar setores: ${error.message}`);

  if (rows && rows.length > 0) {
    return rows as ChatDepartmentDTO[];
  }

  // Fallback idempotente para lojas que tinham setores apenas em stores.settings.whatsapp_governance
  const { data: storeRow } = await db.from("stores").select("settings").eq("id", storeId).maybeSingle();
  const govDepts = ((storeRow?.settings as any)?.whatsapp_governance?.departments || []) as any[];
  if (Array.isArray(govDepts) && govDepts.length > 0) {
    const seeded = govDepts.map((d) => ({
      store_id: storeId,
      slug: d.slug || slugifyDepartment(String(d.name || d.id || "geral")),
      name: String(d.name || "Geral"),
      description: d.description || null,
      color: String(d.colorToken || d.color || "emerald"),
      routing_mode: d.routingMode || "ai_sdr_first",
      sla_minutes: Number(d.slaMinutes || 15),
      whatsapp_instance_id: z.string().uuid().safeParse(d.whatsappInstanceId).success ? d.whatsappInstanceId : null,
      schedule_start: d.scheduleStart || "08:00",
      schedule_end: d.scheduleEnd || "18:00",
      schedule_days: d.scheduleDays || "Seg a Sex",
      away_message: d.awayMessage || null,
      auto_greeting_message: d.autoGreetingMessage || null,
      ai_sdr_enabled: Boolean(d.aiSdrEnabled ?? true),
      ai_sdr_skill_prompt: d.aiSdrSkillPrompt || null,
      round_robin_enabled: Boolean(d.roundRobinEnabled ?? true),
      assigned_agent_ids: Array.isArray(d.assignedAgentIds)
        ? d.assignedAgentIds.filter((id: string) => z.string().uuid().safeParse(id).success)
        : [],
      ai_triage_stages: Array.isArray(d.aiTriageStages) ? d.aiTriageStages : [],
      is_active: true,
    }));
    const { data: inserted } = await db
      .from("chat_departments")
      .upsert(seeded, { onConflict: "store_id,slug" })
      .select("*");
    if (inserted) return inserted as ChatDepartmentDTO[];
  }

  return [];
}

export const listChatDepartments = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => _listChatDepartments(data?.storeId));

export async function _upsertChatDepartment(input: z.infer<typeof ChatDepartmentRecordSchema>) {
  const identity = await getServerIdentity();
  if (!identity.id) throw new Error("Autenticação obrigatória.");
  const storeId = input.storeId || identity.store_id;
  if (!storeId) throw new Error("Loja obrigatória.");
  if (identity.role !== "platform_admin") {
    assertStoreAccess(identity, ["owner", "admin", "manager"], storeId);
  }

  const db = getServerClient();
  const cleanSlug = slugifyDepartment(input.slug || input.name);
  const nowIso = new Date().toISOString();

  const payload = {
    store_id: storeId,
    slug: cleanSlug,
    name: input.name.trim(),
    description: input.description || null,
    color: input.color,
    routing_mode: input.routingMode,
    sla_minutes: input.slaMinutes,
    whatsapp_instance_id: input.whatsappInstanceId || null,
    schedule_start: input.scheduleStart,
    schedule_end: input.scheduleEnd,
    schedule_days: input.scheduleDays,
    away_message: input.awayMessage || null,
    auto_greeting_message: input.autoGreetingMessage || null,
    ai_sdr_enabled: input.aiSdrEnabled,
    ai_sdr_skill_prompt: input.aiSdrSkillPrompt || null,
    round_robin_enabled: input.roundRobinEnabled,
    assigned_agent_ids: input.assignedAgentIds || [],
    ai_triage_stages: input.aiTriageStages || [],
    is_active: input.isActive,
    updated_at: nowIso,
  };

  let saved: ChatDepartmentDTO;
  if (input.id) {
    const { data, error } = await db
      .from("chat_departments")
      .update(payload)
      .eq("id", input.id)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error || !data) throw new Error(`Falha ao atualizar setor: ${error?.message || "Setor não encontrado."}`);
    saved = data as ChatDepartmentDTO;
  } else {
    const { data, error } = await db
      .from("chat_departments")
      .upsert(payload, { onConflict: "store_id,slug" })
      .select("*")
      .single();
    if (error || !data) throw new Error(`Falha ao salvar setor: ${error?.message || "Erro desconhecido."}`);
    saved = data as ChatDepartmentDTO;
  }

  const { data: allRows } = await db
    .from("chat_departments")
    .select("*")
    .eq("store_id", storeId)
    .order("name", { ascending: true });
  if (allRows) {
    await mirrorDepartmentsToGovernanceSettings(db, storeId, allRows);
  }

  return saved;
}

export const upsertChatDepartment = createServerFn({ method: "POST" })
  .validator(ChatDepartmentRecordSchema)
  .handler(async ({ data }) => _upsertChatDepartment(data));

export async function _deleteChatDepartment(input: { id: string; storeId?: string }) {
  const identity = await getServerIdentity();
  if (!identity.id) throw new Error("Autenticação obrigatória.");
  const storeId = input.storeId || identity.store_id;
  if (!storeId) throw new Error("Loja obrigatória.");
  if (identity.role !== "platform_admin") {
    assertStoreAccess(identity, ["owner", "admin", "manager"], storeId);
  }

  const db = getServerClient();
  await db
    .from("workspace_members")
    .update({ department_id: null })
    .eq("store_id", storeId)
    .eq("department_id", input.id);

  const { error } = await db
    .from("chat_departments")
    .delete()
    .eq("id", input.id)
    .eq("store_id", storeId);

  if (error) throw new Error(`Falha ao excluir setor: ${error.message}`);

  const { data: remaining } = await db
    .from("chat_departments")
    .select("*")
    .eq("store_id", storeId)
    .order("name", { ascending: true });
  await mirrorDepartmentsToGovernanceSettings(db, storeId, remaining || []);

  return { deletedId: input.id };
}

export const deleteChatDepartment = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), storeId: z.string().uuid().optional() }))
  .handler(async ({ data }) => _deleteChatDepartment(data));

export const WhatsAppGovernanceConfigSchema = z.object({
  instanceId: z.string().uuid().optional(),
  agentPermissions: z
    .array(
      z.object({
        agentId: z.string(),
        name: z.string().optional(),
        whatsappInstanceId: z.string().optional(),
        onlyAssignedOrSector: z.boolean().default(false),
        canTransfer: z.boolean().default(true),
        canCloseTicket: z.boolean().default(true),
        canManageQr: z.boolean().default(false),
      }),
    )
    .optional(),
  departments: z.array(WhatsAppDepartmentSchema),
  permissions: z.object({
    onlyManagersCanViewQr: z.boolean().default(true),
    onlyManagersCanDisconnect: z.boolean().default(true),
    showAgentNamePrefixInMessages: z.boolean().default(true),
    autoConvertIncomingToLead: z.boolean().default(true),
    defaultLeadSource: z.string().default("WhatsApp Orgânico"),
    enableMobilityBookingBot: z.boolean().default(false),
    enableCatalogSalesBot: z.boolean().default(true),
    enableCorporateTravelBot: z.boolean().default(false),
  }),
});

export const saveWhatsAppGovernanceConfig = createServerFn({ method: "POST" })
  .validator(WhatsAppGovernanceConfigSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação obrigatória.");
    if (identity.role !== "platform_admin") {
      assertStoreAccess(identity, ["owner", "admin", "manager"]);
    }
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");

    const db = getServerClient();
    const nowIso = new Date().toISOString();

    // Sincroniza 1:1 com public.chat_departments mantendo slug/id consistentes
    for (const dept of data.departments) {
      const slug = slugifyDepartment(dept.slug || dept.name || dept.id);
      const validUuidAgents = (dept.assignedAgentIds || []).filter((id) => z.string().uuid().safeParse(id).success);
      const prefInstance = dept.whatsappInstanceId && z.string().uuid().safeParse(dept.whatsappInstanceId).success
        ? dept.whatsappInstanceId
        : (dept.instanceIds || []).find((id) => z.string().uuid().safeParse(id).success) || null;

      await db.from("chat_departments").upsert(
        {
          store_id: storeId,
          slug,
          name: dept.name,
          description: dept.description || null,
          color: dept.color,
          routing_mode: dept.routingMode,
          sla_minutes: dept.slaMinutes,
          whatsapp_instance_id: prefInstance,
          schedule_start: dept.scheduleStart,
          schedule_end: dept.scheduleEnd,
          schedule_days: dept.scheduleDays,
          away_message: dept.awayMessage || null,
          auto_greeting_message: dept.autoGreetingMessage || null,
          ai_sdr_enabled: dept.aiSdrEnabled,
          ai_sdr_skill_prompt: dept.aiSdrSkillPrompt || null,
          round_robin_enabled: dept.roundRobinEnabled,
          assigned_agent_ids: validUuidAgents,
          ai_triage_stages: dept.aiTriageStages || [],
          is_active: dept.isActive ?? true,
          updated_at: nowIso,
        },
        { onConflict: "store_id,slug" },
      );
    }

    // Sincroniza vínculos individuais de agentes em workspace_members quando informados
    for (const perm of data.agentPermissions || []) {
      if (!z.string().uuid().safeParse(perm.agentId).success) continue;
      const validWa =
        perm.whatsappInstanceId && z.string().uuid().safeParse(perm.whatsappInstanceId).success
          ? perm.whatsappInstanceId
          : null;
      await db
        .from("workspace_members")
        .update({
          ...(perm.whatsappInstanceId !== undefined ? { whatsapp_instance_id: validWa } : {}),
          only_assigned_or_sector: perm.onlyAssignedOrSector,
          can_transfer_chats: perm.canTransfer,
          can_close_chats: perm.canCloseTicket,
          can_manage_whatsapp_qr: perm.canManageQr,
        })
        .eq("store_id", storeId)
        .eq("profile_id", perm.agentId);
    }

    const { data: storeRow } = await db.from("stores").select("settings").eq("id", storeId).maybeSingle();
    const currentSettings = ((storeRow?.settings as any) || {}) as Record<string, any>;
    await db
      .from("stores")
      .update({
        settings: {
          ...currentSettings,
          whatsapp_governance: {
            departments: data.departments,
            permissions: data.permissions,
            agentPermissions: data.agentPermissions || [],
            updated_at: nowIso,
          },
        },
      })
      .eq("id", storeId);

    if (!data.instanceId) {
      return {
        id: storeId,
        store_id: storeId,
        public_config: {
          departments: data.departments,
          governance_permissions: data.permissions,
          agent_permissions: data.agentPermissions || [],
        },
      } as unknown as WhatsAppChannelInstanceDTO;
    }

    const { data: current } = await db
      .from("whatsapp_channel_instances")
      .select(PublicFields)
      .eq("id", data.instanceId)
      .eq("store_id", storeId)
      .single();

    if (!current) throw new Error("Instância não encontrada.");

    const updatedConfig = {
      ...(current.public_config || {}),
      departments: data.departments,
      governance_permissions: data.permissions,
      agent_permissions: data.agentPermissions || [],
      updated_governance_at: nowIso,
    };

    const { data: saved, error } = await db
      .from("whatsapp_channel_instances")
      .update({
        public_config: updatedConfig,
        updated_at: nowIso,
      })
      .eq("id", data.instanceId)
      .select(PublicFields)
      .single();

    if (error) throw new Error(`Erro ao salvar governança de atendimento: ${error.message}`);
    await audit(data.instanceId, storeId, identity.id, "governance.updated", "info", {
      departments_count: data.departments.length,
    });
    return saved as WhatsAppChannelInstanceDTO;
  });

export const syncWhatsAppChatsFromEvolution = createServerFn({ method: "POST" })
  .validator(z.object({ instanceId: z.string().uuid().optional(), storeId: z.string().uuid().optional(), store_id: z.string().uuid().optional(), forceImport: z.boolean().optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação obrigatória.");
    const targetStoreId = data?.storeId || data?.store_id || identity.store_id || identity.memberships?.[0]?.store_id;
    if (!targetStoreId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, ["owner", "admin", "manager", "support", "agent", "sales"], targetStoreId);
    const storeId = (identity as any).store_id || targetStoreId;

    const db = getServerClient();
    let query = db
      .from("whatsapp_channel_instances")
      .select("id, store_id, provider, instance_key, external_instance_id, public_config, display_phone_number")
      .eq("store_id", storeId)
      .eq("provider", "evolution_api")
      .eq("is_active", true);

    if (data?.instanceId) {
      query = query.eq("id", data.instanceId);
    } else {
      query = query.order("is_default", { ascending: false }).limit(1);
    }

    const { data: instance, error } = await query.maybeSingle();
    if (error || !instance) throw new Error("Nenhuma instância ativa do WhatsApp encontrada.");

    // Se a instância não tem permissão para importar histórico e não foi forçado pelo usuário
    const shouldImportHistory = Boolean(data?.forceImport || (instance.public_config as any)?.auto_import_history);
    if (!shouldImportHistory) {
      return { importedCount: 0, totalFound: 0, skipped: true, message: "Importação de histórico desativada para esta instância." };
    }

    const externalName = instance.external_instance_id || instance.instance_key;
    const { baseUrl, apiKey } = await resolveEvolutionGatewayConfig(db, storeId, instance as any);

    // 1. Garantir webhook ativo na Evolution API
    const webhookUrl = `${DEFAULT_WEBHOOK_ORIGIN.replace(/\/$/, "")}/api/webhooks/whatsapp/evolution/${encodeURIComponent(instance.instance_key)}`;
    await fetch(`${baseUrl}/webhook/set/${encodeURIComponent(externalName)}`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"],
        },
      }),
      signal: AbortSignal.timeout(6000),
    }).catch(() => null);

    // 2. Buscar conversas recentes e contatos com foto na Evolution API em paralelo
    const [chatsRes, contactsRes] = await Promise.all([
      fetch(`${baseUrl}/chat/findChats/${encodeURIComponent(externalName)}`, {
        method: "POST",
        headers: { apikey: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(15000),
      }).catch(() => null),
      fetch(`${baseUrl}/chat/findContacts/${encodeURIComponent(externalName)}`, {
        method: "POST",
        headers: { apikey: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(15000),
      }).catch(() => null),
    ]);

    if (!chatsRes || !chatsRes.ok) {
      throw new Error(`Falha ao consultar conversas no gateway WhatsApp: HTTP ${chatsRes?.status || "Falha de Rede"}`);
    }

    const rawChats = (await chatsRes.json().catch(() => [])) as Array<Record<string, any>>;
    if (!Array.isArray(rawChats)) return { importedCount: 0, totalFound: 0 };

    // Mapeamento enriquecido de contatos e fotos de perfil reais
    const contactMap = new Map<string, { pushName?: string; profilePicUrl?: string; isGroup?: boolean }>();
    if (contactsRes && contactsRes.ok) {
      const rawContacts = (await contactsRes.json().catch(() => [])) as Array<Record<string, any>>;
      if (Array.isArray(rawContacts)) {
        for (const c of rawContacts) {
          const rJid = String(c.remoteJid || c.id || "");
          if (rJid) {
            const pic = c.profilePicUrl || null;
            const pName = c.pushName || c.name || null;
            contactMap.set(rJid, { pushName: pName, profilePicUrl: pic, isGroup: Boolean(c.isGroup || rJid.includes("@g.us")) });
            const cleanDigits = rJid.replace(/@.*$/, "").replace(/\D/g, "");
            if (cleanDigits) {
              contactMap.set(cleanDigits, { pushName: pName, profilePicUrl: pic, isGroup: Boolean(c.isGroup || rJid.includes("@g.us")) });
            }
          }
        }
      }
    }

    let importedCount = 0;
    let fetchedPicsCount = 0;
    const validChats = rawChats
      .filter((c) => {
        const jid = String(c.remoteJid || "");
        return jid && !jid.startsWith("0@") && !jid.includes("@broadcast");
      })
      .slice(0, 50);

    for (const chat of validChats) {
      try {
        const remoteJid = String(chat.remoteJid || "");
        const remoteJidAlt = String(chat.lastMessage?.key?.remoteJidAlt || chat.remoteJidAlt || "");
        const rawPhoneSource = (remoteJid.endsWith("@lid") && remoteJidAlt) ? remoteJidAlt : remoteJid;
        const digits = rawPhoneSource.replace(/@.*$/, "").replace(/\D/g, "");
        if (digits.length < 8) continue;
        const phone = `+${digits}`;

        const contactInfo = contactMap.get(remoteJid) || contactMap.get(digits) || (remoteJidAlt ? contactMap.get(remoteJidAlt) : null) || null;
        const isGroup = remoteJid.includes("@g.us") || Boolean(contactInfo?.isGroup);
        const isChannel = remoteJid.includes("@newsletter");
        const isLastFromMe = Boolean(chat.lastMessage?.key?.fromMe);
        const safeCandidate = (...candidates: unknown[]): string | null => {
          for (const cand of candidates) {
            if (typeof cand !== "string") continue;
            const trimmed = cand.trim();
            if (!trimmed) continue;
            const lower = trimmed.toLowerCase();
            if (lower === "você" || lower === "voce" || lower === "you" || lower === "eu") continue;
            return trimmed;
          }
          return null;
        };
        let cleanName =
          safeCandidate(
            chat.subject,
            chat.groupMetadata?.subject,
            chat.name,
            contactInfo?.pushName,
            chat.pushName,
            chat.contact?.pushName,
            chat.contact?.name,
            isLastFromMe ? null : chat.lastMessage?.pushName,
          ) || (isGroup ? `Grupo WhatsApp ${digits.slice(-4)}` : isChannel ? "Canal WhatsApp" : phone);
        let groupParticipants: Array<{ phone: string | null; name: string; jid: string | null }> = [];
        if (isGroup && (cleanName.startsWith("Grupo WhatsApp") || /^\+?\d+$/.test(cleanName))) {
          try {
            const gRes = await fetch(`${baseUrl}/group/findGroupInfos/${encodeURIComponent(externalName)}?groupJid=${encodeURIComponent(remoteJid)}`, {
              method: "GET",
              headers: { apikey: apiKey },
              signal: AbortSignal.timeout(3000),
            });
            if (gRes.ok) {
              const gJson = (await gRes.json().catch(() => ({}))) as Record<string, any>;
              const subject = safeCandidate(gJson.subject, gJson.groupName, gJson.name);
              if (subject) cleanName = subject;
              if (Array.isArray(gJson.participants)) {
                groupParticipants = gJson.participants.slice(0, 40).map((p: any) => {
                  const pJid = String(p?.id || p?.jid || "");
                  const pDigits = pJid.includes("@lid") ? "" : pJid.replace(/@.*$/, "").replace(/\D/g, "");
                  return {
                    phone: pDigits.length >= 8 ? `+${pDigits}` : null,
                    name: String(p?.name || p?.pushName || (pDigits ? `+${pDigits}` : "Participante")),
                    jid: pJid || null,
                  };
                });
              }
            }
          } catch {
            // Best-effort group info lookup
          }
        }
        let avatarUrl =
          contactInfo?.profilePicUrl ||
          chat.profilePicUrl ||
          chat.profilePictureUrl ||
          chat.contact?.profilePicUrl ||
          null;

        const lastMsgObj = chat.lastMessage?.message || {};
        const text = String(
          lastMsgObj.conversation ||
          lastMsgObj.extendedTextMessage?.text ||
          lastMsgObj.imageMessage?.caption ||
          lastMsgObj.videoMessage?.caption ||
          lastMsgObj.documentMessage?.caption ||
          (lastMsgObj.imageMessage ? "[Imagem]" : lastMsgObj.audioMessage ? "[Áudio]" : lastMsgObj.documentMessage ? "[Documento]" : "[Mensagem WhatsApp]")
        ).trim();

        const timestampSeconds = Number(chat.lastMessage?.messageTimestamp || Date.now() / 1000);
        const occurredAt = new Date(timestampSeconds < 2_000_000_000 ? timestampSeconds * 1000 : timestampSeconds).toISOString();

        const { resolveWhatsAppIdentity } = await import("./whatsapp-automation-runtime.server");
        const identityRecord = await resolveWhatsAppIdentity({
          storeId,
          instanceId: instance.id,
          provider: "evolution_api",
          externalUserId: remoteJid,
          phone,
          displayName: cleanName !== phone ? cleanName : null,
        });

        if (!identityRecord?.id) continue;

        let thread = null;
        const { data: foundThread } = await db
          .from("chat_threads")
          .select("id, metadata, guest_name")
          .eq("store_id", storeId)
          .or(`entity_id.eq.${phone},entity_id.eq.${digits}`)
          .limit(1)
          .maybeSingle();

        const existingMeta = (foundThread?.metadata && typeof foundThread.metadata === "object" ? foundThread.metadata : {}) as Record<string, any>;
        if (!avatarUrl && !existingMeta.avatar_url && fetchedPicsCount < 15 && !isChannel) {
          fetchedPicsCount += 1;
          try {
            const picRes = await fetch(`${baseUrl}/chat/fetchProfilePictureUrl/${encodeURIComponent(externalName)}`, {
              method: "POST",
              headers: { apikey: apiKey, "Content-Type": "application/json" },
              body: JSON.stringify({ number: remoteJidAlt || remoteJid || digits }),
              signal: AbortSignal.timeout(2500),
            });
            if (picRes.ok) {
              const picJson = (await picRes.json().catch(() => ({}))) as Record<string, any>;
              const fetchedPic = picJson.profilePictureUrl || picJson.profilePicUrl || picJson.picture || null;
              if (typeof fetchedPic === "string" && fetchedPic.startsWith("http")) {
                avatarUrl = fetchedPic;
              }
            }
          } catch {
            // Best-effort profile picture fetch
          }
        }
        const enrichedMeta = {
          ...existingMeta,
          is_group: isGroup,
          is_channel: isChannel,
          avatar_url: avatarUrl || existingMeta.avatar_url || null,
          whatsapp_jid: remoteJid,
          ...(remoteJidAlt ? { whatsapp_jid_alt: remoteJidAlt } : {}),
          ...(isGroup ? { group_subject: cleanName } : { push_name: cleanName }),
          ...(isGroup && groupParticipants.length > 0 ? { participants: groupParticipants } : {}),
        };

        if (foundThread) {
          thread = foundThread;
          const preservedName = safeCandidate(cleanName !== phone ? cleanName : null, foundThread.guest_name) || phone;
          await db
            .from("chat_threads")
            .update({
              guest_name: preservedName,
              ...(isGroup ? { group_subject: preservedName } : {}),
              ...(!isGroup && !isChannel ? { primary_phone_e164: phone } : {}),
              thread_type: isGroup ? "group" : isChannel ? "channel" : "store",
              metadata: enrichedMeta,
              last_message_text: text.slice(0, 200),
              last_message_at: occurredAt,
              updated_at: new Date().toISOString(),
            })
            .eq("id", thread.id);
        } else {
          const syntheticEmail = isGroup ? `${digits}@grupo.whatsapp.waesy` : `${digits}@whatsapp.waesy`;
          const { data: newThread, error: newThErr } = await db
            .from("chat_threads")
            .insert({
              store_id: storeId,
              channel_instance_id: instance.id,
              channel_identity_id: identityRecord.id,
              guest_name: cleanName,
              guest_email: syntheticEmail,
              group_subject: isGroup ? cleanName : null,
              primary_phone_e164: isGroup || isChannel ? null : phone,
              status: "open",
              subject: isGroup ? `Grupo: ${cleanName}` : isChannel ? `Canal: ${cleanName}` : `WhatsApp ${phone}`,
              context_type: "whatsapp",
              entity_id: isGroup || isChannel ? remoteJid : phone,
              department: "geral",
              priority: "normal",
              thread_type: isGroup ? "group" : isChannel ? "channel" : "store",
              metadata: enrichedMeta,
              ...(isLastFromMe ? {} : { last_customer_message_at: occurredAt }),
              last_message_text: text.slice(0, 200),
              last_message_at: occurredAt,
              created_at: occurredAt,
              updated_at: occurredAt,
            })
            .select("id")
            .single();

          if (newThErr) continue;
          thread = newThread;
        }

        if (thread?.id && text && chat.lastMessage?.key?.id) {
          const fromMe = Boolean(chat.lastMessage?.key?.fromMe);
          const externalId = String(chat.lastMessage.key.id);
          const { data: existingMsg } = await db
            .from("chat_messages")
            .select("id")
            .eq("thread_id", thread.id)
            .eq("external_message_id", externalId)
            .maybeSingle();

          if (!existingMsg) {
            await db.from("chat_messages").insert({
              thread_id: thread.id,
              channel_identity_id: identityRecord.id,
              channel: "whatsapp",
              message: text,
              message_type: "text",
              is_staff_reply: fromMe,
              provider: "evolution_api",
              external_message_id: externalId,
              delivery_status: fromMe ? "sent" : "delivered",
              sent_at: occurredAt,
              ...(fromMe ? {} : { delivered_at: occurredAt }),
              payload: {
                from_me: fromMe,
                origin: fromMe ? "whatsapp_device_sync" : "whatsapp_customer_sync",
              },
              created_at: occurredAt,
            });
          }
        }

        importedCount++;
      } catch (chatItemErr) {
        console.warn("[whatsapp-sync] Erro ao sincronizar conversa individual:", chatItemErr);
      }
    }

    return {
      importedCount,
      totalFound: rawChats.length,
      connectedPhone: instance.display_phone_number,
    };
  });
