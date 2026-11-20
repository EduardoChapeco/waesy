import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";

const nodeSchema = z.object({ id: z.string().min(1), type: z.enum(["trigger", "condition", "action"]), title: z.string().min(1), config: z.record(z.any()).default({}) });
const edgeSchema = z.object({ id: z.string().min(1), source: z.string().min(1), target: z.string().min(1) });
export const whatsappFlowInputSchema = z.object({ title: z.string().trim().min(2).max(120), description: z.string().trim().max(500).optional().nullable(), nodes: z.array(nodeSchema).min(1).max(100), edges: z.array(edgeSchema).max(200).default([]), entryConditions: z.record(z.any()).default({}), channelInstanceId: z.string().uuid().optional().nullable() });

export const listWhatsAppFlows = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);
  const { data, error } = await getServerClient().from("store_workflows").select("id, title, description, trigger_type, status, nodes, edges, schema_version, workflow_version, published_at, entry_conditions, channel_instance_id, execution_count, last_run_at, created_at, updated_at").eq("store_id", identity.store_id).eq("channel", "whatsapp").order("updated_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar fluxos WhatsApp: ${error.message}`);
  return data || [];
});

export const createWhatsAppFlow = createServerFn({ method: "POST" }).validator(whatsappFlowInputSchema).handler(async ({ data }) => {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager"]);
  const trigger = data.nodes.find((node) => node.type === "trigger");
  const { data: flow, error } = await getServerClient().from("store_workflows").insert({ store_id: identity.store_id, title: data.title, description: data.description || null, trigger_type: "whatsapp_inbound", channel: "whatsapp", channel_instance_id: data.channelInstanceId || null, nodes: data.nodes, edges: data.edges, entry_conditions: data.entryConditions, schema_version: 1, workflow_version: 1, status: "draft", created_by: identity.id }).select().single();
  if (error || !flow) throw new Error(`Falha ao criar fluxo WhatsApp: ${error?.message || "sem retorno"}`);
  return { ...flow, trigger_node: trigger?.id || null };
});

export const updateWhatsAppFlow = createServerFn({ method: "POST" }).validator(z.object({ id: z.string().uuid(), title: z.string().trim().min(2).max(120).optional(), description: z.string().trim().max(500).optional().nullable(), nodes: z.array(nodeSchema).max(100).optional(), edges: z.array(edgeSchema).max(200).optional(), entryConditions: z.record(z.any()).optional(), channelInstanceId: z.string().uuid().optional().nullable() })).handler(async ({ data }) => {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager"]);
  const db = getServerClient();
  const { data: current } = await db.from("store_workflows").select("workflow_version").eq("id", data.id).eq("store_id", identity.store_id).eq("channel", "whatsapp").single();
  if (!current) throw new Error("Fluxo WhatsApp não encontrado.");
  const patch: Record<string, unknown> = { workflow_version: (current.workflow_version || 1) + 1, updated_at: new Date().toISOString() };
  if (data.title !== undefined) patch.title = data.title;
  if (data.description !== undefined) patch.description = data.description;
  if (data.nodes !== undefined) patch.nodes = data.nodes;
  if (data.edges !== undefined) patch.edges = data.edges;
  if (data.entryConditions !== undefined) patch.entry_conditions = data.entryConditions;
  if (data.channelInstanceId !== undefined) patch.channel_instance_id = data.channelInstanceId;
  const { data: updated, error } = await db.from("store_workflows").update(patch).eq("id", data.id).eq("store_id", identity.store_id).eq("channel", "whatsapp").select().single();
  if (error) throw new Error(`Falha ao atualizar fluxo WhatsApp: ${error.message}`);
  return updated;
});

export const publishWhatsAppFlow = createServerFn({ method: "POST" }).validator(z.object({ id: z.string().uuid(), active: z.boolean() })).handler(async ({ data }) => {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager"]);
  const patch = data.active ? { status: "active", published_at: new Date().toISOString() } : { status: "inactive" };
  const { data: updated, error } = await getServerClient().from("store_workflows").update(patch).eq("id", data.id).eq("store_id", identity.store_id).eq("channel", "whatsapp").select("id, status, published_at, workflow_version").single();
  if (error) throw new Error(`Falha ao publicar fluxo WhatsApp: ${error.message}`);
  return updated;
});

