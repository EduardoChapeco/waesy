import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { logSystemError } from "@/lib/logger";

export interface StorePixelConfigDTO {
  id?: string;
  store_id: string;
  meta_pixel_id?: string | null;
  meta_capi_token?: string | null;
  google_ads_id?: string | null;
  google_analytics_id?: string | null;
  tiktok_pixel_id?: string | null;
  track_page_view: boolean;
  track_view_content: boolean;
  track_add_to_cart: boolean;
  track_initiate_checkout: boolean;
  track_lead: boolean;
  track_whatsapp_click: boolean;
  updated_at?: string;
}

/**
 * Obtém as configurações de pixels e telemetria da loja para o Workspace
 */
export const getStorePixelConfig = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().optional() }).optional())
  .handler(async ({ data }): Promise<StorePixelConfigDTO | null> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Identificador da loja não fornecido.");

    const { data: config, error } = await supabase
      .from("store_pixel_configs")
      .select("*")
      .eq("store_id", targetStoreId)
      .maybeSingle();

    if (error) {
      await logSystemError({
        operation: "getStorePixelConfig",
        error,
        table_name: "store_pixel_configs",
        contract_name: "getStorePixelConfig",
      });
      throw new Error(`Erro ao buscar configurações de pixel: ${error.message}`);
    }

    if (!config) {
      return {
        store_id: targetStoreId,
        meta_pixel_id: null,
        meta_capi_token: null,
        google_ads_id: null,
        google_analytics_id: null,
        tiktok_pixel_id: null,
        track_page_view: true,
        track_view_content: true,
        track_add_to_cart: true,
        track_initiate_checkout: true,
        track_lead: true,
        track_whatsapp_click: true,
      };
    }

    return config as StorePixelConfigDTO;
  });

/**
 * Salva ou atualiza a configuração de pixels e CAPI da loja
 */
export const saveStorePixelConfig = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      meta_pixel_id: z.string().optional().nullable(),
      meta_capi_token: z.string().optional().nullable(),
      google_ads_id: z.string().optional().nullable(),
      google_analytics_id: z.string().optional().nullable(),
      tiktok_pixel_id: z.string().optional().nullable(),
      track_page_view: z.boolean().default(true),
      track_view_content: z.boolean().default(true),
      track_add_to_cart: z.boolean().default(true),
      track_initiate_checkout: z.boolean().default(true),
      track_lead: z.boolean().default(true),
      track_whatsapp_click: z.boolean().default(true),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não encontrada.");

    const payload = {
      store_id: targetStoreId,
      meta_pixel_id: data.meta_pixel_id?.trim() || null,
      meta_capi_token: data.meta_capi_token?.trim() || null,
      google_ads_id: data.google_ads_id?.trim() || null,
      google_analytics_id: data.google_analytics_id?.trim() || null,
      tiktok_pixel_id: data.tiktok_pixel_id?.trim() || null,
      track_page_view: data.track_page_view,
      track_view_content: data.track_view_content,
      track_add_to_cart: data.track_add_to_cart,
      track_initiate_checkout: data.track_initiate_checkout,
      track_lead: data.track_lead,
      track_whatsapp_click: data.track_whatsapp_click,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabase
      .from("store_pixel_configs")
      .upsert(payload, { onConflict: "store_id" })
      .select()
      .single();

    if (error) {
      await logSystemError({
        operation: "saveStorePixelConfig",
        error,
        table_name: "store_pixel_configs",
        contract_name: "saveStorePixelConfig",
      });
      throw new Error(`Erro ao salvar telemetria: ${error.message}`);
    }

    return { status: "ok" as const, config: saved };
  });

/**
 * Retorna os IDs públicos de pixels para injeção na vitrine pública da loja
 * (NUNCA expõe tokens secretos como o meta_capi_token)
 */
export const getPublicStorePixels = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().min(1) }))
  .handler(async ({ data: { storeId } }) => {
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("store_pixel_configs")
      .select(
        "meta_pixel_id, google_ads_id, google_analytics_id, tiktok_pixel_id, track_page_view, track_view_content, track_add_to_cart, track_initiate_checkout, track_lead, track_whatsapp_click"
      )
      .eq("store_id", storeId)
      .maybeSingle();

    if (error || !data) return null;

    return data;
  });

/**
 * Disparo Server-Side de Eventos de Conversão via Meta Conversions API (CAPI)
 * Permite telemetria 100% resiliente a adblockers e restrições de cookies do iOS
 */
