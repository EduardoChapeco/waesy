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

export const listWorkspaceWhatsAppInstances = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager"]);
  const { data, error } = await getServerClient().from("whatsapp_channel_instances").select(PublicFields).eq("store_id", identity.store_id).order("created_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar instâncias WhatsApp: ${error.message}`);
  return (data || []) as WhatsAppChannelInstanceDTO[];
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
  const row = {
    ...(input.id ? { id: input.id } : {}),
    store_id: storeId,
    display_name: input.displayName,
    provider: input.provider,
    connection_mode: input.connectionMode,
    instance_key: input.instanceKey,
    status: input.isActive ? "pending" : "disabled",
    is_active: input.isActive,
    is_default: input.isDefault && input.isActive,
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
  const { data, error } = await db.from("whatsapp_channel_instances").update({ is_active: input.active, status: input.active ? "pending" : "disabled", updated_at: new Date().toISOString() }).eq("id", input.id).eq("store_id", storeId).select(PublicFields).single();
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

const EVOLUTION_BASE_URL = process.env.EVOLUTION_API_URL?.trim() || "";
const DEFAULT_WEBHOOK_ORIGIN = process.env.VITE_APP_URL || "https://usewaesy.pages.dev";

function requireEvolutionBaseUrl(): string {
  if (!EVOLUTION_BASE_URL) throw new Error("EVOLUTION_API_URL não configurada no ambiente server-side.");
  return EVOLUTION_BASE_URL.replace(/\/$/, "");
}

function requireEvolutionMasterKey(): string {
  const key = process.env.EVOLUTION_API_KEY?.trim();
  if (!key) throw new Error("EVOLUTION_API_KEY não configurada no ambiente server-side.");
  return key;
}

const ConnectQrSchema = z.object({
  id: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  displayName: z.string().trim().min(2).max(100).default("WhatsApp Principal"),
  instanceKey: z.string().trim().min(2).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/).optional(),
  department: z.string().trim().max(60).optional(),
  isGlobalMaster: z.boolean().default(false),
});

export const connectWhatsAppQrCodeInstance = createServerFn({ method: "POST" })
  .validator(ConnectQrSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação obrigatória para conectar WhatsApp.");

    const isMaster = identity.role === "platform_admin";
    if (data.isGlobalMaster && !isMaster) {
      throw new Error("Apenas o Admin Master pode configurar o Número Global da plataforma.");
    }
    if (!isMaster) {
      assertStoreAccess(identity, ["owner", "admin", "manager"]);
    }

    const storeId = data.storeId || identity.store_id;
    if (!storeId) throw new Error(" Contexto de loja obrigatório para criar instância WhatsApp.");

    const db = getServerClient();
    let existing: WhatsAppChannelInstanceDTO | null = null;
    if (data.id) {
      const { data: found } = await db
        .from("whatsapp_channel_instances")
        .select(PublicFields)
        .eq("id", data.id)
        .eq("store_id", storeId)
        .maybeSingle();
      existing = (found as WhatsAppChannelInstanceDTO | null) || null;
    }

    const shortStore = storeId.replace(/-/g, "").slice(0, 8);
    const cleanKey = (data.instanceKey || existing?.instance_key || `wa_${shortStore}`).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const externalName = existing?.external_instance_id || `waesy_${shortStore}_${cleanKey}`.slice(0, 48);
    const webhookUrl = `${DEFAULT_WEBHOOK_ORIGIN.replace(/\/$/, "")}/api/webhooks/whatsapp/evolution/${encodeURIComponent(cleanKey)}`;

    let qrBase64: string | null = null;
    let pairingCode: string | null = null;
    let connectionState = "connecting";
    const baseUrl = requireEvolutionBaseUrl();

    // 1. Verificar se a instância já existe na Evolution API
    try {
      const stateRes = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(externalName)}`, {
        method: "GET",
        headers: { apikey: requireEvolutionMasterKey() },
        signal: AbortSignal.timeout(8000),
      });

      if (stateRes.ok) {
        const stateJson = (await stateRes.json().catch(() => ({}))) as Record<string, any>;
        const rawState = String(stateJson?.instance?.state || "").toLowerCase();
        if (rawState === "open") {
          connectionState = "connected";
        } else {
          const connectRes = await fetch(`${baseUrl}/instance/connect/${encodeURIComponent(externalName)}`, {
            method: "GET",
            headers: { apikey: requireEvolutionMasterKey() },
            signal: AbortSignal.timeout(10000),
          });
          if (connectRes.ok) {
            const connectJson = (await connectRes.json().catch(() => ({}))) as Record<string, any>;
            qrBase64 = connectJson?.base64 || connectJson?.qrcode?.base64 || null;
            pairingCode = connectJson?.pairingCode || connectJson?.qrcode?.pairingCode || null;
          }
        }
      } else {
        // 2. Criar nova instância no Baileys da VPS Oracle
        const createRes = await fetch(`${baseUrl}/instance/create`, {
          method: "POST",
          headers: {
            apikey: requireEvolutionMasterKey(),
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
        if (!createRes.ok) {
          throw new Error(createJson?.response?.message?.[0] || createJson?.message || `Evolution API HTTP ${createRes.status}`);
        }
        qrBase64 = createJson?.qrcode?.base64 || createJson?.base64 || null;
        pairingCode = createJson?.qrcode?.pairingCode || null;
      }
    } catch (err) {
      throw new Error(`Falha ao comunicar com servidor WhatsApp (${baseUrl}): ${err instanceof Error ? err.message : "Erro de rede"}`);
    }

    const updatedPublicConfig = {
      ...(existing?.public_config || {}),
      base_url: baseUrl,
      qr_code_url: qrBase64,
      pairing_code: pairingCode,
      department: data.department || existing?.public_config?.department || "Geral",
      is_global_master: data.isGlobalMaster || Boolean(existing?.public_config?.is_global_master),
      last_qr_generated_at: new Date().toISOString(),
    };

    const secretEncrypted = encryptSecret(
      JSON.stringify({
        api_key: requireEvolutionMasterKey(),
        base_url: baseUrl,
      }),
    );

    const isConnected = connectionState === "connected";
    const upsertPayload = {
      ...(existing?.id ? { id: existing.id } : {}),
      store_id: storeId,
      display_name: data.displayName || existing?.display_name || "WhatsApp Principal",
      provider: "evolution_api" as const,
      connection_mode: "unofficial" as const,
      instance_key: cleanKey,
      external_instance_id: externalName,
      webhook_url: webhookUrl,
      status: isConnected ? "connected" : "pending",
      is_active: true,
      is_default: existing?.is_default ?? true,
      public_config: updatedPublicConfig,
      secret_payload_encrypted: secretEncrypted,
      last_health_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: identity.id,
    };

    const { data: saved, error } = await db
      .from("whatsapp_channel_instances")
      .upsert(upsertPayload, { onConflict: "store_id,instance_key" })
      .select(PublicFields)
      .single();

    if (error) throw new Error(`Erro ao persistir instância QR Code: ${error.message}`);

    await audit(String(saved.id), storeId, identity.id, "instance.qr_requested", "info", {
      external_instance_id: externalName,
      connection_state: connectionState,
      is_global_master: data.isGlobalMaster,
    });

    return {
      instance: saved as WhatsAppChannelInstanceDTO,
      qrCodeBase64: qrBase64,
      pairingCode,
      connectionState,
    };
  });

export const syncWhatsAppInstanceStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), storeId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação obrigatória.");
    const storeId = data.storeId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");

    const db = getServerClient();
    const { data: instance, error } = await db
      .from("whatsapp_channel_instances")
      .select(PublicFields)
      .eq("id", data.id)
      .eq("store_id", storeId)
      .single();

    if (error || !instance) throw new Error("Instância WhatsApp não encontrada.");
    if (instance.provider !== "evolution_api") {
      return { instance: instance as WhatsAppChannelInstanceDTO, state: instance.status };
    }

    const externalName = instance.external_instance_id || instance.instance_key;
    const baseUrl = String((instance.public_config as any)?.base_url || requireEvolutionBaseUrl()).replace(/\/$/, "");

    let liveState = "close";
    let connectedPhone: string | null = instance.display_phone_number;

    try {
      const stateRes = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(externalName)}`, {
        method: "GET",
        headers: { apikey: requireEvolutionMasterKey() },
        signal: AbortSignal.timeout(6000),
      });
      if (stateRes.ok) {
        const json = (await stateRes.json().catch(() => ({}))) as Record<string, any>;
        liveState = String(json?.instance?.state || "close").toLowerCase();
      }

      if (liveState === "open") {
        const infoRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(externalName)}`, {
          method: "GET",
          headers: { apikey: requireEvolutionMasterKey() },
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
      }
    } catch {
      // Mantém estado anterior em caso de oscilação momentânea
    }

    const mappedStatus = liveState === "open" ? "connected" : liveState === "connecting" ? "pending" : "disconnected";
    const nextPublicConfig = {
      ...(instance.public_config || {}),
      ...(mappedStatus === "connected" ? { qr_code_url: null } : {}),
      last_synced_state: liveState,
    };

    const { data: updated } = await db
      .from("whatsapp_channel_instances")
      .update({
        status: mappedStatus,
        is_active: mappedStatus === "connected" || instance.is_active,
        display_phone_number: connectedPhone,
        public_config: nextPublicConfig,
        last_health_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", instance.id)
      .select(PublicFields)
      .single();

    return {
      instance: (updated || instance) as WhatsAppChannelInstanceDTO,
      state: mappedStatus,
    };
  });

export const disconnectWhatsAppInstance = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), storeId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação obrigatória.");
    if (identity.role !== "platform_admin") {
      assertStoreAccess(identity, ["owner", "admin", "manager"]);
    }
    const storeId = data.storeId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");

    const db = getServerClient();
    const { data: instance } = await db
      .from("whatsapp_channel_instances")
      .select(PublicFields)
      .eq("id", data.id)
      .eq("store_id", storeId)
      .single();

    if (!instance) throw new Error("Instância não localizada.");

    if (instance.provider === "evolution_api") {
      const externalName = instance.external_instance_id || instance.instance_key;
      const baseUrl = String((instance.public_config as any)?.base_url || requireEvolutionBaseUrl()).replace(/\/$/, "");
      await fetch(`${baseUrl}/instance/logout/${encodeURIComponent(externalName)}`, {
        method: "DELETE",
        headers: { apikey: requireEvolutionMasterKey() },
        signal: AbortSignal.timeout(6000),
      }).catch(() => null);
    }

    const { data: updated, error } = await db
      .from("whatsapp_channel_instances")
      .update({
        status: "disconnected",
        is_active: false,
        public_config: { ...(instance.public_config || {}), qr_code_url: null },
        updated_at: new Date().toISOString(),
      })
      .eq("id", instance.id)
      .select(PublicFields)
      .single();

    if (error) throw new Error(`Falha ao desconectar instância: ${error.message}`);
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
  slaMinutes: z.number().min(1).max(1440).default(15),
});

export type WhatsAppDepartmentDTO = z.infer<typeof WhatsAppDepartmentSchema>;

export const WhatsAppGovernanceConfigSchema = z.object({
  instanceId: z.string().uuid(),
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