export const whatsappCampaignInputSchema = z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(500).optional().nullable(), channelInstanceId: z.string().uuid(), messageType: z.enum(["template", "text", "flow"]), templateName: z.string().trim().max(120).optional().nullable(), templateLanguage: z.string().trim().max(20).optional().nullable(), templateParameters: z.array(z.any()).default([]), audienceFilter: z.record(z.any()).default({}), scheduledAt: z.string().datetime().optional().nullable() }).superRefine((value, context) => {
  if (value.messageType === "template" && !value.templateName) context.addIssue({ code: z.ZodIssueCode.custom, path: ["templateName"], message: "Template Meta aprovado é obrigatório." });
  if (value.messageType === "flow" && !value.scheduledAt) context.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledAt"], message: "Fluxos de campanha precisam de agendamento explícito." });
});

export const listWhatsAppCampaigns = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);
  const { data, error } = await getServerClient().from("whatsapp_campaigns").select("id, name, description, status, message_type, template_name, template_language, audience_filter, scheduled_at, started_at, completed_at, created_at, updated_at").eq("store_id", identity.store_id).order("updated_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar campanhas WhatsApp: ${error.message}`);
  return data || [];
});

export const createWhatsAppCampaign = createServerFn({ method: "POST" }).validator(whatsappCampaignInputSchema).handler(async ({ data }) => {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager"]);
  if (data.messageType === "template" && !data.templateName) throw new Error("Campanhas de template exigem um template Meta aprovado.");
  const db = getServerClient();
  const { data: instance } = await db.from("whatsapp_channel_instances").select("id, provider, store_id, is_active").eq("id", data.channelInstanceId).eq("store_id", identity.store_id).maybeSingle();
  if (!instance?.is_active) throw new Error("Instância WhatsApp não está ativa.");
  if (data.messageType === "template" && instance.provider !== "meta_cloud_api") throw new Error("Templates oficiais exigem uma instância Meta Cloud API.");
  const { data: campaign, error } = await db.from("whatsapp_campaigns").insert({ store_id: identity.store_id, channel_instance_id: data.channelInstanceId, name: data.name, description: data.description || null, message_type: data.messageType, template_name: data.templateName || null, template_language: data.templateLanguage || null, template_parameters: data.templateParameters, audience_filter: data.audienceFilter, scheduled_at: data.scheduledAt || null, status: data.scheduledAt ? "scheduled" : "draft", created_by: identity.id }).select().single();
  if (error || !campaign) throw new Error(`Falha ao criar campanha WhatsApp: ${error?.message || "sem retorno"}`);
  return campaign;
});

