import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { encryptSecret } from "@/lib/crypto-vault.server";

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

const CANONICAL_EVOLUTION_TUNNEL_URL = "https://feb-genre-kathy-indicator.trycloudflare.com";
const EVOLUTION_BASE_URL = process.env.EVOLUTION_API_URL?.trim() || CANONICAL_EVOLUTION_TUNNEL_URL;
const DEFAULT_WEBHOOK_ORIGIN = process.env.VITE_APP_URL || process.env.VITE_SITE_URL || "https://waesy.com.br";

function requireEvolutionBaseUrl(): string {
  const envUrl = process.env.EVOLUTION_API_URL?.trim();
  const url = envUrl && !envUrl.includes("147.15.61.45") ? envUrl : EVOLUTION_BASE_URL;
  return url.replace(/\/$/, "");
}

function requireEvolutionMasterKey(): string {
  const key = process.env.EVOLUTION_API_KEY?.trim();
  if (key) return key;
  return "WaesyApiKey_Master_2026_WhatsApp";
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

export const ConnectQrSchema = z.object({
  id: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  displayName: z.string().trim().min(2).max(100).default("WhatsApp Principal"),
  instanceKey: z.string().trim().min(2).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/).optional(),
  department: z.string().trim().max(60).optional(),
  isGlobalMaster: z.boolean().default(false),
  autoImportHistory: z.boolean().default(false),
});