export const dispatchMetaCapiEvent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().min(1),
      eventName: z.enum([
        "Lead",
        "Contact",
        "AddToCart",
        "InitiateCheckout",
        "Purchase",
        "ViewContent",
      ]),
      eventSourceUrl: z.string().optional(),
      customData: z.record(z.any()).optional(),
      userData: z
        .object({
          email: z.string().optional(),
          phone: z.string().optional(),
          clientIpAddress: z.string().optional(),
          clientUserAgent: z.string().optional(),
        })
        .optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    const { data: config, error } = await supabase
      .from("store_pixel_configs")
      .select("meta_pixel_id, meta_capi_token, track_lead, track_whatsapp_click, track_add_to_cart, track_initiate_checkout, track_view_content")
      .eq("store_id", data.storeId)
      .maybeSingle();

    if (error || !config || !config.meta_pixel_id || !config.meta_capi_token) {
      return { sent: false, reason: "CAPI não configurado para esta loja" };
    }

    // Valida se o evento específico está habilitado
    if (data.eventName === "Lead" && !config.track_lead) return { sent: false, reason: "Evento Lead desativado" };
    if (data.eventName === "Contact" && !config.track_whatsapp_click) return { sent: false, reason: "Evento WhatsApp desativado" };
    if (data.eventName === "AddToCart" && !config.track_add_to_cart) return { sent: false, reason: "Evento AddToCart desativado" };
    if (data.eventName === "InitiateCheckout" && !config.track_initiate_checkout) return { sent: false, reason: "Evento Checkout desativado" };
    if (data.eventName === "ViewContent" && !config.track_view_content) return { sent: false, reason: "Evento ViewContent desativado" };

    // Formata os dados do usuário com Hash SHA-256 (Padrão Meta Conversions API)
    const hashedUserData: Record<string, any> = {};
    if (data.userData?.email) {
      const normalizedEmail = data.userData.email.trim().toLowerCase();
      hashedUserData.em = [crypto.createHash("sha256").update(normalizedEmail).digest("hex")];
    }
    if (data.userData?.phone) {
      const normalizedPhone = data.userData.phone.replace(/\D/g, "");
      hashedUserData.ph = [crypto.createHash("sha256").update(normalizedPhone).digest("hex")];
    }
    let req: Request | null = null;
    try {
      const { getRequest } = await import("@tanstack/start-server-core");
      req = getRequest();
    } catch {}
    const { getRealClientIP } = await import("@/lib/network-telemetry.server");
    const resolvedIp = data.userData?.clientIpAddress || (req ? getRealClientIP(req) : null);
    if (resolvedIp) {
      hashedUserData.client_ip_address = resolvedIp;
    }
    const resolvedUa = data.userData?.clientUserAgent || req?.headers.get("user-agent");
    if (resolvedUa) {
      hashedUserData.client_user_agent = resolvedUa;
    }

    const payload = {
      data: [
        {
          event_name: data.eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          event_source_url: data.eventSourceUrl || undefined,
          user_data: hashedUserData,
          custom_data: data.customData || {},
        },
      ],
    };

    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${config.meta_pixel_id}/events?access_token=${config.meta_capi_token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await res.json();
      if (!res.ok) {
        console.warn("[Meta CAPI warning]:", result);
        return { sent: false, error: result };
      }

      return { sent: true, events_received: result.events_received };
    } catch (fetchErr: any) {
      console.error("[Meta CAPI error]:", fetchErr);
      return { sent: false, error: fetchErr?.message };
    }
  });

/**
 * Disparo server-side para Google Ads Enhanced Conversions via GA4 Measurement Protocol v2.
 * Usa o google_analytics_id (G-XXXX) e google_ads_id da loja para rastrear conversões.
 */