export const launchWhatsAppCampaign = createServerFn({ method: "POST" }).validator(z.object({ id: z.string().uuid() })).handler(async ({ data }) => {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager"]);
  const db = getServerClient();
  const { data: campaign } = await db.from("whatsapp_campaigns").select("*").eq("id", data.id).eq("store_id", identity.store_id).maybeSingle();
  if (!campaign) throw new Error("Campanha não encontrada.");
  if (["running", "completed"].includes(campaign.status)) throw new Error("Campanha já está em execução ou concluída.");
  const { data: instance } = await db.from("whatsapp_channel_instances").select("id, provider, is_active").eq("id", campaign.channel_instance_id).eq("store_id", identity.store_id).maybeSingle();
  if (!instance?.is_active) throw new Error("Instância da campanha está inativa.");
  if (!["meta_cloud_api", "evolution_api"].includes(instance.provider)) throw new Error("Provider da instância não suporta campanhas.");
  if (!["template", "text"].includes(campaign.message_type)) throw new Error("Campanhas flow ainda exigem um workflow publicado; não foram enfileiradas.");
  const { data: identities, error: identitiesError } = await db.from("whatsapp_contact_identities").select("id, phone_e164, consent_status").eq("store_id", identity.store_id).eq("channel_instance_id", campaign.channel_instance_id).eq("provider", instance.provider).eq("consent_status", "opted_in").not("phone_e164", "is", null);
  if (identitiesError) throw new Error(`Falha ao materializar audiência: ${identitiesError.message}`);
  const { data: optOutLeads } = await db.from("leads_crm").select("phone").eq("store_id", identity.store_id).eq("whatsapp_opt_out", true);
  const optOutSuffixes = new Set((optOutLeads || []).map((r: any) => String(r.phone || "").replace(/\D/g, "").slice(-8)).filter((s) => s.length === 8));
  let queued = 0;
  for (let idx = 0; idx < (identities || []).length; idx++) {
    const contact = identities![idx];
    const phoneDigits = String(contact.phone_e164 || "").replace(/\D/g, "");
    if (phoneDigits.length >= 8 && optOutSuffixes.has(phoneDigits.slice(-8))) continue;
    const { data: recipient } = await db.from("whatsapp_campaign_recipients").upsert({ campaign_id: campaign.id, store_id: identity.store_id, identity_id: contact.id, status: "eligible" }, { onConflict: "campaign_id,identity_id", ignoreDuplicates: true }).select("id, outbox_id, status").maybeSingle();
    if (!recipient || recipient.outbox_id || ["accepted", "sent", "delivered", "read"].includes(recipient.status)) continue;
    const idempotencyKey = `campaign:${campaign.id}:identity:${contact.id}`;
    const payload = campaign.message_type === "template" && instance.provider === "meta_cloud_api"
      ? { template: { name: campaign.template_name, language: { code: campaign.template_language || "pt_BR" }, components: campaign.template_parameters || [] }, campaign_id: campaign.id }
      : { text: campaign.description || "", campaign_id: campaign.id, simulate_presence: true, typing_delay_ms: 1800 };
    const { data: outbox } = await db.from("whatsapp_outbox").upsert({ store_id: identity.store_id, channel_instance_id: instance.id, provider: instance.provider, idempotency_key: idempotencyKey, recipient_phone: contact.phone_e164, message_type: instance.provider === "evolution_api" ? "text" : campaign.message_type, payload, status: "pending" }, { onConflict: "store_id,idempotency_key", ignoreDuplicates: true }).select("id").maybeSingle();
    if (outbox?.id) { await db.from("whatsapp_campaign_recipients").update({ outbox_id: outbox.id, status: "queued", updated_at: new Date().toISOString() }).eq("id", recipient.id); queued++; }
  }
  await db.from("whatsapp_campaigns").update({ status: queued ? "running" : "completed", started_at: new Date().toISOString(), completed_at: queued ? null : new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", campaign.id).eq("store_id", identity.store_id);
  return { campaign_id: campaign.id, queued, consent_rule: "opted_in_only", provider: instance.provider };
});

export const pauseWhatsAppCampaign = createServerFn({ method: "POST" }).validator(z.object({ id: z.string().uuid() })).handler(async ({ data }) => {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager"]);
  const db = getServerClient();
  const nowIso = new Date().toISOString();
  await db.from("whatsapp_campaigns").update({ status: "paused", updated_at: nowIso }).eq("id", data.id).eq("store_id", identity.store_id);
  const { data: queuedRecipients } = await db
    .from("whatsapp_campaign_recipients")
    .select("id, outbox_id")
    .eq("campaign_id", data.id)
    .eq("store_id", identity.store_id)
    .in("status", ["eligible", "queued"]);
  const outboxIds = (queuedRecipients || []).map((r: any) => r.outbox_id).filter(Boolean);
  if (outboxIds.length > 0) {
    await db
      .from("whatsapp_outbox")
      .update({ status: "dead_letter", last_error_code: "CAMPAIGN_PAUSED", last_error_message: "Campanha pausada pelo operador", updated_at: nowIso })
      .eq("store_id", identity.store_id)
      .in("id", outboxIds)
      .in("status", ["pending", "failed"]);
  }
  await db.from("whatsapp_campaign_recipients").update({ status: "cancelled", updated_at: nowIso }).eq("campaign_id", data.id).eq("store_id", identity.store_id).in("status", ["eligible", "queued"]);
  return { success: true, cancelledOutboxCount: outboxIds.length };
});
