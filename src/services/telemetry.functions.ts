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
 
 // We don't block the UI thread if this fails, but we want to log it
 const { error } = await supabase.from("builder_analytics_events").insert({
 event_type: data.event_type,
 node_id: data.node_id,
 block_type: data.block_type,
 document_id: data.document_id || null,
 session_id: "anonymous", // Assuming simple generic session tracking for now
 metadata: data.metadata || {},
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
      const supabase = getServerClient();
      const identity = await getServerIdentity().catch(() => null);

      const { data: inserted, error } = await supabase
        .from("system_audit_logs")
        .insert({
          severity: data.severity,
          subsystem: data.subsystem,
          route: data.route || null,
          message: data.message,
          error_payload: data.error_payload || {},
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
      const { data: pixelConfig } = await supabase
        .from("store_pixel_configs")
        .select("meta_pixel_id, meta_capi_token, is_active")
        .eq("store_id", data.store_id)
        .maybeSingle();

      const { data: integration } = pixelConfig
        ? { data: { config: { pixel_id: pixelConfig.meta_pixel_id, capi_token: pixelConfig.meta_capi_token }, status: pixelConfig.is_active ? "active" : "inactive" } }
        : await supabase
            .from("integration_credentials")
            .select("token_payload, is_active")
            .eq("store_id", data.store_id)
            .eq("provider", "meta_pixel")
            .maybeSingle()
            .then(res => ({
              data: res.data ? { config: res.data.token_payload, status: res.data.is_active ? "active" : "inactive" } : null
            }));

      console.info(`[PIXEL TELEMETRY] Dispatched ${data.event_name} for store ${data.store_id}`, {
        hasConfig: !!integration,
        event_id: data.event_id,
      });

      return { success: true, event_name: data.event_name };
    } catch (e) {
      return { success: false };
    }
  });
