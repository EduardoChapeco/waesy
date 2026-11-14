/**
 * lead-forms.functions.ts — Motor Universal de Formulários de Captura, Landing Pages Mágicas e CRM
 * 100% Real no Supabase | Zero Mocks | Registro Rápido Sem Fricção
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/start-server-core";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, STAFF_ROLES } from "@/lib/server-access";
import { captureRequestTelemetry } from "@/lib/network-telemetry.server";

function resolveDeviceFingerprint(clientProvidedFingerprint?: string | null, ip?: string, userAgent?: string): string {
  if (clientProvidedFingerprint && clientProvidedFingerprint.trim().length >= 8) {
    return clientProvidedFingerprint.trim().slice(0, 128);
  }
  const raw = `${ip || "127.0.0.1"}::${userAgent || "unknown"}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "fp_" + Math.abs(hash).toString(16).padStart(8, "0");
}

// ─── Tipagens e Interfaces ───────────────────────────────────────────────────

export interface LeadFormFieldDTO {
  id: string;
  form_id: string;
  field_key: string;
  field_type: "text" | "phone" | "email" | "select" | "radio" | "checkbox" | "currency" | "date" | "number" | "textarea" | "cpf" | "cep" | "address";
  label: string;
  placeholder?: string | null;
  helper_text?: string | null;
  is_required: boolean;
  sort_order: number;
  step_index?: number;
  skip_to_step?: number | null;
  options?: Array<{ label: string; value: string; skip_to_step?: number | null; submit_on_select?: boolean }> | null;
  validation_rules?: Record<string, any> | null;
}

export interface LeadFormDTO {
  id: string;
  store_id: string;
  author_profile_id?: string | null;
  classified_id?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  niche_id: string;
  theme_color?: string | null;
  cover_image_url?: string | null;
  background_image_url?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  submit_button_text: string;
  after_submit_action: "start_sdr_chat" | "whatsapp_redirect" | "show_success_message" | "external_redirect";
  whatsapp_target_phone?: string | null;
  whatsapp_message_template?: string | null;
  success_message?: string | null;
  redirect_url?: string | null;
  trigger_mode: "button_click" | "scroll_50" | "exit_intent" | "bottom_bar";
  scroll_trigger_pct?: number | null;
  time_delay_seconds?: number | null;
  quick_signup_enabled: boolean;
  status: "active" | "paused" | "archived";
  views_count: number;
  submissions_count: number;
  created_at: string;
  updated_at: string;
  fields?: LeadFormFieldDTO[];
  store?: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
  } | null;
}

export interface LeadFormSubmissionDTO {
  id: string;
  form_id: string;
  store_id: string;
  classified_id?: string | null;
  profile_id?: string | null;
  contact_name: string;
  contact_email?: string | null;
  contact_phone: string;
  is_new_registered_user: boolean;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  device_type?: string | null;
  crm_status: "new" | "contacted" | "qualified" | "won" | "lost";
  operator_notes?: string | null;
  assigned_to_profile_id?: string | null;
  raw_answers: Record<string, any>;
  created_at: string;
  updated_at: string;
  form?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  classified?: {
    id: string;
    title: string;
    price_cents?: number | null;
  } | null;
}

// ─── 1. Leitura Pública do Formulário por Slug ────────────────────────────────

export const getPublicLeadFormBySlug = createServerFn({ method: "GET" })
  .validator(
    z.object({
      slug: z.string().min(1, "Slug obrigatório"),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    // 1. Busca o formulário ativo
    const { data: formRow, error: formError } = await supabase
      .from("lead_forms")
      .select(`
        id,
        store_id,
        title,
        slug,
        description,
        niche_id,
        theme_color,
        cover_image_url,
        headline,
        subheadline,
        submit_button_text,
        after_submit_action,
        whatsapp_target_phone,
        whatsapp_message_template,
        success_message,
        redirect_url,
        trigger_mode,
        scroll_trigger_pct,
        time_delay_seconds,
        quick_signup_enabled,
        status,
        views_count,
        submissions_count,
        created_at,
        updated_at,
        stores (
          id,
          name,
          slug,
          logo_url,
          avatar_url,
          phone
        )
      `)
      .eq("slug", data.slug)
      .eq("status", "active")
      .single();

    if (formError || !formRow) {
      return null;
    }

    // 2. Incrementa visualização em background defensivo
    try {
      await supabase
        .from("lead_forms")
        .update({ views_count: (formRow.views_count || 0) + 1 })
        .eq("id", formRow.id);
    } catch (err) { console.warn("[lead-forms] update views_count error:", err); }

    // 3. Busca campos ordenados
    const { data: fieldsRows } = await supabase
      .from("lead_form_fields")
      .select("*")
      .eq("form_id", formRow.id)
      .order("sort_order", { ascending: true });

    return {
      ...formRow,
      fields: (fieldsRows || []) as LeadFormFieldDTO[],
      store: formRow.stores as any,
    } as LeadFormDTO;
  });

// ─── 2. Submissão Pública com Registro Rápido Sem Fricção ─────────────────────

export const submitPublicLeadForm = createServerFn({ method: "POST" })
  .validator(
    z.object({
      formSlug: z.string().min(1),
      leadId: z.string().uuid().optional().nullable(),
      classifiedId: z.string().uuid().optional().nullable(),
      contactName: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
      contactEmail: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
      contactPhone: z.string().min(8, "Telefone inválido"),
      answers: z.record(z.any()).default({}),
      utmSource: z.string().optional().nullable(),
      utmMedium: z.string().optional().nullable(),
      utmCampaign: z.string().optional().nullable(),
      utmContent: z.string().optional().nullable(),
      utmTerm: z.string().optional().nullable(),
      fbclid: z.string().optional().nullable(),
      fbp: z.string().optional().nullable(),
      fbc: z.string().optional().nullable(),
      gclid: z.string().optional().nullable(),
      ttclid: z.string().optional().nullable(),
      ctwaClid: z.string().optional().nullable(),
      adId: z.string().optional().nullable(),
      adsetId: z.string().optional().nullable(),
      campaignId: z.string().optional().nullable(),
      creativeId: z.string().optional().nullable(),
      landingUrl: z.string().optional().nullable(),
      sourceUrl: z.string().optional().nullable(),
      referrer: z.string().optional().nullable(),
      deviceId: z.string().optional().nullable(),
      visitorId: z.string().optional().nullable(),
      leadCode: z.string().optional().nullable(),
      deviceType: z.string().default("mobile"),
      deviceFingerprint: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    // 0. Extração de Telemetria de Borda Cloudflare & Fingerprint Anti-Spam
    let req: Request | null = null;
    try {
      req = getRequest();
    } catch (err) {
      console.warn("[lead-forms:submitPublicLeadForm] getRequest error:", err);
    }

    const telemetry = captureRequestTelemetry(req);
    const fingerprint = resolveDeviceFingerprint(data.deviceFingerprint, telemetry.ip, telemetry.userAgent);

    // Verificação de Limite de Taxa / Anti-Spam
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    let isSpam = telemetry.threatScore >= 60;
    try {
      const { count: recentSubmissionsCount } = await supabase
        .from("lead_form_submissions")
        .select("id", { count: "exact", head: true })
        .or(`ip_address.eq.${telemetry.ip},device_fingerprint.eq.${fingerprint}`)
        .gte("created_at", tenMinutesAgo);

      if ((recentSubmissionsCount || 0) >= 8) {
        isSpam = true;
      }
      if ((recentSubmissionsCount || 0) >= 20) {
        throw new Error("Muitas tentativas detectadas. Por favor aguarde alguns minutos.");
      }
    } catch (spamCheckErr: any) {
      if (spamCheckErr?.message?.includes("Muitas tentativas")) {
        throw spamCheckErr;
      }
    }

    // 1. Localiza o formulário e a loja
    const { data: formRow, error: formError } = await supabase
      .from("lead_forms")
      .select("id, store_id, title, slug, after_submit_action, whatsapp_target_phone, whatsapp_message_template, success_message, redirect_url, quick_signup_enabled, submissions_count")
      .eq("slug", data.formSlug)
      .eq("status", "active")
      .single();

    if (formError || !formRow) {
      throw new Error("Formulário não encontrado ou inativo");
    }

    // 2. Resolução de Identidade / Registro Rápido
    let profileId: string | null = null;
    let isNewRegisteredUser = false;

    // Tenta identificar se o usuário já está autenticado via sessão
    try {
      const identity = await getServerIdentity().catch(() => null);
      if (identity?.id) {
        profileId = identity.id;
      }
    } catch {
      // Ignora erro se for anônimo
    }

    // Se anônimo e quick_signup_enabled: busca ou gera perfil rápido
    const cleanPhone = data.contactPhone.replace(/\D/g, "");
    const cleanEmail = data.contactEmail?.trim().toLowerCase() || null;

    if (!profileId) {
      // Tenta achar perfil existente por telefone ou email
      let profileQuery = supabase.from("profiles").select("id").limit(1);
      if (cleanEmail) {
        profileQuery = profileQuery.or(`phone.eq.${cleanPhone},email.eq.${cleanEmail}`);
      } else {
        profileQuery = profileQuery.eq("phone", cleanPhone);
      }

      const { data: existingProfiles } = await profileQuery;
      if (existingProfiles && existingProfiles.length > 0) {
        profileId = existingProfiles[0].id;
      } else if (formRow.quick_signup_enabled) {
        // Criação de perfil provisório/anônimo sem fricção (Registro Rápido)
        try {
          const newUserId = crypto.randomUUID();
          const { data: createdProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: newUserId,
              full_name: data.contactName.trim(),
              phone: cleanPhone,
              email: cleanEmail,
              role: "customer",
              is_anonymous: true,
              terms_accepted_at: new Date().toISOString(),
              is_consent_lgpd: true,
            })
            .select("id")
            .single();

          if (!createError && createdProfile) {
            profileId = createdProfile.id;
            isNewRegisteredUser = true;
          }
        } catch (regErr) {
          console.warn("[lead-forms] Aviso ao criar perfil rápido provisório:", regErr);
        }
      }
    }

    // 2.1 Ingestao ou atualizacao canonica no CRM (leads_crm + customers_crm com todas raw_answers)
    const { buildPhoneLookupCandidates, recordAttributionTouchpoint, dispatchServerSidePixelConversion } =
      await import("@/services/omnichannel-attribution.server");
    const phoneInfo = buildPhoneLookupCandidates(data.contactPhone);
    const formLeadCode = data.leadCode || `WAEF-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

    let ingestedLeadId: string | null = data.leadId || null;
    let ingestedCustomerId: string | null = null;
    try {
      const { ingestOmnichannelLead } = await import("./omnichannel-lead-ingestion");
      const ingested = await ingestOmnichannelLead(supabase, {
        storeId: formRow.store_id,
        leadId: data.leadId || null,
        source: "lead_form",
        sourceDetail: formRow.title || formRow.slug,
        fullName: data.contactName.trim(),
        phone: data.contactPhone.trim(),
        email: cleanEmail,
        sourceFormId: formRow.id,
        sourceListingId: data.classifiedId || null,
        sourceListingOrigin: data.classifiedId ? "classified" : "form",
        customFields: {
          ...(data.answers || {}),
          lead_code: formLeadCode,
          ...(data.utmSource ? { utm_source: data.utmSource } : {}),
          ...(data.utmMedium ? { utm_medium: data.utmMedium } : {}),
          ...(data.utmCampaign ? { utm_campaign: data.utmCampaign } : {}),
          ...(data.utmContent ? { utm_content: data.utmContent } : {}),
          ...(data.utmTerm ? { utm_term: data.utmTerm } : {}),
          ...(data.fbclid ? { fbclid: data.fbclid } : {}),
          ...(data.fbp ? { fbp: data.fbp } : {}),
          ...(data.fbc ? { fbc: data.fbc } : {}),
          ...(data.gclid ? { gclid: data.gclid } : {}),
          ...(data.ttclid ? { ttclid: data.ttclid } : {}),
          ...(data.ctwaClid ? { ctwa_clid: data.ctwaClid } : {}),
          ...(data.adId ? { meta_ad_id: data.adId, ad_id: data.adId } : {}),
          ...(data.adsetId ? { meta_adset_id: data.adsetId, adset_id: data.adsetId } : {}),
          ...(data.campaignId ? { meta_campaign_id: data.campaignId, campaign_id: data.campaignId } : {}),
          ...(data.creativeId ? { creative_id: data.creativeId } : {}),
          ...(data.landingUrl ? { landing_url: data.landingUrl } : {}),
          ...(data.sourceUrl ? { source_url: data.sourceUrl } : {}),
          ...(data.referrer ? { referrer: data.referrer } : {}),
          ...(data.deviceId ? { device_id: data.deviceId } : {}),
        },
      });
      if (ingested.leadId) ingestedLeadId = ingested.leadId;
      if (ingested.customerId) ingestedCustomerId = ingested.customerId;
    } catch (patchErr) {
      console.warn("[lead-forms] notice ingesting omnichannel lead:", patchErr);
    }

    // 3. Salva a submissão com Telemetria Completa de Borda Cloudflare
    const { data: submissionRow, error: submissionError } = await supabase
      .from("lead_form_submissions")
      .insert({
        form_id: formRow.id,
        store_id: formRow.store_id,
        classified_id: data.classifiedId || null,
        profile_id: profileId,
        contact_name: data.contactName.trim(),
        contact_email: cleanEmail,
        contact_phone: data.contactPhone.trim(),
        phone_digits: phoneInfo.digits || null,
        is_new_registered_user: isNewRegisteredUser,
        utm_source: data.utmSource || null,
        utm_medium: data.utmMedium || null,
        utm_campaign: data.utmCampaign || null,
        utm_content: data.utmContent || null,
        utm_term: data.utmTerm || null,
        fbclid: data.fbclid || null,
        fbp: data.fbp || null,
        fbc: data.fbc || null,
        gclid: data.gclid || null,
        ttclid: data.ttclid || null,
        ad_id: data.adId || null,
        campaign_id: data.campaignId || null,
        device_type: data.deviceType,
        ip_address: telemetry.ip,
        device_fingerprint: fingerprint,
        geo_city: telemetry.geo.city,
        geo_state: telemetry.geo.state,
        geo_country: telemetry.geo.country,
        threat_score: telemetry.threatScore,
        cf_ray: telemetry.cfRay,
        is_flagged_spam: isSpam,
        telemetry: {
          deviceName: telemetry.deviceName,
          deviceType: telemetry.deviceType,
          userAgent: telemetry.userAgent,
          geoSource: telemetry.geo.source,
          isDatacenterOrVpn: telemetry.isDatacenterOrVpn,
          threatScore: telemetry.threatScore,
          cfRay: telemetry.cfRay,
        },
        crm_status: "new",
        raw_answers: data.answers || {},
      })
      .select("id")
      .single();

    if (submissionError || !submissionRow) {
      console.error("[lead-forms] Erro ao gravar submissão:", submissionError);
      throw new Error("Erro ao registrar resposta do formulário");
    }

    const eventId = `lead_form_${submissionRow.id}`;
    await recordAttributionTouchpoint(supabase, {
      storeId: formRow.store_id,
      deviceId: data.deviceId || null,
      visitorId: data.visitorId || null,
      profileId,
      phone: phoneInfo.e164 || data.contactPhone.trim(),
      email: cleanEmail,
      leadCode: formLeadCode,
      ctwaClid: data.ctwaClid || null,
      fbclid: data.fbclid || null,
      fbp: data.fbp || null,
      fbc: data.fbc || null,
      gclid: data.gclid || null,
      ttclid: data.ttclid || null,
      utmSource: data.utmSource || null,
      utmMedium: data.utmMedium || null,
      utmCampaign: data.utmCampaign || null,
      utmContent: data.utmContent || null,
      utmTerm: data.utmTerm || null,
      adId: data.adId || null,
      adsetId: data.adsetId || null,
      campaignId: data.campaignId || null,
      creativeId: data.creativeId || null,
      formId: formRow.id,
      sourceUrl: data.sourceUrl || null,
      landingUrl: data.landingUrl || null,
      referrer: data.referrer || null,
      entityType: data.classifiedId ? "classified" : "form",
      entityId: data.classifiedId || formRow.id,
      entityTitle: formRow.title,
      capturedVia: "lead_form",
      leadId: ingestedLeadId,
      customerId: ingestedCustomerId,
    });

    if (!isSpam && formRow.store_id) {
      await dispatchServerSidePixelConversion(supabase, {
        storeId: formRow.store_id,
        eventName: "Lead",
        eventId,
        eventSource: "lead_form",
        leadId: ingestedLeadId,
        phone: phoneInfo.e164 || data.contactPhone.trim(),
        email: cleanEmail,
        fullName: data.contactName.trim(),
        fbp: data.fbp || null,
        fbc: data.fbc || null,
        ctwaClid: data.ctwaClid || null,
        sourceUrl: data.sourceUrl || data.landingUrl || null,
        clientIpAddress: telemetry.ip,
        clientUserAgent: telemetry.userAgent,
        customData: {
          form_id: formRow.id,
          form_slug: formRow.slug,
          lead_code: formLeadCode,
          utm_source: data.utmSource || undefined,
          utm_campaign: data.utmCampaign || undefined,
          ad_id: data.adId || undefined,
        },
      });
    }

    // 4. Incrementa contador de submissões no formulário
    try {
      await supabase
        .from("lead_forms")
        .update({
          submissions_count: (formRow.submissions_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formRow.id);
    } catch (err) { console.warn("[lead-forms] update submissions_count error:", err); }

    // 5. Prepara Ação Pós-Envio
    let whatsappUrl: string | null = null;
    let targetPhone = formRow.whatsapp_target_phone;

    // Se não tiver target phone no form, tenta pegar o telefone da loja
    if (!targetPhone) {
      const { data: storeRow } = await supabase
        .from("stores")
        .select("phone")
        .eq("id", formRow.store_id)
        .single();
      targetPhone = storeRow?.phone || null;
    }

    if (formRow.after_submit_action === "whatsapp_redirect" && targetPhone) {
      const cleanTarget = targetPhone.replace(/\D/g, "");
      let msg = formRow.whatsapp_message_template ||
        `Olá! Enviei meus dados através do formulário *${formRow.title}* no Waesy.\n\n *Nome:* ${data.contactName.trim()}\n *Telefone:* ${data.contactPhone.trim()}`;

      // Substituições semânticas de tags
      msg = msg.replace(/\{nome\}/gi, data.contactName.trim())
               .replace(/\{telefone\}/gi, data.contactPhone.trim())
               .replace(/\{formulario\}/gi, formRow.title);

      // Adiciona resumo de respostas chave
      const answerEntries = Object.entries(data.answers || {});
      if (answerEntries.length > 0) {
        msg += "\n\n *Respostas:*";
        for (const [key, val] of answerEntries) {
          if (val !== undefined && val !== null && val !== "") {
            msg += `\n• ${key}: ${typeof val === "object" ? JSON.stringify(val) : val}`;
          }
        }
      }

      msg += `\n\nRef: #${formLeadCode}`;
      const formattedNumber = cleanTarget.startsWith("55") ? cleanTarget : `55${cleanTarget}`;
      whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(msg)}`;
    }

    return {
      submissionId: submissionRow.id,
      leadId: ingestedLeadId,
      customerId: ingestedCustomerId,
      leadCode: formLeadCode,
      eventId,
      afterSubmitAction: formRow.after_submit_action,
      whatsappUrl,
      redirectUrl: formRow.redirect_url,
      successMessage: formRow.success_message || "Recebemos sua solicitação! Entraremos em contato em breve.",
      isNewRegisteredUser,
    };
  });

// ─── 3. Gestão no Workspace: Listagem de Formulários da Loja ──────────────────

export const listStoreLeadForms = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
    }).optional(),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data?.storeId || identity.store_id;

    if (!storeId) {
      return [];
    }

    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const supabase = getServerClient();

    const { data: rows, error } = await supabase
      .from("lead_forms")
      .select(`
        id,
        store_id,
        title,
        slug,
        description,
        niche_id,
        theme_color,
        submit_button_text,
        after_submit_action,
        whatsapp_target_phone,
        status,
        views_count,
        submissions_count,
        created_at,
        updated_at
      `)
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error || !rows) {
      console.error("[lead-forms] Erro ao listar lead_forms:", error);
      return [];
    }

    return rows as LeadFormDTO[];
  });

// ─── 4. Gestão no Workspace: Detalhe do Formulário para Edição ───────────────

export const getLeadFormDetail = createServerFn({ method: "GET" })
  .validator(
    z.object({
      formId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const supabase = getServerClient();

    const { data: formRow, error: formError } = await supabase
      .from("lead_forms")
      .select("*")
      .eq("id", data.formId)
      .single();

    if (formError || !formRow) {
      throw new Error("Formulário não encontrado");
    }

    assertStoreAccess(identity, STAFF_ROLES, formRow.store_id);

    const { data: fieldsRows } = await supabase
      .from("lead_form_fields")
      .select("*")
      .eq("form_id", formRow.id)
      .order("sort_order", { ascending: true });

    return {
      ...formRow,
      fields: (fieldsRows || []) as LeadFormFieldDTO[],
    } as LeadFormDTO;
  });

// ─── 5. Gestão no Workspace: Upsert de Formulário & Campos ───────────────────

export const upsertLeadForm = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      storeId: z.string().uuid().optional(),
      title: z.string().min(2, "Título é obrigatório"),
      slug: z.string().optional(),
      description: z.string().optional().nullable(),
      niche_id: z.string().default("geral"),
      theme_color: z.string().default("primary"),
      cover_image_url: z.string().optional().nullable(),
      background_image_url: z.string().optional().nullable(),
      headline: z.string().optional().nullable(),
      subheadline: z.string().optional().nullable(),
      submit_button_text: z.string().default("Enviar Solicitação"),
      after_submit_action: z.enum(["start_sdr_chat", "whatsapp_redirect", "show_success_message", "external_redirect"]).default("whatsapp_redirect"),
      whatsapp_target_phone: z.string().optional().nullable(),
      whatsapp_message_template: z.string().optional().nullable(),
      success_message: z.string().optional().nullable(),
      redirect_url: z.string().optional().nullable(),
      trigger_mode: z.enum(["button_click", "scroll_50", "exit_intent", "bottom_bar"]).default("button_click"),
      scroll_trigger_pct: z.number().int().default(50),
      quick_signup_enabled: z.boolean().default(true),
      status: z.enum(["active", "paused", "archived"]).default("active"),
      fields: z.array(
        z.object({
          id: z.string().uuid().optional(),
          field_key: z.string().min(1),
          field_type: z.enum(["text", "phone", "email", "select", "radio", "checkbox", "currency", "date", "number", "textarea", "cpf", "cep", "address"]),
          label: z.string().min(1),
          placeholder: z.string().optional().nullable(),
          helper_text: z.string().optional().nullable(),
          is_required: z.boolean().default(false),
          sort_order: z.number().int().default(0),
          step_index: z.number().int().default(1),
          skip_to_step: z.number().int().optional().nullable(),
          options: z.any().optional(),
          validation_rules: z.any().optional(),
        }),
      ).default([]),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data.storeId || identity.store_id;

    if (!storeId) {
      throw new Error("Loja não informada ou não encontrada na sessão");
    }

    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const supabase = getServerClient();

    // Gera slug amigável e único se não fornecido
    let targetSlug = data.slug?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!targetSlug) {
      const baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      targetSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    let formId = data.id;

    if (formId) {
      // Atualização
      const { error: updateError } = await supabase
        .from("lead_forms")
        .update({
          title: data.title.trim(),
          slug: targetSlug,
          description: data.description || null,
          niche_id: data.niche_id,
          theme_color: data.theme_color,
          cover_image_url: data.cover_image_url || null,
          background_image_url: data.background_image_url || null,
          headline: data.headline || null,
          subheadline: data.subheadline || null,
          submit_button_text: data.submit_button_text,
          after_submit_action: data.after_submit_action,
          whatsapp_target_phone: data.whatsapp_target_phone || null,
          whatsapp_message_template: data.whatsapp_message_template || null,
          success_message: data.success_message || null,
          redirect_url: data.redirect_url || null,
          trigger_mode: data.trigger_mode,
          scroll_trigger_pct: data.scroll_trigger_pct,
          quick_signup_enabled: data.quick_signup_enabled,
          status: data.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formId)
        .eq("store_id", storeId);

      if (updateError) {
        console.error("[lead-forms] Erro ao atualizar lead_form:", updateError);
        throw new Error("Erro ao atualizar formulário");
      }
    } else {
      // Criação
      const { data: insertRow, error: insertError } = await supabase
        .from("lead_forms")
        .insert({
          store_id: storeId,
          title: data.title.trim(),
          slug: targetSlug,
          description: data.description || null,
          niche_id: data.niche_id,
          theme_color: data.theme_color,
          cover_image_url: data.cover_image_url || null,
          background_image_url: data.background_image_url || null,
          headline: data.headline || null,
          subheadline: data.subheadline || null,
          submit_button_text: data.submit_button_text,
          after_submit_action: data.after_submit_action,
          whatsapp_target_phone: data.whatsapp_target_phone || null,
          whatsapp_message_template: data.whatsapp_message_template || null,
          success_message: data.success_message || null,
          redirect_url: data.redirect_url || null,
          trigger_mode: data.trigger_mode,
          scroll_trigger_pct: data.scroll_trigger_pct,
          quick_signup_enabled: data.quick_signup_enabled,
          status: data.status,
        })
        .select("id")
        .single();

      if (insertError || !insertRow) {
        console.error("[lead-forms] Erro ao criar lead_form:", insertError);
        throw new Error("Erro ao criar formulário");
      }
      formId = insertRow.id;
    }

    // Sincronização de Campos (LeadFormFields)
    if (formId && data.fields) {
      // 1. Apaga campos que não estão mais presentes
      const incomingFieldIds = data.fields.filter(f => !!f.id).map(f => f.id as string);
      if (incomingFieldIds.length > 0) {
        await supabase
          .from("lead_form_fields")
          .delete()
          .eq("form_id", formId)
          .not("id", "in", `(${incomingFieldIds.join(",")})`);
      } else if (data.id) {
        await supabase.from("lead_form_fields").delete().eq("form_id", formId);
      }

      // 2. Insere/atualiza cada campo
      for (let i = 0; i < data.fields.length; i++) {
        const field = data.fields[i];
        const payload = {
          form_id: formId,
          field_key: field.field_key.trim(),
          field_type: field.field_type,
          label: field.label.trim(),
          placeholder: field.placeholder || null,
          helper_text: field.helper_text || null,
          is_required: field.is_required,
          sort_order: i,
          step_index: field.step_index || 1,
          skip_to_step: field.skip_to_step || null,
          options: field.options || [],
          validation_rules: field.validation_rules || {},
        };

        if (field.id) {
          await supabase.from("lead_form_fields").update(payload).eq("id", field.id);
        } else {
          await supabase.from("lead_form_fields").insert(payload);
        }
      }
    }

    return { success: true, formId, slug: targetSlug };
  });

// ─── 6. Gestão no Workspace: Excluir Formulário ──────────────────────────────

export const deleteLeadForm = createServerFn({ method: "POST" })
  .validator(
    z.object({
      formId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const supabase = getServerClient();

    const { data: formRow } = await supabase
      .from("lead_forms")
      .select("store_id")
      .eq("id", data.formId)
      .single();

    if (!formRow) throw new Error("Formulário não encontrado");
    assertStoreAccess(identity, STAFF_ROLES, formRow.store_id);

    const { error } = await supabase
      .from("lead_forms")
      .delete()
      .eq("id", data.formId);

    if (error) {
      console.error("[lead-forms] Erro ao deletar formulário:", error);
      throw new Error("Erro ao excluir formulário");
    }

    return { success: true };
  });

// ─── 7. Gestão no Workspace: Caixa de Entrada de Leads & Respostas (CRM) ─────

export const listLeadSubmissions = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      formId: z.string().uuid().optional(),
      crmStatus: z.enum(["all", "new", "contacted", "qualified", "won", "lost"]).default("all"),
      search: z.string().optional(),
      page: z.number().int().default(1),
      limit: z.number().int().default(50),
    }).optional(),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data?.storeId || identity.store_id;

    if (!storeId) {
      return { submissions: [], total: 0 };
    }

    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const supabase = getServerClient();

    let query = supabase
      .from("lead_form_submissions")
      .select(`
        id,
        form_id,
        store_id,
        classified_id,
        profile_id,
        contact_name,
        contact_email,
        contact_phone,
        is_new_registered_user,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        device_type,
        crm_status,
        operator_notes,
        assigned_to_profile_id,
        raw_answers,
        created_at,
        updated_at,
        lead_forms (
          id,
          title,
          slug
        ),
        classifieds (
          id,
          title,
          price_cents
        )
      `, { count: "exact" })
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (data?.formId) {
      query = query.eq("form_id", data.formId);
    }

    if (data?.crmStatus && data.crmStatus !== "all") {
      query = query.eq("crm_status", data.crmStatus);
    }

    if (data?.search && data.search.trim()) {
      const q = `%${data.search.trim()}%`;
      query = query.or(`contact_name.ilike.${q},contact_phone.ilike.${q},contact_email.ilike.${q}`);
    }

    const page = data?.page || 1;
    const limit = data?.limit || 50;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: rows, count, error } = await query.range(from, to);

    if (error || !rows) {
      console.error("[lead-forms] Erro ao listar submissions:", error);
      return { submissions: [], total: 0 };
    }

    const mapped = rows.map((r: any) => ({
      ...r,
      form: r.lead_forms,
      classified: r.classifieds,
    })) as LeadFormSubmissionDTO[];

    return { submissions: mapped, total: count || mapped.length };
  });

// ─── 8. Gestão no Workspace: Atualizar Status do CRM & Notas do Operador ─────

export const updateLeadSubmissionStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      submissionId: z.string().uuid(),
      crmStatus: z.enum(["new", "contacted", "qualified", "won", "lost"]),
      operatorNotes: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const supabase = getServerClient();

    const { data: subRow } = await supabase
      .from("lead_form_submissions")
      .select("store_id")
      .eq("id", data.submissionId)
      .single();

    if (!subRow) throw new Error("Submissão não encontrada");
    assertStoreAccess(identity, STAFF_ROLES, subRow.store_id);

    const updatePayload: Record<string, any> = {
      crm_status: data.crmStatus,
      updated_at: new Date().toISOString(),
    };

    if (data.operatorNotes !== undefined) {
      updatePayload.operator_notes = data.operatorNotes;
    }

    const { error } = await supabase
      .from("lead_form_submissions")
      .update(updatePayload)
      .eq("id", data.submissionId);

    if (error) {
      console.error("[lead-forms] Erro ao atualizar status CRM:", error);
      throw new Error("Erro ao atualizar status do lead");
    }

    return { success: true };
  });

// ─── 9. Gestão no Workspace: KPIs Globais de Leads do Lojista ─────────────────

export const getLeadFormsKpis = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
    }).optional(),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data?.storeId || identity.store_id;

    if (!storeId) {
      return {
        totalForms: 0,
        totalViews: 0,
        totalSubmissions: 0,
        conversionRate: 0,
        newLeadsCount: 0,
        contactedCount: 0,
        qualifiedCount: 0,
        wonCount: 0,
        lostCount: 0,
      };
    }

    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const supabase = getServerClient();

    // 1. Métricas de formulários (views e submissions)
    const { data: forms } = await supabase
      .from("lead_forms")
      .select("views_count, submissions_count")
      .eq("store_id", storeId);

    let totalViews = 0;
    let totalSubmissions = 0;
    (forms || []).forEach(f => {
      totalViews += f.views_count || 0;
      totalSubmissions += f.submissions_count || 0;
    });

    const conversionRate = totalViews > 0 ? Number(((totalSubmissions / totalViews) * 100).toFixed(1)) : 0;

    // 2. Status breakdown no CRM
    const { data: subs } = await supabase
      .from("lead_form_submissions")
      .select("crm_status")
      .eq("store_id", storeId);

    let newLeadsCount = 0;
    let contactedCount = 0;
    let qualifiedCount = 0;
    let wonCount = 0;
    let lostCount = 0;

    (subs || []).forEach(s => {
      if (s.crm_status === "new") newLeadsCount++;
      else if (s.crm_status === "contacted") contactedCount++;
      else if (s.crm_status === "qualified") qualifiedCount++;
      else if (s.crm_status === "won") wonCount++;
      else if (s.crm_status === "lost") lostCount++;
    });

    return {
      totalForms: forms?.length || 0,
      totalViews,
      totalSubmissions,
      conversionRate,
      newLeadsCount,
      contactedCount,
      qualifiedCount,
      wonCount,
      lostCount,
    };
  });

// ─── 10. Submissão de Formulário de Qualificação para Anúncios Civis ──────────

export const submitCivilInquiryLead = createServerFn({ method: "POST" })
  .validator(
    z.object({
      classifiedId: z.string().uuid(),
      contactName: z.string().min(2, "Nome é obrigatório"),
      contactPhone: z.string().min(8, "Telefone é obrigatório"),
      contactEmail: z.string().email().optional().nullable(),
      answers: z.record(z.any()).default({}),
      utmSource: z.string().optional().nullable(),
      utmMedium: z.string().optional().nullable(),
      utmCampaign: z.string().optional().nullable(),
      utmContent: z.string().optional().nullable(),
      utmTerm: z.string().optional().nullable(),
      fbclid: z.string().optional().nullable(),
      fbp: z.string().optional().nullable(),
      fbc: z.string().optional().nullable(),
      gclid: z.string().optional().nullable(),
      ttclid: z.string().optional().nullable(),
      ctwaClid: z.string().optional().nullable(),
      adId: z.string().optional().nullable(),
      adsetId: z.string().optional().nullable(),
      campaignId: z.string().optional().nullable(),
      creativeId: z.string().optional().nullable(),
      landingUrl: z.string().optional().nullable(),
      sourceUrl: z.string().optional().nullable(),
      referrer: z.string().optional().nullable(),
      deviceId: z.string().optional().nullable(),
      visitorId: z.string().optional().nullable(),
      deviceType: z.string().default("desktop"),
      deviceFingerprint: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    // 0. Extração de Telemetria de Borda Cloudflare & Fingerprint Anti-Spam
    let req: Request | null = null;
    try {
      req = getRequest();
    } catch (err) {
      console.warn("[lead-forms:submitFastLeadClassified] getRequest error:", err);
    }

    const telemetry = captureRequestTelemetry(req);
    const fingerprint = resolveDeviceFingerprint(data.deviceFingerprint, telemetry.ip, telemetry.userAgent);

    // Verificação de Limite de Taxa / Anti-Spam
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    let isSpam = telemetry.threatScore >= 60;
    try {
      const { count: recentSubmissionsCount } = await supabase
        .from("lead_form_submissions")
        .select("id", { count: "exact", head: true })
        .or(`ip_address.eq.${telemetry.ip},device_fingerprint.eq.${fingerprint}`)
        .gte("created_at", tenMinutesAgo);

      if ((recentSubmissionsCount || 0) >= 8) {
        isSpam = true;
      }
      if ((recentSubmissionsCount || 0) >= 20) {
        throw new Error("Muitas tentativas detectadas. Por favor aguarde alguns minutos.");
      }
    } catch (spamCheckErr: any) {
      if (spamCheckErr?.message?.includes("Muitas tentativas")) {
        throw spamCheckErr;
      }
    }

    // 1. Busca dados do classificado
    const { data: classified, error: classErr } = await supabase
      .from("classifieds")
      .select("id, title, store_id, author_profile_id, price_cents, contact_whatsapp, whatsapp, attributes")
      .eq("id", data.classifiedId)
      .single();

    if (classErr || !classified) {
      throw new Error("Anúncio não encontrado");
    }

    // 2. Resolve identidade do visitante (se autenticado)
    let profileId: string | null = null;
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) profileId = authData.user.id;
    } catch (err) { console.warn("[lead-forms:submitFastLeadClassified] getUser error:", err); }

    // 3. Registra na tabela de leads (lead_form_submissions) com Telemetria Completa
    let submissionId = crypto.randomUUID();
    const { buildPhoneLookupCandidates, recordAttributionTouchpoint, dispatchServerSidePixelConversion } =
      await import("@/services/omnichannel-attribution.server");
    const phoneInfo = buildPhoneLookupCandidates(data.contactPhone);
    const civilLeadCode = `WAEC-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

    try {
      const { data: subRow } = await supabase
        .from("lead_form_submissions")
        .insert({
          id: submissionId,
          form_id: (classified.attributes as any)?.lead_form_id || null,
          store_id: classified.store_id || null,
          author_profile_id: classified.author_profile_id || null,
          classified_id: classified.id,
          profile_id: profileId,
          contact_name: data.contactName.trim(),
          contact_email: data.contactEmail?.trim() || null,
          contact_phone: data.contactPhone.trim(),
          phone_digits: phoneInfo.digits || null,
          is_new_registered_user: false,
          utm_source: data.utmSource || null,
          utm_medium: data.utmMedium || null,
          utm_campaign: data.utmCampaign || null,
          utm_content: data.utmContent || null,
          utm_term: data.utmTerm || null,
          fbclid: data.fbclid || null,
          fbp: data.fbp || null,
          fbc: data.fbc || null,
          gclid: data.gclid || null,
          ttclid: data.ttclid || null,
          ad_id: data.adId || null,
          campaign_id: data.campaignId || null,
          device_type: data.deviceType,
          ip_address: telemetry.ip,
          device_fingerprint: fingerprint,
          geo_city: telemetry.geo.city,
          geo_state: telemetry.geo.state,
          geo_country: telemetry.geo.country,
          threat_score: telemetry.threatScore,
          cf_ray: telemetry.cfRay,
          is_flagged_spam: isSpam,
          telemetry: {
            deviceName: telemetry.deviceName,
            deviceType: telemetry.deviceType,
            userAgent: telemetry.userAgent,
            geoSource: telemetry.geo.source,
            isDatacenterOrVpn: telemetry.isDatacenterOrVpn,
            threatScore: telemetry.threatScore,
            cfRay: telemetry.cfRay,
          },
          crm_status: "new",
          raw_answers: data.answers || {},
        })
        .select("id")
        .single();
      if (subRow?.id) submissionId = subRow.id;
    } catch (insertErr) {
      console.warn("[lead-forms] Aviso ao gravar submission civil:", insertErr);
    }

    // 3.1 Espelhar no Kanban CRM (leads_crm + customers_crm) quando anuncio pertence a uma loja
    let ingestedLeadId: string | null = null;
    let ingestedCustomerId: string | null = null;
    if (classified.store_id) {
      try {
        const { ingestOmnichannelLead } = await import("./omnichannel-lead-ingestion");
        const ingested = await ingestOmnichannelLead(supabase, {
          storeId: classified.store_id,
          source: "classified_form",
          sourceDetail: classified.title,
          fullName: data.contactName.trim(),
          phone: data.contactPhone.trim(),
          email: data.contactEmail?.trim() || null,
          sourceListingId: classified.id,
          sourceListingOrigin: "classified",
          sourceListingTitle: classified.title,
          sourceFormId: (classified.attributes as any)?.lead_form_id || null,
          sourceSubmissionId: submissionId,
          customFields: {
            ...(data.answers || {}),
            lead_code: civilLeadCode,
            ...(data.utmSource ? { utm_source: data.utmSource } : {}),
            ...(data.utmMedium ? { utm_medium: data.utmMedium } : {}),
            ...(data.utmCampaign ? { utm_campaign: data.utmCampaign } : {}),
            ...(data.utmContent ? { utm_content: data.utmContent } : {}),
            ...(data.utmTerm ? { utm_term: data.utmTerm } : {}),
            ...(data.fbclid ? { fbclid: data.fbclid } : {}),
            ...(data.fbp ? { fbp: data.fbp } : {}),
            ...(data.fbc ? { fbc: data.fbc } : {}),
            ...(data.gclid ? { gclid: data.gclid } : {}),
            ...(data.ttclid ? { ttclid: data.ttclid } : {}),
            ...(data.ctwaClid ? { ctwa_clid: data.ctwaClid } : {}),
            ...(data.adId ? { meta_ad_id: data.adId, ad_id: data.adId } : {}),
            ...(data.adsetId ? { meta_adset_id: data.adsetId, adset_id: data.adsetId } : {}),
            ...(data.campaignId ? { meta_campaign_id: data.campaignId, campaign_id: data.campaignId } : {}),
            ...(data.creativeId ? { creative_id: data.creativeId } : {}),
            ...(data.landingUrl ? { landing_url: data.landingUrl } : {}),
            ...(data.sourceUrl ? { source_url: data.sourceUrl } : {}),
            ...(data.referrer ? { referrer: data.referrer } : {}),
            ...(data.deviceId ? { device_id: data.deviceId } : {}),
          },
        });
        ingestedLeadId = ingested.leadId;
        ingestedCustomerId = ingested.customerId;
      } catch (ingestErr) {
        console.warn("[lead-forms] Aviso ao espelhar lead civil no CRM:", ingestErr);
      }
    }

    const eventId = `lead_civil_${submissionId}`;
    await recordAttributionTouchpoint(supabase, {
      storeId: classified.store_id || null,
      deviceId: data.deviceId || null,
      visitorId: data.visitorId || null,
      profileId,
      phone: phoneInfo.e164 || data.contactPhone.trim(),
      email: data.contactEmail?.trim() || null,
      leadCode: civilLeadCode,
      ctwaClid: data.ctwaClid || null,
      fbclid: data.fbclid || null,
      fbp: data.fbp || null,
      fbc: data.fbc || null,
      gclid: data.gclid || null,
      ttclid: data.ttclid || null,
      utmSource: data.utmSource || null,
      utmMedium: data.utmMedium || null,
      utmCampaign: data.utmCampaign || null,
      utmContent: data.utmContent || null,
      utmTerm: data.utmTerm || null,
      adId: data.adId || null,
      adsetId: data.adsetId || null,
      campaignId: data.campaignId || null,
      creativeId: data.creativeId || null,
      formId: (classified.attributes as any)?.lead_form_id || null,
      sourceUrl: data.sourceUrl || null,
      landingUrl: data.landingUrl || null,
      referrer: data.referrer || null,
      entityType: "classified",
      entityId: classified.id,
      entityTitle: classified.title,
      capturedVia: "civil_inquiry_form",
      leadId: ingestedLeadId,
      customerId: ingestedCustomerId,
    });

    if (!isSpam && classified.store_id) {
      await dispatchServerSidePixelConversion(supabase, {
        storeId: classified.store_id,
        eventName: "Lead",
        eventId,
        eventSource: "civil_inquiry_form",
        leadId: ingestedLeadId,
        phone: phoneInfo.e164 || data.contactPhone.trim(),
        email: data.contactEmail?.trim() || null,
        fullName: data.contactName.trim(),
        fbp: data.fbp || null,
        fbc: data.fbc || null,
        ctwaClid: data.ctwaClid || null,
        sourceUrl: data.sourceUrl || data.landingUrl || null,
        clientIpAddress: telemetry.ip,
        clientUserAgent: telemetry.userAgent,
        customData: {
          classified_id: classified.id,
          classified_title: classified.title,
          lead_code: civilLeadCode,
          utm_source: data.utmSource || undefined,
          utm_campaign: data.utmCampaign || undefined,
          ad_id: data.adId || undefined,
        },
      });
    }

    // 4. Prepara link do WhatsApp como fallback
    let whatsappUrl: string | null = null;
    const targetPhone = (classified as any).contact_whatsapp || (classified as any).whatsapp || null;
    if (targetPhone) {
      const cleanTarget = String(targetPhone).replace(/\D/g, "");
      let msg = `Olá! Enviei meus dados com interesse no anúncio *${classified.title}* no Waesy.\n\n*Nome:* ${data.contactName.trim()}\n*Telefone:* ${data.contactPhone.trim()}`;
      const answerEntries = Object.entries(data.answers || {});
      if (answerEntries.length > 0) {
        msg += "\n\n*Respostas de Qualificação:*";
        for (const [key, val] of answerEntries) {
          if (val !== undefined && val !== null && val !== "") {
            msg += `\n• ${key}: ${typeof val === "object" ? JSON.stringify(val) : val}`;
          }
        }
      }
      msg += `\n\nRef: #${civilLeadCode}`;
      const formattedNumber = cleanTarget.startsWith("55") ? cleanTarget : `55${cleanTarget}`;
      whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(msg)}`;
    }

    return {
      success: true,
      submissionId,
      leadId: ingestedLeadId,
      customerId: ingestedCustomerId,
      classifiedId: classified.id,
      sellerProfileId: classified.author_profile_id,
      storeId: classified.store_id || undefined,
      startSdrAi: true,
      afterSubmitAction: "start_sdr_chat",
      successMessage: "Suas respostas foram enviadas para o vendedor! O SDR IA foi ativado para atendimento imediato.",
      whatsappUrl,
      contactName: data.contactName.trim(),
      answers: data.answers,
      isNewRegisteredUser: false,
    };
  });

// ─── 11. Busca Formulários de Onboarding da Loja (Template Padrão do Nicho) ────

export const getStoreOnboardingForms = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data?.storeId || identity.store_id;
    if (!storeId) return { defaultForm: null, availableForms: [] };

    const supabase = getServerClient();
    const { data: rows } = await supabase
      .from("lead_forms")
      .select("id, store_id, title, slug, description, niche_id, status, submissions_count")
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    const forms = (rows || []) as LeadFormDTO[];
    const defaultForm =
      forms.find((f: any) => f.niche_id === "turismo" || /onboarding|ficha|viajante|cadastr/i.test(f.title)) ||
      forms[0] ||
      null;

    return {
      defaultForm,
      availableForms: forms,
    };
  });
