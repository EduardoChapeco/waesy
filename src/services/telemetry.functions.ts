import { getRequest } from "@tanstack/start-server-core";
import { getRealClientIP, resolveGeoLocation } from "@/lib/network-telemetry.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

export interface SponsorMetricsDTO {
 sponsor_id: string;
 sponsor_name: string;
 logo_url?: string | null;
 tier: string;
 total_impressions: number;
 unique_views: number;
 total_clicks: number;
 ctr_percentage: number;
 avg_duration_seconds: number;
 scroll_reach_50: number;
 scroll_reach_100: number;
}

export const recordAdTelemetry = createServerFn({ method: "POST" })
 .validator(
 z.object({
 store_id: z.string().uuid(),
 sponsor_id: z.string().uuid().optional(),
 article_id: z.string().uuid().optional(),
 post_id: z.string().uuid().optional(),
 event_type: z.enum([
 "view_impression",
 "view_unique",
 "view_duration",
 "scroll_depth",
 "click",
 ]),
 session_hash: z.string().default("anonymous"),
 duration_seconds: z.number().int().default(0),
 scroll_percentage: z.number().int().default(0),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();

 const { error } = await supabase.rpc("record_ad_telemetry", {
 p_store_id: input.store_id,
 p_sponsor_id: input.sponsor_id || null,
 p_article_id: input.article_id || null,
 p_post_id: input.post_id || null,
 p_event_type: input.event_type,
 p_session_hash: input.session_hash,
 p_duration_seconds: input.duration_seconds,
 p_scroll_percentage: input.scroll_percentage,
 });

 if (error) {
 console.error("[TELEMETRY] Failed to record telemetry:", error.message);
 return { success: false };
 }

 return { success: true };
 });

export const trackBuilderEvent = createServerFn({ method: "POST" })
 .validator(
 z.object({
 event_type: z.string(),
 node_id: z.string(),
 block_type: z.string(),
 document_id: z.string().optional(),
 metadata: z.record(z.any()).optional(),
 }),
 )
 .handler(async ({ data }) => {
 try {
 const supabase = getAnonServerClient(); // Using anon to not fail if not authenticated (telemetry)
 
 // EARS-RES-02: Capping estrito de metadata para proteger WAL/disco
 let cappedMetadata: Record<string, unknown> = {};
 if (data.metadata) {
   try {
     const raw = JSON.stringify(data.metadata);
     cappedMetadata = raw.length > 1024 ? { _truncated: true, _length: raw.length } : data.metadata;
   } catch {
     cappedMetadata = {};
   }
 }

 // We don't block the UI thread if this fails, but we want to log it
 const { error } = await supabase.from("builder_analytics_events").insert({
 event_type: String(data.event_type).slice(0, 64),
 node_id: String(data.node_id).slice(0, 128),
 block_type: String(data.block_type).slice(0, 64),
 document_id: data.document_id ? String(data.document_id).slice(0, 128) : null,
 session_id: "anonymous", // Assuming simple generic session tracking for now
 metadata: cappedMetadata,
 });

 if (error) {
 console.error("[TELEMETRY] Failed to record builder event:", error.message);
 return { success: false };
 }
 
 return { success: true };
 } catch (e) {
 console.error("[TELEMETRY] Exception recording builder event:", e);
 return { success: false };
 }
 });

export const getSponsorMetricsDashboard = createServerFn({ method: "GET" }).handler(
 async (): Promise<{
 totalImpressions: number;
 totalUniqueViews: number;
 totalClicks: number;
 avgCtr: number;
 sponsorsMetrics: SponsorMetricsDTO[];
 }> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) {
 return {
 totalImpressions: 0,
 totalUniqueViews: 0,
 totalClicks: 0,
 avgCtr: 0,
 sponsorsMetrics: [],
 };
 }

 // Busca patrocinadores e seus eventos agregados
 const [sponsorsRes, eventsRes] = await Promise.all([
 supabase.from("sponsors").select("id, name, logo_url, tier").eq("store_id", identity.store_id),
 supabase
 .from("ad_telemetry_events")
 .select("sponsor_id, event_type, duration_seconds, scroll_percentage")
 .eq("store_id", identity.store_id),
 ]);

 const sponsors = sponsorsRes.data || [];
 const events = eventsRes.data || [];

 let totalImpressions = 0;
 let totalUniqueViews = 0;
 let totalClicks = 0;

 const sponsorsMetrics: SponsorMetricsDTO[] = sponsors.map((sp) => {
 const spEvents = events.filter((e) => e.sponsor_id === sp.id);

 const impressions = spEvents.filter((e) => e.event_type === "view_impression").length;
 const uniques = spEvents.filter((e) => e.event_type === "view_unique").length;
 const clicks = spEvents.filter((e) => e.event_type === "click").length;
 const scroll50 = spEvents.filter(
 (e) => e.event_type === "scroll_depth" && (e.scroll_percentage || 0) >= 50,
 ).length;
 const scroll100 = spEvents.filter(
 (e) => e.event_type === "scroll_depth" && (e.scroll_percentage || 0) >= 100,
 ).length;

 const durationEvents = spEvents.filter((e) => e.event_type === "view_duration");
 const avgDuration =
 durationEvents.length > 0
 ? Math.round(
 durationEvents.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) /
 durationEvents.length,
 )
 : 0;

 const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;

 totalImpressions += impressions;
 totalUniqueViews += uniques;
 totalClicks += clicks;

 return {
 sponsor_id: sp.id,
 sponsor_name: sp.name,
 logo_url: sp.logo_url,
 tier: sp.tier,
 total_impressions: impressions,
 unique_views: uniques,
 total_clicks: clicks,
 ctr_percentage: ctr,
 avg_duration_seconds: avgDuration,
 scroll_reach_50: scroll50,
 scroll_reach_100: scroll100,
 };
 });

 const avgCtr =
 totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

 return {
 totalImpressions,
 totalUniqueViews,
 totalClicks,
 avgCtr,
 sponsorsMetrics,
 };
 },
);

