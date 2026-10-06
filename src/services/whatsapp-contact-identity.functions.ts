import { createServerFn } from "@tanstack/react-start";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";

const providerSchema = z.enum(["whatsapp_cloud_api", "evolution_api", "wasender_api", "render_bridge", "custom_webhook"]);
const phoneSchema = z.string().trim().min(7).max(32);

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) throw new Error("Telefone WhatsApp inválido.");
  return `+${digits}`;
}
function phoneHash(phone: string) { return createHash("sha256").update(phone).digest("hex"); }

export const listWhatsAppContactIdentities = createServerFn({ method: "GET" })
  .validator(z.object({ query: z.string().optional(), consentStatus: z.enum(["all", "unknown", "opted_in", "opted_out"]).optional(), limit: z.number().int().min(1).max(100).optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);
    const db = getServerClient();
    let query = db.from("whatsapp_contact_identities").select("id, store_id, channel_instance_id, customer_id, lead_id, provider, external_user_id, phone_e164, display_name, profile_name, consent_status, consent_source, consent_at, first_seen_at, last_seen_at, metadata, created_at, updated_at").eq("store_id", identity.store_id).order("last_seen_at", { ascending: false }).limit(data?.limit || 50);
    if (data?.consentStatus && data.consentStatus !== "all") query = query.eq("consent_status", data.consentStatus);
    if (data?.query?.trim()) query = query.or(`display_name.ilike.%${data.query.trim()}%,phone_e164.ilike.%${data.query.trim()}%,external_user_id.ilike.%${data.query.trim()}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(`Falha ao listar identidades WhatsApp: ${error.message}`);
    return rows || [];
  });

export const upsertWhatsAppContactIdentity = createServerFn({ method: "POST" })
  .validator(z.object({ provider: providerSchema, channelInstanceId: z.string().uuid().optional().nullable(), externalUserId: z.string().trim().max(200).optional().nullable(), phone: phoneSchema.optional().nullable(), displayName: z.string().trim().max(180).optional().nullable(), profileName: z.string().trim().max(180).optional().nullable(), customerId: z.string().uuid().optional().nullable(), leadId: z.string().uuid().optional().nullable(), consentStatus: z.enum(["unknown", "opted_in", "opted_out"]).optional() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);
    const phone = data.phone ? normalizePhone(data.phone) : null;
    const hash = phone ? phoneHash(phone) : null;
    if (!data.externalUserId && !hash) throw new Error("É necessário informar o identificador externo ou telefone.");
    const db = getServerClient();
    let existing: any = null;
    if (data.externalUserId) {
      const result = await db.from("whatsapp_contact_identities").select("*").eq("store_id", identity.store_id).eq("provider", data.provider).eq("external_user_id", data.externalUserId).maybeSingle();
      existing = result.data;
    }
    if (!existing && hash) {
      const result = await db.from("whatsapp_contact_identities").select("*").eq("store_id", identity.store_id).eq("provider", data.provider).eq("phone_hash", hash).maybeSingle();
      existing = result.data;
    }
    const payload = { store_id: identity.store_id, channel_instance_id: data.channelInstanceId || null, provider: data.provider, external_user_id: data.externalUserId || null, phone_e164: phone, phone_hash: hash, display_name: data.displayName || null, profile_name: data.profileName || null, customer_id: data.customerId || existing?.customer_id || null, lead_id: data.leadId || existing?.lead_id || null, consent_status: data.consentStatus || existing?.consent_status || "unknown", last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (existing) {
      const { data: updated, error } = await db.from("whatsapp_contact_identities").update(payload).eq("id", existing.id).eq("store_id", identity.store_id).select().single();
      if (error) throw new Error(`Falha ao atualizar identidade WhatsApp: ${error.message}`);
      return updated;
    }
    const { data: created, error } = await db.from("whatsapp_contact_identities").insert(payload).select().single();
    if (error) throw new Error(`Falha ao criar identidade WhatsApp: ${error.message}`);
    return created;
  });

export const setWhatsAppContactConsent = createServerFn({ method: "POST" })
  .validator(z.object({ identityId: z.string().uuid(), consentStatus: z.enum(["unknown", "opted_in", "opted_out"]), source: z.string().trim().min(2).max(120) }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);
    const { data: updated, error } = await getServerClient().from("whatsapp_contact_identities").update({ consent_status: data.consentStatus, consent_source: data.source, consent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", data.identityId).eq("store_id", identity.store_id).select("id, consent_status, consent_source, consent_at").single();
    if (error) throw new Error(`Falha ao registrar consentimento: ${error.message}`);
    return updated;
  });

export const linkWhatsAppContactIdentity = createServerFn({ method: "POST" })
  .validator(z.object({ identityId: z.string().uuid(), customerId: z.string().uuid().optional().nullable(), leadId: z.string().uuid().optional().nullable() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);
    const { data: linked, error } = await getServerClient().from("whatsapp_contact_identities").update({ customer_id: data.customerId || null, lead_id: data.leadId || null, updated_at: new Date().toISOString() }).eq("id", data.identityId).eq("store_id", identity.store_id).select("id, customer_id, lead_id").single();
    if (error) throw new Error(`Falha ao vincular identidade ao CRM: ${error.message}`);
    return linked;
  });
