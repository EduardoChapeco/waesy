import { createServerFn } from "@tanstack/react-start";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity, STAFF_ROLES } from "@/lib/server-access";
import { isContactScopeSuppressed, type WhatsAppContactScope } from "@/lib/whatsapp-contact-scope";

const providerSchema = z.enum(["whatsapp_cloud_api", "evolution_api", "wasender_api", "render_bridge", "custom_webhook"]);
const contactScopeSchema = z.enum(["lead", "internal_team", "stakeholder", "supplier", "ignored"]);
const phoneSchema = z.string().trim().min(7).max(32);

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) throw new Error("Telefone WhatsApp inválido.");
  return `+${digits}`;
}
function phoneHash(phone: string) { return createHash("sha256").update(phone).digest("hex"); }

export const listWhatsAppContactIdentities = createServerFn({ method: "GET" })
  .validator(z.object({ query: z.string().optional(), consentStatus: z.enum(["all", "unknown", "opted_in", "opted_out"]).optional(), contactScope: z.enum(["all", "lead", "internal_team", "stakeholder", "supplier", "ignored"]).optional(), limit: z.number().int().min(1).max(100).optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);
    const db = getServerClient();
    let query = db.from("whatsapp_contact_identities").select("id, store_id, channel_instance_id, customer_id, lead_id, provider, external_user_id, phone_e164, display_name, profile_name, consent_status, consent_source, consent_at, contact_scope, suppress_lead_capture, internal_role_label, muted_at, first_seen_at, last_seen_at, metadata, created_at, updated_at").eq("store_id", identity.store_id).order("last_seen_at", { ascending: false }).limit(data?.limit || 50);
    if (data?.consentStatus && data.consentStatus !== "all") query = query.eq("consent_status", data.consentStatus);
    if (data?.contactScope && data.contactScope !== "all") query = query.eq("contact_scope", data.contactScope);
    if (data?.query?.trim()) query = query.or(`display_name.ilike.%${data.query.trim()}%,phone_e164.ilike.%${data.query.trim()}%,external_user_id.ilike.%${data.query.trim()}%`);
    const { data: rows, error } = await query;
    if (error && /contact_scope|suppress_lead_capture|column/i.test(error.message || "")) {
      let fallback = db.from("whatsapp_contact_identities").select("id, store_id, channel_instance_id, customer_id, lead_id, provider, external_user_id, phone_e164, display_name, profile_name, consent_status, consent_source, consent_at, first_seen_at, last_seen_at, metadata, created_at, updated_at").eq("store_id", identity.store_id).order("last_seen_at", { ascending: false }).limit(data?.limit || 50);
      if (data?.consentStatus && data.consentStatus !== "all") fallback = fallback.eq("consent_status", data.consentStatus);
      if (data?.query?.trim()) fallback = fallback.or(`display_name.ilike.%${data.query.trim()}%,phone_e164.ilike.%${data.query.trim()}%,external_user_id.ilike.%${data.query.trim()}%`);
      const fbRes = await fallback;
      if (fbRes.error) throw new Error(`Falha ao listar identidades WhatsApp: ${fbRes.error.message}`);
      return fbRes.data || [];
    }
    if (error) throw new Error(`Falha ao listar identidades WhatsApp: ${error.message}`);
    return rows || [];
  });

