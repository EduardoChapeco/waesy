/**
 * whatsapp-leads.functions.ts — BFF para Mensuração, Rastreabilidade e Conversão de Leads de WhatsApp
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { getCurrentIdentity } from "@/services/cart-helpers";

export interface WhatsAppLeadDTO {
  id: string;
  store_id?: string | null;
  lead_code: string;
  entity_type: string;
  entity_id?: string | null;
  entity_title?: string | null;
  phone_target: string;
  origin_url?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  visitor_id?: string | null;
  device_type: string;
  status: "initiated" | "opened" | "responded" | "converted" | "lost";
  notes?: string | null;
  created_at: string;
}

export interface WhatsAppAnalyticsDTO {
  total_leads: number;
  responded_leads: number;
  converted_leads: number;
  conversion_rate: number;
  entity_distribution: Array<{ entity_type: string; count: number }>;
  top_items: Array<{
    entity_id: string | null;
    entity_type: string;
    title: string;
    clicks: number;
  }>;
  daily_trend: Array<{ date: string; count: number }>;
}

export const recordWhatsAppLead = createServerFn({ method: "POST" })
  .validator(
    z.object({
      store_id: z.string().uuid().optional().nullable(),
      entity_type: z.enum([
        "store",
        "product",
        "classified",
        "job",
        "tourism",
        "directory",
        "event",
        "quote",
        "custom",
      ]),
      entity_id: z.string().optional().nullable(),
      entity_title: z.string().optional().nullable(),
      phone_target: z.string().min(8, "Telefone inválido"),
      origin_url: z.string().optional().nullable(),
      utm_source: z.string().optional().nullable(),
      utm_medium: z.string().optional().nullable(),
      utm_campaign: z.string().optional().nullable(),
      utm_content: z.string().optional().nullable(),
      utm_term: z.string().optional().nullable(),
      fbclid: z.string().optional().nullable(),
      fbp: z.string().optional().nullable(),
      fbc: z.string().optional().nullable(),
      gclid: z.string().optional().nullable(),
      ttclid: z.string().optional().nullable(),
      ctwa_clid: z.string().optional().nullable(),
      ad_id: z.string().optional().nullable(),
      adset_id: z.string().optional().nullable(),
      campaign_id: z.string().optional().nullable(),
      creative_id: z.string().optional().nullable(),
      form_id: z.string().optional().nullable(),
      landing_url: z.string().optional().nullable(),
      referrer: z.string().optional().nullable(),
      device_id: z.string().optional().nullable(),
      visitor_id: z.string().optional().nullable(),
      device_type: z.enum(["mobile", "desktop", "tablet"]).optional().default("mobile"),
      metadata: z.record(z.any()).optional().default({}),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getCurrentIdentity().catch(() => null);
    const userId = identity?.customer_id || null;

    const sanitizedPhone = input.phone_target.replace(/\D/g, "");
    const { normalizePhoneE164, recordAttributionTouchpoint } = await import("@/services/omnichannel-attribution.server");
    const { data: userProfile } = userId
      ? await supabase.from("profiles").select("phone, email").eq("id", userId).maybeSingle()
      : { data: null as any };
    const leadPhoneE164 = normalizePhoneE164(userProfile?.phone);

    let req: Request | null = null;
    try {
      const { getRequest } = await import("@tanstack/start-server-core");
      req = getRequest();
    } catch {}
    const { captureRequestTelemetry } = await import("@/lib/network-telemetry.server");
    const tele = req ? captureRequestTelemetry(req) : null;
    const enrichedMetadata = {
      ...(input.metadata || {}),
      ...(tele
        ? {
            telemetry: {
              ip: tele.ip,
              device_name: tele.deviceName,
              device_type: tele.deviceType,
              geo: {
                city: tele.geo.city,
                state: tele.geo.state,
                country: tele.geo.country,
                source: tele.geo.source,
              },
            },
          }
        : {}),
    };

    const { data: res, error } = await supabase.rpc("record_whatsapp_lead", {
      p_store_id: input.store_id || null,
      p_entity_type: input.entity_type,
      p_entity_id: input.entity_id || null,
      p_entity_title: input.entity_title || null,
      p_phone_target: sanitizedPhone,
      p_origin_url: input.origin_url || null,
      p_utm_source: input.utm_source || null,
      p_utm_medium: input.utm_medium || null,
      p_utm_campaign: input.utm_campaign || null,
      p_visitor_id: input.visitor_id || null,
      p_user_id: userId,
      p_device_type: input.device_type,
      p_metadata: enrichedMetadata,
    });

    if (error) {
      console.error(
        "[whatsapp-telemetry] Falha ao gravar telemetria de lead WhatsApp:",
        error.message,
      );
      throw new Error("Não foi possível registrar o lead com segurança. Tente novamente.");
    }

    const resultRow = res as {
      success: boolean;
      id: string;
      lead_code: string;
      phone_target: string;
      created_at: string;
    };

    try {
      await supabase
        .from("whatsapp_lead_conversions")
        .update({
          lead_phone_e164: leadPhoneE164,
          fbclid: input.fbclid || null,
          fbp: input.fbp || null,
          fbc: input.fbc || null,
          gclid: input.gclid || null,
          ttclid: input.ttclid || null,
          ctwa_clid: input.ctwa_clid || null,
          ad_id: input.ad_id || null,
          campaign_id: input.campaign_id || null,
        } as any)
        .eq("id", resultRow.id);

      await recordAttributionTouchpoint(supabase, {
        storeId: input.store_id || null,
        deviceId: input.device_id || null,
        visitorId: input.visitor_id || null,
        profileId: userId,
        phone: leadPhoneE164,
        email: userProfile?.email || null,
        leadCode: resultRow.lead_code,
        ctwaClid: input.ctwa_clid || null,
        fbclid: input.fbclid || null,
        fbp: input.fbp || null,
        fbc: input.fbc || null,
        gclid: input.gclid || null,
        ttclid: input.ttclid || null,
        utmSource: input.utm_source || null,
        utmMedium: input.utm_medium || null,
        utmCampaign: input.utm_campaign || null,
        utmContent: input.utm_content || null,
        utmTerm: input.utm_term || null,
        adId: input.ad_id || null,
        adsetId: input.adset_id || null,
        campaignId: input.campaign_id || null,
        creativeId: input.creative_id || null,
        formId: input.form_id || null,
        sourceUrl: input.origin_url || null,
        landingUrl: input.landing_url || null,
        referrer: input.referrer || null,
        entityType: input.entity_type,
        entityId: input.entity_id || null,
        entityTitle: input.entity_title || null,
        capturedVia: "whatsapp_click",
      });
    } catch {
      // Best-effort attribution enrichment
    }

    return resultRow;
  });

// ============================================================================
// getProtectedWhatsAppContact — Gating Estrito de Contato (Login Obrigatório)
// ============================================================================

export const getProtectedWhatsAppContact = createServerFn({ method: "POST" })
  .validator(
    z.object({
      phone: z.string(),
      store_id: z.string().uuid().optional().nullable(),
      entity_type: z.enum([
        "store",
        "product",
        "classified",
        "job",
        "tourism",
        "directory",
        "event",
        "quote",
        "custom",
      ]),
      entity_id: z.string().optional().nullable(),
      entity_title: z.string().optional().nullable(),
      custom_message: z.string().optional().nullable(),
      origin_url: z.string().optional().nullable(),
      niche: z.string().optional().nullable(),
      utm_source: z.string().optional().nullable(),
      utm_medium: z.string().optional().nullable(),
      utm_campaign: z.string().optional().nullable(),
      utm_content: z.string().optional().nullable(),
      utm_term: z.string().optional().nullable(),
      fbclid: z.string().optional().nullable(),
      fbp: z.string().optional().nullable(),
      fbc: z.string().optional().nullable(),
      gclid: z.string().optional().nullable(),
      ttclid: z.string().optional().nullable(),
      ctwa_clid: z.string().optional().nullable(),
      ad_id: z.string().optional().nullable(),
      adset_id: z.string().optional().nullable(),
      campaign_id: z.string().optional().nullable(),
      creative_id: z.string().optional().nullable(),
      form_id: z.string().optional().nullable(),
      landing_url: z.string().optional().nullable(),
      referrer: z.string().optional().nullable(),
      device_id: z.string().optional().nullable(),
      visitor_id: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity().catch(() => null);
    const userId = identity?.id || null;

    // Se visitante não está logado, mascara o número e bloqueia o redirecionamento
    if (!userId) {
      const cleanDigits = input.phone.replace(/\D/g, "");
      const masked =
        cleanDigits.length >= 8
          ? `(${cleanDigits.slice(0, 2) || "**"}) ${cleanDigits.slice(2, 7) || "*****"}-****`
          : "(**) *****-****";

      return {
        authorized: false,
        message:
          "O contato direto via WhatsApp está protegido contra robôs e spam. Faça login ou crie uma conta para falar com este anunciante.",
        maskedPhone: masked,
        targetUrl: null,
        leadCode: null,
      };
    }

    // Usuário autenticado: extrai telefone e grava lead rastreável
    const sanitizedPhone = input.phone.replace(/\D/g, "");
    const supabase = getServerClient();
    const { normalizePhoneE164, recordAttributionTouchpoint, dispatchServerSidePixelConversion } = await import("@/services/omnichannel-attribution.server");
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("full_name, phone, email")
      .eq("id", userId)
      .maybeSingle();
    const leadPhoneE164 = normalizePhoneE164(userProfile?.phone);
    let leadCode: string | null = null;
    let convId: string | null = null;

    try {
      const { data: res, error } = await supabase.rpc("record_whatsapp_lead", {
        p_store_id: input.store_id || null,
        p_entity_type: input.entity_type,
        p_entity_id: input.entity_id || null,
        p_entity_title: input.entity_title || null,
        p_phone_target: sanitizedPhone,
        p_origin_url: input.origin_url || null,
        p_utm_source: input.utm_source || null,
        p_utm_medium: input.utm_medium || null,
        p_utm_campaign: input.utm_campaign || null,
        p_visitor_id: input.visitor_id || null,
        p_user_id: userId,
        p_device_type: "mobile",
        p_metadata: {
          niche: input.niche,
          authenticated_lead: true,
          ad_id: input.ad_id || null,
          campaign_id: input.campaign_id || null,
          fbclid: input.fbclid || null,
          gclid: input.gclid || null,
        },
      });

      if (error || !res?.lead_code) {
        throw new Error(error?.message || "RPC não confirmou a persistência do lead.");
      }
      leadCode = res.lead_code;
      convId = res.id || null;
    } catch (err) {
      console.error("[whatsapp-leads] Erro na gravação de lead protegido:", err);
      return {
        authorized: false,
        message: "Não foi possível registrar o contato com segurança. Tente novamente.",
        maskedPhone: null,
        targetUrl: null,
        leadCode: null,
      };
    }

    try {
      if (convId) {
        await supabase
          .from("whatsapp_lead_conversions")
          .update({
            lead_phone_e164: leadPhoneE164,
            fbclid: input.fbclid || null,
            fbp: input.fbp || null,
            fbc: input.fbc || null,
            gclid: input.gclid || null,
            ttclid: input.ttclid || null,
            ctwa_clid: input.ctwa_clid || null,
            ad_id: input.ad_id || null,
            campaign_id: input.campaign_id || null,
          } as any)
          .eq("id", convId);
      }

      await recordAttributionTouchpoint(supabase, {
        storeId: input.store_id || null,
        deviceId: input.device_id || null,
        visitorId: input.visitor_id || null,
        profileId: userId,
        phone: leadPhoneE164,
        email: userProfile?.email || null,
        leadCode,
        ctwaClid: input.ctwa_clid || null,
        fbclid: input.fbclid || null,
        fbp: input.fbp || null,
        fbc: input.fbc || null,
        gclid: input.gclid || null,
        ttclid: input.ttclid || null,
        utmSource: input.utm_source || null,
        utmMedium: input.utm_medium || null,
        utmCampaign: input.utm_campaign || null,
        utmContent: input.utm_content || null,
        utmTerm: input.utm_term || null,
        adId: input.ad_id || null,
        adsetId: input.adset_id || null,
        campaignId: input.campaign_id || null,
        creativeId: input.creative_id || null,
        formId: input.form_id || null,
        sourceUrl: input.origin_url || null,
        landingUrl: input.landing_url || null,
        referrer: input.referrer || null,
        entityType: input.entity_type,
        entityId: input.entity_id || null,
        entityTitle: input.entity_title || null,
        capturedVia: "protected_whatsapp_click",
      });

      if (input.store_id && leadCode) {
        await dispatchServerSidePixelConversion(supabase, {
          storeId: input.store_id,
          eventName: "Contact",
          eventId: `contact_${leadCode}`,
          eventSource: "whatsapp_click",
          phone: leadPhoneE164,
          email: userProfile?.email || null,
          fullName: userProfile?.full_name || null,
          fbp: input.fbp || null,
          fbc: input.fbc || null,
          ctwaClid: input.ctwa_clid || null,
          sourceUrl: input.origin_url || input.landing_url || null,
          customData: {
            entity_type: input.entity_type,
            entity_title: input.entity_title || undefined,
            lead_code: leadCode,
            utm_source: input.utm_source || undefined,
            utm_campaign: input.utm_campaign || undefined,
            ad_id: input.ad_id || undefined,
          },
        });
      }
    } catch {
      // Best-effort attribution & CAPI enrichment
    }

    const cleanWithDdi =
      sanitizedPhone.length === 10 || sanitizedPhone.length === 11
        ? `55${sanitizedPhone}`
        : sanitizedPhone;

    const messageText = input.custom_message
      ? `${input.custom_message.trim()}\n\nRef: #${leadCode}`
      : `Olá! Vi o anúncio "${input.entity_title || "na Waesy"}" e tenho interesse. Ainda está disponível?\n\nRef: #${leadCode}`;

    const targetUrl = `https://wa.me/${cleanWithDdi}?text=${encodeURIComponent(messageText)}`;

    return {
      authorized: true,
      message: "Contato liberado com sucesso.",
      phone: cleanWithDdi,
      leadCode,
      targetUrl,
    };
  });

export const getStoreWhatsAppAnalytics = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        days: z.number().int().min(1).max(365).optional().default(30),
      })
      .optional(),
  )
  .handler(async ({ data }): Promise<WhatsAppAnalyticsDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity.store_id) {
      return {
        total_leads: 0,
        responded_leads: 0,
        converted_leads: 0,
        conversion_rate: 0,
        entity_distribution: [],
        top_items: [],
        daily_trend: [],
      };
    }

    const { data: analytics, error } = await supabase.rpc("get_store_whatsapp_analytics", {
      p_store_id: identity.store_id,
      p_days: data?.days || 30,
    });

    if (error) {
      console.error("[whatsapp-analytics] Erro ao buscar analytics de WhatsApp:", error.message);
      return {
        total_leads: 0,
        responded_leads: 0,
        converted_leads: 0,
        conversion_rate: 0,
        entity_distribution: [],
        top_items: [],
        daily_trend: [],
      };
    }

    return analytics as WhatsAppAnalyticsDTO;
  });

export const listStoreWhatsAppLeads = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        status: z
          .enum(["all", "initiated", "opened", "responded", "converted", "lost"])
          .optional()
          .default("all"),
        limit: z.number().int().min(1).max(100).optional().default(50),
      })
      .optional(),
  )
  .handler(async ({ data }): Promise<WhatsAppLeadDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity.store_id) return [];

    let query = supabase
      .from("whatsapp_lead_conversions")
      .select("*")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(data?.limit || 50);

    if (data?.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("[whatsapp-leads] Erro ao listar leads de WhatsApp:", error.message);
      return [];
    }

    return rows as WhatsAppLeadDTO[];
  });

export const updateWhatsAppLeadStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      lead_id: z.string().uuid(),
      status: z.enum(["initiated", "opened", "responded", "converted", "lost"]),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity.store_id) {
      throw new Error("Não autorizado.");
    }

    const { error } = await supabase
      .from("whatsapp_lead_conversions")
      .update({
        status: input.status,
        notes: input.notes !== undefined ? input.notes : undefined,
      })
      .eq("id", input.lead_id)
      .eq("store_id", identity.store_id);

    if (error) {
      throw new Error(`Erro ao atualizar status do lead: ${error.message}`);
    }

    return { success: true };
  });