async function dispatchGoogleAdsConversion(params: {
  storeId: string;
  eventName: string;
  conversionValue: number;
  currency: string;
  clientId: string;
  userId?: string;
  supabase: ReturnType<typeof getServerClient>;
}): Promise<{ sent: boolean; error?: string }> {
  const { data: config } = await params.supabase
    .from("store_pixel_configs")
    .select("google_analytics_id, google_ads_id")
    .eq("store_id", params.storeId)
    .maybeSingle();

  // Requer o GA4 Measurement ID (G-XXXX) e o API Secret do GA4 Data Stream
  if (!config?.google_analytics_id) {
    return { sent: false, error: "Google Analytics ID não configurado" };
  }

  // O API Secret é armazenado junto ao google_ads_id como JSON: {"api_secret": "..."}
  // Por padrão, busca o api_secret do campo google_ads_id se em formato JSON
  let apiSecret: string | null = null;
  try {
    const parsed = JSON.parse(config.google_ads_id || "{}");
    apiSecret = parsed.api_secret || null;
  } catch {
    // Se não for JSON, google_ads_id pode ser o próprio Conversion ID (AW-XXXX)
    apiSecret = null;
  }

  if (!apiSecret) {
    // Sem API Secret não é possível usar o Measurement Protocol — registra como "disabled"
    return { sent: false, error: "GA4 API Secret não configurado. Adicione em Pixels > Google Ads." };
  }

  const mpPayload = {
    client_id: params.clientId,
    user_id: params.userId,
    events: [
      {
        name: params.eventName === "Lead" ? "generate_lead" : "purchase",
        params: {
          currency: params.currency,
          value: params.conversionValue,
          transaction_id: `lead_${Date.now()}`,
        },
      },
    ],
  };

  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${config.google_analytics_id}&api_secret=${apiSecret}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mpPayload),
      }
    );

    // GA4 MP retorna 204 para sucesso (sem corpo)
    if (res.status === 204 || res.ok) {
      return { sent: true };
    }

    const errorBody = await res.text().catch(() => "");
    return { sent: false, error: `GA4 MP respondeu ${res.status}: ${errorBody}` };
  } catch (err: any) {
    return { sent: false, error: err?.message || "Erro de rede ao enviar para Google Analytics" };
  }
}

/**
 * Disparo e auditoria completa de retorno de conversão para Meta CAPI e Google Ads.
 * Registra o status deterministicamente em `lead_conversion_telemetry`.
 */
export const dispatchLeadConversionWithAudit = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().min(1),
      leadId: z.string().min(1),
      email: z.string().optional(),
      phone: z.string().optional(),
      conversionValue: z.number().optional().default(0),
      channel: z.enum(["meta_capi", "google_ads", "tiktok"]).default("meta_capi"),
      sourceUrl: z.string().optional(),
      clientId: z.string().optional(), // GA4 client_id (gerado pelo gtag)
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const eventId = `lead_${data.leadId}_${Date.now()}`;

    let dispatchResult: any = { sent: false };

    if (data.channel === "meta_capi") {
      // Dispara via Meta Conversions API (servidor)
      dispatchResult = await dispatchMetaCapiEvent({
        data: {
          storeId: data.storeId,
          eventName: "Lead",
          eventSourceUrl: data.sourceUrl,
          userData: {
            email: data.email,
            phone: data.phone,
          },
          customData: {
            value: data.conversionValue,
            currency: "BRL",
            lead_id: data.leadId,
          },
        },
      });
    } else if (data.channel === "google_ads") {
      // Dispara via Google Ads Enhanced Conversions / GA4 Measurement Protocol v2
      dispatchResult = await dispatchGoogleAdsConversion({
        storeId: data.storeId,
        eventName: "Lead",
        conversionValue: data.conversionValue ?? 0,
        currency: "BRL",
        clientId: data.clientId || `synthetic_${data.leadId}`,
        supabase,
      });
    } else if (data.channel === "tiktok") {
      // TikTok Events API — implementação futura (registra como dispatched para auditoria)
      dispatchResult = { sent: false, reason: "TikTok Events API será implementado na próxima fase." };
    }

    // Registra imutavelmente na tabela de telemetria
    const { data: telemetryRow, error } = await supabase
      .from("lead_conversion_telemetry")
      .insert({
        store_id: data.storeId,
        event_name: "Lead",
        event_id: eventId,
        channel: data.channel,
        status: dispatchResult.sent ? "delivered" : "dispatched",
        response_data: dispatchResult,
      })
      .select("id, event_id, status, dispatched_at")
      .single();

    if (error) {
      await logSystemError({
        operation: "dispatchLeadConversionWithAudit",
        error,
        table_name: "lead_conversion_telemetry",
        contract_name: "dispatchLeadConversionWithAudit",
      });
    }

    return {
      success: true,
      eventId,
      channel: data.channel,
      status: dispatchResult.sent ? "delivered" : "dispatched",
      telemetryId: telemetryRow?.id || null,
    };
  });