export const logSystemError = createServerFn({ method: "POST" })
  .validator(
    z.object({
      severity: z.enum(["INFO", "WARN", "ERROR", "CRITICAL", "SEV-1", "SEV-2"]).default("ERROR"),
      subsystem: z.string().default("app"),
      route: z.string().optional(),
      message: z.string(),
      error_payload: z.record(z.any()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const cappedMessage = String(data.message || "").slice(0, 1024);
      // EARS-RES-02: Barreira anti-cascata quando o banco está offline ou sem espaço de WAL
      if (
        /connect ECONNREFUSED|schema cache|No space left on device|503|522|PGRST002|AuthRetryableFetchError/i.test(
          cappedMessage,
        )
      ) {
        return { success: false, skipped: true };
      }

      const supabase = getServerClient();
      const identity = await getServerIdentity().catch(() => null);
      const rawPayload = (data.error_payload || {}) as Record<string, any>;
      let payload: Record<string, any> = {};
      try {
        const serialized = JSON.stringify(rawPayload);
        payload =
          serialized.length > 2048
            ? { _truncated: true, _original_length: serialized.length, preview: serialized.slice(0, 1024) }
            : rawPayload;
      } catch {
        payload = { _error: "payload_serialization_failed" };
      }

      // Registra no canal canônico de telemetria de erros (`system_error_logs`)
      try {
        const { logSystemError: recordCanonicalError } = await import("@/lib/logger");
        const mappedSeverity =
          data.severity === "CRITICAL" || data.severity === "SEV-1"
            ? "critical"
            : data.severity === "WARN" || data.severity === "INFO"
              ? "warn"
              : "error";

        recordCanonicalError({
          route: data.route || data.subsystem,
          operation: data.subsystem,
          errorMessage: cappedMessage,
          severity: mappedSeverity,
          userId: identity?.id || undefined,
          pageUrl: typeof payload.page_url === "string" ? payload.page_url.slice(0, 500) : undefined,
          schemaName: typeof payload.schema_name === "string" ? payload.schema_name : undefined,
          tableName: typeof payload.table_name === "string" ? payload.table_name : undefined,
          columnName: typeof payload.column_name === "string" ? payload.column_name : undefined,
          contractName: typeof payload.contract_name === "string" ? payload.contract_name : undefined,
          payload,
        });
      } catch {
        // segue para gravação primária em system_audit_logs
      }

      const { data: inserted, error } = await supabase
        .from("system_audit_logs")
        .insert({
          severity: data.severity,
          subsystem: String(data.subsystem).slice(0, 128),
          route: data.route ? String(data.route).slice(0, 256) : null,
          message: cappedMessage,
          error_payload: payload,
          user_id: identity?.id || null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[TELEMETRY] Failed to insert system_audit_logs:", error.message);
        return { success: false };
      }
      return { success: true, logId: inserted?.id };
    } catch (err: any) {
      console.error("[TELEMETRY] Exception logging system error:", err?.message || err);
      return { success: false };
    }
  });

export const dispatchPixelConversionEvent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      store_id: z.string().uuid(),
      event_name: z.enum(["PageView", "ViewContent", "Lead", "InitiateCheckout", "Purchase", "Search"]),
      event_id: z.string().optional(),
      user_data: z
        .object({
          email: z.string().optional(),
          phone: z.string().optional(),
          external_id: z.string().optional(),
          client_ip_address: z.string().optional(),
          client_user_agent: z.string().optional(),
        })
        .optional(),
      custom_data: z.record(z.any()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = getServerClient();
      const { dispatchServerSidePixelConversion } = await import("./omnichannel-attribution.server");
      let reqUrl: string | null = null;
      let reqIp: string | null = data.user_data?.client_ip_address || null;
      let reqUa: string | null = data.user_data?.client_user_agent || null;
      try {
        const req = getRequest();
        reqUrl = req?.url || null;
        if (!reqIp && req) reqIp = getRealClientIP(req) || null;
        if (!reqUa && req) reqUa = req.headers.get("user-agent") || null;
      } catch {
        // ambiente sem request HTTP explícito
      }

      const eventId = data.event_id || `px_${data.store_id.slice(0, 8)}_${crypto.randomUUID()}`;
      const result = await dispatchServerSidePixelConversion(supabase as any, {
        storeId: data.store_id,
        eventName: data.event_name,
        eventId,
        eventSource: "waesy_telemetry_capi",
        phone: data.user_data?.phone || null,
        email: data.user_data?.email || null,
        sourceUrl: reqUrl,
        clientIpAddress: reqIp,
        clientUserAgent: reqUa,
        customData: {
          ...(data.custom_data || {}),
          ...(data.user_data?.external_id ? { external_id: data.user_data.external_id } : {}),
        },
      });

      return {
        success: result.sent,
        dispatched: result.sent,
        reason: result.reason || (result.sent ? "delivered" : "not_dispatched"),
        matched_pixels: result.matchedPixelsCount ?? 0,
        event_name: data.event_name,
        event_id: eventId,
      };
    } catch (e: any) {
      try {
        const { logSystemError: recordCanonicalError } = await import("@/lib/logger");
        recordCanonicalError({
          route: "telemetry.dispatchPixelConversionEvent",
          contractName: "dispatchPixelConversionEvent",
          tableName: "lead_conversion_telemetry",
          error: e,
          payload: { store_id: data.store_id, event_name: data.event_name },
        });
      } catch {}
      return { success: false, dispatched: false, reason: e?.message || "dispatch_error", event_name: data.event_name };
    }
  });