export const connectWhatsAppQrCodeInstance = createServerFn({ method: "POST" })
  .validator(ConnectQrSchema)
  .handler(async ({ data }) => {
    const {
      id: instanceId,
      storeId: inputStoreId,
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
    let existing: WhatsAppChannelInstanceDTO | null = null;
    if (instanceId) {
      const { data: found } = await db
        .from("whatsapp_channel_instances")
        .select(PublicFields)
        .eq("id", instanceId)
        .eq("store_id", storeId)
        .maybeSingle();
      existing = (found as WhatsAppChannelInstanceDTO | null) || null;
    }

    const shortStore = storeId.replace(/-/g, "").slice(0, 8);
    const cleanKey = (instanceKey || existing?.instance_key || `wa_${shortStore}`).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    let externalName = existing?.external_instance_id || `waesy_${shortStore}_${cleanKey}`.slice(0, 48);
    const webhookUrl = `${DEFAULT_WEBHOOK_ORIGIN.replace(/\/$/, "")}/api/webhooks/whatsapp/evolution/${encodeURIComponent(cleanKey)}`;

    let qrBase64: string | null = null;
    let pairingCode: string | null = null;
    let connectionState: "connected" | "connecting" | "error" = "connecting";
    let gatewayErrorCode: string | null = null;
    let gatewayErrorMessage: string | null = null;
    const baseUrl = requireEvolutionBaseUrl();
    const apiKey = requireEvolutionMasterKey();

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
        
        // Verificação profunda anti-zombie: se o socket foi desconectado pelo WhatsApp (código 403/erro), força re-emissão de QR
        if (rawState === "open") {
          const infoRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(externalName)}`, {
            method: "GET",
            headers: { apikey: apiKey },
            signal: AbortSignal.timeout(6000),
          }).catch(() => null);
          const infoList = infoRes && infoRes.ok ? await infoRes.json().catch(() => []) : [];
          const first = Array.isArray(infoList) ? infoList[0] : infoList;
          if (first?.disconnectionReasonCode || first?.disconnectionAt) {
            rawState = "close";
            // Cria um identificador limpo para escapar do socket travado na VPS
            externalName = `waesy_${shortStore}_${cleanKey}_${Date.now().toString(36)}`.slice(0, 48);
          } else {
            connectionState = "connected";
          }
        }

        if (rawState !== "open") {
          const firstConnect = await fetchInstanceConnectQr();
          qrBase64 = firstConnect.qrCodeBase64;
          pairingCode = firstConnect.pairingCode;

          // Se a instância existente travou sem emitir QR Code, reinicia sessão e busca novamente
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
      } else {
        // 2. Criar nova instância no Baileys da VPS Oracle
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
          // Caso a instância já exista na Evolution API mas não respondeu ao connectionState inicial
          const fallbackConnect = await fetchInstanceConnectQr();
          qrBase64 = fallbackConnect.qrCodeBase64;
          pairingCode = fallbackConnect.pairingCode;
          if (!qrBase64) {
            // Se o nome está em uso por uma sessão zumbi inacessível, cria com sufixo fresco
            externalName = `waesy_${shortStore}_${cleanKey}_${Date.now().toString(36)}`.slice(0, 48);
            const freshCreateRes = await fetch(`${baseUrl}/instance/create`, {
              method: "POST",
              headers: { apikey: apiKey, "Content-Type": "application/json" },
              body: JSON.stringify({
                instanceName: externalName,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS",
                webhook: { url: webhookUrl, byEvents: false, base64: true, events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"] }
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

        // Evolution API v2 frequentemente inicializa o socket de forma assíncrona após /instance/create
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

    const updatedPublicConfig = {
      ...(existing?.public_config || {}),
      base_url: baseUrl,
      qr_code_url: qrBase64,
      pairing_code: pairingCode,
      department: department || existing?.public_config?.department || "Geral",
      is_global_master: isGlobalMaster || Boolean(existing?.public_config?.is_global_master),
      auto_import_history: autoImportHistory ?? (existing?.public_config as any)?.auto_import_history ?? false,
      last_qr_generated_at: new Date().toISOString(),
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

    // Busca se já existe uma instância ativa e padrão nesta loja
    const { data: existingDefault } = await db
      .from("whatsapp_channel_instances")
      .select("id")
      .eq("store_id", storeId)
      .eq("is_default", true)
      .eq("is_active", true)
      .maybeSingle();

    // Se a instância atual já for a padrão ou não houver nenhuma outra instância padrão ativa, assume default
    const isThisAlreadyDefault = Boolean(existing?.id && existing.is_default && existingDefault?.id === existing.id);
    const hasOtherActiveDefault = Boolean(existingDefault && existingDefault.id !== existing?.id);
    const shouldBeDefault = isThisAlreadyDefault || !hasOtherActiveDefault;

    // Se deve ser padrão, despromove qualquer outra instância default prévia da mesma loja para blindar contra race condition
    if (shouldBeDefault) {
      let demoteDefaultQuery = db
        .from("whatsapp_channel_instances")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("store_id", storeId)
        .eq("is_default", true);
      if (existing?.id) {
        demoteDefaultQuery = demoteDefaultQuery.neq("id", existing.id);
      }
      await demoteDefaultQuery;
    }

    const upsertPayload = {
      ...(existing?.id ? { id: existing.id } : {}),
      store_id: storeId,
      display_name: displayName || existing?.display_name || "WhatsApp Principal",
      provider: "evolution_api" as const,
      connection_mode: "unofficial" as const,
      instance_key: cleanKey,
      external_instance_id: externalName,
      webhook_url: webhookUrl,
      status: mappedDbStatus,
      is_active: true,
      is_default: shouldBeDefault,
      public_config: updatedPublicConfig,
      secret_payload_encrypted: secretEncrypted,
      last_error_code: gatewayErrorCode,
      last_error_message: gatewayErrorMessage,
      last_health_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: identity.id,
    };

    let saved: WhatsAppChannelInstanceDTO | null = null;
    const { data: initialSaved, error: initialError } = await db
      .from("whatsapp_channel_instances")
      .upsert(upsertPayload, { onConflict: "store_id,instance_key" })
      .select(PublicFields)
      .single();

    if (initialError) {
      // Blindagem contra duplicate key na unique constraint uq_whatsapp_default_instance_per_store
      if (
        initialError.message.includes("uq_whatsapp_default_instance_per_store") ||
        (initialError as any).code === "23505"
      ) {
        const retryPayload = { ...upsertPayload, is_default: false };
        const { data: retrySaved, error: retryError } = await db
          .from("whatsapp_channel_instances")
          .upsert(retryPayload, { onConflict: "store_id,instance_key" })
          .select(PublicFields)
          .single();

        if (retryError) {
          throw new Error(`Erro ao persistir instância QR Code: ${retryError.message}`);
        }
        saved = retrySaved as WhatsAppChannelInstanceDTO;
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
  });

export const syncWhatsAppInstanceStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), storeId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const { id: instanceId, storeId: inputStoreId } = data;
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação obrigatória.");
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");

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
    const configuredUrl = String((instance.public_config as any)?.base_url || "").replace(/\/$/, "");
    const baseUrl = configuredUrl && !configuredUrl.includes("147.15.61.45") ? configuredUrl : requireEvolutionBaseUrl();
    const apiKey = requireEvolutionMasterKey();

    let liveState = "close";
    let connectedPhone: string | null = instance.display_phone_number;
    let qrCodeBase64: string | null = normalizeWhatsAppQrDataUri((instance.public_config as any)?.qr_code_url);
    let pairingCode: string | null = ((instance.public_config as any)?.pairing_code as string) || null;
    let syncErrorMessage: string | null = null;

    try {
      const stateRes = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(externalName)}`, {
        method: "GET",
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(6000),
      });
      if (stateRes.ok) {
        const json = (await stateRes.json().catch(() => ({}))) as Record<string, any>;
        liveState = String(json?.instance?.state || json?.state || "close").toLowerCase();
      } else {
        syncErrorMessage = `Gateway HTTP ${stateRes.status}`;
      }

      if (liveState === "open") {
        qrCodeBase64 = null;
        pairingCode = null;
        const infoRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(externalName)}`, {
          method: "GET",
          headers: { apikey: apiKey },
          signal: AbortSignal.timeout(6000),
        });
        if (infoRes.ok) {
          const infoList = await infoRes.json().catch(() => []);
          const first = Array.isArray(infoList) ? infoList[0] : infoList;
          const ownerJid = String(first?.ownerJid || first?.instance?.owner || "");
          if (ownerJid) {
            const digits = ownerJid.replace(/@.*$/, "").replace(/\D/g, "");
            if (digits.length >= 8) connectedPhone = `+${digits}`;
          }
        }
      } else {
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

    const mappedStatus =
      liveState === "open"
        ? "connected"
        : liveState === "connecting" || Boolean(qrCodeBase64)
          ? "pending"
          : syncErrorMessage
            ? "error"
            : "disconnected";

    const nextPublicConfig = {
      ...(instance.public_config || {}),
      qr_code_url: mappedStatus === "connected" ? null : qrCodeBase64,
      pairing_code: mappedStatus === "connected" ? null : pairingCode,
      last_synced_state: liveState,
      ...(mappedStatus !== "connected" && qrCodeBase64 ? { last_qr_generated_at: new Date().toISOString() } : {}),
    };

    const { data: updated } = await db
      .from("whatsapp_channel_instances")
      .update({
        status: mappedStatus,
        is_active: mappedStatus === "connected" || instance.is_active,
        display_phone_number: connectedPhone,
        public_config: nextPublicConfig,
        last_error_code: mappedStatus === "connected" ? null : syncErrorMessage ? "SYNC_ERROR" : instance.last_error_code,
        last_error_message: mappedStatus === "connected" ? null : syncErrorMessage || instance.last_error_message,
        last_health_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", instance.id)
      .select(PublicFields)
      .single();

    return {
      instance: (updated || instance) as WhatsAppChannelInstanceDTO,
      state: mappedStatus,
      qrCodeBase64: mappedStatus === "connected" ? null : qrCodeBase64,
      pairingCode: mappedStatus === "connected" ? null : pairingCode,
      errorMessage: mappedStatus === "connected" ? null : syncErrorMessage || instance.last_error_message || null,
    };
  });

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
      const configuredUrl = String((instance.public_config as any)?.base_url || "").replace(/\/$/, "");
      const baseUrl = configuredUrl && !configuredUrl.includes("147.15.61.45") ? configuredUrl : requireEvolutionBaseUrl();
      // 1. Desconecta a sessão atual no WhatsApp Web
      await fetch(`${baseUrl}/instance/logout/${encodeURIComponent(externalName)}`, {
        method: "DELETE",
        headers: { apikey: requireEvolutionMasterKey() },
        signal: AbortSignal.timeout(6000),
      }).catch(() => null);

      // 2. Se solicitada desconexão profunda, remove a instância na Evolution API
      if (data.deepDisconnect) {
        await fetch(`${baseUrl}/instance/delete/${encodeURIComponent(externalName)}`, {
          method: "DELETE",
          headers: { apikey: requireEvolutionMasterKey() },
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

// ─── Gestão de Setores (Filas), Atendentes e Permissões RBAC ─────────────────

export const WhatsAppDepartmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(160).optional(),
  color: z.enum(["emerald", "blue", "amber", "purple", "rose", "slate"]).default("emerald"),
  instanceIds: z.array(z.string()).default([]),
  assignedAgentIds: z.array(z.string()).default([]),
  roundRobinEnabled: z.boolean().default(true),
  aiSdrEnabled: z.boolean().default(true),
  slaMinutes: z.number().min(1).max(1440).default(15), scheduleStart: z.string().default("08:00"), scheduleEnd: z.string().default("18:00"), scheduleDays: z.string().default("Seg a Sex"), awayMessage: z.string().optional(), whatsappInstanceId: z.string().optional(), aiTriageStages: z.array(z.object({ id: z.string(), title: z.string(), instruction: z.string(), handoffToHuman: z.boolean().default(false) })).optional(),
});

export type WhatsAppDepartmentDTO = z.infer<typeof WhatsAppDepartmentSchema>;

export const WhatsAppGovernanceConfigSchema = z.object({
  instanceId: z.string().uuid().optional(), agentPermissions: z.array(z.object({ agentId: z.string(), name: z.string().optional(), whatsappInstanceId: z.string().optional(), onlyAssignedOrSector: z.boolean().default(false), canTransfer: z.boolean().default(true), canCloseTicket: z.boolean().default(true), canManageQr: z.boolean().default(false) })).optional(),
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
    const { data: storeRow } = await db.from("stores").select("settings").eq("id", storeId).maybeSingle();
    const currentSettings = ((storeRow?.settings as any) || {}) as Record<string, any>;
    await db.from("stores").update({ settings: { ...currentSettings, whatsapp_governance: { departments: data.departments, permissions: data.permissions, agentPermissions: data.agentPermissions || [], updated_at: new Date().toISOString() } } }).eq("id", storeId);
    if (!data.instanceId) return { id: storeId, store_id: storeId, public_config: { departments: data.departments, governance_permissions: data.permissions, agent_permissions: data.agentPermissions || [] } } as unknown as WhatsAppChannelInstanceDTO;
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
      updated_governance_at: new Date().toISOString(),
    };

    const { data: saved, error } = await db
      .from("whatsapp_channel_instances")
      .update({
        public_config: updatedConfig,
        updated_at: new Date().toISOString(),
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
    const configuredUrl = String((instance.public_config as any)?.base_url || "").replace(/\/$/, "");
    const baseUrl = configuredUrl && !configuredUrl.includes("147.15.61.45") ? configuredUrl : requireEvolutionBaseUrl();
    const apiKey = requireEvolutionMasterKey();

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

    // 2. Buscar conversas recentes na Evolution API
    const chatsRes = await fetch(`${baseUrl}/chat/findChats/${encodeURIComponent(externalName)}`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(15000),
    });

    if (!chatsRes.ok) {
      throw new Error(`Falha ao consultar conversas no gateway WhatsApp: HTTP ${chatsRes.status}`);
    }

    const rawChats = (await chatsRes.json().catch(() => [])) as Array<Record<string, any>>;
    if (!Array.isArray(rawChats)) return { importedCount: 0, totalFound: 0 };

    let importedCount = 0;
    const validChats = rawChats
      .filter((c) => {
        const jid = String(c.remoteJid || "");
        return jid && !jid.startsWith("0@") && !jid.includes("@broadcast");
      })
      .slice(0, 40);

    for (const chat of validChats) {
      try {
        const remoteJid = String(chat.remoteJid || "");
        const remoteJidAlt = String(chat.lastMessage?.key?.remoteJidAlt || chat.remoteJidAlt || "");
        const rawPhoneSource = (remoteJid.endsWith("@lid") && remoteJidAlt) ? remoteJidAlt : remoteJid;
        const digits = rawPhoneSource.replace(/@.*$/, "").replace(/\D/g, "");
        if (digits.length < 8) continue;
        const phone = `+${digits}`;

        const isGroup = remoteJid.includes("@g.us");
        const pushName = String(chat.pushName || chat.lastMessage?.pushName || phone);
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
          displayName: pushName,
        });

        if (!identityRecord?.id) continue;

        let thread = null;
        const { data: foundThread } = await db
          .from("chat_threads")
          .select("id")
          .eq("store_id", storeId)
          .eq("entity_id", phone)
          .maybeSingle();

        if (foundThread) {
          thread = foundThread;
          await db
            .from("chat_threads")
            .update({
              guest_name: pushName,
              last_message_text: text.slice(0, 200),
              last_message_at: occurredAt,
              updated_at: new Date().toISOString(),
            })
            .eq("id", thread.id);
        } else {
          const syntheticEmail = `${digits}@whatsapp.waesy`;
          const { data: newThread, error: newThErr } = await db
            .from("chat_threads")
            .insert({
              store_id: storeId,
              channel_instance_id: instance.id,
              channel_identity_id: identityRecord.id,
              guest_name: pushName,
              guest_email: syntheticEmail,
              status: "open",
              subject: isGroup ? `Grupo: ${pushName}` : `WhatsApp ${phone}`,
              context_type: "whatsapp",
              entity_id: phone,
              department: "geral",
              priority: "normal",
              last_customer_message_at: occurredAt,
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
              delivered_at: occurredAt,
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
