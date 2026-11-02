import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, resolveTenantStoreId } from "@/lib/server-access";
import { logSystemError } from "@/lib/logger";
import { encryptSecret } from "@/lib/crypto-vault.server";
import { getActiveIntegrationPayload } from "@/services/integrations.functions";

export interface StorePixelConfigDTO {
  id?: string;
  store_id: string;
  meta_pixel_id?: string | null;
  meta_capi_token?: null;
  meta_capi_configured?: boolean;
  meta_test_event_code_configured?: boolean;
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

function normalizeBrazilPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits;
  if (national.length !== 10 && national.length !== 11) return null;
  return `+55${national}`;
}

function hashSha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function persistPixelSecrets(
  supabase: ReturnType<typeof getServerClient>,
  storeId: string,
  publicMetadata: Record<string, string>,
  secretPayload: Record<string, string>,
) {
  if (Object.keys(secretPayload).length === 0) return;
  const { error } = await supabase.from("integration_credentials").upsert(
    {
      store_id: storeId,
      provider: "meta_pixel",
      token_payload: publicMetadata,
      public_metadata: publicMetadata,
      secret_payload_encrypted: encryptSecret(JSON.stringify(secretPayload)),
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id, provider" },
  );
  if (error) throw new Error(`Não foi possível proteger a credencial Meta: ${error.message}`);
}

async function migrateLegacyPixelSecrets(
  supabase: ReturnType<typeof getServerClient>,
  storeId: string,
  config: Record<string, any>,
) {
  const current = await getActiveIntegrationPayload(storeId, "meta_pixel");
  const legacyToken = typeof config.meta_capi_token === "string" ? config.meta_capi_token.trim() : "";
  const legacyTestCode = typeof config.meta_test_event_code === "string" ? config.meta_test_event_code.trim() : "";
  if (!current?.access_token && (legacyToken || legacyTestCode)) {
    await persistPixelSecrets(
      supabase,
      storeId,
      config.meta_pixel_id ? { pixel_id: String(config.meta_pixel_id) } : {},
      {
        ...(legacyToken ? { access_token: legacyToken } : {}),
        ...(legacyTestCode ? { test_event_code: legacyTestCode } : {}),
      },
    );
    await supabase.from("store_pixel_configs").update({ meta_capi_token: null, meta_test_event_code: null, updated_at: new Date().toISOString() }).eq("store_id", storeId);
    return { ...(current || {}), access_token: legacyToken || undefined, test_event_code: legacyTestCode || undefined };
  }
  return current || {};
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
      .select("id, store_id, meta_pixel_id, meta_capi_token, meta_test_event_code, google_ads_id, google_analytics_id, tiktok_pixel_id, track_page_view, track_view_content, track_add_to_cart, track_initiate_checkout, track_lead, track_whatsapp_click, updated_at")
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
        meta_capi_configured: false,
        meta_test_event_code_configured: false,
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

    const googleAdsId = typeof config.google_ads_id === "string" ? config.google_ads_id : null;
    let publicGoogleAdsId = googleAdsId;
    try {
      const parsed = JSON.parse(googleAdsId || "{}");
      publicGoogleAdsId = parsed.conversion_id || null;
    } catch {
      // Existing plain Conversion IDs are already public identifiers.
    }
    const metaPayload = await getActiveIntegrationPayload(targetStoreId, "meta_pixel");
    const publicConfig = Object.fromEntries(Object.entries(config as Record<string, any>).filter(([key]) => !["meta_capi_token", "meta_test_event_code"].includes(key)));
    return {
      ...(publicConfig as StorePixelConfigDTO),
      meta_capi_token: null,
      meta_capi_configured: Boolean(metaPayload?.access_token || (config as any).meta_capi_token),
      meta_test_event_code_configured: Boolean(metaPayload?.test_event_code || (config as any).meta_test_event_code),
      google_ads_id: publicGoogleAdsId,
    };
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
      meta_test_event_code: z.string().optional().nullable(),
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

    const existing = await supabase
      .from("store_pixel_configs")
      .select("meta_capi_token, meta_test_event_code, google_ads_id")
      .eq("store_id", targetStoreId)
      .maybeSingle();
    const legacyGoogle = typeof existing.data?.google_ads_id === "string" ? existing.data.google_ads_id : "";
    let legacyGoogleSecret = "";
    try { legacyGoogleSecret = JSON.parse(legacyGoogle || "{}").api_secret || ""; } catch {}
    const googlePayload = typeof data.google_ads_id === "string" ? data.google_ads_id : "";
    let conversionId = googlePayload;
    let apiSecret = "";
    try {
      const parsed = JSON.parse(googlePayload || "{}");
      conversionId = parsed.conversion_id || "";
      apiSecret = parsed.api_secret || "";
    } catch {}
    await persistPixelSecrets(
      supabase,
      targetStoreId,
      data.meta_pixel_id?.trim() ? { pixel_id: data.meta_pixel_id.trim() } : {},
      {
        ...(data.meta_capi_token?.trim() ? { access_token: data.meta_capi_token.trim() } : (existing.data?.meta_capi_token ? { access_token: String(existing.data.meta_capi_token) } : {})),
        ...(data.meta_test_event_code?.trim() ? { test_event_code: data.meta_test_event_code.trim() } : (existing.data?.meta_test_event_code ? { test_event_code: String(existing.data.meta_test_event_code) } : {})),
      },
    );
    if (data.google_analytics_id?.trim() && (apiSecret || legacyGoogleSecret)) {
      const { error: googleError } = await supabase.from("integration_credentials").upsert(
        {
          store_id: targetStoreId,
          provider: "google_analytics",
          token_payload: { measurement_id: data.google_analytics_id.trim() },
          public_metadata: { measurement_id: data.google_analytics_id.trim() },
          secret_payload_encrypted: encryptSecret(JSON.stringify({ api_secret: apiSecret || legacyGoogleSecret })),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id, provider" },
      );
      if (googleError) throw new Error(`Não foi possível proteger a credencial GA4: ${googleError.message}`);
    }

    const payload = {
      store_id: targetStoreId,
      meta_pixel_id: data.meta_pixel_id?.trim() || null,
      meta_capi_token: null,
      meta_test_event_code: null,
      google_ads_id: conversionId.trim() || null,
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
        "QualifiedLead",
        "Schedule",
        "SubmitApplication",
      ]),
      eventId: z.string().min(1).max(200),
      eventSourceUrl: z.string().optional(),
      testEventCode: z.string().optional(),
      customData: z.record(z.any()).optional(),
      userData: z
        .object({
          email: z.string().optional(),
          phone: z.string().optional(),
          clientIpAddress: z.string().optional(),
          clientUserAgent: z.string().optional(),
          fbp: z.string().optional(),
          fbc: z.string().optional(),
          externalId: z.string().optional(),
        })
        .optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    const tenantStoreId = identity?.store_id || await resolveTenantStoreId();
    if (tenantStoreId && tenantStoreId !== data.storeId) {
      throw new Error("Contexto de loja inválido para o despacho CAPI.");
    }
    if (!tenantStoreId) {
      const publicEvents = new Set(["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Contact", "Lead"]);
      if (!publicEvents.has(data.eventName)) {
        throw new Error("Evento CAPI transacional exige tenant autenticado ou contexto server-side.");
      }
      const { data: publicStore, error: publicStoreError } = await supabase
        .from("stores")
        .select("id, status")
        .eq("id", data.storeId)
        .eq("status", "active")
        .maybeSingle();
      if (publicStoreError || !publicStore) {
        throw new Error("Loja pública não está ativa para telemetria CAPI.");
      }
    }

    const { data: config, error } = await supabase
      .from("store_pixel_configs")
      .select("meta_pixel_id, meta_capi_token, meta_test_event_code, track_lead, track_whatsapp_click, track_add_to_cart, track_initiate_checkout, track_view_content")
      .eq("store_id", data.storeId)
      .maybeSingle();

    if (error || !config || !config.meta_pixel_id) {
      return { sent: false, reason: "CAPI não configurado para esta loja" };
    }

    const metaSecrets = await migrateLegacyPixelSecrets(supabase, data.storeId, config as Record<string, any>);
    const metaToken = typeof metaSecrets.access_token === "string" ? metaSecrets.access_token.trim() : "";
    if (!metaToken) return { sent: false, reason: "Token CAPI não provisionado no cofre da loja" };

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
      hashedUserData.em = [hashSha256(normalizedEmail)];
    }
    if (data.userData?.phone) {
      const normalizedPhone = normalizeBrazilPhone(data.userData.phone);
      if (normalizedPhone) hashedUserData.ph = [hashSha256(normalizedPhone)];
    }
    if (data.userData?.externalId) {
      hashedUserData.external_id = [hashSha256(data.userData.externalId.trim().toLowerCase())];
    }
    let req: Request | null = null;
    try {
      const { getRequest } = await import("@tanstack/start-server-core");
      req = getRequest();
    } catch {}
    const requestUrl = req?.url ? new URL(req.url) : null;
    const cookieHeader = req?.headers.get("cookie") || "";
    const readCookie = (name: string) => cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] || null;
    const requestFbp = readCookie("_fbp");
    const requestFbc = readCookie("_fbc") || (requestUrl?.searchParams.get("fbclid") ? `fb.1.${Date.now()}.${requestUrl.searchParams.get("fbclid")}` : null);
    if (requestFbp || data.userData?.fbp) hashedUserData.fbp = (requestFbp || data.userData?.fbp || "").trim();
    if (requestFbc || data.userData?.fbc) hashedUserData.fbc = (requestFbc || data.userData?.fbc || "").trim();
    const { getRealClientIP } = await import("@/lib/network-telemetry.server");
    const resolvedIp = (req ? getRealClientIP(req) : null) || data.userData?.clientIpAddress || null;
    if (resolvedIp) {
      hashedUserData.client_ip_address = resolvedIp;
    }
    const resolvedUa = req?.headers.get("user-agent") || data.userData?.clientUserAgent;
    if (resolvedUa) {
      hashedUserData.client_user_agent = resolvedUa;
    }

    const eventPayload: Record<string, any> = {
      event_name: data.eventName,
      event_id: data.eventId,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: req?.url || data.eventSourceUrl || undefined,
      user_data: hashedUserData,
      custom_data: {
        ...(data.customData || {}),
        lead_event_source: data.eventName === "QualifiedLead" ? "crm_qualification" : (data.customData?.lead_event_source || "waesy_hub"),
      },
    };

    const payload: Record<string, any> = {
      data: [eventPayload],
    };

    const configuredTestEventCode = typeof metaSecrets.test_event_code === "string" ? metaSecrets.test_event_code.trim() : "";
    if ((data.testEventCode || configuredTestEventCode).trim()) {
      payload.test_event_code = (data.testEventCode || configuredTestEventCode).trim();
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${config.meta_pixel_id}/events?access_token=${encodeURIComponent(metaToken)}`,
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
  clientId?: string;
  userId?: string;
  transactionId: string;
  supabase: ReturnType<typeof getServerClient>;
}): Promise<{ sent: boolean; error?: string }> {
  const { data: config } = await params.supabase
    .from("store_pixel_configs")
    .select("google_analytics_id, google_ads_id")
    .eq("store_id", params.storeId)
    .maybeSingle();

  // Requer o GA4 Measurement ID (G-XXXX) e o API Secret do GA4 Data Stream
  const googleSecrets = await getActiveIntegrationPayload(params.storeId, "google_analytics");
  const measurementId = String(googleSecrets?.measurement_id || config?.google_analytics_id || "").trim();
  if (!measurementId) {
    return { sent: false, error: "Google Analytics ID não configurado" };
  }

  // O API Secret é armazenado junto ao google_ads_id como JSON: {"api_secret": "..."}
  // Por padrão, busca o api_secret do campo google_ads_id se em formato JSON
  let apiSecret: string | null = typeof googleSecrets?.api_secret === "string" ? googleSecrets.api_secret : null;
  try {
    const parsed = JSON.parse(config?.google_ads_id || "{}");
    apiSecret = apiSecret || parsed.api_secret || null;
  } catch {
    // Se não for JSON, google_ads_id pode ser o próprio Conversion ID (AW-XXXX)
    apiSecret = null;
  }

  if (!apiSecret) {
    // Sem API Secret não é possível usar o Measurement Protocol — registra como "disabled"
    return { sent: false, error: "GA4 API Secret não configurado. Adicione em Pixels > Google Ads." };
  }

  if (!params.clientId && !params.userId) {
    return { sent: false, error: "Identificador real do cliente não disponível para Google Ads/GA4" };
  }

  const mpPayload = {
    ...(params.clientId ? { client_id: params.clientId } : {}),
    ...(params.userId ? { user_id: params.userId } : {}),
    events: [
      {
        name: params.eventName === "Lead" || params.eventName === "generate_lead" ? "generate_lead" : "purchase",
        params: {
          currency: params.currency,
          value: params.conversionValue,
          transaction_id: params.transactionId,
          event_id: params.transactionId,
        },
      },
    ],
  };

  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
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
      eventId: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "content"]);
    if (identity.store_id !== data.storeId) throw new Error("Lead fora do tenant autenticado.");
    const eventId = data.eventId || `lead_${data.leadId}`;

    let dispatchResult: any = { sent: false };

    if (data.channel === "meta_capi") {
      // Dispara via Meta Conversions API (servidor)
      dispatchResult = await dispatchMetaCapiEvent({
        data: {
          storeId: data.storeId,
          eventName: "Lead",
          eventId,
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
        clientId: data.clientId,
        transactionId: eventId,
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
        status: dispatchResult.sent ? "delivered" : "failed",
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
      status: dispatchResult.sent ? "delivered" : "failed",
      telemetryId: telemetryRow?.id || null,
    };
  });

/**
 * Disparo Unificado Closed-Loop de Qualificação de Lead para Meta CAPI e Google Ads
 * Executado quando um lead avança para estágios de qualificação ou conversão no CRM.
 */
export const dispatchClosedLoopLeadQualification = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().min(1),
      leadId: z.string().min(1),
      stage: z.string(),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      conversionValue: z.number().optional().default(0),
      clientIpAddress: z.string().optional().nullable(),
      clientUserAgent: z.string().optional().nullable(),
      fbp: z.string().optional().nullable(),
      fbc: z.string().optional().nullable(),
      profileId: z.string().optional().nullable(),
      sourceUrl: z.string().optional().nullable(),
      eventId: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "content"]);
    if (identity.store_id !== data.storeId) throw new Error("Lead fora do tenant autenticado.");
    const isWon = ["won", "converted"].includes(data.stage.toLowerCase());
    const isQualified = ["qualified", "proposal", "negotiation"].includes(data.stage.toLowerCase());

    const metaEventName = isWon ? "Purchase" : (isQualified ? "QualifiedLead" : "Lead");
    const gaEventName = isWon ? "purchase" : "generate_lead";
    if (isWon && data.conversionValue <= 0) {
      throw new Error("Purchase exige valor econômico persistido maior que zero.");
    }
    const eventId = data.eventId || `lead_${data.leadId}_${data.stage.toLowerCase()}`;

    const results: { meta?: any; google?: any } = {};

    // 1. Disparo Meta CAPI
    try {
      results.meta = await dispatchMetaCapiEvent({
        data: {
          storeId: data.storeId,
          eventName: metaEventName,
          eventId,
          eventSourceUrl: data.sourceUrl || undefined,
          userData: {
            email: data.email || undefined,
            phone: data.phone || undefined,
            clientIpAddress: data.clientIpAddress || undefined,
            clientUserAgent: data.clientUserAgent || undefined,
            fbp: data.fbp || undefined,
            fbc: data.fbc || undefined,
            externalId: data.profileId || undefined,
          },
          customData: {
            crm_stage: data.stage,
            lead_id: data.leadId,
            value: data.conversionValue || 0,
            currency: "BRL",
            lead_event_source: "crm_pipeline",
          },
        },
      });
    } catch (err: any) {
      results.meta = { sent: false, error: err?.message };
    }

    // 2. Disparo Google Ads Enhanced Conversions / GA4 Measurement Protocol
    try {
      const supabase = getServerClient();
      results.google = await dispatchGoogleAdsConversion({
        storeId: data.storeId,
        eventName: gaEventName,
        conversionValue: data.conversionValue || 0,
        currency: "BRL",
        clientId: data.fbp || undefined,
        transactionId: eventId,
        userId: data.profileId || undefined,
        supabase,
      });
    } catch (err: any) {
      results.google = { sent: false, error: err?.message };
    }

    const delivered = Boolean(results.meta?.sent || results.google?.sent);
    return {
      success: delivered,
      stage: data.stage,
      metaEvent: metaEventName,
      gaEvent: gaEventName,
      results,
      eventId,
    };
  });