export const upsertWhatsAppContactIdentity = createServerFn({ method: "POST" })
  .validator(z.object({ provider: providerSchema, channelInstanceId: z.string().uuid().optional().nullable(), externalUserId: z.string().trim().max(200).optional().nullable(), phone: phoneSchema.optional().nullable(), displayName: z.string().trim().max(180).optional().nullable(), profileName: z.string().trim().max(180).optional().nullable(), customerId: z.string().uuid().optional().nullable(), leadId: z.string().uuid().optional().nullable(), consentStatus: z.enum(["unknown", "opted_in", "opted_out"]).optional(), contactScope: contactScopeSchema.optional(), suppressLeadCapture: z.boolean().optional(), internalRoleLabel: z.string().trim().max(120).optional().nullable() }))
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
    const resolvedScope: WhatsAppContactScope = data.contactScope || existing?.contact_scope || "lead";
    const resolvedSuppress = data.suppressLeadCapture ?? isContactScopeSuppressed(resolvedScope, existing?.suppress_lead_capture);
    const basePayload = { store_id: identity.store_id, channel_instance_id: data.channelInstanceId || null, provider: data.provider, external_user_id: data.externalUserId || null, phone_e164: phone, phone_hash: hash, display_name: data.displayName || null, profile_name: data.profileName || null, customer_id: data.customerId || existing?.customer_id || null, lead_id: resolvedSuppress ? null : (data.leadId || existing?.lead_id || null), consent_status: data.consentStatus || existing?.consent_status || "unknown", last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const scopedPayload = {
      ...basePayload,
      contact_scope: resolvedScope,
      suppress_lead_capture: resolvedSuppress,
      internal_role_label: data.internalRoleLabel !== undefined ? data.internalRoleLabel : (existing?.internal_role_label ?? null),
      muted_at: resolvedSuppress ? (existing?.muted_at || new Date().toISOString()) : null,
      metadata: {
        ...(existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
        contact_scope: resolvedScope,
        suppress_lead_capture: resolvedSuppress,
        ...(data.internalRoleLabel !== undefined ? { internal_role_label: data.internalRoleLabel } : {}),
      },
    };
    let savedIdentity: any = null;
    if (existing) {
      let updRes = await db.from("whatsapp_contact_identities").update(scopedPayload).eq("id", existing.id).eq("store_id", identity.store_id).select().single();
      if (updRes.error && /contact_scope|suppress_lead_capture|column/i.test(updRes.error.message || "")) {
        updRes = await db.from("whatsapp_contact_identities").update({ ...basePayload, metadata: scopedPayload.metadata }).eq("id", existing.id).eq("store_id", identity.store_id).select().single();
      }
      if (updRes.error) throw new Error(`Falha ao atualizar identidade WhatsApp: ${updRes.error.message}`);
      savedIdentity = updRes.data;
    } else {
      let insRes = await db.from("whatsapp_contact_identities").insert(scopedPayload).select().single();
      if (insRes.error && /contact_scope|suppress_lead_capture|column/i.test(insRes.error.message || "")) {
        insRes = await db.from("whatsapp_contact_identities").insert({ ...basePayload, metadata: scopedPayload.metadata }).select().single();
      }
      if (insRes.error) throw new Error(`Falha ao criar identidade WhatsApp: ${insRes.error.message}`);
      savedIdentity = insRes.data;
    }

    const resolvedName = data.displayName || data.profileName || null;
    const isGroup = Boolean(data.externalUserId && String(data.externalUserId).includes("@g.us"));
    const syncThreadOr: string[] = [];
    if (savedIdentity?.id) syncThreadOr.push(`channel_identity_id.eq.${savedIdentity.id}`);
    if (data.externalUserId) syncThreadOr.push(`entity_id.eq.${data.externalUserId}`);
    if (!isGroup && phone) syncThreadOr.push(`primary_phone_e164.eq.${phone}`);

    if (syncThreadOr.length > 0 && (resolvedName || (!isGroup && phone) || data.customerId || data.leadId)) {
      const threadSync: Record<string, any> = { updated_at: new Date().toISOString() };
      if (resolvedName) threadSync.guest_name = resolvedName;
      if (isGroup && resolvedName) {
        threadSync.group_subject = resolvedName;
        threadSync.subject = `Grupo: ${resolvedName}`;
      } else if (!isGroup && phone) {
        threadSync.primary_phone_e164 = phone;
      }
      if (data.customerId) {
        // chat_threads.customer_id referencia public.profiles(id), nunca customers_crm(id)
        const { data: matchedProfile } = await db
          .from("profiles")
          .select("id")
          .eq("id", data.customerId)
          .maybeSingle();
        if (matchedProfile?.id) {
          threadSync.customer_id = matchedProfile.id;
        }
      }
      if (data.leadId) threadSync.lead_id = data.leadId;

      await db
        .from("chat_threads")
        .update(threadSync)
        .eq("store_id", identity.store_id)
        .or(syncThreadOr.join(","));
    }

    if (!isGroup && data.customerId && (resolvedName || phone)) {
      const crmSync: Record<string, any> = { updated_at: new Date().toISOString() };
      if (resolvedName) crmSync.full_name = resolvedName;
      if (phone) crmSync.phone = phone;
      await db.from("customers_crm").update(crmSync).eq("store_id", identity.store_id).eq("id", data.customerId);
    }

    if (!isGroup && data.leadId && (resolvedName || phone)) {
      const leadSync: Record<string, any> = { updated_at: new Date().toISOString() };
      if (resolvedName) leadSync.full_name = resolvedName;
      if (phone) leadSync.phone = phone;
      await db.from("leads_crm").update(leadSync).eq("store_id", identity.store_id).eq("id", data.leadId);
    }

    return savedIdentity;
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

export const updateWhatsAppContactScope = createServerFn({ method: "POST" })
  .validator(
    z.object({
      threadId: z.string().uuid().optional().nullable(),
      identityId: z.string().uuid().optional().nullable(),
      storeId: z.string().uuid().optional().nullable(),
      contactScope: contactScopeSchema,
      suppressLeadCapture: z.boolean().optional(),
      internalRoleLabel: z.string().trim().max(120).optional().nullable(),
      archiveLinkedLead: z.boolean().optional().default(false),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const targetStoreId = data.storeId || identity.store_id;
    assertStoreAccess(identity, STAFF_ROLES, targetStoreId);
    const db = getServerClient();
    const nowIso = new Date().toISOString();
    const suppressed = data.suppressLeadCapture ?? isContactScopeSuppressed(data.contactScope, false);

    let resolvedIdentityId = data.identityId || null;
    let resolvedLeadId: string | null = null;
    let threadMeta: Record<string, any> = {};

    if (data.threadId) {
      const { data: threadRow } = await db
        .from("chat_threads")
        .select("id, channel_identity_id, lead_id, metadata")
        .eq("id", data.threadId)
        .eq("store_id", targetStoreId)
        .maybeSingle();
      if (threadRow) {
        resolvedIdentityId = resolvedIdentityId || (threadRow as any).channel_identity_id || null;
        resolvedLeadId = (threadRow as any).lead_id || null;
        threadMeta =
          threadRow.metadata && typeof threadRow.metadata === "object"
            ? (threadRow.metadata as Record<string, any>)
            : {};
      }
    }

    if (resolvedIdentityId) {
      const { data: idRow } = await db
        .from("whatsapp_contact_identities")
        .select("id, lead_id, metadata")
        .eq("id", resolvedIdentityId)
        .eq("store_id", targetStoreId)
        .maybeSingle();
      if (idRow) {
        resolvedLeadId = resolvedLeadId || (idRow as any).lead_id || null;
        const nextIdMeta = {
          ...(idRow.metadata && typeof idRow.metadata === "object" ? (idRow.metadata as Record<string, any>) : {}),
          contact_scope: data.contactScope,
          suppress_lead_capture: suppressed,
          ...(data.internalRoleLabel !== undefined ? { internal_role_label: data.internalRoleLabel } : {}),
        };
        const updRes = await db
          .from("whatsapp_contact_identities")
          .update({
            contact_scope: data.contactScope,
            suppress_lead_capture: suppressed,
            internal_role_label: data.internalRoleLabel ?? null,
            muted_at: suppressed ? nowIso : null,
            metadata: nextIdMeta,
            ...(data.archiveLinkedLead ? { lead_id: null } : {}),
            updated_at: nowIso,
          })
          .eq("id", resolvedIdentityId)
          .eq("store_id", targetStoreId);
        if (updRes.error && /contact_scope|suppress_lead_capture|column/i.test(updRes.error.message || "")) {
          await db
            .from("whatsapp_contact_identities")
            .update({
              metadata: nextIdMeta,
              ...(data.archiveLinkedLead ? { lead_id: null } : {}),
              updated_at: nowIso,
            })
            .eq("id", resolvedIdentityId)
            .eq("store_id", targetStoreId);
        }
      }
    }

    let archivedLeadId: string | null = null;
    const archivedLeadIds: string[] = [];
    if (data.archiveLinkedLead && suppressed) {
      const targetIdsToArchive = new Set<string>();
      if (resolvedLeadId) targetIdsToArchive.add(resolvedLeadId);

      // Também identifica eventuais leads abertos criados por engano para o mesmo telefone do contato interno
      let contactPhone: string | null = null;
      if (resolvedIdentityId) {
        const { data: idPhoneRow } = await db
          .from("whatsapp_contact_identities")
          .select("phone_e164")
          .eq("id", resolvedIdentityId)
          .eq("store_id", targetStoreId)
          .maybeSingle();
        if (idPhoneRow?.phone_e164) contactPhone = String(idPhoneRow.phone_e164);
      }
      if (!contactPhone && data.threadId) {
        const { data: thPhoneRow } = await db
          .from("chat_threads")
          .select("primary_phone_e164")
          .eq("id", data.threadId)
          .eq("store_id", targetStoreId)
          .maybeSingle();
        if (thPhoneRow?.primary_phone_e164) contactPhone = String(thPhoneRow.primary_phone_e164);
      }

      if (contactPhone) {
        const { buildBrazilPhoneVariants, sanitizePhoneDigits } = await import("@/lib/phone-match");
        const variants = buildBrazilPhoneVariants(contactPhone);
        const last8 = sanitizePhoneDigits(contactPhone).slice(-8);
        const orClauses = [
          ...variants.slice(0, 6).map((v) => `phone.eq.${v}`),
          ...(last8.length === 8 ? [`phone.ilike.%${last8.slice(0, 4)}%${last8.slice(4)}%`] : []),
        ];
        if (orClauses.length > 0) {
          const { data: phoneLeads } = await db
            .from("leads_crm")
            .select("id")
            .eq("store_id", targetStoreId)
            .not("status", "in", "(won,lost,archived)")
            .or(orClauses.join(","))
            .limit(10);
          for (const pl of phoneLeads || []) {
            if (pl?.id) targetIdsToArchive.add(String(pl.id));
          }
        }

        if (variants.length > 0) {
          await db
            .from("whatsapp_lead_conversions")
            .update({ status: "ignored" })
            .eq("store_id", targetStoreId)
            .in("phone_target", variants)
            .then(() => null, () => null);
        }
      }

      if (targetIdsToArchive.size > 0) {
        const idList = Array.from(targetIdsToArchive);
        const { error: archErr } = await db
          .from("leads_crm")
          .update({
            status: "archived",
            updated_at: nowIso,
          })
          .eq("store_id", targetStoreId)
          .in("id", idList);
        if (!archErr) {
          archivedLeadId = idList[0];
          archivedLeadIds.push(...idList);
        }
      }
    }

    if (data.threadId) {
      const nextThreadMeta: Record<string, any> = {
        ...threadMeta,
        contact_scope: data.contactScope,
        suppress_lead_capture: suppressed,
        ...(data.internalRoleLabel !== undefined ? { internal_role_label: data.internalRoleLabel } : {}),
        ...(data.archiveLinkedLead ? { active_lead_id: "none" } : {}),
      };
      await db
        .from("chat_threads")
        .update({
          metadata: nextThreadMeta,
          ...(data.archiveLinkedLead ? { lead_id: null } : {}),
        })
        .eq("id", data.threadId)
        .eq("store_id", targetStoreId);
    }

    return {
      success: true,
      contactScope: data.contactScope,
      suppressLeadCapture: suppressed,
      internalRoleLabel: data.internalRoleLabel ?? null,
      archivedLeadId,
      archivedLeadIds,
    };
  });
