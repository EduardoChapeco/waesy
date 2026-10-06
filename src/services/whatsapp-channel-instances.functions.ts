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
